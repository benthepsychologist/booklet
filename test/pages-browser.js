// Browser check of pages as pagination (0.15; was the per-page folding check of 0.11.7). One activity of three pages: prose,
// prose, then a question. Nothing folds: every page is drawn open, its headings as headings. The foot is one row, Back, "Page N
// of M" and Next, and Next on the last page is the next activity's. A wide table has the column's full width, and scrolls inside
// its own box when wider still (on a phone); at 400px the page itself never scrolls sideways. The module's screen shows the activity's first paragraph on its card, and a
// footnote with no quote is a plain reference in the panel.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/pages-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const WIDE='| Option | No-show rate | Reminder cost per month | No-show cost per month | Total per month | Saving against SMS only | Risk to watch | Who would run it |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| SMS only | 11% | $72 | $17,820 | $17,892 | none | cost of messages | front desk |\n| Email only | 14% | $0 | $22,680 | $22,680 | none, costs more | spam folders | front desk |\n| SMS plus email | 8% | $72 | $12,960 | $13,032 | about $4,860 | two systems | front desk |\n';
const FILE=`---
booklet: "0.13"
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
  const file=path.join(OUT,'pages.booklet.md');fs.writeFileSync(file,FILE);
  const b=await chromium.launch();
  for(const W of [1280,400]){
    const p=await (await b.newContext({viewport:{width:W,height:900}})).newPage();
    const cons=[],errs=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(500);}
    await p.locator('button.mode').first().click();await p.waitForTimeout(700);
    const cards=await p.evaluate(()=>[...document.querySelectorAll('button.mode')].map(c=>({k:c.querySelector('.k').textContent,d:(c.querySelector('.d')||{textContent:''}).textContent})));   // a card with no words draws no teaser line (0.11.10)
    ok(cards.length===2,W+': the module screen has two activity cards');
    ok(cards[0].d==='This is the first paragraph of the activity, with bold and snake_case.',W+': the first card shows the activity\'s first paragraph: '+JSON.stringify(cards[0].d));
    ok(cards[1].d==='',W+': an activity with no paragraph shows its title alone');
    await p.screenshot({path:path.join(OUT,'cards-'+W+'.png'),fullPage:true});
    await p.locator('button.mode').first().click();await p.waitForTimeout(700);
    const pageState=()=>p.evaluate(()=>({heads:[...document.querySelectorAll('#main .ap-body h3')].filter(h=>!h.closest('.rd-notes')).map(h=>h.textContent.trim()),
      folds:document.querySelectorAll('#main details').length,menu:document.querySelectorAll('.ap-menu,.ap-frame,.ap-title').length,
      foot:[...document.querySelectorAll('#main .cd-foot')].map(f=>[...f.children].map(c=>c.textContent.trim()).join(' | ')).join(' || '),
      pageScroll:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
    let s=await pageState();
    ok(s.heads.join()==='The answer,Background,Comparing the options'&&s.folds===0,W+': page one is drawn open, its headings as headings '+JSON.stringify(s.heads));
    ok(s.menu===0,W+': there is no page menu and no page name line');
    ok(s.foot==='Back to the overview | Page 1 of 3 | Next',W+': the foot is one row: '+s.foot);
    ok(s.pageScroll<=0,W+': the page does not scroll sideways ('+s.pageScroll+')');
    const tbl=await p.evaluate(()=>{const t=document.querySelector('#main .md-table'),c=document.querySelector('#main .ap-body').getBoundingClientRect(),r=t.getBoundingClientRect();
      return {scrolls:t.scrollWidth>t.clientWidth,inside:r.right<=c.right+1&&r.left>=c.left-1,full:Math.abs(r.width-c.width)<=1,sw:t.scrollWidth,cw:t.clientWidth};});
    ok(tbl.inside&&tbl.full&&(W>=1280||tbl.scrolls),W+': the wide table has the column\'s full width, within it'+(W>=1280?'':', and scrolls inside its own box')+' '+JSON.stringify(tbl));
    await p.screenshot({path:path.join(OUT,'page1-'+W+'.png'),fullPage:true});
    /* a citation with no quote: a plain reference */
    await p.locator('.rd-mark').first().click();await p.waitForTimeout(300);
    const panel=await p.evaluate(()=>{const e=document.getElementById('rd-panel');return {hidden:e.hasAttribute('hidden'),text:e.textContent,bad:e.querySelectorAll('.rd-bad').length,q:e.querySelectorAll('.rd-q').length};});
    ok(!panel.hidden&&/Northfield Health reminder trial, internal report, 2024\./.test(panel.text)&&panel.bad===0&&panel.q===0&&!/not in this module/.test(panel.text),W+': the footnote with no quote is a plain reference in the panel: '+JSON.stringify(panel.text));
    await p.screenshot({path:path.join(OUT,'citation-'+W+'.png'),fullPage:false});
    await p.keyboard.press('Escape');await p.waitForTimeout(200);
    /* turning the pages */
    await p.locator('#main .cd-foot .pg-next').click();await p.waitForTimeout(500);
    s=await pageState();
    ok(s.heads.join()==='The formula,What to be careful about'&&s.folds===0&&s.foot==='Back | Page 2 of 3 | Next',W+': Next turns to page two, drawn open: '+s.foot);
    await p.locator('#main .cd-foot .pg-next').click();await p.waitForTimeout(500);
    s=await pageState();
    ok(/What would change your mind/.test(await p.locator('#main').innerText())&&s.foot==='Back | Page 3 of 3 | Next: 2. Another one',W+': the last page holds the question, and its Next is the next activity\'s: '+s.foot);
    await p.screenshot({path:path.join(OUT,'page3-'+W+'.png'),fullPage:true});
    await p.locator('#main .cd-foot .pg-back').click();await p.waitForTimeout(500);
    s=await pageState();
    ok(/Page 2 of 3/.test(s.foot)&&s.pageScroll<=0,W+': Back turns back a page; no sideways scroll');
    ok(cons.length===0&&errs.length===0,W+': zero CSP violations and page errors '+cons.concat(errs).join('|'));
    await p.context().close();
  }
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
