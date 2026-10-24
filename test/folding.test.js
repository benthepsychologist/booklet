// Folding and reading aids (renderer 0.11.10, C2; 0.15): the renderer folds nothing on its own; the fold switch shows only
// on a screen with callouts the author folded, and opens or folds exactly those, never a question's hint or solution; the
// compact hint fold; which options are short enough to sit beside their question; which pages offer one at a time; and the
// words in four languages. The drawn geometry, clicking and print are test/tabs-browser.js. Run: node test/folding.test.js
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const {find,hasClass,texts}=P;
const FM='---\nbooklet: "0.15"\nid: local/fold\ntitle: "Fold"\nlang: en\n---\n\n';
const A=P.boot();
const LS=global.__ls;
const Q=(id,n=2)=>`> [!choice|${id}] Question ${id}?\n- [ ] A\n- [ ] B\n\n`;
const draw=id=>{A.screen=id;A.render();return P.main();};
const switches=()=>find(P.main(),n=>n.tagName==="button"&&n.attrs.role==="switch");
const auFolds=()=>find(P.main(),hasClass("au-fold"));
const isOpen=d=>d.attrs.open!==undefined;

/* 1. the renderer folds nothing on its own: headings are headings, whatever the page holds */
A.loadText(FM+"> [!activity|a] A\n\n## One\n\nx\n\n"+Q("q1")+"## Two\n\ny\n\n## Three\n\nz\n");
draw("a");
chk("a page with questions and three headings folds nothing, and has no fold switch",find(P.main(),n=>n.tagName==="details").length===0&&switches().length===0);
{const h=find(P.main(),n=>n.tagName==="h3").map(texts).filter(t=>!/Question/.test(t));
 chk("its headings are drawn as headings",h.join()==="One,Two,Three",h.join());}

/* 2. the fold switch: only where the author folded a callout; it opens or folds exactly those, never a hint or a solution */
{const T=FM+"> [!activity|a] A\n\n"+Q("q1")+"> [!hint]-\n> The hint.\n\n> [!solution]-\n> The solution.\n\n> [!note]- Extra\n> Folded by the author.\n\n> [!tip] Open\n> Not folded.\n\n> [!hint]-\n> A hint on its own, under no question.\n\n"+
   "> [!activity|b] B\n\n"+Q("q2")+"> [!hint]-\n> Only a hint.\n\n> [!tip] Open\n> Not folded.\n";
 A.loadText(T);draw("a");
 chk("a screen with a callout the author folded has one switch, Open all, off",switches().length===1&&texts(switches()[0])==="Open all"&&switches()[0].attrs["aria-checked"]==="false");
 chk("it governs that callout and nothing else: not the hint, not the solution, not a hint under no question, not the open callout",auFolds().length===1&&/Extra/.test(texts(auFolds()[0]))&&!isOpen(auFolds()[0]),String(auFolds().length));
 switches()[0]._on.click({target:switches()[0]});
 chk("pressed, it is on, and kept as the booklet's preference (booklet.ui.folds.)",switches()[0].attrs["aria-checked"]==="true"&&LS[A.FOLD_KEY+A.currentId]==="open",JSON.stringify(LS[A.FOLD_KEY+A.currentId]));
 draw("a");
 const details=find(P.main(),n=>n.tagName==="details"),own=details.filter(hasClass("card-compact"));
 chk("drawn again, the author's callout is open and every hint and solution is as it was, shut",auFolds().length===1&&isOpen(auFolds()[0])&&own.length===3&&own.every(d=>!isOpen(d)),JSON.stringify(details.map(d=>[d.attrs.class,isOpen(d)])));
 draw("b");
 chk("a screen whose only fold is a question's own hint has no switch",switches().length===0&&auFolds().length===0);
 draw("a");switches()[0]._on.click({target:switches()[0]});draw("a");
 chk("pressed again, the callout is folded as written",LS[A.FOLD_KEY+A.currentId]==="folded"&&!isOpen(auFolds()[0]));}
{A.loadText(FM+"> [!module|m] M\n\n> [!note]- About this\n> Folded opening.\n\n> [!activity|a] A\n\nWords.\n\n> [!activity|b] B\n\nMore.\n\n> [!module|m end] End\n");
 draw(A.moduleScreen("m"));
 chk("a module's screen has no switch, though its opening holds a folded callout",switches().length===0);
 A.loadText(FM+"> [!module|m] M\n\n> [!note]- About this\n> Folded opening.\n\n> [!activity|a] A\n\nWords.\n\n> [!module|m end] End\n");
 draw("m/a");
 chk("a module of one activity draws its opening with the activity: the switch governs the opening's folded callout",switches().length===1&&auFolds().length===1);}

