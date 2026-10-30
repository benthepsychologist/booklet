// Browser check of the compiler's lanes TOGETHER (compile 0.2.0, the join): script, pages, views, reading and figures were built in
// parallel, so this puts their output on one realistic booklet and uses it in Chromium with the compiler's real assembled script.
// The made-up booklet test/compile-assets/compile-join.booklet.md and its Spanish pair compile-join.es.booklet.md are a river trail
// guide: a contents page of cards, a quiet page of prose, and one deep page, "Reading the river", in three tabs:
//   What to see          two citation marks, two author folds, a graded pick-one with a hint and a solution, headings with share links;
//   Where you notice it  the body map's figure (one region has an id of its own), a citation and a graded pick-any question;
//   The numbers          a table and a bar chart over one data block (sortable, filterable), a line chart (neither), and a fold of
//                        the author's holding a drawn diagram and a citation.
// The Spanish pair has a deep page of its own (two tabs, a fold, a graded question), so the script's Spanish is used too.
// Both files are compiled in one run and served over http. The check asserts:
//   1 the build: the deep pages link booklet.js and the contents pages and quiet pages link none; the script on disk is the assembler's
//     own text and passes the assembler's pledge scan;
//   2 ids on every page, scripting on and off: none twice, every href="#..." lands, every aria-controls, aria-labelledby, aria-describedby
//     and label-for lands, and what carries the page's prefix (bk-<name>-<folder>-) is unique across the booklet and its translation;
//   3 behaviours working together on the deep page, each by a real press, key, hover or address: an address, a changed address, a text
//     link, a contents link and a link at a figure's region each reveal the hidden tab holding the target; sort and filter of a view keep
//     working across tab switches; Open all opens the folds in hidden tabs and never a hint or a solution, and the diagram in an opened
//     fold has its size; a quiz answers right and wrong and forgets on reload; the arrow keys move between tabs and do nothing while typing
//     in a search box; a citation's note shows beside its mark (in a tab, in a fold) and a note's back link reveals the tab of its mark;
//     a heading's copied link works inside a tab; print shows every tab, fold, figure and diagram (and a real PDF holds their words);
//   4 a phone width (390 px): no sideways scroll on any tab, the opened diagram and the figure fit;
//   5 scripting off: every tab under its name, folds closed as written, figure and diagram drawn, a quiz still answering, links landing;
//   6 pages side by side: the contents page's cards lead to the deep page and the crumb leads back, the way on reaches the quiet page, the
//     translation link leads to the Spanish page (where the script speaks Spanish) and back;
//   7 the pledge over the whole visit: only GETs for the page's own files, nothing written to or read from localStorage, sessionStorage,
//     cookies, IndexedDB or the cache, no eval, fetch, XHR, beacon, WebSocket, Image or document.write, no console or page error;
//   8 mutations: the same checks run on copies of the site broken once each (the hashchange reveal dropped, a diagram drawn at width 0, a
//     sort dead after a tab switch, Open all opening hints, a script that remembers picks, a script that makes a request, the arrow key
//     dropped, print leaving tabs hidden, a wrong answer mark, a banned word in a part): each must fail the check named for it.
// A real bug in the compiler that this finds goes in KNOWN below (id -> what it is): it is printed, does not fail CI, and is written up.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/compile-join-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),cp=require('child_process');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','booklet.html'));
const OUT=path.resolve(process.argv[3]||'.','compile-join-pages');
const C=require('../compile/compile.js'),S=require('../compile/script.js');
const ASSETS=path.join(__dirname,'compile-assets');
const BASE='http://localhost/';
const fails=[];
/* a known failure is a real bug in the compiler found by this check: it is printed, written up in the pull request, and does not fail CI.
   id -> what it is. Empty when there is none. */
const KNOWN={};

/* ---- the site: both booklets compiled in one run, as a site's build would ---- */
fs.rmSync(OUT,{recursive:true,force:true});
const SITE=path.join(OUT,'site');
const run=C.compile(['compile-join','compile-join.es'].map(n=>({file:path.join(ASSETS,n+'.booklet.md')})),{form:'standalone',renderer:HTML});
C.write(run,SITE,{force:true});
const report=C.reportText(run);

/* ---- recording: the baseline prints and fails; a mutation only collects the ids that failed ---- */
function baseline(){return {bad:[],chk(id,c,m){const known=Object.prototype.hasOwnProperty.call(KNOWN,id);
  console.log((c?'PASS ':known?'KNOWN FAILURE ':'FAIL ')+id+': '+m);if(!c&&!known) fails.push(id+': '+m);if(!c) this.bad.push(id);}};}
function quiet(){return {bad:[],chk(id,c){if(!c) this.bad.push(id);}};}

