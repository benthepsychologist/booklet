// Format 0.17, the reference renderer's part (SPEC.md sections 2, 3, 4 and 8): pages in a tab's tree, the `description:` key, the
// kept-entries fold mark, and design written after the records. What this checks is read from the file or drawn with the test
// page's recording DOM (test/page.js); the drawn page in a real browser is test/pagetree-browser.js. Each check names the line it would fail
// without. Run: node test/pagetree.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs"),path=require("path");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const {find,hasClass,texts}=P;
/* the marker of 0.17 is the one the renderer reads as its own, so a file marked so has nothing said about its marker */
const FM='---\nbooklet: "0.17"\ntitle: Notes\nlang: en\n---\n\n';
const notice=R=>R.unread;
const A=P.boot();
const acts=R=>R.template.modules.flatMap(m=>m.activities);
const draw=id=>{A.screen=id;A.render();return P.main();};
const click=n=>n._on.click({target:n,currentTarget:n,preventDefault(){}});
const foot=()=>find(P.main(),hasClass("cd-foot"))[0];
const row=()=>{const f=foot();return f?f.children.filter(x=>x&&typeof x==="object").map(x=>(String(x.attrs.class||"").split(" ").find(c=>/^(oat|pg)-|^cd-(back|next)$/.test(c))||x.tagName)+":"+texts(x).trim()).join(" | "):"(no foot)";};
const btn=c=>find(foot(),hasClass(c))[0];
const body=()=>find(P.main(),hasClass("ap-body"))[0];
const heading=()=>find(body(),hasClass("pg-title")).map(texts).join("|");
const crumbs=()=>find(P.main(),hasClass("wk-crumbs")).map(texts).join("|");
const cards=()=>find(P.main(),hasClass("wk-cards")).flatMap(n=>find(n,hasClass("k"))).map(texts).join("|");
const ids=a=>(a.npages||[]).map(n=>n.id).join();

/* the harbour wiki: nothing before the first page line, Tides with two pages under it (one of two parts), then Moons */
const HARBOUR=FM+"> [!module|m] Harbour\n\n> [!activity|harbour] Harbour notes\n\n"+
  "> [!page|tides] Tides\n\nHow the water moves.\n\n"+
  "> [!page|parent:tides] Spring tides\n\nThe big ones.\n\n***\n\nMore of the big ones.\n\n"+
  "> [!page|parent:tides] Neap tides\n\nThe small ones.\n\n"+
  "> [!page|moons icon:moon] Moons\n\nThe moon pulls.\n\n"+
  "> [!activity|after] After\n\nNext one.\n\n> [!module|m end] End\n";

/* 1. the parse: ids, the tree, the reading order, the parts */
{const R=A.parseFile(HARBOUR),a=acts(R)[0];
 chk("page lines are read: no problem but the marker's, the file opens",R.ok&&notice(R).length===0,JSON.stringify(notice(R)));
 chk("a page's id is the one written, else its title as an id (a parent: first word is a setting, so the id is the title's)",ids(a)==="tides,spring-tides,neap-tides,moons",ids(a));
 chk("each page keeps its title, its icon and its parent; the top has none",JSON.stringify(a.npages)==='[{"id":"tides","title":"Tides"},{"id":"spring-tides","title":"Spring tides","parent":"tides"},{"id":"neap-tides","title":"Neap tides","parent":"tides"},{"id":"moons","title":"Moons","icon":"moon"}]',JSON.stringify(a.npages));
 chk("a `***` splits a page into parts: the screens, in reading order, name their page",a.pages.map(p=>p.np).join()==="tides,spring-tides,spring-tides,neap-tides,moons",a.pages.map(p=>p.np).join());
 chk("a file with a page line has pages that are only an id, a page's id, and blocks",a.pages.every(p=>Object.keys(p).every(k=>["id","np","tab","blocks"].includes(k))),JSON.stringify(a.pages.map(Object.keys)));
 chk("a page line makes no activity of its own and none is claimed among the module's ids: the activity is the one",R.template.modules.length===1&&R.template.modules[0].activities.length===2&&a.id.endsWith("harbour"));
 chk("the activity's card text is the first paragraph under its line, here under a page line",a.lede==="How the water moves.",a.lede);
}
/* the reading order is depth first whatever the file's: a child written before its parent reads after it */
{const R=A.parseFile(FM+"> [!activity|a] A\n\n> [!page|parent:b] Child\n\nc\n\n> [!page|b] Parent\n\np\n\n> [!page|z] Last\n\nl\n"),a=acts(R)[0];
 chk("a child written before its parent is read after it, under it",a.pages.map(p=>p.np).join()==="b,child,z"&&a.npages.find(n=>n.id==="child").parent==="b",a.pages.map(p=>p.np).join());}
