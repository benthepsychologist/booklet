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
const modText=n=>fs.readFileSync(R+"/modules/"+n+".md","utf8");
/* modules/ is version 2 markdown now; moduleFromText() (v1 only) returns
   nothing for it, so a real module object is read the way the renderer
   itself reads one, then installed exactly as addModule(moduleFromText(...))
   used to install one. */
const addMod=(A,n)=>{const t=modText(n);
  return A.addModule(A.moduleFromText(t)||(A.parseFile(t).template.modules||[])[0]);};
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
  get editing(){return editing},set editing(v){editing=v}, get exportHandle(){return exportHandle},set exportHandle(v){exportHandle=v},
  get pending(){return pending},set pending(v){pending=v}, get boardOpen(){return boardOpen},set boardOpen(v){boardOpen=v},
  get histFilter(){return histFilter},set histFilter(v){histFilter=v}, get openChip(){return openChip},
  get remindShown(){return remindShown},set remindShown(v){remindShown=v},
  get currentId(){return currentId}, get keyedMode(){return keyedMode}, get storageOk(){return storageOk},
  get LIB(){return LIB}, get restoredAtBoot(){return restoredFromBrowser},
  LIB_VIEW, emptyS, emptyToday, emptyCheckin, emptyArea,
  readLib, addEntry, openBooklet, clearLocal, closeBooklet, removeBooklet, createBooklet, saveLocal, loadLocal, mark, flushSave,
  toMarkdown, parseFile, applyParsed, addModule, moduleFromText, editTemplate, tplModules, render, renderBar, loadText,
  followRoute, homeButton, bookletName, finalizeEntry,
  loadPreset, dayPicker,
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
  addMod(A,"end-of-day");
  const S=A.S,D=A.D;
  S.name="Sam "+tag;S.note="A note for "+tag+"\n\nsecond paragraph";S.mode="compact";
  S.now.items=[{kind:"move",text:"call Jo "+tag,since:"2026-09-01",starter:false},{kind:"exploring",text:"",since:"2026-09-02",starter:false}];
  S.areas=[{...A.emptyArea(),label:"Work "+tag,matters:"it matters"},{...A.emptyArea(),matters:"no label yet"}];
  S.archive=[{date:"2026-09-03",kind:"move",area:"",text:"old · thing "+tag,outcome:"done"}];
  S.q={"today.mind":{label:"Custom "+tag+"?",hint:"h",options:["a","b"]}};
  S.entries={eod:[{ts:"2026-09-20T10:00:00.000Z",blocker:"meetings "+tag}]};
  S.today=[{...A.emptyToday(),ts:"2026-09-21T10:00:00.000Z",mind:"today "+tag}];
  S.checkins=[{...A.emptyCheckin(),ts:"2026-09-22T09:00:00.000Z",other:"calm "+tag}];
  S.goodday={needs:["rest "+tag]};S.page={blocks:[{id:"b1",type:"prose",text:"hello "+tag}]};
  S.prefs.noRemind=true;S.emo.extra={slog:["tired "+tag]};S.person.email=tag+"@example.invalid";
  D.today.mind="draft "+tag;D.custom={eod:{blocker:"half-typed "+tag}};
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
addMod(A,"end-of-day");
A.S.entries={eod:[{ts:"2026-09-20T10:00:00.000Z",blocker:"A's answer"}]};A.D.custom={eod:{blocker:"A's draft"}};A.saveLocal();
const b=await A.createBooklet();
chk("a new booklet starts empty, whatever the last one held",
  A.tplModules().length===0&&!A.S.entries.eod&&!(A.D.custom&&A.D.custom.eod));
