// Browser checks for the shared row roles and the sort-and-filter control, in headless Chromium with the hosted /app/
// Content-Security-Policy applied (served from a fake origin through page.route). Not a *.test.js, so test/run.sh does
// not run it: it needs Playwright.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/roles-browser.js <booklet.html> <outdir>
// Checks, on test/fixtures/roles.booklet.md in each of the four themes at 1280px and 400px: the pill strip is one strip and
// wraps at 400px; a list's value sits at the right edge of its row; no sideways page overflow; the control exists only on the
// long views; typing in the search box filters and keeps focus and caret; Show and Sort by change the rows; a table heading and
// the Sort by select agree; Escape closes the bar and returns focus; a booklet's density sizes the rows and survives a reader's
// theme pick; zero CSP violations and page errors. Screenshots are written to <outdir>.
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.',R=path.dirname(HTML);
const CSP="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const fixture=path.join(R,'test/fixtures/roles.booklet.md');
  async function open(file,width,act){
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
    await p.locator('button.mode').first().click();await p.waitForTimeout(700);
    if(act!==false){await p.locator('button.mode').filter({hasText:act||'Overview'}).first().click();await p.waitForTimeout(900);}
    return {p,ctx,csp,errs};}
  const over=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const theme=async(p,n)=>{await p.selectOption('#themeSel',n);await p.waitForTimeout(250);};
  const shot=async(p,name)=>{await p.screenshot({path:path.join(OUT,name),fullPage:true});};
  const boxOf=(p,i)=>p.locator('.dv-box').nth(i);

  // 1 every theme at 1280 and 400: no sideways overflow, no CSP violations, no errors
  for(const w of [1280,400]){
    const t=await open(fixture,w);const p=t.p;
    for(const th of ['paper','daylight','night','contrast']){
      await theme(p,th);
      ok(await over(p)<=0,`${th} at ${w}px: no horizontal page overflow`);
      if(th==='paper'||th==='night') await shot(p,`overview-${th}-${w}.png`);}
    ok(t.csp.length===0&&t.errs.length===0,`${w}px: zero CSP violations and page errors `+t.csp.concat(t.errs).join('|'));
    await t.ctx.close();}

  // 2 at 1280, Paper: the pills, the list's value at the right edge, the control only where it is useful
  {const t=await open(fixture,1280);const p=t.p;
   await theme(p,'paper');
   const strip=await p.evaluate(()=>{const ul=document.querySelector('ul.dv-tiles.dv-pills');const u=ul.getBoundingClientRect();
     const pills=[...ul.querySelectorAll(':scope>li.pill')].map(e=>{const r=e.getBoundingClientRect();return {y:Math.round(r.y),x:Math.round(r.x),r:Math.round(r.right),h:Math.round(r.height)};});
     return {n:pills.length,ys:pills.map(x=>x.y),inside:pills.every(x=>x.r<=u.right+1),ul:Math.round(u.width)};});
   ok(strip.n===6&&strip.inside,'pills: six, in one strip, none outside it ('+JSON.stringify(strip)+')');
   ok(new Set(strip.ys.slice(0,5)).size===1,'pills: the five short ones share one row at 1280px ('+strip.ys.join(',')+')');
   const val=await p.evaluate(()=>{const ul=document.querySelectorAll('ul.dv-list')[0];
     return [...ul.querySelectorAll('li.dv-row')].map(li=>{const v=li.querySelector('.dv-val');const l=li.getBoundingClientRect(),r=v.getBoundingClientRect();return {gap:Math.round(l.right-r.right),w:Math.round(l.width)};});});
   ok(val.length===4&&val.every(x=>x.gap<=12&&x.gap>=0),'list: the value sits at the right edge of its row at 1280px ('+JSON.stringify(val)+')');
   const num=await p.evaluate(()=>{const v=document.querySelector('ul.dv-list .dv-val');return getComputedStyle(v).fontVariantNumeric;});
   ok(/tabular/.test(num),'list: values use tabular numbers ('+num+')');
   const face=await p.evaluate(()=>[['.dv-v'],['.dv-t'],['.ch-v']].map(([s])=>{const e=document.querySelector(s);return e?getComputedStyle(e).fontFamily:'';}));
   ok(face.every(f=>/Source Sans|sans-serif|Helvetica|Segoe/i.test(f)&&!/Lora|Georgia/.test(f)),'the tile figure, the list label and the bars value are in the sans face ('+face.join(' | ')+')');
   const ctl=await p.evaluate(()=>[...document.querySelectorAll('.dv-box')].map(b=>({btn:!!b.querySelector('.dv-ctl-btn'),rows:b.querySelectorAll('li.dv-row,tbody tr,.ch-row').length})));
   ok(ctl.filter(c=>c.btn).length===3&&ctl.filter(c=>c.btn).every(c=>c.rows>=9)&&ctl.filter(c=>!c.btn).every(c=>c.rows<=8),'the control button is on the three long views only ('+JSON.stringify(ctl)+')');
   const panels=await p.evaluate(()=>[...document.querySelectorAll('.dv-box')].map(b=>({panel:b.classList.contains('dv-panel'),bg:getComputedStyle(b).backgroundColor,bw:getComputedStyle(b).borderTopWidth})));
   ok(panels.filter(x=>x.panel).length>=3&&panels.filter(x=>x.panel).every(x=>x.bw!=='0px'),'lists, tables and bars sit in a surface card ('+JSON.stringify(panels.slice(0,3))+')');
   ok(await p.evaluate(()=>!document.querySelector('.dv-tiles').closest('.dv-panel')&&!document.querySelector('.dv-groups').closest('.dv-panel')),'tiles and grouped lists get no outer card');
   // the long list
   const li=()=>p.locator('.dv-box:has(.dv-ctl):not(:has(.dv-tree)) li.dv-row');
   const names=async()=>(await p.locator('.dv-box:has(.dv-ctl):not(:has(.dv-tree)) li.dv-row .dv-t').allInnerTexts());
   ok((await li().count())===10,'the long list has ten rows');
   const bx=p.locator('.dv-box:has(.dv-ctl):not(:has(.dv-tree))').first();
   ok(!(await bx.locator('.dv-bar').isVisible()),'the control bar starts closed');
   await bx.locator('.dv-ctl-btn').click();
   ok(await bx.locator('.dv-bar').isVisible()&&(await bx.locator('.dv-ctl-btn').getAttribute('aria-expanded'))==='true','the button opens the bar');
   await shot(p,'control-open-paper-1280.png');
   await bx.locator('.dv-q').click();
   await p.keyboard.type('web',{delay:30});await p.waitForTimeout(150);
   const f=await p.evaluate(()=>{const a=document.activeElement;return {cls:a.className,val:a.value,caret:a.selectionStart};});
   ok(f.cls==='dv-q'&&f.val==='web'&&f.caret===3,'typing in the search box keeps focus and the caret in it ('+JSON.stringify(f)+')');
   const nm=await names();
   ok(nm.length===3,'the search filters the rows ('+nm.length+' of 10: '+nm.join(' | ')+')');
   ok((await bx.locator('.dv-live').innerText())===nm.length+' of 10 shown','"N of M shown" says how many ('+(await bx.locator('.dv-live').innerText())+')');
   const rowsText=await p.locator('.dv-box:has(.dv-ctl):not(:has(.dv-tree)) li.dv-row').allInnerTexts();
   ok(rowsText.length>0&&rowsText.every(x=>/web/i.test(x)),'every row left shows the word typed');
   await bx.locator('.dv-q').fill('');await p.waitForTimeout(100);
   ok((await li().count())===10,'clearing the box brings every row back');
   await bx.locator('select[aria-label="Show"]').selectOption({label:'print'});
   const pr=await p.locator('.dv-box:has(.dv-ctl):not(:has(.dv-tree)) li.dv-row').allInnerTexts();
   ok(pr.length===3&&pr.every(x=>/print/.test(x)),'Show: one value of the badge field ('+pr.length+' rows)');
   await bx.locator('select[aria-label="Show"]').selectOption({label:'All'});
   await bx.locator('select[aria-label="Sort by"]').selectOption({label:'Hours'});
   const sorted=await p.evaluate(()=>[...document.querySelectorAll('.dv-box:has(.dv-ctl):not(:has(.dv-tree)) li.dv-row .dv-val')].map(x=>Number(x.textContent)));
   ok(sorted.length===10&&sorted.every((v,i)=>i===0||sorted[i-1]<=v),'Sort by: ascending by the value ('+sorted.join()+')');
   await bx.locator('.dv-dir').click();
   const desc=await p.evaluate(()=>[...document.querySelectorAll('.dv-box:has(.dv-ctl):not(:has(.dv-tree)) li.dv-row .dv-val')].map(x=>Number(x.textContent)));
   ok(desc.every((v,i)=>i===0||desc[i-1]>=v)&&desc[0]===6,'the direction button reverses it ('+desc.join()+')');
   await bx.locator('.dv-bar').press('Escape');
   const esc=await p.evaluate(()=>({open:document.querySelector('.dv-ctl-btn').getAttribute('aria-expanded'),focus:document.activeElement.className}));
   ok(esc.open==='false'&&esc.focus==='dv-ctl-btn','Escape closes the bar and returns focus to the button ('+JSON.stringify(esc)+')');
   ok(await bx.locator('.dv-live').innerText()==='','with nothing filtered the live line is empty');
   ok(t.csp.length===0&&t.errs.length===0,'1280: zero CSP violations and page errors '+t.csp.concat(t.errs).join('|'));
   await t.ctx.close();}

  // 3 the table: a heading and the Sort by select agree
  {const t=await open(fixture,1280);const p=t.p;
   const tb=p.locator('.dv-box:has(.dv-ctl):has(table)').first();
   const col=async i=>tb.locator('tbody tr td:nth-child('+(i+1)+')').allInnerTexts();
   const orig=await col(0);
   ok(orig.length===10,'the long table has ten rows');
   ok(await tb.locator('tbody td .pill').count()>=7,'the badge column is drawn as pills ('+await tb.locator('tbody td .pill').count()+')');
   const heads=tb.locator('thead th');
   const hours=await heads.count()-1;
   await heads.nth(hours).locator('button').click();
   const asc=(await col(hours)).map(Number);
   ok(asc.every((v,i)=>i===0||asc[i-1]<=v)&&(await heads.nth(hours).getAttribute('aria-sort'))==='ascending','a heading click sorts ascending ('+asc.join()+')');
   await tb.locator('.dv-ctl-btn').click();
   const sel=tb.locator('select[aria-label="Sort by"]');
   ok((await sel.inputValue())==='value'&&(await tb.locator('.dv-dir').innerText())==='↑','the Sort by select and the direction button agree ('+await sel.inputValue()+')');
   await sel.selectOption({label:'Task'});
   const named=await col(0);
   ok(JSON.stringify(named)===JSON.stringify([...orig].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'})))&&(await heads.nth(0).getAttribute('aria-sort'))==='ascending','the select sorts the table and the heading shows it');
   await heads.nth(0).locator('button').focus();await p.keyboard.press('Enter');
   const fo=await p.evaluate(()=>({tag:document.activeElement.tagName,cls:document.activeElement.className}));
   ok(fo.cls.includes('dv-sort'),'after a heading is pressed from the keyboard, focus stays on a heading ('+JSON.stringify(fo)+')');
   ok(t.csp.length===0&&t.errs.length===0,'table: zero CSP violations and page errors');
   await t.ctx.close();}

  // 4 at 400px: pills wrap, rows wrap rather than overflow, the control bar fits
  {const t=await open(fixture,400);const p=t.p;await theme(p,'paper');
   const strip=await p.evaluate(()=>{const ul=document.querySelector('ul.dv-tiles.dv-pills');const u=ul.getBoundingClientRect();
     const ps=[...ul.children].map(e=>{const r=e.getBoundingClientRect();return {y:Math.round(r.y),r:r.right,l:r.left};});
     return {rows:new Set(ps.map(x=>x.y)).size,inside:ps.every(x=>x.r<=u.right+1&&x.l>=u.left-1)};});
   ok(strip.rows>=3&&strip.inside,'pills wrap at 400px and stay inside the strip ('+JSON.stringify(strip)+')');
   const rows=await p.evaluate(()=>[...document.querySelectorAll('li.dv-row')].every(li=>li.scrollWidth<=li.clientWidth+1));
   ok(rows,'at 400px no list row overflows its box');
   await p.locator('.dv-box:has(.dv-ctl) .dv-ctl-btn').first().click();
   const bar=await p.evaluate(()=>{const bx=document.querySelector('.dv-box:has(.dv-ctl)');const r=bx.getBoundingClientRect();return [...bx.querySelectorAll('.dv-bar>*')].every(e=>{const q=e.getBoundingClientRect();return q.width===0||(q.right<=r.right+1&&q.left>=r.left-1);});});
   ok(bar,'the control bar fits inside its card at 400px');
   ok(await over(p)<=0,'no horizontal page overflow at 400px with the bar open');
   await shot(p,'control-open-paper-400.png');
   // the Look back page: kept-entry cards through the same control
   await p.getByRole('button',{name:/^← /}).first().click();await p.waitForTimeout(400);
   ok(t.csp.length===0&&t.errs.length===0,'400: zero CSP violations and page errors '+t.csp.concat(t.errs).join('|'));
   await t.ctx.close();}

  // 5 kept entries as cards, with the control
  {const t=await open(fixture,1280,'Look back');const p=t.p;
   ok(await p.locator('.dv-cards .entry').count()===10&&await p.locator('.dv-ctl-btn').count()===1,'kept entries: ten cards and one control');
   await p.locator('.dv-ctl-btn').click();
   await p.locator('select[aria-label="Sort by"]').selectOption({label:'Date'});
   const first=await p.locator('.dv-cards .entry .when').first().innerText();
   ok(/Sep 21/.test(first),'sorted by date, the oldest card is first ('+first+')');
   await p.locator('.dv-dir').click();
   ok(/Sep 30/.test(await p.locator('.dv-cards .entry .when').first().innerText()),'and the newest is first when reversed');
   await p.locator('.dv-q').fill('slow');await p.waitForTimeout(100);
   ok(await p.locator('.dv-cards .entry').count()===1&&(await p.locator('.dv-live').innerText())==='1 of 10 shown','search finds the one card that says "slow"');
   await p.locator('.dv-q').fill('nothing like this');await p.waitForTimeout(100);
   ok(/Nothing matches\./.test(await p.locator('.dv-none').innerText())&&await p.locator('.dv-none .dv-clear').count()===1,'nothing matching says so, with a Clear button in the line');
   await p.locator('.dv-none .dv-clear').click();
   ok(await p.locator('.dv-cards .entry').count()===10,'Clear brings the cards back');
   ok(t.csp.length===0&&t.errs.length===0,'cards: zero CSP violations and page errors');
   await t.ctx.close();}

  // 6 density: a booklet's own density sizes the views, and a reader's colour pick leaves it alone
  {const mk=(density,name)=>{const src=fs.readFileSync(fixture,'utf8').replace('\n# Studio project board','\n```booklet theme\ndensity: '+density+'\n```\n\n# Studio project board');
     const f=path.join(OUT,name);fs.writeFileSync(f,src);return f;};
   const sizes={};
   for(const d of ['compact','comfortable','roomy']){
     const t=await open(mk(d,'roles-'+d+'.booklet.md'),1280);const p=t.p;
     sizes[d]=await p.evaluate(()=>{const li=document.querySelector('ul.dv-list li.dv-row');const v=document.querySelector('.dv-tile .dv-v');
       return {row:li.getBoundingClientRect().height,tile:parseFloat(getComputedStyle(v).fontSize),pad:getComputedStyle(document.documentElement).getPropertyValue('--v-pad').trim()};});
     if(d==='compact'){
       await shot(p,'overview-compact-1280.png');
       await theme(p,'night');
       const n=await p.evaluate(()=>{const li=document.querySelector('ul.dv-list li.dv-row');return {row:li.getBoundingClientRect().height,pad:getComputedStyle(document.documentElement).getPropertyValue('--v-pad').trim(),theme:document.documentElement.dataset.theme};});
       ok(n.theme==='night'&&n.pad==='.3rem'&&Math.abs(n.row-sizes.compact.row)<1.5,'compact stays compact when the reader picks Night ('+JSON.stringify(n)+')');}
     ok(t.csp.length===0&&t.errs.length===0,d+': zero CSP violations and page errors');
     await t.ctx.close();}
   ok(sizes.compact.row<sizes.comfortable.row-3&&sizes.comfortable.row<sizes.roomy.row-3,'density: rows are visibly tighter compact than comfortable, and looser roomy ('+['compact','comfortable','roomy'].map(k=>k+' '+sizes[k].row.toFixed(1)).join(', ')+')');
   ok(sizes.compact.tile<sizes.comfortable.tile&&sizes.comfortable.tile<sizes.roomy.tile,'density: the big tile figure follows ('+['compact','comfortable','roomy'].map(k=>sizes[k].tile).join(', ')+')');}

  // 7 print: the control does not print, the rows do, and "N of M shown" prints when a filter is on
  {const t=await open(fixture,1280);const p=t.p;
   const bx=p.locator('.dv-box:has(.dv-ctl)').first();
   await bx.locator('.dv-ctl-btn').click();await bx.locator('.dv-q').fill('web');await p.waitForTimeout(100);
   await p.emulateMedia({media:'print'});
   const pr=await p.evaluate(()=>({btn:document.querySelector('.dv-ctl-btn').getClientRects().length?'shown':'none',bar:getComputedStyle(document.querySelector('.dv-bar')).display,live:getComputedStyle(document.querySelector('.dv-live')).display,txt:document.querySelector('.dv-live').textContent}));
   ok(pr.btn==='none'&&pr.bar==='none'&&pr.live!=='none'&&/of 10 shown/.test(pr.txt),'print: the button and bar are hidden, the "N of M shown" line stays ('+JSON.stringify(pr)+')');
   await t.ctx.close();}

  // 8 a nested list: native details, three levels, only the top rows at first
  const shots=async(p,n)=>shot(p,n);
  {const t=await open(fixture,1280);const p=t.p;await theme(p,'night');
   const tree=p.locator('.dv-box:has(.dv-tree)');
   const vis=()=>tree.locator('.dv-t:visible').allInnerTexts();
   ok(JSON.stringify(await vis())===JSON.stringify(['Whole house','Garden']),'the nested list shows only its two top-level rows at first ('+(await vis()).join(' | ')+')');
   ok(await tree.locator('details').count()===5&&await tree.locator('details[open]').count()===0,'five rows have children and all start closed');
   // a click on a summary opens it
   await tree.locator('summary').first().click();await p.waitForTimeout(150);
   ok(JSON.stringify(await vis())===JSON.stringify(['Whole house','Kitchen','Hall','Bathroom','Garden']),'clicking a summary opens it and shows its children ('+(await vis()).join(' | ')+')');
   // Enter on a focused summary opens another
   await tree.locator('summary:has-text("Kitchen")').focus();await p.keyboard.press('Enter');await p.waitForTimeout(150);
   ok((await vis()).includes('Re-grout the tiles')&&(await vis()).includes('Paint the cupboards'),'Enter on a focused summary opens it');
   await tree.locator('summary:has-text("Hall")').focus();await p.keyboard.press('Space');await p.waitForTimeout(150);
   ok((await vis()).includes('Sand the floor'),'Space on a focused summary opens it too');
   await shot(p,'nested-night-1280.png');
   // the twisty of a closed child does not turn when its parent opens
   const rot=await p.evaluate(()=>{const q=s=>getComputedStyle(document.querySelector(s),'::before').transform;
     const open=[...document.querySelectorAll('.dv-tree details')].map(d=>({id:d.getAttribute('data-id'),open:d.open,tf:getComputedStyle(d.querySelector(':scope>summary'),'::before').transform}));
     return open;});
   const closed=rot.filter(r=>!r.open),opened=rot.filter(r=>r.open);
   ok(closed.length>=1&&opened.length>=1&&new Set(closed.map(r=>r.tf)).size===1&&new Set(opened.map(r=>r.tf)).size===1&&closed[0].tf!==opened[0].tf,'a closed child keeps its twisty while its parent is open ('+JSON.stringify(rot.map(r=>r.id+':'+r.open+':'+r.tf.slice(0,24)))+')');
   // each level's value at the right edge of its row
   const edge=await p.evaluate(()=>[...document.querySelectorAll('.dv-tree .dv-row')].filter(r=>r.getBoundingClientRect().width>0).map(r=>{
     const v=r.querySelector(':scope>.dv-val');if(!v) return null;const a=r.getBoundingClientRect(),b=v.getBoundingClientRect();return Math.round(a.right-b.right);}).filter(x=>x!==null));
   ok(edge.length>=5&&edge.every(g=>g>=0&&g<=14),'at every level the value sits at the right edge of its row ('+edge.join()+')');
   // no nested-details styling of the page leaks in
   const lk=await p.evaluate(()=>{const d=document.querySelector('.dv-tree details'),cs=getComputedStyle(d),sm=getComputedStyle(d.querySelector(':scope>summary'));
     return {border:cs.borderTopWidth,margin:cs.marginTop,bg:cs.backgroundColor,pad:sm.paddingLeft,fw:sm.fontWeight};});
   ok(lk.border==='0px'&&lk.margin==='0px'&&lk.bg==='rgba(0, 0, 0, 0)'&&lk.pad==='1.6px'||lk.border==='0px'&&lk.margin==='0px'&&lk.bg==='rgba(0, 0, 0, 0)','the page\'s own details box does not leak into the tree ('+JSON.stringify(lk)+')');
   // the filter reveals a deep match with its ancestors
   await tree.locator('.dv-ctl-btn').click();
   await tree.locator('.dv-q').fill('fan');await p.waitForTimeout(150);
   ok(JSON.stringify(await vis())===JSON.stringify(['Whole house','Bathroom','Fit the fan']),'the filter reveals a deep match with its ancestors, opened ('+(await vis()).join(' | ')+')');
   ok(await tree.locator('.dv-live').innerText()==='1 of 15 shown','"N of M shown" counts the matching row ('+await tree.locator('.dv-live').innerText()+')');
   await tree.locator('.dv-q').fill('');await p.waitForTimeout(150);
   const back=await vis();
   ok(back.includes('Kitchen')&&back.includes('Re-grout the tiles')&&!back.includes('Seal the bath'),'clearing the filter gives back what the reader had open, and no more ('+back.join(' | ')+')');
   ok(await over(p)<=0,'no horizontal page overflow');
   ok(t.csp.length===0&&t.errs.length===0,'nested 1280: zero CSP violations and page errors '+t.csp.concat(t.errs).join('|'));
   await t.ctx.close();}
  {const t=await open(fixture,400);const p=t.p;await theme(p,'paper');
   const tree=p.locator('.dv-box:has(.dv-tree)');
   await tree.locator('details').evaluateAll(ds=>ds.forEach(d=>{d.open=true;}));await p.waitForTimeout(200);
   ok(await p.locator('.dv-tree .dv-t:visible').count()===15,'with every row open all fifteen show at 400px');
   const ov=await p.evaluate(()=>[document.documentElement.scrollWidth-document.documentElement.clientWidth,[...document.querySelectorAll('.dv-tree .dv-row')].every(r=>r.scrollWidth<=r.clientWidth+1)]);
   ok(ov[0]<=0&&ov[1],'no horizontal overflow at 400px three levels deep ('+ov.join()+')');
   await tree.scrollIntoViewIfNeeded();
   await tree.screenshot({path:path.join(OUT,'nested-paper-400.png')});
   ok(t.csp.length===0&&t.errs.length===0,'nested 400: zero CSP violations and page errors '+t.csp.concat(t.errs).join('|'));
   await t.ctx.close();}
  // print: closed rows print their children
  {const t=await open(fixture,1280);const p=t.p;await p.emulateMedia({media:'print'});
   const n=await p.evaluate(()=>[...document.querySelectorAll('.dv-tree .dv-t')].filter(e=>e.getBoundingClientRect().height>0).length);
   ok(n===15,'print: closed nodes still print their children ('+n+' of 15 rows laid out)');
   await t.ctx.close();}

  // 9 grouped lists: at most two cards across on a wide page
  {const t=await open(fixture,1280);const p=t.p;
   const xs=await p.evaluate(()=>new Set([...document.querySelectorAll('.dv-groups .dv-gcard')].map(c=>Math.round(c.getBoundingClientRect().left))).size);
   ok(xs<=2,'grouped list: at most two cards across at 1280px ('+xs+' columns)');
   await t.ctx.close();}

  // 10 a page's name is drawn once
  {const t=await open(path.join(R,'test/fixtures/pagename.booklet.md'),1280,false);const p=t.p;
   const c=async()=>({name:await p.locator('.ap-body :text-is("First page")').count(),title:await p.locator('.ap-body .ap-title').count()});
   const a=await c();
   ok(a.name===1&&a.title===0,'a page named by its first heading shows that name once ('+JSON.stringify(a)+')');
   await p.locator('.ap-item').nth(1).click();await p.waitForTimeout(300);
   ok(await p.locator('.ap-body .ap-title').allInnerTexts().then(x=>x.join()==='Page 2'),'a page with no heading keeps its fallback name line');
   ok(t.csp.length===0&&t.errs.length===0,'pages: zero CSP violations and page errors '+t.csp.concat(t.errs).join('|'));
   await t.ctx.close();}

  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
