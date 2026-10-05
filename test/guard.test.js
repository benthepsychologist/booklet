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
// The settings table: one table (KIND_SETTINGS), the same in the renderer, the linter and SPEC.md section 4. A kind in it is a
// kind the format defines, so its keys are the question kinds and the structure kinds, exactly.
{const must=(label,ok,d)=>{if(ok) console.log("  ok    "+label);else{fails++;console.log("  FAIL  "+label+(d?"   → "+d:""));}};
 const norm=o=>JSON.stringify(Object.keys(o).sort().map(k=>[k,[...o[k]].sort()]));
 const rm=html.match(/const KIND_SETTINGS=\{([\s\S]*?)\};/),py=fs.readFileSync(path.join(__dirname,"..","lint-booklet.py"),"utf8"),pm=py.match(/^KIND_SETTINGS = \{([\s\S]*?)\n\}/m);
 const spec=fs.readFileSync(path.join(__dirname,"..","SPEC.md"),"utf8");
 const fromRenderer={},fromLinter={},fromSpec={};
 if(rm) for(const m of rm[1].matchAll(/(\w+):\[([^\]]*)\]/g)) fromRenderer[m[1]]=[...m[2].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
 if(pm) for(const m of pm[1].matchAll(/"(\w+)": \(([^)]*)\)/g)) fromLinter[m[1]]=[...m[2].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
 const head=spec.indexOf("| kind | settings it takes |");
 if(head>=0) for(const l of spec.slice(head).split("\n").slice(2)){if(!/^\|/.test(l)) break;
   const c=l.split("|").map(x=>x.trim()).filter(Boolean);if(c.length!==2) continue;
   const kinds=[...c[0].matchAll(/`(\w+)`/g)].map(x=>x[1]);
   const sets=c[1]==="none"?[]:[...new Set([...c[1].replace(/\([^)]*\)/g,"").matchAll(/`([^`]+)`/g)].flatMap(x=>x[1].replace(/<[^>]*>/,"").split(/\s+/)))];
   kinds.forEach(k=>{fromSpec[k]=sets;});}
 must("the renderer's KIND_SETTINGS is found and has kinds",Object.keys(fromRenderer).length>10,JSON.stringify(Object.keys(fromRenderer)));
 must("KIND_SETTINGS is the same in the renderer and the linter",norm(fromRenderer)===norm(fromLinter),norm(fromRenderer)+" vs "+norm(fromLinter));
 must("and the same in SPEC.md's table in section 4",norm(fromRenderer)===norm(fromSpec),norm(fromRenderer)+" vs "+norm(fromSpec));
 const qk=html.match(/const QUESTION_KINDS=new Set\(\[([^\]]*)\]\)/),pk=py.match(/^QUESTION_KINDS = \{([^}]*)\}/m),ps=py.match(/^STRUCTURE_KINDS = \{([^}]*)\}/m);
 const words=t=>[...t.matchAll(/"(\w+)"/g)].map(x=>x[1]);
 must("its kinds are the question kinds and the structure kinds the linter knows, and no others",
   !!(qk&&pk&&ps)&&JSON.stringify(Object.keys(fromRenderer).sort())===JSON.stringify([...new Set([...words(qk[1]),...words(ps[1])])].sort())&&JSON.stringify(words(qk[1]).sort())===JSON.stringify(words(pk[1]).sort()));
 // the unused card engine is gone, and no word of it is left but in the change list of SPEC.md section 14
 const needle="card"+"-board",gone=[];
 const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(/^(\.git|node_modules|__pycache__)$/.test(e.name)) continue;
   const f=path.join(d,e.name);if(e.isDirectory()) walk(f);else if(/\.(md|html|js|py|sh|json|yml|yaml|txt)$/.test(e.name)){
     const t=fs.readFileSync(f,"utf8");if(f.endsWith("SPEC.md")){const i=t.indexOf("### Changes from v0.7"),j=t.indexOf("### Changes from v0.6");
       if((t.slice(0,i)+t.slice(j)).includes(needle)) gone.push(f);}else if(t.includes(needle)) gone.push(f);}}};
 walk(path.join(__dirname,".."));
 must("the "+needle+" engine is mentioned nowhere in the repository outside SPEC.md's change list for v0.8",gone.length===0,gone.join(", "));
 must("and the renderer has the two engines that remain",/const ENGINES=\{"svg-regions":svgRegions,"grid-select":gridSelect\};/.test(html));
 must("showTags is read nowhere",!/showTags/.test(html));}
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
// THE PLEDGE: nothing a reader writes is uploaded. The renderer runs in the browser; their work stays there or in a file they
// save themselves. This is checked over the exact file that is published, because a promise nothing checks is only a hope.
// A change that makes any of these fail is a change to the promise itself, and needs Ben's say-so before this test is edited.
{const PLEDGE=" This is Booklet's pledge: nothing a reader writes leaves their browser except in a file they save themselves. Changing this check changes the pledge, and needs Ben's say-so.";
 const must=(label,ok,d)=>{if(ok) console.log("  ok    "+label);else{fails++;console.log("  FAIL  "+label+(d?"   → "+d:"")+PLEDGE);}};
 const full=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8");
 const libs=[...full.matchAll(/<script type="text\/plain" id="lib-([a-z]+)">([\s\S]*?)<\/script>/g)].map(m=>({id:m[1],text:m[2]}));
 const hand=html; /* the hand-written part: every script above the libraries, and the static markup */
 const NAMES=["XMLHttpRequest","sendBeacon","WebSocket","EventSource","RTCPeerConnection",".postMessage(","BroadcastChannel",
   "navigator.share","serviceWorker","importScripts","formAction",".submit(","document.cookie"];
 /* a name counts where it is not the tail of a longer identifier (performAction is not formAction) */
 const count=(text,n)=>(text.match(new RegExp("(?<![A-Za-z0-9_$])"+n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"))||[]).length;
 must("the libraries are found (mermaid and temml)",libs.map(l=>l.id).join()==="mermaid,temml"&&libs.every(l=>l.text.length>100000));
 for(const n of NAMES) must("the hand-written renderer has no "+n,count(hand,n)===0,count(hand,n)+" found");
 must("it has no <form with an action",!/<form\b[^>]*\baction\b/i.test(hand)&&!/<form\b/i.test(hand),"a <form> is present");
 must("it never writes document.cookie",count(hand,"document.cookie")===0);
 /* every fetch( call: found with a parser, counted, and able only to read */
 const cp=require("child_process"),r=cp.spawnSync(process.execPath,["--expose-internals",path.join(__dirname,"fetchsites.js")],{encoding:"utf8"});
 let sites=null;try{sites=JSON.parse(r.stdout);}catch(e){}
 const PINNED_FETCHES=2; /* loadRegistry (the registry list) and registryText (one module's file), both in region 12 */
 const textual=count(hand,"fetch(");
 must("fetch( appears exactly "+PINNED_FETCHES+" times in the hand-written code (the registry list, one module file)",textual===PINNED_FETCHES,textual+" found");
 if(sites&&!sites.unavailable){
   const calls=sites.sites.filter(x=>!x.alias),aliases=sites.sites.filter(x=>x.alias);
   console.log("  info  fetch sites: "+calls.map(c=>"line "+c.line+" "+c.text).join("; "));
   must("the parser finds exactly "+PINNED_FETCHES+" fetch calls",calls.length===PINNED_FETCHES,calls.length+" found");
   must("fetch is never aliased or passed on as a value",aliases.length===0,JSON.stringify(aliases));
   must("each fetch call is a plain read: no method, no body, no headers, no credentials, no keepalive",
     calls.every(c=>c.args<=2&&c.optionKeys.every(k=>k==="cache")),JSON.stringify(calls.map(c=>[c.line,c.optionKeys])));
   must("and each is aimed at the registry address or an address the registry listed",
     calls.map(c=>c.first).sort().join("|")==="L.url|url");}
 else console.log("  skip  the parser check of fetch calls (this Node has no bundled acorn); the textual count above still ran");
 must("no fetch( is called with a method or a body written anywhere near it",
   !/fetch\([^)]*\b(method|body|keepalive|credentials)\b/.test(hand));
 /* the vendored libraries: stored as text, started only when a file uses a diagram or a formula. What they hold, pinned.
    A count that changes here means the library was swapped: look at what is new before changing the number. */
 const ALLOW={
  mermaid:{
   "new Image":[1,"mermaid's image-shaped node (flowchart A@{ img: ... }): it asks for the picture address the diagram's source wrote, a plain GET, even under securityLevel strict (observed 2026-10-05). It is allowed in the library because the renderer never hands such a diagram to the library: diagramRisk() reads every diagram's source first and refuses an img or icon key, an address, a directive, a style that carries url() and the rest (checked below, and test/mermaid-browser.js counts requests)"],
   'append("image")':[2,"mermaid's two SVG <image> elements, one for the image-shaped node (img:) and one for a sequence participant's icon (properties ... icon). Each takes its address from the diagram's source, so each is behind the same diagramRisk() refusal (checked below)"],
   "window.open":[1,"a diagram's click link; mermaid only binds click links when its securityLevel is not strict, and the renderer starts it strict (checked below)"],
   "<iframe":[1,"the sandbox iframe, used only under securityLevel sandbox; the renderer starts mermaid strict (checked below)"]},
  temml:{
   "fetch(":[34,"33 calls of the macro expander's own .fetch(), which returns the next token, and its one definition; nothing to do with the network"],
   'createElement("img")':[1,"\\includegraphics, which temml draws only when trust is on; the renderer passes trust:false (checked below)"]}};
 const WATCH=NAMES.concat(["fetch(","new Image",'append("image")',"window.open","<iframe",'createElement("img")',"import(","Worker("]);
 for(const l of libs){
   for(const n of WATCH){const c=count(l.text,n),a=(ALLOW[l.id]||{})[n];
     if(a) must(l.id+" holds "+n+" exactly "+a[0]+" time(s), allowed because: "+a[1],c===a[0],c+" found");
     else must(l.id+" holds no "+n,c===0,c+" found: if a library can now open a connection, say so plainly and ask Ben");}}
 must("mermaid is started with securityLevel strict, so its click links and sandbox iframe never run",/securityLevel:"strict"/.test(hand)&&!/securityLevel:"(loose|sandbox|antiscript)"/.test(hand));
 must("a diagram's source is read by diagramRisk() before mermaid is started, and one that is refused returns before the library is used",
   (()=>{const m=hand.match(/function mermaidNode\(code\)\{[\s\S]*?\n  try\{/);return !!m&&/diagramRisk\(code\)/.test(m[0])&&/return box;\}\n  try\{$/.test(m[0])&&!/useLib\("mermaid"\)/.test(m[0]);})());
 must("mermaid is never started anywhere but mermaidNode (so every diagram passes that check)",count(hand,'useLib("mermaid")')===1&&count(hand,"M.initialize(")===2&&count(hand,"M.render(")===1,count(hand,'useLib("mermaid")')+" / "+count(hand,"M.initialize(")+" / "+count(hand,"M.render("));
 must("the renderer builds no <img> from a file's Markdown (mkImg draws text), and creates no img element anywhere",count(hand,'el("img"')===0&&count(hand,"createElement(\"img\")")===0&&count(hand,"new Image")===0&&!/<img\b/i.test(hand.slice(hand.indexOf("<body>"))),"img found");
 must("temml is started with trust:false, so \\includegraphics and \\href are not drawn",/trust:false/.test(hand)&&!/trust:true/.test(hand));
 must("the libraries are stored as inert text (type text/plain), never as script that runs on load",!/<script(?![^>]*type="text\/plain")[^>]*id="lib-/.test(full));}
console.log(fails?"\n"+fails+" FAILURES":"\nguard checks passed");
process.exit(fails?1:0);
