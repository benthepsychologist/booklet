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
//      for nothing but its own files and makes no script of its own.
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
  ['font-family','Georgia, serif'],['font-family','"x"; y'],['stroke-dasharray','1 2'],['text-anchor','middle'],['viewBox','0 0 5 5'],['preserveAspectRatio','xMidYMid'],['values','javascript:1'],['attributeName','href'],['begin','1s'],['src','x'],['action','x'],['formaction','x']];
for(const [a,v] of attrs){
  add('the attribute '+a+'="'+v+'" on a rect',wrap('<defs><linearGradient id="t"/></defs><rect '+a+'="'+v+'" width="3" height="3"/>'));
  add('the attribute '+a+'="'+v+'" on the root','<svg viewBox="0 0 10 10" '+a+'="'+v+'"><defs><linearGradient id="t"/></defs><rect width="3" height="3"/></svg>');}
for(const p of [...R.SVG_STYLE_PROPS]) add('the style property '+p,wrap('<rect style="'+p+':red" width="3" height="3"/>'));
for(const v of ['url(#t)','url(https://example.invalid/a)','expression(1)','red;fill:blue','red}','\\72 ed','red/*x*/','var(--x)','calc(1px)','#fff','rgb(1,2,3)','none','inherit','currentColor','-moz-binding:x'])
  add('the style value '+v,wrap('<defs><linearGradient id="t"/></defs><rect style="fill:'+v+'" width="3" height="3"/>'));
for(const h of ['<script>alert(1)</script>','<a href="#t"><rect id="t" width="1" height="1"/></a>','<foreignObject><p>x</p></foreignObject>','<style>rect{fill:red}</style>','<iframe src="x"/>','<image href="x.png"/>','<use href="#t"/><rect id="t" width="1" height="1"/>',
  '<use href="https://example.invalid/a.svg#b"/>','<animate attributeName="href" values="javascript:1"/>','<set attributeName="onclick" to="x"/>','<p:script xmlns:p="http://www.w3.org/2000/svg">x</p:script>','<svg><svg><rect width="1" height="1"/></svg></svg>',
  '<!-- a comment --><rect width="1" height="1"/>','<![CDATA[x]]>','<text>a &amp; b &lt;script&gt;</text>','<text>caf&#233;</text>','<rect id="a" width="1" height="1"/><rect id="a" width="1" height="1"/>',
  '<text><tspan>a</tspan> <tspan>b</tspan></text>','<g><g><g><g><rect width="1" height="1"/></g></g></g></g>']) add('the markup '+h.slice(0,50),wrap(h));
add('a figure with no root','<rect width="1" height="1"/>');add('an empty figure','');add('text only','hello');

const SAME=`(function(){
  /* the form two trees are compared in: names, attributes (ids and references with their prefix taken off, the role and name the
     compiler adds to a region left out), and text with its white space collapsed; a white-space-only text node is nothing */
  const strip=s=>String(s).replace(/\\b(?:bf\\d+|bk-f\\d+)-/g,'');
  const canon=(n,norm)=>{
    if(n.nodeType===3){const t=n.nodeValue.replace(/\\s+/g,' ').trim();return t?JSON.stringify(t):'';}
    if(n.nodeType!==1) return '';
    const region=n.hasAttribute('data-r');
    const val=x=>x.name==='style'&&norm?x.value.split(';').map(d=>d.trim()).filter(Boolean).join(';'):x.value;
    const a=[...n.attributes].filter(x=>!(region&&(x.name==='role'||x.name==='aria-label'))&&x.name!=='xmlns'&&x.name!=='xmlns:xlink'&&!(norm&&x.name==='style'&&!val(x))).map(x=>x.name+'='+JSON.stringify(strip(val(x)))).sort();
    return n.localName+'['+a.join(',')+']{'+[...n.childNodes].map(c=>canon(c,norm)).filter(Boolean).join(' ')+'}';};
  return {canon,fromHtml:(h,norm)=>{const b=new DOMParser().parseFromString(h,'text/html').body;return [...b.childNodes].map(c=>canon(c,norm)).filter(Boolean).join(' ');},
    fromNodes:(ns,norm)=>ns.map(c=>canon(c,norm)).filter(Boolean).join(' ')};})()`;

