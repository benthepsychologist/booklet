// Browser check of tabs, the pager, one at a time across pages, and the fold switch (0.15), at 390 and 1280 px.
// The page never scrolls sideways; an activity's column is the whole content area (wider than the module screen's centred
// column at 1280), and its tab bar and pager start at its left edge and keep the prose's measure; the tab bar follows the
// ARIA tabs pattern by keyboard, and fades at an edge its tabs run past; a page turn brings the activity's top into view and
// puts the focus there, and a screen reader hears which page it is; a typed answer survives tab and page changes; the fold
// switch shows only with callouts the author folded and never opens a hint; nothing of an activity is held in view, and a
// control the keyboard reaches is never under the bar; one at a time, what comes before the first question (a line of
// instructions, a problem statement, a reference table) is drawn whole above every step; a citation open in an activity's
// prose stays open when the language changes; a link to a module's tab opens it.
// Replaces the page menu's check (pagesmenu-browser.js), which 0.15 removed with the menu. Invented content, but for the
// check-in's instruction line and items, which follow the PHQ-9's wording.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/tabs-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const FILE=`---
booklet: "0.15"
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

> [!text|q6] What would make it easier?

> [!text|q7] What would get in the way?

> [!text|q8] Who could help?

> [!text|q9] When will you look again?

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

> [!module|fr] Readings

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

> [!scale|p7] Feeling bad about yourself, or that you are a failure or have let yourself or your family down

0. Not at all
3. Nearly every day

> [!scale|p8] Moving or speaking so slowly that other people could have noticed, or being so fidgety or restless that you have been moving around a lot more than usual

0. Not at all
3. Nearly every day

> [!activity|long] A longer problem statement

The kettle in the shared kitchen has been switching itself off before the water boils, and three people have asked whether it should be replaced or repaired. The repair shop quotes a week and a modest fee; a new kettle costs a little more and arrives tomorrow. The office has no other way to boil water in the meantime, and the tea club meets on Thursday.

> [!text|l1] What would you do first?

> [!text|l2] Who should decide?

> [!text|l3] What would change your mind?

> [!activity|ref] A reference table

| Option | Cost | Wait |
| --- | --- | --- |
| Repair | Low | A week |
| Replace | Medium | A day |
| Borrow | None | Today |

> [!text|r1] Which option?

> [!text|r2] Why?

> [!text|r3] Anything else?

> [!activity|cite] With a citation

Answer against the source.[^src] Keep the answers short; a phrase is enough for each. Skip anything you like, and come back later in the week when you have had time to look again at the kettle and the stove and the cups on the shelf and think it over.

> [!text|c1] Your answer?

