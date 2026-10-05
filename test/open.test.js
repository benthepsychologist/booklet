// Format v0.8, the questions a reader answers: `open` (the reader's own option), `[x]` (right or wrong once answered),
// the problems a file's opening shows, an unknown kind, and the settings table.
// Run: node test/open.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs"),path=require("path");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const FX=path.join(__dirname,"fixtures");
const read=n=>fs.readFileSync(path.join(FX,n),"utf8");
const OPEN=read("questions-open.booklet.md");
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/).filter(Boolean);
const byClass=(root,c)=>P.find(root,n=>cls(n).includes(c));
const tag=(root,t)=>P.find(root,n=>n.tagName===t);
const click=n=>{if(!n||!n._on||!n._on.click) throw new Error("nothing to click");return n._on.click({target:n});};
const text=n=>P.texts(n);
/* the question's box on the screen: the heading (an h3 or label) holds its words */
const box=(A,words)=>{A.render();return P.find(P.main(),n=>n.tagName==="div"&&!cls(n).length&&!n.attrs.role&&tag(n,"h3").some(h=>text(h).includes(words))&&!P.find(n,m=>m!==n&&m.tagName==="div"&&!cls(m).length&&tag(m,"h3").length&&tag(m,"h3").some(h=>text(h).includes(words))).length)[0];};
const pills=b=>byClass(b,"pills")[0];
const pillBtns=b=>pills(b).children.filter(x=>x&&x.tagName==="button"&&cls(x).includes("pill-btn"));
const label=x=>text(x).replace(/\s*[✓✗].*$/,"").trim();
const pressed=x=>x.attrs["aria-pressed"]==="true";
const byWords=(b,w)=>pillBtns(b).find(x=>label(x)===w);
const field=b=>byClass(b,"q-own")[0];
const addBtn=b=>tag(byClass(b,"q-ownrow")[0],"button")[0];
const addOwn=(b,words,how)=>{const f=field(b);f.value=words;
  if(how==="enter") f._on.keydown({key:"Enter",preventDefault(){}});else click(addBtn(b));};
const answer=(A,id)=>A.draftFor("garden-notes/walk")[id];
const boot=()=>{P.wipe();const A=P.boot();A.loadText(OPEN);return A;};

/* ---- the file and its parts ---- */
{const A=P.boot(),R=A.parseFile(OPEN);
 chk("the open-question fixture parses with nothing reported",R.ok&&R.unread.length===0&&R.refused.length===0,JSON.stringify(R.unread));
 const bs=R.template.modules[0].activities.flatMap(a=>a.blocks).filter(b=>b.options);
 chk("`open` is kept on the two questions that say it, and only on those",
   bs.filter(b=>b.open).map(b=>b.id).join()==="noticed,weather",bs.map(b=>b.id+":"+b.open).join());
 chk("a choice with a [x] has its answer as a position; a multi with two has two",
   bs.find(b=>b.id==="seasons").answer===2&&bs.find(b=>b.id==="fruit").answer.join()==="1,3");}

