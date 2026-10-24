// Pages are pagination (0.15, SPEC.md section 3): a thematic break splits an activity, or a tab, into pages that have no
// name, no id and no menu. The foot has one row: Back, "Page N of M" and Next; on the last page Next is the next activity's,
// on the first Back is the overview's. One at a time steps through the groups of the `***` section on show with the same Back
// and Next, and the last step's Next turns the section. Also: an activity's card on its module's screen shows the activity's first paragraph.
// The page's name for a screen reader is here; the scroll, focus and geometry are test/tabs-browser.js. Run: node test/pages.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const {find,hasClass,texts}=P;
const FM='---\nbooklet: "0.15"\ntitle: T\nlang: en\n---\n\n';
const A=P.boot();
const END="\n> [!module|m end] End\n";
const draw=id=>{A.screen=id;A.render();return P.main();};
const click=n=>n._on.click({target:n,currentTarget:n,preventDefault(){}});
const foot=()=>{const f=find(P.main(),hasClass("cd-foot"));return f.length===1?f[0]:null;};
/* the foot as a reader meets it: each control by its class and words, in order */
const row=()=>{const f=foot();return f?f.children.filter(x=>x&&typeof x==="object").map(x=>(String(x.attrs.class||"").split(" ").find(c=>/^(oat|pg)-|^cd-(back|next)$/.test(c))||x.tagName)+":"+texts(x).trim()).join(" | "):"(no foot, or more than one)";};
const btn=c=>find(foot(),hasClass(c))[0];

/* 1. three pages, then the next activity */
{const T=FM+"> [!module|m] M\n\n> [!activity|a] Read\n\n## First page\n\nOne.\n\n---\n\nWords with no heading.\n\n***\n\nA line first.\n\n## Late heading\n\nMore.\n\n> [!activity|b] After\n\nNext one.\n"+END;
 const R=A.parseFile(T),a=R.template.modules[0].activities[0];
 chk("three pages, with no name, no lead and no id but their place",a.pages.length===3&&a.pages.every(p=>Object.keys(p).join()==="id,blocks"),JSON.stringify(a.pages.map(Object.keys)));
 A.loadText(T);draw("m/a");
 chk("one row at the foot, on page one: Back to the overview, Page 1 of 3, Next",row()==="cd-back:Back to the overview | pg-at:Page 1 of 3 | pg-next:Next",row());
 chk("no page menu, no page name line, no rail",["ap-menu","ap-frame","ap-title","ap-rail","ap-toggle"].every(c=>find(P.main(),hasClass(c)).length===0));
 chk("the page's own heading is drawn once, as a heading",texts(P.main()).split("First page").length===2&&find(P.main(),n=>n.tagName==="h3").map(texts).join()==="First page");
 click(btn("pg-next"));
 chk("Next turns to page two: Back, Page 2 of 3, Next",row()==="pg-back:Back | pg-at:Page 2 of 3 | pg-next:Next"&&/Words with no heading/.test(texts(P.main()))&&!/One\./.test(texts(P.main())),row());
 chk("the page is named for a screen reader, which says it as the turn puts the focus there: a group, Page 2 of 3",(()=>{const b=find(P.main(),hasClass("ap-body"))[0];return b.attrs.role==="group"&&b.attrs["aria-label"]==="Page 2 of 3"&&b.attrs.tabindex==="-1";})(),JSON.stringify(find(P.main(),hasClass("ap-body"))[0].attrs));
 chk("a page with no heading is not named: no Page 2 line above it",!/Page 2(?! of)/.test(texts(find(P.main(),hasClass("ap-body"))[0])));
 click(btn("pg-next"));
 chk("on the last page Next is the next activity's",row()==="pg-back:Back | pg-at:Page 3 of 3 | cd-next:Next: 2. After",row());
 chk("its late heading is drawn once, in place",texts(P.main()).split("Late heading").length===2);
 click(btn("pg-back"));
 chk("Back turns back a page",row()==="pg-back:Back | pg-at:Page 2 of 3 | pg-next:Next",row());
 draw("m/b");
 chk("an activity of one page has no Page N of M, and the last activity no Next",row()==="cd-back:Back to the overview",row());
 chk("and its body no page name: nothing to say",(()=>{const b=find(P.main(),hasClass("ap-body"))[0];return b.attrs.role===undefined&&b.attrs["aria-label"]===undefined;})());
 A.loadText(FM+"> [!activity|a] A\n\nOne.\n\n---\n\nTwo.\n");draw("a");click(btn("pg-next"));
 chk("the last page of the last activity keeps the page's place in the middle",row()==="pg-back:Back | pg-at:Page 2 of 2 | pg-gap:",row());
 chk("which page is on show is not stored in the file",!/p2/.test(A.toMarkdown()));}

