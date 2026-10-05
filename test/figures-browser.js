// Browser checks for mermaid diagrams and math, in headless Chromium with the hosted /app/ Content-Security-Policy applied
// (served from a fake origin through page.route). Not a *.test.js, so test/run.sh does not run it: it needs Playwright.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/figures-browser.js <booklet.html> <outdir>
// Checks: the tides formula draws as MathML; a figure placed by ![[#^id]] and one written in the prose draw as SVG; a broken
// diagram shows its source with a note; a booklet with neither never runs mermaid or Temml; zero CSP violations, zero page errors.
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.',R=path.dirname(HTML);
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
(async()=>{
  const b=await chromium.launch();
  // library page: load the file through the page's own file input (the veil may need opening)
  async function load(file,name){
    const ctx=await b.newContext({viewport:{width:900,height:1300}});const p=await ctx.newPage();
    const csp=[],errs=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',async r=>{const u=new URL(r.request().url()).pathname;
      if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
      r.fulfill({status:404,body:'nf'});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(500);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button, dialog[open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(1000);
    return {p,csp,errs,name};}
  const libs=async p=>p.evaluate(()=>({mermaid:typeof __esbuild_esm_mermaid_nm,temml:typeof temml}));
  async function enter(p,act){await p.locator('button.mode').first().click();await p.waitForTimeout(1000);
    if(act){await p.getByText(act).first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(1200);}}
  // 1 tides
  {const t=await load(path.join(R,'examples/how-tides-work.booklet.md'),'tides');await enter(t.p,'Why the sea rises twice a day');await t.p.waitForTimeout(800);
   const info=await t.p.evaluate(()=>({math:document.querySelectorAll('math').length,raw:/h_\{high\}/.test(document.body.innerText),txt:document.body.innerText.slice(0,300)}));
   console.log(JSON.stringify(info));
   ok(info.math>=1,'tides: formula draws as MathML ('+info.math+' math elements)');ok(!info.raw,'tides: no raw h_{high} left');
   const l=await libs(t.p);ok(l.temml==='object'||l.temml==='function','tides: Temml awake');ok(l.mermaid==='undefined','tides: mermaid never ran');
   ok(t.csp.length===0,'tides: zero CSP violations '+t.csp.join('|'));ok(t.errs.length===0,'tides: zero page errors '+t.errs.join('|'));
   await t.p.screenshot({path:path.join(OUT,'tides.png'),fullPage:true});}
  // 2 figures
  {const t=await load(path.join(R,'test/fixtures/figures.booklet.md'),'figures');await enter(t.p,'Diagrams and formulas');await t.p.waitForTimeout(2500);
   const info=await t.p.evaluate(()=>({svgs:[...document.querySelectorAll('.mfig svg')].length,figs:document.querySelectorAll('.mfig').length,bad:[...document.querySelectorAll('.mfig.bad')].map(x=>x.innerText),
     embedText:/!\[\[#\^/.test(document.body.innerText),math:document.querySelectorAll('math').length,raw:[...document.querySelectorAll('.math.raw')].map(x=>x.textContent),
     fo:document.querySelectorAll('.mfig foreignObject').length,scripts:document.querySelectorAll('.mfig script').length,
     snippet:/print\("hello"\)/.test(document.body.innerText),body:document.body.innerText}));
   console.log(JSON.stringify({...info,body:undefined}));console.log(info.body);
   ok(info.svgs===2,'figures: embedded and prose diagrams both draw as SVG ('+info.svgs+')');
   ok(!info.embedText,'figures: no ![[#^ text left');
   ok(info.bad.length===1&&/could not be drawn/.test(info.bad[0])&&/A -->/.test(info.bad[0]),'figures: broken diagram shows its source with the note');
   ok(info.snippet,'figures: a non-mermaid fence shows as code');
   ok(info.fo===0&&info.scripts===0,'figures: no foreignObject or script in drawn SVG');
   ok(info.math>=2,'figures: math drawn ('+info.math+')');ok(info.raw.length>=1,'figures: unreadable formula falls back to TeX: '+JSON.stringify(info.raw));
   ok(/\$5 and \$10/.test(info.body)&&/literal \$ sign/.test(info.body),'figures: prices and \\$ stay literal');
   ok(t.csp.length===0,'figures: zero CSP violations '+t.csp.join('|'));ok(t.errs.length===0,'figures: zero page errors '+t.errs.join('|'));
   await t.p.screenshot({path:path.join(OUT,'figures.png'),fullPage:true});
   await t.p.emulateMedia({media:'print'});await t.p.pdf({path:path.join(OUT,'figures.pdf')}).catch(e=>console.log('pdf',e.message));}
  // 3 neither
  {const t=await load(path.join(R,'examples/mindful-check-in.booklet.md'),'mindful');await enter(t.p);await t.p.waitForTimeout(800);
   const l=await libs(t.p);ok(l.mermaid==='undefined'&&l.temml==='undefined','neither: mermaid and temml never executed '+JSON.stringify(l));
   ok(t.csp.length===0,'neither: zero CSP violations');ok(t.errs.length===0,'neither: zero page errors '+t.errs.join('|'));}
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
