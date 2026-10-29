"use strict";
/* compile/html.js: the compiler's element builder and the writer that turns its elements into HTML text.

   Every element the compiler writes is made here, by el(tag, attrs, ...kids), and every one is written out by html().
   The renderer's Markdown engine (evaluated from booklet.html by engine.js) is handed this el in place of the page's own,
   so prose, the compiler's own drawing and the page around them all go through the same two functions.

   The safety rule: text is always text. A string child is written with &, < and > escaped; an attribute value is written
   in double quotes with &, ", < and > escaped. An attribute whose name is not a plain name, or that names an event
   handler (on...), is never written: the engine hands the image box an onerror function, and nothing of the kind may
   reach a page. The only way to write markup as it stands is trusted(text), which the compiler uses for exactly two things
   that come from booklet.html itself, never from a booklet: the MathML Temml writes and the inner drawing of an icon from
   the renderer's sprite; and a third, the SVG of a body map's figure or a drawn diagram, which diagrams.js has read with its
   own strict reader and written out again itself (it is never the text the booklet held), as a block on lines of its own. Temml runs with trust:false, so a formula cannot carry \href, \url or an outside address, but it
   does write two things of its own: \label{...} gives a row an id, and \ref / \eqref a link to that id (href="#..."). The
   drawing (draw.js, math) gives both the bk-tml- prefix and keeps the ids unique, and the page's id de-duplication starts
   from them, so a label can never take an id the page or a host uses. comment(text) writes an HTML comment, with anything
   that could end it early taken out. */

const VOID=new Set(["area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr"]);
/* elements written on lines of their own, indented; everything else runs inline with the text around it */
const BLOCK=new Set(["html","head","body","main","article","section","nav","header","footer","aside","div","p","h1","h2","h3",
  "h4","h5","h6","ul","ol","li","dl","dt","dd","table","thead","tbody","tfoot","tr","th","td","blockquote","pre","figure",
  "figcaption","details","summary","fieldset","hr","meta","link","title","script","style"]);
const ATTR_NAME=/^[A-Za-z][A-Za-z0-9_:.-]*$/;

class Node{
  constructor(tag,attrs,kids){this.tag=tag;this.attrs=attrs;this.kids=kids;}
  append(...k){for(const x of k) if(x!=null) this.kids.push(x);return this;}
  /* the words inside, as a browser's textContent gives them (the engine reads a label's words this way) */
  get textContent(){return textOf(this.kids);}
}
class Trusted{constructor(text,block){this.text=String(text);this.block=!!block;}get textContent(){return "";}}
class Comment{constructor(text){this.text=String(text);}get textContent(){return "";}}

const textOf=x=>Array.isArray(x)?x.map(textOf).join(""):typeof x==="string"?x:x&&typeof x.textContent==="string"?x.textContent:"";

/* el(tag, attrs, ...kids): attrs that are null, undefined or false are left out, true is written as an empty value, and a
   function is never written. A child that is an array is flattened; null and undefined children are skipped. */
function el(tag,attrs,...kids){
  const a={};
  for(const [k,v] of Object.entries(attrs||{})){
    if(v===null||v===undefined||v===false||typeof v==="function") continue;
    if(!ATTR_NAME.test(k)||/^on/i.test(k)) continue;
    a[k]=v===true?"":String(v);}
  const n=new Node(String(tag).toLowerCase(),a,[]);
  const add=k=>{if(k==null) return;if(Array.isArray(k)) k.forEach(add);else n.kids.push(k);};
  kids.forEach(add);
  return n;}
const trusted=(text,block)=>new Trusted(text,block);
/* an HTML comment, between spaces: no "--" may stand inside one (that is how "-->" would end it early), so each is broken up */
const comment=text=>{let s=String(text);while(s.includes("--")) s=s.replace(/--/g,"- -");return new Comment(" "+s+" ");};

