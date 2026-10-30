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
/* the renderer's keys in local storage, but its list count (booklet.tick: a page's id and a count, checked on its own below) */
const lsKeys=()=>Object.keys(LS).filter(k=>k.startsWith("booklet.")&&k!=="booklet.tick").sort();
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
const FM=t=>`---\nbooklet: "0.17"\ntitle: ${t}\nlang: en\n---\n\n`;
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
 chk("local storage holds nothing of the renderer's but its list count (a page's id and a count)",lsKeys().length===0&&/^[0-9a-z]+\.\d+$/.test(LS["booklet.tick"]||""),lsKeys().join()+" "+LS["booklet.tick"]);
 const B=reload();await started(B);
 chk("after a reload the list holds the booklet",listIds(B).join()===id);
 await B.openFromList(id);
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
 mark=IDB.log.length;IDB.ctl.failNext="DataError";
 B.answersIn("").q="lost by the store";B.saveLocal();await idle(B);
 chk("a transaction that fails lands nothing: the store still holds the copy before it",/on its way 9/.test(keptText(id))&&!/lost by the store/.test(keptText(id)));
 chk("its change stays in memory and in the queue",/lost by the store/.test(B.lsGet("booklet.b."+id))&&B.KEEP.pending.has("booklet.b."+id));
 chk("the reader is told the store failed, not that the browser is in private mode",B.KEEP.problem==="failed"&&/could not save your latest changes/.test(toast())&&!/private mode/.test(toast()),toast());
 B.answersIn("").q="the next change";B.saveLocal();await idle(B);
 chk("the next change writes it, and the problem is over",/the next change/.test(keptText(id))&&B.KEEP.problem==="",B.KEEP.problem);
 /* the connection itself lost (as Safari loses it after a while in the background, or closed for a newer version) */
 IDB.ctl.kill();
 B.answersIn("").q="written after the connection was lost";B.saveLocal();await sleep(50);await idle(B);
 chk("a lost connection is opened again, and what failed is written",/after the connection was lost/.test(keptText(id))&&B.KEEP.problem==="",B.KEEP.problem+" "+keptText(id).slice(0,60));}

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
 chk("for the visit nothing is lost: both booklets are listed and the big one opens with its answer",listIds(A).length===2&&(await A.openFromList(big),A.answersIn("").q==="the big one"));
 chk("the store holds the last state it confirmed: the small booklet, whole, and no half of the big one",/the small one/.test(keptText(small))&&!IDB.kv("booklet.library.v1#"+big)&&!IDB.kv("booklet.b."+big));
 A.closeBooklet();
 A.removeBooklet(small);await idle(A);
 chk("a removal still lands when the store is full (removals go first)",!IDB.kv("booklet.b."+small),IDB.keys().join());
 IDB.ctl.quota=null;
 await A.openFromList(big);A.answersIn("").q="the big one, with room";A.markDirty();await idle(A);
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
  await B.openFromList(by("Studio project board").id);
  const log=(B.STATE.entries||{})["board/log"]||[];
  chk(name+": the board's kept entry is there",log.some(e=>e.what==="Seed "+name+": kept entry"),JSON.stringify(log).slice(0,200));
  chk(name+": and its draft",((B.DRAFTS.custom||{})["board/log"]||{}).what==="Seed "+name+": a draft not yet kept");
  B.closeBooklet();await B.openFromList(by("A garden week").id);
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
 await A.openFromList(g);A.answersIn("").note="newer, typed after the move";A.markDirty();await idle(A);
 global.localStorage.removeItem=orig;
 const B=reload();await started(B);await idle(B);
 await B.openFromList(g);
 chk("the next start does not copy the old leftover over the newer answer",B.answersIn("").note==="newer, typed after the move",B.answersIn("").note);
 chk("and it removes the leftovers from local storage",lsKeys().join()==="booklet.ui.theme",lsKeys().join());}

section("newer wins after the move: an older release's tab, or a visit that fell back to local storage, against this one");
/* what an older release's tab still open after the move writes when the reader types there: its kept copy, and a list
   holding only its own entry (it re-reads local storage, which the move emptied) with updatedAt now (noteSaved) */
function oldTabSaves(seed,id,note){const k="booklet.b."+id,o=JSON.parse(seed[k]);o.S.answers[""].note=note;o.dirty=true;
  LS[k]=JSON.stringify(o);const e=JSON.parse(seed["booklet.library.v1"]).entries.find(x=>x.id===id);
  LS["booklet.library.v1"]=JSON.stringify({v:1,entries:[{...e,updatedAt:new Date().toISOString(),dirty:true}]});}
