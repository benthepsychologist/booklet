// The downloaded file and the browser's own copy must hold the same booklet.
//
// The browser keeps a snapshot {S, D, TPL, lang, dirty, unsavedEntries} per
// booklet. A downloaded .md is written by toMarkdown() and read back by
// parseFile() and applyParsed(). Everything the snapshot holds must come back
// from the file, except the few normalisations SPEC.md names ("What a round
// trip keeps"). Each section below reproduces one way that promise was broken:
//
//   1. drafts of every activity other than `today` and `checkin`;
//   2. the rest of the person's work: unnamed and empty areas, empty Now rows,
//      spaces around the name and note, the booklet's own format marker;
//   3. what is typed into a `board` or a `guide` activity;
//   4. files written before this change must load exactly as they did.
//
// Every boot() evaluates the renderer's one <script> afresh against one shared
// in-memory localStorage, so a boot is a page load (see library.test.js).
//
// Run: node test/roundtrip.test.js      (Needs node and git; nothing to install.)
require("./harness.js");                     // the DOM and storage stubs only
const fs=require("fs"),path=require("path"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const html=fs.readFileSync(R+"/booklet.html","utf8");
const scriptOf=h=>h.split("<script>\n")[1].split("\n</script>")[0];
const SRC=scriptOf(html);
const LS=global.__ls;
const modText=n=>fs.readFileSync(R+"/modules/"+n+".md","utf8");
/* modules/ is version 2 markdown now; moduleFromText() (v1 only) returns
   nothing for it, so a real module object is read the way the renderer
   itself reads one, then installed exactly as addModule(moduleFromText(...))
   used to install one. Silently installing nothing (as every call below did
   until this fix) let most of this file's checks pass vacuously instead of
   actually exercising a real module's round trip. */
const addMod=(A,n)=>{const t=modText(n);
  return A.addModule(A.moduleFromText(t)||(A.parseFile(t).template.modules||[])[0]);};

let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const note=m=>console.log("  note  "+m);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/* every path at which two plain JSON values differ */
function diff(x,y,p="",out=[]){if(same(x,y)) return out;
  if(x&&y&&typeof x==="object"&&typeof y==="object"&&Array.isArray(x)===Array.isArray(y)){
    for(const k of new Set([...Object.keys(x),...Object.keys(y)])) diff(x[k],y[k],p+(Array.isArray(x)?"["+k+"]":"."+k),out);
    return out;}
  out.push(p+": "+JSON.stringify(x)+" ≠ "+JSON.stringify(y));return out;}

/* ---- one page load (as in library.test.js) ---------------------------- */
const pages=[];
function closePages(){for(const p of pages.splice(0)) p.close();}
const wipe=()=>{closePages();for(const k of Object.keys(LS)) delete LS[k];};
function boot(src=SRC){const API={};
  let open=true;const timers=new Set(),on={};
  const setTimeout=(f,ms,...a)=>{const h=global.setTimeout(()=>{timers.delete(h);f(...a);},ms);timers.add(h);return h;};
  const clearTimeout=h=>{timers.delete(h);global.clearTimeout(h);};
  const window=Object.assign(Object.create(global.window),{addEventListener(k,f){(on[k]=on[k]||[]).push(f);}});
  pages.push({close(){if(!open) return;(on.pagehide||[]).forEach(f=>f());open=false;
    timers.forEach(h=>global.clearTimeout(h));timers.clear();}});
  eval(src+`
;Object.defineProperties(API,Object.getOwnPropertyDescriptors({
  get S(){return S},set S(v){S=v}, get D(){return D},set D(v){D=v}, get TPL(){return TPL},set TPL(v){TPL=v},
  get lang(){return lang},set lang(v){lang=v}, get view(){return view},set view(v){view=v},
  get dirty(){return dirty},set dirty(v){dirty=v}, get unsavedEntries(){return unsavedEntries},set unsavedEntries(v){unsavedEntries=v},
  get pending(){return pending},set pending(v){pending=v},
  emptyS, emptyToday, emptyCheckin, emptyArea, EMPTY_BOOKLET,
  openBooklet, createBooklet, saveLocal, loadLocal, flushSave, readLib, editTemplate, allModules,
  toMarkdown, parseFile, applyParsed, addModule, removeModule, moduleFromText, render, loadText, tplModes,
  fresh(){S=emptyS();D={today:emptyToday(),checkin:emptyCheckin()};TPL=EMPTY_BOOKLET;dirty=false;unsavedEntries=0;}
}));`);
  return API;}

/* ---- the DOM stub, made to remember its listeners so typing can be replayed */
const findAll=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);(n.children||[]).forEach(c=>findAll(c,pred,out));}return out;};
const origCreate=global.document.createElement;
global.document.createElement=tag=>{const n=origCreate(tag);n._on={};n.addEventListener=(k,f)=>{n._on[k]=f;};return n;};
const main=()=>global.document.getElementById("main");
/* type into the n-th text box of an activity, through its own input handler */
function typeInto(A,view,value,n=0){A.view=view;A.render();
  const ta=findAll(main(),x=>x.tagName==="textarea")[n];
  if(!ta) throw new Error("no text box "+n+" in "+view);
  ta.value=value;ta._on.input({target:ta});}
