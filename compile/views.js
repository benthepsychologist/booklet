"use strict";
/* compile/views.js: a query over a data block, drawn as plain HTML and SVG (SPEC.md sections 6 and 7).

   The renderer's own pipeline decides what a view shows: engine.js hands a data block's query to it (dataSet, viewNodes:
   the default view, `limit:`, `group:`, the nested list's tree, the roles each view reads and the fields it shows) and keeps
   what the six view functions were handed, without letting them draw. This file draws that, and decides only the markup.
   Nothing is computed here beyond what a picture needs: a chart's scale comes from the renderer's own niceScale and
   lineDomain, its labels from thinLabels, a number is written as the renderer writes it (fmtNum).

   The markup contract every view keeps, for the script that sorts and filters (lane B of compile 0.2):
     - the view's container carries data-bk-view="table|list|cards|tiles|bars|line";
     - each row inside it carries data-bk-row (a table's <tr>, a list's <li> or, in a nested list, the <summary> of a row
       that has children, a card, a tile, a bar's <li>). A line chart has no row element of its own (it plots its rows in
       order, and the renderer neither sorts nor filters it); its numbers are in a table that is not tagged;
     - each value inside a row carries data-bk-col="<the field's name>", and its text is the value. A table's headings
       carry the same name.
   A view is plain HTML and SVG. Text is always text (html.js escapes it); a value from the data is never read as Markdown
   or HTML. The SVG a chart makes is built here from numbers, never from a booklet's text: the only words in it are its
   labels, written as text. Colours and strokes are the stylesheet's (the bk-ch-* classes), never an attribute. */
const H=require("./html.js");
const {el}=H;

/* a number as short text: two decimals at most, no exponent */
const n2=v=>String(Math.round(v*100)/100);
const n1=v=>String(Math.round(v*10)/10);
/* a line chart is drawn at one width, and the stylesheet gives it no more than that (max-width); the renderer draws it at the
   width the page has, which a build step does not know */
const LINE_W=460;

/* draw(cap, o): the view `cap` (what engine.js's queryView returns: {as, set, groups, roles, cols, tree}) as one element.
   o: {R: the renderer's names, T: its "dv" words, icon(name) -> a node or null, lead(set, row, roles, kids) -> nodes}. */
