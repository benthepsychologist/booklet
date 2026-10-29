// The compiler's figures, drawn diagrams and image sizes (compile/, compile 0.2.0). None of it needs a browser: a drawing is handed
// over by a stand-in (test/diagram-stub.js) or shaped by hand, and the checks are on what the compiler does with it.
//   - a body map's figure: a plain one is written (ids prefixed, regions named); each hostile one is refused with its reason, and the
//     figure rule is the renderer's own sanitizer rule read by name, so a figure the renderer would change is refused too;
//   - a drawn diagram: its style stays inside it, its animations and outside rules go, its ids are scoped, it is named, it has its
//     paper; hostile drawings (a script, a foreignObject, an outside style, an address, an @import, an event handler) are refused;
//   - image sizes read from the bytes of a PNG, a JPEG, a GIF, a WebP (lossy, lossless, extended) and an SVG; unreadable is no size;
//   - with no browser a build keeps each diagram as its source and says why, and the booklet still compiles;
//   - the diagram part is the file the renderer pins; the theme list is the renderer's, key by key.
// Run: node test/compile-figures.test.js      (Needs node; nothing to install.)
const fs=require("fs"),os=require("os"),path=require("path"),crypto=require("crypto");
process.env.PLAYWRIGHT="/nonexistent/playwright-core";
const C=require("../compile/compile.js"),G=require("../compile/diagrams.js"),E=require("../compile/engine.js"),STUB=require("./diagram-stub.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const X=E.load(),R=X.R;
/* a page may carry its description as data (JSON-LD); a script that runs is another thing */
const runsScript=page=>/<script(?![^>]*type="application\/ld\+json")/i.test(page);

/* ---- a body map's figure ---- */
const fig=(svg,extra)=>G.figure(svg,{R,svgProblem:C.svgProblem,prefix:"bk-f1",labelOf:id=>"Label "+id,...(extra||{})});
const plain='<svg viewBox="0 0 100 100"><defs><clipPath id="c"><rect width="50" height="50"/></clipPath></defs><g clip-path="url(#c)"><rect class="rg" data-r="top" x="1" y="1" width="40" height="40" fill="#cde"/></g><text x="5" y="90">Profile: front</text></svg>';
{const p=fig(plain);
  chk("a plain figure is written",p.ok&&p.html.startsWith("<svg "),p.why);
  chk("…its ids and the references to them take the figure's prefix",p.ok&&p.html.includes('id="bk-f1-c"')&&p.html.includes("url(#bk-f1-c)")&&!/ id="c"/.test(p.html));
  chk("…a region is a picture, named by its label",p.ok&&p.html.includes('role="img"')&&p.html.includes('aria-label="Label top"'));
  chk("…the words of a label are text, and a word such as Profile: is not read as an address",p.ok&&p.html.includes("Profile: front"));
  chk("…it carries no script, no xmlns and no author text beyond what was read",p.ok&&!/<script|xmlns|on\w+=/i.test(p.html));}
const hostile={
 "a script":'<svg viewBox="0 0 10 10"><script>alert(1)</script><rect width="5" height="5"/></svg>',
 "a foreignObject":'<svg viewBox="0 0 10 10"><foreignObject width="5" height="5"><p>hi</p></foreignObject></svg>',
 "an event handler":'<svg viewBox="0 0 10 10"><rect width="5" height="5" onclick="alert(1)"/></svg>',
 "a link element":'<svg viewBox="0 0 10 10"><a href="#x"><rect id="x" width="5" height="5"/></a></svg>',
 "an outside address":'<svg viewBox="0 0 10 10"><image href="https://example.invalid/x.png" width="5" height="5"/></svg>',
 "an href to the outside":'<svg viewBox="0 0 10 10"><use href="https://example.invalid/x.svg#a"/></svg>',
 "a javascript address":'<svg viewBox="0 0 10 10"><rect width="5" height="5" fill="javascript:alert(1)"/></svg>',
 "a url() to the outside":'<svg viewBox="0 0 10 10"><rect width="5" height="5" style="fill:url(https://example.invalid/a.svg#b)"/></svg>',
 "a style element":'<svg viewBox="0 0 10 10"><style>@import "https://example.invalid/a.css";</style><rect width="5" height="5"/></svg>',
 "markup inside a title (a browser reads it as HTML there)":'<svg viewBox="0 0 10 10"><title><rect width="1" height="1"/>words</title></svg>',
 "markup inside a desc":'<svg viewBox="0 0 10 10"><desc><g/>words</desc></svg>',
 "an element the renderer drops":'<svg viewBox="0 0 10 10"><iframe src="#x"/></svg>',
 "an attribute name the renderer does not keep (tabindex, harmless by its value)":'<svg viewBox="0 0 10 10"><rect width="5" height="5" tabindex="0"/></svg>',
 "an attribute the renderer drops":'<svg viewBox="0 0 10 10"><rect width="5" height="5" onmouseover="x()" /></svg>',
 "a style property the renderer drops":'<svg viewBox="0 0 10 10"><rect width="5" height="5" style="behavior:url(#a)"/></svg>',
 "a reference to an id the figure lacks":'<svg viewBox="0 0 10 10"><rect width="5" height="5" fill="url(#nowhere)"/></svg>',
 "an id the renderer does not keep":'<svg viewBox="0 0 10 10"><rect id="a b" width="5" height="5"/></svg>',
 "a namespace prefix":'<svg xmlns:p="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><p:script>alert(1)</p:script></svg>',
 "an unclosed element":'<svg viewBox="0 0 10 10"><rect width="5" height="5">',
 "text after the root":'<svg viewBox="0 0 10 10"/>stray',
 "a second root":'<svg viewBox="0 0 10 10"/><svg viewBox="0 0 10 10"/>',
 "an entity":'<!DOCTYPE svg [<!ENTITY a "b">]><svg viewBox="0 0 10 10"><text>&a;</text></svg>',
 "a control character":'<svg viewBox="0 0 10 10"><text>a\u0001b</text></svg>',
 "an unquoted value":'<svg viewBox=0 0 10 10><rect width=5 height=5/></svg>',
 "a set that changes a link":'<svg viewBox="0 0 10 10"><rect id="r" width="5" height="5"/><set attributeName="href" to="javascript:alert(1)"/></svg>'};
for(const [name,svg] of Object.entries(hostile)){
  let r;try{r=fig(svg);}catch(e){r={ok:true,html:"threw: "+e.message};}
  chk("a figure with "+name+" is refused, with a reason",r.ok===false&&typeof r.why==="string"&&r.why.length>10,r.ok?"written: "+String(r.html).slice(0,120):"");
  chk("…and its reason quotes no more than a short piece of it",r.ok===false&&r.why.length<400);}
chk("a refused figure leaves the booklet compiling, with its places listed and a reason in the report",(()=>{
  const run=C.compile([{file:path.join(__dirname,"compile-assets","compile-bodymap.booklet.md")}],{form:"standalone",engine:X,drawer:STUB.drawer}),r=run.results[0],page=r.files.get("compile-bodymap/index.html")||"";
  const m=r.rep.marked.find(x=>x.kind==="regionsFigure");
  return r.rep.ok&&!!m&&/figure/.test(m.what+m.why)&&page.includes("<!-- booklet: ")&&C.reportText(run).includes(m.why)&&!/<svg[^>]*>[^]*<script/i.test(page.replace(/<!--[^]*?-->/g,""))&&!runsScript(page.replace(/<!--[^]*?-->/g,""));})());
/* the reason is written into an HTML comment, and what it quotes of the figure must not be able to end the comment */
{const evil='--><script>alert(1)</script><!--',svg='<svg viewBox="0 0 10 10"><rect id="'+evil+'" class="rg" data-r="box" width="5" height="5"/></svg>';
  const text='---\nbooklet: "0.16"\nid: t/evil\ntitle: Evil\nlang: en\n---\n\n# Evil\n\n> [!widget|m readonly] Map\n> ![[#^m]]\n\n```booklet widget\n'
    +JSON.stringify({engine:"svg-regions",figures:[{id:"f",label:"F",svg,regions:["box"]}],regions:[{id:"box",label:"Box"}],copy:{h:"Map",p:"Here."}})+"\n```\n^m\n";
  const run=C.compile([{text,name:"evil",dir:__dirname}],{form:"standalone",engine:X,drawer:STUB.drawer}),r=run.results[0],page=r.files.get("evil/index.html")||"";
  chk("what a hostile figure quotes in its reason cannot end the comment that carries it",r.rep.ok&&r.rep.marked.some(m=>m.kind==="regionsFigure")&&!runsScript(page.replace(/<!--[^]*?-->/g,""))&&!page.includes(evil)&&!/-->\s*<script/.test(page),r.rep.refused);}

/* ---- the renderer's rule is the figure's: every element, attribute and style property it keeps is kept here, and nothing else ---- */
{const kept=[...R.SVG_KEEP].filter(e=>e!=="svg"&&e!=="style"&&e!=="script");
  const bad=kept.filter(e=>{const r=fig('<svg viewBox="0 0 10 10"><'+e+"/></svg>");return !r.ok&&!/link|reference/.test(r.why)&&/does not keep/.test(r.why);});
  chk("every element the renderer's figure rule keeps is accepted by name (no element is refused that the renderer would keep)",!bad.length,bad.join(", "));
  const props=[...R.SVG_STYLE_PROPS].filter(p=>R.svgValueOk("red")).slice(0,40);
  const badp=props.filter(p=>!fig('<svg viewBox="0 0 10 10"><rect style="'+p+':red"/></svg>').ok);
  chk("every style property the renderer keeps is accepted",!badp.length,badp.join(", "));
  const notp=["behavior","-moz-binding","position","content"].filter(p=>!R.SVG_STYLE_PROPS.has(p)&&!R.svgFamily(p));
  chk("a style property the renderer drops is refused here",notp.length&&notp.every(p=>!fig('<svg viewBox="0 0 10 10"><rect style="'+p+':red"/></svg>').ok));}

/* ---- a drawn diagram ---- */
const wrap2=inner=>'<svg id="bkdgrender" viewBox="0 0 100 50" style="max-width: 100px;" role="graphics-document document">'+inner+"</svg>";
const dctx={svgProblem:C.svgProblem,prefix:"bk-dg1",paper:"#F8F6F1",word:"Diagram"};
const stubSvg=STUB.svg(1,"graph LR");
{const d=G.diagram(stubSvg,dctx);
  chk("a drawn diagram is written",d.ok,d.why);
  chk("…its library id is its own now",d.ok&&d.html.includes('id="bk-dg1"')&&!d.html.includes("bkdgrender"));
  chk("…every style rule begins with its own id",d.ok&&(/<style>([^]*?)<\/style>/.exec(d.html)[1].split("\n").filter(Boolean).every(l=>l.startsWith("#bk-dg1"))));
  chk("…the animation, the rule for a class it lacks and the :root rule are gone",d.ok&&!/keyframes|animation|\.unused/.test(d.html)&&!/:root/.test(d.html));
  chk("…a rule it uses is kept",d.ok&&/#bk-dg1 \.node rect\{/.test(d.html));
  chk("…the size is a width, from the library's max-width, with no style or height on the root",d.ok&&/^<svg [^>]*\bwidth="220"/.test(d.html)&&!/^<svg [^>]*(\bstyle=|\bheight=)/.test(d.html));
  chk("…the nodes' ids that nothing points at are gone, and the marker's stays",d.ok&&!d.html.includes("flowchart-A-0")&&/id="bk-dg1_flowchart-v2-pointEnd"/.test(d.html));
  chk("…it has its paper behind it, and a name for a screen reader",d.ok&&/<rect x="0" y="0" width="220" height="64" fill="#F8F6F1"\/>/.test(d.html)&&d.html.includes('aria-label="Diagram"')&&d.name==="Diagram");
  const t=G.diagram(STUB.svg(2,"flowchart\n accTitle: Tides, by the hour"),dctx);
  chk("a title the source gave is its name, and its id follows the root's",t.ok&&t.name==="Tides, by the hour"&&t.html.includes('aria-label="Tides, by the hour"')&&!/aria-labelledby/.test(t.html));
  const paint=G.diagram(wrap2('<style>#bkdgrender .lib{fill:red}</style><rect class="lib" width="5" height="5" fill="none" stroke-width="2"/><path d="M0 0L5 5" stroke="#123456" fill="a;b"/>'),dctx);
  const st=paint.ok?/<style>([^]*?)<\/style>/.exec(paint.html)[1]:"";
  chk("a paint written as an attribute is also a rule of the diagram's own, ahead of the library's, so a host's rule for bare shapes does not repaint it",
    paint.ok&&st.includes('#bk-dg1 :where([fill="none"]){fill:none}')&&st.includes('#bk-dg1 :where([stroke-width="2"]){stroke-width:2}')&&st.includes('#bk-dg1 :where([stroke="#123456"]){stroke:#123456}')
    &&st.indexOf(':where([fill="none"])')<st.indexOf("#bk-dg1 .lib{"),paint.why||st);
  chk("…each one has the weight of the id alone (an element or a class in the library's own rule outweighs it), and no attribute rule is written twice",
    paint.ok&&st.split("\n").filter(l=>/:where\(\[/.test(l)).every(l=>/^#bk-dg1 :where\(\[[a-z-]+="[^"]*"\]\)\{/.test(l))&&(st.match(/:where\(\[fill="none"\]\)/g)||[]).length===1);
  chk("…a value outside a plain set of characters stays an attribute (no rule is written for it)",paint.ok&&!st.includes("a;b")&&paint.html.includes('fill="a;b"'));
  chk("…each paint property an element does not carry is sent back to what it inherits, at the weight of the id alone",paint.ok&&["fill","stroke","stroke-width"].every(k=>st.includes("#bk-dg1 :where(:not(["+k+"])){"+k+":inherit}")));
  const nostyle=G.diagram('<svg id="bkdgrender" viewBox="0 0 10 10"><rect width="5" height="5" fill="red"/></svg>',dctx);
  chk("a drawing with no style of its own is given one, for the same",nostyle.ok&&/<style>#bk-dg1 :where\(:not\(\[fill\]\)\)/.test(nostyle.html)&&nostyle.html.indexOf("<style>")>nostyle.html.indexOf("<rect x="),nostyle.why||nostyle.html);
  const tg=G.diagram(wrap2('<g class="mermaid-tmp-group"/><g class="keep"/>'),dctx);
  chk("the library's empty scratch group is left off, another group is kept",tg.ok&&!tg.html.includes("mermaid-tmp-group")&&tg.html.includes('class="keep"'),tg.why);
  const w=G.diagram(stubSvg,{...dctx,word:"Diagramme"});chk("with no title, the name is the page's word for a diagram",w.ok&&w.name==="Diagramme");}
const wrap=inner=>'<svg id="bkdgrender" viewBox="0 0 100 50" style="max-width: 100px;" role="graphics-document document">'+inner+"</svg>";
const hdiag={
 "a script":wrap("<script>alert(1)</script>"),
 "a foreignObject (a diagram laid out as HTML)":wrap('<foreignObject width="50" height="20"><div xmlns="http://www.w3.org/1999/xhtml">hi</div></foreignObject>'),
 "a style outside the diagram":wrap("<style>body{display:none}</style>"),
 "a style with an @import":wrap("<style>@import url(https://example.invalid/a.css);#bkdgrender{fill:red}</style>"),
 "a style with a selector that reaches out":wrap("<style>#bkdgrender,.x{fill:red}</style>"),
 "a style with another id that starts with its own":wrap("<style>#bkdgrender2 rect{fill:red}</style>"),
 "a style with a media rule":wrap("<style>@media print{#bkdgrender{fill:red}}</style>"),
 "a style with a url()":wrap("<style>#bkdgrender rect{fill:url(https://example.invalid/a.svg#a)}</style>"),
 "a style that never closes":wrap("<style>#bkdgrender rect{fill:red</style>"),
 "an event handler":wrap('<rect width="5" height="5" onload="alert(1)"/>'),
 "a link to the outside":wrap('<a href="https://example.invalid/"><rect width="5" height="5"/></a>'),
 "an image from the outside":wrap('<image href="https://example.invalid/x.png" width="5" height="5"/>'),
 "a data: address":wrap('<image href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" width="5" height="5"/>'),
 "a javascript: address":wrap('<use href="javascript:alert(1)"/>'),
 "an animation of a link":wrap('<a id="k"><rect width="5" height="5"/><animate attributeName="href" values="javascript:alert(1)"/></a>'),
 "an iframe":wrap('<iframe src="x"/>'),
 "markup inside a title":wrap('<title><rect width="1" height="1"/></title>'),
 "markup inside a desc":wrap('<desc><g/></desc>'),
 "no viewBox":'<svg id="bkdgrender" style="max-width: 100px;"><rect width="5" height="5"/></svg>',
 "a viewBox that is not a box":'<svg id="bkdgrender" viewBox="0 0 0 0"><rect width="5" height="5"/></svg>',
 "text that is not SVG":"<html><body>hi</body></html>",
 "a namespace prefix":wrap('<p:script xmlns:p="http://www.w3.org/2000/svg">alert(1)</p:script>'),
 "a drawing larger than the cap":wrap("<desc>"+"x".repeat(G.MAX_DIAGRAM_BYTES)+"</desc>")};
for(const [name,svg] of Object.entries(hdiag)){
  let d;try{d=G.diagram(svg,dctx);}catch(e){d={ok:true,html:"threw: "+e.message};}
  chk("a drawing with "+name+" is refused, with a reason",d.ok===false&&typeof d.why==="string"&&d.why.length>10,d.ok?"written: "+String(d.html).slice(0,160):"");}
{const d=G.diagram(wrap('<text x="1" y="9">&lt;script&gt;alert(1)&lt;/script&gt; &amp; "Profile: front"</text><title>T &amp; U</title>'),dctx);
  chk("text in a drawing is escaped, never markup: a label that spells a script tag is only text",d.ok&&!/<script/i.test(d.html)&&d.html.includes("&lt;script&gt;")&&d.name==="T & U",d.why||d.html);}

/* ---- the style scope on its own ---- */
{const s=(css,cls)=>G.scopeStyle(css,"bk-dg1",cls);
  chk("a rule on the diagram's own id is kept",s("#bk-dg1 .a{fill:red}").css==="#bk-dg1 .a{fill:red}");
  chk("a selector list is kept whole when every part begins with the id",s("#bk-dg1 a,#bk-dg1 b{x:y}").css==="#bk-dg1 a,#bk-dg1 b{x:y}");
  chk("a rule on a bare element or another id is refused",!!s("rect{fill:red}").why&&!!s("#other .a{x:y}").why&&!!s("#bk-dg10 .a{x:y}").why&&!!s("#bk-dg1x{x:y}").why);
  chk("a keyframes block is dropped, with its nested braces",s("@keyframes k{from{a:b}to{c:d}}#bk-dg1 .a{x:y}").css==="#bk-dg1 .a{x:y}");
  chk("any other at-rule is refused",!!s("@media print{#bk-dg1 .a{x:y}}").why&&!!s("@import 'x';#bk-dg1 .a{x:y}").why&&!!s("@font-face{src:url(x)}").why);
  chk("a comment hides nothing",s("/* #x{} */#bk-dg1 .a{x:y}").css==="#bk-dg1 .a{x:y}");
  chk("with the classes the drawing uses, a rule for a class it lacks is dropped",s("#bk-dg1 .a{x:y}#bk-dg1 .b{x:y}",new Set(["a"])).css==="#bk-dg1 .a{x:y}");
  chk("a rule needing a class inside :not() is kept (it can match without it)",s("#bk-dg1 :not(.b){x:y}",new Set(["a"])).css==="#bk-dg1 :not(.b){x:y}");
  chk("a rule on :root is dropped, since inside the diagram it can match nothing",s("#bk-dg1 :root{--a:b}#bk-dg1 .a{x:y}").css==="#bk-dg1 .a{x:y}"&&s("#bk-dg1 :root{--a:b}",new Set()).css==="");
  chk("a rule that never closes, or has no body, is refused",!!s("#bk-dg1 .a{x:y").why&&!!s("#bk-dg1 .a").why);}

/* ---- image sizes ---- */
{const be=(n,k)=>{const b=Buffer.alloc(k);b.writeUIntBE(n,0,k);return b;},le=(n,k)=>{const b=Buffer.alloc(k);b.writeUIntLE(n,0,k);return b;};
  const png=(w,h)=>Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),be(13,4),Buffer.from("IHDR"),be(w,4),be(h,4),Buffer.alloc(5)]);
  const gif=(w,h)=>Buffer.concat([Buffer.from("GIF89a"),le(w,2),le(h,2),Buffer.alloc(3)]);
  const jpg=(w,h)=>Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0,0,16]),Buffer.from("JFIF\0"),Buffer.alloc(9),Buffer.from([0xff,0xc0,0,17,8]),be(h,2),be(w,2),Buffer.from([3,1,0x22,0,2,0x11,1,3,0x11,1])]);
  const riff=(kind,body)=>Buffer.concat([Buffer.from("RIFF"),le(4+8+body.length,4),Buffer.from("WEBP"),Buffer.from(kind),le(body.length,4),body]);
  const vp8=(w,h)=>riff("VP8 ",Buffer.concat([Buffer.alloc(3),Buffer.from([0x9d,0x01,0x2a]),le(w,2),le(h,2),Buffer.alloc(4)]));
  const vp8l=(w,h)=>{const bits=((w-1)|((h-1)<<14))>>>0;return riff("VP8L",Buffer.concat([Buffer.from([0x2f]),le(bits,4),Buffer.alloc(4)]));};
  const vp8x=(w,h)=>riff("VP8X",Buffer.concat([Buffer.alloc(4),le(w-1,3),le(h-1,3),Buffer.alloc(4)]));
  const sz=(ext,b)=>{const s=C.imageSize(ext,b);return s?s.width+"x"+s.height:null;};
  chk("a PNG's size is read from its header",sz("png",png(640,480))==="640x480");
  chk("a GIF's size is read from its screen",sz("gif",gif(40,30))==="40x30");
  chk("a JPEG's size is read from its first frame header, past other segments",sz("jpg",jpg(800,600))==="800x600"&&sz("jpeg",jpg(5,7))==="5x7");
  chk("a lossy WebP's size is read",sz("webp",vp8(72,54))==="72x54");
  chk("a lossless WebP's size is read",sz("webp",vp8l(300,200))==="300x200"&&sz("webp",vp8l(1,1))==="1x1"&&sz("webp",vp8l(16384,16384))==="16384x16384");
  chk("an extended WebP's size is read",sz("webp",vp8x(1024,768))==="1024x768");
  const svg=s=>Buffer.from(s);
  chk("an SVG's width and height are used when both are plain numbers (px allowed)",sz("svg",svg('<svg xmlns="http://www.w3.org/2000/svg" width="50" height="40px" viewBox="0 0 5 4"/>'))==="50x40");
  chk("an SVG with only a viewBox is scaled by powers of ten to reach 100 wide",sz("svg",svg('<svg viewBox="0 0 12 9"/>'))==="120x90"&&sz("svg",svg('<svg viewBox="0 0 640 480"/>'))==="640x480"&&sz("svg",svg('<svg viewBox="0 0 0.5 0.25"/>'))==="500x250");
  chk("an SVG's width in a unit that is not px is not trusted: the viewBox is used",sz("svg",svg('<svg width="10em" height="5em" viewBox="0 0 200 100"/>'))==="200x100");
  chk("a size that cannot be read is none: a cut-off file, an empty one, a zero, a huge one, an SVG with neither",
    sz("png",png(1,1).subarray(0,14))===null&&sz("png",Buffer.alloc(0))===null&&sz("png",png(0,10))===null&&sz("png",png(100001,10))===null
    &&sz("gif",Buffer.from("GIF89a"))===null&&sz("jpg",Buffer.from([0xff,0xd8,0xff,0xd9]))===null&&sz("webp",Buffer.from("RIFF....WEBPVP8 "))===null&&sz("svg",svg("<svg/>"))===null&&sz("svg",svg("not svg"))===null);
  chk("a size is never a fraction",Number.isInteger(C.imageSize("svg",svg('<svg width="10.6" height="3.2"/>')).width));
  /* end to end: the sizes are on the page's <img>, in order src, alt, width, height; a file with no size is written as in 0.1.0 */
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bk-sizes-"));
  try{
    fs.writeFileSync(path.join(dir,"a.png"),png(64,48));fs.writeFileSync(path.join(dir,"b.gif"),gif(40,30));
    fs.writeFileSync(path.join(dir,"c.png"),png(1,1).subarray(0,16)); /* a PNG signature, then cut off before its size */
    const text='---\nbooklet: "0.16"\nid: t/sizes\ntitle: Sizes\nlang: en\n---\n\n# Sizes\n\nImages.\n\n![A wave](a.png)\n\n![A gull](b.gif)\n\n![Cut off](c.png)\n';
    const r=C.compile([{text,name:"sizes",dir}],{form:"standalone",engine:X}).results[0],page=r.files.get("sizes/index.html")||"";
    chk("the sizes are written on the images, after the alt text",/<img src="a\.png" alt="A wave" width="64" height="48"\s*\/?>/.test(page)&&/<img src="b\.gif" alt="A gull" width="40" height="30"\s*\/?>/.test(page),page.match(/<img[^>]*>/g));
    chk("an image whose size cannot be read is drawn as before, with no size",/<img src="c\.png" alt="Cut off"\s*\/?>/.test(page)||/Cut off/.test(page)&&!/c\.png" alt="Cut off" width/.test(page));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}}

/* ---- no browser: the source stays, and the reason is given ---- */
{const text='---\nbooklet: "0.16"\nid: t/nobrowser\ntitle: No browser\nlang: en\n---\n\n# No browser\n\nA diagram.\n\n```mermaid\ngraph LR; A --> B\n```\n\nAfter it.\n';
  for(const [label,opts] of [["PLAYWRIGHT names nothing",{}],["browser: false",{browser:false}],["browser: a path with no package",{browser:path.join(os.tmpdir(),"bk-no-such-playwright")}]]){
    const run=C.compile([{text,name:"nb",dir:__dirname}],{form:"standalone",engine:X,...opts}),r=run.results[0],page=r.files.get("nb/index.html")||"";
    chk("with no usable browser ("+label+") the booklet still compiles",r.rep.ok&&page.includes("After it."));
    chk("…the diagram stays as its source in a code block",/<pre class="bk-figure-src"><code data-lang="mermaid">graph LR; A --&gt; B<\/code><\/pre>/.test(page)&&!/<figure class="bk-diagram">/.test(page));
    chk("…the page says why, and the report has the same line",/<!-- booklet: a mermaid fence[^>]*no browser to draw it with/.test(page)&&/no browser to draw it with/.test(C.reportText(run)));
    chk("…the page carries no mermaid script, nor any that runs",!runsScript(page));}
  const none=C.compile([{text,name:"nb",dir:__dirname}],{form:"standalone",engine:X,drawer:codes=>new Map(codes.map(c=>[c,{why:"the browser took too long"}]))}).results[0];
  chk("a drawer that fails gives its reason on the page and in the report",none.rep.ok&&/the browser took too long/.test(none.files.get("nb/index.html"))&&none.rep.marked.some(m=>/the browser took too long/.test(m.why||"")));
  const bad=C.compile([{text,name:"nb",dir:__dirname}],{form:"standalone",engine:X,drawer:codes=>new Map(codes.map(c=>[c,{svg:wrap("<script>alert(1)</script>")}]))}).results[0];
  chk("a drawing the SVG rules refuse falls back to the source, with the rules' reason, and the page has no script",bad.rep.ok&&/data-lang="mermaid"/.test(bad.files.get("nb/index.html"))&&!runsScript(bad.files.get("nb/index.html"))
    &&bad.rep.marked.some(m=>/SVG|script/.test(m.why||"")));
  const asked=[];
  C.compile([{text,name:"nb",dir:__dirname}],{form:"standalone",engine:X,drawer:codes=>{asked.push(codes.slice());return STUB.drawer(codes);}});
  chk("the drawer is asked once, for the diagrams the run holds",asked.length===1&&asked[0].length===1);
  const plainText=text.replace(/```mermaid[^]*?```/,"No diagram here.");
  C.compile([{text:plainText,name:"nb",dir:__dirname}],{form:"standalone",engine:X,drawer:codes=>{asked.push("called");return STUB.drawer(codes);}});
  chk("a booklet with no diagram never asks for a browser",!asked.includes("called"));
  /* the screen: a source the renderer refuses to draw is not handed over */
  const risky=text.replace("graph LR; A --> B","%%{init: {\"themeCSS\": \".a{background:url(https://example.invalid/x)}\"}}%%\ngraph LR; A --> B");
  const seen=[];
  const rr=C.compile([{text:risky,name:"nb",dir:__dirname}],{form:"standalone",engine:X,drawer:codes=>{seen.push(...codes);return STUB.drawer(codes);}}).results[0];
  chk("a source the renderer's own screen refuses is never handed to the browser",seen.length===0&&/data-lang="mermaid"/.test(rr.files.get("nb/index.html")));}

/* ---- finding the browser ---- */
{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"bk-pw-"));
  try{
    fs.writeFileSync(path.join(tmp,"package.json"),"{}");
    chk("findPlaywright takes a path that holds a package",G.findPlaywright(tmp)===path.resolve(tmp));
    chk("…false means none, and a path with no package is none",G.findPlaywright(false)===null&&G.findPlaywright(path.join(tmp,"nope"))===null);
    chk("…the PLAYWRIGHT variable is the only place looked in when it is set",G.findPlaywright()===null);
    const was=process.env.PLAYWRIGHT;process.env.PLAYWRIGHT=tmp;
    chk("…and it is found there",G.findPlaywright()===path.resolve(tmp));
    process.env.PLAYWRIGHT=was;
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}}

/* ---- the part is the file the renderer pins ---- */
{const part=G.partSource(X);
  if(part.text!==undefined){
    chk("the diagram part is the file the renderer pins (its hash is LIB_SRI)",("sha256-"+crypto.createHash("sha256").update(part.text,"utf8").digest("base64"))===R.LIB_SRI.mermaid);
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bk-part-"));
    try{
      fs.mkdirSync(path.join(dir,"parts"));fs.writeFileSync(path.join(dir,"booklet.html"),"<html></html>");
      fs.writeFileSync(path.join(dir,"parts","mermaid.js"),part.text+"\n/* changed */");
      const w=G.partSource({file:path.join(dir,"booklet.html"),R});
      chk("a part that is not the pinned file is refused, and so no browser is started",!!w.why&&/pins/.test(w.why)&&w.text===undefined);
      fs.rmSync(path.join(dir,"parts"),{recursive:true});
      const m=G.partSource({file:path.join(dir,"booklet.html"),R});
      chk("a part that cannot be found is said so",!!m.why&&/not found/.test(m.why));
    }finally{fs.rmSync(dir,{recursive:true,force:true});}
  }else chk("the diagram part is found beside the renderer",false,part.why);}

/* ---- the theme: the renderer's list, key by key ---- */
{const html=fs.readFileSync(X.file,"utf8"),m=/function mermaidConfig\(\)\{([^]*?)\n\/\* draw \(or re-draw\)/.exec(html);
  chk("the renderer's mermaidConfig is found",!!m);
  const theirs=new Map([...(m?m[1]:"").matchAll(/\b([A-Za-z]+):v\("([a-z-]+)"\)/g)].map(x=>[x[1],x[2]]));
  const ours=G.THEME_TOKENS;
  const canon=name=>/^tone-/.test(name)?name.replace(/^tone-/,"").replace(/-deep$/,"-ink"):name;
  const missing=[...theirs.keys()].filter(k=>!(k in ours)&&k!=="fontFamily"),extra=Object.keys(ours).filter(k=>!theirs.has(k)&&k!=="darkMode");
  chk("every theme variable the renderer sets, the compiler sets, and none else (the renderer sets "+theirs.size+")",theirs.size>30&&!missing.length&&!extra.length,"missing "+missing+" / extra "+extra);
  const odd=[...theirs].filter(([k,t])=>k in ours&&ours[k]!==canon(t)&&!(t==="on-accent"&&ours[k]==="#FFFFFF"));
  chk("…each is the same colour: the renderer's variable, in the Paper table's name for it",!odd.length,odd.map(([k,t])=>k+": "+t+" vs "+ours[k]).join("; "));
  const colours=G.paperColours(fs.readFileSync(path.join(__dirname,"..","compile","booklet.css"),"utf8"));
  const lacking=Object.values(ours).filter(t=>!t.startsWith("#")&&!/^#[0-9A-Fa-f]{6}$/.test(colours[t]||""));
  chk("…and each name is a colour in the stylesheet's Paper table",!lacking.length&&/^#[0-9A-Fa-f]{6}$/.test(colours.paper||""),lacking.join(", "));
  const cfg=G.mermaidConfig(colours,"Atkinson Hyperlegible");
  chk("the configuration is the renderer's: strict, no HTML labels, the base theme, light",cfg.securityLevel==="strict"&&cfg.htmlLabels===false&&cfg.flowchart.htmlLabels===false&&cfg.theme==="base"&&cfg.themeVariables.darkMode===false&&cfg.suppressErrorRendering===true);}

console.log(fails?"\n"+fails+" FAILURES":"\ncompile figures passed");process.exit(fails?1:0);
