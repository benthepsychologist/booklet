// Browser check for the default folder (renderer 0.15, booklet-hub item v015-host-modules-and-checksum). The renderer is served
// exactly as given, byte for byte, with no `booklet-store` tag: at a public address with no header of its own (as GitHub Pages
// serves the portal: the renderer's own policy is the only one) and at a private name under the box server's header
// (test/csp-box.js), where a host's script may register. Checks:
//   - before a link is followed the page asks for nothing but itself (and a favicon);
//   - `#/open/<name>` on a page at /app/ and at /app/booklet.html reads /app/modules/<name>, once, as a plain GET, and the
//     booklet opens into its content with the quiet line saying where it came from;
//   - a missing file says "That booklet could not be found." and opens nothing;
//   - a copy that declares a store reads the store, and never its own modules/ folder;
//   - a page opened from disk is unchanged: no request, "no store" said, even with a modules/ folder beside it on disk;
//   - read only: with a host registered and allowed, a booklet from the folder is never handed to it (nothing heard after the
//     reader types and the host's cadence has passed; the bar says "Kept in this browser only"), while a booklet the host
//     itself hands over on the same page is (the control);
//   - "Your booklets" lists it, and Open from the list reads the folder's file again;
//   - two renderers on one site (/app/ and /other/), each with its own modules/a.md with the same ids and different text: on
//     /other/ the link reads /other/modules/a.md as a booklet of its own, with no offer to "Read the newer file" and none of the
//     answer typed on /app/, and /app/'s pointer is not listed there;
//   - every request is a GET with no body to the page's own origin, nothing typed is in any request, zero policy violations and
//     page errors.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/modulesfolder-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const BOXCSP=require('./csp-box.js'),PARTS=require('./parts.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PUBLIC='https://booklet.test',PRIVATE='http://fleet';
const RAW=fs.readFileSync(HTML);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bk=(id,title,q)=>`---\nbooklet: "0.17"\ntitle: ${title}\nlang: en\n---\n\n> [!module|${id}] ${title}\n\n> [!activity|${id}-a] ${title}\n\n> [!text|${id}-q long] ${q||'What stood out?'}\n\n> [!module|${id} end] End\n`;
/* what each origin serves under /app/modules/, /pub/ (a declared store) and /store/modules/ (which must never be read) */
const FILES={'/app/modules/sub/week.booklet.md':bk('week','Week report'),'/app/modules/x.md':bk('ex','Folder booklet'),
  '/pub/x.md':bk('st','Store booklet'),'/store/modules/x.md':bk('no','Never read'),
  '/app/modules/a.md':bk('same','App file','The app question'),'/app/modules/p.md':bk('ptr','App pointer'),
  '/other/modules/a.md':bk('same','Other file','The other question')};
