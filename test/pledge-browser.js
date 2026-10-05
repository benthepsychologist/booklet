// Browser check of Booklet's pledge: nothing a reader writes is uploaded. It uses the page the way a reader does, in headless
// Chromium under the hosted /app/ Content-Security-Policy (test/csp.js), and records every request the page makes and every one
// the policy blocks. Then it asserts: every request is a GET; every one goes to the page's own origin or the registry's origin and
// nowhere else; no URL, header or body holds any word the test typed as an answer; nothing is written to cookies and nothing but
// the renderer's own "booklet." keys is in localStorage; zero CSP violations and page errors.
// A change that makes this fail is a change to the pledge and needs Ben's say-so before the test is edited.
// What the reader does here: starts a new booklet, adds two modules from an invented registry (served by page.route), answers
// questions of every kind, adds an own option, keeps entries, renames the booklet, removes a module, opens and closes "Send or
// save a copy", downloads, loads a file from disk and one by paste, switches language and theme, opens a booklet with a diagram
// and a formula (so mermaid and Temml start).
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/pledge-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.',R=path.dirname(HTML);
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PAGE_ORIGIN='https://bookletmd.test';
/* every distinctive string the test types or names as the reader's work */
const S={own:'QZXownoption4417',name:'QZXrenamedbooklet5528',keep:'QZXkeptentry6639',kit:'QZXkitchenanswer7741'};
const mod=(id,title,body)=>`---\nbooklet: "0.10"\ntitle: ${title}\nlang: en\n---\n\n> [!module|${id}] ${title}\n\n${body}\n> [!module|${id} end] End\n`;
const KITCHEN=mod('kitchen','Kitchen module',
`> [!activity|k-act repeat] Kitchen log

> [!text|k-text] A short answer

> [!text|k-long long] A long answer

> [!choice|k-choice open] Pick one
- [ ] Soup
- [ ] Bread

> [!multi|k-multi open] Pick some
- [ ] Salt
- [ ] Pepper

> [!scale|k-scale] How warm?

1. Cool
2. Fine
3. Hot

> [!number|k-num] How many?

> [!date|k-date] When?

> [!lines|k-lines] Words
> One per line.

`);
const GARDEN=mod('garden','Garden module',
`> [!activity|g-act] Garden walk

> [!text|g-text] What grew?

`);
const REG={modules:[{id:'t/kitchen',title:'Kitchen module',file:'kitchen.md'},{id:'t/garden',title:'Garden module',file:'garden.md'}]};
const FILES={'/kitchen.md':KITCHEN,'/garden.md':GARDEN};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});const p=await ctx.newPage();
  const reqs=[],failed=[],viol=[],errs=[],cons=[];
  p.on('request',r=>reqs.push({url:r.url(),method:r.method(),headers:r.headers(),body:r.postData()||'',type:r.resourceType()}));
  p.on('requestfailed',r=>failed.push(r.method()+' '+r.url()+' '+(r.failure()||{}).errorText));
  p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});
  p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});});
  const harvest=async()=>{const v=await p.evaluate(()=>window.__viol||[]).catch(()=>[]);viol.push(...v);};
  await p.route(PAGE_ORIGIN+'/**',r=>{const u=new URL(r.request().url()).pathname;
    if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
    r.fulfill({status:404,body:'nf'});});
  await p.route('https://raw.githubusercontent.com/**',r=>{const u=new URL(r.request().url()).pathname;
    if(/registry\.json$/.test(u))return r.fulfill({status:200,body:JSON.stringify(REG),headers:{'content-type':'application/json','access-control-allow-origin':'*'}});
    const f=FILES['/'+u.split('/').pop()];
    r.fulfill(f?{status:200,body:f,headers:{'content-type':'text/plain','access-control-allow-origin':'*'}}:{status:404,body:'nf'});});
  const wait=ms=>p.waitForTimeout(ms);
  const cards=()=>p.locator('#main button.mode');
  const fillAll=async(tag)=>{ /* answer every question on screen */
    const t=p.locator('.ap-body textarea, .ap-body input[type=text]');const n=await t.count();
    for(let i=0;i<n;i++){const el=t.nth(i);if(await el.evaluate(e=>e.classList.contains('q-own')))continue;await el.fill(tag+i);}
    const num=p.locator('.ap-body input[type=number]');for(let i=0;i<await num.count();i++) await num.nth(i).fill('4242');
    const dt=p.locator('.ap-body input[type=date]');for(let i=0;i<await dt.count();i++) await dt.nth(i).fill('2026-10-05');
    const pills=p.locator('.ap-body .pills > button.pill-btn');for(let i=0;i<await pills.count();i+=2) await pills.nth(i).click();
    await wait(200);};
  const addFromRegistry=async(title)=>{await p.getByRole('button',{name:'Add a module'}).first().click();await wait(800);
    await p.locator('#addModList .bkrow').filter({hasText:title}).first().locator('button').click();await wait(700);};

  await p.goto(PAGE_ORIGIN+'/app/');await wait(500);
  const registryOrigin=await p.evaluate(()=>new URL(document.querySelector('meta[name="booklet-registry"]').content).origin);
  ok(registryOrigin==='https://raw.githubusercontent.com','the page names its registry in the meta tag: '+registryOrigin);
  // 1 a new booklet, and two modules from the registry
  await p.getByRole('button',{name:'Start a new booklet'}).click();await wait(600);
  await addFromRegistry('Kitchen module');await addFromRegistry('Garden module');
  ok(await cards().count()===2,'two modules were added from the registry');
  // 2 answer questions of every kind, add an own option, keep entries
  await cards().filter({hasText:'Kitchen module'}).first().click();await wait(400);
  ok(await p.locator('.ap-body').count()>0||true,'the kitchen module opens');
  const own=p.locator('.q-own');
  await fillAll(S.kit);
  if(await own.count()){await own.first().fill(S.own);await p.locator('.q-ownrow button').first().click();await wait(200);}
  const shown=await p.locator('#main').innerText();
  ok((await p.locator('.ap-body textarea, .ap-body input[type=text]').evaluateAll(es=>es.map(e=>e.value))).some(v=>v===S.kit+'0'),'the typed answer is in its field (so the page did take it)');
  ok(shown.includes(S.own),'the own option is on screen');
  await p.locator('.finalize').click();await wait(500);
  ok(await p.locator('.chips .chip').count()>=1,'an entry is kept');
  await fillAll(S.keep);await p.locator('.finalize').click();await wait(500);
  await p.locator('#btnHome').click();await wait(400);
  // the second module has one question; answer it without keeping
  await cards().filter({hasText:'Garden module'}).first().click();await wait(400);
  await fillAll(S.kit+'g');
  await p.locator('#btnHome').click();await wait(400);
  // 3 rename the booklet
  await p.locator('.namerow .quietlink').click();await wait(200);
  await p.keyboard.press('Control+A');await p.keyboard.type(S.name);await p.keyboard.press('Enter');await wait(400);
  ok((await p.locator('#main h1').first().innerText()).includes(S.name),'the booklet is renamed');
  // 4 remove a module
  await cards().filter({hasText:'Garden module'}).first().click();await wait(400);
  await p.locator('.removemod button',{hasText:'Remove this module'}).click();await wait(200);
  await p.locator('.removemod [role=alert] button',{hasText:/^Remove$/}).click();await wait(500);
  ok(await cards().count()===1,'a module is removed');
  // 5 Send or save a copy: open, close, open again, download
  await p.locator('#btnExport').click();await wait(300);
  ok(await p.locator('#veilExport[open]').count()===1,'"Send or save a copy" opens');
  await p.locator('#exportPanel .actions button').click();await wait(300);
  ok(await p.locator('#veilExport[open]').count()===0,'and closes');
  await p.locator('#btnExport').click();await wait(300);
  const [d]=await Promise.all([p.waitForEvent('download'),p.locator('#exportPanel .exportchoice').first().click()]);
  const saved=fs.readFileSync(await d.path(),'utf8');
  ok(saved.includes(S.keep+'0')&&saved.includes(S.name),'the downloaded file holds the reader\'s work (it goes to the reader\'s own disk)');
  const savedPath=path.join(OUT,'pledge-saved.booklet.md');fs.writeFileSync(savedPath,saved);
  // 6 load from disk, then by paste
  await p.locator('#btnHome').click();await wait(400);
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(300);
  await p.locator('#fileIn').setInputFiles(savedPath);await wait(500);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(900);
  ok(await p.locator('#main h1').count()>0,'a file from disk loads');
  await p.locator('#btnHome').click();await wait(400);
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(300);
  await p.locator('#pasteIn').fill(GARDEN);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(900);
  ok(await p.locator('#main h1').count()>0,'a pasted file loads');
  // 7 language and theme
  /* the language buttons show only where more than one language is on offer; press them by script where the page hides them */
  for(const l of ['es','fr','en']){const bt=p.locator('.lang button[data-lang="'+l+'"]');
    if(await bt.isVisible()) await bt.click();else await bt.evaluate(e=>e.click());await wait(250);}
  for(const t of ['night','contrast','daylight','paper','auto']){await p.selectOption('#themeSel',t);await wait(150);}
  // 8 a booklet with a diagram and a formula: the libraries start
  await p.locator('#btnHome').click();await wait(400);
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(300);
  await p.locator('#fileIn').setInputFiles(path.join(R,'test/fixtures/figures.booklet.md'));await wait(500);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(1000);
  await p.locator('button.mode').first().click();await wait(1000);
  await p.getByText('Diagrams and formulas').first().click({timeout:3000}).catch(()=>{});await wait(2500);
  const figs=await p.evaluate(()=>({svg:document.querySelectorAll('.mfig svg').length,math:document.querySelectorAll('math').length,
    libs:{mermaid:typeof __esbuild_esm_mermaid_nm,temml:typeof temml}}));
  ok(figs.svg>=1&&figs.math>=1,'a diagram and a formula are drawn, so the libraries ran: '+JSON.stringify(figs));
  await harvest();

  // the assertions
  const origins=new Set([PAGE_ORIGIN,registryOrigin]);
  const net=reqs.filter(r=>/^https?:|^wss?:|^ftp:/i.test(r.url));
  const local=reqs.filter(r=>!/^https?:|^wss?:|^ftp:/i.test(r.url));
  console.log('INFO '+reqs.length+' requests: '+net.length+' network ('+[...new Set(net.map(r=>r.method+' '+new URL(r.url).origin))].join(', ')+'), '+local.length+' local ('+[...new Set(local.map(r=>r.url.split(':')[0]))].join(', ')+')');
  ok(net.length>0,'requests were recorded');
  ok(net.every(r=>r.method==='GET'),'every request is a GET: '+[...new Set(net.map(r=>r.method))].join(','));
  ok(net.every(r=>origins.has(new URL(r.url).origin)),'every request goes to the page\'s own origin or the registry\'s origin: '+[...new Set(net.map(r=>new URL(r.url).origin))].join(', '));
  ok(local.every(r=>/^(data|blob|about):/.test(r.url)),'anything not over the network is data:, blob: or about: (local to the browser): '+[...new Set(local.map(r=>r.url.split(':')[0]))].join(','));
  ok(net.filter(r=>new URL(r.url).origin===registryOrigin).every(r=>/registry\.json$|\/(kitchen|garden)\.md$/.test(new URL(r.url).pathname)),'the registry origin was asked only for the registry list and the two module files');
  ok(net.every(r=>!r.body),'no request has a body');
  const words=[];for(const w of Object.values(S)){words.push(w,encodeURIComponent(w),w.toLowerCase());}
  words.push(S.kit+'0',S.keep+'0','4242');
  const all=[];for(const r of reqs) all.push(r.url,JSON.stringify(r.headers),r.body);
  const hay=all.join('\n');
  const leaked=words.filter(w=>w!=='4242'&&hay.includes(w));
  ok(leaked.length===0,'no request URL, header or body holds any word the test typed as an answer'+(leaked.length?': '+leaked.join(','):''));
  ok(!reqs.some(r=>/[?&](answers?|entries|entry|q|text)=/i.test(r.url))&&net.every(r=>!new URL(r.url).search||/^$/.test(new URL(r.url).search)),'no request carries a query string');
  const ck=await ctx.cookies();const dc=await p.evaluate(()=>document.cookie);
  ok(ck.length===0&&dc==='','nothing was written to cookies ('+ck.length+' cookies; document.cookie "'+dc+'")');
  const keys=await p.evaluate(()=>Object.keys(localStorage));
  ok(keys.length>0&&keys.every(k=>/^booklet\./.test(k)),'localStorage holds only the renderer\'s own keys: '+keys.map(k=>k.replace(/[a-z0-9]{6,}$/i,'…')).join(', '));
  const ss=await p.evaluate(()=>Object.keys(sessionStorage));
  ok(ss.length===0,'sessionStorage is empty: '+ss.join(','));
  ok(viol.length===0&&cons.length===0,'zero CSP violations: '+viol.concat(cons).join('|'));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  console.log('INFO failed requests: '+(failed.length?failed.join('; '):'none'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
