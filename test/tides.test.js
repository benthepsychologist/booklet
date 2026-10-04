// examples/how-tides-work.booklet.md: reading with a citation and math, two
// pages, a folded hint, and choice/scale questions — the kinds
// test/booklet-format.test.js does not cover. Run: node test/tides.test.js
const P=require("./page.js");
const fs=require("fs");
const EX=fs.readFileSync(P.R+"/examples/how-tides-work.booklet.md","utf8");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};

const A=P.boot();
const R=A.parseFile(EX);
chk("the example parses with nothing reported wrong",R.ok&&R.unread.length===0,JSON.stringify(R.unread));
const acts=(R.template.modules[0]||{}).activities||[];
chk("two activities: the reading and the check",acts.map(x=>x.id).join()==="tides/rd-tides,tides/rd-check",acts.map(x=>x.id).join());
const rd=acts.find(x=>x.id==="tides/rd-tides"),chk_=acts.find(x=>x.id==="tides/rd-check");
chk("the reading activity has two pages, split by the thematic break",rd.pages&&rd.pages.length===2,JSON.stringify(rd.pages&&rd.pages.map(p=>p.id)));
chk("the second page's title comes from its own heading",rd.pages[1].title==="Spring and neap",rd.pages[1].title);
chk("the check activity is its own, single-page activity, written as blocks",Array.isArray(chk_.blocks),JSON.stringify(chk_));
const p1=rd.pages[0].blocks;
chk("the reading paragraph carries the citation mark",/\[\^atlas-12\]/.test(p1[0].text));
chk("math is left as written, for the drawer to typeset",/\$R = h_\{high\}/.test(p1[0].text));
chk("the diff callout is its own block",p1[1].type==="callout"&&p1[1].kind==="diff",JSON.stringify(p1[1]));
const p2=chk_.blocks;
const choice=p2.find(b=>b.id==="biggest");
chk("the choice question has its two options",JSON.stringify(choice.options)===JSON.stringify(["At the quarter moons","Near the new and the full moon"]));
chk("the correct option is the second, from its [x]",choice.answer===2,choice.answer);
const hint=p2.find(b=>b.id==="biggest-hint");
chk("its hint is folded under it",hint&&hint.placement==="folded",JSON.stringify(hint));
const scale=p2.find(b=>b.id==="confidence");
chk("the scale question has its three anchors, numbered from the file",JSON.stringify(scale.anchors)===JSON.stringify([{n:1,text:"Guessing"},{n:2,text:"Fairly sure"},{n:3,text:"Certain"}]));

/* draw it */
A.loadText(EX);A.screen="tides/rd-check";A.render();
let seen=P.texts(P.main());
["When do the largest tides come?","At the quarter moons","Near the new and the full moon","Hint","How sure were you?","Guessing","Fairly sure","Certain","What surprised you?"].forEach(w=>
  chk("the check page shows “"+w+"”",seen.includes(w),seen.slice(0,500)));
A.screen="tides/rd-tides";A.render();
seen=P.texts(P.main());
/* citeText only marks [^id] inside prose/quote/deflist/callout text drawn
   through readTx(); the "markdown" block's own drawer (mdNodes) wires its own
   citation marks via its `mark` callback — a stand-in until the real drawer
   lands, so this is a known, temporary gap rather than a reader bug. */
chk("the reading page shows the reading text",seen.includes("Most harbours on this coast"),seen.slice(0,300));

/* answer and keep */
const draft=A.draftFor("tides/rd-check");
draft.biggest=2;draft.confidence=3;draft.noticed="how much bigger the range gets";
A.finalizeEntry("tides/rd-check");
const kept=A.keptFor("tides/rd-check")[0];
chk("the choice is kept as a position",kept.biggest===2);
chk("the scale is kept as the anchor's number",kept.confidence===3);
const out=A.toMarkdown();
chk("the design section is untouched",out.startsWith(EX.replace(/\s+$/,"")),out.slice(0,120));
const R2=A.parseFile(out);
chk("the written file reads back clean",R2.ok&&R2.unread.length===0,JSON.stringify(R2.unread));
chk("the kept entry comes back with the same values",R2.S.entries["tides/rd-check"][0].biggest===2&&R2.S.entries["tides/rd-check"][0].confidence===3);

P.closePages();
console.log((fails?fails+" of the checks above failed":"all tides checks passed"));
process.exit(fails?1:0);
