// A body that ends inside a code fence that never closes is not written to (0.16, SPEC section 8).
//
// A records region written after such a body would be read as part of that fence, and its records would not be read
// back: the reader's answers would be gone at the next open. So every write that would put records after it is refused
// (a download, the host's onChange, Booklet.text()), with the reason in the reader's language. Nothing is written,
// nothing the reader did is cleared, and the fence is never closed for the author, which would change the body's bytes.
// A write with nothing to put after the body is the file as it was, and is made. A file whose fences all close is
// written exactly as before. The Obsidian plugin refuses the same way (booklet-obsidian, src/core/write.ts).
//
// Run: node test/unclosedfence.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const show=s=>JSON.stringify(String(s).slice(-200));
const FM='---\nbooklet: "0.16"\ntitle: Garden notes\nlang: en\n---\n';
const ACT="\n> [!activity|a1] This week in the garden\n\n> [!text|q1] What grew this week?\n\n> [!text|q2] What needs water?\n\n";
/* the body ends inside a fence that never closes: everything after its opening line is that fence's code */
const OPEN=FM+ACT+"A reminder for the shed:\n\n```text\nwater the beans at dawn\n";
const HEAD="> [!records] App record — do not edit below this line";
/* every Blob the page makes is a download: what it holds is recorded */
const BLOBS=[];global.Blob=class{constructor(parts){BLOBS.push(parts.map(String).join(""));}};
const toastText=()=>P.byId("toast").textContent;
const load=text=>{P.wipe();const A=P.boot();A.loadText(text);return A;};
const say=(A,l)=>A.STRINGS[l].ui.fenceOpen;

