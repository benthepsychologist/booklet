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
  chk("p16: a block the page does not read is reported, and the file opens",A.BOOK.modules.length===1&&A.parseFile(file).unread.some(x=>/later-kind/.test(x)),JSON.stringify(A.parseFile(file).unread));
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
  const acts=R.template.modules.map(m=>m.activities[0]);
  chk("parent: places among bare activities: depth first, each with its parent's address",
    acts.map(a=>a.id).join()==="top,kid,grand,other"&&acts.map(a=>a.parent||"-").join()==="-,top,kid,-",acts.map(a=>a.id+":"+a.parent).join());
  chk("and nothing is reported",R.unread.length===0&&R.ok,JSON.stringify(R.unread));
  const miss=A.parseFile(FM+"> [!activity|a parent:nope] A\n\n> [!activity|b] B\n");
  chk("a parent that is no bare activity leaves the activity at the top, as in a module",miss.template.modules[0].activities[0].parent===undefined&&miss.ok);
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
  /* a bare activity and a module that share an id are two things: adding the module leaves the activity, removing it leaves the activity */
  {const X=load(FM+"> [!activity|inbox] Bare\n\n> [!text|q] Q\n");X.answersIn("").q="mine";
   const r=X.addModuleText(FM.replace("title: T","title: Mod")+"> [!module|inbox] Module inbox\n\n> [!activity|a] A\n\n> [!module|inbox end] End\n");
   chk("adding a module whose id is a bare activity's id adds a module and leaves the activity",r.ok&&X.allModules().map(m=>m.id+":"+m.activities[0].id).join()==="inbox:inbox,inbox:inbox/a",JSON.stringify(r)+X.allModules().map(m=>m.id).join());
   chk("and the file it writes opens with both, the bare activity's answer under the plain records line",(q=>q.ok&&q.refused.length===0&&q.template.modules.length===2)(X.parseFile(X.toMarkdown()))&&answersOf(X.toMarkdown(),"").q==="mine");
   const rm=X.removeModule("inbox");
   chk("removing the module leaves the bare activity",rm.ok&&X.allModules().map(m=>m.id).join()==="inbox"&&X.allModules()[0].activities[0].id==="inbox",JSON.stringify(rm)+X.allModules().map(m=>m.id).join());}
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
  const blockOf=R=>{const a=R.template.modules[0].activities[0];return a.pages.flatMap(p=>p.blocks).find(b=>b.type==="text");};
  for(const w of ["long","open","end","repeat","daily","hidden","readonly","describe"]){
    const R=q("text",w);
    chk("p05: `> [!text|"+w+"] Tell me more` is a question with the id “"+w+"”",R.ok&&blockOf(R)&&blockOf(R).id===w&&R.unread.length===0,JSON.stringify(R.unread));}
  {const R=q("text","q long"),b=blockOf(R);
   chk("the words after the id are settings: `q long` is the id q, long",R.unread.length===0&&b&&b.id==="q",JSON.stringify(R.unread));}
  {const R=q("text","long q");
   chk("a setting before the id is reported: `long q` is the id long and q is a setting a text line does not take",R.unread.length===1&&/\bq\b/.test(R.unread[0])&&blockOf(R).id==="long",JSON.stringify(R.unread));}
  {const R=A.parseFile(FM+"> [!activity|repeat a2] A\n");
   chk("`> [!activity|repeat a2]` is the activity “repeat”; a2 is not a setting an activity takes",R.template.modules[0].activities[0].id==="repeat"&&R.unread.length===1&&/a2/.test(R.unread[0]),JSON.stringify(R.unread));}
  {const R=A.parseFile(FM+"> [!activity|a] A\n\n> [!hint|extra] A hint\n\n> [!notice|legal] Notice\n");
   chk("a kind that takes no id (hint, notice, row, manifest, solution) reads every word as a setting, and reports it",R.unread.filter(x=>/takes no/.test(x)).length>=2,JSON.stringify(R.unread));}
  chk("the linter agrees: `> [!text|long] Tell me more` has an id, and `> [!text|long q]` reports q",
    /0 errors/.test(lintOut(FM+"> [!activity|a] A\n\n> [!text|long] Tell me more\n"))&&/text line takes no `q` setting/.test(lintOut(FM+"> [!activity|a] A\n\n> [!text|long q] Tell me more\n")));
  {const both=FM+"> [!activity|repeat] A\n\n> [!activity|home] B\n",R=A.parseFile(both);
   chk("and so does an activity called `repeat` or `home`: the renderer reads the ids `repeat` and `home`, neither is a setting, and the linter has no error",
     R.unread.length===0&&R.template.modules.map(m=>m.activities[0].id).join()==="repeat,home"&&!R.template.modules.some(m=>m.activities[0].kind==="entry")&&/0 errors/.test(lintOut(both)),JSON.stringify(R.template.modules.map(m=>m.activities[0].id)));}
  }
 /* ---- D8: a reference across a module boundary draws nothing and never stops the file opening ---- */
 {const A=P.boot();
  const two=FM+"> [!module|m1] One\n\n> [!activity|a repeat] A\n\n> [!text|t] T\n\n> [!module|m1 end] End\n\n> [!module|m2] Two\n\n> [!activity|b] B\n\n```booklet query\nfrom: a\n```\n\n> [!module|m2 end] End\n";
  const R=A.parseFile(two);
  chk("p15: a query naming an activity of another module: the file opens",R.ok&&R.refused.length===0&&R.template.modules.length===2,JSON.stringify(R.refused));
  chk("p15: and the notice names the query",R.unread.some(x=>/query in “b”/.test(x)&&/“a”, which is in another module/.test(x)),JSON.stringify(R.unread));
  chk("p15: nothing is drawn for it",!JSON.stringify(R.template.modules[1].activities[0].pages[0].blocks).includes('"type":"query"'));
  chk("the linter keeps it an error",/`from: a` is in another module/.test(lintOut(two))&&lint(two).status===1,lintOut(two));
  chk("a menu: across a module boundary draws no options and the file opens",(r=>r.ok&&r.refused.length===0)(A.parseFile(FM+"> [!module|m1] One\n\n> [!menu|feels]\n- Calm\n\n> [!activity|a] A\n\n> [!module|m1 end] End\n\n> [!module|m2] Two\n\n> [!activity|b] B\n\n> [!choice|c menu:feels] C\n\n> [!module|m2 end] End\n")));}
 /* ---- D9: front-matter keys a reader does not know are kept ---- */
 {const file='---\nbooklet: "0.13"\ntitle: T\nlang: en\nstatus: draft\nauthor: Someone\nfuture-key: "x"\n---\n\n> [!activity|a] A\n\n> [!text|q] Q\n';
  const A=load(file);A.answersIn("").q="hello";
  const out=A.toMarkdown();
  chk("an unknown front-matter key survives a save, as written, and is not reported",out.startsWith(file.replace(/\s+$/,""))&&A.parseFile(file).unread.length===0,out.slice(0,160));}

 /* ---- D13: group is a kind of Booklet's own, the plain fold ---- */
 {const A=P.boot();
  const body="> [!activity|a] A\n\n> [!group]- Notes on the week\n> Some words inside.\n\n> [!group] Not folded\n> More words.\n";
  const R=A.parseFile(FM+body);
  chk("`> [!group]- Title` is read as a kind of the format: nothing reported, not marked unknown",R.unread.length===0&&!R.template.modules[0].activities[0].pages[0].blocks.some(b=>b.unknown),JSON.stringify(R.unread));
  chk("`group` is in the table of kinds, and takes no settings",JSON.stringify(A.KIND_SETTINGS.group)==="[]");
  const W=A.parseFile(FM+"> [!activity|a] A\n\n> [!group|x]- Title\n> body\n");
  chk("a word after the bar on a group is a setting it does not take, reported like any other",W.unread.length===1&&/group line takes no “x”/.test(W.unread[0]),JSON.stringify(W.unread));
  A.loadText(FM+body);A.screen="a";A.render();
  const main=P.main();
  chk("it is drawn as a plain fold: plain paper, the title, and no word about a kind this page does not know",P.find(main,P.hasClass("card-plain")).length===1&&/Notes on the week/.test(P.texts(main))&&!/does not know the kind/.test(P.texts(main)),P.texts(main));
  chk("unfolded, it is a callout and says nothing about a kind the page does not know",P.find(main,P.hasClass("rd-callout")).length===1&&P.find(main,P.hasClass("rd-unknown")).length===0);
  chk("and the linter takes it, and treats a word after its bar as a setting it does not take (an error), not as an unknown kind (a warning)",/0 errors · 0 warnings/.test(lintOut(FM+body))&&
    /ERROR[^\n]*a group line takes no `x` setting/.test(lintOut(FM+"> [!activity|a] A\n\n> [!group|x]- Title\n> body\n"))&&!/is not a kind this format defines/.test(lintOut(FM+"> [!activity|a] A\n\n> [!group|x]- Title\n> body\n")),lintOut(FM+body));}

 /* ---- D11: a row closes with [!row|end] and no other way ---- */
 {const A=P.boot();
  const row=close=>FM+"> [!activity|a] A\n\n> [!row]\n\n### One\n\nx\n\n### Two\n\ny\n\n"+close+"\n";
  const ok=A.parseFile(row("> [!row|end]"));
  chk("`> [!row|end]` closes a row: two cells, nothing reported",ok.ok&&ok.unread.length===0&&ok.template.modules[0].activities[0].pages[0].blocks.some(b=>b.type==="row"&&b.blocks.length===2),JSON.stringify(ok.unread));
  const old=A.parseFile(row("> [!row end]"));
  chk("the renderer does not read `> [!row end]` as a close: the row is reported as never closed",old.ok&&old.unread.some(x=>/never closed|not closed/i.test(x)),JSON.stringify(old.unread));
  const L=lint(row("> [!row end]"));
  chk("the linter reports `> [!row end]` and says to write `> [!row|end]`",L.status===1&&/line 19: `> \[!row end\]` is not a row's close \(0\.13\); write `> \[!row\|end\]`/.test(L.out),L.out);
  chk("and is clean with the new form",lint(row("> [!row|end]")).status===0);
  chk("neither tool has a ROW_END",!/\bROW_END\b/.test(P.html)&&!/\bROW_END\b/.test(fs.readFileSync(path.join(P.R,"lint-booklet.py"),"utf8")));}


 /* ======== fix round 1 (the cold review of #46): each check below failed on the first head, 0533607 ======== */
 const cnt=(md,re)=>(md.match(re)||[]).length;
 const rec=(scope,...f)=>(scope?"> [!records|"+scope+"] "+scope.toUpperCase()+"\n\n":"")+f.join("");
 const entry=(ts,o)=>JSON.stringify({ts,...o});
 const items=(...e)=>'{"items": [\n'+e.join(",\n")+'\n]}';
 const MODE="> [!module|m] M\n\n> [!activity|e repeat] E\n\n> [!text|t] T\n\n> [!module|m end] End\n";

 /* B1: a later block for one address adds to the earlier one, and loses nothing */
 {const two=FM+MODE+REC+rec("m",fence("booklet entries e",items(entry("2026-01-01T10:00:00Z",{t:"first block"}))),
    fence("booklet entries e",items(entry("2026-01-02T10:00:00Z",{t:"second block"}))),
    fence("booklet draft e",'{"a":"one","b":"two"}'),fence("booklet draft e",'{"b":"three","c":"four"}'))+"%%\n";
  const A=load(two);
  chk("B1: two entries blocks for one activity are both held, in file order",(A.STATE.entries["m/e"]||[]).map(x=>x.t).join()==="first block,second block",JSON.stringify(A.STATE.entries["m/e"]));
  chk("B1: and a later draft block fills in keys without wiping the earlier one's",JSON.stringify(A.DRAFTS.custom["m/e"])==='{"a":"one","b":"three","c":"four"}',JSON.stringify(A.DRAFTS.custom["m/e"]));
  const out=A.toMarkdown(),r=recordsOf(out);
  chk("B1: a save writes them as one block each, nothing lost",r.filter(x=>x.info==="booklet entries e").length===1&&/first block/.test(r[0].code+r[1].code)&&cnt(out,/second block/g)===1&&cnt(out,/first block/g)===1,out.slice(-400));}
 /* B1b (0.13.1, SPEC section 8): entries are identified by `ts`; an entry two blocks both hold is one entry, and for a key both hold the later wins */
 {const T1="2026-01-01T10:00:00Z",T2="2026-01-02T10:00:00Z",T3="2026-01-03T10:00:00Z";
  const file=FM+MODE+REC+rec("m",fence("booklet entries e",items(entry(T1,{t:"old",u:"only in the first"}),entry(T2,{t:"two"}))),
    fence("booklet entries e",items(entry(T1,{t:"new",v:"only in the second"}),entry(T3,{t:"three"}))))+"%%\n";
  const A=load(file),got=A.STATE.entries["m/e"]||[];
  chk("B1b: an entry both blocks hold is one entry: three entries, in the order they first appear",got.map(x=>x.ts).join()===[T1,T2,T3].join(),JSON.stringify(got));
  chk("B1b: for a key both hold the later wins, and a key only one holds is kept",got[0].t==="new"&&got[0].u==="only in the first"&&got[0].v==="only in the second",JSON.stringify(got[0]));
  chk("B1b: the entries only one block holds are untouched",got[1].t==="two"&&got[2].t==="three");
  const out=A.toMarkdown();
  chk("B1b: a save writes the merged entry once, and nothing of the overwritten value",cnt(out,/"ts":"2026-01-01T10:00:00Z"/g)===1&&cnt(out,/"t":"old"/g)===0,out.slice(-500));
  chk("B1b: load, save, load, save changes nothing",load(out).toMarkdown()===out);}
 {/* the flow that lost data: a broken block is kept, a new entry is added beside it, the reader fixes the comma by hand, the next load and save keep both */
  const broken=items(entry("2026-01-01T10:00:00Z",{t:"old entry 1"}),entry("2026-01-02T10:00:00Z",{t:"old entry 2"})).replace(/\n\]\}$/,",\n]}");
  const A=load(FM+MODE+REC+rec("m",fence("booklet entries e",broken))+"%%\n");
  A.draftFor("m/e").t="new entry, kept after the broken block";A.finalizeEntry("m/e");
  const saved=A.toMarkdown();
  const setup=cnt(saved,/```booklet entries e/g)===2&&saved.includes(broken)&&/new entry, kept after/.test(saved);
  const fixed=saved.replace('"old entry 2"},\n]}','"old entry 2"}\n]}');
  const B=load(fixed);
  chk("B1 flow: after a new entry the file holds the broken block as it was and the new entry beside it; the reader mends the comma; the load holds all three entries, nothing reported",setup&&fixed!==saved&&(B.STATE.entries["m/e"]||[]).map(x=>x.t).sort().join("|")==="new entry, kept after the broken block|old entry 1|old entry 2"&&B.parseFile(fixed).unread.length===0,JSON.stringify(B.STATE.entries["m/e"]));
  const again=B.toMarkdown();
  chk("B1 flow: the next save keeps every entry, in one block",/new entry, kept after/.test(again)&&/old entry 1/.test(again)&&/old entry 2/.test(again)&&cnt(again,/```booklet entries e/g)===1,again.slice(-500));
  chk("B1 flow: and load, save changes nothing more",load(again).toMarkdown()===again);}

 /* B2 and should-fix 2: a bare activity and a fenced module that share an id are two things */
 {const f=FM+"> [!activity|inbox] Bare inbox\n\n> [!text|q] Bare question\n\n> [!module|inbox] Module inbox\n\n> [!activity|a] A\n\n> [!text|qa] QA\n\n> [!activity|b repeat] B\n\n> [!text|qb] QB\n\n> [!module|inbox end] End\n"+REC+
    fence("booklet answers",'{"q":"bare answer"}')+rec("inbox",fence("booklet answers",'{"qa":"module answer"}'),fence("booklet entries b",items(entry("2026-01-01T10:00:00Z",{qb:"module entry"}))),
      fence("booklet entries gone",items(entry("2026-01-02T10:00:00Z",{x:"orphan"}))),fence("booklet draft gone",'{"x":"orphan draft"}'))+"%%\n";
  const A=load(f);
  const removeBtns=()=>P.find(P.main(),n=>n.tagName==="button"&&/Remove/i.test(P.texts(n)));
  A.screen="inbox";A.render();
  chk("B2: the bare activity's own page offers no Remove control, though a fenced module has its id",removeBtns().length===0,P.texts(P.main()));
  A.screen=A.moduleScreen("inbox");A.render();
  chk("should-fix 2: asking for the page of module `inbox` stays on the fenced module's page, not the bare activity",A.screen===A.moduleScreen("inbox")&&/Module inbox/.test(P.texts(P.main())),String(A.screen));
  const btn=removeBtns();
  chk("B2: the fenced module's page offers Remove",btn.length===1);
  btn[0]._on.click({});
  const box=P.find(P.main(),P.hasClass("removemod"))[0];
  chk("B2: the dialog names the module and counts its work, orphan entries and drafts included (2 entries, 1 answer, 1 draft)",/Module inbox/.test(P.texts(box))&&/2 entries/.test(P.texts(box))&&/1 answer/.test(P.texts(box))&&/1 unfinished draft/.test(P.texts(box)),P.texts(box));
  P.find(box,P.hasClass("danger"))[0]._on.click({});
  const out=A.toMarkdown();
  chk("B2: Remove takes the module, its entries, its orphan entries and its drafts; the bare activity and its answer stay",
    A.allModules().map(m=>m.id).join()==="inbox"&&A.allModules()[0].activities[0].id==="inbox"&&Object.keys(A.STATE.entries).length===0&&Object.keys(A.DRAFTS.custom).length===0&&answersOf(out,"").q==="bare answer"&&!/orphan|module answer/.test(out),out.slice(-300));
  /* the activity of the fenced module goes Back to the module's own page */
  const B=load(f);B.screen="inbox/a";B.render();
  const back=P.find(P.main(),n=>n.tagName==="button"&&P.hasClass("cd-back")(n))[0];
  back._on.click({});
  chk("should-fix 2: Back from an activity of the fenced module leads to that module's page",B.screen===B.moduleScreen("inbox")&&/Module inbox/.test(P.texts(P.main())),String(B.screen));}

 /* should-fix 1: an unclosed fence in the records is closed with its own marker, and nothing grows on a save */
 for(const open of ["```","~~~","````"]){
  let t=FM+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q1] One\n\n> [!module|m end] End\n"+REC+rec("m",fence("booklet answers",'{"q1":"x"}'))+open+"booklet sync\n{\"x\":1}\n%%\n";
  const sizes=[];
  for(let n=0;n<4;n++){const A=load(t);A.answersIn("m").q1="x"+n;t=A.toMarkdown();sizes.push(t.length);}
  chk("an unclosed "+open+" fence in the records does not grow the file on each save ("+sizes.join(">")+")",sizes[1]===sizes[2]&&sizes[2]===sizes[3]&&cnt(t,/^%%$/gm)===3,t.slice(-120));
  chk("and the answer is still the last one saved, the block still there",load(t).peekAnswers("m").q1==="x3"&&/booklet sync/.test(t));}
 {const A=load(FM+MODE+REC+rec("m",'~~~booklet sync\n{"x":1}\n%%\n'));
  const o=A.toMarkdown();
  chk("an unclosed ~~~ fence is closed with ~~~, not with a backtick fence",/~~~booklet sync\n\{"x":1\}\n%%\n\n?~~~\n/.test(o)&&!/\n```\n/.test(o),o.slice(-120));}
 {const f=FM+MODE+REC+rec("m","```booklet widget\n{\"engine\":\"grid-select\",\"cells\":[]}\n```\n^w1\n\n","```mermaid\ngraph TD; A-->B\n```\n^fig1\n\n")+"%%\n";
  const o=load(f).toMarkdown();
  chk("a fence's ^id line is kept with its raw text, in the records",/```booklet widget\n.*\n```\n\^w1\n/.test(o)&&/```mermaid\ngraph TD; A-->B\n```\n\^fig1\n/.test(o),o.slice(-300));}

 /* should-fix 3: a records line that names nothing this file has: said, and its blocks kept under that same line */
 {const f=FM+"> [!activity|b] B\n\n> [!text|q] Q\n"+REC+fence("booklet answers",'{"q":"bare answer"}')+"> [!records|ghost] Ghost\n\n"+fence("booklet answers",'{"q":"ghost answer","g":"only ghost"}')+fence("booklet sync",'{"for":"ghost"}')+"%%\n";
  const A=load(f),R=A.parseFile(f),out=A.toMarkdown();
  chk("should-fix 3: the records line for a name no module or bare activity has is reported, at its line",R.unread.some(x=>/line 1[0-9]: the records line names “ghost”/.test(x)),JSON.stringify(R.unread));
  chk("should-fix 3: its answers do not merge into the bare module's",A.peekAnswers("").q==="bare answer"&&A.peekAnswers("").g===undefined,JSON.stringify(A.peekAnswers("")));
  chk("should-fix 3: its blocks are written back as they were, under that same line, once",/> \[!records\|ghost\] Ghost\n\n```booklet answers\n\{"q":"ghost answer","g":"only ghost"\}\n```\n\n```booklet sync\n\{"for":"ghost"\}\n```\n/.test(out)&&cnt(out,/ghost answer/g)===1,out.slice(-400));
  chk("should-fix 3: load, save, load, save changes nothing",load(out).toMarkdown()===out);}

 /* should-fix 4: an entry item that is not an object with a ts: the block is reported and kept as written */
 for(const [what,body] of [["has no ts",'{"ts":"2026-01-01T10:00:00Z","t":"has ts"},\n{"t":"no ts at all"}'],["is a string",'{"ts":"2026-01-01T10:00:00Z","t":"has ts"},\n"a string item"'],["is null",'null,\n{"ts":"2026-01-01T10:00:00Z","t":"has ts"}']]){
  const f=FM+MODE+REC+rec("m",fence("booklet entries e","{\"items\": [\n"+body+"\n]}"))+"%%\n";
  const A=load(f),R=A.parseFile(f),out=A.toMarkdown();
  chk("should-fix 4: an entry that "+what+": the block is reported",R.unread.some(x=>/line \d+: this is not a record this page reads/.test(x)),JSON.stringify(R.unread));
  chk("should-fix 4: and kept as written, not dropped, and not held as entries",out.includes(body)&&(A.STATE.entries["m/e"]||[]).length===0,out.slice(-300));}

 /* should-fix 5: records outside a records line are said and left in the design text */
 {const f=FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n"+fence("booklet answers",'{"q":"in the design"}')+fence("booklet entries a",items(entry("2026-01-01T10:00:00Z",{x:"y"})))+fence("booklet draft a",'{"q":"d"}')+"> [!activity|c] C\n";
  const A=load(f),R=A.parseFile(f);
  chk("should-fix 5: an answers, an entries and a draft block outside a records line are each reported",R.unread.length===3&&["answers","entries","draft"].every(k=>R.unread.some(x=>String(x).includes("“booklet "+k+"”"))),JSON.stringify(R.unread));
  chk("should-fix 5: none is read",A.peekAnswers("").q===undefined&&Object.keys(A.STATE.entries).length===0&&Object.keys(A.DRAFTS.custom).length===0);
  A.answersIn("").q="mine";
  const out=A.toMarkdown();
  chk("should-fix 5: they stay in the design text exactly once each, and the real answer is written under the records line",out.startsWith(f.replace(/\s+$/,""))&&cnt(out,/"in the design"/g)===1&&cnt(out,/```booklet entries a/g)===1&&answersOf(out,"").q==="mine"&&cnt(out,/```booklet answers/g)===2,out);
  chk("should-fix 5: load, save, load, save changes nothing",load(out).toMarkdown()===out);}

 /* should-fix 6: the examples in README and SPEC use the plain records line for bare activities */
 {const docs={"README.md":fs.readFileSync(path.join(P.R,"README.md"),"utf8"),"SPEC.md":fs.readFileSync(path.join(P.R,"SPEC.md"),"utf8")};
  for(const [name,txt] of Object.entries(docs)){
   const bad=[];for(const m of txt.matchAll(/^(`{3,})[^\n]*\n([\s\S]*?)\n\1$/gm)){for(const r of m[2].matchAll(/\[!records\|([^\] ]+)\]/g)) if(!new RegExp("\\[!module\\|"+r[1]+"[\\] ]").test(m[2])) bad.push(r[1]);}
   chk("should-fix 6: every `[!records|id]` in an example in "+name+" names a module of that example",bad.length===0,bad.join());}
  const ex=docs["README.md"].match(/```markdown\n(---\nbooklet:[\s\S]*?)\n```/);
  chk("should-fix 6: README's example is a booklet that lints clean",!!ex&&lint(ex[1]+"\n").status===0&&/0 errors · 0 warnings/.test(lintOut(ex[1]+"\n")),ex?lintOut(ex[1]+"\n"):"no example found");
  chk("should-fix 8: SPEC says a reader may write a record's JSON with other spacing",/may write a record's JSON with other spacing/.test(docs["SPEC.md"]));}

 /* should-fix 7: any `> [!` line the callout pattern cannot read is reported, at its own line, and left as text */
 {const lines=["> [!row end]","> [! spaced] Words","> [!my_kind] Words","> [!café] Words","> [!note title] Words"];
  for(const ln of lines){const f=FM+"> [!activity|a] A\n\nBefore.\n\n"+ln+"\n\nAfter.\n";
   const R=load(f)&&P.boot().parseFile(f);
   chk("should-fix 7: `"+ln+"` is reported at its own line (line 11) as a line the page cannot read",R.unread.length>=1&&R.unread.some(x=>/^line 11: /.test(x)&&/> \[!/.test(x)),JSON.stringify(R.unread));
   chk("should-fix 7: and is left as text, not lost",JSON.stringify(R.template.modules[0].activities[0].pages[0].blocks).includes(ln.replace(/\\/g,"")),JSON.stringify(R.template.modules[0].activities[0].pages[0].blocks).slice(0,300));}
  const fine=FM+"> [!activity|a] A\n\n> [!note] A note\n> body\n\n```\n> [!row end]\n```\n\n> [!2col] Two columns\n> words\n";
  chk("should-fix 7: a readable callout, a `> [!` line inside a code fence, and a kind that starts with a digit (`> [!2col]`) are not reported",P.boot().parseFile(fine).unread.length===0,JSON.stringify(P.boot().parseFile(fine).unread));}

 /* nit: nothing under a records line is read as design; each thing there is kept as written and reported */
 {const f=FM+MODE+REC+rec("m",
    "A note someone wrote by hand.\n\n","> [!note] Kept?\n> body\n\n","```mermaid\ngraph TD; A-->B\n```\n^fig1\n\n",fence("booklet answers",'{"t":"x"}'),"```booklet data\n[{\"label\":\"x\"}]\n```\n^d1\n\n","> [!data] A data section\n\n","```booklet widget\n{\"engine\":\"grid-select\",\"cells\":[]}\n```\n^w9\n\n")+"%%\n";
  const A=load(f),R=A.parseFile(f),out=A.toMarkdown();
  chk("records-only: prose, a callout, a figure, a data block, a data line and a widget inside the region are each reported once",R.unread.length===6,JSON.stringify(R.unread));
  chk("records-only: and kept as written, each once",["A note someone wrote by hand.","> [!note] Kept?","graph TD; A-->B\n```\n^fig1","[{\"label\":\"x\"}]\n```\n^d1"].every(t=>cnt(out,new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"))===1),out.slice(-400));
  chk("records-only: they are not read as design: no widget, no data section, no note drawn, and the data line and the widget fence survive a save",A.BOOK.widgets.length===0&&A.allModules().length===1&&R.template.modules[0].activities[0].pages[0].blocks.every(b=>b.type!=="callout"&&b.type!=="markdown")&&cnt(out,/> \[!data\] A data section/g)===1&&cnt(out,/\^w9/g)===1,JSON.stringify(R.template.modules[0].activities[0].pages[0].blocks.map(b=>b.type)));
  chk("records-only: load, save, load, save changes nothing",load(out).toMarkdown()===out);}

 /* nit: a malformed `raw.records` (what a browser's storage gave back) does not stop a save */
 {const A=load(FM+MODE+REC+rec("m",fence("booklet sync",'{"x":1}'))+"%%\n");
  let all=true,why="";
  for(const bad of ["garbage",7,{a:1},[null],[{scope:"m"}],[{scope:"m",text:5}],[{scope:5,text:"x"}],[{scope:"m",text:"x",foreign:5}]]){
   A.BOOK.raw.records=bad;try{const o=A.toMarkdown();if(typeof o!=="string") throw new Error("not text");}catch(e){all=false;why+=JSON.stringify(bad)+" ";}}
  chk("a malformed raw.records does not stop toMarkdown",all,why);}

 /* nit: the cross-module query message does not say "refused"; fr and es were checked by /localize (2026-10-14) */
 {const two=FM+"> [!module|m1] One\n\n> [!activity|a repeat] A\n\n> [!text|t] T\n\n> [!module|m1 end] End\n\n> [!module|m2] Two\n\n> [!activity|b] B\n\n```booklet query\nfrom: a\n```\n\n> [!module|m2 end] End\n";
  const R=P.boot().parseFile(two),src=P.html.split("\n");
  chk("the cross-module query message says the query is not drawn, and does not say refused",R.unread.some(x=>/query in “b”.*not drawn/.test(x))&&!R.unread.some(x=>/refused/.test(x)),JSON.stringify(R.unread));
  chk("fr and es queryRefused no longer say refused (refusé, rechazó), and are checked (no l10n: draft mark, /localize 2026-10-14)",src.filter(l=>/queryRefused:/.test(l)).length===3&&src.filter(l=>/l10n: draft/.test(l)&&/queryRefused:/.test(l)).length===0&&!src.some(l=>/queryRefused:/.test(l)&&/refus|rechaz|rejet|rejected/i.test(l.replace("queryRefused",""))));}

 /* nit: diff, law and opinion sit beside group in the kind table and the no-id list, the same in the renderer, the linter and SPEC */
 {const NI=txt=>(txt.match(/NO_ID_KINDS\s*=\s*(?:new Set\()?[\[(]([^\])]*)[\])]/)||[])[1];
  const ids=t=>[...(t||"").matchAll(/"(\w+)"/g)].map(m=>m[1]).sort().join();
  const want="diff,group,hint,law,manifest,notice,opinion,row,solution";
  const spec=fs.readFileSync(path.join(P.R,"SPEC.md"),"utf8"),py=fs.readFileSync(path.join(P.R,"lint-booklet.py"),"utf8");
  chk("the kinds that take no id are the same in the renderer and the linter, and in SPEC section 4: group, diff, law, opinion with row, notice, manifest, hint, solution",
    ids(NI(P.html))===want&&ids(NI(py))===want&&/\*\*Kinds that take no id\*\* are[^\n]*`solution`[^\n]*`group`[^\n]*`diff`[^\n]*`law`[^\n]*`opinion`/.test(spec),ids(NI(P.html))+" | "+ids(NI(py)));
  const A=P.boot();
  chk("diff, law and opinion are in the table of kinds, taking no settings, as group is",["group","diff","law","opinion"].every(k=>JSON.stringify(A.KIND_SETTINGS[k])==="[]"),JSON.stringify(Object.keys(A.KIND_SETTINGS)));
  for(const k of ["group","diff","law","opinion"]){
   const r=A.parseFile(FM+"> [!activity|a] A\n\n> ["+"!"+k+"|x] Title\n> body\n");
   chk("`"+k+"` given a word reports it as a setting the kind does not take, in the renderer and the linter",r.unread.length===1&&new RegExp(k+" line takes no “x”").test(r.unread[0])&&/a .* line takes no `x` setting/.test(lintOut(FM+"> [!activity|a] A\n\n> ["+"!"+k+"|x] Title\n> body\n")),JSON.stringify(r.unread));}}

 /* nit: the linter warns when an id is also one of its kind's setting words (D3's one silent change) */
 {const w=text=>lint(text);
  const long=w(FM+"> [!activity|a] A\n\n> [!text|long] Tell me more\n");
  chk("the linter warns that `> [!text|long]` has the id `long`, naming the rule: settings follow the id",long.status===0&&/warning/.test(long.out)&&/line 9: `long` is this text's id; settings follow the id/.test(long.out),long.out);
  const act=w(FM+"> [!activity|repeat] A\n");
  chk("and for an activity called `repeat`",/line 7: `repeat` is this activity's id; settings follow the id/.test(act.out)&&act.status===0,act.out);
  chk("and for a choice called `open` and an activity called `hidden`",/`open` is this choice's id/.test(lintOut(FM+"> [!activity|a] A\n\n> [!choice|open] Pick\n\n- One\n- Two\n"))&&/`hidden` is this activity's id/.test(lintOut(FM+"> [!activity|hidden] N\n")));
  chk("but not for `home`, an ordinary id, nor for an id that is no setting, nor when the word follows the id",
    !/^warn/m.test(lintOut(FM+"> [!activity|home] A\n\n> [!text|q long] Q\n"))&&!/^warn/m.test(lintOut(FM+"> [!activity|a repeat] A\n\n> [!text|note long] N\n")));
  chk("and an activity called `repeat` is not a repeating one",(R=>R.template.modules[0].activities[0].kind!=="entry"&&R.template.modules[1].activities[0].id==="home")(P.boot().parseFile(FM+"> [!activity|repeat] A\n\n> [!activity|home] B\n")));}


 /* ======== fix round 2 (the second cold review of #46): each check below failed on 16bd3da ======== */
 const MD2="> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q1] One\n\n> [!text|q2] Two\n\n> [!activity|e repeat] E\n\n> [!text|t] T\n\n> [!text|u] U\n\n> [!module|m end] End\n";

 /* N1: an id with a character outside letters, digits and dashes is reported, and its records are read by the exact id */
 {const f0=FM+"> [!module|mi_mod] Mi módulo\n\n> [!activity|diario-año repeat] Diario\n\n> [!text|nota] Nota\n\n> [!activity|una] Una vez\n\n> [!text|q] Q\n\n> [!module|mi_mod end] End\n\n> [!activity|bare_one repeat] Bare\n\n> [!text|t] T\n";
  const A=load(f0);A.answersIn("mi_mod").q="answer 1";
  A.draftFor("mi_mod/diario-año").nota="entry 1";A.finalizeEntry("mi_mod/diario-año");A.draftFor("bare_one").t="bare entry 1";A.finalizeEntry("bare_one");
  A.draftFor("mi_mod/diario-año").nota="half typed";
  const o=A.toMarkdown(),B=load(o);
  chk("N1: records under an id with a `_` or a letter like ñ come back: the answer, the kept entries and the draft",B.peekAnswers("mi_mod").q==="answer 1"&&(B.STATE.entries["mi_mod/diario-año"]||[]).length===1&&(B.STATE.entries["bare_one"]||[]).length===1&&(B.DRAFTS.custom["mi_mod/diario-año"]||{}).nota==="half typed",o.slice(-500));
  chk("N1: the ids are reported (three notices) and the records are not, since they are read",B.parseFile(o).unread.length===3&&B.parseFile(o).unread.every(x=>/may hold only letters, digits and dashes/.test(x)),JSON.stringify(B.parseFile(o).unread));
  B.answersIn("mi_mod").q="answer 2";B.draftFor("mi_mod/diario-año").nota="entry 2";B.finalizeEntry("mi_mod/diario-año");
  const o2=B.toMarkdown();
  chk("N1: a second save writes one records section per module, one answers block, and one entries block for each activity",cnt(o2,/\[!records\|mi_mod\]/g)===1&&cnt(o2,/```booklet answers/g)===1&&cnt(o2,/```booklet entries/g)===2&&/entry 1[\s\S]*entry 2/.test(o2)&&load(o2).toMarkdown()===o2,o2.slice(-500));}
 {const before=Object.getOwnPropertyNames(Object.prototype).sort().join();
  const f=FM+"> [!module|__proto__] X\n\n> [!activity|a repeat] A\n\n> [!text|q] Q\n\n> [!module|__proto__ end] End\n"+REC+"> [!records|__proto__] X\n\n"+fence("booklet answers",'{"pollutedByFile":"yes","__proto__":"own"}')+fence("booklet draft a",'{"pollutedByDraft":"yes"}')+fence("booklet entries __proto__",items(entry("2026-01-01T00:00:00Z",{x:1})))+"%%\n";
  const A=load(f),out=A.toMarkdown();
  chk("proto: a module whose id is `__proto__` is reported, its records are read, and Object.prototype gets no new property",Object.getOwnPropertyNames(Object.prototype).sort().join()===before&&({}).pollutedByFile===undefined&&({}).pollutedByDraft===undefined&&A.parseFile(f).unread.some(x=>/__proto__/.test(x))&&A.peekAnswers("__proto__").pollutedByFile==="yes");
  chk("proto: and they are written back once under its records line, and the file reads the same again",cnt(out,/pollutedByFile/g)===1&&cnt(out,/pollutedByDraft/g)===1&&cnt(out,/\[!records\|__proto__\]/g)===1&&load(out).toMarkdown()===out,out.slice(-400));}

 /* N2: the B1 flow for an answers block and a draft block: the reader's newer value wins, an older key the new block lacks is kept */
 {const A=load(FM+MD2+REC+rec("m",fence("booklet answers",'{"q1":"old answer","q2":"old two",}'),fence("booklet draft e",'{"t":"old draft t","u":"old u",}'))+"%%\n");
  A.answersIn("m").q1="NEW answer";A.draftFor("m/e").t="NEW draft text";
  const saved=A.toMarkdown(),fixed=saved.replace('"old two",}','"old two"}').replace('"old u",}','"old u"}');
  const B=load(fixed);
  chk("N2: a broken answers block and a broken draft block are mended by hand: the newer answer and draft win, the older keys stay",fixed!==saved&&B.peekAnswers("m").q1==="NEW answer"&&B.peekAnswers("m").q2==="old two"&&B.DRAFTS.custom["m/e"].t==="NEW draft text"&&B.DRAFTS.custom["m/e"].u==="old u",JSON.stringify([B.peekAnswers("m"),B.DRAFTS.custom["m/e"]]));
  const o=B.toMarkdown();
  chk("N2: the next save keeps all four values, and the kept block is written before the reader's own",/NEW answer/.test(o)&&/old two/.test(o)&&/NEW draft text/.test(o)&&/old u/.test(o),o.slice(-400));
  const C=load(FM+MD2+REC+rec("m",fence("booklet answers",'{"q1":"A","q2":"B"}'),fence("booklet answers",'{"q1":"later"}'),fence("booklet draft e",'{"t":"a"}'),fence("booklet draft e",'{"t":"b","u":"c"}'))+"%%\n");
  chk("N2: blocks for one scope are read in file order: a later block adds what the earlier lacks, and for a key both hold the later wins",C.peekAnswers("m").q1==="later"&&C.peekAnswers("m").q2==="B"&&C.DRAFTS.custom["m/e"].t==="b"&&C.DRAFTS.custom["m/e"].u==="c");}
 {const broken=fence("booklet answers",'{"q1":"old",}');
  const o=load(FM+MD2+REC+rec("m",broken)+"%%\n").toMarkdown();
  const A=load(FM+MD2+REC+rec("m",broken)+"%%\n");A.answersIn("m").q2="fresh";const w=A.toMarkdown();
  chk("N2: the block kept as written comes before the reader's own answers block in the file",w.indexOf('"q1":"old",}')>0&&w.indexOf('"q1":"old",}')<w.indexOf('"q2": "fresh"'),w.slice(-300));}

 /* N3: adding a module whose id matches a kept "no module here" records line */
 {const f=FM+"> [!activity|b] B\n\n> [!text|q] Q\n"+REC+fence("booklet answers",'{"q":"bare"}')+"> [!records|ghost] Ghost\n\n"+fence("booklet answers",'{"g":"old ghost answer","h":"only old"}')+"%%\n";
  const A=load(f);
  const r=A.addModuleText(FM.replace("title: T","title: Ghost")+"> [!module|ghost] Ghost\n\n> [!activity|ga] GA\n\n> [!text|g] G\n\n> [!text|h] H\n\n> [!module|ghost end] End\n");
  A.answersIn("ghost").g="NEW answer typed after adding";
  const o=A.toMarkdown(),B=load(o);
  chk("N3: the kept block becomes the added module's: one records line for it, the kept block first and the new answer after",r.ok&&cnt(o,/\[!records\|ghost\]/g)===1&&o.indexOf("old ghost answer")<o.indexOf("NEW answer typed"),o.slice(-400));
  chk("N3: and on reopening the newer answer wins and the older key stays, with nothing reported",B.peekAnswers("ghost").g==="NEW answer typed after adding"&&B.peekAnswers("ghost").h==="only old"&&B.parseFile(o).unread.length===0&&B.peekAnswers("").q==="bare",JSON.stringify(B.peekAnswers("ghost")));}

 /* the records region: from the `%%` before the first records line to its closing `%%`; design before and after it */
 {const f=FM+"> [!activity|a] A\n\n%%\nan author's note\n%%\n\n> [!text|q] Q\n\nProse after the comment.\n"+REC+fence("booklet answers",'{"q":"x"}')+"%%\n";
  const A=load(f),o=A.toMarkdown();
  chk("region: a `%%` … `%%` comment above the records stays in place with the question after it, and a save keeps both",o.includes("%%\nan author's note\n%%\n\n> [!text|q] Q\n\nProse after the comment.\n")&&A.allModules()[0].activities[0].pages[0].blocks.some(b=>b.type==="text"&&b.id==="q")&&answersOf(o,"").q==="x"&&load(o).toMarkdown()===o,o);}
 {const f=FM+"> [!activity|a] A\n\n> [!text|q] Q\n"+REC+fence("booklet answers",'{"q":"x"}')+"%%\n\nProse after the region.\n\n> [!data] A data section\n\n```booklet data\n[{\"label\":\"x\"}]\n```\n^d1\n";
  const A=load(f),R=A.parseFile(f),o=A.toMarkdown();
  chk("region: prose and a data section after the closing `%%` are design: read, and reported once as moved",R.unread.length===1&&/after the records is moved above them/.test(R.unread[0])&&R.template.modules[0].activities[0].pages[0].blocks.some(b=>b.type==="markdown"&&/Prose after the region/.test(b.text)),JSON.stringify(R.unread));
  chk("region: and written above the region on save, once, and the next open reports nothing",o.indexOf("Prose after the region")<o.indexOf("%%\n> [!records]")&&o.indexOf("```booklet data")<o.indexOf("%%\n> [!records]")&&cnt(o,/Prose after the region/g)===1&&cnt(o,/```booklet data/g)===1&&P.boot().parseFile(o).unread.length===0&&load(o).toMarkdown()===o,o);}
 {const f=FM+"> [!activity|a] A\n\n> [!text|q] Q\n"+REC+fence("booklet answers",'{"q":"x"}')+"%%\n\n    indented code line one\n    indented code line two\n";
  chk("region: only blank lines at the edges of the moved text are trimmed, never a first line's indentation",load(f).toMarkdown().includes("\n    indented code line one\n    indented code line two\n"));}
 {const mod="> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q1] One\n\n> [!widget|w] W\n> ![[#^grid]]\n\n> [!module|m end] End\n";
  const f=FM+mod+REC+rec("m",fence("booklet answers",'{"q1":"x"}'))+"> [!data] Data\n\n```booklet widget\n{\"engine\":\"grid-select\",\"cells\":[]}\n```\n^grid\n\n%%\n";
  const A=load(f),R=A.parseFile(f),o=A.toMarkdown();
  chk("region: a `> [!data]` line inside the region is reported and kept as written, and the widget under it is not read",R.unread.length===2&&A.BOOK.widgets.length===0&&/> \[!data\] Data\n\n```booklet widget/.test(o)&&cnt(o,/\n\^grid\n/g)===1,JSON.stringify(R.unread));}
 {const f=FM+"> [!activity|a] A\n\n> [!text|q] Q\n"+REC+"> [!records] Again\n\n"+fence("booklet answers",'{"q":"x"}')+"%%\n\n> [!records] A second region\n\n"+fence("booklet answers",'{"q":"y"}');
  const A=load(f),R=A.parseFile(f),o=A.toMarkdown();
  chk("region: a records line after the closing `%%` is read as records, not design: the later value wins, one region is written, nothing is reported",A.peekAnswers("").q==="y"&&R.unread.length===0&&cnt(o,/\[!records\]/g)===1&&cnt(o,/```booklet answers/g)===1&&!/"q":"x"/.test(o),JSON.stringify(R.unread));}
 /* two complete saved booklets joined into one file: every record comes back once, in one region, and the file is stable */
 {const D1="> [!module|a] A\n\n> [!activity|a1] A1\n\n> [!text|qa] QA\n\n> [!text|shared] S\n\n> [!activity|ea repeat] EA\n\n> [!text|ta] TA\n\n> [!module|a end] End\n";
  const D2="> [!module|b] B\n\n> [!activity|b1] B1\n\n> [!text|qb] QB\n\n> [!activity|eb repeat] EB\n\n> [!text|tb] TB\n\n> [!module|b end] End\n";
  const e=(t,k)=>fence("booklet entries "+k,items(entry(t,{x:k+t})));
  const first=FM+D1+REC+rec("a",fence("booklet answers",'{"qa":"a-first","shared":"from first"}'),e("2026-01-01T00:00:00Z","ea"),fence("booklet draft ea",'{"ta":"draft a"}'))+"%%\n";
  const second="\n"+D2+REC+rec("b",fence("booklet answers",'{"qb":"b-second"}'),e("2026-02-01T00:00:00Z","eb"),fence("booklet draft eb",'{"tb":"draft b"}'))+rec("a",fence("booklet answers",'{"shared":"from second"}'),e("2026-03-01T00:00:00Z","ea"))+"%%\n";
  const f=first+second,A=load(f),o=A.toMarkdown(),B=load(o);
  const ok=X=>X.peekAnswers("a").qa==="a-first"&&X.peekAnswers("a").shared==="from second"&&X.peekAnswers("b").qb==="b-second"&&(X.STATE.entries["a/ea"]||[]).length===2&&(X.STATE.entries["b/eb"]||[]).length===1&&X.DRAFTS.custom["a/ea"].ta==="draft a"&&X.DRAFTS.custom["b/eb"].tb==="draft b";
  chk("joined booklets: every answer, entry and draft is read, the shared key takes the later value",ok(A)&&A.allModules().length===2,JSON.stringify([A.peekAnswers("a"),A.peekAnswers("b")]));
  chk("joined booklets: one region is written, each record once, the design between the regions above it; a reopen reads the same with nothing reported",cnt(o,/^> \[!records\] App record/gm)===1&&cnt(o,/\[!records\|a\]/g)===1&&cnt(o,/\[!records\|b\]/g)===1&&cnt(o,/```booklet entries ea/g)===1&&cnt(o,/b-second/g)===1&&o.indexOf("[!module|b]")<o.indexOf("%%\n> [!records]")&&ok(B)&&B.parseFile(o).unread.length===0,o.slice(-700));
  chk("joined booklets: a second save changes nothing",B.toMarkdown()===o);}
 /* nits */
 {const f=FM+MODE+REC+rec("m","A note someone wrote by hand.\n\n","> [!my_kind] Kept?\n> body\n\n")+"%%\n";
  const A=load(f),R=A.parseFile(f);
  chk("nit: prose in the records is reported at its own line (not the blank line before it); an unreadable `> [!` line there is one notice, in line order",R.unread.length===2&&String(R.unread[0]).startsWith("line "+(f.split("\n").indexOf("A note someone wrote by hand.")+1)+": ")&&String(R.unread[1]).startsWith("line "+(f.split("\n").indexOf("> [!my_kind] Kept?")+1)+": ")&&/> \[!/.test(R.unread[1]),JSON.stringify(R.unread));
  const o=A.toMarkdown();
  chk("nit: and both are kept as written, once",cnt(o,/A note someone wrote by hand\./g)===1&&cnt(o,/> \[!my_kind\] Kept\?\n> body/g)===1);}
 {const A=load(FM+MODE+REC+rec("m",fence("booklet sync",'{"x":1}'))+"%%\n");
  A.BOOK.raw.records=[{scope:"m",text:"kept text",stray:"x",foreign:5},{scope:"m",text:"fine"}];
  const o=A.toMarkdown();
  chk("nit: a record restored from storage with an unexpected field writes nothing stray",!/stray|\n5\n/.test(o)&&cnt(o,/fine/g)===1&&cnt(o,/kept text/g)<=1,o.slice(-200));}

 /* S2: a file's id is never a key the language already has, in any map, and a reload from storage keeps it so */
 for(const qid of ["constructor","toString","valueOf","hasOwnProperty"]) for(const rep of [""," repeat"]){
  const f=FM+"> [!module|m] M\n\n> [!activity|a"+rep+"] A\n\n> [!text|"+qid+"] Q\n\n> [!activity|b] B\n\n> [!text|x] X\n\n> [!module|m end] End\n";
  let why="";
  try{const A=load(f);A.screen="m/a";A.render();A.screen="m/b";A.render();
   A.answersIn("m").x="typed";A.draftFor("m/a")[qid]="drafted";A.saveLocal();const id=A.currentId;
   const B=P.boot();B.openBooklet(id);B.screen="m/a";B.render();B.screen="m/b";B.render();
   if(Object.getPrototypeOf(B.answersIn("m"))!==null) why="answers map of a reloaded booklet has a prototype";
   else if(Object.getPrototypeOf(B.draftFor("m/a"))!==null||B.draftFor("m/a")[qid]!=="drafted") why="draft map of a reloaded booklet has a prototype or lost the draft";
   else if(B.peekAnswers("m").x!=="typed") why="answer lost";
   else if(Object.getPrototypeOf(B.peekAnswers("nowhere"))!==null) why="peekAnswers fallback has a prototype";}
  catch(e){why="threw: "+String(e.message).slice(0,60);}
  chk("S2: question id `"+qid+"`"+(rep?" in a repeat activity":" in a once-answered one")+": drawing, typing and a reload from storage all work",why==="",why);}
 {const A=load(FM+MD2);
  A.draftFor("m/e").t="x";
  chk("S2: draftFor, finalizeEntry and peekAnswers hand out maps with no prototype",Object.getPrototypeOf(A.draftFor("m/e"))===null&&Object.getPrototypeOf(A.draftFor("m/never"))===null&&Object.getPrototypeOf(A.peekAnswers("none"))===null);
  A.finalizeEntry("m/e");
  chk("S2: and the draft left after keeping an entry is one too",Object.getPrototypeOf(A.DRAFTS.custom["m/e"])===null);}

 /* S4: every message is true where it is shown */
 {const A=P.boot();
  const out=A.parseFile(FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n"+fence("booklet answers",'{"q":"x"}')+REC+"> [!records] r\n\n"+fence("booklet widget",'{"engine":"grid-select","cells":[]}').replace("```\n\n","```\n^w\n\n")+fence("booklet entries e",'{"items":5}')+fence("booklet later-kind 1",'{"x":1}')+fence("booklet sync",'{"x":1}')+"%%\n").unread;
  chk("S4: an answers block outside a records line says where it belongs, not that the page does not read answers",/^line 11: a “booklet answers” block belongs in the records region/.test(out[0])&&!/not one this page reads/.test(out[0]),JSON.stringify(out));
  chk("S4: a widget block in the records says it is not a record, not that the page does not read widgets",out.some(x=>/this is not a record this page reads/.test(x))&&!out.some(x=>/“booklet widget”/.test(x)),JSON.stringify(out));
  chk("S4: an entries record with no list is kept, and does not say it was skipped; an unknown kind says only that the page does not read it",out.some(x=>/holds no list of items/.test(x)&&!/skipped/.test(x))&&out.some(x=>/“booklet later-kind” block is not one this page reads/.test(x))&&!out.some(x=>/sync/.test(x)),JSON.stringify(out));
  chk("S4: the French and Spanish words for the changed messages are checked (registre, registro; no draft mark)",["fr","es"].every(l=>{const s=P.html.split("\n").filter(x=>/recordNoItems|recordOutside/.test(x)&&x.includes(l==="fr"?"registre":"registro")).join("");return s.length>0&&!/draft/.test(s);}));}

 /* round 3: design after the region is written above it (design first, records last) */
 {const M=(id,t,q)=>"> [!module|"+id+"] "+t+"\n\n> [!activity|"+id+"-a] "+t+" A\n\n> [!text|"+q+"] Q "+q+"\n\n> [!module|"+id+" end] End\n";
  const f=FM+M("m","M","q1")+REC+"> [!records|m] M\n\n"+fence("booklet answers",'{"q1":"x"}')+"> [!records|late] Late\n\n"+fence("booklet answers",'{"lq":"late answer"}')+"%%\n\nProse after the records.\n\n"+M("late","Late","lq")+"\nMore prose at the very end.\n";
  const A=load(f),R=A.parseFile(f);
  chk("R2-B2: a records line finds a module written after the region on the first open: its answer is read, nothing but the move is reported",A.peekAnswers("late").lq==="late answer"&&R.unread.length===1&&/moved above/.test(R.unread[0]),JSON.stringify(R.unread));
  const r=A.addModuleText(FM.replace("title: T","title: Late")+M("late","Late v2","lq2"));
  A.answersIn("late").lq2="v2 answer";
  const o=A.toMarkdown(),B=load(o),R3=P.boot().parseFile(o);
  chk("R2-B1: Add an update to a module that sits after the region: it adds, the file opens, `late` has one fence, nothing is refused",r.ok&&cnt(o,/\[!module\|late\]/g)===1&&R3.ok&&R3.refused.length===0,JSON.stringify([r,R3.refused]));
  chk("R2-B1: its answers come back after a reopen, and the moved text sits above the region",B.peekAnswers("late").lq2==="v2 answer"&&o.indexOf("Prose after the records.")<o.indexOf("%%\n> [!records]")&&o.indexOf("More prose at the very end.")<o.indexOf("%%\n> [!records]")&&B.toMarkdown()===o,o.slice(o.indexOf("> [!module|m end]")));
  const C=load(o);const rm=C.removeModule("late");const o2=C.toMarkdown();
  chk("R2-B1: Remove sees a module that was written after the region",rm.ok&&!/\[!module\|late\]/.test(o2)&&P.boot().parseFile(o2).ok,JSON.stringify(rm));}
 {const W="```booklet widget\n{\"engine\":\"grid-select\",\"cells\":[]}\n```\n^grid\n";
  const mod=t=>"> [!module|m] "+t+"\n\n> [!activity|a] A\n\n> [!text|q1] One\n\n> [!widget|w] W\n> ![[#^grid]]\n\n> [!module|m end] End\n";
  const f=FM+mod("M")+REC+"> [!records|m] M\n\n"+fence("booklet answers",'{"q1":"x"}')+"%%\n\n> [!data|m] Data for M\n\n"+W;
  const A=load(f);
  const r=A.addModuleText(FM.replace("title: T","title: M")+mod("M v2")+"\n> [!data] Data\n\n"+W);
  const o=A.toMarkdown(),R2=P.boot().parseFile(o);
  chk("R2-B1: Add an update to a module whose data section sits after the region: one ^grid block in the file, and it opens",r.ok&&cnt(o,/\n\^grid\n/g)===1&&R2.ok&&R2.refused.length===0,JSON.stringify([r,R2.refused]));}

 /* S2 remainder: kept entries have no prototype either */
 {const f=FM+"> [!module|m] X\n\n> [!activity|log repeat] L\n\n> [!text|constructor] C\n\n> [!text|x] X\n\n> [!module|m end] End\n";
  const A=load(f);A.screen="m/log";A.render();A.draftFor("m/log").x="typed only x";
  let why="";try{A.finalizeEntry("m/log");A.screen="m/log";A.render();
   const e=A.STATE.entries["m/log"][0];if(Object.getPrototypeOf(e)!==null) why="kept entry has a prototype";
   A.saveLocal();const B=P.boot();B.openBooklet(A.currentId);B.screen="m/log";B.render();
   if(Object.getPrototypeOf(B.STATE.entries["m/log"][0])!==null) why="a reloaded entry has a prototype";
   B.viewAt("m/log").chip=B.STATE.entries["m/log"][0].ts;B.render();}catch(e){why="threw: "+String(e.message).slice(0,60);}
  chk("S2: keeping an entry with a blank `constructor` question: the redraw works, the entry is kept, in storage, and no entry has a prototype",why===""&&/typed only x/.test(A.toMarkdown()),why);
  const g=FM+"> [!module|m] X\n\n> [!activity|log repeat] L\n\n> [!text|constructor] C\n\n> [!text|x] X\n\n> [!activity|look] Look\n\n```booklet query\nfrom: log\nas: cards\n```\n\n> [!module|m end] End\n"+REC+"> [!records|m] X\n\n"+fence("booklet entries log",'{"items":[{"ts":"2026-01-01T00:00:00Z","x":"only x"}]}')+"%%\n";
  const C=load(g);let w2="";try{C.screen="m/look";C.render();if(/function|native code/.test(P.texts(P.main()))) w2="shows a function";C.screen="m/log";C.render();C.viewAt("m/log").chip="2026-01-01T00:00:00Z";C.render();}catch(e){w2="threw: "+String(e.message).slice(0,60);}
  chk("S2: entries read from the file have no prototype: a cards query over them and opening a kept entry work",w2===""&&Object.getPrototypeOf(C.STATE.entries["m/log"][0])===null,w2);}

 /* nit: a kept record whose scope names no module and whose foreign field is not text writes nothing stray */
 {const A=load(FM+MODE+REC+rec("m",fence("booklet sync",'{"x":1}'))+"%%\n");
  A.BOOK.raw.records=[{scope:"zz",text:"x",foreign:5},{scope:"m",text:"fine",foreign:{}}];
  const o=A.toMarkdown();
  chk("nit: corrupted storage writes no line `5` and no `[object Object]`",!/^5$/m.test(o)&&!/object Object/.test(o),o.slice(-200));}

 console.log(fails?"\n"+fails+" FAILURES":"\nformat 0.13 checks passed");process.exit(fails?1:0);
})();