async function figureCheck(b){
  const ctx=await b.newContext({viewport:{width:900,height:700}});const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://plain.test/**',r=>{const u=new URL(r.request().url()).pathname;
    if(u==='/app/') return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
    r.fulfill({status:404,body:'not here'});});
  await p.goto('https://plain.test/app/');await p.waitForTimeout(500);
  ok(await p.evaluate(()=>typeof sanitizeSvg==='function'),'the renderer\'s sanitizeSvg is there to compare with');
  const theirs=await p.evaluate(({cases,SAME})=>{const S=eval(SAME);return cases.map(c=>{let n;try{n=sanitizeSvg(c.svg);}catch(e){return {err:String(e)};}return {canon:S.fromNodes(n),canonN:S.fromNodes(n,true)};});},{cases,SAME});
  const mine=cases.map(c=>{try{return figureOf(c.svg);}catch(e){return {ok:false,why:'threw '+e.message};}});
  const written=mine.map((m,i)=>m.ok?i:-1).filter(i=>i>=0);
  const mineCanon=await p.evaluate(({htmls,SAME})=>{const S=eval(SAME);return htmls.map(h=>S.fromHtml(h));},{htmls:written.map(i=>mine[i].html),SAME});
  const differ=[];written.forEach((i,k)=>{if(mineCanon[k]!==theirs[i].canon) differ.push({why:cases[i].why,mine:mineCanon[k].slice(0,160),theirs:theirs[i].canon.slice(0,160)});});
  ok(differ.length===0,'every figure the compiler writes is what the renderer\'s sanitizeSvg keeps, unchanged ('+written.length+' of '+cases.length+' written, '+(cases.length-written.length)+' refused)'
    +(differ.length?' DIFFERENT: '+differ.slice(0,4).map(d=>d.why+' | mine '+d.mine+' | theirs '+d.theirs).join(' || '):''));
  ok(written.length>=100&&cases.length-written.length>=60,'the matrix has both: many figures written and many refused ('+written.length+' / '+(cases.length-written.length)+')');
  const refusedWithReason=mine.filter(m=>!m.ok).every(m=>typeof m.why==='string'&&m.why.length>5);
  ok(refusedWithReason,'every refused figure says why');
  /* the other way: where the renderer would have changed something, the compiler must not have written the figure */
  /* what the text itself says, read by the page as it reads any HTML (empty declarations in a style left out of both) */
  const unchanged=await p.evaluate(({cases,SAME})=>{const S=eval(SAME);return cases.map(c=>S.fromHtml(c.svg,true));},{cases,SAME});
  const lost=[];cases.forEach((c,i)=>{if(mine[i].ok&&unchanged[i]!==theirs[i].canonN) lost.push(c.why);});
  ok(lost.length===0,'where the renderer drops or rewrites something the compiler refuses the figure'+(lost.length?' (written anyway: '+lost.slice(0,5).join(', ')+')':''));
  /* a control: the comparison notices a difference (one attribute changed in what the compiler wrote) */
  const ctl=mine[0].html.replace('<rect ','<rect data-extra="1" ');
  const [c1,c2]=await p.evaluate(({a,b,SAME})=>{const S=eval(SAME);return [S.fromHtml(a),S.fromHtml(b)];},{a:mine[0].html,b:ctl,SAME});
  ok(mine[0].ok&&c1!==c2,'control: the comparison notices one attribute added');
  ok(!errs.length,'no page error in the renderer\'s page'+(errs.length?' ('+errs[0]+')':''));
  await ctx.close();}

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
  fs.writeFileSync(path.join(dir,'corpus.booklet.md'),'---\nbooklet: "0.16"\nid: test/corpus\ntitle: A corpus of diagrams\nlang: en\n---\n\n# A corpus of diagrams\n\nMade-up diagrams of the common types.\n\n'
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
    ok(drawn>=names.length-3,'most are drawn for real, by the renderer\'s own part ('+drawn+' of '+names.length+')');
    ok(kept.every(m=>m.why&&!/no browser|request/.test(m.why)),'none falls back for want of a browser or for a request the page made');
    ok(!/browser page made a request/.test(report),'the browser page made no request');
    ok(kept.every(m=>/foreignObject|HTML|XHTML/i.test(m.why)||/refuses|rules|SVG|could not/.test(m.why)),'a diagram shown as its source says why');
    /* the diagram part is not on the page, and nothing on it runs */
    const strip=h=>h.replace(/<!--[^]*?-->/g,'');
    ok(!/<script(?![^>]*type="application\/ld\+json")/i.test(strip(cpage)),'the compiled page carries no script (the mermaid part is not on it)');
    ok(!/mermaid/i.test(strip(cpage).replace(/data-lang="mermaid"/g,'')),'…and does not name the library');
    ok(!/https?:\/\/(?!www\.w3\.org\/)/i.test(strip(cpage).replace(/<script type="application\/ld\+json">[^]*?<\/script>/,'')),'…and holds no address of its own that a drawing could have added');
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
            paper:s.firstElementChild&&s.firstElementChild.localName==='rect'?getComputedStyle(s.firstElementChild).fill:null,
            low:(()=>{const rects=[];const paper=s.firstElementChild&&s.firstElementChild.localName==='rect'?getComputedStyle(s.firstElementChild).fill:null;
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
  }finally{await b.close();}
  console.log(fails.length?fails.length+' FAILED':'compile figures: all checks passed');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
