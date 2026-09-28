// Reading material inside an activity: citation marks `[^id]` that number
// themselves and open a side panel, three kinds of callout with a filter row,
// a sources block that leads back to each mark, and endnotes for print. The
// registries (`sources`, `citations`) belong to the module, which travels whole.
// Fixture: test/fixtures/module-reading.md (a made-up topic; example.org only).
// Run: node test/reading.test.js   (node and python3; nothing to install)
require("./harness.js");            // the browser stubs the renderer's script needs
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(R,"booklet.html"),"utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];

/* Record every handler, which the harness's stub drops, so a test can press,
   hover and key the way a reader would; and record what takes the focus. */
const mk0=global.document.createElement;
global.document.createElement=tag=>{const n=mk0(tag);
  n.addEventListener=function(type,fn){(this._on||(this._on={}))[type]=fn;};
  n.focus=function(){global.__focused=this;};
  Object.defineProperty(n,"innerHTML",{get(){return this._html||"";},
    set(v){this._html=String(v);this.children=[];}});
  return n;};

/* One page load: the renderer's one <script> evaluated afresh. */
function load(source){const API={};
  eval(source+`
;Object.assign(API,{moduleFromText,addModule,parseFile,applyParsed,toMarkdown,saveLocal,readLib,openBooklet,
  render,editTemplate,modeOf,pagesOf,currentPage,showPage,blankBlock,BLOCK_KINDS,blockLines,FORMAT_BLOCK,
  T,TSRC,langParity,leafPaths,keysOf,citeScope,citeGoto,registries,
  getPanel:()=>citePanelEl,getTip:()=>citeTipEl,filterOf:id=>READ_FILTER[pageNowKey(id)],
  setEditing:v=>{editing=v},getView:()=>view,setView:v=>{view=v},getS:()=>S,getTPL:()=>TPL,
  setLang:l=>{lang=l},getLang:()=>lang,
  fresh:()=>{S=emptyS();D={today:emptyToday(),checkin:emptyCheckin()};TPL=EMPTY_BOOKLET;
    view="home";editing=false;lang="en";for(const k of Object.keys(READ_FILTER)) delete READ_FILTER[k];}});`);
  return API;}
const A=load(src);

let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const fixture=n=>fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8");
const clone=o=>JSON.parse(JSON.stringify(o));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const moduleBlocks=md=>[...md.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]
  .map(m=>{try{return JSON.parse(m[1]);}catch(e){return null;}}).filter(o=>o&&o.block==="module");
const strip=({block,...m})=>m;
const textOf=n=>n==null?"":typeof n==="string"?n
  :(n._text||"")+" "+(n._html||"").replace(/<[^>]*>/g," ")+" "+(n.children||[]).map(textOf).join(" ");
const flat=n=>textOf(n).replace(/\s+/g," ").trim();
const findAll=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);
  (n.children||[]).forEach(k=>findAll(k,pred,out));}return out;};
const main=()=>global.document.getElementById("main");
const hasClass=(n,c)=>!!(n&&n.attrs&&typeof n.attrs.class==="string"&&n.attrs.class.split(/\s+/).includes(c));
const byClass=(c,root)=>findAll(root||main(),n=>hasClass(n,c));
const click=n=>{if(!n||!n._on||!n._on.click) throw new Error("nothing to click");return n._on.click({target:n,currentTarget:n});};
const key=(n,k)=>n._on.keydown({key:k,target:n,currentTarget:n,preventDefault(){},stopPropagation(){}});
const buttonIn=(root,label)=>findAll(root,n=>n.tagName==="button"&&flat(n)===label)[0];
const marks=()=>byClass("rd-mark");
const markOf=id=>marks().find(b=>b.attrs["data-cite"]===id);
const calloutOf=k=>byClass("rd-callout").find(c=>c.attrs["data-kind"]===k);
const bodyOf=c=>byClass("rd-cb",c)[0];
const showOf=c=>byClass("rd-cshow",c)[0];
const pill=k=>byClass("rd-filter")[0]&&findAll(byClass("rd-filter")[0],n=>n.tagName==="button"&&n.attrs["data-kind"]===k)[0];
const panel=()=>A.getPanel();
const isOpen=()=>!!panel()&&!panel().hasAttribute("hidden");
const fieldFor=(root,label)=>{const l=findAll(root,n=>n.tagName==="label"&&flat(n)===label)[0];
  return l&&findAll(root,n=>n.attrs&&n.attrs.id===l.attrs.for&&n!==l)[0];};
const lint=(...args)=>spawnSync("python3",[path.join(R,"lint-booklet.py"),...args],{encoding:"utf8"});
const brief=r=>r.stdout.split("\n").filter(l=>/^ERROR|^warn|checked/.test(l)).join(" / ");

const FX="module-reading.md";
const fx=strip(moduleBlocks(fixture(FX))[0]);
const ACT="rd-tides";
const stored=()=>A.getTPL().modules.find(m=>m.id===fx.id);
/* which page is showing outlives a fresh booklet in one page load, as it would
   for a reader, so every opening says which page it wants */
const open=(mod,page)=>{A.fresh();A.addModule(clone(mod||fx));A.setView(ACT);A.setEditing(false);
  A.showPage(ACT,page||"read");A.render();};
/* a variant of the fixture, as a module file on disk, for the linter */
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"rd-"));
const variantFile=(name,fn)=>{const m=clone(fx);fn(m);const p=path.join(tmp,name+".md");
  fs.writeFileSync(p,fixture(FX).replace(/```json\n[\s\S]*?\n```/,"```json\n"+JSON.stringify({block:"module",...m},null,1)+"\n```"));return p;};
const readPage=m=>m.mode.pages[0].blocks;