/* the words before the first page line are the first page, with no id; empty, there is none */
{const a=acts(A.parseFile(FM+"> [!activity|a] A\n\nIntro words.\n\n> [!page|x] X\n\nx\n"))[0];
 chk("the words before the first page line are the tab's first page: no page id, and no title of its own",a.pages.length===2&&a.pages[0].np===undefined&&a.pages[1].np==="x");
 const e=acts(A.parseFile(FM+"> [!activity|a] A\n\n***\n\n> [!page|x] X\n\nx\n\n> [!page|y] Y\n\ny\n"))[0];
 chk("empty (blank lines and a lone ***), there is no first page: the tab's first page is its first named page",e.pages.map(p=>p.np).join()==="x,y",e.pages.map(p=>p.np).join());
 const c=acts(A.parseFile(FM+"> [!activity|a] A\n\n> [!page|home] Start\n\n> [!page|parent:home] One\n\none\n"))[0];
 chk("a named page with nothing on it is a page (a contents page shows the others as cards)",c.pages.map(p=>p.np+":"+p.blocks.length).join()==="home:0,one:1",c.pages.map(p=>p.np+":"+p.blocks.length).join());
 const t=acts(A.parseFile(FM+"> [!activity|a] A\n\n> [!page|x] X\n\nxx\n\n***\n\n***\n\n> [!page|y] Y\n\nyy\n"))[0];
 chk("an empty part a break leaves before the next page line is dropped, not kept as a part of the page before",t.pages.map(p=>p.np).join()==="x,y",t.pages.map(p=>p.np).join());
}
/* the first-word rule: a first word that holds `:` is a setting, on every kind */
{const R=A.parseFile(FM+"> [!activity|a] A\n\n> [!page|parent:map] Choosing a place\n\nc\n\n> [!page|map] Map\n\nm\n"),a=acts(R)[0];
 chk("a page line with a setting first has no written id: the title makes it, and the parent is kept",a.npages[0].id==="choosing-a-place"&&a.npages[0].parent==="map"&&notice(R).length===0,JSON.stringify(a.npages));
 const w=A.parseFile(FM+"> [!activity|icon:compass] Trouble\n\n> [!text|q] Q\n");
 chk("on a kind that needs an id the same rule gives the report of no id, not of a bad one",notice(w).length>=1&&notice(w).every(x=>!/may hold only letters/.test(x))&&/no id|needs an id|id/.test(notice(w)[0]),JSON.stringify(notice(w)));
 chk("a flag written first is still the id, as before (`repeat` names the activity `repeat`)",acts(A.parseFile(FM+"> [!activity|repeat] A\n\n> [!text|q] Q\n"))[0].id.endsWith("repeat"));
}
/* ids: a title that leaves nothing, a clash, a bad written id */
{const a=acts(A.parseFile(FM+"> [!activity|a] A\n\n> [!page] 日本語\n\nx\n\n> [!page] 🙂\n\ny\n"))[0];
 chk("a title that leaves nothing gives `page-` and its place among the tab's page lines",ids(a)==="page-1,page-2",ids(a));
 const R=A.parseFile(FM+"> [!activity|a] A\n\n> [!page|g] G\n\n1\n\n> [!page|g] G\n\n2\n\n> [!page|g] G\n\n3\n\n> [!page|parent:g] Kid\n\n4\n"),b=acts(R)[0];
 chk("pages that share an id are all kept, the later ones numbered, each said; a parent: names the first",ids(b)==="g,g-2,g-3,kid"&&b.npages[3].parent==="g"&&notice(R).length===2&&/“g-2”/.test(notice(R)[0])&&/“g-3”/.test(notice(R)[1]),ids(b)+" "+JSON.stringify(notice(R)));
 const q=A.parseFile(FM+"> [!activity|a] A\n\n> [!page|Bad_Id] Words\n\nx\n"),qa=acts(q)[0];
 chk("a written id that is not letters, digits and dashes is said and replaced by the title's",ids(qa)==="words"&&notice(q).length===1,ids(qa)+JSON.stringify(notice(q)));
 const two=acts(A.parseFile(FM+"> [!activity|a] A\n\n> [!tab] One\n\n> [!page|x] X\n\n1\n\n> [!tab] Two\n\n> [!page|x] X\n\n2\n"))[0];
 chk("ids are one tab's: two tabs may each have a page of one id",two.npages.map(n=>n.tab+"/"+n.id).join()==="one/x,two/x",JSON.stringify(two.npages));
 const sh=A.parseFile(FM+"> [!activity|a] A\n\n> [!text|x] X?\n\n> [!page|x] X\n\nx\n");
 chk("a page's id is its own: a question may share it with no clash",sh.ok&&sh.refused.length===0&&notice(sh).length===0,JSON.stringify(notice(sh)));
}
/* parent: names a page of the same tab; a missing one, itself, a cycle: the page sits at the top, said */
{const R=A.parseFile(FM+"> [!activity|a] A\n\n> [!page|p] P\n\np\n\n> [!page|c parent:nobody] C\n\nc\n\n> [!page|s parent:s] S\n\ns\n\n> [!page|x parent:y] X\n\nx\n\n> [!page|y parent:x] Y\n\ny\n"),a=acts(R)[0];
 chk("a parent that is no page of the tab, a page its own parent: at the top, each said",a.npages.find(n=>n.id==="c").parent===undefined&&a.npages.find(n=>n.id==="s").parent===undefined&&notice(R).some(x=>/parent:nobody/.test(x))&&notice(R).length===3,JSON.stringify(notice(R)));
 chk("and the report of a cycle says so (it is not the report of a missing parent)",notice(R).some(x=>/name each other as parents/.test(JSON.stringify(x))||/pageCycle/.test(JSON.stringify(x))),JSON.stringify(notice(R)));
 chk("a cycle is cut at the first page met, which is drawn at the top, and it is said",a.npages.find(n=>n.id==="x").parent===undefined&&a.npages.find(n=>n.id==="y").parent==="x"&&a.pages.map(p=>p.np).join()==="p,c,s,x,y",a.pages.map(p=>p.np).join()+JSON.stringify(a.npages));
 const other=acts(A.parseFile(FM+"> [!activity|a] A\n\n> [!tab] One\n\n> [!page|x] X\n\n1\n\n> [!tab] Two\n\n> [!page|y parent:x] Y\n\n2\n"))[0];
 chk("a parent in another tab is no parent: the tree sits inside one tab",other.npages.find(n=>n.id==="y").parent===undefined);
 const deep=A.parseFile(FM+"> [!activity|a] A\n\n"+Array.from({length:3000},(_,i)=>"> [!page|p"+i+(i?" parent:p"+(i-1):"")+"] P"+i+"\n\nx\n\n").join(""));
 chk("a chain of 3,000 pages, each under the one before, opens in reading order (no depth limit, no stack overflow)",deep.ok&&acts(deep)[0].pages.length===3000&&acts(deep)[0].pages[2999].np==="p2999");
}
 /* 0.16 files (SPEC.md section 3, "An activity does not sit under another"): `parent:` on an activity line is a setting the kind does not take: reported once for
   each line and ignored, so the activities are not placed under one another and the module is no wiki */
{const R=A.parseFile(FM+"> [!module|m] M\n\n> [!activity|top] Top\n\nt\n\n> [!activity|kid parent:top] Kid\n\nk\n\n> [!activity|kid2 parent:top] Kid 2\n\nk2\n\n> [!module|m end] End\n"),as=acts(R);
 chk("`parent:` on an activity line is reported as a setting the kind does not take, and ignored: no activity is under another, in the file's order",as.length===3&&as.every(x=>x.parent===undefined)&&as.map(x=>x.id).join()==="m/top,m/kid,m/kid2",JSON.stringify(as.map(x=>x.id+">"+x.parent)));
 chk("one report for each line, worded as for any setting a kind does not take (and no report of a kept wiki)",notice(R).length===2&&notice(R).every(x=>/settingUnknown/.test(JSON.stringify(x))&&/parent:/.test(JSON.stringify(x)))&&!/activityParentLegacy/.test(JSON.stringify(notice(R))),JSON.stringify(notice(R)));
 chk("a file whose activities carry no `parent:` has no such report",!notice(A.parseFile(FM+"> [!activity|a] A\n\nx\n")).length);
}
/* what a page line takes */
{const R=A.parseFile(FM+"> [!activity|a] A\n\n> [!page|x hidden status:off tab:t icon:no-such-picture] X\n\nx\n"),a=acts(R)[0];
 chk("a page takes icon: and parent: and nothing else: another setting is said and ignored; an icon outside the set is said",notice(R).length===4&&/page line takes no “hidden”/.test(notice(R).join("|"))&&a.npages[0].icon===undefined,JSON.stringify(notice(R)));
 const f=A.parseFile(FM+"> [!activity|a] A\n\n> [!page|x]- X\n\nx\n");
 chk("a fold marker on a page line means nothing: ignored, the page is drawn as any",f.ok&&notice(f).length===0&&acts(f)[0].npages[0].id==="x");
 const body=A.parseFile(FM+"> [!activity|a] A\n\n> [!page|x] X\n> First words.\n\nThen more.\n"),pg=acts(body)[0].pages[0].blocks[0];
 chk("`>` lines directly under a page line are the page's first prose",pg.type==="markdown"&&/First words/.test(pg.text));
}
/* where a page line may stand */
{const m=A.parseFile(FM+"> [!module|m] M\n\n> [!page|x] X\n\nx\n\n> [!activity|a] A\n\nbody\n\n> [!module|m end] End\n");
 chk("in a module's opening a page line is said and ignored (a module needs an activity line before its pages)",notice(m).length===1&&/page line belongs inside an activity/.test(notice(m)[0])&&acts(m)[0].npages===undefined,JSON.stringify(notice(m)));
 const o=A.parseFile(FM+"> [!page|x] X\n\nx\n\n> [!activity|a] A\n\nbody\n");
 chk("in the booklet's opening, the same",notice(o).length===1&&/page line belongs inside an activity/.test(notice(o)[0]));
 const g=A.parseFile(FM+"> [!activity|a] A\n\n> [!group] G\n> > [!page|x] X\n\nx\n");
 chk("in a group a page line is said and left out (a group holds text, questions and callouts)",notice(g).some(x=>/page line cannot go inside a group/.test(x)),JSON.stringify(notice(g)));
 const t=A.parseFile(FM+"> [!activity|a] A\n\nOpening for every tab.\n\n> [!page|x] X\n\nin the opening\n\n> [!tab] One\n\n1\n\n> [!tab] Two\n\n2\n"),ta=acts(t)[0];
 chk("in an activity's opening (before its first tab line) a page line is said and no page: its words stay in the opening",notice(t).length===1&&/before an activity's first tab line/.test(notice(t)[0])&&ta.npages===undefined&&ta.pages.every(p=>p.np===undefined)&&ta.pages.filter(p=>!p.tab).flatMap(p=>p.blocks).map(b=>b.text).join("|").includes("in the opening"),JSON.stringify(notice(t)));
 const r=A.parseFile(FM+"> [!activity|a] A\n\n> [!row]\n\nin the row\n\n> [!page|x] X\n\nx\n");
 chk("a page line ends an open row, which is said",notice(r).some(x=>/runs into a page line/.test(x)),JSON.stringify(notice(r)));
 const d=A.parseFile(FM+"> [!activity|a] A\n\nbody\n\n> [!data] Data\n\n> [!page|x] X\n\nx\n");
 chk("in a data section a page line is not read",acts(d)[0].npages===undefined);
 const c=A.parseFile(FM+"> [!activity|a] A\n\n> [!note] N\n> > [!page|x] X\n\nx\n");
 chk("a page line inside another callout's body is that body's text, not a page",acts(c)[0].npages===undefined);
 const i=A.parseFile(FM+"> [!page|x] X\n\nonly page lines in a file with no activity line\n\n> [!page|y] Y\n\ny\n"),ia=acts(i)[0];
 chk("a file with no activity line is one activity: its page lines are its pages",ia&&ids(ia)==="x,y"&&notice(i).length===0,JSON.stringify(notice(i)));
 const ts=acts(A.parseFile(FM+"> [!activity|a] A\n\n> [!tab] One\n\n> [!page|home] Home\n\n> [!tab] Two\n\ntwo\n"))[0];
 chk("a tab line after an empty named page starts the tab on a screen of its own: the page stays in its tab",ts.pages.map(p=>(p.tab||"-")+":"+(p.np||"-")).join()==="one:home,two:-",ts.pages.map(p=>(p.tab||"-")+":"+(p.np||"-")).join());
}
/* a file with no page line is what it was in 0.16: no page, no np, nothing added to a screen */
{const files=[...fs.readdirSync(P.R+"/examples").filter(f=>f.endsWith(".md")).map(f=>"examples/"+f),...fs.readdirSync(P.R+"/test/fixtures").filter(f=>f.endsWith(".md")).map(f=>"test/fixtures/"+f)];
 let n=0;const bad=[];
 for(const f of files){const t=fs.readFileSync(P.R+"/"+f,"utf8");if(/^> \[!page/m.test(t)) continue;const R=A.parseFile(t);if(!R.template) continue;n++;
   if(acts(R).some(a=>a.npages!==undefined||a.pages.some(p=>"np" in p||!Object.keys(p).every(k=>["id","tab","blocks"].includes(k))))) bad.push(f);}
 chk("no example or fixture without a page line gains a page, an `np` or any other mark ("+n+" files)",n>20&&!bad.length,bad.join());}

/* 2. drawn: the foot of a tree, the trail, the cards, the counter */
{A.loadText(HARBOUR);draw(acts(A.parseFile(HARBOUR))[0].id);
 chk("it opens on the first page: no Back to a page, Next names the next page",row()==="cd-back:Back to the overview | pg-next:Next: Spring tides"||/^cd-back:.* \| pg-next:Next: /.test(row()),row());
 chk("the first page shows its title, its words and the pages under it as cards, and no trail (it has no parent)",heading()==="Tides"&&/How the water moves/.test(texts(body()))&&cards()==="Spring tides|Neap tides"&&crumbs()==="",heading()+"/"+cards()+"/"+crumbs());
 click(btn("pg-next"));
 chk("Next goes to the next page in reading order, depth first: the first child; Back is Up to the parent",/^pg-back:Up: Tides \| pg-at:1 of 2 \| pg-next:Next$/.test(row()),row());
 chk("a page of two parts: the counter reads \"1 of 2\" (not Page 1 of 2), the trail names the pages above, the title heads the part",/pg-at:1 of 2/.test(row())&&crumbs()==="Tides Spring tides"&&heading()==="Spring tides",row()+"/"+crumbs());
 chk("the part is named for a screen reader as its place in the page",body().attrs.role==="group"&&body().attrs["aria-label"]==="1 of 2");
 chk("Next on a part before the last is the next part: the word is Next, no page named",btn("pg-next")&&texts(btn("pg-next"))==="Next");
 click(btn("pg-next"));
 chk("the second part: Back is Back (the part before), the counter 2 of 2, Next names the next page, the title heads this part too",/^pg-back:Back \| pg-at:2 of 2 \| pg-next:Next: Neap tides$/.test(row())&&/More of the big ones/.test(texts(body()))&&heading()==="Spring tides",row());
 click(btn("pg-back"));
 chk("Back from a later part goes to the part before",/pg-at:1 of 2/.test(row())&&/The big ones/.test(texts(body())));
 click(btn("pg-back"));
 chk("Up from a child goes to the parent, on its first part",heading()==="Tides"&&/^cd-back|pg-back/.test(row())&&cards()==="Spring tides|Neap tides");
 click(btn("pg-next"));click(btn("pg-next"));click(btn("pg-next"));
 chk("Next after the last part of Spring tides: Neap tides, its Back Up to Tides",heading()==="Neap tides"&&/^pg-back:Up: Tides \| pg-next:Next: Moons$/.test(row()),row());
 click(btn("pg-next"));
 chk("the last page of the tab: Back goes to the top page before it (Tides, not its last child), Next is the next activity's",heading()==="Moons"&&/^pg-back:Back \| cd-next:Next: 2\. After$/.test(row())&&crumbs()==="",row());
 click(btn("pg-back"));
 chk("Back on a top page opens the top page before, on its first part",heading()==="Tides");
 chk("Back on the tab's first page leaves the activity, as it did",/^cd-back:Back to the overview/.test(row()),row());
 chk("a page of one part shows no counter",!/pg-at/.test(row()),row());
 draw(acts(A.parseFile(HARBOUR))[1].id);
 chk("the activity after is a plain one: no page title, and the same foot as before",heading()===""&&row()==="cd-back:Back to the overview",row());
}
/* the cards of a page are shown after its last part only */
{const T=FM+"> [!activity|a] A\n\n> [!page|top] Top\n\none\n\n***\n\ntwo\n\n> [!page|parent:top] Kid\n\nkid words\n";
 A.loadText(T);draw("a");
 chk("a page with parts and children: no cards on its first part",cards()==="",cards());
 click(btn("pg-next"));
 chk("and the cards on its last, each with its first paragraph and no status line",cards()==="Kid"&&/kid words/.test(texts(find(P.main(),hasClass("wk-cards"))[0]))&&!/Not started/.test(texts(find(P.main(),hasClass("wk-cards"))[0])));
 click(find(P.main(),hasClass("wk-cards"))[0].children[0].children[0]);
 chk("pressing a card opens that page",heading()==="Kid"&&crumbs()==="Top Kid");
 click(find(P.main(),hasClass("wk-crumb"))[0]);
 chk("and a link in the trail opens the page above, on its first part",heading()==="Top"&&/one/.test(texts(body())));
}
/* a contents page: nothing on it but the cards */
{A.loadText(FM+"> [!activity|a] A\n\n> [!page|home] Start here\n\n> [!page|parent:home] One\n\nfirst\n\n> [!page|parent:home] Two\n\nsecond\n");draw("a");
 chk("a named page with nothing on it opens and shows its pages as cards",heading()==="Start here"&&cards()==="One|Two",heading()+"/"+cards());}
/* tabs: a tab's pages are its own, Back and Next stay inside the tab */
{const T=FM+"> [!activity|a] A\n\nOpening, on every tab.\n\n> [!tab] Learn\n\nLearn words.\n\n> [!page|deep] Deeper\n\nd\n\n> [!tab] Plain\n\nplain one\n\n***\n\nplain two\n\n> [!tab] Quiz\n\n> [!page|p1] P1\n\nq1\n\n> [!page|p2] P2\n\nq2\n";
 A.loadText(T);draw("a");
 chk("a tab that opens on the words before its first page line: those words, no title of their own, Next names the first page",!heading()&&/Learn words/.test(texts(body()))&&/pg-next:Next: Deeper/.test(row()),row());
 chk("the activity's opening is above the tab, as ever",/Opening, on every tab/.test(texts(P.main())));
 click(btn("pg-next"));
 chk("the first page of a tab with a page line: Back is Back (to the tab's words), not Up",/pg-back:Back/.test(row())&&heading()==="Deeper",row());
 chk("on the tab's last page Next is the next activity's, or nothing: it never goes to another tab",!/pg-next/.test(row()),row());
 const tabs=()=>find(P.main(),n=>n.attrs&&n.attrs.role==="tab");
 click(tabs()[1]);
 chk("a tab with no page line keeps the 0.16 foot, \"Page 1 of 2\"",/pg-at:Page 1 of 2/.test(row())&&!heading(),row());
 click(tabs()[0]);
 chk("coming back to a tab opens the page it was left on",heading()==="Deeper",heading());
 click(tabs()[2]);
 chk("a tab whose first page is named: no empty first page is made; it opens on P1; Back leaves the activity",heading()==="P1"&&/^cd-back/.test(row()),row()+"/"+heading());
}

/* 3. links: a page's title joins the headings a link can open */
{const T=FM+"> [!activity|a] A\n\nSee [[#Neap tides]] and [far moons](#moons).\n\n> [!page|tides] Tides\n\nt\n\n> [!page|parent:tides] Neap tides\n\nn\n\n> [!page|moons] Moons\n\nm\n\n## A heading\n\nh\n";
 A.loadText(T);const a=A.allModules()[0].activities[0];
 const h=A.findHeading(A.allModules(),"Neap tides",false),first=a.pages.find(p=>p.np==="neap-tides");
 chk("a page's title is a heading a link opens: the page, on its first part",h&&h.act===a.id&&h.page===first.id&&h.heading==="Neap tides",JSON.stringify(h));
 chk("and by its slug",(A.findHeading(A.allModules(),"neap-tides",true)||{}).heading==="Neap tides");
 const two=acts(A.parseFile(FM+"> [!activity|a] A\n\n> [!page|x] X\n\none\n\n***\n\ntwo\n"))[0];
 chk("only a page's first part holds its title as a heading (the repeats of the title on later parts are not headings)",A.activityHeadings(two).filter(x=>x.text==="X").length===1);
 chk("a file without a page line has the headings it had: its title and its own",A.activityHeadings(acts(A.parseFile(FM+"> [!activity|a] A\n\n## Sub\n\nw\n"))[0]).map(x=>x.text).join()==="A,Sub");
}

/* 4. the fold mark: entries:folded on a repeat activity's line */
{const R=A.parseFile(FM+"> [!activity|j repeat entries:folded] Journal\n\n> [!text|q] Q\n"),a=acts(R)[0];
 chk("`entries:folded` on an activity's line is read: the kept-entries list starts folded; nothing is said",a.entriesFolded===true&&notice(R).length===0,JSON.stringify(notice(R)));
 const bad=A.parseFile(FM+"> [!activity|j repeat entries:open] Journal\n\n> [!text|q] Q\n");
 chk("any other value is said and ignored",notice(bad).length===1&&/entries:open/.test(notice(bad)[0])&&acts(bad)[0].entriesFolded===undefined,JSON.stringify(notice(bad)));
 const plain=acts(A.parseFile(FM+"> [!activity|j repeat] Journal\n\n> [!text|q] Q\n"))[0];
 chk("an activity without it has no mark",plain.entriesFolded===undefined);
 const entry=(ts,t)=>"```booklet entries j\n{\"items\": [\n{\"ts\":\""+ts+"\",\"q\":\""+t+"\"}\n]}\n```\n";
 const file=FM+"> [!activity|j repeat entries:folded] Journal\n\n> [!text|q] Q\n\n%%\n> [!records] App record — do not edit below this line\n\n"+entry("2026-01-02T10:00:00Z","kept")+"\n%%\n";
 A.loadText(file);draw("j");
 const det=find(P.main(),hasClass("earlier-fold"));
 chk("drawn, the kept entries sit in a fold that is closed, under the heading \"Earlier entries\"",det.length===1&&det[0].tagName==="details"&&!det[0].attrs.open&&/Earlier entries/.test(texts(det[0])),det.length+"");
 A.loadText(file.replace(" entries:folded",""));draw("j");
 chk("without the mark the heading and the chips are drawn as they were: no fold",find(P.main(),hasClass("earlier-fold")).length===0&&/Earlier entries/.test(texts(P.main())));
 chk("the mark is written back as written",A.toMarkdown()===file.replace(" entries:folded",""));
 A.loadText(file);chk("and the file with the mark saves byte for byte",A.toMarkdown()===file);
}

/* 5. the description: key */
{const R=A.parseFile('---\nbooklet: "0.17"\ntitle: Notes\ndescription: "Why the sea rises twice a day."\nlang: en\n---\n\n> [!activity|a] A\n\nWords.\n');
 chk("`description:` in the front matter is read, its quotes off, into the booklet's own description",R.template.description==="Why the sea rises twice a day."&&notice(R).length===0,JSON.stringify(R.template.description));
 chk("a booklet without one has none",A.parseFile(FM+"> [!activity|a] A\n\nWords.\n").template.description===undefined);
 chk("an empty one is no description",A.parseFile('---\nbooklet: "0.17"\ntitle: Notes\ndescription:\nlang: en\n---\n\n> [!activity|a] A\n\nWords.\n').template.description===undefined);
 const withD='---\nbooklet: "0.17"\ntitle: Notes\ndescription: Why the sea rises twice a day.\nlang: en\n---\n\n> [!module|m] Tide tables\n\n> [!activity|a] A\n\nWords.\n\n> [!module|m end] End\n';
 A.loadText(withD);A.flushSave();
 const e=A.readLib().entries.find(x=>x.id===A.currentId);
 chk("the booklet's entry in \"Your booklets\" keeps it",e&&e.description==="Why the sea rises twice a day."&&e.title==="Notes",JSON.stringify(e));
 for(let i=0;i<4&&A.currentId;i++) A.homeButton();const list=texts(P.main());
 chk("and its card shows the description in place of the module titles",/Why the sea rises twice a day\./.test(list)&&!/Tide tables/.test(list),list.indexOf("Tide tables")+" "+list.slice(0,900));
 A.loadText(withD.replace(/description:.*\n/,"").replace("Notes","Plain"));A.flushSave();
 const e2=A.readLib().entries.find(x=>x.id===A.currentId);
 chk("a booklet with none has none in its entry, and its card keeps the titles of its modules",e2&&e2.description==null,JSON.stringify(e2));
 for(let i=0;i<4&&A.currentId;i++) A.homeButton();
 chk("(the card of a booklet with none names its modules)",/Tide tables/.test(texts(P.main())),texts(P.main()).slice(0,300));
}

/* 6. a file with a page line is written back as written; a page line in the records region is kept, and said */
{const body=HARBOUR+"\n> [!text|q] A question?\n\n";
 const file=FM+"> [!activity|harbour] Harbour notes\n\n> [!page|tides] Tides\n\nHow the water moves.\n\n> [!text|q1] On the first page?\n\n> [!page|parent:tides] Spring tides\n\n> [!text|q2] On the second?\n\n\n";
 const A2=P.boot();A2.loadText(file);
 chk("a file with page lines saves as it was read, byte for byte (no normalizing of page lines, blank lines or spacing)",A2.toMarkdown()===file,JSON.stringify(A2.toMarkdown()));
 A2.answersIn("").q2="the answer";A2.markDirty();
 const t=A2.toMarkdown();
 chk("an answer to a question on a page is kept by its question id, in the records, after the body, which is as it was",t.startsWith(file.replace(/\n+$/,"\n\n\n").slice(0,file.length-1))&&/"q2": ?"the answer"/.test(t)&&t.indexOf('"q2"')>t.indexOf("On the second"),JSON.stringify(t));
 const back=A2.parseFile(t);
 chk("and it reads back to the same answers and the same pages",back.S.answers[""].q2==="the answer"&&ids(acts(back)[0])==="tides,spring-tides");
 const rec=file+"%%\n> [!records] App record — do not edit below this line\n\n> [!page|x] Not a page\n\n```booklet answers\n{\"q1\":\"a\"}\n```\n\n%%\n";
 const R=A.parseFile(rec);
 chk("a page line in the records region is reported and not read as a page",R.unread.some(x=>/records/i.test(JSON.stringify(x)))&&ids(acts(R)[0])==="tides,spring-tides",JSON.stringify(notice(R)));
 const A3=P.boot();A3.loadText(rec);A3.answersIn("").q2="b";A3.markDirty();
 chk("a save keeps that line where it was, as written",A3.toMarkdown().includes("> [!page|x] Not a page\n\n```booklet answers"),A3.toMarkdown());
}

/* 7. design after the records stays where it is (SPEC.md section 8) */
{const REC="%%\n> [!records] App record — do not edit below this line\n\n```booklet answers\n{\"q\": \"x\"}\n```\n\n%%\n";
 const tail="\n> [!page|late] Late page\n\nWritten after the records.\n\n";
 const f=FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n> [!page|first] First\n\nbody\n\n"+REC+tail;
 const B=P.boot();B.loadText(f);const R=B.parseFile(f);
 chk("design after the records is read (its page too), and said once",ids(acts(R)[0])==="first,late"&&R.unread.filter(x=>/design after the records/i.test(x)).length===1,JSON.stringify(R.unread));
 chk("saved with nothing changed, the file comes back byte for byte",B.toMarkdown()===f);
 B.answersIn("").q="y";B.markDirty();const t=B.toMarkdown();
 chk("saved with an answer changed, only the answer differs: the design after the records is after them, as it was",t===f.replace('"q": "x"','"q": "y"'),JSON.stringify(t));
 const C=P.boot();C.loadText(t);
 chk("and it reads back the same, then saves the same",C.peekAnswers("").q==="y"&&C.toMarkdown()===t);
 const noEol=FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n"+REC+"\nafter, no newline at the end";
 const D=P.boot();D.loadText(noEol);
 chk("the last line's lack of a line ending is kept",D.toMarkdown()===noEol);
 const crlf=f.replace(/\n/g,"\r\n"),E=P.boot();E.loadText(crlf);
 chk("a file with CRLF line endings comes back with them, the design after the records too",E.toMarkdown()===crlf);
 const two=FM+"> [!activity|a] A\n\n> [!text|q] Q\n\n"+REC+"\nBetween.\n\n"+REC.replace('"q": "x"','"q": "z"')+"\nAfter.\n";
 const F=P.boot();F.loadText(two);
 chk("design between two regions is still written above them (not yet supported; it is moved, never lost)",F.toMarkdown().includes("Between.")&&F.toMarkdown().includes("After.")&&F.parseFile(F.toMarkdown()).ok);
 const G=P.boot();G.loadText(f);
 const added=G.addModuleText(FM+"> [!module|extra] Extra\n\n> [!activity|e1] Extra one\n\n> [!text|eq] EQ\n\n> [!module|extra end] End\n");
 chk("adding a module is a change to the design: the design after the records is then written above them, once, and nothing is lost",added.ok&&G.toMarkdown().split("Written after the records.").length===2&&G.toMarkdown().indexOf("Written after the records.")<G.toMarkdown().indexOf("%%\n> [!records]")&&G.peekAnswers("").q==="x",added.ok+JSON.stringify(G.toMarkdown().slice(-300)));
}
console.log(fails?"\n"+fails+" FAILURES":"\npage tree checks passed");
process.exit(fails?1:0);
