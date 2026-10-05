// One page load of booklet.html in node, with a DOM that remembers what was drawn.
//
// A recording DOM: every node keeps its
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

const mkNode=tag=>{const n={tagName:tag,children:[],attrs:{},style:{},dataset:{},_text:"",_html:"",_on:{},
  setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return k in this.attrs?this.attrs[k]:null;},
  removeAttribute(k){delete this.attrs[k];},hasAttribute(k){return k in this.attrs;},
  classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(k,f){this._on[k]=f;},
  append(...k){this.children.push(...k);},prepend(...k){this.children.unshift(...k);},remove(){},
  querySelector(){return mkNode("div");},querySelectorAll(){return [];},focus(){},click(){},scrollIntoView(){},
  get textContent(){return this._text||this.children.map(c=>typeof c==="string"?c:(c&&c.textContent)||"").join("");},set textContent(v){this._text=String(v);this.children=[];},
  get innerHTML(){return this._html;},set innerHTML(v){this._html=String(v);this.children=[];},
  get value(){return this._value||"";},set value(v){this._value=v;}};return n;};
const body=html.slice(html.indexOf("<body>"),html.indexOf("<script>"));
const realIds=new Set([...body.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
let STORE={};
global.document.createElement=mkNode;
global.document.createElementNS=(ns,tag)=>mkNode(tag);
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
  get lang(){return lang},set lang(v){lang=v}, get screen(){return screen},set screen(v){screen=v},
  get BOOK(){return BOOK}, get STATE(){return STATE}, get DRAFTS(){return DRAFTS},
  STRINGS, STRINGS_SRC, createBooklet, closeBooklet, openBooklet, saveLocal, addModule, addModuleText,
  moduleTextProblems, editBook, render,
  loadText, parseFile, applyParsed, toMarkdown, allModules, bookActivities, isMulti,
  moduleScreen:id=>MODULE_SCREEN+id, answersFor, answersIn, peekAnswers, rekeyFromV08, addrOf, scopeOfAddr, shortId, widgetOf, figureFor, holderOf, RM_STATE, pageNowKey, get openChip(){return openChip}, ownEarlier, readingPlan, sectionLede, readsOnly, mdNodes, activityOf, mdBlockNodes, draftFor, keptFor, queryEntries, finalizeEntry, showPage, niceScale, thinLabels, lineSeries, lineDomain, viewNodes, dataSet, entrySet, rolesOf, rowTone, pill, viewControls, VIEWSTATE, viewState, QUESTION_KINDS, QUESTION_BLOCK, SUMMARY, DRAW_BLOCK, QUERY_KEYS, QUERY_VIEWS, VIEW_DRAWS, CONTROLS_MIN, readTheme, themeDerive, TH_PAIRS, toneOf, cellColor, cellStyle, themeBaseTable,
  get currentId(){return currentId}, get FILE_NOTES(){return FILE_NOTES}, KIND_SETTINGS, NUMBER_SETTINGS, fieldSummary, readQuery,
  removeModule, moduleWork, removeModuleControl, PAGE_NOW, FORMAT_VERSION, versionOf, versionCmp, renameBooklet, renameStored, setTitleIn, nameBooklet, noticeNode, dataSections, bookletName, readLib, flushSave, exportName, fileBase, tabName, remarkSaved, blankBook, nameRow, renderBooklets, diagramRisk, mermaidNode, markerOf, otherMarker, isBooklet, plainText, startScreen, homeButton, openFromList
}));`);
  API.toggle=toggle;return API;}
const wipe=()=>{closePages();for(const k of Object.keys(LS)) delete LS[k];STORE={};docTitle="";delete global.fetch;};

/* every node under n that pred picks */
const find=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);(n.children||[]).forEach(c=>find(c,pred,out));}return out;};
const hasClass=cls=>n=>new RegExp("(^|\\s)"+cls+"(\\s|$)").test((n.attrs||{}).class||"");
/* what a node says: its text and the text of everything in it */
const texts=n=>{const out=[];const walk=x=>{if(x==null) return;if(typeof x!=="object"){out.push(String(x));return;}
  if(x._text) out.push(x._text);(x.children||[]).forEach(walk);};walk(n);return out.join(" ").replace(/\s+/g," ").trim();};
module.exports={R,html,src,boot,wipe,closePages,byId,main,find,hasClass,texts};
