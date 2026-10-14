// Browser check of where the renderer keeps things (0.13.1): one IndexedDB database, read once at start, written behind.
// In headless Chromium:
//  1 a 10 MB booklet with an answer is kept, and after a reload found whole;
//  2 a booklet of the dashboard's shape (one module, a wiki of hub pages under one activity, an inbox activity with
//    questions, data blocks at the end; 3.4 MB and more), opened by link from the page's store, survives a keystroke and a
//    reload (with local storage, 0.13.0 and earlier, that kept copy overflowed and saving switched off);
//  3 what 0.12.0, 0.13.0 and the pre-change 0.13.1 left in local storage (test/seeds) is moved into IndexedDB on the first
//    start: the booklets open with their work, the theme and language hold, and local storage keeps only the theme's mirror;
//  4 a browser that refuses IndexedDB (open throws, or fails) keeps everything in local storage as before, and "Your
//    booklets" says the browser would not open its larger store, not private mode; one with no IndexedDB at all says nothing;
//  5 IndexedDB's own limit (the site's quota made small through the DevTools protocol): the toast and the list say the
//    browser ran out of room, not private mode, and the work stays for the visit;
//  6 the theme is painted from its mirror before the main script has read the store, so nothing flashes;
//  7 two tabs: each adds a booklet and both are kept; a tab coming back into focus lists the other's;
//  8 a change typed and the page left at once (a navigation, a closed tab) is kept;
//  9 a page opened from disk (file:) keeps its booklet in IndexedDB too;
// 10 newer wins after the move: the real 0.13.0 renderer (test/seeds/booklet-0.13.0.html.gz) in a second tab, still open,
//    and a visit that fell back to local storage, each typing before and after this tab: the later answer wins, one
//    entry for the booklet;
// 11 after the move, a visit with IndexedDB refused, or not answering (Safari's first-open hang), shows the reason on
//    an empty "Your booklets";
// 12 two windows on "Your booklets": a booklet added in one shows in the other at once, with no focus change (the count
//    in local storage, booklet.tick, and the storage event);
// and every request is a GET for the page itself or its store, with zero CSP violations and page errors.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/keep-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const {kept}=require('./kept.js');
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PAGE='https://bookletmd.test';
const HOST_CSP=CSP.replace('connect-src https://raw.githubusercontent.com','connect-src https://raw.githubusercontent.com '+PAGE);
if(HOST_CSP===CSP) throw new Error('csp.js no longer has the expected connect-src: update this test');
const SRC=fs.readFileSync(HTML,'utf8');
const withStore=SRC.replace('<meta name="theme-color"','<meta name="booklet-store" content="'+PAGE+'/pub/">\n<meta name="theme-color"');
const FM=(id,t)=>`---\nbooklet: "0.13"\nid: ${id}\ntitle: "${t}"\nlang: en\nversion: "2026-10-14"\n---\n\n`;
const PROSE=n=>`Invented words for a test, about nothing real: line ${n}, with **bold**, *slanted* and \`code\` words so there is Markdown to draw. `;
/* one activity of many pages, its question on the first */
function big(chars){let s=FM('test/ten-mb','Ten megabytes')+'> [!activity|big] Big pages\n\n> [!text|q long] A question on the first page\n\n';
  for(let n=0;s.length<chars;n++){s+='## Section '+n+'\n\n'+PROSE(n).repeat(40)+'\n\n';if(n%20===19) s+='***\n\n';}
  return s;}
/* the dashboard's shape (programme-ops' dashboard-booklet.py, read for its shape only): one module; a Dashboard activity
   of pages with queries; a page per hub under it (parent:), each a table and pages of prose; an Inbox activity (repeat)
   whose pages end in a choice and a long text question; the data blocks at the end, outside the module */
