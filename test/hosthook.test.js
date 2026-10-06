// Renderer 0.11.2 (0.11.4: on a private address, with the reader's yes already given): window.Booklet, the interface a page's own host uses to save a reader's work without the renderer ever
// holding code that sends anything. This file checks the object (exactly these members, frozen), what onChange reports and
// when, what a host may say (shown as text, capped), the offer to read a newer file, open() and text(), the two top-bar
// lines, and that nothing inside a booklet can reach any of it. The network is not touched: no fetch exists in these tests.
// Run: node test/hosthook.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const FM=t=>`---\nbooklet: "0.11"\ntitle: ${t}\nlang: en\n---\n\n`;
const mod=(id,t)=>`> [!module|${id}] Module ${t}\n\n> [!activity|act] Answer ${t}\n\n> [!text|note] Note ${t}\n\n> [!activity|log repeat] Log ${t}\n\n> [!text|what] What ${t}\n\n> [!module|${id} end] End\n`;
const NAME="reports/week.booklet.md";
const BOOK=FM("Hook booklet")+mod("ma","A");
const MODB=FM("Second")+mod("mb","B");
const tag=t=>P.find(P.main(),x=>x.tagName===t);
const typeIn=(A,addr,words)=>{A.screen=addr;A.render();const ta=tag("textarea")[0];ta.value=words;ta._on.input();};
const barText=()=>P.texts(P.byId("hostLine"));
const click=n=>n._on.click({target:n});
const shown=()=>P.texts(P.main());
/* the page is served at a private name (the host hook works only on the reader's own machine or network) and the reader has
   already said yes to the label given, as on a later visit (see test/hostlock.test.js for the ask itself) */
const boot=label=>{P.wipe();P.place("http:","fleet");if(label!==undefined) global.__ls["booklet.host.allowed"]=label;return P.boot();};
const listen=A=>{const calls=[];const stop=A.BookletApi.onChange(x=>calls.push(x));return {calls,stop};};

