// Renderer 0.13.1: where the page keeps things. Everything it keeps lives in one IndexedDB database, read into memory
// once at start (nothing is drawn before that) and written behind: each change queued, in order, coalesced per key,
// one transaction at a time, all or nothing. What local storage held is moved into it, and removed only once the copy
// is confirmed. A browser that refuses IndexedDB keeps everything in local storage, as before, and says so; a store that
// is full, or fails, keeps the visit's work in memory and says that, never "private mode".
// IndexedDB here is test/idb-shim.js, a small one in memory that can refuse, run out of room, fail, hold a transaction
// and lose its page. The migration seeds (test/seeds/ls-*.json) are what the real 0.12.0, 0.13.0 and pre-change 0.13.1
// renderers left in a browser (test/seeds/make-seeds.js).
// Run: node test/keep.test.js      (Needs node; nothing to install.)
"use strict";
const P=require("./page.js");
const {makeIDB}=require("./idb-shim.js");
const fs=require("fs"),path=require("path");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const section=t=>console.log("\n"+t);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LS=global.__ls;
const SEED=n=>JSON.parse(fs.readFileSync(path.join(__dirname,"seeds","ls-"+n+".json"),"utf8"));
const lsKeys=()=>Object.keys(LS).filter(k=>k.startsWith("booklet.")).sort();
let IDB=null;
/* a fresh browser: no local storage, an empty IndexedDB */
function fresh(){if(IDB) IDB.ctl.kill();P.wipe();IDB=makeIDB();global.indexedDB=IDB.indexedDB;}
/* a reload: the page goes (nothing reaches it again), what the browser keeps stays */
function reload(){P.closePages();IDB.ctl.kill();return P.boot();}
const started=async A=>{await A.KEEP.started;return A;};
/* the page and the store quiet: no save waiting its 400 ms, nothing queued or on its way, nothing left to move */
async function idle(A){A.flushSave();
  for(let i=0;i<600;i++){await sleep(4);const K=A.KEEP;
    if(!K.queued&&!K.pending.size&&!K.inflight.length&&!K.leftBusy&&![...IDB.dbs.values()].some(d=>d.queue.length||d.running)) return true;}
  return false;}
const FM=t=>`---\nbooklet: "0.13"\ntitle: ${t}\nlang: en\n---\n\n`;
/* a booklet with one question outside every module, so its answer is answersIn("").q */
const BARE=(t,body)=>FM(t)+(body||"")+"\n> [!activity|a] A\n\n> [!text|q] A question\n";
const BIG=(t,n)=>BARE(t,"Words to make it large. ".repeat(Math.ceil(n/24))+"\n");
const toast=()=>P.byId("toast").textContent;
const keptText=(id)=>IDB.kv("booklet.b."+id)||"";
const listIds=A=>A.readLib().entries.map(e=>e.id).sort();

