// Format v0.5: a booklet written as Markdown loads, draws, keeps what a
// reader does, and writes itself back with its design untouched.
//
// examples/mindful-check-in.booklet.md is the check-in module rewritten as a
// v0.4 file. Each section below is one promise the renderer makes about it:
//   1. it is read as v0.4, into one module with one repeating activity;
//   2. its widgets arrive whole, in the file's one language;
//   3. the activity draws: both widgets, the text question and the lines;
//   4. a finished check-in is kept, written into the records, and read back;
//   5. the design half of the file comes back exactly as it was written;
//   6. what is wrong with a file is said, and the file still opens.
//
// Run: node test/booklet-format.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
const EX=fs.readFileSync(P.R+"/examples/mindful-check-in.booklet.md","utf8");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};

/* 1. read as v0.4 */
let A=P.boot();
const R=A.parseFile(EX);
chk("the example parses",R.ok,JSON.stringify(R.unread));
chk("nothing in the example is reported as wrong",R.unread.length===0,JSON.stringify(R.unread));
const t=R.template||{};
chk("it is marked v0.9",t.booklet=== 0.9);
chk("its one language is declared",JSON.stringify(t.languages)==='["en"]');
chk("one module, from the module fence",(t.modules||[]).length===1&&t.modules[0].id==="mensio-check-in",JSON.stringify((t.modules||[]).map(m=>m.id)));
const m=(t.modules||[])[0]||{};
chk("the module's blurb is its opening paragraph",m.blurb==="Body, feelings, thoughts — noticed, named, kept.",m.blurb);
chk("the module carries its rights from the front matter",m.rights&&/Armstrong/.test(m.rights.copyright));
const a=m.mode||{};
chk("one activity, repeating, so it keeps entries",a.id==="mensio-check-in/check-in"&&a.kind==="entry",JSON.stringify({id:a.id,kind:a.kind}));
const types=(a.blocks||[]).map(b=>b.type+":"+b.id);
chk("its blocks, in order",JSON.stringify(types)===JSON.stringify(["markdown:md1","widget:body","widget:emotions","text:other","lines:thoughts"]),JSON.stringify(types));
const other=(a.blocks||[]).find(b=>b.id==="other")||{};
chk("the text question is worded by the file",other.label==="Something else"&&other.hint==="In your own words.",JSON.stringify(other));
chk("a module carries no copy tables of its own",m.copy===undefined,JSON.stringify(m.copy));

/* 2. widgets */
const W=t.widgets||[];
chk("both widgets arrive, named by their block ids",W.map(w=>w.id).join()==="body-map,quadrants",W.map(w=>w.id).join());
chk("a widget's words are the file's own, one object, with no language key",W.every(w=>w.copy&&w.copy.h&&!w.copy.en),JSON.stringify(W.map(w=>w.copy)));
chk("the body map block points at its data",a.blocks[1].widget==="body-map"&&a.blocks[1].skippable===undefined);

/* 3. load it the way a reader does, and draw the activity */
A.createBooklet&&0;
A.loadText(EX);
chk("the page adopts it as the booklet",A.BOOK.booklet=== 0.9&&A.allModules().length===1,JSON.stringify({b:A.BOOK.booklet,n:A.allModules().length}));
A.screen="mensio-check-in/check-in";A.render();
const seen=P.texts(P.main());
["A mindful check-in","Body","Feelings","Something else","In your own words.","Mind is thinking about","Notice, name, keep."].forEach(w=>
  chk("the activity shows “"+w+"”",seen.includes(w),seen.slice(0,400)));

