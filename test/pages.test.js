// An activity made of pages: `pages: [{id, title, blocks}]`, never beside
// `blocks`. Pages are layout only: the activity keeps one id, one draft and one
// set of kept entries, so answers are keyed exactly as before, and a block id or
// an answer field may sit on one page only. The renderer lists the pages in a
// menu on the left (minimizable, a browser preference), and a one-page activity
// shows a thin plus strip while editing.
// Run: node test/pages.test.js   (node and python3; nothing to install)
require("./harness.js");            // the browser stubs the renderer's script needs
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(R,"booklet.html"),"utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];

/* Record click and input handlers, which the harness's stub drops, so a test
   can press a button or type into a field the way a reader would. */
const mk0=global.document.createElement;
global.document.createElement=tag=>{const n=mk0(tag);
  n.addEventListener=function(type,fn){(this._on||(this._on={}))[type]=fn;};
  Object.defineProperty(n,"innerHTML",{get(){return this._html||"";},
    set(v){this._html=String(v);this.children=[];}});
  return n;};

/* One page load: the renderer's one <script> evaluated afresh inside a function
   of its own, so two loads never share a binding. The in-memory localStorage
   outlives a load, as a browser's does. */
function load(source){const API={};
  eval(source+`
;Object.assign(API,{pagesOf,isPaged,activityBlocks,pagesProblem,currentPage,showPage,splitIntoPages,addPage,
  movePage,renamePage,deletePage,ADD_PAGE_BOX,PAGES_MENU_KEY,modesOf,moduleOf,modeOf,moduleView,tplModes,
  tplModules,allModules,addModule,refusalOf,moduleOk,moduleFromText,parseFile,applyParsed,toMarkdown,
  saveLocal,loadLocal,render,finalizeEntry,draftFor,keptFor,blocksOf,editTemplate,readLib,openBooklet,
  setEditing:v=>{editing=v},getView:()=>view,setView:v=>{view=v},getS:()=>S,getD:()=>D,getTPL:()=>TPL,
  setLang:l=>{lang=l},
  fresh:()=>{S=emptyS();D={today:emptyToday(),checkin:emptyCheckin()};TPL=EMPTY_BOOKLET;
    view="home";editing=false;lang="en";}});`);
  return API;}
const A=load(src);

let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const fixture=n=>fs.readFileSync(path.join(__dirname,"fixtures",n),"utf8");
const clone=o=>JSON.parse(JSON.stringify(o));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/* the module blocks a written file carries, parsed fence by fence */
const moduleBlocks=md=>[...md.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]
  .map(m=>{try{return JSON.parse(m[1]);}catch(e){return null;}}).filter(o=>o&&o.block==="module");
const strip=({block,...m})=>m;
/* every string drawn under a node of the stub DOM */
const textOf=n=>n==null?"":typeof n==="string"?n
  :(n._text||"")+" "+(n._html||"").replace(/<[^>]*>/g," ")+" "+(n.children||[]).map(textOf).join(" ");
const findAll=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);
  (n.children||[]).forEach(k=>findAll(k,pred,out));}return out;};
const main=()=>global.document.getElementById("main");
const hasClass=(n,c)=>!!(n&&n.attrs&&typeof n.attrs.class==="string"&&n.attrs.class.split(/\s+/).includes(c));
const byClass=(c,root)=>findAll(root||main(),n=>hasClass(n,c));
const click=n=>{if(!n||!n._on||!n._on.click) throw new Error("nothing to click");return n._on.click({target:n,currentTarget:n});};
const buttonIn=(root,label)=>findAll(root,n=>n.tagName==="button"&&textOf(n).trim()===label)[0];
const menuItems=()=>byClass("ap-item").filter(n=>!hasClass(n,"ap-add"));
const current=()=>menuItems().findIndex(n=>n.attrs["aria-current"]==="page");
const ctrl=(i,sel)=>findAll(byClass("ap-acts")[i],sel)[0];
const upOf=i=>ctrl(i,n=>n.attrs&&n.attrs["data-move"]==="-1");
const downOf=i=>ctrl(i,n=>n.attrs&&n.attrs["data-move"]==="1");
const delOf=i=>ctrl(i,n=>hasClass(n,"danger"));
const confirmDelete=()=>click(buttonIn(byClass("ap-confirm")[0],"Delete the page"));
const lint=(...args)=>spawnSync("python3",[path.join(R,"lint-booklet.py"),...args],{encoding:"utf8"});
const brief=r=>r.stdout.split("\n").filter(l=>/^ERROR|^warn|checked/.test(l)).join(" / ");

