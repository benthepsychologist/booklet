// Browser checks for data blocks and query views, in headless Chromium with the hosted /app/ Content-Security-Policy applied
// (served from a fake origin through page.route). Not a *.test.js, so test/run.sh does not run it: it needs Playwright.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/dataviews-browser.js <booklet.html> <outdir>
// Checks: tiles, a grouped list with counts, a table with its columns and rows, sort by a column (and back), limit, the
// empty state, no horizontal page scroll at phone width, zero CSP violations, zero page errors; screenshots at 1100px and 400px.
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.',R=path.dirname(HTML);
const CSP=require('./csp.js');
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
    await p.locator('button.mode').first().click();await p.waitForTimeout(1000);
    return {p,csp,errs};}
  const fixture=path.join(R,'test/fixtures/data-views.booklet.md');
  {const t=await open(fixture,1100);const p=t.p;
   const n=sel=>p.locator(sel).count();
   ok(await n('.dv-tile')===4,'tiles: four, one per row');
   ok(await p.locator('.dv-tile.tone-good').count()===1&&await p.locator('.dv-tile.tone-warn').count()===1&&await p.locator('.dv-tile.tone-bad').count()===1,'tiles: tone colours good, warn and bad');
   const heads=await p.locator('.dv-group').allInnerTexts();
   ok(heads.length===3&&/This week\s*3 rows/.test(heads[0])&&/Next week\s*2 rows/.test(heads[1])&&/Winter\s*1 row/.test(heads[2]),'list: groups with counts, first-seen order ('+heads.join(' | ').replace(/\n/g,' ')+')');
   ok(await n('.dv-list li')===6,'list: limit 6 draws six of seven rows');
   ok(await n('table.dv-table thead th')===4&&await n('table.dv-table tbody tr')===4,'table: four columns, four rows');
   const col=async i=>p.locator('table.dv-table tbody tr td:nth-child('+(i+1)+')').allInnerTexts();
   ok((await col(0)).join()==='Beans,Courgette,Apples,Tomatoes','table: rows in the generator\'s order');
   const th=p.locator('table.dv-table thead th').nth(1);
   await th.locator('button').click();
   ok((await col(1)).join()==='4.5,8,12,30.25'&&await th.getAttribute('aria-sort')==='ascending','sort: a number column sorts numerically, ascending ('+(await col(1)).join()+')');
   await th.locator('button').click();
   ok((await col(1)).join()==='30.25,12,8,4.5'&&await th.getAttribute('aria-sort')==='descending','sort: a second click reverses it');
   await p.locator('table.dv-table thead th').nth(0).locator('button').click();
   ok((await col(0)).join()==='Apples,Beans,Courgette,Tomatoes'&&await th.getAttribute('aria-sort')==='none','sort: another column replaces it, text sorts alphabetically');
   await p.locator('table.dv-table thead th').nth(0).locator('button').click();await p.locator('table.dv-table thead th').nth(0).locator('button').click();
   ok((await col(0)).join()==='Beans,Courgette,Apples,Tomatoes','sort: a third click returns to the generator\'s order');
   ok((await p.locator('body').innerText()).includes('Nothing needs you.'),'empty: the block\'s own line shows');
   ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'no horizontal page scroll at 1100px');
   ok(t.csp.length===0,'zero CSP violations '+t.csp.join('|'));ok(t.errs.length===0,'zero page errors '+t.errs.join('|'));
   await p.screenshot({path:path.join(OUT,'data-views-1100.png'),fullPage:true});
   await p.emulateMedia({media:'print'});await p.pdf({path:path.join(OUT,'data-views.pdf')}).catch(e=>console.log('pdf',e.message));}
  {const t=await open(fixture,400);const p=t.p;
   ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'no horizontal page scroll at 400px');
   ok(await p.locator('.dv-tile').count()===4,'400px: tiles still there');
   const w=await p.evaluate(()=>{const t=document.querySelector('.dv-wrap');return {sw:t.scrollWidth,cw:t.clientWidth};});
   ok(w.sw>=w.cw,'400px: the table scrolls inside its own wrapper if it is wide ('+JSON.stringify(w)+')');
   ok(t.csp.length===0&&t.errs.length===0,'400px: zero CSP violations and page errors');
   await p.screenshot({path:path.join(OUT,'data-views-400.png'),fullPage:true});}
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
