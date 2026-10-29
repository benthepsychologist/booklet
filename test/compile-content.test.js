// What the compiler (compile/, compile 0.1.0) keeps, what it never publishes, and how it behaves as a command.
//   1. Nothing lost. For each example and each page-shaped fixture, the design is walked whole by the test's own walk
//      (not draw.js's, nor the renderer helpers draw.js reads it with): every string of every block, module, activity,
//      tab, page, citation and source, a prose block's as the renderer's own Markdown engine reads it with its plain
//      options (PLAIN_OPTS: a link is its words, an image its alt text, a mark nothing; a formula is left out here, since
//      it is drawn as MathML). Each word must be on the compiled page as many times as the design holds it, so a dropped
//      block fails even when its words stand elsewhere on the page (a made-up page with one paragraph cut proves it). What
//      the walk leaves out is listed, each with its reason (LEFT): what the renderer does not draw either, what the
//      compiler marks, and copies of words counted where they stand. A link to another booklet is drawn with that
//      booklet's title when it is compiled with it (checked below) and is marked when it is not.
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
const HEAD='---\nbooklet: "0.16"\nid: t/x\ntitle: TITLE\nlang: en\n---\n\n';
const booklet=(title,body)=>HEAD.replace("TITLE",title)+body;

/* ======================= 1. nothing lost ======================= */
/* words, with every element boundary a break (so both sides split the same way) */
const flat=x=>{const out=[];const go=v=>{if(v==null) return;if(Array.isArray(v)){v.forEach(go);return;}
  if(typeof v==="string"||typeof v==="number"){out.push(" "+v+" ");return;}
  if(v instanceof H.Comment||v instanceof H.Trusted) return;
  if(v&&v.kids){out.push(" ");go(v.kids);out.push(" ");}};go(x);return out.join("");};
const tokens=s=>String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
/* a fence's words are its code (its language is a setting); a formula is left out, since it is drawn as MathML */
const PLAIN={...R.PLAIN_OPTS,math:()=>"",fence:(lang,code)=>String(code),link:(t,lb)=>lb===undefined&&M.isModuleLink(t)?"":R.PLAIN_OPTS.link(t,lb)};
const mdWords=t=>tokens(flat(M.mdNodes(String(t==null?"":t),PLAIN)));
const inWords=t=>tokens(flat(M.renderInline(String(t),{opts:PLAIN,refs:Object.create(null)})));
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
/* The design, walked whole, by the test's own walk: it does not ask draw.js, or the renderer helpers draw.js reads the
   design with, what is drawn. Each block, and each module, activity, tab, page, citation and source, is a unit, and every
   string in it is its words (a prose block's text read by the renderer's Markdown engine, any other string as a line of
   inline Markdown), but for the settings in SETTINGS and the things in LEFT. Each of those is listed with its reason: the
   renderer does not draw it either, or the compiler marks it (and the coverage test holds the mark), or it is a copy of
   words counted where they stand. A reason no file uses fails the test, so the list cannot grow stale. */
const SETTINGS=new Set(["id","type","kind","engine","as","from","module","widget","booklet","lang","placement","color","tone","badge",
  "parent","cell","each","tab","key","keys","fields","svg","group","chips","regions"]);
const LEFT={
  version:"the booklet's and each module's version (a module's notice, version and all, is drawn)",
  theme:"the booklet's own look: marked (compile 0.2), and held by the coverage test",
  figures:"a figure: drawn where its prose places it, and held by the coverage test",
  copy:"a lede or a blurb: the renderer's copy of a paragraph, counted where it stands",
  calloutLabel:"a callout's label: the renderer's name for it, its title or else its kind",
  oneTitle:"the title of a module's one activity: the module's title stands for it, as in the renderer",
  moduleTitle:"a module's title that is the booklet's own: drawn once",
  titleOnce:"a title whose words open a prose block below it (its leading heading): drawn once",
  hidden:"an activity the renderer does not show (home: false)",
  marked:"a block the compiler marks (a query): the coverage test holds the mark",
  each:"a question asked for each pick in another: marked",
  widgetMarked:"a widget not in the file, or of an engine the compiler does not draw: marked",
  citation:"a citation's source key and the date it was checked, which the renderer does not draw",
  picking:"a widget's words for a reader who can pick (its buttons, its empty state, its sense words, a place in no figure): the renderer's read-only drawing leaves them off too",
  note:"a widget's notes, when the block does not ask to describe them",
  ownCopy:"a widget's own heading or help, where the block gives its own"};
