// Browser check for format v0.11, a booklet that is one activity or one module opens straight into it, unless its front matter
// says `start: home`. A real page, a file loaded by paste, at 1280 px and at 400 px: where it opens, that the page does not
// scroll sideways, that the back control leads to the home screen, and that a file marked with another 0.x version opens the same
// way with its notice shown on the screen it opened into.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/start-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const head=(extra='',marker='"0.11"')=>`---\nbooklet: ${marker}\ntitle: Harbour notes\nlang: en\n${extra}---\n\n`;
const act=(id,t)=>`> [!activity|${id}] ${t}\n\nSome words to read first.\n\n> [!text|${id}-q] What did you notice in ${t}?\n\n`;
const F={
  one:head()+'> [!module|m] Harbour\n\n'+act('a','Low water')+'> [!module|m end] End\n',
  three:head()+'> [!module|m] Harbour\n\n'+act('a','Low water')+act('b','High water')+act('c','Slack water')+'> [!module|m end] End\n',
  two:head()+'> [!module|m] Harbour\n\n'+act('a','Low water')+'> [!module|m end] End\n\n> [!module|n] Quay\n\n'+act('c','Slack water')+'> [!module|n end] End\n',
  oneHome:head('start: home\n')+'> [!module|m] Harbour\n\n'+act('a','Low water')+'> [!module|m end] End\n',
  oneOld:head('',"0.9")+'> [!module|m] Harbour\n\n'+act('a','Low water')+'> [!module|m end] End\n',
  bare:head()+act('only','Low water'),
};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  for(const W of [1280,400]){
    const ctx=await b.newContext({viewport:{width:W,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
      r.fulfill(u==='/app/'?{status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}}:{status:404,body:'nf'});});
    const wait=ms=>p.waitForTimeout(ms);
    const view=()=>p.evaluate(()=>document.body.dataset.view);
    const over=()=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    const toList=async()=>{for(let i=0;i<3;i++){if(await p.getByRole('button',{name:'Add a booklet from a file'}).count()) return;await p.locator('#btnHome').click();await wait(300);}};
    const load=async text=>{await toList();await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(250);
      await p.locator('#pasteIn').fill(text);await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(800);};
    await p.goto('https://bookletmd.test/app/');await wait(500);
    await load(F.one);
    ok(await view()==='m/a'&&await p.locator('#main h2').first().innerText()==='Harbour',`${W}px: one module with one activity opens in the activity (the page's heading is the module's name)`);
    ok(await over()<=0,`${W}px: the activity does not scroll sideways (${await over()}px over)`);
    await p.screenshot({path:path.join(OUT,`start-one-${W}.png`)});
    await p.locator('#btnHome').click();await wait(300);
    ok(await view()==='home'&&await p.locator('#main button.mode').count()===1,`${W}px: the back control leads to the home screen, whose one card is the module`);
    await load(F.bare);
    ok(await view()==='only',`${W}px: a bare activity opens in it`);
    await load(F.three);
    ok(await view()==='module:m'&&await p.locator('#main button.mode').count()===3,`${W}px: one module of three activities opens on the module's own screen, with its three cards`);
    ok(await over()<=0,`${W}px: the module screen does not scroll sideways`);
    await p.locator('#btnHome').click();await wait(300);
    ok(await view()==='home',`${W}px: and its back control leads to the home screen`);
    await load(F.two);
    ok(await view()==='home'&&await p.locator('#main button.mode').count()===2,`${W}px: two modules open on the home screen`);
    await load(F.oneHome);
    ok(await view()==='home'&&await p.locator('#main button.mode').count()===1,`${W}px: start: home keeps the home screen`);
    await load(F.oneOld);
    const note=p.locator('#main .filenotes');
    ok(await view()==='m/a'&&await note.count()===1&&(await note.innerText()).includes('1 thing'),`${W}px: a file marked 0.9 opens into its activity, with the notice at the top of that screen`);
    await note.locator('summary').click();await wait(150);
    ok((await note.innerText()).includes('This file says booklet: 0.9. This page reads format 0.11 and has opened it as it is'),`${W}px: and the notice says which marker the file carries and what the page did`);
    await p.screenshot({path:path.join(OUT,`start-old-${W}.png`)});
    ok(errs.length===0,`${W}px: zero page errors ${errs.join('|')}`);
    await ctx.close();}
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
