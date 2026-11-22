// Renderer 0.18.1: the pages menu (booklet.html, pageMenu; SPEC.md section 3 leaves a menu of a tab's pages to the renderer). What this
// checks is read from the page drawn with the test page's recording DOM (test/page.js), which has no layout; the column, the drawer, the
// scroll and the focus in a real Chromium are test/pagesmenu-browser.js. The 157-page booklet is made here (test/pmenu-fixture.js),
// invented. Each check names the line it would fail without. Run: node test/pagesmenu.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fx=require("./pmenu-fixture.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const {find,hasClass,texts}=P;
const FM='---\nbooklet: "0.21"\ntitle: Notes\nlang: en\n---\n\n';
const A=P.boot();
const acts=R=>R.template.modules.flatMap(m=>m.activities);
const draw=id=>{A.screen=id;A.render();return P.main();};
const click=n=>n._on.click({target:n,currentTarget:n,preventDefault(){}});
const navs=()=>find(P.main(),n=>n.tagName==="nav"&&hasClass("pm")(n));
const nav=()=>navs()[0];
const entries=()=>find(nav(),hasClass("pm-go"));
const current=()=>entries().filter(b=>b.attrs["aria-current"]==="page");
const details=()=>find(nav(),n=>n.tagName==="details");
const isOpen=d=>d.hasAttribute("open");
const heading=()=>find(P.main(),hasClass("pg-title")).map(texts).join("|");
const entry=title=>entries().find(b=>texts(b)===title);
const open=text=>{A.loadText(text);const id=acts(A.parseFile(text))[0].id;return draw(id),id;};

/* 1. the 157-page booklet: a nav landmark named Pages with the tree nested as the pages are, in reading order */
const tree=fx.tree();
const id=open(fx.booklet());
chk("the fixture is 157 pages in three levels (7, 28 and 122)",tree.length===157&&[1,2,3].map(d=>tree.filter(p=>p.depth===d).length).join()==="7,28,122");
chk("a tab with a named page tree draws one nav landmark named “Pages”",navs().length===1&&nav().attrs["aria-label"]==="Pages",String(navs().length));
chk("every one of the 157 pages is one entry, in reading order (depth first)",entries().length===157&&entries().map(texts).join("|")===tree.map(p=>p.title).join("|"));
{const top=find(nav(),hasClass("pm-list"))[0],items=top.children;
 chk("the top list holds the 7 top pages",items.length===7&&items.every(li=>hasClass("pm-item")(li)));
 const kids=li=>{const d=li.children.find(c=>c&&c.tagName==="details");return d?d.children.find(c=>c&&c.tagName==="ul").children:[];};
 chk("each top page holds its 4 children, and each child its 4 or 5 grandchildren, nested as the pages are",
   items.every(t=>kids(t).length===4&&kids(t).every(c=>kids(c).length>=4&&kids(c).every(g=>kids(g).length===0)))&&items.flatMap(kids).flatMap(kids).length===122);
 chk("a page with pages under it has a native details with a summary that names the branch; a leaf has none",
   details().length===35&&details().every(d=>d.children[0].tagName==="summary"&&/^Pages under /.test(d.children[0].attrs["aria-label"]))&&find(nav(),n=>n.tagName==="summary").length===35);
}
chk("the first page is on show: it alone is aria-current=\"page\", and it is marked",current().length===1&&texts(current()[0])===tree[0].title&&hasClass("pm-go")(current()[0]));
chk("only the path to the page on show is open: no branch is open on the first page's own (it has no ancestor)",details().filter(isOpen).length===0);
chk("the nav sits beside the activity's column, in a wrapper",find(P.main(),hasClass("pm-wrap")).length===1&&find(P.main(),hasClass("pm-wrap"))[0].children[0]===nav());
chk("the toggle button says it controls the panel and starts collapsed",(b=>b&&b.attrs["aria-controls"]==="pm-panel"&&b.attrs["aria-expanded"]==="false")(find(nav(),hasClass("pm-open"))[0])&&find(nav(),n=>n.attrs.id==="pm-panel").length===1);

