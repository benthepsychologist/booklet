// Browser check of the reading helpers on tabs inside tabs (compile/script/reading-tabs.js and reading-folds.js, compile 0.2.0).
// Since 0.2.0 the compiler writes each activity of a booklet as a page of its own, so it no longer produces a tab bar inside a
// tab. The helpers still reveal a tab from the outside in, so this keeps that covered with a page written by hand to the
// compiler's markup contract (test/compile-assets/nested-tabs.html, made-up words, noted at its top as hand-built). The page is
// copied beside a compiled stylesheet and the compiler's real assembled script (compile/script.js: the quiz part and the
// reading parts). It asserts:
//   - an outer bar over two tabs and, inside the first, an inner bar over three; another inner bar inside the second; each opens
//     on its first tab, with its roles, names and one tab in the Tab order;
//   - Left/Right/Home/End on each bar moves only that bar, and the focus follows;
//   - an address with a #fragment, a link in the text, and a hashchange that point into a tab inside a hidden tab show the outer
//     tab and then the inner one, in either direction;
//   - the page prints with all seven tabs and no bar;
//   - two Open all switches, one for each activity that has folds (none for the one that has none), each reaching the folds in
//     tabs that are not showing, never a hint or a solution, each following folds opened by hand;
//   - scripting off, and the same page with no script tag: no bar, no role, nothing hidden, every tab under its name;
//   - nothing stored, no request but the page's own files, no error.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/compile-nested-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','booklet.html'));
const OUT=path.resolve(process.argv[3]||'.','compile-nested-pages');
const C=require('../compile/compile.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};

fs.rmSync(OUT,{recursive:true,force:true});
/* a compiled stylesheet to sit beside the hand-built page, and the compiler's own assembled script */
const run=C.compile([{file:path.join(__dirname,'fixtures','compile-reading-one.booklet.md')}],{form:'standalone',renderer:HTML});
C.write(run,OUT,{force:true});
fs.writeFileSync(path.join(OUT,'booklet','booklet.js'),require('../compile/script.js').assemble().text);
const src=fs.readFileSync(path.join(__dirname,'compile-assets','nested-tabs.html'),'utf8');
ok(/<script src="booklet\/booklet\.js" defer><\/script>/.test(src),'(set up) the hand-built page links the script as a compiled page does');
fs.writeFileSync(path.join(OUT,'nested.html'),src);
fs.writeFileSync(path.join(OUT,'nested-plain.html'),src.replace(/<script src="booklet\/booklet\.js" defer><\/script>\n?/,''));

const BASE='http://localhost/';
function serve(ctx,watch){
  return ctx.route(BASE+'**',route=>{const u=decodeURIComponent(new URL(route.request().url()).pathname.replace(/^\//,''));
    const f=path.join(OUT,u);if(watch) watch.push(route.request().url());
    if(!f.startsWith(OUT)||!fs.existsSync(f)||!fs.statSync(f).isFile()) return route.fulfill({status:404,body:'not here'});
    const type=f.endsWith('.css')?'text/css':f.endsWith('.js')?'text/javascript':f.endsWith('.woff2')?'font/woff2':'text/html';
    return route.fulfill({status:200,contentType:type,body:fs.readFileSync(f)});});}
const storage=p=>p.evaluate(async()=>{let dbs=[];try{dbs=indexedDB.databases?await indexedDB.databases():[];}catch(e){}
  return {local:localStorage.length,session:sessionStorage.length,cookie:document.cookie,idb:dbs.length};});

/* the three bars, by the heading they are named for, each as 'name:selected|name:selected' */
const bars=p=>p.evaluate(()=>{const o={};document.querySelectorAll('[role=tablist]').forEach(b=>{o[b.getAttribute('aria-label')]=[...b.children].map(t=>t.textContent+':'+t.getAttribute('aria-selected')).join('|');});return o;});
const seen=(p,id)=>p.evaluate(i=>{const r=document.getElementById(i).getBoundingClientRect();return r.height>0&&getComputedStyle(document.getElementById(i)).visibility!=='hidden';},id);
const OUTER='Plan:true|During:false',OUTER2='Plan:false|During:true';
const INNER='Short loop:true|Long loop:false|Hilly loop:false',WEATHER='Dry path:true|Wet path:false';

(async()=>{
  const b=await chromium.launch();
  {
    const ctx=await b.newContext({viewport:{width:1000,height:900},javaScriptEnabled:true});
    const reqs=[],errs=[];await serve(ctx);
    const p=await ctx.newPage();p.on('request',r=>reqs.push(r.url()));p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error') errs.push(m.text());});
    await p.goto(BASE+'nested.html');await p.evaluate(()=>document.fonts.ready);

    /* ---- the bars ---- */
    let s=await bars(p);
    ok(JSON.stringify(Object.keys(s))==='["A walk in the park","Choose a route","On the path"]','three bars: one over the page\'s two tabs, one inside the first tab, one inside the second, each named for the heading above it ('+Object.keys(s)+')');
    ok(s['A walk in the park']===OUTER&&s['Choose a route']===INNER&&s['On the path']===WEATHER,'each bar opens on its first tab ('+JSON.stringify(s)+')');
    const shape=await p.evaluate(()=>[...document.querySelectorAll('[role=tablist]')].map(b=>[...b.children].every(t=>t.tagName==='BUTTON'&&t.getAttribute('role')==='tab'&&document.getElementById(t.getAttribute('aria-controls')).getAttribute('role')==='tabpanel'&&document.getElementById(t.getAttribute('aria-controls')).getAttribute('aria-labelledby')===t.id)
      &&[...b.children].filter(t=>t.tabIndex===0).length===1&&b.nextElementSibling&&b.nextElementSibling.classList.contains('bk-tab')));
    ok(shape.length===3&&shape.every(Boolean),'every tab is a button with role tab controlling a tabpanel it labels, one in the Tab order, the bar sitting just above its tabs ('+shape+')');
    ok(await p.evaluate(()=>{const inner=document.querySelector('[aria-label="Choose a route"]');const outerPanel=document.getElementById('plan').closest('section.bk-tab');return outerPanel.contains(inner)&&!outerPanel.hidden&&document.getElementById('short-loop').getBoundingClientRect().height>0&&document.getElementById('wet').closest('section.bk-tab').hidden&&document.getElementById('during').closest('section.bk-tab').hidden;}),
      'the inner bar sits inside the outer tab on show, and a tab inside the other outer tab is out of sight');

    /* ---- keys: each bar moves on its own ---- */
    const at=label=>p.evaluate(l=>{const b=document.querySelector('[role=tablist][aria-label="'+l+'"]');return [...b.children].findIndex(t=>t.getAttribute('aria-selected')==='true')+'/'+[...b.children].findIndex(t=>t===document.activeElement);},label);
    await p.locator('[role=tablist][aria-label="Choose a route"] [role=tab]').first().focus();
    await p.keyboard.press('ArrowRight');
    ok((await at('Choose a route'))==='1/1'&&(await bars(p))['A walk in the park']===OUTER,'ArrowRight on the inner bar moves the inner bar only, and the focus follows');
    await p.keyboard.press('End');ok((await at('Choose a route'))==='2/2','End on the inner bar goes to its last tab');
    await p.keyboard.press('ArrowRight');ok((await at('Choose a route'))==='0/0','…ArrowRight on the last wraps to the first');
    await p.keyboard.press('ArrowLeft');ok((await at('Choose a route'))==='2/2','…ArrowLeft on the first wraps to the last');
    await p.keyboard.press('Home');ok((await at('Choose a route'))==='0/0','…Home goes to the first');
    await p.locator('[role=tablist][aria-label="A walk in the park"] [role=tab]').first().focus();
    await p.keyboard.press('ArrowRight');
    s=await bars(p);
    ok((await at('A walk in the park'))==='1/1'&&s['A walk in the park']===OUTER2&&s['Choose a route']===INNER,'ArrowRight on the outer bar shows the second outer tab and leaves the inner bar as it was');
    ok(await p.evaluate(()=>document.getElementById('plan').closest('section.bk-tab').hidden&&!document.getElementById('during').closest('section.bk-tab').hidden&&document.getElementById('dry').getBoundingClientRect().height>0),'…the first outer tab and everything in it is out of sight, the second and its inner first tab on show');
    await p.locator('[role=tablist][aria-label="On the path"] [role=tab]').first().focus();
    await p.keyboard.press('ArrowRight');
    ok((await at('On the path'))==='1/1'&&(await bars(p))['On the path']==='Dry path:false|Wet path:true'&&(await bars(p))['A walk in the park']===OUTER2,'ArrowRight on the second inner bar moves that bar only');

    /* ---- a link into a tab inside a hidden tab: the outer, then the inner ---- */
    await p.goto(BASE+'nested.html');
    await p.locator('a.bk-link[href="#wet"]').click();
    s=await bars(p);
    ok(s['A walk in the park']===OUTER2&&s['On the path']==='Dry path:false|Wet path:true'&&await seen(p,'wet'),'a link in the first outer tab to a heading in a hidden inner tab of the hidden outer tab shows both, outer and inner ('+JSON.stringify(s)+')');
    await p.locator('#during ~ p a.bk-link[href="#hilly-loop"]').click();
    s=await bars(p);
    ok(s['A walk in the park']===OUTER&&s['Choose a route']==='Short loop:false|Long loop:false|Hilly loop:true'&&await seen(p,'hilly-loop'),'a link back from the second outer tab to the third inner tab of the first shows both ('+JSON.stringify(s)+')');
    await p.goto(BASE+'nested.html#wet');
    s=await bars(p);
    ok(s['A walk in the park']===OUTER2&&s['On the path']==='Dry path:false|Wet path:true'&&await seen(p,'wet'),'opening the page at #wet (a heading in a hidden inner tab of a hidden outer tab) opens on both');
    await p.goto(BASE+'nested.html#hilly-loop');
    s=await bars(p);
    ok(s['A walk in the park']===OUTER&&s['Choose a route']==='Short loop:false|Long loop:false|Hilly loop:true'&&await seen(p,'hilly-loop'),'opening the page at #hilly-loop (the inner tab of the first outer tab) opens on it');
    await p.goto(BASE+'nested.html');
    await p.evaluate(()=>{location.hash='#wet';});await p.waitForTimeout(100);
    s=await bars(p);
    ok(s['A walk in the park']===OUTER2&&s['On the path']==='Dry path:false|Wet path:true'&&await seen(p,'wet'),'changing the address to #wet while the page is open shows both tabs (hashchange)');
    /* a link to the heading the address already names: no hashchange, only the click */
    await p.goto(BASE+'nested.html#wet');
    await p.locator('[role=tablist][aria-label="A walk in the park"] [role=tab]').first().click();
    ok(await p.evaluate(()=>location.hash==='#wet')&&(await bars(p))['A walk in the park']===OUTER,'(set up) the reader went back to the first outer tab while the address still names #wet');
    await p.locator('a.bk-link[href="#wet"]').click();
    ok((await bars(p))['A walk in the park']===OUTER2&&await seen(p,'wet'),'a link to the heading the address already names shows the tabs again (only the click, no hashchange)');
    ok(JSON.stringify(await storage(p))==='{"local":0,"session":0,"cookie":"","idb":0}','nothing is stored');
    await p.goto(BASE+'nested.html');
    s=await bars(p);ok(s['A walk in the park']===OUTER&&s['Choose a route']===INNER&&s['On the path']===WEATHER,'a reload starts on the first tab of every bar again');

    /* ---- print ---- */
    await p.emulateMedia({media:'print'});
    const pr=await p.evaluate(()=>({tabs:[...document.querySelectorAll('section.bk-tab')].map(x=>x.getBoundingClientRect().height>0&&getComputedStyle(x).display!=='none'),bars:[...document.querySelectorAll('.bk-tabbar')].map(x=>getComputedStyle(x).display),sw:[...document.querySelectorAll('.bk-foldsw')].map(x=>getComputedStyle(x).display)}));
    ok(pr.tabs.length===7&&pr.tabs.every(Boolean)&&pr.bars.length===3&&pr.bars.every(x=>x==='none')&&pr.sw.every(x=>x==='none'),'print: all seven tabs (two outer, five inner) are shown, and the bars and switches are left off ('+JSON.stringify(pr)+')');
    await p.emulateMedia({media:'screen'});

    /* ---- two Open all switches ---- */
    await p.goto(BASE+'nested.html');
    const sw=await p.evaluate(()=>[...document.querySelectorAll('.bk-foldsw')].map(x=>({where:x.parentElement.querySelector(':scope > h3').textContent.replace(/#/,'').trim(),role:x.getAttribute('role'),on:x.getAttribute('aria-checked'),text:x.textContent,prev:x.previousElementSibling&&x.previousElementSibling.tagName})));
    ok(sw.length===2&&sw.map(x=>x.where).join('|')==='Choose a route|What to bring','one Open all for each activity that has folds the author made, none for the activity that has none ('+JSON.stringify(sw.map(x=>x.where))+')');
    ok(sw.every(x=>x.role==='switch'&&x.on==='false'&&x.text==='Open all'&&x.prev==='H3'),'each is a switch, off, named "Open all", under its activity\'s heading');
    const folds=()=>p.evaluate(()=>{const k=n=>[...document.getElementById(n).closest('section.bk-activity').querySelectorAll('details')].map(d=>(/bk-hint|bk-solution/.test(d.className)?'q':'a')+(d.open?'1':'0')).join(' ');
      return {route:k('choose-a-route'),bring:k('what-to-bring'),on:[...document.querySelectorAll('.bk-foldsw')].map(x=>x.getAttribute('aria-checked')).join()};});
    let f=await folds();ok(f.route==='a0 a0'&&f.bring==='a0 a0 q0 q0','folds start closed as written ('+JSON.stringify(f)+')');
    await p.locator('.bk-foldsw').nth(1).click();f=await folds();
    ok(f.bring==='a1 a1 q0 q0'&&f.route==='a0 a0'&&f.on==='false,true','the second switch opens its activity\'s folds only: not its hint or solution, not the other activity\'s ('+JSON.stringify(f)+')');
    await p.locator('.bk-foldsw').nth(1).click();f=await folds();ok(f.bring==='a0 a0 q0 q0'&&f.on==='false,false','pressed again it folds them');
    await p.locator('.bk-foldsw').first().click();f=await folds();
    ok(f.route==='a1 a1'&&f.bring==='a0 a0 q0 q0','the first switch reaches the folds in the tabs that are not showing ('+JSON.stringify(f)+')');
    await p.evaluate(()=>{document.getElementById('what-to-bring').closest('section.bk-activity').querySelectorAll('details:not(.bk-hint):not(.bk-solution)').forEach(d=>{d.open=true;});});await p.waitForTimeout(50);
    ok((await folds()).on==='true,true','folds opened by hand turn the second switch on');
    await p.evaluate(()=>{document.querySelector('#what-to-bring').closest('section.bk-activity').querySelector('details.bk-k-tip').open=false;});await p.waitForTimeout(50);
    ok((await folds()).on==='true,false','…and closing one turns it off');
    await p.goto(BASE+'nested.html');
    const bp=await p.evaluate(()=>{const all=[...document.querySelectorAll('.booklet details')];all[1].open=true;const was=all.map(d=>d.open);window.dispatchEvent(new Event('beforeprint'));const during=all.map(d=>d.open);window.dispatchEvent(new Event('afterprint'));return {n:all.length,was,during,after:all.map(d=>d.open)};});
    ok(bp.n===6&&bp.during.every(Boolean)&&JSON.stringify(bp.after)===JSON.stringify(bp.was),'before printing every fold is open (six, hint and solution too) and after printing each is as it was');

    ok(!errs.length&&reqs.every(u=>u.startsWith(BASE)||u.startsWith('data:'))&&reqs.every(u=>u.startsWith('data:')||/\.html$|\.css$|\.woff2$|\.js$/.test(new URL(u).pathname)),'only the page\'s own files are asked for, and no error is logged'+(errs.length?' ('+errs[0]+')':''));
    await ctx.close();
  }

  /* ================= scripting off, and the page with no script tag ================= */
  {
    const off=await b.newContext({viewport:{width:1000,height:900},javaScriptEnabled:false});await serve(off);
    const p=await off.newPage();
    for(const file of ['nested.html','nested-plain.html']){
      await p.goto(BASE+file);
      const d=await p.evaluate(()=>({added:document.querySelectorAll('[role=tab],[role=tablist],[role=tabpanel],[role=switch],.bk-tabbar,.bk-foldsw,.bk-tabbtn').length,hidden:document.querySelectorAll('.booklet [hidden]').length,
        shown:[...document.querySelectorAll('section.bk-tab')].map(x=>x.getBoundingClientRect().height>0),heads:[...document.querySelectorAll('section.bk-tab > h2, section.bk-tab > h4')].map(h=>h.textContent.replace(/#/,'').trim()),
        folds:[...document.querySelectorAll('details')].map(x=>x.open)}));
      ok(d.added===0&&d.hidden===0,file+', scripting off: nothing is added and nothing is hidden');
      ok(d.shown.length===7&&d.shown.every(Boolean),file+': all seven tabs are shown ('+d.shown.length+')');
      ok(d.heads.join('|')==='Plan|Short loop|Long loop|Hilly loop|During|Dry path|Wet path'&&d.folds.every(x=>!x),file+': each under its own name, every fold closed as written ('+d.heads.join(', ')+')');}
    await off.close();
  }
  await b.close();
  console.log(fails.length?fails.length+' FAILED':'compile nested tabs: all checks passed');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
