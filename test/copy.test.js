// Format 0.19, the copy line (SPEC.md section 6, "Copy"): `> [!copy|id of:a,b,c] Button label` puts a lead-in, the questions it names with what the
// reader answered, a question's own folded solution or hint, and fenced text blocks on the clipboard, in the order `of:` lists them.
// This reads booklets made here (made-up tides and kitchen words, nothing real) and checks the text a press would copy, exactly; that an
// empty answer is copied all the same with the fixed words; each kind's answer; the three kinds of word and what each does when it names
// something it cannot; where a copy line may stand; and that copying writes nothing (no answer, no record, nothing marked unsaved).
// The press in a real browser (the clipboard, the status line a screen reader announces) is test/copy-browser.js.
// Run: node test/copy.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const A=P.boot();
const FM='---\nbooklet: "0.19"\ntitle: Copy\nlang: en\n---\n\n';
const read=t=>{A.loadText(t);return A.parseFile(t);};
const blocks=(r,n)=>{const a=r.template.modules.flatMap(m=>m.activities)[n||0];return a.pages.flatMap(p=>p.blocks);};
const copyOf=(r,id,n)=>blocks(r,n).find(b=>b.type==="copy"&&(id===undefined||b.id===id));
const actId=(r,n)=>r.template.modules.flatMap(m=>m.activities)[n||0].id;
/* the text a press copies, for these answers */
const text=(src,answers,id)=>{const r=read(src);return A.copyTextOf(copyOf(r,id),answers||{},actId(r));};
const said=(r,rx)=>r.unread.some(x=>rx.test(A.problemText(x)));

// ---- the format: `copy` is a kind that takes `of:`, and is a block that owns no answer
chk("copy is a kind of the settings table, and takes `of:` only",JSON.stringify(A.KIND_SETTINGS.copy)==='["of:"]');
chk("copy is not a question kind",!A.QUESTION_KINDS.has("copy"));

// ---- Andrea's case: a long text question and its folded solution
const TIDES=FM+`> [!activity|a] Tides

> [!text|why-twice long] Why does the tide come in twice a day?

> [!solution]- Model answer
> The moon pulls on both sides of the earth.

> [!copy|ask-tutor of:why-twice,why-twice/solution] Copy for my tutor
> Please mark my answer against the model answer.
`;
{const r=read(TIDES),c=copyOf(r);
 chk("the booklet reads with nothing said",r.ok&&r.unread.length===0,r.unread.map(A.problemText).join(" | "));
 chk("the line makes one copy block: its label, its lead-in and its pieces, and it owns no key",c&&c.label==="Copy for my tutor"&&c.lead==="Please mark my answer against the model answer."
   &&JSON.stringify(c.keys)==="[]"&&JSON.stringify(c.pieces)==='[{"q":"why-twice"},{"q":"why-twice","part":"solution"}]',JSON.stringify(c));
 chk("the question's own solution is not drawn apart from it, and the copy line is not a question",blocks(r).filter(b=>A.QUESTION_KINDS.has(b.type)).length===1);
 chk("with an answer typed, the text is the lead-in, the question, the answer and the model answer, in that order",
   text(TIDES,{"why-twice":"The moon pulls the sea towards it."})==="Please mark my answer against the model answer.\n\nQuestion: Why does the tide come in twice a day?\n\nMy answer: The moon pulls the sea towards it.\n\nModel answer: The moon pulls on both sides of the earth.");
 chk("an answer of several lines keeps its line breaks and carries on under its label",
   text(TIDES,{"why-twice":"First.\nSecond."}).includes("My answer: First.\nSecond.\n\nModel answer:"));
 // an empty answer is copied all the same (Ben, 2026-11-06): the question and the model answer, and the fixed words
 const empty="Please mark my answer against the model answer.\n\nQuestion: Why does the tide come in twice a day?\n\nMy answer: (no answer typed)\n\nModel answer: The moon pulls on both sides of the earth.";
 chk("an empty answer is copied all the same, with (no answer typed)",text(TIDES,{})===empty);
 chk("so is one that is only spaces, and one that is null",text(TIDES,{"why-twice":"  \n "})===empty&&text(TIDES,{"why-twice":null})===empty);
 chk("the fixed words are the format's",A.COPY_WORDS.none==="(no answer typed)"&&A.COPY_WORDS.answer==="My answer:"&&A.COPY_WORDS.question==="Question:"&&A.COPY_WORDS.model==="Model answer:"&&A.COPY_WORDS.hint==="Hint:");
 chk("the text has no blank line or space at either end",!/^\s|\s$/.test(text(TIDES,{"why-twice":"x"})));
 // pressed in the language of the page or not, the words are the same
 A.lang="fr";chk("the words do not change with the page's language",text(TIDES,{})===empty);A.lang="en";}

