// Browser checks of the compiler's figures and diagrams (compile/, compile 0.2.0), in Chromium through Playwright.
// Not a *.test.js: it needs a browser. test/run-browser.sh runs it with PLAYWRIGHT set, and the compiler finds the same package for
// its own drawing, so the diagrams here are drawn for real, by the renderer's own parts/mermaid.js.
//   1. a body map's figure is held to the renderer's own sanitizer: the renderer's sanitizeSvg (the function in booklet.html, run
//      on the same text in a page) and the compiler's figure() are compared on a plain figure, on every element, attribute and style
//      property the renderer keeps, and on a matrix of hostile changes. Whatever the compiler writes, the renderer would have kept
//      unchanged (the same elements, attributes and values, ids and references apart); whatever the renderer would change, the
//      compiler refuses. A control shows the comparison itself would notice a difference;
//   2. a corpus of made-up diagrams of the common types is drawn at build time: how many are drawn, which fall back to their source
//      and why, and that no drawing is refused for a request (the compiler discards every drawing if the browser page asked for one);
//   2b. the browser page is shut: diagrams a build would never hand over (the renderer's own screen refuses them) are handed straight to the
//      runner, naming an address on a server of this test's own; the server sees no request, and nothing the library drew holds the address;
//   3. the compiled pages (a body map, pictures, diagrams, the corpus) opened with scripting OFF, at 1280 and 390 pixels wide, light
//      and dark: each figure and diagram is on the page with a size, its words are drawn, nothing scrolls sideways, a diagram keeps
//      its paper and the text on it keeps its contrast on a dark page, a picture loads at the size written on it, and the page asks
//      for nothing but its own files and makes no script of its own;
//   4. a booklet of many pages with the optional script on (the assembler's booklet.js beside the stylesheet): a body map's figure in
//      the first tab of an activity page and a diagram inside a fold the author made in the second tab, and a diagram on a page of
//      its own. The figure is on show with the first tab, the diagram is not until its tab is shown and its fold is opened (by hand
//      or by Open all), it then has a size and its words drawn and fits the width, it is gone again when its tab or fold is shut, the
//      figure and the diagram come back as they were, the printed page shows both, no id is written twice, and nothing asks for
//      anything but the booklet's own files. The same pages with scripting off have both in view, and the script adds no ids.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/compile-figures-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),cp=require('child_process');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','booklet.html'));
const OUT=path.resolve(process.argv[3]||'.','compile-figures');
const C=require('../compile/compile.js'),G=require('../compile/diagrams.js'),E=require('../compile/engine.js'),CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const ASSETS=path.join(__dirname,'compile-assets');
const X=E.load(HTML),R=X.R;

/* ======================= 1. the figure rule, against the renderer's own ======================= */
const figureOf=svg=>G.figure(svg,{R,svgProblem:C.svgProblem,prefix:'bk-f1',labelOf:id=>id});
const cases=[];const add=(why,svg)=>cases.push({why,svg});
const wrap=inner=>'<svg viewBox="0 0 10 10">'+inner+'</svg>';
add('a plain figure','<svg viewBox="0 0 100 100"><defs><clipPath id="c"><rect width="50" height="50"/></clipPath><linearGradient id="g"><stop offset="0" stop-color="#cde"/><stop offset="1" stop-color="#456"/></linearGradient></defs><g clip-path="url(#c)"><rect class="rg" data-r="top" x="1" y="1" width="40" height="40" fill="url(#g)"/></g><path class="rg" data-r="low" d="M1 50 L40 50 L20 90 Z" style="fill:#abc;stroke:#123;stroke-width:2"/><text x="5" y="97" font-size="6">Profile: front</text></svg>');
add('a title and a description','<svg viewBox="0 0 10 10" role="img" aria-label="Front"><title>Front</title><desc>The front.</desc><circle cx="5" cy="5" r="3"/></svg>');
for(const e of [...R.SVG_KEEP]) if(e!=='svg') add('the element <'+e+'>',wrap('<'+e+'/>'));
for(const e of [...R.SVG_KEEP]) if(e!=='svg') add('the element <'+e+'> with a child and text',wrap('<'+e+' id="a"><rect id="b" width="1" height="1"/>words</'+e+'>'));
const attrs=[['class','a b-c'],['class','a<b'],['id','one'],['id','1bad'],['id','a b'],['data-r','box'],['aria-label','Name'],['aria-hidden','true'],['role','img'],['tabindex','0'],['x','1'],['d','M0 0L5 5'],
  ['points','1,1 2,2'],['transform','rotate(5)'],['transform','translate(1 2) scale(2)'],['fill','red'],['fill','#abcdef'],['fill','url(#t)'],['fill','url(#nowhere)'],['fill','url(https://example.invalid/a#b)'],['fill','javascript:alert(1)'],
  ['stroke','url( #t )'],['opacity','0.5'],['onclick','alert(1)'],['onload','alert(1)'],['href','#t'],['href','https://example.invalid/'],['href','javascript:alert(1)'],['xlink:href','#t'],['xlink:href','data:image/svg+xml,x'],
  ['style','fill:red'],['style','fill:red;stroke:blue'],['style','fill:red;;'],['style','behavior:url(#t)'],['style','fill:url(#t)'],['style','fill:url(//example.invalid/a)'],['style','position:fixed'],['style','content:"x"'],['style','background:url(x)'],
  ['style','fill:red;position:fixed'],['style','font-family:Georgia'],['style','font-family:expression(1)'],['style','stroke-width:calc(1px+2px)'],['style',''],['style','nonsense'],
  ['clip-path','url(#t)'],['mask','url(#t)'],['filter','url(#t)'],['marker-end','url(#t)'],['xmlns','http://www.w3.org/2000/svg'],['xmlns:xlink','http://www.w3.org/1999/xlink'],['xml:space','preserve'],['xml:lang','en'],['lang','en'],
  ['font-family','Georgia, serif'],['font-family','"x"; y'],['stroke-dasharray','1 2'],['text-anchor','middle'],['viewBox','0 0 5 5'],['preserveAspectRatio','xMidYMid'],['values','javascript:1'],['data-x','url(#t) var(--x)'],['aria-label','url(#t)*'],['data-y','url(https://example.invalid/a)'],['fill','var(--x)'],['x','a*b'],['fill','attr(x)'],['x','10;x'],['x','1;javascript:x'],
  ['data-bk-r','1'],['data-bk-x','url(#t)'],['class','bk-a keep'],['class','bk-a'],['aria-label','Profile: left'],['data-note','Data: pain'],['data-note','Metadata:left'],['data-v','file:///x'],['data-v','a\\b'],['attributeName','href'],['begin','1s'],['src','x'],['action','x'],['formaction','x']];
