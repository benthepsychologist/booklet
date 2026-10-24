// Browser check of how a question is laid out and what it answers with (SPEC.md sections 5 and 7), at 1280 and 400 px.
//  - a question's words keep a readable width; short options sit beside them only when both fit, else they drop under them;
//  - a matrix is a grid of rows when each item's readable words and the anchors fit, and one single-choice question per item when they do not,
//    with the same answers under the same key, kept across a window that is narrowed and widened again; drawn as separate
//    questions it keeps its stem held under the bar while its items are answered, as far as its end (not on a window 360 px
//    tall or less), and as a grid it does not;
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
booklet: "0.15"
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

> [!multi|graded] Which are fruits?
- [x] Apple
  - An apple is a fruit.
- [ ] Brick
  - A brick is not.
- [x] Cherry
  - A cherry is a fruit.

> [!choice|gradedc] Which is a fruit?
- [x] Pear
  - A pear is a fruit.
- [ ] Stone
  - A stone is not.

> [!choice|openq open] Pick or add one?
- [ ] Red
  - A red reply.
- [ ] Blue

> [!choice|two] Two lines?
- [ ] One
  - First line.
  - Second line.
- [ ] Other

> [!scale|sc] How clear?

1. Low
2. Mid
3. High

> [!scale|sc-long] How much, on a long scale?

1. Not at all, really
2. A little, perhaps
3. Some of the time
4. Often enough to notice
5. Most of the time

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
const FILE2=`---
booklet: "0.15"
title: Matrix column
lang: en
---

# Matrix column

> [!module|mc] Matrix column

> [!activity|log repeat] Daily log

> [!matrix|phq] Over the last 2 weeks, how often have you been bothered by:

- Little interest or pleasure in doing things
- Feeling down, depressed, or hopeless
- Trouble falling or staying asleep, or sleeping too much

0. Not at all
1. Several days
2. More than half the days
3. Nearly every day

> [!module|mc end] End
`;
/* a nine-item matrix with a stem, then a question after it (invented items) */
const FILE3=`---
booklet: "0.15"
title: Matrix stem
lang: en
---

> [!module|ms] Matrix stem

> [!activity|week] This week

> [!matrix|wk] Over the last week, how often did each of these happen to you at home or at work?

- You ran late for something you had planned
- You forgot where you had put your keys
- You skipped a meal because you were busy
- You stayed up later than you meant to
- You put off a call you needed to make
- You lost track of what you came into a room for
- You said yes to something you wanted to refuse
- You left a cup of tea to go cold
- You checked the weather more than twice in a day

0. Not at all
1. Several days
2. More than half the days
3. Nearly every day

> [!text|after] Anything else about the week?

> [!text|after2] And one more thing?

Some words after the questions, so the page can be scrolled well past the matrix: the kettle, the stove and the cups on the
shelf, and what the week was like for each of them.

> [!text|after3] What went well?

> [!text|after4] What would you change?

> [!text|after5] Who helped?

> [!text|after6] What is next?

> [!module|ms end] End
`;
/* the same matrix in a group, its two questions after it in another: one at a time, the matrix is a step */
const FILE5=(()=>{const a=FILE3.indexOf('> [!matrix|wk]'),b=FILE3.indexOf('> [!text|after]'),c=FILE3.indexOf('\nSome words after');
  const q=t=>t.trim().split('\n').map(l=>l?'> '+l:'>').join('\n');
  return FILE3.slice(0,a).replace('title: Matrix stem','title: Matrix steps')+'> [!group] The week\n'+q(FILE3.slice(a,b))+'\n\n> [!group] After\n'+q(FILE3.slice(b,c))+'\n'+FILE3.slice(c);})();
