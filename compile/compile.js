#!/usr/bin/env node
"use strict";
// compile 0.1.0: a booklet file to a plain web page. It is a build step beside the renderer, never the published booklet.html.
//   node compile/compile.js [options] <file.booklet.md> ...
//     --out <dir>         where to write (default compiled/)
//     --form <form>       standalone (default), site, or both
//                           standalone: <out>/<name>/index.html, a whole page with its head, and <out>/booklet/ (the stylesheet
//                                       and its fonts), which the page links as ../booklet/booklet.css
//                           site:       <out>/<name>/index.html, YAML front matter (title, description) over an HTML fragment,
//                                       for a site generator's content folder; <out>/booklet/ goes in the site's static folder
//                           both:       the two, under <out>/standalone/ and <out>/site/
//     --base-url <url>    the address the pages are served under (https://example.org/library/): a standalone page then
//                         carries its canonical address and og:url, <url><name>/
//     --report <file>     also write the build report to this file (it is always printed)
//     --force             overwrite a page that was changed by hand since it was compiled, or one the compiler did not write
//     --renderer <file>   the booklet.html to read the format with (default: the one beside compile/)
//     --version           print the compiler's version and the renderer's
// Each file is compiled on its own; its address is its name before .booklet.md. Exit 0 when every file was compiled and
// written, 1 when one was refused or a page was kept back by the stamp guard, 2 for a mistake in the command.
//
// What it reads and what it never reads:
//   - the format only through booklet.html's own parse and Markdown engine (engine.js), so a file the renderer refuses is
//     refused here, and the problems it reports are in the report;
//   - the booklet's design only: its records (answers, kept entries, drafts) are never read, so none can reach a page or
//     the report;
//   - images only from relative paths, by the renderer's own rule, from inside the booklet's own folder (images, below);
//   - nothing from the network: this folder opens no connection and installs nothing (test/compile-guard.test.js checks it).
// It never writes to a .booklet.md file.
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const E=require("./engine.js"),D=require("./draw.js"),H=require("./html.js");

const VERSION="0.1.0";
const STYLESHEET=path.join(__dirname,"booklet.css");
const NAME=/^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/* ======================= IMAGES =======================
   An image is drawn only from a path the renderer's own rule accepts (imagePath: letters, digits, _ . / -, at most 200
   characters, no leading /, no part that starts with a dot, an image extension). At build time the folder the booklet is in
   stands where a renderer's declared store stands: the file is read from there, its real path must stay inside that folder
   (a symbolic link cannot lead out of it), it may be at most the renderer's LINK_BYTES (5 MB), and its bytes must be what
   its extension says (imageIs). It is then copied beside the page at the same relative path, so <img src> needs no
   rewriting. Anything else is never read and never written as a src: the page shows its alt text and address. */

/* An SVG is drawn as <img>, so inside the page it runs nothing. But the host serves the copy from its own site, where
   opening the file directly would run whatever it holds. So an SVG that holds any of these is refused (never cleaned:
   nothing is rewritten, so there is no cleaned markup for a browser to read differently). Numeric character references
   are decoded first, so an entity cannot hide a word, and any other entity is refused. */
