// Browser check for format 0.13 (renderer 0.13.0), in a real page under the hosted Content-Security-Policy:
//  - an activity can be called `home`: its card opens it, its question can be answered, and the answer is still there when the reader comes back (D3);
//  - the booklet's own home screen is the view `@home`, which no activity id can be;
//  - activities outside every module fence draw as a card each, in the order `parent:` gives them (D2);
//  - `> [!group]- Title` draws as a plain fold that opens on a press (D13);
//  - `> [!row|end]` closes a row, so two cells draw side by side (D11);
//  - saving after a record the page does not read keeps it in the file the page downloads (D1).
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/format013-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const FILE=`---
booklet: "0.16"
title: Home test
lang: en
---

> [!activity|home] The first activity

Words of the first activity.

> [!text|note] What did you notice?

> [!group]- Background, if you want it
> Folded words inside.

> [!row]

### Left

Left words.

### Right

Right words.

> [!row|end]

> [!activity|kid parent:other] Child of the second

Kid words.

> [!activity|other] The second activity

Second words.

%%
> [!records] App record — do not edit below this line

\`\`\`booklet sync
{"path":"~/notes/home-test.md"}
\`\`\`

%%
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const cons=[],errs=[];
  const file=path.join(OUT,'f013-home.booklet.md');fs.writeFileSync(file,FILE);
  const p=await (await b.newContext({viewport:{width:1100,height:900},acceptDownloads:true})).newPage();
  p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
  await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
  await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
  const view=()=>p.evaluate(()=>document.body.dataset.view);
  ok(await view()==='@home','three bare activities open on the booklet\'s own home screen, named @home ('+await view()+')');
  const cards=await p.evaluate(()=>[...document.querySelectorAll('#main button.mode')].map(c=>c.querySelector('.k').textContent));
  ok(cards.join('|')==='The first activity|The second activity|Child of the second','each bare activity is a card, with the child after its parent ('+cards.join('|')+')');
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(600);
  ok(await view()==='home','pressing the card of the activity called home opens it ('+await view()+')');
  ok(/Words of the first activity/.test(await p.locator('#main').innerText()),'and it draws that activity, not the home screen');
  await p.locator('#main textarea').first().fill('the kettle');await p.locator('#main textarea').first().blur();await p.waitForTimeout(400);
  /* the plain fold */
  const fold=p.locator('#main details.card-plain, #main .card-plain').first();
  ok(await fold.count()===1,'a group is drawn as a plain fold');
  await p.locator('#main .card-plain summary').first().click();await p.waitForTimeout(300);
  ok(/Folded words inside/.test(await p.locator('#main').innerText()),'and opens on a press');
  /* a row closed with [!row|end] draws two cells side by side */
  ok(/Left words/.test(await p.locator('#main').innerText())&&/Right words/.test(await p.locator('#main').innerText()),'a row closed with [!row|end] draws both cells');
  /* back to the home screen, and the answer is still there */
  await p.locator('#btnHome').click();await p.waitForTimeout(400);
  ok(await view()==='@home','the back control leads to @home');
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(500);
  ok(await p.locator('#main textarea').first().inputValue()==='the kettle','the answer to the question of the activity called home is still there');
  /* a save keeps the record block the page does not read */
  const [d]=await Promise.all([p.waitForEvent('download'),p.locator('#btnExport').click()]);
  const text=fs.readFileSync(await d.path(),'utf8');
  ok(/```booklet sync\n\{"path":"~\/notes\/home-test\.md"\}\n```/.test(text),'the file the page saves still holds the sync record it did not read');
  ok(/```booklet answers\n[\s\S]*the kettle/.test(text)&&!/\[!records\|/.test(text),'and the answer, under the plain records line');
  ok(cons.length===0&&errs.length===0,'zero CSP violations and page errors '+cons.concat(errs).join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
