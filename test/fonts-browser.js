// Browser check (0.11.8): the faces the renderer carries load, under its own Content-Security-Policy (opened as a file) and under
// the hosted /app/ header (test/csp.js), with no request, no policy violation and no page error; the default heading face is Lexend
// and the body face Atkinson Hyperlegible (a booklet's `font` setting is checked in theme-block-browser.js); the picture sprite is in the page and takes no room. Usage:
// PLAYWRIGHT=/path/to/node_modules/playwright node test/fonts-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]);
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
(async()=>{
  const b=await chromium.launch();
  for(const mode of ['file','hosted']){
    const ctx=await b.newContext({viewport:{width:1100,height:800}});const p=await ctx.newPage();
    const viol=[],errs=[],reqs=[];
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))viol.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    p.on('request',r=>{if(!/^(data|blob|about):/.test(r.url())&&!(mode==='file'&&r.url().startsWith('file:'))&&r.url()!=='https://bookletmd.test/app/')reqs.push(r.url());});
    if(mode==='hosted'){
      await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
        r.fulfill(u==='/app/'?{status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}:{status:404,body:'nf'});});
      await p.goto('https://bookletmd.test/app/');}
    else await p.goto('file://'+HTML);
    await p.waitForTimeout(500);
    const r=await p.evaluate(async()=>{
      await document.fonts.load('16px "Atkinson Hyperlegible"');await document.fonts.load('700 16px "Atkinson Hyperlegible"');
      await document.fonts.load('italic 16px "Atkinson Hyperlegible"');await document.fonts.load('600 16px Lexend');await document.fonts.ready;
      const loaded=[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family.replace(/["']/g,'')+' '+f.weight+' '+f.style);
      const h=document.createElement('h2');h.textContent='x';document.getElementById('main').append(h);
      const ic=document.querySelector('symbol#bi-x'),sp=document.querySelector('symbol#bs-scale');
      return {atk:document.fonts.check('16px "Atkinson Hyperlegible"'),atkb:document.fonts.check('700 16px "Atkinson Hyperlegible"'),
        atki:document.fonts.check('italic 16px "Atkinson Hyperlegible"'),lex:document.fonts.check('600 16px Lexend'),loaded,
        body:getComputedStyle(document.body).fontFamily,head:getComputedStyle(h).fontFamily,sprite:!!ic&&!!sp,
        hidden:getComputedStyle(document.querySelector('.artsprite')).width};});
    ok(r.atk&&r.atkb&&r.atki&&r.lex,mode+': document.fonts.check is true for Atkinson Hyperlegible (400, 700, italic) and Lexend 600');
    ok(['Atkinson Hyperlegible 400 normal','Atkinson Hyperlegible 700 normal','Atkinson Hyperlegible 400 italic','Lexend 600 normal'].every(k=>r.loaded.includes(k)),mode+': the four faces are loaded ('+r.loaded.join(', ')+')');
    ok(/^"?Atkinson Hyperlegible/.test(r.body),mode+': the body face is Atkinson Hyperlegible ('+r.body+')');
    ok(/^"?Lexend/.test(r.head),mode+': the heading face is Lexend ('+r.head+')');
    ok(r.sprite&&r.hidden==='0px',mode+': the sprite is in the page and takes no room');
    ok(reqs.length===0,mode+': no request is made'+(reqs.length?' '+reqs.join(' '):''));
    ok(viol.length===0,mode+': no policy violation'+(viol.length?' '+viol.join(' | '):''));
    ok(errs.length===0,mode+': no page error'+(errs.length?' '+errs.join(' | '):''));
    await ctx.close();}
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'fonts browser checks passed');process.exit(fails.length?1:0);
})();
