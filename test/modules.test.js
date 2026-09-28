// Modules hold activities: booklet → modules → activities, structure only.
// A module carries one activity in `mode` or several in `activities`, never both.
// Activity ids stay unique across the booklet, so entries and drafts stay keyed
// by them and nothing about the save path changes.
// Run: node test/modules.test.js   (node and python3; nothing to install)
require("./harness.js");            // the browser stubs the renderer's script needs
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(R,"booklet.html"),"utf8");

/* The harness exposes a fixed list of internals. This file needs a few more
   (the module accessors, finalizeEntry, the current view), so it evaluates the
   same single <script> itself, exactly as the harness does, and exposes them. */
/* Record click handlers, which the harness's stub drops, so a test can press a
   card the way a reader would. */
const mk0=global.document.createElement;
global.document.createElement=tag=>{const n=mk0(tag);
  n.addEventListener=function(type,fn){(this._on||(this._on={}))[type]=fn;};
  /* and keep what is written as innerHTML, which a card's name can be */
  Object.defineProperty(n,"innerHTML",{get(){return this._html||"";},
    set(v){this._html=String(v);this.children=[];}});
  return n;};
const src=html.split("<script>\n")[1].split("\n</script>")[0];
eval(src+`
global.P4={modesOf,isMulti,holderOf,moduleOf,modeOf,tplModes,tplModules,allModules,moduleView,
  moduleForView,MODULE_PAGE,MODE_KINDS,addModule,removeModule,refusalOf,moduleOk,moduleFromText,
  parseFile,applyParsed,toMarkdown,saveLocal,loadLocal,render,go,finalizeEntry,draftFor,keptFor,
  activityName,editTemplate,modWithId,moveActivity,showActivity,setEditing:v=>{editing=v},
  getView:()=>view,setView:v=>{view=v},getS:()=>S,getD:()=>D,getTPL:()=>TPL,setLang:l=>{lang=l},
  fresh:()=>{S=emptyS();D={today:emptyToday(),checkin:emptyCheckin()};TPL=EMPTY_BOOKLET;
    view="home";editing=false;lang="en";}};`);
const A=global.P4;

let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d?"   → "+d:""));};
const fixture=n=>fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8");
/* modules/ is version 2 markdown now; a real module object is read the same
   way the renderer itself reads one, then handed back exactly as a v1
   moduleFromText() used to hand one back, so every check below that mutates
   or re-installs it still works unchanged. */
const repoModule=n=>{const t=fs.readFileSync(path.join(R,"modules",n+".md"),"utf8");
  return A.moduleFromText(t)||(A.parseFile(t).template||{}).modules?.[0];};
const twoActs=()=>A.moduleFromText(fixture("module-two-activities.md"));
const clone=o=>JSON.parse(JSON.stringify(o));
/* the module blocks a written file carries, parsed the way a reader must:
   fence by fence, never by matching text */
const moduleBlocks=md=>[...md.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]
  .map(m=>{try{return JSON.parse(m[1]);}catch(e){return null;}}).filter(o=>o&&o.block==="module");
/* every string drawn under a node of the stub DOM */
const textOf=n=>n==null?"":typeof n==="string"?n
  :(n._text||"")+" "+(n._html||"").replace(/<[^>]*>/g," ")+" "+(n.children||[]).map(textOf).join(" ");
const findAll=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);
  (n.children||[]).forEach(k=>findAll(k,pred,out));}return out;};
const main=()=>global.document.getElementById("main");
const cards=()=>findAll(main(),n=>n.tagName==="button"&&n.attrs&&n.attrs.class==="mode");
const lint=(...args)=>spawnSync("python3",[path.join(R,"lint-booklet.py"),...args],{encoding:"utf8"});
/* a lint run in one line: its errors and its count */
const brief=r=>r.stdout.split("\n").filter(l=>/^ERROR|checked/.test(l)).join(" / ");

