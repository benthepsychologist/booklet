// Renderer 0.13: a store booklet's file is the truth, and what this browser keeps of it is only a buffer. A store booklet
// (opened by #/open/<name> from the page's declared store) is listed under "Your booklets" as a pointer, with no kept copy;
// a kept copy appears only when the reader changes something. Opening it again, by its link or from the list, reads the
// store's file and draws it whenever the file holds every answer, entry and draft the kept copy holds and the kept copy
// changes nothing of the booklet itself; otherwise the kept copy opens and the newer file is offered. That is decided on
// content when the booklet opens, never on when a host said "saved", so it holds with a host that registers late, answers
// fast, answers for another booklet, or answers in another tab.
// Each block below was a failure of the first version of this change (36d7126, the cold review's B1-B4, S1-S3, N2-N5):
// the comment on each says which. The network is a stub, and the host is a stand-in for the box's booklet-host.js and
// its server (the body kept from the file on disk, the records taken from the browser's text).
// Run: node test/storeheld.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
global.URL=Object.assign(require("url").URL,{createObjectURL:()=>"blob:x",revokeObjectURL(){}});
global.location={href:"http://fleet/app/",protocol:"http:",hostname:"fleet",hash:""};
let META={};
global.document.querySelector=sel=>{const m=/meta\[name="([^"]+)"\]/.exec(sel);const v=m&&META[m[1]];return v?{getAttribute:k=>k==="content"?v:null}:null;};
const STORE="http://fleet/booklets/",LABEL="fleet: store";
const FM=t=>`---\nbooklet: "0.13"\ntitle: ${t}\nlang: en\n---\n\n`;
const booklet=(title,q)=>FM(title)+`> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] ${q||"A question"}\n\n> [!module|m end] End\n`;
const TWO=title=>FM(title)+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!activity|b] B\n\n> [!text|r] Another\n\n> [!module|m end] End\n";
/* a file whose records already hold an answer (saved from another device, or earlier) */
const withAnswer=(t,words)=>t.replace(/\n$/,"")+"\n\n%%\n> [!records] App record — do not edit below this line\n\n> [!records|m] M\n\n```booklet answers\n{\"q\": \""+words+"\"}\n```\n\n%%\n";
let CALLS=[],ROUTES={};
const reply=(body,o={})=>({ok:o.ok!==false,status:o.ok===false?404:200,headers:{get:k=>({"content-type":o.type||"text/markdown","content-length":o.len}[k.toLowerCase()])},
  body:{getReader(){const b=Buffer.from(body);let done=false;return {read:async()=>done?{done:true}:(done=true,{done:false,value:new Uint8Array(b)})};}},text:async()=>body});
const installFetch=()=>{global.fetch=async(url,opts)=>{CALLS.push({url:String(url),opts:opts||{}});
  const r=ROUTES[String(url)];if(r===undefined) return reply("nf",{ok:false});if(r instanceof Error) throw r;return typeof r==="function"?r():reply(r);};};
/* a page load: `keep` keeps what the browser has stored (a reload, or a later visit); `allowed` is the reader's yes to the host */
function boot({keep=false,allowed=true}={}){
  if(keep) P.closePages();else{P.wipe();ROUTES={};}
  CALLS=[];P.place("http:","fleet");if(allowed) global.__ls["booklet.host.allowed"]=LABEL;
  installFetch();META={"booklet-store":STORE};
  return P.boot();}
/* the store server's rule (storefile.merge, for the texts this renderer writes): the body from the file on disk, the records
   from the browser's text */
const split=t=>{const i=t.indexOf("\n%%\n> [!records]");return i<0?[t,""]:[t.slice(0,i),t.slice(i+1)];};
const merge=(disk,browser)=>{const b=split(disk)[0].replace(/\s+$/,""),r=split(browser)[1];return r?b+"\n\n"+r.replace(/\n+$/,"")+"\n":b+"\n";};
const sameBody=(a,b)=>split(a)[0].replace(/\s+$/,"")===split(b)[0].replace(/\s+$/,"");
/* A stand-in for booklet-host.js and its server. o.delay(c): ms before answering; o.fail(c): answer failed(); o.bare:
   answer saved()/failed() naming no change (a host written before `change` existed); o.refuseEmpty: refuse a text with no
   records over a file that has some, as the box's server does. */
