// What the compiler (compile/) draws for a query block and a theme block, and what it never reads.
//   1. The views. test/fixtures/compile-views.booklet.md draws every one of the six views, with and without group:, with an
//      empty: line and without, a nested list, a limit, a link, an icon, a tone and values that are hostile (a script's
//      words, an address that runs script, a heading that is not there). The markup contract is held: data-bk-view on the
//      container, data-bk-row on each row, data-bk-col="<field>" on each value, whose text is the value. A chart is followed
//      by the table of its numbers, in a fold, and nothing written reads as script or a handler.
//   2. Kept entries. A query over what a reader kept (an activity's entries, a question's answers) is drawn empty: its empty:
//      line, or nothing, and a summary: on query never has rows. The fixture's records region holds marker words and
//      numbers that must reach no file, the report or what the command prints.
//   3. The theme. test/fixtures/compile-theme.booklet.md names colours (one of them too faint to read), and values that are
//      not colours or words. The page takes the booklet's colours as --bk-* variables on its article and nothing else, holds
//      them to the contrast the renderer holds them to (4.5 to 1) as the renderer does, says in the build report which it
//      left out, and has no way to write CSS, load anything or leave the article. The two tables the compiler holds (density
//      and font) are the renderer's own.
//   4. A list nested thousands of levels deep is drawn, in full, and does not take the compiler down.
// Each check says what it fails without, in the line above it. Run: node test/compile-views.test.js   (Needs node.)
const fs=require("fs"),path=require("path"),os=require("os"),cp=require("child_process");
const ROOT=path.join(__dirname,".."),FIX=path.join(__dirname,"fixtures"),CLI=path.join(ROOT,"compile","compile.js");
const C=require("../compile/compile.js"),E=require("../compile/engine.js"),Th=require("../compile/theme.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const X=E.load();
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"booklet-views-"));
const cli=(args)=>cp.spawnSync(process.execPath,[CLI,...args],{cwd:TMP,encoding:"utf8"});
const tree=d=>!fs.existsSync(d)?[]:fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tree(path.join(d,e.name)).map(x=>e.name+"/"+x):[e.name]);
const compileOne=(file,form)=>{const run=C.compile([{file}],{form:form||"standalone",engine:X}),r=run.results[0];
  /* a booklet that shows several activities is a contents page and a page for each: `page` is all of them, in the order the report lists them */
  const pages=r.rep.pages.filter(p=>p.endsWith("index.html")).map(p=>r.files.get(p)||"");
  return {run,r,pages,page:pages.join("\n"),report:C.reportText(run)};};
const count=(s,re)=>(s.match(re)||[]).length;
/* the views on a page, each one's markup, in order: from one data-bk-view to the next */
const viewsOf=page=>{const out=[],re=/<div class="bk-view[^"]*" data-bk-view="([a-z]+)"/g;let m,prev=null;
  const close=()=>{if(prev) prev.html=page.slice(prev.at,page.indexOf("</article>",prev.at));};
  while((m=re.exec(page))){const e=page.indexOf("</article>",prev?prev.at:0);
    if(prev&&e>=0&&e<m.index) close(); else if(prev) prev.html=page.slice(prev.at,m.index);
    prev={as:m[1],at:m.index};out.push(prev);}
  close();return out;};

