// Format v0.11: a version is two whole numbers, never one decimal number (0.10 is later than 0.9), and a file marked
// with another 0.x version opens with a notice.
// Run: node test/version.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const A=P.boot();
const file=(marker,extra="")=>`---\nbooklet: ${marker}\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n${extra}`;
const cmp=A.versionCmp;
chk("the format version is the text 0.11",A.FORMAT_VERSION==="0.11"&&typeof A.FORMAT_VERSION==="string");
chk("0.9 is before 0.10 (as text and as a number a 0.9 save holds)",cmp("0.9","0.10")===-1&&cmp(0.9,"0.10")===-1&&cmp("0.10","0.9")===1);
chk("0.10 equals \"0.10\"; 0.1 is before 0.10 and is not equal to it",cmp("0.10","0.10")===0&&cmp("0.1","0.10")===-1&&cmp(0.1,"0.10")===-1&&cmp("0.10","0.1")===1);
chk("major counts before minor, and something that is not a version compares as nothing",cmp("1.0","0.10")===1&&cmp("0.10","1.0")===-1&&cmp("x","0.10")===null&&cmp(undefined,"0.10")===null&&cmp(null,"0.9")===null&&cmp("0.9.1","0.9")===null);
chk("versionOf reads text and numbers into [major, minor]",JSON.stringify([A.versionOf("0.10"),A.versionOf(0.9),A.versionOf(" 0.8 "),A.versionOf("")])==="[[0,10],[0,9],[0,8],null]");
/* the marker, read as text */
for(const m of ['"0.11"',"'0.11'","0.11"]){const r=A.parseFile(file(m));chk("a file marked booklet: "+m+" loads, with no notice",r.ok&&r.refused.length===0&&r.unread.length===0&&r.template.booklet==="0.11",JSON.stringify(r.unread));}
for(const m of ['"0.10"',"0.1","0.9",'"0.12"',"0.100"]){const r=A.parseFile(file(m)),v=m.replace(/"/g,"");
 chk("a file marked booklet: "+m+" opens by the current rules, and its first problem is the notice",r.ok&&r.refused.length===0&&r.unread[0]===`This file says booklet: ${v}. This page reads format 0.11 and has opened it as it is; some of it may not draw.`&&r.template.booklet==="0.11"&&/^booklet: /m.test(r.template.raw.source)&&r.template.raw.source.includes("booklet: "+m),JSON.stringify(r.unread));}
chk("a marker that is no 0.x version (1.0, 2, 0.9.1, words, none) is refused",["1.0","2","0.9.1","latest",""].every(m=>{const r=A.parseFile(file(m).replace(/booklet: \n/,""));return !r.ok&&!r.template;}));
chk("a module marked 0.9 can be added to a booklet, and the page says so in the toast words",A.moduleTextProblems(file("0.9")).length===0&&/booklet: 0\.9/.test(A.STRINGS.en.booklet.addedOtherMarker("0.9")));
/* what the renderer writes */
(async()=>{
 await A.createBooklet();
 chk("a new booklet's file says booklet: \"0.11\", quoted",/^booklet: "0\.11"$/m.test(A.BOOK.raw.source)&&A.BOOK.booklet==="0.11",A.BOOK.raw.source);
 A.addModuleText(file('"0.11"'));
 chk("and so does the file it writes after a module is added",/^booklet: "0\.11"$/m.test(A.toMarkdown())&&A.parseFile(A.toMarkdown()).ok);
 /* a design saved in the browser by 0.9 holds the number 0.9 */
 const old=P.boot();
 const text=fs.readFileSync(P.R+"/test/fixtures/module-check-in.md","utf8");
 await old.createBooklet();old.addModuleText(text);old.flushSave();
 const id=old.currentId,key="booklet.b."+id;
 const snap=JSON.parse(global.__ls[key]);
 /* make it what 0.9 saved: the number 0.9 in the design, and 0.9 in the marker of its own source text */
 snap.TPL.booklet=0.9;snap.TPL.raw.source=snap.TPL.raw.source.replace(/^booklet: "0\.11"$/m,"booklet: 0.9");
 snap.S.answers={ma:{keep:"x"}};
 global.__ls[key]=JSON.stringify(snap);
 const was=JSON.stringify(snap.S);
 const r=old.rekeyFromV08(JSON.parse(global.__ls[key]));
 chk("a design saved by 0.9 is not re-keyed again",r.TPL.booklet===0.9&&JSON.stringify(r.S)===was,JSON.stringify(r.TPL.booklet));
 P.closePages();
 const B=P.boot();B.openBooklet(id);
 chk("opened, it is marked 0.11 and its own source says so, quoted",B.BOOK.booklet==="0.11"&&/^booklet: "0\.11"$/m.test(B.BOOK.raw.source),B.BOOK.raw.source.slice(0,60));
 chk("its answers are where they were",JSON.stringify(B.STATE.answers)===JSON.stringify({ma:{keep:"x"}}));
 chk("a module can be added to it (it is a 0.11 booklet)",B.addModuleText(fs.readFileSync(P.R+"/test/fixtures/module-daily-journal.md","utf8")).ok);
 chk("what it downloads opens again",B.parseFile(B.toMarkdown()).ok);
 /* a file opened with another marker is kept with the marker it came with, whatever renderer reads it next */
 {P.wipe();const W=P.boot();W.loadText(file("0.6"));W.flushSave();const wid=W.currentId;P.closePages();
  const W2=P.boot();W2.openBooklet(wid);
  chk("a 0.6 file kept in this browser and opened again still says booklet: 0.6 in its own text, and is read as 0.11",/^booklet: 0\.6$/m.test(W2.BOOK.raw.source)&&W2.BOOK.booklet==="0.11"&&/^booklet: 0\.6$/m.test(W2.toMarkdown()),W2.BOOK.raw.source.slice(0,40));
  /* and a design a later renderer finds marked by an earlier one's own version is re-marked only where that renderer wrote it */
  const snap=JSON.parse(global.__ls["booklet.b."+wid]);snap.TPL.booklet="0.10";
  const re=W2.remarkSaved(JSON.parse(JSON.stringify(snap)));
  chk("a design saved by 0.10 holding a 0.6 text is re-marked 0.11 as a design but its own text keeps 0.6",re.TPL.booklet==="0.11"&&/^booklet: 0\.6$/m.test(re.TPL.raw.source),re.TPL.raw.source.slice(0,40));
  const own=JSON.parse(JSON.stringify(snap));own.TPL.raw.source=own.TPL.raw.source.replace(/^booklet: 0\.6$/m,'booklet: "0.10"');
  chk("while a text the earlier renderer wrote itself (0.10) is re-marked 0.11, quoted",/^booklet: "0\.11"$/m.test(W2.remarkSaved(own).TPL.raw.source));}
 /* a design saved by 0.8 is still re-keyed once */
 const o8={TPL:{booklet:0.8,modules:[],raw:{source:""}},S:{answers:{},entries:{}},D:{custom:{}}};
 chk("a design saved by 0.8 is still re-keyed, and ends marked as the version that keys by module",B.rekeyFromV08(o8).TPL.booklet==="0.9");
 /* the linter's flags print what generators outside this repo should write */
 {const run=a=>require("child_process").spawnSync("python3",[P.R+"/lint-booklet.py",a],{encoding:"utf8"});
  const mk=run("--marker"),hp=run("--help");
  chk("--marker prints the front-matter line, quoted, and exits 0",mk.status===0&&mk.stdout==='booklet: "'+A.FORMAT_VERSION+'"\n',JSON.stringify(mk.stdout));
  chk("the line --marker prints is a marker the renderer reads",A.parseFile(file(mk.stdout.trim().replace(/^booklet: /,""))).ok);
  chk("--marker is in --help, and the two flags dropped in 0.11.3 (a format-version flag, a checksum flag) are not",hp.status===0&&/--marker/.test(hp.stdout)&&!/--format-version|--renderer-checksum/.test(hp.stdout));}
 /* the linter */
 const tmp=require("path").join(require("os").tmpdir(),"ver-"+process.pid);fs.mkdirSync(tmp,{recursive:true});
 const lint=(name,t)=>{const f=require("path").join(tmp,name);fs.writeFileSync(f,t);return require("child_process").spawnSync("python3",[P.R+"/lint-booklet.py",f],{encoding:"utf8"});};
 let l=lint("a.md",file('"0.11"'));chk("the linter reads a quoted 0.11 with no warning",l.status===0&&/0 errors · 0 warnings/.test(l.stdout),l.stdout);
 l=lint("b.md",file("0.10"));chk("and warns on an unquoted 0.10, saying to write it in quotes, besides the other-marker warning",l.status===0&&/2 warnings/.test(l.stdout)&&/write it in quotes.*YAML tool will read it as 0\.1\b/.test(l.stdout),l.stdout);
 l=lint("c.md",file("0.9"));chk("and warns, not refuses, on 0.9 and 0.1 (checked as 0.11)",l.status===0&&/booklet: 0\.9; the current format is 0\.11, and it is checked as 0\.11/.test(l.stdout)&&lint("d.md",file("0.1")).status===0&&/booklet: 0\.1; the current format is 0\.11/.test(lint("d.md",file("0.1")).stdout));
 l=lint("e.md",file('"1.0"'));chk("and refuses a marker that is not a 0.x version",l.status!==0&&/a marker is a 0\.x version/.test(l.stdout),l.stdout);
 fs.rmSync(tmp,{recursive:true,force:true});
 P.closePages();
 console.log(fails?"\n"+fails+" FAILURES":"\nversion checks passed");process.exit(fails?1:0);
})();
