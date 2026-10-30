// A booklet is written back as it was read (0.16, SPEC section 8).
//
// A save changes only what the reader changed. A record the reader did not change comes back byte for byte: nothing is
// re-sorted, nothing respaced, and the body's trailing blank lines, the file's line endings and a byte order mark stay.
// The Obsidian plugin's records writer (booklet-obsidian, src/core/write.ts and its byte-identity tests) is the model.
// Every example and every fixture the renderer opens is read and written with no change; then hand-spaced records,
// entries out of order, Windows line endings, trailing blank lines and a byte order mark are changed one value at a time,
// and the file must differ only there. The same holds through the browser's own copy and Add, Remove and Rename.
//
// Run: node test/writeback.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const load=text=>{P.wipe();const A=P.boot();A.loadText(text);return A;};
const show=s=>JSON.stringify(String(s).slice(-260));
const FM='---\nbooklet: "0.17"\ntitle: Weather notes\nlang: en\n---\n';
const BODY=FM+"\n> [!activity|a1] Today's sky\n\n> [!text|q1] What colour was the sky?\n\n> [!text|q2] Which way was the wind?\n\n"+
  "> [!text|q3] Anything else?\n\n> [!activity|d1 repeat] Rain log\n\n> [!text|n] How much rain?\n";
const HEAD="> [!records] App record — do not edit below this line";
/* records as a person might space them by hand: members on one line with odd gaps, entries indented and out of order, no
   blank line before the closing `%%` */
const REGION="%%\n"+HEAD+"\n\n```booklet answers\n{\"q1\":\"grey\",   \"q2\": \"west\"}\n```\n\n```booklet entries d1\n{\"items\": [\n"+
  "  {\"ts\": \"2026-09-02T10:00:00Z\", \"n\": \"a little\"},\n  {\"ts\": \"2026-09-01T10:00:00Z\", \"n\": \"none\"}\n]}\n```\n%%\n";
const HAND=BODY+"\n\n"+REGION;
const ITEMS='  {"ts": "2026-09-02T10:00:00Z", "n": "a little"},\n  {"ts": "2026-09-01T10:00:00Z", "n": "none"}';

/* ---- every example and every fixture the renderer opens: no change, no difference ---- */
{const files=[...fs.readdirSync(P.R+"/examples").filter(f=>f.endsWith(".md")).map(f=>"examples/"+f),
   ...fs.readdirSync(P.R+"/test/fixtures").filter(f=>f.endsWith(".md")).map(f=>"test/fixtures/"+f)];
 const differ=[],moved=[];let n=0;
 for(const f of files){const t=fs.readFileSync(P.R+"/"+f,"utf8");P.wipe();const A=P.boot(),R=A.parseFile(t);
   if(!R.template||!R.ok) continue;
   /* a file with design after its records is the one case written otherwise: that design moves above them (section 8) */
   if(R.unread.some(p=>/moved above/.test(String(p)))){moved.push(f);continue;}
   A.loadText(t);n++;if(A.toMarkdown()!==t) differ.push(f);}
 chk("every example is opened and written back byte for byte",files.filter(f=>f.startsWith("examples/")).every(f=>!differ.includes(f))&&n>5,differ.join());
 chk("and so is every fixture the renderer opens ("+n+" files; "+moved.length+" with design after their records left out)",!differ.length,differ.join());}

/* ---- through the browser's own copy: what a reload writes is what the file was ---- */
for(const f of fs.readdirSync(P.R+"/examples").filter(f=>f.endsWith(".md"))){const t=fs.readFileSync(P.R+"/examples/"+f,"utf8");
  const A=load(t);A.markDirty();A.flushSave();const id=A.currentId;P.closePages();const B=P.boot();B.openBooklet(id);
  chk("after a reload, "+f+" is written back byte for byte",B.toMarkdown()===t,show(B.toMarkdown()));}

