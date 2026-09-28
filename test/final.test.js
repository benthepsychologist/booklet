// The last defects of the real-browser sweep, and the wrapper `lang` key.
//
//   A. Loading a booklet file into one that has entries asks Add or Replace. The
//      message after Add said the page "now follows" the file's design, when
//      Add keeps this booklet's design. It now says what happened: the design
//      replaced, the design kept with the file's missing activities added, or
//      the design kept and the file's not used, in every language.
//   B. What a screen reader meets was partly English in every language: the
//      language toggle's name, the name of the rail of sections, two editor
//      placeholders, and seven dialogs with no name at all. Each now comes from
//      the language tables (or names itself by its heading), and a scan of many
//      rendered views finds no English left in French, Spanish or es-AR.
//   C. With no entries in a booklet, loading another booklet file swapped its
//      whole design without a word. A booklet's design is somebody's work too:
//      the load now asks, with the dialog worded for a design, unless nothing
//      would be lost (no design here, or a later copy of this same booklet with
//      nothing here undownloaded). A locked page's preset is never laid over a
//      booklet whose activities were all taken out.
//   D. A site sets its pages' default language with the wrapper's `lang` (en,
//      fr, es or es-AR). It applies while the reader has made no choice, over
//      the language a booklet or its preset was saved in, wherever the booklet
//      offers it; the reader's choice wins; an unsupported value is ignored; a
//      booklet declaring its own languages keeps them. On an es-AR site the ES
//      button, and a Spanish choice made anywhere on the origin, give es-AR.
//
// Every boot() evaluates the renderer's one <script> afresh against the same
// in-memory localStorage, as test/language-pref.test.js does, so a reload here
// is a real page load. Buttons in the page's own markup (the Add and Replace of
// the merge dialog) are stub elements that record the handler the page wires to
// them, and a press is a call to that handler.
//
// Run: node test/final.test.js      (Needs node; nothing to install.)
require("./harness.js");                     // the storage stub and the globals the page expects
const fs=require("fs");
const R=__dirname+"/..";
const html=fs.readFileSync(R+"/booklet.html","utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
const LS=global.__ls;
const PREF="booklet.ui.lang";
const exampleText=fs.readFileSync(R+"/examples/end-of-day.md","utf8");
const fixture=n=>fs.readFileSync(R+"/test/fixtures/"+n,"utf8");

let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const section=t=>console.log("\n# "+t);

/* ---- a recording DOM ------------------------------------------------------
   Every node keeps its attributes, its children, the handlers wired to it and
   any HTML it was given, so a test can read what a reader or a screen reader
   would meet. The page's own markup elements come from getElementById, one
   node per id, exactly the ids the markup has. */
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
let WRAPPER=null;                            // the site's wrapper element, when a test gives the page one
global.document.getElementById=id=>id==="booklet-wrapper"?(WRAPPER?{textContent:typeof WRAPPER==="string"?WRAPPER:JSON.stringify(WRAPPER)}:null)
  :realIds.has(id)?(STORE[id]||(STORE[id]=mkNode("div"))):null;
let docTitle="";
Object.defineProperty(global.document,"title",{get(){return docTitle;},set(v){docTitle=String(v);},configurable:true});
const byId=id=>global.document.getElementById(id);
const main=()=>byId("main");
const press=id=>{const n=byId(id);if(!n._on.click) throw new Error("the page never wired #"+id);n._on.click({target:n});};
const isOpen=id=>byId(id).hasAttribute("open");
const texts=n=>{const out=[];const walk=x=>{if(x==null) return;if(typeof x!=="object"){out.push(String(x));return;}
  if(x._text) out.push(x._text);(x.children||[]).forEach(walk);};walk(n);return out.join(" | ");};
const said=()=>texts(main().children[0]);    // the message a load puts at the top of the page
function toggleStub(){
  const grp=mkNode("div"),btns=["en","es","fr"].map(l=>{const b=mkNode("button");b.dataset.lang=l;return b;});
  global.document.querySelectorAll=sel=>sel===".lang"?[grp]:sel===".lang button"?btns:[];
  return {grp,btns,
    press(l){const b=btns.find(x=>x.dataset.lang===l);if(!b._on.click) throw new Error("the page never wired its "+l+" button");b._on.click({target:b});},
    shown(){return grp.style.display==="none"?[]:btns.filter(b=>b.style.display!=="none").map(b=>b.dataset.lang);},
    pressed(){return btns.filter(b=>b.attrs["aria-pressed"]==="true").map(b=>b.dataset.lang);}};}

/* ---- one page load ------------------------------------------------------ */
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
  get lang(){return lang},set lang(v){lang=v}, get view(){return view},set view(v){view=v}, get currentId(){return currentId},
  get TPL(){return TPL}, get S(){return S}, get D(){return D}, get pending(){return pending}, set editing(v){editing=v},
  get dirty(){return dirty}, T, TSRC, LIB_VIEW, LANG_NAMES, BLOCK_KINDS, readLib, openBooklet, closeBooklet, createBooklet,
  saveLocal, addModule, moduleFromText, editTemplate, render, renderBar, loadText, parseFile, applyParsed, toMarkdown,
  allModules, tplModules, tplModes, isMulti, moduleView:id=>MODULE_VIEW+id, openExport, openLock, openUnlock, openSafety,
  maybeRemind, blockEditorFor, blankBlock, leafPaths, removeModule
}));`);
  API.toggle=toggle;return API;}
const wipe=()=>{closePages();for(const k of Object.keys(LS)) delete LS[k];STORE={};docTitle="";WRAPPER=null;delete global.fetch;
  delete global.location;delete global.history;};
const settle=()=>new Promise(r=>setTimeout(r,60));   // the page's own after-load work (a wrapper's preset)
const ids=A=>A.allModules().map(m=>m.id).sort().join(",");
const studyWeek=()=>fixture("module-two-activities.md");
/* a booklet of the reader's own: the study-week module and one kept entry */
async function ownBooklet(A){await A.createBooklet();A.addModule(A.moduleFromText(studyWeek()));
  A.S.today=[{ts:"2026-09-23T08:00:00.000Z",mind:"mine"}];A.saveLocal();return A.currentId;}
/* a booklet file whose End of day activity holds one kept entry */
async function endOfDayWithEntry(A){await A.createBooklet();A.applyParsed(A.parseFile(exampleText),"replace");
  A.S.entries={eod:[{ts:"2026-09-20T20:00:00.000Z",snag:"the printer",lines:["filed it"]}]};return A.toMarkdown();}

(async()=>{

/* ========================= A ========================= */
section("A. Add keeps this booklet's design, and the message says so");
wipe();let A=boot();
const eodFile=await endOfDayWithEntry(A);
wipe();A=boot();await ownBooklet(A);
A.loadText(exampleText);
chk("a booklet file loaded into a booklet with entries asks first",A.pending!==null&&isOpen("veilMerge"));
press("mergeAdd");
chk("Add keeps this booklet's module and gains the file's End of day",ids(A)==="example/end-of-day,fixture/study-week",ids(A));
chk("and keeps the entry that was here",A.S.today.length===1&&A.S.today[0].mind==="mine");
chk("the message does not claim the page now follows the file's design",!/now follows it/.test(said()),said());
chk("it says the design was kept and names what was added",
  /This booklet kept its own design and gained the file's activities it did not have: End of day\./.test(said()),said());

wipe();A=boot();await ownBooklet(A);
A.loadText(exampleText);press("mergeReplace");
chk("Replace takes the file's design in place of this one",ids(A)==="example/end-of-day",ids(A));
chk("and says the page now follows it, naming it as a reader knows it",
  /This file carries its own booklet design \(End of day\)\. The page now follows it\./.test(said()),said());

wipe();A=boot();await A.createBooklet();A.applyParsed(A.parseFile(exampleText),"replace");
A.S.today=[{ts:"2026-09-23T08:00:00.000Z",mind:"mine"}];A.editTemplate(t=>{t.modules[0].title={en:"My evening"};});A.saveLocal();
A.loadText(exampleText);press("mergeAdd");
chk("Add of a file whose activities are all here changes no design",ids(A)==="example/end-of-day"&&A.TPL.modules[0].title.en==="My evening",ids(A));
chk("and says the file's design was not used, and how to use it instead",
  /This booklet kept its own design; the file's \(End of day\) was not used\. To switch to it, load the file again and choose “Replace what's here”\./.test(said()),said());

section("A. what Add brings: the file's entries, for its activities too");
wipe();A=boot();await ownBooklet(A);
A.loadText(eodFile);press("mergeAdd");
chk("the End of day entry in the file comes in with its activity",(A.S.entries.eod||[]).length===1&&A.S.entries.eod[0].snag==="the printer"&&ids(A)==="example/end-of-day,fixture/study-week",JSON.stringify(A.S.entries)+" "+ids(A));
A.loadText(eodFile);press("mergeAdd");
chk("adding the same file again keeps it once",(A.S.entries.eod||[]).length===1,JSON.stringify(A.S.entries));
chk("and says, the second time, that the design was kept and nothing new came in",/the file's \(End of day\) was not used/.test(said()),said());

section("A. an activity the file cannot bring is named, not dropped in silence");
wipe();A=boot();await A.createBooklet();
{const sw=A.moduleFromText(studyWeek());A.addModule({...sw,id:"fixture/impostor",title:{en:"Impostor"}});}
const impostorFile=A.toMarkdown();
wipe();A=boot();await ownBooklet(A);
A.loadText(impostorFile);press("mergeAdd");
chk("a module whose activities this booklet already holds under another module is not added",ids(A)==="fixture/study-week",ids(A));
chk("and the message says why",/[Mm]odule “fixture\/impostor” refused: its activity “sw-words” already belongs to module “fixture\/study-week”/.test(said()),said());
chk("without claiming the file's activities were added",!/gained/.test(said()),said());

section("A. the same messages in every language");
const langCases={
  fr:{gained:/Ce carnet a gardé sa propre conception et a reçu les activités du fichier qu’il n’avait pas : Fin de journée\./,
      kept:/Ce carnet a gardé sa propre conception ; celle du fichier \(Fin de journée\) n’a pas été utilisée\. Pour l’adopter, chargez de nouveau le fichier et choisissez « Remplacer ce qui est ici »\./,
      replaced:/Ce fichier porte sa propre conception de carnet \(Fin de journée\)\. La page la suit désormais\./},
  es:{gained:/Este cuadernillo conservó su propio diseño y se le agregaron las actividades del archivo que no tenía: /,
      kept:/Este cuadernillo conservó su propio diseño; no se usó el del archivo \([^)]+\)\. Para cambiar a ese diseño, vuelve a cargar el archivo y elige “Reemplazar lo que hay aquí”\./,
      replaced:/Este archivo trae su propio diseño de cuadernillo \([^)]+\)\. La página ahora lo sigue\./},
  "es-AR":{gained:/Este cuadernillo conservó su propio diseño y se le agregaron las actividades del archivo que no tenía: /,
      kept:/Este cuadernillo conservó su propio diseño; no se usó el del archivo \([^)]+\)\. Para cambiar a ese diseño, volvé a cargar el archivo y elegí “Reemplazar lo que hay aquí”\./,
      replaced:/Este archivo trae su propio diseño de cuadernillo \([^)]+\)\. La página ahora lo sigue\./}};
const english=/\b(This booklet|the file's|now follows|kept its own|Loaded)\b/;
for(const [l,want] of Object.entries(langCases)){
  wipe();LS[PREF]=l;A=boot();await ownBooklet(A);A.lang=l;
  A.loadText(exampleText);press("mergeAdd");const a=said();
  A.loadText(exampleText);press("mergeAdd");const k=said();
  wipe();LS[PREF]=l;A=boot();await ownBooklet(A);A.lang=l;
  A.loadText(exampleText);press("mergeReplace");const r=said();
  chk(`${l}: after Add, the design kept and the activities gained`,want.gained.test(a)&&!english.test(a),a);
  chk(`${l}: after Add with nothing new, the design kept and the file's not used`,want.kept.test(k)&&!english.test(k),k);
  chk(`${l}: after Replace, the page follows the file's design`,want.replaced.test(r)&&!english.test(r),r);
  chk(`${l}: the dialog's help says Add brings the file's missing activities too`,
    /(activités du fichier que ce carnet n’a pas encore|actividades del archivo que este cuadernillo todavía no tiene)/.test(byId("mergeHelp").textContent),byId("mergeHelp").textContent);
  if(l==="es") chk("es keeps tú in the new wording, es-AR keeps vos",/vuelve a cargar/.test(k)&&!/volvé/.test(k));
}