const shownIn=(A,view,n=0)=>{A.view=view;A.render();
  const ta=findAll(main(),x=>x.tagName==="textarea")[n];return ta?ta.value:undefined;};

/* a clock that stands still, so two files written at different moments compare */
const RealDate=Date;
const freeze=iso=>{const T0=new RealDate(iso).getTime();
  global.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[T0]));} static now(){return T0;}};};
const thaw=()=>{global.Date=RealDate;};

/* the record, read the way an independent reader would: parse every fence */
const recordOf=md=>[...md.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]
  .map(m=>{try{return JSON.parse(m[1]);}catch(e){return null;}}).filter(o=>o&&o.block);
const snapOf=A=>JSON.parse(JSON.stringify({S:A.S,D:A.D,TPL:A.TPL,lang:A.lang,dirty:A.dirty,unsavedEntries:A.unsavedEntries}));
/* The writer writes modules in the order they are shown (display.order, then
   as written), which is the only order a module list has; the array a page
   happens to hold them in is not kept. So modules compare in shown order. */
const shownOrder=(A,s)=>{s=JSON.parse(JSON.stringify(s));const ids=A.allModules().map(m=>m.id);
  if(s.TPL&&Array.isArray(s.TPL.modules)) s.TPL.modules.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));return s;};
/* download, Clear everything, load the file: the round trip a person makes */
function roundTrip(A){const md=A.toMarkdown();A.fresh();A.applyParsed(A.parseFile(md),"replace");return md;}

/* two activities of kinds the page draws the same way, with a question each */
const BOARD={id:"test/plans",version:"0.1",title:{en:"Plans"},
  mode:{id:"plans",kind:"board",blocks:[{id:"plan",type:"text",q:["plans","plan"]},
    {id:"note",type:"text",q:["plans","aside"]}]}};
const GUIDE={id:"test/reading",version:"0.1",title:{en:"Reading"},
  mode:{id:"reading",kind:"guide",blocks:[{id:"intro",type:"prose",text:{en:"Read this, then say what you think."}},
    {id:"reflect",type:"text",q:["reading","reflect"]}]}};
const READ_ONLY={id:"test/leaflet",version:"0.1",title:{en:"Leaflet"},
  mode:{id:"leaflet",kind:"guide",blocks:[{id:"l1",type:"prose",text:{en:"Only words to read."}}]}};

