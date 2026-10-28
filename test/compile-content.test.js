// What the compiler (compile/, compile 0.1.0) keeps, what it never publishes, and how it behaves as a command.
//   1. Nothing lost. For each example and each page-shaped fixture, every word of every prose block, as the renderer's own
//      Markdown engine reads it with its plain options (PLAIN_OPTS: a link is its words, an image its alt text, a mark
//      nothing; a formula is left out here, since it is drawn as MathML), and every word of every heading, title, question,
//      option, anchor, widget place and notice, appears in the compiled page's text (a site page's title is its front
//      matter's). The exceptions are the marked parts, which are not drawn; a title drawn once; the title of a module's one
//      activity, for which the module's title stands, as in the renderer; and a link to another booklet, which is drawn
//      with that booklet's title when it is compiled with it (checked below) and is marked when it is not.
//   2. Records are never published. test/fixtures/compile-records.booklet.md keeps unique marker words in its records region;
//      it is compiled in both forms with a report, and no marker may appear in any file written, the report, what the
//      command prints, or the design the compiler is handed.
//   3. Images and SVG. An image is copied only from a relative path by the renderer's rule, from inside the booklet's folder,
//      no larger than the renderer's limit and of the type its name says; an SVG that could run or fetch anything is
//      refused. Each refused one is shown as its words and address, with a comment and a line in the report.
//   4. The two forms. The site form has front matter as quoted strings and no template opening ({{, {%, {#) anywhere; the
//      standalone head carries a JSON-LD block no title can break out of. Every in-page link has its target.
//   5. The command. The stamp guard keeps a hand-tidied page; a refused file writes nothing; the source is never written;
//      a mistake in the command exits 2.
// Run: node test/compile-content.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path"),os=require("os"),crypto=require("crypto"),cp=require("child_process");
const ROOT=path.join(__dirname,".."),FIX=path.join(__dirname,"fixtures"),CLI=path.join(ROOT,"compile","compile.js");
const C=require("../compile/compile.js"),D=require("../compile/draw.js"),E=require("../compile/engine.js"),H=require("../compile/html.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const X=E.load(),R=X.R,M=X.M;
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"booklet-compile-"));
const cli=(args,cwd)=>cp.spawnSync(process.execPath,[CLI,...args],{cwd:cwd||TMP,encoding:"utf8"});
const tree=d=>!fs.existsSync(d)?[]:fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tree(path.join(d,e.name)).map(x=>e.name+"/"+x):[e.name]);
const sha=f=>crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const HEAD='---\nbooklet: "0.15"\nid: t/x\ntitle: TITLE\nlang: en\n---\n\n';
const booklet=(title,body)=>HEAD.replace("TITLE",title)+body;

/* ======================= 1. nothing lost ======================= */
/* words, with every element boundary a break (so both sides split the same way) */
const flat=x=>{const out=[];const go=v=>{if(v==null) return;if(Array.isArray(v)){v.forEach(go);return;}
  if(typeof v==="string"||typeof v==="number"){out.push(" "+v+" ");return;}
  if(v instanceof H.Comment||v instanceof H.Trusted) return;
  if(v&&v.kids){out.push(" ");go(v.kids);out.push(" ");}};go(x);return out.join("");};
