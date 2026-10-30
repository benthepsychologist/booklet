#!/usr/bin/env node
"use strict";
// compile 0.2.0: a booklet file to a plain web page. It is a build step beside the renderer, never the published booklet.html.
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
//     --no-browser        draw no diagram: each mermaid diagram is shown as its source, with the reason in the report (the same as
//                         PLAYWRIGHT set to nothing). Without it, a diagram is drawn at build time in headless Chromium when
//                         a Playwright package is found: the PLAYWRIGHT variable (a path to the package), else node_modules/playwright
//                         or node_modules/playwright-core beside compile/, else ../.tools/node_modules/playwright-core. Never the folder you
//                         run it from. The package found is run, so name only one you trust. Without one nothing else changes: a diagram is
//                         its source, and a body map's figure and a picture are drawn as before
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
const E=require("./engine.js"),D=require("./draw.js"),H=require("./html.js"),SC=require("./script.js"),Th=require("./theme.js"),G=require("./diagrams.js");

const VERSION="0.2.0";
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
const {SVG_NS,XLINK_NS,TAG,ATTR,clip:clipWords}=G; /* the names and patterns diagrams.js reads SVG with too */
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
  /* a browser drops tab, line feed and carriage return from inside an address, and reads the other C0 controls as nothing a scheme can hold:
     all of them are taken out, so java<tab>script: is javascript: */
  const low=t.toLowerCase(),flat=low.replace(/[\u0000-\u001f\u007f]+/g,"");
  if(/<!doctype[^>]*\[/.test(low)||low.includes("<!entity")) return "a DOCTYPE with entities";
  if(low.includes("<?xml-stylesheet")) return "an outside stylesheet";
  if(/<script\b/.test(low)) return "a script";
  if(/<foreignobject\b/.test(low)) return "<foreignObject>";
  for(const tag of ["iframe","embed","object","handler","listener","base","link","meta"]) if(new RegExp("<"+tag+"\\b").test(low)) return "<"+tag+">";
  if(/[\s"'/]on[a-z]+\s*=/.test(low)) return "an event attribute";
  /* a scheme is a word that begins a value or follows a separator, with something after its colon: "javascript:alert(1)", "1;data:image/png",
     "url(file:x)". The same letters inside a longer word, or followed by a space ("Profile: left", "Metadata: left", "Data: pain"), are text. */
  if(/(?:^|[^a-z0-9+.-])(?:javascript|vbscript|data|file):\S/.test(flat)) return "a javascript:, vbscript:, data: or file: address";
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

/* The orientation in a JPEG's EXIF block (an APP1 segment whose data begins "Exif\0\0"), from `from` (the first byte of the segment's data) to
   `to`: null when the segment is not an Exif block (the first Exif block is the only one a browser reads, so a later one is left alone), else 1 when
   the picture is drawn turned a quarter (orientation 5, 6, 7 or 8) and 0 when it is not. A block that does not read as TIFF, or whose orientation
   is not there, says 0 and the size is left as the frame header gives it. An entry must lie whole inside the block, as a browser requires. */
function exifTurn(b,from,to){
  if(to-from<6||b.toString("latin1",from,from+6)!=="Exif\0\0") return null;
  if(to-from<14) return 0;
  const t=from+6,le=b.toString("latin1",t,t+2)==="II";
  if(!le&&b.toString("latin1",t,t+2)!=="MM") return 0;
  const u16=i=>le?b[i]|b[i+1]<<8:b[i]<<8|b[i+1],u32=i=>le?(b[i]|b[i+1]<<8|b[i+2]<<16)+b[i+3]*16777216:b[i]*16777216+(b[i+1]<<16|b[i+2]<<8|b[i+3]);
  if(u16(t+2)!==42) return 0;
  const ifd=t+u32(t+4);
  if(!(ifd>=t+8)||ifd+2>to) return 0;
  const n=u16(ifd);
  for(let k=0;k<n;k++){const e=ifd+2+k*12;
    if(e+12>to) return 0;
    if(u16(e)===0x0112){const type=u16(e+2),count=u32(e+4),v=u16(e+8);
      return type===3&&count===1&&v>=5&&v<=8?1:0;}}
  return 0;}

/* The size an image file says it has, so the page can keep room for it before it loads: {width, height} in whole pixels, or null
   when the bytes do not say (a truncated file, a format variant not read here), and the image is then drawn with no size, as it
   was. PNG: the header chunk. GIF: the logical screen. JPEG: the first frame header (turned when its EXIF orientation is 5 to 8, as a browser draws it). WebP: the
   lossy, lossless or extended header. SVG: its width and height when both are plain numbers (or px), else its viewBox; a picture
   whose viewBox is small is written at a whole power of ten times it, enough to reach 100 wide, since a viewBox has no pixels. */
function imageSize(ext,b){
  const u16=(i,le)=>le?b[i]|b[i+1]<<8:b[i]<<8|b[i+1],u32=i=>(b[i]*16777216)+(b[i+1]<<16|b[i+2]<<8|b[i+3]);
  let w=0,h=0;
  if(ext==="png"){if(b.length>=24&&b.toString("latin1",12,16)==="IHDR"){w=u32(16);h=u32(20);}}
  else if(ext==="gif"){if(b.length>=10){w=u16(6,true);h=u16(8,true);}}
  else if(ext==="webp"){const kind=b.length>=16?b.toString("latin1",12,16):"";
    if(kind==="VP8 "&&b.length>=30&&b[23]===0x9d&&b[24]===0x01&&b[25]===0x2a){w=u16(26,true)&0x3fff;h=u16(28,true)&0x3fff;}
    else if(kind==="VP8L"&&b.length>=25&&b[20]===0x2f){const bits=(b[21]|b[22]<<8|b[23]<<16|b[24]*16777216)>>>0;w=(bits&0x3fff)+1;h=((bits>>>14)&0x3fff)+1;}
    else if(kind==="VP8X"&&b.length>=30){w=1+(b[24]|b[25]<<8|b[26]<<16);h=1+(b[27]|b[28]<<8|b[29]<<16);}}
  else if(ext==="svg"){
    /* a comment before the root (an editor's, with the word <svg> in it) is not the root; an unclosed one runs to the end, as in a browser */
    const tag=/<svg\b[^>]*>/i.exec(b.toString("utf8").replace(/<!--[\s\S]*?(?:-->|$)/g,""));
    if(tag){const num=n=>{const m=new RegExp("\\s"+n+"\\s*=\\s*[\"']\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(?:px)?\\s*[\"']","i").exec(tag[0]);return m?Number(m[1]):0;};
      const vb=/\sviewBox\s*=\s*["']\s*([^"']*)["']/i.exec(tag[0]),v=vb?vb[1].trim().split(/[\s,]+/).map(Number):[];
      if(num("width")>0&&num("height")>0){w=num("width");h=num("height");}
      else if(v.length===4&&v.every(Number.isFinite)&&v[2]>0&&v[3]>0){let k=1;while(v[2]*k<100&&k<1e6) k*=10;w=v[2]*k;h=v[3]*k;}}}
  else{ /* jpeg */
    let i=2,turns=0,exifSeen=false;
    while(i+9<b.length){
      if(b[i]!==0xff){i++;continue;}
      const m=b[i+1];
      if(m===0xff){i++;continue;}
      if(m===0xd8||m===0x01||(m>=0xd0&&m<=0xd7)){i+=2;continue;}
      if(m>=0xc0&&m<=0xcf&&m!==0xc4&&m!==0xc8&&m!==0xcc){h=u16(i+5);w=u16(i+7);break;}
      if(m===0xe1&&!exifSeen){const t=exifTurn(b,i+4,Math.min(b.length,i+2+u16(i+2)));if(t!==null){exifSeen=true;turns=t;}}
      i+=2+u16(i+2);}
    /* a phone holds its camera sideways and says so in the EXIF block (orientation 5 to 8): a browser draws the picture turned, so the width and height swap */
    if(turns===1){const t=w;w=h;h=t;}}
  w=Math.round(w);h=Math.round(h);
  return w>=1&&h>=1&&w<=100000&&h<=100000?{width:w,height:h}:null;}

/* the image check for one booklet: (rel, ext) -> {ok, width, height} | {ok:false, why, detail}; what passes is kept to be copied */
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
    return {ok:true,...(imageSize(ext,bytes)||{})};};}

/* ======================= FIGURES AND DIAGRAMS =======================
   A body map's figure is written into the page by diagrams.js's figure(), behind the rules of svgProblem above and the renderer's
   own sanitizer rule. A diagram is drawn at build time by the renderer's mermaid part in headless Chromium (diagrams.js and
   diagrams-run.js), in one browser run for all the diagrams a booklet needs (a source drawn for one booklet is not drawn again for another), and the SVG that comes back is passed through the same SVG rules before
   it is written. `o.browser` is a path to a Playwright package, false for none, or undefined to look for one (diagrams.js
   findPlaywright); `o.browserTimeout` and `o.diagramTimeout` (milliseconds; 240000 for the browser run, 60000 for one diagram) cut a slow
   drawing short, and the diagram is then shown as its source; `o.drawer(codes)`, for tests, stands in for the browser and answers a Map of each code to {svg} or {why}. */
function makeDiagrams(X,o){
  const colours=G.paperColours(fs.readFileSync(STYLESHEET,"utf8"));
  return {cache:new Map(),need:new Set(),colours,
    /* the diagrams asked for and not yet known are drawn now: screened by the renderer's own rule first, then handed over together */
    run(){
      const codes=[...this.need].filter(c=>!this.cache.has(c));this.need.clear();
      const send=[];
      for(const c of codes){const risk=X.R.diagramRisk(c);
        if(risk) this.cache.set(c,{why:"the renderer does not hand this source to its diagram library, since it could make a request ("+risk+")"});
        else send.push(c);}
      if(!send.length) return;
      const got=o.drawer?o.drawer(send):G.drawBatch(X,send,{playwright:o.browser,timeout:o.browserTimeout,diagramTimeout:o.diagramTimeout});
      for(const c of send) this.cache.set(c,(got&&got.get(c))||{why:"the diagram library could not draw it"});},
    /* what drawPage is given for a diagram: its markup, or why it is shown as its source. A diagram not drawn yet is noted, and the page is drawn again. */
    draw(code,prefix,word){
      const hit=this.cache.get(code);
      if(!hit){this.need.add(code);return {ok:false,why:"not drawn yet"};}
      if(hit.why) return {ok:false,why:hit.why};
      return G.diagram(hit.svg,{svgProblem,prefix,paper:this.colours.paper,word});}};}

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
  if(o.script) tags.push('<script src="'+(deep?"../../":"../")+'booklet/booklet.js" defer></script>');
  const ld={"@context":"https://schema.org","@type":"Article",headline:page.title};
  if(deep) ld.isPartOf={"@type":"CreativeWork",name:page.bookTitle,...(book?{url:book}:{})};
  if(page.description) ld.description=page.description;
  if(page.lang) ld.inLanguage=page.lang;
  if(url) ld.url=url;
  if(page.copyright) ld.copyrightNotice=page.copyright;
  if(page.license&&/^https?:\/\/\S+$/i.test(page.license)) ld.license=page.license;
  tags.push('<script type="application/ld+json">'+scriptJson(ld)+'</script>');
  return tags;}