/* 3. a hint or solution is a compact fold, and never a teaser */
{A.loadText(FM+"> [!activity|a] A\n\n"+Q("q1")+"> [!hint]-\n> SECRET-HINT words\n\n> [!solution]-\n> SECRET-SOL words\n\n> [!group]- Extra\n> Some group words.\n");
 draw("a");
 const folds=find(P.main(),n=>n.tagName==="details");
 const compact=folds.filter(hasClass("card-compact"));
 chk("the hint and the solution are compact; the group is not",compact.length===2&&folds.length===3);
 chk("a compact fold shows no teaser and no words while shut",compact.every(d=>find(d,hasClass("d")).length===0)&&compact.every(d=>!texts(find(d,n=>n.tagName==="summary")[0]).includes("SECRET")));
 chk("it is still drawn by cardNode (a fold card)",compact.every(d=>hasClass("card")(d)&&hasClass("card-fold")(d)));
 const c=A.cardNode({mode:"fold",title:"T",size:"compact",body:[]});
 chk("cardNode takes a size option",hasClass("card-compact")(c)&&!hasClass("card-compact")(A.cardNode({mode:"fold",title:"T",body:[]})));}

/* 4. short options */
chk("at most four options, each at most 24 characters",A.shortOptions(["Yes","No"])&&A.shortOptions(["a","b","c","d"])&&!A.shortOptions(["a","b","c","d","e"])&&!A.shortOptions(["x".repeat(25)])&&A.shortOptions(["x".repeat(24)])&&!A.shortOptions([]));

/* 5. one at a time: the steps are the groups (`[!group]` callouts) of the part on show */
{const mk=(type,id,extra={})=>({type,id,keys:[id],...extra});
 const md=t=>({type:"markdown",id:"m"+t,text:t});
 const grp=(id,...blocks)=>({type:"callout",kind:"group",id,blocks});
 const u=A.stepUnits([md("lead"),grp("g1",mk("choice","q1")),md("between"),mk("text","loose"),grp("g2",mk("choice","q2"),mk("text","q3")),grp("g3",md("read")),md("tail")]);
 chk("three groups make three steps, each with its group",u.length===3&&u.map(x=>x.group.id).join()==="g1,g2,g3",JSON.stringify(u.map(x=>x.blocks.map(b=>b.id))));
 chk("what comes before the first group is no step (it is the opening); what comes between two groups goes with the one after, a question outside a group too; the last with the last",
   u.map(x=>x.blocks.map(b=>b.id).join("+")).join()==="g1,mbetween+loose+g2,g3+mtail",JSON.stringify(u.map(x=>x.blocks.map(b=>b.id))));
 chk("questions outside every group make no steps, however many",A.stepUnits([mk("choice","q1"),mk("choice","q2"),mk("text","q3"),mk("text","q4")]).length===0);
 chk("one group offers no stepper (the part needs two)",A.stepUnits([md("lead"),grp("g1",mk("text","a"),mk("text","b"),mk("text","c"))]).length===0);
 chk("a group inside a row is no step of the part",A.stepUnits([{type:"row",id:"r",blocks:[{type:"cell",id:"c",blocks:[grp("a"),grp("b")]}]}]).length===0);
 chk("any other callout is no step",A.stepUnits([{type:"callout",kind:"note",id:"n1",blocks:[]},{type:"callout",kind:"tip",id:"n2",blocks:[]}]).length===0);}