// modules/ is version 2 markdown now; this file's page-splitting checks need
// a version 1-shaped one-activity module, so they use the dedicated fixture
// (see test/modules.test.js) rather than the real registry.
const journal=strip(moduleBlocks(fixture("module-one-activity.md"))[0]);
const fx=strip(moduleBlocks(fixture("module-activity-pages.md"))[0]);
const paged=()=>A.moduleFromText(fixture("module-activity-pages.md"));
const stored=id=>A.getTPL().modules.find(m=>m.id===id);
/* a booklet file carrying the given modules, the way a reader receives one */
const fence=o=>"```json\n"+JSON.stringify(o,null,1)+"\n```\n\n";
const bookletWith=mods=>"---\nbooklet: 1\ntitle: \"Pages\"\nlang: en\n---\n\n# Pages\n\n"
  +"------------------------------------------------------------\n\n## App record — do not edit below this line\n\n"
  +fence({block:"meta",app:"booklet",v:6,booklet:1,booklet_id:"fixture/pages",booklet_version:"1",customized:true})
  +mods.map(m=>fence({block:"module",...m})).join("")+fence({block:"person",name:"",lang:"en"});

// ---- a one-page activity is exactly what it was
A.fresh();A.addModule(clone(journal));
{const md=A.toMarkdown();A.fresh();A.applyParsed(A.parseFile(md),"replace");
 const back=strip(moduleBlocks(A.toMarkdown())[0]);
 chk("a one-page activity is written back with `blocks` and no `pages`",
   Array.isArray(back.mode.blocks)&&back.mode.pages===undefined);
 chk("and byte for byte as it came",same(back,journal));
 const ps=A.pagesOf(A.modeOf("journal"));
 chk("it reads as one page holding the activity's own blocks",ps.length===1&&ps[0].blocks.length===journal.mode.blocks.length);
 chk("blocksOf still lists its visible blocks in display order",
   A.blocksOf("journal").map(b=>b.id).join()===journal.mode.blocks.map(b=>b.id).join());}

// ---- the plus strip: while editing only, by one constant
A.setView("journal");A.setEditing(false);A.render();
chk("reading a one-page activity: no menu, no plus strip, no frame",
  !byClass("ap-menu").length&&!byClass("ap-plus").length&&!byClass("ap-frame").length);
A.setEditing(true);A.render();
{const plus=byClass("ap-plus"),frame=main().children[0];
 chk("editing it: one plus strip, on the left edge, and no menu",
   plus.length===1&&!byClass("ap-menu").length&&hasClass(frame,"ap-frame")&&frame.children[0]===plus[0]);
 chk("the plus strip is a real button with an accessible name",
   plus[0].tagName==="button"&&plus[0].attrs.type==="button"&&plus[0].attrs["aria-label"]==="Add a page to this activity");
 chk("whether it shows to a reader is the one constant ADD_PAGE_BOX, set to \"editing\"",A.ADD_PAGE_BOX==="editing");}
{const B=load(src.replace('const ADD_PAGE_BOX="editing";','const ADD_PAGE_BOX="always";'));
 B.fresh();B.addModule(clone(journal));B.setView("journal");B.setEditing(false);B.render();
 chk("flipped to \"always\", the strip shows while reading too",byClass("ap-plus").length===1);
 A.render();}