/* ---- hand-spaced records: only the changed member differs ---- */
{const A=load(HAND);
 chk("hand-spaced records: written back byte for byte",A.toMarkdown()===HAND,show(A.toMarkdown()));
 A.answersIn("").q2="south";
 chk("a changed answer changes that member and nothing else",A.toMarkdown()===HAND.replace('"q2": "west"','"q2": "south"'),show(A.toMarkdown()));
 A.answersIn("").q2="west";
 chk("changed back, the file is as it was",A.toMarkdown()===HAND);
 A.answersIn("").q3="a rainbow";
 chk("a new answer goes after the last member, in the block's own spacing",A.toMarkdown()===HAND.replace('"q2": "west"}','"q2": "west",   "q3": "a rainbow"}'),show(A.toMarkdown()));
 A.answersIn("").q3="";A.answersIn("").q1="";
 chk("a cleared answer takes out that member and its separator, nothing else",A.toMarkdown()===HAND.replace('"q1":"grey",   ',''),show(A.toMarkdown()));}

/* ---- entries out of order: never re-sorted ---- */
{const A=load(HAND);
 A.draftFor("d1").n="a lot";A.finalizeEntry("d1");const o=A.toMarkdown(),e=A.STATE.entries.d1,z=e[e.length-1];
 chk("a new entry is added after the last one, the kept ones as written and in their order (not sorted by ts)",
   z.n==="a lot"&&o===HAND.replace(ITEMS,ITEMS+",\n  "+JSON.stringify(z)),show(o));}
{const A=load(HAND);A.STATE.entries.d1[1].n="a drop";A.markDirty();
 chk("a changed entry is rewritten in its place, every other entry as written",A.toMarkdown()===HAND.replace('{"ts": "2026-09-01T10:00:00Z", "n": "none"}','{"ts":"2026-09-01T10:00:00Z","n":"a drop"}'),show(A.toMarkdown()));}
{const A=load(HAND);A.STATE.entries.d1.splice(0,1);A.markDirty();
 chk("a deleted entry goes with its separator, the rest as written",A.toMarkdown()===HAND.replace('  {"ts": "2026-09-02T10:00:00Z", "n": "a little"},\n',''),show(A.toMarkdown()));}