// ---- the schema, read through one accessor
A.fresh();
{const m=twoActs();
 chk("the fixture module carries `activities` and no `mode`",Array.isArray(m.activities)&&m.mode===undefined);
 chk("modesOf reads two activities from `activities`",A.modesOf(m).map(a=>a.id).join(",")==="sw-words,sw-quiz");
 const one=repoModule("daily-journal");
 chk("modesOf reads the one activity from `mode`",A.modesOf(one).map(a=>a.id).join(",")==="journal");
 chk("a module with both keys is not well-formed",
   !A.moduleOk(A.moduleFromText(fixture("module-mode-and-activities.md"))));
 chk("a module with no activity is not well-formed",!A.moduleOk({id:"x/empty",activities:[]}));
 chk("two activities with one id in one module are not well-formed",
   !A.moduleOk({id:"x/twice",activities:[{id:"a",kind:"entry"},{id:"a",kind:"entry"}]}));
 /* `modes` was the key's name before release; nothing reads it now */
 chk("the retired key `modes` is not read: a module relying on it holds no activity",
   !A.moduleOk({id:"x/old",modes:[{id:"o1",kind:"entry",blocks:[]},{id:"o2",kind:"entry",blocks:[]}]}));
 chk("a two-activity module read through `activities` is well-formed",A.moduleOk(twoActs())&&A.isMulti(twoActs()));
 chk("no file can name the module page as an activity's kind",
   !A.moduleOk({id:"x/k",mode:{id:"k",kind:"module"}})&&!A.moduleOk({id:"x/k",mode:{id:"k",kind:"toString"}}));}

// ---- a two-activity module loads
A.fresh();
chk("a two-activity module is added",A.addModule(twoActs())===true);
chk("both its activities are activities of the booklet",
  ["sw-words","sw-quiz"].every(id=>A.tplModes().some(m=>m.id===id)));
chk("both are held by the one module",
  A.holderOf("sw-words").id==="fixture/study-week"&&A.holderOf("sw-quiz").id==="fixture/study-week");
chk("an activity inside `activities` is named by its own title, not its module's",
  A.moduleOf("sw-quiz").title.en==="Quiz"&&A.activityName(A.modeOf("sw-quiz"))==="Quiz");

// ---- home lists one card per module; the module page lists its activities
A.addModule(repoModule("daily-journal"));
A.setView("home");A.render();
{const cs=cards();
 chk("home shows one card per module, not one per activity",cs.length===2,cs.length+" cards");
 const card=cs.find(c=>/Study week/.test(textOf(c)));
 chk("the module's card names its activities",!!card&&/Words/.test(textOf(card))&&/Quiz/.test(textOf(card)));
 const jcard=cs.find(c=>/Daily journal/.test(textOf(c)));
 jcard._on.click();
 chk("a one-activity module's card still opens its activity directly",A.getView()==="journal");
 A.go("home");card._on.click();
 chk("a multi-activity module's card opens the module page",A.getView()===A.moduleView("fixture/study-week"));
 let ok=true;try{A.render();}catch(e){ok=false;chk("module page render error",false,e.message);}
 const acts=cards();
 chk("the module page renders and lists each activity",
   ok&&acts.length===2&&/Words/.test(textOf(acts[0]))&&/Quiz/.test(textOf(acts[1])),
   acts.map(textOf).join(" | "));
 acts[1]._on.click();
 chk("an activity card opens that activity",A.getView()==="sw-quiz");
 ok=true;try{A.render();}catch(e){ok=false;chk("activity render error",false,e.message);}
 chk("the activity page draws, headed by the activity's own name",
   ok&&findAll(main(),n=>n.tagName==="h2").some(h=>textOf(h).trim()==="Quiz"));
 A.setView(A.moduleView("nobody/here"));
 ok=true;try{A.render();}catch(e){ok=false;}
 chk("a module page for a module that is not there falls back to home",
   ok&&A.getView()==="home"&&cards().length===2);
 A.setView(A.moduleView("example-daily-journal"));A.render();
 chk("a module page for a module with one activity leads to that activity",A.getView()==="journal");}

// ---- editing an activity inside `activities` edits that activity, not its module
{const before=clone(A.getTPL().modules.find(m=>m.id==="fixture/study-week"));
 /* exactly what the activity page's editor does (renderEntry, renderBoard):
    modWithId(template, moduleOf(id).id), then write title/blurb, or blocks
    through `.mode` */
 const id=A.moduleOf("sw-quiz").id;
 A.editTemplate(t=>{const x=A.modWithId(t,id);x.title={...x.title,en:"Pop quiz"};
   x.mode.blocks=x.mode.blocks||[];x.mode.blocks.push({id:"extra",type:"text",q:["sw","answers"]});});
 const after=A.getTPL().modules.find(m=>m.id==="fixture/study-week");
 chk("renaming an activity renames the activity",after.activities[1].title.en==="Pop quiz"&&after.title.en===before.title.en);
 chk("adding a block adds it to that activity only",
   after.activities[1].blocks.length===2&&after.activities[0].blocks.length===before.activities[0].blocks.length);
 A.editTemplate(t=>{const x=A.modWithId(t,id);x.title={...x.title,en:"Quiz"};
   x.mode.blocks=x.mode.blocks.filter(b=>b.id!=="extra");});}

