// The design is the parse of its text (0.13.1, review R1).
//
// A booklet's design is never a stored object patched by hand: this browser keeps the booklet's text, and the design in
// memory is always that text's parse. Add a module, Remove a module and Rename compose the text and adopt its parse whole.
// The review's own probe is the core check here: after adding the four test/fixtures/module-*.md files, removing one and
// renaming, the design in memory equals the parse of the text the page keeps, the parse of the file it writes, and the
// design a reload reads back.
//
// Run: node test/designtext.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const F=P.R+"/test/fixtures/";
const LS=global.__ls;
const json=x=>JSON.stringify(x);
const kept=A=>JSON.parse(LS["booklet.b."+A.currentId]);

/* the three ways the design must agree, after `label` */
function agrees(A,label){A.flushSave();
  const snap=kept(A),fromKept=A.parseFile(snap.text).template,fromFile=A.parseFile(A.toMarkdown()).template;
  chk(label+": the design is the parse of the text this browser keeps",!!fromKept&&json(A.BOOK)===json(fromKept));
  chk(label+": and of the file it writes",!!fromFile&&json(A.BOOK)===json(fromFile));
  chk(label+": the snapshot keeps the text, never a parsed design",typeof snap.text==="string"&&!("TPL" in snap));
  const id=A.currentId,was=json(A.BOOK),file=A.toMarkdown();P.closePages();
  const B=P.boot();B.openBooklet(id);
  chk(label+": a reload reads the same design back, and the same work (the file it writes is the same)",json(B.BOOK)===was&&B.toMarkdown()===file);
  return B;}

