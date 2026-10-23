// Browser check for format 0.12 (renderer 0.12.0, item D), in a real page under the hosted Content-Security-Policy:
//  - a module's opening is drawn on the module's own screen (first paragraph large, the rest under it) and not inside its first activity;
//  - the module's icon: is a large picture beside the title (a spot of that name in teaching, the line icon in briefing), and absent without icon:;
//  - the summary line counts the activities and how many are started;
//  - the picture rule on cards: icon:, else a leading emoji, else the number;
//  - the theme block's `style:` wins over the host's default (bookletStyle.set), whatever colour theme the reader picks, and goes when the booklet closes;
//  - a tile whose `link` role is a heading opens that heading, an `icon` role draws its picture, a module link to a module that is not held is a chip (item E).
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/format012-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const THEME=s=>s?'```booklet theme\nstyle: '+s+'\n```\n\n':'';
const FILE=style=>`---
booklet: "0.13"
title: Opening test
lang: en
---

${THEME(style)}> [!module|a icon:compass] The first module

First paragraph of the opening, drawn large.

Second paragraph of the opening, drawn below it.

> [!activity|one icon:target] One

Prose of the first activity.

## Where to next

\`\`\`booklet data
[{"label":"Go to the second","value":"2","link":"#Landing spot","icon":"house"},{"label":"Another module","value":"3","link":"week-2.booklet.md","icon":"no-such-picture"}]
\`\`\`
^pick

\`\`\`booklet query
from: pick
as: tiles
\`\`\`

> [!activity|two] 🌱 Two

## Landing spot

You arrived.

> [!activity|three] Three

Plain.

> [!text|q] A question

> [!module|a end] End of the first

> [!module|b] The second module

> [!activity|x] X

Text.

> [!activity|y] Y

Text.

> [!module|b end] End of the second
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const cons=[],errs=[];
  const load=async(style,hostStyle)=>{
    const file=path.join(OUT,'f012-'+(style||'none')+'.booklet.md');fs.writeFileSync(file,FILE(style));
    const p=await (await b.newContext({viewport:{width:1100,height:900}})).newPage();
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    if(hostStyle) await p.evaluate(s=>window.bookletStyle.set(s),hostStyle);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(400);}
    return p;};
  const uses=p=>p.evaluate(()=>[...document.querySelectorAll('#main .cd-tile use')].map(u=>u.getAttribute('href')));
  const styleOf=p=>p.evaluate(()=>document.documentElement.getAttribute('data-style'));

  /* ---- a booklet with no style of its own, the host's default teaching ---- */
  let p=await load(null,'teaching');
  ok(await styleOf(p)==='teaching','no style: in the file, the host default holds (teaching)');
  const homeUses=await uses(p);
  ok(homeUses[0]==='#bs-compass','teaching: the first module card is the spot of its icon: ('+homeUses[0]+')');
  ok(homeUses.length===1||!homeUses[1],'the second module has no icon: and no picture but its number');
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(700);
  let m=await p.evaluate(()=>({h2:(document.querySelector('#main h2')||{}).textContent,lede:(document.querySelector('.mhead-lede')||{}).textContent||'',more:(document.querySelector('.mhead-more')||{}).textContent||'',
    pic:[...document.querySelectorAll('.mhead-pic use')].map(u=>u.getAttribute('href')),meta:(document.querySelector('.cd-meta')||{}).textContent,
    cards:[...document.querySelectorAll('#main button.mode')].map(c=>({t:c.querySelector('.k').textContent,tile:c.querySelector('.cd-tile').textContent.trim(),num:(c.querySelector('.cd-num')||{}).textContent,use:[...c.querySelectorAll('.cd-tile use')].map(u=>u.getAttribute('href'))})),
    outside:/First paragraph of the opening/.test((document.getElementById('main').querySelector('.modes')||{textContent:''}).textContent)}));
  ok(m.h2==='The first module','the module screen is headed by its title');
  ok(m.lede==='First paragraph of the opening, drawn large.','the opening\'s first paragraph is drawn at lede size on the module screen');
  ok(m.more==='Second paragraph of the opening, drawn below it.','the rest of the opening is drawn below it');
  ok(!m.outside,'the opening is not in the activity cards');
  ok(m.pic.join()==='#bs-compass','teaching: the module\'s icon: is a large picture beside the title, as its spot');
  ok(/^3 activities$/.test(m.meta),'the summary line counts the activities: '+m.meta);
  ok(m.cards[0].use[0]==='#bs-target','an activity\'s icon: is its card\'s picture (the target has a spot)');
  ok(m.cards[1].tile==='🌱'&&m.cards[1].t==='Two','no icon: a leading emoji is the picture and leaves the title');
  ok(m.cards[2].tile===''&&m.cards[2].num==='3'&&m.cards[2].use.length===0,'neither: the number, before the title, in an empty tile '+JSON.stringify(m.cards[2]));
  await p.screenshot({path:path.join(OUT,'f012-module-teaching.png')});
  /* the first activity does not hold the opening */
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(700);
  ok(!/First paragraph of the opening|Second paragraph of the opening/.test(await p.locator('#main').innerText()),'the opening is not drawn inside the first activity');
  ok(/Prose of the first activity/.test(await p.locator('#main').innerText()),'the first activity keeps its own prose');
  /* tiles: link and icon roles */
  const tiles=await p.evaluate(()=>[...document.querySelectorAll('#main .dv-tile')].map(t=>({txt:t.textContent,a:[...t.querySelectorAll('a')].map(a=>a.getAttribute('href')),use:[...t.querySelectorAll('use')].map(u=>u.getAttribute('href')),lead:t.classList.contains('dv-lead')})));
  ok(tiles.length===2,'two tiles drawn');
  ok(tiles[0].a.length===1&&tiles[0].lead&&tiles[0].use[0]==='#bi-house','the first tile leads (its label is a link) and draws its icon');
  ok(tiles[1].a.length===0&&tiles[1].use.join()==='#bi-package'&&/Another module/.test(tiles[1].txt)&&/not in this booklet/.test(tiles[1].txt),'a module link to a module this booklet does not hold is a chip (no link, the module picture), and an icon name that is not in the set draws nothing');
  await p.locator('#main .dv-tile a').first().click();await p.waitForTimeout(700);
  ok(/You arrived/.test(await p.locator('#main').innerText()),'pressing the tile\'s label opens the heading it names');
  await p.close();

  /* ---- the file's style: briefing wins over the host's teaching, and over a theme the reader picks ---- */
  p=await load('briefing','teaching');
  ok(await styleOf(p)==='briefing','a file\'s style: briefing wins over the host\'s default (teaching)');
  ok((await uses(p))[0]==='#bi-compass','briefing: the card\'s picture is always the line icon, never the spot');
  await p.evaluate(()=>window.bookletTheme.set('night'));await p.waitForTimeout(300);
  ok(await styleOf(p)==='briefing'&&await p.evaluate(()=>document.documentElement.getAttribute('data-theme'))==='night','it stays when the reader picks a theme of their own (Night)');
  await p.evaluate(()=>window.bookletStyle.set('teaching'));await p.waitForTimeout(200);
  ok(await styleOf(p)==='briefing','the host setting a style while the booklet is open does not change it');
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(700);
  ok(await p.evaluate(()=>[...document.querySelectorAll('.mhead-pic use')].map(u=>u.getAttribute('href')).join())==='#bi-compass','briefing: the module\'s big picture is the line icon');
  await p.screenshot({path:path.join(OUT,'f012-module-briefing.png')});
  await p.locator('#btnHome').click().catch(()=>{});await p.waitForTimeout(300);
  await p.locator('#btnHome').click().catch(()=>{});await p.waitForTimeout(500);
  ok(await styleOf(p)==='teaching','back on the list of booklets the host\'s default (teaching) holds again');
  await p.close();

  /* ---- no style in the file, the host says briefing ---- */
  p=await load(null,'briefing');
  ok(await styleOf(p)==='briefing'&&(await uses(p))[0]==='#bi-compass','with no style: in the file the host\'s briefing draws');
  await p.close();

  /* ---- review fixes ---- */
  {const file=path.join(OUT,'f012-extra.booklet.md');
   fs.writeFileSync(file,`---
