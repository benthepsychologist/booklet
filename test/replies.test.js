// A reply for each option of a choice or multi (SPEC.md section 5): a bullet nested under an option is that option's reply.
// The parse (an option's own text never swallows its reply, a reply is no option, the answers are untouched), the drawing in
// node's recording DOM, and the linter's rules about where a nested bullet may stand. The browser side (shown on a pick, changed
// on a re-pick, in option order) is test/questions-browser.js. Run: node test/replies.test.js
const fs=require("fs"),os=require("os"),path=require("path"),{spawnSync}=require("child_process");
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const FM="---\nbooklet: \"0.15\"\ntitle: Replies\nlang: en\n---\n\n";
const wrap=body=>FM+"> [!module|rp] Replies\n\n> [!activity|a] A\n\n"+body+"\n> [!module|rp end] End\n";
const blocksOf=R=>R.template.modules[0].activities[0].pages[0].blocks;
const q=(body,id)=>{const R=P.boot().parseFile(wrap(body));return {R,b:blocksOf(R).find(x=>x.id===id),all:blocksOf(R)};};

/* ---- the parse ---- */
{const {R,b,all}=q(`> [!choice|where] Where are you right now?
- [ ] Calm
  - That is the settling system at work.
- [ ] Wound up
  - That is the activating, unpleasant family.
- [ ] Neither
`,"where");
 chk("a choice with replies parses with nothing reported",R.ok&&R.unread.length===0,JSON.stringify(R.unread));
 chk("every option is still an option: the list is not cut at the first reply",b.options.length===3&&b.options.join("|")==="Calm|Wound up|Neither",JSON.stringify(b.options));
 chk("an option's own text never swallows its reply",b.options[0]==="Calm"&&b.options[1]==="Wound up",JSON.stringify(b.options));
 chk("each reply is kept by position, and an option with none has an empty one",
   JSON.stringify(b.replies)===JSON.stringify(["That is the settling system at work.","That is the activating, unpleasant family.",""]),JSON.stringify(b.replies));
 chk("a reply is not read again as prose: only the question is left in the page",all.length===1&&all[0].type==="choice",all.map(x=>x.type).join());
 chk("the question still owns one answer slot, and no correct answer is invented",JSON.stringify(b.keys)==='["where"]'&&b.answer===undefined,JSON.stringify([b.keys,b.answer]));}
{const {b}=q(`> [!choice|plain] Plain?
- [ ] One
- [ ] Two
`,"plain");
 chk("a choice with no replies carries no `replies` at all",b.replies===undefined&&b.options.join()==="One,Two");}
{const {b}=q(`> [!choice|mixed] Mixed?
- [ ] One
- [x] Two
  - Right, and here is why.
- [ ] Three
  - Not this one.
`,"mixed");
 chk("`[x]` marks still work beside replies: the answer is the marked position",b.answer===2&&b.options.join()==="One,Two,Three",JSON.stringify([b.answer,b.options]));
 chk("replies sit with their own options, by position",JSON.stringify(b.replies)===JSON.stringify(["","Right, and here is why.","Not this one."]),JSON.stringify(b.replies));}
{const {b}=q(`> [!multi|many] Many?
- [ ] A
  - About A.
- [x] B
- [x] C
  - About C.
`,"many");
 chk("a multi takes replies, and its correct positions are unchanged",b.type==="multi"&&b.options.join()==="A,B,C"&&JSON.stringify(b.answer)==="[2,3]"&&JSON.stringify(b.replies)===JSON.stringify(["About A.","","About C."]),JSON.stringify([b.options,b.answer,b.replies]));}
{const {b}=q(`> [!choice|cont] Continued?
- [ ] One
  - First words of the reply
    and the rest of it.
  - A second nested bullet.
    - A bullet nested deeper is one more line.
- [ ] Two
`,"cont");
 chk("each nested bullet is one line of the reply (as Obsidian shows it), a deeper bullet one more, and a deeper-indented line goes on with the line above it, joined with a space",
   b.replies[0]==="First words of the reply and the rest of it.\nA second nested bullet.\nA bullet nested deeper is one more line."&&b.options.join()==="One,Two",JSON.stringify([b.options,b.replies]));}
{const {b}=q(`> [!choice|onespace] One space?
- [ ] One
 - Not a reply: one space is less than the option's text.
- [ ] Two
`,"onespace");
 chk("a bullet indented one space is no reply: it ends the option list, as Obsidian does not nest it",b.options.join()==="One"&&b.replies===undefined,JSON.stringify([b.options,b.replies]));}
{const {b}=q(`> [!choice|ind] Indented option?
  - [ ] One
    - A reply at four.
   - Three spaces is less than the option's text at four.
`,"ind");
 chk("the reply column is the option's own text column: an indented option's reply must be indented that far too",b.options.join()==="One"&&b.replies[0]==="A reply at four.",JSON.stringify([b.options,b.replies]));}
{const {b}=q(`> [!choice|wrap] Wrapped?
- [ ] One
  and the rest of the option
- [ ] Two
`,"wrap");
 chk("an indented line that is no bullet and follows no reply is not a reply and not the option's text: the list ends there, as before",
   b.options.join()==="One"&&b.replies===undefined,JSON.stringify([b.options,b.replies]));}
{const {b}=q("> [!choice|tab] Tabs?\n- [ ] One\n\t- Reply by tab.\n- [ ] Two\n","tab");
 chk("a tab indent makes a reply too",b.options.join()==="One,Two"&&b.replies[0]==="Reply by tab.",JSON.stringify([b.options,b.replies]));}
{const {b}=q(`> [!choice|md] Marks?
- [ ] **Bold** option
  - A reply with *emphasis*, \`code\` and a [link](https://example.org).
`,"md");
 chk("a reply is kept as written, inline Markdown, for the drawing to read",b.replies[0]==="A reply with *emphasis*, `code` and a [link](https://example.org).",JSON.stringify(b.replies));}
{const {b,all}=q(`> [!choice|solved] Solved?
- [ ] One
  - Reply one.
- [x] Two

> [!solution]- Why
> Because.
`,"solved");
 chk("a following solution still belongs to the question",all.length===1&&b.answer===2,all.map(x=>x.type).join());}
{const {b}=q(`> [!choice|nested-task] Nested box?
- [ ] One
  - [ ] Still an option, as before
`,"nested-task");
 chk("an indented task-list line is still an option, as it always was",b.options.length===2,JSON.stringify(b.options));}

