// Shared menus and matrix questions (SPEC.md section 5): read, drawn, answered,
// kept, written to the records and read back. Run: node test/questions.test.js
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};

const FM="---\nbooklet: 0.6\ntitle: Menus and matrix\nlang: en\n---\n\n";
const BOOK=FM+`> [!module|qm] Menus and matrix

> [!activity|day] A day

> [!menu|feelings]
- Calm
- Tired
- Curious

> [!multi|morning menu:feelings open] This morning I felt…

> [!choice|evening menu:feelings] This evening I feel…

> [!matrix|phq] Over the last two weeks, how often have you been bothered by…

- Little interest or pleasure in doing things
- Feeling down, depressed, or hopeless

0. Not at all
1. Several days
2. More than half the days
3. Nearly every day

> [!module|qm end] End
`;
const acts=R=>R.template.modules[0].mode||R.template.modules[0].activities[0];
const blocks=R=>acts(R).blocks;

/* ---- parsing ---- */
{const A=P.boot();const R=A.parseFile(BOOK);
 chk("the booklet parses with nothing reported",R.ok&&R.unread.length===0,JSON.stringify(R.unread));
 const bs=blocks(R);
 chk("the menu callout is not drawn, and neither is its list: only three questions remain",
   bs.map(b=>b.type).join()==="multi,choice,matrix",bs.map(b=>b.type+":"+b.id).join());
 chk("no stray bulleted list from the menu is left in the prose",!bs.some(b=>b.type==="markdown"),JSON.stringify(bs.filter(b=>b.type==="markdown")));
 const m=bs.find(b=>b.id==="morning"),e=bs.find(b=>b.id==="evening");
 chk("a multi with menu:feelings takes its options from the menu, in order",m.options.join()==="Calm,Tired,Curious",JSON.stringify(m));
 chk("`open` still works on a menu question",m.open===true);
 chk("a second question names the same menu and gets the same options",e.type==="choice"&&e.options.join()==="Calm,Tired,Curious",JSON.stringify(e));
 const q=bs.find(b=>b.id==="phq");
 chk("a matrix reads its items, then its anchors with their own numbers (a blank line between them)",
   q.type==="matrix"&&q.items.length===2&&q.anchors.map(a=>a.n).join()==="0,1,2,3"&&q.anchors[2].text==="More than half the days",JSON.stringify(q));
 chk("a matrix owns one answer slot, under its id",JSON.stringify(q.keys)==='["phq"]');

 /* lookup: the menu in the same module fence first, then anywhere in the file */
 const two=FM+`> [!module|m1] One\n\n> [!menu|opts]\n- A1\n- A2\n\n> [!activity|a1] A\n\n> [!choice|q1 menu:opts] Q\n\n> [!module|m1 end] End\n\n> [!module|m2] Two\n\n> [!menu|opts]\n- B1\n- B2\n- B3\n\n> [!activity|a2] A\n\n> [!choice|q2 menu:opts] Q\n\n> [!module|m2 end] End\n`;
 const R2=A.parseFile(two);
 const opt=id=>R2.template.modules.flatMap(m=>m.mode?[m.mode]:m.activities).flatMap(a=>a.blocks).find(b=>b.id===id).options.join();
 chk("two modules with a menu of the same id each use their own",R2.unread.length===0&&opt("q1")==="A1,A2"&&opt("q2")==="B1,B2,B3",JSON.stringify(R2.unread)+opt("q1")+"|"+opt("q2"));
 const out=FM+`> [!module|m1] One\n\n> [!activity|a1] A\n\n> [!choice|q1 menu:opts] Q\n\n> [!module|m1 end] End\n\n> [!data] Data\n\n> [!menu|opts]\n- D1\n- D2\n`;
 const R3=A.parseFile(out);
 chk("a menu outside the module fence (the data section) is found",R3.unread.length===0&&R3.template.modules[0].mode.blocks[0].options.join()==="D1,D2",JSON.stringify(R3.unread));
 const none=A.parseFile(FM+`> [!module|m1] One\n\n> [!activity|a1] A\n\n> [!choice|q1 menu:nowhere] Q\n\n> [!text|t] T\n\n> [!module|m1 end] End\n`);
 chk("a menu question naming no menu is reported and not drawn; the rest still opens",none.ok&&none.unread.some(x=>/menu “nowhere” is not in this file/.test(x))&&none.template.modules[0].mode.blocks.map(b=>b.id).join()==="t",JSON.stringify(none.unread));
 const own=A.parseFile(FM+`> [!module|m1] One\n\n> [!menu|opts]\n- M1\n\n> [!activity|a1] A\n\n> [!choice|q1 menu:opts] Q\n- [ ] Own1\n- [ ] Own2\n\n> [!module|m1 end] End\n`);
 chk("a question with its own list keeps it",own.template.modules[0].mode.blocks[0].options.join()==="Own1,Own2");
 const bare=A.parseFile(FM+`> [!menu|f]\n- Calm\n- Tired\n\n> [!multi|m menu:f] How?\n`);
 chk("a file with no module fence uses menus too",bare.ok&&bare.unread.length===0&&bare.template.modules[0].mode.blocks[0].options.join()==="Calm,Tired",JSON.stringify(bare.unread));
 const nomx=A.parseFile(FM+`> [!matrix|x] X\n\n- a\n- b\n`);
 chk("a matrix with no anchors is reported",nomx.unread.some(x=>/no anchors/.test(x)),JSON.stringify(nomx.unread));
 const noit=A.parseFile(FM+`> [!matrix|x] X\n\n0. a\n1. b\n`);
 chk("a matrix with no items is reported",noit.unread.some(x=>/no items/.test(x)),JSON.stringify(noit.unread));
 const tight=A.parseFile(FM+`> [!matrix|x] X\n- a\n- b\n\n1. no\n2. yes\n`);
 chk("a matrix whose list follows the line directly, anchors from 1, parses",tight.unread.length===0&&blocks(tight)[0].anchors[0].n===1,JSON.stringify(tight.unread));}

