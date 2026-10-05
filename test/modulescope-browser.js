// Browser check for 0.9: an id belongs to its module. A file with two modules that share a question id, an
// activity id and a widget block id: what is typed in one module is not in the other, an entry kept in one is not in
// the other, the heading each widget draws is its own, a downloaded copy reopens the same, and there are no CSP
// violations or page errors. Headless Chromium with the hosted /app/ Content-Security-Policy applied (served from a
// fake origin through page.route). Needs Playwright, so test/run.sh runs it only through test/run-browser.sh.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/modulescope-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const mod=(id,t)=>`> [!module|${id}] Module ${t}\n\n> [!activity|act] Answer ${t}\n\n> [!text|note] Note ${t}\n\n> [!widget|w]\n> ![[#^wd]]\n\n> [!activity|log repeat] Log ${t}\n\n> [!text|what] What ${t}\n\n\`\`\`booklet widget\n{"engine":"grid-select","copy":{"h":"Picker ${t}"},"items":[{"id":"i","label":"Item ${t}"}]}\n\`\`\`\n^wd\n\n> [!module|${id} end] End\n`;
const FILE=`---\nbooklet: "0.11"\ntitle: Scope\nlang: en\n---\n\n${mod('ma','A')}\n${mod('mb','B')}`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const src=path.join(OUT,'scope.booklet.md');fs.writeFileSync(src,FILE);
  const b=await chromium.launch();
  const csp=[],errs=[];
  async function open(file){
    const ctx=await b.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});const p=await ctx.newPage();
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
      if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
      r.fulfill({status:404,body:'nf'});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    return {p,ctx};}
  // module -> activity: a module with two activities opens on its own page first
  const enter=async(p,mod,act)=>{
    await p.locator('button.mode').filter({hasText:'Module '+mod}).first().click();await p.waitForTimeout(300);
    await p.locator('button.mode').filter({hasText:act+' '+mod}).first().click();await p.waitForTimeout(400);};
  let {p,ctx}=await open(src);
  const goHome=async()=>{await p.locator('#btnHome').click();await p.waitForTimeout(300);};
  await enter(p,'A','Answer');
  ok(await p.locator('textarea').first().inputValue()==='','module A: the note starts empty');
  ok(await p.locator('.ap-body h3, .col h3').filter({hasText:'Picker A'}).count()>=1,'module A draws its own widget heading');
  await p.locator('textarea').first().fill('typed in A');await p.waitForTimeout(150);
  await goHome();
  await enter(p,'B','Answer');
  ok(await p.locator('textarea').first().inputValue()==='','typing in module A left module B\'s note empty');
  ok(await p.locator('h3').filter({hasText:'Picker B'}).count()>=1&&await p.locator('h3').filter({hasText:'Picker A'}).count()===0,'module B draws its own widget heading');
  await p.locator('textarea').first().fill('typed in B');await p.waitForTimeout(150);
  // an entry in module A's log
  await goHome();await enter(p,'A','Log');
  await p.locator('textarea').first().fill('kept in A');await p.locator('.finalize').click();await p.waitForTimeout(500);
  ok(await p.locator('.chips .chip').count()===1,'module A\'s log holds the entry just kept');
  await goHome();await enter(p,'B','Log');
  ok(await p.locator('.chips .chip').count()===0,'module B\'s log, with the same activity id, holds none');
  // a downloaded copy
  const dl=async()=>{const [d]=await Promise.all([p.waitForEvent('download'),(async()=>{await p.locator('#btnExport').click();await p.waitForTimeout(300);
    await p.locator('#exportPanel .exportchoice').first().click();})()]);return fs.readFileSync(await d.path(),'utf8');};
  const md=await dl();
  const rec=id=>{const i=md.indexOf('> [!records|'+id+']');if(i<0) return '';const j=md.indexOf('> [!records|',i+5);return md.slice(i,j<0?md.length:j);};
  ok(/typed in A/.test(rec('ma'))&&!/typed in B/.test(rec('ma'))&&/typed in B/.test(rec('mb'))&&!/typed in A/.test(rec('mb')),'the downloaded file holds each note under its own module\'s records line');
  ok(/booklet entries log/.test(rec('ma'))&&/kept in A/.test(rec('ma'))&&!/booklet entries/.test(rec('mb')),'and the entry under module A only, with the file\'s own activity id');
  const out=path.join(OUT,'scope-copy.booklet.md');fs.writeFileSync(out,md);
  await ctx.close();
  ({p,ctx}=await open(out));
  await enter(p,'A','Answer');
  ok(await p.locator('textarea').first().inputValue()==='typed in A','reloaded from that file, module A\'s note is back');
  await goHome();await enter(p,'B','Answer');
  ok(await p.locator('textarea').first().inputValue()==='typed in B','and module B\'s is its own');
  await goHome();await enter(p,'A','Log');
  ok(await p.locator('.chips .chip').count()===1,'and module A\'s entry is back');
  await goHome();await enter(p,'B','Log');
  ok(await p.locator('.chips .chip').count()===0,'with none in module B');
  ok(csp.length===0&&errs.length===0,'zero CSP violations and page errors '+csp.concat(errs).join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
