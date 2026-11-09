// Renderer 0.13: a store booklet's file is the truth, and what this browser keeps of it is only a buffer. A store booklet
// (opened by #/open/<name> from the page's declared store) is listed under "Your booklets" as a pointer, with no kept copy;
// a kept copy appears only when the reader changes something. Opening it again, by its link or from the list, reads the
// store's file and draws it whenever the file holds every answer, entry and draft the kept copy holds and the kept copy
// changes nothing of the booklet itself; otherwise the kept copy opens and the newer file is offered. That is decided on
// content when the booklet opens, not on when a save was answered, so it holds however late or fast something else put the
// reader's work into the store. Each block below was a failure of the first version of this change (the cold review's B1-B4,
// S1-S3, N2-N5): the comment on each says which. The network is a stub. The renderer sends nothing to a store, so the store
// side is the test's own (`host` below: something else that writes the page's text into the store by the store server's rule,
// the body kept from the file on disk and the records taken from the browser's text), and a device's own browser storage is
// kept apart from another's, so that two devices can be told apart.
// Run: node test/storeheld.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
global.URL=Object.assign(require("url").URL,{createObjectURL:()=>"blob:x",revokeObjectURL(){}});
global.location={href:"http://myhost/app/",protocol:"http:",hostname:"myhost",hash:""};
let META={};
global.document.querySelector=sel=>{const m=/meta\[name="([^"]+)"\]/.exec(sel);const v=m&&META[m[1]];return v?{getAttribute:k=>k==="content"?v:null}:null;};
const STORE="http://myhost/booklets/",LABEL="myhost: store";
const FM=t=>`---\nbooklet: "0.21"\ntitle: ${t}\nlang: en\n---\n\n`;
const booklet=(title,q)=>FM(title)+`> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] ${q||"A question"}\n\n> [!module|m end] End\n`;
const TWO=title=>FM(title)+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!activity|b] B\n\n> [!text|r] Another\n\n> [!module|m end] End\n";
/* a file whose records already hold an answer (saved from another device, or earlier) */
const withAnswer=(t,words)=>t.replace(/\n$/,"")+"\n\n%%\n> [!records] App record — do not edit below this line\n\n> [!records|m] M\n\n```booklet answers\n{\"q\": \""+words+"\"}\n```\n\n%%\n";
let CALLS=[],ROUTES={};
const reply=(body,o={})=>({ok:o.ok!==false,status:o.ok===false?404:200,headers:{get:k=>({"content-type":o.type||"text/markdown","content-length":o.len}[k.toLowerCase()])},
  body:{getReader(){const b=Buffer.from(body);let done=false;return {read:async()=>done?{done:true}:(done=true,{done:false,value:new Uint8Array(b)})};}},text:async()=>body});
const installFetch=()=>{global.fetch=async(url,opts)=>{CALLS.push({url:String(url),opts:opts||{}});
  const r=ROUTES[String(url)];if(r===undefined) return reply("nf",{ok:false});if(r instanceof Error) throw r;return typeof r==="function"?r():reply(r);};};
/* a page load: `keep` keeps what the browser has stored (a reload, or a later visit) */
function boot({keep=false}={}){
  stopSavers();if(keep) P.closePages();else{P.wipe();ROUTES={};}
  CALLS=[];P.place("http:","myhost");
  installFetch();META={"booklet-store":STORE};
  return P.boot();}
/* the store server's rule (storefile.merge, for the texts this renderer writes): the body from the file on disk, the records
   from the browser's text */
