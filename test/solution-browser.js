// Browser check for renderer 0.11.12: a solution sits inside its question (no row of its own; shut it gives nothing away; a choice opens it
// once an option is picked, in the good tone for a right pick and the warn tone with "Look again" for a wrong one; a multi opens it on
// Check; a question with no right answer opens it neutral; a lines question never opens it by itself; a reload shows it open), and a
// folded group draws on the card surface, in Paper and in Night.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/solution-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]);
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const head='---\nbooklet: "0.11"\ntitle: Sorting\nlang: en\n---\n\n';
const sortItem=i=>`> [!choice|s${i}] Item ${i}\n- [ ] Wrong ${i}\n- [x] Right ${i}\n\n> [!solution]- Why\n> BECAUSE-${i}-SECRET\n\n`;
const text=head+'> [!activity|a] Sort it\n\n'+[1,2,3,4,5,6].map(sortItem).join('')+
  '> [!multi|m1] Pick both\n- [x] Alpha\n- [x] Beta\n- [ ] Gamma\n\n> [!solution]- Why\n> MULTI-SECRET\n\n'+
  '> [!choice|n1] No right answer\n- [ ] One\n- [ ] Two\n\n> [!solution]- Notes\n> NEUTRAL-SECRET\n\n'+
  '> [!lines|l1] Write lines\n\n> [!solution]- Model\n> LINES-SECRET\n\n'+
  '> [!hint]- \n> A-HINT\n\n> [!group]- Background\n> Group words that say what is in the group.\n\n> [!note]- A note\n> Note words.\n';
