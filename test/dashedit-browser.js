// Browser check for editing in place and for questions asked of rows (format 0.19, renderer 0.19.1), in headless Chromium under the
// hosted Content-Security-Policy with the page's own origin added to connect-src. The booklet is examples/orchard-dashboard (made up:
// a garden, an orchard and a few requests); it is opened from a default folder, with its data file beside it.
//   - an `edit` field draws as a value; pressing it makes a labelled box that has focus and does not open the row it is in; Enter keeps
//     one act, Escape keeps none, leaving the box keeps one; a choice, a date, a number and a long text each make their own box;
//   - a real save (Download a copy) differs from the file that was opened by one added entry, and not by another byte; the act is
//     {pick, a, was} under the field's name;
//   - the display states after the data file is read again: the value, what was sent marked waiting, the value with what was sent beneath;
//   - a half-typed edit, the open rows and the scroll survive a refresh of the data file;
//   - a question asked of each row: in the open part, in a column; a row's Finalize keeps that row's answers as one entry;
//   - `readonly`: the cards view draws no box, the table of the same rows does;
//   - an activity that is not `repeat` draws the same fields as plain values;
//   - print shows values, not boxes.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/dashedit-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PAGE='https://bookletmd.test';
const HOST_CSP=CSP.replace('connect-src https://raw.githubusercontent.com','connect-src https://raw.githubusercontent.com '+PAGE);
if(HOST_CSP===CSP) throw new Error('csp.js no longer has the expected connect-src: update this test');
const EX=path.resolve(__dirname,'..','examples');
const MD=fs.readFileSync(path.join(EX,'orchard-dashboard.booklet.md'),'utf8');
const DATA0=JSON.parse(fs.readFileSync(path.join(EX,'orchard-dashboard.json'),'utf8'));
/* the same booklet with its activity not `repeat`: its fields are read-only and its questions keep their answers in the activity */
const PLAIN=MD.replace('> [!activity|orchard repeat] The desk','> [!activity|orchard] The desk');
if(PLAIN===MD) throw new Error('the orchard example no longer has the repeat activity this test changes');
let DATA=JSON.parse(JSON.stringify(DATA0)),BOOK=MD;
const rowOf=(id,rows)=>{rows=rows||DATA.plots.rows;for(const r of rows){if(r.id===id) return r;const k=rowOf(id,r.jobs||[]);if(k) return k;}return null;};
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const reqs=[],errs=[],csp=[];
  let ctx;
  const route=async()=>{await ctx.route(PAGE+'/**',r=>{const u=new URL(r.request().url()).pathname,md={'content-type':'text/markdown'},js={'content-type':'application/json'};
    if(u==='/folder/modules/orchard-dashboard.booklet.md') return r.fulfill({status:200,body:BOOK,headers:md});
    if(u==='/folder/modules/plain.booklet.md') return r.fulfill({status:200,body:PLAIN,headers:md});
    if(u==='/folder/modules/orchard-dashboard.json') return r.fulfill({status:200,body:JSON.stringify(DATA),headers:js});
    if(u==='/folder/') return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
    r.fulfill({status:404,body:'nf'});});};
  const wait=(p,ms)=>p.waitForTimeout(ms);
  /* every scenario is a new browser context, so no booklet kept by an earlier one is found by the next */
  const open=async(name)=>{DATA=JSON.parse(JSON.stringify(DATA0));
    if(ctx) await ctx.close();
    ctx=await b.newContext({viewport:{width:1200,height:900},acceptDownloads:true});await route();
    const p=await ctx.newPage();
    p.on('request',r=>reqs.push({url:r.url(),method:r.method(),body:r.postData()||''}));
    p.on('pageerror',e=>errs.push(e.message));
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text());});
    await p.goto(PAGE+'/folder/');await wait(p,400);
    await p.evaluate(n=>{location.hash='#/open/'+n;},name||'orchard-dashboard.booklet.md');await wait(p,1200);return p;};
  /* the file as a reader would save it */
  const saved=async(p)=>{const [d]=await Promise.all([p.waitForEvent('download'),p.locator('#btnExport').click()]);return fs.readFileSync(await d.path(),'utf8');};
  /* the lines a text has that another has not, and the other way, as two lists (a kept entry is added lines only) */
  const diff=(a,b)=>{const A=a.split('\n'),B=b.split('\n');let i=0;while(i<A.length&&i<B.length&&A[i]===B[i]) i++;
    let j=0;while(j<A.length-i&&j<B.length-i&&A[A.length-1-j]===B[B.length-1-j]) j++;return {removed:A.slice(i,A.length-j),added:B.slice(i,B.length-j)};};
  const entries=t=>{const m=t.match(/```booklet entries orchard\n([\s\S]*?)\n```/);return m?JSON.parse(m[1]).items:[];};
  const btn=(p,field,rowName)=>p.locator('button.dv-ed-btn[aria-label^="'+field+' of '+rowName+':"]').first();

  // 1. press to edit, Enter keeps one act
  {const p=await open();
   const orig=await saved(p);
   ok(await p.locator('button.dv-ed-btn').count()>=9,'the editable fields of the table draw as buttons showing their values ('+await p.locator('button.dv-ed-btn').count()+')');
   ok(await p.locator('button.dv-ed-btn').first().innerText()==='Orchard','the first shows its value, Orchard');
   await p.locator('button.dv-ed-btn').first().click();await wait(p,150);
   const act=await p.evaluate(()=>{const a=document.activeElement;return {tag:a.tagName,label:a.getAttribute('aria-label'),value:a.value};});
   ok(act.tag==='INPUT'&&act.value==='Orchard','pressing it makes a text box that has focus and holds the value ('+JSON.stringify(act)+')');
   ok(/Name/.test(act.label)&&/Orchard/.test(act.label),'the box is labelled with the field and the row ('+act.label+')');
   ok(await p.locator('table.dv-table details[open]').count()===0,'pressing it did not open the row');
   await p.keyboard.type('Old orchard');
   ok(await p.locator('table.dv-table details[open]').count()===0,'a space typed in the box did not open the row');
   ok(/No earlier entries yet/.test(await p.locator('#main').innerText()),'nothing is kept while the box is open: the earlier entries still say none');
   await p.keyboard.press('Enter');await wait(p,300);
   const t=await saved(p);
   const d=diff(orig,t),es=entries(t);
   ok(es.length===1,'Enter keeps exactly one entry');
   ok(es[0]&&JSON.stringify(es[0].title)===JSON.stringify([{pick:'p-orchard',a:'Old orchard',was:'Orchard'}]),'the act is {pick, a, was} under the field\'s name: '+JSON.stringify(es[0]));
   ok(d.removed.length===0&&d.added.length>0,'a save differs from the opened file by added lines only (the record block and its one entry): '+d.added.length+' added, '+d.removed.length+' removed');
   ok(!/No earlier entries yet/.test(await p.locator('#main').innerText()),'the strip of earlier entries shows the kept act at once');
   const cell=await p.locator('table.dv-table tbody tr.dv-trow').first().innerText();
   ok(/Old orchard/.test(cell)&&/waiting/i.test(cell),'the cell shows what was sent, marked as waiting: '+cell.replace(/\s+/g,' ').slice(0,80));
   await p.close();}


  const refresh=async p=>{await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await wait(p,700);};
  const tableText=p=>p.locator('table.dv-table').first().innerText().then(t=>t.replace(/\s+/g,' '));
  /* a row opens when its heading is pressed (on its marker; the heading's own words are the edit button) */
  const toggle=(p,i)=>p.evaluate(i=>document.querySelectorAll('table.dv-table summary')[i].click(),i);
  const firstRow=p=>p.locator('table.dv-table tbody tr.dv-trow').first();

  // 2. Escape keeps nothing; leaving the box keeps one act
  {const p=await open();
   await btn(p,'Name','Orchard').click();await p.keyboard.type('Gone');await p.keyboard.press('Escape');await wait(p,200);
   ok(/No earlier entries yet/.test(await p.locator('#main').innerText()),'Escape keeps no act');
   ok(await btn(p,'Name','Orchard').innerText()==='Orchard'&&await p.locator('.dv-ed-in').count()===0,'and the field is its value again, with no box left');
   ok(entries(await saved(p)).length===0,'a save after Escape holds no entry');
   await btn(p,'Name','Orchard').click();await p.keyboard.type('Orchard 2');
   await p.getByText('Plots and their jobs').first().click();await wait(p,300);
   const es=entries(await saved(p));
   ok(es.length===1&&es[0].title[0].a==='Orchard 2'&&es[0].title[0].was==='Orchard','leaving the box (a press elsewhere) keeps one act');
   // an edit that comes back to the first value keeps nothing
   await btn(p,'Name','Orchard').click();await p.keyboard.press('Enter');await wait(p,200);
   ok(entries(await saved(p)).length===1,'Enter with nothing changed keeps no act');
   await p.close();}

  // 3. a choice, a date and a long text each make their own box, and each keeps {pick, a, was}
  {const p=await open();
   await btn(p,'Stage','Orchard').click();await wait(p,100);
   ok(await p.evaluate(()=>document.activeElement.tagName)==='SELECT','a choice makes a list box');
   ok(await p.evaluate(()=>[...document.activeElement.options].map(o=>o.value).join()==='planning,growing,resting,done'),'holding the listed options');
   await p.locator('select.dv-ed-in').selectOption('resting');await p.keyboard.press('Enter');await wait(p,250);
   await btn(p,'Due','Orchard').click();await wait(p,100);
   ok(await p.evaluate(()=>document.activeElement.type)==='date','a date makes a date box');
   await p.locator('input.dv-ed-in').fill('2026-11-25');await p.keyboard.press('Enter');await wait(p,250);
   // the long text is in the open part
   await toggle(p,0);await wait(p,200);
   await btn(p,'What it is','Orchard').click();await wait(p,100);
   ok(await p.evaluate(()=>document.activeElement.tagName)==='TEXTAREA','a long text makes a text area');
   await p.keyboard.press('End');await p.keyboard.down('Shift');await p.keyboard.press('Enter');await p.keyboard.up('Shift');await p.keyboard.type('Third line.');
   ok(await p.evaluate(()=>document.activeElement.tagName==='TEXTAREA'&&/\nThird line\.$/.test(document.activeElement.value)),'Shift+Enter makes a new line in it');
   await p.keyboard.press('Enter');await wait(p,250);
   const es=entries(await saved(p));
   ok(es.length===3,'three acts kept, one entry each ('+es.length+')');
   ok(JSON.stringify(es[0].stage)==='[{"pick":"p-orchard","a":"resting","was":"growing"}]','the choice: '+JSON.stringify(es[0].stage));
   ok(JSON.stringify(es[1].due)==='[{"pick":"p-orchard","a":"2026-11-25","was":"2026-11-20"}]','the date: '+JSON.stringify(es[1].due));
   ok(es[2].about&&es[2].about[0].was===DATA0.plots.rows[0].about&&es[2].about[0].a===DATA0.plots.rows[0].about+'\nThird line.','the long text, with its line break: '+JSON.stringify(es[2].about).slice(0,120));
   ok(await p.locator('table.dv-table details[open]').count()===1,'the one row the reader opened is still open after the acts');
   await p.close();}

  // 4. the display states, after the data file is read again
  {const p=await open();
   await btn(p,'Name','Orchard').click();await p.keyboard.type('Old orchard');await p.keyboard.press('Enter');await wait(p,250);
   let t=await tableText(p);
   ok(/Old orchard · sent, waiting/.test(t),'the data still holds what it did (the value when editing began): the cell shows what was sent, marked waiting');
   DATA.plots.rows[0].title='Old orchard';await refresh(p);
   t=await tableText(p);
   ok(/Old orchard/.test(t)&&!/waiting|sent/.test(t.slice(0,t.indexOf('Vegetable'))),'the data now holds what was sent: the value, nothing marked ('+t.slice(0,90)+')');
   DATA.plots.rows[0].title='Something else';await refresh(p);
   t=await tableText(p);
   ok(/Something else/.test(t)&&/Old orchard/.test(t)&&/sent/.test(t),'the data holds a third value: the value now, with what was sent beneath ('+t.slice(0,110)+')');
   await p.close();}

  // 5. a half-typed edit, the open rows and the scroll survive a refresh of the data
  {const p=await open();
   await toggle(p,0);await wait(p,200);
   await btn(p,'Name','Vegetable beds').click();await p.keyboard.type('Vegetable plot');
   await p.evaluate(()=>window.scrollTo(0,120));const y0=await p.evaluate(()=>window.scrollY);
   DATA.harvest.rows[0].kilos=121;DATA.plots.rows[2].open=1;await refresh(p);
   ok(await p.locator('table.dv-table details[open]').count()===1,'the open row is still open after the file was read again');
   ok(await p.evaluate(()=>window.scrollY)===y0,'and the scroll is where it was ('+y0+')');
   ok(await p.locator('input.dv-ed-in').count()===1&&await p.evaluate(()=>document.activeElement.classList.contains('dv-ed-in')),'the box the reader was typing in is still a box, with focus');
   ok(await p.evaluate(()=>document.activeElement.value)==='Vegetable plot','and holds what was typed, whole ('+await p.evaluate(()=>document.activeElement.value)+')');
   ok(/121/.test(await p.locator('#main').innerText()),'while the data that changed is drawn');
   await p.keyboard.press('Enter');await wait(p,250);
   const es=entries(await saved(p));
   ok(es.length===1&&es[0].title[0].a==='Vegetable plot'&&es[0].title[0].was==='Vegetable beds','Enter after the refresh keeps one act, with the value from before the typing as `was`: '+JSON.stringify(es[0]&&es[0].title));
   await p.close();}

  const listRows=p=>p.locator('ul.dv-list > li, .dv-list li').filter({has:p.locator('summary')});

  // 5b. from the keyboard; a half-typed answer in a column survives a refresh
  {const p=await open();
   await btn(p,'Stage','Orchard').focus();await p.keyboard.press('Enter');await wait(p,150);
   ok(await p.evaluate(()=>document.activeElement.tagName)==='SELECT','Enter on a focused field makes its box, from the keyboard');
   await p.keyboard.press('Escape');await wait(p,200);
   await btn(p,'Stage','Orchard').focus();await p.keyboard.press(' ');await wait(p,150);
   ok(await p.evaluate(()=>document.activeElement.tagName)==='SELECT','and so does Space');
   /* CHANGED 0.20.2 (Ben, 2026-11-10: "An outline and the fact that it became an edit box", no ring): the box is shown by a thin outline of its own, not by a focus ring */
   ok(await p.evaluate(()=>{const c=getComputedStyle(document.activeElement);return c.borderTopStyle==='solid'&&c.borderTopWidth==='1px'&&c.outlineStyle==='none'&&c.boxShadow==='none';}),'the box is shown by a thin outline of its own, with no focus ring');
   await p.keyboard.press('Escape');await wait(p,200);
   const note=p.locator('table.dv-table tbody tr.dv-trow').first().locator('textarea.field');
   await note.fill('half typed');await note.focus();await p.keyboard.type(' more');
   await refresh(p);
   const n2=p.locator('table.dv-table tbody tr.dv-trow').first().locator('textarea.field');
   ok(await n2.inputValue()==='half typed more','a half-typed answer in a column is still in its box after a refresh');
   ok(await p.evaluate(()=>document.activeElement.tagName)==='TEXTAREA','with focus');
   await p.close();}

  // 6. a question asked of each row: in a column (the note of the table, the call of the list) and in the open part (the reply)
  {const p=await open();
   const noteBox=p.locator('table.dv-table tbody tr.dv-trow').first().locator('textarea.field');
   ok(await p.locator('table.dv-table tbody tr.dv-trow').first().locator('textarea.field').count()===1,'the table has the note question in its own column, one box in a row');
   ok(await p.locator('table.dv-table thead th').filter({hasText:'A note for the gardener'}).count()===1,'headed by the question\'s title');
   const fin0=p.locator('table.dv-table tbody tr.dv-trow').first().locator('button.dv-rowfin');
   ok(await fin0.isDisabled(),'the row\'s Finalize waits while the row has no answer');
   await noteBox.fill('Stakes arrive Friday');await wait(p,200);
   ok(await fin0.isEnabled(),'and can be pressed once it has one');
   ok(await p.locator('table.dv-table tbody tr.dv-trow').nth(1).locator('button.dv-rowfin').isDisabled(),'another row\'s Finalize stays waiting');
   await fin0.click();await wait(p,300);
   let es=entries(await saved(p));
   ok(es.length===1&&JSON.stringify(es[0].notes)==='[{"pick":"p-orchard","a":"Stakes arrive Friday"}]','Finalize keeps one entry with that row\'s answer: '+JSON.stringify(es[0]&&es[0].notes));
   ok(Object.keys(es[0]).sort().join()==='notes,ts','and nothing else in it ('+Object.keys(es[0]).join()+')');
   ok(await noteBox.inputValue()==='','the question is empty again for the next note');
   ok(/Stakes arrive Friday/.test(await p.locator('table.dv-table tbody tr.dv-trow').first().innerText()),'the kept note is shown under the question, as history');
   // the list: a choice in a column
   const lst=p.locator('.dv-list');
   ok(await p.getByRole('button',{name:'Yes'}).count()===2,'the list draws the choice in its column, for both requests');
   await p.getByRole('button',{name:'Yes'}).first().click();await wait(p,200);
   ok(await p.getByRole('button',{name:'Yes'}).first().getAttribute('aria-pressed')==='true','a press chooses it');
   await p.evaluate(()=>document.querySelectorAll('.dv-list summary')[0].click());await wait(p,200);
   const reply=p.locator('.dv-list textarea.field');
   ok(await reply.count()===1,'the reply question is in the open part of the one row that is open, and not in the other');
   await reply.fill('Borrow it, then decide');await wait(p,150);
   await p.locator('.dv-list button.dv-rowfin').first().click();await wait(p,300);
   es=entries(await saved(p));
   ok(es.length===2,'the row\'s Finalize in its open part keeps one more entry ('+es.length+')');
   ok(JSON.stringify(es[1].decision)==='[{"pick":"b-ladder","a":1}]'&&JSON.stringify(es[1].reply)==='[{"pick":"b-ladder","a":"Borrow it, then decide"}]','holding the call and the reply of that row together: '+JSON.stringify([es[1].decision,es[1].reply]));
   ok(Object.keys(es[1]).sort().join()==='decision,reply,ts','and no other row\'s answer ('+Object.keys(es[1]).join()+')');
   const open1=await p.locator('.dv-list').first().innerText();
   ok(/Yes/.test(open1)&&/Borrow it, then decide/.test(open1),'the kept words are shown as history under the questions');
   ok(await p.locator('.dv-list').getByRole('button',{name:'Yes'}).first().getAttribute('aria-pressed')==='false','and the call starts empty again');
   await p.close();}


  // 7. readonly: the cards of the same rows draw values and no boxes; the table draws boxes
  {const p=await open();
   ok(await p.locator('table.dv-table .dv-ed-btn').count()===9,'the table of the rows has its nine editable fields');
   ok(await p.locator('.dv-cards .dv-ed-btn, .dv-cards .dv-ed-in, .dv-cards textarea, .dv-cards input').count()===0,'the cards view, which says readonly, draws no button and no box');
   const ct=await p.locator('.dv-cards').innerText();
   ok(/growing/.test(ct)&&/2026-11-20/.test(ct),'it draws the values of its fields all the same');
   await p.close();}

  // 8. an activity that is not `repeat`: the same fields are plain values; the questions keep their answers in the activity
  {const p=await open('plain.booklet.md');
   ok(await p.locator('.dv-ed-btn').count()===0,'a field marked edit in an activity that is not repeat draws as its plain value');
   ok(/Orchard/.test(await p.locator('table.dv-table').first().innerText()),'(with its value shown)');
   ok(await p.locator('button.dv-rowfin').count()===0,'and no row has a Finalize of its own');
   await p.locator('table.dv-table tbody tr.dv-trow').first().locator('textarea.field').fill('A note in a plain activity');await wait(p,200);
   await p.getByRole('button',{name:'Yes'}).first().click();await wait(p,200);
   const t=await saved(p);
   const m=t.match(/```booklet answers\n([\s\S]*?)\n```/);
   const a=m?JSON.parse(m[1]):{};
   ok(JSON.stringify(a.notes)==='[{"pick":"p-orchard","a":"A note in a plain activity"}]','the note is a pair in the activity\'s answers: '+JSON.stringify(a.notes));
   ok(JSON.stringify(a.decision)==='[{"pick":"b-ladder","a":1}]','and so is the call: '+JSON.stringify(a.decision));
   ok(entries(t).length===0,'with no entry kept');
   await p.close();}

  // 9. a row taken out of the data keeps its pairs, and a stale `was` shows the value now with what was sent
  {const p=await open();
   await btn(p,'Name','Tool shed').click();await p.keyboard.type('Shed');await p.keyboard.press('Enter');await wait(p,250);
   const gone=DATA.plots.rows.splice(2,1)[0];await refresh(p);
   ok(!/Shed|Tool shed/.test(await tableText(p)),'a row the data no longer holds is not drawn');
   ok(entries(await saved(p)).some(e=>e.title&&e.title[0].pick==='p-shed'),'and its pair is still in the file');
   DATA.plots.rows.push(gone);gone.title='Tool store';await refresh(p);
   const t=await tableText(p);
   ok(/Tool store/.test(t)&&/Shed/.test(t)&&/sent/.test(t),'back in the data with another value, it shows that value and what was sent beneath ('+t.slice(100,200)+')');
   await p.close();}

  // 9b. a row that leaves the data while its box is open: what the reader wrote is kept as an act at once
  {const p=await open();
   await btn(p,'Name','Tool shed').click();await p.keyboard.type('Shed (new)');
   const gone=DATA.plots.rows.splice(2,1)[0];await refresh(p);
   ok(await p.locator('.dv-ed-in').count()===0,'the box of a row the data no longer holds is gone');
   const es=entries(await saved(p));
   ok(es.length===1&&JSON.stringify(es[0].title)==='[{"pick":"p-shed","a":"Shed (new)","was":"Tool shed"}]','and the words are kept as one act, with `was`: '+JSON.stringify(es[0]&&es[0].title));
   DATA.plots.rows.push(gone);await refresh(p);
   ok(/Shed \(new\)/.test(await tableText(p))&&/waiting/.test(await tableText(p)),'back in the data, the act shows as waiting');
   await p.close();}

  // 9c. the waiting mark describes its button; a kept act's card; a number box with text that is not a number
  {const p=await open();
   await btn(p,'Name','Orchard').click();await p.keyboard.type('Orchard Z');await p.keyboard.press('Enter');await wait(p,300);
   const d=await p.evaluate(()=>{const b=document.querySelector('button.dv-ed-btn');const id=b.getAttribute('aria-describedby');const t=id&&document.getElementById(id);return {id,text:t&&t.textContent};});
   ok(d.id&&/sent, waiting/.test(d.text||''),'the waiting mark is the button\'s accessible description: '+JSON.stringify(d));
   ok(/Change kept\./.test(await p.locator('#toast').innerText())&&await p.locator('#toast').getAttribute('role')==='status','a kept change is announced in the polite status line');
   await p.locator('.chip, .chips button, .chips a').first().click().catch(()=>{});await wait(p,300);
   const card=await p.locator('#main .entry').first().innerText().catch(()=>'');
   ok(/title/.test(card)&&/p-orchard: Orchard Z \(was Orchard\)/.test(card),'the kept act\'s card in the earlier entries names the field and the pair: '+card.replace(/\s+/g,' ').slice(0,120));
   await p.close();}
  {const NUM=MD.replace('"due": {"label": "Due", "edit": "date"}','x');
   const p=await open();
   await p.evaluate(()=>{});
   // the orchard has no number field: use the plain page's own table by turning Open jobs into a number edit in the data
   DATA.plots.fields.open={label:'Open jobs',edit:'number'};await refresh(p);
   await btn(p,'Open jobs','Orchard').click();await p.keyboard.type('3e');await p.keyboard.press('Enter');await wait(p,250);
   const st=await p.evaluate(()=>({box:!!document.querySelector('input.dv-ed-in'),alert:(document.querySelector('[role=alert]')||{}).textContent,invalid:document.querySelector('input.dv-ed-in')&&document.querySelector('input.dv-ed-in').getAttribute('aria-invalid')}));
   ok(st.box&&/That is not a number, so nothing is kept\. Correct the number to keep it\./.test(st.alert||'')&&st.invalid==='true','a number box holding `3e` stays open with an alert, and Enter keeps nothing: '+JSON.stringify(st));
   ok(/No earlier entries yet/.test(await p.locator('#main').innerText()),'no entry was made');
   await p.locator('input.dv-ed-in').fill('');await p.keyboard.press('Enter');await wait(p,300);
   const es=entries(await saved(p));
   ok(es.length===1&&JSON.stringify(es[0].open)==='[{"pick":"p-orchard","a":null,"was":3}]','an empty number box keeps `a: null`: '+JSON.stringify(es[0]&&es[0].open));
   await btn(p,'Open jobs','Vegetable beds').click();await p.keyboard.type('4e');await p.keyboard.press('Enter');await wait(p,200);
   await p.evaluate(()=>document.getElementById('btnHome').click());await wait(p,500);
   ok(/Nothing was kept: a number box held text that is not a number\./.test(await p.locator('#toast').innerText()),'leaving the screen with that box open keeps nothing and says so');
   await p.close();}

  // 10. print shows values, not boxes
  {const p=await open();
   await p.emulateMedia({media:'print'});await wait(p,200);
   await p.evaluate(()=>{document.querySelector('button.dv-ed-btn').click();const i=document.querySelector('.dv-ed-in');i.value='Orchard in print';i.dispatchEvent(new Event('input',{bubbles:true}));});await wait(p,100);
   const vis=await p.evaluate(()=>{const v=e=>e&&getComputedStyle(e).display!=='none'&&e.getClientRects().length>0;
     return {input:v(document.querySelector('.dv-ed-in')),val:v(document.querySelector('.dv-ed-val')),text:(document.querySelector('.dv-ed-val')||{}).textContent,fin:[...document.querySelectorAll('.dv-rowfin')].some(v),ta:[...document.querySelectorAll('table.dv-table textarea')].some(v)};});
   ok(!vis.input&&vis.val&&vis.text==='Orchard in print','an open box prints as the words in it ('+JSON.stringify(vis)+')');
   ok(!vis.fin,'a row\'s Finalize does not print');
   await p.emulateMedia({media:'screen'});
   await p.close();}

  await b.close();
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  ok(csp.length===0,'no Content-Security-Policy violations'+(csp.length?': '+csp[0]:''));
  ok(reqs.every(r=>r.method==='GET'),'every request is a GET');
  if(fails.length){console.log('\n'+fails.length+' FAILED');process.exit(1);}
  console.log('\nall dashedit-browser checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
