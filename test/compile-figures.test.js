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
const fs=require("fs"),os=require("os"),path=require("path"),crypto=require("crypto"),cp=require("child_process");
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
  const text='---\nbooklet: "0.17"\nid: t/evil\ntitle: Evil\nlang: en\n---\n\n# Evil\n\n> [!widget|m readonly] Map\n> ![[#^m]]\n\n```booklet widget\n'
    +JSON.stringify({engine:"svg-regions",figures:[{id:"f",label:"F",svg,regions:["box"]}],regions:[{id:"box",label:"Box"}],copy:{h:"Map",p:"Here."}})+"\n```\n^m\n";
  const run=C.compile([{text,name:"evil",dir:__dirname}],{form:"standalone",engine:X,drawer:STUB.drawer}),r=run.results[0],page=r.files.get("evil/index.html")||"";
  chk("what a hostile figure quotes in its reason cannot end the comment that carries it",r.rep.ok&&r.rep.marked.some(m=>m.kind==="regionsFigure")&&!runsScript(page.replace(/<!--[^]*?-->/g,""))&&!page.includes(evil)&&!/-->\s*<script/.test(page),r.rep.refused);}

/* ---- the renderer's rule is the figure's: every element, attribute and style property it keeps is kept here, and nothing else ---- */
{const kept=[...R.SVG_KEEP].filter(e=>e!=="svg"&&e!=="style"&&e!=="script");
  const bad=kept.filter(e=>{const r=fig('<svg viewBox="0 0 10 10"><'+e+"/></svg>");return !r.ok&&!/link|reference/.test(r.why)&&/does not keep/.test(r.why);});
  chk("every element the renderer's figure rule keeps is accepted by name (no element is refused that the renderer would keep)",!bad.length,bad.join(", "));
  const props=[...R.SVG_STYLE_PROPS];
  const badp=props.filter(p=>{const r=fig('<svg viewBox="0 0 10 10"><rect style="'+p+':red"/></svg>');return !r.ok||!r.html.includes(p+":red");});
  chk("every style property the renderer keeps ("+props.length+") is accepted, and written out with its value",props.length>0&&!badp.length,badp.join(", "));
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
    const text='---\nbooklet: "0.17"\nid: t/sizes\ntitle: Sizes\nlang: en\n---\n\n# Sizes\n\nImages.\n\n![A wave](a.png)\n\n![A gull](b.gif)\n\n![Cut off](c.png)\n';
    const r=C.compile([{text,name:"sizes",dir}],{form:"standalone",engine:X}).results[0],page=r.files.get("sizes/index.html")||"";
    chk("the sizes are written on the images, after the alt text",/<img src="a\.png" alt="A wave" width="64" height="48"\s*\/?>/.test(page)&&/<img src="b\.gif" alt="A gull" width="40" height="30"\s*\/?>/.test(page),page.match(/<img[^>]*>/g));
    chk("an image whose size cannot be read is drawn as before, with no size",/<img src="c\.png" alt="Cut off"\s*\/?>/.test(page)||/Cut off/.test(page)&&!/c\.png" alt="Cut off" width/.test(page));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}}

/* ---- no browser: the source stays, and the reason is given ---- */
{const text='---\nbooklet: "0.17"\nid: t/nobrowser\ntitle: No browser\nlang: en\n---\n\n# No browser\n\nA diagram.\n\n```mermaid\ngraph LR; A --> B\n```\n\nAfter it.\n';
  for(const [label,opts] of [["PLAYWRIGHT names nothing",{}],["browser: false",{browser:false}],["browser: a path with no package",{browser:path.join(os.tmpdir(),"bk-no-such-playwright")}]]){
    const run=C.compile([{text,name:"nb",dir:__dirname}],{form:"standalone",engine:X,...opts}),r=run.results[0],page=r.files.get("nb/index.html")||"";
    chk("with no usable browser ("+label+") the booklet still compiles",r.rep.ok&&page.includes("After it."));
    chk("…the diagram stays as its source in a code block",/<pre class="bk-figure-src"><code data-lang="mermaid">graph LR; A --&gt; B<\/code><\/pre>/.test(page)&&!/<figure class="bk-diagram">/.test(page));
    chk("…the page says why, and the report has the same line",/<!-- booklet: a mermaid fence \(its 1st diagram, \u201cgraph LR; A --&gt;[^]*?no browser to draw it with/.test(page)||/<!-- booklet: a mermaid fence \(its 1st diagram, \u201cgraph LR; A -[^]*?no browser to draw it with/.test(page)&&/no browser to draw it with/.test(C.reportText(run)));
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

/* ======================= the fix round: what a review found, each held by a check that fails without its fix ======================= */
const mkdir=p=>fs.mkdtempSync(path.join(os.tmpdir(),p));
const widgetBooklet=(id,svg,extra)=>'---\nbooklet: "0.17"\nid: t/'+id+'\ntitle: '+id+'\nlang: en\n---\n\n# '+id+'\n\n> [!widget|m readonly] Map\n> ![[#^m]]\n\n```booklet widget\n'
  +JSON.stringify({engine:"svg-regions",figures:[{id:"f",label:"F",svg,regions:["box"]}],regions:[{id:"box",label:"Box"}],copy:{h:"Map",p:"Here."}})+"\n```\n^m\n"+(extra||"");

/* ---- the Playwright package is looked for in named places only, never in the folder the compiler is started in ---- */
{const fake=mkdir("bk-cwd-"),mark=path.join(fake,"PWNED.txt");
  try{
    fs.mkdirSync(path.join(fake,"node_modules","playwright"),{recursive:true});
    fs.writeFileSync(path.join(fake,"node_modules","playwright","package.json"),'{"name":"playwright"}');
    fs.writeFileSync(path.join(fake,"node_modules","playwright","index.js"),'require("fs").writeFileSync('+JSON.stringify(mark)+',"ran");');
    const env={...process.env};delete env.PLAYWRIGHT;
    const ask=(e,code)=>cp.spawnSync(process.execPath,["-e",code],{cwd:fake,env:e,encoding:"utf8"}).stdout.trim();
    const where=ask(env,'console.log(JSON.stringify(require('+JSON.stringify(path.join(__dirname,"..","compile","diagrams.js"))+').findPlaywright()))');
    chk("a package in node_modules of the folder the compiler is run from is not found or run",!where.includes(fake)&&!fs.existsSync(mark),where);
    const places=ask(env,'console.log(JSON.stringify(require('+JSON.stringify(path.join(__dirname,"..","compile","diagrams.js"))+').playwrightPlaces()))');
    chk("…nor is it among the places looked in (named from the compiler's own folder, none from the working folder)",JSON.stringify(JSON.parse(places))===JSON.stringify([path.join(__dirname,"..","node_modules","playwright"),path.join(__dirname,"..","node_modules","playwright-core"),path.join(__dirname,"..","..",".tools","node_modules","playwright-core")]),places);
    chk("…and with the PLAYWRIGHT variable set to nothing, nothing is found at all",ask({...env,PLAYWRIGHT:""},'console.log(JSON.stringify(require('+JSON.stringify(path.join(__dirname,"..","compile","diagrams.js"))+').findPlaywright()))')==="null");
  }finally{fs.rmSync(fake,{recursive:true,force:true});}}

/* ---- a fake Playwright package: the browser that hangs, fails, or answers wrongly ---- */
const fakePw=(launch,evalBody)=>{const dir=mkdir("bk-fakepw-");
  fs.writeFileSync(path.join(dir,"package.json"),'{"name":"fake-playwright"}');
  fs.writeFileSync(path.join(dir,"index.js"),'const page={on(){},route:async()=>{},goto:async()=>{},addScriptTag:async()=>{},evaluate:async(fn,arg)=>{'+(evalBody||"")+'return undefined;}};\n'
    +'exports.chromium={launch:async()=>{'+launch+'\nreturn {newContext:async()=>({newPage:async()=>page}),close:async()=>{}};}};');
  return dir;};
const batch=(pw,codes,o)=>G.drawBatch(X,codes,{playwright:pw,...(o||{})});
{const hang=fakePw('setInterval(()=>{},1000);await new Promise(()=>{});'),t0=Date.now();
  try{const out=batch(hang,["a","b"],{timeout:1500});
    chk("a browser that never starts is cut short by the time allowed it, and every diagram says it took too long",[...out.values()].every(v=>/took too long/.test(v.why||""))&&out.size===2&&Date.now()-t0<20000);}
  finally{fs.rmSync(hang,{recursive:true,force:true});}}
{const slow=fakePw("","if(arg&&arg.code!==undefined) return new Promise(()=>{});"),t0=Date.now();
  try{const out=batch(slow,["a","b"],{diagramTimeout:400});
    chk("a diagram that never finishes is cut short on its own, the others still answered, and the reason is that the library could not draw it",out.size===2&&[...out.values()].every(v=>/could not draw it/.test(v.why||""))&&Date.now()-t0<30000,JSON.stringify([...out.values()]));}
  finally{fs.rmSync(slow,{recursive:true,force:true});}}
{const bad=fakePw('throw new Error("browserType.launch: Executable doesn\'t exist at /somewhere/chrome\\nsecond line, not shown");'),
  out=batch(bad,["a"]),why=(out.get("a")||{}).why||"";
  try{chk("when the browser cannot start, the first line of what it said is in the reason (clipped), and no more",/Executable doesn't exist at \/somewhere\/chrome/.test(why)&&!/second line/.test(why)&&why.length<260,why);}
  finally{fs.rmSync(bad,{recursive:true,force:true});}}
/* the two timeouts are handed on: to the process (spawnSync's timeout) and to the runner (the job's), with a default for each */
{const real=cp.spawnSync,seen=[];
  cp.spawnSync=(cmd,args,opts)=>{seen.push({opts,job:JSON.parse(opts.input)});return {stdout:"",stderr:"",error:null};};
  const dir=fakePw("");
  try{batch(dir,["a"],{});batch(dir,["a"],{timeout:1234,diagramTimeout:777});}
  finally{cp.spawnSync=real;fs.rmSync(dir,{recursive:true,force:true});}
  chk("with no option, the browser run is allowed 240000 ms and one diagram 60000 ms",seen.length===2&&seen[0].opts.timeout===240000&&seen[0].job.timeout===60000,JSON.stringify(seen.map(s=>[s.opts.timeout,s.job.timeout])));
  chk("…and the options set both",seen[1].opts.timeout===1234&&seen[1].job.timeout===777);
  chk("…and compile() passes browserTimeout and diagramTimeout on",(()=>{const got=[];const real2=cp.spawnSync;cp.spawnSync=(c,a,o)=>{got.push([o.timeout,JSON.parse(o.input).timeout]);return {stdout:"",stderr:""};};
    const d2=fakePw("");try{C.compile([{text:'---\nbooklet: "0.17"\nid: t/x\ntitle: X\nlang: en\n---\n\n# X\n\n```mermaid\ngraph LR; A --> B\n```\n',name:"x",dir:__dirname}],{form:"standalone",engine:X,browser:d2,browserTimeout:4321,diagramTimeout:987});}
    finally{cp.spawnSync=real2;fs.rmSync(d2,{recursive:true,force:true});}return got.length===1&&got[0][0]===4321&&got[0][1]===987;})());}
/* the answer is checked before it is believed: the wrong number of results, a reply that is not JSON, a request the page made */
{const real=cp.spawnSync,dir=fakePw("");
  const answer=stdout=>{cp.spawnSync=()=>({stdout,stderr:""});try{return batch(dir,["a","b"]);}finally{cp.spawnSync=real;}};
  const allWhy=(m,re)=>m.size===2&&[...m.values()].every(v=>!v.svg&&re.test(v.why||""));
  try{
    chk("an answer with too few results gives every diagram a reason, and no drawing",allWhy(answer(JSON.stringify({results:[{svg:"<svg/>"}],requests:[]})),/could not be started|did not answer/));
    chk("…as does an answer with too many",allWhy(answer(JSON.stringify({results:[{svg:"<svg/>"},{svg:"<svg/>"},{svg:"<svg/>"}],requests:[]})),/could not be started|did not answer/));
    chk("…as does one that is not JSON, one with no results, and one whose results are not a list",allWhy(answer("not json at all"),/did not answer/)&&allWhy(answer("{}"),/did not answer/)&&allWhy(answer(JSON.stringify({results:"x"})),/did not answer/));
    chk("…and an answer that says the page made a request is thrown away whole",allWhy(answer(JSON.stringify({results:[{svg:"<svg/>"},{svg:"<svg/>"}],requests:["https://example.invalid/"]})),/made a request/));
    const ok=answer(JSON.stringify({results:[{svg:"<svg/>"},{error:"x"}],requests:[]}));
    chk("…while a whole answer is used: a drawing where there is one, a reason where there is not",ok.get("a").svg==="<svg/>"&&/could not draw it/.test(ok.get("b").why));
  }finally{cp.spawnSync=real;fs.rmSync(dir,{recursive:true,force:true});}}

/* ---- a figure that is too deep, too many, or too big is refused with its reason, and the page and the run go on ---- */
{const deep=fig('<svg viewBox="0 0 10 10">'+"<g>".repeat(20000)+"</g>".repeat(20000)+"</svg>");
  chk("a figure nested 20000 deep is refused, saying how deep is allowed",deep.ok===false&&/nested more than 512 deep/.test(deep.why),deep.why);
  const edge=fig('<svg viewBox="0 0 10 10">'+"<g>".repeat(500)+"</g>".repeat(500)+"</svg>");
  chk("…and one nested 500 deep is still written",edge.ok===true,edge.why);
  const many=fig('<svg viewBox="0 0 10 10">'+"<g/>".repeat(20001)+"</svg>");
  chk("a figure with more than 20000 elements is refused, saying so",many.ok===false&&/more than 20000 elements/.test(many.why),many.why);
  const big=fig('<svg viewBox="0 0 10 10"><desc>'+"x".repeat(1024*1024)+"</desc></svg>");
  chk("a figure over 1 MiB is refused, saying so",big.ok===false&&/larger than 1024 KB/.test(big.why),big.why);
  const run=C.compile([{text:widgetBooklet("deep",'<svg viewBox="0 0 10 10">'+"<g>".repeat(20000)+"</g>".repeat(20000)+"</svg>"),name:"deep",dir:__dirname},
    {text:widgetBooklet("fine",plain),name:"fine",dir:__dirname}],{form:"standalone",engine:X,drawer:STUB.drawer});
  const [a,b]=run.results,rt=C.reportText(run);
  chk("a booklet with such a figure still compiles, its places listed, its reason in the report (not 'a fault in the compiler')",a.rep.ok&&a.rep.marked.some(m=>m.kind==="regionsFigure"&&/nested more than 512/.test(m.why))&&!/fault in the compiler/.test(rt),rt.slice(0,400));
  chk("…and the next booklet of the run is drawn as usual",b.rep.ok&&b.rep.counts.figures===1&&(b.files.get("fine/index.html")||"").includes("<svg "));
  /* a nesting the reader allows but a later walk cannot take is caught too: a RangeError is a refusal with its reason */
  const tryIt=f=>{try{return f();}catch(e){return {ok:"threw "+e.name};}};
  const rf=tryIt(()=>G.figure(plain,{R,svgProblem:C.svgProblem,prefix:"bk-f1",labelOf:()=>{throw new RangeError("Maximum call stack size exceeded");}}));
  chk("a stack overflow while a figure is walked is a refusal with a reason, never a throw",rf.ok===false&&/too deeply/.test(rf.why),rf.why);
  const rd=tryIt(()=>G.diagram(stubSvg,{...dctx,svgProblem:()=>{throw new RangeError("Maximum call stack size exceeded");}}));
  chk("…and for a drawn diagram",rd.ok===false&&/too deeply/.test(rd.why),rd.why);
  chk("a non-RangeError fault in the walk is still not hidden",(()=>{try{G.figure(plain,{R,svgProblem:C.svgProblem,prefix:"bk-f1",labelOf:()=>{throw new TypeError("x");}});return false;}catch(e){return e instanceof TypeError;}})());}

/* ---- entities, values, classes, names: the cases the renderer's own sanitizer would change ---- */
{const T=(inner,attrs)=>fig('<svg viewBox="0 0 10 10"><defs><linearGradient id="a"/></defs><rect id="r" width="3" height="3"'+(attrs||"")+">"+(inner||"")+"</rect></svg>");
  for(const [what,svg] of [["a named entity in text (&deg;)",'<svg viewBox="0 0 10 10"><text>20&deg;</text></svg>'],["&nbsp; in text",'<svg viewBox="0 0 10 10"><text>a&nbsp;b</text></svg>'],
    ["an entity with no semicolon (&copy)",'<svg viewBox="0 0 10 10"><text>&copy 2024</text></svg>'],["a named entity in a value",'<svg viewBox="0 0 10 10"><text aria-label="20&deg;">x</text></svg>']]){
    const r=fig(svg);chk("a figure with "+what+" is refused, saying to write the character",r.ok===false&&/entity other than the XML five/.test(r.why),r.why||r.html);}
  {const r=G.readSvg('<svg viewBox="0 0 10 10"><circle>a<!-- c -->b<![CDATA[x]]>y&amp;z</circle></svg>'),f=fig('<svg viewBox="0 0 10 10"><circle>a<!-- c -->b<![CDATA[x]]></circle></svg>');
    chk("text on either side of a comment or a CDATA section is one run of text, as a browser holds it (no space is written between)",!!r.tree&&r.tree.kids[0].kids.length===1&&r.tree.kids[0].kids[0]==="abxy&z"&&f.ok&&/>\s*abx\s*</.test(f.html),r.why||f.html);}
  chk("…while the XML five and numeric references are read",fig('<svg viewBox="0 0 10 10"><text aria-label="a &amp; b">&lt;&gt;&quot;&apos;&#176;&#xB0;</text></svg>').ok);
  const vals=[["fill","var(--x)"],["stroke-width","a*b"],["fill","attr(x)"],["x","10;x"],["fill","url(#a) var(--x)"]];
  for(const [k,v] of vals){const r=T("",' '+k+'="'+v+'"');chk("a value the renderer's value rule drops ("+k+'="'+v+'") is refused here',r.ok===false&&/value the renderer's figure rule drops/.test(r.why),r.why||r.html);}
  for(const v of ["var(--x)","attr(x)","a*b","expression(1)","red url(#a) var(--y)"]){
    const r=T("",' style="fill:'+v+'"');chk("a style declaration whose value the renderer's value rule drops (fill:"+v+") is refused here",r.ok===false&&/style declaration the renderer's figure rule drops/.test(r.why),r.why||r.html);}
  for(const [k,v] of [["data-x","url(#a) var(--x)"],["aria-label","url(#a)*"],["data-y","url(https://example.invalid/a)"],["data-z","url(#a) attr(x)"]]){
    const r=T("",' '+k+'="'+v+'"');chk("…also on a name the value rule does not check unless it holds url( ("+k+'="'+v+'")',r.ok===false&&/value the renderer's figure rule drops/.test(r.why),r.why||r.html);}
  chk("…while a plain url(#id) there is kept, and its id follows the prefix",(()=>{const r=T("",' data-ref="url(#a)"');return r.ok&&r.html.includes('data-ref="url(#bk-f1-a)"');})());
  /* refused by the last layer alone: the renderer keeps these names, the first layers read nothing wrong, the image rules do */
  for(const [what,attrs] of [["a backslash in a data- value",' data-x="a\\b"'],["an @import in a data- value",' data-v="@import x"'],["a javascript: address in a data- value",' data-v="javascript:alert(1)"']]){
    const r=T("",attrs);chk("a figure with "+what+" is refused by the compiler's own SVG rules",r.ok===false&&/compiler's SVG rules/.test(r.why),r.why||r.html);}
  const bad=T("",' class="a.b"'),ok=T("",' class="a-b c_d"');
  chk("a class with a character other than letters, digits, _ and - is refused with its reason",bad.ok===false&&/class with a character/.test(bad.why),bad.why||bad.html);
  chk("…while a plain class list is kept",ok.ok&&ok.html.includes('class="a-b c_d"'));
  const col=fig('<svg viewBox="0 0 10 10"><defs><linearGradient id="g"/></defs><rect width="3" height="3" style="fill:url(#g);stroke:#abc"/></svg>');
  chk("a style that holds a url(#id) and a #colour is refused, and the reason says why: the renderer reads every #name there as an id, a colour too",col.ok===false&&/colour/.test(col.why)&&/every #name/.test(col.why),col.why);
  chk("…and names the way out (write the colour another way)",col.ok===false&&/rgb\(\)/.test(col.why),col.why);}

/* ---- the compiler's own marks cannot be written by a figure ---- */
{const r=fig('<svg viewBox="0 0 10 10"><g class="rg bk-foo keep" data-r="top" data-bk-x="1" data-bk-region="y" data-keep="z"><rect class="bk-only" width="3" height="3"/></g></svg>');
  chk("a figure's data-bk-* attributes are left off, and its bk-* class names with them",r.ok&&!/data-bk-/.test(r.html)&&!/bk-foo|bk-only/.test(r.html)&&r.html.includes('class="rg keep"')&&r.html.includes('data-keep="z"'),r.why||r.html);
  chk("…a class attribute left empty is left off, not written empty",r.ok&&!/class=""/.test(r.html)&&/<rect width="3" height="3"\/>/.test(r.html));}

/* ---- the ids: per page, and not the library's ---- */
{const text=n=>'---\nbooklet: "0.17"\nid: t/'+n+'\ntitle: Ids\nlang: en\n---\n\n# Ids\n\n## bk-'+n+'-dg1\n\nText.\n\n```mermaid\ngraph LR; A --> B\n```\n';
  const ids=h=>(h.match(/\sid="([^"]*)"/g)||[]).map(s=>s.slice(5,-1));
  const run=C.compile([{text:text("pa"),name:"pa",dir:__dirname},{text:text("pb"),name:"pb",dir:__dirname}],{form:"standalone",engine:X,drawer:STUB.drawer});
  const [a,b]=run.results.map((r,i)=>ids(r.files.get(["pa","pb"][i]+"/index.html")));
  chk("a heading whose id would be a diagram's takes another, so no id on the page is written twice",a.length===new Set(a).size&&a.includes("bk-pa-dg1")&&a.filter(x=>x.startsWith("bk-pa-dg1-")).length>=1&&a.includes("bk-pa-dg1_flowchart-v2-pointEnd"),a.join(" "));
  chk("a diagram's ids begin with the page's address and the diagram's number, so two pages put into one host page keep theirs apart",a.every(x=>!x.startsWith("bk-dg"))&&b.includes("bk-pb-dg1")&&!a.some(x=>b.includes(x)&&x.startsWith("bk-")),a.concat(b).join(" "));
  const odd=C.compile([{text:text("a.b"),name:"a.b",dir:__dirname},{text:text("a-b"),name:"a-b",dir:__dirname}],{form:"standalone",engine:X,drawer:STUB.drawer}).results;
  const svgId=h=>[...h.matchAll(/<svg id="([^"]*)"/g)].map(m=>m[1]);
  const o1=svgId(odd[0].files.get("a.b/index.html")),o2=svgId(odd[1].files.get("a-b/index.html"));
  chk("a page address with a character an id cannot hold has it written as '-' and a short hash, so 'a.b' and 'a-b' stay two",o1.length===1&&o2.length===1&&o1[0]!==o2[0]&&/^bk-[A-Za-z0-9_-]+-dg1$/.test(o1[0]),o1+" / "+o2);
  const fr=C.compile([{text:widgetBooklet("pf",plain),name:"pf",dir:__dirname}],{form:"standalone",engine:X}).results[0].files.get("pf/index.html");
  chk("a body map's figure ids carry the page's address too (bk-<page>-f1-)",/id="bk-pf-f1-c"/.test(fr)&&/url\(#bk-pf-f1-c\)/.test(fr),ids(fr).join(" "));
  /* a referenced id that does not begin with the diagram's own is renamed under it, every pointer follows, and nothing is left unprefixed */
  const d=G.diagram(wrap('<g id="other"><rect width="3" height="3"/></g><use href="#other"/><g id="unused"/>'),dctx);
  const dids=d.ok?ids(d.html):[];
  chk("an id the drawing points at that is not the diagram's own is renamed under the diagram's, and the pointer follows",d.ok&&d.html.includes('id="bk-dg1-other"')&&d.html.includes('href="#bk-dg1-other"')&&!/id="other"/.test(d.html),d.why||d.html);
  chk("…and every id left in the diagram begins with its own, the unpointed one gone",d.ok&&dids.every(x=>x.startsWith("bk-dg1"))&&!dids.includes("unused"),dids.join(" "));
  const dstyle=G.diagram(wrap('<style>#bkdgrender .a{fill:url(#other)}</style><g id="other"/><rect class="a" width="3" height="3"/>'),dctx);
  chk("…also when the pointer is in the style",dstyle.ok&&dstyle.html.includes("url(#bk-dg1-other)")&&dstyle.html.includes('id="bk-dg1-other"'),dstyle.why||dstyle.html);}

/* ---- an image on an activity's page, one folder down: the size is still written, and the address is reached from there ---- */
{const text='---\nbooklet: "0.17"\nid: t/deepimg\ntitle: Deep\nlang: en\n---\n\n> [!module|m] Deep\n\n> [!activity|one] First\n\nWords.\n\n> [!activity|two] Second\n\n![A wave](compile-pictures/wave.png)\n\n> [!module|m end] End\n';
  const r=C.compile([{text,name:"deepimg",dir:path.join(__dirname,"compile-assets")}],{form:"standalone",engine:X,drawer:STUB.drawer}).results[0];
  const pg=r.files.get("deepimg/two/index.html")||"";
  const img=/<img [^>]*>/.exec(pg);
  chk("an image on an activity's page, a folder down, is reached from there and still carries the size read from its file",!!img&&/src="\.\.\/\.\.\/compile-pictures\/wave\.png"|src="\.\.\/compile-pictures\/wave\.png"/.test(img[0])&&/width="64"/.test(img[0])&&/height="48"/.test(img[0]),img&&img[0]);
  chk("…and the file is copied to where that address points",[...r.files.keys()].some(k=>/wave\.png$/.test(k)),[...r.files.keys()].join(" "));}

/* ---- a many-page booklet: the ids of a figure and a diagram carry the activity page's own prefix; a drawn diagram needs no script ---- */
{const kinds=C.compile([{file:path.join(__dirname,"fixtures","compile-kinds.booklet.md")}],{form:"site",engine:X,drawer:STUB.drawer}).results[0];
  const pages=[...kinds.files].filter(([k])=>k.endsWith("/index.html"));
  const idsOf=h=>(h.match(/\sid="([^"]*)"/g)||[]).map(s=>s.slice(5,-1));
  const all=pages.flatMap(([,h])=>idsOf(h)),svgs=pages.flatMap(([k,h])=>[...h.matchAll(/<svg id="([^"]*)"/g)].map(m=>[k,m[1]]));
  chk("on the pages of a booklet of many pages no id is written twice across the whole booklet (as it would be in one host page)",all.length===new Set(all).size,all.filter((x,i)=>all.indexOf(x)!==i).join(" "));
  chk("a diagram on an activity's page takes that page's prefix, bk-<name>-<folder>-dgN",
    svgs.length===2&&svgs.every(([k,id])=>k==="compile-kinds/left-off/index.html"&&/^bk-compile-kinds-left-off-dg[12]$/.test(id)),svgs.join(" "));
  const dia=C.compile([{file:path.join(__dirname,"compile-assets","compile-diagrams.booklet.md")}],{form:"standalone",engine:X,drawer:STUB.drawer}).results[0];
  const dpage=dia.files.get("compile-diagrams/index.html")||"";
  chk("a page with a drawn diagram, and nothing else that responds, needs no script: no booklet.js link, and the report says none",/<figure class="bk-diagram">/.test(dpage)&&!/booklet\.js/.test(dpage)&&!dia.rep.needsScript&&!dia.files.has("booklet.js"),String(dia.rep.needsScript));}

/* ---- a diagram's style text is written escaped; the paper goes after a leading title ---- */
{const d=G.diagram(wrap('<style>#bkdgrender .a &gt; rect{content:"&amp;lt; x"}</style><g class="a"><rect width="3" height="3"/></g>'),dctx);
  chk("a style's text is written escaped: a > and a & in it are only text, never markup",d.ok&&d.html.includes('.a &gt; rect{content:"&amp;lt; x"}')&&!/content:"&lt;/.test(d.html),d.why||d.html);
  const t=G.diagram(wrap('<title>Tide</title><desc>A tide.</desc><g/>'),dctx);
  const order=t.ok?[t.html.indexOf("<title>"),t.html.indexOf("<desc>"),t.html.indexOf("<rect x=")]:[];
  chk("the paper is written after a leading <title> and <desc>, so the title stays the first child and names the picture",t.ok&&order[0]>0&&order[0]<order[1]&&order[1]<order[2],t.why||t.html);
  const n=G.diagram(wrap('<g/>'),dctx);
  chk("…and with no title it is the first child, as before",n.ok&&/^<svg [^>]*>\s*<rect x="0"/.test(n.html),n.why||n.html);}

/* ---- the style scan reads strings and comments ---- */
{const s=(css,cls)=>G.scopeStyle(css,"bk-dg1",cls);
  chk("a brace inside a string does not open or close a rule: the case that hid a rule on the page's body",!!s('#bk-dg1 .a{content:"{"} body{display:none}}').why&&/outside|brace/.test(s('#bk-dg1 .a{content:"{"} body{display:none}}').why),JSON.stringify(s('#bk-dg1 .a{content:"{"} body{display:none}}')));
  chk("…the same with a } in a string and a rule on body after it",!!s('#bk-dg1 .a{content:"}"} body{display:none}').why);
  chk("…a string that holds a brace is kept as written when nothing is wrong",s('#bk-dg1 .a{content:"{x}"}').css==='#bk-dg1 .a{content:"{x}"}'&&s("#bk-dg1 .a{content:'}'}").css==="#bk-dg1 .a{content:'}'}");
  chk("…a comment mark in a string is not a comment",s('#bk-dg1 .a{content:"/*"} #bk-dg1 .b{x:y}/* z */').css==='#bk-dg1 .a{content:"/*"}\n#bk-dg1 .b{x:y}');
  chk("…an escaped quote does not end a string",s('#bk-dg1 .a{content:"a\\"{"}').css==='#bk-dg1 .a{content:"a\\"{"}');
  chk("a string or a comment that never ends is refused",!!s('#bk-dg1 .a{content:"x}').why&&!!s("#bk-dg1 .a{x:y}/* never").why);
  chk("a string cut by a line end (CSS has no such string) is refused",!!s('#bk-dg1 .a{content:"x\n}').why&&/string/.test(s('#bk-dg1 .a{content:"x\n}').why));
  chk("a bracket or parenthesis inside a string does not hide a second selector from the check",!!s('#bk-dg1 [data-x="a)"], body{x:y}').why&&!!s('#bk-dg1 [data-x="a("], body{x:y}').why&&/outside/.test(s('#bk-dg1 [data-x="a)"], body{x:y}').why));
  chk("a rule inside a rule is refused",!!s("#bk-dg1 .a{ .b{x:y} }").why&&/rule inside a rule/.test(s("#bk-dg1 .a{ .b{x:y} }").why));
  chk("a stray closing brace is refused",!!s("#bk-dg1 .a{x:y}}").why&&/brace/.test(s("#bk-dg1 .a{x:y}}").why));
  chk("a @keyframes block is still dropped as a unit, nested rules and strings with braces in it",s('@keyframes k{from{content:"}"}to{a:b}}#bk-dg1 .a{x:y}').css==="#bk-dg1 .a{x:y}");
  chk("a selector with a string that holds a comma is not split there",s('#bk-dg1 [data-x="a,b"]{x:y}').css==='#bk-dg1 [data-x="a,b"]{x:y}');
  chk("the end to end case: a drawing whose style hides a rule behind a brace in a string is refused",G.diagram(wrap('<style>#bkdgrender .a{content:"{"} body{display:none}}</style><g class="a"/>'),dctx).ok===false);}

/* ---- images: the scheme check, the comment, and the rotation ---- */
{const bytes=s=>Buffer.from(s),img=inner=>bytes('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'+inner+"</svg>");
  for(const t of ["Profile: left","Metadata: left","Data: pain","Note: data: unknown","Files: two","profile: left","Profile:3","Metadata:left","mydata:5","a.file:x"]){
    chk("an SVG picture whose text says “"+t+"” is copied (the word is text, not an address)",C.svgProblem(img("<text>"+t+"</text>"))===null,C.svgProblem(img("<text>"+t+"</text>")));
    const f=fig('<svg viewBox="0 0 10 10"><text aria-label="'+t+'" data-note="'+t+'">'+t+"</text></svg>");
    chk("a figure with “"+t+"” in a label and a data- value is written",f.ok,f.why);}
  for(const [what,inner] of [["javascript:alert(1) in an attribute",'<rect width="1" height="1" fill="javascript:alert(1)"/>'],["data:image/png in a data- attribute",'<rect width="1" height="1" data-v="data:image/png;base64,AA"/>'],
    ["file:///etc/passwd in an attribute",'<rect width="1" height="1" data-v="file:///etc/passwd"/>'],["vbscript:x in an attribute",'<rect width="1" height="1" data-v="vbscript:x"/>'],
    ["java<tab>script: split by a tab reference",'<rect width="1" height="1" data-v="java&#9;script:alert(1)"/>'],["java<newline>script: split by a line feed",'<rect width="1" height="1" data-v="java&#10;script:alert(1)"/>'],
    ["JAVASCRIPT: in capitals",'<rect width="1" height="1" data-v="JAVASCRIPT:alert(1)"/>'],["a scheme after a separator (1;javascript:x)",'<rect width="1" height="1" data-v="1;javascript:x"/>'],
    ["a scheme in a value that starts with a space",'<rect width="1" height="1" data-v=" data:text/html,x"/>']]){
    const why=C.svgProblem(img(inner));chk("an SVG picture with "+what+" is refused",typeof why==="string"&&/javascript:, vbscript:, data: or file:/.test(why),why);}
  for(const [what,attr] of [["javascript:alert(1)",'data-v="javascript:alert(1)"'],["a tab-split javascript:",'data-v="java&#9;script:alert(1)"'],["data:image/png",'data-v="data:image/png;base64,AA"'],["file:///x",'data-v="file:///x"'],["vbscript:x",'data-v="vbscript:x"'],["1;javascript:x",'data-v="1;javascript:x"']]){
    const f=fig('<svg viewBox="0 0 10 10"><rect width="3" height="3" '+attr+"/></svg>");chk("a figure with "+what+" in a data- value is refused by the compiler's SVG rules",f.ok===false&&/compiler's SVG rules/.test(f.why),f.why||f.html);}
  const size=(ext,b)=>{const s=C.imageSize(ext,b);return s?s.width+"x"+s.height:null;};
  chk("an SVG whose first <svg> is in a comment has its own tag read: <!-- <svg width=1> --> is not the root",size("svg",bytes('<!-- <svg width="1" height="1"> --><svg width="50" height="40"/>'))==="50x40"
    &&size("svg",bytes('<?xml version="1.0"?><!-- an <svg viewBox="0 0 1 1"> in a note\n--><svg viewBox="0 0 200 100"/>'))==="200x100"&&size("svg",bytes('<!-- <svg width="9" height="9"> never closes'))===null);

  const be2=n=>Buffer.from([n>>8,n&255]);
  const tiff=(order,le,o)=>{o=o||{};const w2=n=>le?Buffer.from([n&255,(n>>8)&255]):be2(n),w4=n=>le?Buffer.from([n&255,(n>>8)&255,(n>>16)&255,n>>>24]):Buffer.from([n>>>24,(n>>16)&255,(n>>8)&255,n&255]);
    return Buffer.concat([Buffer.from(o.bom||(le?"II":"MM")),w2(o.magic||42),w4(o.ifd===undefined?8:o.ifd),w2(o.count===undefined?2:o.count),
      w2(0x0100),w2(4),w4(1),w4(99),w2(0x0112),w2(o.type||3),w4(o.n===undefined?1:o.n),w2(order),w2(0),w4(0)]);};
  const seg=(data,marker)=>Buffer.concat([Buffer.from([0xff,marker||0xe1]),be2(data.length+2),data]);
  const base=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0,0,16]),Buffer.from("JFIF\0"),Buffer.alloc(9),Buffer.from([0xff,0xc0,0,17,8]),be2(600),be2(800),Buffer.from([3,1,0x22,0,2,0x11,1,3,0x11,1])]);
  const jpgWith=segment=>Buffer.concat([base.subarray(0,2),segment,base.subarray(2)]);
  const exif=(order,le,o,pre)=>seg(Buffer.concat([Buffer.from(pre||"Exif\0\0"),tiff(order,le,o)]));
  chk("a JPEG with no EXIF block is read as before (800 wide, 600 high)",size("jpg",base)==="800x600");
  for(const le of [true,false]) for(let order=1;order<=8;order++){
    chk("a JPEG with EXIF orientation "+order+" ("+(le?"little":"big")+"-endian) has the size a browser draws: "+(order>=5?"width and height swapped":"as the frame says"),
      size("jpg",jpgWith(exif(order,le)))===(order>=5?"600x800":"800x600"),size("jpg",jpgWith(exif(order,le))));}
  const noturn=[["a byte order that is neither II nor MM",exif(6,false,{bom:"XX"})],["a TIFF magic that is not 42",exif(6,true,{magic:43})],["an IFD offset far past the block",exif(6,true,{ifd:0x7ffffff0})],
    ["an IFD offset inside the TIFF header",exif(6,true,{ifd:2})],["no entries",exif(6,true,{count:0})],["an orientation of 0",exif(0,true)],["an orientation of 9",exif(9,false)],
    ["an orientation that is a LONG, not a SHORT",exif(6,true,{type:4})],["an orientation with a count of 2",exif(6,true,{n:2})],["no Exif mark",exif(6,true,{},"Exiv\0\0")],
    ["a block cut short in its entries",seg(Buffer.concat([Buffer.from("Exif\0\0"),tiff(6,true).subarray(0,24)])) ],["a block with nothing after the mark",seg(Buffer.from("Exif\0\0"))],["a block that says it is longer than the file",Buffer.concat([Buffer.from([0xff,0xe1,0xff,0xff]),Buffer.from("Exif\0\0"),tiff(6,true)])]];
  for(const [what,segment] of noturn){let r;try{r=size("jpg",jpgWith(segment));}catch(e){r="threw "+e.message;}
    chk("EXIF with "+what+" turns nothing and does not crash: the frame's size stands",r==="800x600"||(/longer than the file/.test(what)&&r===null),r);}
  /* an entry past the end of the block is not read, even where the bytes that follow happen to look like one (here, in padding the reader skips) */
  {const le2=n=>Buffer.from([n&255,n>>8]),entry=(tag,v)=>Buffer.concat([le2(tag),le2(3),Buffer.from([1,0,0,0]),le2(v),Buffer.alloc(2)]);
    const inside=seg(Buffer.concat([Buffer.from("Exif\0\0II"),le2(42),Buffer.from([8,0,0,0]),le2(3),entry(0x0100,99),entry(0x0101,98)])),after=entry(0x0112,6);
    chk("…but an entry that lies past the end of the block is not read, even if what follows looks like an orientation",size("jpg",jpgWith(Buffer.concat([inside,after])))==="800x600"
      &&size("jpg",jpgWith(seg(Buffer.concat([Buffer.from("Exif\0\0II"),le2(42),Buffer.from([8,0,0,0]),le2(3),entry(0x0100,99),entry(0x0101,98),entry(0x0112,6)]))))==="600x800");}
  chk("EXIF that says more entries than the block holds still turns the picture if the orientation is there (as Chromium reads it)",size("jpg",jpgWith(exif(6,true,{count:500})))==="600x800");
  chk("…but an orientation entry cut short, even after its value, is not read (as Chromium has it)",size("jpg",jpgWith(seg(Buffer.concat([Buffer.from("Exif\0\0"),tiff(6,true).subarray(0,32)]))))==="800x600"&&size("jpg",jpgWith(seg(Buffer.concat([Buffer.from("Exif\0\0"),tiff(6,true).subarray(0,34)]))))==="600x800");
  chk("…but with the orientation entry beyond the count, nothing turns",size("jpg",jpgWith(exif(6,true,{count:1})))==="800x600");
  chk("only the first EXIF block counts: a second one that says 6 after a first that says 1 turns nothing",size("jpg",jpgWith(Buffer.concat([exif(1,true),exif(6,true)])))==="800x600");
  chk("the first EXIF block is the one read; an XMP block before it is passed over",size("jpg",jpgWith(Buffer.concat([seg(Buffer.from("http://ns.adobe.com/xap/1.0/\0<x/>")),exif(8,false)])))==="600x800");
  /* a DHT, an APP-like extension (JPG, 0xC8) and a DAC (0xCC) segment before the frame header are passed over: their bytes are not a size */
  const odd=(marker)=>seg(Buffer.from([0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08]),marker);
  for(const [name,marker] of [["DHT (0xC4)",0xc4],["JPG (0xC8)",0xc8],["DAC (0xCC)",0xcc]])
    chk("a "+name+" segment before the frame header is not read as one (800x600, not the numbers in its bytes)",size("jpg",jpgWith(odd(marker)))==="800x600",size("jpg",jpgWith(odd(marker))));
  chk("…while a frame header of another kind (0xC2, progressive; 0xC1; 0xCF) is read",["c1","c2","c3","c5","c9","cf"].every(m=>{const b=Buffer.from(base);b[b.indexOf(Buffer.from([0xff,0xc0]))+1]=parseInt(m,16);return size("jpg",b)==="800x600";}));}

/* ---- the report and the command line ---- */
{const fences=n=>Array.from({length:n},(_,i)=>"```mermaid\ngraph LR; N"+(i+1)+" --> B"+(i%3===0?" with a long source that goes on and on and on":"")+"\n```\n").join("\n");
  const text='---\nbooklet: "0.17"\nid: t/fences\ntitle: Fences\nlang: en\n---\n\n# Fences\n\n'+fences(23);
  const run=C.compile([{text,name:"fences",dir:__dirname}],{form:"standalone",engine:X}),lines=C.reportText(run).split("\n").filter(l=>/a mermaid fence/.test(l));
  const ordinals=lines.map(l=>(/its (\d+\w\w) diagram/.exec(l)||[])[1]);
  chk("each diagram that is shown as its source is named by its place among the booklet's diagrams, in every report line",lines.length===23&&ordinals.slice(0,4).join()==="1st,2nd,3rd,4th"&&ordinals.slice(10,13).join()==="11th,12th,13th"&&ordinals.slice(20,23).join()==="21st,22nd,23rd",ordinals.join());
  chk("…and by the first words of its source, clipped, so a reader can find it",/“graph LR; N2 --> B”/.test(lines[1])&&/“graph LR; N1 --> B with a lo…”/.test(lines[0]),lines.slice(0,2).join("\n"));
  chk("…the same name is in the page's comment",/<!-- booklet: a mermaid fence \(its 2nd diagram, “graph LR; N2 - -> B”\)/.test(run.results[0].files.get("fences/index.html")));
  const emb=C.compile([{text:'---\nbooklet: "0.17"\nid: t/emb\ntitle: Emb\nlang: en\n---\n\n# Emb\n\n```mermaid\ngraph LR; A --> B\n```\n\nSecond:\n\n```mermaid\ngraph TD; C --> D\n```\n',name:"emb",dir:__dirname}],{form:"standalone",engine:X}).results[0];
  chk("two fences in one activity are told apart in the report",emb.rep.marked.length===2&&emb.rep.marked[0].what!==emb.rep.marked[1].what&&/1st/.test(emb.rep.marked[0].what)&&/2nd/.test(emb.rep.marked[1].what));}
{const dir=mkdir("bk-cli-"),fake=fakePw("require('fs').writeFileSync(process.env.BK_FAKE_MARK||'/dev/null','launched');throw new Error('stop here');"),mark=path.join(dir,"launched");
  const book=path.join(dir,"d.booklet.md");fs.writeFileSync(book,'---\nbooklet: "0.17"\nid: t/d\ntitle: D\nlang: en\n---\n\n# D\n\n```mermaid\ngraph LR; A --> B\n```\n');
  const run=args=>cp.spawnSync(process.execPath,[path.join(__dirname,"..","compile","compile.js"),...args],{env:{...process.env,PLAYWRIGHT:fake,BK_FAKE_MARK:mark},encoding:"utf8"});
  try{
    const control=run(["--out",path.join(dir,"o1"),book]);
    chk("control: with a browser package named, the compiler starts it for a diagram",fs.existsSync(mark)&&/stop here|could not be started/.test(control.stdout),control.stdout.slice(0,300)+control.stderr);
    fs.rmSync(mark);
    const off=run(["--no-browser","--out",path.join(dir,"o2"),book]);
    chk("--no-browser starts no browser even with a package named: the diagram stays as its source, the reason in the report, the exit 0",!fs.existsSync(mark)&&off.status===0&&/no browser to draw it with/.test(off.stdout)&&/data-lang="mermaid"/.test(fs.readFileSync(path.join(dir,"o2","d","index.html"),"utf8")),off.stdout.slice(0,300)+off.stderr);
    const help=run(["--help"]).stdout;
    chk("--help says diagrams are drawn at build time, names PLAYWRIGHT and where a package is looked for, and says how to turn drawing off",/diagram/i.test(help)&&/PLAYWRIGHT/.test(help)&&/--no-browser/.test(help)&&/node_modules\/playwright/.test(help)&&/never the folder/i.test(help),help.slice(0,200));
  }finally{fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(fake,{recursive:true,force:true});}}

console.log(fails?"\n"+fails+" FAILURES":"\ncompile figures passed");process.exit(fails?1:0);
