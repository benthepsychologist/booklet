// Pages in the compiler (compile/, compile 0.3.0): the static half of format 0.17's page tree, drawn.
//   1. A named page is a titled section: its title as a heading, a top page at the level the tab's prose starts at, a page under it
//      one deeper, a page's own prose one below its title, the words before a tab's first page line drawn as they always were.
//   2. Its anchor is the page's id as the renderer settles it (a written id kept when the title changes, an id made from the
//      title, a second tab's page of the same id anchored under its tab), claimed before any heading's words can take it.
//   3. The pages are in the SPEC's reading order, depth first: a child written before its parent comes after it, the pages under
//      a page follow it inside its section.
//   4. A `***` part keeps its page's title (the first part's heading holds the anchor; a later part's is quiet: not in the "On
//      this page" list, no share link, a formula in the title counted once).
//   5. A page line the format ignores (outside an activity, in an activity's opening, a missing parent, a cycle, a duplicate id)
//      is drawn as the SPEC says and the renderer's own problem line is in the report.
//   6. A link by a page's words reaches the page's anchor, in the page and from another page, with no report; a link to nothing
//      is its words, as before.
//   7. `description:` is the description of the booklet's own page (head, Open Graph, data for search, a site's front matter and
//      the report), not of an activity's page, and a booklet without one keeps the first paragraph.
//   8. The report's one Pages line says what is drawn and what is not; a booklet with no drawn page has none. The "not drawn as
//      pages yet" line and the page-title link special case of the 0.17 release are gone.
//   9. No script: pages need no booklet.js, and the script's parts and scan are as they were.
// Run: node test/compile-pagelines.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const C=require("../compile/compile.js"),E=require("../compile/engine.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const X=E.load(),FIX=path.join(__dirname,"fixtures");
const run=(text,name,form)=>C.compile([{name:name||"t",text}],{form:form||"standalone",engine:X});
const reportOf=r=>C.reportText({results:r.results,form:"standalone",renderer:"",format:""});
const fixture=fs.readFileSync(path.join(FIX,"compile-page-lines.booklet.md"),"utf8");
const filesOf=r=>r.results[0].files;
const get=(r,rel)=>String(filesOf(r).get(rel)||"");
/* the article of a page, or of the one page of a one-page booklet */
const body=(r,rel)=>{const t=get(r,rel);return t.slice(t.indexOf("<article"),t.indexOf("</article>"));};
const heads=html=>[...html.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/g)].map(m=>({level:+m[1],attrs:m[2],id:(/\bid="([^"]*)"/.exec(m[2])||[])[1],cls:(/\bclass="([^"]*)"/.exec(m[2])||[])[1]||"",
  text:m[3].replace(/<a class="bk-anchor"[\s\S]*$/,"").replace(/<[^>]+>/g,"").trim()}));
const titles=hs=>hs.filter(h=>/\bbk-page-title\b/.test(h.cls)&&!/\bbk-page-more\b/.test(h.cls));
const one=(head,more)=>'---\nbooklet: "0.17"\ntitle: One\nlang: en\n'+(more||"")+'---\n\n> [!activity|a] One\n\n'+head+'\n';

const r=run(fixture,"harbour"),rep=r.results[0].rep,text=reportOf(r),notes=body(r,"harbour/notes/index.html"),H=heads(notes);
chk("the booklet compiles",rep.ok);

/* ---- 1. a named page is a titled section ---- */
{const t=titles(H).map(h=>h.level+":"+h.text);
 chk("each named page has its title as a heading: a top page at h2, a page under it at h3, in a section of its own",
   t.join("|")==="2:Tides|3:Spring tides|2:Moons|2:Wind|3:Gusts"&&(notes.match(/<section class="bk-page">/g)||[]).length===5,t.join("|"));
 chk("a page's own prose heading starts one below its title (Neap tides, h3 under Tides, h2)",H.some(h=>h.level===3&&h.text==="Neap tides"&&!/bk-page-title/.test(h.cls)));
 chk("the words before the first page line are the first page, drawn before the pages and not in a section",
   /<p class="bk-lede">A few words before the first page line\.<\/p>/.test(notes)&&notes.indexOf("A few words before")<notes.indexOf('<section class="bk-page">'));
 chk("the page's markup is the tree: Spring tides is a section inside Tides' section, Gusts inside Wind's",
   /<section class="bk-page">\s*<h2[^>]*>Tides[\s\S]*?<section class="bk-page">\s*<h3[^>]*>Spring tides/.test(notes)
   &&/<section class="bk-page">\s*<h2[^>]*>Wind[\s\S]*?<section class="bk-page">\s*<h3[^>]*>Gusts/.test(notes));
 const tabbed=body(r,"harbour/tabbed/index.html"),th=heads(tabbed);
 chk("in a tab, the tab's name is h2 and a page of the tab is h3, inside the tab's section",
   th.some(h=>h.level===2&&h.text==="Chart")&&th.some(h=>h.level===3&&h.text==="Lines"&&/bk-page-title/.test(h.cls))
   &&/<section class="bk-tab">\s*<h2[^>]*>Chart[\s\S]*?<section class="bk-page">\s*<h3[^>]*>Lines/.test(tabbed));
 const chain=[1,2,3,4,5,6,7,8,9].map(n=>"> [!page|p"+n+(n>1?" parent:p"+(n-1):"")+"] P"+n+"\n\nwords").join("\n\n");
 const deep=run(one(chain),"deep");
 chk("a tree of nine levels is drawn whole, its headings stopping at h6",deep.results[0].rep.ok&&titles(heads(body(deep,"deep/index.html"))).map(h=>h.level).join("")==="234566666");
 const bare=run(one("> [!page|only]\n\nwords\n\n> [!page]\n\nmore"),"bare"),bh=titles(heads(body(bare,"bare/index.html")));
 chk("a page with no title is called by its id",bh.map(h=>h.text).join("|")==="only|page-2",JSON.stringify(bh));}

