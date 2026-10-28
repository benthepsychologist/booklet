// Renderer 0.15 (booklet-hub item v015-host-modules-and-checksum): the default folder. A page served over http or https with
// no `booklet-store` tag reads `#/open/<name>` from `modules/` beside the renderer, so a host can serve the released file
// unchanged and its copy keeps the release's sha256. Checks: where the folder is (a renderer at /app/ and at /app/booklet.html
// both read /app/modules/); that it is the same reader with the same name rule and the same refusals as a declared store; that
// a declared store always wins, even one the page cannot use; that a page opened from disk is unchanged; that nothing is asked
// for until a link is followed; that a missing file says what a declared store's missing file says; and that the folder is
// only read: what opens from it is never the host's (a registered, allowed host hears nothing of it, and the bar says it is
// kept in this browser only), while it is listed, renamed and read again from the list as a store booklet is; and that two
// renderers on one site (/app/ and /other/), each with its own modules/a.md, never share the reader's work for that name, and
// a pointer from one is neither listed nor read on the other.
// The network is a stub: nothing here reaches one.
// Run: node test/modulesfolder.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
global.URL=Object.assign(require("url").URL,{createObjectURL:()=>"blob:x",revokeObjectURL(){}});
let META={};
global.document.querySelector=sel=>{const m=/meta\[name="([^"]+)"\]/.exec(sel);const v=m&&META[m[1]];return v?{getAttribute:k=>k==="content"?v:null}:null;};
const at=href=>{const u=new URL(href);global.location={href,protocol:u.protocol,hostname:u.hostname,hash:""};};
const booklet=(title,q)=>`---\nbooklet: "0.16"\ntitle: ${title}\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] ${q||"A question"}\n\n> [!module|m end] End\n`;
let CALLS=[],ROUTES={};
const reply=(body,o={})=>({ok:o.ok!==false,status:o.ok===false?404:200,headers:{get:k=>({"content-type":o.type||"text/markdown","content-length":o.len}[k.toLowerCase()])},
  body:{getReader(){const b=Buffer.from(body);let done=false;return {read:async()=>done?{done:true}:(done=true,{done:false,value:new Uint8Array(b)})};}},text:async()=>body});
const installFetch=()=>{global.fetch=async(url,opts)=>{CALLS.push({url:String(url),opts:opts||{}});
  const r=ROUTES[String(url)];if(r===undefined) return reply("nf",{ok:false});if(r instanceof Error) throw r;return typeof r==="function"?r():reply(r);};};
/* a fresh page at `href`: storage wiped unless `keep` (a reload, or another page of the same site) */
const boot=(href,o={})=>{if(o.keep) P.closePages();else{P.wipe();ROUTES={};}
  CALLS=[];META=o.meta||{};at(href);if(o.allowed) global.__ls["booklet.host.allowed"]=o.allowed;installFetch();return P.boot();};
const text=n=>P.texts(n);
const toast=()=>text(P.byId("toast"));
const lib=()=>JSON.parse(global.__ls["booklet.library.v1"]||'{"entries":[]}').entries;
const urls=()=>CALLS.map(c=>c.url);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const typeIn=(A,addr,words)=>{A.screen=addr;A.render();const ta=P.find(P.main(),n=>n.tagName==="textarea"||n.tagName==="input")[0];ta.value=words;ta._on.input();};
const ans=A=>((A.STATE.answers||{}).m||{}).q;
const APP="http://fleet/app/",MODS=APP+"modules/";