addMod(A,"end-of-day");
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
A.S.note="typed in A just before leaving";A.mark();          // the 400ms save is pending
A.openBooklet(b.id);
chk("leaving A writes A's pending save to A's own key",LS["booklet.b."+a.id].includes("typed in A just before leaving"));
await sleep(500);
chk("and it never reaches B, not even after the timer would have fired",!LS["booklet.b."+b.id].includes("typed in A just before leaving"));
chk("B in memory is untouched by it",A.S.note!=="typed in A just before leaving");
A.openBooklet(a.id);
A.S.note="stale";A.mark();A.orphanSaveTimer();                // lose the handle, so no flush can clear it
A.openBooklet(b.id);
const bBefore=LS["booklet.b."+b.id];
await sleep(500);
chk("a save timer that outlives its booklet does nothing when it fires",
  LS["booklet.b."+b.id]===bBefore&&!LS["booklet.b."+b.id].includes("stale"));

// ---- a switch clears everything that belongs to a booklet ----------------
A.openBooklet(a.id);
A.exportHandle={name:"a.md"};A.pending={ok:true};A.editing=true;A.boardOpen="x";A.histFilter="today";A.remindShown=true;
A.view="history";
A.openBooklet(b.id);
chk("exportHandle is cleared on a switch, so B can never be written into A's file",A.exportHandle===null);
chk("and so is the rest: merge dialog, edit mode, board, history filter, reminder, view",
  A.pending===null&&A.editing===false&&A.boardOpen===null&&A.histFilter==="all"&&A.remindShown===false&&A.view==="home");
A.openBooklet(a.id);
A.editTemplate(t=>{t.head={title:{en:"A's own design"}};});A.saveLocal();
const c=await A.createBooklet();
chk("the next booklet opens on its own design, never the last one's",A.tplModules().length===0&&!(A.TPL.head||{}).title);

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
const legacyRaw=JSON.stringify({S:H.emptyS(),D:{today:H.emptyToday(),checkin:H.emptyCheckin()},
  TPL:{booklet:1,modules:[]},lang:"en",dirty:false,unsavedEntries:0});
wipe();LS[LEGACY]=legacyRaw;                   // exactly what every earlier version left behind
{const E=boot();
 chk("an old save sitting under the earlier key is never adopted",E.readLib().entries.length===0);
 chk("and it is left alone, not cleared",LS[LEGACY]===legacyRaw);}
thaw();

// ---- removing a booklet ---------------------------------------------------
wipe();A=boot();
const n1=await A.createBooklet();addMod(A,"daily-journal");A.saveLocal();
const n2=await A.createBooklet();addMod(A,"the-board");A.saveLocal();
A.closeBooklet();
A.removeBooklet(n1.id);
chk("removing a booklet takes it off the list and deletes its data",
  !A.readLib().entries.some(e=>e.id===n1.id)&&!("booklet.b."+n1.id in LS));
chk("and leaves the others as they were",!!LS["booklet.b."+n2.id]&&A.readLib().entries.length===1);
{const B2=boot();chk("and nothing brings it back on the next visit",B2.readLib().entries.length===1);}

// ---- the list view, drawn and clicked through the DOM stub ----------------
wipe();A=boot();
const v1=await A.createBooklet();addMod(A,"daily-journal");A.S.name="Ana";A.saveLocal();
await sleep(5);                                  // so "last opened" differs by more than a clock tick
const v2=await A.createBooklet();addMod(A,"the-board");
A.editTemplate(t=>{t.head={title:{en:"Week by week",fr:"Semaine après semaine"}};});A.saveLocal();
A.render();
chk("inside a booklet, its home leads back out to the list",global.document.getElementById("btnHome").textContent==="← Your booklets");
A.homeButton();
chk("and that button closes it and shows the list",A.view===A.LIB_VIEW&&A.currentId===null);
let shown=texts(main());
chk("the list names each booklet: its own headline, or its modules",
  /Week by week/.test(shown)&&/Daily journal|daily-journal/i.test(shown),shown.slice(0,300));
chk("with who it is for, and when it was last opened",/For Ana/.test(shown)&&/Last opened/.test(shown));
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
   !("booklet.b."+v2.id in LS)&&!/Week by week/.test(texts(main()))&&/For Ana/.test(texts(main())));}
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
  &&A.tplModules().map(m=>m.id).join(",")==="mensio-check-in");