(async()=>{
  const b=await chromium.launch();
  try{
    /* ======================= 1. the build ======================= */
    {const rec=baseline();
      rec.chk('build-ok',run.results.length===2&&run.results.every(r=>r.rep.ok),'both booklets compile with '+path.basename(HTML));
      const page=n=>fs.readFileSync(path.join(SITE,n,'index.html'),'utf8');
      const links=h=>(h.match(/<script\b[^>]*\bsrc="[^"]*booklet\.js"[^>]*>/g)||[]);
      const deep=links(page('compile-join/deep'));
      rec.chk('deep-links-script',deep.length===1&&/src="\.\.\/\.\.\/booklet\/booklet\.js"/.test(deep[0])&&/\bdefer\b/.test(deep[0]),'the deep page links booklet.js once, deferred, from where its depth puts it ('+deep.join('')+')');
      const none=['compile-join','compile-join/quiet','compile-join.es','compile-join.es/quiet'].filter(n=>links(page(n)).length);
      rec.chk('quiet-pages-link-none',none.length===0,'the contents pages and the quiet pages (English and Spanish) link no script'+(none.length?' (they do: '+none.join(', ')+')':''));
      const esLinks=links(page('compile-join.es/deep'));
      rec.chk('es-deep-links-script',esLinks.length===1,'the Spanish deep page, which has tabs, a fold and a graded question of its own, links the script too ('+esLinks.length+')');
      rec.chk('report-names-script',/Script:/.test(report),'the build report says a page needs the script');
      const disk=fs.readFileSync(path.join(SITE,'booklet','booklet.js'),'utf8'),made=S.assemble();
      rec.chk('script-is-assemblers',disk.endsWith(made.text)&&made.parts.length>=6,'booklet.js on disk is the assembler\'s own text of its '+made.parts.length+' parts ('+made.parts.join(', ')+')');
      rec.chk('script-passes-scan',S.scan(disk).length===0,'the script passes the assembler\'s own pledge scan, stamp and all');
      rec.chk('page-has-the-parts',/data-bk-graded/.test(page('compile-join/deep'))&&/data-bk-view="table"/.test(page('compile-join/deep'))&&/<svg id="bk-compile-join-deep-dg\d+"/.test(page('compile-join/deep'))&&/bk-svgfig/.test(page('compile-join/deep'))&&/bk-mark-a/.test(page('compile-join/deep')),
        '(set up) the deep page holds a graded question, a view, a drawn diagram, a figure and citation marks');}

    /* the shared harness: a context that serves a site over http, records every request, traps every call the pledge forbids */
    const TRAP=()=>{const L=window.__bkTrap=[];const note=n=>L.push(n);
      try{['setItem','removeItem','clear','getItem'].forEach(k=>{const o=Storage.prototype[k];Storage.prototype[k]=function(){note('Storage.'+k);return o.apply(this,arguments);};});}catch(e){}
      try{const d=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');Object.defineProperty(document,'cookie',{get(){note('cookie.read');return d.get.call(document);},set(v){note('cookie.write');d.set.call(document,v);}});}catch(e){}
      try{const e0=window.eval;window.eval=function(){if(!/UtilityScript/.test(new Error().stack)) note('eval');return e0.apply(this,arguments);};   /* the test tool's own calls go through eval; the page's do not */}catch(e){}
      try{const f0=window.fetch;window.fetch=function(){note('fetch');return f0.apply(this,arguments);};}catch(e){}
      try{const o=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(){note('XMLHttpRequest');return o.apply(this,arguments);};}catch(e){}
      try{navigator.sendBeacon=function(){note('sendBeacon');return false;};}catch(e){}
      try{const W=window.WebSocket;window.WebSocket=function(){note('WebSocket');throw new Error('no');};window.WebSocket.prototype=W.prototype;}catch(e){}
      try{const o=document.write;document.write=function(){note('document.write');return o.apply(this,arguments);};}catch(e){}
      try{const o=IDBFactory.prototype.open;IDBFactory.prototype.open=function(){note('indexedDB.open');return o.apply(this,arguments);};}catch(e){}
      try{if(window.caches){const o=CacheStorage.prototype.open;CacheStorage.prototype.open=function(){note('caches.open');return o.apply(this,arguments);};}}catch(e){}
      try{const I=window.Image;window.Image=function(){note('new Image');return new I();};}catch(e){}};
    function visit(dir,o){o=o||{};
      return (async()=>{
        const ctx=await b.newContext({viewport:{width:o.width||1000,height:o.height||900},javaScriptEnabled:o.js!==false,permissions:o.js===false?[]:['clipboard-read','clipboard-write']});
        const reqs=[],errs=[],failed=[];
        await ctx.route(BASE+'**',route=>{const u=decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\//,'')),f=path.join(dir,u.endsWith('/')||!u?u+'index.html':u);
          if(!f.startsWith(dir)||!fs.existsSync(f)||!fs.statSync(f).isFile()) return route.fulfill({status:404,body:'not here'});
          const type=f.endsWith('.css')?'text/css':f.endsWith('.js')?'text/javascript':f.endsWith('.woff2')?'font/woff2':'text/html';
          return route.fulfill({status:200,contentType:type,body:fs.readFileSync(f)});});
        if(o.js!==false) await ctx.addInitScript(TRAP);
        const p=await ctx.newPage();p.setDefaultTimeout(o.timeout||15000);
        p.on('request',r=>reqs.push({url:r.url(),method:r.method()}));p.on('requestfailed',r=>failed.push(r.url()));
        p.on('response',r=>{if(r.status()>=400) failed.push(r.status()+' '+r.url());});
        p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error') errs.push(m.text());});
        return {ctx,p,reqs,errs,failed};})();}
    const settle=async p=>{await p.evaluate(()=>document.fonts.ready);};
    const DEEP=BASE+'compile-join/deep/';
    const REGION='bk-compile-join-deep-f1-cold-hands';

    /* small readers, all run in the page */
    const shown=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e) return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&e.checkVisibility();},sel);
    const tabOn=p=>p.evaluate(()=>{const t=document.querySelector('[role=tab][aria-selected=true]');return t?t.textContent.trim():'';});
    const rowsOf=(p,view,col)=>p.evaluate(([v,c])=>[...document.querySelectorAll(v+' [data-bk-row]')].filter(r=>r.checkVisibility()&&r.getClientRects().length).map(r=>(r.querySelector('[data-bk-col='+c+']')||{}).textContent),[view,col]);
    const foldState=p=>p.evaluate(()=>({
      folds:[...document.querySelectorAll('details.bk-fold:not(.bk-hint):not(.bk-solution)')].map(d=>d.open),
      aids:[...document.querySelectorAll('details.bk-hint,details.bk-solution')].map(d=>d.open)}));
    const diagram=p=>p.evaluate(()=>{const e=document.querySelector('.bk-diagram svg');if(!e) return null;const r=e.getBoundingClientRect();
      return {w:Math.round(r.width),h:Math.round(r.height),shown:e.checkVisibility()&&r.width>0&&r.height>0,
        words:[...e.querySelectorAll('text')].filter(t=>t.textContent.trim()&&t.getBoundingClientRect().width>0).length};});
    const ctlOf=(p,view)=>p.locator(view).evaluateHandle(e=>e.previousElementSibling);
    const clickTab=(p,name)=>p.getByRole('tab',{name}).click();
    const TABLE='[data-bk-view=table]',BARS='[data-bk-view=bars]';
    const TABLE_ORDER=['Alder Weir','Birch Ford','Cedar Bend','Dogwood Lock','Elm Sluice'];

    /* ======================= 2 to 6: the deep page, used ======================= */
    async function usePage(dir,rec,only){
      const want=n=>!only||only.includes(n);
      const t=await visit(dir,{timeout:only?2500:15000});const {ctx,p}=t;
      const section=async(name,fn)=>{if(!want(name)) return;try{await fn();}catch(e){rec.chk('crash-'+name,false,name+' stopped: '+String(e.message).split('\n')[0]);}};
      await p.goto(DEEP+'index.html');await settle(p);

      await section('tabs',async()=>{
        const tabs=await p.evaluate(()=>[...document.querySelectorAll('[role=tab]')].map(x=>x.getAttribute('aria-selected')+':'+x.textContent.trim()));
        rec.chk('tab-bar',tabs.join()==='true:What to see,false:Where you notice it,false:The numbers','the script makes a bar over the three tabs, opening on the first ('+tabs.join()+')');
        rec.chk('hidden-tabs-hidden',!(await shown(p,'.bk-svgfig svg'))&&!(await shown(p,TABLE)),'the figure (tab 2) and the table (tab 3) are out of sight while tab 1 shows');
      });

      /* a link or an address into a figure region inside a hidden tab */
      await section('reveal',async()=>{
        await p.goto(DEEP+'index.html#'+REGION);await settle(p);
        rec.chk('address-reveals-figure-tab',(await tabOn(p))==='Where you notice it'&&await shown(p,'#'+REGION),'an address that points at a figure\'s region (#'+REGION+') shows its tab and the region ('+await tabOn(p)+')');
        await p.goto(DEEP+'index.html');await settle(p);
        rec.chk('start-on-first-tab',(await tabOn(p))==='What to see','a plain address starts on the first tab ('+await tabOn(p)+')');
        await p.goto(DEEP+'index.html#'+REGION);   /* the same document, a new fragment: a hashchange, not a load */
        await p.waitForTimeout(150);
        rec.chk('hashchange-reveals-figure-tab',(await tabOn(p))==='Where you notice it'&&await shown(p,'#'+REGION),'a changed address (hashchange) into the figure\'s region shows its tab ('+await tabOn(p)+')');
        await p.goto(DEEP+'index.html#gauge-readings');await p.waitForTimeout(150);
        rec.chk('hashchange-reveals-numbers-tab',(await tabOn(p))==='The numbers'&&await shown(p,'#gauge-readings'),'…and a changed address to a heading in the third tab shows that tab ('+await tabOn(p)+')');
        /* links pressed with the mouse */
        await clickTab(p,'What to see');
        await p.locator('a.bk-link[href="#gauge-readings"]').click();
        rec.chk('text-link-reveals-tab',(await tabOn(p))==='The numbers'&&await shown(p,'#gauge-readings'),'a link in the text of tab 1 to a heading in tab 3 shows tab 3 ('+await tabOn(p)+')');
        await clickTab(p,'What to see');
        await p.locator('nav.bk-toc a[href="#where-you-notice-it"]').click();
        rec.chk('contents-link-reveals-tab',(await tabOn(p))==='Where you notice it','a link in "On this page" to the second tab\'s heading shows it ('+await tabOn(p)+')');
        await clickTab(p,'What to see');
        await p.evaluate(r=>{const a=document.createElement('a');a.id='join-test-link';a.href='#'+r;a.textContent='Join test link to a figure region';
          document.querySelector('.bk-lede').after(a);},REGION);   /* the format has no way to write a link to a region, so the test adds one the way a host page could */
        await p.locator('#join-test-link').click();
        rec.chk('region-link-reveals-tab',(await tabOn(p))==='Where you notice it'&&await shown(p,'#'+REGION),'a link whose target is a figure\'s region shows the figure\'s tab and the region ('+await tabOn(p)+')');
        const fig=await p.evaluate(()=>{const r=document.querySelector('.bk-svgfig svg').getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};});
        rec.chk('figure-has-size',fig.w>20&&fig.h>20,'the figure shown by a link has a size ('+JSON.stringify(fig)+')');
      });

      /* keyboard */
      await section('keys',async()=>{
        await p.goto(DEEP+'index.html');await settle(p);
        const at=()=>p.evaluate(()=>{const ts=[...document.querySelectorAll('[role=tab]')];return ts.findIndex(x=>x.getAttribute('aria-selected')==='true')+'/'+ts.findIndex(x=>x===document.activeElement)+'/'+ts.map(x=>x.tabIndex).join('');});
        await p.getByRole('tab',{name:'What to see'}).focus();
        await p.keyboard.press('ArrowRight');
        rec.chk('key-right',(await at())==='1/1/-10-1'&&await shown(p,'.bk-svgfig svg'),'ArrowRight moves to tab 2, the focus follows, and its figure shows ('+await at()+')');
        await p.keyboard.press('End');rec.chk('key-end',(await at())==='2/2/-1-10'&&await shown(p,TABLE),'End goes to the last tab and its table shows');
        await p.keyboard.press('ArrowRight');rec.chk('key-wrap',(await at()).startsWith('0/0'),'ArrowRight on the last wraps to the first');
        await p.keyboard.press('ArrowLeft');rec.chk('key-left-wrap',(await at()).startsWith('2/2'),'ArrowLeft on the first wraps to the last');
        await p.keyboard.press('Home');rec.chk('key-home',(await at()).startsWith('0/0'),'Home goes to the first');
        /* typing in the search box of a view, inside the third tab, must not move the tabs */
        await clickTab(p,'The numbers');
        await (await ctlOf(p,TABLE)).asElement().$('.bk-vbtn').then(x=>x.click());
        const box=(await ctlOf(p,TABLE)).asElement().$('.bk-vq');
        await (await box).fill('rising');await (await box).focus();
        await p.keyboard.press('ArrowLeft');await p.keyboard.press('ArrowRight');await p.keyboard.press('Home');await p.keyboard.press('End');
        rec.chk('keys-in-search-stay',(await tabOn(p))==='The numbers'&&(await rowsOf(p,TABLE,'gauge')).join()==='Alder Weir,Dogwood Lock','arrow keys, Home and End typed in a view\'s search box do not move the tabs and do not disturb the filter ('+await tabOn(p)+')');
      });

      /* sort and filter, across tab switches */
      await section('views',async()=>{
        await p.goto(DEEP+'index.html');await settle(p);
        const hidden=await p.evaluate(()=>[...document.querySelectorAll('.bk-vctl')].length);
        rec.chk('controls-in-hidden-tab',hidden===2,'both views, in a tab that was hidden when the page loaded, have their sort and filter controls ('+hidden+')');
        await clickTab(p,'The numbers');
        const line=await p.evaluate(()=>{const v=document.querySelector('[data-bk-view=line]'),r=v.querySelector('svg').getBoundingClientRect();return {before:v.previousElementSibling&&v.previousElementSibling.className,rows:v.querySelectorAll('[data-bk-row]').length,w:Math.round(r.width),h:Math.round(r.height)};});
        rec.chk('line-chart-left-alone',!/bk-vctl/.test(line.before||'')&&line.rows===0&&line.w>100&&line.h>50,'the line chart beside them has no sort or filter and is drawn at its size ('+JSON.stringify(line)+')');
        const ctl=async(v,sel)=>(await ctlOf(p,v)).asElement().$(sel);
        await (await ctl(TABLE,'.bk-vbtn')).click();
        await (await ctl(TABLE,'.bk-vsel')).selectOption({label:'height'});
        rec.chk('sort-asc',(await rowsOf(p,TABLE,'gauge')).join()==='Elm Sluice,Birch Ford,Alder Weir,Dogwood Lock,Cedar Bend','the table sorts by Height as numbers, smallest first ('+(await rowsOf(p,TABLE,'gauge')).join()+')');
        await (await ctl(TABLE,'.bk-vdir')).click();
        rec.chk('sort-desc',(await rowsOf(p,TABLE,'gauge')).join()==='Cedar Bend,Dogwood Lock,Alder Weir,Birch Ford,Elm Sluice','…and the direction button reverses it');
        await (await ctl(TABLE,'.bk-vq')).fill('ris');
        rec.chk('filter-sorted',(await rowsOf(p,TABLE,'gauge')).join()==='Dogwood Lock,Alder Weir','a filter on top of the sort keeps the sort (rising: Dogwood Lock, Alder Weir)');
        /* away and back, by the mouse */
        await clickTab(p,'What to see');await clickTab(p,'The numbers');
        rec.chk('sort-kept-after-tab-switch',(await rowsOf(p,TABLE,'gauge')).join()==='Dogwood Lock,Alder Weir'&&await p.evaluate(()=>document.querySelector('.bk-vq').value==='ris'),'after leaving the tab and coming back the sorted, filtered view is as it was');
        await (await ctl(TABLE,'.bk-vq')).fill('steady');
        rec.chk('filter-after-tab-switch',(await rowsOf(p,TABLE,'gauge')).join()==='Birch Ford,Elm Sluice','a new filter typed after the switch still works, in the sort still on (steady, largest first)');
        /* away and back, by the keyboard, then change the sort */
        await p.getByRole('tab',{name:'The numbers'}).focus();await p.keyboard.press('ArrowLeft');await p.keyboard.press('ArrowLeft');await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');
        await (await ctl(TABLE,'.bk-vsel')).selectOption({label:'gauge'});
        rec.chk('sort-after-tab-switch',(await rowsOf(p,TABLE,'gauge')).join()==='Birch Ford,Elm Sluice','the sort changed after two tab switches by key still works (a new column starts smallest first: Gauge, steady: '+(await rowsOf(p,TABLE,'gauge')).join()+')');
        await (await ctl(TABLE,'.bk-vclear')).click();
        rec.chk('clear-after-tab-switch',(await rowsOf(p,TABLE,'gauge')).join()===TABLE_ORDER.join(),'Clear puts back the order written');
        /* the bars, first used after the visit */
        await clickTab(p,'Where you notice it');await clickTab(p,'The numbers');
        await (await ctl(BARS,'.bk-vbtn')).click();
        await (await ctl(BARS,'.bk-vsel')).selectOption({label:'height'});
        rec.chk('bars-sort-after-visit',(await rowsOf(p,BARS,'gauge')).join()==='Elm Sluice,Birch Ford,Alder Weir,Dogwood Lock,Cedar Bend','the bar chart sorts when first used after a visit to other tabs');
        await (await ctl(BARS,'.bk-vq')).fill('o');
        rec.chk('bars-filter',(await rowsOf(p,BARS,'gauge')).join()==='Birch Ford,Dogwood Lock','…and filters ("o": Birch Ford, Dogwood Lock, smallest first: '+(await rowsOf(p,BARS,'gauge')).join()+')');
        rec.chk('views-independent',(await rowsOf(p,TABLE,'gauge')).join()===TABLE_ORDER.join(),'the table beside it is untouched by the chart\'s sort and filter');
        rec.chk('numbers-table-untouched',await p.evaluate(()=>{const t=document.querySelectorAll('[data-bk-view=bars] .bk-ch-nums tbody tr');return t.length===5&&!document.querySelector('.bk-ch-nums [data-bk-row]');}),'the chart\'s own table of numbers carries no row marks and keeps its five rows');
      });

      /* Open all, folds in hidden tabs, hints and solutions, the diagram's size */
      await section('folds',async()=>{
        await p.goto(DEEP+'index.html');await settle(p);
        const sw=p.getByRole('switch',{name:'Open all'});
        rec.chk('one-switch',await sw.count()===1&&await p.evaluate(()=>document.querySelector('.bk-foldsw').parentElement.classList.contains('bk-activity')||!!document.querySelector('.bk-foldsw').closest('.booklet')),'the activity has one "Open all" switch');
        let d0=await diagram(p);
        rec.chk('diagram-hidden-at-start',d0&&!d0.shown,'the diagram waits in its shut fold in a hidden tab ('+JSON.stringify(d0)+')');
        await p.locator('details.bk-hint > summary').click();      /* a hint opened by hand */
        await sw.click();
        let st=await foldState(p);
        rec.chk('open-all-opens-hidden-folds',st.folds.length===3&&st.folds.every(Boolean),'Open all opens all three of the author\'s folds, two in the shown tab and one in a hidden tab ('+st.folds+')');
        rec.chk('open-all-spares-hints',st.aids.length===2&&st.aids[0]===true&&st.aids[1]===false,'…but touches no hint or solution: the hint opened by hand stays open, the solution stays shut ('+st.aids+')');
        await clickTab(p,'The numbers');
        const d1=await diagram(p);
        rec.chk('diagram-has-size',d1&&d1.shown&&d1.w>=200&&d1.h>=20&&d1.words>=4,'the diagram in the opened fold, in a tab opened after, is drawn at its size, with its words ('+JSON.stringify(d1)+')');
        rec.chk('switch-on',await sw.getAttribute('aria-checked')==='true','the switch reads on');
        await sw.click();
        st=await foldState(p);
        rec.chk('open-all-closes',st.folds.every(o=>!o)&&st.aids[0]===true,'pressed again it folds the author\'s folds and still leaves the hint ('+st.folds+' '+st.aids+')');
        await p.locator('details.bk-fold:not(.bk-hint):not(.bk-solution) > summary').last().click();
        const d2=await diagram(p);
        rec.chk('fold-by-hand-draws-diagram',d2&&d2.shown&&d2.w>=200,'a fold opened by hand in the shown tab shows the diagram at its size ('+JSON.stringify(d2)+')');
        rec.chk('switch-follows-hand',await sw.getAttribute('aria-checked')==='false','…and the switch, with two folds still shut, reads off');
      });

      /* quiz: right and wrong, hint and solution, forgetting on reload */
      await section('quiz',async()=>{
        await p.goto(DEEP+'index.html');await settle(p);
        const q1='fieldset[data-bk-kind=choice]';
        const live=()=>p.locator(q1+' .bk-live').textContent();
        const seen=(sel)=>shown(p,q1+' '+sel);
        rec.chk('quiz-quiet-at-start',!(await seen('.bk-v-right'))&&!(await seen('.bk-v-wrong'))&&!(await seen('.bk-say-ok'))&&(await live())==='','before any pick no verdict and no reply is shown');
        await p.getByLabel('The calm patch by the bank').check();
        rec.chk('quiz-wrong',await p.evaluate(()=>{const o=document.querySelector('fieldset[data-bk-kind=choice] .bk-opt:nth-child(1)');const v=o.querySelector('.bk-v-wrong'),r=o.querySelector('.bk-reply'),s=document.querySelector('fieldset[data-bk-kind=choice] .bk-say-no');
            return v.checkVisibility()&&r.checkVisibility()&&s.checkVisibility()&&!document.querySelector('fieldset[data-bk-kind=choice] .bk-say-ok').checkVisibility()&&s.textContent.endsWith('The channel in the middle.');})
          &&(await live())==='Not quite. The answer is The channel in the middle.','a wrong pick shows "Not quite", its reply and the answer, and the live region speaks it ('+await live()+')');
        rec.chk('quiz-answer-marked',await p.evaluate(()=>{const o=document.querySelector('fieldset[data-bk-kind=choice] .bk-opt.bk-right .bk-v-answer');return !!o&&o.checkVisibility();}),'…and the right option is marked as the answer although it was not picked');
        await p.getByLabel('The channel in the middle').check();
        rec.chk('quiz-right',await p.evaluate(()=>{const o=document.querySelector('fieldset[data-bk-kind=choice] .bk-opt.bk-right');return o.querySelector('.bk-v-right').checkVisibility()&&o.querySelector('.bk-reply').checkVisibility()&&document.querySelector('fieldset[data-bk-kind=choice] .bk-say-ok').checkVisibility();})
          &&(await live())==='Right.','the right pick shows "Right", its reply, and the live region says "Right."');
        await p.locator(q1+' details.bk-hint > summary').click();
        rec.chk('hint-opens',await p.getByText('Think about where a boat').isVisible()&&!(await p.getByText('The middle of the channel, because').isVisible()),'the hint opens by pressing it and the solution stays shut');
        await p.locator(q1+' details.bk-solution > summary').click();
        rec.chk('solution-opens',await p.getByText('The middle of the channel, because').isVisible(),'the solution opens by pressing it');
        /* pick-any, in the second tab */
        await clickTab(p,'Where you notice it');
        const q2='fieldset[data-bk-kind=multi]';
        await p.getByLabel('Numb fingers').check();
        rec.chk('multi-check-appears',await shown(p,q2+' .bk-check-btn'),'ticking one option brings up Check');
        await p.getByLabel('A warm face').check();
        await p.locator(q2+' .bk-check-btn').click();
        rec.chk('multi-checked',await p.evaluate(()=>{const q=document.querySelector('fieldset[data-bk-kind=multi]');const no=q.querySelector('.bk-say-no');return no.checkVisibility()&&q.querySelector('.bk-opt:nth-child(2) .bk-v-wrong').checkVisibility()&&q.querySelector('.bk-opt:nth-child(1) .bk-v-right').checkVisibility();})
          &&/^Not quite/.test(await p.locator(q2+' .bk-live').textContent()),'Check marks every option, says "Not quite" and the live region speaks it');
        await p.getByLabel('A warm face').uncheck();
        rec.chk('multi-tick-turns-check-off',await p.evaluate(()=>!document.querySelector('fieldset[data-bk-kind=multi] .bk-check').checked)&&(await p.locator(q2+' .bk-live').textContent())==='','changing a tick turns Check off and quiets the live region');
        await p.getByLabel('Slow, clumsy steps').check();await p.locator(q2+' .bk-check-btn').click();
        rec.chk('multi-right',await p.evaluate(()=>document.querySelector('fieldset[data-bk-kind=multi] .bk-say-ok').checkVisibility())&&(await p.locator(q2+' .bk-live').textContent())==='Right.','both right options ticked, Check says "Right."');
        /* forgets on reload */
        await p.reload();await settle(p);
        const after=await p.evaluate(()=>({checked:document.querySelectorAll('input:checked').length,open:document.querySelectorAll('details[open]').length,live:[...document.querySelectorAll('.bk-live')].map(x=>x.textContent).join(''),tab:(document.querySelector('[role=tab][aria-selected=true]')||{}).textContent}));
        rec.chk('quiz-forgets-on-reload',after.checked===0&&after.open===0&&after.live===''&&after.tab==='What to see','a reload brings back every question unanswered, every fold shut and the first tab ('+JSON.stringify(after)+')');
      });

      /* citations, in a hidden tab, and the back link into one */
      await section('cites',async()=>{
        await p.goto(DEEP+'index.html');await settle(p);
        await p.locator('a.bk-mark-a[href="#bk-note-2"]').hover();
        rec.chk('cite-hover',await p.evaluate(()=>{const k=document.querySelector('.bk-peek');return !!k&&!k.hidden&&/Slow River Handbook/.test(k.textContent)&&!k.querySelector('[id]')&&!k.querySelector('.bk-back');}),'hovering the mark in tab 1 shows its note beside it, with no id and no back link in the copy');
        await p.keyboard.press('Escape');
        await p.mouse.move(5,5);
        await clickTab(p,'Where you notice it');
        await p.locator('a.bk-mark-a[href="#bk-note-3"]').focus();
        rec.chk('cite-focus-in-tab',await p.evaluate(()=>{const k=document.querySelector('.bk-peek');const r=k.getBoundingClientRect();return !k.hidden&&/Walker/.test(k.textContent)&&r.left>=0&&r.right<=innerWidth;}),'focusing the mark in tab 2 shows its note, inside the window');
        await p.keyboard.press('Escape');
        rec.chk('cite-escape',await p.evaluate(()=>document.querySelector('.bk-peek').hidden),'Escape closes the box');
        await p.locator('a.bk-mark-a[href="#bk-note-3"]').click();
        rec.chk('cite-click-goes-to-foot',await p.evaluate(()=>location.hash==='#bk-note-3')&&await shown(p,'#bk-note-3'),'pressing the mark still goes to its note at the foot');
        await clickTab(p,'The numbers');
        await p.locator('#bk-note-3 a.bk-back').click();
        rec.chk('back-link-reveals-tab',(await tabOn(p))==='Where you notice it'&&await shown(p,'#bk-ref-3'),'the note\'s back link, pressed while another tab shows, shows the tab that holds the mark ('+await tabOn(p)+')');
      });

      /* a citation inside a fold, inside a tab that was hidden */
      await section('citefold',async()=>{
        await p.goto(DEEP+'index.html');await settle(p);
        await p.getByRole('switch',{name:'Open all'}).click();
        await clickTab(p,'The numbers');
        await p.locator('a.bk-mark-a[href="#bk-note-4"]').hover();
        rec.chk('cite-in-fold',await p.evaluate(()=>{const k=document.querySelector('.bk-peek');const r=k.getBoundingClientRect();return !k.hidden&&/little height every mile/.test(k.textContent)&&r.left>=0&&r.right<=innerWidth&&r.top>=0;}),'a citation in a fold in the third tab, once opened, shows its note beside the mark, inside the window');
      });

      /* the heading's copied link, inside tabs */
      await section('share',async()=>{
        await p.goto(DEEP+'index.html');await settle(p);
        await clickTab(p,'The numbers');
        await p.locator('#gauge-readings a.bk-anchor').click();
        const clip=await p.evaluate(()=>navigator.clipboard.readText());
        rec.chk('share-copies',clip===DEEP+'index.html#gauge-readings'||clip===DEEP+'#gauge-readings','a heading\'s link in the third tab copies its whole address ('+clip+')');
        rec.chk('share-says',await p.locator('.bk-said',{hasText:'Link copied'}).waitFor({timeout:3000}).then(()=>true,()=>false)&&await p.evaluate(()=>location.hash==='#gauge-readings'),'…says "Link copied" and still goes to the heading');
      });

      /* print */
      await section('print',async()=>{
        await p.goto(DEEP+'index.html');await settle(p);
        /* a real print to PDF on a fresh load (the browser fires beforeprint itself), where pdftotext is on the machine */
        let have=false;try{cp.execFileSync('pdftotext',['-v'],{stdio:'ignore'});have=true;}catch(e){have=false;}
        if(!have&&!only) console.log('NOTE print-pdf-words: pdftotext is not on this machine, so the real PDF of the page was not read');
        if(have&&!only){
          await p.goto(DEEP+'index.html');await settle(p);
          const pdf=path.join(OUT,'deep.pdf');fs.writeFileSync(pdf,await p.pdf({format:'A4'}));
          const text=cp.execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
          const need=['Stand on the bank','Foam gathers where two currents','A seam is where slow water','Think about where a boat','The middle of the channel, because','Hands','A cold bank is felt first','Numb fingers','Alder Weir','Cedar Bend','Spring','Stream','Learn the bank before the water'];
          const miss=need.filter(w=>!text.includes(w));
          rec.chk('print-pdf-words',miss.length===0&&!/Open all/.test(text),'a real PDF of the page holds the words of every tab, the closed folds (hint and solution too), the figure, the table, the diagram\'s labels and the notes, and no "Open all" switch'+(miss.length?' (missing: '+miss.join(', ')+')':''));
          const after=await foldState(p);
          rec.chk('print-pdf-folds-close',after.folds.every(o=>!o)&&after.aids.every(o=>!o),'…and after the real print the folds are shut again');
        }
        await p.goto(DEEP+'index.html');await settle(p);
        await p.emulateMedia({media:'print'});
        await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
        const pr=await p.evaluate(()=>({tabs:[...document.querySelectorAll('section.bk-tab')].map(s=>s.getBoundingClientRect().height>0&&s.checkVisibility()),
          bar:[...document.querySelectorAll('.bk-tabbar')].some(e=>e.getBoundingClientRect().height>0),
          fig:[...document.querySelectorAll('.bk-svgfig svg')].every(e=>e.getBoundingClientRect().height>0&&e.checkVisibility()),
          dia:[...document.querySelectorAll('.bk-diagram svg')].map(e=>e.checkVisibility()&&e.getBoundingClientRect().width>200),
          folds:[...document.querySelectorAll('details.bk-fold')].every(d=>d.open),
          rows:[...document.querySelectorAll('[data-bk-row]')].every(r=>r.checkVisibility()),
          vctl:[...document.querySelectorAll('.bk-vctl')].some(e=>e.checkVisibility()&&e.getBoundingClientRect().height>0)}));
        rec.chk('print-tabs',pr.tabs.length===3&&pr.tabs.every(Boolean)&&!pr.bar,'printed, all three tabs are shown and the tab bar is left off ('+JSON.stringify(pr.tabs)+' bar '+pr.bar+')');
        rec.chk('print-figure-diagram',pr.fig&&pr.dia.length===1&&pr.dia[0],'…the figure and the diagram are in view at their size');
        rec.chk('print-folds-rows',pr.folds&&pr.rows,'…every fold is open and every row of the views is there');
        await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
        await p.emulateMedia({media:'screen'});
        const back=await foldState(p);
        rec.chk('print-folds-close-again',back.folds.every(o=>!o)&&back.aids.every(o=>!o),'after printing the folds are shut again as written');
      });

      /* the pledge, over everything this page was used for */
      await section('pledge',async()=>{
        const trap=await p.evaluate(()=>window.__bkTrap.slice());
        rec.chk('pledge-no-forbidden-call',trap.length===0,'the page called no storage, cookie, eval, fetch, XMLHttpRequest, beacon, WebSocket, document.write, IndexedDB, cache or Image'+(trap.length?' ('+trap.join(', ')+')':''));
        const kept=await p.evaluate(async()=>{let dbs=[];try{dbs=indexedDB.databases?await indexedDB.databases():[];}catch(e){}let ck=[];try{ck=window.caches?await caches.keys():[];}catch(e){}
          return {local:localStorage.length,session:sessionStorage.length,cookie:document.cookie,idb:dbs.length,caches:ck.length};});
        rec.chk('pledge-nothing-kept',kept.local===0&&kept.session===0&&kept.cookie===''&&kept.idb===0&&kept.caches===0,'nothing is in localStorage, sessionStorage, a cookie, IndexedDB or the cache ('+JSON.stringify(kept)+')');
        const own=t.reqs.filter(r=>!r.url.startsWith(BASE)&&!r.url.startsWith('data:'));
        const odd=t.reqs.filter(r=>r.url.startsWith(BASE)&&!/\.(html|css|js|woff2)$|\/$/.test(new URL(r.url).pathname));
        rec.chk('pledge-own-files-only',own.length===0&&odd.length===0&&t.reqs.every(r=>r.method==='GET'||r.url.startsWith('data:')),'every request is a GET for one of the booklet\'s own pages, stylesheet, script or fonts ('+t.reqs.length+' requests'+(own.length?'; outside: '+own[0].url:'')+(odd.length?'; odd: '+odd[0].url:'')+')');
        rec.chk('pledge-all-load',t.failed.length===0,'every file the page asks for loads'+(t.failed.length?' (failed: '+t.failed[0]+')':''));
        rec.chk('pledge-no-errors',t.errs.length===0,'no console error and no page error in the whole visit'+(t.errs.length?' ('+t.errs[0]+')':''));
      });
      await ctx.close();}

    {const rec=baseline();await usePage(SITE,rec,null);}

    /* ======================= 2. ids, scripting on and off ======================= */
    {const rec=baseline();
      const audit=()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
        const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
        const hrefs=[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href')).filter(h=>h.length>1);
        const dead=hrefs.filter(h=>{let id=h.slice(1);try{id=decodeURIComponent(id);}catch(e){}return !document.getElementById(id);});
        const refs=[];for(const a of ['aria-controls','aria-labelledby','aria-describedby']) document.querySelectorAll('['+a+']').forEach(e=>e.getAttribute(a).split(/\s+/).filter(Boolean).forEach(x=>refs.push([a,x])));
        const lost=refs.filter(([a,x])=>!document.getElementById(x)).map(([a,x])=>a+'='+x);
        const forLost=[...document.querySelectorAll('label[for]')].filter(l=>!document.getElementById(l.htmlFor)).map(l=>l.htmlFor);
        const own=ids.filter(x=>x.startsWith('bk-compile-join'));
        return {n:ids.length,dup:[...new Set(dup)],hrefs:hrefs.length,dead,refs:refs.length,lost,forLost,own};};
      const PAGES=['compile-join/','compile-join/deep/','compile-join/quiet/','compile-join.es/','compile-join.es/deep/','compile-join.es/quiet/'];
      const allOwn=[];
      for(const js of [true,false]){
        const {ctx,p}=await visit(SITE,{js});
        for(const pg of PAGES){await p.goto(BASE+pg+'index.html');await settle(p);
          if(js&&pg==='compile-join/deep/'){await p.getByRole('tab',{name:'The numbers'}).click();await p.locator('.bk-vbtn').first().click();}   /* with the script's own additions all in place */
          const a=await p.evaluate(audit);
          rec.chk('ids-'+(js?'on-':'off-')+pg,a.dup.length===0&&a.dead.length===0&&a.lost.length===0&&a.forLost.length===0&&a.n>=1,
            pg+' with scripting '+(js?'on':'off')+': '+a.n+' ids, none twice, '+a.hrefs+' same-page links and '+a.refs+' aria references all land'+(a.dup.length?' (twice: '+a.dup.join(', ')+')':'')+(a.dead.length?' (dead: '+a.dead.join(', ')+')':'')+(a.lost.length?' (lost: '+a.lost.join(', ')+')':'')+(a.forLost.length?' (label for: '+a.forLost.join(', ')+')':''));
          if(js) allOwn.push(...a.own.map(x=>pg+' '+x));}
        await ctx.close();}
      const ids=allOwn.map(x=>x.split(' ')[1]);
      const deepEn=allOwn.filter(x=>x.startsWith('compile-join/deep/')).map(x=>x.split(' ')[1]);
      rec.chk('ids-prefix',deepEn.length>=10&&deepEn.every(x=>x.startsWith('bk-compile-join-deep-')),'every question, input, figure and diagram id on the deep page carries its page\'s prefix bk-compile-join-deep- ('+deepEn.length+' ids)');
      rec.chk('ids-prefix-unique',ids.filter(x=>/^bk-compile-join(-es)?-(deep|quiet)-/.test(x)).length===new Set(ids.filter(x=>/^bk-compile-join(-es)?-(deep|quiet)-/.test(x))).size,'a prefixed id is not written twice anywhere in the booklet or its translation');
      const withTab=await (async()=>{const {ctx,p}=await visit(SITE,{});await p.goto(DEEP+'index.html');await settle(p);
        const r=await p.evaluate(()=>[...document.querySelectorAll('[role=tab]')].map(x=>x.id+'>'+x.getAttribute('aria-controls')));await ctx.close();return r;})();
      rec.chk('ids-script-made',withTab.length===3&&withTab.every(x=>/^bk-tb-\d+-\d>/.test(x)),'the ids the script makes for its tab buttons (bk-tb-…) are its own and do not clash with the page\'s ('+withTab.join(' ')+')');}

    /* ======================= phone width: every tab, the folds opened ======================= */
    {const rec=baseline();const {ctx,p,errs}=await visit(SITE,{width:390,height:800});
      await p.goto(DEEP+'index.html');await settle(p);
      const wide=()=>p.evaluate(()=>({doc:document.documentElement.scrollWidth,win:innerWidth,over:[...document.querySelectorAll('.booklet *')].filter(e=>e.checkVisibility()&&e.getBoundingClientRect().right>innerWidth+1&&!e.closest('.bk-table,.bk-tabbar,pre,svg')).slice(0,3).map(e=>e.tagName+'.'+e.className)}));
      let w=await wide();rec.chk('phone-tab-1',w.doc<=w.win&&w.over.length===0,'at 390 px wide the first tab does not scroll sideways ('+JSON.stringify(w)+')');
      await p.getByRole('switch',{name:'Open all'}).click();
      for(const [i,name] of ['Where you notice it','The numbers'].entries()){await clickTab(p,name);w=await wide();
        rec.chk('phone-tab-'+(i+2),w.doc<=w.win&&w.over.length===0,'…and so does tab '+(i+2)+', with the folds open ('+JSON.stringify(w)+')');}
      const d=await diagram(p),f=await p.evaluate(()=>{const r=document.querySelector('.bk-diagram svg').getBoundingClientRect();return Math.round(r.right);});
      rec.chk('phone-diagram-fits',d&&d.shown&&d.w>100&&f<=391,'the opened diagram fits the phone\'s width ('+JSON.stringify(d)+', right edge '+f+')');
      await (await ctlOf(p,TABLE)).asElement().$('.bk-vbtn').then(x=>x.click());
      w=await wide();rec.chk('phone-views-bar',w.doc<=w.win&&w.over.length===0,'the sort and filter bar, opened, fits the phone\'s width ('+JSON.stringify(w)+')');
      await clickTab(p,'Where you notice it');
      const fig=await p.evaluate(()=>{const r=document.querySelector('.bk-svgfig svg').getBoundingClientRect();return {w:Math.round(r.width),right:Math.round(r.right)};});
      rec.chk('phone-figure',fig.w>20&&fig.right<=391,'the figure fits the phone\'s width ('+JSON.stringify(fig)+')');
      rec.chk('phone-no-errors',errs.length===0,'…and no error is logged'+(errs.length?' ('+errs[0]+')':''));
      await ctx.close();}

    /* ======================= 4. scripting off ======================= */
    {const rec=baseline();const {ctx,p,errs}=await visit(SITE,{js:false});
      await p.goto(DEEP+'index.html');await settle(p);
      const off=await p.evaluate(()=>({roles:document.querySelectorAll('[role=tab],[role=tablist],button').length,
        tabs:[...document.querySelectorAll('section.bk-tab')].map(s=>s.checkVisibility()&&s.getBoundingClientRect().height>0),
        heads:[...document.querySelectorAll('section.bk-tab > h2')].map(h=>h.textContent.replace('#','').trim()),
        hidden:[...document.querySelectorAll('.booklet [hidden]')].filter(e=>e.checkVisibility()).length,
        shut:[...document.querySelectorAll('details.bk-fold')].every(d=>!d.open),
        fig:[...document.querySelectorAll('.bk-svgfig svg')].map(e=>e.checkVisibility()&&e.getBoundingClientRect().width>20),
        rows:[...document.querySelectorAll('[data-bk-row]')].every(r=>r.checkVisibility()),
        dia:(()=>{const s=document.querySelector('.bk-diagram svg');return s?{shapes:s.querySelectorAll('rect,path,polygon').length,words:[...s.querySelectorAll('text')].length,inShutFold:!!s.closest('details:not([open])')}:null;})()}));
      rec.chk('off-every-tab',off.roles===0&&off.tabs.length===3&&off.tabs.every(Boolean)&&off.heads.join('|')==='What to see|Where you notice it|The numbers','scripting off: no tab bar and no button, all three tabs are on the page under their names ('+off.heads.join(' | ')+')');
      rec.chk('off-folds-closed',off.shut&&off.hidden===0,'…every fold is closed as written, and nothing the reader should see is hidden');
      rec.chk('off-figure-diagram-drawn',off.fig.length===1&&off.fig[0]&&off.dia&&off.dia.shapes>0&&off.dia.words>=4&&off.dia.inShutFold,'…the figure is in view and the diagram is drawn (its shapes and words are in the page), waiting in its shut fold');
      rec.chk('off-rows',off.rows,'…every row of the table and the chart is in view in the order written');
      await p.locator('details.bk-fold:not(.bk-hint):not(.bk-solution) > summary').last().click();
      const d=await diagram(p);
      rec.chk('off-fold-opens-diagram',d&&d.shown&&d.w>=200&&d.words>=4,'…pressing the diagram\'s fold opens it by hand and the diagram has its size ('+JSON.stringify(d)+')');
      await p.getByLabel('The calm patch by the bank').check();
      rec.chk('off-quiz',await p.evaluate(()=>document.querySelector('fieldset[data-bk-kind=choice] .bk-say-no').checkVisibility()&&document.querySelector('fieldset[data-bk-kind=choice] .bk-opt.bk-right .bk-v-answer').checkVisibility()),'…a pick-one still answers with the stylesheet alone ("Not quite", and the answer marked)');
      await p.locator('a.bk-link[href="#gauge-readings"]').click();
      rec.chk('off-link',await p.evaluate(()=>location.hash==='#gauge-readings')&&await shown(p,'#gauge-readings'),'…a link to a heading lands on it');
      rec.chk('off-no-errors',errs.length===0,'…and no error is logged'+(errs.length?' ('+errs[0]+')':''));
      /* the quiet pages are the same with scripting on or off, and the contents page has none */
      for(const pg of ['compile-join/','compile-join/quiet/']){await p.goto(BASE+pg+'index.html');
        const n=await p.evaluate(()=>[...document.scripts].filter(s=>s.src).length);rec.chk('off-no-script-'+pg,n===0,pg+' has no script element with a source ('+n+')');}
      await ctx.close();}

    /* ======================= 5. two pages side by side ======================= */
    {const rec=baseline();
      const {ctx,p,reqs,errs}=await visit(SITE,{});
      await p.goto(BASE+'compile-join/index.html');await settle(p);
      const cards=await p.evaluate(()=>({n:document.querySelectorAll('li.bk-card').length,titles:[...document.querySelectorAll('a.bk-card-title')].map(a=>a.textContent+'>'+a.getAttribute('href')),
        sc:[...document.scripts].filter(s=>s.src).length,lang:document.documentElement.lang}));
      rec.chk('contents-cards',cards.n===2&&cards.titles.join()==='Reading the river>deep/,A quiet page>quiet/','the contents page has a card for each page ('+cards.titles.join(', ')+')');
      rec.chk('contents-no-script',cards.sc===0,'…and loads no script, with scripting on');
      await p.locator('a.bk-card-title',{hasText:'Reading the river'}).click();
      rec.chk('card-to-deep',new URL(p.url()).pathname==='/compile-join/deep/'||new URL(p.url()).pathname==='/compile-join/deep/index.html','the card leads to the deep page ('+p.url()+')');
      await settle(p);
      rec.chk('deep-script-runs',await p.evaluate(()=>document.querySelectorAll('[role=tab]').length)===3,'…where the script is at work (the tab bar is there)');
      await p.locator('p.bk-crumb a').click();
      rec.chk('crumb-back',new URL(p.url()).pathname.replace(/index\.html$/,'')==='/compile-join/','the line above the page leads back to the contents ('+p.url()+')');
      await p.goto(DEEP+'index.html');
      await p.locator('nav.bk-pager a.bk-up').click();
      rec.chk('pager-contents',new URL(p.url()).pathname.replace(/index\.html$/,'')==='/compile-join/','"Contents" at the foot leads back as well');
      await p.goto(DEEP+'index.html');
      await p.locator('nav.bk-pager a.bk-next').click();
      const quiet=await p.evaluate(()=>({h1:document.querySelector('h1').textContent,sc:[...document.scripts].filter(s=>s.src).length,tabs:document.querySelectorAll('[role=tab],button').length}));
      rec.chk('next-is-quiet',quiet.h1==='A quiet page'&&quiet.sc===0&&quiet.tabs===0,'"Next" reaches the quiet page, which links no script and has nothing pressable ('+JSON.stringify(quiet)+')');
      await p.locator('nav.bk-pager a.bk-prev').click();
      rec.chk('prev-is-deep',/deep/.test(p.url()),'"Back" returns to the deep page');
      /* the translation */
      await p.goto(DEEP+'index.html');
      const alt=await p.evaluate(()=>[...document.querySelectorAll('link[rel=alternate][hreflang]')].map(l=>l.hreflang+'>'+new URL(l.getAttribute('href'),location.href).pathname));
      rec.chk('alternates',alt.join()==='en>/compile-join/deep/,es>/compile-join.es/deep/','the deep page names itself and its translation with hreflang ('+alt.join(', ')+')');
      const es=await p.goto(BASE+'compile-join.es/deep/index.html');
      const esInfo=await p.evaluate(()=>({lang:document.documentElement.lang,h1:document.querySelector('h1').textContent,back:[...document.querySelectorAll('link[rel=alternate]')].map(l=>l.hreflang+'>'+new URL(l.getAttribute('href'),location.href).pathname).join(),
        crumb:document.querySelector('p.bk-crumb a').textContent,sc:[...document.scripts].filter(s=>s.src).length}));
      rec.chk('translation-page',es.status()===200&&esInfo.lang==='es'&&esInfo.h1==='Leer el río'&&esInfo.crumb==='Una guía del río','the translation link leads to the Spanish page, in Spanish ('+JSON.stringify(esInfo)+')');
      rec.chk('translation-links-back',esInfo.back==='en>/compile-join/deep/,es>/compile-join.es/deep/','…and it links back to the English one');
      rec.chk('translation-script',esInfo.sc===1,'…and it links the script, as it has tabs to bar');
      await settle(p);
      const esLive=await p.evaluate(()=>({tabs:[...document.querySelectorAll('[role=tab]')].map(t=>t.textContent.trim()).join('|'),bar:document.querySelector('[role=tablist]').getAttribute('aria-label'),sw:(document.querySelector('.bk-foldsw')||{}).textContent}));
      rec.chk('translation-script-speaks-spanish',esLive.tabs==='Qué ver|Los números'&&esLive.bar==='Leer el río'&&esLive.sw==='Abrir todo','…and what the script adds speaks Spanish: the bar over the two tabs, named for the page, and "Abrir todo" ('+JSON.stringify(esLive)+')');
      await p.getByLabel('La del borde').check();
      rec.chk('translation-quiz',await p.locator('fieldset .bk-live').textContent()==='No del todo. La respuesta es La del centro.','…and the quiz\'s verdict is spoken in Spanish');
      await p.getByLabel('La del centro').check();
      rec.chk('translation-quiz-right',await p.locator('fieldset .bk-live').textContent()==='Correcto.','…and "Correcto." when it is right');
      await p.getByRole('tab',{name:'Los números'}).click();
      await p.locator('#lecturas a.bk-anchor').click();
      rec.chk('translation-share',await p.locator('.bk-said',{hasText:'Enlace copiado'}).waitFor({timeout:3000}).then(()=>true,()=>false),'…and the heading\'s copied link says "Enlace copiado" in a tab that was hidden');
      const esCont=await p.goto(BASE+'compile-join.es/index.html');
      rec.chk('translation-contents',esCont.status()===200&&await p.evaluate(()=>document.querySelectorAll('li.bk-card').length)===2&&await p.evaluate(()=>[...document.querySelectorAll('link[rel=alternate]')].map(l=>l.hreflang).join())==='en,es','the Spanish contents page has its two cards and its own alternates');
      rec.chk('pages-no-errors',errs.length===0&&reqs.every(r=>r.url.startsWith(BASE)||r.url.startsWith('data:')),'moving between the pages logs no error and asks for nothing outside the booklet\'s files');
      await ctx.close();}

    /* ======================= 7. mutations ======================= */
    {
      const copyDir=(from,to)=>{fs.rmSync(to,{recursive:true,force:true});fs.cpSync(from,to,{recursive:true});};
      const edit=(dir,rel,fn)=>{const f=path.join(dir,rel),was=fs.readFileSync(f,'utf8'),now=fn(was);if(now===was) throw new Error('the mutation changed nothing in '+rel);fs.writeFileSync(f,now);};
      const MUT=[
        {id:'M1 drop the hashchange reveal',expect:'hashchange-reveals-figure-tab',only:['reveal'],
          make:d=>edit(d,'booklet/booklet.js',s=>s.replace('window.addEventListener("hashchange", fromAddress);',''))},
        {id:'M2 a diagram drawn at width 0',expect:'diagram-has-size',only:['folds'],
          make:d=>edit(d,'compile-join/deep/index.html',h=>h.replace('</head>','<style>.booklet:not(#bk):not(#bk):not(#bk):not(#bk) .bk-diagram svg{width:0!important;min-width:0!important}</style>\n</head>'))},
        {id:'M3 sort dead after a tab switch',expect:'sort-asc',only:['views'],
          make:d=>edit(d,'booklet/booklet.js',s=>s.replace('tabs[j].panel.hidden = !on;','tabs[j].panel.hidden = !on;\n        if (on) Array.prototype.forEach.call(tabs[j].panel.querySelectorAll(".bk-vsel"), function (x) { x.parentNode.replaceChild(x.cloneNode(true), x); });'))},
        {id:'M4 Open all opens hints and solutions',expect:'open-all-spares-hints',only:['folds'],
          make:d=>edit(d,'booklet/booklet.js',s=>s.replace('var FOLD = "details.bk-fold:not(.bk-hint):not(.bk-solution)";','var FOLD = "details.bk-fold";'))},
        {id:'M5 a script that remembers a pick',expect:'quiz-forgets-on-reload',only:['quiz','pledge'],also:['pledge-no-forbidden-call','pledge-nothing-kept'],
          make:d=>edit(d,'booklet/booklet.js',s=>s+'\n(function(){var s=sessionStorage;document.addEventListener("change",function(e){if(e.target.id) s.setItem("k:"+e.target.id,e.target.checked?"1":"");});\n'
            +'document.addEventListener("DOMContentLoaded",function(){for(var i=0;i<s.length;i++){var k=s.key(i);if(k.indexOf("k:")===0&&s.getItem(k)){var el=document.getElementById(k.slice(2));if(el) el.checked=true;}}});})();\n')},
        {id:'M6 a script that makes a request',expect:'pledge-own-files-only',only:['reveal','pledge'],also:['pledge-no-forbidden-call'],
          make:d=>edit(d,'booklet/booklet.js',s=>s+'\n(function(){window.addEventListener("hashchange",function(){fetch("/track?x=1");});})();\n')},
        {id:'M9 the arrow key dropped from the tab bar',expect:'key-right',only:['keys'],
          make:d=>edit(d,'booklet/booklet.js',x=>x.replace('e.key === "ArrowRight" ? (at + 1) % n :','e.key === "ArrowRight" ? -1 :'))},
        {id:'M10 print leaves the hidden tabs hidden',expect:'print-tabs',only:['print'],
          make:d=>edit(d,'booklet/booklet.css',x=>x.replace(/(@media print[\s\S]*?\.bk-tab\[hidden\]\{display:)block/,'$1none'))},
        {id:'M7 a wrong right-answer mark',expect:'quiz-answer-marked',only:['quiz'],
          make:d=>edit(d,'compile-join/deep/index.html',h=>h.replace('<li class="bk-opt bk-right"><input type="radio"','<li class="bk-opt"><input type="radio"'))}];
      for(const m of MUT){
        const dir=path.join(OUT,'mut-'+m.id.split(' ')[0]);copyDir(SITE,dir);m.make(dir);
        const rec=quiet();await usePage(dir,rec,m.only);
        const hit=rec.bad.includes(m.expect)&&(m.also||[]).every(x=>rec.bad.includes(x));
        const r=baseline();r.chk('mutation-'+m.id.split(' ')[0],hit,m.id+' fails "'+m.expect+'"'+((m.also||[]).length?' and '+m.also.map(x=>'"'+x+'"').join(', '):'')+' (failed: '+rec.bad.join(', ')+')');
        /* a mutation that fails the baseline's other checks too is still proof, but it must not fail everything: the check is specific */
        r.chk('mutation-specific-'+m.id.split(' ')[0],rec.bad.filter(x=>!/^crash-/.test(x)).length<=4,'…and it breaks only what it should, not the whole page ('+rec.bad.length+' checks failed)');}
      /* the assembler's scan: a banned word in a part stops the build */
      const tmp=path.join(OUT,'parts-with-a-ban');fs.rmSync(tmp,{recursive:true,force:true});fs.cpSync(S.DIR,tmp,{recursive:true});
      const r=baseline();
      r.chk('mutation-M8-clean-copy',(()=>{try{return S.assemble(tmp).text===S.assemble().text;}catch(e){return false;}})(),'(set up) a copy of the script\'s parts assembles to the same text');
      fs.appendFileSync(path.join(tmp,'reading-tabs.js'),'\n/* sneaky */ (function(){ localStorage.setItem("tab","1"); })();\n');
      let msg='';try{S.assemble(tmp);}catch(e){msg=e.message;}
      r.chk('mutation-M8-scan',/was not built, and nothing was written/.test(msg)&&/reading-tabs\.js/.test(msg)&&/localStorage/.test(msg),'M8 a part that stores a value stops the assembler, naming the part and the word');
      fs.rmSync(tmp,{recursive:true,force:true});
    }
  }finally{await b.close();}
  console.log(fails.length?'\n'+fails.length+' FAILED:\n  '+fails.join('\n  '):'\ncompile join: all checks passed'+(Object.keys(KNOWN).length?' (known failures: '+Object.keys(KNOWN).join(', ')+')':''));
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
