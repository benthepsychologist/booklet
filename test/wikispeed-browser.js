// Browser check of lazy drawing (renderer 0.12.0, item E): a wiki opens fast however large it is, because only the page on
// show, the first cards of a row and the open branches of the menu are built. Two wikis are timed in headless Chromium, from the
// press of Load to the second animation frame after it (the screen is on glass):
//   - the committed fixture test/fixtures/wiki-scrambled.booklet.md (about 270 KB, 157 pages: the shape of booklet-hub's own wiki,
//     with none of its words), under 1 second;
//   - a synthetic wiki of about 1 MB (about 780 pages, made here, the same every run), under 3 seconds.
// Then it walks down the tree and searches the big one, which must stay quick too (the lists are worked out once).
// On a slow machine (CI) the limits are multiplied by CI_FACTOR below. The numbers are printed either way.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/wikispeed-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
/* the limits, in milliseconds, and the factor a CI runner is given (set CI_FACTOR_NOTE when it is not 1) */
const LIMIT_FIXTURE=1000,LIMIT_BIG=3000;
const CI_FACTOR=process.env.CI?1:1;   // the factor for a CI runner, if it proves slower than this box (the workflow never sets it)

/* a deterministic wiki of about 1 MB: 12 top pages, each with 8 children, each with 7 children; prose, a list, a table and heading links */
function synthetic(){
  let seed=12345;const rnd=n=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed%n;};
  const syl=['ba','ko','ri','mu','te','sa','lo','vi','de','nu','fa','go','hi','pe','zu','wa'];
  const word=()=>{let w='';for(let i=0,n=1+rnd(3);i<=n;i++)w+=syl[rnd(syl.length)];return w;};
  const sentence=()=>{const n=6+rnd(9);const w=[];for(let i=0;i<n;i++)w.push(word());w[0]=w[0][0].toUpperCase()+w[0].slice(1);return w.join(' ')+'.';};
  const para=()=>{const n=3+rnd(4);const s=[];for(let i=0;i<n;i++)s.push(sentence());return s.join(' ');};
  const pages=[];
  const add=(parent)=>{const i=pages.length+1,id='s'+String(i).padStart(4,'0');pages.push({id,parent,title:'Page '+word()+' '+word()+' '+i});return id;};
  for(let a=0;a<12;a++){const A=add('');for(let b=0;b<8;b++){const B=add(A);for(let c=0;c<7;c++)add(B);}}
  let out='---\nbooklet: "0.12"\nid: "synthetic-wiki"\ntitle: "Synthetic wiki"\nlang: en\n---\n\n```booklet theme\nstyle: briefing\n```\n\n> [!module|wiki] Synthetic wiki\n\n';
  for(const p of pages){
    out+='> [!activity|'+p.id+(p.parent?' parent:'+p.parent:'')+'] '+p.title+'\n\n';
    out+='*Page · planned*\n\n'+para()+'\n\n'+para()+'\n\n';
    const t1=pages[rnd(pages.length)],t2=pages[rnd(pages.length)];
    out+=sentence()+' See [[#'+t1.title+']] and [more]('+'#'+t2.title.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/ /g,'-')+').\n\n';
    out+='## '+word()+' '+word()+'\n\n'+para()+'\n\n- '+sentence()+'\n- '+sentence()+'\n- '+sentence()+'\n\n';
    out+='| '+word()+' | '+word()+' |\n| --- | --- |\n| '+word()+' | '+sentence()+' |\n| '+word()+' | '+sentence()+' |\n\n';
    out+=para()+'\n\n';}
  return out+'> [!module|wiki end] End\n';}

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const errs=[];
  const fresh=async()=>{const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
    p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    return p;};
  /* the press of Load to the second frame after it, in the page's own clock */
  const timeOpen=async(p,text)=>{
    await p.evaluate(t=>{document.getElementById('pasteIn').value=t;},text);
    return p.evaluate(()=>new Promise(res=>{const t0=performance.now();document.getElementById('loadGo').click();
      requestAnimationFrame(()=>requestAnimationFrame(()=>res(performance.now()-t0)));}));};
  const timed=async(label,fn)=>{const t0=Date.now();await fn();return Date.now()-t0;};

  const runs=[['the committed fixture (about 270 KB)',fs.readFileSync(path.join(__dirname,'fixtures','wiki-scrambled.booklet.md'),'utf8'),LIMIT_FIXTURE],
              ['a synthetic wiki (about 1 MB)',synthetic(),LIMIT_BIG]];
  if(process.env.WIKI_REAL&&fs.existsSync(process.env.WIKI_REAL)) runs.unshift(['the real hub wiki ('+process.env.WIKI_REAL+')',fs.readFileSync(process.env.WIKI_REAL,'utf8'),LIMIT_FIXTURE]);
  for(const [label,text,limit] of runs){
    ok(true,label+': '+Math.round(Buffer.byteLength(text)/1024)+' KB');
    const best=[];let p;
    for(let round=0;round<3;round++){p=await fresh();best.push(Math.round(await timeOpen(p,text)));
      const shown=await p.locator('.wk-frame').count();ok(shown===1,label+': the wiki is on screen');
      if(round<2) await p.context().close();}
    const med=best.slice().sort((x,y)=>x-y)[1],lim=limit*CI_FACTOR;
    console.log('     '+label+': opened in '+best.join(', ')+' ms (limit '+lim+' ms'+(CI_FACTOR!==1?', factor '+CI_FACTOR:'')+')');
    ok(med<lim,label+': opens in under '+lim+' ms (median '+med+' ms)');
    const built=await p.evaluate(()=>document.querySelectorAll('#main *').length);
    ok(built<1500,label+': only what is looked at is built ('+built+' elements on screen)');
    /* going down the tree and searching stay quick */
    const card=p.locator('#main .wk-cards button.mode').first();
    const down=await timed('down',async()=>{await card.click();await p.locator('.wk-crumbs').waitFor();await p.locator('#main .wk-cards button.mode').first().click();await p.locator('.wk-crumbs li').nth(2).waitFor();});
    ok(down<1000*CI_FACTOR,label+': two levels down in '+down+' ms');
    const find=await timed('find',async()=>{await p.locator('.wk-q').fill('kobaris');await p.locator('.wk-results,.wk-none').first().waitFor({state:'attached'});});
    ok(find<2000*CI_FACTOR,label+': the first search, which reads every page once, in '+find+' ms');
    const again=await timed('again',async()=>{await p.locator('.wk-q').fill('bakomu');await p.waitForTimeout(0);});
    ok(again<500*CI_FACTOR,label+': the next search in '+again+' ms');
    await p.context().close();}
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await b.close();
  if(fails.length){console.log('\n'+fails.length+' FAILED');process.exit(1);}
  console.log('\nALL PASSED');})().catch(e=>{console.error(e);process.exit(1);});
