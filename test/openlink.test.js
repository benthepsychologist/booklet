// Renderer 0.11.1: opening a booklet by link, from what the page's own host declares (a `booklet-store` meta tag and the
// `booklet-registry` it already had). The name rule, the address that is built, what is fetched and what is not, that an
// opened booklet is a view (not in "Your booklets" until something changes, never replacing one that is kept), and the
// quiet line saying where it came from. The network is a stub: nothing here reaches one.
// Run: node test/openlink.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
global.URL=Object.assign(require("url").URL,{createObjectURL:()=>"blob:x",revokeObjectURL(){}});
const PAGE="https://host.test/app/";
global.location={href:PAGE,hash:""};
let META={};
global.document.querySelector=sel=>{const m=/meta\[name="([^"]+)"\]/.exec(sel);const v=m&&META[m[1]];return v?{getAttribute:k=>k==="content"?v:null}:null;};
const booklet=(title,extra)=>`---\nbooklet: "0.11"\ntitle: ${title}\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|m end] End\n${extra||""}`;
const WEEK=booklet("Week report");
const MOD=booklet("Daily journal");
let CALLS=[],ROUTES={};
const reply=(body,o={})=>({ok:o.ok!==false,status:o.ok===false?404:200,headers:{get:k=>({"content-type":o.type||"text/plain","content-length":o.len}[k.toLowerCase()])},
  body:{getReader(){const b=Buffer.from(body);let done=false;return {read:async()=>done?{done:true}:(done=true,{done:false,value:new Uint8Array(b)})};}},text:async()=>body,json:async()=>JSON.parse(body)});
const reset=()=>{P.wipe();global.fetch=undefined;global.fetch=async(url,opts)=>{CALLS.push({url:String(url),opts:opts||{}});
  const r=ROUTES[String(url)];if(!r) return reply("nf",{ok:false});if(r instanceof Error) throw r;return typeof r==="function"?r():reply(r);};
  CALLS=[];ROUTES={};META={};};
const text=n=>P.texts(n);
const lib=()=>JSON.parse(global.__ls["booklet.library.v1"]||'{"entries":[]}').entries;
const STORE="https://host.test/booklets/";

