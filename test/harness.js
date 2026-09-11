// minimal DOM stub so the app's pure logic (export/import) can be exercised in node
const mk=(tag)=>{const n={tagName:tag,children:[],attrs:{},style:{},value:"",_text:"",classList:{add(){},remove(){},toggle(){},contains(){return false}},
  setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},hasAttribute(k){return k in this.attrs},getAttribute(k){return this.attrs[k]},
  addEventListener(){},append(...k){this.children.push(...k)},prepend(){},remove(){},querySelector(){return mk("div")},querySelectorAll(){return []},
  get textContent(){return this._text},set textContent(v){this._text=v},get innerHTML(){return ""},set innerHTML(v){this.children=[]},focus(){},click(){}};
  Object.defineProperty(n,"dataset",{value:{}}); return n;};
const store={};
const _ls={};
global.localStorage={getItem:k=>(k in _ls?_ls[k]:null),setItem:(k,v)=>{_ls[k]=String(v)},removeItem:k=>{delete _ls[k]},clear:()=>{for(const k in _ls) delete _ls[k]}};
global.__ls=_ls;
/* getElementById returns null for anything that is not actually in the page,
   exactly as a browser does. The old stub handed back a fresh element for ANY
   id, which meant a lookup that would be null in a browser passed silently —
   that is how a deleted dialog left `veilPhone` behind and threw at load on the
   live site while every test here stayed green. */
const _markup=require("fs").readFileSync(__dirname+"/../booklet.html","utf8");
const _body=_markup.slice(_markup.indexOf("<body>"), _markup.indexOf("<script>"));
const _realIds=new Set([..._body.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
global.document={createElement:mk,
  getElementById:id=>_realIds.has(id)?(store[id]||(store[id]=mk("div"))):null,
  querySelectorAll:()=>[],addEventListener(){},body:mk("body"),documentElement:mk("html"),get title(){return ""},set title(v){}};
global.document.body.dataset={};
global.window={addEventListener(){},scrollTo(){}};
global.navigator={clipboard:{writeText:async()=>{}}};
global.IntersectionObserver=class{observe(){}disconnect(){}};
global.Blob=class{constructor(){}};global.URL={createObjectURL:()=>"blob:x",revokeObjectURL(){}};
global.FileReader=class{readAsText(){}};
global.requestAnimationFrame=()=>{};
global.setTimeout=setTimeout;
const html=require("fs").readFileSync(__dirname+"/../booklet.html","utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
// expose internals for testing
eval(src + "\nglobal.API={getLIB:()=>LIBRARY(),getTPL:()=>TPL,EMPTY_BOOKLET,SHELF:()=>SHELF,shelfAdd,moduleFromText,tplWidgets,widgetOf,widgetForEngine,addWidget,ENGINES,wrapperConfig,loadShelf,modeOf,blocksOf,menuOf,pinnedOf,pageSeed,blockLines,mapCards,tplModes,tplModules,moduleOf,allMenuKeys,toMarkdown,parseFile,applyParsed,saveLocal,loadLocal,clearLocal,safetyLines,getS:()=>S,setS:v=>{S=v},getD:()=>D,setD:v=>{D=v},emptyS,emptyToday,emptyCheckin,emptyArea,setLang:l=>{lang=l},getLang:()=>lang,render,setView:v=>{view=v},setTPL:v=>{TPL=v},editTemplate,blankBlock,reorderIn,blockName,BLOCK_KINDS,addModule,removeModule,deleteModule,putBack,moveModule,allModules,parkedModules,keysOf,inOrder,lockText,unlockText,lockedEnvelope,hasCrypto,resetTPL:()=>{TPL=EMPTY_BOOKLET;SHELF={}}};");
module.exports=global.API;
