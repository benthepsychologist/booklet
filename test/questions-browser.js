// Browser check of how a question is laid out and what it answers with (SPEC.md sections 5 and 7), at 1280 and 400 px.
//  - a question's words keep a readable width; short options sit beside them only when both fit, else they drop under them;
//  - a matrix is a grid of rows when each item's readable words and the anchors fit, and one single-choice question per item when they do not,
//    with the same answers under the same key, kept across a window that is narrowed and widened again;
//  - nothing scrolls sideways at 390 px, a grid-select with all four axis labels included (on a page beside the page menu's rail too);
//  - an option's reply shows on a pick, changes on a re-pick, and for a multi is in option order;
//  - an svg-regions widget honours `readonly` and `describe`, as a grid-select does.
// Invented content. Usage: PLAYWRIGHT=/path/to/node_modules/playwright-core node test/questions-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const LONG='Moving or speaking so slowly that other people could have noticed, or the opposite: being so fidgety or restless that you have been moving around a lot more than usual';
const FIG='<svg viewBox="0 0 100 100"><circle cx="50" cy="20" r="14"/><circle class="rg" data-r="head" cx="50" cy="20" r="14"/><rect class="rg" data-r="chest" x="30" y="40" width="40" height="30"/></svg>';
const WIDGET=(extra)=>JSON.stringify({engine:'svg-regions',figures:[{id:'front',label:'Front',svg:FIG,regions:['head','chest']}],
  regions:[{id:'head',label:'Head',note:'Where thoughts sit.'},{id:'chest',label:'Chest',note:'Where breath sits.'}],
  senses:[{id:'feel',label:'Feels',words:[{id:'warm',label:'Warm'},{id:'tight',label:'Tight'}]}],chips:['head','chest'],copy:{h:'',p:'',none:'Pick a place.',pick:'Pick words.',clear:'Clear'},...extra});
const GRID=JSON.stringify({engine:'grid-select',axes:{top:'more activated',bottom:'less activated',left:'more unpleasant',right:'more pleasant'},
  cells:[{id:'a',label:'Agitating',color:'warm'},{id:'b',label:'Invigorating',color:'green'},{id:'c',label:'Draining',color:'slate'},{id:'d',label:'Soothing',color:'teal'}],
  items:[{id:'i1',cell:'a',label:'Overwhelmedandexhaustedbyeverything'},{id:'i2',cell:'b',label:'Curiosity / joy'},{id:'i3',cell:'c',label:'Grief / shame'},{id:'i4',cell:'d',label:'Warmth / comfort / connection'}]});
