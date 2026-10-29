"use strict";
/* compile/diagrams.js: SVG that is written into a page: a body map's figure, and a diagram drawn at build time.

   Both are read the same way: the SVG text is tokenised by a small strict reader (readSvg) into a tree, the tree is checked and
   changed, and the page gets the tree written out again (serialize), never the text it was given. So nothing the reader did not
   understand can reach the page, and the browser parses only markup this file wrote: every element is an SVG one, every
   attribute is quoted and escaped, and every piece of text is escaped. The rules are two layers, and a figure or diagram must pass
   both (nothing is cleaned: what fails is refused, and the page shows the reason in the build report):
     - the image rules of compile.js (svgProblem, README "Images"), run on the markup this file is about to write. Text nodes are
       left out of that search (they are written escaped, so they are only text), but a <style> element's text is searched;
     - for a figure, the renderer's own sanitizer rule (sanitizeSvg in booklet.html): the same elements, attribute names, value
       rule, style properties and id rule, read from the renderer by name (engine.js NAMES). The renderer cleans a figure by
       dropping what it does not allow; here anything it would drop is a reason to refuse the figure, so what the compiler writes is
       exactly what the renderer would have kept. test/compile-figures-browser.js holds the two to each other in Chromium.
     - for a diagram, the style the library wrote must stay inside the diagram (every rule begins with the diagram's own id), and
       its animations are left off.

   A diagram is drawn by the renderer's own mermaid part (parts/mermaid.js, pinned by LIB_SRI), in headless Chromium started by
   diagrams-run.js: the network is shut, the page holds no script of the booklet's, and a diagram's source reaches the library as
   data. This file starts that process with spawnSync, so the compiler stays synchronous and installs nothing: Playwright is found
   where test/run-browser.sh finds it (the PLAYWRIGHT variable, else node_modules/playwright, else ../.tools/node_modules/playwright-core)
   and without one every diagram is shown as its source, with the reason in the report. */
const fs=require("fs"),path=require("path"),crypto=require("crypto"),cp=require("child_process");
const H=require("./html.js");

const ROOT=path.join(__dirname,"..");
const SVG_NS="http://www.w3.org/2000/svg",XLINK_NS="http://www.w3.org/1999/xlink";
/* a drawn diagram larger than this is shown as its source instead: no page is made fat by one diagram */
const MAX_DIAGRAM_BYTES=1024*1024;
/* where the library writes a diagram's own title when its source has one (a pie's, a gantt's, a chart's), for the name */
const TITLE_CLASSES=new Set(["titleText","pieTitleText","chart-title","title"]),TITLED=new Set(["g","text","tspan"]);
/* the id the library is asked to draw under; each use rewrites it to the page's own (bk-dg1, bk-dg2 ...) */
const RENDER_ID="bkdgrender";
/* elements whose children are text, written on one line so no space is added between them */
const TEXTISH=new Set(["text","tspan","textPath","title","desc","style"]);

/* ======================= READING =======================
   readSvg(text) -> {tree} | {why}. A node is {name, attrs: [[name, value]], kids: [node | string]}; a string is decoded text. It reads
   what compile.js's svgMarkup reads: tags with quoted attributes, the five XML entities and numeric references, comments (dropped),
   one XML declaration and a DOCTYPE without entities (dropped), CDATA (as text). Anything else, an element that is not closed,
   a second root, text outside the root, a control character, is a reason to refuse. */
