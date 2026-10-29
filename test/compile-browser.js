// Browser check of the compiler's pages (compile/, compile 0.1.0): what a reader of a compiled page gets, in Chromium with
// scripting OFF. The examples and the page-shaped fixtures are compiled with the renderer named on the command line, in both
// forms; each standalone page, and each site page set in a bare host page that loads the one stylesheet with one line, is
// opened at 1280 and 390 pixels wide, light and dark. It asserts:
//   - there is no sideways scroll at either width;
//   - every fold is closed as written and opens when its summary is pressed, showing what it holds (no script needed);
//   - the page asks for nothing but its own stylesheet and fonts, every one of which loads, and logs no error;
//   - the text is in the renderer's faces (Atkinson Hyperlegible, headings in Lexend);
//   - a standalone page follows the device's dark setting and keeps the text's contrast, and a site page stays light;
//   - the "On this page" list's links reach their headings;
//   - with scripting ON, as a visitor's browser has it: an SVG whose script hides behind a namespace prefix runs when it is
//     opened directly from a host, so the case is real, and the compiler copies no such file (a plain SVG it does copy).
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/compile-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','booklet.html'));
const OUT=path.resolve(process.argv[3]||'.','compile-pages');
const C=require('../compile/compile.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};

const ROOT=path.join(__dirname,'..'),FIX=path.join(__dirname,'fixtures');
const inputs=[...fs.readdirSync(path.join(ROOT,'examples')).filter(f=>f.endsWith('.booklet.md')).map(f=>({file:path.join(ROOT,'examples',f)})),
  ...['compile-article','compile-kinds','compile-quiz','figures','charts','data-views','compile-records','compile-pages','compile-pair','compile-pair.es','compile-views','compile-theme'].map(n=>({file:path.join(FIX,n+'.booklet.md')})),
  ...['compile-bodymap','compile-pictures','compile-diagrams'].map(n=>({file:path.join(ROOT,'test','compile-assets',n+'.booklet.md')}))];
fs.rmSync(OUT,{recursive:true,force:true});
const run=C.compile(inputs,{form:'both',renderer:HTML});
C.write(run,OUT,{force:true});
ok(run.results.every(r=>r.rep.ok),'every page compiles with '+path.basename(HTML)+' ('+run.results.length+' booklets, both forms)');
/* a bare host for each site page: the one stylesheet line, and the fragment under the front matter, in its own <main>. A booklet
   of many pages has a contents page and a page for each activity, and each is checked as the booklet's one page is. */
const pages=[];
for(const r of run.results){const name=r.rep.name;
 for(const rel of r.rep.pages.filter(p=>p.startsWith('standalone/')&&p.endsWith('/index.html'))){
  const label=rel.slice('standalone/'.length,-'/index.html'.length);
  pages.push({name:label,form:'standalone',file:path.join(OUT,rel)});
  const site=path.join(OUT,'site',label,'index.html');
  const frag=fs.readFileSync(site,'utf8').replace(/^---\n[\s\S]*?\n---\n/,'');
  const host=path.join(OUT,'site',label,'host.html');
  fs.writeFileSync(host,'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n'
    +'<title>A host</title><link rel="stylesheet" href="'+path.relative(path.dirname(host),path.join(OUT,'site','booklet','booklet.css'))+'">\n'
    +'<style>body{margin:0;font-family:Georgia,serif;background:#fff;color:#111}header,main{max-width:56rem;margin:0 auto;padding:1rem}</style></head>\n'
    +'<body><header><p>A host site\'s own header</p></header><main>\n'+frag+'</main></body></html>\n');
  pages.push({name:label,form:'site',file:host});}}
const lum=c=>{const m=/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)/.exec(c);if(!m) return null;
  const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(+m[1])+0.7152*f(+m[2])+0.0722*f(+m[3]);};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);if(x==null||y==null) return 0;return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};

/* the SVG proof. Made-up pictures: a circle, and two ways of hiding a script behind a prefix (one bound to the SVG
   namespace, one to XHTML's). Each source file is served from a made-up host, with the SVG media type a host gives it. */
