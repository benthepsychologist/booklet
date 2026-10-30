// Renderer 0.13.1, consolidations (item v013-renderer-consolidations, review D19): each thing the renderer knows lives in one
// shape and is worked out in one place.
//   R7. A module always has `activities` and an activity always has `pages`; the booklet's name is `title` alone. A design an
//       older release kept (a snapshot's TPL: `mode`, `blocks`, `head`) is read into that shape where it is read.
//   R5. A folded hint or solution straight after a question is the question's own (`hint`, `solution`), drawn in it; any other
//       hint or solution is a callout of its kind where it stands; the question's help text is `help`. No id is read for it.
//   R6. Citations are numbered once per booklet, a pure function of the design (citeScope, one per screen); a draw only reads
//       the numbers, keeping its own marks.
//   R9. One copy of each small job. Two copies had drifted: Remove and Update a module now find a module's fence as Add does,
//       outside code fences; and an activity's headings are read outside code fences, as its links find them (a page has
//       no name since 0.15: pages are pagination).
//       One rule (hostCovers) with three answers, saved, saving and unsaved: leaving the page warns unless saved, and the
//       bar's save status reads it (since v0.13 item 13, in place of the Download button's mark and the note).
//   R14. The parser dispatches on two tables (fence kinds, line kinds); the view pipeline calls VIEW_FNS[as] and nothing else,
//       each view drawing its own groups and a nested list's tree.
// Run: node test/consolidate.test.js   (node only; nothing to install)
const P=require("./page.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const json=JSON.stringify;
const FM=(t,x)=>`---\nbooklet: "0.17"\ntitle: ${t}\nlang: en\n${x||""}---\n\n`;
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
 chk("a page has no name, of one page or of several (pages are pagination)",acts.find(a=>a.id==="two/b").pages.length===2&&acts.every(a=>a.pages.every(p=>!("title" in p))),json(acts.find(a=>a.id==="two/b").pages));
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


/* ---- R5: reading order around a question's own hint and solution (the cold review's S1, S2) ---- */
{P.wipe();const A=P.boot();const N='\n[^a]: A note.\n[^b]: B note.\n[^c]: C note.\n';
 A.loadText(FM("Order")+"> [!activity|a] A\n\n> [!text|q] Q?\n\n> [!hint]- H1\n> See[^a]\n\n> [!hint] H2\n> See[^b]\n\n> [!solution]- S\n> See[^c]\n"+N);
 A.screen="a";A.render();
 const marks=P.find(P.main(),P.hasClass("rd-mark")).map(n=>n.attrs["data-cite"]+"="+P.texts(n)).join(" ");
 chk("marks are numbered in reading order: the folded hint and solution inside the question first, the unfolded hint after",marks==="a=1 c=2 b=3",marks);
 const R=A.parseFile(FM("Gone")+"> [!activity|a] A\n\n> [!choice|q menu:none] Q?\n\n> [!hint]- H1\n> x\n\n> [!hint] H2\n> y\n\n> [!solution]- S\n> z\n");
 const list=R.template.modules[0].activities[0].pages[0].blocks.map(b=>b.title).join(",");
 chk("a question that is not drawn leaves its own hint and solution where it stood, ahead of an unfolded hint",list==="H1,S,H2",list);
 const R2=A.parseFile(FM("Row")+"> [!activity|a] A\n\n> [!row]\n\n> [!text|q1] Q1?\n\n> [!text|my-hint] Q2?\n\n> [!row|end]\n");
 const cells=R2.template.modules[0].activities[0].pages[0].blocks[0].blocks.map(c=>c.blocks.map(b=>b.id).join("+")).join(" | ");
 chk("in a row with no headings, a question whose id ends in -hint has a cell of its own",cells==="q1 | my-hint",cells);}

/* ---- R5: an older release's hints and solutions, read where its design is read ---- */
{P.wipe();let A=P.boot();A.createBooklet();
 const then=FM("Kept by 0.13.0")+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|long seen] Seen?\n\n> [!text|long heard] Heard?\n\n> [!module|m end] End\n";
 const md=(id,t)=>({id,type:"markdown",text:t});
 const TPL={booklet:"0.13",id:"k",version:"",title:"Kept",head:{title:"Kept"},modules:[{id:"m",version:"",title:"M",mode:{id:"m/a",kind:"board",title:"A",blocks:[
   {id:"q1",type:"text",label:"Seen?",hint:"Help words.",keys:["q1"]},
   {id:"q1-hint",type:"callout",kind:"",title:"Nudge",blocks:[md("q1-hint-md","Think.")],placement:"folded",label:"Nudge"},
   {id:"q1-solution",type:"callout",kind:"",title:"Why",blocks:[md("q1-solution-md","SECRET-WHY")],placement:"folded",label:"Why"},
   {id:"q2",type:"text",label:"Heard?",keys:["q2"],hint:{text:"not a string"}},
   {id:"q2-hint",type:"callout",kind:"",title:"Open",blocks:[md("q2-hint-md","Not folded.")],label:"Open"}]}}],widgets:[],raw:{source:then,lang:"en"}};
 const id=A.currentId,key="booklet.b."+id;A.flushSave();
 const o=JSON.parse(LS[key]);delete o.text;o.TPL=TPL;LS[key]=json(o);
 P.closePages();A=P.boot();A.openBooklet(id);
 const b=A.allModules()[0].activities[0].pages[0].blocks;
 chk("0.13.0's hint and solution (callouts of no kind, by id) are the question's own, its help text is `help`",b.length===3&&b[0].help==="Help words."&&b[0].hint.kind==="hint"&&b[0].solution.kind==="solution",json(b).slice(0,300));
 chk("one it drew where it stood stays there, a callout of its kind",b[2].type==="callout"&&b[2].kind==="hint"&&b[2].outside===true,json(b[2]));
 chk("a hint on an old question that is not a string was never drawn, and is not taken for its own",!("hint" in b[1])&&b[1].help===undefined,json(b[1]));
 A.screen="m/a";A.render();
 const ctl=P.find(P.main(),P.hasClass("q-ctls"));
 chk("and they are drawn in their question, closed, giving nothing away",ctl.length===1&&/Nudge/.test(P.texts(ctl[0]))&&!/SECRET-WHY/.test(P.texts(P.find(ctl[0],n=>n.tagName==="summary")[1]||{})),ctl.map(P.texts).join());}