const tokens=s=>String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
const PLAIN={...R.PLAIN_OPTS,math:()=>"",link:(t,lb)=>lb===undefined&&M.isModuleLink(t)?"":R.PLAIN_OPTS.link(t,lb)};
const mdWords=t=>tokens(flat(M.mdNodes(String(t==null?"":t),PLAIN)));
const inWords=t=>tokens(flat(M.renderInline(String(R.tx(t,"")),{opts:PLAIN,refs:Object.create(null)})));
/* the words a booklet's design gives its page */
function designWords(P){const d=P.design,w=[];
  const blocks=list=>{for(const b of R.blocksAll(Array.isArray(list)?list:[])){
    if(b.type==="markdown") w.push(...mdWords(b.text));
    else if(b.type==="callout"){if(b.title) w.push(...inWords(b.title));}
    else if(b.type==="widget"){const Wd=R.widgetIn(d.widgets||[],b.widget,b.module);
      if(!Wd||!D.COVERAGE.engines[Wd.engine]||!/^drawn/.test(D.COVERAGE.engines[Wd.engine])) continue;
      const cp=R.wordsOf(Wd.copy),op=R.engOpts(b);
      w.push(...inWords(R.tx(b.label,cp.h)),...inWords(R.tx(b.help,cp.p)),...inWords(cp.stance),...inWords(cp.invite));
      if(Wd.engine==="grid-select"){Object.values(Wd.axes||{}).forEach(v=>w.push(...inWords(v)));
        (Wd.cells||[]).forEach(c=>{w.push(...inWords(R.tx(c.label,c.id)));if(op.describe) w.push(...inWords(c.note));});
        (Wd.items||[]).forEach(it=>w.push(...inWords(R.tx(it.label,it.id))));}
      if(Wd.engine==="svg-regions"){const figs=Wd.figures||[],lab=id=>{const r=(Wd.regions||[]).find(x=>x.id===id);return r?R.tx(r.label,id):id;};
        if(figs.length>1) figs.forEach(f=>w.push(...inWords(R.tx(f.label,f.id))));
        (figs.length?figs.flatMap(f=>f.regions||[]):(Wd.regions||[]).map(r=>r.id)).forEach(id=>w.push(...inWords(lab(id))));
        if(op.describe) (Wd.regions||[]).forEach(r=>w.push(...inWords(r.note)));}}
    else if(R.isQuestion(b)&&!b.each){w.push(...inWords(b.label),...inWords(b.help));
      (b.options||[]).forEach(o=>w.push(...inWords(typeof o==="string"?o:(o&&(o.text||o.label))||"")));
      (b.items||[]).forEach(o=>w.push(...inWords(typeof o==="string"?o:(o&&(o.text||o.label))||"")));
      (b.anchors||[]).forEach(a=>w.push(...inWords(a&&a.text)));}}};
  w.push(...inWords(d.title));blocks(d.opening);
  for(const m of d.modules||[]){w.push(...inWords(m.title));blocks(m.opening);
    const mts=R.isMulti(m)&&R.tabsIn(m);if(mts) mts.forEach(t=>{w.push(...inWords(t.title));blocks(t.blocks);});
    if(m.notice&&typeof m.notice==="object") R.NOTICE_KEYS.forEach(k=>{if(typeof m.notice[k]==="string") w.push(...tokens(m.notice[k]));});
    const one=!R.isMulti(m)&&R.nonEmpty(R.tx(m.title,""));
    for(const a of (m.activities||[]).filter(R.isShown)){if(!one) w.push(...inWords(a.title));
      const ts=R.tabsIn(a);if(ts) ts.forEach(t=>w.push(...inWords(t.title)));
      blocks(R.tabOpening(a));(a.pages||[]).forEach(p=>blocks(R.blocksIn(p)));}}
  return w;}
/* a page's own text: its article, comments, tags and the head left out, character references read */
const ENT={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "};
const pageText=html=>{let t=String(html);const fm=/^---\ntitle: (.*)\n/.exec(t),a=t.indexOf("<article"),z=t.lastIndexOf("</article>");
  if(a>=0&&z>a) t=(fm?H.escText(JSON.parse(fm[1]))+" ":"")+t.slice(a,z);
  return t.replace(/<!--[\s\S]*?-->/g," ").replace(/<[^>]*>/g," ").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e)=>e[0]==="#"?String.fromCodePoint(e[1]==="x"||e[1]==="X"?parseInt(e.slice(2),16):parseInt(e.slice(1),10)):(ENT[e]||m));};
const LOST_SET=[...fs.readdirSync(path.join(ROOT,"examples")).filter(f=>f.endsWith(".booklet.md")).map(f=>path.join(ROOT,"examples",f)),
  ...["compile-article","compile-kinds","figures","charts","data-views"].map(n=>path.join(FIX,n+".booklet.md"))];
{const run=C.compile(LOST_SET.map(file=>({file})),{form:"both",engine:X});
  run.results.forEach((r,i)=>{const P=X.parse(fs.readFileSync(LOST_SET[i],"utf8")),want=new Set(designWords(P));
    for(const form of ["standalone","site"]){const page=r.files.get(form+"/"+r.rep.name+"/index.html");
      const have=new Set(tokens(pageText(page))),lost=[...want].filter(x=>!have.has(x));
      chk("nothing lost: "+r.rep.source+" ("+form+", "+want.size+" words)",page&&want.size>20&&!lost.length,lost.slice(0,30).join(" "));}});}
