// Tabs (0.15, SPEC.md section 3): a tab line in an activity starts a tab, and in a module's opening declares the module's
// tabs; a tab with no id takes its name as one; two of one id are both kept, the second numbered, and said (the linter
// refuses them, naming both lines); `tab:` puts an activity in a module's tab; `pin:off` lets the frame scroll away. Drawn:
// the ARIA tab bar, the opening above it, a module's screen listing each tab's own activities, the frame, and answers
// that stay put whichever tab is on show. The drawn geometry is test/tabs-browser.js. Run: node test/tabs.test.js
const P=require("./page.js");
const fs=require("fs"),os=require("os"),path=require("path"),{spawnSync}=require("child_process");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const {find,hasClass,texts}=P;
const FM='---\nbooklet: "0.13"\nid: local/tabs\ntitle: "Tabs"\nlang: en\n---\n\n';
const A=P.boot();
const role=r=>find(P.main(),n=>n.attrs&&n.attrs.role===r);
const draw=id=>{A.screen=id;A.render();return P.main();};
const key=(n,k)=>n._on.keydown({key:k,preventDefault(){}});
const click=n=>n._on.click({target:n,currentTarget:n,preventDefault(){}});

const ACT=FM+"> [!activity|plan] Plan\n\nThe opening, on every tab.\n\n"+
  "> [!tab] Learn the Ideas!\n\nWhy it works.\n\n"+
  "> [!tab|do] Do it\n\nTry it now.\n\n> [!text|first] First?\n\n***\n\n> [!text|second] Second?\n\n"+
  "> [!tab] Look back\n\n> [!text|third] Third?\n";

/* 1. the parse */
{const R=A.parseFile(ACT),a=R.template.modules[0].activities[0];
 chk("an activity of three tab lines opens with nothing said",R.ok&&R.unread.length===0&&R.refused.length===0,JSON.stringify(R.unread));
 chk("its tabs, in order: a name with no id is its id (lowercase, a dash for each run of anything else), a written id is kept",
   JSON.stringify(a.tabs)==='[{"id":"learn-the-ideas","title":"Learn the Ideas!"},{"id":"do","title":"Do it"},{"id":"look-back","title":"Look back"}]',JSON.stringify(a.tabs));
 chk("the prose before the first tab line is the opening: a page in no tab",a.pages[0].tab===undefined&&/The opening/.test(a.pages[0].blocks[0].text));
 chk("each tab's pages name it, and a break inside a tab still splits it into pages",a.pages.map(p=>p.tab||"-").join()==="-,learn-the-ideas,do,do,look-back",a.pages.map(p=>p.tab||"-").join());
 chk("a page has no name: only its place, its tab and its blocks",a.pages.every(p=>Object.keys(p).every(k=>["id","tab","blocks"].includes(k))),JSON.stringify(a.pages.map(Object.keys)));
 chk("answers are the activity's, keyed by question: no tab or page is in a question's id",
   a.pages.flatMap(p=>p.blocks).filter(b=>b.type==="text").map(b=>b.id).join()==="first,second,third");
 chk("accents go, as for every derived id",A.parseFile(FM+"> [!activity|a] A\n\n> [!tab] Écrire ça\n\nx\n\n> [!tab] B\n\ny\n").template.modules[0].activities[0].tabs[0].id==="ecrire-ca");
 const twice=A.parseFile(FM+"> [!activity|a] A\n\n> [!tab] Learn\n\nx\n\n> [!tab] Learn\n\ny\n\n> [!tab|learn] Again\n\nz\n");
 chk("two tabs of one name: the file opens, both are kept, the second and third numbered",twice.ok&&twice.template.modules[0].activities[0].tabs.map(t=>t.id).join()==="learn,learn-2,learn-3",JSON.stringify(twice.template.modules[0].activities[0].tabs));
 chk("and each clash is among the file's problems, naming the line and the id it was given",twice.unread.length===2&&/line 14.*“learn”.*“learn-2”/.test(twice.unread[0])&&/“learn-3”/.test(twice.unread[1]),JSON.stringify(twice.unread));
 const apart=A.parseFile(FM+"> [!activity|a] A\n\n> [!tab] Notes\n\nx\n\n> [!activity|b] B\n\n> [!tab] Notes\n\ny\n");
 chk("tab ids are one activity's: two activities may each have a tab of one name",apart.ok&&apart.unread.length===0,JSON.stringify(apart.unread));
 const clash=A.parseFile(FM+"> [!activity|a] A\n\n> [!tab|notes] Notes\n\n> [!text|notes] Notes?\n");
 chk("a tab id is not claimed among the module's ids: a question may share it",clash.ok&&clash.unread.length===0,JSON.stringify(clash.unread));
 const stray=A.parseFile(FM+"> [!tab] Nowhere\n\nx\n\n> [!activity|a] A\n\nWords.\n");
 chk("a tab line outside an activity and a module's opening is ignored and said",stray.ok&&stray.unread.some(x=>/tab line belongs inside an activity/.test(x)),JSON.stringify(stray.unread));
 const plain=A.parseFile(FM+"Words first.\n\n> [!tab] One\n\nx\n\n> [!tab] Two\n\ny\n");
 chk("a file with no activity line is one activity, and may have tabs",plain.ok&&plain.unread.length===0&&plain.template.modules[0].activities[0].tabs.length===2,JSON.stringify(plain.unread));
 const one=A.parseFile(FM+"> [!activity|a] A\n\nNo tabs.\n\n***\n\nTwo pages.\n").template.modules[0].activities[0];
 chk("an activity with no tab line has no tabs",one.tabs===undefined&&one.pages.length===2);
 const row=A.parseFile(FM+"> [!activity|a] A\n\n> [!row]\n\n## One\n\nx\n\n> [!tab] T\n\ny\n");
 chk("a row runs to a tab line, and says so",row.ok&&row.unread.some(x=>/runs into a tab line/.test(x)),JSON.stringify(row.unread));}

