// Tabs (0.15, SPEC.md section 3): a tab line in an activity starts a tab, and in a module's opening declares the module's
// tabs; a tab with no id takes its name as one; two of one id are both kept, the second numbered, and said (the linter
// refuses them, naming both lines); `tab:` puts an activity in a module's tab. Drawn: the ARIA tab bar, the opening
// above it, a module's screen listing each tab's own activities, one at a time with the page's opening above it, and answers
// that stay put whichever tab is on show. The drawn geometry is test/tabs-browser.js. Run: node test/tabs.test.js
const P=require("./page.js");
const fs=require("fs"),os=require("os"),path=require("path"),{spawnSync}=require("child_process");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const {find,hasClass,texts}=P;
const FM='---\nbooklet: "0.17"\nid: local/tabs\ntitle: "Tabs"\nlang: en\n---\n\n';
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

/* 2. a module's tabs and `tab:` */
const MOD=FM+"> [!module|m] M\n\nThe module's words.\n\n> [!tab|learn] Learn\n\n> [!tab] Practice\n\nWhat practice is for.\n\n"+
  "> [!activity|a] Read first\n\nWords.\n\n> [!activity|b tab:practice] Try\n\n> [!text|q] Q?\n\n"+
  "> [!activity|c tab:learn] More\n\nMore words.\n\n> [!text|q2] Q2?\n\n> [!module|m end] End\n";
{const R=A.parseFile(MOD),m=R.template.modules[0];
 chk("a module's tab lines declare its tabs, and its opening keeps its words, not its tab lines",R.ok&&R.unread.length===0&&m.tabs.map(t=>t.id+":"+t.title).join()==="learn:Learn,practice:Practice"&&m.blurb==="The module's words.",JSON.stringify([m.tabs,m.blurb,R.unread]));
 chk("the prose after a tab line in the opening is that tab's, not the module's opening",!m.tabs[0].blocks&&/What practice is for/.test(m.tabs[1].blocks[0].text)&&m.opening.every(b=>!/What practice/.test(b.text||"")),JSON.stringify([m.tabs,m.opening]));
 chk("`tab:` puts an activity in a tab; with none it is in the first",m.activities.map(a=>A.moduleTabOf(m,a)).join()==="learn,practice,learn");
 const bad=A.parseFile(MOD.replace("tab:practice","tab:nope"));
 const bm=bad.template.modules[0];
 chk("`tab:` naming no tab: the activity is in the first, and it is said",bad.ok&&A.moduleTabOf(bm,bm.activities[1])==="learn"&&bad.unread.some(x=>/`tab:nope` names no tab/.test(x)),JSON.stringify(bad.unread));
 {const pin=A.parseFile(MOD.replace("tab:learn] More","tab:learn pin:off] More"));
  chk("`pin:` is no setting of an activity: said as one it does not take, like any other",pin.ok&&pin.unread.some(x=>/^line \d+: an activity line takes no “pin:”/.test(x)),JSON.stringify(pin.unread));}
 chk("`tab:` in a module with no tabs is said",A.parseFile(FM+"> [!module|m] M\n\n> [!activity|a tab:x] A\n\nx\n\n> [!module|m end] E\n").unread.some(x=>/`tab:x` names no tab/.test(x)));
 chk("tab is an activity setting in KIND_SETTINGS (pin is not), and tab a kind with none",A.KIND_SETTINGS.activity.includes("tab:")&&!A.KIND_SETTINGS.activity.some(k=>/^pin/.test(k))&&Array.isArray(A.KIND_SETTINGS.tab)&&A.KIND_SETTINGS.tab.length===0);}

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

