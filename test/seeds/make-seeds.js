// Makes the local storage seeds the migration tests start from (keep.test.js, keep-browser.js): what a real renderer of
// an earlier release kept in a browser, captured from that release itself. Not a test (the runner only runs *.test.js
// and *-browser.js). For each release below, its booklet.html and its two examples are read from git, the page is
// opened in Chromium, and a reader's visit is played: the project board example is added from a pasted file and an
// entry kept in its log, with a second one left as a draft; the garden week example is added and its note answered; a
// blank booklet is started; the theme is set to Night and the language to French. Everything the page left in local
// storage is written to test/seeds/ls-<release>.json, with `_about` saying where it came from.
// Usage: PLAYWRIGHT=/path/to/playwright-core node test/seeds/make-seeds.js     (needs the release tags)
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=path.join(__dirname,'..','..');
const RELEASES=[['0.12.0','v0.12.0'],['0.13.0','v0.13.0'],['0.13.1-pre','cf07bc4']];
const show=(rev,f)=>cp.execFileSync('git',['-C',ROOT,'show',rev+':'+f],{encoding:'utf8',maxBuffer:64<<20});
(async()=>{
  const b=await chromium.launch();
  for(const [name,rev] of RELEASES){
    const html=show(rev,'booklet.html'),board=show(rev,'examples/project-board.booklet.md'),garden=show(rev,'examples/garden-week.booklet.md');
    const ctx=await b.newContext({viewport:{width:1100,height:900}});
    await ctx.route('https://seed.test/**',r=>r.fulfill({status:200,body:html,headers:{'content-type':'text/html; charset=utf-8'}}));
    const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto('https://seed.test/app/');await p.waitForTimeout(400);
    const add=async text=>{await p.getByRole('button',{name:'Add a booklet from a file'}).click();
      await p.locator('#pasteIn').fill(text);await p.locator('#loadGo').click();await p.waitForTimeout(500);};
    const list=async()=>{for(let i=0;i<3&&!(await p.getByRole('button',{name:'Start a new booklet'}).count());i++){await p.locator('#btnHome').click();await p.waitForTimeout(300);}};
    await add(board);
    await p.locator('#main').getByText('Studio log',{exact:false}).first().click();await p.waitForTimeout(400);
    await p.locator('#main textarea').first().fill('Seed '+name+': kept entry');await p.waitForTimeout(500);
    await p.getByRole('button',{name:'Finalize'}).first().click();await p.waitForTimeout(500);
    await p.locator('#main textarea').first().fill('Seed '+name+': a draft not yet kept');await p.waitForTimeout(700);
    await list();
    await add(garden);
    await p.locator('#main textarea').first().fill('Seed '+name+': the garden note');await p.waitForTimeout(700);
    await list();
    await p.getByRole('button',{name:'Start a new booklet'}).click();await p.waitForTimeout(500);
    await list();
    await p.locator('#themeSel').selectOption('night');await p.waitForTimeout(200);
    await p.locator('.lang button[data-lang="fr"]').click();await p.waitForTimeout(300);
    const ls=await p.evaluate(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k);}return o;});
    const keys=Object.keys(ls).sort(),out={_about:'local storage left by booklet.html '+name+' ('+rev+'), made by test/seeds/make-seeds.js'};
    keys.forEach(k=>{out[k]=ls[k];});
    fs.writeFileSync(path.join(__dirname,'ls-'+name+'.json'),JSON.stringify(out,null,1)+'\n');
    console.log(name,keys.length+' keys',keys.map(k=>k.replace(/[a-z0-9]{8,}$/,'…')).join(', '),errs.length?'ERRORS '+errs.join('|'):'');
    await ctx.close();}
  await b.close();
})();