/* 4. answer, keep, write, read back */
const d=A.draftFor("mensio-check-in/check-in");
d.body=["chest"];d.emotions=["curiosity"];d.other="the kettle";d.thoughts=["the deadline",""];
A.finalizeEntry("mensio-check-in/check-in");
const kept=A.keptFor("mensio-check-in/check-in");
chk("the check-in is kept as an entry",kept.length===1&&kept[0].other==="the kettle");
chk("blank lines are not kept",JSON.stringify(kept[0].thoughts)==='["the deadline"]',JSON.stringify(kept[0].thoughts));
A.draftFor("mensio-check-in/check-in").other="half a thought";
const out=A.toMarkdown();
chk("the file written opens with the design exactly as read",out.startsWith(EX.replace(/\s+$/,"")),out.slice(0,200));
chk("the records are hidden from Obsidian's reading view",/\n%%\n> \[!records\] App record/.test(out));
chk("they are grouped under the module",out.includes("> [!records|mensio-check-in] A mindful check-in"));
chk("the entry is written, one line per entry",/```booklet entries check-in\n\{"items": \[\n\{[^\n]*"the kettle"[^\n]*\}\n\]\}\n```/.test(out),out.slice(-600));
chk("the unfinished draft is written",/```booklet draft check-in\n\{"other":"half a thought"\}\n```/.test(out),out.slice(-300));
const R2=A.parseFile(out);
chk("the written file reads back with no problems",R2.ok&&R2.unread.length===0,JSON.stringify(R2.unread));
chk("the entry comes back",((R2.S.entries||{})["mensio-check-in/check-in"]||[]).length===1&&R2.S.entries["mensio-check-in/check-in"][0].other==="the kettle");
chk("the draft comes back",(R2.drafts.activities["mensio-check-in/check-in"]||{}).other==="half a thought");
chk("the design comes back as the same text",R2.template.raw.source===R.template.raw.source);
const again=(()=>{P.wipe();const B=P.boot();B.loadText(out);return B.toMarkdown();})();
chk("load, save, load, save changes nothing",again===out,again.length+" vs "+out.length);