/* a booklet with something in every part of the snapshot */
function fillRich(A,tag){
  ["mensio-the-day","mensio-check-in","end-of-day","daily-journal","the-board"].forEach(n=>addMod(A,n));
  [BOARD,GUIDE,READ_ONLY].forEach(m=>A.addModule(JSON.parse(JSON.stringify(m))));
  A.editTemplate(t=>{t.head={title:{en:"Sam's booklet "+tag},sub:{en:"kept by hand"}};t.menus={...(t.menus||{}),colours:["red","blue"]};});
  const S=A.S,D=A.D;
  S.name="Sam "+tag+"  ";S.note="  A note for "+tag+"  \n\nsecond paragraph  \n";S.mode="compact";
  S.now.items=[{kind:"move",text:"call Jo "+tag+"  ",since:"2026-09-01",starter:false},
    {kind:"exploring",text:"",since:"2026-09-02",starter:false},
    {kind:"suggestion",text:"walk",since:"2026-09-03",starter:true}];
  S.areas=[{...A.emptyArea(),label:"Work "+tag+" ",matters:"it matters  ",items:[{kind:"move",text:"ask for help",since:"2026-09-04",starter:false},{kind:"move",text:"",since:"2026-09-05",starter:false}]},
    {...A.emptyArea(),matters:"an area nobody has named yet"},
    {...A.emptyArea()},
    {...A.emptyArea(),label:"Rest"}];
  S.archive=[{date:"2026-09-01",kind:"move",area:"",text:"first · thing",outcome:"done"},
    {date:"2026-09-03",kind:"exploring",area:"Work "+tag,text:"second\nline",outcome:"replaced"}];
  S.big.s1.happening="a legacy answer";S.big.starter["s1.happening"]=true;
  S.q={"today.mind":{label:"Custom "+tag+"?",hint:"h",options:["a","b"]}};
  S.entries={eod:[{ts:"2026-09-20T10:00:00.000Z",snag:"meetings "+tag}],journal:[{ts:"2026-09-21T08:00:00.000Z",day:"quiet"}]};
  S.today=[{...A.emptyToday(),ts:"2026-09-21T10:00:00.000Z",mind:"today "+tag}];
  S.checkins=[{...A.emptyCheckin(),ts:"2026-09-22T09:00:00.000Z",other:"calm "+tag,thoughts:["one"]}];
  S.goodday={people:["Jo "+tag]};S.page={blocks:[{id:"b1",type:"prose",text:"hello "+tag}]};
  S.prefs.noRemind=true;S.emo.extra={slog:["tired "+tag]};
  S.person.email=tag+"@example.invalid";S.person.sync={provider:"gdrive",ref:"f1",synced:"2026-09-20T00:00:00Z",rev:"7"};
  S.setup={...S.setup,done:true,charge:"me"};
  D.today.mind="draft "+tag;D.today.area="Work "+tag+" ";
  D.checkin.other="half a check-in";
  D.custom={eod:{snag:"half-typed "+tag+"  ",lines:["first",""]},journal:{day:"started"}};
  typeInto(A,"plans","a plan for "+tag+"  ");
  typeInto(A,"reading","what I think of it");
  A.dirty=true;A.unsavedEntries=3;}

