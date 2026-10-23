// Browser check of tabs, the pager, one at a time across pages, the fold switch and the frame (0.15), at 390 and 1280 px.
// The page never scrolls sideways; at 1280 an activity's content column has its module screen's left edge and width; the
// tab bar follows the ARIA tabs pattern by keyboard; a page turn brings the content's top into view and puts the focus
// there, and a screen reader hears which page it is; a typed answer survives tab and page changes; the fold switch shows
// only with callouts the author folded and never opens a hint; the frame is held under the bar while the questions scroll,
// and stays above the step one at a time; a frame is pinned only when it fits whole in the pin's height (a short line of
// instructions, a short key table), and a long plain reading is not pinned and nothing of it is cut; a control the keyboard
// reaches is never under the bar and the frame; a link to a module's tab opens it.
// Replaces the page menu's check (pagesmenu-browser.js), which 0.15 removed with the menu. Invented content, but for the
// check-in's instruction line and items, which follow the PHQ-9's wording as an example of a short frame.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/tabs-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const FILE=`---
booklet: "0.13"
title: Tabs
lang: en
---

> [!module|m] Money

The module's own words.

> [!tab|now] This month

> [!tab|learn] Learn

What the Learn tab is for.

> [!activity|plan] Plan

Everything here stays on this device.

> [!tab] Do it

Answer these against your last month. Anything can be skipped.

> [!text|q1] What came in?

> [!text|q2] What went out?

> [!text|q3] What surprised you?

***

> [!text|q4] One thing to change?

> [!tab] Read more

## Why a plan

Some words about plans.

> [!group]- The detail
> Folded detail text.

> [!text|q5] Anything else?

> [!hint]-
> A small hint.

> [!activity|why tab:learn] Why a budget helps

Reading only.

> [!activity|many tab:learn] Many areas

> [!tab] The first area with a long name

One.

> [!tab] The second area with a long name

Two.

> [!tab] The third area with a long name

Three.

> [!tab] The fourth area with a long name

Four.

> [!module|m end] End

> [!module|fr] Frames

> [!tab] Check-ins

> [!tab|keys] Keys

> [!activity|phq] Two weeks

Over the last 2 weeks, how often have you been bothered by any of the following problems?

> [!scale|p1] Little interest or pleasure in doing things

0. Not at all
3. Nearly every day

> [!scale|p2] Feeling down, depressed, or hopeless

0. Not at all
3. Nearly every day

> [!scale|p3] Trouble falling or staying asleep

0. Not at all
3. Nearly every day

> [!scale|p4] Feeling tired or having little energy

0. Not at all
3. Nearly every day

> [!scale|p5] Poor appetite or overeating

0. Not at all
3. Nearly every day

> [!scale|p6] Trouble concentrating on things

0. Not at all
3. Nearly every day

> [!activity|essay] A short history

Kettles were once heated on open fires, and the shape of the spout followed from how the steam had to leave the body without scalding the hand that poured. Over the years the handle moved, the lid grew a little knob, and the base widened so the kettle would not tip on an uneven hearth.

When stoves arrived, the base flattened to sit on a hot plate, and makers began to add a whistle so that the cook could leave the room. The whistle is a small chamber with two holes, and the steam sets the air in it ringing at a pitch that carries.

Electric kettles moved the element inside, then under a plate, and added a switch that trips when the steam reaches it. Today a kettle may keep water at a set heat for tea, and its shape still answers the same old questions.

> [!text|e1] What surprised you in this history?

> [!activity|key tab:keys] Calm

| Score | Means |
| --- | --- |
| 1 | Not at all |
| 7 | Completely |

> [!scale|k1] How calm were you today?

1. Not at all
7. Completely

> [!scale|k2] How calm were you yesterday?

1. Not at all
7. Completely

> [!activity|link tab:keys] Where next

