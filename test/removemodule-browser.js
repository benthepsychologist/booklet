// Browser check for Remove this module (0.10.2): in a booklet of two modules with work in both, open one, press "Remove
// this module", read what it says will go, Cancel (nothing changes), press it again and confirm by keyboard: the home
// screen, a toast, the changed note; a downloaded copy reopens without the module and with the other module's entry.
// Escape cancels. Hosted /app/ Content-Security-Policy, zero CSP violations and page errors; screenshots of the control
// and of the confirmation at 1280 and 400px, on the Paper theme. Needs Playwright (test/run-browser.sh).
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/removemodule-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const FILE=`---\nbooklet: "0.10"\ntitle: Two modules\nlang: en\n---\n
> [!module|dj] Daily journal

> [!notice]
> license: Free to copy and share.

> [!activity|entry repeat] Journal

> [!text|what long] What happened today?

> [!module|dj end] End

> [!module|sn] Study notes

> [!activity|log repeat] Study log

> [!text|topic] Topic

> [!activity|plan] Plan

> [!text|goal long] Goal for the week

> [!module|sn end] End

> [!data|dj] Data for Daily journal

\`\`\`booklet data
[{"x": 1}]
\`\`\`
^rows

> [!data|sn] Data for Study notes

\`\`\`booklet data
[{"x": 2}]
\`\`\`
^rows
`;
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const shots=path.join(process.env.SHOTS||OUT);fs.mkdirSync(shots,{recursive:true});
  const src=path.join(OUT,'remove.booklet.md');fs.writeFileSync(src,FILE);
  const b=await chromium.launch();
  const csp=[],errs=[];
  async function open(file,width){
    const ctx=await b.newContext({viewport:{width:width||1280,height:900},acceptDownloads:true});const p=await ctx.newPage();
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
      if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
      r.fulfill({status:404,body:'nf'});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.evaluate(()=>window.bookletTheme&&window.bookletTheme.set('paper'));
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
    await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
    return {p,ctx};}
  let {p,ctx}=await open(src);
  const cards=()=>p.locator('#main button.mode');
  const dl=async()=>{const [d]=await Promise.all([p.waitForEvent('download'),(async()=>{await p.locator('#btnExport').click();await p.waitForTimeout(300);
    await p.locator('#exportPanel .exportchoice').first().click();})()]);return fs.readFileSync(await d.path(),'utf8');};
  const keepEntry=async(card,act,words)=>{await cards().filter({hasText:card}).first().click();await p.waitForTimeout(300);
    if(act) {await cards().filter({hasText:act}).first().click();await p.waitForTimeout(300);}
    await p.locator('textarea, input[type=text]').first().fill(words);await p.locator('.finalize').click();await p.waitForTimeout(400);
    await p.locator('#btnHome').click();await p.waitForTimeout(300);};
  ok(await cards().count()===2,'two modules are on the home screen');
  await keepEntry('Study notes','Study log','algebra');
  await keepEntry('Daily journal',null,'walked by the river');
  // the control at the foot of a one-activity module's activity
  await cards().filter({hasText:'Daily journal'}).first().click();await p.waitForTimeout(400);
  const ctl=p.locator('.removemod button',{hasText:'Remove this module'});
  ok(await ctl.count()===1,'the one-activity module shows "Remove this module" at the foot of its activity');
  ok(await p.locator('details.about').count()===1,'beside its notice, "About this module"');
  await p.screenshot({path:path.join(shots,'control-1280.png'),fullPage:true});
  await ctl.click();await p.waitForTimeout(200);
  const al=p.locator('.removemod [role=alert]');
  const said=await al.textContent();
  ok(/This removes “Daily journal” from this booklet, with 1 entry you kept in it\. Download a copy first if you want to keep that work\./.test(said),'pressing it asks in place and says what goes, counted: '+said);
  ok(await al.locator('button',{hasText:/^Remove$/}).count()===1&&await al.locator('button',{hasText:/^Cancel$/}).count()===1,'with "Remove" and "Cancel"');
  ok(await p.evaluate(()=>document.activeElement&&document.activeElement.textContent)==='Cancel','focus starts on Cancel');
  await p.screenshot({path:path.join(shots,'confirm-1280.png'),fullPage:true});
  await al.locator('button',{hasText:/^Cancel$/}).click();await p.waitForTimeout(200);
  ok(await al.count()===0&&await ctl.count()===1,'Cancel closes the question');
  await p.locator('#btnHome').click();await p.waitForTimeout(300);
  ok(await cards().count()===2,'and the module is still there');
  // Escape
  await cards().filter({hasText:'Daily journal'}).first().click();await p.waitForTimeout(300);
  await ctl.click();await p.waitForTimeout(200);await p.keyboard.press('Escape');await p.waitForTimeout(200);
  ok(await al.count()===0&&await ctl.count()===1&&await p.locator('#main h2',{hasText:'Daily journal'}).count()===1,'Escape cancels too, and the activity is still on screen');
  // by keyboard: focus the control, Enter, Tab to Remove, Enter
  await ctl.focus();await p.keyboard.press('Enter');await p.waitForTimeout(200);
  await p.keyboard.press('Tab');await p.waitForTimeout(100);
  ok(await p.evaluate(()=>document.activeElement&&document.activeElement.textContent)==='Remove','by keyboard: Tab from Cancel reaches Remove');
  await p.keyboard.press('Enter');await p.waitForTimeout(500);
  ok(await cards().count()===1&&await cards().first().textContent().then(t=>/Study notes/.test(t)&&!/Daily journal/.test(t)),'confirming removes the module and shows the home screen with the other module');
  ok(/Removed “Daily journal”\./.test(await p.locator('#toast').textContent()),'a toast names it: '+await p.locator('#toast').textContent());
  ok(/not yet downloaded|changes/i.test(await p.locator('#main').textContent()),'the home screen says the booklet has changes not yet downloaded');
  // the file
  const md=await dl();
  ok(!/\[!module\|dj|\[!data\|dj\]|\[!records\|dj\]|walked by the river|Daily journal/.test(md)&&/\[!module\|sn\] Study notes/.test(md)&&/algebra/.test(md),'the downloaded file has no trace of the module and keeps the other');
  const out=path.join(OUT,'removed.booklet.md');fs.writeFileSync(out,md);
  await ctx.close();
  ({p,ctx}=await open(out));
  ok(await cards().count()===1&&/Study notes/.test(await cards().first().textContent()),'reopened, the module is still gone');
  await cards().first().click();await p.waitForTimeout(300);
  await cards().filter({hasText:'Study log'}).first().click();await p.waitForTimeout(400);
  ok(await p.locator('.chips .chip').count()===1,'and the other module\'s entry is still there');
  await ctx.close();
  // the module's own screen (two activities) has the control; an empty module is removed with a short sentence
  ({p,ctx}=await open(src));
  await cards().filter({hasText:'Study notes'}).first().click();await p.waitForTimeout(400);
  await p.locator('.removemod button',{hasText:'Remove this module'}).click();await p.waitForTimeout(200);
  const t2=await p.locator('.removemod [role=alert]').textContent();
  ok(/^This removes “Study notes” from this booklet\.\s*CancelRemove$/.test(t2.replace(/\s+/g,' ').replace(/ (Cancel)/,'$1').replace(/ (Remove)/,'$1'))||/This removes “Study notes” from this booklet\.\s/.test(t2)&&!/you kept/.test(t2),'a module with nothing kept says only that it is removed: '+t2);
  await ctx.close();
  // phone width
  ({p,ctx}=await open(src,400));
  await keepEntry('Daily journal',null,'walked by the river');
  await cards().filter({hasText:'Daily journal'}).first().click();await p.waitForTimeout(400);
  await p.screenshot({path:path.join(shots,'control-400.png'),fullPage:true});
  await p.locator('.removemod button',{hasText:'Remove this module'}).click();await p.waitForTimeout(200);
  await p.screenshot({path:path.join(shots,'confirm-400.png'),fullPage:true});
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'no horizontal scroll at 400px with the question open');
  await ctx.close();
  ok(csp.length===0&&errs.length===0,'zero CSP violations and page errors '+csp.concat(errs).join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