// ---- clicking the strip makes two pages and shows the menu
{A.getS().entries={journal:[{ts:"2026-09-01T10:00:00.000Z",day:"kept before pages"}]};
 const before=clone(stored(journal.id));const keptBefore=JSON.stringify(A.getS().entries);
 const act=()=>stored(journal.id).mode;
 click(byClass("ap-plus")[0]);
 chk("clicking the strip makes the activity two pages, and drops `blocks`",
   A.isPaged(act())&&act().pages.length===2&&act().blocks===undefined);
 chk("its blocks become the first page; the second page is new and empty",
   same(act().pages[0].blocks,before.mode.blocks)&&act().pages[1].blocks.length===0);
 chk("`pages` takes the place `blocks` had among the activity's keys",
   Object.keys(act()).join()===Object.keys(before.mode).join().replace("blocks","pages"));
 chk("each page has an id and a name in the language being edited",
   act().pages.every(p=>typeof p.id==="string"&&p.id)&&act().pages[0].title.en==="Page 1"&&act().pages[1].title.en==="Page 2");
 chk("the new page is the one on show",A.currentPage("journal").id===act().pages[1].id&&current()===1);
 const nav=byClass("ap-menu")[0];
 chk("the menu is a nav with an accessible name, and a real button per page",
   !!nav&&nav.tagName==="nav"&&nav.attrs["aria-label"]==="Pages of this activity"
   &&menuItems().length===2&&menuItems().every(b=>b.tagName==="button"&&b.attrs.type==="button"));
 chk("the page on show, and only it, is marked aria-current=page",
   menuItems()[1].attrs["aria-current"]==="page"&&menuItems()[0].attrs["aria-current"]===undefined);
 chk("the menu is on the left: the first thing in the activity's frame",
   hasClass(main().children[0],"ap-frame")&&main().children[0].children[0]===nav);
 chk("while editing, the menu ends with an \"add a page\" item",
   byClass("ap-add").length===1&&textOf(byClass("ap-add")[0]).includes("Add a page")
   &&findAll(nav,n=>n.tagName==="li").slice(-1)[0].children[0]===byClass("ap-add")[0]);
 chk("the plus strip gives way to the menu",!byClass("ap-plus").length);

 // ---- add, rename, reorder, delete
 click(byClass("ap-add")[0]);
 chk("the add item adds a page at the end, named, and shows it",
   act().pages.length===3&&act().pages[2].title.en==="Page 3"&&current()===2&&menuItems().length===3);
 const nameInput=()=>findAll(byClass("ap-name")[0],n=>n.tagName==="input")[0];
 nameInput().value="Evening";nameInput()._on.input();
 chk("the page on show is renamed in place, in the language being edited",act().pages[2].title.en==="Evening");
 chk("and the menu shows the new name at once",textOf(menuItems()[2]).includes("Evening"));
 A.setLang("fr");A.render();nameInput().value="Soir";nameInput()._on.input();A.setLang("en");A.render();
 chk("naming it in French keeps the English, and the other written names",
   act().pages[2].title.en==="Evening"&&act().pages[2].title.fr==="Soir"&&act().pages[2].title.es==="Página 3");
 chk("a page made without a name is named in every language the booklet offers, so Spanish shows \"Página 3\", not \"Page 3\"",
   same(act().pages[1].title,{en:"Page 2",es:"Página 2",fr:"Page 2"}));
 A.setLang("es");A.render();
 chk("read in Spanish, the unnamed pages carry Spanish names",textOf(menuItems()[0]).includes("Página 1")&&textOf(menuItems()[1]).includes("Página 2"));
 A.setLang("en");A.render();
 const ids=()=>A.pagesOf(A.modeOf("journal")).map(p=>p.id);
 const [p1,p2,p3]=ids();
 chk("the first page cannot move up, nor the last one down",
   upOf(0).attrs.disabled!==undefined&&downOf(2).attrs.disabled!==undefined&&upOf(1).attrs.disabled===undefined);
 chk("each control is named for its page",upOf(2).attrs["aria-label"]==="Move “Evening” up"
   &&delOf(2).attrs["aria-label"]==="Delete the page “Evening”");
 click(upOf(2));
 chk("moving a page up reorders the menu",ids().join()===[p1,p3,p2].join()&&textOf(menuItems()[1]).includes("Evening"));
 chk("by writing display.order on every page, not by rewriting the list",
   act().pages.map(p=>p.id).join()===[p1,p2,p3].join()&&act().pages.every(p=>Number.isFinite((p.display||{}).order)));
 click(downOf(0));
 chk("and moving one down does too",ids().join()===[p3,p1,p2].join());
 click(upOf(1));
 chk("and back",ids().join()===[p1,p3,p2].join());
 click(delOf(0));
 {const c=byClass("ap-confirm")[0];const n=before.mode.blocks.length;
  chk("deleting asks first, in place, and says what happens to the page's blocks",
    !!c&&c.attrs.role==="alert"&&textOf(c).includes("Delete the page “Page 1”?")
    &&textOf(c).includes(`Its ${n} blocks will be deleted with it.`)&&textOf(c).includes("stays in your file"),textOf(c));
  chk("asking deletes nothing",act().pages.length===3);
  click(buttonIn(c,"Keep it"));
  chk("keeping it puts the page's controls back",!byClass("ap-confirm").length&&!!delOf(0)&&act().pages.length===3);}
 click(delOf(1));
 chk("an empty page says so",textOf(byClass("ap-confirm")[0]).includes("It has no blocks"));
 confirmDelete();
 chk("confirmed, the page is deleted",act().pages.length===2&&!act().pages.some(p=>p.id===p3)&&menuItems().length===2);
 chk("and the page on show moves to a neighbour",A.currentPage("journal").id===p2);
 click(delOf(1));
 chk("deleting the second of two says the activity goes back to one page",
   textOf(byClass("ap-confirm")[0]).includes("goes back to a single page"));
 confirmDelete();
 chk("deleting down to one page collapses the activity back to `blocks`",
   act().pages===undefined&&Array.isArray(act().blocks));
 chk("the page left keeps its blocks, as the activity's own",same(act().blocks,before.mode.blocks));
 chk("the module is exactly what it was before it had pages",same(stored(journal.id),before));
 chk("the menu goes, and the plus strip is back while editing",!byClass("ap-menu").length&&byClass("ap-plus").length===1);
 chk("and nothing kept was touched by any of it",JSON.stringify(A.getS().entries)===keptBefore);}