const withStore=RAW.toString('utf8').replace('<meta name="theme-color"','<meta name="booklet-store" content="/pub/">\n<meta name="theme-color"');
if(withStore===RAW.toString('utf8')) throw new Error('booklet.html no longer has <meta name="theme-color": update this test');
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  const reqs=[],errs=[],cons=[],viol=[],served=[];
  for(const [origin,csp] of [[PUBLIC,null],[PRIVATE,BOXCSP]])
    await ctx.route(origin+'/**',r=>{const u=new URL(r.request().url()).pathname;
      const h={'content-type':'text/html; charset=utf-8',...(csp?{'content-security-policy':csp}:{})};
      if(u==='/app/'||u==='/app/booklet.html'){served.push(sha(RAW));return r.fulfill({status:200,body:RAW,headers:h});}
      if(u==='/other/')return r.fulfill({status:200,body:RAW,headers:h});
      if(u==='/store/')return r.fulfill({status:200,body:withStore,headers:h});
      {const s=PARTS.serve(HTML,u,'/app/');if(s)return r.fulfill(s);}
      const f=FILES[u];
      r.fulfill(f!==undefined?{status:200,body:f,headers:{'content-type':'text/markdown; charset=utf-8'}}:{status:404,body:'nf'});});
  const open=async()=>{const p=await ctx.newPage();
    p.on('request',r=>reqs.push({url:r.url(),method:r.method(),body:r.postData()||''}));
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});});
    return p;};
  const wait=(p,ms)=>p.waitForTimeout(ms||900);
  const view=p=>p.evaluate(()=>document.body.dataset.view);
  const toast=p=>p.locator('#toast').innerText();
  const line=p=>p.locator('#main .openedby').innerText().catch(()=>'');
  const since=n=>reqs.slice(n).filter(r=>/^https?:/.test(r.url));
  const folderReqs=n=>reqs.slice(n).filter(r=>/\/modules\//.test(r.url));
  const done=async p=>{viol.push(...await p.evaluate(()=>window.__viol||[]).catch(()=>[]));await p.close();};

  // 1 nothing before a link, then the link reads /app/modules/<name>
  let p=await open();let n0=reqs.length;
  await p.goto(PUBLIC+'/app/');await wait(p,1200);
  await p.getByRole('button',{name:'Start a new booklet'}).click();await wait(p,500);await p.locator('#btnHome').click();await wait(p,500);
  ok(since(n0).every(r=>r.url===PUBLIC+'/app/'||r.url===PUBLIC+'/favicon.ico'),'before a link is followed the page asks for nothing but itself: '+since(n0).map(r=>r.url).join(', '));
  ok(served.length===1&&served[0]===sha(RAW),'the page served is the renderer exactly as given (sha256 '+sha(RAW).slice(0,12)+'…)');
  let n1=reqs.length;
  await p.evaluate(()=>{location.hash='#/open/sub/week.booklet.md';});await wait(p,1200);
  ok(since(n1).map(r=>r.method+' '+r.url).join()==='GET '+PUBLIC+'/app/modules/sub/week.booklet.md','following #/open/sub/week.booklet.md asks for /app/modules/sub/week.booklet.md, once, with a GET: '+since(n1).map(r=>r.method+' '+r.url).join(', '));
  ok(await view(p)==='week/week-a','the booklet opens into its one activity: '+await view(p));
  ok((await line(p)).startsWith("Opened by a link, from the modules folder beside this page: sub/week.booklet.md"),'the quiet line says it came from the modules folder beside this page, not a store: '+(await line(p)).replace(/\n/g,' | '));
  await p.screenshot({path:path.join(OUT,'modulesfolder-1280.png')});
  // 2 a missing file
  const before=await view(p);n1=reqs.length;
  await p.evaluate(()=>{location.hash='#/open/missing.booklet.md';});await wait(p,1000);
  ok(since(n1).map(r=>r.url).join()===PUBLIC+'/app/modules/missing.booklet.md'&&await toast(p)==='That booklet could not be found.'&&await view(p)===before,'a missing file is asked for once and reads "That booklet could not be found.", and nothing else opens: '+await toast(p));
  // 3 a bad name asks for nothing
  n1=reqs.length;
  for(const h of ['#/open/../x.md','#/open/https://evil.test/a.md','#/open/x.txt']){await p.evaluate(h=>{location.hash=h;},h);await wait(p,300);}
  ok(since(n1).length===0&&/does not name a booklet/.test(await toast(p)),'a bad name asks for nothing and says so: '+await toast(p));
  // 4 "Your booklets": listed, and Open reads the folder's file again
  FILES['/app/modules/sub/week.booklet.md']=bk('week','Week report','What changed since Monday?');
  const atList=async()=>/Your booklets/.test(await p.locator('#main h1').first().innerText().catch(()=>''));
  for(let i=0;i<3&&!(await atList());i++){await p.locator('#btnHome').click();await wait(p,400);}
  ok(await atList()&&/Week report/.test(await p.locator('#main ol.modes').innerText().catch(()=>'')),'"Your booklets" lists it');
  n1=reqs.length;
  await p.locator('#main ol.modes li',{hasText:'Week report'}).first().locator('button.k').click();await wait(p,1200);
  ok(since(n1).map(r=>r.url).join()===PUBLIC+'/app/modules/sub/week.booklet.md'&&/What changed since Monday\?/.test(await p.locator('#main').innerText()),'Open from the list reads the folder\'s file again and draws it: '+since(n1).map(r=>r.url).join(', '));
  await done(p);
  // 5 a renderer at /app/booklet.html reads the same folder
  p=await open();n1=reqs.length;
  await p.goto(PUBLIC+'/app/booklet.html#/open/x.md');await wait(p,1200);
  ok(folderReqs(n1).map(r=>r.url).join()===PUBLIC+'/app/modules/x.md'&&await view(p)==='ex/ex-a','a renderer at /app/booklet.html reads /app/modules/x.md: '+folderReqs(n1).map(r=>r.url).join(', '));
  await done(p);
  // 6 a declared store wins
  p=await open();n1=reqs.length;
  await p.goto(PUBLIC+'/store/#/open/x.md');await wait(p,1200);
  ok(since(n1).filter(r=>!/\/store\/$|favicon/.test(r.url)).map(r=>r.url).join()===PUBLIC+'/pub/x.md'&&await view(p)==='st/st-a','a copy with a store tag reads the store and never its own modules/ folder: '+since(n1).map(r=>r.url).join(', '));
  await done(p);
  // 7 from disk: unchanged
  {const dir=path.join(OUT,'modulesfolder-disk');fs.mkdirSync(path.join(dir,'modules'),{recursive:true});
   fs.writeFileSync(path.join(dir,'booklet.html'),RAW);fs.writeFileSync(path.join(dir,'modules','x.md'),FILES['/app/modules/x.md']);
   p=await open();n1=reqs.length;
   await p.goto('file://'+path.join(dir,'booklet.html')+'#/open/x.md');await wait(p,1200);
   const own='file://'+path.join(dir,'booklet.html');
   ok(reqs.slice(n1).every(r=>r.url.split('#')[0]===own)&&!reqs.slice(n1).some(r=>/\/modules\/x\.md$/.test(r.url)),'from disk, with a modules/ folder beside the file, nothing is asked for but the page itself: '+reqs.slice(n1).map(r=>r.url).join(', '));
   ok(/no store/.test(await toast(p))&&await p.getByRole('button',{name:'Start a new booklet'}).count()===1,'and the page says it has no store, on the start screen: '+await toast(p));
   await done(p);}
  // 8 read only: a registered, allowed host hears nothing of a booklet from the folder
  p=await open();
  await p.goto(PRIVATE+'/app/');await wait(p,1000);
  await p.evaluate(()=>{window.__calls=[];window.__h=window.Booklet.host({label:'fleet: test'});window.Booklet.onChange(x=>window.__calls.push({name:x.name,text:x.text}));});
  await wait(p,300);
  await p.locator('#main .hostask button',{hasText:/^Allow$/}).click();await wait(p,300);
  ok(await p.evaluate(()=>window.__h.state())==='active','on the private page the host is active after the reader presses Allow');
  n1=reqs.length;
  await p.evaluate(()=>{location.hash='#/open/x.md';});await wait(p,1200);
  ok(folderReqs(n1).map(r=>r.url).join()===PRIVATE+'/app/modules/x.md'&&await view(p)==='ex/ex-a','under the box\'s header the folder is read and the booklet opens');
  await p.locator('#main textarea').first().click();await p.keyboard.type('QZXfolderanswer');
  await wait(p,6500);
  ok(await p.evaluate(()=>window.__calls.length)===0,'after the reader types and the host\'s cadence (2 s pause, 5 s bound) has passed, the host has heard nothing: '+await p.evaluate(()=>window.__calls.map(c=>c.name).join()));
  ok(await p.evaluate(()=>window.Booklet.text())==='','the host cannot read it');
  ok(await p.locator('#hostLine').innerText()==='Kept in this browser only','the bar says it is kept in this browser only: '+await p.locator('#hostLine').innerText());
  // the control: the host's own booklet, on the same page, is handed over
  await p.evaluate(t=>window.Booklet.open(t,{name:'y.md'}),bk('hy','Host booklet'));await wait(p,600);
  await p.locator('#main textarea').first().click();await p.keyboard.type('QZXhostanswer');
  await wait(p,6500);
  const heard=await p.evaluate(()=>window.__calls);
  ok(heard.length>0&&heard.every(c=>c.name==='y.md')&&/QZXhostanswer/.test(heard[heard.length-1].text),'control: a booklet the host hands over on the same page is handed to it ('+heard.length+' calls, names '+[...new Set(heard.map(c=>c.name))].join()+')');
  ok(!heard.some(c=>/QZXfolderanswer|Folder booklet/.test(c.text)),'no word of the folder booklet reached the host');
  await done(p);
  // 9 two renderers on one site, /app/ and /other/, each with its own modules/a.md: the same ids, different text
  p=await open();
  await p.goto(PUBLIC+'/app/#/open/a.md');await wait(p,1200);
  ok(await view(p)==='same/same-a'&&/The app question/.test(await p.locator('#main').innerText()),'on /app/ the link opens /app/modules/a.md');
  await p.locator('#main textarea').first().click();await p.keyboard.type('QZXappanswer');await wait(p,1500);
  await p.evaluate(()=>{location.hash='#/open/p.md';});await wait(p,1200);
  ok(await view(p)==='ptr/ptr-a','and /app/modules/p.md opens, and is left unanswered (a pointer)');
  await done(p);
  p=await open();n1=reqs.length;
  await p.goto(PUBLIC+'/other/#/open/a.md');await wait(p,1200);
  ok(folderReqs(n1).map(r=>r.url).join()===PUBLIC+'/other/modules/a.md'&&/The other question/.test(await p.locator('#main').innerText()),'on /other/ the same link reads /other/modules/a.md and draws its text: '+folderReqs(n1).map(r=>r.url).join(', '));
  ok(await p.getByRole('button',{name:'Read the newer file'}).count()===0,'no offer to "Read the newer file": /app/\'s booklet is not this one');
  ok(await p.locator('#main textarea').first().inputValue()===''&&!/QZXappanswer/.test(await p.locator('#main').innerText()),'the answer typed on /app/ is not in it');
  for(let i=0;i<3&&!/Your booklets/.test(await p.locator('#main h1').first().innerText().catch(()=>''));i++){await p.locator('#btnHome').click();await wait(p,400);}
  {const t=await p.locator('#main ol.modes').innerText().catch(()=>'');
   ok(/Your booklets/.test(await p.locator('#main h1').first().innerText().catch(()=>''))&&!/App pointer/.test(t),'the list on /other/ leaves out /app/\'s pointer: '+t.replace(/\n+/g,' | '));
   ok(/Other file/.test(t)&&/App file/.test(t),'and lists /other/\'s own booklet and /app/\'s booklet that holds the reader\'s work');}
  await done(p);

  // across every page
  const net=reqs.filter(r=>/^https?:/.test(r.url));
  ok(net.every(r=>r.method==='GET'&&!r.body),'every request is a GET with no body');
  ok(net.every(r=>[PUBLIC,PRIVATE].includes(new URL(r.url).origin)),'every request goes to the page\'s own origin: '+[...new Set(net.map(r=>new URL(r.url).origin))].join(', '));
  ok(net.every(r=>!new URL(r.url).search),'no request carries a query string');
  ok(!reqs.some(r=>/QZX/.test(r.url+r.body)),'no word the reader typed is in any request');
  ok(!net.some(r=>/\/store\/modules\//.test(r.url)),'the store copy\'s own modules/ folder was never asked for');
  ok((await ctx.cookies()).length===0,'no cookies');
  ok(viol.length===0&&cons.length===0,'zero policy violations: '+viol.concat(cons).join(' | '));
  ok(errs.length===0,'zero page errors: '+errs.join(' | '));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