function host(A,o={}){const me=A.BookletApi.host({label:LABEL});const log=[];
  A.BookletApi.onChange(c=>{log.push(c);const url=STORE+c.name;
    const go=()=>{if(o.fail&&o.fail(c)){o.bare?me.failed("down"):me.failed("down",c);return;}
      const disk=typeof ROUTES[url]==="string"?ROUTES[url]:c.text;
      if(o.refuseEmpty&&!split(c.text)[1]&&split(disk)[1]){o.bare?me.failed("refused"):me.failed("refused",c);return;}
      const m=merge(disk,c.text),kept=!sameBody(c.text,disk);ROUTES[url]=m;if(kept) me.fileChanged(m);
      o.bare?me.saved():me.saved(c);};
    const d=o.delay?o.delay(c):0;if(d) setTimeout(go,d);else go();});
  return {me,log};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const lib=()=>JSON.parse(global.__ls["booklet.library.v1"]||'{"entries":[]}').entries;
const keyOf=id=>"booklet.b."+id;
const kept=id=>keyOf(id) in global.__ls;
const text=n=>P.texts(n);
const offer=()=>P.find(P.main(),P.hasClass("hostnote")).filter(n=>/changed where it is kept/.test(text(n))).length;
const drawn=A=>JSON.stringify(A.BOOK);
const ans=(A,sc,k)=>((A.STATE.answers||{})[sc||"m"]||{})[k||"q"];
const typeIn=(A,addr,words)=>{A.screen=addr;A.render();const ta=P.find(P.main(),x=>x.tagName==="textarea")[0];ta.value=words;ta._on.input();};
const press=(re,within)=>{const b=P.find(within||P.main(),n=>n.tagName==="button"&&re.test(text(n)))[0];if(b) b._on.click({isTrusted:true,target:b});return !!b;};

(async()=>{
/* ---- B1: renaming a pointer from the list wrote a blank booklet into it, which a late host then saved over the file ---- */
{const U=STORE+"w.md";
 let A=boot();ROUTES[U]=withAnswer(booklet("Week"),"RECORD-IN-STORE");
 await A.openLink("#/open/w.md");const id=A.currentId;
 chk("B1 setup: a store booklet read by its link is listed as a pointer, with no kept copy",lib().length===1&&lib()[0].id===id&&!kept(id)&&ans(A)==="RECORD-IN-STORE");
 A.closeBooklet();
 chk("Rename on a pointer changes only its name in the list",A.renameStored(id,"Week (mine)")===true&&!kept(id)&&lib()[0].named==="Week (mine)"&&lib()[0].title==="Week",JSON.stringify(lib()[0]));
 A.render();chk("...and the list shows that name",/Week \(mine\)/.test(text(P.main())));
 // a later visit by the link, where the host's script registers after the store's file has arrived (Ben's flow)
 A=boot({keep:true});await A.openLink("#/open/w.md");
 chk("opened again by its link with the host not yet registered, the store's booklet is drawn (its module and its record)",A.allModules().length===1&&ans(A)==="RECORD-IN-STORE"&&!offer(),"modules="+A.allModules().length+" answer="+ans(A));
 const h=host(A);await sleep(800);
 chk("the late host is sent only text that holds the store's record",h.log.length>0&&h.log.every(c=>/RECORD-IN-STORE/.test(c.text)),h.log.length+" sent");
 chk("the store's file still holds the record",/RECORD-IN-STORE/.test(ROUTES[U]));
 chk("the reader's name for it stays in the list after it is read again",lib().length===1&&lib()[0].named==="Week (mine)"&&lib()[0].id===id);
 A.closeBooklet();A.openFromList(id);await sleep(30);
 chk("Open from the list reads the store and draws the booklet, not a blank one",A.allModules().length===1&&ans(A)==="RECORD-IN-STORE"&&CALLS.some(c=>c.url===U));}
// the same with the host waiting for the reader's Allow (a host new to this browser)
{const U=STORE+"w.md";
 let A=boot({allowed:false});ROUTES[U]=withAnswer(booklet("Week"),"RECORD-IN-STORE");const h=host(A);
 await A.openLink("#/open/w.md");const id=A.currentId;A.closeBooklet();
 A.renameStored(id,"Week (mine)");A.render();A.openFromList(id);await sleep(30);
 chk("with the host waiting for Allow: Open from the list after a rename draws the store's booklet",A.allModules().length===1&&ans(A)==="RECORD-IN-STORE");
 chk("...and after Allow the host is sent only text that holds the record",press(/Allow/)&&(await sleep(800),h.log.length>0&&h.log.every(c=>/RECORD-IN-STORE/.test(c.text))),h.log.length+" sent");
 chk("...and the store's file keeps it",/RECORD-IN-STORE/.test(ROUTES[U]));}
// a blank kept copy already in a browser (what the first version's rename wrote): it is treated as empty, never drawn or sent
{const U=STORE+"w.md";
 let A=boot();ROUTES[U]=withAnswer(booklet("Week"),"RECORD-IN-STORE");
 await A.openLink("#/open/w.md");const id=A.currentId;A.closeBooklet();
 const blank=A.nameBooklet(A.blankBook(),"Week (mine)");
 global.__ls[keyOf(id)]=JSON.stringify({S:{answers:{},entries:{}},D:{custom:{}},TPL:blank,lang:"en",dirty:true,unsavedEntries:0});
 A=boot({keep:true});await A.openLink("#/open/w.md");const h=host(A);await sleep(800);
 chk("a blank kept copy of a store booklet is not drawn: the store's booklet is, and the blank copy goes",A.allModules().length===1&&ans(A)==="RECORD-IN-STORE"&&!kept(id));
 chk("...and nothing without the record is ever sent",h.log.every(c=>/RECORD-IN-STORE/.test(c.text))&&/RECORD-IN-STORE/.test(ROUTES[U]));
 // the store does not answer: the list falls back to what is kept, and a blank booklet that opens that way is never sent
 A.closeBooklet();global.__ls[keyOf(id)]=JSON.stringify({S:{answers:{},entries:{}},D:{custom:{}},TPL:blank,lang:"en",dirty:true,unsavedEntries:0});
 const n0=h.log.length;ROUTES[U]=new Error("down");A.openFromList(id);await sleep(800);
 chk("a store booklet with no module open on screen is never sent to the host",A.currentId===id&&A.allModules().length===0&&h.log.length===n0,"sent "+(h.log.length-n0));}

/* ---- B2: a host's late saved() for booklet A marked booklet B, which then lost its unsaved work ---- */
for(const bare of [false,true]){const tag=bare?" (a host that names no change)":"";
 const A=boot();let mode="fail";
 host(A,{bare,fail:c=>mode==="fail"&&c.name==="b.md",delay:c=>c.name==="a.md"?400:0});
 ROUTES[STORE+"a.md"]=booklet("Alpha");ROUTES[STORE+"b.md"]=booklet("Beta");
 await A.openLink("#/open/b.md");const idB=A.currentId;typeIn(A,A.screen,"BWORK");await sleep(1200);
 chk("B2 setup"+tag+": B holds work the store lacks (its saves fail)",kept(idB)&&!/BWORK/.test(ROUTES[STORE+"b.md"]));
 A.closeBooklet();ROUTES[STORE+"b.md"]=booklet("Beta","A regenerated question");mode="ok";
 await A.openLink("#/open/a.md");await sleep(800);typeIn(A,A.screen,"AWORK");await sleep(250);
 // ...and the reader goes to B by its link before A's save is answered
 await A.openLink("#/open/b.md");
 chk("B opens its kept copy, with its work and the offer"+tag,A.currentId===idB&&ans(A)==="BWORK"&&offer()===1);
 await sleep(700);
 if(!bare) chk("A's late saved() leaves B's bar as it was: it does not say Saved",!/Saved/.test(A.hostLineText(A.STRINGS.en.ui)),A.hostLineText(A.STRINGS.en.ui));
 chk("A's change reached the store before B opened (told to the host as A was left)"+tag,/AWORK/.test(ROUTES[STORE+"a.md"]));
 A.closeBooklet();await A.openLink("#/open/b.md");
 chk("B's work is still there when it is opened again"+tag,ans(A)==="BWORK"&&kept(idB));}
// two tabs: one with its host waiting, one active and slow; the kept copy ends up holding the first tab's answer only
{P.wipe();ROUTES={};CALLS=[];P.place("http:","fleet");installFetch();META={"booklet-store":STORE};ROUTES[STORE+"x.md"]=booklet("Ex");
 const TA=P.boot();host(TA);await TA.openLink("#/open/x.md");const id=TA.currentId;
 global.__ls["booklet.host.allowed"]=LABEL;const TB=P.boot();host(TB,{delay:()=>1500});await TB.openLink("#/open/x.md");await sleep(1700);
 chk("two tabs setup: one entry, tab A's host waiting, tab B's active",TB.currentId===id&&TA.HOST.state==="waiting"&&TB.HOST.state==="active");
 TB.render();{const ta=P.find(P.main(),x=>x.tagName==="textarea")[0];ta.value="B1";ta._on.input();}await sleep(600);
 TA.render();{const ta=P.find(P.main(),x=>x.tagName==="textarea")[0];ta.value="A1";ta._on.input();}await sleep(1700);
 chk("two tabs setup: the kept copy holds A1 and the store B1",/A1/.test(global.__ls[keyOf(id)]||"")&&/B1/.test(ROUTES[STORE+"x.md"])&&!/A1/.test(ROUTES[STORE+"x.md"]));
 P.closePages();const T3=P.boot();host(T3);await T3.openLink("#/open/x.md");
 chk("tab B's save being answered does not let a later open drop tab A's answer: the kept copy opens, with the offer",ans(T3)==="A1"&&offer()===1,JSON.stringify(T3.STATE.answers));}

/* ---- B3: a change to the booklet itself (a rename inside it, a module added or removed) was marked hosted and dropped ---- */
{const U=STORE+"r.md";
 let A=boot();host(A,{delay:()=>100});ROUTES[U]=booklet("Report");
 await A.openLink("#/open/r.md");const id=A.currentId;await sleep(800);
 A.renameBooklet("My own name");await sleep(800);
 chk("B3 setup: the store kept its own title and offered its file",!/My own name/.test(ROUTES[U])&&offer()===1);
 A.closeBooklet();await A.openLink("#/open/r.md");
 chk("a booklet renamed inside it opens as kept, with the reader's name (the store's file is unchanged: no offer)",/My own name/.test(JSON.stringify(A.BOOK.head||{}))&&!offer()&&A.currentId===id);
 // the generator rewrites the file: then the newer file is offered too
 A.closeBooklet();ROUTES[U]=booklet("Report","A newer question");await A.openLink("#/open/r.md");
 chk("...and with the file rewritten since, it opens as kept with the offer",/My own name/.test(JSON.stringify(A.BOOK.head||{}))&&offer()===1&&A.currentId===id);
 A.closeBooklet();A.openFromList(id);await sleep(30);
 chk("...and from the list the same",/My own name/.test(JSON.stringify(A.BOOK.head||{}))&&offer()===1);
 // reading the newer file takes the store's booklet; after that the store holds everything, and the file is drawn
 press(/Read the newer file/);await sleep(800);A.closeBooklet();ROUTES[U]=merge(booklet("Report","A regenerated question"),ROUTES[U]);
 await A.openLink("#/open/r.md");
 chk("once the reader has read the store's file, the next open draws the file (no offer) and keeps nothing",/regenerated question/.test(drawn(A))&&!offer()&&!kept(id));}
{const U=STORE+"r.md";
 const A=boot();host(A);ROUTES[U]=booklet("Report");
 await A.openLink("#/open/r.md");const id=A.currentId;
 const ok=A.addModuleText(FM("Extra")+"> [!module|extra] Extra\n\n> [!activity|x] X\n\n> [!text|xq] Extra question\n\n> [!module|extra end] End\n");
 A.flushSave();await sleep(800);A.closeBooklet();
 await A.openLink("#/open/r.md");
 chk("a booklet with a module the reader added opens as kept, with the module",ok&&ok.ok!==false&&A.allModules().length===2&&A.currentId===id,JSON.stringify(ok));
 A.closeBooklet();ROUTES[U]=booklet("Report","A newer question");await A.openLink("#/open/r.md");
 chk("...and with the file rewritten since, with the offer too",A.allModules().length===2&&offer()===1);}

/* ---- B4 (a): on a fresh page load the host registers after the file arrives; the kept copy was drawn with the offer ---- */
{const U=STORE+"d.md";
 let A=boot();host(A);ROUTES[U]=booklet("Dash");
 await A.openLink("#/open/d.md");const id=A.currentId;typeIn(A,"m/a","ticked");await sleep(1200);
 chk("B4a setup: the kept copy holds the answer, and the host saved it into the file",kept(id)&&/ticked/.test(ROUTES[U]));
 ROUTES[U]=merge(booklet("Dash","A regenerated question"),ROUTES[U]);
 for(let i=0;i<3;i++){
   A=boot({keep:true});await A.openLink("#/open/d.md");
   const ok=/regenerated question/.test(drawn(A))&&ans(A)==="ticked"&&!offer();
   host(A);await sleep(50);
   chk("fresh page load "+(i+1)+", host registering after the file: the store's file is drawn with the reader's answer, no offer",ok&&A.currentId===id);
   chk("...and the kept copy has gone (the store holds it), the entry is the same",!kept(id)&&lib().length===1);}
 // older releases: an entry with no `hosted` and a kept copy, marked unsaved, whose work the store holds, switches over at once
 A.closeBooklet();
 global.__ls[keyOf(id)]=JSON.stringify({S:{answers:{m:{q:"ticked"}},entries:{}},D:{custom:{}},TPL:A.parseFile(booklet("Dash")).template,lang:"en",dirty:true,unsavedEntries:0});
 A=boot({keep:true});await A.openLink("#/open/d.md");
 chk("an older release's kept copy whose answers the file holds: the file is drawn, no offer",/regenerated question/.test(drawn(A))&&ans(A)==="ticked"&&!offer()&&!kept(id));
 // ...and one whose answers the file lacks keeps the old path (S4: no clause lets it through on its flags)
 A.closeBooklet();
 global.__ls[keyOf(id)]=JSON.stringify({S:{answers:{m:{q:"NOT-IN-STORE"}},entries:{}},D:{custom:{}},TPL:A.parseFile(booklet("Dash")).template,lang:"en",dirty:false,unsavedEntries:0});
 ROUTES[U]=merge(booklet("Dash","A fourth question"),ROUTES[U]);
 /* the entry as an older release wrote it (no `hosted`), and the host registered before the file arrives: the case the
    first version's clause for older entries let through */
 {const old=lib().find(e=>e.id===id);delete old.hosted;delete old.named;old.dirty=false;old.unsavedEntries=0;
  global.__ls["booklet.library.v1"]=JSON.stringify({v:1,entries:[old]});}
 A=boot({keep:true});host(A);await A.openLink("#/open/d.md");await sleep(50);
 chk("S4: an older release's kept copy (no `hosted`, not dirty, nothing unsaved) whose answer the file lacks opens as kept, with the offer",ans(A)==="NOT-IN-STORE"&&offer()===1&&kept(id)&&!/fourth question/.test(drawn(A)));}
/* ---- B4 (b): a fast host answered before the 400 ms local save, so the entry was never marked and the list drew the kept copy ---- */
for(const delay of [0,20,150,600]) for(const bare of [false,true]){
 const U=STORE+"d.md";const A=boot();host(A,{delay:()=>delay,bare});ROUTES[U]=booklet("Dash");
 await A.openLink("#/open/d.md");const id=A.currentId;typeIn(A,A.screen,"ticked");await sleep(1500);
 ROUTES[U]=merge(booklet("Dash","A regenerated question"),ROUTES[U]);
 A.closeBooklet();CALLS=[];A.openFromList(id);await sleep(50);
 chk("host answering after "+delay+" ms"+(bare?" (naming no change)":"")+": Open from the list reads the store once and draws the regenerated file with the answer, no offer",
   CALLS.length===1&&/regenerated question/.test(drawn(A))&&ans(A)==="ticked"&&!offer(),"reads="+CALLS.length+" offer="+offer());}
// Download makes no difference
{const U=STORE+"d.md";const A=boot();host(A);ROUTES[U]=booklet("Dash");
 await A.openLink("#/open/d.md");const id=A.currentId;await sleep(700);
 A.saveLocal();await sleep(700);
 chk("a local save with nothing changed (Download does one) on a pointer: the next open still draws the store's file",(A.closeBooklet(),ROUTES[U]=booklet("Dash","A regenerated question"),await A.openLink("#/open/d.md"),/regenerated question/.test(drawn(A))&&!offer()));
 A.closeBooklet();await A.openLink("#/open/d.md");typeIn(A,"m/a","ticked");await sleep(1200);
 A.saveLocal();A.closeBooklet();ROUTES[U]=merge(booklet("Dash","A third question"),ROUTES[U]);await A.openLink("#/open/d.md");
 chk("...and after an answer the host saved, the same",/third question/.test(drawn(A))&&ans(A)==="ticked"&&!offer()&&A.currentId===id);}

/* ---- S1: the list's fallback opened X's kept copy when X's read was superseded by opening Y ---- */
{const A=boot();host(A,{delay:()=>700});
 ROUTES[STORE+"x.md"]=booklet("Xray");ROUTES[STORE+"y.md"]=booklet("Yankee");
 await A.openLink("#/open/x.md");const idX=A.currentId;typeIn(A,A.screen,"XWORK");await sleep(1500);A.closeBooklet();
 await A.openLink("#/open/y.md");const idY=A.currentId;await sleep(700);A.closeBooklet();
 const XT=ROUTES[STORE+"x.md"],YT=ROUTES[STORE+"y.md"];let relX,relY;const gX=new Promise(r=>{relX=r;}),gY=new Promise(r=>{relY=r;});
 ROUTES[STORE+"x.md"]=async()=>{await gX;return reply(XT);};ROUTES[STORE+"y.md"]=async()=>{await gY;return reply(YT);};
 A.openFromList(idX);await sleep(5);A.openFromList(idY);await sleep(5);relX();await sleep(30);
 chk("S1: Open on X, then on Y: nothing of X is drawn while Y is read",A.currentId===null,String(A.currentId===idX?"X":A.currentId));
 relY();await sleep(30);chk("...and Y opens",A.currentId===idY);}

/* ---- S2: "Opening…" stuck after a newer link refused before its read, or a file the parser refuses ---- */
{const main=()=>text(P.main());
 let A=boot();host(A);let rel;let gate=new Promise(r=>{rel=r;});
 ROUTES[STORE+"slow.md"]=async()=>{await gate;return reply(booklet("Slow"));};
 let p1=A.openLink("#/open/slow.md");await sleep(10);
 chk("S2 setup: Opening slow.md… is shown",/Opening slow\.md…/.test(main()));
 await A.openLink("#/open/bad.txt");
 chk("a newer link refused before reading anything clears the notice at once",!/Opening slow\.md…/.test(main()));
 rel();await p1;await sleep(20);A.render();
 chk("...and the older read, when it arrives, neither opens nor brings it back",!/Opening slow\.md…/.test(main())&&A.currentId===null);
 A=boot();host(A);gate=new Promise(r=>{rel=r;});ROUTES[STORE+"slow.md"]=async()=>{await gate;return reply(booklet("Slow"));};
 META["booklet-registry"]="https://reg.test/registry.json";ROUTES["https://reg.test/registry.json"]=JSON.stringify({modules:[]});
 p1=A.openLink("#/open/slow.md");await sleep(10);await A.openLink("#/module/nope");rel();await p1;await sleep(20);A.render();
 chk("a newer module link the registry does not list: the notice does not stay",!/Opening slow\.md…/.test(main()));
 A=boot();host(A);ROUTES[STORE+"empty.md"]="not a booklet";
 await A.openLink("#/open/empty.md");
 chk("a file the page refuses: the list no longer says Opening…, and the toast says why",!/Opening empty\.md…/.test(main())&&/\S/.test(text(P.byId("toast"))));}

/* ---- S3: openLinked decided on a stale entry, so an answer typed just before a link to the same booklet was lost ---- */
for(const delay of [0,300]){
 const A=boot();host(A,{delay:()=>delay});ROUTES[STORE+"d.md"]=TWO("Dash");
 await A.openLink("#/open/d.md");await sleep(800);
 typeIn(A,"m/a","JUST-TYPED");
 await A.openLink("#/open/d.md/b");
 chk("S3: an answer typed just before a link to a page of the same booklet is still there (host answering after "+delay+" ms)",ans(A)==="JUST-TYPED"&&A.screen==="m/b",JSON.stringify(A.STATE.answers)+" "+A.screen);
 await sleep(1500);chk("...and it reaches the store",/JUST-TYPED/.test(ROUTES[STORE+"d.md"]));}

/* ---- N2: removing a pointer while it was being read listed it again when the read arrived ---- */
{const A=boot();host(A);const T=booklet("Pee");ROUTES[STORE+"p.md"]=T;await A.openLink("#/open/p.md");const id=A.currentId;A.closeBooklet();A.render();
 let rel;const gate=new Promise(r=>{rel=r;});ROUTES[STORE+"p.md"]=async()=>{await gate;return reply(T);};
 A.openFromList(id);await sleep(5);
 const rm=P.find(P.main(),x=>x.tagName==="button"&&/^Remove$/.test(text(x)));rm[0]._on.click({});
 const go=P.find(P.main(),x=>x.tagName==="button"&&/Remove/.test(text(x))&&x!==rm[0]);go[go.length-1]._on.click({});
 rel();await sleep(30);
 chk("N2: a pointer removed while it is being read stays removed, and nothing opens",lib().length===0&&A.currentId===null&&!/Opening p\.md/.test(text(P.main())));}

/* ---- N3: "Opening…" showed only on the list ---- */
{const A=boot();host(A);ROUTES[STORE+"one.md"]=booklet("One");await A.openLink("#/open/one.md");
 let rel;const gate=new Promise(r=>{rel=r;});ROUTES[STORE+"two.md"]=async()=>{await gate;return reply(booklet("Two"));};
 const p=A.openLink("#/open/two.md");await sleep(10);
 chk("N3: a link opened from inside a booklet says Opening <name>… on that booklet's screen",A.screen!=="@booklets"&&/Opening two\.md…/.test(text(P.main())),A.screen);
 rel();await p;chk("...and the notice goes when the booklet opens",/Two/.test(JSON.stringify(A.BOOK.head))&&!/Opening two\.md…/.test(text(P.main())));}

/* ---- N4: a pointer was re-created under a new id on each fresh load ---- */
{let A=boot();ROUTES[STORE+"q.md"]=booklet("Queue");await A.openLink("#/open/q.md");const id=A.currentId;
 const ids=[];for(let i=0;i<3;i++){A=boot({keep:true});await A.openLink("#/open/q.md");host(A);await sleep(30);ids.push(A.currentId);}
 chk("N4: a pointer keeps its id and stays one entry across fresh loads",ids.every(x=>x===id)&&lib().length===1,JSON.stringify(ids));}

/* ---- N5: pointers carried `hosted` on a store with no host; a store with no host keeps the reader's work here ---- */
{const U=STORE+"n.md";let A=boot();ROUTES[U]=booklet("Nohost");
 await A.openLink("#/open/n.md");const id=A.currentId;
 chk("N5: with no host, a store booklet is listed as a pointer, with no flag claiming the store holds anything",lib().length===1&&!kept(id)&&!("hosted" in lib()[0]));
 typeIn(A,"m/a","LOCAL-ONLY");A.flushSave();A.closeBooklet();
 ROUTES[U]=booklet("Nohost","A regenerated question");
 A=boot({keep:true});await A.openLink("#/open/n.md");
 chk("...the reader's answer, which no host saved, opens as kept, with the offer",ans(A)==="LOCAL-ONLY"&&offer()===1&&kept(id));
 press(/Read the newer file/);
 chk("...and reading the newer file keeps it (no host: the new body, the reader's answers)",ans(A)==="LOCAL-ONLY"&&/regenerated question/.test(drawn(A)));}

/* ---- the host's answer names its change: a late answer does not say "Saved" for a later one ---- */
{const A=boot();const me=A.BookletApi.host({label:LABEL});const got=[];A.BookletApi.onChange(c=>got.push(c));
 ROUTES[STORE+"s.md"]=booklet("Saves");await A.openLink("#/open/s.md");await sleep(700);
 typeIn(A,"m/a","one");await sleep(700);typeIn(A,"m/a","one two");await sleep(700);
 const bar=()=>A.hostLineText(A.STRINGS.en.ui);
 chk("setup: three calls, each with its own change number",got.length===3&&new Set(got.map(c=>c.change)).size===3&&got.every(c=>Number.isInteger(c.change)));
 me.saved(got[1]);chk("saved() for an earlier change leaves the bar saying Saving…",/Saving/.test(bar()),bar());
 me.saved(got[2].change);chk("saved() for the latest change (by its number) says Saved",/Saved/.test(bar()),bar());
 typeIn(A,"m/a","one two three");await sleep(700);
 me.failed("disk full",got[1]);chk("failed() for an earlier change leaves the bar as it is",!/disk full/.test(bar()),bar());
 me.failed("disk full",got[3]);chk("failed() for the latest change says so",/disk full/.test(bar()),bar());
 me.saved();chk("an answer that names no change is about the latest, as before",/Saved/.test(bar()),bar());}

/* ---- the store does not answer: what is kept opens; a pointer opens nothing ---- */
{const A=boot();host(A,{fail:()=>true});ROUTES[STORE+"k.md"]=booklet("Kay");await A.openLink("#/open/k.md");const id=A.currentId;
 typeIn(A,A.screen,"KWORK");await sleep(1200);A.closeBooklet();
 ROUTES[STORE+"k.md"]=new Error("down");A.openFromList(id);await sleep(50);
 chk("server down: Open from the list opens the kept copy with its work",A.currentId===id&&ans(A)==="KWORK");
 A.closeBooklet();ROUTES[STORE+"p2.md"]=booklet("P2");await A.openLink("#/open/p2.md");const id2=A.currentId;A.closeBooklet();
 ROUTES[STORE+"p2.md"]=new Error("down");A.openFromList(id2);await sleep(50);
 chk("server down, a pointer: nothing opens, the toast says why, the entry stays",A.currentId===null&&/could not be fetched/.test(text(P.byId("toast")))&&lib().some(e=>e.id===id2));}

/* ---- the host refuses a text with no records over a file that has some (the box's server does): nothing is lost ---- */
{const U=STORE+"w.md";const A=boot();const h=host(A,{refuseEmpty:true});ROUTES[U]=withAnswer(booklet("Week"),"RECORD-IN-STORE");
 await A.openLink("#/open/w.md");await sleep(700);
 typeIn(A,"m/a","");await sleep(1200);
 chk("a refused save (every answer cleared) leaves the file's record and says Not saved",/RECORD-IN-STORE/.test(ROUTES[U])&&/Not saved/.test(A.hostLineText(A.STRINGS.en.ui)),A.hostLineText(A.STRINGS.en.ui));}

/* ---- the second review: a removal the store never heard of came back from the file, with no offer (45a4396). The
   check is now both ways: the kept copy and the file must hold the same work. Each block fails on 45a4396. ---- */
const LOG=FM("Log")+"> [!module|m] M\n\n> [!activity|log repeat] Log\n\n> [!text|what] What happened?\n\n> [!module|m end] End\n";
const entries=(A,at)=>((A.STATE.entries||{})[at||"m/log"]||[]).map(x=>x.what);
const draft=(A,at)=>((A.DRAFTS.custom||{})[at||"m/log"]||{}).what;
// a cleared answer, with the box down
{const U=STORE+"w.md";let A=boot();let down=false;host(A,{fail:()=>down});ROUTES[U]=booklet("Week");
 await A.openLink("#/open/w.md");const id=A.currentId;await sleep(600);typeIn(A,"m/a","SENSITIVE");await sleep(1200);
 down=true;typeIn(A,"m/a","");await sleep(1200);A.closeBooklet();down=false;
 chk("removal setup: the file still holds the answer, the kept copy holds it cleared",/SENSITIVE/.test(ROUTES[U])&&kept(id)&&!/SENSITIVE/.test(global.__ls[keyOf(id)]));
 await A.openLink("#/open/w.md");
 chk("an answer cleared here while the box was down stays cleared: the kept copy opens (with the offer), not the file",!ans(A)&&kept(id)&&offer()===1,JSON.stringify(ans(A))+" offer="+offer());
 A=boot({keep:true});await A.openLink("#/open/w.md");
 chk("...and the same on a fresh page load, with the host not yet registered",!ans(A)&&kept(id));}
// an entry deleted, and a draft emptied, with the box down (a repeating activity: the entry and draft parts of the check)
{const U=STORE+"log.md";let A=boot();let down=false;host(A,{fail:()=>down});ROUTES[U]=LOG;
 await A.openLink("#/open/log.md");const id=A.currentId;await sleep(600);
 typeIn(A,"m/log","an entry");await sleep(500);A.finalizeEntry("m/log");await sleep(800);
 typeIn(A,"m/log","a draft in progress");await sleep(1200);
 chk("repeating setup: the file holds the entry and the draft",/an entry/.test(ROUTES[U])&&/a draft in progress/.test(ROUTES[U]));
 A.closeBooklet();ROUTES[U]=merge(LOG.replace("What happened?","What happened today?"),ROUTES[U]);
 await A.openLink("#/open/log.md");
 chk("a kept copy whose entry and draft are both in the rewritten file: the file is drawn, with both, no offer (a guard: it passes on 45a4396 too)",/today/.test(drawn(A))&&entries(A).join()==="an entry"&&draft(A)==="a draft in progress"&&!offer()&&!kept(id));
 down=true;A.STATE.entries["m/log"].splice(0,1);A.markDirty();await sleep(1200);A.closeBooklet();down=false;
 await A.openLink("#/open/log.md");
 chk("an entry deleted here while the box was down is not brought back from the file",entries(A).length===0&&kept(id),JSON.stringify(entries(A))+" offer="+offer());
 down=true;typeIn(A,"m/log","");await sleep(1200);A.closeBooklet();down=false;
 A=boot({keep:true});host(A,{fail:()=>down});await A.openLink("#/open/log.md");
 chk("a draft emptied here while the box was down is not brought back from the file",!draft(A)&&entries(A).length===0&&kept(id),JSON.stringify(draft(A)));}
// every answer cleared: the box refuses the save (409); the next open keeps it cleared, with the offer
{const U=STORE+"w.md";let A=boot();host(A,{refuseEmpty:true});ROUTES[U]=booklet("Week");
 await A.openLink("#/open/w.md");const id=A.currentId;await sleep(600);typeIn(A,"m/a","PRIVATE");await sleep(1200);
 typeIn(A,"m/a","");await sleep(1200);
 chk("409 setup: the box refused the save, the bar says so, the file keeps the answer",/Not saved/.test(A.hostLineText(A.STRINGS.en.ui))&&/PRIVATE/.test(ROUTES[U]));
 A.closeBooklet();A=boot({keep:true});await A.openLink("#/open/w.md");host(A,{refuseEmpty:true});await sleep(50);
 chk("the next open after a refused save keeps the answer cleared and offers the file (it does not say Saved over the old answer)",!ans(A)&&offer()===1&&kept(id),JSON.stringify(ans(A))+" offer="+offer());}
// "Read the newer file" with work the file lacks: the new body, and the reader's work, which the host then saves
{const U=STORE+"w.md";let A=boot();let down=false;host(A,{fail:()=>down});ROUTES[U]=booklet("Week");
 await A.openLink("#/open/w.md");const id=A.currentId;await sleep(600);
 down=true;typeIn(A,"m/a","WRITTEN-WHILE-DOWN");await sleep(1200);A.closeBooklet();down=false;
 ROUTES[U]=merge(booklet("Week","A regenerated question"),ROUTES[U]);
 await A.openLink("#/open/w.md");
 chk("accept setup: the kept copy, with the answer the store never got, opens with the offer",ans(A)==="WRITTEN-WHILE-DOWN"&&offer()===1);
 press(/Read the newer file/);
 chk("Read the newer file takes the file's body and keeps the reader's answer",/regenerated question/.test(drawn(A))&&ans(A)==="WRITTEN-WHILE-DOWN");
 await sleep(800);chk("...and the host then saves it into the file",/WRITTEN-WHILE-DOWN/.test(ROUTES[U])&&/regenerated question/.test(ROUTES[U]));
 A.closeBooklet();await A.openLink("#/open/w.md");
 chk("...after which the store holds everything: the next open draws the file, and the kept copy goes",ans(A)==="WRITTEN-WHILE-DOWN"&&!offer()&&!kept(id));}
/* ---- the fourth round: each kept copy has a base, the records of the file it is based on (the file it last drew or
   read, or the text the host last confirmed). On open, a copy that changed nothing since its base is drawn from the
   file, whatever the file holds; reading a newer file merges here and there place by place against the base. ---- */
const LSX=global.__ls;
/* two devices share the store (ROUTES) and nothing else: each has its own browser storage */
const takeDevice=()=>({...LSX});
const useDevice=o=>{P.closePages();for(const k of Object.keys(LSX)) delete LSX[k];Object.assign(LSX,o);};
const devPage=()=>{P.closePages();P.place("http:","fleet");LSX["booklet.host.allowed"]=LABEL;installFetch();META={"booklet-store":STORE};return P.boot();};
const typeAt=(A,addr,i,words)=>{A.screen=addr;A.render();const ta=P.find(P.main(),x=>x.tagName==="textarea")[i];ta.value=words;ta._on.input();};
const THREE=FM("Three")+"> [!module|m] M\n\n> [!activity|log repeat] Log\n\n> [!text|what] What happened?\n\n> [!activity|a] A\n\n> [!text|q] First\n\n> [!text|r] Second\n\n> [!text|s] Third\n\n> [!module|m end] End\n";
{const U=STORE+"three.md";P.wipe();ROUTES={};CALLS=[];ROUTES[U]=THREE;
 // the laptop keeps an entry and answers the first question; its host saves both
 let A=devPage();host(A);await A.openLink("#/open/three.md");const id=A.currentId;await sleep(600);
 typeIn(A,"m/log","laptop entry");await sleep(500);A.finalizeEntry("m/log");await sleep(800);
 typeAt(A,"m/a",0,"laptop wrote this");await sleep(1200);A.closeBooklet();await sleep(200);
 chk("base setup: the kept copy has a base, which holds the laptop's work and no body",("booklet.base."+id) in LSX&&/laptop wrote this/.test(LSX["booklet.base."+id])&&!/First/.test(LSX["booklet.base."+id]));
 const laptop=takeDevice();
 // the phone, in its own browser, keeps an entry and changes the first answer
 useDevice({});A=devPage();host(A);await A.openLink("#/open/three.md");await sleep(600);
 typeIn(A,"m/log","phone entry");await sleep(500);A.finalizeEntry("m/log");await sleep(800);
 typeAt(A,"m/a",0,"phone changed it");await sleep(1200);A.closeBooklet();await sleep(200);
 chk("two devices setup: the store holds both entries and the phone's answer",/laptop entry/.test(ROUTES[U])&&/phone entry/.test(ROUTES[U])&&/phone changed it/.test(ROUTES[U]));
 let phone=takeDevice();
 // the laptop, which changed nothing since its base, opens the link with its host registering late
 useDevice(laptop);A=devPage();await A.openLink("#/open/three.md");host(A);await sleep(50);
 chk("M2 a copy that changed nothing since its base: the file is drawn, with the other device's newer answer, and no offer",ans(A)==="phone changed it"&&!offer()&&!kept(id),JSON.stringify(A.STATE.answers)+" offer="+offer());
 chk("M1 ...and both devices' entries are there",entries(A).sort().join()==="laptop entry,phone entry",JSON.stringify(entries(A)));
 await sleep(600);
 // the laptop, with the box down, answers the second and third questions and deletes both entries
 let down=true;A.closeBooklet();A=devPage();host(A,{fail:()=>down});await A.openLink("#/open/three.md");await sleep(600);
 typeAt(A,"m/a",1,"laptop's second");await sleep(300);typeAt(A,"m/a",2,"laptop's third");await sleep(300);
 A.STATE.entries["m/log"].splice(0);A.markDirty();await sleep(1200);A.closeBooklet();down=false;
 const laptop2=takeDevice();
 // the phone changes the first and third answers; elsewhere, the phone's entry is edited in the file (the same entry)
 useDevice(phone);A=devPage();host(A);await A.openLink("#/open/three.md");await sleep(600);
 typeAt(A,"m/a",0,"phone's first, again");await sleep(300);typeAt(A,"m/a",2,"phone's third");await sleep(1200);A.closeBooklet();await sleep(200);
 ROUTES[U]=ROUTES[U].replace('"phone entry"','"phone entry, edited"');
 chk("merge setup: the file has the phone's work and the edited entry, not the laptop's unsent work",/phone's first, again/.test(ROUTES[U])&&/phone entry, edited/.test(ROUTES[U])&&!/laptop's second/.test(ROUTES[U]));
 // the laptop opens: it changed things since its base, so it opens as kept, with the offer
 useDevice(laptop2);A=devPage();host(A);await A.openLink("#/open/three.md");
 chk("a copy with changes since its base opens as kept, with the offer",ans(A,"m","r")==="laptop's second"&&offer()===1&&kept(id));
 press(/Read the newer file/);
 chk("M2 on reading the file: an answer changed there and not here takes the file's (the phone's first answer)",ans(A)==="phone's first, again",JSON.stringify(A.STATE.answers));
 chk("...an answer changed here and not there keeps this browser's (the laptop's second)",ans(A,"m","r")==="laptop's second");
 chk("...an answer changed on both keeps this browser's (the laptop's third, over the phone's)",ans(A,"m","s")==="laptop's third");
 chk("...an entry deleted here and unchanged there stays deleted; one deleted here and changed there stays, changed",entries(A).join()==="phone entry, edited",JSON.stringify(entries(A)));
 await sleep(800);
 chk("...and the host saves the merge into the file",/phone's first, again/.test(ROUTES[U])&&/laptop's second/.test(ROUTES[U])&&/laptop's third/.test(ROUTES[U])&&!/phone's third/.test(ROUTES[U])&&/phone entry, edited/.test(ROUTES[U])&&!/laptop entry/.test(ROUTES[U]));
 A.closeBooklet();await A.openLink("#/open/three.md");
 chk("...after which nothing has changed here since the base: the next open draws the file, no offer",!offer()&&!kept(id)&&ans(A,"m","r")==="laptop's second");}
// a removal made here, which the store never heard of, stays removed when the newer file is read (changed here, not there)
{const U=STORE+"w.md";const A=boot();let down=false;host(A,{fail:()=>down});ROUTES[U]=booklet("Week");
 await A.openLink("#/open/w.md");await sleep(600);typeIn(A,"m/a","CLEARED-HERE");await sleep(1200);
 down=true;typeIn(A,"m/a","");await sleep(1200);A.closeBooklet();down=false;
 ROUTES[U]=merge(booklet("Week","A regenerated question"),ROUTES[U]);
 await A.openLink("#/open/w.md");
 chk("removal setup: the cleared answer opens as kept, cleared, with the offer",!ans(A)&&offer()===1);
 press(/Read the newer file/);
 chk("Read the newer file keeps the answer cleared (the reader removed it; the file did not change it) and takes the new body",!ans(A)&&/regenerated question/.test(drawn(A)),JSON.stringify(A.STATE.answers));}
// M4: the host pushes a newer file holding a draft; the reader finalizes the entry before pressing: no duplicate
{const U=STORE+"push.md";const A=boot();let hold=false;host(A,{delay:()=>hold?100000:0});ROUTES[U]=LOG;
 await A.openLink("#/open/push.md");await sleep(600);
 typeIn(A,"m/log","entry being written");await sleep(1200);
 ROUTES[U]=merge(LOG.replace("What happened?","What happened, rewritten?"),ROUTES[U]);
 typeIn(A,"m/log","entry being written, finished");await sleep(1200);
 chk("M4 setup: the host pushed the rewritten file, holding the draft",A.HOST.pending!=null&&/entry being written, finished/.test(A.HOST.pending));
 hold=true;A.finalizeEntry("m/log");await sleep(300);
 press(/Read the newer file/);
 chk("M4 after a finalize, reading the pushed file keeps the entry and does not bring its draft back",entries(A).join()==="entry being written, finished"&&!draft(A)&&/rewritten/.test(drawn(A)),JSON.stringify(entries(A))+" draft="+JSON.stringify(draft(A)));}
// a generator moves an activity to another module (the store retargets its records line)
{const V1=FM("Moves")+"> [!module|a] Alone\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|a end] End\n";
 const V2=FM("Moves")+"> [!module|n] New home\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|n end] End\n";
 const moved=t=>merge(V2,t).replace("> [!records|a] Alone","> [!records|n] New home");
 let U=STORE+"mv.md";let A=boot();let down=false;host(A,{fail:()=>down});ROUTES[U]=V1;
 await A.openLink("#/open/mv.md");await sleep(600);typeIn(A,"a/a","first, saved");await sleep(1200);A.closeBooklet();
 ROUTES[U]=moved(ROUTES[U]);
 await A.openLink("#/open/mv.md");
 chk("M3 nothing changed here: the moved file is drawn, the answer in its new place, no offer",ans(A,"n","q")==="first, saved"&&!offer());
 A.closeBooklet();ROUTES[U]=V1;A=boot();host(A,{fail:()=>down});ROUTES[U]=V1;
 await A.openLink("#/open/mv.md");await sleep(600);typeIn(A,"a/a","first, saved");await sleep(1200);
 down=true;typeIn(A,"a/a","second, typed while the box was down");await sleep(1200);A.closeBooklet();down=false;
 ROUTES[U]=moved(ROUTES[U]);
 await A.openLink("#/open/mv.md");
 chk("M3 an edit the store never got: the kept copy opens, with the offer",ans(A,"a","q")==="second, typed while the box was down"&&offer()===1);
 press(/Read the newer file/);
 chk("M3 ...and reading the moved file follows the move: the reader's latest edit is in the new place",ans(A,"n","q")==="second, typed while the box was down",JSON.stringify(A.STATE.answers));
 await sleep(800);chk("M3 ...and it reaches the file",/second, typed while the box was down/.test(ROUTES[U])&&/records\|n/.test(ROUTES[U]));}
// a kept copy an older release left, with no base: the two-way rule on open, and what holds something weighed on reading
{const U=STORE+"old.md";let A=boot();host(A);ROUTES[U]=booklet("Old");
 await A.openLink("#/open/old.md");const id=A.currentId;await sleep(600);typeIn(A,"m/a","OLD-ANSWER");await sleep(1200);A.closeBooklet();
 delete LSX["booklet.base."+id];
 ROUTES[U]=merge(booklet("Old","A regenerated question"),ROUTES[U]).replace("OLD-ANSWER","FROM-ELSEWHERE");
 A=boot({keep:true});host(A);await A.openLink("#/open/old.md");
 chk("no base: a kept copy whose work differs from the file's opens as kept, with the offer (the two-way rule)",ans(A)==="OLD-ANSWER"&&offer()===1);
 press(/Read the newer file/);
 chk("no base: reading the file keeps this browser's answer, which holds something, and takes the new body",ans(A)==="OLD-ANSWER"&&/regenerated question/.test(drawn(A)));
 await sleep(800);A.closeBooklet();
 chk("...and from then on the copy has a base",("booklet.base."+id) in LSX);
 A.render();const rm=P.find(P.main(),x=>x.tagName==="button"&&/^Remove$/.test(text(x)));rm[0]._on.click({});
 const go=P.find(P.main(),x=>x.tagName==="button"&&/Remove/.test(text(x))&&x!==rm[0]);go[go.length-1]._on.click({});
 chk("removing the booklet removes its base with its kept copy",!lib().some(e=>e.id===id)&&!(("booklet.base."+id) in LSX)&&!kept(id));}

/* ---- the final check: the base is never ahead of the kept copy; one removal rule; moves followed from the new body ---- */
// a fast host confirms a change before the 400 ms local save, and the browser dies right then (no pagehide)
{const U=STORE+"w.md";let A=boot();host(A);ROUTES[U]=booklet("Week");
 await A.openLink("#/open/w.md");const id=A.currentId;await sleep(600);typeIn(A,"m/a","EARLIER");await sleep(1200);
 typeIn(A,"m/a","LAST-TYPED");await sleep(150);
 const died={...LSX};
 chk("crash setup: the host confirmed LAST-TYPED within 150 ms, before the 400 ms local save",/LAST-TYPED/.test(ROUTES[U])&&/LAST-TYPED/.test(died["booklet.base."+id]||""));
 chk("the kept copy is written before the base moves: what the dead browser left holds LAST-TYPED in both",/LAST-TYPED/.test(died[keyOf(id)]||""),"kept copy has "+((died[keyOf(id)]||"").match(/LAST-TYPED|EARLIER/)||["nothing"])[0]);
 useDevice(died);A=devPage();host(A);await A.openLink("#/open/w.md");press(/Read the newer file/);await sleep(50);
 chk("...so the next open shows LAST-TYPED, the store's, and Read never puts EARLIER back",ans(A)==="LAST-TYPED",JSON.stringify(A.STATE.answers));}
// an answer cleared on the laptop (unsent), and edited on the phone: the phone's edit is kept
{const U=STORE+"clr.md";P.wipe();ROUTES={};CALLS=[];ROUTES[U]=booklet("Clr");
 let A=devPage();let down=false;host(A,{fail:()=>down});await A.openLink("#/open/clr.md");await sleep(600);
 typeIn(A,"m/a","BASE ANSWER");await sleep(1200);down=true;typeIn(A,"m/a","");await sleep(1200);A.closeBooklet();down=false;
 const laptop=takeDevice();
 useDevice({});A=devPage();host(A);await A.openLink("#/open/clr.md");await sleep(600);typeIn(A,"m/a","PHONE EDIT");await sleep(1200);A.closeBooklet();
 useDevice(laptop);A=devPage();host(A);await A.openLink("#/open/clr.md");
 chk("removal vs edit setup: the laptop's cleared answer opens as kept, with the offer",!ans(A)&&offer()===1);
 press(/Read the newer file/);
 chk("an answer cleared here and edited on another device: reading the file keeps the other device's edit",ans(A)==="PHONE EDIT",JSON.stringify(A.STATE.answers));
 await sleep(800);chk("...and the file keeps it",/PHONE EDIT/.test(ROUTES[U]));}
// M8: a module whose activity a generator moves had no records in the store yet; the reader's first answer to it was unsent
{const V1=FM("Moves")+"> [!module|k] Keep\n\n> [!activity|k] K\n\n> [!text|kq] Kept question\n\n> [!module|k end] End\n\n> [!module|a] Alone\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|a end] End\n";
 const V2=V1.replace("> [!module|a] Alone","> [!module|n] New home").replace("> [!module|a end] End","> [!module|n end] End");
 const U=STORE+"mv8.md";const A=boot();let down=false;host(A,{fail:()=>down});ROUTES[U]=V1;
 await A.openLink("#/open/mv8.md");await sleep(600);typeIn(A,"k/k","k answered");await sleep(1200);
 down=true;typeIn(A,"a/a","FIRST ANSWER, unsent");await sleep(1200);A.closeBooklet();down=false;
 chk("M8 setup: the store has no records for the module yet",!/records\|a/.test(ROUTES[U]));
 /* the generator moves activity `a` into module `n`; the store had nothing under `a` to retarget */
 ROUTES[U]=merge(V2,ROUTES[U]);
 await A.openLink("#/open/mv8.md");
 chk("M8 the kept copy, with the unsent first answer, opens with the offer",ans(A,"a","q")==="FIRST ANSWER, unsent"&&offer()===1);
 press(/Read the newer file/);
 chk("M8 reading the moved file puts the unsent first answer in the new module (the move is read from the new body)",ans(A,"n","q")==="FIRST ANSWER, unsent"&&ans(A,"k","kq")==="k answered",JSON.stringify(A.STATE.answers));
 await sleep(800);chk("M8 ...and it reaches the file",/FIRST ANSWER, unsent/.test(ROUTES[U])&&/records\|n/.test(ROUTES[U]));}
// a partial move the rule follows: of two modules, only one's activity moves; unsent edits to both
{const V1=FM("Two")+"> [!module|a] Alone\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|a end] End\n\n> [!module|c] Stays\n\n> [!activity|c] C\n\n> [!text|cq] C question\n\n> [!module|c end] End\n";
 const V2=V1.replace("> [!module|a] Alone","> [!module|n] New home").replace("> [!module|a end] End","> [!module|n end] End");
 const U=STORE+"pm.md";const A=boot();let down=false;host(A,{fail:()=>down});ROUTES[U]=V1;
 await A.openLink("#/open/pm.md");await sleep(600);typeIn(A,"a/a","a saved");await sleep(800);typeIn(A,"c/c","c saved");await sleep(1200);
 down=true;typeIn(A,"a/a","a edited, unsent");await sleep(500);typeIn(A,"c/c","c edited, unsent");await sleep(1200);A.closeBooklet();down=false;
 /* the store retargets `a`'s records line to `n` (the activity moved); `c` stays */
 ROUTES[U]=merge(V2,ROUTES[U]).replace(/> \[!records\|a\][^\n]*/,"> [!records|n] New home");
 await A.openLink("#/open/pm.md");press(/Read the newer file/);
 chk("a partial move: the moved module's unsent edit lands in its new module, and the other module's stays where it is",ans(A,"n","q")==="a edited, unsent"&&ans(A,"c","cq")==="c edited, unsent",JSON.stringify(A.STATE.answers));}
// a move the rule refuses, as the store does: the module's records name activities that now live in two modules
{const V1=FM("Split")+"> [!module|a] Both\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!activity|b repeat] B\n\n> [!text|what] What?\n\n> [!module|a end] End\n";
 const V2=FM("Split")+"> [!module|n] First\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|n end] End\n\n> [!module|c] Second\n\n> [!activity|b repeat] B\n\n> [!text|what] What?\n\n> [!module|c end] End\n";
 const U=STORE+"sp.md";const A=boot();let down=false;host(A,{fail:()=>down});ROUTES[U]=V1;
 await A.openLink("#/open/sp.md");await sleep(600);typeIn(A,"a/a","q saved");await sleep(800);typeIn(A,"a/b","a draft for b");await sleep(1200);
 down=true;typeIn(A,"a/a","q edited, unsent");await sleep(1200);A.closeBooklet();down=false;
 /* storefile leaves `> [!records|a]` as written: its blocks name `a` and `b`, which now live in two modules */
 ROUTES[U]=merge(V2,ROUTES[U]);
 chk("refused move setup: the store's records stay under the old module",/records\|a/.test(ROUTES[U]));
 await A.openLink("#/open/sp.md");press(/Read the newer file/);
 chk("a move the store's rule refuses is not followed here either: nothing is put in the new modules",ans(A,"n","q")===undefined&&!((A.DRAFTS.custom||{})["c/b"]||{}).what,JSON.stringify(A.STATE.answers));
 await sleep(800);chk("...and the store's records under the old module are kept as written",/records\|a/.test(ROUTES[U])&&/q saved|q edited/.test(ROUTES[U]));}

/* ---- the second review's N2: a change in the last half second before the tab closes is sent ---- */
{const U=STORE+"w.md";const A=boot();const h=host(A);ROUTES[U]=booklet("Week");
 await A.openLink("#/open/w.md");await sleep(700);const n0=h.log.length;
 typeIn(A,"m/a","LAST-WORDS");P.closePages();
 chk("a change made just before the page is closed is told to the host as it goes (pagehide)",h.log.length>n0&&/LAST-WORDS/.test(h.log[h.log.length-1].text)&&/LAST-WORDS/.test(ROUTES[U]));}

P.closePages();
console.log(fails?"\n"+fails+" FAILURES":"\nstore-held checks passed");process.exit(fails?1:0);
})();
