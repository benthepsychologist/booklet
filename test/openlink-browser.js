// Browser check for opening a booklet by link (0.11.1). A copy of the renderer that declares a store (`booklet-store`) is served
// under the hosted /app/ Content-Security-Policy with the store's origin added to connect-src (the host's own header must allow
// the renderer to read from where its store is); the store, the registry and their files are served by page.route.
// Checks: #/open/<name> opens the booklet into its content with the quiet provenance line; changing the fragment opens another;
// a bad name requests nothing; #/module/<id> opens that module; a page with no store tag refuses politely; a file with records
// shows its kept entries; answering a question makes the booklet appear in "Your booklets"; a redirecting and an oversized
// response are refused; every request is a GET to the page's origin, the store or the registry; no cookies, no body; zero CSP
// violations and page errors. Screenshots (the provenance line at 1280px and 400px) are written to <outdir>.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/openlink-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PAGE='https://bookletmd.test',STORE='https://store.test',REG='https://raw.githubusercontent.com';
const HOST_CSP=CSP.replace('connect-src https://raw.githubusercontent.com','connect-src https://raw.githubusercontent.com '+STORE);
if(HOST_CSP===CSP) throw new Error('csp.js no longer has the expected connect-src: update this test');
const page=(withStore)=>fs.readFileSync(HTML,'utf8').replace('<meta name="theme-color"',(withStore?'<meta name="booklet-store" content="'+STORE+'/pub/">\n':'')+'<meta name="theme-color"');
const bk=(id,title,body,after)=>`---\nbooklet: "0.11"\ntitle: ${title}\nlang: en\n---\n\n> [!module|${id}] ${title} module\n\n${body}\n> [!module|${id} end] End\n${after||''}`;
const WEEK=bk('week','Week report','> [!activity|wk] The week\n\n> [!text|wq long] What stood out?\n\n');
const OTHER=bk('other','Other booklet','> [!activity|ot] The other one\n\n> [!text|oq long] Anything else?\n\n');
const LOG=bk('log','Daily log','> [!activity|entry repeat] Log\n\n> [!text|what] What happened?\n\n',
  '\n> [!records] App record\n\n> [!records|log] Daily log\n\n```booklet entries entry\n{"items":[{"ts":"2026-09-21T09:00:00Z","what":"QZXrecordone"},{"ts":"2026-09-22T09:00:00Z","what":"QZXrecordtwo"}]}\n```\n');
