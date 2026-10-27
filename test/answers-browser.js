// Browser check for format 0.16's answers lane: a question asked for each pick (`each:`) is drawn as not yet supported and its
// pairs survive Finalize; an answer of the wrong shape is drawn read-only, with its notice and the file's value, and fits a phone's
// width; the kept entry's card shows a follow-up as one line per pick. At 1280 and 390 px.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/answers-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]);
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const text=`---
booklet: "0.15"
title: Workshop log
lang: en
---

> [!activity|log repeat] Workshop log

> [!multi|tools open] Which tools did you use?
- [ ] Hammer
- [ ] Saw
- [ ] Drill

> [!text|why each:tools] What was it for?

> [!text|note] A note

%%
> [!records] App record

\`\`\`booklet draft log
{"tools":[2,3],"why":[{"pick":2,"a":"cutting"},{"pick":3,"a":"holes"},{"pick":1,"a":"taken back"}],"note":["a note kept as a list by some other tool, long enough to need wrapping on a phone's narrow screen",""]}
\`\`\`
%%
`;
(async()=>{
  const b=await chromium.launch();
  for(const W of [1280,390]){
    const ctx=await b.newContext({viewport:{width:W,height:1000}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
      r.fulfill(u==='/app/'?{status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}}:{status:404,body:'nf'});});
    const wait=ms=>p.waitForTimeout(ms);
    await p.goto('https://bookletmd.test/app/');await wait(500);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(250);
    await p.locator('#pasteIn').fill(text);await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(900);
    const kept=p.locator('#main .q-kept');
    ok(await kept.count()===2,`${W}px: two questions are drawn as kept: the follow-up and the note of the wrong shape (${await kept.count()})`);
    const fu=await kept.nth(0).innerText(),note=await kept.nth(1).innerText();
    ok(/What was it for\?/.test(fu)&&/does not draw yet/.test(fu),`${W}px: the follow-up says this page does not draw it yet`);
    ok(/A note/.test(note)&&/Kept as written/.test(note)&&/a note kept as a list/.test(note),`${W}px: the note shows its notice and the file's value`);
    ok(await kept.locator('button,input,textarea,select').count()===0,`${W}px: neither has anything to press or type in`);
    ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${W}px: the page does not scroll sideways`);
    await p.locator('#main button.finalize').click();await wait(400);
    const card=await p.locator('#main .entry').first().innerText();
    ok(/What was it for\? · Saw\s*cutting/.test(card)&&/What was it for\? · Drill\s*holes/.test(card)&&!/taken back/.test(card),`${W}px: the kept entry's card shows one line per pick, and not the pair taken back (${card.replace(/\s+/g,' ').slice(0,160)})`);
    ok(/Kept as written/.test(card),`${W}px: and the note of the wrong shape as written, with its notice`);
    ok(await p.locator('#main .q-kept').count()===0||!/cutting/.test(await p.locator('#main .q-kept').first().innerText()),`${W}px: the draft is cleared for the next entry`);
    ok(errs.length===0,`${W}px: no page error (${errs.join(' | ')})`);
    await ctx.close();}
  await b.close();
  console.log(fails.length?`\n${fails.length} FAILED`:'\nall answers browser checks passed');process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
