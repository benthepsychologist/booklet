// The compiler's guard (compile/, compile 0.1.0): what it may never do, checked by reading its own source.
//   1. No second reader. The compiler reads the format only through booklet.html's own parse and Markdown engine, so no
//      code under compile/ may hold a callout-line, fence, footnote, link, image, heading, list, quote or math pattern of
//      its own, as a regular expression or as a string test (startsWith("> [!"), "%"+"%", "`".repeat(3)), and the
//      booklet's text may go nowhere but to the parse. The patterns are tried on made-up re-readings first, so a pattern
//      that stops catching one fails here. One region is let off one pattern: engine.js's author comments (%% ... %%,
//      Obsidian's hidden comments, which the renderer publishes as prose and the compiler leaves off the page) hold the
//      comment mark, once, and read nothing else of the format: fenced code is the renderer's own codeMask.
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
const srcWhole=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(DIR,f),"utf8")]));
/* script.js's BANNED region names the words 4. forbids, as patterns and nothing else (checked in 6.); it is cut out of the
   words the checks look for, so the list of banned words is not itself a ban hit */
const BAN_A="/* BANNED\n",BAN_B="/* /BANNED */",sj=srcWhole["script.js"]||"";
const banA=sj.indexOf(BAN_A),banB=sj.indexOf(BAN_B);
const banRegion=banA>=0&&banB>banA?sj.slice(banA,banB+BAN_B.length):"";
const src={...srcWhole,...(banRegion?{"script.js":sj.slice(0,banA)+sj.slice(banB+BAN_B.length)}:{})};
/* the code without its comments: block comments, and line comments that start a line (the compiler writes no other kind) */
const code=Object.fromEntries(files.map(f=>[f,src[f].replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"")]));
const allCode=files.map(f=>code[f]).join("\n");
const strip=t=>t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
/* engine.js's author-comments region, cut out of the code the patterns are tried on, and checked on its own below */
const AC_START="/* AUTHOR COMMENTS\n",AC_END="/* /AUTHOR COMMENTS */",eng=src["engine.js"]||"";
const acA=eng.indexOf(AC_START),acB=eng.indexOf(AC_END);
const acRegion=acA>=0&&acB>acA?strip(eng.slice(acA,acB+AC_END.length)):"";
const outside=Object.fromEntries(files.map(f=>[f,f==="engine.js"&&acRegion?strip(eng.slice(0,acA)+eng.slice(acB+AC_END.length)):code[f]]));
chk("compile/ holds the five files the compiler is made of",["compile.js","draw.js","engine.js","html.js","script.js"].every(f=>files.includes(f)),files.join(", "));