async function svgProof(b){
  const dir=path.join(OUT,'svg-proof'),book=path.join(dir,'book'),out=path.join(dir,'out');fs.mkdirSync(book,{recursive:true});
  const ran='document.documentElement.setAttribute("data-ran","yes")',circle='<circle cx="4" cy="4" r="3" fill="teal"/>';
  const svgs={'prefixed.svg':['<svg xmlns="http://www.w3.org/2000/svg" xmlns:p="http://www.w3.org/2000/svg" viewBox="0 0 8 8">'+circle+'<p:script>'+ran+'</p:script></svg>',false],
    'xhtml.svg':['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8">'+circle+'<x:script xmlns:x="http://www.w3.org/1999/xhtml">'+ran+'</x:script></svg>',false],
    'plain.svg':['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8">'+circle+'</svg>',true]};
  for(const [f,[svg]] of Object.entries(svgs)) fs.writeFileSync(path.join(book,f),svg);
  fs.writeFileSync(path.join(book,'circles.booklet.md'),'---\nbooklet: "'+run.format+'"\nid: test/circles\ntitle: Circles\nlang: en\n---\n\n# Circles\n\nA made-up page of three circles.\n\n'
    +Object.keys(svgs).map(f=>'![A circle, '+f+']('+f+')').join('\n\n')+'\n');
  const C2=C.compile([{file:path.join(book,'circles.booklet.md')}],{form:'standalone',renderer:HTML});C.write(C2,out,{force:true});
  ok(C2.results[0].rep.ok,'svg proof: the page of circles compiles');
  const roots={'/src/':book,'/out/':path.join(out,'circles')+'/','/booklet/':path.join(out,'booklet')+'/'};
  const ctx=await b.newContext({javaScriptEnabled:true});
  await ctx.route('http://host.test/**',route=>{const u=new URL(route.request().url()).pathname;
    const k=Object.keys(roots).find(r=>u.startsWith(r));const f=k?path.join(roots[k],decodeURIComponent(u.slice(k.length))):null;
    if(!f||!fs.existsSync(f)||!fs.statSync(f).isFile()) return route.fulfill({status:404,body:'not here'});
    const type=f.endsWith('.svg')?'image/svg+xml':f.endsWith('.css')?'text/css':f.endsWith('.woff2')?'font/woff2':'text/html';
    return route.fulfill({status:200,contentType:type,body:fs.readFileSync(f)});});
  const p=await ctx.newPage();
  for(const [f,[,copied]] of Object.entries(svgs)){
    await p.goto('http://host.test/src/'+f);
    const ranSrc=await p.evaluate(()=>document.documentElement.getAttribute('data-ran'));
    const there=fs.existsSync(path.join(out,'circles',f));
    if(copied){ok(there&&ranSrc===null,'svg proof: the plain '+f+' runs nothing and is copied');continue;}
    ok(ranSrc==='yes','svg proof: '+f+' runs its script when opened directly, scripting on (the case is real)');
    const res=await p.goto('http://host.test/out/'+f);
    ok(!there&&res.status()===404,'svg proof: '+f+' is refused, so the host has no copy of it to serve');}
  await p.goto('http://host.test/out/index.html');
  const pg=await p.evaluate(()=>({ran:document.documentElement.getAttribute('data-ran'),imgs:[...document.querySelectorAll('article img')].map(i=>i.getAttribute('src'))}));
  ok(pg.ran===null&&JSON.stringify(pg.imgs)==='["plain.svg"]','svg proof: the compiled page, scripting on, runs nothing and shows only the plain circle as a picture ('+pg.imgs.join(', ')+')');
  await ctx.close();}

/* A reader's way through a booklet of many pages, scripting off, served as a host serves a folder (a folder address is its
   index.html): each card opens its page, a page's "Contents" link goes back, and "next" from the first page reaches every
   page in the booklet's reading order, then "back" returns the same way. Nothing 404s. */