/* 2. an entry goes to its page's first part; the page on show moves; every ancestor of it opens */
{const deep=tree[40],chain=[];for(let p=deep;p;p=tree.find(x=>x.id===p.parent)) chain.unshift(p);
 chk("(the page chosen is three levels down)",chain.length===3&&deep.depth===3);
 click(entry(deep.title));
 chk("pressing an entry turns to that page",heading()===deep.title,heading());
 chk("the page on show is the only aria-current entry",current().length===1&&texts(current()[0])===deep.title);
 chk("both of its ancestors are open, and no other branch is",details().filter(isOpen).length===2&&chain.slice(0,2).every(p=>isOpen(details().find(d=>d.attrs["data-id"]==="/"+p.id))));
 /* the reader's own choices are kept as the screen is drawn again */
 const top=details().find(d=>d.attrs["data-id"]==="/"+chain[0].id),other=details().find(d=>d.attrs["data-id"]==="/"+tree[0].id);
 other.open=true;nav()._on.toggle({target:other});
 chk("a branch the reader opens is still open when the screen is drawn again",(A.render(),isOpen(details().find(d=>d.attrs["data-id"]==="/"+tree[0].id))));
 const mid=details().find(d=>d.attrs["data-id"]==="/"+chain[1].id);
 mid.open=false;nav()._on.toggle({target:mid});A.render();
 chk("an ancestor the reader closes stays closed when the screen is drawn again on the same page",!isOpen(details().find(d=>d.attrs["data-id"]==="/"+chain[1].id)));
 click(entry(tree[39].title));  // a sibling under the same child: the page changes, so the path to it opens again
 chk("and opens again when the page changes (the path to the page on show is open)",isOpen(details().find(d=>d.attrs["data-id"]==="/"+chain[1].id))&&current().length===1);
 click(entry(tree[0].title));
 chk("going back up leaves the branches the reader opened as they were",isOpen(details().find(d=>d.attrs["data-id"]==="/"+tree[0].id))&&isOpen(details().find(d=>d.attrs["data-id"]==="/"+chain[0].id)));
}

/* 3. Next walks the tree in the menu's own order (the entry marked follows the pager) */
{click(entry(tree[0].title));let ok=true;
 for(let i=1;i<31;i++){const nx=find(P.main(),hasClass("pg-next"))[0];click(nx);if(texts(current()[0])!==tree[i].title){ok=false;break;}}
 chk("pressing Next 30 times moves the mark down the menu, page for page, in reading order",ok&&heading()===tree[30].title);}

/* 4. a tab with fewer than two named pages draws no menu; unnamed pages are not listed */
{const none=open(FM+"> [!activity|a] A\n\nJust words.\n\n***\n\nMore words.\n");
 chk("an activity with no page line draws no menu",navs().length===0);
 const one=open(FM+"> [!activity|a] A\n\n> [!page|x] Only\n\nx\n");
 chk("a tab with one named page draws no menu",navs().length===0&&heading()==="Only");
 const intro=open(FM+"> [!activity|a] A\n\nIntro words.\n\n> [!page|x] X\n\nx\n");
 chk("the words before the first page line (one named page after them) are no page: still no menu",navs().length===0);
 const two=open(FM+"> [!activity|a] A\n\nIntro words.\n\n> [!page|x] X\n\nx\n\n> [!page|parent:x] Y\n\ny\n");
 chk("with two named pages there is a menu that lists those two and not the intro page",navs().length===1&&entries().map(texts).join("|")==="X|Y",entries().map(texts).join("|"));
 chk("on the intro page nothing is marked as the page on show",current().length===0);
 const t=FM+"> [!activity|a] A\n\n> [!tab|one] One\n\n> [!page|a1] A1\n\nx\n\n> [!page|a2] A2\n\ny\n\n> [!tab|two] Two\n\n> [!page|b1] B1\n\nz\n";
 const tid=open(t),acts1=acts(A.parseFile(t))[0],second=acts1.pages.find(p=>p.tab==="two");
 chk("a menu is the tab's: the tab of two named pages has one that lists the tab's pages only",navs().length===1&&entries().map(texts).join("|")==="A1|A2");
 A.viewAt(tid).page=second.id;A.render();
 chk("and the tab of one named page has none",navs().length===0);
}

/* 5. the words are the renderer's, in each language (a booklet's `lang` sets the language of the renderer's own words) */
{const want={en:["Pages","Close"],fr:["Pages","Fermer"],es:["Páginas","Cerrar"]};
 for(const l of Object.keys(want)){open(fx.booklet(5).replace("lang: en","lang: "+l));
   chk("in "+l+" the landmark is named “"+want[l][0]+"” and Close reads “"+want[l][1]+"”",nav().attrs["aria-label"]===want[l][0]&&texts(find(nav(),hasClass("pm-close"))[0])===want[l][1]&&texts(find(nav(),hasClass("pm-open"))[0])===want[l][0],nav().attrs["aria-label"]);
   chk("and a branch's summary is named in "+l,/\S/.test(details()[0].children[0].attrs["aria-label"])&&details()[0].children[0].attrs["aria-label"]===A.STRINGS[l].pages.menuUnder(texts(entries()[0])),details()[0].children[0].attrs["aria-label"]);}
 chk("es-AR takes Spanish's words (it holds none of these itself)",!A.STRINGS_SRC["es-AR"].pages&&A.STRINGS["es-AR"].pages.menu==="Páginas");
}

console.log(fails?fails+" failed":"all ok");process.exit(fails?1:0);