// ---- each kind's answer
const KINDS=FM+`> [!activity|a] Kinds

> [!choice|pick open] A choice
- [ ] Red *one*
- [ ] Blue

> [!multi|many open] A multi
- [ ] Salt
- [ ] Pepper
- [ ] Cumin

> [!scale|sc] A scale

1. Low
2. Middle
3. High

> [!number|nu] A number

> [!date|da] A date

> [!lines|li] Some lines

> [!copy|all of:pick,many,sc,nu,da,li] All
`;
{const r=read(KINDS),a=(o)=>A.copyTextOf(copyOf(r),o,actId(r));
 const piece=(txt,label)=>{const m=new RegExp("(?:^|\\n\\n)"+label+" ([^]*?)(?=\\n\\n|$)").exec(txt);return m&&m[1];};
 chk("the booklet reads with nothing said",r.ok&&r.unread.length===0,r.unread.map(A.problemText).join(" | "));
 const full=a({pick:1,many:[3,1,"Thyme"],sc:3,nu:12.5,da:"2026-11-06",li:["one","","two"]});
 chk("a choice gives the picked option's words, as written",/My answer: Red \*one\*(\n|$)/.test(full));
 chk("a choice's own option gives what the reader typed",/My answer: Green/.test(a({pick:"Green"})));
 chk("a multi gives each picked option on a line of its own, in the order the answer holds them, the reader's own among them",full.includes("My answer: Cumin\nSalt\nThyme"),full);
 chk("a scale gives the picked anchor's words",full.includes("My answer: High"));
 chk("a date answer has the blank lines and spaces at its ends trimmed",a({da:"\n 2026-11-06 \n\n"}).includes("Question: A date\n\nMy answer: 2026-11-06\n\n"));
 chk("a number is written as a number is",full.includes("My answer: 12.5")&&a({nu:0}).includes("My answer: 0"));
 chk("a date is as typed",full.includes("My answer: 2026-11-06"));
 chk("lines go one to a line, each as typed, and a blank one inside is kept",full.includes("My answer: one\n\ntwo"),full);
 {const t=a({li:["","  a ","","  b  ",""]});
  chk("a lines answer is trimmed at the ends of the whole, never line by line",t.endsWith("My answer: a \n\n  b"),JSON.stringify(t));}
 chk("each question gives its words and then its answer, six questions in the order listed",(full.match(/^Question: /gm)||[]).length===6&&(full.match(/^My answer: /gm)||[]).length===6
   &&full.indexOf("Question: A choice")<full.indexOf("Question: A multi")&&full.indexOf("Question: A multi")<full.indexOf("Question: A scale")&&full.indexOf("Question: A date")<full.indexOf("Question: Some lines"));
 chk("a copy with no lead-in starts at the first question",full.startsWith("Question: A choice"));
 chk("nothing answered is (no answer typed) for every kind",(a({}).match(/My answer: \(no answer typed\)/g)||[]).length===6);
 chk("a position the question does not list is copied as its number",a({pick:9}).includes("My answer: 9")&&a({sc:7}).includes("My answer: 7"));
 chk("an answer not in its kind's shape is copied as the JSON the file holds",a({nu:"twelve"}).includes('My answer: "twelve"')&&a({sc:1.5}).includes("My answer: 1.5")&&a({li:"one"}).includes('My answer: "one"'));
 chk("an answer of 0 is an answer, not an empty one",a({nu:0}).split("\n\n").some(x=>x==="My answer: 0")&&a({nu:0}).includes("Question: A number\n\nMy answer: 0"));}

