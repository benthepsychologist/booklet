"use strict";
/* compile/draw.js: a booklet's design, drawn as one plain web page.

   The page is the renderer's print view made a web page (SPEC.md section 3, "a renderer with no tab bar"): every shown
   activity in file order, each under its title; its tabs one after another, each under its name; its pages run on with a
   quiet divider; its folds as <details>; its footnotes as numbered marks with the notes at the foot; its questions and
   widgets read-only, showing what they ask and offer with nothing to press. Prose is drawn by the renderer's own Markdown
   engine (engine.js hands it this file's hooks for images, marks, math, figures and links), and every decision about
   the design (what is shown, a callout's look, a heading link's target, a citation's source) is the renderer's own helper,
   called by name. This file decides only the markup.

   What it cannot draw yet it marks: an HTML comment at the spot, and a line in the report (MARKED, below).
   It is handed the design and nothing else: no records, no drafts, no source text. */
const H=require("./html.js");
const {el,frag,trusted,comment}=H;

/* The compiler's own words: the few a page needs that the renderer has no string for. Every other word on the page
   (Hint, Solution, Notes, a callout kind's name, "About this module", an image's note) is the renderer's, in the
   booklet's language. */
const PAGE_WORDS={
  en:{toc:"On this page",back:"Back to the text",anchor:"Link to this section"},
  fr:{toc:"Sur cette page",back:"Retour au texte",anchor:"Lien vers cette section"},
  es:{toc:"En esta página",back:"Volver al texto",anchor:"Enlace a esta sección"}};

/* How each of the renderer's tables is handled: "drawn", or a reason it is marked instead. test/compile-coverage.test.js
   fails when the renderer has a block type, question kind, engine or query view that is in neither. Callout kinds are
   all drawn, each in its own look (CALLOUT_LOOK), and an unknown kind is marked and drawn as the renderer draws it. */
const COVERAGE={
  blocks:{markdown:"drawn",callout:"drawn",row:"drawn",widget:"drawn",text:"drawn",lines:"drawn",choice:"drawn",
    multi:"drawn",scale:"drawn",matrix:"drawn",number:"drawn",date:"drawn",
    query:"marked: a query view is not compiled yet (compile 0.2)"},
  engines:{"grid-select":"drawn","svg-regions":"drawn: its places by name; its figure is marked (compile 0.2)"},
  views:{cards:"marked",table:"marked",list:"marked",tiles:"marked",bars:"marked",line:"marked"}};
/* the things the page leaves off, and why, as the report and the comments word them */
const MARKED={
  query:"a query view: not compiled yet",
  mermaid:"a diagram: not compiled yet, shown as its source",
  regionsFigure:"the body map's figure: not compiled yet; its places are named below it",
  link:"a link to a booklet not compiled with this one: drawn as its words",
  each:"a question asked for each pick in another: not compiled",
  kind:"an unknown callout kind: drawn as a note, with the renderer's line saying the kind is not known",
  engine:"a widget whose engine this compiler does not draw: left off",
  widget:"a widget block whose widget is not in the file: left off",
  block:"a block this compiler does not know: left off",
  heading:"a link to a heading that is not on this page: drawn as its words",
  brokenMark:"a citation mark that names no note in its module: drawn as [?id]",
  openingMark:"a citation mark in the booklet's opening, where the renderer draws none: left off",
  image:"an image that is not drawn: its words and address are shown instead",
  theme:"the booklet's own look: not compiled yet (compile 0.2); the page takes the stylesheet's"};

const HEAD=/^h([1-6])$/;
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

/* drawPage(X, parsed, o): the page's article and what the page and the report need.
   o: {name, form: "standalone"|"site", siblings: Map of the addresses compiled in the same run to their titles, image(rel, ext) ->
   {ok} | {ok:false, why: a renderer ui string's name, detail}}. */