/* a booklet's own look (draw.js's theme): the base theme and variables are on the article, and on a standalone page's body too,
   so the paper under the article is the booklet's. Both come from theme.js, which writes nothing a booklet said as text. */
const bodyOpen=page=>H.openTag(H.el("body",{class:"bk-page",...(page.bodyAttrs||{})}));
function standalone(page,o){
  return "<!doctype html>\n"+'<html'+(page.lang?' lang="'+esc(page.lang)+'"':"")+'>\n<head>\n'+headTags(page,o).join("\n")+"\n</head>\n"
    +bodyOpen(page)+'\n<main class="bk-main">\n'+H.html(page.article,0)+"</main>\n</body>\n</html>\n";}
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
const CSS_STAMP=/^\/\* booklet compile (\S+) \u00b7 booklet\.(?:css|js) \u00b7 sha256:([0-9a-f]{64}) \*\/\n/;
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
const cssStamp=(css,file)=>"/* booklet compile "+VERSION+" \u00b7 "+(file||"booklet.css")+" \u00b7 sha256:"+sha256(css)+" */\n"+css;
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
    counts:null,marked:[],images:[],links:[],description:"",toc:false,pageList:[],translations:[],script:false,needsScript:false,keyed:false,readOnly:[]};
  if(!NAME.test(name)||name==="booklet"){rep.refused.push("its address, “"+name+"”, must be letters, digits, . _ or - (and not “booklet”, the stylesheet's folder): rename the file");return {rep,files:new Map()};}
  const P=o.parsed||parseInput(X,input);
  rep.problems=P.problems;rep.marker=P.marker;rep.comments=P.comments||[];
  if(!P.ok||!P.design){rep.refused=P.refused.length?P.refused:P.problems.length?P.problems:["the renderer could not read it"];return {rep,files:new Map()};}
  const keep=new Map(),files=new Map(),plan=D.planPages(X,P,name),many=plan.paged;
  const forms=o.form==="both"?["standalone","site"]:[o.form];
  const mods=P.design.modules||[],withNotice=mods.filter(m=>m.notice&&typeof m.notice==="object");
  const nt=(withNotice[0]||{}).notice||{};
  let first=null;
  const dg=o.diagrams||makeDiagrams(X,{});
  for(const form of forms){
    const image=imageReader(input.dir||".",X,keep);
    /* every page of the booklet in this form; a diagram the run has not drawn yet is noted, and the pages are drawn again once the browser has drawn it */
    const drawAll=()=>{const xr={pages:new Map(),later:[]};
      const out=plan.pages.map(unit=>D.drawPage(X,P,{name,form,siblings:o.siblings,image,forceScript:!!o.forceScript,
        figure:(text,prefix,labelOf)=>G.figure(text,{R:X.R,svgProblem,prefix,labelOf}),
        diagram:(code,prefix,word)=>dg.draw(code,prefix,word),...(many?{unit,plan,xr}:{})}));
      if(many) D.settleLinks(xr,plan);
      return out;};
    let drawn=drawAll();
    if(dg.need.size){dg.run();drawn=drawAll();}
    const root=o.form==="both"?form+"/":"";
    drawn.forEach((page,i)=>{const unit=plan.pages[i],at=unit.folder?unit.folder+"/":"";
      page.copyright=typeof nt.copyright==="string"?nt.copyright.trim():"";page.license=typeof nt.license==="string"?nt.license.trim():"";
      page.folder=unit.folder;if(many) page.weight=i+1;
      /* the same page in each translation, written as this page reaches it (or as a visitor from anywhere does, with --base-url) */
      const up=unit.folder?"../../":"../";
      page.alternates=((o.alt&&o.alt.pages.get(unit.key))||[]).map(x=>({lang:x.lang,href:(o.baseUrl||up)+x.name+"/"+(x.folder?x.folder+"/":"")}));
      /* the page links booklet.js only when something on it needs it, and only when the compiler has a script to write */
      page.needs=!!(page.needsScript&&o.script);page.script=page.needs&&form==="standalone";
      const body=form==="standalone"?standalone(page,{name,baseUrl:o.baseUrl,script:page.script}):sitePage(page);
      files.set(root+name+"/"+at+"index.html",stamp(body,source,form));
      rep.pages.push(root+name+"/"+at+"index.html");
      if(form===forms[0]) rep.pageList.push({path:name+"/"+at+"index.html",title:page.title,kind:unit.kind,linked:page.alternates.length>0,needs:page.needs});});
    for(const [rel,bytes] of keep) files.set(root+name+"/"+rel,bytes);
    if(!first) first=drawn;}
  const sum=()=>Object.fromEntries(Object.keys(first[0].counts).map(c=>[c,first.reduce((n,p)=>n+p.counts[c],0)]));
  Object.assign(rep,{ok:true,counts:sum(),marked:first.flatMap(p=>p.marked),images:dedupe(first.flatMap(p=>p.images)),links:first.flatMap(p=>p.links),
    theme:first[0].theme,description:first[0].description,toc:first.some(p=>p.toc),translations:o.alt?o.alt.with:[],
    script:first.some(p=>p.script),needsScript:first.some(p=>p.needs),keyed:first.some(p=>p.keyed),readOnly:first.flatMap(p=>p.readOnly)});
  return {rep,files};}
