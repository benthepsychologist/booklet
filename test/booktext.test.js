// The design text a save keeps is the writer's text of the booklet in force (0.16 trim pass).
//
// bookText, the booklet's text with no records that the browser's own copy keeps on every save, is worked out once per
// booklet and kept (BOOK_TEXT), not written again on each save. This pins that the kept text is never stale: after every
// way the design changes (a file opened, a module added, removed or renamed, the booklet renamed, a text adopted with a
// region, a reload), and after the reader's own work changes, it equals a fresh fileText of the booklet in force with no
// records. Invented content.
//
// Run: node test/booktext.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const show=s=>JSON.stringify(String(s).slice(0,200));
const FM=t=>'---\nbooklet: "0.16"\ntitle: '+t+'\nlang: en\n---\n\n';
const HEAD="> [!records] App record — do not edit below this line";
const POND="> [!module|pond] Pond\n\n> [!activity|frogs repeat] Frog count\n\n> [!number|n] How many frogs?\n\n> [!module|pond end] End\n";
const SHED="> [!module|shed] Shed\n\n> [!activity|tools] Tools\n\n> [!text|kept] Which tools are in the shed?\n\n> [!module|shed end] End\n";
const FILE=FM("Garden notes")+POND+"\n%%\n"+HEAD+"\n\n> [!records|pond] Pond\n\n```booklet entries frogs\n{\"items\": [\n"+
  "  {\"ts\": \"2026-05-02T08:00:00Z\", \"n\": 3},\n  {\"ts\": \"2026-05-01T08:00:00Z\", \"n\": 1}\n]}\n```\n%%\n";
const BEES=FM("Bees")+"> [!module|bees] Bees\n\n> [!activity|hive] Hive\n\n> [!text|seen] What did the bees do?\n\n> [!module|bees end] End\n";

/* the text a save keeps, against a fresh writer's text of the booklet in force; and the copy saved holds the same */
const fresh=A=>A.fileText(A.BOOK,A.emptyState(),A.emptyDrafts());
const kept=A=>{A.flushSave();const o=JSON.parse(global.__ls["booklet.b."+A.currentId]||"{}");return o.text;};
function same(A,label){const f=fresh(A),t=A.bookText(A.BOOK);
  chk(label+": the design text is a fresh fileText of the booklet in force",t===f,show(t)+" / "+show(f));
  A.markDirty();const k=kept(A);
  chk(label+": and the browser's copy keeps that text",k===f,show(k));
  return f;}

(async()=>{
 P.wipe();let A=P.boot();A.loadText(FILE);
 const first=same(A,"a file opened");
 chk("set up: the text holds the design and none of the records",/Frog count/.test(first)&&!/2026-05-02/.test(first),show(first));
 chk("asked again, it is the same text",A.bookText(A.BOOK)===first);

 A.STATE.entries["pond/frogs"].push({ts:"2026-05-03T08:00:00.000Z",n:5});A.markDirty();
 same(A,"after the reader keeps an entry");

 {const r=A.addModuleText(FM("Shed")+SHED);chk("set up: a module is added",!!r&&r.ok,JSON.stringify(r&&r.problems));}
 const added=same(A,"a module added");
 chk("the text is the new design's, not the one kept before",added!==first&&/Which tools are in the shed/.test(added),show(added));

 chk("set up: a module is removed",A.removeModule("shed").ok);
 const removed=same(A,"a module removed");
 chk("the text drops the removed module",!/Which tools are in the shed/.test(removed),show(removed));

 chk("set up: the booklet is renamed",A.renameBooklet("Garden diary")===true);
 const renamed=same(A,"the booklet renamed");
 chk("the text carries the new title",/title: "?Garden diary/.test(renamed),show(renamed));

 {A.flushSave();const o=JSON.parse(global.__ls["booklet.b."+A.currentId]);
  const R=A.adoptText(o.text,o.region);chk("set up: the kept text is adopted again, with its kept region",!!R&&typeof o.region==="string");}
 same(A,"a text adopted with its region");

 {const id=A.currentId;A.markDirty();A.flushSave();P.closePages();const B=P.boot();B.openBooklet(id);
  chk("set up: the booklet is opened again from the browser's copy",!!B.BOOK&&B.BOOK.title==="Garden diary");
  same(B,"a reload");A=B;}

 A.loadText(BEES);
 const other=same(A,"another file opened");
 chk("the text is the other file's",/What did the bees do/.test(other)&&!/Frog count/.test(other),show(other));

 P.wipe();
 console.log(fails?"\n"+fails+" FAILURES":"\nall design-text-kept checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
