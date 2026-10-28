// Renderer 0.13.1, the save status and auto-save (v0.13 item 13). One status in the bar of a booklet, Saved, Saving… or
// Unsaved, read from hostCovers and the reader's downloads, in place of the Download button's mark and the "not yet
// downloaded" note. A hosted booklet's change goes to the host once typing pauses for 2 s, and at most 5 s after the first
// change not yet sent, never on every key, and at once when the page is hidden, on Download, on opening another booklet, on
// the way home and before "Read the newer file". This file checks, in the recording DOM:
//   - the shipped cadence (2 s, 5 s) and, scaled down, its shape: one send after a pause, about three for twelve units of
//     typing, the latest text only, change numbers counted up by one per send;
//   - each "at once" case, with the real cadence, so nothing but the case itself can have sent the change;
//   - the three states with a host and without, a saved() for an older change (sent, or sent while a newer one waits) that
//     leaves the status at Saving, a failure that stays Unsaved (the changes still sent) until a save succeeds, nobody
//     listening as a failure, and a run of random events after each of which Saved is shown only when the host said saved
//     for the text on screen or nothing changed since the file was read or downloaded;
//   - the live region (Saved and Unsaved spoken, Saving not, an opened booklet and its open's answer not), and the line behind
//     the status;
//   - the cold review's cases: no Saved for a change the host was not sent (typed while a link's offer waits, made while
//     nobody listens, the last module removed, a saved() naming no change that was meant for another booklet), the merged
//     booklet sent after "Read the newer file" with no second offer from a store that keeps its body, Clear everything
//     Unsaved, and a change resent when the page comes back from the page cache;
//   - keeping in the browser unchanged: the kept copy is written 400 ms after a change, whatever the host's cadence;
//   - nothing lost by waiting: a change the host never answered before the page closed reaches it at the next open.
// The browser half (the real 12 s of typing, colours, shapes, forced colours, print) is test/autosave-browser.js.
// Run: node test/autosave.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs"),path=require("path");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* a real URL (the store's address is worked out with it), and a stand-in for the object URL a download makes */
global.URL=Object.assign(require("url").URL,{createObjectURL:()=>"blob:x",revokeObjectURL(){}});
global.location={href:"http://fleet/app/",protocol:"http:",hostname:"fleet",hash:""};
let META={};
global.document.querySelector=sel=>{const m=/meta\[name="([^"]+)"\]/.exec(sel);const v=m&&META[m[1]];return v?{getAttribute:k=>k==="content"?v:null}:null;};
const STORE="http://fleet/booklets/",LABEL="fleet: store";
const FM=t=>`---\nbooklet: "0.16"\ntitle: ${t}\nlang: en\n---\n\n`;
const booklet=(title,q)=>FM(title)+`> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] ${q||"A question"}\n\n> [!module|m end] End\n`;
let ROUTES={};
const reply=body=>({ok:true,status:200,headers:{get:k=>({"content-type":"text/markdown"}[k.toLowerCase()])},
  body:{getReader(){const b=Buffer.from(body);let done=false;return {read:async()=>done?{done:true}:(done=true,{done:false,value:new Uint8Array(b)})};}},text:async()=>body});
const installFetch=()=>{global.fetch=async url=>{const r=ROUTES[String(url)];
  if(r===undefined) return {ok:false,status:404,headers:{get:()=>null},body:null,text:async()=>"nf"};return reply(r);};};
/* a page load on the box: `keep` keeps what the browser has stored (a later visit); the reader has said yes to the host */
function boot({keep=false,crash=false}={}){
  if(crash){}else if(keep) P.closePages();else{P.wipe();ROUTES={};}
  P.place("http:","fleet");global.__ls["booklet.host.allowed"]=LABEL;installFetch();META={"booklet-store":STORE};
  return P.boot();}
/* a stand-in host: records every call; answers only when told to (`auto`: saved(change) at once, and keeps the text as the
   store's file, as a box's server does for a booklet whose body it keeps) */
function host(A,o={}){const me=A.BookletApi.host({label:LABEL});const log=[];
  A.BookletApi.onChange(c=>{log.push(c);if(o.auto){ROUTES[STORE+c.name]=c.text;me.saved(c);}});
  return {me,log,last:()=>log[log.length-1]};}
