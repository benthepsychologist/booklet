// Browser check of the renderer opened as a FILE from the reader's disk (file: URL, no header at all): the renderer carries its
// own Content-Security-Policy (0.11.6), so it must still work with only that. It starts a new booklet, loads a module file from
// disk, answers, keeps an entry, downloads a copy and reads it back, then opens a booklet with a diagram and a formula (the two
// libraries start under the policy's hashes) and takes a screenshot of each at 1280px. It also tries "Add a module" from the
// registry from a file: page and RECORDS what happens (the registry is another origin; the policy names it; the page's origin is
// `null` and the reply is read with CORS), without loosening anything. Zero policy violations and page errors.
// 0.13.1 (item 11): the renderer is a core and its parts. With parts/ beside the file (the repository as it stands) the diagram draws
// from disk, the file asking for nothing but parts/mermaid.js from its own folder; with the file alone (a copy saved on its own,
// made here in a folder with no parts/) the diagram shows its source with the part note and the formula still draws, and putting
// parts/ beside it makes the diagram draw. The one-file build holds every part, so it is drawn without any.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/filepage-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const {kept}=require('./kept.js');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.',R=path.join(__dirname,'..');
const PARTS=require('./parts.js'),HAS_PART=PARTS.has(HTML,'mermaid');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const MOD=`---\nbooklet: "0.13"\ntitle: Shore walk\nlang: en\n---\n\n> [!module|shore] Shore module\n\n> [!activity|walk] Shore walk\n\n> [!text|what long] What did you notice?\n\n> [!choice|tide] The tide was\n- [ ] In\n- [ ] Out\n\n> [!module|shore end] End\n`;
const REG={modules:[{id:'t/regmod',title:'Registry module',file:'regmod.md'}]};
const REGMOD=`---\nbooklet: "0.13"\ntitle: Registry module\nlang: en\n---\n\n> [!module|regmod] Registry module\n\n> [!activity|ra] Registry activity\n\n> [!text|rq] A registry question\n\n> [!module|regmod end] End\n`;
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
  {const K=await kept(p);ok(Object.keys(K).some(k=>/^booklet\.b\./.test(k))&&JSON.parse(K['booklet.library.v1']||'{"entries":[]}').entries.length===1,'a new booklet starts, and is kept in this browser (from a file: page too)');}
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
  if(await p.evaluate(()=>document.body.dataset.view)==='@home'){}
  ok(await p.locator('#main').innerText().then(t=>/Shore/.test(t)),'a module file from disk loads and is shown');
  // 3 open it, answer, keep an entry
  const view0=await p.evaluate(()=>document.body.dataset.view);
  if(view0==='@home'||/^module:/.test(view0)){await p.locator('button.mode').first().click();await wait(500);}
  await p.locator('.ap-body textarea').first().fill('QZXfileanswer');
  const pills=p.locator('.ap-body .pills > button.pill-btn');if(await pills.count())await pills.first().click();await wait(300);
  ok((await p.locator('.ap-body textarea').first().inputValue())==='QZXfileanswer','an answer is typed and held');
  // 4 download a copy and read it back
  const [d]=await Promise.all([p.waitForEvent('download'),p.locator('#btnExport').click()]);
  const saved=fs.readFileSync(await d.path(),'utf8');
  ok(saved.includes('QZXfileanswer')&&saved.includes('Shore walk'),'the downloaded copy (a blob: link, allowed to the page) holds the answer and the module');
  await harvest();
  // 6 a diagram and a formula, drawn at 1280px under the policy's script hashes
  for(const [f,act,shot] of [['examples/how-tides-work.booklet.md','Why the sea rises twice a day','tides'],['test/fixtures/figures.booklet.md','Diagrams and formulas','figures']]){
    await loadFile(path.join(R,f));
    if(await p.evaluate(()=>document.body.dataset.view)==='@home'){}else{await p.locator('#btnHome').click();await wait(400);}
    await p.locator('button.mode').first().click();await wait(1000);
    await p.getByText(act).first().click({timeout:3000}).catch(()=>{});await wait(3000);
    const g=await p.evaluate(()=>({svg:document.querySelectorAll('.mfig svg').length,math:document.querySelectorAll('math').length,mermaid:typeof __esbuild_esm_mermaid_nm,temml:typeof temml}));
    if(shot==='tides') ok(g.math>=1&&g.temml!=='undefined','the formula in the tides booklet is drawn (Temml ran under its hash): '+JSON.stringify(g));
    else ok(g.svg>=1&&g.math>=1&&g.mermaid!=='undefined','the diagram and the formula in the figures booklet are drawn (mermaid and Temml ran under their hashes): '+JSON.stringify(g));
    await p.screenshot({path:path.join(OUT,'filepage-'+shot+'-1280.png'),fullPage:true});
    await harvest();}
  /* the file's requests for a file: its own page, and, when the part is beside it, the part from its own folder and nothing else */
  const filesAsked=[...new Set(seen.filter(u=>/^file:/i.test(u)))];
  ok(filesAsked.every(u=>u==='file://'+HTML||u==='file://'+path.join(path.dirname(HTML),'parts','mermaid.js')),'from disk, the only files the page asks for are itself and, beside it, parts/mermaid.js: '+filesAsked.join(', '));
  ok(HAS_PART===filesAsked.includes('file://'+path.join(path.dirname(HTML),'parts','mermaid.js')),'and it asked for the part exactly when the file does not hold it ('+HAS_PART+')');
  const net=seen.filter(u=>/^https?:/i.test(u));
  ok(net.every(u=>/^https:\/\/raw\.githubusercontent\.com\//.test(u)),'the only network requests from the file: page go to the registry host: '+[...new Set(net)].join(', '));
  ok(viol.length===0&&cons.length===0,'zero policy violations: '+viol.concat(cons).join('|'));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  // 7 the file on its own, with no parts/ beside it (a copy saved alone): the diagram shows its source, and the part is found once it is beside the file
  if(HAS_PART){
    const alone=path.join(OUT,'filepage-alone');fs.rmSync(alone,{recursive:true,force:true});fs.mkdirSync(alone,{recursive:true});
    fs.copyFileSync(HTML,path.join(alone,'booklet.html'));
    const q=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
    const v2=[],e2=[],f2=[];q.on('pageerror',e=>e2.push(e.message));q.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))v2.push(m.text());});
    q.on('request',r=>f2.push(r.url()));
    await q.goto('file://'+path.join(alone,'booklet.html'));await q.waitForTimeout(800);
    const load2=async()=>{await q.getByRole('button',{name:'Add a booklet from a file'}).click();await q.waitForTimeout(300);
      await q.locator('#fileIn').setInputFiles(path.join(R,'test/fixtures/figures.booklet.md'));await q.waitForTimeout(500);
      await q.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await q.waitForTimeout(1000);
      if(await q.evaluate(()=>document.body.dataset.view)!=='@home'){await q.locator('#btnHome').click();await q.waitForTimeout(400);}
      await q.locator('button.mode').first().click();await q.waitForTimeout(1000);
      await q.getByText('Diagrams and formulas').first().click({timeout:3000}).catch(()=>{});await q.waitForTimeout(2500);
      return q.evaluate(()=>({svg:document.querySelectorAll('.mfig svg').length,bad:[...document.querySelectorAll('.mfig.bad')].map(x=>x.innerText),math:document.querySelectorAll('math').length}));};
    const g=await load2();
    ok(g.svg===0&&g.bad.length===3&&g.bad.filter(x=>/part that draws diagrams could not be loaded/.test(x)).length===3&&g.bad.some(x=>/Sun --> Moon/.test(x))&&g.bad.some(x=>/New --> Spring/.test(x)),'the file alone, no parts/ beside it: every diagram shows its source with the note that its part could not be loaded ('+g.bad.length+' shown, '+g.svg+' drawn)');
    ok(g.math>=1,'and the formula, which the file holds, still draws ('+g.math+')');
    await q.screenshot({path:path.join(OUT,'filepage-alone-1280.png'),fullPage:true});
    ok(v2.length===0&&e2.length===0,'no policy violation and no page error without the part ('+v2.concat(e2).join('|')+')');
    ok(f2.filter(u=>/parts\/mermaid\.js$/.test(u)).length===1,'and during that open the missing part was asked for exactly once ('+f2.filter(u=>/parts\/mermaid\.js$/.test(u)).length+')');
    /* parts/ is put beside the file, and the same page opens the booklet again: the earlier failure held for that open only */
    fs.mkdirSync(path.join(alone,'parts'));fs.copyFileSync(PARTS.file(HTML,'mermaid'),path.join(alone,'parts','mermaid.js'));
    /* closed to "Your booklets" and opened again: a real next open */
    for(let i=0;i<4&&!await q.getByRole('button',{name:'Add a booklet from a file'}).count();i++){await q.locator('#btnHome').click();await q.waitForTimeout(400);}
    await q.locator('button.k').first().click();await q.waitForTimeout(700);
    /* a booklet of one activity opens straight into it */
    await q.waitForTimeout(2500);
    const g2=await q.evaluate(()=>document.querySelectorAll('.mfig svg').length);
    ok(g2===2,'parts/ put beside the file and the booklet opened again: the diagrams draw ('+g2+'), so the failure held for the earlier open only');
    ok(f2.filter(u=>/^https?:/.test(u)).length===0,'and nothing was asked of a network from the file ('+f2.filter(u=>/^https?:/.test(u)).join(',')+')');}
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