const JOURNAL=bk('journal','Daily journal','> [!activity|j] Journal\n\n> [!text|jq long] Today?\n\n');
const FILES={'/pub/reports/week.booklet.md':WEEK,'/pub/other.md':OTHER,'/pub/log.md':LOG};
const REGJ={modules:[{id:'t/journal',title:'Daily journal',file:'journal.md'}]};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const reqs=[],csp=[],errs=[],viol=[];
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  const open=async(withStore)=>{const p=await ctx.newPage();
    p.on('request',r=>reqs.push({url:r.url(),method:r.method(),body:r.postData()||'',headers:r.headers()}));
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});});
    p.__w=withStore;return p;};
  await ctx.route(PAGE+'/**',r=>{const u=new URL(r.request().url()).pathname;
    if(u==='/app/')return r.fulfill({status:200,body:page(true),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
    if(u==='/plain/')return r.fulfill({status:200,body:page(false),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
    r.fulfill({status:404,body:'nf'});});
  const cors={'access-control-allow-origin':'*'};
  await ctx.route(STORE+'/**',r=>{const u=new URL(r.request().url()).pathname;
    if(u==='/pub/redirect.md')return r.fulfill({status:302,headers:{location:STORE+'/pub/other.md',...cors}});
    if(u==='/pub/huge.md')return r.fulfill({status:200,body:bk('huge','Huge','> [!activity|h] H\n\n','x'.repeat(5*1024*1024+100)),headers:{'content-type':'text/markdown',...cors}});
    if(u==='/pub/page.md')return r.fulfill({status:200,body:'<html>',headers:{'content-type':'text/html',...cors}});
    const f=FILES[u];r.fulfill(f?{status:200,body:f,headers:{'content-type':'text/markdown; charset=utf-8',...cors}}:{status:404,body:'nf',headers:cors});});
  await ctx.route(REG+'/**',r=>{const u=new URL(r.request().url()).pathname;
    if(/registry\.json$/.test(u))return r.fulfill({status:200,body:JSON.stringify(REGJ),headers:{'content-type':'application/json',...cors}});
    if(/journal\.md$/.test(u))return r.fulfill({status:200,body:JOURNAL,headers:{'content-type':'text/plain',...cors}});
    r.fulfill({status:404,body:'nf',headers:cors});});
  const view=p=>p.evaluate(()=>document.body.dataset.view);
  const storeReqs=()=>reqs.filter(r=>r.url.startsWith(STORE));
  const wait=(p,ms)=>p.waitForTimeout(ms||700);
  const toastText=p=>p.locator('#toast').innerText();
  const line=p=>p.locator('#main .openedby');

  // 1 a link at start-up opens the booklet into its content, with the quiet line
  let p=await open(true);
  await p.goto(PAGE+'/app/#/open/reports/week.booklet.md');await wait(p,1200);
  ok(await view(p)==='week/wk','#/open/<name> at start-up opens the booklet into its one activity: '+await view(p));
  ok((await line(p).count())===1&&(await line(p).innerText()).startsWith("Opened by a link, from this page's own store: reports/week.booklet.md"),'a quiet line says where it came from: '+(await line(p).innerText().catch(()=>'none')).replace(/\n/g,' | '));
  ok(await p.locator('#main .filenotes').count()===0,'the line is not a problems notice and nothing is counted as unread');
  ok(storeReqs().length===1&&storeReqs()[0].url===STORE+'/pub/reports/week.booklet.md','the store was asked once, for the checked name under its own address: '+storeReqs().map(r=>r.url).join());
  await p.screenshot({path:path.join(OUT,'openlink-1280.png'),fullPage:true});
  ok(await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=0,'no sideways overflow at 1280px');
  // not kept yet
  const keptKeys=()=>p.evaluate(()=>{try{const l=JSON.parse(localStorage.getItem('booklet.library.v1')||'{"entries":[]}');return l.entries.length;}catch(e){return -1;}});
  ok(await keptKeys()===0,'it is not in "Your booklets" while the reader has changed nothing');
  // dismiss
  await line(p).locator('button').click();await wait(p,200);
  ok(await line(p).count()===0,'the line can be dismissed for the session');
  // 2 answering a question: it joins the list
  await p.locator('#main textarea').first().fill('QZXansweredhere');await wait(p,900);
  ok(await keptKeys()===1,'answering a question keeps it: it is now one of "Your booklets"');
  // 3 changing the fragment opens another, and a bad name requests nothing
  const n0=storeReqs().length;
  await p.evaluate(()=>{location.hash='#/open/other.md';});await wait(p,900);
  ok(await view(p)==='other/ot'&&storeReqs().length===n0+1,'changing the fragment opens another booklet: '+await view(p));
  ok(await keptKeys()===1,'...and the first, kept one is untouched (still one entry)');
  const n1=storeReqs().length;
  for(const h of ['#/open/../x.md','#/open/https://evil.test/a.md','#/open/a%5Cb.md','#/open/x.txt']){await p.evaluate(h=>{location.hash=h;},h);await wait(p,300);}
  ok(storeReqs().length===n1,'bad names (up, a host, a backslash, not .md) request nothing');
  ok(/does not name a booklet/.test(await toastText(p)),'and say so in a plain message: '+await toastText(p));
  ok(await view(p)==='other/ot','...the booklet that was open stays open');
  // 4 the kept copy is offered when the same name is opened again
  await p.evaluate(()=>{location.hash='#/open/reports/week.booklet.md';});await wait(p,900);
  ok((await line(p).innerText()).includes('You also keep a copy of this with your own work'),'opening the same name again offers the kept copy: '+(await line(p).innerText()).replace(/\n/g,' | '));
  ok(await p.locator('#main textarea').first().inputValue()==='','...and what opens is the store\'s file, not the kept copy (the answer is not in it)');
  await line(p).locator('button.quietlink').click();await wait(p,500);
  ok(await p.locator('#main textarea').first().inputValue()==='QZXansweredhere','the offer opens the kept copy, answer and all');
  // 5 a file with records shows its kept entries
  await p.evaluate(()=>{location.hash='#/open/log.md';});await wait(p,900);
  ok((await p.locator('#main').innerText()).includes('QZXrecordtwo')||(await p.locator('#main .chips .chip').count())===2,'a file with records opens with them: '+await p.locator('#main .chips .chip').count()+' chips');
  // 6 refusals
  for(const [name,why] of [['missing.md','a file that is not there'],['redirect.md','a redirect'],['huge.md','a response over 5 MB'],['page.md','an HTML response']]){
    const before=await view(p);await p.evaluate(h=>{location.hash=h;},'#/open/'+name);await wait(p,900);
    ok(await view(p)===before&&(await toastText(p)).length>5&&await keptKeys()===1,why+' is refused with a plain message and nothing opens or is kept: '+(await toastText(p)));}
  // 7 module link
  await p.evaluate(()=>{location.hash='#/module/t%2Fjournal';});await wait(p,1200);
  ok(await view(p)==='journal/j','#/module/<id> opens that module: '+await view(p));
  ok((await line(p).innerText()).startsWith("Opened by a link, from this page's registry: Daily journal"),'with the registry line');
  const before=reqs.length;
  await p.evaluate(()=>{location.hash='#/module/t%2Fnone';});await wait(p,900);
  ok(reqs.slice(before).every(r=>/registry\.json$/.test(r.url)),'a module id not in the registry asks only for the registry list: '+reqs.slice(before).map(r=>r.url).join());
  ok(/not on this page's registry/.test(await toastText(p)),'and says so');
  await p.evaluate(()=>{const h=window.__viol||[];window.__done=h.length;});
  const v1=await p.evaluate(()=>window.__viol||[]);viol.push(...v1);
  await p.close();

  // 8 a reload opens the same thing
  p=await open(true);
  await p.goto(PAGE+'/app/#/open/other.md');await wait(p,1000);await p.reload();await wait(p,1000);
  ok(await view(p)==='other/ot','a reload with the link in the address opens the same booklet');
  // 9 narrow screen shot
  await p.setViewportSize({width:400,height:900});
  await p.goto(PAGE+'/app/#/open/reports/week.booklet.md');await p.reload();await wait(p,1200);
  ok(await view(p)==='week/wk'&&await line(p).count()===1,'at 400px the line is shown');
  await p.screenshot({path:path.join(OUT,'openlink-400.png'),fullPage:true});
  ok(await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=0,'no sideways overflow at 400px');
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();

  // 10 a page with no store tag
  p=await open(false);const nb=reqs.length;
  await p.goto(PAGE+'/plain/#/open/reports/week.booklet.md');await wait(p,1000);
  ok(reqs.slice(nb).every(r=>r.url.startsWith(PAGE)),'a page with no store tag requests nothing from any store');
  ok(/no store/.test(await toastText(p))&&await p.getByRole('button',{name:'Start a new booklet'}).count()===1,'and says so politely, on the start screen: '+await toastText(p));
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();

  // the assertions across every page
  const net=reqs.filter(r=>/^https?:/i.test(r.url));
  const origins=new Set([PAGE,STORE,REG]);
  ok(net.every(r=>r.method==='GET'),'every request is a GET');
  ok(net.every(r=>origins.has(new URL(r.url).origin)),'every request goes to the page\'s origin, the store or the registry');
  ok(net.every(r=>!r.body),'no request has a body');
  ok(net.every(r=>!/QZX/.test(r.url+JSON.stringify(r.headers))),'no word the reader typed is in any request');
  ok(net.filter(r=>r.url.startsWith(STORE)).every(r=>/^\/pub\/[A-Za-z0-9_.\/-]+\.md$/.test(new URL(r.url).pathname)&&!new URL(r.url).search),'the store was only ever asked for a checked name under /pub/, with no query');
  ok((await ctx.cookies()).length===0,'no cookies');
  ok(viol.length===0&&csp.length===0,'zero CSP violations: '+viol.concat(csp).join('|'));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
