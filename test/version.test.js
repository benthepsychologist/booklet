// Format v0.10: a version is two whole numbers, never one decimal number. 0.10 is later than 0.9.
// Run: node test/version.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const A=P.boot();
const file=(marker,extra="")=>`---\nbooklet: ${marker}\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n${extra}`;
const cmp=A.versionCmp;
chk("the format version is the text 0.10",A.FORMAT_VERSION==="0.10"&&typeof A.FORMAT_VERSION==="string");
chk("0.9 is before 0.10 (as text and as a number a 0.9 save holds)",cmp("0.9","0.10")===-1&&cmp(0.9,"0.10")===-1&&cmp("0.10","0.9")===1);
chk("0.10 equals \"0.10\"; 0.1 is before 0.10 and is not equal to it",cmp("0.10","0.10")===0&&cmp("0.1","0.10")===-1&&cmp(0.1,"0.10")===-1&&cmp("0.10","0.1")===1);
chk("major counts before minor, and something that is not a version compares as nothing",cmp("1.0","0.10")===1&&cmp("0.10","1.0")===-1&&cmp("x","0.10")===null&&cmp(undefined,"0.10")===null&&cmp(null,"0.9")===null&&cmp("0.9.1","0.9")===null);
chk("versionOf reads text and numbers into [major, minor]",JSON.stringify([A.versionOf("0.10"),A.versionOf(0.9),A.versionOf(" 0.8 "),A.versionOf("")])==="[[0,10],[0,9],[0,8],null]");
/* the marker, read as text */
for(const m of ['"0.10"',"'0.10'","0.10"]){const r=A.parseFile(file(m));chk("a file marked booklet: "+m+" loads",r.ok&&r.refused.length===0&&r.template.booklet==="0.10",JSON.stringify(r.unread));}
{const r=A.parseFile(file("0.1"));
 chk("a file marked 0.1 is refused as the old format 0.1, not read as 0.10",!r.ok&&r.oldMarker==="0.1"&&/booklet: 0\.1;/.test(r.unread.join(" ")),JSON.stringify(r));
 const q=A.parseFile(file('"0.1"'));chk("and so is one marked \"0.1\"",!q.ok&&q.oldMarker==="0.1");}
{const r=A.parseFile(file("0.9"));
 chk("a file marked 0.9 is refused, naming the marker found and the one to write",!r.ok&&r.oldMarker==="0.9"&&r.unread.join(" ")==='front matter says booklet: 0.9; this page reads format 0.10. Change the marker to booklet: "0.10".',JSON.stringify(r.unread));
 chk("a 0.9 module cannot be added to a booklet",A.moduleTextProblems(file("0.9")).length===1);}
chk("a marker that is neither (0.100, 0.11, 1.0) is not this format and not an old one",["0.100","0.11","1.0"].every(m=>{const r=A.parseFile(file(m));return !r.ok&&!r.oldMarker;}));
/* what the renderer writes */
(async()=>{
 await A.createBooklet();
 chk("a new booklet's file says booklet: \"0.10\", quoted",/^booklet: "0\.10"$/m.test(A.BOOK.raw.source)&&A.BOOK.booklet==="0.10",A.BOOK.raw.source);
 A.addModuleText(file('"0.10"'));
 chk("and so does the file it writes after a module is added",/^booklet: "0\.10"$/m.test(A.toMarkdown())&&A.parseFile(A.toMarkdown()).ok);
 /* a design saved in the browser by 0.9 holds the number 0.9 */
 const old=P.boot();
 const text=fs.readFileSync(P.R+"/test/fixtures/module-check-in.md","utf8");
 await old.createBooklet();old.addModuleText(text);old.flushSave();
 const id=old.currentId,key="booklet.b."+id;
 const snap=JSON.parse(global.__ls[key]);
 /* make it what 0.9 saved: the number 0.9 in the design, and 0.9 in the marker of its own source text */
 snap.TPL.booklet=0.9;snap.TPL.raw.source=snap.TPL.raw.source.replace(/^booklet: "0\.10"$/m,"booklet: 0.9");
 snap.S.answers={ma:{keep:"x"}};
 global.__ls[key]=JSON.stringify(snap);
 const was=JSON.stringify(snap.S);
 const r=old.rekeyFromV08(JSON.parse(global.__ls[key]));
 chk("a design saved by 0.9 is not re-keyed again",r.TPL.booklet===0.9&&JSON.stringify(r.S)===was,JSON.stringify(r.TPL.booklet));
 P.closePages();
 const B=P.boot();B.openBooklet(id);
 chk("opened, it is marked 0.10 and its own source says so, quoted",B.BOOK.booklet==="0.10"&&/^booklet: "0\.10"$/m.test(B.BOOK.raw.source),B.BOOK.raw.source.slice(0,60));
 chk("its answers are where they were",JSON.stringify(B.STATE.answers)===JSON.stringify({ma:{keep:"x"}}));
 chk("a module can be added to it (it is a 0.10 booklet)",B.addModuleText(fs.readFileSync(P.R+"/test/fixtures/module-daily-journal.md","utf8")).ok);
 chk("what it downloads opens again",B.parseFile(B.toMarkdown()).ok);
 /* a design saved by 0.8 is still re-keyed once */
 const o8={TPL:{booklet:0.8,modules:[],raw:{source:""}},S:{answers:{},entries:{}},D:{custom:{}}};
 chk("a design saved by 0.8 is still re-keyed, and ends marked as the version that keys by module",B.rekeyFromV08(o8).TPL.booklet==="0.9");
 /* the linter */
 const tmp=require("path").join(require("os").tmpdir(),"ver-"+process.pid);fs.mkdirSync(tmp,{recursive:true});
 const lint=(name,t)=>{const f=require("path").join(tmp,name);fs.writeFileSync(f,t);return require("child_process").spawnSync("python3",[P.R+"/lint-booklet.py",f],{encoding:"utf8"});};
 let l=lint("a.md",file('"0.10"'));chk("the linter reads a quoted 0.10 with no warning",l.status===0&&/0 errors · 0 warnings/.test(l.stdout),l.stdout);
 l=lint("b.md",file("0.10"));chk("and warns on an unquoted 0.10, saying to write it in quotes",l.status===0&&/1 warnings?/.test(l.stdout)&&/write it in quotes.*YAML tool will read it as 0\.1/.test(l.stdout),l.stdout);
 l=lint("c.md",file("0.9"));chk("and refuses 0.9 and 0.1 as old formats",l.status!==0&&/booklet: 0\.9; this is format 0\.10/.test(l.stdout)&&lint("d.md",file("0.1")).status!==0&&/booklet: 0\.1; this is format 0\.10/.test(lint("d.md",file("0.1")).stdout));
 fs.rmSync(tmp,{recursive:true,force:true});
 P.closePages();
 console.log(fails?"\n"+fails+" FAILURES":"\nversion checks passed");process.exit(fails?1:0);
})();
