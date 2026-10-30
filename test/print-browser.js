// Browser check of printing an activity whole (0.16): a tabbed activity prints every tab under its name and every page, a paged
// one prints every page, the endnotes are numbered as the marks are, and the screen is as it was afterwards.
//  - Chromium's own print path is used: page.pdf fires beforeprint and afterprint, as Ctrl+P does. Where pdftotext is on the
//    machine the PDF's text is read too; everywhere the print is also read from the page itself under print media.
//  - A tabbed activity: both tabs' names and prose, both pages of the first tab, the opening once, and the questions of every
//    page (with the reader's answer in them); the marks 1 to 4 and the four notes in that order, each beside its own source.
//  - A paged activity (no tabs): every page, the notes of all of them.
//  - An activity of one page, with no tabs, is printed as the screen has it: nothing is added.
//  - After the print the page is as it was: the same markup, the same tab and page on show, the focus and the words typed in a
//    field kept, and no id used twice while the copy was in the page.
// Invented content. Usage: PLAYWRIGHT=/path/to/node_modules/playwright-core node test/print-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),cp=require('child_process');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const FILE=`---
booklet: "0.17"
title: Print
lang: en
---

> [!module|pm] Printing

> [!activity|plan] Plan

The opening of the plan.[^a]

> [!tab|now] This month

Claim B in the first tab.[^b]

> [!text|q1] What came in?

***

Claim C on the second page.[^c]

> [!text|q2] What went out?

> [!tab|learn] Learn more

Claim D in the second tab.[^d]

> [!text|q3] What did you learn?

[^a]: Source A, p. 1

[^b]: Source B, p. 2

[^c]: Source C, p. 3

[^d]: Source D, p. 4

> [!activity|pages] Pages

First page words.[^e]

***

Second page words.[^f]

***

Third page words.

[^e]: Source E, p. 5

[^f]: Source F, p. 6

> [!activity|single] Single

Only page words.[^g]

> [!text|s1] Anything?

[^g]: Source G, p. 7

> [!activity|long] Long

> [!tab|la] Short tab

Short tab words.

> [!tab|lb] Long tab

Filler paragraph 1 with enough words to make the page long enough to scroll.

Filler paragraph 2 with enough words to make the page long enough to scroll.

Filler paragraph 3 with enough words to make the page long enough to scroll.

Filler paragraph 4 with enough words to make the page long enough to scroll.

Filler paragraph 5 with enough words to make the page long enough to scroll.

Filler paragraph 6 with enough words to make the page long enough to scroll.

Filler paragraph 7 with enough words to make the page long enough to scroll.

Filler paragraph 8 with enough words to make the page long enough to scroll.

Filler paragraph 9 with enough words to make the page long enough to scroll.

Filler paragraph 10 with enough words to make the page long enough to scroll.

Filler paragraph 11 with enough words to make the page long enough to scroll.

Filler paragraph 12 with enough words to make the page long enough to scroll.

Filler paragraph 13 with enough words to make the page long enough to scroll.

Filler paragraph 14 with enough words to make the page long enough to scroll.

Filler paragraph 15 with enough words to make the page long enough to scroll.

Filler paragraph 16 with enough words to make the page long enough to scroll.

Filler paragraph 17 with enough words to make the page long enough to scroll.

Filler paragraph 18 with enough words to make the page long enough to scroll.

Filler paragraph 19 with enough words to make the page long enough to scroll.

Filler paragraph 20 with enough words to make the page long enough to scroll.

Filler paragraph 21 with enough words to make the page long enough to scroll.

Filler paragraph 22 with enough words to make the page long enough to scroll.

Filler paragraph 23 with enough words to make the page long enough to scroll.

Filler paragraph 24 with enough words to make the page long enough to scroll.

Filler paragraph 25 with enough words to make the page long enough to scroll.

Filler paragraph 26 with enough words to make the page long enough to scroll.

Filler paragraph 27 with enough words to make the page long enough to scroll.

Filler paragraph 28 with enough words to make the page long enough to scroll.

Filler paragraph 29 with enough words to make the page long enough to scroll.

Filler paragraph 30 with enough words to make the page long enough to scroll.

Filler paragraph 31 with enough words to make the page long enough to scroll.

Filler paragraph 32 with enough words to make the page long enough to scroll.

Filler paragraph 33 with enough words to make the page long enough to scroll.