A.homeButton();A.loadText(exampleText);
chk("the same file loaded again is a second booklet, deliberately",A.readLib().entries.length===2);
A.S.today=[{...A.emptyToday(),ts:"2026-09-23T08:00:00.000Z",mind:"x"}];A.saveLocal();
A.loadText(exampleText);
chk("inside a booklet, Load still offers add-or-replace and adds no booklet",A.pending!==null&&A.readLib().entries.length===2);

// ---- a module file is an activity to add, not a booklet ----------------------
// Every module file (modules/*.md, the test fixtures) carries a "## Adding it to
// a booklet" section of instructions for people. Read as a booklet, that
// heading was reported as a part of the file that could not be read, and the
// module was adopted as a whole booklet design. Inside a booklet, Replace would
// have swapped the booklet for that one activity, and Add left it out.
{const fx=n=>fs.readFileSync(R+"/test/fixtures/"+n,"utf8");
 const reading=fx("module-reading.md");
 const keptPrepend=main().prepend;
 const shownMsg=()=>{const m=main();m.prepend=(...k)=>m.children.unshift(...k);};   // the stub's prepend keeps nothing
 const veil=global.document.getElementById("veilLoad"),loadMsg=global.document.getElementById("loadMsg");
 wipe();A=boot();A.render();shownMsg();
 A.loadText(reading);
 const L=A.readLib(),said=texts(main());
 chk("a module file loaded on the list starts a new booklet holding that activity, and opens it",
   L.entries.length===1&&A.currentId===L.entries[0].id&&A.view==="home"&&A.tplModules().map(m=>m.id).join(",")==="fixture/reading-tides",
   JSON.stringify({n:L.entries.length,mods:A.tplModules().map(m=>m.id)}));
 chk("and says so plainly: an activity, not a whole booklet, and how to add it to another",
   /“How tides work” is an activity \(a module\), not a whole booklet/.test(said)&&/open that booklet and use “Load” there/.test(said),said.slice(0,240));
 chk("with no warning that a part of the file could not be read",!/could not be read/.test(said)&&!/Adding it to a booklet/.test(said),said.slice(0,240));
 chk("and no leftover talk of check-ins or of the file's own booklet design",!/Loaded 0 check-ins/.test(said)&&!/carries its own booklet design/.test(said));
 // inside a booklet that already has work in it
 wipe();A=boot();
 const host=await A.createBooklet();addMod(A,"daily-journal");
 A.S.today=[{...A.emptyToday(),ts:"2026-09-23T08:00:00.000Z",mind:"kept"}];A.S.note="my note";A.saveLocal();
 shownMsg();A.loadText(reading);
 chk("inside a booklet, a module file is added to it: no add-or-replace question, no new booklet",
   A.pending===null&&A.currentId===host.id&&A.readLib().entries.length===1);
 chk("and everything the booklet held is still there",
   A.tplModules().map(m=>m.id).join(",")==="example-daily-journal,fixture/reading-tides"&&A.S.today.length===1&&A.S.note==="my note",
   A.tplModules().map(m=>m.id).join(","));
 chk("and it says it was added to this booklet",/has been added to this booklet/.test(texts(main())),texts(main()).slice(0,200));
 {const B2=boot();B2.openBooklet(host.id);
  chk("which a reload keeps",B2.tplModules().map(m=>m.id).join(",")==="example-daily-journal,fixture/reading-tides"&&B2.S.note==="my note");}
 A.loadText(reading);
 chk("loading the same module again keeps one copy of it",A.tplModules().filter(m=>m.id==="fixture/reading-tides").length===1);
 // a module file whose module is refused
 wipe();A=boot();A.render();veil.setAttribute("open","");loadMsg.textContent="";
 A.loadText(fx("module-mode-and-activities.md"));
 chk("a module file the renderer refuses leaves no empty booklet behind",A.readLib().entries.length===0&&A.view===A.LIB_VIEW);
 chk("and the dialog says why",/mode/.test(loadMsg.textContent)&&/activities/.test(loadMsg.textContent),loadMsg.textContent);
 veil.removeAttribute("open");
 // Spanish
 wipe();A=boot();A.lang="es";A.render();shownMsg();
 A.loadText(reading);
 chk("the explanation is in the reader's language",/“Cómo funcionan las mareas” es una actividad \(un módulo\)/.test(texts(main()))&&/usa “Cargar”/.test(texts(main())),texts(main()).slice(0,200));
 main().prepend=keptPrepend;}

