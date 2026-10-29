// Browser check of the compiler's query views and themes (compile/, views.js and theme.js), in Chromium with scripting OFF.
// test/fixtures/compile-views.booklet.md and compile-theme.booklet.md, and the charts and data-views fixtures, are compiled
// and each standalone page is opened at 1280 and 390 pixels wide. It asserts, for every page:
//   - there is no sideways scroll, and no view, chart or table pokes out of the article (a wide table scrolls inside its
//     own box);
//   - every row (data-bk-row) of every view that is in view has a box you can see, and every value (data-bk-col) holds text
//     or an icon (a table's cell for a value a row does not have is empty, and is there, so its columns line up);
//   - every chart has the table of its numbers after it: closed, and opened by pressing its summary with no script, then
//     showing the same numbers; a chart's marks have a paint of their own (a bar is not transparent, a line has a width);
//   - a nested list's branch opens by pressing it with no script and shows the rows under it;
//   - a page whose booklet names dark colours (night, white ink on near-black paper) shows them on screen and prints light:
//     dark ink, white paper, whatever a host's own --bk-* rule says (print emulation);
//   - the page asks for nothing but its own files, every one of which loads, and logs no error;
// and for the themed page: the article's paper and ink are the booklet's own (the page's body too), the colour that was too
// faint is not the accent, and a hostile value changed nothing: no element is hidden that the plain page shows.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/compile-views-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','booklet.html'));
const OUT=path.resolve(process.argv[3]||'.','compile-views-pages');
const C=require('../compile/compile.js');
const FIX=path.join(__dirname,'fixtures');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
fs.rmSync(OUT,{recursive:true,force:true});
const names=['compile-views','compile-theme','charts','data-views'];
const run=C.compile(names.map(n=>({file:path.join(FIX,n+'.booklet.md')})),{form:'standalone',renderer:HTML});
C.write(run,OUT,{force:true});
ok(run.results.every(r=>r.rep.ok),'every page compiles ('+run.results.length+' booklets)');
const PAGES=run.results.flatMap(r=>r.rep.pages.filter(f=>f.endsWith('index.html')).map(f=>({book:r.rep.name,file:f,at:f.replace(/\/index\.html$/,'')}))),rowsSeen={};
ok(PAGES.filter(x=>x.book==='compile-views').length===4,'the views booklet is a contents page and three activity pages ('+PAGES.filter(x=>x.book==='compile-views').length+')');
/* a booklet with a dark theme of its own, for the print check */
const DARK='---\nbooklet: "'+run.format+'"\nid: test/dark\ntitle: A dark page\nlang: en\n---\n\n# A dark page\n\nA made-up paragraph on near-black paper.\n\n```booklet theme\nbase: night\npaper: "#0a0a0a"\nink: "#ffffff"\naccent: "#7cf0ff"\n```\n\n> [!note] A note\n> Words in a note.\n';
fs.mkdirSync(OUT+'-dark',{recursive:true});
const drun=C.compile([{text:DARK,name:'dark',dir:OUT+'-dark'}],{form:'standalone',renderer:HTML});C.write(drun,OUT+'-dark',{force:true});
fs.writeFileSync(path.join(OUT+'-dark','dark','host.html'),fs.readFileSync(path.join(OUT+'-dark','dark','index.html'),'utf8').replace('</head>','<style>.booklet,.bk-page{--bk-ink:#ff00ff;--bk-paper:#222222} body{--bk-ink:#ff00ff}</style></head>'));
ok(drun.results[0].rep.ok&&/--bk-ink:#ffffff/.test(fs.readFileSync(path.join(OUT+'-dark','dark','index.html'),'utf8')),'the dark-theme page compiles, with its white ink');
const rgb=c=>{const m=/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)/.exec(c);return m?'#'+[1,2,3].map(i=>(+m[i]).toString(16).padStart(2,'0')).join(''):c;};
/* a line chart is drawn 460 wide and shown no smaller than 420: its type stays at 11px or more, and a box narrower than that
   scrolls the plot inside itself (the page does not scroll sideways) */
async function lineLegible(p,at){
  const m=await p.evaluate(()=>{const svgs=[...document.querySelectorAll('.bk-ch-svg')];
    return {n:svgs.length,sw:document.documentElement.scrollWidth,w:window.innerWidth,
      tick:Math.min(...svgs.map(s=>{const t=s.querySelector('.bk-ch-tick');return parseFloat(getComputedStyle(t).fontSize)*(s.getBoundingClientRect().width/460);})),
      scrolls:svgs.every(s=>{const pl=s.parentElement,r=pl.getBoundingClientRect();return s.getBoundingClientRect().width<=Math.max(r.width,420)+1&&(r.width>=420||pl.scrollWidth>pl.clientWidth);}),
      inside:svgs.every(s=>s.parentElement.getBoundingClientRect().right<=document.querySelector('article.booklet').getBoundingClientRect().right+1)};});
  if(!m.n) return;
  ok(m.tick>=10.8&&m.sw<=m.w&&m.scrolls&&m.inside,at+': a line chart keeps its type legible ('+m.tick.toFixed(1)+'px at the least), scrolls inside its own box and not the page ('+m.n+' charts)');}