/* 5b. a group in an activity holds blocks: its body, one `>` less, is read as the file is (SPEC.md section 6), so a
   question in it is written with a second `>` and its options with one; its ids are the module's like any other; a line
   that makes structure is said and left out; a `***` in it is a rule; the group in a module's opening stays words */
{const T=FM+"> [!module|m] M\n\n> [!group] About\n> > [!text|x] Q in the opening?\n\n> [!activity|log repeat] Log\n\n> [!text|what] What?\n\n"+
   "> [!activity|a] A\n\n> [!text|out] Outside?\n\n"+
   "> [!group]- Folded\n> Words with a note.[^n]\n>\n> [^n]: The note.\n>\n> > [!choice|g1] Pick?\n> - [ ] Alpha\n> - [ ] Beta\n>\n> > [!hint]-\n> > A hint.\n>\n> ***\n>\n> > [!tab] Nope\n>\n> > [!text|g2] Why?\n\n"+
   "> [!group] Kept\n> ```booklet query\n> from: log\n> ```\n\n> [!module|m end] E\n";
 const R=A.parseFile(T),said=R.unread.map(String);
 chk("(the file opens; one thing said: the tab line in the group, at its own line)",R.ok&&R.refused.length===0&&said.length===1&&/^line 35: a tab line cannot go inside a group/.test(said[0]),JSON.stringify([said,R.refused.map(String)]));
 A.loadText(T);
 const a=A.activityOf("m/a"),g=a.pages[0].blocks[1],ids=b=>b.blocks.map(x=>x.type+(x.id&&!/^(md|c)\d/.test(x.id)?":"+x.id:"")).join();
 chk("the group holds its words, the choice with its two options and its hint, a rule, and the question after; no tab",
   a.pages.length===1&&ids(g)==="markdown,choice:g1,markdown,text:g2"&&JSON.stringify(g.blocks[1].options)==='["Alpha","Beta"]'&&!!g.blocks[1].hint&&/A hint/.test(JSON.stringify(g.blocks[1].hint))&&g.blocks[2].text==="***"&&!(a.tabs&&a.tabs.length),
   JSON.stringify(g.blocks).slice(0,600));
 chk("the group in the module's opening keeps its body as words: no question is read there",A.allModules()[0].opening[0].blocks.length===1&&A.allModules()[0].opening[0].blocks[0].type==="markdown"&&!/"x"/.test(JSON.stringify(A.allModules()[0].activities.map(v=>v.pages))));
 const dup=A.parseFile(T.replace("[!text|g2]","[!text|out]"));
 chk("a question in a group with an id already used outside it is refused, as two of one id anywhere are",!dup.ok&&dup.refused.map(String).some(s=>/the id “out” is used twice/.test(s)),JSON.stringify(dup.refused.map(String)));
 const dupm=A.parseFile(T.replace("[!text|g2]","[!text|what]"));
 chk("...and the ids are the module's: one used in another activity of the module clashes too",!dupm.ok&&dupm.refused.map(String).some(s=>/the id “what” is used twice/.test(s)),JSON.stringify(dupm.refused.map(String)));
 global.__ls[A.OAT_KEY+A.currentId]="all";draw("m/a");
 let fold=auFolds()[0];
 chk("all at once, the folded group is a fold, closed, its questions live in it",!!fold&&!isOpen(fold)&&find(fold,n=>n.tagName==="textarea").length===1&&/Pick\?/.test(texts(fold)));
 A.answersFor("m/a").g1=1;draw("m/a");fold=auFolds()[0];
 chk("...drawn open once a question in it holds an answer (a pick is a number), as any fold holding an answer is",!!fold&&isOpen(fold));
 A.answersFor("m/a").g2="my words";
 chk("its footnote is the activity's: drawn as a mark with its note, not as raw text",!!fold&&find(fold,hasClass("rd-mark")).length===1&&!/\[\^n\]/.test(texts(P.main())),texts(fold).slice(0,200));
 chk("the query view in the other group is drawn as a view, not as code",find(P.main(),hasClass("query")).length===1&&find(P.main(),n=>n.tagName==="pre").length===0);
 const open=find(P.main(),n=>hasClass("rd-callout")(n)&&/Kept/.test(texts(n)))[0];
 chk("an open group is drawn plain under its title, a group to a screen reader: no kind's word or colour (not a note)",!!open&&open.attrs.role==="group"&&find(open,hasClass("rd-cl")).length===0&&!/rd-hued/.test(open.attrs.class||""),open&&JSON.stringify(open.attrs));
 const p=A.activityProgress(a),md=A.toMarkdown();
 chk("answers inside a folded group are kept and counted, and saved in the records like any",p.total===3&&p.answered===2&&/"g1": ?1/.test(md)&&/"g2": ?"my words"/.test(md),JSON.stringify(p)+" "+md.slice(-300));
 delete global.__ls[A.OAT_KEY+A.currentId];}