/* ---- A1: the reader's own option ---- */
{const A=boot();A.screen="garden-notes/walk";
 let b=box(A,"What did you notice");
 chk("an open question draws a field and an Add button under its options",!!b&&!!field(b)&&text(addBtn(b))==="Add",b&&text(b));
 chk("the field is labelled “Add your own”",field(b).attrs["aria-label"]==="Add your own"&&field(b).attrs.placeholder==="Add your own");
 chk("a question that is not open draws no such field",(A.screen="garden-notes/quiz",!byClass(box(A,"Which of these are fruit"),"q-own").length));
 A.screen="garden-notes/walk";b=box(A,"What did you notice");
 addOwn(b,"Moths");b=box(A,"What did you notice");
 chk("the button adds the own option, stored as a string in the answer list",JSON.stringify(answer(A,"noticed"))==='["Moths"]',JSON.stringify(answer(A,"noticed")));
 const own=byClass(b,"pill-own")[0];
 chk("it appears among the options as a pressed pill with a remove control",!!own&&pressed(tag(own,"button")[0])&&label(tag(own,"button")[0])==="Moths"&&tag(own,"button")[1].attrs["aria-label"]==="Remove “Moths”");
 chk("the field is empty again",field(b).value==="");
 addOwn(b,"   ");addOwn(b,"");b=box(A,"What did you notice");
 chk("empty or whitespace-only text adds nothing",answer(A,"noticed").length===1);
 addOwn(b,"  bees ");b=box(A,"What did you notice");
 chk("text equal to a listed option (ignoring case and spaces) presses that option instead",JSON.stringify(answer(A,"noticed"))==='["Moths",3]'&&pressed(byWords(b,"Bees")),JSON.stringify(answer(A,"noticed")));
 addOwn(b," MOTHS ","enter");b=box(A,"What did you notice");
 chk("a duplicate of an own option is not added twice (and Enter adds, too)",answer(A,"noticed").length===2);
 addOwn(b,"Spiders","enter");b=box(A,"What did you notice");
 chk("Enter in the field adds",JSON.stringify(answer(A,"noticed"))==='["Moths",3,"Spiders"]',JSON.stringify(answer(A,"noticed")));
 click(tag(byClass(b,"pill-own")[0],"button")[1]);b=box(A,"What did you notice");
 chk("the remove control takes the own option out",JSON.stringify(answer(A,"noticed"))==='[3,"Spiders"]',JSON.stringify(answer(A,"noticed")));
 click(byWords(b,"Bees"));b=box(A,"What did you notice");
 chk("a listed option still unpresses as before",JSON.stringify(answer(A,"noticed"))==='["Spiders"]');
 chk("nothing is written into the file's option list",A.BOOK.modules[0].activities[0].blocks.find(x=>x.id==="noticed").options.join()==="Birds,Fresh soil,Bees");
 /* a choice: one answer, a position or the reader's own string */
 let w=box(A,"How was the weather");
 click(byWords(w,"Windy"));addOwn(box(A,"How was the weather"),"Misty");w=box(A,"How was the weather");
 chk("an open choice: adding an own option makes it the answer",answer(A,"weather")==="Misty"&&!pressed(byWords(w,"Windy")),JSON.stringify(answer(A,"weather")));
 click(byWords(w,"Sunny"));w=box(A,"How was the weather");
 chk("picking a listed option replaces the own one, which is gone",answer(A,"weather")===1&&!byClass(w,"pill-own").length,JSON.stringify(answer(A,"weather")));
 addOwn(w,"misty");w=box(A,"How was the weather");click(tag(byClass(w,"pill-own")[0],"button")[0]);w=box(A,"How was the weather");
 chk("pressing the own pill takes it away, leaving no answer",answer(A,"weather")===null);}

