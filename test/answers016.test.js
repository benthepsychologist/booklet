// Format 0.16, lane "answers": a question asked for each pick (`each:`), an answer of the wrong shape, a follow-up's pairs in
// the views, and the reader's own options offered again (`earlier:`). SPEC.md sections 4, 5, 6 and 8.
// Run: node test/answers016.test.js   (node and python3; nothing to install.)
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const FM="---\nbooklet: \"0.15\"\ntitle: Answers\nlang: en\n---\n\n";
const T=P.texts,find=P.find;
const blocksIn=a=>a.pages.flatMap(p=>p.blocks);
/* each part runs on its own: a part that throws is one failure, and the parts after it still run */
const part=(name,f)=>{try{f();}catch(e){chk(name+": runs to its end",false,String(e&&e.stack||e).split("\n").slice(0,2).join(" "));}};
const pressable=n=>find(n,x=>x.tagName==="button"||x.tagName==="input"||x.tagName==="textarea"||x.tagName==="select");

/* ---- 1. the settings: `each:` and `earlier:` are read, and a bad one is said and taken off ---- */
part("the settings",()=>{const A=P.boot();
 const R=A.parseFile(FM+`> [!activity|log repeat] Log

> [!multi|tools open earlier:3] Which tools?
- [ ] Hammer
- [ ] Saw

> [!text|why each:tools] What was it for?

> [!choice|one open earlier:012] One
- [ ] A

> [!choice|bad open earlier:+3] Bad
- [ ] A

> [!lines|ls earlier:3.0] Lines
`);
 const bs=blocksIn(R.template.modules[0].activities[0]),q=id=>bs.find(b=>b.id===id);
 chk("`earlier:3` is read as the number 3, and `earlier:012` as 12",q("tools").earlier===3&&q("one").earlier===12,JSON.stringify([q("tools").earlier,q("one").earlier]));
 chk("`earlier:+3` and `earlier:3.0` are not whole numbers in digits: each is said and taken off",q("bad").earlier===undefined&&q("ls").earlier===undefined
   &&R.unread.filter(x=>/is not a whole number written in digits/.test(x)).length===2,R.unread.map(String).join(" | "));
 chk("`each:tools` names a multi in the same activity: it holds, and nothing is said",q("why").each==="tools"&&!R.unread.some(x=>/each/.test(x)),R.unread.map(String).join(" | "));});
part("each: problems",()=>{const A=P.boot();
 const R=A.parseFile(FM+`> [!activity|log repeat] Log

> [!multi|tools] Which tools?
- [ ] Hammer

> [!text|t1 each:] Names nothing

> [!text|t2 each:t2] Names itself

> [!text|t3 each:nowhere] Names no question

> [!text|t4 each:t1] Names a text question

> [!multi|t5 each:tools] A follow-up
- [ ] A

> [!text|t6 each:t5] Names a follow-up

> [!activity|other repeat] Other

> [!text|t7 each:tools] Names a multi in another activity
`);
 const bs=R.template.modules.flatMap(m=>m.activities).flatMap(blocksIn),q=id=>bs.find(b=>b.id===id),said=re=>R.unread.some(x=>re.test(x));
 chk("an `each:` that names nothing, itself, no question, a text question, a follow-up, or a question in another activity is taken off",
   ["t1","t2","t3","t4","t6","t7"].every(id=>q(id).each===undefined)&&q("t5").each==="tools",JSON.stringify(bs.map(b=>[b.id,b.each])));
 chk("and each is said among the file's problems",said(/“t1”.*names nothing/)&&said(/“t2”.*of itself/)&&said(/“t3”.*“nowhere”, which is no question/)
   &&said(/“t4”.*“t1”, a text question/)&&said(/“t6”.*“t5”, which is itself asked for each pick/)&&said(/“t7”.*“tools”, which is no question/),R.unread.map(String).join(" | "));});