for(const [a,v] of attrs){
  add('the attribute '+a+'="'+v+'" on a rect',wrap('<defs><linearGradient id="t"/></defs><rect '+a+'="'+v+'" width="3" height="3"/>'));
  add('the attribute '+a+'="'+v+'" on the root','<svg viewBox="0 0 10 10" '+a+'="'+v+'"><defs><linearGradient id="t"/></defs><rect width="3" height="3"/></svg>');}
for(const p of [...R.SVG_STYLE_PROPS]) add('the style property '+p,wrap('<rect style="'+p+':red" width="3" height="3"/>'));
for(const v of ['url(#t)','url(https://example.invalid/a)','expression(1)','red;fill:blue','red}','\\72 ed','red/*x*/','var(--x)','calc(1px)','#fff','rgb(1,2,3)','none','inherit','currentColor','-moz-binding:x'])
  add('the style value '+v,wrap('<defs><linearGradient id="t"/></defs><rect style="fill:'+v+'" width="3" height="3"/>'));
for(const h of ['<script>alert(1)</script>','<a href="#t"><rect id="t" width="1" height="1"/></a>','<foreignObject><p>x</p></foreignObject>','<style>rect{fill:red}</style>','<iframe src="x"/>','<image href="x.png"/>','<use href="#t"/><rect id="t" width="1" height="1"/>',
  '<use href="https://example.invalid/a.svg#b"/>','<animate attributeName="href" values="javascript:1"/>','<set attributeName="onclick" to="x"/>','<p:script xmlns:p="http://www.w3.org/2000/svg">x</p:script>','<svg><svg><rect width="1" height="1"/></svg></svg>',
  '<!-- a comment --><rect width="1" height="1"/>','<![CDATA[x]]>','<text>a &amp; b &lt;script&gt;</text>','<text>caf&#233;</text>','<text>20&deg;</text>','<text>a&nbsp;b</text>','<text>&copy 2024</text>','<text aria-label="a&deg;">x</text>','<title><![CDATA[x]]></title>','<text><![CDATA[a & b]]></text>','<circle>a<!-- c -->b</circle>','<g>a<![CDATA[x]]>b</g>','<rect id="a" width="1" height="1"/><rect id="a" width="1" height="1"/>',
  '<text><tspan>a</tspan> <tspan>b</tspan></text>','<g><g><g><g><rect width="1" height="1"/></g></g></g></g>']) add('the markup '+h.slice(0,50),wrap(h));
add('a figure with no root','<rect width="1" height="1"/>');add('an empty figure','');add('text only','hello');

const SAME=`(function(){
  /* the form two trees are compared in: names, attributes (ids and references with their prefix taken off, the role and name the
     compiler adds to a region left out), and text with its white space collapsed; a white-space-only text node is nothing */
  const strip=s=>String(s).replace(/\\b(?:bf\\d+|bk-f\\d+)-/g,'');
  /* adjacent text nodes are one run of text (the renderer leaves the two sides of a comment it removed as two nodes, and the source holds the comment between; a page holds one) */
  const runs=ns=>{const o=[];for(const c of ns){if(c.nodeType===8) continue;if(c.nodeType===3&&o.length&&o[o.length-1].t!==undefined) o[o.length-1].t+=c.nodeValue;else o.push(c.nodeType===3?{t:c.nodeValue,nodeType:3,nodeValue:c.nodeValue}:c);}return o;};
  const canon=(n,norm)=>{
    if(n.t!==undefined) n={nodeType:3,nodeValue:n.t};
    if(n.nodeType===3){const t=n.nodeValue.replace(/\\s+/g,' ').trim();return t?JSON.stringify(t):'';}
    if(n.nodeType!==1) return '';
    const region=n.hasAttribute('data-r');
    const val=x=>x.name==='class'?x.value.split(/\\s+/).filter(c=>c&&!c.startsWith('bk-')).join(' '):x.name==='style'&&norm?x.value.split(';').map(d=>d.trim()).filter(Boolean).join(';'):x.value;
    const a=[...n.attributes].filter(x=>!(region&&(x.name==='role'||x.name==='aria-label'))&&x.name!=='xmlns'&&x.name!=='xmlns:xlink'&&!/^data-bk-/.test(x.name)&&!(x.name==='class'&&!val(x))&&!(norm&&x.name==='style'&&!val(x))).map(x=>x.name+'='+JSON.stringify(strip(val(x)))).sort();
    return n.localName+'['+a.join(',')+']{'+runs(n.childNodes).map(c=>canon(c,norm)).filter(Boolean).join(' ')+'}';};
  return {canon,fromHtml:(h,norm)=>{const b=new DOMParser().parseFromString(h,'text/html').body;return runs(b.childNodes).map(c=>canon(c,norm)).filter(Boolean).join(' ');},
    fromNodes:(ns,norm)=>runs(ns).map(c=>canon(c,norm)).filter(Boolean).join(' ')};})()`;

/* the two compared on a list of cases, in a page that holds the renderer: whatever the compiler writes, the renderer keeps unchanged
   (differ), and where the renderer would change something the compiler wrote nothing (lost) */
async function compare(p,cases){
  const theirs=[],unchanged=[],mineCanon=new Map();
  const mine=cases.map(c=>{try{return figureOf(c.svg);}catch(e){return {ok:false,why:'threw '+e.message};}});
  const written=mine.map((m,i)=>m.ok?i:-1).filter(i=>i>=0);
  for(let at=0;at<cases.length;at+=500){
    const part=cases.slice(at,at+500);
    theirs.push(...await p.evaluate(({cases,SAME})=>{const S=eval(SAME);return cases.map(c=>{let n;try{n=sanitizeSvg(c.svg);}catch(e){return {err:String(e)};}return {canon:S.fromNodes(n),canonN:S.fromNodes(n,true)};});},{cases:part,SAME}));
    unchanged.push(...await p.evaluate(({cases,SAME})=>{const S=eval(SAME);return cases.map(c=>S.fromHtml(c.svg,true));},{cases:part,SAME}));
    const idx=written.filter(i=>i>=at&&i<at+500);
    const got=await p.evaluate(({htmls,SAME})=>{const S=eval(SAME);return htmls.map(h=>S.fromHtml(h));},{htmls:idx.map(i=>mine[i].html),SAME});
    idx.forEach((i,k)=>mineCanon.set(i,got[k]));}
  const differ=[];written.forEach(i=>{if(mineCanon.get(i)!==theirs[i].canon) differ.push({why:cases[i].why,svg:cases[i].svg.slice(0,2000),mine:mineCanon.get(i).slice(0,160),theirs:theirs[i].canon.slice(0,160)});});
  const lost=[];cases.forEach((c,i)=>{if(mine[i].ok&&unchanged[i]!==theirs[i].canonN) lost.push(c.why+' | '+c.svg.slice(0,2000));});
  return {mine,theirs,written,differ,lost};}