/* ---- own options are kept, shown as text, written, read back, and offered again ---- */
{const A=boot();A.screen="garden-notes/walk";
 let b=box(A,"What did you notice");
 click(byWords(b,"Birds"));addOwn(box(A,"What did you notice"),"Moths");addOwn(box(A,"What did you notice"),"Frogs");
 A.finalizeEntry("garden-notes/walk");
 const kept=A.keptFor("garden-notes/walk")[0];
 chk("a kept entry holds positions and the reader's own strings",JSON.stringify(kept.noticed)==='[1,"Moths","Frogs"]',JSON.stringify(kept.noticed));
 b=box(A,"What did you notice");
 const names=pillBtns(b).map(label);
 chk("they are offered again as ordinary unpressed pills after the listed ones",names.join()==="Birds,Fresh soil,Bees,Moths,Frogs"&&pillBtns(b).every(x=>!pressed(x)),names.join());
 chk("an offered one carries no remove control",byClass(b,"pill-own").length===0);
 click(byWords(b,"Frogs"));b=box(A,"What did you notice");
 chk("pressing an offered one stores its string, and it becomes the pressed own pill",JSON.stringify(answer(A,"noticed"))==='["Frogs"]'&&byClass(b,"pill-own").length===1&&!byWords(b,"Frogs"),JSON.stringify(answer(A,"noticed")));
 const blk=A.BOOK.modules[0].activities[0].blocks.find(x=>x.id==="noticed");
 const sum=A.fieldSummary(blk,kept);
 chk("an entry's summary shows the own options as their text",sum&&sum[1]==="Birds, Moths, Frogs",JSON.stringify(sum));
 A.screen="garden-notes/walk";A.render();
 chk("the entry card shows them too",/Birds, Moths, Frogs/.test(text(P.main())),text(P.main()).slice(0,300));
 A.draftFor("garden-notes/walk").noticed=[];
 const md=A.toMarkdown();
 chk("the file keeps the design as written; the own words are in the records only",md.startsWith(OPEN.replace(/\s+$/,""))&&/"noticed":\[1,"Moths","Frogs"\]/.test(md),md.slice(-300));
 P.wipe();const B=P.boot();B.loadText(md);
 chk("read back, the entry holds the same list",JSON.stringify(B.keptFor("garden-notes/walk")[0].noticed)==='[1,"Moths","Frogs"]');
 B.screen="garden-notes/walk";b=box(B,"What did you notice");
 chk("and the own options are offered again after a reload",pillBtns(b).map(label).join()==="Birds,Fresh soil,Bees,Moths,Frogs");}
{const A=boot();A.screen="garden-notes/walk";
 /* the most recent first, at most twelve */
 for(let i=1;i<=14;i++){A.draftFor("garden-notes/walk").noticed=["w"+i];const e=A.keptFor("garden-notes/walk");e.push({ts:"2026-10-"+String(i).padStart(2,"0")+"T08:00:00",noticed:["w"+i]});}
 A.draftFor("garden-notes/walk").noticed=[];
 const names=pillBtns(box(A,"What did you notice")).map(label).slice(3);
 chk("at most twelve are offered again, the most recent first",names.length===12&&names[0]==="w14"&&names[11]==="w3",names.join());
 A.keptFor("garden-notes/walk").length=0;A.keptFor("garden-notes/walk").push({ts:"2026-10-01T08:00:00",noticed:["Birds","BEES","  moths ","Moths"]});
 chk("one equal to a listed option, or repeated, is not offered",pillBtns(box(A,"What did you notice")).map(label).join()==="Birds,Fresh soil,Bees,moths");}
{/* a shared menu with open behaves the same; a question kept in an activity that keeps no entries offers nothing again */
 P.wipe();const A=P.boot();
 A.loadText("---\nbooklet: \"0.11\"\ntitle: M\nlang: en\n---\n\n> [!module|m] M\n\n> [!menu|feels]\n- Calm\n- Tired\n\n> [!activity|a] A\n\n> [!multi|q1 menu:feels open] This morning\n\n> [!choice|q2 menu:feels open] This evening\n\n> [!module|m end] End\n");
 A.screen="m/a";let b=box(A,"This morning");
 addOwn(b,"Hopeful");b=box(A,"This morning");
 chk("a shared menu with `open` takes the reader's own option, stored as a string",JSON.stringify(A.STATE.answers.m.q1)==='["Hopeful"]'&&byClass(b,"pill-own").length===1,JSON.stringify(A.STATE.answers.m));
 addOwn(box(A,"This evening"),"Weary");
 chk("and an open choice over a menu holds it as its one answer",A.STATE.answers.m.q2==="Weary");
 const md=A.toMarkdown();P.wipe();const B=P.boot();B.loadText(md);
 chk("saved and read back, an own option in a plain activity is still the answer",B.STATE.answers.m.q1[0]==="Hopeful"&&B.STATE.answers.m.q2==="Weary");
 B.screen="m/a";chk("nothing is offered again in an activity that keeps no entries",byClass(box(B,"This morning"),"pill-own").length===1&&pillBtns(box(B,"This morning")).length===2);}
{/* in a query view an own option is its text, and in a chart it is not a number */
 const A=boot();A.screen="garden-notes/walk";
 A.draftFor("garden-notes/walk").weather="Misty";A.draftFor("garden-notes/walk").noticed=[1,"Moths"];A.finalizeEntry("garden-notes/walk");
 const set=A.entrySet({from:"garden-notes/walk",view:{}},"garden-notes/walk","table");
 chk("a query row shows the own words as text",set.rows[0].noticed==="Birds, Moths"&&set.rows[0].weather==="Misty",JSON.stringify(set.rows[0]));
 const bar=A.entrySet({from:"garden-notes/walk",view:{}},"garden-notes/walk","bars");
 chk("for a chart it is text, never a number",typeof bar.rows[0].weather==="string"&&typeof bar.sortVal(bar.rows[0],"weather")==="string");}