// ---- the fixture, and the shape
console.log("# the shape");
{const m=A.moduleFromText(fixture(FX));
 chk("the reading fixture reads as a module",!!m&&m.id===fx.id);
 chk("it is added like any module",(A.fresh(),A.addModule(clone(fx)))===true);
 chk("its registries are the module's own: sources and citations",
   Array.isArray(stored().sources)&&stored().sources.length===4&&Array.isArray(stored().citations)&&stored().citations.length===5);
 chk("callout and sources are block kinds the editor offers",A.BLOCK_KINDS.includes("callout")&&A.BLOCK_KINDS.includes("sources"));
 chk("both only read: they own no answer field",A.keysOf(A.blankBlock("callout")).length===0&&A.keysOf(A.blankBlock("sources")).length===0);
 const ok=lint(path.join(__dirname,"fixtures",FX));
 chk("lint accepts the fixture",ok.status===0&&/0 errors · 0 warnings/.test(ok.stdout),brief(ok));}

// ---- marks: small numbered superscripts, numbered by first appearance
console.log("# citation marks");
open();
{const seq=marks().map(b=>b.attrs["data-cite"]+"="+flat(b)).join(" ");
 chk("marks number in order of first appearance, not in the registry's order",
   seq==="atlas-twice=1 atlas-spring=2 notes-neap=3 atlas-twice=1 atlas-spring=2 act-s12=4 atlas-spring=2 notes-neap=3 marsh-moor=5",seq);
 chk("a citation marked again keeps its number",marks().filter(b=>b.attrs["data-cite"]==="atlas-spring").every(b=>flat(b)==="2"));
 const m1=markOf("atlas-twice");
 chk("a mark is a real button inside a superscript",m1.tagName==="button"&&m1.attrs.type==="button"
   &&findAll(main(),n=>n.tagName==="sup"&&hasClass(n,"rd-sup")&&n.children[0]===m1).length===1);
 chk("with an accessible name, and it says it opens a dialog",
   m1.attrs["aria-label"]==="Citation 1"&&m1.attrs["aria-haspopup"]==="dialog"&&m1.attrs["aria-controls"]==="rd-panel"&&m1.attrs["aria-expanded"]==="false");
 chk("only the first mark of a citation carries its anchor id",
   marks().filter(b=>b.attrs.id).map(b=>b.attrs.id).join()==="rd-m-1,rd-m-2,rd-m-3,rd-m-4,rd-m-5");
 const p1=findAll(main(),n=>n.tagName==="p"&&/Most harbours/.test(flat(n)))[0];
 const plain=n=>typeof n==="string"?n:(n.children||[]).map(plain).join("");
 chk("the text around a mark is kept as written",!!p1&&plain(p1)==="Most harbours on this coast see two high tides and two low tides each lunar day.1 The moon's pull, and the earth turning beneath it, make the pattern.",p1&&plain(p1));
 const glue=byClass("rd-glue",p1)[0];
 chk("a mark is held to the word before it, so a line never starts with the number",
   !!glue&&glue.children[0]==="day."&&glue.children[1].tagName==="sup"&&/\.rd-glue\{white-space:nowrap\}/.test(html));
 {const P=load(src);P.fresh();const m=clone(fx);readPage(m)[1].text.en="Twice a day.[^atlas-twice][^atlas-spring] And after a space [^notes-neap].";
  P.addModule(m);P.setView(ACT);P.showPage(ACT,"read");P.render();
  const g=byClass("rd-glue",findAll(main(),n=>n.tagName==="p"&&/Twice a day/.test(flat(n)))[0]);
  chk("two marks together stay together with their word; a mark after a space holds only itself",
    g.length===2&&g[0].children.length===3&&g[0].children[0]==="day."&&g[1].children.length===1,g.map(x=>x.children.length).join());}
 chk("marks work in prose, a quote, a deflist and callouts",
   ["p1","q1"].length&&findAll(main(),n=>n.tagName==="blockquote"&&byClass("rd-mark",n).length===1).length===1
   &&byClass("dim").every(d=>byClass("rd-mark",d).length===1)&&byClass("rd-callout").every(c=>byClass("rd-mark",c).length===1));
 chk("the page keeps nothing but the numbers: no raw [^id] is left on screen",!/\[\^/.test(textOf(main())));
 chk("the panel is made once, hidden, as a non-modal dialog named by its heading",
   !!panel()&&panel().attrs.role==="dialog"&&panel().attrs["aria-modal"]==="false"
   &&panel().attrs["aria-labelledby"]==="rd-panel-h"&&panel().hasAttribute("hidden")&&panel().attrs.id==="rd-panel");}
{const P=load(src);P.fresh();P.addModule(clone(fx));P.setView(ACT);P.showPage(ACT,"sources");P.render();
 const R=P.citeScope(ACT);
 chk("numbering runs across the activity's pages, so a page turn does not renumber",R.nums.get("marsh-moor")===5&&R.firstPage.get("marsh-moor")==="read");}

// ---- the panel
console.log("# the side panel");
open();
{const m1=markOf("atlas-twice");global.__focused=null;click(m1);
 const p=panel(),t=flat(p);
 chk("pressing a mark opens the panel, not another page",isOpen()&&A.getView()===ACT);
 chk("its heading names the citation and takes the focus",
   findAll(p,n=>n.attrs&&n.attrs.id==="rd-panel-h")[0]===global.__focused&&flat(global.__focused)==="Citation 1");
 chk("the mark says it is expanded",m1.attrs["aria-expanded"]==="true");
 chk("it shows the source's full title and edition",/The Harbour Tide Atlas , 2nd edition, 2019/.test(t),t);
 chk("and what kind of source it is",/Primary source/.test(t));
 chk("the printed page, and the PDF page when it differs",/Page 12 \(page 18 of the PDF\)/.test(t),t);
 const q=findAll(p,n=>n.tagName==="mark")[0];
 chk("the quote, highlighted",!!q&&flat(q)==="The tide rises and falls twice in each lunar day at most harbours on this coast.");
 const a=findAll(p,n=>n.tagName==="a")[0];
 chk("a link to open the original at that page: the source's address, #page= the PDF page",
   !!a&&a.attrs.href==="https://example.org/harbour-tide-atlas.pdf#page=18"&&/^Open the original at page 12/.test(flat(a)),a&&a.attrs.href);
 chk("which opens in a new tab, and says so to a screen reader",a.attrs.target==="_blank"&&/noopener/.test(a.attrs.rel)&&/opens in a new tab/.test(flat(a)));
 const badge=byClass("rd-badge",p)[0];
 chk("a verified badge with the date and the method",!!badge&&/Verified on/.test(flat(badge))&&/2026/.test(flat(badge))
   &&/Method: quote found on that page/.test(flat(badge)),badge&&flat(badge));
 chk("the badge's tick is decoration; its words carry the meaning",
   findAll(badge,n=>n.attrs&&n.attrs["aria-hidden"]==="true"&&flat(n)==="✓").length===1);
 const m4=markOf("act-s12");click(m4);const t4=flat(panel());
 chk("another mark replaces the panel's content, and the first mark is no longer expanded",
   /Citation 4/.test(t4)&&m1.attrs["aria-expanded"]==="false"&&m4.attrs["aria-expanded"]==="true");
 const a4=findAll(panel(),n=>n.tagName==="a")[0];
 chk("a citation's own address is used exactly as written",a4.attrs.href==="https://example.org/coastal-access-act#s12");
 chk("a place that is not a page number is shown as written, and the link names no page",
   /s\. 12/.test(t4)&&!/Page s\. 12/.test(t4)&&/^Open the original/.test(flat(a4))&&!/at page/.test(flat(a4)),t4);
 chk("its kind of source is the law",/Law/.test(t4));
 click(markOf("marsh-moor"));
 chk("no address anywhere means no link, and no verification means no badge",
   !findAll(panel(),n=>n.tagName==="a").length&&!byClass("rd-badge",panel()).length&&/Case/.test(flat(panel())));
 // Escape closes it and the focus goes back to the mark
 const m5=markOf("marsh-moor");global.__focused=null;key(panel(),"Escape");
 chk("Escape closes the panel",!isOpen());
 chk("and the focus goes back to the mark it came from",global.__focused===m5&&m5.attrs["aria-expanded"]==="false");
 click(m1);global.__focused=null;click(buttonIn(panel(),"Close"));
 chk("its Close button does the same",!isOpen()&&global.__focused===m1);
 click(m1);A.render();
 chk("a redraw closes the panel (its mark is redrawn) without stealing the focus",!isOpen());}

// ---- hover preview
console.log("# the hover preview");
open();
{const mouse={pointerType:"mouse"},finger={pointerType:"touch"};
 const m=markOf("atlas-spring");m._on.pointerenter(mouse);const tip=A.getTip();
 chk("hovering a mark previews the quote, with its source and page",
   !!tip&&!tip.hasAttribute("hidden")&&/“Spring tides follow the new and the full moon by a day or two\.”/.test(flat(tip))
   &&/The Harbour Tide Atlas · Page 47 \(page 53 of the PDF\)/.test(flat(tip)),tip&&flat(tip));
 chk("the preview is for the eye only; the mark itself opens the same words for everyone",tip.attrs["aria-hidden"]==="true");
 m._on.pointerleave(mouse);chk("leaving the mark hides it",tip.hasAttribute("hidden"));
 m._on.pointerenter(mouse);click(m);chk("pressing the mark hides the preview as the panel opens",tip.hasAttribute("hidden")&&isOpen());
 key(panel(),"Escape");
 m._on.pointerenter(finger);chk("a finger on a touch screen gets no preview, only the panel",tip.hasAttribute("hidden"));
 m._on.pointerenter({pointerType:"pen"});chk("nor does a pen",tip.hasAttribute("hidden"));}

// ---- a broken mark
console.log("# an unknown id");
/* in every language: a mark one language lacks is carried from the others
   (see "A mark belongs to its text in every language"), so replacing it in the
   English alone would still cite atlas-twice there */
{const m=clone(fx);const t=readPage(m)[1].text;for(const k of Object.keys(t)) t[k]=t[k].replace("[^atlas-twice]","[^nope]");
 open(m);
 const br=byClass("rd-broken");
 chk("a mark whose id is not in the citations is drawn visibly broken",
   br.length===1&&br[0].attrs["data-broken"]==="nope"&&/\[\?nope\]/.test(flat(br[0])));
 chk("it is not a button, and says what is wrong in words",br[0].tagName==="span"
   &&/No citation called “nope” in this module/.test(flat(br[0]))&&br[0].attrs.title==="No citation called “nope” in this module");
 chk("it takes no number: the others number as if it were not there",
   marks().map(b=>b.attrs["data-cite"]+"="+flat(b)).slice(0,3).join()==="atlas-spring=1,notes-neap=2,atlas-twice=3");
 const r=lint(variantFile("unknown-mark",x=>{readPage(x)[1].text.en+=" [^nope]";}));
 chk("the linter reports it, once per block",r.status===1&&/block 'rd-tides.p1' marks \[\^nope\], which is not in module 'fixture\/reading-tides'/.test(r.stdout)
   &&(r.stdout.match(/\[\^nope\]/g)||[]).length===1,brief(r));}

// ---- callouts and the filter row
console.log("# callouts and the filter");
open();
{const cs=byClass("rd-callout");
 chk("three callouts, one of each kind",cs.map(c=>c.attrs["data-kind"]).join()==="diff,law,opinion");
 chk("each is a note named by its kind's label and its title",cs.every(c=>c.attrs.role==="note"&&(c.attrs["aria-labelledby"]||"").split(" ").length===2));
 const label=k=>flat(byClass("rd-cl",calloutOf(k))[0]);
 chk("each kind has its own words",label("diff")==="Differs from your guide"&&label("law")==="The law now"&&label("opinion")==="An author’s view");
 chk("and its own glyph, hidden from a screen reader that already has the words",
   ["diff","law","opinion"].map(k=>byClass("rd-ci",calloutOf(k))[0]).every(n=>n.attrs["aria-hidden"]==="true")
   &&new Set(["diff","law","opinion"].map(k=>flat(byClass("rd-ci",calloutOf(k))[0]))).size===3);
 chk("and a border pattern of its own in the stylesheet, not colour alone",
   /\.rd-callout\.rd-k-diff\{border-left:6px dashed/.test(html)&&/\.rd-callout\.rd-k-law\{border-left:6px double/.test(html)
   &&/\.rd-callout\.rd-k-opinion\{border-left:6px dotted/.test(html));
 const row=byClass("rd-filter")[0];
 chk("a filter row sits above the activity's content",!!row&&byClass("ap-body")[0].children.indexOf(row)===1
   &&row.attrs.role==="group"&&row.attrs["aria-label"]==="Filter the callouts on this page");
 chk("with a toggle per kind present, in words",["diff","law","opinion"].every(k=>pill(k)&&pill(k).attrs["aria-pressed"]==="false")
   &&/Show differences \(1\)/.test(flat(pill("diff")))&&/Show changes in law/.test(flat(pill("law")))&&/Show authors’ views/.test(flat(pill("opinion"))));
 chk("with nothing chosen, every callout shows in full",cs.every(c=>c.attrs["data-state"]==="open"&&!bodyOf(c).hasAttribute("hidden")));
 click(pill("diff"));
 chk("choosing one kind presses its toggle",pill("diff").attrs["aria-pressed"]==="true");
 chk("its callouts stay in full, and marked",calloutOf("diff").attrs["data-state"]==="lit"&&!bodyOf(calloutOf("diff")).hasAttribute("hidden"));
 chk("the other kinds fold to their label and title",["law","opinion"].every(k=>calloutOf(k).attrs["data-state"]==="folded"
   &&bodyOf(calloutOf(k)).hasAttribute("hidden")&&!showOf(calloutOf(k)).hasAttribute("hidden")&&/Walking on the foreshore|Mooring is not walking/.test(flat(calloutOf(k)))));
 chk("the rest of the reading stays exactly where it was",/Most harbours on this coast/.test(flat(main()))&&byClass("dim").length===2
   &&findAll(main(),n=>n.tagName==="blockquote").length===1);
 const sh=showOf(calloutOf("law"));click(sh);
 chk("a folded callout can be opened on its own",!bodyOf(calloutOf("law")).hasAttribute("hidden")&&sh.attrs["aria-expanded"]==="true"&&sh.textContent==="Hide");
 click(sh);chk("and folded again",bodyOf(calloutOf("law")).hasAttribute("hidden")&&sh.attrs["aria-expanded"]==="false");
 click(pill("law"));
 chk("two kinds chosen: both stay in full, the third folds",calloutOf("law").attrs["data-state"]==="lit"&&calloutOf("diff").attrs["data-state"]==="lit"
   &&calloutOf("opinion").attrs["data-state"]==="folded");
 A.render();
 chk("the choice holds for the visit, through a redraw",pill("diff").attrs["aria-pressed"]==="true"&&calloutOf("opinion").attrs["data-state"]==="folded");
 const md=A.toMarkdown();A.saveLocal();const saved=global.__ls["useful-next-step.v1"]||"";
 chk("it is view state only: never in the file, nor in the browser's save",
   same(strip(moduleBlocks(md).find(m=>m.id===fx.id)),fx)&&!/"lit"|"folded"|READ_FILTER/.test(md)&&!/"lit"|"folded"/.test(saved)&&saved.length>0);
 click(pill("diff"));click(pill("law"));
 chk("with every toggle off again, everything shows",byClass("rd-callout").every(c=>c.attrs["data-state"]==="open"&&!bodyOf(c).hasAttribute("hidden")));
 A.setEditing(true);A.render();
 chk("while editing there is no filter row, and callouts show in full",!byClass("rd-filter").length);
 A.setEditing(false);
 A.showPage(ACT,"sources");A.render();
 chk("a page with no callouts has no filter row",!byClass("rd-filter").length);
 const odd=clone(fx);readPage(odd)[4].kind="aside";open(odd);
 chk("a callout of an unknown kind still draws its words, with no label and no toggle",
   /Walking on the foreshore/.test(flat(main()))&&!pill("aside")&&!!pill("diff")&&!byClass("rd-cl",byClass("rd-callout")[1]).length);}

// ---- the sources block
console.log("# the sources block");
open(null,"sources");
{const box=byClass("rd-sources")[0];
 chk("it is a section named by its own heading",!!box&&box.tagName==="section"&&/Where this comes from/.test(flat(findAll(box,n=>n.tagName==="h3")[0])));
 const srcs=byClass("rd-src",box);
 chk("it lists the module's sources in the registry's order",srcs.map(s=>s.attrs["data-source"]).join()==="harbour-atlas,coast-notes,coastal-act,marsh-case");
 chk("with title, edition, and whether each is primary or secondary",/The Harbour Tide Atlas .*2nd edition, 2019 Primary source/.test(flat(srcs[0]))
   &&/Secondary source/.test(flat(srcs[1]))&&/Law/.test(flat(srcs[2]))&&/Case/.test(flat(srcs[3])));
 chk("a source with an address links to it",findAll(srcs[0],n=>n.tagName==="a")[0].attrs.href==="https://example.org/harbour-tide-atlas.pdf"
   &&!findAll(srcs[1],n=>n.tagName==="a").length);
 const rows=findAll(srcs[0],n=>n.tagName==="li"&&n.attrs["data-cite"]);
 chk("each source lists the citations that point at it, by number",rows.map(r=>r.attrs["data-cite"]).join()==="atlas-twice,atlas-spring"
   &&/^1 Page 12/.test(flat(rows[0]))&&/^2 Page 47/.test(flat(rows[1])));
 const back=findAll(rows[1],n=>n.tagName==="button")[0];
 /* one way back to each place it is marked; this citation is marked three times */
 chk("each with a way back to its marks, named for each",findAll(rows[1],n=>n.tagName==="button").length===3
   &&!!back&&back.attrs["aria-label"]==="Back to citation 2 in the text, place 1 of 3");
 global.__focused=null;click(back);
 chk("going back turns to the page the mark is on",A.currentPage(ACT).id==="read");
 chk("and puts the focus on that citation's first mark",!!global.__focused&&global.__focused.attrs["data-cite"]==="atlas-spring"
   &&global.__focused.attrs.id==="rd-m-2"&&findAll(main(),n=>n===global.__focused).length===1);}
{const m=clone(fx);m.citations.push({id:"unused",source:"coast-notes",page:9,quote:"Tides are slower in shallow water."});
 open(m,"sources");
 const row=findAll(main(),n=>n.tagName==="li"&&n.attrs["data-cite"]==="unused")[0];
 chk("a citation no text marks is listed as not cited, with no way back",!!row&&/Not cited in this activity/.test(flat(row))&&!findAll(row,n=>n.tagName==="button").length);
 const onePage={id:"fixture/one-page-sources",title:{en:"Short"},mode:{id:"short",kind:"guide",blocks:[
   {id:"p",type:"prose",text:"Tides turn.[^t1]"},{id:"s",type:"sources"}]},
   sources:[{key:"k",title:"A Book",kind:"secondary"}],citations:[{id:"t1",source:"k",page:4,quote:"Tides turn."}]};
 A.fresh();A.addModule(clone(onePage));A.setView("short");A.render();
 global.__focused=null;click(findAll(byClass("rd-sources")[0],n=>n.tagName==="button")[0]);
 chk("on a one-page activity going back stays put and focuses the mark",global.__focused===markOf("t1"));
 const bare=clone(onePage);bare.id="fixture/bare";bare.mode.id="bare";delete bare.sources;delete bare.citations;
 A.fresh();A.addModule(bare);A.setView("bare");A.render();
 chk("a sources block in a module with no sources says so",/This module lists no sources\./.test(flat(byClass("rd-sources")[0])));}

// ---- print
console.log("# print");
open();
{const notes=byClass("rd-notes")[0];
 chk("the page ends with endnotes for print",!!notes&&byClass("ap-body")[0].children.slice(-1)[0]===notes&&notes.tagName==="section");
 const items=findAll(notes,n=>n.tagName==="li");
 chk("numbered as the marks are, once per citation",items.map(n=>n.attrs.value).join()==="1,2,3,4,5");
 chk("each with its source, page and quote",
   flat(items[0])==="The Harbour Tide Atlas, 2nd edition, 2019. Page 12 (page 18 of the PDF). “The tide rises and falls twice in each lunar day at most harbours on this coast.”"
   &&flat(items[3])==="Coastal Access Act, consolidated to 1 March 2026. s. 12. “The foreshore below the mean high-water mark is open to the public on foot.”",flat(items[0]));
 const printCss=(html.match(/@media print\{[\s\S]*?\n  \}/)||[""])[0];
 chk("they show only in print, where the panel, the preview and the filter row do not",
   /\.rd-notes\{display:none\}/.test(html)&&/\.rd-notes\{display:block/.test(printCss)
   &&/\.rd-filter,\.rd-panel,\.rd-tip/.test(printCss)&&/\.rd-cb\[hidden\]\{display:block!important\}/.test(printCss),printCss.slice(0,120));
 A.showPage(ACT,"sources");A.render();
 chk("a page with no marks has no endnotes",!byClass("rd-notes").length);}

// ---- editing
console.log("# editing");
open();A.setEditing(true);A.render();
{const frameOf=bid=>byClass("bframe").find(f=>findAll(f,n=>n.tagName==="p"&&/harbours on this coast/.test(flat(n))).length&&bid==="p1")
   ||byClass("bframe").find(f=>findAll(f,n=>hasClass(n,"rd-callout")&&n.attrs["data-kind"]===bid).length);
 click(buttonIn(frameOf("p1"),"Edit"));
 const fr=frameOf("p1"),ta=findAll(fr,n=>n.tagName==="textarea"&&hasClass(n,"field"))[0];
 const tool=byClass("rd-tool",fr)[0];
 chk("a prose block's editor offers to cite a source",!!ta&&!!tool&&tool.tagName==="details"&&/Cite a source/.test(flat(tool.children[0])));
 const f=l=>fieldFor(tool,l);
 chk("its form has labelled fields, each a real label for its control",
   ["Source","Printed page","PDF page, if different","The quote, word for word","Verified on","How it was verified"].every(l=>!!f(l)));
 const before=stored().citations.length;
 f("The quote, word for word").value="";click(byClass("rd-add",tool)[0]);
 chk("a citation without a quote is not added, and the form says why",stored().citations.length===before&&/Write the quote first/.test(flat(tool)));
 const s=f("Source");s.value="";s._on.change();
 chk("choosing a new source shows the fields for it",!byClass("rd-new",tool)[0].hasAttribute("hidden"));
 f("The quote, word for word").value="Estuaries fill last and empty first.";
 click(byClass("rd-add",tool)[0]);
 chk("a new source needs a title",stored().citations.length===before&&/give the new one a title/.test(flat(tool)));
 f("Title of the new source").value="Estuary Handbook";f("Edition").value="1st edition";
 f("Printed page").value="88";f("PDF page, if different").value="90";
 f("Verified on").value="2026-09-24";f("How it was verified").value="quote found on that page";
 ta.selectionEnd=5;           // the cursor, after "Most "
 click(byClass("rd-add",tool)[0]);
 const m=stored(),c=m.citations.find(x=>x.id==="c6"),sNew=m.sources.find(x=>x.key==="estuary-handbook");
 chk("adding writes the citation into the module's registry",!!c&&c.source==="estuary-handbook"&&c.page===88&&c.pagePdf===90
   &&c.quote==="Estuaries fill last and empty first."&&c.verifiedOn==="2026-09-24"&&c.verifiedBy==="quote found on that page",JSON.stringify(c));
 chk("and the new source into its sources",!!sNew&&sNew.title==="Estuary Handbook"&&sNew.edition==="1st edition"&&sNew.kind==="primary");
 const p1=readPage(m)[1];
 chk("its mark goes into the text where the cursor was, in the language being edited",
   p1.text.en.startsWith("Most [^c6]harbours")&&p1.text.fr===fx.mode.pages[0].blocks[1].text.fr);
 chk("the preview draws the new mark at once, numbered first",flat(findAll(frameOf("p1"),n=>hasClass(n,"rd-mark")&&n.attrs["data-cite"]==="c6")[0]||"")==="1");
 chk("and the form says it was added",/Citation “c6” added/.test(flat(tool)));
 const pick=f("A citation already in this module");
 chk("the citation is now offered for inserting again",!!pick&&findAll(pick,n=>n.tagName==="option").some(o=>o.attrs.value==="c6"));
 pick.value="act-s12";ta.selectionEnd=ta.value.length;click(buttonIn(tool,"Insert its mark"));
 chk("inserting an existing citation puts its mark at the cursor",readPage(stored())[1].text.en.endsWith("smallest.[^notes-neap][^act-s12]"));
 // a callout's editor
 click(buttonIn(frameOf("diff"),"Edit"));
 const cf=frameOf("diff"),kind=fieldFor(cf,"Kind of callout");
 chk("a callout's editor offers its kind, title and text, and the citation tool",
   !!kind&&kind.tagName==="select"&&!!fieldFor(cf,"Title (optional)")&&!!fieldFor(cf,"Text")&&byClass("rd-tool",cf).length===1);
 kind.value="opinion";kind._on.change();
 chk("changing its kind is written to the block",readPage(stored())[2].kind==="opinion");
 const tf=fieldFor(frameOf("opinion"),"Title (optional)");tf.value="A new title";tf._on.input();
 chk("and so is its title, in the language being edited",readPage(stored())[2].title.en==="A new title"&&readPage(stored())[2].title.es===fx.mode.pages[0].blocks[2].title.es);
 // adding the two new kinds from the palette
 const addBtn=label=>findAll(main(),n=>n.tagName==="button"&&flat(n)==="+ "+label)[0];
 chk("the palette offers a callout and a sources block",!!addBtn("Callout")&&!!addBtn("Sources"));
 click(addBtn("Callout"));
 const nb=readPage(stored()).slice(-1)[0];
 chk("a new callout starts as a difference, empty, in the language being edited",nb.type==="callout"&&nb.kind==="diff"&&same(nb.text,{en:""}));}
{open(null,"sources");A.setEditing(true);A.render();
 const fr=byClass("bframe").find(f=>byClass("rd-sources",f).length);click(buttonIn(fr,"Edit"));
 const ed=byClass("beditor",byClass("bframe").find(f=>byClass("rd-sources",f).length))[0];
 chk("the sources block's editor lists the module's sources and citations",/Sources in this module/.test(flat(ed))&&/Citations in this module/.test(flat(ed))
   &&/\[\^atlas-twice\]/.test(flat(ed)));
 const quotes=findAll(ed,n=>n.tagName==="textarea");
 const qa=quotes.find(n=>n.value==="The tide rises and falls twice in each lunar day at most harbours on this coast.");
 qa.value="The tide rises and falls twice in each lunar day.";qa._on.input();
 chk("a citation's quote is edited in place",stored().citations.find(c=>c.id==="atlas-twice").quote==="The tide rises and falls twice in each lunar day.");
 click(buttonIn(ed,"+ Add a source"));
 chk("a source can be added",stored().sources.length===5&&stored().sources[4].kind==="primary");
 const rm=findAll(ed,n=>n.tagName==="button"&&flat(n)==="Remove");
 click(rm[0]);
 chk("a source still cited is not removed, and the reader is told why",stored().sources.length===5
   &&/“harbour-atlas” is cited/.test(global.document.getElementById("toast").textContent));
 A.setEditing(false);}

// ---- the file: registries round-trip, and nothing else changes
console.log("# the file");
open();
{const md=A.toMarkdown();const mb=strip(moduleBlocks(md).find(m=>m.id===fx.id));
 chk("the module is written with its registries, exactly as it came",same(mb,fx));
 chk("the marks stay in the text as [^id]",/\[\^atlas-twice\]/.test(md));
 A.fresh();const P=A.parseFile(md);
 chk("the written file reads back with nothing left out",P.ok&&P.unread.length===0,P.unread.join(" | "));
 A.applyParsed(P,"replace");
 chk("and after a reload the registries are identical",same(strip(moduleBlocks(A.toMarkdown()).find(m=>m.id===fx.id)),fx));
 A.saveLocal();
 const B=load(src);const e=B.readLib().entries.find(x=>x.key==="useful-next-step.v1");
 chk("a browser save and a new page load keep them too",!!e&&B.openBooklet(e.id)!==null
   &&same(strip(moduleBlocks(B.toMarkdown()).find(m=>m.id===fx.id)),fx));
 const W=load(src);W.fresh();W.addModule(clone(fx));W.editTemplate(t=>{t.id="fixture/reading";t.version="0.1";});
 const out=path.join(tmp,"written.md");fs.writeFileSync(out,W.toMarkdown().replace(/^---\n/,"---\nstatus: approved\n"));
 const wr=lint(out);
 chk("lint accepts a booklet the renderer wrote with reading material",wr.status===0&&/0 errors · 0 warnings/.test(wr.stdout),brief(wr));}

// ---- an activity without any of it is drawn as before
console.log("# nothing changes without it");
{const plain={id:"fixture/plain-reading",title:{en:"Plain"},mode:{id:"plain",kind:"guide",blocks:[
   {id:"h",type:"heading",text:"A heading"},{id:"p",type:"prose",text:"One paragraph.\n\nAnd a second."},
   {id:"q",type:"quote",text:{en:"A line apart."}},{id:"d",type:"deflist",items:[{label:"Term",body:"What it means."}]},
   {id:"g",type:"group",blocks:[{id:"gp",type:"prose",text:"Inside a group."}]}]}};
 const P=load(src);const bodyKids=global.document.body.children.length;
 P.fresh();P.addModule(clone(plain));P.setView("plain");P.render();
 const all=findAll(main(),n=>n.attrs&&typeof n.attrs.class==="string"&&/(^|\s)rd-/.test(n.attrs.class));
 chk("a module with no citations, callouts or sources draws no reading element at all",all.length===0,all.map(n=>n.attrs.class).join());
 chk("and adds nothing to the page outside the activity (no panel, no preview)",global.document.body.children.length===bodyKids);
 const ps=findAll(main(),n=>n.tagName==="p"&&/paragraph|second|Inside/.test(flat(n)));
 chk("its paragraphs are single runs of text, as they always were",ps.length===3&&ps.every(p=>p.children.length===1&&typeof p.children[0]==="string"));
 const ap=findAll(main(),n=>hasClass(n,"ap-body"))[0];
 chk("its page body holds only its blocks",!!ap&&ap.children.length===1);
 chk("and it is written back unchanged",same(strip(moduleBlocks(P.toMarkdown()).find(m=>m.id===plain.id)),plain));
 const home=load(src);home.fresh();home.getS().page={blocks:[{id:"x",type:"prose",text:"A note with [^x] in it."}]};
 home.setView("home");home.render();
 chk("text outside any module (the home page's own words) is never read for marks",
   /A note with \[\^x\] in it\./.test(flat(main()))&&!byClass("rd-broken").length);}

// ---- links are only ever links
console.log("# addresses");
{const m=clone(fx);m.citations.find(c=>c.id==="act-s12").url="javascript:alert(1)";
 m.sources.find(s=>s.key==="harbour-atlas").url="java\tscript:alert(1)";
 open(m);click(markOf("act-s12"));
 const a=findAll(panel(),n=>n.tagName==="a")[0];
 chk("a citation address that is not http(s) or relative is never linked (the source's is used)",!!a&&a.attrs.href==="https://example.org/coastal-access-act");
 click(markOf("atlas-twice"));
 chk("nor is a source's, however it is spelled",!findAll(panel(),n=>n.tagName==="a").length);
 const r=lint(variantFile("bad-url",x=>{x.citations[0].url="javascript:alert(1)";}));
 chk("and the linter says so",r.status===1&&/a url a renderer will not link to/.test(r.stdout),brief(r));}

// ---- languages
console.log("# languages");
{const P=load(src);
 chk("the reading strings exist in English and French",!!P.TSRC.en.reading&&!!P.TSRC.fr.reading);
 chk("Spanish (es) has every reading key English has",!P.langParity("es").missing.some(p=>p.startsWith("reading."))&&!P.langParity("es").extra.some(p=>p.startsWith("reading.")));
 chk("and so does French",!P.langParity("fr").missing.some(p=>p.startsWith("reading."))&&!P.langParity("fr").extra.some(p=>p.startsWith("reading.")));
 chk("the palette names are written in all three",["en","fr","es"].every(l=>P.TSRC[l].blockEdit.kinds.callout&&P.TSRC[l].blockEdit.kinds.sources));
 const ar=P.leafPaths(P.TSRC["es-AR"].reading).sort().join();
 chk("es-AR holds only the reading strings where vos differs",ar==="needQuote,needSource"
   &&P.T["es-AR"].reading.needQuote!==P.T.es.reading.needQuote&&/Escribí/.test(P.T["es-AR"].reading.needQuote)&&/Elegí/.test(P.T["es-AR"].reading.needSource));
 chk("everything else in es-AR is read through es",P.T["es-AR"].reading.kind.diff===P.T.es.reading.kind.diff&&P.T["es-AR"].reading.openAt(3)===P.T.es.reading.openAt(3));
 const bad=[];for(const l of ["en","fr","es","es-AR"]) for(const p of P.leafPaths(P.T[l].reading)){
   let v=P.T[l].reading;for(const k of p.split(".")) v=v[k];
   const out=typeof v==="function"?v(7,9,11):v;
   if(typeof out!=="string"||!out.trim()||/undefined/.test(out)) bad.push(l+":"+p);}
 chk("every reading string resolves to words in every language",bad.length===0,bad.join(", "));}
{A.fresh();A.addModule(clone(fx));A.setView(ACT);A.setLang("es");A.render();
 chk("in Spanish, the filter speaks Spanish",/Mostrar diferencias/.test(flat(pill("diff")))&&/Mostrar cambios de ley/.test(flat(pill("law")))
   &&byClass("rd-filter")[0].attrs["aria-label"]==="Filtrar los recuadros de esta página");
 chk("and so do the callouts' labels",flat(byClass("rd-cl",calloutOf("diff"))[0])==="Diferencia con tu guía"&&flat(byClass("rd-cl",calloutOf("law"))[0])==="Lo que rige hoy");
 chk("the module's own Spanish text is drawn, with its marks",/En la mayoría de los puertos/.test(flat(main()))&&markOf("atlas-twice").attrs["aria-label"]==="Cita 1");
 click(markOf("atlas-twice"));const t=flat(panel());
 chk("and the panel",/Cita 1/.test(t)&&/Página 12 \(página 18 del PDF\)/.test(t)&&/Abrir el original en la página 12/.test(t)
   &&/Verificada el 20 de septiembre de 2026/.test(t)&&/Fuente primaria/.test(t)&&/2\.ª edición, 2019/.test(t),t);
 key(panel(),"Escape");
 A.setLang("es-AR");A.render();
 chk("es-AR reads the same words through es",/Diferencia con tu guía/.test(flat(main())));
 A.setLang("fr");A.render();click(markOf("atlas-twice"));const f=flat(panel());
 chk("in French, the panel and the filter",/Référence 1/.test(f)&&/Page 12 \(page 18 du PDF\)/.test(f)&&/Ouvrir l’original à la page 12/.test(f)
   &&/Vérifiée le 20 septembre 2026/.test(f)&&/Afficher les différences/.test(flat(pill("diff"))),f);
 key(panel(),"Escape");
 A.showPage(ACT,"sources");A.render();
 chk("and the sources block",/Source primaire/.test(flat(byClass("rd-sources")[0]))&&findAll(main(),n=>n.tagName==="button"&&n.attrs["aria-label"]==="Revenir à la référence 4 dans le texte").length===1
   &&findAll(main(),n=>n.tagName==="button"&&n.attrs["aria-label"]==="Revenir à la référence 1 dans le texte, endroit 2 sur 2").length===1);
 A.setLang("en");}

// ---- the linter
console.log("# the linter");
{const cases=[
  ["mark-unknown",x=>{readPage(x)[2].text.en+=" [^ghost]";},/marks \[\^ghost\], which is not in module/],
  ["source-missing",x=>{x.citations[0].source="nowhere";},/citation 'act-s12' names the source 'nowhere', which is not in the module's `sources`/],
  ["dup-citation",x=>{x.citations[1].id="act-s12";},/two citations share the id 'act-s12'/],
  ["dup-source",x=>{x.sources[1].key="harbour-atlas";},/two sources share the key 'harbour-atlas'/],
  ["callout-kind",x=>{readPage(x)[2].kind="aside";},/callout 'rd-tides.diff1' has kind 'aside' \(known: diff, law, opinion\)/],
  ["empty-quote",x=>{x.citations[2].quote="  ";},/citation 'marsh-moor' has an empty quote/],
  ["source-kind",x=>{x.sources[0].kind="tertiary";},/source 'harbour-atlas' has kind 'tertiary'/]];
 for(const [name,fn,rx] of cases){const r=lint(variantFile(name,fn));
   chk("lint rejects: "+name,r.status===1&&rx.test(r.stdout),brief(r));}
 const nested=lint(variantFile("nested",x=>{readPage(x).push({id:"grp",type:"group",blocks:[{id:"c9",type:"callout",kind:"nope",text:"x [^nothing]"}]});}));
 chk("lint looks inside groups too",nested.status===1&&/callout 'rd-tides.c9' has kind 'nope'/.test(nested.stdout)&&/\[\^nothing\]/.test(nested.stdout),brief(nested));
 const date=lint(variantFile("date",x=>{x.citations[1].verifiedOn="20/09/2026";}));
 chk("lint warns on a verification date not written YYYY-MM-DD",date.status===0&&/write the date as YYYY-MM-DD/.test(date.stdout),brief(date));
 const repo=lint();
 // registry-language warnings (mensio-* files, owned upstream) are test/lint.test.js's to check
 chk("lint still passes the repo unchanged",repo.status===0&&/ 0 errors · /.test(repo.stdout)
   &&!repo.stdout.split("\n").some(l=>l.startsWith("warn")&&!/: registry languages: /.test(l)),brief(repo));}

// ---- the format carried in the file, and the human half
console.log("# the format block and the human half");
{const F=A.FORMAT_BLOCK;
 chk("the format block names both block types",!!F.block_types.callout&&!!F.block_types.sources);
 chk("and both registries, and the mark",!!F.module_shape.sources&&!!F.module_shape.citations&&/\[\^id\]/.test(F.citation_marks));
 A.setLang("en");
 const lines=A.blockLines([{id:"c",type:"callout",kind:"law",title:"Walking",text:"Open on foot.[^act-s12]"}]).join("\n");
 chk("a callout in the human half is a quoted paragraph led by its kind and title, its mark kept",
   lines==="> **The law now — Walking**\n> Open on foot.[^act-s12]\n",JSON.stringify(lines));}

fs.rmSync(tmp,{recursive:true,force:true});
console.log(fails?"\n"+fails+" FAILURES":"\nreading checks passed");
process.exit(fails?1:0);
