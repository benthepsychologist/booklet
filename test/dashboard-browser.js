// Browser check for rows that open and for rows read from a data file (format 0.19), in headless Chromium under the hosted
// Content-Security-Policy with the page's own origin added to connect-src where a page has a store or a default folder. Every
// booklet and every row is made up (test/dashboard-fixture.js: a garden and an orchard, 462 rows at every depth).
//   - a table, a list and cards nest; a row opens to its other fields and its children, drawn when it opens, without drawing the screen
//     again and without moving the scroll; Open all and Close all work;
//   - open rows survive a sort, a filter and a refresh of the data file, and the refresh keeps the scroll and the screen;
//   - a data file is read for a booklet opened from the default folder and for one opened from a declared store, once however many
//     blocks name it, and is NOT read for a booklet opened from the reader's disk, nor for a refused name;
//   - a file that is missing, one that is not JSON and a key path with nothing at it each draw the quiet box, and the rest of the booklet works;
//   - the page coming back into view, and a host's handle.dataChanged(), read the file again and draw a changed one in place; the same
//     text changes nothing;
//   - it measures, and prints, the time to draw about 450 rows all open and the time to open one row (no threshold).
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/dashboard-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js'),F=require('./dashboard-fixture.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PAGE='https://bookletmd.test';
const HOST_CSP=CSP.replace('connect-src https://raw.githubusercontent.com','connect-src https://raw.githubusercontent.com '+PAGE);
if(HOST_CSP===CSP) throw new Error('csp.js no longer has the expected connect-src: update this test');
const withStore=h=>h.replace('<meta name="theme-color"','<meta name="booklet-store" content="'+PAGE+'/pub/">\n<meta name="theme-color"');
let DATA=F.make(),DATA_VERSION=1;
const BOOK=F.bookletText('garden.json');
/* the same file named by two blocks, a missing one, a refused name and a key path with nothing at it, on pages of one booklet */
const MANY=`---\nbooklet: "0.19"\ntitle: Many\nlang: en\n---\n\n> [!activity|a] Many\n\n> [!page|one] One\n\n\`\`\`booklet query\nfrom: first\nas: list\nlabel: title\n\`\`\`\n\n\`\`\`booklet query\nfrom: second\nas: table\nfields: title\n\`\`\`\n\n> [!page|two] Two\n\n\`\`\`booklet query\nfrom: gone\nas: table\n\`\`\`\n\n\`\`\`booklet query\nfrom: bad\nas: table\n\`\`\`\n\n\`\`\`booklet query\nfrom: nokey\nas: table\n\`\`\`\n\n\`\`\`booklet query\nfrom: notjson\nas: table\n\`\`\`\n\nStill here: prose after the quiet boxes.\n\n\`\`\`booklet data garden.json programmes\n\`\`\`\n^first\n\n\`\`\`booklet data garden.json programmes\n\`\`\`\n^second\n\n\`\`\`booklet data nothing-here.json rows\n\`\`\`\n^gone\n\n\`\`\`booklet data ../secret.json rows\n\`\`\`\n^bad\n\n\`\`\`booklet data garden.json no.such.key\n\`\`\`\n^nokey\n\n\`\`\`booklet data plain.json rows\n\`\`\`\n^notjson\n`;
/* two blocks naming the same file and key path with labels of their own (each must be drawn with its own) */
const TWIN=`---\nbooklet: "0.19"\ntitle: Twin\nlang: en\n---\n\n> [!activity|a] Twin\n\n\`\`\`booklet query\nfrom: x\nas: table\nfields: title\n\`\`\`\n\n\`\`\`booklet query\nfrom: y\nas: table\nfields: title\n\`\`\`\n\n\`\`\`booklet data garden.json programmes\n{"fields":{"title":"AAA-title"}}\n\`\`\`\n^x\n\n\`\`\`booklet data garden.json programmes\n{"fields":{"title":"BBB-title"}}\n\`\`\`\n^y\n`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const reqs=[],errs=[],csp=[];
  const newPage=async(ctx)=>{const p=await ctx.newPage();
    p.on('request',r=>reqs.push({url:r.url(),method:r.method(),body:r.postData()||''}));
    p.on('pageerror',e=>errs.push(e.message));
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text());});return p;};
  const ctx=await b.newContext({viewport:{width:1200,height:900}});
  const serve=async()=>{
    await ctx.route(PAGE+'/**',r=>{const u=new URL(r.request().url()).pathname,md={'content-type':'text/markdown'},js={'content-type':'application/json'};
      const FILES={'/garden.booklet.md':BOOK,'/many.booklet.md':MANY,'/twin.booklet.md':TWIN};
      for(const root of ['/folder/modules','/pub']){
        if(FILES[u.slice(root.length)]&&u.startsWith(root+'/')) return r.fulfill({status:200,body:FILES[u.slice(root.length)],headers:md});
        if(u===root+'/garden.json') return r.fulfill({status:200,body:JSON.stringify(DATA),headers:js});
        if(u===root+'/plain.json') return r.fulfill({status:200,body:'this is not json',headers:js});}
      if(u==='/folder/') return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
      if(u==='/linked/') return r.fulfill({status:200,body:withStore(fs.readFileSync(HTML,'utf8')),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
      if(u==='/app/') return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
      r.fulfill({status:404,body:'nf'});});};
  await serve();
  const jsonReqs=()=>reqs.filter(r=>/\.json(\?|$)/.test(r.url)).map(r=>r.url);
  const wait=(p,ms)=>p.waitForTimeout(ms);
  const pageLink=(p,name)=>p.locator('.pm a, .pm button').filter({hasText:new RegExp('^'+name+'$')}).first();

  // 1. the default folder: nested table, list and cards
  {const p=await newPage(ctx);
   await p.goto(PAGE+'/folder/');await wait(p,500);
   const before=jsonReqs().length;
   ok(before===0,'a page with a default folder asks for no data file before a link is followed');
   await p.evaluate(()=>{location.hash='#/open/garden.booklet.md';});await wait(p,1500);
   ok(await p.evaluate(()=>document.body.dataset.view)==='desk','the booklet from the default folder opens');
   ok(jsonReqs().join()===PAGE+'/folder/modules/garden.json','its data file was read: one GET of the checked name beside the booklet ('+jsonReqs().join()+')');
   const trs=()=>p.locator('table.dv-table tbody tr.dv-trow');
   ok(await trs().count()===6,'the table draws its six top rows while every row is shut');
   ok(await p.locator('table.dv-table details').count()===6,'each top row has a native disclosure in its lead cell');
   // opens without drawing the screen again, and without moving the scroll
   await p.evaluate(()=>{window.__keep=document.querySelector('.dv-box');window.__keep.__tag=1;window.__body=document.querySelector('.dv-body');window.__main=[...document.querySelector('#main').querySelectorAll('h1,.pm')];window.__main.forEach(n=>n.__tag=1);});
   await p.evaluate(()=>window.scrollTo(0,200));const y0=await p.evaluate(()=>window.scrollY);
   const t0=await p.evaluate(async()=>{const s=document.querySelectorAll('table.dv-table summary')[3];const t=performance.now();s.click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-t;});
   ok(await trs().count()>6,'pressing a row opens it: its children are rows after it ('+await trs().count()+' rows)');
   ok(await p.evaluate(()=>document.querySelector('.dv-box')===window.__keep&&document.querySelector('.dv-body')===window.__body&&window.__main.every(n=>n.isConnected&&n.__tag===1)),'opening a row drew only that row\'s part: the box, its body, the heading and the pages menu are the same nodes');
   ok(await p.evaluate(()=>window.scrollY)===y0,'and the scroll did not move ('+y0+')');
   const more=await p.locator('table.dv-table tr.dv-trmore').first().innerText();
   ok(/What it says/.test(more)&&/First paragraph about/.test(more),'the open part shows the other fields under their labels: '+more.replace(/\s+/g,' ').slice(0,60));
   ok(await p.evaluate(()=>getComputedStyle(document.querySelector('.dv-trmore dd')).whiteSpace)==='pre-wrap'&&await p.evaluate(()=>/\n\n/.test(document.querySelector('.dv-trmore dd').textContent)),'long text keeps its line breaks and paragraphs (plain text)');
   await p.locator('table.dv-table summary').nth(3).click();await wait(p,150);
   ok(await trs().count()===6,'pressing it again shuts it: its rows are taken away');
   // keyboard: Enter on a focused summary opens it
   await p.locator('table.dv-table summary').nth(0).focus();await p.keyboard.press('Enter');await wait(p,150);
   ok(await trs().count()>6,'a row opens from the keyboard (Enter on the summary)');
   // open rows survive a sort and a filter
   await p.locator('table.dv-table tr.dv-trow summary').nth(0).evaluate(s=>{});
   const openIds=()=>p.evaluate(()=>[...document.querySelectorAll('table.dv-table details[open]')].map(d=>d.getAttribute('data-id')));
   await p.locator('.dv-ctl-btn').click();await wait(p,100);
   const open0=await openIds();
   ok(open0.join()==='p0','the first programme is open ('+open0.join()+')');
   await p.locator('.dv-bar .dv-sel').filter({hasText:'Original order'}).selectOption('title');await wait(p,150);
   await p.locator('.dv-dir').click();await wait(p,150);
   const firstTop=await p.locator('table.dv-table tr.dv-trow[data-depth="0"] td').first().innerText();
   ok(/Orchard programme 6/.test(firstTop),'sorting by Name, descending, reorders the top rows ('+firstTop.trim()+')');
   ok((await openIds()).join()==='p0','the open row is still open after the sort');
   await p.locator('.dv-bar input[type=search]').fill('wedge-that-matches-nothing');await wait(p,150);
   ok(await p.locator('table.dv-table tr.dv-trow').count()===0,'a filter that matches nothing shows none');
   await p.locator('.dv-bar input[type=search]').fill('Pond project 4');await wait(p,200);
   const shown=await p.locator('table.dv-table tr.dv-trow td:first-child').allInnerTexts();
   ok(shown.length>=2&&shown.some(t=>/Pond project 4/.test(t))&&shown.some(t=>/programme/.test(t)),'a filter keeps a match with its ancestors: '+shown.map(s=>s.trim()).join(' | '));
   ok((await p.locator('table.dv-table details[open]').count())===1,'and opens the ancestor while it is on (the programme is open, so the match shows under it)');
   await p.locator('.dv-bar .dv-clear').last().click();await wait(p,200);
   ok((await openIds()).join()==='p0','after the filter is cleared the reader\'s own open row is as it was');
   // Open all, Close all
   await p.locator('.dv-openall').click();await wait(p,400);
   const all=await trs().count();
   ok(all>=F.count(DATA)-1-1000&&all>400,'Open all draws every row ('+all+' rows)');
   await p.locator('.dv-closeall').click();await wait(p,200);
   ok(await trs().count()===6&&(await openIds()).length===0,'Close all shuts every row');
   // print: every closed row opens and is drawn when the print begins (a toggle event would come too late), and folds back after it
   const printed=async(shutSel,doneSel)=>{
     await p.emulateMedia({media:'print'});await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
     const r=await p.evaluate(([a,b])=>({shut:document.querySelectorAll(a).length,seen:[...document.querySelectorAll(b)].filter(e=>e.getBoundingClientRect().height>0).length}),[shutSel,doneSel]);
     await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await p.emulateMedia({media:'screen'});await wait(p,250);return r;};
   {const r=await printed('table.dv-table details:not([open])','table.dv-table tr.dv-trow');
    ok(r.shut===0&&r.seen>400,'print: a closed table prints every row at every depth ('+r.seen+' rows laid out, '+r.shut+' disclosures still shut)');
    ok(await trs().count()===6&&(await openIds()).length===0,'and after the print every row is shut again, as the reader left them');}
   // timings
   const tAll=await p.evaluate(async()=>{const t=performance.now();document.querySelector('.dv-openall').click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-t;});
   console.log('INFO table: '+F.count(DATA)+' rows, Open all (every row drawn): '+Math.round(tAll)+' ms; one row opened: '+Math.round(t0)+' ms');
   await p.locator('.dv-closeall').click();
   await p.screenshot({path:path.join(OUT,'dashboard-table.png'),fullPage:false});
   // list
   await pageLink(p,'List').click();await wait(p,600);
   const tL=await p.evaluate(async()=>{const s=document.querySelectorAll('.dv-tree > li > details > summary')[1];const t=performance.now();s.click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-t;});
   ok(await p.locator('.dv-tree details[open]').count()===1&&await p.locator('.dv-tree .dv-more').count()===1&&await p.locator('.dv-tree .dv-ghead').count()===1,'a list row opens to its open part and its group heading');
   console.log('INFO list: one row opened: '+Math.round(tL)+' ms');
   {const before=await p.evaluate(()=>[...document.querySelectorAll('.dv-tree details')].map(d=>d.getAttribute('data-id')+(d.open?':1':':0')).join());
    const r=await printed('.dv-tree details:not([open])','.dv-tree .dv-t');
    ok(r.shut===0&&r.seen>400,'print: a closed list prints every row at every depth ('+r.seen+' rows laid out, '+r.shut+' disclosures still shut)');
    ok(await p.evaluate(()=>[...document.querySelectorAll('.dv-tree details')].filter(d=>d.open).map(d=>d.getAttribute('data-id')).join())===before.split(',').filter(x=>/:1$/.test(x)).map(x=>x.slice(0,-2)).join(),'and after the print only the row the reader opened is open');}
   ok(jsonReqs().length===1,'going to other pages asked for no data file again ('+jsonReqs().length+' request)');
   // cards
   await pageLink(p,'Cards').click();await wait(p,600);
   await p.locator('details.card-fold > summary').first().click();await wait(p,200);
   ok(await p.locator('details.card-fold .cd-body .dv-more').count()===1&&await p.locator('details.card-fold .dv-sub .card').count()===4,'a card opens to its open part and its child cards ('+await p.locator('details.card-fold .dv-sub .card').count()+')');
   await p.locator('details.card-fold .dv-sub details.card-fold > summary').first().click();await wait(p,200);
   ok(await p.locator('details.card-fold details.card-fold .dv-sub .card').count()===3,'a child card opens the same way');
   {const open=()=>p.evaluate(()=>[...document.querySelectorAll('details.card-fold[open]')].map(d=>d.getAttribute('data-id')).join());
    const before=await open();
    const r=await printed('details.card-fold:not([open])','.dv-cards .entry-row');
    ok(r.shut===0&&r.seen>400,'print: closed cards print every card at every depth ('+r.seen+' cards laid out, '+r.shut+' still shut)');
    ok(await open()===before,'and after the print the cards the reader had open are open and the rest shut ('+before+')');}
   await p.screenshot({path:path.join(OUT,'dashboard-cards.png'),fullPage:false});
   // 2. a refresh of the data file keeps open rows, scroll and the screen
   await pageLink(p,'Table').click();await wait(p,600);
   await p.locator('table.dv-table summary').nth(0).click();await wait(p,150);
   await p.locator('table.dv-table tr.dv-trow[data-depth="1"] summary').first().click();await wait(p,150);
   const open1=await openIds();
   await p.evaluate(()=>{window.__keep=document.querySelector('.dv-box').parentElement;window.__body=document.querySelector('.dv-body');window.__h1=document.querySelector('#main h1');});
   await p.evaluate(()=>window.scrollTo(0,120));const y1=await p.evaluate(()=>window.scrollY);
   const n1=jsonReqs().length;
   await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await wait(p,500);
   ok(jsonReqs().length===n1+1,'the page coming back into view reads the data file once more ('+(jsonReqs().length-n1)+' request)');
   ok(await p.evaluate(()=>document.querySelector('.dv-body')===window.__body),'the same text changes nothing: the body is the same node, nothing was drawn again');
   DATA.programmes[0].projects[0].title='Beds project (renamed)';DATA.programmes[0].projects[0].stage='refreshed';
   const n2=jsonReqs().length;
   await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await wait(p,600);
   ok(jsonReqs().length===n2+1,'a changed file is read once more');
   const tx=await p.locator('table.dv-table').innerText();
   ok(/Beds project \(renamed\)/.test(tx)&&/refreshed/.test(tx),'the changed rows are drawn in place');
   ok((await openIds()).join()===open1.join(),'the open rows are still open after the refresh ('+(await openIds()).join()+')');
   ok(await p.evaluate(()=>window.scrollY)===y1,'and the scroll is where it was ('+y1+')');
   ok(await p.evaluate(()=>document.querySelector('#main h1')===window.__h1&&document.querySelector('.dv-box').parentElement===window.__keep&&window.__keep.isConnected),'and the screen was not drawn again: the heading and the block holding the view are the same nodes (only the view inside was redrawn)');
   // a failing re-read leaves the drawn rows as they are
   await p.route(PAGE+'/folder/modules/garden.json',r=>r.fulfill({status:500,body:'x'}));
   await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await wait(p,500);
   ok(/Beds project \(renamed\)/.test(await p.locator('table.dv-table').innerText()),'a re-read that fails leaves the drawn rows as they are');
   await p.unroute(PAGE+'/folder/modules/garden.json');
   ok(errs.length===0,'zero page errors so far '+errs.join('|'));
   await p.close();}

  // 3. several blocks, one file; a missing file, a refused name, a key path with nothing at it, a file that is not JSON
  {const p=await newPage(ctx);
   const before=reqs.length;
   await p.goto(PAGE+'/folder/');await wait(p,400);
   await p.evaluate(()=>{location.hash='#/open/many.booklet.md';});await wait(p,1500);
   const mine=reqs.slice(before).filter(r=>/\.json/.test(r.url)).map(r=>r.url.replace(PAGE,''));
   ok(mine.filter(u=>u==='/folder/modules/garden.json').length===1,'two blocks name garden.json and it was read once ('+mine.join(', ')+')');
   ok(await p.locator('.dv-tree').count()===1&&await p.locator('table.dv-table').count()===1,'both blocks drew from it');
   await pageLink(p,'Two').click();await wait(p,800);
   const quiet=await p.locator('.dv-quiet').allInnerTexts();
   ok(quiet.length===4,'a missing file, a refused name, a key path with nothing at it and a file that is not JSON each draw a quiet box ('+quiet.length+')');
   ok(quiet.some(t=>/nothing-here\.json was not found/.test(t))&&quiet.some(t=>/“..\/secret\.json” is not a name/.test(t))&&quiet.some(t=>/nothing at “no\.such\.key”/.test(t))&&quiet.some(t=>/plain\.json is not JSON/.test(t)),'each names the file and the reason: '+quiet.map(s=>s.slice(0,50)).join(' | '));
   ok(/Still here/.test(await p.locator('#main').innerText()),'the rest of the booklet is drawn');
   ok(!reqs.slice(before).some(r=>/secret/.test(r.url)),'nothing was asked for the refused name');
   ok(await p.locator('.dv-tree').count()===0&&await pageLink(p,'One').count()===1,'and the pages still work');
   await p.close();}

  // 4. a declared store reads the file by the same rule
  {const p=await newPage(ctx);
   const before=reqs.length;
   await p.goto(PAGE+'/linked/');await wait(p,400);
   await p.evaluate(()=>{location.hash='#/open/garden.booklet.md';});await wait(p,1500);
   const mine=reqs.slice(before).filter(r=>/\.json/.test(r.url));
   ok(mine.length===1&&mine[0].url===PAGE+'/pub/garden.json'&&mine[0].method==='GET'&&mine[0].body==='','a booklet from a declared store reads one data file: a plain GET of the store\'s address plus the checked name ('+mine.map(r=>r.url).join()+')');
   ok(await p.locator('table.dv-table tr.dv-trow').count()===6,'and draws it');
   await p.close();}

  // 5. a booklet from the reader's own disk makes no request for a data file, on any page
  for(const [label,url] of [['a page that declares a store','/linked/'],['a page with a default folder','/folder/'],['the hosted app page','/app/']]){
   const p=await newPage(ctx);
   const before=reqs.length;
   await p.goto(PAGE+url);await wait(p,400);
   const f=path.join(OUT,'from-disk.booklet.md');fs.writeFileSync(f,BOOK);
   await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(p,300);
   await p.locator('#fileIn').setInputFiles(f);await wait(p,500);
   await p.locator('[role=dialog][open] button, dialog[open] button').filter({hasText:/^Load$/}).first().click();await wait(p,1000);
   if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await wait(p,400);}
   await p.locator('button.mode').first().click();await wait(p,1000);
   const mine=reqs.slice(before).filter(r=>/\.json/.test(r.url));
   const quiet=await p.locator('.dv-quiet').allInnerTexts();
   ok(mine.length===0,'a booklet loaded from disk on '+label+' asks for no data file ('+mine.length+')');
   ok(quiet.length===1&&/not opened from a store/.test(quiet[0])&&/garden\.json/.test(quiet[0]),'and its block draws the quiet box naming the file: '+quiet.join('|').slice(0,90));
   await p.close();}

  // 6. a host: handle.dataChanged() reads the files again and draws a changed one in place
  {const HOSTP='http://fleet',HCSP=CSP.replace('connect-src https://raw.githubusercontent.com','connect-src https://raw.githubusercontent.com '+HOSTP);
   const hctx=await b.newContext({viewport:{width:1200,height:900}});
   await hctx.route(HOSTP+'/**',r=>{const u=new URL(r.request().url()).pathname;
     if(u==='/host/'){let h=fs.readFileSync(HTML,'utf8').replace('<meta name="theme-color"','<meta name="booklet-store" content="'+HOSTP+'/pub/">\n<meta name="theme-color"');
       h=require('./csp-hash.js').write(h);const i=h.lastIndexOf('</body>');
       return r.fulfill({status:200,body:h.slice(0,i)+'<script src="/hs.js"></script>'+h.slice(i),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HCSP}});}
     if(u==='/hs.js') return r.fulfill({status:200,headers:{'content-type':'text/javascript'},body:'window.__h=window.Booklet.host({label:"fleet: dash"});window.Booklet.onChange(function(){});window.__open=function(t,o){return window.Booklet.open(t,o);};'});
     if(u==='/pub/garden.json') return r.fulfill({status:200,body:JSON.stringify(DATA),headers:{'content-type':'application/json'}});
     r.fulfill({status:404,body:'nf'});});
   const p=await hctx.newPage();const hreq=[];p.on('request',r=>hreq.push(r.url()));p.on('pageerror',e=>errs.push(e.message));
   await p.addInitScript(()=>{try{localStorage.setItem('booklet.host.allowed','fleet: dash');}catch(e){}});
   await p.goto(HOSTP+'/host/');await wait(p,500);
   await p.evaluate(t=>window.__open(t,{name:'garden.booklet.md'}),BOOK);await wait(p,1500);
   ok(await p.locator('table.dv-table tr.dv-trow').count()===6,'a booklet the host opened by name draws its data file');
   await p.locator('table.dv-table summary').nth(1).click();await wait(p,200);
   await p.evaluate(()=>{window.__box=document.querySelector('.dv-box').parentElement;});
   const open=await p.evaluate(()=>[...document.querySelectorAll('table.dv-table details[open]')].map(d=>d.getAttribute('data-id')).join());
   const n=hreq.filter(u=>/garden\.json/.test(u)).length;
   DATA.programmes[1].title='Orchard programme (host)';
   await p.evaluate(()=>window.__h.dataChanged());await wait(p,600);
   ok(hreq.filter(u=>/garden\.json/.test(u)).length===n+1,'handle.dataChanged() reads the file once more');
   ok(/Orchard programme \(host\)/.test(await p.locator('table.dv-table').innerText()),'and the changed row is drawn');
   ok(await p.evaluate(()=>[...document.querySelectorAll('table.dv-table details[open]')].map(d=>d.getAttribute('data-id')).join())===open&&await p.evaluate(()=>document.querySelector('.dv-box').parentElement===window.__box),'with the open rows kept and the block holding the view the same node');
   ok(await p.evaluate(()=>typeof window.__h.dataChanged==='function'&&Object.isFrozen(window.__h)),'the handle has dataChanged and is frozen');
   await hctx.close();}

  // 7. two blocks naming one file and key path each keep the labels of their own fence
  {const p=await newPage(ctx);
   await p.goto(PAGE+'/folder/');await wait(p,500);
   await p.evaluate(()=>{location.hash='#/open/twin.booklet.md';});await wait(p,1500);
   const heads=await p.evaluate(()=>[...document.querySelectorAll('table.dv-table')].map(t=>[...t.querySelectorAll('thead th')].map(h=>h.textContent.trim()).join()));
   ok(heads.join('|')==='AAA-title|BBB-title','two blocks on one file and key path keep their own labels, not the first one\'s ('+heads.join('|')+')');
   await p.close();}

  ok(errs.length===0,'zero page errors '+errs.join('|'));
  ok(csp.length===0,'zero CSP violations '+csp.join('|'));
  ok(reqs.every(r=>r.method==='GET'&&!r.body),'every request in the run is a GET with no body');
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
