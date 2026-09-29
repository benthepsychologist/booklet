// Two defects found by people building booklets, and the reading slice's loose
// ends, each held here by a check that failed before its fix.
//
// 1. A folded block is named by its `copy`, which may be a reference into the
//    module's copy ("<activity>.<key>"), one value per language ({en, es, fr}),
//    or plain words. Only the reference was read, so the three shipped modules
//    that wrote `{en, fr}` showed the block's id ("more", "later", "extra") in
//    every language. The same lookup names an activity from its `head`, a list
//    from its `copy`, and a question from its module's copy, and every one of
//    them now reads down the language chain (es-AR, es, en) key by key.
// 2. The reading slice: the definition-list editor cites a source like the
//    prose editor does, and a citation mark belongs to a text in every
//    language: a language whose text lacks a mark another language carries
//    shows it at the end of the same paragraph, and the editor offers to put it
//    in (see "Reading material" in SPEC.md).
// Run: node test/polish.test.js   (node and python3; nothing to install)
require("./harness.js");            // the browser stubs the renderer's script needs
const fs=require("fs"),path=require("path");
const R=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(R,"booklet.html"),"utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];

/* Record every handler, which the harness's stub drops, so a test can press
   and type the way an author would; keep what is written into innerHTML. */
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
;Object.assign(API,{moduleFromText,addModule,render,editTemplate,modeOf,blockName,Q,tx,copyAt,locBag,parseFile,
  T,TSRC,citeScope,showPage,currentPage,getPanel:()=>citePanelEl,getView:()=>view,
  setEditing:v=>{editing=v},setView:v=>{view=v},getTPL:()=>TPL,setLang:l=>{lang=l},getLang:()=>lang,
  fresh:()=>{S=emptyS();D={today:emptyToday(),checkin:emptyCheckin()};TPL=EMPTY_BOOKLET;
    view="home";editing=false;lang="en";}});`);
  return API;}
const A=load(src);

let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const clone=o=>JSON.parse(JSON.stringify(o));
const textOf=n=>n==null?"":typeof n==="string"?n
  :(n._text||"")+" "+(n._html||"").replace(/<[^>]*>/g," ")+" "+(n.children||[]).map(textOf).join(" ");
const flat=n=>textOf(n).replace(/\s+/g," ").trim();
const findAll=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);
  (n.children||[]).forEach(k=>findAll(k,pred,out));}return out;};
const main=()=>global.document.getElementById("main");
const hasClass=(n,c)=>!!(n&&n.attrs&&typeof n.attrs.class==="string"&&n.attrs.class.split(/\s+/).includes(c));
const byClass=(c,root)=>findAll(root||main(),n=>hasClass(n,c));
const byTag=(t,root)=>findAll(root||main(),n=>n.tagName===t);
const click=n=>{if(!n||!n._on||!n._on.click) throw new Error("nothing to click");return n._on.click({target:n,currentTarget:n});};
const buttonIn=(root,label)=>findAll(root,n=>n.tagName==="button"&&flat(n)===label)[0];
const summaries=()=>byTag("summary").map(flat);
const moduleText=f=>fs.readFileSync(path.join(R,"modules",f+".md"),"utf8");
const LANGS=["en","fr","es","es-AR"];
/* an activity, drawn in one language */
function show(mod,act,l,editing){A.fresh();A.addModule(clone(mod));A.setLang(l);A.setView(act);A.setEditing(!!editing);A.render();}

// ---- 1. the three shipped modules
// This used to check three real, shipped modules (daily-journal, decision-log,
// weekly-review) for a folded group named correctly in every language. All
// three are version 2 markdown now: they carry one language each (SPEC.md §9,
// no {en,fr,es} dicts left to name a group from), and version 2 has no folded-
// question-group kind yet at all — every one of their folded groups was
// unfolded into plain sequential questions during the conversion (Ben,
// 2026-09-28: "we do not need legacy support"). The mechanism itself is not
// gone from the renderer, just unused by any real content now, so the fixture-
// based checks right below (which build their own module and never touch
// modules/) still cover it directly.
console.log("# a folded group in the shipped modules shows its name, in every language — retired, see above");

// ---- 1. each shape a block's `copy` may take
console.log("# each shape of `copy`, read down the language chain");
function fixture(group,copy,extra){return Object.assign({id:"fixture/polish-copy",title:{en:"Polish"},
  copy:copy||{en:{pc:{more:"More, in English"}},es:{pc:{more:"Más, en español"}},fr:{pc:{more:"Plus, en français"}}},
  mode:{id:"pc",kind:"entry",blocks:[{id:"one",type:"text",q:["pc","one"]},
    Object.assign({id:"grp",type:"group",display:{placement:"folded"},blocks:[{id:"two",type:"text",q:["pc","two"]}]},group)]}},extra||{});}
const shape=(name,mod,want)=>{for(const l of LANGS){show(mod,"pc",l);const s=summaries();
  chk(`${name} [${l}] → "${want[l]}"`,s.length===1&&s[0]===want[l],JSON.stringify(s));}};
shape("a reference into the module's copy",fixture({copy:"pc.more"}),
  {en:"More, in English",fr:"Plus, en français",es:"Más, en español","es-AR":"Más, en español"});
shape("a reference whose key one language's copy lacks reads the next language, not the id",
  fixture({copy:"pc.more"},{en:{pc:{more:"More, in English"}},es:{pc:{other:"otra cosa"}},fr:{pc:{more:"Plus, en français"}}}),
  {en:"More, in English",fr:"Plus, en français",es:"More, in English","es-AR":"More, in English"});
shape("one value per language",fixture({copy:{en:"Two more",es:"Dos más",fr:"Deux de plus"}}),
  {en:"Two more",fr:"Deux de plus",es:"Dos más","es-AR":"Dos más"});
shape("one value per language, with an Argentine layer",fixture({copy:{en:"Two more",es:"Dos más","es-AR":"Dos más, che",fr:"Deux de plus"}}),
  {en:"Two more",fr:"Deux de plus",es:"Dos más","es-AR":"Dos más, che"});
shape("one value per language, English only",fixture({copy:{en:"Two more"}}),
  {en:"Two more",fr:"Two more",es:"Two more","es-AR":"Two more"});
shape("plain words",fixture({copy:"Two more questions"}),
  {en:"Two more questions",fr:"Two more questions",es:"Two more questions","es-AR":"Two more questions"});
shape("its own label comes first, as for every block",fixture({copy:"pc.more",label:{en:"Named here",fr:"Nommé ici"}}),
  {en:"Named here",fr:"Nommé ici",es:"Named here","es-AR":"Named here"});
shape("a reference to nothing still falls back to the id, never to the reference",fixture({copy:"pc.nothing"}),
  {en:"grp",fr:"grp",es:"grp","es-AR":"grp"});
{show(fixture({copy:{en:"Two more",es:"Dos más",fr:"Deux de plus"}}),"pc","es",true);
 chk("while editing, a group's frame is named by its copy",byClass("blabel").map(flat).includes("Dos más"),byClass("blabel").map(flat).join(" | "));}
{const one=fixture({copy:{en:"Two more",es:"Dos más"}});
 A.fresh();A.addModule(clone(one));A.editTemplate(t=>{t.languages=["es"];});A.setLang("es");A.setView("pc");A.render();
 chk("a booklet that declares one language reads that language's copy",summaries()[0]==="Dos más",JSON.stringify(summaries()));
 A.fresh();A.addModule(clone(fixture({copy:{en:"Two more",fr:"Deux de plus"}})));A.editTemplate(t=>{t.languages=["es"];});A.setLang("es");A.setView("pc");A.render();
 chk("and never another language's, even to name a block",summaries()[0]==="grp",JSON.stringify(summaries()));}

// ---- 1. the other places that read `copy` the same way
console.log("# the heading, a list, a question and a tick-list read the same way");
{const noTitle=fixture({copy:"pc.more"});delete noTitle.title;
 noTitle.mode.head={h:{en:"Heading in English",fr:"Titre en français"},question:{en:"A question first?",fr:"Une question d'abord ?"}};
 for(const [l,h,q] of [["en","Heading in English","A question first?"],["fr","Titre en français","Une question d'abord ?"],["es-AR","Heading in English","A question first?"]]){
   show(noTitle,"pc",l);
   chk(`an activity with no title is headed by its head.h, one value per language [${l}]`,byTag("h2").map(flat).includes(h),byTag("h2").map(flat).join(" | "));
   chk(`and its head.question is shown, one value per language [${l}]`,byClass("gdq").map(flat).includes(q),byClass("gdq").map(flat).join(" | "));}
 A.fresh();A.addModule(clone(noTitle));A.setLang("fr");A.setView("home");A.render();
 chk("the home page names it from its head.h too",/Titre en français/.test(flat(main())),flat(main()).slice(0,300));}
{const L=fixture({copy:"pc.more"});
 L.mode.blocks.push({id:"picks",type:"list",source:[],copy:{en:["Pick some","From the board"],fr:["Choisissez","Depuis le tableau"]}});
 show(L,"pc","fr");
 chk("a list's copy may be one [label, hint] per language",/Choisissez/.test(flat(main()))&&/Depuis le tableau/.test(flat(main()))&&!/ picks /.test(" "+flat(main())+" "),flat(main()).slice(0,400));
 L.mode.blocks[2].copy={en:"Pick some",fr:"Choisissez"};show(L,"pc","fr");
 chk("or one label per language",/Choisissez/.test(flat(main())));}
{const P=fixture({copy:"pc.more"},{en:{pc:{f:{one:["First, in English","A hint"],two:["Second, in English",""]},more:"More"}},
   es:{pc:{f:{one:["Primera, en español","Una pista"]}}}});
 show(P,"pc","es-AR");
 chk("a question worded in Spanish shows in Spanish",A.Q("pc","one").label==="Primera, en español");
 chk("a question the Spanish copy lacks shows its English wording, not a blank",A.Q("pc","two").label==="Second, in English",JSON.stringify(A.Q("pc","two")));}
{const D=fixture({copy:"pc.more"},{en:{pc:{did:{h:"Done, then?",p:"Tick them",none:"Nothing yet"},more:"More"}},fr:{pc:{did:{h:"Fait, alors ?",p:"Cochez",none:"Rien encore"},more:"Plus"}}});
 D.mode.blocks.push({id:"did",type:"didlog",of:["one"],copy:"pc.did"});
 show(D,"pc","fr");
 chk("a tick-list's copy may be a reference into the module's copy",/Fait, alors \?/.test(flat(main()))&&/Rien encore/.test(flat(main())),flat(main()).slice(0,400));
 D.mode.blocks[2].copy={en:{h:"Done, then?",p:"Tick them",none:"Nothing yet"},es:{h:"¿Hecho, entonces?"}};
 show(D,"pc","es");
 chk("and a tick-list's words missing in Spanish read the next language, one by one",
   /¿Hecho, entonces\?/.test(flat(main()))&&/Nothing yet/.test(flat(main())),flat(main()).slice(0,400));}
chk("a widget's words missing in one language read the next language, one by one",
  (A.setLang("es-AR"),A.locBag({en:{h:"E",p:"EP"},es:{h:"S"}},{})).p==="EP"&&A.locBag({en:{h:"E",p:"EP"},es:{h:"S"}},{}).h==="S");
A.setLang("en");
{const dlText=moduleText("decision-log");
 // modules/ is version 2 now, one language (English) per file; the French
 // case here is retired with it (see the note above section 1) — decision-log
 // itself still exercises a block named by its own words, in English only.
 const mod=A.moduleFromText(dlText)||(A.parseFile(dlText).template.modules||[])[0];
 for(const [l,h] of [["en","What else you considered"]]){show(mod,"decision",l);
   chk(`decision-log [${l}]: its one-line list is headed by the block's own words`,byTag("h3").map(flat).includes(h),byTag("h3").map(flat).join(" | "));
   /* the module's data, not the renderer: q named copy.decision.f.options,
      which neither language had, so each line had no label at all */
   chk(`decision-log [${l}]: and each line has its question's words`,nonBlank(A.Q("decision","options").label),JSON.stringify(A.Q("decision","options")));}}
