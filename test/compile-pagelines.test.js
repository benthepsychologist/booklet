// Page lines in the compiler (compile/, compile 0.2.0): it does not draw pages yet, and says so once, plainly, for the booklet.
//   1. The report has ONE line about pages for a booklet with page lines: how many read as running text, that titles are not drawn,
//      and how many links by a page's title were drawn as their words.
//   2. A link by a page's title is not reported as "a heading that is not on this page": it is not in the tidy-up list, and its
//      comment on the page says it names a page.
//   3. A link to a real heading is still a link, and a heading that is nowhere is still reported as before.
//   4. A booklet with no page line has no such line.
// Run: node test/compile-pagelines.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const C=require("../compile/compile.js"),E=require("../compile/engine.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const X=E.load(),FIX=path.join(__dirname,"fixtures");
const run=(text,name)=>C.compile([{name:name||"t",text}],{form:"standalone",engine:X});
const reportOf=r=>C.reportText({results:r.results,form:"standalone",renderer:"",format:""});
const fixture=fs.readFileSync(path.join(FIX,"compile-page-lines.booklet.md"),"utf8");

{const r=run(fixture,"harbour"),rep=r.results[0].rep,text=reportOf(r);
 const lines=text.split("\n").filter(l=>/page lines? (is|are|reads?) /.test(l)||/Pages: /.test(l));
 chk("the booklet compiles",rep.ok);
 chk("the report has ONE line about pages",lines.length===1,JSON.stringify(lines));
 chk("…it says page lines are not drawn as pages yet, how many read as running text, and that titles are not drawn",
   lines[0]==="  Pages: page lines are not drawn as pages yet: 3 page lines read as running text; titles are not drawn; 1 link to a page's title is drawn as its words.",lines[0]);
 chk("a link by a page's title is not in the tidy-up list, and is not reported as a heading that is nowhere",rep.marked.length===0&&!/not on this page/.test(text)&&/To tidy: nothing was left off/.test(text),text);
 const page=[...r.results[0].files].filter(([k])=>k.endsWith(".html")).map(([,v])=>String(v)).join("\n");
 chk("its comment on the page says it names a page, and the words are kept",/<!-- booklet: the link to “Spring tides”[^>]*it names a page, and pages are not drawn as pages yet: drawn as its words -->Spring tides/.test(page));
 chk("a link to a heading that is on the page is still a link (one in-page link counted)",rep.counts.links===1&&/<a [^>]*href="[^"]*"[^>]*>Harbour notes<\/a>/.test(page),String(rep.counts.links));
 chk("the page words are drawn, the page titles are not drawn as headings",/How the water moves/.test(page)&&/The moon pulls/.test(page)&&!/<h[1-6][^>]*>\s*Moons/.test(page));}
{const r=run(fixture.replace("[[#Spring tides]]","[[#Nowhere at all]]"),"harbour"),rep=r.results[0].rep,text=reportOf(r);
 chk("with no link by a page's title, the line says nothing of links",/  Pages: page lines are not drawn as pages yet: 3 page lines read as running text; titles are not drawn\.\n/.test(text),text);}
{const r=run('---\nbooklet: "0.17"\ntitle: Plain\nlang: en\n---\n\n> [!activity|a] A\n\nJust words.\n',"plain"),text=reportOf(r);
 chk("a booklet with no page line has no such line",!/Pages: /.test(text)&&!/page lines? /.test(text),text);}
{const r=run('---\nbooklet: "0.17"\ntitle: One\nlang: en\n---\n\n> [!activity|a] A\n\n> [!page|only] Only\n\nwords\n',"one"),text=reportOf(r);
 chk("one page line is said in the singular",/Pages: page lines are not drawn as pages yet: 1 page line reads as running text; titles are not drawn\.\n/.test(text),text);}
console.log(fails?"\n"+fails+" FAILURES":"\ncompile page lines passed");process.exit(fails?1:0);
