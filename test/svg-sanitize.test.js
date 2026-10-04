// A widget's SVG cannot run script.
//
// A figure's `svg` field is markup that rides in a file somebody was handed,
// and the renderer used to write it straight into the page with innerHTML, so
// an `onerror`, an `onbegin` or a javascript: link in it ran as script. The
// renderer now draws every figure through sanitizeSvg(). This file attacks it.
//
// Node has no HTML parser and runs no event handlers, so this file brings a
// small stand-in for each:
//   - parseHTML() parses markup the way a browser's HTML parser decides the
//     things the sanitizer depends on: which namespace an element lands in
//     (inside <svg>, inside <foreignObject>/<desc>/<title>, and the tags that
//     break out of an <svg>), lowercased attribute names, xlink:href put in
//     the xlink namespace, entities decoded in attribute values;
//   - detonate() plays a browser that is MORE trusting than any real one: it
//     lets the animation elements write into their parent, runs every
//     <script>, fires every attribute whose name starts with "on", and
//     follows every javascript: link. Whatever it runs sets a flag.
// Every attack is first detonated UNSANITIZED, and must set the flag (so the
// payload and the stand-in are live), then sanitized, and must not. The real
// browser run of the same payloads, through the page's own file input, is the
// authority on the real parser; this file keeps the guarantee from regressing.
// Run: node test/svg-sanitize.test.js   (node only; nothing to install)
require("./harness.js");            // the browser stubs the renderer's script needs
const fs=require("fs"),path=require("path");
const R=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(R,"booklet.html"),"utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};

/* ---------------- a stand-in for the browser's HTML parser ---------------- */
const HTML_NS="http://www.w3.org/1999/xhtml",SVG_NS="http://www.w3.org/2000/svg",
  XLINK_NS="http://www.w3.org/1999/xlink",XMLNS_NS="http://www.w3.org/2000/xmlns/",
  MATH_NS="http://www.w3.org/1998/Math/MathML";
const SVG_TAGS={foreignobject:"foreignObject",animatetransform:"animateTransform",
  animatemotion:"animateMotion",animatecolor:"animateColor",clippath:"clipPath",
  lineargradient:"linearGradient",radialgradient:"radialGradient",textpath:"textPath",feimage:"feImage"};
const SVG_ATTRS={viewbox:"viewBox",attributename:"attributeName",preserveaspectratio:"preserveAspectRatio"};
const BREAKOUT=new Set(("b big blockquote body br center code dd div dl dt em embed h1 h2 h3 h4 h5 h6 "+
  "head hr i img li listing menu meta nobr ol p pre ruby s small span strong strike sub sup table tt u ul var").split(" "));
const VOID=new Set("area base br col embed hr img input link meta source track wbr".split(" "));
const INTEGRATION=new Set(["foreignObject","desc","title"]);
const ENT={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",colon:":",Tab:"\t",NewLine:"\n",nbsp:" "};
const decode=s=>s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);?/g,(m,e)=>
  e[0]==="#"?String.fromCodePoint(parseInt(e[1]==="x"||e[1]==="X"?e.slice(2):e.slice(1),e[1]==="x"||e[1]==="X"?16:10))
  :(e in ENT?ENT[e]:m));

class N0{constructor(){this.childNodes=[];this.parentNode=null;}
  remove(){const p=this.parentNode;if(p){p.childNodes.splice(p.childNodes.indexOf(this),1);this.parentNode=null;}}
  appendChild(c){c.parentNode=this;this.childNodes.push(c);return c;}
  get textContent(){return this.nodeType===3?this.data:this.childNodes.map(c=>c.textContent||"").join("");}}
class Text0 extends N0{constructor(d){super();this.nodeType=3;this.data=d;}}
class Comment0 extends N0{constructor(d){super();this.nodeType=8;this.data=d;}get textContent(){return "";}}
class Elem0 extends N0{constructor(ns,local){super();this.nodeType=1;this.namespaceURI=ns;this.localName=local;this.attributes=[];}
  getAttribute(n){const a=this.attributes.find(a=>a.name===n);return a?a.value:null;}
  setAttribute(n,v){const a=this.attributes.find(a=>a.name===n);if(a) a.value=String(v);
    else this.attributes.push({name:n,localName:n,namespaceURI:null,prefix:null,value:String(v)});}
  removeAttributeNode(a){const i=this.attributes.indexOf(a);if(i<0) throw new Error("NotFoundError");
    this.attributes.splice(i,1);return a;}}