(async()=>{
/* ---- the name rule ---- */
reset();{const A=P.boot();
 const bad=["../x.md","/etc/x.md","a/../b.md","a//b.md","https://x/y.md","x.md?y","a\\b.md","%2e%2e/x.md","x.txt","","a/./b.md","a/b/","x.md#y","//x.test/y.md","c:/x.md","a b.md","caf\u00e9.md","%E9%9B%AA.md","%zz.md","x.md\n","a/..","./x.md",".md/","x.MD","a:b.md","a%00b.md","a%5Cb.md","a%2F%2Fb.md","a%2Fb%2F..%2Fc.md","x".repeat(198)+".md",".md","a/.md","a/.hidden.md",".a.md","a/b/.md"];
 const good=["x.md","report.booklet.md","reports/week.booklet.md","a/b/c.md","A-b_c.d/e-f.md","a%2Fb.md","x".repeat(197)+".md"];
 for(const n of bad) chk("refused: "+JSON.stringify(n.length>40?n.slice(0,20)+"...("+n.length+")":n),A.linkName(n)===null);
 chk("a 201-character name is refused and a 200-character one is not",A.linkName("x".repeat(198)+".md")===null&&A.linkName("x".repeat(197)+".md")!==null);
 for(const n of good) chk("good: "+JSON.stringify(n.length>40?n.slice(0,20)+"...":n),A.linkName(n)!==null);
 chk("a good name at one level and at three levels comes back as it is",A.linkName("x.md")==="x.md"&&A.linkName("a/b/c.md")==="a/b/c.md");
 chk("the name is decoded once: %2e%2e is the dots and is refused, %252e is a percent sign and is refused",A.linkName("%2e%2e/x.md")===null&&A.linkName("%252e%252e/x.md")===null);
 chk("an empty name for the module link is not a name",A.linkName("")===null);}

/* ---- the address ---- */
reset();{const A=P.boot();
 chk("a page with no store tag has no store, and no name has an address",A.storeUrl()===""&&A.storeAddress("x.md")===null);
 META["booklet-store"]="../booklets";
 chk("a relative store is resolved against the page and closed with a slash",A.storeUrl()===STORE,A.storeUrl());
 chk("the address is the store plus the name",A.storeAddress("reports/week.booklet.md")===STORE+"reports/week.booklet.md",A.storeAddress("reports/week.booklet.md"));
 chk("a bad name has no address",A.storeAddress("../x.md")===null&&A.storeAddress("https://evil.test/x.md")===null);
 META["booklet-store"]="https://store.test/pub/";
 chk("an absolute store keeps its host; a name can never change it",A.storeAddress("a.md")==="https://store.test/pub/a.md"&&A.storeAddress("//host2.test/a.md")===null);
 const names=["a.md","a/b.md","x-y_z.v1/q.md"];
 chk("every address built from a good name is under the store and on its origin",names.every(n=>{const u=A.storeAddress(n);return u&&u.startsWith("https://store.test/pub/")&&new URL(u).origin==="https://store.test";}));
 META["booklet-store"]="javascript:alert(1)";chk("a store that is not http or https is no store",A.storeUrl()==="");
 META["booklet-store"]="file:///etc/";chk("...nor a file address",A.storeUrl()==="");
 chk("the link's shape: only #/open/ and #/module/ are links",A.linkOf("#/open/x.md").kind==="open"&&A.linkOf("#/module/a").kind==="module"&&A.linkOf("#x")===null&&A.linkOf("")===null&&A.linkOf("#/other/x")===null);}

/* ---- no store declared: nothing is fetched ---- */
reset();{const A=P.boot();
 const ok=await A.openLink("#/open/reports/week.booklet.md");
 chk("with no store declared, nothing is fetched, nothing opens, and the page says so",ok===false&&CALLS.length===0&&A.currentId===null&&/no store/.test(text(P.byId("toast"))),text(P.byId("toast")));
 chk("...and the start screen stays",A.screen==="library"||A.currentId===null);}

/* ---- a bad name: nothing is requested ---- */
reset();{const A=P.boot();META["booklet-store"]=STORE;
 for(const h of ["#/open/../x.md","#/open/https://x.test/y.md","#/open/x.txt","#/open/a%5Cb.md","#/open/"]) await A.openLink(h);
 chk("bad names request nothing",CALLS.length===0,JSON.stringify(CALLS));
 chk("...and say so in plain words",/does not name a booklet/.test(text(P.byId("toast"))),text(P.byId("toast")));}

/* ---- a store opens a booklet: a view ---- */
reset();{const A=P.boot();META["booklet-store"]=STORE;
 ROUTES[STORE+"reports/week.booklet.md"]=WEEK;
 A.loadText(booklet("Kept already"));A.flushSave();A.closeBooklet();
 const before=JSON.stringify(lib()),keys=Object.keys(global.__ls).sort().join();
 const ok=await A.openLink("#/open/reports/week.booklet.md");
 chk("a name in the store opens the booklet",ok===true&&A.currentId!==null&&A.BOOK&&/Week report/.test(JSON.stringify(A.BOOK.head||A.BOOK.title||"")));
 chk("exactly one request, a GET with no body, no credentials, no redirect, to the store's address",CALLS.length===1&&CALLS[0].url===STORE+"reports/week.booklet.md"&&!CALLS[0].opts.method&&!CALLS[0].opts.body&&CALLS[0].opts.credentials==="omit"&&CALLS[0].opts.redirect==="error"&&!!CALLS[0].opts.signal,JSON.stringify(CALLS));
 chk("it opens into its one activity (the v0.11 rule), like a file from disk",A.screen==="m/a",A.screen);
 chk("it is not in the library until something changes: the list and every key are as they were",JSON.stringify(lib())===before&&Object.keys(global.__ls).sort().join()===keys,JSON.stringify(lib()));
 chk("the booklet kept before is untouched",lib().length===1&&/Kept already/.test(JSON.stringify(lib()[0].title)));
 const pv=P.find(P.main(),P.hasClass("openedby"))[0];
 chk("a quiet line says where it came from, in these words",!!pv&&text(pv).startsWith("Opened by a link, from this page's own store: reports/week.booklet.md"),pv?text(pv):"none");
 chk("the line is its own: no problems notice, nothing counted as unread",!P.find(P.main(),P.hasClass("filenotes")).length&&!/could not read/.test(text(P.main())));
 A.flushSave();chk("leaving it unchanged still keeps nothing",lib().length===1);
 A.editBook(t=>{});A.flushSave();
 chk("when the reader changes something it joins \"Your booklets\" (a second entry, the first untouched)",lib().length===2&&lib().some(e=>/Kept already/.test(JSON.stringify(e.title)))&&lib().some(e=>e.from==="store:reports/week.booklet.md"),JSON.stringify(lib()));
 const pv2=P.find(P.main(),P.hasClass("openedby"));
 A.closeBooklet();
 // opening the link again: the booklet this browser keeps for that name opens, never a second one
 ROUTES[STORE+"reports/week.booklet.md"]=WEEK.replace("A question","A newer question");
 await A.openLink("#/open/reports/week.booklet.md");
 chk("opening it again opens the kept booklet (no second entry), and the store's changed file is offered, not read",lib().length===2&&A.currentId===lib().find(e=>e.from).id&&!/newer question/.test(JSON.stringify(A.BOOK))&&P.find(P.main(),P.hasClass("hostnote")).length===1,JSON.stringify(lib().map(e=>e.from)));
 chk("the old \"You also keep a copy\" line is gone",!/You also keep a copy/.test(text(P.main())));}

/* ---- one booklet per store name: the newer-file offer and what reading it keeps ---- */
const answer=(A,addr,words)=>{A.screen=addr;A.render();const ta=P.find(P.main(),n=>n.tagName==="textarea"||n.tagName==="input")[0];ta.value=words;ta._on.input();};
const offer=()=>P.find(P.main(),P.hasClass("hostnote"))[0];
const press=(re)=>{const b=P.find(offer(),n=>n.tagName==="button"&&re.test(text(n)))[0];b._on.click({target:b});};
const stored=()=>Object.keys(global.__ls).filter(k=>/^booklet\.b\./.test(k)).map(k=>JSON.parse(global.__ls[k]));
const ans=A=>(A.STATE.answers.m||{}).q;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
reset();{const A=P.boot();META["booklet-store"]=STORE;const U=STORE+"week.md";ROUTES[U]=WEEK;
 for(const round of [1,2,3]){
   await A.openLink("#/open/week.md");
   if(round===3) chk("the third open shows the second answer",ans(A)==="answer 2",JSON.stringify(A.STATE.answers));
   chk("round "+round+": no offer, the file is as it was last read",!offer());
   answer(A,"m/a","answer "+round);A.flushSave();A.closeBooklet();}
 chk("three opens with an answer each time leave one entry and one stored copy",lib().length===1&&stored().length===1&&lib()[0].from==="store:week.md",lib().length+" "+stored().length);
 chk("the entry remembers a fingerprint of what it read, not the text",typeof lib()[0].storeSeen==="string"&&lib()[0].storeSeen.length<30&&!/Week report/.test(JSON.stringify(lib()[0].storeSeen)));
 // the store file is exactly what the kept booklet would write: nothing to offer
 await A.openLink("#/open/week.md");const mine=A.toMarkdown();A.closeBooklet();
 ROUTES[U]=mine;await A.openLink("#/open/week.md");
 chk("a store file identical to the kept text makes no offer, and updates what was seen",!offer()&&lib().length===1&&lib()[0].storeSeen!==undefined);A.closeBooklet();
 // a changed store file: the offer; dismissing changes nothing
 const NEWER=WEEK.replace("A question","A newer question").replace("> [!text|q] A newer question","> [!text|q] A newer question\n\n> [!text|q2] A second question");
 ROUTES[U]=NEWER;await A.openLink("#/open/week.md");
 chk("a changed store file shows the offer, with Read the newer file and Dismiss",!!offer()&&/The file has changed where it is kept/.test(text(offer()))&&P.find(offer(),n=>n.tagName==="button"&&/Dismiss/.test(text(n))).length===1);
 const before=JSON.stringify([A.toMarkdown(),lib()]);
 press(/Dismiss/);
 chk("dismissing changes nothing",!offer()&&JSON.stringify([A.toMarkdown(),lib()])===before&&ans(A)==="answer 3"&&!/newer question/.test(JSON.stringify(A.BOOK)));A.closeBooklet();
 // reading it, with no host: the new body, the reader's own answers
 await A.openLink("#/open/week.md");A.screen="m/a";
 press(/Read the newer file/);
 chk("reading it with no host takes the new body and keeps the reader's answer",/A second question/.test(JSON.stringify(A.BOOK))&&ans(A)==="answer 3"&&/answer 3/.test(A.toMarkdown())&&!offer(),JSON.stringify(A.STATE.answers));
 chk("...into the same entry: still one, and what it saved holds both",lib().length===1&&stored().length===1&&/answer 3/.test(JSON.stringify(stored()[0].S))&&/second question/.test(JSON.stringify(stored()[0].TPL)));
 A.closeBooklet();await A.openLink("#/open/week.md");
 chk("having read it, opening again offers nothing",!offer()&&lib().length===1);A.closeBooklet();
 // entries and drafts are kept too, and an answer to a question the new body dropped stays unused
 ROUTES[U]=WEEK.replace("> [!text|q] A question","> [!text|z] Something else");
 await A.openLink("#/open/week.md");press(/Read the newer file/);
 chk("an answer to a question the new body no longer has stays kept, unused",ans(A)==="answer 3"&&/Something else/.test(JSON.stringify(A.BOOK)),JSON.stringify(A.STATE.answers));
 A.closeBooklet();
 ROUTES[U]="not a booklet";const r=await A.openLink("#/open/week.md");
 chk("a store file the page refuses opens nothing and says why",r===false&&A.currentId===null&&/\S/.test(text(P.byId("toast"))));}
// with a host registered and the booklet the host's: the store file is the truth
reset();{const A=P.boot(),B=A.BookletApi;META["booklet-store"]=STORE;const U=STORE+"week.md";ROUTES[U]=WEEK;
 const calls=[];B.host({label:"box"});B.onChange(x=>calls.push(x));
 await A.openLink("#/open/week.md");answer(A,"m/a","mine");await sleep(700);A.flushSave();A.closeBooklet();
 const FILE="---\nbooklet: \"0.11\"\ntitle: Week report\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] A question\n\n> [!module|m end] End\n\n%%\n> [!records] App record — do not edit below this line\n\n> [!records|m] M\n\n```booklet answers\n{\"q\": \"from another device\"}\n```\n\n%%\n";
 ROUTES[U]=FILE;const n0=calls.length;
 await A.openLink("#/open/week.md");await sleep(700);
 chk("a newer store file with a host registered is offered; the host is sent nothing while the offer waits",!!offer()&&calls.length===n0&&ans(A)==="mine",calls.length-n0);
 press(/Read the newer file/);
 chk("reading it takes the store file whole: its answer is the booklet's now",ans(A)==="from another device"&&lib().length===1,JSON.stringify(A.STATE.answers));
 await sleep(700);
 chk("...and the host then hears of the booklet as it now is",calls.length>n0&&/from another device/.test(calls[calls.length-1].text));}
// a host that saved: the store holds exactly what the booklet writes, so nothing is offered
reset();{const A=P.boot(),B=A.BookletApi;META["booklet-store"]=STORE;const U=STORE+"week.md";ROUTES[U]=WEEK;
 B.host({label:"box"});B.onChange(x=>{ROUTES[U]=x.text;});
 await A.openLink("#/open/week.md");answer(A,"m/a","saved by the host");await sleep(700);A.flushSave();A.closeBooklet();
 await A.openLink("#/open/week.md");
 chk("a host that saved the answer into the store file leaves nothing to offer",!offer()&&ans(A)==="saved by the host"&&lib().length===1);}
// a registry module: one booklet per module link
reset();{const A=P.boot();META["booklet-registry"]="https://reg.test/registry.json";
 ROUTES["https://reg.test/registry.json"]=JSON.stringify({modules:[{id:"t/daily",title:"Daily journal",file:"daily.md"}]});
 ROUTES["https://reg.test/daily.md"]=MOD;
 for(const round of [1,2]){await A.openLink("#/module/t%2Fdaily");
   chk("module link, round "+round+": no offer",!offer());
   answer(A,"m/a","journal "+round);A.flushSave();A.closeBooklet();}
 chk("opening a module link twice leaves one entry and one stored copy",lib().length===1&&stored().length===1&&lib()[0].from==="registry:t/daily",JSON.stringify(lib().map(e=>e.from)));
 ROUTES["https://reg.test/daily.md"]=MOD.replace("A question","A better question");
 await A.openLink("#/module/t%2Fdaily");
 chk("a changed module is offered, and the kept booklet is untouched until the reader presses",!!offer()&&!/better question/.test(JSON.stringify(A.BOOK))&&ans(A)==="journal 2");
 press(/Read the newer file/);
 chk("reading it updates the module in place and keeps the answers",/better question/.test(JSON.stringify(A.BOOK))&&ans(A)==="journal 2"&&lib().length===1&&!offer(),JSON.stringify(A.STATE.answers));
 A.closeBooklet();await A.openLink("#/module/t%2Fdaily");
 chk("having read it, the same module makes no offer",!offer()&&lib().length===1);}

/* ---- the fetch refusals ---- */
reset();{const A=P.boot();META["booklet-store"]=STORE;
 const tryit=async(route,why)=>{ROUTES={};ROUTES[STORE+"x.md"]=route;const n0=lib().length;const ok=await A.openLink("#/open/x.md");
   chk(why,ok===false&&A.currentId===null&&lib().length===n0&&/\S/.test(text(P.byId("toast"))),text(P.byId("toast")));};
 await tryit(()=>reply("nf",{ok:false}),"a missing file shows a plain message and opens nothing");
 await tryit(()=>reply("<html>",{type:"text/html"}),"an HTML answer is refused as not text");
 await tryit(()=>reply(WEEK,{len:String(6*1024*1024)}),"a declared size over 5 MB is refused");
 await tryit(()=>reply(booklet("Big","x".repeat(5*1024*1024+10))),"a body over 5 MB is refused");
 await tryit(new Error("redirect"),"a redirect (which the browser raises as an error) is refused");
 await tryit(()=>reply("just words, not a booklet"),"text the parser refuses is refused with its own message");
 await tryit(()=>({ok:true,headers:{get:()=>"text/plain"},body:{getReader(){let d=false;return {read:async()=>d?{done:true}:(d=true,{done:false,value:new Uint8Array([0xff,0xfe,0x80])})};}}}),"bytes that are not UTF-8 text are refused");
 chk("a refused booklet never reached the library",lib().length===0);}

/* ---- the registry: a module link ---- */
reset();{const A=P.boot();META["booklet-registry"]="https://reg.test/registry.json";
 ROUTES["https://reg.test/registry.json"]=JSON.stringify({modules:[{id:"t/daily",title:"Daily journal",file:"daily.md"}]});
 ROUTES["https://reg.test/daily.md"]=MOD;
 let ok=await A.openLink("#/module/t%2Fnot-there");
 chk("a module id that is not in the registry's list is refused, and its file is never asked for",ok===false&&CALLS.every(c=>c.url==="https://reg.test/registry.json")&&/not on this page's registry/.test(text(P.byId("toast"))),JSON.stringify(CALLS.map(c=>c.url)));
 CALLS=[];
 ok=await A.openLink("#/module/t%2Fdaily");
 chk("a listed id opens that module as a booklet, from the address the list gave",ok===true&&CALLS.map(c=>c.url).join()==="https://reg.test/registry.json,https://reg.test/daily.md",JSON.stringify(CALLS.map(c=>c.url)));
 const pv=P.find(P.main(),P.hasClass("openedby"))[0];
 chk("the line says it came from the registry, by the module's title",!!pv&&text(pv).startsWith("Opened by a link, from this page's registry: Daily journal"),pv?text(pv):"none");
 chk("it is unkept: the library is empty",lib().length===0);
 CALLS=[];await A.openLink("#/module/https%3A%2F%2Fevil.test%2Fx.md");
 chk("a module id is never turned into an address: an address as an id asks for nothing new",CALLS.every(c=>c.url==="https://reg.test/registry.json"));}
reset();{const A=P.boot();
 const ok=await A.openLink("#/module/t%2Fdaily");
 chk("a module link on a page with no registry is refused and requests nothing",ok===false&&CALLS.length===0);}

/* ---- the marker notice: its own sentence, not counted ---- */
reset();{const A=P.boot();META["booklet-store"]=STORE;
 ROUTES[STORE+"old.md"]=WEEK.replace('booklet: "0.11"','booklet: "0.9"');
 await A.openLink("#/open/old.md");
 const n=P.find(P.main(),P.hasClass("filenotes"))[0];
 chk("a file marked 0.9 opened by link shows the marker sentence by itself",!!n&&/^This file says booklet: 0\.9\. This page reads format 0\.11 and has opened it as it is/.test(text(n))&&!/could not read/.test(text(n)),n?text(n):"none");
 chk("...and the provenance line is a separate box above it",P.find(P.main(),P.hasClass("openedby")).length===1);}

/* ---- the three languages ---- */
reset();{const A=P.boot();
 for(const l of ["en","fr","es","es-AR"]){const B=A.STRINGS[l].booklet;
  const ks=["linkNoStore","linkBadName","linkNoModule","linkMissing","linkBig","linkSlow","linkNotText","linkFailed"];
  chk(l+": every link message is worded",ks.every(k=>typeof B[k]==="string"&&B[k].length>3)&&/reports\/x\.md/.test(B.linkFromStore("reports/x.md"))&&/Mod/.test(B.linkFromRegistry("Mod")));}
 chk("fr and es differ from en",A.STRINGS.fr.booklet.linkBadName!==A.STRINGS.en.booklet.linkBadName&&A.STRINGS.es.booklet.linkBadName!==A.STRINGS.en.booklet.linkBadName);}

P.closePages();
console.log(fails?"\n"+fails+" FAILURES":"\nopenlink checks passed");process.exit(fails?1:0);
})();
