// Two carried over from item D's review (booklet #43), and fixed in item E:
//  1. A module that is one activity draws its opening before its page; both are numbered in ONE scope, begun before the head is
//     drawn. When both cite the same source, no two marks share an anchor id, and a language switch opens the panel again from
//     the mark it came from, in the opening as well as on the page.
//  2. On a module's own screen, a panel opened from the opening stays open through a language switch (it is opened again, in the
//     new language), as it does on an ordinary page.
// Run: node test/citeopen.test.js   (node only; nothing to install)
require("./harness.js");
const fs=require("fs"),path=require("path");
const html=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
const mk0=global.document.createElement;
global.document.createElement=tag=>{const n=mk0(tag);
  n.addEventListener=function(type,fn){(this._on||(this._on={}))[type]=fn;};
  n.focus=function(){global.__focused=this;};
  Object.defineProperty(n,"innerHTML",{get(){return this._html||"";},set(v){this._html=String(v);this.children=[];}});
  return n;};
const A={};
eval(src+`
;Object.assign(A,{render,parseFile,applyParsed,getPanel:()=>citePanelEl,setScreen:v=>{screen=v},getScreen:()=>screen,setLang:l=>{setLangPref(l)},getBook:()=>BOOK,
  fresh:()=>{STATE=emptyState();DRAFTS=emptyDrafts();BOOK=EMPTY_BOOKLET;screen="@home";lang="en";lsDel(LANG_PREF_KEY);}});`);
/* a language switch is the reader's choice (setLang), which every booklet follows */
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const findAll=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);(n.children||[]).forEach(k=>findAll(k,pred,out));}return out;};
const main=()=>global.document.getElementById("main");
const hasClass=(n,c)=>!!(n&&n.attrs&&typeof n.attrs.class==="string"&&n.attrs.class.split(/\s+/).includes(c));
const marks=()=>findAll(main(),n=>hasClass(n,"rd-mark"));
const click=n=>n._on.click({target:n,currentTarget:n});
const panelOpen=()=>!!A.getPanel()&&!A.getPanel().hasAttribute("hidden");
const flat=n=>n==null?"":typeof n==="string"?n:((n._text||"")+" "+(n._html||"").replace(/<[^>]*>/g," ")+" "+(n.children||[]).map(flat).join(" ")).replace(/\s+/g," ").trim();
const FM='---\nbooklet: "0.13"\ntitle: Cites\nlang: en\n---\n\n';
const NOTE='\n[^s1]: *The Harbour Tide Atlas*, p. 12: "Twice a day." Verified 2026-09-20.\n';
const ONE=FM+"> [!module|m] Tides\n\nThe opening says it first.[^s1]\n\n> [!activity|a] Tides\n\nThe activity says it again.[^s1]\n\nAnd a second time.[^s1]\n"+NOTE+"\n> [!module|m end] End\n";
const MANY=FM+"> [!module|m] Tides\n\nThe opening says it first.[^s1]\n\n> [!activity|a] First\n\nThe first activity.[^s1]\n\n> [!activity|b] Second\n\nThe second.\n"+NOTE+"\n> [!module|m end] End\n";
const open=(text,screen)=>{A.fresh();A.applyParsed(A.parseFile(text),"replace");A.setScreen(screen);A.render();};
const guard=(name,fn)=>{try{fn();}catch(e){chk(name+": runs to the end",false,e.stack);}};

guard("one-activity module",()=>{open(ONE,"m/a");
  const ids=()=>findAll(main(),n=>n.attrs&&/^rd-m-/.test(n.attrs.id||"")).map(n=>n.attrs.id);
  chk("the opening and the page cite the same source: three marks, one anchor, no id twice",marks().length===3&&ids().length===1&&new Set(ids()).size===ids().length,ids().join());
  chk("the three marks share one number (one scope)",marks().every(m=>flat(m)==="1"));
  A.render();
  chk("drawn again, still one anchor",ids().length===1,ids().join());
  click(marks()[0]);
  chk("a mark in the opening opens the panel",panelOpen()&&/Harbour Tide Atlas/.test(flat(A.getPanel())));
  A.setLang("fr");A.render();
  chk("a language switch opens it again, in French, from the same mark of the opening",panelOpen()&&/Référence 1/.test(flat(A.getPanel()))&&marks()[0].attrs["aria-expanded"]==="true"&&marks().filter(m=>m.attrs["aria-expanded"]==="true").length===1,flat(A.getPanel()).slice(0,80));
  A.setLang("en");A.render();
  click(marks()[2]);A.setLang("fr");A.render();
  chk("and from a mark of the page",panelOpen()&&marks()[2].attrs["aria-expanded"]==="true");});

guard("module screen",()=>{open(MANY,"module:m");
  chk("the module's screen draws the opening's mark",marks().length===1);
  click(marks()[0]);
  chk("a mark in the opening opens the panel",panelOpen());
  A.setLang("fr");A.render();
  chk("a language switch on the screen keeps it open, in French, from the same mark",panelOpen()&&/Référence 1/.test(flat(A.getPanel()))&&marks()[0].attrs["aria-expanded"]==="true",flat(A.getPanel()).slice(0,80));
  A.render();
  chk("a plain redraw of the screen closes it, as on any page",!panelOpen());
  click(marks()[0]);A.setScreen("m/a");A.render();
  chk("leaving the screen for a page closes it",!panelOpen());});

guard("ordinary page",()=>{open(MANY,"m/a");
  click(marks()[0]);A.setLang("en");A.setLang("fr");A.render();
  chk("on an ordinary page a language switch keeps the panel open",panelOpen()&&marks()[0].attrs["aria-expanded"]==="true");});

console.log(fails?`\n${fails} failed`:"\ncitation scope checks passed");
process.exit(fails?1:0);
