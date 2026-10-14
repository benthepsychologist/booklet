// Browser check for the library wake bug (found by the diagram study, 2026-10-13). A booklet opened by a link (#/open/<name>) can be
// drawn before the whole renderer file has arrived. useLib() then used to copy part of mermaid or Temml into a script, the page's own
// policy refused that script (its hash is of the whole text), and the failure was remembered: every formula and diagram on the page
// failed until a reload. The tests that hand the page to Chromium whole never see it, so this one serves the page slowly, in chunks
// with a pause between them (the renderer's own script first, the two libraries at the end of the file after it), and opens by link a
// booklet that holds a formula and a diagram. Checks: while the file is still arriving no library is woken, and a diagram shows a quiet placeholder (not "could not be drawn"); once it has arrived the formula is drawn as MathML and
// the diagram as SVG; no page error. A second run serves a page whose Temml block has been tampered with (the policy refuses it, a
// real failure): once the page has arrived the failed wake is remembered, so three formulas make one attempt, not three.
// 0.13.1 (item 11): in the core, mermaid is the part parts/mermaid.js, served beside the page. Checks added for it: while the file is
// still arriving the part is not asked for either, and once it has arrived the diagram draws from the part (one request). Served
// the one-file build, both libraries sit at the end of the file as before and no part is asked for.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/libwake-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),http=require('http');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const PARTS=require('./parts.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const BOOK=`---
booklet: "0.13"
title: Waking
lang: en
---

> [!module|wk] Waking

> [!activity|a] Both

A formula $\\frac{2}{3}$ and again $\\frac{1}{2}$ and $\\frac{1}{3}$ and a diagram:

![[#^flow]]

> [!module|wk end] End

> [!data] Data

\`\`\`mermaid
graph LR; New --> Spring --> Neap
\`\`\`
^flow
`;
async function run(tamper){
  fs.mkdirSync(OUT,{recursive:true});
  let html=fs.readFileSync(HTML,'utf8');
  if(tamper) html=html.replace('<script type="text/plain" id="lib-temml">','<script type="text/plain" id="lib-temml">/*tampered*/');
  /* the tail is what follows the renderer's script: the notices and any library block (Temml in the core; mermaid and Temml in the build) */
  const cut=Math.min(...['<!-- PART: ','<!-- LIBRARY: '].map(s=>html.indexOf(s)).filter(i=>i>=0));
  if(!isFinite(cut)) throw new Error('the library blocks are no longer found where this test expects them');
  const head=html.slice(0,cut),tail=html.slice(cut);
  const CHUNKS=8,size=Math.ceil(tail.length/CHUNKS);
  let server;const partReqs=[];let arrived=false;
  const origin=await new Promise(res=>{server=http.createServer(async(req,rsp)=>{
    const u=new URL(req.url,'http://x').pathname;
    if(u==='/app/'){
      rsp.writeHead(200,{'content-type':'text/html; charset=utf-8'});
      rsp.write(head.replace('<meta name="theme-color"','<meta name="booklet-store" content="'+origin+'/pub/">\n<meta name="theme-color"'));
      for(let i=0;i<CHUNKS;i++){await new Promise(r=>setTimeout(r,250));rsp.write(tail.slice(i*size,(i+1)*size));}
      arrived=true;rsp.end();return;}
    if(PARTS.nameAt(u,'/app/')){partReqs.push({u,arrived});const s=PARTS.serve(HTML,u,'/app/');
      if(s){rsp.writeHead(s.status,s.headers);rsp.end(s.body);return;}}
    if(u==='/pub/wake.booklet.md'){rsp.writeHead(200,{'content-type':'text/markdown; charset=utf-8'});rsp.end(BOOK);return;}
    rsp.writeHead(404);rsp.end('nf');});
    server.listen(0,'127.0.0.1',()=>res('http://127.0.0.1:'+server.address().port));});
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:1100,height:900}})).newPage();
  const viol=[],errs=[];
  p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))viol.push(m.text());});
  p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});});
  await p.goto(origin+'/app/#/open/wake.booklet.md',{waitUntil:'commit'});
  /* the booklet is drawn while the file is still arriving: wait for its words, and look at the page then */
  await p.waitForFunction(()=>/Both|A formula/.test((document.getElementById('main')||{}).textContent||''),null,{timeout:10000});
  const midNote=await p.evaluate(()=>[...document.querySelectorAll('#main .mfig-note')].map(n=>n.textContent).join('|'));
  ok(!/could not be drawn/.test(midNote),'while the page is arriving a diagram shows no "could not be drawn" ('+midNote+')');
  const mid=await p.evaluate(()=>({state:document.readyState,mermaid:typeof __esbuild_esm_mermaid_nm,temml:typeof temml}));
  ok(mid.state==='loading','the booklet was drawn while the page was still arriving ('+mid.state+'): the test reaches the case it is for');
  ok(mid.mermaid==='undefined'&&mid.temml==='undefined','and no library was woken from part of its text ('+JSON.stringify(mid)+')');
  ok(partReqs.length===0,'while the file is still arriving the diagram part is not asked for either ('+partReqs.length+' requests)');
  await p.waitForFunction(()=>document.readyState==='complete',null,{timeout:20000});
  await p.waitForTimeout(1500);
  const end=await p.evaluate(()=>({math:document.querySelectorAll('#main math').length,raw:document.querySelectorAll('#main .math.raw').length,
    svg:document.querySelectorAll('#main .mfig svg').length,bad:document.querySelectorAll('#main .mfig.bad').length,viol:window.__viol||[]}));
  if(!tamper){
    ok(end.math===3&&end.raw===0,'the formulas are drawn as MathML once the page has arrived ('+JSON.stringify(end)+')');
    ok(end.svg===1&&end.bad===0,'the diagram is drawn as SVG, not as "could not be drawn"');
    ok(partReqs.length===(PARTS.has(HTML,'mermaid')?1:0)&&partReqs.every(r=>r.arrived),'and the part was asked for once, after the page had arrived, if the file does not hold it ('+JSON.stringify(partReqs)+')');
    await p.screenshot({path:path.join(OUT,'libwake.png')});}
  else{
    ok(end.math===0&&end.raw===3,'tampered Temml: the formulas stay as their TeX ('+JSON.stringify(end)+')');
    ok(end.viol.length===1,'a failed wake after the page has arrived is remembered: three formulas, one attempt ('+end.viol.length+' violations)');}
  ok(errs.length===0,'no page error: '+errs.join(' | '));
  await b.close();server.close();
}
(async()=>{await run(false);await run(true);
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})().catch(e=>{console.log('FAIL the check threw: '+(e&&e.stack||e));process.exit(1);});
