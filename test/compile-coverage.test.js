// What the compiler draws and what it marks (compile/, compile 0.1.0): nothing the renderer draws is passed over in silence.
// Every block type the renderer draws (DRAW_BLOCK), every question kind (QUESTION_KINDS), every widget engine (ENGINES) and
// every query view (QUERY_VIEWS) must be in draw.js's COVERAGE, as drawn or with the reason it is marked, and nothing may
// stand in COVERAGE that the renderer no longer has. Then the made-up fixture test/fixtures/compile-kinds.booklet.md is
// compiled and the page is held to that table: every callout kind in its own look (CALLOUT_LOOK, each alias too), every
// question kind and both engines drawn, and everything that is marked marked twice: an HTML comment where it stood and a
// line in the report's tidy-up list. A query of each of the six views is marked the same way. COVERAGE is made from the
// very tables draw.js dispatches from (BLOCK_WAY for blocks, ENGINE_WAY for engines), so a type the table calls drawn is
// one block() sends to a drawer; and the fixture, which holds every kind the renderer draws, yields no mark for a block
// the compiler does not know, and no engine mark but for the one engine it makes up.
// Run: node test/compile-coverage.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const C=require("../compile/compile.js"),D=require("../compile/draw.js"),E=require("../compile/engine.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const X=E.load(),R=X.R;
/* a table from the renderer's sandbox: a Set or an array there is not one here (another realm), so it is told by its shape */
const keys=x=>x&&typeof x[Symbol.iterator]==="function"?[...x]:Object.keys(x);
const COV=D.COVERAGE,handled=v=>v==="drawn"||/^drawn: |^marked/.test(String(v));

/* ---- the table ---- */
const blocks=keys(R.DRAW_BLOCK),kinds=keys(R.QUESTION_KINDS).filter(k=>k!=="widget"),engines=keys(R.ENGINES),views=keys(R.QUERY_VIEWS);
chk("every block type the renderer draws is in COVERAGE.blocks",blocks.every(b=>b in COV.blocks),blocks.filter(b=>!(b in COV.blocks)).join(", "));
chk("every question kind is in COVERAGE.blocks",kinds.every(k=>k in COV.blocks),kinds.filter(k=>!(k in COV.blocks)).join(", "));
chk("COVERAGE.blocks names nothing the renderer does not draw",Object.keys(COV.blocks).every(b=>blocks.includes(b)),Object.keys(COV.blocks).filter(b=>!blocks.includes(b)).join(", "));
chk("every engine is in COVERAGE.engines, and nothing else",engines.every(e=>e in COV.engines)&&Object.keys(COV.engines).every(e=>engines.includes(e)),Object.keys(COV.engines).join(", "));
chk("every query view is in COVERAGE.views, and nothing else",views.every(v=>v in COV.views)&&Object.keys(COV.views).every(v=>views.includes(v)),Object.keys(COV.views).join(", "));
chk("each entry says drawn, or marked with its reason",[COV.blocks,COV.engines,COV.views].every(t=>Object.values(t).every(handled)));
chk("every kind of mark has the words the comment and the report give it",Object.values(D.MARKED).every(v=>typeof v==="string"&&v.length>10));
const same=(a,b)=>JSON.stringify(Object.keys(a).sort())===JSON.stringify(Object.keys(b).sort());
chk("COVERAGE.blocks is made from BLOCK_WAY, the table block() dispatches from",same(COV.blocks,D.BLOCK_WAY)
  &&Object.entries(D.BLOCK_WAY).every(([k,v])=>COV.blocks[k]===(typeof v==="string"?"drawn":"marked: "+v.marked)));
chk("COVERAGE.engines is ENGINE_WAY, the table widget() dispatches from",same(COV.engines,D.ENGINE_WAY)&&Object.entries(D.ENGINE_WAY).every(([k,v])=>COV.engines[k]===v));

/* ---- the fixture, drawn ---- */
const FIX=path.join(__dirname,"fixtures","compile-kinds.booklet.md");
const run=C.compile([{file:FIX}],{form:"standalone",engine:X});
const r=run.results[0],page=r.files.get("compile-kinds/index.html")||"",report=C.reportText(run);
chk("the fixture compiles",r.rep.ok&&page.length>0,r.rep.refused);
const has=(cls,tag)=>new RegExp("<"+(tag||"[a-z0-9]+")+"\\b[^>]*class=\"[^\"]*\\b"+cls.replace(/[-]/g,"\\-")+"\\b").test(page);

