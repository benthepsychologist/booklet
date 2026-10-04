// Browser checks for v0.8's questions: the reader's own option (`open`), right and wrong (`[x]`), the notice a file's
// problems make when it opens, and Escape on Add a module. Headless Chromium with the hosted /app/ Content-Security-Policy
// applied (served from a fake origin through page.route). Not a *.test.js, so test/run.sh does not run it: it needs Playwright.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/open-browser.js <booklet.html> <outdir>
// Checks, on test/fixtures/questions-open.booklet.md in each of the four themes at 1280px and 400px: no sideways page overflow;
// an own option added by the button and by Enter is a pressed pill with a remove control, and removing it works; a kept entry
// offers it again, unpressed; a wrong pick then a right one show the marks and the polite line; a multi with Check; the
// problems notice (test/fixtures/problems-reported.booklet.md) opens and dismisses; a refused file shows its messages and does
// not open; Escape closes Add a module; zero CSP violations and page errors. Screenshots are written to <outdir>.
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.',R=path.dirname(HTML);
const CSP="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const fx=n=>path.join(R,'test/fixtures',n);
  async function open(file,width,go){
    const ctx=await b.newContext({viewport:{width,height:1000}});const p=await ctx.newPage();
    const csp=[],errs=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',async r=>{const u=new URL(r.request().url()).pathname;
      if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
      r.fulfill({status:404,body:'nf'});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(go){await p.locator('button.mode').first().click();await p.waitForTimeout(500);
      if(go!==true){await p.locator('button.mode').filter({hasText:go}).first().click();await p.waitForTimeout(700);}}
    return {p,ctx,csp,errs};}
  const over=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const theme=async(p,n)=>{await p.selectOption('#themeSel',n);await p.waitForTimeout(250);};
  const shot=async(p,name)=>{await p.screenshot({path:path.join(OUT,name),fullPage:true});};
  const q=(p,words)=>p.locator('.ap-body div:has(> h3:has-text("'+words+'"))').first();
  const pill=(box,w)=>box.locator('.pills > button.pill-btn').filter({hasText:new RegExp('^'+w+'(\\s|$)')}).first();
  const own=box=>box.locator('.pill-own');

  // 1 the walk activity, every theme at 1280 and 400: the form, no overflow, no CSP violations
  for(const w of [1280,400]){
    const t=await open(fx('questions-open.booklet.md'),w,'A walk round');const p=t.p;
    const box=q(p,'What did you notice');
    ok(await box.locator('.q-own').count()===1&&await box.locator('.q-ownrow button').innerText()==='Add','the open question has its field and Add button at '+w+'px');
    ok(await q(p,'How was the weather').locator('.q-own').count()===1,'and so has the open choice');
    // by button
    await box.locator('.q-own').fill('Moths');await box.locator('.q-ownrow button').click();await p.waitForTimeout(150);
    ok(await own(box).count()===1&&await own(box).locator('button.pill-btn').getAttribute('aria-pressed')==='true','the button adds a pressed own pill at '+w+'px');
    ok((await own(box).locator('.pill-x').getAttribute('aria-label'))==='Remove “Moths”','with a remove control named for it');
    ok(await box.locator('.q-own').inputValue()==='','the field is empty again');
    // by Enter, with the focus staying in the field
    await box.locator('.q-own').click();await p.keyboard.type('Frogs');await p.keyboard.press('Enter');await p.waitForTimeout(150);
    ok(await own(box).count()===2,'Enter adds one too');
    ok(await p.evaluate(()=>document.activeElement&&document.activeElement.classList.contains('q-own')),'and the focus stays in the field');
    // equal to a listed option presses it, empty adds nothing
    await box.locator('.q-own').fill('  BEES ');await box.locator('.q-ownrow button').click();await p.waitForTimeout(100);
    await box.locator('.q-own').fill('   ');await box.locator('.q-ownrow button').click();await p.waitForTimeout(100);
    ok(await own(box).count()===2&&await pill(box,'Bees').getAttribute('aria-pressed')==='true','text equal to a listed option presses it; blank text adds nothing');
    // remove
    await own(box).first().locator('.pill-x').click();await p.waitForTimeout(150);
    ok(await own(box).count()===1&&(await own(box).first().innerText()).includes('Frogs'),'the remove control removes it');
    if(w===1280) await shot(p,'walk-own-paper-1280.png');
    // keep an entry, then the own options are offered again
    await pill(box,'Birds').click();
    await p.locator('.finalize').click();await p.waitForTimeout(500);
    const box2=q(p,'What did you notice');
    const names=await box2.locator('.pills > button.pill-btn').allInnerTexts();
    ok(names.map(x=>x.trim()).join()==='Birds,Fresh soil,Bees,Frogs'&&(await box2.locator('.pills > button.pill-btn[aria-pressed="true"]').count())===0,'after Finalize the own option is offered again, unpressed ('+names.join('|')+')');
    await pill(box2,'Frogs').click();await p.waitForTimeout(150);
    ok(await own(box2).count()===1,'pressing it makes it the pressed own option');
    for(const th of ['paper','daylight','night','contrast']){
      await theme(p,th);
      ok(await over(p)<=0,`${th} at ${w}px: no horizontal page overflow`);
      if(th==='paper'||th==='night') await shot(p,`walk-${th}-${w}.png`);}
    ok(t.csp.length===0&&t.errs.length===0,`${w}px: zero CSP violations and page errors `+t.csp.concat(t.errs).join('|'));
    await t.ctx.close();}

  // 2 the quiz: right and wrong, in every theme
  for(const w of [1280,400]){
    const t=await open(fx('questions-open.booklet.md'),w,'A small quiz');const p=t.p;
    const s=q(p,'Which season');
    await pill(s,'Autumn').click();await p.waitForTimeout(150);
    const live=s.locator('.q-live');
    ok((await pill(s,'Autumn').innerText()).includes('Not quite')&&(await pill(s,'Spring').innerText()).includes('The answer'),'a wrong pick is marked not right, and the answer is shown at '+w+'px');
    ok((await live.innerText())==='Not quite. The answer is Spring.'&&await live.getAttribute('aria-live')==='polite','the polite line says so');
    if(w===1280) await shot(p,'quiz-wrong-paper-1280.png');
    await pill(s,'Spring').click();await p.waitForTimeout(150);
    ok((await pill(s,'Spring').innerText()).includes('Right')&&(await live.innerText())==='Right.','a right pick is marked right');
    if(w===1280){await shot(p,'quiz-right-paper-1280.png');}
    const m=q(p,'Which of these are fruit');
    ok(await m.locator('.q-acts button').count()===0,'no Check button before anything is picked');
    await pill(m,'Apple').click();await p.waitForTimeout(100);
    ok(await m.locator('.q-acts button').innerText()==='Check'&&await m.locator('.q-mk').count()===0,'Check appears once something is picked, and nothing is marked yet');
    await m.locator('.q-acts button').click();await p.waitForTimeout(150);
    ok((await pill(m,'Apple').innerText()).includes('Right')&&(await pill(m,'Pear').innerText()).includes('The answer')&&await pill(m,'Carrot').locator('.q-mk').count()===0,'Check marks each option');
    ok((await m.locator('.q-live').innerText())==='Not quite. The answer is Apple, Pear.','and the live line gives the answers');
    if(w===1280) await shot(p,'quiz-check-paper-1280.png');
    await pill(m,'Carrot').click();await p.waitForTimeout(100);
    ok(await m.locator('.q-mk').count()===0,'changing a pick clears the marks');
    // the marks are readable, with a sign and a word, in every theme
    await m.locator('.q-acts button').click();await p.waitForTimeout(100);
    for(const th of ['paper','daylight','night','contrast']){
      await theme(p,th);
      const c=await p.evaluate(()=>{const e=[...document.querySelectorAll('.pill-btn.q-wrong')][0];if(!e) return null;const st=getComputedStyle(e);return {fg:st.color,bg:st.backgroundColor};});
      ok(!!c&&c.fg!==c.bg,`${th} at ${w}px: a wrong mark has its own colours`);
      ok(await over(p)<=0,`${th} at ${w}px: no horizontal page overflow`);
      if(th==='night'&&w===1280) await shot(p,'quiz-check-night-1280.png');
      if(th==='paper'&&w===400) await shot(p,'quiz-check-paper-400.png');}
    ok(t.csp.length===0&&t.errs.length===0,`quiz ${w}px: zero CSP violations and page errors `+t.csp.concat(t.errs).join('|'));
    await t.ctx.close();}

  // 3 the notice a file's problems make
  {const t=await open(fx('problems-reported.booklet.md'),1280,false);const p=t.p;
   const note=p.locator('.filenotes');
   ok(await note.count()===1&&(await note.innerText()).includes('This file has 6 things this page could not read'),'a file with things it could not read opens, with a notice that says how many');
   ok(!(await note.locator('details').evaluate(d=>d.open)),'the list is closed until asked for');
   await note.locator('summary').click();await p.waitForTimeout(150);
   ok(/“sticker”/.test(await note.locator('ul').innerText()),'the list names what could not be read');
   await shot(p,'notice-open-paper-1280.png');
   await note.locator('button',{hasText:'Dismiss'}).click();await p.waitForTimeout(200);
   ok(await p.locator('.filenotes').count()===0,'Dismiss removes it');
   ok(t.csp.length===0&&t.errs.length===0,'notice: zero CSP violations and page errors '+t.csp.concat(t.errs).join('|'));
   await t.ctx.close();}
  {const t=await open(fx('problems-reported.booklet.md'),400,false);const p=t.p;
   ok(await over(p)<=0,'the notice at 400px: no horizontal overflow');await shot(p,'notice-paper-400.png');await t.ctx.close();}

  // 4 a refused file does not open and says why
  {const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
   await p.route('https://bookletmd.test/**',async r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
   await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
   await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
   await p.locator('#fileIn').setInputFiles(fx('problems-refused.booklet.md'));await p.waitForTimeout(500);
   await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(500);
   ok(/This file cannot be opened:.*never closed/.test(await p.locator('#loadMsg').innerText()),'a refused file shows its messages in the load dialog');
   ok(await p.locator('[role=dialog][open]').count()===1,'and the dialog stays open, nothing opened');
   await shot(p,'refused-paper-1280.png');
   await p.keyboard.press('Escape');await p.waitForTimeout(150);
   ok(await p.locator('[role=dialog][open]').count()===0,'Escape closes the load dialog');
   ok(errs.length===0,'refused: no page errors '+errs.join('|'));
   await ctx.close();}

  // 5 Escape and a click outside close Add a module
  {const t=await open(fx('questions-open.booklet.md'),1280,false);const p=t.p;
   await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(400);
   ok(await p.locator('#veilAddModule[open]').count()===1,'Add a module opens');
   await p.keyboard.press('Escape');await p.waitForTimeout(200);
   ok(await p.locator('#veilAddModule[open]').count()===0,'Escape closes Add a module');
   await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(400);
   await p.locator('#veilAddModule').click({position:{x:4,y:4}});await p.waitForTimeout(200);
   ok(await p.locator('#veilAddModule[open]').count()===0,'a click on the backdrop closes it too');
   ok(t.csp.length===0&&t.errs.length===0,'add a module: zero CSP violations and page errors '+t.csp.concat(t.errs).join('|'));
   await t.ctx.close();}

  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
