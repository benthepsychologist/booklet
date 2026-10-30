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

/* every alternative of every banned pattern has a sample that only it catches: delete one and the sample escapes the scan */
const SAMPLES=["localStorage.clear();","sessionStorage.clear();","indexedDB.open('x');","var f=IDBFactory;","document.cookie='a';",
  "caches.open('x');","var c=CacheStorage;","navigator.serviceWorker.register('x');","new Worker('x');","new SharedWorker('x');",
  "fetch('/x');","new XMLHttpRequest();","new WebSocket('ws:x');","new EventSource('/e');","navigator.sendBeacon('/x');",
  "w.postMessage('x');","new BroadcastChannel('x');","new MessageChannel();","var i=new Image;","var i=Image(1);","f.submit();","new FormData();",
  "eval('1');","[].constructor('1');","var f=Function;","import/**/('./x.js');","importScripts('x');","setTimeout('x',1);","setInterval('x',1);",
  "el.innerHTML='x';","el.outerHTML='x';","el.insertAdjacentHTML('beforeend','x');","document.write('x');","new DOMParser();",
  "r.createContextualFragment('x');","f.srcdoc='x';","window['x'];","globalThis.x;","self['x'];","top['x'];","parent['x'];","document['x'];",
  "navigator['x'];","this['x'];","Reflect.get(a,'b');","var w=window;","var s=self;"];
{const alts=[];
  SC.BANNED.forEach(([why,re],ei)=>{let depth=0,cur="";const parts=[];
    for(let i=0;i<re.source.length;i++){const c=re.source[i];
      if(c==="\\"){cur+=c+re.source[++i];continue;}
      if(c==="("||c==="[") depth++;if(c===")"||c==="]") depth--;
      if(c==="|"&&depth===0){parts.push(cur);cur="";}else cur+=c;}
    parts.push(cur);parts.forEach(src=>alts.push({ei,src,re:new RegExp(src,re.flags)}));});
  chk("the banned patterns split into "+alts.length+" alternatives, each of which is tried below",alts.length>=40);
  for(const a of alts){
    const only=SAMPLES.filter(t=>a.re.test(t)&&!alts.some(b=>b!==a&&b.re.test(t)));
    chk("a sample catches only the banned alternative "+a.src,only.length>0);
    /* the scan with that one alternative removed lets its sample through */
    const without=SC.BANNED.map(([why,re],ei)=>[why,ei===a.ei?new RegExp(alts.filter(b=>b.ei===ei&&b!==a).map(b=>b.src).join("|")||"(?!)",re.flags):re]);
    chk("…and without it the scan lets that sample through",only.length>0&&!without.some(([w,re])=>re.test(only[0])),a.src);}}

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
const PLAIN='---\nbooklet: "0.17"\nid: t/plain\ntitle: Plain\nlang: en\n---\n\n# Plain\n\nA made-up page with no question.\n';
const without=C.compile([{text:PLAIN,name:"plain",dir:tmp}],{form:"both",engine:X,scriptDir:good});
chk("a page that needs no script links none, and booklet.js is not written",!/<script src/.test(pageOf(without,"standalone/plain/index.html"))&&![...without.assets.keys()].some(k=>k.endsWith(".js"))&&without.script===null);
const real=C.compile([{file:book}],{form:"standalone",engine:X,scriptDir:good});
/* how-tides-work is a contents page and a page per activity: the page with the graded question links the script, one folder deeper, and the contents page has nothing that needs it */
chk("a page with a graded question asks for the script on its own (no forcing), as the page one folder down reaches it; the contents page links none",
  /<script src="\.\.\/\.\.\/booklet\/booklet\.js" defer><\/script>/.test(pageOf(real,"how-tides-work/rd-check/index.html"))&&!/<script src/.test(pageOf(real,"how-tides-work/index.html")));
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


