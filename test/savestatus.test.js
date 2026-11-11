// The save status in the bar of a booklet (renderer 0.13.1, v0.13 item 13; two states since 0.20.1). One status, Saved or
// Unsaved, read from the reader's own downloads: the page keeps the reader's work in the browser and sends it nowhere, so
// nothing but a download (or reading a file) makes it Saved. This file checks, in the recording DOM:
//   - a booklet just read from its file is Saved, with the line behind the status saying nothing changed since; typing makes
//     it Unsaved and it is never Saving; the line says "Kept in this browser only"; a download makes it Saved; a change after
//     that, Unsaved again; "Your booklets" has no status;
//   - the live region (Saved and Unsaved spoken once the reader has acted, an opened booklet starts quiet);
//   - the status is a button that opens the line behind it, which is also its title; it holds a shape and a word;
//   - leaving the page warns exactly while a change is not in a downloaded file;
//   - the kept copy in the browser is written 400 ms after a change.
// Run: node test/savestatus.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* a stand-in for the object URL a download makes */
global.URL=Object.assign(require("url").URL,{createObjectURL:()=>"blob:x",revokeObjectURL(){}});
const FM=t=>`---\nbooklet: "0.20"\ntitle: ${t}\nlang: en\n---\n\n`;
const booklet=(title,q)=>FM(title)+`> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] ${q||"A question"}\n\n> [!module|m end] End\n`;
const typeIn=(A,words,addr)=>{A.screen=addr||"m/a";A.render();const ta=P.find(P.main(),x=>x.tagName==="textarea")[0];ta.value=words;ta._on.input();};
const state=()=>P.byId("saveBtn").attrs["data-state"];
const said=()=>P.byId("saveSay").textContent;
const line=()=>P.texts(P.byId("saveLine"));
const warns=A=>{let w=false;A.dispatch("beforeunload",{preventDefault(){w=true;},returnValue:""});return w;};

(async()=>{
/* ---- the two states ---- */
{P.wipe();const A=P.boot();A.loadText(booklet("Mine"));
 chk("a booklet just read from its file: Saved, its line saying nothing changed since",state()==="saved"&&line()==="No changes since the file was opened or downloaded",state()+" "+line());
 chk("leaving does not warn",!warns(A));
 const seen=new Set();for(let i=0;i<5;i++){typeIn(A,"word "+i);seen.add(state());await sleep(30);}
 chk("typing: Unsaved, and never Saving",seen.size===1&&seen.has("unsaved"),[...seen].join());
 chk("its line, when asked: Kept in this browser only",line()==="Kept in this browser only",line());
 chk("leaving warns",warns(A));
 A.download();
 chk("downloaded: Saved, and leaving does not warn",state()==="saved"&&!warns(A),state());
 typeIn(A,"after");chk("a change after the download: Unsaved again",state()==="unsaved"&&warns(A));
 A.closeBooklet();A.render();
 chk("on \"Your booklets\" there is no status (it is no booklet)",P.byId("saveBtn").attrs.hidden===""&&P.byId("saveLine").attrs.hidden==="",JSON.stringify(P.byId("saveBtn").attrs));}

/* ---- the live region and the line behind the status ---- */
{P.wipe();const A=P.boot();A.loadText(booklet("Live"));
 chk("opening a booklet says nothing",said()==="",said());
 typeIn(A,"first");
 chk("the first change speaks: Unsaved",said()==="Unsaved",said());
 const b=P.byId("saveBtn"),n=P.byId("saveLine");
 chk("the status is a button that opens the line behind it: closed at first",b.attrs["aria-expanded"]==="false"&&n.attrs.hidden==="");
 b._on.click({target:b});
 chk("pressed, the line shows, and the button says so",b.attrs["aria-expanded"]==="true"&&!("hidden" in n.attrs)&&line()==="Kept in this browser only",line());
 chk("the line is also its title",b.attrs.title===line()&&n.attrs.title===line());
 chk("the button holds a shape and a word: a picture from the sprite, then the word",b.children.length===2&&b.children[0].tagName==="svg"&&P.texts(b.children[1])==="Unsaved");
 A.download();
 chk("a download speaks: Saved",said()==="Saved",said());
 A.loadText(booklet("Another"));
 chk("opening another booklet empties the region and says nothing",said()==="",said());
 typeIn(A,"again");
 chk("...until the reader acts in it",said()==="Unsaved",said());}

/* ---- the kept copy in the browser is written 400 ms after a change ---- */
{P.wipe();const A=P.boot();A.loadText(booklet("Kept"));
 const key="booklet.b."+A.currentId;
 typeIn(A,"keepme");
 chk("nothing is written the instant of the change",!/keepme/.test(A.lsGet(key)||""));
 await sleep(700);
 chk("the kept copy holds the answer 400 ms after it",/keepme/.test(A.lsGet(key)||""));}

P.wipe();
console.log(fails?"\n"+fails+" FAILURES":"\nall save-status checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
