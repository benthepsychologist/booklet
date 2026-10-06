// A footnote that names no source is a plain reference (0.11.7): the panel shows its text as it was given, with no
// quotation marks and no red line saying a source is not in the module; the hover preview and the print endnote say it the
// same way. A footnote read into a source and a quote shows both, as before, and a citation that names a source the module
// does not hold still shows the red line. Run: node test/plainref.test.js      (Needs node; nothing to install.)
require("./harness.js");
const fs=require("fs"),path=require("path");
const html=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
const mk0=global.document.createElement;
global.document.createElement=tag=>{const n=mk0(tag);
  n.addEventListener=function(type,fn){(this._on||(this._on={}))[type]=fn;};
  Object.defineProperty(n,"innerHTML",{get(){return this._html||"";},set(v){this._html=String(v);this.children=[];}});
  return n;};
const API={};
eval(src+`
;Object.assign(API,{render,parseFile,applyParsed,getPanel:()=>citePanelEl,getTip:()=>citeTipEl,getBook:()=>BOOK,setScreen:v=>{screen=v},
  fresh:()=>{STATE=emptyState();DRAFTS=emptyDrafts();BOOK=EMPTY_BOOKLET;screen="home";lang="en";}});`);
const A=API;
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const textOf=n=>n==null?"":typeof n==="string"?n:(n._text||"")+" "+(n.children||[]).map(textOf).join(" ");
const flat=n=>textOf(n).replace(/\s+/g," ").trim();
const findAll=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);(n.children||[]).forEach(k=>findAll(k,pred,out));}return out;};
const hasClass=(n,c)=>!!(n&&n.attrs&&typeof n.attrs.class==="string"&&n.attrs.class.split(/\s+/).includes(c));
const byClass=(c,root)=>findAll(root||global.document.getElementById("main"),n=>hasClass(n,c));
const FM='---\nbooklet: "0.11"\ntitle: T\nlang: en\n---\n\n';
const FILE=FM+`> [!module|m] M\n\n> [!activity|a] A\n\nA plain one.[^ref] A quoted one.[^q] A bare quote.[^bare] A missing one.[^gone]\n\n`
 +`[^ref]: Northfield Health reminder trial, internal report, 2024.\n\n`
 +`[^q]: *The Harbour Tide Atlas*, 2nd edition (2019), p. 12: "The tide rises and falls twice in each lunar day." Verified 2026-09-20.\n\n`
 +`[^bare]: "Only a quotation."\n\n> [!module|m end] End\n`;
A.fresh();
const r=A.parseFile(FILE);chk("the file reads",r.ok,JSON.stringify(r.unread));
A.applyParsed(r,"replace");
/* a citation that names a source the module does not hold, as a host's own data could carry one */
const holder=(A.getBook().modules||[]).find(m=>m.id==="m");
holder.citations=(holder.citations||[]).concat([{id:"gone",source:"nowhere",quote:"A line."}]);
A.setScreen("m/a");A.render();
const marks=byClass("rd-mark"),click=n=>n._on.click({target:n,currentTarget:n});
chk("four marks drawn",marks.length===4,String(marks.length));
const panel=()=>A.getPanel();
const open=i=>{click(marks[i]);return flat(panel());};
const t1=open(0);
chk("a plain reference: its words, as given",/Northfield Health reminder trial, internal report, 2024\./.test(t1),t1);
chk("no red line, no quotation marks",byClass("rd-bad",panel()).length===0&&!/not in this module|“|”/.test(t1)&&byClass("rd-q",panel()).length===0,t1);
chk("and no check mark, since nothing was checked",byClass("rd-badge",panel()).length===0);
const t2=open(1);
chk("a note read into a source and a quote shows the source, the page, the quote and the badge as before",
  /The Harbour Tide Atlas/.test(t2)&&/2nd edition \(2019\)/.test(t2)&&/Page 12/.test(t2)&&/rises and falls twice/.test(t2)&&/Verified/.test(t2)&&byClass("rd-bad",panel()).length===0&&byClass("rd-q",panel()).length===1,t2);
const t3=open(2);
chk("a note that is only a quotation is a plain reference too, shown as written",/"Only a quotation\."/.test(t3)&&byClass("rd-bad",panel()).length===0,t3);
const t4=open(3);
chk("a citation naming a source the module lacks still shows the red line",byClass("rd-bad",panel()).length===1&&/The source “nowhere” is not in this module/.test(t4),t4);
chk("and its quote",/A line\./.test(t4)&&byClass("rd-q",panel()).length===1);
/* the print endnotes */
const notes=flat(byClass("rd-notes")[0]);
chk("the endnote of a plain reference is its words, with no quotation marks around them",/Northfield Health reminder trial, internal report, 2024\./.test(notes)&&!/“Northfield/.test(notes),notes);
chk("the endnote of a quote still has them",/“The tide rises and falls twice in each lunar day\.”/.test(notes),notes);
console.log(fails?"\n"+fails+" FAILURES":"\nplainref checks passed");process.exit(fails?1:0);
