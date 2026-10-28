"use strict";
/* compile/engine.js: the renderer's own reading of a booklet, for the compiler.

   The compiler has no reader of its own. Everything it knows about a booklet comes from booklet.html, read from the
   same commit when it runs:
     - the main script, evaluated in a Node vm context of its own that holds a small stand-in for the page (no fetch, no
       XMLHttpRequest, no require, no process, no timers), for the parse (parseFile) and the helpers the drawing uses
       (NAMES, below). That context keeps the renderer's globals apart from the compiler's; it is NOT a security
       boundary (Node's vm module is not one). booklet.html is trusted because it is the renderer from the same commit,
       and a file named with --renderer must be one you trust as much: it runs with the compiler's own rights;
     - the Markdown engine, the text between "mdNodes(text, opts)" and "/MDNODES", evaluated in a second context and
       handed the compiler's element builder (compile/html.js) in place of the page's, so prose is drawn by the renderer's
       own rules straight into the compiler's elements (test/md.js reads the engine the same way);
     - Temml, the formula library the page carries asleep, woken in a third context for renderToString;
     - the line icons of the picture sprite, the two font families (as the woff2 files they are carried as) and the
       SIL Open Font License text that comes with them.

   The parse is the boundary of the records rule. parse() hands the compiler the design (`template`) and nothing else:
   never the state (`S`, the records), never the drafts, and never `template.raw`, which holds the records region's bytes
   (`raw.wrote`) and the records kept as written (`raw.records`) beside the design's own text (`raw.source`). Nothing is
   taken from the records, not even how many there are. The renderer's problems would quote the region (a records
   line's id, a block's kind), so the file is read twice, as the renderer itself re-reads a design: the whole file, then
   the design's own text alone (`raw.source`, the file without its records region), and the design, the problems and
   the refusal all come from the second reading. The design is copied out of the context as JSON, so nothing reachable
   from it leads back.

   Before the second reading, the design's own text is checked for the shapes in which a records region is read as
   design, and the file is refused when it has one (nothing is written): a code fence that never closes, which the
   renderer runs to the end of the file, swallowing a records region after it (a 0.15 writer saved exactly that shape);
   a records line anywhere in the design's text, inside a code block or not (the renderer's own CALLOUT_LINE reads each
   line); and a record block the renderer reports outside the region. Each is found with the renderer's own readers
   (codeFences, CALLOUT_LINE, its problem codes), never a pattern of the compiler's.

   Author comments. Obsidian hides `%%` … `%%` from the author's own view, so the author does not expect what they say to
   be published; the renderer reads them as design text (SPEC.md section 8). The compiler takes them out of the design's
   text before the second reading (authorComments, below, which skips the renderer's own fenced code), so their words reach
   no page, and the report names their lines only.

   Three renderer functions are replaced inside the context. figureFor draws a figure that a prose embed (![[#^id]])
   names: the embed's own reading of the target stays the renderer's (figureHooks), and the replacement returns which
   figure was named, with its language and code, so the compiler draws it (or marks it) instead of the page's diagram
   library; its lookup is the original's, the module's own figure first, then the booklet's. headingLink and
   moduleLinkNode are what the renderer's own link hooks (linkHooks) return for a link to a heading and a link to a
   module: the replacements return which heading or module was named, so the link rule itself (which targets are links,
   which heading a link finds) stays the renderer's and only the element is the compiler's. */
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
  "findHeading","linkNorm","moduleLinkId","figureHooks","figureFor","addrOf","linkHooks",
  /* the design's own text: its front matter, its fences and its booklet lines, read to refuse a file whose records
     would be read as design */
  "frontMatter","kvLine","normTag","codeFences","codeMask","CALLOUT_LINE",
  /* callouts and citations */
  "calloutLook","CALLOUT_LOOK","registries","pageLine","plainRef","hasVal","longDate",
  /* images */
  "imagePath","imageIs","LINK_BYTES",
  /* widgets */
  "colourOf","COLOUR_NAMES",
  /* the tables a test holds the compiler to: every block, question kind, engine and query view is drawn or marked */
  "DRAW_BLOCK","QUESTION_KINDS","ENGINES","QUERY_VIEWS"];
/* what the compiler sets or replaces inside the context: the interface language, the design being drawn, and the two
   functions the renderer's link hooks return their links through */
const VARS=["lang","BOOK","headingLink","moduleLinkNode"];
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
  vm.runInContext("headingLink=(hit,kids)=>({__heading:{hit,kids}});moduleLinkNode=(target,kids)=>({__module:{target,kids}});",ctx);
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

/* parse(text): {ok, refused: [words], problems: [words], marker: words or "", lang, design, comments}.
   The words are the renderer's own, in English (the report is the author's), save the compiler's own refusals, which
   say why in words and never quote the file. `design` is the parse's template without its `raw`, copied out of the
   context as JSON. `lang` is the booklet's own language, as its front matter declares it, in the spelling the renderer
   gives a tag (normTag); English when it declares none, as the renderer takes it. `comments`: the lines of each author
   comment left out ({from, to, open}). */