/* 6. every word of the steps, the pager and the fold switch exists in en, fr, es (the tables themselves: a missing
   key must not hide behind the English that fr and es inherit) and es-AR (which inherits es) */
{const want={cards:["questionsN"],steps:["label","one","all","progress","back","next"],fold:["openAll"],pages:["back","next","of"]};
 const has=(o,k)=>o&&o[k]!=null&&!(typeof o[k]==="string"&&!o[k].trim());
 const missIn=t=>Object.entries(want).flatMap(([g,ks])=>ks.filter(k=>!has(t&&t[g],k)).map(k=>g+"."+k));
 for(const lang of ["en","fr","es"]){const miss=missIn(A.STRINGS_SRC[lang]);chk("the words are written in the "+lang+" table itself",miss.length===0,miss.join());}
 for(const lang of ["en","fr","es","es-AR"]){const S=A.STRINGS[lang],miss=missIn(S);
   chk("the words resolve in "+lang,miss.length===0,miss.join());
   chk("the counting words in "+lang+" take numbers",/2/.test(S.cards.questionsN(2))&&/2/.test(S.steps.progress(2,5))&&/5/.test(S.steps.progress(2,5))&&/2/.test(S.pages.of(2,3))&&/3/.test(S.pages.of(2,3)));}
 chk("es-AR holds none of these words itself and gets es's",!A.STRINGS_SRC["es-AR"].steps&&!A.STRINGS_SRC["es-AR"].pages&&A.STRINGS["es-AR"].steps.one===A.STRINGS.es.steps.one&&A.STRINGS["es-AR"].pages.of(1,2)===A.STRINGS.es.pages.of(1,2));
 chk("fr and es are not the English words",["fr","es"].every(l=>A.STRINGS[l].steps.one!==A.STRINGS.en.steps.one&&A.STRINGS[l].fold.openAll!==A.STRINGS.en.fold.openAll&&A.STRINGS[l].pages.of(1,2)!==A.STRINGS.en.pages.of(1,2)));
 chk("no l10n: draft mark is left on the stepper words",!/steps: \{ \/\* l10n: draft/.test(P.html));}

/* 7. the preferences live in booklet.ui.* only */
chk("the one-at-a-time choice is kept under booklet.ui.steps., the fold switch's under booklet.ui.folds.",A.OAT_KEY==="booklet.ui.steps."&&A.FOLD_KEY==="booklet.ui.folds.");
console.log(fails?fails+" folding checks failed":"all folding checks passed");
P.closePages();process.exit(fails?1:0);
