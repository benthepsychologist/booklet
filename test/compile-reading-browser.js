// Browser check of the compiler's reading helpers (compile/script/reading-*.js, compile 0.2.0, lane "reading"): what the
// optional script does to a compiled page in Chromium, and that a page without it, or with scripting off, is unchanged.
// The made-up fixture test/fixtures/compile-reading.booklet.md is compiled; its parts are joined into a booklet.js beside
// the stylesheet, as the assembler of compile/script/ joins them, and a copy of each page is written that loads it
// (this test does the joining itself, so it runs whether or not the assembler is there). It asserts:
//   - tab bar: a bar over the tabs of an activity and over those of a module (a tab bar inside a tab), opening on the first,
//     the ARIA tabs roles and names, one tab in the Tab order, Left/Right/Home/End, a link or an address that points into a tab
//     that is not showing shows it, nothing is kept across a reload, and the page prints with every tab shown;
//   - citation preview: hover, keyboard focus and a first tap show the note beside the mark, Escape closes, the box can be
//     entered, the foot's notes stay, a click or a second tap goes to the foot, and the box holds no id and no back link;
//   - Open all: one switch for each activity with an author's fold, which opens or folds those and never a hint or a
//     solution, follows folds opened by hand, and the folds open for printing and close again;
//   - copy a heading's link: the full address is on the clipboard, said in words, the link still goes to the heading, and with
//     no clipboard it is only a link;
//   - sort and filter: controls over a table, list, cards, tiles and bars; none over a line chart, an empty view, or one
//     with no values; numbers sort as numbers, rows sort inside their own group, a filter searches every column, Clear and
//     a reload restore the order written; nothing is stored;
//   - scripting off, and a page with none of the markup: nothing added, every tab under its name, every row shown;
//   - no storage, no cookie, no request but the page's own files, no error; the controls keep a readable contrast, light and dark.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/compile-reading-browser.js <booklet.html> <outdir>
//        AXE=/path/to/axe.min.js adds an axe pass (WCAG 2 A and AA) over the pages with the script on.
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','booklet.html'));
const OUT=path.resolve(process.argv[3]||'.','compile-reading-pages');
const C=require('../compile/compile.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};

const ROOT=path.join(__dirname,'..'),FIX=path.join(__dirname,'fixtures'),LANE=path.join(__dirname,'compile-fixtures'),PARTS=path.join(ROOT,'compile','script');
fs.rmSync(OUT,{recursive:true,force:true});
/* the parts joined in file-name order, as the assembler does it */
const parts=fs.readdirSync(PARTS).filter(f=>/^reading-.*\.js$/.test(f)).sort();
const script=parts.map(f=>fs.readFileSync(path.join(PARTS,f),'utf8')).join('\n');

/* a tiny booklet with none of the markup a part works on: a title and a paragraph */
const PLAIN_DIR=path.join(OUT,'src');fs.mkdirSync(PLAIN_DIR,{recursive:true});
const plainFile=path.join(PLAIN_DIR,'plain.booklet.md');
const run0=C.compile([{file:path.join(FIX,'compile-reading.booklet.md')}],{form:'standalone',renderer:HTML});
fs.writeFileSync(plainFile,'---\nbooklet: "'+run0.format+'"\nid: test/plain\ntitle: A plain page\nlang: en\n---\n\n# A plain page\n\nOne made-up paragraph and nothing else.\n');
const run=C.compile([{file:path.join(FIX,'compile-reading.booklet.md')},{file:path.join(FIX,'compile-article.booklet.md')},{file:plainFile}],{form:'standalone',renderer:HTML});
C.write(run,OUT,{force:true});
ok(run.results.every(r=>r.rep.ok),'the fixtures and the plain page compile with '+path.basename(HTML));
fs.writeFileSync(path.join(OUT,'booklet','booklet.js'),script);
const withScript=name=>{const src=fs.readFileSync(path.join(OUT,name,'index.html'),'utf8');
  /* a page the compiler already links the script from is left as it is (the assembler does that for a page that needs a part) */
  fs.writeFileSync(path.join(OUT,name,'with-script.html'),/booklet\/booklet\.js/.test(src)?src:src.replace('</body>','<script src="../booklet/booklet.js" defer></script>\n</body>'));};
withScript('compile-reading');withScript('compile-article');withScript('plain');

/* a page of made-up data views, written the way the compiler's views lane writes them (the lane brief's markup contract) */
const row=(t,vals)=>'<'+t+' data-bk-row>'+Object.entries(vals).map(([k,v])=>'<span data-bk-col="'+k+'">'+v+'</span>').join(' ')+'</'+t+'>';
const CROPS=[{crop:'Beans',kilos:'4.5',picked:'2026-09-02'},{crop:'Courgette',kilos:'12',picked:'2026-09-10'},{crop:'Apples',kilos:'30.25',picked:'2026-09-28'},
  {crop:'Tomatoes',kilos:'4.25',picked:'2026-09-05'},{crop:'Leeks',kilos:'',picked:'2026-10-01'}];
const tr=v=>'<tr data-bk-row>'+Object.entries(v).map(([k,x])=>'<td data-bk-col="'+k+'">'+x+'</td>').join('')+'</tr>';
const viewsPage='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Views</title>\n'
  +'<link rel="stylesheet" href="booklet/booklet.css"></head><body class="bk-page"><main class="bk-main"><article class="booklet" lang="en">\n<h1 id="views">Views</h1>\n'
  +'<div class="bk-table" id="v-table" data-bk-view="table"><table><thead><tr><th>Crop</th><th>Kilos</th><th>Picked</th></tr></thead><tbody>'+CROPS.map(tr).join('')+'</tbody></table></div>\n'
  +'<ul id="v-list" data-bk-view="list">'+CROPS.map(v=>row('li',v)).join('')+'</ul>\n'
  +'<div id="v-cards" data-bk-view="cards"><div class="bk-dv-cards"><div class="bk-dv-group" role="heading" aria-level="3">First</div>'+CROPS.slice(0,3).map(v=>row('div',v)).join('')+'<div class="bk-dv-group" role="heading" aria-level="3">Second</div>'+CROPS.slice(3).map(v=>row('div',v)).join('')+'</div></div>\n'
  +'<div id="v-tiles" data-bk-view="tiles">'+CROPS.map(v=>row('div',v)).join('')+'</div>\n'
  +'<div id="v-bars" data-bk-view="bars">'+CROPS.map(v=>row('div',v)).join('')+'</div>\n'
  +'<div id="v-line" data-bk-view="line">'+CROPS.map(v=>row('div',v)).join('')+'</div>\n'
  +'<ul id="v-one" data-bk-view="list">'+row('li',CROPS[0])+'</ul>\n'
  +'<div id="v-empty" data-bk-view="table"></div>\n'
  +'<div id="v-nocols" data-bk-view="list"><div data-bk-row>First</div><div data-bk-row>Second</div></div>\n'
  +'<p id="v-after">After the views.</p></article></main><script src="booklet/booklet.js" defer></script></body></html>\n';
/* the views lane's real output (static fixtures: PR #82 at 6726a69): its page, and the rules it gives its views, loaded after ours */
fs.mkdirSync(path.join(OUT,'views-lane'),{recursive:true});
fs.copyFileSync(path.join(LANE,'views-lane','views-lane.css'),path.join(OUT,'views-lane','views-lane.css'));
fs.writeFileSync(path.join(OUT,'views-lane','index.html'),fs.readFileSync(path.join(LANE,'views-lane','compiled.html'),'utf8')
  .replace('</head>','<link rel="stylesheet" href="views-lane.css">\n</head>').replace('</body>','<script src="../booklet/booklet.js" defer></script>\n</body>'));
fs.writeFileSync(path.join(OUT,'views-lane','off.html'),fs.readFileSync(path.join(LANE,'views-lane','compiled.html'),'utf8')
  .replace('</head>','<link rel="stylesheet" href="views-lane.css">\n</head>'));
fs.writeFileSync(path.join(OUT,'views.html'),viewsPage);
/* 3000 made-up rows in one list (a keystroke has to stay quick), and a copy of the reading page where the box's usual id is taken */
const BIG=3000;
fs.writeFileSync(path.join(OUT,'big.html'),viewsPage.replace(/<div class="bk-table"[\s\S]*<p id="v-after">/,
  '<ul id="v-big" data-bk-view="list">'+Array.from({length:BIG},(_,i)=>row('li',{name:'Item '+i,code:'c'+((i*7)%1000),note:'word'+(i%13)})).join('')+'</ul>\n<p id="v-after">'));
fs.writeFileSync(path.join(OUT,'compile-reading','peek-id.html'),fs.readFileSync(path.join(OUT,'compile-reading','with-script.html'),'utf8').replace(/<body([^>]*)>/,'<body$1><span id="bk-peek-1"></span>'));
fs.writeFileSync(path.join(OUT,'views-off.html'),viewsPage);

const lum=c=>{const m=/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)/.exec(c);if(!m) return null;
  const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(+m[1])+0.7152*f(+m[2])+0.0722*f(+m[3]);};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);if(x==null||y==null) return 0;return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};