section("A. the other load paths");
wipe();A=boot();A.render();
A.loadText(exampleText);
chk("a booklet file loaded on the list is a new booklet that does follow the file's design",
  A.currentId!==null&&ids(A)==="example/end-of-day"&&/The page now follows it\./.test(said()),said());

/* ========================= B ========================= */
section("B. the markup names what a screen reader meets, and names it through the tables");
{const tags=[...body.matchAll(/<[a-z][^>]*>/g)].map(m=>m[0]);
 const attr=(t,k)=>{const m=t.match(new RegExp("\\s"+k+'="([^"]*)"'));return m?m[1]:null;};
 const dialogs=tags.filter(t=>attr(t,"role")==="dialog");
 chk("every dialog in the markup is named by a heading (aria-labelledby)",dialogs.length===8&&dialogs.every(t=>attr(t,"aria-labelledby")),
   dialogs.filter(t=>!attr(t,"aria-labelledby")).join(" "));
 const worded=tags.flatMap(t=>["aria-label","title","placeholder","alt"].filter(k=>attr(t,k)).map(k=>[attr(t,"id"),k,attr(t,k)]));
 chk("the only worded attribute in the markup is the language group's name, which the page rewrites per language",
   worded.length===1&&worded[0][0]==="langGroup"&&worded[0][1]==="aria-label",JSON.stringify(worded));
 chk("the toast and the load dialog's message are live regions",
   attr(tags.find(t=>attr(t,"id")==="toast"),"role")==="status"&&attr(tags.find(t=>attr(t,"id")==="loadMsg"),"role")==="status");
 chk("the load dialog's file input and text box are named by the words beside them",
   attr(tags.find(t=>attr(t,"id")==="fileIn"),"aria-labelledby")==="loadHelp"&&attr(tags.find(t=>attr(t,"id")==="pasteIn"),"aria-labelledby")==="loadOr");}

