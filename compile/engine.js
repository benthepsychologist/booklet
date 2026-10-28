"use strict";
/* compile/engine.js: the renderer's own reading of a booklet, for the compiler.

   The compiler has no reader of its own. Everything it knows about a booklet comes from booklet.html, read from the
   same commit when it runs:
     - the main script, evaluated in a sandbox of its own (a Node vm context holding nothing but a small stand-in for the
       page: no fetch, no XMLHttpRequest, no require, no process, no timers), for the parse (parseFile) and the helpers
       the drawing uses (NAMES, below);
     - the Markdown engine, the text between "mdNodes(text, opts)" and "/MDNODES", evaluated in a second sandbox and
       handed the compiler's element builder (compile/html.js) in place of the page's, so prose is drawn by the renderer's
       own rules straight into the compiler's elements (test/md.js reads the engine the same way);
     - Temml, the formula library the page carries asleep, woken in a third sandbox for renderToString;
     - the line icons of the picture sprite, the two font families (as the woff2 files they are carried as) and the
       SIL Open Font License text that comes with them.

   The parse is the boundary of the records rule. parse() hands the compiler the design (`template`) and nothing else:
   never the state (`S`, the records), never the drafts, and never `template.raw`, which holds the records region's bytes
   (`raw.wrote`) and the records kept as written (`raw.records`) beside the design's own text (`raw.source`). Nothing is
   taken from the records, not even how many there are. The renderer's problems would quote the region (a records
   line's id, a block's kind), so the file is read twice, as the renderer itself re-reads a design: the whole file, then
   the design's own text alone (`raw.source`, the file without its records region), and the design, the problems and
   the refusal all come from the second reading. The design is copied out of the sandbox as JSON, so nothing reachable
   from it leads back.

   One renderer function is replaced inside the sandbox: figureFor, which draws a figure that a prose embed (![[#^id]])
   names. The embed's own reading of the target stays the renderer's (figureHooks); the replacement returns which figure
   was named, with its language and code, so the compiler draws it (or marks it) instead of the page's diagram library.
   Its lookup is the original's: the module's own figure first, then the booklet's. */
const fs=require("fs"),path=require("path"),vm=require("vm");
const H=require("./html.js");

const DEFAULT_RENDERER=path.join(__dirname,"..","booklet.html");

/* Every name the compiler takes from the main script. test/compile-guard.test.js reads this list and checks each one is
   still defined in booklet.html, so a rename in the renderer fails in booklet's own CI, not on a host's build. */
const NAMES=[
  /* the parse and its words */
  "parseFile","problemText","tableTag","strings","RENDERER_VERSION","FORMAT_VERSION",
  /* reading the design */
  "isShown","isMulti","tabsIn","tabPages","tabOpening","blocksIn","blocksAll","qParts","isGroup","hintKind","isQuestion",
  "placeOf","foldName","widgetIn","wordsOf","scopeOfModule","engOpts","moduleTabOf","fencedModule","NOTICE_KEYS",
  /* words */
  "slugify","plainText","tx","nonEmpty","sameWords","clip","PLAIN_OPTS",
  /* links and figures (figureFor is replaced, below, and its replacement reads BOOK and addrOf) */
  "findHeading","linkNorm","moduleLinkId","figureHooks","figureFor","addrOf",
  /* callouts and citations */
  "calloutLook","CALLOUT_LOOK","registries","pageLine","plainRef","hasVal","longDate",
  /* images */
  "imagePath","imageIs","LINK_BYTES",
  /* widgets */
  "colourOf","COLOUR_NAMES",
  /* the tables a test holds the compiler to: every block, question kind, engine and query view is drawn or marked */
  "DRAW_BLOCK","QUESTION_KINDS","ENGINES","QUERY_VIEWS"];
/* the two variables the compiler sets inside the sandbox: the interface language and the design being drawn */
const VARS=["lang","BOOK"];
/* the names the Markdown engine's slice gives back */
const MD_NAMES=["mdNodes","renderInline","isModuleLink","textOf"];
const MD_START="/* mdNodes(text, opts)",MD_END="/* /MDNODES */";

/* The stand-in for the page the main script is evaluated against: what it touches as it loads, and nothing that reaches
   outside. getElementById knows only the ids the page's own markup has (as test/harness.js does), and the sprite's icon
   names are given to the one query that reads them. */
