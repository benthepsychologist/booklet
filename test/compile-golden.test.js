// Golden pages for the compiler (compile/, compile 0.2.0): what it writes for the examples and the page-shaped fixtures,
// committed under test/compile-golden/, so a change to what the compiler writes is seen in review, line by line.
// The set is compiled in one run, in both forms (as `--form both` writes it: standalone/<name>/index.html and
// site/<name>/index.html), and every file it writes for a booklet must equal its golden copy. The stylesheet and its fonts
// are not golden: test/compile-css.test.js holds them to the renderer.
//
// A page that differs fails, with its first differing line. When the change is meant, write the pages again and commit them:
//   node test/compile-golden.test.js --write
//
// A diagram is drawn by a browser, which the tests that must give the same answer everywhere cannot count on: here a stand-in answers
// in its place (test/diagram-stub.js), so the golden pages hold a drawn diagram, written out the way a drawn one is. The drawing
// itself, by the renderer's mermaid part in Chromium, is checked by test/compile-figures-browser.js.
//
// A booklet that shows two or more activities has a golden page for its contents and one for each activity
// (compile-pages is a module with tabs, cards and links across pages; compile-pair and compile-pair.es are a translation pair).
// examples/mindful-check-in.booklet.md is compiled by the other tests but has no golden page here: its notice names its
// author and the practice it comes from, and these pages are meant to hold made-up content only.
// Run: node test/compile-golden.test.js [--write]      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,".."),GOLD=path.join(__dirname,"compile-golden");
const C=require("../compile/compile.js"),E=require("../compile/engine.js"),STUB=require("./diagram-stub.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const SET=[...["garden-week","how-tides-work","project-board","status-page"].map(n=>path.join(ROOT,"examples",n+".booklet.md")),
  ...["compile-article","compile-kinds","compile-quiz","figures","charts","data-views","compile-pages","compile-pair","compile-pair.es","compile-views","compile-theme"].map(n=>path.join(__dirname,"fixtures",n+".booklet.md")),
  ...["compile-bodymap","compile-pictures","compile-diagrams"].map(n=>path.join(__dirname,"compile-assets",n+".booklet.md"))];
const WRITE=process.argv.includes("--write");

const run=C.compile(SET.map(file=>({file})),{form:"both",engine:E.load(),drawer:STUB.drawer});
const want=new Map();
for(const r of run.results){chk("compiles: "+r.rep.source,r.rep.ok,(r.rep.refused||[]).join("; "));for(const [rel,data] of r.files) want.set(rel,data);}
const tree=d=>!fs.existsSync(d)?[]:fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tree(path.join(d,e.name)).map(x=>e.name+"/"+x):[e.name]);
const have=tree(GOLD);

if(WRITE){
  for(const rel of have) if(!want.has(rel)) fs.rmSync(path.join(GOLD,rel));
  for(const [rel,data] of want){const p=path.join(GOLD,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data);}
  /* folders the stale pages leave empty */
  const prune=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})) if(e.isDirectory()){prune(path.join(d,e.name));if(!fs.readdirSync(path.join(d,e.name)).length) fs.rmdirSync(path.join(d,e.name));}};
  if(fs.existsSync(GOLD)) prune(GOLD);
  console.log("\nwrote "+want.size+" golden files under test/compile-golden/ (commit them)");process.exit(fails?1:0);}

chk("the golden folder is there",have.length>0,"run: node test/compile-golden.test.js --write");
/* the first line that differs, past the stamp line (whose hash differs whenever anything else does) */
const STAMP_LINE=/^<!-- booklet compile \S+ \u00b7 from .* \u00b7 sha256:[0-9a-f]{64} -->$/;
const firstDiff=(a,b)=>{const x=a.split("\n"),y=b.split("\n");let stampOnly=false;
  for(let i=0;i<Math.max(x.length,y.length);i++){if(x[i]===y[i]) continue;
    if(STAMP_LINE.test(x[i]||"")&&STAMP_LINE.test(y[i]||"")){stampOnly=true;continue;}
    return "line "+(i+1)+": golden "+JSON.stringify((x[i]||"").slice(0,120))+", now "+JSON.stringify((y[i]||"").slice(0,120));}
  return stampOnly?"only the stamp line differs":"";};
for(const [rel,data] of want){
  const p=path.join(GOLD,rel);
  if(!fs.existsSync(p)){chk(rel+" has a golden copy",false,"missing: node test/compile-golden.test.js --write");continue;}
  const gold=fs.readFileSync(p);
  const same=Buffer.isBuffer(data)?gold.equals(data):gold.toString("utf8")===data;
  chk(rel+" is as golden",same,same?undefined:(Buffer.isBuffer(data)?"the bytes differ":firstDiff(gold.toString("utf8"),data))+" (if meant: node test/compile-golden.test.js --write)");}
const extra=have.filter(rel=>!want.has(rel));
chk("no golden file is left that the compiler no longer writes",!extra.length,extra.join(", "));
/* the golden pages are what a host gets: each standalone page links the one stylesheet, each site page has front matter */
for(const rel of [...want.keys()].filter(k=>k.endsWith("/index.html"))){
  const t=String(want.get(rel));
  /* the stylesheet is one folder up from a booklet's own page, and two from an activity's page of a many-page booklet */
  if(rel.startsWith("standalone/")) chk(rel+" links the one stylesheet",(t.match(/<link rel="stylesheet"/g)||[]).length===1&&t.includes('<link rel="stylesheet" href="'+(rel.split("/").length>3?"../../":"../")+'booklet/booklet.css">'));
  else chk(rel+" starts with its front matter",/^---\ntitle: "[^\n]*"\n(description: "[^\n]*"\n)?(weight: \d+\n)?(alternates:\n(  - hreflang: "[^\n]*"\n    href: "[^\n]*"\n)+)?---\n<!-- booklet compile /.test(t));}

console.log(fails?"\n"+fails+" FAILURES":"\ncompile golden pages passed");process.exit(fails?1:0);