// ---- the address bar: reload returns, Back walks out ------------------------
wipe();
global.location={hash:"",href:"file:///tmp/booklet.html"};
global.history={state:null,replaceState(s,t,u){global.location.hash=u;}};
A=boot();A.render();
chk("a visit with no route lands on the list, and says so in the address",A.view===A.LIB_VIEW&&global.location.hash==="#/");
const h1=await A.createBooklet();addMod(A,"end-of-day");A.saveLocal();
chk("opening a booklet puts it in the address",global.location.hash==="#/b/"+encodeURIComponent(h1.id));
global.location.hash="#/b/"+encodeURIComponent(h1.id)+"/history";
{const B2=boot();
 chk("a reload returns to the booklet and the view it was on",B2.currentId===h1.id&&B2.view==="history");
 chk("and says what it restored, as a reload always has",B2.restoredAtBoot===true||B2.restoredAtBoot===false);}
global.location.hash="#/";A.followRoute();
chk("Back to #/ closes the booklet and shows the list",A.view===A.LIB_VIEW&&A.currentId===null);
global.location.hash="#/b/"+encodeURIComponent(h1.id)+"/eod";A.followRoute();
chk("a route to an activity opens it",A.currentId===h1.id&&A.view==="eod");
global.location.hash="#/b/nosuchbooklet";A.followRoute();
chk("a route to a booklet this browser does not have falls back to the list",A.view===A.LIB_VIEW&&A.currentId===null);
global.location.hash="#areas";A.followRoute();
chk("an in-page anchor is not a route and changes nothing",A.view===A.LIB_VIEW&&A.currentId===null);
global.location.hash="#/b/"+encodeURIComponent(h1.id)+"/nosuchactivity";A.followRoute();
chk("a route to an activity the booklet lacks falls back to its home",A.currentId===h1.id&&A.view==="home");
delete global.location;delete global.history;

// ---- a wrapper key: one booklet, no list -------------------------------------
const origGet=global.document.getElementById;
const withWrapper=cfg=>{global.document.getElementById=id=>id==="booklet-wrapper"?{textContent:JSON.stringify(cfg)}:origGet(id);};
const noWrapper=()=>{global.document.getElementById=origGet;};
/* Leaving a page, as boot() and wipe() model it, with the orderings the flaky
   runs hit by chance now forced. A page with no booklet open (the single-
   booklet mode test/engine.js drives, P2 report D-c) is given words and left
   with its 400ms autosave pending; storage is wiped and that moment passes.
   Then a keyed page's preset request is held across a wipe() and answered
   after it. Both wrote into the fresh storage before pages could be closed. */
wipe();{const X=boot();X.S.note="typed, then the page was left";X.mark();}
wipe();await sleep(450);
chk("a page left behind never saves into the storage that follows it",Object.keys(LS).length===0,Object.keys(LS).join(","));
{let answer=null;global.fetch=()=>new Promise(r=>{answer=r;});
 withWrapper({booklet:{key:"held"},preset_url:"https://site.invalid/preset.booklet.md"});
 boot();await sleep(0);const asked=!!answer;
 wipe();answer({ok:true,text:async()=>exampleText});await sleep(20);
 chk("nor does a request it was still waiting on, answered after it was left",asked&&Object.keys(LS).length===0,Object.keys(LS).join(","));
 noWrapper();delete global.fetch;}