/* ---- 2. the anchor ---- */
{chk("the anchor is the page's id, not its title: Spring tides is #spring, and the share link goes to it",
   H.some(h=>h.id==="spring"&&h.text==="Spring tides")&&/<a class="bk-anchor" href="#spring"/.test(notes));
 const renamed=run(fixture.replace("] Spring tides","] A spring tide"),"harbour"),rh=heads(body(renamed,"harbour/notes/index.html"));
 chk("…so a renamed title keeps it",rh.some(h=>h.id==="spring"&&h.text==="A spring tide"));
 const made=run(one("> [!page|parent:map] Choosing a place\n\nwords"),"made"),mh=heads(body(made,"made/index.html"));
 chk("a page with no written id is anchored by the id made from its title (the renderer's rule)",mh.some(h=>h.id==="choosing-a-place"),JSON.stringify(mh));
 const taken=run(one("Words.\n\n## Wind\n\nA prose heading with the words of a page's id.\n\n> [!page|wind] Weather\n\nwords"),"taken"),tk=heads(body(taken,"taken/index.html"));
 chk("a prose heading earlier in the text cannot take a page's anchor: the page keeps #wind, the heading is numbered",
   tk.some(h=>h.id==="wind"&&h.text==="Weather")&&tk.some(h=>h.id==="wind-2"&&h.text==="Wind"),JSON.stringify(tk));
 const tt=titles(heads(body(r,"harbour/tabbed/index.html")));
 chk("two tabs may each have a page of one id: the second is anchored under its tab's id (#log-lines), both have share links",
   tt.map(h=>h.id).join("|")==="lines|log-lines"&&/<a class="bk-anchor" href="#log-lines"/.test(body(r,"harbour/tabbed/index.html")));
 const ids=H.map(h=>h.id).filter(Boolean);
 chk("every id on a page is used once",new Set(ids).size===ids.length,ids.join(","));}

/* ---- 3. reading order ---- */
{const order=titles(H).map(h=>h.id);
 chk("depth first: Tides, Spring tides under it, Moons, Wind, and Gusts after Wind though written before it",order.join(",")==="tides,spring,moons,wind,gusts",order.join(","));
 const sib=run(one("> [!page|a] A\n\n> [!page|b parent:a] B1\n\n> [!page|c parent:a] B2\n\n> [!page|d parent:b] Under B1\n\n> [!page|e] E"),"sib"),sh=titles(heads(body(sib,"sib/index.html")));
 chk("pages under one parent keep the file's order, each with its own pages after it, and the next sibling last",
   sh.map(h=>h.id).join(",")==="a,b,d,c,e"&&sh.map(h=>h.level).join("")==="23432",sh.map(h=>h.id+h.level).join(","));}

