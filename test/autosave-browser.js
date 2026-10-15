// Browser check for the save status and auto-save (renderer 0.13.1, v0.13 item 13), in real Chromium, on the renderer as
// published (its real 2 s pause and 5 s bound). The page is served at a private name with a `booklet-store` tag, under a
// box-style policy that lets the page read and write its own origin, and, for the hosted cases, with a host's script of the
// test's own beside it, served as a file (nothing of it is in booklet.html). The store is the test's: GET gives the file,
// PUT keeps the text. Checks:
//   - typing for 12 s sends about three changes to the host, not one per key, the last carrying the last key;
//   - the three states with a host (Saving from the change, before it is sent; Saved on the answer; Unsaved on a failure,
//     staying Unsaved through the next change until a save succeeds), a saved() for an older change that leaves it at
//     Saving, and without a host (Saved, Unsaved, never Saving, Saved again after Download);
//   - the "at once" cases a browser alone can show: the page hidden (visibilitychange), the page left past the warning
//     (pagehide: the host is told as the page goes), and Download;
//   - nothing lost by waiting: a page closed in the wait, its host never answering, and the change is at the store after
//     the next open;
//   - each state's word, shape and colours: the tone tokens of its state, text on its ground at 4.5 to 1 or more in all four
//     bases; a border in forced colours; nothing of it in print; the polite live region; the line behind it, opened;
//   - no sideways overflow at 390 px; zero CSP violations and page errors.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/autosave-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PAGE='http://fleet',LABEL='fleet: test store';
const BOX_CSP=CSP.replace('connect-src https://raw.githubusercontent.com',"connect-src 'self' https://raw.githubusercontent.com");
if(BOX_CSP===CSP) throw new Error('csp.js no longer has the expected connect-src: update this test');
const FM=t=>`---\nbooklet: "0.13"\ntitle: ${t}\nlang: en\n---\n\n`;
const bk=(t,q)=>FM(t)+`> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q long] ${q||'What stood out?'}\n\n> [!module|m end] End\n`;
const FILES={};
/* the test's host script: it records every call (and the last one's text under a key of its own in local storage, which a
   page on the same origin can read after this one has gone); window.__mode, set before the page loads, says how it
   answers: "auto" (saved at once), "put" (one PUT to ../store/<name>, then saved), "none" (never: a save lost as the page
   went) or "manual" (the test answers through window.__h) */
const HOSTJS=`(function(){var me=window.__h=Booklet.host({label:${JSON.stringify(LABEL)}});window.__calls=[];
  Booklet.onChange(function(c){window.__calls.push({change:c.change,text:c.text,name:c.name,at:Date.now()});var m=window.__mode||"auto";
    try{localStorage.setItem("test.host.last",c.text);}catch(e){}
    if(m==="auto") me.saved(c);
    else if(m==="put") fetch(new URL("../store/"+c.name,location.href).href,{method:"PUT",body:c.text,keepalive:true,headers:{"Content-Type":"text/markdown; charset=utf-8"}})
      .then(function(r){if(!r.ok) throw new Error("status "+r.status);me.saved(c);},function(e){me.failed(String(e),c);});});})();`;