/* ---- drawn in node's recording DOM: a reply is never an option and never an answer ---- */
const BOOK=wrap(`> [!choice|where] Where are you right now?
- [ ] Calm
  - That is the settling system at work.
- [ ] Wound up
  - That is the activating, unpleasant family.

> [!multi|many] Many?
- [ ] A
  - About A.
- [ ] B
  - About B.
- [ ] C
  - About C.
`);
{P.wipe();const A=P.boot();A.loadText(BOOK);A.screen="rp/a";A.render();
 const pills=()=>P.find(P.main(),n=>n.tagName==="button"&&/pill-btn/.test((n.attrs||{}).class||""));
 const replyText=()=>P.find(P.main(),n=>(n.attrs||{}).class==="q-reply").map(n=>P.texts(n)).join("|");
 const press=i=>pills()[i]._on.click();
 chk("every option is a button, and no reply is: five pills, for two and three options",pills().length===5,String(pills().length));
 chk("nothing is shown before a pick",replyText()==="",replyText());
 press(1);
 chk("a pick shows that option's reply",replyText()==="That is the activating, unpleasant family.",replyText());
 chk("and stores the position only",A.STATE.answers.rp.where===2,JSON.stringify(A.STATE.answers.rp));
 press(0);
 chk("picking another option changes the reply",replyText()==="That is the settling system at work.",replyText());
 press(4);press(2);
 chk("a multi shows each picked option's reply, in option order, whatever order they were picked in (C was picked before A)",
   replyText()==="That is the settling system at work.|About A.|About C.",replyText());
 chk("a multi stores positions only",JSON.stringify(A.STATE.answers.rp.many)==="[3,1]",JSON.stringify(A.STATE.answers.rp));
 const md=A.toMarkdown();
 chk("the saved records hold positions and no reply",!/settling system|About C/.test(md.slice(md.indexOf("%%"))),md.slice(-300));
 chk("the design is written back as it was, replies included",md.startsWith(BOOK.replace(/\s+$/,"")));}

