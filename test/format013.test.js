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
  /* a bare activity and a module that share an id are two things: adding the module leaves the activity, removing it leaves the activity */
  {const X=load(FM+"> [!activity|inbox] Bare\n\n> [!text|q] Q\n");X.answersIn("").q="mine";
   const r=X.addModuleText(FM.replace("title: T","title: Mod")+"> [!module|inbox] Module inbox\n\n> [!activity|a] A\n\n> [!module|inbox end] End\n");
   chk("adding a module whose id is a bare activity's id adds a module and leaves the activity",r.ok&&X.allModules().map(m=>m.id+":"+(m.mode||{}).id).join()==="inbox:inbox,inbox:inbox/a",JSON.stringify(r)+X.allModules().map(m=>m.id).join());
   chk("and the file it writes opens with both, the bare activity's answer under the plain records line",(q=>q.ok&&q.refused.length===0&&q.template.modules.length===2)(X.parseFile(X.toMarkdown()))&&answersOf(X.toMarkdown(),"").q==="mine");
   const rm=X.removeModule("inbox");
   chk("removing the module leaves the bare activity",rm.ok&&X.allModules().map(m=>m.id).join()==="inbox"&&X.allModules()[0].mode.id==="inbox",JSON.stringify(rm)+X.allModules().map(m=>m.id).join());}
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
  {const both=FM+"> [!activity|repeat] A\n\n> [!activity|home] B\n",R=A.parseFile(both);
   chk("and so does an activity called `repeat` or `home`: the renderer reads the ids `repeat` and `home`, neither is a setting, and the linter has no error",
     R.unread.length===0&&R.template.modules.map(m=>m.mode.id).join()==="repeat,home"&&!R.template.modules.some(m=>m.mode.kind==="entry")&&/0 errors/.test(lintOut(both)),JSON.stringify(R.template.modules.map(m=>m.mode.id)));}
  }
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

 /* ---- D13: group is a kind of Booklet's own, the plain fold ---- */
 {const A=P.boot();
  const body="> [!activity|a] A\n\n> [!group]- Notes on the week\n> Some words inside.\n\n> [!group] Not folded\n> More words.\n";
  const R=A.parseFile(FM+body);
  chk("`> [!group]- Title` is read as a kind of the format: nothing reported, not marked unknown",R.unread.length===0&&!R.template.modules[0].mode.blocks.some(b=>b.unknown),JSON.stringify(R.unread));
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
  chk("`> [!row|end]` closes a row: two cells, nothing reported",ok.ok&&ok.unread.length===0&&ok.template.modules[0].mode.blocks.some(b=>b.type==="row"&&b.blocks.length===2),JSON.stringify(ok.unread));
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
 {/* the flow that lost data: a broken block is kept, a new entry is added beside it, the reader fixes the comma by hand, the next load and save keep both */
  const broken=items(entry("2026-01-01T10:00:00Z",{t:"old entry 1"}),entry("2026-01-02T10:00:00Z",{t:"old entry 2"})).replace(/\n\]\}$/,",\n]}");
  const A=load(FM+MODE+REC+rec("m",fence("booklet entries e",broken))+"%%\n");
  A.draftFor("m/e").t="new entry, kept after the broken block";A.finalizeEntry("m/e");
  const saved=A.toMarkdown();
  chk("B1 flow: after a new entry the file holds the broken block as it was and the new entry beside it",cnt(saved,/```booklet entries e/g)===2&&saved.includes(broken)&&/new entry, kept after/.test(saved));
  const fixed=saved.replace('"old entry 2"},\n]}','"old entry 2"}\n]}');
  const B=load(fixed);
  chk("B1 flow: the reader mends the comma; the load holds all three entries, nothing reported",fixed!==saved&&(B.STATE.entries["m/e"]||[]).map(x=>x.t).sort().join("|")==="new entry, kept after the broken block|old entry 1|old entry 2"&&B.parseFile(fixed).unread.length===0,JSON.stringify(B.STATE.entries["m/e"]));
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
    A.allModules().map(m=>m.id).join()==="inbox"&&A.allModules()[0].mode.id==="inbox"&&Object.keys(A.STATE.entries).length===0&&Object.keys(A.DRAFTS.custom).length===0&&answersOf(out,"").q==="bare answer"&&!/orphan|module answer/.test(out),out.slice(-300));
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
  chk("should-fix 5: an answers, an entries and a draft block outside a records line are each reported",R.unread.length===3&&["answers","entries","draft"].every(k=>R.unread.some(x=>x.includes("“booklet "+k+"”"))),JSON.stringify(R.unread));
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
 {const lines=["> [!row end]","> [! spaced] Words","> [!1st] Words","> [!note title] Words"];
  for(const ln of lines){const f=FM+"> [!activity|a] A\n\nBefore.\n\n"+ln+"\n\nAfter.\n";
   const R=load(f)&&P.boot().parseFile(f);
   chk("should-fix 7: `"+ln+"` is reported at its own line (line 11) as a line the page cannot read",R.unread.length>=1&&R.unread.some(x=>/^line 11: /.test(x)&&/> \[!/.test(x)),JSON.stringify(R.unread));
   chk("should-fix 7: and is left as text, not lost",JSON.stringify(R.template.modules[0].mode.blocks).includes(ln.replace(/\\/g,"")),JSON.stringify(R.template.modules[0].mode.blocks).slice(0,300));}
  const fine=FM+"> [!activity|a] A\n\n> [!note] A note\n> body\n\n```\n> [!row end]\n```\n";
  chk("should-fix 7: a readable callout, and a `> [!` line inside a code fence, are not reported",P.boot().parseFile(fine).unread.length===0,JSON.stringify(P.boot().parseFile(fine).unread));}

 /* nit: nothing under a records line is read as design; each thing there is kept as written and reported */
 {const f=FM+MODE+REC+rec("m",
    "A note someone wrote by hand.\n\n","> [!note] Kept?\n> body\n\n","```mermaid\ngraph TD; A-->B\n```\n^fig1\n\n",fence("booklet answers",'{"t":"x"}'),"```booklet data\n[{\"label\":\"x\"}]\n```\n^d1\n\n")+"%%\n";
  const A=load(f),R=A.parseFile(f),out=A.toMarkdown();
  chk("records-only: prose, a callout, a figure and a data block under a records line are each reported",R.unread.length===4,JSON.stringify(R.unread));
  chk("records-only: and kept as written, each once",["A note someone wrote by hand.","> [!note] Kept?","graph TD; A-->B\n```\n^fig1","[{\"label\":\"x\"}]\n```\n^d1"].every(t=>cnt(out,new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"))===1),out.slice(-400));
  chk("records-only: they are not read as design (no data block, no figure, no note drawn)",A.allModules().length===1&&A.parseFile(f).template.modules[0].mode.blocks.every(b=>b.type!=="callout"&&b.type!=="markdown"),JSON.stringify(R.template.modules[0].mode.blocks.map(b=>b.type)));
  chk("records-only: load, save, load, save changes nothing",load(out).toMarkdown()===out);}

 /* nit: a malformed `raw.records` (what a browser's storage gave back) does not stop a save */
 {const A=load(FM+MODE+REC+rec("m",fence("booklet sync",'{"x":1}'))+"%%\n");
  let all=true,why="";
  for(const bad of ["garbage",7,{a:1},[null],[{scope:"m"}],[{scope:"m",text:5}],[{scope:5,text:"x"}],[{scope:"m",text:"x",foreign:5}]]){
   A.BOOK.raw.records=bad;try{const o=A.toMarkdown();if(typeof o!=="string") throw new Error("not text");}catch(e){all=false;why+=JSON.stringify(bad)+" ";}}
  chk("a malformed raw.records does not stop toMarkdown",all,why);}

 /* nit: the cross-module query message does not say "refused", and fr and es are marked draft */
 {const two=FM+"> [!module|m1] One\n\n> [!activity|a repeat] A\n\n> [!text|t] T\n\n> [!module|m1 end] End\n\n> [!module|m2] Two\n\n> [!activity|b] B\n\n```booklet query\nfrom: a\n```\n\n> [!module|m2 end] End\n";
  const R=P.boot().parseFile(two),src=P.html.split("\n");
  chk("the cross-module query message says the query is not drawn, and does not say refused",R.unread.some(x=>/query in “b”.*not drawn/.test(x))&&!R.unread.some(x=>/refused/.test(x)),JSON.stringify(R.unread));
  chk("fr and es queryRefused no longer say refused (refusé, rechazó), and are marked l10n: draft",src.filter(l=>/queryRefused:/.test(l)).length===3&&src.filter(l=>/l10n: draft/.test(l)&&/queryRefused:/.test(l)).length===2&&!src.some(l=>/queryRefused:/.test(l)&&/refus|rechaz|rejet|rejected/i.test(l.replace("queryRefused",""))));}

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
  chk("and an activity called `repeat` is not a repeating one",(R=>R.template.modules[0].mode.kind!=="entry"&&R.template.modules[1].mode.id==="home")(P.boot().parseFile(FM+"> [!activity|repeat] A\n\n> [!activity|home] B\n")));}

 /* security: a module or activity id the language already has is an ordinary id, and a file id never writes onto Object.prototype */
 {const before=Object.getOwnPropertyNames(Object.prototype).sort().join();
  const f=FM+"> [!module|__proto__] X\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|__proto__ end] End\n"+REC+"> [!records|__proto__] X\n\n"+fence("booklet answers",'{"pollutedByFile":"yes"}')+fence("booklet draft __proto__",'{"pollutedByDraft":"yes"}')+"%%\n";
  const A=load(f),R=A.parseFile(f),out=A.toMarkdown();
  chk("proto: Object.prototype gets no new property from a file with `__proto__` in its ids and records",Object.getOwnPropertyNames(Object.prototype).sort().join()===before&&({}).pollutedByFile===undefined&&({}).pollutedByDraft===undefined);
  chk("proto: the id `__proto__` is reported, and the block under its records line survives a save as written",R.unread.some(x=>/__proto__/.test(x))&&/pollutedByFile/.test(out)&&/pollutedByDraft/.test(out)&&cnt(out,/pollutedByFile/g)===1);
  const g=FM+MODE+REC+rec("m",fence("booklet draft __proto__",'{"pollutedByDraft2":"yes"}'),fence("booklet entries __proto__",items(entry("2026-01-01T00:00:00Z",{x:1}))))+"%%\n";
  const B=load(g);
  chk("proto: a draft or entries block for an activity named `__proto__` is reported, kept as written, and pollutes nothing",({}).pollutedByDraft2===undefined&&B.parseFile(g).unread.length===2&&/pollutedByDraft2/.test(B.toMarkdown()));
  const h=FM+"> [!module|constructor] C\n\n> [!activity|toString] A\n\n> [!text|valueOf] Q\n\n> [!module|constructor end] End\n"+REC+rec("constructor",fence("booklet answers",'{"valueOf":"kept","hasOwnProperty":"also"}'))+"%%\n";
  const C=load(h),o=C.toMarkdown();
  chk("proto: ids like constructor, toString and valueOf are ordinary: the answer is read and written back",C.peekAnswers("constructor").valueOf==="kept"&&answersOf(o,"constructor").hasOwnProperty==="also"&&C.parseFile(h).unread.length===0&&load(o).toMarkdown()===o,o.slice(-200));
  C.answersIn("constructor").valueOf="changed";
  chk("proto: and a change to it is the only change",answersOf(C.toMarkdown(),"constructor").valueOf==="changed"&&Object.keys(answersOf(C.toMarkdown(),"constructor")).length===2);}

 console.log(fails?"\n"+fails+" FAILURES":"\nformat 0.13 checks passed");process.exit(fails?1:0);
})();
