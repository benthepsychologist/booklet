// Browser check for rows in the browser (renderer 0.20.2), in a real page (Chromium, headless): a `booklet data` block written in the booklet takes the
// reader's acts.
//   - a table: each row opens, and shows "Add under this row" where the row holds a list of rows; "+ add" stands under the table; a trash button of a row is
//     small (not the width of the row) and has the accessible name "Remove <row>"; Add makes a row, the screen keeps its scroll and the focus goes back
//     to a control; Remove asks "Remove this row and the N rows under it?" first, Escape and Cancel leave the row, Remove takes it and the rows under it;
//     a field edited in place makes an edit box with an outline and no ring, and keeps the value in the block;
//   - "Download a copy" differs from the file that was opened by the change inside the block and the one kept entry, and by no other byte of the booklet;
//   - a block that reads a JSON file shows no Add or Remove and says why;
//   - writing back to the file: a mock of the browser's file picker (headless Chromium cannot open a real one) gives the page a handle. The page asks once;
//     Yes asks the handle for permission and then writes the booklet to it (the same text "Download a copy" makes); a BOM and CRLF stay; a file that changed
//     on disk since it was read is not overwritten; No writes nothing; a refused permission writes nothing;
//   - nothing is requested but the page itself, and nothing is sent.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/rowschange-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PAGE='https://bookletmd.test';
const head='---\nbooklet: "0.20"\ntitle: Desk\nlang: en\n---\n\n';
const DATA={fields:{title:{label:'Name',edit:'text'},stage:{label:'Stage',edit:'choice',options:['planning','growing','resting']},count:{label:'Trees',edit:'number'}},
  idFormat:'r{n}',rows:[{id:'r1',title:'Orchard',stage:'growing',count:8,jobs:[{id:'r2',title:'Prune',stage:'planning'},{id:'r4',title:'Spray',stage:'planning'}]},
    {id:'r3',title:'Beds',stage:'resting',count:4},{id:'r5',title:'Shed',stage:'resting',jobs:[]}]};
const BOOK=head+'> [!module|d] Desk\n\n> [!activity|a repeat] Work\n\n```booklet query\nfrom: rows\nas: table\nlabel: title\nfields: title, stage, count\nadd\ndelete\n```\n\n'+
  '```booklet data\n'+JSON.stringify(DATA)+'\n```\n^rows\n\n> [!activity|b repeat] From a file\n\n```booklet query\nfrom: plots\nas: table\nlabel: title\nadd\ndelete\n```\n\n'+
  '```booklet data orchard.json plots\n```\n^plots\n\n> [!module|d end]\n';
