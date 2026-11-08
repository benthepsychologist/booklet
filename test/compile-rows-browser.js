// Browser check that a compiled page draws rows that open as the renderer does (compile/views.js; format 0.20), in a real Chromium.
// test/compile-assets/compile-rows.booklet.md (eighteen queries over inline data, made up) is opened twice:
//   - in the renderer (booklet.html, the hosted app), with every row opened;
//   - as a compiled page, with scripting OFF, every disclosure opened by pressing its summary (native, no script).
// For each query, the words on the page, in order, must be the same: the same rows, the same open parts (each field under its
// label), the same group heads with their counts, the same order. Words only for a screen reader and the table's grid headings
// (which the renderer draws as real headings) are left out of both. It asserts, too:
//   - the compiled page with scripting ON says the same words as with scripting off (the reading script changes no row);
//   - nothing is stored, no request leaves the page's own files, no error;
//   - at 360 px wide, with every row open, the page does not scroll sideways.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/compile-rows-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','booklet.html'));
const OUT=path.resolve(process.argv[3]||'.','compile-rows-pages');
const C=require('../compile/compile.js');
const K=require('./compile-browser-kit.js');
const FIX=path.join(__dirname,'compile-assets','compile-rows.booklet.md');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};

fs.rmSync(OUT,{recursive:true,force:true});
const run=C.compile([{file:FIX}],{form:'standalone',renderer:HTML,browser:false});
C.write(run,OUT,{force:true});
ok(run.results[0].rep.ok,'the rows booklet compiles');
const PAGE=run.results[0].rep.pages.filter(f=>f.endsWith('index.html')).find(f=>/garden/.test(f))||run.results[0].rep.pages.filter(f=>f.endsWith('index.html'))[0];
const {BASE,serve}=K.server(OUT),{storage}=K;

/* the words of a view, in order, leaving out what is for a screen reader and the grid headings the compiler draws for a nested table */
const WORDS=`(root)=>{const out=[];const skip=e=>e.closest&&e.closest('.bk-sr,.dv-sr,[aria-hidden=true],thead,.bk-dv-thead');
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const t=n.textContent.replace(/\\s+/g,' ').trim();if(!t||skip(n.parentElement)) continue;out.push(t);}return out;}`;
/* press every shut summary a visible one at a time, outermost first, until none is left (a native disclosure: no script) */
async function openAll(p){
  for(let round=0;round<12;round++){
    const n=await p.locator('details:not([open]) > summary:visible').count();if(!n) return;
    for(let k=0;k<n;k++){try{await p.locator('details:not([open]) > summary:visible').first().click({timeout:3000});}catch(e){break;}}}}
const compiledWords=p=>p.evaluate(`(()=>{const w=${WORDS};return [...document.querySelectorAll('[data-bk-view]')].map(v=>w(v));})()`);

(async()=>{
  const b=await chromium.launch();
  /* the renderer */
  let R=[];
  {const ctx=await b.newContext({viewport:{width:1100,height:1000}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
   await p.route('https://bookletmd.test/**',async r=>{const u=new URL(r.request().url()).pathname;
     if(u==='/app/') return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}});
     r.fulfill({status:404,body:'nf'});});
   await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(500);
   await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
   await p.locator('#fileIn').setInputFiles(FIX);await p.waitForTimeout(500);
   await p.locator('[role=dialog][open] button, dialog[open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(1000);
   if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(400);}
   await p.locator('button.mode').first().click();await p.waitForTimeout(1000);
   /* a row's open part is drawn when it opens (the pipeline's toggle listener): open every one, deepest last, until none is shut */
   for(let i=0;i<12;i++){const n=await p.evaluate(()=>{const ds=[...document.querySelectorAll('#main .dv-body details:not([open])')];ds.forEach(d=>{d.open=true;});return ds.length;});if(!n) break;await p.waitForTimeout(150);}
   R=await p.evaluate(`(()=>{const w=${WORDS};return [...document.querySelectorAll('#main .dv-body')].map(x=>w(x));})()`);
   ok(errs.length===0,'the renderer logs no error ('+errs.join('; ')+')');
   await ctx.close();}
  ok(R.length===18,'the renderer draws all eighteen queries ('+R.length+')');

  /* the compiled page, scripting off */
  let Coff=[];
  {const ctx=await b.newContext({viewport:{width:1100,height:1000},javaScriptEnabled:false});const p=await ctx.newPage();
   const reqs=[],errs=[];p.on('request',r=>reqs.push(r.url()));p.on('console',m=>{if(m.type()==='error') errs.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
   await p.goto('file://'+path.join(OUT,PAGE));
   const shut=await p.locator('details:not([open])').count();
   await openAll(p);
   ok(shut>0&&await p.locator('details:not([open])').count()===0,'with scripting off, every row opens by pressing its summary ('+shut+' disclosures, all native)');
   Coff=await compiledWords(p);
   const sw=await ctx.newPage();await sw.setViewportSize({width:360,height:800});await sw.goto('file://'+path.join(OUT,PAGE));await openAll(sw);
   const w=await sw.evaluate(()=>document.documentElement.scrollWidth);
   ok(w<=360,'at 360 px wide, with every row open, the page does not scroll sideways ('+w+')');
   ok(reqs.every(u=>u.startsWith('file://')),'no request leaves the page\'s own files');
   ok(errs.length===0,'no error ('+errs.join('; ')+')');
   await ctx.close();}
  ok(Coff.length===18,'the compiled page draws all eighteen queries ('+Coff.length+')');
  for(let i=0;i<18;i++){const a=JSON.stringify(R[i]||[]),c=JSON.stringify(Coff[i]||[]);
    ok(a===c,'query '+(i+1)+': the compiled page says what the renderer says, in the same order'+(a===c?'':'\n   renderer: '+a+'\n   compiled: '+c));}

  /* the compiled page, scripting on: the same words */
  {const ctx=await b.newContext({viewport:{width:1100,height:1000},javaScriptEnabled:true});const reqs=[],errs=[];await serve(ctx,reqs);
   const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error') errs.push(m.text());});
   await p.goto(BASE+PAGE);await p.evaluate(()=>document.fonts.ready);await openAll(p);
   const Con=await compiledWords(p);
   ok(JSON.stringify(Con)===JSON.stringify(Coff),'with scripting on, every query says the same words as with scripting off ('+Con.length+' queries)');
   const st=await storage(p);ok(st.local===0&&st.session===0&&!st.cookie&&st.idb===0,'nothing is stored');
   ok(reqs.every(u=>u.startsWith(BASE)),'no request but the page\'s own files');
   ok(errs.length===0,'no error ('+errs.join('; ')+')');
   await ctx.close();}
  await b.close();
  console.log(fails.length?'\n'+fails.length+' FAILURES':'\ncompile rows browser passed');process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
