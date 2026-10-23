// Folding and reading aids (renderer 0.11.10, C2; 0.15): the renderer folds nothing on its own; the fold switch shows only
// on a screen with callouts the author folded, and opens or folds exactly those, never a question's hint or solution; the
// compact hint fold; which options are short enough to sit beside their question; which pages offer one at a time; and the
// words in four languages. The drawn geometry, clicking and print are test/tabs-browser.js. Run: node test/folding.test.js
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const {find,hasClass,texts}=P;
const FM='---\nbooklet: "0.13"\nid: local/fold\ntitle: "Fold"\nlang: en\n---\n\n';
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

/* 5. one at a time: units */
{const mk=(type,id,extra={})=>({type,id,keys:[id],...extra});
 const md=t=>({type:"markdown",id:"m"+t,text:t});
 /* a hint drawn where it stands (one not folded) goes with the question above it; a question's own hint is on it */
 const hint={type:"callout",kind:"hint",outside:true,id:"q1-hint",blocks:[md("h")]};
 const u=A.stepUnits([md("lead"),mk("choice","q1"),hint,md("between"),mk("choice","q2"),mk("text","q3"),md("tail")]);
 chk("three questions make three steps",u.length===3);
 chk("prose goes with the question after it; a hint goes with its question; the last prose with the last question",
   u[0].blocks.length===3&&u[0].blocks[0].id==="mlead"&&u[1].blocks.length===2&&u[1].blocks[0].id==="mbetween"&&u[2].blocks.length===2&&u[2].blocks[1].id==="mtail",JSON.stringify(u.map(x=>x.blocks.map(b=>b.id))));
 chk("two questions offer no stepper",A.stepUnits([mk("choice","q1"),mk("choice","q2")]).length===0);
 chk("a row of three questions is one step, and one step offers no stepper (the page needs two)",A.stepUnits([{type:"row",id:"r",blocks:[{type:"cell",id:"c",blocks:[mk("text","a"),mk("text","b"),mk("text","c")]}]}]).length===1);}

/* 6. every word of the steps, the pager, the frame and the fold switch exists in en, fr, es (the tables themselves: a missing
   key must not hide behind the English that fr and es inherit) and es-AR (which inherits es) */
{const want={cards:["questionsN"],steps:["label","one","all","progress","back","next"],fold:["openAll"],pages:["back","next","of"],frame:["more","less"]};
 const has=(o,k)=>o&&o[k]!=null&&!(typeof o[k]==="string"&&!o[k].trim());
 const missIn=t=>Object.entries(want).flatMap(([g,ks])=>ks.filter(k=>!has(t&&t[g],k)).map(k=>g+"."+k));
 for(const lang of ["en","fr","es"]){const miss=missIn(A.STRINGS_SRC[lang]);chk("the words are written in the "+lang+" table itself",miss.length===0,miss.join());}
 for(const lang of ["en","fr","es","es-AR"]){const S=A.STRINGS[lang],miss=missIn(S);
   chk("the words resolve in "+lang,miss.length===0,miss.join());
   chk("the counting words in "+lang+" take numbers",/2/.test(S.cards.questionsN(2))&&/2/.test(S.steps.progress(2,5))&&/5/.test(S.steps.progress(2,5))&&/2/.test(S.pages.of(2,3))&&/3/.test(S.pages.of(2,3)));}
 chk("es-AR holds none of these words itself and gets es's",!A.STRINGS_SRC["es-AR"].steps&&!A.STRINGS_SRC["es-AR"].pages&&A.STRINGS["es-AR"].steps.one===A.STRINGS.es.steps.one&&A.STRINGS["es-AR"].pages.of(1,2)===A.STRINGS.es.pages.of(1,2));
 chk("fr and es are not the English words",["fr","es"].every(l=>A.STRINGS[l].steps.one!==A.STRINGS.en.steps.one&&A.STRINGS[l].fold.openAll!==A.STRINGS.en.fold.openAll&&A.STRINGS[l].pages.of(1,2)!==A.STRINGS.en.pages.of(1,2)&&A.STRINGS[l].frame.more!==A.STRINGS.en.frame.more));
 chk("no l10n: draft mark is left on the stepper words",!/steps: \{ \/\* l10n: draft/.test(P.html));}

/* 7. the preferences live in booklet.ui.* only */
chk("the one-at-a-time choice is kept under booklet.ui.steps., the fold switch's under booklet.ui.folds.",A.OAT_KEY==="booklet.ui.steps."&&A.FOLD_KEY==="booklet.ui.folds.");
console.log(fails?fails+" folding checks failed":"all folding checks passed");
P.closePages();process.exit(fails?1:0);