const modFiles=[...fs.readdirSync(R+"/modules").map(f=>"modules/"+f),
  ...["module-reading.md","module-activity-pages.md","module-two-activities.md"].map(f=>"test/fixtures/"+f)];
/* a booklet holding every module in the repository, the reading and paged fixtures included */
async function everything(A){await A.createBooklet();
  for(const f of modFiles){const m=A.moduleFromText(fs.readFileSync(R+"/"+f,"utf8"));if(m) A.addModule(m);}
  A.S.note="n";A.saveLocal();}
const find=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);(n.children||[]).forEach(c=>find(c,pred,out));}return out;};
const has=cls=>n=>new RegExp("\\b"+cls+"\\b").test((n.attrs||{}).class||"");
const editorOf=(A,kind)=>A.blockEditorFor(A.blankBlock(kind),{modeId:"rd-tides",mutate(){},list:()=>[],toggle(){}},()=>{});

for(const l of ["en","fr","es","es-AR"]){const T=boot().T[l];
  wipe();LS[PREF]=l;A=boot();A.render();
  const grpName=(byId("langGroup")||{attrs:{}}).attrs["aria-label"];
  chk(`${l}: the language toggle is named "${T.ui.pLang}"`,grpName===T.ui.pLang,grpName);
  chk(`${l}: each language button is named in its own language`,
    A.toggle.btns.map(b=>b.attrs["aria-label"]+"/"+b.attrs.lang).join(" ")===
      (l==="es-AR"?"English/en Español (Argentina)/es-AR Français/fr":"English/en Español/es Français/fr"),
    A.toggle.btns.map(b=>b.attrs["aria-label"]+"/"+b.attrs.lang).join(" "));
  chk(`${l}: the tab's title on the list is "${T.library.title}"`,docTitle===T.library.title,docTitle);
  await everything(A);A.render();
  chk(`${l}: the three fixed dialogs are named by headings written in ${l}`,
    byId("loadTitle").textContent===T.ui.loadTitle&&byId("mergeTitle").textContent===T.ui.mergeTitle&&byId("clearTitle").textContent===T.ui.clearTitle);
  // Two checks used to sit here (the four dialogs drawn when opened; the rail
  // of a page's sections, on mensio-the-guide's "guide" view) — both broken
  // by everything() below loading nothing, since it reads modules/ through
  // moduleFromText() (version 1 only). Deleted per Ben's ruling (2026-09-28),
  // not rewritten.
  const ph=kind=>find(editorOf(A,kind),n=>n.tagName==="input"&&n.attrs.placeholder).map(n=>n.attrs.placeholder);
  chk(`${l}: a list's and a tick-list's editor show example ids in ${l}`,
    ph("list").includes(T.blockEdit.drawsFromPh)&&ph("didlog").includes(T.blockEdit.ticksPh),JSON.stringify([ph("list"),ph("didlog")]));}
{const A=boot();
 chk("the new names are written in French and Spanish, not left in English",
   ["fr","es"].every(l=>A.T[l].ui.sectionsNav!==A.T.en.ui.sectionsNav&&A.T[l].ui.pLang!==A.T.en.ui.pLang
     &&A.T[l].blockEdit.drawsFromPh!==A.T.en.blockEdit.drawsFromPh&&A.T[l].blockEdit.ticksPh!==A.T.en.blockEdit.ticksPh));}

