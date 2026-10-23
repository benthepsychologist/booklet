// A card's parts (v0.15, SPEC.md section 3, "A card's parts"): the lines of the callout under an activity line are the text of its card's
// status line, `status:off` hides that line, the blurb is still the first paragraph, a wrong `status:` value is said and ignored, the
// words come in en, fr and es, and a booklet written back (Add a module, Remove a module, a copy) keeps both exactly as written.
// The layout of the cards as a contents list is test/contents-browser.js.
// Run: node test/cardparts.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs"),os=require("os"),path=require("path"),cp=require("child_process");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const {find,hasClass,texts}=P;
const FM='---\nbooklet: "0.13"\ntitle: "Parts"\nlang: en\n---\n\n';
const BODY=`> [!module|m] Module M

> [!activity|plain] Plain
First paragraph of Plain.

> [!text|q1] A question?

> [!activity|custom] Custom
> Half an hour a day,
> for a week

The blurb of Custom is this paragraph.

> [!text|q2] Another question?

> [!activity|quiet status:off] Quiet

The blurb of Quiet.

> [!text|q3] A third?

> [!activity|both status:off] Both
> Words that are not drawn

> [!text|q4] A fourth?

> [!module|m end] End
`;
const FILE=FM+BODY;
(async()=>{
const A=P.boot();

/* 1. what the parser does with the `>` lines under an activity line */
{const R=A.parseFile(FILE),acts=Object.fromEntries(R.template.modules[0].activities.map(a=>[A.shortId(a.id),a]));
 chk("the file is read with nothing refused and nothing said",R.ok&&R.unread.length===0,JSON.stringify(R.unread));
 chk("an activity with no lines under its line has no status text and is not switched off",acts.plain.status===undefined&&!acts.plain.statusOff);
 chk("the lines under an activity line are its status text, joined into one line",acts.custom.status==="Half an hour a day, for a week",JSON.stringify(acts.custom.status));
 chk("status:off sets statusOff",acts.quiet.statusOff===true&&acts.both.statusOff===true);
 chk("the blurb is still the first paragraph, not the status text",acts.custom.lede==="The blurb of Custom is this paragraph."&&acts.quiet.lede==="The blurb of Quiet."&&acts.plain.lede==="First paragraph of Plain.",JSON.stringify([acts.custom.lede,acts.quiet.lede,acts.plain.lede]));
 chk("the status text is not drawn as prose in the page",!/Half an hour/.test(JSON.stringify(acts.custom.pages)),JSON.stringify(acts.custom.pages).slice(0,200));
 chk("status text is read as inline Markdown, its marks taken off",A.parseFile(FM+"> [!activity|a] A\n> **Two** of _three_ [done](https://x.example)\n").template.modules[0].activities[0].status==="Two of three done");}

/* 2. the status line a card shows */
{A.loadText(FILE);
 const a=id=>A.activityOf("m/"+id);
 chk("an activity with no status text keeps the line the renderer works out",A.activityStatus(a("plain"))==="1 question · Not started",A.activityStatus(a("plain")));
 chk("an activity with status text shows that text in place of the line",A.activityStatus(a("custom"))==="Half an hour a day, for a week",A.activityStatus(a("custom")));
 chk("the text stays when the reader answers: it is the author's line",(()=>{A.answersFor("m/custom").q2="x";return A.activityStatus(a("custom"))==="Half an hour a day, for a week";})());
 chk("status:off gives no status line at all",A.activityStatus(a("quiet"))==="");
 chk("status:off wins over status text",A.activityStatus(a("both"))==="");
 A.screen="module:m";A.render();
 const cards=find(P.main(),hasClass("mode")),byName=n=>cards.find(c=>texts(find(c,hasClass("k"))[0])===n);
 chk("the module screen draws a card for each activity",cards.length===4,String(cards.length));
 chk("a card shows the author's status text",texts(find(byName("Custom"),hasClass("c"))[0])==="Half an hour a day, for a week");
 chk("a card with status:off has no status line",find(byName("Quiet"),hasClass("c")).length===0&&find(byName("Both"),hasClass("c")).length===0);
 chk("and keeps its blurb",texts(find(byName("Quiet"),hasClass("d"))[0])==="The blurb of Quiet.");
 chk("a card with nothing set keeps its automatic line",texts(find(byName("Plain"),hasClass("c"))[0])==="1 question · Not started");}

/* 3. status: takes only off */
{const R=A.parseFile(FM+"> [!activity|a status:hidden] A\n> kept words\n"),m=R.template.modules[0].activities[0];
 chk("status:hidden is said, once, and ignored (the line still reads)",R.ok&&R.unread.length===1&&/status:hidden/.test(A.problemText?A.problemText(R.unread[0]):String(R.unread[0])),JSON.stringify(R.unread));
 chk("and does not switch the line off; the text still counts",!m.statusOff&&m.status==="kept words");
 chk("other kinds take no status: (a text question)",A.parseFile(FM+"> [!activity|a] A\n\n> [!text|q status:off] Q?\n").unread.some(x=>/status:/.test(String(x)))); }

/* 4. KIND_SETTINGS holds status: on the activity line only */
chk("the activity line takes status:, no other kind does",A.KIND_SETTINGS.activity.includes("status:")&&Object.entries(A.KIND_SETTINGS).every(([k,v])=>k==="activity"||!v.includes("status:")));

/* 5. the words: the new message is in every language, with the setting in it */
for(const l of ["en","fr","es"]){const f=A.STRINGS_SRC[l].problem.statusBad;
 chk("statusBad exists in "+l+" and names the setting",typeof f==="function"&&/status:foo/.test(f("line 3","foo"))&&/status:off/.test(f("line 3","foo")),String(f&&f("line 3","foo")));}

/* 6. writing the booklet back keeps status:off and the status lines, as written */
{const lines=["> [!activity|quiet status:off] Quiet","> [!activity|custom] Custom","> Half an hour a day,","> for a week","> [!activity|both status:off] Both","> Words that are not drawn"];
 A.loadText(FILE);
 const out=A.toMarkdown();
 chk("the file written back holds every one of those lines unchanged",lines.every(l=>out.split("\n").includes(l)),out.slice(0,600));
 const re=A.parseFile(out).template.modules[0].activities;
 chk("and read again it means the same",re.find(a=>/custom/.test(a.id)).status==="Half an hour a day, for a week"&&re.find(a=>/quiet/.test(a.id)).statusOff===true&&re.find(a=>/both/.test(a.id)).statusOff===true);
 /* Add a module: the module comes in with its lines as written */
 await A.createBooklet();
 const added=A.addModuleText(FILE);
 chk("Add a module accepts a module with status text and status:off",added.ok,JSON.stringify(added.problems));
 const out2=A.toMarkdown();
 chk("the booklet written after Add a module holds every line unchanged",lines.every(l=>out2.split("\n").includes(l)),out2.slice(0,600));
 const shown=Object.fromEntries(A.allModules().find(m=>m.id==="m").activities.map(a=>[A.shortId(a.id),a]));
 chk("and the booklet in force draws them the same (text kept, status:off kept)",shown.custom.status==="Half an hour a day, for a week"&&shown.quiet.statusOff===true&&shown.both.statusOff===true);
 /* a second module with the same activity ids, then take it away again: the first module's lines stay as they were */
 const other=FM+"> [!module|n] Module N\n\n> [!activity|x status:off] X\n> Words of X\n\n> [!text|qx] Q?\n\n> [!module|n end] End\n";
 chk("a second module is added",A.addModuleText(other).ok);
 chk("and removed again",A.removeModule("n").ok);
 const out3=A.toMarkdown();
 chk("Remove a module leaves the other module's lines unchanged",lines.every(l=>out3.split("\n").includes(l))&&!/Words of X/.test(out3),out3.slice(0,600));
 /* an update of the module replaces its lines: new words in, old words out */
 const upd=FILE.replace("> Half an hour a day,\n> for a week","> Ten minutes");
 chk("an update of the module brings its new status text",A.addModuleText(upd).ok&&A.toMarkdown().includes("> Ten minutes")&&!A.toMarkdown().includes("for a week"));
 /* a rename of the booklet, and a copy kept and opened again */
 A.renameBooklet?A.renameBooklet(A.currentId,"Renamed"):0;
 const id=A.currentId;A.saveLocal();P.closePages();const B=P.boot();B.openBooklet(id);
 chk("a copy kept in the browser and opened again keeps the lines",B.toMarkdown().includes("> [!activity|quiet status:off] Quiet")&&B.toMarkdown().includes("> Ten minutes"),B.toMarkdown().slice(0,500));}

/* 7. the linter agrees with the renderer */
{const run=body=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),"cardparts-")),f=path.join(dir,"t.booklet.md");fs.writeFileSync(f,FM+body);
   const r=cp.spawnSync("python3",[path.join(P.R,"lint-booklet.py"),f],{encoding:"utf8"});fs.rmSync(dir,{recursive:true});return (r.stdout||"")+(r.stderr||"");};
 const ok=run("> [!activity|a status:off] A\n\nWords.\n\n> [!activity|b] B\n> Status text of B\n\nWords.\n");
 chk("the linter takes status:off and status text with no error",/0 errors/.test(ok)&&/0 warnings/.test(ok),ok);
 const bad=run("> [!activity|a status:hidden] A\n\nWords.\n");
 chk("the linter reports a wrong value",/1 error/.test(bad)&&/status:hidden/.test(bad),bad);
 const both=run("> [!activity|a status:off] A\n> Never drawn\n\nWords.\n");
 chk("the linter warns when status:off hides text under it",/0 errors/.test(both)&&/1 warning/.test(both)&&/status:off/.test(both),both);
 const q=run("> [!activity|a] A\n\n> [!text|q status:off] Q?\n");
 chk("the linter reports status: on a kind that does not take it",/1 error/.test(q)&&/takes no `status:`/.test(q),q);}

console.log(fails?"\n"+fails+" FAILURES":"\ncard parts checks passed");P.closePages();process.exit(fails?1:0);
})();
