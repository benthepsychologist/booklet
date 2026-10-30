// Browser check of what is left of the wiki item (renderer 0.12.0, item E) in 0.17, in a real page under the hosted Content-Security-Policy:
// the module wiki is gone (an activity line takes no `parent:`, SPEC.md section 3, "An activity does not sit under another"), so
//  - the committed fixture test/fixtures/wiki-scrambled.booklet.md (157 activities, most written with parent:) opens as a flat module: no
//    frame, no menu, no search, the notice says each parent: is a setting an activity line does not take; browsing it writes nothing;
//  - a flat module and the pages of an activity in it are as they were;
//  - a link to a module this booklet does not hold is a chip: nothing is requested to draw it; pressed, the registry is read, and
//    "Add it" adds the module and the chip becomes a link.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/wiki-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const {kept}=require('./kept.js');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const WIKI=fs.readFileSync(path.join(__dirname,'fixtures','wiki-scrambled.booklet.md'),'utf8');

const pages=[...WIKI.matchAll(/^> \[!activity\|(\S+)((?: [^\]]*)?)\] (.*)$/gm)].map(m=>({id:m[1],parent:((/parent:(\S+)/.exec(m[2]))||[])[1]||'',title:m[3].trim()}));
const FLAT=`---\nbooklet: "0.17"\ntitle: Flat\nlang: en\n---\n\n> [!module|f] Flat module\n\nOpening words.\n\n> [!activity|one] First\n\nOne.\n\n> [!activity|two] Second\n\nTwo.\n\n> [!activity|three] Third\n\nThree.\n\n> [!module|f end] End\n`;
const CHIP=`---\nbooklet: "0.17"\ntitle: Programme\nlang: en\n---\n\n> [!module|prog] Programme\n\n> [!activity|start] Start here\n\nThe first week: [[week-1.booklet]]. The second: [Week 2](week-2.booklet.md). A row below.\n\n\`\`\`booklet data\n[{"label":"Third week","link":"week-3.booklet"}]\n\`\`\`\n^weeks\n\n\`\`\`booklet query\nfrom: weeks\nas: list\n\`\`\`\n\n> [!activity|more] More\n\nMore.\n\n> [!module|prog end] End\n\n> [!module|week-1] Week 1\n\n> [!activity|w1] Words\n\nWeek one.\n\n> [!activity|w1b] More words\n\nStill week one.\n\n> [!module|week-1 end] End\n`;
const WEEK2=`---\nbooklet: "0.11"\ntitle: Week 2\nlang: en\n---\n\n> [!module|week-2] Week 2\n\n> [!activity|w2] Week two\n\nWeek two reading.\n\n> [!activity|w2b] More\n\nx\n\n> [!module|week-2 end] End\n`;
const REG={modules:[{id:'t/week-2',title:'Week 2',file:'week-2.md'}]};

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const errs=[],cons=[];
  const openBook=async(text,W,hook)=>{
    const ctx=await b.newContext({viewport:{width:W||1280,height:900}});const p=await ctx.newPage();p.reqs=[];
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
    p.on('request',r=>p.reqs.push(r.url()));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.route('https://raw.githubusercontent.com/**',async r=>{const u=new URL(r.request().url()).pathname;
      if(p.fileDelay&&!/registry\.json$/.test(u)) await new Promise(res=>setTimeout(res,p.fileDelay));
      if(p.regFail&&/registry\.json$/.test(u)) return r.fulfill({status:500,body:'no',headers:{'access-control-allow-origin':'*'}});
      r.fulfill({status:200,body:/registry\.json$/.test(u)?JSON.stringify(REG):WEEK2,headers:{'content-type':/json$/.test(u)?'application/json':'text/plain','access-control-allow-origin':'*'}});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(200);
    await p.evaluate(t=>{document.getElementById('pasteIn').value=t;},text);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(700);
    return p;};
  const h2=p=>p.locator('#main .wk-content h2, #main .col h2').first().innerText();
  const cards=p=>p.locator('#main .wk-cards button.mode');
  const focused=p=>p.evaluate(()=>{const a=document.activeElement;return a?a.tagName+'|'+(a.getAttribute('aria-current')||'')+'|'+(a.textContent||'').slice(0,40):'none';});
  const addr=p=>p.evaluate(()=>JSON.stringify([history.length,location.href]));
  const heights=(p,sel)=>p.locator(sel).evaluateAll(es=>es.slice(0,8).map(e=>Math.round(e.getBoundingClientRect().height)));
  const cardTitle=async(p,i)=>(await cards(p).nth(i).locator('.k').innerText()).trim();

  ok(pages.length===157&&pages.filter(q=>q.parent).length>100,'the fixture: '+pages.length+' activities, '+pages.filter(q=>q.parent).length+' written with parent:');


  /* ---- 0.17: the fixture, read as a file is read now ---- */
  let p=await openBook(WIKI,1280);
  ok(await p.locator('.wk-frame').count()===0&&await p.locator('.wk-tree').count()===0&&await p.locator('.wk-q').count()===0,'the fixture is no wiki: no frame, no menu, no search (an activity line takes no parent:)');
  ok(await p.locator('#main button.mode').count()>=Math.min(24,pages.length)&&await cards(p).count()===0,'its activities are the flat list of cards of any module, none under another');
  ok(await p.locator('.filenotes li').count()>=1&&/takes no “parent:”/.test(await p.locator('.filenotes').first().textContent()),'and the notice says so: a setting an activity line does not take');
  await p.context().close();

  /* ---- no storage writes while browsing ---- */
  const snap=pg=>pg.evaluate(async()=>{
    const ls={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls[k]=localStorage.getItem(k);}
    const idb={};
    if(indexedDB.databases){for(const d of await indexedDB.databases()){
      idb[d.name]=await new Promise(res=>{const r=indexedDB.open(d.name);r.onerror=()=>res('error');r.onsuccess=()=>{const db=r.result,out={};
        const names=[...db.objectStoreNames];if(!names.length){db.close();return res(out);}
        const tx=db.transaction(names,'readonly');let n=names.length;
        names.forEach(s=>{const g=tx.objectStore(s).getAll(),k=tx.objectStore(s).getAllKeys();g.onsuccess=()=>{k.onsuccess=()=>{out[s]=[k.result,g.result];if(--n===0){db.close();res(out);}};};});};});}}
    return JSON.stringify({ls,idb,cookie:document.cookie});});
  p=await openBook(WIKI,1280);await p.waitForTimeout(1500);
  p=await openBook(WIKI,1280);await p.waitForTimeout(1500);
  const before=await snap(p);
  ok(before.length>200,'the storage snapshot has the booklet\'s own save in it ('+before.length+' characters)');
  for(const i of [0,1,2]){await p.locator('#main button.mode').first().click();await p.waitForTimeout(150);await p.locator('#btnHome').click();await p.waitForTimeout(150);}
  await p.waitForTimeout(1500);
  ok(await snap(p)===before,'opening pages of it leaves localStorage, IndexedDB and cookies exactly as they were');
  await p.context().close();
  /* ---- a flat module is as it was ---- */
  p=await openBook(FLAT,1280);
  ok(await p.locator('.wk-frame').count()===0&&await cards(p).count()===0&&await p.locator('#main button.mode').count()===3,'a module with no parent: draws the flat list of three cards and no wiki frame');
  await p.locator('#main button.mode').nth(1).click();await p.waitForTimeout(300);
  ok(await p.locator('.wk-crumbs,.wk-menu,.wk-chips').count()===0&&await p.locator('.cd-next').count()===1,'and a page of it has no breadcrumbs, menu or mentions, only the old foot');
  await p.context().close();

  /* ---- an activity of three pages in a flat module: its pages are pagination (0.15), listed nowhere, turned by the pager ---- */
  {const MP='---\nbooklet: "0.17"\ntitle: MP\nlang: en\n---\n\n> [!module|mp] MP\n\n> [!activity|one] One\n\nTop.\n\n> [!activity|multi] Multi\n\n## First page\n\nAlpha content.\n\n***\n\n## Second page\n\nBeta content.\n\n***\n\n## Third page\n\nGamma content.\n\n> [!module|mp end] End\n';
   const pager=q=>q.locator('#main .cd-foot').innerText().then(t=>t.replace(/\s+/g,' ').trim());
   for(const W of [1280,390]){
     p=await openBook(MP,W);await p.locator('#main button.mode').nth(1).click();await p.waitForTimeout(300);
     ok((await h2(p)).trim()==='Multi'&&await p.locator('.wk-pitem').count()===0,W+' px: a three-page activity lists its pages nowhere');
     ok(/Page 1 of 3/.test(await pager(p)),W+' px: the pager at the foot says Page 1 of 3 ('+await pager(p)+')');
     await p.locator('#main .cd-foot .pg-next').click();await p.waitForTimeout(250);
     ok(/Beta content/.test(await p.locator('#main').innerText())&&/Page 2 of 3/.test(await pager(p)),W+' px: Next turns to the second page');
     await p.context().close();}}

  /* ---- a link to a module: a chip, and nothing asked until it is pressed ---- */
  p=await openBook(CHIP,1280);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  const asked=()=>p.reqs.filter(u=>!/^https:\/\/bookletmd\.test\//.test(u)&&!/^data:|^blob:/.test(u));
  ok(await p.locator('.mchip').count()===2,'links to modules not held are chips: one in the prose, one in a row\'s link role ('+await p.locator('.mchip').count()+')');
  ok(/Week 2[\s\S]*not in this booklet/.test((await p.locator('.mchip').allInnerTexts()).join('|'))&&/Third week[\s\S]*not in this booklet/.test((await p.locator('.mchip').allInnerTexts()).join('|')),'a chip names the module and says it is not in this booklet');
  ok(await p.locator('#main a.alink', {hasText:'Week 1'}).count()===1,'a module the booklet holds is a link');
  ok(asked().length===0,'drawing the page, chips and all, asked the network for nothing ('+asked().length+' requests outside the page)');
  ok((await heights(p,'.mchip')).every(h=>h>=44),'chips are at least 44 px tall ('+(await heights(p,'.mchip'))+')');
  const a1=await addr(p);
  await p.locator('#main a.alink',{hasText:'Week 1'}).click();await p.waitForTimeout(300);
  ok((await p.locator('#main h2').first().innerText()).trim()==='Week 1','a link to a held module opens it');
  await p.locator('#btnHome').click();await p.waitForTimeout(300);
  await p.locator('#main button.mode').filter({hasText:'Programme'}).first().click();await p.waitForTimeout(300);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  const chip=p.locator('.mchip',{hasText:'Week 2'}).first();
  ok(asked().length===0,'still nothing asked');
  p.regFail=true;
  await chip.click();await p.waitForTimeout(800);
  ok(asked().length===1&&/The module list could not be loaded/.test(await p.locator('.mc-ask').innerText())&&await p.locator('.mc-add').count()===0,'a registry that cannot be read is said so in Add a module\'s own words, with no offer');
  p.regFail=false;
  await chip.click();await p.waitForTimeout(800);
  ok(asked().length===2&&/registry\.json$/.test(asked()[1])&&await p.locator('.mc-add').count()===1,'pressing it again asks again (the registry list, once more), and now offers "Add it"');
  await p.locator('.mc-add').click();await p.waitForTimeout(900);
  ok(asked().length===3&&/week-2\.md$/.test(asked()[2]),'"Add it" reads that module\'s file, and nothing else');
  ok(/It says booklet: 0\.11, so it was read as format 0\.17/.test(await p.locator('#toast').innerText()),'a module marked "0.11" added from a chip shows the older-version notice, as Add a module does ('+(await p.locator('#toast').innerText()).slice(0,100)+')');
  await p.locator('#btnHome').click().catch(()=>{});await p.waitForTimeout(300);
  ok(await p.locator('#main button.mode').filter({hasText:'Week 2'}).count()===1,'the module is now in the booklet');
  await p.locator('#main button.mode').filter({hasText:'Programme'}).first().click();await p.waitForTimeout(300);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  ok(await p.locator('#main a.alink',{hasText:'Week 2'}).count()===1&&await p.locator('.mchip',{hasText:'Week 2'}).count()===0,'and its link is now a link, not a chip');
  ok(await addr(p)===a1,'pressing a chip, adding a module and following a held-module link left history.length and location.href as they were');
  await p.context().close();

  /* ---- "Add it" while the reader moves to another booklet: it is not added to that one ---- */
  p=await openBook(CHIP,1280);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  p.fileDelay=2500;
  await p.locator('.mchip',{hasText:'Week 2'}).first().click();await p.waitForTimeout(800);
  await p.locator('.mc-add').click();await p.waitForTimeout(300);
  await p.locator('#btnHome').click();await p.waitForTimeout(250);
  await p.locator('#btnHome').click();await p.waitForTimeout(300);
  await p.getByRole('button',{name:'Start a new booklet'}).click();await p.waitForTimeout(500);
  await p.waitForTimeout(3200);
  ok(!/Week 2/.test(await p.locator('#main').innerText())&&!Object.values(await kept(p)).join('\n').includes('Week two reading'),'a module still coming when the reader starts another booklet is not added to it, and nothing is saved for it');
  await p.context().close();

  ok(cons.length===0,'no Content Security Policy violation'+(cons.length?': '+cons[0]:''));
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await b.close();
  if(fails.length){console.log('\n'+fails.length+' FAILED');process.exit(1);}
  console.log('\nALL PASSED');})().catch(e=>{console.error(e);process.exit(1);});