const BASE='http://localhost/';   /* answered from the disk below; localhost is a secure context, so the clipboard is there */
function serve(ctx,watch){
  return ctx.route(BASE+'**',route=>{const u=decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\//,''));
    const f=path.join(OUT,u);
    if(watch) watch.push(route.request().url());
    if(!f.startsWith(OUT)||!fs.existsSync(f)||!fs.statSync(f).isFile()) return route.fulfill({status:404,body:'not here'});
    const type=f.endsWith('.css')?'text/css':f.endsWith('.js')?'text/javascript':f.endsWith('.woff2')?'font/woff2':'text/html';
    return route.fulfill({status:200,contentType:type,body:fs.readFileSync(f)});});}

async function open(ctx,p,file,errs){
  if(errs){p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error') errs.push(m.text());});}
  await p.goto(BASE+file);await p.evaluate(()=>document.fonts.ready);}
const state=(p,sel)=>p.evaluate(s=>[...document.querySelectorAll(s)].map(e=>({tag:e.tagName.toLowerCase(),hidden:e.hidden,shown:e.getBoundingClientRect().height>0&&getComputedStyle(e).display!=='none'})),sel);
const texts=(p,sel)=>p.evaluate(s=>[...document.querySelectorAll(s)].map(e=>e.textContent.replace(/\s+/g,' ').trim()),sel);
const rowsOf=(p,id,col)=>p.evaluate(([i,c])=>[...document.querySelectorAll('#'+i+' [data-bk-row]')].filter(r=>getComputedStyle(r).display!=='none')
  .map(r=>r.querySelector('[data-bk-col="'+c+'"]').textContent.trim()),[id,col]);
const storage=p=>p.evaluate(async()=>{let dbs=[];try{dbs=indexedDB.databases?await indexedDB.databases():[];}catch(e){}
  return {local:localStorage.length,session:sessionStorage.length,cookie:document.cookie,idb:dbs.length};});

(async()=>{
  const b=await chromium.launch();

  /* ================= script ON: the compiled fixture ================= */
  {
    const ctx=await b.newContext({viewport:{width:1000,height:800},javaScriptEnabled:true});
    await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://localhost'});
    const reqs=[],errs=[];await serve(ctx);
    const p=await ctx.newPage();p.on('request',r=>reqs.push(r.url()));await open(ctx,p,'compile-reading/with-script.html',errs);

    /* ---- the tab bars ---- */
    const bars=await p.evaluate(()=>[...document.querySelectorAll('[role=tablist]')].map(bar=>({label:bar.getAttribute('aria-label'),
      tabs:[...bar.children].map(t=>({name:t.textContent,role:t.getAttribute('role'),sel:t.getAttribute('aria-selected'),ti:t.tabIndex,tag:t.tagName,
        panel:(()=>{const pn=document.getElementById(t.getAttribute('aria-controls'));return pn?{role:pn.getAttribute('role'),by:pn.getAttribute('aria-labelledby')===t.id,hidden:pn.hidden,cls:pn.className,next:bar.nextElementSibling===null}:null;})()}))})));
    ok(bars.length===2,'two tab bars: the module\'s two tabs, and the activity\'s three ('+bars.length+')');
    const [modBar,actBar]=[bars.find(x=>x.tabs.length===2),bars.find(x=>x.tabs.length===3)];
    ok(modBar&&actBar,'one bar of two tabs and one of three');
    ok(modBar&&modBar.tabs.map(t=>t.name).join('|')==='Plan|During'&&actBar&&actBar.tabs.map(t=>t.name).join('|')==='Short loop|Long loop|Hilly loop','the buttons carry the tabs\' own names, without the share link\'s #');
    ok(modBar&&modBar.label==='A walk in the park'&&actBar&&actBar.label==='Choose a route','each bar is named for the heading above it ('+(modBar&&modBar.label)+'; '+(actBar&&actBar.label)+')');
    for(const [n,bar] of [['module',modBar],['activity',actBar]]){if(!bar) continue;
      ok(bar.tabs.every(t=>t.tag==='BUTTON'&&t.role==='tab')&&bar.tabs.every(t=>t.panel&&t.panel.role==='tabpanel'&&t.panel.by&&/\bbk-tab\b/.test(t.panel.cls)),n+' bar: a button with role tab for each tab, each controlling a tabpanel the button labels');
      ok(bar.tabs[0].sel==='true'&&bar.tabs.slice(1).every(t=>t.sel==='false'),n+' bar: opens on the first tab');
      ok(bar.tabs[0].ti===0&&bar.tabs.slice(1).every(t=>t.ti===-1),n+' bar: only the tab on show is in the Tab order');
      ok(!bar.tabs[0].panel.hidden&&bar.tabs.slice(1).every(t=>t.panel.hidden),n+' bar: only the first tab\'s panel is shown');}
    /* keyboard */
    const sel=()=>p.evaluate(()=>[...document.querySelectorAll('[role=tablist]')].map(b=>[...b.children].findIndex(t=>t.getAttribute('aria-selected')==='true')+'/'+[...b.children].findIndex(t=>t===document.activeElement)));
    const actTabs='[role=tablist][aria-label="Choose a route"] [role=tab]';
    await p.locator(actTabs).first().focus();
    await p.keyboard.press('ArrowRight');let s=(await sel()).join(' ');
    ok(s.endsWith('1/1')||s.includes(' 1/1'),'ArrowRight moves to the next tab, shows it and puts the focus on it ('+s+')');
    await p.keyboard.press('End');s=(await sel()).join(' ');ok(s.includes('2/2'),'End goes to the last tab ('+s+')');
    await p.keyboard.press('ArrowRight');s=(await sel()).join(' ');ok(s.includes('0/0'),'ArrowRight on the last tab wraps to the first ('+s+')');
    await p.keyboard.press('ArrowLeft');s=(await sel()).join(' ');ok(s.includes('2/2'),'ArrowLeft on the first tab wraps to the last ('+s+')');
    await p.keyboard.press('Home');s=(await sel()).join(' ');ok(s.includes('0/0'),'Home goes to the first tab ('+s+')');
    const panelShown=await p.evaluate(()=>[...document.querySelectorAll('[role=tablist][aria-label="Choose a route"] ~ section.bk-tab')].map(x=>!x.hidden));
    ok(JSON.stringify(panelShown)==='[true,false,false]','…and only that tab\'s section is shown ('+panelShown+')');
    /* focus order: the tab on show, then its panel */
    await p.keyboard.press('Tab');
    const afterTab=await p.evaluate(()=>{const a=document.activeElement;return {role:a.getAttribute('role'),by:a.getAttribute('aria-labelledby'),hidden:a.hidden};});
    ok(afterTab.role==='tabpanel'&&!afterTab.hidden,'Tab from the tab on show goes to its panel, so a tab of prose alone can be read from the keyboard');
    /* a link into another tab shows it */
    await p.locator('a.bk-link[href="#hilly-loop"]').click();
    const afterLink=await p.evaluate(()=>({sel:[...document.querySelectorAll('[role=tablist][aria-label="Choose a route"] [role=tab]')].map(t=>t.getAttribute('aria-selected')),
      head:(()=>{const h=document.getElementById('hilly-loop');const r=h.getBoundingClientRect();return r.height>0&&r.bottom>0&&r.top<innerHeight;})(),hash:location.hash}));
    ok(afterLink.sel.join()==='false,false,true'&&afterLink.head&&afterLink.hash==='#hilly-loop','a link in the text to a tab not on show shows that tab, and the heading is in view ('+JSON.stringify(afterLink)+')');
    /* a link to the very heading the address already names: the address does not change, so there is no hashchange and the click alone must show the tab */
    await p.goto(BASE+'compile-reading/with-script.html#hilly-loop');
    await p.locator(actTabs).first().click();
    ok(await p.evaluate(()=>location.hash==='#hilly-loop'&&[...document.querySelectorAll('[role=tablist][aria-label="Choose a route"] [role=tab]')].map(t=>t.getAttribute('aria-selected')).join()==='true,false,false'),'(set up) the reader is on the first tab while the address still names the third');
    await p.locator('a.bk-link[href="#hilly-loop"]').click();
    ok(await p.evaluate(()=>[...document.querySelectorAll('[role=tablist][aria-label="Choose a route"] [role=tab]')].map(t=>t.getAttribute('aria-selected')).join()==='false,false,true'&&document.getElementById('hilly-loop').getBoundingClientRect().height>0),'a link to the heading the address already names still shows its tab (no hashchange, only the click)');
    await p.goto(BASE+'compile-reading/with-script.html');
    /* the module tab: "During" holds "On the path" */
    await p.evaluate(()=>{location.hash='#on-the-path';});await p.waitForTimeout(100);
    const during=await p.evaluate(()=>({sel:[...document.querySelectorAll('[role=tablist][aria-label="A walk in the park"] [role=tab]')].map(t=>t.getAttribute('aria-selected')),
      shown:document.getElementById('on-the-path').getBoundingClientRect().height>0}));
    ok(during.sel.join()==='false,true'&&during.shown,'a #fragment that points into the module\'s second tab shows that tab ('+JSON.stringify(during)+')');
    /* nothing kept */
    ok(JSON.stringify(await storage(p))==='{"local":0,"session":0,"cookie":"","idb":0}','nothing is stored: no localStorage, sessionStorage, cookie or database');
    await p.goto(BASE+'compile-reading/with-script.html');
    ok((await p.evaluate(()=>[...document.querySelectorAll('[role=tab]')].map(t=>t.getAttribute('aria-selected')).join()))==='true,false,true,false,false','a reload starts on the first tab of each bar again');
    /* an address that points into a tab inside a hidden tab: both are shown */
    await p.goto(BASE+'compile-reading/with-script.html#hilly-loop');
    const deep=await p.evaluate(()=>({mod:[...document.querySelectorAll('[role=tablist][aria-label="A walk in the park"] [role=tab]')].map(t=>t.getAttribute('aria-selected')).join(),
      act:[...document.querySelectorAll('[role=tablist][aria-label="Choose a route"] [role=tab]')].map(t=>t.getAttribute('aria-selected')).join(),
      shown:document.getElementById('hilly-loop').getBoundingClientRect().height>0}));
    ok(deep.act==='false,false,true'&&deep.mod==='true,false'&&deep.shown,'opening the page at #hilly-loop opens on that tab ('+JSON.stringify(deep)+')');
    await p.goto(BASE+'compile-reading/with-script.html#on-the-path');
    ok(await p.evaluate(()=>document.getElementById('on-the-path').getBoundingClientRect().height>0&&document.querySelector('[role=tablist][aria-label="A walk in the park"] [aria-selected=true]').textContent==='During'),'opening the page at #on-the-path (inside the second module tab) opens on that tab');
    /* print */
    await p.goto(BASE+'compile-reading/with-script.html');
    await p.emulateMedia({media:'print'});
    const pr=await p.evaluate(()=>({tabs:[...document.querySelectorAll('section.bk-tab')].map(x=>x.getBoundingClientRect().height>0&&getComputedStyle(x).display!=='none'),
      bars:[...document.querySelectorAll('.bk-tabbar')].map(x=>getComputedStyle(x).display)}));
    ok(pr.tabs.length===5&&pr.tabs.every(Boolean)&&pr.bars.every(x=>x==='none'),'print: all five tabs are shown and the bars are left off ('+JSON.stringify(pr)+')');
    await p.emulateMedia({media:'screen'});

    /* ---- the citation preview (a mouse) ---- */
    const mark1='a.bk-mark-a[href="#bk-note-1"]';
    await p.goto(BASE+'compile-reading/with-script.html');
    await p.hover(mark1);
    await p.waitForSelector('.bk-peek:not([hidden])',{timeout:2000});
    const pv=await p.evaluate(()=>{const e=document.querySelector('.bk-peek'),m=document.querySelector('a.bk-mark-a[href="#bk-note-1"]'),r=e.getBoundingClientRect(),mr=m.getBoundingClientRect();
      return {text:e.textContent.replace(/\s+/g,' ').trim(),ids:e.querySelectorAll('[id]').length,back:e.querySelectorAll('.bk-back,a').length,cite:!!e.querySelector('cite'),role:e.getAttribute('role'),
        by:m.getAttribute('aria-describedby')===e.id,inView:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,near:Math.abs(r.top-mr.bottom)<30||Math.abs(mr.top-r.bottom)<30,
        foot:!!document.querySelector('#bk-note-1 .bk-back'),footN:document.querySelectorAll('.bk-notes-list li').length,dupIds:document.querySelectorAll('[id="bk-note-1"]').length};});
    ok(/The Park Trail Book/.test(pv.text)&&/Start at the east gate/.test(pv.text)&&pv.cite,'hovering a mark shows its note beside it: source, edition, page and quote ('+pv.text.slice(0,70)+'…)');
    ok(pv.role==='tooltip'&&pv.by,'the box is a tooltip the mark is described by');
    ok(pv.ids===0&&pv.back===0&&pv.dupIds===1,'the box holds no id of its own (the note keeps the only one) and no back link or other link');
    ok(pv.inView&&pv.near,'the box sits beside the mark and inside the window');
    ok(pv.foot&&pv.footN===3,'the foot\'s notes stay, back links and all (3)');
    /* an id inside a note (a formula's label would carry one) is not copied into the box */
    await p.evaluate(()=>{document.querySelector('#bk-note-2 cite').setAttribute('id','probe');});
    await p.hover('a.bk-mark-a[href="#bk-note-2"]');await p.waitForFunction(()=>/Almanac/.test(document.querySelector('.bk-peek').textContent));
    ok(await p.evaluate(()=>document.querySelectorAll('.bk-peek [id]').length===0&&document.querySelectorAll('[id="probe"]').length===1),'an id inside a note is not copied into the box: the page keeps one of each');
    await p.hover(mark1);await p.waitForFunction(()=>/Park Trail/.test(document.querySelector('.bk-peek').textContent));
    /* it can be entered, and leaves on its own */
    const pb=await p.locator('.bk-peek').boundingBox();
    await p.mouse.move(pb.x+pb.width/2,pb.y+pb.height/2);await p.waitForTimeout(450);
    ok(await p.evaluate(()=>!document.querySelector('.bk-peek').hidden),'the box stays while the pointer is on it');
    await p.mouse.move(5,5);await p.waitForTimeout(500);
    ok(await p.evaluate(()=>document.querySelector('.bk-peek').hidden&&!document.querySelector('a.bk-mark-a[aria-describedby]')),'…and goes when the pointer leaves, with the mark no longer described by it');
    /* mark, then the gap between the mark and the box (the close is then due in 250 ms), then the box: arriving on it cancels the close */
    await p.hover(mark1);await p.waitForSelector('.bk-peek:not([hidden])');
    const gap=await p.evaluate(()=>{const m=document.querySelector('a.bk-mark-a[href="#bk-note-1"]').getBoundingClientRect(),b=document.querySelector('.bk-peek').getBoundingClientRect();
      const x=Math.max(b.left+2,Math.min(b.right-2,m.left+m.width/2));return {x,gapY:b.top>m.top?(m.bottom+b.top)/2:(m.top+b.bottom)/2,gapSize:b.top>m.top?b.top-m.bottom:m.top-b.bottom,boxY:b.top+b.height/2};});
    ok(gap.gapSize>=4,'(set up) there is a gap between the mark and the box to cross ('+Math.round(gap.gapSize)+'px)');
    await p.mouse.move(gap.x,gap.gapY);await p.waitForTimeout(60);await p.mouse.move(gap.x,gap.boxY);await p.waitForTimeout(450);
    ok(await p.evaluate(()=>!document.querySelector('.bk-peek').hidden),'a box the pointer reaches across the gap before its close falls due stays open (and a mark\'s box still goes when the pointer leaves)');
    await p.mouse.move(5,5);await p.waitForTimeout(500);
    await p.hover(mark1);await p.waitForSelector('.bk-peek:not([hidden])');await p.keyboard.press('Escape');
    ok(await p.evaluate(()=>document.querySelector('.bk-peek').hidden),'Escape dismisses the box');
    await p.hover(mark1);await p.click(mark1);
    ok(await p.evaluate(()=>location.hash==='#bk-note-1'&&document.querySelector('.bk-peek').hidden),'a mouse click on the mark still goes to the foot\'s note, and the box closes');
    /* the keyboard */
    await p.goto(BASE+'compile-reading/with-script.html');
    await p.focus('a.bk-mark-a[href="#bk-note-2"]');
    ok(await p.evaluate(()=>!document.querySelector('.bk-peek').hidden&&/Almanac/.test(document.querySelector('.bk-peek').textContent)),'keyboard focus on a mark shows its note');
    await p.keyboard.press('Enter');
    ok(await p.evaluate(()=>location.hash==='#bk-note-2'),'Enter on the focused mark goes to the foot');
    /* a mark inside a tab that is not showing is never shown by hover: it is not there to hover; one in a shown tab works */
    await p.goto(BASE+'compile-reading/with-script.html');
    await p.locator(actTabs).nth(1).click();
    await p.hover('a.bk-mark-a[href="#bk-note-3"]');await p.waitForSelector('.bk-peek:not([hidden])');
    ok(await p.evaluate(()=>/pond path/.test(document.querySelector('.bk-peek').textContent)),'a mark inside a tab the reader opened shows its note too');

    /* ---- Open all ---- */
    await p.goto(BASE+'compile-reading/with-script.html');
    const sw=await p.evaluate(()=>[...document.querySelectorAll('.bk-foldsw')].map(s=>({where:s.parentElement.querySelector(':scope > h3').textContent.replace(/#/,'').trim(),role:s.getAttribute('role'),checked:s.getAttribute('aria-checked'),text:s.textContent,tag:s.tagName,prev:s.previousElementSibling&&s.previousElementSibling.tagName})));
    ok(sw.length===2&&sw.map(x=>x.where).join('|')==='Choose a route|What to bring','one switch for each activity that has a fold the author made, and none for the others ('+JSON.stringify(sw.map(x=>x.where))+')');
    ok(sw.every(x=>x.role==='switch'&&x.checked==='false'&&x.text==='Open all'&&x.tag==='BUTTON'&&x.prev==='H3'),'each is a button with role switch, off, named "Open all", under its activity\'s heading');
    const foldState=()=>p.evaluate(()=>{
      const sec=n=>[...document.querySelectorAll('section.bk-activity')].find(s=>s.querySelector(':scope > h3').textContent.replace(/#/,'').trim()===n);
      const kinds=n=>[...sec(n).querySelectorAll('details')].map(d=>(/bk-hint|bk-solution/.test(d.className)?'q':'a')+(d.open?'1':'0')).join(' ');
      return {route:kinds('Choose a route'),bring:kinds('What to bring'),checked:[...document.querySelectorAll('.bk-foldsw')].map(s=>s.getAttribute('aria-checked')).join()};});
    let fs0=await foldState();ok(fs0.route==='a0 a0'&&fs0.bring==='a0 a0 q0 q0','folds start closed as written ('+JSON.stringify(fs0)+')');
    await p.locator('.bk-foldsw').nth(1).click();fs0=await foldState();
    ok(fs0.bring==='a1 a1 q0 q0'&&fs0.route==='a0 a0'&&fs0.checked==='false,true','Open all opens the activity\'s folds only: not a hint or a solution, not another activity\'s ('+JSON.stringify(fs0)+')');
    await p.locator('.bk-foldsw').nth(1).click();fs0=await foldState();ok(fs0.bring==='a0 a0 q0 q0'&&fs0.checked==='false,false','pressed again it folds them ('+fs0.bring+')');
    await p.locator('.bk-foldsw').first().click();fs0=await foldState();
    ok(fs0.route==='a1 a1','the switch of an activity with tabs reaches the folds in tabs that are not showing ('+fs0.route+')');
    await p.evaluate(()=>{const sec=[...document.querySelectorAll('section.bk-activity')].find(s=>s.querySelector(':scope > h3').textContent.startsWith('What to bring'));
      sec.querySelectorAll('details:not(.bk-hint):not(.bk-solution)').forEach(d=>{d.open=true;});});
    await p.waitForTimeout(50);
    ok((await foldState()).checked==='true,true','folds opened by hand turn the switch on');
    await p.evaluate(()=>{const d=[...document.querySelectorAll('details.bk-k-tip')].pop();d.open=false;});await p.waitForTimeout(50);
    ok((await foldState()).checked==='true,false','…and closing one turns it off');
    /* printing */
    await p.goto(BASE+'compile-reading/with-script.html');
    const beforeP=await p.evaluate(()=>{const all=[...document.querySelectorAll('.booklet details')];all[1].open=true;const was=all.map(d=>d.open);
      window.dispatchEvent(new Event('beforeprint'));const during=all.map(d=>d.open);window.dispatchEvent(new Event('afterprint'));return {was,during,after:all.map(d=>d.open)};});
    ok(beforeP.during.every(Boolean)&&beforeP.during.length===6,'before printing every fold is open (four the author folded, a hint and a solution): '+beforeP.during.length);
    ok(JSON.stringify(beforeP.after)===JSON.stringify(beforeP.was),'after printing each fold is as it was');

    /* a fold outside any activity: one switch for the page, under its title, lede and contents */
    await p.goto(BASE+'compile-article/with-script.html');
    const pg=await p.evaluate(()=>({n:document.querySelectorAll('.bk-foldsw').length,prev:document.querySelector('.bk-foldsw').previousElementSibling.className,next:document.querySelector('.bk-foldsw').nextElementSibling.id,
      parent:document.querySelector('.bk-foldsw').parentElement.tagName}));
    ok(pg.n===1&&pg.prev==='bk-toc'&&pg.next==='gathering'&&pg.parent==='ARTICLE','a fold outside any activity gets one switch for the page, after its title, lede and contents ('+JSON.stringify(pg)+')');
    await p.click('.bk-foldsw');
    ok(await p.evaluate(()=>document.querySelector('details.bk-fold').open&&document.querySelector('.bk-foldsw').getAttribute('aria-checked')==='true'),'…and it opens that fold');
    await p.goto(BASE+'compile-reading/with-script.html');

    /* ---- copy a heading's link ---- */
    await p.goto(BASE+'compile-reading/with-script.html');
    await p.evaluate(()=>navigator.clipboard.writeText('before'));
    const anchor='h3#what-to-bring > a.bk-anchor';
    await p.click(anchor);
    await p.waitForFunction(()=>document.querySelector('.bk-said').textContent!=='',null,{timeout:2000});
    const cp=await p.evaluate(async()=>({clip:await navigator.clipboard.readText(),live:document.querySelector('.bk-said').textContent,role:document.querySelector('.bk-said').getAttribute('role'),
      a:document.querySelector('h3#what-to-bring > a.bk-anchor').textContent,hash:location.hash,url:location.href}));
    ok(cp.clip===cp.url&&/#what-to-bring$/.test(cp.clip),'the heading\'s full address is on the clipboard ('+cp.clip+')');
    ok(cp.live==='Link copied'&&cp.role==='status'&&cp.a==='✓','…said in words to a status region, and by a tick in the link ('+cp.live+')');
    ok(cp.hash==='#what-to-bring','…and the link still goes to the heading');
    await p.waitForFunction(()=>document.querySelector('.bk-said').textContent==='',null,{timeout:4000});
    ok(await p.evaluate(()=>document.querySelector('h3#what-to-bring > a.bk-anchor').textContent==='#'&&!document.querySelector('.bk-copied')),'…and the link is itself again after a moment');
    ok(JSON.stringify(await storage(p))==='{"local":0,"session":0,"cookie":"","idb":0}','copying stores nothing');
    /* a click with a modifier key, or with another button, is the browser's own (a new tab, say): nothing is copied */
    await p.goto(BASE+'compile-reading/with-script.html');
    await p.evaluate(async()=>{await navigator.clipboard.writeText('before');window.addEventListener('click',e=>e.preventDefault());});
    for(const init of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}]){
      await p.evaluate(i=>document.querySelector('h3#what-to-bring > a.bk-anchor').dispatchEvent(new MouseEvent('click',Object.assign({bubbles:true,cancelable:true},i))),init);
      await p.waitForTimeout(120);
      ok(await p.evaluate(async()=>(await navigator.clipboard.readText())==='before'&&document.querySelector('.bk-said').textContent===''),'a click with '+Object.keys(init)[0]+' copies nothing');}
    /* no clipboard: only a link */
    const c2=await b.newContext({viewport:{width:1000,height:800},javaScriptEnabled:true});await serve(c2);
    await c2.addInitScript(()=>{try{Object.defineProperty(navigator,'clipboard',{value:undefined});}catch(e){}});
    const p2=await c2.newPage();const e2=[];await open(c2,p2,'compile-reading/with-script.html',e2);
    await p2.click('h3#what-to-bring > a.bk-anchor');await p2.waitForTimeout(200);
    ok(await p2.evaluate(()=>location.hash==='#what-to-bring'&&document.querySelector('.bk-said').textContent===''&&document.querySelector('h3#what-to-bring > a.bk-anchor').textContent==='#')&&!e2.length,'with no clipboard the link is only a link, and nothing breaks');
    await c2.close();

    /* ---- contrast of what the script adds ---- */
    await p.goto(BASE+'compile-reading/with-script.html');
    await p.hover(mark1);await p.waitForSelector('.bk-peek:not([hidden])');
    for(const scheme of ['light','dark']){
      await p.emulateMedia({colorScheme:scheme});
      const cs=await p.evaluate(()=>{const bg=e=>{let x=e;while(x){const c=getComputedStyle(x).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;x=x.parentElement;}return 'rgb(255, 255, 255)';};
        return ['.bk-tabbtn','.bk-tabbtn[aria-selected=true]','.bk-foldsw','.bk-peek'].map(s=>{const e=document.querySelector(s);return e?[s,getComputedStyle(e).color,bg(e)]:[s,null,null];});});
      for(const [s,fg,bgc] of cs) ok(fg&&ratio(fg,bgc)>=4.5,scheme+': '+s+' keeps a readable contrast ('+(fg?ratio(fg,bgc).toFixed(1):'missing')+':1)');}
    await p.emulateMedia({colorScheme:'light'});

    /* ---- the axe pass, when a copy is given ---- */
    if(process.env.AXE&&fs.existsSync(process.env.AXE)){
      /* what axe finds with the script, less what it finds on the same page without it (the compiled page's own, not these parts') */
      const axeOn=async file=>{await p.goto(BASE+file);await p.addScriptTag({content:fs.readFileSync(process.env.AXE,'utf8')});
        if(/with-script/.test(file)){await p.hover(mark1);await p.waitForSelector('.bk-peek:not([hidden])');}
        const res=await p.evaluate(()=>axe.run(document,{runOnly:['wcag2a','wcag2aa']}));
        return {v:res.testEngine.version,found:res.violations.flatMap(x=>x.nodes.map(n=>x.id+' '+n.target.join(' ')))};};
      const base=await axeOn('compile-reading/index.html'),withJs=await axeOn('compile-reading/with-script.html');
      const added=withJs.found.filter(x=>!base.found.includes(x));
      ok(added.length===0,'axe '+withJs.v+' (WCAG 2 A and AA) finds nothing with the script that it does not find without it'+(added.length?': '+added.join('; '):'')+' ('+base.found.length+' already on the compiled page)');}

    if(process.env.AXE&&fs.existsSync(process.env.AXE)){
      await p.goto(BASE+'views.html');await p.addScriptTag({content:fs.readFileSync(process.env.AXE,'utf8')});
      await p.evaluate(()=>{document.querySelectorAll('.bk-vbtn').forEach(x=>x.click());document.querySelector('.bk-vq').value='a';document.querySelector('.bk-vq').dispatchEvent(new Event('input'));});
      const res=await p.evaluate(()=>axe.run(document,{runOnly:['wcag2a','wcag2aa']}));
      ok(res.violations.length===0,'axe on the data views with every bar open and a search on: '+(res.violations.map(v=>v.id+' x'+v.nodes.length).join(', ')||'no violation'));}

    const own=BASE;
    const outside=reqs.filter(u=>!u.startsWith(own)&&!u.startsWith('data:'));
    ok(!errs.length&&!outside.length&&reqs.every(u=>u.startsWith('data:')||/\.html$|\.css$|\.woff2$|\.js$/.test(new URL(u).pathname)),'only the page\'s own files are asked for, and no error is logged'+(errs.length?' ('+errs[0]+')':'')+(outside.length?' (outside: '+outside[0]+')':''));
    await ctx.close();
  }

  /* ================= touch: the first tap shows the note, the second goes to the foot ================= */
  {
    const ctx=await b.newContext({viewport:{width:390,height:800},hasTouch:true,isMobile:true,javaScriptEnabled:true});await serve(ctx);
    const p=await ctx.newPage();const errs=[];await open(ctx,p,'compile-reading/with-script.html',errs);
    const mark='a.bk-mark-a[href="#bk-note-1"]';
    await p.tap(mark);
    let st=await p.evaluate(()=>({open:!document.querySelector('.bk-peek').hidden,hash:location.hash,txt:document.querySelector('.bk-peek').textContent.slice(0,30),
      inView:(()=>{const r=document.querySelector('.bk-peek').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()}));
    ok(st.open&&st.hash===''&&/Park Trail/.test(st.txt)&&st.inView,'touch: a first tap shows the note and stays on the page, the box inside a phone-wide window ('+JSON.stringify(st)+')');
    await p.tap(mark);
    st=await p.evaluate(()=>({hash:location.hash,open:!document.querySelector('.bk-peek').hidden}));
    ok(st.hash==='#bk-note-1'&&!st.open,'touch: a second tap on the same mark goes to the foot ('+JSON.stringify(st)+')');
    await p.goto(BASE+'compile-reading/with-script.html');
    await p.tap(mark);await p.tap('h1');
    ok(await p.evaluate(()=>document.querySelector('.bk-peek').hidden),'touch: a tap elsewhere dismisses the box');
    ok(!errs.length,'touch: no error is logged');
    await ctx.close();
  }

  /* ================= script ON: the data views ================= */
  {
    const ctx=await b.newContext({viewport:{width:1000,height:900},javaScriptEnabled:true});await serve(ctx);
    const errs=[];const p=await ctx.newPage();await open(ctx,p,'views.html',errs);
    const ids=['v-table','v-list','v-cards','v-tiles','v-bars'];
    const have=await p.evaluate(()=>[...document.querySelectorAll('.bk-vctl')].map(c=>c.nextElementSibling.id));
    ok(JSON.stringify(have)===JSON.stringify(ids),'controls above a table, list, cards, tiles and bars, in that order ('+have+')');
    ok(await p.evaluate(()=>['v-line','v-one','v-empty','v-nocols','v-after'].every(i=>{const e=document.getElementById(i);return !e.previousElementSibling||!e.previousElementSibling.classList.contains('bk-vctl');})),
      'a line chart, a view of one row, an empty view and a view with no values are left alone');
    ok(await p.evaluate(()=>document.querySelector('#v-line').outerHTML.length>0&&!document.querySelector('#v-line [hidden]')&&!document.querySelector('#v-nocols [hidden]')),'…and their rows are untouched');
    ok(await p.evaluate(()=>document.querySelector('.bk-vbtn').getAttribute('aria-expanded')==='false'&&document.querySelector('.bk-vbar').hidden),'the bar starts closed behind one quiet button');
    const orig=['Beans','Courgette','Apples','Tomatoes','Leeks'];
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(orig),'rows start in the order written');
    const ctl=id=>p.locator('#'+id).evaluateHandle(e=>e.previousElementSibling);
    const q=async(id,sel)=>(await ctl(id)).asElement().$(sel);
    /* the table */
    await (await q('v-table','.bk-vbtn')).click();
    ok(await p.evaluate(()=>document.querySelector('.bk-vbtn').getAttribute('aria-expanded')==='true'&&!document.querySelector('.bk-vbar').hidden&&document.activeElement.classList.contains('bk-vq')),'the button opens the bar and puts the focus in the search box');
    const names=await p.evaluate(()=>({sel:document.querySelector('.bk-vsel').getAttribute('aria-label'),opts:[...document.querySelector('.bk-vsel').options].map(o=>o.textContent),
      search:document.querySelector('.bk-vq').getAttribute('aria-label'),dir:document.querySelector('.bk-vdir').getAttribute('aria-label'),dis:document.querySelector('.bk-vdir').disabled}));
    ok(names.sel==='Sort by'&&names.opts.join('|')==='Original order|crop|kilos|picked'&&names.search==='Search'&&names.dis,'every control is named; the columns are the view\'s own ('+names.opts.join('|')+')');
    const LABEL=['Original order','crop','kilos','picked'];
    const sort=(id,i)=>(async()=>{const s=await q(id,'.bk-vsel');await s.selectOption({label:LABEL[i]});})();
    await sort('v-table',2);
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(['Tomatoes','Beans','Courgette','Apples','Leeks']),'a number column sorts as numbers (4.25, 4.5, 12, 30.25: not 4.5 before 4.25), a row with no value last');
    await (await q('v-table','.bk-vdir')).click();
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(['Apples','Courgette','Beans','Tomatoes','Leeks']),'the direction button reverses it, the row with no value still last');
    ok(await p.evaluate(()=>document.querySelector('.bk-vdir').getAttribute('aria-label')==='Descending'),'…and says which way it now runs');
    await sort('v-table',1);
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(['Apples','Beans','Courgette','Leeks','Tomatoes']),'a text column sorts by the page\'s language (A to Z)');
    await sort('v-table',0);
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(orig),'"Original order" brings back the order written');
    await sort('v-table',3);
    ok(JSON.stringify(await rowsOf(p,'v-table','picked'))===JSON.stringify(['2026-09-02','2026-09-05','2026-09-10','2026-09-28','2026-10-01']),'dates written year first sort in order');
    await sort('v-table',0);
    /* the filter */
    const inp=await q('v-table','.bk-vq');
    await inp.fill('pp');
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(['Apples']),'the search hides the rows that do not hold the words');
    ok((await texts(p,'.bk-vlive'))[0]==='1 of 5 shown','…and says how many are shown ("1 of 5 shown")');
    await inp.fill('APP');
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(['Apples']),'a search is not case-sensitive: "APP" finds "Apples"');
    await inp.fill('cou');
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(['Courgette']),'…and "cou" finds "Courgette" (the value\'s capital letter does not hide it)');
    await inp.fill('pp');
    await inp.fill('2026-09-0');
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(['Beans','Tomatoes']),'the search looks in every column (a date here)');
    await inp.fill('zzz');
    ok((await texts(p,'.bk-vlive'))[0]==='Nothing matches.'&&(await rowsOf(p,'v-table','crop')).length===0,'no match says so');
    await inp.fill('o');await sort('v-table',2);
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(['Tomatoes','Courgette']),'filter and sort work together');
    ok(await p.evaluate(()=>!document.querySelector('.bk-vclear').hidden),'Clear is shown while a sort or a search is on');
    await (await q('v-table','.bk-vclear')).click();
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(orig)&&await p.evaluate(()=>document.querySelector('.bk-vclear').hidden&&document.querySelector('.bk-vq').value===''&&document.querySelector('.bk-vsel').value===''),'Clear brings back every row in the order written');
    await p.keyboard.press('Escape');
    ok(await p.evaluate(()=>document.querySelector('.bk-vbar').hidden&&document.activeElement===document.querySelector('.bk-vbtn')),'Escape closes the bar and puts the focus back on its button');
    /* Escape in a search box with words in it ends the filter and leaves the bar open; the next Escape closes the bar */
    await (await q('v-table','.bk-vbtn')).click();await inp.fill('pp');
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(['Apples']),'(set up) a search is on');
    await p.keyboard.press('Escape');
    ok(await p.evaluate(()=>document.querySelector('.bk-vq').value===''&&!document.querySelector('.bk-vbar').hidden)&&JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(orig)&&(await texts(p,'.bk-vlive'))[0]==='',
      'Escape in a search box with words in it empties it, shows every row again and leaves the bar open');
    await p.keyboard.press('Escape');
    ok(await p.evaluate(()=>document.querySelector('.bk-vbar').hidden&&document.activeElement===document.querySelector('.bk-vbtn')),'…and the next Escape closes the bar');
    /* the search box's own cross fires "search", and a committed edit fires "change": each ends the filter too */
    await (await q('v-table','.bk-vbtn')).click();
    for(const type of ['search','change']){
      await inp.fill('pp');
      await inp.evaluate((e,t)=>{e.value='';e.dispatchEvent(new Event(t,{bubbles:true}));},type);
      ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(orig),'a "'+type+'" event on an emptied search box shows every row again');}
    await inp.fill('');
    await p.keyboard.press('Escape');
    /* a header row stays where it is */
    ok(await p.evaluate(()=>[...document.querySelectorAll('#v-table thead th')].map(x=>x.textContent).join()==='Crop,Kilos,Picked'&&document.querySelector('#v-table tbody').children.length===5),'a table\'s header stays where it is and the body keeps its five rows');
    /* the others */
    await p.reload();await p.evaluate(()=>document.fonts.ready);
    await (await q('v-list','.bk-vbtn')).click();await sort('v-list',1);
    ok(JSON.stringify(await rowsOf(p,'v-list','crop'))===JSON.stringify(['Apples','Beans','Courgette','Leeks','Tomatoes']),'a list sorts');
    await (await q('v-tiles','.bk-vbtn')).click();await (await q('v-tiles','.bk-vq')).fill('ea');
    ok(JSON.stringify(await rowsOf(p,'v-tiles','crop'))===JSON.stringify(['Beans']),'tiles filter');
    await (await q('v-bars','.bk-vbtn')).click();await sort('v-bars',2);await (await q('v-bars','.bk-vdir')).click();
    ok(JSON.stringify(await rowsOf(p,'v-bars','crop'))===JSON.stringify(['Apples','Courgette','Beans','Tomatoes','Leeks']),'bars sort, largest first');
    /* cards: rows sort within their own group */
    await (await q('v-cards','.bk-vbtn')).click();await sort('v-cards',2);await (await q('v-cards','.bk-vdir')).click();
    const groups=await p.evaluate(()=>[...document.querySelectorAll('#v-cards .bk-dv-cards > *')].map(g=>g.matches('[data-bk-row]')?g.querySelector('[data-bk-col=crop]').textContent:'#'+g.textContent));
    ok(JSON.stringify(groups)==='["#First","Apples","Courgette","Beans","#Second","Tomatoes","Leeks"]','cards in groups (all siblings under one parent, as the views lane writes them) sort inside each group, between its heading and the next (largest first here) ('+JSON.stringify(groups)+')');
    ok(await p.evaluate(()=>document.getElementById('v-after').previousElementSibling.id==='v-nocols'),'nothing else on the page moves');
    /* nothing kept */
    ok(JSON.stringify(await storage(p))==='{"local":0,"session":0,"cookie":"","idb":0}','nothing is stored');
    await p.reload();await p.evaluate(()=>document.fonts.ready);
    ok(JSON.stringify(await rowsOf(p,'v-table','crop'))===JSON.stringify(orig)&&JSON.stringify(await rowsOf(p,'v-cards','crop'))===JSON.stringify(orig)&&await p.evaluate(()=>[...document.querySelectorAll('[data-bk-row][hidden]')].length===0&&document.querySelector('.bk-vq').value===''),'a reload starts clean: the order written, every row shown, no search');
    /* the controls in French */
    await p.evaluate(()=>{document.querySelector('article').setAttribute('lang','fr');});
    ok(!errs.length,'no error is logged'+(errs.length?' ('+errs[0]+')':''));
    for(const scheme of ['light','dark']){
      await p.emulateMedia({colorScheme:scheme});
      await (await q('v-table','.bk-vbtn')).evaluate(e=>{if(e.getAttribute('aria-expanded')==='false') e.click();});
      const cs=await p.evaluate(()=>{const bg=e=>{let x=e;while(x){const c=getComputedStyle(x).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;x=x.parentElement;}return 'rgb(255, 255, 255)';};
        return ['.bk-vbtn','.bk-vq','.bk-vsel','.bk-vdir:not(:disabled)','.bk-vlive'].map(s=>{const e=document.querySelector(s);return e?[s,getComputedStyle(e).color,bg(e)]:[s,null,null];});});
      for(const [s,fg,bgc] of cs) if(fg) ok(ratio(fg,bgc)>=4.5,scheme+': '+s+' keeps a readable contrast ('+ratio(fg,bgc).toFixed(1)+':1)');}
    await ctx.close();
    /* French words, in a page whose language says so */
    const cf=await b.newContext({viewport:{width:1000,height:900}});await serve(cf);
    fs.writeFileSync(path.join(OUT,'views-fr.html'),viewsPage.replace('lang="en"><head>','lang="fr"><head>').replace('<article class="booklet" lang="en">','<article class="booklet" lang="fr">'));
    const pf=await cf.newPage();await pf.goto(BASE+'views-fr.html');
    ok(await pf.evaluate(()=>document.querySelector('.bk-vbtn').textContent==='Trier et filtrer'&&document.querySelector('.bk-vsel option').textContent==='Ordre d’origine'),'the control speaks the page\'s language (French here)');
    await cf.close();
  }


  /* ================= script ON: the views lane's real markup (static fixtures, PR #82 at 6726a69) ================= */
  {
    const ctx=await b.newContext({viewport:{width:1000,height:900},javaScriptEnabled:true});await serve(ctx);
    const errs=[];const p=await ctx.newPage();await open(ctx,p,'views-lane/index.html',errs);
    const ctlOf=id=>'#'+id+' + .bk-vctl';
    /* the view after a heading, drawn as tokens in document order: a row by its value in a column, a group heading by its words;
       a token starts with ~ when it is not shown (itself or something around it is not displayed) */
    const lay=(id,col)=>p.evaluate(([i,c])=>{let v=document.getElementById(i).nextElementSibling;while(v&&!v.hasAttribute('data-bk-view')) v=v.nextElementSibling;
      return [...v.querySelectorAll('[data-bk-row],.bk-dv-group,.bk-grouprow')].map(e=>{const t=e.matches('[data-bk-row]')?e.querySelector('[data-bk-col="'+c+'"]').textContent.trim():'#'+e.textContent.trim().replace(/\d+ rows?$/,'').trim();
        return (e.checkVisibility()?'':'~')+t;});},[id,col]);
    const bare=a=>a.map(x=>x.replace(/^~/,''));
    const shown=a=>a.filter(x=>x[0]!=='~');
    const open_=id=>p.click(ctlOf(id)+' .bk-vbtn');
    const typ=(id,t)=>p.fill(ctlOf(id)+' .bk-vq',t);
    const pick=(id,label)=>p.selectOption(ctlOf(id)+' .bk-vsel',{label});
    const flip=id=>p.click(ctlOf(id)+' .bk-vdir');
    const live=id=>p.evaluate(i=>document.querySelector('#'+i+' + .bk-vctl .bk-vlive').textContent,id);

    const all=await p.evaluate(()=>[...document.querySelectorAll('h3[id]')].filter(h=>h.nextElementSibling&&h.nextElementSibling.classList.contains('bk-vctl')).map(h=>h.id));
    ok(JSON.stringify(all)==='["tiles","tiles-grouped","cards","cards-grouped","table","table-grouped-limited","list","list-grouped","nested-list","bars","bars-grouped"]','controls over every real view of two rows or more (tiles, cards, tables, lists, a nested list, bars) and none over a line chart ('+all+')');

    /* the groups: a filter and a sort keep every row with its own group, and Clear puts back exactly what was written */
    const GROUPED=[['tiles-grouped','what','trays',['#warn','Trays left over']],['cards-grouped','item','sunflower',['#Front','Sunflower seeds']],
      ['table-grouped-limited','item','yeast',['#Fridge','Yeast']],['list-grouped','item','salt',['#Front','Salt']]];
    for(const [id,col,query,want] of GROUPED){
      const orig=await lay(id,col);
      ok(orig.filter(x=>x[0]==='#').length>=3&&orig.every(x=>x[0]!=='~'),id+': (set up) three or more groups, all shown ('+orig.join(' / ')+')');
      await open_(id);
      await typ(id,query);
      let now=await lay(id,col);
      ok(JSON.stringify(shown(now))===JSON.stringify(want),id+': a search shows only the matching row and its own group\'s heading ('+now.join(' / ')+')');
      ok(JSON.stringify(bare(now))===JSON.stringify(orig),id+': …and no row or heading has moved while the search is on');
      await typ(id,'');
      now=await lay(id,col);
      ok(JSON.stringify(now)===JSON.stringify(orig),id+': clearing the search puts every row and heading back exactly as written');
      /* a search, a sort and Clear, one after the other */
      await typ(id,'e');await pick(id,col);await flip(id);await typ(id,'');
      now=await lay(id,col);
      const kinds=x=>x.map(t=>t.replace(/^~/,'')[0]==='#'?'#':'r').join('');
      ok(kinds(now)===kinds(orig)&&JSON.stringify(now.filter(t=>t[0]==='#'))===JSON.stringify(orig.filter(t=>t[0]==='#')),id+': after a sort the headings are where they were and the rows still sit between them ('+kinds(now)+')');
      await p.click(ctlOf(id)+' .bk-vclear');
      ok(JSON.stringify(await lay(id,col))===JSON.stringify(orig),id+': Clear restores the order written, exactly');
      await p.keyboard.press('Escape');
    }
    /* rows sort among their own group: descending, then the Front group of the cards runs Sunflower seeds before Salt */
    {
      const id='cards-grouped';await open_(id);await pick(id,'item');await flip(id);
      const d=await lay(id,'item');
      const i=d.indexOf('#Front');
      ok(JSON.stringify(d.slice(i,i+3))==='["#Front","Sunflower seeds","Salt"]'&&d[0]==='#Back store'&&d.indexOf('#Fridge')===3,id+': Z to A inside each group, none crossing to another ('+d.join(' / ')+')');
      await flip(id);const a=await lay(id,'item'),j=a.indexOf('#Front');
      ok(JSON.stringify(a.slice(j,j+3))==='["#Front","Salt","Sunflower seeds"]','…and A to Z the other way');
      await p.click(ctlOf(id)+' .bk-vclear');await p.keyboard.press('Escape');
    }
    /* a heading with no row left to show goes with them, and comes back with the first that matches */
    {
      const id='table-grouped-limited';await open_(id);await typ(id,'zzz');
      const z=await lay(id,'item');
      ok(z.every(x=>x[0]==='~')&&(await live(id))==='Nothing matches.','a search that matches nothing hides every row and every group heading, and says so ('+z.join(' / ')+')');
      await typ(id,'salt');const s2=await lay(id,'item');
      ok(JSON.stringify(shown(s2))==='["#Front","Salt"]','…and a group is back as soon as one of its rows matches');
      await typ(id,'');await p.keyboard.press('Escape');
    }
    /* the plain views keep their order too, and the tile groups hide whole */
    for(const [id,col,query] of [['tiles','what','trays'],['cards','item','yeast'],['table','item','yeast'],['list','item','yeast'],['bars','day','u']]){
      const orig=await lay(id,col);await open_(id);await typ(id,query);const mid=await lay(id,col);
      ok(JSON.stringify(bare(mid))===JSON.stringify(orig)&&mid.some(x=>x[0]==='~')&&mid.some(x=>x[0]!=='~'),id+': a search hides some rows and shows some, in the order written ('+mid.join(' / ')+')');
      await typ(id,'');ok(JSON.stringify(await lay(id,col))===JSON.stringify(orig),id+': …and clearing it puts every row back');await p.keyboard.press('Escape');}
    ok(await p.evaluate(()=>{const g=[...document.querySelectorAll('#tiles-grouped ~ .bk-view')][0];return !!g;}),'(set up) the grouped tiles are there');
    {
      const id='tiles-grouped';await open_(id);await typ(id,'trays');
      const r=await p.evaluate(i=>{let v=document.getElementById(i).nextElementSibling;while(!v.hasAttribute('data-bk-view')) v=v.nextElementSibling;
        return [...v.children].map(e=>e.className.split(' ')[0]+':'+(e.checkVisibility()?'shown':'hidden'));},id);
      ok(JSON.stringify(r)==='["bk-dv-group:hidden","bk-dv-tiles:hidden","bk-dv-group:shown","bk-dv-tiles:shown","bk-dv-group:hidden","bk-dv-tiles:hidden","bk-dv-group:hidden","bk-dv-tiles:hidden"]','tile groups: a group with no row to show is hidden whole, heading and tiles ('+r.join(' ')+')');
      await typ(id,'');await p.keyboard.press('Escape');
    }
    {
      /* the list in group cards: the card goes whole, not just its heading */
      const id='list-grouped';await open_(id);await typ(id,'salt');
      const r=await p.evaluate(i=>{let v=document.getElementById(i).nextElementSibling;while(!v.hasAttribute('data-bk-view')) v=v.nextElementSibling;
        return [...v.querySelectorAll('.bk-dv-gcard')].map(e=>e.checkVisibility()?'shown':'hidden');},id);
      ok(JSON.stringify(r)==='["hidden","hidden","shown"]','list groups: a card whose rows are all hidden is hidden whole ('+r+')');
      await typ(id,'');await p.keyboard.press('Escape');
    }

    /* the nested list: a branch stands for its rows */
    {
      const id='nested-list',col='label';
      const orig=await lay(id,col);
      ok(JSON.stringify(bare(orig))==='["Open the shop","Bake","Rolls","Rye","Hang the sign","Close up"]'&&orig.slice(1,5).every(x=>x[0]==='~')&&orig[0][0]!=='~'&&orig[5][0]!=='~','(set up) the nested list shows its top rows, its folds closed ('+orig.join(' / ')+')');
      const folds=()=>p.evaluate(i=>{let v=document.getElementById(i).nextElementSibling;while(!v.hasAttribute('data-bk-view')) v=v.nextElementSibling;return [...v.querySelectorAll('details')].map(d=>d.open?'open':'closed').join();},id);
      await open_(id);
      await typ(id,'rolls');
      let n=await lay(id,col);
      ok(JSON.stringify(n)==='["Open the shop","Bake","Rolls","~Rye","~Hang the sign","~Close up"]','a match inside closed folds opens the folds above it and keeps them: only the match and its branches are shown ('+n.join(' / ')+')');
      ok((await folds())==='open,open'&&(await live(id))==='1 of 6 shown','…the count is of the rows that match ('+await live(id)+')');
      await typ(id,'rye');
      n=await lay(id,col);
      ok(JSON.stringify(n)==='["Open the shop","Bake","~Rolls","Rye","~Hang the sign","~Close up"]','a branch with no match inside goes ('+n.join(' / ')+')');
      await typ(id,'close');
      n=await lay(id,col);
      ok(JSON.stringify(n)==='["~Open the shop","~Bake","~Rolls","~Rye","~Hang the sign","Close up"]'&&(await folds())==='closed,closed','a search for a row elsewhere hides whole branches and leaves the folds as the reader had them ('+n.join(' / ')+')');
      await typ(id,'zzz');
      const vis=await p.evaluate(i=>{let v=document.getElementById(i).nextElementSibling;while(!v.hasAttribute('data-bk-view')) v=v.nextElementSibling;return [...v.querySelectorAll('[data-bk-row]')].filter(r=>r.checkVisibility()).length;},id);
      ok(vis===0&&(await live(id))==='Nothing matches.','"Nothing matches." with no row left on show, summary rows included ('+vis+' shown)');
      await typ(id,'');
      ok(JSON.stringify(await lay(id,col))===JSON.stringify(orig)&&(await folds())==='closed,closed','clearing the search puts the rows back and the folds as the reader had them');
      /* a fold the reader opened by hand stays open when the search ends */
      await p.evaluate(i=>{let v=document.getElementById(i).nextElementSibling;while(!v.hasAttribute('data-bk-view')) v=v.nextElementSibling;v.querySelector('details').open=true;},id);
      await typ(id,'rolls');await typ(id,'');
      ok((await folds())==='open,closed','a fold opened by hand before the search is still open after it ('+await folds()+')');
      await p.evaluate(i=>{let v=document.getElementById(i).nextElementSibling;while(!v.hasAttribute('data-bk-view')) v=v.nextElementSibling;v.querySelector('details').open=false;},id);
      /* sort orders the rows that share a branch, and a branch moves whole */
      await pick(id,'label');
      let t=await lay(id,col);
      ok(JSON.stringify(bare(t))==='["Close up","Open the shop","Bake","Rolls","Rye","Hang the sign"]','sorted A to Z: the top rows among themselves, each branch whole, the rows of a branch among theirs ('+t.join(' / ')+')');
      await flip(id);
      t=await lay(id,col);
      ok(JSON.stringify(bare(t))==='["Open the shop","Hang the sign","Bake","Rye","Rolls","Close up"]','…and Z to A reverses each level ('+t.join(' / ')+')');
      await p.click(ctlOf(id)+' .bk-vclear');
      ok(JSON.stringify(await lay(id,col))===JSON.stringify(orig),'Clear puts the nested list back as written');
      await p.keyboard.press('Escape');
    }
    ok(!errs.length,'the real views raise no error'+(errs.length?' ('+errs[0]+')':''));
    await ctx.close();
  }

  /* ================= 3000 rows: a keystroke stays quick ================= */
  {
    const ctx=await b.newContext({viewport:{width:1000,height:900},javaScriptEnabled:true});await serve(ctx);
    const errs=[];const p=await ctx.newPage();await open(ctx,p,'big.html',errs);
    const r=await p.evaluate(()=>{const inp=document.querySelector('.bk-vq'),out=[],counts=[],still=[];
      const key=(t,into)=>{const t0=performance.now();inp.value=t;inp.dispatchEvent(new Event('input',{bubbles:true}));document.body.getBoundingClientRect();document.getElementById('v-after').offsetTop;into.push(performance.now()-t0);};
      const shown=()=>[...document.querySelectorAll('#v-big > [data-bk-row]')].filter(x=>!x.hidden).length;
      /* typing "item" changes which rows show not at all (every row holds it): the page must not be redone */
      for(const t of ['i','it','ite','item','item ','item 1']) key(t,still);
      key('',[]);
      /* words that do change the set, narrowing and widening */
      for(const t of ['1','12','123','12','1','','word3','wor','']){key(t,out);counts.push(shown());}
      return {out,counts,still};});
    const worst=Math.max(...r.out),worstStill=Math.max(...r.still.slice(0,4));
    ok(r.counts[5]===3000&&r.counts[8]===3000&&r.counts[1]>0&&r.counts[1]<r.counts[0],'at 3000 rows the search shows the right rows ('+r.counts+')');
    ok(worstStill<200,'at 3000 rows a keystroke that changes no row\'s state costs nothing like a redo of the page (worst '+Math.round(worstStill)+' ms of '+r.still.map(Math.round)+'; redoing every row took about 400)');
    ok(worst<2000,'at 3000 rows no keystroke that does change the rows takes more than two seconds to filter and lay out (worst '+Math.round(worst)+' ms of '+r.out.map(Math.round)+'; most of it is the browser laying out the rows that come back)');
    ok(!errs.length,'no error with 3000 rows');
    await ctx.close();
  }

  /* ================= a short screen: the citation box keeps to it ================= */
  for(const [w,h] of [[320,300],[390,260]]){
    const ctx=await b.newContext({viewport:{width:w,height:h},javaScriptEnabled:true});await serve(ctx);
    const errs=[];const p=await ctx.newPage();await open(ctx,p,'compile-reading/with-script.html',errs);
    /* a note longer than the screen is tall (made-up words added to the foot's note before the box is made) */
    await p.evaluate(()=>{document.querySelector('#bk-note-1').appendChild(document.createTextNode(' '+'More made-up words to make this note long. '.repeat(16)));});
    /* the pointer goes to the mark by hand: on a screen this short the box may well cover the mark, and hover() would wait for it to clear */
    await p.evaluate(()=>document.querySelector('a.bk-mark-a[href="#bk-note-1"]').scrollIntoView({block:'center'}));
    const mb=await p.locator('a.bk-mark-a[href="#bk-note-1"]').boundingBox();await p.mouse.move(mb.x+mb.width/2,mb.y+mb.height/2);
    await p.waitForSelector('.bk-peek:not([hidden])');
    const r=await p.evaluate(()=>{const e=document.querySelector('.bk-peek'),b=e.getBoundingClientRect(),cs=getComputedStyle(e);
      return {top:b.top,bottom:b.bottom,left:b.left,right:b.right,h:innerHeight,w:innerWidth,ov:cs.overflowY,scrolls:e.scrollHeight>e.clientHeight};});
    ok(r.top>=0&&r.bottom<=r.h+0.5&&r.left>=0&&r.right<=r.w+0.5,w+'x'+h+': the whole box is on the screen ('+JSON.stringify(r)+')');
    ok(r.ov==='auto'&&r.scrolls,'…and a note longer than the room scrolls inside the box');
    if(r.scrolls){
      const end=await p.evaluate(()=>{const e=document.querySelector('.bk-peek');e.scrollTop=e.scrollHeight;const b=e.getBoundingClientRect();return {last:e.lastElementChild?e.lastElementChild.getBoundingClientRect().bottom<=b.bottom+1:true,inside:b.bottom<=innerHeight+0.5};});
      ok(end.last&&end.inside,w+'x'+h+': scrolled to its foot, the box shows the end of the note');}
    ok(!errs.length,w+'x'+h+': no error');
    await ctx.close();
  }

  /* ================= the box's id is not one the page already has ================= */
  {
    const ctx=await b.newContext({viewport:{width:1000,height:800},javaScriptEnabled:true});await serve(ctx);
    const errs=[];const p=await ctx.newPage();await open(ctx,p,'compile-reading/peek-id.html',errs);
    await p.hover('a.bk-mark-a[href="#bk-note-1"]');await p.waitForSelector('.bk-peek:not([hidden])');
    const r=await p.evaluate(()=>{const e=document.querySelector('.bk-peek'),m=document.querySelector('a.bk-mark-a[href="#bk-note-1"]');
      return {id:e.id,same:document.querySelectorAll('[id="bk-peek-1"]').length,by:m.getAttribute('aria-describedby'),found:document.getElementById(m.getAttribute('aria-describedby'))===e};});
    ok(r.id!=='bk-peek-1'&&r.same===1&&r.found,'the box takes an id the page does not have, like the other parts ('+JSON.stringify(r)+')');
    ok(!errs.length,'no error');
    await ctx.close();
  }

  /* ================= script OFF, and a page with none of the markup ================= */
  {
    const off=await b.newContext({viewport:{width:1000,height:800},javaScriptEnabled:false});await serve(off);
    const p=await off.newPage();
    for(const file of ['compile-reading/with-script.html','compile-reading/index.html']){
      await p.goto(BASE+file);
      const dom=await p.evaluate(()=>({added:document.querySelectorAll('[role=tab],[role=tablist],[role=tabpanel],[role=tooltip],[role=switch],.bk-tabbar,.bk-peek,.bk-foldsw,.bk-vctl,.bk-said,.bk-tabbtn').length,
        hidden:document.querySelectorAll('.booklet [hidden]').length,tabs:[...document.querySelectorAll('section.bk-tab')].map(x=>x.getBoundingClientRect().height>0),
        heads:[...document.querySelectorAll('section.bk-tab > h2, section.bk-tab > h3, section.bk-tab > h4')].map(h=>h.textContent.replace(/#/,'').trim()),
        anchors:[...document.querySelectorAll('a.bk-anchor')].map(a=>a.textContent+a.getAttribute('href').charAt(0)).every(x=>x==='##'),
        folds:[...document.querySelectorAll('details')].map(d=>d.open)}));
      ok(dom.added===0&&dom.hidden===0,file+', scripting off: nothing is added and nothing is hidden');
      ok(dom.tabs.length===5&&dom.tabs.every(Boolean)&&dom.heads.join('|')==='Plan|Short loop|Long loop|Hilly loop|During','…every tab is shown under its name ('+dom.heads.join(', ')+')');
      ok(dom.anchors&&dom.folds.every(x=>!x),'…the share links are plain links and every fold is closed as written');}
    const viewsOff=await off.newPage();await viewsOff.goto(BASE+'views-off.html');
    ok(await viewsOff.evaluate(()=>document.querySelectorAll('.bk-vctl').length===0&&document.querySelectorAll('[data-bk-row][hidden]').length===0&&document.querySelectorAll('#v-table tbody tr').length===5),'the views, scripting off: no control, every row shown, in the order written');
    const lane=await off.newPage();await lane.goto(BASE+'views-lane/off.html');
    ok(await lane.evaluate(()=>document.querySelectorAll('.bk-vctl,[data-bk-off],[hidden]').length===0&&[...document.querySelectorAll('[data-bk-row]')].every(r=>r.getClientRects().length||r.closest('details:not([open])'))),'the views lane\'s real views, scripting off: no control, nothing hidden, every row in the order written');
    await off.close();
    /* scripting on, a page with none of the markup: byte for byte what scripting off shows */
    const on=await b.newContext({viewport:{width:1000,height:800},javaScriptEnabled:true});await serve(on);
    const errs=[];const q=await on.newPage();await open(on,q,'plain/with-script.html',errs);
    const html1=await q.evaluate(()=>document.querySelector('article').outerHTML);
    const off2=await b.newContext({javaScriptEnabled:false});await serve(off2);const q2=await off2.newPage();await q2.goto(BASE+'plain/with-script.html');
    const html2=await q2.evaluate(()=>document.querySelector('article').outerHTML);
    ok(html1===html2&&!errs.length,'a page with none of the markup the parts work on is left exactly as it is, with the script loaded');
    await off2.close();await on.close();
  }

  await b.close();
  console.log(fails.length?fails.length+' FAILED':'compile reading helpers: all checks passed');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