/* ---- 4. a *** part keeps its page's title ---- */
{const moons=/<section class="bk-page">\s*<h2[^>]*id="moons"[\s\S]*?<\/section>/.exec(notes),mh=moons?heads(moons[0]):[];
 chk("a second part of a page is under the page's title again, after the quiet divider, once for each part",
   mh.length===2&&mh[0].text==="Moons"&&mh[1].text==="Moons"&&/The moon pulls\.<\/p>\s*<hr class="bk-next-page">\s*<h2 class="bk-page-title bk-page-more"[^>]*>Moons<\/h2>\s*<p>And the sun/.test(moons[0]),moons&&moons[0]);
 chk("…the later one is quiet: the contents list names the page once",(/<nav class="bk-toc"[\s\S]*?<\/nav>/.exec(notes)[0].match(/>Moons</g)||[]).length===1);
 chk("…and only the first has a share link",(notes.match(/class="bk-anchor"/g)||[]).length===H.filter(h=>h.level>1&&h.level<5&&!/bk-page-more/.test(h.cls)).length&&!/bk-page-more[^>]*>Moons <a/.test(notes));
 const math=run(one("> [!page|m] Area of $x^2$\n\nfirst\n\n***\n\nsecond\n\n***\n\nthird"),"math");
 chk("a formula in a page's title is one formula of the booklet, though three parts draw the title",math.results[0].rep.counts.math===1&&(get(math,"math/index.html").match(/<math/g)||[]).length===3,String(math.results[0].rep.counts.math));
 chk("the parts of a page are counted as one page",math.results[0].rep.counts.pages===1);}