for(const storeLater of [true,false]){
  const said=storeLater?"this tab typed later":"the older tab typed later";
  fresh();const seed=SEED("0.13.0");Object.keys(seed).filter(k=>k!=="_about").forEach(k=>{LS[k]=seed[k];});
  const A=P.boot();await started(A);await idle(A);
  const g=A.readLib().entries.find(e=>e.title==="A garden week").id;
  if(storeLater){oldTabSaves(seed,g,"the older tab's, earlier");await sleep(5);await A.openFromList(g);A.answersIn("").note="this tab's, later";A.markDirty();await idle(A);}
  else{await A.openFromList(g);A.answersIn("").note="this tab's, earlier";A.markDirty();await idle(A);await sleep(5);oldTabSaves(seed,g,"the older tab's, later");}
  const B=reload();await started(B);await idle(B);await B.openFromList(g);
  chk(said+": the later answer wins, whichever side wrote it",B.answersIn("").note===(storeLater?"this tab's, later":"the older tab's, later"),B.answersIn("").note);
  chk(said+": one entry for the booklet, never two, and every other booklet still listed",B.readLib().entries.filter(e=>e.title==="A garden week").length===1&&listIds(B).length===3,listIds(B).join());
  chk(said+": local storage is emptied of it",!LS["booklet.b."+g]&&!LS["booklet.library.v1"],lsKeys().join());}
for(const storeLater of [true,false]){
  const said=storeLater?"fallback visit, this tab typed later":"fallback visit, it typed later";
  fresh();const seed=SEED("0.13.1-pre");Object.keys(seed).filter(k=>k!=="_about").forEach(k=>{LS[k]=seed[k];});
  IDB.ctl.refuse="SecurityError";const F=P.boot();await started(F);IDB.ctl.refuse=null;
  const g=F.readLib().entries.find(e=>e.title==="A garden week").id;F.openFromList(g);
  const A=P.boot();await started(A);await idle(A);
  chk(said+": the visit uses local storage, and the move has emptied it",F.KEEP.mode==="ls"&&!LS["booklet.b."+g]);
  const fType=async w=>{F.answersIn("").note=w;F.markDirty();F.flushSave();await sleep(5);};
  if(storeLater){await fType("the fallback visit's, earlier");await A.openFromList(g);A.answersIn("").note="this tab's, later";A.markDirty();await idle(A);}
  else{await A.openFromList(g);A.answersIn("").note="this tab's, earlier";A.markDirty();await idle(A);await sleep(5);await fType("the fallback visit's, later");}
  const B=reload();await started(B);await idle(B);await B.openFromList(g);
  chk(said+": the later answer wins",B.answersIn("").note===(storeLater?"this tab's, later":"the fallback visit's, later"),B.answersIn("").note);
  chk(said+": one entry for the booklet",B.readLib().entries.filter(e=>e.title==="A garden week").length===1&&listIds(B).length===3,listIds(B).join());}

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
  const g=A.readLib().entries.find(e=>e.title==="A garden week");await A.openFromList(g.id);A.answersIn("").note="kept in local storage";A.markDirty();A.flushSave();
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
 await A.openFromList(a);A.answersIn("").q="A's newer answer";A.markDirty();await idle(A);A.closeBooklet();
 await B.openFromList(a);
 chk("B opens A's booklet with A's newer answer, not the copy it read before: Open reads the store again first, with no focus needed",B.answersIn("").q==="A's newer answer",B.answersIn("").q);
 B.closeBooklet();await idle(B);
 await A.keepRefresh();const gone=A.removeBooklet(b);await idle(A);
 /* B, not back in view, still lists b, and changes another entry (a rename from its list writes only that entry) */
 B.renameStored(a,"Renamed in B");await idle(B);
 const D=P.boot();await started(D);
 chk("a booklet removed in A does not come back when B, which still lists it, changes another entry",gone===true&&!listIds(D).includes(b)&&listIds(D).includes(a),gone+" "+listIds(D).join());}

