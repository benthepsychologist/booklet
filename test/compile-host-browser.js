// Browser check of the compiler's stylesheet on a hostile host (compile/booklet.css, compile 0.2.0): the page keeps the
// booklet's own look on any site. The examples and the page-shaped fixtures are compiled, and each page is opened twice
// in Chromium, at 1280 and 390 pixels wide: on a plain host page, and on the same host page (the same markup around the
// same page) that also loads a hostile stylesheet after booklet.css. The hostile stylesheet is made up, on the pattern
// of a real site's theme: rules on bare elements (footer, blockquote, aside, ol, ul, li, h1-h3, p, a, table, th, td,
// nav, code, pre, strong, details, summary, dl, dt, dd, hr, img, section, svg paths, the article itself, and a reset
// on *), a body with its own face, weight, spacing and colour, and rules of a class and an element (.wrapper ol with
// counters and a card for each item, .wrapper p, .wrapper a:visited), and rules marked !important in the shapes a real
// theme was seen to use: an inline <style> on every heading's face and weight, and #main .content rules on headings'
// and links' colours, a blockquote's line and colour, and a blockquote's and all its contents' background
// (#main .content blockquote *), with one more of two ids (#site #main .content p). A site page is the fragment in that
// host's <main id="main" class="wrapper"><div class="content">; a standalone page gets the same ids and class and the
// hostile stylesheets as a host serving it would add them. It asserts:
//   - every element inside the article has the same computed values on the hostile host as on the plain one: colours,
//     backgrounds, borders, corners, shadows, margins, padding, list style, counters, faces, sizes, weights, styles,
//     spacing, capitals, alignment, display and float, and an icon's paint; so do their ::before and ::after, and the
//     ::marker of each list item; the article's own text and paint are the same too;
//   - every element has the same box, measured from the article's corner, with every fold open;
//   - the hostile stylesheet is live: the host's own footer, its own numbered card list, its own headings and its own
//     link, outside the article, take its rules, so the page holds its look without restyling the host around it;
//   - the check can fail, and each part of the guard is needed. The stylesheet is served three ways weaker: with no
//     guard (no revert rule, no !important, no ids' weight), the hostile host changes the blockquote, the asides, the
//     lists, the headings, the paragraphs, the links and the tables; with the guard as it was before !important (one
//     id's weight, no !important), the !important rules change the headings' face and colour, the links' colour and the
//     blockquote; with !important but one id's weight, the rules of one id that tie with it (a heading's and a link's
//     colour, from a sheet loaded later) or outweigh it (#main .content blockquote *, and the two-id rule on paragraphs)
//     still reach the page.
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
  ...['compile-article','compile-kinds','compile-quiz','figures','charts','data-views','compile-pages','compile-views','compile-theme'].map(n=>({file:path.join(FIX,n+'.booklet.md')})),{file:path.join(POND,'pond.booklet.md')}];
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
svg{width:1em;height:auto}
svg:not(:root){display:none}
svg line,svg polyline{stroke:#c0392b;stroke-width:5px}
.wrapper ol{counter-reset:step;list-style:none;padding:0}
.wrapper ol>li{counter-increment:step;position:relative;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.15);
  padding:1rem 1rem 1rem 3.5rem;margin:0 0 1rem}