function nonBlank(s){return typeof s==="string"&&s.trim().length>0;}

// ---- 2a. the definition-list editor cites a source
console.log("# the definition list's editor cites a source, like the prose editor");
const moduleBlocks=md=>[...md.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]
  .map(m=>{try{return JSON.parse(m[1]);}catch(e){return null;}}).filter(o=>o&&o.block==="module");
const strip=({block,...m})=>m;
const RFX=strip(moduleBlocks(fs.readFileSync(path.join(__dirname,"fixtures","module-reading.md"),"utf8"))[0]);
const RACT="rd-tides";
const stored=id=>A.getTPL().modules.find(m=>m.id===id);
const itemsNow=()=>stored(RFX.id).mode.pages[0].blocks.find(b=>b.id==="terms").items;
const panelOpen=()=>!!A.getPanel()&&!A.getPanel().hasAttribute("hidden");
const fieldsIn=root=>findAll(root,n=>(n.tagName==="input"||n.tagName==="textarea")&&hasClass(n,"field"));
function openReading(mod,page,l,editing){A.fresh();A.addModule(clone(mod));A.setLang(l||"en");A.setView(RACT);
  A.showPage(RACT,page||"read");A.setEditing(!!editing);A.render();}
/* a part that cannot run on the renderer it is given counts as failed, and the
   rest still runs */
