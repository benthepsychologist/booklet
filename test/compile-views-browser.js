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
const rgb=c=>{const m=/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)/.exec(c);return m?'#'+[1,2,3].map(i=>(+m[i]).toString(16).padStart(2,'0')).join(''):c;};
(async()=>{
  const b=await chromium.launch();
  for(const width of [1280,390]){
    const ctx=await b.newContext({viewport:{width,height:900},javaScriptEnabled:false,colorScheme:'light'});
    const p=await ctx.newPage();const reqs=[],failed=[],errs=[];
    p.on('request',r=>reqs.push(r.url()));p.on('requestfailed',r=>failed.push(r.url()));
    p.on('console',m=>{if(m.type()==='error') errs.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
    for(const r of run.results){const name=r.rep.name,at=name+' at '+width;
      reqs.length=0;failed.length=0;errs.length=0;
      await p.goto('file://'+path.join(OUT,name,'index.html'));
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
      ok(m.sw<=m.w,at+': no sideways scroll ('+m.sw+' <= '+m.w+')');
      ok(!m.out.length,at+': no view or chart pokes out of the article'+(m.out.length?' ('+m.out.join(', ')+')':''));
      ok(m.blank===0,at+': every row in view has a box you can see ('+m.rows+' rows)'+(m.blank?' ('+m.blank+' empty)':''));
      ok(m.empty===0,at+': every value holds text or a picture'+(m.empty?' ('+m.empty+' empty)':''));
      ok(m.bars===0&&m.lines===0,at+': a chart\'s marks are painted ('+m.nmarks+' marks)');
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
    await ctx.close();}
  await b.close();
  console.log(fails.length?'\n'+fails.length+' FAILED':'\ncompile views pages: all checks passed');process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