const split=t=>{const i=t.indexOf("\n%%\n> [!records]");return i<0?[t,""]:[t.slice(0,i),t.slice(i+1)];};
const merge=(disk,browser)=>{const b=split(disk)[0].replace(/\s+$/,""),r=split(browser)[1];return r?b+"\n\n"+r.replace(/\n+$/,"")+"\n":b+"\n";};
const sameBody=(a,b)=>split(a)[0].replace(/\s+$/,"")===split(b)[0].replace(/\s+$/,"");
/* The store's side. The renderer sends nothing to a store, so a store file changes here only when the test changes it. `host(A, o)`
   stands for something else that keeps the reader's work in the store, as a script of the host's own might: while page A
   has a store booklet open, it takes the page's text (A.toMarkdown()) and writes it into ROUTES by the store server's rule
   (merge: the body from the file on disk, the records from the text). Nothing in the page is involved; it only reads what the
   page writes. o.delay(c): ms before the write; o.fail(c): the write is refused, so the file stays; o.refuseEmpty: refuse a text
   with no records over a file that has some, as a store server may (a region with nothing but its `%%`
   and records lines holds nothing). `log` has each text it wrote. */
const holds=t=>split(t)[1].split("\n").some(l=>l.trim()&&l.trim()!=="%%"&&!/^>\s*\[!records[|\]]/i.test(l.trim()));
const SAVERS=[];
const stopSavers=()=>{SAVERS.splice(0).forEach(clearInterval);};
function host(A,o={}){const log=[];let last="";
  SAVERS.push(setInterval(()=>{
    try{
    if(!A.currentId||offer()>0) return;
    const e=A.readLib().entries.find(x=>x.id===A.currentId);
    if(!e||!/^store:/.test(e.from||"")||!A.allModules().length) return;
    const name=e.from.slice(6),url=STORE+name,text=A.toMarkdown();
    if(text===last) return;last=text;
    const c={name,text};
    const go=()=>{if(o.fail&&o.fail(c)) return;
      const disk=typeof ROUTES[url]==="string"?ROUTES[url]:text;
      if(o.refuseEmpty&&!holds(text)&&holds(disk)) return;
      ROUTES[url]=merge(disk,text);log.push(c);};
    const d=o.delay?o.delay(c):0;if(d) setTimeout(go,d);else go();
    }catch(x){}},40));
  return {log};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const lib=()=>JSON.parse(global.__ls["booklet.library.v1"]||'{"entries":[]}').entries;
const keyOf=id=>"booklet.b."+id;
const kept=id=>keyOf(id) in global.__ls;
const text=n=>P.texts(n);
const offer=()=>P.find(P.main(),P.hasClass("newernote")).filter(n=>/changed where it is kept/.test(text(n))).length;
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
 // a later visit by the link
 A=boot({keep:true});await A.openLink("#/open/w.md");
 chk("opened again by its link the store's booklet is drawn (its module and its record)",A.allModules().length===1&&ans(A)==="RECORD-IN-STORE"&&!offer(),"modules="+A.allModules().length+" answer="+ans(A));
 await sleep(800);
 chk("the store's file still holds the record",/RECORD-IN-STORE/.test(ROUTES[U]));
 chk("the reader's name for it stays in the list after it is read again",lib().length===1&&lib()[0].named==="Week (mine)"&&lib()[0].id===id);
 A.closeBooklet();A.openFromList(id);await sleep(30);
 chk("Open from the list reads the store and draws the booklet, not a blank one",A.allModules().length===1&&ans(A)==="RECORD-IN-STORE"&&CALLS.some(c=>c.url===U));}
