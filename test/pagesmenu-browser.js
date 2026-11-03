// Browser check of the pages menu (renderer 0.18.1; booklet.html, pageMenu) in a real Chromium, on a made-up booklet of 157 pages in three
// levels (test/pmenu-fixture.js). The recording DOM of test/pagesmenu.test.js has no layout, no focus and no scroll. Each fails without the
// line named:
//  1. wide (1280x800): the menu is a column left of the page, sticky under the bar, scrolling inside itself (the window does not move with
//     it); the page on show stays in view inside the column after Next 30 times and after pressing a deep entry; an entry goes to its page;
//  2. phone (390x844): a "Pages" button (aria-expanded, aria-controls, 44px) opens a drawer with a scrim and a Close; focus goes in, Tab and
//     Shift+Tab stay in, Escape, Close and the scrim close it and give the focus back to the button; choosing a page shuts it and turns the
//     page; widening the window past the breakpoint shuts it; entries, Close and the branch toggles are 44px high; reduced motion has no slide;
//  3. no screen scrolls sideways, at 1280, at 390 and at 390 with the text at 200%, the drawer open or not;
//  4. contrast in the renderer's own light (paper) and dark (night): text 4.5:1, the page-on-show bar and the control edges 3:1;
//  5. the accessibility tree: names and roles (printed);
//  6. the time to turn to a page with the 157-page menu, against the same move without a menu (origin/main's renderer, when git has it);
//  7. nothing is refused by the policy and no script error is raised.
// Invented content. Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/pagesmenu-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),cp=require('child_process');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fx=require('./pmenu-fixture.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const TREE=fx.tree();
/* the page's own clock: a press, to the second animation frame after it */
const press=(p,sel)=>p.evaluate(s=>new Promise(res=>{const t0=performance.now();document.querySelector(s).click();const t1=performance.now();
  requestAnimationFrame(()=>requestAnimationFrame(()=>res({sync:t1-t0,frame:performance.now()-t0})));}),sel);
/* the nav's part of Chromium's accessibility tree, as "role "name" state" lines (the roles that carry a name or a state; text is left out) */
async function axOf(p){const c=await p.context().newCDPSession(p),{nodes}=await c.send('Accessibility.getFullAXTree'),by=new Map(nodes.map(n=>[n.nodeId,n])),out=[];
  const walk=n=>{const r=n.role&&n.role.value,nm=n.name&&n.name.value,pr=Object.fromEntries((n.properties||[]).map(x=>[x.name,x.value.value]));
    if(!n.ignored&&['navigation','button','DisclosureTriangle','dialog','listitem','list'].includes(r)&&(nm||r==='list'||r==='listitem')) out.push(r+(nm?' "'+nm+'"':'')+('expanded' in pr?' expanded='+pr.expanded:'')+(pr.current&&pr.current!=='false'?' current='+pr.current:'')+(pr.modal?' modal':''));
    (n.childIds||[]).forEach(i=>by.get(i)&&walk(by.get(i)));};
  const nav=nodes.find(n=>n.role&&n.role.value==='navigation'&&n.name&&n.name.value==='Pages');if(nav) walk(nav);await c.detach();return out;}
const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];

async function open(b,html,file,opts,bad){
  const ctx=await b.newContext(opts),p=await ctx.newPage();
  p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text())||m.type()==='error')bad.push(m.text());});p.on('pageerror',e=>bad.push(e.message));
  await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(html),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
  await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
  await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(300);
  await p.locator('#fileIn').setInputFiles(file);await p.waitForTimeout(500);
  await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(900);
  if(!(await p.locator('#main button.card').count())){await p.locator('#btnHome').click();await p.waitForTimeout(500);}
  await p.locator('#main button.card').first().click();await p.waitForTimeout(700);
  if(!(await p.locator('#main .pg-title').count())) {await p.locator('#main button.card').first().click();await p.waitForTimeout(600);}
  return p;}

