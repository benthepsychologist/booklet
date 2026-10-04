// Browser check for 0.8.1: in the Add a module dialog, a module whose id the open booklet already uses is refused
// with a message that names the id, and nothing is added; a module that does not clash is added. The registry and
// its two module files are served by page.route; headless Chromium with the hosted /app/ Content-Security-Policy.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/addmodule-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),R=path.dirname(HTML);
const CSP="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const mod=(id,qid)=>`---\nbooklet: 0.8\ntitle: ${id}\nlang: en\n---\n\n> [!module|${id}] ${id}\n\n> [!activity|${id}-act repeat] A\n\n> [!text|${qid} long] A question\n\n> [!module|${id} end] End\n`;
const FILES={'/clash.md':mod('clash-mod','extra'),'/fine.md':mod('fine-mod','fine-q')};
const REG={modules:[{id:'t/clash',title:'Clashing module',file:'clash.md'},{id:'t/fine',title:'Fine module',file:'fine.md'}]};
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:1000}});const p=await ctx.newPage();
  const csp=[],errs=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
    if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
    r.fulfill({status:404,body:'nf'});});
  await p.route('https://raw.githubusercontent.com/**',r=>{const u=new URL(r.request().url()).pathname;
    if(/registry\.json$/.test(u))return r.fulfill({status:200,body:JSON.stringify(REG),headers:{'content-type':'application/json','access-control-allow-origin':'*'}});
    const f=FILES['/'+u.split('/').pop()];
    r.fulfill(f?{status:200,body:f,headers:{'content-type':'text/plain','access-control-allow-origin':'*'}}:{status:404,body:'nf'});});
  await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
  await p.locator('#fileIn').setInputFiles(path.join(R,'test/fixtures/questions-open.booklet.md'));await p.waitForTimeout(500);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
  const tabs=()=>p.locator('button.mode').count();
  const before=await tabs();
  await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(800);
  const row=t=>p.locator('#addModList .bkrow').filter({hasText:t}).first();
  ok(await p.locator('#addModList .bkrow').count()===2,'the dialog lists the two modules');
  await row('Clashing module').locator('button').click();await p.waitForTimeout(600);
  const msg=(await p.locator('#addModMsg').textContent())||'';
  ok(/“extra”/.test(msg)&&/already uses/.test(msg),'the clashing module shows a message naming the id: '+msg);
  ok(await p.locator('#addModMsg.err').count()===1,'the message is an error message');
  ok(await p.locator('#veilAddModule[open]').count()===1,'the dialog stays open');
  ok(await tabs()===before,'nothing was added');
  ok(await row('Clashing module').locator('button').isEnabled(),'the button can be pressed again');
  await row('Fine module').locator('button').click();await p.waitForTimeout(700);
  ok(await p.locator('#veilAddModule[open]').count()===0&&await tabs()===before+1,'a module that does not clash is added and the dialog closes');
  ok(csp.length===0&&errs.length===0,'zero CSP violations and page errors '+csp.concat(errs).join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
