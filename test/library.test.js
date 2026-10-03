// Many booklets on one origin, and the "Your booklets" start page.
//
// Every boot() below evaluates the renderer's one <script> afresh against the
// same in-memory localStorage. That is a page load: these checks run the real
// boot, the real migration of an old save and the real reload, not only the
// functions behind them. harness.js is required for its DOM and storage stubs
// alone; its fixed export list is not enough to drive a library, so this file
// takes its own handle on the script, exactly the way harness.js does.
//
// Run: node test/library.test.js      (Needs node; nothing to install.)
const H=require("./harness.js");            // the stubs; its own instance is unused
const fs=require("fs");
const R=__dirname+"/..";
const html=fs.readFileSync(R+"/booklet.html","utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
const LS=global.__ls;
const exampleText=fs.readFileSync(R+"/examples/mindful-check-in.booklet.md","utf8");
const modText=n=>fs.readFileSync(R+"/test/fixtures/module-"+n+".md","utf8");
const addMod=(A,n)=>A.addModuleText(modText(n));
const LEGACY="useful-next-step.v1", LIBKEY="booklet.library.v1";

let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const note=m=>console.log("  note  "+m);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* A fresh origin: every page loaded so far is closed first, then storage is
   cleared. Within a section, pages stay open side by side, like tabs. */
const wipe=()=>{closePages();for(const k of Object.keys(LS)) delete LS[k];};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/* ---- one page load ---------------------------------------------------- */
/* Node keeps every page's timers and awaits alive, which a browser does not.
   A browser leaving a page fires its pagehide (the renderer writes any pending
   save there), then kills its timers and drops what it was still waiting on.
   Without the same here, a page from an earlier section kept its 400ms autosave
   and wrote useful-next-step.v1 into a later section's fresh storage, where the
   next boot listed it as a stray "legacy" booklet: roughly one run in three
   failed the wrapper-key checks, depending on how long the sections between
   took. Each page gets its own timers, pagehide and fetch, so it can be closed. */
const pages=[];
function closePages(){for(const p of pages.splice(0)) p.close();}
function boot(){const API={};
  let open=true;const timers=new Set(),on={},never=()=>new Promise(()=>{});
  const setTimeout=(f,ms,...a)=>{const h=global.setTimeout(()=>{timers.delete(h);f(...a);},ms);timers.add(h);return h;};
  const clearTimeout=h=>{timers.delete(h);global.clearTimeout(h);};
  const window=Object.assign(Object.create(global.window),{addEventListener(k,f){(on[k]=on[k]||[]).push(f);}});
  const hold=p=>p.then(v=>open?v:never(),e=>open?Promise.reject(e):never());
  const fetch=(u,o)=>hold((async()=>{const r=await global.fetch(u,o);
    return r&&{...r,text:()=>hold((async()=>r.text())()),json:()=>hold((async()=>r.json())())};})());
  pages.push({close(){if(!open) return;(on.pagehide||[]).forEach(f=>f());open=false;
    timers.forEach(h=>global.clearTimeout(h));timers.clear();}});
  eval(src+`
;Object.defineProperties(API,Object.getOwnPropertyDescriptors({
  get S(){return S},set S(v){S=v}, get D(){return D},set D(v){D=v}, get TPL(){return TPL},set TPL(v){TPL=v},
  get lang(){return lang},set lang(v){lang=v}, get view(){return view},set view(v){view=v},
  get dirty(){return dirty},set dirty(v){dirty=v}, get unsavedEntries(){return unsavedEntries},set unsavedEntries(v){unsavedEntries=v},
  get boardOpen(){return boardOpen},set boardOpen(v){boardOpen=v},
  get openChip(){return openChip},set openChip(v){openChip=v},
  get currentId(){return currentId}, get storageOk(){return storageOk},
  get LIB(){return LIB}, get restoredAtBoot(){return restoredFromBrowser},
  LIB_VIEW, emptyS, emptyD,
  readLib, addEntry, openBooklet, clearLocal, closeBooklet, removeBooklet, createBooklet, saveLocal, loadLocal, mark, flushSave,
  toMarkdown, parseFile, applyParsed, addModule, addModuleText, editTemplate, allModules, render, renderBar, loadText,
  homeButton, bookletName, finalizeEntry,
  orphanSaveTimer(){saveTimer=null;}      // a timer whose handle was lost: only bookletGen can stop it now
}));`);
  return API;}

/* ---- the DOM stub, made clickable for the view checks ------------------ */
const texts=n=>{const out=[];const walk=x=>{if(x==null) return;if(typeof x!=="object"){out.push(String(x));return;}
  if(x._text) out.push(x._text);(x.children||[]).forEach(walk);};walk(n);return out.join(" | ");};
const findAll=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);(n.children||[]).forEach(c=>findAll(c,pred,out));}return out;};
const button=(root,label)=>findAll(root,n=>n.tagName==="button"&&texts(n).includes(label))[0]||null;
const click=n=>{const f=n&&n._on&&n._on.click;if(!f) throw new Error("nothing to click");return f({target:n});};
const origCreate=global.document.createElement;
global.document.createElement=tag=>{const n=origCreate(tag);n._on={};n.addEventListener=(k,f)=>{n._on[k]=f;};return n;};
const main=()=>global.document.getElementById("main");

