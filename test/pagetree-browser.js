// Browser check of format 0.17's page tree in a real Chromium, at 1280 and 390 px (the recording DOM of test/pagetree.test.js
// has no layout). Each fails without the line named:
//  1. a page draws its title (`h3.pg-title`) and, for a page under another, the trail of the pages above it;
//  2. the pages under a page are cards after its last part (`ol.wk-cards`), and pressing one opens that page;
//  3. the foot reads Up: <title> on a child, Next: <title> across a page, "1 of 2" on a page of two parts;
//  4. a link by a page's words (`[[#Neap tides]]`) opens that page;
//  5. no screen scrolls sideways at either width.
// Invented content. Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/pagetree-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const FILE=`---
booklet: "0.17"
title: Harbour
lang: en
---

> [!module|m] Harbour

> [!activity|notes] Harbour notes

> [!page|tides] Tides

How the water moves. See [[#Neap tides]].

> [!page|parent:tides] Spring tides

The big ones.

***

More of the big ones.

> [!page|parent:tides] Neap tides

The small ones.

> [!page|moons icon:moon] Moons

The moon pulls.

> [!activity|after] After

Next one.

> [!module|m end] End
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'pagetree.booklet.md');fs.writeFileSync(file,FILE);
  const b=await chromium.launch();
  for(const W of [1280,390]){
    const p=await (await b.newContext({viewport:{width:W,height:800}})).newPage();
    const bad=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))bad.push(m.text());});p.on('pageerror',e=>bad.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(!(await p.locator('#main button.card').count())){await p.locator('#btnHome').click();await p.waitForTimeout(500);}
    await p.locator('#main button.card').first().click();await p.waitForTimeout(700);
    /* the module's list: open the first activity */
    if(!(await p.locator('#main .pg-title').count())) {await p.locator('#main button.card').first().click();await p.waitForTimeout(600);}
    const state=()=>p.evaluate(()=>({title:[...document.querySelectorAll('#main .pg-title')].map(n=>n.textContent.trim()).join('|'),
      crumbs:[...document.querySelectorAll('#main .wk-crumbs')].map(n=>n.textContent.replace(/\s+/g,' ').trim()).join('|'),
      cards:[...document.querySelectorAll('#main .wk-cards .k')].map(n=>n.textContent.trim()).join('|'),
      foot:[...document.querySelectorAll('#main .cd-foot > *')].map(n=>n.textContent.replace(/\s+/g,' ').trim()).join(' | '),
      wide:document.documentElement.scrollWidth>document.documentElement.clientWidth+1}));
    let s=await state();
    ok(s.title==='Tides'&&s.cards==='Spring tides|Neap tides'&&s.crumbs==='',W+': the first page draws its title and the pages under it as cards '+JSON.stringify(s));
    ok(!s.wide,W+': the first page does not scroll sideways');
    /* 2: a card opens its page; 1: the trail */
    await p.locator('#main .wk-cards button').first().click();await p.waitForTimeout(300);s=await state();
    ok(s.title==='Spring tides'&&/Tides/.test(s.crumbs)&&/^Up: Tides \| 1 of 2 \| Next/.test(s.foot),W+': a card opens the page; its title, its trail and Up/counter/Next '+JSON.stringify(s));
    ok(!s.wide,W+': the child page does not scroll sideways');
    await p.locator('#main .cd-foot .pg-next').click();await p.waitForTimeout(300);s=await state();
    ok(s.title==='Spring tides'&&/^Back \| 2 of 2 \| Next: Neap tides/.test(s.foot),W+': Next on the first part is the second part, which names the page to come '+JSON.stringify(s));
    await p.locator('#main .cd-foot .pg-next').click();await p.waitForTimeout(300);s=await state();
    ok(s.title==='Neap tides'&&/^Up: Tides/.test(s.foot)&&/Next: Moons/.test(s.foot),W+': Next from the last part is the next page in reading order '+JSON.stringify(s));
    await p.locator('#main .cd-foot .pg-next').click();await p.waitForTimeout(300);s=await state();
    ok(s.title==='Moons'&&/Next: 2\. After/.test(s.foot),W+': the last page: Next is the next activity '+JSON.stringify(s));
    ok(!s.wide,W+': the last page does not scroll sideways');
    /* 4: a link by a page's words */
    await p.locator('#main .cd-foot .pg-back').click();await p.waitForTimeout(300);s=await state();
    ok(s.title==='Tides'&&s.cards==='Spring tides|Neap tides',W+': Back from the last top page is the top page before it, not its last child '+JSON.stringify(s));
    await p.locator('#main a',{hasText:'Neap tides'}).first().click();await p.waitForTimeout(400);s=await state();
    ok(s.title==='Neap tides',W+': a link by the words of a page opens that page '+JSON.stringify(s));
    ok(!bad.length,W+': nothing refused by the policy, no script error '+bad.join(' / '));
  }
  await b.close();
  if(fails.length){console.log('\n'+fails.length+' FAILED');process.exit(1);}
  console.log('\npage tree browser checks passed');
})().catch(e=>{console.log('FAIL '+e.stack);process.exit(1);});