const page=host=>{let h=fs.readFileSync(HTML,'utf8');
  h=h.replace('<meta name="theme-color"','<meta name="booklet-store" content="/store/">\n<meta name="theme-color"');
  if(!host) return h;const i=h.lastIndexOf('</body>');if(i<0) throw new Error('no </body>');
  return h.slice(0,i)+'<script src="/app/host.js"></script>\n'+h.slice(i);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* the contrast of two CSS colours, as WCAG reckons it */
const lum=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);});return .2126*v[0]+.7152*v[1]+.0722*v[2];};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const HOSTED=page(true),PLAIN=page(false);
  const b=await chromium.launch();
  const errs=[],viol=[],csp=[];
  const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  await ctx.route(PAGE+'/**',async r=>{const q=r.request(),u=new URL(q.url()).pathname;
    const html={'content-type':'text/html; charset=utf-8','content-security-policy':BOX_CSP};
    if(u==='/app/') return r.fulfill({status:200,body:HOSTED,headers:html});
    if(u==='/plain/') return r.fulfill({status:200,body:PLAIN,headers:html});
    if(u==='/app/host.js') return r.fulfill({status:200,body:HOSTJS,headers:{'content-type':'text/javascript'}});
    if(u==='/') return r.fulfill({status:200,body:'<!doctype html><title>elsewhere</title>',headers:{'content-type':'text/html'}});
    if(u.startsWith('/store/')){const name=decodeURIComponent(u.slice(7));
      if(q.method()==='PUT'){FILES[name]=q.postData()||'';return r.fulfill({status:200,body:'{"ok":true}',headers:{'content-type':'application/json'}});}
      return name in FILES?r.fulfill({status:200,body:FILES[name],headers:{'content-type':'text/markdown; charset=utf-8'}}):r.fulfill({status:404,body:'nf'});}
    if(u.startsWith('/plain/parts/')||u.startsWith('/app/parts/')) return r.fulfill({status:404,body:'nf'});
    r.fulfill({status:404,body:'nf'});});
  const open=async mode=>{const p=await ctx.newPage();
    p.on('pageerror',e=>errs.push(e.message));
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    await p.addInitScript(([l,m])=>{try{localStorage.setItem('booklet.host.allowed',l);}catch(e){}window.__mode=m;
      document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});
      /* every state the status was ever drawn in, in order */
      window.__states=[];new MutationObserver(()=>{const s=document.getElementById('saveBtn');const v=s&&!s.hidden?s.getAttribute('data-state'):null;
        if(v&&window.__states[window.__states.length-1]!==v) window.__states.push(v);}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-state','hidden']});},[LABEL,mode]);
    return p;};
  const state=p=>p.locator('#saveBtn').getAttribute('data-state');
  const calls=p=>p.evaluate(()=>window.__calls.length);
  const until=async(f,ms)=>{const t=Date.now();while(Date.now()-t<(ms||8000)){if(await f()) return true;await sleep(50);}return false;};
  const ready=p=>p.waitForSelector('#main textarea',{timeout:10000}).catch(()=>null);
  const done=async p=>{viol.push(...await p.evaluate(()=>window.__viol||[]).catch(()=>[]));await p.close();};

  // 1 twelve seconds of typing: about three sends, not one per key
  FILES['type.md']=bk('Typing');
  let p=await open('auto');
  await p.goto(PAGE+'/app/#/open/type.md');await ready(p);
  ok(await until(async()=>await calls(p)===1),'the host hears the booklet once, at once, when it opens');
  ok(await until(async()=>await state(p)==='saved'),'answered: the status says Saved');
  await p.locator('#main textarea').first().click();
  const t0=Date.now();let keys=0;
  while(Date.now()-t0<12000){await p.keyboard.type(String.fromCharCode(97+keys%26));keys++;await sleep(110);}
  const during=await calls(p)-1;
  ok(await state(p)==='saving','while typing goes on the status says Saving: '+await state(p));
  await sleep(2600);
  const sent=(await p.evaluate(()=>window.__calls)).slice(1);
  ok(sent.length>=2&&sent.length<=4,`12 s of typing (${keys} keys) sends about three changes, not one per key: ${sent.length} (${during} while typing)`);
  const gaps=sent.map((c,i)=>c.at-(i?sent[i-1].at:t0));
  ok(gaps.slice(0,-1).every(g=>g>=4000&&g<=6000),'while typing goes on, a change goes every 5 s: '+gaps.join(', ')+' ms');
  ok(sent.length>0&&sent[sent.length-1].text.includes(await p.locator('#main textarea').first().inputValue()),'the last carries the last key');
  ok(sent.every((c,i)=>c.change===(i?sent[i-1].change:1)+1),'change numbers count up by one per send: '+sent.map(c=>c.change).join());
  ok(await state(p)==='saved','after the pause and the answer: Saved');
  await done(p);

  // 2 the three states with a host, and a saved() for an older change
  FILES['states.md']=bk('States');
  p=await open('manual');
  await p.goto(PAGE+'/app/#/open/states.md');await ready(p);
  ok(await until(async()=>await calls(p)===1)&&await state(p)==='saving','a booklet just opened, its open not yet answered: Saving');
  await p.evaluate(()=>window.__h.saved(window.__calls[0]));
  ok(await state(p)==='saved','the host answers saved: Saved');
  await p.screenshot({path:path.join(OUT,'save-host-saved-1280.png'),clip:{x:0,y:0,width:1280,height:120}});
  await p.locator('#main textarea').first().click();await p.keyboard.type('first');
  ok(await state(p)==='saving'&&await calls(p)===1,'a change: Saving at once, from the change, before anything is sent');
  await p.screenshot({path:path.join(OUT,'save-host-saving-1280.png'),clip:{x:0,y:0,width:1280,height:120}});
  ok(await until(async()=>await calls(p)===2,4000),'it is sent once typing has paused');
  await p.keyboard.type(' second');
  ok(await until(async()=>await calls(p)===3,4000),'set up: a newer change sent after it');
  await p.evaluate(()=>window.__h.saved(window.__calls[1]));
  ok(await state(p)==='saving','a saved() for the older change leaves the status at Saving');
  await p.evaluate(()=>window.__h.saved(window.__calls[2]));
  ok(await state(p)==='saved','a saved() for the latest: Saved');
  ok(await p.locator('#saveSay').textContent()==='Saved','the polite live region says Saved');
  await p.keyboard.type(' third');await until(async()=>await calls(p)===4,4000);
  await p.evaluate(()=>window.__h.failed('the disk is full',window.__calls[3]));
  ok(await state(p)==='unsaved','a failed answer: Unsaved');
  ok(await p.locator('#saveSay').textContent()==='Unsaved','and the live region says Unsaved');
  await p.locator('#saveBtn').click();
  ok(await p.locator('#hostLine').isVisible()&&/^Saves go to: fleet: test store · Not saved: the disk is full$/.test(await p.locator('#hostLine').innerText())&&await p.locator('#saveBtn').getAttribute('aria-expanded')==='true','pressed, the status opens its line, which says where and why');
  await p.screenshot({path:path.join(OUT,'save-host-unsaved-open-1280.png'),clip:{x:0,y:0,width:1280,height:120}});
  await p.locator('#saveBtn').click();
  ok(!await p.locator('#hostLine').isVisible(),'pressed again, the line closes');
  /* a failure is sticky: Unsaved until a save succeeds */
  await p.locator('#main textarea').first().click();await p.keyboard.type(' fourth');
  ok(await state(p)==='unsaved'&&/· Not saved: the disk is full · trying again$/.test(await p.locator('#hostLine').innerText()),'a change after a failure stays Unsaved, its line saying the failure and that it is trying again: '+await p.locator('#hostLine').innerText());
  ok(await until(async()=>await calls(p)===5,4000)&&await state(p)==='unsaved','the change still goes on the cadence, and the status stays Unsaved while it is on its way');
  await p.evaluate(()=>window.__h.saved(window.__calls[4]));
  ok(await state(p)==='saved'&&await p.locator('#saveSay').textContent()==='Saved','saved() for the latest change: Saved, and the live region says so');
  const seen=await p.evaluate(()=>window.__states);
  ok(seen.join()==='saving,saved,saving,saved,saving,unsaved,saved','the status went Saving, Saved, Saving, Saved, Saving, Unsaved, Saved and nothing else (no Saving after the failure): '+seen.join());
  await done(p);

  // 3 no host: Saved, Unsaved, never Saving, and Saved again after Download
  p=await open('none');
  await p.goto(PAGE+'/plain/');await p.waitForTimeout(300);
  await p.evaluate(t=>window.Booklet.open(t),bk('Mine','What did you notice?'));await ready(p);
  ok(await state(p)==='saved'&&await p.locator('#hostLine').innerText()==='No changes since the file was opened or downloaded','no host, a booklet just read from its file: Saved, nothing changed since');
  await p.locator('#main textarea').first().click();await p.keyboard.type('a note of my own');await sleep(2500);
  ok(await state(p)==='unsaved','a change: Unsaved');
  await p.locator('#saveBtn').click();
  ok(await p.locator('#hostLine').innerText()==='Kept in this browser only','its line, when asked: Kept in this browser only');
  await p.locator('#saveBtn').click();
  /* (the download is awaited from before the click: Download is one click, and a dialog's choice on an older renderer) */
  const dlWait=p.waitForEvent('download');
  await p.locator('#btnExport').click();
  const choice=p.locator('.exportchoice');if(await choice.count()) await choice.first().click();
  await dlWait;await sleep(200);
  ok(await state(p)==='saved','downloaded: Saved');
  const seenNo=await p.evaluate(()=>window.__states);
  ok(!seenNo.includes('saving')&&seenNo.join()==='saved,unsaved,saved','with no host it was never Saving: '+seenNo.join());
  ok(await p.locator('#btnExport.attention').count()===0&&await p.locator('#main .unsaved').count()===0,'and there is no other signal: no mark on Download, no note on the page');
  await done(p);

  // 4 at once: the page hidden, Download, the page left (the host's save reaches the store)
  FILES['now.md']=bk('Now');
  p=await open('auto');
  await p.goto(PAGE+'/app/#/open/now.md');await ready(p);await until(async()=>await state(p)==='saved');
  await p.locator('#main textarea').first().click();await p.keyboard.type('QZXhidden');
  let n=await calls(p);
  await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  ok(await calls(p)===n+1&&/QZXhidden/.test(await p.evaluate(()=>window.__calls[window.__calls.length-1].text)),'the page hidden: the waiting change is sent at once');
  await p.evaluate(()=>{delete document.visibilityState;});
  await p.keyboard.type(' QZXdownload');n=await calls(p);
  /* (one click once the Download button downloads at once; on a renderer whose button opens the export dialog, its choice) */
  const dl2=p.waitForEvent('download');await p.locator('#btnExport').click();
  if(await p.locator('.exportchoice').count()) await p.locator('.exportchoice').first().click();
  await dl2;
  ok(await calls(p)===n+1&&/QZXdownload/.test(await p.evaluate(()=>window.__calls[window.__calls.length-1].text)),'Download: the waiting change is sent at once (as the reader takes a copy)');
  await done(p);
  /* the page left: the reader goes elsewhere in the wait, past the warning (Leave). Whether a host's own request survives the
     page going is the browser's affair (docs/hosting.md); what the renderer owes is to tell the host, at once, as it goes. */
  FILES['leave.md']=bk('Leave');
  p=await open('auto');
  await p.goto(PAGE+'/app/#/open/leave.md');await ready(p);await until(async()=>await state(p)==='saved');
  await p.locator('#main textarea').first().click();await p.keyboard.type('QZXleaving');
  let warned=false;p.on('dialog',d=>{if(d.type()==='beforeunload') warned=true;d.accept();});
  await p.goto(PAGE+'/');
  ok(warned,'leaving in the wait warns (the change is not yet saved)');
  ok(/QZXleaving/.test(await p.evaluate(()=>localStorage.getItem('test.host.last'))||''),'the page left in the wait (pagehide): the host is told of the change at once, as the page goes');
  await done(p);

  // 5 nothing lost by waiting: closed in the wait, the host never answering; the change is at the store after the next open
  FILES['lost.md']=bk('Lost');
  p=await open('none');
  await p.goto(PAGE+'/app/#/open/lost.md');await ready(p);await until(async()=>await calls(p)===1);
  await p.locator('#main textarea').first().click();await p.keyboard.type('QZXnotlost');await sleep(600);
  ok(await state(p)==='saving'&&!/QZXnotlost/.test(FILES['lost.md']),'set up: the change waits, and the store does not have it');
  await p.close();
  ok(!/QZXnotlost/.test(FILES['lost.md']),'the page closed, its host never answered: the store still lacks the change');
  p=await open('put');
  await p.goto(PAGE+'/app/#/open/lost.md');await ready(p);
  ok(await p.locator('#main textarea').first().inputValue()==='QZXnotlost','at the next open the browser\'s kept copy opens, with the change');
  ok(await until(()=>/QZXnotlost/.test(FILES['lost.md']),4000),'and the change reaches the store, at once');
  ok(await until(async()=>await state(p)==='saved'),'then Saved');
  await done(p);

  // 6 the look: the tone of each state, text on its ground in all four bases, forced colours, print, a phone
  FILES['look.md']=bk('Look');
  p=await open('manual');
  await p.goto(PAGE+'/app/#/open/look.md');await ready(p);await until(async()=>await calls(p)===1);
  const SHAPE={saved:'bi-circle-check',saving:'bi-circle-dashed',unsaved:'bi-triangle-alert'},WORD={saved:'Saved',saving:'Saving…',unsaved:'Unsaved'};
  const TONE={saved:['--tone-green','--tone-green-deep'],saving:['--tone-amber','--tone-amber-deep'],unsaved:['--tone-warm','--tone-warm-deep']};
  const toState=async st=>{if(st==='saving'){await p.locator('#main textarea').first().click();await p.keyboard.type('x');}
    else if(st==='saved'){await until(async()=>await calls(p)>0);await sleep(2200);await p.evaluate(()=>window.__h.saved(window.__calls[window.__calls.length-1]));}
    else{await sleep(2200);await p.evaluate(()=>window.__h.failed('down',window.__calls[window.__calls.length-1]));}};
  const looks=[];
  for(const st of ['saved','saving','unsaved']){await toState(st);
    ok(await state(p)===st,'set up: '+st);
    const shape=await p.evaluate(()=>{const u=document.querySelector('#saveBtn svg use');return u&&u.getAttribute('href');});
    ok(shape==='#'+SHAPE[st]&&(await p.locator('#saveBtn').innerText()).trim()===WORD[st],st+': its own shape ('+shape+') and word');
    for(const theme of ['paper','daylight','night','contrast']){await p.evaluate(t=>window.bookletTheme.set(t),theme);
      const L=await p.evaluate(tn=>{const b=document.getElementById('saveBtn'),cs=getComputedStyle(b),root=getComputedStyle(document.documentElement);
        const probe=v=>{const d=document.createElement('i');d.style.color='var('+v+')';document.body.append(d);const c=getComputedStyle(d).color;d.remove();return c;};
        return {fg:cs.color,bg:cs.backgroundColor,icon:getComputedStyle(b.querySelector('svg')).stroke,wash:probe(tn[0]),deep:probe(tn[1])};},TONE[st]);
      looks.push({st,theme,...L});
      ok(L.bg===L.wash&&L.fg===L.deep&&ratio(L.fg,L.bg)>=4.5&&L.icon===L.fg,`${st} in ${theme}: the tone's deep colour on its wash, ${ratio(L.fg,L.bg).toFixed(2)} to 1, the shape in the same colour`);}
    await p.evaluate(()=>window.bookletTheme.set('paper'));}
  ok(new Set(looks.filter(x=>x.theme==='paper').map(x=>x.bg)).size===3,'the three states have three different grounds');
  await p.emulateMedia({forcedColors:'active'});await sleep(100);
  const fc=await p.evaluate(()=>{const cs=getComputedStyle(document.getElementById('saveBtn'));return {w:cs.borderTopWidth,c:cs.borderTopColor,word:document.getElementById('saveBtn').innerText.trim()};});
  ok(fc.w==='1px'&&!/rgba\(0, 0, 0, 0\)|transparent/.test(fc.c)&&fc.word==='Unsaved','in forced colours the status keeps a visible border, its word and its shape: '+JSON.stringify(fc));
  await p.screenshot({path:path.join(OUT,'save-forced-colours-1280.png'),clip:{x:0,y:0,width:1280,height:120}});
  await p.emulateMedia({forcedColors:'none',media:'print'});await sleep(100);
  ok(!await p.locator('#saveBtn').isVisible()&&!await p.locator('#saveSay').isVisible(),'in print the status is left out');
  await p.emulateMedia({media:'screen'});
  await p.setViewportSize({width:390,height:844});await sleep(300);
  ok(await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=0,'no sideways overflow at 390 px');
  ok((await p.locator('.bar').boundingBox()).height<170,'the bar stays compact at 390 px: '+(await p.locator('.bar').boundingBox()).height);
  await p.locator('#saveBtn').click();await sleep(100);
  await p.screenshot({path:path.join(OUT,'save-host-unsaved-open-390.png'),clip:{x:0,y:0,width:390,height:260}});
  ok(await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=0,'nor with its line open');
  await done(p);

  ok(viol.length===0&&csp.length===0,'zero CSP violations: '+viol.concat(csp).join('|'));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
