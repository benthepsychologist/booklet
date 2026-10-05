// Browser checks for the themes and the wide layout, in headless Chromium with the hosted /app/ Content-Security-Policy applied.
// Not a *.test.js, so test/run.sh does not run it: it needs Playwright.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/themes-browser.js <booklet.html> <outdir>
// Checks: five choices set data-theme and change the computed colours; Auto follows dark and more-contrast emulation live;
// the choice survives a reload; a downloaded copy is byte-identical whatever the theme; no sideways overflow at 1280 and 400px;
// prose keeps a readable measure while a table uses the width; zero CSP violations and page errors.
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.',R=path.dirname(HTML);
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  async function open(file,width,opts={}){
    const ctx=await b.newContext({viewport:{width,height:900},acceptDownloads:true,...opts});const p=await ctx.newPage();
    const csp=[],errs=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',async r=>{const u=new URL(r.request().url()).pathname;
      if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
      r.fulfill({status:404,body:'nf'});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    return {p,ctx,csp,errs};}
  async function load(t,file){const p=t.p;
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(400);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    await p.locator('button.mode').first().click();await p.waitForTimeout(900);}
  const colours=p=>p.evaluate(()=>({bg:getComputedStyle(document.documentElement).backgroundColor,ink:getComputedStyle(document.documentElement).color,
    theme:document.documentElement.dataset.theme,choice:document.documentElement.dataset.themeChoice,meta:document.querySelector('meta[name=theme-color]').content}));
  const over=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const fixture=path.join(R,'test/fixtures/data-views.booklet.md'),figs=path.join(R,'test/fixtures/figures.booklet.md');
  // 1 the five choices
  {const t=await open(fixture,1280);const p=t.p;await load(t,fixture);
   const seen={};
   for(const c of ['paper','daylight','night','contrast','auto']){
     await p.selectOption('#themeSel',c);await p.waitForTimeout(150);seen[c]=await colours(p);
     ok(seen[c].choice===c,'choice '+c+' recorded ('+seen[c].choice+')');
     if(c!=='auto')ok(seen[c].theme===c,'data-theme is '+c);}
   ok(seen.paper.bg!==seen.night.bg&&seen.paper.ink!==seen.night.ink,'paper and night differ in background and ink');
   ok(new Set(['paper','daylight','night','contrast'].map(k=>seen[k].bg+'|'+seen[k].ink)).size===4,'all four themes have distinct background/ink pairs');
   ok(seen.night.meta!==seen.paper.meta,'theme-color follows the theme ('+seen.paper.meta+' -> '+seen.night.meta+')');
   ok(await p.evaluate(()=>document.getElementById('themeSel').getAttribute('aria-label'))==='Colour theme','the menu is labelled');
   // layout at 1280
   await p.selectOption('#themeSel','paper');
   ok(await over(p)<=0,'no sideways overflow at 1280px');
   const m=await p.evaluate(()=>{const para=[...document.querySelectorAll('.md>p,.md p')].find(x=>x.textContent.length>60);
     const tb=document.querySelector('.md-table');
     const ch=el=>{const s=document.createElement('span');s.style.cssText='position:absolute;visibility:hidden;width:100ch';el.append(s);const w=s.getBoundingClientRect().width/100;s.remove();return w;};
     return {pw:para?para.getBoundingClientRect().width/ch(para):null,tw:tb?tb.getBoundingClientRect().width:null,pp:para?para.getBoundingClientRect().width:null};});
   console.log(JSON.stringify(m));
   if(m.pw!=null)ok(m.pw<=75,'a paragraph is at most ~75ch wide ('+m.pw.toFixed(1)+'ch)');
   if(m.tw!=null)ok(m.tw>m.pp,'a table is wider than a paragraph ('+Math.round(m.tw)+'px v '+Math.round(m.pp)+'px)');
   // download identical
   async function dl(){const [d]=await Promise.all([p.waitForEvent('download'),(async()=>{await p.locator('#btnExport').click();await p.waitForTimeout(300);
     await p.locator('#exportPanel button').first().click();})()]);const f=await d.path();return fs.readFileSync(f);}
   const a=await dl();await p.keyboard.press('Escape').catch(()=>{});await p.evaluate(()=>document.querySelectorAll('.veil[open]').forEach(v=>v.removeAttribute('open')));
   await p.selectOption('#themeSel','night');
   const c=await dl();
   ok(a.length>0&&Buffer.compare(a,c)===0,'a downloaded file is byte-identical in paper and night ('+a.length+' bytes)');
   // survives reload
   await p.evaluate(()=>document.querySelectorAll('.veil[open]').forEach(v=>v.removeAttribute('open')));
   await p.selectOption('#themeSel','contrast');await p.reload();await p.waitForTimeout(500);
   ok((await colours(p)).theme==='contrast','the choice survives a reload');
   ok(t.csp.length===0,'1280: zero CSP violations '+t.csp.join('|'));ok(t.errs.length===0,'1280: zero page errors '+t.errs.join('|'));
   await t.ctx.close();}
  // 2 phone
  for(const f of [fixture,figs]){const t=await open(f,400);await load(t,f);
    for(const c of ['paper','night']){await t.p.selectOption('#themeSel',c);await t.p.waitForTimeout(300);ok(await over(t.p)<=0,path.basename(f)+' '+c+': no sideways overflow at 400px');}
    ok(t.errs.length===0,'400: zero page errors '+t.errs.join('|'));await t.ctx.close();}
  // 3 figures fixture at 1280, diagrams re-drawn on a theme change
  {const t=await open(figs,1280);const p=t.p;await load(t,figs);await p.getByText('Diagrams and formulas').first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(2500);
   const fill=()=>p.evaluate(()=>{const n=document.querySelector('.mfig svg');return n?n.outerHTML.length+':'+(n.outerHTML.match(/#[0-9a-f]{6}|rgb\([^)]*\)/gi)||[]).slice(0,8).join(','):null;});
   await p.selectOption('#themeSel','paper');await p.waitForTimeout(1500);const a=await fill();
   await p.selectOption('#themeSel','night');await p.waitForTimeout(2000);const n=await fill();
   ok(a&&n&&a!==n,'a drawn diagram is re-drawn when the theme changes');
   ok(await over(p)<=0,'figures: no sideways overflow at 1280px');
   ok(t.csp.length===0,'figures: zero CSP violations '+t.csp.join('|'));ok(t.errs.length===0,'figures: zero page errors '+t.errs.join('|'));
   await t.ctx.close();}
  // 4 Auto follows the device
  {const t=await open(fixture,900,{colorScheme:'dark'});
   ok((await colours(t.p)).theme==='night','Auto + dark scheme is Night');
   await t.p.emulateMedia({colorScheme:'light'});await t.p.waitForTimeout(200);ok((await colours(t.p)).theme==='paper','Auto follows a switch to light, live');
   await t.p.emulateMedia({contrast:'more'}).catch(()=>{});await t.p.waitForTimeout(200);
   const c=(await colours(t.p)).theme;ok(c==='contrast','Auto + more-contrast is Contrast ('+c+')');
   ok(t.csp.length===0&&t.errs.length===0,'auto: zero CSP violations and page errors');await t.ctx.close();}
  {const t=await open(fixture,900,{forcedColors:'active'});const c=(await colours(t.p)).theme;ok(c==='contrast','Auto + forced colors is Contrast ('+c+')');
   ok(t.errs.length===0,'forced colors: no page errors');await t.ctx.close();}
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