const leftUsed=new Set();
function designUnits(P){const d=P.design,units=[];
  const leave=k=>{leftUsed.add(k);};
  const unit=(where,md)=>{const u={where,md:!!md,words:[]};units.push(u);return u;};
  const shown=a=>a&&a.home!==false;
  const words=(u,key,v)=>{if(typeof v!=="string"||SETTINGS.has(key)) return;u.words.push(...(u.md&&key==="text"?mdWords(v):inWords(v)));};
  /* the word lists every prose block opens with, for a title that repeats one */
  const openers=[];const gather=v=>{if(Array.isArray(v)) v.forEach(gather);else if(v&&typeof v==="object"){if(v.type==="markdown") openers.push(mdWords(v.text));Object.values(v).forEach(gather);}};
  gather(d.opening);(d.modules||[]).forEach(gather);
  const opensProse=t=>{const w=tokens(t);return w.length>0&&openers.some(o=>w.every((x,i)=>o[i]===x));};
  /* a widget, where a block draws it: every string in it, but what only a picking reader sees */
  const widget=(W,b,u)=>{const figs=Array.isArray(W.figures)?W.figures:[],inFig=new Set(figs.flatMap(f=>Array.isArray(f.regions)?f.regions:[]));
    const go=(v,key,path)=>{
      if(Array.isArray(v)){v.forEach(x=>go(x,key,path));return;}
      if(v&&typeof v==="object"){
        if(key==="regions"&&figs.length&&!inFig.has(v.id)){leave("picking");return;}
        for(const [k,x] of Object.entries(v)){
          if(path==="copy"&&!["h","p","stance","invite"].includes(k)){leave("picking");continue;}
          if(path==="copy"&&((k==="h"&&b.label!=null)||(k==="p"&&b.help!=null))){leave("ownCopy");continue;}
          if(k==="senses"&&path===""){leave("picking");continue;}
          if(k==="note"&&!b.describe){leave("note");continue;}
          if(path===""&&k==="figures"&&figs.length<2){continue;}
          go(x,k,path===""?k:path+"."+k);}
        return;}
      words(u,key,v);};
    go(W,"","");};
  const walk=(v,u,key,where,ctx)=>{
    if(Array.isArray(v)){v.forEach((x,i)=>walk(x,u,key,where+"["+i+"]",ctx));return;}
    if(v&&typeof v==="object"){
      if(typeof v.type==="string"){
        if(hasOwn(D.COVERAGE.blocks,v.type)&&D.COVERAGE.blocks[v.type]!=="drawn") return leave("marked");
        if(v.each) return leave("each");
        u=unit(v.type+" “"+String(v.id||"")+"”",v.type==="markdown");
        if(v.type==="widget"){const W=(d.widgets||[]).find(w=>w&&w.id===v.widget&&(!w.module||!v.module||w.module===v.module));
          if(!W||!hasOwn(D.COVERAGE.engines,W.engine)){units.pop();return leave("widgetMarked");}
          widget(W,v,u);}}
      else if(["modules","activities","tabs","pages","citations","sources"].includes(key)){
        if(key==="activities"&&!shown(v)) return leave("hidden");
        u=unit(key.replace(/s$/,"")+" “"+String(v.id||v.key||"")+"”");}
      for(const [k,x] of Object.entries(v)){
        if(where==="design"&&(k==="widgets"||k==="theme"||k==="figures")){if(k!=="widgets") leave(k);continue;}
        if(k==="version"&&(where==="design"||key==="modules")){leave("version");continue;}
        if((key==="activities"&&k==="lede")||(key==="modules"&&k==="blurb")){leave("copy");continue;}
        if(v.type==="callout"&&k==="label"){leave("calloutLabel");continue;}
        if(key==="citations"&&(k==="source"||k==="verifiedOn")){leave("citation");continue;}
        if(key==="activities"&&k==="title"&&ctx.oneUnder){leave("oneTitle");continue;}
        if(key==="modules"&&k==="title"&&tokens(x).join(" ")===tokens(d.title||"").join(" ")){leave("moduleTitle");continue;}
        if(k==="title"&&(where==="design"||key==="modules"||key==="activities")&&opensProse(x)){leave("titleOnce");continue;}
        walk(x,u,k,where==="design"?k:where+"."+k,key==="modules"&&k==="activities"
          ?{oneUnder:tokens(v.title||"").length>0&&(v.activities||[]).filter(shown).length===1}:ctx);}
      return;}
    words(u,key,v);};
  walk(d,unit("the booklet"),"","design",{});
  return units.filter(u=>u.words.length);}