/* ---- the linter ---- */
const lint=text=>{const f=path.join(os.tmpdir(),"replies-lint-"+process.pid+".booklet.md");fs.writeFileSync(f,text);
  const r=spawnSync("python3",[path.join(__dirname,"..","lint-booklet.py"),f],{encoding:"utf8"});fs.unlinkSync(f);
  return {status:r.status,errors:r.stdout.split("\n").filter(l=>l.startsWith("ERROR")),warns:r.stdout.split("\n").filter(l=>l.startsWith("warn")),out:r.stdout};};
{const r=lint(wrap(`> [!choice|where] Where?
- [ ] Calm
  - A reply.
- [x] Wound up
  - Another reply.

> [!multi|many] Many?
- [ ] A
	- A reply by tab.
- [ ] B
`));
 chk("replies under the options of a choice and a multi lint clean",r.status===0&&r.errors.length===0&&r.warns.length===0,r.out);}
{const r=lint(wrap(`> [!choice|one] One space?
- [ ] One
 - Not a reply.
- [ ] Two
`));
 chk("a bullet indented one space under an option is warned about, and the message says how far in a reply goes",
   r.status===0&&r.warns.length===1&&/line 13: a bullet under an option is its reply only when it is indented at least to the option's text/.test(r.warns[0]),r.out);}
{const r=lint(wrap(`> [!choice|gap] Gap?
- [ ] One

  - A reply after a blank line.
- [ ] Two
`));
 chk("a blank line between an option and its reply is warned about (it ends the list: what follows is read as text)",
   r.warns.length===1&&/line 13: a blank line ends the option list/.test(r.warns[0]),r.out);}
{const r=lint(wrap(`> [!choice|gap2] Gap?
- [ ] One

- [ ] Two
`));
 chk("a blank line between two options is warned about too",r.warns.length===1&&/line 13: a blank line ends the option list/.test(r.warns[0]),r.out);}
{const r=lint(wrap(`> [!choice|fine] Fine?

- [ ] One
  - A reply.
- [ ] Two

A paragraph after the list is fine.

- [ ] A to-do in prose does not count: a blank line and a paragraph came first.
`));
 chk("one blank line above the options, and a paragraph after the list, give no warning",r.warns.length===0&&r.errors.length===0,r.out);}
{const r=lint(wrap(`> [!scale|s] Scale?

0. Low
  - A reply to an anchor?
1. High
`));
 chk("a nested bullet under a scale's anchor is warned about, and says a scale takes no replies",r.status===0&&r.warns.length===1&&/line 14: a scale takes no replies/.test(r.warns[0]),r.out);}
{const r=lint(wrap(`> [!matrix|m] Matrix?

- Sleep
  - A reply to an item?
- Food

0. Low
1. High
`));
 chk("a nested bullet under a matrix item is warned about",r.warns.length===1&&/a nested bullet under a matrix item is read as another item, not as a reply/.test(r.warns[0]),r.out);}
{const r=lint(wrap(`> [!menu|places]
- Park
  - A reply to an entry?
- Garden

> [!multi|where menu:places] Where?
`));
 chk("a nested bullet under a menu entry is warned about",r.warns.length===1&&/a nested bullet under a menu entry is read as another entry, not as a reply/.test(r.warns[0]),r.out);}
{const r=lint(wrap(`> [!choice|wrap] Wrapped?
- [ ] One
  and the rest of the option
- [ ] Two
`));
 chk("an indented line under an option that follows no reply still gets the old warning (the list ends there)",r.warns.length===1&&/the line after this list is indented, so the list ends there/.test(r.warns[0]),r.out);}
{const r=lint(wrap(`> [!choice|same] Same depth?
- [ ] One
  - Reply
  continues here.
- [ ] Two
`));
 chk("a line at the reply's own depth that is no bullet ends the list, and the warning says a reply's next line must be a new bullet or sit deeper (not 'put each option on one line')",
   r.warns.length===1&&/line 14: this line follows a reply but is neither a new bullet nor deeper than the reply's bullet/.test(r.warns[0])&&!/one line/.test(r.warns[0]),r.out);}
{const r=lint(wrap(`> [!choice|where] Where?
- [ ] Calm
  - A reply.
- [ ] Wound up

A paragraph after the question, with a price of 5 dollars.
`));
 chk("the reply is claimed by its question, so it is not read again as prose by the linter's other checks",r.status===0&&r.errors.length===0&&r.warns.length===0,r.out);}
{const r=lint(wrap(`> [!choice|where] Where?
- [ ] Calm
  - A reply.
- [x] Wound up
  - Another reply.

> [!hint]- Hint
> Think.

> [!solution]- Why
> Because.
`));
 chk("a hint and a solution after a question whose options have replies still belong to it (the replies are not prose between them)",r.status===0&&r.errors.length===0&&r.warns.length===0,r.out);}
{const r=lint(wrap(`> [!choice|where] Where?
- [ ] Calm
  - A reply.
`).replace("- [ ] Calm\n","")); // a question with no options but a stray indented bullet
 chk("a choice whose only list is a nested bullet has no options, and says so",r.errors.length===1&&/has no options under it/.test(r.errors[0]),r.out);}

P.closePages();
console.log(fails?"\n"+fails+" FAILURES":"\nreplies checks passed");process.exit(fails?1:0);
