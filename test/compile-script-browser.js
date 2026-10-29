// Browser pledge for the compiler's script and its quiz (compile/script.js, compile/script/, the quiz in compile/draw.js and
// compile/booklet.css), in Chromium. The page is served over http from 127.0.0.1 on a port of its own (so storage, cookies and
// requests are real, as on a host), and the made-up quiz test/fixtures/compile-quiz.booklet.md is opened.
//
// With scripting ON, the test answers every kind of question the page can answer (a graded pick-one right and wrong, a graded
// pick-any with Check, a changed tick turning Check off, a pick-one with replies, a pick-any without a right answer), presses
// every word of both widgets, touches the read-only kinds, and then asserts the pledge:
//   - localStorage, sessionStorage, IndexedDB, the cache storage and the service workers are empty, and there is no cookie
//     (the browser's own jar and document.cookie);
//   - every request is a GET for one of the page's own files (the page, the stylesheet, the script, a font), none beyond;
//   - a reload starts clean: no input is ticked, no verdict or reply is showing, Check is off, the live region is empty.
// The detector is proved on every run: the same page is then served with its script replaced by one that stores something in
// each place, makes a request, or sets a cookie, and the detector must name each.
//
// With scripting OFF: every question still reads as in 0.1.0 (its words, every option, every anchor, every item), no part of
// the page is hidden that a press would not show (every option's reply and verdict comes up when its input is pressed, and a
// graded pick-any's marks when Check is), a widget's note comes up on a press, and no control but a checkbox or radio exists.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/compile-script-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),http=require('http');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','booklet.html'));
const OUT=path.resolve(process.argv[3]||'.','compile-script-pages');
const C=require('../compile/compile.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};

fs.rmSync(OUT,{recursive:true,force:true});
const run=C.compile([{file:path.join(__dirname,'fixtures','compile-quiz.booklet.md')}],{form:'standalone',renderer:HTML});
C.write(run,OUT,{force:true});
ok(run.results.every(r=>r.rep.ok)&&run.script&&run.script.parts.includes('10-quiz.js'),'the quiz compiles, with the script');
const PAGE='/compile-quiz/';

/* a plain static server for the output folder; `swap` replaces one file's text, for the detector's own proof */
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.txt':'text/plain'};
const seen=[];let swap={};
const server=http.createServer((req,res)=>{
  seen.push({method:req.method,url:req.url});
  const u=decodeURIComponent(req.url.split('?')[0]);
  let rel=u.endsWith('/')?u+'index.html':u;
  const file=path.join(OUT,rel);
  if(!file.startsWith(OUT)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('no');return;}
  const body=swap[rel]!=null?Buffer.from(swap[rel]):fs.readFileSync(file);
  res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream'});res.end(body);});

const ASK=(page,words)=>page.locator('fieldset.bk-q',{hasText:words});

/* the pledge, as a list of what was found wrong: kept in no place, sent to no place */
async function pledge(page,context,origin,label){
  const bad=[];
  const inPage=await page.evaluate(async()=>{
    const o={};
    try{o.local=localStorage.length;}catch(e){o.local='blocked';}
    try{o.session=sessionStorage.length;}catch(e){o.session='blocked';}
    o.cookie=document.cookie;
    try{o.idb=indexedDB.databases?(await indexedDB.databases()).length:0;}catch(e){o.idb='blocked';}
    try{o.caches=window.caches?(await caches.keys()).length:0;}catch(e){o.caches=0;}
    try{o.workers=navigator.serviceWorker?(await navigator.serviceWorker.getRegistrations()).length:0;}catch(e){o.workers=0;}
    o.resources=performance.getEntriesByType('resource').map(r=>r.name);
    return o;});
  if(inPage.local!==0) bad.push('localStorage holds '+inPage.local);
  if(inPage.session!==0) bad.push('sessionStorage holds '+inPage.session);
  if(inPage.cookie!=='') bad.push('document.cookie is set');
  if((await context.cookies()).length) bad.push('the browser holds a cookie');
  if(inPage.idb!==0) bad.push('IndexedDB has a database');
  if(inPage.caches!==0) bad.push('the cache storage has a cache');
  if(inPage.workers!==0) bad.push('a service worker is registered');
  const own=u=>u===PAGE||u===PAGE+'index.html'||/^\/booklet\/(booklet\.css|booklet\.js|fonts\/[a-z0-9.-]+\.woff2)$/.test(u);
  for(const s of seen) if(s.method!=='GET'||!own(s.url.split('?')[0])) bad.push('a request beyond the page\'s own files: '+s.method+' '+s.url);
  for(const r of inPage.resources) if(!r.startsWith(origin+'/')||!own(r.slice(origin.length).split('?')[0])) bad.push('a resource beyond the page\'s own files: '+r);
  return bad;}

(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch();
  try{
    /* ======== scripting ON ======== */
    const ctx=await browser.newContext({viewport:{width:900,height:1200}});
    const page=await ctx.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
    await page.goto(origin+PAGE);
    ok(await page.locator('script[src$="booklet.js"][defer]').count()===1,'the page links the script once, with defer');

    /* a graded pick-one: wrong, then right */
    const colour=ASK(page,'lamp\'s beam');
    await colour.locator('label',{hasText:'Red'}).click();
    ok(await colour.locator('.bk-opt').nth(0).locator('.bk-v-wrong').isVisible(),'pick-one, wrong: the picked option says not quite');
    ok(await colour.locator('.bk-opt').nth(1).locator('.bk-v-answer').isVisible(),'pick-one, wrong: the right option is marked as the answer');
    ok(await colour.locator('.bk-opt').nth(0).locator('.bk-reply').isVisible()&&!(await colour.locator('.bk-opt').nth(1).locator('.bk-reply').isVisible()),'pick-one: only the picked option\'s reply shows');
    ok(await colour.locator('.bk-say-no').isVisible()&&!(await colour.locator('.bk-say-ok').isVisible()),'pick-one, wrong: the verdict line says not quite, with the answer');
    ok((await colour.locator('.bk-live').textContent()).startsWith('Not quite. The answer is White'),'pick-one, wrong: the live region is told');
    await colour.locator('label',{hasText:'White'}).click();
    ok(await colour.locator('.bk-opt').nth(1).locator('.bk-v-right').isVisible()&&!(await colour.locator('.bk-v-answer').first().isVisible()),'pick-one, right: the option says right, and nothing is marked as the answer');
    ok(await colour.locator('.bk-say-ok').isVisible()&&(await colour.locator('.bk-live').textContent())==='Right.','pick-one, right: the verdict line and the live region say right');
    ok(!(await colour.locator('.bk-opt').nth(0).locator('.bk-reply').isVisible()),'pick-one: the reply of the option let go is gone');

    /* a graded pick-any: nothing until Check; Check marks; a changed tick turns Check off */
    const parts=ASK(page,'parts of a lighthouse');
    ok(!(await parts.locator('.bk-check-btn').isVisible()),'pick-any with a right answer: Check waits for a first tick');
    await parts.locator('label',{hasText:'lantern room'}).click();
    ok(await parts.locator('.bk-check-btn').isVisible(),'…and shows after one');
    ok(!(await parts.locator('.bk-verdict:visible').count())&&!(await parts.locator('.bk-reply:visible').count()),'…and before Check, no mark and no reply shows');
    await parts.locator('label',{hasText:'rudder'}).click();
    await parts.locator('.bk-check-btn').click();
    ok(await parts.locator('.bk-opt').nth(0).locator('.bk-v-right').isVisible(),'Check: a ticked right option is right');
    ok(await parts.locator('.bk-opt').nth(1).locator('.bk-v-wrong').isVisible(),'Check: a ticked wrong option is not quite');
    ok(await parts.locator('.bk-opt').nth(2).locator('.bk-v-answer').isVisible(),'Check: a right option left unticked is marked as the answer');
    ok(await parts.locator('.bk-say-no').isVisible()&&(await parts.locator('.bk-live').textContent()).startsWith('Not quite. The answer is The lantern room, The gallery'),'Check: not quite, with the answer, spoken');
    ok(await parts.locator('.bk-reply:visible').count()===2,'Check: the replies of the two ticked options show (the unticked gallery has none to show)');
    await parts.locator('label',{hasText:'rudder'}).click();
    ok(!(await parts.locator('.bk-check:checked').count())&&!(await parts.locator('.bk-verdict:visible').count())&&(await parts.locator('.bk-live').textContent())==='','a changed tick turns Check off: the marks go and the live region is cleared');
    await parts.locator('label',{hasText:'gallery'}).click();
    await parts.locator('.bk-check-btn').click();
    ok(await parts.locator('.bk-say-ok').isVisible()&&(await parts.locator('.bk-live').textContent())==='Right.'&&!(await parts.locator('.bk-v-wrong:visible').count()),'Check, all right and none wrong: right');

    /* a pick-one with replies and no right answer; a pick-any with neither */
    const keeper=ASK(page,'looked after the lamp');
    await keeper.locator('label',{hasText:'The keeper'}).click();
    ok(await keeper.locator('.bk-reply:visible').count()===1&&!(await keeper.locator('.bk-verdict').count()),'a pick-one with replies and no right answer shows the reply, and marks nothing');
    const views=ASK(page,'from the gallery');
    await views.locator('label',{hasText:'Ships'}).click();await views.locator('label',{hasText:'Birds'}).click();
    ok(await views.locator('input:checked').count()===2,'a pick-any with no right answer takes ticks');

    /* the kinds that stay read-only, and the one left off */
    for(const [kind,words] of [['choice','oldest tower'],['scale','How clear'],['matrix','each part'],['number','How tall'],['date','was it built'],['text','did you notice'],['lines','Facts you learned']]){
      const q=ASK(page,words);
      ok(await q.count()===1&&(await q.getAttribute('data-bk-kind'))===kind&&!(await q.locator('input,button,select,textarea').count()),'read-only here: the '+kind+' question has nothing to press');}
    ok(await page.locator('fieldset.bk-q',{hasText:'Why that part'}).count()===0,'a question asked for each pick is left off (the report says so)');

    /* every word of both widgets */
    const widgets=page.locator('fieldset.bk-widget');
    ok(await widgets.count()===3,'three widgets');
    for(const w of [0,1]){
      const labels=widgets.nth(w).locator('.bk-pickable>label');const n=await labels.count();
      for(let i=0;i<n;i++){await labels.nth(i).click();
        const li=widgets.nth(w).locator('.bk-pickable').nth(i);
        ok(await li.locator('input').isChecked(),'widget '+(w+1)+', word '+(i+1)+': pressed');
        const bg=await labels.nth(i).evaluate(e=>getComputedStyle(e).backgroundColor);
        ok(bg!=='rgba(0, 0, 0, 0)','widget '+(w+1)+', word '+(i+1)+': highlighted ('+bg+')');
        const note=li.locator('.bk-shows');
        if(await note.count()) ok(await note.isVisible(),'widget '+(w+1)+', word '+(i+1)+': shows its note');}}
    ok(!(await widgets.nth(2).locator('input').count()),'a read-only widget has nothing to press');
    ok(errors.length===0,'no script error is logged'+(errors.length?': '+errors.join(' | '):''));

    const bad=await pledge(page,ctx,origin);
    ok(!bad.length,'the pledge holds after every press: nothing kept, nothing sent beyond the page\'s own files'+(bad.length?': '+bad.join('; '):''));
    ok(seen.length>=3&&seen.every(s=>s.method==='GET'),'the page and its files were fetched ('+seen.length+' requests, all GET)');

    /* a reload starts clean */
    await page.reload();
    ok(await page.locator('input:checked').count()===0,'a reload starts clean: nothing is ticked');
    ok(!(await page.locator('.bk-verdict:visible').count())&&!(await page.locator('.bk-reply:visible').count())&&!(await page.locator('.bk-shows:visible').count()),'…no verdict, reply or note shows');
    ok((await page.locator('.bk-live').evaluateAll(l=>l.map(e=>e.textContent).join('')))==='','…and the live regions are empty');
    /* a new tab of the same page starts clean too */
    const second=await ctx.newPage();await second.goto(origin+PAGE);
    ok(await second.locator('input:checked').count()===0,'a second tab starts clean');
    await second.close();
    await ctx.close();

    /* ======== the detector proves itself: the same page, its script swapped for one that breaks the pledge ======== */
    const original=fs.readFileSync(path.join(OUT,'booklet','booklet.js'),'utf8');
    const BREAKS=[['storage','window["local"+"Storage"].setItem("k","v");','localStorage holds'],
      ['session storage','window["session"+"Storage"].setItem("k","v");','sessionStorage holds'],
      ['a cookie','document["coo"+"kie"]="a=b";','document.cookie is set'],
      ['IndexedDB','window["indexed"+"DB"].open("kept");','IndexedDB has a database'],
      ['a request','new window["Ima"+"ge"]().src="/leak?x=1";','a request beyond'],
      ['a post','navigator["send"+"Beacon"]("/leak","x");','a request beyond']];
    for(const [what,code,expect] of BREAKS){
      seen.length=0;swap={'/booklet/booklet.js':original+'\n'+code+'\n'};
      const c2=await browser.newContext();const p2=await c2.newPage();
      await p2.goto(origin+PAGE);await p2.waitForTimeout(400);
      const b=await pledge(p2,c2,origin);
      ok(b.some(x=>x.includes(expect)),'the detector catches a script that uses '+what+(b.length?' ('+b[0]+')':' (nothing found)'));
      await c2.close();}
    swap={};seen.length=0;

    /* ======== scripting OFF ======== */
    const off=await browser.newContext({javaScriptEnabled:false,viewport:{width:900,height:1200}});
    const q=await off.newPage();await q.goto(origin+PAGE);
    const text=await q.locator('article').innerText();
    for(const w of ['What colour is the lighthouse','Red','White','Green','The lantern room','The keel','Round','Square','Not clear','The lamp','The gallery','Not yet','How tall','Wide beam','Flash','Steady','Nothing','Lamp','Base'])
      ok(text.includes(w),'scripting off: "'+w+'" is on the page, as in 0.1.0');
    ok(await q.locator('fieldset.bk-q').count()===14,'scripting off: every question and widget is there (14)');
    ok(!(await q.locator('button,select,textarea,input:not([type=checkbox]):not([type=radio])').count()),'scripting off: no control but a checkbox or a radio');
    ok(await q.locator('.bk-q-ask').evaluateAll(es=>es.length>0&&es.every(e=>e.offsetParent!==null)),'scripting off: every question\'s words are visible');
    ok(await q.locator('.bk-opt>label').evaluateAll(es=>es.length>0&&es.every(e=>e.offsetParent!==null)),'scripting off: every option is visible');
    /* nothing is hidden that a press would not show: each option's reply and verdict come up when it is pressed */
    const col=ASK(q,'lamp\'s beam');
    await col.locator('label',{hasText:'Red'}).click();
    ok(await col.locator('.bk-opt').nth(0).locator('.bk-reply').isVisible()&&await col.locator('.bk-opt').nth(0).locator('.bk-v-wrong').isVisible()&&await col.locator('.bk-opt').nth(1).locator('.bk-v-answer').isVisible(),'scripting off: a pick shows its reply and its verdict, with the answer (the stylesheet alone)');
    ok(await col.locator('.bk-say-no').isVisible(),'scripting off: and the verdict line');
    const pa=ASK(q,'parts of a lighthouse');
    await pa.locator('label',{hasText:'lantern room'}).click();await pa.locator('.bk-check-btn').click();
    ok(await pa.locator('.bk-v-right:visible').count()===1&&await pa.locator('.bk-reply:visible').count()===1,'scripting off: Check marks a pick-any, and shows the reply of what is ticked');
    ok(await pa.locator('.bk-live').evaluate(e=>e.textContent)==='','scripting off: the live region stays empty (only the script speaks)');
    const gl=q.locator('fieldset.bk-widget').first().locator('.bk-pickable>label').first();await gl.click();
    ok(await q.locator('fieldset.bk-widget').first().locator('.bk-shows:visible').count()===1,'scripting off: a widget\'s word, pressed, shows its note');
    for(const d of await q.locator('details').all()){await d.locator('summary').first().click();ok(await d.evaluate(e=>e.open),'scripting off: a fold opens');}
    await off.close();
  }finally{await browser.close();server.close();}
  console.log(fails.length?'\n'+fails.length+' FAILURES':'\ncompile script pledge: all checks passed');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
