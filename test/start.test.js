// Format v0.11: a booklet that is one activity or one module opens straight into it, unless its front matter says
// `start: home`. The rule is startScreen(); it is applied when a booklet is opened (a file, a paste, a drop, "Your
// booklets") and never when a module is added. Run: node test/start.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const head=(extra="")=>`---\nbooklet: "0.11"\ntitle: Start\nlang: en\n${extra}---\n\n`;
const act=(id,t="Act")=>`> [!activity|${id}] ${t}\n\n> [!text|${id}-q] Q ${id}\n\n`;
const FILES={
  bare:  head()+act("only"),
  oneOne:head()+"> [!module|m] M\n\n"+act("a")+"> [!module|m end] End\n",
  oneThree:head()+"> [!module|m] M\n\n"+act("a")+act("b")+act("c")+"> [!module|m end] End\n",
  two:   head()+"> [!module|m] M\n\n"+act("a")+"> [!module|m end] End\n\n> [!module|n] N\n\n"+act("c")+"> [!module|n end] End\n",
  empty: head(),
};
const withHome=t=>t.replace("lang: en\n","lang: en\nstart: home\n");
const open=(text)=>{P.wipe();const A=P.boot();A.loadText(text);return A;};
const where=A=>A.screen;
{const A=open(FILES.bare);
 chk("a file that is one bare activity opens in it",where(A)==="only"&&A.bookActivities().length===1,where(A));}
{const A=open(FILES.oneOne);
 chk("one module with one activity opens in the activity (its internal address is moduleId/activityId)",where(A)==="m/a",where(A));
 chk("the back control leads to the home screen",(A.homeButton(),A.screen==="home"),A.screen);}
{const A=open(FILES.oneThree);
 chk("one module with three activities opens on that module's own screen",where(A)===A.moduleScreen("m"),where(A));
 chk("...and its back control leads to the home screen",(A.homeButton(),A.screen==="home"),A.screen);}
{const A=open(FILES.two);
 chk("two modules open on the home screen, as before",where(A)==="home",where(A));}
{const A=open(FILES.empty);
 chk("an empty booklet opens on the home screen",where(A)==="home",where(A));}
for(const k of ["bare","oneOne","oneThree"]){const A=open(withHome(FILES[k]));
 chk(`start: home on the "${k}" file keeps it on the home screen, with nothing reported`,where(A)==="home"&&A.BOOK.start==="home"&&A.parseFile(withHome(FILES[k])).unread.length===0,where(A));}
{const T=FILES.oneOne.replace("lang: en\n","lang: en\nstart: later\n"),R=P.boot().parseFile(T);
 chk("any other value of start is reported, and ignored",R.ok&&R.unread.length===1&&/start: later/.test(R.unread[0])&&/start: home/.test(R.unread[0])&&!R.template.start,JSON.stringify(R.unread));
 const A=open(T);
 chk("...so the file opens by the ordinary rule, with the report shown on the screen it opened into",where(A)==="m/a"&&P.find(P.main(),P.hasClass("filenotes")).length===1,where(A));}
{/* a new booklet started here, and adding a module, go nowhere */
 P.wipe();const A=P.boot();A.render();
 A.createBooklet();
 chk("a new booklet started in the browser opens on the home screen",where(A)==="home",where(A));
 chk("...and adding one module to it does not jump anywhere",(A.addModuleText(FILES.oneOne).ok,where(A)==="home"),where(A));
 const B=open(FILES.bare);const before=where(B);
 const r=B.addModuleText(FILES.oneOne);
 chk("a booklet that opened into its one activity stays where it is when a module is added",r.ok&&where(B)===before,JSON.stringify(r.problems)+" "+where(B));}
{/* from "Your booklets" */
 P.wipe();const A=P.boot();A.loadText(FILES.oneThree);const id1=A.currentId;A.flushSave();
 A.loadText(FILES.oneOne);const id2=A.currentId;A.flushSave();
 A.loadText(withHome(FILES.oneOne));const id3=A.currentId;A.flushSave();
 A.loadText(FILES.two);const id4=A.currentId;A.flushSave();
 const go=id=>{A.closeBooklet();A.openFromList(id);return A.screen;};
 chk("opening a kept booklet from the list: one module of three activities opens on the module",go(id1)===A.moduleScreen("m"),A.screen);
 chk("...one module with one activity opens in the activity",go(id2)==="m/a",A.screen);
 chk("...start: home survives being kept, and opens on the home screen",go(id3)==="home"&&A.BOOK.start==="home",A.screen);
 chk("...two modules open on the home screen",go(id4)==="home",A.screen);
 chk("...and the back control from the activity leads home",(go(id2),A.homeButton(),A.screen==="home"),A.screen);}
{/* a file with another marker: the notice is the first thing on the screen it opens into */
 const A=open(FILES.oneOne.replace('booklet: "0.11"','booklet: 0.9'));
 const note=P.find(P.main(),P.hasClass("filenotes"))[0];
 chk("a 0.9 file of one activity opens in it, with the marker notice on that screen",where(A)==="m/a"&&!!note&&/booklet: 0\.9/.test(P.texts(note)),where(A)+" "+(note?P.texts(note):"no notice"));
 const first=A.FILE_NOTES&&A.FILE_NOTES.marker;
 chk("...and the notice's first line is the marker sentence, apart from the count",/^This file says booklet: 0\.9\./.test(first||"")&&A.FILE_NOTES.list.length===0,first);
 chk("...and nothing is counted as a thing the page could not read: that line is not shown",!/could not read/.test(P.texts(note)),P.texts(note));}
console.log(fails?"\n"+fails+" FAILURES":"\nstart checks passed");P.closePages();process.exit(fails?1:0);