const typeIn=(A,words,addr)=>{A.screen=addr||"m/a";A.render();const ta=P.find(P.main(),x=>x.tagName==="textarea")[0];ta.value=words;ta._on.input();};
const state=()=>P.byId("saveBtn").attrs["data-state"];
const said=()=>P.byId("saveSay").textContent;
const line=()=>P.texts(P.byId("hostLine"));
const press=n=>n._on.click({target:n,isTrusted:true});

(async()=>{
/* ---- the shipped cadence ---- */
{const src=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8");
 chk("booklet.html sends after a 2 s pause, and at most 5 s after the first change not yet sent",/let HOOK_IDLE_MS=2000,HOOK_MAX_MS=5000;/.test(src));
 chk("the host still has 20 s to answer a change, from when it is sent",/let HOOK_ANSWER_MS=20000,/.test(src));
 chk("the half-second throttle is gone",!/HOOK_EVERY_MS/.test(src));}

/* ---- the cadence's shape, scaled by a tenth (200 ms pause, 500 ms bound) ---- */
{const A=boot();A.setCadence(200,500);const H=host(A);
 ROUTES[STORE+"c.md"]=booklet("Cadence");await A.openLink("#/open/c.md");await sleep(30);
 chk("set up: the host hears the booklet at once when it opens",H.log.length===1,H.log.length);
 H.me.saved(H.last());const n0=H.log.length;
 typeIn(A,"one");await sleep(150);
 chk("a change waits for the pause: nothing is sent 150 ms after it (of 200)",H.log.length===n0,H.log.length-n0);
 await sleep(120);
 chk("and goes once typing has paused: one call, with the change",H.log.length===n0+1&&/one/.test(H.last().text),H.log.length-n0);
 H.me.saved(H.last());
 const n1=H.log.length,t0=Date.now();let keys=0;
 while(Date.now()-t0<1200){typeIn(A,"burst "+keys);keys++;await sleep(30);}
 const during=H.log.length-n1;await sleep(300);const got=H.log.slice(n1);
 chk("twelve units of typing (1.2 s here, 12 s at the real cadence) make about three calls, not one per key ("+keys+" keys)",got.length>=2&&got.length<=4&&during>=1,got.length+" calls, "+during+" during the typing");
 chk("the host is given only the latest text: the last call carries the last key",/burst /.test(got[got.length-1].text)&&got[got.length-1].text.includes("burst "+(keys-1)),got.length&&got[got.length-1].text.slice(-80));
 chk("change numbers are counted up by one per call, whatever the cadence",H.log.every((c,i)=>i===0||c.change===H.log[i-1].change+1),H.log.map(c=>c.change).join());
 const n2=H.log.length;typeIn(A,"burst "+(keys-1));await sleep(300);
 chk("a change that leaves the text as it was makes no call",H.log.length===n2);}
/* the bound, timed: a key every 40 ms for 1 s with a 300 ms pause and a 500 ms bound sends at about 0.5 s and 1 s */
{const A=boot();A.setCadence(300,500);const H=host(A);ROUTES[STORE+"b.md"]=booklet("Bound");await A.openLink("#/open/b.md");await sleep(30);H.me.saved(H.last());
 const at=[];A.BookletApi.onChange(()=>at.push(Date.now()));const t0=Date.now();
 while(Date.now()-t0<1000){typeIn(A,"k"+(Date.now()-t0));await sleep(40);}
 await sleep(400);const rel=at.map(t=>t-t0);
 chk("while typing goes on, a change goes at most the bound after the first one not yet sent (0.5 s here)",rel.length>=2&&rel[0]>=450&&rel[0]<=650&&rel[1]-rel[0]>=450&&rel[1]-rel[0]<=650,rel.join());}

/* ---- each "at once" case, at the real cadence: nothing else could have sent the change ---- */
const atOnce=async(name,act,o={})=>{const A=boot();A.setCadence(2000,5000);const H=host(A,{auto:o.auto!==false});
  ROUTES[STORE+"x.md"]=booklet("Xray");ROUTES[STORE+"y.md"]=booklet("Yankee");
  await A.openLink("#/open/x.md");await sleep(30);const n=H.log.length,word="QZX"+name.replace(/[^A-Za-z]+/g,"");
  typeIn(A,word);
  chk(name+": set up, the change waits (Saving…, nothing sent)",H.log.length===n&&state()==="saving",H.log.length-n);
  await act(A,H);await sleep(o.after||0);
  const sent=H.log.slice(n).filter(c=>c.name==="x.md"&&c.text.includes(word));
  chk(name+": the waiting change is sent at once",sent.length===1,H.log.slice(n).map(c=>c.name+":"+c.change).join());
  return {A,H,word};};
await atOnce("the page is hidden (pagehide)",A=>{A.dispatch("pagehide",{});});
await atOnce("Download",A=>A.download());
await atOnce("opening another booklet (a link)",A=>A.openLink("#/open/y.md"));
await atOnce("opening another booklet (handed over by the host)",A=>{A.BookletApi.open(booklet("Yankee"),{name:"y.md"});});
await atOnce("the way home, from an activity to the booklet's home",A=>{A.homeButton();});
await atOnce("the way home, to \"Your booklets\"",A=>{A.screen="@home";A.render();A.homeButton();});
/* (this host answers later, as one that sends over a network does: one that answered at once and kept the offered text
   would make its file the base of a merge the offered text predates; the box's host offers the file it wrote instead) */
{const {A,H,word}=await atOnce("after \"Read the newer file\" (an offer from the host's fileChanged)",(A,H)=>{
   H.me.fileChanged(booklet("Xray","A reworded question"));A.screen="@home";A.render();
   const btn=P.find(P.main(),n=>n.tagName==="button"&&/Read the newer file/.test(P.texts(n)))[0];press(btn);},{auto:false});
 chk("...and what is sent is the merged booklet, the newer file's body with the change, never the old body before the read",/A reworded question/.test(A.toMarkdown())&&A.toMarkdown().includes(word)&&/A reworded question/.test(H.last().text)&&H.log.every(c=>!(c.text.includes(word)&&!/A reworded question/.test(c.text))));}
/* the offer a link found (the kept copy and a newer file): nothing goes while it waits; "Read the newer file" sends the merged
   booklet at once */
{const A=boot();A.setCadence(2000,5000);const H=host(A);ROUTES[STORE+"o.md"]=booklet("Offer");
 await A.openLink("#/open/o.md");await sleep(30);typeIn(A,"QZXkept");await sleep(500);A.flushSave();
 P.closePages();
 const B=boot({keep:true});B.setCadence(2000,5000);const H2=host(B);ROUTES[STORE+"o.md"]=booklet("Offer","A newer question");
 await B.openLink("#/open/o.md");await sleep(30);
 const offer=()=>P.find(P.main(),P.hasClass("hostnote")).filter(n=>/changed where it is kept/.test(P.texts(n))).length;
 chk("set up: the kept copy opens with the offer to read the newer file",offer()===1&&H2.log.length===0,offer()+" "+H2.log.length);
 chk("while that offer waits, the status is Unsaved (the host is not being sent the kept work), never Saving",state()==="unsaved",state());
 typeIn(B,"QZXmore");
 chk("and typing while it waits does not make it Saving (nothing will be sent until the reader decides)",state()==="unsaved",state());
 B.dispatch("pagehide",{});
 chk("a change made while it waits is not sent, even when the page is hidden",H2.log.length===0,H2.log.length);
 B.screen="@home";B.render();
 const btn=P.find(P.main(),n=>n.tagName==="button"&&/Read the newer file/.test(P.texts(n)))[0];press(btn);
 chk("pressing Read the newer file sends the merged booklet at once, once: the reader's work and the new question",H2.log.length===1&&/QZXmore/.test(H2.last().text)&&/A newer question/.test(H2.last().text),H2.log.length);
 await sleep(2300);
 chk("and nothing more after the pause",H2.log.length===1,H2.log.length);}

/* ---- the three states, with a host ---- */
{const A=boot();const H=host(A);ROUTES[STORE+"s.md"]=booklet("States");
 await A.openLink("#/open/s.md");
 chk("a booklet just opened, its open not yet answered: Saving",state()==="saving",state());
 await sleep(30);H.me.saved(H.last());
 chk("answered saved: Saved, green's state, with the host's line",state()==="saved"&&/^Saves go to: fleet: store · Saved \d\d:\d\d$/.test(line()),state()+" "+line());
 typeIn(A,"first");
 chk("a change: Saving at once, before it is sent (the wait counts)",state()==="saving"&&H.log.length===1,state());
 H.me.saved(H.last());
 chk("a saved() for the change sent before it leaves the status at Saving (the latest is still waiting)",state()==="saving",state());
 await sleep(150);const c1=H.last();
 chk("the change is sent; still Saving until the host answers it",/first/.test(c1.text)&&state()==="saving",state());
 typeIn(A,"second");await sleep(150);const c2=H.last();
 chk("set up: a newer change sent after it",c2.change===c1.change+1&&/second/.test(c2.text));
 H.me.saved(c1);
 chk("a saved() for an older change (sent before the latest) leaves the status at Saving",state()==="saving",state());
 H.me.saved(c2.change);
 chk("a saved() for the latest change: Saved",state()==="saved",state());
 typeIn(A,"third");await sleep(150);H.me.failed("disk full",H.last());
 chk("a failed answer: Unsaved, its line saying why",state()==="unsaved"&&/Not saved: disk full$/.test(line()),state()+" "+line());
/* a failure is sticky: Unsaved until a save succeeds, the changes still going on the cadence meanwhile */
 const nf=H.log.length;typeIn(A,"fourth");
 chk("a failure is sticky: a change after it stays Unsaved, never Saving",state()==="unsaved",state());
 chk("...its line says the last failure, and that it is trying again",/ · Not saved: disk full · trying again$/.test(line()),line());
 await sleep(150);
 chk("...the change still goes on the cadence, and the status stays Unsaved while it is on its way",H.log.length===nf+1&&/fourth/.test(H.last().text)&&state()==="unsaved"&&/trying again$/.test(line()),H.log.length-nf+" "+state());
 H.me.failed("still full",H.last());
 chk("...a second failure: still Unsaved, its line saying the newer failure and no longer trying (nothing waits)",state()==="unsaved"&&/Not saved: still full$/.test(line()),line());
 {const n=H.log.length;typeIn(A,"fourth");await sleep(150);
  chk("...after a failure, a change that leaves the text as it was is still sent again (the failed text counts as not sent)",H.log.length===n+1&&/fourth/.test(H.last().text)&&state()==="unsaved",H.log.length-n);
  H.me.failed("still full",H.last());}
 typeIn(A,"fourth and a half");await sleep(150);
 chk("...typing again tries again, still Unsaved",state()==="unsaved"&&/fourth and a half/.test(H.last().text),state());
 H.me.saved(H.log[H.log.length-2]);
 chk("...a saved() for an older change does not end it",state()==="unsaved",state());
 H.me.saved(H.last());
 chk("...a saved() for the latest change: Saved",state()==="saved"&&/Saved \d\d:\d\d$/.test(line()),state()+" "+line());
 typeIn(A,"after the red");
 chk("...and the next change is Saving again, as usual",state()==="saving",state());
 await sleep(150);H.me.saved(H.last());
 A.setAnswerMs(100);typeIn(A,"fifth");await sleep(400);
 chk("no answer in time: Unsaved, the host did not answer",state()==="unsaved"&&/the host did not answer$/.test(line()),state()+" "+line());
 typeIn(A,"fifth, again");await sleep(400);
 chk("no answer again while it is red: still Unsaved, still saying the host did not answer",state()==="unsaved"&&/the host did not answer$/.test(line()),state()+" "+line());
 typeIn(A,"fifth, a third time");H.me.saved();
 chk("a saved() naming no change while a newer change waits is not about the latest change: the failure stays",state()==="unsaved",state());
 await sleep(150);
 A.setAnswerMs(20000);H.me.saved();
 chk("a later saved() for it: Saved",state()==="saved",state());
 A.download();
 chk("a download while the host's saves succeed: still Saved",state()==="saved",state());
 typeIn(A,"sixth");await sleep(150);H.me.failed("disk full",H.last());A.download();
 chk("a download after a failed save: still Unsaved (the host's answer failed), and leaving no longer warns (the work is in the file)",state()==="unsaved"&&(()=>{let w=false;A.dispatch("beforeunload",{preventDefault(){w=true;},returnValue:""});return !w;})(),state());
 H.me.leave();
 chk("the host gone: the rule for no host, Saved, as nothing changed since the download",state()==="saved"&&line()==="No changes since the file was opened or downloaded",state()+" "+line());}
/* nobody listening: a host that registered and listens to nothing covers nothing; a change made then is a failed save */
{const A=boot();const me=A.BookletApi.host({label:LABEL});ROUTES[STORE+"n.md"]=booklet("Nobody");await A.openLink("#/open/n.md");await sleep(30);
 typeIn(A,"x");
 chk("a host with nothing listening: Unsaved, never Saving",state()==="unsaved",state());
 await sleep(150);
 const log=[];A.BookletApi.onChange(c=>log.push(c));
 chk("a listener that comes back finds the change made while nobody listened still Unsaved (it was never sent)",state()==="unsaved"&&log.length===0,state());
 typeIn(A,"y");await sleep(150);
 chk("the next change sends everything, and Unsaved stays until it is saved",log.length===1&&/y/.test(log[0].text)&&state()==="unsaved",log.length+" "+state());
 me.saved(log[0]);
 chk("then saved() for it: Saved",state()==="saved",state());}

/* ---- the three states, with no host: never Saving ---- */
{P.wipe();delete global.location;const A=P.boot();A.loadText(booklet("Mine"));
 chk("no host, a booklet just read from its file: Saved, its line saying nothing changed since",state()==="saved"&&line()==="No changes since the file was opened or downloaded",state()+" "+line());
 const seen=new Set();for(let i=0;i<5;i++){typeIn(A,"word "+i);seen.add(state());await sleep(30);}
 chk("typing: Unsaved, and never Saving",seen.size===1&&seen.has("unsaved"),[...seen].join());
 chk("its line, when asked: Kept in this browser only",line()==="Kept in this browser only",line());
 A.download();
 chk("downloaded: Saved",state()==="saved",state());
 typeIn(A,"after");chk("a change after the download: Unsaved again",state()==="unsaved");
 A.closeBooklet();A.render();
 chk("on \"Your booklets\" there is no status (it is no booklet)",P.byId("saveBtn").attrs.hidden===""&&P.byId("hostLine").attrs.hidden==="",JSON.stringify(P.byId("saveBtn").attrs));
 global.location={href:"http://fleet/app/",protocol:"http:",hostname:"fleet",hash:""};}

/* ---- Saved only when it is true: random events, the rail checked after each ---- */
{let seed=13;const rnd=n=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed%n;};
 const A=boot();A.setCadence(60,150);const H=host(A);ROUTES[STORE+"r.md"]=booklet("Random");await A.openLink("#/open/r.md");await sleep(20);
 const savedText=new Map();let bad=[],steps=0,sawSaved=0;
 for(let i=0;i<160;i++){const k=rnd(9);
   if(k<3) typeIn(A,"w"+i);
   else if(k===3&&H.log.length){const c=H.log[rnd(H.log.length)];savedText.set(c.change,c.text);H.me.saved(c);}
   else if(k===4&&H.log.length){const c=H.last();savedText.set(c.change,c.text);H.me.saved(c);}
   else if(k===5&&H.log.length) H.me.failed("x",H.last());
   else if(k===6) H.me.saved();
   else if(k===7) await sleep(rnd(200));
   else A.download();
   steps++;
   if(state()==="saved"){sawSaved++;
     const okHost=A.HOST&&A.HOST.status==="saved"&&H.log.length&&A.toMarkdown()===H.last().text;
     const okFile=!A.dirty;
     if(!okHost&&!okFile) bad.push(i+":"+k);}}
 chk("over "+steps+" random events (typing, answers old and new, failures, downloads, waits), Saved showed "+sawSaved+" times, and each time the host had said saved for the text on screen or it was downloaded",bad.length===0&&sawSaved>0,bad.join(" "));}

/* ---- the live region and the line behind the status ---- */
{const A=boot();const H=host(A);ROUTES[STORE+"l.md"]=booklet("Live");await A.openLink("#/open/l.md");
 chk("opening a booklet says nothing",said()==="",said());
 await sleep(30);H.me.saved(H.last());
 chk("nor does the host's answer to the open's own send: Saved, unspoken",state()==="saved"&&said()==="",said());
 typeIn(A,"a");
 chk("Saving is not (the region is emptied, so the next Saved is new)",said()==="",said());
 await sleep(150);H.me.saved(H.last());chk("Saved again is spoken again",said()==="Saved",said());
 typeIn(A,"b");await sleep(150);H.me.failed("down",H.last());chk("becoming Unsaved is spoken",said()==="Unsaved",said());
 const b=P.byId("saveBtn"),n=P.byId("hostLine");
 chk("the status is a button that opens the line behind it: closed at first",b.attrs["aria-expanded"]==="false"&&n.attrs.hidden==="");
 press(b);
 chk("pressed, the line shows, and the button says so",b.attrs["aria-expanded"]==="true"&&!("hidden" in n.attrs)&&/Not saved: down$/.test(line()));
 chk("the line is also its title",b.attrs.title===line()&&n.attrs.title===line());
 press(b);chk("pressed again, it closes",b.attrs["aria-expanded"]==="false"&&n.attrs.hidden==="");
 chk("the button holds a shape and a word: a picture from the sprite, then the word",b.children.length===2&&b.children[0].tagName==="svg"&&P.texts(b.children[1])==="Unsaved");
 A.BookletApi.open(booklet("Other"),{name:"o2.md"});
 chk("opening another booklet empties the region and says nothing",said()==="",said());
 await sleep(30);H.me.saved(H.last());
 chk("...nor on its open's answer",state()==="saved"&&said()==="",said());
 A.download();typeIn(A,"z");await sleep(150);H.me.saved(H.last());
 chk("...until the reader acts in it",said()==="Saved",said());}

/* ---- the cold review's findings (S1 a to d, S2, S3, N2, N9): Saved never stands for a change the host was not sent ---- */
/* S1a: a change typed while a link's offer waits is not sent; a late saved() for the change sent before it is not Saved */
{let A=boot();const H=host(A,{manual:false});const U=STORE+"k.md";ROUTES[U]=booklet("Kept");
 const H0=H;await A.openLink("#/open/k.md");await sleep(30);H0.me.saved(H0.last());
 typeIn(A,"ONE");await sleep(150);const k=H0.last();
 A.closeBooklet();ROUTES[U]=booklet("Kept","A regenerated question");
 await A.openLink("#/open/k.md");await sleep(30);
 const offer=()=>P.find(P.main(),P.hasClass("hostnote")).filter(n=>/changed where it is kept/.test(P.texts(n))).length;
 typeIn(A,"ONE TWO");await sleep(150);
 chk("S1a set up: the kept copy with the offer, and a change typed under it, not sent",offer()===1&&!H0.log.some(c=>/TWO/.test(c.text)));
 H0.me.saved(k);
 chk("S1a: a late saved() for the change sent before (ONE) does not make it Saved (nor the host's own status)",state()==="unsaved"&&A.HOST.status!=="saved",state()+" "+A.HOST.status);
 chk("S1a: and leaving the page warns",(()=>{let w=false;A.dispatch("beforeunload",{preventDefault(){w=true;},returnValue:""});return w;})());}
/* S1b: a change made while nothing listens; a late saved() for the change before it; a listener back */
{const A=boot();const me=A.BookletApi.host({label:LABEL});const log=[];const stop=A.BookletApi.onChange(c=>log.push(c));
 ROUTES[STORE+"s.md"]=booklet("Sticky");await A.openLink("#/open/s.md");await sleep(30);me.saved(log[log.length-1]);
 typeIn(A,"AAA");await sleep(150);const k=log[log.length-1];
 stop();typeIn(A,"AAA BBB");await sleep(150);
 chk("S1b: a change made while nothing listens: Unsaved, and its line does not say it is trying again (nothing is) (N2)",state()==="unsaved"&&!/trying again/.test(line()),state()+" "+line());
 me.saved(k);
 chk("S1b: a late saved() for the change before it leaves it Unsaved",state()==="unsaved",state());
 const log2=[];A.BookletApi.onChange(c=>log2.push(c));
 chk("S1b: a listener back: still Unsaved, as the host never got the change",state()==="unsaved"&&![...log,...log2].some(c=>/BBB/.test(c.text)),state());
 typeIn(A,"AAA BBB CCC");await sleep(150);me.saved(log2[log2.length-1]);
 chk("S1b: the next change sends it all; its saved(): Saved",state()==="saved"&&/BBB CCC/.test(log2[log2.length-1].text),state());}
/* S1c: the last module removed: the host is never sent a booklet with no module, so it is not Saved */
{const A=boot();const H=host(A,{auto:true});ROUTES[STORE+"r.md"]=booklet("Remove");await A.openLink("#/open/r.md");await sleep(30);
 typeIn(A,"WORK");await sleep(150);
 chk("S1c set up: Saved",state()==="saved",state());
 const n=H.log.length;A.removeModule("m");await sleep(300);
 chk("S1c: removing the last module sends nothing, and the status is Unsaved, never Saved (nor the host's own status)",H.log.length===n&&state()==="unsaved"&&A.dirty&&A.HOST.status!=="saved",state()+" "+A.HOST.status);}
{const A=boot();host(A,{auto:true});ROUTES[STORE+"e.md"]=FM("Empty");await A.openLink("#/open/e.md");await sleep(150);
 chk("S1c: a booklet with no module, just opened, is its file: Saved, not Unsaved",A.allModules().length===0&&state()==="saved",state()+" "+A.allModules().length);}
/* S1d: a saved() naming no change counts only for the open booklet's latest send */
{let A=boot();const H=host(A);ROUTES[STORE+"a.md"]=booklet("Alpha");ROUTES[STORE+"b.md"]=booklet("Bravo");
 await A.openLink("#/open/b.md");await sleep(30);H.me.saved(H.last());typeIn(A,"BWORK");await sleep(150);A.flushSave();A.closeBooklet();
 ROUTES[STORE+"b.md"]=booklet("Bravo","Rewritten");
 await A.openLink("#/open/a.md");await sleep(30);typeIn(A,"AWORK");await sleep(150);
 await A.openLink("#/open/b.md");await sleep(30);
 chk("S1d set up: Bravo again, with the offer, Unsaved",state()==="unsaved",state());
 const before=A.HOST.status+"|"+line();H.me.saved();
 chk("S1d: a saved() naming no change, sent for Alpha, leaves Bravo Unsaved (and is not taken at all: Bravo's status and line unchanged)",state()==="unsaved"&&A.HOST.status+"|"+line()===before,before+" -> "+A.HOST.status+"|"+line());}
/* S2: Read the newer file with a change waiting, against a store that keeps its own body (the box's server): no second offer */
{const A=boot();A.setCadence(2000,5000);const U=STORE+"n.md";ROUTES[U]=booklet("Newer");
 const split=t=>{const i=t.indexOf("\n%%\n> [!records]");return i<0?[t,""]:[t.slice(0,i),t.slice(i+1)];};
 const merge=(disk,browser)=>{const b=split(disk)[0].replace(/\s+$/,""),r=split(browser)[1];return r?b+"\n\n"+r.replace(/\n+$/,"")+"\n":b+"\n";};
 const sameBody=(a,b)=>split(a)[0].replace(/\s+$/,"")===split(b)[0].replace(/\s+$/,"");
 const me=A.BookletApi.host({label:LABEL});const log=[];
 A.BookletApi.onChange(c=>{log.push(c);setTimeout(()=>{const disk=ROUTES[U];const m=merge(disk,c.text);ROUTES[U]=m;if(!sameBody(c.text,disk)) me.fileChanged(m);me.saved(c);},40);});
 await A.openLink("#/open/n.md");await sleep(120);
 ROUTES[U]=booklet("Newer","A reworded question");
 typeIn(A,"ONE");A.hookFlush();await sleep(200);
 const offer=()=>{A.screen="@home";A.render();return P.find(P.main(),P.hasClass("hostnote")).filter(n=>/changed where it is kept/.test(P.texts(n))).length;};
 chk("S2 set up: a save over a rewritten body brings the offer",offer()===1);
 typeIn(A,"ONE TWO");const n=log.length;
 const btn=(offer(),P.find(P.main(),x=>x.tagName==="button"&&/Read the newer file/.test(P.texts(x)))[0]);press(btn);
 chk("S2: pressed, the merged booklet goes at once, with the newer body and the change waiting",log.length===n+1&&/A reworded question/.test(log[n].text)&&/ONE TWO/.test(log[n].text),log.length-n);
 await sleep(300);
 chk("S2: and the store, keeping its own body, has no cause to offer the file again: no second offer, and Saved",offer()===0&&state()==="saved",offer()+" "+state());
 await sleep(2300);
 chk("S2: nor after the pause",offer()===0&&log.length===n+1,offer()+" "+(log.length-n));}
/* S3: Clear everything on a host's booklet: nothing is told, and the status is Unsaved, never Saved */
{const A=boot();const H=host(A,{auto:true});ROUTES[STORE+"c.md"]=booklet("Clear");await A.openLink("#/open/c.md");await sleep(30);
 typeIn(A,"SECRETWORDS");await sleep(150);
 chk("S3 set up: Saved, the store holding the words",state()==="saved"&&/SECRETWORDS/.test(ROUTES[STORE+"c.md"]));
 const n=H.log.length;A.screen="@home";A.render();press(P.byId("clearGo"));await sleep(300);
 chk("S3: after Clear everything no host is told (the store keeps its copy) and the status is Unsaved, its line no longer saying Saved",H.log.length===n&&/SECRETWORDS/.test(ROUTES[STORE+"c.md"])&&state()==="unsaved"&&!/Saved \d/.test(line()),state()+" "+line());
 const id=A.currentId;A.closeBooklet();await A.openLink("#/open/c.md");await sleep(30);
 chk("S3: the work comes back at the next open",((A.STATE.answers||{}).m||{}).q==="SECRETWORDS"&&A.currentId===id);}
/* N9: back from the page cache, a change the host never confirmed is sent again at once */
{const A=boot();A.setCadence(2000,5000);const H=host(A);ROUTES[STORE+"p.md"]=booklet("Cache");await A.openLink("#/open/p.md");await sleep(30);H.me.saved(H.last());
 typeIn(A,"QZXcached");A.dispatch("pagehide",{});const n=H.log.length;
 chk("N9 set up: the change was told as the page went, and never answered",/QZXcached/.test(H.last().text)&&state()==="saving",state());
 A.dispatch("pageshow",{persisted:false});await sleep(30);
 chk("N9: an ordinary pageshow sends nothing",H.log.length===n);
 A.dispatch("pageshow",{persisted:true});await sleep(30);
 chk("N9: back from the page cache, it is sent again at once",H.log.length===n+1&&/QZXcached/.test(H.last().text),H.log.length-n);
 H.me.saved(H.last());chk("N9: and its answer makes it Saved",state()==="saved",state());
 A.dispatch("pageshow",{persisted:true});await sleep(30);
 chk("N9: when the host has the latest, coming back sends nothing",H.log.length===n+1,H.log.length-n);}

/* ---- keeping in the browser: unchanged and immediate ---- */
{const A=boot();A.setCadence(2000,5000);const H=host(A);ROUTES[STORE+"k.md"]=booklet("Kept");await A.openLink("#/open/k.md");await sleep(30);
 const id=A.currentId,n=H.log.length;typeIn(A,"QZXkeptnow");await sleep(500);
 const raw=global.__ls["booklet.b."+id]||"";
 chk("500 ms after a change the browser keeps it (its 400 ms write), while the host has not yet been sent it",/QZXkeptnow/.test(raw)&&H.log.length===n,raw.length+" "+(H.log.length-n));}

/* ---- nothing is lost by waiting: a change the host never answered reaches it at the next open ---- */
for(const how of ["the page closes in the wait (pagehide: the change is told, the host never answers)","the page dies in the wait (no pagehide, nothing told)"]){
 const crash=/dies/.test(how);
 const A=boot();A.setCadence(2000,5000);const H=host(A);ROUTES[STORE+"w.md"]=booklet("Wait");await A.openLink("#/open/w.md");await sleep(30);
 typeIn(A,"QZXunanswered");await sleep(crash?500:50);
 const before=H.log.length;
 const B=crash?boot({crash:true}):boot({keep:true});
 if(crash) chk(how+": set up, nothing was sent before the page died",H.log.filter(c=>/QZXunanswered/.test(c.text)).length===0);
 const H2=host(B,{auto:true});await B.openLink("#/open/w.md");await sleep(60);
 chk(how+": at the next open the kept copy opens with the change",((B.STATE.answers||{}).m||{}).q==="QZXunanswered",JSON.stringify((B.STATE.answers||{}).m));
 chk(how+": and the host is sent it at once, and saves it",H2.log.length>=1&&/QZXunanswered/.test(H2.log[0].text)&&/QZXunanswered/.test(ROUTES[STORE+"w.md"]),H2.log.length+" "+before);
 chk(how+": then Saved",state()==="saved",state());
 if(crash) P.closePages();}

console.log(fails?"\n"+fails+" FAILURES":"\nautosave checks passed");
process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
