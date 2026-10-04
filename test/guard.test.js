// The renderer is a bare renderer: it draws what SPEC.md defines and loads
// modules from the registry, and carries nothing else. This fails if a name
// from the removed built-ins, wrapper, shelf or locking code comes back.
// Run: node test/guard.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
/* the vendored libraries (mermaid, Temml) sit asleep in <script type="text/plain" id="lib-…"> blocks; this guard
   reads the renderer, not them, so those blocks are left out (test/figures.test.js checks them) */
const html=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8")
  .replace(/<script type="text\/plain" id="lib-[a-z]+">[\s\S]*?<\/script>/g,"");
const BANNED=["ENTRY_STORE","emptyCheckin","emptyToday","goodday","checkins","BODY_KEYS","TODAY_KEYS","skipBody",
  "LIBRARY(","acquisitions","KEYS_BY_TYPE","LEGACY_KEYS","wrapperConfig","addModFile","veilSafety","veilRemind",
  "veilLock",'"checkin"','"today"',
  /* the second trimming pass: no in-booklet Load or merge, no address-bar routing,
     no install manifest, no callout filter, no second copy of the registry URL */
  "btnLoad","veilMerge","hashchange",'rel="manifest"',"rd-filter","DEFAULT_REGISTRY",
  /* v0.4: the query views draw rows and name nothing of any dashboard */
  "pulse","ledger","leverage","smoldering"];
let fails=0;
for(const w of BANNED){const n=html.split(w).length-1;
  if(n){fails++;console.log("  FAIL  booklet.html still contains "+w+" ("+n+"x)");}
  else console.log("  ok    no "+w);}
// The renderer's one setting: exactly one registry meta tag, and the URL lives there only.
{const n=html.split('<meta name="booklet-registry"').length-1;
  if(n===1) console.log("  ok    exactly one booklet-registry meta tag");
  else{fails++;console.log("  FAIL  expected one <meta name=\"booklet-registry\"> tag, found "+n);}
  const u=html.split("booklet-registry/main/registry.json").length-1;
  if(u===1) console.log("  ok    the registry URL appears once");
  else{fails++;console.log("  FAIL  the registry URL appears "+u+" times");}}
// The engines style what a module's figure carries by the engine's own classes, never a
// module's: svg-regions regions (class "rg") and every other shape as an outline. Without
// these an SVG draws as a solid black silhouette, which no other check notices.
for(const rule of [".svgfig .rg{",".svgfig .rg.on{",".svgfig svg :is(ellipse,circle,path,rect,polygon,polyline,line):not(.rg){"]){
  if(html.includes(rule)) console.log("  ok    styles "+rule.slice(0,-1));
  else{fails++;console.log("  FAIL  no CSS rule "+rule.slice(0,-1));}}
if(!html.includes('el("div",{class:"svgfig"})')){fails++;console.log("  FAIL  svg-regions figure wrapper lacks class svgfig");}
if(/\.bodyfig/.test(html)){fails++;console.log("  FAIL  booklet.html styles a module's own class (.bodyfig)");}
// The query's keys and views are pinned, and a view reads only the roles it is handed. Adding a key or a view means
// changing this list on purpose, in the same change as SPEC.md's table and the linter's list.
const FROZEN_KEYS=["from","as","fields","group","limit","parent","empty","label","value","note","badge","tone"];
const FROZEN_VIEWS=["cards","table","list","tiles","bars","line"];
const FROZEN_DRAWS={cards:["fields","limit"],table:["fields","group","limit","badge","tone"],
  list:["label","value","note","badge","tone","fields","group","limit","parent"],
  tiles:["label","value","note","tone","group","limit"],bars:["label","value","tone","limit"],line:["label","value","fields","limit"]};
