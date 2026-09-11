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
  &&/if\(!tplModules\(\)\.length\) await loadPreset\(\)/.test(html));
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