(async()=>{
 /* ---- the review's probe: add four module files, remove one, rename ---- */
 P.wipe();let A=P.boot();await A.createBooklet();
 chk("a booklet started here takes its title's slug as its id, as a file does",A.BOOK.id==="untitled-booklet",A.BOOK.id);
 const files=fs.readdirSync(F).filter(f=>/^module-.*\.md$/.test(f)).sort();
 chk("the probe adds the four module files",files.length===4,files.join());
 for(const f of files){const r=A.addModuleText(fs.readFileSync(F+f,"utf8"));chk("added "+f,r.ok,json(r.problems));}
 A.answersIn("").note="kept across every step";A.markDirty();
 chk("the four files hold five modules",A.allModules().length===5,A.allModules().map(m=>m.id).join());
 A=agrees(A,"after adding them");
 const ids=A.allModules().filter(m=>!m.__bare).map(m=>m.id);
 const gone=ids[1],r=A.removeModule(gone);
 chk("removed "+gone,r.ok&&!A.allModules().some(m=>m.id===gone),json(r));
 A=agrees(A,"after removing one");
 chk("renamed",A.renameBooklet("A new name")&&A.BOOK.title==="A new name"&&A.BOOK.head.title==="A new name");
 chk("the rename gives the booklet its new title's slug as its id",A.BOOK.id==="a-new-name",A.BOOK.id);
 A=agrees(A,"after renaming");
 chk("the reader's answer outlived every step",A.answersIn("").note==="kept across every step");

 /* ---- what a file keeps as written travels with the text ---- */
 P.wipe();A=P.boot();
 const KEEP='---\nbooklet: "0.13"\ntitle: Kept\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n\n'+
   '%%\n> [!records] App record\n\n```booklet sync\n{"by":"another reader"}\n```\n\n> [!records|later] Later module\n\n```booklet answers\n{"x":"from the file"}\n```\n\n%%\n';
 A.loadText(KEEP);
 chk("a file's records kept as written (a sync record, a records line for a module it does not hold) are written back",/booklet sync/.test(A.toMarkdown())&&/records\|later/.test(A.toMarkdown()));
 A=agrees(A,"a booklet holding kept records");
 chk("and come back after a reload",/booklet sync/.test(A.toMarkdown())&&/"from the file"/.test(A.toMarkdown()));
 const LATER='---\nbooklet: "0.13"\ntitle: Later\nlang: en\n---\n\n> [!module|later] Later module\n\n> [!activity|b] B\n\n> [!text|x] X\n\n> [!module|later end] End\n';
 chk("adding the module those records named",A.addModuleText(LATER).ok);
 chk("its kept answers are now the reader's, as the file read back would have them",A.peekAnswers("later").x==="from the file",json(A.STATE.answers));
 A=agrees(A,"after the module the records named is added");

 /* ---- a snapshot an earlier release made: the parsed design (TPL), not its text ---- */
 P.wipe();A=P.boot();await A.createBooklet();
 A.addModuleText(fs.readFileSync(F+"module-daily-journal.md","utf8"));A.answersIn("").note="an old answer";A.flushSave();
 const id=A.currentId,key="booklet.b."+id,snap=kept(A),src=A.BOOK.raw.source;
 delete snap.text;snap.TPL={booklet:"0.13",id:"local/booklet",version:"1",customized:true,modules:[],widgets:[],
   raw:{source:src,lang:"en",records:[{scope:"",text:'```booklet sync\n{"old":true}\n```'}]}};
 LS[key]=json(snap);P.closePages();
 A=P.boot();A.openBooklet(id);
 chk("an older snapshot opens from its raw.source: the design is that text's parse",A.allModules().map(m=>m.id).join()==="example-daily-journal"&&A.BOOK.raw.source===src);
 chk("with the records it kept as written, and the reader's work",/"old":true/.test(A.toMarkdown())&&A.answersIn("").note==="an old answer");
 A.markDirty();A=agrees(A,"after an older snapshot is saved again");

 /* ---- a booklet 0.12 kept, read by this release's rules ---- */
 const OLD12=(body)=>'---\nbooklet: "0.12"\ntitle: Kept by 0.12\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n'+body+'\n\n> [!module|m end] End\n';
 /* what 0.12.0 kept: the design it parsed (here, the same design written the way 0.13 reads it), with its own text as raw.source */
 const keep12=async(now13,then12,answers)=>{P.wipe();const K=P.boot();await K.createBooklet();K.addModuleText(now13);
   Object.assign(K.answersIn("m"),answers);K.flushSave();const id=K.currentId,key="booklet.b."+id,o=kept(K);
   delete o.text;o.TPL={...JSON.parse(json(K.BOOK)),booklet:"0.12",customized:true,languages:["en"]};o.TPL.raw.source=then12;
   LS[key]=json(o);P.closePages();return {id,key};};
 {const then=OLD12("> [!text|long seen] What did you see?\n\n> [!text|long heard] What did you hear?");
  const {id,key}=await keep12(OLD12("> [!text|seen long] What did you see?\n\n> [!text|heard long] What did you hear?").replace('"0.12"','"0.13"'),then,{seen:"I saw the tide",heard:"I heard gulls"});
  const line=then.split("\n").indexOf("> [!text|long heard] What did you hear?")+1;
  const B=P.boot();B.openBooklet(id);B.screen="m/a";B.render();
  const fields=P.find(P.main(),n=>n.tagName==="textarea").map(n=>n.value);
  chk("a 0.12 booklet this release refuses (`long` read as both ids) opens from the design 0.12 kept: both answers shown",json(fields)===json(["I saw the tide","I heard gulls"]),json(fields));
  const items=P.find(P.find(P.main(),P.hasClass("filenotes"))[0]||{},n=>n.tagName==="li").map(P.texts);
  chk("with the notice a file opened afresh would get, so the reader knows to fix the file",items.some(x=>x.startsWith("line "+line+": the id “long” is used twice")),json(items));
  B.markDirty();B.flushSave();
  chk("a save keeps that design, and writes no text this release would refuse",(()=>{const o=JSON.parse(LS[key]);return !!o.TPL&&!("text" in o)&&o.S.answers.m.seen==="I saw the tide";})());
  B.renameBooklet("Fixed later");B.flushSave();
  chk("renamed, that design keeps its answers and takes the name, in its text too",(()=>{const o=JSON.parse(LS[key]);return o.TPL.title==="Fixed later"&&/^title: "Fixed later"$/m.test(o.TPL.raw.source)&&o.S.answers.m.heard==="I heard gulls";})());
  P.closePages();const C=P.boot();C.openBooklet(id);C.screen="m/a";C.render();
  chk("and a reload opens it the same way",json(P.find(P.main(),n=>n.tagName==="textarea").map(n=>n.value))===json(["I saw the tide","I heard gulls"])&&C.BOOK.title==="Fixed later");}
 {const then=OLD12("> [!text|seen] What did you see?\n\n> [!row|end]");
  const {id,key}=await keep12(OLD12("> [!text|seen] What did you see?").replace('"0.12"','"0.13"'),then,{seen:"Low water"});
  const entry=()=>JSON.parse(LS["booklet.library.v1"]).entries.find(e=>e.id===id),e0=entry(),d0=JSON.parse(LS[key]).dirty;
  const B=P.boot();B.openBooklet(id);B.screen="m/a";B.render();
  const box=P.find(P.main(),P.hasClass("filenotes"))[0],items=P.find(box||{},n=>n.tagName==="li").map(P.texts);
  chk("a 0.12 booklet this release reads with a problem opens by this release's parse, its answer there",P.find(P.main(),n=>n.tagName==="textarea").map(n=>n.value).join()==="Low water");
  chk("and, the first time, says what a file opened afresh would: the 0.12 marker and the problem",!!box&&/This file says booklet: 0\.12/.test(P.texts(box))&&items.some(x=>/a row is closed that was never opened/.test(x)),box&&P.texts(box));
  chk("opening it rewrote its snapshot as text, with no save: the old design is gone, its changed mark and the list's last-updated time are as they were",
    (()=>{const o=JSON.parse(LS[key]),e=entry();return typeof o.text==="string"&&!("TPL" in o)&&o.dirty===d0&&e.updatedAt===e0.updatedAt&&e.dirty===e0.dirty;})());
  P.closePages();const C=P.boot();C.openBooklet(id);C.screen="m/a";C.render();
  chk("opened again, it shows no notice (0.13.0 showed it once), and its answer is there",!P.find(P.main(),P.hasClass("filenotes")).length&&P.find(P.main(),n=>n.tagName==="textarea").map(n=>n.value).join()==="Low water");}
 /* the rewrite tells a host nothing: a host's booklet kept by 0.12 calls the host as often on its first open as on the next */
 {const {id,key}=await keep12(OLD12("> [!text|seen] What did you see?").replace('"0.12"','"0.13"'),OLD12("> [!text|seen] What did you see?\n\n> [!row|end]"),{seen:"Low water"});
  {const L=JSON.parse(LS["booklet.library.v1"]);L.entries.find(e=>e.id===id).from="store:old.booklet.md";LS["booklet.library.v1"]=json(L);}
  const opened=async()=>{P.closePages();P.place("http:","fleet");LS["booklet.host.allowed"]="h";const H=P.boot();H.BookletApi.host({label:"h"});
    const calls=[];H.BookletApi.onChange(x=>calls.push(x));H.openBooklet(id);await new Promise(r=>setTimeout(r,800));return calls.length;};
  const first=await opened(),upgraded=typeof JSON.parse(LS[key]).text==="string",second=await opened();
  chk("a host's booklet kept by 0.12 is rewritten as text on its first open, and calls the host no more than opening it again does",upgraded&&first===second&&first===1,first+" / "+second);
  P.closePages();delete global.location;}
 /* a rename from the list keeps a design it cannot replace */
 {P.wipe();const K=P.boot();await K.createBooklet();K.flushSave();const id=K.currentId,key="booklet.b."+id,o=kept(K);
  delete o.text;o.TPL={modules:[]};LS[key]=json(o);K.closeBooklet();
  K.renameStored(id,"Named");
  chk("renaming from the list a snapshot whose design gives no text keeps that design beside the new text",(()=>{const x=JSON.parse(LS[key]);return "TPL" in x&&/Named/.test(x.text);})());}

 /* ---- a stored snapshot is never trusted as a design ---- */
 P.wipe();A=P.boot();await A.createBooklet();A.flushSave();
 {const id2=A.currentId,k2="booklet.b."+id2,o=kept(A);
  o.text="not a booklet at all";o.TPL={modules:[{id:"x",mode:{id:"x",kind:"board",blocks:[{type:"markdown",text:"<script>"}]}}]};
  LS[k2]=json(o);P.closePages();
  const B=P.boot();B.openBooklet(id2);
  chk("a snapshot whose text is no booklet opens empty: an object kept beside it is never drawn",B.allModules().length===0);}

 P.wipe();
 console.log(fails?"\n"+fails+" FAILURES":"\nall design-text checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