See [[#Check-ins]] for the two-week questions.

> [!module|fr end] End
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'tabs.booklet.md');fs.writeFileSync(file,FILE);
  const b=await chromium.launch();
  const open=async W=>{
    const p=await (await b.newContext({viewport:{width:W,height:800}})).newPage();
    p.__bad=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))p.__bad.push(m.text());});p.on('pageerror',e=>p.__bad.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(!(await p.locator('#main [role=tablist]').count())){if(!(await p.locator('#main button.card').count())){await p.locator('#btnHome').click();await p.waitForTimeout(500);}
      await p.locator('#main button.card').first().click();await p.waitForTimeout(700);}
    return p;};
  const sideways=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const col=p=>p.evaluate(()=>{const r=document.querySelector('#main .col').getBoundingClientRect();return {x:Math.round(r.left),w:Math.round(r.width)};});
  const tabs=p=>p.evaluate(()=>[...document.querySelectorAll('#main [role=tab]')].map(t=>t.textContent.trim()+(t.getAttribute('aria-selected')==='true'?'*':'')).join('|'));
  const listed=p=>p.evaluate(()=>['Plan','Why a budget helps','Many areas'].filter(t=>[...document.querySelectorAll('#main [role=tabpanel] .card')].some(c=>c.textContent.includes(t))).join('|'));
  const foot=p=>p.evaluate(()=>{const f=document.querySelectorAll('#main .cd-foot');return f.length!==1?'('+f.length+' foot rows)':[...f[0].children].map(c=>c.textContent.trim()).join(' | ');});
  const click=async(p,sel,text)=>{await p.locator(sel).filter(text?{hasText:text}:{}).first().click();await p.waitForTimeout(350);};
  /* the frame on show, if any: held or not, its words */
  const frameNow=p=>p.evaluate(()=>{const n=document.querySelector('#main .pin');return n?{pinned:true,stick:n.classList.contains('pin-stick')&&getComputedStyle(n).position==='sticky',text:n.textContent.trim().slice(0,60),h:Math.round(n.getBoundingClientRect().height)}:{pinned:false};});
  /* the frame is drawn whole: nothing in it overflows a clipped box or is faded, and it has no button (no Show all) */
  const whole=p=>p.evaluate(()=>{const n=document.querySelector('#main .pin');if(!n) return false;
    const boxes=[n,...n.querySelectorAll('*')].filter(x=>!x.closest('.md-table')||x.classList.contains('md-table'));
    return !n.querySelector('button')&&boxes.every(x=>{const c=getComputedStyle(x);return !(c.overflowY==='hidden'||c.overflowY==='clip')||x.scrollHeight<=x.clientHeight+1;})
      &&boxes.every(x=>{const c=getComputedStyle(x);return (c.maskImage||'none')==='none'&&(c.webkitMaskImage||'none')==='none'&&c.maxHeight==='none';});});
  /* what has the keyboard's focus, as the accessibility tree has it: its role and name (what a screen reader says) */
  const focusedAx=async p=>{const s=await p.context().newCDPSession(p);await s.send('Accessibility.enable');
    const {nodes}=await s.send('Accessibility.getFullAXTree');await s.detach();
    const f=nodes.find(n=>!(n.role&&n.role.value==='RootWebArea')&&(n.properties||[]).some(q=>q.name==='focused'&&q.value&&q.value.value===true));
    return f?{role:f.role&&f.role.value,name:f.name&&f.name.value}:null;};

  for(const W of [1280,390]){
    const p=await open(W);
    /* the module's screen: a tab bar above the list, each tab listing its own */
    ok(await tabs(p)==='This month*|Learn',W+': the module screen has a tab bar, its first tab selected: '+await tabs(p));
    ok(await listed(p)==='Plan',W+': the first tab lists its activity: '+await listed(p));
    const modCol=await col(p);
    await click(p,'#main [role=tab]','Learn');
    ok(await listed(p)==='Why a budget helps|Many areas'&&/What the Learn tab is for/.test(await p.locator('#main [role=tabpanel]').innerText()),W+': the second tab lists its own, under its words: '+await listed(p));
    ok(await sideways(p)<=0,W+': the module screen does not scroll sideways');
    ok(await p.locator('#main .fold-sw').count()===0,W+': the module screen has no fold switch');
    await p.screenshot({path:path.join(OUT,'tabs-module-'+W+'.png')});
    await click(p,'#main [role=tab]','This month');
    await click(p,'#main button.card','Plan');

    /* the activity: its opening, its tab bar, the same column */
    ok(await tabs(p)==='Do it*|Read more',W+': the activity has a tab bar of its two tabs: '+await tabs(p));
    const actCol=await col(p);
    if(W===1280) ok(actCol.x===modCol.x&&actCol.w===modCol.w,'1280: the activity\'s content column has the module screen\'s left edge and width '+JSON.stringify({modCol,actCol}));
    const order=await p.evaluate(()=>{const o=[...document.querySelectorAll('#main .col > *')];const i=f=>o.findIndex(f);
      return i(n=>/stays on this device/.test(n.textContent)&&!n.matches('[role=tablist],[role=tabpanel]'))<i(n=>n.matches('[role=tablist]'));});
    ok(order,W+': the opening is above the tab bar');
    ok(await sideways(p)<=0,W+': the activity does not scroll sideways');
    const bar=await p.evaluate(()=>{const t=document.querySelector('#main [role=tablist]').getBoundingClientRect();return {r:Math.round(t.right),vw:document.documentElement.clientWidth};});
    ok(bar.r<=bar.vw,W+': the tab bar fits inside the window '+JSON.stringify(bar));

    /* the keyboard: the ARIA tabs pattern */
    await p.locator('#main [role=tab][aria-selected=true]').focus();await p.keyboard.press('ArrowRight');await p.waitForTimeout(300);
    const k=await p.evaluate(()=>{const a=document.activeElement;return {tab:a&&a.getAttribute('role'),text:a&&a.textContent.trim(),sel:a&&a.getAttribute('aria-selected')};});
    ok(k.tab==='tab'&&k.text==='Read more'&&k.sel==='true',W+': Right arrow selects the next tab and the focus moves to it '+JSON.stringify(k));
    await p.keyboard.press('ArrowRight');await p.waitForTimeout(300);
    ok(await tabs(p)==='Do it*|Read more',W+': Right arrow on the last goes round to the first');

    /* the frame, all at once: held under the bar while the questions scroll */
    const pin=await p.evaluate(()=>{const n=document.querySelector('#main .pin');return n&&{stick:n.classList.contains('pin-stick'),pos:getComputedStyle(n).position,text:n.textContent};});
    ok(pin&&pin.stick&&pin.pos==='sticky'&&/against your last month/.test(pin.text),W+': the frame is drawn, held (sticky) '+JSON.stringify(pin&&{stick:pin.stick,pos:pin.pos}));
    await p.evaluate(()=>window.scrollTo(0,document.querySelector('#main textarea[id]')?document.querySelectorAll('#main textarea')[2].getBoundingClientRect().top+scrollY-300:400));await p.waitForTimeout(300);
    const held=await p.evaluate(()=>{const n=document.querySelector('#main .pin').getBoundingClientRect(),top=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ap-top'))||0;
      return {top:Math.round(n.top),bar:Math.round(top),h:Math.round(n.height),vh:innerHeight,scrolled:Math.round(scrollY)};});
    ok(held.scrolled>0&&Math.abs(held.top-held.bar)<=24,W+': scrolled down, the frame stays at the top, under the bar '+JSON.stringify(held));
    ok(held.h<=held.vh*0.35,W+': the held frame takes no more than a third of the screen '+JSON.stringify(held));
    ok(await whole(p),W+': the frame is drawn whole: nothing in it is cut or faded, and there is nothing to press to see the rest');
    /* the keyboard: walking back through the boxes, each one it lands on is below the bar and the frame, never behind them */
    await p.evaluate(()=>{const t=[...document.querySelectorAll('#main textarea')].pop();t.focus();});
    const walk=[];
    for(let i=0;i<4;i++){walk.push(await p.evaluate(()=>{const a=document.activeElement,r=a.getBoundingClientRect(),n=document.querySelector('#main .pin').getBoundingClientRect();
        return {el:a.tagName,top:Math.round(r.top),under:Math.round(n.bottom)};}));
      await p.keyboard.press('Shift+Tab');await p.waitForTimeout(150);}
    const hidden=walk.filter(w=>/TEXTAREA|INPUT|BUTTON/.test(w.el)&&w.top<w.under-1);
    ok(walk.length===4&&hidden.length===0,W+': Shift+Tab back up the page: no box it lands on is under the bar or the frame '+JSON.stringify(walk));
    await p.screenshot({path:path.join(OUT,'tabs-frame-'+W+'.png')});
    await p.evaluate(()=>window.scrollTo(0,0));

    /* typed answers survive tab and page changes */
    await p.locator('#main textarea').first().fill('hello typed');await p.waitForTimeout(300);
    ok(/Page 1 of 2/.test(await foot(p))&&/Next$/.test(await foot(p)),W+': the foot is one row: Back, Page 1 of 2, Next: '+await foot(p));
    await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(200);
    await click(p,'#main .cd-foot .pg-next');
    const turned=await p.evaluate(()=>{const b=document.querySelector('#main .ap-body'),r=b.getBoundingClientRect(),top=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ap-top'))||0;
      return {top:Math.round(r.top),margin:Math.round(top),vh:innerHeight,end:Math.ceil(scrollY+innerHeight)>=document.documentElement.scrollHeight,focus:document.activeElement===b,text:/One thing to change/.test(b.textContent)};});
    ok(turned.text&&turned.focus,W+': Next turns the page and puts the focus on its content '+JSON.stringify(turned));
    const heard=await focusedAx(p);
    ok(heard&&heard.role==='group'&&heard.name==='Page 2 of 2',W+': the accessibility tree: what has the focus is a group named Page 2 of 2, which is what a screen reader says '+JSON.stringify(heard));
    ok(turned.top>=turned.margin-24&&turned.top<turned.vh/2,W+': the content\'s top is in view, under the bar, in the upper half of the screen (a short page cannot scroll it higher) '+JSON.stringify(turned));
    ok(/^Back \| Page 2 of 2 \| /.test(await foot(p)),W+': page two: Back, Page 2 of 2: '+await foot(p));
    ok(await p.locator('#main .pin').count()===1,W+': the frame is drawn on the tab\'s second page too');
    await click(p,'#main [role=tab]','Read more');await click(p,'#main [role=tab]','Do it');
    ok(/Page 2 of 2/.test(await foot(p)),W+': the tab keeps the page it was left on this visit');
    await click(p,'#main .cd-foot .pg-back');
    ok(await p.locator('#main textarea').first().inputValue()==='hello typed',W+': after a tab change and two page turns the typed answer is there');
    ok(await sideways(p)<=0,W+': no sideways scroll on the pages');

    /* one at a time across pages: one Back and Next row */
    await click(p,'#main .oat-ctl button','One at a time');
    const s1=await foot(p);
    ok(/^Back \| Page 1 of 2 \| Next question$/.test(s1)&&await p.locator('#main .oat-nav').count()===0,W+': one at a time, on the first question still to answer: the foot\'s one row steps: '+s1);
    const oatPin=await p.evaluate(()=>{const n=document.querySelector('#main .pin'),u=document.querySelector('#main .oat');return n&&u&&{stick:n.classList.contains('pin-stick'),above:n.getBoundingClientRect().bottom<=u.getBoundingClientRect().top+1};});
    ok(oatPin&&!oatPin.stick&&oatPin.above,W+': one at a time, the frame is above the steps '+JSON.stringify(oatPin));
    while(await p.locator('#main .cd-foot .oat-next').count()) await click(p,'#main .cd-foot .oat-next');
    const s3=await foot(p);
    ok(/^Back \| Page 1 of 2 \| Next$/.test(s3),W+': on the last step Next turns the page: '+s3);
    await click(p,'#main .cd-foot .pg-next');
    ok(/One thing to change/.test(await p.locator('#main .ap-body').innerText())&&/Page 2 of 2/.test(await foot(p)),W+': it does');
    await click(p,'#main .cd-foot .pg-back');
    const back=await p.evaluate(()=>[...document.querySelectorAll('#main .oat-unit')].filter(u=>!u.hidden).map(u=>u.textContent).join());
    ok(/What surprised you/.test(back),W+': Back from page two arrives on page one\'s last step');
    await click(p,'#main .oat-ctl button','All at once');

    /* the fold switch: only where the author folded; never a hint */
    ok(await p.locator('#main .fold-sw').count()===0,W+': a tab with no folded callout has no switch');
    await click(p,'#main [role=tab]','Read more');
    ok(await p.locator('#main .pin').count()===0,W+': a tab that reads (a heading, a callout) before its question has no frame: its reading is drawn whole');
    const sw=p.locator('#main .fold-sw');
    ok(await sw.count()===1&&(await sw.getAttribute('aria-checked'))==='false',W+': the tab with a folded callout has one switch, off');
    const fold=()=>p.evaluate(()=>({au:[...document.querySelectorAll('#main details.au-fold')].map(d=>d.open),all:[...document.querySelectorAll('#main details')].filter(d=>!d.classList.contains('au-fold')).map(d=>d.open)}));
    let f=await fold();
    ok(f.au.length===1&&!f.au[0]&&f.all.length>=1&&f.all.every(o=>!o),W+': the author\'s callout is folded, and so is the hint '+JSON.stringify(f));
    await sw.click();await p.waitForTimeout(300);f=await fold();
    ok(f.au[0]===true&&f.all.every(o=>!o)&&(await sw.getAttribute('aria-checked'))==='true',W+': the switch opens the author\'s callout, and not the hint '+JSON.stringify(f));
    await click(p,'#main [role=tab]','Do it');await click(p,'#main [role=tab]','Read more');f=await fold();
    ok(f.au[0]===true,W+': the choice is kept: drawn again, it is still open');
    await sw.click();await p.waitForTimeout(200);
    ok(await sideways(p)<=0,W+': no sideways scroll on the reading tab');
    await p.screenshot({path:path.join(OUT,'tabs-read-'+W+'.png')});
    /* four tabs with long names: the bar scrolls sideways inside itself, the page never does */
    await click(p,'#main .cd-foot .cd-back');await click(p,'#main [role=tab]','Learn');await click(p,'#main button.card','Many areas');
    const many=await p.evaluate(()=>{const t=document.querySelector('#main [role=tablist]');return {tabs:t.querySelectorAll('[role=tab]').length,inner:t.scrollWidth>t.clientWidth,ow:getComputedStyle(t).overflowX};});
    ok(many.tabs===4&&(W===1280||many.inner&&many.ow==='auto'),W+': four long tabs: '+(W===1280?'drawn':'the bar scrolls sideways inside itself')+' '+JSON.stringify(many));
    ok(await sideways(p)<=0,W+': and the page does not scroll sideways');
    await p.locator('#main [role=tab]').last().click();await p.waitForTimeout(300);
    ok(/Four/.test(await p.locator('#main [role=tabpanel]').innerText()),W+': the last tab can be reached and shown');
    await p.screenshot({path:path.join(OUT,'tabs-many-'+W+'.png')});

    /* what is pinned: a short line of instructions, and a short key table, whole; a long plain reading is not pinned */
    const toFrames=async name=>{await p.locator('#btnHome').click();await p.waitForTimeout(500);
      if(!(await p.locator('#main button.card').count())) await click(p,'#main button.small.primary','Open');
      await click(p,'#main button.card','Frames');
      if(name==='Calm'||name==='Where next') await click(p,'#main [role=tab]','Keys');
      await click(p,'#main button.card',name);};
    await toFrames('Two weeks');
    let fr=await frameNow(p);
    ok(fr.pinned&&fr.stick&&/Over the last 2 weeks/.test(fr.text),W+': a short line of instructions before the questions is pinned '+JSON.stringify(fr));
    ok(await whole(p),W+': whole');
    await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await p.waitForTimeout(250);
    const held2=await p.evaluate(()=>{const n=document.querySelector('#main .pin').getBoundingClientRect();return {top:Math.round(n.top),bar:parseFloat(document.documentElement.style.getPropertyValue('--ap-top'))};});
    ok(Math.abs(held2.top-held2.bar)<=24,W+': and held under the bar as the questions scroll '+JSON.stringify(held2));
    await toFrames('A short history');
    fr=await frameNow(p);
    const read=await p.evaluate(()=>{const ps=[...document.querySelectorAll('#main .ap-body p')].filter(x=>/Kettles|stoves arrived|Electric kettles/.test(x.textContent));
      const clipped=ps.some(x=>{for(let n=x;n&&n.id!=='main';n=n.parentElement){const c=getComputedStyle(n);if((c.overflowY==='hidden'||c.overflowY==='clip')&&n.scrollHeight>n.clientHeight+1) return true;
        if(c.maskImage&&c.maskImage!=='none'||c.webkitMaskImage&&c.webkitMaskImage!=='none') return true;}return false;});
      return {paras:ps.length,chars:ps.map(x=>x.textContent).join(' ').length,clipped,sticky:ps.some(x=>x.closest('[class*=pin]'))};});
    ok(!fr.pinned&&read.paras===3&&read.chars>=700&&!read.clipped&&!read.sticky,W+': a '+read.chars+'-character plain reading ending in one question is not pinned, and nothing of it is cut '+JSON.stringify({fr,read}));
    await p.screenshot({path:path.join(OUT,'tabs-reading-'+W+'.png')});
    await toFrames('Calm');
    fr=await frameNow(p);
    const rows=await p.evaluate(()=>{const n=document.querySelector('#main .pin');if(!n) return null;const b=n.getBoundingClientRect(),tr=[...n.querySelectorAll('tr')];
      return {rows:tr.length,inside:tr.every(r=>r.getBoundingClientRect().bottom<=b.bottom+1)};});
    ok(fr.pinned&&rows&&rows.rows===3&&rows.inside,W+': a short key table before a scale is pinned, every row of it in view '+JSON.stringify({fr,rows}));
    ok(await whole(p),W+': whole');
    /* a link to a module's tab opens the module's screen on it */
    await toFrames('Where next');
    await click(p,'#main a.alink','Check-ins');
    ok(await tabs(p)==='Check-ins*|Keys'&&/Two weeks/.test(await p.locator('#main [role=tabpanel]').innerText()),W+': a link to a module\'s tab name opens the module\'s screen on that tab: '+await tabs(p));
    ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id)==='tb-check-ins',W+': with the focus on the tab');
    ok(await sideways(p)<=0,W+': no sideways scroll on the frames');
    ok(p.__bad.length===0,W+': no policy violation or page error: '+p.__bad.join(' | '));
    await p.context().close();
  }
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'ALL PASSED');process.exit(fails.length?1:0);
})();
