// Browser check of the callouts (0.11.9): one callout of every kind, drawn in Paper and in Night, each in its kind's colour and
// picture. The border and the icon take the hue's vivid colour, the label its deep one, the ground its soft wash. Kinds of one hue
// look alike and kinds of different hues differ; a kind the renderer does not know is drawn as note; the labels are said in
// French; the page's style is teaching until a harness asks for briefing, and briefing changes the radius and no colour.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/callouts-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const KINDS=[["note","sky","pencil"],["abstract","petrol","clipboard-list"],["summary","petrol","clipboard-list"],["tldr","petrol","clipboard-list"],["info","sky","info"],
  ["todo","sky","circle-check"],["tip","sage","lightbulb"],["important","lilac","star"],["success","sage","check"],["check","sage","check"],["done","sage","check"],
  ["question","lilac","circle-help"],["help","lilac","circle-help"],["faq","lilac","circle-help"],["warning","sun","triangle-alert"],["caution","sun","triangle-alert"],
  ["attention","sun","triangle-alert"],["failure","rose","x"],["fail","rose","x"],["missing","rose","x"],["danger","rose","octagon-alert"],["error","rose","octagon-alert"],
  ["bug","rose","bug"],["example","lilac","flask-conical"],["quote","slate","quote"],["cite","slate","quote"],["diff","petrol","git-compare"],["law","slate","scale"],
  ["opinion","rose","message-circle"],["frobnicate","sky","pencil"]];