const FENCE=/```booklet data\n[\s\S]*?\n```/;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const reqs=[],errs=[];
  const open=async(text,o)=>{o=o||{};
    const ctx=await b.newContext({viewport:{width:1100,height:700},acceptDownloads:true});
    await ctx.route(PAGE+'/**',r=>{const u=new URL(r.request().url()).pathname;
      r.fulfill(u==='/app/'?{status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}}:{status:404,body:'nf'});});
    if(o.disk){
      /* a stand-in for the browser's file picker: a handle on bytes held in the page. __disk is the file; __log is what was done to it */
      await ctx.addInitScript(init=>{
        window.__disk=new Uint8Array(init.bytes);window.__log=[];window.__perm=init.perm||'granted';
        const handle={kind:'file',name:'desk.booklet.md',
          async getFile(){window.__log.push('read');const d=window.__disk.slice();return {name:'desk.booklet.md',arrayBuffer:async()=>d.buffer};},
          async createWritable(){const parts=[];return {async write(s){parts.push(typeof s==='string'?new TextEncoder().encode(s):s);},
            async close(){let n=0;for(const p of parts) n+=p.length;const out=new Uint8Array(n);let i=0;for(const p of parts){out.set(p,i);i+=p.length;}window.__disk=out;window.__log.push('write');}};},
          async requestPermission(m){window.__log.push('permission:'+(m&&m.mode));return window.__perm;}};
        window.showOpenFilePicker=async()=>[handle];
      },{bytes:[...Buffer.from(text,'utf8')],perm:o.perm});}
    const p=await ctx.newPage();
    p.on('request',r=>reqs.push({url:r.url(),method:r.method(),body:r.postData()||''}));
    p.on('pageerror',e=>errs.push(e.message));
    await p.goto(PAGE+'/app/');await p.waitForTimeout(500);
    if(o.disk){
      await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(250);
      await p.locator('#loadPick').click();await p.waitForTimeout(800);
    }else{
      await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(250);
      await p.locator('#pasteIn').fill(text);await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(800);}
    return p;};
  const toActivity=async(p,name)=>{
    const c=p.locator('#main button.mode').filter({hasText:name});
    if(await c.count()){await c.first().click();await p.waitForTimeout(500);}};
  const saved=async p=>{const [d]=await Promise.all([p.waitForEvent('download'),p.locator('#btnExport').click()]);return fs.readFileSync(await d.path(),'utf8');};
  const diskBytes=p=>p.evaluate(()=>Array.from(window.__disk));
  const diskText=async p=>Buffer.from(await diskBytes(p)).toString('utf8');
  const log=p=>p.evaluate(()=>window.__log.slice());
  const dataOf=t=>{const m=t.match(/```booklet data\n([\s\S]*?)\n```/);return m?JSON.parse(m[1]):null;};
  /* the booklet with its records region and the fence's inside left off, to compare everything else */
  const outside=t=>t.replace(/\r?\n%%[\s\S]*$/,'').replace(/(```booklet data\r?\n)[\s\S]*?(\r?\n```)/,'$1@@$2');
  const openRows=async p=>{for(let i=0;i<4;i++){const n=await p.evaluate(()=>{let k=0;document.querySelectorAll('#main details:not([open]) > summary').forEach(s=>{s.click();k++;});return k;});if(!n) break;await p.waitForTimeout(150);}};

  // 1. the controls, and what each one does
  {const p=await open(BOOK);await toActivity(p,'Work');
   await p.waitForTimeout(300);
   const orig=await saved(p);
   ok(await p.locator('table.dv-table').count()===1,'the rows are drawn as a table');
   const addBtn=p.getByRole('button',{name:'Add a row',exact:true});
   ok(await addBtn.count()===1&&(await addBtn.innerText()).trim()==='+ add','"Add a row" is a button of the words "+ add"');
   const bb=await addBtn.boundingBox(),tb=await p.locator('table.dv-table').boundingBox();
   ok(bb&&tb&&bb.width<tb.width/3&&bb.y>tb.y+tb.height-4,`it is small (${Math.round(bb.width)} px of a ${Math.round(tb.width)} px table) and stands under the rows`);
   const rm=p.getByRole('button',{name:'Remove Beds',exact:true});
   ok(await rm.count()===1,'each row has a trash button named "Remove <row>"');
   const rb=await rm.boundingBox();
   ok(rb&&rb.width<=48&&rb.height<=48&&(await rm.innerText()).trim()==='','the trash is a picture button, small: '+JSON.stringify(rb));
   ok(await rm.locator('svg').count()===1,'its picture is an svg');
   await openRows(p);
   ok(await p.getByRole('button',{name:/^Add under this row/}).count()===2,'a row that holds a list of rows (Orchard, and the empty one, Shed) offers "Add under this row"; Beds does not');

   // Remove: ask first
   const scrollY0=await p.evaluate(()=>window.scrollY);
   await rm.click();await p.waitForTimeout(150);
   ok(/Remove this row and the 0 rows under it\?|Remove this row\?/.test(await p.locator('#main').innerText())||/Remove this row/.test(await p.locator('#main').innerText()),'pressing the trash asks the question in the line, and removes nothing yet');
   ok(await p.evaluate(()=>document.activeElement.className)==='small dv-rm-no','the question puts the focus on Cancel');
   await p.keyboard.press('Escape');await p.waitForTimeout(150);
   ok(!/Remove this row/.test(await p.locator('#main').innerText())&&await p.getByRole('button',{name:'Remove Beds',exact:true}).count()===1,'Escape closes the question and leaves the row');
   ok(await p.evaluate(()=>document.activeElement.getAttribute('aria-label'))==='Remove Beds','and the focus goes back to the trash');
   ok(dataOf(await saved(p)).rows.length===3,'nothing is removed by the question or by Escape');
   await p.getByRole('button',{name:'Remove Orchard',exact:true}).click();await p.waitForTimeout(150);
   ok(/Remove this row and the 2 rows under it\?/.test(await p.locator('#main').innerText()),'the question counts the rows under: "Remove this row and the 2 rows under it?"');
   await p.locator('.dv-rm-no').click();await p.waitForTimeout(150);
   ok(dataOf(await saved(p)).rows.length===3,'Cancel leaves the rows');
   await p.getByRole('button',{name:'Remove Orchard',exact:true}).click();await p.waitForTimeout(150);
   await p.locator('.dv-rm-yes').click();await p.waitForTimeout(400);
   const t1=await saved(p),d1=dataOf(t1);
   ok(JSON.stringify(d1.rows.map(r=>r.id))==='["r3","r5"]','Remove takes the row and the rows under it: '+JSON.stringify(d1.rows.map(r=>r.id)));
   ok((t1.match(/\$delete/g)||[]).length===1&&!/\$delete/.test(orig),'one `$delete` entry is kept');
   ok(outside(t1).replace(/\n%%[\s\S]*/,'')===outside(orig).replace(/\n%%[\s\S]*/,''),'nothing outside the fence and the records changed');
   ok(JSON.stringify(t1.slice(0,t1.indexOf('```booklet data')))===JSON.stringify(orig.slice(0,orig.indexOf('```booklet data'))),'the bytes before the block are the opened file\'s own');

   // Add: a row, the focus and the scroll
   await p.getByRole('button',{name:'Add a row',exact:true}).click();await p.waitForTimeout(150);
   ok(await p.locator('[role=group][aria-label="Add a row"]').count()===1,'pressing "+ add" opens the form');
   const f=await p.evaluate(()=>{const a=document.activeElement;return {tag:a.tagName,label:a.getAttribute('aria-label')||(a.labels&&a.labels[0]&&a.labels[0].textContent)};});
   ok(f.tag==='INPUT','the first box has focus ('+JSON.stringify(f)+')');
   await p.keyboard.type('Compost bay');
   await p.locator('.dv-addform select').selectOption('growing');
   await p.locator('.dv-addform input[type=number]').fill('3');
   await p.locator('.dv-addok').click();await p.waitForTimeout(400);
   const t2=await saved(p),d2=dataOf(t2);
   ok(JSON.stringify(d2.rows[d2.rows.length-1])===JSON.stringify({id:'r6',title:'Compost bay',stage:'growing',count:3}),'Add writes the row at the end of the block with the format\'s next id: '+JSON.stringify(d2.rows[d2.rows.length-1]));
   ok(/Compost bay/.test(await p.locator('#main').innerText()),'it is drawn at once');
   ok(await p.evaluate(()=>!!document.activeElement&&document.activeElement!==document.body),'focus is on a control after the screen is drawn again');
   ok(Math.abs(await p.evaluate(()=>window.scrollY)-scrollY0)<=40,'the scroll stays where it was');

   // Edit in place
   const eb=p.locator('button.dv-ed-btn[aria-label^="Name of Beds"]').first();
   await eb.click();await p.waitForTimeout(150);
   const st=await p.evaluate(()=>{const a=document.activeElement,c=getComputedStyle(a);return {tag:a.tagName,out:c.borderTopStyle+' '+c.borderTopWidth,ring:c.outlineStyle,shadow:c.boxShadow};});
   ok(st.tag==='INPUT','a field pressed becomes an edit box with focus');
   ok(st.out==='solid 1px','it has a thin outline in the accent colour ('+st.out+')');
   ok(st.shadow==='none'&&st.ring==='none','and no ring on focus (box-shadow '+st.shadow+', outline '+st.ring+')');
   await p.keyboard.press('Control+A');await p.keyboard.type('Garden beds');await p.keyboard.press('Enter');await p.waitForTimeout(400);
   const t3=await saved(p),d3=dataOf(t3);
   ok(d3.rows.find(r=>r.id==='r3').title==='Garden beds','the edit is written into the block');
   ok(/Garden beds/.test(await p.locator('#main table').innerText()),'and drawn');
   // a refusal of the whole: the page kept the other rows
   ok(d3.rows.length===3,'the other rows are as they were');
   await p.screenshot({path:path.join(OUT,'rows-table.png')});
   await p.context().close();}

  // 2. Add under a row
  {const p=await open(BOOK);await toActivity(p,'Work');await openRows(p);
   await p.getByRole('button',{name:/^Add under this row \(Shed\)/}).click();await p.waitForTimeout(150);
   await p.keyboard.type('Rake');
   await p.locator('.dv-addok').click();await p.waitForTimeout(400);
   const d=dataOf(await saved(p));
   ok(JSON.stringify(d.rows[2].jobs)==='[{"id":"r6","title":"Rake"}]','"Add under this row" puts the first child in the empty list: '+JSON.stringify(d.rows[2].jobs));
   await p.context().close();}

  // 3. a block that reads a file
  {const p=await open(BOOK);await toActivity(p,'From a file');
   ok(await p.getByRole('button',{name:'Add a row'}).count()===0&&await p.locator('button.dv-rm').count()===0,'a list that reads a JSON file has no Add and no Remove');
   await p.context().close();}

  // 4. writing back to the file the booklet was opened from
  {const p=await open(BOOK,{disk:true});await toActivity(p,'Work');
   ok(await p.locator('#wbBar:not([hidden])').count()===0,'nothing is asked until something changes');
   await p.getByRole('button',{name:'Remove Beds',exact:true}).click();await p.waitForTimeout(100);await p.locator('.dv-rm-yes').click();await p.waitForTimeout(400);
   ok(await p.locator('#wbBar:not([hidden])').count()===1,'after the first change the page asks once whether to keep the file up to date');
   ok((await log(p)).join()==='read','and has written nothing yet: '+(await log(p)).join());
   await p.locator('#wbYes').click();await p.waitForTimeout(900);
   const l=await log(p);
   ok(l.includes('permission:readwrite')&&l.includes('write'),'Yes asks the handle for read-write permission and writes: '+l.join());
   const onDisk=await diskText(p),dl=await saved(p);
   ok(onDisk===dl,'the file now holds exactly what "Download a copy" makes');
   ok(dataOf(onDisk).rows.length===2,'and the removed row is gone from it');
   // a second change is written without a second question
   await p.getByRole('button',{name:'Add a row',exact:true}).click();await p.waitForTimeout(100);await p.keyboard.type('Gate');await p.locator('.dv-addok').click();await p.waitForTimeout(1500);
   ok(await p.locator('#wbBar:not([hidden])').count()===0,'it does not ask again in this visit');
   ok(dataOf(await diskText(p)).rows.some(r=>r.title==='Gate'),'the second change reaches the file too');
   // the file changes under the page
   await p.evaluate(()=>{window.__disk=new TextEncoder().encode(new TextDecoder().decode(window.__disk)+'\nsomeone else\n');});
   const n0=(await log(p)).filter(x=>x==='write').length;
   await p.getByRole('button',{name:'Add a row',exact:true}).click();await p.waitForTimeout(100);await p.keyboard.type('Hedge');await p.locator('.dv-addok').click();await p.waitForTimeout(1500);
   ok((await log(p)).filter(x=>x==='write').length===n0&&/someone else/.test(await diskText(p)),'a file that changed on disk since the page wrote it is not overwritten');
   ok(/changed|Download a copy/i.test(await p.locator('#toast, .toast').allInnerTexts().then(a=>a.join(' ')).catch(()=>'')),'and a notice says so');
   await p.context().close();}

  // 5. No, and a refused permission, write nothing
  {const p=await open(BOOK,{disk:true});await toActivity(p,'Work');
   await p.getByRole('button',{name:'Remove Beds',exact:true}).click();await p.waitForTimeout(100);await p.locator('.dv-rm-yes').click();await p.waitForTimeout(400);
   await p.locator('#wbNo').click();await p.waitForTimeout(100);
   await p.getByRole('button',{name:'Add a row',exact:true}).click();await p.waitForTimeout(100);await p.keyboard.type('Gate');await p.locator('.dv-addok').click();await p.waitForTimeout(1500);
   ok((await log(p)).join()==='read'&&await diskText(p)===BOOK,'No writes nothing, now or after later changes, and does not ask again');
   await p.context().close();}
  {const p=await open(BOOK,{disk:true,perm:'denied'});await toActivity(p,'Work');
   await p.getByRole('button',{name:'Remove Beds',exact:true}).click();await p.waitForTimeout(100);await p.locator('.dv-rm-yes').click();await p.waitForTimeout(400);
   await p.locator('#wbYes').click();await p.waitForTimeout(800);
   ok(!(await log(p)).includes('write')&&await diskText(p)===BOOK,'a refused permission writes nothing');
   await p.context().close();}

  // 6. a byte order mark and CRLF stay
  {const crlf='﻿'+BOOK.replace(/\n/g,'\r\n');
   const p=await open(crlf,{disk:true});await toActivity(p,'Work');
   await p.getByRole('button',{name:'Remove Beds',exact:true}).click();await p.waitForTimeout(100);await p.locator('.dv-rm-yes').click();await p.waitForTimeout(400);
   await p.locator('#wbYes').click();await p.waitForTimeout(900);
   const bytes=await diskBytes(p),s=Buffer.from(bytes).toString('utf8');
   ok(bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF,'a byte order mark stays at the start of the written file');
   ok(!/[^\r]\n/.test(s.slice(1))&&/\r\n/.test(s),'every line ending is still CRLF');
   const d=JSON.parse(s.match(/```booklet data\r?\n([\s\S]*?)\r?\n```/)[1]);
   ok(d.rows.length===2,'and the change is in it');
   await p.context().close();}

  // 6b. a second file opened in the same visit is asked about again (the browser's permission is for one file)
  {const p=await open(BOOK,{disk:true});await toActivity(p,'Work');
   await p.getByRole('button',{name:'Remove Beds',exact:true}).click();await p.waitForTimeout(100);await p.locator('.dv-rm-yes').click();await p.waitForTimeout(400);
   await p.locator('#wbYes').click();await p.waitForTimeout(900);
   for(let i=0;i<3&&!await p.getByRole('button',{name:'Add a booklet from a file'}).count();i++){await p.locator('#btnHome').click();await p.waitForTimeout(300);}
   await p.evaluate(t=>{window.__disk=new TextEncoder().encode(t);window.__log=[];},BOOK.replace('title: Desk','title: Desk two'));  /* another file, behind the same stand-in picker */
   await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(250);
   await p.locator('#loadPick').click();await p.waitForTimeout(800);await toActivity(p,'Work');
   await p.getByRole('button',{name:'Remove Beds',exact:true}).click();await p.waitForTimeout(100);await p.locator('.dv-rm-yes').click();await p.waitForTimeout(400);
   ok(await p.locator('#wbBar:not([hidden])').count()===1,'a second file opened in the same visit is asked about again');
   await p.context().close();}

  // 8. every kept entry marks the booklet changed, so the write-back runs: a Finalize, and a row's Finalize (a pair kept by keepPairs)
  const BOOK2=head+'> [!module|d] Desk\n\n> [!activity|a repeat] Work\n\n> [!text|q] A word\n\n```booklet query\nfrom: rows\nas: table\nlabel: title\nfields: title\n```\n\n> [!text|note each:rows long] A note\n\n'+
    '```booklet data\n[{"id":"r1","title":"Orchard"}]\n```\n^rows\n\n> [!module|d end]\n';
  {const p=await open(BOOK2,{disk:true});await toActivity(p,'Work');
   await p.locator('#main textarea, #main input[type=text]').first().fill('hello');await p.waitForTimeout(200);
   await p.locator('#main button.finalize').click();await p.waitForTimeout(500);
   ok(await p.locator('#wbBar:not([hidden])').count()===1,'a Finalize (a kept entry) is a change: the page asks whether to keep the file up to date');
   await p.locator('#wbYes').click();await p.waitForTimeout(900);
   ok(/booklet entries/.test(await diskText(p))&&/hello/.test(await diskText(p)),'and on yes the entry reaches the file');
   await p.locator('#main details > summary').first().click().catch(()=>{});await p.waitForTimeout(200);
   await p.locator('#main textarea.field').last().fill('about the orchard').catch(()=>{});await p.waitForTimeout(200);
   const rf=p.locator('#main .dv-rowfin').first();
   if(await rf.count()){await rf.click();await p.waitForTimeout(1500);
     ok(/about the orchard/.test(await diskText(p)),'a row\'s Finalize (kept by keepPairs) reaches the file without another change');}
   else ok(false,'the row has a Finalize button');
   await p.context().close();}

  // 9. a write-back or a download that cannot be made says so, with why, and that the work is still kept in this browser
  const BOOK3=head+'> [!module|d] Desk\n\n> [!activity|a repeat] Work\n\n> [!text|q] A word\n\n> [!module|d end]\n\n```js\nnever closed\n';
  {const p=await open(BOOK3,{disk:true});await toActivity(p,'Work');
   await p.evaluate(()=>{window.__toasts=[];new MutationObserver(()=>{const t=document.getElementById('toast');if(t.textContent) window.__toasts.push(t.textContent);}).observe(document.getElementById('toast'),{childList:true,characterData:true,subtree:true});});
   await p.locator('#main textarea, #main input[type=text]').first().fill('hello');await p.waitForTimeout(200);
   await p.locator('#main button.finalize').click();await p.waitForTimeout(500);
   await p.locator('#wbYes').click();await p.waitForTimeout(1500);
   const ts=await p.evaluate(()=>window.__toasts.slice());
   ok(ts.some(t=>/never closed|code fence that is never closed/.test(t)&&/cannot be written to the file/.test(t)&&/still kept in this browser/.test(t)),'a booklet that ends inside an unclosed fence cannot be written to its file, and the reader is told why and that the work is kept in this browser: '+JSON.stringify(ts).slice(0,300));
   ok(!(await log(p)).includes('write'),'and nothing was written');
   await p.locator('#btnExport').click();await p.waitForTimeout(400);
   const ts2=await p.evaluate(()=>window.__toasts.slice());
   ok(ts2.some(t=>/a copy cannot be made/.test(t)&&/still kept in this browser/.test(t)),'Download a copy says the same when it cannot make one: '+JSON.stringify(ts2.slice(-2)).slice(0,300));
   await p.context().close();}

  // 7. nothing leaves the page
  {const other=reqs.filter(r=>!r.url.startsWith(PAGE+'/')&&!r.url.startsWith('data:')&&!r.url.startsWith('blob:'));
   ok(other.length===0,'nothing was requested but the page itself: '+JSON.stringify(other.slice(0,3)));
   ok(reqs.every(r=>r.method==='GET'),'and every request was a GET (nothing was sent)');}
  ok(errs.length===0,'no script error on the page'+(errs.length?': '+errs[0]:''));
  await b.close();
  if(fails.length){console.log('\n'+fails.length+' check(s) failed');process.exit(1);}
  console.log('rows-change browser checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
