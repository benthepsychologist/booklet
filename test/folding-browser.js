// Browser check for folding and reading aids (renderer 0.11.10, C2; 0.15), in a real page at 1280 and 390 px: the renderer folds
// nothing on its own, so a page of sections with questions, a repeating activity and a page with a data view are drawn open, their
// headings as headings; short options are pills beside their question (under it on a phone); matrix answers are pills; a hint or
// solution is a compact fold that gives nothing away; "One at a time" shows one question, with the foot's one Back and Next row and
// dots, is kept in booklet.ui.steps.* across a reload, and print shows every question; targets are 44 px; the focus ring shows on
// Night; reduced motion stops the dots' fade. An axe pass runs on the ERP-style booklet when AXE (the path to axe.min.js) is given.
// The fold switch, tabs and the pager are test/tabs-browser.js.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/folding-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const {kept}=require('./kept.js');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const head='---\nbooklet: "0.13"\ntitle: Folding\nlang: en\n---\n\n';
const opts=['Left','Right','Up'].map(o=>`- [ ] ${o}`).join('\n');
const longOpts=['An option that is rather long indeed','Another long option here today','A third long option text'].map(o=>`- [ ] ${o}`).join('\n');
const qpage=head+`> [!module|m] M\n\n> [!activity|q] Questions\n\n## First part\n\nWords about the first part.\n\n> [!choice|c1] Which way?\n${opts}\n\n> [!hint]-\n> HINT-SECRET-WORDS\n\n## Second part\n\nWords about the second.\n\n> [!choice|c2] Which other way?\n${opts}\n\n> [!solution]-\n> SOLUTION-SECRET-WORDS\n\n> [!choice|c3] A long one?\n${longOpts}\n\n## Third part\n\nOnly reading here.\n\n> [!matrix|mx] Rate each\n- Sleep\n- Food\n\n1. Low\n2. High\n\n> [!module|m end] End\n`;
const dpage=head+`> [!module|m] M\n\n> [!activity|log repeat] Log\n\n## Notes\n\nA note section.\n\n> [!text|what] What?\n\n## More\n\nMore words.\n\n> [!activity|look] Look\n\n## Shown\n\nShown words.\n\n\`\`\`booklet data\n[{"a":1,"b":"x"}]\n\`\`\`\n^rows\n\n\`\`\`booklet query\nfrom: rows\nas: table\n\`\`\`\n\n## Again\n\nAgain words.\n\n> [!module|m end] End\n`;
const chart=head+`> [!module|m] M\n\n> [!activity|c] Chart\n\n## One\n\nWords about the first.\n\n## Trend\n\nHours of sun.\n\n\`\`\`booklet query\nfrom: sun\nas: line\nlabel: day\nfields: hours\n\`\`\`\n\n\`\`\`booklet data\n{ "fields": { "day": "Day", "hours": "Hours" }, "rows": [ { "day": "Mon", "hours": 6 }, { "day": "Tue", "hours": 7 }, { "day": "Wed", "hours": 4 }, { "day": "Thu", "hours": 2 }, { "day": "Fri", "hours": 5 } ] }\n\`\`\`\n^sun\n\n## Last\n\nEnd.\n\n> [!module|m end] End\n`;
const six=head+`> [!module|m] M\n\n> [!activity|s] Steps\n\nLead words.\n\n`+[1,2,3,4].map(i=>`> [!choice|s${i}] Question number ${i}?\n${opts}\n\n`).join('')+'Closing words.\n\n> [!module|m end] End\n';
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  for(const W of [1280,390]){
    const ctx=await b.newContext({viewport:{width:W,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
      r.fulfill(u==='/app/'?{status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}}:{status:404,body:'nf'});});
    const wait=ms=>p.waitForTimeout(ms);
    const toList=async()=>{for(let i=0;i<3;i++){if(await p.getByRole('button',{name:'Add a booklet from a file'}).count()) return;await p.locator('#btnHome').click();await wait(300);}};
    const load=async text=>{await toList();await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(250);
      await p.locator('#pasteIn').fill(text);await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(800);};
    const openAct=async name=>{if(await p.locator('#main button.mode').count()) await p.locator('#main button.mode').filter({hasText:name}).first().click();await wait(500);};
    await p.goto('https://bookletmd.test/app/');await wait(500);

    /* 1. a page of sections with questions is drawn open: its headings are headings, and only the hint and the solution fold */
    await load(qpage);
    await openAct('Questions');
    const heads=await p.locator('#main .ap-body h3').evaluateAll(l=>l.map(h=>h.textContent.trim()).filter(t=>/part$/.test(t)));
    ok(heads.join()==='First part,Second part,Third part',`${W}px: the three section headings are drawn as headings (${heads})`);
    ok(await p.locator('#main details:not(.card-compact)').count()===0&&await p.locator('#main .fold-sw').count()===0,`${W}px: nothing is folded but the hint and the solution, and there is no fold switch`);
    await p.locator('#main .pills').nth(0).locator('.pill-btn').first().click();await wait(150);
    await p.locator('#main .pills').nth(1).locator('.pill-btn').first().click();await wait(150);

    /* 2. the compact hint and solution */
    const hint=p.locator('#main details.card-compact').first();
    const hs=await hint.evaluate(d=>{const s=d.querySelector('summary'),r=s.getBoundingClientRect();return {open:d.open,h:Math.round(r.height),text:s.innerText.trim(),teaser:!!d.querySelector('.d'),tile:Math.round(d.querySelector('.cd-tile').getBoundingClientRect().height),vis:d.innerText.includes('SECRET')};});
    ok(!hs.open&&hs.text==='Hint'&&!hs.teaser&&!hs.vis,`${W}px: a closed hint is one line saying Hint, with no teaser and no answer (${JSON.stringify(hs)})`);
    ok(hs.h>=44&&hs.h<=60&&hs.tile<=32,`${W}px: it is compact: summary ${hs.h}px, icon ${hs.tile}px`);
    /* 0.11.12: the solution sits in its question, and opens (neutral, no right answer) once that question has been answered above */
    ok(await p.locator('#main details.card-compact').count()===2&&(await p.locator('#main details.sol-in.sol-neutral[open]').count())===1&&(await p.locator('#main').innerText()).includes('SOLUTION-SECRET'),`${W}px: both folds are compact, and the solution of the answered question has opened in the neutral tone`);
    await hint.locator('summary').click();await wait(100);
    ok((await hint.innerText()).includes('HINT-SECRET-WORDS'),`${W}px: opening a hint shows it`);

    /* 3. short options are pills beside the question wide, under it narrow; long ones are not inline */
    const g=await p.evaluate(()=>{const boxes=[...document.querySelectorAll('#main .q-inline')];
      return boxes.map(bx=>{const h=bx.querySelector('h3,label.lbl').getBoundingClientRect(),pl=bx.querySelector('.pills').getBoundingClientRect();
        return {hb:h.bottom,ht:h.top,hr:h.right,pt:pl.top,pl:pl.left,pb:pl.bottom};});});
    ok(g.length===2,`${W}px: the two short-option questions are inline, the long one is not (${g.length})`);
    if(W>=1000) ok(g.every(x=>x.pl>=x.hr-1&&x.pt<x.hb),`${W}px: the pills sit beside their question`);
    else ok(g.every(x=>x.pt>=x.hb-1),`${W}px: the pills sit under their question`);
    const tall=await p.evaluate(()=>[...document.querySelectorAll('#main .pills .pill-btn')].map(x=>Math.round(x.getBoundingClientRect().height)));
    ok(tall.length>0&&tall.every(h=>h>=44),`${W}px: every pill is at least 44 px tall (${Math.min(...tall)})`);
    ok(await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=0,`${W}px: no sideways scroll`);

    /* 4. matrix answers are pills: in every row when each item's readable words and the anchors fit side by side, else under each item as
       its own single-choice question (the same list of answers either way) */
    await wait(250);   // a matrix measures its room once it is shown (nothing folds it: it is shown)
    const asRows=W>=1000;
    const sel=asRows?'#main .mxrow .mxopt span':'#main .mxq .pill-btn';
    const mx=await p.evaluate(s=>[...document.querySelectorAll(s)].map(s=>{const q=s.getBoundingClientRect(),c=getComputedStyle(s);return {h:Math.round(q.height),w:Math.round(q.width),r:c.borderTopLeftRadius};}),sel);
    ok(mx.length===4&&mx.every(s=>s.h>=44&&parseFloat(s.r)>=20),`${W}px: the matrix draws its answers as pills, ${asRows?'in rows':'one question per item'} (${JSON.stringify(mx[0])})`);
    if(asRows) await p.locator('#main .mxrow').first().locator('.mxopt').nth(1).click();
    else await p.locator('#main .mxq').first().locator('.pill-btn').nth(1).click();
    await wait(100);
    ok(await p.evaluate(()=>JSON.stringify(STATE.answers.m.mx))==='[2,null]',`${W}px: a matrix pill answers its item, the same way in both drawings`);

    /* 5. a repeating activity and a data-view page are drawn open */
    await load(dpage);
    await openAct('Log');
    ok(await p.locator('#main details').count()===0&&/A note section/.test(await p.locator('#main .ap-body').innerText()),`${W}px: an activity that repeats is drawn open`);
    await p.locator('.cd-back').first().click();await wait(300);await openAct('Look');
    ok(await p.locator('#main details').count()===0&&await p.locator('#main .dv-panel, #main table').count()>0,`${W}px: a page with a data view is drawn open, the view in place`);

    /* 6. one at a time */
    await load(six);
    await openAct('Steps');
    ok(await p.locator('.oat-ctl').count()===1,`${W}px: the control is on a page of four questions`);
    await p.getByRole('button',{name:'One at a time'}).click();await wait(300);
    const vis=()=>p.locator('#main .oat-unit').evaluateAll(l=>l.map(u=>u.offsetHeight>0));
    ok((await vis()).join()==='true,false,false,false'&&/Question 1 of 4/.test(await p.locator('.oat-prog').innerText()),`${W}px: one question shows, "Question 1 of 4"`);
    ok(await p.locator('.oat-dot').count()===4&&await p.locator('.oat-dots').getAttribute('aria-hidden')==='true',`${W}px: four dots, hidden from a screen reader (the progress line says it)`);
    ok(await p.getByRole('button',{name:'Back',exact:true}).count()===0&&await p.locator('#main .cd-foot').count()===1&&await p.locator('#main .cd-foot .cd-back').count()===1,`${W}px: on the first question the foot's one row has no step back, only the way back to the overview`);
    const btn=await p.evaluate(()=>[...document.querySelectorAll('#main .cd-foot button,.oat-ctl button')].map(x=>Math.round(x.getBoundingClientRect().height)));
    ok(btn.every(h=>h>=44),`${W}px: the stepper's buttons are 44 px (${btn})`);
    await p.locator('#main .oat-unit').first().locator('.pill-btn').first().click();await wait(100);
    ok(await p.locator('.oat-dot.on').count()===1,`${W}px: answering fills the dot`);
    await p.getByRole('button',{name:'Next question'}).click();await wait(200);
    ok((await vis()).join()==='false,true,false,false'&&/Question 2 of 4/.test(await p.locator('.oat-prog').innerText()),`${W}px: Next shows the second`);
    await p.getByRole('button',{name:'Next question'}).click();await p.getByRole('button',{name:'Next question'}).click();await wait(200);
    ok(await p.getByRole('button',{name:'Next question'}).count()===0&&/Closing words/.test(await p.locator('#main .oat-unit').nth(3).innerText()),`${W}px: there is no Next question on the last, which carries the closing words`);
    await p.getByRole('button',{name:'Back',exact:true}).click();await p.getByRole('button',{name:'Back',exact:true}).click();await wait(100);
    ok(/Question 2 of 4/.test(await p.locator('.oat-prog').innerText())&&await p.locator('#main .oat-unit').first().locator('.pill-btn[aria-pressed="true"]').count()===1,`${W}px: Back returns, and the first answer is still there`);
    const K=await kept(p),key=Object.keys(K).filter(k=>/^booklet\.ui\.steps\./.test(k)).map(k=>k+'='+K[k]);
    ok(key.length===1&&/=one$/.test(key[0]),`${W}px: the choice is kept in booklet.ui.steps.* (${key})`);
    /* print shows every question */
    await p.emulateMedia({media:'print'});await wait(100);
    ok((await vis()).every(Boolean)&&await p.locator('#main .cd-foot').isHidden()&&await p.locator('.oat-ctl').isHidden(),`${W}px: print shows every question and none of the controls`);
    await p.emulateMedia({media:'screen'});
    /* reload keeps it */
    await p.reload();await wait(700);
    await toList();
    await p.getByRole('button',{name:'Open'}).first().click();await wait(700);
    if(await p.locator('#main button.mode').count()) await openAct('Steps');
    ok(await p.locator('.oat-unit').count()===4&&(await vis()).filter(Boolean).length===1,`${W}px: after a reload the page is still one at a time`);
    await p.getByRole('button',{name:'All at once'}).click();await wait(300);
    ok(await p.locator('.oat-unit').count()===0&&await p.locator('#main .pill-btn').count()>=12,`${W}px: All at once draws every question again`);

    /* 6b. Back and Next move the keyboard to the step now shown */
    await p.getByRole('button',{name:'One at a time'}).click();await wait(300);
    await p.getByRole('button',{name:'Next question'}).click();await wait(150);
    const fo=await p.evaluate(()=>{const e=document.activeElement,u=[...document.querySelectorAll('.oat-unit')];return {idx:u.indexOf(e),shown:u.findIndex(x=>x.offsetHeight>0)};});
    ok(fo.idx>=0&&fo.idx===fo.shown,`${W}px: Next puts the focus on the step now shown (${JSON.stringify(fo)})`);
    await p.getByRole('button',{name:'Back',exact:true}).click();await wait(150);
    ok(await p.evaluate(()=>{const e=document.activeElement,u=[...document.querySelectorAll('.oat-unit')];return u.indexOf(e)>=0&&u.indexOf(e)===u.findIndex(x=>x.offsetHeight>0);}),`${W}px: Back puts the focus on the step now shown`);
    await p.getByRole('button',{name:'All at once'}).click();await wait(300);

    /* 7. Night: the focus ring; reduced motion */
    await p.evaluate(()=>window.bookletTheme.set('night'));await wait(200);
    await p.getByRole('button',{name:'One at a time'}).focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');await wait(100);
    const ring=await p.evaluate(()=>{const e=document.activeElement,c=getComputedStyle(e);return {w:parseFloat(c.outlineWidth),s:c.outlineStyle,col:c.outlineColor,bg:getComputedStyle(document.body).backgroundColor};});
    ok(ring.w>=3&&ring.s!=='none'&&ring.col!==ring.bg,`${W}px Night: the focus ring shows on the stepper control (${JSON.stringify(ring)})`);
    await p.emulateMedia({reducedMotion:'reduce'});
    await p.getByRole('button',{name:'One at a time'}).click();await wait(300);
    ok(await p.locator('.oat-dot').first().evaluate(d=>parseFloat(getComputedStyle(d).transitionDuration)===0),`${W}px: reduced motion stops the dots' fade`);
    await p.evaluate(()=>window.bookletTheme.set('paper'));

    /* 6c. a page of sections holding a line chart: drawn open, the chart at the column's width */
    await load(chart);
    await openAct('Chart');
    {await wait(300);
     const w=await p.evaluate(()=>{const h=document.querySelector('#main .ch-linechart .ch-svg'),body=document.querySelector('#main .ap-body'),
       inner=body.getBoundingClientRect().width,pl=document.querySelector('#main .dv-panel'),pw=pl?pl.getBoundingClientRect().width:inner;
       return {svg:Math.round(h.getBoundingClientRect().width),vb:Math.round(parseFloat(h.getAttribute('viewBox').split(' ')[2])),plot:Math.round(document.querySelector('#main .ch-plot').getBoundingClientRect().width),panel:Math.round(pw),inner:Math.round(inner)};});
     ok(await p.locator('#main details:not(.ch-nums)').count()===0,`${W}px: the chart's page is drawn open (only the chart's own numbers fold)`);
     ok(w.svg>0&&Math.abs(w.svg-w.plot)<=2&&(Math.abs(w.vb-w.svg)<=2||(w.vb===240&&w.svg<240))&&w.svg>=w.panel-48&&w.svg<=w.inner,`${W}px: the line chart is drawn at the column's width, not 0 or a stale 640 (${JSON.stringify(w)})`);}

    /* 8. axe, when a copy is given */
    if(process.env.AXE&&fs.existsSync(process.env.AXE)&&W===1280){
      const c2=await b.newContext({viewport:{width:W,height:900},bypassCSP:true});const q=await c2.newPage();
      await q.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}}));
      await q.goto('https://bookletmd.test/app/');await q.waitForTimeout(500);
      await q.getByRole('button',{name:'Add a booklet from a file'}).click();await q.waitForTimeout(250);
      await q.locator('#pasteIn').fill(qpage);await q.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await q.waitForTimeout(800);
      if(await q.locator('#main button.mode').count()) await q.locator('#main button.mode').first().click();await q.waitForTimeout(500);
      await q.locator('#main details').evaluateAll(l=>l.forEach(d=>d.open=true));
      await q.addScriptTag({content:fs.readFileSync(process.env.AXE,'utf8')});
      const res=await q.evaluate(()=>axe.run(document.querySelector('#main'),{runOnly:['wcag2a','wcag2aa']}));
      const bad=res.violations.filter(v=>v.impact==='critical'||v.impact==='serious');
      ok(bad.length===0,`axe ${res.testEngine.version} on the question page: ${bad.map(v=>v.id+' x'+v.nodes.length).join(', ')||'no serious or critical violation'}`);
      await c2.close();}
    ok(errs.length===0,`${W}px: no page errors ${errs.join('|')}`);
    await ctx.close();}
  await b.close();
  if(fails.length){console.log('\n'+fails.length+' FAILED');process.exit(1);}
  console.log('all folding checks passed');})();
