// The compiler's optional script (compile/script.js, compile/script/): how booklet.js is built, scanned, linked and written.
//   - the scan names every word a part may never hold (nothing kept, nothing sent, no markup made at run time), each tried on a
//     made-up part, and passes a clean one;
//   - the assembler joins parts in file-name order, one immediately called function each, and refuses a part that is not
//     one, is not valid script, or holds a banned word, naming the part and the line;
//   - a page links the script with defer only when it needs it, in a standalone page's head and never in a site fragment;
//     the script is written beside booklet.css with the stamp the stylesheet has, and only when a page needs it;
//   - a part with a banned word stops the build, and nothing is written.
// Run: node test/compile-script.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path"),os=require("os");
const ROOT=path.join(__dirname,".."),C=require("../compile/compile.js"),E=require("../compile/engine.js"),SC=require("../compile/script.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"bk-script-"));
process.on("exit",()=>{try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}});
const mk=(name,files)=>{const d=path.join(tmp,name);fs.mkdirSync(d,{recursive:true});for(const [f,t] of Object.entries(files)) fs.writeFileSync(path.join(d,f),t);return d;};
const part=body=>"(function(){\n\"use strict\";\n"+body+"\n})();\n";

/* ---- the scan: every banned word is caught, in code or in a comment, and a clean part passes ---- */
const BAN=[["localStorage","var s=window.localStorage;"],["sessionStorage","sessionStorage.setItem('a','b');"],["indexedDB","indexedDB.open('x');"],
  ["a cookie","document.cookie='a=b';"],["fetch","fetch('/x');"],["XMLHttpRequest","new XMLHttpRequest();"],["WebSocket","new WebSocket('ws://x');"],
  ["sendBeacon","navigator.sendBeacon('/x');"],["eval","eval('1');"],["Function(","new Function('return 1')();"],["import(","import('./x.js');"],
  ["innerHTML","el.innerHTML='<b>x</b>';"],["insertAdjacentHTML","el.insertAdjacentHTML('beforeend','x');"],
  ["outerHTML","el.outerHTML='x';"],["document.write","document.write('x');"],["EventSource","new EventSource('/e');"],
  ["postMessage","window.postMessage('x','*');"],["a computed global","window['loc'+'alStorage'];"],["globalThis","globalThis.x;"],
  ["a constructor reach","[].constructor.constructor('1')();"],["an image made at run time","new Image().src='/p';"],
  ["a comment that names one","// we could call fetch here"],["a block comment that names one","/* innerHTML would be quicker */"],["mixed case","var x=INDEXEDDB;"]];
for(const [what,text] of BAN) chk("the scan catches "+what,SC.scan(text).length>0);
const CLEAN=part("var q=document.querySelectorAll('.bk-q');q.forEach(function(b){b.addEventListener('change',function(){b.setAttribute('data-bk-done','');});});");
chk("the scan passes a clean part",SC.scan(CLEAN).length===0,JSON.stringify(SC.scan(CLEAN)));
chk("the scan names the line",SC.scan("a\nb\nfetch(1)\n")[0].line===3);
chk("the clean part is one immediately called function",SC.shape(CLEAN)==="");
chk("a statement outside the function is not a part",SC.shape("var a=1;\n(function(){})();\nvar b=2;")!=="");
chk("a bare function is not a part",SC.shape("function f(){}")!=="");
chk("an arrow function called at once is a part",SC.shape("(()=>{ var a=1; })();")==="");
chk("leading comments are let through before the function",SC.shape("/* a part */\n// and more\n"+CLEAN)==="");

/* ---- the assembler ---- */
const dir=mk("parts",{"20-b.js":part("var b=2;"),"10-a.js":part("var a=1;"),"notes.txt":"not a part"});
const built=SC.assemble(dir);
chk("the parts are joined in file-name order",built&&built.parts.join()==="10-a.js,20-b.js"&&built.text.indexOf("var a=1;")<built.text.indexOf("var b=2;"));
chk("…and only the .js files are parts",built&&built.parts.length===2);
chk("the script opens with a comment that says it keeps nothing and sends nothing",/^\/\* booklet\.js: [^\n]*keeps nothing and sends nothing/.test(built.text));
chk("the same parts make the same script, byte for byte",SC.assemble(dir).text===built.text);
chk("the joined script is itself valid script and scans clean",!SC.scan(built.text).length&&(()=>{try{new (require("vm").Script)(built.text);return true;}catch(e){return false;}})());
chk("no folder, and an empty folder, make no script",SC.assemble(path.join(tmp,"none"))===null&&SC.assemble(mk("empty",{}))===null);
const refuse=(name,files,re)=>{let msg="";try{SC.assemble(mk(name,files));}catch(e){msg=e.message;}chk(name+": refused, naming the part",re.test(msg),msg);};
refuse("bad-word",{"10-a.js":part("var x=1;\nvar y=window.localStorage;")},/10-a\.js line 4: keep something \(localStorage\)/);
refuse("bad-shape",{"10-a.js":"var leak=1;\n(function(){})();"},/10-a\.js: it does not open with an immediately called function/);
refuse("bad-syntax",{"10-a.js":"(function(){ var = ; })();"},/10-a\.js: it is not valid script/);
refuse("one-of-two",{"10-a.js":part("var a=1;"),"20-b.js":part("fetch('/x');")},/20-b\.js line 3: send something \(fetch\)/);