(async()=>{
/* ---- why: records written after such a body are read as that fence's code, and lost ---- */
{const A=load(OPEN);A.answersIn("").q1="runner beans";const t=A.toMarkdown(),R=A.parseFile(t);
 chk("(why) the region a writer adds after such a body is read back as part of the fence, and the answer is lost",
   t.startsWith(OPEN)&&t.includes(HEAD)&&!(R.S.answers[""]||{}).q1,show(t));}

/* ---- a download: refused, said, nothing written, nothing cleared ---- */
{const A=load(OPEN);A.answersIn("").q1="runner beans";A.markDirty();BLOBS.length=0;
 await A.download();
 chk("a download is refused: no file is made",BLOBS.length===0,BLOBS.map(show).join());
 chk("and the reader is told why, in the plugin's words",typeof say(A,"en")==="string"&&toastText()===say(A,"en")&&
   /ends inside a code fence that is never closed/.test(toastText())&&/Close the fence in Markdown first/.test(toastText()),toastText());
 chk("the work is not marked as downloaded, and the answer stays",A.dirty===true&&A.STATE.answers[""].q1==="runner beans");
 A.flushSave();const id=A.currentId;P.closePages();const B=P.boot();B.openBooklet(id);
 chk("the browser's copy still holds the answer after a reload",B.peekAnswers("").q1==="runner beans"&&B.dirty===true,JSON.stringify(B.peekAnswers("")));
 BLOBS.length=0;await B.download();
 chk("and a download after the reload is refused too",BLOBS.length===0&&toastText()===say(B,"en"));
 for(const l of ["fr","es"]){B.lang=l;BLOBS.length=0;await B.download();
   chk("in "+l+", the reason is in "+l,BLOBS.length===0&&toastText()===say(B,l)&&say(B,l)!==say(B,"en"),toastText());}
 B.lang="en";}

/* ---- with nothing to write after the body, the file is written as it was ---- */
{const A=load(OPEN);BLOBS.length=0;await A.download();
 chk("with no answer, a download is the file byte for byte (nothing after its body)",BLOBS.length===1&&BLOBS[0]===OPEN,BLOBS.map(show).join());
 A.answersIn("").q2="the squash";A.markDirty();A.answersIn("").q2="";A.markDirty();BLOBS.length=0;await A.download();
 chk("an answer given and taken back: the file as it was",BLOBS.length===1&&BLOBS[0]===OPEN,BLOBS.map(show).join());}

/* ---- a fence that never closes in design written after the records: the region would go into it ---- */
{const REC="%%\n"+HEAD+"\n\n```booklet answers\n{\"q1\": \"peas\"}\n```\n\n%%\n";
 const MOVED=FM+ACT+REC+"\n> [!text|q3] Anything else?\n\n```text\nmulch the beds\n";
 const A=load(MOVED);BLOBS.length=0;await A.download();
 chk("design after the records that ends inside such a fence: a download is refused, even with nothing changed",BLOBS.length===0&&toastText()===say(A,"en")&&A.peekAnswers("").q1==="peas",BLOBS.map(show).join());}

/* ---- Add a module on a booklet whose body ends inside such a fence (0.16.1): refused, said, nothing changed ----
   The module would be added at the end of the body, inside the fence, and never read as a module. */
{const MODFILE='---\nbooklet: "0.16"\ntitle: Seed swap\nlang: en\n---\n\n> [!module|seeds] Seed swap\n\n> [!activity|s1] What to swap\n\n> [!text|which] Which seeds?\n\n> [!module|seeds end]\n';
 const FENCE=MODFILE.slice(MODFILE.indexOf("> [!module|"));
 chk("(why) a module written after such a body is read as that fence's code, never as a module",
   !load(OPEN).parseFile(OPEN+"\n"+FENCE).template.modules.some(m=>m.id==="seeds"));
 const A=load(OPEN);A.answersIn("").q1="runner beans";A.markDirty();
 const book=A.BOOK,source=A.BOOK.raw.source,text=A.toMarkdown(),r=A.addModuleText(MODFILE),p=r.problems&&r.problems[0];
 chk("Add a module is refused",r.ok===false&&r.problems.length===1&&p.code==="addFenceOpen",JSON.stringify(r));
 chk("and the reader is told why, and what to do",/ends inside a code fence that is never closed/.test(A.problemText(p))&&/Close the fence in Markdown first/.test(A.problemText(p)),A.problemText(p));
 for(const l of ["fr","es"]){A.lang=l;const w=A.problemText(p);A.lang="en";
   chk("in "+l+", in "+l,w===A.STRINGS[l].problem.addFenceOpen&&w!==A.STRINGS.en.problem.addFenceOpen,w);}
 chk("and nothing is changed: the design, the reader's work, the text the writer would write",
   A.BOOK===book&&A.BOOK.raw.source===source&&A.toMarkdown()===text&&A.peekAnswers("").q1==="runner beans"&&!A.BOOK.modules.some(m=>m.id==="seeds"));
 const REC="%%\n"+HEAD+"\n\n```booklet answers\n{\"q1\": \"peas\"}\n```\n\n%%\n";
 const B=load(FM+ACT+REC+"\n> [!text|q3] Anything else?\n\n```text\nmulch the beds\n"),src=B.BOOK.raw.source,r2=B.addModuleText(MODFILE);
 chk("and so is it where the design after the records ends inside such a fence",r2.ok===false&&r2.problems[0].code==="addFenceOpen"&&B.BOOK.raw.source===src,JSON.stringify(r2));
 const CLOSED=FM+ACT+"A reminder for the shed:\n\n```text\nwater the beans at dawn\n```\n",C=load(CLOSED),r3=C.addModuleText(MODFILE);
 chk("with the fence closed, the module is added as before: after the body, and read as a module",
   r3.ok===true&&(r3.added||[]).join()==="seeds"&&C.BOOK.raw.source===CLOSED+"\n"+FENCE&&C.BOOK.modules.some(m=>m.id==="seeds"),show(C.BOOK.raw.source)+" "+JSON.stringify(r3));}

/* ---- the host's write-back and Booklet.text() ---- */
{P.wipe();P.place("http:","fleet");global.__ls["booklet.host.allowed"]="fleet: garden";const A=P.boot(),B=A.BookletApi;
 const calls=[],h=B.host({label:"fleet: garden"}),line=()=>A.hostLineText(A.STRINGS.en.ui);B.onChange(x=>{calls.push(x);});
 B.open(OPEN,{name:"garden/week.booklet.md"});await sleep(700);
 chk("opened with nothing changed, the host is sent the file as it is",calls.length===1&&calls[0].text===OPEN,calls.map(c=>show(c.text)).join());
 const n=calls.length;A.screen="a1";A.render();const ta=P.find(P.main(),x=>x.tagName==="textarea")[0];ta.value="runner beans";ta._on.input();
 await sleep(700);
 chk("an answer is not sent to the host",calls.length===n,calls.slice(n).map(c=>show(c.text)).join());
 chk("the save status says Unsaved, and the line behind it says why",P.byId("saveBtn").attrs["data-state"]==="unsaved"&&
   A.hostLineText(A.STRINGS.en.ui).includes(say(A,"en"))&&/^Saves go to: fleet: garden · Not saved/.test(A.hostLineText(A.STRINGS.en.ui)),A.hostLineText(A.STRINGS.en.ui));
 /* a late answer about the change sent before the refusal (the open's): the refusal still holds, and its reason stays */
 h.failed("the disk is full",calls[0]);
 chk("a late failed() for the change sent before the refusal leaves the fence's reason in the line",
   P.byId("saveBtn").attrs["data-state"]==="unsaved"&&line().includes(say(A,"en"))&&!/disk is full/.test(line()),line());
 h.failed("the disk is full");
 chk("and so does a failed() that names no change",line().includes(say(A,"en"))&&!/disk is full/.test(line()),line());
 chk("Booklet.text() gives the host nothing to write",B.text()==="",show(B.text()));
 chk("and the answer stays in the page",A.peekAnswers("").q1==="runner beans");
 A.lang="fr";chk("the line says why in the reader's language",A.hostLineText(A.STRINGS.fr.ui).includes(say(A,"fr")),A.hostLineText(A.STRINGS.fr.ui));A.lang="en";
 ta.value="runner peas";ta._on.input();await sleep(700);
 chk("typed again: refused again, with the fence's reason in the line",calls.length===n&&line().includes(say(A,"en")),line());
 ta.value="";ta._on.input();await sleep(700);
 chk("the answer taken back, the host is sent the file as it was, and nothing more",calls.length===n+1&&calls[n].text===OPEN,calls.slice(n).map(c=>show(c.text)).join());
 /* the reason is gone with the answer: the line is a failed save's until the host answers, "trying again" while it is awaited */
 chk("and the line no longer gives the fence's reason: it says Not saved, trying again, while the host's answer is awaited",
   !line().includes(say(A,"en"))&&/Not saved/.test(line())&&line().includes(A.STRINGS.en.ui.saveAgain),line());
 h.saved(calls[n]);
 chk("the host's saved() for that change makes it Saved",P.byId("saveBtn").attrs["data-state"]==="saved"&&!line().includes(say(A,"en")),
   P.byId("saveBtn").attrs["data-state"]+" | "+line());}

/* ---- every kind of fence: a write is refused exactly when the answer would not be read back from the file ----
   For each body, the writer's own text (toMarkdown, which never refuses) is read again: if the answer is not in what it reads,
   the region went into a fence, and the download must be refused; if it is, the download must be that text, byte for byte. */
{const CASES=[
   ["a tilde fence, never closed","~~~\nbeans\n",true],
   ["four backticks opened, three after","````\nbeans\n```\n",true],
   ["three backticks opened, four after (it closes)","```\nbeans\n````\n",false],
   ["a closing line with an info string (it does not close)","```\nbeans\n``` shed\n",true],
   ["an opener indented three spaces, never closed","   ```\nbeans\n",true],
   ["an opener indented four spaces (indented code, not a fence)","    ```\n    beans\n",false],
   ["Windows line endings, never closed",{crlf:"```text\nbeans\n"},true],
   ["Windows line endings, closed",{crlf:"```text\nbeans\n```\n"},false],
   ["a byte order mark, never closed",{bom:"```text\nbeans\n"},true],
   ["an opener with no line ending after it","```text",true],
   ["a fence in a quote, never closed (the quote ends it)","> ```\n> beans\n",false],
   ["a fence in a callout, never closed (the callout ends it)","> [!note] Shed\n> ```\n> beans\n",false],
   ["a fence in the front matter only",{fm:"text\n"},false]];
 for(const [name,body,refuse] of CASES){
   const text=typeof body==="string"?FM+ACT+body:body.crlf!==undefined?(FM+ACT+body.crlf).replace(/\n/g,"\r\n")
     :body.bom!==undefined?"﻿"+FM+ACT+body.bom:FM.replace("lang: en\n","lang: en\nnote: \"```\"\n")+ACT+body.fm;
   const A=load(text);A.answersIn("").q1="runner beans";A.markDirty();
   const t=A.toMarkdown(),back=((A.parseFile(t).S||{}).answers||{})[""]||{},readBack=back.q1==="runner beans";
   BLOBS.length=0;await A.download();
   const refused=BLOBS.length===0;
   chk(name+": "+(refuse?"refused, as the answer would not be read back":"written as the writer writes it, and the answer is read back"),
     refused===refuse&&readBack===!refuse&&(refused?toastText()===say(A,"en")&&A.STATE.answers[""].q1==="runner beans":BLOBS[0]===t),
     "refused "+refused+", read back "+readBack+" "+show(t));}}

/* ---- a body whose fences all close: written exactly as before ---- */
{const CLOSED=FM+ACT+"A reminder for the shed:\n\n```text\nwater the beans at dawn\n```";
 const A=load(CLOSED);A.answersIn("").q1="runner beans";A.markDirty();BLOBS.length=0;await A.download();
 const t=A.toMarkdown();
 chk("a body ending in a fence that closes: the download is what the writer writes, the body as it was and the region after it",
   BLOBS.length===1&&BLOBS[0]===t&&t.startsWith(CLOSED+"\n\n%%\n"+HEAD)&&A.parseFile(t).S.answers[""].q1==="runner beans",show(BLOBS[0]));
 const files=[...fs.readdirSync(P.R+"/examples").filter(f=>f.endsWith(".md")).map(f=>"examples/"+f),
   ...fs.readdirSync(P.R+"/test/fixtures").filter(f=>f.endsWith(".md")).map(f=>"test/fixtures/"+f)];
 const differ=[];let n=0,moved=0;
 for(const f of files){const text=fs.readFileSync(P.R+"/"+f,"utf8");P.wipe();const C=P.boot(),R=C.parseFile(text);
   if(!R.template||!R.ok) continue;
   C.loadText(text);BLOBS.length=0;await C.download();n++;
   /* a file with design after its records is written with that design above them (section 8), as toMarkdown writes it */
   const mv=R.unread.some(p=>/moved above/.test(String(p)));if(mv) moved++;
   if(BLOBS.length!==1||BLOBS[0]!==(mv?C.toMarkdown():text)) differ.push(f);}
 chk("every example and fixture the renderer opens downloads as before: the file byte for byte ("+n+" files; "+moved+
   " with design after their records, as the writer writes them)",n>5&&!differ.length,differ.join());}

P.closePages();
if(fails){console.log("\n"+fails+" FAILURES");process.exitCode=1;}else console.log("\nall unclosed-fence checks passed");
})();
