// Many pages from one booklet, and translation links (compile/, compile 0.2.0).
//   1. Addresses. A booklet that shows two or more activities is a contents page at <name>/ and one page for each
//      activity at <name>/<id>/. One that shows one (or none) is the single page compile 0.1.0 wrote. Two activities of one
//      id in two modules take their module's id in front; a clash that is left takes a number.
//   2. Every link works. In every page of every booklet that is many pages (both forms), each relative link reaches a
//      file the compiler wrote, and a link with a fragment reaches an id in it. A heading link, a module link and a link to a
//      module's tab that cross from one page to another are checked by name, and so is a link to another booklet.
//   3. No page is orphaned: every page of a booklet is reached from its contents page by following links, and every
//      activity page links back to it.
//   4. The way on: the first page has no "back", the last no "next", the others both, in the booklet's reading order, and
//      an activity under another comes after it, nested under its card on the contents page.
//   5. Translations (SPEC.md section 9): booklets with one front matter id and each its own language link to each other,
//      page for page, with <link rel="alternate" hreflang> in a standalone page and `alternates` in the site form's front
//      matter. A group that shares a language, or a page the other has no copy of, is not linked.
//   6. The site form: each page is a fragment with front matter and a `weight` (its place in the report's list).
//   7. A page tidied by hand is kept, page by page: the booklet's other pages are written again.
//   8. An image beside a many-page booklet is copied once and reached from every page.
// Run: node test/compile-pages.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path"),os=require("os"),cp=require("child_process");
const ROOT=path.join(__dirname,".."),FIX=path.join(__dirname,"fixtures"),CLI=path.join(ROOT,"compile","compile.js");
const C=require("../compile/compile.js"),E=require("../compile/engine.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const X=E.load();
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"booklet-compile-pages-"));
const HEAD='---\nbooklet: "0.16"\nid: t/ID\ntitle: TITLE\nlang: LANG\n---\n\n';
const booklet=(title,body,o)=>HEAD.replace("TITLE",title).replace("ID",(o&&o.id)||"x").replace("LANG",(o&&o.lang)||"en")+body;
const compileText=(text,name,form,o)=>C.compile([{text,name,dir:TMP}],{form:form||"standalone",engine:X,...o}).results[0];
const keysOf=r=>[...r.files.keys()].sort();
const pagesOf=r=>keysOf(r).filter(k=>k.endsWith("/index.html"));
const fixture=n=>({file:path.join(FIX,n+".booklet.md")});

/* ======================= 1. addresses ======================= */
const TWO="> [!activity|first] The first\n\nWords of the first.\n\n> [!activity|second] The second\n\nWords of the second.\n";
{const r=compileText(booklet("Two",TWO),"two");
  chk("two activities: a contents page and a page for each, at <name>/<id>/",JSON.stringify(pagesOf(r))===JSON.stringify(["two/first/index.html","two/index.html","two/second/index.html"]),pagesOf(r).join(", "));
  const one=compileText(booklet("One",TWO.replace("> [!activity|second]","> [!activity|second hidden]")),"one");
  chk("one shown activity (the other hidden): the one page 0.1.0 wrote, with no contents, no card and no way on",JSON.stringify(keysOf(one))===JSON.stringify(["one/index.html"])
    &&!/bk-cards|bk-pager|bk-crumb|hreflang/.test(one.files.get("one/index.html"))&&one.rep.pageList.length===1,keysOf(one).join(", "));
  const none=compileText(booklet("None","Just some words, no activity line.\n"),"none");
  chk("a booklet with no activity line is one page",JSON.stringify(keysOf(none))===JSON.stringify(["none/index.html"]));
  const mods=booklet("Mods","> [!module|a] Module A\n\n> [!activity|intro] An intro\n\nA.\n\n> [!activity|more] More of A\n\nA2.\n\n> [!module|a end] End\n\n> [!module|b] Module B\n\n> [!activity|intro] Another intro\n\nB.\n\n> [!module|b end] End\n");
  const m=compileText(mods,"mods");
  chk("an activity id used in two modules takes its module's id in front: a-intro, b-intro; an id used once stays as written (more)",
    JSON.stringify(pagesOf(m))===JSON.stringify(["mods/a-intro/index.html","mods/b-intro/index.html","mods/index.html","mods/more/index.html"]),pagesOf(m).join(", "));
  const upper=compileText(booklet("Cases","> [!activity|Alpha] One\n\nx\n\n> [!activity|alpha] Two\n\ny\n"),"cases");
  chk("two ids that differ only in case are two folders, the second numbered",JSON.stringify(pagesOf(upper))===JSON.stringify(["cases/alpha-2/index.html","cases/alpha/index.html","cases/index.html"]),pagesOf(upper).join(", "));
  chk("the report lists the pages in reading order, the contents page first",JSON.stringify(r.rep.pageList.map(p=>p.path))===JSON.stringify(["two/index.html","two/first/index.html","two/second/index.html"])&&r.rep.pageList[0].kind==="contents");
  const rep=C.reportText({results:[r],form:"standalone",renderer:"",format:""});
  chk("…and the printed report says so, with the numbers a site's menu is built from",/Pages, in reading order[^\n]*\n\s+1\. two\/index\.html \(the contents page\): Two\n\s+2\. two\/first\/index\.html: The first\n\s+3\. two\/second\/index\.html: The second\n/.test(rep),rep);}