/* ---- A2: [x], right or wrong once answered ---- */
{const A=boot();A.screen="garden-notes/quiz";
 let b=box(A,"Which season");
 chk("before an answer there are no marks and no live line",!byClass(b,"q-mk").length&&text(byClass(b,"q-live")[0]||"")==="");
 click(byWords(b,"Autumn"));b=box(A,"Which season");
 chk("a wrong pick is marked not right, with a word and a sign, not colour alone",/Not quite/.test(text(byWords(b,"Autumn")))&&/✗/.test(text(byWords(b,"Autumn")))&&cls(byWords(b,"Autumn")).includes("q-wrong"));
 chk("and the correct option is marked as the answer",/The answer/.test(text(byWords(b,"Spring")))&&cls(byWords(b,"Spring")).includes("q-answer"));
 chk("the polite line says so, with the answer",text(byClass(b,"q-live")[0])==="Not quite. The answer is Spring."&&byClass(b,"q-live")[0].attrs["aria-live"]==="polite");
 click(byWords(b,"Spring"));b=box(A,"Which season");
 chk("picking again moves the marks: right",/Right/.test(text(byWords(b,"Spring")))&&cls(byWords(b,"Spring")).includes("q-right")&&!byClass(b,"q-wrong").length&&text(byClass(b,"q-live")[0])==="Right.");
 chk("nothing new is stored: the answer is the position, and nothing else is kept",A.STATE.answers["garden-notes"].seasons===2&&Object.keys(A.STATE.answers["garden-notes"]).join()==="seasons",JSON.stringify(A.STATE.answers["garden-notes"]));
 click(byWords(b,"Spring"));b=box(A,"Which season");
 chk("unpressing clears the marks",!byClass(b,"q-mk").length);
 /* a multi with two correct options */
 let m=box(A,"Which of these are fruit");
 chk("a multi with correct options has no Check button until something is picked",!tag(byClass(m,"q-acts")[0],"button").length);
 click(byWords(m,"Apple"));m=box(A,"Which of these are fruit");
 const check=()=>tag(byClass(m,"q-acts")[0],"button")[0];
 chk("then a Check button appears",!!check()&&text(check())==="Check");
 chk("and nothing is marked until Check is pressed",!byClass(m,"q-mk").length);
 click(check());               /* (the page is not redrawn: the marks are the question's own, kept nowhere) */
 chk("Check marks picked-and-right, and right-and-missed",cls(byWords(m,"Apple")).includes("q-right")&&cls(byWords(m,"Pear")).includes("q-answer")&&!cls(byWords(m,"Carrot")).some(c=>/^q-/.test(c)));
 chk("the live line gives the answers",text(byClass(m,"q-live")[0])==="Not quite. The answer is Apple, Pear.",text(byClass(m,"q-live")[0]));
 click(byWords(m,"Carrot"));
 chk("changing a pick clears the marks until Check is pressed again",!byClass(m,"q-mk").length&&text(byClass(m,"q-live")[0])==="");
 click(check());
 chk("picked and not right is marked not right",cls(byWords(m,"Carrot")).includes("q-wrong")&&/Not quite/.test(text(byWords(m,"Carrot"))));
 click(byWords(m,"Carrot"));click(byWords(m,"Pear"));click(check());
 chk("every right pick and none wrong: Right.",text(byClass(m,"q-live")[0])==="Right."&&byClass(m,"q-right").length===2);
 chk("nothing about checking is stored: only the picks",JSON.stringify(A.STATE.answers["garden-notes"].fruit)==="[1,3]"&&Object.keys(A.STATE.answers["garden-notes"]).sort().join()==="fruit,seasons",JSON.stringify(A.STATE.answers["garden-notes"]));
 A.STATE.answers["garden-notes"].fruit=[1,3];const md=A.toMarkdown();
 chk("the file carries no mark and no score",!/checked|score|right/i.test(md.slice(OPEN.length)),md.slice(OPEN.length));
 /* a question with no [x] is exactly as before */
 A.screen="garden-notes/walk";const w=box(A,"What did you notice");click(byWords(w,"Birds"));
 chk("a question with no [x] shows no marks, no Check, no live line",!byClass(box(A,"What did you notice"),"q-mk").length&&!byClass(box(A,"What did you notice"),"q-acts").length&&!byClass(box(A,"What did you notice"),"q-live").length);}
{/* an own option is neither right nor wrong */
 P.wipe();const A=P.boot();
 A.loadText("---\nbooklet: \"0.11\"\ntitle: Q\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!choice|cap open] Capital of France?\n- [ ] Lyon\n- [x] Paris\n\n> [!multi|cols open] Primary colours\n- [x] Red\n- [ ] Green\n- [x] Blue\n\n> [!module|m end] End\n");
 A.screen="m/a";let b=box(A,"Capital of France");
 addOwn(b,"Rome");b=box(A,"Capital of France");
 chk("an own option picked in a question with a right answer is not marked",!byClass(b,"q-mk").length&&text(byClass(b,"q-live")[0])==="");
 let m=box(A,"Primary colours");addOwn(m,"Yellow");m=box(A,"Primary colours");click(tag(byClass(m,"q-acts")[0],"button")[0]);
 chk("after Check an own option is neither right nor wrong, and the right ones missed are shown",!cls(byClass(m,"pill-own")[0]).some(c=>/^q-/.test(c))&&/The answer/.test(text(byWords(m,"Red")))&&/The answer/.test(text(byWords(m,"Blue"))),text(m));}
{const A=P.boot();
 chk("every interface language has the question words (es-AR inherits es)",["en","fr","es","es-AR"].every(l=>{const Q=A.STRINGS[l].question;
   return ["addOwn","addBtn","check","right","notQuite","theAnswer","liveRight"].every(k=>typeof Q[k]==="string"&&Q[k])&&Q.ownRemove("x").includes("x")&&Q.liveNot("x").includes("x");}));
 chk("French and Spanish do not just repeat the English",["fr","es"].every(l=>A.STRINGS[l].question.check!==A.STRINGS.en.question.check&&A.STRINGS[l].question.liveRight!==A.STRINGS.en.question.liveRight));}