/* 2. a module's tabs, `tab:` and `pin:off` */
const MOD=FM+"> [!module|m] M\n\nThe module's words.\n\n> [!tab|learn] Learn\n\n> [!tab] Practice\n\nWhat practice is for.\n\n"+
  "> [!activity|a] Read first\n\nWords.\n\n> [!activity|b tab:practice] Try\n\n> [!text|q] Q?\n\n"+
  "> [!activity|c tab:learn pin:off] More\n\nMore words.\n\n> [!text|q2] Q2?\n\n> [!module|m end] End\n";
{const R=A.parseFile(MOD),m=R.template.modules[0];
 chk("a module's tab lines declare its tabs, and its opening keeps its words, not its tab lines",R.ok&&R.unread.length===0&&m.tabs.map(t=>t.id+":"+t.title).join()==="learn:Learn,practice:Practice"&&m.blurb==="The module's words.",JSON.stringify([m.tabs,m.blurb,R.unread]));
 chk("the prose after a tab line in the opening is that tab's, not the module's opening",!m.tabs[0].blocks&&/What practice is for/.test(m.tabs[1].blocks[0].text)&&m.opening.every(b=>!/What practice/.test(b.text||"")),JSON.stringify([m.tabs,m.opening]));
 chk("`tab:` puts an activity in a tab; with none it is in the first",m.activities.map(a=>A.moduleTabOf(m,a)).join()==="learn,practice,learn");
 chk("`pin:off` is kept on the activity",m.activities.map(a=>a.pin===false).join()==="false,false,true");
 const bad=A.parseFile(MOD.replace("tab:practice","tab:nope").replace("pin:off","pin:maybe"));
 const bm=bad.template.modules[0];
 chk("`tab:` naming no tab: the activity is in the first, and it is said",bad.ok&&A.moduleTabOf(bm,bm.activities[1])==="learn"&&bad.unread.some(x=>/`tab:nope` names no tab/.test(x)),JSON.stringify(bad.unread));
 chk("`pin:` other than off is ignored, and said",bm.activities[2].pin!==false&&bad.unread.some(x=>/`pin:maybe` is not a setting/.test(x)));
 chk("`tab:` in a module with no tabs is said",A.parseFile(FM+"> [!module|m] M\n\n> [!activity|a tab:x] A\n\nx\n\n> [!module|m end] E\n").unread.some(x=>/`tab:x` names no tab/.test(x)));
 chk("tab and pin are activity settings in KIND_SETTINGS, and tab a kind with none",A.KIND_SETTINGS.activity.includes("tab:")&&A.KIND_SETTINGS.activity.includes("pin:")&&Array.isArray(A.KIND_SETTINGS.tab)&&A.KIND_SETTINGS.tab.length===0);}

