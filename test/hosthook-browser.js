// Browser check for the host hook (0.11.2). The page is served under the hosted /app/ Content-Security-Policy. For the host
// cases the TEST injects a small script of its own into the page it serves (standing in for a host's script: the renderer file
// on disk and the published renderer hold none of it). It registers a label through window.Booklet.host and records what
// onChange gives it. Checks: the label shows in the top bar; opening a booklet gives one onChange; an answer gives one with
// the answer in `text`; saved() shows "Saved"; failed("disk full") shows it and brings back the not-downloaded mark;
// fileChanged(text) shows the offer and a press shows the new text; with no host the bar says "Kept in this browser only";
// a hostile booklet registers nothing and calls nothing; and the renderer itself made no request for any of it: every
// recorded request is the page, a GET. Zero CSP violations and page errors. Screenshots of the bar (host and no host, 1280px
// and 400px) are written to <outdir>.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/hosthook-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
/* 0.11.4: the hook works only on the reader's own machine or network, after the reader says yes. The page is served at a
   private name (no dot) and the reader's yes is already remembered, as on a later visit. test/hostlock-browser.js covers the ask. */
const PAGE='http://fleet';
const bk=(t,body,after)=>`---\nbooklet: "0.11"\ntitle: ${t}\nlang: en\n---\n\n> [!module|m] ${t} module\n\n${body}\n> [!module|m end] End\n${after||''}`;
const BOOK=bk('Hosted report','> [!activity|a] Report\n\n> [!text|q long] What stood out?\n\n');
const NEWER=bk('Hosted report','> [!activity|a] Report\n\n> [!text|q long] What stood out?\n\n','\n%%\n> [!records] App record — do not edit below this line\n\n> [!records|m] Hosted report module\n\n```booklet answers\n{"q": "QZXfromthefile"}\n```\n\n%%\n');
const HOSTILE=bk('Hostile','> [!activity|a] A\n\n[x](javascript:window.__pwn=1) <div onclick="window.__pwn=1;Booklet.host({label:\'pwned\'})">hi</div> <svg onload="window.__pwn=1"><script>window.__pwn=1</script></svg>\n\n> [!text|q long] window.Booklet.host\n\n');
/* the test's own stand-in for a host's script. It is served in the page's HTML, never part of booklet.html */
const HOSTSCRIPT=`<script>(function(){
  window.__calls=[];window.__h=window.Booklet.host({label:"fleet: booklets/reports"});
  window.Booklet.onChange(function(x){window.__calls.push(x);});
  window.__hostOpen=function(t,o){return window.Booklet.open(t,o);};
})();</script>`;
const HOSTSCRIPT_WATCH=`<script>(function(){window.__calls=[];window.__hits=0;
  window.Booklet.onChange(function(x){window.__calls.push(x);});})();</script>`;
