// Browser check of the wiki (renderer 0.12.0, item E), in a real page under the hosted Content-Security-Policy, on the committed
// fixture test/fixtures/wiki-scrambled.booklet.md (the shape of booklet-hub's wiki: 157 pages in a tree, heading links, a tiles view)
// and on a flat module:
//  - a module whose activities carry parent: shows a tree (the top pages as cards, the whole tree in the side menu, the current page
//    marked, branches that open and close, drawn only when opened); a module without parent: is as it was;
//  - three levels down by cards; breadcrumbs (each an ancestor, a button), the page's children as cards after its words, "Mentioned on",
//    back up by a breadcrumb; "Next" follows the tree depth first; "Up" climbs one level;
//  - the search box in the side menu filters pages by title and text as the reader types, and is kept nowhere;
//  - nothing is written to localStorage or IndexedDB by opening pages, searching or moving through the tree;
//  - a link to a module this booklet does not hold is a chip: nothing is requested to draw it; pressed, the registry is read, and
//    "Add it" adds the module and the chip becomes a link;
//  - on a phone the menu is a disclosure above the page.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/wiki-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const WIKI=fs.readFileSync(path.join(__dirname,'fixtures','wiki-scrambled.booklet.md'),'utf8');

/* what the file says, read here with nothing of the renderer's: id, parent, title, in file order, then the tree by nestRows' rules */
const pages=[...WIKI.matchAll(/^> \[!activity\|(\S+)((?: [^\]]*)?)\] (.*)$/gm)].map(m=>({id:m[1],parent:((/parent:(\S+)/.exec(m[2]))||[])[1]||'',title:m[3].trim()}));
const byId=new Map(pages.map(p=>[p.id,p]));
const kidsOf=new Map(),roots=[];
pages.forEach(p=>{const q=byId.get(p.parent);if(q&&q!==p){if(!kidsOf.has(q.id))kidsOf.set(q.id,[]);kidsOf.get(q.id).push(p);}else roots.push(p);});
const dfs=[];(function walk(l){l.forEach(p=>{dfs.push(p);walk(kidsOf.get(p.id)||[]);});})(roots);
const kids=p=>kidsOf.get(p.id)||[];
/* the first path of three levels whose steps are all among a row's first 24 cards */
let path3=null;(function find(l,trail){for(const [i,p] of l.entries()){if(i>=24)break;const t=trail.concat([[p,i]]);if(t.length===3){path3=t;return true;}if(find(kids(p),t))return true;}return false;})(roots,[]);