(async()=>{

// ---- 1. drafts of every activity, not only the two built-in ones ------------
wipe();
{let A=boot();const e=await A.createBooklet();
 addMod(A,"end-of-day");
 A.D.custom={eod:{snag:"half-typed  ",lines:["first",""]}};A.saveLocal();
 const B=boot();B.openBooklet(e.id);
 chk("a reload keeps a custom activity's draft (the browser's own copy)",same((B.D.custom||{}).eod,{snag:"half-typed  ",lines:["first",""]}),
   JSON.stringify(B.D.custom));
 const md=B.toMarkdown();const dr=recordOf(md).find(o=>o.block==="drafts")||{};
 chk("the downloaded file carries it, in the drafts block under `activities`, keyed by activity id",
   same(((dr.activities||{}).eod),{snag:"half-typed  ",lines:["first",""]}),JSON.stringify(dr));
 chk("the two built-in drafts keep their own keys, and the record stays v6 and booklet 1",
   "today" in dr&&"checkin" in dr&&recordOf(md).find(o=>o.block==="meta").v===6&&recordOf(md).find(o=>o.block==="meta").booklet===1);
 B.fresh();B.applyParsed(B.parseFile(md),"replace");
 chk("and loading that file brings the draft back",same((B.D.custom||{}).eod,{snag:"half-typed  ",lines:["first",""]}),JSON.stringify(B.D.custom));
 chk("so the activity opens on it",shownIn(B,"eod")==="half-typed  ",String(shownIn(B,"eod")));}
wipe();
{const A=boot();await A.createBooklet();addMod(A,"end-of-day");
 addMod(A,"daily-journal");
 A.D.custom={eod:{snag:"",lines:[""]},journal:{day:"kept"}};
 const dr=recordOf(A.toMarkdown()).find(o=>o.block==="drafts")||{};
 chk("a draft holding nothing is not written, and one holding something is",
   !("eod" in (dr.activities||{}))&&same((dr.activities||{}).journal,{day:"kept"}),JSON.stringify(dr));
 A.removeModule("example/daily-journal");
 const dr2=recordOf(A.toMarkdown()).find(o=>o.block==="drafts")||{};
 chk("a parked activity's draft stays in the file, like its entries",same((dr2.activities||{}).journal,{day:"kept"}),JSON.stringify(dr2));
 const md=A.toMarkdown();
 A.D.custom={journal:{day:"mine, typed here"}};
 A.applyParsed(A.parseFile(md.replace('"day": "kept"','"day": "from the file"')),"add");
 chk("adding a file keeps a draft already here and takes the file's where there is none",
   A.D.custom.journal.day==="mine, typed here",JSON.stringify(A.D.custom));
 A.D.custom={};A.applyParsed(A.parseFile(md),"add");
 chk("and a draft that is only in the file comes in",(A.D.custom.journal||{}).day==="kept",JSON.stringify(A.D.custom));}
{const A=boot();A.fresh();
 const md=A.toMarkdown().replace(/("block": "drafts")/,'$1,\n "activities": {"__proto__": {"x": "y"}, "today": {"mind": "sneaky"}, "fine": {"x": "ok"}, "bad": "not an object"}');
 A.applyParsed(A.parseFile(md),"replace");
 chk("a drafts block read from a file cannot reach the built-in drafts or the object prototype",
   ({}).x===undefined&&A.D.today.mind===""&&same(A.D.custom,{fine:{x:"ok"}}),JSON.stringify(A.D.custom)+" "+A.D.today.mind);}

// ---- 2. the rest of the snapshot comes back from the file ---------------------
for(const lg of ["en","fr","es"]){
 wipe();freeze("2026-09-26T12:00:00Z");
 const A=boot();await A.createBooklet();fillRich(A,lg.toUpperCase());A.lang=lg;
 const before=shownOrder(A,snapOf(A));const md=roundTrip(A);const after=shownOrder(A,snapOf(A));
 const d=diff({...before,dirty:false,unsavedEntries:0},after);
 chk(lg+": download, clear and load gives back everything the browser held"
   +" (except the not-yet-downloaded status, which a file cannot have)",d.length===0,d.slice(0,8).join("  |  "));
 chk(lg+": an area with no name stays unnamed",after.S.areas.length===4&&after.S.areas[1].label===""&&after.S.areas[1].matters==="an area nobody has named yet",
   JSON.stringify(after.S.areas.map(a=>a.label)));
 chk(lg+": empty areas and an empty Now row survive",same(after.S.areas[2],before.S.areas[2])&&after.S.areas[3].label==="Rest"
   &&after.S.now.items.length===3&&after.S.now.items[1].text===""&&after.S.areas[0].items.length===2,
   after.S.areas.length+" areas, "+after.S.now.items.length+" Now rows");
 chk(lg+": the name and the note keep their spaces",after.S.name===before.S.name&&after.S.note===before.S.note,
   JSON.stringify([after.S.name,after.S.note]));
 chk(lg+": the booklet's own design comes back whole (head, menus, format marker)",
   diff(before.TPL,after.TPL).length===0&&after.TPL.booklet===1&&same(after.TPL.head,before.TPL.head),diff(before.TPL,after.TPL).slice(0,4).join(" | "));
 chk(lg+": the file says it is downloaded: nothing is waiting to be saved after loading it",after.dirty===false&&after.unsavedEntries===0);
 const again=A.toMarkdown();
 chk(lg+": writing it again gives the same file",again===md,
   (()=>{const x=again.split("\n"),y=md.split("\n");const i=x.findIndex((l,j)=>l!==y[j]);return "line "+(i+1)+": "+x[i]+" ≠ "+y[i];})());
 thaw();}

// a person who edits the readable half by hand still wins, and an unnamed area
// they did not touch stays unnamed
wipe();
{const A=boot();await A.createBooklet();
 A.S.areas=[{...A.emptyArea(),label:"Work",matters:"it matters"},{...A.emptyArea(),matters:"unnamed"}];
 A.S.note="old note";
 const md=A.toMarkdown().replace("- What matters here: it matters","- What matters here: edited by hand").replace("old note","new note");
 A.fresh();A.applyParsed(A.parseFile(md),"replace");
 chk("a hand edit to the readable half wins over the record",A.S.areas[0].matters==="edited by hand"&&A.S.note==="new note",
   JSON.stringify([A.S.areas[0],A.S.note]));
 chk("and the unnamed area beside it is still unnamed, not \"2\"",A.S.areas[1]&&A.S.areas[1].label===""&&A.S.areas[1].matters==="unnamed",
   JSON.stringify(A.S.areas[1]));}
// an unnamed area that now survives a file must not stand in for "no area"
wipe();
{const A=boot();await A.createBooklet();
 A.addModule({id:"test/day",version:"0.1",title:{en:"Day"},mode:{id:"day",kind:"entry",chrome:["areas"],blocks:[{id:"focus",type:"text",q:["day","focus"]}]}});
 A.S.areas=[{...A.emptyArea(),label:"Work"},{...A.emptyArea(),matters:"no name"}];
 A.view="day";A.render();
 const add=findAll(main(),n=>n.tagName==="button"&&n.children.some(c=>c==="+ move"))[0];
 add._on.click({target:add});
 chk("with an unnamed area, \"No particular area\" adds a Now row to the Now board, not to that area",
   A.S.now.items.length===1&&A.S.areas[1].items.length===0,JSON.stringify([A.S.now.items,A.S.areas[1].items]));}
{const A=boot();A.fresh();A.S.note="my plan\n## Now\n- Move: not a move";
 const md=A.toMarkdown();A.fresh();A.applyParsed(A.parseFile(md),"replace");
 chk("a note that contains a heading of its own is kept whole, and is not read as a section",
   A.S.note==="my plan\n## Now\n- Move: not a move"&&A.S.now.items.length===0,JSON.stringify([A.S.note,A.S.now.items]));}

// ---- 3. what is typed into a board or a guide reaches the file ---------------
wipe();
{const A=boot();await A.createBooklet();
 [BOARD,GUIDE,READ_ONLY].forEach(m=>A.addModule(JSON.parse(JSON.stringify(m))));
 addMod(A,"the-board");
 A.S.note="my own note";
 typeInto(A,"plans","ship the thing  ");typeInto(A,"plans","an aside",1);typeInto(A,"reading","it made sense");
 A.S.goodday.people=["Jo"];                       // the card board's own field: the control
 chk("typing in a board does not write over the person's own note",A.S.note==="my own note",JSON.stringify(A.S.note));
 const md=A.toMarkdown();const rec=recordOf(md);const fields=(rec.find(o=>o.block==="fields")||{}).fields||{};
 chk("the file's fields block carries the board's answers, keyed by the field each block owns",
   fields.plan==="ship the thing  "&&fields.note==="an aside",JSON.stringify(fields));
 chk("and the guide's",fields.reflect==="it made sense",JSON.stringify(fields));
 chk("control: the card board's field was always there",same(fields.people,["Jo"]));
 chk("a guide of reading only writes nothing",Object.keys(fields).every(k=>["plan","note","reflect","people"].includes(k)),Object.keys(fields).join(","));
 chk("the readable half shows the board's answers under their own questions' names",/ship the thing/.test(md.split("## App record")[0]));
 A.fresh();A.applyParsed(A.parseFile(md),"replace");
 chk("after loading the file the board shows what was typed",shownIn(A,"plans")==="ship the thing  "&&shownIn(A,"plans",1)==="an aside",
   JSON.stringify([shownIn(A,"plans"),shownIn(A,"plans",1)]));
 chk("and so does the guide",shownIn(A,"reading")==="it made sense");
 chk("and the person's note is still theirs",A.S.note==="my own note");}
// a board answer that the previous renderer kept loose in the browser's copy is found again
wipe();
{let A=boot();const e=await A.createBooklet();A.addModule(JSON.parse(JSON.stringify(BOARD)));A.saveLocal();
 const key="booklet.b."+e.id;
 const o=JSON.parse(LS[key]);o.S.plan="typed before this fix";LS[key]=JSON.stringify(o);
 const B=boot();B.openBooklet(e.id);
 chk("a board answer an earlier version kept outside `fields` shows again after a reload",shownIn(B,"plans")==="typed before this fix",String(shownIn(B,"plans")));
 chk("and reaches the next file",((recordOf(B.toMarkdown()).find(o=>o.block==="fields")||{}).fields||{}).plan==="typed before this fix");}

// a module whose blocks are malformed can stop neither of those
wipe();
{const A=boot();const e=await A.createBooklet();
 A.TPL={booklet:1,id:"x",version:"1",customized:true,widgets:[],modules:[{id:"m/bad",version:"0.1",mode:{id:"bad",kind:"board",blocks:[
   {id:"k1",type:"text",keys:"not a list",q:[{},7]},{id:"k2",type:"text",keys:[3,null,"plan"],q:"nope",label:5},null,{id:"g",type:"group",blocks:"x"}]}}]};
 A.S.plan="loose";A.saveLocal();
 const B=boot();B.openBooklet(e.id);let md=null;try{md=B.toMarkdown();}catch(x){md=x.message;}
 chk("a board with malformed blocks still opens, has its loose answer moved into fields, and downloads",
   B.tplModes().some(m=>m.id==="bad")&&B.S.goodday.plan==="loose"&&B.S.plan===undefined&&typeof md==="string"&&md.includes('"plan": "loose"'),
   JSON.stringify([B.S.goodday,B.S.plan,String(md).slice(0,80)]));}

// ---- 4. files written before this change load exactly as they did -------------
// Every booklet and module file in the repository is read by the renderer as it
// stood before this change (BASE) and by the current one, and the results must
// match. The only differences allowed are the ones this change adds on purpose:
// the booklet's format marker and an empty set of other activities' drafts.
{const BASE="428e80f";
 const g=spawnSync("git",["show",BASE+":booklet.html"],{cwd:R,encoding:"utf8",maxBuffer:64*1024*1024});
 if(g.status!==0){note("the renderer before this change ("+BASE+") is not in this repository's history; old-file check skipped");}
 else{const OLD=boot(scriptOf(g.stdout)),NEW=boot();
  const files=["examples","modules","test/fixtures"].flatMap(d=>fs.readdirSync(path.join(R,d)).filter(f=>f.endsWith(".md")&&!/^lint-drafts-/.test(f)&&!/^---\s*\n(?:[^\n]*\n)*?booklet:\s*2\s*\n/.test(fs.readFileSync(path.join(R,d,f),"utf8"))).map(f=>d+"/"+f));   // lint-drafts-*: the linter's fixtures for drafts.activities, which the old renderer ignores by design; version 2 files have their own test (v2.test.js)
  const settle=(A,text)=>{A.fresh();A.lang="en";const P=A.parseFile(text);const msg=A.applyParsed(JSON.parse(JSON.stringify(P)),"replace");
    const s=snapOf(A);return {P:JSON.parse(JSON.stringify(P)),s,msg,mod:(()=>{try{return A.moduleFromText(text);}catch(e){return "threw";}})()};};
  const allowed=x=>{x=JSON.parse(JSON.stringify(x));
    if(x.P.template) delete x.P.template.booklet;if(x.s.TPL) delete x.s.TPL.booklet;
    if(x.P.drafts) delete x.P.drafts.activities;if(x.s.D&&same(x.s.D.custom,{})) delete x.s.D.custom;
    /* the load message now names a file's design by its title (its activities'
       names, else its id) rather than by its id alone, or by nothing */
    x.msg=String(x.msg).replace(/(booklet design|diseño de cuadernillo)(?: \([^)\n]*\))?\./g,"$1.");return x;};
  let n=0;const bad=[];
  for(const f of files){const text=fs.readFileSync(path.join(R,f),"utf8");
    const a=allowed(settle(OLD,text)),b=allowed(settle(NEW,text));n++;
    const d=diff(a,b);if(d.length) bad.push(f+": "+d.slice(0,3).join(" | "));}
  chk("all "+n+" files in examples/, modules/ and test/fixtures/ parse and load as they did before",bad.length===0,bad.join("  ||  "));}}

closePages();
console.log(fails?"\n"+fails+" FAILURES":"\nround-trip checks passed");
process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