[^src]: Made-up source, page 3. "A quoted line." Verified

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
  /* after a page turn: the activity (its column: title, opening, tab bar) starts just under the bar, its title not behind the
     bar, unless the window is at the very top already (raw: the numbers) */
  const atTop=(p,raw)=>p.evaluate(raw=>{const b=document.querySelector('#main .ap-body'),c=b&&b.closest('.col'),h=c&&c.querySelector('h2'),
      bar=document.querySelector('.bar').getBoundingClientRect(),top=parseFloat(document.documentElement.style.getPropertyValue('--ap-top'))||0;
    const r={col:c&&Math.round(c.getBoundingClientRect().top),title:h&&Math.round(h.getBoundingClientRect().top),bar:Math.round(bar.bottom),apTop:Math.round(top),y:Math.round(scrollY)};
    return raw?r:!!c&&!!h&&r.title>=r.bar-1&&(r.y===0||Math.abs(r.col-r.apTop)<=2);},!!raw);
  /* what is held in view (position sticky) inside the activity's body, if anything */
  const held=p=>p.evaluate(()=>[...document.querySelectorAll('#main .ap-body *')].filter(x=>getComputedStyle(x).position==='sticky').map(x=>x.className||x.tagName));
  /* the block whose words include `words`, drawn above the step on show (one at a time) and not inside any step: shown, whole
     (nothing in it clipped or faded), and the table rows in it */
  const lead=(p,words)=>p.evaluate(words=>{const u=[...document.querySelectorAll('#main .oat-unit')].find(x=>!x.hidden),body=document.querySelector('#main .ap-body');
    const n=body&&[...body.children].find(k=>k.textContent.includes(words));if(!n||!u) return {lead:!!n,step:!!u};
    const r=n.getBoundingClientRect(),tr=[...n.querySelectorAll('tr')],cut=[n,...n.querySelectorAll('*')].some(x=>{const c=getComputedStyle(x);
      return ((c.overflowY==='hidden'||c.overflowY==='clip')&&x.scrollHeight>x.clientHeight+1&&!x.closest('.md-table'))||(c.maskImage&&c.maskImage!=='none');});
    return {shown:r.height>0&&!n.closest('[hidden]'),inStep:!!n.closest('.oat'),above:r.bottom<=u.getBoundingClientRect().top+1,cut,rows:tr.length,
      rowsIn:tr.every(x=>x.getBoundingClientRect().height>0),q:u.textContent.trim().slice(0,40)};},words);
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
    const area=await p.evaluate(()=>{const m=document.querySelector('#main .col').parentElement,r=m.getBoundingClientRect(),c=getComputedStyle(m);
      return {x:Math.round(r.left+parseFloat(c.paddingLeft)),w:Math.round(r.width-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight))};});
    ok(actCol.x===area.x&&actCol.w===area.w,W+': the activity\'s column is the whole content area '+JSON.stringify({area,actCol}));
    if(W===1280) ok(modCol.w<actCol.w,'1280: wider than the module screen\'s centred column '+JSON.stringify({modCol,actCol}));
    const lined=await p.evaluate(()=>{const c=document.querySelector('#main .col').getBoundingClientRect(),m=parseFloat(getComputedStyle(document.querySelector('#main .col p')).maxWidth);
      const box=s=>{const e=document.querySelector(s).getBoundingClientRect();return {x:Math.round(e.left),r:Math.round(e.right)};};
      return {col:Math.round(c.left),measure:Math.round(m),bar:box('#main .col>.tabbar'),foot:box('#main .cd-foot')};});
    ok([lined.bar,lined.foot].every(b=>b.x===lined.col&&b.r<=lined.col+lined.measure+1),W+': the tab bar and the pager start at the column\'s left edge and keep the prose\'s measure '+JSON.stringify(lined));
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
    const fits=await p.evaluate(()=>{const t=document.querySelector('#main [role=tablist]'),m=getComputedStyle(t);return {more:t.getAttribute('data-more'),mask:m.maskImage||m.webkitMaskImage||'none',over:t.scrollWidth>t.clientWidth};});
    ok(!fits.over&&!fits.more&&fits.mask==='none',W+': two tabs that fit: no fade at either edge '+JSON.stringify(fits));

    /* all at once, nothing is held: the words before the questions scroll away with them */
    ok((await held(p)).length===0,W+': nothing in the activity is held in view (no sticky block) '+JSON.stringify(await held(p)));
    await p.evaluate(()=>window.scrollTo(0,document.querySelectorAll('#main textarea')[2].getBoundingClientRect().top+scrollY-300));await p.waitForTimeout(300);
    /* the keyboard: walking back through the boxes, each one it lands on is below the bar, never behind it */
    await p.evaluate(()=>{const t=[...document.querySelectorAll('#main textarea')].pop();t.focus();});
    const walk=[];
    for(let i=0;i<4;i++){walk.push(await p.evaluate(()=>{const a=document.activeElement,r=a.getBoundingClientRect();
        return {el:a.tagName,top:Math.round(r.top),under:Math.round(document.querySelector('.bar').getBoundingClientRect().bottom)};}));
      await p.keyboard.press('Shift+Tab');await p.waitForTimeout(150);}
    const hidden=walk.filter(w=>/TEXTAREA|INPUT|BUTTON/.test(w.el)&&w.top<w.under-1);
    ok(walk.length===4&&hidden.length===0,W+': Shift+Tab back up the page: no box it lands on is under the bar '+JSON.stringify(walk));
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
    ok(!turned.end&&turned.top>=turned.margin-2,W+': the content\'s top is under the bar, not behind it (page two is long enough to scroll it anywhere) '+JSON.stringify(turned));
    ok(await atTop(p),W+': Next opens the page at the top of the activity: its title just under the bar, not behind it and not part-way down '+JSON.stringify(await atTop(p,true)));
    ok(/^Back \| Page 2 of 2 \| /.test(await foot(p)),W+': page two: Back, Page 2 of 2: '+await foot(p));
    await click(p,'#main [role=tab]','Read more');await click(p,'#main [role=tab]','Do it');
    ok(/Page 2 of 2/.test(await foot(p)),W+': the tab keeps the page it was left on this visit');
    await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(200);
    await click(p,'#main .cd-foot .pg-back');
    ok(await atTop(p),W+': so does Back, from the foot of page two '+JSON.stringify(await atTop(p,true)));
    ok(await p.locator('#main textarea').first().inputValue()==='hello typed',W+': after a tab change and two page turns the typed answer is there');
    ok(await sideways(p)<=0,W+': no sideways scroll on the pages');

    /* one at a time across pages: one Back and Next row */
    await click(p,'#main .oat-ctl button','One at a time');
    const s1=await foot(p);
    ok(/^Back \| Page 1 of 2 \| Next question$/.test(s1)&&await p.locator('#main .oat-nav').count()===0,W+': one at a time, on the first question still to answer: the foot\'s one row steps: '+s1);
    const oatLead=await lead(p,'against your last month');
    ok(oatLead.shown&&!oatLead.inStep&&oatLead.above&&(await held(p)).length===0,W+': one at a time, the line before the first question is drawn above the steps, in none of them, and not held '+JSON.stringify(oatLead));
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
    /* the bar shows there is more to scroll to: it fades at the edge the tabs run past, and only when they do */
    const cue=()=>p.evaluate(()=>{const t=document.querySelector('#main [role=tablist]'),m=getComputedStyle(t);
      return {more:t.getAttribute('data-more'),mask:m.maskImage||m.webkitMaskImage||'none',over:t.scrollWidth>t.clientWidth};});
    let cu=await cue();
    if(cu.over){ok(cu.more==='end'&&cu.mask!=='none',W+': the bar runs past its end: it fades there, the cue that there is more '+JSON.stringify(cu));
      await p.evaluate(()=>{const t=document.querySelector('#main [role=tablist]');t.scrollLeft=t.scrollWidth;});await p.waitForTimeout(250);cu=await cue();
      ok(cu.more==='start'&&cu.mask!=='none',W+': scrolled to its end, it fades at its start instead '+JSON.stringify(cu));
      await p.evaluate(()=>{const t=document.querySelector('#main [role=tablist]');t.scrollLeft=0;});await p.waitForTimeout(250);}
    else ok(!cu.more&&cu.mask==='none',W+': four tabs that fit: no fade '+JSON.stringify(cu));
    if(W===390) ok(cu.over,W+': (the four long tabs do run past the bar at this width)');
    /* the tab on show is all in view and its words clear of the fades, as the arrow keys move through them (a tab wider than
       the bar less both fades keeps the ends of its own padding in them) */
    if(cu.over){await p.locator('#main [role=tab][aria-selected=true]').focus();const seen=[];
      for(let i=0;i<3;i++){await p.keyboard.press('ArrowRight');await p.waitForTimeout(400);
        seen.push(await p.evaluate(()=>{const t=document.querySelector('#main [role=tablist]'),r=t.getBoundingClientRect(),n=t.querySelector('[aria-selected=true]'),a=n.getBoundingClientRect(),
          g=document.createRange();g.selectNodeContents(n);const w=g.getBoundingClientRect(),more=t.getAttribute('data-more')||'',fade=parseFloat(getComputedStyle(document.documentElement).fontSize)*2.5;
          return {more,box:[Math.round(a.left-r.left),Math.round(r.right-a.right)],words:[Math.round(w.left-r.left),Math.round(r.right-w.right)],fade,
            clear:a.left>=r.left-1&&a.right<=r.right+1&&(!/start/.test(more)||w.left-r.left>=fade-1)&&(!/end/.test(more)||r.right-w.right>=fade-1)};}));}
      ok(seen.every(x=>x.clear),W+': the arrow keys show each tab whole, its words clear of the faded edges '+JSON.stringify(seen));
      await p.locator('#main [role=tab]').first().click();await p.waitForTimeout(300);}
    await p.locator('#main [role=tab]').last().click();await p.waitForTimeout(300);
    ok(/Four/.test(await p.locator('#main [role=tabpanel]').innerText()),W+': the last tab can be reached and shown');
    await p.screenshot({path:path.join(OUT,'tabs-many-'+W+'.png')});

    const toAct=async name=>{await p.locator('#btnHome').click();await p.waitForTimeout(500);
      if(!(await p.locator('#main button.card').count())) await click(p,'#main button.small.primary','Open');
      await click(p,'#main button.card','Readings');
      await click(p,'#main [role=tab]',name==='Where next'?'Keys':'Check-ins');
      await click(p,'#main button.card',name);};
    /* one at a time, what comes before the first question stays, whole, above every step, whatever its length: a line of
       instructions, a four-sentence problem statement and a three-row reference table, at steps two and three (the reader
       answers against it) */
    for(const [name,words,qs] of [['Two weeks','Over the last 2 weeks',['Feeling down','Trouble falling']],
                                  ['A longer problem statement','the tea club meets on Thursday',['Who should decide','What would change your mind']],
                                  ['A reference table','Borrow',['Why?','Anything else?']]]){
      await toAct(name);
      if(name==='Two weeks'){
        /* all at once, nothing is held: scrolled to the foot of eight questions, the line before them has moved up with the
           page, by as much as it scrolled, like any text */
        const lineTop=()=>p.evaluate(()=>{const n=[...document.querySelectorAll('#main .ap-body p')].find(x=>/Over the last 2 weeks/.test(x.textContent));
          return {top:n.getBoundingClientRect().top,y:scrollY};});
        await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(200);const t0=await lineTop();
        await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await p.waitForTimeout(300);const t1=await lineTop();
        ok(t1.y>t0.y&&Math.abs((t0.top-t1.top)-(t1.y-t0.y))<=1&&(await held(p)).length===0,W+': all at once, scrolled to the foot of the questions, the line before them has moved up with the page like any text '+JSON.stringify({t0,t1}));
        await p.evaluate(()=>window.scrollTo(0,0));}
      await click(p,'#main .oat-ctl button','One at a time');
      for(const [i,q] of qs.entries()){
        await click(p,'#main .cd-foot .oat-next');
        const st=await lead(p,words);
        ok(st.shown&&!st.inStep&&st.above&&!st.cut&&st.q.includes(q)&&(name!=='A reference table'||st.rows===4&&st.rowsIn),
          W+': one at a time, at step '+(i+2)+' of "'+name+'", what comes before the first question is still drawn, whole, above the step '+JSON.stringify(st));}
      await click(p,'#main .oat-ctl button','All at once');}
    if(W===390){
      /* a citation open in an activity's prose stays open when the language changes */
      await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);
      await toAct('With a citation');
      await p.locator('#main .rd-mark').first().click();await p.waitForTimeout(300);
      const was=await p.evaluate(()=>!document.getElementById('rd-panel').hasAttribute('hidden'));
      await p.locator('.lang button[data-lang="fr"]').click();await p.waitForTimeout(500);
      const cp=await p.evaluate(()=>{const e=document.getElementById('rd-panel');return {open:!e.hasAttribute('hidden'),text:e.textContent.slice(0,80),lang:document.documentElement.lang};});
      ok(was&&cp.open&&/Made-up source/.test(cp.text),'390x844: a citation open in an activity\'s prose stays open when the language changes to French '+JSON.stringify({was,cp}));
      await p.locator('.lang button[data-lang="en"]').click();await p.waitForTimeout(400);
      if(await p.evaluate(()=>!document.getElementById('rd-panel').hasAttribute('hidden'))){await p.keyboard.press('Escape');await p.waitForTimeout(200);}
      await p.setViewportSize({width:390,height:800});await p.waitForTimeout(300);}
    /* a link to a module's tab opens the module's screen on it */
    await toAct('Where next');
    await click(p,'#main a.alink','Check-ins');
    ok(await tabs(p)==='Check-ins*|Keys'&&/Two weeks/.test(await p.locator('#main [role=tabpanel]').innerText()),W+': a link to a module\'s tab name opens the module\'s screen on that tab: '+await tabs(p));
    ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id)==='tb-check-ins',W+': with the focus on the tab');
    ok(await sideways(p)<=0,W+': no sideways scroll on the readings');
    ok(p.__bad.length===0,W+': no policy violation or page error: '+p.__bad.join(' | '));
    await p.context().close();
  }
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'ALL PASSED');process.exit(fails.length?1:0);
})();