/* ---- R6: citations numbered once, from the design ---- */
{P.wipe();const A=P.boot();
 const N='\n[^s1]: *Atlas*, p. 1: "One."\n[^s2]: *Atlas*, p. 2: "Two."\n[^s3]: *Atlas*, p. 3: "Three."\n';
 A.loadText(FM("Cites")+"> [!module|one] One\n\nThe opening.[^s2]\n\n> [!activity|a] A\n\nFirst.[^s1] Again.[^s2]\n\n---\n\nPage two.[^s3]\n"+N+"\n> [!module|one end] End\n\n"+
   "> [!module|many] Many\n\nIts opening.[^s3][^s1]\n\n> [!activity|b] B\n\nB says.[^s1]\n\n> [!activity|c] C\n\nC says.[^s2]\n"+N+"\n> [!module|many end] End\n");
 const nums=v=>{const R=A.citeScope(v);return R?[...R.nums].map(([k,n])=>k+"="+n).join():null;};
 chk("a module that is one activity numbers its opening first, then every page in order",nums("one/a")==="s2=1,s1=2,s3=3",nums("one/a"));
 chk("a module's own screen numbers its opening on its own; its activities do not count it",nums("module:many")==="s3=1,s1=2"&&nums("many/b")==="s1=1"&&nums("many/c")==="s2=1",[nums("module:many"),nums("many/b"),nums("many/c")].join(" | "));
 chk("a screen that draws no marks has no numbering",nums("@home")===null&&nums("@booklets")===null);
 const R=A.citeScope("one/a");
 chk("the numbering is worked out once for the booklet: the same each time it is asked",A.citeScope("one/a")===R&&Object.keys(R).sort().join()==="cites,mod,nums,screen,sources",Object.keys(R).join());
 A.screen="one/a";const d1=A.render(),d2=A.render();
 chk("a draw reads it, with marks of its own; nothing else about citations is in the draw",d1.cite.nums===R.nums&&d2.cite.nums===R.nums&&d1.cite.drawn!==d2.cite.drawn&&!("opening" in d1)&&!("cites" in d1),Object.keys(d1).join());
 const marks=P.find(P.main(),P.hasClass("rd-mark")).map(P.texts).join();
 chk("and draws the numbers: the opening, then the page on show",marks==="1,2,1",marks);}

