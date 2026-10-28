// The compiler's guard (compile/, compile 0.1.0): what it may never do, checked by reading its own source.
//   1. No second reader. The compiler reads the format only through booklet.html's own parse and Markdown engine, so no
//      code under compile/ may hold a callout-line, fence, footnote, link, image, heading, list, quote or math pattern of
//      its own, and the booklet's text may go nowhere but to the parse.
//   2. Every renderer name it uses exists. Each name compile/ takes from the renderer is in engine.js's list, and each
//      one, with the Markdown engine's markers, the formula library, the icons and the fonts, is in this commit's
//      booklet.html, so a rename there fails here, in booklet's own CI, and not on a host's build.
//   3. Records are never handed over. No code under compile/ reaches the parse's state (S), its drafts, or the records
//      region's text (raw.wrote, raw.records); the design's own text (raw.source) is read in one place, engine.js.
//   4. It installs nothing and fetches nothing. No package.json or node_modules under compile/, no module beyond fs,
//      path, vm, crypto and its own files, and no network call of any kind.
//   5. It writes only where it is told. Every file write is in compile.js's write() or the report, and never a .md file.
// Run: node test/compile-guard.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,".."),DIR=path.join(ROOT,"compile");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};

const files=fs.readdirSync(DIR).filter(f=>f.endsWith(".js")).sort();
const src=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(DIR,f),"utf8")]));
/* the code without its comments: block comments, and line comments that start a line (the compiler writes no other kind) */
const code=Object.fromEntries(files.map(f=>[f,src[f].replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"")]));
const allCode=files.map(f=>code[f]).join("\n");
chk("compile/ holds the four files the compiler is made of",["compile.js","draw.js","engine.js","html.js"].every(f=>files.includes(f)),files.join(", "));