global.fetch=async url=>/preset/.test(url)?{ok:true,text:async()=>exampleText}:{ok:false};
wipe();withWrapper({booklet:{key:"learner-1"},preset_url:"https://site.invalid/preset.booklet.md"});
A=boot();
chk("a wrapper key opens its booklet directly, with no start page",A.keyedMode&&A.currentId!==null&&A.view==="home");
await sleep(50);
chk("on the first visit that booklet is made from the site's preset",A.tplModules().map(m=>m.id).join(",")==="mensio-check-in");
const keyed=A.readLib().entries.find(e=>e.wrapperKey==="learner-1");
chk("and saved at once under its own key",!!keyed&&!!LS["booklet.b."+keyed.id]&&JSON.parse(LS["booklet.b."+keyed.id]).TPL.modules.length===1);
A.S.note="the learner's own words";A.saveLocal();
{const B2=boot();await sleep(50);
 chk("the next visit reopens the same booklet, not a new one",
   B2.currentId===keyed.id&&B2.readLib().entries.length===1&&B2.S.note==="the learner's own words");
 B2.render();
 chk("its home button stays home: there is no list to climb to",global.document.getElementById("btnHome").textContent!=="← Your booklets");
 B2.homeButton();chk("and pressing it on home goes nowhere else",B2.view==="home"&&B2.currentId===keyed.id);}
withWrapper({booklet:{key:"learner-2"},preset_url:"https://site.invalid/preset.booklet.md"});
{const B3=boot();await sleep(50);      // let its preset land before the next page load wipes storage
 chk("another key on the same origin is another booklet",B3.currentId!==keyed.id&&B3.readLib().entries.length===2);}
thaw();noWrapper();delete global.fetch;

// ---- a wrapper preset with no key: new booklets start from it ---------------
wipe();withWrapper({preset_url:"https://site.invalid/preset.booklet.md"});
global.fetch=async url=>/preset/.test(url)?{ok:true,text:async()=>exampleText}:{ok:false};
A=boot();await sleep(20);
chk("a site's preset alone does not skip the list",A.view===A.LIB_VIEW&&A.currentId===null&&A.readLib().entries.length===0);
await A.createBooklet();
chk("a booklet started there begins as the preset",A.tplModules().map(m=>m.id).join(",")==="mensio-check-in");
noWrapper();delete global.fetch;

