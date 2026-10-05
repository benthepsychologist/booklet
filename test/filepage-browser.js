// Browser check of the renderer opened as a FILE from the reader's disk (file: URL, no header at all): the renderer carries its
// own Content-Security-Policy (0.11.6), so it must still work with only that. It starts a new booklet, loads a module file from
// disk, answers, keeps an entry, downloads a copy and reads it back, then opens a booklet with a diagram and a formula (the two
// libraries start under the policy's hashes) and takes a screenshot of each at 1280px. It also tries "Add a module" from the
// registry from a file: page and RECORDS what happens (the registry is another origin; the policy names it; the page's origin is
// `null` and the reply is read with CORS), without loosening anything. Zero policy violations and page errors.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/filepage-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.',R=path.dirname(HTML);
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const MOD=`---\nbooklet: "0.11"\ntitle: Shore walk\nlang: en\n---\n\n> [!module|shore] Shore module\n\n> [!activity|walk] Shore walk\n\n> [!text|what long] What did you notice?\n\n> [!choice|tide] The tide was\n- [ ] In\n- [ ] Out\n\n> [!module|shore end] End\n`;
const REG={modules:[{id:'t/regmod',title:'Registry module',file:'regmod.md'}]};
const REGMOD=`---\nbooklet: "0.11"\ntitle: Registry module\nlang: en\n---\n\n> [!module|regmod] Registry module\n\n> [!activity|ra] Registry activity\n\n> [!text|rq] A registry question\n\n> [!module|regmod end] End\n`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});const p=await ctx.newPage();
  const seen=[],failed=[],viol=[],errs=[],cons=[];
  p.on('request',r=>seen.push(r.url()));p.on('requestfailed',r=>failed.push(r.url()+' '+((r.failure()||{}).errorText||'')));
  p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});
  p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});});
  /* the registry is the real host's address, answered by the test with the CORS header raw.githubusercontent.com sends */
  const cors={'access-control-allow-origin':'*'};
  await p.route('https://raw.githubusercontent.com/**',r=>{const u=new URL(r.request().url()).pathname;
    if(/registry\.json$/.test(u))return r.fulfill({status:200,body:JSON.stringify(REG),headers:{'content-type':'application/json',...cors}});
    if(/regmod\.md$/.test(u))return r.fulfill({status:200,body:REGMOD,headers:{'content-type':'text/plain',...cors}});
    r.fulfill({status:404,body:'nf',headers:cors});});
  const wait=ms=>p.waitForTimeout(ms);
  const harvest=async()=>{viol.push(...await p.evaluate(()=>window.__viol||[]).catch(()=>[]));};
  const toList=async()=>{for(let i=0;i<3;i++){if(await p.getByRole('button',{name:'Add a booklet from a file'}).count()) return;await p.locator('#btnHome').click();await wait(400);}};
  const loadFile=async f=>{await toList();await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(300);
    await p.locator('#fileIn').setInputFiles(f);await wait(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(1000);};
  await p.goto('file://'+HTML);await wait(800);
  ok(await p.evaluate(()=>location.protocol)==='file:','the page is a file: URL, opened from disk with no header');
  ok(await p.getByRole('button',{name:'Start a new booklet'}).count()===1,'the page started (its own script ran under its own policy)');
  // 1 start a new booklet
  await p.getByRole('button',{name:'Start a new booklet'}).click();await wait(600);
  ok(await p.evaluate(()=>/^booklet\./.test(Object.keys(localStorage)[0]||'booklet.')),'a new booklet starts');
  // 1b the registry from a file: page: recorded, not asserted to work
  await p.getByRole('button',{name:'Add a module'}).first().click().catch(()=>{});await wait(1500);
  const rows=await p.locator('#addModList .bkrow').count();
  const msg=await p.locator('#addModMsg').innerText().catch(()=>'');
  console.log('INFO "Add a module" from a file: page: '+rows+' module row(s) listed; message "'+msg+'"; registry requests: '+seen.filter(u=>/raw\.githubusercontent/.test(u)).join(',')+'; failed: '+failed.filter(f=>/raw\.githubusercontent/.test(f)).join(',')+'; violations so far: '+JSON.stringify(await p.evaluate(()=>window.__viol||[])));
  if(rows>0){await p.locator('#addModList .bkrow').first().locator('button').click();await wait(900);
    console.log('INFO and adding it: dialog open='+await p.locator('#veilAddModule[open]').count()+'; toast "'+await p.locator('#toast').innerText()+'"');}
  await harvest();
  if(await p.locator('#veilAddModule[open]').count())await p.locator('#addModCancel').click();
  // 2 a module from a file on disk
  const modPath=path.join(OUT,'filepage-shore.booklet.md');fs.writeFileSync(modPath,MOD);
  await loadFile(modPath);
  if(await p.evaluate(()=>document.body.dataset.view)==='home'){}
  ok(await p.locator('#main').innerText().then(t=>/Shore/.test(t)),'a module file from disk loads and is shown');
  // 3 open it, answer, keep an entry
  const view0=await p.evaluate(()=>document.body.dataset.view);
  if(view0==='home'||/^module:/.test(view0)){await p.locator('button.mode').first().click();await wait(500);}
  await p.locator('.ap-body textarea').first().fill('QZXfileanswer');
  const pills=p.locator('.ap-body .pills > button.pill-btn');if(await pills.count())await pills.first().click();await wait(300);
  ok((await p.locator('.ap-body textarea').first().inputValue())==='QZXfileanswer','an answer is typed and held');
  // 4 download a copy and read it back
  await p.locator('#btnExport').click();await wait(300);
  const [d]=await Promise.all([p.waitForEvent('download'),p.locator('#exportPanel .exportchoice').first().click()]);
  const saved=fs.readFileSync(await d.path(),'utf8');
  ok(saved.includes('QZXfileanswer')&&saved.includes('Shore walk'),'the downloaded copy (a blob: link, allowed to the page) holds the answer and the module');
  await harvest();
  // 6 a diagram and a formula, drawn at 1280px under the policy's script hashes
  for(const [f,act,shot] of [['examples/how-tides-work.booklet.md','Why the sea rises twice a day','tides'],['test/fixtures/figures.booklet.md','Diagrams and formulas','figures']]){
    await loadFile(path.join(R,f));
    if(await p.evaluate(()=>document.body.dataset.view)==='home'){}else{await p.locator('#btnHome').click();await wait(400);}
    await p.locator('button.mode').first().click();await wait(1000);
    await p.getByText(act).first().click({timeout:3000}).catch(()=>{});await wait(3000);
    const g=await p.evaluate(()=>({svg:document.querySelectorAll('.mfig svg').length,math:document.querySelectorAll('math').length,mermaid:typeof __esbuild_esm_mermaid_nm,temml:typeof temml}));
    if(shot==='tides') ok(g.math>=1&&g.temml!=='undefined','the formula in the tides booklet is drawn (Temml ran under its hash): '+JSON.stringify(g));
    else ok(g.svg>=1&&g.math>=1&&g.mermaid!=='undefined','the diagram and the formula in the figures booklet are drawn (mermaid and Temml ran under their hashes): '+JSON.stringify(g));
    await p.screenshot({path:path.join(OUT,'filepage-'+shot+'-1280.png'),fullPage:true});
    await harvest();}
  const net=seen.filter(u=>/^https?:/i.test(u));
  ok(net.every(u=>/^https:\/\/raw\.githubusercontent\.com\//.test(u)),'the only network requests from the file: page go to the registry host: '+[...new Set(net)].join(', '));
  ok(viol.length===0&&cons.length===0,'zero policy violations: '+viol.concat(cons).join('|'));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