/* ---- the compiler: link, write, stamp, refuse ---- */
const X=E.load(),book=path.join(ROOT,"examples","how-tides-work.booklet.md");
const good=mk("good",{"10-a.js":part("var a=1;")});
const withScript=C.compile([{file:book}],{form:"both",engine:X,scriptDir:good,forceScript:true});
const pageOf=(run,rel)=>String(run.results[0].files.get(rel));
const std=pageOf(withScript,"standalone/how-tides-work/index.html"),site=pageOf(withScript,"site/how-tides-work/index.html");
chk("a page that needs the script links it once, with defer, in the head, after the stylesheet",
  (std.match(/<script src="[^"]*" defer><\/script>/g)||[]).length===1&&std.includes('<link rel="stylesheet" href="../booklet/booklet.css">\n<script src="../booklet/booklet.js" defer></script>')&&std.indexOf("booklet.js")<std.indexOf("</head>"));
chk("a site fragment never carries the link (the layout does)",!/<script/.test(site));
chk("booklet.js is written beside booklet.css in each form, stamped",["standalone/","site/"].every(r=>{const t=withScript.assets.get(r+"booklet/booklet.js");return typeof t==="string"&&/^\/\* booklet compile \S+ · booklet\.js · sha256:[0-9a-f]{64} \*\/\n/.test(t)&&t.includes("var a=1;");}));
chk("the run says how big the script is, and what it is made of",withScript.script&&withScript.script.parts[0]==="10-a.js"&&withScript.script.bytes>0);
const rep=C.reportText(withScript);
chk("the report says the page links a script that keeps nothing",/Script: the page links booklet\.js, which keeps nothing and sends nothing/.test(rep));
const siteOnly=C.compile([{file:book}],{form:"site",engine:X,scriptDir:good,forceScript:true});
chk("a site-only run still writes the script, and the report tells the layout to load it",siteOnly.assets.has("booklet/booklet.js")&&/add <script src="\/booklet\/booklet\.js" defer><\/script> to the layout/.test(C.reportText(siteOnly)));
const without=C.compile([{file:book}],{form:"both",engine:X,scriptDir:good});
chk("a page that needs no script links none, and booklet.js is not written",!/<script src/.test(pageOf(without,"standalone/how-tides-work/index.html"))&&![...without.assets.keys()].some(k=>k.endsWith(".js"))&&without.script===null);
chk("no parts at all: no link and no script, even when a page claims to need one",(()=>{const r=C.compile([{file:book}],{form:"standalone",engine:X,scriptDir:path.join(tmp,"none"),forceScript:true});return !/<script src/.test(pageOf(r,"standalone/how-tides-work/index.html"))&&![...r.assets.keys()].some(k=>k.endsWith(".js"));})());
let threw="";try{C.compile([{file:book}],{engine:X,scriptDir:mk("evil",{"10-a.js":part("document.cookie='a=b';")}),forceScript:true});}catch(e){threw=e.message;}
chk("a part with a banned word stops the build, naming the part and the line",/booklet\.js was not built, and nothing was written for it/.test(threw)&&/10-a\.js line 3/.test(threw),threw);

/* ---- writing: the stamp guard keeps a hand-tidied script, --force overwrites it ---- */
const out=path.join(tmp,"out");
let kept=C.write(C.compile([{file:book}],{form:"standalone",engine:X,scriptDir:good,forceScript:true}),out);
const jsPath=path.join(out,"booklet","booklet.js");
chk("the script is written to <out>/booklet/booklet.js",kept.length===0&&fs.existsSync(jsPath));
fs.appendFileSync(jsPath,"// tidied by hand\n");
kept=C.write(C.compile([{file:book}],{form:"standalone",engine:X,scriptDir:good,forceScript:true}),out);
chk("a script changed by hand is kept back",kept.some(k=>k.rel.endsWith("booklet.js")&&k.state==="changed")&&fs.readFileSync(jsPath,"utf8").endsWith("// tidied by hand\n"));
kept=C.write(C.compile([{file:book}],{form:"standalone",engine:X,scriptDir:good,forceScript:true}),out,{force:true});
chk("…and --force writes the compiler's own again",kept.length===0&&C.cssStampState(fs.readFileSync(jsPath,"utf8"))==="compiled");

console.log(fails?"\n"+fails+" FAILURES":"\ncompile script passed");process.exit(fails?1:0);