/* ---- R9: a module's fence, found outside code fences by Remove and Update as by Add ---- */
{P.wipe();const A=P.boot();A.createBooklet();
 const FENCE="```";
 const guide=FM("Guide")+"> [!module|guide] Guide\n\n> [!activity|how] How\n\nA module is written like this:\n\n"+FENCE+"markdown\n> [!module|tides] Tides\n\n> [!module|tides end] End\n"+FENCE+"\n\n> [!module|guide end] End\n";
 const tides=FM("Tides")+"> [!module|tides] Tides\n\n> [!activity|t] T\n\nWords.\n\n> [!module|tides end] End\n";
 chk("set up: a guide whose prose shows a module line in a code block, and the module itself",A.addModuleText(guide).ok&&A.addModuleText(tides).ok&&A.allModules().map(m=>m.id).join()==="guide,tides");
 const src=A.BOOK.raw.source,example=src.slice(src.indexOf(FENCE+"markdown"),src.indexOf(FENCE+"\n\n> [!module|guide end]"));
 const r=A.removeModule("tides");
 chk("Remove takes out the module, not the lines in the code block that look like it",r.ok&&A.allModules().map(m=>m.id).join()==="guide"&&A.BOOK.raw.source.includes(example),json(r)+" "+A.BOOK.raw.source.slice(0,400));
 A.addModuleText(tides);
 const upd=A.addModuleText(tides.replace("Words.","New words."));
 chk("an Update replaces the module where it sits, and leaves the code block as it was",upd.ok&&A.BOOK.raw.source.includes(example)&&/New words\./.test(A.BOOK.raw.source)&&!/\nWords\./.test(A.BOOK.raw.source),json(upd));}

/* ---- R9: an activity's headings are read outside code fences ---- */
{P.wipe();const A=P.boot();const FENCE="```";
 const R=A.parseFile(FM("Pages")+"> [!activity|a] A\n\n"+FENCE+"sh\n# a comment in a script\n"+FENCE+"\n\n## The first page\n\nWords.\n\n---\n\n## The second page\n\nMore.\n");
 const ps=R.template.modules[0].activities[0].pages;
 const hs=A.activityHeadings(R.template.modules[0].activities[0]).map(h=>h.text+"@"+h.page).join("|");
 chk("a heading-like line in a code block is no heading; the headings of each page are, on their pages, as its links find them",ps.length===2&&hs==="A@p1|The first page@p1|The second page@p2",hs);}

/* ---- R9: hostCovers is saved, saving or unsaved; leaving warns unless saved, and the bar's save status says the same ----
   (item 13: the status replaced the Download button's mark and the "not yet downloaded" note; test/autosave.test.js has
   the rest of it) */