const escText=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const escAttr=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const openTag=n=>"<"+n.tag+Object.entries(n.attrs).map(([k,v])=>v===""?" "+k:" "+k+'="'+escAttr(v)+'"').join("")+">";

/* a node whose tag is "" is a fragment: its children stand where it stands, with no element of its own */
const frag=(...kids)=>el("",{},...kids);
/* a comment runs inline: inside a paragraph it stays inside it; among blocks html() gives it a line of its own */
const isBlock=x=>x instanceof Node?(x.tag===""?x.kids.some(isBlock):BLOCK.has(x.tag)):x instanceof Trusted?x.block:false;
/* inline content as one run of text: no line breaks are added inside it */
function inline(x){
  if(x==null) return "";
  if(typeof x==="string") return escText(x);
  if(typeof x==="number") return escText(String(x));
  if(Array.isArray(x)) return x.map(inline).join("");
  if(x instanceof Trusted) return x.text;
  if(x instanceof Comment) return "<!--"+x.text+"-->";
  if(!(x instanceof Node)) return escText(textOf(x));
  if(x.tag==="") return x.kids.map(inline).join("");
  if(VOID.has(x.tag)) return openTag(x);
  if(x.tag==="pre") return openTag(x)+x.kids.map(inline).join("")+"</pre>";
  return openTag(x)+x.kids.map(inline).join("")+"</"+x.tag+">";}

/* html(node, depth): the node as HTML text. A block element whose children are all inline is one line; one that holds blocks
   opens on its own line, its children each on lines of their own one step in (inline runs between them grouped onto one
   line), and closes on its own line. A <pre> is written exactly as it is, so a code block keeps its spacing. */
function html(x,depth){depth=depth||0;const pad="  ".repeat(depth);
  if(Array.isArray(x)) return x.map(k=>html(k,depth)).join("");
  if(!isBlock(x)) return pad+inline(x)+"\n";
  if(x instanceof Node&&x.tag==="") return x.kids.map(k=>html(k,depth)).join("");
  if(x instanceof Trusted) return x.text.split("\n").map(l=>pad+l).join("\n")+"\n";
  if(VOID.has(x.tag)) return pad+openTag(x)+"\n";
  if(x.tag==="pre"||!x.kids.some(isBlock)) return pad+inline(x)+"\n";
  let out=pad+openTag(x)+"\n",run=[];
  const flush=()=>{const t=run.map(inline).join("");if(t.trim()) out+="  ".repeat(depth+1)+t.trim()+"\n";run=[];};
  /* among blocks, a comment stands on a line of its own too (one marking what was left off reads best there) */
  for(const k of x.kids){if(isBlock(k)||k instanceof Comment){flush();out+=k instanceof Comment?"  ".repeat(depth+1)+inline(k)+"\n":html(k,depth+1);}else run.push(k);}
  flush();
  return out+pad+"</"+x.tag+">\n";}

/* the nodes of a tree, depth first (a test and the drawing's own checks walk the page this way) */
function walk(x,fn,parent){if(Array.isArray(x)){x.forEach(k=>walk(k,fn,parent));return;}
  if(fn(x,parent)===false) return;
  if(x instanceof Node) x.kids.forEach(k=>walk(k,fn,x));}
/* take the first node that passes `test` out of the tree; true when one was taken */
function removeFirst(x,test){let done=false;
  const go=n=>{if(done||!(n instanceof Node)) return;
    for(let i=0;i<n.kids.length&&!done;i++){if(test(n.kids[i])){n.kids.splice(i,1);done=true;return;}go(n.kids[i]);}};
  if(Array.isArray(x)){for(let i=0;i<x.length&&!done;i++){if(test(x[i])){x.splice(i,1);done=true;}else go(x[i]);}}else go(x);
  return done;}

module.exports={el,frag,trusted,comment,html,inline,textOf,walk,removeFirst,escText,escAttr,openTag,Node,Trusted,Comment};
