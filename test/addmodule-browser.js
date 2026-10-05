// Browser check for Add a module (0.10): an id is unique within its module, so a module that reuses the open booklet's
// question id is added without a word; one that brings a data block under an id another module's data section already
// has is added too (a module's data section is its own), and the toast says the id was renamed. The registry and its
// module files are served by page.route; headless Chromium with the hosted /app/ Content-Security-Policy.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/addmodule-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),R=path.dirname(HTML);
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const mod=(id,qid,blk)=>`---\nbooklet: "0.11"\ntitle: ${id}\nlang: en\n---\n\n> [!module|${id}] ${id}\n\n> [!activity|${id}-act repeat] A\n\n> [!text|${qid} long] A question\n\n> [!module|${id} end] End\n`+(blk?`\n\`\`\`booklet data\n[{"x":"${id}"}]\n\`\`\`\n^${blk}\n`:"");
const FILES={'/first.md':mod('first-mod','first-q','dat'),'/clash.md':mod('clash-mod','clash-q','dat'),'/fine.md':mod('fine-mod','extra')};
const REG={modules:[{id:'t/first',title:'First module',file:'first.md'},{id:'t/clash',title:'Clashing module',file:'clash.md'},{id:'t/fine',title:'Fine module',file:'fine.md'},
  {id:'t/slow',title:'Slow module',file:'slow.md'},{id:'t/huge',title:'Huge module',file:'huge.md'},{id:'t/redir',title:'Redirecting module',file:'redir.md'}]};
let LIST='good';
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:1000}});const p=await ctx.newPage();
  const csp=[],errs=[],held=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
    if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
    r.fulfill({status:404,body:'nf'});});
  await p.route('https://raw.githubusercontent.com/**',r=>{const u=new URL(r.request().url()).pathname;
    const cors={'access-control-allow-origin':'*'};
    if(/registry\.json$/.test(u)){
      if(LIST==='huge')return r.fulfill({status:200,body:JSON.stringify({modules:REG.modules,pad:'x'.repeat(1024*1024+100)}),headers:{'content-type':'application/json',...cors}});
      if(LIST==='redirect')return r.fulfill({status:302,headers:{location:'https://raw.githubusercontent.com/other/registry.json',...cors}});
      return r.fulfill({status:200,body:JSON.stringify(REG),headers:{'content-type':'application/json',...cors}});}
    if(/slow\.md$/.test(u)){held.push(r);return;}
    if(/huge\.md$/.test(u))return r.fulfill({status:200,body:mod('huge-mod','hq')+'x'.repeat(5*1024*1024+100),headers:{'content-type':'text/plain',...cors}});
    if(/redir\.md$/.test(u))return r.fulfill({status:302,headers:{location:'https://raw.githubusercontent.com/other/fine.md',...cors}});
    const f=FILES['/'+u.split('/').pop()];
    r.fulfill(f?{status:200,body:f,headers:{'content-type':'text/plain','access-control-allow-origin':'*'}}:{status:404,body:'nf'});});
  await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
  await p.locator('#fileIn').setInputFiles(path.join(R,'test/fixtures/questions-open.booklet.md'));await p.waitForTimeout(500);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);if(await p.evaluate(()=>document.body.dataset.view)!=='home'){await p.locator('#btnHome').click();await p.waitForTimeout(400);}
  const tabs=()=>p.locator('button.mode').count();
  const before=await tabs();
  await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(800);
  const row=t=>p.locator('#addModList .bkrow').filter({hasText:t}).first();
  ok(await p.locator('#addModList .bkrow').count()===6,'the dialog lists the six modules');
  await row('First module').locator('button').click();await p.waitForTimeout(700);
  ok(await p.locator('#veilAddModule[open]').count()===0&&await tabs()===before+1,'a module that brings a data block is added and the dialog closes');
  await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(800);
  const afterFirst=await tabs();
  await row('Clashing module').locator('button').click();await p.waitForTimeout(700);
  ok(await p.locator('#veilAddModule[open]').count()===0&&await tabs()===afterFirst+1,'a module that brings a block under an id another module\'s data section has is added too: each module\'s data section is its own');
  const note=(await p.locator('#toast').textContent())||'';
  ok(/renamed/.test(note)&&/dat is now clash-mod-dat/.test(note),'and the toast says the id was renamed so Obsidian and GitHub do not mix them up: '+note);
  await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(800);
  const afterClash=await tabs();
  await row('Fine module').locator('button').click();await p.waitForTimeout(700);
  ok(await p.locator('#veilAddModule[open]').count()===0&&await tabs()===afterClash+1,'a module that reuses the booklet\'s question id is added: an id belongs to its module');
  // a module file that is oversized, redirecting or slow is refused with a plain message, and nothing is added
  const pre=await tabs();
  const msg=()=>p.locator('#addModMsg').innerText();
  await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(800);
  await row('Huge module').locator('button').click();await p.waitForTimeout(1500);
  ok(/too big/.test(await msg())&&await p.locator('#veilAddModule[open]').count()===1&&await tabs()===pre,'a module file over 5 MB is refused with a plain message: '+await msg());
  await row('Redirecting module').locator('button').click();await p.waitForTimeout(800);
  ok(/could not be fetched/.test(await msg())&&await tabs()===pre,'a module file that redirects is refused with a plain message: '+await msg());
  await row('Slow module').locator('button').click();await p.waitForTimeout(16500);
  ok(/took too long/.test(await msg())&&await tabs()===pre,'a module file that never arrives is given up on after about 15 seconds, with a plain message: '+await msg());
  held.forEach(r=>r.abort().catch(()=>{}));
  // the registry's list: oversized or redirecting shows the plain "list could not be loaded"
  await p.locator('#addModCancel').click();LIST='huge';
  await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(1200);
  ok(await p.locator('#addModList .bkrow').count()===0&&/module list could not be loaded/.test(await p.locator('#addModList').innerText()),'a registry list over 1 MB is refused: the list could not be loaded message');
  await p.locator('#addModCancel').click();LIST='redirect';
  await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(1200);
  ok(await p.locator('#addModList .bkrow').count()===0&&/module list could not be loaded/.test(await p.locator('#addModList').innerText()),'a registry list that redirects is refused');
  await p.locator('#addModCancel').click();LIST='good';
  await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(1000);
  ok(await p.locator('#addModList .bkrow').count()===6,'and a good list loads again');
  ok(csp.length===0&&errs.length===0,'zero CSP violations and page errors '+csp.concat(errs).join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