Filler paragraph 34 with enough words to make the page long enough to scroll.

Filler paragraph 35 with enough words to make the page long enough to scroll.

Filler paragraph 36 with enough words to make the page long enough to scroll.

Filler paragraph 37 with enough words to make the page long enough to scroll.

Filler paragraph 38 with enough words to make the page long enough to scroll.

Filler paragraph 39 with enough words to make the page long enough to scroll.

Filler paragraph 40 with enough words to make the page long enough to scroll.

> [!note]- A fold
> Folded long words.[^h]

> [!text|lq] A long question?

[^h]: Source H, p. 8

> [!module|pm end] End
`;
const hasPdftotext=(()=>{try{return cp.spawnSync('pdftotext',['-v']).status!==null;}catch(e){return false;}})();
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'print.booklet.md');fs.writeFileSync(file,FILE);
  const b=await chromium.launch();
  const p=await (await b.newContext({viewport:{width:1100,height:900}})).newPage();
  p.__bad=[];p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))p.__bad.push(m.text());});p.on('pageerror',e=>p.__bad.push(e.message));
  await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
  await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
  await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
  if(!(await p.locator('#main .ap-body').count())){if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await p.waitForTimeout(500);}
    await p.locator('button.mode').first().click();await p.waitForTimeout(700);}
  const go=async id=>{await p.evaluate(i=>{screen=i;render();},id);await p.waitForTimeout(300);};
  /* what the page says when printed: the print media applied, beforeprint dispatched, the text read, afterprint dispatched */
  const printed=async()=>{await p.emulateMedia({media:'print'});
    const r=await p.evaluate(()=>{window.dispatchEvent(new Event('beforeprint'));
      const text=document.querySelector('#main').innerText;
      const ids=[...document.querySelectorAll('[id]')].map(n=>n.id),dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
      const marks=[...document.querySelectorAll('#main .print-whole .rd-mark')].map(x=>x.textContent);
      const answers=[...document.querySelectorAll('#main .print-whole textarea')].map(x=>x.value);
      const copies=document.querySelectorAll('#main .print-whole').length;
      const notes=[...document.querySelectorAll('#main .print-whole .rd-nlist li')].map(x=>x.value+':'+x.textContent);
      window.dispatchEvent(new Event('afterprint'));return {text,dup,marks,answers,copies,notes,left:document.querySelectorAll('.print-whole,.pr-skip').length};});
    await p.emulateMedia({media:null});return r;};
  const pdfText=async name=>{const f=path.join(OUT,name+'.pdf');await p.pdf({path:f,format:'A4'});
    if(!hasPdftotext) return null;
    return cp.spawnSync('pdftotext',['-layout',f,'-'],{encoding:'utf8'}).stdout;};
  const inOrder=(t,list)=>{let at=-1;return list.every(x=>{const i=t.indexOf(x,at+1);if(i<0) return false;at=i;return true;});};

  /* ---- a tabbed activity, on its second tab (the first tab's second page was not the one on show) ---- */
  await go('pm/plan');
  await p.locator('#main textarea').first().fill('Wages and gifts');await p.waitForTimeout(100);
  await p.locator('#main .tabbar button').nth(1).click();await p.waitForTimeout(200);
  const onShow=await p.evaluate(()=>({tab:document.querySelector('#main .tabbar [aria-selected=true]').textContent,text:document.querySelector('#main').innerText}));
  ok(onShow.tab==='Learn more'&&/Claim D/.test(onShow.text)&&!/Claim B/.test(onShow.text),'set up: the second tab is on show, and only it ('+onShow.tab+')');
  await p.locator('#main textarea').first().focus();await p.keyboard.type('draft words');
  const beforeHtml=await p.evaluate(()=>document.querySelector('#main').outerHTML);
  const focusBefore=await p.evaluate(()=>({tag:document.activeElement.tagName,v:document.activeElement.value}));
  let pr=await printed();
  ok(inOrder(pr.text,['The opening of the plan.','This month','Claim B in the first tab.','What came in?','Claim C on the second page.','What went out?','Learn more','Claim D in the second tab.','What did you learn?']),
    'tabbed: the print holds the opening, then each tab under its name with all its pages, in order');
  ok(pr.text.split('The opening of the plan.').length===2,'tabbed: the opening is printed once');
  ok(pr.text.split('Claim D in the second tab.').length===2,'tabbed: the tab on show is printed once, not again beside the copy');
  ok(pr.text.split('Learn more').length===2&&pr.text.split('This month').length===2,'tabbed: each tab name stands once, above its tab (the bar itself is not printed)');
  ok(pr.marks.join()==='2,3,4','tabbed: the marks of the tabs are 2, 3 and 4 after the opening\'s 1 ('+pr.marks.join()+')');
  ok(pr.notes.join('|')==='1:Source A, p. 1|2:Source B, p. 2|3:Source C, p. 3|4:Source D, p. 4'&&!/Source E/.test(pr.text),'tabbed: the four notes, numbered as their marks are, and none of another activity ('+pr.notes.join('|')+')');
  ok(pr.answers.includes('Wages and gifts'),'tabbed: the reader\'s answer to the first tab\'s question is in the print');
  ok(pr.dup.length===0,'tabbed: no id is used twice while the copy is in the page ('+pr.dup.join()+')');
  ok(pr.left===0,'tabbed: after the print neither the copy nor the print-only class is left');
  const afterHtml=await p.evaluate(()=>document.querySelector('#main').outerHTML);
  ok(afterHtml===beforeHtml,'tabbed: after the print the screen\'s markup is exactly as it was');
  const focusAfter=await p.evaluate(()=>({tag:document.activeElement.tagName,v:document.activeElement.value}));
  ok(JSON.stringify(focusAfter)===JSON.stringify(focusBefore)&&focusAfter.v==='draft words','tabbed: ...the focus is where it was, with the words typed there still in the field '+JSON.stringify(focusAfter));
  const still=await p.evaluate(()=>({tab:document.querySelector('#main .tabbar [aria-selected=true]').textContent,a:JSON.stringify(STATE.answers),shown:document.querySelector('#main').innerText}));
  ok(still.tab==='Learn more'&&/Claim D/.test(still.shown)&&!/Claim B/.test(still.shown),'tabbed: ...and the tab on show is still the second one');
  /* Chromium's own print to PDF */
  const t1=await pdfText('print-tabbed');
  if(t1!==null){
    ok(inOrder(t1,['The opening of the plan.','This month','Claim B in the first tab.','What came in?','Claim C on the second page.','What went out?','Learn more','Claim D in the second tab.','What did you learn?']),'PDF: every tab under its name and every page, in order');
    ok(inOrder(t1,['Notes','1.','Source A, p. 1','2.','Source B, p. 2','3.','Source C, p. 3','4.','Source D, p. 4']),'PDF: the notes are numbered 1 to 4, each beside its own source');
    ok(!/Next|Page 1 of 2|Back to the overview/.test(t1.replace(/Back to the overview[\s\S]*$/,'')),'PDF: no pager in the print');
  } else console.log('NOTE pdftotext is not on this machine: the PDF\'s text was not read (the print was read from the page above)');
  const afterPdf=await p.evaluate(()=>document.querySelector('#main').outerHTML);
  ok(afterPdf===beforeHtml,'PDF: after page.pdf the screen is as it was');
  await p.screenshot({path:path.join(OUT,'print-screen-after.png')});

  /* ---- a paged activity ---- */
  await go('pm/pages');
  const pagedBefore=await p.evaluate(()=>document.querySelector('#main').outerHTML);
  ok(/First page words/.test(pagedBefore)&&!/Second page words/.test(pagedBefore),'set up: the paged activity shows its first page only');
  pr=await printed();
  ok(inOrder(pr.text,['First page words.','Second page words.','Third page words.']),'paged: every page is printed, in order');
  ok(pr.text.split('First page words.').length===2,'paged: the page on show is printed once');
  ok(pr.marks.join()==='1,2'&&inOrder(pr.text,['Source E, p. 5','Source F, p. 6'])&&!/Source A/.test(pr.text),'paged: marks 1 and 2, and their two notes ('+pr.marks.join()+')');
  ok(pr.dup.length===0&&pr.left===0,'paged: no id twice, nothing left behind');
  ok(await p.evaluate(()=>document.querySelector('#main').outerHTML)===pagedBefore,'paged: after the print the screen is as it was');
  const t2=await pdfText('print-paged');
  if(t2!==null) ok(inOrder(t2,['First page words.','Second page words.','Third page words.','Notes','Source E, p. 5','Source F, p. 6']),'PDF: the paged activity prints every page and its notes');
  ok(await p.evaluate(()=>document.querySelector('#main').outerHTML)===pagedBefore,'PDF: after page.pdf the paged screen is as it was');
  /* turned to its last page, the print is still all of it */
  await p.evaluate(()=>{document.querySelector('#main .pg-next').click();});await p.waitForTimeout(200);
  await p.evaluate(()=>{document.querySelector('#main .pg-next').click();});await p.waitForTimeout(200);
  pr=await printed();
  ok(inOrder(pr.text,['First page words.','Second page words.','Third page words.'])&&pr.text.split('Third page words.').length===2,'paged: turned to the last page, the print is still every page, once each');

  /* ---- the page stays where the reader scrolled it, and a print that never ended does not leave a stale copy ---- */
  await go('pm/long');
  await p.locator('#main .tabbar button').nth(1).click();await p.waitForTimeout(200);
  await p.setViewportSize({width:1100,height:700});await p.evaluate(()=>window.scrollTo(0,900));await p.waitForTimeout(150);
  const y0=await p.evaluate(()=>Math.round(scrollY));
  ok(y0>600,'set up: a long tabbed activity, scrolled down ('+y0+')');
  await pdfText('print-long');await p.waitForTimeout(250);
  ok(await p.evaluate(()=>Math.round(scrollY))===y0,'scroll: after page.pdf the page is where it was ('+await p.evaluate(()=>Math.round(scrollY))+', was '+y0+')');
  await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));await p.emulateMedia({media:'print'});await p.waitForTimeout(100);await p.emulateMedia({media:null});
  await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await p.waitForTimeout(250);
  ok(await p.evaluate(()=>Math.round(scrollY))===y0,'scroll: after the print events the page is where it was ('+await p.evaluate(()=>Math.round(scrollY))+', was '+y0+')');
  /* the browser lays the page out for paper while it prints and moves the scroll as it does (the reviewer saw 900 come back as 873
     from page.pdf on a longer fixture): here the move is made by hand between the two events, and the scroll must come back */
  await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  await p.evaluate(()=>window.scrollTo(0,120));
  await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await p.waitForTimeout(250);
  ok(await p.evaluate(()=>Math.round(scrollY))===y0,'scroll: moved while the print was under way, it is put back at afterprint ('+await p.evaluate(()=>Math.round(scrollY))+', was '+y0+')');
  /* beforeprint with no afterprint: the reader changes tab and types, then prints again: the print is of what is on the page now */
  await p.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  await p.locator('#main .tabbar button').nth(0).click();await p.waitForTimeout(200);
  const stale=await p.evaluate(()=>{window.dispatchEvent(new Event('beforeprint'));
    const r={copies:document.querySelectorAll('.print-whole').length,text:document.querySelector('.print-whole')?document.querySelector('.print-whole').innerText:''};
    window.dispatchEvent(new Event('afterprint'));return r;});
  ok(stale.copies===1&&/Long tab/.test(stale.text)&&/Short tab words\./.test(stale.text),'stale: a second beforeprint with no afterprint between draws one fresh copy of the whole activity, both tabs ('+stale.copies+')');
  ok(await p.evaluate(()=>document.querySelectorAll('.print-whole,.pr-skip').length)===0,'stale: and the afterprint after it leaves nothing behind');

  /* ---- an activity of one page and no tabs is printed as it is ---- */
  await go('pm/single');
  const singleBefore=await p.evaluate(()=>document.querySelector('#main').outerHTML);
  pr=await printed();
  ok(pr.copies===0&&pr.text.split('Only page words.').length===2,'single: nothing is added to an activity of one page');
  ok(await p.evaluate(()=>document.querySelector('#main').outerHTML)===singleBefore,'single: and the screen is as it was');
  /* a screen that is not an activity (the module's own, the home screen) prints as before */
  await go('@home');
  pr=await printed();
  ok(pr.copies===0&&pr.left===0,'home: nothing is added to a screen that is not an activity');
  ok(p.__bad.length===0,'no policy violation or page error '+p.__bad.join(' | '));
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'ALL PASSED');process.exit(fails.length?1:0);
})().catch(e=>{console.log('FAIL the check stopped: '+String((e&&e.stack)||e).split('\n').slice(0,4).join(' | '));process.exit(1);});