const guard=(name,fn)=>{try{fn();}catch(e){chk(name+": runs to the end",false,e.message);}};
guard("the definition list's cite tool",()=>{openReading(RFX,"read","en",true);
 const frameOf=()=>byClass("bframe").find(f=>byClass("dims",f).length);
 click(buttonIn(frameOf(),"Edit"));
 const ed=byClass("beditor",frameOf())[0];
 const tools=byClass("rd-tool",ed);
 chk("each term and definition pair has a cite tool",tools.length===RFX.mode.pages[0].blocks.find(b=>b.id==="terms").items.length&&tools.length>0,tools.length);
 chk("named as the prose editor's is",/Cite a source/.test(flat(tools[0].children[0])));
 chk("and saying where its mark goes",/in the term or in its definition/.test(flat(tools[0])),flat(tools[0]).slice(0,200));
 const [term,def]=fieldsIn(ed);
 const beforeFr=clone(itemsNow()[0]);
 const pick=findAll(tools[0],n=>n.tagName==="select")[0];
 pick.value="atlas-twice";def.selectionEnd=def.value.indexOf(",");
 click(buttonIn(tools[0],"Insert its mark"));
 chk("inserting a citation puts its mark in the definition, at the cursor",
   itemsNow()[0].body.en==="The largest range[^atlas-twice], near the new and the full moon.[^atlas-spring]",itemsNow()[0].body.en);
 chk("in the language being edited only",itemsNow()[0].body.fr===beforeFr.body.fr&&itemsNow()[0].body.es===beforeFr.body.es);
 term.focus();term.selectionEnd=term.value.length;pick.value="notes-neap";
 click(buttonIn(tools[0],"Insert its mark"));
 chk("with the cursor last in the term, the mark goes into the term",itemsNow()[0].label.en==="Spring tide[^notes-neap]",itemsNow()[0].label.en);
 const cites=stored(RFX.id).citations.length;
 def.focus();def.selectionEnd=def.value.length;
 const f=l=>{const lab=findAll(tools[0],n=>n.tagName==="label"&&flat(n)===l)[0];return lab&&findAll(tools[0],n=>n.attrs&&n.attrs.id===lab.attrs.for&&n!==lab)[0];};
 f("Source").value="coast-notes";f("Printed page").value="4";f("The quote, word for word").value="Spring tides run fastest.";
 click(byClass("rd-add",tools[0])[0]);
 const made=stored(RFX.id).citations.slice(-1)[0];
 chk("adding a new citation from it writes the module's registry",stored(RFX.id).citations.length===cites+1&&made.source==="coast-notes"&&made.quote==="Spring tides run fastest.",JSON.stringify(made));
 chk("and puts its mark at the end of the definition",itemsNow()[0].body.en.endsWith("[^"+made.id+"]"),itemsNow()[0].body.en);
 const dims=byClass("dim",frameOf());
 chk("the preview draws the term's and the definition's marks at once",
   findAll(dims[0],n=>n.tagName==="strong").some(s=>byClass("rd-mark",s).some(m=>m.attrs["data-cite"]==="notes-neap"))
   &&byClass("rd-mark",dims[0]).some(m=>m.attrs["data-cite"]===made.id),flat(dims[0]));
 A.setEditing(false);A.render();
 const termMark=findAll(byClass("dim")[0],n=>n.tagName==="strong").flatMap(s=>byClass("rd-mark",s))[0];
 chk("read, a mark in a term is a numbered mark",!!termMark&&termMark.attrs["data-cite"]==="notes-neap"&&/^\d+$/.test(flat(termMark)));
 click(termMark);
 chk("and pressing it opens the side panel",panelOpen()&&/Neap tides come at the quarter moons/.test(flat(A.getPanel())),flat(A.getPanel()).slice(0,200));
 const defMark=byClass("rd-mark",byClass("dim")[0]).find(m=>m.attrs["data-cite"]===made.id);
 click(defMark);
 chk("so does a mark in a definition",panelOpen()&&/Spring tides run fastest/.test(flat(A.getPanel())));});

