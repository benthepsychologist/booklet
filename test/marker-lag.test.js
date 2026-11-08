// The renderer lags the format (v0.20.x): a file or module marked with any 0.x version, earlier or later, opens by the
// renderer's own rules and says nothing about its marker. What the renderer cannot read is still reported one thing at a
// time; a file with no 0.x marker is still refused; the file is saved back with the marker it came with.
// Run: node test/marker-lag.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const LATER=fs.readFileSync(P.R+"/test/fixtures/marker-later.booklet.md","utf8");
const file=(marker,lang="en")=>`---\nbooklet: ${marker}\ntitle: T\nlang: ${lang}\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n`;
const A=P.boot();
const marked=r=>r.unread.some(p=>/booklet: 0\.\d+/.test(String(p))||/format 0\.20/.test(String(p)));

/* any 0.x marker, in every language: opens, and nothing is said about it */
for(const l of ["en","fr","es"]) for(const m of ["0.9","0.17","0.18","0.20","0.99"]){
 const r=A.parseFile(file(`"${m}"`,l));
 chk(`${l}: a file marked ${m} opens with no problem at all`,r.ok&&r.refused.length===0&&r.unread.length===0,JSON.stringify(r.unread));}
chk("a file with no marker, or a marker that is not a 0.x version, is still refused",["","1.0","2","latest","0.9.1"].every(m=>{const r=A.parseFile(file(m).replace(/booklet: \n/,""));return r.ok===false&&!r.template;}));
{const bad=A.parseFile('---\nbooklet: "0.99"\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n');
 chk("a rule that refuses a file refuses it whatever the marker: an unclosed module in a 0.99 file",bad.ok===false&&/never closed/.test(bad.refused[0]||""),JSON.stringify(bad.refused));
 const dup=A.parseFile('---\nbooklet: "0.99"\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!text|q] Q again\n\n> [!module|m end] End\n');
 chk("...and an id used twice in a module in a 0.99 file",dup.ok===false&&dup.refused.length>0,JSON.stringify(dup.refused));}

/* a made-up 0.99 file: what the renderer cannot read is reported one item at a time, and nothing about the marker */
{const r=A.parseFile(LATER),words=r.unread.map(p=>String(p));
 chk("the 0.99 file opens, with no refusal",r.ok&&r.refused.length===0,JSON.stringify(r.refused));
 chk("it reports exactly three things, each its own problem",words.length===3,JSON.stringify(words));
 chk("...an unknown kind",words.filter(w=>/does not know the kind “video”/.test(w)).length===1,JSON.stringify(words));
 chk("...a setting a kind does not take",words.filter(w=>/number line takes no “mx:”/.test(w)).length===1,JSON.stringify(words));
 chk("...a query key it does not have",words.filter(w=>/query has no setting “sort”/.test(w)).length===1,JSON.stringify(words));
 chk("...and not a word about the marker",!marked(r)&&!words.some(w=>/0\.99/.test(w)));
 chk("the file keeps the marker it came with in its own text",r.template.booklet==="0.20"&&/^booklet: "0\.99"$/m.test(r.template.raw.source));}

(async()=>{
 const B=P.boot();
 B.loadText(LATER);
 chk("loaded in the page, a 0.99 file lists three problems and none is about its marker",!!B.FILE_NOTES&&B.FILE_NOTES.list.length===3&&B.FILE_NOTES.marker===undefined&&!B.FILE_NOTES.list.some(p=>/0\.99/.test(String(p))),JSON.stringify(B.FILE_NOTES&&B.FILE_NOTES.list.map(String)));
 const out=B.toMarkdown();
 chk("saved back, it still says booklet: \"0.99\"",/^booklet: "0\.99"$/m.test(out)&&!/^booklet: "0\.20"$/m.test(out),out.slice(0,60));
 chk("...and its records are written back as they were",out.includes('{"items": [{"ts": "2026-11-03T09:00:00Z", "note": "Quiet morning", "hours": 4}]}'));
 chk("...and what is saved opens again, the same three things",B.parseFile(out).ok&&B.parseFile(out).unread.length===3);
 /* adding a module marked 0.99 to a booklet: allowed, and no toast suffix */
 const C=P.boot();await C.createBooklet();
 const mod=file('"0.99"');
 chk("a module marked 0.99 is allowed in",C.moduleTextProblems(mod).length===0);
 chk("a module marked 0.99 is added",C.addModuleText(mod).ok);
 chk("and the booklet keeps its own current marker",/^booklet: "0\.20"$/m.test(C.toMarkdown()),C.toMarkdown().slice(0,60));
 P.closePages();
 console.log(fails?"\n"+fails+" FAILURES":"\nmarker-lag checks passed");process.exit(fails?1:0);
})();
