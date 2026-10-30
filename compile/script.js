"use strict";
/* compile/script.js: the assembler for booklet.js, the one optional script a compiled page may link.

   The page reads fully with no script. A part of the page that responds when it is pressed (a quiz answer, a widget, a
   sort) is written as one small file in compile/script/, and this file puts them together:
     - every file in compile/script/ ending .js is one part, one IIFE (an immediately called function: its names are its
       own), and the parts are joined in file-name order (so 10-quiz.js comes before 20-widgets.js); no modules, no imports;
     - the joined text is scanned (below) and the build fails when it holds a word that could keep something, send
       something, or turn a booklet's words into markup at run time;
     - the result is written beside booklet.css as booklet.js, with the stamp the stylesheet has, and a page links it
       with <script src="…/booklet.js" defer> only when something on that page needs it.
   A host that never loads it still gets every page readable. A part must also work on a page that holds none of its
   markup, and beside other parts.

   THE RULES FOR A PART (the scan holds a part to rules 1, 2 and 4 and to the banned routes of rule 3; the browser test holds the
   page to all of them):
     1. Nothing is kept: no localStorage, sessionStorage, IndexedDB, cookie or cache. What a reader presses lives in the
        open page and is gone on reload.
     2. Nothing is sent: no fetch, XMLHttpRequest, WebSocket, EventSource, beacon, worker, image or form that makes a
        request, no postMessage.
     3. A booklet's words never become markup or code at run time. The scan bans the ways a string becomes markup or code:
        innerHTML, outerHTML, insertAdjacentHTML, document.write, DOMParser, createContextualFragment, srcdoc, eval,
        Function (and .constructor), a timer given text, import. What a part may add is text it sets with textContent (a
        verdict sentence or a label the compiler already wrote, or a fixed word of its own such as "Open all" or "Link
        copied"), or a copy of nodes the compiler already wrote (cloneNode, as the citation preview does), and it changes
        the page with a class, a hidden attribute or an attribute the part itself names. The scan cannot see whether a
        part keeps to textContent and copies, only that it has no route to markup from a string: that is the browser
        test's and the reviewer's to check.
     4. A part does not reach for a global by a computed name or an alias: no window[…], document[…], navigator[…],
        this[…], globalThis, self[…], Reflect, no `x=window` (a name built from pieces would get round every word in this
        list).
     5. A part only looks at markup it knows by its own class or data-bk- name, and changes nothing outside it.
   The scan is a tripwire, not the proof: it cannot see a name built from pieces by a part that got past rule 4. The proof
   is test/compile-script-browser.js, which answers every question kind on a real page and then looks for anything kept
   or sent. The words below are therefore banned everywhere in a part, comments included, so a part cannot talk its way
   round the scan; these rules live here, in a file that is not scanned. */
const fs=require("fs"),path=require("path"),vm=require("vm");

const DIR=path.join(__dirname,"script");

/* BANNED
   [what it could do, the pattern]. Case-insensitive where a name has more than one spelling. This region names the very
   words the guard (test/compile-guard.test.js) forbids elsewhere under compile/, as patterns and nothing else; the guard cuts
   it out of the words it looks for, and checks that it holds patterns and no call. */
