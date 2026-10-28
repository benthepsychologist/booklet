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

/* ---- the host's write-back and Booklet.text() ---- */
{P.wipe();P.place("http:","fleet");global.__ls["booklet.host.allowed"]="fleet: garden";const A=P.boot(),B=A.BookletApi;
 const calls=[];B.host({label:"fleet: garden"});B.onChange(x=>{calls.push(x);});
 B.open(OPEN,{name:"garden/week.booklet.md"});await sleep(700);
 chk("opened with nothing changed, the host is sent the file as it is",calls.length===1&&calls[0].text===OPEN,calls.map(c=>show(c.text)).join());
 const n=calls.length;A.screen="a1";A.render();const ta=P.find(P.main(),x=>x.tagName==="textarea")[0];ta.value="runner beans";ta._on.input();
 await sleep(700);
 chk("an answer is not sent to the host",calls.length===n,calls.slice(n).map(c=>show(c.text)).join());
 chk("the save status says Unsaved, and the line behind it says why",P.byId("saveBtn").attrs["data-state"]==="unsaved"&&
   A.hostLineText(A.STRINGS.en.ui).includes(say(A,"en"))&&/^Saves go to: fleet: garden · Not saved/.test(A.hostLineText(A.STRINGS.en.ui)),A.hostLineText(A.STRINGS.en.ui));
 chk("Booklet.text() gives the host nothing to write",B.text()==="",show(B.text()));
 chk("and the answer stays in the page",A.peekAnswers("").q1==="runner beans");
 A.lang="fr";chk("the line says why in the reader's language",A.hostLineText(A.STRINGS.fr.ui).includes(say(A,"fr")),A.hostLineText(A.STRINGS.fr.ui));A.lang="en";
 ta.value="";ta._on.input();await sleep(700);
 chk("the answer taken back, the host is sent the file as it was, and nothing more",calls.length===n+1&&calls[n].text===OPEN,calls.slice(n).map(c=>show(c.text)).join());}

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