(async()=>{
  const b=await chromium.launch();
  for(const W of [1280,390]){
    const ctx=await b.newContext({viewport:{width:W,height:1000}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
      r.fulfill(u==='/app/'?{status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}}:{status:404,body:'nf'});});
    const wait=ms=>p.waitForTimeout(ms);
    const openAll=async()=>{if(await p.locator('#main details.rm-sec').count()) await p.evaluate(()=>document.querySelectorAll('details.rm-sec').forEach(d=>d.open=true));await wait(100);};
    await p.goto('https://bookletmd.test/app/');await wait(500);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(250);
    await p.locator('#pasteIn').fill(text);await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(900);
    await openAll();
    const sols=()=>p.locator('#main details.sol-in');
    ok(await sols().count()===9,`${W}px: nine solutions sit inside their questions: six sort items, a multi, a choice with no right answer, a lines question (${await sols().count()})`);
    const sep=await p.evaluate(()=>[...document.querySelectorAll('#main details.card-compact')].filter(d=>!d.classList.contains('sol-in')).map(d=>d.querySelector('summary').innerText.trim()));
    ok(sep.join()==='Hint',`${W}px: no separate Why row; only the hint keeps its own row (${sep.join()})`);
    ok(await p.locator('#main .sol-moved').count()===9,`${W}px: the solution blocks leave only a hidden placeholder`);
    ok(!/SECRET/.test(await p.locator('#main').innerText()),`${W}px: shut, no solution gives anything away`);
    const sum=sols().first().locator('summary');
    const h=await sum.evaluate(s=>s.getBoundingClientRect().height);
    ok(h>=44&&/Why/.test(await sum.innerText()),`${W}px: the control is labelled Why and is 44 px tall (${Math.round(h)})`);
    ok(await sols().first().evaluate(d=>!d.open),`${W}px: it starts shut (a real summary in a details, which reports its expanded state itself)`);
    await sum.click();await wait(150);
    ok(await sols().first().evaluate(d=>d.open)&&/BECAUSE-1-SECRET/.test(await p.locator('#main').innerText()),`${W}px: it opens on request`);
    await sum.click();await wait(100);
    /* a wrong pick on item 1 */
    await p.locator('#main button.pill-btn').filter({hasText:/^Wrong 1/}).click();await wait(200);
    const d1=sols().nth(0);
    ok(await d1.evaluate(d=>d.open&&d.classList.contains('sol-warn'))&&/Look again/.test(await d1.innerText()),`${W}px: a wrong pick opens the why in the warn tone with Look again`);
    ok(/BECAUSE-1-SECRET/.test(await d1.innerText()),`${W}px: and shows the why`);
    ok(await p.evaluate(()=>document.activeElement&&document.activeElement.tagName)!=='SUMMARY',`${W}px: the focus is not taken by the opened solution`);
    {const v=await p.evaluate(()=>{const q=document.querySelector('#main .sol-in').parentElement;const l=q.querySelector('.q-live'),r=l.getBoundingClientRect(),w=q.querySelector('.pill-btn.q-wrong'),cs=getComputedStyle(document.documentElement);
        const probe=document.createElement('i');probe.style.color=cs.getPropertyValue('--tone-amber-deep');document.body.append(probe);const amber=getComputedStyle(probe).color;probe.remove();
        return {text:l.textContent,w:r.width,h:r.height,wrong:w&&getComputedStyle(w).color,amber};});
      ok(v.text.length>0&&v.w<=1&&v.h<=1,`${W}px: with a solution the verdict line is kept for screen readers only (${JSON.stringify(v.text)})`);
      ok(v.wrong===v.amber,`${W}px: a wrong pick is in the warn tone, not red (${v.wrong})`);}
    {const sh=await sols().nth(3).evaluate(d=>({w:d.getBoundingClientRect().width,pw:d.parentElement.getBoundingClientRect().width,h:d.getBoundingClientRect().height,bg:getComputedStyle(d).backgroundColor,bw:getComputedStyle(d).borderTopColor}));
      ok(sh.w<sh.pw*0.6&&sh.h>=44&&sh.bg==='rgba(0, 0, 0, 0)',`${W}px: a shut solution is a small control, not a bar (${Math.round(sh.w)} of ${Math.round(sh.pw)} px, ${Math.round(sh.h)} tall)`);}
    /* a right pick on item 2 */
    await p.locator('#main button.pill-btn').filter({hasText:/^Right 2/}).click();await wait(200);
    const d2=sols().nth(1);
    ok(await d2.evaluate(d=>d.open&&d.classList.contains('sol-good'))&&!/Look again/.test(await d2.innerText()),`${W}px: a right pick opens the why in the good tone`);
    ok(await d1.evaluate(d=>getComputedStyle(d).backgroundColor)!==await d2.evaluate(d=>getComputedStyle(d).backgroundColor),`${W}px: the two tones differ`);
    ok(!(await p.locator('#main .sol-in').evaluateAll(ds=>ds.some(d=>/bad/.test(d.className)))),`${W}px: never the bad tone`);
    /* changing the answer moves the tone */
    await p.locator('#main button.pill-btn').filter({hasText:/^Right 1/}).click();await wait(200);
    ok(await sols().nth(0).evaluate(d=>d.open&&d.classList.contains('sol-good')),`${W}px: picking again moves the tone`);
    /* multi */
    await p.locator('#main button.pill-btn').filter({hasText:/^Alpha/}).click();await wait(150);
    ok(await sols().nth(6).evaluate(d=>!d.open),`${W}px: a multi does not open its solution before Check`);
    await p.locator('#main button.small').filter({hasText:/^Check$/}).click();await wait(200);
    ok(await sols().nth(6).evaluate(d=>d.open&&d.classList.contains('sol-warn')),`${W}px: Check opens it, warn for a partly right answer`);
    /* no right answer */
    await p.locator('#main button.pill-btn').filter({hasText:/^One/}).click();await wait(200);
    ok(await sols().nth(7).evaluate(d=>d.open&&d.classList.contains('sol-neutral')&&!/Look again/.test(d.innerText)),`${W}px: with no right answer it opens neutral`);
    /* lines */
    await p.locator('#main input[type=text]').first().fill('some words');await wait(200);
    ok(await sols().nth(8).evaluate(d=>!d.open),`${W}px: a lines question's solution does not open by itself`);
    await sols().nth(8).locator('summary').click();await wait(100);
    ok(await sols().nth(8).evaluate(d=>d.open),`${W}px: but it opens on request`);
    /* print shows a shut solution's words */
    await p.emulateMedia({media:'print'});await wait(150);
    const pv=await sols().nth(5).evaluate(d=>{const x=d.querySelector('.cd-body');return !!x&&getComputedStyle(x).display!=='none'&&x.getBoundingClientRect().height>0;});
    ok(pv,`${W}px: print shows a shut solution's words`);
    await p.emulateMedia({media:'screen'});
    /* the folded group draws on the card surface */
    for(const th of ['paper','night']){
      await p.evaluate(t=>window.bookletTheme.set(t),th);await wait(250);
      const g=await p.evaluate(()=>{const find=t=>[...document.querySelectorAll('#main details.card-fold')].find(d=>d.querySelector('summary').innerText.includes(t));
        const grp=find('Background'),note=find('A note'),cs=getComputedStyle(document.documentElement);
        const probe=document.createElement('i');probe.style.background=cs.getPropertyValue('--surface');probe.style.border='1px solid '+cs.getPropertyValue('--rule');document.body.append(probe);
        const pc=getComputedStyle(probe),surf=pc.backgroundColor,line=pc.borderTopColor;probe.remove();
        return {grp:getComputedStyle(grp).backgroundColor,gb:getComputedStyle(grp).borderTopColor,note:getComputedStyle(note).backgroundColor,surf,line};});
      ok(g.grp===g.surf&&g.gb===g.line,`${W}px ${th}: a folded group draws on the card surface with the neutral line (${g.grp} vs ${g.surf}; ${g.gb} vs ${g.line})`);
      ok(g.note!==g.surf,`${W}px ${th}: a folded note keeps its colour (${g.note})`);}
    await p.evaluate(()=>window.bookletTheme.set('paper'));
    /* reload: the saved answers show their solutions open in the right tone */
    await wait(500);
    await p.reload();await wait(900);
    if(await p.evaluate(()=>document.body.dataset.view)==='@booklets'){await p.locator('#main button').filter({hasText:/Sorting/}).first().click();await wait(600);}
    if(await p.locator('#main .mode').count()){await p.locator('#main .mode').first().click();await wait(500);}
    await openAll();
    const after=await p.evaluate(()=>[...document.querySelectorAll('#main details.sol-in')].slice(0,2).map(d=>d.open+':'+(d.className.match(/sol-(good|warn|neutral)/)||[''])[0]));
    ok(after.join()==='true:sol-good,true:sol-good',`${W}px: after a reload the saved answers show their solutions open in the right tone (${after.join(' ')})`);
    ok(errs.length===0,`${W}px: no page errors ${errs.join('|')}`);
    await ctx.close();}
  await b.close();
  if(fails.length){console.log('FAILED '+fails.length);process.exit(1);}
  console.log('solution checks passed');
})();
