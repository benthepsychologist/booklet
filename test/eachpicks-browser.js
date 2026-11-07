// Browser check that a question asked for each pick follows the picks as the reader makes them (renderer 0.19.1), in Chromium: a pick
// made in a multi or a single choice adds its copy at the end at once, a pick taken back takes its drawing away and keeps its pair,
// a pick made again brings the copy back with the words typed there, and a box being typed in is not drawn again when another pick
// is made. In a repeat activity and in an ordinary one. Everything is made up.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/eachpicks-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]);
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const book=kind=>`---
booklet: "0.19"
title: Workshop log
lang: en
---

> [!activity|log${kind}] Workshop log

> [!multi|tools] Which tools did you use?
- [ ] Hammer
- [ ] Saw
- [ ] Drill

> [!text|why each:tools] Why?

> [!choice|pick] Which one mattered most?
- [ ] Hammer
- [ ] Saw

> [!text|pw each:pick] Why that one?
`;
(async()=>{
  const b=await chromium.launch();
  for(const kind of [' repeat','']){
    const label=kind?'a repeat activity':'an ordinary activity';
    const ctx=await b.newContext({viewport:{width:1200,height:1000}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
      r.fulfill(u==='/app/'?{status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}}:{status:404,body:'nf'});});
    const wait=ms=>p.waitForTimeout(ms);
    await p.goto('https://bookletmd.test/app/');await wait(500);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(250);
    await p.locator('#pasteIn').fill(book(kind));await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(900);
    const q=n=>p.locator('#main .q-inline').filter({hasText:n?'Which one mattered most?':'Which tools did you use?'}).last();
    const heads=()=>p.locator('#main .q-each').first().locator('.q-pickhead').allInnerTexts();
    ok(await p.locator('#main .q-each').first().innerText()==='',`${label}: nothing is drawn for the follow-up while nothing is picked`);
    // a multi
    await q(0).getByRole('button',{name:'Saw'}).click();await wait(200);
    ok(/Why\?/.test(await p.locator('#main .q-each').first().innerText())&&(await heads()).join()==='Saw',`${label}: pressing Saw draws the title and the Saw copy at once (${(await heads()).join()})`);
    await p.locator('#main .q-each').first().locator('textarea').first().fill('for cutting');await wait(150);
    await p.locator('#main .q-each').first().locator('textarea').first().focus();
    await q(0).getByRole('button',{name:'Drill'}).click();await wait(200);
    ok((await heads()).join()==='Saw,Drill',`${label}: pressing Drill adds its copy at the end (${(await heads()).join()})`);
    ok(await p.locator('#main .q-each').first().locator('textarea').first().inputValue()==='for cutting',`${label}: the Saw copy is the same box, with its words`);
    await q(0).getByRole('button',{name:'Saw'}).click();await wait(200);
    ok((await heads()).join()==='Drill',`${label}: taking Saw back takes its copy away (${(await heads()).join()})`);
    await q(0).getByRole('button',{name:'Saw'}).click();await wait(200);
    ok((await heads()).join()==='Drill,Saw'&&await p.locator('#main .q-each').first().locator('.q-pick').nth(1).locator('textarea').inputValue()==='for cutting',`${label}: picking Saw again brings its copy back after Drill, with the words kept (${(await heads()).join()})`);
    await q(0).getByRole('button',{name:'Drill'}).click();await q(0).getByRole('button',{name:'Saw'}).click();await wait(200);
    ok(await p.locator('#main .q-each').first().innerText()==='','${label}: taking every pick back leaves nothing drawn'.replace('${label}',label));
    // a single choice
    const each2=p.locator('#main .q-each').nth(1);
    await q(1).getByRole('button',{name:'Hammer'}).click();await wait(200);
    ok(/Why that one\?/.test(await each2.innerText())&&(await each2.locator('.q-pickhead').allInnerTexts()).join()==='Hammer',`${label}: a single choice draws the copy for its one pick`);
    await each2.locator('textarea').first().fill('it was heavy');await wait(150);
    await q(1).getByRole('button',{name:'Saw'}).click();await wait(200);
    ok((await each2.locator('.q-pickhead').allInnerTexts()).join()==='Saw',`${label}: choosing another option changes the copy to that pick`);
    await q(1).getByRole('button',{name:'Hammer'}).click();await wait(200);
    ok(await each2.locator('textarea').first().inputValue()==='it was heavy',`${label}: choosing the first again brings its words back`);
    ok(errs.length===0,`${label}: no page error (${errs.join(' | ')})`);
    await ctx.close();}
  await b.close();
  console.log(fails.length?`\n${fails.length} FAILED`:'\nall eachpicks browser checks passed');process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
