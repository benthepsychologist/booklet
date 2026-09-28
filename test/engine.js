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
  &&/if\(!allModules\(\)\.length&&!\(TPL\.modes\|\|\[\]\)\.length\)\{if\(await loadPreset\(\)\) saveLocal\(\);\}/.test(html));   // held modules, taken-out ones included

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

// The reload-restores-structure check that used to sit here loaded
// daily-journal.md through moduleFromText() (version 1 only). modules/ is
// version 2 now; deleted per Ben's ruling (2026-09-28), not rewritten.
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

// Three sections used to sit here (installing an activity's widgets, the
// suggest-as-you-type word field across every state, a word added through it
// round-tripping through a saved file), all built on modFile("end-of-day")
// (moduleFromText(), version 1 only). modules/ is version 2 now; deleted per
// Ben's ruling (2026-09-28), not rewritten.

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

// ---- the word field is a per-widget toggle in the editor, visible by
// default, and buttons work the same whether it's shown or hidden
chk("a widget-level toggle exists for both engines that carry the field",
  /if\(W\.engine==="grid-select"\|\|W\.engine==="svg-regions"\)\{/.test(html)
  &&/cb\.checked=W\.showTags!==false/.test(html)
  &&/put\(w=>\{w\.showTags=cb\.checked;\}\)/.test(html));
chk("both engines skip the field only when explicitly turned off",
  /if\(W\.showTags!==false\) panel\.append\(tagInput\(/.test(html)
  &&/if\(!opts\.readonly&&W\.showTags!==false\)\{/.test(html));
// Five more sections used to sit here (the word-field toggle shown/hidden,
// its round trip, an activity wording its own questions, "the file is the
// state" — which checked version 1's own self-describing FORMAT_BLOCK,
// explicitly dropped from version 2 by design, SPEC.md §10 — nothing is
// addressed by position, and blocks that own no answer), all built on
// modFile("end-of-day") (moduleFromText(), version 1 only). Deleted per
// Ben's ruling (2026-09-28), not rewritten.

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
 // two sanctioned mentions now: the spec pointer, and the public repo's own
 // registry.json as the default source for "Add a module" → Examples,
 // fetched only when the reader opens that dialog (Ben, 2026-09-28)
 chk("and mentions the host org only in the spec pointer and the default registry",
   (code.match(/benthepsychologist/g)||[]).length===2);}

console.log(fails?"\n"+fails+" FAILURES":"\nengine checks passed");
process.exit(fails?1:0);