(async()=>{
/* ---- where the folder is: beside the renderer ---- */
for(const [href,want,why] of [
  [APP,MODS+"x.md","a renderer at /app/ reads /app/modules/"],
  [APP+"booklet.html",MODS+"x.md","a renderer at /app/booklet.html reads /app/modules/ too"],
  ["https://example.test/app/booklet.html?v=1",       "https://example.test/app/modules/x.md","over https, and a query on the page's address does not move it"],
  ["https://example.test/",                           "https://example.test/modules/x.md","a renderer at the site's root reads /modules/"],
  ["https://example.test/app",                        "https://example.test/modules/x.md","a renderer at /app with no slash reads /modules/ (serve it at /app/ or /app/booklet.html)"]]){
  const A=boot(href);ROUTES[want]=booklet("Week report");
  const ok=await A.openLink("#/open/x.md");
  chk(why,ok===true&&urls().join()===want,JSON.stringify(urls()));}
{const A=boot(APP);ROUTES[MODS+"reports/week.booklet.md"]=booklet("Week report");
 await A.openLink("#/open/reports/week.booklet.md");
 chk("a name with folders in it is read under modules/",urls().join()===MODS+"reports/week.booklet.md",JSON.stringify(urls()));}

/* ---- the same reader as a declared store ---- */
{const A=boot(APP);ROUTES[MODS+"week.booklet.md"]=booklet("Week report");
 const before=Object.keys(global.__ls).sort().join();
 const ok=await A.openLink("#/open/week.booklet.md");
 const c=CALLS[0]||{opts:{}};
 chk("one request, a GET with no method, no body, no credentials and no redirect, with a time limit",CALLS.length===1&&!c.opts.method&&!c.opts.body&&c.opts.credentials==="omit"&&c.opts.redirect==="error"&&!!c.opts.signal,JSON.stringify(CALLS));
 chk("the booklet opens into its one activity",ok===true&&A.screen==="m/a"&&/Week report/.test(JSON.stringify(A.BOOK.title)),A.screen);
 const pv=P.find(P.main(),P.hasClass("openedby"))[0];
 chk("the quiet line says it came from the modules folder beside this page, by its name (the default folder is not a store)",!!pv&&text(pv).startsWith("Opened by a link, from the modules folder beside this page: week.booklet.md")&&!/store/.test(text(pv)),pv?text(pv):"none");
 chk("it is listed in \"Your booklets\" at once, as a pointer from the default folder, with no copy of its content kept",lib().length===1&&lib()[0].from==="modules:/app/modules/#week.booklet.md"&&/Week report/.test(JSON.stringify(lib()[0].title))&&!Object.keys(global.__ls).some(k=>/^booklet\.b\./.test(k)),JSON.stringify(lib()));
 chk("...and nothing else was written but the list",Object.keys(global.__ls).filter(k=>!before.split(",").includes(k)).every(k=>k==="booklet.library.v1"||/^booklet\.(tick|ui\.)/.test(k)),Object.keys(global.__ls).join());}
{const A=boot(APP);
 for(const h of ["#/open/../x.md","#/open/https://x.test/y.md","#/open/x.txt","#/open/a%5Cb.md","#/open/","#/open/%2e%2e/x.md","#/open//etc/x.md"]) await A.openLink(h);
 chk("the same name rule: bad names request nothing",CALLS.length===0,JSON.stringify(urls()));
 chk("...and say so in the same words",/does not name a booklet/.test(toast()),toast());}
{const A=boot(APP);
 const tryit=async(route,why,words)=>{ROUTES={};if(route!==undefined) ROUTES[MODS+"x.md"]=route;CALLS=[];const ok=await A.openLink("#/open/x.md");
   chk(why,ok===false&&A.currentId===null&&lib().length===0&&CALLS.length===1&&words.test(toast()),toast());};
 await tryit(undefined,"a missing file reads as a declared store's missing file does, and opens nothing",/^That booklet could not be found\.$/);
 await tryit(()=>reply("<html>",{type:"text/html"}),"an HTML answer is refused as not text",/not a text file/);
 await tryit(()=>reply(booklet("Big"),{len:String(6*1024*1024)}),"a declared size over 5 MB is refused",/too big/);
 await tryit(()=>reply(booklet("Big")+"x".repeat(5*1024*1024+10)),"a body over 5 MB is refused",/too big/);
 await tryit(new Error("redirect"),"a redirect (which the browser raises as an error) is refused",/could not be fetched/);
 await tryit(()=>reply("just words, not a booklet"),"text the parser refuses is refused with its own message",/\S/);}

/* ---- a declared store always wins ---- */
{const A=boot(APP,{meta:{"booklet-store":"http://fleet/pub/"}});ROUTES["http://fleet/pub/x.md"]=booklet("From the store");ROUTES[MODS+"x.md"]=booklet("From the folder");
 await A.openLink("#/open/x.md");
 chk("with a store tag, the store is read and modules/ never is",urls().join()==="http://fleet/pub/x.md"&&/From the store/.test(JSON.stringify(A.BOOK.title)),JSON.stringify(urls()));
 chk("...and the booklet is the store's (store:<name>), as before",lib().length===1&&lib()[0].from==="store:x.md",JSON.stringify(lib().map(e=>e.from)));}
{const A=boot(APP,{meta:{"booklet-store":"javascript:alert(1)"}});ROUTES[MODS+"x.md"]=booklet("From the folder");
 const ok=await A.openLink("#/open/x.md");
 chk("a store tag the page cannot use still wins: no store, no default, nothing requested, and the page says so",ok===false&&CALLS.length===0&&/no store/.test(toast()),toast()+" "+JSON.stringify(urls()));}

/* ---- a page opened from disk is unchanged ---- */
{const A=boot("file:///home/reader/booklets/booklet.html");ROUTES["file:///home/reader/booklets/modules/x.md"]=booklet("On disk");
 const ok=await A.openLink("#/open/x.md");
 chk("from disk with no store tag: nothing is requested, nothing opens, and the page says it has no store",ok===false&&CALLS.length===0&&A.currentId===null&&/no store/.test(toast()),toast()+" "+JSON.stringify(urls()));}
{P.wipe();CALLS=[];META={};delete global.location;installFetch();const A=P.boot();
 const ok=await A.openLink("#/open/x.md");
 chk("with no address at all, nothing is requested",ok===false&&CALLS.length===0);
 global.location={href:APP,protocol:"http:",hostname:"fleet",hash:""};}

/* ---- nothing is asked for until a link is followed ---- */
{const A=boot(APP);ROUTES[MODS+"x.md"]=booklet("Ex");
 await sleep(30);A.render();A.createBooklet();A.loadText(booklet("Loaded by hand"));A.flushSave();A.closeBooklet();A.render();await sleep(30);
 chk("a page with a default folder asks for nothing at start, on its list, or for a booklet opened by hand",CALLS.length===0,JSON.stringify(urls()));
 await A.openLink("#/open/x.md");
 chk("following the link asks for that one file",urls().join()===MODS+"x.md",JSON.stringify(urls()));}
{global.location={href:APP+"#/open/x.md",protocol:"http:",hostname:"fleet",hash:"#/open/x.md"};P.wipe();ROUTES={};CALLS=[];META={};installFetch();
 ROUTES[MODS+"x.md"]=booklet("From the address bar");const A=P.boot();await sleep(50);
 chk("a link already in the address when the page loads is followed, and asks for that one file",urls().join()===MODS+"x.md"&&/From the address bar/.test(JSON.stringify(A.BOOK.title)),JSON.stringify(urls()));}

/* ---- read only: a booklet from the default folder is never the host's ---- */
{const LABEL="fleet: store";
 const A=boot(APP,{allowed:LABEL});ROUTES[MODS+"x.md"]=booklet("Folder booklet");
 const log=[];const me=A.BookletApi.host({label:LABEL});A.BookletApi.onChange(c=>log.push(c));
 chk("the host on this private page is active (the reader allowed it)",me.state()==="active",me.state());
 await A.openLink("#/open/x.md");await sleep(200);
 typeIn(A,"m/a","QZXfolderanswer");await sleep(700);A.flushSave();
 chk("the reader's answer is kept in this browser",ans(A)==="QZXfolderanswer"&&Object.keys(global.__ls).some(k=>/^booklet\.b\./.test(k)&&/QZXfolderanswer/.test(global.__ls[k])));
 chk("a registered, allowed host hears nothing of a booklet from the default folder",log.length===0,JSON.stringify(log.map(c=>c.name)));
 chk("...cannot read it",A.BookletApi.text()==="");
 chk("...and the bar says it is kept in this browser only",A.hostLineText(A.STRINGS.en.ui)===A.STRINGS.en.ui.hostKept,A.hostLineText(A.STRINGS.en.ui));
 const id=A.currentId;
 chk("no base is kept for it (a base is what a host's saves are measured against)",!(("booklet.base."+id) in global.__ls));
 // the newer file: the body is the folder's, the reader's work stays, and still nothing goes to the host
 A.closeBooklet();ROUTES[MODS+"x.md"]=booklet("Folder booklet","A newer question");
 await A.openLink("#/open/x.md");
 const offer=P.find(P.main(),P.hasClass("hostnote")).filter(n=>/changed where it is kept/.test(text(n)))[0];
 chk("opened again with a changed file: the kept booklet opens with the offer, the reader's answer in it",A.currentId===id&&!!offer&&ans(A)==="QZXfolderanswer");
 const b=offer&&P.find(offer,n=>n.tagName==="button"&&/Read the newer file/.test(text(n)))[0];if(b) b._on.click({isTrusted:true,target:b});
 await sleep(700);A.flushSave();
 chk("reading it takes the new body and keeps the reader's answer",/A newer question/.test(JSON.stringify(A.BOOK))&&ans(A)==="QZXfolderanswer",JSON.stringify(A.STATE.answers));
 chk("...and the host still hears nothing",log.length===0,log.length);
 // a control: on the same page the host's own booklet (Booklet.open with a name) is still the host's
 A.closeBooklet();const r=A.BookletApi.open(booklet("Host booklet"),{name:"x.md"});await sleep(50);
 typeIn(A,"m/a","QZXhostanswer");await sleep(700);A.flushSave();
 chk("control: a booklet the host hands over with a name is the host's, and the host hears of it",r.ok===true&&log.length>0&&log.every(c=>c.name==="x.md")&&/QZXhostanswer/.test(log[log.length-1].text),log.length);
 chk("...as a booklet of its own: the folder's x.md and the host's x.md are two entries",lib().map(e=>e.from).sort().join()==="modules:/app/modules/#x.md,store:x.md",JSON.stringify(lib().map(e=>e.from)));
 chk("no word of the folder booklet ever reached the host",!log.some(c=>/QZXfolderanswer|Folder booklet/.test(c.text)));}

/* ---- two renderers on one site, /app/ and /other/, each with its own modules/a.md: the same module and question ids,
   different text. The reader's work on one is never the other's, and a pointer from one is not listed on the other. ---- */
{const OTHER="http://fleet/other/",OM=OTHER+"modules/";
 const A=boot(APP);ROUTES[MODS+"a.md"]=booklet("App file","The app's question");ROUTES[MODS+"p.md"]=booklet("App pointer");
 await A.openLink("#/open/a.md");typeIn(A,"m/a","QZXappanswer");await sleep(700);A.flushSave();const aid=A.currentId;A.closeBooklet();
 await A.openLink("#/open/p.md");const pid=A.currentId;A.closeBooklet();
 chk("each entry names the folder it came from, /app/modules/",lib().map(e=>e.from).sort().join()==="modules:/app/modules/#a.md,modules:/app/modules/#p.md",JSON.stringify(lib().map(e=>e.from)));
 const B=boot(OTHER,{keep:true});ROUTES[OM+"a.md"]=booklet("Other file","The other's question");CALLS=[];
 await B.openLink("#/open/a.md");
 const offer=P.find(P.main(),P.hasClass("hostnote")).filter(n=>/changed where it is kept/.test(text(n)))[0];
 chk("on /other/, its own a.md opens as a booklet of its own: read from /other/modules/, a new entry, no offer of a newer file",urls().join()===OM+"a.md"&&B.currentId!==aid&&!offer&&/The other's question/.test(JSON.stringify(B.BOOK)),JSON.stringify(urls())+" same entry: "+(B.currentId===aid)+" offer: "+!!offer);
 chk("...and the answer typed on /app/ is nowhere in it",ans(B)===undefined&&!/QZXappanswer/.test(JSON.stringify(B.STATE)),JSON.stringify(B.STATE.answers));
 const oid=B.currentId;B.closeBooklet();B.screen="@booklets";B.render();
 const rows=P.find(P.main(),n=>n.tagName==="li").map(n=>text(n));
 chk("the list on /other/ leaves out /app/'s pointer: there is no folder here to open it from",!rows.some(r=>/App pointer/.test(r)),JSON.stringify(rows));
 chk("...and shows /other/'s own booklet and /app/'s booklet that holds the reader's work",rows.some(r=>/Other file/.test(r))&&rows.some(r=>/App file/.test(r)),JSON.stringify(rows));
 chk("...while the library itself still holds all three (nothing is removed)",lib().length===3&&lib().some(e=>e.id===pid),JSON.stringify(lib().map(e=>e.from)));
 CALLS=[];B.openFromList(pid);await sleep(30);
 chk("/app/'s pointer opened on /other/ reads nothing from /other/modules/, and the page says it has no store for it",CALLS.length===0&&/no store/.test(toast()),JSON.stringify(urls())+" "+toast());
 CALLS=[];B.openFromList(aid);await sleep(30);
 chk("/app/'s booklet with the reader's work opens on /other/ as that kept copy, with its own text and answer, reading nothing",CALLS.length===0&&B.currentId===aid&&/The app's question/.test(JSON.stringify(B.BOOK))&&ans(B)==="QZXappanswer",JSON.stringify(urls()));
 B.closeBooklet();
 const C=boot(APP,{keep:true});CALLS=[];
 await C.openLink("#/open/a.md");
 chk("back on /app/, the link opens /app/'s booklet, read from /app/modules/, with the reader's answer",urls().join()===MODS+"a.md"&&C.currentId===aid&&ans(C)==="QZXappanswer",JSON.stringify(urls()));
 C.closeBooklet();C.screen="@booklets";C.render();
 const rowsC=P.find(P.main(),n=>n.tagName==="li").map(n=>text(n));
 chk("and the list on /app/ shows its pointer again (and /other/'s booklet only while it holds work)",rowsC.some(r=>/App pointer/.test(r))&&!rowsC.some(r=>/Other file/.test(r))&&lib().some(e=>e.id===oid),JSON.stringify(rowsC));}

/* ---- "Your booklets": a pointer, read again from the folder; rename and download keep no copy ---- */
{const A=boot(APP);const U=MODS+"w.md";ROUTES[U]=booklet("Weekly");
 await A.openLink("#/open/w.md");const id=A.currentId;A.closeBooklet();
 ROUTES[U]=booklet("Weekly","A regenerated question");CALLS=[];
 A.openFromList(id);await sleep(30);
 chk("opening it from the list reads the folder's file again and draws it",urls().join()===U&&/regenerated question/.test(JSON.stringify(A.BOOK))&&A.currentId===id,JSON.stringify(urls()));
 chk("...still one entry, and still no copy kept",lib().length===1&&!(("booklet.b."+id) in global.__ls));
 A.download();await sleep(30);
 chk("downloading it unchanged keeps no copy here",!(("booklet.b."+id) in global.__ls));
 A.closeBooklet();
 chk("renaming it in the list names it there only, and keeps no copy",A.renameStored(id,"My weekly")===true&&lib()[0].named==="My weekly"&&!(("booklet.b."+id) in global.__ls),JSON.stringify(lib()[0]));
 // the same site's other page, which declares a store: the folder's pointer is not read from that store
 const B=boot(APP+"other.html",{keep:true,meta:{"booklet-store":"http://fleet/pub/"}});CALLS=[];
 B.openFromList(id);await sleep(30);
 chk("on a page with a store tag, a pointer from the default folder is not read from that store, and the page says so",CALLS.length===0&&/no store/.test(toast()),JSON.stringify(urls())+" "+toast());}
{const A=boot(APP+"other.html",{meta:{"booklet-store":"http://fleet/pub/"}});ROUTES["http://fleet/pub/s.md"]=booklet("Stored");
 await A.openLink("#/open/s.md");const id=A.currentId;A.closeBooklet();
 const B=boot(APP,{keep:true});CALLS=[];
 B.openFromList(id);await sleep(30);
 chk("and the other way: on a page with no tag, a store's pointer is not read from the default folder",CALLS.length===0,JSON.stringify(urls()));}

P.closePages();
console.log(fails?"\n"+fails+" FAILURES":"\nmodules-folder checks passed");process.exit(fails?1:0);
})();
