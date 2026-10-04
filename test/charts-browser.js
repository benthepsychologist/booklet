// Browser checks for the chart views (`as: bars`, `as: line`, format 0.6), in headless Chromium with the hosted /app/
// Content-Security-Policy applied. Not a *.test.js, so test/run.sh does not run it: it needs Playwright.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/charts-browser.js <booklet.html> <outdir>
// Checks: bars (count, lengths ordered like the values, tones, a negative value left of its zero line, a non-number
// drawing nothing), lines (points, the gap, legend, distinct dashes and markers), "Show the numbers" revealing a table with
// the same rows, an empty chart, a chart beside a table in a row, every theme, no x-label overlap, no sideways overflow at
// 1280 and 400px, zero CSP violations and page errors; screenshots.
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.',R=path.dirname(HTML);
const CSP="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  async function open(file,width){
    const ctx=await b.newContext({viewport:{width,height:1000}});const p=await ctx.newPage();
    const csp=[],errs=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',async r=>{const u=new URL(r.request().url()).pathname;
      if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
      r.fulfill({status:404,body:'nf'});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(500);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button, dialog[open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(1000);
    await p.locator('button.mode').first().click();await p.waitForTimeout(1200);
    return {p,csp,errs};}
  const over=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const fixture=path.join(R,'test/fixtures/charts.booklet.md');
  const THEMES=['paper','daylight','night','contrast'];
  {const t=await open(fixture,1280);const p=t.p;
   const bars=p.locator('.ch-barchart'),lines=p.locator('.ch-linechart');
   ok(await bars.count()===3&&await lines.count()===2,'three bar charts and two line charts drawn (the empty one shows its own line)');
   ok((await p.locator('body').innerText()).includes('No harvest recorded yet.'),'an empty chart shows its own line');
   // bars
   const b0=bars.nth(0);
   ok(await b0.locator('.ch-row').count()===6,'bars: one row per data row (6)');
   const widths=await b0.locator('rect.ch-bar').evaluateAll(r=>r.map(x=>Number(x.getAttribute('width'))));
   ok(widths.length===5,'bars: a value that is not a number draws no bar ('+widths.length+' bars for 6 rows)');
   ok(widths.every((w,i)=>i===0||w<widths[i-1]),'bars: lengths are ordered like the values ('+widths.map(w=>w.toFixed(1)).join(', ')+')');
   const vals=await b0.locator('.ch-v').allInnerTexts();
   ok(vals.join('|')==='30.25|18|12.5|7|3.75|–','bars: the value is printed at the end, in the reader\'s format ('+vals.join('|')+')');
   const fills=await b0.locator('rect.ch-bar').evaluateAll(r=>r.map(x=>getComputedStyle(x).fill));
   ok(new Set(fills).size===3&&fills[0]===fills[1]&&fills[2]===fills[3],'bars: tones colour the bars (good, good, warn, warn, bad: '+new Set(fills).size+' colours)');
   ok(await b0.locator('.ch-l').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1)&&(await b0.locator('.ch-l').nth(3).innerText()).startsWith('Apples from the old tree'),'bars: a long label wraps, whole, never cut');
   const neg=bars.nth(2);
   const geo=await neg.locator('.ch-row').evaluateAll(rs=>rs.map(r=>{const z=r.querySelector('.ch-zero'),bar=r.querySelector('rect.ch-bar'),zx=Number(z.getAttribute('x1')),x=Number(bar.getAttribute('x')),w=Number(bar.getAttribute('width'));return {zx,x,w};}));
   ok(geo[0].x+geo[0].w<=geo[0].zx+0.01&&geo[2].x>=geo[2].zx-0.01,'bars: a negative value is drawn leftwards from the zero line, a positive one rightwards');
   // lines
   const l0=lines.nth(0),l1=lines.nth(1);
   ok(await l0.locator('polyline').count()===1&&(await l0.locator('polyline').getAttribute('points')).trim().split(' ').length===12&&await l0.locator('.ch-pt').count()===12,'line: one polyline of 12 points, 12 markers');
   ok(await l0.locator('.ch-legend').count()===0,'line: no legend for one series');
   ok(await l1.locator('.ch-legend li').count()===2,'line: a legend with two entries for two series');
   const pts=await l1.locator('polyline').evaluateAll(r=>r.map(x=>({c:x.getAttribute('class'),n:x.getAttribute('points').trim().split(' ').length,d:x.getAttribute('stroke-dasharray')})));
   ok(pts.length===3&&pts[0].n===6&&pts[1].n===2&&pts[2].n===3,'line: the gap splits the second series in two segments (2 and 3 points) ('+JSON.stringify(pts.map(x=>x.n))+')');
   ok(await l1.locator('.ch-svg .ch-pt').count()===11,'line: 11 markers (the gap draws none)');
   ok(pts[0].d!==pts[1].d&&pts[0].c!==pts[1].c,'line: the two series differ in colour class and in dash pattern, not colour alone');
   const mk=await l1.locator('.ch-svg .ch-pt').evaluateAll(m=>m.map(x=>x.tagName));
   ok(new Set(mk).size>=2,'line: the two series use different marker shapes ('+[...new Set(mk)].join(',')+')');
   ok((await l1.locator('.ch-pt title').first().textContent()).includes('North butt (litres)'),'line: a marker\'s <title> names series, label and value');
   ok((await l0.locator('.ch-svg').getAttribute('role'))==='img'&&/Line chart.*12 points/.test(await l0.locator('.ch-svg').getAttribute('aria-label')),'line: role=img with a summary label');
   // numbers
   for(const [i,sel,rows] of [[0,'.ch-barchart',6],[0,'.ch-linechart',12],[1,'.ch-linechart',6]]){
     const c=p.locator(sel).nth(i),d=c.locator('details.ch-nums');
     ok(await d.locator('table tbody tr').count()===rows&&!(await d.evaluate(e=>e.open)),'numbers: '+sel+' #'+i+' offers a table of '+rows+' rows, closed');
     await d.locator('summary').click();await p.waitForTimeout(100);
     ok(await d.evaluate(e=>e.open)&&await d.locator('table tbody tr').first().isVisible(),'numbers: it opens with a click');}
   // x labels never overlap
   const overlaps=await p.evaluate(()=>{let bad=0;document.querySelectorAll('.ch-svg').forEach(s=>{const ts=[...s.querySelectorAll('text.ch-tick')].filter(x=>x.getAttribute('text-anchor')==='middle').map(x=>x.getBoundingClientRect());
     for(let i=1;i<ts.length;i++) if(ts[i].left<ts[i-1].right) bad++;});return bad;});
   ok(overlaps===0,'x labels never overlap');
   // the row
   const row=await p.evaluate(()=>{const r=document.querySelector('.pblock.row');if(!r) return null;const cs=[...r.querySelectorAll('.rowcell')].map(c=>c.getBoundingClientRect());
     return {n:cs.length,side:cs.length===2&&cs[1].left>cs[0].right-1&&Math.abs(cs[0].top-cs[1].top)<8,chart:!!r.querySelector('.ch'),table:!!r.querySelector('table')};});
   ok(row&&row.n===2&&row.chart&&row.table&&row.side,'row: a chart beside a table, side by side ('+JSON.stringify(row)+')');
   ok(await over(p)<=0,'no horizontal overflow at 1280px');
   // each theme
   const seen={};
   for(const th of THEMES){await p.selectOption('#themeSel',th);await p.waitForTimeout(250);
     seen[th]=await p.evaluate(()=>({bar:getComputedStyle(document.querySelector('rect.ch-bar')).fill,line:getComputedStyle(document.querySelector('polyline.ch-line')).stroke,
       tick:getComputedStyle(document.querySelector('text.ch-tick')).fill,bg:getComputedStyle(document.body).backgroundColor}));
     ok(await over(p)<=0,th+': no horizontal overflow');
     await p.screenshot({path:path.join(OUT,'charts-1280-'+th+'.png'),fullPage:true});}
   ok(seen.paper.bar!==seen.night.bar&&seen.paper.tick!==seen.night.tick&&Object.values(seen).every(x=>x.bar.startsWith('rgb')&&x.line.startsWith('rgb')),'charts take their colours from the theme (paper and night differ)');
   ok(t.csp.length===0,'zero CSP violations '+t.csp.join('|'));ok(t.errs.length===0,'zero page errors '+t.errs.join('|'));
   await p.selectOption('#themeSel','paper');await p.emulateMedia({media:'print'});
   ok(await p.evaluate(()=>[...document.querySelectorAll('.ch-svg')].every(s=>s.getBoundingClientRect().right<=document.documentElement.clientWidth+1)),'print: charts are not clipped');
   await p.pdf({path:path.join(OUT,'charts.pdf')}).catch(e=>console.log('pdf',e.message));}
  {const t=await open(fixture,400);const p=t.p;
   ok(await over(p)<=0,'no horizontal overflow at 400px');
   const fit=await p.evaluate(()=>[...document.querySelectorAll('.ch-plot')].map(h=>{const s=h.querySelector('svg'),vb=s.viewBox.baseVal.width,w=h.getBoundingClientRect().width;return {vb,w:Math.round(w),fit:Math.abs(vb-w)<6&&s.getBoundingClientRect().height>=190};}));
   ok(fit.length===2&&fit.every(x=>x.fit),'400px: each line chart is redrawn to its own width, with a usable height ('+JSON.stringify(fit)+')');
   const overlaps=await p.evaluate(()=>{let bad=0;document.querySelectorAll('.ch-svg').forEach(s=>{const ts=[...s.querySelectorAll('text.ch-tick')].filter(x=>x.getAttribute('text-anchor')==='middle').map(x=>x.getBoundingClientRect());
     for(let i=1;i<ts.length;i++) if(ts[i].left<ts[i-1].right) bad++;});return bad;});
   ok(overlaps===0,'400px: x labels never overlap');
   const inside=await p.evaluate(()=>[...document.querySelectorAll('.ch-svg text')].every(x=>{const r=x.getBoundingClientRect();return r.left>=0&&r.right<=window.innerWidth;}));
   ok(inside,'400px: no chart text runs off the screen');
   const stacked=await p.evaluate(()=>{const r=document.querySelector('.pblock.row');const cs=[...r.querySelectorAll('.rowcell')].map(c=>c.getBoundingClientRect());return cs[1].top>=cs[0].bottom-1;});
   ok(stacked,'400px: the row\'s cells stack, one under the other');
   ok(t.csp.length===0&&t.errs.length===0,'400px: zero CSP violations and page errors '+t.errs.join('|'));
   await p.screenshot({path:path.join(OUT,'charts-400-paper.png'),fullPage:true});}
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