// ---- a multi-page activity: switching pages, and the right blocks on each
A.fresh();A.addModule(paged());
A.setView("ps-study");A.setEditing(false);A.render();
{const t=()=>textOf(main());
 chk("a two-page activity opens on its first page, showing its blocks only",
   /Read this part first/.test(t())&&/What stood out/.test(t())&&!/Your answer/.test(t()));
 click(menuItems()[1]);
 chk("choosing the second page shows its blocks, and only those",/Your answer/.test(t())&&!/What stood out/.test(t()));
 chk("and marks it as the page on show",current()===1);
 chk("the page's name heads its blocks",byClass("ap-title").some(h=>textOf(h).trim()==="Respond"));
 chk("the view stays the activity's (the address does not change)",A.getView()==="ps-study");
 chk("reading, the menu has no add item and no page controls",!byClass("ap-add").length&&!byClass("ap-acts").length);
 chk("the finalize row serves the whole activity, on every page",byClass("finrow").length===1);
 A.setLang("fr");A.render();
 chk("the menu speaks French",byClass("ap-menu")[0].attrs["aria-label"]==="Pages de cette activité"
   &&textOf(menuItems()[1]).includes("Répondre"));
 A.setLang("en");A.render();}

// ---- answers are keyed by field id, whatever page they were written on
{A.draftFor("ps-study").notes="a note from page one";A.draftFor("ps-study").answer="an answer from page two";
 A.finalizeEntry("ps-study");
 A.draftFor("ps-study").notes="half-written";
 const S=A.getS();
 chk("one kept entry holds the answers of both pages, keyed by field id",
   S.entries["ps-study"].length===1&&S.entries["ps-study"][0].notes==="a note from page one"
   &&S.entries["ps-study"][0].answer==="an answer from page two");
 chk("one draft serves every page",A.draftFor("ps-study")===A.getD().custom["ps-study"]&&A.getD().custom["ps-study"].notes==="half-written");
 chk("blocksOf lists the blocks of every page, in page order",A.blocksOf("ps-study").map(b=>b.id).join()==="intro,notes,answer");
 A.setView("history");A.render();
 chk("history shows what was kept from every page",
   /a note from page one/.test(textOf(main()))&&/an answer from page two/.test(textOf(main())));
 const md=A.toMarkdown();const mb=strip(moduleBlocks(md).find(m=>m.id==="fixture/paged-study"));
 chk("the file carries the activity's `pages`, and no `blocks`",
   Array.isArray(mb.mode.pages)&&mb.mode.pages.length===2&&mb.mode.blocks===undefined);
 chk("written exactly as it came",same(mb,fx));
 chk("and one entries block for the activity, as always",/"mode": "ps-study"/.test(md));
 A.fresh();const P=A.parseFile(md);
 chk("the written file reads back with nothing left out",P.ok&&P.unread.length===0,P.unread.join(" | "));
 A.applyParsed(P,"replace");
 chk("after a reload the pages are back, identical",same(strip(moduleBlocks(A.toMarkdown()).find(m=>m.id==="fixture/paged-study")),mb));
 chk("and so are the answers, by field id",A.getS().entries["ps-study"][0].answer==="an answer from page two"
   &&A.getS().entries["ps-study"][0].notes==="a note from page one");
 /* the browser's own save, then a new page load: its boot lists that save in
    "Your booklets", and opening it from there reads it back */
 A.saveLocal();
 const B=load(src);const e=B.readLib().entries.find(x=>x.key==="useful-next-step.v1");
 chk("a browser save and a new page load keep the pages",
   !!e&&B.openBooklet(e.id)!==null&&B.pagesOf(B.modeOf("ps-study")).map(p=>p.id).join()==="read,respond"
   &&B.getS().entries["ps-study"][0].answer==="an answer from page two");
 A.render();}