section("two tabs: a write that failed does not later overwrite another tab's");
{fresh();
 const A=P.boot();await started(A);
 A.loadText(BARE("Shared"));const x=A.currentId;A.answersIn("").q="first";A.markDirty();await idle(A);A.closeBooklet();
 const B=P.boot();await started(B);
 await A.openFromList(x);await idle(A);IDB.ctl.failNext="DataError";A.answersIn("").q="A's, never written";A.saveLocal();await idle(A);
 chk("A's write failed and waits in A's queue",A.KEEP.failed.has("booklet.b."+x)&&A.KEEP.pending.has("booklet.b."+x));
 await B.openFromList(x);B.answersIn("").q="B's, written after";B.markDirty();await idle(B);
 await A.keepRefresh();
 A.lsSet("booklet.ui.pagesMenu","open");await idle(A);
 chk("A, back in view, takes B's write, and its next change does not write its failed one over it",/B's, written after/.test(keptText(x)),keptText(x).slice(0,80));}

section("leaving with a write on its way: what is handed over holds a whole state");
{fresh();
 const A=P.boot();await started(A);
 A.loadText(BARE("Copy and base"));const x=A.currentId;A.answersIn("").q="C0";A.markDirty();await idle(A);
 A.lsSet("booklet.base."+x,"B0");await idle(A);
 IDB.ctl.hold=true;IDB.ctl.failNext="DataError";
 A.answersIn("").q="C1";A.saveLocal();await sleep(10);
 /* a host confirms: the base moves, with no save waiting (the copy is already on its way) */
 A.lsSet("booklet.base."+x,"B1");
 P.closePages();IDB.ctl.kill();IDB.ctl.release();await sleep(60);
 const B=reload();await started(B);
 chk("the first transaction failed, and the one handed over as the page went holds the copy with the base, so the base is not ahead of it",/"q":"C1"/.test(keptText(x))&&IDB.kv("booklet.base."+x)==="B1",keptText(x).slice(0,60)+" / "+IDB.kv("booklet.base."+x));}

section("before the store is read: a dropped file waits; a full local storage is still moved; others' keys stay");
{fresh();
 const A=P.boot();await started(A);A.loadText(BARE("Already kept"));await idle(A);
 const B=reload();
 B.loadText(BARE("Dropped while the store was read"));
 chk("a file dropped before the store is read waits (nothing is drawn or kept yet)",B.KEEP.mode==="wait"&&!B.currentId);
 await started(B);await idle(B);
 const titles=B.readLib().entries.map(e=>e.title).sort().join(" | ");
 chk("once the store is read it opens, beside every booklet already kept",titles==="Already kept | Dropped while the store was read",titles);}
{fresh();const seed=SEED("0.13.0");Object.keys(seed).filter(k=>k!=="_about").forEach(k=>{LS[k]=seed[k];});
 LS["booklet.someone-else"]="a key of the same prefix that is not the renderer's";
 const orig=global.localStorage.setItem;
 global.localStorage.setItem=(k,v)=>{throw Object.assign(new Error("full"),{name:"QuotaExceededError"});};
 const A=P.boot();await started(A);await idle(A);
 chk("local storage too full to take a write is still read, and everything in it moved",listIds(A).length===3&&Object.keys(seed).filter(k=>/^booklet\.b\./.test(k)).every(k=>IDB.kv(k)===seed[k]),listIds(A).join());
 chk("and the store says nothing is wrong",A.KEEP.problem===""&&A.storageOk===true,A.KEEP.problem);
 global.localStorage.setItem=orig;
 chk("the moved keys leave local storage; a key that is not the renderer's stays",!LS["booklet.library.v1"]&&LS["booklet.someone-else"]==="a key of the same prefix that is not the renderer's"&&IDB.kv("booklet.someone-else")===undefined,lsKeys().join());}
{fresh();IDB.ctl.refuse="SecurityError";
 const orig=global.localStorage.setItem;
 global.localStorage.setItem=(k,v)=>{throw Object.assign(new Error("full"),{name:"QuotaExceededError"});};
 const A=P.boot();await started(A);A.render();
 chk("without IndexedDB, local storage that is full at start says it is full, not private mode",A.KEEP.problem==="full"&&/run out of room/.test(P.texts(P.main()))&&!/private mode/.test(P.texts(P.main())),A.KEEP.problem);
 global.localStorage.setItem=orig;}

section("the line on \"Your booklets\" when IndexedDB is not used, even with nothing listed");
{fresh();const A=P.boot();await started(A);A.loadText(BARE("Kept in IndexedDB"));await idle(A);
 P.closePages();IDB.ctl.kill();IDB.ctl.refuse="SecurityError";
 const B=P.boot();await started(B);B.closeBooklet();B.render();const w=P.texts(P.main());
 chk("refused after the move: the list is empty, and says the larger store was not opened, so what it holds is not shown",/would not open its larger store/.test(w)&&/not shown/.test(w)&&B.readLib().entries.length===0,w.slice(0,300));}
{fresh();const A=P.boot();await started(A);A.loadText(BARE("Kept in IndexedDB"));await idle(A);
 /* time runs a hundred times faster for the waits of five seconds and more, so the test does not take them */
 const realST=global.setTimeout;global.setTimeout=(f,ms,...x)=>realST(f,ms>=5000?ms/100:ms,...x);
 for(const how of ["hangOpen","hangRead"]){
   P.closePages();IDB.ctl.kill();IDB.ctl.refuse=null;IDB.ctl.hangOpen=how==="hangOpen";IDB.ctl.hangRead=how==="hangRead";
   const B=P.boot();await started(B);B.render();const w=P.texts(P.main());
   chk(how+": a store that does not answer is given up on, and the page draws",B.KEEP.mode==="ls"&&B.KEEP.idbWhy==="TimeoutError"&&B.KEEP.ready,B.KEEP.mode+" "+B.KEEP.idbWhy);
   chk(how+": the list says the booklets kept here could not be read this time, and that a reload brings them back",/could not be read this time/.test(w)&&/Reload the page/.test(w),w.slice(0,300));}
 global.setTimeout=realST;IDB.ctl.hangOpen=false;IDB.ctl.hangRead=false;}

section("local storage full at start, IndexedDB fine: no false \"run out of room\"");
{fresh();const orig=global.localStorage.setItem;
 global.localStorage.setItem=(k,v)=>{throw Object.assign(new Error("full"),{name:"QuotaExceededError"});};
 const A=P.boot();await started(A);A.render();const w=P.texts(P.main());await sleep(450);
 chk("the list says nothing about room, and no toast does either",!/run out of room/.test(w)&&!/run out of room/.test(toast())&&A.KEEP.problem==="",A.KEEP.problem+" | "+toast());
 global.localStorage.setItem=orig;}

section("the theme: the latest pick wins");
{fresh();const A=P.boot();await started(A);A.lsSet(A.THEME_KEY,"night");await idle(A);
 LS["booklet.ui.theme"]="contrast";   /* picked where only local storage was written */
 const B=reload();await started(B);await idle(B);
 chk("a mirror that differs from the store holds the latest pick, and the store takes it",IDB.kv("booklet.ui.theme")==="contrast"&&LS["booklet.ui.theme"]==="contrast");
 const orig=global.localStorage.setItem;global.localStorage.setItem=(k,v)=>{throw Object.assign(new Error("full"),{name:"QuotaExceededError"});};
 LS["booklet.ui.theme"]="paper";B.lsSet(B.THEME_KEY,"daylight");await idle(B);
 const C=reload();await started(C);await idle(C);
 chk("unless local storage takes no write (its mirror is stale then): the store's stays",IDB.kv("booklet.ui.theme")==="daylight");
 global.localStorage.setItem=orig;}

section("a lost connection: tried again by itself");
{fresh();const A=P.boot();await started(A);A.loadText(BARE("Reconnects"));const id=A.currentId;await idle(A);
 IDB.ctl.kill();A.answersIn("").q="after the first loss";A.saveLocal();await sleep(60);await idle(A);
 chk("the first loss: opened again at once, and written",/after the first loss/.test(keptText(id)));
 IDB.ctl.kill();A.answersIn("").q="after a second loss, within five seconds";A.saveLocal();await sleep(200);
 chk("a second loss within five seconds waits",!/second loss/.test(keptText(id)));
 await sleep(5200);
 chk("and is opened again when they are up, by itself, with no further change",/second loss/.test(keptText(id)),keptText(id).slice(0,80));}

section("a failed write the page-hide hand-over carries is not written twice");
{fresh();const A=P.boot();await started(A);A.loadText(BARE("Carried"));const x=A.currentId;await idle(A);
 IDB.ctl.hold=true;IDB.ctl.failNext="DataError";
 A.answersIn("").q="carried";A.saveLocal();await sleep(10);
 A.lsSet("booklet.ui.pagesMenu","open");A.KEEP.queued=false;A.keepFlush(true);   /* hidden: handed over at once */
 const mark=IDB.log.length;IDB.ctl.release();await sleep(60);A.lsSet("booklet.ui.pagesMenu","min");await idle(A);
 const puts=IDB.log.slice(mark).filter(e=>e.put==="booklet.b."+x&&e.store==="kv").length;
 chk("the copy is in the store, from the hand-over",/"q":"carried"/.test(keptText(x)));
 chk("and it was written twice in all (the failed transaction, the hand-over), not a third time after",puts===2,puts+" writes");}

section("the list's change count in local storage (booklet.tick)");
{fresh();const A=P.boot();await started(A);A.loadText(BARE("Counted"));const id=A.currentId;await idle(A);A.closeBooklet();await idle(A);
 const t1=LS["booklet.tick"];
 A.lsSet("booklet.ui.pagesMenu","open");await idle(A);
 chk("a landed write that touches the list raises the count; one that does not leaves it",/^[0-9a-z]+\.\d+$/.test(t1||"")&&LS["booklet.tick"]===t1,t1+" / "+LS["booklet.tick"]);
 A.renameStored(id,"Counted, renamed");await idle(A);
 const t2=LS["booklet.tick"];
 chk("a rename (a list write) raises it, to a new value: this page's id and a count of its own",t2!==t1&&t2.split(".")[0]===t1.split(".")[0]&&Number(t2.split(".")[1])===Number(t1.split(".")[1])+1,t1+" / "+t2);
 const B=P.boot();await started(B);B.loadText(BARE("From another tab"));await idle(B);
 chk("two tabs raising it never write the same value (a write of the value already there tells no one)",LS["booklet.tick"]!==t2&&LS["booklet.tick"].split(".")[0]!==t2.split(".")[0],t2+" / "+LS["booklet.tick"]);
 const C=reload();await started(C);await idle(C);
 chk("the move never takes it, and the store never holds it",!!LS["booklet.tick"]&&IDB.kv("booklet.tick")===undefined);}

section("a booklet removed here, which an older tab still lists, is not listed again empty");
for(const removedFirst of [false,true]){
  const said=removedFirst?"removed here, then changed in the older tab":"changed in the older tab, then removed here";
  fresh();const seed=SEED("0.13.0");Object.keys(seed).filter(k=>k!=="_about").forEach(k=>{LS[k]=seed[k];});
  const A=P.boot();await started(A);await idle(A);
  const g=A.readLib().entries.find(e=>e.title==="A garden week").id;
  if(removedFirst){A.removeBooklet(g);await idle(A);await sleep(5);oldTabSaves(seed,g,"the older tab's, after the removal");}
  else{oldTabSaves(seed,g,"the older tab's, before the removal");await sleep(5);A.removeBooklet(g);await idle(A);}
  chk(said+": local storage holds "+(removedFirst?"the older tab's copy and entry":"only the older tab's entry (the removal took the copy)"),!!LS["booklet.library.v1"]&&(removedFirst?!!LS["booklet.b."+g]:!LS["booklet.b."+g]));
  const B=reload();await started(B);await idle(B);
  const e=B.readLib().entries.filter(x=>x.id===g);
  if(removedFirst){await B.openFromList(g);
    chk(said+": it comes back with that later change, not empty",e.length===1&&B.answersIn("").note==="the older tab's, after the removal",B.answersIn("").note);}
  else chk(said+": it is not listed again (it would open empty), and local storage is emptied of it",e.length===0&&listIds(B).length===2&&!LS["booklet.library.v1"],listIds(B).join()+" | "+lsKeys().join());}

section("a kept copy and its base never come from different sides");
{fresh();const seed=SEED("0.13.0");Object.keys(seed).filter(k=>k!=="_about").forEach(k=>{LS[k]=seed[k];});
 const A=P.boot();await started(A);await idle(A);
 const g=A.readLib().entries.find(e=>e.title==="A garden week").id,copy=IDB.kv("booklet.b."+g);
 /* an older tab's host confirmed a save: it writes the base alone (0.13.0's hostAnswered), with no copy */
 LS["booklet.base."+g]="the older tab's base";
 let B=reload();await started(B);await idle(B);
 chk("local storage wins with a base and no copy: its base is not put beside the store's copy, which stays, with no base",IDB.kv("booklet.b."+g)===copy&&IDB.kv("booklet.base."+g)===undefined&&!LS["booklet.base."+g],String(IDB.kv("booklet.base."+g)));
 B.lsSet("booklet.base."+g,"the store's base");await idle(B);
 LS["booklet.base."+g]="another older tab's base";
 B=reload();await started(B);await idle(B);
 chk("both sides changed and the store wins: its copy and its own base stay together",IDB.kv("booklet.b."+g)===copy&&IDB.kv("booklet.base."+g)==="the store's base"&&!LS["booklet.base."+g],String(IDB.kv("booklet.base."+g)));}

section("a store pointer an older tab writes after the move keeps the store's copy and base together");
{fresh();const seed=SEED("0.13.0");Object.keys(seed).filter(k=>k!=="_about").forEach(k=>{LS[k]=seed[k];});
 const A=P.boot();await started(A);await idle(A);
 const g=A.readLib().entries.find(e=>e.title==="A garden week").id,copy=IDB.kv("booklet.b."+g);
 A.lsSet("booklet.base."+g,"the store's base");await idle(A);
 /* a 0.13.0 tab re-opens the store booklet after the move: its list holds the entry as a pointer, with no copy and no base */
 const e=JSON.parse(seed["booklet.library.v1"]).entries.find(x=>x.id===g);
 LS["booklet.library.v1"]=JSON.stringify({v:1,entries:[{...e,from:"store:garden.md",storeSeen:"x.1",openedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),dirty:false,unsavedEntries:0}]});
 const B=reload();await started(B);await idle(B);
 const be=B.readLib().entries.find(x=>x.id===g);
 chk("local storage's pointer entry is taken, and the store keeps its kept copy and its own base, as a pair",!!be&&be.from==="store:garden.md"&&IDB.kv("booklet.b."+g)===copy&&IDB.kv("booklet.base."+g)==="the store's base",JSON.stringify({from:be&&be.from,base:IDB.kv("booklet.base."+g)}));}

section("a first read that ends after the visit fell back is not loaded");
{fresh();const A=P.boot();await started(A);A.loadText(BARE("Kept, read late"));await idle(A);
 P.closePages();IDB.ctl.kill();
 const realST=global.setTimeout;global.setTimeout=(f,ms,...x)=>realST(f,ms>=5000?ms/100:ms,...x);
 IDB.ctl.slowRead=400;
 const B=P.boot();await started(B);
 chk("the read took too long: local storage, with the timeout's reason",B.KEEP.mode==="ls"&&B.KEEP.idbWhy==="TimeoutError");
 await sleep(600);
 chk("and when the read ends, nothing of it is loaded into the page",B.KEEP.cache.size===0,B.KEEP.cache.size);
 global.setTimeout=realST;IDB.ctl.slowRead=0;}

section("a host waiting when \"Your booklets\" is first drawn, on a page with no navigator.storage");
/* the store's first draw comes after a host's script has registered; with no navigator.storage (an http: page that is
   not localhost, and Node) the first list asks checkPersisted, which used to draw again inside that draw */
{fresh();P.place("http:","fleet");const A=P.boot();await started(A);A.loadText(BARE("Listed once"));await idle(A);
 P.closePages();IDB.ctl.kill();
 const B=P.boot();const h=B.BookletApi.host({label:"a label not allowed"});await started(B);
 const asks=P.find(P.main(),P.hasClass("hostask")).length,cards=(P.texts(P.main()).match(/Listed once/g)||[]).length;
 chk("the list is drawn once: one host notice, one card for the booklet",h.state()==="waiting"&&asks===1&&cards===1,asks+" notices, "+cards+" cards");
 delete global.location;}

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
 await started(B);await idle(B);
 chk("the reader's yes is kept only where the store and its mirror agree: here it is forgotten, and the host asks again",h2.state()==="waiting"&&LS["booklet.host.allowed"]===undefined&&IDB.kv("booklet.host.allowed")===undefined,h2.state());
 B.lsSet(B.HOST_KEY,"fleet: store");await idle(B);delete LS["booklet.host.allowed"];
 const B2=reload();const h3=B2.BookletApi.host({label:"fleet: store"});await started(B2);await idle(B2);
 chk("a Stop made where only local storage was written (its mirror gone) is not undone by the store",h3.state()==="waiting"&&IDB.kv("booklet.host.allowed")===undefined,h3.state());
 B2.lsSet(B2.THEME_KEY,"night");await idle(B2);
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
 const B=reload();await started(B);await B.openFromList(id);
 chk("a change made while a write was on its way, the page left at once, is in the store (handed over at pagehide)",B.answersIn("").q==="typed just before the page went",B.answersIn("").q);
 IDB.ctl.hold=true;
 B.answersIn("").q="on its way, and lost";B.saveLocal();await sleep(10);
 B.answersIn("").q="handed over as the page went, and lost";B.markDirty();
 IDB.ctl.failAll="UnknownError";
 P.closePages();IDB.ctl.kill();IDB.ctl.release();await sleep(60);IDB.ctl.failAll=null;
 const C=reload();await started(C);await C.openFromList(id);
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