/* a page's own text: its article, comments, tags and the head left out, character references read */
const ENT={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "};
const pageText=html=>{let t=String(html);const fm=/^---\ntitle: (.*)\n/.exec(t),a=t.indexOf("<article"),z=t.lastIndexOf("</article>");
  if(a>=0&&z>a) t=(fm?H.escText(JSON.parse(fm[1]))+" ":"")+t.slice(a,z);
  return t.replace(/<!--[\s\S]*?-->/g," ").replace(/<[^>]*>/g," ").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e)=>e[0]==="#"?String.fromCodePoint(e[1]==="x"||e[1]==="X"?parseInt(e.slice(2),16):parseInt(e.slice(1),10)):(ENT[e]||m));};
/* Counted, not looked up: each word must be on the page at least as many times as all the units together hold it, so a
   block that is dropped fails even when each of its words stands somewhere else on the page. The units a short word is in
   are named. */
const count=list=>{const m=new Map();for(const t of list) m.set(t,(m.get(t)||0)+1);return m;};
function shortOf(units,page){const have=count(tokens(pageText(page))),need=count(units.flatMap(u=>u.words));
  const short=[...need].filter(([t,n])=>(have.get(t)||0)<n).map(([t])=>t);
  return {short,need,where:units.filter(u=>u.words.some(w=>short.includes(w))).map(u=>u.where+": "+[...new Set(u.words.filter(w=>short.includes(w)))].join(" "))};}
const LOST_SET=[...fs.readdirSync(path.join(ROOT,"examples")).filter(f=>f.endsWith(".booklet.md")).map(f=>path.join(ROOT,"examples",f)),
  ...["compile-article","compile-kinds","compile-quiz","figures","charts","data-views"].map(n=>path.join(FIX,n+".booklet.md"))];
{const run=C.compile(LOST_SET.map(file=>({file})),{form:"both",engine:X});
  run.results.forEach((r,i)=>{const P=X.parse(fs.readFileSync(LOST_SET[i],"utf8")),units=designUnits(P);
    for(const form of ["standalone","site"]){const page=r.files.get(form+"/"+r.rep.name+"/index.html");
      const s=shortOf(units,page),n=[...s.need.values()].reduce((a,b)=>a+b,0);
      chk("nothing lost: "+r.rep.source+" ("+form+", "+units.length+" blocks and parts, "+n+" words, each counted)",page&&n>40&&!s.short.length,s.where.slice(0,8).join(" | "));}});
  const unused=Object.keys(LEFT).filter(k=>!leftUsed.has(k));
  chk("every reason the walk leaves something out is used by some page ("+Object.keys(LEFT).length+")",!unused.length,unused.join(", "));}
/* the count catches what a look-up misses: a paragraph whose every word is elsewhere on the page, taken out of the page */
{const text=booklet("Stones","# Stones\n\nA made-up page about flat stones.\n\nThe river makes the stones flat.\n\nFlat stones, the river makes.\n\nA last line about a heron.\n");
  const run=C.compile([{text,name:"stones",dir:TMP}],{form:"standalone",engine:X}),page=run.results[0].files.get("stones/index.html");
  const units=designUnits(X.parse(text)),cut=page.replace("<p>Flat stones, the river makes.</p>","");
  chk("the count holds the page as compiled",page&&!shortOf(units,page).short.length,shortOf(units,page).where.join(" | "));
  const s=shortOf(units,cut),words=new Set(tokens(pageText(cut)));
  chk("…and fails it, naming the block, when a paragraph whose words all stand elsewhere is taken out",cut!==page&&s.short.length>0&&s.where.length===1&&/^markdown /.test(s.where[0])
    &&["flat","stones","the","river","makes"].every(w=>words.has(w)),s.where.join(" | "));}
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

/* the shapes a records region can take that the renderer would read as design: a fence left open runs to the end of the
   file (so a region after it is text), and a records line can stand in the text itself. Each case is made-up text with
   its own marker words; a file in one of these shapes is refused, with the reason in words and no quote of the file, and
   no marker reaches any file written, the report or what is printed, refused or not. */