/* the endnotes carry what a citation says */
{const run=C.compile([{file:path.join(FIX,"compile-article.booklet.md")},{file:path.join(FIX,"compile-kinds.booklet.md")}],{form:"standalone",engine:X}),p=run.results[0].files.get("compile-article/index.html");
  chk("a citation's source, page and quote reach the notes",/<section class="bk-notes"[^]*<cite>The Pocket Herbarium<\/cite>, 3rd edition \(2020\)\. Page 41\. <q class="bk-quote">Gather on a dry day\.<\/q>/.test(p));
  chk("the mark points to its note and the note back",/<sup class="bk-mark"><a class="bk-mark-a"[^>]*href="#bk-note-1"[^>]*id="bk-ref-1"|<sup class="bk-mark"><a class="bk-mark-a"[^>]*id="bk-ref-1"[^>]*href="#bk-note-1"/.test(p)&&/<a class="bk-back"[^>]*href="#bk-ref-1"/.test(p),
    (p.match(/<sup class="bk-mark">.*?<\/sup>/)||[""])[0]);
  chk("a link to a booklet compiled with it is a link to its page, by its title",p.includes('<a class="bk-link" href="../compile-kinds/">A kite workshop</a>'));
  chk("a formula is MathML, with no script",/<span class="bk-math"><math>[^]*?<mo>≥<\/mo>[^]*?<\/math><\/span>/.test(p)&&!/<script(?! type="application\/ld\+json")/.test(p));}

/* ======================= 2. records are never published ======================= */
{const src=path.join(FIX,"compile-records.booklet.md"),text=fs.readFileSync(src,"utf8");
  const markers=[...new Set(text.match(/qzxrec[a-z]+/g))];
  chk("the records fixture keeps its markers in the records region only",markers.length>=12&&text.indexOf("qzxrec")>text.indexOf("> [!records|"),markers.length);
  const out=path.join(TMP,"records"),rp=path.join(TMP,"records-report.txt");
  const r=cli(["--form","both","--out",out,"--report",rp,src]);
  chk("the records fixture compiles in both forms",r.status===0&&fs.existsSync(path.join(out,"standalone","compile-records","index.html"))&&fs.existsSync(path.join(out,"site","compile-records","index.html")),r.stderr||r.stdout);
  const files=tree(out),found=[];
  for(const f of files){const t=fs.readFileSync(path.join(out,f)).toString("latin1");if(/qzxrec/i.test(t)) found.push(f);}
  if(/qzxrec/i.test(fs.readFileSync(rp,"utf8"))) found.push("the report file");
  if(/qzxrec/i.test(r.stdout+r.stderr)) found.push("what the command printed");
  chk("no marker in any file written ("+files.length+" files), the report or what was printed",!found.length,found.join(", "));
  const P=X.parse(text);
  chk("…nor in the design or the problems the compiler is handed",!/qzxrec/i.test(JSON.stringify(P)),JSON.stringify(P).match(/.{40}qzxrec.{20}/i));
  const page=fs.readFileSync(path.join(out,"standalone","compile-records","index.html"),"utf8");
  chk("the design itself is drawn: its questions are on the page",page.includes("What did you sow?")&&page.includes("How much water?")&&page.includes("A pot"));
  chk("the report says the records were not read",/Records: never read\./.test(r.stdout));
  chk("the source file is unchanged",fs.readFileSync(src,"utf8")===text);}

