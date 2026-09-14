// The engine, exercised by a booklet that belongs to nobody in particular.
// That is the whole point of this file: the renderer's claim is that it holds
// no content, and a suite built only from its author's own activities cannot
// tell the difference between "holds nothing" and "holds exactly these".
const A=require("./harness.js");const fs=require("fs");
const R=__dirname+"/..";
const html=fs.readFileSync(R+"/booklet.html","utf8");
const modFile=n=>A.moduleFromText(fs.readFileSync(R+"/modules/"+n+".md","utf8"));
const widFile=n=>JSON.parse(fs.readFileSync(R+"/widgets/"+n+".md","utf8").match(/```json\n([\s\S]*?)\n```/)[1]);
const example=()=>fs.readFileSync(R+"/examples/end-of-day.md","utf8");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d?"   → "+d:""));};
const fresh=()=>{A.setS(A.emptyS());A.setD({today:A.emptyToday(),checkin:A.emptyCheckin()});A.resetTPL();};

// ---- parseTagValue/matchVocab: the pure logic behind the comma-separated,
// suggest-as-you-type word field (body map, emotions grid). Tested directly
// since the DOM stub can't dispatch a real keystroke — these two functions
// carry all the logic that could actually go wrong.
chk("everything before the last comma is confirmed, the tail is in progress",
  (()=>{const r=A.parseTagValue("tight, ache, nu");
    return r.inProgress==="nu"&&r.confirmed.join(",")==="tight,ache";})());
chk("a trailing comma commits the last segment and leaves nothing in progress",
  (()=>{const r=A.parseTagValue("tight, ");
    return r.confirmed.includes("tight")&&r.inProgress==="";})());
chk("no comma at all is entirely in progress, nothing confirmed yet",
  (()=>{const r=A.parseTagValue("tigh");
    return r.confirmed.length===0&&r.inProgress==="tigh";})());
chk("an empty field confirms nothing and has nothing in progress",
  (()=>{const r=A.parseTagValue("");
    return r.confirmed.length===0&&r.inProgress==="";})());
chk("blank/duplicate commas don't produce empty confirmed entries",
  (()=>{const r=A.parseTagValue("tight,, ache,");
    return r.confirmed.join(",")==="tight,ache"&&r.inProgress==="";})());
chk("matchVocab is case- and punctuation-insensitive via the file's own norm()",
  A.matchVocab("TIG",[{id:"a",label:"tight"}]).length===1);
chk("matchVocab matches anywhere in the label, not only the start",
  A.matchVocab("ght",[{id:"a",label:"tight"}]).length===1);
chk("an empty fragment matches the whole vocabulary",
  A.matchVocab("",[{id:"a",label:"tight"},{id:"b",label:"cold"}]).length===2);
chk("no match returns nothing, not the whole vocabulary",
  A.matchVocab("zzz",[{id:"a",label:"tight"}]).length===0);

// ---- the renderer holds engines and nothing else
fresh();
chk("a bare renderer carries no booklet",A.tplModules().length===0&&A.tplWidgets().length===0);
chk("and no shelf of its own",Object.keys(A.SHELF()).length===0);
chk("export is one adaptive action rather than a provider integration",
  /id="btnExport"/.test(html)&&/function openExport\(\)/.test(html)
  &&!/id="btnShare"/.test(html));
chk("the export panel offers only capabilities the browser actually has",
  /if\(canShareFile\(\)\)/.test(html)&&/if\(window\.showSaveFilePicker\)/.test(html)
  &&/copyBooklet/.test(html)&&/touchShare\(\)\) return shareCopy\(\)/.test(html));
chk("a wrapper reinstalls its preset design without replacing restored entries",
  /function applyPreset\(R\)/.test(html)
  &&/if\(sessionHasContent\(\)\)[\s\S]{0,160}adoptTemplate\(R\.template\)/.test(html)
  &&/if\(!tplModules\(\)\.length\)\{if\(await loadPreset\(\)\) saveLocal\(\);\}/.test(html));

// ---- a plain field edit refreshes only its own block, never the whole
// block list — ctx.redraw() tore the entire list down on every keystroke,
// which is why typing anywhere in "edit this page" mode used to lose focus
// after every character. The DOM stub can't dispatch a real input event
// (addEventListener is a no-op here, same as every other test in this
// file), so this is a source-shape regression guard rather than a runtime
// check: it fails if a future edit reintroduces ctx.redraw() at any of the
// four places a field-level handler is wired up.
chk("blockFrame builds a block-scoped refreshPreview instead of leaning on ctx.redraw",(()=>{
  const start=html.indexOf("function blockFrame(");
  const end=html.indexOf("function blockEditorFor(");
  const f=html.slice(start,end);
  return start>=0&&end>start&&/const refreshPreview=/.test(f)
    &&/blockEditorFor\(b,ctx,refreshPreview\)/.test(f);})());
