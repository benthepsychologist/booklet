// Browser check of per-page folding and the width of a folded section (0.11.7). One activity: two prose pages (they fold),
// then a page with a question (it does not). The controls and the "Opened N of M" line are on the folding pages only; what
// was opened survives a redraw and a page change. A folded section holding a table wider than the column is as wide as its
// siblings, open and folded, and the table scrolls inside it; at 400px the page itself never scrolls sideways. The module's
// screen shows the activity's first paragraph on its card, and a footnote with no quote is a plain reference in the panel.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/pagefold-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const WIDE='| Option | No-show rate | Reminder cost per month | No-show cost per month | Total per month | Saving against SMS only | Risk to watch | Who would run it |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| SMS only | 11% | $72 | $17,820 | $17,892 | none | cost of messages | front desk |\n| Email only | 14% | $0 | $22,680 | $22,680 | none, costs more | spam folders | front desk |\n| SMS plus email | 8% | $72 | $12,960 | $13,032 | about $4,860 | two systems | front desk |\n';
const FILE=`---
booklet: "0.11"
title: Report
lang: en
---

> [!module|rep] Report

A module with two activities.

> [!activity|read] Read the report

This is the first paragraph of the activity, with **bold** and snake_case.

## The answer

Keep SMS and add email.[^trial] It costs the least.

## Background

The clinic books many appointments.

## Comparing the options

The figures side by side.

${WIDE}
Closing words.

---

## The formula

Cost is appointments times rate.

## What to be careful about

One trial only.

[^trial]: Northfield Health reminder trial, internal report, 2024.

---

# Give your view

> [!text|view] What would change your mind?

> [!activity|other] Another one

> [!text|o1] Anything?

> [!module|rep end] End
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'pagefold.booklet.md');fs.writeFileSync(file,FILE);
  const b=await chromium.launch();
  for(const W of [1280,400]){
    const p=await (await b.newContext({viewport:{width:W,height:900}})).newPage();
    const cons=[],errs=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(await p.evaluate(()=>document.body.dataset.view)!=='home'){await p.locator('#btnHome').click();await p.waitForTimeout(500);}
    await p.locator('button.mode').first().click();await p.waitForTimeout(700);
    const cards=await p.evaluate(()=>[...document.querySelectorAll('button.mode')].map(c=>({k:c.querySelector('.k').textContent,d:c.querySelector('.d').textContent})));
    ok(cards.length===2,W+': the module screen has two activity cards');
    ok(cards[0].d==='This is the first paragraph of the activity, with bold and snake_case.',W+': the first card shows the activity\'s first paragraph: '+JSON.stringify(cards[0].d));
    ok(cards[1].d==='',W+': an activity with no paragraph shows its title alone');
    await p.screenshot({path:path.join(OUT,'cards-'+W+'.png'),fullPage:true});
    await p.locator('button.mode').first().click();await p.waitForTimeout(700);
    const pageState=()=>p.evaluate(()=>({secs:[...document.querySelectorAll('details.rm-sec')].map(d=>({open:d.open,w:Math.round(d.getBoundingClientRect().width)})),
      bars:document.querySelectorAll('.rm-bar').length,count:(document.querySelector('.rm-count')||{}).textContent||'',
      menuSecs:document.querySelectorAll('.ap-sec').length,
      pageScroll:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      q:!!document.querySelector('textarea,input[type=text],.pblock textarea')}));
    let s=await pageState();
    ok(s.secs.length===3&&s.secs.every(x=>!x.open),W+': page one folds into three sections');
    ok(s.bars===1&&/0/.test(s.count)&&/3/.test(s.count),W+': it has the controls and its count: '+s.count);
    ok(s.menuSecs===3,W+': the pages menu lists its three sections');
    ok(new Set(s.secs.map(x=>x.w)).size===1,W+': every folded section is the same width '+JSON.stringify(s.secs.map(x=>x.w)));
    ok(s.pageScroll<=0,W+': the page does not scroll sideways, folded ('+s.pageScroll+')');
    await p.screenshot({path:path.join(OUT,'folded-'+W+'.png'),fullPage:true});
    await p.locator('details.rm-sec').nth(2).locator('summary').click();await p.waitForTimeout(300);
    s=await pageState();
    ok(s.secs[2].open&&new Set(s.secs.map(x=>x.w)).size===1,W+': the section with the wide table opened is the same width as the others '+JSON.stringify(s.secs.map(x=>x.w)));
    ok(s.pageScroll<=0,W+': and the page does not scroll sideways, open ('+s.pageScroll+')');
    const tbl=await p.evaluate(()=>{const t=document.querySelector('details.rm-sec[open] .md-table'),d=t.closest('details'),r=t.getBoundingClientRect(),dr=d.getBoundingClientRect();
      return {scrolls:t.scrollWidth>t.clientWidth,inside:r.right<=dr.right+1,sw:t.scrollWidth,cw:t.clientWidth};});
    ok(tbl.scrolls&&tbl.inside,W+': the table scrolls inside its own section '+JSON.stringify(tbl));
    await p.screenshot({path:path.join(OUT,'wide-open-'+W+'.png'),fullPage:true});
    /* a citation with no quote: a plain reference */
    await p.locator('details.rm-sec').nth(0).locator('summary').click();await p.waitForTimeout(300);
    await p.locator('.rd-mark').first().click();await p.waitForTimeout(300);
    const panel=await p.evaluate(()=>{const e=document.getElementById('rd-panel');return {hidden:e.hasAttribute('hidden'),text:e.textContent,bad:e.querySelectorAll('.rd-bad').length,q:e.querySelectorAll('.rd-q').length};});
    ok(!panel.hidden&&/Northfield Health reminder trial, internal report, 2024\./.test(panel.text)&&panel.bad===0&&panel.q===0&&!/not in this module/.test(panel.text),W+': the footnote with no quote is a plain reference in the panel: '+JSON.stringify(panel.text));
    await p.screenshot({path:path.join(OUT,'citation-'+W+'.png'),fullPage:false});
    await p.keyboard.press('Escape');await p.waitForTimeout(200);
    if(W===1280){
      /* open one, change page and back, redraw */
      await p.locator('.ap-item').nth(1).click();await p.waitForTimeout(500);
      let t=await pageState();
      ok(t.secs.length===2&&t.secs.every(x=>!x.open)&&t.bars===1&&/2/.test(t.count),W+': page two folds into two sections, with its own count: '+t.count);
      await p.locator('details.rm-sec').nth(1).locator('summary').click();await p.waitForTimeout(300);
      await p.locator('.ap-item').nth(0).click();await p.waitForTimeout(500);
      t=await pageState();
      ok(t.secs[0].open&&t.secs[2].open&&!t.secs[1].open&&/2 of 3/.test(t.count),W+': page one kept what was opened across a page change: '+JSON.stringify(t.secs.map(x=>x.open))+' '+t.count);
      await p.locator('.rm-btn').nth(0).click();await p.waitForTimeout(200);
      t=await pageState();ok(t.secs.every(x=>x.open)&&/3 of 3/.test(t.count),W+': Open everything opens page one\'s sections');
      await p.locator('.ap-item').nth(1).click();await p.waitForTimeout(500);
      t=await pageState();ok(!t.secs[0].open&&t.secs[1].open&&/1 of 2/.test(t.count),W+': and page two keeps its own state, untouched by it: '+JSON.stringify(t.secs.map(x=>x.open))+' '+t.count);
      await p.screenshot({path:path.join(OUT,'page2-'+W+'.png'),fullPage:true});
      await p.locator('.ap-item').nth(2).click();await p.waitForTimeout(500);
      t=await pageState();
      ok(t.secs.length===0&&t.bars===0&&t.count===''&&t.menuSecs===0,W+': the questions page is open: no sections, no controls, no count, no section list');
      ok(/What would change your mind/.test(await p.evaluate(()=>document.getElementById('main').textContent)),W+': and its question is there');
      await p.screenshot({path:path.join(OUT,'questions-'+W+'.png'),fullPage:true});
    }
    ok(cons.length===0&&errs.length===0,W+': zero CSP violations and page errors '+cons.concat(errs).join('|'));
    await p.context().close();
  }
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
