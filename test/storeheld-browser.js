// Browser check for store booklets (renderer 0.13): the store's file is the truth and the kept copy only a buffer. The page
// is served at a private name (the host hook works only there), with a `booklet-store` tag, under a box-style policy that
// lets the page read and write its own origin, and with a host's script of its own beside it, served as a file and a
// moment late, as a box's is on a fresh page load (it registers after the store's file has arrived). The store is the
// test's own: GET returns the file; PUT keeps the file's body and takes the records from the browser's text, as the box's
// server does, and refuses a text with no records over a file that has some. Nothing here is part of booklet.html.
// Checks, in real Chromium:
//   - Ben's flow: open a store link, answer, the generator rewrites the file, then fresh page loads by the link: the new
//     file is drawn every time with the answer, no offer, and the old question never appears on screen, not even briefly;
//   - a pointer renamed from "Your booklets", then opened by its link on a fresh load: the store's record is shown and
//     the file keeps it (the first version of this change saved a blank booklet over it);
//   - Open from the list after a rewrite draws the new file; "Opening <name>…" shows while a slow file is read;
//   - work the store lacks (its saves fail) opens as kept, with the offer;
//   - zero CSP violations and page errors.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/storeheld-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PAGE='http://fleet',LABEL='fleet: test store';
/* the box's policy: the page may read and write its own origin (the store and the host's saves), and the registry's */
const BOX_CSP=CSP.replace('connect-src https://raw.githubusercontent.com',"connect-src 'self' https://raw.githubusercontent.com");
if(BOX_CSP===CSP) throw new Error('csp.js no longer has the expected connect-src: update this test');
const FM=t=>`---\nbooklet: "0.13"\ntitle: ${t}\nlang: en\n---\n\n`;
const bk=(t,q)=>FM(t)+`> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q long] ${q}\n\n> [!module|m end] End\n`;
const rec=(t,words)=>t.replace(/\n$/,'')+'\n\n%%\n> [!records] App record — do not edit below this line\n\n> [!records|m] M\n\n```booklet answers\n{"q": "'+words+'"}\n```\n\n%%\n';
/* the test's store: name -> text, and the server's rule (storefile.merge, for the texts this renderer writes) */
const FILES={};const PUTS=[];
const split=t=>{const i=t.indexOf('\n%%\n> [!records]');return i<0?[t,'']:[t.slice(0,i),t.slice(i+1)];};
const merge=(disk,browser)=>{const b=split(disk)[0].replace(/\s+$/,''),r=split(browser)[1];return r?b+'\n\n'+r.replace(/\n+$/,'')+'\n':b+'\n';};
const sameBody=(a,b)=>split(a)[0].replace(/\s+$/,'')===split(b)[0].replace(/\s+$/,'');
/* regenerate a file as a generator does (storefile.write_generated): the new body, the old records */
const regen=(name,t)=>{FILES[name]=merge(t,FILES[name]);};
let FAIL_PUT=new Set(),HOST_DELAY=400,GET_DELAY={};
/* the host's script, a file on the page's origin: one PUT per change to ../store/<name>, every change answered, the change
   it answers named (docs/hosting.md), a newer change for a name waiting for the one in flight */
const HOSTJS=`(function(){var me=Booklet.host({label:${JSON.stringify(LABEL)}});var busy={},queued={};
  function send(c){busy[c.name]=true;
    fetch(new URL("../store/"+c.name,location.href).href,{method:"PUT",headers:{"Content-Type":"text/markdown; charset=utf-8"},body:c.text,cache:"no-store",redirect:"error"})
      .then(function(r){return r.json().then(function(j){if(!r.ok||!j.ok) throw new Error(j.error||("status "+r.status));return j;});})
      .then(function(j){if(j.bodyKept) me.fileChanged(j.text);done(c,null);},function(e){done(c,String(e&&e.message||e));});}
  function done(c,problem){busy[c.name]=false;var next=queued[c.name];delete queued[c.name];
    if(problem) me.failed(problem,c);if(next) send(next);else if(!problem) me.saved(c);}
  Booklet.onChange(function(c){if(busy[c.name]){queued[c.name]=c;return;}send(c);});})();`;