function pageStub(ids){
  const mk=tag=>{const n={tagName:tag,children:[],attrs:{},style:{},value:"",_text:"",dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},hasAttribute(k){return k in this.attrs;},
    getAttribute(k){return k in this.attrs?this.attrs[k]:null;},addEventListener(){},removeEventListener(){},
    append(...k){this.children.push(...k);},prepend(){},remove(){},removeChild(x){return x;},insertBefore(x){return x;},
    querySelector(){return null;},querySelectorAll(){return [];},focus(){},click(){},
    get textContent(){return this._text;},set textContent(v){this._text=String(v);},get innerHTML(){return "";},set innerHTML(v){this.children=[];}};
    return n;};
  const held={},mem={};
  const document={createElement:mk,createElementNS:(ns,t)=>mk(t),createTextNode:t=>({nodeType:3,textContent:String(t)}),
    getElementById:id=>ids.has(id)?(held[id]||(held[id]=mk("div"))):null,
    querySelector:()=>null,
    querySelectorAll:sel=>sel==='symbol[id^="bi-"]'?[...ids].filter(i=>i.startsWith("bi-")).map(id=>({id})):[],
    addEventListener(){},removeEventListener(){},body:mk("body"),head:mk("head"),documentElement:mk("html"),
    readyState:"complete",title:""};
  const localStorage={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];},
    clear:()=>{for(const k in mem) delete mem[k];},get length(){return Object.keys(mem).length;},key:i=>Object.keys(mem)[i]||null};
  const noop=()=>0;
  const window={addEventListener(){},removeEventListener(){},scrollTo(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
    location:{href:"about:blank",protocol:"about:",hostname:"",origin:"null",hash:"",search:""},innerWidth:1280,innerHeight:800};
  return {document,window,localStorage,navigator:{language:"en",languages:["en"]},
    setTimeout:noop,clearTimeout:noop,setInterval:noop,clearInterval:noop,requestAnimationFrame:noop,queueMicrotask:noop,
    TextDecoder,TextEncoder,URL,console:{log(){},warn(){},error(){},info(){}},
    Blob:class{},FileReader:class{readAsText(){}}};}

/* load(file): booklet.html, read and woken. Throws, naming what is missing, when the page no longer holds what the
   compiler reads. */
function load(file){
  file=file||DEFAULT_RENDERER;
  const page=fs.readFileSync(file,"utf8");
  const parts=page.split("<script>\n");
  if(parts.length!==2) throw new Error(path.basename(file)+": expected exactly one main <script>, found "+(parts.length-1));
  const main=parts[1].split("\n</script>")[0];
  const body=page.slice(page.indexOf("<body>"),page.indexOf("<script>\n"));
  const ids=new Set([...body.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));

  /* the main script */
  const ctx=vm.createContext(pageStub(ids));
  ctx.globalThis=ctx;ctx.self=ctx;
  vm.runInContext(main,ctx,{filename:path.basename(file)+" (main script)"});
  const missing=[...NAMES,...VARS].filter(n=>vm.runInContext("typeof "+n,ctx)==="undefined");
  if(missing.length) throw new Error(path.basename(file)+" no longer defines what the compiler reads: "+missing.join(", "));
  vm.runInContext("figureFor=(id,scope)=>{const fs=BOOK&&BOOK.figures,f=fs&&((scope&&fs[addrOf(scope,id)])||fs[id]);"
    +"return f?{__figure:{id:String(id),lang:String(f.lang==null?'':f.lang),code:String(f.code==null?'':f.code)}}:null;};",ctx);
  const R=vm.runInContext("({"+NAMES.join(",")+"})",ctx);
  /* the interface language the renderer's words are taken in, and the design its lookups (registries, figureFor) read */
  const setLang=l=>{ctx.__lang=String(l||"en");vm.runInContext("lang=__lang",ctx);};
  const setBook=d=>{ctx.__book=d;vm.runInContext("BOOK=__book",ctx);};

  /* the Markdown engine, with the compiler's element builder */
  const a=page.indexOf(MD_START),b=page.indexOf(MD_END);
  if(a<0||b<a) throw new Error(path.basename(file)+": the Markdown engine's markers are not where the compiler reads them");
  const mctx=vm.createContext({el:H.el,slugify:R.slugify});
  const M=vm.runInContext("(function(){"+page.slice(a,b)+"\nreturn {"+MD_NAMES.join(",")+"};})()",mctx,{filename:"booklet.html (mdNodes)"});
  for(const n of MD_NAMES) if(typeof M[n]!=="function") throw new Error(path.basename(file)+": the Markdown engine no longer gives "+n);

  /* Temml, woken as the page wakes it (the block is stored with </script and <!-- written <\/script and <\!--) */
  const tm=/<script type="text\/plain" id="lib-temml">([\s\S]*?)<\/script>/.exec(page);
  if(!tm) throw new Error(path.basename(file)+": the formula library (lib-temml) is not in the page");
  const tctx=vm.createContext({});
  vm.runInContext(tm[1].replace(/<\\\/script/g,"</script").replace(/<\\!--/g,"<!--"),tctx,{filename:"booklet.html (temml)"});
  const temml=tctx.temml;
  if(!temml||typeof temml.renderToString!=="function") throw new Error(path.basename(file)+": Temml did not wake");
  const tver=(/LIBRARY: temml ([0-9.]+)/.exec(page)||[])[1]||"";

  /* the line icons: each symbol's inner drawing, by name */
  const icons=Object.create(null);
  for(const m of body.matchAll(/<symbol id="bi-([a-z0-9-]+)" viewBox="0 0 24 24">([\s\S]*?)<\/symbol>/g)) icons[m[1]]=m[2];

  return {file,R,M,temml,temmlVersion:tver,icons,setLang,setBook,
    fonts:()=>fontsOf(page,file),
    parse:text=>parse(R,setLang,text)};}

