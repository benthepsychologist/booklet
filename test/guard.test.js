// The renderer is a bare renderer: it draws what SPEC.md defines and loads
// modules from the registry, and carries nothing else. This fails if a name
// from the removed built-ins, wrapper, shelf or locking code comes back.
// Run: node test/guard.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
/* The renderer is a core and its parts (0.13.1, item 11). This runs on the core (booklet.html) and, with the file as its
   argument, on the one-file build (test/one-file.js writes it): `node test/guard.test.js build/booklet.html`. The vendored
   libraries (mermaid, Temml) are parts. A part the file holds sits asleep in a <script type="text/plain" id="lib-…"> block;
   a part it does not hold is the file parts/NAME.js in this repository. This guard reads the renderer, not them, so any
   such block is left out of `html`, and the parts are read for what they hold below (test/figures.test.js checks the blocks
   and the parts' hashes). */
const FILE=path.resolve(process.argv[2]||path.join(__dirname,"..","booklet.html"));
const html=fs.readFileSync(FILE,"utf8")
  .replace(/<script type="text\/plain" id="lib-[a-z][a-z0-9-]*">[\s\S]*?<\/script>/g,"");
const BANNED=["ENTRY_STORE","emptyCheckin","emptyToday","goodday","checkins","BODY_KEYS","TODAY_KEYS","skipBody",
  "LIBRARY(","acquisitions","KEYS_BY_TYPE","LEGACY_KEYS","wrapperConfig","addModFile","veilSafety","veilRemind",
  "veilLock",'"checkin"','"today"',
  /* the second trimming pass: no in-booklet Load or merge, no install manifest, no callout filter, no second copy of
     the registry URL. (It also listed "hashchange", for no address-bar routing. Renderer 0.11.1 has exactly one routing place,
     openLink: a link names a booklet or a module the host declared, in the fragment, and is only ever read. Ben, 2026-10-05.) */
  "btnLoad","veilMerge",'rel="manifest"',"rd-filter","DEFAULT_REGISTRY",
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
const FROZEN_KEYS=["from","as","fields","group","limit","parent","empty","label","value","note","badge","tone","link","icon","summary"];
const FROZEN_VIEWS=["cards","table","list","tiles","bars","line"];
const FROZEN_DRAWS={cards:["label","value","note","badge","tone","fields","group","limit","link","icon"],table:["fields","group","limit","badge","tone","link","icon"],
  list:["label","value","note","badge","tone","fields","group","limit","parent","link","icon"],
  tiles:["label","value","note","tone","group","limit","link","icon"],bars:["label","value","tone","limit"],line:["label","value","fields","limit"]};
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
 const named=[...new Set([...Object.values(sd).flat(),"from","as","empty","summary"])].sort();
 check("every key SPEC.md's table names is one of the fifteen",named,[...FROZEN_KEYS].sort());
 // a view reads the roles it is handed; the one control is drawn in one place; no view styles anything from a file's value
 const a=html.indexOf("const toneWords="),b=html.indexOf("/* ---- the pipeline");
 const views=a>0&&b>a?html.slice(a,b):"";
 const must=(label,ok)=>{if(ok) console.log("  ok    "+label);else{fails++;console.log("  FAIL  "+label);}};
 must("the view functions are found in the renderer source",views.length>2000);
 must("no view reads a raw query key (v.label, v.group, ...): they take resolved roles",!/\bv\.(from|as|fields|group|limit|parent|empty|label|value|note|badge|tone|link|icon)\b/.test(views));
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
 // `earlier:` takes a whole number written in digits only (SPEC.md section 4): the renderer's check and the linter's are one pattern
 {const er=html.match(/const EARLIER_VALUE=\/(.+?)\/;/),ep=py.match(/^EARLIER_VALUE = r"([^"]*)"/m),re=er&&new RegExp(er[1]);
  const take=["0","3","12","012"],refuse=["+3","3.0","-1",""," 3","3 ","1e2","0x3","\uff11\uff12"];
  must("`earlier:`'s whole-number check is found in the renderer and the linter, and is the same pattern",!!(er&&ep)&&er[1]==="^"+ep[1]+"$",er&&ep?er[1]+" vs "+ep[1]:"not found");
  must("and it takes "+take.join(", ")+" and nothing else of "+refuse.map(x=>JSON.stringify(x)).join(", "),!!re&&take.every(x=>re.test(x))&&refuse.every(x=>!re.test(x)));}
 const qk=html.match(/const QUESTION_KINDS=new Set\(\[([^\]]*)\]\)/),pk=py.match(/^QUESTION_KINDS = \{([^}]*)\}/m),ps=py.match(/^STRUCTURE_KINDS = \{([^}]*)\}/m);
 const words=t=>[...t.matchAll(/"(\w+)"/g)].map(x=>x[1]);
 must("its kinds are the question kinds and the structure kinds the linter knows, and no others",
   !!(qk&&pk&&ps)&&JSON.stringify(Object.keys(fromRenderer).sort())===JSON.stringify([...new Set([...words(qk[1]),...words(ps[1])])].sort())&&JSON.stringify(words(qk[1]).sort())===JSON.stringify(words(pk[1]).sort()));
 // the kinds that take no id (the first word after the bar is the id for every other kind): the same list in the renderer, the linter and SPEC.md
 {const nr=html.match(/const NO_ID_KINDS=new Set\(\[([^\]]*)\]\)/),np=py.match(/^NO_ID_KINDS = \(([^)]*)\)/m),ns=spec.match(/\*\*Kinds that take no id\*\* are ([^;]*?);/);
  const quoted=t=>t?[...t.matchAll(/"(\w+)"/g)].map(x=>x[1]).sort().join():"";
  must("the kinds that take no id are found in the renderer, the linter and SPEC.md section 4",!!(nr&&np&&ns));
  must("and are the same in all three, each a kind in KIND_SETTINGS",nr&&np&&ns&&quoted(nr[1])===quoted(np[1])&&quoted(nr[1])===[...ns[1].matchAll(/`(\w+)`/g)].map(x=>x[1]).sort().join()&&quoted(nr[1]).split(",").every(k=>k in fromRenderer),
    nr&&np&&ns&&[quoted(nr[1]),quoted(np[1]),ns[1]].join(" / "));}
 // the unused card engine is gone, and no word of it is left but in the change list of CHANGES.md
 const needle="card"+"-board",gone=[];
 const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(/^(\.git|node_modules|__pycache__)$/.test(e.name)) continue;
   const f=path.join(d,e.name);if(e.isDirectory()) walk(f);else if(/\.(md|html|js|py|sh|json|yml|yaml|txt)$/.test(e.name)){
     const t=fs.readFileSync(f,"utf8");if(f.endsWith("CHANGES.md")){const i=t.indexOf("## Changes from v0.7"),j=t.indexOf("## Changes from v0.6");
       if((t.slice(0,i)+t.slice(j)).includes(needle)) gone.push(f);}else if(t.includes(needle)) gone.push(f);}}};
 walk(path.join(__dirname,".."));
 must("the "+needle+" engine is mentioned nowhere in the repository outside CHANGES.md's change list for v0.8",gone.length===0,gone.join(", "));
 must("and the renderer has the two engines that remain",/const ENGINES=\{"svg-regions":\{draw:svgRegions,summary:regionNames\},"grid-select":\{draw:gridSelect,summary:gridNames\}\};/.test(html));
 must("showTags is read nowhere",!/showTags/.test(html));}