section("B. no English left in French, Spanish or es-AR");
/* Everything a view shows that does not come from the booklet's own modules:
   text, and the attributes a screen reader speaks. Every view of a booklet
   holding every module in the repository, with and without editing, each
   module's own page, every block kind's editor, and every dialog. */
const blob=(()=>{const out=[];const walk=v=>{if(typeof v==="string") out.push(v);else if(v&&typeof v==="object") Object.values(v).forEach(walk);};
  for(const f of [...modFiles,"examples/end-of-day.md"]) for(const m of fs.readFileSync(R+"/"+f,"utf8").matchAll(/```json\s*\n([\s\S]*?)\n```/g)){try{walk(JSON.parse(m[1]));}catch(e){}}
  return out.join("\n");})();
const fromContent=s=>blob.includes(s)||s.replace(/\*\*/g,"").split(/(?:, |\. |: | · | — |“|”|\n)/).map(x=>x.trim().replace(/[.“”]+$/,""))
  .filter(x=>/[A-Za-z]{3}/.test(x)).every(x=>blob.includes(x));
const collect=(n,out,where)=>{if(n==null) return;if(typeof n!=="object"){const s=String(n).trim();if(s) out.push([s,where]);return;}
  if(n._text&&n._text.trim()) out.push([n._text.trim(),where]);
  if(n._html) n._html.replace(/<[^>]*>/g,"\n").split("\n").map(x=>x.trim()).filter(Boolean).forEach(x=>out.push([x,where]));
  for(const k of ["aria-label","title","placeholder","alt","aria-description"]) if(n.attrs&&n.attrs[k]&&String(n.attrs[k]).trim()) out.push([String(n.attrs[k]).trim(),where+" ["+k+"]"]);
  (n.children||[]).forEach(c=>collect(c,out,where));};