/* ---- 1. no second reader ---- */
const FORBIDDEN=[
  ["a callout line ([! anywhere)",/\[!/],
  ["a code fence (``` or ~~~, a lone ` or ~ string, a repeat of one)",/```|~~~|`\{3|~\{3|["']`+["']|["'`]~+["'`]|`\\`+`/],
  ["a footnote mark or a block link's caret ([^, a lone \"^\" string)",/\\\[\\\^|["'`]\^["'`]/],
  ["an image (![)",/!\\\[/],
  ["a link's address (](  )",/\\\]\\\(/],
  ["a heading (#{1,6}, ^#, ^(#, #+)",/#\{1,6\}|\^\(?#|#\+/],
  ["a quote line (^>, or a string test for \">\")",/\^\\s\*>|(?<!\[)\^>|\^ \{0,3\}>|(?:startsWith\(|===|!==|==|!=)\s*["'`]>/],
  ["a format character built from its code (fromCharCode, \\x60 and the like)",/fromCharCode|\\(?:x|u00)(?:60|7e|25|23|5b)/i],
  ["display math ($$)",/\\\$\\\$|"\$\$"/],
  ["strong or emphasis (\\*\\*, __)",/\\\*\\\*|\\_\\_/],
  ["a list item (^- , ^\\d+\\.)",/\^\\s\*\[-\*\+\]|\^\[-\*\+\]|\^\\d\+\\\./],
  ["a table row (^\\|)",/\^\\\|/],
  ["a page break (***)",/\\\*\{3\}|\\\*\\\*\\\*/],
  ["front matter (^---)",/\^---/],
  ["a records line, region or author comment (%%, a lone % string)",/%%|["'`]%+["'`]/]];
/* made-up re-readings of the format, each written the way a second reader might slip in: every one must be caught */
const REREADINGS=[
  'const isRecordLine=s=>s.startsWith("> [!records");',
  'const isRegionEdge=s=>s.trim()==="%"+"%";',
  'const fenceMark="`".repeat(3);',
  'const tildeMark="~".repeat(3);',
  'const calloutRe=/^>\\s?\\[!(\\w+)\\]/;',
  'const headingRe=/^(#+)\\s/;',
  'const toBlock=t=>t[0]==="#"&&t[1]==="^";',
  'const isQuote=s=>s.trimStart().startsWith(">");',
  'const tick=String.fromCharCode(96);',
  'const ticks="\\x60\\x60\\x60";',
  'const atx=/#{1,6} /;',
  'const fence=/^```/;'];
const missed=REREADINGS.filter(t=>!FORBIDDEN.some(([,re])=>re.test(t)));
chk("the patterns catch every made-up re-reading of the format ("+REREADINGS.length+")",!missed.length,missed.join("  |  "));
for(const [what,re] of FORBIDDEN){const hits=files.filter(f=>re.test(outside[f]));
  chk("no "+what+" pattern of its own under compile/",!hits.length,hits.join(", "));}
/* the author-comments region: there once, the mark once, fenced code from the renderer, and no other pattern */
chk("engine.js holds one author-comments region",acA>=0&&acB>acA&&eng.indexOf(AC_START,acA+1)<0&&eng.indexOf(AC_END,acB+1)<0);
chk("…whose only format string is the comment mark, once",(acRegion.match(/%%/g)||[]).length===1&&/const COMMENT_MARK="%%";/.test(acRegion),acRegion.match(/.{0,30}%%.{0,10}/g));
chk("…which takes fenced code from the renderer's own codeMask",/R\.codeMask\(/.test(acRegion));
const acOther=FORBIDDEN.slice(0,-1).filter(([,re])=>re.test(acRegion)).map(([w])=>w);
chk("…and holds no other pattern of the format",!acOther.length,acOther.join("; "));
/* the link rule is the renderer's: draw.js asks linkHooks where a link goes, and decides nothing of its own */
chk("draw.js takes where a link goes from the renderer's linkHooks",/R\.linkHooks\(/.test(code["draw.js"]));
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
  chk("the renderer's tables the coverage test reads are there",X.R.DRAW_BLOCK&&X.R.QUESTION_KINDS&&X.R.ENGINES&&X.R.QUERY_VIEWS&&X.R.COLOUR_NAMES);
  /* the records refusals lean on three of the renderer's own things: its problem for a record block outside the region,
     its callout line, and its fences */
  const codes=[...code["engine.js"].matchAll(/\.code==="(\w+)"/g)].map(m=>m[1]);
  chk("each problem code engine.js looks for is one the renderer has ("+codes.join(", ")+")",codes.length>0&&codes.every(c=>typeof X.R.strings("problem")[c]==="function"),codes.join(", "));
  chk("the renderer's callout line reads a records line, and its fences report one left open",
    (()=>{const m=X.R.CALLOUT_LINE.exec("> [!records|m] x");const F=Array.from(X.R.codeFences(["a","```text","b"]));return !!m&&m[1]==="records"&&F.length===1&&F[0].end>=3;})());}

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
chk("compile/ holds only the compiler's files, its stylesheet, its README and the script's parts",all.every(f=>/^(compile|draw|engine|html|script)\.js$|^booklet\.css$|^README\.md$|^script\/$|^script\/[A-Za-z0-9][A-Za-z0-9._-]*\.js$/.test(f)),all.join(", "));
const mods=new Set([...allCode.matchAll(/require\(\s*["'`]([^"'`]+)["'`]\s*\)/g)].map(m=>m[1]));
const allowed=new Set(["fs","path","vm","crypto","./html.js","./engine.js","./draw.js","./script.js"]);
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

/* ---- 6. the script (compile/script.js and compile/script/): the banned words, and the parts held to them ---- */
const SC=require("../compile/script.js");
chk("script.js holds one BANNED region",banA>=0&&banB>banA&&sj.indexOf(BAN_A,banA+1)<0);
chk("…which holds patterns and no call (no require, no function call but the pattern literals)",!/require\(|\.exec\(|\.test\(|\bfunction\b|=>/.test(strip(banRegion)));
const partDir=path.join(DIR,"script"),parts=fs.existsSync(partDir)?fs.readdirSync(partDir).filter(f=>f.endsWith(".js")).sort():[];
for(const f of parts){const t=fs.readFileSync(path.join(partDir,f),"utf8");
  const hits=SC.scan(t);chk("script/"+f+" holds no banned word (nothing kept, nothing sent, no markup made at run time)",!hits.length,hits.map(h=>"line "+h.line+": "+h.why).join("; "));
  chk("script/"+f+" is one immediately called function",SC.shape(t)==="",SC.shape(t));
  chk("script/"+f+" reads no booklet text and no records (nothing of the format, no .S, drafts or raw)",!/\.raw\b|\bdrafts\b|\bBOOK\b|parseFile/.test(t));}
try{const built=SC.assemble();chk("the parts assemble into one script ("+(built?built.parts.length+" parts, "+built.text.length+" characters":"no parts")+")",true);}
catch(e){chk("the parts assemble into one script",false,e.message);}

console.log(fails?"\n"+fails+" FAILURES":"\ncompile guard passed");process.exit(fails?1:0);