/* ---- A3: what happens to a file's problems when it opens ---- */
{const A=P.boot(),REF=read("problems-refused.booklet.md");
 const mk=body=>"---\nbooklet: \"0.11\"\ntitle: T\nlang: en\n---\n\n"+body;
 const refused=(label,text,rx)=>{const R=A.parseFile(text);chk(label+": the file is refused",R.ok===false&&R.refused.length>=1&&rx.test(R.refused.join(" ")),JSON.stringify(R.refused));};
 refused("a module opened and not closed",REF,/never closed/);
 refused("a module closed and not opened",mk("> [!activity|a] A\n\n> [!module|m end] End\n"),/closed that was never opened/);
 refused("modules that overlap",mk("> [!module|m1] One\n\n> [!activity|a] A\n\n> [!module|m2] Two\n\n> [!module|m2 end] E\n\n> [!module|m1 end] E\n"),/opens before/);
 refused("a module closed by another's id",mk("> [!module|m1] One\n\n> [!activity|a] A\n\n> [!module|m2 end] E\n"),/this closes/);
 refused("an id used twice",mk("> [!activity|a] A\n\n> [!text|a] Again\n"),/“a” is used twice/);
 refused("a data block id that is also a question's",mk("> [!activity|a] A\n\n> [!text|rows] Q\n\n```booklet data\n[{\"x\":1}]\n```\n^rows\n"),/“rows” is used twice/);
 refused("a reference across a module boundary",mk("> [!module|m1] One\n\n> [!activity|a repeat] A\n\n> [!text|q] Q\n\n> [!module|m1 end] E\n\n> [!module|m2] Two\n\n> [!activity|b] B\n\n```booklet query\nfrom: a\n```\n\n> [!module|m2 end] E\n"),/in another module/);
 const R=A.parseFile(read("problems-reported.booklet.md"));
 chk("everything else is reported: the file opens, with each message in order",R.ok&&R.refused.length===0&&R.unread.length===6,JSON.stringify(R.unread));
 chk("a record block that cannot be read is among them, skipped",R.unread.some(x=>/entries record for “day” holds no list/.test(x)));
 const bad=A.parseFile(mk("> [!activity|a] A\n\n> [!records] R\n\n```booklet answers\n{nope\n```\n"));
 chk("a record block that is not JSON is skipped and counted",bad.ok&&bad.unread.length===1&&/not valid JSON, so it was skipped/.test(bad.unread[0]),JSON.stringify(bad.unread));
 /* the load dialog shows the refusal and nothing opens */
 P.wipe();const B=P.boot();global.document.getElementById("veilLoad").setAttribute("open","");
 B.loadText(REF);
 chk("loading a refused file shows its messages in the dialog, and nothing opens",/This file cannot be opened:.*never closed/.test(P.byId("loadMsg")._text)&&B.currentId===null,P.byId("loadMsg")._text);
 chk("add a module refuses it in the same way",B.moduleTextProblems(REF).some(x=>/never closed/.test(x)));
 /* a file that opens with reportable problems says so at the top of its first screen */
 P.wipe();const C=P.boot();C.loadText(read("problems-reported.booklet.md"));
 const note=()=>byClass(P.main(),"filenotes")[0];
 chk("the notice at the top says how many things the page could not read",!!note()&&/This file has 6 things this page could not read/.test(text(note())),P.main()&&text(P.main()).slice(0,200));
 chk("the notice is the first thing on the screen",cls(P.main().children[0]).includes("filenotes"));
 chk("the list is inside a disclosure",tag(note(),"details").length===1&&byClass(tag(note(),"details")[0],"plain").length===1&&/“sticker”/.test(text(tag(note(),"details")[0])));
 click(tag(note(),"button")[0]);
 chk("Dismiss removes it for the session",!note()&&C.FILE_NOTES.dismissed===true);
 C.screen="home";C.render();chk("and it stays gone when the screen is drawn again",!note());
 P.wipe();const D=P.boot();D.loadText(OPEN);chk("a clean file shows no notice",!byClass(P.main(),"filenotes").length&&D.FILE_NOTES===null);
 /* in French the words are French */
 P.wipe();const F=P.boot();F.loadText(read("problems-reported.booklet.md").replace("lang: en","lang: fr"));
 chk("the notice speaks the reader's language",/Ce fichier contient 6 points que cette page n’a pas pu lire/.test(text(byClass(P.main(),"filenotes")[0]||"")),text(P.main()).slice(0,200));}