// ---- kept entries and drafts are untouched by page edits
{const keptBefore=JSON.stringify(A.getS().entries);A.draftFor("ps-study").notes="still writing";
 const draftBefore=JSON.stringify(A.getD().custom);
 A.setView("ps-study");A.setEditing(true);A.render();
 click(byClass("ap-add")[0]);
 const nid=A.currentPage("ps-study").id;
 A.renamePage("ps-study",nid,"Extra");A.movePage("ps-study",nid,-1);A.movePage("ps-study","read",1);
 A.render();A.showPage("ps-study",nid);A.render();click(delOf(current()));confirmDelete();
 chk("adding, renaming, moving and deleting pages leaves every kept entry as it was",
   JSON.stringify(A.getS().entries)===keptBefore);
 chk("and every draft",JSON.stringify(A.getD().custom)===draftBefore);
 chk("and the activity still has its two pages",A.pagesOf(A.modeOf("ps-study")).length===2);}

// ---- blocks are edited on the page on show, and an answer field stays on one page
{A.fresh();
 const m=clone(fx);m.mode.pages[0].blocks.push({id:"body",type:"widget",widget:"none",keys:["regions"]});
 chk("a page may hold a widget block owning a fixed field",A.addModule(m)===true);
 A.setView("ps-study");A.setEditing(true);A.showPage("ps-study","respond");A.render();
 const addBtn=label=>findAll(main(),n=>n.tagName==="button"&&textOf(n).trim()==="+ "+label)[0];
 click(addBtn("Words"));
 const pg=i=>stored("fixture/paged-study").mode.pages[i];
 chk("a block added while a page is on show lands on that page only",
   pg(1).blocks.length===2&&pg(1).blocks[1].type==="prose"&&pg(0).blocks.length===3);
 click(addBtn("Widget"));
 chk("a block whose answer field is already on another page is not added",pg(1).blocks.length===2);
 chk("and the reader is told which field and which page",
   /“regions”/.test(global.document.getElementById("toast").textContent)
   &&/“Read”/.test(global.document.getElementById("toast").textContent),global.document.getElementById("toast").textContent);}

