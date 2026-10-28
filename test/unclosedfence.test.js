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
const MOD=id=>"\n> [!module|"+id+"] The "+id+"\n\n> [!activity|a1] This week\n\n> [!text|q1] What grew?\n\n> [!module|"+id+" end]\n";
/* a page load: the booklet open now, read again from the browser's copy */
const again=A=>{A.flushSave();const id=A.currentId;P.closePages();const B=P.boot();B.openBooklet(id);return B;};

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

/* ---- the browser's own copy of such a booklet (0.16.1): a reload, a Rename and Remove a module keep the design ----
   The copy is the design's text with the records region kept beside it (bookText, regionOf). Written after this body,
   the region (its `%%` and records lines) was read into the fence at the next reload, Rename or Remove, and the design
   shown gained those lines in the author's code block. The copy is now the body alone, and nothing of the region is lost. */
{const REC="%%\n"+HEAD+"\n\n```booklet answers\n{\"q1\": \"peas\"}\n```\n\n%%\n";
 const MOVED=FM+ACT+REC+"\n> [!text|q3] Anything else?\n\n```text\nmulch the beds\n";
 const A=load(MOVED),design=A.BOOK.raw.source;
 chk("(the design read from the file ends inside the fence and holds no records line)",/```text\nmulch the beds\n$/.test(design)&&!design.includes(HEAD),show(design));
 A.answersIn("").q2="the squash";A.markDirty();A.flushSave();const id=A.currentId,wrote=A.toMarkdown();P.closePages();
 const B=P.boot();B.openBooklet(id);
 chk("the browser's copy, read again after a reload: the design as it was, nothing of the records region in the fence",B.BOOK.raw.source===design,show(B.BOOK.raw.source));
 chk("and the answers are kept, the file's and the one typed",B.peekAnswers("").q1==="peas"&&B.peekAnswers("").q2==="the squash",JSON.stringify(B.peekAnswers("")));
 {const t=B.toMarkdown(),at=t.indexOf("%%\n"+HEAD);
  chk("and the records region is kept beside it: the text the writer would write is byte for byte what it was before the reload",
    t===wrote&&at>0&&t.slice(at).startsWith("%%\n"+HEAD+"\n\n```booklet answers\n{\"q1\": \"peas\"")&&t.includes('"q2": "the squash"'),show(t)+" | before "+show(wrote));}
 BLOBS.length=0;await B.download();
 chk("and a download is still refused",BLOBS.length===0&&toastText()===say(B,"en"));
 const named=design.replace("title: Garden notes\n","title: \"Garden notes in May\"\n");
 B.renameBooklet("Garden notes in May");
 chk("a Rename changes the title line and nothing else of the design",named!==design&&B.BOOK.raw.source===named,show(B.BOOK.raw.source));
 P.closePages();const C=P.boot();C.openBooklet(id);
 chk("and a reload after the Rename shows the same design",C.BOOK.raw.source===named&&C.peekAnswers("").q2==="the squash",show(C.BOOK.raw.source));
 C.answersIn("").q2="the beans";C.markDirty();C.flushSave();P.closePages();const D=P.boot();D.openBooklet(id);
 chk("and so does another answer, saved and read again",D.BOOK.raw.source===named&&D.peekAnswers("").q2==="the beans"&&D.peekAnswers("").q1==="peas",show(D.BOOK.raw.source));}
/* a copy an older release kept (its parsed design, TPL) keeps no region beside it: the records it kept as written are
   written after its source whatever the source ends in, as before, and never left out */
{const src=FM+ACT+"A reminder for the shed:\n\n```text\nwater the beans at dawn\n";
 const A=load(src);A.answersIn("").q1="runner beans";A.markDirty();A.flushSave();const id=A.currentId,key="booklet.b."+id;
 const o=JSON.parse(global.__ls[key]);delete o.text;delete o.region;
 o.TPL={booklet:"0.13",id:"garden",version:"",modules:[],widgets:[],raw:{source:src,lang:"en",records:[{scope:"",text:'```booklet sync\n{"by":"another reader"}\n```'}]}};
 global.__ls[key]=JSON.stringify(o);P.closePages();const B=P.boot();B.openBooklet(id);
 const kept=JSON.parse(global.__ls[key]);
 chk("an older release's copy of such a booklet keeps the records it kept as written",kept.text.includes('```booklet sync\n{"by":"another reader"}\n```')&&B.peekAnswers("").q1==="runner beans",show(kept.text));}
{const REC="%%\n> [!records|beds] App record — do not edit below this line\n\n```booklet answers\n{\"q1\": \"peas\"}\n```\n\n%%\n";
 const AFTER="\nA reminder for the shed:\n\n```text\nwater the beans at dawn\n";
 const A=load(FM+MOD("beds")+MOD("shed")+"\n"+REC+AFTER),r=A.removeModule("shed");
 chk("Remove a module on such a booklet: the design is what remains, with nothing of the records region in the fence",
   r.ok&&A.BOOK.raw.source===FM+MOD("beds")+AFTER&&A.BOOK.modules.map(m=>m.id).join()==="beds",show(A.BOOK.raw.source));
 chk("and the module left keeps its answers, in the page and in the region",A.peekAnswers("beds").q1==="peas"&&A.toMarkdown().includes('{"q1": "peas"}'),show(A.toMarkdown()));}