const WRITER=(()=>{const page=fs.readFileSync(path.join(ROOT,"booklet.html"),"utf8"),main=page.split("<script>\n")[1].split("\n</script>")[0];
  const body=page.slice(page.indexOf("<body>"),page.indexOf("<script>\n"));
  const ctx=require("vm").createContext(E.pageStub(new Set([...body.matchAll(/id="([^"]+)"/g)].map(m=>m[1]))));ctx.globalThis=ctx;ctx.self=ctx;
  require("vm").runInContext(main,ctx);
  /* the renderer's own writer, as the app saves a file: the design with one answer kept */
  return (text,answer)=>{ctx.__t=text;ctx.__a=answer;
    return require("vm").runInContext("(()=>{const P=parseFile(__t);const S=emptyState();S.answers['']={seen:__a};return fileText(P.template,S,emptyDrafts());})()",ctx);};})();
{const body=(extra)=>booklet("Moss","# Moss\n\nA made-up page about moss on a wall.\n\n> [!text|seen] What did you see?\n\n"+extra);
  const region=(m)=>"%%\n> [!records] App record — do not edit below this line\n\n```booklet answers\n{ \"seen\": \""+m+" a made-up answer\" }\n```\n\n"+m+"prose a line kept in the region\n%%\n";
  const cases=[
    ["a ``` fence left open before the region","qzxshtick",m=>body("```text\nan example the author never closed\n\n"+region(m)),"records line"],
    ["a ~~~ fence left open before the region","qzxshtilde",m=>body("~~~text\nan example the author never closed\n\n"+region(m)),"never closes"],
    ["a ```` fence left open (a ``` line cannot close it)","qzxshfour",m=>body("````text\nan example the author never closed\n\n"+region(m)),"never closes"],
    ["the renderer's own writer, after a body that ends in an open fence","qzxshwriter",m=>WRITER(body("```text\nan example the author never closed\n"),m+" a made-up answer"),"records line"],
    ["a fence left open and no region at all","qzxshnone",m=>body("```text\nan example the author never closed, "+m+"\n"),"never closes"],
    ["a records line shown as an example inside a closed code block","qzxshexample",m=>body("```markdown\n> [!records] an example of the format, "+m+"\n```\n\nMore about moss.\n"),"records line"],
    ["a region in the middle, with design after it","qzxshmiddle",m=>body(region(m)+"\nMore design after the region, about stems.\n\n> [!text|why] Why?\n"),null],
    ["a bare records line with no %%","qzxshbare",m=>body("> [!records] App record\n\n```booklet answers\n{ \"seen\": \""+m+" a made-up answer\" }\n```\n\n"+m+"prose after the records line\n\n> [!text|why] Why "+m+"question?\n"),null],
    ["two regions","qzxshtwo",m=>body(region(m)+"\n"+region(m+"second")),null]];
  for(const [what,mk,make] of cases){const text=make(mk),src=path.join(TMP,"shapes",mk,"moss.booklet.md");fs.mkdirSync(path.dirname(src),{recursive:true});fs.writeFileSync(src,text);
    chk("records shape, "+what+": the made-up file holds its marker",text.includes(mk),text.slice(-200));}
  for(const [what,mk,,refuse] of cases){const src=path.join(TMP,"shapes",mk,"moss.booklet.md"),out=path.join(TMP,"shapes",mk,"out"),rp=path.join(TMP,"shapes",mk,"report.txt");
    const r=cli(["--form","both","--out",out,"--report",rp,src]),seen=[];
    for(const f of tree(out)) if(fs.readFileSync(path.join(out,f)).toString("latin1").toLowerCase().includes(mk)) seen.push(f);
    if(fs.existsSync(rp)&&fs.readFileSync(rp,"utf8").toLowerCase().includes(mk)) seen.push("the report");
    if((r.stdout+r.stderr).toLowerCase().includes(mk)) seen.push("what was printed");
    chk("records shape, "+what+": no marker in any file, the report or what was printed",!seen.length,seen.join(", "));
    if(refuse) chk("…refused: exit 1, no page written, and the reason in words ("+refuse+")",r.status===1&&!fs.existsSync(path.join(out,"standalone","moss"))&&!fs.existsSync(path.join(out,"site","moss"))
      &&/REFUSED, nothing written:/.test(r.stdout)&&r.stdout.includes(refuse==="records line"?"a records line stands in the booklet's own text":"ends inside a code fence that never closes"),r.status+" "+r.stdout.slice(0,400));
    else chk("…compiled, its design drawn",r.status===0&&fs.readFileSync(path.join(out,"standalone","moss","index.html"),"utf8").includes("What did you see?"),r.stdout.slice(0,300));}}

/* author comments (%% … %%, hidden in Obsidian) are left off the page: nothing of them reaches any file, and the report
   gives their lines only. A %% inside fenced code is code, and is drawn. */
{const text=booklet("Lichen","# Lichen\n\nA made-up page about lichen. %%qzxcomone a note to myself%% It grows slowly.\n\n%%\nqzxcomtwo a longer note\nover two lines\n%%\n\nThe code keeps its marks:\n\n```text\n50%% of the rock %% is covered\n```\n\nLast words. %%qzxcomthree never closed\nand this line is hidden too\n");
  const src=path.join(TMP,"comments","lichen.booklet.md");fs.mkdirSync(path.dirname(src),{recursive:true});fs.writeFileSync(src,text);
  const out=path.join(TMP,"comments","out"),r=cli(["--form","both","--out",out,src]),seen=[];
  for(const f of tree(out)) if(/qzxcom/i.test(fs.readFileSync(path.join(out,f)).toString("latin1"))) seen.push(f);
  if(/qzxcom/i.test(r.stdout+r.stderr)) seen.push("what was printed");
  chk("author comments: no word of a comment reaches any file or the report",r.status===0&&!seen.length,seen.join(", ")+" "+r.stdout.slice(0,200));
  const page=fs.readFileSync(path.join(out,"standalone","lichen","index.html"),"utf8");
  chk("…the text around them is drawn, and a %% in fenced code stays",page.includes("A made-up page about lichen.")&&page.includes("It grows slowly.")&&page.includes("50%% of the rock %% is covered")&&page.includes("Last words.")&&!page.includes("this line is hidden"));
  chk("…and no HTML comment stands in their place",!/<!--[^>]*(?:comment|qzx)/i.test(page.replace(/^<!-- booklet compile[^\n]*\n/m,"")),(page.match(/<!--.*?-->/g)||[]).join(" "));
  chk("…the report names their lines only",/Author comments left off the page: line 10, lines 12\u201315, lines 23\u201324 \(never closed, so it runs to the end of the text\)\./.test(r.stdout),r.stdout.split("\n").filter(l=>/Author/.test(l)).join(""));}

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
  ["a base element",'<svg><base href="https://example.org/"/></svg>'],["a meta refresh",'<svg><meta http-equiv="refresh"/></svg>'],
  /* a namespace prefix can name the SVG or the XHTML namespace, so each of these runs or fetches as plainly as the above */
  ["a script behind a prefix bound to SVG",'<svg xmlns="http://www.w3.org/2000/svg" xmlns:p="http://www.w3.org/2000/svg"><p:script>document.title="x"</p:script></svg>'],
  ["a script behind a prefix bound to XHTML",'<svg xmlns="http://www.w3.org/2000/svg"><x:script xmlns:x="http://www.w3.org/1999/xhtml">document.title="x"</x:script></svg>'],
  ["an XHTML iframe inside a prefixed foreignObject",'<svg xmlns="http://www.w3.org/2000/svg"><p:foreignObject xmlns:p="http://www.w3.org/2000/svg"><x:iframe xmlns:x="http://www.w3.org/1999/xhtml" srcdoc="a"/></p:foreignObject></svg>'],
  ["an outside link through another prefix for xlink",'<svg xmlns="http://www.w3.org/2000/svg" xmlns:q="http://www.w3.org/1999/xlink"><image q:href="https://example.org/pixel.png" width="1" height="1"/></svg>'],
  ["an animation that sets a prefixed href",'<svg xmlns="http://www.w3.org/2000/svg" xmlns:q="http://www.w3.org/1999/xlink"><g><set attributeName="q:href" to="https://example.org/"/></g></svg>'],
  ["an outside image-set() in a style",'<svg xmlns="http://www.w3.org/2000/svg"><style>rect{background:image-set("https://example.org/t.png" 1x)}</style><rect width="4" height="4"/></svg>'],
  ["an outside image-set() with no scheme",'<svg xmlns="http://www.w3.org/2000/svg"><rect style="background:image-set(\'//example.org/t.png\' 1x)"/></svg>'],
  ["an editor's prefixed element",'<svg xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"><sodipodi:namedview/><rect/></svg>'],
  ["a prefixed attribute other than xlink:href",'<svg xmlns="http://www.w3.org/2000/svg"><rect xml:base="https://example.org/"/></svg>'],
  ["a default namespace other than SVG's on an inner element",'<svg xmlns="http://www.w3.org/2000/svg"><g xmlns="http://www.w3.org/1999/xhtml"><rect/></g></svg>'],
  ["xmlns:xlink naming another namespace",'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xhtml"><rect/></svg>'],
  ["a processing instruction after the declaration",'<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><?render now?><rect/></svg>'],
  ["a backslash that could spell a word in CSS",'<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:u\\72l(https://example.org/p.svg#g)"/></svg>'],
  ["a comment that never closes",'<svg xmlns="http://www.w3.org/2000/svg"><rect/><!-- and on'],
  ["an element that draws no picture",'<svg xmlns="http://www.w3.org/2000/svg"><video/></svg>'],
  ["a prefixed script, its prefix declared nowhere",'<svg xmlns="http://www.w3.org/2000/svg"><p:script>document.title="x"</p:script></svg>'],
  ["a prefixed href other than xlink:href",'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use q:href="#a"/></svg>'],
  ["an animation that sets a handler",'<svg xmlns="http://www.w3.org/2000/svg"><rect><set attributeName="onmouseover" to="x()"/></rect></svg>']];
  for(const [what,s] of bad){const why=C.svgProblem(Buffer.from(s));chk("an SVG with "+what+" is refused ("+why+")",typeof why==="string"&&why.length>0,s);}
  for(const s of ['<svg viewBox="0 0 10 10"><path d="M0 0L10 10" stroke="#333"/></svg>','<svg><defs><linearGradient id="g"/></defs><rect fill="url(#g)"/><use href="#g"/></svg>',
    '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg"><text>Tom &amp; Jo&#39;s</text></svg>',
    '<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<!-- a made-up drawing -->\n'
      +'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" viewBox="0 0 10 10"><title>A pebble</title>'
      +'<style><![CDATA[ .p{fill:#888} ]]></style><defs><radialGradient id="r"><stop offset="0" stop-color="#ccc"/></radialGradient></defs>'
      +'<ellipse class="p" cx="5" cy="5" rx="4" ry="3" fill="url(#r)"/><use xlink:href="#r"/><animate attributeName="opacity" from="0" to="1" dur="1s"/></svg>'])
    chk("a plain SVG passes: "+s.slice(0,50).replace(/\n/g," "),C.svgProblem(Buffer.from(s))===null,C.svgProblem(Buffer.from(s)));}

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

/* the page's language is the booklet's own, read and written as the renderer reads a tag */
{const text=HEAD.replace("TITLE","Moos").replace("lang: en","lang: de")+"# Moos\n\nEine erfundene Seite über Moos.\n";
  const run=C.compile([{text,name:"moos",dir:TMP}],{form:"both",baseUrl:"https://example.org/",engine:X}),st=run.results[0].files.get("standalone/moos/index.html"),si=run.results[0].files.get("site/moos/index.html");
  chk("lang: de gives the page lang=\"de\": <html>, <article>, og:locale and inLanguage",st.includes('<html lang="de">')&&/<article class="booklet" lang="de"/.test(st)&&/<article class="booklet" lang="de"/.test(si)
    &&st.includes('<meta property="og:locale" content="de">')&&/"inLanguage":"de"/.test(st),(st.match(/lang="[^"]*"|og:locale" content="[^"]*"|"inLanguage":"[^"]*"/g)||[]).join(" "));
  const t2=HEAD.replace("TITLE","Musgo").replace("lang: en","lang: PT-br")+"# Musgo\n\nUma página inventada.\n";
  const p2=C.compile([{text:t2,name:"musgo",dir:TMP}],{form:"standalone",engine:X}).results[0].files.get("musgo/index.html");
  chk("…a tag is written as the renderer normalises it (PT-br is pt-BR, og:locale pt_BR)",p2.includes('<html lang="'+R.normTag("PT-br")+'">')&&R.normTag("PT-br")==="pt-BR"&&p2.includes('content="pt_BR"'),(p2.match(/lang="[^"]*"/g)||[]).join(" "));}
/* the front matter carries no markup character; the description, no image box's words */
{const title='A <b>bold</b> fern & a "quoted" one',text=booklet(JSON.stringify(title),"# Ferns\n\n![A fern in a pot](missing.png) Ferns <i>like</i> shade & damp.\n\n## One\n\nA.\n\n## Two\n\nB.\n");
  const run=C.compile([{text,name:"ferns",dir:TMP}],{form:"both",engine:X}),site=run.results[0].files.get("site/ferns/index.html"),stand=run.results[0].files.get("standalone/ferns/index.html");
  const fm=/^---\n([\s\S]*?)\n---\n/.exec(site)[1];
  chk("the site front matter holds no < or >, and reads back as the title in words",!/[<>]/.test(fm)&&JSON.parse(/title: (.*)/.exec(fm)[1])==="A ‹b›bold‹/b› fern & a \"quoted\" one",fm);
  const desc=(/description: (.*)/.exec(fm)||[])[1];
  chk("…the description is the first paragraph's words, without the image box's alt text or address",desc&&!/fern in a pot|missing\.png/i.test(desc)&&/Ferns/.test(JSON.parse(desc))&&!/[<>]/.test(desc),desc);
  chk("…and the standalone head's description too",/<meta name="description" content="Ferns[^"]*shade[^"]*">/.test(stand)&&!/<meta name="description" content="[^"]*(fern in a pot|missing)/i.test(stand),(stand.match(/<meta name="description"[^>]*>/)||[""])[0]);
  chk("the title in <title>, og:title and JSON-LD is the title's words, never Markdown",run.results[0].rep.ok);}
{const text=booklet("*Moss* and **lichen**","# *Moss* and **lichen**\n\nA made-up page.\n");
  const p=C.compile([{text,name:"md-title",dir:TMP}],{form:"both",engine:X}).results[0].files;
  const st=p.get("standalone/md-title/index.html"),si=p.get("site/md-title/index.html");
  chk("…a title written in Markdown is plain text in <title>, og:title, JSON-LD and the front matter",st.includes("<title>Moss and lichen</title>")&&st.includes('<meta property="og:title" content="Moss and lichen">')
    &&/"headline":"Moss and lichen"/.test(st)&&/^---\ntitle: "Moss and lichen"\n/.test(si),(st.match(/<title>.*?<\/title>/)||[""])[0]+" "+si.split("\n")[1]);}
/* "On this page" adds no numbers of its own; ids the page fixes are bk- names, renamed past a heading that takes one, and
   aria-labelledby follows the rename; Temml's \label ids and \eqref links take the bk-tml- prefix */
{const text=booklet("Sums","# Sums\n\nA made-up page of sums.\n\n## Bk tml one\n\n$$\n\\begin{equation}x=1\\label{one}\\end{equation}\n$$\n\n## Bk toc h\n\n$$\n\\begin{equation}y=2\\label{one}\\end{equation}\n$$\n\nSee $x+\\eqref{one}$ and a note.[^n]\n\n## Bk notes h\n\nMore.\n\n[^n]: A made-up note.\n");
  const p=C.compile([{text,name:"sums",dir:TMP}],{form:"standalone",engine:X}).results[0].files.get("sums/index.html");
  const ids=[...p.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]),hrefs=[...p.matchAll(/href=(["'])#([^"']*)\1/g)].map(m=>m[2]);
  chk("every id is used once, and every in-page link (Temml's own included) has its target",new Set(ids).size===ids.length&&hrefs.every(h=>ids.includes(h)),ids.join(" ")+" | "+hrefs.join(" "));
  chk("…Temml's label ids and links take the bk-tml- prefix, a label written twice kept unique",ids.includes("bk-tml-one")&&ids.includes("bk-tml-one-2")&&hrefs.includes("bk-tml-one")&&!ids.includes("one")&&!hrefs.includes("one"));
  const lab=[...p.matchAll(/<(\w+)[^>]*\saria-labelledby="([^"]+)"[^>]*>/g)];
  chk("…every aria-labelledby names an id inside the element it labels, past the rename",lab.length===2&&lab.every(m=>{const at=p.indexOf(m[0]),end=p.indexOf("</"+m[1]+">",at);return p.slice(at,end).includes('id="'+m[2]+'"');})&&lab.some(m=>m[2]==="bk-toc-h-2")&&lab.some(m=>m[2]==="bk-notes-h-2"),lab.map(m=>m[2]).join(" "));
  const nav=(p.match(/<nav class="bk-toc"[\s\S]*?<\/nav>/)||[""])[0];
  chk("…\"On this page\" is a plain list: a <ul>, no <ol>, so the page adds no numbers of its own",/<ul>/.test(nav)&&!/<ol\b/.test(nav),nav.slice(0,200));}
/* a folded callout of a kind the page does not know takes the note look, as an unfolded one does */
{const text=booklet("Odd","# Odd\n\nA made-up page.\n\n> [!sparkle]- A folded odd one\n> Inside the fold.\n");
  const p=C.compile([{text,name:"odd",dir:TMP}],{form:"standalone",engine:X}).results[0].files.get("odd/index.html");
  chk("a folded callout of an unknown kind is drawn in the note look",/<details class="bk-fold bk-hue-sky bk-k-note">/.test(p),(p.match(/<details[^>]*>/)||[""])[0]);}
/* a callout with its own title shows it, as the renderer does: open, under the kind's word (the renderer's calloutNode keeps
   the word in the head and the title as a line of its own); folded, in place of the word (its foldedCallout) */
{const text=booklet("Tips","# Tips\n\nA made-up page.\n\n> [!tip] Why it works\n> Inside the open tip.\n\n> [!tip]- Why it folds\n> Inside the folded tip.\n\n> [!tip]\n> An untitled tip.\n");
  const p=C.compile([{text,name:"tips",dir:TMP}],{form:"standalone",engine:X}).results[0].files.get("tips/index.html");
  const boxes=[...p.matchAll(/<aside class="bk-callout bk-hue-sage bk-k-tip"[^]*?<\/aside>/g)].map(m=>m[0]),fold=(p.match(/<details class="bk-fold bk-hue-sage bk-k-tip">[^]*?<\/summary>/)||[""])[0];
  chk("a tip with its own title shows the title, under the word Tip, as the renderer does",boxes.length===2&&/<span class="bk-cl">Tip<\/span><\/p>\s*<p class="bk-ctitle">Why it works<\/p>/.test(boxes[0]),boxes[0]);
  chk("…an untitled tip shows the word Tip alone",boxes.length===2&&/<span class="bk-cl">Tip<\/span>/.test(boxes[1])&&!/bk-ctitle/.test(boxes[1]),boxes[1]);
  chk("…a folded tip with its own title shows the title in place of the word",/<span class="bk-ftitle">Why it folds<\/span><\/summary>$/.test(fold)&&!/>Tip</.test(fold),fold);}

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
/* the stylesheet carries a stamp like a page's: one tidied by hand is kept back, and the fonts beside it are still written */
{const src=path.join(FIX,"compile-article.booklet.md"),out=path.join(TMP,"css-stamp"),css=path.join(out,"booklet","booklet.css"),font=path.join(out,"booklet","fonts","OFL.txt");
  let r=cli(["--out",out,src]);
  chk("the stylesheet is written with its stamp on the first line",r.status===0&&/^\/\* booklet compile 0\.1\.0 · booklet\.css · sha256:[0-9a-f]{64} \*\/\n/.test(fs.readFileSync(css,"utf8")));
  const tidied=fs.readFileSync(css,"utf8")+"\n.booklet{max-width:40rem}\n";fs.writeFileSync(css,tidied);fs.rmSync(font);
  r=cli(["--out",out,src]);
  chk("a stylesheet tidied by hand is kept back: exit 1, the report says so, the file is as tidied",r.status===1&&/booklet\/booklet\.css: KEPT BACK, changed by hand since it was compiled \(--force overwrites it\)/.test(r.stdout)&&fs.readFileSync(css,"utf8")===tidied,r.stdout.slice(-300));
  chk("…while the page and the fonts beside it are written",fs.existsSync(font)&&fs.existsSync(path.join(out,"compile-article","index.html")));
  fs.writeFileSync(css,".booklet{color:red}\n");r=cli(["--out",out,src]);
  chk("…and one the compiler did not write is kept back too",r.status===1&&/booklet\.css: KEPT BACK, not written by the compiler/.test(r.stdout)&&fs.readFileSync(css,"utf8")===".booklet{color:red}\n");
  r=cli(["--out",out,"--force",src]);
  const own=fs.readFileSync(css,"utf8");
  chk("…until --force, which writes the compiler's own, stamped",r.status===0&&C.cssStampState(own)==="compiled"&&own.slice(own.indexOf("\n")+1)===fs.readFileSync(path.join(ROOT,"compile","booklet.css"),"utf8"));}
/* two addresses that differ only in case clash (they are one folder on a case-insensitive disk) */
{const a=path.join(TMP,"case","one","Moss.booklet.md"),b=path.join(TMP,"case","two","moss.booklet.md");
  for(const f of [a,b]){fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,booklet("Moss","# Moss\n\nA made-up page.\n"));}
  const out=path.join(TMP,"case","out"),r=cli(["--out",out,a,b]);
  chk("two files whose addresses differ only in case: the second is refused, exit 1",r.status===1&&/another file in this run has the same address, “Moss” \(addresses that differ only in case clash\)/.test(r.stdout)
    &&fs.existsSync(path.join(out,"Moss","index.html"))&&!fs.readdirSync(out).includes("moss"),r.stdout.slice(0,400));}
/* one file that throws stops only itself: the run goes on, the report names the kind of error and where, never its words */
{const boom={...X,parse:t=>{if(t.includes("Wobble")) throw new TypeError("could not read qzxthrow "+t.slice(0,40));return X.parse(t);}};
  const run=C.compile([{text:booklet("Wobble","# Wobble\n\nA made-up page.\n"),name:"wobble",dir:TMP},{text:booklet("Steady","# Steady\n\nA made-up page.\n"),name:"steady",dir:TMP}],{form:"standalone",engine:boom});
  const [w,st]=run.results,rep=C.reportText(run);
  chk("a file that throws is refused, and the next one still compiles",!w.rep.ok&&!w.files.size&&st.rep.ok&&st.files.has("steady/index.html"));
  chk("…the report names the kind of error and where it was raised, never its message",/REFUSED, nothing written:\n\s+- the compiler failed on it \(TypeError in compile-content\.test\.js at line \d+\)/.test(rep)&&!/qzxthrow|could not read/.test(rep),rep.split("\n").filter(l=>/failed/.test(l)).join(""));}
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