/* ======================= 1b. a phone's picture: the size written is the size the browser draws ======================= */
async function exifCheck(b){
  const dir=path.join(OUT,'exif');fs.mkdirSync(dir,{recursive:true});
  const base=fs.readFileSync(path.join(ASSETS,'compile-pictures','tide.jpg'));
  const be2=n=>Buffer.from([n>>8,n&255]);
  const tiff=(order,le,o)=>{o=o||{};const w2=n=>le?Buffer.from([n&255,(n>>8)&255]):be2(n),w4=n=>le?Buffer.from([n&255,(n>>8)&255,(n>>16)&255,n>>>24]):Buffer.from([n>>>24,(n>>16)&255,(n>>8)&255,n&255]);
    return Buffer.concat([Buffer.from(o.bom||(le?'II':'MM')),w2(o.magic||42),w4(o.ifd===undefined?8:o.ifd),w2(o.count===undefined?2:o.count),
      w2(0x0100),w2(4),w4(1),w4(99),w2(0x0112),w2(o.type||3),w4(o.n===undefined?1:o.n),w2(order),w2(0),w4(0)]);};
  const seg=(data,marker)=>Buffer.concat([Buffer.from([0xff,marker||0xe1]),be2(data.length+2),data]);
  const jw=segment=>Buffer.concat([base.subarray(0,2),segment,base.subarray(2)]);
  const exif=(order,le,o)=>seg(Buffer.concat([Buffer.from('Exif\0\0'),tiff(order,le,o)]));
  const le2=n=>Buffer.from([n&255,n>>8]),entry=(tag,v)=>Buffer.concat([le2(tag),le2(3),Buffer.from([1,0,0,0]),le2(v),Buffer.alloc(2)]);
  const variants=[['no EXIF',base]];
  for(const le of [true,false]) for(let o=1;o<=8;o++) variants.push(['orientation '+o+(le?' little':' big')+'-endian',jw(exif(o,le))]);
  variants.push(['more entries than the block holds',jw(exif(6,true,{count:500}))],['a cut-off entry',jw(seg(Buffer.concat([Buffer.from('Exif\0\0'),tiff(6,true).subarray(0,32)])))],
    ['two blocks, the first upright',jw(Buffer.concat([exif(1,true),exif(6,true)]))],['an XMP block before the EXIF',jw(Buffer.concat([seg(Buffer.from('http://ns.adobe.com/xap/1.0/\0<x/>')),exif(8,false)]))],
    ['an entry past the end of the block',jw(Buffer.concat([seg(Buffer.concat([Buffer.from('Exif\0\0II'),le2(42),Buffer.from([8,0,0,0]),le2(3),entry(0x0100,99),entry(0x0101,98)])),entry(0x0112,6)]))],
    ['a LONG orientation',jw(exif(6,true,{type:4}))],['a count of 2',jw(exif(6,true,{n:2}))],['an orientation of 9',jw(exif(9,true))],['a bad TIFF magic',jw(exif(6,true,{magic:43}))],['a bad byte order',jw(exif(6,false,{bom:'XX'}))]);
  const ctx=await b.newContext();const p=await ctx.newPage();const bad=[];
  for(const [what,buf] of variants){
    const f=path.join(dir,'v.jpg');fs.writeFileSync(f,buf);
    await p.goto('file://'+f);
    const got=await p.evaluate(()=>{const i=document.images[0];return i?i.naturalWidth+'x'+i.naturalHeight:'none';});
    const s=C.imageSize('jpg',buf),mine=s?s.width+'x'+s.height:'none';
    if(got!==mine) bad.push(what+': written '+mine+', browser '+got);}
  ok(bad.length===0,'the size written for a JPEG is the size Chromium draws, for '+variants.length+' pictures (no EXIF, orientation 1 to 8 in both byte orders, and damaged blocks)'+(bad.length?' DIFFERENT: '+bad.join('; '):''));
  const turned=await (async()=>{fs.writeFileSync(path.join(dir,'t.jpg'),jw(exif(6,true)));await p.goto('file://'+path.join(dir,'t.jpg'));return p.evaluate(()=>document.images[0].naturalWidth+'x'+document.images[0].naturalHeight);})();
  const plainSize=C.imageSize('jpg',base);
  ok(turned===plainSize.height+'x'+plainSize.width&&plainSize.width!==plainSize.height,'control: a turned picture really is drawn with its width and height swapped ('+turned+' for a '+plainSize.width+'x'+plainSize.height+' frame)');
  await ctx.close();}

async function figureCheck(b){
  const ctx=await b.newContext({viewport:{width:900,height:700}});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://plain.test/**',r=>{const u=new URL(r.request().url()).pathname;
    if(u==='/app/') return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
    r.fulfill({status:404,body:'not here'});});
  await p.goto('https://plain.test/app/');await p.waitForTimeout(500);
  ok(await p.evaluate(()=>typeof sanitizeSvg==='function'),'the renderer\'s sanitizeSvg is there to compare with');
  const {mine,written,differ,lost}=await compare(p,cases);
  ok(differ.length===0,'every figure the compiler writes is what the renderer\'s sanitizeSvg keeps, unchanged ('+written.length+' of '+cases.length+' written, '+(cases.length-written.length)+' refused)'
    +(differ.length?' DIFFERENT: '+differ.slice(0,4).map(d=>d.why+' | mine '+d.mine+' | theirs '+d.theirs).join(' || '):''));
  ok(written.length>=100&&cases.length-written.length>=60,'the matrix has both: many figures written and many refused ('+written.length+' / '+(cases.length-written.length)+')');
  const refusedWithReason=mine.filter(m=>!m.ok).every(m=>typeof m.why==='string'&&m.why.length>5);
  ok(refusedWithReason,'every refused figure says why');
  /* the other way: where the renderer would have changed something, the compiler must not have written the figure (empty declarations in a style left out of both) */
  ok(lost.length===0,'where the renderer drops or rewrites something the compiler refuses the figure'+(lost.length?' (written anyway: '+lost.slice(0,5).join(', ')+')':''));
  /* a control: the comparison notices a difference (one attribute changed in what the compiler wrote) */
  const ctl=mine[0].html.replace('<rect ','<rect data-extra="1" ');
  const [c1,c2]=await p.evaluate(({a,b,SAME})=>{const S=eval(SAME);return [S.fromHtml(a),S.fromHtml(b)];},{a:mine[0].html,b:ctl,SAME});
  ok(mine[0].ok&&c1!==c2,'control: the comparison notices one attribute added');
  /* a seeded fuzz of made-up figures: every kept element, hostile ones, plain and hostile attribute values, entities, text, ids and references, with
     characters flipped now and then. Fixed seeds, so a failure repeats; BK_FUZZ_SEEDS and BK_FUZZ_CASES run a larger one (see README). */
  const seeds=Number(process.env.BK_FUZZ_SEEDS||2),per=Number(process.env.BK_FUZZ_CASES||600);let total=0,wrote=0,bad=[],lostAll=[];
  for(let s=1;s<=seeds;s++){
    const fz=fuzzCases(s,per),r=await compare(p,fz);total+=fz.length;wrote+=r.written.length;bad.push(...r.differ);lostAll.push(...r.lost);}
  ok(bad.length===0&&lostAll.length===0,'a seeded fuzz of '+total+' made-up figures ('+seeds+' seeds): '+wrote+' written, every one unchanged by the renderer, and none the renderer would change'
    +(bad.length?' DIFFERENT '+bad.length+': '+bad.slice(0,3).map(d=>d.svg+' | mine '+d.mine+' | theirs '+d.theirs).join(' || '):'')+(lostAll.length?' LOST '+lostAll.length+': '+lostAll.slice(0,3).join(' || '):''));
  ok(wrote>total/20&&wrote<total*0.95,'the fuzz has both: figures written and figures refused ('+wrote+' of '+total+')');
  if(process.env.BK_FUZZ_REPORT) console.log('fuzz: '+total+' cases, '+wrote+' written, '+bad.length+' differ, '+lostAll.length+' lost\n'+bad.slice(0,20).map(d=>'  DIFF '+d.svg+'\n     mine   '+d.mine+'\n     theirs '+d.theirs).join('\n')+'\n'+lostAll.slice(0,20).map(l=>'  LOST '+l).join('\n'));
  ok(!errs.length,'no page error in the renderer\'s page'+(errs.length?' ('+errs[0]+')':''));
  await ctx.close();}