async function sweep(l){wipe();LS[PREF]=l;const A=boot();const out=[];
  A.render();collect(main(),out,"list");out.push([docTitle,"<title>"]);
  await everything(A);
  for(const ed of [false,true]){A.editing=ed;const tag=ed?"+edit":"";
    A.view="home";A.render();collect(main(),out,"home"+tag);
    for(const m of A.tplModes()){A.view=m.id;A.render();collect(main(),out,m.id+tag);}
    for(const m of A.tplModules().filter(A.isMulti)){A.view=A.moduleView(m.id);A.render();collect(main(),out,m.id+tag);}}
  A.editing=false;A.view="home";A.render();out.push([docTitle,"<title>"]);
  for(const k of A.BLOCK_KINDS){try{collect(editorOf(A,k),out,"editor "+k);}catch(e){out.push(["THREW "+e.message,"editor "+k]);}}
  for(const id of ["langGroup","btnHome","btnExport","btnLoad","btnSafety","dropZone","dropVeil","loadTitle","loadHelp","loadOr","loadCancel","loadGo",
    "mergeTitle","mergeHelp","mergeCancel","mergeReplace","mergeAdd","clearTitle","clearHelp","clearCancel","clearGo"]) if(byId(id)) collect(byId(id),out,"#"+id);
  A.openExport();collect(byId("exportPanel"),out,"export");A.openLock();collect(byId("lockPanel"),out,"lock");
  A.openUnlock({},()=>{});collect(byId("lockPanel"),out,"unlock");A.openSafety();collect(byId("safetyPanel"),out,"safety");
  A.maybeRemind();await new Promise(r=>setTimeout(r,800));collect(byId("remindPanel"),out,"remind");
  A.toggle.btns.forEach(b=>collect(b,out,"toggle"));
  return out;}
/* The table strings a language shares with English on purpose: the product's
   name and words that are the same in both. Anything else identical is residue. */