(async()=>{const T=FM("Hosted")+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n";
 const sleep=ms=>new Promise(z=>setTimeout(z,ms));
 const rig=A=>{const r={leave:()=>{let warned=false;A.dispatch("beforeunload",{preventDefault(){warned=true;},returnValue:""});return warned;},
   shown:()=>P.byId("saveBtn").attrs["data-state"]};
   r.type=w=>{A.screen="m/a";A.render();const ta=P.find(P.main(),n=>n.tagName==="textarea")[0];ta.value=w;ta._on.input();};return r;};
 P.wipe();P.place("http:","fleet");LS["booklet.host.allowed"]="h";const A=P.boot(),B=A.BookletApi,h=B.host({label:"h"});
 const calls=[];const stop=B.onChange(x=>calls.push(x));
 B.open(T,{name:"hosted.booklet.md"});await sleep(50);h.saved(calls[calls.length-1]);const r=rig(A);r.type("an answer");
 chk("set up: a host that listens, and a change it has not answered (Saving…)",A.HOST.status==="saving"&&A.dirty,A.HOST&&A.HOST.status);
 chk("a change not yet sent is saving: leaving warns, and the bar says Saving",A.hostCovers()==="saving"&&r.leave()&&A.saveState()==="saving"&&r.shown()==="saving",A.hostCovers()+" "+r.shown());
 h.saved();
 chk("a saved() before that change is even sent is not about it: still saving",A.hostCovers()==="saving"&&r.leave()&&r.shown()==="saving",A.hostCovers()+" "+r.shown());
 await sleep(300);h.saved(calls[calls.length-1]);
 chk("once the host says saved for the change sent, saved: no warning, and the bar says Saved",A.hostCovers()==="saved"&&!r.leave()&&r.shown()==="saved"&&/an answer/.test(calls[calls.length-1].text),A.hostCovers()+" "+r.shown());
 r.type("a newer answer");
 chk("a newer change after saved is saving again: leaving warns",A.hostCovers()==="saving"&&r.leave()&&r.shown()==="saving",A.hostCovers()+" "+r.shown());
 await sleep(700);
 chk("a host that has not answered stays saving (it has been told: onChange gave it the newer answer), and leaving warns",calls.some(c=>/a newer answer/.test(c.text))&&A.hostCovers()==="saving"&&r.leave()&&r.shown()==="saving",calls.length+" "+A.hostCovers());
 A.setAnswerMs(50);r.type("another answer");await sleep(800);
 chk("one that does not answer within its time is a failed save, unsaved: leaving warns, and the bar says Unsaved",A.hostCovers()==="unsaved"&&r.leave()&&r.shown()==="unsaved",A.hostCovers()+" "+r.shown());
 A.setAnswerMs(20000);h.saved();
 h.failed("disk full");
 chk("after a failed save, unsaved: leaving warns, and the bar says Unsaved",A.hostCovers()==="unsaved"&&r.leave()&&r.shown()==="unsaved",A.hostCovers()+" "+r.shown());
 h.saved();stop();
 chk("a host that no longer listens covers nothing, unsaved: leaving warns, and the bar says Unsaved",A.hostCovers()==="unsaved"&&r.leave()&&r.shown()==="unsaved",A.hostCovers()+" "+r.shown());
 P.closePages();delete global.location;
 P.wipe();const N=P.boot();N.loadText(T);const n=rig(N);
 chk("with no host, a booklet just read from its file is saved, and leaving does not warn",N.saveState()==="saved"&&!n.leave()&&n.shown()==="saved",N.saveState());
 n.type("an answer");
 chk("with no host, a change is unsaved, as before: leaving warns, and the bar says Unsaved",N.hostCovers()==="unsaved"&&n.leave()&&n.shown()==="unsaved",N.hostCovers()+" "+n.shown());

REST();})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
function REST(){

/* ---- R14: every view through VIEW_FNS, grouped and nested alike ---- */
{P.wipe();const A=P.boot();
 const rows=[{id:"a",name:"Alpha",kind:"x",n:1},{id:"b",name:"Beta",kind:"y",n:2,parent:"a"},{id:"c",name:"Gamma",kind:"x",n:3}];
 const set=A.dataSet({rows}),seen=[];
 for(const as of ["table","list","tiles","cards","bars","line"]){const f=A.VIEW_FNS[as];
   A.VIEW_FNS[as]=(...x)=>{seen.push(as+(x[1].some(g=>g.name!==null)?":grouped":"")+(x[4]&&x[4].tree?":tree":""));return f(...x);};}
 [["list",{}],["list",{group:"kind",parent:"none"}],["tiles",{group:"kind"}],["cards",{group:"kind",label:"name"}],["table",{group:"kind"}],["bars",{label:"name",value:"n"}],["line",{label:"name",value:"n"}]]
   .forEach(([as,v])=>A.viewNodes(set,{as,...v},{}));
 chk("the pipeline draws every view by VIEW_FNS[as]: a nested list, a grouped list, grouped tiles and cards, a table and the charts",
   json(seen)===json(["list:tree","list:grouped","tiles:grouped","cards:grouped","table:grouped","bars","line"]),json(seen));
 const n=A.viewNodes(set,{as:"tiles",group:"kind"},{});
 chk("and a view draws its groups' headings itself",P.find(n[0],P.hasClass("dv-group")).map(P.texts).join("|")==="x 2 rows|y 1 row",P.find(n[0],P.hasClass("dv-group")).map(P.texts).join("|"));}

P.wipe();
console.log(fails?`\n${fails} FAILURES`:"\nconsolidation checks passed");
process.exit(fails?1:0);
}