function draw(cap,o){
  const R=o.R,T=o.T,{set,groups,roles,cols,tree}=cap,text=R.cellText;
  const grouped=groups.some(g=>g.name!==null);
  const sr=words=>el("span",{class:"bk-sr"},words);
  const toneWords=t=>t?sr(T.tone[t]):null;
  const pill=(x,t)=>el("span",{class:"bk-pill"+(t?" bk-tone-"+t:"")},x);
  const pills=(vals,t)=>vals.flatMap((x,i)=>i?[" ",pill(x,t)]:[pill(x,t)]);
  /* a value, in an element that names its field */
  const col=(k,cls,...kids)=>el("span",{class:cls,"data-bk-col":k},...kids);
  const row=(cls,...kids)=>el("li",{class:cls,"data-bk-row":true},...kids);
  /* an `icon` role's picture: the sprite's own drawing of that name, else nothing */
  const pic=r=>{const n=roles.icon?text(r[roles.icon]).trim():"",s=n?o.icon(n):null;
    return s?el("span",{class:"bk-dv-i","aria-hidden":"true"},s):null;};
  const lead=(r,kids)=>o.lead(set,r,roles,kids);
  const groupHead=g=>el("div",{class:"bk-dv-group",role:"heading","aria-level":"3"},g.name||"–",el("span",{class:"bk-count"},T.rows(g.rows.length)));
  const box=(cls,...kids)=>el("div",{class:"bk-view"+(cls?" "+cls:""),"data-bk-view":cap.as},...kids);

  /* ---- table: one row per row, one column per field ---- */
  const numeric=k=>set.rows.some(r=>typeof r[k]==="number")&&set.rows.every(r=>r[k]==null||typeof r[k]==="number");
  /* `tag` false draws a chart's table of numbers, which is no view of its own: its rows and values are not tagged */
  function tableOf(gs,rl,cs,tag){
    const lead1=(cs.find(c=>!(rl.badge&&c.key===rl.badge))||{}).key;
    const cell=(r,c)=>{const num=numeric(c.key)?"bk-num":null,a={"data-bk-col":tag?c.key:null,class:num};
      if(rl.badge&&c.key===rl.badge){const t=R.rowTone(r,rl);
        return el("td",{},tag?col(c.key,"bk-dv-b",...pills(R.partsOf(r[c.key]),t)):pills(R.partsOf(r[c.key]),t),toneWords(t));}
      if(c.key===lead1&&(rl.link||rl.icon)) return el("td",a,pic(r),...lead(r,[text(r[c.key])]));
      return el("td",a,text(r[c.key]));};
    return el("table",{},
      el("thead",{},el("tr",{},...cs.map(c=>el("th",{scope:"col","data-bk-col":tag?c.key:null,class:numeric(c.key)?"bk-num":null},c.label)))),
      ...gs.map(g=>el("tbody",{},
        g.name!==null?el("tr",{class:"bk-grouprow"},el("th",{scope:"rowgroup",colspan:String(cs.length)},g.name||"–",el("span",{class:"bk-count"},T.rows(g.rows.length)))):null,
        ...g.rows.map(r=>el("tr",{"data-bk-row":tag?true:null},...cs.map(c=>cell(r,c)))))));}

  /* ---- list: one line per row, nested when the rows carry a parent ---- */
  function listParts(r){
    const t=R.rowTone(r,roles),badges=roles.badge?R.partsOf(r[roles.badge]):[],extras=cols.filter(c=>text(r[c.key])!==""),
      val=R.rolePart(r,roles.value),lab=R.rolePart(r,roles.label),note=R.rolePart(r,roles.note);
    return [pic(r),
      badges.length?col(roles.badge,"bk-dv-b",...pills(badges,t)):null,
      lab!==""?col(roles.label,"bk-dv-t",...lead(r,[lab])):null,
      extras.length?el("span",{class:"bk-dv-x"},...extras.map(c=>el("span",{title:c.label},sr(c.label+": "),col(c.key,null,text(r[c.key]))))):null,
      val!==""?col(roles.value,"bk-dv-val"+(t&&!badges.length?" bk-tone-"+t:""),val):null,
      note!==""?col(roles.note,"bk-dv-n",note):null,
      toneWords(t)];}
  const listRow=r=>row("bk-dv-row",...listParts(r));
  /* a row with children is a native disclosure (closed, as the renderer opens it; it opens with no script) */
  /* A branch more than MAXD levels down is drawn flat: its rows, in order, one after another at that level. The page
     keeps every row, and a file whose list is thousands of levels deep (made by a generator gone wrong) does not take
     the compiler's stack with it. A fold inside a fold is not read below a few levels anyway. */
  const MAXD=40;
  const below=r=>{const out=[],todo=[r];
    while(todo.length){const x=todo.pop();out.push(x);const k=tree.kids.get(x);if(k) for(let i=k.length-1;i>=0;i--) todo.push(k[i]);}
    return out;};
  const treeNode=(r,d)=>{const kids=tree.kids.get(r);if(!kids) return listRow(r);
    if(d>=MAXD) return below(r).map(listRow);
    return el("li",{class:"bk-dv-node"},el("details",{open:tree.open(r)},
      el("summary",{class:"bk-dv-row","data-bk-row":true},...listParts(r)),el("ul",{class:"bk-dv-list"},...Array.from(kids,k=>treeNode(k,d+1)))));};
  function list(){
    const ul=g=>el("ul",{class:"bk-dv-list"},...g.rows.map(listRow));
    if(tree) return box("bk-panel",el("ul",{class:"bk-dv-list bk-dv-tree"},...Array.from(tree.roots,r=>treeNode(r,0))));
    if(grouped) return box("",el("div",{class:"bk-dv-groups"},...groups.map(g=>el("div",{class:"bk-dv-gcard"},groupHead(g),ul(g)))));
    return box("bk-panel",...groups.map(ul));}

  /* ---- tiles: a big value over a label; with no value anywhere, a strip of pills ---- */
  function tiles(){
    const strip=!roles.value||!set.rows.some(r=>text(r[roles.value])!=="");
    const one=g=>el("ul",{class:"bk-dv-tiles"+(strip?" bk-dv-strip":"")},...g.rows.map(r=>{
      const t=R.rowTone(r,roles),note=R.rolePart(r,roles.note),lab=R.rolePart(r,roles.label),val=R.rolePart(r,roles.value),
        linked=!!roles.link&&text(r[roles.link]).trim()!=="";
      const labNode=lab!==""?col(roles.label,"bk-dv-l",...lead(r,[lab])):null,noteNode=note!==""?col(roles.note,"bk-dv-n",note):null;
      if(strip) return row("bk-pill"+(t?" bk-tone-"+t:""),pic(r),labNode,noteNode,toneWords(t));
      return row("bk-dv-tile"+(t?" bk-tone-"+t:"")+(linked?" bk-dv-lead":""),pic(r),
        val!==""?col(roles.value,"bk-dv-v",val):null,labNode,noteNode,toneWords(t));}));
    return box("",...(grouped?groups.flatMap(g=>[groupHead(g),one(g)]):groups.map(one)));}

  /* ---- cards: one per row, led by its label; the fields that play no role are lines ---- */
  function cards(){
    const one=g=>g.rows.map(r=>{
      const lab=R.rolePart(r,roles.label),note=R.rolePart(r,roles.note),val=R.rolePart(r,roles.value),t=R.rowTone(r,roles),
        badges=roles.badge?R.partsOf(r[roles.badge]):[],lines=cols.filter(c=>text(r[c.key])!=="");
      return el("div",{class:"bk-dv-card"+(t?" bk-tone-"+t:""),"data-bk-row":true},pic(r),
        lab!==""?el("div",{class:"bk-dv-k","data-bk-col":roles.label},...lead(r,[lab])):null,
        note!==""?el("div",{class:"bk-dv-n","data-bk-col":roles.note},note):null,
        badges.length?col(roles.badge,"bk-dv-b",...pills(badges,t)):null,
        val!==""?col(roles.value,"bk-dv-v",val):null,
        lines.length?el("dl",{},...lines.flatMap(c=>[el("dt",{},c.label),el("dd",{"data-bk-col":c.key},text(r[c.key]))])):null,
        toneWords(t));});
    return box("",el("div",{class:"bk-dv-cards"},...(grouped?groups.flatMap(g=>[groupHead(g),...one(g)]):one(groups[0]))));}

  /* ---- charts: the same rows are always offered as a table, so nothing is shown only as a picture ---- */
  const numbers=(keys,rows)=>{const cs=keys.filter(Boolean).map(k=>({key:k,label:set.lab(k)}));
    return cs.length?el("details",{class:"bk-ch-nums"},el("summary",{},T.chart.numbers),el("div",{class:"bk-table"},tableOf([{name:null,rows}],{},cs,false))):null;};
  const range=vals=>{let lo=Infinity,hi=-Infinity;for(const v of vals){if(v<lo) lo=v;if(v>hi) hi=v;}return vals.length?[lo,hi]:[0,0];};
  function bars(){
    const rows=groups[0].rows,lk=roles.label,vk=roles.value,C=T.chart;
    const vals=vk?rows.map(r=>r[vk]).filter(R.isNum):[];
    const [lo0,hi0]=range(vals),sc=R.niceScale(Math.min(0,lo0),Math.max(0,hi0));
    const span=sc.max-sc.min,zero=(0-sc.min)/span*100;
    const items=rows.map(r=>{const x=vk?r[vk]:undefined,tone=R.rowTone(r,roles);
      const track=el("svg",{class:"bk-ch-track",viewBox:"0 0 100 10",preserveAspectRatio:"none","aria-hidden":"true",focusable:"false"},
        sc.min<0?el("line",{class:"bk-ch-zero",x1:n2(zero),x2:n2(zero),y1:0,y2:10}):null,
        R.isNum(x)&&x!==0?el("rect",{class:"bk-ch-bar"+(tone?" bk-tone-"+tone:""),x:n2(Math.min(zero,zero+x/span*100)),y:1,
          width:n2(Math.max(Math.abs(x)/span*100,.6)),height:8}):null);
      return row("bk-ch-row",col(lk,"bk-ch-l",R.rolePart(r,lk)),track,col(vk,"bk-ch-v",R.isNum(x)?R.fmtNum(x):"–"),toneWords(tone));});
    const lo=vals.length?R.fmtNum(lo0):"–",hi=vals.length?R.fmtNum(hi0):"–";
    return el("div",{class:"bk-view bk-panel","data-bk-view":"bars",role:"group","aria-label":C.bars(rows.length,lo,hi)},
      el("ul",{class:"bk-ch-list"},...items),numbers([lk,vk],rows));}
  /* a marker for series i: a circle, a square, a triangle or a diamond */
  function marker(i,x,y,r){const cls="bk-ch-pt bk-s"+(i%6),X=n1(x),Y=n1(y);
    switch(i%4){
      case 0: return el("circle",{class:cls,cx:X,cy:Y,r});
      case 1: return el("rect",{class:cls,x:n1(x-r),y:n1(y-r),width:2*r,height:2*r});
      case 2: return el("path",{class:cls,d:"M"+X+" "+n1(y-r-1)+"L"+n1(x+r+1)+" "+n1(y+r)+"L"+n1(x-r-1)+" "+n1(y+r)+"Z"});
      default: return el("path",{class:cls,d:"M"+X+" "+n1(y-r-1)+"L"+n1(x+r+1)+" "+Y+"L"+X+" "+n1(y+r+1)+"L"+n1(x-r-1)+" "+Y+"Z"});}}
  function line(){
    const rows=groups[0].rows,lk=roles.label,C=T.chart,keys=cols.map(c=>c.key),series=R.lineSeries(rows,keys),all=[];
    for(const s of series) for(const v of s) if(R.isNum(v)) all.push(v);
    const labels=rows.map(r=>R.rolePart(r,lk)),names=cols.map(c=>c.label),[lo0,hi0]=range(all);
    const lo=all.length?R.fmtNum(lo0):"–",hi=all.length?R.fmtNum(hi0):"–";
    const legend=keys.length>1?el("ul",{class:"bk-ch-legend"},...keys.map((k,i)=>el("li",{},
      el("svg",{class:"bk-ch-sw",viewBox:"0 0 28 12",width:"28",height:"12","aria-hidden":"true",focusable:"false"},
        el("line",{class:"bk-ch-line bk-s"+(i%6),x1:2,x2:26,y1:6,y2:6,"stroke-dasharray":R.CH_DASH[i%6]||null}),marker(i,14,6,3)),
      el("span",{},names[i])))):null;
    const W=LINE_W,Hh=Math.round(Math.min(340,Math.max(200,W*.42))),sc=R.lineDomain(all);
    let widest=0;for(const t of sc.ticks) widest=Math.max(widest,R.fmtNum(t).length);
    let longest=1;for(const l of labels) longest=Math.max(longest,l.length);
    const yw=widest*7+10,lw=Math.min(14,longest)*6.6+10;
    const L=Math.max(yw,10),Rt=Math.max(10,Math.ceil(lw/2)),padTop=12,B=30;
    const x0=Math.max(L+8,Math.ceil(lw/2)),x1=W-Rt,pw=Math.max(x1-x0,1),ph=Hh-padTop-B;
    const n=rows.length,X=i=>n===1?(x0+x1)/2:x0+i*pw/(n-1),Y=t=>padTop+ph-(t-sc.min)/(sc.max-sc.min)*ph;
    const svg=el("svg",{class:"bk-ch-svg",viewBox:"0 0 "+W+" "+Hh,role:"img","aria-label":C.line(n,names.join(", "),lo,hi),focusable:"false"});
    for(const t of sc.ticks) svg.append(el("line",{class:t===sc.min?"bk-ch-axis":"bk-ch-grid",x1:L,x2:W-Rt+2,y1:n1(Y(t)),y2:n1(Y(t))}),
      el("text",{class:"bk-ch-tick",x:L-6,y:n1(Y(t)+4),"text-anchor":"end"},R.fmtNum(t)));
    for(const i of R.thinLabels(n,pw,lw)) svg.append(el("text",{class:"bk-ch-tick",x:n1(X(i)),y:Hh-B+17,"text-anchor":"middle"},R.chClip(labels[i],14)));
    series.forEach((s,si)=>{let seg=[];
      const flush=()=>{if(seg.length>1) svg.append(el("polyline",{class:"bk-ch-line bk-s"+(si%6),"stroke-dasharray":R.CH_DASH[si%6]||null,
        points:seg.map(p=>n1(p[0])+","+n1(p[1])).join(" ")}));seg=[];};
      s.forEach((val,i)=>{if(val===null){flush();return;}seg.push([X(i),Y(val)]);});flush();
      s.forEach((val,i)=>{if(val===null) return;
        svg.append(marker(si,X(i),Y(val),3.5).append(el("title",{},(keys.length>1?names[si]+" – ":"")+labels[i]+": "+R.fmtNum(val))));});});
    return el("div",{class:"bk-view bk-panel","data-bk-view":"line"},legend,el("div",{class:"bk-ch-plot"},svg),numbers([lk,...keys],rows));}

  switch(cap.as){
    case "table": return box("bk-panel",el("div",{class:"bk-table"},tableOf(groups,roles,cols,true)));
    case "list": return list();
    case "tiles": return tiles();
    case "cards": return cards();
    case "bars": return bars();
    case "line": return line();
    default: return null;}}

module.exports={draw,LINE_W};