const REFUSE={
  fence:n=>"the booklet's text ends inside a code fence that never closes"+(n?" (it opens on line "+n+")":"")+", so a records region after it would be read as text and published. Close the fence with a line of the same marks that open it, then compile again.",
  recordsLine:n=>"a records line stands in the booklet's own text"+(n?" (line "+n+")":"")+", outside the records region: inside a code block, or after something that swallowed the region's start. Its records would be read as text and published. Take it out of the text, or put the records region back in its place, then compile again.",
  recordBlock:"a record block (answers, kept entries or a draft) stands in the booklet's own text, outside the records region, so it would be read as text and published. Move it into the records region or take it out, then compile again."};
function parse(R,setLang,text){
  setLang("en");
  const t=String(text==null?"":text);
  const whole=R.parseFile(t);
  const refused=why=>({ok:false,refused:[why],problems:[],marker:"",lang:"",design:null,comments:[]});
  const isOutside=list=>(Array.isArray(list)?list:[]).some(p=>p&&p.code==="recordOutside");
  /* the design's own text, as the renderer keeps it: everything outside the records region (SPEC.md section 8) */
  const own=whole.template&&whole.template.raw&&typeof whole.template.raw.source==="string"?whole.template.raw.source:null;
  let comments=[],P=whole;
  if(own!==null){
    const lines=own.split("\n"),fileLines=t.split(/\r?\n/);
    /* a line number is said only where the design's text and the file still agree up to it */
    const lineOf=i=>lines.slice(0,i+1).every((l,k)=>l===fileLines[k])?i+1:0;
    const open=Array.from(R.codeFences(lines)).find(F=>F.end>=lines.length);
    if(open) return refused(REFUSE.fence(lineOf(open.start)));
    const rec=lines.findIndex(l=>{const m=R.CALLOUT_LINE.exec(l);return !!m&&m[1].toLowerCase()==="records";});
    if(rec>=0) return refused(REFUSE.recordsLine(lineOf(rec)));
    if(isOutside(whole.unread)) return refused(REFUSE.recordBlock);
    const c=authorComments(R,lines);comments=c.comments.map(x=>({from:lineOf(x.from)||x.from+1,to:lineOf(x.to)||x.to+1,open:x.open}));
    P=R.parseFile(c.lines.join("\n"));
    if(isOutside(P.unread)) return refused(REFUSE.recordBlock);}
  const words=list=>(Array.isArray(list)?list:[]).map(p=>R.problemText(p));
  const marker=P.markerNote?R.problemText(P.markerNote):"";
  let design=null;
  if(P.template){const {raw,...rest}=P.template;design=JSON.parse(JSON.stringify(rest));}
  return {ok:!!P.ok,refused:words(P.refused),problems:words((P.unread||[]).filter(p=>p!==P.markerNote)),marker,
    lang:langOf(R,t),design,comments};}
/* the booklet's own language: its front matter's `lang`, read by the renderer's frontMatter and kvLine and spelled as
   the renderer spells a tag (normTag); "en" when it has none, as the renderer takes it */
function langOf(R,t){const fm=R.frontMatter(t,true);let v="";
  for(const l of Array.from(fm.head||[])){const kv=R.kvLine(l);if(kv&&kv[0]==="lang") v=String(kv[1]);}
  return R.normTag(v)||"en";}

/* AUTHOR COMMENTS
   Every `%%` … `%%` comment in the design's own text, outside the renderer's fenced code (codeMask), taken out: the
   lines keep their number (a line wholly inside a comment is left blank), so the renderer's problems still name the
   file's lines. A comment may sit inside one line or run over several; one that never closes runs to the end of the
   text, as Obsidian hides it. Nothing else of the format is read here: the fence rule is the renderer's. Returns the
   lines without the comments and where each one was ({from, to, open: true when it never closed}). */
const COMMENT_MARK="%%";
function authorComments(R,lines){
  const mask=Array.from(R.codeMask(lines)),out=[],comments=[];let open=null;
  lines.forEach((ln,i)=>{
    if(open===null&&mask[i]){out.push(ln);return;}
    let keep="",rest=ln;
    for(;;){const at=rest.indexOf(COMMENT_MARK);
      if(open===null){if(at<0){keep+=rest;break;}keep+=rest.slice(0,at);open={from:i};rest=rest.slice(at+COMMENT_MARK.length);}
      else{if(at<0) break;comments.push({from:open.from,to:i,open:false});open=null;rest=rest.slice(at+COMMENT_MARK.length);}}
    out.push(keep.trim()?keep:"");});
  /* one that never closes runs to the end; the report names its last line that holds anything */
  if(open!==null){let to=lines.length-1;while(to>open.from&&!lines[to].trim()) to--;comments.push({from:open.from,to,open:true});}
  return {lines:out,comments};}
/* /AUTHOR COMMENTS */

/* pageStub is exported for test/compile-content.test.js alone, which wakes the renderer's own writer in a context of its
   own to make a file the way the renderer writes one; the compiler never calls the writer */
module.exports={load,pageStub,NAMES,VARS,MD_NAMES,MD_START,MD_END,DEFAULT_RENDERER};
