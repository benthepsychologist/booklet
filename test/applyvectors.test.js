// Adding, removing and editing a row of a data block written in the booklet (SPEC.md section 5, format 0.20): the cases in test/apply-vectors.json, run against the
// renderer's port (applyToBooklet and the acts it runs: applyAdd, applyDelete, applyAct).
// The file was made by running the Booklet plugin for Obsidian's own code (core/apply.ts) on each case, so it records what the plugin does; another writer copies
// the file and runs the same cases against its own code. A case is a whole booklet, one act, and the whole booklet after it (or why the act was refused), so a
// pass shows that nothing outside the block's fences moved: not a byte, a BOM and CRLF included.
// Run: node test/applyvectors.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path"),P=require("./page.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const V=JSON.parse(fs.readFileSync(path.join(__dirname,"apply-vectors.json"),"utf8"));
const A=P.boot();
chk("the vectors file is the shape this test reads",Array.isArray(V.cases)&&V.cases.length>=100&&V.limit===5*1024*1024&&A.ROWS_LIMIT===V.limit,V.cases.length+" cases");
const kinds=new Set(V.cases.map(c=>c.act.kind));
chk("it holds adds, removals and edits",["add","delete","edit"].every(k=>kinds.has(k)));
const need=["CRLF","BOM","empty list","share","only row","tabs","clash","ambiguous","5 MB","UTF","under","numeric"];
chk("it covers the layouts and refusals the item names ("+need.join(", ")+")",need.every(w=>V.cases.some(c=>c.name.includes(w))),need.filter(w=>!V.cases.some(c=>c.name.includes(w))).join());
const run=(note,a)=>A.applyToBooklet(note,{id:a.in,mod:a.module},inner=>
  a.kind==="add"?A.applyAdd(inner,a.pick,a.under,a.row||{}):
  a.kind==="delete"?A.applyDelete(inner,a.pick,a.was):
  A.applyAct(inner,a.pick,a.field,a.was,a.a,a.eq==="option"?A.rowSameOption:A.rowSameValue));
for(const c of V.cases){
  const pad=s=>c.pad?s.replace("@PAD@","x".repeat(c.pad)):s;
  const note=pad(c.text),got=run(note,c.act);
  let ok,why="";
  if(c.expect.refused){ok=!got.ok&&got.why===c.expect.refused;why=JSON.stringify(got.ok?{ok:true}:got).slice(0,200);}
  else if(c.expect.same){ok=got.ok&&got.text===note&&got.same===true;why=got.ok?"text differs":got.why;}
  else{const want=pad(c.expect.text);ok=got.ok&&got.text===want;
    if(!ok){why=got.ok?"differs at "+[...want].findIndex((ch,i)=>ch!==got.text[i])+" of "+want.length+"/"+got.text.length+"\n    want "+JSON.stringify(want.slice(-160))+"\n    got  "+JSON.stringify(got.text.slice(-160)):got.why;}}
  chk(c.name,ok,why);}
// every refusal leaves the booklet alone: nothing is returned to write
chk("a refusal returns no text to write",V.cases.filter(c=>c.expect.refused).every(c=>{const g=run(c.pad?c.text.replace("@PAD@","x".repeat(c.pad)):c.text,c.act);return !g.ok&&g.text===undefined;}));
if(fails){console.log(fails+" apply-vector check(s) failed");process.exit(1);}
console.log("apply-vector checks passed ("+V.cases.length+" cases)");