const FILE=`---
booklet: "0.13"
title: Questions
lang: en
---

# Questions

> [!module|qs] Questions

> [!activity|lay] Layout

## Questions

> [!choice|long-text] ${LONG}
- [ ] not at all
- [ ] several days
- [ ] more than half the days
- [ ] nearly every day

> [!choice|short] Do you want a reminder?
- [ ] Yes
- [ ] No
- [ ] Maybe

> [!matrix|wide] How often, for each?

- Sleeping badly
- Feeling tired, or having little energy for the things you want to do in the day

0. Not at all
1. Several days
2. More than half the days
3. Nearly every day

> [!matrix|narrow] How sure, for each?

- Spring tides
- Neap tides, which come when the sun and the moon pull at right angles to one another

1. Low
2. High

> [!choice|where] Where are you right now?
- [ ] Calm
  - That is the settling system at work.
- [ ] Wound up
  - That is the activating, unpleasant family.
- [ ] Neither
  - A **neither** is fine too.

> [!multi|many] Which of these?
- [ ] Alpha
  - About alpha.
- [ ] Bravo
- [ ] Charlie
  - About charlie.

***

## Widgets

> [!widget|grid] Feelings
> ![[#^grid-data]]

\`\`\`booklet widget
${GRID}
\`\`\`
^grid-data

> [!widget|ro-map readonly describe] A read-only map
> ![[#^ro-data]]

\`\`\`booklet widget
${WIDGET({})}
\`\`\`
^ro-data

> [!widget|op-map] An operable map
> ![[#^op-data]]

\`\`\`booklet widget
${WIDGET({})}
\`\`\`
^op-data

> [!module|qs end] End
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'questions.booklet.md');fs.writeFileSync(file,FILE);
  const b=await chromium.launch();
  const open=async(W)=>{
    const p=await (await b.newContext({viewport:{width:W,height:900}})).newPage();
    p.__bad=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))p.__bad.push(m.text());});p.on('pageerror',e=>p.__bad.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(!(await p.locator('.ap-frame').count())){if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(500);}
      await p.locator('button.mode').first().click();await p.waitForTimeout(700);}
    return p;};
  const size=async(p,W)=>{await p.setViewportSize({width:W,height:900});await p.waitForTimeout(500);};
  const page2=async p=>{await p.evaluate(()=>document.querySelectorAll('.ap-item')[1].click());await p.waitForTimeout(500);};
  const sideways=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const box=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e) return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,r:r.right};},sel);
  const geo=(p,words)=>p.evaluate(w=>{const h=[...document.querySelectorAll('#main h3')].find(x=>x.textContent.includes(w));
    const root=h.closest('.q-inline')||h.parentElement,pills=root.querySelector(':scope > .pills'),t=h.closest('.q-text')||h;
    const tr=t.getBoundingClientRect(),pr=pills.getBoundingClientRect();
    return {textW:tr.width,textH:tr.height,textBottom:tr.bottom,pillsTop:pr.top,pillsLeft:pr.left,textRight:tr.right,beside:pr.top<tr.bottom-1&&pr.left>=tr.right-1,
      line:parseFloat(getComputedStyle(h).lineHeight)||20,rootW:root.getBoundingClientRect().width};},words);
  const answers=p=>p.evaluate(()=>JSON.stringify(STATE.answers));

  /* ---- 1280: the text keeps a readable width; options beside only when both fit ---- */
  let p=await open(1280);
  let g=await geo(p,'Moving or speaking');
  ok(g.textW>=320,`1280: a long question's text is at least a readable width wide (${Math.round(g.textW)}px)`);
  ok(!g.beside&&g.pillsTop>=g.textBottom-1,`1280: four long-ish options do not fit beside the text at a readable width, so they drop under it (pills at ${Math.round(g.pillsTop)}, text ends ${Math.round(g.textBottom)})`);
  ok(g.textH<=g.line*7,`1280: the long question is not a tall narrow column (${Math.round(g.textH/g.line*10)/10} lines)`);
  g=await geo(p,'Do you want a reminder');
  ok(g.beside,`1280: three short options sit beside a short question when both fit (${JSON.stringify({top:Math.round(g.pillsTop),bottom:Math.round(g.textBottom)})})`);
  let n=await p.evaluate(()=>({rows:document.querySelectorAll('#main .mxrow').length,qs:document.querySelectorAll('#main .mxq').length}));
  ok(n.qs===2&&n.rows===2,`1280: of two matrices, the one whose four anchors cannot sit beside a readable item is drawn as questions, the other as rows ${JSON.stringify(n)}`);
  await p.screenshot({path:path.join(OUT,'questions-1280.png'),fullPage:true});

  /* ---- a matrix answered wide keeps its answers when it is drawn narrow, and back ---- */
  /* the narrow matrix: rows at 1280. Answer item 1 High, item 2 Low through the radios. */
  await p.locator('#main .mxrow').nth(0).locator('.mxopt').nth(1).click();   // narrow matrix, item 1: High (2)
  await p.locator('#main .mxrow').nth(1).locator('.mxopt').nth(0).click();   // item 2: Low (1)
  const wide=await answers(p);
  ok(/"narrow":\[2,1\]/.test(wide),`1280: the rows store one anchor number per item, by position ${wide}`);
  await size(p,400);
  n=await p.evaluate(()=>({rows:document.querySelectorAll('#main .mxrow').length,qs:document.querySelectorAll('#main .mxq').length}));
  ok(n.rows===0&&n.qs===4,`400: both matrices are one single-choice question per item (${n.qs} questions, ${n.rows} rows)`);
  const pressed=await p.evaluate(()=>[...document.querySelectorAll('#main .mxq')].slice(2).map(q=>[...q.querySelectorAll('button')].map(b=>b.getAttribute('aria-pressed')==='true'?b.textContent:'').join('')));
  ok(pressed.join('|')==='High|Low',`400: the same answers are pressed under the questions (${pressed.join('|')})`);
  ok(await answers(p)===wide,'400: redrawing as questions changes no stored answer');
  /* answer the wide matrix's first item as a question, then widen */
  await p.locator('#main .mxq').nth(0).locator('button').nth(2).click();      // wide matrix, item 1: More than half the days (2)
  const mid=await answers(p);
  ok(/"wide":\[2,null\]/.test(mid)&&/"narrow":\[2,1\]/.test(mid),`400: a question's press stores the matrix's list under its own key ${mid}`);
  await p.locator('#main .mxq').nth(0).locator('button').nth(2).click();      // press again: back to not answered
  ok(/"wide":\[null,null\]/.test(await answers(p)),'400: pressing the answer again clears that item (null, as an item not yet answered)');
  await p.locator('#main .mxq').nth(0).locator('button').nth(2).click();
  await size(p,1280);
  n=await p.evaluate(()=>({rows:document.querySelectorAll('#main .mxrow').length,qs:document.querySelectorAll('#main .mxq').length}));
  ok(n.rows===2&&n.qs===2,`1280 again: the narrow matrix is rows again (${JSON.stringify(n)})`);
  ok(await answers(p)===mid,'1280 again: widening changes no stored answer');
  const checked=await p.evaluate(()=>[...document.querySelectorAll('#main .mxrow')].map(r=>[...r.querySelectorAll('input')].filter(i=>i.checked).map(i=>i.value).join()));
  ok(checked.join('|')==='2|1',`1280 again: the rows show the answers given while narrow and wide (${checked.join('|')})`);
  ok(p.__bad.length===0,'1280: no policy violation or page error '+p.__bad.join(' | '));

  /* ---- 400: options under the text, a question drawn as questions, nothing sideways ---- */
  await size(p,400);
  g=await geo(p,'Do you want a reminder');
  ok(!g.beside&&g.pillsTop>=g.textBottom-1,'400: three short options drop under the question when they do not fit beside it');
  g=await geo(p,'Moving or speaking');
  ok(g.textW>=Math.min(320,g.rootW-1),`400: the text is as wide as the column, or a readable width (${Math.round(g.textW)}px of ${Math.round(g.rootW)})`);
  ok(await sideways(p)<=0,'400: page 1 does not scroll sideways');
  await p.screenshot({path:path.join(OUT,'questions-400.png'),fullPage:true});

  /* ---- 390 on both pages: no sideways scroll, with a grid-select that has four axis labels ---- */
  await size(p,390);
  ok(await sideways(p)<=0,'390: page 1 does not scroll sideways');
  await page2(p);
  const gridOver=await p.evaluate(()=>{const w=innerWidth;return [...document.querySelectorAll('#main .quadwrap, #main .quadwrap *')].filter(e=>e.getBoundingClientRect().right>w+0.5).map(e=>e.className).slice(0,5);});
  ok(gridOver.length===0,'390: nothing in the grid-select with four axis labels passes the right edge '+JSON.stringify(gridOver));
  ok(await sideways(p)<=0,`390: page 2 (grid-select with all four labels, two maps) does not scroll sideways (${await sideways(p)}px)`);
  const axes=await p.evaluate(()=>[...document.querySelectorAll('#main .ax')].map(a=>a.textContent).join('|'));
  ok(axes==='more activated|more unpleasant|more pleasant|less activated','390: all four axis labels are drawn '+axes);
  await p.screenshot({path:path.join(OUT,'questions-widgets-390.png'),fullPage:true});
  await size(p,1280);
  ok(await sideways(p)<=0,'1280: page 2 does not scroll sideways');
  await p.screenshot({path:path.join(OUT,'questions-widgets-1280.png'),fullPage:true});

  /* ---- svg-regions: readonly and describe ---- */
  const maps=await p.evaluate(()=>[...document.querySelectorAll('#main .svgfig')].map(f=>({ro:f.classList.contains('ro'),
    rg:[...f.querySelectorAll('.rg')].map(r=>({tab:r.getAttribute('tabindex'),role:r.getAttribute('role'),label:r.getAttribute('aria-label')}))})));
  ok(maps.length===2&&maps[0].ro&&!maps[1].ro,'two maps: the first is read-only, the second is not '+JSON.stringify(maps.map(m=>m.ro)));
  ok(maps[0].rg.length===2&&maps[0].rg.every(r=>r.tab===null&&r.role==='img'&&r.label),'read-only: a region is named but cannot be focused or pressed '+JSON.stringify(maps[0].rg));
  ok(maps[1].rg.every(r=>r.tab==='0'&&r.role==='button'),'the operable map: its regions are still buttons');
  await p.locator('#main .svgfig').nth(0).locator('.rg').first().click({force:true});await p.waitForTimeout(200);
  const ro=await p.evaluate(()=>{const f=document.querySelectorAll('#main .svgfig')[0],w=f.closest('.bodywrap');
    return {on:f.querySelectorAll('.rg.on').length,panels:document.querySelectorAll('#main .sensepanel').length,roPanel:!!w.querySelector('.sensepanel'),chipBtns:w.querySelectorAll('.bodychips button').length,words:[...w.querySelectorAll('.bodychips .emw')].map(x=>x.textContent).join()};});
  ok(ro.on===0&&!ro.roPanel&&ro.chipBtns===0,`read-only: pressing a region marks nothing and opens nothing; no words panel, no region buttons ${JSON.stringify(ro)}`);
  const roText=await p.evaluate(()=>document.querySelectorAll('#main .svgfig')[0].closest('.bodywrap').parentElement.textContent);
  ok(!/null|undefined/.test(roText),'read-only: no stray word is drawn ('+roText+')');
  ok(ro.words==='Head,Chest','read-only: the regions are named beneath the figure, as plain words '+ro.words);
  const desc=await p.evaluate(()=>[...document.querySelectorAll('#main .qdesc')].map(d=>[...d.querySelectorAll('.qd')].map(x=>x.textContent).join('|')));
  ok(desc.length===1&&desc[0]==='HeadWhere thoughts sit.|ChestWhere breath sits.','`describe`: each region says what it is, under the read-only map, and the other map shows none '+JSON.stringify(desc));
  await p.locator('#main .svgfig').nth(1).locator('.rg').first().click({force:true});await p.waitForTimeout(200);
  const op=await p.evaluate(()=>{const f=document.querySelectorAll('#main .svgfig')[1],w=f.closest('.bodywrap');return {on:f.querySelectorAll('.rg.on').length,panel:!!w.querySelector('.sensepanel h4')};});
  ok(op.on===1&&op.panel,'the operable map still works: a press marks the region and opens its words '+JSON.stringify(op));
  ok(p.__bad.length===0,'page 2: no policy violation or page error '+p.__bad.join(' | '));

  /* ---- replies ---- */
  p=await open(1280);
  const replies=()=>p.evaluate(()=>[...document.querySelectorAll('#main .q-reply')].map(x=>x.textContent));
  const pillTexts=text=>p.evaluate(t=>{const h=[...document.querySelectorAll('#main h3')].find(x=>x.textContent.includes(t));const r=h.closest('.q-inline')||h.parentElement;return [...r.querySelectorAll(':scope > .pills > button')].map(b=>b.textContent);},text);
  const press=async(group,name)=>{const hit=await p.evaluate(([t,n])=>{const h=[...document.querySelectorAll('#main h3')].find(x=>x.textContent.includes(t));
      const r=h.closest('.q-inline')||h.parentElement,bt=[...r.querySelectorAll(':scope > .pills > button')].find(x=>x.textContent===n);if(bt) bt.click();return !!bt;},[group,name]);
    if(!hit) throw new Error('no option '+name+' under '+group);await p.waitForTimeout(100);};
  ok((await pillTexts('Where are you')).join()==='Calm,Wound up,Neither','a choice with replies still has exactly its options as buttons: no reply is an option '+(await pillTexts('Where are you')).join());
  ok((await replies()).length===0,'nothing is shown before a pick');
  await press('Where are you','Wound up');
  ok((await replies()).join('|')==='That is the activating, unpleasant family.','a pick shows that option\'s reply under the options '+(await replies()).join('|'));
  const under=await p.evaluate(()=>{const r=document.querySelector('#main .q-reply').getBoundingClientRect(),h=[...document.querySelectorAll('#main h3')].find(x=>x.textContent.includes('Where are you')).closest('.q-inline').querySelector('.pills').getBoundingClientRect();return r.top>=h.bottom-1;});
  ok(under,'the reply is under the options');
  await press('Where are you','Calm');
  ok((await replies()).join('|')==='That is the settling system at work.','picking another option changes the reply '+(await replies()).join('|'));
  await press('Where are you','Neither');
  const marked=await p.evaluate(()=>document.querySelector('#main .q-reply strong')&&document.querySelector('#main .q-reply strong').textContent);
  ok(marked==='neither','a reply is inline Markdown (its bold is drawn) '+marked);
  await press('Where are you','Neither');
  ok((await replies()).length===0,'pressing the pick again clears it, and its reply goes');
  await press('Which of these','Charlie');await press('Which of these','Alpha');await press('Which of these','Bravo');
  ok((await replies()).join('|')==='About alpha.|About charlie.','a multi shows each picked option\'s reply, in option order (Charlie was picked first), and none for an option without one '+(await replies()).join('|'));
  await press('Which of these','Alpha');
  ok((await replies()).join('|')==='About charlie.','dropping a pick drops its reply '+(await replies()).join('|'));
  const st=await answers(p);
  ok(/"many":\[3,2\]/.test(st)&&!/settling|charlie|alpha/i.test(st.replace(/"many"/,'')),'what is stored is positions, never a reply '+st);
  ok(p.__bad.length===0,'replies: no policy violation or page error '+p.__bad.join(' | '));
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'ALL PASSED');process.exit(fails.length?1:0);
})().catch(e=>{console.log('FAIL the check stopped: '+String((e&&e.message)||e).split('\n')[0]);process.exit(1);});