// ---- 2b. a mark belongs to its text in every language
console.log("# a citation mark belongs to its text in every language");
const MK={id:"fixture/polish-marks",title:{en:"Marks",fr:"Appels",es:"Llamadas"},
  sources:[{key:"book",title:"A Book",kind:"secondary"}],
  citations:[{id:"a",source:"book",page:1,quote:"Alpha."},{id:"b",source:"book",page:2,quote:"Beta."},{id:"c",source:"book",page:3,quote:"Gamma."}],
  mode:{id:"mk",kind:"guide",blocks:[
    {id:"p",type:"prose",text:{en:"First paragraph.[^a]\n\nSecond paragraph.[^b]",fr:"Premier paragraphe.\n\nDeuxième paragraphe.",es:"Primer párrafo.[^a]\n\nSegundo párrafo.[^b]"}},
    {id:"d",type:"deflist",items:[{label:{en:"Term[^c]",fr:"Terme"},body:{en:"Meaning.",fr:"Sens.[^b]"}}]},
    {id:"q",type:"quote",text:{en:"A line apart.[^b]",fr:"Une ligne à part."}},
    {id:"c1",type:"callout",kind:"diff",text:{en:"Set apart.[^a]",fr:"Mis à part."}},
    {id:"s",type:"sources"}]}};