/* ---- 2. `each:` is drawn as not yet supported, and its answer is kept through opening, saving and Finalize ---- */
const EACH=FM+`> [!module|fu] Follow-ups

> [!activity|log repeat] Log

> [!multi|tools open] Which tools did you use?
- [ ] Hammer
- [ ] Saw
- [ ] Drill

> [!text|why each:tools] What was it for?

> [!number|hours each:tools] How many hours?

> [!number|count] How many pieces?

> [!activity|look] Look

\`\`\`booklet query
from: log
as: table
\`\`\`

> [!activity|look-why] Look at why

\`\`\`booklet query
from: log
as: table
fields: why
\`\`\`

> [!activity|look-cards] Cards

\`\`\`booklet query
from: log
as: cards
\`\`\`

> [!module|fu end] End
`;
const PAIRS=[{pick:2,a:"cutting"},{pick:3,a:"holes"},{pick:1,a:"an old answer, its pick taken back"},{pick:"Glue gun",a:"sticking",note:"a key of its own"}];
part("each: kept",()=>{let A=P.boot();A.loadText(EACH);
 A.screen="fu/log";A.render();
 const box=find(P.main(),x=>/q-kept/.test((x.attrs||{}).class||"")&&/What was it for\?/.test(T(x)))[0];
 chk("a question with `each:` is drawn as its title and a line saying this page does not draw it yet",!!box&&/does not draw yet/.test(T(box)),T(P.main()).slice(0,400));
 chk("and with nothing to press",!!box&&pressable(box).length===0);
 const d=A.draftFor("fu/log");d.tools=[2,3,"Glue gun"];d.why=JSON.parse(JSON.stringify(PAIRS));
 const out=A.toMarkdown();
 chk("saving writes the pairs as they were",out.includes(JSON.stringify(PAIRS)),out.slice(-500));
 A=P.boot();A.loadText(out);
 chk("opening reads them back the same",JSON.stringify(A.draftFor("fu/log").why)===JSON.stringify(PAIRS),JSON.stringify(A.draftFor("fu/log").why));
 A.screen="fu/log";A.render();A.finalizeEntry("fu/log");
 const kept=A.keptFor("fu/log");
 chk("Finalize keeps them in the entry, the pair for a pick taken back and the key of its own too",kept.length===1&&JSON.stringify(kept[0].why)===JSON.stringify(PAIRS),JSON.stringify(kept));});
part("stray pairs",()=>{/* a draft whose only answers are pairs for picks taken back counts as empty: Finalize keeps nothing */
 const A=P.boot();A.loadText(EACH);A.screen="fu/log";A.render();
 const d=A.draftFor("fu/log");d.tools=[];d.why=[{pick:1,a:"taken back"}];
 A.finalizeEntry("fu/log");
 chk("a draft whose only answers are pairs for picks taken back counts as empty: Finalize keeps no entry",A.keptFor("fu/log").length===0,JSON.stringify(A.keptFor("fu/log")));});

