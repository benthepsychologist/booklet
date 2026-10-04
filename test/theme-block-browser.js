// Browser checks for format 0.5 (a booklet's theme block, rows, tone-named widget colours), in headless Chromium with the
// hosted /app/ Content-Security-Policy applied (served from a fake origin through page.route). Not a *.test.js, so
// test/run.sh does not run it: it needs Playwright.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/theme-block-browser.js <booklet.html> <outdir>
// Checks: the fixture's own look is applied in Auto and differs from Paper; an explicit Night overrides it and leaves no custom
// token behind; Auto brings it back; going back to Your booklets restores the reader's own theme; print is light whatever the
// booklet asked for; rows sit side by side at 1280px and stack at 400px with no sideways overflow; a question in a cell is
// answered and the answer survives a reload; the tone-named grid cells are light in Paper and dark in Night; zero CSP
// violations and page errors. Screenshots at 1280px (Auto/custom, Night) and 400px.
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.',R=path.dirname(HTML);
const CSP="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  async function open(file,width,opts={}){
    const ctx=await b.newContext({viewport:{width,height:1000},...opts});const p=await ctx.newPage();
    const csp=[],errs=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',async r=>{const u=new URL(r.request().url()).pathname;
      if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
      r.fulfill({status:404,body:'nf'});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    return {p,ctx,csp,errs};}
  const openAct=async p=>{await p.locator('button.mode').first().click();await p.waitForTimeout(900);};
  const look=p=>p.evaluate(()=>{const de=document.documentElement,cs=getComputedStyle(de);
    return {theme:de.dataset.theme,choice:de.dataset.themeChoice,custom:de.hasAttribute('data-theme-custom'),
      bg:cs.backgroundColor,ink:cs.color,accent:cs.getPropertyValue('--accent').trim(),inline:[...de.style].filter(n=>n!=='--ap-top').length,
      font:getComputedStyle(document.querySelector('.md')||document.body).fontFamily,meta:document.querySelector('meta[name=theme-color]').content};});
  const over=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const lum=css=>{const m=css.match(/\d+(\.\d+)?/g).map(Number);const [r,g,bl]=m.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*bl;};
  const rects=(p,sel)=>p.evaluate(s=>[...document.querySelectorAll(s)].map(e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};}),sel);
  const fixture=path.join(R,'test/fixtures/theme-and-rows.booklet.md');
  const shot=async(p,name)=>{await p.screenshot({path:path.join(OUT,name),fullPage:true});};

  // 1 at 1280: the look, the override, the way back
  {const t=await open(fixture,1280);const p=t.p;
   const first=await look(p);
   ok(first.custom&&first.theme==='daylight','a loaded booklet opens at its home with its own look in Auto ('+first.theme+')');
   await openAct(p);
   const a=await look(p);
   ok(a.custom&&a.choice==='auto'&&a.theme==='daylight','Auto + the booklet\'s theme: its base (daylight) is in force, custom flagged ('+JSON.stringify(a)+')');
   ok(a.accent==='#7a1f5c','the booklet\'s accent is the computed one ('+a.accent+')');
   ok(a.bg==='rgb(238, 243, 248)','the page background is the booklet\'s paper ('+a.bg+')');
   const paper=await p.evaluate(()=>{const s=document.createElement('div');return null;});
   ok(/serif|Georgia|Lora/i.test(a.font),'its serif font is used for prose ('+a.font+')');
   ok(a.meta.toLowerCase()==='#eef3f8','theme-color follows the booklet\'s paper ('+a.meta+')');
   await shot(p,'1280-auto-custom.png');
   // a custom look is visibly different from Paper
   await p.selectOption('#themeSel','paper');await p.waitForTimeout(200);
   const pp=await look(p);
   ok(pp.theme==='paper'&&!pp.custom&&pp.inline===7&&pp.bg!==a.bg&&pp.accent!==a.accent,'an explicit Paper replaces its colours and differs; only its font and density (7 properties) stay ('+pp.bg+' v '+a.bg+', inline '+pp.inline+')');
   await p.selectOption('#themeSel','night');await p.waitForTimeout(300);
   const n=await look(p);
   ok(n.theme==='night'&&!n.custom&&n.inline===7&&n.accent==='#7CC4C9','an explicit Night replaces its colours and no colour token is left on the page; its font and density stay ('+JSON.stringify(n)+')');
   // tone-named cells in Night are dark; in Paper, light
   const q=async()=>p.evaluate(()=>[...document.querySelectorAll('.q.toned')].map(e=>getComputedStyle(e).backgroundColor));
   const nq=await q();
   ok(nq.length===4&&nq.every(c=>lum(c)<.08),'in Night the four tone-named cells are dark ('+nq.join(' ')+')');
   const nink=await p.evaluate(()=>[...document.querySelectorAll('.q.toned')].map(e=>getComputedStyle(e).color));
   ok(nink.every(c=>lum(c)>.3),'with the theme\'s light ink on them ('+nink.join(' ')+')');
   await p.evaluate(()=>window.scrollTo(0,0));
   await shot(p,'1280-night.png');
   await p.selectOption('#themeSel','auto');await p.waitForTimeout(300);
   const back=await look(p);
   ok(back.custom&&back.theme==='daylight'&&back.accent==='#7a1f5c','back to Auto the booklet\'s look returns');
   const aq=await q();
   ok(aq.length===4&&aq.every(c=>lum(c)>.5),'in the custom (light) look the four cells are light tints ('+aq.join(' ')+')');
   // print is light
   await p.emulateMedia({media:'print'});await p.waitForTimeout(200);
   const pr=await p.evaluate(()=>({paper:getComputedStyle(document.documentElement).getPropertyValue('--paper').trim().toLowerCase(),acc:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase()}));
   ok(pr.paper==='#ffffff'&&pr.acc==='#103e46','printing uses the Daylight tokens whatever the booklet asked for ('+JSON.stringify(pr)+')');
   await p.emulateMedia({media:'screen'});
   // rows side by side at 1280
   const r1=await rects(p,'.pblock.row:nth-of-type(1) .rowcell');
   const rows=await p.evaluate(()=>[...document.querySelectorAll('.pblock.row')].map(r=>[...r.querySelectorAll(':scope>.rowcell')].map(c=>{const b=c.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width)};})));
   ok(rows.length===2,'two rows are drawn ('+rows.length+')');
   ok(rows[0].length===2&&rows[0][0].y===rows[0][1].y&&rows[0][1].x>rows[0][0].x+200,'row 1 (two tables): side by side at 1280px ('+JSON.stringify(rows[0])+')');
   ok(rows[1].length===3&&new Set(rows[1].map(c=>c.y)).size===1,'row 2 (three cells): side by side at 1280px ('+JSON.stringify(rows[1])+')');
   ok(rows[1].every(c=>c.w>=250),'each cell is wide enough to read ('+rows[1].map(c=>c.w).join(',')+'px)');
   ok(await over(p)<=0,'no sideways overflow at 1280px');
   const tbl=await p.evaluate(()=>[...document.querySelectorAll('.pblock.row .md-table')].map(t=>t.getBoundingClientRect().width<=t.parentElement.getBoundingClientRect().width+1));
   ok(tbl.length===2&&tbl.every(Boolean),'each table fits its cell');
   // a question in a cell: answer it, reload, it is still there
   await p.locator('.pblock.row .pill-btn').filter({hasText:'Thriving'}).click();
   await p.locator('.pblock.row textarea').first().fill('Cut the kale back');await p.waitForTimeout(300);
   await p.reload();await p.waitForTimeout(500);
   await p.locator('button').filter({hasText:/A garden week/}).first().click().catch(()=>{});await p.waitForTimeout(500);
   if(!(await p.locator('button.mode').count()===0)) await openAct(p);
   const kept=await p.evaluate(()=>({pressed:[...document.querySelectorAll('.pblock.row .pill-btn[aria-pressed="true"]')].map(x=>x.textContent),text:(document.querySelector('.pblock.row textarea')||{}).value}));
   ok(kept.pressed.join()==='Thriving'&&kept.text==='Cut the kale back','a question in a cell keeps its answer through a reload ('+JSON.stringify(kept)+')');
   // the way back: Your booklets uses the reader's own theme
   await p.getByRole('button',{name:/^← /}).first().click().catch(()=>{});await p.waitForTimeout(300);
   await p.getByRole('button',{name:/Your booklets/}).first().click().catch(()=>{});await p.waitForTimeout(500);
   const l2=await look(p);
   ok(!l2.custom&&l2.theme==='paper'&&l2.inline===0,'back on Your booklets the reader\'s theme is restored and nothing custom is left ('+JSON.stringify(l2)+')');
   ok(t.csp.length===0,'1280: zero CSP violations '+t.csp.join('|'));ok(t.errs.length===0,'1280: zero page errors '+t.errs.join('|'));
   await t.ctx.close();}

  // 2 at 400: stacked, no sideways overflow
  {const t=await open(fixture,400);const p=t.p;await openAct(p);
   const rows=await p.evaluate(()=>[...document.querySelectorAll('.pblock.row')].map(r=>[...r.querySelectorAll(':scope>.rowcell')].map(c=>{const b=c.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width)};})));
   ok(rows.length===2&&rows.every(r=>new Set(r.map(c=>c.x)).size===1&&new Set(r.map(c=>c.y)).size===r.length),'at 400px every row is one column, cells one under another in file order ('+JSON.stringify(rows)+')');
   ok(rows.every(r=>r.every((c,i)=>i===0||c.y>r[i-1].y)),'in file order');
   ok(await over(p)<=0,'no sideways overflow at 400px (custom look)');
   await shot(p,'400-auto-custom.png');
   await p.selectOption('#themeSel','night');await p.waitForTimeout(300);
   ok(await over(p)<=0,'no sideways overflow at 400px (Night)');
   await shot(p,'400-night.png');
   ok(t.csp.length===0&&t.errs.length===0,'400: zero CSP violations and page errors '+t.csp.concat(t.errs).join('|'));
   await t.ctx.close();}

  // 3 at 800 (between): rows adapt, no overflow
  {const t=await open(fixture,800);const p=t.p;await openAct(p);
   ok(await over(p)<=0,'no sideways overflow at 800px');
   ok(t.csp.length===0&&t.errs.length===0,'800: zero CSP violations and page errors');await t.ctx.close();}

  // 4 the device's dark scheme does not override a booklet's look in Auto, an explicit pick still wins
  {const t=await open(fixture,1100,{colorScheme:'dark'});const p=t.p;await openAct(p);
   const a=await look(p);
   ok(a.theme==='daylight'&&a.custom,'Auto + a booklet look + a dark device: the booklet\'s look wins over the device\'s ('+a.theme+')');
   await p.selectOption('#themeSel','paper');await p.waitForTimeout(200);
   ok((await look(p)).theme==='paper','an explicit pick wins over the booklet');
   ok(t.csp.length===0&&t.errs.length===0,'dark device: zero CSP violations and page errors');await t.ctx.close();}

  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