const openMk=(mod,l,editing)=>{A.fresh();A.addModule(clone(mod||MK));A.setLang(l);A.setView("mk");A.setEditing(!!editing);A.render();};
const marksIn=root=>byClass("rd-mark",root).map(m=>m.attrs["data-cite"]+"="+flat(m)).join(" ");
const paras=()=>findAll(byClass("pblock")[0],n=>n.tagName==="p");
guard("drawing marks across languages",()=>{openMk(MK,"fr");
 chk("a language whose text lacks the marks still shows them, each at the end of the same paragraph",
   paras().length===2&&marksIn(paras()[0])==="a=1"&&marksIn(paras()[1])==="b=2"
   &&/Premier paragraphe\.\s*1/.test(flat(paras()[0])),paras().map(flat).join(" | "));
 chk("in a term, a quote and a callout too",
   marksIn(findAll(byClass("dim")[0],n=>n.tagName==="strong")[0])==="c=3"
   &&marksIn(byTag("blockquote")[0])==="b=2"&&marksIn(byClass("rd-callout")[0])==="a=1",
   [marksIn(byClass("dim")[0]),marksIn(byTag("blockquote")[0]),marksIn(byClass("rd-callout")[0])].join(" / "));
 chk("a mark the language does carry stays where it is written, and is not doubled",
   marksIn(byClass("dim")[0])==="c=3 b=2",marksIn(byClass("dim")[0]));
 click(byClass("rd-mark",paras()[1])[0]);
 chk("a carried mark opens its citation like any other",panelOpen()&&/Beta\./.test(flat(A.getPanel())));
 chk("the sources list counts it as cited",!/Pas citée/.test(flat(byClass("rd-sources")[0])),flat(byClass("rd-sources")[0]));
 openMk(MK,"es");
 chk("a language that carries every mark is drawn as written",marksIn(byClass("pblock")[0])==="a=1 b=2"&&byClass("rd-mark").length===6,marksIn(main()));
 openMk(MK,"en");
 chk("and so is the language the marks were written in",marksIn(byClass("pblock")[0])==="a=1 b=2"&&marksIn(byTag("blockquote")[0])==="b=2");
 chk("while a mark written only in French shows in English too",marksIn(byClass("dim")[0])==="c=3 b=2",marksIn(byClass("dim")[0]));
 const one=clone(MK);openMk(one,"fr");A.editTemplate(t=>{t.languages=["fr"];});A.render();
 chk("a booklet that declares one language reads no other language's marks",marksIn(main())==="b=1",marksIn(main()));
 const short=clone(MK);short.mode.blocks[0].text.fr="Un seul paragraphe.";openMk(short,"fr");
 chk("with fewer paragraphs, a mark goes to the end of the last one",marksIn(byClass("pblock")[0])==="a=1 b=2"&&paras().length===1,marksIn(byClass("pblock")[0]));
 openMk(MK,"fr");
 chk("drawing it writes nothing into the file",JSON.stringify(stored(MK.id).mode)===JSON.stringify(MK.mode));});