/* ---- 3. the views: one field per pick, labelled "<title> · <pick's words>" ---- */
part("views",()=>{const A=P.boot();A.loadText(EACH);
 A.keptFor("fu/log").push({ts:"2026-10-02T09:00:00Z",tools:[2,3,"Glue gun"],why:PAIRS,hours:[{pick:3,a:2}]},
   {ts:"2026-10-01T09:00:00Z",tools:[1],why:[{pick:1,a:"nails"}],hours:"not a list",count:"three"});
 const set=A.entrySet({from:"fu/log"},"fu/look","table");
 const labs=set.own.map(set.lab);
 chk("a table's columns are one per pick, in the source's order (then the picks later rows add), labelled with the title and the pick's words",
   JSON.stringify(labs)===JSON.stringify(["Date","Which tools did you use?","What was it for? · Saw","What was it for? · Drill","What was it for? · Glue gun","What was it for? · Hammer","How many hours? · Drill","How many pieces?"]),JSON.stringify(labs));
 const k=set.own.find(x=>set.lab(x)==="What was it for? · Saw"),h=set.own.find(x=>set.lab(x)==="How many hours? · Drill");
 chk("each row holds its picks' answers, and nothing for a pair whose pick the source does not hold",set.rows[0][k]==="cutting"&&set.rows[0][h]==="2"
   &&!Object.values(set.rows[0]).includes("an old answer, its pick taken back"),JSON.stringify(set.rows[0]));
 chk("an answer of the wrong shape is left out of its row, a follow-up's and a plain question's",!Object.keys(set.rows[1]).some(x=>/hours|count/.test(x))&&!Object.values(set.rows[1]).includes("three"),JSON.stringify(set.rows[1]));
 A.screen="fu/look-why";A.render();const shown=T(P.main());
 chk("`fields: why` names every pick's field of the follow-up",/What was it for\? · Saw/.test(shown)&&/What was it for\? · Glue gun/.test(shown)&&!/How many hours/.test(shown),shown.slice(0,400));
 A.screen="fu/look-cards";A.render();const cards=T(P.main());
 chk("a card's lines are one per pick too",/What was it for\? · Drill holes/.test(cards)&&/How many hours\? · Drill 2/.test(cards)&&!/its pick taken back/.test(cards),cards.slice(0,500));
 A.screen="fu/log";A.viewAt("fu/log").chip="2026-10-02T09:00:00Z";A.render();const card=T(P.main());
 chk("and so are a kept entry's card's",/What was it for\? · Glue gun sticking/.test(card)&&!/its pick taken back/.test(card),card.slice(0,600));
 A.viewAt("fu/log").chip="2026-10-01T09:00:00Z";A.render();const old=T(P.main());
 chk("a kept entry's card shows an answer of the wrong shape as written, with the notice",/How many hours\? Kept as written: this answer is not in the shape a question asked for each pick keeps \(a list of pairs/.test(old)&&/"not a list"/.test(old),old.slice(0,600));});

/* ---- 4. the wrong shape, for every kind and both widgets, in answers, drafts and kept entries ---- */
const KINDS=(p)=>`> [!text|${p}t] A text

> [!lines|${p}l] Some lines

> [!number|${p}n] A number

> [!scale|${p}s] A scale
1. Low
2. High

> [!choice|${p}c] A choice
- [ ] One
- [ ] Two

> [!multi|${p}m] A multi
- [ ] One
- [ ] Two

> [!matrix|${p}x] A matrix
- Item A
- Item B

0. No
1. Yes

> [!date|${p}d] A date

> [!widget|${p}g] A grid
> ![[#^grid]]

> [!widget|${p}r] A body map
> ![[#^regions]]
`;
const WRONG={t:["a list",""],l:"one line, not a list",n:"5",s:1.5,c:[1],m:2,x:{"0":1},d:20261001,g:[{id:"i1"}],r:["chest"]};
const RIGHT={t:"words",l:["a line",""],n:5,s:1,c:2,m:[1,"own"],x:[0,null],d:"2026-10-01",g:["i1"],r:[{id:"r1",s:["warm"]}]};
const SHAPES=FM+`> [!module|sh] Shapes

> [!activity|once] Once

${KINDS("a")}
> [!activity|log repeat] Log

${KINDS("e")}
\`\`\`booklet widget
{ "engine": "grid-select", "axes": {"x":"X","y":"Y"}, "cells": [{"id":"c1","label":"Cell"}], "items": [{"id":"i1","label":"Item one","cell":"c1"}] }
\`\`\`
^grid

\`\`\`booklet widget
{ "engine": "svg-regions", "regions": [{"id":"r1","label":"Place one"}], "figures": [{"id":"f1","label":"Front","svg":"<svg viewBox='0 0 10 10'><rect class='rg' data-r='r1' width='5' height='5'/></svg>","regions":["r1"]}] }
\`\`\`
^regions

> [!module|sh end] End
`;
const kinds=Object.keys(WRONG);
part("wrong shape",()=>{let A=P.boot();A.loadText(SHAPES);
 chk("the shapes fixture opens with nothing reported",A.parseFile(SHAPES).unread.length===0,A.parseFile(SHAPES).unread.map(String).join(" | "));
 const ans=A.answersIn("sh"),draft=A.draftFor("sh/log");
 kinds.forEach(k=>{ans["a"+k]=WRONG[k];draft["e"+k]=WRONG[k];});
 A.keptFor("sh/log").push({ts:"2026-10-01T09:00:00Z",...Object.fromEntries(kinds.map(k=>["e"+k,WRONG[k]]))},
   {ts:"2026-10-02T09:00:00Z",...Object.fromEntries(kinds.map(k=>["e"+k,RIGHT[k]]))});
 const file=A.toMarkdown();
 A=P.boot();A.loadText(file);
 const R=A.parseFile(file),notes=R.unread.filter(x=>/not in the shape/.test(x));
 chk("on opening, the file's problems say once how many answers are of the wrong shape (ten answers, ten drafts, ten kept)",notes.length===1&&/^30 answers are not in the shape/.test(String(notes[0])),R.unread.map(String).join(" | "));
 const drawn=(screen,prefix)=>{A.screen=screen;A.render();const out={};
   for(const k of kinds){const label={t:"A text",l:"Some lines",n:"A number",s:"A scale",c:"A choice",m:"A multi",x:"A matrix",d:"A date",g:"A grid",r:"A body map"}[k];
     const box=find(P.main(),x=>/q-kept/.test((x.attrs||{}).class||"")&&T(x).startsWith(label))[0];
     out[k]=!!box&&/Kept as written/.test(T(box))&&pressable(box).length===0&&T(box).includes(JSON.stringify(WRONG[k],null,1).replace(/\s+/g," ").trim());}
   return out;};
 const a=drawn("sh/once"),e=drawn("sh/log");
 chk("in the answers, every kind and both widgets of the wrong shape are drawn read-only, with the notice and the file's value",kinds.every(k=>a[k]),JSON.stringify(a));
 chk("and so they are in a draft",kinds.every(k=>e[k]),JSON.stringify(e));
 A.screen="sh/log";A.viewAt("sh/log").chip="2026-10-01T09:00:00Z";A.render();const card=T(P.main());
 chk("and in a kept entry's card, each with the notice",(card.match(/Kept as written/g)||[]).length===kinds.length+kinds.length,(card.match(/Kept as written/g)||[]).length+" notices: "+card.slice(0,300));
 A.viewAt("sh/log").chip=null;
 const before=JSON.stringify({a:A.answersIn("sh"),d:A.draftFor("sh/log"),k:A.keptFor("sh/log")});
 A.screen="sh/once";A.render();A.screen="sh/log";A.render();
 A.finalizeEntry("sh/log");
 const kept=A.keptFor("sh/log"),last=kept[kept.length-1];
 chk("Finalize keeps each wrong-shape answer as written (a text kept as a list keeps its blank member)",kinds.every(k=>JSON.stringify(last["e"+k])===JSON.stringify(WRONG[k])),JSON.stringify(last));
 chk("and the kept entries and answers it had are unchanged",JSON.stringify({a:A.answersIn("sh"),k:kept.slice(0,2)})===JSON.stringify({a:JSON.parse(before).a,k:JSON.parse(before).k}));
 const again=A.toMarkdown(),C=P.boot();C.loadText(again);
 const same=(x,k)=>JSON.stringify(x)===JSON.stringify(WRONG[k]);
 chk("saving writes each one back as it was read, in the answers and the kept entries",kinds.every(k=>same(C.answersIn("sh")["a"+k],k)&&same(C.keptFor("sh/log")[0]["e"+k],k)&&same(C.keptFor("sh/log")[2]["e"+k],k)),
   JSON.stringify([C.answersIn("sh"),C.keptFor("sh/log")[0]]).slice(0,400));
 /* the right shapes are drawn by their kinds, as before */
 const B=P.boot();B.loadText(SHAPES);const ra=B.answersIn("sh");kinds.forEach(k=>{ra["a"+k]=RIGHT[k];});B.screen="sh/once";B.render();
 chk("answers of the right shape are drawn by their kinds, with nothing kept as written",!/Kept as written/.test(T(P.main()))&&find(P.main(),x=>/q-kept/.test((x.attrs||{}).class||"")).length===0);});

/* ---- 5. earlier words: own options offered again, `earlier:` says how many ---- */
part("earlier words",()=>{const A=P.boot();
 A.loadText(FM+`> [!module|ew] Earlier

> [!activity|day repeat daily] Day

> [!multi|pick open] Pick
- [ ] Red

> [!multi|two open earlier:2] Two
- [ ] Red

> [!multi|none open earlier:0] None
- [ ] Red

> [!module|ew end] End
`);
 const bs=blocksIn(A.activityOf("ew/day")),q=id=>bs.find(b=>b.id===id);
 const now=new Date(),iso=d=>d.toISOString(),daysAgo=n=>new Date(now.getTime()-n*86400000);
 const own=n=>"Own "+n;
 const ks=A.keptFor("ew/day");
 /* fifteen earlier days, each with its own word; and two older entries whose ts text order is not their time order (23:30 at
    -05:00 is 04:30 the next day, after 03:00 at +02:00) */
 for(let i=1;i<=15;i++) ks.push({ts:iso(daysAgo(i)),pick:[own(i)],two:[own(i)],none:[own(i)]});
 ks.push({ts:iso(now),pick:["Today's own"],two:["Today's own"],none:["Today's own"]});
 ks.push({ts:"2020-01-01T23:30:00-05:00",pick:["Late in the day"]},{ts:"2020-01-02T03:00:00+02:00",pick:["Early the next"]});
 ks.push({ts:iso(daysAgo(20)),pick:"Not a list"});
 const got=A.ownEarlier("ew/day","pick",["Red"],[],q("pick"));
 chk("by default at most 12, newest first, today's entry of a daily activity left out",got.length===12&&got[0]===own(1)&&got[11]===own(12)&&!got.includes("Today's own"),JSON.stringify(got));
 chk("`earlier:2` offers two",JSON.stringify(A.ownEarlier("ew/day","two",["Red"],[],q("two")))===JSON.stringify([own(1),own(2)]));
 chk("`earlier:0` offers none",A.ownEarlier("ew/day","none",["Red"],[],q("none")).length===0);
 const all=A.ownEarlier("ew/day","pick",["Red"],[],{...q("pick"),earlier:100});
 chk("entries are ordered by the time in their ts, not its text",all.indexOf("Late in the day")>=0&&all.indexOf("Late in the day")<all.indexOf("Early the next"),JSON.stringify(all.slice(-4)));
 chk("an answer of the wrong shape gives no words",!all.includes("Not a list"),JSON.stringify(all));
 A.screen="ew/day";A.render();
 const pills=find(P.main(),x=>x.tagName==="button"&&/^Own \d+$/.test(T(x))&&x.attrs["aria-pressed"]==="false");
 chk("drawn: 12 + 2 + 0 earlier words, as unpressed buttons",pills.length===14,String(pills.length));});

/* ---- 6. the linter: each:'s five errors and one warning, earlier:'s value and where it offers nothing ---- */
part("the linter",()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"answers016-"));
 const lint=t=>{const f=path.join(tmp,"t.booklet.md");fs.writeFileSync(f,t);const r=spawnSync("python3",[path.join(P.R,"lint-booklet.py"),f],{encoding:"utf8"});
   const ls=r.stdout.split("\n");return {status:r.status,errors:ls.filter(l=>l.startsWith("ERROR")),warns:ls.filter(l=>l.startsWith("warn")),out:r.stdout};};
 const clean=lint(FM+`> [!activity|log repeat] Log

> [!multi|tools open earlier:5] Which tools?
- [ ] Hammer
- [ ] Saw

> [!text|why each:tools] What was it for?

> [!lines|ls earlier:3] Lines
`);
 chk("a follow-up after its source and `earlier:` where it offers something lint clean",clean.status===0&&clean.errors.length===0&&clean.warns.length===0,clean.out);
 const r=lint(FM+`> [!activity|log repeat] Log

> [!text|before each:tools] Placed before its source

> [!multi|tools] Which tools?
- [ ] Hammer

> [!text|t1 each:] Names nothing

> [!text|t2 each:t2] Names itself

> [!text|t3 each:nowhere] Names no question

> [!text|t4 each:t1] Names a text question

> [!multi|t5 each:tools] A follow-up that is a source
- [ ] A

> [!text|t6 each:t5] Names a follow-up
`);
 const at=(n,re,list)=>(list||r.errors).some(l=>new RegExp(": line "+n+": ").test(l)&&re.test(l));
 chk("each: names nothing, names itself, names no question in its activity, names a source of another kind: errors",
   at(14,/names nothing/)&&at(16,/names this question itself/)&&at(18,/names no question or widget in this activity/)&&at(20,/names a text question/),r.out);
 chk("a chain: one naming a follow-up, and a follow-up that is itself a source: errors",at(25,/itself asked for each pick/)&&at(22,/itself a source of another question/),r.out);
 chk("a follow-up placed before its source: a warning",at(9,/after this question; it should sit after its source/,r.warns)&&r.errors.length===6&&r.warns.length===1,r.out);
 const e=lint(FM+`> [!activity|log repeat] Log

> [!multi|a open earlier:+3] A
- [ ] One

> [!multi|b earlier:3] B
- [ ] One

> [!widget|g earlier:3] Grid
> ![[#^grid]]

> [!activity|once] Once

> [!multi|c open earlier:3] C
- [ ] One

> [!lines|d earlier:3] D

\`\`\`booklet widget
{ "engine": "grid-select" }
\`\`\`
^grid
`);
 const eat=(n,re,list)=>(list||e.errors).some(l=>new RegExp(": line "+n+": ").test(l)&&re.test(l));
 chk("`earlier:+3`: an error, the value must be a whole number in digits",eat(9,/`earlier:\+3` must be a whole number written in digits/),e.out);
 chk("`earlier:` without `open`, on a grid-select widget, and in an activity that keeps no entries: warnings",
   eat(12,/has no `open`, so it offers nothing/,e.warns)&&eat(15,/does nothing on a grid-select widget/,e.warns)&&eat(20,/keeps none/,e.warns)&&eat(23,/keeps none/,e.warns)&&e.warns.length===4,e.out);
 fs.rmSync(tmp,{recursive:true,force:true});});