function drawPage(X,P,o){
  const R=X.R,M=X.M,design=P.design;
  X.setBook(design);
  const ui=R.tableTag(P.lang)||"en";
  X.setLang(ui);
  const T=g=>R.strings(g),W=PAGE_WORDS[ui.split("-")[0]]||PAGE_WORDS.en;
  const st={refs:[],pend:[],notes:[],noteBy:new Map(),heads:new Map(),mtabs:new Map(),modHead:new Map(),
    marked:[],images:[],links:[],counts:{modules:0,activities:0,callouts:0,folds:0,questions:0,widgets:0,images:0,math:0,notes:0,links:0},
    where:"",scope:"",reg:null,regKey:null,act:null,lede:null,ledeAt:null};
  const tx=(v,f)=>R.tx(v,f),plain=v=>R.plainText(tx(v,""));
  const pageTitle=plain(design.title)||plain((design.modules[0]||{}).title)||o.name;

  /* ---- marks: what the page leaves off ---- */
  const mark=(kind,what)=>{st.marked.push({kind,what,where:st.where});
    return comment("booklet: "+what+" ("+st.where+"): "+MARKED[kind]);};

  /* ---- the renderer's Markdown engine, with this page's hooks ---- */
  const modsHere=()=>design.modules.filter(m=>R.scopeOfModule(m)===st.scope);
  const headingLink=(hit,kids)=>{const a=el("a",{class:"bk-link"},...kids);st.pend.push({a,hit,where:st.where});return a;};
  const linkHooks={
    link:(target,label)=>{if(M.isModuleLink(target)) return moduleLink(target,label!==undefined?[label]:null);
      if(target[0]!=="#"||target[1]==="^") return null;
      const h=target.slice(1).trim(),text=label!==undefined?label:h,hit=R.findHeading(modsHere(),h,false);
      return hit?headingLink(hit,[text]):text;},
    anchor:(slug,kids)=>{const hit=R.findHeading(modsHere(),slug,true);return hit?headingLink(hit,kids):M.textOf(kids);},
    moduleLink:(target,kids)=>moduleLink(target,kids)};
  const proseOpts=()=>({idPrefix:"",image,mark:noteMark,math,embed,...linkHooks,
    fence:(lang,code)=>lang==="mermaid"?diagram(code,"a mermaid fence"):null});
  /* a booklet line's words (a title, a label, help, an option): inline Markdown as the renderer's words() reads it, an image
     as its alt text, no citation mark; `flat` (inside a fold's summary, an option) a link as its words */
  const labelOpts=flat=>({...R.PLAIN_OPTS,math:tex=>math(tex,false),anchor:(h,k)=>M.textOf(k),flat:!!flat,...(flat?{}:linkHooks)});
  const words=(s,flat)=>{const t=String(s==null?"":s);return M.renderInline(t,{opts:labelOpts(flat),refs:Object.create(null)});};
  const prose=text=>tidyProse(M.mdNodes(String(text==null?"":text),proseOpts()));

  /* the engine's own classes renamed into the compiler's, its tables wrapped so a wide one scrolls on its own, and a
     paragraph that holds a block (a figure embedded in a line) split around it */
  function tidyProse(nodes){const out=[];
    const BLOCKISH=["pre","div","figure","table","ul","ol"];
    const blockish=k=>k instanceof H.Node&&(BLOCKISH.includes(k.tag)||k.tag===""&&k.kids.some(blockish));
    for(const n of nodes){
      H.walk(n,x=>{if(x instanceof H.Node&&x.attrs.class==="num") x.attrs.class="bk-num";});
      if(n instanceof H.Node&&n.tag==="table") out.push(el("div",{class:"bk-table"},n));
      else if(n instanceof H.Node&&n.tag==="p"&&n.kids.some(blockish)){
        let cur=el("p",{});const flush=()=>{const k=cur.kids,n=k.length;if(n&&typeof k[n-1]==="string") k[n-1]=k[n-1].replace(/\s+$/,"");
          if(n&&typeof k[0]==="string") k[0]=k[0].replace(/^\s+/,"");
          if(k.some(x=>typeof x!=="string"||x.trim())) out.push(cur);cur=el("p",{});};
        for(const k of n.kids){if(blockish(k)){flush();out.push(k);}else cur.kids.push(k);}
        flush();}
      else out.push(n);}
    return out;}

  /* ---- images: a relative path by the renderer's rule, the file checked by compile.js; anything else as words ---- */
  function image(alt,src){
    const a=String(src==null?"":src).replace(/[\u0000-\u001f\u007f-\u009f]/g,""),shown=a.length>160?a.slice(0,160)+"…":a;
    const box=note=>frag(comment("booklet: "+(alt?"the image “"+alt+"”":"an image")+" at "+JSON.stringify(shown)+" ("+st.where+"): "+MARKED.image),
      el("span",{class:"bk-imgbox"},alt?el("span",{class:"bk-imgalt"},alt):null,el("span",{class:"bk-imgnote"},note),
        shown?el("code",{class:"bk-imgsrc"},shown):null));
    const p=R.imagePath(a);
    if(!p){st.images.push({src:shown,ok:false,where:st.where,why:"not a relative path the renderer reads (letters, digits, _ . / -; no leading /, no part starting with a dot; an image extension)"});
      return box(T("ui").imgNotShown);}
    const r=o.image(p.rel,p.ext);
    if(!r.ok){st.images.push({src:p.rel,ok:false,where:st.where,why:r.detail||r.why});return box(T("ui")[r.why]||T("ui").imgNotShown);}
    st.images.push({src:p.rel,ok:true});st.counts.images++;
    return el("img",{src:p.rel,alt:alt||""});}

  /* ---- math, as MathML at build time; a formula Temml cannot read is shown as its TeX ---- */
  function math(tex,display){st.counts.math++;let ml=null;
    try{ml=X.temml.renderToString(String(tex),{displayMode:!!display,throwOnError:true,trust:false});}catch(e){ml=null;}
    const cls="bk-math"+(display?" bk-math-display":"");
    if(typeof ml!=="string"||!/^<math[\s>]/.test(ml)) return el("span",{class:cls+" bk-math-raw"},String(tex));
    /* Temml writes a display formula's one style as an inline style attribute; booklet.css sets the same thing
       (.bk-math-display math), so a host whose security policy refuses inline styles draws it the same */
    ml=ml.replace(/^(<math\b[^>]*?) style="display:block math;"/,"$1");
    return el("span",{class:cls},trusted(ml));}

  /* ---- figures: a prose embed (![[#^id]]) read by the renderer's figureHooks; a diagram is marked, anything else is code ---- */
  function embed(t){const f=R.figureHooks(st.scope).embed(t);
    if(!f||!f.__figure) return null;
    const g=f.__figure;
    if(g.lang==="mermaid") return diagram(g.code,"the figure “"+g.id+"”");
    return el("pre",{},el("code",g.lang?{"data-lang":g.lang}:{},g.code));}
  const diagram=(code,what)=>frag(mark("mermaid",what),el("pre",{class:"bk-figure-src"},el("code",{"data-lang":"mermaid"},String(code))));

  /* ---- links to a whole module (SPEC.md section 3) ---- */
  function moduleLink(target,kids){const id=R.moduleLinkId(target);
    if(!id) return kids&&kids.length?M.textOf(kids):String(target);
    const mod=R.fencedModule(id,design.modules);
    if(mod){st.counts.links++;const a=el("a",{class:"bk-link"},...(kids&&kids.length?kids:words(tx(mod.title,id),true)));
      st.refs.push({a,to:()=>st.modHead.get(mod.id)||st.top});return a;}
    if(o.siblings&&o.siblings.has(id)&&/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)){st.counts.links++;st.links.push({to:id,where:st.where});
      return el("a",{class:"bk-link",href:"../"+id+"/"},...(kids&&kids.length?kids:[String(o.siblings.get(id)||id)]));}
    return frag(mark("link","the link to “"+id+"”"),...(kids&&kids.length?kids:[id]));}

  /* ---- citation marks: numbered on the page in reading order, the notes at its foot ---- */
  function noteMark(id){
    if(!st.reg) return mark("openingMark","the mark [^"+id+"]");
    const c=st.reg.cites.get(id),Rt=T("reading");
    if(!c) return frag(mark("brokenMark","the mark [^"+id+"]"),el("span",{class:"bk-broken",title:Rt.broken(id)},"[?"+id+"]"));
    const key=st.regKey+"\u0000"+id;let n=st.noteBy.get(key);
    if(!n){n={n:st.notes.length+1,c,src:st.reg.sources.get(c.source)||null,first:null,li:null};st.notes.push(n);st.noteBy.set(key,n);}
    const a=el("a",{class:"bk-mark-a","aria-label":Rt.mark(n.n)},String(n.n));
    if(!n.first){n.first=a;a.attrs.id="bk-ref-"+n.n;}
    st.refs.push({a,to:()=>n.li});
    return el("sup",{class:"bk-mark"},a);}
  /* a note as the renderer's endnote reads it (citeRefText), with the source's title as a <cite> and the verified badge */
  function noteBody(n){const Rt=T("reading"),c=n.c,src=n.src,out=[];
    const q=tx(c.quote,""),pl=R.pageLine(c,Rt);
    if(R.plainRef(c,src)){if(R.nonEmpty(q)) out.push(q);if(pl) out.push((out.length?". ":"")+pl);}
    else{
      if(src){const ed=tx(src.edition,"");out.push(el("cite",{},tx(src.title,src.key)),R.nonEmpty(ed)?", "+ed:"");}
      else out.push(el("span",{class:"bk-bad"},Rt.noSource(String(c.source==null?"":c.source))));
      if(pl) out.push(". "+pl);
      if(R.nonEmpty(q)) out.push(". ",el("q",{class:"bk-quote"},q));}
    if(R.hasVal(c.verifiedOn)) out.push(" ",el("span",{class:"bk-verified"},"✓ "+Rt.verified(R.longDate(String(c.verifiedOn).trim()))
      +(R.hasVal(c.verifiedBy)?" ("+Rt.how+": "+String(c.verifiedBy).trim()+")":"")));
    return out;}

  /* ---- icons, from the renderer's own sprite ---- */
  const icon=name=>{const inner=X.icons[name];if(!inner) return null;
    return el("span",{class:"bk-ci","aria-hidden":"true"},trusted('<svg class="bk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+inner+"</svg>"));};

  /* ---- blocks ---- */
  /* a list of blocks drawn; a block that draws as several nodes (prose, a mark and what it marks) stands as those nodes */
  const blocks=list=>(Array.isArray(list)?list:[]).map(block).filter(x=>x!=null).flatMap(x=>x instanceof H.Node&&x.tag===""?x.kids:[x]);
  function block(b){
    if(!b||typeof b!=="object") return null;
    if(R.QUESTION_KINDS.has(b.type)&&b.each){st.counts.questions++;return mark("each","the question “"+(plain(b.label)||b.id)+"”");}
    let node;
    switch(b.type){
      case "markdown":node=frag(...prose(b.text));break;
      case "callout":return callout(b);
      case "row":node=el("div",{class:"bk-row"},...R.blocksIn(b).map(c=>el("div",{class:"bk-rowcell"},...blocks(R.blocksIn(c)))));break;
      case "query":return mark("query","the query"+(b.from?" over “"+String(b.from)+"”":"")+(b.view&&b.view.as?", as "+String(b.view.as):""));
      case "widget":node=widget(b);break;
      case "text":case "lines":case "number":case "date":case "choice":case "multi":case "scale":case "matrix":node=question(b);break;
      default:return mark("block","the “"+String(b.type)+"” block “"+String(b.id||"?")+"”");}
    if(R.QUESTION_KINDS.has(b.type)&&node instanceof H.Node&&node.tag==="div") R.qParts(b).forEach(p=>node.append(fold(p,true)));
    if(b.type!=="callout"&&R.placeOf(b)==="folded"){st.counts.folds++;
      return el("details",{class:"bk-fold bk-plain"},el("summary",{},el("span",{class:"bk-ftitle"},...words(R.foldName(b),true))),el("div",{class:"bk-cb"},node));}
    return node;}

  /* a callout drawn where it stands: its kind's colour, picture and word, its title, its body */
  function callout(b){
    const grp=R.isGroup(b),unknown=!!b.unknown;
    const flag=unknown?mark("kind","the callout kind “"+String(b.kind)+"”"):null;
    if(R.placeOf(b)==="folded") return flag?frag(flag,fold(b,false)):fold(b,false);
    st.counts.callouts++;
    const title=tx(b.title,""),body=el("div",{class:"bk-cb"},...blocks(R.blocksIn(b)));
    if(grp) return el("section",{class:"bk-group"},R.nonEmpty(title)?el("p",{class:"bk-gtitle"},...words(title)):null,body);
    /* as the renderer's calloutNode: a hint or solution drawn outside its question is plain; an unknown kind takes the
       note's look (calloutLook's own fallback) and the renderer's line saying the kind is not known */
    const look=b.outside?null:R.calloutLook(b.kind);
    const box=el("aside",{class:"bk-callout"+(look?" bk-hue-"+look.hue+" bk-k-"+look.label:" bk-plain"),role:"note"},
      look?el("p",{class:"bk-chead"},icon(look.icon),el("span",{class:"bk-cl"},T("reading").kind[look.label]||look.label)):null,
      R.nonEmpty(title)?el("p",{class:"bk-ctitle"},...words(title)):null,
      unknown?el("p",{class:"bk-unknown"},T("reading").unknownKind(String(b.kind))):null,body);
    return flag?frag(flag,box):box;}
  /* a callout folded with "-", or a question's own hint or solution (inQ): a <details>, closed, that opens with no script */
  function fold(b,inQ){st.counts.folds++;
    const hs=R.hintKind(b),k=String(b.kind==null?"":b.kind).toLowerCase();
    const look=hs||!hasOwn(R.CALLOUT_LOOK,k)?null:R.calloutLook(b.kind),word=look||(hs?null:R.calloutLook(b.kind));
    const named=tx(b.title,"");
    const body=blocks(R.blocksIn(b));
    if(b.unknown) body.unshift(el("p",{class:"bk-unknown"},T("reading").unknownKind(String(b.kind))));
    let title=R.nonEmpty(named)?named:hs?T("cards")[hs]:word&&!R.isGroup(b)?T("reading").kind[word.label]:R.foldName(b);
    /* an untitled group is named by the first words of what it holds */
    if(R.isGroup(b)&&!R.nonEmpty(named)){let first="";
      H.walk(body,x=>{if(first) return false;if(x instanceof H.Node&&(x.tag==="p")){first=H.textOf(x);return false;}});
      if(!first){const q=R.blocksAll(R.blocksIn(b)).find(R.isQuestion);if(q) first=plain(q.label);}
      if(R.nonEmpty(first)) title=R.clip(first,80);}
    const pic=look?icon(look.icon):hs?icon(hs==="hint"?"lightbulb":"circle-check"):null;
    const cls="bk-fold"+(hs?" bk-compact bk-"+hs:look?" bk-hue-"+look.hue+" bk-k-"+look.label:" bk-plain");
    return el("details",{class:cls},el("summary",{},pic,el("span",{class:"bk-ftitle"},...words(title,true))),el("div",{class:"bk-cb"},...body));}

  /* ---- questions, read-only: what they ask and what they offer, nothing to press ---- */
  function qHead(box,label,help){
    const head=tx(label,"");if(R.nonEmpty(head)) box.append(el("p",{class:"bk-q-ask"},...words(head)));
    const h=tx(help,"");if(R.nonEmpty(h)) box.append(el("p",{class:"bk-q-help"},...words(h)));}
  function question(b){st.counts.questions++;
    const box=el("div",{class:"bk-q bk-q-"+b.type});qHead(box,b.label,b.help);
    if(b.type==="choice"||b.type==="multi"){
      const ul=el("ul",{class:"bk-options "+(b.type==="multi"?"bk-pick-many":"bk-pick-one")},
        ...(b.options||[]).map(x=>el("li",{},...words(x,true))));
      if(b.open) ul.append(el("li",{class:"bk-own"},T("question").addOwn));
      box.append(ul);}
    else if(b.type==="scale") box.append(el("ul",{class:"bk-scale"},...(b.anchors||[]).map(a=>el("li",{},...words(a.text,true)))));
    else if(b.type==="matrix"){const anchors=b.anchors||[];
      box.append(el("div",{class:"bk-table"},el("table",{class:"bk-matrix"},
        el("thead",{},el("tr",{},el("td",{}),...anchors.map(a=>el("th",{scope:"col"},...words(a.text,true))))),
        el("tbody",{},...(b.items||[]).map(it=>el("tr",{},el("th",{scope:"row"},...words(it)),...anchors.map(()=>el("td",{"aria-hidden":"true"},"○"))))))));}
    return box;}

  /* ---- widgets, read-only, as their engine's `readonly` describes them (SPEC.md section 7) ---- */
  function widget(b){st.counts.widgets++;
    const Wd=R.widgetIn(design.widgets||[],b.widget,b.module);
    if(!Wd) return mark("widget","the widget block “"+(b.id||"?")+"” (widget “"+String(b.widget||"?")+"”)");
    const eng=String(Wd.engine||"");
    if(!hasOwn(R.ENGINES,eng)||!hasOwn(ENGINE_DRAW,eng)) return mark("engine","the widget “"+String(Wd.id||b.widget)+"” (engine “"+eng+"”)");
    const C=R.wordsOf(Wd.copy),box=el("div",{class:"bk-q bk-widget bk-w-"+eng});
    qHead(box,tx(b.label,C.h),tx(b.help,C.p));
    [C.stance,C.invite].filter(R.nonEmpty).forEach(x=>box.append(el("p",{class:"bk-q-hint"},x)));
    ENGINE_DRAW[eng](box,Wd,R.engOpts(b));
    return box;}
  const ENGINE_DRAW={
    /* the grid: its axes, its cells in their colour names (or a quiet ramp by position), its items as words, and with
       `describe` each cell's note */
    "grid-select":(box,Wd,op)=>{const cells=Wd.cells||[],ax=Wd.axes||{},tone=(c,i)=>{const t=R.colourOf(c);return t?"bk-c-"+t:"bk-c-n"+(i%6);};
      const axis=(side,v)=>R.nonEmpty(tx(v,""))?el("p",{class:"bk-ax bk-ax-"+side},tx(v,"")):el("span",{class:"bk-ax bk-ax-"+side});
      box.append(el("div",{class:"bk-grid"},axis("top",ax.top),axis("left",ax.left),
        el("div",{class:"bk-cells"},...cells.map((c,i)=>el("div",{class:"bk-cell "+tone(c,i)},el("p",{class:"bk-cell-name"},tx(c.label,c.id)),
          el("ul",{class:"bk-words"},...(Wd.items||[]).filter(it=>it.cell===c.id).map(it=>el("li",{},tx(it.label,it.id))))))),
        axis("right",ax.right),axis("bottom",ax.bottom)));
      if(op.describe&&cells.some(c=>c.note)) box.append(el("dl",{class:"bk-notes-of"},...cells.map((c,i)=>
        el("div",{class:"bk-cell "+tone(c,i)},el("dt",{},tx(c.label,c.id)),el("dd",{},tx(c.note,""))))));},
    /* the body map: its places named, figure by figure; the figure itself is marked (compile 0.2 draws it) */
    "svg-regions":(box,Wd,op)=>{const figs=Wd.figures||[],labelOf=id=>{const r=(Wd.regions||[]).find(x=>x.id===id);return r?tx(r.label,id):id;};
      const list=ids=>el("ul",{class:"bk-words"},...ids.map(id=>el("li",{},labelOf(id))));
      if(!figs.length) box.append(list((Wd.regions||[]).map(r=>r.id)));
      figs.forEach(f=>{box.append(mark("regionsFigure","the figure “"+String(f.id)+"” of the widget “"+String(Wd.id||"")+"”"));
        if(figs.length>1) box.append(el("p",{class:"bk-places-h"},tx(f.label,f.id)));
        box.append(list(f.regions||[]));});
      if(op.describe&&(Wd.regions||[]).some(r=>r.note)) box.append(el("dl",{class:"bk-notes-of"},...(Wd.regions||[]).filter(r=>r.note).map(r=>
        el("div",{class:"bk-cell bk-c-plain"},el("dt",{},tx(r.label,r.id)),el("dd",{},tx(r.note,""))))));}};

  /* ---- headings: the booklet's shallowest is one below its container, deeper ones keep their depth ---- */
  const levelOf=n=>n instanceof H.Node?+((HEAD.exec(n.tag)||[])[1]||0):0;
  function level(nodes,base){let min=7;
    for(const n of nodes){const L=levelOf(n);if(L&&L<min) min=L;}
    if(min===7) H.walk(nodes,x=>{const L=levelOf(x);if(L&&L<min) min=L;});
    if(min===7) return nodes;
    const by=base-min;
    H.walk(nodes,x=>{const L=levelOf(x);if(L) x.tag="h"+Math.max(Math.min(base,6),Math.min(6,L+by));});
    return nodes;}
  const heading=(lv,kids,cls)=>el("h"+Math.min(6,lv),cls?{class:cls}:{},...kids);
  /* a section of blocks drawn at `base`; `title`: the words a leading heading would repeat, drawn once */
  function section(list,base,title){const nodes=blocks(list);
    if(title) dropTitle(nodes,title);
    return level(nodes,base);}
  /* "draw the title once": the first heading that repeats the title above it is dropped, as the renderer drops it */
  function dropTitle(nodes,title){let first=null;
    H.walk(nodes,x=>{if(first) return false;if(levelOf(x)){first=x;return false;}});
    if(first&&R.sameWords(H.textOf(first).replace(/\s+/g," "),String(title).replace(/\s+/g," "))) H.removeFirst(nodes,x=>x===first);}
  /* the first paragraph under a title, drawn larger in place (the lede); the page's first one is its description */
  function lede(nodes){const f=nodes.find(n=>!(n instanceof H.Comment)&&!(typeof n==="string"&&!n.trim()));
    let p=f;if(p instanceof H.Node&&p.tag==="") p=p.kids.find(k=>!(typeof k==="string"&&!k.trim()));
    if(p instanceof H.Node&&p.tag==="p"){p.attrs.class=(p.attrs.class?p.attrs.class+" ":"")+"bk-lede";if(!st.lede) st.lede=p;}}

  /* ---- an activity's headings, for links to them (findHeading says which activity; this finds the node) ---- */
  const norm=s=>R.linkNorm(s);
  function noteHeads(addr,nodes,title,tabs){const r={title,tabs:new Map(),text:new Map()};
    (tabs||[]).forEach(([t,n])=>{if(!r.tabs.has(norm(t))) r.tabs.set(norm(t),n);});
    H.walk(nodes,x=>{if(!(x instanceof H.Node)) return;
      const cls=String(x.attrs.class||"");
      if(levelOf(x)||/\bbk-(q-ask|ctitle|gtitle|ftitle)\b/.test(cls)){const t=norm(H.textOf(x));if(t&&!r.text.has(t)) r.text.set(t,x);}});
    st.heads.set(addr,r);}

  /* ---- an activity, drawn whole ---- */
  function activity(a,base,ownHead,titleNode,titleText,first){
    st.act=a.id;st.where="activity “"+(plain(a.title)||a.id)+"”";st.counts.activities++;
    const out=[],tabsDrawn=[];let cb=base;
    let head=titleNode;
    if(ownHead){head=heading(base,words(tx(a.title,a.id)));out.push(head);cb=base+1;}
    const ts=R.tabsIn(a),flow=[];
    const pagesOf=ps=>{const nodes=[];ps.forEach((p,i)=>{if(i) nodes.push(el("hr",{class:"bk-next-page"}));nodes.push(...blocks(R.blocksIn(p)));});return nodes;};
    if(ts&&ts.length>1){
      const op=R.tabOpening(a);
      if(op.length) flow.push({nodes:blocks(op),base:cb});
      ts.forEach(t=>{const h=heading(cb,words(tx(t.title,t.id),true));tabsDrawn.push([plain(t.title)||t.id,h]);
        flow.push({head:h,nodes:pagesOf(R.tabPages(a,t.id)),base:cb+1});});}
    else flow.push({nodes:[...blocks(R.tabOpening(a)),...pagesOf(ts?R.tabPages(a,ts[0].id):a.pages)],base:cb});
    /* the title is drawn once: the first heading of the activity's own text that repeats it goes */
    const all=flow.flatMap(f=>f.nodes);
    dropTitle(all,titleText);
    flow.forEach(f=>{f.nodes=f.nodes.filter(n=>all.includes(n));level(f.nodes,f.base);});
    if(first) lede(flow[0]?flow[0].nodes:[]);
    flow.forEach(f=>{if(f.head) out.push(el("section",{class:"bk-tab"},f.head,...f.nodes));else out.push(...f.nodes);});
    noteHeads(a.id,out,head,tabsDrawn);
    return ownHead?[el("section",{class:"bk-activity"},...out)]:out;}

  /* the depth of an activity in a module whose activities sit under one another (parent:), counting only shown ones */
  function depthOf(m,a){let d=0,cur=a,seen=new Set();
    while(cur&&cur.parent&&!seen.has(cur.id)){seen.add(cur.id);const p=m.activities.find(x=>x.id===cur.parent);if(!p) break;if(R.isShown(p)) d++;cur=p;}
    return d;}

  /* ---- a module ---- */
  function module(m,base){
    const acts=m.activities.filter(R.isShown),multi=R.isMulti(m);
    st.scope=R.scopeOfModule(m);st.reg=R.registries(m);st.regKey=st.scope;
    const opening=Array.isArray(m.opening)?m.opening:[];
    if(!acts.length&&!opening.length&&!(multi&&R.tabsIn(m))) return [];
    st.counts.modules++;
    const titleText=plain(m.title)||(multi?m.id:plain((acts[0]||{}).title)||m.id);
    const own=!R.sameWords(titleText,pageTitle),out=[];
    let head=st.top,cb=base;
    if(own){head=heading(base,words(R.nonEmpty(tx(m.title,""))?tx(m.title,""):titleText));out.push(head);cb=base+1;}
    st.modHead.set(m.id,head);
    let first=!st.lede;
    if(opening.length){st.where="the opening of the module “"+titleText+"”";
      const nodes=section(opening,cb,titleText);if(first) lede(nodes);first=false;out.push(...nodes);}
    if(!multi){if(acts[0]) out.push(...activity(acts[0],cb,false,head,titleText,first));}
    else{
      const mts=R.tabsIn(m),place=a=>{let top=a,seen=new Set();while(top.parent&&!seen.has(top.id)){seen.add(top.id);const p=m.activities.find(x=>x.id===top.parent);if(!p) break;top=p;}return R.moduleTabOf(m,top);};
      const drawActs=(list,lv)=>list.flatMap(a=>activity(a,Math.min(6,lv+depthOf(m,a)),true,null,plain(a.title)||a.id,false));
      if(mts){const tabs=new Map();
        mts.forEach(t=>{st.where="the tab “"+(plain(t.title)||t.id)+"” of the module “"+titleText+"”";
          const h=heading(cb,words(tx(t.title,t.id),true));tabs.set(norm(plain(t.title)||t.id),h);
          const nodes=section(t.blocks||[],cb+1,null);
          out.push(el("section",{class:"bk-tab"},h,...nodes,...drawActs(acts.filter(a=>place(a)===t.id),cb+1)));});
        st.mtabs.set(m.id,tabs);}
      else out.push(...drawActs(acts,cb));}
    /* the module's notice is drawn at the page's foot */
    if(m.notice&&typeof m.notice==="object") st.notices.push({m,titleText});
    return own?[el("section",{class:"bk-module"},...out)]:out;}

  /* ---- the page ---- */
  st.notices=[];
  const article=el("article",{class:"booklet",lang:P.lang||null});
  st.top=article;
  const kids=[];
  if(o.form==="standalone"){const h1=el("h1",{},...words(tx(design.title,"")||pageTitle));kids.push(h1);st.top=h1;}
  if(design.theme&&typeof design.theme==="object"){st.where="the booklet";kids.push(mark("theme","the theme block"));}
  if(Array.isArray(design.opening)&&design.opening.length){st.where="the booklet's opening";st.scope="";st.reg=null;
    const nodes=section(design.opening,2,pageTitle);lede(nodes);kids.push(...nodes);}
  (design.modules||[]).forEach(m=>kids.push(...module(m,2)));
  article.append(...kids);

  /* the notes, at the foot, in the order their first marks are read */
  if(st.notes.length){st.counts.notes=st.notes.length;const Rt=T("reading");
    const ol=el("ol",{class:"bk-notes-list"},...st.notes.map(n=>{n.li=el("li",{id:"bk-note-"+n.n},...noteBody(n));
      const back=el("a",{class:"bk-back","aria-label":W.back},"↩");st.refs.push({a:back,to:()=>n.first});n.li.append(" ",back);return n.li;}));
    article.append(el("section",{class:"bk-notes","aria-labelledby":"bk-notes-h"},el("h2",{id:"bk-notes-h",class:"bk-notes-h"},Rt.notes),ol));}
  /* each module's notice: its licence, copyright, source and version, as text (a source is a link only when it is a web address) */
  if(st.notices.length){const N=T("notice");
    article.append(el("footer",{class:"bk-foot"},...st.notices.map(({m,titleText})=>{const rows=[];
      R.NOTICE_KEYS.forEach(k=>{const v=typeof m.notice[k]==="string"?m.notice[k].trim():"";if(!v) return;
        const val=k==="source"&&/^https?:\/\//i.test(v)?el("a",{href:v,rel:"noopener noreferrer"},v):v;
        rows.push(el("div",{},el("dt",{},N[k]),el("dd",{},val)));});
      return rows.length?el("section",{class:"bk-about"},el("p",{class:"bk-about-h"},N.about+(st.notices.length>1?": "+titleText:"")),el("dl",{},...rows)):null;})));}

  /* ids: every heading gets one from the renderer's slug, made unique on the page; then every in-page link is pointed */
  const used=new Set();
  const uniq=base=>{let b=String(base||"").slice(0,60)||"section",id=b,i=2;while(used.has(id)) id=b+"-"+(i++);used.add(id);return id;};
  H.walk(article,x=>{if(!(x instanceof H.Node)) return;
    if(levelOf(x)&&!("id" in x.attrs)) x.attrs.id=R.slugify(H.textOf(x));
    if("id" in x.attrs) x.attrs.id=uniq(x.attrs.id);});
  const idOf=n=>{if(!n) return null;if(!n.attrs.id) n.attrs.id=uniq(n===article?"booklet":R.slugify(H.textOf(n)));return n.attrs.id;};
  /* heading links: findHeading named the activity (or module tab) and the heading's words; the node is looked up here */
  for(const p of st.pend){const h=p.hit;let to=null;
    if(h.mtab){const m=st.mtabs.get(h.mod);to=m&&m.get(norm(h.heading));}
    else{const r=st.heads.get(h.act);if(r) to=h.title?r.title:h.tab?r.tabs.get(norm(h.heading)):r.text.get(norm(h.heading));}
    if(to){st.refs.push({a:p.a,to:()=>to});st.counts.links++;}
    else{p.a.tag="";p.a.attrs={};st.marked.push({kind:"heading",what:"the link to “"+h.heading+"”",where:p.where});
      p.a.kids.unshift(comment("booklet: the link to “"+h.heading+"” ("+p.where+"): "+MARKED.heading));}}
  for(const r of st.refs){const t=r.to();const id=idOf(t);if(id) r.a.attrs.href="#"+id;else{r.a.tag="";r.a.attrs={};}}

  /* "On this page": the top heading level, when there are at least two such headings outside folds and callouts */
  const tops=[];let topLevel=7;
  H.walk(article,x=>{if(!(x instanceof H.Node)) return;
    if(x.tag==="details"||x.tag==="aside"||x.tag==="nav"||/\bbk-(notes|foot|q|group)\b/.test(String(x.attrs.class||""))) return false;
    const L=levelOf(x);if(L>1){if(L<topLevel){topLevel=L;tops.length=0;}if(L===topLevel) tops.push(x);}});
  let toc=null;
  if(tops.length>=2){
    toc=el("nav",{class:"bk-toc","aria-labelledby":"bk-toc-h"},el("p",{class:"bk-toc-h",id:uniq("bk-toc-h")},W.toc),
      el("ol",{},...tops.map(h=>el("li",{},el("a",{href:"#"+h.attrs.id},H.textOf(h).trim())))));
    /* after the lede when the page opens with one, else after the title */
    let placed=false;
    if(st.lede) H.walk(article,(x,parent)=>{if(placed||!(x instanceof H.Node)) return;
      const i=x.kids.indexOf(st.lede);if(i>=0){x.kids.splice(i+1,0,toc);placed=true;return false;}});
    if(!placed){const i=article.kids.findIndex(k=>levelOf(k)===1);article.kids.splice(i+1,0,toc);}}

  /* a small link on each heading, so a reader can share a section (it shows on hover and on focus) */
  H.walk(article,x=>{if(!(x instanceof H.Node)) return;if(x.tag==="details"||x.tag==="nav") return false;
    const L=levelOf(x);if(L>1&&L<5&&x.attrs.id&&x.attrs.class!=="bk-notes-h") {x.append(" ",el("a",{class:"bk-anchor",href:"#"+x.attrs.id,"aria-label":W.anchor},"#"));return false;}});

  return {article,title:tx(design.title,"")||pageTitle,description:describe(st.lede?H.textOf(st.lede):firstPara(article)),
    lang:P.lang||"",counts:st.counts,marked:st.marked,images:st.images,links:st.links,toc:!!toc};}

/* the first paragraph of the page's own text, when it has no lede (not one in a fold, a callout or a question) */
function firstPara(article){let t="";H.walk(article,x=>{if(t) return false;
  if(x instanceof H.Node&&(["nav","details","aside","footer"].includes(x.tag)||/\bbk-(q|group|notes)\b/.test(String(x.attrs.class||"")))) return false;
  if(x instanceof H.Node&&x.tag==="p"&&!x.attrs.class) {t=H.textOf(x);return false;}});return t;}
/* the description: the first paragraph as plain text, cut at a sentence's end near 160 characters */
function describe(text){const t=String(text||"").replace(/\s+/g," ").trim();
  if(t.length<=160) return t;
  let cut=-1;for(const m of t.matchAll(/[.!?…](?=\s)/g)){if(m.index+1<=160) cut=m.index+1;else break;}
  if(cut>=60) return t.slice(0,cut);
  const sp=t.lastIndexOf(" ",157);return t.slice(0,sp>60?sp:157).replace(/[\s,;:]+$/,"")+"…";}

module.exports={drawPage,describe,COVERAGE,MARKED,PAGE_WORDS};