// ---- a download that finishes after the reader has moved to another booklet ----
// Adding an activity from a shelf, and a site's preset, download a file and then
// apply it to whichever booklet is in memory. The reader can open another booklet
// while that is in flight. The fake fetch below answers the registry at once and
// HOLDS every module or preset download until the test releases it, so the switch
// is made while the request is pending and the answer arrives after it: the
// ordering is forced, not left to timing. Each result must be dropped, landing in
// neither booklet.
{const REGURL="https://site.invalid/registry.json";
 // filler content for a fake download below — only its shape (a valid
 // version 1 module, since the shelf this race exercises is version 1 only)
 // matters here, not which module it is, so it is the dedicated fixture
 // rather than a real (now version 2) registry file.
 const modSrc=fs.readFileSync(__dirname+"/fixtures/module-one-activity.md","utf8");
 const REG={registry:1,name:{en:"Test shelf"},modules:[
   {id:"race/one",version:"0.1",file:"one.md",title:{en:"Race one"},engines:[]},
   {id:"race/board",version:"0.1",file:"board.md",title:{en:"Race board"},engines:["card-board"]}]};
 let held=[];
 const release=(i,text)=>held[i].res({ok:true,text:async()=>text});
 global.fetch=url=>/registry\.json$/.test(url)?Promise.resolve({ok:true,json:async()=>REG})
   :new Promise(res=>held.push({url,res}));
 const modulesOf=X=>X.tplModules().length;
 wipe();withWrapper({registries:[REGURL]});
 A=boot();await sleep(20);                      // the shelf is loaded from the registry
 const sa=await A.createBooklet(),sb=await A.createBooklet(),sc=await A.createBooklet();
 // the "+ add activity" button
 A.openBooklet(sa.id);A.editing=true;A.render();
 {const btn=button(main(),"+ Race one");
  chk("the shelf offers the activity to add",!!btn);
  const p=click(btn);await sleep(0);
  chk("its download is pending",held.length===1&&/one\.md$/.test(held[0].url),String(held.length));
  A.openBooklet(sb.id);                         // the reader moves to booklet B meanwhile
  release(0,modSrc);await p;
  chk("an activity still downloading when the reader switched does not land in the booklet opened since",
    A.currentId===sb.id&&modulesOf(A)===0,"B holds "+modulesOf(A));
  A.openBooklet(sa.id);
  chk("nor was it added to the booklet it was asked for in",modulesOf(A)===0,"A holds "+modulesOf(A));
  // control: with no switch the same button does add it, so the checks above can fail (the earlier download, though dropped, stays cached on the shelf)
  A.openBooklet(sc.id);A.editing=true;A.render();
  await click(button(main(),"+ Race one"));   // the discarded download was kept on the shelf, so nothing is fetched again
  chk("control: the activity is in the booklet it was added to",modulesOf(A)===1,"C holds "+modulesOf(A));}
 // the "add map" link on the day picker, which adds a card-board module
 held=[];A.openBooklet(sa.id);
 {const box=A.dayPicker("k",[],["Things",""],{});
  const link=findAll(box,n=>n.tagName==="button")[0];
  chk("the day picker offers to add a map when it has none",!!link);
  const p=click(link);await sleep(0);
  chk("its download is pending",held.length===1&&/board\.md$/.test(held[0].url),String(held.length));
  A.openBooklet(sb.id);release(0,modSrc);await p;
  chk("a map still downloading when the reader switched does not land in the booklet opened since",
    A.currentId===sb.id&&modulesOf(A)===0,"B holds "+modulesOf(A));
  A.openBooklet(sa.id);
  chk("nor in the booklet it was asked for in",modulesOf(A)===0,"A holds "+modulesOf(A));}
 // a site's preset, applied after its request comes back
 noWrapper();wipe();held=[];withWrapper({});
 A=boot();
 const pa=await A.createBooklet(),pb=await A.createBooklet();
 withWrapper({preset_url:"https://site.invalid/preset.booklet.md"});
 A.openBooklet(pa.id);
 {const p=A.loadPreset();await sleep(0);
  chk("the preset request is pending",held.length===1,String(held.length));
  A.openBooklet(pb.id);release(0,exampleText);const took=await p;
  chk("a preset still downloading when the reader switched is not laid over the booklet opened since",
    took===false&&A.currentId===pb.id&&modulesOf(A)===0,"took "+took+", B holds "+modulesOf(A));
  A.openBooklet(pa.id);
  chk("nor over the one it was asked for in",modulesOf(A)===0,"A holds "+modulesOf(A));
  held=[];A.openBooklet(pb.id);
  const p2=A.loadPreset();await sleep(0);release(0,exampleText);
  chk("control: with no switch the preset is applied",(await p2)===true&&modulesOf(A)===1,"B holds "+modulesOf(A));}
 noWrapper();delete global.fetch;}

// ---- with storage off, the page works for the visit -------------------------
wipe();
const origSet=global.localStorage.setItem;
global.localStorage.setItem=()=>{throw new Error("QuotaExceededError");};
A=boot();
chk("storage off is noticed",A.storageOk===false);
const m1=await A.createBooklet();A.S.note="kept in memory";A.saveLocal();
await A.createBooklet();A.openBooklet(m1.id);
chk("booklets still switch without losing anything, for the visit",A.S.note==="kept in memory");
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
 A.S=A.emptyS();A.D={today:A.emptyToday(),checkin:A.emptyCheckin()};A.TPL={booklet:1,modules:[],widgets:[]};
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
