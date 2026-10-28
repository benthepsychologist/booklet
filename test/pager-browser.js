// Browser check of four layout rules of 0.15's bar and pager, at 1280 and 390 px. Each fails without its rule:
//  1. nothing scrolled shows through the bar: it is opaque (--bar-bg, light and dark);
//  2. the page's scroll padding is the bar and 24px (--ap-top and 12px), so a box the keyboard moves to is clear of the bar;
//  3. the page count takes the room its row has (`.pg-at{flex:1 1 auto}`): between Back and Next, or to the row's end when
//     Next has wrapped;
//  4. Next on a row of its own, on a phone, stays on the right (`.cd-foot>.primary{margin-left:auto}`).
// (Begun as footpin-browser.js, with two checks of the prose 0.15 first held under the bar, which went with it.)
// Invented content. Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/pager-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const Q=['What went well this week?','What was harder than you expected?','What did you put off?','Who helped?','What did you learn?',
  'What would you do again?','What would you drop?','What is one thing for next week?'];
const FILE=`---
booklet: "0.16"
title: Week
lang: en
---

> [!module|m] Week

> [!activity|look] Looking back

Answer these about your week. Any of them can be skipped.

${Q.map((q,i)=>`> [!text|q${i+1}] ${q}`).join('\n\n')}

***

> [!text|keep] One thing to keep?

> [!activity|next] Another activity with a title long enough to wrap

> [!text|n1] Anything?

> [!module|m end] End
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'pager.booklet.md');fs.writeFileSync(file,FILE);
  const b=await chromium.launch();
  for(const W of [1280,390]){
    const p=await (await b.newContext({viewport:{width:W,height:800}})).newPage();
    const bad=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))bad.push(m.text());});p.on('pageerror',e=>bad.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(!(await p.locator('#main button.card').count())){await p.locator('#btnHome').click();await p.waitForTimeout(500);}
    await p.locator('#main button.card').first().click();await p.waitForTimeout(700);

    /* 1 and 2: scrolled down, the bar's own colour is opaque, in the light and the dark scheme; the scroll padding is the bar and 24px */
    await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await p.waitForTimeout(400);
    const top=await p.evaluate(()=>{const br=document.querySelector('.bar').getBoundingClientRect();
      return {barH:br.height,scrolled:scrollY,pad:parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)};});
    ok(top.scrolled>0,W+': the page has scrolled '+JSON.stringify(top));
    for(const scheme of ['light','dark']){await p.emulateMedia({colorScheme:scheme});await p.waitForTimeout(150);
      const bg=await p.evaluate(()=>getComputedStyle(document.querySelector('.bar')).backgroundColor);
      const m=bg.match(/rgba?\(([^)]*)\)/),a=m?m[1].split(/[ ,\/]+/).filter(Boolean).map(Number):[];
      ok(a.length===3||(a.length===4&&a[3]===1),W+': the bar is opaque ('+scheme+'): nothing scrolled shows through it '+bg);}
    await p.emulateMedia({colorScheme:'light'});
    ok(Math.abs(top.pad-(Math.ceil(top.barH+12)+12))<=1,W+': the scroll padding is the bar and 24px '+JSON.stringify({pad:top.pad,want:Math.ceil(top.barH+12)+12}));

    /* 3 and 4: the foot row. gap is the row's column gap */
    const foot=()=>p.evaluate(()=>{const f=document.querySelector('#main .cd-foot');if(!f) return null;
      const box=n=>{if(!n) return null;const r=n.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom};};
      return {foot:box(f),gap:parseFloat(getComputedStyle(f).columnGap)||0,back:box(f.querySelector('.cd-btn:first-child')),at:box(f.querySelector('.pg-at')),
        next:box(f.querySelector('.primary')),text:[...f.children].map(c=>c.textContent.trim()).join(' | ')};});
    const near=(a,b)=>Math.abs(a-b)<=1.5;
    /* one row: the page count fills the room between Back and Next. Next wrapped onto a row of its own: Next at the right end
       of its row, and the page count to the end of Back's row */
    const row=(f,page)=>{if(!f||!f.back||!f.at||!f.next){ok(false,W+': '+page+': a foot row of Back, the page count and Next: '+(f&&f.text));return null;}
      const wrapped=f.next.t>=f.back.b;
      if(!wrapped) ok(near(f.back.t,f.next.t)&&near(f.at.l,f.back.r+f.gap)&&near(f.at.r,f.next.l-f.gap),W+': '+page+': one row, and the page count fills the room between Back and Next '+JSON.stringify({back:f.back.r,at:[f.at.l,f.at.r],next:f.next.l,gap:f.gap}));
      else{ok(near(f.next.r,f.foot.r),W+': '+page+': Next, on a row of its own, stays on the right '+JSON.stringify({next:[f.next.l,f.next.r],foot:[f.foot.l,f.foot.r]}));
        ok(near(f.at.l,f.back.r+f.gap)&&near(f.at.r,f.foot.r),W+': '+page+': the page count takes the rest of Back\'s row '+JSON.stringify({back:f.back.r,at:[f.at.l,f.at.r],foot:f.foot.r}));}
      return wrapped;};
    let f=await foot();
    ok(!!f&&/^Back to the overview \| Page 1 of 2 \| Next$/.test(f.text),W+': page one: Back to the overview, Page 1 of 2, Next: '+(f&&f.text));
    const w1=row(f,'page one');
    /* at 390 the long Back pushes the short Next onto a row of its own, which is the case the margin rule is for */
    if(W===390) ok(w1===true&&f.next.r-f.next.l<(f.foot.r-f.foot.l)/2,W+': page one on a phone: the short Next is on a row of its own '+JSON.stringify(f&&f.next));
    else ok(w1===false,W+': page one: one row');
    await p.locator('#main .cd-foot .pg-next').click();await p.waitForTimeout(600);
    await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await p.waitForTimeout(300);
    f=await foot();
    ok(!!f&&/^Back \| Page 2 of 2 \| Next: 2\. Another activity/.test(f.text),W+': page two: Back, Page 2 of 2, the next activity: '+(f&&f.text));
    const w2=row(f,'page two');
    ok(w2===(W===390),W+': page two: '+(W===390?'the next activity\'s long name wraps Next onto a row of its own':'one row'));
    await p.screenshot({path:path.join(OUT,'pager-'+W+'.png')});
    ok(bad.length===0,W+': no policy violation or page error: '+bad.join(' | '));
    await p.context().close();
  }
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'ALL PASSED');process.exit(fails.length?1:0);
})();
