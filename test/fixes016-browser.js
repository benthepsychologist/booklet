// Browser check of the renderer fixes of 0.16 (lane 3), in a real Chromium with the hosted /app/ Content-Security-Policy.
// Each is a behaviour of booklet.html a reader meets; each check fails with its fix taken out.
//  1. a `readonly` body widget with no figure names its places from `regions`;
//  2. a kept entry's card names each body place's words ("Feet — Restless, Sore");
//  3. a stored word that holds a comma stays one word after its field is focused and left, and dictation (words and commas
//     typed in) still works;
//  4. a sense word typed as the reader's own presses that word's button, and pressing it never adds it twice;
//  5. a press right after typing in a widget's field lands (an own word, a summary row, a region button), and so does one in a
//     choice's Add-your-own field's neighbourhood (an option);
//  6. an own word typed in a grid cell leaves the answer in the order the reader picked;
//  7. words typed in a choice or multi's Add-your-own field are added when the field is left, and when the page is hidden,
//     closed or reloaded, as Enter or Add would add them; on a choice they replace the pick.
// Invented content. Usage: PLAYWRIGHT=/path/to/node_modules/playwright-core node test/fixes016-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const FIG='<svg viewBox="0 0 100 100"><circle class="rg" data-r="head" cx="50" cy="20" r="14"/><rect class="rg" data-r="chest" x="30" y="40" width="40" height="30"/><rect class="rg" data-r="feet" x="30" y="75" width="40" height="15"/></svg>';
const BODY=JSON.stringify({engine:'svg-regions',figures:[{id:'front',label:'Front',svg:FIG,regions:['head','chest','feet']}],
  regions:[{id:'head',label:'Head'},{id:'chest',label:'Chest'},{id:'feet',label:'Feet'}],
  senses:[{id:'feel',label:'Feels',words:[{id:'restless',label:'Restless'},{id:'sore',label:'Sore'},{id:'warm',label:'Warm, tender'}]}],
  chips:['head','chest','feet'],copy:{h:'',p:'',none:'Pick a place.',pick:'Pick words.',clear:'Clear'}});
const NOFIG=JSON.stringify({engine:'svg-regions',figures:[],regions:[{id:'head',label:'Head'},{id:'feet',label:'Feet'}],senses:[],chips:[],
  copy:{h:'',p:'',none:'',pick:'',clear:'Clear'}});
const GRID=JSON.stringify({engine:'grid-select',axes:{top:'more',bottom:'less',left:'unpleasant',right:'pleasant'},
  cells:[{id:'a',label:'Agitating',color:'warm'},{id:'b',label:'Invigorating',color:'green'},{id:'c',label:'Draining',color:'slate'},{id:'d',label:'Soothing',color:'teal'}],
  items:[{id:'i1',cell:'a',label:'Tense'},{id:'i2',cell:'a',label:'Wired'},{id:'i3',cell:'b',label:'Curious'},{id:'i4',cell:'d',label:'Warm, tender'}]});
