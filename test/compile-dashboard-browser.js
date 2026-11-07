// Browser check of a compiled dashboard page (compile 0.4.0; format 0.19): rows that open, from a data file, in a real Chromium.
// The made-up booklet test/compile-assets/compile-dashboard.booklet.md is compiled with its JSON file and opened from a folder on
// disk. It asserts:
//   - with scripting off, a row opens when its summary is pressed and shows its rest and its children (a native disclosure); a
//     plain row has no disclosure; the nested table's headings and rows share one grid, so a column's cells line up at every depth
//   - with the reading script on: the sort-and-filter control sorts the rows that share a parent among themselves and leaves the
//     tree as it is, and a filter keeps a match with the rows above it, opens them and hides the rest; Clear puts it back
//   - the page is no wider than a phone (360 px), at the table, the cards and the list
//   - nothing stored, no request but the page's own files, no error
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright test/compile-dashboard-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','booklet.html'));
const OUT=path.resolve(process.argv[3]||'.','compile-dashboard-pages');
const C=require('../compile/compile.js');
const K=require('./compile-browser-kit.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};

fs.rmSync(OUT,{recursive:true,force:true});
const run=C.compile([{file:path.join(__dirname,'compile-assets','compile-dashboard.booklet.md')}],{form:'standalone',renderer:HTML,browser:false});
C.write(run,OUT,{force:true});
const {BASE,serve}=K.server(OUT);
const URL_=BASE+'compile-dashboard/index.html';
const view=(p,n)=>p.locator('[data-bk-view]').nth(n);
/* the text of the first cell of each row of the first view that is a direct child of one list, in order */
const titles=(p,sel)=>p.$$eval(sel,els=>els.map(e=>e.textContent.replace(/\s+/g,' ').trim().split(' ')[0]));

(async()=>{
  const b=await chromium.launch();
  {
    const ctx=await b.newContext({viewport:{width:1000,height:900},javaScriptEnabled:false});
    await serve(ctx);
    const p=await ctx.newPage();
    await p.goto(URL_);await p.evaluate?0:0;
    const table=view(p,0);
    const first=table.locator('details').first();
    ok(!(await first.evaluate(d=>d.open)),'(no script) a row starts shut');
    ok(!(await table.getByText('Prune the apple trees').first().isVisible()),'(no script) a shut row hides its children');
    await first.locator('summary').first().click();
    ok(await first.evaluate(d=>d.open),'(no script) pressing the summary opens the row');
    ok(await table.getByText('Prune the apple trees').first().isVisible(),'(no script) its children are shown');
    ok(await table.getByText('The pears were planted last spring').first().isVisible(),'(no script) its text is shown');
    await table.locator('details details').first().locator('summary').first().click();
    ok(await table.getByText('Borrow the tall ladder').first().isVisible(),'(no script) a row inside it opens too');
    /* columns line up: the "Stage" heading and the Stage cell of a top row and of a row two levels down share one left edge */
    const xs=await table.evaluate(t=>{const h=[...t.querySelectorAll('.bk-dv-thead .bk-dv-c')][2].getBoundingClientRect().left;
      const cells=[...t.querySelectorAll('[data-bk-col=stage]')].map(c=>c.getBoundingClientRect().left);return {h,cells};});
    ok(xs.cells.length>=3&&xs.cells.every(x=>Math.abs(x-xs.h)<2.5),'the Stage column lines up with its heading at every depth (to within 2.5 px) '+JSON.stringify(xs));
    const plain=await table.locator('li.bk-dv-row').first();
    ok(await plain.count()===1&&(await plain.locator('summary').count())===0,'a row with nothing more to show has no disclosure');
    await ctx.close();
  }
  {
    const ctx=await b.newContext({viewport:{width:1000,height:900}});
    const reqs=[],errs=[];await serve(ctx);
    const p=await ctx.newPage();p.on('request',r=>reqs.push(r.url()));p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error') errs.push(m.text());});
    await p.goto(URL_);await p.evaluate(()=>document.fonts.ready);
    const table=view(p,0);
    const topTitles=()=>table.evaluate(t=>[...t.querySelector('ul.bk-dv-tree').children].map(li=>li.querySelector('[data-bk-col=title]').textContent.trim()));
    ok((await topTitles()).join('|')==='Orchard|Vegetable beds|Tool shed','the top rows are in file order: '+(await topTitles()).join('|'));
    const ctl=p.locator('.bk-vctl').first();
    await ctl.locator('.bk-vbtn').click();
    await ctl.locator('.bk-vsel').selectOption({label:'title'});
    ok((await topTitles()).join('|')==='Orchard|Tool shed|Vegetable beds','sorted by name, the top rows are in order: '+(await topTitles()).join('|'));
    await ctl.locator('.bk-vdir').click();
    ok((await topTitles()).join('|')==='Vegetable beds|Tool shed|Orchard','…and the other way');
    const kidsOfOrchard=()=>table.evaluate(t=>[...t.querySelectorAll('ul.bk-dv-tree>li')].find(li=>li.textContent.includes('Orchard')).querySelector(':scope > details > .bk-dv-open > .bk-dv-kg > ul').children.length);
    ok(await kidsOfOrchard()===3,'sorting keeps each row under its own parent');
    await ctl.locator('.bk-vclear').click();
    await ctl.locator('.bk-vq').fill('ladder');
    const shown=()=>table.evaluate(t=>[...t.querySelectorAll('[data-bk-row]')].filter(r=>{let n=r;while(n&&n!==t){if(n.hidden||n.hasAttribute('data-bk-off')) return false;n=n.parentElement;}return true;}).map(r=>r.querySelector('[data-bk-col=title]').textContent.trim()));
    const s=await shown();
    ok(s.join('|')==='Orchard|Prune the apple trees|Borrow the tall ladder','a filter keeps the match with the rows above it and hides the rest: '+s.join('|'));
    ok(await table.getByText('Borrow the tall ladder').first().isVisible(),'…and opens them, so the match can be seen');
    await ctl.locator('.bk-vclear').click();
    ok((await shown()).length===10,'Clear shows every row again ('+(await shown()).length+')');
    ok(!(await table.getByText('Borrow the tall ladder').first().isVisible()),'…and the rows the filter opened are shut again');
    ok(JSON.stringify(await K.storage(p))===JSON.stringify({local:0,session:0,cookie:'',idb:0}),'nothing is stored');
    ok(reqs.every(u=>u.startsWith(BASE)),'no request leaves the page\'s own files');
    ok(!errs.length,'no error: '+errs.join('; '));
    await ctx.close();
  }
  {
    const ctx=await b.newContext({viewport:{width:360,height:800}});
    await serve(ctx);
    const p=await ctx.newPage();
    await p.goto(URL_);await p.evaluate(()=>document.fonts.ready);
    await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>{d.open=true;}));
    ok(await p.evaluate(()=>document.documentElement.scrollWidth<=360),'at 360 px wide, with every row open, the page does not scroll sideways ('+await p.evaluate(()=>document.documentElement.scrollWidth)+')');
    await p.screenshot({path:path.join(OUT,'phone.png'),fullPage:true});
    await ctx.close();
  }
  await b.close();
  if(fails.length){console.log('\n'+fails.length+' FAILURES');process.exit(1);}
  console.log('compile dashboard browser passed');
})().catch(e=>{console.error(e);process.exit(1);});