(async()=>{
section("IndexedDB is the store: read once at start, nothing drawn before");
{fresh();
 const A=P.boot();
 chk("while the store is read the page waits and has drawn nothing",A.KEEP.mode==="wait"&&!A.KEEP.ready&&P.main().children.length===0,A.KEEP.mode);
 await started(A);
 chk("once it is read the store is IndexedDB and \"Your booklets\" is drawn",A.KEEP.mode==="idb"&&A.screen==="@booklets"&&/Your booklets/.test(P.texts(P.main())),A.KEEP.mode+" "+A.screen);
 chk("the database is `booklet`, with its two object stores, kv and stamp",IDB.dbs.has("booklet")&&[...IDB.dbs.get("booklet").stores.keys()].sort().join()==="kv,stamp");
 A.loadText(BARE("Kept in the store"));const id=A.currentId;
 A.answersIn("").q="typed into the store";A.markDirty();
 A.flushSave();
 chk("a save is in memory at once (lsGet) and written behind: not yet in IndexedDB",/typed into the store/.test(A.lsGet("booklet.b."+id)||"")&&!/typed into the store/.test(keptText(id))&&A.KEEP.pending.has("booklet.b."+id));
 await idle(A);
 chk("the kept copy is written to IndexedDB",/typed into the store/.test(keptText(id)));
 chk("the list is kept as one record per entry under its head",IDB.kv("booklet.library.v1")&&JSON.parse(IDB.kv("booklet.library.v1")).order.join()===id&&!!IDB.kv("booklet.library.v1#"+id));
 chk("local storage holds nothing of the renderer's",lsKeys().length===0,lsKeys().join());
 const B=reload();await started(B);
 chk("after a reload the list holds the booklet",listIds(B).join()===id);
 B.openFromList(id);
 chk("and opening it finds the answer whole",B.answersIn("").q==="typed into the store",B.answersIn("").q);
 chk("lsGet gives the list whole, as text, as local storage did",JSON.parse(B.lsGet(B.LIB_KEY)).entries[0].id===id);

 section("written behind: in order, coalesced per key, one transaction at a time");
 let mark=IDB.log.length;
 for(let i=0;i<20;i++){B.answersIn("").q="keystroke "+i;B.saveLocal();}
 await idle(B);
 let seg=IDB.log.slice(mark),puts=seg.filter(x=>x.put==="booklet.b."+id&&x.store==="kv").length,txs=seg.filter(x=>x.tx==="readwrite").length;
 chk("twenty saves in one moment are one transaction with one write of the kept copy",puts===1&&txs===1,puts+" puts, "+txs+" transactions");
 chk("and what is written is the last of them",/keystroke 19/.test(keptText(id)));
 mark=IDB.log.length;IDB.ctl.hold=true;
 B.answersIn("").q="first, on its way";B.saveLocal();await sleep(10);
 for(let i=0;i<10;i++){B.answersIn("").q="typed while it was on its way "+i;B.saveLocal();await sleep(1);}
 IDB.ctl.release();await idle(B);
 seg=IDB.log.slice(mark);txs=seg.filter(x=>x.tx==="readwrite").length;puts=seg.filter(x=>x.put==="booklet.b."+id&&x.store==="kv").length;
 chk("changes made while a transaction is on its way wait for it, and go as one more (two in all)",txs===2&&puts===2,txs+" transactions, "+puts+" puts");
 chk("the store ends with the newest",/on its way 9/.test(keptText(id)));
 mark=IDB.log.length;IDB.ctl.failNext="UnknownError";
 B.answersIn("").q="lost by the store";B.saveLocal();await idle(B);
 chk("a transaction that fails lands nothing: the store still holds the copy before it",/on its way 9/.test(keptText(id))&&!/lost by the store/.test(keptText(id)));
 chk("its change stays in memory and in the queue",/lost by the store/.test(B.lsGet("booklet.b."+id))&&B.KEEP.pending.has("booklet.b."+id));
 chk("the reader is told the store failed, not that the browser is in private mode",B.KEEP.problem==="failed"&&/could not save your latest changes/.test(toast())&&!/private mode/.test(toast()),toast());
 B.answersIn("").q="the next change";B.saveLocal();await idle(B);
 chk("the next change writes it, and the problem is over",/the next change/.test(keptText(id))&&B.KEEP.problem==="",B.KEEP.problem);}

section("the store's own limit: QuotaExceededError from IndexedDB");
{fresh();
 const A=P.boot();await started(A);
 A.loadText(BARE("Small and kept"));const small=A.currentId;A.answersIn("").q="the small one";A.markDirty();await idle(A);
 IDB.ctl.quota=IDB.chars()+2000;
 A.loadText(BIG("Too big for the room left",200000));const big=A.currentId;A.answersIn("").q="the big one";A.markDirty();await idle(A);
 chk("a booklet bigger than the room left is refused by the store",A.KEEP.problem==="full"&&!IDB.kv("booklet.b."+big),A.KEEP.problem);
 chk("the toast says the browser ran out of room, not private mode",/run out of room/.test(toast())&&!/private mode/.test(toast()),toast());
 A.closeBooklet();A.render();
 const words=P.texts(P.main());
 chk("\"Your booklets\" says so too, and not private mode",/run out of room/.test(words)&&!/private mode/.test(words),words.slice(0,300));
 chk("for the visit nothing is lost: both booklets are listed and the big one opens with its answer",listIds(A).length===2&&(A.openFromList(big),A.answersIn("").q==="the big one"));
 chk("the store holds the last state it confirmed: the small booklet, whole, and no half of the big one",/the small one/.test(keptText(small))&&!IDB.kv("booklet.library.v1#"+big)&&!IDB.kv("booklet.b."+big));
 A.closeBooklet();
 A.removeBooklet(small);await idle(A);
 chk("a removal still lands when the store is full (removals go first)",!IDB.kv("booklet.b."+small),IDB.keys().join());
 IDB.ctl.quota=null;
 A.openFromList(big);A.answersIn("").q="the big one, with room";A.markDirty();await idle(A);
 chk("with room again the next change writes everything waiting, and the notice goes",/with room/.test(keptText(big))&&A.KEEP.problem===""&&!!IDB.kv("booklet.library.v1#"+big));
 A.closeBooklet();A.render();
 chk("\"Your booklets\" no longer says it is full",!/run out of room/.test(P.texts(P.main())));}

section("moving from local storage: 0.12.0, 0.13.0 and the pre-IndexedDB 0.13.1");
for(const name of ["0.12.0","0.13.0","0.13.1-pre"]){
  fresh();const seed=SEED(name);
  Object.keys(seed).filter(k=>k!=="_about").forEach(k=>{LS[k]=seed[k];});
  const ids=JSON.parse(seed["booklet.library.v1"]).entries.map(e=>e.id).sort();
  const A=P.boot();await started(A);
  chk(name+": the list holds its three booklets at once",listIds(A).join()===ids.join(),listIds(A).join());
  chk(name+": the language and the theme are in the store",A.lsGet("booklet.ui.lang")==="fr"&&A.lsGet(A.THEME_KEY)==="night");
  chk(name+": the first draw is in the reader's language",A.lang==="fr",A.lang);
  await idle(A);
  chk(name+": IndexedDB holds every kept copy exactly as local storage had it",ids.every(id=>IDB.kv("booklet.b."+id)===seed["booklet.b."+id]));
  chk(name+": the copy was confirmed with the browser's strictest durability",IDB.log.some(x=>x.tx==="readwrite"&&x.durability==="strict"));
  chk(name+": local storage then keeps only the theme's mirror",lsKeys().join()==="booklet.ui.theme",lsKeys().join());
  const B=reload();await started(B);
  const by=t=>B.readLib().entries.find(e=>e.title===t);
  B.openFromList(by("Studio project board").id);
  const log=(B.STATE.entries||{})["board/log"]||[];
  chk(name+": the board's kept entry is there",log.some(e=>e.what==="Seed "+name+": kept entry"),JSON.stringify(log).slice(0,200));
  chk(name+": and its draft",((B.DRAFTS.custom||{})["board/log"]||{}).what==="Seed "+name+": a draft not yet kept");
  B.closeBooklet();B.openFromList(by("A garden week").id);
  chk(name+": the garden week's answer is there",B.answersIn("").note==="Seed "+name+": the garden note",B.answersIn("").note);
  B.closeBooklet();
  chk(name+": the blank booklet is listed",B.readLib().entries.length===3);}

section("a copy that does not land leaves local storage as it was");
{fresh();const seed=SEED("0.13.0");Object.keys(seed).filter(k=>k!=="_about").forEach(k=>{LS[k]=seed[k];});
 IDB.ctl.quota=10;
 const A=P.boot();await started(A);await idle(A);
 chk("the store refused the copy, and local storage still holds every key",Object.keys(seed).filter(k=>k!=="_about").every(k=>LS[k]===seed[k])&&A.KEEP.problem==="full");
 chk("the booklets are there for the visit",listIds(A).length===3);
 IDB.ctl.quota=null;
 const B=reload();await started(B);await idle(B);
 chk("on the next visit with room the copy lands, and only then are the local storage keys removed",lsKeys().join()==="booklet.ui.theme"&&Object.keys(seed).filter(k=>k.startsWith("booklet.b.")).every(k=>IDB.kv(k)===seed[k]),lsKeys().join());}

section("a copy already made is never made again over newer work");
{fresh();const seed=SEED("0.13.1-pre");Object.keys(seed).filter(k=>k!=="_about").forEach(k=>{LS[k]=seed[k];});
 /* the copy lands, but its removal from local storage does not happen (as if the page went first) */
 const orig=global.localStorage.removeItem;global.localStorage.removeItem=k=>{if(/\.probe$/.test(k)) return orig(k);throw Object.assign(new Error("blocked"),{name:"SecurityError"});};
 const A=P.boot();await started(A);await idle(A);
 const g=A.readLib().entries.find(e=>e.title==="A garden week").id;
 chk("the copy landed, and local storage still holds what was copied",IDB.kv("booklet.b."+g)===seed["booklet.b."+g]&&LS["booklet.b."+g]===seed["booklet.b."+g]);
 A.openFromList(g);A.answersIn("").note="newer, typed after the move";A.markDirty();await idle(A);
 global.localStorage.removeItem=orig;
 const B=reload();await started(B);await idle(B);
 B.openFromList(g);
 chk("the next start does not copy the old leftover over the newer answer",B.answersIn("").note==="newer, typed after the move",B.answersIn("").note);
 chk("and it removes the leftovers from local storage",lsKeys().join()==="booklet.ui.theme",lsKeys().join());}

section("an older release's tab still open after the move");
{fresh();const seed=SEED("0.13.1-pre");Object.keys(seed).filter(k=>k!=="_about").forEach(k=>{LS[k]=seed[k];});
 const A=P.boot();await started(A);await idle(A);
 /* the older tab writes to local storage only: a new booklet, its list holding only what it re-read (nothing) and its own */
 LS["booklet.b.oldtab1"]=seed[Object.keys(seed).find(k=>k.startsWith("booklet.b."))].replace(/Seed 0\.13\.1-pre: the garden note|Seed 0\.13\.1-pre: kept entry/g,"written by the older tab");
 LS["booklet.library.v1"]=JSON.stringify({v:1,entries:[{id:"oldtab1",title:"From the older tab",parts:[],createdAt:"2026-10-14T00:00:00Z",updatedAt:"2026-10-14T00:00:00Z",dirty:true,unsavedEntries:0}]});
 const B=reload();await started(B);await idle(B);
 chk("the next start moves what it wrote, and keeps every booklet the store already had",listIds(B).length===4&&listIds(B).includes("oldtab1"),listIds(B).join());
 chk("and removes it from local storage once it is in the store",!LS["booklet.b.oldtab1"]&&!LS["booklet.library.v1"]&&!!IDB.kv("booklet.b.oldtab1"));}

section("a browser that refuses IndexedDB: local storage, as before, and the notice names the cause");
for(const how of ["refuse","throwOpen"]){
  fresh();const seed=SEED("0.13.1-pre");Object.keys(seed).filter(k=>k!=="_about").forEach(k=>{LS[k]=seed[k];});
  IDB.ctl[how]="SecurityError";
  const A=P.boot();await started(A);
  chk(how+": the page uses local storage, and knows why",A.KEEP.mode==="ls"&&A.KEEP.idbWhy==="SecurityError",A.KEEP.mode+" "+A.KEEP.idbWhy);
  chk(how+": every booklet is listed, and local storage is untouched",listIds(A).length===3&&Object.keys(seed).filter(k=>k!=="_about").every(k=>LS[k]===seed[k]));
  A.render();const w=P.texts(P.main());
  chk(how+": \"Your booklets\" says the browser would not open its larger store, and nothing about private mode",/(n’a pas voulu ouvrir son grand espace|would not open its larger store)/.test(w)&&!/(private mode|navigation privée)/.test(w),w.slice(0,400));
  const g=A.readLib().entries.find(e=>e.title==="A garden week");A.openFromList(g.id);A.answersIn("").note="kept in local storage";A.markDirty();A.flushSave();
  chk(how+": a change is written to local storage, as before",/kept in local storage/.test(LS["booklet.b."+g.id]||""));
  chk(how+": nothing reached IndexedDB",IDB.keys().length===0);}
{fresh();IDB.ctl.refuse="InvalidStateError";
 const orig=global.localStorage.setItem;
 global.localStorage.setItem=(k,v)=>{if(String(v).length>4000) throw Object.assign(new Error("full"),{name:"QuotaExceededError"});LS[k]=String(v);};
 const A=P.boot();await started(A);
 A.loadText(BIG("Too big for local storage",20000));A.answersIn("").q="x";A.markDirty();A.flushSave();await sleep(5);
 chk("in local storage, a full quota says the small store is full, not private mode",/small store \(about 5 MB\)/.test(toast())&&!/private mode/.test(toast()),toast());
 global.localStorage.setItem=orig;}
{fresh();IDB.ctl.refuse="SecurityError";
 const orig=global.localStorage.setItem;global.localStorage.setItem=()=>{throw Object.assign(new Error("denied"),{name:"SecurityError"});};
 const A=P.boot();await started(A);A.render();
 chk("both refused: the page says nothing is kept between visits (private mode, or site data blocked), as before",A.storageOk===false&&/not keeping anything between visits/.test(P.texts(P.main())));
 global.localStorage.setItem=orig;}

section("two tabs: a stale tab clobbers no more than the last write");
{fresh();
 const A=P.boot();await started(A);const B=P.boot();await started(B);
 A.loadText(BARE("Made in A"));const a=A.currentId;A.answersIn("").q="A's answer";A.markDirty();await idle(A);
 B.loadText(BARE("Made in B"));const b=B.currentId;await idle(B);
 const C=P.boot();await started(C);
 chk("two tabs each adding a booklet keep both (B never read A's)",listIds(C).includes(a)&&listIds(C).includes(b),listIds(C).join());
 A.closeBooklet();B.closeBooklet();
 await B.keepRefresh();
 chk("B, back in view, reads the store again and lists A's booklet",listIds(B).includes(a));
 A.openFromList(a);A.answersIn("").q="A's newer answer";A.markDirty();await idle(A);A.closeBooklet();
 await B.keepRefresh();B.openFromList(a);
 chk("B, back in view, opens A's booklet with A's newer answer, not the copy it read before",B.answersIn("").q==="A's newer answer",B.answersIn("").q);
 B.closeBooklet();await idle(B);
 await A.keepRefresh();const gone=A.removeBooklet(b);await idle(A);
 B.openFromList(a);B.closeBooklet();await idle(B);
 const D=P.boot();await started(D);
 chk("a booklet removed in A does not come back when B, which still lists it, changes another entry",gone===true&&!listIds(D).includes(b)&&listIds(D).includes(a),gone+" "+listIds(D).join());}

section("a host before the store is read; the mirrors");
{fresh();P.place("http:","fleet");LS["booklet.host.allowed"]="fleet: store";
 const A=P.boot();
 const h=A.BookletApi.host({label:"fleet: store"});
 chk("a host the reader allowed is active at once, before the store is read (its mirror in local storage)",A.KEEP.mode==="wait"&&h.state()==="active",A.KEEP.mode+" "+h.state());
 const r=A.BookletApi.open(BARE("Handed over early"),{});
 chk("Booklet.open before the store is read answers at once",r.ok===true&&Array.isArray(r.problems),JSON.stringify(r));
 chk("and the page has still drawn nothing",P.main().children.length===0);
 await started(A);
 chk("the booklet opens once the store is read",!!A.currentId&&/Handed over early/.test(JSON.stringify(A.BOOK.head||A.BOOK.title)),A.currentId);
 chk("the host is still active: the store, read, agrees",h.state()==="active");
 await idle(A);
 chk("the reader's yes is in the store, and stays mirrored",IDB.kv("booklet.host.allowed")==="fleet: store"&&LS["booklet.host.allowed"]==="fleet: store");
 LS["booklet.host.allowed"]="another label";
 const B=reload();const h2=B.BookletApi.host({label:"fleet: store"});
 chk("a mirror that disagrees decides only until the store is read",h2.state()==="waiting");
 await started(B);
 chk("the store holds the truth: the host is active, and the mirror is written again from the store",h2.state()==="active"&&LS["booklet.host.allowed"]==="fleet: store");
 B.lsSet(B.THEME_KEY,"night");await idle(B);
 chk("the theme is kept in the store and in its mirror",IDB.kv("booklet.ui.theme")==="night"&&LS["booklet.ui.theme"]==="night");
 delete LS["booklet.ui.theme"];reload();await sleep(30);
 chk("a mirror local storage lost is written again from the store",LS["booklet.ui.theme"]==="night");
 delete global.location;}

section("leaving the page: what is still queued is handed over as the page goes");
{fresh();
 const A=P.boot();await started(A);
 A.loadText(BARE("Left at once"));const id=A.currentId;A.answersIn("").q="the first answer";A.markDirty();await idle(A);
 IDB.ctl.hold=true;
 A.answersIn("").q="on its way when the page went";A.saveLocal();await sleep(10);
 A.answersIn("").q="typed just before the page went";A.markDirty();
 /* pagehide runs, then the page is gone: no callback reaches it again, and it can start nothing more */
 P.closePages();IDB.ctl.kill();
 IDB.ctl.release();await sleep(60);
 const B=reload();await started(B);B.openFromList(id);
 chk("a change made while a write was on its way, the page left at once, is in the store (handed over at pagehide)",B.answersIn("").q==="typed just before the page went",B.answersIn("").q);
 IDB.ctl.hold=true;
 B.answersIn("").q="on its way, and lost";B.saveLocal();await sleep(10);
 B.answersIn("").q="handed over as the page went, and lost";B.markDirty();
 IDB.ctl.failAll="UnknownError";
 P.closePages();IDB.ctl.kill();IDB.ctl.release();await sleep(60);IDB.ctl.failAll=null;
 const C=reload();await started(C);C.openFromList(id);
 chk("if what was handed over cannot land, the store holds the last state it confirmed",C.answersIn("").q==="typed just before the page went",C.answersIn("").q);}

section("Clear everything: the store and any local storage leftover");
{fresh();
 const A=P.boot();await started(A);
 A.loadText(BARE("To clear"));const id=A.currentId;A.answersIn("").q="clear me";A.markDirty();await idle(A);
 LS["booklet.b."+id]="a leftover copy";
 P.byId("clearGo")._on.click();await idle(A);
 chk("the kept copy is gone from IndexedDB",!IDB.kv("booklet.b."+id));
 chk("and from local storage",LS["booklet.b."+id]===undefined);}

console.log(fails?"\n"+fails+" FAILURES":"\nkeep checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  threw: "+(e&&e.stack||e));process.exit(1);});