booklet: "0.13"
title: Extra
lang: en
---

> [!module|solo icon:compass] Solo module

<!-- a comment first -->

Solo lede words.

Solo second paragraph.

> [!tip] Solo tip
> The tip body.

> [!activity|only] Only activity

Only prose.

> [!text|q1] A question

> [!module|solo end] End
`);
   const mk=async(scheme,hostStyle)=>{const pg=await (await b.newContext({viewport:{width:1100,height:900},colorScheme:scheme})).newPage();
     pg.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});pg.on('pageerror',e=>errs.push(e.message));
     await pg.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
     await pg.goto('https://bookletmd.test/app/');await pg.waitForTimeout(400);return pg;};
   let q=await mk('light');
   await q.getByRole('button',{name:'Add a booklet from a file'}).click();await q.waitForTimeout(300);
   await q.locator('#fileIn').setInputFiles(file);await q.waitForTimeout(500);
   await q.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await q.waitForTimeout(900);
   const view=await q.evaluate(()=>document.body.dataset.view);
   const sol=await q.evaluate(()=>({h2:(document.querySelector('#main h2')||{}).textContent,lede:(document.querySelector('.mhead-lede')||{}).textContent||'',
     more:(document.querySelector('.mhead-more')||{}).textContent||'',pic:[...document.querySelectorAll('.mhead-pic use')].map(u=>u.getAttribute('href')),
     tip:/The tip body/.test((document.querySelector('.mhead-more')||{textContent:''}).textContent)}));
   ok(view.indexOf('/')>0||view!=='@home','a module that is one activity opens on its activity ('+view+')');
   ok(sol.h2==='Solo module'&&sol.lede==='Solo lede words.'&&/Solo second paragraph/.test(sol.more)&&sol.pic.join()==='#bs-compass','a one-activity module draws its head on the activity screen: title, lede (after an HTML comment), the rest, large picture');
   ok(sol.tip,'a reading callout before the first activity is drawn in the opening');
   ok(!/Solo lede words/.test(await q.locator('#main .pblock').first().innerText().catch(()=>'')),'and the opening is not repeated in the activity\'s own prose');
   /* the focused control comes back after the host changes the style */
   const inp=q.locator('#main textarea, #main input[type=text]').first();
   await inp.click();await inp.type('abc');
   await q.evaluate(()=>window.bookletStyle.set('briefing'));await q.waitForTimeout(400);
   ok(await q.evaluate(()=>{const a=document.activeElement;return !!a&&a.tagName!=='BODY'&&/abc/.test(a.value||'');}),'the focused field is focused again, with its words, after the style changes');
   await q.context().close();
   /* the redraw: the host sets briefing while a module screen shows, and its cards change from spots to icons */
   q=await mk('light');await q.evaluate(()=>window.bookletStyle.set('teaching'));
   const f2=path.join(OUT,'f012-none.booklet.md');
   await q.getByRole('button',{name:'Add a booklet from a file'}).click();await q.waitForTimeout(300);
   await q.locator('#fileIn').setInputFiles(f2);await q.waitForTimeout(500);
   await q.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await q.waitForTimeout(900);
   if(await q.evaluate(()=>document.body.dataset.view)!=='@home'){await q.locator('#btnHome').click();await q.waitForTimeout(400);}
   await q.locator('#main button.mode').first().click();await q.waitForTimeout(700);
   const before=await q.evaluate(()=>[...document.querySelectorAll('#main .cd-tile use')].map(u=>u.getAttribute('href')));
   await q.evaluate(()=>window.bookletStyle.set('briefing'));await q.waitForTimeout(400);
   const after=await q.evaluate(()=>[...document.querySelectorAll('#main .cd-tile use')].map(u=>u.getAttribute('href')));
   ok(before[0]==='#bs-target'&&after[0]==='#bi-target'&&await q.evaluate(()=>[...document.querySelectorAll('.mhead-pic use')].map(u=>u.getAttribute('href')).join())==='#bi-compass',
     'a host style change redraws the screen at once: spots become icons ('+before[0]+' to '+after[0]+')');
   await q.context().close();
   /* a theme block with only style: leaves the colours to the reader on Auto */
   const f3=path.join(OUT,'f012-style-only.booklet.md');fs.writeFileSync(f3,FILE('briefing'));
   q=await mk('dark');
   await q.getByRole('button',{name:'Add a booklet from a file'}).click();await q.waitForTimeout(300);
   await q.locator('#fileIn').setInputFiles(f3);await q.waitForTimeout(500);
   await q.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await q.waitForTimeout(900);
   const st=await q.evaluate(()=>({theme:document.documentElement.getAttribute('data-theme'),style:document.documentElement.getAttribute('data-style'),custom:document.documentElement.hasAttribute('data-theme-custom')}));
   ok(st.theme==='night'&&st.style==='briefing'&&!st.custom,'a dark-mode reader on Auto, a file with only style: briefing: Night colours, briefing shapes ('+JSON.stringify(st)+')');
   await q.context().close();}

  /* ---- review round 2: citations, heading ids, the large picture, device switches ---- */
  {const NOTES=`