console.log("# the editor offers to put a mark into the block's other languages");
guard("the editor's prompt",()=>{openMk(MK,"en",true);
 const frameP=()=>byClass("bframe").find(f=>byClass("pblock",f).length);
 click(buttonIn(frameP(),"Edit"));
 const ed=()=>byClass("beditor",frameP())[0];
 const rows=()=>byClass("rd-lrow",ed());
 chk("under a text, a language that lacks its marks is named, with the marks it lacks",
   rows().length===1&&rows()[0].attrs["data-lang"]==="fr"&&/Not yet in the French text: \[\^a\] \[\^b\]/.test(flat(rows()[0])),rows().map(flat).join(" | "));
 chk("a language that carries them is not",!rows().some(r=>r.attrs["data-lang"]==="es"));
 click(buttonIn(rows()[0],"Add to the French text"));
 chk("adding them puts each at the end of the same paragraph there",
   stored(MK.id).mode.blocks[0].text.fr==="Premier paragraphe.[^a]\n\nDeuxième paragraphe.[^b]",stored(MK.id).mode.blocks[0].text.fr);
 chk("and the prompt goes",rows().length===0&&byClass("rd-langs",ed())[0].hasAttribute("hidden"));
 chk("the English is untouched",stored(MK.id).mode.blocks[0].text.en===MK.mode.blocks[0].text.en);
 const ta=fieldsIn(ed())[0];const tool=byClass("rd-tool",ed())[0];
 findAll(tool,n=>n.tagName==="select")[0].value="c";ta.selectionEnd=ta.value.indexOf(".[^a]");
 click(buttonIn(tool,"Insert its mark"));
 chk("a mark inserted in one language goes into that language",stored(MK.id).mode.blocks[0].text.en.startsWith("First paragraph[^c].[^a]"),stored(MK.id).mode.blocks[0].text.en);
 chk("and at once the editor names every other language that lacks it",
   rows().map(r=>r.attrs["data-lang"]).sort().join()==="es,fr"&&rows().every(r=>/\[\^c\]/.test(flat(r))),rows().map(flat).join(" | "));
 ta.value=ta.value.replace("[^c]","");ta._on.input();
 chk("taking it out again, by typing, takes the prompt away",rows().length===0,rows().map(flat).join(" | "));
 ta.value="First paragraph.[^a][^c]\n\nSecond paragraph.[^b]";ta._on.input();
 click(buttonIn(rows().find(r=>r.attrs["data-lang"]==="es"),"Add to the Spanish text"));
 chk("each language is offered on its own",stored(MK.id).mode.blocks[0].text.es==="Primer párrafo.[^a][^c]\n\nSegundo párrafo.[^b]"
   &&!/\[\^c\]/.test(stored(MK.id).mode.blocks[0].text.fr),stored(MK.id).mode.blocks[0].text.es);
 A.setEditing(false);A.setLang("fr");A.setEditing(true);A.render();
 click(buttonIn(frameP(),A.T.fr.blockEdit.edit));
 chk("editing the French, the mark it lacks is named as the English text's",
   rows().length===1&&/In the English text but not in this one: \[\^c\]/.test(flat(rows()[0]))||
   rows().length===1&&/Dans le texte en anglais, mais pas dans celui-ci : \[\^c\]/.test(flat(rows()[0])),rows().map(flat).join(" | "));
 const fta=fieldsIn(ed())[0];fta.selectionEnd=fta.value.indexOf(".[^a]");
 click(findAll(rows()[0],n=>n.tagName==="button")[0]);
 chk("and inserting it here puts it at the cursor, in French",
   stored(MK.id).mode.blocks[0].text.fr==="Premier paragraphe[^c].[^a]\n\nDeuxième paragraphe.[^b]",stored(MK.id).mode.blocks[0].text.fr);
 chk("after which nothing is missing anywhere",rows().length===0);
 A.setEditing(false);});