// ---- collisions across pages are refused, as activity-id clashes are
A.fresh();
{const clash=clone(fx);clash.id="fixture/clash";clash.mode.id="clash";
 clash.mode.pages[1].blocks.push({id:"notes-again",type:"text",q:["ps","notes"],keys:["notes"]});
 chk("a module with one answer field on two pages of an activity is not well-formed",!A.moduleOk(clash));
 chk("adding it is refused, and nothing is added",A.addModule(clone(clash))===false&&!A.allModules().some(m=>m.id==="fixture/clash"));
 const why=A.refusalOf(clash)||"";
 chk("the refusal names the module, the field and both pages",
   /fixture\/clash/.test(why)&&/“notes”/.test(why)&&/“Read”/.test(why)&&/“Respond”/.test(why),why);
 const sameId=clone(fx);sameId.id="fixture/same-id";sameId.mode.id="same-id";
 sameId.mode.pages[1].blocks.push({id:"intro",type:"prose",text:"again"});
 chk("so is one block id on two pages",A.addModule(clone(sameId))===false&&/“intro”/.test(A.refusalOf(sameId)||""));
 const twice=clone(fx);twice.id="fixture/page-twice";twice.mode.id="page-twice";twice.mode.pages[1].id="read";
 chk("and two pages with one id",A.addModule(clone(twice))===false&&/an id of its own/.test(A.refusalOf(twice)||""));
 const onePage={id:"fixture/one-page",title:{en:"One"},mode:{id:"one-page",kind:"entry",
   blocks:[{id:"a",type:"text",q:["x","a"]},{id:"b",type:"text",q:["x","a"],keys:["a"]}]}};
 chk("a one-page activity is judged exactly as before (no new refusal)",A.addModule(clone(onePage))===true);
 const P=A.parseFile(bookletWith([fx,clash]));
 chk("the loader keeps the rest of the booklet and leaves the clashing module out",
   P.ok&&P.template.modules.map(m=>m.id).join()==="fixture/paged-study");
 const msg=P.unread.join(" | ");
 chk("and says which module, which field and which pages",/fixture\/clash/.test(msg)&&/notes/.test(msg)&&/Respond/.test(msg),msg);
 A.setLang("fr");
 const fr=A.parseFile(bookletWith([fx,clash])).unread.join(" | ");
 chk("in the reader's language",/refusé/.test(fr)&&/notes/.test(fr),fr);
 A.setLang("en");}

// ---- a one-entry `pages` is `blocks`; `blocks` beside `pages` is kept, never lost
A.fresh();
{const one=clone(fx);one.id="fixture/one-entry";one.mode.id="one-entry";one.mode.pages=[one.mode.pages[0]];
 A.addModule(clone(one));const st=stored("fixture/one-entry").mode;
 chk("a `pages` holding one page is taken as `blocks`",st.pages===undefined&&same(st.blocks,fx.mode.pages[0].blocks));
 chk("and written as `blocks`",(()=>{const w=moduleBlocks(A.toMarkdown()).find(m=>m.id==="fixture/one-entry");
   return w&&Array.isArray(w.mode.blocks)&&w.mode.pages===undefined;})());
 const both=clone(fx);both.id="fixture/both";both.mode.id="both";
 both.mode.blocks=[{id:"late",type:"prose",text:"added by an older renderer"}];
 chk("a reader shows blocks left beside `pages` as one more page",A.pagesOf(both.mode).length===3);
 chk("an activity carrying both is taken, not refused",A.addModule(clone(both))===true);
 const sb=stored("fixture/both").mode;
 chk("its stray blocks become a last page, and `blocks` goes",
   sb.blocks===undefined&&sb.pages.length===3&&sb.pages[2].id==="more"&&sb.pages[2].blocks[0].id==="late");
 const w=moduleBlocks(A.toMarkdown()).find(m=>m.id==="fixture/both");
 chk("it is written back with `pages` only, and nothing lost",
   w.mode.blocks===undefined&&w.mode.pages.length===3&&same(w.mode.pages.slice(0,2),fx.mode.pages));}