/* ---- Windows line endings ---- */
{const W=HAND.replace(/\n/g,"\r\n"),A=load(W);
 chk("a file with Windows line endings is written back byte for byte",A.toMarkdown()===W,show(A.toMarkdown()));
 A.answersIn("").q2="south";
 chk("a change keeps them",A.toMarkdown()===W.replace('"q2": "west"','"q2": "south"'),show(A.toMarkdown()));
 A.draftFor("d1").n="started";A.markDirty();const o=A.toMarkdown();
 chk("a new block is written with them too: no line ends in a bare newline",/```booklet draft d1\r\n/.test(o)&&!/[^\r]\n/.test(o),show(o));}

/* ---- trailing blank lines ---- */
{const T=BODY+"\n\n\n",A=load(T);
 chk("a body ending in blank lines and no records is written back byte for byte",A.toMarkdown()===T);
 A.answersIn("").q1="blue";const o=A.toMarkdown();
 chk("with an answer, the body comes back with its blank lines, the records after them",o.startsWith(T)&&o.slice(T.length).startsWith("%%\n"+HEAD+"\n")&&A.parseFile(o).S.answers[""].q1==="blue",show(o));
 A.answersIn("").q1="";
 chk("cleared again, it is as it was",A.toMarkdown()===T);}
{const T=BODY,A=load(T);A.answersIn("").q1="blue";const o=A.toMarkdown();
 chk("a body ending in no blank line gets one before the records it is given, and nothing else changes",o.startsWith(T+"\n%%\n"),show(o));}
{const T=HAND+"\n\n",A=load(T);
 chk("blank lines after the records are written back as they are",A.toMarkdown()===T);
 A.answersIn("").q2="south";
 chk("and a change keeps them",A.toMarkdown()===T.replace('"q2": "west"','"q2": "south"'));}
{const T=BODY+"\n\n\n\n"+REGION,A=load(T);A.answersIn("").q2="south";
 chk("blank lines between the body and the records are kept",A.toMarkdown()===T.replace('"q2": "west"','"q2": "south"'));}

/* ---- a byte order mark ---- */
{const B="﻿"+HAND,A=load(B);
 chk("a file starting with a byte order mark is written back byte for byte",A.toMarkdown()===B);
 A.answersIn("").q2="south";
 chk("and a change keeps it",A.toMarkdown()===B.replace('"q2": "west"','"q2": "south"'));}

/* ---- the browser's copy, Rename, Add and Remove a module ---- */
{let A=load(HAND);A.answersIn("").q2="south";A.markDirty();A.flushSave();const id=A.currentId,want=HAND.replace('"q2": "west"','"q2": "south"');
 P.closePages();A=P.boot();A.openBooklet(id);
 chk("after a reload, a changed booklet is written as before the reload",A.toMarkdown()===want,show(A.toMarkdown()));
 const region=t=>t.slice(t.indexOf("\n%%\n"));
 chk("renamed, only the title changes: the records as written",A.renameBooklet("Sky and rain")&&region(A.toMarkdown())===region(want)&&/title: "?Sky and rain/.test(A.toMarkdown()),show(A.toMarkdown()));
 const MOD=fs.readFileSync(P.R+"/test/fixtures/module-daily-journal.md","utf8");
 chk("a module added",A.addModuleText(MOD).ok);
 chk("with a module added, the records are as written, the body's trailing blank lines before them as read",region(A.toMarkdown())===region(want)&&/End of Daily journal\n\n\n%%\n/.test(A.toMarkdown()),show(A.toMarkdown()));
 chk("and removed again, they are still as written",A.removeModule("example-daily-journal").ok&&region(A.toMarkdown())===region(want),show(A.toMarkdown()));
 A.flushSave();const id2=A.currentId;P.closePages();A=P.boot();A.openBooklet(id2);
 chk("and so after a reload",region(A.toMarkdown())===region(want),show(A.toMarkdown()));}

/* ---- two blocks for one scope: a change goes where it is read last ---- */
{const T=BODY+"\n%%\n"+HEAD+"\n\n```booklet answers\n{\"q1\": \"grey\"}\n```\n\n```booklet answers\n{\"q2\": \"west\"}\n```\n\n%%\n",A=load(T);
 chk("two answers blocks: written back byte for byte",A.toMarkdown()===T);
 A.answersIn("").q3="hail";
 chk("a new answer goes into the last block, the first as written",A.toMarkdown()===T.replace('{"q2": "west"}','{"q2": "west", "q3": "hail"}'),show(A.toMarkdown()));}

/* ---- clear one answer and set another in one save: the block keeps its own layout ---- */
{const T=BODY+"\n%%\n"+HEAD+"\n\n```booklet answers\n{\"q1\": \"grey\"}\n```\n\n%%\n",A=load(T);
 A.answersIn("").q2="west";A.answersIn("").q1="";
 chk("a one-member block whose member is cleared as another is set stays on one line",A.toMarkdown()===T.replace('{"q1": "grey"}','{"q2": "west"}'),show(A.toMarkdown()));}

/* ---- a records block left open at the end of the file (cut short, a hand edit): a change goes inside it ---- */
for(const [name,tail] of [["ending in a newline",'{"q1": "grey"}\n'],["with no final newline",'{"q1": "grey"}'],["across lines, with no final newline",'{\n "q1": "grey",\n "q2": "west"\n}']]){
  const T=BODY+"\n%%\n"+HEAD+"\n\n```booklet answers\n"+tail,A=load(T);
  chk("an answers block left open, "+name+": read, and written back byte for byte",A.peekAnswers("").q1==="grey"&&A.toMarkdown()===T);
  A.answersIn("").q1="blue";const o=A.toMarkdown();
  chk("  a change is made in its place, nothing else differs",o===T.replace('"grey"','"blue"'),show(o.slice(-60)));
  chk("  and reads back",load(o).peekAnswers("").q1==="blue");
  let u=T;for(let k=0;k<3;k++){const C=load(u);C.answersIn("").q1="v"+k;u=C.toMarkdown();}
  chk("  three saves in a row do not grow it",u===T.replace('"grey"','"v2"'),show(u.slice(-60)));
  const D=load(T);D.answersIn("").q1="";D.answersIn("").q2="";const c=D.toMarkdown();
  chk("  every answer cleared stays cleared when the file is read again",!load(c).peekAnswers("").q1&&!load(c).peekAnswers("").q2&&!/booklet answers/.test(c),show(c.slice(-60)));}
{const T=BODY+"\n%%\n"+HEAD+"\n\n```booklet entries d1\n{\"items\": [\n"+ITEMS+"\n]}",A=load(T);
 A.draftFor("d1").n="a lot";A.finalizeEntry("d1");const o=A.toMarkdown(),e=A.STATE.entries.d1,z=e[e.length-1];
 chk("an entries block left open: a new entry goes after the last, nothing else differs",o===T.replace(ITEMS,ITEMS+",\n  "+JSON.stringify(z)),show(o.slice(-120)));
 chk("  and all three are read back",(load(o).STATE.entries.d1||[]).length===3);}
{const T=BODY+"\n%%\n"+HEAD+"\n\n```booklet answers\n{\"q1\": \"grey\"}\n",A=load(T);
 A.draftFor("d1").n="started";A.markDirty();const o=A.toMarkdown();
 chk("an answers block left open, with a block written after it: closed with its own mark first, its lines as written",o.startsWith(T+"```\n")&&load(o).DRAFTS.custom.d1.n==="started"&&load(o).peekAnswers("").q1==="grey",show(o.slice(-120)));}

/* ---- Remove a module whose records line is the region's only one: the region goes, and stays gone ---- */
{const MA="> [!module|herbs] Herbs\n\n> [!activity|h1] Herb bed\n\n> [!text|basil] Basil?\n\n> [!module|herbs end] End of Herbs\n";
 const MB="> [!module|roots] Roots\n\n> [!activity|r1] Root bed\n\n> [!text|carrot] Carrots?\n\n> [!module|roots end] End of Roots\n";
 const T=FM+"\n"+MA+"\n"+MB+"\n%%\n> [!records|herbs] Herbs\n\n```booklet answers\n{\"basil\": \"yes\"}\n```\n\n%%\n";
 let A=load(T);const cnt=s=>(s.match(/^%%$/gm)||[]).length;
 chk("Remove a module whose records line is the region's only one",A.removeModule("herbs").ok);
 A.flushSave();const id=A.currentId,seen=[cnt(A.toMarkdown())];
 for(let i=0;i<3;i++){P.closePages();A=P.boot();A.openBooklet(id);A.markDirty();A.flushSave();seen.push(cnt(A.toMarkdown()));}
 chk("  leaves no `%%` line in the file, after it or after each of three reloads",seen.every(n=>n===0),seen.join());
 /* the body's own trailing blank lines stay through a Remove */
 const U=FM+"\n"+MA+"\n"+MB+"\n\n\n"+"%%\n"+HEAD+"\n\n> [!records|roots] Roots\n\n```booklet answers\n{\"carrot\": \"few\"}\n```\n\n%%\n",B=load(U);
 chk("Remove a module keeps the body's trailing blank lines and the other module's records as written",B.removeModule("herbs").ok&&B.toMarkdown()===U.replace(MA+"\n",""),show(B.toMarkdown()));}

/* ---- a `repeat daily` activity drawn with today's entry: nothing the reader did not change is written ---- */
{const M="> [!activity|hlog repeat daily] Herb log\n\n> [!text|cut] Cut today?\n";
 const T=FM+"\n"+M+"\n%%\n"+HEAD+"\n\n```booklet entries hlog\n{\"items\": [\n  {\"ts\": \""+new Date().toISOString()+"\", \"cut\": \"some\"}\n]}\n```\n\n%%\n";
 const A=load(T);A.screen="hlog";A.render();
 chk("a daily activity drawn with today's entry in its fields: an untouched save is byte for byte",A.draftFor("hlog").cut==="some"&&A.toMarkdown()===T,show(A.toMarkdown().slice(-120)));
 A.markDirty();A.flushSave();const id=A.currentId;P.closePages();let B=P.boot();B.openBooklet(id);
 chk("  and so after a reload",B.toMarkdown()===T,show(B.toMarkdown().slice(-120)));
 B.screen="hlog";B.render();B.draftFor("hlog").cut="more";B.markDirty();
 chk("  once the reader changes it, the draft is written",B.parseFile(B.toMarkdown()).drafts.activities.hlog.cut==="more");}

P.closePages();
if(fails){console.log("\n"+fails+" FAILURES");process.exitCode=1;}else console.log("\nall write-back checks passed");