/* a small seeded generator (mulberry32) and the figures the fuzz makes from it */
function mulberry32(a){return ()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function fuzzCases(seed,n){
  const rnd=mulberry32(seed*7919),pick=a=>a[Math.floor(rnd()*a.length)],chance=p=>rnd()<p;
  const kept=[...R.SVG_KEEP].filter(e=>e!=='svg');
  const hostile=['script','foreignObject','a','iframe','style','p:script','image','use','set','animate','title','desc','svg','object','embed','math','br'];
  const names=['class','id','data-r','data-x','data-bk-r','aria-label','aria-hidden','role','fill','stroke','stroke-width','opacity','style','href','xlink:href','transform','d','x','y','cx','r','width','height','points','viewBox','clip-path','mask','filter','marker-end','font-family',
    'text-anchor','onclick','onload','tabindex','xmlns','xmlns:xlink','xml:space','lang','values','attributeName','begin','to','fill-opacity','stroke-linecap','marker-mid','fill-rule','src','title','transform-origin','version'];
  const ids=['a','b','c','one','two','x1'];
  const vals=()=>pick([()=>pick(['red','none','#abc','#aabbcc','rgb(1,2,3)','currentColor','inherit','0','1','10','3.5','-2','1 2 3','M0 0L5 5','rotate(5)','translate(1 2)','Georgia, serif','middle','img','true','box','top']),
    ()=>'url(#'+pick(ids)+')',()=>'#'+pick(ids),()=>pick(ids),()=>'url(#'+pick(ids)+') '+pick(['red','none','var(--x)','attr(x)']),()=>'url(https://example.invalid/a)',()=>'url( #'+pick(ids)+' )',
    ()=>pick(['javascript:alert(1)','data:image/png;base64,AA','file:///x','vbscript:x','Profile: left','Data: pain','Metadata:left','1;javascript:x','java&#9;script:x']),
    ()=>pick(['var(--x)','a*b','attr(x)','10;x','expression(1)','calc(1px+2px)','red;fill:blue','a\\b','a<b','a&lt;b','a&amp;b','a&deg;b','a&nbsp;b','&copy','&#176;','&#xB0;','&#1;','"x"',"'x'"]),
    ()=>pick(['fill:red','fill:red;stroke:blue','fill:url(#a);stroke:#abc','fill:url(#a)','stroke-width:2','position:fixed','behavior:url(#a)','font-family:Georgia','fill:var(--x)','fill:red;;','','nonsense','content:"x"','stroke:rgb(1,2,3);opacity:.5']),
    ()=>pick(['a b','a-b','a.b','a_b c','bk-x','rg','rg bk-y keep','1bad','a b-c'])])();
  const plainNames=['class','id','data-r','data-x','aria-label','fill','stroke','stroke-width','opacity','style','transform','d','x','y','cx','r','width','height','points','font-family','text-anchor','fill-opacity','stroke-linecap','role'];
  const plainVals=['red','none','#abc','rgb(1,2,3)','0','1','10','3.5','M0 0L5 5','rotate(5)','Georgia, serif','middle','img','box','top','a b','a-b'];
  const attrs=()=>{let s='';const k=Math.floor(rnd()*4),have=new Set();for(let i=0;i<k;i++){const bad=chance(0.1),nm=bad?pick(names):pick(plainNames);if(have.has(nm)) continue;have.add(nm);
    let v=nm==='id'?pick(ids):bad?vals():/^(aria-label|data-x)$/.test(nm)?pick(['Profile: front','Data: pain','a b']):nm==='style'?pick(['fill:red','fill:red;stroke:blue','stroke-width:2','fill:url(#'+pick(ids)+')','opacity:.5']):
      /^(fill|stroke)$/.test(nm)&&chance(0.3)?'url(#'+pick(ids)+')':pick(plainVals);
    s+=' '+nm+'="'+v.replace(/"/g,'&quot;')+'"';}return s;};
  const texts=()=>chance(0.06)?pick(['20&deg;','&nbsp;x','&copy 2024','x &','<![CDATA[x]]>','<!-- c -->','a &amp;&lt; b','&#233;','&#xe9;']):pick(['','words','Profile: front','a &amp; b','&lt;b&gt;','caf&#233;',' ','a\tb','a\nb','\u00e9\u4e2d','more words','words']);
  const el=(depth)=>{
    const tag=chance(0.03)?pick(hostile):pick(kept);
    const a=attrs();
    if(depth>=3||chance(0.35)) return chance(0.5)?'<'+tag+a+'/>':'<'+tag+a+'>'+texts()+'</'+tag+'>';
    const k=1+Math.floor(rnd()*3);let inner='';for(let i=0;i<k;i++) inner+=chance(0.2)?texts():el(depth+1);
    return '<'+tag+a+'>'+inner+'</'+tag+'>';};
  const flip=s=>{if(!chance(0.12)) return s;const chars='<>&"\'=;:#( )\\/-.';let o=s;for(let i=0;i<1+Math.floor(rnd()*2);i++){const at=Math.floor(rnd()*o.length);o=o.slice(0,at)+(chance(0.5)?pick(chars.split('')):'')+o.slice(at+1);}return o;};
  const out=[];
  for(let i=0;i<n;i++){
    let body='<defs><linearGradient id="a"/><clipPath id="b"><rect width="1" height="1"/></clipPath></defs>';
    const k=1+Math.floor(rnd()*4);for(let j=0;j<k;j++) body+=el(0);
    const root='<svg viewBox="0 0 10 10"'+(chance(0.2)?attrs():'')+'>';
    out.push({why:'fuzz seed '+seed+' #'+i,svg:flip(root+body+'</svg>')});}
  return out;}

/* ======================= 2. diagrams drawn for real ======================= */
const CORPUS={
  flowchart:'flowchart LR\n  A[Start] --> B{Choice}\n  B -->|yes| C[Done]\n  B -->|no| D((Stop))\n  classDef big fill:#bbf,stroke:#333\n  class C big',
  'flowchart with a subgraph':'flowchart TD\n  subgraph one [Group]\n    A --> B\n  end\n  B --> C\n  accTitle: Two steps and a third',
  sequence:'sequenceDiagram\n  participant A as Alice\n  actor B as Bob\n  A->>B: Hello there\n  Note over A,B: a note\n  B-->>A: Hi',
  class:'classDiagram\n  class Animal {\n    <<interface>>\n    +int age\n    +eat() void\n  }\n  class Dog\n  Animal <|-- Dog',
  state:'stateDiagram-v2\n  [*] --> Still\n  Still --> Moving: go\n  Moving --> [*]',
  er:'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  CUSTOMER {\n    string name\n    int id PK\n  }',
  gantt:'gantt\n  title Plan\n  dateFormat YYYY-MM-DD\n  section S\n  Task one :a1, 2024-01-01, 3d\n  Task two :after a1, 2d',
  pie:'pie title Pets\n  "Dogs" : 386\n  "Cats" : 85',
  timeline:'timeline\n  title History\n  2002 : First\n  2004 : Second : Third',
  quadrant:'quadrantChart\n  title Reach\n  x-axis Low --> High\n  y-axis Low --> High\n  quadrant-1 Expand\n  Campaign A: [0.3, 0.6]',
  xychart:'xychart-beta\n  title "Sales"\n  x-axis [jan, feb]\n  y-axis "Rev" 0 --> 100\n  bar [10, 50]\n  line [10, 50]',
  git:'gitGraph\n  commit id: "a"\n  branch dev\n  commit tag: "v1"\n  checkout main\n  merge dev',
  block:'block-beta\n  columns 2\n  a["A"] b["B"]\n  a --> b',
  journey:'journey\n  title Day\n  section Work\n    Make tea: 5: Me'};
function corpusBooklet(dir){
  fs.mkdirSync(dir,{recursive:true});
  const names=Object.keys(CORPUS);
  fs.writeFileSync(path.join(dir,'corpus.booklet.md'),'---\nbooklet: "0.17"\nid: test/corpus\ntitle: A corpus of diagrams\nlang: en\n---\n\n# A corpus of diagrams\n\nMade-up diagrams of the common types.\n\n'
    +names.map(n=>'## '+n+'\n\n```mermaid\n'+CORPUS[n]+'\n```\n').join('\n'));
  return names;}

/* ======================= 3. the compiled pages ======================= */
const lum=c=>{const m=/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)/.exec(c)||/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c);if(!m) return null;
  const v=m.length===4&&c[0]==='#'?[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]:[+m[1],+m[2],+m[3]];
  const f=x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);};return 0.2126*f(v[0])+0.7152*f(v[1])+0.0722*f(v[2]);};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);if(x==null||y==null) return 0;return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};