/* ======================= 1. the views ======================= */
const V=compileOne(path.join(FIX,"compile-views.booklet.md"));
chk("the views fixture compiles",V.r.rep.ok&&V.page.length>0,V.r.rep.refused);
const views=viewsOf(V.page);
/* without views.js's drawers there is no container at all */
chk("all six views are drawn: tiles, cards, table, list, bars and line",["tiles","cards","table","list","bars","line"].every(a=>views.some(v=>v.as===a)),views.map(v=>v.as).join(" "));
/* the fixture has 13 queries over data: 2 tiles, 2 cards, 2 tables, 3 lists (one nested), 2 bars, 2 lines (a line of one point too) */
chk("a query over data draws one container each (20), and an empty one draws none",views.length===20,views.map(v=>v.as).join(" "));
chk("every container says which view it is, once, and every row says it is a row",views.every(v=>count(v.html,/data-bk-view=/g)===1));
/* (the last seven: cards and a list whose fields: are also roles, a five-series line, bars of 1e-300, a line of 1e300, cards and a table over odd keys) a row's count per view, from the fixture: tiles 4, 4 (grouped); cards 5, 5; table 5, 4 (limit: 4); list 5, 5, 6 (nested: every row, inside its folds); bars 5, 5; a line has no rows */
const rowCounts=views.map(v=>count(v.html,/ data-bk-row\b/g)).join(" ");
chk("each view has the rows its query asks for (with group:, limit: and a nested list's children counted)",rowCounts==="4 4 5 5 5 4 5 5 6 5 5 0 0 5 5 0 2 0 2 2",rowCounts);
/* each field is named once in a row, whatever asks for it: a field in fields: that also plays a role is the role's */
{const bad=[];views.forEach((v,i)=>v.html.split(/ data-bk-row\b/).slice(1).forEach((chunk,j)=>{
    const keys=[...chunk.matchAll(/data-bk-col="([^"]*)"/g)].map(m=>m[1]);if(new Set(keys).size!==keys.length) bad.push(v.as+" "+i+" row "+j+": "+keys.join(","));}));
  chk("no row names a field twice (every view, every row)",!bad.length,bad.slice(0,3).join(" | "));
  const cardsRoles=views.find(v=>v.as==="cards"&&v.html.includes('data-bk-col="left"')&&!v.html.includes('data-bk-col="shelf"')).html;
  chk("…and a card whose fields: are item and left, with item as its label, has item once (the label) and left once",
    count(cardsRoles,/data-bk-col="item"/g)===5&&count(cardsRoles,/data-bk-col="left"/g)===5,count(cardsRoles,/data-bk-col="item"/g)+" "+count(cardsRoles,/data-bk-col="left"/g));}
/* tiles: the value, the label and the note are each a column, and the text is the value */
chk("a tile's columns: value, label and note, each with its field's name and its value as text",
  />Beds? planted</.test(V.page)===false&&/<li class="bk-dv-tile bk-tone-good" data-bk-row>[^]*?<span class="bk-dv-v" data-bk-col="count">140<\/span><span class="bk-dv-l" data-bk-col="what">Loaves baked<\/span><span class="bk-dv-n" data-bk-col="since">since Monday<\/span>/.test(V.page));
/* a table: head cells and cells carry the field's name, and a number is its own text */
const tab=views.find(v=>v.as==="table").html;
chk("a table's head and cells carry the field's name; a cell's text is the value (12, 2, 0, plenty)",
  /<th scope="col" data-bk-col="item">Item<\/th>/.test(tab)&&["12","2","0","plenty","7"].every(t=>tab.includes('<td data-bk-col="left">'+t+"</td>")),tab.slice(0,600));
chk("a table row's pill is a column too (a badge's text is the value), and the tone's word sits beside it, never in it",
  /<span class="bk-dv-b" data-bk-col="kind"><span class="bk-pill bk-tone-good">flour<\/span><\/span><span class="bk-sr">Good<\/span>/.test(tab));
chk("a table grouped by a field has a heading row for each group, with its count, and the fixture's limit: 4 keeps 4 rows",
  count(views[5].html,/class="bk-grouprow"/g)===3&&views[5].html.includes("2 rows")&&count(views[5].html,/<tr data-bk-row>/g)===4);
/* a list: a row's label, value, badge, note; a nested list's summary is the row; the children are inside it */
const nested=views.find(v=>v.as==="list"&&/bk-dv-tree/.test(v.html)).html;
chk("a nested list opens and closes with <details>, a branch's own row is its summary, and a leaf is a plain row",
  count(nested,/<details/g)===2&&count(nested,/<summary class="bk-dv-row" data-bk-row>/g)===2&&count(nested,/<li class="bk-dv-row" data-bk-row>/g)===4,count(nested,/<details/g)+" "+count(nested,/<summary/g));
chk("…and the nesting is the ids' own: Rolls and Rye are under Bake, which is under Open the shop",
  /Open the shop[^]*<details[^]*Bake[^]*Rolls[^]*Rye[^]*<\/details>[^]*Hang the sign[^]*Close up/.test(nested)&&nested.indexOf("Close up")>nested.lastIndexOf("</details>"));
/* a chart: bars from a negative value, the zero line, a table of the numbers in a closed fold, and no tag inside it */
const bars=views.find(v=>v.as==="bars").html;
chk("a chart is followed by the table of its numbers, in a fold that is closed, with the same numbers",
  /<details class="bk-ch-nums">\s*<summary>[^<]+<\/summary>[^]*?<table>[^]*?<\/table>/.test(bars)&&!/<details[^>]*\sopen/.test(bars)&&["40","25","-10","0"].every(n=>new RegExp("<t[dh][^>]*>"+n+"</t[dh]>").test(bars.slice(bars.indexOf("bk-ch-nums")))),bars.slice(-900));
chk("…a chart's numbers table carries no data-bk-* (it is an extra, not a row), and a bar's own row does",
  !/data-bk-/.test(bars.slice(bars.indexOf("bk-ch-nums")))&&count(bars,/ data-bk-row\b/g)===5);
const bar=d=>{const m=new RegExp('data-bk-col="day">'+d+'</span><svg[^]*?</svg>').exec(bars);return m?m[0]:"";};
const rectOf=h=>{const m=/<rect[^>]*x="([\d.]+)"[^>]*width="([\d.]+)"/.exec(h);return m?{x:+m[1],w:+m[2]}:null;};
const zeroAt=+/class="bk-ch-zero" x1="([\d.]+)"/.exec(bars)[1];
chk("a negative bar is drawn leftwards from the zero line (it ends at it), a positive one rightwards (it starts at it), and a zero or a word has no bar",
  rectOf(bar("Wed"))&&Math.abs(rectOf(bar("Wed")).x+rectOf(bar("Wed")).w-zeroAt)<0.02&&Math.abs(rectOf(bar("Mon")).x-zeroAt)<0.02&&!rectOf(bar("Thu"))&&!rectOf(bar("Fri")),bar("Wed"));
const line=views.filter(v=>v.as==="line"),two=line[0].html;
chk("a line chart is an <svg> with a role and a name, a polyline for each series, and a gap where a reading is missing",
  /<svg[^>]*role="img"[^>]*aria-label="[^"]+"/.test(two)&&count(two,/<polyline|<path[^>]*class="bk-ch-line/g)>=2&&/<details class="bk-ch-nums">/.test(two));
chk("…a line of one point is a dot and its table, not an empty drawing",/<circle/.test(line[1].html)&&/<details class="bk-ch-nums">/.test(line[1].html));
/* every number of a line is in its table (a null is a dash) */
chk("a line's numbers table holds every reading, a missing one as an empty cell, as the renderer's own",["220","230","210","240","18","21","19","22"].every(n=>new RegExp(">"+n+"<").test(two.slice(two.indexOf("bk-ch-nums"))))&&count(two.slice(two.indexOf("bk-ch-nums")),/<td class="bk-num"><\/td>/g)===2);
/* links, icons, hostile values */
chk("a web address leads its row (https, new tab, no opener); the & in it is written as &amp;",/<a href="https:\/\/example\.org\/yeast\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">Yeast<\/a>/.test(V.page));
const noLink=w=>!new RegExp("<a [^>]*>"+w+"</a>").test(V.page);
chk("a javascript: address, a heading that is not there and a module that is not compiled are plain words, never a link",
  !/href="javascript:/i.test(V.page)&&["Salt","Rye flour","&lt;script&gt;qzxhostile\\(\\)&lt;/script&gt;"].every(noLink)&&!/href="week-2/.test(V.page));
chk("a value that is a script's words is text: escaped, in no element of its own, with no handler anywhere",
  V.page.includes("&lt;script&gt;qzxhostile()&lt;/script&gt;")&&!/<script/i.test(V.page.replace(/<script type="application\/ld\+json">[^]*?<\/script>/g,"").replace(/<script src="(?:\.\.\/)+booklet\/booklet\.js" defer><\/script>/g,""))&&!/\son[a-z]+=/i.test(V.page));
chk("an icon the sprite has is drawn (a picture before the tile); a name it has not draws nothing, and no word of it reaches the page",
  /<span class="bk-dv-i" aria-hidden="true"><svg class="bk-ic"/.test(views[0].html)&&count(views[0].html,/class="bk-dv-i"/g)===1&&!V.page.includes("not-an-icon-name"));
chk("the empty: line is drawn, and a query with none says it plainly",V.page.includes('<p class="bk-hint">No orders yet.</p>')&&V.page.includes('<p class="bk-hint">Nothing to show here.</p>'));
chk("nothing is read at run time: no script, no form, no stored or sent word anywhere in the page",
  !/<(form|input|button|select|textarea)\b/.test(V.page)&&!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon/.test(V.page));
/* no row of any view is marked, and nothing was left to tidy but the module link and the kept queries */
chk("the report counts the queries drawn and says nothing is marked for a view (only the link and the kept queries)",
  /27 queries/.test(V.report)&&V.r.rep.marked.every(m=>m.kind==="link"||m.kind==="kept"),V.r.rep.marked.map(m=>m.kind).join(","));

/* a line chart of five series: five lines, five legend swatches, each in its own class, and every marker kind */
{const five=views.find(v=>v.as==="line"&&v.html.includes("Tarts")).html;
  chk("a line chart of five series draws five lines, five legend entries and every marker shape",
    count(five,/<polyline/g)===5&&count(five,/class="bk-ch-sw"/g)===5&&[0,1,2,3,4].every(i=>five.includes('bk-ch-line bk-s'+i))&&/<circle/.test(five)&&/<rect class="bk-ch-pt/.test(five)&&count(five,/<path class="bk-ch-pt/g)>=4,
    count(five,/<polyline/g)+" lines, "+count(five,/class="bk-ch-sw"/g)+" swatches");
  chk("…and its numbers table has a column for each of them",count(five.slice(five.indexOf("bk-ch-nums")),/<th scope="col"/g)===6);}