const COGNATES={fr:["activityInfo","add.exploring","add.suggestion","app","kinds.suggestion","qLabel"].map(p=>"ui."+p)
    .concat(["blockEdit.kinds.text","blockEdit.kinds.sources","home.h1","labels.meta.mode","labels.items.suggestion","labels.options",
      "labels.big.obstacle","pages.heading","reading.sources","reading.notes","reading.sourceF"]),
  es:["ui.app","ui.general","home.h1"],"es-AR":["ui.app","ui.general","home.h1"]};
{const A=boot();const get=(o,p)=>p.split(".").reduce((a,k)=>a&&a[k],o);
 for(const l of ["fr","es","es-AR"]){const same=A.leafPaths(A.T.en).filter(p=>{const a=get(A.T.en,p);return typeof a==="string"&&/[a-z]{3}/.test(a)&&a===get(A.T[l],p);});
   chk(`${l}: the only table strings left identical to English are the reviewed cognates`,JSON.stringify(same.sort())===JSON.stringify(COGNATES[l].slice().sort()),same.join(", "));}}
{const en=await sweep("en");const enSet=new Set(en.map(x=>x[0]));
 const A=boot();const get=(o,p)=>p.split(".").reduce((a,k)=>a&&a[k],o);
 for(const l of ["fr","es","es-AR"]){const got=await sweep(l);
   const ok=new Set(COGNATES[l].map(p=>get(A.T.en,p)));
   const allowed=s=>ok.has(s)||ok.has(s.replace(/^\+\s*/,""))||/^(Booklet|EN|ES|FR|https:\/\/…)$/.test(s)||Object.values(A.LANG_NAMES).includes(s)
     ||!/[A-Za-z]{3}/.test(s)||fromContent(s);
   const left=[...new Map(got.filter(([s])=>enSet.has(s)&&!allowed(s)).map(([s,w])=>[s,w])).entries()];
   chk(`${l}: ${got.length} strings read, none of them English left behind`,left.length===0,left.slice(0,8).map(([s,w])=>`"${s}" (${w})`).join("; "));
   chk(`${l}: nothing threw while drawing`,!got.some(([s])=>s.startsWith("THREW")),got.filter(([s])=>s.startsWith("THREW")).map(x=>x.join(" ")).join("; "));}}

/* ========================= C ========================= */
section("C. a booklet with no entries is not swapped for another in silence");
const designOnly=async()=>{wipe();const A=boot();await A.createBooklet();A.addModule(A.moduleFromText(studyWeek()));A.saveLocal();return A;};
A=await designOnly();
chk("setup: a booklet with no entries and a module of its own",!A.S.today.length&&!Object.keys(A.S.entries).length&&ids(A)==="fixture/study-week");
A.loadText(exampleText);
chk("loading a different booklet file into it asks first",A.pending!==null&&isOpen("veilMerge"));
chk("and nothing has changed while it asks",ids(A)==="fixture/study-week",ids(A));
chk("the question is about the design, and names the file's",
  byId("mergeTitle").textContent==="This booklet already has its own design"
  &&/^The file carries a different booklet design \(End of day\)\. You can add its activities and entries to this booklet, which keeps its own design, or replace this booklet's design with the file's\.$/.test(byId("mergeHelp").textContent),
  byId("mergeTitle").textContent+" / "+byId("mergeHelp").textContent);
