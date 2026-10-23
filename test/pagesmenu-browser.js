// Browser check of the page menu of an activity of several pages across the 700px breakpoint. Opened at 400px the menu is a
// closed rail and covers nothing. A window that crosses the breakpoint redraws the activity, so a menu drawn open for a wide
// window does not lie over the page when the window narrows (a phone turned, a window dragged), and one opened over the page
// on a narrow window is a column again when the window widens. Invented content.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/pagesmenu-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const FILE=`---
booklet: "0.13"
title: Two pages
lang: en
---

# Two pages

> [!activity|pages] Two pages

## First page

Some words on the first page.

> [!text|one] A question on page one

***

## Second page

> [!text|two] A question on page two
`;
const menu=p=>p.evaluate(()=>{const f=document.querySelector('.ap-frame'),m=f&&f.querySelector('.ap-menu'),t=f&&f.querySelector('.ap-toggle');
  return {frame:!!f,min:!!f&&f.classList.contains('ap-min'),expanded:t&&t.getAttribute('aria-expanded'),position:m&&getComputedStyle(m).position,
    sideways:document.documentElement.scrollWidth-document.documentElement.clientWidth};});
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'pagesmenu.booklet.md');fs.writeFileSync(file,FILE);
  const b=await chromium.launch();
  const open=async W=>{
    const p=await (await b.newContext({viewport:{width:W,height:900}})).newPage();
    p.__bad=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))p.__bad.push(m.text());});p.on('pageerror',e=>p.__bad.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(!(await p.locator('.ap-frame').count())){if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(500);}
      await p.locator('button.mode').first().click();await p.waitForTimeout(700);}
    return p;};
  const size=async(p,W)=>{await p.setViewportSize({width:W,height:900});await p.waitForTimeout(500);};

  /* opened at 400px: a closed rail, nothing over the page */
  let p=await open(400),s=await menu(p);
  ok(s.frame,'400: the activity has its page menu');
  ok(s.min&&s.expanded==='false'&&s.position!=='fixed','400, freshly opened: the menu is a closed rail, not over the page '+JSON.stringify(s));
  ok(s.sideways<=0,'400: the page does not scroll sideways');
  await p.screenshot({path:path.join(OUT,'pagesmenu-fresh-400.png')});

  /* opened at 1280px, then narrowed: the window crossing 700px redraws it as the rail */
  p=await open(1280);s=await menu(p);
  ok(!s.min&&s.expanded==='true','1280: the menu is a column');
  await size(p,400);s=await menu(p);
  ok(s.min&&s.expanded==='false'&&s.position!=='fixed','1280 narrowed to 400: the menu is a closed rail, not lying over the page '+JSON.stringify(s));
  await p.screenshot({path:path.join(OUT,'pagesmenu-narrowed-400.png')});
  await size(p,1280);s=await menu(p);
  ok(!s.min&&s.expanded==='true','400 widened to 1280: the menu is a column again');

  /* opened over the page at 400px, then widened: a column, and narrowing again gives the rail, not the overlay */
  await size(p,400);await p.locator('.ap-toggle').click();await p.waitForTimeout(300);s=await menu(p);
  ok(!s.min&&s.expanded==='true'&&s.position==='fixed','400: pressing the toggle opens the menu over the page, one tap');
  await size(p,1280);s=await menu(p);
  ok(!s.min&&s.position!=='fixed','widened with the menu open over the page: a column '+JSON.stringify(s));
  await size(p,400);s=await menu(p);
  ok(s.min&&s.expanded==='false','narrowed again: the rail, the overlay was not kept '+JSON.stringify(s));
  ok(p.__bad.length===0,'no policy violation or page error: '+p.__bad.join(' | '));
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'ALL PASSED');process.exit(fails.length?1:0);
})();
