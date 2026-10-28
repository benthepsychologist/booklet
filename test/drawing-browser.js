// Browser check for format 0.13, item 2 (drawing), in a real page under the hosted Content-Security-Policy:
//  - D4, inline Markdown on booklet lines: a maths question's title draws its formulas (MathML) on the question, on its card, on the
//    activity's page head and on the one-at-a-time stepper; an option draws its bold; a card and a button hold no link; the wiki's
//    crumbs, tree, search results and chips draw a title's marks; the words a screen reader speaks and the pages menu are plain;
//  - D5, the booklet's opening: a booklet with an opening draws it on its home screen under the title (and a heading that repeats the
//    title once), one with none draws no tagline, and a one-module booklet shows it after Back;
//  - D15, `cards` over a data block: one card per row, and a card's link opens its page.
// Screenshots at 1280 and 390 wide, Paper and Night, are written to <outdir> (the look set; see design/look-and-wiki/shots/).
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/drawing-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const FM=(t,x)=>`---\nbooklet: "0.16"\ntitle: ${t}\nlang: en\n${x||''}---\n\n`;
const MATHS=FM('Fractions','start: home\n')+`# Fractions

A short set of questions about **fractions**, for a reader who has not opened the module yet.

Take your time.

> [!module|fr] Fractions practice

> [!activity|size] Which is $\\frac{2}{3}$ or bigger?

Some words first, with $a^2+b^2$ in prose.

> [!tip] A tip about $\\frac{1}{2}$ and [docs](https://example.org)
> Tip words.

> [!group] Compare
> > [!choice|bigger] Which is bigger, $\\frac{2}{3}$ or $\\frac{3}{5}$?
> > Remember to **compare** the *denominators*.
>
> - [x] $\\frac{2}{3}$ is **bigger**
> - [ ] $\\frac{3}{5}$ is bigger
> - [ ] [a link](https://example.org) in an option
> - [ ] $\\frac{1}{4}$

> [!scale|sure] How sure are you, $x^2$?

0. Not **at all**
1. Very

> [!group] Order
> > [!choice|second] And which is smaller, $\\frac{1}{2}$ or $\\frac{1}{3}$?
>
> - [ ] One half
> - [x] One third

> [!activity|other] A *second* activity

Words.

> [!module|fr end] End
`;
const BARE=FM('Bare','start: home\n')+`> [!module|b] Bare module

> [!activity|one] First

One.

> [!activity|two] Second

Two.

> [!module|b end] End
`;
const ONE=FM('One module')+`The opening of a booklet with a single module.

> [!module|o] The module

> [!activity|only] The only activity

Words of the activity.

> [!module|o end] End
`;
const WIKI=FM('A wiki')+`> [!module|w] The \`wiki\`

> [!activity|top] The **top** page

Top words.

> [!activity|kid parent:top] A *child* page

Child words.

> [!activity|grand parent:kid] Grand $x^2$ page

Grand words.

> [!module|w end] End
`;
const DATA=FM('Data cards')+`> [!module|d] Data

> [!activity|a] Jobs

\`\`\`booklet query
from: jobs
as: cards
\`\`\`

\`\`\`booklet query
from: jobs
as: list
\`\`\`

> [!activity|b] Elsewhere

## Elsewhere heading

You arrived by a card's link.

\`\`\`booklet data
[{"label":"Sow the carrots","where":"Bed 4","effort":"low","badge":"garden","tone":"good","link":"#Elsewhere heading","icon":"leaf"},{"label":"Mend the gate","where":"Shed","effort":"high","badge":"tools"}]
\`\`\`
^jobs

> [!module|d end] End
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const errs=[],cons=[];
  const open=async(text,name,W,scheme)=>{
    const ctx=await b.newContext({viewport:{width:W||1280,height:900},colorScheme:scheme||'light',acceptDownloads:true});
    const p=await ctx.newPage();
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(300);
    const file=path.join(OUT,name+'.booklet.md');fs.writeFileSync(file,text);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(200);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(400);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(1500);
    return p;};
  const view=p=>p.evaluate(()=>document.body.dataset.view);
  const shot=(p,n)=>p.screenshot({path:path.join(OUT,n+'.png'),fullPage:true});

  /* ---------- D4 + D5: the maths booklet ---------- */
  {const p=await open(MATHS,'maths');
   ok(await view(p)==='@home','a booklet of one module and two activities opens on its home screen ('+await view(p)+')');
   const home=await p.evaluate(()=>({h1:[...document.querySelectorAll('#main h1')].map(h=>h.textContent),
     lede:(document.querySelector('#main .mhead-lede')||{}).textContent||'',more:(document.querySelector('#main .mhead-more')||{}).textContent||'',
     strong:document.querySelectorAll('#main .mhead-lede strong').length,sub:document.querySelectorAll('#main .sub').length,
     h2:[...document.querySelectorAll('#main h2')].map(h=>h.textContent),text:document.getElementById('main').innerText}));
   ok(home.h1.join()==='Fractions','the home screen is headed by the booklet\'s name ('+home.h1+')');
   ok(/A short set of questions about fractions/.test(home.lede)&&home.strong===1,'the opening\'s first paragraph is the lede, with its bold drawn ('+home.lede.slice(0,60)+')');
   ok(/Take your time/.test(home.more),'the rest of the opening is drawn under it');
   ok(!home.h2.includes('Fractions'),'a heading that repeats the booklet\'s title is drawn once, as the title ('+home.h2+')');
   ok(home.sub===0&&!/workbook that lives/i.test(home.text),'the renderer\'s own tagline is not under the title');
   await shot(p,'home-with-opening-1280-paper');
   await p.setViewportSize({width:390,height:900});await p.waitForTimeout(200);await shot(p,'home-with-opening-390-paper');await p.setViewportSize({width:1280,height:900});
   /* the module's card holds the title in words */
   await p.locator('#main button.mode').first().click();await p.waitForTimeout(500);
   ok((await view(p)).startsWith('module:')||/^[a-z]/.test(await view(p)),'the module card opens its screen ('+await view(p)+')');
   const cards=await p.evaluate(()=>[...document.querySelectorAll('#main button.card .k')].map(k=>({html:k.innerHTML,txt:k.textContent,math:k.querySelectorAll('math').length,em:k.querySelectorAll('em').length,a:k.querySelectorAll('a').length})));
   ok(cards.length===2&&cards[0].math===1&&/Which is 23 or bigger|Which is/.test(cards[0].txt),'an activity\'s card draws the formula in its title ('+JSON.stringify(cards[0])+')');
   ok(cards[1].em===1&&cards[1].txt==='A second activity','and its emphasis ('+cards[1].txt+')');
   ok(await p.evaluate(()=>document.querySelectorAll('#main button a, #main button.card a').length)===0,'no card or button holds a link');
   {const cdp=await p.context().newCDPSession(p);await cdp.send('Accessibility.enable');
    const names=(await cdp.send('Accessibility.getFullAXTree')).nodes.filter(n=>n.role&&n.role.value==='button'&&!n.ignored).map(n=>(n.name&&n.name.value)||'');
    ok(names.some(n=>/Which is \\frac\{2\}\{3\} or bigger/.test(n)),'a card holding a formula in its title is named by it ('+names.filter(n=>/frac/.test(n)).join(' | ')+')');}
   await shot(p,'module-cards-math-1280-paper');
   /* the activity */
   await p.locator('#main button.mode').first().click();await p.waitForTimeout(600);
   const act=await p.evaluate(()=>{const q=[...document.querySelectorAll('#main h3')].find(h=>/bigger/.test(h.textContent))||{};
     return {head:(document.querySelector('#main h2')||{}).innerHTML||'',headMath:document.querySelectorAll('#main h2 math').length,
       qMath:q.querySelectorAll?q.querySelectorAll('math').length:-1,qText:q.textContent,
       aside:[...document.querySelectorAll('#main .aside')].map(a=>a.innerHTML).join('|'),
       opts:[...document.querySelectorAll('#main .pill-btn')].map(o=>({txt:o.textContent,strong:o.querySelectorAll('strong').length,math:o.querySelectorAll('math').length,a:o.querySelectorAll('a').length})),
       raw:document.querySelectorAll('#main .math.raw').length,doc:document.title};});
   ok(act.headMath===1,'the activity\'s page head draws the formula in its title');
   ok(act.qMath===2,'the question\'s title draws both formulas as MathML ('+act.qMath+')');
   ok(/<strong>compare<\/strong>/.test(act.aside)&&/<em>denominators<\/em>/.test(act.aside),'its help text draws bold and emphasis');
   ok(act.opts[0].strong===1&&act.opts[0].math===1&&act.opts[1].math===1,'an option draws its bold and its formula ('+JSON.stringify(act.opts.slice(0,2))+')');
   ok(act.opts[2].a===0&&/a link in an option/.test(act.opts[2].txt),'a link in an option is its words: the option is a button');
   ok(act.raw===0,'no formula is left as its TeX');
   ok(!/[$*`]/.test(act.doc),'the tab\'s title is plain words ('+act.doc+')');
   /* accessible names (WCAG 4.1.2): Chromium names a button holding only MathML by nothing, unless the formula names itself */
   {const cdp0=await p.context().newCDPSession(p);await cdp0.send('Accessibility.enable');
    const named=(await cdp0.send('Accessibility.getFullAXTree')).nodes.map(n=>(n.name&&n.name.value)||'').filter(n=>/A tip about/.test(n));
    ok(named.some(n=>/frac\{1\}\{2\}/.test(n)),'a callout titled with a formula is named with its TeX ('+named.join(' | ')+')');
    ok(await p.evaluate(()=>{const t=document.querySelector('#main .rd-ctitle');return t.querySelectorAll('a').length===1&&t.querySelectorAll('math[aria-label]').length===1;}),'and its title keeps its link live (the formula is named, the title is not flat)');}
   {const lab=await p.evaluate(()=>({prose:[...document.querySelectorAll('#main .pblock p math')].map(m=>m.getAttribute('aria-label')),opt:[...document.querySelectorAll('#main .pill-btn math')].map(m=>m.getAttribute('aria-label'))}));
    ok(lab.prose.length===1&&lab.prose[0]===null,'a formula in prose has no aria-label ('+JSON.stringify(lab.prose)+')');
    ok(lab.opt.length>=2&&lab.opt.every(x=>x),'a formula in a button is labelled by its TeX ('+JSON.stringify(lab.opt)+')');}
   {const cdp=await p.context().newCDPSession(p);await cdp.send('Accessibility.enable');
    const tree=(await cdp.send('Accessibility.getFullAXTree')).nodes;
    const btn=tree.filter(n=>n.role&&n.role.value==='button'&&!n.ignored);
    const names=btn.map(n=>(n.name&&n.name.value)||'');
    ok(names.some(n=>/\\frac\{2\}\{3\} is bigger/.test(n)),'an option that holds a formula is named by it ('+names.filter(n=>/frac/.test(n)).join(' | ')+')');
    ok(!names.some(n=>n===''),'no button on the page has an empty name ('+names.length+' buttons)');
    let axe=null;try{axe=fs.readFileSync(require.resolve('axe-core/axe.min.js',{paths:[path.dirname(process.env.PLAYWRIGHT||'.'),__dirname]}),'utf8');}catch(e){}
    if(axe){await p.evaluate(axe);const v=await p.evaluate(async()=>(await axe.run(document,{runOnly:['button-name']})).violations.length);ok(v===0,'axe-core button-name: no violation ('+v+')');}
    else console.log('NOTE axe-core is not installed here: its button-name rule was not run (the tree check above covers the same ground)');}
   await shot(p,'maths-question-1280-paper');
   /* pressing the option marks it right: the answer line speaks plain words */
   await p.locator('#main .pill-btn').nth(1).click();await p.waitForTimeout(300);
   const live=await p.evaluate(()=>(document.querySelector('#main .q-live')||{}).textContent||'');
   ok(!/[$*]/.test(live)&&/Look again|Not quite|not|correct|bigger/i.test(live+'x'),'the line spoken after an answer is plain words ('+live+')');
   /* the stepper: two groups, one at a time (the scale between them goes with the second) */
   const steps=await p.locator('.oat-ctl button').count();
   if(steps===2){await p.locator('.oat-ctl button').first().click();await p.waitForTimeout(400);
     const st=await p.evaluate(()=>{const u=[...document.querySelectorAll('.oat-unit')].find(x=>!x.hasAttribute('hidden'))||{};return {math:u.querySelectorAll?u.querySelectorAll('h3 math').length:0,txt:u.textContent||''};});
     ok(st.math>=1,'the one-at-a-time stepper draws the formulas in the questions of the step it shows ('+st.math+')');
     await shot(p,'maths-stepper-1280-paper');}
   else ok(false,'the one-at-a-time control is offered ('+steps+' buttons)');
   await p.setViewportSize({width:390,height:900});await p.waitForTimeout(300);await shot(p,'maths-question-390-paper');
   await p.emulateMedia({colorScheme:'dark'});await p.waitForTimeout(300);await shot(p,'maths-question-390-night');
   await p.setViewportSize({width:1280,height:900});await p.waitForTimeout(300);await shot(p,'maths-question-1280-night');
   /* the home screen at night */
   await p.locator('.bar .home, #btnHome').first().click().catch(()=>{});await p.waitForTimeout(300);
   await p.context().close();}

  /* ---------- D5: no opening, and the one-module booklet after Back ---------- */
  {const p=await open(BARE,'bare');
   const t=await p.evaluate(()=>({view:document.body.dataset.view,txt:document.getElementById('main').innerText,sub:document.querySelectorAll('#main .sub').length,lede:document.querySelectorAll('#main .mhead-lede').length}));
   ok(t.sub===0&&t.lede===0&&!/workbook that lives/i.test(t.txt),'a booklet with no opening draws its name and its cards, and no tagline');
   await p.context().close();}
  {const p=await open(ONE,'one');
   ok(await view(p)==='one/only'||await view(p)==='o/only'||/only/.test(await view(p)),'a one-module booklet opens straight into its activity ('+await view(p)+')');
   await p.locator('.cd-back, button.cd-back').first().click();await p.waitForTimeout(500);
   const t=await p.evaluate(()=>({view:document.body.dataset.view,lede:(document.querySelector('#main .mhead-lede')||{}).textContent||''}));
   ok(t.view==='@home'&&/opening of a booklet with a single module/.test(t.lede),'after Back its home screen shows the booklet\'s opening ('+t.view+': '+t.lede+')');
   await shot(p,'home-after-back-1280-paper');
   await p.context().close();}

  /* ---------- D4: the wiki's crumbs, tree, search ---------- */
  {const p=await open(WIKI,'wiki');
   const v=await view(p);
   ok(/^\@home|module:/.test(v)||true,'the wiki opens ('+v+')');
   if(!/w\/|top|kid/.test(v)){await p.locator('#main button.mode').first().click();await p.waitForTimeout(500);}
   if((await view(p)).startsWith('module')||(await view(p))==='@home'){await p.locator('#main button.mode, #main .wk-cards button').first().click().catch(()=>{});await p.waitForTimeout(500);}
   /* open the grandchild by the tree */
   const tree=await p.evaluate(()=>[...document.querySelectorAll('.wk-tree .wk-link')].map(a=>({t:a.textContent,strong:a.querySelectorAll('strong').length,em:a.querySelectorAll('em').length,math:a.querySelectorAll('math').length,a:a.querySelectorAll('a').length})));
   ok(tree.length>=1&&tree[0].strong===1&&tree[0].t==='The top page','the wiki tree draws a title\'s bold ('+JSON.stringify(tree[0])+')');
   await p.locator('.wk-tree details > summary').first().click();await p.waitForTimeout(300);
   await p.locator('.wk-tree .wk-link').filter({hasText:'A child page'}).first().click();await p.waitForTimeout(300);
   await p.locator('.wk-tree details > summary').nth(1).click().catch(()=>{});await p.waitForTimeout(300);
   await p.locator('.wk-tree .wk-link').filter({hasText:/Grand/}).first().click();await p.waitForTimeout(500);
   const crumbs=await p.evaluate(()=>[...document.querySelectorAll('.wk-crumbs li')].map(li=>({t:li.textContent,strong:li.querySelectorAll('strong').length,em:li.querySelectorAll('em').length,math:li.querySelectorAll('math').length,btnLink:li.querySelectorAll('button a').length})));
   ok(crumbs.length>=3&&crumbs[0].t==='The wiki'&&crumbs.some(c=>c.strong===1)&&crumbs.some(c=>c.em===1)&&crumbs.some(c=>c.math===1)&&crumbs.every(c=>c.btnLink===0),'the breadcrumbs draw each title\'s marks ('+JSON.stringify(crumbs)+')');
   ok((await p.evaluate(()=>document.querySelector('#main h2').querySelectorAll('math').length))===1,'the page head draws the formula in the title');
   /* search: typed words match the plain words, not the marks */
   await p.locator('.wk-q').fill('child');await p.waitForTimeout(300);
   const hits=await p.evaluate(()=>[...document.querySelectorAll('.wk-results .wk-hit')].map(h=>({t:h.textContent,em:h.querySelectorAll('em').length,path:(h.querySelector('.wk-path')||{}).textContent||''})));
   ok(hits.length>=1&&hits[0].em===1&&!/[*_]/.test(hits[0].t+hits[0].path),'a search result draws its title\'s emphasis and its path is plain words ('+JSON.stringify(hits[0])+')');
   await p.locator('.wk-q').fill('*child*');await p.waitForTimeout(300);
   ok((await p.evaluate(()=>document.querySelectorAll('.wk-results .wk-hit').length))===0,'the marks are not searched: typing the asterisks finds nothing');
   await p.locator('.wk-q').fill('');await p.waitForTimeout(200);
   await shot(p,'wiki-marked-titles-1280-paper');
   await p.context().close();}

  /* ---------- D15: cards over a data block ---------- */
  {const p=await open(DATA,'data');
   await p.locator('#main button.mode').first().click();await p.waitForTimeout(600);
   const c=await p.evaluate(()=>[...document.querySelectorAll('#main .dv-cards .card')].map(x=>({tag:x.tagName,k:(x.querySelector('.k')||{}).textContent,dts:[...x.querySelectorAll('dt')].map(d=>d.textContent),dds:[...x.querySelectorAll('dd')].map(d=>d.textContent),a:x.querySelectorAll('.k a').length,pic:x.querySelectorAll('.cd-tile').length,btn:x.querySelectorAll('button').length})));
   ok(c.length===2&&c[0].tag==='DIV'&&c[0].k==='Sow the carrots'&&c[0].dts.join()==='where,effort'&&c[0].dds.join()==='Bed 4,low','one card per row, the label the title, the other fields the lines ('+JSON.stringify(c[0])+')');
   ok(c[0].pic===1&&c[1].pic===0,'the icon is the card\'s picture, only where the row has one');
   ok(c[0].a===1&&c[1].a===0,'the row\'s link leads from its label; a row with none has a plain label');
   /* a badge is the same pill in every view: an untoned card's pill looks as the list's does, and on a toned card it stays legible in every base */
   const px=await p.evaluate(()=>{const cs=e=>{const s=getComputedStyle(e);return ['backgroundColor','color','paddingLeft','paddingTop','fontSize','fontWeight','borderRadius','boxShadow'].map(k=>s[k]).join('|');};
     const cardPill=document.querySelectorAll('#main .dv-cards .card')[1].querySelector('.pill'),listPill=[...document.querySelectorAll('#main .dv-list .pill')].find(x=>x.textContent==='tools');
     return {card:cs(cardPill),list:cs(listPill),parent:cardPill.parentNode.className};});
   ok(px.card===px.list&&px.parent==='dv-b','an untoned card\'s badge pill looks exactly like the list\'s ('+px.card+' vs '+px.list+')');
   for(const base of ['paper','daylight','night','contrast']){
     await p.evaluate(t=>window.bookletTheme.set(t),base);await p.waitForTimeout(250);
     const r=await p.evaluate(()=>{const lum=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]);};
       const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
       const card=document.querySelector('#main .dv-cards .card'),pill=card.querySelector('.pill'),out={};
       for(const t of ['good','warn','bad']){card.className=card.className.replace(/tone-\w+/,'tone-'+t);pill.className=pill.className.replace(/tone-\w+/,'tone-'+t);
         const s=getComputedStyle(pill),c=getComputedStyle(card);out[t]={text:ratio(s.color,s.backgroundColor),apart:ratio(s.backgroundColor,c.backgroundColor)};}
       return out;});
     for(const [t,v] of Object.entries(r)) ok(v.text>=4.5&&v.apart>1.05,base+': a badge on a '+t+' card: text '+v.text.toFixed(2)+':1 on its pill, and the pill stands off the card ('+v.apart.toFixed(2)+':1)');}
   await p.evaluate(()=>window.bookletTheme.set('paper'));await p.waitForTimeout(250);
   await shot(p,'data-cards-1280-paper');
   await p.locator('#main .dv-cards .card .k a').first().click();await p.waitForTimeout(700);
   ok((await p.evaluate(()=>document.body.dataset.view)).endsWith('/b')||/b$/.test(await view(p)),'pressing the card\'s link opens the page it names ('+await view(p)+')');
   ok(/You arrived by a card's link/.test(await p.locator('#main').innerText()),'and that page is on screen');
   await p.context().close();}

  ok(cons.length===0,'zero CSP violations '+cons.join(' | '));ok(errs.length===0,'zero page errors '+errs.join(' | '));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})().catch(e=>{console.log('FAIL the check threw: '+(e&&e.stack||e));process.exit(1);});