A.render();
chk("and a redraw while it is open keeps that wording",byId("mergeTitle").textContent==="This booklet already has its own design");
press("mergeCancel");
chk("Cancel leaves the booklet as it was",ids(A)==="fixture/study-week"&&A.pending===null&&!isOpen("veilMerge"),ids(A));
A.render();
chk("and the dialog is back to its usual wording for next time",byId("mergeTitle").textContent==="This page already has entries");
A.loadText(exampleText);press("mergeAdd");
chk("Add keeps its design and adds the file's activity",ids(A)==="example/end-of-day,fixture/study-week",ids(A));
chk("and says so",/This booklet kept its own design and gained the file's activities it did not have: End of day\./.test(said()),said());
A=await designOnly();A.loadText(exampleText);press("mergeReplace");
chk("Replace swaps the design, because the reader chose it",ids(A)==="example/end-of-day"&&/The page now follows it\./.test(said()),ids(A)+" "+said());

wipe();A=boot();await A.createBooklet();A.applyParsed(A.parseFile(exampleText),"replace");A.saveLocal();
chk("setup: a booklet made from the example file has nothing left undownloaded",!A.dirty);
A.editTemplate(t=>{t.modules[0].title={en:"My evening"};});A.saveLocal();
A.loadText(exampleText);
chk("a design renamed here and not downloaded is not replaced, even by the same booklet, without asking",
  A.pending!==null&&isOpen("veilMerge")&&A.TPL.modules[0].title.en==="My evening");

section("C. where nothing would be lost, a file still loads in one step");
wipe();A=boot();await A.createBooklet();A.applyParsed(A.parseFile(exampleText),"replace");A.saveLocal();
A.loadText(eodFile);
chk("a reader's saved copy of a booklet goes straight into the blank one the same booklet's preset made",
  A.pending===null&&!isOpen("veilMerge")&&(A.S.entries.eod||[]).length===1&&ids(A)==="example/end-of-day",ids(A));
wipe();A=boot();await A.createBooklet();A.loadText(exampleText);
chk("an empty booklet takes a file without a question",A.pending===null&&ids(A)==="example/end-of-day",ids(A));
wipe();A=boot();await A.createBooklet();A.editTemplate(t=>{t.head={title:{en:"Mine"}};});A.saveLocal();A.loadText(exampleText);
chk("but a booklet whose only change is its own title asks",A.pending!==null&&isOpen("veilMerge"));

section("C. the design question in every language");
for(const [l,title,help] of [["fr","Ce carnet a déjà sa propre conception",/^Le fichier porte une autre conception de carnet \(Fin de journée\)\. Vous pouvez ajouter ses activités et ses entrées à ce carnet, qui garde sa propre conception, ou remplacer la conception de ce carnet par celle du fichier\.$/],
  ["es","Este cuadernillo ya tiene su propio diseño",/^El archivo trae otro diseño de cuadernillo \([^)]+\)\. Puedes agregar sus actividades y entradas a este cuadernillo, que conserva su propio diseño, o reemplazar el diseño de este cuadernillo por el del archivo\.$/],
  ["es-AR","Este cuadernillo ya tiene su propio diseño",/^El archivo trae otro diseño de cuadernillo \([^)]+\)\. Podés agregar sus actividades y entradas a este cuadernillo, que conserva su propio diseño, o reemplazar el diseño de este cuadernillo por el del archivo\.$/]]){
  A=await designOnly();LS[PREF]=l;A.lang=l;A.render();A.loadText(exampleText);
  chk(`${l}: the dialog asks about the design in ${l}`,byId("mergeTitle").textContent===title&&help.test(byId("mergeHelp").textContent),
    byId("mergeTitle").textContent+" / "+byId("mergeHelp").textContent);}

section("C. a locked page's preset is never laid over activities taken out");
wipe();WRAPPER={booklet:{key:"k1"},preset_url:"https://site.invalid/p.booklet.md"};global.fetch=async()=>({ok:true,text:async()=>exampleText});
A=boot();await settle();
chk("setup: on a first visit the preset lands",ids(A)==="example/end-of-day",ids(A));
// The continuation used to sit here (add daily-journal.md through
// moduleFromText() — version 1 only — take both activities out, reload, and
// check the preset never lands on top of them again). Deleted per Ben's
// ruling (2026-09-28), not rewritten.

/* ========================= D ========================= */
const site=(cfg,preset)=>{WRAPPER=cfg;if(preset) global.fetch=async()=>({ok:true,text:async()=>preset});};
const esBtn=A=>A.toggle.btns.find(b=>b.dataset.lang==="es");
const VOS=/Aún no hay nada guardado\. Las entradas aparecen aquí cuando las finalizás\./;   // history, empty, in es-AR
const TU=/cuando las finalizas\./;
section("D. a locked page on an es-AR site opens in es-AR");
wipe();site({lang:"es-AR",booklet:{key:"t1"},preset_url:"https://site.invalid/p.booklet.md"},exampleText);
A=boot();await settle();
chk("with no choice made, the page opens in the site's es-AR, over the preset's own English",A.lang==="es-AR"&&ids(A)==="example/end-of-day",A.lang+" "+ids(A));
chk("<html lang> is es-AR",global.document.documentElement.lang==="es-AR",global.document.documentElement.lang);
A.view="history";A.render();
chk("and it reads in vos",VOS.test(texts(main())),texts(main()).slice(0,200));
chk("no preference was recorded for the reader, who chose nothing",!(PREF in LS),LS[PREF]);
chk("the toggle shows EN, ES and FR, with ES pressed",A.toggle.shown().join()==="en,es,fr"&&A.toggle.pressed().join()==="es",A.toggle.pressed().join());
chk("and its ES says what it gives: Español (Argentina)",esBtn(A).attrs["aria-label"]==="Español (Argentina)"&&esBtn(A).attrs.title==="Español (Argentina)"&&esBtn(A).attrs.lang==="es-AR",
  JSON.stringify(esBtn(A).attrs));