// a blank kept copy already in a browser (what the first version's rename wrote): it is treated as empty, never drawn or sent.
// It is tried as 0.13.0 kept it (its design, TPL) and as this release keeps a booklet (its text).
for(const form of ["TPL","text"]){const U=STORE+"w.md",at=" ("+form+")";
 let A=boot();ROUTES[U]=withAnswer(booklet("Week"),"RECORD-IN-STORE");
 await A.openLink("#/open/w.md");const id=A.currentId;A.closeBooklet();
 const src=A.setTitleIn("","Week (mine)","en");
 const blank={booklet:"0.13",id:"local/booklet",version:"1",customized:false,modules:[],widgets:[],raw:{source:src,lang:"en"},title:"Week (mine)",head:{title:"Week (mine)"}};
 const snap=()=>JSON.stringify({S:{answers:{},entries:{}},D:{custom:{}},...(form==="TPL"?{TPL:blank,lang:"en"}:{text:src}),dirty:true,unsavedEntries:0});
 global.__ls[keyOf(id)]=snap();
 A=boot({keep:true});await A.openLink("#/open/w.md");await sleep(800);
 chk("a blank kept copy of a store booklet is not drawn: the store's booklet is, and the blank copy goes"+at,A.allModules().length===1&&ans(A)==="RECORD-IN-STORE"&&!kept(id));
 chk("...and the store's file still holds the record"+at,/RECORD-IN-STORE/.test(ROUTES[U]));
 // the store does not answer: the list falls back to what is kept
 A.closeBooklet();global.__ls[keyOf(id)]=snap();
 ROUTES[U]=new Error("down");A.openFromList(id);await sleep(800);
 chk("a blank kept copy opens as it is when the store does not answer, and writes nothing over the file"+at,A.currentId===id&&A.allModules().length===0&&/RECORD-IN-STORE/.test(ROUTES[U]===undefined?"":String(ROUTES[U]))===false);}

/* ---- B3: a change to the booklet itself (a rename inside it, a module added or removed) was marked hosted and dropped ---- */
{const U=STORE+"r.md";
 let A=boot();host(A,{delay:()=>100});ROUTES[U]=booklet("Report");
 await A.openLink("#/open/r.md");const id=A.currentId;await sleep(800);
 A.renameBooklet("My own name");await sleep(800);
 chk("B3 setup: the store kept its own title",!/My own name/.test(ROUTES[U]));
 A.closeBooklet();await A.openLink("#/open/r.md");
 chk("a booklet renamed inside it opens as kept, with the reader's name (the store's file is unchanged: no offer)",/My own name/.test(JSON.stringify(A.BOOK.title))&&!offer()&&A.currentId===id);
 // the generator rewrites the file: then the newer file is offered too
 A.closeBooklet();ROUTES[U]=booklet("Report","A newer question");await A.openLink("#/open/r.md");
 chk("...and with the file rewritten since, it opens as kept with the offer",/My own name/.test(JSON.stringify(A.BOOK.title))&&offer()===1&&A.currentId===id);
 A.closeBooklet();A.openFromList(id);await sleep(30);
 chk("...and from the list the same",/My own name/.test(JSON.stringify(A.BOOK.title))&&offer()===1);
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
 /* the stand-in host answers Y's open (sent at once) 700 ms later and writes its file then: wait for that, so it does not
    replace the gated file below */
 await A.openLink("#/open/y.md");const idY=A.currentId;await sleep(1000);A.closeBooklet();
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
 rel();await p;chk("...and the notice goes when the booklet opens",/Two/.test(JSON.stringify(A.BOOK.title))&&!/Opening two\.md…/.test(text(P.main())));}

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
 chk("a refused save (every answer cleared) leaves the file's record",/RECORD-IN-STORE/.test(ROUTES[U]));}

/* ---- the second review: a removal the store never heard of came back from the file, with no offer (45a4396). The
   check is now both ways: the kept copy and the file must hold the same work. Each block fails on 45a4396. ---- */