const WHY=" A new key or view needs two real pages that need it (SPEC.md, design rules for views).";
{const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const strs=t=>[...t.matchAll(/"([a-z]+)"/g)].map(m=>m[1]);
 const check=(label,got,want)=>{if(same(got,want)) console.log("  ok    "+label);else{fails++;console.log("  FAIL  "+label+": found "+JSON.stringify(got)+", pinned "+JSON.stringify(want)+"."+WHY);}};
 const draws=text=>{const o={};for(const m of text.matchAll(/"?(\w+)"?\s*:\s*[\[(]([^\])]*)[\])]/g)) o[m[1]]=strs(m[2]);return o;};
 const keysIn=html.match(/const QUERY_KEYS=\[([^\]]*)\]/),viewsIn=html.match(/const QUERY_VIEWS=new Set\(\[([^\]]*)\]\)/),drawsIn=html.match(/const VIEW_DRAWS=\{([\s\S]*?)\};/);
 check("the renderer's QUERY_KEYS",keysIn&&strs(keysIn[1]),FROZEN_KEYS);
 check("the renderer's QUERY_VIEWS",viewsIn&&strs(viewsIn[1]),FROZEN_VIEWS);
 check("the renderer's VIEW_DRAWS",drawsIn&&draws(drawsIn[1]),FROZEN_DRAWS);
 const py=fs.readFileSync(path.join(__dirname,"..","lint-booklet.py"),"utf8");
 const pk=py.match(/^QUERY_KEYS = \(([^)]*)\)/m),pv=py.match(/^QUERY_VIEWS = \(([^)]*)\)/m),pd=py.match(/^VIEW_DRAWS = \{([\s\S]*?)\n\}/m);
 check("the linter's QUERY_KEYS",pk&&strs(pk[1]),FROZEN_KEYS);
 check("the linter's QUERY_VIEWS",pv&&strs(pv[1]),FROZEN_VIEWS);
 check("the linter's VIEW_DRAWS",pd&&draws(pd[1]),FROZEN_DRAWS);
 const spec=fs.readFileSync(path.join(__dirname,"..","SPEC.md"),"utf8");
 const head=spec.indexOf("| `as:` | draws | reads |"),tab=head<0?[]:spec.slice(head).split("\n").slice(2).filter((l,i,a)=>a.slice(0,i+1).every(x=>/^\|/.test(x)));
 const rows=tab.map(l=>l.split("|").map(x=>x.trim()).filter(Boolean)).filter(c=>c.length===3);
 check("the first column of SPEC.md's views table",rows.map(c=>c[0].replace(/`/g,"")),FROZEN_VIEWS);
 const sd={};rows.forEach(c=>{sd[c[0].replace(/`/g,"")]=[...c[2].matchAll(/`(\w+)`/g)].map(m=>m[1]);});
 check("the keys SPEC.md's views table says each view reads",sd,FROZEN_DRAWS);
 const named=[...new Set([...Object.values(sd).flat(),"from","as","empty"])].sort();
 check("every key SPEC.md's table names is one of the twelve",named,[...FROZEN_KEYS].sort());
 // a view reads the roles it is handed; the one control is drawn in one place; no view styles anything from a file's value
 const a=html.indexOf("function viewTable("),b=html.indexOf("/* ---- the pipeline");
 const views=a>0&&b>a?html.slice(a,b):"";
 const must=(label,ok)=>{if(ok) console.log("  ok    "+label);else{fails++;console.log("  FAIL  "+label);}};
 must("the view functions are found in the renderer source",views.length>2000);
 must("no view reads a raw query key (v.label, v.group, ...): they take resolved roles",!/\bv\.(from|as|fields|group|limit|parent|empty|label|value|note|badge|tone)\b/.test(views));
 must("no view wires a listener except the table headings' one ("+(views.split("addEventListener(").length-1)+" found)",views.split("addEventListener(").length-1===1);
 must("no view builds an input or a select: the control is drawn in one place",!/el\("(input|select)"/.test(views));
 must("no view sets a style, from a file's value or otherwise",!/\bstyle\s*[:=]|\.style\b|setAttribute\("style"/.test(views));
 must("no view uses innerHTML",!/innerHTML/.test(views));
 {const r0=html.indexOf("function dataSet("),r1=html.indexOf("/* ======================= 11. "),c0=html.indexOf("function viewControls("),c1=html.indexOf("function viewNodes(");
  const rest=html.slice(r0,c0)+html.slice(c1,r1);
  /* the listeners outside the control: the table headings' click, and the pipeline's one toggle listener on a nested list's box */
  const wired=rest.split("addEventListener(").slice(1).map(x=>x.slice(0,8));
  must("viewControls is defined once, and nothing else in the data views builds an input or a select, or wires a listener but the table headings' and the nested list's one toggle",
    html.split("function viewControls(").length===2&&c0>r0&&c1>c0&&!/el\("(input|select)"/.test(rest)&&wired.length===2&&wired.includes('"click",')&&wired.includes('"toggle"'),wired.join(" "));}}
// A browser ends the main <script> at the first `</script` it meets outside "double escaped" script data. A `<!--` in the
// code (the Markdown reader looks for HTML comments) opens the escaped state until the next `-->`, and a `<script` written
// while it is open (even in a comment) opens the double-escaped state, which swallows the real `</script>` and breaks the
// page with "Unexpected token '<'". Node's evaluation of the script text cannot see that, so this walks the same states.
{const full=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8"),a=full.indexOf("<script>\n")+9,want=full.indexOf("\n</script>",a)+1;
 const delim=c=>/[ \t\n\f\r\/>]/.test(c||"");let st="data",i=a,end=-1;
 while(i<full.length){const low=full.substr(i,9).toLowerCase();
   if((st==="data"||st==="escaped")&&low.startsWith("</script")&&delim(full[i+8])){end=i;break;}
   if(st==="data"&&full.startsWith("<!--",i)){if(full[i+4]===">"){i+=5;continue;}st="escaped";i+=4;continue;}
   if(st==="escaped"){if(full.startsWith("-->",i)){st="data";i+=3;continue;}
     if(low.startsWith("<script")&&delim(full[i+7])){st="double";i+=7;continue;}}
   if(st==="double"){if(full.startsWith("-->",i)){st="data";i+=3;continue;}
     if(low.startsWith("</script")&&delim(full[i+8])){st="escaped";i+=8;continue;}}
   i++;}
 if(end===want) console.log("  ok    the browser ends the main script where the file does");
 else{fails++;console.log("  FAIL  the browser would end the main script at line "+(full.slice(0,end).split("\n").length)+", not at line "+(full.slice(0,want).split("\n").length)+": a `<script` follows an unclosed `<!--` in the code");}}
console.log(fails?"\n"+fails+" FAILURES":"\nguard checks passed");
process.exit(fails?1:0);