const FLAT=`---\nbooklet: "0.13"\ntitle: Flat\nlang: en\n---\n\n> [!module|f] Flat module\n\nOpening words.\n\n> [!activity|one] First\n\nOne.\n\n> [!activity|two] Second\n\nTwo.\n\n> [!activity|three] Third\n\nThree.\n\n> [!module|f end] End\n`;
const CHIP=`---\nbooklet: "0.13"\ntitle: Programme\nlang: en\n---\n\n> [!module|prog] Programme\n\n> [!activity|start] Start here\n\nThe first week: [[week-1.booklet]]. The second: [Week 2](week-2.booklet.md). A row below.\n\n\`\`\`booklet data\n[{"label":"Third week","link":"week-3.booklet"}]\n\`\`\`\n^weeks\n\n\`\`\`booklet query\nfrom: weeks\nas: list\n\`\`\`\n\n> [!activity|more] More\n\nMore.\n\n> [!module|prog end] End\n\n> [!module|week-1] Week 1\n\n> [!activity|w1] Words\n\nWeek one.\n\n> [!activity|w1b] More words\n\nStill week one.\n\n> [!module|week-1 end] End\n`;
const WEEK2=`---\nbooklet: "0.11"\ntitle: Week 2\nlang: en\n---\n\n> [!module|week-2] Week 2\n\n> [!activity|w2] Week two\n\nWeek two reading.\n\n> [!activity|w2b] More\n\nx\n\n> [!module|week-2 end] End\n`;
const REG={modules:[{id:'t/week-2',title:'Week 2',file:'week-2.md'}]};

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const errs=[],cons=[];
  const openBook=async(text,W,hook)=>{
    const ctx=await b.newContext({viewport:{width:W||1280,height:900}});const p=await ctx.newPage();p.reqs=[];
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))cons.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
    p.on('request',r=>p.reqs.push(r.url()));
    await p.route('https://bookletmd.test/**',r=>r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':CSP}}));
    await p.route('https://raw.githubusercontent.com/**',async r=>{const u=new URL(r.request().url()).pathname;
      if(p.fileDelay&&!/registry\.json$/.test(u)) await new Promise(res=>setTimeout(res,p.fileDelay));
      if(p.regFail&&/registry\.json$/.test(u)) return r.fulfill({status:500,body:'no',headers:{'access-control-allow-origin':'*'}});
      r.fulfill({status:200,body:/registry\.json$/.test(u)?JSON.stringify(REG):WEEK2,headers:{'content-type':/json$/.test(u)?'application/json':'text/plain','access-control-allow-origin':'*'}});});
    await p.goto('https://bookletmd.test/app/');await p.waitForTimeout(400);
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await p.waitForTimeout(200);
    await p.evaluate(t=>{document.getElementById('pasteIn').value=t;},text);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await p.waitForTimeout(700);
    return p;};
  const h2=p=>p.locator('#main .wk-content h2, #main .col h2').first().innerText();
  const cards=p=>p.locator('#main .wk-cards button.mode');
  const focused=p=>p.evaluate(()=>{const a=document.activeElement;return a?a.tagName+'|'+(a.getAttribute('aria-current')||'')+'|'+(a.textContent||'').slice(0,40):'none';});
  const addr=p=>p.evaluate(()=>JSON.stringify([history.length,location.href]));
  const heights=(p,sel)=>p.locator(sel).evaluateAll(es=>es.slice(0,8).map(e=>Math.round(e.getBoundingClientRect().height)));
  const cardTitle=async(p,i)=>(await cards(p).nth(i).locator('.k').innerText()).trim();

  ok(pages.length===157&&roots.length>=1&&!!path3,'the fixture: '+pages.length+' pages, '+roots.length+' at the top, a path three levels down');

  /* ---- the wiki, at 1280 ---- */
  let p=await openBook(WIKI,1280);
  ok(await p.locator('.wk-frame').count()===1&&await p.locator('.ap-frame').count()===0,'a module with parent: shows the wiki frame: a menu beside the page');
  ok(await cards(p).count()===Math.min(24,roots.length),'the module screen shows the top pages as cards ('+await cards(p).count()+', not all '+pages.length+')');
  ok(await p.locator('.wk-tree > li').count()===roots.length,'the side menu holds the top of the tree ('+roots.length+')');
  const rootWithKids=roots.find(r=>kids(r).length>0);
  ok(await p.locator('.wk-tree details').count()>=1,'a branch is a native disclosure, closed at first');
  const d0=p.locator('.wk-tree > li > details').first();
  ok(await d0.locator(':scope > ul').count()===0,'a closed branch has drawn nothing under it');
  await d0.locator(':scope > summary').click({position:{x:4,y:6}});await p.waitForTimeout(150);
  ok(await d0.evaluate(d=>d.open)&&await d0.locator(':scope > ul > li').count()>0,'opening a branch draws its children');
  await d0.locator(':scope > summary').click({position:{x:4,y:6}});await p.waitForTimeout(150);
  ok(!(await d0.evaluate(d=>d.open)),'and pressing it again closes it');

  const a0=await addr(p);
  /* three levels down by the cards */
  const titles=[];
  for(const [pg,i] of path3){await cards(p).nth(i).click();await p.waitForTimeout(300);titles.push(pg.title);
    ok((await h2(p)).trim()===pg.title,'level '+titles.length+': the page is "'+pg.title+'"');
    ok(/^H2/.test(await focused(p)),'after a card the focus is on the new page\'s heading ('+await focused(p)+')');}
  ok((await heights(p,'.wk-tree .wk-link')).every(h=>h>=44)&&(await heights(p,'.wk-crumb')).every(h=>h>=44),'tree links and breadcrumbs are at least 44 px tall ('+(await heights(p,'.wk-tree .wk-link')).slice(0,3)+' / '+(await heights(p,'.wk-crumb')).slice(0,3)+')');
  const crumbs=()=>p.locator('.wk-crumbs li').allInnerTexts();
  const cr=(await crumbs()).map(t=>t.trim());
  ok(cr.length===4&&cr.slice(1).join('|')===titles.join('|'),'breadcrumbs: the module, then each ancestor, then this page ('+cr.length+' of them)');
  ok(await p.locator('.wk-crumbs li button').count()===3&&await p.locator('.wk-crumbs [aria-current="page"]').count()===1,'every ancestor is a button; the page itself is not');
  const cur=await p.locator('.wk-tree [aria-current="page"]').innerText();
  ok(cur.trim()===titles[2],'the menu marks the current page');
  ok(await p.locator('.wk-tree details[open]').count()>=2,'and the branches above it are open');
  const last=path3[2][0];
  ok(await cards(p).count()===Math.min(24,kids(last).length),'its children are cards after its words ('+await cards(p).count()+')');
  ok(await p.locator('#main .wk-content > .col .ap-body, #main .wk-content .ap-body').count()>0&&await p.evaluate(()=>{const c=document.querySelector('.wk-cards'),b=document.querySelector('.ap-body');return !c||(b.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING)>0;}),'the cards come after the page\'s own content');
  const mid=await p.evaluate(()=>{const c=[...document.querySelectorAll('.wk-crumbs li')].map(l=>{const r=(l.querySelector('button,span')).getBoundingClientRect();return r.top+r.height/2;});return Math.max(...c)-Math.min(...c);});
  ok(mid<3,'the current (last) breadcrumb is centred with the buttons before it ('+mid.toFixed(1)+' px apart)');
  /* back up by a breadcrumb */
  await p.locator('.wk-crumbs li button').nth(1).click();await p.waitForTimeout(300);
  ok((await h2(p)).trim()===titles[0]&&(await crumbs()).length===2,'a breadcrumb leads back up to that ancestor');
  ok(/^H2/.test(await focused(p)),'after a breadcrumb the focus is on the page\'s heading ('+await focused(p)+')');
  /* Up */
  await cards(p).nth(path3[1][1]).click();await p.waitForTimeout(250);
  await p.locator('.cd-back').click();await p.waitForTimeout(250);
  ok((await h2(p)).trim()===titles[0],'"Up" climbs one level');
  ok(/^H2/.test(await focused(p)),'after Up the focus is on the page\'s heading');
  /* the module crumb leads to the module screen */
  await p.locator('.wk-crumbs li button').first().click();await p.waitForTimeout(250);
  ok(await cards(p).count()===Math.min(24,roots.length)&&await p.locator('.wk-crumbs').count()===0,'the first breadcrumb is the module\'s own screen');
  /* Next follows the tree depth first */
  await cards(p).first().click();await p.waitForTimeout(250);
  let good=true,seen=[];
  for(let i=0;i<8&&i<dfs.length-1;i++){
    const t=(await h2(p)).trim();seen.push(t);if(t!==dfs[i].title){good=false;break;}
    await p.locator('.cd-next').click();await p.waitForTimeout(200);}
  ok(good,'"Next" goes through the pages depth first (the first '+seen.length+' match the file\'s tree)');
  ok(/^H2/.test(await focused(p)),'after Next the focus is on the page\'s heading');
  /* a long row of children: only the first cards are drawn, the rest on a press */
  const wide=pages.map(q=>[q,kids(q).length]).sort((x,y)=>y[1]-x[1])[0];
  console.log('     most children under one page: '+wide[1]);

  /* ---- search ---- */
  const word=(()=>{const t=pages[40].title.split(' ')[0];return t;})();
  const expectTitle=pages.filter(q=>q.title.toLowerCase().includes(word.toLowerCase())).length;
  await p.locator('.wk-q').fill(word);await p.waitForTimeout(150);
  const hits=await p.locator('.wk-results .wk-link').allInnerTexts();
  ok(hits.length>=1&&hits.length<=40&&await p.locator('.wk-tree').isHidden()&&await p.locator('.wk-results').isVisible(),'typing in the search box lists matching pages in place of the tree ('+hits.length+' for "'+word+'")');
  ok(hits.slice(0,Math.min(expectTitle,hits.length)).every(t=>t.toLowerCase().includes(word.toLowerCase())),'pages whose title has the word come first');
  const proseWord=(()=>{const body=WIKI.split(/^> \[!activity\|/m)[60].split('\n').slice(2).join(' ');return (body.match(/\b[a-z]{7,}\b/)||['xx'])[0];})();
  await p.locator('.wk-q').fill(proseWord);await p.waitForTimeout(150);
  ok(await p.locator('.wk-results .wk-link').count()>=1,'it finds words in the prose too ("'+proseWord+'")');
  await p.locator('.wk-q').fill('zzzzqqq');await p.waitForTimeout(150);
  ok(await p.locator('.wk-none').isVisible()&&await p.locator('.wk-results').isHidden(),'a word nowhere says so');
  await p.locator('.wk-q').fill(word);await p.waitForTimeout(150);
  await p.locator('.wk-results .wk-link').first().click();await p.waitForTimeout(300);
  ok(/\|page\|/.test(await focused(p)),'after a choice in the menu the focus is on that page\'s entry ('+await focused(p)+')');
  ok(await p.locator('.wk-q').inputValue()===word&&await p.locator('.wk-results .wk-link').count()>=1,'a result opens its page, and the search stays as it was typed');
  await p.locator('.wk-q').fill('');await p.waitForTimeout(150);
  ok(await p.locator('.wk-tree').isVisible()&&await p.locator('.wk-results').isHidden(),'an empty box shows the tree again');

  /* ---- Mentioned on ---- */
  const links=[];pages.forEach((q,i)=>{const body=WIKI.split(/^> \[!activity\|/m)[i+1];for(const m of body.matchAll(/\[\[#([^\]|]+)\]\]/g)){const t=pages.find(x=>x.title===m[1].trim());if(t&&t!==q)links.push([q,t]);}});
  const [src,tgt]=links[0];
  await p.locator('.wk-q').fill(tgt.title);await p.waitForTimeout(150);
  await p.locator('.wk-results .wk-link',{hasText:tgt.title}).first().click();await p.waitForTimeout(300);
  const chips=await p.locator('.wk-chips .wk-chip').allInnerTexts();
  ok(chips.map(t=>t.trim()).includes(src.title),'"Mentioned on" lists the page that links to this one ("'+src.title+'" -> "'+tgt.title+'")');
  await p.locator('.wk-chips .wk-chip',{hasText:src.title}).first().click();await p.waitForTimeout(300);
  ok((await h2(p)).trim()===src.title,'a chip opens that page');
  ok(/^H2/.test(await focused(p)),'after a mention chip the focus is on the page\'s heading');
  ok((await heights(p,'.wk-chip')).every(h=>h>=44),'mention chips are at least 44 px tall');
  ok(await addr(p)===a0,'browsing (cards, tree, breadcrumb, Up, Next, search, a mention chip) left history.length and location.href as they were ('+a0+')');
  await p.locator('.wk-q').fill('');
  await p.screenshot({path:path.join(OUT,'wiki-page.png')});

  /* ---- no storage writes while browsing ---- */
  const snap=pg=>pg.evaluate(async()=>{
    const ls={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls[k]=localStorage.getItem(k);}
    const idb={};
    if(indexedDB.databases){for(const d of await indexedDB.databases()){
      idb[d.name]=await new Promise(res=>{const r=indexedDB.open(d.name);r.onerror=()=>res('error');r.onsuccess=()=>{const db=r.result,out={};
        const names=[...db.objectStoreNames];if(!names.length){db.close();return res(out);}
        const tx=db.transaction(names,'readonly');let n=names.length;
        names.forEach(s=>{const g=tx.objectStore(s).getAll(),k=tx.objectStore(s).getAllKeys();g.onsuccess=()=>{k.onsuccess=()=>{out[s]=[k.result,g.result];if(--n===0){db.close();res(out);}};};});};});}}
    return JSON.stringify({ls,idb,cookie:document.cookie});});
  p=await openBook(WIKI,1280);await p.waitForTimeout(1500);
  const before=await snap(p);
  ok(before.length>200,'the storage snapshot has the booklet\'s own save in it ('+before.length+' characters)');
  for(const [,i] of path3){await cards(p).nth(i).click();await p.waitForTimeout(150);}
  await p.locator('.wk-q').fill('a');await p.waitForTimeout(120);await p.locator('.wk-q').fill(word);await p.waitForTimeout(120);
  await p.locator('.wk-results .wk-link').first().click();await p.waitForTimeout(150);await p.locator('.wk-q').fill('');
  await p.locator('.wk-crumbs li button').nth(1).click();await p.waitForTimeout(150);
  await p.locator('.cd-next').click();await p.waitForTimeout(150);
  const dd=p.locator('.wk-tree details').first();if(await dd.count()) await dd.locator(':scope > summary').click({position:{x:4,y:6}});
  await p.waitForTimeout(1500);
  ok(await snap(p)===before,'opening pages, searching and moving through the tree leave localStorage, IndexedDB and cookies exactly as they were');
  await p.context().close();

  /* ---- a flat module is as it was ---- */
  p=await openBook(FLAT,1280);
  ok(await p.locator('.wk-frame').count()===0&&await cards(p).count()===0&&await p.locator('#main button.mode').count()===3,'a module with no parent: draws the flat list of three cards and no wiki frame');
  await p.locator('#main button.mode').nth(1).click();await p.waitForTimeout(300);
  ok(await p.locator('.wk-crumbs,.wk-menu,.wk-chips').count()===0&&await p.locator('.cd-next').count()===1,'and a page of it has no breadcrumbs, menu or mentions, only the old foot');
  await p.context().close();

  /* ---- a phone: the menu is a disclosure above the page ---- */
  p=await openBook(WIKI,390);
  ok(await p.locator('.wk-fold').evaluate(d=>!d.open)&&await p.locator('.wk-fold > summary').isVisible(),'at 390 px the menu starts closed, under a heading that opens it');
  await p.locator('.wk-fold > summary').click();await p.waitForTimeout(200);
  ok(await p.locator('.wk-fold').evaluate(d=>d.open)&&await p.locator('.wk-q').isVisible(),'pressing it opens the menu with its search box');
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  ok(ov<=0,'the page does not scroll sideways at 390 px ('+ov+')');
  const menuOpen=()=>p.locator('.wk-fold').evaluate(d=>d.open);
  /* a choice closes the phone's menu: a tree entry, a search result, a breadcrumb */
  await p.locator('.wk-tree .wk-link').first().click();await p.waitForTimeout(300);
  ok(!(await menuOpen())&&/^H2/.test(await focused(p)),'a tree entry chosen on a phone closes the menu and focuses the page\'s heading ('+await focused(p)+')');
  await p.locator('.wk-fold > summary').click();await p.waitForTimeout(200);
  await p.locator('.wk-q').fill(word);await p.waitForTimeout(200);
  await p.locator('.wk-results .wk-link').first().click();await p.waitForTimeout(300);
  ok(!(await menuOpen())&&await p.locator('.wk-q').inputValue()===word,'a search result chosen on a phone closes the menu, though the words stay in the box');
  await cards(p).first().click().catch(()=>{});await p.waitForTimeout(250);
  await p.locator('.wk-fold > summary').click();await p.waitForTimeout(200);
  ok(await menuOpen(),'and it opens again when asked');
  await p.locator('.wk-fold > summary').click();await p.waitForTimeout(100);
  if(await p.locator('.wk-crumb').count()){await p.locator('.wk-crumb').first().click();await p.waitForTimeout(250);
    ok(!(await menuOpen()),'a breadcrumb leaves the menu closed');}
  await p.screenshot({path:path.join(OUT,'wiki-phone-closed.png')});
  await p.context().close();

  /* ---- a hidden page: left out of every list, its children in its place; reached by a link it shows its place ---- */
  {const HID='---\nbooklet: "0.13"\ntitle: Hidden\nlang: en\n---\n\n> [!module|h] Hid\n\n> [!activity|a] Alpha\n\nAlpha words.\n\n> [!activity|h1 parent:a hidden] Hidden one\n\nHidden words.\n\n> [!activity|c parent:h1] Child\n\nChild words.\n\n> [!activity|z] Zed\n\nSee [[#Hidden one]].\n\n> [!module|h end] End\n';
   p=await openBook(HID,1280);
   ok(await cards(p).count()===2&&(await p.locator('.wk-tree > li').count())===2,'a hidden page is not among the top cards or the menu\'s top ('+await cards(p).count()+' cards)');
   await cards(p).first().click();await p.waitForTimeout(250);
   ok(await cards(p).count()===1&&/Child/.test(await cards(p).first().innerText()),'its child takes its place among the cards of Alpha');
   ok(await p.locator('.wk-tree [data-id$="c"]').count()===1&&await p.locator('.wk-tree [data-id$="h1"]').count()===0,'and in the menu, under Alpha');
   await p.locator('.cd-next').click();await p.waitForTimeout(200);
   ok((await h2(p)).trim()==='Child','"Next" from Alpha passes over the hidden page');
   await p.locator('.wk-q').fill('hidden words');await p.waitForTimeout(150);
   ok(await p.locator('.wk-none').isVisible(),'the search does not offer the hidden page');
   await p.locator('.wk-q').fill('');
   await p.locator('.wk-crumbs li button').first().click();await p.waitForTimeout(200);
   await cards(p).nth(1).click();await p.waitForTimeout(250);
   await p.locator('.wk-content a.alink').click();await p.waitForTimeout(300);
   ok((await h2(p)).trim()==='Hidden one'&&(await crumbs()).map(t=>t.trim()).join('|')==='Hid|Alpha|Hidden one','a link to the hidden page opens it, with its real breadcrumbs ('+(await crumbs()).join('|')+')');
   ok(await cards(p).count()===1&&/Child/.test(await cards(p).first().innerText()),'and its own child as a card');
   ok(/Zed/.test(await p.locator('.wk-chips').innerText()),'and the page that links to it under "Mentioned on"');
   await p.locator('.cd-next').click();await p.waitForTimeout(200);
   ok((await h2(p)).trim()==='Child','"Next" from the hidden page goes on to the next shown page');
   await p.context().close();}

  /* ---- the window crosses the narrow width: the screen is drawn again for the new width ---- */
  {const PG='> [!activity|ID PAR] Title\n\n## First page\n\nAlpha.\n\n***\n\n## Second page\n\nBeta.\n\n***\n\n## Third page\n\nGamma.\n\n';
   const RS='---\nbooklet: "0.13"\ntitle: RS\nlang: en\n---\n\n> [!module|rs] RS\n\n> [!activity|one] One\n\nTop.\n\n'+PG.replace('ID PAR','multi parent:one').replace('Title','Multi')+'> [!module|rs end] End\n';
   p=await openBook(RS,600);
   await cards(p).first().click();await p.waitForTimeout(250);await cards(p).first().click();await p.waitForTimeout(300);
   ok(await p.locator('.wk-fold').evaluate(d=>!d.open)&&await p.locator('.wk-pagelist .wk-pitem').count()===3,'600 px: the menu is closed and the three pages are listed in the page');
   await p.setViewportSize({width:1100,height:900});await p.waitForTimeout(400);
   ok(await p.locator('.wk-tree').isVisible()&&await p.locator('.wk-q').isVisible()&&await p.locator('.wk-fold').evaluate(d=>d.open),'widened to 1100 px: the menu shows its tree and search box at once (no empty outlined box)');
   ok(await p.locator('.wk-pagelist').count()===0&&await p.locator('.wk-menu .wk-pitem').count()===3,'and the pages are in the menu, not the page');
   await p.locator('.wk-q').fill('multi');await p.waitForTimeout(150);
   await p.locator('.wk-q').focus();
   await p.setViewportSize({width:600,height:900});await p.waitForTimeout(400);
   ok(await p.locator('.wk-fold').evaluate(d=>!d.open)&&await p.locator('.wk-pagelist .wk-pitem').count()===3,'narrowed back to 600 px: the menu is closed again and the in-page list is back');
   await p.locator('.wk-fold > summary').click();await p.waitForTimeout(150);
   ok(await p.locator('.wk-q').inputValue()==='multi','the words in the search box survive the redraw (the box itself is inside the closed menu, so it cannot keep the focus)');
   ok((await h2(p)).trim()==='Multi','and the reader is still on the same page');
   await p.context().close();}

  /* ---- a hidden parent: alone, it does not make a wiki ---- */
  {const HP='---\nbooklet: "0.13"\ntitle: HP\nlang: en\n---\n\n> [!module|hp] HP\n\n> [!activity|a] A\n\nx\n\n> [!activity|b] B\n\ny\n\n> [!activity|h parent:a hidden] H\n\nz\n\n> [!module|hp end] End\n';
   p=await openBook(HP,1280);
   ok(await p.locator('.wk-frame').count()===0&&await p.locator('#main button.mode').count()===2,'a parent: that only reaches a hidden page makes no wiki: two flat cards, no menu');
   await p.locator('#main button.mode').first().click();await p.waitForTimeout(250);
   ok(await p.locator('.wk-crumbs,.wk-menu').count()===0,'and its pages have no breadcrumbs or menu');
   await p.context().close();}

  /* ---- an activity of three pages in a wiki: listed in the menu, or in the page where the menu is not on screen ---- */
  {const PG='> [!activity|ID PAR] Title\n\n## First page\n\nAlpha content.\n\n***\n\n## Second page\n\nBeta content.\n\n***\n\n## Third page\n\nGamma content.\n\n';
   const MP='---\nbooklet: "0.13"\ntitle: MP\nlang: en\n---\n\n> [!module|mp] MP\n\n> [!activity|one] One\n\nTop.\n\n'+PG.replace('ID PAR','multi parent:one').replace('Title','Multi')+PG.replace('ID PAR','hid parent:one hidden').replace('Title','Hid')+'> [!activity|link] Link\n\nSee [[#Hid]].\n\n> [!module|mp end] End\n';
   const down=async q=>{await cards(q).first().click();await q.waitForTimeout(250);};
   /* 1280: in the menu, not in the page */
   p=await openBook(MP,1280);await down(p);await cards(p).first().click();await p.waitForTimeout(300);
   ok((await h2(p)).trim()==='Multi'&&await p.locator('.wk-menu .wk-pages .wk-pitem').count()===3&&await p.locator('.wk-pagelist').count()===0,'1280 px: a three-page activity lists its pages in the menu, under its entry, and not in the page');
   ok(await p.locator('.wk-menu [aria-current="page"]').count()===1&&await p.locator('.wk-menu [aria-current="step"]').innerText()==='First page','the activity\'s entry is the current page and the sub-page is the current step');
   await p.locator('.wk-menu .wk-pitem').nth(1).click();await p.waitForTimeout(250);
   ok(/Beta content/.test(await p.locator('#main').innerText())&&/^BUTTON\|step\|Second page/.test(await focused(p)),'choosing one shows it and focuses its entry in the menu ('+await focused(p)+')');
   await p.keyboard.press('ArrowDown');
   ok(/Third page/.test(await focused(p)),'the arrow keys move through the list, as in the rail ('+await focused(p)+')');
   await p.context().close();
   /* 390: in the page */
   p=await openBook(MP,390);await down(p);await cards(p).first().click();await p.waitForTimeout(300);
   ok(await p.locator('.wk-fold').evaluate(d=>!d.open)&&await p.locator('.wk-content .wk-pagelist .wk-pitem').count()===3,'390 px: with the menu closed the three pages are listed in the page itself');
   await p.locator('.wk-pagelist .wk-pitem').nth(1).click();await p.waitForTimeout(250);
   ok(/Beta content/.test(await p.locator('#main').innerText())&&/^BUTTON\|step\|Second page/.test(await focused(p))&&await p.locator('.wk-pagelist [aria-current="step"]').count()===1,'choosing one shows it and focuses its entry in that list ('+await focused(p)+')');
   await p.keyboard.press('ArrowDown');
   ok(/Third page/.test(await focused(p)),'the arrow keys move through it');
   await p.screenshot({path:path.join(OUT,'wiki-pagelist-390.png')});
   await p.context().close();
   /* hidden, reached by a link, at 1280 */
   p=await openBook(MP,1280);await p.locator('.wk-q').fill('link');await p.locator('.wk-results .wk-link').first().click();await p.waitForTimeout(250);
   await p.locator('.wk-q').fill('');await p.locator('.wk-content a.alink').click();await p.waitForTimeout(300);
   ok((await h2(p)).trim()==='Hid'&&await p.locator('.wk-menu [data-id$="hid"]').count()===0&&await p.locator('.wk-content .wk-pagelist .wk-pitem').count()===3,'a hidden three-page activity reached by a link has no menu entry, so its pages are listed in the page');
   await p.locator('.wk-pagelist .wk-pitem').nth(2).click();await p.waitForTimeout(250);
   ok(/Gamma content/.test(await p.locator('#main').innerText())&&/^BUTTON\|step\|Third page/.test(await focused(p)),'and choosing one works there');
   await p.context().close();}

  /* ---- a page with sections: they are listed in the wiki's menu, and no second rail is drawn ---- */
  {const chunks=WIKI.split(/^> \[!activity\|/m).slice(1).map((c,i)=>({page:pages[i],n:(c.match(/^#{2,6} /gm)||[]).length}));
   const sec=chunks.sort((x,y)=>y.n-x.n)[0];
   p=await openBook(WIKI,1280);
   await p.locator('.wk-q').fill(sec.page.title);await p.waitForTimeout(150);
   await p.locator('.wk-results .wk-link',{hasText:sec.page.title}).first().click();await p.waitForTimeout(400);
   await p.locator('.wk-q').fill('');await p.waitForTimeout(150);
   const n=await p.locator('.wk-menu .ap-sec').count();
   ok(sec.n>=3&&n>=2,'a page with sections lists them in the wiki menu, under its own entry ('+n+' of its '+sec.n+' headings)');
   ok(await p.locator('.ap-menu, .ap-frame').count()===0,'and no separate sections rail is drawn beside it');
   ok((await heights(p,'.wk-menu .ap-sec')).every(h=>h>=44),'the section entries are at least 44 px tall ('+(await heights(p,'.wk-menu .ap-sec')).slice(0,4)+')');
   const entry=p.locator('.wk-menu .ap-sec').nth(1);await entry.click();await p.waitForTimeout(300);
   ok(await p.locator('.wk-menu .ap-dot.on').count()>=1,'pressing a section goes to it, as the rail did (its dot fills)');
   await p.screenshot({path:path.join(OUT,'wiki-sections.png')});
   await p.context().close();
   /* a flat module keeps its rail */
   const FLATSEC=FLAT.replace('One.\n','## Part one\n\nOne.\n\n## Part two\n\nTwo words.\n');
   p=await openBook(FLATSEC,1280);
   await p.locator('#main button.mode').first().click();await p.waitForTimeout(300);
   ok(await p.locator('.ap-menu .ap-sec').count()>=2&&await p.locator('.wk-menu').count()===0,'a flat module\'s page keeps the sections rail exactly as it was');
   await p.context().close();}

  /* ---- a long row of children: the first 24 cards, the rest on a press ---- */
  {const wide='---\nbooklet: "0.13"\ntitle: Wide\nlang: en\n---\n\n> [!module|w] Wide\n\n> [!activity|top] Top\n\nTop page.\n\n'+
    Array.from({length:60},(_,i)=>'> [!activity|k'+i+' parent:top] Kid '+(i+1)+'\n\nBody '+(i+1)+'.\n\n').join('')+'> [!module|w end] End\n';
   p=await openBook(wide,1280);
   await cards(p).first().click();await p.waitForTimeout(300);
   ok(await cards(p).count()===24&&/^Show 24 more$/.test((await p.locator('.wk-morerow').innerText()).trim()),'sixty children: the first 24 are cards and the button says what a press draws, "Show 24 more"');
   await p.locator('.wk-morerow button').click();await p.waitForTimeout(200);
   ok(await cards(p).count()===48&&/^Show 12 more$/.test((await p.locator('.wk-morerow').innerText()).trim()),'a press draws 24 more, and the button now says "Show 12 more"');
   await p.locator('.wk-morerow button').click();await p.waitForTimeout(200);
   ok(await cards(p).count()===60&&await p.locator('.wk-morerow button').count()===0,'and the last press draws the rest and the button goes');
   await p.context().close();}

  /* ---- a link to a module: a chip, and nothing asked until it is pressed ---- */
  p=await openBook(CHIP,1280);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  const asked=()=>p.reqs.filter(u=>!/^https:\/\/bookletmd\.test\//.test(u)&&!/^data:|^blob:/.test(u));
  ok(await p.locator('.mchip').count()===2,'links to modules not held are chips: one in the prose, one in a row\'s link role ('+await p.locator('.mchip').count()+')');
  ok(/Week 2[\s\S]*not in this booklet/.test((await p.locator('.mchip').allInnerTexts()).join('|'))&&/Third week[\s\S]*not in this booklet/.test((await p.locator('.mchip').allInnerTexts()).join('|')),'a chip names the module and says it is not in this booklet');
  ok(await p.locator('#main a.alink', {hasText:'Week 1'}).count()===1,'a module the booklet holds is a link');
  ok(asked().length===0,'drawing the page, chips and all, asked the network for nothing ('+asked().length+' requests outside the page)');
  ok((await heights(p,'.mchip')).every(h=>h>=44),'chips are at least 44 px tall ('+(await heights(p,'.mchip'))+')');
  const a1=await addr(p);
  await p.locator('#main a.alink',{hasText:'Week 1'}).click();await p.waitForTimeout(300);
  ok((await p.locator('#main h2').first().innerText()).trim()==='Week 1','a link to a held module opens it');
  await p.locator('#btnHome').click();await p.waitForTimeout(300);
  await p.locator('#main button.mode').filter({hasText:'Programme'}).first().click();await p.waitForTimeout(300);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  const chip=p.locator('.mchip',{hasText:'Week 2'}).first();
  ok(asked().length===0,'still nothing asked');
  p.regFail=true;
  await chip.click();await p.waitForTimeout(800);
  ok(asked().length===1&&/The module list could not be loaded/.test(await p.locator('.mc-ask').innerText())&&await p.locator('.mc-add').count()===0,'a registry that cannot be read is said so in Add a module\'s own words, with no offer');
  p.regFail=false;
  await chip.click();await p.waitForTimeout(800);
  ok(asked().length===2&&/registry\.json$/.test(asked()[1])&&await p.locator('.mc-add').count()===1,'pressing it again asks again (the registry list, once more), and now offers "Add it"');
  await p.locator('.mc-add').click();await p.waitForTimeout(900);
  ok(asked().length===3&&/week-2\.md$/.test(asked()[2]),'"Add it" reads that module\'s file, and nothing else');
  ok(/It says booklet: 0\.11, so it was read as format 0\.12/.test(await p.locator('#toast').innerText()),'a module marked "0.11" added from a chip shows the older-version notice, as Add a module does ('+(await p.locator('#toast').innerText()).slice(0,100)+')');
  await p.locator('#btnHome').click().catch(()=>{});await p.waitForTimeout(300);
  ok(await p.locator('#main button.mode').filter({hasText:'Week 2'}).count()===1,'the module is now in the booklet');
  await p.locator('#main button.mode').filter({hasText:'Programme'}).first().click();await p.waitForTimeout(300);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  ok(await p.locator('#main a.alink',{hasText:'Week 2'}).count()===1&&await p.locator('.mchip',{hasText:'Week 2'}).count()===0,'and its link is now a link, not a chip');
  ok(await addr(p)===a1,'pressing a chip, adding a module and following a held-module link left history.length and location.href as they were');
  await p.context().close();

  /* ---- "Add it" while the reader moves to another booklet: it is not added to that one ---- */
  p=await openBook(CHIP,1280);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  await p.locator('#main button.mode').first().click();await p.waitForTimeout(400);
  p.fileDelay=2500;
  await p.locator('.mchip',{hasText:'Week 2'}).first().click();await p.waitForTimeout(800);
  await p.locator('.mc-add').click();await p.waitForTimeout(300);
  await p.locator('#btnHome').click();await p.waitForTimeout(250);
  await p.locator('#btnHome').click();await p.waitForTimeout(300);
  await p.getByRole('button',{name:'Start a new booklet'}).click();await p.waitForTimeout(500);
  await p.waitForTimeout(3200);
  ok(!/Week 2/.test(await p.locator('#main').innerText())&&!(await p.evaluate(()=>Object.values(localStorage).join('\n').includes('Week two reading'))),'a module still coming when the reader starts another booklet is not added to it, and nothing is saved for it');
  await p.context().close();

  ok(cons.length===0,'no Content Security Policy violation'+(cons.length?': '+cons[0]:''));
  ok(errs.length===0,'no page errors'+(errs.length?': '+errs[0]:''));
  await b.close();
  if(fails.length){console.log('\n'+fails.length+' FAILED');process.exit(1);}
  console.log('\nALL PASSED');})().catch(e=>{console.error(e);process.exit(1);});