/* ---- A4: an unknown kind ---- */
{const A=P.boot();
 const R=A.parseFile(read("problems-reported.booklet.md"));
 const blocks=R.template.modules[0].activities.flatMap(a=>a.blocks||[]);
 const c=blocks.find(b=>b.type==="callout"&&b.kind==="sticker");
 chk("a line with an id whose kind is not defined is drawn as a callout, marked unknown, and reported",!!c&&c.unknown===true&&R.unread.some(x=>/does not know the kind “sticker”/.test(x)));
 const plain=blocks.find(b=>b.type==="callout"&&b.kind==="note");
 chk("a reading callout with no id and no settings of any kind is not unknown, and not reported",!!plain&&!plain.unknown&&!R.unread.some(x=>/“note”/.test(x)));
 P.wipe();const B=P.boot();B.loadText(read("problems-reported.booklet.md"));B.screen="rep/day";B.render();
 const quiet=byClass(P.main(),"rd-unknown");
 chk("the callout says so quietly under its title",quiet.length===1&&/This page does not know the kind “sticker”/.test(text(quiet[0])),text(P.main()).slice(0,300));
 chk("and the reading callout has no such line",byClass(P.main(),"rd-callout").length===2);}
 {P.wipe();const D=P.boot();D.loadText("---\nbooklet: \"0.11\"\ntitle: T\nlang: en\n---\n\n> [!activity|a daily] A\n");
  const notes=(D.FILE_NOTES||{}).list||[];
  chk("a problem shown to the reader carries no Markdown backticks: what was between them is in quotation marks",notes.length>0&&notes.every(x=>!/`/.test(x))&&notes.some(x=>/“daily” only follows “repeat”/.test(x)),JSON.stringify(notes));}

/* ---- A5: the settings table ---- */
{const A=P.boot();
 chk("KIND_SETTINGS is the table of SPEC.md section 4",JSON.stringify(A.KIND_SETTINGS)===JSON.stringify({module:["end"],activity:["repeat","daily","hidden"],row:["end"],text:["long"],
   lines:[],scale:[],matrix:[],date:[],menu:[],hint:[],solution:[],data:[],records:[],manifest:[],notice:[],choice:["open","menu:"],multi:["open","menu:"],number:["min:","max:","step:"],widget:["readonly","describe"]}));
 const mk=body=>A.parseFile("---\nbooklet: \"0.11\"\ntitle: T\nlang: en\n---\n\n> [!activity|a] A\n\n"+body+"\n");
 const q=(R,id)=>R.template.modules[0].mode.blocks.find(b=>b.id===id);
 let R=mk("> [!number|n mx:5 min:1] N");
 chk("an unknown setting is reported and ignored (`mx:5` for `max:5`)",R.unread.length===1&&/a number line takes no “mx:”/.test(R.unread[0])&&q(R,"n").max===undefined&&q(R,"n").min===1,JSON.stringify(R.unread));
 R=mk("> [!text|t lng] T");chk("an unknown flag is reported and ignored",R.unread.length===1&&/a text line takes no “lng”/.test(R.unread[0])&&q(R,"t").rows===undefined);
 R=mk("> [!text|t open] T");chk("`open` on a text question is reported and ignored",R.unread.length===1&&/takes no “open”/.test(R.unread[0]));
 R=mk("> [!date|d min:2020-01-01 max:2030-01-01] D");chk("a date reads no min or max",R.unread.length===2&&q(R,"d").min===undefined&&q(R,"d").max===undefined);
 R=mk("> [!number|n min:abc] N");chk("a min that is not a number is reported and ignored",R.unread.length===1&&/`min:abc` is not a number/.test(R.unread[0])&&q(R,"n").min===undefined);
 R=mk("> [!number|n MIN:2 Max:9 STEP:0.5] N\n\n> [!TEXT|t LONG] T");
 chk("kinds, settings and flags are read without regard to case",R.unread.length===0&&q(R,"n").min===2&&q(R,"n").max===9&&q(R,"n").step===0.5&&q(R,"t").rows===6,JSON.stringify(R.unread));
 R=A.parseFile("---\nbooklet: \"0.11\"\ntitle: T\nlang: en\n---\n\n> [!activity|a daily] A\n\n> [!activity|b Repeat DAILY] B\n");
 const acts=R.template.modules.map(m=>m.mode);
 chk("`daily` without `repeat` is reported and ignored; `repeat daily` is fine",R.unread.length===1&&acts[0].kind==="board"&&acts[0].upsert===undefined&&acts[1].kind==="entry"&&acts[1].upsert==="day",JSON.stringify(R.unread));
 chk("an id keeps its case",A.parseFile("---\nbooklet: \"0.11\"\ntitle: T\nlang: en\n---\n\n> [!activity|MixedCase] A\n").template.modules[0].mode.id==="MixedCase");}

/* ---- A6: the small fixes ---- */
{const A=P.boot();
 const mk=q=>A.parseFile("---\nbooklet: \"0.11\"\ntitle: T\nlang: en\n---\n\n> [!activity|a repeat] A\n\n> [!text|t] T\n\n> [!activity|b] B\n\n```booklet query\n"+q+"\n```\n");
 const view=R=>R.template.modules.flatMap(m=>m.activities||[m.mode]).flatMap(a=>a.blocks).find(b=>b.type==="query");
 let R=mk("from: a\nlimit: 0");chk("`limit: 0` is reported and means no limit is set",R.unread.length===1&&/not a positive whole number/.test(R.unread[0])&&view(R).view.limit===undefined,JSON.stringify(R.unread));
 R=mk("from: a\nlimit: 2.5");chk("`limit: 2.5` too",R.unread.length===1&&view(R).view.limit===undefined);
 R=mk("from: a\nlimit: 3");chk("a positive whole number is applied",R.unread.length===0&&view(R).view.limit===3);
 R=mk("from: a\nlimt: 3");chk("an unknown query key is reported, and ignored",R.unread.length===1&&/no setting “limt”/.test(R.unread[0])&&view(R).view.limt===undefined);
 R=mk("FROM: a\nAS: Table");chk("query keys and `as:` are read without regard to case",R.unread.length===0&&view(R).from==="a"&&view(R).view.as==="table",JSON.stringify(R.unread));
 const set=A.dataSet({rows:[{name:"x",n:3}]});
 chk("an explicit `label:` naming a field no row carries draws no label",A.rolesOf(set,{label:"nope"},"list").label===null);
 chk("with no `label:` the label falls back to the first field",A.rolesOf(set,{},"list").label==="name");
 chk("a query in the data section is reported, not silently skipped",A.parseFile("---\nbooklet: \"0.11\"\ntitle: T\nlang: en\n---\n\n> [!activity|a] A\n\n> [!data] D\n\n```booklet query\nfrom: a\n```\n").unread.some(x=>/not in the data section/.test(x)));
 chk("a single-quoted marker opens the file",A.parseFile("---\nbooklet: \"0.11\"\ntitle: T\nlang: en\n---\n\n> [!activity|a] A\n").ok);
 chk("a file with no `lang:` opens, reads as English and says so",(r=>r.ok&&r.lang==="en"&&r.unread.length===1&&/no `lang:`/.test(r.unread[0]))(A.parseFile("---\nbooklet: \"0.11\"\ntitle: T\n---\n\n> [!activity|a] A\n")));
 chk("any other language opens too, in its own words with the interface in English",(r=>r.ok&&r.lang==="en"&&r.unread.length===0)(A.parseFile("---\nbooklet: \"0.11\"\ntitle: T\nlang: de\n---\n\n> [!activity|a] A\n")));
 chk("`booklet module` is like any unknown fence, reported",A.parseFile("---\nbooklet: \"0.11\"\ntitle: T\nlang: en\n---\n\n> [!activity|a] A\n\n```booklet module\n{}\n```\n").unread.some(x=>/a “booklet module” block is not one this page reads/.test(x)));
 chk("a widget naming an engine that does not exist still draws a notice",(()=>{P.wipe();const B=P.boot();
   B.loadText("---\nbooklet: \"0.11\"\ntitle: T\nlang: en\n---\n\n> [!activity|a] A\n\n> [!widget|w] W\n> ![[#^wd]]\n\n```booklet widget\n{\"engine\":\"tag-cloud\"}\n```\n^wd\n");
   B.screen="a";B.render();return /cannot draw a “tag-cloud”|cannot draw a "tag-cloud"/.test(text(P.main()));})());}

P.closePages();
console.log(fails?"\n"+fails+" FAILURES":"\nopen checks passed");process.exit(fails?1:0);