chk("blockEditorFor's field handlers call refreshPreview, not ctx.redraw",(()=>{
  const start=html.indexOf("function blockEditorFor(");
  const end=html.indexOf("function widgetEditor(");
  const f=html.slice(start,end);
  return start>=0&&end>start&&!/ctx\.redraw\(\)/.test(f)
    &&/const save=fn=>\{ctx\.mutate\(x=>fn\(x\)\);refreshPreview\(\);\}/.test(f)
    &&/qEditor\(b\.q\[0\],b\.q\[1\],refreshPreview\)/.test(f)
    &&/widgetEditor\(W,refreshPreview\)/.test(f);})());
chk("structural block operations still redraw the whole list, as they must",
  /ctx\.toggle=id=>\{ctx\.openId=ctx\.openId===id\?null:id;ctx\.redraw\(\);\}/.test(html)
  &&/ctx\.remove=id=>\{opts\.remove\(id\);if\(ctx\.openId===id\) ctx\.openId=null;ctx\.redraw\(\);\}/.test(html));

// ---- a reload restores the booklet's own structure, not just its entries
fresh();
{
  const dj=modFile("daily-journal");
  A.addModule(dj);
  A.saveLocal();
  const savedTPL=JSON.parse(global.__ls["useful-next-step.v1"]||"{}");
  chk("the saved snapshot carries the booklet's structure, not only its data",
    !!savedTPL.TPL&&(savedTPL.TPL.modules||[]).some(m=>m.id===dj.id));
  A.resetTPL();                       // simulate a fresh page load in memory
  chk("template is really gone before the reload is simulated",A.tplModules().length===0);
  const restored=A.loadLocal();
  chk("loadLocal reports something of the reader's own came back",restored);
  chk("the installed module survived the reload",
    A.tplModules().some(m=>m.id===dj.id),A.tplModules().map(m=>m.id).join(","));
}
fresh();
{
  // an older save from before this fix carries no TPL at all — entries only
  A.setS({...A.emptyS(),today:[{ts:new Date().toISOString(),items:[{kind:"move",text:"walked",starter:false}]}]});
  A.saveLocal();
  const raw=JSON.parse(global.__ls["useful-next-step.v1"]);
  delete raw.TPL;
  global.__ls["useful-next-step.v1"]=JSON.stringify(raw);
  A.resetTPL();
  const restored=A.loadLocal();
  chk("a pre-fix save with entries and no template still restores its entries",
    restored&&A.getS().today.length===1);
  chk("and correctly reports no template to adopt, so BOOT still asks the wrapper",
    A.tplModules().length===0);
}
chk("copying to an ephemeral clipboard is not reported as a durable save",(()=>{
  const f=html.slice(html.indexOf("async function copyBooklet"),html.indexOf("const touchShare"));
  return !/exported\(\)/.test(f);})());
chk("it provides exactly three engines",
  Object.keys(A.ENGINES).sort().join(",")==="card-board,grid-select,svg-regions",
  Object.keys(A.ENGINES).sort().join(","));
chk("its only built-in view is the history",
  A.tplModes().map(m=>m.id).join(",")==="history",A.tplModes().map(m=>m.id).join(","));
chk("no pinned panel until a booklet brings one",A.pinnedOf()===null);
chk("and nothing seeds the page",A.pageSeed()===null);

// ---- a widget is data, and small enough to travel
{const desk=widFile("desk-check"),grid=widFile("effort-impact");
 chk("the desk widget drives svg-regions",desk.engine==="svg-regions"&&desk.figures.length===2);
 chk("its figures are markup carrying region ids",
   desk.figures.every(f=>/^\s*<svg/.test(f.svg)&&/data-r=/.test(f.svg)));
 chk("every shape maps to a declared region",
   desk.figures.every(f=>{const ids=[...f.svg.matchAll(/data-r='([^']+)'/g)].map(m=>m[1]);
     return ids.length&&ids.every(i=>f.regions.includes(i));}));
 chk("the grid widget has no graphics at all",
   grid.engine==="grid-select"&&!JSON.stringify(grid).includes("<svg"));
 chk("each cell carries its own colour",
   grid.cells.every(c=>c.color&&c.color.tint&&c.color.deep));
 chk("both are small enough to ride inside a file",
   JSON.stringify(desk).length<12000&&JSON.stringify(grid).length<6000,
   JSON.stringify(desk).length+" / "+JSON.stringify(grid).length+" bytes");
 chk("every visible word carries both languages",
   [...desk.regions,...grid.cells,...grid.items].every(x=>x.label&&x.label.en&&x.label.fr));}

