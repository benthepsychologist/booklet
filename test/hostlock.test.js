// Renderer 0.11.4: the host hook serves only the reader's own machine or private network, and only after the reader says yes.
// Check 1 is ownPlace(protocol, hostname), a pure table. Check 2 is the renderer's own ask: Allow (a trusted press only),
// Not now, the remembered answer, a changed label, and Stop. On a public address host() is refused and nothing is ever handed
// over. Also: the Download button's mark follows every change, with or without a host. The network is not touched.
// Run: node test/hostlock.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FM=t=>`---\nbooklet: "0.11"\ntitle: ${t}\nlang: en\n---\n\n`;
const BOOK=FM("Lock booklet")+"> [!module|ma] Module A\n\n> [!activity|act] Answer\n\n> [!text|note] Note\n\n> [!module|ma end] End\n";
const NAME="reports/week.booklet.md";
const KEY="booklet.host.allowed";
const barText=()=>P.texts(P.byId("hostLine"));
const shown=()=>P.texts(P.main());
const tag=t=>P.find(P.main(),x=>x.tagName===t);
const typeIn=(A,addr,words)=>{A.screen=addr;A.render();const ta=tag("textarea")[0];ta.value=words;ta._on.input();};
const btn=re=>P.find(P.main(),n=>n.tagName==="button"&&re.test(P.texts(n)))[0];
const trusted=n=>n._on.click({target:n,isTrusted:true});
const script=n=>n._on.click({target:n,isTrusted:false});       // element.click() and dispatchEvent give an untrusted event
const boot=(proto,host,remembered)=>{P.wipe();P.place(proto,host);if(remembered!==undefined) global.__ls[KEY]=remembered;return P.boot();};
const listen=A=>{const calls=[];A.BookletApi.onChange(x=>calls.push(x));return calls;};