// A browser ends the main <script> at the first `</script` it meets outside "double escaped" script data. A `<!--` in the
// code (the Markdown reader looks for HTML comments) opens the escaped state until the next `-->`, and a `<script` written
// while it is open (even in a comment) opens the double-escaped state, which swallows the real `</script>` and breaks the
// page with "Unexpected token '<'". Node's evaluation of the script text cannot see that, so this walks the same states.
{const full=fs.readFileSync(FILE,"utf8"),a=full.indexOf("<script>\n")+9,want=full.indexOf("\n</script>",a)+1;
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
 const full=fs.readFileSync(FILE,"utf8");
 /* the libraries, whichever way the file carries them: a block it holds, or the part file beside it (the repository's parts/) */
 const blocks=[...full.matchAll(/<script type="text\/plain" id="lib-([a-z][a-z0-9-]*)">([\s\S]*?)<\/script>/g)].map(m=>({id:m[1],text:m[2]}));
 const PARTS=path.join(__dirname,"..","parts");
 const partFiles=fs.existsSync(PARTS)?fs.readdirSync(PARTS).filter(f=>/\.js$/.test(f)).map(f=>f.slice(0,-3)).sort():[];
 const libs=blocks.concat(partFiles.filter(n=>!blocks.some(b=>b.id===n)).map(n=>({id:n,text:fs.readFileSync(path.join(PARTS,n+".js"),"utf8")})))
   .sort((a,b)=>a.id<b.id?-1:1);
 const hand=html; /* the hand-written part: every script above the libraries, and the static markup */
 const NAMES=["XMLHttpRequest","sendBeacon","WebSocket","EventSource","RTCPeerConnection",".postMessage(","BroadcastChannel",
   "navigator.share","serviceWorker","importScripts","formAction",".submit(","document.cookie"];
 /* a name counts where it is not the tail of a longer identifier (performAction is not formAction) */
 const count=(text,n)=>(text.match(new RegExp("(?<![A-Za-z0-9_$])"+n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"))||[]).length;
 must("the libraries are found (mermaid and temml)",libs.map(l=>l.id).join()==="mermaid,temml"&&libs.every(l=>l.text.length>100000));
 /* 0.13.1 (item 11, Ben's pick of way C): where each part lives. Temml rides inside the core; mermaid is parts/mermaid.js, and only
    the one-file build holds it as a block. A part that sits in the file must be the same text as its part file. */
 const unstore=t=>t.replace(/<\\\/script/g,"</script").replace(/<\\!--/g,"<!--");
 for(const b of blocks) if(partFiles.includes(b.id)) must("the block lib-"+b.id+" in the file is parts/"+b.id+".js, byte for byte (the one-file build)",unstore(b.text)===fs.readFileSync(path.join(PARTS,b.id+".js"),"utf8"));
 must(process.argv[2]?"the file given holds every part as a block (the one-file build)":"the core holds Temml as a block and nothing else: mermaid is parts/mermaid.js",
   blocks.map(b=>b.id).sort().join()===(process.argv[2]?partFiles.concat(["temml"]).sort().join():"temml"),blocks.map(b=>b.id).join());
 must("the file has no <script> with a src: nothing is fetched by markup, so the only way the page loads a part is useLib()",!/<script\b[^>]*\bsrc\s*=/i.test(full));
 must("the renderer makes a script with a src in exactly one place (loadPart), and the address it gets is made in exactly one place (partAddress): parts/NAME.js, under the page's own address, for a name it carries",
   count(hand,"s.src=url")===1&&count(hand,'new URL("parts/"+name+".js",location.href)')===1&&count(hand,'createElement("script")')===2&&/const LIB_GLOBAL=\{mermaid:"__esbuild_esm_mermaid_nm",temml:"temml"\}/.test(hand)&&/hasOwnProperty\.call\(LIB_GLOBAL,name\)/.test(hand));
 /* 0.13.1 (item 11): over http or https a part's script carries its pinned sha256 as an integrity attribute, so the browser refuses a
    part that is not the pinned file; a page opened from disk cannot check one (Chromium refuses even the right file), so it gets none.
    test/figures.test.js holds LIB_SRI to the part notices and to the parts themselves. */
 {const code=hand.replace(/\/\*[\s\S]*?\*\//g,"");
  must("a part's script gets an integrity attribute in exactly one place, from LIB_SRI, and only when its address is http or https; a part with no digest is not loaded over the network; and no crossorigin attribute",
    count(code,"integrity")===1&&count(hand,'if(/^https?:/.test(url)){if(!LIB_SRI[name]) throw new Error("no digest for "+name);s.integrity=LIB_SRI[name];}')===1&&
    /const LIB_SRI=\{mermaid:"sha256-[A-Za-z0-9+\/]{43}=",temml:"sha256-[A-Za-z0-9+\/]{43}="\};/.test(hand)&&!/crossOrigin|crossorigin/.test(code));}
 for(const n of NAMES) must("the hand-written renderer has no "+n,count(hand,n)===0,count(hand,n)+" found");
 must("it has no <form with an action",!/<form\b[^>]*\baction\b/i.test(hand)&&!/<form\b/i.test(hand),"a <form> is present");
 must("it never writes document.cookie",count(hand,"document.cookie")===0);
 /* every fetch( call: found with a parser, counted, and able only to read */
 const cp=require("child_process"),r=cp.spawnSync(process.execPath,["--expose-internals",path.join(__dirname,"fetchsites.js")],{encoding:"utf8"});
 let sites=null;try{sites=JSON.parse(r.stdout);}catch(e){}
 /* ONE: linkFetch (region 12), the shared reader. Until 0.11.1 the registry's list and a module's file had a fetch( of their
    own with only `cache` set; 0.11.2 sends all three reads (the registry list, a module's file, a booklet opened by link)
    through this one function, so there is one place that fetches and the same care on every read: no method, no body, no
    headers, credentials "omit", redirects are errors, a size cap (1 MB for the list, 5 MB for a module or a booklet), a
    15 s timeout. The count is pinned at one because there is nothing else for it to be: a second fetch( anywhere is a
    new way for the page to talk to a network, and needs the owner's say-so. */
 const PINNED_FETCHES=1;
 const textual=count(hand,"fetch(");
 must("fetch( appears exactly "+PINNED_FETCHES+" time in the hand-written code (the one shared reader)",textual===PINNED_FETCHES,textual+" found");
 if(sites&&!sites.unavailable){
   const calls=sites.sites.filter(x=>!x.alias),aliases=sites.sites.filter(x=>x.alias);
   console.log("  info  fetch sites: "+calls.map(c=>"line "+c.line+" "+c.text).join("; "));
   must("the parser finds exactly "+PINNED_FETCHES+" fetch call",calls.length===PINNED_FETCHES,calls.length+" found");
   must("fetch is never aliased or passed on as a value",aliases.length===0,JSON.stringify(aliases));
   must("each fetch call is a plain read: no method, no body, no headers, no keepalive; the only options are cache, credentials, redirect and a timeout signal",
     calls.every(c=>c.args<=2&&c.optionKeys.every(k=>["cache","credentials","redirect","signal"].includes(k))),JSON.stringify(calls.map(c=>[c.line,c.optionKeys])));
   must("every fetch call sends no credentials, follows no redirect and has a timeout",
     calls.every(c=>/cache:"no-cache"/.test(c.text)&&/credentials:"omit"/.test(c.text)&&/redirect:"error"/.test(c.text)&&/signal:/.test(c.text)&&c.optionKeys.length===4));
   must("and it is aimed at the address linkFetch is handed (the registry address, an address the registry listed, or the declared store plus a checked name)",
     calls.map(c=>c.first).join("|")==="url");}
 else console.log("  skip  the parser check of fetch calls (this Node has no bundled acorn); the textual count above still ran");
 must("no fetch( is called with a method or a body written anywhere near it",
   !/fetch\([^)]*\b(method|body|keepalive)\b/.test(hand)&&(hand.match(/fetch\([^)]*\bcredentials\b[^)]*\)/g)||[]).every(t=>/credentials:"omit"/.test(t)));
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
 must("a diagram's source is read by diagramRisk() before mermaid is started, and one that is refused returns before the library is used or its part is asked for",
   (()=>{const m=hand.match(/function mermaidNode\(code\)\{[\s\S]*?useLib\("mermaid"\)/);return !!m&&/diagramRisk\(code\)\)\{[^\n]*\n[^\n]*return box;\}/.test(m[0])&&m[0].indexOf("diagramRisk(code)")<m[0].lastIndexOf('useLib("mermaid")')&&!/whenLib|loadPart/.test(m[0]);})());
 must("mermaid is never started anywhere but mermaidNode (so every diagram passes that check)",count(hand,'useLib("mermaid")')===1&&count(hand,"M.initialize(")===2&&count(hand,"M.render(")===1,count(hand,'useLib("mermaid")')+" / "+count(hand,"M.initialize(")+" / "+count(hand,"M.render("));
 /* CHANGED WITH BEN'S SAY-SO (2026-10-23, chat; v0.15 item v015-store-images): the renderer draws an image from the host's declared
    store, for a booklet opened from it and for no other. So the old rule "no img element anywhere" becomes this exact one: no
    other way to make an image exists, and the one img element has its address only from a blob: URL made from bytes the one
    shared reader (linkFetch, pinned above) returned, checked against the file's extension, for a booklet whose entry came from
    "store:". A booklet from a file, the registry or a page with no store still draws the box (mkImg's text path).
    CHANGED FOR THE DEFAULT FOLDER (0.15, item v015-host-modules-and-checksum; Ben, 2026-10-23: "B. modules/ sounds good";
    confirmed by Ben, 2026-10-24: "yes, keep the change"): a booklet opened from this page's own default folder
    (`modules:<folder>#<name>`, the folder being this page's modules/) draws its images by the same rule, read from beside it
    there. The check below pins imageFolder's text exactly, and the helpers it relies on: storeNameOf, the whole of fromParts,
    folderFrom (the folder an entry names), folderOf, the first line of storeAddress and the whole of defaultStore (this
    page's folder: modules/ beside the page, over http or https, and none when a booklet-store tag is present). So a booklet
    from another default folder, or from no folder at all, still gets none. The defaultStore, folderFrom and fromParts
    first-line pins were added after a cold review of the merge; they are the same change. */
 must("the renderer builds no <img> from a file's Markdown except the one for the declared store and the page's own default folder: no el(\"img\"), createElement(\"img\"), new Image or <img markup, and exactly one E(\"img\" in mkImg",count(hand,'el("img"')===0&&count(hand,"createElement(\"img\")")===0&&count(hand,"new Image")===0&&!/<img\b/i.test(hand.slice(hand.indexOf("<body>")))&&count(hand,'E("img"')===1,"img found");
 must("that one img takes its address from r.url only (its one other attribute is the error listener that swaps in the box), and r.url is only ever a blob: URL made from the bytes linkFetch read (the other createObjectURL is the download of a copy)",
   count(hand,'E("img",{class:"mdimg",src:r.url,alt:alt||"",onerror:()=>{imageBroken(r.at);if(im.parentNode&&typeof im.replaceWith==="function") im.replaceWith(draw({note:strings("ui").imgBroken}));}})')===1&&count(hand,"src:r.url")===1&&count(hand,"createObjectURL(")===2&&count(hand,"{url:URL.createObjectURL(new Blob([got.bytes],{type:IMG_EXT[ext]}))}")===1&&count(hand,"linkFetch(at,{raw:true})")===1);
 must("a booklet gets images only when its entry came from the declared store or from this page's own default folder (folderOf: the folder it came from, and only when that is this page's modules/), this visit read that folder's file, and every part the image is in (a module, or the opening and outside activities) holds the folder's own text (storeModule: the same text for that part in the file just read and in the booklet open), a prose block says which module it is in (imageScope), and only for a checked path inside that booklet's folder",
   count(hand,'function imageFolder(scope){const e=currentEntry,f=e&&e.from,s=storeNameOf(e),n=s!==""&&STORE_SRC!==""&&typeof scope==="string"&&storeModule(scope)?linkName(s):null,at=n===null?null:storeAddress(n,folderOf(f));')===1
   &&count(hand,'const storeNameOf=e=>{const p=fromParts(e&&e.from);return p?p.name:"";};')===1
   &&count(hand,'function fromParts(f){if(typeof f!=="string") return null;\n  if(f.startsWith("store:")){const name=f.slice("store:".length);return name?{kind:"store",name}:null;}\n  if(f.startsWith("modules:")){const r=f.slice("modules:".length),i=r.indexOf("#");\n    return i>0&&i<r.length-1?{kind:"modules",folder:r.slice(0,i),name:r.slice(i+1)}:null;}\n  return null;}')===1
   &&count(hand,'const folderFrom=(folder,name)=>{try{return "modules:"+new URL(folder).pathname+"#"+name;}catch(e){return "";}};')===1
   &&count(hand,'function defaultStore(){\n  if(typeof document==="undefined"||!document.querySelector||document.querySelector(\'meta[name="booklet-store"]\')) return "";\n  if(typeof location==="undefined"||(location.protocol!=="https:"&&location.protocol!=="http:")) return "";\n  try{const u=new URL("modules/",location.href);u.search="";u.hash="";return u.href;}catch(e){return "";}}')===1
   &&count(hand,'const folderOf=f=>{const p=fromParts(f);if(!p) return "";if(p.kind==="store") return storeUrl();\n  const d=defaultStore();try{return d&&new URL(d).pathname===p.folder?d:"";}catch(e){return "";}};')===1
   &&count(hand,'function storeAddress(name,base){base=base===undefined?storeUrl():base;const n=linkName(name);if(!base||n===null) return null;')===1
   &&count(hand,'const storeModule=id=>{const a=moduleMemo("store",STORE_SRC)[id];return a!==undefined&&a===moduleMemo("book",String(((typeof BOOK!=="undefined"&&BOOK&&BOOK.raw)||{}).source||""))[id];};')===1
   &&/function storeImage\(src,done,scope\)\{const folder=imageFolder\(scope\);if\(folder===""\) return null;/.test(hand)&&/u\.href\.startsWith\(folder\)&&u\.origin===new URL\(folder\)\.origin/.test(hand)
   &&count(hand,'typeof ctx.opts.imageScope==="string"?storeImage(')===1&&count(hand,"imageScope:scopeOfAddr(activityId)")===1&&count(hand,'STORE_SRC=')===3&&count(hand,'let STORE_SRC="";')===1&&count(hand,'function imagesRelease(){STORE_SRC="";')===1&&count(hand,'STORE_SRC=String((((R&&R.template)||{}).raw||{}).source||"");')===1&&count(hand,"noteStoreFile(R)")===5);
 must("temml is started with trust:false, so \\includegraphics and \\href are not drawn",/trust:false/.test(hand)&&!/trust:true/.test(hand));
 must("the libraries are stored as inert text (type text/plain), never as script that runs on load",!/<script(?![^>]*type="text\/plain")[^>]*id="lib-/.test(full));
 must("a part is woken or loaded only through useLib(), and only mermaidNode and mathNode ask for one by name",count(hand,'useLib("mermaid")')===1&&count(hand,'useLib("temml")')===1&&count(hand,"loadPart(")===2&&count(hand,"whenLib(")===2);

 /* 0.11.5: a file's SVG reaches the page only through sanitizeSvg, and the page's own el() html path has no caller */
 {const strip=hand.split("<!-- LIBRARY:")[0];
  const main=strip.slice(strip.indexOf("<script>"));
  must("sanitizeSvg is called in exactly one place, the widget figure's drawFig",
    (main.match(/\.\.\.sanitizeSvg\(/g)||[]).length===1&&(main.match(/[^.]\bsanitizeSvg\(/g)||[]).filter(x=>!/^\s?function|\//.test(x)).length>=0&&/fig\.append\(\.\.\.sanitizeSvg\(f&&f\.svg\)\)/.test(main),(main.match(/sanitizeSvg\(/g)||[]).length);
  must("a figure's svg field is read in exactly one place, and mermaid's output goes through sanitizeDiagramSvg",
    (main.match(/\.svg\b/g)||[]).length===1&&(main.match(/sanitizeDiagramSvg\(/g)||[]).length===2);
  must("no SVG markup is written with innerHTML, insertAdjacentHTML, outerHTML or DOMParser anywhere but the two sanitizers",
    !/insertAdjacentHTML|outerHTML|createContextualFragment|srcdoc/.test(main)&&(main.match(/new DOMParser\(\)/g)||[]).length===2);
  must("the sanitizer has no <style>, <image>, <foreignObject>, <script> or filter in its kept list",
    (()=>{const m=main.match(/const SVG_KEEP=new Set\("([^"]*)"/);return !!m&&!/\b(style|image|foreignobject|script|filter|a|animate|set)\b/.test(m[1]);})());
  must("F8: el()'s html attribute has no caller: no `html:` key is written anywhere in the renderer's script",
    !/[{,]\s*["']?html["']?\s*:/.test(main.replace(/htmlLabels\s*:/g,"")),"");
  must("F8: the only innerHTML write that takes a value is el()'s own (n.innerHTML=v)",
    (main.match(/\.innerHTML\s*=\s*(?!"")[^;]+;/g)||[]).join("|")===".innerHTML=v;",(main.match(/\.innerHTML\s*=\s*(?!"")[^;]+;/g)||[]).join("|"));
  must("F10: mergeDeep is called only on the built-in STRINGS tables (and on itself)",
    (main.match(/mergeDeep\(/g)||[]).length===6&&(main.match(/STRINGS(_SRC)?[.\[][^;]*mergeDeep|mergeDeep\(STRINGS/g)||[]).length>=0
    &&/STRINGS\.fr=mergeDeep\(STRINGS_SRC\.en,STRINGS_SRC\.fr\);\s*STRINGS\.es=mergeDeep\(STRINGS_SRC\.en,STRINGS_SRC\.es\);\s*STRINGS\["es-AR"\]=mergeDeep\(STRINGS\.es,STRINGS_SRC\["es-AR"\]\)/.test(main),(main.match(/mergeDeep\(/g)||[]).length);}
 }
// THE RENDERER CARRIES ITS OWN CONTENT-SECURITY-POLICY (0.11.6): a meta tag directly after the charset tag, so the block on
// fetch and the rest is in the file itself and a copy opened from disk or served by any host has it. A host's header can only
// add a second policy, never loosen this one. The script hashes are computed by test/csp-hash.js, never typed.
{const full=fs.readFileSync(FILE,"utf8"),csp=require("./csp-hash.js");
 const FIX=" Run: node test/csp-hash.js --write booklet.html (and if the policy itself was changed on purpose, that needs Ben's say-so).";
 const must=(label,ok,d)=>{if(ok) console.log("  ok    "+label);else{fails++;console.log("  FAIL  "+label+(d?"   → "+d:"")+FIX);}};
 const head=full.slice(0,full.indexOf("<body>"));
 const tags=[...head.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)">/gi)];
 must("exactly one Content-Security-Policy meta tag",tags.length===1&&(head.match(/http-equiv="content-security-policy"/gi)||[]).length===1,tags.length+" found");
 must("the policy tag comes directly after the charset tag, which is first in the head",head.indexOf('<head>\n<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy"')>=0);
 const script=head.indexOf("<script"),style=head.indexOf("<style"),link=head.indexOf("<link"),at=head.indexOf("Content-Security-Policy");
 must("it comes before every script, style and link (a meta policy governs only what follows it)",at>0&&at<script&&at<style&&at<link);
 const have=tags[0]?tags[0][1]:"";
 /* the fixed part, written out here so that weakening the template in csp-hash.js cannot pass by changing both together */
 const FIXED="default-src 'none'; script-src 'self' "+csp.scripts(full).map(()=>"H").join(" ")+"; style-src 'self' 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'self' https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; object-src 'none'";
 must("the policy is exactly the one this renderer carries (its script hashes aside: one per script the file holds)",have.replace(/'sha256-[A-Za-z0-9+\/]+={0,2}'/g,"H")===FIXED,have);
 const sc=(/script-src ([^;]*)/.exec(have)||["",""])[1];
 must("scripts: no unsafe-inline, no unsafe-eval, no strict-dynamic, no wildcard, no host but 'self'",!/unsafe-inline|unsafe-eval|strict-dynamic|\*|https?:/.test(sc),sc);
 must("the policy names exactly one hash for the theme-boot script, the main script and each part the file holds as a block ("+(2+csp.held(full).length)+")",(sc.match(/'sha256-/g)||[]).length===2+csp.held(full).length);
 must("the hashes are of the scripts as they stand now (theme-boot, main, and each library block the file holds as useLib() starts it: temml in the core, temml and mermaid in the one-file build)",csp.problems(full).length===0,csp.problems(full).join(" | "));
 must("the DNS-prefetch tag follows it: x-dns-prefetch-control is off",full.includes(csp.CHARSET+"\n"+csp.tagFor(full)+"\n"+csp.DNS+"\n")&&/<meta http-equiv="x-dns-prefetch-control" content="off">/.test(head));
 /* what the policy leaves out is as much of the promise as what it names: no frame, worker, media, manifest or font source is opened */
 must("nothing else is opened: no frame-src, worker-src, media-src, manifest-src or child-src, so default-src 'none' closes them; the one source the renderer opens is its own fonts",
   !/frame-src|worker-src|media-src|manifest-src|child-src|prefetch-src/.test(have));
 must("font-src is exactly data: (the faces are carried inside the file; no font address, no 'self', no host)",
   (have.match(/font-src [^;]*/g)||[]).join("|")==="font-src data:",have);
 /* the static guard still forbids every other way out; WebRTC is not governed by a CSP, so this is what holds it */
 must("RTCPeerConnection and the other ways out the policy cannot govern stay forbidden in the renderer's code (the pledge list above)",
   !/RTCPeerConnection|webkitRTCPeerConnection|RTCDataChannel|WebTransport/.test(html));}
/* One builder for every card (0.11.10): the card class is given to an element in cardNode and nowhere else. The detector
   is itself tested: it must see the violation in a seeded line and must see cardNode's own, or a pass would mean nothing. */
{const CARD_MAKER=/(?:\bclass|\bclassName)\s*[:=]\s*(["'`])[^"'`]*\bcard(?:-(?:go|fold|item|sub))?\b[^"'`]*\1|classList\.add\(\s*["'`]card\b|["'`]card["']\s*,\s*["'`]card-/;
 const a=html.indexOf("function cardNode(o){"),b=html.indexOf("/* what a reader has done in an activity");
 const must=(n,ok,d)=>{if(ok)console.log("  ok    "+n);else{fails++;console.log("  FAIL  "+n+(d?"   → "+d:""));}};
 must("cardNode is found in the renderer",a>0&&b>a);
 const body=html.slice(a,b),rest=html.slice(0,a)+html.slice(b);
 must("the detector sees a card made by another function (seeded)",CARD_MAKER.test('function f(){return el("div",{class:"card card-go"});}')&&CARD_MAKER.test('n.className="card"')&&CARD_MAKER.test('x.classList.add("card")'));
 must("the detector sees cardNode's own card class",CARD_MAKER.test(body));
 const hit=rest.split("\n").map((l,i)=>[i,l]).filter(([i,l])=>!/^\s*(\/\*|\.|@)/.test(l)&&CARD_MAKER.test(l));
 must("no other function gives an element the card class",hit.length===0,hit.map(([i,l])=>l.trim().slice(0,80)).join(" | "));}
console.log(fails?"\n"+fails+" FAILURES":"\nguard checks passed");
process.exit(fails?1:0);
