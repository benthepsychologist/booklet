// Browser check for renderer 0.13.1: the interface language follows SPEC.md section 9 (review D17), and a file's notices
// follow a language switch (review R2: a problem is a code, worded when it is drawn). A real page at 1280 px: the EN / ES /
// FR toggle shows on "Your booklets" and inside every booklet; a reader who chose French opens how-tides-work (lang: en)
// with French controls; a file opened with problems shows them in English, and pressing FR re-words them in French, the
// marker sentence too; a reload keeps the choice.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/language-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const TIDES=fs.readFileSync(path.join(__dirname,'..','examples','how-tides-work.booklet.md'),'utf8');
/* a file marked 0.9, in English, with two things this page reports and opens anyway */
const NOTED='---\nbooklet: 0.9\ntitle: Harbour notes\nlang: en\n---\n\n> [!activity|a daily] Low water\n\nSome words.\n\n> [!text] A question with no id\n\n> [!text|q] What did you notice?\n';
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
    r.fulfill(u==='/app/'?{status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}}:{status:404,body:'nf'});});
  const wait=ms=>p.waitForTimeout(ms);
  const shown=()=>p.evaluate(()=>[...document.querySelectorAll('.lang button')].filter(x=>x.offsetParent!==null).map(x=>x.dataset.lang).join());
  const pressed=()=>p.evaluate(()=>[...document.querySelectorAll('.lang button')].filter(x=>x.getAttribute('aria-pressed')==='true').map(x=>x.dataset.lang).join());
  const press=async l=>{await p.locator('.lang button[data-lang="'+l+'"]').click();await wait(300);};
  const toList=async()=>{for(let i=0;i<3;i++){if(await p.locator('#main .hero h1').filter({hasText:/Your booklets|Vos carnets|Tus cuadernillos/}).count()) return;await p.locator('#btnHome').click();await wait(300);}};
  const load=async text=>{await toList();await p.locator('#main .addrow button').nth(1).click();await wait(250);
    await p.locator('#pasteIn').fill(text);await p.locator('#loadGo').click();await wait(800);};
  const notes=()=>p.evaluate(()=>{const n=document.querySelector('#main .filenotes');if(!n) return null;
    return {marker:(n.querySelector(':scope > p')||{}).textContent||'',items:[...n.querySelectorAll('li')].map(li=>li.textContent)};});

  await p.goto('https://bookletmd.test/app/');await wait(500);
  ok(await shown()==='en,es,fr'&&await pressed()==='en',"Your booklets shows the whole toggle, EN pressed, for a reader who chose nothing");

  /* a file's notices follow a language switch */
  await load(NOTED);
  ok(await shown()==='en,es,fr',"inside a booklet the toggle still shows EN, ES and FR");
  const en=await notes();
  ok(!!en&&/This file says booklet: 0\.9/.test(en.marker)&&en.items.length===2&&en.items.some(x=>/“daily” only follows “repeat”/.test(x)),"the file's notices are in English: the marker sentence and two problems"+" "+JSON.stringify(en));
  await press('fr');
  const fr=await notes();
  ok(await p.evaluate(()=>document.documentElement.lang)==='fr'&&await pressed()==='fr',"pressing FR puts the booklet's page in French");
  ok(!!fr&&fr.items.length===2&&fr.items.every((x,i)=>x!==en.items[i])&&fr.items.some(x=>/“daily” ne vient qu’après “repeat”/.test(x)),"and the same notices, drawn again, are in French"+" "+JSON.stringify(fr));
  ok(!!fr&&fr.marker!==en.marker&&/0\.9/.test(fr.marker),"the marker sentence too",fr&&fr.marker);
  await p.screenshot({path:path.join(OUT,'language-notices-fr.png')});
  await press('en');
  ok(JSON.stringify(await notes())===JSON.stringify(en),"and EN puts them back, word for word");

  /* a reader who chose French opens how-tides-work with French controls */
  await toList();await press('fr');
  await load(TIDES);
  const exp=(await p.locator('#btnExport').innerText()).trim();
  ok(await p.evaluate(()=>document.documentElement.lang)==='fr'&&exp==='Envoyer ou sauvegarder une copie'&&await pressed()==='fr',"a reader who chose French opens how-tides-work (lang: en) with French controls",exp);
  ok(/tide/i.test(await p.locator('#main').innerText()),"and its own words stay as written");
  await p.screenshot({path:path.join(OUT,'language-tides-fr.png')});
  await p.reload();await wait(600);
  ok(await p.evaluate(()=>document.documentElement.lang)==='fr'&&/Vos carnets/.test(await p.locator('#main').innerText()),"a reload keeps the choice: Your booklets in French");
  ok(errs.length===0,"zero page errors "+errs.join('|'));
  await ctx.close();await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})().catch(e=>{console.log('FAIL '+e.stack);process.exit(1);});