/* a number no picture can use is left out of the picture and stays in the table */
{const tiny=views.find(v=>v.as==="bars"&&v.html.includes("1e-300")),huge=views.find(v=>v.as==="line"&&v.html.includes("1e+300"));
  chk("no NaN or Infinity is written anywhere on the page (bars of 1e-300, a line of 1e300)",!/NaN|Infinity/.test(V.page.replace(/<!--[^]*?-->/g,"")));
  chk("…bars of 1e-300 have their rows and their numbers, and draw no bar; a line of 1e300 draws no picture, only its numbers",
    tiny&&count(tiny.html,/ data-bk-row\b/g)===2&&!/<rect/.test(tiny.html)&&tiny.html.includes("2e-300")&&huge&&!/<svg class="bk-ch-svg"/.test(huge.html)&&huge.html.includes("-1e+300")&&/<details class="bk-ch-nums">/.test(huge.html));}
/* a field named like something an object has is a field, and a row that lacks it has an empty cell */
chk("a field named constructor or toString is an empty cell where the row lacks it, never an object's text",
  !/function Object|\[object|native code/.test(V.page)&&/<td data-bk-col="constructor"><\/td>/.test(V.page)&&/<td data-bk-col="toString"><\/td>/.test(V.page));
/* a double quote in a field's name or an address is written as &quot;, so it cannot end the attribute */
chk("a double quote in a field's name or in an address is &quot; in the attribute (it cannot close it and add one of its own)",
  V.page.includes('data-bk-col="a&quot;b"')&&V.page.includes('href="https://example.org/&quot;x=&quot;y"')&&!/="a"b"/.test(V.page)&&!/org\/"x=/.test(V.page),
  (/org\/[^ ]*/.exec(V.page)||[""])[0]);

/* ======================= 2. kept entries ======================= */
const keptMarks=V.r.rep.marked.filter(m=>m.kind==="kept");
chk("each of the five queries over kept entries or answers is marked kept, in the page and in the report",
  keptMarks.length===5&&count(V.page,/<!-- booklet: the query over “bakery\/orders”/g)===5&&count(V.report,/a query over kept entries or answers: drawn empty/g)===5,keptMarks.length);
/* (the "After" module is a page of its own, now that a booklet of several activities is a page for each) */
const afterAt=V.page.indexOf('<h1 id="after"'),after=V.page.slice(afterAt,V.page.indexOf("</article>",afterAt));
chk("…and each mark and report line says which query it is (its view, or a summary, and its place on the page), so the list can be told apart",
  new Set(keptMarks.map(m=>m.what)).size===5&&keptMarks.every(m=>/\(query \d+ on the page\)$/.test(m.what))&&keptMarks.some(m=>/a summary/.test(m.what))&&keptMarks.some(m=>/as cards/.test(m.what)),keptMarks.map(m=>m.what).join(" | "));
chk("…and they draw no view, no row and no number: only the empty: lines the author wrote (two of five)",
  !/data-bk-|<table|<ul/.test(after)&&count(after,/<p class="bk-hint(?: bk-lede)?">/g)===2&&after.includes("Orders are kept in the app.")&&after.includes("Summaries are not drawn here."));
/* the same, for a summary with no empty: line, as a page of its own */
const sumText='---\nbooklet: "0.16"\nid: t/sum\ntitle: Summary\nlang: en\n---\n\n# Summary\n\n> [!activity|log repeat] Log\n\n> [!number|n] How many?\n\n> [!activity|look] Look\n\n```booklet query\nfrom: log\nsummary: on\n```\n\n```booklet query\nfrom: log\nsummary: on\nas: bars\n```\n\n%%\n> [!records] App record — do not edit below this line\n\n> [!records|t] Summary\n\n```booklet entries log\n{"items": [{"ts": "2026-10-01T08:00:00Z", "n": 777001}, {"ts": "2026-10-02T08:00:00Z", "n": 777002}]}\n```\n%%\n';
const S=C.compile([{text:sumText,name:"sum",dir:TMP}],{form:"standalone",engine:X}),sp=S.results[0].rep.pages.map(p=>S.results[0].files.get(p)||"").join("\n");
chk("a summary: on query over kept entries never has rows: nothing at all is drawn where it stood (with its mark)",
  S.results[0].rep.ok&&!/data-bk-(view|row|col)/.test(sp)&&count(sp,/<!-- booklet: the query over/g)===2&&!/777001|777002/.test(sp+C.reportText(S)),sp.slice(sp.indexOf("<h2")));
/* the records marker test: every marker and every number in the records region is in no file written, the report, or what is printed */
{const src=path.join(FIX,"compile-views.booklet.md"),text=fs.readFileSync(src,"utf8");
  const markers=[...new Set(text.match(/qzxrec[a-z]+/g))],numbers=["31415","27182"];
  chk("the fixture keeps its markers in the records region only, and has queries over what it keeps",markers.length>=6&&text.indexOf("qzxrec")>text.indexOf("> [!records|")&&numbers.every(n=>text.indexOf(n)>text.indexOf("> [!records|")),markers.length);
  const out=path.join(TMP,"views-out"),rp=path.join(TMP,"views-report.txt");
  const r=cli(["--form","both","--out",out,"--report",rp,src]);
  const files=tree(out),found=[];
  for(const f of files){const t=fs.readFileSync(path.join(out,f)).toString("latin1");if(/qzxrec/i.test(t)||numbers.some(n=>t.includes(n)&&!/\.(woff2?|css)$/.test(f))) found.push(f);}
  const rt=fs.readFileSync(rp,"utf8");if(/qzxrec/i.test(rt)||numbers.some(n=>rt.includes(n))) found.push("the report file");
  if(/qzxrec/i.test(r.stdout+r.stderr)||numbers.some(n=>(r.stdout+r.stderr).includes(n))) found.push("what the command printed");
  chk("no marker, and none of the records' numbers, in any file written ("+files.length+" files), the report or what was printed",r.status===0&&!found.length,found.join(", ")||r.stderr);
  chk("…nor in the design the compiler is handed",!/qzxrec/i.test(JSON.stringify(X.parse(text))));
  chk("the source file is unchanged",fs.readFileSync(src,"utf8")===text);}

/* ======================= 3. the theme ======================= */
const T=compileOne(path.join(FIX,"compile-theme.booklet.md")),Ts=compileOne(path.join(FIX,"compile-theme.booklet.md"),"site");
const art=/<article class="booklet"[^>]*>/.exec(T.page)||[""],body=/<body[^>]*>/.exec(T.page)||[""];
const styleOf=t=>(/ style="([^"]*)"/.exec(t)||[])[1]||"";
const vars=Object.fromEntries(styleOf(art[0]).split(";").filter(Boolean).map(d=>d.split(/:(.*)/s).slice(0,2)));
chk("a theme maps onto the article: its base, and its colours as --bk-* variables",/data-bk-base="daylight"/.test(art[0])&&vars["--bk-paper"]==="#fffbe8"&&vars["--bk-ink"]==="#2a2118"&&vars["--bk-green-ink"]==="#007a3d",art[0]);
chk("…a standalone page's body has the same, so the paper under the article is the booklet's too; a site page has only the article",
  styleOf(body[0])===styleOf(art[0])&&/data-bk-base="daylight"/.test(body[0])&&!/<body/.test(Ts.page)&&/<article class="booklet"[^>]*style="/.test(Ts.page));
/* a colour held below the contrast is not used, and the build report says so */
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4));return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
chk("a failing colour (accent #f0e8c8 on #fffbe8) is not on the page, and no colour on it reads at under 4.5 to 1 against its paper",
  !T.page.includes("#f0e8c8")&&ratio(vars["--bk-accent"],vars["--bk-paper"])>=4.5&&ratio(vars["--bk-ink"],vars["--bk-paper"])>=4.5,vars["--bk-accent"]);