/* ======================= 3. images and SVG ======================= */
{const book=path.join(TMP,"img","book");fs.mkdirSync(path.join(book,"shapes"),{recursive:true});fs.mkdirSync(path.join(book,".hidden"),{recursive:true});
  const PNG=Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0,0,0,13,0x49,0x48,0x44,0x52,0,0,0,1,0,0,0,1,8,6,0,0,0]);
  const put=(rel,data)=>fs.writeFileSync(path.join(book,rel),data);
  put("leaf.png",PNG);put("shapes/ok.svg",'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><circle id="c" r="4"/></defs><use href="#c" x="5" y="5" fill="url(#g)"/></svg>');
  put("script.svg",'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  put("onload.svg",'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect/></svg>');
  put("fake.png","not a png at all");put(".hidden/leaf.png",PNG);
  fs.writeFileSync(path.join(TMP,"img","outside.png"),PNG);fs.symlinkSync(path.join("..","outside.png"),path.join(book,"link.png"));
  put("big.png",Buffer.concat([PNG,Buffer.alloc(R.LINK_BYTES)]));
  const imgs=[["A leaf","leaf.png",true],["A shape","shapes/ok.svg",true],["A script","script.svg",false,"a script"],["An onload","onload.svg",false,"an event attribute"],
    ["A fake","fake.png",false,"not a .png file"],["A link out","link.png",false,"outside the booklet's folder"],["A big one","big.png",false,"larger than"],
    ["Not there","missing.png",false,"no such file"],["Remote","https://example.org/leaf.png",false,"not a relative path"],["Absolute","/etc/leaf.png",false,"not a relative path"],
    ["Hidden","./.hidden/leaf.png",false,"not a relative path"],["Up","../outside.png",false,"not a relative path"],["A script by name","script.js",false,"not a relative path"]];
  const src=path.join(book,"pictures.booklet.md");
  fs.writeFileSync(src,booklet("Pictures","# Pictures\n\nA made-up page of images.\n\n"+imgs.map(([alt,at])=>"!["+alt+"]("+at+")").join("\n\n")+"\n"));
  const out=path.join(TMP,"img","out"),r=cli(["--out",out,src]);
  chk("a booklet with images compiles",r.status===0,r.stderr||r.stdout);
  const page=fs.readFileSync(path.join(out,"pictures","index.html"),"utf8"),written=tree(path.join(out,"pictures"));
  for(const [alt,at,ok,why] of imgs){const esc=at.replace(/[.*+?^${}()|[\]\\/]/g,"\\$&");
    if(ok){chk("copied and drawn: "+at,new RegExp('<img src="'+esc+'" alt="'+alt+'">').test(page)&&written.includes(at)&&sha(path.join(out,"pictures",at))===sha(path.join(book,at)));continue;}
    chk("refused, shown as words and address: "+at,!new RegExp('src="[^"]*'+esc).test(page)&&page.includes('<span class="bk-imgalt">'+alt+"</span>")&&page.includes('<code class="bk-imgsrc">'+H.escText(at)+"</code>"),why);
    chk("…with a comment where it stood and a line in the report saying why ("+why+")",page.includes("<!-- booklet: the image “"+alt+"” at "+JSON.stringify(at))
      &&r.stdout.split("\n").some(l=>l.includes("[ ] the image "+JSON.stringify(at))&&l.includes(why)),r.stdout.split("\n").filter(l=>l.includes(alt)||l.includes(at)).join(" / "));}
  chk("nothing but the page and the two good images is written beside it",JSON.stringify(written.sort())===JSON.stringify(["index.html","leaf.png","shapes/ok.svg"]),written.join(", "));
  chk("the file a link pointed to, outside the folder, was never copied",!tree(out).some(f=>f.endsWith("outside.png")));}
/* the SVG check, case by case: each of these is refused, and a plain figure passes */
{const bad=[["a script",'<svg><script>alert(1)</script></svg>'],["a script, in capitals",'<svg><SCRIPT>alert(1)</SCRIPT></svg>'],
  ["an event attribute",'<svg><rect onclick="x()"/></svg>'],["an event attribute, after a slash",'<svg><rect/onload="x()"/></svg>'],
  ["<foreignObject>",'<svg><foreignObject><p>x</p></foreignObject></svg>'],["an iframe",'<svg><iframe src="#"/></svg>'],
  ["an outside image",'<svg><image href="https://example.org/x.png"/></svg>'],["an outside use",'<svg><use xlink:href="other.svg#a"/></svg>'],
  ["a javascript: link behind character references",'<svg><a href="&#106;&#x61;vascript:alert(1)"><text>x</text></a></svg>'],
  ["a javascript: link split by spaces",'<svg><a href="java\tscript:alert(1)"><text>x</text></a></svg>'],
  ["an unquoted address",'<svg><a href=https://example.org><text>x</text></a></svg>'],
  ["a data: address in a style",'<svg><rect style="fill:url(data:image/png;base64,AAAA)"/></svg>'],["an outside url()",'<svg><rect style="fill:url(https://example.org/p.svg#g)"/></svg>'],
  ["an outside stylesheet",'<?xml version="1.0"?><?xml-stylesheet href="x.css"?><svg/>'],["an @import",'<svg><style>@import "x.css";</style></svg>'],
  ["a DOCTYPE with entities",'<!DOCTYPE svg [<!ENTITY x "y">]><svg>&x;</svg>'],["an entity other than the five",'<svg><text>&nbsp;</text></svg>'],
  ["an animation that changes a link",'<svg><a><set attributeName="href" to="https://example.org"/><text>x</text></a></svg>'],
  ["an animated xlink:href",'<svg><a><animate attributeName="xlink:href" values="https://example.org"/></a></svg>'],
  ["a base element",'<svg><base href="https://example.org/"/></svg>'],["a meta refresh",'<svg><meta http-equiv="refresh"/></svg>']];
  for(const [what,s] of bad){const why=C.svgProblem(Buffer.from(s));chk("an SVG with "+what+" is refused",typeof why==="string"&&why.length>0,s);}
  for(const s of ['<svg viewBox="0 0 10 10"><path d="M0 0L10 10" stroke="#333"/></svg>','<svg><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/><use href="#g"/></svg>',
    '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg"><text>Tom &amp; Jo&#39;s</text></svg>'])
    chk("a plain SVG passes: "+s.slice(0,50),C.svgProblem(Buffer.from(s))===null,C.svgProblem(Buffer.from(s)));}

