// Browser check for the copy line (format 0.19, SPEC.md section 6, "Copy"): one button, drawn from `> [!copy|id of:a,b] Label`, that puts the assembled
// text on the clipboard when pressed and says "Copied" in a status line a screen reader announces. The clipboard is stubbed in the page (the stub
// records what is written), so the text can be read back: a typed answer, an empty one, the question's own solution, the lead-in; then the
// fallbacks (the clipboard call refuses and a text selection is copied by hand; both fail and the page says so); a press with the keyboard; and that
// pressing sends nothing and stores nothing (no request, no change to the page's storage), and that the lead-in is not drawn on the page.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/copy-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]);
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const text='---\nbooklet: "0.18"\ntitle: Tide notes\nlang: en\n---\n\n> [!activity|a] Tide notes\n\n'
 +'> [!text|why-twice long] Why does the tide come in twice a day?\n\n> [!solution]- Model answer\n> The moon pulls on both sides of the earth.\n\n'
 +'> [!choice|which] When is the range widest?\n- [ ] At the quarter moons\n- [x] Near the new and the full moon\n\n'
 +'> [!copy|ask-tutor of:why-twice,why-twice/solution,which] Copy for my tutor\n> Please mark my answer against the model answer. LEADIN-SECRET\n';
const ANSWER='Because the moon pulls the sea on both sides.';
const FULL=a=>'Please mark my answer against the model answer. LEADIN-SECRET\n\nQuestion: Why does the tide come in twice a day?\n\nMy answer: '+a
  +'\n\nModel answer: The moon pulls on both sides of the earth.\n\nQuestion: When is the range widest?\n\nMy answer: ';
(async()=>{
  const b=await chromium.launch();
  for(const W of [1280,390]){
    const ctx=await b.newContext({viewport:{width:W,height:900}});
    await ctx.addInitScript(()=>{
      window.__clip=[];window.__exec=[];window.__mode='ok';
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:t=>{if(window.__mode!=='ok') return Promise.reject(new Error('refused'));window.__clip.push(t);return Promise.resolve();}}});
      const was=document.execCommand.bind(document);
      document.execCommand=c=>{if(c!=='copy') return was(c);window.__exec.push({value:document.activeElement&&document.activeElement.value,tag:document.activeElement&&document.activeElement.tagName});return window.__mode!=='none';};});
    const p=await ctx.newPage();const errs=[],reqs=[];p.on('pageerror',e=>errs.push(e.message));p.on('request',r=>reqs.push(r.method()+' '+r.url()));
    await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
      r.fulfill(u==='/app/'?{status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}}:{status:404,body:'nf'});});
    const wait=ms=>p.waitForTimeout(ms);
    await p.goto('https://bookletmd.test/app/');await wait(500);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(250);
    await p.locator('#pasteIn').fill(text);await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(900);
    const btn=p.getByRole('button',{name:'Copy for my tutor'}),live=p.locator('#main .copy-live');
    ok(await btn.count()===1,`${W}px: one button, named by the copy line's title`);
    ok(await p.locator('#main .copy-row').count()===1,`${W}px: the line draws one row and nothing else`);
    ok(!/LEADIN-SECRET|Please mark|Model answer: /.test(await p.locator('#main').innerText()),`${W}px: the lead-in and the pieces are not drawn on the page`);
    ok(await live.getAttribute('role')==='status'&&await live.getAttribute('aria-live')==='polite',`${W}px: the status line is a live region that is there before the press`);
    ok(await live.innerText()==='',`${W}px: and is empty until then`);
    const h=await btn.evaluate(e=>e.getBoundingClientRect().height);ok(h>=44,`${W}px: the button is at least 44 px tall (${Math.round(h)})`);
    // an empty answer is copied all the same
    const before=await p.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k).length])));
    const nreq=reqs.length;
    await btn.click();await wait(150);
    let clip=await p.evaluate(()=>window.__clip);
    ok(clip.length===1&&clip[0]===FULL('(no answer typed)')+'(no answer typed)',`${W}px: an empty answer is copied all the same, with (no answer typed) (${JSON.stringify(clip[0])})`);
    ok(await live.innerText()==='Copied',`${W}px: the status line says Copied (${JSON.stringify(await live.innerText())})`);
    // a typed answer and a picked option
    await p.locator('#main textarea').first().fill(ANSWER);await wait(150);
    await p.locator('#main button.pill-btn').filter({hasText:/^Near the new and the full moon/}).click();await wait(250);
    const kept=await p.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k).length])));
    await btn.click();await wait(150);
    clip=await p.evaluate(()=>window.__clip);
    ok(clip.length===2&&clip[1]===FULL(ANSWER)+'Near the new and the full moon',`${W}px: a typed answer and a picked option are copied in the order listed, with the lead-in first (${JSON.stringify(clip[1])})`);
    // writes nothing and sends nothing
    await wait(300);
    ok(await p.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k).length])))===kept,`${W}px: pressing it changed nothing in the page's storage`);
    ok(await p.locator('#main textarea').first().inputValue()===ANSWER,`${W}px: the reader's answer is still there`);
    ok(reqs.slice(nreq).every(r=>r.startsWith('GET https://bookletmd.test/'))&&reqs.slice(nreq).length<=2,`${W}px: the presses sent nothing (${reqs.slice(nreq).join(' ')})`);
    // the status line clears itself
    await wait(4300);ok(await live.innerText()==='',`${W}px: the status line clears itself`);
    // the keyboard
    await btn.focus();await p.keyboard.press('Enter');await wait(150);
    ok((await p.evaluate(()=>window.__clip)).length===3&&await live.innerText()==='Copied',`${W}px: Enter on the focused button copies`);
    await p.keyboard.press('Space');await wait(150);
    ok((await p.evaluate(()=>window.__clip)).length===4,`${W}px: so does Space`);
    // the clipboard call refuses: a selection is copied by hand
    await p.evaluate(()=>{window.__mode='reject';});
    await btn.click();await wait(250);
    {const ex=await p.evaluate(()=>window.__exec);
     ok(ex.length===1&&ex[0].tag==='TEXTAREA'&&ex[0].value===FULL(ANSWER)+'Near the new and the full moon',`${W}px: when the clipboard call refuses, the text is copied from a selection (${JSON.stringify(ex.map(e=>e.tag))})`);
     ok(await live.innerText()==='Copied',`${W}px: and it says Copied`);
     ok(await p.locator('textarea.copy-ghost').count()===0,`${W}px: the selection's textarea is taken out again`);
     ok(await p.evaluate(()=>document.activeElement&&document.activeElement.tagName)==='BUTTON',`${W}px: and the focus goes back to the button`);}
    // both refuse
    await p.evaluate(()=>{window.__mode='none';});
    await btn.click();await wait(250);
    ok(/Could not copy/.test(await live.innerText()),`${W}px: when both fail, it says so (${JSON.stringify(await live.innerText())})`);
    await p.evaluate(()=>{window.__mode='ok';});
    // print
    await p.emulateMedia({media:'print'});
    ok(await p.locator('#main .copy-row').evaluate(e=>getComputedStyle(e).display)==='none',`${W}px: the button is left out when printed`);
    await p.emulateMedia({media:'screen'});
    ok(errs.length===0,`${W}px: no script error (${errs.join(' | ')})`);
    await ctx.close();}
  await b.close();
  if(fails.length){console.log('FAILED '+fails.length);process.exit(1);}
  console.log('copy checks passed');
})();
