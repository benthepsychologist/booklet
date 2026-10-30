// The compiler's reading helpers (compile/script/reading-*.js, compile 0.2.0), checked by reading their source.
// test/compile-reading-browser.js is the check that they do what they say in Chromium; this is the check of what they may never do.
//   1. The parts are there and well made: five files, each one self-contained function called at once (an IIFE), in strict
//      mode, with nothing else outside it (no module, no global of its own), and each one parses.
//   2. The pledge, for these parts (the script's pledge is the compiler's: nothing stored, nothing sent): no localStorage,
//      sessionStorage, IndexedDB, cookie, cache, service worker, fetch, XHR, WebSocket, beacon, EventSource, worker, form
//      submission, no navigation by script, no address built to be loaded, and no script, image, frame or link element made.
//      The patterns are tried on made-up parts first, so a pattern that stops catching one fails here.
//   3. No markup from a booklet's text at run time: nothing builds HTML from a string (innerHTML, outerHTML, insertAdjacentHTML,
//      document.write, createContextualFragment, DOMParser, setHTML), nothing evaluates a string (eval, new Function, a string
//      for setTimeout), and no event handler is set as an attribute. Words the parts add are their own, set as text.
//   4. Every class a part adds has a rule in compile/booklet.css, and the stylesheet's print rules leave the bars and
//      switches off the print and show every tab.
// Run: node test/compile-reading.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,".."),DIR=path.join(ROOT,"compile","script");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};

const NAMES=["tabs","cites","folds","links","views"];
const files=fs.existsSync(DIR)?fs.readdirSync(DIR).filter(f=>/^reading-.*\.js$/.test(f)).sort():[];
chk("the five reading parts are in compile/script/ ("+NAMES.map(n=>"reading-"+n+".js").join(", ")+")",JSON.stringify(files)===JSON.stringify(NAMES.map(n=>"reading-"+n+".js").sort()),files.join(", "));
const src=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(DIR,f),"utf8")]));
const strip=t=>t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
const code=Object.fromEntries(files.map(f=>[f,strip(src[f])]));