function dashboard(chars){
  let s=FM('test/dashboard','Dashboard: a test')+'```booklet theme\nbase: daylight\naccent: "#1f5f73"\nfont: sans\ndensity: comfortable\n```\n\n'
    +'> [!module|po-dashboard] Dashboard\n\n> [!activity|dashboard] Dashboard\n\nAn invented dashboard in the shape a generator writes.\n\n## Today\n\nEverything that needs you.\n\n'
    +'```booklet query\nfrom: pulse\nas: tiles\n```\n\n### Waiting on you\n\n```booklet query\nfrom: decide\nas: list\ngroup: group\nempty: Nothing is waiting on you.\n```\n\n***\n\n## Hubs\n\nEach hub has a page.\n\n';
  const inbox='> [!activity|inbox repeat] Inbox\n\n## Inbox\n\nOpen a brief, give your call and notes, and press Finalize.\n\n***\n\n## A brief\n\nAn invented brief, asking for a call.\n\n'
    +'### Your answer\n\n> [!choice|b-1-call] Your call\n\n- [ ] Go\n- [ ] Hold\n\n> [!text|b-1-notes long] Notes for the agent\n> What to change, what to watch.\n\n';
  const rows=[];for(let r=0;r<400;r++) rows.push({group:'Group '+(r%5),badge:'hub-'+(r%30),label:'Invented item '+r,value:'waiting '+r+' days',note:PROSE(r)});
  const tail='> [!module|po-dashboard end]\n\n> [!data] Data\n\n'
    +'```booklet data\n'+JSON.stringify({fields:{label:'',value:''},rows:[{label:'decisions waiting on you',value:3,tone:'bad'},{label:'overdue',value:5,tone:'bad'}]},null,1)+'\n```\n^pulse\n\n'
    +'```booklet data\n'+JSON.stringify({fields:{group:'Kind',badge:'Where it lives',label:'What',value:'How long',note:'Why'},rows},null,1)+'\n```\n^decide\n';
  for(let i=0;s.length+inbox.length+tail.length<chars;i++){
    s+=`> [!activity|hub-${i} parent:dashboard] Hub ${i}\n\n| | |\n| --- | --- |\n| **Programme** | an invented programme ${i} |\n| **GitHub** | up to date |\n\n`;
    for(let pg=0;pg<12;pg++) s+=(pg?'***\n\n':'')+`## Hub ${i}, page ${pg}\n\n`+PROSE(i*100+pg).repeat(25)+'\n\n> [!note] A note\n> '+PROSE(pg)+'\n\n';}
  return s+inbox+tail;}