/* 3. the tab bar, the opening and the panel */
{A.loadText(ACT);draw("plan");
 const bar=role("tablist"),tabs=role("tab"),panel=role("tabpanel");
 chk("an activity of tabs draws one tab bar, a tab for each, the first selected",bar.length===1&&tabs.map(texts).join("|")==="Learn the Ideas!|Do it|Look back"&&tabs.map(t=>t.attrs["aria-selected"]).join()==="true,false,false");
 chk("only the selected tab is in the Tab order, and every tab controls the one panel, which names it",tabs.map(t=>t.attrs.tabindex).join()==="0,-1,-1"&&tabs.every(t=>t.attrs["aria-controls"]==="tbpanel")&&panel.length===1&&panel[0].attrs.id==="tbpanel"&&panel[0].attrs["aria-labelledby"]===tabs[0].attrs.id);
 chk("the panel is in the Tab order, so a tab of prose alone can be reached and read",panel[0].attrs.tabindex==="0");
 const col=find(P.main(),hasClass("col"))[0],kids=col.children.filter(x=>x&&typeof x==="object");
 const at=f=>kids.findIndex(f);
 chk("the opening is drawn above the bar",/The opening/.test(texts(kids[at(k=>/The opening/.test(texts(k)))]))&&at(k=>/The opening/.test(texts(k)))<at(k=>k.attrs.role==="tablist"));
 chk("the first tab's content is in the panel, the others' not",/Why it works/.test(texts(panel[0]))&&!/Try it now/.test(texts(P.main())));
 key(tabs[0],"ArrowRight");
 chk("Right arrow shows the next tab, with its own content, the opening still above",role("tab").map(t=>t.attrs["aria-selected"]).join()==="false,true,false"&&/Try it now/.test(texts(role("tabpanel")[0]))&&/The opening/.test(texts(P.main()))&&!/Why it works/.test(texts(P.main())));
 key(role("tab")[0],"ArrowLeft");
 chk("Left arrow from the first goes round to the last",role("tab").map(t=>t.attrs["aria-selected"]).join()==="false,false,true");
 key(role("tab")[2],"Home");
 chk("Home goes to the first",role("tab")[0].attrs["aria-selected"]==="true");
 click(role("tab")[1]);
 chk("a click shows that tab",role("tab")[1].attrs["aria-selected"]==="true");
 A.loadText(FM+"> [!activity|a] A\n\nOpening.\n\n> [!tab] Only\n\nAlone.\n");draw("a");
 chk("an activity of one tab draws no bar (one tab is no choice)",role("tablist").length===0&&/Alone/.test(texts(P.main())));
 A.loadText(FM+"> [!activity|a] A\n\nNo tab here.\n");draw("a");
 chk("an activity with no tab line draws no bar",role("tablist").length===0);}

/* 4. answers stay put, whichever tab is on show */
{P.wipe();const B=P.boot();B.loadText(ACT);
 const box=()=>find(P.main(),n=>n.tagName==="textarea")[0];
 B.screen="plan";B.render();click(role("tab")[1]);
 const t=box();t.value="typed on Do it";t._on.input();
 click(role("tab")[0]);click(role("tab")[2]);click(role("tab")[1]);
 chk("a typed answer is there after showing two other tabs and coming back",box().value==="typed on Do it",String(box()&&box().value));
 chk("and the draft is the activity's, by the question's id",B.answersFor("plan").first==="typed on Do it",JSON.stringify(B.answersFor("plan")));
 chk("the saved file holds it under the question's id, with no tab or page in it",/"first": "typed on Do it"/.test(B.toMarkdown())&&!/"(do|learn-the-ideas|p\d)"\s*:/.test(B.toMarkdown().slice(B.toMarkdown().indexOf("%%"))));}

