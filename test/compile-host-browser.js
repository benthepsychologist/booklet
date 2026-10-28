// Browser check of the compiler's stylesheet on a hostile host (compile/booklet.css, compile 0.1.0): the page keeps the
// booklet's own look on any site. The examples and the page-shaped fixtures are compiled, and each page is opened twice
// in Chromium, at 1280 and 390 pixels wide: on a plain host page, and on the same host page (the same markup around the
// same page) that also loads a hostile stylesheet after booklet.css. The hostile stylesheet is made up, on the pattern
// of a real site's theme: rules on bare elements (footer, blockquote, aside, ol, ul, li, h1-h3, p, a, table, th, td,
// nav, code, pre, strong, details, summary, dl, dt, dd, hr, img, section, svg paths, the article itself, and a reset
// on *), a body with its own face, weight, spacing and colour, and rules of a class and an element (.wrapper ol with
// counters and a card for each item, .wrapper p, .wrapper a:visited). A site page is the fragment in that host's
// <main class="wrapper">; a standalone page gets the hostile stylesheet as a host serving it would add it. It asserts:
//   - every element inside the article has the same computed values on the hostile host as on the plain one: colours,
//     backgrounds, borders, corners, shadows, margins, padding, list style, counters, faces, sizes, weights, styles,
//     spacing, capitals, alignment, display and float, and an icon's paint; so do their ::before and ::after, and the
//     ::marker of each list item; the article's own text and paint are the same too;
//   - every element has the same box, measured from the article's corner, with every fold open;
//   - the hostile stylesheet is live: the host's own footer, its own numbered card list and its own headings, outside
//     the article, take its rules, so the page holds its look without restyling the host around it;
//   - the check can fail: with the stylesheet's guard taken out (its revert rule, and the id's weight on every rule),
//     the hostile host does change the page (the blockquote, the asides, the lists, the headings).
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/compile-host-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','booklet.html'));
const OUT=path.resolve(process.argv[3]||'.','compile-host');
const C=require('../compile/compile.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};

const ROOT=path.join(__dirname,'..'),FIX=path.join(__dirname,'fixtures');
fs.rmSync(OUT,{recursive:true,force:true});
/* a made-up page holding the prose the examples do not: an image, bold, a highlight, struck words, nested lists */
const POND=path.join(OUT,'src');fs.mkdirSync(POND,{recursive:true});
fs.writeFileSync(path.join(POND,'circle.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="teal"/></svg>');
fs.writeFileSync(path.join(POND,'pond.booklet.md'),'---\nbooklet: "'+C.compile([],{renderer:HTML}).format+'"\nid: test/pond\ntitle: A walk by the pond\nlang: en\n---\n\n'
  +'# A walk by the pond\n\nA made-up page of plain prose: **bold words**, *slanted words*, ==a highlight==, ~~struck words~~, `a bit of code` and '
  +'[a link about ponds](https://example.org/pond).[^pond]\n\n## Reeds\n\n![A small teal circle](circle.svg)\n\n> A quoted line about the reeds, with **bold** in it.\n\n'
  +'1. First, walk to the bench.\n2. Then look for the heron.\n   - a nested point\n     - a deeper point\n\n- One plain point\n- Another plain point\n\n'
  +'### Fish\n\n| Fish | Seen |\n| --- | --- |\n| Carp | 3 |\n\n> [!note]- A folded note\n> Words inside the fold.\n\n***\n\nLast words after a rule.\n\n'
  +'[^pond]: A made-up note about the pond.\n');
const inputs=[...fs.readdirSync(path.join(ROOT,'examples')).filter(f=>f.endsWith('.booklet.md')).map(f=>({file:path.join(ROOT,'examples',f)})),
  ...['compile-article','compile-kinds','figures','charts','data-views'].map(n=>({file:path.join(FIX,n+'.booklet.md')})),{file:path.join(POND,'pond.booklet.md')}];
const run=C.compile(inputs,{form:'both',renderer:HTML});
C.write(run,OUT,{force:true});
ok(run.results.every(r=>r.rep.ok),'every page compiles ('+run.results.length+' booklets, both forms)');

/* the hostile stylesheet: a made-up site theme, loaded after booklet.css so it wins every tie of weight */
const HOSTILE=`
*{margin:0;padding:0}
body{font-family:Lora,Georgia,serif;font-weight:300;letter-spacing:.02em;word-spacing:.1em;color:#333;line-height:1.9;text-align:justify;hyphens:auto}
article{background:#fffdf5;padding:2rem;border:1px solid #c9a96e;border-radius:18px;box-shadow:0 6px 20px rgba(0,0,0,.25);text-transform:lowercase}
section{border-top:4px double #c9a96e;padding:1rem 0;margin:2rem 0}
h1,h2,h3{font-family:Lora,Georgia,serif;font-weight:400;font-style:italic;color:#0b4f4a;text-transform:uppercase;letter-spacing:.12em;
  margin:3rem 0 1rem;padding-bottom:.3rem;border-bottom:2px solid #c9a96e;text-align:center}
h2::before{content:"§ ";color:#c9a96e}
p{margin:0 0 1.6rem;color:#555;font-size:1.15rem;line-height:2;text-indent:2em}
p::first-letter{font-size:2.4em;color:#c0392b}
a{color:#c0392b;text-decoration:none;border-bottom:1px dotted #c0392b;font-weight:700;padding:0 .2rem}
a::after{content:" ↗"}
strong{color:#0b4f4a;font-weight:900}
footer{background:#0b4f4a;color:#9aa;padding:2rem;font-size:.8rem;border-radius:0}
footer p{color:#9aa}
blockquote{background:#f3e9d2;border-left:8px solid #c9a96e;padding:1.5rem 2rem;margin:2rem -1rem;font-family:Lora,serif;font-size:1.3rem;
  border-radius:12px;font-style:normal;color:#0b4f4a}
blockquote::before{content:"\\201C";font-size:3rem;color:#c9a96e}
aside{background:#f3e9d2;border:1px solid #c9a96e;padding:1.5rem;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,.2);float:right;
  width:40%;margin:0 0 1rem 1rem;color:#6b4f1d;font-size:.9rem}
nav{background:#0b4f4a;padding:1rem;border-radius:0}
nav ul,nav ol{display:flex;gap:2rem;list-style:none}
nav li{display:inline-block;margin:0 1rem 0 0}
nav a{color:#fff;text-transform:uppercase;border:0}
ol{list-style:upper-roman;padding-left:3rem;color:#0b4f4a}
ul{list-style:square;padding-left:2.5rem}
li{margin:.8rem 0;padding-left:.5rem;font-size:1.1rem;line-height:1.3}
li::marker{color:#c0392b;font-weight:700;font-family:Lora,serif}
dl{border:1px solid #c9a96e;padding:1rem;background:#fffbe6}
dt{font-weight:300;text-transform:uppercase;color:#c0392b}
dd{margin-left:3rem;font-style:italic}
table{border:3px solid #0b4f4a;background:#fffbe6;width:100%;font-family:Lora,serif;border-collapse:separate;border-spacing:4px}
th,td{border:1px solid #c9a96e;padding:1rem;text-align:center;background:#f3e9d2;color:#0b4f4a;font-weight:700}
code{color:#c7254e;background:#f9f2f4;padding:.2rem .4rem;border-radius:4px;font-size:90%;font-family:Courier,monospace}
pre{border:2px solid #c9a96e;background:#222;color:#eee;padding:2rem;border-radius:0}
hr{border:0;height:6px;background:#c9a96e;margin:4rem auto;width:50%}
img{border:6px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);border-radius:50%;display:block;margin:2rem auto}
details{background:#fffbe6;border:2px solid #c9a96e;padding:1rem;border-radius:0}
summary{font-family:Lora,serif;color:#c0392b;text-transform:uppercase;list-style:square}
mark{background:#0b4f4a;color:#fff}
svg{fill:#c0392b;color:#c0392b;stroke-width:4px}
svg path,svg circle,svg rect{fill:#c0392b;stroke:#0b4f4a;stroke-width:3px}
.wrapper ol{counter-reset:step;list-style:none;padding:0}
.wrapper ol>li{counter-increment:step;position:relative;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.15);
  padding:1rem 1rem 1rem 3.5rem;margin:0 0 1rem}
.wrapper ol>li::before{content:counter(step);position:absolute;left:1rem;top:1rem;width:1.8rem;height:1.8rem;border-radius:50%;
  background:#0b4f4a;color:#fff;font-weight:700;text-align:center}
.wrapper p{color:#777;font-size:1.25rem}
.wrapper a:visited{color:#8e44ad}
`;
fs.writeFileSync(path.join(OUT,'hostile.css'),HOSTILE);
/* the host around the page: its own header, a numbered card list of its own in the wrapper, and its own footer */
const hostPage=(frag,hostile,title)=>'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n'
  +'<title>'+title+'</title><link rel="stylesheet" href="../booklet/booklet.css">'+(hostile?'<link rel="stylesheet" href="../../hostile.css">':'')+'\n'
  +'<style>body{margin:0}header,main,footer{display:block;max-width:56rem;margin:0 auto;padding:1rem}</style></head>\n'
  +'<body><header><h1 class="host-h">A host site</h1></header>\n<main class="wrapper"><ol class="host-steps"><li>A host\'s own step</li><li>And another</li></ol>\n'
  +frag+'</main>\n<footer class="host-foot"><p>A host site\'s own footer</p></footer></body></html>\n';
const pages=[];
for(const r of run.results){const name=r.rep.name;
  const frag=fs.readFileSync(path.join(OUT,'site',name,'index.html'),'utf8').replace(/^---\n[\s\S]*?\n---\n/,'');
  for(const hostile of [false,true]) fs.writeFileSync(path.join(OUT,'site',name,hostile?'hostile.html':'plain.html'),hostPage(frag,hostile,'A host'));
  pages.push({name,form:'site',plain:'/site/'+name+'/plain.html',hostile:'/site/'+name+'/hostile.html'});
  const whole=fs.readFileSync(path.join(OUT,'standalone',name,'index.html'),'utf8');
  fs.writeFileSync(path.join(OUT,'standalone',name,'hostile.html'),whole.replace(/(<link rel="stylesheet" href="[^"]*booklet\.css">)/,'$1<link rel="stylesheet" href="../../hostile.css">'));
  pages.push({name,form:'standalone',plain:'/standalone/'+name+'/index.html',hostile:'/standalone/'+name+'/hostile.html'});}
ok(pages.filter(p=>p.form==='standalone').every(p=>fs.readFileSync(path.join(OUT,p.hostile),'utf8').includes('hostile.css')),'each standalone page has a hostile copy');

/* the computed values compared: what a host's theme commonly sets */
const PROPS=['color','background-color','background-image',
  ...['top','right','bottom','left'].flatMap(s=>['border-'+s+'-width','border-'+s+'-style','border-'+s+'-color','margin-'+s,'padding-'+s]),
  'border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius','box-shadow',
  'list-style-type','list-style-position','list-style-image','counter-reset','counter-increment',
  'font-family','font-size','font-weight','font-style','line-height','letter-spacing','word-spacing','text-transform','text-align','text-indent',
  'text-decoration-line','hyphens','display','float','position','fill','stroke','stroke-width','content'];
const MARKER=['content','color','font-family','font-size','font-weight','font-style'];
async function measure(p){
  return p.evaluate(async([PROPS,MARKER])=>{await document.fonts.ready;
    document.querySelectorAll('article.booklet details').forEach(d=>{d.open=true;});
    const art=document.querySelector('article.booklet'),a=art.getBoundingClientRect();
    const pick=(s,list)=>list.map(k=>s.getPropertyValue(k)).join(' | ');
    const els=[...art.querySelectorAll('*')];
    return {tags:[...new Set(els.map(e=>e.tagName.toLowerCase()))],
      root:pick(getComputedStyle(art),PROPS.filter(k=>!/^margin|^display$|^float$|^position$/.test(k))),
      els:els.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);
        return {k:e.tagName.toLowerCase()+(e.getAttribute('class')?'.'+e.getAttribute('class').split(/\s+/).join('.'):''),
          box:e.getClientRects().length?[r.x-a.x,r.y-a.y,r.width,r.height].map(v=>Math.round(v*2)/2).join(','):'not drawn',
          s:pick(s,PROPS),b:pick(getComputedStyle(e,'::before'),PROPS),a:pick(getComputedStyle(e,'::after'),PROPS),
          m:s.display==='list-item'?pick(getComputedStyle(e,'::marker'),MARKER):''};}),
      host:{foot:getComputedStyle(document.querySelector('.host-foot')||document.body).backgroundColor,
        step:(()=>{const li=document.querySelector('.host-steps li');return li?getComputedStyle(li,'::before').content:'';})(),
        head:(()=>{const h=document.querySelector('.host-h');return h?getComputedStyle(h).fontFamily:'';})()}};},[PROPS,MARKER]);}
/* the first property that differs between two piped value lists */
const which=(x,y,list)=>{const a=x.split(' | '),b=y.split(' | ');const i=a.findIndex((v,j)=>v!==b[j]);return i<0?'':list[i]+': '+a[i]+' → '+b[i];};
function differences(A,B){const out=[];
  if(A.root!==B.root) out.push('the article: '+which(A.root,B.root,PROPS.filter(k=>!/^margin|^display$|^float$|^position$/.test(k))));
  if(A.els.length!==B.els.length){out.push('element count '+A.els.length+' → '+B.els.length);return out;}
  A.els.forEach((x,i)=>{const y=B.els[i];
    for(const [part,list,label] of [['s',PROPS,''],['b',PROPS,'::before'],['a',PROPS,'::after'],['m',MARKER,'::marker']])
      if(x[part]!==y[part]) out.push(x.k+label+' '+which(x[part],y[part],list));
    if(x.box!==y.box) out.push(x.k+' box '+x.box+' → '+y.box);});
  return out;}

(async()=>{
  const b=await chromium.launch();
  /* every file is served from a made-up host; `strip` serves booklet.css with its guard taken out, for the control */
  const ctxFor=async(width,strip)=>{const ctx=await b.newContext({viewport:{width,height:900},javaScriptEnabled:false,colorScheme:'light'});
    await ctx.route('http://host.test/**',route=>{const u=decodeURIComponent(new URL(route.request().url()).pathname);const f=path.join(OUT,u);
      if(!f.startsWith(OUT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()) return route.fulfill({status:404,body:'not here'});
      let body=fs.readFileSync(f);
      if(strip&&u.endsWith('/booklet/booklet.css')) body=String(body).replace(/[^{}]*\{all:revert\}/g,'').split('.booklet:not(#bk)').join('.booklet');
      const type=f.endsWith('.css')?'text/css':f.endsWith('.woff2')?'font/woff2':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.png')?'image/png':'text/html';
      return route.fulfill({status:200,contentType:type,body});});
    return ctx;};
  const tags=new Set();
  for(const width of [1280,390]){
    const ctx=await ctxFor(width,false),p=await ctx.newPage();
    for(const pg of pages){const at=pg.form+' '+pg.name+' at '+width;
      await p.goto('http://host.test'+pg.plain);const A=await measure(p);
      await p.goto('http://host.test'+pg.hostile);const B=await measure(p);
      A.tags.forEach(t=>tags.add(t));
      const d=differences(A,B);
      ok(!d.length,at+': on the hostile host every element keeps its values and its box ('+A.els.length+' elements)'+(d.length?' — '+d.length+' differ, first: '+d.slice(0,4).join('; '):''));
      if(pg.form==='site') ok(B.host.foot==='rgb(11, 79, 74)'&&B.host.step==='counter(step)'&&/^Lora/.test(B.host.head)&&A.host.foot!==B.host.foot,
        at+': the hostile rules are live around the page (the host\'s footer, its numbered cards, its headings)'+' ['+B.host.foot+', '+B.host.step+', '+B.host.head.slice(0,12)+']');}
    await ctx.close();}
  const want=['aside','blockquote','ol','li','h1','h2','h3','p','a','table','th','td','nav','ul','code','pre','details','summary','dl','dt','dd','hr','img','section','svg','path'];
  const missing=want.filter(t=>!tags.has(t));
  ok(!missing.length,'the pages hold every element the hostile rules aim at ('+want.length+')'+(missing.length?', but not: '+missing.join(', '):''));
  ok(!tags.has('footer'),'no page holds a <footer> (a module\'s notice is a plain box), so a host\'s footer rule has nothing to reach');
  /* the control: the same pages with the guard taken out do change on the hostile host */
  {const ctx=await ctxFor(1280,true),p=await ctx.newPage(),hit=new Set();
    for(const pg of pages.filter(x=>x.form==='site')){await p.goto('http://host.test'+pg.plain);const A=await measure(p);
      await p.goto('http://host.test'+pg.hostile);const B=await measure(p);
      for(const line of differences(A,B)){const m=/^(aside|blockquote|ol|li|h2|h3|p|a|table)\b/.exec(line);if(m) hit.add(m[1]);}}
    ok(['aside','blockquote','ol','li','h2','p','a','table'].every(t=>hit.has(t)),'the check can fail: with the guard taken out, the hostile host changes '+[...hit].sort().join(', '));
    await ctx.close();}
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'compile on a hostile host: all checks passed');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
