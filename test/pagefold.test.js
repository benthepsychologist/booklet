// Reading mode folds page by page (0.11.7): a page of prose and reading callouts with two or more sections folds, a page
// with a question or a `booklet query` is drawn open, and an activity that repeats never folds, whatever the pages beside
// them hold. Also: an activity's card on its module's screen shows the activity's first paragraph, as a module's card shows
// the module's. Run: node test/pagefold.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const FM='---\nbooklet: "0.11"\ntitle: T\nlang: en\n---\n\n';
const A=P.boot();
const END="\n> [!module|m end] End\n";
const pgs=a=>a.pages||[{id:"",blocks:a.blocks}];
const isOpen=d=>d.attrs.open!=null&&d.attrs.open!=="false";
const secs=()=>P.find(P.main(),P.hasClass("rm-sec"));
const bars=()=>P.find(P.main(),P.hasClass("rm-bar"));
const counts=()=>P.find(P.main(),P.hasClass("rm-count")).map(n=>P.texts(n));
const draw=(id,page)=>{if(page) A.showPage(id,page);A.screen=id;A.render();};
const PROSE1="## One\n\nFirst.\n\n## Two\n\nSecond.\n\n";
const PROSE2="## Three\n\nThird.\n\n## Four\n\nFourth.\n\n## Five\n\nFifth.\n\n";

/* 1. one activity: two prose pages, then the questions */
{A.loadText(FM+"> [!module|m] M\n\n> [!activity|a] A\n\nLede line.\n\n"+PROSE1+"---\n\n"+PROSE2+"---\n\n# Ask\n\n> [!text|q] What stood out?\n"+END);
 const a=A.activityOf("m/a");
 const pg=a.pages;
 chk("the activity has three pages",pg.length===3,String(pg.length));
 chk("a page of prose reads, the page with the question does not",A.readsOnly(a,pg[0])&&A.readsOnly(a,pg[1])&&!A.readsOnly(a,pg[2]));
 chk("asked of the whole activity (no page), the question keeps it from being a reading-only activity",!A.readsOnly(a));
 draw("m/a","p1");
 chk("page one folds into its two sections",secs().length===2&&secs().every(d=>!isOpen(d)),String(secs().length));
 chk("it carries the open/fold controls and the count line",bars().length===1&&/0 of 2/.test(counts()[0]||""),JSON.stringify(counts()));
 chk("the pages menu lists its sections",P.find(P.main(),P.hasClass("ap-sec")).length===2);
 draw("m/a","p2");
 chk("page two folds into its three sections, with its own count",secs().length===3&&/0 of 3/.test(counts()[0]||""),JSON.stringify(counts()));
 draw("m/a","p3");
 chk("the questions page is drawn open: no folded section, no controls, no count, no section list",
   secs().length===0&&bars().length===0&&counts().length===0&&P.find(P.main(),P.hasClass("ap-sec")).length===0);
 chk("and its question is there",/What stood out/.test(P.texts(P.main())));
 /* the open state is kept across a redraw and a page change */
 draw("m/a","p1");
  secs()[1].open=true;secs()[1]._on.toggle();
 chk("the page remembers which section was opened",Object.values(A.RM_STATE).some(s=>s.open.has(1)));
 A.render();
 chk("a redraw draws that section open again, the other still folded",secs().length===2&&isOpen(secs()[1])&&!isOpen(secs()[0]),JSON.stringify(secs().map(isOpen)));
 chk("the count follows",/1 of 2/.test(counts()[0]||""),JSON.stringify(counts()));
 draw("m/a","p2");draw("m/a","p1");
 chk("a page change and back keeps it",isOpen(secs()[1])&&/1 of 2/.test(counts()[0]||""));
 chk("every state key is per page, so page two's sections are its own",new Set(Object.keys(A.RM_STATE)).size>=2,Object.keys(A.RM_STATE).join("|"));
}

/* 2. a page with a booklet query is drawn open, its sibling prose page folds */
{A.loadText(FM+"> [!module|m] M\n\n> [!activity|log repeat] Log\n\n> [!text|what] What?\n\n> [!activity|look] Look\n\n"+PROSE1+"---\n\n## Shown\n\n```booklet query\nfrom: log\n```\n\n## Again\n\ntext\n"+END);
 const a=A.activityOf("m/look");
 chk("a page holding a booklet query does not read",A.readsOnly(a,a.pages[0])&&!A.readsOnly(a,a.pages[1]));
 draw("m/look","p1");chk("the prose page folds",secs().length===2);
 draw("m/look","p2");chk("the query page is drawn open, with two sections' worth of headings left as they are",secs().length===0&&bars().length===0);
 chk("a repeating activity never folds",!A.readsOnly(A.activityOf("m/log"),pgs(A.activityOf("m/log"))[0]));
 A.loadText(FM+"> [!activity|r repeat] Log\n\n"+PROSE1);
 draw("r");chk("even a repeating activity of nothing but prose and sections",secs().length===0&&bars().length===0);
}

/* 3. the old whole-activity cases still hold */
{A.loadText(FM+"> [!activity|a] A\n\n"+PROSE1);
 chk("a reading-only activity folds",A.readsOnly(A.activityOf("a"))&&(draw("a"),secs().length===2));
 A.loadText(FM+"> [!activity|a] A\n\n"+PROSE1+"> [!text|q] Ask?\n");
 chk("one question on its only page keeps it open",!A.readsOnly(A.activityOf("a"))&&(draw("a"),secs().length===0));
}

/* 4. an activity's card shows its first paragraph */
{const card=(id)=>{A.screen="module:"+id;A.render();return P.find(P.main(),P.hasClass("mode"));};
 const F=FM+"> [!module|m] M\n\nModule words.\n\n";
 A.loadText(F+"> [!activity|a] First\n\nA **bold** start with snake_case, $x$ and ![alt text](https://t.example/p.png), see [the guide](g.md).\nSecond line of it.\n\nNot the card.\n\n> [!activity|b] Second\n\n> [!text|q] Q?\n\n> [!activity|c] Third\n\n## Heading first\n\nThe paragraph after a heading.\n"+END);
 const cs=card("m"),words=cs.map(c=>P.texts(P.find(c,P.hasClass("d"))[0]||c));
 const cards=cs.length;
 chk("a module's screen has a card for each activity",cards===3,String(cards));
 chk("an activity's card shows its first paragraph as inline Markdown read to text",words[0]==="A bold start with snake_case, x and alt text, see the guide. Second line of it.",JSON.stringify(words[0]));
 chk("an activity with no paragraph shows its title alone",words[1]==="",JSON.stringify(words[1]));
 chk("a heading above the paragraph is passed over, as for a module",words[2]==="The paragraph after a heading.",JSON.stringify(words[2]));
 chk("the activity's own screen does not draw the paragraph twice",(()=>{draw("m/a");const t=P.texts(P.main());return t.split("Not the card").length===2&&t.split("Second line of it").length===2;})());
 chk("a module with a notice or footnote lines does not lose its own blurb",A.allModules()[0].blurb==="Module words.",String(A.allModules()[0].blurb));
}
console.log(fails?"\n"+fails+" FAILURES":"\npagefold checks passed");P.closePages();process.exit(fails?1:0);
