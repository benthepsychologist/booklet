// Format 0.13 (renderer 0.13.0), item v013-format-rules: what a reader keeps (D1), bare activities as one nameless module (D2),
// the id as the first word (D3), the front matter and the module notice (D6), a reference across modules (D8), unknown
// front-matter keys (D9), `[!row|end]` (D11), colour names (D12) and `group` (D13). Drawn pictures are test/format013-browser.js.
// Run: node test/format013.test.js      (Needs node and python3; nothing to install.)
const P=require("./page.js");
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const FM='---\nbooklet: "0.13"\ntitle: T\nlang: en\n---\n\n';
const REC="\n%%\n> [!records] App record — do not edit below this line\n\n";
const fence=(info,body)=>"```"+info+"\n"+body+"\n```\n\n";
/* the records a written file holds: [{scope, info, code}] in file order, read the way the format says (a fence after a records line) */
const recordsOf=md=>{const out=[];let scope="";const lines=md.split("\n");let i=lines.findIndex(l=>/^> \[!records\]/.test(l));if(i<0) return out;
  for(;i<lines.length;i++){const m=lines[i].match(/^> \[!records(?:\|([^\] ]+))?\]/);if(m){scope=m[1]||"";continue;}
    if(/^```booklet /.test(lines[i])){let j=i+1;while(j<lines.length&&lines[j]!=="```") j++;out.push({scope,info:lines[i].slice(3),code:lines.slice(i+1,j).join("\n")});i=j;}}
  return out;};
const answersOf=(md,scope)=>{const r=recordsOf(md).find(x=>x.info==="booklet answers"&&x.scope===scope);return r?JSON.parse(r.code):null;};
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"f013-"));
let nTmp=0;
const lint=text=>{const f=path.join(TMP,"t"+(++nTmp)+".md");fs.writeFileSync(f,text);
  const r=spawnSync("python3",[path.join(P.R,"lint-booklet.py"),f],{encoding:"utf8"});
  return {status:r.status,out:r.stdout,errors:r.stdout.split("\n").filter(l=>/: line |^.*\.md: /.test(l)&&!/warning/.test(l)&&r.status!==0)};};
const lintOut=text=>lint(text).out;
const load=text=>{P.wipe();const A=P.boot();A.loadText(text);return A;};