const FILE=`---
booklet: "0.16"
title: Callouts
lang: en
---

## Every kind

${KINDS.map(([k])=>`> [!${k}] A ${k} callout\n> Some words inside the ${k} callout.\n`).join('\n')}
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'callouts.booklet.md');fs.writeFileSync(file,FILE);
  const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1100,height:900}})).newPage();
  const cons=[],errs=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
  await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
  await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(400);}
  await p.locator('button.mode').first().click();await p.waitForTimeout(900);
  const read=()=>p.evaluate(()=>[...document.querySelectorAll('.rd-callout')].map(c=>{const cs=getComputedStyle(c),ci=c.querySelector('.rd-ci'),cl=c.querySelector('.rd-cl'),u=c.querySelector('.rd-ci use');
    return {kind:c.dataset.kind,hue:(c.className.match(/hue-(\w+)/)||[])[1],border:cs.borderLeftColor,bg:cs.backgroundColor,icon:ci?getComputedStyle(ci).color:null,
      label:cl?getComputedStyle(cl).color:null,labelText:cl?cl.textContent:null,href:u?u.getAttribute('href'):null,radius:cs.borderTopRightRadius,
      title:(c.querySelector('.rd-ctitle')||{}).textContent,unknownNote:!!c.querySelector('.rd-unknown')};}));
  const seen={};
  for(const theme of ['paper','night']){
    await p.evaluate(t=>window.bookletTheme.set(t),theme);await p.waitForTimeout(250);
    const rows=await read();seen[theme]=rows;
    ok(rows.length===KINDS.length,theme+': '+rows.length+' callouts drawn (expected '+KINDS.length+')');
    const byTitle=Object.fromEntries(rows.map(r=>[(r.title||'').replace(/^A (\S+) callout$/,'$1'),r]));
    ok(KINDS.every(([k,hue,ic])=>byTitle[k]&&byTitle[k].href==='#bi-'+ic),theme+': every kind draws its icon from the sprite '+KINDS.filter(([k,h,ic])=>!(byTitle[k]&&byTitle[k].href==='#bi-'+ic)).map(x=>x[0]).join());
    ok(KINDS.every(([k,hue])=>byTitle[k]&&byTitle[k].hue===hue),theme+': every kind takes its hue');
    // one colour per hue, a different one for each of the seven hues
    const hueBorder={};let consistent=true;
    for(const [k,hue] of KINDS){const r=byTitle[k];if(hueBorder[hue]&&hueBorder[hue]!==r.border)consistent=false;hueBorder[hue]=r.border;}
    ok(consistent,theme+': kinds of one hue share one border colour');
    ok(new Set(Object.values(hueBorder)).size===Object.keys(hueBorder).length&&Object.keys(hueBorder).length===7,theme+': the seven hues have seven different border colours '+JSON.stringify(hueBorder));
    ok(rows.every(r=>r.border===r.icon),theme+': the icon is drawn in the border\'s (vivid) colour');
    ok(new Set(rows.map(r=>r.label)).size===7&&(theme==='night'||rows.every(r=>r.label!==r.border)),theme+': the label is drawn in the hue\'s deep colour (Night\'s deep is its vivid)');
    const bgs={};KINDS.forEach(([k,hue])=>{bgs[hue]=byTitle[k].bg;});
    ok(new Set(Object.values(bgs)).size===7,theme+': each hue has its own wash');
    ok(byTitle.frobnicate.labelText==='Note'&&byTitle.frobnicate.border===byTitle.note.border,theme+': a kind it does not know is drawn as note is');
    ok(byTitle.tldr.labelText==='Summary'&&byTitle.faq.labelText==='Question'&&byTitle.done.labelText==='Success','an alias says its first name ('+byTitle.tldr.labelText+', '+byTitle.faq.labelText+', '+byTitle.done.labelText+')');
    ok(await p.evaluate(()=>getComputedStyle(document.querySelector('.rd-callout.rd-k-diff')).borderLeftStyle)==='dashed','diff keeps its dashed border');
  }
  ok(seen.paper.every((r,i)=>r.border!==seen.night[i].border&&r.bg!==seen.night[i].bg),'every callout is drawn in different colours in Paper and in Night');
  // style: teaching until asked, briefing changes the radius and no colour
  await p.evaluate(()=>window.bookletTheme.set('paper'));
  const t0=await read();
  ok(await p.evaluate(()=>document.documentElement.dataset.style)==='teaching','the page is drawn in the teaching style');
  await p.evaluate(()=>window.bookletStyle.set('briefing'));await p.waitForTimeout(200);
  const t1=await read();
  ok(await p.evaluate(()=>document.documentElement.dataset.style)==='briefing','briefing is set on data-style');
  ok(t0.every((r,i)=>r.border===t1[i].border&&r.bg===t1[i].bg&&r.icon===t1[i].icon&&r.label===t1[i].label),'briefing changes no callout colour');
  ok(t0[0].radius!==t1[0].radius,'briefing changes the radius ('+t0[0].radius+' to '+t1[0].radius+')');
  await p.evaluate(()=>window.bookletStyle.set('teaching'));
  // French: a booklet that declares fr is drawn in French, in a fresh page
  const frFile=path.join(OUT,'callouts-fr.booklet.md');fs.writeFileSync(frFile,FILE.replace('lang: en','lang: fr'));
  const p2=await (await b.newContext({viewport:{width:1100,height:900}})).newPage();
  await p2.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
  await p2.goto('https://bookletmd.test/app/');await p2.waitForTimeout(400);
  await p2.getByRole('button',{name:/Add a booklet from a file|Ajouter/}).first().click();await p2.waitForTimeout(300);
  await p2.locator('#fileIn').setInputFiles(frFile);await p2.waitForTimeout(500);
  await p2.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p2.waitForTimeout(900);
  if(await p2.evaluate(()=>document.body.dataset.view)!=='@home'){await p2.locator('#btnHome').click();await p2.waitForTimeout(400);}
  await p2.locator('button.mode').first().click();await p2.waitForTimeout(900);
  const fr=await p2.evaluate(()=>[...document.querySelectorAll('.rd-cl')].map(e=>e.textContent));
  ok(fr.includes('Astuce')&&fr.includes('Résumé')&&fr.includes('Échec'),'the labels are said in French ('+[...new Set(fr)].join(', ')+')');
  ok(cons.length===0&&errs.length===0,'zero CSP violations and page errors '+cons.concat(errs).join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