const LOG=FM("Log")+"> [!module|m] M\n\n> [!activity|log repeat] Log\n\n> [!text|what] What happened?\n\n> [!module|m end] End\n";
const entries=(A,at)=>((A.STATE.entries||{})[at||"m/log"]||[]).map(x=>x.what);
const draft=(A,at)=>((A.DRAFTS.custom||{})[at||"m/log"]||{}).what;
// "Read the newer file" with work the file lacks: the new body, and the reader's work
{const U=STORE+"w.md";let A=boot();ROUTES[U]=booklet("Week");
 await A.openLink("#/open/w.md");const id=A.currentId;await sleep(600);
 typeIn(A,"m/a","WRITTEN-WHILE-DOWN");await sleep(1200);A.closeBooklet();
 ROUTES[U]=booklet("Week","A regenerated question");
 await A.openLink("#/open/w.md");
 chk("accept setup: the kept copy, with the answer the store never got, opens with the offer",ans(A)==="WRITTEN-WHILE-DOWN"&&offer()===1);
 press(/Read the newer file/);
 chk("Read the newer file takes the file's body and keeps the reader's answer",/regenerated question/.test(drawn(A))&&ans(A)==="WRITTEN-WHILE-DOWN");
 chk("...the kept copy stays: the page sends nothing to the store, so the file lacks the answer still",kept(id)&&!/WRITTEN-WHILE-DOWN/.test(ROUTES[U]));}
/* ---- the fourth round: each kept copy has a base, the records of the file it is based on (the file it last drew or
   read). On open, a copy that changed nothing since its base is drawn from the file, whatever the file holds; reading a
   newer file merges here and there place by place against the base. Two devices share the store (ROUTES) and nothing else:
   each has its own browser storage. Something else than this page puts a device's work into the store, as the test's
   saveTo does for the phone. ---- */
const LSX=global.__ls;
const takeDevice=()=>({...LSX});
const useDevice=o=>{P.closePages();for(const k of Object.keys(LSX)) delete LSX[k];Object.assign(LSX,o);};
const devPage=()=>{P.closePages();P.place("http:","myhost");installFetch();META={"booklet-store":STORE};return P.boot();};
const typeAt=(A,addr,i,words)=>{A.screen=addr;A.render();const ta=P.find(P.main(),x=>x.tagName==="textarea")[i];ta.value=words;ta._on.input();};
const saveTo=(A,url)=>{ROUTES[url]=merge(typeof ROUTES[url]==="string"?ROUTES[url]:A.toMarkdown(),A.toMarkdown());};
const THREE=FM("Three")+"> [!module|m] M\n\n> [!activity|log repeat] Log\n\n> [!text|what] What happened?\n\n> [!activity|a] A\n\n> [!text|q] First\n\n> [!text|r] Second\n\n> [!text|s] Third\n\n> [!module|m end] End\n";
{const U=STORE+"three.md";P.wipe();ROUTES={};CALLS=[];ROUTES[U]=THREE;
 // the laptop keeps an entry and answers all three questions; none of it reaches the store
 let A=devPage();await A.openLink("#/open/three.md");const id=A.currentId;await sleep(600);
 typeIn(A,"m/log","laptop entry");await sleep(500);A.finalizeEntry("m/log");await sleep(300);
 typeAt(A,"m/a",0,"laptop wrote this");await sleep(300);typeAt(A,"m/a",2,"laptop's third");await sleep(1200);A.closeBooklet();await sleep(200);
 chk("base setup: the kept copy has a base, which is the file it read: no answer, and no body",("booklet.base."+id) in LSX&&!/laptop/.test(LSX["booklet.base."+id])&&!/First/.test(LSX["booklet.base."+id]));
 const laptop=takeDevice();
 // the phone, in its own browser, keeps an entry and changes the first and second answers, and its work is put into the store
 useDevice({});A=devPage();await A.openLink("#/open/three.md");await sleep(600);
 typeIn(A,"m/log","phone entry");await sleep(500);A.finalizeEntry("m/log");await sleep(300);
 typeAt(A,"m/a",0,"phone changed it");await sleep(300);typeAt(A,"m/a",1,"phone's second");await sleep(1200);saveTo(A,U);A.closeBooklet();await sleep(200);
 chk("two devices setup: the store holds the phone's entry and answers, not the laptop's",/phone entry/.test(ROUTES[U])&&/phone changed it/.test(ROUTES[U])&&!/laptop/.test(ROUTES[U]));
 // the laptop changed things since its base, so it opens as kept, with the offer
 useDevice(laptop);A=devPage();await A.openLink("#/open/three.md");
 chk("a copy with changes since its base opens as kept, with the offer",ans(A)==="laptop wrote this"&&offer()===1&&kept(id),JSON.stringify(A.STATE.answers));
 press(/Read the newer file/);
 chk("M2 on reading the file: an answer changed there and not here takes the file's (the phone's second)",ans(A,"m","r")==="phone's second",JSON.stringify(A.STATE.answers));
 chk("...an answer changed on both keeps this browser's (the laptop's first, over the phone's)",ans(A)==="laptop wrote this");
 chk("...an answer changed here and not there keeps this browser's (the laptop's third)",ans(A,"m","s")==="laptop's third");
 chk("M1 ...and both devices' entries are there",entries(A).sort().join()==="laptop entry,phone entry",JSON.stringify(entries(A)));}