/* The fonts the page carries as data: each @font-face rule's family, style, weight, unicode range and bytes, named as
   the compiler writes them (family-subset-weight-style.woff2), and the licence text that comes with them. */
const FACE=/@font-face\{font-family:'([^']+)';font-style:([a-z]+);font-weight:(\d+);font-display:swap;src:url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\) format\('woff2'\);unicode-range:([^}]+)\}/g;
const SUBSETS=[["U+0000-00FF","latin"],["U+0100-02BA","latin-ext"]];
function fontsOf(page,file){
  const css=page.slice(page.indexOf("<style>"),page.indexOf("</style>"));
  const faces=[];
  for(const m of css.matchAll(FACE)){const [,family,style,weight,b64,range]=m;
    const sub=SUBSETS.find(([start])=>range.startsWith(start));
    if(!sub) throw new Error(path.basename(file)+": a font face covers a range the compiler has no name for: "+range.slice(0,40));
    const name=family.toLowerCase().replace(/\s+/g,"-")+"-"+sub[1]+"-"+weight+"-"+style+".woff2";
    faces.push({family,style,weight,range:range.trim(),name,bytes:Buffer.from(b64,"base64")});}
  if(!faces.length) throw new Error(path.basename(file)+": no font faces found");
  const from=css.indexOf("Atkinson Hyperlegible (regular"),endWord="OTHER DEALINGS IN THE FONT SOFTWARE.",to=css.indexOf(endWord);
  if(from<0||to<from) throw new Error(path.basename(file)+": the fonts' licence text is not where the compiler reads it");
  const text=css.slice(from,to+endWord.length).split("\n").map(l=>l.replace(/^ {5}/,"")).join("\n");
  const licence="The two font families beside this file are the Booklet renderer's own faces, written out of booklet.html\n"
    +"by the Booklet compiler, unmodified.\n\n"+text+"\n";
  return {faces,licence};}

/* parse(text): {ok, refused: [words], problems: [words], marker: words or "", lang, design}.
   The words are the renderer's own, in English (the report is the author's). `design` is the parse's template without
   its `raw`, copied out of the sandbox as JSON. */
function parse(R,setLang,text){
  setLang("en");
  const whole=R.parseFile(String(text==null?"":text));
  /* the design's own text, as the renderer keeps it: everything outside the records region (SPEC.md section 8) */
  const own=whole.template&&whole.template.raw&&typeof whole.template.raw.source==="string"?whole.template.raw.source:null;
  const P=own===null?whole:R.parseFile(own);
  const words=list=>(Array.isArray(list)?list:[]).map(p=>R.problemText(p));
  const marker=P.markerNote?R.problemText(P.markerNote):"";
  let design=null;
  if(P.template){const {raw,...rest}=P.template;design=JSON.parse(JSON.stringify(rest));}
  return {ok:!!P.ok,refused:words(P.refused),problems:words((P.unread||[]).filter(p=>p!==P.markerNote)),marker,
    lang:String(P.lang||""),design};}

module.exports={load,NAMES,VARS,MD_NAMES,MD_START,MD_END,DEFAULT_RENDERER};