const page=()=>{let h=fs.readFileSync(HTML,'utf8');
  h=h.replace('<meta name="theme-color"','<meta name="booklet-store" content="/store/">\n<meta name="theme-color"');
  const i=h.lastIndexOf('</body>');if(i<0) throw new Error('no </body>');
  return h.slice(0,i)+'<script src="/app/host.js"></script>\n'+h.slice(i);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const HTMLPAGE=page();
  const b=await chromium.launch();
  const errs=[],viol=[],csp=[];
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  await ctx.route(PAGE+'/**',async r=>{const q=r.request(),u=new URL(q.url()).pathname;
    if(u==='/app/') return r.fulfill({status:200,body:HTMLPAGE,headers:{'content-type':'text/html; charset=utf-8','content-security-policy':BOX_CSP}});
    if(u==='/app/host.js'){await sleep(HOST_DELAY);return r.fulfill({status:200,body:HOSTJS,headers:{'content-type':'text/javascript'}});}
    if(u==='/') return r.fulfill({status:200,body:'<!doctype html><title>box</title>',headers:{'content-type':'text/html'}});
    if(u.startsWith('/store/')){const name=decodeURIComponent(u.slice(7));
      if(q.method()==='PUT'){const t=q.postData()||'';PUTS.push({name,text:t});
        if(!(name in FILES)) return r.fulfill({status:404,body:JSON.stringify({ok:false,error:'no such file'}),headers:{'content-type':'application/json'}});
        if(FAIL_PUT.has(name)) return r.fulfill({status:500,body:JSON.stringify({ok:false,error:'disk full'}),headers:{'content-type':'application/json'}});
        const disk=FILES[name];
        if(!split(t)[1]&&split(disk)[1]) return r.fulfill({status:409,body:JSON.stringify({ok:false,error:'no answers in this save, the file has some'}),headers:{'content-type':'application/json'}});
        const m=merge(disk,t),kept=!sameBody(t,disk);FILES[name]=m;
        return r.fulfill({status:200,body:JSON.stringify(kept?{ok:true,bodyKept:true,text:m}:{ok:true,bodyKept:false}),headers:{'content-type':'application/json'}});}
      if(GET_DELAY[name]) await sleep(GET_DELAY[name]);
      return name in FILES?r.fulfill({status:200,body:FILES[name],headers:{'content-type':'text/markdown; charset=utf-8'}}):r.fulfill({status:404,body:'nf'});}
    r.fulfill({status:404,body:'nf'});});
  const open=async()=>{const p=await ctx.newPage();
    p.on('pageerror',e=>errs.push(e.message));
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    await p.addInitScript(l=>{try{localStorage.setItem('booklet.host.allowed',l);}catch(e){}},LABEL);
    await p.addInitScript(()=>{document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});
      /* everything #main ever said, so a booklet drawn for a moment and then replaced is still seen */
      window.__seen='';new MutationObserver(()=>{const m=document.getElementById('main');if(m) window.__seen+='\n'+m.textContent;}).observe(document,{subtree:true,childList:true,characterData:true});});
    return p;};
  const seen=p=>p.evaluate(()=>window.__seen||'');
  const offer=p=>p.locator('#main .hostnote',{hasText:'changed where it is kept'}).count();
  const answer=p=>p.locator('#main textarea').first().inputValue().catch(()=>'');
  /* a booklet with a question on screen, or, after 10 s, whatever is there (the checks below then say what is wrong) */
  const ready=p=>p.waitForSelector('#main textarea',{timeout:10000}).catch(()=>null);
  const until=async(f,ms)=>{const t=Date.now();while(Date.now()-t<(ms||8000)){if(await f()) return true;await sleep(100);}return false;};
  const toLib=async p=>{for(let i=0;i<3;i++){if(/Your booklets/.test(await p.locator('#main h1').first().innerText().catch(()=>''))) return true;await p.locator('#btnHome').click();await sleep(300);}return false;};

  // 1 Ben's flow: a link, an answer, the generator rewrites the file, then fresh page loads by the link
  FILES['dash.md']=bk('Dashboard','What stood out this week?');
  let p=await open();
  await p.goto(PAGE+'/app/#/open/dash.md');await ready(p);
  ok(await until(async()=>/Saves go to/.test(await p.locator('#hostLine').innerText())),'the host registers (a moment after the file arrived)');
  await p.locator('#main textarea').first().click();await p.keyboard.type('QZXanswered');
  ok(await until(()=>/QZXanswered/.test(FILES['dash.md'])),'the answer reaches the store file');
  regen('dash.md',bk('Dashboard','What changed since Monday?'));
  let drawn=0,old=0,offers=0;const N=5;
  for(let i=0;i<N;i++){await p.goto(PAGE+'/');await p.goto(PAGE+'/app/#/open/dash.md');await ready(p);await sleep(700);
    const s=await seen(p);if(/What changed since Monday\?/.test(s)&&await answer(p)==='QZXanswered') drawn++;
    if(/What stood out this week\?/.test(s)) old++;offers+=await offer(p);}
  ok(drawn===N,`fresh page loads by the link draw the store's new file with the answer: ${drawn}/${N}`);
  ok(old===0,`the old question is never on screen, not even for a moment: ${old}/${N}`);
  ok(offers===0,'no offer to read a newer file: '+offers);
  // Open from the list after another rewrite
  regen('dash.md',bk('Dashboard','What is next?'));
  ok(await toLib(p),'"Your booklets" is reached');
  ok(await p.locator('#main .modes').count()===1&&/Dashboard/.test(await p.locator('#main .modes').innerText()),'the store booklet is listed under Your booklets');
  GET_DELAY['dash.md']=1200;
  await p.locator('#main .modes button.primary').first().click();
  ok(await until(async()=>/Opening dash\.md…/.test(await p.locator('#main').innerText()),1000),'"Opening dash.md…" shows while the file is read');
  await ready(p);await sleep(300);GET_DELAY={};
  ok(/What is next\?/.test(await p.locator('#main').innerText())&&await answer(p)==='QZXanswered'&&await offer(p)===0,'Open from the list draws the rewritten file with the answer, no offer');
  await p.screenshot({path:path.join(OUT,'store-open-1280.png')});
  viol.push(...await p.evaluate(()=>window.__viol||[]));await p.close();

  // 2 a pointer renamed from the list, then opened by its link on a fresh load (the host registers after the file)
  FILES['week.md']=rec(bk('Week','How was the week?'),'QZXrecord');
  p=await open();
  await p.goto(PAGE+'/app/#/open/week.md');await ready(p);await sleep(1200);
  ok(await answer(p)==='QZXrecord','the store file opens with its record');
  await toLib(p);
  await p.locator('#main .modes button',{hasText:'Rename'}).first().click();await sleep(200);
  await p.locator('#main input.nameedit').fill('Week (mine)');await p.keyboard.press('Enter');await sleep(400);
  ok(/Week \(mine\)/.test(await p.locator('#main .modes').innerText()),'the list shows the new name');
  const before=PUTS.length;
  await p.goto(PAGE+'/');await p.goto(PAGE+'/app/#/open/week.md');await ready(p);await sleep(1500);
  ok(await answer(p)==='QZXrecord','opened by its link again, the record is shown');
  ok(/QZXrecord/.test(FILES['week.md']),'the store file still holds the record');
  ok(PUTS.slice(before).length>0&&PUTS.slice(before).every(x=>/QZXrecord/.test(x.text)),'the host is told of the booklet, and every save sent since holds the record: '+PUTS.slice(before).length+' sent, '+PUTS.slice(before).filter(x=>!/QZXrecord/.test(x.text)).length+' without it');
  await toLib(p);
  ok(/Week \(mine\)/.test(await p.locator('#main .modes').innerText()),'the name the reader gave it is still in the list');
  viol.push(...await p.evaluate(()=>window.__viol||[]));await p.close();

  // 3 work the store lacks (its saves fail) opens as kept, with the offer
  FILES['fail.md']=bk('Failing','Anything?');FAIL_PUT.add('fail.md');
  p=await open();
  await p.goto(PAGE+'/app/#/open/fail.md');await ready(p);await sleep(1000);
  await p.locator('#main textarea').first().click();await p.keyboard.type('QZXlocal');
  ok(await until(async()=>/Not saved/.test(await p.locator('#hostLine').innerText())),'a failing save says Not saved');
  regen('fail.md',bk('Failing','Anything new?'));
  await p.goto(PAGE+'/');await p.goto(PAGE+'/app/#/open/fail.md');await ready(p);await sleep(700);
  ok(await answer(p)==='QZXlocal'&&await offer(p)===1,'the kept copy, which holds work the store lacks, opens with the offer');
  await p.screenshot({path:path.join(OUT,'store-kept-offer-1280.png')});
  viol.push(...await p.evaluate(()=>window.__viol||[]));await p.close();

  ok(viol.length===0&&csp.length===0,'zero CSP violations: '+viol.concat(csp).join('|'));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'all store-held browser checks passed');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