/* ---- the page without its stylesheet: nothing that only a press shows is shown ---- */
{const QUIZ=path.join(ROOT,"test","fixtures","compile-quiz.booklet.md");
  const run=C.compile([{file:QUIZ}],{form:"standalone",engine:X,scriptDir:good}),page=String(run.results[0].files.get("compile-quiz/index.html"));
  const TOKENS=["bk-verdict","bk-reply","bk-say","bk-say-ok","bk-say-no","bk-shows","bk-acts"];
  const tags=[...page.matchAll(/<(?:span|p)\b[^>]*\bclass="([^"]*)"[^>]*>/g)].filter(m=>m[1].split(/\s+/).some(c=>TOKENS.includes(c)));
  chk("the page writes each verdict, reply, verdict sentence, widget note and Check with the hidden attribute (the verdict-sentence paragraph too; "+tags.length+" of them)",tags.length>=20&&tags.every(m=>/\shidden[\s>]/.test(m[0])),tags.filter(m=>!/\shidden[\s>]/.test(m[0])).map(m=>m[0].slice(0,80)).join(" | "));
  chk("the Check box sits after the options, inside the hidden paragraph, and its label is hidden from the accessibility tree (one name)",
    /<\/ul>\s*<p class="bk-acts" hidden><input type="checkbox" class="bk-check" id="[^"]+" autocomplete="off"><label class="bk-check-btn" for="[^"]+" aria-hidden="true">Check<\/label><\/p>/.test(page)&&!/<input[^>]*class="bk-check"[^>]*>\s*<p class="bk-q-ask"/.test(page)&&(page.match(/class="bk-check"/g)||[]).length===1);
  const rep=C.reportText(run);
  chk("the report names a page that carries an answer key in its markup",/Answer key: this page carries its answer key in its markup/.test(rep));
  chk("…and says nothing of the kind for a page with none",!/Answer key:/.test(C.reportText(C.compile([{text:PLAIN,name:"plain",dir:tmp}],{form:"standalone",engine:X,scriptDir:good}))));
  chk("a question with no words of its own is still named for a screen reader",/<fieldset[^>]*data-bk-kind="(?:choice|multi)"[^>]*aria-label="[^"]+"/.test(String(C.compile([{text:'---\nbooklet: "0.17"\nid: t/nolabel\ntitle: No label\nlang: en\n---\n\n> [!module|m] No label\n\n> [!activity|a] A\n\n> [!choice|pick] \n- [ ] One\n- [x] Two\n\n> [!module|m end] End\n',name:"nolabel",dir:tmp}],{form:"standalone",engine:X,scriptDir:good}).results[0].files.get("nolabel/index.html"))));
  /* ids and radio names are the page's own, and a label follows its input when a heading takes the id first */
  const HEADS=["bk-ids-q1-o1","bk-ids-q1-ask","bk-top","bk-ids-q1-check","bk-ids-w1"];
  const text='---\nbooklet: "0.17"\nid: t/ids\ntitle: Ids\nlang: en\n---\n\n> [!module|m] Ids\n\n> [!activity|a] A\n\n'+HEADS.map(h=>"## "+h+"\n\nText.\n").join("\n")
    +'\n> [!multi|p] Pick the right ones\n- [x] One\n- [ ] Two\n\n> [!choice|c] Pick one\n- [x] Yes\n- [ ] No\n\n> [!module|m end] End\n';
  const pg=String(C.compile([{text,name:"ids",dir:tmp}],{form:"standalone",engine:X,scriptDir:good}).results[0].files.get("ids/index.html"));
  const ids=[...pg.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  chk("no id is used twice on a page whose headings are named like the inputs' ids",new Set(ids).size===ids.length,ids.filter((x,i)=>ids.indexOf(x)!==i).join(", "));
  const fors=[...pg.matchAll(/<label\b[^>]*\sfor="([^"]+)"/g)].map(m=>m[1]);
  chk("every label points at an input that exists, and each input has one label ("+fors.length+")",fors.length>=5&&fors.every(f=>new RegExp('<input\\b[^>]*\\sid="'+f.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+'"').test(pg))&&new Set(fors).size===fors.length);
  const lab=[...pg.matchAll(/<fieldset\b[^>]*aria-labelledby="([^"]+)"/g)].map(m=>m[1]);
  chk("every fieldset's aria-labelledby names its own ask line",lab.length===2&&lab.every(l=>pg.split('id="'+l+'"').length===2&&new RegExp('<p class="bk-q-ask" id="'+l+'">').test(pg)));
  const other=String(C.compile([{text:text.replace("id: t/ids","id: t/other"),name:"other",dir:tmp}],{form:"standalone",engine:X,scriptDir:good}).results[0].files.get("other/index.html"));
  const idsOther=[...other.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]).filter(i=>/^bk-other-/.test(i));
  chk("two booklets' inputs and radio names never share an id or a name, so fragments can share a host page",idsOther.length>=6&&!idsOther.some(i=>ids.includes(i))&&!(pg.match(/name="bk-[^"]+"/g)||[]).some(n=>other.includes(n)));}

/* ---- the rule: a page links booklet.js only when something on it is a thing the script acts on (compile/draw.js, needsScript) ----
   Five things ask for it: (a) a tab bar, (b) a citation mark, (c) a fold the author made, (d) a sortable data view, (e) a graded
   question. Each is tried on a page that has it and, beside it, a page that has everything but it. A heading's share link,
   a hint and a solution, a line chart and a one-row table ask for nothing. */
{const D=require("../compile/draw.js"),H=require("../compile/html.js");
  const HEADER='---\nbooklet: "0.17"\nid: t/need\ntitle: Need\nlang: en\n---\n\n';
  const page=(body,name)=>{const r=C.compile([{text:HEADER+"# Need\n\n"+body,name:name||"need",dir:tmp}],{form:"standalone",engine:X,scriptDir:good});
    const html=String(r.results[0].files.get((name||"need")+"/index.html"));
    return {html,links:/<script src="\.\.\/booklet\/booklet\.js" defer><\/script>/.test(html),rep:r.results[0].rep,run:r};};
  const data=(as,rows,extra)=>"```booklet query\nfrom: d\nas: "+as+"\nlabel: what\n"+(extra||"")+"```\n\n```booklet data\n{ \"rows\": [\n"+rows.map(x=>"  { \"what\": \""+x[0]+"\", \"n\": "+x[1]+" }").join(",\n")+" ] }\n```\n^d\n\n";
  const two=[["Plums",3],["Pears",5]],five=[["Mon",2],["Tue",4],["Wed",3],["Thu",6],["Fri",5]];
  let nn=0;const T=(name,body,yes)=>{const p=page(body,"n"+(++nn));
    chk("("+name+") "+(yes?"links booklet.js":"links no script, and the page still holds its words"),p.links===yes&&p.rep.needsScript===yes&&(yes?p.run.script!==null:p.run.script===null),p.links+"/"+p.rep.needsScript);return p;};
  /* (a) a tab bar */
  const TABS="> [!activity|t] Two tabs\n\n> [!tab] First\n\nThe first tab's words.\n\n> [!tab] Second\n\nThe second tab's words.\n";
  const tabs=T("a: two tabs",TABS,true);
  const one=T("a: one tab",TABS.slice(0,TABS.indexOf("> [!tab] Second")),false);
  chk("(a) …without the script every tab stays on the page, under its name",/The first tab's words/.test(tabs.html)&&/The second tab's words/.test(tabs.html)&&(tabs.html.match(/<section class="bk-tab"/g)||[]).length===2&&!/\shidden[\s>]/.test(tabs.html));
  /* (b) a citation mark */
  T("b: a citation mark","A claim with a note.[^pe]\n\n[^pe]: *A Made-up Source*, 2nd edition (2001), p. 3.\n",true);
  T("b: a note's words, no mark","A claim with no note on it.\n",false);
  /* (c) an author's fold, but not a hint or a solution */
  T("c: an author's fold","> [!note]- Folded away\n> Words inside the fold.\n",true);
  const hs=T("c: a hint and a solution only","> [!choice|shape] Which shape?\n- [ ] Diamond\n- [ ] Box\n\n> [!hint]- Hint\n> Count the corners.\n\n> [!solution]- Solution\n> A diamond has four.\n",false);
  chk("(c) …the hint and the solution are plain details that open by pressing them",/<details class="bk-fold bk-compact bk-hint">/.test(hs.html)&&/<details class="bk-fold bk-compact bk-solution">/.test(hs.html));
  /* (d) a data view other than a line chart, with two rows or more */
  T("d: a table of two rows",data("table",two),true);
  T("d: a bars chart of two rows",data("bars",two,"value: n\n"),true);
  T("d: a table of one row",data("table",two.slice(0,1)),false);
  T("d: a line chart of five rows",data("line",five,"fields: n\n"),false);
  /* (e) a graded question */
  T("e: a graded question","> [!choice|pick] Which is right?\n- [x] This one\n- [ ] Not this one\n",true);
  T("e: a question with no right answer","> [!choice|pick] Which do you like?\n- [ ] This one\n- [ ] That one\n",false);
  /* nothing on the page asks for it: headings with their share links, prose, a list */
  const share=T("none: headings with share links only","Some words.\n\n## A section\n\nWords in it.\n\n### A part of it\n\nMore words.\n\n- one\n- two\n",false);
  chk("(none) …and the share links are there (they never ask for the script)",(share.html.match(/<a class="bk-anchor"/g)||[]).length===2);
  /* the rule on trees, where a page is awkward to make: siblings, a lone tab, a tab inside a fold, a line chart, a hint */
  const el=H.el,tab=t=>el("section",{class:"bk-tab"},el("h3",{},t)),art=(...k)=>el("article",{},...k);
  const tn=(name,node,yes)=>chk("(tree) "+name,D.needsScript(node)===yes);
  tn("two tab sections side by side ask",art(el("div",{},tab("A"),tab("B"))),true);
  tn("two tab sections with a comment and a fragment between them still ask",art(el("div",{},tab("A"),H.comment("x"),H.frag(tab("B")))),true);
  tn("two tab sections that are not siblings do not ask",art(el("div",{},tab("A")),el("div",{},tab("B"))),false);
  tn("two tab sections with another element between them do not ask",art(el("div",{},tab("A"),el("p",{},"x"),tab("B"))),false);
  tn("a heading's share link does not ask",art(el("h2",{id:"s"},"S ",el("a",{class:"bk-anchor",href:"#s"},"#"))),false);
  tn("a line chart of ten rows does not ask",art(el("div",{"data-bk-view":"line"},...[1,2,3,4,5,6,7,8,9,10].map(n=>el("li",{"data-bk-row":true},el("span",{"data-bk-col":"a"},String(n)))))),false);
  tn("a list view of two rows with values asks",art(el("ul",{"data-bk-view":"list"},...[1,2].map(n=>el("li",{"data-bk-row":true},el("span",{"data-bk-col":"a"},String(n)))))),true);
  tn("a view of two rows with no value does not ask (the script leaves it alone)",art(el("ul",{"data-bk-view":"list"},el("li",{"data-bk-row":true}),el("li",{"data-bk-row":true}))),false);
  tn("a hint and a solution do not ask",art(el("details",{class:"bk-fold bk-compact bk-hint"}),el("details",{class:"bk-fold bk-compact bk-solution"})),false);
  tn("a fold an author made asks, however deep it sits",art(el("div",{},el("div",{},el("details",{class:"bk-fold bk-plain"})))),true);
  tn("a details that is not a fold (a chart's table of numbers) does not ask",art(el("details",{class:"bk-ch-nums"})),false);
  tn("an ungraded question does not ask, a graded one does",art(el("fieldset",{class:"bk-q"})),false);
  tn("…a graded question",art(el("fieldset",{class:"bk-q","data-bk-graded":true})),true);
}

console.log(fails?"\n"+fails+" FAILURES":"\ncompile script passed");process.exit(fails?1:0);