/* 5. a module's screen: a tab bar above the list, each tab listing its own */
{A.loadText(MOD);draw(A.moduleScreen("m"));
 const cardsNow=()=>find(role("tabpanel")[0]||{children:[]},hasClass("t")).map(texts);
 chk("a module of two tabs draws a tab bar on its screen, its first tab selected",role("tablist").length===1&&role("tab").map(texts).join("|")==="Learn|Practice"&&role("tab")[0].attrs["aria-selected"]==="true");
 const listed=()=>["Read first","Try","More"].filter(t=>texts(role("tabpanel")[0]).includes(t)).join();
 chk("the first tab lists the activities in it: the one with no tab: and the one with tab:learn",listed()==="Read first,More",listed());
 click(role("tab")[1]);
 chk("the second lists its own, under its words",listed()==="Try"&&/What practice is for/.test(texts(role("tabpanel")[0])),listed());
 chk("the module's own words stay above the bar",/The module's words/.test(texts(P.main())));
 draw("m/a");draw(A.moduleScreen("m"));
 chk("opening an activity puts the overview on its tab: back from Read first, Learn is on show",role("tab")[0].attrs["aria-selected"]==="true"&&listed()==="Read first,More",listed());
 const R=A.parseFile(MOD);
 chk("cards keep their numbers in the module, whichever tab lists them",(()=>{click(role("tab")[1]);return /2/.test(texts(find(role("tabpanel")[0],hasClass("card"))[0]||{children:[]}));})());}

/* 5b. a wiki module (activities under one another, `parent:`) with tabs: a tab lists the pages at the top that are in it; the
   ones under them stay under them */
{const WK=FM+"> [!module|w] W\n\n> [!tab] Guide\n\n> [!tab] Tools\n\n> [!activity|top] Top\n\nTop words.\n\n> [!activity|kid parent:top tab:tools] Kid\n\nKid words.\n\n"+
   "> [!activity|tool tab:tools] Tool\n\nTool words.\n\n> [!module|w end] End\n";
 A.loadText(WK);draw(A.moduleScreen("w"));
 const cardsIn=()=>["Top","Kid","Tool"].filter(t=>find(role("tabpanel")[0]||{children:[]},hasClass("card")).some(c=>texts(c).includes(t))).join();
 chk("a wiki module with tabs draws its tab bar, and the first tab lists its top page",role("tablist").length===1&&cardsIn()==="Top",cardsIn());
 click(role("tab")[1]);
 chk("the second lists its own top page; a page under another stays under it, whatever its tab:",cardsIn()==="Tool",cardsIn());
 draw("w/kid");draw(A.moduleScreen("w"));
 chk("opening a page under another puts the overview on its top page's tab",role("tab")[0].attrs["aria-selected"]==="true");}

/* 6. the frame: the prose before the first question stays in view */
{const T=FM+"> [!activity|a] A\n\nRead this first.\n\nAnd this.\n\n> [!text|q1] One?\n\n> [!hint]-\n> A hint.\n\nBetween.\n\n> [!text|q2] Two?\n\n> [!text|q3] Three?\n\n***\n\n> [!text|q4] Four?\n\n"+
   "> [!activity|b pin:off] B\n\nRead this.\n\n> [!text|qb] Q?\n\n> [!activity|c] C\n\n> [!text|qc] Q?\n\nAfter.\n\n"+
   "> [!activity|d] D\n\n> [!tab] One\n\nTab one's frame.\n\n> [!text|x] X?\n\n> [!tab] Two\n\nJust prose.\n";
 const R=A.parseFile(T);
 chk("(the file opens clean)",R.ok&&R.unread.length===0&&R.refused.length===0,JSON.stringify([R.unread,R.refused].map(String)));
 A.loadText(T);
 const f=A.frameOf(A.activityOf("a"),null);
 chk("the frame is the prose before the first question, on the first page",f&&f.page==="p1"&&f.blocks.length===1&&/Read this first[\s\S]*And this/.test(f.blocks[0].text)&&!/Between/.test(f.blocks.map(b=>b.text).join()),JSON.stringify(f));
 chk("pin:off: no frame",A.frameOf(A.activityOf("b"),null)===null);
 chk("an activity that opens on a question has none",A.frameOf(A.activityOf("c"),null)===null);
 {const fr=t=>{const B=P.boot();B.loadText(FM+"> [!activity|r] R\n\n"+t+"\n\n> [!text|q] Q?\n");return B.frameOf(B.activityOf("r"),null);};
  chk("prose with a heading before the first question is reading, not a frame",fr("Intro.\n\n## Why\n\nWords.")===null);
  chk("so is prose with a callout",fr("Intro.\n\n> [!note]- More\n> Folded.")===null);
  chk("a list and a table are plain prose",fr("- one\n- two\n\n| a | b |\n| --- | --- |\n| 1 | 2 |")!==null);
  chk("a heading underlined with = or - is a heading: reading",fr("Before you start\n================\n\nAnswer.")===null&&fr("Before you start\n-\n\nAnswer.")===null);
  chk("so is prose with HTML in it, and prose with a code fence",fr("<h3>Before you start</h3>\n\nAnswer.")===null&&fr("<!-- a note -->\n\nAnswer.")===null&&fr("Run:\n\n```sh\nls\n```")===null&&fr("Run:\n\n~~~\nls\n~~~")===null);
  chk("a link in angle brackets, a tag inside a line, and a # with no space are plain",fr("See <https://example.org>.")!==null&&fr("Answer the <b>two</b> questions.")!==null&&fr("#1 is the first.")!==null);}
 chk("with tabs, each tab's own: the prose before its first question, none for a tab of prose",(()=>{const d=A.activityOf("d"),f1=A.frameOf(d,"one");return f1&&/Tab one's frame/.test(f1.blocks[0].text)&&A.frameOf(d,"two")===null;})());
 chk("the question's hint stays with it, and the prose between questions goes with the question after: the steps of the page",(()=>{const a=A.activityOf("a"),b=a.pages[0].blocks;
   return A.stepUnits(b.slice(f.blocks.length)).map(u=>u.blocks.map(x=>x.type).join("+")).join(" | ")==="text | markdown+text | text"&&b[1].hint&&/A hint/.test(JSON.stringify(b[1].hint));})());
 const pin=()=>find(P.main(),hasClass("pin"));
 global.__ls[A.OAT_KEY+A.currentId]="all";draw("a");
 chk("drawn all at once, the frame is held under the bar (pin-stick), and drawn once",pin().length===1&&/pin-stick/.test(pin()[0].attrs.class)&&texts(P.main()).split("Read this first").length===2);
 chk("it is drawn whole: nothing in it shows or hides it, and nothing cuts it short",find(pin()[0],n=>String(n.tagName).toLowerCase()==="button").length===0&&!/pin-(long|more|open)/.test(JSON.stringify(pin()[0].attrs)));
 global.__ls[A.OAT_KEY+A.currentId]="one";draw("a");
 chk("one at a time, it stays above the steps and is not held (it is above every step)",pin().length===1&&!/pin-stick/.test(pin()[0].attrs.class)&&find(P.main(),hasClass("oat-unit")).length===3);
 chk("it is not one of the steps",find(P.main(),hasClass("oat-unit")).every(u=>!/Read this first/.test(texts(u))));
 A.turnPage("a",A.activityOf("a").pages[1],false);
 chk("on the activity's next page the frame is drawn again",pin().length===1&&/Read this first/.test(texts(pin()[0]))&&/Four/.test(texts(P.main())));
 draw("b");
 chk("pin:off: the prose is drawn where it stands, with no frame",pin().length===0&&/Read this/.test(texts(P.main())));
 draw("d");
 chk("a tab's frame is drawn on that tab",pin().length===1&&/Tab one's frame/.test(texts(pin()[0])));
 A.chooseTab("d","two");
 chk("and not on a tab that has none",pin().length===0);}

/* 6b. a frame is short: it is pinned only when it fits whole in the pin's height, min(7.5em, 22vh) of its own text as
   drawn; one taller is reading, drawn where it stands on its own page, nothing cut. node has no layout: the drawing is
   measured here with a stand-in (a node's height is a quarter of its text's length, in px); the real one is tabs-browser.js */
{const gcs=global.getComputedStyle,ih=global.window.innerHeight;
 const tall=h=>A.frameTall({body:{isConnected:true,getBoundingClientRect:()=>({height:h})}});
 global.getComputedStyle=()=>({fontSize:"16px"});global.window.innerHeight=844;
 const at844=[tall(118),tall(125)];global.window.innerHeight=400;const at400=[tall(86),tall(92)];
 chk("the pin's height is 7.5em of the frame's text, or 22vh when that is less",at844.join()==="false,true"&&at400.join()==="false,true",JSON.stringify([at844,at400]));
 chk("a frame with nothing to measure (not drawn, as in this test's own drawing) is not tall",A.frameTall({body:{isConnected:false}})===false);
 global.window.innerHeight=844;
 const mk=global.document.createElement;
 global.document.createElement=t=>{const n=mk(t);n.isConnected=true;n.getBoundingClientRect=()=>({height:n.textContent.length/4,top:0});return n;};
 const LONG=("Kettles were once heated on open fires, and the shape of the spout followed from how the steam had to leave the body. "+
   "Over the years the handle moved, the lid grew a knob, and the base widened so the kettle would not tip on a hearth. ").repeat(3)+"The shape still answers the same old questions.";
 A.loadText(FM+"> [!activity|r] R\n\n"+LONG+"\n\n> [!text|r1] One?\n\n> [!text|r2] Two?\n\n> [!text|r3] Three?\n\n***\n\n> [!text|r4] Four?\n\n"+
   "> [!activity|s] S\n\nAnswer the questions. Skip any you like.\n\n> [!text|s1] One?\n\n> [!text|s2] Two?\n\n> [!text|s3] Three?\n");
 const pin=()=>find(P.main(),hasClass("pin"));
 global.__ls[A.OAT_KEY+A.currentId]="all";draw("r");
 chk("(the reading is "+LONG.length+" characters, ending in questions)",LONG.length>=700);
 chk("a long plain reading before the first question is not pinned: drawn as reading, whole, once",pin().length===0&&texts(P.main()).includes(LONG.slice(-60))&&texts(P.main()).split("Kettles were once").length===4);
 global.__ls[A.OAT_KEY+A.currentId]="one";draw("r");
 const units=()=>find(P.main(),hasClass("oat-unit"));
 chk("one at a time, it is the first step's, as prose before a question is, not above every step",pin().length===0&&units().length===3&&/Kettles/.test(texts(units()[0]))&&!/Kettles/.test(texts(units()[1])));
 A.turnPage("r",A.activityOf("r").pages[1],false);
 chk("and not on the next page: reading is its page's",!/Kettles/.test(texts(P.main()))&&/Four/.test(texts(P.main())));
 global.__ls[A.OAT_KEY+A.currentId]="all";draw("s");
 chk("a short line of instructions is pinned, whole",pin().length===1&&/pin-stick/.test(pin()[0].attrs.class)&&/Skip any you like/.test(texts(pin()[0])));
 global.document.createElement=mk;global.getComputedStyle=gcs;global.window.innerHeight=ih;}

/* 6c. links: to a module's tab, and to a heading in the opening of an activity with tabs */
{const L=FM+"> [!module|m] M\n\n> [!tab] This month\n\n> [!tab|learn] Learn more\n\nWhy budgets help.\n\n"+
   "> [!activity|spend] Spending\n\nSee [[#Learn more]].\n\n> [!text|q] Q?\n\n> [!activity|why tab:learn] Why\n\nWords.\n\n> [!module|m end] End\n";
 A.loadText(L);
 const hit=A.findHeading(A.allModules(),"Learn more",false),bySlug=A.findHeading(A.allModules(),"learn-more",true);
 chk("a link to a module's tab name finds the tab, by its words and by its slug",hit&&hit.mod==="m"&&hit.mtab==="learn"&&bySlug&&bySlug.mtab==="learn",JSON.stringify([hit,bySlug]));
 draw("m/spend");
 const ln=find(P.main(),n=>n.tagName==="a"&&/Learn more/.test(texts(n)))[0];
 chk("it is drawn as a link",!!ln);
 if(ln) click(ln);
 chk("followed, it opens the module's screen on that tab",A.screen===A.moduleScreen("m")&&role("tab").map(t=>t.attrs["aria-selected"]).join()==="false,true"&&/Why budgets help/.test(texts(role("tabpanel")[0]||{children:[]})),A.screen);
 chk("a module of one activity has no screen: its tab names lead nowhere",A.findHeading(A.parseFile(FM+"> [!module|o] O\n\n> [!tab] Only\n\n> [!activity|a] A\n\nx\n\n> [!module|o end] E\n").template.modules,"Only",false)===null);
 A.loadText(FM+"> [!activity|t] T\n\n## Before you start\n\nRead this.\n\n> [!tab] One\n\nSee [[#Before you start]].\n\n> [!tab] Two\n\nAlso [[#Before you start]].\n");
 draw("t");click(role("tab")[1]);
 const back=find(P.main(),n=>n.tagName==="a"&&/Before you start/.test(texts(n)))[0];
 chk("(on the second tab, a link to a heading in the opening)",!!back&&role("tab")[1].attrs["aria-selected"]==="true");
 if(back) click(back);
 chk("followed, the tab on show stays: the opening is above every tab",role("tab")[1].attrs["aria-selected"]==="true"&&/Also/.test(texts(role("tabpanel")[0]||{children:[]})));}

/* 7. the linter */
{const LINT=path.join(__dirname,"..","lint-booklet.py");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"tabs-"));
 const lint=(name,text)=>{const f=path.join(dir,name);fs.writeFileSync(f,text);const r=spawnSync("python3",[LINT,f],{encoding:"utf8"});
   return {out:r.stdout,status:r.status,errors:r.stdout.split("\n").filter(l=>l.startsWith("ERROR"))};};
 const ok=lint("ok.booklet.md",ACT);
 chk("the linter passes an activity of tabs",ok.status===0&&ok.errors.length===0,ok.out);
 const okm=lint("okm.booklet.md",MOD);
 chk("and a module of tabs with tab: and pin:off",okm.status===0&&okm.errors.length===0,okm.out);
 const two=lint("two.booklet.md",FM+"> [!activity|a] A\n\n> [!tab] Learn\n\nx\n\n> [!tab|learn] Again\n\ny\n");
 chk("two tabs of one id: an error naming both lines",two.errors.length===1&&/learn/.test(two.errors[0])&&/line 14/.test(two.errors[0])&&/line 10/.test(two.errors[0]),two.out);
 const twom=lint("twom.booklet.md",FM+"> [!module|m] M\n\n> [!tab] One\n\n> [!tab] One\n\n> [!activity|a] A\n\nx\n\n> [!module|m end] E\n");
 chk("in a module's opening too",twom.errors.length===1&&/one/.test(twom.errors[0]),twom.out);
 const unk=lint("unk.booklet.md",MOD.replace("tab:practice","tab:nope"));
 chk("`tab:` naming no tab of the module: an error",unk.errors.length===1&&/tab:nope|nope/.test(unk.errors[0]),unk.out);
 const pin=lint("pin.booklet.md",MOD.replace("pin:off","pin:maybe"));
 chk("`pin:` other than off: an error",pin.errors.length===1&&/pin/.test(pin.errors[0]),pin.out);
 const stray=lint("stray.booklet.md",FM+"> [!tab] Nowhere\n\nx\n\n> [!activity|a] A\n\nWords.\n");
 chk("a tab line outside an activity and a module's opening: an error",stray.errors.length===1&&/tab/.test(stray.errors[0]),stray.out);
 const plain=lint("plain.booklet.md",FM+"Words first.\n\n> [!tab] One\n\nx\n\n> [!tab] Two\n\ny\n");
 chk("a file with no activity line may have tabs",plain.errors.length===0,plain.out);
 const warns=r=>r.out.split("\n").filter(l=>l.startsWith("warn"));
 const solo=lint("solo.booklet.md",FM+"> [!module|solo] Solo\n\nOpening.\n\n> [!tab] Read\n\nNever drawn.\n\n> [!tab] More\n\n> [!activity|only] Only\n\nx\n\n> [!module|solo end] E\n");
 chk("tab lines in a module of one activity: a warning, once, at the first (no screen to show them on)",solo.errors.length===0&&warns(solo).length===1&&/line 12: .*one activity.*never drawn/.test(warns(solo)[0]),solo.out);
 chk("a module of two activities may have tabs, with no warning",warns(okm).length===0,okm.out);
 const indata=lint("indata.booklet.md",FM+"> [!activity|a] A\n\nx\n\n> [!data] Data\n\n> [!tab] In data\n\ny\n");
 chk("a tab line in a data section: a warning that it is not read",indata.errors.length===0&&warns(indata).length===1&&/line 14: a tab line in a data section is not read/.test(warns(indata)[0]),indata.out);
 fs.rmSync(dir,{recursive:true,force:true});}

console.log(fails?"\n"+fails+" FAILURES":"\ntabs checks passed");P.closePages();process.exit(fails?1:0);