[^o]: *Opening source*, p. 1: "Opening quote."
[^x]: *Activity source*, p. 2: "Activity quote."
`;
   const files={
     one:`---\nbooklet: "0.13"\ntitle: One\nlang: en\n---\n\n> [!module|one] One module\n\n## Background\n\nOpening mark[^o].\n\n> [!activity|a] Only\n\n## Background\n\nActivity mark[^x]. See [[#Background]].\n\n${NOTES}\n> [!module|one end] End\n`,
     multi:`---\nbooklet: "0.13"\ntitle: Multi\nlang: en\n---\n\n> [!module|mm icon:compass] Multi module\n\nOpening mark[^o].\n\n> [!activity|a icon:house] First\n\nActivity mark[^x].\n\n> [!activity|b] Second\n\nPlain.\n\n${NOTES}\n> [!module|mm end] End\n`,
     iconOnly:`---\nbooklet: "0.13"\ntitle: Icon\nlang: en\n---\n\n> [!module|io icon:compass] Icon module\n\n> [!activity|a icon:house] Only\n\nProse.\n\n> [!module|io end] End\n`,
     actIcon:`---\nbooklet: "0.13"\ntitle: ActIcon\nlang: en\n---\n\n> [!module|ai] Plain module\n\nAn opening.\n\n> [!activity|a icon:house] Only\n\nProse.\n\n> [!module|ai end] End\n`};
   const go=async(name)=>{const f=path.join(OUT,'f012-r2-'+name+'.booklet.md');fs.writeFileSync(f,files[name]);
     const pg=await (await b.newContext({viewport:{width:1100,height:900}})).newPage();
     pg.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});pg.on('pageerror',e=>errs.push(e.message));
     await pg.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
     await pg.goto('https://bookletmd.test/app/');await pg.waitForTimeout(400);
     await pg.getByRole('button',{name:'Add a booklet from a file'}).click();await pg.waitForTimeout(300);
     await pg.locator('#fileIn').setInputFiles(f);await pg.waitForTimeout(500);
     await pg.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await pg.waitForTimeout(900);return pg;};
   const marks=pg=>pg.evaluate(()=>[...document.querySelectorAll('#main .rd-mark')].map(m=>m.textContent));
   const notes=pg=>pg.evaluate(()=>[...document.querySelectorAll('#main .rd-nlist li')].map(l=>l.getAttribute('value')+':'+l.textContent.slice(0,16)));
   /* one activity: the opening and the activity share a screen: 1, 2, and the endnotes list both */
   let q=await go('one');
   ok((await marks(q)).join()==='1,2','a one-activity module: the opening\'s mark is 1 and the activity\'s is 2 on the one screen ('+(await marks(q))+')');
   ok((await notes(q)).map(x=>x.split(':')[0]).join()==='1,2','and its endnotes list both, 1 and 2 ('+(await notes(q))+')');
   const ids=await q.evaluate(()=>{const all=[...document.querySelectorAll('#main [id]')].map(e=>e.id);return {dup:all.filter((x,i)=>all.indexOf(x)!==i),mo:all.includes('mo-background'),md:all.includes('md-background')};});
   ok(ids.dup.length===0&&ids.mo&&ids.md,'the opening\'s heading has its own id (mo-background), so the activity\'s Background is not a duplicate ('+JSON.stringify(ids)+')');
   await q.locator('#main a.alink').first().click();await q.waitForTimeout(400);
   ok(await q.evaluate(()=>{const a=document.querySelector('#main h2#md-background, #main #md-background');return !!a;})&&/Activity mark/.test(await q.locator('#main').innerText()),"the activity's own link to Background stays on the activity (its heading, not the opening's)");
   await q.context().close();
   /* several activities: the module screen numbers its opening from 1, the first activity starts at 1 too */
   q=await go('multi');
   ok((await marks(q)).join()==='1'&&(await notes(q)).join().startsWith('1:'),'a module of several activities: the module screen\'s opening is mark 1 with its own endnote, 1 ('+(await marks(q))+' '+(await notes(q))+')');
   ok(await q.locator('.mhead-pic use').count()===1&&await q.evaluate(()=>document.querySelector('.mhead-pic use').getAttribute('href'))==='#bs-compass','the large picture is the module\'s icon (compass)');
   await q.locator('#main button.mode').first().click();await q.waitForTimeout(700);
   ok((await marks(q)).join()==='1'&&(await notes(q)).join().startsWith('1:Activity'),'the first activity\'s citations start at 1 ('+(await marks(q))+' '+(await notes(q))+')');
   ok(await q.locator('.mhead-pic').count()===0,'a module of several activities draws no head on an activity screen');
   await q.context().close();
   /* the large picture is the module's own icon, with or without an opening */
   q=await go('iconOnly');
   ok(await q.evaluate(()=>[...document.querySelectorAll('.mhead-pic use')].map(u=>u.getAttribute('href')).join())==='#bs-compass','a one-activity module with icon: and no opening: its icon, large');
   await q.context().close();
   q=await go('actIcon');
   ok(await q.locator('.mhead-pic').count()===0&&/An opening/.test(await q.locator('#main').innerText()),'a one-activity module with an opening and no icon: of its own: no large picture (the activity\'s icon is its card\'s)');
   await q.context().close();
   /* a device switch while a style-only file is open */
   q=await go('multi');await q.context().close();
   const f4=path.join(OUT,'f012-style-only2.booklet.md');fs.writeFileSync(f4,FILE('briefing'));
   const dctx=await b.newContext({viewport:{width:1100,height:900},colorScheme:'light'}),dp=await dctx.newPage();
   dp.on('pageerror',e=>errs.push(e.message));
   await dp.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
   await dp.goto('https://bookletmd.test/app/');await dp.waitForTimeout(400);
   await dp.getByRole('button',{name:'Add a booklet from a file'}).click();await dp.waitForTimeout(300);
   await dp.locator('#fileIn').setInputFiles(f4);await dp.waitForTimeout(500);
   await dp.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await dp.waitForTimeout(900);
   const t1=await dp.evaluate(()=>document.documentElement.getAttribute('data-theme'));
   await dp.emulateMedia({colorScheme:'dark'});await dp.waitForTimeout(400);
   const t2=await dp.evaluate(()=>document.documentElement.getAttribute('data-theme')+'/'+document.documentElement.getAttribute('data-style'));
   ok(t1==='paper'&&t2==='night/briefing','a style-only file still follows the device: light is Paper, switched to dark it is Night, still briefing ('+t1+' then '+t2+')');
   await dctx.close();}
  ok(cons.length===0&&errs.length===0,'zero CSP violations and page errors '+cons.concat(errs).join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