guard("the definition list's prompts",()=>{openMk(MK,"en",true);
 const frameD=()=>byClass("bframe").find(f=>byClass("dims",f).length);
 click(buttonIn(frameD(),"Edit"));
 const rows=byClass("rd-lrow",byClass("beditor",frameD())[0]);
 chk("a definition list checks its term and its definition each",
   rows.length===2&&/\[\^c\]/.test(flat(rows[0]))&&/French/.test(flat(rows[0]))&&/\[\^b\]/.test(flat(rows[1]))&&/French/.test(flat(rows[1])),rows.map(flat).join(" | "));
 A.setEditing(false);});
guard("a text with no marks",()=>{const plain={id:"fixture/polish-plain",title:{en:"Plain"},mode:{id:"pl",kind:"guide",blocks:[{id:"p",type:"prose",text:{en:"Plain.",fr:"Simple."}}]}};
 A.fresh();A.addModule(clone(plain));A.setView("pl");A.setEditing(true);A.render();
 click(buttonIn(byClass("bframe").find(f=>byClass("pblock",f).length),"Edit"));
 chk("a text with no marks in any language has no prompt",!byClass("rd-lrow").length&&byClass("rd-tool").length===1);
 A.setEditing(false);});
{const keys=["notThere","addThere","notHere","addHere","citeWhere"];
 chk("every new interface string is in English, French and neutral Spanish",
   ["en","fr","es"].every(l=>keys.every(k=>A.TSRC[l].reading[k]!==undefined)),keys.filter(k=>!A.TSRC.fr.reading[k]||!A.TSRC.es.reading[k]).join());
}