/* every callout kind, each in its look: its hue, its icon, its word */
const looks=new Map();for(const [k,l] of Object.entries(R.CALLOUT_LOOK)) looks.set(l.label,l);
for(const [label,l] of looks){
  const box=new RegExp("<aside class=\"bk-callout bk-hue-"+l.hue+" bk-k-"+label+"\" role=\"note\">\\s*<p class=\"bk-chead\"><span class=\"bk-ci\" aria-hidden=\"true\"><svg class=\"bk-ic\"[^>]*>"
    +X.icons[l.icon].replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"</svg></span><span class=\"bk-cl\">"+String(R.strings("reading").kind[label]).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"</span></p>");
  chk("the "+label+" callout is drawn in its own look ("+l.hue+", "+l.icon+")",box.test(page));}
const aliases=Object.entries(R.CALLOUT_LOOK).filter(([k,l])=>k!==l.label).map(([k])=>k);
chk("a kind written by another name (tldr) takes its kind's look",/bk-k-abstract[^]*?Written as tldr/.test(page)&&aliases.includes("tldr"));
chk("an unknown kind is drawn as a note, with the renderer's line, and marked",
  /<!-- booklet: the callout kind “sparkle”[^>]*-->\s*<aside class="bk-callout bk-hue-sky bk-k-note"[^]*?<p class="bk-unknown">This page does not know the kind “sparkle”\.<\/p>/.test(page));
chk("a group is drawn as a titled box",/<section class="bk-group">\s*<p class="bk-gtitle">What to pack<\/p>/.test(page));
chk("an untitled folded group is named by its first words",/<details class="bk-fold bk-plain">\s*<summary><span class="bk-ftitle">Two dowels and a sheet of tissue, for a second kite\.<\/span><\/summary>/.test(page));
chk("a callout folded with - is a closed <details> in its kind's look",/<details class="bk-fold bk-hue-sun bk-k-warning">/.test(page)&&!/<details[^>]*\sopen/.test(page));
chk("a question's hint and solution are its own compact folds",/<details class="bk-fold bk-compact bk-hint">/.test(page)&&/<details class="bk-fold bk-compact bk-solution">/.test(page));
chk("a hint outside its question is drawn plain",/<aside class="bk-callout bk-plain" role="note">\s*<p class="bk-ctitle">A hint drawn outside its question<\/p>/.test(page));

/* every question kind: a fieldset of its kind (the quiz kinds answer; test/compile-script.test.js and test/compile-script-browser.js hold that) */
for(const k of kinds) chk("the "+k+" question is drawn",has("bk-q-"+k,"fieldset")&&new RegExp('<fieldset[^>]*class="bk-q bk-q-'+k+'[^"]*" data-bk-kind="'+k+'"').test(page));
chk("an open choice stays read-only (the reader's own words need somewhere to keep them); a plain multi has inputs",
  /<ul class="bk-options bk-pick-one">\s*<li>Diamond<\/li>/.test(page)&&/<ul class="bk-options bk-pick-many">\s*<li class="bk-opt"><input type="checkbox"/.test(page));
