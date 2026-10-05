// Browser check for 0.10: a module carries its notice, its data at the end is its own, and a booklet has one name.
// Two modules are added from a served registry (one holds a `> [!notice]` callout and a `> [!data|module-id]` section,
// the other has its notice only in its file's front matter and its data under a plain data line); the quiet
// "About this module" disclosure is opened; the booklet is renamed on its home screen and in "Your booklets"; the copy
// is downloaded and opened again: the notices, the module data sections and the name are all there. Headless Chromium
// with the hosted /app/ Content-Security-Policy applied. Screenshots (Paper, 1280px and 400px) go to <outdir>.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/notice-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://raw.githubusercontent.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const widget=(h)=>`\`\`\`booklet widget\n{"engine":"grid-select","copy":{"h":"${h}"},"items":[{"id":"i","label":"Item ${h}"}]}\n\`\`\`\n^wd`;
const MA=`---\nbooklet: "0.10"\ntitle: Garden notes\nlang: en\n---\n\n> [!module|ma] Garden notes\n\nA short blurb about the garden notes.\n\n> [!notice]\n> license: Free to copy and share, unmodified and with this notice intact.\n> copyright: Example Press, 2026\n> source: https://example.org/garden\n> version: 1.2\n\n> [!activity|plant] Plant\n\n> [!text|what] What did you plant?\n\n> [!widget|w]\n> ![[#^wd]]\n\n> [!activity|water repeat] Water\n\n> [!text|how] How much?\n\n> [!module|ma end] End\n\n> [!data|ma] Data for Garden notes\n\n${widget('Garden picker')}\n`;
const MB=`---\nbooklet: "0.10"\ntitle: Sleep log\nlang: en\nlicense: "Shared under a licence given in front matter."\ncopyright: "Front Matter Press, 2025"\nsource: "javascript:alert(1)"\nversion: "3.1"\n---\n\n> [!module|mb] Sleep log\n\n> [!activity|sleep repeat] Sleep\n\n> [!text|hours] Hours?\n\n> [!widget|w]\n> ![[#^wd]]\n\n> [!module|mb end] End\n\n> [!data] Data\n\n${widget('Sleep picker')}\n`;
const FILES={'/ma.md':MA,'/mb.md':MB};
const REG={modules:[{id:'t/ma',title:'Garden notes',file:'ma.md'},{id:'t/mb',title:'Sleep log',file:'mb.md'}]};
const NAME='Ben\'s "spring" plan: #1';
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const csp=[],errs=[];
  async function page(width){
    const ctx=await b.newContext({viewport:{width,height:900},acceptDownloads:true});const p=await ctx.newPage();
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.route('https://bookletmd.test/**',r=>{const u=new URL(r.request().url()).pathname;
      if(u==='/app/')return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}});
      r.fulfill({status:404,body:'nf'});});
    await p.route('https://raw.githubusercontent.com/**',r=>{const u=new URL(r.request().url()).pathname;
      if(/registry\.json$/.test(u))return r.fulfill({status:200,body:JSON.stringify(REG),headers:{'content-type':'application/json','access-control-allow-origin':'*'}});
      const f=FILES['/'+u.split('/').pop()];
      r.fulfill(f?{status:200,body:f,headers:{'content-type':'text/plain','access-control-allow-origin':'*'}}:{status:404,body:'nf'});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.evaluate(()=>window.bookletTheme&&window.bookletTheme.set('paper'));
    return {p,ctx};}
  let {p,ctx}=await page(1280);
  const h1=()=>p.locator('#main .hero h1').first().textContent();
  // ---- a new booklet: one name from the first moment
  await p.getByRole('button',{name:'Start a new booklet'}).click();await p.waitForTimeout(400);
  ok((await h1())==='Untitled booklet','a new booklet\'s screen says Untitled booklet: '+await h1());
  ok(await p.locator('button.quietlink',{hasText:'Rename'}).count()>=1,'its home screen has a small Rename control');
  // ---- add the two modules
  const addFromRegistry=async t=>{await p.getByRole('button',{name:'Add a module'}).first().click();await p.waitForTimeout(800);
    await p.locator('#addModList .bkrow').filter({hasText:t}).first().locator('button').click();await p.waitForTimeout(800);};
  await addFromRegistry('Garden notes');await addFromRegistry('Sleep log');
  ok(await p.locator('button.mode').count()===2,'both modules are on the home screen');
  ok((await h1())==='Untitled booklet','adding two modules with their own titles leaves the booklet\'s name alone: '+await h1());
  // ---- the disclosure on a module's own page (two activities)
  await p.locator('button.mode').filter({hasText:'Garden notes'}).first().click();await p.waitForTimeout(400);
  const about=p.locator('details.about');
  ok(await about.count()===1&&await about.getAttribute('open')===null,'the module page has one disclosure, closed');
  ok(/About this module/.test(await about.locator('summary').textContent()),'headed About this module');
  await about.locator('summary').click();await p.waitForTimeout(200);
  const body=await about.textContent();
  ok(/Free to copy and share, unmodified and with this notice intact\./.test(body)&&/Example Press, 2026/.test(body)&&/1\.2/.test(body)&&/Licence/.test(body)&&/Copyright/.test(body)&&/Source/.test(body)&&/Version/.test(body),'opened, it shows the licence, copyright, source and version: '+body.replace(/\s+/g,' '));
  ok(await about.locator('a[href="https://example.org/garden"]').count()===1,'an https source is a link');
  await p.screenshot({path:path.join(OUT,'notice-module-1280.png')});
  // the module's own data section drew its widget
  await p.locator('button.mode').filter({hasText:'Plant'}).first().click();await p.waitForTimeout(400);
  ok(await p.locator('h3').filter({hasText:'Garden picker'}).count()>=1,'the widget in the module\'s data section draws');
  // ---- a single-activity module: the notice at the foot of the activity, from its front matter; a javascript: source is text
  await p.locator('#btnHome').click();await p.waitForTimeout(300);
  await p.locator('button.mode').filter({hasText:'Sleep log'}).first().click();await p.waitForTimeout(400);
  const a2=p.locator('details.about');
  ok(await a2.count()===1,'a module that is one activity shows its notice at the foot of the activity');
  await a2.locator('summary').click();await p.waitForTimeout(200);
  const b2=await a2.textContent();
  ok(/Shared under a licence given in front matter\./.test(b2)&&/Front Matter Press, 2025/.test(b2)&&/3\.1/.test(b2),'it came from the file\'s front matter');
  ok(await a2.locator('a').count()===0&&/javascript:alert\(1\)/.test(b2),'a source that is not http or https is plain text, not a link');
  ok(await p.locator('h3').filter({hasText:'Sleep picker'}).count()>=1,'the shared data section\'s widget draws for the single-activity module');
  // ---- rename on the home screen
  await p.locator('#btnHome').click();await p.waitForTimeout(300);
  await p.screenshot({path:path.join(OUT,'home-1280.png')});
  await p.locator('button.quietlink',{hasText:'Rename'}).first().click();await p.waitForTimeout(200);
  ok(await p.locator('input.nameedit').count()===1,'Rename opens the name in place');
  await p.screenshot({path:path.join(OUT,'rename-home-1280.png')});
  await p.locator('input.nameedit').fill('Typed then escaped');await p.keyboard.press('Escape');await p.waitForTimeout(200);
  ok((await h1())==='Untitled booklet','Escape cancels');
  await p.locator('button.quietlink',{hasText:'Rename'}).first().click();await p.waitForTimeout(150);
  await p.locator('input.nameedit').fill('   ');await p.keyboard.press('Enter');await p.waitForTimeout(200);
  ok((await h1())==='Untitled booklet','an empty name keeps the old one');
  await p.locator('button.quietlink',{hasText:'Rename'}).first().click();await p.waitForTimeout(150);
  await p.locator('input.nameedit').fill(NAME);await p.keyboard.press('Enter');await p.waitForTimeout(300);
  ok((await h1())===NAME,'Enter saves: the heading is the name as typed (text, not markup): '+await h1());
  // ---- the download
  const dl=async()=>{const [d]=await Promise.all([p.waitForEvent('download'),(async()=>{await p.locator('#btnExport').click();await p.waitForTimeout(300);
    await p.locator('#exportPanel .exportchoice').first().click();})()]);return {name:d.suggestedFilename(),md:fs.readFileSync(await d.path(),'utf8')};};
  const {name,md}=await dl();
  ok(name==='ben-s-spring-plan-1.booklet.md','the download is named for the booklet: '+name);
  ok(md.split('\n')[2]==='title: '+JSON.stringify(NAME)&&/^booklet: "0\.10"$/m.test(md),'the file\'s title line is the name, quoted and escaped, and the marker is quoted: '+md.split('\n').slice(0,4).join(' | '));
  ok(/> \[!module\|ma\] Garden notes\n\nA short blurb[^\n]*\n\n> \[!notice\]\n> license: Free to copy/.test(md)||/> \[!module\|ma\] Garden notes\n\n> \[!notice\]/.test(md)||md.includes('> [!notice]\n> license: Free to copy and share, unmodified and with this notice intact.\n> copyright: Example Press, 2026\n> source: https://example.org/garden\n> version: 1.2'),'module a\'s notice callout is in the file byte for byte');
  ok(/> \[!module\|mb\] Sleep log\n\n> \[!notice\]\n> license: Shared under a licence given in front matter\.\n> copyright: Front Matter Press, 2025\n> source: javascript:alert\(1\)\n> version: 3\.1\n/.test(md),'module b\'s notice, which was only in its front matter, was written into its fence as a callout');
  ok(/> \[!data\|ma\] Data for Garden notes\n\n```booklet widget/.test(md),'module a\'s data is under its own data line');
  ok(/> \[!data\|mb\] Data for Sleep log\n\n```booklet widget/.test(md)&&!/^> \[!data\] /m.test(md),'module b\'s data, brought under a plain data line in a one-module file, is under its own data line');
  const out=path.join(OUT,'downloaded.booklet.md');fs.writeFileSync(out,md);
  // ---- Your booklets: the row, and rename there
  await p.locator('#btnHome').click();await p.waitForTimeout(300);
  ok(await p.locator('.mode').count()===1&&/ben's "spring" plan: #1/i.test(await p.locator('.mode').first().textContent()),'the row in Your booklets shows the name');
  await p.locator('.mode .bkacts button',{hasText:'Rename'}).first().click();await p.waitForTimeout(200);
  ok(await p.locator('input.nameedit').count()===1,'Rename in the row opens the name in place');
  await p.screenshot({path:path.join(OUT,'rename-list-1280.png')});
  await p.locator('input.nameedit').fill('Renamed in the list');await p.keyboard.press('Enter');await p.waitForTimeout(300);
  ok(/Renamed in the list/.test(await p.locator('.mode').first().textContent()),'renamed in the row, the row says so');
  await p.locator('.mode .bkacts button',{hasText:'Open'}).first().click();await p.waitForTimeout(400);
  ok((await h1())==='Renamed in the list','opened, the booklet\'s screen has the new name');
  // reload: it survives
  await p.reload();await p.waitForTimeout(500);
  ok(await p.locator('.mode').first().textContent().then(t=>/Renamed in the list/.test(t)),'after a reload the list still has the new name');
  await ctx.close();
  // ---- open the download in a fresh browser
  ({p,ctx}=await page(1280));
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
  await p.locator('#fileIn').setInputFiles(out);await p.waitForTimeout(500);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
  ok((await h1())===NAME,'the downloaded file opens with the booklet\'s name: '+await h1());
  await p.locator('button.mode').filter({hasText:'Garden notes'}).first().click();await p.waitForTimeout(400);
  const ab=p.locator('details.about');await ab.locator('summary').click();await p.waitForTimeout(200);
  ok(/Example Press, 2026/.test(await ab.textContent()),'module a\'s notice shows after the round trip');
  await p.locator('button.mode').filter({hasText:'Plant'}).first().click();await p.waitForTimeout(400);
  ok(await p.locator('h3').filter({hasText:'Garden picker'}).count()>=1,'module a\'s data section still draws its widget');
  await p.locator('#btnHome').click();await p.waitForTimeout(300);
  await p.locator('button.mode').filter({hasText:'Sleep log'}).first().click();await p.waitForTimeout(400);
  const ab2=p.locator('details.about');await ab2.locator('summary').click();await p.waitForTimeout(200);
  ok(/Front Matter Press, 2025/.test(await ab2.textContent())&&await p.locator('h3').filter({hasText:'Sleep picker'}).count()>=1,'module b\'s notice and its data section survive too');
  // the same file, renamed in the opened booklet
  await p.locator('#btnHome').click();await p.waitForTimeout(300);
  await p.locator('button.quietlink',{hasText:'Rename'}).first().click();await p.waitForTimeout(150);
  await p.locator('input.nameedit').fill('Renamed after opening');await p.keyboard.press('Enter');await p.waitForTimeout(300);
  ok((await h1())==='Renamed after opening','a booklet opened from a file can be renamed');
  await ctx.close();
  // ---- narrow screenshots, Paper at 400px: the disclosure open, the rename control
  ({p,ctx}=await page(400));
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
  await p.locator('#fileIn').setInputFiles(out);await p.waitForTimeout(500);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
  await p.screenshot({path:path.join(OUT,'home-400.png')});
  await p.locator('button.quietlink',{hasText:'Rename'}).first().click();await p.waitForTimeout(200);
  await p.screenshot({path:path.join(OUT,'rename-home-400.png')});
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await p.locator('button.mode').filter({hasText:'Garden notes'}).first().click();await p.waitForTimeout(400);
  await p.locator('details.about summary').click();await p.waitForTimeout(200);
  await p.screenshot({path:path.join(OUT,'notice-module-400.png')});
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'no horizontal scroll at 400px with the disclosure open');
  ok(csp.length===0&&errs.length===0,'zero CSP violations and page errors '+csp.concat(errs).join('|'));
  await ctx.close();await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