(async()=>{
/* ---- check 1: ownPlace ---- */
{const A=boot("http:","fleet"),own=A.ownPlace;
 const T=[
  ["file:","",true],["file:","localhost",true],["file:","anything.example.com",true],
  ["http:","localhost",true],["https:","localhost",true],["http:","app.localhost",true],["http:","LOCALHOST",true],["http:","localhost.",true],
  ["http:","127.0.0.1",true],["http:","127.255.255.254",true],["http:","[::1]",true],["http:","::1",true],
  ["http:","10.0.0.1",true],["http:","10.255.255.255",true],["http:","172.16.0.1",true],["http:","172.31.255.255",true],["http:","192.168.0.1",true],["http:","192.168.255.1",true],
  ["http:","100.64.0.1",true],["http:","100.127.255.255",true],
  ["http:","[fd7a:115c:a1e0::1]",true],["http:","fd00::1",true],["http:","fc00::1",true],["http:","[fe80::1]",true],["http:","fe80::abcd:1",true],
  ["http:","fleet",true],["http:","nas",true],["https:","fleet",true],
  ["http:","printer.local",true],["http:","db.internal",true],["http:","box.lan",true],["http:","router.home.arpa",true],["https:","fleet.tail1234.ts.net",true],
  ["http:","::ffff:10.0.0.1",true],["http:","[::ffff:a00:1]",true],
  ["http:","172.32.0.1",false],["http:","172.15.255.255",false],["http:","100.128.0.1",false],["http:","100.63.255.255",false],["http:","192.169.0.1",false],["http:","192.167.0.1",false],
  ["http:","10.0.0.256",false],["http:","10.0.0",false],["http:","010.0.0.1",false],["http:","11.0.0.1",false],["http:","126.0.0.1",false],["http:","128.0.0.1",false],
  ["http:","8.8.8.8",false],["http:","169.254.1.1",false],["http:","0.0.0.0",false],
  ["http:","localhost.example.com",false],["http:","fleet.example.com",false],["https:","bookletmd.org",false],["https:","www.bookletmd.org",false],
  ["http:","127.0.0.1.nip.io",false],["http:","10.example.com",false],["http:","example.local.com",false],["http:","ts.net.example.com",false],["http:","evil.ts.net.com",false],
  ["http:","[2001:db8::1]",false],["http:","[::]",false],["http:","::ffff:8.8.8.8",false],["http:","[fe00::1]",false],["http:","[fec0::1]",false],["http:","1::2::3",false],["http:","[::1::]",false],
  ["http:","",false],["https:","",false],["about:","",false],["blob:","",false],["data:","localhost",false],["ftp:","fleet",false],[undefined,undefined,false],["http:",null,false]];
 chk("the table has at least 40 cases",T.length>=40,T.length);
 for(const [pr,h,want] of T) chk("ownPlace("+JSON.stringify(pr)+", "+JSON.stringify(h)+") is "+want,own(pr,h)===want);
 chk("it returns a plain true or false",T.every(([pr,h])=>typeof own(pr,h)==="boolean"));}

/* ---- on a public address ---- */
{const A=boot("https:","bookletmd.org",""),B=A.BookletApi;
 chk("a public address is not the reader's own place",A.HOST_OWN===false);
 const h=B.host({label:"site: store"});
 chk("host() returns a frozen handle with the same members, and state() says refused",Object.keys(h).sort().join()==="failed,fileChanged,leave,saved,state"&&Object.isFrozen(h)&&h.state()==="refused");
 chk("no host is registered and no notice is shown",A.HOST===null&&!/wants to save/.test(shown())&&P.find(P.main(),n=>(n.attrs||{}).class&&/hostask/.test(n.attrs.class)).length===0);
 chk("the bar says Kept in this browser only",barText()==="Kept in this browser only",barText());
 const calls=listen(A);B.open(BOOK,{name:NAME});typeIn(A,"ma/act","private words");await sleep(900);
 chk("the listener is never called",calls.length===0,calls.length);
 chk("text() returns an empty string",B.text()==="");
 h.saved();h.failed("x");h.fileChanged(BOOK);h.leave();
 chk("its members do nothing: no failure shown, no offer",barText()==="Kept in this browser only"&&!/The file has changed/.test(shown()));
 chk("window.Booklet is still defined, with the same members",Object.keys(B).sort().join()==="host,onChange,open,text,version");
 chk("nothing is remembered",global.__ls[KEY]===undefined||global.__ls[KEY]==="");
 /* even a remembered yes does not count on a public address */
 const A2=boot("https:","bookletmd.org","site: store"),h2=A2.BookletApi.host({label:"site: store"}),c2=listen(A2);
 A2.BookletApi.open(BOOK,{name:NAME});await sleep(700);
 chk("a remembered yes does nothing on a public address",h2.state()==="refused"&&c2.length===0&&A2.BookletApi.text()==="");
 A2.screen="library";A2.render();
 chk("and the Stop line is not shown there",!/may save the booklets/.test(shown()));
 for(const [pr,hn] of [["http:","10.example.com"],["https:","fleet.example.com"]]){const A3=boot(pr,hn,"x");
   chk(hn+" is public: refused",A3.BookletApi.host({label:"x"}).state()==="refused");}}

/* ---- check 2: the ask ---- */
{const A=boot("http:","fleet"),B=A.BookletApi;
 const evil='<img src=x onerror=alert(1)> *bold* '+"Z".repeat(120);
 const h=B.host({label:evil}),calls=listen(A);
 chk("on a private address the host waits",h.state()==="waiting"&&A.HOST.state==="waiting");
 const note=P.find(P.main(),n=>(n.attrs||{}).class&&/hostask/.test(n.attrs.class))[0];
 chk("the renderer shows its own notice at the top",!!note&&P.main().children[0]===note);
 chk("it says what the page wants, with the label capped at 80 and as text",/^This page wants to save the booklets it opens for you to: <img src=x onerror=alert\(1\)> \*bold\* Z+ ?\. Your booklets stay in this browser too\./.test(P.texts(note)),P.texts(note));
 const em=P.find(note,n=>n.tagName==="em")[0];
 chk("the label is in an em as text, never markup",!!em&&em.children.length===1&&typeof em.children[0]==="string"&&em.children[0].length<=80&&em._html==="");
 chk("it has two buttons: Allow and Not now",!!btn(/^Allow$/)&&!!btn(/^Not now$/));
 chk("the bar says Kept in this browser only while waiting",barText()==="Kept in this browser only");
 B.open(BOOK,{name:NAME});typeIn(A,"ma/act","before allow");await sleep(900);
 chk("while waiting: no onChange call",calls.length===0,calls.length);
 chk("while waiting: text() is empty",B.text()==="");
 h.fileChanged(BOOK+"\nx");
 chk("while waiting: fileChanged does nothing",A.HOST.pending===null&&!/The file has changed/.test(shown()));
 h.saved();h.failed("boom");
 chk("while waiting: saved() and failed() do nothing",barText()==="Kept in this browser only"&&A.HOST.status==="idle");
 chk("while waiting the not-downloaded note still shows (nothing covers the work)",!!A.unsavedNote());
 script(btn(/^Allow$/));
 chk("an untrusted Allow does nothing",h.state()==="waiting"&&global.__ls[KEY]===undefined&&btn(/^Allow$/));
 script(btn(/^Not now$/));
 chk("an untrusted Not now does nothing either",!!btn(/^Not now$/));
 trusted(btn(/^Not now$/));
 chk("Not now hides the notice and leaves the host waiting",!btn(/^Allow$/)&&h.state()==="waiting"&&global.__ls[KEY]===undefined);
 A.render();chk("it stays hidden for the visit",!btn(/^Allow$/));
 /* a new visit asks again */
 const A2=boot("http:","fleet"),h2=A2.BookletApi.host({label:evil});
 chk("Not now asks again on the next visit",h2.state()==="waiting"&&!!btn(/^Allow$/));
 /* Allow */
 const calls2=listen(A2);A2.BookletApi.open(BOOK,{name:NAME});await sleep(300);
 chk("(nothing is handed over before Allow)",calls2.length===0);
 trusted(btn(/^Allow$/));
 chk("a trusted Allow makes the host active",h2.state()==="active"&&A2.HOST.state==="active");
 chk("...and remembers the label for this site, in the renderer's own key",global.__ls[KEY]===evil.replace(/\s+/g," ").trim().slice(0,80),global.__ls[KEY]);
 chk("...the notice is gone",!btn(/^Allow$/)&&!/wants to save/.test(shown()));
 await sleep(900);
 chk("...the listener hears the open booklet once, at once",calls2.length===1&&calls2[0].name===NAME&&calls2[0].text===A2.BookletApi.text(),calls2.length);
 chk("...and it is told only text, name and title",Object.keys(calls2[0]).sort().join()==="name,text,title");
 chk("...the bar now says where saves go",/^Saves go to: <img/.test(barText()),barText());
 chk("...text() returns the booklet",A2.BookletApi.text().length>0);
 await sleep(700);
 chk("...and only once",calls2.length===1,calls2.length);
 typeIn(A2,"ma/act","after allow");await sleep(700);
 chk("a later change is heard",calls2.length===2&&/after allow/.test(calls2[1].text));
 /* on the library screen the Stop line appears */
 A2.flushSave();A2.closeBooklet();A2.render();
 const stop=P.find(P.main(),n=>(n.attrs||{}).class&&/hoststop/.test(n.attrs.class))[0];
 chk("on Your booklets a quiet line says this page may save them, with Stop",!!stop&&/^This page may save the booklets it opens to: <img src=x .*\. Stop$/.test(P.texts(stop)),stop&&P.texts(stop));
 script(btn(/^Stop$/));
 chk("an untrusted Stop does nothing",A2.HOST.state==="active"&&!!global.__ls[KEY]);
 trusted(btn(/^Stop$/));
 chk("Stop forgets the answer and makes the host waiting again",A2.HOST.state==="waiting"&&h2.state()==="waiting"&&global.__ls[KEY]===undefined);
 chk("...the Stop line is gone, and the host hears no more",!btn(/^Stop$/));
 const n=calls2.length;A2.BookletApi.open(BOOK,{name:NAME});typeIn(A2,"ma/act","after stop");await sleep(800);
 chk("...nothing more is handed over",calls2.length===n&&A2.BookletApi.text()==="",calls2.length-n);}

/* ---- remembered, and a different label ---- */
{const A=boot("http:","fleet","box: store"),B=A.BookletApi,calls=listen(A);
 const h=B.host({label:"box: store"});
 chk("a remembered site is active at once on the next start, with no notice",h.state()==="active"&&!btn(/^Allow$/)&&!/wants to save/.test(shown()));
 B.open(BOOK,{name:NAME});await sleep(700);
 chk("...and the host is handed the booklet",calls.length===1);
 const h2=B.host({label:"another: store"});
 chk("a different label asks again",h2.state()==="waiting"&&!!btn(/^Allow$/)&&!/box: store/.test(P.texts(btn(/^Allow$/)))&&/another: store/.test(shown()));
 trusted(btn(/^Allow$/));
 chk("and Allow remembers the new label",global.__ls[KEY]==="another: store"&&h2.state()==="active");
 chk("the first handle is superseded: state() says refused",h.state()==="refused");
 h2.leave();chk("leave() on a waiting or active host drops it",A.HOST===null&&h2.state()==="refused");}

/* ---- the host waits and a booklet is not the host's: nothing changes ---- */
{const A=boot("http:","fleet"),B=A.BookletApi;
 const h=B.host({label:"p"});const calls=listen(A);
 A.loadText(BOOK);typeIn(A,"ma/act","mine");await sleep(700);
 chk("a waiting host with a reader's own booklet: no call, kept-only line",calls.length===0&&barText()==="Kept in this browser only");
 chk("the ask shows on a screen with a booklet open too",!!btn(/^Allow$/));
 }
{const A=boot("http:","fleet","x"),B=A.BookletApi,calls=listen(A);
 B.open(BOOK,{name:NAME});typeIn(A,"ma/act","no host call");await sleep(900);
 chk("a script that only calls onChange (never host()) is never called, even where a yes is remembered",calls.length===0&&B.text()==="");}

/* ---- the Download button's mark follows every change ---- */
for(const withHost of [false,true]){
 const A=boot("http:","fleet",withHost?"h":undefined),B=A.BookletApi;
 let marks=[];const dl=P.byId("btnExport");dl.classList.toggle=(c,on)=>{marks.push([c,!!on]);};
 if(withHost) B.host({label:"h"});
 A.createBooklet();A.addModuleText(BOOK);A.render();marks=[];
 A.screen="ma/act";A.render();const ta=tag("textarea")[0];
 marks=[];ta.value="typing";ta._on.input();
 chk("typing into a question marks the Download button at once, without a redraw ("+(withHost?"a host that is active but not listening":"no host")+")",marks.some(m=>m[0]==="attention"&&m[1]===true),JSON.stringify(marks));
}

/* ---- the strings ---- */
{const A=boot("http:","fleet");
 for(const l of ["en","fr","es","es-AR"]){const u=A.STRINGS[l].ui;
  chk(l+" has the ask strings",["hostAsk","hostAskStay","hostAllow","hostNotNow","hostMay","hostStop"].every(k=>typeof u[k]==="string"&&u[k].length>3));}}

console.log(fails?"\n"+fails+" FAILURES":"\nhostlock checks passed");
process.exit(fails?1:0);
})();