// ---- 3. the citation panel and the sources block (found by the final browser sweep)
console.log("# the open panel makes room for itself beside the page (layout checked in a real browser too)");
const root=()=>global.document.documentElement;
const RA=load(src);           // a page load of its own, for the panel's state
const Rmain=()=>global.document.getElementById("main");
const Rmarks=id=>findAll(Rmain(),n=>hasClass(n,"rd-mark")&&(!id||n.attrs["data-cite"]===id));
const Rpanel=()=>RA.getPanel();
const Ropen=()=>!!Rpanel()&&!Rpanel().hasAttribute("hidden");
const openRA=(mod,page,l)=>{RA.fresh();RA.addModule(clone(mod||RFX));RA.setLang(l||"en");RA.setView(RACT);RA.showPage(RACT,page||"read");RA.render();};
const pressKey=(n,k)=>n._on.keydown({key:k,target:n,currentTarget:n,preventDefault(){},stopPropagation(){}});
guard("the panel's room",()=>{openRA();
 chk("closed, the page claims no room for it",!("data-cite-open" in root().attrs));
 click(Rmarks("atlas-twice")[0]);
 chk("open, the page says so, for the layout to make room",Ropen()&&"data-cite-open" in root().attrs);
 const css=(html.match(/@media \(min-width:900px\)\{[^\n]*data-cite-open[^\n]*/)||[""])[0];
 chk("from 900px up the page moves over by the panel's width, and the panel is that wide",
   /\[data-cite-open\] \.page\{margin-right:calc\(var\(--rd-w\)/.test(html)&&/\.rd-panel\{[^}]*width:var\(--rd-w\)/.test(html)&&!!css,css.slice(0,160));
 chk("below it the panel is a bottom sheet over the page, as on a phone",/@media \(max-width:899px\)\{\s*\/\*[^*]*\*\/\s*\.rd-panel\{top:auto/.test(html));
 click(findAll(Rpanel(),n=>n.tagName==="button"&&hasClass(n,"rd-x"))[0]);
 chk("closed again, the room is given back",!Ropen()&&!("data-cite-open" in root().attrs));
 click(Rmarks("atlas-twice")[0]);RA.setView("home");RA.render();
 chk("leaving the activity closes the panel and gives the room back",!Ropen()&&!("data-cite-open" in root().attrs));});
console.log("# switching the interface language keeps the panel open, in the new language");
guard("a language switch",()=>{openRA(null,"read","en");
 const second=Rmarks("atlas-spring")[1];click(second);
 const langButton={tagName:"button",lang:true};global.__focused=langButton;
 RA.setLang("fr");RA.render();
 const t=flat(Rpanel());
 chk("the panel stays open",Ropen(),t.slice(0,120));
 chk("drawn again in French: heading, kind of source, pages and badge",/Référence 2/.test(t)&&/Source primaire/.test(t)&&/Page 47 \(page 53 du PDF\)/.test(t)&&/Vérifiée le/.test(t)&&!/Citation 2|Primary source|Verified on/.test(t),t);
 chk("the focus stays where the reader put it",global.__focused===langButton);
 const now=Rmarks("atlas-spring");
 chk("and it belongs to the same mark, redrawn",now[1].attrs["aria-expanded"]==="true"&&now.filter(m=>m.attrs["aria-expanded"]==="true").length===1);
 pressKey(Rpanel(),"Escape");
 chk("Escape then closes it and puts the focus on that mark",!Ropen()&&global.__focused===Rmarks("atlas-spring")[1]);
 click(Rmarks("atlas-twice")[0]);RA.setLang("es");RA.render();
 chk("and again into Spanish",Ropen()&&/Cita 1/.test(flat(Rpanel()))&&/Fuente primaria/.test(flat(Rpanel())),flat(Rpanel()).slice(0,120));
 RA.showPage(RACT,"sources");RA.render();
 chk("turning the page still closes it, as before",!Ropen());});
console.log("# the sources block leads back to every place a citation is marked");
const backsOf=(root,id)=>findAll(findAll(root,n=>n.tagName==="li"&&n.attrs["data-cite"]===id)[0],n=>n.tagName==="button"&&hasClass(n,"rd-back"));
guard("every place",()=>{openRA(null,"sources");
 const box=findAll(Rmain(),n=>hasClass(n,"rd-sources"))[0];
 const three=backsOf(box,"atlas-spring");
 chk("a citation marked three times has three ways back",three.length===3,three.length);
 chk("each named for its place",three.map(b=>b.attrs["aria-label"]).join(" | ")===
   "Back to citation 2 in the text, place 1 of 3 | Back to citation 2 in the text, place 2 of 3 | Back to citation 2 in the text, place 3 of 3",three.map(b=>b.attrs["aria-label"]).join(" | "));
 const once=backsOf(box,"act-s12");
 chk("a citation marked once keeps its one way back, named as before",once.length===1&&once[0].attrs["aria-label"]==="Back to citation 4 in the text");
 global.__focused=null;click(three[2]);
 const marks=Rmarks("atlas-spring");
 chk("the third goes to the third place: the page turned, and that mark focused",
   RA.getView()===RACT&&RA.currentPage(RACT).id==="read"&&marks.length===3&&global.__focused===marks[2]&&findAll(byClass("dim",Rmain())[0],n=>n===marks[2]).length===1,
   global.__focused&&global.__focused.attrs&&global.__focused.attrs["data-cite"]);
 openRA(null,"sources");global.__focused=null;click(backsOf(findAll(Rmain(),n=>hasClass(n,"rd-sources"))[0],"atlas-spring")[1]);
 chk("the second to the second, in the quote",global.__focused===Rmarks("atlas-spring")[1]&&findAll(byTag("blockquote",Rmain())[0],n=>n===global.__focused).length===1);
 /* the definition list moved to the sources page: its mark is then on another page */
 const split=clone(RFX);const read=split.mode.pages[0].blocks,src2=split.mode.pages[1].blocks;
 src2.unshift(read.splice(read.findIndex(b=>b.id==="terms"),1)[0]);
 openRA(split,"sources");
 const bs=backsOf(findAll(Rmain(),n=>hasClass(n,"rd-sources"))[0],"atlas-spring");
 global.__focused=null;click(bs[2]);
 chk("a place on the page on show is reached without turning",RA.currentPage(RACT).id==="sources"&&global.__focused===Rmarks("atlas-spring")[0]);
 global.__focused=null;click(backsOf(findAll(Rmain(),n=>hasClass(n,"rd-sources"))[0],"atlas-spring")[0]);
 chk("and one on another page turns to it",RA.currentPage(RACT).id==="read"&&global.__focused===Rmarks("atlas-spring")[0]&&!!global.__focused);});

console.log(fails?`\n${fails} failed`:"\npolish checks passed");
process.exit(fails?1:0);