/* a clock that stands still, so two files written at different moments compare */
const RealDate=Date;
const freeze=iso=>{const T0=new RealDate(iso).getTime();
  global.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[T0]));} static now(){return T0;}};};
const thaw=()=>{global.Date=RealDate;};

/* a booklet with something in every part of the snapshot */
function fillRich(A,tag){
  addMod(A,"daily-journal");
  const S=A.S,D=A.D;
  S.entries={eod:[{ts:"2026-09-20T10:00:00.000Z",blocker:"meetings "+tag}]};
  S.answers={note:"an answer for "+tag+"\n\nsecond paragraph",tags:["one "+tag,"two"]};
  D.custom={eod:{blocker:"half-typed "+tag}};
  A.openChip={eod:"2026-09-20T10:00:00.000Z"};
  A.lang="fr";A.dirty=true;A.unsavedEntries=3;}
const snapOf=A=>JSON.parse(JSON.stringify({S:A.S,D:A.D,TPL:A.TPL,lang:A.lang,dirty:A.dirty,unsavedEntries:A.unsavedEntries}));

(async()=>{

// ---- a fresh origin opens on the list, and the list works empty ----------
wipe();
let A=boot();
chk("a fresh visit opens on Your booklets with no booklet active",A.view===A.LIB_VIEW&&A.currentId===null);
chk("and nothing was written just by opening the page",Object.keys(LS).length===0,Object.keys(LS).join(","));
A.render();
chk("the empty list renders and says how to begin",/No booklets here yet/.test(texts(main())),texts(main()).slice(0,200));
chk("it offers both ways in: start a new one, or add one from a file",
  !!button(main(),"Start a new booklet")&&!!button(main(),"Add a booklet from a file"));
chk("the bar has nothing to export while no booklet is open",global.document.getElementById("btnExport").hidden===true);

// ---- two booklets with the same module keep separate answers -------------
const a=await A.createBooklet();
addMod(A,"daily-journal");
A.S.entries={eod:[{ts:"2026-09-20T10:00:00.000Z",blocker:"A's answer"}]};A.D.custom={eod:{blocker:"A's draft"}};A.saveLocal();
const b=await A.createBooklet();
chk("a new booklet starts empty, whatever the last one held",
  A.allModules().length===0&&!A.S.entries.eod&&!(A.D.custom&&A.D.custom.eod));
addMod(A,"daily-journal");
A.S.entries={eod:[{ts:"2026-09-21T10:00:00.000Z",blocker:"B's answer"}]};A.saveLocal();
chk("each booklet has its own key",!!LS["booklet.b."+a.id]&&!!LS["booklet.b."+b.id]&&a.id!==b.id);
chk("and neither key holds the other's answer",
  LS["booklet.b."+a.id].includes("A's answer")&&!LS["booklet.b."+a.id].includes("B's answer")
  &&LS["booklet.b."+b.id].includes("B's answer")&&!LS["booklet.b."+b.id].includes("A's answer"));
A.openBooklet(a.id);
chk("reopening A finds A's answer, and only A's",A.S.entries.eod.length===1&&A.S.entries.eod[0].blocker==="A's answer");
chk("A's half-written draft of that activity came back with it",(A.D.custom||{}).eod&&A.D.custom.eod.blocker==="A's draft");
A.openBooklet(b.id);
chk("reopening B finds B's answer, and only B's",A.S.entries.eod.length===1&&A.S.entries.eod[0].blocker==="B's answer"&&!(A.D.custom||{}).eod);
{const B2=boot();B2.openBooklet(a.id);
 chk("after a reload they are still apart",B2.S.entries.eod[0].blocker==="A's answer"&&B2.readLib().entries.length===2);}

// ---- a save scheduled before a switch cannot land in the other booklet ----
A.openBooklet(a.id);
A.S.answers.note="typed in A just before leaving";A.mark();          // the 400ms save is pending
A.openBooklet(b.id);
chk("leaving A writes A's pending save to A's own key",LS["booklet.b."+a.id].includes("typed in A just before leaving"));
await sleep(500);
chk("and it never reaches B, not even after the timer would have fired",!LS["booklet.b."+b.id].includes("typed in A just before leaving"));
chk("B in memory is untouched by it",A.S.answers.note!=="typed in A just before leaving");
A.openBooklet(a.id);
A.S.answers.note="stale";A.mark();A.orphanSaveTimer();                // lose the handle, so no flush can clear it
A.openBooklet(b.id);
const bBefore=LS["booklet.b."+b.id];
await sleep(500);
chk("a save timer that outlives its booklet does nothing when it fires",
  LS["booklet.b."+b.id]===bBefore&&!LS["booklet.b."+b.id].includes("stale"));

// ---- a switch clears everything that belongs to a booklet ----------------
A.openBooklet(a.id);
A.boardOpen="x";A.openChip={eod:"x"};
A.view="eod";
A.openBooklet(b.id);
chk("the open card, the open entry and the view are cleared on a switch",
  A.boardOpen===null&&Object.keys(A.openChip).length===0&&A.view==="home");
A.openBooklet(a.id);
A.editTemplate(t=>{t.head={title:{en:"A's own design"}};});A.saveLocal();
const c=await A.createBooklet();
chk("the next booklet opens on its own design, never the last one's",A.allModules().length===0&&!(A.TPL.head||{}).title);

// ---- the round trip keeps everything the old snapshot held ---------------
wipe();A=boot();
const r1=await A.createBooklet();fillRich(A,"R");
const before=snapOf(A);A.saveLocal();
const r2=await A.createBooklet();A.S.note="something else";A.saveLocal();
A.openBooklet(r1.id);const back=snapOf(A);
for(const k of Object.keys(before))
  chk("a switch away and back keeps "+k+" exactly",same(before[k],back[k]),JSON.stringify(back[k]).slice(0,160));
{const B2=boot();B2.openBooklet(r1.id);const again=snapOf(B2);
 chk("and so does a reload: S, D (with every activity's drafts), TPL, lang, dirty, unsavedEntries",
   Object.keys(before).every(k=>same(before[k],again[k])));}

// ---- no earlier save format is adopted — no compat, no exceptions ---------
wipe();
freeze("2026-09-26T12:00:00Z");
const legacyRaw=JSON.stringify({S:H.emptyS(),D:{custom:{}},
  TPL:{booklet:1,modules:[]},lang:"en",dirty:false,unsavedEntries:0});
wipe();LS[LEGACY]=legacyRaw;                   // exactly what every earlier version left behind
{const E=boot();
 chk("an old save sitting under the earlier key is never adopted",E.readLib().entries.length===0);
 chk("and it is left alone, not cleared",LS[LEGACY]===legacyRaw);}
thaw();

// ---- removing a booklet ---------------------------------------------------
wipe();A=boot();
const n1=await A.createBooklet();addMod(A,"daily-journal");A.saveLocal();
const n2=await A.createBooklet();addMod(A,"the-day");A.saveLocal();
A.closeBooklet();
A.removeBooklet(n1.id);
chk("removing a booklet takes it off the list and deletes its data",
  !A.readLib().entries.some(e=>e.id===n1.id)&&!("booklet.b."+n1.id in LS));
chk("and leaves the others as they were",!!LS["booklet.b."+n2.id]&&A.readLib().entries.length===1);
{const B2=boot();chk("and nothing brings it back on the next visit",B2.readLib().entries.length===1);}

// ---- the list view, drawn and clicked through the DOM stub ----------------
wipe();A=boot();
const v1=await A.createBooklet();addMod(A,"daily-journal");A.saveLocal();
await sleep(5);                                  // so "last opened" differs by more than a clock tick
const v2=await A.createBooklet();addMod(A,"the-day");
A.editTemplate(t=>{t.head={title:{en:"Week by week",fr:"Semaine après semaine"}};});A.saveLocal();
A.render();
chk("inside a booklet, its home leads back out to the list",global.document.getElementById("btnHome").textContent==="← Your booklets");
A.homeButton();
chk("and that button closes it and shows the list",A.view===A.LIB_VIEW&&A.currentId===null);
let shown=texts(main());
chk("the list names each booklet: its own headline, or its modules",
  /Week by week/.test(shown)&&/Daily journal|daily-journal/i.test(shown),shown.slice(0,300));
chk("with when it was last opened",/Last opened/.test(shown));
chk("most recently opened first",shown.indexOf("Week by week")<shown.search(/Daily journal/i));
A.lang="fr";A.render();
chk("the list speaks French too",/Vos carnets/.test(texts(main()))&&/Semaine après semaine/.test(texts(main())));
A.lang="en";A.render();
{const card=findAll(main(),n=>n.attrs&&/\bmode\b/.test(n.attrs.class||"")&&texts(n).includes("Week by week"))[0];
 click(button(card,"Remove"));
 chk("Remove asks first, in place, and says what is lost",
   /Remove “Week by week” from this browser\?/.test(texts(card))&&/deletes the booklet and everything written in it/.test(texts(card)));
 click(button(card,"Keep it"));
 chk("Keep it backs out and deletes nothing",!!LS["booklet.b."+v2.id]&&!/from this browser\?/.test(texts(card)));
 click(button(card,"Remove"));click(button(card,"Remove it"));
 chk("Remove it deletes that booklet and redraws the list",
   !("booklet.b."+v2.id in LS)&&!/Week by week/.test(texts(main()))&&/Daily journal|daily-journal/i.test(texts(main())));}
click(button(main(),"Open"));
chk("Open goes into the booklet",A.currentId===v1.id&&A.view==="home");
A.clearLocal();                                  // what "Clear everything on this page" runs
chk("Clear everything erases that booklet's saved data and keeps it listed, untitled",
  !("booklet.b."+v1.id in LS)&&A.readLib().entries.some(e=>e.id===v1.id&&A.bookletName(e)==="Untitled booklet"));

// ---- a file added from the list is a booklet of its own --------------------
wipe();A=boot();A.render();
A.loadText(exampleText);
let L1=A.readLib();
chk("loading a file on the list adds it as a new booklet and opens it",
  L1.entries.length===1&&L1.entries[0].from==="file"&&A.currentId===L1.entries[0].id
  &&A.allModules().map(m=>m.id).join(",")==="mensio-check-in");
A.homeButton();A.loadText(exampleText);
chk("the same file loaded again is a second booklet, deliberately",A.readLib().entries.length===2);

// ---- a module file is a booklet like any other ------------------------------
// A v0.4 module file (the fixtures, and what the registry serves) is an
// ordinary booklet: on the list it becomes a booklet of its own.
{const keptPrepend=main().prepend;
 const shownMsg=()=>{const m=main();m.prepend=(...k)=>m.children.unshift(...k);};   // the stub's prepend keeps nothing
 wipe();A=boot();A.render();shownMsg();
 A.loadText(modText("daily-journal"));
 const L=A.readLib();
 chk("a module file loaded on the list starts a new booklet holding that module, and opens it",
   L.entries.length===1&&A.currentId===L.entries[0].id&&A.view==="home"&&A.allModules().map(m=>m.id).join(",")==="example-daily-journal",
   JSON.stringify({n:L.entries.length,mods:A.allModules().map(m=>m.id)}));
 main().prepend=keptPrepend;}

// ---- no address bar: the page always opens on the list ----------------------
wipe();
global.location={hash:"",href:"file:///tmp/booklet.html"};
global.history={state:null,replaceState(){throw new Error("the page must not write the address");}};
A=boot();A.render();
chk("a visit lands on the list",A.view===A.LIB_VIEW);
const h1=await A.createBooklet();addMod(A,"daily-journal");A.saveLocal();
chk("opening a booklet does not write the address",global.location.hash==="");
global.location.hash="#/b/"+encodeURIComponent(h1.id)+"/journal";
{const B2=boot();
 chk("a route in the address is ignored: the page opens on the list",B2.view===B2.LIB_VIEW&&B2.currentId===null);}
delete global.location;delete global.history;

// ---- a page left behind never saves into the storage that follows it --------
/* Leaving a page, as boot() and wipe() model it: a page with no booklet open is
   given words and left with its 400ms autosave pending; storage is wiped and
   that moment passes. Nothing may be written into the fresh storage. */
wipe();{const X=boot();X.S.answers.note="typed, then the page was left";X.mark();}
wipe();await sleep(450);
chk("a page left behind never saves into the storage that follows it",Object.keys(LS).length===0,Object.keys(LS).join(","));

// ---- with storage off, the page works for the visit -------------------------
wipe();
const origSet=global.localStorage.setItem;
global.localStorage.setItem=()=>{throw new Error("QuotaExceededError");};
A=boot();
chk("storage off is noticed",A.storageOk===false);
const m1=await A.createBooklet();A.S.answers.note="kept in memory";A.saveLocal();
await A.createBooklet();A.openBooklet(m1.id);
chk("booklets still switch without losing anything, for the visit",A.S.answers.note==="kept in memory");
A.closeBooklet();A.render();
chk("and the list says plainly that nothing is kept between visits",/not keeping anything between visits/.test(texts(main())));
global.localStorage.setItem=origSet;

// ---- what an .md record would lose (for the storage work that follows) ------
// Plan D2 has a library entry keep the booklet's .md text instead of this
// snapshot. That is deferred with the storage backends. What the .md round
// trip does not keep, of what the snapshot holds, is listed below. Since the
// round-trip fixes that is only the not-yet-downloaded status (dirty,
// unsavedEntries), which a file cannot carry by design (SPEC.md, "What a file
// keeps"); a text record would keep it in the library's index, which already
// reserves both. Informational only, never a failure here; roundtrip.test.js
// is where a loss fails.
wipe();A=boot();await A.createBooklet();fillRich(A,"M");
{const snap=snapOf(A);const md=A.toMarkdown();const Rp=A.parseFile(md);
 A.S=A.emptyS();A.D=A.emptyD();A.TPL={booklet:1,modules:[],widgets:[]};
 A.applyParsed(Rp,"replace");const after=snapOf(A);const lost=[];
 const diff=(x,y,p)=>{if(same(x,y)) return;
   if(x&&y&&typeof x==="object"&&typeof y==="object"&&!Array.isArray(x)&&!Array.isArray(y)){
     for(const k of new Set([...Object.keys(x),...Object.keys(y)])) diff(x[k],y[k],p+"."+k);return;}
   lost.push(p);};
 diff(snap,after,"");
 note("an .md round trip would not keep: "+(lost.join(", ")||"nothing"));}

console.log(fails?"\n"+fails+" FAILURES":"\nlibrary checks passed");
process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
