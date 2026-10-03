// Reading material in a v0.4 booklet: the citation marks in the prose, the
// panel a mark opens, the callout filter, the endnotes a printout carries, and
// the interface language switching under an open panel.
//
// examples/how-tides-work.booklet.md is the file under test: one reading
// activity with a footnote citation and a `diff` callout, then a check.
// Run: node test/polish.test.js   (node only; nothing to install)
require("./harness.js");            // the browser stubs the renderer's script needs
const fs=require("fs"),path=require("path");
const R=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(R,"booklet.html"),"utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
const EX=fs.readFileSync(path.join(R,"examples","how-tides-work.booklet.md"),"utf8");

/* Record every handler, which the harness's stub drops, so a test can press
   the way a reader would; keep what is written into innerHTML. */
const mk0=global.document.createElement;
global.document.createElement=tag=>{const n=mk0(tag);
  n.addEventListener=function(type,fn){(this._on||(this._on={}))[type]=fn;};
  n.focus=function(){global.__focused=this;if(this._on&&this._on.focus) this._on.focus({target:this});};
  Object.defineProperty(n,"innerHTML",{get(){return this._html||"";},
    set(v){this._html=String(v);this.children=[];}});
  return n;};

/* One page load: the renderer's one <script> evaluated afresh. */
function load(source){const API={};
  eval(source+`
;Object.assign(API,{render,parseFile,applyParsed,T,TSRC,showPage,currentPage,
  getPanel:()=>citePanelEl,getTPL:()=>TPL,getView:()=>view,setView:v=>{view=v},setLang:l=>{lang=l},
  fresh:()=>{S=emptyS();D=emptyD();TPL=EMPTY_BOOKLET;view="home";lang="en";}});`);
  return API;}
const A=load(src);

let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const textOf=n=>n==null?"":typeof n==="string"?n
  :(n._text||"")+" "+(n._html||"").replace(/<[^>]*>/g," ")+" "+(n.children||[]).map(textOf).join(" ");
const flat=n=>textOf(n).replace(/\s+/g," ").trim();
const findAll=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);
  (n.children||[]).forEach(k=>findAll(k,pred,out));}return out;};
const main=()=>global.document.getElementById("main");
const hasClass=(n,c)=>!!(n&&n.attrs&&typeof n.attrs.class==="string"&&n.attrs.class.split(/\s+/).includes(c));
const byClass=(c,root)=>findAll(root||main(),n=>hasClass(n,c));
const click=n=>{if(!n||!n._on||!n._on.click) throw new Error("nothing to click");return n._on.click({target:n,currentTarget:n});};
const pressKey=(n,k)=>n._on.keydown({key:k,target:n,currentTarget:n,preventDefault(){},stopPropagation(){}});
const root=()=>global.document.documentElement;
const panel=()=>A.getPanel();
const panelOpen=()=>!!panel()&&!panel().hasAttribute("hidden");
const marks=()=>byClass("rd-mark");
/* the booklet, loaded the way a reader loads it, on its reading activity */
function open(l){A.fresh();A.applyParsed(A.parseFile(EX),"replace");A.setLang(l||"en");A.setView("rd-tides");A.render();}
/* a part that cannot run on the renderer it is given counts as failed, and the
   rest still runs */
const guard=(name,fn)=>{try{fn();}catch(e){chk(name+": runs to the end",false,e.message);}};

console.log("# a citation mark in the prose, and the panel it opens");
guard("marks and panel",()=>{open();
  chk("the footnote's mark is drawn as a small numbered button in the text",marks().length===2&&flat(marks()[0])==="1",String(marks().length));
  chk("both places the citation is marked carry the same number",marks().every(m=>m.attrs["data-cite"]==="atlas-12"&&flat(m)==="1"));
  chk("nothing is open to begin with",!panelOpen()&&!("data-cite-open" in root().attrs));
  click(marks()[0]);
  const t=flat(panel());
  chk("a mark opens the panel, with the source, its edition, the page and the quote",
    panelOpen()&&/The Harbour Tide Atlas/.test(t)&&/2nd edition \(2019\)/.test(t)&&/Page 12/.test(t)&&/rises and falls twice/.test(t),t);
  chk("and the verified badge, with its date",/Verified/.test(t)&&/2026/.test(t),t);
  chk("while it is open the page says so, for the layout to make room",("data-cite-open" in root().attrs)&&marks()[0].attrs["aria-expanded"]==="true");
  click(findAll(panel(),n=>n.tagName==="button"&&hasClass(n,"rd-x"))[0]);
  chk("closing gives the room back",!panelOpen()&&!("data-cite-open" in root().attrs));
  click(marks()[1]);pressKey(panel(),"Escape");
  chk("Escape closes it and puts the focus on the mark it came from",!panelOpen()&&global.__focused===marks()[1]);
  click(marks()[0]);A.setView("rd-check");A.render();
  chk("leaving the activity closes the panel",!panelOpen()&&!("data-cite-open" in root().attrs));});

console.log("# the endnotes");
guard("notes",()=>{open();
  const notes=byClass("rd-notes")[0];
  chk("the page carries its citation as an endnote, for a printout",!!notes&&/The Harbour Tide Atlas/.test(flat(notes)),notes&&flat(notes));
  chk("a callout is drawn in full, with no filter row and no fold button",byClass("rd-callout").length>0&&byClass("rd-filter").length===0&&byClass("rd-cshow").length===0);
  A.setView("rd-check");A.render();
  chk("a page with no marks has no endnotes",byClass("rd-notes").length===0);});

console.log("# switching the interface language keeps the panel open, in the new language");
guard("a language switch",()=>{open("en");
  /* the file declares its one language, so the toggle would hold the page to it:
     let it offer the three the interface has */
  A.getTPL().languages=["en","fr","es"];
  click(marks()[1]);
  const langButton={tagName:"button",lang:true};global.__focused=langButton;
  A.setLang("fr");A.render();
  const t=flat(panel());
  chk("the panel stays open",panelOpen(),t.slice(0,120));
  chk("drawn again in French",/Référence 1/.test(t)&&/Vérifiée le/.test(t)&&!/Citation 1|Verified on/.test(t),t);
  chk("the focus stays where the reader put it",global.__focused===langButton);
  chk("and it belongs to the same mark, redrawn",marks()[1].attrs["aria-expanded"]==="true"&&marks().filter(m=>m.attrs["aria-expanded"]==="true").length===1);
  A.setLang("es");A.render();
  chk("and again into Spanish",panelOpen()&&/Cita 1/.test(flat(panel())),flat(panel()).slice(0,120));});

{const keys=["notThere","addThere","notHere","addHere","citeWhere"];
 chk("the reading strings the page uses are in English, French and neutral Spanish",
   ["en","fr","es"].every(l=>["mark","cite","close","verified","notes"].every(k=>A.TSRC[l].reading[k]!==undefined)));}

console.log(fails?`\n${fails} failed`:"\npolish checks passed");
process.exit(fails?1:0);