async function journey(b){
  const mime={'.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'};
  const ctx=await b.newContext({viewport:{width:1280,height:900},javaScriptEnabled:false});
  await ctx.route('http://host.test/**',route=>{const u=decodeURIComponent(new URL(route.request().url()).pathname);
    const f=path.join(OUT,u.endsWith('/')?u+'index.html':u);
    if(!f.startsWith(OUT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()) return route.fulfill({status:404,body:'not here'});
    return route.fulfill({status:200,contentType:mime[path.extname(f)]||'text/html',body:fs.readFileSync(f)});});
  const p=await ctx.newPage(),missing=[];p.on('response',r=>{if(r.status()>=400) missing.push(r.url());});
  let books=0;
  for(const r of run.results){const name=r.rep.name,list=r.rep.pageList;if(list.length<2) continue;books++;
    const home='http://host.test/standalone/'+name+'/',folders=list.slice(1).map(x=>x.path.split('/')[1]);
    await p.goto(home);
    const hrefs=await p.$$eval('a.bk-card-title',as=>as.map(a=>a.getAttribute('href')));
    ok(JSON.stringify(hrefs.map(h=>h.replace(/\/$/,'')).sort())===JSON.stringify(folders.slice().sort()),name+': the contents page has a card for each activity page ('+hrefs.length+')');
    const lost=[];
    for(let i=0;i<hrefs.length;i++){await p.goto(home);const card=(await p.$$('a.bk-card-title'))[i],want=(await card.innerText()).trim();
      await card.click();await p.waitForLoadState();
      const h1=(await p.$eval('h1',e=>e.innerText)).trim(),at=p.url();
      if(at!==home+hrefs[i]||!h1.includes(want)) lost.push(want+' → '+at+' ('+h1+')');
      await p.click('a.bk-up');await p.waitForLoadState();if(p.url()!==home) lost.push(want+': the contents link went to '+p.url());}
    ok(!lost.length,name+': each card opens its own page, and the page links back to the contents'+(lost.length?' ('+lost.slice(0,2).join('; ')+')':''));
    await p.goto(home+folders[0]+'/');const fwd=[folders[0]];
    while(await p.$('a.bk-next')){await p.click('a.bk-next');await p.waitForLoadState();fwd.push(new URL(p.url()).pathname.split('/')[3]);if(fwd.length>folders.length+1) break;}
    const back=[fwd[fwd.length-1]];
    while(await p.$('a.bk-prev')){await p.click('a.bk-prev');await p.waitForLoadState();back.push(new URL(p.url()).pathname.split('/')[3]);if(back.length>folders.length+1) break;}
    ok(JSON.stringify(fwd)===JSON.stringify(folders)&&JSON.stringify(back)===JSON.stringify(folders.slice().reverse()),name+': "next" reads every page in order, and "back" returns ('+fwd.join(' > ')+')');}
  ok(books>=5&&!missing.length,'the journeys asked for nothing that is not there ('+books+' booklets'+(missing.length?'; missing: '+missing.slice(0,3).join(', '):'')+')');
  await ctx.close();}

/* the script lane on a many-page booklet: the activity page with a graded question is one folder deeper than a one-page booklet's, so it
   links booklet.js as ../../booklet/booklet.js; with script on, the file is fetched (200) and the part does its work on that page. */
async function scriptOnDeepPage(b){
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  const seen=[];
  await ctx.route('http://host.test/**',route=>{const u=decodeURIComponent(new URL(route.request().url()).pathname);
    const f=path.join(OUT,u.endsWith('/')?u+'index.html':u);
    if(!f.startsWith(OUT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){seen.push([u,404]);return route.fulfill({status:404,body:'not here'});}
    seen.push([u,200]);
    return route.fulfill({status:200,contentType:({'.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(f)]||'text/html',body:fs.readFileSync(f)});});
  const p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://host.test/standalone/how-tides-work/rd-check/');await p.waitForLoadState('load');
  ok(seen.some(([u,c])=>u==='/standalone/booklet/booklet.js'&&c===200)&&!seen.some(([,c])=>c===404),'a many-page booklet: the activity page with a graded question fetches ../../booklet/booklet.js (200), and nothing 404s'+(seen.filter(([,c])=>c===404).length?' ('+seen.filter(([,c])=>c===404)[0][0]+')':''));
  await p.click('li.bk-right label');
  const said=(await p.$eval('.bk-q[data-bk-graded] .bk-live',e=>e.textContent)).trim();
  ok(said==='Right.'&&!errs.length,'…and the part works there: the right option is spoken as "Right." ('+JSON.stringify(said)+(errs.length?'; '+errs[0]:'')+')');
  await p.goto('http://host.test/standalone/how-tides-work/');
  ok(!(await p.$('script[src]')),'…while the contents page, which has no question, links no script');
  await ctx.close();}

(async()=>{
  const b=await chromium.launch();
  for(const scheme of ['light','dark']) for(const width of [1280,390]){
    const ctx=await b.newContext({viewport:{width,height:900},javaScriptEnabled:false,colorScheme:scheme});
    const p=await ctx.newPage();
    const reqs=[],failed=[],errs=[];
    p.on('request',r=>reqs.push(r.url()));p.on('requestfailed',r=>failed.push(r.url()));
    p.on('console',m=>{if(m.type()==='error') errs.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
    for(const pg of pages){const at=pg.form+' '+pg.name+' at '+width+' ('+scheme+')';
      reqs.length=0;failed.length=0;errs.length=0;
      await p.goto('file://'+pg.file);
      const sw=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,w:window.innerWidth,
        wide:[...document.querySelectorAll('.booklet *')].filter(e=>{const r=e.getBoundingClientRect();if(!r.width) return false;
          let x=e.parentElement;while(x&&x!==document.body){const s=getComputedStyle(x);if(/auto|scroll|hidden/.test(s.overflowX)) return false;x=x.parentElement;}
          return r.right>window.innerWidth+1;}).slice(0,3).map(e=>e.tagName.toLowerCase()+'.'+e.className)}));
      ok(sw.sw<=sw.w&&!sw.wide.length,at+': no sideways scroll'+(sw.sw>sw.w||sw.wide.length?' (scrollWidth '+sw.sw+' > '+sw.w+'; '+sw.wide.join(', ')+')':''));
      /* a booklet with a theme block asks for its own look (compile 0.2): its base, and perhaps its face; those pages are held to that look */
      const page0=fs.readFileSync(pg.form==='site'?path.join(path.dirname(pg.file),'index.html'):pg.file,'utf8'),art0=/<article class="booklet"[^>]*>/.exec(page0)[0];
      const base=(/data-bk-base="([a-z]+)"/.exec(art0)||[])[1]||'',ownFont=/--bk-font-text:/.test(art0);
      const look=await p.evaluate(async()=>{await document.fonts.ready;
        const art=document.querySelector('article.booklet'),cs=e=>e?getComputedStyle(e):null,para=art.querySelector('p:not([class])')||art,lede=art.querySelector('.bk-lede'),muted=art.querySelector('.bk-ctitle,.bk-q-help,.bk-about dt,.bk-toc-h'),head=art.querySelector('h1,h2');
        const bg=e=>{let x=e;while(x){const c=cs(x).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;x=x.parentElement;}return 'rgb(255, 255, 255)';};
        return {text:cs(para).fontFamily,head:head?cs(head).fontFamily:'',ink:cs(para).color,paper:bg(para),lede:lede?[cs(lede).color,bg(lede)]:null,muted:muted?[cs(muted).color,bg(muted)]:null,
          atk:document.fonts.check('16px "Atkinson Hyperlegible"'),lex:document.fonts.check('600 16px Lexend'),
          details:[...document.querySelectorAll('details')].map(d=>d.open),
          toc:[...document.querySelectorAll('nav.bk-toc a')].map(a=>a.getAttribute('href')).filter(h=>!document.getElementById(h.slice(1)))};});
      if(ownFont) ok(/serif|sans-serif|monospace/.test(look.text)&&!/^"?Atkinson/.test(look.text),at+': the booklet\'s own face is used ('+look.text.slice(0,40)+')');
      else ok(/^"?Atkinson Hyperlegible/.test(look.text)&&(!look.head||/^"?Lexend/.test(look.head))&&look.atk&&(!look.head||look.lex),at+': text in Atkinson Hyperlegible, headings in Lexend'+(look.atk?'':' (Atkinson not loaded)')+' ['+look.text.slice(0,40)+' / '+look.head.slice(0,30)+']');
      const dark=lum(look.paper)<0.2;
      if(base) ok(dark===(base==='night'),at+': a booklet with a theme keeps its own base ('+base+') whatever the device says ['+look.paper+']');
      else ok(pg.form==='site'?!dark:(scheme==='dark')===dark,at+': '+(pg.form==='site'?'the article stays light on its host':'the page follows the device ('+scheme+')')+' ['+look.paper+']');
      const cr=ratio(look.ink,look.paper);
      ok(cr>=7,at+': the text keeps its contrast ('+cr.toFixed(1)+':1)');
      for(const [what,pair] of [['the lede',look.lede],['quieter text',look.muted]]) if(pair){const r=ratio(pair[0],pair[1]);ok(r>=4.5,at+': '+what+' keeps a readable contrast ('+r.toFixed(1)+':1)');}
      ok(!look.toc.length,at+': every "On this page" link reaches its heading'+(look.toc.length?' ('+look.toc.join(', ')+')':''));
      const own='file://'+OUT+'/';
      const outside=reqs.filter(u=>!u.startsWith(own)&&!u.startsWith('data:'));
      ok(!outside.length&&!failed.length&&!errs.length,at+': asks for nothing but its own files, every one loads, no error'
        +(outside.length?' (outside: '+outside.slice(0,3).join(', ')+')':'')+(failed.length?' (failed: '+failed.slice(0,3).join(', ')+')':'')+(errs.length?' ('+errs[0]+')':''));
      ok(reqs.some(u=>u.endsWith('/booklet/booklet.css'))&&(ownFont||reqs.some(u=>/\/booklet\/fonts\/.+\.woff2$/.test(u))),at+': the stylesheet'+(ownFont?'':' and its fonts')+' loaded');
      /* the folds: only at light, where every one is opened by its summary, in reading order (a fold inside a fold after it) */
      if(scheme!=='light') continue;
      const source=fs.readFileSync(pg.form==='site'?path.join(path.dirname(pg.file),'index.html'):pg.file,'utf8');
      const written=[...source.matchAll(/<details\b[^>]*>/g)].map(m=>/\sopen\b/.test(m[0]));
      ok(JSON.stringify(look.details)===JSON.stringify(written),at+': '+written.length+' folds, each closed or open as written');
      const sums=await p.$$('details > summary');let opened=0;const stuck=[];
      for(const s of sums){const was=await s.evaluate(x=>x.parentElement.open);if(was){opened++;continue;}
        try{await s.click({timeout:2000});}catch(e){stuck.push((await s.innerText()).slice(0,40)+' (could not be pressed)');continue;}
        const st=await s.evaluate(x=>{const d=x.parentElement,body=[...d.children].filter(c=>c!==x);
          return {open:d.open,shown:body.length>0&&body.every(c=>c.getBoundingClientRect().height>0&&getComputedStyle(c).visibility!=='hidden')};});
        if(st.open&&st.shown) opened++;else stuck.push((await s.innerText()).slice(0,40));}
      ok(opened===sums.length&&!stuck.length,at+': every fold opens and shows what it holds ('+opened+'/'+sums.length+')'+(stuck.length?' stuck: '+stuck.join(' | '):''));
      if(sums.length){const after=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,w:window.innerWidth}));
        ok(after.sw<=after.w,at+': no sideways scroll with every fold open');}}
    await ctx.close();}
  await journey(b);
  await scriptOnDeepPage(b);
  await svgProof(b);
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'compile pages: all checks passed');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
