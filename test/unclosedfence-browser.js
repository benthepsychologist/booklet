// Browser check of a booklet whose body ends inside a code fence that never closes (0.16.1; test/unclosedfence.test.js has the
// rest), in a real Chromium with the hosted /app/ Content-Security-Policy and the browser's own storage:
//  1. Add a module on such a booklet is refused in the dialog, with the reason, and nothing is added;
//  2. the browser's own copy of a booklet whose design after its records ends inside such a fence: after a real reload, and
//     after a Rename and a reload, the design is as it was (before 0.16.1 it gained the records region's lines in the fence);
//  3. work kept as records by a newer file that drops its module and ends inside such a fence, through a real reload and
//     a later newer file with the fence closed: still kept (before 0.16.1's fix that later file dropped it).
// Invented content. Usage: PLAYWRIGHT=/path/to/node_modules/playwright-core node test/unclosedfence-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const FM=t=>`---\nbooklet: "0.16"\ntitle: ${t}\nlang: en\n---\n`;
const ACT="\n> [!activity|a1] This week in the garden\n\n> [!text|q1] What grew this week?\n\n> [!text|q2] What needs water?\n\n";
const OPEN=FM('Seed shed')+ACT+"A reminder for the shed:\n\n```text\nwater the beans at dawn\n";
const REC="%%\n> [!records] App record — do not edit below this line\n\n```booklet answers\n{\"q1\": \"peas\"}\n```\n\n%%\n";
const MOVED=FM('Garden notes')+ACT+REC+"\n> [!text|q3] Anything else?\n\n```text\nmulch the beds\n";
const MODULE=FM('Seed swap')+"\n> [!module|seeds] Seed swap\n\n> [!activity|s1] What to swap\n\n> [!text|which] Which seeds?\n\n> [!module|seeds end]\n";
const MOD=id=>"\n> [!module|"+id+"] The "+id+"\n\n> [!activity|a1] This week\n\n> [!text|q1] What grew?\n\n> [!module|"+id+" end]\n";
const WEEK=[FM('Garden week')+MOD('beds')+MOD('shed'),FM('Garden week')+MOD('beds')+"\nA reminder for the shed:\n\n```text\nwater the beans at dawn\n",
  FM('Garden week')+MOD('beds')+"\nA reminder for the shed:\n\n```text\nwater the beans at dawn\n```\n"];
