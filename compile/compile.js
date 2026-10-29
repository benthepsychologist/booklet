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
//     --force             overwrite a page or a stylesheet that was changed by hand since it was compiled, or one the
//                         compiler did not write
//     --renderer <file>   the booklet.html to read the format with (default: the one beside compile/). Name only a file
//                         you trust as much as this compiler: its script runs with the compiler's own rights (it is
//                         evaluated in a Node vm context, which keeps names apart and is not a security boundary)
//     --version           print the compiler's version and the renderer's
// Each file is compiled on its own; its address is its name before .booklet.md (two files whose names differ only in
// case are one address). A booklet that shows two or more activities is many pages: a contents page at <name>/ and a page
// for each activity at <name>/<id>/ (draw.js, planPages); booklets of one run with one front matter id and each its own
// language are linked to each other with hreflang.
// Exit 0 when every file was compiled and written, 1 when one was refused or failed or a page or stylesheet was kept back
// by the stamp guard, 2 for a mistake in the command.
//
// The stamp guard: a page and the stylesheet carry a stamp, and one changed by hand since it was compiled is kept back
// (not overwritten, page by page: the booklet's other pages are still written) unless --force is given. The fonts, their licence and the images copied beside a page carry none:
// they are always written again from their sources (booklet.html, and the images beside the booklet), so change an
// image at its source and the look with --bk-* variables in the site's own stylesheet.
//
// What it reads and what it never reads:
//   - the format only through booklet.html's own parse and Markdown engine (engine.js), so a file the renderer refuses is
//     refused here, and the problems it reports are in the report;
//   - the booklet's design only: its records (answers, kept entries, drafts) are never read, so none can reach a page or
//     the report; a file in which they would be read as design (a code fence that never closes, a records line or a
//     record block in the design's text) is refused;
//   - its author comments (Obsidian's hidden %% comments) are left off the page; the report names their lines only;
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
   opening the file directly would run whatever it holds. So the compiler copies only an SVG it can read whole as a plain
   picture, and refuses every other (never cleaned: nothing is rewritten, so there is no cleaned markup for a browser to
   read differently). Two layers, and a file must pass both (the second runs first, as it names what it finds best):
   - the markup is read tag by tag, and every element must be one of SVG_ELEMENTS, the elements that draw a picture, under
     no namespace prefix (an XML prefix can name the SVG or XHTML namespace, so <s:script> is a script); the only
     namespaces are SVG's (xmlns) and xlink's (xmlns:xlink), each with its own address; the only prefixed attributes are
     xlink:href, xml:space and xml:lang; every href and src points inside the file (#id); no attribute is an event
     handler; an animation may not change a link or a handler; and anything the reading cannot place (a processing
     instruction past the XML declaration, a DOCTYPE with an internal subset, an unquoted value, a stray <) is refused.
   - the whole text, comments included, is then searched for what could load or run something: a script or
     foreignObject, an address with a scheme that runs or embeds (javascript:, vbscript:, data:, file:), a CSS url()
     that leads outside the file, image-set(), @import, expression(), and any backslash (CSS can spell a word with one).
   Numeric character references are decoded first, so an entity cannot hide a word, and any other entity is refused.
   An editor's own data and metadata are in other namespaces (sodipodi:, inkscape:, dc:, Adobe's x:), so such a file is
   refused until it is saved without them. */
const SVG_NS="http://www.w3.org/2000/svg",XLINK_NS="http://www.w3.org/1999/xlink";
const SVG_ELEMENTS=new Set(["svg","g","defs","desc","title","metadata","symbol","use","switch","view","style",
  "path","rect","circle","ellipse","line","polyline","polygon","text","tspan","textPath",
  "marker","pattern","clipPath","mask","linearGradient","radialGradient","stop",
  "filter","feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting",
  "feDisplacementMap","feDistantLight","feDropShadow","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur",
  "feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence",
  "animate","animateMotion","animateTransform","set","mpath"]);