// ---- a module's activities are ordered and shown by display parameters
{const order=()=>A.modesOf(A.tplModules().find(m=>m.id==="fixture/study-week")).map(a=>a.id).join(",");
 A.moveActivity("fixture/study-week","sw-quiz",-1);
 const raw=A.getTPL().modules.find(m=>m.id==="fixture/study-week");
 chk("moving an activity reorders it by display.order, not by rewriting the file",
   order()==="sw-quiz,sw-words"&&raw.activities[0].id==="sw-words"&&raw.activities[1].display.order===10);
 A.moveActivity("fixture/study-week","sw-quiz",1);
 chk("and moving it back restores the order",order()==="sw-words,sw-quiz");
 A.showActivity("fixture/study-week","sw-quiz",false);
 A.setView(A.moduleView("fixture/study-week"));A.render();
 chk("a hidden activity leaves the module page",cards().length===1&&/Words/.test(textOf(cards()[0])));
 A.setEditing(true);let ok=true;try{A.render();}catch(e){ok=false;}
 chk("while editing, the module page lists every activity with its controls",
   ok&&findAll(main(),n=>n.attrs&&n.attrs.class==="bkrow").length===2);
 A.showActivity("fixture/study-week","sw-words",false);A.go("home");
 chk("while editing, a module with every activity hidden keeps its card",
   cards().some(c=>/Study week/.test(textOf(c))));
 A.setEditing(false);A.render();
 chk("and outside editing it has none",!cards().some(c=>/Study week/.test(textOf(c))));
 A.showActivity("fixture/study-week","sw-words",true);A.showActivity("fixture/study-week","sw-quiz",true);
 A.editTemplate(t=>{t.modules.find(m=>m.id==="fixture/study-week").activities.forEach(a=>{delete a.display;});});}

// ---- entries are kept per activity, and survive a save and reload
{A.draftFor("sw-words").thoughts=["hola","adiós"];A.draftFor("sw-words").unsure="adiós";
 A.finalizeEntry("sw-words");
 A.draftFor("sw-quiz").answers="hola = hello";A.finalizeEntry("sw-quiz");
 A.draftFor("sw-quiz").answers="half-written";          // a draft left open
 const S=A.getS();
 chk("each activity keeps its own entries",
   S.entries["sw-words"].length===1&&S.entries["sw-quiz"].length===1
   &&S.entries["sw-words"][0].unsure==="adiós"&&S.entries["sw-quiz"][0].answers==="hola = hello"
   &&S.entries["sw-quiz"][0].unsure===undefined);
 const md=A.toMarkdown();
 const mods=moduleBlocks(md);
 const mb=mods.find(m=>m.id==="fixture/study-week");
 chk("the file carries one module block holding both activities in `activities`",
   mods.length===2&&!!mb&&Array.isArray(mb.activities)&&mb.activities.length===2&&mb.mode===undefined);
 chk("and one entries block per activity",
   /"mode": "sw-words"/.test(md)&&/"mode": "sw-quiz"/.test(md));
 A.fresh();const P=A.parseFile(md);
 chk("the written file reads back",P.ok&&P.unread.length===0,P.unread.join(" | "));
 A.applyParsed(P,"replace");const S2=A.getS();
 chk("after a reload the module still holds both activities",
   A.modesOf(A.tplModules().find(m=>m.id==="fixture/study-week")).length===2);
 A.setView("history");let hok=true;try{A.render();}catch(e){hok=false;}
 const tags=findAll(main(),n=>n.tagName==="button"&&n.attrs&&n.attrs["aria-pressed"]!==undefined).map(textOf).join("|");
 chk("history offers each activity by its own name",hok&&/Words/.test(tags)&&/Quiz/.test(tags),tags);
 chk("after a reload each activity has its own entries back",
   S2.entries["sw-words"][0].unsure==="adiós"&&S2.entries["sw-words"][0].thoughts.join(",")==="hola,adiós"
   &&S2.entries["sw-quiz"][0].answers==="hola = hello");
 chk("the module block is written back identically",
   JSON.stringify(moduleBlocks(A.toMarkdown()).find(m=>m.id==="fixture/study-week"))===JSON.stringify(mb));
 /* the browser's own save. Drafts are held per activity id (D.custom[id]) and
    written that way; reading them back is the save path's business, and today
    its loadLocal restores only the two built-in drafts, for every custom
    activity alike — a pre-existing gap reported to the save path's owner,
    not something this layer changes. */
 A.draftFor("sw-quiz").answers="half-written";A.saveLocal();
 const saved=JSON.parse(global.__ls["useful-next-step.v1"]||"{}");
 chk("a browser save holds each activity's draft under its own id",
   ((saved.D||{}).custom||{})["sw-quiz"].answers==="half-written");
 A.fresh();const back=A.loadLocal();
 chk("a browser save and reload keeps both activities and each one's entries",
   !!back&&A.modesOf(A.tplModules().find(m=>m.id==="fixture/study-week")).length===2
   &&A.getS().entries["sw-quiz"][0].answers==="hola = hello"
   &&A.getS().entries["sw-words"][0].unsure==="adiós");}