// ---- whitespace: the text has no blank line or space at its ends, and exactly one blank line between pieces (SPEC "Copy")
{const src=FM+"> [!activity|a] A\n\n> [!text|t] T\n> A help line under the title.\n\n> [!solution]- S\n> \n\n> [!copy|c of:t,t/solution,t] C\n";
 const r=read(src),T=A.copyTextOf(copyOf(r),{t:"\n  abc\n\n  def  \n \n"},actId(r));
 chk("a typed answer is trimmed at its ends, left as typed inside; the pieces have one blank line between and none at the ends",
   T==="Question: T\n\nMy answer: abc\n\n  def\n\nModel answer:\n\nQuestion: T\n\nMy answer: abc\n\n  def",JSON.stringify(T));
 chk("a question's help lines are not copied; only its title",!T.includes("help line"));
 chk("a folded solution with an empty body is its label with nothing after it, and is said nowhere",T.includes("Model answer:\n\n")&&r.unread.length===0,r.unread.map(A.problemText).join(" | "));
 chk("no piece or end of the text has a space or a blank line at its end, whatever was typed",!/[ \t]\n|\n\n\n|^\s|\s$/.test(T));}
{const src=FM+"> [!activity|a] A\n\n> [!text|t]\n\n> [!copy|c of:t,b] C\n\n```text\n\n\n  lead\n\n\n```\n^b\n\n```text\n```\n^e\n\n> [!copy|d of:e,t] D\n";
 const r=read(src),cs=blocks(r).filter(b=>b.type==="copy");
 chk("a question with no title is `Question:` and nothing after it, with no id in its place",A.copyTextOf(cs[0],{t:"x"},actId(r)).startsWith("Question:\n\nMy answer: x"),A.copyTextOf(cs[0],{t:"x"},actId(r)));
 chk("a block's leading blank lines are dropped, its first line's indent kept, and its trailing ones trimmed",A.copyTextOf(cs[0],{t:"x"},actId(r)).endsWith("b:\n  lead"),JSON.stringify(A.copyTextOf(cs[0],{t:"x"},actId(r))));
 chk("an empty block is its id and a colon, with no line break after",A.copyTextOf(cs[1],{},actId(r)).startsWith("e:\n\nQuestion:"),JSON.stringify(A.copyTextOf(cs[1],{},actId(r))));}

