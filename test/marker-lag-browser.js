// Browser check for the renderer lagging the format: a module marked 0.99 (a format that does not exist yet) is added
// to a booklet in a real Chromium, with the hosted /app/ Content-Security-Policy. No page error, no console error, and
// no sentence about the marker in the toast; a 0.99 file loaded by paste says nothing about its marker either, and
// still reports what it cannot read. The registry and its module are served by page.route.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/marker-lag-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]);
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const LATER=fs.readFileSync(path.join(__dirname,'fixtures/marker-later.booklet.md'),'utf8');
const MOD='---\nbooklet: "0.99"\ntitle: A later module\nlang: en\n---\n\n> [!module|later-mod] A later module\n\n> [!activity|later-act repeat] A\n\n> [!text|later-q long] A question\n\n> [!module|later-mod end] End\n';
const REG={modules:[{id:'t/later',title:'Later module',file:'later.md'}]};
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:1000}});const p=await ctx.newPage();
  const bad=[],errs=[];
  p.on('console',m=>{if(m.type()==='error'||/Content Security Policy|Refused to/i.test(m.text()))bad.push(m.text());});
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
    if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
    r.fulfill({status:404,body:'nf'});});
  await p.route('https://raw.githubusercontent.com/**',r=>{const u=new URL(r.request().url()).pathname;
    const cors={'access-control-allow-origin':'*'};
    if(/registry\.json$/.test(u))return r.fulfill({status:200,body:JSON.stringify(REG),headers:{'content-type':'application/json',...cors}});
    if(/later\.md$/.test(u))return r.fulfill({status:200,body:MOD,headers:{'content-type':'text/plain',...cors}});
    r.fulfill({status:404,body:'nf'});});
  await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
  /* a 0.99 file pasted in: it opens, reports its three things, and says nothing about its marker */
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
  await p.locator('#pasteIn').fill(LATER);await p.locator('#loadGo').click();await p.waitForTimeout(900);
  const notes=await p.evaluate(()=>{const n=document.querySelector('#main .filenotes');return n?{text:n.innerText,items:[...n.querySelectorAll('li')].map(li=>li.textContent)}:null;});
  ok(!!notes&&notes.items.length===3,'a file marked 0.99 opens and lists the three things the page cannot read: '+JSON.stringify(notes));
  ok(!!notes&&!/0\.99|format 0\.18|booklet:/.test(notes.text),'and nothing in the notice is about its marker');
  /* add a module marked 0.99 */
  if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(400);}
  const tabs=()=>p.locator('button.mode').count();
  const before=await tabs();
  await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(800);
  const row=p.locator('#addModList .bkrow').filter({hasText:'Later module'}).first();
  ok(await row.count()===1,'the dialog lists the module');
  await row.locator('button').click();await p.waitForTimeout(700);
  ok(await p.locator('#veilAddModule[open]').count()===0&&await tabs()===before+1,'a module marked 0.99 is added and the dialog closes');
  const toast=(await p.locator('#toast').textContent())||'';
  ok(/A later module/.test(toast)&&!/0\.99|booklet:|read as format|as it is/.test(toast),'and the toast does not mention its marker: '+toast);
  ok(bad.length===0&&errs.length===0,'zero console errors, CSP violations and page errors '+bad.concat(errs).join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