// ---- a one-activity module is written back with `mode`, unchanged
// modules/ is version 2 now, which round-trips its own raw source verbatim by
// construction (see test/v2.test.js); this checks the OLD version 1 JSON
// round-trip instead, so it gets its own small fixture rather than reaching
// into the real registry for a shape the registry no longer carries.
A.fresh();
{const src=moduleBlocks(fixture("module-one-activity.md"))[0];
 const {block,...orig}=src;
 A.addModule(clone(orig));
 const md=A.toMarkdown();A.fresh();A.applyParsed(A.parseFile(md),"replace");
 const {block:b2,...back}=moduleBlocks(A.toMarkdown())[0];
 chk("a one-activity module is written back with `mode` and no `activities`",
   back.mode&&back.activities===undefined);
 chk("and is otherwise byte-for-byte the module it was",JSON.stringify(back)===JSON.stringify(orig));
 A.fresh();
 const single={id:"x/one",title:{en:"One"},activities:[{id:"x-one",kind:"entry",blocks:[]}]};
 A.addModule(clone(single));
 const w=moduleBlocks(A.toMarkdown())[0];
 chk("a module sent with one activity in `activities` is written back as `mode`",
   w.mode&&w.mode.id==="x-one"&&w.activities===undefined);}

// ---- an activity-id collision between two modules is refused
A.fresh();
{A.addModule(twoActs());
 const intruder={id:"other/quiz",title:{en:"Other quiz"},mode:{id:"sw-quiz",kind:"entry",blocks:[]}};
 chk("adding a different module that holds an existing activity id is refused",
   A.addModule(clone(intruder))===false);
 chk("and nothing is replaced",A.holderOf("sw-quiz").id==="fixture/study-week"
   &&!A.allModules().some(m=>m.id==="other/quiz"));
 const why=A.refusalOf(intruder)||"";
 chk("the refusal says which activity, and which module holds it",
   /sw-quiz/.test(why)&&/fixture\/study-week/.test(why)&&/other\/quiz/.test(why),why);
 chk("the same module again is an update, not a clash",
   A.addModule({...twoActs(),version:"0.2"})===true
   &&A.allModules().find(m=>m.id==="fixture/study-week").version==="0.2");
 A.removeModule("fixture/study-week");
 chk("a parked module still owns its activity ids",A.addModule(clone(intruder))===false);}

A.fresh();
{const P=A.parseFile(fixture("booklet-activity-collision.md"));
 chk("the loader keeps the first module and refuses the second",
   P.ok&&P.template.modules.map(m=>m.id).join(",")==="fixture/first");
 const msg=P.unread.join(" | ");
 chk("with a message naming the id and both modules",
   /shared-quiz/.test(msg)&&/fixture\/first/.test(msg)&&/fixture\/second/.test(msg),msg);
 A.applyParsed(P,"replace");
 chk("and the booklet opens with the rest of it",
   A.tplModules().map(m=>m.id).join(",")==="fixture/first"&&A.holderOf("shared-quiz").id==="fixture/first");
 A.setLang("fr");
 const fr=A.parseFile(fixture("booklet-activity-collision.md")).unread.join(" | ");
 chk("the message is in the reader's language",/refusé/.test(fr)&&/shared-quiz/.test(fr),fr);
 A.setLang("en");
 const both=A.parseFile(fixture("booklet-activity-collision.md")
   .replace('"id": "fixture/second", "version": "0.1",',
            '"id": "fixture/second", "version": "0.1", "activities": [],'));
 chk("a module in a file with both `mode` and `activities` is refused by the loader too",
   both.template.modules.every(m=>m.id!=="fixture/second")&&/both/.test(both.unread.join(" ")));}