/* ---- 5. page lines the format ignores ---- */
{const lines=text.split("\n").filter(l=>/^    - line \d+: /.test(l));
 chk("the renderer's own words for each of them are in the report (outside an activity, in the opening, a missing parent, a cycle, a duplicate id)",
   lines.length===5&&/a page line belongs inside an activity/.test(text)&&/before an activity's first tab line is in the opening/.test(text)&&/`parent:nowhere` names no page of this tab/.test(text)
   &&/name each other as parents/.test(text)&&/the page id “dup” is used twice in this tab, so this page is called “dup-2”/.test(text),lines.join("\n"));
 const edge=titles(heads(body(r,"harbour/edge/index.html")));
 chk("a missing parent and a cycle sit at the top (the page where the cycle closes under the other), a duplicate id is numbered: all drawn",
   edge.map(h=>h.level+":"+h.id).join("|")==="2:lost|2:cycle-a|3:cycle-b|2:dup|2:dup-2",edge.map(h=>h.level+":"+h.id).join("|"));
 const home=body(r,"harbour/index.html");
 chk("a page line in a module's opening is no page: no heading, its words stay in the opening",!/>Stray</.test(home)&&/A page line in a module's opening is no page: its words stay in the opening\./.test(home));
 const tabbed=body(r,"harbour/tabbed/index.html");
 chk("a page line in the opening of an activity with tabs is no page: no heading, its words stay in the opening above the tabs",
   !/>Early</.test(tabbed)&&/<p class="bk-lede">A page line before the first tab is in the opening/.test(tabbed));}

/* ---- 6. a link by a page's words ---- */
{chk("a link by a page's title reaches the page's anchor, in its own page (Spring tides, Gusts) with its words as the link",
   /<a class="bk-link" href="#spring">Spring tides<\/a>, <a class="bk-link" href="#gusts">Gusts<\/a>/.test(notes));
 chk("…and from another page of the booklet (the page after the notes links to it on the notes' page)",
   /<a class="bk-link" href="\.\.\/notes\/#spring">Spring tides<\/a>/.test(body(r,"harbour/after/index.html")));
 chk("a link to a heading that is not a page is still a link (the activity's title)",/<a class="bk-link" href="#harbour-notes">Harbour notes<\/a>/.test(notes));
 chk("nothing is reported for them: no heading that is nowhere, no comment on the page, nothing to tidy",
   rep.marked.length===0&&!/not on this page/.test(text)&&/To tidy: nothing was left off/.test(text)&&!/names a page/.test(get(r,"harbour/notes/index.html")));
 const gone=run(fixture.replace("[[#Spring tides]], [[#Gusts]]","[[#Nowhere at all]], [[#Gusts]]"),"harbour");
 chk("a link to words that are nowhere is its words, as the renderer draws it, and the page link beside it is still a link",
   /See Nowhere at all, <a class="bk-link" href="#gusts">Gusts<\/a>/.test(get(gone,"harbour/notes/index.html"))&&gone.results[0].rep.marked.length===0);
 const md=run(one("See [Wind](#wind).\n\n> [!page|wind] Wind\n\nwords"),"md");
 chk("a link in the other written form ([words](#slug)) reaches the page's anchor too",/<a class="bk-link" href="#wind">Wind<\/a>/.test(body(md,"md/index.html")),body(md,"md/index.html"));}

/* ---- 7. description: ---- */
{const home=get(r,"harbour/index.html");
 chk("the booklet's description is its contents page's: the head, Open Graph, the data for search and the report",
   /<meta name="description" content="A made-up set of notes about a harbour\.">/.test(home)&&/<meta property="og:description" content="A made-up set of notes about a harbour\.">/.test(home)
   &&/"description":"A made-up set of notes about a harbour\."/.test(home)&&/  Description: “A made-up set of notes about a harbour\.”/.test(text));
 chk("an activity's page keeps its own first paragraph as its description, not the booklet's",
   /<meta name="description" content="A few words before the first page line\.">/.test(get(r,"harbour/notes/index.html")));
 const site=run(fixture,"harbour","site"),sp=get(site,"harbour/index.html");
 chk("the site form carries it in the front matter",/^---\ntitle: "Harbour notes"\ndescription: "A made-up set of notes about a harbour\."\nweight: 1\n/.test(sp),sp.slice(0,200));
 const long="A made-up set of notes about a harbour, which goes on past a hundred and sixty characters so that a cut would show: one sentence, kept whole as written.";
 const spaced=run(fixture.replace("description: A made-up set of notes about a harbour.","description: \"A made-up  set of notes about\\n a harbour, which goes on past a hundred and sixty characters so that a cut would show: one sentence, kept whole as written.\""),"harbour");
 chk("a long description is kept whole, its spaces made single",get(spaced,"harbour/index.html").includes('<meta name="description" content="'+long+'">'),get(spaced,"harbour/index.html").slice(0,900));
 const without=run(fixture.replace(/description: [^\n]*\n/,""),"harbour");
 chk("without one, the first paragraph is the description as before (on the contents page, the module's opening)",
   /<meta name="description" content="A page line in a module's opening is no page: its words stay in the opening\.">/.test(get(without,"harbour/index.html")));
 const single=run(one("First paragraph here.","description: What it is, in one line.\n"),"single");
 chk("a one-page booklet takes it too, on its one page",/<meta name="description" content="What it is, in one line\.">/.test(get(single,"single/index.html")));}

/* ---- 8. the report's Pages line ---- */
{const pl=text.split("\n").filter(l=>/^  Pages: /.test(l));
 chk("the report has ONE line about pages, with the number of pages drawn and what is not drawn",pl.length===1&&
   pl[0]==="  Pages: 12 pages drawn as titled sections in reading order, a page under its parent. Not drawn: Back, Up and Next, a menu of the pages and its search, a trail of the pages above, and the cards of the pages under a page.",pl[0]);
 const t1=reportOf(run(one("> [!page|only] Only\n\nwords"),"one"));
 chk("one page is said in the singular",/  Pages: 1 page drawn as titled sections/.test(t1),t1);
 const t0=reportOf(run(one("Just words."),"plain"));
 chk("a booklet with no page line has no such line",!/Pages: /.test(t0)&&!/page lines?/.test(t0),t0);
 const t00=reportOf(run(one("> [!page|early] Early\n\nwords\n\n> [!tab|t] T\n\nTab words."),"ign"));
 chk("a booklet whose only page line is ignored has no Pages line (it draws no page), and the report says why it was ignored",
   !/Pages: /.test(t00)&&/before an activity's first tab line is in the opening/.test(t00),t00);
 const src=["draw.js","compile.js"].map(f=>fs.readFileSync(path.join(__dirname,"..","compile",f),"utf8")).join("\n");
 chk("the 0.17 release's “not drawn as pages yet” line and its link special case are gone",!/not drawn as pages yet|namesPage|pageLinks|pageLines/.test(src));
 chk("the version is 0.3.0",C.VERSION==="0.3.0",C.VERSION);}

/* ---- 9. no script ---- */
{chk("a page of pages with no tab bar links no script",!/booklet\.js/.test(get(r,"harbour/notes/index.html"))&&!/booklet\.js/.test(get(r,"harbour/edge/index.html")));
 const plain=run(fixture.replace(/> \[!tab\|log\][\s\S]*?(?=> \[!activity\|edge\])/,""),"harbour"),pr=plain.results[0].rep;
 chk("…and a whole booklet of them needs none (the one page that does is the one with two tabs)",!pr.needsScript&&!pr.script&&![...filesOf(plain).keys()].some(f=>/booklet\.js$/.test(f)),JSON.stringify([pr.needsScript,pr.script]));
 const needs=require("../compile/draw.js").needsScript.toString();
 chk("needsScript does not look at a page (it names no bk-page)",!/bk-page/.test(needs));
 const dir=path.join(__dirname,"..","compile","script");
 const parts=["script.js",...fs.readdirSync(dir).map(f=>"script/"+f)].map(f=>fs.readFileSync(path.join(__dirname,"..","compile",f),"utf8")).join("\n");
 chk("the script's parts know nothing of pages",!/bk-page/.test(parts));
 chk("…and there is no new part in the compiler's script folder",fs.readdirSync(dir).join(",")==="10-quiz.js,reading-cites.js,reading-folds.js,reading-links.js,reading-tabs.js,reading-views.js");}
console.log(fails?"\n"+fails+" FAILURES":"\ncompile pages (the page tree) passed");process.exit(fails?1:0);
