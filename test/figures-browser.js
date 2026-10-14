// Browser checks for mermaid diagrams and math, in headless Chromium with the hosted /app/ Content-Security-Policy applied
// (served from a fake origin through page.route). Not a *.test.js, so test/run.sh does not run it: it needs Playwright.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/figures-browser.js <booklet.html> <outdir>
// Checks: the tides formula draws as MathML; a figure placed by ![[#^id]] and one written in the prose draw as SVG; a broken
// diagram shows its source with a note; a booklet with neither never runs mermaid or Temml; zero CSP violations, zero page errors.
// 0.13.1 (item 11): the renderer is a core and its parts. When parts/mermaid.js is beside the renderer under test, the page asks
// for it, once, only for a booklet with a diagram (tides, a formula only, and a booklet with neither make no request for it); when
// the part is missing the diagram shows its source with the part note, redraws in that open (a language switch) ask no more, and
// the next open asks again and draws. When the renderer
// under test is the one-file build (no parts/ beside it) it asks for no part at all and draws the same.
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.',R=path.join(__dirname,'..');
const CSP=require('./csp.js'),PARTS=require('./parts.js');
const HAS_PART=PARTS.has(HTML,'mermaid');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
(async()=>{
  const b=await chromium.launch();
  // library page: load the file through the page's own file input (the veil may need opening)
  async function load(file,name,opts){
    opts=opts||{};
    const ctx=await b.newContext({viewport:{width:900,height:1300}});const p=await ctx.newPage();
    const csp=[],errs=[],parts=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    const state={partUp:!opts.partDown};
    /* opts.hold: the part's answer waits until the test calls state.release() (a slow host, without guessing how slow) */
    if(opts.hold) state.held=new Promise(go=>{state.release=go;});
    await p.route('https://bookletmd.test/**',async r=>{const u=new URL(r.request().url()).pathname;
      if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
      if(PARTS.nameAt(u,'/app/')){parts.push(u);if(state.held) await state.held;
        const s=state.partUp&&PARTS.serve(HTML,u,'/app/');if(s)return r.fulfill(s);}
      r.fulfill({status:404,body:'nf'});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(500);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button, dialog[open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(1000);if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(400);}
    return {p,csp,errs,name,parts,state};}
  const libs=async p=>p.evaluate(()=>({mermaid:typeof __esbuild_esm_mermaid_nm,temml:typeof temml}));
  async function enter(p,act){await p.locator('button.mode').first().click();await p.waitForTimeout(1000);
    if(act){await p.getByText(act).first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(1200);}}
  // 1 tides
  {const t=await load(path.join(R,'examples/how-tides-work.booklet.md'),'tides');await enter(t.p,'Why the sea rises twice a day');await t.p.waitForTimeout(800);
   const info=await t.p.evaluate(()=>({math:document.querySelectorAll('math').length,raw:/h_\{high\}/.test(document.body.innerText),txt:document.body.innerText.slice(0,300)}));
   console.log(JSON.stringify(info));
   ok(info.math>=1,'tides: formula draws as MathML ('+info.math+' math elements)');ok(!info.raw,'tides: no raw h_{high} left');
   const l=await libs(t.p);ok(l.temml==='object'||l.temml==='function','tides: Temml awake');ok(l.mermaid==='undefined','tides: mermaid never ran');
   ok(t.parts.length===0,'tides: a formula alone asks for no part ('+t.parts.join(',')+')');
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
   ok(t.parts.join()===(HAS_PART?'/app/parts/mermaid.js':''),'figures: the diagram library is asked for once, at the renderer\'s own address, and only if it is not inside the file ('+t.parts.join(',')+')');
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
   ok(t.parts.length===0,'neither: no request for any part at all ('+t.parts.join(',')+')');
   ok(t.csp.length===0,'neither: zero CSP violations');ok(t.errs.length===0,'neither: zero page errors '+t.errs.join('|'));}
  // 4 the part is missing (a host that did not serve parts/, or the network dropped): the source and a note, asked for once per open (not on every redraw), asked again on the next open
  if(HAS_PART){
   const t=await load(path.join(R,'test/fixtures/figures.booklet.md'),'figures-nopart',{partDown:true});await enter(t.p,'Diagrams and formulas');await t.p.waitForTimeout(2500);
   const shape=()=>t.p.evaluate(()=>({svgs:document.querySelectorAll('.mfig svg').length,bad:[...document.querySelectorAll('.mfig.bad')].map(x=>x.innerText),
     wait:[...document.querySelectorAll('.mfig-note')].filter(n=>/Drawing this diagram/.test(n.textContent)).length,mermaid:typeof __esbuild_esm_mermaid_nm}));
   const down=await shape();
   ok(down.svgs===0&&down.bad.length===3,'part missing: all three diagrams show their source ('+down.bad.length+' shown, '+down.svgs+' drawn)');
   ok(down.bad.filter(x=>/part that draws diagrams could not be loaded/.test(x)).length===3,'part missing: and each says the part could not be loaded (the broken diagram too, since the library was never reached)');
   ok(down.wait===0&&down.mermaid==='undefined','part missing: no diagram is left on "Drawing this diagram" ('+down.wait+')');
   ok(t.parts.join()==='/app/parts/mermaid.js','part missing: during that open the one part was asked for exactly once, at the renderer\'s own address ('+t.parts.join(',')+')');
   const first=t.parts.length;
   await t.p.screenshot({path:path.join(OUT,'figures-nopart.png'),fullPage:true});
   /* redraws within the same open (a language switch draws the screen again, as render() does after any change): the part that
      failed is not asked for again, and the note is drawn in the language now in force */
   const notes=()=>t.p.evaluate(()=>[...document.querySelectorAll('.mfig.bad .mfig-note')].map(n=>n.textContent));
   const press=async l=>{await t.p.locator('.lang button[data-lang="'+l+'"]').click();await t.p.waitForTimeout(800);};
   await press('fr');const nFr=await notes();
   await press('es');const nEs=await notes();
   await press('en');const nEn=await notes();
   ok(nFr.length===3&&nFr.every(x=>/dessine les diagrammes n’a pas pu être chargé/.test(x))&&nEs.length===3&&nEs.every(x=>/No se pudo cargar la parte que dibuja los diagramas/.test(x))&&nEn.length===3&&nEn.every(x=>/part that draws diagrams could not be loaded/.test(x)),
     'part missing: drawn again in French, Spanish and English, each diagram keeps its part note, in that language ('+[nFr[0],nEs[0],nEn[0]].join(' | ')+')');
   ok(t.parts.length===first,'part missing: those three redraws in the same open asked for the part no more ('+first+' then '+t.parts.length+' requests)');
   /* the host serves the part now; the booklet is closed to "Your booklets" and opened again (a real next open): it asks again */
   t.state.partUp=true;
   for(let i=0;i<4&&!await t.p.getByRole('button',{name:'Add a booklet from a file'}).count();i++){await t.p.locator('#btnHome').click();await t.p.waitForTimeout(400);}
   await t.p.locator('button.k').first().click();await t.p.waitForTimeout(700);
   /* a booklet of one activity opens straight into it */
   await t.p.waitForTimeout(2500);
   const up=await shape();
   ok(t.parts.length===first+1,'part back: the next open asked for the part again, once ('+first+' then '+t.parts.length+' requests)');
   ok(up.svgs===2&&up.bad.length===1,'part back: both diagrams draw this time; only the broken one shows its source ('+up.svgs+' drawn, '+up.bad.length+' source)');
   ok(t.csp.length===0,'part missing then back: zero CSP violations '+t.csp.join('|'));ok(t.errs.length===0,'part missing then back: zero page errors '+t.errs.join('|'));}
  // 5 a slow part: the host holds its answer while the page is drawn again four times. When the part arrives only the diagrams still
  //   on the page are drawn (one drawing each; MM_SEQ counts every mermaid render), not every box the redraws left behind
  if(HAS_PART){
   const t=await load(path.join(R,'test/fixtures/figures.booklet.md'),'figures-slowpart',{hold:true});await enter(t.p,'Diagrams and formulas');
   const press=async l=>{await t.p.locator('.lang button[data-lang="'+l+'"]').click();await t.p.waitForTimeout(300);};
   for(const l of ['fr','es','fr','en']) await press(l);
   const early=await t.p.evaluate(()=>({svgs:document.querySelectorAll('.mfig svg').length,renders:MM_SEQ}));
   ok(early.svgs===0&&early.renders===0&&t.parts.length===1,'slow part: drawn again four times while the part is on its way, nothing is rendered yet and it was asked for once ('+JSON.stringify(early)+', '+t.parts.length+' requests)');
   t.state.release();await t.p.waitForTimeout(3000);
   const late=await t.p.evaluate(()=>({svgs:document.querySelectorAll('.mfig svg').length,bad:document.querySelectorAll('.mfig.bad').length,renders:MM_SEQ,boxes:MM_BOXES.length}));
   ok(late.svgs===2&&late.bad===1,'slow part: when it arrives the diagrams on the page draw, and the broken one shows its source ('+late.svgs+' drawn, '+late.bad+' source)');
   ok(late.renders===3&&late.boxes===3,'slow part: three renders for the three diagrams on the page, none for the boxes the redraws replaced ('+late.renders+' renders, '+late.boxes+' boxes kept)');
   ok(t.parts.length===1,'slow part: asked for once in all ('+t.parts.length+')');
   ok(t.csp.length===0&&t.errs.length===0,'slow part: zero CSP violations and page errors '+t.csp.concat(t.errs).join('|'));}
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