/* ---- 7. a daily activity's draft that holds only pairs for picks taken back keeps them when today's entry is shown ---- */
part("seeding a daily draft",()=>{
 const today=new Date().toISOString(),A=P.boot();
 const T0=FM+`> [!activity|log repeat daily] Log

> [!multi|tools open] Which tools?
- [ ] Hammer
- [ ] Saw
- [ ] Drill

> [!text|why each:tools] What was it for?

%%
> [!records] App record

\`\`\`booklet entries log
{"items": [
{"ts":"${today}","tools":[1,2],"why":[{"pick":1,"a":"the entry's hammer"},{"pick":2,"a":"the entry's saw"}]}
]}
\`\`\`

\`\`\`booklet draft log
{"tools":[],"why":[{"pick":1,"a":"the draft's newer hammer"},{"pick":3,"a":"the draft's drill"}]}
\`\`\`
%%
`;A.loadText(T0);
 A.screen="log";A.render();
 const why=A.draftFor("log").why,want=[{pick:1,a:"the draft's newer hammer"},{pick:3,a:"the draft's drill"},{pick:2,a:"the entry's saw"}];
 chk("today's entry is shown, and the draft's pairs go over the entry's pick by pick, the entry's other pairs beside them",
   JSON.stringify(A.draftFor("log").tools)==="[1,2]"&&JSON.stringify(why)===JSON.stringify(want),JSON.stringify(A.draftFor("log")));
 /* (lane 4, SPEC section 8: what is shown is not written until the reader changes it, as the Obsidian plugin does) */
 chk("and the file written is the file read until the reader changes the draft",A.toMarkdown()===T0);
 A.draftFor("log").why[1].a="the draft's sharper drill";A.markDirty();
 chk("then the file written holds them, the reader's change with them",A.toMarkdown().includes(JSON.stringify([want[0],{pick:3,a:"the draft's sharper drill"},want[2]])));});