/* ---- 1. no second reader ---- */
const FORBIDDEN=[
  ["a callout line (\\[! or \"[!)",/\\\[!|["'`]\[!/],
  ["a code fence (``` or ~~~)",/```|~~~|`\{3|~\{3/],
  ["a footnote mark ([^)",/\\\[\\\^/],
  ["an image (![)",/!\\\[/],
  ["a link's address (](  )",/\\\]\\\(/],
  ["a heading (#{1,6} or ^#)",/#\{1,6\}|\^#/],
  ["a quote line (^>)",/\^\\s\*>|(?<!\[)\^>|\^ \{0,3\}>/],
  ["display math ($$)",/\\\$\\\$|"\$\$"/],
  ["strong or emphasis (\\*\\*, __)",/\\\*\\\*|\\_\\_/],
  ["a list item (^- , ^\\d+\\.)",/\^\\s\*\[-\*\+\]|\^\[-\*\+\]|\^\\d\+\\\./],
  ["a table row (^\\|)",/\^\\\|/],
  ["a page break (***)",/\\\*\{3\}|\\\*\\\*\\\*/],
  ["front matter (^---)",/\^---/],
  ["a records line or region (%%)",/%%/]];
for(const [what,re] of FORBIDDEN){const hits=files.filter(f=>re.test(code[f]));
  chk("no "+what+" pattern of its own under compile/",!hits.length,hits.join(", "));}
/* the booklet's text goes to the parse and nowhere else: compile.js reads an input file in one place, parseInput, whose
   only job is to hand the text to X.parse */
const reads=(code["compile.js"].match(/readFileSync\(input\.file/g)||[]).length;
chk("compile.js reads a booklet file in exactly one place",reads===1,reads);
chk("…and that place hands the text straight to the renderer's parse",/const parseInput=\(X,input\)=>X\.parse\(input\.text!=null\?input\.text:fs\.readFileSync\(input\.file,"utf8"\)\);/.test(code["compile.js"]));
chk("no code under compile/ but engine.js calls the renderer's parse",files.filter(f=>f!=="engine.js"&&/\.parseFile\(/.test(code[f])).length===0);
chk("draw.js and html.js read no file at all",!/\bfs\b|readFileSync/.test(code["draw.js"]+code["html.js"]));

/* ---- 2. every renderer name exists ---- */
const E=require("../compile/engine.js");
const used=new Set([...allCode.matchAll(/\b(?:X\.)?R\.([A-Za-z_$][\w$]*)/g)].map(m=>m[1]));
const notListed=[...used].filter(n=>!E.NAMES.includes(n));
chk("every R.<name> the compiler uses is in engine.js's NAMES (so it is checked)",!notListed.length,notListed.join(", "));
const mdUsed=new Set([...allCode.matchAll(/\bM\.([A-Za-z_$][\w$]*)/g)].map(m=>m[1]));
const mdNot=[...mdUsed].filter(n=>!E.MD_NAMES.includes(n));
chk("every M.<name> the compiler uses is in engine.js's MD_NAMES",!mdNot.length,mdNot.join(", "));
const page=fs.readFileSync(path.join(ROOT,"booklet.html"),"utf8");
const main=page.split("<script>\n")[1].split("\n</script>")[0];
const defined=n=>new RegExp("(?:^|[\\s;,(])(?:const|let|var|function)\\s+"+n.replace(/\$/g,"\\$")+"\\b|[,\\s]"+n.replace(/\$/g,"\\$")+"\\s*=(?!=)","m").test(main);
const undefinedNames=[...E.NAMES,...E.VARS].filter(n=>!defined(n));
chk("every name in NAMES and VARS is declared in booklet.html's main script",!undefinedNames.length,undefinedNames.join(", "));
chk("the Markdown engine's two markers are in booklet.html, in order",page.indexOf(E.MD_START)>0&&page.indexOf(E.MD_END)>page.indexOf(E.MD_START));
let X=null;try{X=E.load();}catch(e){chk("the compiler loads this commit's booklet.html",false,e.message);}
if(X){
  chk("the compiler loads this commit's booklet.html, and every name answers",true);
  chk("each MD_NAMES entry is a function the engine gives back",E.MD_NAMES.every(n=>typeof X.M[n]==="function"));
  chk("Temml wakes and draws a formula as MathML",/^<math[\s>]/.test(X.temml.renderToString("x^2",{throwOnError:true})),X.temmlVersion);
  const looks=Object.values(X.R.CALLOUT_LOOK).map(l=>l.icon);
  const missingIcons=[...new Set([...looks,"lightbulb","circle-check"])].filter(i=>!X.icons[i]);
  chk("every icon a callout kind, a hint or a solution uses is in the sprite",!missingIcons.length,missingIcons.join(", "));
  const F=X.fonts();
  chk("the fonts: eight faces, Atkinson Hyperlegible and Lexend",F.faces.length===8&&new Set(F.faces.map(f=>f.family)).size===2,F.faces.map(f=>f.name).join(", "));
  chk("each face's bytes are a woff2 file",F.faces.every(f=>f.bytes.slice(0,4).toString("latin1")==="wOF2"));
  chk("the fonts' licence is the SIL Open Font License, whole",/SIL OPEN FONT LICENSE Version 1\.1/.test(F.licence)&&/OTHER DEALINGS IN THE FONT SOFTWARE\.\n$/.test(F.licence));
  chk("the renderer's tables the coverage test reads are there",X.R.DRAW_BLOCK&&X.R.QUESTION_KINDS&&X.R.ENGINES&&X.R.QUERY_VIEWS&&X.R.COLOUR_NAMES);}

/* ---- 3. records are never handed over ---- */
for(const [what,re] of [["the parse's state (.S)",/\.S\b/],["the drafts",/\bdrafts\b/],["the records region's bytes (.wrote)",/\bwrote\b/],
  ["the records kept as written (raw.records)",/raw\.records|\.records\b/],["the records' counts (entries, answers)",/(?<!Object)\.entries\b|\.answers\b/]]){
  const hits=files.filter(f=>re.test(code[f]));chk("no code under compile/ reaches "+what,!hits.length,hits.join(", "));}
/* the parse's raw: read in engine.js only, for its source (the design's own text), and left behind when the design is copied */
const rawUses=files.flatMap(f=>[...code[f].matchAll(/\.raw\b[.\w]*|\{\s*raw\b[^}]*\}/g)].map(m=>f+": "+m[0].replace(/\s+/g,"")));
chk("the parse's raw is read in engine.js only, for its source and to leave it behind",
  rawUses.length>0&&rawUses.every(u=>/^engine\.js: (\.raw|\.raw\.source|\{raw,\.\.\.rest\})$/.test(u))&&rawUses.includes("engine.js: .raw.source"),rawUses.join("; "));

/* ---- 4. installs nothing, fetches nothing ---- */
const tree=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?[e.name+"/",...tree(path.join(d,e.name)).map(x=>e.name+"/"+x)]:[e.name]);
const all=tree(DIR);
chk("no package.json, lock file or node_modules under compile/",!all.some(f=>/(^|\/)(package(-lock)?\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|node_modules\/)/.test(f)),all.join(", "));
chk("compile/ holds only the compiler's files, its stylesheet and its README",all.every(f=>/^(compile|draw|engine|html)\.js$|^booklet\.css$|^README\.md$/.test(f)),all.join(", "));
const mods=new Set([...allCode.matchAll(/require\(\s*["'`]([^"'`]+)["'`]\s*\)/g)].map(m=>m[1]));
const allowed=new Set(["fs","path","vm","crypto","./html.js","./engine.js","./draw.js"]);
chk("it requires only fs, path, vm, crypto and its own files",[...mods].every(m=>allowed.has(m)),[...mods].join(", "));
chk("every require names its module as a plain string",(allCode.match(/require\(/g)||[]).length===(allCode.match(/require\(\s*["'`][^"'`]+["'`]\s*\)/g)||[]).length);
for(const [what,re] of [["fetch",/\bfetch\b/],["XMLHttpRequest",/XMLHttpRequest/],["WebSocket",/WebSocket/],["EventSource",/EventSource/],
  ["a dynamic import",/\bimport\s*\(/],["a network module",/["'`](?:node:)?(?:https?|http2|net|tls|dgram|dns|child_process|worker_threads|cluster|inspector)["'`]/],
  ["process.binding or process.dlopen",/process\.(?:binding|dlopen)/],["eval or new Function",/\beval\s*\(|new Function\b/]]){
  const hits=files.filter(f=>re.test(code[f]));chk("no "+what+" under compile/",!hits.length,hits.join(", "));}

/* ---- 5. writes only where it is told ---- */
const writes=files.flatMap(f=>[...code[f].matchAll(/fs\.(writeFileSync|writeFile|appendFileSync|appendFile|copyFileSync|renameSync|rmSync|unlinkSync|createWriteStream|symlinkSync|cpSync)\b/g)].map(m=>f+": "+m[1]));
chk("the only file writes are write()'s one and the report's",writes.length===2&&writes.every(w=>w==="compile.js: writeFileSync"),writes.join("; "));
chk("the report may not be a .md file",/--report names a \.md file/.test(code["compile.js"]));

console.log(fails?"\n"+fails+" FAILURES":"\ncompile guard passed");process.exit(fails?1:0);