/* 5. a new file has no JSON records at all */
chk("the example itself holds no records",!/booklet (answers|entries|draft)/.test(EX)&&!/\[!records/.test(EX));

/* 6. problems are said, and the file still opens */
const bad=EX.replace("> [!module|mensio-check-in end] End of A mindful check-in\n","").replace("> [!text|other]","> [!text]");
const R3=A.parseFile(bad);
chk("an unclosed module is reported",R3.unread.some(x=>/never closed/.test(x)),JSON.stringify(R3.unread));
chk("a question with no id is reported",R3.unread.some(x=>/has no id/.test(x)),JSON.stringify(R3.unread));
chk("a module opened and never closed refuses the file, and says why",R3.ok===false&&R3.refused.length===1&&/never closed/.test(R3.refused[0]),JSON.stringify(R3.refused));
chk("an earlier-format file is not read at all — no compat, no exceptions",
  A.parseFile('---\nbooklet: 1\n---\n\n```json\n{"block":"module"}\n```\n').ok===false);

{const r02=A.parseFile('---\nbooklet: 0.2\ntitle: Old\nlang: en\n---\n\n> [!module|m] M\n');
 chk("a booklet: 0.2 file is refused with the message naming what changed",r02.ok===false&&r02.unread.join(" ")==="front matter says booklet: 0.2; this page reads format 0.9. Change the marker to booklet: 0.9 (and write settings as key:value, for example min:0).",JSON.stringify(r02.unread));}
{const r03=A.parseFile('---\nbooklet: 0.3\ntitle: Old\nlang: en\n---\n\n> [!module|m] M\n');
 chk("a booklet: 0.3 file is refused, naming the marker found and the one to write",r03.ok===false&&r03.unread.join(" ")==="front matter says booklet: 0.3; this page reads format 0.9. Change the marker to booklet: 0.9.",JSON.stringify(r03.unread));
 chk("the refusal is shown in the reader's language, naming the marker",["en","fr","es","es-AR"].every(l=>/booklet: 0\.3/.test(A.STRINGS[l].ui.oldFormat("0.3"))&&/booklet: 0\.9/.test(A.STRINGS[l].ui.oldFormat("0.3"))));
 {const r04=A.parseFile('---\nbooklet: 0.4\ntitle: Old\nlang: en\n---\n\n> [!module|m] M\n');
 chk("a booklet: 0.4 file is refused, naming the marker found and the one to write",r04.ok===false&&r04.unread.join(" ")==="front matter says booklet: 0.4; this page reads format 0.9. Change the marker to booklet: 0.9.",JSON.stringify(r04.unread));}
 {const r05=A.parseFile('---\nbooklet: 0.5\ntitle: Old\nlang: en\n---\n\n> [!module|m] M\n');
 chk("a booklet: 0.5 file is refused, naming the marker found and the one to write",r05.ok===false&&r05.unread.join(" ")==="front matter says booklet: 0.5; this page reads format 0.9. Change the marker to booklet: 0.9.",JSON.stringify(r05.unread));}
 {const r06=A.parseFile('---\nbooklet: 0.6\ntitle: Old\nlang: en\n---\n\n> [!module|m] M\n');
 chk("a booklet: 0.6 file is refused, naming the marker found and the one to write",r06.ok===false&&r06.unread.join(" ")==="front matter says booklet: 0.6; this page reads format 0.9. Change the marker to booklet: 0.9.",JSON.stringify(r06.unread));}
 {const r07=A.parseFile('---\nbooklet: 0.7\ntitle: Old\nlang: en\n---\n\n> [!module|m] M\n');
 chk("a booklet: 0.7 file is refused, naming the marker found and the one to write",r07.ok===false&&r07.unread.join(" ")==="front matter says booklet: 0.7; this page reads format 0.9. Change the marker to booklet: 0.9.",JSON.stringify(r07.unread));}
 {const r08=A.parseFile('---\nbooklet: 0.8\ntitle: Old\nlang: en\n---\n\n> [!module|m] M\n');
 chk("a booklet: 0.8 file is refused, naming the marker found and the one to write",r08.ok===false&&r08.unread.join(" ")==="front matter says booklet: 0.8; this page reads format 0.9. Change the marker to booklet: 0.9.",JSON.stringify(r08.unread));}
 chk("a 0.3 module cannot be added to a booklet",A.moduleTextProblems('---\nbooklet: 0.3\ntitle: Old\nlang: en\n---\n\n> [!module|m] M\n').length===1);}

/* 7. settings on a callout line are written key:value */
{const SET=`---\nbooklet: 0.9\ntitle: Settings\nlang: en\n---\n\n> [!module|set-mod] Settings\n\n> [!activity|set-act repeat] Settings\n\n> [!number|sleep min:0 max:24 step:0.5] Hours slept\n\n> [!multi|morning menu:feelings] This morning I felt\n- [ ] calm\n- [ ] tense\n\n> [!module|set-mod end] End\n`;
 const RS=P.boot().parseFile(SET);
 const bl=((RS.template.modules||[])[0]||{}).mode||{};
 const num=(bl.blocks||[]).find(b=>b.id==="sleep")||{};
 chk("a number question reads min:0 max:24 step:0.5 as its bounds",num.min===0&&num.max===24&&num.step===0.5,JSON.stringify(num));
 const mu=(bl.blocks||[]).find(b=>b.id==="morning")||{};
 chk("a multi with menu:feelings keeps its id and its options (a setting is not read as the id)",mu.type==="multi"&&mu.options&&mu.options.join()==="calm,tense",JSON.stringify(mu));
 const old=P.boot().parseFile(SET.replace("min:0 max:24 step:0.5","min=0 max=24"));
 const on=(((old.template.modules||[])[0]||{}).mode||{}).blocks;
 chk("the old key=value form sets no bounds",!(on||[]).some(b=>b.min!==undefined||b.max!==undefined),JSON.stringify(on));}

P.closePages();
console.log((fails?fails+" of the checks above failed":"all booklet-format checks passed"));
process.exit(fails?1:0);