/* ---- 1. one IIFE each ---- */
for(const f of files){
  const c=code[f].trim();
  chk(f+": one function, called at once, and nothing outside it",/^\(function \(\) \{\n  "use strict";\n/.test(c)&&/\n\}\)\(\);$/.test(c)&&(c.match(/^\(function/gm)||[]).length===1,c.slice(0,60));
  let parsed=true,err="";try{new vm.Script(src[f],{filename:f});}catch(e){parsed=false;err=e.message;}
  chk(f+": it parses",parsed,err);
  chk(f+": it opens with a comment saying what it does",/^\/\*[\s\S]+?\*\/\n\(function/.test(src[f]));
  /* no top-level name leaks: run it in an empty sandbox with a stand-in document and look at the globals it left */
  const sandbox={document:{readyState:"loading",addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},documentElement:{lang:"en"}},window:{addEventListener(){}}};
  sandbox.window.document=sandbox.document;
  const before=new Set(Object.keys(sandbox));
  let ran=true;try{vm.runInNewContext(src[f],sandbox);}catch(e){ran=false;err=e.message;}
  chk(f+": it runs on a page without a booklet and leaves no global behind",ran&&Object.keys(sandbox).every(k=>before.has(k)),err||Object.keys(sandbox).filter(k=>!before.has(k)).join(", "));
}

/* ---- 2 and 3. the pledge, and no markup from text ---- */
const BAN=[
  ["localStorage",/\blocalStorage\b/],["sessionStorage",/\bsessionStorage\b/],["IndexedDB",/\bindexedDB\b|\bIDB[A-Z]\w*/],["a cookie",/\.cookie\b|\bcookieStore\b/],
  ["the Cache API or a service worker",/\bcaches\b|\bserviceWorker\b|\bCacheStorage\b/],["fetch",/\bfetch\s*\(/],["XMLHttpRequest",/\bXMLHttpRequest\b/],
  ["WebSocket",/\bWebSocket\b/],["EventSource",/\bEventSource\b/],["a beacon",/\bsendBeacon\b/],["a worker",/\b(?:Shared)?Worker\b|\bimportScripts\b/],
  ["a dynamic import",/\bimport\s*\(|\bimport\.meta\b/],["a form submission",/\.submit\s*\(|\brequestSubmit\b|\bFormData\b/],
  ["navigation by script",/\blocation\s*(?:\.\s*(?:assign|replace|href|reload|pathname|search)\s*[(=]|\s*=[^=])|\bwindow\.open\b|\bhistory\.(?:push|replace)State\b/],
  ["a message to another window",/\bpostMessage\b|\bBroadcastChannel\b/],
  ["a script, image, frame, link, form or object element made",/createElement\(\s*["'`](?:script|img|image|iframe|frame|link|form|object|embed|audio|video|source|base|meta)["'`]/i],
  ["an Image or Audio made",/\bnew\s+(?:Image|Audio|Option\s*\(\s*\)\s*\.\s*src)\b/],
  ["a src or srcset set",/\.(?:src|srcset|data)\s*=[^=]|setAttribute\(\s*["'`](?:src|srcset|data|formaction|action|ping)["'`]/],
  ["markup built from a string (innerHTML, outerHTML, insertAdjacentHTML, document.write, createContextualFragment, DOMParser, setHTML)",/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write(?:ln)?\b|\bcreateContextualFragment\b|\bDOMParser\b|\bsetHTML\b/],
  ["a string evaluated (eval, new Function, a string for a timer)",/\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(|\bset(?:Timeout|Interval)\s*\(\s*["'`]/],
  ["an event handler set as an attribute or a property",/setAttribute\(\s*["'`]on|\.on(?:click|input|change|keydown|keyup|load|error|toggle|pointer\w*|focus\w*)\s*=/],
  ["a style attribute written as text",/setAttribute\(\s*["'`]style["'`]|\.cssText\b/]];
/* made-up parts, each breaking one rule: every one must be caught */
const BAD=['var x=localStorage.getItem("a");','sessionStorage.setItem("a","1");','indexedDB.open("a");','document.cookie="a=1";','navigator.serviceWorker.register("s.js");',
  'fetch("/a");','new XMLHttpRequest();','new WebSocket("wss://a");','navigator.sendBeacon("/a","b");','new Worker("a.js");','var f=document.createElement("form");f.submit();',
  'location.href="https://a.example/";','window.open("https://a.example/");','var s=document.createElement("script");','var i=new Image();i.src="a.png";','el.innerHTML="<b>"+t+"</b>";',
  'el.insertAdjacentHTML("beforeend",t);','document.write(t);','eval(t);','setTimeout("go()",10);','el.setAttribute("onclick","go()");','el.onclick=go;','history.pushState({}, "", "#a");',
  'el.setAttribute("style","color:red");','img.src="a.png";'];
const missed=BAD.filter(t=>!BAN.some(([,re])=>re.test(t)));
chk("the patterns catch every made-up part that breaks the pledge ("+BAD.length+")",!missed.length,missed.join("  |  "));
for(const [what,re] of BAN){const hits=files.filter(f=>re.test(code[f]));chk("no "+what+" in any reading part",!hits.length,hits.join(", "));}
/* the one thing they may write to the clipboard is a heading's own address, and they read nothing back */
chk("the clipboard is written once, in reading-links.js, and never read",files.every(f=>f==="reading-links.js"?(code[f].match(/clipboard\.writeText\(/g)||[]).length===1:!/clipboard/.test(code[f]))&&!files.some(f=>/clipboard\.read/.test(code[f])));
chk("the only timers are the parts' own functions (no string for setTimeout)",files.every(f=>!/set(?:Timeout|Interval)\s*\(\s*["'`]/.test(code[f])));
chk("a part that writes words writes them as text (textContent or a text node), never as markup",files.every(f=>!/\.(?:innerHTML|outerHTML)\b/.test(code[f]))&&/textContent/.test(code["reading-views.js"]||"")&&/textContent/.test(code["reading-tabs.js"]||""));
/* the hint of what was meant: nothing in a part reads or writes a record of the reader's */
chk("no part touches an answer, a draft, a kept entry or a record",files.every(f=>!/\b(?:answers?|drafts?|entries|records?)\b/i.test(code[f])));

/* ---- 4. the stylesheet has a rule for every class a part adds, and prints without the controls ---- */
const css=fs.readFileSync(path.join(ROOT,"compile","booklet.css"),"utf8");
const added=new Set();
for(const f of files) for(const m of code[f].matchAll(/["'`]([^"'`\n]*\bbk-[^"'`\n]*)["'`]/g)) for(const w of m[1].split(/\s+/)) if(/^bk-[a-z][a-z0-9-]*[a-z0-9]$/.test(w)) added.add(w); /* (a name ending in a dash is an id's start) */
/* class names a part reads (and the compiler writes) are checked by compile-css.test.js; those it adds must be styled */
const reads=new Set(["bk-tab","bk-anchor","bk-fold","bk-hint","bk-solution","bk-lede","bk-toc","bk-back","bk-mark-a","bk-activity","bk-copied"]);
const mine=[...added].filter(c=>!reads.has(c));
chk("every class a part adds ("+mine.join(", ")+") has a rule in booklet.css",mine.length>0&&mine.every(c=>new RegExp("\\."+c+"(?![\\w-])").test(css)),mine.filter(c=>!new RegExp("\\."+c+"(?![\\w-])").test(css)).join(", "));
chk("bk-copied has a rule too",/\.bk-anchor\.bk-copied\{/.test(css));
const printAt=css.indexOf("@media print{"),printBlock=css.slice(printAt,css.indexOf("\n}\n",printAt));
chk("print: the bars, the switches, the controls, the preview and the status words are left off",/\.bk-tabbar,\.bk-foldsw,\.bk-vctl,\.bk-peek,\.bk-said\)\{display:none!important\}/.test(printBlock));
chk("print: a tab the script hid is shown",/\.bk-tab\[hidden\]\{display:block!important\}/.test(printBlock));
chk("a hidden tab, preview and row stay hidden against the stylesheet's own display rules (a row, by a rule of one more id than the rest, since a view gives its rows a display of their own)",/\.bk-tab\[hidden\]\{display:none!important\}/.test(css)&&/\.bk-peek\[hidden\]\{display:none!important\}/.test(css)&&/\.booklet:not\(#bk\):not\(#bk\):not\(#bk\):not\(#bk\) \[data-bk-off\]\{display:none!important\}/.test(css));

console.log(fails?"\n"+fails+" FAILURES":"\ncompile reading parts passed");process.exit(fails?1:0);