/* WCAG contrast of two colours the page computed (rgb(), rgba() or color(srgb …)) */
const CONTRAST=`(()=>{
  const parse=s=>{let m=/^rgba?\\(([^)]+)\\)/.exec(s);if(m){const v=m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number);return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1};}
    m=/^color\\(srgb ([^)]+)\\)/.exec(s);if(m){const v=m[1].split(/[ \\/]+/).filter(Boolean).map(Number);return {r:v[0]*255,g:v[1]*255,b:v[2]*255,a:v.length>3?v[3]:1};}return null;};
  const lum=c=>{const f=x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);};
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
  /* the colour behind a node: the first ancestor with a background that is not clear */
  const behind=n=>{for(let e=n;e;e=e.parentElement){const c=parse(getComputedStyle(e).backgroundColor);if(c&&c.a>0.99) return c;}return parse(getComputedStyle(document.documentElement).backgroundColor)||{r:255,g:255,b:255,a:1};};
  return {parse,ratio,behind};})()`;

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const file=path.join(OUT,'pagesmenu.booklet.md');fs.writeFileSync(file,fx.booklet());
  const b=await chromium.launch(),bad=[];

  /* ---------- 1. wide ---------- */
  {const p=await open(b,HTML,file,{viewport:{width:1280,height:800}},bad);
   await p.evaluate(()=>{document.querySelector('#main .col').style.paddingBottom='3000px';});  // a page long enough to scroll, to see the column stay
   /* the branches are shut on the first page: the reader opens some, as the 157 pages are longer than the column only then */
   for(const t of TREE.filter(x=>x.depth===1).slice(0,4)) await p.locator('#pm-panel details[data-id="/'+t.id+'"] > summary').click();
   const geo=()=>p.evaluate(()=>{const n=document.querySelector('nav.pm'),pa=document.getElementById('pm-panel'),c=document.querySelector('#main .col'),r=pa.getBoundingClientRect(),cr=c.getBoundingClientRect(),
     on=pa.querySelector('.pm-go[aria-current]'),o=on&&on.getBoundingClientRect(),bar=document.querySelector('.bar').getBoundingClientRect();
     return {label:n.getAttribute('aria-label'),show:getComputedStyle(pa).display,left:r.left,right:r.right,top:r.top,bottom:r.bottom,colLeft:cr.left,barBottom:bar.bottom,sh:pa.scrollHeight,ch:pa.clientHeight,st:pa.scrollTop,wy:scrollY,
       oneBtn:getComputedStyle(document.querySelector('.pm-open')).display,closeBtn:getComputedStyle(document.querySelector('.pm-close')).display,
       on:on?on.textContent.trim():'',inView:!!o&&o.top>=r.top-1&&o.bottom<=r.bottom+1,vh:innerHeight};});
   let g=await geo();
   ok(g.label==='Pages'&&g.show==='block'&&g.right<=g.colLeft+1&&g.left<g.colLeft,'1280: the menu is a column left of the page '+JSON.stringify({l:g.left,r:g.right,col:g.colLeft}));
   ok(g.oneBtn==='none'&&g.closeBtn==='none','1280: no Pages button and no Close in the column');
   ok(g.sh>g.ch,'1280: the 157 pages are longer than the column ('+g.sh+' > '+g.ch+'): it scrolls inside itself');
   /* sticky: the window scrolls down, the column stays where it was */
   const top0=g.top;await p.evaluate(()=>scrollTo(0,500));await p.waitForTimeout(100);g=await geo();
   const apTop=await p.evaluate(()=>parseFloat(document.documentElement.style.getPropertyValue('--ap-top')));
   ok(g.wy>=400&&Math.abs(g.top-apTop)<=2&&g.top>=g.barBottom-1&&g.bottom<=g.vh+1,'1280: sticky: the window is at '+g.wy+' and the column holds just under the bar ('+Math.round(g.top)+', the bar clears at '+Math.round(g.barBottom)+'; it began at '+Math.round(top0)+') and ends inside the window ('+Math.round(g.bottom)+' of '+g.vh+')');
   /* scrolling the column does not scroll the window */
   const w0=g.wy;await p.evaluate(()=>{document.getElementById('pm-panel').scrollTop=400;});await p.waitForTimeout(100);g=await geo();
   ok(g.st>=300&&g.wy===w0,'1280: scrolling the column ('+g.st+') leaves the window where it was ('+g.wy+')');
   await p.evaluate(()=>{scrollTo(0,0);document.getElementById('pm-panel').scrollTop=0;});
   /* Next 30 times: the page on show stays in view inside the column */
   let allIn=true,last='',step=0;
   for(let i=1;i<=30;i++){await p.evaluate(()=>document.querySelector('#main .cd-foot .pg-next').click());g=await geo();last=g.on;
     if(!g.inView||g.on!==TREE[i].title){allIn=false;step=i;break;}}
   ok(allIn&&last===TREE[30].title,'1280: after Next 30 times the page on show is “'+last+'” and its entry was in view in the column at every step'+(allIn?'':' (failed at step '+step+')'));
   ok(g.st>0,'1280: the column has scrolled to follow ('+g.st+')');
   /* a deep entry far down */
   const deep=TREE[150];
   const parent=TREE.find(x=>x.id===deep.parent),grand=TREE.find(x=>x.id===parent.parent);
   /* its branches are shut: open them as a reader would, then press it */
   for(const q of [grand,parent]){const d=p.locator('#pm-panel details[data-id="/'+q.id+'"]');if(!(await d.getAttribute('open')!==null)) await d.locator('> summary').click();}
   await p.locator('#pm-panel .pm-go',{hasText:deep.title}).first().click();await p.waitForTimeout(150);g=await geo();
   ok(await p.locator('#main .pg-title').first().textContent().then(t=>t.trim())===deep.title,'1280: pressing a deep entry (“'+deep.title+'”, level 3) goes to that page');
   ok(g.on===deep.title&&g.inView,'1280: the entry of the page on show is in view in the column after it');
   const opened=await p.evaluate(ids=>ids.map(i=>document.querySelector('#pm-panel details[data-id="/'+i+'"]').open),[grand.id,parent.id]);
   ok(opened.every(Boolean),'1280: both ancestors of the page on show are open');
   ok(await p.evaluate(()=>document.querySelectorAll('#pm-panel .pm-go[aria-current="page"]').length)===1,'1280: exactly one entry is aria-current=page');
   /* the reader's closing a branch is kept while the page does not change; the focus goes to the page on show */
   ok(await p.evaluate(()=>document.activeElement&&document.activeElement.classList.contains('ap-body')),'1280: pressing an entry puts the focus on the page, as the trail and the cards do');
   /* the column on the very first page (no ancestor) and Back to it */
   await p.locator('#pm-panel .pm-go').first().click();await p.waitForTimeout(100);g=await geo();
   ok(g.on===TREE[0].title&&g.inView&&g.st===0,'1280: the first entry brings the column back to its top');
   ok(!(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1)),'1280: the screen does not scroll sideways');
   /* the accessibility tree, as Chromium builds it (CDP): roles and names */
   const ax=await axOf(p);
   console.log('     1280 accessibility tree, the navigation and the first entries:\n'+ax.slice(0,6).map(l=>'       '+l).join('\n'));
   ok(ax[0]==='navigation "Pages"'&&ax.some(l=>/^DisclosureTriangle "Pages under .+" expanded=false$/.test(l))&&ax.some(l=>/^button "[^"]+"$/.test(l)),'1280: the accessibility tree has a navigation named Pages holding the tree: entries are buttons, a branch is a disclosure triangle named “Pages under …” with its expanded state (the page on show is aria-current=page in the DOM, checked above: the tree dump does not carry it)');
   await p.context().close();}

  /* ---------- 2. phone ---------- */
  {const p=await open(b,HTML,file,{viewport:{width:390,height:844},hasTouch:true,isMobile:true},bad);
   const st=()=>p.evaluate(()=>{const n=document.querySelector('nav.pm'),pa=document.getElementById('pm-panel'),btn=n.querySelector('.pm-open'),sc=n.querySelector('.pm-scrim'),a=document.activeElement;
     return {open:n.hasAttribute('data-open'),panel:getComputedStyle(pa).display,exp:btn.getAttribute('aria-expanded'),ctl:btn.getAttribute('aria-controls'),role:pa.getAttribute('role'),modal:pa.getAttribute('aria-modal'),
       scrim:getComputedStyle(sc).display,inPanel:!!a&&pa.contains(a),onBtn:a===btn,onBody:!!a&&a.classList.contains('ap-body'),btnH:btn.getBoundingClientRect().height,btnShown:getComputedStyle(btn).display,
       focus:a?(a.tagName+'.'+a.className+':'+(a.getAttribute('aria-label')||a.textContent.trim().slice(0,30))):'',
       pw:pa.getBoundingClientRect().width,wide:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};});
   let s=await st();
   ok(s.panel==='none'&&s.exp==='false'&&s.ctl==='pm-panel'&&s.btnShown!=='none'&&s.btnH>=44,'390: a Pages button, 44px high, closed: aria-expanded=false, aria-controls=pm-panel; the tree is not shown '+JSON.stringify({h:s.btnH}));
   ok(!s.wide,'390: the screen does not scroll sideways, drawer shut');
   await p.locator('button.pm-open').click();await p.waitForTimeout(300);s=await st();
   ok(s.open&&s.panel==='block'&&s.exp==='true'&&s.role==='dialog'&&s.modal==='true'&&s.scrim==='block','390: the button opens the drawer: aria-expanded=true, a modal dialog, a scrim '+JSON.stringify({role:s.role,modal:s.modal,scrim:s.scrim}));
   ok(s.inPanel,'390: the focus moves into the drawer ('+s.focus+')');
   ok(s.pw>0&&s.pw<390,'390: the drawer covers part of the width ('+Math.round(s.pw)+'px) and the scrim the rest');
   const sizes=await p.evaluate(()=>{const ok=sel=>[...document.querySelectorAll(sel)].filter(n=>n.checkVisibility()).map(n=>n.getBoundingClientRect().height);
     const all=[...ok('#pm-panel .pm-go'),...ok('#pm-panel .pm-close'),...ok('#pm-panel .pm-tog')];return {n:all.length,min:Math.min(...all)};});
   ok(sizes.n>=7*2&&sizes.min>=43.99,'390: every entry, branch toggle and Close is at least 44px high ('+sizes.n+' shown, smallest '+sizes.min.toFixed(1)+'px)');
   /* Tab and Shift+Tab stay inside */
   let inside=true,seen=new Set();
   for(let i=0;i<30;i++){await p.keyboard.press('Tab');const q=await st();seen.add(q.focus);if(!q.inPanel){inside=false;break;}}
   ok(inside&&seen.size>=8,'390: Tab 30 times: the focus never leaves the drawer ('+seen.size+' different controls, then wraps)');
   inside=true;for(let i=0;i<30;i++){await p.keyboard.press('Shift+Tab');const q=await st();if(!q.inPanel){inside=false;break;}}
   ok(inside,'390: Shift+Tab 30 times: the focus never leaves the drawer');
   /* Close first, then the entries in reading order */
   await p.evaluate(()=>document.querySelector('#pm-panel .pm-close').focus());await p.keyboard.press('Tab');
   ok((await st()).focus.startsWith('BUTTON.pm-go:'+TREE[0].title),'390: after Close the Tab order is the tree in reading order ('+(await st()).focus+')');
   await p.keyboard.press('Tab');
   ok(/^SUMMARY\.pm-tog:Pages under /.test((await st()).focus),'390: and the toggle of a branch comes right after its entry ('+(await st()).focus+')');
   /* a branch toggles from the keyboard */
   const before=await p.evaluate(()=>document.querySelector('#pm-panel details').open);await p.keyboard.press('Enter');const after=await p.evaluate(()=>document.querySelector('#pm-panel details').open);
   ok(before!==after,'390: Enter on a branch toggle opens or closes the branch ('+before+' to '+after+')');
   await p.keyboard.press('Space');ok(await p.evaluate(()=>document.querySelector('#pm-panel details').open)===before,'390: Space does the same');
   /* Escape */
   await p.keyboard.press('Escape');await p.waitForTimeout(100);s=await st();
   ok(!s.open&&s.panel==='none'&&s.exp==='false'&&s.onBtn&&s.role===null,'390: Escape closes it and the focus is back on the Pages button '+s.focus);
   /* Close */
   await p.locator('button.pm-open').click();await p.waitForTimeout(200);await p.locator('#pm-panel .pm-close').click();await p.waitForTimeout(100);s=await st();
   ok(!s.open&&s.onBtn,'390: the Close button closes it and the focus is back on the Pages button');
   /* the scrim */
   await p.locator('button.pm-open').click();await p.waitForTimeout(200);await p.touchscreen.tap(382,500);await p.waitForTimeout(100);s=await st();
   ok(!s.open&&s.onBtn,'390: a press on the scrim closes it and the focus is back on the Pages button');
   /* choosing a page */
   await p.locator('button.pm-open').click();await p.waitForTimeout(200);
   const pick=TREE[1];await p.locator('#pm-panel details[data-id="/'+TREE[0].id+'"] > summary').click();
   await p.locator('#pm-panel .pm-go',{hasText:pick.title}).first().click();await p.waitForTimeout(200);s=await st();
   ok(!s.open&&s.panel==='none'&&(await p.locator('#main .pg-title').first().textContent()).trim()===pick.title,'390: choosing a page shuts the drawer and turns to that page');
   ok(s.onBody,'390: and the focus is on the page (as every move to a page puts it)');
   /* the page on show sits in a branch the reader shut: the focus still goes into the drawer, onto Close */
   await p.locator('button.pm-open').click();await p.waitForTimeout(200);
   await p.locator('#pm-panel details[data-id="/'+TREE[0].id+'"] > summary').click();await p.waitForTimeout(100);
   const shutBr=await p.evaluate(id=>!document.querySelector('#pm-panel details[data-id="/'+id+'"]').open,TREE[0].id);
   await p.keyboard.press('Escape');await p.waitForTimeout(100);
   await p.locator('button.pm-open').click();await p.waitForTimeout(250);s=await st();
   ok(shutBr&&s.open&&s.inPanel,'390: the page on show is in a shut branch: reopening the drawer still puts the focus inside it ('+s.focus+')');
   await p.keyboard.press('Escape');await p.waitForTimeout(100);
   /* the Pages button is in sight after a turn of the page (the page scrolls to the menu's wrapper, not past the button), the page being scrolled down first */
   await p.evaluate(()=>scrollTo(0,400));await p.locator('#main .cd-foot .pg-next').click();await p.waitForTimeout(250);
   const inSight=await p.evaluate(()=>{const r=document.querySelector('button.pm-open').getBoundingClientRect(),bar=document.querySelector('.bar').getBoundingClientRect();return {top:r.top,barBottom:bar.bottom,bottom:r.bottom,vh:innerHeight};});
   ok(inSight.top>=inSight.barBottom-1&&inSight.bottom<=inSight.vh,'390: after Next the Pages button is in sight, just under the bar '+JSON.stringify({top:Math.round(inSight.top),bar:Math.round(inSight.barBottom)}));
   await p.locator('button.pm-open').click();await p.waitForTimeout(200);
   const mark=await p.evaluate(()=>{const o=document.querySelector('#pm-panel .pm-go[aria-current]'),pa=document.getElementById('pm-panel'),r=o.getBoundingClientRect(),q=pa.getBoundingClientRect();return {on:o.textContent.trim(),in:r.top>=q.top-1&&r.bottom<=q.bottom+1,focus:document.activeElement===o};});
   ok(mark.on===TREE[2].title&&mark.in&&mark.focus,'390: reopened, the page on show (the one after the one chosen) is marked, in view and has the focus');
   /* the window widening past the breakpoint turns the drawer into the column */
   await p.setViewportSize({width:1280,height:800});await p.waitForTimeout(300);s=await st();
   ok(!s.open&&(await p.evaluate(()=>getComputedStyle(document.getElementById('pm-panel')).position))==='static','390 to 1280 with the drawer open: it is the column, and shut ('+(s.open?'still open':'shut')+')');
   await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);
   /* 200% text */
   await p.addStyleTag({content:'html{font-size:34px!important}'});await p.waitForTimeout(300);s=await st();
   ok(!s.wide,'390 at 200% text: the screen does not scroll sideways, drawer shut');
   await p.locator('button.pm-open').click();await p.waitForTimeout(300);
   const w200=await p.evaluate(()=>{const pa=document.getElementById('pm-panel');return {wide:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,panelX:pa.scrollWidth>pa.clientWidth+1,pw:pa.getBoundingClientRect().width,h:document.querySelector('.pm-close').getBoundingClientRect().height};});
   ok(!w200.wide&&!w200.panelX,'390 at 200% text, drawer open: no sideways scroll in the page or in the drawer '+JSON.stringify(w200));
   await p.keyboard.press('Escape');
   await p.context().close();}

  /* reduced motion: no slide */
  {const p=await open(b,HTML,file,{viewport:{width:390,height:844},reducedMotion:'reduce'},bad);
   await p.locator('button.pm-open').click();await p.waitForTimeout(100);
   ok((await p.evaluate(()=>getComputedStyle(document.getElementById('pm-panel')).animationName))==='none','390 with reduced motion: the drawer has no slide animation');
   await p.context().close();}
  {const p=await open(b,HTML,file,{viewport:{width:390,height:844}},bad);
   await p.locator('button.pm-open').click();await p.waitForTimeout(100);
   ok((await p.evaluate(()=>getComputedStyle(document.getElementById('pm-panel')).animationName))==='pm-in','390 without it: the drawer slides in (animation pm-in)');
   await p.context().close();}

  /* ---------- 4. contrast, light and dark ---------- */
  for(const scheme of ['light','dark']){
    for(const W of [1280,390]){
      const p=await open(b,HTML,file,{viewport:{width:W,height:800},colorScheme:scheme},bad);
      const theme=await p.evaluate(()=>document.documentElement.getAttribute('data-theme'));
      if(W===390){await p.locator('button.pm-open').click();await p.waitForTimeout(250);}
      const R=await p.evaluate(`(()=>{const C=${CONTRAST};const out={};
        const txt=(n,bg)=>C.ratio(C.parse(getComputedStyle(n).color),bg||C.behind(n));
        const go=document.querySelector('#pm-panel .pm-go:not([aria-current])'),cur=document.querySelector('#pm-panel .pm-go[aria-current]'),tog=document.querySelector('#pm-panel .pm-tog'),
          title=document.querySelector('#pm-panel .pm-title'),btn=document.querySelector('.pm-open'),cl=document.querySelector('.pm-close'),panel=document.getElementById('pm-panel');
        out.entry=txt(go);out.current=txt(cur);out.title=txt(title);
        const paper=C.behind(panel);
        out.bar=C.ratio(C.parse(getComputedStyle(cur).borderLeftColor),paper);   // the page-on-show bar against the paper
        out.chevron=C.ratio(C.parse(getComputedStyle(tog).color),paper);
        if(btn&&btn.getClientRects().length){out.btnText=txt(btn);out.btnEdge=C.ratio(C.parse(getComputedStyle(btn).borderTopColor),C.behind(btn.parentElement));}
        if(cl&&cl.getClientRects().length){out.closeText=txt(cl);out.closeEdge=C.ratio(C.parse(getComputedStyle(cl).borderTopColor),C.behind(cl.parentElement));}
        return out;})()`);
      const f=x=>x==null?'-':x.toFixed(2);
      console.log('     '+scheme+' ('+theme+') '+W+': '+Object.entries(R).filter(([k,v])=>v!=null).map(([k,v])=>k+' '+f(v)).join(', '));
      ok(theme===(scheme==='dark'?'night':'paper'),W+' '+scheme+': the renderer is on its own '+(scheme==='dark'?'night':'paper')+' theme ('+theme+')');
      ok(R.entry>=4.5&&R.current>=4.5&&R.title>=4.5&&(R.btnText===undefined||R.btnText>=4.5)&&(R.closeText===undefined||R.closeText>=4.5),W+' '+scheme+': text is at least 4.5:1 (entry '+f(R.entry)+', page on show '+f(R.current)+')');
      ok(R.bar>=3&&R.chevron>=3&&(R.btnEdge===undefined||R.btnEdge>=3)&&(R.closeEdge===undefined||R.closeEdge>=3),W+' '+scheme+': the page-on-show bar, the branch toggle and the control edges are at least 3:1 (bar '+f(R.bar)+', toggle '+f(R.chevron)+(R.btnEdge!==undefined?', Pages edge '+f(R.btnEdge):'')+(R.closeEdge!==undefined?', Close edge '+f(R.closeEdge):'')+')');
      await p.context().close();}}

  /* ---------- 5. the accessibility tree on the phone, drawer shut and open ---------- */
  {const p=await open(b,HTML,file,{viewport:{width:390,height:844}},bad);
   let ax=await axOf(p);
   console.log('     390 accessibility tree, drawer shut: '+ax.map(l=>l.replace(/^list.*/,'')).filter(Boolean).join(' > '));
   ok(ax[0]==='navigation "Pages"'&&ax[1]==='button "Pages" expanded=false'&&ax.length===2,'390: shut, the tree has navigation “Pages” holding one button “Pages” (expanded=false), and the entries are not exposed '+JSON.stringify(ax));
   await p.locator('button.pm-open').click();await p.waitForTimeout(250);
   ax=await axOf(p);
   console.log('     390 accessibility tree, drawer open (first lines):\n'+ax.slice(0,9).map(l=>'       '+l).join('\n'));
   ok(ax[0]==='navigation "Pages"'&&ax.includes('button "Pages" expanded=true')&&ax.some(l=>/^dialog "Pages" modal/.test(l))&&ax.includes('button "Close"')&&ax.some(l=>/^DisclosureTriangle "Pages under /.test(l)),'390: open, the tree has a modal dialog “Pages” with button “Close”, entries and branch disclosures; the Pages button is expanded=true');
   await p.context().close();}

  /* ---------- 6. the time to turn to a page ---------- */
  {let base=null;
   try{const mainHtml=path.join(OUT,'origin-main-booklet.html');
     fs.writeFileSync(mainHtml,cp.execFileSync('git',['show','origin/main:booklet.html'],{cwd:path.join(__dirname,'..'),maxBuffer:1<<28,stdio:['ignore','pipe','ignore']}));base=mainHtml;}catch(e){base=null;}
   const run=async(html)=>{const p=await open(b,html,file,{viewport:{width:1280,height:800}},bad),sync=[],frame=[];
     for(let i=0;i<30;i++){const r=await press(p,'#main .cd-foot .pg-next');sync.push(r.sync);frame.push(r.frame);}
     await p.context().close();return {sync:median(sync),frame:median(frame),max:Math.max(...frame)};};
   const rounds=3;let withMenu=[],without=[];
   for(let i=0;i<rounds;i++){withMenu.push(await run(HTML));if(base) without.push(await run(base));}
   const m=a=>median(a.map(x=>x.frame)),ms=a=>median(a.map(x=>x.sync));
   console.log('     Next on the 157-page booklet, median of 30 presses, press to second frame: with the menu '+m(withMenu).toFixed(1)+' ms (the draw itself '+ms(withMenu).toFixed(1)+' ms)'+(base?'; origin/main, no menu: '+m(without).toFixed(1)+' ms (the draw '+ms(without).toFixed(1)+' ms)':'; origin/main not available to compare'));
   ok(m(withMenu)<100,'with the 157-page menu a turn to the next page is on the screen in '+m(withMenu).toFixed(1)+' ms (under 100 ms, the point where a delay is noticed)');
   if(base) ok(m(withMenu)-m(without)<40,'and no more than 40 ms slower than the same move without a menu ('+(m(withMenu)-m(without)).toFixed(1)+' ms slower)');}

  ok(bad.length===0,'nothing refused by the policy, no console error, no script error '+bad.slice(0,3).join(' / '));
  await b.close();
  if(fails.length){console.log('\n'+fails.length+' FAILED');process.exit(1);}
  console.log('\npages menu browser checks passed');
})().catch(e=>{console.log('FAIL '+e.stack);process.exit(1);});
