// Renderer 0.13.1, consolidations (item v013-renderer-consolidations, review D19): each thing the renderer knows lives in one
// shape and is worked out in one place.
//   R7. A module always has `activities` and an activity always has `pages`; the booklet's name is `title` alone. A design an
//       older release kept (a snapshot's TPL: `mode`, `blocks`, `head`) is read into that shape where it is read.
//   R5. A folded hint or solution straight after a question is the question's own (`hint`, `solution`), drawn in it; any other
//       hint or solution is a callout of its kind where it stands; the question's help text is `help`. No id is read for it.
// Run: node test/consolidate.test.js   (node only; nothing to install)
const P=require("./page.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const json=JSON.stringify;
const FM=(t,x)=>`---\nbooklet: "0.13"\ntitle: ${t}\nlang: en\n${x||""}---\n\n`;
const LS=global.__ls;

/* ---- R7: one shape ---- */
{P.wipe();const A=P.boot();
 const R=A.parseFile(FM("Shapes")+"> [!module|one] One\n\n> [!activity|a] A\n\nWords.\n\n> [!module|one end] End\n\n"+
   "> [!module|two] Two\n\n> [!activity|b] B\n\nFirst page.\n\n---\n\n## Second\n\nMore.\n\n> [!activity|c] C\n\nWords.\n\n> [!module|two end] End\n\n"+
   "> [!activity|bare] Bare\n\nWords.\n");
 const T=R.template,mods=T.modules;
 chk("every module holds `activities`, one or several, and none holds `mode`",mods.length===3&&mods.every(m=>Array.isArray(m.activities)&&m.activities.length>0&&!("mode" in m))&&mods.map(m=>m.activities.length).join()==="1,2,1",json(mods.map(m=>Object.keys(m))));
 const acts=mods.flatMap(m=>m.activities);
 chk("every activity holds `pages`, and none holds `blocks`",acts.every(a=>Array.isArray(a.pages)&&a.pages.length>0&&!("blocks" in a)),json(acts.map(a=>Object.keys(a))));
 chk("a page of several is named by its first heading; a page of one has no name",acts.find(a=>a.id==="two/b").pages.map(p=>p.title).join("|")==="|Second"&&!("title" in acts.find(a=>a.id==="one/a").pages[0]),json(acts.find(a=>a.id==="two/b").pages));
 chk("the booklet's name is `title`, and there is no `head`",T.title==="Shapes"&&!("head" in T),json(Object.keys(T)));}

/* ---- R7: a design an older release kept, read into the one shape ---- */
{P.wipe();let A=P.boot();A.createBooklet();
 /* what 0.13.0 kept for a booklet whose text this release refuses (an id used twice): its parsed design, in 0.13.0's shape */
 const then=FM("Kept by 0.13.0")+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|long seen] What did you see?\n\n> [!text|long heard] What did you hear?\n\n> [!module|m end] End\n";
 const TPL={booklet:"0.13",id:"kept-by-0-13-0",version:"",title:"Kept by 0.13.0",head:{title:"Kept by 0.13.0"},customized:true,
   modules:[{id:"m",version:"",title:"M",mode:{id:"m/a",kind:"board",title:"A",blocks:[
     {id:"long",type:"text",label:"What did you see?",keys:["long"],rows:6},{id:"long",type:"text",label:"What did you hear?",keys:["long"],rows:6}]}}],
   widgets:[],raw:{source:then,lang:"en"}};
 const id=A.currentId,key="booklet.b."+id;A.flushSave();
 const o=JSON.parse(LS[key]);delete o.text;o.TPL=TPL;o.S={answers:{m:{long:"Both in one"}},entries:{}};LS[key]=json(o);
 P.closePages();A=P.boot();A.openBooklet(id);
 const m=A.allModules()[0];
 chk("an older release's design (`mode`, `blocks`, `head`) opens in the one shape",!!m&&Array.isArray(m.activities)&&m.activities[0].pages[0].blocks.length===2&&A.BOOK.title==="Kept by 0.13.0"&&!("head" in A.BOOK),json(A.BOOK).slice(0,300));
 A.screen="m/a";A.render();
 chk("and is drawn: its two questions, its answer shown",P.find(P.main(),n=>n.tagName==="textarea").map(n=>n.value).join("|")==="Both in one|Both in one");
 A.renameBooklet("Renamed");A.flushSave();
 const kept=JSON.parse(LS[key]).TPL;
 chk("renamed, the design it saves back is in the one shape, named by `title`",!!kept&&kept.title==="Renamed"&&!("head" in kept)&&Array.isArray(kept.modules[0].activities)&&!("mode" in kept.modules[0]),json(kept).slice(0,200));
 P.closePages();A=P.boot();A.openBooklet(id);
 chk("and opens again the same way",A.BOOK.title==="Renamed"&&A.allModules()[0].activities[0].pages[0].blocks.length===2);}