// ---- installing an activity brings what it draws with
{fresh();A.addModule(modFile("end-of-day"));
 chk("the module installs",A.tplModules().length===1);
 chk("and brings both its widgets",
   A.tplWidgets().map(w=>w.id).sort().join(",")==="example/desk-check,example/effort-impact",
   A.tplWidgets().map(w=>w.id).join(","));
 chk("its blocks name them by id",
   A.blocksOf("eod").filter(b=>b.type==="widget").map(b=>b.widget).join(",")
     ==="example/desk-check,example/effort-impact");
 let ok=true;try{A.setView("eod");A.render();}catch(e){ok=false;chk("render error",false,e.message);}
 chk("and the activity draws",ok);}

// ---- the suggest-as-you-type word field renders across every state it can
// be in, for both engines that carry it — empty, a known vocabulary pick,
// and a freeform word nobody defined. The DOM stub can't dispatch a real
// keystroke (see the parseTagValue/matchVocab unit tests above for the
// logic itself); this only proves the render path doesn't throw.
{fresh();A.addModule(modFile("end-of-day"));A.setView("eod");
  const eod=()=>{const d=A.getD();d.custom=d.custom||{};d.custom.eod=d.custom.eod||{};return d.custom.eod;};
  let ok=true;
  try{
    A.render();                                                    // nothing picked yet
    eod().regions=[{id:"screen",s:["wrong:0"]}];                   // a known sense word
    eod().emotions=["rewrite"];                                    // a known grid item
    A.render();
    eod().regions=[{id:"screen",s:["a freeform sensation"]}];      // typed/dictated, not in the vocabulary
    eod().emotions=["x|slog|a freeform feeling"];
    A.setS({...A.getS(),emo:{...A.getS().emo,extra:{...A.getS().emo.extra,slog:["a freeform feeling"]}}});
    A.render();
  }catch(e){ok=false;chk("tag-field render error",false,e.message);}
  chk("svg-regions and grid-select render with empty, known, and freeform picks",ok);
  fresh();A.addModule(modFile("end-of-day"));A.setView("eod");}

// ---- a word added through the new field round-trips through a saved file
// exactly like one added through a button — same data, same format, so
// this is genuinely no format change.
{fresh();A.addModule(modFile("end-of-day"));A.setView("eod");
  // a KEPT entry (finalized), not a draft — toMarkdown only carries kept
  // entries; a draft is scratch space that never reaches the saved file
  const kept={ts:"2026-09-14T12:00:00.000Z",
    regions:[{id:"screen",s:["wrong:0","a freeform sensation"]}],
    emotions:["rewrite","x|slog|a freeform feeling"]};
  const s=A.getS();s.entries=s.entries||{};s.entries.eod=[kept];
  s.emo.extra.slog=["a freeform feeling"];A.setS(s);
  const md=A.toMarkdown();
  chk("the freeform sense word is in the saved file",md.includes("a freeform sensation"));
  chk("the freeform emotion word is in the saved file",md.includes("a freeform feeling"));
  fresh();A.addModule(modFile("end-of-day"));
  const R=A.parseFile(md);A.applyParsed(R,"replace");
  const restoredKept=((A.getS().entries||{}).eod||[])[0]||{};
  chk("the mixed known+freeform sense picks survive a save/load round trip",
    (restoredKept.regions||[]).some(r=>r.id==="screen"&&r.s.includes("wrong:0")&&r.s.includes("a freeform sensation")),
    JSON.stringify(restoredKept.regions));
  chk("the mixed known+freeform emotion picks survive a save/load round trip",
    (restoredKept.emotions||[]).includes("rewrite")&&(restoredKept.emotions||[]).includes("x|slog|a freeform feeling"),
    JSON.stringify(restoredKept.emotions));
  fresh();A.addModule(modFile("end-of-day"));A.setView("eod");}