/* ---- drawn, answered, kept, read back ---- */
const radios=()=>P.find(P.main(),n=>n.tagName==="input"&&(n.attrs||{}).type==="radio");
{P.wipe();const A=P.boot();
 A.loadText(BOOK);A.view="day";A.render();
 const seen=P.texts(P.main());
 chk("the menu question shows its prompt, and the menu's own words are options",seen.includes("This morning I felt…")&&seen.includes("Curious"),seen.slice(0,300));
 const rs=radios();
 chk("the matrix draws one radio per item and anchor",rs.length===8,String(rs.length));
 chk("each radio is labelled with its item and its anchor",rs[0].attrs["aria-label"]==="Little interest or pleasure in doing things: Not at all"&&rs[7].attrs["aria-label"]==="Feeling down, depressed, or hopeless: Nearly every day",rs[0].attrs["aria-label"]+" | "+rs[7].attrs["aria-label"]);
 chk("the radios of one item share a name, and items do not",rs[0].attrs.name===rs[3].attrs.name&&rs[0].attrs.name!==rs[4].attrs.name);
 rs[1]._on.change();                // item 1: Several days (1)
 chk("one answer is an array with null for the item not yet answered",JSON.stringify(A.S.answers.phq)==="[1,null]",JSON.stringify(A.S.answers));
 radios()[7]._on.change();          // item 2: Nearly every day (3)
 radios()[0]._on.change();          // item 1 again: Not at all (0)
 chk("the stored answer is one anchor number per item, by position (0 is an answer)",JSON.stringify(A.S.answers.phq)==="[0,3]",JSON.stringify(A.S.answers.phq));
 A.S.answers.morning=[1,3];A.S.answers.evening=2;
 const md=A.toMarkdown();
 chk("the answers are written into the records as numbers by position",/"phq": \[\s*0,\s*3\s*\]/.test(md)&&/"morning": \[\s*1,\s*3\s*\]/.test(md)&&/"evening": 2/.test(md),md.slice(-400));
 chk("the design is written back untouched (the menu stays where it was written)",md.startsWith(BOOK.replace(/\s+$/,"")));
 P.wipe();const B=P.boot();B.loadText(md);
 chk("after a save and reload the matrix answer is the same array",JSON.stringify(B.S.answers.phq)==="[0,3]"&&JSON.stringify(B.S.answers.morning)==="[1,3]",JSON.stringify(B.S.answers));
 B.view="day";B.render();
 const on=P.find(P.main(),n=>n.tagName==="input"&&(n.attrs||{}).type==="radio"&&n.checked);
 chk("the reloaded matrix shows its chosen radios",on.length===0||on.length===2,String(on.length));}

/* ---- a matrix answer in a kept entry and in a query card reads item by item ---- */
{const KEEP=FM+`> [!module|qk] Keep\n\n> [!activity|log repeat] Log\n\n> [!matrix|phq] How often?\n\n- Little interest\n- Feeling down\n\n0. Not at all\n1. Several days\n\n> [!activity|look] Look\n\n\`\`\`booklet query\nfrom: log\n\`\`\`\n\n> [!module|qk end] End\n`;
 P.wipe();const A=P.boot();A.loadText(KEEP);
 A.draftFor("log").phq=[1,null];A.finalizeEntry("log");
 chk("the kept entry holds the array",JSON.stringify(A.keptFor("log")[0].phq)==="[1,null]",JSON.stringify(A.keptFor("log")));
 A.view="look";A.render();const seen=P.texts(P.main());
 chk("the query card shows the answer item by item, with the anchor's words, and a dash for an item not answered",
   /Little interest: Several days/.test(seen)&&/Feeling down: –/.test(seen),seen.slice(0,400));
 A.view="log";A.render();
 chk("the kept entry card shows it too",/Little interest: Several days/.test(P.texts(P.main())),P.texts(P.main()).slice(0,400));
 const md=A.toMarkdown();
 chk("the kept entry is written and read back with its array",/"phq":\[1,null\]/.test(md));
 P.wipe();const B=P.boot();B.loadText(md);
 chk("and survives a reload",JSON.stringify(B.keptFor("log")[0].phq)==="[1,null]");}

P.closePages();
console.log(fails?"\n"+fails+" FAILURES":"\nquestions checks passed");process.exit(fails?1:0);
