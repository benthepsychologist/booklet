// Browser check of the contents list (renderer 0.15), in a real page under the hosted Content-Security-Policy, at 390 and 1280 px:
// every list of parts the renderer draws is a contents list, not a grid of cards. It is an ordered list with one row to each part;
// every row is one control (a button) with a small picture, its title drawn as a link, its first line (two lines at most) and its
// status line; the rows share one left edge; the page does not scroll sideways; the whole row opens its part on Enter; the link's
// underline shows on hover and on focus and not at rest; the title reads against the page in all four themes.
//  - the lists checked: the home screen (a module of several activities is one row, a module of one activity is its activity's row),
//    a module's screen, a wiki module's top pages, a wiki page's child pages, and "Your booklets";
//  - a row with `status:off` has no status line, and a row with status text under its line shows that text (test/cardparts.test.js
//    has the parser and the write-back);
//  - the picture is the line's icon, a leading emoji, or the row's number, 2.25 rem square.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright-core node test/contents-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const head=t=>`---\nbooklet: "0.13"\ntitle: ${t}\nlang: en\n---\n\n`;
const LONG='A long first paragraph that goes on and on about the tides and the moon and the harbour wall and the boats that wait for the water to rise again, so that it needs more than two lines on a phone and still more than two on a wide screen, and the card must cut it short.';
const MAIN=head('Harbour')+`> [!module|m] Module of four

The module's own blurb.

> [!activity|a icon:waves] Tides
> Half an hour a day

The sea rises and falls twice a day.

> [!text|qa] A question?

> [!activity|b] 🌱 Grow

Plants need light.

> [!text|qb] Another?

> [!activity|c] Long one

${LONG}

> [!text|qc] A third?

> [!activity|d status:off] Quiet

No status line here.

> [!text|qd] A fourth?

> [!module|m end] End

> [!module|solo] Module of one

> [!activity|only] The only activity

Its own words.

> [!text|qo] One?

> [!module|solo end] End
`;
const WIKI=head('Notes')+`> [!module|w] Wiki

> [!activity|top] Top page

The top page.

> [!activity|other] Other page

Another top page.

> [!activity|kid1 parent:top] First child

Child one.

> [!activity|kid2 parent:top] Second child

Child two.

> [!module|w end] End
`;
const THEMES=['paper','daylight','night','contrast'];
const lum=c=>{const [r,g,bl]=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*bl;};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  for(const W of [390,1280]){
    const ctx=await b.newContext({viewport:{width:W,height:900}});const p=await ctx.newPage();
    const errs=[],cons=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    const wait=ms=>p.waitForTimeout(ms);
    const view=()=>p.evaluate(()=>document.body.dataset.view);
    const over=()=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    const toList=async()=>{for(let i=0;i<3;i++){if(await p.getByRole('button',{name:'Add a booklet from a file'}).count()) return;await p.locator('#btnHome').click();await wait(300);}};
    const load=async text=>{await toList();await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(250);
      await p.evaluate(t=>{document.getElementById('pasteIn').value=t;},text);
      await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(800);};
    /* what a list of rows looks like to a reader: the rows' boxes, the tiles, the chevrons and the list's own display */
    const rows=sel=>p.evaluate(s=>{const ol=document.querySelector(s);if(!ol) return null;
      const lis=[...ol.children],ctl=lis.map(li=>li.querySelector('.card-go')),r=e=>e.getBoundingClientRect();
      return {rem:parseFloat(getComputedStyle(document.documentElement).fontSize),tag:ol.tagName,display:getComputedStyle(ol).display,liTags:lis.map(l=>l.tagName).join(),n:lis.length,
        lefts:ctl.map(c=>Math.round(r(c).left)),tops:ctl.map(c=>Math.round(r(c).top)),bottoms:ctl.map(c=>Math.round(r(c).bottom)),widths:ctl.map(c=>Math.round(r(c).width)),
        tile:ctl.map(c=>{const t=c.querySelector('.cd-tile');return t?[Math.round(r(t).width),Math.round(r(t).height)]:null;}),
        chev:ctl.filter(c=>c.querySelector('.cd-chev')).length,
        kinds:ctl.map(c=>c.tagName+(c.classList.contains('mode')?'.mode':'')),
        status:ctl.map(c=>{const e=c.querySelector('.c');return e?e.textContent:null;}),
        dh:ctl.map(c=>{const d=c.querySelector('.d');return d?[Math.round(r(d).height),parseFloat(getComputedStyle(d).lineHeight)]:null;}),
        sep:lis.map(l=>getComputedStyle(l).borderTopWidth),
        font:ctl.map(c=>{const e=c.querySelector('.c');return e?parseFloat(getComputedStyle(e).fontSize):null;}),
        grid:lis.some(l=>getComputedStyle(l).display==='grid')};},sel);
    const isList=(R,label,n)=>{
      ok(!!R&&R.tag==='OL'&&R.liTags.split(',').every(t=>t==='LI'),`${W}px ${label}: an ordered list of items (${R&&R.tag} ${R&&R.liTags})`);
      ok(R&&R.n===n,`${W}px ${label}: ${n} rows (${R&&R.n})`);
      ok(R&&R.display!=='grid'&&R.display!=='flex'&&!R.grid,`${W}px ${label}: not a grid (${R&&R.display})`);
      ok(R&&new Set(R.lefts).size===1&&new Set(R.widths).size===1,`${W}px ${label}: the rows share one left edge and one width (${R&&R.lefts} / ${R&&R.widths})`);
      ok(R&&R.tops.every((t,i)=>i===0||t>=R.bottoms[i-1]-1),`${W}px ${label}: one column, each row under the one before`);
      ok(R&&R.chev===0,`${W}px ${label}: no chevron on a row`);
      ok(R&&R.sep.slice(1).every(s=>s==='1px')&&R.sep[0]==='0px',`${W}px ${label}: a quiet 1 px rule between rows, none above the first (${R&&R.sep})`);};

    await p.goto('https://bookletmd.test/app/');await wait(500);
    await load(MAIN);

    /* 1. the home screen: a module of several activities is one row, a module of one is its activity's row */
    ok(await view()==='@home','home: the booklet opens on its home screen ('+await view()+')');
    {const R=await rows('#main ol.modes');isList(R,'home',2);
     const first=await p.locator('#main ol.modes li').first().innerText();
     ok(/Module of four/.test(first)&&/The module's own blurb\./.test(first),`${W}px home: the module of four is one row, with its blurb (${JSON.stringify(first)})`);
     ok(await over()<=0,`${W}px home: no sideways scroll`);
     await p.screenshot({path:path.join(OUT,`home-${W}.png`)});
     await p.locator('#main ol.modes button.mode').first().focus();await p.keyboard.press('Enter');await wait(500);
     ok(await view()==='module:m',`${W}px home: Enter on the first row opens the module ('${await view()}')`);}

    /* 2. a module's screen */
    {const R=await rows('#main ol.modes');isList(R,'module screen',4);
     ok(R&&R.kinds.every(k=>k==='BUTTON.mode'),`${W}px module screen: every row is one button (${R&&R.kinds})`);
     ok(R&&R.tile.every(t=>t&&Math.abs(t[0]-R.rem*2.25)<=1&&Math.abs(t[1]-R.rem*2.25)<=1),`${W}px module screen: every picture is 2.25 rem square (${JSON.stringify(R&&R.tile)})`);
     ok(R&&R.status[0]==='Half an hour a day'&&R.status[1]==='1 question · Not started'&&R.status[3]===null,`${W}px module screen: status text, the automatic line, and none for status:off (${JSON.stringify(R&&R.status)})`);
     ok(R&&R.dh[2]&&R.dh[2][0]<=Math.ceil(R.dh[2][1]*2)+1,`${W}px module screen: a long first line stops at two lines (${JSON.stringify(R&&R.dh[2])})`);
     ok(R&&R.font.filter(Boolean).every(f=>f<=14),`${W}px module screen: the status line is small (${R&&R.font})`);
     ok(await over()<=0,`${W}px module screen: no sideways scroll`);
     const pics=await p.evaluate(()=>[...document.querySelectorAll('#main ol.modes .cd-tile')].map(t=>({svg:!!t.querySelector('svg'),txt:t.textContent.trim()})));
     ok(pics[0].svg&&pics[1].txt==='🌱'&&pics[2].txt==='3',`${W}px module screen: the picture is the icon, the emoji, or the number (${JSON.stringify(pics)})`);
     const title=await p.locator('#main ol.modes button.mode .k').nth(1).innerText();
     ok(title.trim()==='Grow',`${W}px module screen: the emoji leaves the title (${title})`);
     /* the link's underline: at rest none, on hover and on focus yes */
     const dec=sel=>p.locator(sel).first().evaluate(e=>getComputedStyle(e).textDecorationLine);
     const k='#main ol.modes button.mode:nth-of-type(1) .k',row='#main ol.modes li:nth-child(1) button.mode';
     await p.mouse.move(2,2);
     ok(!/underline/.test(await dec(row+' .k')),`${W}px module screen: no underline at rest`);
     if(W>=1000){await p.locator(row).hover();await wait(100);ok(/underline/.test(await dec(row+' .k')),`${W}px module screen: the title is underlined on hover`);await p.mouse.move(2,2);}
     await p.locator('#main ol.modes button.mode').nth(2).focus();await p.keyboard.press('Shift+Tab');await wait(50);
     ok(/underline/.test(await p.evaluate(()=>getComputedStyle(document.activeElement.querySelector('.k')).textDecorationLine)),`${W}px module screen: the title is underlined on keyboard focus`);
     await p.keyboard.press('Enter');await wait(500);
     ok(await view()==='m/b',`${W}px module screen: Enter on the second row opens the second activity ('${await view()}')`);
     await p.locator('.cd-back').click();await wait(400);
     /* the whole row is the control: a click on its status line opens it too */
     await p.locator('#main ol.modes li:nth-child(1) .c').click();await wait(400);
     ok(await view()==='m/a',`${W}px module screen: a click anywhere in the row (its status line) opens it ('${await view()}')`);
     await p.locator('.cd-back').click();await wait(400);
     await p.screenshot({path:path.join(OUT,`module-${W}.png`)});

     /* the four themes */
     for(const t of THEMES){
       await p.selectOption('#themeSel',t);await wait(700);
       const m=await p.evaluate(()=>{const bg=getComputedStyle(document.documentElement).backgroundColor,k=document.querySelector('#main ol.modes .k'),c=document.querySelector('#main ol.modes .c'),d=document.querySelector('#main ol.modes .d');
         return {bg,k:getComputedStyle(k).color,c:getComputedStyle(c).color,d:getComputedStyle(d).color,rule:getComputedStyle(document.querySelector('#main ol.modes li:nth-child(2)')).borderTopColor,theme:document.documentElement.dataset.theme,
           soft:getComputedStyle(document.documentElement).getPropertyValue('--accent-soft').trim()};});
       ok(m.theme===t,`${W}px ${t}: theme set`);
       ok(ratio(rgb(m.k),rgb(m.bg))>=4.5,`${W}px ${t}: the title (a link) reads against the page: ${ratio(rgb(m.k),rgb(m.bg)).toFixed(2)}:1`);
       ok(ratio(rgb(m.c),rgb(m.bg))>=4.5&&ratio(rgb(m.d),rgb(m.bg))>=4.5,`${W}px ${t}: the muted lines read: ${ratio(rgb(m.c),rgb(m.bg)).toFixed(2)}:1 and ${ratio(rgb(m.d),rgb(m.bg)).toFixed(2)}:1`);
       ok(rgb(m.rule).join()!==rgb(m.bg).join(),`${W}px ${t}: the separator is drawn in the rule colour (${m.rule})`);
       ok(await over()<=0,`${W}px ${t}: no sideways scroll`);
       const R=await rows('#main ol.modes');ok(R&&new Set(R.lefts).size===1&&R.n===4,`${W}px ${t}: still one column of four rows`);
       await p.screenshot({path:path.join(OUT,`module-${t}-${W}.png`)});}
     await p.selectOption('#themeSel','paper');await wait(100);}

    /* 3. a wiki: the top pages, and a page's child pages */
    await load(WIKI);
    {const R=await rows('#main ol.modes.wk-cards');
     if(await view()!=='module:w'&&await p.locator('#main ol.modes').count()===0){await p.locator('#main button.mode').first().click();await wait(400);}
     const R2=await rows('#main ol.modes.wk-cards');isList(R2,'wiki top pages',2);
     ok(await over()<=0,`${W}px wiki top pages: no sideways scroll`);
     await p.locator('#main .wk-cards button.mode').first().click();await wait(500);
     const R3=await rows('#main ol.modes.wk-cards');isList(R3,'wiki child pages',2);
     ok(await over()<=0,`${W}px wiki child pages: no sideways scroll`);
     await p.screenshot({path:path.join(OUT,`wiki-${W}.png`)});
     const title=(await p.locator('#main .wk-content h2').first().innerText()).trim();
     await p.locator('#main .wk-cards button.mode').first().focus();await p.keyboard.press('Enter');await wait(500);
     const after=(await p.locator('#main .wk-content h2').first().innerText()).trim();
     ok(title==='Top page'&&after==='First child',`${W}px wiki child pages: Enter on a child opens it ('${title}' -> '${after}')`);}

    /* 4. Your booklets */
    await toList();await wait(300);
    {const R=await rows('#main ol.modes');isList(R,'Your booklets',2);
     ok(await over()<=0,`${W}px Your booklets: no sideways scroll`);
     ok(await p.locator('#main ol.modes li .bkacts button').count()===6,`${W}px Your booklets: Open, Rename and Remove are still on each row`);
     await p.screenshot({path:path.join(OUT,`library-${W}.png`)});
     await p.locator('#main ol.modes li').first().locator('button.k').click();await wait(600);
     ok(await view()!=='@booklets'&&(await view()).length>0,`${W}px Your booklets: the title opens the booklet ('${await view()}')`);}

    ok(errs.length===0,`${W}px: no page errors ${errs.join(' | ')}`);
    ok(cons.length===0,`${W}px: no Content-Security-Policy violation ${cons.join(' | ')}`);
    await ctx.close();}
  await b.close();
  console.log(fails.length?`\n${fails.length} FAILED`:'\ncontents list checks passed');
  process.exit(fails.length?1:0);
})();
