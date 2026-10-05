// Browser check of the folded reading preview (0.10.4): the line under a folded section's heading shows the words of its first
// paragraph, list item or table row, never the marks of inline Markdown: no backticks, **, ==, ~~, [text](url), [^1] or $x$.
// Cases: a paragraph with every mark; a list item whose code sits on a continuation line (how nvim's agents cheatsheet is written);
// a list item with marks; a table row with marks. Also: the opened list item draws the code as code. Hosted CSP, zero violations.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/lede-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const FILE=`---
booklet: "0.11"
title: Folded previews
lang: en
---

## Paragraph

Run \`npm test\` with **bold**, *em*, ==mark==, ~~strike~~, [a link](https://example.com/x), a note[^1] and $x^2$ here.

More.

## Continued item

- **Open a conversation:** \`<leader>ll\`, move to it, then \`<CR>\` to read it,
  or \`o\` to open it full size, with **bold** and [a link](https://example.com/y).

## Marked item

- Press \`k\` for **bold**, *em*, ==mark==, ~~strike~~, [a link](https://example.com/z) and $y$.

## Table row

| a | b |
|---|---|
| \`code\` | **bold** and [a link](https://example.com/w) |

[^1]: The note.
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'lede.booklet.md');fs.writeFileSync(file,FILE);
  const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1100,height:900}})).newPage();
  const cons=[],errs=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
  await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
  await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);if(await p.evaluate(()=>document.body.dataset.view)!=='home'){await p.locator('#btnHome').click();await p.waitForTimeout(400);}
  await p.locator('button.mode').first().click();await p.waitForTimeout(900);
  const secs=await p.evaluate(()=>[...document.querySelectorAll('details.rm-sec')].map(d=>({open:d.open,
    head:d.querySelector('summary h3').textContent,lede:(d.querySelector('summary .rm-lede')||{}).textContent||'',
    codes:[...d.querySelectorAll('.rm-body code')].map(c=>c.textContent)})));
  ok(secs.length===4&&secs.every(s=>!s.open),'four sections, all folded');
  const MARKS=/[`]|\*\*|==|~~|\]\(|\[\^|\$/;
  for(const s of secs) ok(s.lede&&!MARKS.test(s.lede),'"'+s.head+'": the preview shows no inline marks: '+JSON.stringify(s.lede));
  const by=h=>secs.find(s=>s.head===h);
  ok(/^Run npm test with bold, em, mark, strike, a link, a note.* and .* here\.$/.test(by('Paragraph').lede.replace(/\s+/g,' ').trim()),'the paragraph preview keeps its words');
  ok(by('Continued item').lede==='Open a conversation: <leader>ll, move to it, then <CR> to read it, or o to open it full size, with bold and a link.','the continued item preview is its words in order: '+by('Continued item').lede);
  ok(by('Marked item').lede.startsWith('Press k for bold, em, mark, strike, a link and')&&!/\$/.test(by('Marked item').lede),'the marked item preview keeps its words');
  ok(by('Table row').lede==='code · bold and a link','the table row preview is its cells\' words');
  await p.locator('details.rm-sec').nth(1).locator('summary').click();await p.waitForTimeout(300);
  const opened=await p.evaluate(()=>[...document.querySelectorAll('details.rm-sec')][1].querySelector('.rm-body').innerHTML);
  ok(/<code>&lt;leader&gt;ll<\/code>/.test(opened)&&/<code>o<\/code>/.test(opened)&&!/`/.test(opened),'the opened item draws the code on its continuation line as code');
  ok(cons.length===0&&errs.length===0,'zero CSP violations and page errors '+cons.concat(errs).join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