const clone=n=>{let c;
  if(n.nodeType===3) return new Text0(n.data);
  if(n.nodeType===8) return new Comment0(n.data);
  c=new Elem0(n.namespaceURI,n.localName);c.attributes=n.attributes.map(a=>({...a}));
  n.childNodes.forEach(k=>c.appendChild(clone(k)));return c;};

function makeAttr(el,raw,value){const name=raw.toLowerCase();
  if(el.namespaceURI===SVG_NS){
    if(/^xlink:/.test(name)) return {name,localName:name.slice(6),namespaceURI:XLINK_NS,prefix:"xlink",value};
    if(name==="xmlns"||name==="xmlns:xlink") return {name,localName:name==="xmlns"?"xmlns":"xlink",namespaceURI:XMLNS_NS,prefix:name==="xmlns"?null:"xmlns",value};
    const adj=SVG_ATTRS[name]||name;return {name:adj,localName:adj,namespaceURI:null,prefix:null,value};}
  return {name,localName:name,namespaceURI:null,prefix:null,value};}

function parseHTML(s){const body=new Elem0(HTML_NS,"body");let cur=body,i=0;
  const toHtml=()=>{while(cur!==body&&cur.namespaceURI!==HTML_NS&&!INTEGRATION.has(cur.localName)) cur=cur.parentNode;};
  while(i<s.length){const rest=s.slice(i);let m;
    if(rest.startsWith("<!--")){const j=s.indexOf("-->",i+4),end=j<0?s.length:j;
      cur.appendChild(new Comment0(s.slice(i+4,end)));i=end+3;continue;}
    if((m=/^<\/([a-zA-Z][^\s/>]*)[^>]*>/.exec(rest))){i+=m[0].length;const name=m[1].toLowerCase();
      if(cur.namespaceURI!==HTML_NS&&(name==="p"||name==="br")){toHtml();cur.appendChild(new Elem0(HTML_NS,name));continue;}
      let n=cur;while(n!==body&&n.localName.toLowerCase()!==name) n=n.parentNode;
      if(n!==body) cur=n.parentNode;continue;}
    if((m=/^<([a-zA-Z][^\s/>]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/.exec(rest))){i+=m[0].length;
      let name=m[1].toLowerCase();const selfClose=/\/\s*$/.test(m[2]);
      const foreign=cur.namespaceURI!==HTML_NS&&!INTEGRATION.has(cur.localName);
      if(foreign&&BREAKOUT.has(name)) toHtml();
      let el;
      if(cur.namespaceURI!==HTML_NS&&!INTEGRATION.has(cur.localName)) el=new Elem0(cur.namespaceURI,cur.namespaceURI===SVG_NS?(SVG_TAGS[name]||name):name);
      else if(name==="svg") el=new Elem0(SVG_NS,"svg");
      else if(name==="math") el=new Elem0(MATH_NS,"math");
      else el=new Elem0(HTML_NS,name==="image"?"img":name);
      for(const a of m[2].matchAll(/([^\s/>="']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){
        const at=makeAttr(el,a[1],decode(a[2]!==undefined?a[2]:a[3]!==undefined?a[3]:a[4]!==undefined?a[4]:""));
        if(!el.attributes.some(x=>x.name===at.name)) el.attributes.push(at);}
      cur.appendChild(el);
      if(el.namespaceURI===HTML_NS&&(el.localName==="script"||el.localName==="style")){
        const j=s.toLowerCase().indexOf("</"+el.localName,i),end=j<0?s.length:j;
        if(end>i) el.appendChild(new Text0(s.slice(i,end)));
        i=end;const k=s.indexOf(">",end);i=k<0?s.length:k+1;continue;}
      if(el.namespaceURI===HTML_NS?VOID.has(el.localName):selfClose) continue;
      cur=el;continue;}
    const j=s.indexOf("<",i+1),end=j<0?s.length:j;
    cur.appendChild(new Text0(decode(s.slice(i,end))));i=end;}
  return body;}

global.DOMParser=class{parseFromString(s,type){
  if(type!=="text/html") throw new Error("this stand-in parses text/html only");
  return {body:parseHTML(s)};}};
global.document.importNode=(n)=>clone(n);

/* ---------------- a browser that runs anything it is given ---------------- */
function detonate(nodes){let hit=0;const ATTACK=()=>{hit++;};
  const run=code=>{try{new Function("ATTACK",code)(ATTACK);}catch(e){}};
  const all=[];const walk=n=>{if(n.nodeType===1){all.push(n);n.childNodes.forEach(walk);}};
  nodes.forEach(walk);
  const ln=n=>n.localName.toLowerCase();
  /* the animation elements write into their parent first, as they would
     while the figure sits on the page, before anybody taps it */
  for(const n of all) if(["set","animate","animatemotion","animatetransform","animatecolor"].includes(ln(n))){
    const an=(n.getAttribute("attributeName")||"").replace(/^xlink:/,"");
    const v=n.getAttribute("to")!=null?n.getAttribute("to"):(n.getAttribute("values")||"").split(";")[0];
    if(an&&n.parentNode&&n.parentNode.setAttribute) n.parentNode.setAttribute(an,v);}
  for(const n of all) if(ln(n)==="script") run(n.textContent);
  for(const n of all) for(const a of n.attributes) if(/^on/i.test(a.localName)) run(a.value);
  for(const n of all) if(ln(n)==="a") for(const a of n.attributes) if(a.localName.toLowerCase()==="href"){
    const v=String(a.value).replace(/[\u0000- ]/g,"");
    if(/^javascript:/i.test(v)) run(decodeURIComponent(v.slice(11)));}
  return hit;}

/* ---------------- the renderer, loaded ---------------- */
/* evaluated inside a function of its own, so its declarations stay its own */
const API=(()=>{const API={};eval(src+`
;Object.assign(API,{sanitizeSvg,ENGINES});`);return API;})();
const {sanitizeSvg}=API;
const nodesOf=markup=>[...parseHTML(markup).childNodes];     // what innerHTML used to put in the page
const shape=nodes=>JSON.stringify(nodes.map(function f(n){
  return n.nodeType===3?["#text",n.data]:n.nodeType===8?["#comment"]
    :[n.namespaceURI,n.localName,n.attributes.map(a=>[a.namespaceURI,a.name,a.value]).sort(),n.childNodes.map(f)];}));
const find=(nodes,pred)=>{const out=[];const w=n=>{if(n.nodeType===1){if(pred(n)) out.push(n);n.childNodes.forEach(w);}};nodes.forEach(w);return out;};

/* ---------------- attacks ---------------- */
const ATTACKS=[
  ["an <image> whose load fails, with onerror",
   `<svg viewBox="0 0 10 10"><image href="x" onerror="ATTACK()"/><rect class="rg" data-r="a" width="5" height="5"/></svg>`],
  ["a bare <image onerror> with no <svg> around it",`<image href="x" onerror="ATTACK()">`],
  ["onload on the outer <svg> itself",`<svg onload="ATTACK()" viewBox="0 0 10 10"><rect class="rg" data-r="a"/></svg>`],
  ["a <script> inside the SVG",`<svg viewBox="0 0 10 10"><script>ATTACK()</script><rect class="rg" data-r="a"/></svg>`],
  ["a <script> before the SVG",`<script>ATTACK()</script><svg viewBox="0 0 10 10"><rect class="rg" data-r="a"/></svg>`],
  ["<a href=\"javascript:…\">",`<svg viewBox="0 0 10 10"><a href="javascript:ATTACK()"><rect class="rg" data-r="a"/></a></svg>`],
  ["<a xlink:href=\"javascript:…\">",
   `<svg viewBox="0 0 10 10" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:ATTACK()"><rect class="rg" data-r="a"/></a></svg>`],
  ["javascript: in mixed case, entity-encoded, split by a tab and led by a control character",
   `<svg><a href="&#1;&#32;JaVa&#x09;Script&colon;ATTACK()"><rect class="rg" data-r="a"/></a></svg>`],
  ["an <animate> with onbegin",`<svg><rect class="rg" data-r="a"><animate attributeName="x" dur="1s" onbegin="ATTACK()"/></rect></svg>`],
  ["an <animate> with onend",`<svg><rect class="rg" data-r="a"><animate attributeName="x" dur="1s" onend="ATTACK()"/></rect></svg>`],
  ["a <set> that writes javascript: into its link's href (no on* attribute anywhere)",
   `<svg><a><set attributeName="href" to="javascript:ATTACK()"/><rect class="rg" data-r="a"/></a></svg>`],
  ["an <animate> whose values write javascript: into xlink:href",
   `<svg><a xlink:href="#"><animate attributeName="xlink:href" values="javascript:ATTACK()" dur="9s"/><rect class="rg" data-r="a"/></a></svg>`],
  ["OnLoad, mixed case",`<svg OnLoad="ATTACK()"><rect class="rg" data-r="a"/></svg>`],
  ["ONERROR, upper case",`<svg><image href="x" ONERROR="ATTACK()"/></svg>`],
  ["ON:LOAD, with a colon",`<svg ON:LOAD="ATTACK()"><rect class="rg" data-r="a"/></svg>`],
  ["an HTML <img onerror> inside <foreignObject>",
   `<svg><foreignObject width="9" height="9"><img src="x" onerror="ATTACK()"></foreignObject><rect class="rg" data-r="a"/></svg>`],
  ["an HTML <img onerror> inside <desc>, where HTML parses as HTML",
   `<svg><desc><img src="x" onerror="ATTACK()"></desc><rect class="rg" data-r="a"/></svg>`],
  ["</p> breaking out of the SVG into HTML",`<svg><rect class="rg" data-r="a"/></p><img src="x" onerror="ATTACK()"></svg>`],
  ["an HTML element beside the SVG",`<img src="x" onerror="ATTACK()"><svg><rect class="rg" data-r="a"/></svg>`],
];
for(const [name,markup] of ATTACKS){
  const live=detonate(nodesOf(markup));
  const clean=sanitizeSvg(markup);
  const after=detonate(clean);
  chk(name+": runs unsanitized, runs nothing sanitized",live>0&&after===0,`unsanitized ${live}, sanitized ${after}`);}

/* what is removed is the danger, not the figure */
{const out=sanitizeSvg(`<svg viewBox="0 0 10 10"><a href="javascript:ATTACK()" class="lnk"><rect class="rg" data-r="a" width="5"/></a></svg>`);
  const a=find(out,n=>n.localName==="a")[0],r=find(out,n=>n.localName==="rect")[0];
  chk("a javascript: link keeps its element and its other attributes, and loses only the href",
    !!a&&a.getAttribute("class")==="lnk"&&a.getAttribute("href")===null&&!!r&&r.getAttribute("data-r")==="a");}
{const out=sanitizeSvg(`<svg viewBox="0 0 10 10" onload="ATTACK()"><rect class="rg" data-r="a" onclick="ATTACK()" fill="red"/></svg>`);
  const s=find(out,n=>n.localName==="svg")[0],r=find(out,n=>n.localName==="rect")[0];
  chk("a handler goes and the element stays: the <svg> keeps viewBox, the shape keeps class, data-r and fill",
    !!s&&s.getAttribute("viewBox")==="0 0 10 10"&&s.attributes.length===1
    &&!!r&&r.getAttribute("class")==="rg"&&r.getAttribute("data-r")==="a"&&r.getAttribute("fill")==="red"&&r.attributes.length===3);}
{const out=sanitizeSvg(`<svg><g xlink:onclick="ATTACK()" xml:onload="ATTACK()" data-note="on the left"><rect class="rg" data-r="a"/></g></svg>`);
  const g=find(out,n=>n.localName==="g")[0];
  chk("an on* name behind a prefix goes too, and an attribute merely containing 'on' stays",
    !!g&&g.attributes.map(a=>a.name).join(",")==="data-note",g&&g.attributes.map(a=>a.name).join(","));}
{const out=sanitizeSvg(`<svg><rect class="rg" data-r="a"><animate attributeName="x"/><set attributeName="y" to="1"/><animateMotion/><animateTransform/><discard/></rect><script>1</script><foreignObject/></svg>`);
  const left=find(out,()=>true).map(n=>n.localName).join(",");
  chk("<script>, <foreignObject> and every animation element are removed whole",left==="svg,rect",left);}
{const out=sanitizeSvg(`<p>hi</p><svg><rect class="rg" data-r="a"/><desc><iframe src="x"></iframe></desc></svg><math><mi>x</mi></math><style>*{}</style>`);
  const left=find(out,()=>true).map(n=>n.localName).join(",");
  chk("an element outside the SVG namespace is removed whole, however it got there",left==="svg,rect,desc",left);}

/* ---------------- fail safe ---------------- */
chk("nothing, an empty string and a non-string all draw nothing",
  [undefined,null,"","   ",42,{svg:"<svg/>"}].every(x=>Array.isArray(sanitizeSvg(x))&&sanitizeSvg(x).length===0));
{const keep=global.DOMParser;
  global.DOMParser=class{parseFromString(){throw new Error("parser gave up");}};
  let r;try{r=sanitizeSvg(`<svg onload="ATTACK()"><rect/></svg>`);}catch(e){r=e;}
  chk("a parser that throws draws nothing and throws nothing",Array.isArray(r)&&r.length===0,String(r));
  global.DOMParser=class{parseFromString(){return {body:null};}};
  try{r=sanitizeSvg(`<svg onload="ATTACK()"><rect/></svg>`);}catch(e){r=e;}
  chk("a parser that returns something unexpected draws nothing and throws nothing",Array.isArray(r)&&r.length===0,String(r));
  delete global.DOMParser;
  try{r=sanitizeSvg(`<svg onload="ATTACK()"><rect/></svg>`);}catch(e){r=e;}
  chk("no parser at all draws nothing and throws nothing — never the raw markup",Array.isArray(r)&&r.length===0,String(r));
  global.DOMParser=keep;}

/* ---------------- real figures come through untouched ---------------- */
const figures=[];
for(const d of ["test/fixtures","examples"]) for(const f of fs.readdirSync(path.join(R,d))){
  if(!f.endsWith(".md")||/^lint-/.test(f)) continue;const t=fs.readFileSync(path.join(R,d,f),"utf8");
  for(const m of t.matchAll(/```(?:booklet widget|json)\n([\s\S]*?)\n```/g)){let j;try{j=JSON.parse(m[1]);}catch(e){continue;}
    const w=o=>{if(Array.isArray(o)) return o.forEach(w);
      if(o&&typeof o==="object"){if(typeof o.svg==="string") figures.push([d+"/"+f+" "+o.id,o.svg]);Object.values(o).forEach(w);}};
    w(j);}}
chk("the repository's own figures were found (fixtures, examples)",figures.length>=4,figures.length);
for(const [where,svg] of figures)
  chk(where+": sanitized is node-for-node what innerHTML drew",shape(sanitizeSvg(svg))===shape(nodesOf(svg)));
{const W=JSON.parse(fs.readFileSync(path.join(R,"test/fixtures/module-check-in.md"),"utf8").match(/```booklet widget\n([\s\S]*?)\n```/)[1]);
  for(const fg of W.figures){const before=find(nodesOf(fg.svg),n=>/\brg\b/.test(n.getAttribute("class")||""));
    const after=find(sanitizeSvg(fg.svg),n=>/\brg\b/.test(n.getAttribute("class")||""));
    const ids=ns=>ns.map(n=>n.localName+":"+n.getAttribute("data-r")).join(",");
    chk(`body map, ${fg.id}: all ${before.length} class="rg" regions keep their shape and data-r`,
      before.length>=9&&ids(after)===ids(before)&&fg.regions.every(r=>after.some(n=>n.getAttribute("data-r")===r)),
      ids(after));}}

/* ---------------- the engine draws through it ---------------- */
{const figDiv=root=>{let hit=null;const w=n=>{if(hit||!n||!n.children) return;
    if(n.children.some(c=>c instanceof Elem0)) hit=n;else n.children.forEach(w);};w(root);return hit;};
  const W={id:"t/evil",engine:"svg-regions",regions:[{id:"a",label:"A"}],
    figures:[{id:"f",label:"F",regions:["a"],
      svg:`<svg viewBox="0 0 10 10" onload="ATTACK()"><image href="x" onerror="ATTACK()"/><a href="javascript:ATTACK()"><rect class="rg" data-r="a"/></a><set attributeName="href" to="javascript:ATTACK()"/><script>ATTACK()</script></svg>`}]};
  let drawn,err=null;try{drawn=figDiv(API.ENGINES["svg-regions"]({},W,["regions"]));}catch(e){err=e;}
  chk("svg-regions draws a hostile figure without throwing",!err&&!!drawn,err&&err.message);
  chk("and what it drew runs nothing, while keeping the region to tap",
    !!drawn&&detonate(drawn.children)===0&&find(drawn.children,n=>n.getAttribute("data-r")==="a").length===1);
  const B=JSON.parse(fs.readFileSync(path.join(R,"test/fixtures/module-check-in.md"),"utf8").match(/```booklet widget\n([\s\S]*?)\n```/)[1]);
  const body=figDiv(API.ENGINES["svg-regions"]({},B,["regions"]));
  chk("svg-regions draws the real body map exactly as innerHTML did",
    !!body&&shape(body.children)===shape(nodesOf(B.figures[0].svg)));}

/* ---------------- no widget markup reaches innerHTML any other way ---------------- */
{const sets=[...src.matchAll(/\.innerHTML\s*=\s*([^;]+);/g)].map(m=>m[1].trim());
  const odd=sets.filter(v=>v!=='""'&&v!=="v");                 // v: the el() helper's own html attribute
  chk("every innerHTML write in the renderer clears a node, apart from the el() helper",odd.length===0,odd.join(" | "));
  chk("drawFig draws through sanitizeSvg",/fig\.append\(\.\.\.sanitizeSvg\(f&&f\.svg\)\)/.test(src));
  chk("and nothing else reads a figure's svg",(src.match(/\.svg\b/g)||[]).length===1,(src.match(/.{30}\.svg\b.{10}/g)||[]).join(" | "));}

console.log(fails?`\n${fails} svg-sanitize check(s) failed`:"svg-sanitize checks passed");
process.exit(fails?1:0);
