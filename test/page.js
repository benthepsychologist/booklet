// One page load of booklet.html in node, with a DOM that remembers what was drawn.
//
// The same recording DOM test/final.test.js uses: every node keeps its
// attributes, its children, the handlers wired to it and any HTML it was
// given, so a test can read what a reader, or a screen reader, would meet, and
// press a button by calling the handler the page wired to it. Each boot()
// evaluates the renderer's one <script> afresh against the same in-memory
// localStorage, so a boot is a real page load.
//
// Used by the *.test.js suites. Not a test itself (the runner only runs
// *.test.js).
require("./harness.js");                     // the storage stub and the globals the page expects
const fs=require("fs");
const R=__dirname+"/..";
const html=fs.readFileSync(R+"/booklet.html","utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
const LS=global.__ls;
const PREF="booklet.ui.lang";

const mkNode=tag=>{const n={tagName:tag,children:[],attrs:{},style:{},dataset:{},_text:"",_html:"",_on:{},
  setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return k in this.attrs?this.attrs[k]:null;},
  removeAttribute(k){delete this.attrs[k];},hasAttribute(k){return k in this.attrs;},
  classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(k,f){this._on[k]=f;},
  append(...k){this.children.push(...k);},prepend(...k){this.children.unshift(...k);},remove(){},
  querySelector(){return mkNode("div");},querySelectorAll(){return [];},focus(){},click(){},scrollIntoView(){},
  get textContent(){return this._text;},set textContent(v){this._text=String(v);this.children=[];},
  get innerHTML(){return this._html;},set innerHTML(v){this._html=String(v);this.children=[];},
  get value(){return this._value||"";},set value(v){this._value=v;}};return n;};
const body=html.slice(html.indexOf("<body>"),html.indexOf("<script>"));
const realIds=new Set([...body.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
let STORE={};
global.document.createElement=mkNode;
global.document.getElementById=id=>realIds.has(id)?(STORE[id]||(STORE[id]=mkNode("div"))):null;
let docTitle="";
Object.defineProperty(global.document,"title",{get(){return docTitle;},set(v){docTitle=String(v);},configurable:true});
const byId=id=>global.document.getElementById(id);
const main=()=>byId("main");
function toggleStub(){
  const grp=mkNode("div"),btns=["en","es","fr"].map(l=>{const b=mkNode("button");b.dataset.lang=l;return b;});
  global.document.querySelectorAll=sel=>sel===".lang"?[grp]:sel===".lang button"?btns:[];
  return {grp,btns,press(l){const b=btns.find(x=>x.dataset.lang===l);b._on.click({target:b});}};}

const pages=[];
function closePages(){for(const p of pages.splice(0)) p.close();}
function boot(){const API={};let open=true;const timers=new Set(),on={};
  const setTimeout=(f,ms,...a)=>{const h=global.setTimeout(()=>{timers.delete(h);f(...a);},ms);timers.add(h);return h;};
  const clearTimeout=h=>{timers.delete(h);global.clearTimeout(h);};
  const window=Object.assign(Object.create(global.window),{addEventListener(k,f){(on[k]=on[k]||[]).push(f);}});
  pages.push({close(){if(!open) return;(on.pagehide||[]).forEach(f=>f());open=false;
    timers.forEach(h=>global.clearTimeout(h));timers.clear();}});
  const toggle=toggleStub();
  eval(src+`
;Object.defineProperties(API,Object.getOwnPropertyDescriptors({
  get lang(){return lang},set lang(v){lang=v}, get view(){return view},set view(v){view=v},
  get TPL(){return TPL}, get S(){return S}, get D(){return D},
  T, TSRC, CALLOUT_KINDS,
  createBooklet, closeBooklet, saveLocal, addModule, addModuleText,
  moduleTextProblems, editTemplate, render,
  loadText, parseFile, applyParsed, toMarkdown, allModules, tplModes, tplWidgets, isMulti,
  moduleView:id=>MODULE_VIEW+id, openExport, draftFor, keptFor, queryEntries, finalizeEntry, pickLang
}));`);
  API.toggle=toggle;return API;}
const wipe=()=>{closePages();for(const k of Object.keys(LS)) delete LS[k];STORE={};docTitle="";delete global.fetch;};

/* every node under n that pred picks */
const find=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);(n.children||[]).forEach(c=>find(c,pred,out));}return out;};
const hasClass=cls=>n=>new RegExp("(^|\\s)"+cls+"(\\s|$)").test((n.attrs||{}).class||"");
/* what a node says: its text and the text of everything in it */
const texts=n=>{const out=[];const walk=x=>{if(x==null) return;if(typeof x!=="object"){out.push(String(x));return;}
  if(x._text) out.push(x._text);(x.children||[]).forEach(walk);};walk(n);return out.join(" ").replace(/\s+/g," ").trim();};
/* every string a reader or a screen reader meets under n, with where it was */
const SPOKEN=["aria-label","title","placeholder","alt","aria-description"];
const collect=(n,out,where)=>{if(n==null) return out;if(typeof n!=="object"){const s=String(n).trim();if(s) out.push([s,where]);return out;}
  if(n._text&&n._text.trim()) out.push([n._text.trim(),where]);
  if(n._html) n._html.replace(/<[^>]*>/g,"\n").split("\n").map(x=>x.trim()).filter(Boolean).forEach(x=>out.push([x,where]));
  for(const k of SPOKEN) if(n.attrs&&n.attrs[k]!==undefined&&String(n.attrs[k]).trim()) out.push([String(n.attrs[k]).trim(),where+" ["+k+"]"]);
  (n.children||[]).forEach(c=>collect(c,out,where));return out;};
/* press whatever the page wired to a node's click */
const click=n=>{if(!n._on.click) throw new Error("nothing is wired to this "+n.tagName);n._on.click({target:n,preventDefault(){}});};

module.exports={R,html,src,LS,PREF,boot,wipe,closePages,byId,main,find,hasClass,texts,collect,click,
  get docTitle(){return docTitle;}};