/* the same matrix with no words of its own: no stem */
const FILE4=FILE3.replace('title: Matrix stem','title: Bare matrix').replace('> [!matrix|wk] Over the last week, how often did each of these happen to you at home or at work?','> [!matrix|wk]');
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'questions.booklet.md');fs.writeFileSync(file,FILE);
  const file2=path.join(OUT,'matrixcolumn.booklet.md');fs.writeFileSync(file2,FILE2);
  const b=await chromium.launch();
  const open=async(W,fname,touch)=>{
    const p=await (await b.newContext({viewport:{width:W,height:900},...(touch?{hasTouch:true,isMobile:true}:{})})).newPage();
    p.__bad=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))p.__bad.push(m.text());});p.on('pageerror',e=>p.__bad.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(fname||file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(!(await p.locator('#main .ap-body').count())){if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(500);}
      await p.locator('button.mode').first().click();await p.waitForTimeout(700);}
    return p;};
  const size=async(p,W)=>{await p.setViewportSize({width:W,height:900});await p.waitForTimeout(500);};
  const page2=async p=>{await p.evaluate(()=>document.querySelector('#main .cd-foot .pg-next').click());await p.waitForTimeout(500);};
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
  const shape=()=>p.evaluate(()=>({rows:document.querySelectorAll('#main .mxrow').length,qs:document.querySelectorAll('#main .mxq').length}));
  let n=await shape();
  ok(n.qs===0&&n.rows===4,`1280: both matrices are grids of rows, the four-anchor one too, now that a matrix has the content column's width ${JSON.stringify(n)}`);
  await p.screenshot({path:path.join(OUT,'questions-1280.png'),fullPage:true});

  /* ---- a matrix answered in one drawing keeps its answers in the other, and back ---- */
  /* 860: no page menu beside the content any more (the pages are a pager under it), so the column is the window less its margins */
  await size(p,860);
  n=await shape();
  ok(n.rows===2&&n.qs===2,`860: the matrix whose four anchors need more than the column is drawn as questions, the other as rows ${JSON.stringify(n)}`);
  await size(p,1280);
  /* the narrow matrix is rows 2 and 3 at 1280. Answer item 1 High, item 2 Low through the radios. */
  await p.locator('#main .mxrow').nth(2).locator('.mxopt').nth(1).click();   // narrow matrix, item 1: High (2)
  await p.locator('#main .mxrow').nth(3).locator('.mxopt').nth(0).click();   // item 2: Low (1)
  const wide=await answers(p);
  ok(/"narrow":\[2,1\]/.test(wide),`1280: the rows store one anchor number per item, by position ${wide}`);
  await size(p,400);
  n=await shape();
  ok(n.rows===0&&n.qs===4,`400: both matrices are one single-choice question per item (${n.qs} questions, ${n.rows} rows)`);
  const looks=await p.evaluate(()=>{const stem=document.querySelector('#main .mx-asq > h3:first-child'),item=document.querySelector('#main .mxq h3');
    if(!stem||!item) return null;const a=getComputedStyle(stem),c=getComputedStyle(item);
    return {stemBorder:parseFloat(a.borderLeftWidth),itemBorder:parseFloat(c.borderLeftWidth),stemColour:a.color,itemColour:c.color,stemWeight:a.fontWeight,itemWeight:c.fontWeight};});
  ok(looks&&looks.stemBorder>=2&&looks.itemBorder===0&&looks.stemColour!==looks.itemColour,`400: the matrix's own words are drawn as a stem above its questions, styled apart from them ${JSON.stringify(looks)}`);
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
  n=await shape();
  ok(n.rows===4&&n.qs===0,`1280 again: both matrices are rows again (${JSON.stringify(n)})`);
  ok(await answers(p)===mid,'1280 again: widening changes no stored answer');
  const checked=await p.evaluate(()=>[...document.querySelectorAll('#main .mxrow')].map(r=>[...r.querySelectorAll('input')].filter(i=>i.checked).map(i=>i.value).join()));
  ok(checked.join('|')==='2||2|1',`1280 again: the rows show the answers given while narrow and wide (${checked.join('|')})`);
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
  /* no ordinary word is broken in the middle: a word is split only when it is longer than its cell (here, the one long word) */
  const split=await p.evaluate(()=>{const out=[];document.querySelectorAll('#main .emb').forEach(c=>{const t=c.firstChild;if(!t||t.nodeType!==3) return;
    for(const m of t.textContent.matchAll(/\S+/g)){const r=document.createRange();r.setStart(t,m.index);r.setEnd(t,m.index+m[0].length);
      const tops=new Set([...r.getClientRects()].map(x=>Math.round(x.top)));if(tops.size>1) out.push(m[0]);}});return out;});
  ok(split.join()==='Overwhelmedandexhaustedbyeverything','390: ordinary words are not split mid-word in the grid-select\'s chips; only the word longer than its cell is '+JSON.stringify(split));
  const hints=await p.evaluate(()=>[...document.querySelectorAll('#main .tagfield .hint')].map(h=>h.scrollWidth<=h.clientWidth+1&&h.getBoundingClientRect().height>h.parentElement.getBoundingClientRect().height*0.1));
  ok(hints.length>0&&hints.every(Boolean),'390: the hint above each cell\'s field wraps and is not cut '+JSON.stringify(hints));
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
      const r=h.closest('.q-inline')||h.parentElement,bt=[...r.querySelectorAll(':scope > .pills > button')].find(x=>x.textContent.replace(/\s+[\u2713\u2717].*$/,'')===n);if(bt) bt.click();return !!bt;},[group,name]);
    if(!hit) throw new Error('no option '+name+' under '+group);await p.waitForTimeout(100);};
  ok((await pillTexts('Where are you')).join()==='Calm,Wound up,Neither','a choice with replies still has exactly its options as buttons: no reply is an option '+(await pillTexts('Where are you')).join());
  ok((await replies()).length===0,'nothing is shown before a pick');
  await press('Where are you','Wound up');
  ok((await replies()).join('|')==='That is the activating, unpleasant family.','a pick shows that option\'s reply under the options '+(await replies()).join('|'));
  const under=await p.evaluate(()=>{const q=document.querySelector('#main .q-reply');if(!q) return false;const r=q.getBoundingClientRect(),h=[...document.querySelectorAll('#main h3')].find(x=>x.textContent.includes('Where are you')).closest('.q-inline').querySelector('.pills').getBoundingClientRect();return r.top>=h.bottom-1;});
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

  /* ---- a graded multi shows its replies with its marks (after Check); a graded choice with its mark; the rest on the pick ---- */
  const boxOf=(group)=>`(()=>{const h=[...document.querySelectorAll('#main h3')].find(x=>x.textContent.includes(${JSON.stringify(group)}));return h.closest('.q-inline')||h.parentElement;})()`;
  const repliesOf=group=>p.evaluate(`[...${boxOf(group)}.querySelectorAll('.q-reply')].map(x=>x.textContent)`);
  const check=async group=>{await p.evaluate(`${boxOf(group)}.querySelector('.q-acts button').click()`);await p.waitForTimeout(100);};
  await press('Which are fruits','Apple');
  ok((await repliesOf('Which are fruits')).length===0,'a graded multi: a pick shows no reply before Check (it would give the answer away)');
  await check('Which are fruits');
  ok((await repliesOf('Which are fruits')).join('|')==='An apple is a fruit.','a graded multi: Check shows the picked option\'s reply, with the marks '+(await repliesOf('Which are fruits')).join('|'));
  await press('Which are fruits','Cherry');
  ok((await repliesOf('Which are fruits')).length===0,'a graded multi: changing the picks hides the replies again until Check');
  await check('Which are fruits');
  ok((await repliesOf('Which are fruits')).join('|')==='An apple is a fruit.|A cherry is a fruit.','a graded multi: after Check, each picked option\'s reply in option order '+(await repliesOf('Which are fruits')).join('|'));
  await press('Which is a fruit','Stone');
  ok((await repliesOf('Which is a fruit')).join('|')==='A stone is not.','a graded choice: the reply comes with the mark, on the pick '+(await repliesOf('Which is a fruit')).join('|'));
  ok(await p.evaluate(`${boxOf('Which is a fruit')}.querySelectorAll('.q-wrong, .q-answer').length`)===2,'a graded choice: its marks are shown with the reply');

  /* ---- an `open` choice with replies: a listed option's reply shows; the reader's own option has none ---- */
  await press('Pick or add','Red');
  ok((await repliesOf('Pick or add')).join('|')==='A red reply.','an open choice: a listed option\'s reply shows on the pick');
  await p.evaluate(`(()=>{const b=${boxOf('Pick or add')},i=b.querySelector('.q-own');i.value='Green';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));})()`);
  await p.waitForTimeout(150);
  const own=await p.evaluate(`[...${boxOf('Pick or add')}.querySelectorAll('.pill-own .pill-btn')].map(x=>x.textContent).join()`);
  ok(own==='Green'&&(await repliesOf('Pick or add')).length===0,'an open choice: the reader\'s own option is picked in place of the listed one and has no reply, and the old reply goes '+own);
  await press('Pick or add','Blue');
  ok((await repliesOf('Pick or add')).length===0,'an open choice: an option with no reply shows none');
  const allPills=await p.evaluate(`[...${boxOf('Pick or add')}.querySelectorAll('.pill-btn')].map(x=>x.textContent).join()`);
  ok(allPills==='Red,Blue','an open choice: its two listed options are its only options; no reply is read as one (every button under the question: '+allPills+')');

  /* ---- two nested bullets are two lines of the reply ---- */
  await press('Two lines','One');
  const lines=await p.evaluate(`[...${boxOf('Two lines')}.querySelectorAll('.q-reply p')].map(x=>x.textContent)`);
  ok(lines.join('|')==='First line.|Second line.','two nested bullets under an option are both its reply, drawn as two lines '+lines.join('|'));

  /* ---- a scale follows the same rule as a choice: beside when short and it fits, else under ---- */
  g=await geo(p,'How clear');
  ok(g.beside,'1280: a short scale sits beside its question, like short options');
  g=await geo(p,'How much, on a long scale');
  ok(!g.beside&&g.pillsTop>=g.textBottom-1,'1280: a scale of more than four anchors is under its question');
  await size(p,400);
  g=await geo(p,'How clear');
  ok(!g.beside,'400: the short scale drops under its question when it does not fit beside');
  await size(p,1280);

  /* ---- a matrix in a column about 890 px wide with no page menu is a grid (it is a questionnaire's usual width once the menu is gone) ---- */
  p=await open(960,file2);
  let col=await p.evaluate(()=>{const w=document.querySelector('.mxwrap'),pr=document.querySelector('.mxprobe');return {wrap:w.clientWidth,need:pr.offsetWidth,rows:document.querySelectorAll('.mxrow').length,qs:document.querySelectorAll('.mxq').length,menu:document.querySelectorAll('.ap-frame').length};});
  ok(col.menu===0&&col.wrap>=880&&col.wrap<=900,`960: the matrix's column is about 890 px with no page menu (${col.wrap}px)`);
  ok(col.rows===3&&col.qs===0,`960: a PHQ-style matrix (four anchors "Not at all" to "Nearly every day") is a grid of rows in that column: it needs ${col.need}px of ${col.wrap}px ${JSON.stringify(col)}`);
  await p.screenshot({path:path.join(OUT,'matrix-column-960.png'),fullPage:true});
  await size(p,1280);
  col=await p.evaluate(()=>({wrap:document.querySelector('.mxwrap').clientWidth,rows:document.querySelectorAll('.mxrow').length}));
  ok(col.rows===3&&col.wrap>900,`1280: and a grid at the full width the column has (${col.wrap}px)`);
  await p.screenshot({path:path.join(OUT,'matrix-column-1280.png'),fullPage:true});

  /* ---- the measuring box takes no room: a 1px-high one must not make the page scroll sideways, and it has no size ---- */
  await size(p,400);
  await p.addStyleTag({content:'.mxprobe{height:1px!important}'});await p.waitForTimeout(200);
  ok(await sideways(p)<=0,`400: the measuring box, even 1px high, does not scroll the page sideways (${await sideways(p)}px)`);
  const pbox=await p.evaluate(()=>{const r=document.querySelector('.mxprobebox').getBoundingClientRect();return {w:r.width,h:r.height,o:getComputedStyle(document.querySelector('.mxprobebox')).overflow};});
  ok(pbox.w===0&&pbox.h===0&&pbox.o==='hidden',`400: the measuring box is a zero-size clipped box ${JSON.stringify(pbox)}`);
  ok(await p.evaluate(()=>document.querySelectorAll('.mxq').length)===3,'400: and the matrix is one question per item on a phone');

  /* ---- a matrix in a repeating activity across Finalize, drawn as questions and as rows ---- */
  await p.evaluate(()=>{const a=document.querySelectorAll('.mxq')[0].querySelectorAll('button')[1];a.click();});await p.waitForTimeout(100);
  const d1=await p.evaluate(()=>JSON.stringify(draftFor('mc/log')));
  ok(/"phq":\[1,null,null\]/.test(d1),'400, repeating activity: a press as a question stores the matrix\'s list in the draft '+d1);
  await p.locator('.finalize').click();await p.waitForTimeout(500);
  const kept1=await p.evaluate(()=>JSON.stringify(keptFor('mc/log').map(e=>e.phq)));
  ok(kept1==='[[1,null,null]]','400: Finalize keeps the matrix\'s list in the entry '+kept1);
  const after=await p.evaluate(()=>({pressed:[...document.querySelectorAll('.mxq button')].filter(b=>b.getAttribute('aria-pressed')==='true').length,qs:document.querySelectorAll('.mxq').length,draft:JSON.stringify(draftFor('mc/log'))}));
  ok(after.qs===3&&after.pressed===0,'400: after Finalize the matrix is drawn again, unanswered, as questions '+JSON.stringify(after));
  await size(p,1280);
  await p.locator('.mxrow').nth(2).locator('.mxopt').nth(3).click();await p.waitForTimeout(100);
  const d2=await p.evaluate(()=>JSON.stringify(draftFor('mc/log')));
  ok(/"phq":\[null,null,3\]/.test(d2),'1280, repeating activity: a radio answers the new draft, as rows '+d2);
  await p.locator('.finalize').click();await p.waitForTimeout(500);
  const kept2=await p.evaluate(()=>JSON.stringify(keptFor('mc/log').map(e=>e.phq)));
  ok(kept2==='[[1,null,null],[null,null,3]]'||kept2==='[[null,null,3],[1,null,null]]','1280: a second Finalize keeps a second entry, the first one unchanged '+kept2);
  ok(p.__bad.length===0,'matrix column: no policy violation or page error '+p.__bad.join(' | '));

  /* ---- a matrix drawn as separate questions keeps its stem in view while its items are answered, as far as its own end;
     drawn as a grid it is not held (SPEC section 5) ---- */
  const file3=path.join(OUT,'matrixstem.booklet.md');fs.writeFileSync(file3,FILE3);
  p=await open(390,file3);await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);
  const stem=()=>p.evaluate(()=>{const box=document.querySelector('#main .mxwrap').parentElement,h=box.querySelector(':scope > h3:first-child'),r=h.getBoundingClientRect(),bar=document.querySelector('.bar'),
      c=getComputedStyle(bar),sh=c.boxShadow,col=(sh.match(/rgba?\([^)]*\)/)||[''])[0],px=sh&&sh!=='none'?sh.replace(col,'').trim().split(/\s+/).map(parseFloat):[];
    return {asq:box.classList.contains('mx-asq'),pos:getComputedStyle(h).position,top:r.top,bottom:r.bottom,h:r.height,bar:bar.getBoundingClientRect().bottom,
      reach:col===c.backgroundColor&&px.length>=3&&px[2]===0?px[1]+(px[3]||0):0,boxBottom:box.getBoundingClientRect().bottom,qs:box.querySelectorAll('.mxq').length,y:scrollY};});
  let sm=await stem();
  ok(sm.asq&&sm.qs===9&&sm.pos==='sticky',`390: the nine-item matrix is drawn as separate questions, and its stem is held (sticky) ${JSON.stringify({asq:sm.asq,qs:sm.qs,pos:sm.pos})}`);
  /* scrolled past item 5: item 6 just under the stem */
  /* (where the held stem's foot will be: the bar's foot and the stem's height) */
  for(let i=0;i<2;i++){await p.evaluate(()=>{const q=document.querySelectorAll('#main .mxq')[5],h=document.querySelector('#main .mx-asq > h3:first-child');
    window.scrollTo(0,scrollY+q.getBoundingClientRect().top-(document.querySelector('.bar').getBoundingClientRect().bottom+h.getBoundingClientRect().height)-2);});await p.waitForTimeout(300);}
  sm=await stem();
  const five=await p.evaluate(()=>{const q=document.querySelectorAll('#main .mxq');return {fifthBottom:q[4].getBoundingClientRect().bottom,sixthTop:q[5].getBoundingClientRect().top};});
  ok(sm.y>0&&five.fifthBottom<=sm.bottom+1&&five.sixthTop>=sm.bottom-1&&Math.abs(sm.top-sm.bar)<=1,`390: scrolled past the fifth item, the stem is held under the bar, its words in view ${JSON.stringify({stem:[sm.top,sm.bottom],bar:sm.bar,five})}`);
  ok(sm.bar+sm.reach>=sm.top-0.01,`390: nothing scrolled shows between the bar and the held stem: the bar's paint reaches the stem's top ${JSON.stringify({bar:sm.bar,reach:sm.reach,stem:sm.top})}`);
  await p.screenshot({path:path.join(OUT,'matrix-stem-390.png')});
  /* the keyboard, walking back up through the items' answers: no item it lands in has its words or the answer under the held
     stem, wholly or in part */
  await p.evaluate(()=>{const bs=document.querySelectorAll('#main .mxq button');bs[bs.length-1].focus();});
  const kw=[];
  for(let i=0;i<36;i++){kw.push(await p.evaluate(()=>{const a=document.activeElement,r=a.getBoundingClientRect(),h=document.querySelector('#main .mx-asq > h3:first-child').getBoundingClientRect(),q=a.closest('.mxq');
      return {item:!!q,top:Math.round(r.top),words:q?Math.round(q.querySelector('h3').getBoundingClientRect().top):null,bottom:Math.round(r.bottom),vh:innerHeight,stem:Math.round(h.bottom),
        held:Math.abs(h.top-document.querySelector('.bar').getBoundingClientRect().bottom)<=1};}));
    await p.keyboard.press('Shift+Tab');await p.waitForTimeout(120);}
  const hid=kw.filter(w=>w.item&&(w.top<w.stem-1||w.words<w.stem-1||w.bottom>w.vh));
  ok(kw.filter(w=>w.item&&w.held).length>=20&&hid.length===0,`390: Shift+Tab back up the items: no item it lands in has its words or the answer under the held stem, and the answer is on screen ${JSON.stringify({held:kw.filter(w=>w.item&&w.held).length,under:hid.slice(0,4)})}`);
  /* a press of the mouse on an answer just under the stem's foot (the answer partly under it) answers it, and the page does not
     move under it (the answer is where it was on the screen; the window's own scroll may follow the bar's height, which the
     saved state changes) */
  const pressUnder=async(P,how,item,dy)=>{await P.evaluate(()=>window.scrollTo(0,0));await P.waitForTimeout(80);
    const t=await P.evaluate(([item,dy])=>{const btn=document.querySelectorAll('#main .mxq')[item].querySelectorAll('button')[1],h=document.querySelector('#main .mx-asq > h3:first-child');
      for(let i=0;i<2;i++) window.scrollTo(0,scrollY+btn.getBoundingClientRect().top-(document.querySelector('.bar').getBoundingClientRect().bottom+h.getBoundingClientRect().height)+24);
      const r=btn.getBoundingClientRect();return {x:r.left+r.width/2,y:h.getBoundingClientRect().bottom+dy,top:r.top,was:btn.getAttribute('aria-pressed')};},[item,dy]);
    if(how==='tap') await P.touchscreen.tap(t.x,t.y);else await P.mouse.click(t.x,t.y);await P.waitForTimeout(250);
    const r=await P.evaluate(item=>{const btn=document.querySelectorAll('#main .mxq')[item].querySelectorAll('button')[1];return {now:btn.getAttribute('aria-pressed'),top:btn.getBoundingClientRect().top};},item);
    return {item,dy,moved:Math.round(r.top-t.top),was:t.was,now:r.now};};
  const clicks=[];for(const [i,dy] of [[1,3],[2,10],[3,16]]) clicks.push(await pressUnder(p,'click',i,dy));
  ok(clicks.every(c=>c.moved===0&&c.was==='false'&&c.now==='true'),`390: a mouse press on an answer just under the held stem answers it, and the page does not move ${JSON.stringify(clicks)}`);
  /* past the matrix's end, the stem goes with its last item */
  await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await p.waitForTimeout(300);
  sm=await stem();
  ok(sm.bottom<=sm.boxBottom+1&&sm.top<sm.bar,`390: scrolled past the matrix, the stem has gone up with its last item, not held over what follows ${JSON.stringify({stem:[sm.top,sm.bottom],box:sm.boxBottom,bar:sm.bar})}`);
  /* as a grid it is not held; at every width, it is held exactly when the matrix is separate questions */
  await size(p,1280);await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(200);
  sm=await stem();
  ok(!sm.asq&&sm.pos!=='sticky',`1280: drawn as a grid, the stem is not held ${JSON.stringify({asq:sm.asq,pos:sm.pos})}`);
  const both=[];for(const w of [320,390,600,760,860,960,1100]){await size(p,w);const x=await stem();both.push([w,x.asq,x.pos]);}
  ok(both.every(([,a,pos])=>a===(pos==='sticky'))&&both.some(([,a])=>a)&&both.some(([,a])=>!a),`the stem is held at the widths the matrix is separate questions and at no other ${JSON.stringify(both)}`);
  /* on a window too short for the items to have room under the bar and a held stem (a phone on its side, 360 px tall or less),
     the stem is not held: it scrolls with its items; on any taller window it is held, wherever the matrix is separate questions */
  const tall=[];for(const [w,h] of [[568,320],[640,360],[740,360],[667,375],[844,390],[390,844],[360,640]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(400);
    const x=await stem();tall.push([w,h,x.asq,x.pos]);}
  ok(tall.filter(([,,a])=>a).every(([,h,,pos])=>(h<=360)===(pos!=='sticky'))&&tall.some(([,h,a])=>a&&h<=360)&&tall.some(([,h,a])=>a&&h>360),
    `the held stem lets go on a window 360 px tall or less, and only there ${JSON.stringify(tall)}`);
  ok(p.__bad.length===0,'matrix stem: no policy violation or page error '+p.__bad.join(' | '));
  await p.context().close();
  /* one at a time, the matrix in a group is a step on a card: its held stem is painted with the card's colour, not the page's */
  {const file5=path.join(OUT,'matrixsteps.booklet.md');fs.writeFileSync(file5,FILE5);
   p=await open(390,file5);await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);
   await p.locator('#main .oat-ctl button').filter({hasText:'One at a time'}).click();await p.waitForTimeout(400);
   const paint=await p.evaluate(()=>{const h=document.querySelector('#main .mx-asq > h3:first-child'),u=h&&h.closest('.oat-unit');
     return u&&{stem:getComputedStyle(h).backgroundColor,card:getComputedStyle(u).backgroundColor,pos:getComputedStyle(h).position};});
   ok(!!paint&&paint.stem===paint.card&&paint.pos==='sticky',`390, one at a time: the held stem is painted with the step's card it sits on ${JSON.stringify(paint)}`);
   ok(p.__bad.length===0,'matrix steps: no policy violation or page error '+p.__bad.join(' | '));
   await p.context().close();}
  /* a touch on an answer just under the held stem answers it, and the page does not move */
  p=await open(390,file3,true);await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);
  const taps=[];for(const [i,dy] of [[1,3],[2,6],[3,10],[4,14],[5,20]]) taps.push(await pressUnder(p,'tap',i,dy));
  ok(taps.every(c=>c.moved===0&&c.was==='false'&&c.now==='true'),`390, touch: a tap on an answer just under the held stem answers it, and the page does not move ${JSON.stringify(taps)}`);
  await p.context().close();
  /* a matrix with no words of its own has no stem; the keyboard and the mouse move through it without the page jumping */
  const file4=path.join(OUT,'matrixbare.booklet.md');fs.writeFileSync(file4,FILE4);
  p=await open(390,file4);await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);
  const bare=await p.evaluate(()=>{const box=document.querySelector('#main .mxwrap').parentElement;return {asq:box.classList.contains('mx-asq'),h3:!!box.querySelector(':scope > h3'),qs:box.querySelectorAll('.mxq').length};});
  ok(bare.asq&&!bare.h3&&bare.qs===9,`390: a matrix with no words is drawn as separate questions, with no stem ${JSON.stringify(bare)}`);
  await p.evaluate(()=>{const q=document.querySelectorAll('#main .mxq')[4];window.scrollTo(0,scrollY+q.getBoundingClientRect().top-300);});await p.waitForTimeout(250);
  const y0=await p.evaluate(()=>scrollY);
  await p.evaluate(()=>{const bs=document.querySelectorAll('#main .mxq')[3].querySelectorAll('button');bs[bs.length-1].focus();});await p.keyboard.press('Tab');await p.waitForTimeout(250);
  const kb=await p.evaluate(()=>({y:scrollY,on:document.activeElement.closest('.mxq')===document.querySelectorAll('#main .mxq')[4]}));
  ok(y0>0&&kb.on&&Math.abs(kb.y-y0)<=1,`390: with no stem, Tab into the fifth item leaves the page where it was ${JSON.stringify({y0,kb})}`);
  const c5=await p.evaluate(()=>{const r=document.querySelectorAll('#main .mxq')[4].querySelectorAll('button')[2].getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,top:r.top};});
  await p.mouse.click(c5.x,c5.y);await p.waitForTimeout(250);
  const ck=await p.evaluate(()=>{const b=document.querySelectorAll('#main .mxq')[4].querySelectorAll('button')[2];return {top:b.getBoundingClientRect().top,now:b.getAttribute('aria-pressed'),a:JSON.stringify(STATE.answers)};});
  ok(ck.now==='true'&&Math.abs(ck.top-c5.top)<=1&&/"wk":\[null,null,null,null,2/.test(ck.a),`390: with no stem, a press on the fifth item answers it, and the page does not move under it ${JSON.stringify({before:c5.top,ck})}`);
  ok(p.__bad.length===0,'matrix with no words: no policy violation or page error '+p.__bad.join(' | '));
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'ALL PASSED');process.exit(fails.length?1:0);
})().catch(e=>{console.log('FAIL the check stopped: '+String((e&&e.message)||e).split('\n')[0]);process.exit(1);});