function svgProblem(bytes){
  const raw=Buffer.from(bytes).toString("utf8");
  if(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(raw)) return "an entity other than the XML five";
  const t=raw.replace(/&#x([0-9a-fA-F]+);/g,(m,h)=>safeChar(parseInt(h,16))).replace(/&#(\d+);/g,(m,d)=>safeChar(parseInt(d,10)));
  const low=t.toLowerCase(),squeezed=low.replace(/[\u0000-\u0020\u007f-\u00a0]+/g,"");
  if(/<!doctype[^>]*\[/.test(low)||low.includes("<!entity")) return "a DOCTYPE with entities";
  if(low.includes("<?xml-stylesheet")) return "an outside stylesheet";
  if(/<script\b/.test(low)) return "a script";
  if(/<foreignobject\b/.test(low)) return "<foreignObject>";
  for(const tag of ["iframe","embed","object","handler","listener","base","link","meta"]) if(new RegExp("<"+tag+"\\b").test(low)) return "<"+tag+">";
  if(/[\s"'/]on[a-z]+\s*=/.test(low)) return "an event attribute";
  if(/(?:javascript|vbscript|data|file):/.test(squeezed)) return "a javascript:, vbscript:, data: or file: address";
  if(low.includes("@import")||/expression\s*\(/.test(low)) return "an outside stylesheet";
  for(const m of low.matchAll(/(?:^|[\s"'/])(?:xlink:)?(?:href|src)\s*=\s*(["'])([\s\S]*?)\1/g)) if(!m[2].trim().startsWith("#")) return "an outside reference ("+clipWords(m[2])+")";
  if(/(?:^|[\s"'/])(?:xlink:)?(?:href|src)\s*=\s*[^\s"']/.test(low)) return "an unquoted reference";
  for(const m of low.matchAll(/url\(\s*(["']?)\s*([^)"']*)/g)) if(!m[2].startsWith("#")) return "an outside reference (url("+clipWords(m[2])+"))";
  if(/<(?:set|animate)\b[^>]*attributename\s*=\s*["']\s*(?:xlink:)?href/.test(low)) return "an animation that changes a link";
  return null;}
const safeChar=n=>{try{return String.fromCodePoint(n);}catch(e){return "\uFFFD";}};
const clipWords=s=>{s=String(s).trim();return s.length>40?s.slice(0,40)+"\u2026":s;};

/* the image check for one booklet: (rel, ext) -> {ok} | {ok:false, why, detail}; what passes is kept to be copied */
function imageReader(dir,X,keep){
  let root=null;try{root=fs.realpathSync(dir);}catch(e){root=null;}
  return (rel,ext)=>{
    if(!root) return {ok:false,why:"imgMissing",detail:"the booklet's folder could not be read"};
    let real;try{real=fs.realpathSync(path.join(root,rel));}catch(e){return {ok:false,why:"imgMissing",detail:"no such file beside the booklet"};}
    if(!(real.startsWith(root+path.sep))) return {ok:false,why:"imgRefused",detail:"the path leads outside the booklet's folder"};
    let size=0;try{const s=fs.statSync(real);if(!s.isFile()) return {ok:false,why:"imgMissing",detail:"not a file"};size=s.size;}catch(e){return {ok:false,why:"imgMissing",detail:"no such file"};}
    if(size>X.R.LINK_BYTES) return {ok:false,why:"imgBig",detail:"larger than "+X.R.LINK_BYTES+" bytes"};
    const bytes=fs.readFileSync(real);
    let ok=false;try{ok=!!X.R.imageIs(ext,new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.length));}catch(e){ok=false;}
    if(!ok) return {ok:false,why:"imgWrong",detail:"its bytes are not a ."+ext+" file"};
    if(ext==="svg"){const why=svgProblem(bytes);if(why) return {ok:false,why:"imgNotShown",detail:"an SVG the compiler refuses: it holds "+why};}
    keep.set(rel,bytes);
    return {ok:true};};}

/* ======================= THE TWO FORMS ======================= */
const esc=H.escAttr;
/* JSON in a <script> element: no value can close the element or open a comment */
const scriptJson=v=>JSON.stringify(v).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
/* a YAML double-quoted string: every character a YAML reader could take for anything but text is escaped */
const yamlString=s=>'"'+String(s).replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g,c=>"\\u"+c.charCodeAt(0).toString(16).padStart(4,"0")).replace(/[{}]/g,c=>c==="{"?"\\u007B":"\\u007D")+'"';
/* a site generator runs template code written in a content file ({{ ... }}, {% ... %}, {# ... #}): every such opening in
   the fragment is written as a character reference, which a browser reads as the same character and a generator reads
   as text */
const noTemplates=s=>s.replace(/\{\{/g,"&#123;&#123;").replace(/\{(?=[%#])/g,"&#123;");

function headTags(page,o){
  const tags=[],meta=(k,v,attr)=>{if(v) tags.push('<meta '+(attr||"name")+'="'+k+'" content="'+esc(v)+'">');};
  tags.push('<meta charset="utf-8">','<meta name="viewport" content="width=device-width, initial-scale=1">','<title>'+H.escText(page.title)+'</title>');
  meta("description",page.description);
  const url=o.baseUrl?o.baseUrl+o.name+"/":"";
  if(url) tags.push('<link rel="canonical" href="'+esc(url)+'">');
  meta("og:type","article","property");meta("og:title",page.title,"property");meta("og:description",page.description,"property");
  if(page.lang) meta("og:locale",page.lang.replace(/-/g,"_"),"property");
  if(url) meta("og:url",url,"property");
  meta("generator","Booklet compile "+VERSION);
  tags.push('<link rel="stylesheet" href="../booklet/booklet.css">');
  const ld={"@context":"https://schema.org","@type":"Article",headline:page.title};
  if(page.description) ld.description=page.description;
  if(page.lang) ld.inLanguage=page.lang;
  if(url) ld.url=url;
  if(page.copyright) ld.copyrightNotice=page.copyright;
  if(page.license&&/^https?:\/\/\S+$/i.test(page.license)) ld.license=page.license;
  tags.push('<script type="application/ld+json">'+scriptJson(ld)+'</script>');
  return tags;}
function standalone(page,o){
  return "<!doctype html>\n"+'<html'+(page.lang?' lang="'+esc(page.lang)+'"':"")+'>\n<head>\n'+headTags(page,o).join("\n")+"\n</head>\n"
    +'<body class="bk-page">\n<main class="bk-main">\n'+H.html(page.article,0)+"</main>\n</body>\n</html>\n";}
function sitePage(page){
  return "---\ntitle: "+yamlString(page.title)+"\n"+(page.description?"description: "+yamlString(page.description)+"\n":"")+"---\n"
    +noTemplates(H.html(page.article,0));}

/* ======================= THE STAMP =======================
   Each page carries one comment line naming the compiler's version, the source file's name and the sha256 of the page as
   written without that line. On the next run, a page whose text no longer matches its stamp was changed by hand, and one
   with no stamp was not written by the compiler: neither is overwritten unless --force is given. */
const STAMP=/^<!-- booklet compile (\S+) \u00b7 from (.*) \u00b7 sha256:([0-9a-f]{64}) -->\n/m;
const sha256=t=>crypto.createHash("sha256").update(t,"utf8").digest("hex");
/* the stamp goes after the doctype (standalone) or the front matter (site), where the line is free */
function stamp(text,source,form){
  const at=form==="site"?text.indexOf("\n---\n")+5:text.indexOf("\n")+1;
  const line="<!-- booklet compile "+VERSION+" \u00b7 from "+String(source).replace(/--+/g,"-").replace(/[\r\n]/g," ")+" \u00b7 sha256:"+sha256(text)+" -->\n";
  return text.slice(0,at)+line+text.slice(at);}
/* "compiled" (unchanged since it was written), "changed" (tidied by hand) or "foreign" (no stamp) */
function stampState(text){const m=STAMP.exec(text);if(!m) return "foreign";
  const rest=text.slice(0,m.index)+text.slice(m.index+m[0].length);
  return sha256(rest)===m[3]?"compiled":"changed";}

/* ======================= ONE BOOKLET ======================= */
/* compileOne(X, {file|text, name, dir}, o): what one booklet makes, as files relative to the output folder, and its report.
   o.parsed: the parse, when compile() has already made it; o.siblings: the other booklets of the run, by address, with
   their titles (a link to one is drawn as a link to its page). */
function compileOne(X,input,o){
  const source=path.basename(input.file||input.name+".booklet.md");
  const name=input.name;
  const rep={source,name,form:o.form,ok:false,refused:[],problems:[],marker:"",pages:[],
    counts:null,marked:[],images:[],links:[],description:"",toc:false};
  if(!NAME.test(name)||name==="booklet"){rep.refused.push("its address, “"+name+"”, must be letters, digits, . _ or - (and not “booklet”, the stylesheet's folder): rename the file");return {rep,files:new Map()};}
  const P=o.parsed||parseInput(X,input);
  rep.problems=P.problems;rep.marker=P.marker;
  if(!P.ok||!P.design){rep.refused=P.refused.length?P.refused:P.problems.length?P.problems:["the renderer could not read it"];return {rep,files:new Map()};}
  const keep=new Map(),files=new Map();
  const forms=o.form==="both"?["standalone","site"]:[o.form];
  let first=null;
  for(const form of forms){
    const page=D.drawPage(X,P,{name,form,siblings:o.siblings,image:imageReader(input.dir||".",X,keep)});
    const mods=P.design.modules||[],withNotice=mods.filter(m=>m.notice&&typeof m.notice==="object");
    const nt=(withNotice[0]||{}).notice||{};
    page.copyright=typeof nt.copyright==="string"?nt.copyright.trim():"";page.license=typeof nt.license==="string"?nt.license.trim():"";
    const root=o.form==="both"?form+"/":"";
    const body=form==="standalone"?standalone(page,{name,baseUrl:o.baseUrl}):sitePage(page);
    files.set(root+name+"/index.html",stamp(body,source,form));
    rep.pages.push(root+name+"/index.html");
    for(const [rel,bytes] of keep) files.set(root+name+"/"+rel,bytes);
    if(!first) first=page;}
  Object.assign(rep,{ok:true,counts:first.counts,marked:first.marked,images:dedupe(first.images),links:first.links,description:first.description,toc:first.toc});
  return {rep,files};}
const parseInput=(X,input)=>X.parse(input.text!=null?input.text:fs.readFileSync(input.file,"utf8"));
/* a page's title, as drawPage takes it: the booklet's title, else its first module's, else its address */
const titleOf=(X,P,name)=>{const d=P.design,t=v=>X.R.plainText(X.R.tx(v,""));return t(d.title)||t((d.modules[0]||{}).title)||name;};
const dedupe=list=>{const seen=new Set();return list.filter(x=>{const k=x.src+"\u0000"+x.ok+"\u0000"+(x.where||"");if(seen.has(k)) return false;seen.add(k);return true;});};

/* the stylesheet and its fonts, for each form's booklet/ folder */
function assets(X,form){const F=X.fonts(),out=new Map(),roots=form==="both"?["standalone/","site/"]:[""];
  const css=fs.readFileSync(STYLESHEET,"utf8");
  for(const r of roots){out.set(r+"booklet/booklet.css",css);
    for(const f of F.faces) out.set(r+"booklet/fonts/"+f.name,f.bytes);
    out.set(r+"booklet/fonts/OFL.txt",F.licence);}
  return out;}

/* compile(inputs, o): every booklet, and the assets. inputs: [{file} or {text, name, dir}]. o: {form, baseUrl, renderer}.
   Writes nothing: write() does. */
function compile(inputs,o){o=o||{};
  const form=o.form||"standalone";
  if(!["standalone","site","both"].includes(form)) throw new Error("--form must be standalone, site or both");
  const baseUrl=o.baseUrl?checkBase(o.baseUrl):"";
  const X=o.engine||E.load(o.renderer);
  const list=inputs.map(i=>({...i,name:i.name||nameOf(i.file),dir:i.dir||(i.file?path.dirname(i.file):".")}));
  /* each file is read once, first, so a page knows which of the others it can link to, and by what title */
  const seen=new Set(),siblings=new Map(),parsed=new Map();
  for(const i of list){if(seen.has(i.name)){i.dup=true;continue;}seen.add(i.name);
    if(!NAME.test(i.name)||i.name==="booklet") continue;
    const P=parseInput(X,i);parsed.set(i,P);
    if(P.ok&&P.design) siblings.set(i.name,titleOf(X,P,i.name));}
  const results=[];
  for(const i of list){
    if(i.dup){results.push({rep:{source:path.basename(i.file||i.name),name:i.name,ok:false,refused:["another file in this run has the same address, “"+i.name+"”"],problems:[],pages:[]},files:new Map()});continue;}
    results.push(compileOne(X,i,{form,baseUrl,siblings,parsed:parsed.get(i)}));}
  return {results,assets:assets(X,form),form,renderer:X.R.RENDERER_VERSION,format:X.R.FORMAT_VERSION};}
const nameOf=f=>path.basename(String(f)).replace(/\.booklet\.md$/i,"").replace(/\.md$/i,"");
function checkBase(u){let x;try{x=new URL(String(u));}catch(e){throw new Error("--base-url is not an address: "+u);}
  if(x.protocol!=="https:"&&x.protocol!=="http:") throw new Error("--base-url must be an http or https address: "+u);
  if(x.search||x.hash) throw new Error("--base-url may carry no query and no fragment: "+u);
  return x.href.endsWith("/")?x.href:x.href+"/";}

/* write(result, out, {force}): the files, with the stamp guard; returns the pages kept back */
function write(C,out,o){o=o||{};const kept=[];
  const put=(rel,data)=>{const p=path.join(out,rel);fs.mkdirSync(path.dirname(p),{recursive:true});
    if(fs.existsSync(p)){const was=fs.readFileSync(p);if(Buffer.isBuffer(data)?was.equals(data):was.toString("utf8")===data) return;}
    fs.writeFileSync(p,data);};
  for(const r of C.results){
    const pages=[...r.files.keys()].filter(k=>k.endsWith("/index.html"));
    const held=[];
    for(const rel of pages){const p=path.join(out,rel);
      if(!fs.existsSync(p)||o.force) continue;
      const s=stampState(fs.readFileSync(p,"utf8"));if(s!=="compiled") held.push({rel,state:s});}
    if(held.length){kept.push(...held.map(h=>({...h,source:r.rep.source})));r.rep.held=held;continue;}
    for(const [rel,data] of r.files) put(rel,data);}
  for(const [rel,data] of C.assets) put(rel,data);
  return kept;}

/* ======================= THE REPORT =======================
   What was drawn, what was left off and where (each is also an HTML comment on the page, at its place), which images were
   copied or refused, what the renderer reported, and that the records were not read. It names the source file by its name,
   never its path. The list of what was left off is the tidy-up list. */
const plural=(n,one,many)=>n+" "+(n===1?one:many);
function reportText(C){const L=[];
  L.push("compile "+VERSION+" (renderer "+C.renderer+", format "+C.format+"), form: "+C.form);
  for(const {rep} of C.results){
    L.push("","\u2022 "+rep.source+(rep.ok?" \u2192 "+rep.pages.join(", "):""));
    if(!rep.ok){L.push("  REFUSED, nothing written:");rep.refused.forEach(x=>L.push("    - "+x));continue;}
    if(rep.held) {L.push("  KEPT BACK, nothing written for it:");rep.held.forEach(h=>L.push("    - "+h.rel+": "+(h.state==="changed"?"changed by hand since it was compiled":"not written by the compiler")+" (--force overwrites it)"));}
    const c=rep.counts;
    L.push("  Drawn: "+[plural(c.modules,"module","modules"),plural(c.activities,"activity","activities"),plural(c.questions,"question","questions"),
      plural(c.widgets,"widget","widgets"),plural(c.callouts,"callout","callouts"),plural(c.folds,"fold","folds"),plural(c.notes,"note","notes"),
      plural(c.math,"formula","formulas"),plural(c.images,"image","images"),plural(c.links,"in-page link","in-page links")].join(", ")+".");
    L.push("  Description: "+(rep.description?"“"+rep.description+"”":"none (the page has no first paragraph)"));
    L.push("  On this page: "+(rep.toc?"listed":"not listed (fewer than two top headings)"));
    if(rep.marker) L.push("  Marker: "+rep.marker);
    const copied=rep.images.filter(i=>i.ok),refused=rep.images.filter(i=>!i.ok);
    if(copied.length) L.push("  Images copied beside the page: "+copied.map(i=>i.src).join(", "));
    if(rep.links.length) L.push("  Links to booklets compiled with it: "+[...new Set(rep.links.map(l=>l.to))].join(", "));
    if(rep.marked.length||refused.length){L.push("  To tidy (each is an HTML comment on the page, where it stood):");
      rep.marked.forEach(m=>L.push("    [ ] "+m.what+", in "+m.where+": "+D.MARKED[m.kind]));
      refused.forEach(i=>L.push("    [ ] the image "+JSON.stringify(i.src)+", in "+i.where+", was not copied (its words and address are shown): "+i.why));}
    else L.push("  To tidy: nothing was left off.");
    if(rep.problems.length){L.push("  The renderer reported:");rep.problems.forEach(p=>L.push("    - "+p));}
    /* the records region is never read, so the report cannot say whether there is one: it says what that means instead */
    L.push("  Records: never read. Whatever answers or entries the file keeps are not on the page; the source file itself is not for a public site if it keeps any.");}
  return L.join("\n")+"\n";}

/* ======================= THE COMMAND ======================= */
function main(argv){
  const o={form:"standalone",out:"compiled",files:[]};
  for(let i=0;i<argv.length;i++){const a=argv[i],val=()=>{if(i+1>=argv.length) throw usage(a+" needs a value");return argv[++i];};
    if(a==="--out") o.out=val();else if(a==="--form") o.form=val();else if(a==="--base-url") o.baseUrl=val();
    else if(a==="--report") o.report=val();else if(a==="--renderer") o.renderer=val();else if(a==="--force") o.force=true;
    else if(a==="--version"){const X=E.load(o.renderer);console.log("compile "+VERSION+" (renderer "+X.R.RENDERER_VERSION+", format "+X.R.FORMAT_VERSION+")");return 0;}
    else if(a==="-h"||a==="--help"){console.log(fs.readFileSync(__filename,"utf8").split("\n").filter(l=>l.startsWith("//")).map(l=>l.slice(3)).join("\n"));return 0;}
    else if(a.startsWith("-")) throw usage("unknown option "+a);
    else o.files.push(a);}
  if(!o.files.length) throw usage("name at least one .booklet.md file");
  if(o.report&&/\.md$/i.test(o.report)) throw usage("--report names a .md file: the compiler never writes one");
  for(const f of o.files) if(!/\.md$/i.test(f)) throw usage("not a booklet file (.booklet.md): "+f);
  let C;
  try{C=compile(o.files.map(file=>({file})),{form:o.form,baseUrl:o.baseUrl,renderer:o.renderer});}
  catch(e){if(/^--/.test(e.message)) throw usage(e.message);throw e;}
  const kept=write(C,o.out,{force:o.force});
  const text=reportText(C);
  process.stdout.write(text);
  if(o.report){fs.mkdirSync(path.dirname(path.resolve(o.report)),{recursive:true});fs.writeFileSync(o.report,text);}
  return C.results.some(r=>!r.rep.ok)||kept.length?1:0;}
function usage(msg){const e=new Error(msg);e.usage=true;return e;}

if(require.main===module){
  let code=0;
  try{code=main(process.argv.slice(2));}
  catch(e){console.error("compile: "+e.message+(e.usage?"\n(node compile/compile.js --help)":""));code=e.usage?2:1;}
  process.exitCode=code;}

module.exports={VERSION,compile,compileOne,write,reportText,stamp,stampState,svgProblem,noTemplates,yamlString,scriptJson,main};