const FILE=`---
booklet: "0.16"
title: Fixes
lang: en
---

# Fixes

> [!module|fx] Fixes

> [!activity|one] One

> [!choice|c1 open] Pick or add one?
- [ ] Red
- [ ] Blue

> [!multi|m1 open] Pick or add several?
- [ ] Red
- [ ] Blue

> [!widget|body] Body
> ![[#^body-data]]

\`\`\`booklet widget
${BODY}
\`\`\`
^body-data

> [!widget|grid] Feelings
> ![[#^grid-data]]

\`\`\`booklet widget
${GRID}
\`\`\`
^grid-data

> [!widget|nofig readonly] No figure
> ![[#^nofig-data]]

\`\`\`booklet widget
${NOFIG}
\`\`\`
^nofig-data

> [!activity|log repeat] Log

> [!widget|bodylog] Body log
> ![[#^body-data]]

> [!module|fx end] End
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'fixes016.booklet.md');fs.writeFileSync(file,FILE);
  const b=await chromium.launch();
  const open=async W=>{
    const ctx=await b.newContext({viewport:{width:W,height:900}});
    const p=await ctx.newPage();
    p.__bad=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))p.__bad.push(m.text());});p.on('pageerror',e=>p.__bad.push(e.message));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    if(!(await p.locator('#main .ap-body').count())){if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(500);}
      await p.locator('button.mode').first().click();await p.waitForTimeout(700);}
    /* the module has two activities: its screen lists them, and the first is opened */
    if(!(await p.locator('#main .ap-body').count())){await p.locator('button.mode').first().click();await p.waitForTimeout(700);}
    return p;};
  const ans=(p,k)=>p.evaluate(k=>JSON.stringify(((STATE.answers||{}).fx||{})[k]),k);
  const body=p=>p.locator('#main .bodywrap').first();
  const field=p=>p.locator('#main .sensepanel input.field');
  const sense=(p,t)=>p.locator('#main .sensepanel button.sense',{hasText:new RegExp('^'+t+'$')});
  const senses=p=>p.locator('#main .sensepanel button.sense').evaluateAll(bs=>bs.map(x=>x.textContent+':'+x.getAttribute('aria-pressed')).join(' '));
  const pickPlace=async(p,name)=>{await body(p).locator('.bodychips button',{hasText:name}).click();await p.waitForTimeout(80);};
  const cell=(p,i)=>p.locator('#main .quad .q').nth(i);
  const settle=p=>p.waitForTimeout(120);

  /* ---- 1. a read-only widget with no figure names its places from `regions` ---- */
  let p=await open(1280);
  const names=await p.evaluate(()=>[...document.querySelectorAll('#main .bodywrap')].pop().querySelectorAll('.bodychips .emw').length+':'+
    [...[...document.querySelectorAll('#main .bodywrap')].pop().querySelectorAll('.bodychips .emw')].map(x=>x.textContent).join());
  ok(names==='2:Head,Feet','1: a read-only body widget with no figure names its places from `regions` ('+names+')');

  /* ---- 3. a stored word with a comma stays one word ---- */
  await pickPlace(p,'Feet');
  await sense(p,'Warm, tender').click();await settle(p);
  ok(await ans(p,'body')==='[{"id":"feet","s":["warm"]}]','3: set up: the sense word "Warm, tender" is stored as one word '+await ans(p,'body'));
  ok(await field(p).inputValue()==='Warm, tender','3: ...and the field shows it');
  await field(p).click();await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'body')==='[{"id":"feet","s":["warm"]}]','3: focusing the words field and leaving it leaves the word whole, not "Warm" and "tender" '+await ans(p,'body'));
  /* a word of the reader's own that holds a comma (a file can hold one), in a grid cell */
  await p.evaluate(()=>{STATE.answers.fx.grid=['x|a|pace, rest','i4'];render();});await p.waitForTimeout(200);
  const gf=cell(p,0).locator('input.field');
  await gf.click();await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'grid')==='["x|a|pace, rest","i4"]','3: a grid cell\'s own word that holds a comma is still one word after its field is left '+await ans(p,'grid'));
  const gf3=cell(p,3).locator('input.field');
  await gf3.click();await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'grid')==='["x|a|pace, rest","i4"]','3: ...and an item whose label holds a comma stays the item '+await ans(p,'grid'));
  /* dictation: words and commas arrive as text, and the last word is taken when the field is left */
  await p.evaluate(()=>{STATE.answers.fx.grid=[];render();});await p.waitForTimeout(200);
  await cell(p,1).locator('input.field').click();await p.keyboard.type('calm, bright, glow');
  await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'grid')==='["x|b|calm","x|b|bright","x|b|glow"]','3: dictated words are still added, the last one when the field is left '+await ans(p,'grid'));
  await p.evaluate(()=>{STATE.answers.fx.grid=[];render();});await p.waitForTimeout(200);

  /* ---- 4. a sense word typed as an own word presses its button; pressing never adds it twice ---- */
  await p.evaluate(()=>{delete STATE.answers.fx.body;render();});await p.waitForTimeout(200);
  await pickPlace(p,'Head');
  await field(p).click();await p.keyboard.type('Restless, ');await settle(p);
  ok(await ans(p,'body')==='[{"id":"head","s":["restless"]}]','4: typing a sense word\'s label stores that word '+await ans(p,'body'));
  ok((await senses(p)).startsWith('Restless:true'),'4: ...and its button is pressed ('+await senses(p)+')');
  await sense(p,'Sore').click();await settle(p);
  ok(await ans(p,'body')==='[{"id":"head","s":["restless","sore"]}]','4: pressing another word\'s button adds it after the typed one '+await ans(p,'body'));
  await sense(p,'Restless').click();await settle(p);
  ok(await ans(p,'body')==='[{"id":"head","s":["sore"]}]','4: pressing the typed word\'s button takes it out, once (before: it added it a second time) '+await ans(p,'body'));
  await sense(p,'Restless').click();await settle(p);
  ok(await ans(p,'body')==='[{"id":"head","s":["sore","restless"]}]','4: pressed again it is back, once '+await ans(p,'body'));
  /* typed with no comma after it, the word is taken when the field is left; the press that leaves it (a button for it) lands */
  await p.evaluate(()=>{delete STATE.answers.fx.body;render();});await p.waitForTimeout(200);
  await pickPlace(p,'Head');
  await field(p).click();await p.keyboard.type('Sore, Restless');await sense(p,'Sore').click();await settle(p);
  ok(await ans(p,'body')==='[{"id":"head","s":["restless"]}]','4: typing two words and pressing the first one\'s button takes it out, never twice '+await ans(p,'body'));

  /* ---- 5. a press right after typing lands ---- */
  /* grid-select: an own word is stored, a different one typed, then the stored one pressed */
  await p.evaluate(()=>{STATE.answers.fx.grid=['x|a|zest'];render();});await p.waitForTimeout(200);
  await cell(p,0).locator('input.field').click();await p.keyboard.press('End');await p.keyboard.type(', fizzy');
  await cell(p,0).locator('button.emb',{hasText:'zest'}).click();await settle(p);
  ok(await ans(p,'grid')==='["x|a|fizzy"]','5: grid: typing "fizzy" and then pressing the stored word "zest" takes zest out and keeps fizzy '+await ans(p,'grid'));
  await p.evaluate(()=>{STATE.answers.fx.grid=[];render();});await p.waitForTimeout(200);
  await cell(p,0).locator('input.field').click();await p.keyboard.type('fizzy');
  await cell(p,0).locator('button.emb',{hasText:'Tense'}).click();await settle(p);
  ok(await ans(p,'grid')==='["x|a|fizzy","i1"]','5: grid: typing a word in an empty cell and then pressing an item adds both, in the order they came (the chip the word draws does not move the item from under the press) '+await ans(p,'grid'));
  /* svg-regions: a summary row's x and a region button, right after typing in the field */
  await p.evaluate(()=>{STATE.answers.fx.body=[{id:'feet',s:['restless']},{id:'head',s:['sore']}];render();});await p.waitForTimeout(200);
  await pickPlace(p,'Head');
  await field(p).click();await p.keyboard.press('End');await p.keyboard.type(', zest');
  await p.locator('#main .bodysummary .bodyrow').first().locator('button.x').click();await settle(p);
  ok(await ans(p,'body')==='[{"id":"head","s":["sore","zest"]}]','5: body: typing a word and then pressing a summary row\'s × takes that row out and keeps the word '+await ans(p,'body'));
  await field(p).click();await p.keyboard.press('End');await p.keyboard.type(', glow');
  await body(p).locator('.bodychips button',{hasText:'Chest'}).click();await settle(p);
  ok(await ans(p,'body')==='[{"id":"head","s":["sore","zest","glow"]}]','5: body: the word is kept when a region button is pressed right after typing it '+await ans(p,'body'));
  ok((await p.locator('#main .sensepanel h4').innerText())==='Chest','5: ...and the press landed: the words panel is now the chest\'s');
  await p.screenshot({path:path.join(OUT,'fixes016-widgets-1280.png'),fullPage:true});

  /* ---- 6. an own word in a grid cell leaves the answer in the order picked ---- */
  await p.evaluate(()=>{STATE.answers.fx.grid=[];render();});await p.waitForTimeout(200);
  await cell(p,0).locator('button.emb',{hasText:'Tense'}).click();
  await cell(p,1).locator('button.emb',{hasText:'Curious'}).click();
  await cell(p,0).locator('input.field').click();await p.keyboard.press('End');await p.keyboard.type(', zest');await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'grid')==='["i1","i3","x|a|zest"]','6: a write-in in the first cell leaves the two picks as they were picked, the new word last '+await ans(p,'grid'));
  await cell(p,1).locator('input.field').click();await p.keyboard.press('End');await p.keyboard.type(', glow');await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'grid')==='["i1","i3","x|a|zest","x|b|glow"]','6: and another cell\'s write-in goes last in its turn '+await ans(p,'grid'));
  await cell(p,0).locator('input.field').click();await p.keyboard.press('End');await p.keyboard.type(', Wired');await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'grid')==='["i1","i3","x|a|zest","x|b|glow","i2"]','6: a word of the cell\'s own list typed in goes last, and the rest stay in place '+await ans(p,'grid'));
  ok(p.__bad.length===0,'widgets: no policy violation or page error '+p.__bad.join(' | '));
  await p.context().close();

  /* ---- 2. a kept entry's card names each place's words ---- */
  p=await open(1280);
  await p.evaluate(()=>{screen='fx/log';render();});await p.waitForTimeout(300);
  await pickPlace(p,'Feet');await sense(p,'Restless').click();await sense(p,'Sore').click();
  await pickPlace(p,'Head');await sense(p,'Warm, tender').click();await settle(p);
  await p.locator('#main .finalize').click();await p.waitForTimeout(300);
  const chip=p.locator('#main .chips button.chip').first();
  if((await chip.getAttribute('aria-pressed'))!=='true'){await chip.click();await p.waitForTimeout(200);}
  const card=await p.evaluate(()=>{const c=document.querySelector('#main .card-item.entry');return c?c.innerText:'(no card)';});
  ok(/Feet\s*—\s*Restless, Sore/.test(card),'2: the kept entry\'s card names the place and its words: "Feet — Restless, Sore" '+JSON.stringify(card.slice(0,300)));
  ok(/Head\s*—\s*Warm, tender/.test(card),'2: ...for each place, a word with a comma whole');
  ok(p.__bad.length===0,'entry: no policy violation or page error '+p.__bad.join(' | '));
  await p.context().close();

  /* ---- 7. the Add-your-own field: added when it is left, and when the page is closed ---- */
  p=await open(1280);
  const own=(i)=>p.locator('#main input.q-own').nth(i);
  const pill=(i,t)=>p.locator('#main .pills').nth(i).locator('button.pill-btn',{hasText:new RegExp('^'+t+'$')});
  await own(1).click();await p.keyboard.type('Moth');await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'m1')==='["Moth"]','7: a multi: words typed in the field are added when it is left '+await ans(p,'m1'));
  ok(await own(1).inputValue()==='','7: ...and the field is empty again');
  ok(await p.locator('#main .pills').nth(1).locator('.pill-own').count()===1,'7: ...and the word is drawn as the reader\'s own option');
  await pill(1,'Red').click();await settle(p);
  await own(1).click();await p.keyboard.type('  fern ');await p.locator('#main .q-ownrow button').nth(1).click();await settle(p);
  ok(await ans(p,'m1')==='["Moth",1,"fern"]','7: Add, after typing, still adds the word once (the field was left by pressing it) '+await ans(p,'m1'));
  await own(1).click();await p.keyboard.type(' BLUE');await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'m1')==='["Moth",1,"fern",2]','7: text equal to a listed option presses that option, as Enter would '+await ans(p,'m1'));
  await pill(1,'Blue').click();await settle(p);
  await own(1).click();await p.keyboard.type('   ');await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'m1')==='["Moth",1,"fern"]'&&await own(1).inputValue()==='','7: only spaces add nothing '+await ans(p,'m1'));
  /* a choice: the words replace the pick */
  await pill(0,'Red').click();await settle(p);
  ok(await ans(p,'c1')==='[1]'||await ans(p,'c1')==='1','7: set up: a choice with its pick '+await ans(p,'c1'));
  await own(0).click();await p.keyboard.type('Teal');await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'c1')==='"Teal"','7: a choice: words typed in the field and left replace the pick '+await ans(p,'c1'));
  /* a press right after typing: the typed words are added and the press lands */
  await own(1).click();await p.keyboard.type('Owl');await pill(1,'Blue').click();await settle(p);
  ok(await ans(p,'m1')==='["Moth",1,"fern","Owl",2]','7: a multi: typing a word and pressing an option adds the word and picks the option (the press is not lost) '+await ans(p,'m1'));
  /* the page is hidden or closed */
  await own(1).click();await p.keyboard.type('Heron');
  await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await settle(p);
  ok((await ans(p,'m1')).includes('"Heron"'),'7: when the page is hidden (pagehide) the typed words are added '+await ans(p,'m1'));
  ok(await p.evaluate(()=>/Heron/.test(Object.values(localStorage).join(''))||true),'7: (storage checked below, by a reload)');
  await own(0).click();await p.keyboard.type('Violet');
  await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await settle(p);
  ok(await ans(p,'c1')==='"Violet"','7: and when the page goes to the background (visibilitychange) '+await ans(p,'c1'));
  await p.evaluate(()=>{delete document.visibilityState;});
  /* closed or reloaded: typed, nothing else done, then the page is reloaded and the booklet opened again */
  await own(1).click();await p.keyboard.type('Wren');
  await p.waitForTimeout(150);
  await p.reload();await p.waitForTimeout(900);
  await p.locator('#main button').filter({hasText:/Fixes/}).first().click();await p.waitForTimeout(500);
  if(!(await p.locator('#main .ap-body').count())){await p.locator('button.mode').first().click();await p.waitForTimeout(600);}
  const after=await ans(p,'m1');
  ok(after.includes('"Wren"')&&after.includes('"Heron"'),'7: a page reloaded with words typed and not added keeps them: the booklet opened again holds Wren and Heron '+after);
  /* ---- 8. a press on the control the typed word names, after typing: the control ends pressed, once ---- */
  const setA=async(k,v)=>{await p.evaluate(([k,v])=>{if(v===null) delete STATE.answers.fx[k]; else STATE.answers.fx[k]=v;render();},[k,v]);await p.waitForTimeout(200);};
  const F=()=>p.evaluate(()=>{const a=document.activeElement;return a.tagName+':'+(a.tagName==='BODY'?'':a.textContent.slice(0,20));});
  await setA('m1',null);await own(1).click();await p.keyboard.type('Red');await pill(1,'Red').click();await settle(p);
  ok(await ans(p,'m1')==='[1]','8: a multi: typed "Red", then pressed Red: Red ends pressed, once '+await ans(p,'m1'));
  await setA('c1',null);await own(0).click();await p.keyboard.type('Red');await pill(0,'Red').click();await settle(p);
  ok(/^\[?1\]?$/.test(await ans(p,'c1')),'8: a choice: typed "Red", then pressed Red: Red is the pick '+await ans(p,'c1'));
  await setA('m1',null);await own(1).click();await p.keyboard.type('Blue');await p.keyboard.press('Shift+Tab');await settle(p);
  const fb=await F();await p.keyboard.press('Space');await settle(p);
  ok(await ans(p,'m1')==='[2]','8: a multi, by keyboard: typed "Blue", Shift+Tab to Blue (focus '+fb+'), Space: Blue ends pressed '+await ans(p,'m1'));
  await setA('m1',null);await own(1).click();await p.keyboard.type('Owl');await pill(1,'Blue').click();await settle(p);
  ok(await ans(p,'m1')==='["Owl",2]','8: (unchanged) a word typed and another option pressed: both kept '+await ans(p,'m1'));
  await setA('body',null);await pickPlace(p,'Head');await field(p).click();await p.keyboard.type('Sore');await sense(p,'Sore').click();await settle(p);
  ok(await ans(p,'body')==='[{"id":"head","s":["sore"]}]'&&(await senses(p)).includes('Sore:true'),'8: body: typed "Sore", then pressed Sore: it ends pressed, one row '+await ans(p,'body')+' '+await senses(p));
  await setA('grid',[]);await cell(p,0).locator('input.field').click();await p.keyboard.type('Wired');await cell(p,0).locator('button.emb',{hasText:/^Wired$/}).click();await settle(p);
  ok(await ans(p,'grid')==='["i2"]','8: grid: typed "Wired", then pressed Wired: it ends pressed '+await ans(p,'grid'));
  /* ---- 9. a press by keyboard right after typing, when the field already shows a word: Tab lands on that word's chip, and it stays ---- */
  await setA('body',[{id:'head',s:['restless']}]);await pickPlace(p,'Head');await field(p).click();await p.keyboard.press('End');await p.keyboard.type(', Sore');await p.keyboard.press('Tab');await p.waitForTimeout(40);
  const f1=await F();await settle(p);const f2=await F();await p.keyboard.press('Space');await settle(p);
  ok(f1===f2&&/^BUTTON/.test(f2)&&await ans(p,'body')==='[{"id":"head","s":["sore"]}]','9: body, a word stored: typed ", Sore", Tab (focus '+f1+' then '+f2+'), Space presses that chip\'s x: restless gone, Sore kept '+await ans(p,'body'));
  await setA('grid',['x|a|zest']);await cell(p,0).locator('input.field').click();await p.keyboard.press('End');await p.keyboard.type(', fizzy');await p.keyboard.press('Tab');await p.waitForTimeout(40);
  const g1=await F();await settle(p);const g2=await F();await p.keyboard.press('Space');await settle(p);
  ok(g1===g2&&/^BUTTON/.test(g2)&&await ans(p,'grid')==='["x|a|fizzy"]','9: grid, "zest" stored: typed ", fizzy", Tab (focus '+g1+' then '+g2+'), Space removes zest, fizzy kept '+await ans(p,'grid'));
  /* ---- 10. a listed word whose label holds a comma stays one word ---- */
  await setA('body',null);await pickPlace(p,'Head');await field(p).click();await p.keyboard.type('Warm, tender');await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'body')==='[{"id":"head","s":["warm"]}]','10: body: typed "Warm, tender" (a listed sense word), left: one word '+await ans(p,'body'));
  await setA('grid',[]);await cell(p,3).locator('input.field').click();await p.keyboard.type('Warm, tender');await p.keyboard.press('Tab');await settle(p);
  ok(await ans(p,'grid')==='["i4"]','10: grid: typed "Warm, tender" (a listed item), left: one item '+await ans(p,'grid'));
  /* ---- 11. words typed in a widget's field and not left are added when the page is hidden or closed (call 10, the same rule) ---- */
  await setA('body',null);await pickPlace(p,'Head');await field(p).click();await p.keyboard.type('Sore');
  await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await settle(p);
  ok(await ans(p,'body')==='[{"id":"head","s":["sore"]}]','11: body: a word in the field when the page is hidden (pagehide) is added '+await ans(p,'body'));
  await setA('grid',[]);await cell(p,0).locator('input.field').click();await p.keyboard.type('brisk');
  await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await settle(p);
  await p.evaluate(()=>{delete document.visibilityState;});
  ok(await ans(p,'grid')==='["x|a|brisk"]','11: grid: a word in a cell\'s field when the page goes to the background is added '+await ans(p,'grid'));
  await setA('body',null);await pickPlace(p,'Head');await field(p).click();await p.keyboard.type('Sore');await p.waitForTimeout(150);
  await p.reload();await p.waitForTimeout(900);
  await p.locator('#main button').filter({hasText:/Fixes/}).first().click();await p.waitForTimeout(500);
  if(!(await p.locator('#main .ap-body').count())){await p.locator('button.mode').first().click();await p.waitForTimeout(600);}
  ok((await ans(p,'body')||'').includes('sore'),'11: body: a page reloaded with a word typed and not added keeps it '+await ans(p,'body'));
  ok(p.__bad.length===0,'choice field: no policy violation or page error '+p.__bad.join(' | '));
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'ALL PASSED');process.exit(fails.length?1:0);
})().catch(e=>{console.log('FAIL the check stopped: '+String((e&&e.stack)||e).split('\n').slice(0,4).join(' | '));process.exit(1);});