(async()=>{
 /* ---- D1: a reader writes back every record it read ---- */
 {const design=FM+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q1] One\n\n> [!sticker|q2] Two\n\n> [!module|m end] End\n";
  const file=design+REC+"> [!records|m] M\n\n"+fence("booklet answers",'{"q1":"kept","q2":[1,2],"gone":"from an older design"}')+"%%\n";
  const A=load(file);
  chk("p12: the file opens (the unknown kind is reported, not refused)",A.BOOK.modules.length===1);
  const out=A.toMarkdown(),got=answersOf(out,"m");
  chk("p12: after a save the answers to a question of an unknown kind and to one the design no longer has are still there",
    !!got&&got.q1==="kept"&&JSON.stringify(got.q2)==="[1,2]"&&got.gone==="from an older design",out.slice(-300));
  A.answersIn("m").q1="changed";
  const got2=answersOf(A.toMarkdown(),"m");
  chk("p12: after an edit to another answer only that answer differs",got2.q1==="changed"&&JSON.stringify(got2.q2)==="[1,2]"&&got2.gone==="from an older design"&&Object.keys(got2).length===3,JSON.stringify(got2));
  const again=load(out);
  chk("p12: load, save, load, save changes nothing",again.toMarkdown()===out);}
 {const design=FM+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q1] One\n\n> [!activity|e repeat] E\n\n> [!text|t] T\n\n> [!module|m end] End\n";
  const sync='{"path":"~/notes/t.md","hash":"abc"}';
  const file=design+REC+"> [!records|m] M\n\n"+fence("booklet answers",'{"q1":"x"}')+fence("booklet sync",sync)+
    fence("booklet entries e",'{"items": [\n{"ts":"2026-01-01T10:00:00Z","t":"kept","removed":"a removed question"}\n]}')+
    fence("booklet entries nowhere",'{"items": [\n{"ts":"2026-01-02T10:00:00Z","t":"an activity the design lost"}\n]}')+
    fence("booklet draft e",'{"t":"half","removed":"x"}')+fence("booklet later-kind 7",'{"anything":[1,2,3]}')+"%%\n";
  const A=load(file);
  chk("p16: a block the page does not read is reported, and the file opens",A.BOOK.modules.length===1&&A.parseFile(file).unread.some(x=>/sync/.test(x)),JSON.stringify(A.parseFile(file).unread));
  const out=A.toMarkdown(),recs=recordsOf(out);
  const one=info=>recs.filter(r=>r.info===info);
  chk("p16: the sync block is written back, unchanged, once",one("booklet sync").length===1&&one("booklet sync")[0].code===sync&&one("booklet sync")[0].scope==="m",JSON.stringify(recs.map(r=>r.info)));
  chk("p16: so is a block of a kind a later version might add, with its words after the kind",one("booklet later-kind 7").length===1&&one("booklet later-kind 7")[0].code==='{"anything":[1,2,3]}');
  chk("p16: an entry keeps an answer to a question the design no longer has",/removed.*a removed question/.test((one("booklet entries e")[0]||{}).code||"")&&one("booklet entries e").length===1);
  chk("p16: kept entries of an activity the design no longer has are written back too, once",one("booklet entries nowhere").length===1&&/an activity the design lost/.test(one("booklet entries nowhere")[0].code));
  chk("p16: a draft keeps a removed question's key",/"removed":"x"/.test((one("booklet draft e")[0]||{}).code||"")&&one("booklet draft e").length===1);
  chk("p16: no block is written twice",new Set(recs.map(r=>r.scope+"|"+r.info+"|"+r.code)).size===recs.length&&recs.length===6,String(recs.length));
  chk("p16: load, save, load, save changes nothing",load(out).toMarkdown()===out);}
 {const design=FM+"> [!module|m] M\n\n> [!activity|e repeat] E\n\n> [!text|t] T\n\n> [!module|m end] End\n";
  const broken='{"items": [\n{"ts":"2026-01-01T10:00:00Z","t":"kept"},\n]}';
  const file=design+REC+"> [!records|m] M\n\n"+fence("booklet entries e",broken)+"%%\n";
  const A=load(file),R=A.parseFile(file);
  chk("p17: a block that cannot be parsed is reported",R.unread.length>=1&&R.ok,JSON.stringify(R.unread));
  const out=A.toMarkdown(),recs=recordsOf(out);
  chk("p17: and is written back as it was, once, not deleted",recs.length===1&&recs[0].info==="booklet entries e"&&recs[0].code===broken,JSON.stringify(recs));
  chk("p17: and still reported when the saved file is read",A.parseFile(out).unread.length>=1);
  /* a new entry for the same activity and the broken block do not collide: the broken one stays verbatim, the new one is its own block */
  A.draftFor("m/e").t="fresh";A.finalizeEntry("m/e");
  const out2=recordsOf(A.toMarkdown());
  chk("p17: a new entry kept after it is written as a block of its own beside the broken one",out2.filter(r=>r.info==="booklet entries e").length===2&&out2.some(r=>r.code===broken),JSON.stringify(out2.map(r=>r.info)));}
 /* a block that is not an object, and an entries block with no activity named, are kept as written as well */
 {const file=FM+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n"+REC+"> [!records|m] M\n\n"+fence("booklet answers","[1,2]")+fence("booklet entries",'{"items":[]}')+"%%\n";
  const A=load(file),recs=recordsOf(A.toMarkdown());
  chk("a records block that is not an object, and an entries block that names no activity, are kept as written",recs.length===2&&recs[0].code==="[1,2]"&&recs[1].info==="booklet entries",JSON.stringify(recs));}
 /* what the reader changes is not kept: an answer cleared, a module removed */
 {const file=FM+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q1] One\n\n> [!module|m end] End\n"+REC+"> [!records|m] M\n\n"+fence("booklet answers",'{"q1":"kept","old":"gone"}')+fence("booklet sync",'{"x":1}')+"%%\n";
  const A=load(file);A.answersIn("m").q1="";
  const got=answersOf(A.toMarkdown(),"m");
  chk("an answer the reader cleared is not written, and one it did not touch is",got&&got.q1===undefined&&got.old==="gone",JSON.stringify(got));}
 /* the box store: every booklet round-trips (a probe of real files, run by the implementer; the test below is the shape) */
 {const file=FM+"> [!activity|a] A\n\n> [!text|q] Q\n"+REC+fence("booklet answers",'{"q":"x","stale":"y"}')+"%%\n";
  const A=load(file),out=A.toMarkdown();
  chk("D2: bare activities' answers are written under the plain records line, with the stale one",/\n> \[!records\] App record[^\n]*\n\n```booklet answers\n/.test(out)&&!/\[!records\|/.test(out)&&answersOf(out,"").stale==="y",out.slice(-250));}

 /* ---- D2: the activities outside every module fence are one module with no name ---- */
 {const A=P.boot();
  const bare=(parent)=>FM+"> [!activity|top] Top\n\n> [!activity|kid parent:top] Kid\n\n> [!activity|other] Other\n\n> [!activity|grand parent:kid] Grand\n";
  const R=A.parseFile(bare());
  const acts=R.template.modules.map(m=>m.mode);
  chk("parent: places among bare activities: depth first, each with its parent's address and its depth",
    acts.map(a=>a.id).join()==="top,kid,grand,other"&&acts.map(a=>(a.parent||"-")+"@"+(a.depth||0)).join()==="-@0,top@1,kid@2,-@0",acts.map(a=>a.id+":"+a.parent+"@"+a.depth).join());
  chk("and nothing is reported",R.unread.length===0&&R.ok,JSON.stringify(R.unread));
  const miss=A.parseFile(FM+"> [!activity|a parent:nope] A\n\n> [!activity|b] B\n");
  chk("a parent that is no bare activity leaves the activity at the top, as in a module",miss.template.modules[0].mode.parent===undefined&&miss.ok);
  const L=lintOut(bare());
  chk("the linter accepts parent: between bare activities, and no longer says it places nothing",/0 errors · 0 warnings/.test(L)&&!/places nothing/.test(L),L);
  chk("the linter warns on a parent that is not among the bare activities, naming the module with no name",/`parent:nope` is not an activity of the module with no name/.test(lintOut(FM+"> [!activity|a parent:nope] A\n")));
  /* a bare activity may have a module's id: no module id is spelled like a bare id's scope */
  const clash=FM+"> [!module|inbox] Inbox\n\n> [!activity|a] A\n\n> [!module|inbox end] End\n\n> [!activity|inbox] Bare\n\n> [!text|q] Q\n";
  chk("the linter accepts a bare activity whose id is a module's id",/0 errors/.test(lintOut(clash)),lintOut(clash));
  chk("the renderer opens it with nothing reported or refused",(r=>r.ok&&r.refused.length===0&&r.unread.length===0)(A.parseFile(clash)),JSON.stringify(A.parseFile(clash).unread));
  /* S-po's shape: a record line that names a bare activity, read when no module has that id, and written back under the plain line */
  const spo=FM+"> [!activity|inbox] Inbox\n\n> [!text|q] Q\n\n> [!activity|other] Other\n\n> [!text|r] R\n"+REC+"> [!records|inbox] Inbox\n\n"+
    fence("booklet answers",'{"q":"one","r":"two"}')+fence("booklet entries inbox",'{"items": [\n{"ts":"2026-01-01T10:00:00Z","x":"y"}\n]}')+"%%\n";
  const B=load(spo);
  chk("a records line naming a bare activity is read as the nameless module's",B.peekAnswers("").q==="one"&&B.peekAnswers("").r==="two");
  const o=B.toMarkdown();
  chk("and is written back under the plain records line, once, with no activity's name on a records line",!/\[!records\|/.test(o)&&(o.match(/\[!records/g)||[]).length===1&&answersOf(o,"").q==="one"&&answersOf(o,"").r==="two",o.slice(-400));
  chk("load, save, load, save changes nothing",load(o).toMarkdown()===o);
  /* Remove a module takes its unread records with it, and no one else's */
  const two=FM+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n\n> [!module|n] N\n\n> [!activity|b] B\n\n> [!text|r] R\n\n> [!module|n end] End\n"+REC+
    "> [!records|m] M\n\n"+fence("booklet sync",'{"for":"m"}')+"> [!records|n] N\n\n"+fence("booklet sync",'{"for":"n"}')+"%%\n";
  const C=load(two);
  chk("two unread blocks, one per module, are written back under their own modules",recordsOf(C.toMarkdown()).map(r=>r.scope+":"+r.code).join()==='m:{"for":"m"},n:{"for":"n"}',JSON.stringify(recordsOf(C.toMarkdown())));
  const rm=C.removeModule("m");
  chk("removing a module takes its unread blocks with it, and leaves the other module's",rm.ok&&recordsOf(C.toMarkdown()).map(r=>r.scope+":"+r.code).join()==='n:{"for":"n"}',JSON.stringify(rm)+JSON.stringify(recordsOf(C.toMarkdown())));}

 /* ---- D3: the first word after the bar is the id ---- */
 {const A=P.boot();
  const q=(kind,words)=>A.parseFile(FM+"> [!activity|a] A\n\n> ["+"!"+kind+"|"+words+"] Tell me more\n");
  const blockOf=R=>{const a=R.template.modules[0].mode;return (a.blocks||[]).find(b=>b.type==="text");};
  for(const w of ["long","open","end","repeat","daily","hidden","readonly","describe"]){
    const R=q("text",w);
    chk("p05: `> [!text|"+w+"] Tell me more` is a question with the id “"+w+"”",R.ok&&blockOf(R)&&blockOf(R).id===w&&R.unread.length===0,JSON.stringify(R.unread));}
  {const R=q("text","q long"),b=blockOf(R);
   chk("the words after the id are settings: `q long` is the id q, long",R.unread.length===0&&b&&b.id==="q",JSON.stringify(R.unread));}
  {const R=q("text","long q");
   chk("a setting before the id is reported: `long q` is the id long and q is a setting a text line does not take",R.unread.length===1&&/\bq\b/.test(R.unread[0])&&blockOf(R).id==="long",JSON.stringify(R.unread));}
  {const R=A.parseFile(FM+"> [!activity|repeat a2] A\n");
   chk("`> [!activity|repeat a2]` is the activity “repeat”; a2 is not a setting an activity takes",R.template.modules[0].mode.id==="repeat"&&R.unread.length===1&&/a2/.test(R.unread[0]),JSON.stringify(R.unread));}
  {const R=A.parseFile(FM+"> [!activity|a] A\n\n> [!hint|extra] A hint\n\n> [!notice|legal] Notice\n");
   chk("a kind that takes no id (hint, notice, row, manifest, solution) reads every word as a setting, and reports it",R.unread.filter(x=>/takes no/.test(x)).length>=2,JSON.stringify(R.unread));}
  chk("the linter agrees: `> [!text|long] Tell me more` has an id, and `> [!text|long q]` reports q",
    /0 errors/.test(lintOut(FM+"> [!activity|a] A\n\n> [!text|long] Tell me more\n"))&&/text line takes no `q` setting/.test(lintOut(FM+"> [!activity|a] A\n\n> [!text|long q] Tell me more\n")));
  chk("and so does an activity called `repeat` or `home`",/0 errors/.test(lintOut(FM+"> [!activity|repeat] A\n\n> [!activity|home] B\n")));
  const NI=(txt)=>(txt.match(/NO_ID_KINDS\s*=\s*(?:new Set\()?[\[(]([^\])]*)[\])]/)||[])[1];
  const ids=t=>[...(t||"").matchAll(/"(\w+)"/g)].map(m=>m[1]).sort().join();
  chk("the kinds that take no id are the same in the renderer and the linter, and in SPEC section 4",ids(NI(P.html))==="hint,manifest,notice,row,solution"&&ids(NI(fs.readFileSync(path.join(P.R,"lint-booklet.py"),"utf8")))===ids(NI(P.html))&&/\| `row`, `notice`, `manifest`, `hint`, `solution` \| no id \|/.test(fs.readFileSync(path.join(P.R,"SPEC.md"),"utf8")));}
 /* ---- D8: a reference across a module boundary draws nothing and never stops the file opening ---- */
 {const A=P.boot();
  const two=FM+"> [!module|m1] One\n\n> [!activity|a repeat] A\n\n> [!text|t] T\n\n> [!module|m1 end] End\n\n> [!module|m2] Two\n\n> [!activity|b] B\n\n```booklet query\nfrom: a\n```\n\n> [!module|m2 end] End\n";
  const R=A.parseFile(two);
  chk("p15: a query naming an activity of another module: the file opens",R.ok&&R.refused.length===0&&R.template.modules.length===2,JSON.stringify(R.refused));
  chk("p15: and the notice names the query",R.unread.some(x=>/query in “b”/.test(x)&&/“a”, which is in another module/.test(x)),JSON.stringify(R.unread));
  chk("p15: nothing is drawn for it",!JSON.stringify(R.template.modules[1].mode.blocks).includes('"type":"query"'));
  chk("the linter keeps it an error",/`from: a` is in another module/.test(lintOut(two))&&lint(two).status===1,lintOut(two));
  chk("a menu: across a module boundary draws no options and the file opens",(r=>r.ok&&r.refused.length===0)(A.parseFile(FM+"> [!module|m1] One\n\n> [!menu|feels]\n- Calm\n\n> [!activity|a] A\n\n> [!module|m1 end] End\n\n> [!module|m2] Two\n\n> [!activity|b] B\n\n> [!choice|c menu:feels] C\n\n> [!module|m2 end] End\n")));}
 /* ---- D9: front-matter keys a reader does not know are kept ---- */
 {const file='---\nbooklet: "0.13"\ntitle: T\nlang: en\nstatus: draft\nauthor: Someone\nfuture-key: "x"\n---\n\n> [!activity|a] A\n\n> [!text|q] Q\n';
  const A=load(file);A.answersIn("").q="hello";
  const out=A.toMarkdown();
  chk("an unknown front-matter key survives a save, as written, and is not reported",out.startsWith(file.replace(/\s+$/,""))&&A.parseFile(file).unread.length===0,out.slice(0,160));}

 console.log(fails?"\n"+fails+" FAILURES":"\nformat 0.13 checks passed");process.exit(fails?1:0);
})();