// ---- the linter
{const ok=lint(path.join(__dirname,"fixtures","module-two-activities.md"));
 chk("lint accepts the two-activity module",ok.status===0&&/0 errors · 0 warnings/.test(ok.stdout),brief(ok));
 const both=lint(path.join(__dirname,"fixtures","module-mode-and-activities.md"));
 chk("lint rejects `mode` and `activities` together",both.status===1&&/both `mode` and `activities`/.test(both.stdout),brief(both));
 const clash=lint(path.join(__dirname,"fixtures","booklet-activity-collision.md"));
 chk("lint refuses an activity id held by two modules",
   clash.status===1&&/activity 'shared-quiz' is in both module 'fixture\/first' and module 'fixture\/second'/.test(clash.stdout),
   brief(clash));
 // the retired key, alone and beside a `mode`
 {const dir=fs.mkdtempSync(path.join(os.tmpdir(),"p4-old-"));
  const src=fixture("module-two-activities.md");
  const alone=path.join(dir,"alone.md");fs.writeFileSync(alone,src.replace(' "activities": [\n',' "modes": [\n'));
  const r1=lint(alone);
  chk("lint rejects a module that holds its activities in the retired `modes`, and names `activities`",
    r1.status===1&&/carries `modes`, which is not a module key/.test(r1.stdout)&&/`activities`/.test(r1.stdout),brief(r1));
  const beside=path.join(dir,"beside.md");
  fs.writeFileSync(beside,fixture("module-mode-and-activities.md").replace(' "activities": [\n',' "modes": [\n'));
  const r2=lint(beside);
  chk("a stray `modes` beside a `mode` is a warning, not an error",
    r2.status===0&&/carries `modes` beside its `mode`/.test(r2.stdout),brief(r2));}
 // a booklet the renderer itself writes, with a two-activity module in it.
 // The second module is the dedicated v1 fixture, not a real (now version 2)
 // registry file: a version 2 module's own blocks come back typed
 // "markdown", which the version 1 linter's vocabulary predates.
 const {block:_b,...oneAct}=moduleBlocks(fixture("module-one-activity.md"))[0];
 A.fresh();A.addModule(twoActs());A.addModule(oneAct);
 A.editTemplate(t=>{t.id="fixture/booklet";t.version="0.1";});
 const md=A.toMarkdown().replace(/^---\n/,"---\nstatus: approved\n");
 const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"p4-")),"written.md");
 fs.writeFileSync(tmp,md);
 const w=lint(tmp);
 chk("lint accepts a booklet the renderer wrote with a two-activity module",
   w.status===0&&/0 errors · 0 warnings/.test(w.stdout),brief(w));
 const repo=lint();
 // registry-language warnings (widgets/mensio-*.md, still version 1) are test/lint.test.js's to check
 chk("lint still passes the repo unchanged",
   repo.status===0&&/18 booklet files checked · 0 errors · /.test(repo.stdout)
   &&!repo.stdout.split("\n").some(l=>l.startsWith("warn")&&!/: registry languages: /.test(l)),brief(repo));}

// ---- a module's name is text, never markup: a title written as HTML used to
// go into the home card with innerHTML, and an onerror in it ran on load
{A.fresh();const m=repoModule("daily-journal");
 const evil=`Journal <img src="x" onerror="ATTACK()"> <b>bold</b>`;
 m.title={en:evil,fr:evil,es:evil};A.addModule(m);A.setView("home");A.render();
 const card=cards().find(c=>/Journal/.test(textOf(c)));
 const htmls=card?findAll(card,n=>!!n._html).map(n=>n._html):[];
 chk("a module's title reaches the home card as text, whole",
   !!card&&findAll(card,n=>(n.children||[]).includes(evil)).length===1,card&&textOf(card));
 chk("and none of it is written as HTML: the only markup on the card is the renderer's own icon",
   !!card&&htmls.every(h=>/^<svg viewBox="0 0 24 24"/.test(h))&&!htmls.some(h=>/onerror|<img|<b>/.test(h)),htmls.join(" | "));}
{const sets=[...src.matchAll(/\bhtml:([^}]*)\}/g)].map(m=>m[1].trim());
 chk("every html: the renderer hands el() is one of its own icons, or the unused paras() helper's",
   sets.length>=3&&sets.every(v=>/^ICONS\[[\w.|]+\]\|\|""$/.test(v)||v==="t"),sets.join(" | "));
 chk("and paras(), which would take any HTML, is called nowhere",!/\bparas\(/.test(src));}

console.log(fails?"\n"+fails+" FAILURES":"\nmodule checks passed");
process.exit(fails?1:0);