const REG={modules:[{id:'t/seeds',title:'Seed swap',file:'seeds.md'}]};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const bad=[];
  const page=async()=>{const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))bad.push(m.text());});p.on('pageerror',e=>bad.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.route('https://raw.githubusercontent.com/**',r=>{const u=new URL(r.request().url()).pathname,cors={'access-control-allow-origin':'*'};
      if(/registry\.json$/.test(u))return r.fulfill({status:200,body:JSON.stringify(REG),headers:{'content-type':'application/json',...cors}});
      if(/seeds\.md$/.test(u))return r.fulfill({status:200,body:MODULE,headers:{'content-type':'text/plain',...cors}});
      r.fulfill({status:404,body:'nf'});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);return p;};
  const loadFile=async(p,name,text)=>{const file=path.join(OUT,name);fs.writeFileSync(file,text);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(400);}};
  const source=p=>p.evaluate(()=>BOOK.raw.source);
  /* a real reload, then the booklet opened again from "Your booklets" */
  const reload=async(p,title)=>{await p.reload();await p.waitForTimeout(900);
    if(await p.evaluate(()=>document.body.dataset.view)==='@booklets'){await p.locator('#main button').filter({hasText:new RegExp('^'+title+'$')}).first().click();await p.waitForTimeout(700);}};

  /* ---- 1. Add a module, refused ---- */
  {const p=await page();await loadFile(p,'seed-shed.booklet.md',OPEN);
   const before=await source(p),modules=await p.evaluate(()=>BOOK.modules.length);
   await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(800);
   await p.locator('#addModList .bkrow').filter({hasText:'Seed swap'}).first().locator('button').click();await p.waitForTimeout(800);
   const msg=await p.locator('#addModMsg').innerText(),words=await p.evaluate(()=>STRINGS.en.problem.addFenceOpen);
   ok(msg===words,'1: Add a module on a booklet that ends inside a code fence that never closes is refused, and the dialog says why: '+msg);
   ok(await p.locator('#veilAddModule[open]').count()===1,'1: the dialog stays open');
   ok(await source(p)===before&&await p.evaluate(()=>BOOK.modules.length)===modules&&await p.evaluate(()=>!BOOK.modules.some(m=>m.id==='seeds')),'1: and nothing is added: the design is as it was');
   await p.context().close();}

  /* ---- 2. the browser's own copy, through a real reload and a Rename ---- */
  {const p=await page();await loadFile(p,'garden-notes.booklet.md',MOVED);
   const design=await source(p);
   ok(/```text\nmulch the beds\n$/.test(design)&&!design.includes('[!records]'),'2: (the design read from the file ends inside the fence and holds no records line)');
   await p.evaluate(()=>{answersIn("").q2="the squash";markDirty();});await p.waitForTimeout(900);
   await reload(p,'Garden notes');
   ok(await source(p)===design,'2: after a reload the design is as it was, with nothing of the records region in the fence: '+JSON.stringify((await source(p)).slice(-120)));
   ok(await p.evaluate(()=>peekAnswers("").q1==="peas"&&peekAnswers("").q2==="the squash"),'2: and the answers are kept, the file\'s and the one typed');
   const named=design.replace('title: Garden notes\n','title: "Garden notes in May"\n');
   await p.evaluate(()=>renameBooklet("Garden notes in May"));await p.waitForTimeout(600);
   ok(await source(p)===named,'2: a Rename changes the title line and nothing else of the design');
   await reload(p,'Garden notes in May');
   ok(await source(p)===named&&await p.evaluate(()=>peekAnswers("").q2==="the squash"),'2: and a reload after the Rename shows the same design: '+JSON.stringify((await source(p)).slice(-120)));
   await p.context().close();}

  /* ---- 3. work kept as records, through a newer file ending inside such a fence, a real reload, and a later newer file ----
     A newer file is read here as "Read the newer file" reads a store's (linkAccept, with no host): acceptWork, then
     finishLoad with the reader's work kept. */
  {const p=await page();await loadFile(p,'garden-week.booklet.md',WEEK[0]);
   const read=t=>p.evaluate(t=>{const R=parseFile(t),W=acceptWork(R);noteStoreFile(R);finishLoad(R,{keep:{S:W.S,D:W.D,dirty,unsavedEntries,records:W.records}});},t);
   const md=()=>p.evaluate(()=>toMarkdown());
   await p.evaluate(()=>{answersIn("shed").q1="snails";markDirty();});await p.waitForTimeout(900);
   await read(WEEK[1]);await p.waitForTimeout(900);
   ok(await source(p)===WEEK[1]&&/snails/.test(await md()),'3: a newer file that drops the module and ends inside the fence: the answer is kept as records beside the copy');
   await reload(p,'Garden week');
   ok(await source(p)===WEEK[1]&&/snails/.test(await md())&&await p.evaluate(()=>(BOOK.raw.records||[]).some(r=>r.scope==="shed")),'3: after a real reload, still kept, and known as kept records');
   await read(WEEK[2]);await p.waitForTimeout(900);
   const t=await md();
   ok(await source(p)===WEEK[2]&&t.includes('> [!records|shed]')&&/snails/.test(t),'3: a later newer file, the fence closed, keeps it: '+JSON.stringify(t.slice(-160)));
   await reload(p,'Garden week');
   ok(/snails/.test(await md()),'3: and so does a reload after it');
   await p.context().close();}

  ok(bad.length===0,'no policy violation or page error '+bad.join(' | '));
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'ALL PASSED');process.exit(fails.length?1:0);
})().catch(e=>{console.log('FAIL the check stopped: '+String((e&&e.stack)||e).split('\n').slice(0,4).join(' | '));process.exit(1);});
