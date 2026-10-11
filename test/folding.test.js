// Folding and reading aids (renderer 0.11.10, C2): which pages fold, the section status line, the compact hint fold, which options are
// short enough to sit beside their question, which pages offer one at a time, and every new interface word in four languages.
// The drawn geometry, clicking, print and reload are test/folding-browser.js. Run: node test/folding.test.js
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const {find,hasClass,texts}=P;
const FM='---\nbooklet: "0.11"\nid: local/fold\ntitle: "Fold"\nlang: en\n---\n\n';
const A=P.boot();
const Q=(id,n=2)=>`> [!choice|${id}] Question ${id}?\n- [ ] A\n- [ ] B\n\n`;
const draw=id=>{A.screen=id;A.render();return P.main();};
const secs=()=>find(P.main(),hasClass("rm-sec"));
const status=d=>{const c=find(d,hasClass("c"))[0];return c?texts(c):"";};

/* 1. foldable: two or more same-level headings, whatever else the page holds */
A.loadText(FM+"> [!activity|a] A\n\n## One\n\nx\n\n"+Q("q1")+"## Two\n\ny\n");
chk("a page with questions and two headings is foldable",A.foldable(A.activityOf("a")));
A.loadText(FM+"> [!activity|a] A\n\n## One\n\nx\n\n"+Q("q1"));
chk("one heading is not enough",!A.foldable(A.activityOf("a")));
A.loadText(FM+"> [!activity|a] A\n\n# Title\n\n## One\n\nx\n\n## Two\n\ny\n");
chk("a title heading alone above the others does not count",A.foldable(A.activityOf("a")));
A.loadText(FM+"> [!activity|a] A\n\n```\n## not\n## headings\n```\n\ntext\n");
chk("headings inside a code fence do not count",!A.foldable(A.activityOf("a")));

/* 2. the section status line and the first section to answer is open */
A.loadText(FM+"> [!activity|a] A\n\n## One\n\nx\n\n"+Q("q1")+Q("q2")+"## Two\n\ny\n\n## Three\n\n"+Q("q3"));
draw("a");
{const s=secs();
 chk("three sections",s.length===3);
 chk("a section with two questions says so; one with none says nothing",status(s[0])==="2 questions"&&status(s[1])===""&&status(s[2])==="1 question",JSON.stringify(s.map(status)));
 chk("the first section with an unanswered question is open, the others folded",s.map(d=>d.hasAttribute("open")).join()==="true,false,false",JSON.stringify(s.map(d=>d.hasAttribute("open"))));}
A.draftFor("a");A.answersFor("a").q1=1;A.answersFor("a").q2=2;A.RM_STATE&&Object.keys(A.RM_STATE).forEach(k=>delete A.RM_STATE[k]);
draw("a");
{const s=secs();
 chk("all answered: Done, and the first section with a question still to answer (the third) is the open one",status(s[0])==="Done"&&s.map(d=>d.hasAttribute("open")).join()==="false,false,true",JSON.stringify([s.map(status),s.map(d=>d.hasAttribute("open"))]));}
A.answersFor("a").q1=null;Object.keys(A.RM_STATE).forEach(k=>delete A.RM_STATE[k]);draw("a");
chk("one of two answered: the count and the answered count",status(secs()[0])==="2 questions · 1 answered",status(secs()[0]));

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
 const hint={type:"callout",kind:"",id:"q1-hint",blocks:[md("h")]};
 const u=A.stepUnits([md("lead"),mk("choice","q1"),hint,md("between"),mk("choice","q2"),mk("text","q3"),md("tail")]);
 chk("three questions make three steps",u.length===3);
 chk("prose goes with the question after it; a hint goes with its question; the last prose with the last question",
   u[0].blocks.length===3&&u[0].blocks[0].id==="mlead"&&u[1].blocks.length===2&&u[1].blocks[0].id==="mbetween"&&u[2].blocks.length===2&&u[2].blocks[1].id==="mtail",JSON.stringify(u.map(x=>x.blocks.map(b=>b.id))));
 chk("two questions offer no stepper",A.stepUnits([mk("choice","q1"),mk("choice","q2")]).length===0);
 chk("a row of three questions is one step, and one step offers no stepper (the page needs two)",A.stepUnits([{type:"row",id:"r",blocks:[{type:"cell",id:"c",blocks:[mk("text","a"),mk("text","b"),mk("text","c")]}]}]).length===1);}

/* 6. every new word exists in en, fr, es and es-AR */
{const cards=["questionsN","questionsAnswered"],steps=["label","one","all","progress","back","next","dots"];
 for(const lang of ["en","fr","es","es-AR"]){const c=A.STRINGS[lang].cards,s=A.STRINGS[lang].steps;
   const miss=[...cards.filter(k=>!c||c[k]==null),...steps.filter(k=>!s||s[k]==null||(typeof s[k]==="string"&&!s[k].trim())).map(k=>"steps."+k)];
   chk("the new words exist in "+lang,miss.length===0,miss.join());
   chk("the counting words in "+lang+" take numbers",/2/.test(c.questionsN(2))&&/1/.test(c.questionsAnswered(1,2))&&/2/.test(c.questionsAnswered(1,2))&&/2/.test(s.progress(2,5))&&/5/.test(s.progress(2,5)));}
 chk("fr and es are not the English words",A.STRINGS.fr.steps.one!==A.STRINGS.en.steps.one&&A.STRINGS.es.steps.one!==A.STRINGS.en.steps.one&&A.STRINGS.fr.steps.next!==A.STRINGS.en.steps.next);
 chk("the draft words are marked for the localisation pass",P.html.split("steps: { /* l10n: draft */").length===3);}

/* 7. the preference lives in booklet.ui.* only */
chk("the one-at-a-time choice is kept under booklet.ui.steps.",A.OAT_KEY==="booklet.ui.steps.");
console.log(fails?fails+" folding checks failed":"all folding checks passed");
P.closePages();process.exit(fails?1:0);