const BANNED=[
  ["keep something (localStorage)",/localStorage/],
  ["keep something (sessionStorage)",/sessionStorage/],
  ["keep something (indexedDB)",/indexeddb|\bIDB[A-Z]/i],
  ["keep something (a cookie)",/cookie/i],
  ["keep something (the cache API)",/\bcaches\b|CacheStorage|serviceWorker|\bWorker\b|SharedWorker/],
  ["send something (fetch)",/\bfetch\b/],
  ["send something (XMLHttpRequest)",/XMLHttpRequest/],
  ["send something (WebSocket)",/WebSocket/],
  ["send something (EventSource)",/EventSource/],
  ["send something (a beacon)",/sendBeacon/],
  ["send something (postMessage or a channel)",/postMessage|BroadcastChannel|MessageChannel/],
  ["send something (an image or a form made at run time)",/\bnew\s+Image\b|\bImage\s*\(|\.submit\s*\(|\bFormData\b/],
  ["run text as code (eval)",/\beval\b/],
  ["run text as code (Function)",/\bFunction\b|\bconstructor\b/],
  ["load code (import)",/\bimport\b|\bimportScripts\b/],
  ["run text as code (a timer given text)",/\b(?:setTimeout|setInterval)\s*\(\s*["'`]/],
  ["write markup (innerHTML)",/innerHTML/],
  ["write markup (outerHTML)",/outerHTML/],
  ["write markup (insertAdjacentHTML)",/insertAdjacentHTML/],
  ["write markup (document.write)",/document\s*\.\s*write/],
  ["write markup (a parser or fragment)",/DOMParser|createContextualFragment|\bsrcdoc\b/],
  ["reach a global by a computed name",/\bwindow\s*\[|\bglobalThis\b|\bself\s*\[|\btop\s*\[|\bparent\s*\[/],
  ["reach a global by a computed name (document, navigator or this)",/\bdocument\s*\[|\bnavigator\s*\[|\bthis\s*\[/],
  ["reach a global by reflection",/\bReflect\b/],
  ["alias the window (a name for it could be indexed)",/=\s*(?:window|self)\b/]];
/* /BANNED */

/* the scan: what, if anything, the text holds that no part may; [] for a clean text. A hit names the line and the rule, and
   never quotes more than the matched word. */
function scan(text){const found=[];
  String(text).split("\n").forEach((line,i)=>{
    for(const [why,re] of BANNED){const m=re.exec(line);if(m) found.push({line:i+1,word:m[0],why});}});
  return found;}

/* a part is one IIFE: after any leading comments it opens a function and calls it at once, and it is nothing else */
function shape(text){
  let t=text.replace(/^﻿/,"");
  for(;;){const before=t;t=t.replace(/^\s+/,"").replace(/^\/\*[\s\S]*?\*\//,"").replace(/^\/\/[^\n]*/,"");if(t===before) break;}
  if(!(/^\(\s*function\b|^\(\s*(?:async\s*)?\(\s*\)\s*=>/.test(t))) return "it does not open with an immediately called function, (function(){ … })();";
  if(!(/\}\s*\)\s*\(\s*\)\s*;?\s*$/.test(t)||/\}\s*\(\s*\)\s*\)\s*;?\s*$/.test(t))) return "it does not end with the call of that function, })();";
  return "";}

/* assemble(dir): {text, parts: [names]} for the parts in dir, or null when there are none. Throws, naming the part and the
   line, when a part is not one IIFE, is not valid script, or holds a word the scan bans. Nothing here runs a part. */
function assemble(dir){
  dir=dir||DIR;
  if(!fs.existsSync(dir)) return null;
  const names=fs.readdirSync(dir).filter(f=>f.endsWith(".js")).sort();
  if(!names.length) return null;
  const problems=[],bodies=[];
  for(const n of names){const text=fs.readFileSync(path.join(dir,n),"utf8").replace(/\r\n?/g,"\n").replace(/^﻿/,"");
    const bad=shape(text);if(bad) problems.push(n+": "+bad);
    try{new vm.Script(text,{filename:n});}catch(e){problems.push(n+": it is not valid script ("+(e&&e.name||"error")+")");}
    for(const f of scan(text)) problems.push(n+" line "+f.line+": "+f.why+" is not allowed in a part");
    bodies.push(text.replace(/\s+$/,""));}
  if(problems.length) throw new Error("booklet.js was not built, and nothing was written for it:\n  - "+problems.join("\n  - "));
  const out="/* booklet.js: the optional script of a compiled page. It keeps nothing and sends nothing: what a reader presses lives in the open page and is gone on reload. Parts: "+names.join(", ")+". */\n"+bodies.join("\n\n")+"\n";
  /* the joined text is scanned once more as it will be written: the header and the joins add nothing, and this is the file a host serves */
  const again=scan(out);
  if(again.length) throw new Error("booklet.js was not built, and nothing was written for it:\n  - the joined script holds "+again[0].why);
  return {text:out,parts:names};}

module.exports={assemble,scan,shape,BANNED,DIR};
