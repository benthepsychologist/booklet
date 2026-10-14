// The reader's language: a choice this browser keeps, not a booklet's data.
//
// The interface language follows SPEC.md section 9 (renderer 0.13.1, review D17): the reader's chosen language if there
// is one, whatever a booklet says (a choice of Spanish reads an es-AR booklet in its own es-AR); else the booklet's own `lang` when the renderer has its strings (es-AR has a table of
// its own; a variant it has none for reads its language's); else English. The EN / ES / FR toggle always shows, on
// "Your booklets" and in every booklet. A pick is kept in this browser under a key of its own, survives a reload whether
// or not anything was edited, and is never written into a booklet.
//
// Every boot() evaluates the renderer's one <script> afresh against the same
// in-memory localStorage, as test/library.test.js does, so a reload here is a
// real page load. The header toggle is a set of stub buttons the page wires up
// itself, and a pick is a click on one of them.
//
// Run: node test/language-pref.test.js      (Needs node; nothing to install.)
require("./harness.js");                     // the DOM and storage stubs
const fs=require("fs");
const R=__dirname+"/..";
const html=fs.readFileSync(R+"/booklet.html","utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
const LS=global.__ls;
const PREF="booklet.ui.lang";
const exampleText=fs.readFileSync(R+"/examples/mindful-check-in.booklet.md","utf8");
const fixtureModule=fs.readFileSync(R+"/test/fixtures/module-daily-journal.md","utf8");
const tidesText=fs.readFileSync(R+"/examples/how-tides-work.booklet.md","utf8");

let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const section=t=>console.log("\n# "+t);

/* ---- the DOM stub: clickable nodes, and a header toggle per page ---------- */
const origCreate=global.document.createElement;
global.document.createElement=tag=>{const n=origCreate(tag);n._on={};n.addEventListener=(k,f)=>{n._on[k]=f;};return n;};
const texts=n=>{const out=[];const walk=x=>{if(x==null) return;if(typeof x!=="object"){out.push(String(x));return;}
  if(x._text) out.push(x._text);(x.children||[]).forEach(walk);};walk(n);return out.join(" | ");};
const findAll=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);(n.children||[]).forEach(c=>findAll(c,pred,out));}return out;};
const main=()=>global.document.getElementById("main");
function toggleStub(){
  const mk=l=>{const b={dataset:{lang:l},style:{},attrs:{},_on:{},
    setAttribute(k,v){this.attrs[k]=String(v);},getAttribute(k){return this.attrs[k];},
    addEventListener(k,f){this._on[k]=f;}};return b;};
  const grp={style:{}},btns=["en","es","fr"].map(mk);
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
  get lang(){return lang},set lang(v){lang=v}, get screen(){return screen}, get currentId(){return currentId},
  get STATE(){return STATE}, answersIn, get storageOk(){return storageOk},
  LIB_SCREEN, closeBooklet, createBooklet, saveLocal, addModuleText,
  render, loadText
}));`);
  API.toggle=toggle;return API;}
const wipe=()=>{closePages();for(const k of Object.keys(LS)) delete LS[k];delete global.location;delete global.history;};

/* A booklet kept in this browser, made from a file whose front matter gives its title and its one language (the
   daily-journal module under another name). Returns its id. */
const bookletText=(title,lang)=>fixtureModule.replace(/^title: .*$/m,"title: "+JSON.stringify(title)).replace(/^lang: .*$/m,"lang: "+lang);
function makeBooklet(A,{title,lang}){
  A.loadText(bookletText(title,lang));
  A.answersIn("").note="written in "+title;A.saveLocal();
  return A.currentId;}
/* open a booklet the way a reader does: from its card on "Your booklets" */
function openFromCard(A,title){A.render();
  const card=findAll(main(),n=>n.attrs&&/\bmode\b/.test(n.attrs.class||"")&&texts(n).includes(title))[0];
  const btn=card&&findAll(card,n=>n.tagName==="button"&&/\bprimary\b/.test((n.attrs||{}).class||""))[0];
  if(!btn) throw new Error("no card for "+title);
  btn._on.click({target:btn});}
const toList=A=>{A.closeBooklet();A.render();};

(async()=>{

section("with no choice, a booklet's own language, where the renderer has it");
wipe();
let A=boot();A.render();
chk("a first visit: the list in English, and every button of the toggle shown",A.lang==="en"&&A.toggle.shown().join()==="en,es,fr"&&A.toggle.pressed().join()==="en",A.lang+" / "+A.toggle.shown().join());
const ids={};
for(const [title,l] of [["English one","en"],["Saved in French","fr"],["Argentine one","es-AR"],["Mexican one","es-MX"],["German one","de"]]) ids[l]=makeBooklet(A,{title,lang:l});
const saved=Object.fromEntries(Object.keys(LS).filter(k=>k.startsWith("booklet.b.")).map(k=>[k,LS[k]]));
toList(A);
chk("and no preference was invented along the way",!(PREF in LS));
for(const [title,l,want,pressed] of [["English one","en","en","en"],["Saved in French","fr","fr","fr"],["Argentine one","es-AR","es-AR","es"],["Mexican one","es-MX","es","es"],["German one","de","en","en"]]){
  openFromCard(A,title);
  chk("a booklet whose lang is "+l+" reads in "+want+", with the whole toggle and "+pressed.toUpperCase()+" pressed",A.currentId===ids[l]&&A.lang===want&&A.toggle.shown().join()==="en,es,fr"&&A.toggle.pressed().join()===pressed,A.lang+" / "+A.toggle.shown().join()+" / "+A.toggle.pressed().join());
  toList(A);}
chk("back on the list with no choice: English",A.lang==="en",A.lang);

section("a reader who chose a language keeps it, whatever a booklet says");
A.toggle.press("fr");
chk("pressing FR on the list puts the list in French",A.lang==="fr"&&/Vos carnets/.test(texts(main())),A.lang);
chk("and records the choice under a key of its own",LS[PREF]==="fr",LS[PREF]);
chk("and writes nothing into any booklet's saved data",Object.keys(saved).every(k=>LS[k]===saved[k]));
for(const [title,l] of [["English one","en"],["Argentine one","es-AR"],["German one","de"]]){
  openFromCard(A,title);
  chk("a booklet whose lang is "+l+" reads in French, the reader's choice, with FR pressed",A.currentId===ids[l]&&A.lang==="fr"&&A.toggle.pressed().join()==="fr",A.lang);
  toList(A);}
openFromCard(A,"Argentine one");A.toggle.press("es");
chk("pressing ES in a booklet whose lang is es-AR records Spanish and keeps the booklet's own es-AR, with ES pressed",A.lang==="es-AR"&&LS[PREF]==="es"&&A.toggle.pressed().join()==="es",A.lang+" / "+LS[PREF]);
chk("and changes nothing the booklet keeps",LS["booklet.b."+ids["es-AR"]]===saved["booklet.b."+ids["es-AR"]]);
toList(A);
chk("the list is in the reader's Spanish, the neutral table",A.lang==="es"&&/Tus cuadernillos/.test(texts(main())),A.lang);
openFromCard(A,"English one");
chk("and so is another booklet",A.lang==="es",A.lang);
toList(A);openFromCard(A,"Mexican one");
chk("and one whose lang is es-MX, a variant with no table of its own",A.lang==="es",A.lang);
toList(A);

section("the choice outlives a reload with no edit");
openFromCard(A,"English one");
const before=LS["booklet.b."+ids.en];
A.toggle.press("fr");
chk("pressing FR inside a booklet puts it in French",A.lang==="fr",A.lang);
chk("with nothing written to the booklet (no edit was made)",LS["booklet.b."+ids.en]===before);
A=boot();A.render();
chk("the list, reloaded, is French",A.screen===A.LIB_SCREEN&&A.lang==="fr",A.lang);
openFromCard(A,"Saved in French");toList(A);openFromCard(A,"Argentine one");
chk("and so is every booklet",A.lang==="fr",A.lang);

section("a reader who chose French opens how-tides-work with French controls");
wipe();A=boot();A.render();A.toggle.press("fr");
A.loadText(tidesText);
chk("how-tides-work says lang: en, and opens in French: its controls are the renderer's French ones",A.currentId!==null&&A.lang==="fr"&&
  global.document.getElementById("btnExport").textContent==="Envoyer ou sauvegarder une copie"&&A.toggle.pressed().join()==="fr",A.lang+" / "+global.document.getElementById("btnExport").textContent);
chk("its own words stay its own (English)",/tide/i.test(texts(main())));
chk("the toggle is there to change it",A.toggle.shown().join()==="en,es,fr");
A.toggle.press("en");
chk("and EN puts it back in English",A.lang==="en"&&LS[PREF]==="en",A.lang);
{const B=boot();B.render();chk("a choice of English holds on the list after a reload",B.lang==="en"&&B.toggle.pressed().join()==="en");}

section("the buttons are named in the language each gives");
{const names=A.toggle.btns.map(b=>b.dataset.lang+"="+b.attrs["aria-label"]+"/"+b.attrs.lang).join();
 chk("EN English, ES Español, FR Français, each with its own lang",names==="en=English/en,es=Español/es,fr=Français/fr",names);}

section("storage that fails");
wipe();
{const origSet=global.localStorage.setItem,origGetItem=global.localStorage.getItem;
 global.localStorage.setItem=()=>{throw new Error("QuotaExceededError");};
 let threw=null;try{A=boot();}catch(e){threw=e;}
 chk("storage off: the page loads",!threw&&A.storageOk===false,threw&&threw.message);
 const x=makeBooklet(A,{title:"English one",lang:"en"});
 toList(A);A.toggle.press("fr");
 openFromCard(A,"English one");
 chk("and the choice still holds for the visit, in a booklet in English",A.currentId===x&&A.lang==="fr",A.lang);
 global.localStorage.setItem=origSet;
 wipe();
 global.localStorage.getItem=k=>{throw new Error("SecurityError");};
 threw=null;try{A=boot();A.render();A.toggle.press("es");}catch(e){threw=e;}
 chk("storage that refuses every read: the page still loads and a pick still works",!threw&&A.lang==="es",threw&&threw.message);
 global.localStorage.getItem=origGetItem;
 wipe();LS[PREF]="xx-nonsense";
 A=boot();A.render();
 chk("a preference that is not a language is ignored",A.lang==="en",A.lang);}

wipe();
console.log(fails?"\n"+fails+" FAILURES":"\nlanguage preference checks passed");
process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