/* ======================= 2. every link works ======================= */
const set=[fixture("compile-pages"),fixture("compile-kinds"),fixture("compile-pair"),{file:path.join(FIX,"compile-pair.es.booklet.md")},
  ...["how-tides-work","project-board"].map(n=>({file:path.join(ROOT,"examples",n+".booklet.md")}))];
const tour=booklet("A tour","> [!activity|start] Start\n\nGo to [[compile-pages.booklet]] or [[compile-pair.booklet]].\n\n> [!activity|end] End\n\nBack to [[#Start]].\n",{id:"tour"});
const hub=booklet("A hub","# A hub\n\nOne page, one activity. See [[compile-pages.booklet]].\n",{id:"hub"});
const run=C.compile([...set,{text:tour,name:"tour",dir:TMP},{text:hub,name:"hub",dir:TMP}],{form:"both",baseUrl:"",engine:X});
const all=new Map();for(const r of run.results) for(const [k,v] of r.files) all.set(k,v);
const resolve=(from,href)=>{const u=new URL(href,"http://t/"+from);let p=decodeURIComponent(u.pathname.slice(1));if(p.endsWith("/")) p+="index.html";return {key:p,hash:decodeURIComponent(u.hash.slice(1))};};
const linksOf=t=>[...String(t).matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map(m=>m[1]).filter(h=>!/^[a-z][a-z0-9+.-]*:/i.test(h));
const idsOf=t=>new Set([...String(t).matchAll(/\sid="([^"]*)"/g)].map(m=>m[1]));
chk("the set compiles",run.results.every(r=>r.rep.ok),run.results.filter(r=>!r.rep.ok).map(r=>r.rep.source+": "+r.rep.refused).join("; "));
{const bad=[];let n=0;
  for(const [key,text] of all){if(!key.endsWith("/index.html")) continue;
    for(const m of text.matchAll(/<a class="bk-link"(?![^>]*\shref=)[^>]*>/g)) bad.push(key+": a link with no address ("+m[0].slice(0,60)+")");
    for(const h of linksOf(text)){n++;const t=resolve(key,h);
      if(!all.has(t.key)){bad.push(key+" → "+h+" (no such file)");continue;}
      if(t.hash&&!idsOf(all.get(t.key)).has(t.hash)) bad.push(key+" → "+h+" (no such id)");}}
  chk("every relative link on every page, in both forms, reaches a file the compiler wrote, and its fragment an id in it ("+n+" links)",n>100&&!bad.length,bad.slice(0,5).join(" | "));}
{const at=(book,folder)=>"standalone/"+book+"/"+(folder?folder+"/":"")+"index.html";
  const has=(page,href,text)=>new RegExp('<a class="bk-link" href="'+href.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+'">'+text).test(all.get(page));
  chk("a heading link to an activity on another page goes to that page: shaping → ../flour/#flour-and-water",has(at("compile-pages","shaping"),"../flour/#flour-and-water","Flour and water"));
  chk("…and from the contents page: crust/#crust-and-colour",has(at("compile-pages",""),"crust/#crust-and-colour","Crust and colour"));
  chk("a link to a module's tab, from an activity page, goes to the contents page's tab: ../#go-further",has(at("compile-pages","crust"),"../#go-further","Go further")&&has(at("compile-pages","crust"),"../#start-here","Start here"));
  chk("a link to a module of one activity goes to that activity's page: rye/#bread-extras",has(at("compile-pages",""),"rye/#bread-extras","Bread extras"));
  chk("a heading link within the page stays within it: #resting",has(at("compile-pages","flour"),"#resting","Resting"));
  chk("a link to another booklet from an activity page is two folders up: ../../compile-pages/, and ../../compile-pair/",has(at("tour","start"),"../../compile-pages/","A pocket guide to bread")&&has(at("tour","start"),"../../compile-pair/","Two ways to boil an egg"));
  chk("…and from a booklet of one page, one folder up, as in 0.1.0",has(at("hub",""),"../compile-pages/","A pocket guide to bread"));
  const stillMarked=run.results.map(r=>r.rep.marked.filter(m=>m.kind==="heading")).flat();
  chk("no heading link is left as words for lack of its target",!stillMarked.length,stillMarked.map(m=>m.what).join(", "));}
/* a heading link whose page is never drawn stays marked: the activity is hidden, so there is no page to go to */
{const r=compileText(booklet("Links","> [!activity|a] A\n\nSee [[#Gone]].\n\n> [!activity|b] B\n\nWords.\n\n> [!activity|gone hidden] Gone\n\nHidden words.\n"),"links");
  const m=r.rep.marked.filter(x=>x.kind==="heading");
  chk("a link to a hidden activity is marked and shown as its words, not left pointing nowhere",m.length===1&&!/<a [^>]*>Gone<\/a>/.test(r.files.get("links/a/index.html"))&&/<!-- booklet: the link to “Gone”/.test(r.files.get("links/a/index.html")),JSON.stringify(m));}

/* ======================= 3. no page is orphaned ======================= */
{const bad=[];let books=0;
  for(const r of run.results){const name=r.rep.name,pages=r.rep.pageList.map(p=>p.path);if(pages.length<2) continue;books++;
    for(const form of ["standalone","site"]){const seen=new Set(),todo=[form+"/"+name+"/index.html"];
      while(todo.length){const k=todo.pop();if(seen.has(k)) continue;seen.add(k);
        for(const h of linksOf(all.get(k)||"")){const t=resolve(k,h).key;if(t.startsWith(form+"/"+name+"/")&&!seen.has(t)) todo.push(t);}}
      for(const p of pages) if(!seen.has(form+"/"+p)) bad.push(form+"/"+p+" is not reached from the contents page");
      for(const p of pages.slice(1)){const back=linksOf(all.get(form+"/"+p)).map(h=>resolve(form+"/"+p,h).key);
        if(!back.includes(form+"/"+name+"/index.html")) bad.push(form+"/"+p+" has no link back to the contents");}}}
  chk("every page of every many-page booklet is reached from its contents page, and links back to it ("+books+" booklets, both forms)",books>=5&&!bad.length,bad.slice(0,4).join(" | "));
  /* the check can fail: a page nobody links to is found */
  const orphan=new Map(all);orphan.set("standalone/compile-pages/lost/index.html","<p>x</p>");
  chk("…and the check finds a page that no card links to",![...linksOf(orphan.get("standalone/compile-pages/index.html"))].some(h=>resolve("standalone/compile-pages/index.html",h).key==="standalone/compile-pages/lost/index.html"));}

/* ======================= 4. the way on, and the order ======================= */
{const t=k=>all.get("standalone/compile-pages/"+k+"index.html"),nav=k=>(/<nav class="bk-pager"[^]*?<\/nav>/.exec(t(k))||[""])[0];
  const order=["flour","shaping","crust","rye"];
  chk("the pages read in the booklet's order, a page before the ones under it: flour, shaping, crust, rye",JSON.stringify(run.results.find(r=>r.rep.name==="compile-pages").rep.pageList.slice(1).map(p=>p.path.split("/")[1]))===JSON.stringify(order));
  chk("the first page has no way back and the last none forward",!/rel="prev"/.test(nav("flour/"))&&/rel="next" href="\.\.\/shaping\/"/.test(nav("flour/"))&&!/rel="next"/.test(nav("rye/"))&&/rel="prev" href="\.\.\/crust\/"/.test(nav("rye/")));
  chk("a page in the middle has both, and a link to the contents",/rel="prev" href="\.\.\/flour\/"/.test(nav("shaping/"))&&/rel="next" href="\.\.\/crust\/"/.test(nav("shaping/"))&&/class="bk-up" href="\.\.\/"/.test(nav("shaping/")));
  const c=t("");
  chk("on the contents page an activity under another is a card inside the card of its parent",/<a class="bk-card-title" href="flour\/">[^]*?<ol class="bk-cards">\s*<li class="bk-card">[^]*?<a class="bk-card-title" href="shaping\/">/.test(c));
  chk("a card has its title, its picture (an icon, an emoji or a number), its blurb and its status line",
    /bk-card-pic" aria-hidden="true"><span class="bk-ci"/.test(c)&&/bk-card-pic" aria-hidden="true">🍞</.test(c)&&/bk-card-pic" aria-hidden="true">1</.test(c)
    &&/<a class="bk-card-title" href="shaping\/">Shaping the loaf<\/a>/.test(c)&&/bk-card-blurb">A hot oven/.test(c)&&/bk-card-status">A morning's work</.test(c)&&/bk-card-status">1 question</.test(c));
  chk("a module's tabs are on the contents page, each with its prose and its cards",/<section class="bk-tab">\s*<h3[^>]*>Start here[^]*?Pick a morning[^]*?<ol class="bk-cards">[^]*?<section class="bk-tab">\s*<h3[^>]*>Go further[^]*?Once the first loaf works[^]*?<ol class="bk-cards">/.test(c));
  chk("a hidden activity has no page and no card",!all.has("standalone/compile-pages/notes/index.html")&&!/Hidden notes|Never on the page/.test(c));
  chk("a page has its own title, description and head: the activity's title, then the booklet's",/<title>Crust and colour – A pocket guide to bread<\/title>/.test(t("crust/"))&&/<meta name="description" content="A hot oven and a pan of water give a crisp, brown crust\.">/.test(t("crust/"))
    &&/<link rel="stylesheet" href="\.\.\/\.\.\/booklet\/booklet\.css">/.test(t("crust/")));
  chk("a module of one activity is its activity's page, titled by the module (here Bread extras), and carries the module's notice",/<title>Bread extras – A pocket guide to bread<\/title>/.test(t("rye/"))&&/About this module/.test(t("rye/")));
  {const hs=compileText(booklet("Heads","> [!activity|a] A\n\n## One\n\nx\n\n## Two\n\ny\n\n> [!activity|b] B\n\nz\n"),"heads","both").files.get("site/heads/a/index.html");
    chk("…on a site, below the line that links back to the contents, since the layout draws the title",/<article[^>]*>\s*<p class="bk-crumb">[^]*?<\/p>\s*<nav class="bk-toc"/.test(hs),hs.slice(0,400));}
  chk("an activity page has its own 'On this page' list when it has two or more headings, and its notes",/<nav class="bk-toc"/.test(compileText(booklet("Heads","> [!activity|a] A\n\n## One\n\nx\n\n## Two\n\ny\n\n> [!activity|b] B\n\nz\n"),"heads").files.get("heads/a/index.html"))&&/<section class="bk-notes"/.test(t("crust/")));}

/* ======================= 5. translations ======================= */
{const pg=(form,n,f)=>all.get(form+"/"+n+"/"+(f?f+"/":"")+"index.html");
  const alts=t=>[...t.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(m=>m[1]+" "+m[2]);
  chk("a standalone page links its translations, itself among them: contents",JSON.stringify(alts(pg("standalone","compile-pair","")))===JSON.stringify(["en ../compile-pair/","es ../compile-pair.es/"]),alts(pg("standalone","compile-pair","")).join("|"));
  chk("…an activity's page, from two folders down",JSON.stringify(alts(pg("standalone","compile-pair.es","hard")))===JSON.stringify(["en ../../compile-pair/hard/","es ../../compile-pair.es/hard/"]),alts(pg("standalone","compile-pair.es","hard")).join("|"));
  chk("the language is each booklet's own, as 0.1.0 reads it",/<html lang="es">/.test(pg("standalone","compile-pair.es",""))&&/<html lang="en">/.test(pg("standalone","compile-pair","")));
  chk("a booklet with no translation has none",!/hreflang/.test(pg("standalone","compile-pages",""))&&!/alternates/.test(pg("site","compile-pages","")));
  const fm=pg("site","compile-pair.es","soft");
  chk("the site form writes them as `alternates` in the front matter, as quoted strings, with the page's weight",
    /^---\ntitle: "Un huevo blando"\ndescription: "[^\n]*"\nweight: 2\nalternates:\n  - hreflang: "en"\n    href: "\.\.\/\.\.\/compile-pair\/soft\/"\n  - hreflang: "es"\n    href: "\.\.\/\.\.\/compile-pair\.es\/soft\/"\n---\n<!-- booklet compile/.test(fm),fm.slice(0,400));
  const abs=C.compile([fixture("compile-pair"),{file:path.join(FIX,"compile-pair.es.booklet.md")}],{form:"both",baseUrl:"https://example.org/lib",engine:X});
  const a=abs.results[1].files;
  chk("with --base-url the addresses are whole, in the head and in the front matter, and the canonical address is the page's own",
    JSON.stringify(alts(a.get("standalone/compile-pair.es/hard/index.html")))===JSON.stringify(["en https://example.org/lib/compile-pair/hard/","es https://example.org/lib/compile-pair.es/hard/"])
    &&a.get("standalone/compile-pair.es/hard/index.html").includes('<link rel="canonical" href="https://example.org/lib/compile-pair.es/hard/">')
    &&a.get("site/compile-pair.es/hard/index.html").includes('    href: "https://example.org/lib/compile-pair/hard/"'));
  chk("the report names a booklet's translations",/Translations, linked with hreflang: es \(compile-pair\.es\)/.test(C.reportText(abs)));
  /* the check can fail: two booklets in one language are not translations */
  const twin=C.compile([{text:booklet("Eggs","# Eggs\n\nOne.\n",{id:"same"}),name:"eggs-a",dir:TMP},{text:booklet("Eggs again","# Eggs again\n\nTwo.\n",{id:"same"}),name:"eggs-b",dir:TMP}],{form:"standalone",engine:X});
  chk("two booklets of one id and one language are not linked",twin.results.every(r=>!/hreflang/.test(r.files.get(r.rep.name+"/index.html"))&&!r.rep.translations.length));
  const three=C.compile([{text:booklet("Eggs","# Eggs\n\nOne.\n",{id:"trio"}),name:"t-en",dir:TMP},{text:booklet("Huevos","# Huevos\n\nUno.\n",{id:"trio",lang:"es"}),name:"t-es",dir:TMP},
    {text:booklet("Oeufs","# Oeufs\n\nUn.\n",{id:"trio",lang:"pt-br"}),name:"t-pt",dir:TMP}],{form:"standalone",engine:X});
  chk("a one-page booklet is linked too, to each of its translations, the language as the renderer spells it (pt-BR)",
    JSON.stringify(alts(three.results[0].files.get("t-en/index.html")))===JSON.stringify(["en ../t-en/","es ../t-es/","pt-BR ../t-pt/"]),alts(three.results[0].files.get("t-en/index.html")).join("|"));
  /* a page the other has no copy of is not linked: the Spanish copy lacks "hard" */
  const part=C.compile([fixture("compile-pair"),{text:fs.readFileSync(path.join(FIX,"compile-pair.es.booklet.md"),"utf8").replace("> [!activity|hard] Un huevo duro","> [!activity|hard-es] Un huevo duro").replace("[[#Un huevo blando]]","[[#Un huevo blando]]"),name:"compile-pair.es",dir:TMP}],{form:"standalone",engine:X});
  chk("a page that its translation has no page for carries no link (soft is linked, hard is not)",alts(part.results[0].files.get("compile-pair/soft/index.html")).length===2&&alts(part.results[0].files.get("compile-pair/hard/index.html")).length===0);}

/* ======================= 6. the site form ======================= */
{const r=run.results.find(x=>x.rep.name==="compile-pages");
  const sites=[...r.files].filter(([k])=>k.startsWith("site/")&&k.endsWith("/index.html"));
  chk("each page of the site form is a fragment under front matter, with its weight 1, 2, 3…",sites.length===5&&sites.every(([k,v],i)=>/^---\ntitle: "[^\n]*"\n(description: "[^\n]*"\n)?weight: \d+\n---\n<!-- booklet compile/.test(v))
    &&JSON.stringify(sites.map(([,v])=>+/weight: (\d+)/.exec(v)[1]))===JSON.stringify([1,2,3,4,5]),sites.map(([k])=>k).join(", "));
  chk("…in the order the report lists them (contents, flour, shaping, crust, rye)",JSON.stringify(sites.map(([k])=>k.split("/")[2]))===JSON.stringify(["index.html","flour","shaping","crust","rye"]));
  chk("…and none opens a template ({{, {%, {#)",sites.every(([,v])=>!/\{\{|\{%|\{#/.test(v)));
  chk("a site fragment has no title heading (the layout draws it) but has the way on",sites.every(([,v])=>!/<h1/.test(v))&&sites.slice(1).every(([,v])=>/class="bk-pager"/.test(v)));}

/* ======================= 7. a page tidied by hand is kept, page by page ======================= */
{const out=path.join(TMP,"stamp"),src=path.join(FIX,"compile-pages.booklet.md");
  const cli=(args)=>cp.spawnSync(process.execPath,[CLI,...args],{cwd:TMP,encoding:"utf8"});
  let r=cli(["--out",out,src]);chk("a many-page booklet compiles from the command",r.status===0&&fs.existsSync(path.join(out,"compile-pages","crust","index.html")),r.stderr||r.stdout);
  const crust=path.join(out,"compile-pages","crust","index.html"),flour=path.join(out,"compile-pages","flour","index.html"),home=path.join(out,"compile-pages","index.html");
  const tidied=fs.readFileSync(crust,"utf8").replace("A hot oven","A very hot oven");fs.writeFileSync(crust,tidied);
  const homeWas=fs.readFileSync(home,"utf8");fs.rmSync(flour);fs.writeFileSync(home,homeWas.replace("Baking basics","Baking basics, tidied"));
  r=cli(["--out",out,src]);
  chk("a rerun keeps the page that was tidied, and says so (exit 1)",r.status===1&&fs.readFileSync(crust,"utf8")===tidied&&/KEPT BACK, not overwritten[^]*compile-pages\/crust\/index\.html: changed by hand/.test(r.stdout)
    &&/compile-pages\/index\.html: changed by hand/.test(r.stdout),r.stdout.slice(0,500));
  chk("…while the booklet's other pages are written again (the missing flour page is back)",fs.existsSync(flour)&&/<h1 id="flour-and-water">/.test(fs.readFileSync(flour,"utf8")));
  r=cli(["--force","--out",out,src]);
  chk("--force writes them all again",r.status===0&&!fs.readFileSync(crust,"utf8").includes("A very hot oven")&&!fs.readFileSync(home,"utf8").includes("tidied"));}

/* ======================= 8. an image beside a many-page booklet ======================= */
{const book=path.join(TMP,"pics");fs.mkdirSync(book,{recursive:true});
  const PNG=Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0,0,0,13,0x49,0x48,0x44,0x52,0,0,0,1,0,0,0,1,8,6,0,0,0]);
  fs.writeFileSync(path.join(book,"leaf.png"),PNG);
  const text=booklet("Pics","# Pics\n\nOpening words and a picture: ![A leaf](leaf.png)\n\n> [!activity|a] A\n\nA picture: ![A leaf](leaf.png)\n\n> [!activity|b] B\n\nNo picture.\n");
  const r=C.compile([{text,name:"pics",dir:book}],{form:"both",engine:X}).results[0];
  chk("an image on the contents page is reached as written, and on an activity's page one folder up",/<img src="leaf\.png"/.test(r.files.get("standalone/pics/index.html"))&&/<img src="\.\.\/leaf\.png"/.test(r.files.get("standalone/pics/a/index.html")));
  chk("…and is copied once, beside the contents page, in each form",keysOf(r).filter(k=>k.endsWith("leaf.png")).join()==="site/pics/leaf.png,standalone/pics/leaf.png");}

fs.rmSync(TMP,{recursive:true,force:true});
console.log(fails?"\n"+fails+" FAILURES":"\ncompile pages passed");process.exit(fails?1:0);