// ---- an empty item in `of:` is an error and the whole line is left out
for(const of of ["q,,q",",q","q,","q, q"]){
 const r=read(FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n> [!copy|c of:"+of+"] C\n");
 chk("`of:"+of+"` is said and the whole copy line is not drawn",r.unread.some(x=>/in `of:`/.test(A.problemText(x)))&&blocks(r).every(b=>b.type!=="copy"),r.unread.map(A.problemText).join(" | "));}
// ---- the messages name the word in every language, and agree in gender
{const P=A.STRINGS_SRC;
 chk("the fr and es messages for a missing solution or hint write the word and agree in gender",
   P.fr.problem.copyNoPart("l","x","solution").includes("n’a pas de solution repliée")&&P.fr.problem.copyNoPart("l","x","hint").includes("n’a pas d’indice replié")
   &&P.es.problem.copyNoPart("l","x","solution").includes("no tiene una solución plegada")&&P.es.problem.copyNoPart("l","x","hint").includes("no tiene una pista plegada"));}

// ---- hint and solution: named by the question's id and a slash; the question's own folded callout
const HS=FM+`> [!activity|a] Parts

> [!copy|early of:q2/hint,q2,q2/solution,q1/hint] Before the questions

> [!choice|q1] One
- [ ] A
- [x] B

> [!hint]- Nudge one
> HINT-ONE

> [!choice|q2] Two
- [ ] A
- [x] B

> [!hint]- Nudge two
> HINT-TWO

> [!solution]- Why two
> SOLUTION-TWO line one
> line two

> [!solution]- A second solution
> SECOND-SOLUTION
`;
{const r=read(HS),c=copyOf(r);
 chk("a copy line above the questions it names reads, and says nothing",r.ok&&r.unread.length===0,r.unread.map(A.problemText).join(" | "));
 chk("pieces come in the order listed: a hint, a question and its answer, a solution, a hint",JSON.stringify(c.pieces.map(p=>p.q+(p.part?"/"+p.part:"")))==='["q2/hint","q2","q2/solution","q1/hint"]');
 const t=A.copyTextOf(c,{q2:2},actId(r));
 chk("a hint is labelled Hint: and a solution Model answer:, with the callout's text and not its title",
   t==="Hint: HINT-TWO\n\nQuestion: Two\n\nMy answer: B\n\nModel answer: SOLUTION-TWO line one\nline two\n\nHint: HINT-ONE",t);
 chk("only the first folded solution is the question's own",!t.includes("SECOND-SOLUTION"));}

// ---- blocks: a fenced block with a ^id, found in the module first, then the shared data section
const BLK=FM+`> [!module|m1] One

> [!activity|a] A

> [!text|q] Q

> [!copy|c of:q,rubric,shared,own-data,other] Copy

\`\`\`text
RUBRIC LINE ONE
  RUBRIC LINE TWO


\`\`\`
^rubric

> [!data|m1] Data

\`\`\`text
IN THE MODULE'S DATA
\`\`\`
^own-data

> [!module|m1 end] End

> [!module|m2] Two

> [!activity|b] B

> [!text|q] Q

\`\`\`text
ONLY IN MODULE TWO
\`\`\`
^other

> [!module|m2 end] End

> [!data] Shared

\`\`\`text
SHARED TEXT
\`\`\`
^shared
`;
{const r=read(BLK),c=copyOf(r);
 chk("a block in the module's fence, its data section and the shared data section is found; one only in another module is said and left out",
   c&&JSON.stringify(c.pieces.map(p=>p.q||p.block))==='["q","rubric","shared","own-data"]',JSON.stringify(c&&c.pieces));
 chk("the other module's block is reported as unknown",said(r,/“other” in `of:` names no question of this activity and no block of this module/),r.unread.map(A.problemText).join(" | "));
 const t=A.copyTextOf(c,{q:"x"},actId(r));
 chk("a block is its id, a colon, a line break and its text, less the blank lines at its end",t==="Question: Q\n\nMy answer: x\n\nrubric:\nRUBRIC LINE ONE\n  RUBRIC LINE TWO\n\nshared:\nSHARED TEXT\n\nown-data:\nIN THE MODULE'S DATA",t);}

// ---- what a word may not name, and where a line may stand: each is said and left out
const BAD=FM+`> [!activity|a] A

> [!text|q] Q

> [!solution] Open solution
> Not folded.

> [!matrix|mx] Grid

- one

0. no
1. yes

> [!choice|ch] Pick
- [ ] A

> [!text|each-q each:ch] Per pick

> [!copy|c of:q,q/solution,q/hint,mx,each-q,a,nobody,Bad_Id,other/hint] Copy

> [!activity|b] B

> [!text|other] Other

> [!copy|d of:q] From the wrong activity
`;
{const r=read(BAD),c=copyOf(r,"c");
 chk("only the question is kept",c&&JSON.stringify(c.pieces)==='[{"q":"q"}]',JSON.stringify(c&&c.pieces));
 chk("a solution that is not folded is not the question's own, and is said",said(r,/“q\/solution” has no solution folded/));
 chk("a hint the question does not have is said",said(r,/“q\/hint” has no hint folded/));
 chk("a matrix is said, with the kinds that can be copied",said(r,/“mx” is a matrix question, and only text, lines, choice, multi, scale, number and date/));
 chk("a question asked for each pick is said",said(r,/“each-q” is asked for each pick of another question, or for each row of a data block, and such a question cannot be copied/));
 chk("an activity's id is said to be neither a question nor a block",said(r,/“a” is not a question or a block/));
 chk("an id that names nothing is said",said(r,/“nobody” in `of:` names no question of this activity and no block of this module/));
 chk("a word that is no id is said",said(r,/“Bad_Id” in `of:` is not an id/));
 chk("a question of another activity is said, on the word with a slash too",said(r,/“other\/hint” is a question of another activity; a copy line copies from its own/));
 chk("a copy line with nothing left to copy is said, and drawn nowhere",said(r,/line \d+: nothing in this copy line can be copied, so the line was left out/)
   &&!blocks(r,1).some(b=>b.type==="copy"),JSON.stringify(r.unread.map(A.problemText).filter(x=>/nothing in/.test(x))));}
{const r=read(FM+"> [!copy|c] Without of\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!copy|c of:] Empty\n\n> [!copy|d of:q,,q] Gap\n\n> [!copy|e of:q extra] Extra word\n");
 chk("a copy line without `of:`, one with an empty `of:` and one with a gap are each said and left out; an extra word is a setting the kind does not take, and the line stays",
   said(r,/line 7: a copy line belongs inside an activity/)&&said(r,/line 13: a copy line needs `of:`/)&&said(r,/line 15: “q,,q” in `of:` is not an id/)&&blocks(r).filter(b=>b.type==="copy").map(b=>b.id).join()==="e",r.unread.map(A.problemText).join(" | "));
 chk("a word after `of:` is a setting the kind does not take, and is said",said(r,/line 17: a copy line takes no “extra”/),r.unread.map(A.problemText).join(" | "));}
{const r=read(FM+"> [!module|m] M\n\nSome opening.\n\n> [!copy|c of:q] In the opening\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n");
 chk("a copy line in a module's opening is said and left out",said(r,/line 11: a copy line belongs inside an activity/)&&blocks(r).every(b=>b.type!=="copy"),r.unread.map(A.problemText).join(" | "));}
{const r=read(FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n%%\n> [!records]\n\n> [!copy|c of:q] In the records\n%%\n");
 chk("a copy line in the records section is not a block: it is said and kept as written",blocks(r).every(b=>b.type!=="copy")&&r.unread.length>0,r.unread.map(A.problemText).join(" | "));}
{const r=read(FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n> [!data] D\n\n> [!copy|c of:q] In a data section\n");
 chk("a copy line in a data section is not read",blocks(r).every(b=>b.type!=="copy"));}
{const r=read(FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n> [!copy|q of:q] Same id as the question\n");
 chk("a copy line's id is an ordinary id: the same as a question's is said as a clash",r.unread.length>0&&r.refused.length>0,r.unread.map(A.problemText).join(" | "));}
{const r=read(FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n> [!copy|of:q] Label with no id\n");
 chk("the id is optional: a copy line with none reads and copies",r.ok&&r.unread.length===0&&copyOf(r)&&copyOf(r).pieces.length===1,r.unread.map(A.problemText).join(" | "));}
{const r=read(FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n> [!copy|c of:q]\n");
 chk("a copy line with no title has no label, and the renderer will use its own word",copyOf(r)&&copyOf(r).label===undefined&&A.copyTextOf(copyOf(r),{},actId(r))==="Question: Q\n\nMy answer: (no answer typed)");}

// ---- a copy line inside a row, a group and a tab is found, and one between a question and its solution takes the solution from it
{const r=read(FM+"> [!activity|a] A\n\n> [!group]- G\n> > [!text|q] Q\n> >\n> > [!copy|c of:q] In a group\n\n> [!tab] Second\n\n> [!copy|c2 of:q] In a tab\n");
 const found=A.allModules()[0].activities[0].pages.flatMap(function walk(p){return p.blocks.flatMap(b=>[b,...(b.blocks||[])]);}).filter(b=>b.type==="copy");
 chk("a copy line in a group and one in a tab are both read, and say nothing",r.unread.length===0&&found.length===2,r.unread.map(A.problemText).join(" | ")+" "+found.length);}
{const r=read(FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n> [!copy|c of:q,q/solution] Between\n\n> [!solution]- After the copy\n> AFTER\n");
 chk("a solution after a copy line is not the question's own, as after any callout: the word is said and left out",said(r,/“q\/solution” has no solution folded/)&&copyOf(r).pieces.length===1,r.unread.map(A.problemText).join(" | "));}

// ---- it copies and writes nothing: no answer, no record, nothing marked unsaved
{A.loadText(TIDES);const a=A.allModules()[0].activities[0],blk=a.pages[0].blocks.find(b=>b.type==="copy");
 const was={wrote:[],clip:[]};
 Object.defineProperty(globalThis,"navigator",{value:{clipboard:{writeText:t=>{was.clip.push(t);return Promise.resolve();}}},configurable:true});
 const draft=A.draftFor(a.id);draft["why-twice"]="Because of the moon.";
 const before=JSON.stringify([A.DRAFTS,A.STATE]),src=A.BOOK.raw.source,dirty0=A.dirty;
 const node=A.DRAW_BLOCK.copy(blk,draft,a.id);
 const btn=(function find(n){if(n.tagName==="button") return n;for(const k of n.children||[]){const f=typeof k==="object"&&find(k);if(f) return f;}return null;})(node);
 const live=(function find(n){if(n.attrs&&n.attrs.role==="status") return n;for(const k of n.children||[]){const f=typeof k==="object"&&find(k);if(f) return f;}return null;})(node);
 chk("the block is one button and a status line a screen reader announces",!!btn&&!!live&&live.attrs["aria-live"]==="polite",node.children.map(c=>c.tagName).join());
 chk("the button is named by the copy line's title",btn.textContent==="Copy for my tutor",btn.textContent);
 btn._on.click();
 setTimeout(()=>{
   chk("pressing it puts the assembled text on the clipboard, once",was.clip.length===1&&was.clip[0]==="Please mark my answer against the model answer.\n\nQuestion: Why does the tide come in twice a day?\n\nMy answer: Because of the moon.\n\nModel answer: The moon pulls on both sides of the earth.",JSON.stringify(was.clip));
   chk("and says Copied",live.textContent==="Copied",live.textContent);
   chk("it wrote nothing: the answers and state are as they were, the file's design text is as it was, and nothing is marked unsaved",
     JSON.stringify([A.DRAFTS,A.STATE])===before&&A.BOOK.raw.source===src&&A.dirty===dirty0);
   console.log(fails?"\n"+fails+" check(s) failed":"\nall checks passed");process.exit(fails?1:0);},50);}