// ---- the menu's minimized state: a browser preference, never the booklet's
A.fresh();delete global.__ls[A.PAGES_MENU_KEY];
A.addModule(paged());A.setView("ps-study");A.setEditing(false);A.render();
{const tog=()=>byClass("ap-toggle")[0],frame=()=>byClass("ap-frame")[0];
 chk("with no preference, the menu is expanded",!hasClass(frame(),"ap-min")&&tog().attrs["aria-expanded"]==="true");
 chk("the minimize control is a button with a name, aria-expanded, and the list it controls",
   tog().tagName==="button"&&tog().attrs["aria-label"]==="Page menu"&&tog().attrs["aria-controls"]==="ap-pages"
   &&findAll(main(),n=>n.attrs&&n.attrs.id==="ap-pages").length===1);
 click(tog());
 chk("minimizing collapses the menu to the rail",hasClass(frame(),"ap-min")&&tog().attrs["aria-expanded"]==="false");
 const shown=A.pagesOf(A.modeOf("ps-study")).indexOf(A.currentPage("ps-study"));
 chk("the rail still lists every page, each named, the one on show marked",
   menuItems().length===2&&textOf(menuItems()[0]).includes("Read")&&shown>=0&&current()===shown);
 chk("the choice is remembered in the browser",global.__ls[A.PAGES_MENU_KEY]==="min");
 A.showPage("ps-study","respond");
 {const B=load(src);B.fresh();B.addModule(paged());B.setView("ps-study");B.render();
  chk("it survives a page load",hasClass(byClass("ap-frame")[0],"ap-min"));
  chk("but the page on show does not: a new visit opens on the first page",B.currentPage("ps-study").id==="read");}
 A.render();
 const md=A.toMarkdown();A.saveLocal();const saved=global.__ls["useful-next-step.v1"]||"";
 chk("the preference never enters the file",!md.includes(A.PAGES_MENU_KEY)&&!/pagesMenu|"min"/.test(md));
 chk("nor the browser's save of the booklet",saved.length>0&&!/pagesMenu|"min"/.test(saved));
 click(tog());
 chk("expanding it again is remembered too",!hasClass(frame(),"ap-min")&&global.__ls[A.PAGES_MENU_KEY]==="open");}

// ---- a paged activity inside a module that holds several activities
{/* whichever key the renderer reads several activities from (`modes` today) */
 const MULTI=A.moduleOk({id:"x/probe",activities:[{id:"pa",kind:"entry"},{id:"pb",kind:"entry"}]})?"activities":"modes";
 const study={...clone(fx.mode),title:{en:"Study"}};
 const grp={id:"fixture/week",title:{en:"Week"},copy:clone(fx.copy),
   [MULTI]:[study,{id:"wk-quiz",kind:"entry",title:{en:"Quiz"},blocks:[{id:"q1",type:"text",q:["ps","answer"],keys:["q1"]}]}]};
 A.fresh();
 chk("a module holding several activities, one of them paged, is added",A.addModule(clone(grp))===true);
 A.setView(A.moduleView("fixture/week"));A.setEditing(false);A.render();
 const card=findAll(main(),n=>n.tagName==="button"&&hasClass(n,"mode")&&/Study/.test(textOf(n)))[0];
 click(card);A.render();
 chk("its module page opens the paged activity",A.getView()==="ps-study"&&menuItems().length===2);
 click(menuItems()[1]);
 chk("whose pages switch like any other's",current()===1&&/Your answer/.test(textOf(main())));
 A.setEditing(true);A.render();click(byClass("ap-add")[0]);
 chk("and can be edited: a page added lands in that activity",
   A.pagesOf(A.modeOf("ps-study")).length===3&&A.pagesOf(A.modeOf("wk-quiz")).length===1);
 click(delOf(2));confirmDelete();A.setEditing(false);
 A.draftFor("ps-study").answer="from the week";A.finalizeEntry("ps-study");
 const md=A.toMarkdown();const w=strip(moduleBlocks(md).find(m=>m.id==="fixture/week"));
 chk("the module is written with the activity's pages inside it",
   Array.isArray(w[MULTI])&&same(w[MULTI][0].pages,fx.mode.pages)&&w[MULTI][0].blocks===undefined);
 A.fresh();A.applyParsed(A.parseFile(md),"replace");
 chk("and reloads identically, answers and all",
   same(strip(moduleBlocks(A.toMarkdown()).find(m=>m.id==="fixture/week")),w)
   &&A.getS().entries["ps-study"][0].answer==="from the week");}

