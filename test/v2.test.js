// Format version 2: a booklet written as Markdown loads, draws, keeps what a
// reader does, and writes itself back with its design untouched.
//
// examples/mindful-check-in.booklet.md is the check-in module rewritten as a
// version 2 file. Each section below is one promise the renderer makes about it:
//   1. it is read as version 2, into one module with one repeating activity;
//   2. its widgets arrive whole, in the file's one language;
//   3. the activity draws: both widgets, the text question and the lines;
//   4. a finished check-in is kept, written into the records, and read back;
//   5. the design half of the file comes back exactly as it was written;
//   6. what is wrong with a file is said, and the file still opens.
//
// Run: node test/v2.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
const EX=fs.readFileSync(P.R+"/examples/mindful-check-in.booklet.md","utf8");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};

/* 1. read as version 2 */
let A=P.boot();
const R=A.parseFile(EX);
chk("the example parses",R.ok,JSON.stringify(R.unread));
chk("nothing in the example is reported as wrong",R.unread.length===0,JSON.stringify(R.unread));
const t=R.template||{};
chk("it is marked version 2",t.booklet===2);
chk("its one language is declared",JSON.stringify(t.languages)==='["en"]');
chk("one module, from the module fence",(t.modules||[]).length===1&&t.modules[0].id==="mensio-check-in",JSON.stringify((t.modules||[]).map(m=>m.id)));
const m=(t.modules||[])[0]||{};
chk("the module's blurb is its opening paragraph",m.blurb==="Body, feelings, thoughts — noticed, named, kept.",m.blurb);
chk("the module carries its rights from the front matter",m.rights&&/Armstrong/.test(m.rights.copyright));
const a=m.mode||{};
chk("one activity, repeating, so it keeps entries",a.id==="check-in"&&a.kind==="entry",JSON.stringify({id:a.id,kind:a.kind}));
const types=(a.blocks||[]).map(b=>b.type+":"+b.id);
chk("its blocks, in order",JSON.stringify(types)===JSON.stringify(["markdown:md1","widget:body","widget:emotions","text:other","headlines:thoughts"]),JSON.stringify(types));
chk("the text question is worded by the file",JSON.stringify(m.copy.en["check-in"].other)===JSON.stringify(["Something else","In your own words."]),JSON.stringify(m.copy));

/* 2. widgets */
const W=t.widgets||[];
chk("both widgets arrive, named by their block ids",W.map(w=>w.id).join()==="body-map,quadrants",W.map(w=>w.id).join());
chk("a widget's words are keyed by the file's language",W.every(w=>w.copy&&w.copy.en&&w.copy.en.h),JSON.stringify(W.map(w=>w.copy)));
chk("the body map block points at its data",a.blocks[1].widget==="body-map"&&a.blocks[1].skippable===true);

/* 3. load it the way a reader does, and draw the activity */
A.createBooklet&&0;
A.loadText(EX);
chk("the page adopts it as the booklet",A.TPL.booklet===2&&A.allModules().length===1,JSON.stringify({b:A.TPL.booklet,n:A.allModules().length}));
A.view="check-in";A.render();
const seen=P.texts(P.main());
["A mindful check-in","Body","Feelings","Something else","In your own words.","Mind is thinking about","Notice, name, keep."].forEach(w=>
  chk("the activity shows “"+w+"”",seen.includes(w),seen.slice(0,400)));

/* 4. answer, keep, write, read back */
const d=A.draftFor("check-in");
d.body=["chest"];d.emotions=["curiosity"];d.other="the kettle";d.thoughts=["the deadline",""];
A.finalizeEntry("check-in");
const kept=A.keptFor("check-in");
chk("the check-in is kept as an entry",kept.length===1&&kept[0].other==="the kettle");
chk("blank lines are not kept",JSON.stringify(kept[0].thoughts)==='["the deadline"]',JSON.stringify(kept[0].thoughts));
A.draftFor("check-in").other="half a thought";
const out=A.toMarkdown();
chk("the file written opens with the design exactly as read",out.startsWith(EX.replace(/\s+$/,"")),out.slice(0,200));
chk("the records are hidden from Obsidian's reading view",/\n%%\n> \[!records\] App record/.test(out));
chk("they are grouped under the module",out.includes("> [!records|mensio-check-in] A mindful check-in"));
chk("the entry is written, one line per entry",/```booklet entries check-in\n\{"items": \[\n\{[^\n]*"the kettle"[^\n]*\}\n\]\}\n```/.test(out),out.slice(-600));
chk("the unfinished draft is written",/```booklet draft check-in\n\{"other":"half a thought"\}\n```/.test(out),out.slice(-300));
const R2=A.parseFile(out);
chk("the written file reads back with no problems",R2.ok&&R2.unread.length===0,JSON.stringify(R2.unread));
chk("the entry comes back",((R2.S.entries||{})["check-in"]||[]).length===1&&R2.S.entries["check-in"][0].other==="the kettle");
chk("the draft comes back",(R2.drafts.activities["check-in"]||{}).other==="half a thought");
chk("the design comes back as the same text",R2.template.v2.source===R.template.v2.source);
const again=(()=>{P.wipe();const B=P.boot();B.loadText(out);return B.toMarkdown();})();
chk("load, save, load, save changes nothing",again===out,again.length+" vs "+out.length);

/* 5. a new file has no JSON records at all */
chk("the example itself holds no records",!/booklet (answers|entries|draft)/.test(EX)&&!/\[!records/.test(EX));

/* 6. problems are said, and the file still opens */
const bad=EX.replace("> [!module|mensio-check-in end] End of A mindful check-in\n","").replace("> [!text|other]","> [!text]");
const R3=A.parseFile(bad);
chk("an unclosed module is reported",R3.unread.some(x=>/never closed/.test(x)),JSON.stringify(R3.unread));
chk("a question with no id is reported",R3.unread.some(x=>/has no id/.test(x)),JSON.stringify(R3.unread));
chk("the rest of the file still opens",R3.ok);
chk("a version 1 file is not read at all — no compat, no exceptions",
  A.parseFile('---\nbooklet: 1\n---\n\n```json\n{"block":"module"}\n```\n').ok===false);

P.closePages();
console.log((fails?fails+" of the checks above failed":"all v2 checks passed"));
process.exit(fails?1:0);