/* 5c. a module tab's prose is the module's: a link in it finds a title in its own module, not a bare activity of the same
   title (renderModulePage draws the tab's blocks in the scope of the module's first activity) */
{const SC=FM+"> [!module|m] M\n\n> [!tab] This month\n\n> [!tab|learn] Learn more\n\nRead [[#Why it helps]] first.\n\n"+
   "> [!activity|spend] Spending\n\nWords.\n\n> [!text|q] Q?\n\n> [!activity|why tab:learn] Why it helps\n\nWords.\n\n> [!module|m end] End\n\n"+
   "> [!activity|why2] Why it helps\n\nA bare activity of the same title.\n";
 A.loadText(SC);draw(A.moduleScreen("m"));click(role("tab")[1]);
 const ln=find(role("tabpanel")[0]||{children:[]},n=>n.tagName==="a"&&/Why it helps/.test(texts(n)))[0];
 chk("a link in a module tab's prose is drawn",!!ln);
 if(ln) click(ln);
 chk("followed, it opens the title in the tab's own module, not the bare activity of the same title",A.screen==="m/why",A.screen);}

/* 5d. a footnote in a module tab's prose is the module's, as one in its opening is: drawn as its mark, numbered after the
   opening's, with its note at the foot of the screen (citeScope numbers the tabs' prose; renderModulePage draws their notes) */
{const FN=FM+"> [!module|m] M\n\nThe opening.[^a]\n\n> [!tab] This month\n\n> [!tab|learn] Learn more\n\nA claim.[^b]\n\n"+
   "> [!activity|spend] Spending\n\nWords.\n\n> [!activity|why tab:learn] Why it helps\n\nWords.\n\n"+
   "[^a]: *The opening's source*, p. 1\n\n[^b]: *The tab's source*, p. 2\n\n> [!module|m end] End\n";
 A.loadText(FN);draw(A.moduleScreen("m"));click(role("tab")[1]);
 const marks=find(P.main(),hasClass("rd-mark")),notes=find(P.main(),hasClass("rd-notes"))[0],seen=marks.map(n=>n.attrs["data-cite"]+"="+texts(n).trim()).join(" ");
 chk("the tab's footnote is drawn as a mark, not as its raw text",!/\[\^b\]/.test(texts(P.main()))&&marks.some(n=>n.attrs["data-cite"]==="b"),texts(P.main()));
 chk("numbered after the opening's: 1 and 2",seen==="a=1 b=2",seen);
 chk("its note is at the foot of the screen, with the opening's",!!notes&&/The opening's source/.test(texts(notes))&&/The tab's source/.test(texts(notes)),notes&&texts(notes));
 click(role("tab")[0]);
 chk("on a tab without it, only the opening's note",(()=>{const n=find(P.main(),hasClass("rd-notes"))[0];return !!n&&/The opening's source/.test(texts(n))&&!/The tab's source/.test(texts(n));})());
 /* and with no opening before the first tab line: the tab's prose alone */
 A.loadText(FN.replace("The opening.[^a]\n\n",""));draw(A.moduleScreen("m"));click(role("tab")[1]);
 const m2=find(P.main(),hasClass("rd-mark")),n2=find(P.main(),hasClass("rd-notes"))[0];
 chk("with no opening, the tab's footnote is mark 1 and its note is at the foot",m2.length===1&&m2[0].attrs["data-cite"]==="b"&&texts(m2[0]).trim()==="1"&&!!n2&&/The tab's source/.test(texts(n2)),texts(P.main()));
 /* its panel, opened from the mark, closes when the reader switches to a tab that draws no prose (and so no mark) */
 const citeIsOpen=()=>"data-cite-open" in global.document.documentElement.attrs;
 if(m2[0]) click(m2[0]);
 const wasOpen=citeIsOpen();click(role("tab")[0]);
 chk("a panel opened from the tab's mark closes on a switch to a tab with no prose",wasOpen&&!citeIsOpen(),"open before: "+wasOpen+", after: "+citeIsOpen());}

/* 6. one at a time, the steps are the groups of the part on show; what comes before its first group is its opening, drawn
   whole above every step: anything (a heading, prose, a callout, a question outside a group), however long, and in none of
   the steps; in the next `***` section, that section's own. A step draws its group open, though its author folded it; what
   comes between two groups goes with the one after. All at once the part is drawn as it stands, a folded group a fold */
{const LONG=("Kettles were once heated on open fires, and the shape of the spout followed from how the steam had to leave the body. ").repeat(6);
 const G=(t,q,f="")=>"> [!group]"+f+" "+t+"\n> > [!text|"+q+"] "+t+"?\n\n";
 const T=FM+"> [!activity|a] A\n\n## Before you start\n\nRead this first. "+LONG+"\n\n> [!note] Keep in mind\n> A callout.\n\n> [!text|q0] Before any group?\n\n"+
   "> [!group] One\n> > [!text|q1] One?\n>\n> > [!hint]-\n> > A hint.\n\nBetween.\n\n> [!text|loose] Loose?\n\n"+G("Two","q2","-")+G("Three","q3")+"***\n\n"+
   "Section two's words.\n\n"+G("Four","q4")+G("Five","q5")+G("Six","q6")+
   "> [!activity|t] T\n\nThe opening.\n\n> [!tab] One\n\nThe tab's words.\n\n"+G("T one","t1")+G("T two","t2")+G("T three","t3")+"> [!tab] Two\n\nJust prose.\n\n"+
   "> [!activity|u] U\n\n> [!text|u1] U1?\n\n> [!text|u2] U2?\n\n> [!text|u3] U3?\n\n> [!text|u4] U4?\n\n"+
   "> [!activity|r] R\n\n> [!group] Read first\n> Words to read, no question.\n\n"+G("R one","r1")+G("R two","r2");
 const R=A.parseFile(T);
 chk("(the file opens clean)",R.ok&&R.unread.length===0&&R.refused.length===0,JSON.stringify([R.unread,R.refused].map(String)));
 A.loadText(T);
 const body=()=>find(P.main(),hasClass("ap-body"))[0],units=()=>find(P.main(),hasClass("oat-unit"));
 const at=(re)=>body().children.findIndex(k=>re.test(texts(k))),oatAt=()=>body().children.findIndex(hasClass("oat"));
 global.__ls[A.OAT_KEY+A.currentId]="one";draw("a");
 chk("one at a time: three steps, a group each; the hint with its question in the first; the prose and the question between two groups with the one after",
   units().length===3&&/A hint/.test(texts(units()[0]))&&/Between/.test(texts(units()[1]))&&/Loose\?/.test(texts(units()[1]))&&/Two\?/.test(texts(units()[1])),units().map(texts).join(" | "));
 chk("a step draws its group open, its title and its question, though the author folded it",find(units()[1],hasClass("au-fold")).length===0&&find(units()[1],hasClass("rd-callout")).length===1&&/Two/.test(texts(find(units()[1],hasClass("rd-callout"))[0])));
 chk("what comes before the first group (a heading, prose, a callout and a question, "+LONG.length+" characters and more) is in none of the steps",units().every(u=>!/Before you start|Read this first|A callout|Before any group/.test(texts(u))));
 chk("...and is drawn whole, once, above them",at(/Read this first/)>=0&&at(/Read this first/)<oatAt()&&texts(body()).split("Read this first").length===2&&texts(body()).includes(LONG.trim().slice(-60))&&/A callout/.test(texts(body().children[at(/Read this first/)]))&&/Before any group/.test(texts(body().children[at(/Read this first/)])),
   JSON.stringify([at(/Read this first/),oatAt()]));
 A.DRAWN.oat.go(1);
 chk("at the next step it is still there, above it",at(/Read this first/)>=0&&at(/Read this first/)<oatAt()&&units()[1].attrs.hidden===undefined&&units()[0].attrs.hidden!==undefined);
 A.turnPage("a",A.activityOf("a").pages[1],false);
 chk("in the next `***` section, that section's own words are above its steps, and the first section's are not drawn",at(/Section two's words/)>=0&&at(/Section two's words/)<oatAt()&&units().length===3&&!/Read this first/.test(texts(P.main())),texts(body()).slice(0,200));
 draw("t");
 chk("in a tab, the tab's words are above its steps, under the activity's opening",at(/The tab's words/)>=0&&at(/The tab's words/)<oatAt()&&units().length===3&&/The opening/.test(texts(P.main())));
 draw("u");
 chk("questions outside every group make no steps: no step control, every question shown",find(P.main(),hasClass("oat-ctl")).length===0&&oatAt()<0&&/U4\?/.test(texts(body())));
 draw("r");
 chk("arriving, a step with no question is shown first while nothing after it is answered",units().length===3&&units()[0].attrs.hidden===undefined,units().map(u=>u.attrs.hidden===undefined));
 A.answersFor("r").r1="said";delete A.viewAt("r").steps[A.activityOf("r").pages[0].id];draw("r");
 chk("...and passed over (done) once a step after it holds an answer: the first step with a question to answer is shown",units()[2].attrs.hidden===undefined&&units()[0].attrs.hidden!==undefined,units().map(u=>u.attrs.hidden===undefined));
 global.__ls[A.OAT_KEY+A.currentId]="all";A.showPage("a",A.activityOf("a").pages[0].id);draw("a");
 chk("all at once, the part is drawn as it stands: its words, then its groups with their questions live, the folded one a fold; no steps",oatAt()<0&&texts(body()).indexOf("Read this first")<texts(body()).indexOf("One?")&&find(body(),hasClass("au-fold")).length===1&&find(find(body(),hasClass("au-fold"))[0],n=>n.tagName==="textarea").length===1);
}

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
 chk("and a module of tabs with tab:",okm.status===0&&okm.errors.length===0,okm.out);
 const two=lint("two.booklet.md",FM+"> [!activity|a] A\n\n> [!tab] Learn\n\nx\n\n> [!tab|learn] Again\n\ny\n");
 chk("two tabs of one id: an error naming both lines",two.errors.length===1&&/learn/.test(two.errors[0])&&/line 14/.test(two.errors[0])&&/line 10/.test(two.errors[0]),two.out);
 const twom=lint("twom.booklet.md",FM+"> [!module|m] M\n\n> [!tab] One\n\n> [!tab] One\n\n> [!activity|a] A\n\nx\n\n> [!module|m end] E\n");
 chk("in a module's opening too",twom.errors.length===1&&/one/.test(twom.errors[0]),twom.out);
 const unk=lint("unk.booklet.md",MOD.replace("tab:practice","tab:nope"));
 chk("`tab:` naming no tab of the module: an error",unk.errors.length===1&&/tab:nope|nope/.test(unk.errors[0]),unk.out);
 const pin=lint("pin.booklet.md",MOD.replace("tab:learn] More","tab:learn pin:off] More"));
 chk("`pin:off` on an activity: an error, a setting it does not take, like any other",pin.errors.length===1&&/activity line takes no `pin:` setting/.test(pin.errors[0]),pin.out);
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
 const nameless=FM+"> [!activity|a] A\n\n> [!tab] One\n\nx\n\n> [!tab] 日本語\n\ny\n\n> [!tab|tab-2] Two\n\nz\n";
 const nl=lint("nameless.booklet.md",nameless);
 chk("a name that leaves no id is `tab-` and its place, as a renderer makes it: a later tab of that id clashes with it, an error naming both lines",
   nl.errors.length===1&&/'tab-2'/.test(nl.errors[0])&&/line 18/.test(nl.errors[0])&&/line 14/.test(nl.errors[0]),nl.out);
 const R=A.parseFile(nameless);
 chk("(the renderer: the second tab is tab-2, the third numbered tab-2-2, and it is said)",JSON.stringify(R.template.modules[0].activities[0].tabs.map(t=>t.id))==='["one","tab-2","tab-2-2"]'&&R.unread.length+R.refused.length>=1,
   JSON.stringify([R.template.modules[0].activities[0].tabs,R.unread,R.refused]));
 const nlm=lint("namelessm.booklet.md",FM+"> [!module|m] M\n\n> [!tab] 日本語\n\n> [!tab|tab-1] Two\n\n> [!activity|a] A\n\nx\n\n> [!activity|b tab:tab-1] B\n\ny\n\n> [!module|m end] E\n");
 chk("in a module's opening too",nlm.errors.length===1&&/'tab-1'/.test(nlm.errors[0])&&/line 12/.test(nlm.errors[0])&&/line 10/.test(nlm.errors[0]),nlm.out);
 fs.rmSync(dir,{recursive:true,force:true});}

console.log(fails?"\n"+fails+" FAILURES":"\ntabs checks passed");P.closePages();process.exit(fails?1:0);
