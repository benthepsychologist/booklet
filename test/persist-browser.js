// Browser check for asking the browser to keep this site's storage (0.11.3). navigator.storage is replaced by a small stand-in
// before the page's script runs (granted, refused, missing), because a real browser decides by its own rules. Checks: nothing is
// asked at page load; the first save asks once (a new booklet is the reader's action), later saves do not; with at least one
// booklet kept and storage not persistent, "Your booklets" shows one quiet line, and with persistent storage it does not; a
// browser without the call changes nothing; every request is the page itself, a GET (asking the browser is not a request);
// zero CSP violations and page errors. Screenshots of the line (1280px and 400px) are written to <outdir>.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/persist-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PAGE='https://bookletmd.test';
const LINE='This browser may clear booklets kept here. Download a copy of any you want to keep, or add this page to your home screen.';
const STUB={
  granted:`(function(){var st=false;window.__asked=0;Object.defineProperty(navigator,'storage',{configurable:true,value:{persisted:function(){return Promise.resolve(st)},persist:function(){window.__asked++;st=true;return Promise.resolve(true)}}});})();`,
  refused:`(function(){window.__asked=0;Object.defineProperty(navigator,'storage',{configurable:true,value:{persisted:function(){return Promise.resolve(false)},persist:function(){window.__asked++;return Promise.resolve(false)}}});})();`,
  already:`(function(){window.__asked=0;Object.defineProperty(navigator,'storage',{configurable:true,value:{persisted:function(){return Promise.resolve(true)},persist:function(){window.__asked++;return Promise.resolve(true)}}});})();`,
  missing:`(function(){window.__asked=0;Object.defineProperty(navigator,'storage',{configurable:true,value:undefined});})();`};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const reqs=[],csp=[],errs=[],viol=[];
  const run=async(kind,fn)=>{
    const ctx=await b.newContext({viewport:{width:1280,height:900}});
    await ctx.route(PAGE+'/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML,'utf8'),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    const p=await ctx.newPage();
    p.on('request',r=>reqs.push({url:r.url(),method:r.method(),body:r.postData()||''}));
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(STUB[kind]);
    await p.addInitScript(()=>{document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});});
    await p.goto(PAGE+'/app/');await p.waitForTimeout(500);
    await fn(p);
    viol.push(...await p.evaluate(()=>window.__viol||[]));
    await ctx.close();};
  const line=p=>p.locator('#main').innerText().then(t=>t.includes(LINE));
  const start=async p=>{await p.getByRole('button',{name:'Start a new booklet'}).click();await p.waitForTimeout(500);};
  const home=async p=>{await p.locator('#btnHome').click();await p.waitForTimeout(500);};
  await run('granted',async p=>{
    ok(await p.evaluate(()=>window.__asked)===0,'nothing is asked at page load');
    ok(!(await line(p)),'with no booklet kept, no line');
    await start(p);
    ok(await p.evaluate(()=>window.__asked)===1,'the first save asks the browser once');
    await home(p);await start(p);await home(p);
    ok(await p.evaluate(()=>window.__asked)===1,'later saves do not ask again');
    ok(!(await line(p)),'once the browser has said yes, "Your booklets" shows no line');});
  await run('refused',async p=>{
    await start(p);await home(p);await p.waitForTimeout(300);
    ok(await p.evaluate(()=>window.__asked)===1&&(await line(p)),'refused: asked once, and the quiet line shows beside the kept booklet');
    await p.screenshot({path:path.join(OUT,'storage-line-1280.png')});
    await p.setViewportSize({width:400,height:900});await p.waitForTimeout(300);
    await p.screenshot({path:path.join(OUT,'storage-line-400.png'),fullPage:true});
    ok(await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=0,'no sideways overflow at 400px');});
  await run('already',async p=>{
    await start(p);await home(p);await p.waitForTimeout(300);
    ok(await p.evaluate(()=>window.__asked)===0&&!(await line(p)),'already persistent: not asked, no line');});
  await run('missing',async p=>{
    await start(p);await home(p);await p.waitForTimeout(300);
    ok(await line(p),'a browser without the call: nothing breaks, and the line shows');});
  const net=reqs.filter(r=>/^https?:/i.test(r.url));
  ok(net.length>0&&net.every(r=>r.method==='GET'&&!r.body&&new URL(r.url).origin===PAGE),'every request is a GET for the page itself');
  ok(viol.length===0&&csp.length===0,'zero CSP violations: '+viol.concat(csp).join('|'));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