/* ======================= 4. the two forms ======================= */
{const title='A "quoted": {{ title }} {% x %} {#c#} # not a comment \\ end';
  const text=booklet(JSON.stringify(title),"A page that names `{{ .Site.Title }}`, {{ .Params.x }}, {% include x %} and {# a note #} in its text.\n\n## One\n\nSee [[#Two]].\n\n## Two\n\nBack to [[#One]].\n");
  const run=C.compile([{text,name:"braces",dir:TMP}],{form:"both",engine:X});
  const site=run.results[0].files.get("site/braces/index.html"),stand=run.results[0].files.get("standalone/braces/index.html");
  chk("the site page holds no template opening anywhere ({{, {%, {#)",!/\{\{|\{%|\{#/.test(site),(site.match(/.{20}(\{\{|\{%|\{#).{20}/)||[""])[0]);
  chk("…and its text keeps the braces, as character references",site.includes("&#123;&#123; .Site.Title }}")&&site.includes("&#123;% include x %}")&&site.includes("&#123;# a note #}"));
  const fm=/^---\ntitle: (.*)\n(?:description: (.*)\n)?---\n/.exec(site);
  chk("the front matter is quoted strings that read back as the title and description",fm&&JSON.parse(fm[1])===title&&(!fm[2]||JSON.parse(fm[2]).length>0)&&!/[{}]/.test(fm[0]),fm&&fm[0]);
  chk("the standalone page keeps its braces as they are (no generator reads it)",stand.includes("{{ .Params.x }}"));
  chk("every in-page link has its target, and every id is used once",[site,stand].every(p=>{const ids=[...p.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
    return new Set(ids).size===ids.length&&[...p.matchAll(/href="#([^"]*)"/g)].every(m=>ids.includes(m[1]));}));
  chk("a page with two top headings lists them under On this page",/<nav class="bk-toc"[^>]*>[^]*?href="#one"[^]*?href="#two"/.test(stand),(stand.match(/<nav[^]*?<\/nav>/)||[""])[0]);}
{const title='</script><script>alert(1)</script><!--';
  const run=C.compile([{text:booklet(JSON.stringify(title),"# x\n\nA page whose title tries to end its script.\n"),name:"ld",dir:TMP}],{form:"standalone",engine:X});
  const p=run.results[0].files.get("ld/index.html"),ld=/<script type="application\/ld\+json">([^<]*)<\/script>/.exec(p);
  chk("the JSON-LD block cannot be closed by a title: one </script> on the page, and it reads back",(p.match(/<\/script/gi)||[]).length===1&&(p.match(/<script/gi)||[]).length===1&&ld&&JSON.parse(ld[1]).headline===title);
  chk("the title is escaped in <title> and on the page",p.includes("<title>&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;!--</title>")&&!p.includes("<script>alert"));}
{const run=C.compile([{file:path.join(FIX,"compile-article.booklet.md")}],{form:"standalone",baseUrl:"https://example.org/library",engine:X}),p=run.results[0].files.get("compile-article/index.html");
  chk("the standalone head: lang, title, description from the first paragraph, canonical, Open Graph, JSON-LD",
    /^<!doctype html>\n<!-- booklet compile 0\.1\.0 · from compile-article\.booklet\.md · sha256:[0-9a-f]{64} -->\n<html lang="en">/.test(p)
    &&p.includes("<title>Pressing leaves</title>")
    &&/<meta name="description" content="A made-up article for the compiler's tests: how to press a leaf flat, in three short sections, with a note and a table\.">/.test(p)
    &&p.includes('<link rel="canonical" href="https://example.org/library/compile-article/">')&&p.includes('<meta property="og:url" content="https://example.org/library/compile-article/">')
    &&p.includes('<meta property="og:locale" content="en">')&&/"license":"https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/"/.test(p),p.split("</head>")[0]);
  const long="One sentence that runs on for a while to make the first paragraph long. "+"Another one, which keeps going past the point a search result shows. ".repeat(4);
  const d=D.describe(long);
  chk("a long first paragraph is cut at a sentence's end near 160 characters",d.length<=160&&/\.$/.test(d)&&long.startsWith(d),d);
  chk("…or at a word, with an ellipsis, when no sentence ends in time",/…$/.test(D.describe("word ".repeat(80)))&&D.describe("word ".repeat(80)).length<=158);}

/* ======================= 5. the command ======================= */
{const src=path.join(FIX,"compile-article.booklet.md"),before=sha(src),mtime=fs.statSync(src).mtimeMs;
  const out=path.join(TMP,"stamp"),pg=path.join(out,"compile-article","index.html");
  let r=cli(["--out",out,src]);
  chk("a first run writes the page, the stylesheet, its fonts and their licence",r.status===0&&fs.existsSync(pg)&&fs.existsSync(path.join(out,"booklet","booklet.css"))
    &&tree(path.join(out,"booklet","fonts")).filter(f=>f.endsWith(".woff2")).length===8&&fs.existsSync(path.join(out,"booklet","fonts","OFL.txt")),r.stderr);
  chk("the page's stamp says it is as compiled",C.stampState(fs.readFileSync(pg,"utf8"))==="compiled");
  r=cli(["--out",out,src]);chk("a second run over an untouched page writes it again, exit 0",r.status===0&&!/KEPT BACK/.test(r.stdout));
  const tidied=fs.readFileSync(pg,"utf8").replace("Pick leaves on a dry afternoon","Pick leaves on a dry, still afternoon");fs.writeFileSync(pg,tidied);
  r=cli(["--out",out,src]);
  chk("a page tidied by hand is kept back: exit 1, the report says so, the page is as tidied",r.status===1&&/KEPT BACK[^]*changed by hand since it was compiled \(--force overwrites it\)/.test(r.stdout)&&fs.readFileSync(pg,"utf8")===tidied,r.stdout.slice(0,300));
  r=cli(["--out",out,"--force",src]);
  chk("--force overwrites it",r.status===0&&C.stampState(fs.readFileSync(pg,"utf8"))==="compiled"&&!fs.readFileSync(pg,"utf8").includes("still afternoon"));
  fs.writeFileSync(pg,"<!doctype html>\n<p>A page someone else wrote.</p>\n");
  r=cli(["--out",out,src]);
  chk("a page the compiler did not write is kept back",r.status===1&&/not written by the compiler/.test(r.stdout)&&fs.readFileSync(pg,"utf8").includes("someone else wrote"));
  chk("the source file was never written (its bytes and its time)",sha(src)===before&&fs.statSync(src).mtimeMs===mtime);}
{const bad=path.join(TMP,"refused.booklet.md");fs.writeFileSync(bad,"# Not a booklet\n\nNo front matter.\n");
  const out=path.join(TMP,"refused"),r=cli(["--out",out,bad]);
  chk("a file the renderer refuses is refused: exit 1, REFUSED with the renderer's words, no page written",r.status===1&&/REFUSED, nothing written:\n\s+- Not a booklet file/.test(r.stdout)&&!fs.existsSync(path.join(out,"refused")),r.stdout);}
for(const [args,what] of [[["--help"],0],[["--version"],0],[["--frobnicate","x.booklet.md"],2],[["--form","pdf","x.booklet.md"],2],[[],2],
  [["--report","notes.md","x.booklet.md"],2],[["page.html"],2],[["--out"],2],[["--base-url","ftp://example.org/","x.booklet.md"],2]]){
  const r=cli(args);chk("compile "+(args.join(" ")||"(nothing)")+" exits "+what,r.status===what,r.status+" "+r.stderr.trim());}
chk("--version names the compiler and the renderer it reads",new RegExp("^compile 0\\.1\\.0 \\(renderer "+String(R.RENDERER_VERSION).replace(/\./g,"\\.")+", format ").test(cli(["--version"]).stdout));
chk("the report is never a .md file: nothing is written for --report notes.md",!fs.existsSync(path.join(TMP,"notes.md")));

fs.rmSync(TMP,{recursive:true,force:true});
console.log(fails?"\n"+fails+" FAILURES":"\ncompile content passed");process.exit(fails?1:0);