chk("no button, select, text box or form stands on the page",!/<(button|select|textarea|form)\b/.test(page)&&!/<input type="(?!checkbox|radio)/.test(page));
chk("the report lists what is read-only here, with the reason",/Read-only here/.test(report)&&/the scale question “How steady was it\?”[^\n]*renderer defines no response for a scale/.test(report)&&/the choice question “Which shape did you build\?”[^\n]*own words \(open\)/.test(report));
chk("an open choice offers the renderer's Add your own",page.includes('<li class="bk-own">'+R.strings("question").addOwn+"</li>"));
chk("a scale shows its anchors, a matrix its items and anchors",/<ul class="bk-scale">\s*<li>Wobbly<\/li>/.test(page)&&/<table class="bk-matrix">[^]*?<th scope="row">A light breeze<\/th>/.test(page));
/* both engines */
chk("the grid-select widget is drawn: axes, cells in their colour names, items",has("bk-w-grid-select","fieldset")&&/bk-ax bk-ax-top">higher</.test(page)&&/<div class="bk-cell bk-c-blue">\s*<p class="bk-cell-name">Soaring<\/p>\s*<ul class="bk-words">\s*<li class="bk-pickable"><input type="checkbox" id="bk-compile-kinds-w1" autocomplete="off"><label for="bk-compile-kinds-w1">Glide<\/label><span class="bk-shows" hidden>High and calm\.<\/span><\/li>/.test(page));
chk("a grid with no colour names takes the quiet ramp by place",/bk-cell bk-c-n0[^]*bk-cell bk-c-n3/.test(page));
chk("the svg-regions widget is drawn by its places, figure by figure",has("bk-w-svg-regions","fieldset")&&/<p class="bk-places-h">Front<\/p>\s*<ul class="bk-words">\s*<li>Sail<\/li>\s*<li>Tail<\/li>/.test(page));
chk("describe adds each place's note",/<dl class="bk-notes-of">[^]*?<dt>Spar<\/dt>\s*<dd>The stick that holds it open\.<\/dd>/.test(page));
chk("no figure's SVG reaches the page",!/<svg viewBox="0 0 100 100"/.test(page)&&!/class="rg"/.test(page));

/* what is marked: a comment where it stood, a line in the report */
const tidy=report.split("\n").filter(l=>/^\s+\[ \] /.test(l));
const marks=[...page.matchAll(/<!-- booklet: ([^]*?) -->/g)].map(m=>m[1]);
const expect=[["kind","the callout kind “sparkle”"],["each","the question “Why that tool?”"],["regionsFigure","the figure “front” of the widget “kite-parts”"],
  ["query","the query over “flights”, as table"],["mermaid","a mermaid fence"],["mermaid","the figure “day-plan”"],["link","the link to “spare-kites”"],
  ["brokenMark","the mark [^nowhere]"],["engine","the widget “odd-engine” (engine “weather-vane”)"],["widget","the widget block “gone”"]];
for(const [kind,what] of expect){
  chk("marked on the page: "+what,marks.some(m=>m.startsWith(what)&&m.endsWith(D.MARKED[kind])),marks.join(" | "));
  chk("listed to tidy in the report: "+what,tidy.some(l=>l.includes(what)&&l.endsWith(D.MARKED[kind])));}
const unknownBlocks=r.rep.marked.filter(m=>m.kind==="block"),engineMarks=r.rep.marked.filter(m=>m.kind==="engine");
chk("the fixture yields no mark for a block the compiler does not know",!unknownBlocks.length,unknownBlocks.map(m=>m.what).join(", "));
chk("…and an engine mark only for an engine the renderer does not have either",engineMarks.length===1&&engineMarks.every(m=>/engine “([^”]+)”/.test(m.what)&&!keys(R.ENGINES).includes(/engine “([^”]+)”/.exec(m.what)[1])),engineMarks.map(m=>m.what).join(", "));
chk("the report lists exactly the marks on the page, one line for each comment",tidy.length===marks.length&&r.rep.marked.length===marks.length,tidy.length+" lines, "+marks.length+" comments, "+r.rep.marked.length+" marks");
chk("a broken mark is shown as [?id]",/<span class="bk-broken" title="[^"]*">\[\?nowhere\]<\/span>/.test(page));
chk("a diagram is shown as its source",/<pre class="bk-figure-src"><code data-lang="mermaid">graph LR; Build --&gt; Fly<\/code><\/pre>/.test(page));
chk("a hidden activity is left off, and not marked",!page.includes("Never on the page")&&!report.includes("Hidden notes"));
chk("a heading link inside the page is a link",/<a class="bk-link" href="#morning">Morning<\/a>/.test(page));

/* each of the six query views, marked */
const q=views.map((v,i)=>"```booklet query\nfrom: rows\nas: "+v+"\n```\n").join("\n");
const text='---\nbooklet: "0.16"\nid: t/views\ntitle: Views\nlang: en\n---\n\n# Views\n\nEvery view.\n\n'+q+'\n```booklet data\n[ { "label": "A", "value": 1 } ]\n```\n^rows\n';
const rv=C.compile([{text,name:"views",dir:__dirname}],{form:"standalone",engine:X}),pv=rv.results[0].files.get("views/index.html")||"";
for(const v of views) chk("a query shown as "+v+" is marked, not dropped",pv.includes("<!-- booklet: the query over “rows”, as "+v+" (")&&rv.results[0].rep.marked.some(m=>m.kind==="query"&&m.what.endsWith("as "+v)));

/* the theme block: not compiled yet, and said so */
const rg=C.compile([{file:path.join(__dirname,"..","examples","garden-week.booklet.md")}],{form:"site",engine:X});
chk("a booklet's own theme is marked (compile 0.2 draws it)",rg.results[0].rep.marked.some(m=>m.kind==="theme")&&/<!-- booklet: the theme block \(the booklet\)/.test(rg.results[0].files.get("garden-week/index.html")));

console.log(fails?"\n"+fails+" FAILURES":"\ncompile coverage passed");process.exit(fails?1:0);