const TAG=/<(\/?)([^\s\/>!?=<"']+)((?:\s+[^\s=\/>"'<]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
const ATTR=/([^\s=\/>"'<]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const NAMED={amp:"&",lt:"<",gt:">",quot:'"',apos:"'"};
const BAD_CHAR=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ud800-\udfff﷐-﷯￾￿]/;
function unesc(s){
  let bad=false;
  const out=String(s).replace(/&(?:#x([0-9a-fA-F]+)|#(\d+)|(amp|lt|gt|quot|apos));/g,(m,h,d,n)=>{
    if(n) return NAMED[n];
    const cp=h?parseInt(h,16):parseInt(d,10);
    if(!(cp>=1&&cp<=0x10ffff)){bad=true;return "";}
    return String.fromCodePoint(cp);});
  return bad||BAD_CHAR.test(out)?null:out;}

function readSvg(raw){
  const text=String(raw==null?"":raw).replace(/^﻿/,"");
  const stack=[];let root=null,i=0;
  const at=re=>{re.lastIndex=i;const m=re.exec(text);return m&&m.index===i?m:null;};
  while(i<text.length){
    const lt=text.indexOf("<",i),end=lt<0?text.length:lt,chunk=text.slice(i,end);
    if(chunk){
      if(!stack.length){if(chunk.trim()) return {why:"text outside the <svg> element"};}
      else{const t=unesc(chunk);if(t===null) return {why:"a control character, or a character reference to one"};stack[stack.length-1].kids.push(t);}}
    if(lt<0) break;
    i=lt;let m;
    if(text.startsWith("<!--",i)){const e=text.indexOf("-->",i+4);if(e<0) return {why:"a comment that never closes"};i=e+3;continue;}
    if(text.startsWith("<![CDATA[",i)){const e=text.indexOf("]]>",i+9);if(e<0) return {why:"a CDATA section that never closes"};
      if(!stack.length) return {why:"text outside the <svg> element"};
      stack[stack.length-1].kids.push(text.slice(i+9,e));i=e+3;continue;}
    if(text.startsWith("<?",i)){
      if(!root&&!stack.length&&/^\s*$/.test(text.slice(0,i))&&(m=at(/<\?xml\s[^<>?]*\?>/y))){i+=m[0].length;continue;}
      return {why:"a processing instruction"};}
    if(/^<!doctype/i.test(text.slice(i,i+9))){
      if(!root&&(m=at(/<!DOCTYPE[^<>\[\]]*>/y))){i+=m[0].length;continue;}
      return {why:"a DOCTYPE with entities"};}
    if(!(m=at(TAG))) return {why:"markup the compiler cannot read (at character "+i+")"};
    i+=m[0].length;
    const name=m[2];
    if(name.includes(":")) return {why:"a prefixed element (<"+clip(name)+">: a prefix can name another namespace)"};
    if(m[1]){
      const top=stack.pop();
      if(!top||top.name!==name) return {why:"an element that is closed out of order (</"+clip(name)+">)"};
      continue;}
    const attrs=[],seen=new Set();
    for(const a of m[3].matchAll(ATTR)){
      const v=unesc(a[2]!=null?a[2]:a[3]);
      if(v===null) return {why:"a control character, or a character reference to one"};
      const key=a[1].toLowerCase();
      if(seen.has(key)) return {why:"an attribute written twice ("+clip(a[1])+")"};
      seen.add(key);attrs.push([a[1],v]);}
    const node={name,attrs,kids:[]};
    if(!stack.length){
      if(root) return {why:"more than one element at the top"};
      if(name!=="svg") return {why:"the top element is not <svg>"};
      root=node;}
    else stack[stack.length-1].kids.push(node);
    if(!m[4]) stack.push(node);}
  if(stack.length) return {why:"an element that never closes (<"+clip(stack[stack.length-1].name)+">)"};
  if(!root) return {why:"no <svg> element"};
  /* the namespaces: the only ones are SVG's and xlink's, each with its own address. They are not written: an inline SVG needs none */
  let why=null;
  walk(root,n=>{for(const [k,v] of n.attrs){
    if(k==="xmlns"){if(v.trim()!==SVG_NS) why=why||"a namespace other than SVG's ("+clip(v)+")";}
    else if(k.startsWith("xmlns:")){if(k!=="xmlns:xlink"||v.trim()!==XLINK_NS) why=why||"a namespace other than SVG's and xlink's ("+clip(k)+")";}}});
  if(why) return {why};
  return {tree:root};}
const clip=s=>{s=String(s).trim();return s.length>40?s.slice(0,40)+"…":s;};
function walk(n,fn){fn(n);for(const k of n.kids) if(typeof k!=="string") walk(k,fn);}
const attrOf=(n,name)=>{const a=n.attrs.find(x=>x[0].toLowerCase()===name);return a?a[1]:null;};
const setAttr=(n,name,v)=>{const a=n.attrs.find(x=>x[0].toLowerCase()===name.toLowerCase());if(a) a[1]=v;else n.attrs.push([name,v]);};
const dropAttr=(n,name)=>{n.attrs=n.attrs.filter(x=>x[0].toLowerCase()!==name);};
const textOfNode=n=>n.kids.map(k=>typeof k==="string"?k:textOfNode(k)).join("");

/* ======================= WRITING =======================
   serialize(tree, {neutral}) -> the markup as indented HTML text. Every element is written by this function and nothing else:
   text and attribute values are escaped, a newline or tab inside either is a character reference (so html.js can indent whole
   lines), and the namespace attributes are left off. `neutral` leaves out the text of every element but <style>: it is the text
   the image rules are run on. */
const escText=s=>H.escText(s).replace(/\r/g,"&#13;").replace(/\n/g,"&#10;").replace(/\t/g,"&#9;");
const escAttr=s=>H.escAttr(s).replace(/\r/g,"&#13;").replace(/\n/g,"&#10;").replace(/\t/g,"&#9;");
const PLAIN_NAME=/^[A-Za-z_][A-Za-z0-9_:.-]*$/;
function serialize(root,o){
  o=o||{};
  const open=n=>"<"+n.name+n.attrs.filter(([k])=>k!=="xmlns"&&!k.startsWith("xmlns:")&&PLAIN_NAME.test(k)).map(([k,v])=>" "+k+'="'+escAttr(v)+'"').join("");
  const inline=n=>{
    if(!n.kids.length) return open(n)+"/>";
    return open(n)+">"+n.kids.map(k=>typeof k==="string"?(n.name==="style"?H.escText(k):o.neutral?"":escText(k)):inline(k)).join("")+"</"+n.name+">";};
  const block=(n,depth)=>{
    const pad="  ".repeat(depth);
    if(!n.kids.length) return pad+open(n)+"/>";
    if(TEXTISH.has(n.name)) return pad+inline(n);
    const kids=n.kids.filter(k=>typeof k!=="string"||(!o.neutral&&k.trim()));
    if(!kids.length) return pad+open(n)+"/>";
    return pad+open(n)+">\n"+kids.map(k=>typeof k==="string"?"  ".repeat(depth+1)+escText(k):block(k,depth+1)).join("\n")+"\n"+pad+"</"+n.name+">";};
  return block(root,0);}

/* ======================= A BODY MAP'S FIGURE =======================
   figure(text, {R, svgProblem, prefix, labelOf}) -> {ok, html} | {ok:false, why}. `R` is the renderer (engine.js): the rules below
   are its sanitizer's, read by name. `prefix` scopes the figure's ids (bk-f1-, as the renderer's bf1-); `labelOf(regionId)` is a
   region's label. In reading form every region is a picture with its label for a name, as the renderer's readonly figure is. */
function figure(text,ctx){
  const R=ctx.R,r=readSvg(text);
  if(r.why) return {ok:false,why:r.why};
  const tree=r.tree;
  const ids=new Set(),refs=[];
  let why=null;
  const refuse=w=>{why=why||w;};
  walk(tree,n=>{
    const ln=n.name.toLowerCase();
    if(ln==="a") return refuse("a link (<a>: the renderer unwraps it)");
    if((ln==="title"||ln==="desc")&&n.kids.some(k=>typeof k!=="string")) return refuse("markup inside <"+ln+"> (a browser reads what is inside it as HTML, so the compiler and the renderer would not read it alike)");
    if(!R.SVG_KEEP.has(ln)) return refuse("an element the renderer's figure rule does not keep (<"+clip(n.name)+">)");
    const keep=[];
    for(const [k,v] of n.attrs){
      const name=k.toLowerCase();
      if(name==="xmlns"||name==="xmlns:xlink") continue;
      if(!R.svgNameOk(name)){refuse("an attribute the renderer's figure rule does not keep ("+clip(k)+")");continue;}
      if(name==="id"){if(!R.SVG_ID.test(v)){refuse("an id the renderer's figure rule does not keep ("+clip(v)+")");continue;}ids.add(v);keep.push([k,v,"id"]);continue;}
      if(name==="href"||name==="xlink:href"){
        if(!v.trim().startsWith("#")||!R.SVG_ID.test(v.trim().slice(1))){refuse("a link that does not point inside the figure ("+clip(v)+")");continue;}
        keep.push([k,v.trim(),"href"]);continue;}
      if(name==="style"){
        const parts=v.split(";").filter(d=>d.trim()),kept=parts.map(d=>{const i=d.indexOf(":");if(i<0) return "";
          const pk=d.slice(0,i).trim().toLowerCase(),val=d.slice(i+1).trim();
          return R.SVG_STYLE_PROPS.has(pk)||R.svgFamily(pk)?(R.svgValueOk(val)?pk+":"+val:""):"";}).filter(Boolean);
        if(kept.length!==parts.length){refuse("a style declaration the renderer's figure rule drops");continue;}
        if(!kept.length) continue;
        const nv=kept.join(";");keep.push([k,nv,/url\(/i.test(nv)?"url":""]);continue;}
      if(!/^(class|data-|aria-|xmlns)/.test(name)&&!R.svgValueOk(v)){refuse("a value the renderer's figure rule drops ("+clip(k)+"="+clip(v)+")");continue;}
      if(name==="class"&&!/^[A-Za-z0-9_ \t\r\n-]*$/.test(v)){refuse("a class with a character other than letters, digits, _ and -");continue;}
      if(/url\(/i.test(v)){keep.push([k,v,"url"]);continue;}
      keep.push([k,v,""]);}
    n.attrs=keep.map(a=>[a[0],a[1]]);
    keep.forEach((a,i)=>{if(a[2]) refs.push([n,i,a[2]]);});});
  if(why) return {ok:false,why};
  /* the second pass: every id gets the figure's prefix, every #name reference is pointed at it, one to an id the figure lacks is refused */
  const pre=ctx.prefix+"-";
  for(const [n,i,kind] of refs){
    const a=n.attrs[i];
    if(kind==="id"){a[1]=pre+a[1];continue;}
    let ok=true;
    const fixed=a[1].replace(/#([A-Za-z_][A-Za-z0-9_.:-]*)/g,(m,id)=>{if(!ids.has(id)){ok=false;return m;}return "#"+pre+id;});
    if(!ok) return {ok:false,why:"a reference to an id the figure does not define ("+clip(a[1])+")"};
    a[1]=fixed;}
  /* in reading form each region is a picture with its label for a name (the renderer's readonly figure) */
  walk(tree,n=>{
    const cls=(attrOf(n,"class")||"").split(/\s+/);
    const reg=attrOf(n,"data-r");
    if(cls.includes("rg")&&reg!==null){setAttr(n,"role","img");setAttr(n,"aria-label",ctx.labelOf?String(ctx.labelOf(reg)):reg);}});
  const p=ctx.svgProblem(Buffer.from(serialize(tree,{neutral:true})));
  if(p) return {ok:false,why:"the compiler's SVG rules: it holds "+p};
  return {ok:true,html:serialize(tree)};}

/* ======================= A DRAWN DIAGRAM =======================
   diagram(svgText, {svgProblem, prefix, paper, word}) -> {ok, html} | {ok:false, why}. `svgText` is what the library returned. It is
   read like any SVG, then: the library's id is rewritten to `prefix`; its <style> must stay inside the diagram and loses its
   animations; ids nothing points at are dropped; the size is given as a width (the style attribute is not used: a host whose policy
   refuses inline styles draws the page the same); the diagram gets its own paper behind it (one theme's colours, README) and a name
   for a screen reader. */
function diagram(svgText,ctx){
  if(String(svgText).length>MAX_DIAGRAM_BYTES) return {ok:false,why:"the drawn diagram is larger than "+(MAX_DIAGRAM_BYTES>>10)+" KB"};
  const r=readSvg(svgText);
  if(r.why) return {ok:false,why:"the drawn SVG could not be read: "+r.why};
  const tree=r.tree,pre=ctx.prefix;
  const swap=s=>s.split(RENDER_ID).join(pre);
  let why=null;
  /* style: scoped to the diagram, no animations, and no rule for a class the drawing does not use */
  const classes=new Set();
  walk(tree,n=>{for(const c of (attrOf(n,"class")||"").split(/\s+/)) if(c) classes.add(c);});
  walk(tree,n=>{
    if(n.name==="style"){
      const css=n.kids.filter(k=>typeof k==="string").join("");
      const s=scopeStyle(swap(css),pre,classes);
      if(s.why) why=why||s.why;else n.kids=s.css?[s.css]:[];}
    for(const a of n.attrs) a[1]=swap(a[1]);});
  /* <title> and <desc> are where a browser reads HTML again: an element inside one would be read here and there differently */
  walk(tree,n=>{if((n.name==="title"||n.name==="desc")&&n.kids.some(k=>typeof k!=="string")) why=why||"markup inside <"+n.name+"> (a browser reads what is inside it as HTML)";});
  if(why) return {ok:false,why};
  /* the library's empty scratch group is left off */
  walk(tree,n=>{n.kids=n.kids.filter(k=>typeof k==="string"||!(k.name==="g"&&!k.kids.length&&(attrOf(k,"class")||"")==="mermaid-tmp-group"));});
  /* the ids: the root's stays; one that nothing points at goes; one that is pointed at and is not named from the diagram's own id
     (the title's, which the library names after the root) is renamed under it, and every pointer follows */
  dropAttr(tree,"aria-labelledby");   /* the name is written as aria-label below, from the same title */
  const used=new Set();
  const note=s=>{for(const m of String(s).matchAll(/#([A-Za-z_][A-Za-z0-9_.:-]*)/g)) used.add(m[1]);};
  walk(tree,n=>{
    for(const [k,v] of n.attrs){
      const name=k.toLowerCase();
      if(name==="aria-labelledby"||name==="aria-describedby") v.split(/\s+/).forEach(x=>used.add(x));
      else if(name!=="id") note(v);}
    if(n.name==="style") note(n.kids.join(""));});
  const rename=new Map();
  walk(tree,n=>{
    const id=attrOf(n,"id");
    if(id===null||n===tree) return;
    if(!used.has(id)) dropAttr(n,"id");
    else if(!id.startsWith(pre)) rename.set(id,pre+"-"+id);});
  if(rename.size) walk(tree,n=>{
    for(const a of n.attrs){
      const name=a[0].toLowerCase();
      if(name==="id"){if(rename.has(a[1])) a[1]=rename.get(a[1]);}
      else if(name==="aria-labelledby"||name==="aria-describedby") a[1]=a[1].split(/\s+/).map(x=>rename.get(x)||x).join(" ");
      else a[1]=a[1].replace(/#([A-Za-z_][A-Za-z0-9_.:-]*)/g,(m,id)=>rename.has(id)?"#"+rename.get(id):m);}});
  /* the root: a width, a viewBox, a name */
  const vb=(attrOf(tree,"viewbox")||"").trim().split(/[\s,]+/).map(Number);
  if(vb.length!==4||!vb.every(Number.isFinite)||!(vb[2]>0)||!(vb[3]>0)) return {ok:false,why:"the drawn SVG has no viewBox"};
  const mw=/max-width:\s*([0-9.]+)px/.exec(attrOf(tree,"style")||"");
  const width=mw?Math.round(Number(mw[1])):Math.round(vb[2]);
  for(const a of ["style","width","height","role","aria-roledescription","aria-labelledby"]) dropAttr(tree,a);
  const titled=tree.kids.find(k=>typeof k!=="string"&&k.name==="title");
  let name=titled?textOfNode(titled).trim():"";
  if(!name){let found="";
    walk(tree,n=>{if(!found&&TITLED.has(n.name)&&(attrOf(n,"class")||"").split(/\s+/).some(c=>TITLE_CLASSES.has(c))) found=textOfNode(n).replace(/\s+/g," ").trim();});
    name=found;}
  if(!name) name=ctx.word;
  setAttr(tree,"width",String(width));
  setAttr(tree,"role","graphics-document document");
  setAttr(tree,"aria-label",name);
  tree.kids.unshift({name:"rect",attrs:[["x",String(vb[0])],["y",String(vb[1])],["width",String(vb[2])],["height",String(vb[3])],["fill",ctx.paper]],kids:[]});
  holdPaint(tree,pre);
  const p=ctx.svgProblem(Buffer.from(serialize(tree,{neutral:true})));
  if(p) return {ok:false,why:"the drawn SVG fails the compiler's SVG rules: it holds "+p};
  return {ok:true,html:serialize(tree),name};}

/* A paint written as an attribute (fill="none"), or left to be inherited from a group, is the weakest rule there is: a host's own rule for
   bare shapes (svg path { fill: red }) beats it. So the drawing gets rules of its own, ahead of the library's, at the weight of its id
   alone: first, for each paint property an element does not carry as an attribute, one that sends it back to what it inherits (what it was without any rule, since these properties are inherited),
   then one for each paint attribute the drawing uses. They beat a host's plain rule, and any rule of the library's (which has an element
   or a class as well) still beats them, as it beat the attribute. A value outside a plain set of characters stays an attribute. */
const PAINT=["fill","stroke","stroke-width","stroke-linecap","stroke-linejoin","stroke-dasharray","opacity","fill-opacity","stroke-opacity"];
const PAINT_VALUE=/^[#A-Za-z0-9 ._%(),:-]{1,60}$/;
/* the paint properties that are inherited (so "inherit" is what a shape has with no rule at all) */
const INHERITED=["fill","stroke","stroke-width","stroke-linecap","stroke-linejoin","stroke-dasharray"];
function holdPaint(tree,pre){
  const seen=new Set(),rules=INHERITED.map(k=>"#"+pre+" :where(:not(["+k+"])){"+k+":inherit}");
  walk(tree,n=>{for(const [k,v] of n.attrs){
    if(!PAINT.includes(k)||!PAINT_VALUE.test(v)) continue;
    const key=k+"\n"+v;if(seen.has(key)) continue;seen.add(key);
    rules.push("#"+pre+" :where(["+k+'="'+v+'"]){'+k+":"+v+"}");}});
  let st=null;walk(tree,n=>{if(!st&&n.name==="style") st=n;});
  const text=rules.join("\n");
  if(st) st.kids=[text+(st.kids.length?"\n"+st.kids.join(""):"")];
  else{const i=tree.kids.findIndex(k=>typeof k!=="string"&&k.name!=="rect"&&k.name!=="title"&&k.name!=="desc");
    tree.kids.splice(i<0?tree.kids.length:i,0,{name:"style",attrs:[],kids:[text]});}}

/* The style the library writes: every rule must begin with the diagram's own id (so nothing outside it is styled), and an
   @keyframes block is left out (its name is global, and a still picture needs no animation). Any other at-rule is refused.
   With `classes` (the class names the drawing uses), a selector that needs a class the drawing lacks is left out, and a rule left
   with no selector goes: the library writes a rule for every class of every diagram type, and most match nothing. A rule on :root goes too. A class inside
   :not(), :is() or :where() is not counted (the selector can match without it). */
function scopeStyle(css,id,classes){
  const t=css.replace(/\/\*[\s\S]*?\*\//g,"");
  const kept=[];let i=0;
  while(i<t.length){
    while(i<t.length&&/\s/.test(t[i])) i++;
    if(i>=t.length) break;
    const open=t.indexOf("{",i);
    if(open<0) return {why:"a style the compiler cannot read"};
    let depth=1,j=open+1;
    while(j<t.length&&depth){if(t[j]==="{") depth++;else if(t[j]==="}") depth--;j++;}
    if(depth) return {why:"a style that never closes"};
    const prelude=t.slice(i,open).trim();
    if(/^@(?:-webkit-)?keyframes\s/i.test(prelude)){i=j;continue;}
    if(prelude.startsWith("@")) return {why:"a style with an at-rule ("+clip(prelude)+")"};
    const sels=[];let d=0,cur="";
    for(const ch of prelude){if(ch==="("||ch==="[") d++;if(ch===")"||ch==="]") d--;if(ch===","&&!d){sels.push(cur.trim());cur="";}else cur+=ch;}
    sels.push(cur.trim());
    for(const s of sels) if(!(s.startsWith("#"+id)&&!/[\w-]/.test(s.charAt(id.length+1)))) return {why:"a style that reaches outside the diagram ("+clip(s)+")"};
    /* a selector with :root can never match inside the diagram (the root is the page's), so it is left out whatever the drawing uses */
    const live=sels.filter(s=>!/:root\b/.test(s)&&(!classes||(()=>{
      let bare=s;for(let k=0;k<4;k++) bare=bare.replace(/\([^()]*\)/g,"");
      return [...bare.matchAll(/\.(-?[_A-Za-z][\w-]*)/g)].every(c=>classes.has(c[1]));})()));
    if(live.length) kept.push(live.join(",")+t.slice(open,j).trim());
    i=j;}
  return {css:kept.join("\n")};}

/* ======================= THE BROWSER =======================
   The part, the browser and the process that draws. None of it is run for a booklet without a diagram. */
/* the Playwright package: the PLAYWRIGHT variable when it is set (and only that: pointing it at nothing turns drawing off, which the
   tests use), else the places test/run-browser.sh looks. `want` (the option) is a path, false for none, or undefined. */
function findPlaywright(want){
  const env=process.env.PLAYWRIGHT;
  const list=want===false?[]:typeof want==="string"?[want]:env?[env]
    :[path.join(ROOT,"node_modules","playwright"),path.join(ROOT,"node_modules","playwright-core"),path.join(ROOT,"..",".tools","node_modules","playwright-core"),
      path.join(process.cwd(),"node_modules","playwright"),path.join(process.cwd(),"node_modules","playwright-core")];
  for(const c of list){try{if(fs.statSync(path.join(c,"package.json")).isFile()) return path.resolve(c);}catch(e){}}
  return null;}

/* the renderer's mermaid part: parts/mermaid.js beside booklet.html, or the stored block of a one-file build, and in either case the
   file the renderer pins (LIB_SRI). {text} or {why}. */
function partSource(X){
  let bytes=null;
  try{bytes=fs.readFileSync(path.join(path.dirname(X.file),"parts","mermaid.js"));}catch(e){bytes=null;}
  if(bytes===null){
    const page=fs.readFileSync(X.file,"utf8"),m=/<script type="text\/plain" id="lib-mermaid">([\s\S]*?)<\/script>/.exec(page);
    if(m) bytes=Buffer.from(m[1].replace(/<\\\/script/g,"</script").replace(/<\\!--/g,"<!--"),"utf8");}
  if(bytes===null) return {why:"the renderer's diagram part (parts/mermaid.js) was not found beside "+path.basename(X.file)};
  const sri="sha256-"+crypto.createHash("sha256").update(bytes).digest("base64");
  if(sri!==X.R.LIB_SRI.mermaid) return {why:"the diagram part beside the renderer is not the file the renderer pins"};
  return {text:bytes.toString("utf8")};}

/* the Paper theme's colours and text face, from the stylesheet's default table, for the library's theme variables and the diagram's paper */
function paperColours(css){
  const m=/\n:where\(\.booklet, \.bk-page\)\{([^}]*)\}/.exec(css),o={};
  if(m){for(const d of m[1].matchAll(/--bk-([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)) o[d[1]]=d[2];
    const f=/--bk-font-text:([^;]+);/.exec(m[1]);if(f) o["font-text"]=f[1].trim();}
  return o;}
/* mermaid's configuration: the renderer's (mermaidConfig in booklet.html), with its theme tokens read from the Paper table.
   test/compile-figures.test.js ties this list to the renderer's, key by key. */
const THEME_TOKENS={background:"paper",primaryColor:"paper-deep",primaryTextColor:"ink",primaryBorderColor:"accent",
  secondaryColor:"accent-soft",secondaryTextColor:"ink",secondaryBorderColor:"accent",tertiaryColor:"surface",tertiaryTextColor:"ink",
  tertiaryBorderColor:"rule",lineColor:"muted",textColor:"ink",mainBkg:"paper-deep",nodeBorder:"accent",nodeTextColor:"ink",
  clusterBkg:"surface",clusterBorder:"rule",titleColor:"ink",edgeLabelBackground:"paper",noteBkgColor:"amber",noteTextColor:"ink",
  noteBorderColor:"amber-ink",actorBkg:"paper-deep",actorBorder:"accent",actorTextColor:"ink",actorLineColor:"muted",signalColor:"ink",
  signalTextColor:"ink",labelBoxBkgColor:"paper-deep",labelBoxBorderColor:"accent",labelTextColor:"ink",loopTextColor:"ink",
  activationBkgColor:"accent-soft",activationBorderColor:"accent",sequenceNumberColor:"#FFFFFF",altBackground:"surface",
  errorBkgColor:"warm",errorTextColor:"warm-ink"};
function mermaidConfig(colours,fontFamily){
  const tv={darkMode:false,fontFamily};
  for(const [k,t] of Object.entries(THEME_TOKENS)) tv[k]=t.startsWith("#")?t:colours[t];
  return {startOnLoad:false,securityLevel:"strict",htmlLabels:false,flowchart:{htmlLabels:false},theme:"base",suppressErrorRendering:true,themeVariables:tv};}

/* drawBatch(X, codes, o) -> Map code -> {svg} | {why}. Starts diagrams-run.js (Chromium, network shut) once for all the codes. */
function drawBatch(X,codes,o){
  const out=new Map(),all=why=>{for(const c of codes) out.set(c,{why});return out;};
  const pw=findPlaywright(o.playwright);
  if(!pw) return all("no browser to draw it with (set PLAYWRIGHT to the path of the playwright-core package)");
  const part=partSource(X);
  if(part.why) return all(part.why);
  const css=fs.readFileSync(path.join(__dirname,"booklet.css"),"utf8"),colours=paperColours(css),fam=colours["font-text"]||"sans-serif";
  const faces=X.fonts().faces.filter(f=>f.family==="Atkinson Hyperlegible"&&f.range.startsWith("U+0000-00FF")&&f.style==="normal")
    .map(f=>({family:f.family,weight:f.weight,style:f.style,range:f.range,b64:f.bytes.toString("base64")}));
  const job={playwright:pw,part:part.text,global:X.R.LIB_GLOBAL.mermaid,id:RENDER_ID,codes,faces,config:mermaidConfig(colours,fam.trim())};
  const r=cp.spawnSync(process.execPath,[path.join(__dirname,"diagrams-run.js")],
    {input:JSON.stringify(job),encoding:"utf8",maxBuffer:1024*1024*1024,timeout:o.timeout||240000,env:process.env});
  let res=null;
  try{res=JSON.parse(r.stdout);}catch(e){res=null;}
  if(!res||!Array.isArray(res.results)||res.results.length!==codes.length)
    return all(r.error&&r.error.code==="ETIMEDOUT"?"the browser took too long":"the browser could not be started or did not answer");
  if(Array.isArray(res.requests)&&res.requests.length) return all("the browser page made a request, so no drawing was kept");
  codes.forEach((c,i)=>{const x=res.results[i];out.set(c,x&&typeof x.svg==="string"?{svg:x.svg}:{why:"the diagram library could not draw it"});});
  return out;}

module.exports={readSvg,serialize,figure,diagram,scopeStyle,findPlaywright,partSource,paperColours,mermaidConfig,drawBatch,
  THEME_TOKENS,RENDER_ID,MAX_DIAGRAM_BYTES};