chk("…and the build report says which colour was left out, at what ratio, against what, and which stands",
  /the theme's accent was not used: accent on paper would read at 1\.18 to 1, under the 4\.5 to 1 the format asks for, so the base theme's colour stands/.test(T.report)&&/Theme: base daylight; colours paper, ink, good; style briefing\./.test(T.report));
/* a hostile value cannot get further than the renderer's own reading of it */
const css=fs.readFileSync(path.join(ROOT,"compile","booklet.css"),"utf8");
const hostile=["display:none","background:url","example.org","red;","ff0000","--bk-ink:#ff0000"];
const outT=path.join(TMP,"theme-out"),rT=cli(["--form","both","--out",outT,path.join(FIX,"compile-theme.booklet.md")]);
const wrote=tree(outT).filter(f=>/\.html$/.test(f)).map(f=>fs.readFileSync(path.join(outT,f),"utf8")).join("\n")+rT.stdout+rT.stderr;
chk("a colour that is not #rrggbb and a font or density that is not a listed word write nothing: not in any page, the report or the output",
  rT.status===0&&!hostile.some(h=>wrote.includes(h)),hostile.filter(h=>wrote.includes(h)).join(", "));
const outG=path.join(TMP,"plain-out");cli(["--form","both","--out",outG,path.join(FIX,"data-views.booklet.md")]);
chk("…and the stylesheet written is byte for byte the same for a themed booklet as for one with no theme (a theme writes no CSS)",
  fs.readFileSync(path.join(outT,"standalone","booklet","booklet.css"),"utf8")===fs.readFileSync(path.join(outG,"standalone","booklet","booklet.css"),"utf8"));