/* Remove a module whose records are the region's only records: the region goes with it, and the file is the body as it was
   less the module, the same bytes with a reload first or not, with Windows line endings too. The blank line the writer
   puts before the region is the writer's, not the body's: kept in the copy's text, it would stay there when the region
   went, one blank line more after a reload (the writer puts it before the region kept beside the text, as before the
   reload). The white space at the end of the fence's last line is the author's code: the design keeps it through a
   reload, Remove and a Rename, and the file has it (the parse of a text that ends inside the fence takes it off). */
{const REC="%%\n> [!records|shed] The shed\n\n```booklet answers\n{\"q1\": \"snails\"}\n```\n\n%%\n";
 for(const [how,end,crlf] of [["","",false],[", with Windows line endings","",true],[", with white space at the end of the fence's last line","   ",false],
   [", with both","  \t",true]]) for(const rl of [false,true]){
   const cr=t=>crlf?t.replace(/\n/g,"\r\n"):t,AFTER="\nA reminder for the shed:\n\n```text\nwater the beans at dawn"+end+"\n";
   const text=cr(FM+MOD("beds")+MOD("shed")+"\n"+REC+AFTER),want=cr(FM+MOD("beds")+AFTER),as=how+(rl?", a reload first":"");
   let A=load(text);if(rl) A=again(A);
   if(end) chk("the design keeps the white space at the end of the fence's last line"+as,A.BOOK.raw.source.endsWith("dawn"+end+"\n"),show(A.BOOK.raw.source));
   const r=A.removeModule("shed");BLOBS.length=0;await A.download();
   chk("Remove the module whose records are the region's only records: the download is the file less the module, byte for byte"+as,
     r.ok&&BLOBS.length===1&&BLOBS[0]===want,BLOBS.map(show).join()+" | want "+show(want));
   if(!end) continue;
   A.renameBooklet("Garden notes in May");const B=again(A);
   chk("and the white space stays in the design after Remove, a Rename and a reload"+as,A.BOOK.raw.source.endsWith("dawn"+end+"\n")&&B.BOOK.raw.source.endsWith("dawn"+end+"\n"),show(B.BOOK.raw.source));}}

/* ---- Add a module on a booklet whose body ends inside such a fence (0.16.1) ----
   Where the module would be put after that fence's opening line (at the end of the body), it would be read as the fence's
   code and never as a module: Add a module is refused, says why, and changes nothing. Anywhere else it is added as before. */
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
   r3.ok===true&&(r3.added||[]).join()==="seeds"&&C.BOOK.raw.source===CLOSED+"\n"+FENCE&&C.BOOK.modules.some(m=>m.id==="seeds"),show(C.BOOK.raw.source)+" "+JSON.stringify(r3));
 /* where the module is not put after that fence's opening line, it is added and read as before: (a) an update of a module
    the booklet has, in place, the fence after it; (b) a new module, put before the data section the fence is in; (c) a
    module whose data section ends inside the fence, updated by its newer file, which closes it. A download, with the answer
    to write after the body, stays refused while the body ends inside the fence. */
 const SEEDS=q=>"\n> [!module|seeds] Seed swap\n\n> [!activity|s1] What to swap\n\n> [!text|which] "+q+"\n\n> [!module|seeds end]\n";
 const SEEDFILE=(q,after)=>'---\nbooklet: "0.16"\ntitle: Seed swap\nlang: en\n---\n'+SEEDS(q)+(after||"");
 const asked=A=>((A.BOOK.modules.find(m=>m.id==="seeds")||{}).activities||[]).flatMap(a=>a.pages.flatMap(p=>p.blocks)).filter(b=>b.id==="which").map(b=>b.label).join();
 for(const [name,book,mod,q,open] of [
   ["(a) an update of a module the booklet has, the fence after it",FM+SEEDS("Which seeds?")+"\nA reminder for the shed:\n\n```text\nwater the beans at dawn\n",
     SEEDFILE("Which seeds will you swap?"),"Which seeds will you swap?",true],
   ["(b) a new module, before the data section the fence is in",FM+ACT+"> [!data] Data\n\n```text\nan example that never closes\n",SEEDFILE("Which seeds?"),"Which seeds?",true],
   ["(c) a module whose data section ends inside the fence, updated by its newer file, which closes it",
     SEEDFILE("Which seeds?","\n> [!data|seeds] Data for Seed swap\n\n```text\nan example that never closes\n"),
     SEEDFILE("Which seeds?","\n> [!data|seeds] Data for Seed swap\n\n```text\nan example that now closes\n```\n"),"Which seeds?",false]]){
   const A=load(book);A.answersIn("seeds").which="runner beans";A.markDirty();
   const r=A.addModuleText(mod);BLOBS.length=0;await A.download();
   chk("Add a module "+name+": added, and read as a module",r.ok===true&&asked(A)===q,JSON.stringify(r)+" "+asked(A));
   chk("and the reader's answer is kept; a download is "+(open?"still refused, the body still ending inside the fence":"made, with the answer, the fence closed"),
     A.peekAnswers("seeds").which==="runner beans"&&(open?BLOBS.length===0:BLOBS.length===1&&A.parseFile(BLOBS[0]).S.answers.seeds.which==="runner beans"),BLOBS.map(show).join());}}