(async()=>{
/* ---- the object ---- */
{const A=boot("fleet: booklets/reports"),B=A.BookletApi;
 chk("window.Booklet has exactly these members: version, host, onChange, open, text",Object.keys(B).sort().join()==="host,onChange,open,text,version",Object.keys(B).join());
 chk("it is frozen",Object.isFrozen(B));
 chk("version is the renderer's version, as text",B.version==="0.11.7"&&typeof B.version==="string");
 chk("a member cannot be reassigned",(()=>{try{B.text=()=>"x";}catch(e){}return B.text()==="";})());
 chk("with no host, the bar says so: Kept in this browser only",barText()==="Kept in this browser only",barText());
 chk("text() is empty when no booklet is open",B.text()==="");
 const h=B.host({label:"fleet: booklets/reports"});
 chk("a handle has exactly saved, failed, fileChanged, leave, state and is frozen",Object.keys(h).sort().join()==="failed,fileChanged,leave,saved,state"&&Object.isFrozen(h)&&h.state()==="active");
 chk("with a host, the bar says where saves go",/^Saves go to: fleet: booklets\/reports$/.test(barText()),barText());
 h.leave();chk("leave() restores the no-host line",barText()==="Kept in this browser only"&&A.HOST===null);}

/* ---- open() and text() ---- */
{const A=boot("h"),B=A.BookletApi;B.host({label:"h"});
 const bad=B.open("not a booklet at all");
 chk("open() of a refused text returns ok:false with problems, and opens nothing",bad.ok===false&&bad.problems.length>0&&A.currentId===null,JSON.stringify(bad));
 const r=B.open(BOOK);
 chk("open() of a good booklet opens it (through the file path) and returns ok:true",r.ok===true&&Array.isArray(r.problems)&&A.currentId&&A.allModules().map(m=>m.id).join()==="ma",JSON.stringify(r));
 chk("open() with no name hands over a booklet that is the reader's alone: text() is empty",B.text()==="");
 B.open(BOOK,{name:NAME});
 chk("with a name it is the host's: text() is the file text now, the same as toMarkdown()",B.text()===A.toMarkdown()&&/title: Hook booklet/.test(B.text()));
 const r2=B.open(MODB,{name:"reports/week.booklet.md"});
 chk("open() with a good name opens it as a view of that name",r2.ok&&A.PROVENANCE&&A.PROVENANCE.label==="reports/week.booklet.md"&&A.allModules().map(m=>m.id).join()==="mb");
 for(const n of ["../x.md","https://evil.test/x.md","a/.md","x.txt"]){
   const r3=B.open(BOOK,{name:n});chk("open() refuses the name "+JSON.stringify(n)+" and opens nothing new",r3.ok===false&&A.allModules().map(m=>m.id).join()==="mb");}
 const bad2=B.open("---\nbooklet: \"0.11\"\ntitle: X\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] A\n\n> [!text|q] B\n\n> [!module|m end] E\n");
 chk("a refused file keeps the booklet that was on screen",bad2.ok===false&&A.allModules().map(m=>m.id).join()==="mb",JSON.stringify(bad2));}

/* ---- onChange: when, with what, collapsed, stopped ---- */
{const A=boot("h"),B=A.BookletApi;B.host({label:"h"});const L=listen(A);
 B.open(BOOK,{name:NAME});await sleep(700);
 chk("onChange fires once when a booklet is opened, with its text, its name and its title",L.calls.length===1&&L.calls[0].text===A.toMarkdown()&&L.calls[0].name===NAME&&L.calls[0].title==="Hook booklet",JSON.stringify(L.calls.map(c=>[c.name,c.title,c.text.length])));
 chk("what it is given is exactly three things: text, name, title",Object.keys(L.calls[0]).sort().join()==="name,text,title");
 const n0=L.calls.length;
 typeIn(A,"ma/act","first answer");await sleep(700);
 chk("an answer leads to one call, with the answer in the text, equal to toMarkdown()",L.calls.length===n0+1&&/first answer/.test(L.calls[n0].text)&&L.calls[n0].text===A.toMarkdown(),L.calls.length-n0);
 const n1=L.calls.length;
 A.draftFor("ma/log").what="seen";A.finalizeEntry("ma/log");await sleep(700);
 chk("a kept entry leads to a call whose text holds the entry",L.calls.length===n1+1&&/"what":\s*"seen"/.test(L.calls[n1].text),L.calls.length-n1);
 const n2=L.calls.length;
 A.renameBooklet("Renamed booklet");await sleep(700);
 chk("a rename leads to a call with the new title",L.calls.length===n2+1&&L.calls[n2].title==="Renamed booklet"&&/title: "Renamed booklet"/.test(L.calls[n2].text));
 const n3=L.calls.length;
 const ad=A.addModuleText(MODB);await sleep(700);
 chk("adding a module leads to a call listing it",ad.ok&&L.calls.length===n3+1&&/\[!module\|mb\]/.test(L.calls[n3].text),JSON.stringify(ad));
 const n4=L.calls.length;
 A.removeModule("mb");await sleep(700);
 chk("removing a module leads to a call without it",L.calls.length===n4+1&&!/\[!module\|mb\]/.test(L.calls[n4].text),L.calls.length-n4);
 /* collapsed: many quick changes, few calls, and the last one carries the last text */
 const n5=L.calls.length;
 for(let i=0;i<20;i++){typeIn(A,"ma/act","burst "+i);await sleep(20);}
 await sleep(900);
 const got=L.calls.length-n5;
 chk("twenty quick changes make at most a few calls (collapsed to about one per half second)",got>=1&&got<=3,got);
 chk("and the last call carries the last change",/burst 19/.test(L.calls[L.calls.length-1].text));
 const n6=L.calls.length;
 typeIn(A,"ma/act","burst 19");await sleep(700);
 chk("a change that leaves the text as it was makes no call",L.calls.length===n6);
 L.stop();typeIn(A,"ma/act","after stop");await sleep(700);
 chk("the stop function stops the calls",L.calls.length===n6&&A.HOOK_LISTENERS.length===0);
}

/* the name of a booklet opened from a store */
{const A=boot("h"),B=A.BookletApi;B.host({label:"h"});const L=listen(A);
 B.open(BOOK,{name:"reports/week.booklet.md"});await sleep(700);
 chk("a booklet opened with a store name reports that name",L.calls.length>=1&&L.calls[0].name==="reports/week.booklet.md",JSON.stringify(L.calls.map(c=>c.name)));}

/* ---- a throwing listener ---- */
{const A=boot("x"),B=A.BookletApi;B.host({label:"x"});
 B.onChange(()=>{throw new Error("disk <b>full</b>");});
 B.open(BOOK,{name:NAME});await sleep(700);
 chk("a throwing listener is caught and shown in the bar as a failed save",/Not saved: disk <b>full<\/b>/.test(barText())&&A.HOST.status==="failed",barText());
 chk("and the page still works",A.currentId&&B.text().length>0);
 typeIn(A,"ma/act","still typing");chk("typing still works",/still typing/.test(B.text()));}

/* ---- what a host says is text, and capped ---- */
{const LAB=("<img src=x onerror=alert(1)> "+"L".repeat(200)).slice(0,80),A=boot(LAB),B=A.BookletApi;
 const h=B.host({label:"<img src=x onerror=alert(1)> "+"L".repeat(200)});
 const t=barText();
 chk("a label is shown as text (markup stays as characters) and capped at 80 characters",t.startsWith("Saves go to: <img src=x onerror=alert(1)> ")&&t.length<="Saves go to: ".length+80,t.length);
 chk("it is set as text, never as markup",P.byId("hostLine")._html===""&&P.byId("hostLine").children.length===0);
 B.open(BOOK,{name:NAME});
 h.failed("<script>boom</script>"+"m".repeat(400));
 const f=barText();
 chk("a failure message is shown as text and capped at 200",/Not saved: <script>boom<\/script>/.test(f)&&f.length<=("Saves go to: ".length+80+" · Not saved: ".length+200),f.length);
 chk("the bar marks a failure",P.byId("hostLine").attrs.class.includes("bad"));
 h.failed();chk("a failure with no message still says Not saved",/ · Not saved$/.test(barText()),barText());
 h.saved();chk("saved() shows Saved with the time",/ · Saved \d\d:\d\d$/.test(barText()),barText());
 chk("and the failed marking goes",!P.byId("hostLine").attrs.class.includes("bad"));
 global.__ls["booklet.host.allowed"]="second";             // the reader had allowed this one
 const B2=B.host({label:"second"});
 chk("a second host replaces the first: the first's handle no longer does anything",/^Saves go to: second/.test(barText())&&(h.saved(),/^Saves go to: second(?! · Saved)/.test(barText())));
 B2.leave();h.leave();}

/* ---- the not-downloaded note rests while a host keeps saves, and returns on a failure ---- */
{const A=boot("box"),B=A.BookletApi;B.open(BOOK,{name:NAME});
 typeIn(A,"ma/act","x");
 chk("with no host the not-downloaded note shows for a change",!!A.unsavedNote());
 const h=B.host({label:"box"});B.onChange(()=>{});h.saved();
 chk("with a host whose saves succeed, it does not",A.unsavedNote()===null);
 h.failed("disk full");
 chk("after a failure the note is back",!!A.unsavedNote());
 h.saved();chk("and it rests again once a save succeeds",A.unsavedNote()===null);
 chk("Saving… shows between a change and the host's saved()",(()=>{typeIn(A,"ma/act","y");return /Saving…$/.test(barText());})(),barText());
 await sleep(700);h.leave();chk("with the host gone, the note is back",!!A.unsavedNote());}

/* ---- fileChanged: an offer, and nothing changes until the reader presses ---- */
{const A=boot("box"),B=A.BookletApi;B.open(BOOK,{name:NAME});typeIn(A,"ma/act","mine");
 const h=B.host({label:"box"});
 const NEWER=FM("Hook booklet")+mod("ma","A")+"\n%%\n> [!records] App record — do not edit below this line\n\n> [!records|ma] Module A\n\n```booklet answers\n{\"note\": \"from the file\"}\n```\n\n%%\n";
 const before=B.text();
 h.fileChanged(NEWER);
 chk("fileChanged shows an offer to read the newer file, and changes nothing",/The file has changed where it is kept/.test(shown())&&B.text()===before);
 const btn=P.find(P.main(),n=>n.tagName==="button"&&/Read the newer file/.test(P.texts(n)))[0];
 chk("the offer has a button",!!btn);
 click(btn);
 chk("on a press the newer file is on screen (its answer is the reader's now)",/from the file/.test(B.text())&&!/mine/.test(B.text()),B.text().slice(-200));
 chk("and the offer is gone",!/The file has changed where it is kept/.test(shown()));
 /* a refused text */
 const keep=B.text();
 h.fileChanged("---\nbooklet: \"0.11\"\ntitle: X\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] A\n\n> [!text|q] B\n\n> [!module|m end] E\n");
 const btn2=P.find(P.main(),n=>n.tagName==="button"&&/Read the newer file/.test(P.texts(n)))[0];click(btn2);
 chk("a refused newer file shows its problems and keeps the booklet on screen",B.text()===keep&&/cannot be opened|used twice/.test(P.texts(P.byId("toast"))),P.texts(P.byId("toast")));
 h.fileChanged(NEWER);const dis=P.find(P.main(),n=>n.tagName==="button"&&/Dismiss/.test(P.texts(n)))[0];click(dis);
 chk("an offer can be dismissed",!/The file has changed/.test(shown())&&A.HOST.pending===null);
 h.leave();}

/* ---- the host sees only the booklets it gave (0.11.3) ---- */
{const A=boot("box: store"),B=A.BookletApi;A.setAnswerMs(300);
 const h=B.host({label:"box: store"}),L=listen(A);let saved=0;
 A.loadText(MODB);                                      // the reader opens a file from their own disk
 typeIn(A,"mb/act","private note");await sleep(900);
 chk("a booklet opened from a file: the listener is never called",L.calls.length===0,JSON.stringify(L.calls.map(c=>c.name)));
 chk("...the bar says Kept in this browser only, with a host registered",barText()==="Kept in this browser only",barText());
 chk("...text() returns an empty string",B.text()==="");
 h.fileChanged(MODB+"\nx");chk("...fileChanged does nothing: no offer and nothing pending",A.HOST.pending===null&&!/The file has changed/.test(shown()));
 await sleep(500);
 chk("...no failure after the answer wait",A.HOST.status!=="failed"&&barText()==="Kept in this browser only",barText());
 chk("...the not-downloaded note is shown, as on a page with no host",!!A.unsavedNote()&&P.byId("hostLine").attrs.class.indexOf("bad")<0);
 // pasted, new, a module link and open() with no name are the reader's too
 A.createBooklet();A.addModuleText(BOOK);await sleep(700);
 chk("a booklet started here is the reader's alone: no call",L.calls.length===0&&B.text()==="");
 B.open(BOOK);await sleep(700);
 chk("open() without a name is the reader's alone: no call",L.calls.length===0&&barText()==="Kept in this browser only");
 // a host's booklet next to them behaves as before
 B.open(BOOK,{name:NAME});await sleep(700);
 chk("a booklet handed over with a name is the host's: one call, with its name",L.calls.length===1&&L.calls[0].name===NAME&&/^Saves go to: box: store/.test(barText()),barText()+" "+L.calls.length);
 h.saved();
 chk("...saved() is shown, and the note rests",/Saved \d\d:\d\d$/.test(barText())&&A.unsavedNote()===null,barText());
 // it stays the host's when opened again from the list (its entry's `from` says store:<name>)
 typeIn(A,"ma/act","kept");await sleep(700);A.flushSave();
 const id=A.currentId;A.closeBooklet();A.openFromList(id);
 chk("opened again from \"Your booklets\", it is still the host's",B.text().length>0&&/^Saves go to:/.test(barText()),barText());
 A.openBooklet(A.currentId);A.loadText(MODB);
 chk("and a file opened after it is not",B.text()===""&&barText()==="Kept in this browser only",barText());
 L.stop();h.leave();}

/* ---- French and Spanish ---- */
{const A=boot();
 for(const l of ["fr","es","es-AR"]){const u=A.STRINGS[l].ui;
  chk(l+" has every host string",["hostKept","hostSaving","hostChanged","hostRead","hostAsk","hostAskStay","hostAllow","hostNotNow","hostMay","hostStop"].every(k=>typeof u[k]==="string"&&u[k].length>3)&&typeof u.hostSavesTo("x")==="string"&&typeof u.hostSaved("10:42")==="string"&&u.hostFailed("m").includes("m")&&u.hostFailed("").length>3);}}

/* ---- a booklet cannot reach the hook ---- */
{const A=boot(),B=A.BookletApi;
 const HOSTILE=FM("Hostile")+`> [!module|m] M\n\n> [!activity|a] A\n\n[click](javascript:window.Booklet.host({label:"pwned"}))\n\n<div onclick="window.Booklet.host({label:'pwned'})" onmouseover="Booklet.open('x')">raw html <script>window.Booklet.host({label:"pwned2"})</script></div>\n\n<svg onload="window.Booklet.host({label:'p3'})"><script>window.Booklet.onChange(function(){})</script><circle r="3" onclick="Booklet.text()"/></svg>\n\n> [!text|q] A question named window.Booklet.host\n\n`+"```booklet widget\n{\"engine\":\"grid-select\",\"title\":\"window.Booklet.host({label:'w'})\",\"note\":\"Booklet.onChange(x)\"}\n```\n^wd\n\n```booklet query\nfrom: a\nwindow.Booklet.host: x\n__proto__: y\nconstructor: z\n```\n\n"+`> [!module|m end] E\n`;
 const calls0=A.HOOK_LISTENERS.length;
 const L=listen(A);
 const r=B.open(HOSTILE);
 const screens=[A.screen];
 for(const s of [A.screen,"m/a","home"]){try{A.screen=s;A.render();}catch(e){}}
 const html=JSON.stringify(P.main(),(k,v)=>typeof v==="function"?"fn":v);
 chk("a hostile booklet opens or is refused, and either way registers no host",A.HOST===null,JSON.stringify(r).slice(0,100));
 chk("no listener was added by it (only the test's own)",A.HOOK_LISTENERS.length===calls0+1);
 chk("nothing it holds became a live attribute on the page (no on* attribute, no javascript: address)",!/"on(click|load|mouseover|error)"/i.test(html)&&!/javascript:/i.test(html),html.slice(0,200));
 chk("no script element exists on the page",P.find(P.main(),n=>n.tagName==="script").length===0);
 await sleep(700);
 chk("a booklet opened without a name is the reader's alone: onChange got no call at all",L.calls.length===0,L.calls.length);
 chk("the bar still says no host",barText()==="Kept in this browser only");}

/* ---- a host that never answers, and a host with nobody listening ---- */
{const A=boot("box"),B=A.BookletApi;A.setAnswerMs(300);
 B.open(BOOK,{name:NAME});const h=B.host({label:"box"});
 chk("a host with nothing listening through onChange does not rest the note or the mark",(typeIn(A,"ma/act","a"),!!A.unsavedNote()));
 const L=listen(A);h.saved();
 chk("once something listens, a succeeding host rests the note",A.unsavedNote()===null);
 typeIn(A,"ma/act","b");await sleep(250);
 chk("after a change the bar says Saving… and the note rests while the host has time",/Saving…$/.test(barText())&&A.unsavedNote()===null,barText());
 await sleep(700);
 chk("a host that has not answered within the time is treated as a failed save: Not saved: the host did not answer",/ · Not saved: the host did not answer$/.test(barText())&&A.HOST.status==="failed",barText());
 chk("and the note comes back",!!A.unsavedNote());
 h.saved();chk("a later saved() clears it",/ · Saved \d\d:\d\d$/.test(barText())&&A.unsavedNote()===null,barText());
 typeIn(A,"ma/act","c");await sleep(250);h.saved();await sleep(500);
 chk("an answer in time cancels the wait",/Saved/.test(barText()),barText());
 L.stop();
 chk("with the listener gone the note is back",!!A.unsavedNote());
 for(const l of ["fr","es","es-AR"]) chk(l+" has the no-answer string",A.STRINGS[l].ui.hostNoAnswer.length>3);}

console.log(fails?"\n"+fails+" FAILURES":"\nhosthook checks passed");
process.exit(fails?1:0);
})();