// ---- one shared field, not two bespoke ones
chk("a shared tagInput helper exists and both engines use it",
  /function tagInput\(opts\)\{/.test(html)
  &&(()=>{const s=html.slice(html.indexOf("function svgRegions("),html.indexOf("function gridSelect("));
    return /tagInput\(\{/.test(s);})()
  &&(()=>{const s=html.slice(html.indexOf("function gridSelect("),html.indexOf("ENGINE: card-board"));
    return /tagInput\(\{/.test(s);})());
chk("tagInput's own typing handler never rewrites the field it just typed into",(()=>{
  // the input listener's body is the slice between its own opening and the
  // blur listener that immediately follows it in the source
  const s=html.slice(html.indexOf('inp.addEventListener("input"'),html.indexOf('inp.addEventListener("blur"'));
  return s.length>0&&!/inp\.value=/.test(s);})());

// ---- an activity words its own questions
{fresh();A.addModule(modFile("end-of-day"));
 A.setLang("en");const md=A.toMarkdown();
 chk("a new activity can word its own question",/What got in the way\?/.test(md),
   "an activity that cannot is one the engine has to know about");
 A.setLang("fr");chk("in each language it carries",/Qu'est-ce qui a gêné/.test(A.toMarkdown()));
 A.setLang("en");}

// ---- the file is the state
{fresh();A.addModule(modFile("end-of-day"));
 const md=A.toMarkdown();
 const blocks=[...md.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m=>{try{return JSON.parse(m[1]);}catch(e){return null;}});
 chk("every record block parses on its own",blocks.every(Boolean),
   blocks.filter(b=>!b).length+" unparseable");
 const kinds=blocks.map(b=>b.block);
 chk("the file explains its own format",kinds.includes("format"));
 chk("one block per module and per widget",
   kinds.filter(k=>k==="module").length===1&&kinds.filter(k=>k==="widget").length===2);
 chk("the spec pointer resolves for a stranger",
   /github\.com\/benthepsychologist\/booklet/.test(blocks.find(b=>b.block==="format").full_spec));
 // one mangled block costs that block and nothing else
 const broken=md.replace(/```json\n\{\s*"block": "widget"/, '```json\n{ "block": "widget" OOPS');
 const P=A.parseFile(broken);
 chk("a mangled block does not abandon the file",P.ok===true);
 fresh();const P2=A.parseFile(md);A.applyParsed(P2,"replace");
 chk("and a clean file round-trips whole",
   A.tplModules().length===1&&A.tplWidgets().length===2);}

// ---- nothing is addressed by position
{fresh();A.addModule(modFile("end-of-day"));
 const ids=A.blocksOf("eod").map(b=>b.id);
 A.editTemplate(t=>{const bs=t.modules[0].mode.blocks;bs.reverse();});
 chk("written order does not decide placement when orders exist",
   A.blocksOf("eod").map(b=>b.id).join(",")===ids.join(","),
   A.blocksOf("eod").map(b=>b.id).join(","));
 const list=[{id:"a"},{id:"b"},{id:"c"}];
 A.reorderIn(list,"c",-1);
 chk("moving a thing writes a parameter rather than shuffling the file",
   list.every(b=>Number.isFinite((b.display||{}).order)));}

// ---- blocks that only read own no answer
{fresh();A.addModule(modFile("end-of-day"));
 ["heading","prose","deflist","quote","image"].forEach(k=>{
   chk("a "+k+" block owns no entry key",A.keysOf(A.blankBlock(k)).length===0);});
 chk("a widget block owns the keys it names",
   A.keysOf({type:"widget",id:"x",keys:["regions"]}).join(",")==="regions");
 let bad=[];A.BLOCK_KINDS.forEach(k=>{
   try{A.editTemplate(t=>{t.modules[0].mode.blocks=[A.blankBlock(k)];});
       A.setView("eod");A.render();}catch(e){bad.push(k+": "+e.message);}});
 chk("every block kind renders",bad.length===0,bad.join(" | "));}

// ---- the example booklet is what the engine is shown to a stranger with
{fresh();const P=A.parseFile(example());
 chk("the example booklet is valid",P.ok===true);
 A.applyParsed(P,"replace");
 chk("it opens with the example activity",
   A.tplModules().map(m=>m.id).join(",")==="example/end-of-day");
 // The one permitted mention of the host org is the spec URL every booklet
 // carries so a stranger can look the format up. Everything else must be gone.
 chk("and carries no author's name, practice or namespace",
   !/mensio|armstrong|benthepsychologist\.com/i.test(example())
   &&(example().match(/benthepsychologist/g)||[]).length===1);}

// ---- and neither does the engine
// Comments explaining WHY a coupling was removed may name it; data and display
// strings may not. Strip the comments, then assert on what actually runs.
{const code=html.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
 chk("the engine names no practice, person or clinical vocabulary",
   !/mensio|Armstrong|C\.Psych|Invigorating|Agitating|9-8-8|Kids Help|psychoeducation/i.test(code),
   (code.match(/mensio|Armstrong|C\.Psych|Invigorating|Agitating|9-8-8|Kids Help|psychoeducation/ig)||[]).join(","));
 chk("and mentions the host org only in the spec pointer",
   (code.match(/benthepsychologist/g)||[]).length===1);}

console.log(fails?"\n"+fails+" FAILURES":"\nengine checks passed");
process.exit(fails?1:0);