/* 2. one at a time across pages: one Back and Next */
{const Q=(id)=>`> [!group] Step ${id}\n> > [!text|${id}] Question ${id}?\n\n`;
 const T=FM+"> [!module|m] M\n\n> [!activity|a] A\n\n"+Q("q1")+Q("q2")+Q("q3")+"---\n\n"+Q("q4")+Q("q5")+Q("q6")+"> [!activity|b] B\n\nNext.\n"+END;
 P.wipe();const B=P.boot();
 B.loadText(T);global.__ls[B.OAT_KEY+B.currentId]="one";B.screen="m/a";B.render();
 const shown=()=>find(P.main(),hasClass("oat-unit")).filter(u=>u.attrs.hidden===undefined).map(texts).join();
 chk("one at a time on page one: the first step, the overview's Back, Page 1 of 2, the step's Next",/q1/.test(shown())&&row()==="cd-back:Back to the overview | pg-at:Page 1 of 2 | oat-next:Next step",row());
 chk("there is no second Back and Next row in the page",find(P.main(),hasClass("oat-nav")).length===0&&find(P.main(),hasClass("cd-foot")).length===1);
 click(btn("oat-next"));
 chk("Next steps: the second question, Back now steps back",/q2/.test(shown())&&row()==="oat-back:Back | pg-at:Page 1 of 2 | oat-next:Next step",row());
 click(btn("oat-next"));
 chk("on the last step Next turns the page",/q3/.test(shown())&&row()==="oat-back:Back | pg-at:Page 1 of 2 | pg-next:Next",row());
 click(btn("pg-next"));
 chk("page two opens on its first step, its Back the page before's",/q4/.test(shown())&&row()==="pg-back:Back | pg-at:Page 2 of 2 | oat-next:Next step",row());
 click(btn("pg-back"));
 chk("turned back to, page one opens on its last step",/q3/.test(shown())&&row()==="oat-back:Back | pg-at:Page 1 of 2 | pg-next:Next",row());
 click(btn("pg-next"));click(btn("oat-next"));click(btn("oat-next"));
 chk("the last step of the last page: Next is the next activity's",/q6/.test(shown())&&row()==="oat-back:Back | pg-at:Page 2 of 2 | cd-next:Next: 2. B",row());
 const t=find(P.main(),n=>n.tagName==="textarea")[2];t.value="kept on q6";t._on.input();
 click(btn("oat-back"));click(btn("oat-back"));click(btn("pg-back"));click(btn("pg-next"));
 chk("an answer typed on page two is there after turning to page one and back",find(P.main(),n=>n.tagName==="textarea")[2].value==="kept on q6"&&B.answersFor("m/a").q6==="kept on q6");}

/* 3. a tab's pages: the pager counts the tab's own */
{A.loadText(FM+"> [!activity|a] A\n\n> [!tab] One\n\nOnly page.\n\n> [!tab] Two\n\nFirst.\n\n***\n\nSecond.\n");draw("a");
 chk("a tab of one page has no Page N of M",row()==="cd-back:Back to the overview",row());
 A.chooseTab("a","two");
 chk("a tab of two pages counts its own",row()==="cd-back:Back to the overview | pg-at:Page 1 of 2 | pg-next:Next",row());
 click(btn("pg-next"));A.chooseTab("a","one");A.chooseTab("a","two");
 chk("each tab keeps the page it was left on, this visit",row()==="pg-back:Back | pg-at:Page 2 of 2 | pg-gap:"&&/Second/.test(texts(P.main())),row());}

/* 4. strings */
for(const lang of ["en","fr","es","es-AR"]){const G=A.STRINGS[lang].pages;
  chk("the pager's words are there in "+lang,G&&G.back&&G.next&&/2/.test(G.of(2,3))&&/3/.test(G.of(2,3)));}

/* 5. an activity's card shows its first paragraph */
{const card=(id)=>{A.screen="module:"+id;A.render();return find(P.main(),hasClass("mode"));};
 const F=FM+"> [!module|m] M\n\nModule words.\n\n";
 A.loadText(F+"> [!activity|a] First\n\nA **bold** start with snake_case, $x$ and ![alt text](https://t.example/p.png), see [the guide](g.md).\nSecond line of it.\n\nNot the card.\n\n> [!activity|b] Second\n\n> [!text|q] Q?\n\n> [!activity|c] Third\n\n## Heading first\n\nThe paragraph after a heading.\n"+END);
 const cs=card("m"),words=cs.map(c=>{const d=find(c,hasClass("d"))[0];return d?texts(d):"";});   // a card with no words has no teaser line (0.11.10)
 chk("a module's screen has a card for each activity",cs.length===3,String(cs.length));
 chk("an activity's card shows its first paragraph as inline Markdown read to text",words[0]==="A bold start with snake_case, x and alt text, see the guide. Second line of it.",JSON.stringify(words[0]));
 chk("an activity with no paragraph shows its title alone",words[1]==="",JSON.stringify(words[1]));
 chk("a heading above the paragraph is passed over, as for a module",words[2]==="The paragraph after a heading.",JSON.stringify(words[2]));
 chk("the activity's own screen does not draw the paragraph twice",(()=>{draw("m/a");const t=texts(P.main());return t.split("Not the card").length===2&&t.split("Second line of it").length===2;})());
 chk("a module with a notice or footnote lines does not lose its own blurb",A.allModules()[0].blurb==="Module words.",String(A.allModules()[0].blurb));
}
console.log(fails?"\n"+fails+" FAILURES":"\npages checks passed");P.closePages();process.exit(fails?1:0);