// a generator moves an activity to another module (the store retargets its records line)
{const V1=FM("Moves")+"> [!module|a] Alone\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|a end] End\n";
 const V2=FM("Moves")+"> [!module|n] New home\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|n end] End\n";
 const moved=t=>merge(V2,t).replace("> [!records|a] Alone","> [!records|n] New home");
 let U=STORE+"mv.md";let A=boot();let down=false;host(A,{fail:()=>down});ROUTES[U]=V1;
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
// p20's shape: the store moves `a` to `n` deciding from its own records; an entry only this browser holds, for an
// activity that now lives elsewhere, must not make the renderer refuse that move
{const V1=FM("Split")+"> [!module|a] Alone\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!activity|b repeat] Log\n\n> [!text|w] What happened?\n\n> [!module|a end] End\n";
 const V2=FM("Split")+"> [!module|n] New home\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|n end] End\n\n> [!module|p] Log home\n\n> [!activity|b repeat] Log\n\n> [!text|w] What happened?\n\n> [!module|p end] End\n";
 const U=STORE+"p20.md";const A=boot();let down=false;host(A,{fail:()=>down});ROUTES[U]=V1;
 await A.openLink("#/open/p20.md");await sleep(600);typeIn(A,"a/a","answer, saved");await sleep(1200);
 down=true;typeIn(A,"a/b","UNSENT LOG ENTRY");await sleep(500);A.finalizeEntry("a/b");await sleep(1200);A.closeBooklet();down=false;
 chk("p20 setup: the store's records under `a` name only the answer",/records\|a/.test(ROUTES[U])&&!/UNSENT LOG ENTRY/.test(ROUTES[U]));
 /* the store, from its own records (one answers block), moves `a` to `n` */
 ROUTES[U]=merge(V2,ROUTES[U]).replace(/> \[!records\|a\][^\n]*/,"> [!records|n] New home");
 await A.openLink("#/open/p20.md");press(/Read the newer file/);
 chk("p20 the renderer makes the store's move too: the saved answer is in `n`",ans(A,"n","q")==="answer, saved",JSON.stringify(A.STATE.answers));
 chk("p20 ...and the entry only this browser held is kept and written",/UNSENT LOG ENTRY/.test(A.toMarkdown()),JSON.stringify(Object.keys(A.STATE.entries)));
 await sleep(800);chk("p20 ...and it reaches the file",/UNSENT LOG ENTRY/.test(ROUTES[U]));}
// a module line with no id is no module to the store (it reads the line): the renderer does not move work into it either
{const V1=FM("NoId")+"> [!module|a] Alone\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|a end] End\n";
 const V2=FM("NoId")+"> [!module] New home\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|module-1 end] End\n";
 const U=STORE+"noid.md";const A=boot();let down=false;host(A,{fail:()=>down});ROUTES[U]=V1;
 await A.openLink("#/open/noid.md");await sleep(600);typeIn(A,"a/a","q saved");await sleep(1200);
 down=true;typeIn(A,"a/a","q edited, unsent");await sleep(1200);A.closeBooklet();down=false;
 /* storefile sees activity `a` outside every module there (the line has no id), so it leaves `> [!records|a]` as written */
 ROUTES[U]=merge(V2,ROUTES[U]);
 await A.openLink("#/open/noid.md");press(/Read the newer file/);
 chk("a module line with no id: no work is moved into the module the page named after its place",ans(A,"module-1","q")===undefined,JSON.stringify(A.STATE.answers));
 chk("...and the unsent edit is kept as written under the old records line, as the store keeps its own",/> \[!records\|a\][\s\S]*q edited, unsent/.test(A.toMarkdown()));}

/* ---- 0.16: a module the newer file drops or renames keeps the reader's work ----
   The answers sat in this page under a module the new design no longer has, where nothing drew or wrote them: they could
   not be reached or downloaded (acceptWork returned early for a page with no host, so keepUnowned never ran). */
for(const withHost of [false]){const tag="";
 const V1=FM("Gone")+"> [!module|k] Keep\n\n> [!activity|k] K\n\n> [!text|kq] Kept question\n\n> [!module|k end] End\n\n> [!module|g] Going\n\n> [!activity|g] G\n\n> [!text|gq] Going question\n\n> [!module|g end] End\n";
 const REMOVED=V1.replace(/> \[!module\|g\][\s\S]*$/,"");
 const RENAMED=V1.replace("> [!module|g] Going","> [!module|h] Renamed").replace("> [!module|g end] End","> [!module|h end] End");
 for(const [what,V2] of [["removed",REMOVED],["renamed",RENAMED]]){
  const U=STORE+"gone-"+what+".md";const A=boot();ROUTES[U]=V1;
  await A.openLink("#/open/"+U.split("/").pop());await sleep(600);
  typeIn(A,"k/k","k answered");typeIn(A,"g/g","GOING-ANSWER-"+what);A.flushSave();await sleep(600);A.closeBooklet();
  ROUTES[U]=V2;
  await A.openLink("#/open/"+U.split("/").pop());
  chk("a module "+what+tag+": the kept copy opens with the offer, its answers still here",offer()===1&&ans(A,"g","gq")==="GOING-ANSWER-"+what,JSON.stringify(A.STATE.answers));
  press(/Read the newer file/);
  /* (a renamed module's work follows its activities into the new module, the store's own move rule; a removed module's is kept as written under its old records line) */
  chk("...reading the newer file keeps the "+what+" module's answer as records, written once, where it can be downloaded",
    (A.toMarkdown().match(new RegExp("GOING-ANSWER-"+what,"g"))||[]).length===1&&new RegExp("> \\[!records\\|"+(what==="renamed"?"h":"g")+"\\]").test(A.toMarkdown()),A.toMarkdown().split("%%")[1]);
  chk("...the answer is no longer in this page's answers (written once), and the module that stayed keeps its own",ans(A,"g","gq")===undefined&&ans(A,"k","kq")==="k answered",JSON.stringify(A.STATE.answers));
  chk("...and the design holding it is its text's parse",JSON.stringify(A.BOOK)===JSON.stringify(A.parseFile(A.bookText(A.BOOK)).template));
  A.flushSave();A.closeBooklet();
  await A.openLink("#/open/"+U.split("/").pop());
  chk("...and the next open still holds it, with no offer, and nothing written twice",!offer()&&(A.toMarkdown().match(new RegExp("GOING-ANSWER-"+what,"g"))||[]).length===1,A.toMarkdown().split("%%")[1]);
  if(what!=="removed") continue;
  /* a second newer file (only its title changed) and a third (the module back): the kept records are the booklet's, they go on
     being kept, and they return as answers when the module does */
  const count=()=>(A.toMarkdown().match(/GOING-ANSWER-removed/g)||[]).length;
  ROUTES[U]=REMOVED.replace("title: Gone","title: Gone again");
  A.closeBooklet();await A.openLink("#/open/"+U.split("/").pop());
  chk("a second newer file, "+tag+": offered",offer()===1);
  press(/Read the newer file/);
  chk("...the removed module's answer is still kept, once, and the other module's answer too",count()===1&&ans(A,"k","kq")==="k answered",A.toMarkdown().split("%%")[1]);
  A.flushSave();A.closeBooklet();
  ROUTES[U]=V1.replace("title: Gone","title: Back");
  await A.openLink("#/open/"+U.split("/").pop());press(/Read the newer file/);
  chk("a third newer file with the module back: the answer is an answer again, written once, in no foreign records",ans(A,"g","gq")==="GOING-ANSWER-removed"&&count()===1&&!/> \[!records\]\s*\n*\s*> \[!records\|g\] *\n/.test(A.toMarkdown())&&A.BOOK.modules.length===2,A.toMarkdown().split("%%")[1]);
  A.flushSave();A.closeBooklet();}}

/* ---- 0.16.1: records kept as written are the reader's work (v016-store-kept-records) ----
   The reader's only answer was in a module a newer file dropped. Reading that file kept the answer as records, kept as
   written (keepUnowned), and this page's own answers were then empty. The next time the file changed, storeHolds weighed
   only those answers, found nothing kept here, drew the file and dropped the kept copy, and the answer went with it.
   Nothing saves: the store never gets the answer, so every newer file is offered. */
for(const way of ["nothing saves"]){const tag="",saves=false;
 const V1=FM("Shed")+"> [!module|k] Keep\n\n> [!activity|k] K\n\n> [!text|kq] Kept question\n\n> [!module|k end] End\n\n> [!module|g] Going\n\n> [!activity|g] G\n\n> [!text|gq] Going question\n\n> [!module|g end] End\n";
 const DROPPED=V1.replace(/\n> \[!module\|g\][\s\S]*$/,""),titled=(t,n)=>t.replace("title: Shed","title: "+n);
 const name="kept-"+way.replace(/\W+/g,"-")+".md",U=STORE+name,LINK="#/open/"+name,WORDS="ONLY-HERE "+way;
 /* the generator's new file: the new body, and (the box's rule) the records the store holds */
 const gen=t=>{ROUTES[U]=saves?merge(t,ROUTES[U]):t;};
 const count=A=>A.toMarkdown().split(WORDS).length-1;
 const recOf=t=>{const i=t.indexOf("> [!records|g]");return i<0?"":t.slice(i,t.indexOf("\n%%",i));};
 let down=!saves,A=boot();const on=A=>{if(saves) host(A,{fail:()=>down});};on(A);
 ROUTES[U]=V1;await A.openLink(LINK);await sleep(600);
 typeIn(A,"g/g",WORDS);A.flushSave();await sleep(600);A.closeBooklet();
 gen(DROPPED);
 await A.openLink(LINK);const id=A.currentId;
 chk("kept records"+tag+": the module the answer is in is dropped by a newer file, which is offered",offer()===1&&ans(A,"g","gq")===WORDS);
 if(saves) down=false;
 press(/Read the newer file/);await sleep(600);
 const REC=recOf(A.toMarkdown());
 chk("...reading it keeps the answer as records kept as written, once, and none in this page's answers",
   count(A)===1&&/"gq": "ONLY-HERE/.test(REC)&&ans(A,"g","gq")===undefined&&!/ONLY-HERE/.test(JSON.stringify(A.STATE)),A.toMarkdown().split("%%")[1]);
 if(saves) chk("...and the host that came back saved them to the store",recOf(ROUTES[U])===REC,ROUTES[U]);
 A.flushSave();A.closeBooklet();
 for(let i=1;i<=3;i++){const N="Shed "+i;
  /* the third change comes after a fresh page load */
  if(i===3){A=boot({keep:true});on(A);}
  gen(titled(DROPPED,N));const before=global.__ls[keyOf(id)];
  await A.openLink(LINK);
  if(saves){chk("change "+i+tag+": the file holds the kept records, so it is drawn, with no offer, the records as they were",
    !offer()&&A.BOOK.title===N&&recOf(A.toMarkdown())===REC&&count(A)===1,A.toMarkdown().split("%%")[1]);
   A.closeBooklet();continue;}
  chk("change "+i+tag+": the page offers the newer file and does not draw it over the copy",
    offer()===1&&A.currentId===id&&A.BOOK.title!==N&&recOf(A.toMarkdown())===REC&&global.__ls[keyOf(id)]===before,"offer="+offer()+" title="+A.BOOK.title+" kept="+(keyOf(id) in global.__ls));
  if(i===1){press(/Dismiss/,P.find(P.main(),P.hasClass("newernote"))[0]);
   chk("...declined, the reader's copy is as it was",!offer()&&recOf(A.toMarkdown())===REC&&A.BOOK.title!==N&&global.__ls[keyOf(id)]===before);
   A.flushSave();A.closeBooklet();
   chk("...and kept as it was once closed",global.__ls[keyOf(id)]===before);
   await A.openLink(LINK);
   chk("...and opened again, the newer file is offered again",offer()===1&&recOf(A.toMarkdown())===REC);}
  press(/Read the newer file/);await sleep(300);
  chk("...read, the kept records are carried forward byte for byte, once",A.BOOK.title===N&&recOf(A.toMarkdown())===REC&&count(A)===1,A.toMarkdown().split("%%")[1]);
  A.flushSave();A.closeBooklet();}
 /* the module comes back: its text and the kept records are read together, and the answer is an answer again */
 gen(titled(V1,"Shed back"));
 await A.openLink(LINK);if(!saves) press(/Read the newer file/);
 chk("the module back"+tag+": the answer shows in it again, once",ans(A,"g","gq")===WORDS&&count(A)===1&&A.BOOK.modules.length===2,JSON.stringify(A.STATE.answers));
 A.flushSave();await sleep(300);A.closeBooklet();}
/* the same with no module left at all (front matter only; prose alone is a module of its own): a blank kept copy holding
   only kept records is judged on them too */
{const V1=FM("Lone")+"> [!module|g] Going\n\n> [!activity|g] G\n\n> [!text|gq] Going question\n\n> [!module|g end] End\n",BARE=t=>FM(t);
 const U=STORE+"lone.md",LINK="#/open/lone.md";const A=boot();ROUTES[U]=V1;
 await A.openLink(LINK);typeIn(A,"g/g","LONE ANSWER");A.flushSave();A.closeBooklet();
 ROUTES[U]=BARE("Lone");await A.openLink(LINK);press(/Read the newer file/);const id=A.currentId,REC=A.toMarkdown().split("%%")[1];
 chk("a newer file with no module: the answer is kept as records",A.BOOK.modules.length===0&&/LONE ANSWER/.test(REC));
 A.flushSave();A.closeBooklet();const before=global.__ls[keyOf(id)];
 ROUTES[U]=BARE("Lone again");await A.openLink(LINK);
 chk("...the next change is offered, not drawn over the blank copy holding them",offer()===1&&A.currentId===id&&A.toMarkdown().split("%%")[1]===REC&&global.__ls[keyOf(id)]===before);
 press(/Read the newer file/);
 chk("...and read, they are carried forward byte for byte",A.BOOK.title==="Lone again"&&A.toMarkdown().split("%%")[1]===REC);
 A.flushSave();A.closeBooklet();}

P.closePages();
console.log(fails?"\n"+fails+" FAILURES":"\nstore-held checks passed");process.exit(fails?1:0);
})();
