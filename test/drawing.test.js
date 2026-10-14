// Format 0.13, item 2 (drawing): the words on a booklet line are inline Markdown (D4), the booklet's opening is drawn on its home
// screen (D5), `as: cards` draws a data block (D15), and four visible bugs are gone (D18): a word typed into the feelings grid
// shows as the word, a footnote's indented continuation lines belong to the note, and a citation with no italic title is a plain
// reference. (The page-name bug has its test in pagename.test.js, the library wake bug in libwake-browser.js.) This suite draws
// into the recording DOM of page.js; the formulas themselves (MathML) and the clicks are checked in drawing-browser.js.
// Run: node test/drawing.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const byClass=(n,c)=>walk(n,x=>cls(x).includes(c));
const byTag=(n,t)=>walk(n,x=>x.tagName===t);
const text=n=>typeof n==="string"?n:(n&&n._text||"")+kids(n).map(text).join("");
const FM=(t,extra)=>`---\nbooklet: "0.13"\ntitle: ${t}\nlang: en\n${extra||""}---\n\n`;

(async()=>{
 /* ---------------- D4: the words on a booklet line are inline Markdown ---------------- */
 const MARKS=FM("Marks")+`> [!module|m] The \`mod\` module

Words about the module.

> [!activity|first] Fractions with **bold** words

Some prose.

> [!choice|bigger] Which is *bigger*, $\\frac{2}{3}$ or $\\frac{3}{5}$?
> Help with **bold** words.

- [ ] A **bold** option
- [x] The $x$ option
- [ ] Plain

> [!scale|how] How is it, [a link](https://example.org)?

0. Not **at all**
1. Very

> [!matrix|mx] Over the *last* weeks

- An *item*
- Plain item

0. Never
1. **Always**

> [!text|note] Say it in \`code\`

> [!activity|second repeat] A [link](https://example.org) in a title

> [!text|what] What *happened*?

> [!module|m end] End
`;
 P.wipe();
 const A=P.boot();await A.createBooklet();
 const R=A.parseFile(MARKS);
 chk("a booklet whose lines hold marks parses with nothing reported",R.ok&&R.unread.length===0,JSON.stringify(R.unread));
 A.loadText(MARKS);
 A.screen="m/first";A.render();let main=P.main();
 {const h=byTag(main,"h3").find(x=>/bigger/.test(text(x)));
  chk("a question's title draws its emphasis (an em), not the asterisks",!!h&&byTag(h,"em").length===1&&text(h).startsWith("Which is bigger"),h&&text(h));
  chk("and its formulas ($…$) are drawn as formulas, not as the text between the dollar signs",!!h&&byClass(h,"math").length===2&&!/\$/.test(text(h).replace(/\$[^$]*\$/g,"")),h&&text(h));
  const aside=byClass(main,"aside").find(x=>/Help with/.test(text(x)));
  chk("its help text draws its bold",!!aside&&byTag(aside,"strong").length===1&&text(aside)==="Help with bold words.",aside&&text(aside));
  const pills=byClass(main,"pill-btn").slice(0,3);
  chk("an option is drawn the same way: a bold word, a formula, and plain words",pills.length===3&&byTag(pills[0],"strong").length===1&&byClass(pills[1],"math").length===1&&text(pills[2])==="Plain",pills.map(text).join("|"));
  chk("an option in a button holds no link and no asterisks",pills.every(b=>byTag(b,"a").length===0)&&!pills.some(b=>/\*/.test(text(b))));
  const sc=byClass(main,"pill-btn").length;
  const scaleHead=byTag(main,"h3").find(x=>/How is it/.test(text(x)));
  chk("a link in a question's title is a link (it sits in a heading, not in a button)",!!scaleHead&&byTag(scaleHead,"a").length===1&&scaleHead.children.length>0,scaleHead&&text(scaleHead));
  chk("a scale's anchors are drawn the same way",byTag(main,"button").some(b=>cls(b).includes("pill-btn")&&byTag(b,"strong").length===1&&/Not at all/.test(text(b))));
  const mx=byClass(main,"mxitem");
  chk("a matrix item and its anchors are drawn the same way",mx.length===2&&byTag(mx[0],"em").length===1&&byClass(main,"mxhead").some(h=>byTag(h,"strong").length===1),mx.map(text).join("|"));
  chk("a matrix item's name for a screen reader is its words without marks",byClass(main,"mxrow").map(r=>r.attrs["aria-label"]).join("|")==="An item|Plain item",byClass(main,"mxrow").map(r=>r.attrs["aria-label"]).join("|"));
  chk("a text question's label draws its code",byTag(walk(main,x=>x.tagName==="label"&&/Say it/.test(text(x)))[0]||{},"code").length===1);}
 /* a reader's own option is compared with the listed ones by their words, not by their marks */
 {const OWN=FM("Own")+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!choice|pick open] Pick one\n\n- [ ] A **bold** option\n- [ ] Plain\n\n> [!module|m end] End\n";
  P.wipe();const B=P.boot();await B.createBooklet();B.loadText(OWN);B.screen="m/a";B.render();
  const inp=byClass(P.main(),"q-own")[0];inp.value="a bold option";inp._on.keydown({key:"Enter",preventDefault(){}});
  chk("typing the words of a listed option (without its marks) picks that option, not a second one of the reader's own",B.answersFor("m/a").pick===1,JSON.stringify(B.answersFor("m/a").pick));}
 /* the activity's own page head, the module's title on a module screen and the cards */
 A.screen=A.moduleScreen("m");A.render();main=P.main();
 {const head=byTag(main,"h2")[0];
  chk("a module's title on its own screen draws its code",!!head&&byTag(head,"code").length===1&&text(head)==="The mod module",head&&text(head));
  const cards=byClass(main,"card");
  const c1=cards.find(c=>/Fractions/.test(text(c))),c2=cards.find(c=>/in a title/.test(text(c)));
  chk("a card's title draws its bold",!!c1&&byTag(c1,"strong").length===1&&text(byClass(c1,"k")[0])==="Fractions with bold words",c1&&text(c1));
  chk("a card holds no link: a link in a title is its words",!!c2&&byTag(c2,"a").length===0&&text(byClass(c2,"k")[0])==="A link in a title",c2&&text(c2));
  chk("and a card is not marked by the asterisks of a title",!cards.some(c=>/\*\*|`/.test(text(c))));}
 A.screen="m/second";A.render();main=P.main();
 {const h=byTag(main,"h2")[0];
  chk("an activity's page head draws a link as a link",!!h&&byTag(h,"a").length===1&&text(h)==="A link in a title",h&&text(h));}
 /* a repeat activity keeps entries; the kept-entry card names each answer by the question's words */
 {const id="m/second";A.keptFor(id).push({ts:"2026-10-01T09:00:00.000Z",what:"it went well"});
  A.openChip[id]="2026-10-01T09:00:00.000Z";A.screen=id;A.render();main=P.main();
  const dts=byTag(main,"dt");
  chk("a kept entry names its answer by the question's words, with their emphasis",dts.length===1&&byTag(dts[0],"em").length===1&&text(dts[0])==="What happened?",dts.map(text).join("|"));}
 /* where bare words are needed */
 A.screen="m/first";A.render();
 {const menu=byClass(P.main(),"ap-menu");
  chk("a page menu uses plain words",menu.length===0||!/[*`]/.test(text(menu[0])));}
 chk("the document title is plain words",!/[*`]/.test(A.tabName()),A.tabName());
 {const home=(A.screen="@home",A.render(),P.main());
  chk("the home screen's cards for a module draw its words",byClass(home,"card").some(c=>byTag(c,"code").length===1),text(home).slice(0,120));}

 /* a title holding a lone * or an underscore name stays as written (the one real title with a mark, and snake_case) */
 {const TXT=FM("Plain")+"> [!module|m] It names the *.booklet.md extension and a snake_case_name\n\n> [!activity|a] It names the *.booklet.md extension and a snake_case_name\n\n> [!text|t] Type in my_field\n\n> [!module|m end] End\n";
  P.wipe();const B=P.boot();await B.createBooklet();B.loadText(TXT);B.screen="m/a";B.render();const h=byTag(P.main(),"h2")[0];
  chk("a lone * and snake_case in a title stay as written",!!h&&text(h)==="It names the *.booklet.md extension and a snake_case_name"&&byTag(h,"em").length===0,h&&text(h));}

 /* ---------------- D5: the booklet's opening ---------------- */
 const OPEN=FM("Tides")+`# Tides

The sea **rises** twice a day.

Second paragraph of the opening.

> [!module|m] Module one

> [!activity|a] First

Text.

> [!activity|b] Second

More.

> [!module|m end] End

> [!module|n] Module two

> [!activity|c] Third

Prose after the first line is not the opening.

> [!module|n end] End
`;
 {P.wipe();const B=P.boot();await B.createBooklet();
  const r=B.parseFile(OPEN);
  chk("a file with prose before its first line parses with nothing reported",r.ok&&r.unread.length===0,JSON.stringify(r.unread));
  chk("the prose before the first module line is the booklet's opening, and nothing after it",Array.isArray(r.template.opening)&&r.template.opening.length===1&&/rises/.test(r.template.opening[0].text)&&!/not the opening/.test(JSON.stringify(r.template.opening)),JSON.stringify(r.template.opening));
  chk("a module's own opening is not the booklet's",!/Text\./.test(JSON.stringify(r.template.opening)));
  B.loadText(OPEN);B.screen="@home";B.render();const home=P.main();
  chk("the home screen draws it under the title: the first paragraph at lede size, the rest under it",
    /rises/.test(text(byClass(home,"mhead-lede")[0]||"")) && /Second paragraph/.test(text(byClass(home,"mhead-more")[0]||"")),text(home).slice(0,200));
  chk("the opening's emphasis is drawn",byTag(byClass(home,"mhead-lede")[0]||{},"strong").length===1);
  chk("a leading heading that repeats the booklet's title is drawn once (the title is)",byTag(home,"h1").length===1&&byTag(home,"h2").filter(h=>text(h)==="Tides").length===0,byTag(home,"h2").map(text).join("|"));
  chk("the renderer's own tagline is gone from a booklet's home screen",!/A workbook that lives in one file/.test(text(home)),text(home).slice(0,200));
  chk("and no 'sub' line is left empty under the title",byClass(home,"sub").length===0);
  chk("the opening's words are not drawn anywhere else (not on a module's screen)",(B.screen=B.moduleScreen("m"),B.render(),!/rises/.test(text(P.main()))));}
 {const NONE=FM("Nothing")+"> [!module|m] M\n\n> [!activity|a] First\n\nText.\n\n> [!activity|b] Second\n\nMore.\n\n> [!module|m end] End\n";
  P.wipe();const B=P.boot();await B.createBooklet();const r=B.parseFile(NONE);
  chk("a booklet with no opening carries none",r.template.opening===undefined);
  B.loadText(NONE);B.screen="@home";B.render();const home=P.main();
  chk("and its home screen draws its name, its cards, and no tagline",byTag(home,"h1").map(text).join()==="Nothing"&&byClass(home,"sub").length===0&&!/workbook that lives/.test(text(home)),text(home).slice(0,160));}
 {const LEAD=FM("Lead")+"A word before the file's one activity line.\n\n> [!activity|a] Only\n\nText.\n";
  P.wipe();const B=P.boot();await B.createBooklet();const r=B.parseFile(LEAD);
  chk("prose before the first activity line of a file with no module is the booklet's opening too",r.ok&&r.template.opening&&r.template.opening.length===1&&/one activity line/.test(r.template.opening[0].text),JSON.stringify(r.template.opening));}
 {const PLAIN=FM("Whole")+"All of this is one activity, named by the title.\n\n## A heading\n\nMore.\n";
  P.wipe();const B=P.boot();await B.createBooklet();const r=B.parseFile(PLAIN);
  chk("a file with no activity or module line at all is one activity: it has no opening, its prose is the activity's",r.ok&&r.template.opening===undefined&&/All of this/.test(JSON.stringify(r.template.modules)),JSON.stringify(r.template.opening));}
 {const CAL=FM("Callout")+"Intro words.\n\n> [!tip] Before anything\n> Read this first.\n\n> [!activity|a] Only\n\nText.\n";
  P.wipe();const B=P.boot();await B.createBooklet();const r=B.parseFile(CAL);
  chk("a reading callout before the first line is part of the opening, in the file's order with the prose",r.ok&&(r.template.opening||[]).map(b=>b.type).join()==="markdown,callout",JSON.stringify(r.template.opening));}

 /* ---------------- D15: `cards` draws a data block ---------------- */
 const ROWS='[{"label":"Sow the **carrots**","where":"Bed 4","effort":"low","note":"soon","badge":"garden","value":"12","tone":"good","when":"This week","link":"#Elsewhere","icon":"leaf"},{"label":"Mend the gate","where":"","effort":"high","when":"Next week"},{"id":"x","label":"Order seed","where":"Shed","when":"This week"}]';
 const CARDS=FM("Cards")+`> [!module|m] M

> [!activity|a] A

\`\`\`booklet query
from: jobs
as: cards
\`\`\`

\`\`\`booklet query
from: jobs
as: cards
fields: effort
limit: 2
\`\`\`

\`\`\`booklet query
from: jobs
as: cards
group: when
\`\`\`

> [!activity|b] Elsewhere

## Elsewhere

Words.

\`\`\`booklet data
${ROWS}
\`\`\`
^jobs

> [!module|m end] End
`;
 {P.wipe();const B=P.boot();await B.createBooklet();const r=B.parseFile(CARDS);
  chk("`as: cards` on a data block is read clean (no refusal)",r.ok&&r.unread.length===0,JSON.stringify(r.unread));
  B.loadText(CARDS);B.screen="m/a";B.render();const main=P.main();
  const boxes=byClass(main,"dv-box");
  chk("three cards views are drawn",boxes.length===3);
  const cards=byClass(boxes[0],"card");
  chk("one card per row",cards.length===3,cards.map(text).join("|"));
  chk("the row's label is the card's title (data values are plain: its asterisks stay)",byClass(cards[0],"k").length===1&&/Sow the \*\*carrots\*\*/.test(text(byClass(cards[0],"k")[0])),text(cards[0]));
  chk("the `note` is the line under the title, not a field line",byClass(cards[0],"d").map(text).join()==="soon"&&!byTag(cards[0],"dt").some(d=>text(d)==="note"),text(cards[0]));
  chk("the `badge` is a pill, the `value` the card's figure (as a tile's), the `tone` colours the card and is said in words",
    byClass(cards[0],"pill").map(text).join()==="garden"&&byClass(cards[0],"dv-v").map(text).join()==="12"&&cls(cards[0]).includes("tone-good")&&byClass(cards[0],"dv-sr").length===1&&byClass(cards[1],"pill").length===0&&!cls(cards[1]).some(c=>/^tone-/.test(c)),text(cards[0]));
  chk("the badge pill is the list's markup: a `dv-b` span of `pill tone-good` spans",byClass(cards[0],"dv-b").length===1&&byClass(byClass(cards[0],"dv-b")[0],"pill").length===1&&cls(byClass(cards[0],"pill")[0]).includes("tone-good"),text(cards[0]));
  const dl=byTag(cards[0],"dl")[0];
  chk("only the fields that play no role are lines, named, like a kept entry's lines",!!dl&&byTag(dl,"dt").map(text).join()==="where,effort,when"&&byTag(dl,"dd").map(text).join()==="Bed 4,low,This week",dl&&text(dl));
  chk("a field with no value is left out of the lines",byTag(cards[1],"dt").map(text).join()==="effort,when",byTag(cards[1],"dt").map(text).join());
  chk("`id` is not a line",!byTag(cards[2],"dt").some(d=>text(d)==="id"),byTag(cards[2],"dt").map(text).join());
  chk("the row's `icon` is the card's picture",byClass(cards[0],"cd-tile").length===1);
  chk("and its `link` leads from the label: a link in the title",byTag(byClass(cards[0],"k")[0],"a").length===1&&byTag(byClass(cards[1],"k")[0],"a").length===0,text(cards[0]));
  const lines2=byClass(boxes[1],"card");
  chk("`fields:` picks the lines and `limit:` the rows",lines2.length===2&&lines2.every(c=>byTag(c,"dt").every(d=>text(d)==="effort")),lines2.map(text).join("|"));
  const heads=byClass(boxes[2],"dv-group");
  chk("`group:` draws the cards under group headings, in first-seen order, with a count",heads.map(text).join("|")==="This week2 rows|Next week1 row"&&byClass(boxes[2],"card").length===3,heads.map(text).join("|"));
  chk("a card is a card built by cardNode (the item kind, a div, never a button)",cards.every(c=>c.tagName==="div"&&cls(c).includes("card-item")));}
 /* kept entries still draw as dated cards */
 {P.wipe();const B=P.boot();await B.createBooklet();
  B.loadText(FM("Kept")+"> [!module|m] M\n\n> [!activity|log repeat] Log\n\n> [!text|what] What?\n\n> [!activity|look] Look\n\n```booklet query\nfrom: log\nas: cards\n```\n\n> [!module|m end] End\n");
  B.keptFor("m/log").push({ts:"2026-10-02T09:00:00.000Z",what:"hello"});B.screen="m/look";B.render();
  const cs=byClass(P.main(),"dv-cards");
  chk("kept entries are still dated cards, titled by the date, their questions as lines",cs.length===1&&byClass(cs[0],"card").length===1&&byTag(cs[0],"dt").map(text).join()==="What?"&&byClass(cs[0],"when").length===1,text(cs[0]||""));}

 /* ---------------- round 2: names, links, the opening's comments, a question out of place ---------------- */
 {const R2=FM("Round two")+`<!-- note for whoever edits this file -->

# Round two

Opening words.[^x]

> [!text|early] A question before any activity

> [!module|m] Module

> [!activity|a] First $\\frac{1}{2}$

See the question: see [[#Target]] and [there](#target) and [[#Nope]] and $$y$$.

> [!choice|pick] Which, [[#Target]], $$z$$?

- [ ] Choice one
- [x] Choice $\\frac{2}{3}$

> [!activity|b] Second $\\frac{3}{4}$

## Target

Words.

> [!activity|log repeat] Log

> [!choice|opt] Choose

- [ ] Plain
- [ ] Marked **bold** $\\frac{1}{3}$

> [!activity|look] Look

\`\`\`booklet query
from: log
as: table
\`\`\`

\`\`\`booklet query
from: jobs
as: cards
group: when
\`\`\`

\`\`\`booklet data
[{"label":"One","when":"W1","parent":"p1","id":"i1"}]
\`\`\`
^jobs

> [!module|m end] End
`;
  P.wipe();const B=P.boot();await B.createBooklet();const r=B.parseFile(R2);
  chk("a question line before the first module or activity line is reported, and the file opens",r.ok&&r.unread.some(u=>/text question belongs inside an activity/.test(u))&&!r.refused.length,JSON.stringify(r.unread));
  chk("it is drawn nowhere: no activity of its own, its id is not an id of the module",JSON.stringify(r.template).indexOf('"early"')<0);
  B.loadText(R2);B.screen="@home";B.render();const home=P.main();
  chk("an HTML comment in the booklet's opening is never drawn",!/note for whoever/.test(text(home))&&/Opening words/.test(text(home)),text(home).slice(0,160));
  chk("a footnote mark in the opening is left out",!/\[\^x\]/.test(text(home)),text(home).slice(0,160));
  B.screen="m/a";B.render();const m=P.main();
  const h2=byTag(m,"h2")[0];
  chk("a heading link in a title works as in prose: live, and without its #",byTag(walk(m,x=>x.tagName==="h3"&&/Which/.test(text(x)))[0],"a").length===1&&!/#/.test(text(walk(m,x=>x.tagName==="h3"&&/Which/.test(text(x)))[0])),text(m).slice(0,200));
  chk("an unresolved heading link is its words, without the #",/Which, Target, /.test(text(walk(m,x=>x.tagName==="h3"&&/Which/.test(text(x)))[0])));
  chk("a display formula in a title is drawn inline",byTag(walk(m,x=>x.tagName==="h3"&&/Which/.test(text(x)))[0],"div").length===0);
  const nxt=byClass(m,"cd-next")[0];
  chk("the footer's Next shows the next activity's formula as a formula, with the words around it",!!nxt&&byClass(nxt,"math").length===1&&/^Next: 2\. Second /.test(text(nxt)),nxt&&text(nxt));
  B.keptFor("m/log").push({ts:"2026-10-04T09:00:00.000Z",opt:2});
  B.screen="m/look";B.render();const lk=P.main();
  chk("a table over kept entries draws a chosen option's formula, as the card does",byTag(lk,"td").some(td=>byClass(td,"math").length===1),byTag(lk,"td").map(text).join("|"));
  const gc=byClass(byClass(lk,"dv-box")[1]||lk,"card")[0];
  chk("on cards over a data block the group field is not a line (cards group), but the parent field is (cards do not nest)",!!gc&&byTag(gc,"dt").map(text).join()==="parent",gc&&byTag(gc,"dt").map(text).join());}

 /* ---------------- D18: a word typed into the feelings grid ---------------- */
 {P.wipe();const B=P.boot();await B.createBooklet();
  const ex=fs.readFileSync(P.R+"/examples/mindful-check-in.booklet.md","utf8");
  B.loadText(ex);const id=B.bookActivities().find(a=>a.kind==="entry").id;
  const w=B.BOOK.widgets.find(x=>x.engine==="grid-select"),it=(w.items||[])[0],cell=(w.cells||[])[0];
  B.keptFor(id).push({ts:"2026-10-03T09:00:00.000Z",emotions:[it.id,"x|"+cell.id+"|restless"]});
  B.openChip[id]="2026-10-03T09:00:00.000Z";B.screen=id;B.render();
  const t=text(P.main());
  chk("a kept entry shows the word typed into the grid as the word, not as x|cell|word",/restless/.test(t)&&!/x\|/.test(t),(t.match(/.{30}restless.{20}/)||[t.slice(0,80)])[0]);
  chk("and the item listed by the widget shows its label",new RegExp(String(it.label).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(t));
  chk("the two engines each carry their own draw and summary",["svg-regions","grid-select"].every(e=>typeof B.ENGINES[e].draw==="function"&&typeof B.ENGINES[e].summary==="function"));}

 /* ---------------- D18: a footnote's continuation lines ---------------- */
 {const NOTE=FM("Notes")+"> [!module|m] M\n\n> [!activity|a] A\n\nA claim.[^n] And another.[^p]\n\n[^n]: *The Harbour Tide Atlas*, 2nd edition (2019), p. 12: \"The tide rises\n    and falls twice in each lunar day.\" Verified 2026-09-20.\n\n[^p]: A plain reference that\n  carries on to a second line.\n\nAfter the notes.\n\n> [!module|m end] End\n";
  P.wipe();const B=P.boot();const r=B.parseFile(NOTE);const m=r.template.modules[0];
  chk("a footnote's indented continuation lines belong to the note, as in GFM",r.ok&&m.citations.length===2,JSON.stringify(m.citations));
  const c1=m.citations.find(c=>c.id==="n"),c2=m.citations.find(c=>c.id==="p");
  chk("a note that wraps still reads as a source and a quote (the lines are joined by a space)",!!c1&&c1.quote==="The tide rises and falls twice in each lunar day."&&c1.verifiedOn==="2026-09-20"&&(m.sources||[])[0]&&m.sources[0].title==="The Harbour Tide Atlas",JSON.stringify([c1,m.sources]));
  chk("a plain reference keeps its whole text",!!c2&&c2.quote==="A plain reference that carries on to a second line.",JSON.stringify(c2));
  const prose=JSON.stringify(m.mode.blocks);
  chk("no continuation line is left behind as a stray paragraph",!/carries on|and falls twice/.test(prose)&&/After the notes/.test(prose),prose);}

 /* ---------------- D18: a citation with no italic title ---------------- */
 {const CITE=FM("Cite")+"> [!module|m] M\n\n> [!activity|a] A\n\nOne.[^a] Two.[^b] Three.[^c]\n\n[^c]: *Northfield trial report*, p. 3: \"No-shows fell.\"\n\n[^a]: Northfield trial report, p. 3: \"No-shows fell.\" Verified 2026-01-01.\n\n[^b]: *Northfield trial report*, 2nd edition, p. 3: \"No-shows fell.\" Verified 2026-01-01.\n\n> [!module|m end] End\n";
  P.wipe();const B=P.boot();const r=B.parseFile(CITE);const m=r.template.modules[0];
  const a=m.citations.find(c=>c.id==="a"),b=m.citations.find(c=>c.id==="b");
  chk("a citation with no italic title is a plain reference: no source, no page filed as an edition",!!a&&a.source===undefined&&a.quote.startsWith("Northfield trial report, p. 3:")&&m.sources.length===2,JSON.stringify([a,m.sources]));
  const c=m.citations.find(x=>x.id==="c"),src=(m.sources||[]).find(x=>x.key===(c||{}).source);
  chk("an italic title followed by only a page: the page is the page, not the edition",!!c&&c.page==="3"&&!!src&&src.edition===undefined,JSON.stringify([c,m.sources]));
  chk("one with an italic title is still a source, with its edition and page",!!b&&b.source&&b.page==="3"&&(m.sources.find(x=>x.key===b.source)||{}).edition==="2nd edition",JSON.stringify([b,m.sources]));}

 console.log(fails?"\n"+fails+" FAILURES":"\ndrawing checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