const page=(inject)=>{const h=fs.readFileSync(HTML,'utf8').replace('HOOK_ANSWER_MS=20000','HOOK_ANSWER_MS=1500');/* the test's own copy waits 1.5 s, not 20 */const i=h.lastIndexOf('</body>');
  if(i<0) throw new Error('no </body>');return inject?h.slice(0,i)+inject+h.slice(i):h;};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const reqs=[],csp=[],errs=[],viol=[];
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  const open=async()=>{const p=await ctx.newPage();
    p.on('request',r=>reqs.push({url:r.url(),method:r.method(),body:r.postData()||'',headers:r.headers()}));
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{try{localStorage.setItem('booklet.host.allowed','fleet: booklets/reports');}catch(e){}});
    await p.addInitScript(()=>{document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});});
    return p;};
  await ctx.route(PAGE+'/**',r=>{const u=new URL(r.request().url()).pathname;
    const h={'content-type':'text/html; charset=utf-8','content-security-policy':CSP};
    if(u==='/host/')return r.fulfill({status:200,body:page(HOSTSCRIPT),headers:h});
    if(u==='/watch/')return r.fulfill({status:200,body:page(HOSTSCRIPT_WATCH),headers:h});
    if(u==='/plain/')return r.fulfill({status:200,body:page(''),headers:h});
    r.fulfill({status:404,body:'nf'});});
  const wait=(p,ms)=>p.waitForTimeout(ms||800);
  const bar=p=>p.locator('#hostLine').innerText();
  const barBox=p=>p.locator('.bar').boundingBox();
  const noScroll=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);

  // 1 no host
  let p=await open();
  await p.goto(PAGE+'/plain/');await wait(p,500);
  ok(await bar(p)==='Kept in this browser only','with no host the bar says: '+await bar(p));
  ok(await p.evaluate(()=>typeof window.Booklet==='object'&&Object.isFrozen(window.Booklet)&&Object.keys(window.Booklet).sort().join()==='host,onChange,open,text,version'),'window.Booklet is there, frozen, with the five members');
  await p.screenshot({path:path.join(OUT,'bar-nohost-1280.png')});
  await p.setViewportSize({width:400,height:800});await wait(p,300);
  await p.screenshot({path:path.join(OUT,'bar-nohost-400.png')});
  ok(await noScroll(p)<=0,'no sideways overflow at 400px (no host)');
  ok((await barBox(p)).height<130,'the bar stays short at 400px (no host): '+(await barBox(p)).height);
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();

  // 2 a host
  p=await open();
  await p.goto(PAGE+'/host/');await wait(p,500);
  ok(await bar(p)==='Saves go to: fleet: booklets/reports','with a host the label shows in the bar: '+await bar(p));
  const r=await p.evaluate(t=>window.__hostOpen(t,{name:'reports/week.booklet.md'}),BOOK);await wait(p,900);
  ok(r.ok===true,'the host opened a booklet through open(): '+JSON.stringify(r));
  let calls=await p.evaluate(()=>window.__calls);
  ok(calls.length===1&&calls[0].name==='reports/week.booklet.md'&&calls[0].title==='Hosted report'&&/title: Hosted report/.test(calls[0].text),'opening gives exactly one onChange with text, name and title: '+calls.length);
  ok(/Saving…$/.test(await bar(p)),'between a change and saved() the bar says Saving…: '+await bar(p));
  await p.locator('#main textarea').first().fill('QZXanswerone');await wait(p,1000);
  calls=await p.evaluate(()=>window.__calls);
  ok(calls.length===2&&/QZXanswerone/.test(calls[1].text),'an answer leads to one more onChange with the answer in text: '+calls.length);
  await wait(p,1200);
  ok(/Not saved: the host did not answer$/.test(await bar(p))&&await p.locator('#btnExport.attention').count()===1,'a host that does not answer in time is shown as not saved, and the mark returns: '+await bar(p)+' attention='+await p.locator('#btnExport.attention').count()+' '+JSON.stringify(await p.evaluate(()=>({s:HOST.status,silent:HOST.silent,l:HOOK_LISTENERS.length,ms:HOOK_ANSWER_MS}))));
  await p.evaluate(()=>window.__h.saved());
  ok(/Saved \d\d:\d\d$/.test(await bar(p)),'saved() shows Saved with the time: '+await bar(p));
  ok(await p.locator('#btnExport.attention').count()===0,'while saves succeed the Download button is not marked as needing attention');
  await p.screenshot({path:path.join(OUT,'bar-host-saved-1280.png')});
  await p.evaluate(()=>window.__h.failed('disk full'));
  ok(/Not saved: disk full$/.test(await bar(p)),'failed() shows the message: '+await bar(p));
  ok(await p.locator('#btnExport.attention').count()===1&&(await p.locator('#main .unsaved').count())>=0,'and the not-downloaded mark returns on Download');
  await p.screenshot({path:path.join(OUT,'bar-host-failed-1280.png')});
  await p.evaluate(()=>window.__h.saved());
  await p.evaluate(t=>window.__h.fileChanged(t),NEWER);await wait(p,300);
  ok((await p.locator('#main .hostnote').innerText()).includes('The file has changed where it is kept'),'fileChanged shows the offer');
  ok(await p.locator('#main textarea').first().inputValue()==='QZXanswerone','and nothing changes until the reader presses');
  await p.screenshot({path:path.join(OUT,'bar-host-offer-1280.png')});
  await p.locator('#main .hostnote button.primary').click();await wait(p,300);
  ok(await p.locator('#main textarea').first().inputValue()==='QZXfromthefile','a press shows the newer file: '+await p.locator('#main textarea').first().inputValue());
  ok(await p.locator('#main .hostnote').count()===0,'and the offer is gone');
  // 400px with a host: long label, failure
  await p.evaluate(()=>{localStorage.setItem('booklet.host.allowed','fleet: booklets/reports/with/a/rather/long/folder/name');window.__h.leave();window.__h=window.Booklet.host({label:'fleet: booklets/reports/with/a/rather/long/folder/name'});window.__h.failed('disk full, and a rather long explanation follows');});
  await p.setViewportSize({width:400,height:800});await wait(p,300);
  await p.screenshot({path:path.join(OUT,'bar-host-failed-400.png')});
  ok(await noScroll(p)<=0,'no sideways overflow at 400px with a host and a failure');
  ok((await barBox(p)).height<170,'the bar stays compact at 400px with a host: '+(await barBox(p)).height);
  await p.evaluate(()=>window.__h.saved());await wait(p,200);
  await p.screenshot({path:path.join(OUT,'bar-host-saved-400.png')});
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();

  // 2b a booklet the reader opens from their own disk is not the host's
  p=await open();
  await p.goto(PAGE+'/host/');await wait(p,500);
  fs.writeFileSync(path.join(OUT,'mine.booklet.md'),bk('Mine','> [!activity|a] Mine\n\n> [!text|q long] Note?\n\n'));
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(p,300);
  await p.locator('#fileIn').setInputFiles(path.join(OUT,'mine.booklet.md'));await wait(p,400);
  await p.locator('dialog[open] button,[role=dialog][open] button,.veil[open] button').filter({hasText:/^Load$/}).first().click();await wait(p,800);
  ok(await bar(p)==='Kept in this browser only','a booklet opened from a file, host registered: the bar says Kept in this browser only: '+await bar(p));
  await p.locator('#main textarea').first().fill('QZXprivate');await wait(p,900);
  ok(await p.evaluate(()=>window.__calls.length)===0,'the host\'s listener is never called for it (no call after opening and a change)');
  await wait(p,1800);
  ok(await bar(p)==='Kept in this browser only','no "Not saved: the host did not answer" after the answer wait: '+await bar(p));
  ok(await p.evaluate(()=>window.Booklet.text())==='','Booklet.text() is empty for it');
  await p.evaluate(()=>drawHostLine());
  ok(await p.locator('#btnExport.attention').count()===1,'the Download mark behaves as with no host: the change is not yet downloaded, and the host covers nothing');
  await p.screenshot({path:path.join(OUT,'bar-host-ownfile-1280.png')});
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();

  // 3 a hostile booklet cannot reach the hook
  p=await open();
  await p.goto(PAGE+'/watch/');await wait(p,500);
  await p.evaluate(t=>window.Booklet.open(t),HOSTILE);await wait(p,900);
  await p.locator('#main a, #main div, #main svg').evaluateAll(els=>els.forEach(e=>{try{e.click();e.dispatchEvent(new Event('mouseover'));}catch(x){}}));await wait(p,300);
  ok(await p.evaluate(()=>window.__pwn===undefined),'nothing a booklet held ran');
  ok(await bar(p)==='Kept in this browser only','and registered no host: '+await bar(p));
  ok(await p.evaluate(()=>window.__calls.length)===0,'a booklet handed over without a name is the reader\'s alone: onChange heard nothing');
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();

  // the assertions across every page
  const net=reqs.filter(r=>/^https?:/i.test(r.url));
  ok(net.length>0&&net.every(r=>r.method==='GET'),'every request is a GET');
  ok(net.every(r=>new URL(r.url).origin===PAGE&&/^\/(host|watch|plain)\/$/.test(new URL(r.url).pathname)),'the renderer made no request of its own: every request is the page itself: '+[...new Set(net.map(r=>r.url))].join(' '));
  ok(net.every(r=>!r.body&&!/QZX/.test(r.url+JSON.stringify(r.headers))),'no body, and no typed word in any request');
  ok((await ctx.cookies()).length===0,'no cookies');
  ok(viol.length===0&&csp.length===0,'zero CSP violations: '+viol.concat(csp).join('|'));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
