// The reader's language: a choice this browser keeps, not a booklet's data.
//
// A reader picks a language on the header toggle (EN / ES / FR) or under
// Personalize. That choice holds on "Your booklets" and in every booklet on the
// origin, survives a reload whether or not anything was edited, and wins over
// the language a booklet was saved in wherever that booklet offers it. A
// booklet's own language is only the fallback: for a reader who never chose, or
// a booklet that does not offer their choice. A choice of Spanish takes a
// booklet's own Argentine Spanish (es-AR), and a single-language booklet always
// reads in its one language, with no toggle.
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
/* This example declares only `lang: en`; these two sections specifically test
   the reader's choice winning over a file's own language WHERE THE FILE OFFERS
   IT, so it is patched to also offer fr/es (prose stays English — only the
   offer, not the wording, matters for this mechanic). */
/* v0.2 declares one language per file (SKILL.md §8) — a translation is a
   sibling file with the same id, never a `languages:` list offering several
   inside one file the way the earlier format did. So loading this single-language
   file keeps its own `en`, whatever the reader's choice was. */
const exampleText=fs.readFileSync(R+"/examples/mindful-check-in.booklet.md","utf8");
const fixtureModule=fs.readFileSync(R+"/test/fixtures/module-daily-journal.md","utf8");

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
  get lang(){return lang},set lang(v){lang=v}, get view(){return view}, get currentId(){return currentId},
  get TPL(){return TPL}, get S(){return S}, get storageOk(){return storageOk},
  LIB_VIEW, readLib, openBooklet, closeBooklet, createBooklet, saveLocal, addModule, addModuleText,
  editTemplate, render, loadText, homeButton
}));`);
  API.toggle=toggle;return API;}
const wipe=()=>{closePages();for(const k of Object.keys(LS)) delete LS[k];delete global.location;delete global.history;};
/* a reload that lands on one booklet, as the address bar makes it */
const at=hash=>{global.location={hash,href:"file:///tmp/booklet.html"+hash};
  global.history={state:null,replaceState(s,t,u){global.location.hash=u;}};};
const bookletRoute=id=>"#/b/"+encodeURIComponent(id);

/* A booklet kept in this browser: one module, a headline, the language it was
   saved in, and (optionally) the languages it declares. Returns its id. */
async function makeBooklet(A,{title,lang,languages}){
  await A.createBooklet();
  A.addModuleText(fixtureModule);
  A.editTemplate(t=>{t.head={title:{en:title}};if(languages) t.languages=languages;});
  A.S.answers.note="written in "+title;A.lang=lang;A.saveLocal();
  return A.currentId;}
/* open a booklet the way a reader does: from its card on "Your booklets" */
function openFromCard(A,title){A.render();
  const card=findAll(main(),n=>n.attrs&&/\bmode\b/.test(n.attrs.class||"")&&texts(n).includes(title))[0];
  const btn=card&&findAll(card,n=>n.tagName==="button"&&/\bprimary\b/.test((n.attrs||{}).class||""))[0];
  if(!btn) throw new Error("no card for "+title);
  btn._on.click({target:btn});}
const toList=A=>{A.closeBooklet();A.render();};

(async()=>{

section("the choice is the browser's, and it outlives a reload");
wipe();
let A=boot();
const eng=await makeBooklet(A,{title:"English one",lang:"en"});
const ar=await makeBooklet(A,{title:"Argentine one",lang:"es-AR",languages:["es-AR","en"]});
const solo=await makeBooklet(A,{title:"French only",lang:"fr",languages:["fr"]});
const frSaved=await makeBooklet(A,{title:"Saved in French",lang:"fr"});
const arUndeclared=await makeBooklet(A,{title:"Saved in es-AR",lang:"es-AR"});
toList(A);
const saved=Object.fromEntries(Object.keys(LS).filter(k=>k.startsWith("booklet.b.")).map(k=>[k,LS[k]]));
chk("before any choice there is no preference",!(PREF in LS));
chk("and with none, the list carries on in the language last in force (here the last booklet's es-AR)",A.lang==="es-AR",A.lang);
A.toggle.press("es");
chk("pressing ES on the list puts the list in Spanish: neutral Spanish, since the list is no booklet",A.lang==="es"&&/Tus cuadernillos/.test(texts(main())),A.lang);
chk("and records the choice under a key of its own",LS[PREF]==="es",LS[PREF]);
chk("and writes nothing into any booklet's saved data",
  Object.keys(saved).every(k=>LS[k]===saved[k])&&!Object.values(saved).some(v=>v.includes(PREF)));
A=boot();A.render();
chk("a reload of the list keeps Spanish",A.view===A.LIB_VIEW&&A.lang==="es",A.lang);

section("opening a booklet follows the reader, not the booklet's saved language");
openFromCard(A,"English one");
chk("a booklet saved in English opens in Spanish, the reader's choice",A.currentId===eng&&A.lang==="es",A.lang);
toList(A);
chk("back on the list, still Spanish",A.lang==="es",A.lang);
openFromCard(A,"Saved in French");
chk("a booklet saved in French opens in Spanish too",A.currentId===frSaved&&A.lang==="es",A.lang);
toList(A);openFromCard(A,"Argentine one");
chk("a booklet that declares es-AR (and en) opens in its es-AR for a reader who chose Spanish",A.currentId===ar&&A.lang==="es-AR",A.lang);
chk("its toggle shows EN and ES, with ES pressed",A.toggle.shown().join()==="en,es"&&A.toggle.pressed().join()==="es",A.toggle.shown().join()+" / "+A.toggle.pressed().join());
A.toggle.press("es");
chk("pressing ES there keeps its es-AR",A.lang==="es-AR",A.lang);
chk("and the choice stays Spanish, not es-AR",LS[PREF]==="es",LS[PREF]);
toList(A);
chk("so the list goes back to neutral Spanish, not the booklet's es-AR",A.lang==="es",A.lang);
openFromCard(A,"Saved in es-AR");
chk("a booklet that declares nothing but was saved in es-AR keeps its es-AR for a Spanish reader",A.currentId===arUndeclared&&A.lang==="es-AR",A.lang);
toList(A);openFromCard(A,"French only");
chk("a single-language booklet reads in its one language whatever the choice",A.currentId===solo&&A.lang==="fr",A.lang);
chk("and shows no toggle",A.toggle.grp.style.display==="none"&&A.toggle.shown().length===0);
chk("without changing the reader's choice",LS[PREF]==="es",LS[PREF]);
toList(A);
chk("leaving it, the list is Spanish again",A.lang==="es",A.lang);

section("a choice made inside a booklet holds after a reload with no edit");
openFromCard(A,"English one");
const before=LS["booklet.b."+eng];
A.toggle.press("fr");
chk("pressing FR inside a booklet puts it in French",A.lang==="fr",A.lang);
chk("with nothing written to the booklet (no edit was made)",LS["booklet.b."+eng]===before);
at(bookletRoute(eng));A=boot();A.render();
chk("a reload, before any edit, reopens it in French",A.currentId===eng&&A.lang==="fr",A.currentId+" "+A.lang);
chk("and the header shows FR pressed",A.toggle.pressed().join()==="fr",A.toggle.pressed().join());
at("#/");A=boot();A.render();
chk("the list, reloaded, is French too",A.view===A.LIB_VIEW&&A.lang==="fr",A.lang);
openFromCard(A,"Argentine one");
chk("a booklet that offers only es-AR and en, for a French reader, opens in its own es-AR",A.lang==="es-AR",A.lang);
toList(A);openFromCard(A,"Saved in French");
chk("and one saved in French is French",A.lang==="fr",A.lang);
delete global.location;delete global.history;

// KNOWN GAP (2026-09-29): "Personalize picks the same way" tested picking a
// language through the now-deleted morePanel() ("Personalize" reader-prefs
// panel, only ever reachable via the equally-deleted block editor). The
// underlying capability — picking a language and having it stick — is still
// covered throughout this file via the header toggle (A.toggle.press(...)).

section("with no choice, a booklet's own language is what it opens in");
wipe();A=boot();
const f1=await makeBooklet(A,{title:"Saved in French",lang:"fr"});
const e1=await makeBooklet(A,{title:"English one",lang:"en"});
toList(A);
openFromCard(A,"Saved in French");
chk("a booklet saved in French opens in French",A.currentId===f1&&A.lang==="fr",A.lang);
toList(A);openFromCard(A,"English one");
chk("one saved in English opens in English",A.currentId===e1&&A.lang==="en",A.lang);
chk("and no preference was invented along the way",!(PREF in LS));

section("a choice the booklet does not offer gives way to the booklet's own");
wipe();A=boot();
await makeBooklet(A,{title:"French and English",lang:"fr",languages:["en","fr"]});
toList(A);A.toggle.press("es");
openFromCard(A,"French and English");
chk("a Spanish reader in a booklet offering only en and fr reads it in its saved French",A.lang==="fr",A.lang);
chk("with EN and FR on its toggle",A.toggle.shown().join()==="en,fr",A.toggle.shown().join());
toList(A);
chk("and is back in Spanish on the list",A.lang==="es",A.lang);

section("a file loaded on the list speaks the reader's language");
wipe();A=boot();A.render();A.toggle.press("fr");
{const m=main();m.prepend=(...k)=>m.children.unshift(...k);}   // the stub's prepend keeps nothing
A.loadText(exampleText);
chk("a single-language file opens in its own language, not the reader's",A.currentId!==null&&A.lang==="en",A.lang);
chk("but the loaded-file summary itself still speaks the reader's French",/Chargé/.test(texts(main()))&&!/\bLoaded\b/.test(texts(main())),texts(main()).slice(0,160));

section("storage that fails");
wipe();
{const origSet=global.localStorage.setItem,origGetItem=global.localStorage.getItem;
 global.localStorage.setItem=()=>{throw new Error("QuotaExceededError");};
 let threw=null;try{A=boot();}catch(e){threw=e;}
 chk("storage off: the page loads",!threw&&A.storageOk===false,threw&&threw.message);
 const x=await makeBooklet(A,{title:"English one",lang:"en"});
 toList(A);A.toggle.press("fr");
 openFromCard(A,"English one");
 chk("and the choice still holds for the visit",A.currentId===x&&A.lang==="fr",A.lang);
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