.wrapper ol>li::before{content:counter(step);position:absolute;left:1rem;top:1rem;width:1.8rem;height:1.8rem;border-radius:50%;
  background:#0b4f4a;color:#fff;font-weight:700;text-align:center}
.wrapper p{color:#777;font-size:1.25rem}
.wrapper a:visited{color:#8e44ad}
/* !important, with an id: the shapes a real theme was seen to use, and one more of two ids */
#main .content h1,#main .content h2,#main .content h3,#main .content h4{color:#0b4f4a!important}
#main .content a{color:#c0392b!important}
#main .content blockquote{border-left-width:10px!important;border-left-style:dotted!important;border-left-color:#c9a96e!important;color:#6b4f1d!important}
#main .content blockquote,#main .content blockquote *{background-color:#f3e9d2!important}
#site #main .content p{color:#777!important;letter-spacing:.05em!important}
`;
/* the theme's own inline <style>, as a site's typography partial writes one: every heading's face and weight, !important */
const INLINE='<style>h1,h2,h3,h4,h5,h6,.hero h1,.section-heading{font-family:Lora,Georgia,serif!important;font-weight:300!important}</style>';
fs.writeFileSync(path.join(OUT,'hostile.css'),HOSTILE);
/* a booklet of many pages has pages one folder deeper: the sheets are reached as many folders up as the page is deep */
const up=label=>'../'.repeat(label.split('/').length);
const SHEETS=label=>'<link rel="stylesheet" href="../'+up(label)+'hostile.css">'+INLINE;
/* the host around the page: its own header, a numbered card list and a link of its own in the content, and its own footer */
const hostPage=(frag,hostile,title,label)=>'<!doctype html>\n<html lang="en" id="site"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n'
  +'<title>'+title+'</title><link rel="stylesheet" href="'+up(label)+'booklet/booklet.css">'+(hostile?SHEETS(label):'')+'\n'
  +'<style>body{margin:0}header,main,footer{display:block;max-width:56rem;margin:0 auto;padding:1rem}</style></head>\n'
  +'<body><header><h1 class="host-h">A host site</h1></header>\n<main id="main" class="wrapper"><div class="content">\n'
  +'<ol class="host-steps"><li>A host\'s own step</li><li>And another</li></ol><p><a class="host-a" href="#top">A host\'s own link</a></p>\n'
  +frag+'</div></main>\n<footer class="host-foot"><p>A host site\'s own footer</p></footer></body></html>\n';
/* a standalone page as a host would serve it: the same ids and class round the article, and the hostile sheets added */
const asHosted=(whole,hostile,label)=>whole.replace(/<html lang="([^"]*)">/,'<html lang="$1" id="site">').replace(/<body class="bk-page"/,'<body id="main" class="bk-page"')
  .replace('<main class="bk-main">','<main class="bk-main content">').replace(/(<link rel="stylesheet" href="[^"]*booklet\.css">)/,'$1'+(hostile?SHEETS(label):''));
const pages=[];
for(const r of run.results) for(const rel of r.rep.pages.filter(p=>p.startsWith('standalone/')&&p.endsWith('/index.html'))){
  const name=rel.slice('standalone/'.length,-'/index.html'.length);
  const frag=fs.readFileSync(path.join(OUT,'site',name,'index.html'),'utf8').replace(/^---\n[\s\S]*?\n---\n/,'');
  for(const hostile of [false,true]) fs.writeFileSync(path.join(OUT,'site',name,hostile?'hostile.html':'plain.html'),hostPage(frag,hostile,'A host',name));
  pages.push({name,form:'site',plain:'/site/'+name+'/plain.html',hostile:'/site/'+name+'/hostile.html'});
  const whole=fs.readFileSync(path.join(OUT,'standalone',name,'index.html'),'utf8');
  for(const hostile of [false,true]) fs.writeFileSync(path.join(OUT,'standalone',name,hostile?'hostile.html':'plain.html'),asHosted(whole,hostile,name));
  pages.push({name,form:'standalone',plain:'/standalone/'+name+'/plain.html',hostile:'/standalone/'+name+'/hostile.html'});}
ok(pages.filter(p=>p.form==='standalone').every(p=>{const h=fs.readFileSync(path.join(OUT,p.hostile),'utf8');
  return h.includes('hostile.css')&&h.includes(INLINE)&&/<html [^>]*id="site"/.test(h)&&h.includes('id="main"')&&h.includes('bk-main content');}),
  'each standalone page has a hosted copy, with the ids, the class and the hostile sheets');

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
        head:(()=>{const h=document.querySelector('.host-h');return h?getComputedStyle(h).fontFamily+' '+getComputedStyle(h).fontWeight:'';})(),
        link:(()=>{const l=document.querySelector('.host-a');return l?getComputedStyle(l).color:'';})()},
      inQuote:els.map(e=>e.tagName!=='BLOCKQUOTE'&&!!e.closest('blockquote'))};},[PROPS,MARKER]);}
/* what differs between the plain and the hostile host: one entry per element and part, naming every property that differs */
const ROOTPROPS=PROPS.filter(k=>!/^margin|^display$|^float$|^position$/.test(k));
const which=(x,y,list)=>{const a=x.split(' | '),b=y.split(' | ');return list.map((k,i)=>a[i]!==b[i]?{k,from:a[i],to:b[i]}:null).filter(Boolean);};
function differences(A,B){const out=[];const put=(tag,inQuote,label,props)=>out.push({tag,inQuote,props:props.map(d=>d.k),
    text:label+' '+props.slice(0,2).map(d=>d.k+': '+d.from+' → '+d.to).join(', ')});
  if(A.root!==B.root) put('article',false,'the article',which(A.root,B.root,ROOTPROPS));
  if(A.els.length!==B.els.length){out.push({tag:'',props:[],text:'element count '+A.els.length+' → '+B.els.length});return out;}
  A.els.forEach((x,i)=>{const y=B.els[i],tag=x.k.split('.')[0];
    for(const [part,list,label] of [['s',PROPS,''],['b',PROPS,'::before'],['a',PROPS,'::after'],['m',MARKER,'::marker']])
      if(x[part]!==y[part]) put(tag,A.inQuote[i],x.k+label,which(x[part],y[part],list));
    if(x.box!==y.box) out.push({tag,inQuote:A.inQuote[i],props:['box'],text:x.k+' box '+x.box+' → '+y.box});});
  return out;}
/* booklet.css served weaker, for the controls: with no guard at all; with the guard as it was before !important (one id's
   weight, no !important); and with !important but one id's weight */
const WEIGHT='.booklet:not(#bk):not(#bk):not(#bk)';
const WEAKER={none:css=>css.replace(/[^{}]*\{all:revert(!important)?\}/g,'').replace(/!important/g,'').split(WEIGHT).join('.booklet'),
  second:css=>css.replace(/!important/g,'').split(WEIGHT).join('.booklet:not(#bk)'),
  oneid:css=>css.split(WEIGHT).join('.booklet:not(#bk)')};

(async()=>{
  const b=await chromium.launch();
  /* every file is served from a made-up host; `weaker` serves booklet.css made weaker, for a control */
  const ctxFor=async(width,weaker)=>{const ctx=await b.newContext({viewport:{width,height:900},javaScriptEnabled:false,colorScheme:'light'});
    await ctx.route('http://host.test/**',route=>{const u=decodeURIComponent(new URL(route.request().url()).pathname);const f=path.join(OUT,u);
      if(!f.startsWith(OUT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()) return route.fulfill({status:404,body:'not here'});
      let body=fs.readFileSync(f);
      if(weaker&&u.endsWith('/booklet/booklet.css')) body=WEAKER[weaker](String(body));
      const type=f.endsWith('.css')?'text/css':f.endsWith('.woff2')?'font/woff2':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.png')?'image/png':'text/html';
      return route.fulfill({status:200,contentType:type,body});});
    return ctx;};
  const tags=new Set();
  for(const width of [1280,390]){
    const ctx=await ctxFor(width,null),p=await ctx.newPage();
    for(const pg of pages){const at=pg.form+' '+pg.name+' at '+width;
      await p.goto('http://host.test'+pg.plain);const A=await measure(p);
      await p.goto('http://host.test'+pg.hostile);const B=await measure(p);
      A.tags.forEach(t=>tags.add(t));
      const d=differences(A,B);
      ok(!d.length,at+': on the hostile host every element keeps its values and its box ('+A.els.length+' elements)'+(d.length?' — '+d.length+' differ, first: '+d.slice(0,4).map(x=>x.text).join('; '):''));
      if(pg.form==='site') ok(B.host.foot==='rgb(11, 79, 74)'&&B.host.step==='counter(step)'&&/^Lora.* 300$/.test(B.host.head)&&B.host.link==='rgb(192, 57, 43)'&&A.host.foot!==B.host.foot,
        at+': the hostile rules are live around the page (the host\'s footer, its numbered cards, its headings, its link)'+' ['+B.host.foot+', '+B.host.step+', '+B.host.head.slice(0,8)+'…'+B.host.head.slice(-3)+', '+B.host.link+']');}
    await ctx.close();}
  const want=['aside','blockquote','ol','li','h1','h2','h3','p','a','table','th','td','nav','ul','code','pre','details','summary','dl','dt','dd','hr','img','section','svg','path'];
  const missing=want.filter(t=>!tags.has(t));
  ok(!missing.length,'the pages hold every element the hostile rules aim at ('+want.length+')'+(missing.length?', but not: '+missing.join(', '):''));
  ok(!tags.has('footer'),'no page holds a <footer> (a module\'s notice is a plain box), so a host\'s footer rule has nothing to reach');
  /* the controls: the same pages, with booklet.css made weaker, do change on the hostile host */
  const control=async weaker=>{const ctx=await ctxFor(1280,weaker),p=await ctx.newPage(),hit=new Set();
    for(const pg of pages){await p.goto('http://host.test'+pg.plain);const A=await measure(p);
      await p.goto('http://host.test'+pg.hostile);const B=await measure(p);
      for(const d of differences(A,B)){hit.add(d.tag);for(const k of d.props){hit.add(d.tag+':'+k);if(d.inQuote) hit.add('in a blockquote:'+k);}}}
    await ctx.close();return hit;};
  {const hit=await control('none'),want=['aside','blockquote','ol','li','h2','h3','p','a','table'];
    ok(want.every(t=>hit.has(t)),'the check can fail: with no guard, the hostile host changes '+want.filter(t=>hit.has(t)).join(', ')+(want.some(t=>!hit.has(t))?' but not '+want.filter(t=>!hit.has(t)).join(', '):''));}
  {const hit=await control('second'),want=['h2:font-family','h2:font-weight','h2:color','h3:font-family','a:color','blockquote:border-left-style','blockquote:color','blockquote:background-color','in a blockquote:background-color'];
    ok(want.every(t=>hit.has(t)),'…with the guard as it was before !important (one id, no !important), the !important rules change '+want.filter(t=>hit.has(t)).join(', ')+(want.some(t=>!hit.has(t))?' but not '+want.filter(t=>!hit.has(t)).join(', '):''));}
  {const hit=await control('oneid'),want=['h2:color','a:color','in a blockquote:background-color','p:letter-spacing'];
    ok(want.every(t=>hit.has(t)),'…with !important but one id\'s weight, the rules that tie with it (a heading\'s and a link\'s colour, from a later sheet) or outweigh it (the blockquote\'s contents, two ids on paragraphs) still reach: '
      +want.filter(t=>hit.has(t)).join(', ')+(want.some(t=>!hit.has(t))?' but not '+want.filter(t=>!hit.has(t)).join(', '):''));}
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'compile on a hostile host: all checks passed');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
