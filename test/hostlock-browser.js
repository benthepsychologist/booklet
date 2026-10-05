// Browser check for the host lock (0.11.4): the renderer hands a booklet to a page's host only when the page is on the
// reader's own machine or private network, and only after the reader presses Allow. The TEST serves the renderer at a
// private name (http://fleet/app/, a name with no dot) with a booklet-store meta tag and a small host script of its own
// injected into the page (standing in for a host's script), then at a public address (https://bookletmd.test/app/).
// Checks: the Allow notice appears and nothing is handed over before Allow (the host script records what it receives); a
// script-dispatched click on Allow (element.click(), dispatchEvent) does not activate it and a real click does; the bar then
// says "Saves go to: ..." and the host hears the open booklet once; a reload asks nothing and is active at once; Not now asks
// again next visit; Stop on "Your booklets" forgets the answer (a scripted press does nothing); on the public address: no
// notice, nothing handed over, the bar says "Kept in this browser only", state() is "refused", even with a remembered yes; a
// label given as markup is shown as text; the Download button is marked after typing on a plain page without any redraw;
// every request is a GET to the page's own origin; zero CSP violations and page errors. Screenshots (the Allow notice at
// 1280px and 400px, the Stop line on "Your booklets") are written to <outdir>.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/hostlock-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PRIVATE='http://fleet',PUBLIC='https://bookletmd.test';
/* the page reads its booklet from its own origin, so the test's copy of the policy allows that one read */
const HOST_CSP=CSP.replace('connect-src https://raw.githubusercontent.com','connect-src https://raw.githubusercontent.com http://fleet https://bookletmd.test');
if(HOST_CSP===CSP) throw new Error('csp.js no longer has the expected connect-src: update this test');
const LABEL='fleet: booklets/reports';
const KEY='booklet.host.allowed';
const WEEK=`---\nbooklet: "0.11"\ntitle: Week report\nlang: en\n---\n\n> [!module|m] Week module\n\n> [!activity|a] Report\n\n> [!text|q long] What stood out?\n\n> [!module|m end] End\n`;
const hostScript=label=>`<script>(function(){
  window.__calls=[];window.__h=window.Booklet.host({label:${JSON.stringify(label)}});
  window.Booklet.onChange(function(x){window.__calls.push(x);});
})();</script>`;
/* 0.11.6: the renderer's own policy allows a script file from the page's origin and no inline script, so the host's script is a file */
const JS={};
const page=(inject,origin)=>{let h=fs.readFileSync(HTML,'utf8');
  h=h.replace('<meta name="theme-color"','<meta name="booklet-store" content="'+(origin||PRIVATE)+'/store/">\n<meta name="theme-color"');
  const i=h.lastIndexOf('</body>');
  if(!inject) return h;
  const name='/hs'+Object.keys(JS).length+'.js';JS[name]=inject.replace(/^<script>/,'').replace(/<\/script>$/,'');
  return h.slice(0,i)+'<script src="'+name+'"></script>'+h.slice(i);};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const reqs=[],csp=[],errs=[],viol=[];
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  const open=async(remembered,origin)=>{const p=await ctx.newPage();
    p.on('request',r=>reqs.push({url:r.url(),method:r.method(),body:r.postData()||''}));
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(([k,v,o])=>{if(location.origin!==o) return;
      /* a remembered yes is set only on the first load of a page, never again after a reload or a Stop */
      try{if(v&&!sessionStorage.getItem('__seeded')){localStorage.setItem(k,v);sessionStorage.setItem('__seeded','1');}}catch(e){}
      document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});},[KEY,remembered||'',origin||PRIVATE]);
    return p;};
  let hostLabel=LABEL,storeText=WEEK;   // storeText: what the store serves; a host that saved leaves its last text there
  const serve=async origin=>{await ctx.route(origin+'/**',r=>{const u=new URL(r.request().url()).pathname;
    const h={'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP};
    if(u==='/app/')return r.fulfill({status:200,body:page(hostScript(hostLabel),origin),headers:h});
    if(u==='/plain/')return r.fulfill({status:200,body:page('',origin),headers:h});
    if(JS[u])return r.fulfill({status:200,body:JS[u],headers:{'content-type':'text/javascript'}});
    if(u==='/store/week.md')return r.fulfill({status:200,body:storeText,headers:{'content-type':'text/plain; charset=utf-8'}});
    r.fulfill({status:404,body:'nf'});});};
  await serve(PRIVATE);await serve(PUBLIC);
  const wait=(p,ms)=>p.waitForTimeout(ms||800);
  const bar=p=>p.locator('#hostLine').innerText();
  const ask=p=>p.locator('#main .hostask');
  const calls=p=>p.evaluate(()=>window.__calls.length);
  const state=p=>p.evaluate(()=>window.__h.state());
  const stored=p=>p.evaluate(k=>localStorage.getItem(k),KEY);
  const noScroll=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);

  // 1 private address, no yes yet: the ask
  let p=await open();
  await p.goto(PRIVATE+'/app/#/open/week.md');await wait(p,1200);
  ok(await ask(p).count()===1,'on a private address the renderer shows its own notice');
  const t=await ask(p).innerText();
  ok(/^This page wants to save the booklets it opens for you to: fleet: booklets\/reports\. Your booklets stay in this browser too\./.test(t),'the notice says what the page wants: '+JSON.stringify(t));
  ok(await ask(p).getByRole('button',{name:'Allow',exact:true}).count()===1&&await ask(p).getByRole('button',{name:'Not now',exact:true}).count()===1,'with two buttons, Allow and Not now');
  ok(await state(p)==='waiting','state() is "waiting"');
  ok(await bar(p)==='Kept in this browser only','the bar says Kept in this browser only: '+await bar(p));
  await p.locator('#main textarea').first().fill('QZXbefore');await wait(p,1000);
  ok(await calls(p)===0,'nothing is handed over before Allow (the host heard nothing)');
  ok(await p.evaluate(()=>window.Booklet.text())==='','text() is empty while waiting');
  ok(await p.locator('#btnExport.attention').count()===1,'and the Download button is marked after typing (nothing covers the work)');
  await p.screenshot({path:path.join(OUT,'allow-notice-1280.png')});
  // a script's click is not the reader's
  await p.evaluate(()=>{const b=[...document.querySelectorAll('.hostask button')].find(x=>x.textContent==='Allow');b.click();b.dispatchEvent(new MouseEvent('click',{bubbles:true}));b.dispatchEvent(new Event('click',{bubbles:true}));});
  await wait(p,400);
  ok(await state(p)==='waiting'&&await stored(p)===null&&await ask(p).count()===1,'a script-dispatched click on Allow does not activate it');
  await p.evaluate(()=>{const b=[...document.querySelectorAll('.hostask button')].find(x=>x.textContent==='Not now');b.click();});
  await wait(p,300);
  ok(await ask(p).count()===1,'nor does a script-dispatched click on Not now hide it');
  await p.setViewportSize({width:400,height:800});await wait(p,300);
  await p.screenshot({path:path.join(OUT,'allow-notice-400.png')});
  ok(await noScroll(p)<=0,'no sideways overflow at 400px with the notice');
  await p.setViewportSize({width:1280,height:900});
  // a real click
  await ask(p).getByRole('button',{name:'Allow',exact:true}).click();await wait(p,1200);
  ok(await ask(p).count()===0,'a real click on Allow hides the notice');
  ok(await state(p)==='active'&&await stored(p)===LABEL,'the host is active and the label is remembered: '+await stored(p));
  ok(/^Saves go to: fleet: booklets\/reports/.test(await bar(p)),'the bar says where saves go: '+await bar(p));
  ok(await calls(p)===1,'the host hears the open booklet once, at once: '+await calls(p));
  const first=await p.evaluate(()=>window.__calls[0]);
  ok(first&&first.name==='week.md'&&/QZXbefore/.test(first.text)&&Object.keys(first).sort().join()==='name,text,title','and it is given the current text, the name and the title');
  await wait(p,800);
  ok(await calls(p)===1,'and only once');
  await p.locator('#main textarea').first().fill('QZXafter');await wait(p,1000);
  ok(await calls(p)===2&&/QZXafter/.test(await p.evaluate(()=>window.__calls[1].text)),'a later change is heard');
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  // 2 reload: remembered, active at once (the store holds what the host saved, so nothing newer is offered)
  storeText=await p.evaluate(()=>window.__calls[window.__calls.length-1].text);
  await p.reload();await wait(p,1200);
  ok(await ask(p).count()===0&&await state(p)==='active','after a reload there is no notice and the host is active at once');
  ok(await calls(p)===1,'and it hears the booklet again: '+await calls(p));
  // Stop on Your booklets
  for(let i=0;i<3&&await p.locator('#main .hoststop').count()===0;i++){await p.locator('#btnHome').click();await wait(p,400);}
  ok(await p.locator('#main .hoststop').count()===1,'on "Your booklets" a quiet line shows that this page may save');
  ok(/^This page may save the booklets it opens to: fleet: booklets\/reports\.\s*Stop$/.test((await p.locator('#main .hoststop').innerText()).replace(/\s+/g,' ')),'with the wording: '+JSON.stringify(await p.locator('#main .hoststop').innerText()));
  await p.screenshot({path:path.join(OUT,'stop-line-1280.png')});
  await p.evaluate(()=>{[...document.querySelectorAll('.hoststop button')][0].click();});await wait(p,300);
  ok(await state(p)==='active'&&await stored(p)===LABEL,'a script-dispatched click on Stop does nothing');
  await p.locator('#main .hoststop').getByRole('button',{name:'Stop'}).click();await wait(p,500);
  ok(await state(p)==='waiting'&&await stored(p)===null&&await p.locator('#main .hoststop').count()===0,'a real click on Stop forgets the answer and makes the host waiting again');
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();

  // 3 Not now asks again on the next visit
  p=await open();
  await p.goto(PRIVATE+'/app/#/open/week.md');await wait(p,1000);
  await ask(p).getByRole('button',{name:'Not now',exact:true}).click();await wait(p,300);
  ok(await ask(p).count()===0&&await state(p)==='waiting'&&await calls(p)===0,'Not now hides the notice and the host stays waiting');
  await p.reload();await wait(p,1000);
  ok(await ask(p).count()===1,'it asks again on the next visit');
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();

  // 4 a different label asks again
  p=await open('some other label');
  await p.goto(PRIVATE+'/app/#/open/week.md');await wait(p,1000);
  ok(await ask(p).count()===1&&await state(p)==='waiting'&&await calls(p)===0,'a remembered yes for a different label asks again');
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();

  // 5 a label given as markup is text
  hostLabel='<img src=x onerror="window.__pwn=1"> <b>bold</b>';
  p=await open();
  await p.goto(PRIVATE+'/app/');await wait(p,800);
  ok(await ask(p).locator('img,b').count()===0&&(await ask(p).innerText()).includes('<img src=x onerror="window.__pwn=1"> <b>bold</b>'),'a label with markup in it is shown as text');
  ok(await p.evaluate(()=>window.__pwn===undefined),'and nothing in it ran');
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();hostLabel=LABEL;

  // 6 a public address: refused
  p=await open(LABEL,PUBLIC);
  await p.goto(PUBLIC+'/app/#/open/week.md');await wait(p,1200);
  ok(await state(p)==='refused','on a public address state() is "refused" (even with a remembered yes)');
  ok(await ask(p).count()===0,'no notice is shown');
  ok(await bar(p)==='Kept in this browser only','the bar says Kept in this browser only: '+await bar(p));
  await p.locator('#main textarea').first().fill('QZXpublic');await wait(p,1000);
  ok(await calls(p)===0&&await p.evaluate(()=>window.Booklet.text())==='','nothing is handed over: no call, and text() is empty');
  ok(await p.evaluate(()=>typeof window.Booklet==='object'&&Object.keys(window.Booklet).sort().join()==='host,onChange,open,text,version'),'window.Booklet is still defined with the same members');
  for(let i=0;i<3;i++){await p.locator('#btnHome').click();await wait(p,300);}
  ok(await p.locator('#main h1').innerText()==='Your booklets'&&await p.locator('#main .hoststop').count()===0,'and no Stop line is shown there');
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();

  // 7 a plain page: the Download button is marked without any redraw
  p=await open();
  await p.goto(PRIVATE+'/plain/');await wait(p,600);
  fs.writeFileSync(path.join(OUT,'mine.booklet.md'),WEEK);
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(p,300);
  await p.locator('#fileIn').setInputFiles(path.join(OUT,'mine.booklet.md'));await wait(p,400);
  await p.locator('.veil[open] button').filter({hasText:/^Load$/}).first().click();await wait(p,800);
  ok(await p.locator('#btnExport.attention').count()===0,'a plain page: the Download button is not marked before a change');
  await p.locator('#main textarea').first().fill('QZXplain');await wait(p,100);
  ok(await p.locator('#btnExport.attention').count()===1,'typing into a question marks the Download button without any other action');
  viol.push(...await p.evaluate(()=>window.__viol||[]));
  await p.close();

  // the assertions across every page
  const net=reqs.filter(r=>/^https?:/i.test(r.url));
  ok(net.length>0&&net.every(r=>r.method==='GET'),'every request is a GET');
  ok(net.every(r=>[PRIVATE,PUBLIC].includes(new URL(r.url).origin)&&/^\/(app|plain|store)\/|^\/hs\d+\.js$/.test(new URL(r.url).pathname)),'every request goes to the page\'s own origin: '+[...new Set(net.map(r=>r.url))].join(' '));
  ok(net.every(r=>!r.body&&!/QZX/.test(r.url)),'no body, and no typed word in any request');
  ok(viol.length===0&&csp.length===0,'zero CSP violations: '+viol.concat(csp).join('|'));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