// ---- the linter
{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"p6-"));
 const variant=(name,fn)=>{const m=clone(fx);fn(m);const p=path.join(tmp,name+".md");
   fs.writeFileSync(p,fixture("module-activity-pages.md")
     .replace(/```json\n[\s\S]*?\n```/,"```json\n"+JSON.stringify({block:"module",...m},null,1)+"\n```"));return p;};
 const ok=lint(path.join(__dirname,"fixtures","module-activity-pages.md"));
 chk("lint accepts a module whose activity has pages",ok.status===0&&/0 errors · 0 warnings/.test(ok.stdout),brief(ok));
 const both=lint(variant("both",m=>{m.mode.blocks=[];}));
 chk("lint rejects `blocks` and `pages` together",both.status===1&&/both `blocks` and `pages`/.test(both.stdout),brief(both));
 const dupPage=lint(variant("dup-page",m=>{m.mode.pages[1].id="read";}));
 chk("lint rejects two pages with one id",dupPage.status===1&&/two pages called 'read'/.test(dupPage.stdout),brief(dupPage));
 const dupBlock=lint(variant("dup-block",m=>{m.mode.pages[1].blocks.push({id:"intro",type:"prose",text:"x"});}));
 chk("lint rejects one block id on two pages",dupBlock.status===1&&/two blocks share the id 'ps-study.intro'/.test(dupBlock.stdout),brief(dupBlock));
 const dupField=lint(variant("dup-field",m=>{m.mode.pages[1].blocks.push({id:"again",type:"text",q:["ps","notes"],keys:["notes"]});}));
 chk("lint rejects one answer field on two pages",
   dupField.status===1&&/the answer field 'notes' is on page 'read' and on page 'respond'/.test(dupField.stdout),brief(dupField));
 const onePage=lint(variant("one-page",m=>{m.mode.pages=[m.mode.pages[0]];}));
 chk("lint warns on a `pages` holding one page",
   onePage.status===0&&/holds its one page in `pages`/.test(onePage.stdout),brief(onePage));
 const untitled=lint(variant("untitled",m=>{delete m.mode.pages[1].title;}));
 chk("lint warns on an untitled page of a multi-page activity",
   untitled.status===0&&/page 'respond' has no title/.test(untitled.stdout),brief(untitled));
 const notList=lint(variant("not-list",m=>{m.mode.pages={};}));
 chk("lint rejects `pages` that is not a list of pages",notList.status===1&&/must be a non-empty list/.test(notList.stdout),brief(notList));
 A.fresh();A.addModule(paged());A.addModule(clone(journal));
 A.editTemplate(t=>{t.id="fixture/booklet";t.version="0.1";});
 const tmpB=path.join(tmp,"written.md");
 fs.writeFileSync(tmpB,A.toMarkdown().replace(/^---\n/,"---\nstatus: approved\n"));
 const wr=lint(tmpB);
 chk("lint accepts a booklet the renderer wrote with a paged activity",wr.status===0&&/0 errors · 0 warnings/.test(wr.stdout),brief(wr));
 const repo=lint();
 // registry-language warnings (widgets/mensio-*.md, still version 1) are test/lint.test.js's to check
 chk("lint still passes the repo unchanged",
   repo.status===0&&/18 booklet files checked · 0 errors · /.test(repo.stdout)
   &&!repo.stdout.split("\n").some(l=>l.startsWith("warn")&&!/: registry languages: /.test(l)),brief(repo));}

console.log(fails?"\n"+fails+" FAILURES":"\npage checks passed");
process.exit(fails?1:0);
