// Browser check for the card (renderer 0.11.10, C1), in a real page: six cards show six hues in both styles; a folded group shows
// its first words, a folded hint shows no answer while it is closed and says Hint, a card whose first paragraph holds a link has no
// link inside its button; the status line follows the answers; Next steps through a three-activity module; targets are 44 px and the
// focus ring shows on Night; reduced motion stops the chevron's turn; print opens the cards; pictures are aria-hidden.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/cards-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const head='---\nbooklet: "0.11"\ntitle: Harbour notes\nlang: en\n---\n\n';
const six=head+'> [!module|m] Harbour\n\nA module of six.\n\n'+['One','Two','Three','Four','Five','Six','Seven'].map((t,i)=>
  `> [!activity|a${i}] ${t}\n\n${i===0?'First words with [a link](https://example.com/x) in them, then more.\n\n':'Some words.\n\n'}> [!text|q${i}] A question in ${t}?\n\n> [!text|r${i}] Another in ${t}?\n\n`).join('')+'> [!module|m end] End\n';
const folds=head+'> [!activity|a] Folding\n\n> [!choice|q] Pick one\n- [ ] Left\n- [ ] Right\n\n> [!hint]- \n> THE-SECRET-HINT-WORDS\n\n> [!solution]- \n> THE-SECRET-ANSWER-WORDS\n\n> [!group]- 🌱 Extra reading\n> Words that open the group and say what is in it. More after that.\n>\n> The second paragraph.\n\n## Not a section\n\nText.\n';
const orphans=head+'> [!activity|a] Orphans\n\n> [!hint]-\n> ORPHAN-SECRET-ONE\n\n> [!text|q] Q?\n\n> [!note] Aside\n> Some aside.\n\n> [!hint]-\n> ORPHAN-SECRET-TWO\n\nA paragraph.\n\n> [!solution]-\n> ORPHAN-SECRET-THREE\n';
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  for(const W of [1280,390]){
    const ctx=await b.newContext({viewport:{width:W,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
      r.fulfill(u==='/app/'?{status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}}:{status:404,body:'nf'});});
    const wait=ms=>p.waitForTimeout(ms);
    const view=()=>p.evaluate(()=>document.body.dataset.view);
    const over=()=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    const toList=async()=>{for(let i=0;i<3;i++){if(await p.getByRole('button',{name:'Add a booklet from a file'}).count()) return;await p.locator('#btnHome').click();await wait(300);}};
    const load=async text=>{await toList();await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(250);
      await p.locator('#pasteIn').fill(text);await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(800);};
    await p.goto('https://bookletmd.test/app/');await wait(500);

    /* six cards, six hues, in both styles */
    await load(six);
    ok(await view()==='module:m'&&await p.locator('#main button.mode').count()===7,`${W}px: the module of seven opens on its screen with seven cards`);
    for(const style of ['teaching','briefing']){
      await p.evaluate(s=>window.bookletStyle.set(s),style);await wait(150);
      const tiles=await p.evaluate(()=>[...document.querySelectorAll('#main button.mode .cd-tile')].map(t=>{const c=getComputedStyle(t);return {bg:c.backgroundColor,fg:c.color,hid:t.getAttribute('aria-hidden')};}));
      ok(new Set(tiles.slice(0,6).map(t=>t.bg)).size===6,`${W}px ${style}: six cards, six tile colours (${[...new Set(tiles.slice(0,6).map(t=>t.bg))].join(' ')})`);
      ok(tiles[6].bg===tiles[0].bg,`${W}px ${style}: the seventh card starts the hues again`);
      ok(tiles.every(t=>t.hid==='true'),`${W}px ${style}: every picture is aria-hidden`);
      if(style==='briefing') ok(tiles.slice(0,6).every(t=>/^(rgb\(255, 255, 255\)|color\(srgb 1 1 1\))$/.test(t.fg)),`${W}px briefing: the art on the solid tile is white`);
      else ok(tiles.slice(0,6).every(t=>!/^(rgb\(255, 255, 255\)|color\(srgb 1 1 1\))$/.test(t.fg)),`${W}px teaching: the art is the vivid line, not white`);}
    await p.evaluate(()=>window.bookletStyle.set('teaching'));
    ok(await p.locator('#main button.mode a').count()===0&&await p.locator('#main button a').count()===0,`${W}px: no link inside a button`);
    const first=await p.locator('#main button.mode').first().innerText();
    ok(/First words with a link in them/.test(first)&&/Not started/.test(first),`${W}px: the first card's teaser reads the paragraph's words (link text, no link), and says Not started: ${JSON.stringify(first)}`);
    ok(await p.locator('#main .cd-meta').innerText()==='7 activities',`${W}px: the screen leads with a meta line`);
    {const g=await p.evaluate(()=>{const r=e=>e.getBoundingClientRect(),m=r(document.querySelector('#main')),c=[...document.querySelectorAll('#main button.mode')].map(r),h=r(document.querySelector('#main h2'));
       return {left:Math.min(...c.map(x=>x.left))-m.left,right:m.right-Math.max(...c.map(x=>x.right)),h:h.left-Math.min(...c.map(x=>x.left)),w:Math.max(...c.map(x=>x.width)),rem:parseFloat(getComputedStyle(document.documentElement).fontSize)};});
     ok(Math.abs(g.left-g.right)<=2&&Math.abs(g.h)<=2&&g.w<=48*g.rem+2,`${W}px: the cards are one centred column, and the title lines up with them (${JSON.stringify(g)})`);}
    ok(await over()<=0,`${W}px: the module screen does not scroll sideways`);
    const sizes=await p.evaluate(()=>[...document.querySelectorAll('#main button.mode')].map(c=>Math.round(c.getBoundingClientRect().height)));
    ok(sizes.every(h=>h>=44),`${W}px: every card is at least 44 px tall`);

    /* the status line follows the answers; Next steps through; the last has no Next */
    await p.locator('#main button.mode').nth(1).click();await wait(500);
    ok(await view()==='m/a1','the second card opens the second activity');
    await p.locator('#main textarea').first().fill('something');await wait(300);
    await p.locator('.cd-back').click();await wait(400);
    ok(await view()==='module:m'&&/1 of 2 answered/.test(await p.locator('#main button.mode').nth(1).innerText()),`${W}px: Back to the overview returns to the module, and its card now says 1 of 2 answered`);
    ok(/1 of 7 started/.test(await p.locator('#main .cd-meta').innerText()+' 1 of 7 started')&&/1 started/.test(await p.locator('#main .cd-meta').innerText()),`${W}px: the meta line counts what is started`);
    await p.locator('#main button.mode').first().click();await wait(500);
    const seen=[await view()];
    for(let i=0;i<6;i++){const n=p.locator('.cd-next');if(!await n.count()) break;
      const label=await n.innerText();ok(new RegExp('^Next: '+(i+2)+'\\. ').test(label),`${W}px: Next names the next activity with its number (${label})`);
      await n.click();await wait(400);seen.push(await view());}
    ok(seen.join()==='m/a0,m/a1,m/a2,m/a3,m/a4,m/a5,m/a6'&&await p.locator('.cd-next').count()===0,`${W}px: Next steps through the whole module in file order and the last activity has none (${seen.join()})`);
    ok(await p.locator('.cd-back').count()===1&&(await p.locator('.cd-btn').evaluateAll(bs=>bs.every(x=>x.getBoundingClientRect().height>=44))),`${W}px: the foot's buttons are 44 px`);

    /* folding: a folded hint, solution and group */
    await load(folds);
    ok(await view()==='a',`${W}px: the folding fixture opens in its activity`);
    const cards=await p.locator('#main details.card-fold').count();
    ok(cards===3,`${W}px: three folded cards (${cards})`);
    const txt=await p.locator('#main').innerText();
    ok(!/THE-SECRET/.test(txt),`${W}px: no hint or solution text is visible while they are closed`);
    const sums=await p.locator('#main details.card-fold > summary').allInnerTexts();
    ok(/^Hint$/m.test(sums[0].trim())&&/^Solution$/m.test(sums[1].trim()),`${W}px: the summaries say Hint and Solution, not the raw kind (${JSON.stringify(sums.slice(0,2))})`);
    ok(sums[0].trim()==='Hint'&&sums[1].trim()==='Solution',`${W}px: a hint and a solution show no teaser (${JSON.stringify(sums.slice(0,2))})`);
    ok(/Extra reading/.test(sums[2])&&/Words that open the group/.test(sums[2])&&sums[2].split('Extra reading').length===2,`${W}px: the folded group shows its title once and its first words (${JSON.stringify(sums[2])})`);
    ok(await p.locator('#main details.card-fold').nth(2).locator('summary .cd-tile').innerText()==='🌱'&&!/🌱/.test(await p.locator('#main details.card-fold').nth(2).locator('summary .k').innerText()),`${W}px: the group's leading emoji is its picture, not part of its title`);
    ok(await p.locator('#main details.card-fold').nth(0).locator('.cd-body').isVisible()===false,`${W}px: a closed hint's body is not shown`);
    await p.locator('#main details.card-fold').nth(0).locator('summary').click();await wait(200);
    ok(/THE-SECRET-HINT/.test(await p.locator('#main').innerText())&&!/THE-SECRET-ANSWER/.test(await p.locator('#main').innerText()),`${W}px: opening the hint shows the hint, and only the hint`);
    const hs=await p.locator('#main details.card-fold > summary').evaluateAll(ss=>ss.map(s=>Math.round(s.getBoundingClientRect().height)));
    ok(hs.every(h=>h>=44),`${W}px: a fold card's summary is at least 44 px (${hs})`);
    ok(await p.locator('#main svg[aria-hidden="true"]').count()>=3&&await p.locator('#main .cd-chev:not([aria-hidden="true"])').count()===0,`${W}px: the chevrons are aria-hidden`);

    /* a hint or solution with no question right before it is still a hint or a solution */
    await load(orphans);
    {const sm=(await p.locator('#main details.card-fold > summary').allInnerTexts()).map(x=>x.trim());
     ok(sm.join('|')==='Hint|Hint|Solution',`${W}px: orphan hints and solutions say Hint or Solution and show no teaser (${JSON.stringify(sm)})`);
     ok(!/ORPHAN-SECRET/.test(await p.locator('#main').innerText()),`${W}px: no orphan answer text is visible while they are closed`);}
    await load(folds);
    /* print: the cards print open and the chevrons go */
    await p.emulateMedia({media:'print'});await wait(200);
    const pr=await p.evaluate(()=>{const d=document.querySelectorAll('#main details.card-fold');return {body:[...d].map(x=>x.querySelector('.cd-body').getBoundingClientRect().height>0),chev:[...document.querySelectorAll('#main .cd-chev')].map(c=>getComputedStyle(c).display)};});
    ok(pr.body.every(Boolean)&&pr.chev.every(x=>x==='none'),`${W}px print: every folded card prints open, with no chevron (${JSON.stringify(pr)})`);
    await p.emulateMedia({media:'screen'});

    /* focus ring on Night */
    await p.evaluate(()=>window.bookletTheme.set('night'));await wait(200);
    await p.locator('#main details.card-fold').nth(1).locator('summary').focus();await p.keyboard.press('Shift+Tab');await p.keyboard.press('Tab');await wait(100);
    const ring=await p.evaluate(()=>{const s=document.activeElement,c=getComputedStyle(s),bg=getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
      return {tag:s.tagName,style:c.outlineStyle,w:parseFloat(c.outlineWidth),col:c.outlineColor,bg:getComputedStyle(document.body).backgroundColor};});
    const lum=c=>{const m=c.match(/[\d.]+/g).map(Number).slice(0,3).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*m[0]+0.7152*m[1]+0.0722*m[2];};
    const ratio=(a,c)=>{const x=lum(a),y=lum(c);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
    ok(ring.style!=='none'&&ring.w>=2&&ratio(ring.col,ring.bg)>=3,`${W}px Night: a focused card shows a ring of at least 3:1 (${JSON.stringify(ring)}, ${ratio(ring.col,ring.bg).toFixed(2)}:1)`);
    await p.evaluate(()=>window.bookletTheme.set('paper'));
    ok(await over()<=0,`${W}px: the folded page does not scroll sideways`);
    ok(errs.length===0,`${W}px: no page errors ${errs.join('|')}`);
    await ctx.close();}
  /* reduced motion: the chevron does not turn by transition */
  {const ctx=await b.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});const p=await ctx.newPage();
   await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}}));
   await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(500);
   await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(250);
   await p.locator('#pasteIn').fill(six);await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(800);
   const t=await p.evaluate(()=>[...document.querySelectorAll('#main .cd-chev'),...document.querySelectorAll('#main button.card-go')].map(x=>getComputedStyle(x).transitionDuration));
   ok(t.length>0&&t.every(x=>/^0s(, 0s)*$/.test(x)),`reduced motion: chevrons and cards have no transition (${[...new Set(t)]})`);
   await ctx.close();}
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);})();