/* ---- R5: a question's own hint and solution ---- */
{P.wipe();const A=P.boot();
 const opts="- [ ] One\n- [x] Two\n";
 const R=A.parseFile(FM("Hints")+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!hint]- Before any question\n> Alone.\n\n"+
   "> [!choice|c1] Pick\n> Help words.\n"+opts+"\n> [!hint]- Nudge\n> Think.\n\n> [!solution]- Why\n> Because.\n\n> [!solution]- Again\n> A second one.\n\n"+
   "> [!text|t1] Say\n\n> [!hint] Open\n> Not folded.\n\n> [!choice|c2 menu:nowhere] Gone\n\n> [!hint]- Kept\n> Its question is not drawn.\n\n> [!module|m end] End\n");
 const list=R.template.modules[0].activities[0].pages[0].blocks,q=id=>list.find(b=>b.type!=="callout"&&b.id===id);
 chk("a folded hint and solution straight after a question are on it, as callouts of their kind",q("c1").hint.kind==="hint"&&q("c1").hint.title==="Nudge"&&q("c1").solution.kind==="solution"&&q("c1").solution.title==="Why",json(q("c1")).slice(0,300));
 chk("its help text is `help`",q("c1").help==="Help words.");
 const loose=list.filter(b=>b.type==="callout").map(b=>b.kind+":"+(b.title||"")+(b.outside?":outside":""));
 chk("any other stands where it is, a callout of its kind: one before any question; a second; one not folded; one whose question is not drawn",
   json(loose)===json(["hint:Before any question","solution:Again:outside","hint:Open:outside","hint:Kept:outside"]),json(loose));
 chk("no block's id carries a -hint or -solution",!/-(hint|solution)"/.test(json(R.template)));
 A.loadText(FM("Hints")+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!choice|c1] Pick\n"+opts+"\n> [!hint]- Nudge\n> Think.\n\n> [!solution]- Why\n> Because.\n\n> [!text|t1] Say\n\n> [!solution]- Model\n> Words.\n\n> [!module|m end] End\n");
 A.screen="m/a";A.render();
 const qs=P.find(P.main(),P.hasClass("q-ctls"));
 chk("each question draws its own controls inside it: a choice and a text question alike",qs.length===2&&/Nudge/.test(P.texts(qs[0]))&&/Why/.test(P.texts(qs[0]))&&/Model/.test(P.texts(qs[1])),qs.map(P.texts).join(" | "));
 chk("nothing is left where a solution stood",!P.find(P.main(),P.hasClass("sol-moved")).length);}

/* ---- R5: an older release's hints and solutions, read where its design is read ---- */
{P.wipe();let A=P.boot();A.createBooklet();
 const then=FM("Kept by 0.13.0")+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|long seen] Seen?\n\n> [!text|long heard] Heard?\n\n> [!module|m end] End\n";
 const md=(id,t)=>({id,type:"markdown",text:t});
 const TPL={booklet:"0.13",id:"k",version:"",title:"Kept",head:{title:"Kept"},modules:[{id:"m",version:"",title:"M",mode:{id:"m/a",kind:"board",title:"A",blocks:[
   {id:"q1",type:"text",label:"Seen?",hint:"Help words.",keys:["q1"]},
   {id:"q1-hint",type:"callout",kind:"",title:"Nudge",blocks:[md("q1-hint-md","Think.")],placement:"folded",label:"Nudge"},
   {id:"q1-solution",type:"callout",kind:"",title:"Why",blocks:[md("q1-solution-md","SECRET-WHY")],placement:"folded",label:"Why"},
   {id:"q2",type:"text",label:"Heard?",keys:["q2"]},
   {id:"q2-hint",type:"callout",kind:"",title:"Open",blocks:[md("q2-hint-md","Not folded.")],label:"Open"}]}}],widgets:[],raw:{source:then,lang:"en"}};
 const id=A.currentId,key="booklet.b."+id;A.flushSave();
 const o=JSON.parse(LS[key]);delete o.text;o.TPL=TPL;LS[key]=json(o);
 P.closePages();A=P.boot();A.openBooklet(id);
 const b=A.allModules()[0].activities[0].pages[0].blocks;
 chk("0.13.0's hint and solution (callouts of no kind, by id) are the question's own, its help text is `help`",b.length===3&&b[0].help==="Help words."&&b[0].hint.kind==="hint"&&b[0].solution.kind==="solution",json(b).slice(0,300));
 chk("one it drew where it stood stays there, a callout of its kind",b[2].type==="callout"&&b[2].kind==="hint"&&b[2].outside===true,json(b[2]));
 A.screen="m/a";A.render();
 const ctl=P.find(P.main(),P.hasClass("q-ctls"));
 chk("and they are drawn in their question, closed, giving nothing away",ctl.length===1&&/Nudge/.test(P.texts(ctl[0]))&&!/SECRET-WHY/.test(P.texts(P.find(ctl[0],n=>n.tagName==="summary")[1]||{})),ctl.map(P.texts).join());}

P.wipe();
console.log(fails?`\n${fails} FAILURES`:"\nconsolidation checks passed");
process.exit(fails?1:0);