chk("…and the renderer's own words about each are in the report (accent as bad, font, density), without the value",
  /the theme's `bad` is not an allowed value/.test(T.report)&&/the theme's `font` is not an allowed value/.test(T.report)&&/the theme's `density` is not an allowed value/.test(T.report));
/* what the attribute may hold: a variable the stylesheet reads, set to a colour, a length, a number or a var() of its own */
const OKVALUE=/^(#[0-9a-f]{6}|[0-9.]+(rem|px)?|var\(--bk-[a-z-]+\))$/;
for(const [what,t] of [["the article's",art[0]],["the body's",body[0]]]){
  const decl=styleOf(t).split(";").filter(Boolean).map(d=>d.split(/:(.*)/s).slice(0,2));
  chk(what+" style attribute is only --bk-* variables with a colour, a length, a number or a var() as the value ("+decl.length+")",
    decl.length>10&&decl.every(([k,v])=>/^--bk-[a-z-]+$/.test(k)&&OKVALUE.test(v)),decl.filter(([k,v])=>!(/^--bk-[a-z-]+$/.test(k)&&OKVALUE.test(v))).join(" | "));
  chk(what+" every variable named is one the stylesheet reads",decl.every(([k])=>css.includes("var("+k+")")||css.includes(k+":")),decl.filter(([k])=>!css.includes(k)).map(d=>d[0]).join(", "));}
chk("a theme brings no <style>, <link>, url(), @import, expression or handler of its own: the page's only link is the stylesheet",
  count(T.page,/<style\b/g)===0&&count(T.page,/<link\b/g)===1&&!/url\(|@import|expression\(|\son[a-z]+=/i.test(T.page));
/* the tables held to the renderer's own */
const rhtml=fs.readFileSync(path.join(ROOT,"booklet.html"),"utf8");
const head=rhtml.slice(rhtml.indexOf("var FONTS={serif:"),rhtml.indexOf("var STYLES={"));
const rDensity=new Function("return "+/var DENSITY=(\{[^;]*\});/.exec(head)[1])();
const OWN={"--lh":"--bk-line","--pgap":"--bk-pgap","--v-fs":"--bk-v-fs","--v-pad":"--bk-v-pad","--v-gap":"--bk-gap","--tile-v":"--bk-tile-v"};
chk("the density table is the renderer's own, name for name and value for value (compact and roomy)",
  JSON.stringify(Object.keys(rDensity).sort())===JSON.stringify(Object.keys(Th.DENSITY).sort())&&Object.entries(rDensity).every(([n,t])=>Object.entries(t).every(([k,v])=>Th.DENSITY[n][OWN[k]]===v)&&Object.keys(Th.DENSITY[n]).length===Object.keys(t).length),JSON.stringify(Th.DENSITY));
const rFonts=new Function("return "+/var FONTS=(\{[^;]*\});/.exec(head)[1])();
chk("the font words are the renderer's (serif, sans, mono, readable), each setting text and headings together",
  JSON.stringify(Object.keys(rFonts).sort())===JSON.stringify(Object.keys(Th.FONTS).sort())&&Object.entries(rFonts).every(([n,t])=>t["--serif"]===t["--sans"]&&
    Th.FONTS[n]==="var(--bk-"+(n==="mono"?"font-code":"fam-"+(n==="readable"?"read":n))+")"));
/* the renderer's own colours: a token the renderer works out for a colour is the page's, and nothing else is mapped */
const sample=X.themeOf({base:"daylight",paper:"#fffbe8",ink:"#2a2118"});
const mapped=Object.keys(sample.tokens).filter(k=>k in Th.VAR_OF);
chk("every colour the renderer works out from the theme that the page has a variable for is set on the article ("+mapped.length+")",
  mapped.every(k=>vars[Th.VAR_OF[k]]!==undefined)&&mapped.length>20);
/* the two words the fixture above gives bad values for, given good ones (made-up booklets): each font and each density the renderer has is
   a declaration on the article, and the build report names it */
{const themed=(font,density)=>{const text='---\nbooklet: "0.16"\nid: t/words\ntitle: Theme words\nlang: en\n---\n\n# Theme words\n\n```booklet theme\nbase: paper\n'
      +(font?"font: "+font+"\n":"")+(density?"density: "+density+"\n":"")+'```\n\n> [!activity|only] The only activity\n\nA paragraph.\n';
    const run=C.compile([{text,name:"words",dir:TMP}],{form:"standalone",engine:X}),page=run.results[0].files.get("words/index.html")||"";
    return {run,page,style:styleOf((/<article class="booklet"[^>]*>/.exec(page)||[""])[0]),report:C.reportText(run)};};
  const decls=st=>Object.fromEntries(st.split(";").filter(Boolean).map(d=>d.split(/:(.*)/s).slice(0,2)));
  const badF=[];
  for(const [name,face] of Object.entries(Th.FONTS)){const t=themed(name,null),d=decls(t.style);
    if(!(t.run.results[0].rep.ok&&d["--bk-font-text"]===face&&d["--bk-font-head"]===face&&new RegExp("Theme: base paper; font "+name+"\\.").test(t.report))) badF.push(name+" → "+t.style+" | "+(t.report.match(/Theme:[^\n]*/)||[""])[0]);}
  chk("each font word ("+Object.keys(Th.FONTS).join(", ")+") sets the text and heading faces on the article, and the report says font <word>",Object.keys(Th.FONTS).length===4&&!badF.length,badF.join(" ; "));
  const badD=[];
  for(const [name,vals] of Object.entries(Th.DENSITY)){const t=themed(null,name),d=decls(t.style);
    if(!(t.run.results[0].rep.ok&&Object.entries(vals).every(([k,v])=>d[k]===v)&&new RegExp("Theme: base paper; density "+name+"\\.").test(t.report))) badD.push(name+" → "+t.style+" | "+(t.report.match(/Theme:[^\n]*/)||[""])[0]);}
  chk("each density word ("+Object.keys(Th.DENSITY).join(", ")+") sets its sizes on the article, and the report says density <word>",Object.keys(Th.DENSITY).length===2&&!badD.length,badD.join(" ; "));
  const both=themed("readable","compact");
  chk("a font and a density together are both on the article and both in the report's one Theme line",decls(both.style)["--bk-font-text"]===Th.FONTS.readable&&decls(both.style)["--bk-pgap"]===Th.DENSITY.compact["--bk-pgap"]&&/Theme: base paper; font readable; density compact\./.test(both.report),both.style+" | "+(both.report.match(/Theme:[^\n]*/)||[""])[0]);
  const none=themed("sepia","tight");
  chk("a font and a density the renderer does not have are neither on the page nor named as used in the report",!/--bk-font-text|--bk-pgap/.test(none.style)&&!/font sepia|density tight/.test(none.report),none.style);}
/* theme.js checks again what it is handed: the renderer's reading is the first line of defence and this is the second. A
   hostile result of it (a value that is not #rrggbb, a name that is not a colour token, a face, density or style that is not in
   a table, a base that is not one of the four) writes nothing of itself. */
{const hostileDerived={colours:true,base:'night"><script>x</script>',tokens:{"--ink":"red;background:url(//x)","--paper":"#ffffff","--bogus":"#123456","--accent":"#FFF","--muted":"#12345678","--rule":"#abcdefg"},
    font:"serif;background:url(x)",density:'roomy"; --bk-ink:#ff0000',style:"briefing;--bk-ink:red",
    dropped:[{key:"accent",pair:"ink; on}paper",ratio:1.5},{key:"not-a-colour",pair:"x",ratio:1}]};
  const out=Th.theme({paper:"#ffffff"},hostileDerived),st=out.attrs&&out.attrs.style||"";
  chk("theme.js writes only #rrggbb values on named colour tokens, from a hostile result of the renderer's reading",
    out.attrs&&st==="--bk-paper:#ffffff",st);
  chk("…takes a base that is not one of the four as Paper, and a face, density and style that are not in a table as nothing",
    out.attrs["data-bk-base"]==="paper"&&!/font|--bk-line|radius/.test(st)&&out.report.font===""&&out.report.density===""&&out.report.style==="",JSON.stringify(out.attrs));
  chk("…and a dropped colour's words in the report are letters, spaces and a hyphen only, and only for a colour theme.js knows",
    out.report.dropped.length===1&&out.report.dropped[0].pair==="ink onpaper"&&!/[}<>"]/.test(Th.words(out.report).join("")),JSON.stringify(out.report.dropped));}

/* a page with no theme block has no theme attribute at all */
const G=compileOne(path.join(FIX,"data-views.booklet.md"));
chk("a booklet with no theme block has no data-bk-base, no style attribute, no Theme line in its report",
  !/<article class="booklet"[^>]*(data-bk-base| style=)/.test(G.page)&&!/<body[^>]*(data-bk-base| style=)/.test(G.page)&&!/Theme:/.test(G.report));

/* ======================= a table is linear in its rows ======================= */
{const n=10000,rows=[];for(let i=0;i<n;i++) rows.push({a:"Row "+i,b:i,c:i*2.5,d:"x"+(i%7),e:i%3?i:null,f:"f"+i,g:i%11});
  const text='---\nbooklet: "0.16"\nid: t/big\ntitle: Big\nlang: en\n---\n\n# Big\n\n```booklet query\nfrom: d\nas: table\n```\n\n```booklet data\n'+JSON.stringify({rows})+'\n```\n^d\n';
  const t0=Date.now(),B=C.compile([{text,name:"big",dir:TMP}],{form:"standalone",engine:X}),ms=Date.now()-t0,p=B.results[0].files.get("big/index.html")||"";
  chk("a table of 10,000 rows by 7 columns is drawn in well under the time a rescan for every cell takes ("+ms+" ms; the limit is 9 s)",B.results[0].rep.ok&&count(p,/ data-bk-row\b/g)===n&&ms<9000,ms+" ms");}

/* ======================= 4. a very deep list ======================= */
{const rows=[];for(let i=0;i<3000;i++) rows.push({id:"r"+i,parent:i?"r"+(i-1):"",label:"Row "+i});
  const text='---\nbooklet: "0.16"\nid: t/deep\ntitle: Deep\nlang: en\n---\n\n# Deep\n\n```booklet query\nfrom: d\nas: list\n```\n\n```booklet data\n'+JSON.stringify({rows})+'\n```\n^d\n';
  const D=C.compile([{text,name:"deep",dir:TMP}],{form:"both",engine:X}),p=D.results[0].files.get("standalone/deep/index.html")||D.results[0].files.get("deep/index.html")||"";
  chk("a list 3000 levels deep is drawn, every row of it, and is not refused",D.results[0].rep.ok&&count(p,/ data-bk-row\b/g)===3000&&p.includes("Row 2999"),D.results[0].rep.refused);
  chk("…as at most 40 levels of folds, the rest drawn level",count(p,/<details/g)===40,count(p,/<details/g));}

/* ======================= 5. on a deep page (a booklet of several activities is a page for each) ======================= */
/* A themed booklet of two activities, each with a view over its own data, a chart and a query over kept entries: every page
   carries the look, the stylesheet link reaches the stylesheet from its own depth, no id is written twice on a page, and the
   marks and report lines of the kept queries are told apart from one page to the next. */
{const act=(id,t)=>"> [!activity|"+id+"] "+t+"\n\n```booklet query\nfrom: d"+id+"\nas: tiles\nvalue: n\nlabel: w\n```\n\n```booklet query\nfrom: d"+id+"\nas: bars\nvalue: n\nlabel: w\n```\n\n"
    +"```booklet data\n{ \"rows\": [ { \"w\": \"A"+id+"\", \"n\": 3 }, { \"w\": \"B"+id+"\", \"n\": 5 } ] }\n```\n^d"+id+"\n\n```booklet query\nfrom: orders\nas: table\n```\n\n";
  const text='---\nbooklet: "0.16"\nid: t/deep\ntitle: Deep\nlang: en\n---\n\n# Deep\n\n```booklet theme\nbase: daylight\npaper: "#fffbe8"\nink: "#2a2118"\n```\n\n> [!module|bakery] Bakery\n\n> [!activity|orders repeat] Orders\n\n> [!text|loaf] Which loaf?\n\n'+act("one","One")+act("two","Two")+"> [!module|bakery end] End\n";
  for(const form of ["standalone","site"]){
    const R=C.compile([{text,name:"deep",dir:TMP}],{form,engine:X}).results[0],pages=R.rep.pages.filter(p=>p.endsWith("index.html")),html=pages.map(p=>R.files.get(p));
    const deepAt=pages.map((p,i)=>i).filter(i=>/\/(one|two)\//.test(pages[i]));
    chk("("+form+") a booklet of two activities is a contents page and a page for each (4, with the log)",R.rep.ok&&pages.length===4&&deepAt.length===2,pages.join(" ")+" "+JSON.stringify(R.rep.refused)+JSON.stringify(R.rep.problems).slice(0,300));
    chk("("+form+") every page, a deep one too, takes the booklet's colours on its article",html.every(h=>/<article class="booklet"[^>]*data-bk-base="daylight"[^>]*style="[^"]*--bk-paper:#fffbe8/.test(h)));
    if(form==="standalone") chk("(standalone) …and on its body; its stylesheet link reaches the stylesheet from its own depth",
      html.every(h=>/<body class="bk-page" data-bk-base="daylight"/.test(h))&&deepAt.every(i=>html[i].includes('href="../../booklet/booklet.css"')),deepAt.map(i=>(/<link rel="stylesheet"[^>]*>/.exec(html[i])||[""])[0]).join(" "));
    chk("("+form+") each deep page draws its own views: a tiles view, a bars chart with the table of its numbers",deepAt.every(i=>count(html[i],/data-bk-view="tiles"/g)===1&&count(html[i],/data-bk-view="bars"/g)===1&&count(html[i],/class="bk-ch-nums"/g)===1));
    chk("("+form+") no id is written twice on a page",html.every(h=>{const ids=[...h.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);return new Set(ids).size===ids.length;}));
    const kept=R.rep.marked.filter(m=>m.kind==="kept"),marks=kept.map(m=>m.what+" "+m.where);
    const lines=C.reportText({results:[R],problems:[]}).split("\n").filter(l=>/a query over kept entries/.test(l));
    chk("("+form+") the kept queries of the two pages are told apart: each mark and report line names its page's activity as well as its place on it",
      kept.length===2&&new Set(marks).size===2&&marks.every(w=>/activity “(One|Two)”/.test(w))&&lines.length===2&&new Set(lines).size===2,JSON.stringify(marks)+JSON.stringify(lines));}}

fs.rmSync(TMP,{recursive:true,force:true});
console.log(fails?"\n"+fails+" FAILURES":"\ncompile views and theme passed");process.exit(fails?1:0);