const parseInput=(X,input)=>X.parse(input.text!=null?input.text:fs.readFileSync(input.file,"utf8"));
const dedupe=list=>{const seen=new Set();return list.filter(x=>{const k=x.src+"\u0000"+x.ok+"\u0000"+(x.where||"");if(seen.has(k)) return false;seen.add(k);return true;});};

/* the stylesheet and its fonts, for each form's booklet/ folder */
function assets(X,form,script){const F=X.fonts(),out=new Map(),roots=form==="both"?["standalone/","site/"]:[""];
  const css=cssStamp(fs.readFileSync(STYLESHEET,"utf8"));
  const js=script?cssStamp(script.text,"booklet.js"):null;
  for(const r of roots){out.set(r+"booklet/booklet.css",css);
    if(js) out.set(r+"booklet/booklet.js",js);
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
  /* the optional script, built from compile/script/ (or o.scriptDir) and scanned before anything is drawn: a part that holds a
     banned word fails the whole run, with nothing written */
  const S=SC.assemble(o.scriptDir);
  const list=inputs.map(i=>({...i,name:i.name||nameOf(i.file),dir:i.dir||(i.file?path.dirname(i.file):".")}));
  /* each file is read once, first, so a page knows which of the others it can link to, and by what title */
  /* two addresses that differ only in case are the same folder on a case-insensitive disk, so they clash too */
  const seen=new Map(),siblings=new Map(),parsed=new Map(),failed=new Map(),meta=new Map();
  for(const i of list){const key=i.name.toLowerCase();
    if(seen.has(key)){i.dup=seen.get(key);continue;}seen.set(key,i.name);
    if(!NAME.test(i.name)||i.name==="booklet") continue;
    let P;try{P=parseInput(X,i);}catch(e){failed.set(i,e);continue;}
    parsed.set(i,P);
    if(P.ok&&P.design){siblings.set(i.name,D.titleOf(X,P,i.name));
      try{meta.set(i.name,{id:P.id,lang:P.lang,plan:D.planPages(X,P,i.name)});}catch(e){/* compileOne meets it too, and says so */}}}
  const alts=translations(meta);
  const results=[],diagrams=makeDiagrams(X,o);
  for(const i of list){
    if(i.dup){results.push(refusedResult(i,"another file in this run has the same address, “"+i.dup+"”"+(i.dup===i.name?"":" (addresses that differ only in case clash)")));continue;}
    if(failed.has(i)){results.push(refusedResult(i,failure(failed.get(i))));continue;}
    try{results.push(compileOne(X,i,{form,baseUrl,siblings,diagrams,parsed:parsed.get(i),alt:alts.get(i.name),script:!!S,forceScript:o.forceScript}));}
    catch(e){results.push(refusedResult(i,failure(e)));}}
  /* booklet.js is written when at least one page in the run needs it (a standalone page links it; a site page's layout does) */
  const used=S&&results.some(r=>r.rep.needsScript);
  return {results,assets:assets(X,form,used?S:null),script:used?{parts:S.parts,bytes:Buffer.byteLength(S.text,"utf8")}:null,form,renderer:X.R.RENDERER_VERSION,format:X.R.FORMAT_VERSION};}
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
  /* nothing is written until every target has been looked at: a path whose folder (or the page itself) is already a file, or the
     page's place already a folder, would stop the run half way, with some pages written and the rest and the stylesheet not.
     A booklet with such a path is refused whole, and the others are written; one in the shared assets stops the run before anything. */
  const blockedBy=rel=>{const parts=rel.split("/");let cur=out,at="";
    for(let i=0;i<parts.length;i++){cur=path.join(cur,parts[i]);at+=(i?"/":"")+parts[i];
      let st=null;try{st=fs.statSync(cur);}catch(e){return i<parts.length-1&&e.code==="ENOTDIR"?at:"";}
      if(i<parts.length-1?!st.isDirectory():st.isDirectory()) return at;}
    return "";};
  for(const [rel] of C.assets){const b=blockedBy(rel);
    if(b) throw new Error("cannot write "+rel+": “"+b+"” in the output folder is "+(b===rel?"a folder":"a file, not a folder")+"; nothing was written");}
  for(const r of C.results){if(!r.rep.ok) continue;
    for(const rel of r.files.keys()){const b=blockedBy(rel);
      if(b){r.rep.ok=false;r.rep.refused=["cannot write "+rel+": “"+b+"” in the output folder is "+(b===rel?"a folder":"a file, not a folder")+", so nothing was written for this booklet (move it, or choose another --out)"];break;}}}
  const put=(rel,data)=>{const p=path.join(out,rel);fs.mkdirSync(path.dirname(p),{recursive:true});
    if(fs.existsSync(p)){const was=fs.readFileSync(p);if(Buffer.isBuffer(data)?was.equals(data):was.toString("utf8")===data) return;}
    fs.writeFileSync(p,data);};
  for(const r of C.results){
    if(!r.rep.ok) continue;
    const pages=[...r.files.keys()].filter(k=>k.endsWith("/index.html"));
    const held=[];
    for(const rel of pages){const p=path.join(out,rel);
      if(!fs.existsSync(p)||o.force) continue;
      const s=stampState(fs.readFileSync(p,"utf8"));if(s!=="compiled") held.push({rel,state:s});}
    if(held.length){kept.push(...held.map(h=>({...h,source:r.rep.source})));r.rep.held=held;r.rep.writtenPages=pages.length-held.length;}
    for(const [rel,data] of r.files) if(!held.some(h=>h.rel===rel)) put(rel,data);}
  /* the stylesheet is guarded like a page: a hand-tidied booklet.css is kept back, and the fonts beside it still written */
  C.heldAssets=[];
  for(const [rel,data] of C.assets){const p=path.join(out,rel);
    if(/\/booklet\.(?:css|js)$/.test("/"+rel)&&fs.existsSync(p)&&!o.force){const s=cssStampState(fs.readFileSync(p,"utf8"));
      if(s!=="compiled"){C.heldAssets.push({rel,state:s});kept.push({rel,state:s,source:path.basename(rel)});continue;}}
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
    if(rep.held) {const w=rep.writtenPages;
      L.push("  KEPT BACK, not overwritten ("+(w?plural(w,"other page of the booklet was","other pages of the booklet were")+" written":"no page of the booklet was written")+"):");rep.held.forEach(h=>L.push("    - "+h.rel+": "+(h.state==="changed"?"changed by hand since it was compiled":"not written by the compiler")+" (--force overwrites it)"));}
    const c=rep.counts;
    L.push("  Drawn: "+[plural(c.modules,"module","modules"),plural(c.activities,"activity","activities"),plural(c.questions,"question","questions"),
      plural(c.widgets,"widget","widgets"),plural(c.queries,"query","queries"),plural(c.figures,"figure","figures"),plural(c.diagrams,"diagram","diagrams"),plural(c.callouts,"callout","callouts"),plural(c.folds,"fold","folds"),plural(c.notes,"note","notes"),
      plural(c.math,"formula","formulas"),plural(c.images,"image","images"),plural(c.links,"in-page link","in-page links")].join(", ")+".");
    if(rep.theme) L.push(...Th.words(rep.theme));
    if(rep.pageList.length>1){L.push("  Pages, in reading order (a site's menu is built from this list, and each page's `weight` is its number here):");
      rep.pageList.forEach((p,i)=>L.push("    "+(i+1)+". "+p.path+(p.kind==="contents"?" (the contents page)":"")+": "+p.title));}
    if(rep.translations.length){L.push("  Translations, linked with hreflang: "+rep.translations.join(", "));
      /* a page is paired with the page of the same module and activity id in each translation: say which were, and which were not */
      const lk=rep.pageList.filter(p=>p.linked),no=rep.pageList.filter(p=>!p.linked);
      L.push("    "+lk.length+" of "+rep.pageList.length+" pages linked"+(no.length?"; no page of the same module and activity id in the others, so no link on: "+no.map(p=>p.path).join(", "):"")+".");}
    L.push("  Description: "+(rep.description?"“"+rep.description+"”":"none (the page has no first paragraph)"));
    L.push("  On this page: "+(rep.toc?"listed":"not listed (fewer than two top headings)"));
    if(rep.marker) L.push("  Marker: "+rep.marker);
    /* the script: which pages of the booklet need it (a booklet of many pages may need it on some only), and what a site layout must do */
    {const pages=rep.pageList.filter(p=>p.needs).map(p=>p.path),many=rep.pageList.length>1,all=pages.length===rep.pageList.length,
        of=all?"all "+pages.length+" pages":pages.length+" of "+rep.pageList.length+" pages ("+pages.join(", ")+")";
      if(rep.script) L.push(many?"  Script: booklet.js, which keeps nothing and sends nothing, is linked by "+of+(all?"":"; the other pages need none")+". Without it every page reads as it is."
        :"  Script: the page links booklet.js, which keeps nothing and sends nothing; without it the page reads as it is.");
      if(rep.needsScript&&C.form!=="standalone") L.push("  Script"+(rep.script?" (site form)":"")+": "+(many?"parts that respond when pressed are on "+of+(all?"":"; the others need none"):"this page has parts that respond when pressed")
        +"; add <script src=\"/booklet/booklet.js\" defer></script> to the layout to load them. Without it the page reads as it is.");}
    const copied=rep.images.filter(i=>i.ok),refused=rep.images.filter(i=>!i.ok);
    if(copied.length) L.push("  Images copied beside the page: "+copied.map(i=>i.src).join(", "));
    if(rep.links.length) L.push("  Links to booklets compiled with it: "+[...new Set(rep.links.map(l=>l.to))].join(", "));
    if(rep.marked.length||refused.length){L.push("  To tidy (each is an HTML comment on the page, where it stood):");
      rep.marked.forEach(m=>L.push("    [ ] "+m.what+", in "+m.where+": "+D.MARKED[m.kind]+(m.why?": "+m.why:"")));
      refused.forEach(i=>L.push("    [ ] the image "+JSON.stringify(i.src)+", in "+i.where+", was not copied (its words and address are shown): "+i.why));}
    else L.push("  To tidy: nothing was left off.");
    if(rep.keyed) L.push("  Answer key: this page carries its answer key in its markup (a class on each option marked [x], its verdict words and its replies, hidden until a press shows them). Anyone who views the page source can read which options are right.");
    if(rep.readOnly&&rep.readOnly.length){L.push("  Read-only here (each is shown as it asks, with nothing to press):");
      rep.readOnly.forEach(r=>L.push("    - "+r.what+", in "+r.where+": "+r.why));}
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
    else if(a==="--no-browser") o.noBrowser=true;
    else if(a==="--report") o.report=val();else if(a==="--renderer") o.renderer=val();else if(a==="--force") o.force=true;
    else if(a==="--version"){const X=E.load(o.renderer);console.log("compile "+VERSION+" (renderer "+X.R.RENDERER_VERSION+", format "+X.R.FORMAT_VERSION+")");return 0;}
    else if(a==="-h"||a==="--help"){console.log(fs.readFileSync(__filename,"utf8").split("\n").filter(l=>l.startsWith("//")).map(l=>l.slice(3)).join("\n"));return 0;}
    else if(a.startsWith("-")) throw usage("unknown option "+a);
    else o.files.push(a);}
  if(!o.files.length) throw usage("name at least one .booklet.md file");
  if(o.report&&/\.md$/i.test(o.report)) throw usage("--report names a .md file: the compiler never writes one");
  for(const f of o.files) if(!/\.md$/i.test(f)) throw usage("not a booklet file (.booklet.md): "+f);
  let C;
  try{C=compile(o.files.map(file=>({file})),{form:o.form,baseUrl:o.baseUrl,renderer:o.renderer,...(o.noBrowser?{browser:false}:{})});}
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

module.exports={VERSION,compile,compileOne,write,reportText,stamp,stampState,cssStampState,svgProblem,imageSize,main};