/* ---- 8. a follow-up named alone in `from:`: rows in a table, a list and cards; a line saying so in tiles, bars and a line ---- */
part("a follow-up alone in from:",()=>{
 const A=P.boot(),views=["table","list","cards","tiles","bars","line"];
 A.loadText(FM+`> [!activity|log repeat] Log

> [!multi|tools] Which tools?
- [ ] Hammer
- [ ] Saw

> [!number|hours each:tools] Hours?

${views.map(v=>`> [!activity|v-${v}] V ${v}\n\n\`\`\`booklet query\nfrom: hours\nas: ${v}\n\`\`\`\n\n`).join("")}`);
 A.keptFor("log").push({ts:"2026-10-02T09:00:00Z",tools:[1,2],hours:[{pick:1,a:3},{pick:2,a:5}]});
 const said={};for(const v of views){A.screen="v-"+v;A.render();said[v]=T(P.main());}
 chk("a table, a list and cards show one field per pick",["table","list","cards"].every(v=>/Hours\? · Hammer/.test(said[v])&&/Hours\? · Saw/.test(said[v])&&!/does not draw/.test(said[v])),JSON.stringify(said).slice(0,600));
 chk("tiles, bars and a line say the view does not draw it yet, and draw nothing else",["tiles","bars","line"].every(v=>/This view does not draw a question asked for each pick yet/.test(said[v])&&!/Oct/.test(said[v])),JSON.stringify(said).slice(0,600));});

/* ---- 9. the notice of a follow-up of the wrong shape names its list of pairs; a read-only question keeps its hint ---- */
part("the follow-up's notice and a kept question's hint",()=>{
 const A=P.boot();
 A.loadText(FM+`> [!activity|log repeat] Log

> [!multi|tools] Which tools?
- [ ] Hammer

> [!number|hours each:tools] Hours?

> [!text|t] A text

> [!hint]- A hint
> THE-HINT-WORDS
`);
 const d=A.draftFor("log");d.hours=5;d.t=["not","a string"];
 A.screen="log";A.render();const all=T(P.main());
 chk("a follow-up of the wrong shape: its notice says it keeps a list of pairs",/not in the shape a question asked for each pick keeps \(a list of pairs, one for each pick\)/.test(all),all.slice(0,500));
 const box=find(P.main(),x=>/q-kept/.test((x.attrs||{}).class||"")&&/^A text/.test(T(x)))[0];
 chk("a question drawn read-only still has its hint",!!box&&/A hint/.test(T(box)),box?T(box):"no box");});

/* ---- 10. an answer that holds nothing, whatever its type, draws as no answer: no page error, nothing of the value shown ---- */
part("answers that hold nothing",()=>{
 const EMPTY=[{},{a:""},false,[[]],[" "],"",[],[null],[{id:""}]];
 const probs=[];
 for(const v of EMPTY) for(const k of kinds){
   P.wipe();const A=P.boot();A.loadText(SHAPES);
   A.answersIn("sh")["a"+k]=JSON.parse(JSON.stringify(v));A.draftFor("sh/log")["e"+k]=JSON.parse(JSON.stringify(v));
   A.keptFor("sh/log").push({ts:"2026-10-01T09:00:00Z",["e"+k]:JSON.parse(JSON.stringify(v)),et:"words"});
   try{for(const s of ["sh/once","sh/log"]){A.screen=s;if(s==="sh/log") A.viewAt(s).chip="2026-10-01T09:00:00Z";A.render();
       const t=T(P.main());if(/object Object|Kept as written/.test(t)) probs.push(k+" over "+JSON.stringify(v)+" on "+s+": "+(t.match(/.{0,40}(object Object|Kept as written).{0,40}/)||[""])[0]);
       /* a field shows a string, or nothing: never the value itself */
       if(find(P.main(),x=>x.tagName==="textarea"||x.tagName==="input").some(x=>typeof x.value!=="string")) probs.push(k+" over "+JSON.stringify(v)+" on "+s+": a field holds the value itself");}
     A.entrySet({from:"sh/log"},"sh/once","table");}
   catch(e){probs.push(k+" over "+JSON.stringify(v)+": "+String(e).slice(0,90));}}
 chk("every kind and both widgets over {}, {\"a\":\"\"}, false, [[]], [\" \"], \"\", [], [null] and [{\"id\":\"\"}] draw with no page error and show nothing of the value",probs.length===0,probs.slice(0,6).join(" | "));});

/* ---- 11. the new strings are in French and Spanish (provisional until the release's /localize pass) ---- */
part("the new strings in fr and es",()=>{
 const A=P.boot(),S=A.STRINGS_SRC,keys={question:["eachNotYet","keptAsWritten"],dv:["eachNotYet"],problem:["earlierBad","eachNone","eachMissing","eachSelf","eachKind","eachChain","shapesKept"]};
 const missing=[];
 for(const lang of ["fr","es"]) for(const [g,ks] of Object.entries(keys)) for(const k of ks){const x=((S[lang]||{})[g]||{})[k],en=S.en[g][k];
   if(x===undefined||typeof x!==typeof en||(typeof x==="string"&&x===en)) missing.push(lang+"."+g+"."+k);}
 chk("every new string has its own French and Spanish",missing.length===0,missing.join(", "));});

console.log(fails?`\n${fails} FAILURES`:"\nall answers checks passed");
process.exit(fails?1:0);