const SVG_PREFIXED_OK=new Set(["xlink:href","xml:space","xml:lang"]);
function svgProblem(bytes){
  const raw=Buffer.from(bytes).toString("utf8");
  if(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(raw)) return "an entity other than the XML five";
  const decode=v=>v.replace(/&#x([0-9a-fA-F]+);/g,(m,h)=>safeChar(parseInt(h,16))).replace(/&#(\d+);/g,(m,d)=>safeChar(parseInt(d,10)));
  const t=decode(raw);
  const low=t.toLowerCase(),squeezed=low.replace(/[\u0000-\u0020\u007f-\u00a0]+/g,"");
  if(/<!doctype[^>]*\[/.test(low)||low.includes("<!entity")) return "a DOCTYPE with entities";
  if(low.includes("<?xml-stylesheet")) return "an outside stylesheet";
  if(/<script\b/.test(low)) return "a script";
  if(/<foreignobject\b/.test(low)) return "<foreignObject>";
  for(const tag of ["iframe","embed","object","handler","listener","base","link","meta"]) if(new RegExp("<"+tag+"\\b").test(low)) return "<"+tag+">";
  if(/[\s"'/]on[a-z]+\s*=/.test(low)) return "an event attribute";
  if(/(?:javascript|vbscript|data|file):/.test(squeezed)) return "a javascript:, vbscript:, data: or file: address";
  if(low.includes("@import")||/expression\s*\(/.test(low)) return "an outside stylesheet";
  if(t.includes("\\")) return "a backslash (CSS can spell a word with one)";
  if(/image-set\s*\(/.test(low)) return "an image-set() (it loads images by address)";
  for(const m of low.matchAll(/(?:^|[\s"'/])(?:xlink:)?(?:href|src)\s*=\s*(["'])([\s\S]*?)\1/g)) if(!m[2].trim().startsWith("#")) return "an outside reference ("+clipWords(m[2])+")";
  if(/(?:^|[\s"'/])(?:xlink:)?(?:href|src)\s*=\s*[^\s"']/.test(low)) return "an unquoted reference";
  for(const m of low.matchAll(/url\(\s*(["']?)\s*([^)"']*)/g)) if(!m[2].startsWith("#")) return "an outside reference (url("+clipWords(m[2])+"))";
  if(/<(?:set|animate)\b[^>]*attributename\s*=\s*["']\s*(?:xlink:)?href/.test(low)) return "an animation that changes a link";
  return svgMarkup(raw,decode);}
/* the tag-by-tag reading: null when every piece of markup is one the compiler knows to be inert, else what it found */
function svgMarkup(raw,decode){
  const text=raw.replace(/^\uFEFF/,"");
  const TAG=/<(\/?)([^\s\/>!?=<"']+)((?:\s+[^\s=\/>"'<]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
  const ATTR=/([^\s=\/>"'<]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let i=0,first=true;
  while(i<text.length){const lt=text.indexOf("<",i);if(lt<0) break;i=lt;
    const at=(re)=>{re.lastIndex=i;const m=re.exec(text);return m&&m.index===i?m:null;};
    let m;
    if(text.startsWith("<!--",i)){const e=text.indexOf("-->",i+4);if(e<0) return "a comment that never closes";i=e+3;first=false;continue;}
    if(text.startsWith("<![CDATA[",i)){const e=text.indexOf("]]>",i+9);if(e<0) return "a CDATA section that never closes";i=e+3;first=false;continue;}
    if(text.startsWith("<?",i)){
      if(first&&/^\s*$/.test(text.slice(0,i))&&(m=at(/<\?xml\s[^<>?]*\?>/y))){i+=m[0].length;first=false;continue;}
      return "a processing instruction";}
    if(/^<!doctype/i.test(text.slice(i,i+9))){if((m=at(/<!DOCTYPE[^<>\[\]]*>/y))){i+=m[0].length;first=false;continue;}return "a DOCTYPE with entities";}
    if(!(m=at(TAG))) return "markup the compiler cannot read (at character "+i+")";
    first=false;i+=m[0].length;
    const name=m[2];
    if(name.includes(":")) return "a prefixed element (<"+clipWords(name)+">: a prefix can name another namespace)";
    if(!SVG_ELEMENTS.has(name)) return "an element that does not draw a picture (<"+clipWords(name)+">)";
    if(m[1]) continue;
    for(const a of m[3].matchAll(ATTR)){const an=a[1],v=decode(a[2]!=null?a[2]:a[3]),vt=v.trim(),vl=vt.toLowerCase();
      if(v.includes("<")) return "markup the compiler cannot read (a < inside a value)";
      if(an==="xmlns"){if(vt!==SVG_NS) return "a namespace other than SVG's ("+clipWords(vt)+")";continue;}
      if(an.startsWith("xmlns:")){if(an!=="xmlns:xlink"||vt!==XLINK_NS) return "a namespace other than SVG's and xlink's ("+clipWords(an)+")";continue;}
      if(an.includes(":")&&!SVG_PREFIXED_OK.has(an)) return "a prefixed attribute ("+clipWords(an)+")";
      if(/^on/i.test(an)) return "an event attribute";
      if(/^(?:xlink:)?(?:href|src)$/i.test(an)&&!vt.startsWith("#")) return "an outside reference ("+clipWords(vt)+")";
      if(/^attributename$/i.test(an)&&(vl.includes("href")||vl.startsWith("on")||vl.includes(":"))) return "an animation that changes a link or a handler";}}
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

/* page.folder: the activity's folder on a booklet of many pages ("" on the booklet's own page); page.alternates: the same page
   in the booklet's translations, [{lang, href}] (itself among them) */
function headTags(page,o){
  const tags=[],meta=(k,v,attr)=>{if(v) tags.push('<meta '+(attr||"name")+'="'+k+'" content="'+esc(v)+'">');};
  const deep=!!page.folder,title=deep&&page.bookTitle&&page.bookTitle!==page.title?page.title+" \u2013 "+page.bookTitle:page.title;
  tags.push('<meta charset="utf-8">','<meta name="viewport" content="width=device-width, initial-scale=1">','<title>'+H.escText(title)+'</title>');
  meta("description",page.description);
  const book=o.baseUrl?o.baseUrl+o.name+"/":"",url=book?book+(deep?page.folder+"/":""):"";
  if(url) tags.push('<link rel="canonical" href="'+esc(url)+'">');
  for(const a of page.alternates||[]) tags.push('<link rel="alternate" hreflang="'+esc(a.lang)+'" href="'+esc(a.href)+'">');
  meta("og:type","article","property");meta("og:title",title,"property");meta("og:description",page.description,"property");
  if(page.lang) meta("og:locale",page.lang.replace(/-/g,"_"),"property");
  if(url) meta("og:url",url,"property");
  meta("generator","Booklet compile "+VERSION);
  tags.push('<link rel="stylesheet" href="'+(deep?"../../":"../")+'booklet/booklet.css">');
  const ld={"@context":"https://schema.org","@type":"Article",headline:page.title};
  if(deep) ld.isPartOf={"@type":"CreativeWork",name:page.bookTitle,...(book?{url:book}:{})};
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
/* A value a layout prints from the front matter: a layout may print it unescaped (Jekyll's {{ page.title }}, Eleventy's
   Liquid), so it holds no character that could open a tag: < and > are written as the look-alike quotation marks
   \u2039 and \u203A. A layout must still escape it where it prints it inside an attribute (Hugo does so on its own). */
const noMarkup=s=>String(s).replace(/</g,"\u2039").replace(/>/g,"\u203A");
/* the keys after the description: `weight`, the page's place in the booklet's reading order (many pages only), and
   `alternates`, the same page in the booklet's translations, each a language and an address */
function sitePage(page){
  return "---\ntitle: "+yamlString(noMarkup(page.title))+"\n"+(page.description?"description: "+yamlString(noMarkup(page.description))+"\n":"")
    +(page.weight?"weight: "+page.weight+"\n":"")
    +(page.alternates&&page.alternates.length?"alternates:\n"+page.alternates.map(a=>"  - hreflang: "+yamlString(a.lang)+"\n    href: "+yamlString(a.href)+"\n").join(""):"")+"---\n"
    +noTemplates(H.html(page.article,0));}

/* ======================= THE STAMP =======================
   Each page carries one comment line naming the compiler's version, the source file's name and the sha256 of the page as
   written without that line, and the stylesheet carries the same as a CSS comment on its first line. On the next run, a
   file whose text no longer matches its stamp was changed by hand, and one with no stamp was not written by the
   compiler: neither is overwritten unless --force is given. The fonts, their licence and the copied images carry no
   stamp: they are always written again from their sources. */
const STAMP=/^<!-- booklet compile (\S+) \u00b7 from (.*) \u00b7 sha256:([0-9a-f]{64}) -->\n/m;
const CSS_STAMP=/^\/\* booklet compile (\S+) \u00b7 booklet\.css \u00b7 sha256:([0-9a-f]{64}) \*\/\n/;
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
const cssStamp=css=>"/* booklet compile "+VERSION+" \u00b7 booklet.css \u00b7 sha256:"+sha256(css)+" */\n"+css;
function cssStampState(text){const m=CSS_STAMP.exec(text);if(!m) return "foreign";
  return sha256(text.slice(m[0].length))===m[2]?"compiled":"changed";}

/* ======================= ONE BOOKLET ======================= */
/* compileOne(X, {file|text, name, dir}, o): what one booklet makes, as files relative to the output folder, and its report.
   o.parsed: the parse, when compile() has already made it; o.siblings: the other booklets of the run, by address, with
   their titles (a link to one is drawn as a link to its page); o.alt: its translations in the run ({pages: Map of a
   page's key to the same page in each translation, [{lang, name, folder}], with: their names}, or none).
   A booklet that shows two or more activities is many pages (draw.js, planPages): the contents page at <name>/index.html
   and each activity's at <name>/<folder>/index.html; rep.pageList names them in reading order. */
function compileOne(X,input,o){
  const source=path.basename(input.file||input.name+".booklet.md");
  const name=input.name;
  const rep={source,name,form:o.form,ok:false,refused:[],problems:[],marker:"",pages:[],comments:[],
    counts:null,marked:[],images:[],links:[],description:"",toc:false,pageList:[],translations:[]};
  if(!NAME.test(name)||name==="booklet"){rep.refused.push("its address, “"+name+"”, must be letters, digits, . _ or - (and not “booklet”, the stylesheet's folder): rename the file");return {rep,files:new Map()};}
  const P=o.parsed||parseInput(X,input);
  rep.problems=P.problems;rep.marker=P.marker;rep.comments=P.comments||[];
  if(!P.ok||!P.design){rep.refused=P.refused.length?P.refused:P.problems.length?P.problems:["the renderer could not read it"];return {rep,files:new Map()};}
  const keep=new Map(),files=new Map(),plan=D.planPages(X,P,name),many=plan.paged;
  const forms=o.form==="both"?["standalone","site"]:[o.form];
  const mods=P.design.modules||[],withNotice=mods.filter(m=>m.notice&&typeof m.notice==="object");
  const nt=(withNotice[0]||{}).notice||{};
  let first=null;
  for(const form of forms){
    const xr={pages:new Map(),later:[]},image=imageReader(input.dir||".",X,keep);
    const drawn=plan.pages.map(unit=>D.drawPage(X,P,{name,form,siblings:o.siblings,image,...(many?{unit,plan,xr}:{})}));
    if(many) D.settleLinks(xr,plan);
    const root=o.form==="both"?form+"/":"";
    drawn.forEach((page,i)=>{const unit=plan.pages[i],at=unit.folder?unit.folder+"/":"";
      page.copyright=typeof nt.copyright==="string"?nt.copyright.trim():"";page.license=typeof nt.license==="string"?nt.license.trim():"";
      page.folder=unit.folder;if(many) page.weight=i+1;
      /* the same page in each translation, written as this page reaches it (or as a visitor from anywhere does, with --base-url) */
      const up=unit.folder?"../../":"../";
      page.alternates=((o.alt&&o.alt.pages.get(unit.key))||[]).map(x=>({lang:x.lang,href:(o.baseUrl||up)+x.name+"/"+(x.folder?x.folder+"/":"")}));
      const body=form==="standalone"?standalone(page,{name,baseUrl:o.baseUrl}):sitePage(page);
      files.set(root+name+"/"+at+"index.html",stamp(body,source,form));
      rep.pages.push(root+name+"/"+at+"index.html");
      if(form===forms[0]) rep.pageList.push({path:name+"/"+at+"index.html",title:page.title,kind:unit.kind});});
    for(const [rel,bytes] of keep) files.set(root+name+"/"+rel,bytes);
    if(!first) first=drawn;}
  const sum=()=>Object.fromEntries(Object.keys(first[0].counts).map(c=>[c,first.reduce((n,p)=>n+p.counts[c],0)]));
  Object.assign(rep,{ok:true,counts:sum(),marked:first.flatMap(p=>p.marked),images:dedupe(first.flatMap(p=>p.images)),links:first.flatMap(p=>p.links),
    description:first[0].description,toc:first.some(p=>p.toc),translations:o.alt?o.alt.with:[]});
  return {rep,files};}
const parseInput=(X,input)=>X.parse(input.text!=null?input.text:fs.readFileSync(input.file,"utf8"));
/* a page's title, as drawPage takes it: the booklet's title, else its first module's, else its address */
const titleOf=(X,P,name)=>{const d=P.design,t=v=>X.R.plainText(X.R.tx(v,""));return t(d.title)||t((d.modules[0]||{}).title)||name;};
const dedupe=list=>{const seen=new Set();return list.filter(x=>{const k=x.src+"\u0000"+x.ok+"\u0000"+(x.where||"");if(seen.has(k)) return false;seen.add(k);return true;});};

/* the stylesheet and its fonts, for each form's booklet/ folder */
function assets(X,form){const F=X.fonts(),out=new Map(),roots=form==="both"?["standalone/","site/"]:[""];
  const css=cssStamp(fs.readFileSync(STYLESHEET,"utf8"));
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
  /* two addresses that differ only in case are the same folder on a case-insensitive disk, so they clash too */
  const seen=new Map(),siblings=new Map(),parsed=new Map(),failed=new Map(),meta=new Map();
  for(const i of list){const key=i.name.toLowerCase();
    if(seen.has(key)){i.dup=seen.get(key);continue;}seen.set(key,i.name);
    if(!NAME.test(i.name)||i.name==="booklet") continue;
    let P;try{P=parseInput(X,i);}catch(e){failed.set(i,e);continue;}
    parsed.set(i,P);
    if(P.ok&&P.design){siblings.set(i.name,titleOf(X,P,i.name));
      try{meta.set(i.name,{id:P.id,lang:P.lang,plan:D.planPages(X,P,i.name)});}catch(e){/* compileOne meets it too, and says so */}}}
  const alts=translations(meta);
  const results=[];
  for(const i of list){
    if(i.dup){results.push(refusedResult(i,"another file in this run has the same address, “"+i.dup+"”"+(i.dup===i.name?"":" (addresses that differ only in case clash)")));continue;}
    if(failed.has(i)){results.push(refusedResult(i,failure(failed.get(i))));continue;}
    try{results.push(compileOne(X,i,{form,baseUrl,siblings,parsed:parsed.get(i),alt:alts.get(i.name)}));}
    catch(e){results.push(refusedResult(i,failure(e)));}}
  return {results,assets:assets(X,form),form,renderer:X.R.RENDERER_VERSION,format:X.R.FORMAT_VERSION};}
/* translations(meta): booklets of one run that are translations of each other (SPEC.md section 9): one front matter `id`,
   each its own language. For each: {pages: a page's key -> the same page in every translation that has it (itself among
   them), with: [language (name), …] for the report}. A group in which two booklets share a language is not linked: it is
   two versions, or a mistake, and a search engine is told nothing either way. */
function translations(meta){
  const groups=new Map(),out=new Map();
  for(const [name,m] of meta) if(m.id){if(!groups.has(m.id)) groups.set(m.id,[]);groups.get(m.id).push(name);}
  for(const names of groups.values()){
    if(names.length<2||new Set(names.map(n=>meta.get(n).lang)).size<names.length) continue;
    for(const n of names){const pages=new Map();
      for(const pg of meta.get(n).plan.pages){
        const list=names.map(o=>{const q=meta.get(o).plan.pages.find(x=>x.key===pg.key);return q&&{lang:meta.get(o).lang,name:o,folder:q.folder};}).filter(Boolean);
        if(list.length>1) pages.set(pg.key,list.sort((a,b)=>a.lang<b.lang?-1:a.lang>b.lang?1:0));}
      out.set(n,{pages,with:names.filter(o=>o!==n).map(o=>meta.get(o).lang+" ("+o+")")});}}
  return out;}
const refusedResult=(i,why)=>({rep:{source:path.basename(i.file||i.name),name:i.name,ok:false,refused:[why],problems:[],pages:[],comments:[]},files:new Map()});
/* one file that throws stops only itself. The report names the kind of error and where in the code it was raised, never
   its message: a message can carry a piece of the file's text, and the report may be published. */
function failure(e){
  const kind=e&&typeof e.name==="string"&&/^[A-Za-z]+$/.test(e.name)?e.name:"an error";
  const frames=String(e&&e.stack||"").split("\n").filter(l=>/^\s+at /.test(l));
  const at=frames.map(l=>/([^\s()\/\\]+\.(?:js|html)):(\d+)(?::\d+)?\)?\s*$/.exec(l)).find(Boolean);
  return "the compiler failed on it ("+kind+(at?" in "+at[1]+" at line "+at[2]:"")+"), so nothing was written for it; this is a fault in the compiler, not in the file, and worth reporting with the file";}
const nameOf=f=>path.basename(String(f)).replace(/\.booklet\.md$/i,"").replace(/\.md$/i,"");
function checkBase(u){let x;try{x=new URL(String(u));}catch(e){throw new Error("--base-url is not an address: "+u);}
  if(x.protocol!=="https:"&&x.protocol!=="http:") throw new Error("--base-url must be an http or https address: "+u);
  if(x.search||x.hash) throw new Error("--base-url may carry no query and no fragment: "+u);
  return x.href.endsWith("/")?x.href:x.href+"/";}

/* write(result, out, {force}): the files, with the stamp guard, page by page; returns the pages (and the stylesheet) kept back.
   A page tidied by hand is left as it is and the booklet's other pages are written again, so a many-page booklet keeps the
   one page that was tidied and takes the rest from the source. */
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
    if(held.length){kept.push(...held.map(h=>({...h,source:r.rep.source})));r.rep.held=held;}
    for(const [rel,data] of r.files) if(!held.some(h=>h.rel===rel)) put(rel,data);}
  /* the stylesheet is guarded like a page: a hand-tidied booklet.css is kept back, and the fonts beside it still written */
  C.heldAssets=[];
  for(const [rel,data] of C.assets){const p=path.join(out,rel);
    if(rel.endsWith("/booklet.css")&&fs.existsSync(p)&&!o.force){const s=cssStampState(fs.readFileSync(p,"utf8"));
      if(s!=="compiled"){C.heldAssets.push({rel,state:s});kept.push({rel,state:s,source:"booklet.css"});continue;}}
    put(rel,data);}
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
    if(rep.held) {L.push("  KEPT BACK, not overwritten (the booklet's other pages were written):");rep.held.forEach(h=>L.push("    - "+h.rel+": "+(h.state==="changed"?"changed by hand since it was compiled":"not written by the compiler")+" (--force overwrites it)"));}
    const c=rep.counts;
    L.push("  Drawn: "+[plural(c.modules,"module","modules"),plural(c.activities,"activity","activities"),plural(c.questions,"question","questions"),
      plural(c.widgets,"widget","widgets"),plural(c.callouts,"callout","callouts"),plural(c.folds,"fold","folds"),plural(c.notes,"note","notes"),
      plural(c.math,"formula","formulas"),plural(c.images,"image","images"),plural(c.links,"in-page link","in-page links")].join(", ")+".");
    if(rep.pageList.length>1){L.push("  Pages, in reading order (a site's menu is built from this list, and each page's `weight` is its number here):");
      rep.pageList.forEach((p,i)=>L.push("    "+(i+1)+". "+p.path+(p.kind==="contents"?" (the contents page)":"")+": "+p.title));}
    if(rep.translations.length) L.push("  Translations, linked with hreflang: "+rep.translations.join(", "));
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
    /* author comments are left off the page; the report gives their place only, never their words */
    if(rep.comments&&rep.comments.length) L.push("  Author comments left off the page: "+rep.comments.map(c=>(c.to>c.from?"lines "+c.from+"\u2013"+c.to:"line "+c.from)+(c.open?" (never closed, so it runs to the end of the text)":"")).join(", ")+".");
    /* the records region is never read, so the report cannot say whether there is one: it says what that means instead */
    L.push("  Records: never read. Whatever answers or entries the file keeps are not on the page; the source file itself is not for a public site if it keeps any.");}
  for(const h of C.heldAssets||[]) L.push("","\u2022 "+h.rel+": KEPT BACK, "+(h.state==="changed"?"changed by hand since it was compiled":"not written by the compiler")+" (--force overwrites it). The fonts beside it were written.");
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

module.exports={VERSION,compile,compileOne,write,reportText,stamp,stampState,cssStampState,svgProblem,noTemplates,yamlString,scriptJson,main};