const TEN=big(10*1024*1024),DASH=dashboard(3.6*1024*1024);
const OLD=zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'seeds','booklet-0.13.0.html.gz'))).toString('utf8');
const SEED=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'seeds','ls-'+n+'.json'),'utf8'));
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const reqs=[],csp=[],errs=[],viol=[];
  const context=async(init)=>{const ctx=await b.newContext({viewport:{width:1280,height:900}});
    await ctx.route(PAGE+'/**',r=>{const u=new URL(r.request().url()).pathname;
      if(u.startsWith('/old/')) return r.fulfill({status:200,body:OLD,headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
      if(u==='/pub/dash.booklet.md') return r.fulfill({status:200,body:DASH,headers:{'content-type':'text/markdown; charset=utf-8'}});
      if(u.startsWith('/app/')||u==='/') return r.fulfill({status:200,body:u.startsWith('/app/store/')?withStore:SRC,headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
      r.fulfill({status:404,body:'nf'});});
    if(init) await ctx.addInitScript(init);
    await ctx.addInitScript(()=>{document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});});
    return ctx;};
  const page=async(ctx,url)=>{const p=await ctx.newPage();
    p.on('request',r=>reqs.push({url:r.url(),method:r.method(),body:r.postData()||''}));
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    if(url){await p.goto(url);await p.waitForTimeout(600);}
    return p;};
  const done=async p=>{viol.push(...await p.evaluate(()=>window.__viol||[]).catch(()=>[]));};
  const main=p=>p.locator('#main').innerText();
  /* back to "Your booklets", in any language; and open a booklet there by its name */
  const list=async p=>{for(let i=0;i<3&&(await p.evaluate(()=>document.body.dataset.view))!=='@booklets';i++){await p.locator('#btnHome').click();await p.waitForTimeout(300);}};
  const openCard=async(p,t,ms)=>{await p.locator('#main .mode').filter({hasText:t}).locator('.bkacts button').first().click();await p.waitForTimeout(ms||600);};
  const loadFile=async(p,text,name)=>{await p.getByRole('button',{name:'Add a booklet from a file'}).click();
    await p.locator('#fileIn').setInputFiles({name:name||'b.booklet.md',mimeType:'text/markdown',buffer:Buffer.from(text)});
    await p.waitForFunction(n=>document.getElementById('pasteIn').value.length>=n,text.length-10,{timeout:20000});
    await p.locator('#loadGo').click();await p.waitForTimeout(1500);};
  const copies=K=>Object.keys(K).filter(k=>/^booklet\.b\./.test(k));
  /* the renderer's keys in local storage, but its list count (booklet.tick, a number: section 12) */
  const lsKeys=p=>p.evaluate(()=>Object.keys(localStorage).filter(k=>/^booklet\./.test(k)&&k!=='booklet.tick').sort());

  // 1 a 10 MB booklet with an answer, kept and found whole after a reload
  {const ctx=await context(),p=await page(ctx,PAGE+'/app/');
   await loadFile(p,TEN,'ten.booklet.md');
   await p.locator('#main textarea').first().fill('QZX ten megabytes answer');await p.waitForTimeout(2500);
   const K=await kept(p),c=copies(K);
   ok(c.length===1&&K[c[0]].length>10*1024*1024&&K[c[0]].includes('QZX ten megabytes answer'),'a 10 MB booklet\'s kept copy, answer and all, is in the store ('+(c.length?K[c[0]].length:0)+' characters)');
   ok(!/(private mode|run out of room)/.test(await main(p)),'and nothing says storage is off or full');
   await p.reload();await p.waitForTimeout(1500);
   await openCard(p,'Ten megabytes',2500);
   ok(await p.locator('#main textarea').first().inputValue()==='QZX ten megabytes answer','after a reload it opens with the answer');
   ok(/Section 0/.test(await main(p)),'and its pages are there');
   const K2=await kept(p),c2=copies(K2);
   ok(c2.length===1&&K2[c2[0]].includes('Section '+(TEN.match(/## Section (\d+)/g).length-1)),'the kept copy is whole: its last section is in it');
   await done(p);await ctx.close();}

  // 2 the dashboard's shape: opened by link, one keystroke, a reload
  {ok(DASH.length>=3.4*1024*1024&&DASH.length<5*1024*1024,'the dashboard-shaped booklet is '+(DASH.length/1048576).toFixed(2)+' MB (at least 3.4, under the 5 MB link cap)');
   const ctx=await context(),p=await page(ctx,PAGE+'/app/store/#/open/dash.booklet.md');await p.waitForTimeout(2500);
   ok(/Dashboard/.test(await main(p)),'it opens by link from the store');
   await p.evaluate(()=>{location.hash='#/open/dash.booklet.md/inbox';});await p.waitForTimeout(2000);
   /* the inbox's second page, the brief, from its page menu */
   const brief=async()=>{await p.locator('#main button',{hasText:'A brief'}).first().click();await p.waitForTimeout(600);};
   await brief();
   const notes=p.locator('#main textarea').first();
   ok(await notes.count()===1,'the inbox\'s notes field is on screen');
   await notes.click();await p.keyboard.type('Q');await p.waitForTimeout(2500);
   const K=await kept(p),c=copies(K);
   ok(c.length===1&&K[c[0]].length>DASH.length&&/"b-1-notes":"Q"/.test(K[c[0]]),'one keystroke makes a kept copy of '+(c.length?(K[c[0]].length/1e6).toFixed(1):0)+' million characters, and it is in the store with the keystroke');
   ok(!/(private mode|not keeping|run out of room)/.test(await main(p)),'and nothing says storage is off or full');
   await p.reload();await p.waitForTimeout(3000);
   await p.evaluate(()=>{location.hash='#/open/dash.booklet.md/inbox';});await p.waitForTimeout(2000);
   await brief();
   ok(await p.locator('#main textarea').first().inputValue()==='Q','after a reload the keystroke is there: '+JSON.stringify(await p.locator('#main textarea').first().inputValue().catch(()=>'?')));
   await p.screenshot({path:path.join(OUT,'keep-dashboard.png')});
   await done(p);await ctx.close();}

  // 3 the move from local storage, from three releases
  for(const name of ['0.12.0','0.13.0','0.13.1-pre']){
    const seed=SEED(name);delete seed._about;
    const ctx=await context(),seeder=await ctx.newPage();
    await seeder.goto(PAGE+'/nothing/').catch(()=>{});
    await seeder.evaluate(s=>{for(const k in s) localStorage.setItem(k,s[k]);},seed);await seeder.close();
    const p=await page(ctx,PAGE+'/app/');await p.waitForTimeout(800);
    const w=await main(p);
    ok(/Carnet de projet|Studio project board/.test(w)&&/garden|jardin/i.test(w),name+': "Your booklets" lists what that release kept');
    ok(await p.evaluate(()=>document.documentElement.lang)==='fr'&&await p.evaluate(()=>document.documentElement.getAttribute('data-theme'))==='night','the reader\'s language (fr) and theme (night) hold');
    ok((await lsKeys(p)).join()==='booklet.ui.theme','local storage then keeps only the theme\'s mirror: '+(await lsKeys(p)).join());
    const K=await kept(p);
    ok(Object.keys(seed).filter(k=>/^booklet\.b\./.test(k)).every(k=>K[k]===seed[k]),'the store holds every kept copy exactly as that release left it');
    await openCard(p,'A garden week',800);
    ok(await p.locator('#main textarea').first().inputValue()==='Seed '+name+': the garden note','the garden week opens with its answer');
    await list(p);await openCard(p,'Studio project board',800);
    await p.locator('#main').getByText('Studio log',{exact:false}).first().click();await p.waitForTimeout(600);
    ok(await p.locator('#main textarea').first().inputValue()==='Seed '+name+': a draft not yet kept','the board\'s log opens with its draft');
    {const snap=Object.keys(seed).filter(k=>/^booklet\.b\./.test(k)).map(k=>JSON.parse(seed[k])).find(o=>o.S&&o.S.entries&&o.S.entries['board/log']);
     const want=snap.S.entries['board/log'].length,have=await p.locator('#main .chips .chip').count();
     ok(want>0&&have===want&&/1 entrée pas encore téléchargée/.test(await main(p)),'and its kept entries, the one kept here still marked not yet downloaded: '+have+' of '+want);}
    await done(p);await ctx.close();}

  // 4 IndexedDB refused (open throws, or fails), or missing
  const REFUSE={
    throws:()=>{IDBFactory.prototype.open=function(){throw new DOMException('The user denied permission to access the database.','SecurityError');};},
    fails:()=>{IDBFactory.prototype.open=function(){const r={};setTimeout(()=>{Object.defineProperty(r,'error',{value:new DOMException('A mutation operation was attempted on a database that did not allow mutations.','InvalidStateError')});if(r.onerror) r.onerror({preventDefault(){}});},0);return r;};},
    missing:()=>{Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});}};
  for(const [how,fn] of Object.entries(REFUSE)){
    const ctx=await context(fn),p=await page(ctx,PAGE+'/app/');
    await p.getByRole('button',{name:'Start a new booklet'}).click();await p.waitForTimeout(500);await list(p);
    const w=await main(p);
    if(how==='missing') ok(!/would not open its larger store/.test(w),'no IndexedDB at all: local storage, and nothing said about it');
    else ok(/would not open its larger store for this page/.test(w)&&!/private mode/.test(w),how+': "Your booklets" says the browser would not open its larger store, not private mode');
    ok((await lsKeys(p)).some(k=>/^booklet\.b\./.test(k))&&(await lsKeys(p)).includes('booklet.library.v1'),how+': the booklet is kept in local storage, as before');
    await loadFile(p,FM('test/small','Small one')+'> [!activity|a] A\n\n> [!text|q] A question\n');
    await p.locator('#main textarea').first().fill('QZX in local storage');await p.waitForTimeout(800);
    await p.reload();await p.waitForTimeout(800);
    await openCard(p,'Small one');
    ok(await p.locator('#main textarea').first().inputValue()==='QZX in local storage',how+': an answer survives a reload');
    await done(p);await ctx.close();}

  // 5 IndexedDB's own limit
  {const ctx=await context(),p=await page(ctx,PAGE+'/app/');
   const cdp=await ctx.newCDPSession(p);await cdp.send('Storage.overrideQuotaForOrigin',{origin:PAGE,quotaSize:1500000});
   await loadFile(p,big(3*1024*1024),'three.booklet.md');
   await p.locator('#main textarea').first().fill('QZX over the quota');await p.waitForTimeout(1500);
   const t=await p.locator('#toast').innerText();
   ok(/run out of room/.test(t)&&!/private mode/.test(t),'over the quota the toast says the browser ran out of room, not private mode: '+t.slice(0,90));
   await list(p);const w=await main(p);
   ok(/run out of room/.test(w)&&!/private mode/.test(w),'"Your booklets" says so too');
   await openCard(p,'Ten megabytes',1500);
   ok(await p.locator('#main textarea').first().inputValue()==='QZX over the quota','for the visit, the booklet still opens with its answer');
   await done(p);await ctx.close();}

  // 6 the theme, painted from its mirror before the store is read
  {const ctx=await context(()=>{document.addEventListener('DOMContentLoaded',()=>{window.__dcl=document.documentElement.getAttribute('data-theme');});}),p=await page(ctx,PAGE+'/app/');
   await p.locator('#themeSel').selectOption('night');await p.waitForTimeout(500);
   const K=await kept(p);
   ok(K['booklet.ui.theme']==='night'&&(await p.evaluate(()=>localStorage.getItem('booklet.ui.theme')))==='night','the theme is in the store and in its mirror');
   await p.reload();await p.waitForTimeout(600);
   ok(await p.evaluate(()=>window.__dcl)==='night','on a reload it is painted before the page has read its store (no flash)');
   await done(p);await ctx.close();}

  // 7 two tabs
  {const ctx=await context(),a=await page(ctx,PAGE+'/app/'),bb=await page(ctx,PAGE+'/app/');
   await loadFile(a,FM('test/ta','From tab A')+'> [!activity|a] A\n\n> [!text|q] Q\n');await list(a);
   await bb.evaluate(()=>window.dispatchEvent(new Event('focus')));await bb.waitForTimeout(500);
   ok(/From tab A/.test(await main(bb)),'a tab coming back into focus lists the booklet another tab added');
   await loadFile(bb,FM('test/tb','From tab B')+'> [!activity|a] A\n\n> [!text|q] Q\n');await list(bb);await bb.waitForTimeout(500);
   const c=await page(ctx,PAGE+'/app/');const w=await main(c);
   ok(/From tab A/.test(w)&&/From tab B/.test(w),'two tabs each adding a booklet: both are kept');
   for(const x of [a,bb,c]) await done(x);await ctx.close();}

  // 8 a change typed and the page left at once
  {const ctx=await context(),p=await page(ctx,PAGE+'/app/');
   await loadFile(p,FM('test/leave','Left at once')+'> [!activity|a] A\n\n> [!text|q] Q\n');
   await p.locator('#main textarea').first().fill('QZX typed then navigated');await p.goto(PAGE+'/nothing/').catch(()=>{});await p.waitForTimeout(300);
   await p.goto(PAGE+'/app/');await p.waitForTimeout(800);
   await openCard(p,'Left at once',500);
   ok(await p.locator('#main textarea').first().inputValue()==='QZX typed then navigated','a change typed and the page left at once (within the 400 ms save wait) is kept');
   await p.locator('#main textarea').first().fill('QZX typed then the tab closed');await p.close();
   const q=await page(ctx,PAGE+'/app/');
   await openCard(q,'Left at once',500);
   ok(await q.locator('#main textarea').first().inputValue()==='QZX typed then the tab closed','a change typed and the tab closed at once is kept');
   await done(q);await ctx.close();}

  // 9 from disk
  {const ctx=await b.newContext(),p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
   await p.goto('file://'+HTML);await p.waitForTimeout(800);
   await p.getByRole('button',{name:'Start a new booklet'}).click();await p.waitForTimeout(500);
   const dbs=await p.evaluate(async()=>(await indexedDB.databases()).map(d=>d.name));
   ok(dbs.includes('booklet')&&(await lsKeys(p)).length===0,'a page opened from disk keeps its booklet in IndexedDB, and nothing in local storage');
   await p.reload();await p.waitForTimeout(800);
   ok(JSON.parse((await kept(p))['booklet.library.v1']||'{"entries":[]}').entries.length===1,'and finds it again after a reload');
   await ctx.close();}

  // 10 newer wins after the move
  const REFUSE_IDB=()=>{IDBFactory.prototype.open=function(){throw new DOMException('The user denied permission to access the database.','SecurityError');};};
  for(const [who,storeLater] of [['the 0.13.0 tab',true],['the 0.13.0 tab',false],['the fallback visit',true],['the fallback visit',false]]){
    const ctx=await context(),other=await ctx.newPage();other.on('pageerror',e=>errs.push(e.message));
    if(who==='the fallback visit') await other.addInitScript(REFUSE_IDB);
    await other.goto(PAGE+(who==='the 0.13.0 tab'?'/old/':'/app/'));await other.waitForTimeout(600);
    await loadFile(other,FM('test/shared','Shared booklet')+'> [!activity|a] A\n\n> [!text|q] Q\n');
    await other.locator('#main textarea').first().fill('typed there first');await other.waitForTimeout(800);
    const n=await page(ctx,PAGE+'/app/');await n.waitForTimeout(600);
    const moved=(await lsKeys(n)).filter(k=>/^booklet\.(b|library)/.test(k)).length===0;
    const there=async w=>{await other.locator('#main textarea').first().fill(w);await other.waitForTimeout(800);};
    const here=async w=>{await openCard(n,'Shared booklet',600);await n.locator('#main textarea').first().fill(w);await n.waitForTimeout(800);await list(n);};
    if(storeLater){await there(who+', earlier');await n.waitForTimeout(1100);await here('this tab, later');}
    else{await here('this tab, earlier');await n.waitForTimeout(1100);await there(who+', later');}
    await n.reload();await n.waitForTimeout(1000);
    const cards=await n.locator('#main .mode').filter({hasText:'Shared booklet'}).count();
    await openCard(n,'Shared booklet',600);
    const got=await n.locator('#main textarea').first().inputValue();
    ok(moved&&cards===1&&got===(storeLater?'this tab, later':who+', later'),who+(storeLater?', this tab typing later':', typing later itself')+': the move emptied local storage, the later answer wins, one entry: '+JSON.stringify({moved,cards,got}));
    await done(n);await ctx.close();}

  // 11 after the move, IndexedDB refused or not answering: the reason, on an empty list
  for(const [how,fn,wait] of [['refused',REFUSE_IDB,800],['not answering',()=>{IDBFactory.prototype.open=function(){return {};};},6000]]){
    const ctx=await context(),a=await page(ctx,PAGE+'/app/');
    await loadFile(a,FM('test/kept','Kept before')+'> [!activity|a] A\n\n> [!text|q] Q\n');await a.close();
    const b=await ctx.newPage();b.on('pageerror',e=>errs.push(e.message));await b.addInitScript(fn);
    await b.goto(PAGE+'/app/');await b.waitForTimeout(wait);
    const w=await main(b);
    ok(!/Kept before/.test(w)&&(how==='refused'?/would not open its larger store/.test(w)&&/not shown/.test(w):/could not be read this time/.test(w)&&/Reload the page/.test(w)),
      'after the move, IndexedDB '+how+': the empty list says why'+(how==='refused'?'':', and that a reload brings them back'));
    await ctx.close();}

  // 12 two windows: the other's list shows a new booklet at once
  {const ctx=await context(),a=await page(ctx,PAGE+'/app/'),bb=await page(ctx,PAGE+'/app/');
   await bb.evaluate(()=>{window.__focus=0;window.addEventListener('focus',()=>{window.__focus++;});});
   await loadFile(a,FM('test/seen','Seen at once')+'> [!activity|a] A\n\n> [!text|q] Q\n');await bb.waitForTimeout(800);
   const st=await bb.evaluate(()=>({vis:document.visibilityState,focus:window.__focus}));
   ok(/Seen at once/.test(await main(bb))&&st.focus===0,'two windows: a booklet added in one shows in the other\'s visible list at once, with no focus change: '+JSON.stringify(st));
   for(const x of [a,bb]) await done(x);await ctx.close();}

  const net=reqs.filter(r=>/^https?:/i.test(r.url));
  ok(net.length>0&&net.every(r=>r.method==='GET'&&!r.body&&new URL(r.url).origin===PAGE),'every request is a GET for the page itself or its store: '+[...new Set(net.map(r=>r.method+' '+new URL(r.url).pathname))].join(', '));
  ok(viol.length===0&&csp.length===0,'zero CSP violations: '+viol.concat(csp).join('|'));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