(async()=>{
  const b=await chromium.launch();
  try{
    await figureCheck(b);
    await exifCheck(b);

    /* 2 and 3: compile for real */
    fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
    const names=corpusBooklet(path.join(OUT,'src'));
    const inputs=[{file:path.join(OUT,'src','corpus.booklet.md')},...['compile-bodymap','compile-pictures','compile-diagrams'].map(n=>({file:path.join(ASSETS,n+'.booklet.md')}))];
    const run=C.compile(inputs,{form:'standalone',renderer:HTML});
    C.write(run,path.join(OUT,'site'),{force:true});
    const report=C.reportText(run);
    ok(run.results.every(r=>r.rep.ok),'the four booklets compile with '+path.basename(HTML));
    const corpus=run.results[0],cpage=corpus.files.get('corpus/index.html')||'';
    const drawn=(cpage.match(/<figure class="bk-diagram">/g)||[]).length,kept=corpus.rep.marked.filter(m=>m.kind==='mermaid');
    console.log('corpus: '+drawn+' of '+names.length+' drawn; as source: '+kept.map(m=>m.what+' ('+(m.why||'').slice(0,90)+')').join('; '));
    ok(drawn+kept.length===names.length,'every diagram of the corpus is either drawn or shown as its source with a reason ('+drawn+' + '+kept.length+' of '+names.length+')');
    /* exactly these thirteen are drawn, and exactly this one (the journey diagram, whose drawing holds HTML in an SVG, which the SVG rules refuse) falls back to its source */
    const DRAWN=['flowchart','flowchart with a subgraph','sequence','class','state','er','gantt','pie','timeline','quadrant','xychart','git','block'],FALLS=['journey'];
    const fallsAt=kept.map(m=>Number((/its (\d+)\w\w diagram/.exec(m.what)||[])[1]));
    ok(DRAWN.length===13&&JSON.stringify(names.filter((n,i)=>!fallsAt.includes(i+1)))===JSON.stringify(DRAWN)&&JSON.stringify(names.filter((n,i)=>fallsAt.includes(i+1)))===JSON.stringify(FALLS),
      'exactly these thirteen are drawn for real, by the renderer\'s own part, and only the journey diagram falls back ('+drawn+' drawn; falls back: '+names.filter((n,i)=>fallsAt.includes(i+1)).join(', ')+')');
    ok(kept.every(m=>m.why&&!/no browser|request/.test(m.why)),'none falls back for want of a browser or for a request the page made');
    ok(!/browser page made a request/.test(report),'the browser page made no request');
    ok(kept.every(m=>/foreignObject|HTML|XHTML/i.test(m.why)||/refuses|rules|SVG|could not/.test(m.why)),'a diagram shown as its source says why');
    /* the diagram part is not on the page, and nothing on it runs */
    const strip=h=>h.replace(/<!--[^]*?-->/g,'');
    ok(!/<script(?![^>]*type="application\/ld\+json")/i.test(strip(cpage)),'the compiled page carries no script (the mermaid part is not on it)');
    ok(!/mermaid/i.test(strip(cpage).replace(/data-lang="mermaid"/g,'')),'…and does not name the library');
    ok(!/https?:\/\/(?!www\.w3\.org\/)/i.test(strip(cpage).replace(/<script type="application\/ld\+json">[^]*?<\/script>/,'')),'…and holds no address of its own that a drawing could have added');
    /* repeatable: the library draws a class, an ER and a git-graph picture with random numbers; the runner seeds them, so the same source gives the same
       drawing, in the same batch or another, in the same order or another */
    {const codes=names.map(n=>CORPUS[n]),a1=G.drawBatch(X,codes,{}),a2=G.drawBatch(X,[...codes].reverse(),{}),a3=G.drawBatch(X,[CORPUS.git],{});
      for(const n of ['class','er','git']) ok(!!a1.get(CORPUS[n]).svg&&a1.get(CORPUS[n]).svg===a2.get(CORPUS[n]).svg,'the '+n+' diagram is drawn identically in two batches (the second in the other order)');
      ok(a1.get(CORPUS.git).svg===a3.get(CORPUS.git).svg,'…and alone');
      const diff=names.filter(n=>a1.get(CORPUS[n]).svg!==a2.get(CORPUS[n]).svg);ok(diff.length===0,'every drawing of the corpus is the same in both batches'+(diff.length?' (differ: '+diff.join(', ')+')':''));}
    const sizeNow=Buffer.byteLength(cpage);console.log('corpus page: '+sizeNow+' bytes with '+drawn+' diagrams drawn');

    /* 2b. the page is shut. The server is a process of its own: drawBatch blocks this one while the browser runs, and a server here
       could not answer, or count, a request made in that time. It counts every connection it gets, in a file, and is stopped at the end. */
    {const dir=path.join(OUT,'shut');fs.mkdirSync(dir,{recursive:true});const hitFile=path.join(dir,'hits.txt');fs.writeFileSync(hitFile,'');
      const srv=cp.spawn(process.execPath,['-e',"const n=require('net'),f=require('fs');const s=n.createServer(c=>{f.appendFileSync(process.argv[1],'connection\\n');c.on('error',()=>{});c.destroy();});s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port)+'\\n');});",hitFile],{stdio:['ignore','pipe','inherit']});
      try{
        const port=await new Promise((go,no)=>{srv.stdout.once('data',d=>go(String(d).trim()));srv.once('error',no);srv.once('exit',()=>no(new Error('the test server stopped')));});
        const U='https://127.0.0.1:'+port;   /* a plain socket that counts every connection: a page that could reach out would connect, whatever it then said */
        const bad=[
          'flowchart LR\n A@{ img: "'+U+'/img", label: "x", pos: "t", w: 60, h: 60 } --> B',
          'flowchart LR\n A@{ icon: "'+U+'/icon", form: "square" }',
          '%%{init: {"themeCSS": ".node{background:url('+U+'/css)}"}}%%\nflowchart LR\n A --> B',
          'flowchart LR\n A[<img src="'+U+'/html">] --> B',
          'flowchart LR\n A[x] --> B\n click A "'+U+'/click"',
          'flowchart LR\n A --> B\n style A fill:url('+U+'/style)'];
        const out=G.drawBatch(X,bad,{});
        const kept=[...out.values()].filter(v=>v.svg);
        await new Promise(go=>setTimeout(go,300));
        const hits=fs.readFileSync(hitFile,'utf8').split('\n').filter(Boolean);
        ok(out.size===bad.length,'the runner answers for every source handed to it ('+out.size+')');
        ok(hits.length===0,'the test server saw no connection from the browser page ('+hits.length+' connections'+(hits.length?': '+hits.join(' '):'')+')');
        ok([...out.values()].every(v=>/made a request/.test(v.why||'')),'the attempt was seen and refused, and the whole batch was thrown away with it: every answer says the page made a request');
        ok(kept.every(v=>!v.svg.includes(U)||G.diagram(v.svg,{svgProblem:C.svgProblem,prefix:'bk-dg1',paper:'#F8F6F1',word:'Diagram'}).ok===false),'a drawing that names the address is refused by the SVG rules ('+kept.length+' drawn, '+(bad.length-kept.length)+' not drawn)');
      }finally{srv.kill('SIGKILL');await new Promise(go=>{if(srv.exitCode!==null||srv.signalCode) return go();srv.once('exit',go);});}}

    const pages=[['corpus','corpus'],['compile-bodymap','compile-bodymap'],['compile-pictures','compile-pictures'],['compile-diagrams','compile-diagrams']];
    for(const scheme of ['light','dark']) for(const width of [1280,390]){
      const ctx=await b.newContext({viewport:{width,height:900},javaScriptEnabled:false,colorScheme:scheme});const p=await ctx.newPage();
      const reqs=[],failed=[],errs=[];p.on('request',r=>reqs.push(r.url()));p.on('requestfailed',r=>failed.push(r.url()));
      p.on('console',m=>{if(m.type()==='error') errs.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
      for(const [label,name] of pages){
        const at=label+' at '+width+' ('+scheme+', scripting off)';reqs.length=0;failed.length=0;errs.length=0;
        const file=path.join(OUT,'site',name,'index.html');
        await p.goto('file://'+file);await p.evaluate(async()=>{await document.fonts.ready;});
        const sw=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,w:window.innerWidth}));
        ok(sw.sw<=sw.w,at+': no sideways scroll ('+sw.sw+' <= '+sw.w+')');
        const info=await p.evaluate(()=>{
          const box=e=>{const r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),left:Math.round(r.left),right:Math.round(r.right)};};
          const vis=e=>{const s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden';};
          const svgs=[...document.querySelectorAll('.bk-diagram svg')].map(s=>({box:box(s),vis:vis(s),words:[...s.querySelectorAll('text')].filter(t=>t.textContent.trim()&&t.getBoundingClientRect().width>0).length,
            name:s.getAttribute('aria-label'),role:s.getAttribute('role'),
            paper:(()=>{const p=[...s.children].find(c=>!/^(title|desc)$/.test(c.localName));return p&&p.localName==='rect'?getComputedStyle(p).fill:null;})(),
            low:(()=>{const rects=[];const pe=[...s.children].find(c=>!/^(title|desc)$/.test(c.localName)),paper=pe&&pe.localName==='rect'?getComputedStyle(pe).fill:null;
              const solid=c=>c&&c!=='none'&&!/rgba\(\d+, \d+, \d+, 0\)/.test(c);
              for(const t of s.querySelectorAll('text')){if(!t.textContent.trim()) continue;const r=t.getBoundingClientRect();if(!r.width||!r.height) continue;
                const hit=document.elementsFromPoint(r.left+r.width/2,r.top+r.height/2).filter(e=>s.contains(e)&&e!==t&&e.parentElement!==t&&/^(rect|path|polygon|circle|ellipse)$/.test(e.localName)&&solid(getComputedStyle(e).fill))[0];
                rects.push({ink:getComputedStyle(t.querySelector('tspan')||t).fill,back:hit?getComputedStyle(hit).fill:paper,text:t.textContent.trim().slice(0,20)});}
              return rects;})()}));
          const figs=[...document.querySelectorAll('.bk-svgfig svg')].map(s=>({box:box(s),vis:vis(s),regions:s.querySelectorAll('.rg').length,named:[...s.querySelectorAll('.rg[data-r]')].every(e=>e.getAttribute('role')==='img'&&e.getAttribute('aria-label'))}));
          const imgs=[...document.images].map(i=>({src:i.getAttribute('src'),w:i.getAttribute('width'),h:i.getAttribute('height'),nw:i.naturalWidth,nh:i.naturalHeight,shown:i.getBoundingClientRect().width,shownH:i.getBoundingClientRect().height}));
          const srcs=[...document.querySelectorAll('.bk-figure-src')].length;
          return {svgs,figs,imgs,srcs,scripts:document.scripts.length};});
        if(name==='corpus'){
          ok(info.svgs.length===drawn,at+': every drawn diagram is on the page ('+info.svgs.length+')');
          ok(info.svgs.every(s=>s.vis&&s.box.w>20&&s.box.h>20&&s.box.right<=width+1),at+': each has a size and fits the width'+(info.svgs.filter(s=>!(s.vis&&s.box.w>20&&s.box.h>20&&s.box.right<=width+1)).length?' (bad: '+JSON.stringify(info.svgs.filter(s=>!(s.vis&&s.box.w>20&&s.box.h>20&&s.box.right<=width+1)).slice(0,2))+')':''));
          ok(info.svgs.every(s=>s.words>0),at+': the words of each are drawn (the page measured them in its own face)');
          ok(info.svgs.every(s=>s.name&&s.role==='graphics-document document'),at+': each has a name for a screen reader');
          ok(info.srcs===kept.length,at+': a diagram that fell back shows its source ('+info.srcs+')');
          /* paper stays the paper, whatever the page does */
          const papers=new Set(info.svgs.map(s=>s.paper));ok(papers.size===1,at+': every diagram keeps one paper ('+[...papers].join(',')+')');
          const all=info.svgs.flatMap(s=>s.low),weak=all.filter(t=>ratio(t.ink,t.back)<4.5);
          ok(all.length>20&&weak.length===0,at+': the text on a diagram keeps its contrast on what is behind it ('+all.length+' labels'+(weak.length?'; weak: '+weak.slice(0,6).map(t=>t.text+' '+t.ink+' on '+t.back+' '+ratio(t.ink,t.back).toFixed(1)).join(', '):'')+')');
          if(scheme==='dark'){ok(info.svgs.every(s=>lum(s.paper)>0.5),at+': a diagram on a dark page is still drawn on its light paper, so it reads');}}
        if(name==='compile-bodymap'){
          ok(info.figs.length>=2,at+': the body map\'s figures are drawn ('+info.figs.length+')');
          ok(info.figs.every(f=>f.vis&&f.box.w>20&&f.box.h>20&&f.box.right<=width+1),at+': each figure has a size and fits the width');
          ok(info.figs.every(f=>f.regions>0&&f.named),at+': its regions are pictures with names');}
        if(name==='compile-diagrams'){
          ok(info.svgs.length===3,at+': the diagrams page has its three drawn diagrams ('+info.svgs.length+')');
          ok(info.srcs===1,at+': the one the renderer\'s own screen refuses is shown as its source ('+info.srcs+')');}
        if(name==='compile-pictures'){
          const sized=info.imgs.filter(i=>i.w);
          /* a raster picture loads at the size written; an SVG with only a viewBox has no size of its own, so its drawn shape is held to the ratio written */
          const fits=i=>/\.svg$/.test(i.src)?Math.abs(i.shown/i.shownH-(+i.w)/(+i.h))<0.02:i.nw===+i.w&&i.nh===+i.h;
          ok(sized.length>=6&&sized.every(fits),at+': each picture loads at the size written on it ('+sized.map(i=>i.src+' '+i.nw+'x'+i.nh+' as '+i.w+'x'+i.h).join(', ')+')');
          ok(info.imgs.some(i=>!i.w),at+': one whose size could not be read is written without');
          ok(info.imgs.every(i=>i.shown<=width+1),at+': none is wider than the page');}
        ok(info.scripts===0||info.scripts===1,at+': the page carries no script of its own ('+info.scripts+')');
        const own='file://'+path.join(OUT,'site')+'/';
        const outside=reqs.filter(u=>!u.startsWith(own)&&!u.startsWith('data:'));
        ok(!outside.length&&!failed.length&&!errs.length,at+': asks for nothing but its own files, every one loads, no error'+(outside.length?' (outside: '+outside.slice(0,3).join(', ')+')':'')+(failed.length?' (failed: '+failed.slice(0,3).join(', ')+')':'')+(errs.length?' ('+errs[0]+')':''));}
      await ctx.close();}

    /* 4. many pages, the optional script on: a figure in a tab, a diagram in an author's fold in another tab */
    {const dir=path.join(OUT,'tabs');
      const tr=C.compile([{file:path.join(ASSETS,'compile-figure-tabs.booklet.md')}],{form:'standalone',renderer:HTML});
      C.write(tr,dir,{force:true});
      ok(tr.results.every(r=>r.rep.ok),'the tabs booklet compiles with '+path.basename(HTML));
      fs.writeFileSync(path.join(dir,'booklet','booklet.js'),require('../compile/script.js').assemble().text);
      const withScript=name=>{const src=fs.readFileSync(path.join(dir,name,'index.html'),'utf8'),up='../'.repeat(name.split('/').length);
        fs.writeFileSync(path.join(dir,name,'with-script.html'),/booklet\/booklet\.js/.test(src)?src:src.replace('</body>','<script src="'+up+'booklet/booklet.js" defer></script>\n</body>'));};
      ['compile-figure-tabs/where','compile-figure-tabs/after'].forEach(withScript);
      const plain=fs.readFileSync(path.join(dir,'compile-figure-tabs/where/index.html'),'utf8');
      const ids=h=>(h.match(/\sid="([^"]*)"/g)||[]).map(x=>x.slice(5,-1));
      const pageIds=['compile-figure-tabs','compile-figure-tabs/where','compile-figure-tabs/after'].flatMap(n=>ids(fs.readFileSync(path.join(dir,n,'index.html'),'utf8')));
      ok(pageIds.length===new Set(pageIds).size,'no id is written twice across the three pages of the booklet');
      ok(/id="bk-compile-figure-tabs-where-f1-/.test(plain)||/bk-compile-figure-tabs-where-f1/.test(plain)||ids(plain).some(x=>x.startsWith('bk-compile-figure-tabs-where-')),'the figure and the diagram on the activity page take its prefix');
      ok(/<svg id="bk-compile-figure-tabs-where-dg2"/.test(plain)&&/<svg id="bk-compile-figure-tabs-after-dg1"/.test(fs.readFileSync(path.join(dir,'compile-figure-tabs/after/index.html'),'utf8')),'a page numbers its figures and diagrams together from 1 under its own prefix (the figure f1, then the diagram dg2 on one page; dg1 on the other)');
      const rm=(p,sel)=>p.evaluate(s=>[...document.querySelectorAll(s)].map(e=>{const r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right),
        shown:r.height>0&&r.width>0&&e.checkVisibility()&&getComputedStyle(e).visibility!=='hidden',words:[...e.querySelectorAll('text')].filter(t=>t.textContent.trim()&&t.getBoundingClientRect().width>0).length};}),sel);
      for(const width of [1280,390]){
        const at='tabs page at '+width;
        const ctx=await b.newContext({viewport:{width,height:900}});const p=await ctx.newPage();
        const reqs=[],errs=[];p.on('request',r=>reqs.push(r.url()));p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error') errs.push(m.text());});
        const base='file://'+dir+'/';
        await p.goto(base+'compile-figure-tabs/where/with-script.html');await p.evaluate(()=>document.fonts.ready);
        const tabs=await p.evaluate(()=>[...document.querySelectorAll('[role=tab]')].map(t=>t.getAttribute('aria-selected')+':'+t.textContent.trim()));
        ok(tabs.join()==='true:The map,false:The flow',at+': the script makes a tab bar over the page\'s two tabs, the first on show ('+tabs.join()+')');
        let fg=(await rm(p,'.bk-svgfig svg'))[0],dg=(await rm(p,'.bk-diagram svg'))[0];
        ok(fg&&fg.shown&&fg.w>20&&fg.h>20&&fg.right<=width+1,at+': the first tab shows the body map\'s figure with a size ('+JSON.stringify(fg)+')');
        ok(dg&&!dg.shown,at+': the diagram in the other tab\'s fold is not shown yet ('+JSON.stringify(dg)+')');
        await p.getByRole('tab',{name:'The flow'}).click();
        let after=await p.evaluate(()=>({fig:[...document.querySelectorAll('.bk-svgfig svg')].map(e=>e.checkVisibility()&&e.getBoundingClientRect().height>0),open:[...document.querySelectorAll('details.bk-fold')].map(d=>d.open)}));
        dg=(await rm(p,'.bk-diagram svg'))[0];
        ok(after.fig.every(v=>!v)&&dg&&!dg.shown&&after.open.every(o=>!o),at+': the second tab is on show, the figure is gone, and the diagram stays hidden in its shut fold');
        await p.getByRole('switch',{name:'Open all'}).click();
        dg=(await rm(p,'.bk-diagram svg'))[0];
        ok(dg&&dg.shown&&dg.w>20&&dg.h>20&&dg.right<=width+1&&dg.words>=3,at+': Open all opens the fold: the diagram has a size, fits the width and its words are drawn ('+JSON.stringify(dg)+')');
        await p.getByRole('switch',{name:'Open all'}).click();
        dg=(await rm(p,'.bk-diagram svg'))[0];
        ok(dg&&!dg.shown,at+': Open all again shuts the fold and the diagram goes with it');
        await p.getByRole('tab',{name:'The map'}).click();
        const fg2=(await rm(p,'.bk-svgfig svg'))[0];
        ok(fg2&&fg2.shown&&fg2.w===fg.w&&fg2.h===fg.h,at+': back on the first tab the figure is the size it was ('+JSON.stringify(fg2)+')');
        /* a fold opened by hand in the second tab shows the diagram */
        await p.getByRole('tab',{name:'The flow'}).click();
        await p.locator('details.bk-fold > summary').first().click();
        dg=(await rm(p,'.bk-diagram svg'))[0];
        ok(dg&&dg.shown&&dg.w>20&&dg.words>=3,at+': a fold opened by hand shows the diagram too');
        /* an address into the second tab shows that tab, and a printed page shows every tab, with the figure and the diagram in view */
        await p.goto(base+'compile-figure-tabs/where/with-script.html#the-flow');await p.evaluate(()=>document.fonts.ready);
        ok(await p.evaluate(()=>document.querySelector('[role=tab][aria-selected=true]').textContent.trim())==='The flow',at+': an address that points into the second tab shows it');
        await p.emulateMedia({media:'print'});
        await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
        const pr=await p.evaluate(()=>({fig:[...document.querySelectorAll('.bk-svgfig svg')].map(e=>e.getBoundingClientRect().height>0),dia:[...document.querySelectorAll('.bk-diagram svg')].map(e=>e.checkVisibility()&&e.getBoundingClientRect().height>0),bar:!![...document.querySelectorAll('.bk-tabbar')].find(e=>e.getBoundingClientRect().height>0)}));
        ok(pr.fig.every(Boolean)&&pr.fig.length===1&&pr.dia.every(Boolean)&&pr.dia.length===1&&!pr.bar,at+': printed, every tab is shown with the figure and the diagram in it, and no bar');
        await p.emulateMedia({media:'screen'});
        /* the page of its own: a diagram, no tabs, no folds */
        await p.goto(base+'compile-figure-tabs/after/with-script.html');await p.evaluate(()=>document.fonts.ready);
        const d2=(await rm(p,'.bk-diagram svg'))[0];
        ok(d2&&d2.shown&&d2.w>20&&d2.words>=3&&d2.right<=width+1,at+': the diagram on the second activity\'s page is drawn with the script on');
        const own='file://'+dir+'/';const outside=reqs.filter(u=>!u.startsWith(own)&&!u.startsWith('data:'));
        ok(!outside.length&&!errs.length,at+': nothing asked for but the booklet\'s own files, and no error'+(outside.length?' ('+outside.slice(0,3).join(', ')+')':'')+(errs.length?' ('+errs.slice(0,2).join('; ')+')':''));
        await ctx.close();}
      /* scripting off: both are in view, nothing hidden by a bar that is not there */
      {const ctx=await b.newContext({viewport:{width:1280,height:900},javaScriptEnabled:false});const p=await ctx.newPage();
        await p.goto('file://'+dir+'/compile-figure-tabs/where/index.html');
        const off=await p.evaluate(()=>({tabs:document.querySelectorAll('[role=tab]').length,fig:[...document.querySelectorAll('.bk-svgfig svg')].map(e=>e.getBoundingClientRect().height>0),
          dia:[...document.querySelectorAll('.bk-diagram svg')].map(e=>({shown:e.checkVisibility()&&e.getBoundingClientRect().height>0})),folds:document.querySelectorAll('details.bk-fold:not([open])').length}));
        ok(off.tabs===0&&off.fig.length===1&&off.fig[0]&&off.dia.length===1&&!off.dia[0].shown&&off.folds===2,'scripting off: both tabs are under their names, the figure is in view, and the diagram waits in its fold, which opens by hand');
        await p.locator('details.bk-fold > summary').first().click();
        ok(await p.evaluate(()=>document.querySelector('.bk-diagram svg').checkVisibility()&&document.querySelector('.bk-diagram svg').getBoundingClientRect().height>20),'scripting off: opening the fold shows the diagram');
        await ctx.close();}}
  }finally{await b.close();}
  console.log(fails.length?fails.length+' FAILED':'compile figures: all checks passed');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