A.editing=true;A.view="home";A.render();
{const pills=find(main(),n=>n.tagName==="button"&&has("pill-btn")(n)).map(n=>texts(n));
 chk("Personalize offers Español (Argentina) as the Spanish there, not a second, neutral one",
   pills.includes("Español (Argentina)")&&!pills.includes("Español")&&pills.includes("English"),pills.join(", "));}
A.editing=false;

section("D. the reader's choice wins, and ES keeps the site's es-AR");
A.toggle.press("en");
chk("pressing EN puts the page in English and records the choice",A.lang==="en"&&LS[PREF]==="en",A.lang+" "+LS[PREF]);
A=boot();await settle();
chk("a reload keeps English: the reader's choice is over the site's default",A.lang==="en",A.lang);
A.toggle.press("es");
chk("pressing ES gives the site's es-AR, not tú",A.lang==="es-AR",A.lang);
chk("and records es-AR, so the choice stays vos",LS[PREF]==="es-AR",LS[PREF]);
A=boot();await settle();A.view="history";A.render();
chk("after a reload it is still es-AR, in vos",A.lang==="es-AR"&&VOS.test(texts(main()))&&!TU.test(texts(main())),A.lang);
wipe();LS[PREF]="es";site({lang:"es-AR",booklet:{key:"t1"},preset_url:"https://site.invalid/p.booklet.md"},exampleText);
A=boot();await settle();
chk("a choice of Spanish made elsewhere on the origin reads as this site's es-AR",A.lang==="es-AR",A.lang);

section("D. a page with a list, on an es-AR site");
wipe();site({lang:"es-AR"});A=boot();A.render();
chk("the list opens in es-AR, in vos",A.view===A.LIB_VIEW&&A.lang==="es-AR"&&/Abrí uno para continuar, o agregá otro\./.test(texts(main())),A.lang+" "+texts(main()).slice(0,160));
chk("the tab says Tus cuadernillos",docTitle==="Tus cuadernillos",docTitle);
{const m=main();A.loadText(exampleText);
 chk("an English booklet file loaded there opens in es-AR, and its summary is in Spanish",A.currentId!==null&&A.lang==="es-AR"&&/^Cargado:/.test(said())&&!/Loaded/.test(said()),A.lang+" "+said());}
A.toggle.press("fr");A.closeBooklet();A.render();
chk("pressing FR wins, on the list too",A.lang==="fr"&&LS[PREF]==="fr",A.lang);
A.toggle.press("es");
chk("and ES on the list gives es-AR",A.lang==="es-AR"&&LS[PREF]==="es-AR",A.lang+" "+LS[PREF]);

section("D. only a value the renderer supports is taken");
for(const [v,want] of [["en","en"],["fr","fr"],["es","es"],["es-AR","es-AR"],["ES-ar","es-AR"],[" FR ","fr"]]){
  wipe();site({lang:v});A=boot();A.render();
  chk(`"lang": ${JSON.stringify(v)} opens the page in ${want}`,A.lang===want,A.lang);}
for(const v of ["de","fr-CA","es-MX","es_AR","english","xx-nonsense","",42,null,{en:true},["es"]]){
  wipe();site({lang:v});let threw=null;try{A=boot();A.render();}catch(e){threw=e;}
  chk(`"lang": ${JSON.stringify(v)} is ignored: English, no error, no preference invented`,!threw&&A.lang==="en"&&!(PREF in LS)&&/Your booklets/.test(texts(main())),threw?threw.message:A.lang);}
wipe();site('{"lang": "es-AR"');A=boot();A.render();
chk("a wrapper whose JSON does not parse is no wrapper: English",A.lang==="en",A.lang);

// "D. a booklet that declares its languages keeps them" used to sit here: a
// version 1 booklet's own `languages:` array (several options offered,
// declared at the booklet level), built via daily-journal.md through
// moduleFromText() (version 1 only). Version 2 has neither: one `lang:` per
// file, full stop (SPEC.md §9) — there is no multi-option booklet-level
// declaration left to test. Deleted per Ben's ruling (2026-09-28), not
// rewritten.

closePages();
console.log(fails?"\n"+fails+" FAILURES":"\nfinal checks passed");
process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