(async()=>{
  const b=await chromium.launch();
  for(const width of [1280,390]){
    const ctx=await b.newContext({viewport:{width,height:900},javaScriptEnabled:false,colorScheme:'light'});
    const p=await ctx.newPage();const reqs=[],failed=[],errs=[];
    p.on('request',r=>reqs.push(r.url()));p.on('requestfailed',r=>failed.push(r.url()));
    p.on('console',m=>{if(m.type()==='error') errs.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
    /* a booklet of several activities is a contents page and a page for each: every one of them is looked at, at its own depth */
    for(const pgx of PAGES){const name=pgx.book,at=pgx.at+' at '+width;
      reqs.length=0;failed.length=0;errs.length=0;
      await p.goto('file://'+path.join(OUT,pgx.file));
      const m=await p.evaluate(()=>{
        const art=document.querySelector('article.booklet'),a=art.getBoundingClientRect();
        const out=[...art.querySelectorAll('.bk-view,.bk-view *')].filter(e=>{const r=e.getBoundingClientRect();if(!r.width) return false;
          let x=e.parentElement;while(x&&x!==document.body){const s=getComputedStyle(x);if(/auto|scroll|hidden/.test(s.overflowX)) return false;x=x.parentElement;}
          return r.right>a.right+1||r.left<a.left-1;}).slice(0,3).map(e=>e.tagName.toLowerCase()+'.'+String(e.className.baseVal!==undefined?e.className.baseVal:e.className));
        const rows=[...art.querySelectorAll('[data-bk-row]')].filter(e=>!e.closest('details:not([open])')||e.tagName==='SUMMARY');
        const blank=rows.filter(e=>{const r=e.getBoundingClientRect();return !(r.width>0&&r.height>0);}).length;
        const empty=[...art.querySelectorAll('[data-bk-col]')].filter(e=>e.tagName!=='TH'&&e.tagName!=='TD'&&!e.closest('details:not([open])')&&!(e.textContent.trim()||e.querySelector('svg,img'))).length;
        const marks=[...art.querySelectorAll('.bk-ch-bar,.bk-ch-line')].map(e=>{const s=getComputedStyle(e);return {fill:s.fill,stroke:s.stroke,sw:s.strokeWidth,cls:String(e.getAttribute('class'))};});
        return {sw:document.documentElement.scrollWidth,w:window.innerWidth,out,rows:rows.length,blank,empty,
          bars:marks.filter(x=>/bk-ch-bar/.test(x.cls)).filter(x=>x.fill==='none'||/rgba\(0, 0, 0, 0\)/.test(x.fill)).length,
          lines:marks.filter(x=>/bk-ch-line/.test(x.cls)).filter(x=>x.stroke==='none'||!(parseFloat(x.sw)>0)).length,nmarks:marks.length};});
      if(width===1280) rowsSeen[name]=(rowsSeen[name]||0)+m.rows;
      ok(m.sw<=m.w,at+': no sideways scroll ('+m.sw+' <= '+m.w+')');
      ok(!m.out.length,at+': no view or chart pokes out of the article'+(m.out.length?' ('+m.out.join(', ')+')':''));
      ok(m.blank===0,at+': every row in view has a box you can see ('+m.rows+' rows)'+(m.blank?' ('+m.blank+' empty)':''));
      ok(m.empty===0,at+': every value holds text or a picture'+(m.empty?' ('+m.empty+' empty)':''));
      ok(m.bars===0&&m.lines===0,at+': a chart\'s marks are painted ('+m.nmarks+' marks)');
      await lineLegible(p,at);
      /* every chart's numbers: closed, then opened by its summary */
      const charts=await p.$$('.bk-view[data-bk-view="bars"],.bk-view[data-bk-view="line"]');
      let good=0;const bad=[];
      for(const c of charts){
        const d=await c.$('details.bk-ch-nums');if(!d){bad.push('no numbers');continue;}
        const closed=await d.evaluate(x=>!x.open&&!x.querySelector('table').checkVisibility());
        await (await d.$('summary')).click({timeout:2000});
        const shown=await d.evaluate(x=>{const t=x.querySelector('table'),r=t.getBoundingClientRect(),a=document.querySelector('article.booklet').getBoundingClientRect();
          let wrapW=x.querySelector('.bk-table');wrapW=wrapW?wrapW.getBoundingClientRect().right:r.right;
          return {open:x.open,h:r.height,cells:t.querySelectorAll('td').length,inside:wrapW<=a.right+1};});
        if(closed&&shown.open&&shown.h>0&&shown.cells>0&&shown.inside) good++;else bad.push(JSON.stringify({closed,...shown}));}
      ok(good===charts.length&&!bad.length,at+': every chart has its numbers, closed, and opened by pressing ('+good+'/'+charts.length+')'+(bad.length?' '+bad.join(' '):''));
      /* a nested list: each branch opens by pressing and shows its rows */
      const branches=await p.$$('.bk-dv-tree details > summary');
      if(branches.length){let shown=0;
        for(const s of branches){if(await s.evaluate(x=>x.parentElement.open)){shown++;continue;}
          await s.click({timeout:2000});
          if(await s.evaluate(x=>{const ul=x.parentElement.querySelector('ul');return x.parentElement.open&&ul.getBoundingClientRect().height>0;})) shown++;}
        ok(shown===branches.length,at+': each branch of a nested list opens by pressing and shows its rows ('+shown+'/'+branches.length+')');}
      const own='file://'+OUT+'/',outside=reqs.filter(u=>!u.startsWith(own)&&!u.startsWith('data:'));
      ok(!outside.length&&!failed.length&&!errs.length,at+': asks for nothing but its own files, every one loads, no error'+(outside.length?' (outside: '+outside[0]+')':'')+(errs.length?' ('+errs[0]+')':''));
      if(name==='compile-theme'){
        const t=await p.evaluate(()=>{const art=document.querySelector('article.booklet'),pa=art.querySelector('p:not([class])'),cs=e=>getComputedStyle(e);
          const tile=art.querySelector('.bk-dv-tile.bk-tone-good');
          return {body:cs(document.body).backgroundColor,art:cs(art).backgroundColor,ink:cs(pa).color,accent:cs(art).getPropertyValue('--bk-accent').trim(),
            hidden:[...art.querySelectorAll('*')].filter(e=>cs(e).display==='none'&&!e.closest('details')&&e.tagName!=='STYLE').length,tile:tile?cs(tile).color:'',
            tiles:art.querySelectorAll('.bk-dv-tile').length};});
        ok(rgb(t.body)==='#fffbe8','compile-theme at '+width+': the page\'s own paper is the booklet\'s ('+rgb(t.body)+')');
        ok(rgb(t.ink)==='#2a2118','compile-theme at '+width+': the text is the booklet\'s ink ('+rgb(t.ink)+')');
        ok(t.accent!=='#f0e8c8'&&/^#[0-9a-f]{6}$/.test(t.accent),'compile-theme at '+width+': the colour that was too faint is not the accent ('+t.accent+')');
        ok(t.hidden===0&&t.tiles===2,'compile-theme at '+width+': a hostile value hid nothing ('+t.hidden+' hidden, '+t.tiles+' tiles)');}}
    /* print is light, a dark theme and a host's own --bk-* rule notwithstanding */
    {const q=await ctx.newPage();await q.goto('file://'+path.join(OUT+'-dark','dark','index.html'));
      const look=()=>q.evaluate(()=>{const art=document.querySelector('article.booklet'),pa=art.querySelector('p:not([class])'),cs=getComputedStyle;
        return {ink:cs(pa).color,paper:cs(art).getPropertyValue('--bk-paper').trim().toLowerCase(),inkVar:cs(art).getPropertyValue('--bk-ink').trim().toLowerCase(),
          bodyPaper:cs(document.body).getPropertyValue('--bk-paper').trim().toLowerCase(),box:cs(art.querySelector('.bk-callout')).backgroundColor};});
      const screen=await look();
      ok(rgb(screen.ink)==='#ffffff'&&screen.paper==='#0a0a0a','dark theme at '+width+': on screen the booklet\'s white ink on near-black paper ('+rgb(screen.ink)+' on '+screen.paper+')');
      await q.emulateMedia({media:'print'});
      const pr=await look();
      ok(rgb(pr.ink)==='#1f2328'&&pr.paper==='#ffffff'&&pr.bodyPaper==='#ffffff','dark theme at '+width+': printed, dark ink on white paper ('+rgb(pr.ink)+' on '+pr.paper+', body '+pr.bodyPaper+')');
      /* the same page under a host's own --bk-* rule (the style is written into a copy: scripting is off in this browser) */
      await q.goto('file://'+path.join(OUT+'-dark','dark','host.html'));await q.emulateMedia({media:'print'});
      const host=await look();
      ok(rgb(host.ink)==='#1f2328'&&host.paper==='#ffffff','dark theme at '+width+': printed, a host\'s own --bk-* rule does not bring the dark back ('+rgb(host.ink)+')');
      await q.close();}
    await ctx.close();}
  {const ctx=await b.newContext({viewport:{width:320,height:800},javaScriptEnabled:false}),p=await ctx.newPage();
    for(const x of PAGES.filter(x=>['compile-views','charts'].includes(x.book))){await p.goto('file://'+path.join(OUT,x.file));await lineLegible(p,x.at+' at 320');}
    await ctx.close();}
  await b.close();
  ok((rowsSeen['compile-views']||0)>=60,'the views on the deep pages were looked at: '+(rowsSeen['compile-views']||0)+' rows in the views booklet');
  console.log(fails.length?'\n'+fails.length+' FAILED':'\ncompile views pages: all checks passed');process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
