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
chk("it is marked v0.11",t.booklet==="0.11");
chk("its one language is declared",JSON.stringify(t.languages)==='["en"]');
chk("one module, from the module fence",(t.modules||[]).length===1&&t.modules[0].id==="mensio-check-in",JSON.stringify((t.modules||[]).map(m=>m.id)));
const m=(t.modules||[])[0]||{};
chk("the module's blurb is its opening paragraph",m.blurb==="Body, feelings, thoughts — noticed, named, kept.",m.blurb);
chk("the module carries its notice from the front matter of a one-module file",m.notice&&/Armstrong/.test(m.notice.copyright)&&!m.rights);
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
chk("the page adopts it as the booklet",A.BOOK.booklet==="0.11"&&A.allModules().length===1,JSON.stringify({b:A.BOOK.booklet,n:A.allModules().length}));
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

/* a file marked with another 0.x version opens by the current rules, with a notice first in its problems; a
   condition that refuses a file still refuses it, whatever the marker */
{const FILE=m=>'---\nbooklet: '+m+'\ntitle: Old\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n';
 for(const v of ["0.2","0.3","0.4","0.5","0.6","0.7","0.8","0.9","0.12"]){
  const r=A.parseFile(FILE(v));
  chk(`a booklet: ${v} file opens, and its first problem says which marker it carries and what this page did`,r.ok===true&&r.refused.length===0&&r.unread[0]===`This file says booklet: ${v}. This page reads format 0.11 and has opened it as it is; some of it may not draw.`,JSON.stringify(r.unread));
  chk(`  it is saved back with the marker it came with (${v})`,new RegExp("^booklet: "+v.replace(".","\\.")+"$","m").test(r.template.raw.source)&&r.template.booklet==="0.11");}
 const bad=A.parseFile('---\nbooklet: 0.3\ntitle: Old\nlang: en\n---\n\n> [!module|m] M\n');
 chk("a module opened and never closed still refuses a 0.3 file, whatever the marker",bad.ok===false&&bad.refused.length===1&&/never closed/.test(bad.refused[0])&&/booklet: 0\.3/.test(bad.unread[0]),JSON.stringify(bad.unread));
 chk("the notice is worded in every language, naming the marker and this page's format",["en","fr","es","es-AR"].every(l=>/booklet: 0\.3/.test(A.STRINGS[l].problem.otherMarker("0.3"))&&/0\.11/.test(A.STRINGS[l].problem.otherMarker("0.3"))));
 chk("a file with no marker, or a marker that is not a 0.x version, is not a booklet for this page",["",'booklet: "1.0"\n',"booklet: 2\n","booklet: latest\n","booklet: 0.9.1\n"].every(m=>{const r=A.parseFile('---\n'+m+'title: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n');return r.ok===false&&!r.template;}));
 chk("a 0.3 module can be added to a booklet",A.moduleTextProblems(FILE("0.3")).length===0);
 chk("a module with no marker cannot",A.moduleTextProblems(FILE("0.3").replace("booklet: 0.3\n","")).length===1);
 {const old=P.boot();old.loadText(FILE("0.6"));
  const r=old.addModuleText(FILE("0.4").replace(/\|m\b/g,"|n"));
  chk("a booklet read from a 0.6 file takes a module marked 0.4, and still says 0.6",r.ok&&/^booklet: 0\.6$/m.test(old.toMarkdown()),JSON.stringify(r));}
 {const used=P.boot();used.parseFile(FILE("0.6"));
  chk("a 0.6 file that uses the removed query key `title:` opens with that key reported",(()=>{const q=P.boot().parseFile('---\nbooklet: 0.6\ntitle: Old\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|log repeat] Log\n\n> [!text|q] Q\n\n> [!activity|look] Look\n\n```booklet query\nfrom: log\ntitle: Things\n```\n\n> [!module|m end] End\n');
   return q.ok&&q.unread.length>=2&&/booklet: 0\.6/.test(q.unread[0])&&q.unread.slice(1).some(x=>/title/.test(x));})());}
}

/* 7. settings on a callout line are written key:value */
{const SET=`---\nbooklet: "0.11"\ntitle: Settings\nlang: en\n---\n\n> [!module|set-mod] Settings\n\n> [!activity|set-act repeat] Settings\n\n> [!number|sleep min:0 max:24 step:0.5] Hours slept\n\n> [!multi|morning menu:feelings] This morning I felt\n- [ ] calm\n- [ ] tense\n\n> [!module|set-mod end] End\n`;
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