/* ---- work kept as records, through a newer file whose body ends inside such a fence (0.16.1) ----
   A newer file read on the offer ("Read the newer file": the host's, hostAccept, or a store's, linkAccept) that drops a
   module the reader worked in keeps that work as records (keepUnowned), and a file's own records for a module its design
   lacks are kept as written. Where the body ends inside such a fence, those records are kept beside the copy's text, not in
   it, and a later newer file (the fence closed; the module back, or still gone) must keep them too, with a reload between
   or not. They are read from the region kept beside the text, as from a text that holds its region (readMade); read from
   the copy's text alone, they were dropped by that later file (0.16.0 dropped them in some of these orders too). */
{const V1=FM+MOD("beds")+MOD("shed"),V2=FM+MOD("beds")+"\nA reminder for the shed:\n\n```text\nwater the beans at dawn\n";
 const V3=FM+MOD("beds")+"\nA reminder for the shed:\n\n```text\nwater the beans at dawn\n```\n",V3b=FM+MOD("beds")+MOD("shed")+"\nA reminder for the shed:\n\n```text\nwater the beans at dawn\n```\n";
 /* a file whose region holds records for a module its design lacks, the design after it ending inside the fence */
 const V6=FM+MOD("beds")+"\n%%\n> [!records|beds] The beds\n\n```booklet answers\n{\"q1\": \"peas\"}\n```\n\n> [!records|shed] The shed\n\n```booklet answers\n{\"q1\": \"snails\"}\n```\n\n%%\n"+
   "\nA reminder for the shed:\n\n```text\nwater the beans at dawn\n";
 const STORE="http://fleet/booklets/",LINK="#/open/garden/week.booklet.md",qs=global.document.querySelector,ft=global.fetch;let FILE="",calls=[],h=null;
 const reply=(body,ok)=>({ok:ok!==false,status:ok===false?404:200,headers:{get:k=>({"content-type":"text/plain"}[k.toLowerCase()])},text:async()=>body,
   body:{getReader(){const b=Buffer.from(body);let done=false;return {read:async()=>done?{done:true}:(done=true,{done:false,value:new Uint8Array(b)})};}}});
 const type=(A,scope,words)=>{A.screen=scope+"/a1";A.render();const ta=P.find(P.main(),n=>n.tagName==="textarea"||n.tagName==="input")[0];ta.value=words;ta._on.input();A.flushSave();};
 /* the two ways a newer file is read: the host's (Booklet.host, fileChanged) and a store's (a #/open/ link, no host). The
    reader's only work is in the module the newer file drops, so after that read the copy holds nothing but those records,
    and the store's next file is offered all the same (storeHolds weighs them, keptBeyond) */
 const WAYS={
   host:{boot(){P.place("http:","fleet");global.__ls["booklet.host.allowed"]="fleet: garden";const A=P.boot(),B=A.BookletApi;
       h=B.host({label:"fleet: garden"});B.onChange(x=>calls.push(x));return A;},
     async open(text){P.wipe();const A=this.boot();A.BookletApi.open(text,{name:"garden/week.booklet.md"});await sleep(300);return A;},
     async again(A){A.flushSave();P.closePages();const B=this.boot();B.openBooklet(B.readLib().entries[0].id);await sleep(300);return B;},
     async newer(A,text){calls.length=0;h.fileChanged(text);A.hostAccept();await sleep(700);return A;}},
   store:{boot(){P.place("http:","fleet");global.document.querySelector=s=>/booklet-store/.test(s)?{getAttribute:k=>k==="content"?STORE:null}:null;
       global.fetch=async u=>String(u)===STORE+"garden/week.booklet.md"?reply(FILE):reply("nf",false);return P.boot();},
     async open(text){P.wipe();FILE=text;const A=this.boot();await A.openLink(LINK);return A;},
     async again(A){A.flushSave();P.closePages();const B=this.boot();await B.openLink(LINK);return B;},
     async newer(A,text){FILE=text;A.closeBooklet();await A.openLink(LINK);
       const b=P.find(P.find(P.main(),P.hasClass("hostnote"))[0]||{children:[]},n=>n.tagName==="button"&&/Read the newer file/.test(P.texts(n)))[0];
       if(b) b._on.click({target:b});return A;}}};
 for(const [way,W] of Object.entries(WAYS)){
   for(const [label,last] of [["the module still gone",V3],["the module back",V3b]]) for(const rl of [false,true]){
     const as=" ("+way+"; a newer file ending inside the fence, then "+(rl?"a reload, then ":"")+"a newer file with it closed and "+label+")";
     let A=await W.open(V1);type(A,"shed","snails");
     A=await W.newer(A,V2);
     chk("the work in the module the newer file drops is kept as records beside the copy's text"+as,A.BOOK.raw.source===V2&&/snails/.test(A.toMarkdown()),show(A.toMarkdown()));
     if(rl) A=await W.again(A);
     A=await W.newer(A,last);
     const t=A.toMarkdown();
     chk("and the later newer file keeps it: "+(last===V3b?"the answer is back in its module":"still kept as records")+as,
       A.BOOK.raw.source===last&&/snails/.test(t)&&(last===V3b?A.peekAnswers("shed").q1==="snails"&&A.parseFile(t).S.answers.shed.q1==="snails":t.includes("> [!records|shed]")),show(t));
     if(way==="host") chk("and what the host is sent holds it"+as,calls.length>0&&calls.every(c=>/snails/.test(c.text)),calls.map(c=>show(c.text)).join());}
   for(const rl of [false,true]){const as=" ("+way+(rl?"; a reload first":"")+")";
     let A=await W.open(V6);type(A,"beds","peas and beans");if(rl) A=await W.again(A);
     A=await W.newer(A,V3);const t=A.toMarkdown();
     chk("a file's own records for a module its design lacks, the design after them ending inside the fence: a newer file keeps them"+as,
       A.BOOK.raw.source===V3&&t.includes("> [!records|shed] The shed\n\n```booklet answers\n{\"q1\": \"snails\"}\n```")&&A.peekAnswers("beds").q1==="peas and beans",show(t));}
   /* a newer file that brings the module back and still ends inside the fence: the answer is the reader's again, at once */
   {let A=await W.open(V1);type(A,"shed","snails");A=await W.newer(A,V2);
    const V2b=FM+MOD("beds")+MOD("shed")+"\nA reminder for the shed:\n\n```text\nwater the beans at dawn\n";
    A=await W.newer(A,V2b);const shown=A.peekAnswers("shed").q1;A=await W.again(A);const kept=A.peekAnswers("shed").q1;A=await W.newer(A,V3);
    chk("a newer file that brings the module back, still ending inside the fence: the answer is in its module at once, after a reload, and kept by the next file ("+way+")",
      shown==="snails"&&kept==="snails"&&/snails/.test(A.toMarkdown()),JSON.stringify([shown,kept])+" "+show(A.toMarkdown()));}
   P.closePages();}
 global.document.querySelector=qs;global.fetch=ft;}

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
 const differ=[],copies=[];let n=0,moved=0;
 for(const f of files){const text=fs.readFileSync(P.R+"/"+f,"utf8");P.wipe();const C=P.boot(),R=C.parseFile(text);
   if(!R.template||!R.ok) continue;
   C.loadText(text);BLOBS.length=0;await C.download();n++;
   /* a file with design after its records is written with that design above them (section 8), as toMarkdown writes it */
   const mv=R.unread.some(p=>/moved above/.test(String(p)));if(mv) moved++;
   if(BLOBS.length!==1||BLOBS[0]!==(mv?C.toMarkdown():text)) differ.push(f);
   /* the browser's copy of its design is the writer's text with nothing of the reader's, as before 0.16.1 */
   if(C.bookText(C.BOOK)!==C.fileText(C.BOOK,C.emptyState(),C.emptyDrafts())) copies.push(f);}
 chk("every example and fixture the renderer opens downloads as before: the file byte for byte ("+n+" files; "+moved+
   " with design after their records, as the writer writes them)",n>5&&!differ.length,differ.join());
 chk("and the browser's copy of each one's design is the writer's text, as before",n>5&&!copies.length,copies.join());}

P.closePages();
if(fails){console.log("\n"+fails+" FAILURES");process.exitCode=1;}else console.log("\nall unclosed-fence checks passed");
})();
