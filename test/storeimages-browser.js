// Browser check for images read from the host's declared store (v0.15, item v015-store-images). A copy of the renderer that
// declares a store (`booklet-store`) is served under the hosted /app/ Content-Security-Policy with the store's origin added to
// connect-src; the store is a routed fake (page.route) that serves an SVG, a PNG, a 404, a file that is not the SVG its name
// says, one that is too large, and a nested folder's own images. Checks:
//   - a booklet opened by link draws its SVG and PNG (and a decorative image with alt="") as <img> from blob: URLs, and draws the
//     quiet box, with a reason, for the 404, the wrong type, the one too large and every refused path;
//   - nothing is requested for a refused path or a remote, protocol-relative or data: address; an SVG's own script and its
//     remote <image> are not run or fetched; the address read is the booklet's folder in the store plus the path (also for a
//     booklet in a sub-folder); every request is a GET with no body and no query string;
//   - one blob per address however many times the page is drawn again; the blobs are released when the booklet closes;
//   - an image is scaled to the column on a phone and prints;
//   - the booklet opened again from its "Your booklets" entry draws its images; one opened by the host hook with a store name too;
//   - a booklet loaded from a file, on a page that has a store, and any booklet on a page with no store, make no image request;
//   - a module added to a store booklet afterwards (from the registry) is not the store's: its images are boxes, and nothing is asked
//     for them, on the visit and on later ones from the kept copy; a registry booklet opened by link makes no image request;
//   - an image that passes the byte check but cannot be drawn (an SVG with no xmlns, a truncated PNG) is the box with a reason, not a
//     broken icon; an SVG with a DOCTYPE is drawn; an image redirect is refused; a path over 200 characters is refused;
//   - "Read the newer file" reads images again (a changed one, and one that was missing before), and a module the newer file adds is the store's;
//   - Booklet.open with a name on a page with no store asks for nothing;
//   - tabs and pages (0.15) are presentation: a module tab's prose, an activity's opening (drawn on every tab), a tab's own prose
//     and a later page draw the store's images by the same rule;
//   - the default folder (0.15, item v015-host-modules-and-checksum): on a page with no store tag, a booklet opened by link from
//     `modules/` beside the renderer draws the images beside it there; a module updated in place afterwards (from the registry,
//     under the folder's module id) is the box and asks for nothing; the entry kept from that folder, opened from "Your
//     booklets" on a renderer at another path of the same site (another default folder), draws none and asks neither folder
//     for anything; that page's own folder still draws its own copy's images (control).
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/storeimages-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const HTML=path.resolve(process.argv[2]),OUT=process.argv[3]||'.';
const CSP=require('./csp.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PAGE='https://bookletmd.test',STORE=PAGE,REG='https://raw.githubusercontent.com';
const HOST_CSP=CSP.replace('connect-src https://raw.githubusercontent.com','connect-src https://raw.githubusercontent.com '+STORE);
if(HOST_CSP===CSP) throw new Error('csp.js no longer has the expected connect-src: update this test');
const page=(withStore)=>fs.readFileSync(HTML,'utf8').replace('<meta name="theme-color"',(withStore?'<meta name="booklet-store" content="'+STORE+'/pub/">\n':'')+'<meta name="theme-color"');
/* a real PNG of w x h in one colour (the signature, IHDR, one IDAT, IEND; CRCs computed) */
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
const crc=b=>{let c=0xFFFFFFFF;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
const png=(w,h)=>{const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;
  const row=Buffer.concat([Buffer.from([0]),Buffer.alloc(w*3,0x90)]);
  return Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(Buffer.concat(Array(h).fill(row)))),chunk('IEND',Buffer.alloc(0))]);};
const SVG_A='<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><script>window.__svgran=1</script><image href="https://tracker.example/svg-ext.png" width="10" height="10"/><rect width="200" height="100" fill="#12996E"/></svg>';
const SVG_NESTED='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60"><rect width="120" height="60" fill="#A04E34"/></svg>';
const svgDoctype='<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="#103E46"/></svg>';
const FILES={
  '/pub/images/a.svg':{type:'image/svg+xml',body:SVG_A},
  '/pub/images/b.png':{type:'image/png',body:png(1600,20)},
  '/pub/images/deco.png':{type:'image/png',body:png(16,16)},
  '/pub/images/fake.svg':{type:'image/svg+xml',body:'<html><body>not an svg</body></html>'},
  '/pub/images/big.png':{type:'image/png',body:Buffer.concat([png(2,2),Buffer.alloc(5*1024*1024+100)])},
  '/pub/sub/images/a.svg':{type:'image/svg+xml',body:SVG_NESTED},
  '/pub/images/doctype.svg':{type:'image/svg+xml',body:svgDoctype},
  '/pub/images/noxmlns.svg':{type:'image/svg+xml',body:'<svg width="10" height="10"><rect width="10" height="10"/></svg>'},
  '/pub/images/trunc.png':{type:'image/png',body:png(50,50).subarray(0,40)}};
const REFUSED=[['dots','../secret.png'],['dots2','images/../a.png'],['abs','/images/a.png'],['proto','//tracker.example/p.png'],['remote','https://tracker.example/r.png'],
  ['data','data:image/png;base64,AAAA'],['pct','images/a%2Eb.png'],['query','images/q.png?x=1'],['hash','images/h.png#f'],['back','images\\a.png'],
  ['ext','images/note.txt'],['dot','./images/a.png'],['hidden','images/.hid/a.png'],['colon','images/a:b.png']];
const bk=(id,title,body)=>`---\nbooklet: "0.15"\ntitle: ${title}\nlang: en\n---\n\n> [!module|${id}] ${title}\n\n${body}\n> [!module|${id} end] End\n`;
const PICS=bk('pics','Pictures',['> [!activity|look] Look','','![Harbour svg](images/a.svg)','','![Chart png][chart]','','![](images/deco.png)','','![Gone](images/missing.png)','',
  '![Fake svg](images/fake.svg)','','![Big png](images/big.png)','',...REFUSED.flatMap(([a,u])=>['!['+a+' refused]('+u+')','']),'[chart]: images/b.png',''].join('\n'));
const NESTED=bk('nest','Nested',['> [!activity|n] Nested','','![Nested svg](images/a.svg)',''].join('\n'));
const OTHER=bk('other','Other','> [!activity|o] Other\n\nNo pictures here.\n');
let VERSION=1;   /* the store's news booklet, and its images, change when this does */
const LONG='images/'+'a'.repeat(200)+'.png';
const MIX=bk('mix','Mixed',['> [!activity|m] Mixed','','![Doctype svg](images/doctype.svg)','','![No xmlns](images/noxmlns.svg)','','![Truncated png](images/trunc.png)','',
  '![Redirected](images/redir.png)','','![Long path]('+LONG+')',''].join('\n'));
const REGPIC=bk('regpic','Registry pictures',['> [!activity|r] Registry','','![Reg svg](images/a.svg)','','![Reg only](images/reg-only.png)',''].join('\n'));
const SHARED='---\nbooklet: "0.15"\ntitle: Shared\nlang: en\n---\n\n'+
  ['> [!module|journal] Journal','','> [!activity|j] Journal','','![Store pic](images/a.svg)','','> [!module|journal end] End','',
   '> [!module|other] Other','','> [!activity|o] Other','','Nothing to see.','','> [!text|oq] Say ![Prompt pic](images/prompt.png) here',"",'> [!module|other end] End',''].join('\n');
/* a module file under the id the store's booklet already uses: adding it updates that module in place */
const JNEW=(title,img)=>bk('journal',title,['> [!activity|j] Journal','','!['+title+' pic](images/'+img+')',''].join('\n'));
const JFILES={'/jupda.md':JNEW('Journal update A','reader-wrote-this.png'),'/jupdb.md':JNEW('Journal update B','from-registry.png'),'/jreadd.md':JNEW('Journal readded','readded.png')};
/* a booklet with prose before its first module (its opening), a module with a question (so a reader can keep work in it), and a store file that can change */
const topBook=img=>'---\nbooklet: "0.15"\ntitle: Top\nlang: en\n---\n\nWelcome ![Opening pic](images/'+img+')\n\n'+
  ['> [!module|tm] Top module','','> [!activity|ta] Top','','> [!text|tq] A note','','> [!module|tm end] End',''].join('\n');
let TOPV=1;
/* a module with a data section: the fence is the same everywhere, so only the data section tells the store's text from a replacement's */
const DMOD=n=>'> [!module|dm] D module\n\n> [!activity|d] D\n\n![D pic](images/a.svg)\n\n> [!module|dm end] End\n\n> [!data|dm] Data for D module\n\n```booklet data\n[{"x": '+n+'}]\n```\n^rows\n';
const DHEAD='---\nbooklet: "0.15"\ntitle: Data booklet\nlang: en\n---\n\n';
const JFILES_D={'/dsame.md':DHEAD+DMOD(1),'/ddiff.md':DHEAD+DMOD(2)};
/* the default folder (0.15): a booklet in modules/sub/ beside a renderer at /fold/ (and the same file beside one at /fold2/),
   two modules, each with an image beside it; and a module file under the first module's id, whose image would draw if asked */
const FOLDBOOK='---\nbooklet: "0.15"\ntitle: Folded\nlang: en\n---\n\n'+
  ['> [!module|fm] Fold main','','> [!activity|fa] Fold main','','![Fold svg](images/a.svg)','','> [!module|fm end] End','',
   '> [!module|fk] Fold kept','','> [!activity|fka] Fold kept','','![Kept png](images/c.png)','','> [!module|fk end] End',''].join('\n');
JFILES['/foldupd.md']=bk('fm','Fold update',['> [!activity|fa] Fold main','','![Fold update pic](images/b.svg)',''].join('\n'));
const FOLDFILES={};
for(const d of ['/fold/','/fold2/']){FOLDFILES[d+'modules/sub/images/a.svg']={type:'image/svg+xml',body:SVG_NESTED};
  FOLDFILES[d+'modules/sub/images/b.svg']={type:'image/svg+xml',body:SVG_NESTED};FOLDFILES[d+'modules/sub/images/c.png']={type:'image/png',body:png(30,30)};}
const REGJ={modules:[{id:'t/dsame',title:'D module',file:'dsame.md'},{id:'t/ddiff',title:'D module',file:'ddiff.md'},{id:'t/regpic',title:'Registry pictures',file:'regpic.md'},{id:'t/ja',title:'Journal update A',file:'jupda.md'},{id:'t/jb',title:'Journal update B',file:'jupdb.md'},{id:'t/jc',title:'Journal readded',file:'jreadd.md'},{id:'t/fupd',title:'Fold update',file:'foldupd.md'}]};
const newsBook=v=>bk('news','News',['> [!activity|n] News','','> [!text|nq] A note','','![Changed](images/chg.png)','','![Late](images/late.png)',''].join('\n'))+
  (v>=2?'\n'+bk('extra','Extra',['> [!activity|x] Extra','','![Extra svg](images/extra.svg)',''].join('\n')).replace(/^---[\s\S]*?---\n\n/,''):'');
const dyn=u=>{
  if(u==='/pub/top.booklet.md')return {type:'text/markdown; charset=utf-8',body:topBook('top'+TOPV+'.svg')};
  if(u==='/pub2/top.booklet.md')return {type:'text/markdown; charset=utf-8',body:topBook('two.svg')};
  if(/^\/pub2?\/images\/(top[12]|two)\.svg$/.test(u))return {type:'image/svg+xml',body:SVG_NESTED};
  if(u==='/pub/news.booklet.md')return {type:'text/markdown; charset=utf-8',body:newsBook(VERSION)};
  if(u==='/pub/images/chg.png')return {type:'image/png',body:png(40*VERSION,10)};
  if(u==='/pub/images/late.png')return VERSION<3?null:{type:'image/png',body:png(20,20)};
  if(u==='/pub/images/extra.svg')return {type:'image/svg+xml',body:SVG_NESTED};
  return undefined;};
/* a module with tabs, an activity with an opening and two tabs, and one of two pages (0.15) */
const TABPICS=bk('tp','Tabbed pictures',['> [!tab] Look','','![Module tab pic](images/a.svg)','','> [!tab|more] More','',
  '> [!activity|tt] Tabbed','','![Opening pic](images/deco.png)','','> [!tab] First','','![First tab pic](images/b.png)','','> [!tab] Second','','Words only.','',
  '> [!activity|pg tab:more] Paged','','Page one words.','','***','','![Page two pic](images/doctype.svg)',''].join('\n'));
const BOOKS={'/pub/tabbed.booklet.md':TABPICS,'/pub/shared.booklet.md':SHARED,'/pub/data.booklet.md':DHEAD+DMOD(1),'/pub/mix.booklet.md':MIX,'/pub/pics.booklet.md':PICS,'/pub/sub/nested.booklet.md':NESTED,'/pub/other.md':OTHER};
const WANT=['/pub/images/a.svg','/pub/images/b.png','/pub/images/deco.png','/pub/images/missing.png','/pub/images/fake.svg','/pub/images/big.png'];
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const reqs=[],errs=[],viol=[];
  const cors={'access-control-allow-origin':'*'};
  const setup=async ctx=>{
  await ctx.route(PAGE+'/**',r=>{const u=new URL(r.request().url()).pathname;
    if(u==='/app/')return r.fulfill({status:200,body:page(true),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
    if(u==='/app2/')return r.fulfill({status:200,body:page(true).replace(STORE+'/pub/',STORE+'/pub2/'),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
    if(u==='/plain/')return r.fulfill({status:200,body:page(false),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
    /* 0.15: the renderer as released (no store tag) at two paths, each with its own default folder */
    if(u==='/fold/'||u==='/fold2/')return r.fulfill({status:200,body:page(false),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
    if(u==='/fold/modules/sub/fold.booklet.md'||u==='/fold2/modules/sub/fold.booklet.md')return r.fulfill({status:200,body:FOLDBOOK,headers:{'content-type':'text/markdown; charset=utf-8'}});
    if(FOLDFILES[u])return r.fulfill({status:200,body:FOLDFILES[u].body,headers:{'content-type':FOLDFILES[u].type}});
    {const d=dyn(u);if(d===null)return r.fulfill({status:404,body:'nf',headers:cors});if(d)return r.fulfill({status:200,body:d.body,headers:{'content-type':d.type,...cors}});}
    if(u==='/pub/images/redir.png')return r.fulfill({status:302,headers:{location:STORE+'/pub/images/redir-target.png',...cors}});
    if(u==='/pub/images/redir-target.png')return r.fulfill({status:200,body:png(5,5),headers:{'content-type':'image/png',...cors}});
    if(BOOKS[u])return r.fulfill({status:200,body:BOOKS[u],headers:{'content-type':'text/markdown; charset=utf-8',...cors}});
    const f=FILES[u];if(f)return r.fulfill({status:200,body:f.body,headers:{'content-type':f.type,...cors}});
    r.fulfill({status:404,body:'nf',headers:cors});});
  await ctx.route(REG+'/**',r=>{const u=new URL(r.request().url()).pathname;
    if(/registry\.json$/.test(u))return r.fulfill({status:200,body:JSON.stringify(REGJ),headers:{'content-type':'application/json',...cors}});
    if(JFILES_D['/'+u.split('/').pop()])return r.fulfill({status:200,body:JFILES_D['/'+u.split('/').pop()],headers:{'content-type':'text/plain',...cors}});
    if(JFILES['/'+u.split('/').pop()])return r.fulfill({status:200,body:JFILES['/'+u.split('/').pop()],headers:{'content-type':'text/plain',...cors}});
    if(/regpic\.md$/.test(u))return r.fulfill({status:200,body:REGPIC,headers:{'content-type':'text/plain',...cors}});
    r.fulfill({status:404,body:'nf',headers:cors});});
  /* anything else on the network is a failure of the page, answered with an abort so the test sees it asked */
  await ctx.route(u=>!u.href.startsWith(PAGE)&&!u.href.startsWith(REG)&&/^https?:/.test(u.href),r=>r.abort());};
  const ctx=await b.newContext({viewport:{width:1280,height:900}});await setup(ctx);
  const open=async(c)=>{const p=await (c||ctx).newPage();
    p.on('request',r=>reqs.push({url:r.url(),method:r.method(),body:r.postData()||''}));
    p.on('pageerror',e=>errs.push(e.message));
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))viol.push(m.text());});
    await p.addInitScript(()=>{window.__made=[];window.__revoked=[];const c=URL.createObjectURL.bind(URL),v=URL.revokeObjectURL.bind(URL);
      URL.createObjectURL=o=>{const u=c(o);window.__made.push({url:u,type:o&&o.type});return u;};URL.revokeObjectURL=u=>{window.__revoked.push(u);return v(u);};});
    return p;};
  const wait=(p,ms)=>p.waitForTimeout(ms||700);
  const net=()=>reqs.filter(r=>/^https?:/.test(r.url));
  const imgReqs=()=>net().filter(r=>/\/images\/|secret|tracker|\.png|\.svg/.test(r.url)&&!r.url.endsWith('.md'));
  const mark=()=>net().length;
  const since=n=>net().slice(n);
  /* up to the booklet's home, then into the module card whose title matches */
  const goMod=async(p,re)=>{const c=()=>p.locator('#main button.mode').filter({hasText:re});
    for(let i=0;i<3&&!(await c().count());i++){await p.locator('#btnHome').click();await wait(p,400);}
    await c().first().click();await wait(p,1500);};
  const state=p=>p.evaluate(()=>({imgs:[...document.querySelectorAll('#main img')].map(i=>({alt:i.getAttribute('alt'),src:i.getAttribute('src'),cls:i.className,w:i.width,nw:i.naturalWidth,nh:i.naturalHeight,ok:i.complete&&i.naturalWidth>0})),
    boxes:[...document.querySelectorAll('#main .imgbox')].map(x=>x.innerText.replace(/\s+/g,' ')),col:document.getElementById('main').getBoundingClientRect().width,
    made:window.__made,revoked:window.__revoked,svgran:window.__svgran===1,view:document.body.dataset.view}));

  // 1 a booklet opened by link draws its images
  let p=await open();
  await p.goto(PAGE+'/app/#/open/pics.booklet.md');await wait(p,2500);
  let s=await state(p);
  ok(s.view==='pics/look','the booklet opened into its activity: '+s.view);
  ok(s.imgs.length===3&&s.imgs.every(i=>i.cls==='mdimg'&&/^blob:/.test(i.src)&&i.ok),'three images are drawn, each an img from a blob: URL, each decoded: '+JSON.stringify(s.imgs.map(i=>[i.alt,i.nw+'x'+i.nh,(i.src||'').slice(0,5)])));
  ok(s.imgs.map(i=>i.alt).join('|')==='Harbour svg|Chart png|','alt text is kept, and an empty alt text is an alt="" attribute (decorative): '+JSON.stringify(s.imgs.map(i=>i.alt)));
  ok(s.imgs[0].nw===200&&s.imgs[0].nh===100,'the SVG is drawn as an image at its own size ('+s.imgs[0].nw+'x'+s.imgs[0].nh+')');
  ok(s.imgs[1].nw===1600&&s.imgs[1].w<=s.col&&s.imgs[1].w>200,'a wide PNG is scaled down to the column ('+s.imgs[1].w+' of '+s.col+')');
  ok(s.made.length===3&&s.made.map(m=>m.type).sort().join()==='image/png,image/png,image/svg+xml','one blob for each of the three addresses, with the right type: '+JSON.stringify(s.made.map(m=>m.type)));
  ok(!s.svgran,'the SVG drawn as an image runs no script');
  const refusedWords=s.boxes.filter(x=>/does not read that address/.test(x));
  ok(refusedWords.length===REFUSED.length,'every refused path is drawn as the quiet box with its reason ('+refusedWords.length+' of '+REFUSED.length+')');
  ok(REFUSED.every(([a,u])=>s.boxes.some(x=>x.includes(a+' refused')&&x.includes(u.length>160?u.slice(0,160):u))),'...with its alt text and its address as text');
  ok(s.boxes.some(x=>x.includes('Gone')&&/not found/.test(x)),'a 404 is the box with "the file was not found": '+(s.boxes.find(x=>x.includes('Gone'))||''));
  ok(s.boxes.some(x=>x.includes('Fake svg')&&/not the kind of image its name says/.test(x)),'bytes that are not an SVG are the box with the wrong-type reason');
  ok(s.boxes.some(x=>x.includes('Big png')&&/too big/.test(x)),'a file over the limit is the box with the too-big reason');
  ok(s.boxes.length===3+REFUSED.length,'nothing else is a box ('+s.boxes.length+')');
  const got=imgReqs().map(r=>new URL(r.url).pathname).sort();
  ok(JSON.stringify(got)===JSON.stringify([...WANT].sort()),'exactly the six checked addresses were asked for, once each, in the booklet\'s folder of the store: '+got.join(' '));
  ok(!net().some(r=>/tracker\.example|secret|%|\?|#|\\/.test(r.url)),'no request for a refused path, a remote address or an address the SVG names: '+net().map(r=>r.url).filter(u=>/tracker|secret|%|\?/.test(u)).join(' '));
  ok(net().every(r=>r.method==='GET'&&r.body===''&&!new URL(r.url).search),'every request is a GET with no body and no query string');
  await p.screenshot({path:path.join(OUT,'storeimages-1280.png'),fullPage:true});

  // 2 drawn again: no new request and no new blob; a phone width scales the images; print
  let n0=mark();
  /* a real redraw: the language switch draws the whole page again, and each image is asked for from the page's own record */
  await p.locator('button[data-lang=es]').click();await wait(p,1200);
  s=await state(p);
  ok(s.boxes.length===3+REFUSED.length&&s.boxes.some(x=>x.includes('Gone')&&/Imagen no mostrada: no se encontró el archivo/.test(x))&&s.boxes.some(x=>x.includes('Big png')&&/demasiado grande/.test(x))&&s.boxes.some(x=>/esta página no lee esa dirección/.test(x)),'drawn again in Spanish: the reasons are in Spanish');
  await p.locator('button[data-lang=fr]').click();await wait(p,1200);
  s=await state(p);
  ok(s.boxes.some(x=>x.includes('Gone')&&/Image non affichée : fichier introuvable/.test(x))&&s.boxes.some(x=>/cette page ne lit pas cette adresse/.test(x))&&s.boxes.some(x=>/n’est pas du type d’image/.test(x)),'drawn again in French: the reasons are in French');
  await p.locator('button[data-lang=en]').click();await wait(p,1200);
  s=await state(p);
  ok(s.imgs.length===3&&s.imgs.every(i=>i.ok)&&s.boxes.some(x=>/the file was not found/.test(x)),'drawn again in English: the three images are still there');
  await p.setViewportSize({width:390,height:800});await wait(p,1200);
  s=await state(p);
  ok(since(n0).length===0,'drawn again three times (language switches) and at phone width: no request ('+since(n0).map(r=>r.url).join()+')');
  ok(s.made.length===3&&s.imgs.length===3&&s.imgs.every(i=>i.ok&&i.w<=s.col+1),'...still three blobs, and every image fits the column ('+s.imgs.map(i=>i.w).join()+' of '+s.col+')');
  ok(await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=0,'no sideways overflow at 390px');
  await p.screenshot({path:path.join(OUT,'storeimages-390.png'),fullPage:true});
  await p.emulateMedia({media:'print'});
  const pr=await p.evaluate(()=>[...document.querySelectorAll('#main img.mdimg')].map(i=>{const r=i.getBoundingClientRect(),c=getComputedStyle(i);return {shown:c.display!=='none'&&c.visibility!=='hidden'&&r.width>0,brk:c.breakInside};}));
  ok(pr.length===3&&pr.every(x=>x.shown&&x.brk==='avoid'),'in print the images are still drawn and are not split across pages: '+JSON.stringify(pr));
  await p.emulateMedia({media:'screen'});
  await p.setViewportSize({width:1280,height:900});await wait(p,500);

  // 3 closing the booklet releases the blobs; the list entry opens it again with its images
  const made=(await state(p)).made.map(m=>m.url);
  await p.locator('#btnHome').click();await wait(p,300);
  if(await p.evaluate(()=>!!document.body.dataset.view&&document.body.dataset.view!=='')) {await p.locator('#btnHome').click();await wait(p,300);}
  s=await state(p);
  ok(made.length===3&&made.every(u=>s.revoked.includes(u)),'going home released all three blobs ('+s.revoked.length+' revoked)');
  n0=mark();
  await p.getByText('Pictures').first().click();await wait(p,2500);
  s=await state(p);
  ok(s.imgs.length===3&&s.imgs.every(i=>i.ok&&/^blob:/.test(i.src)),'the "Your booklets" entry that came from the store opens the booklet and draws its images again: '+JSON.stringify(s.imgs.map(i=>i.ok)));
  ok(since(n0).filter(r=>/\/images\//.test(r.url)).length===WANT.length,'...by asking for them again (a new visit)');
  // opening another booklet by link releases them too
  const made2=s.made.slice(-3).map(m=>m.url);
  await p.evaluate(()=>{location.hash='#/open/other.md';});await wait(p,1500);
  s=await state(p);
  ok(made2.every(u=>s.revoked.includes(u)),'opening another booklet released the blobs of the first');
  await p.close();

  // 4 a booklet in a sub-folder reads that folder's images
  p=await open();n0=mark();
  await p.goto(PAGE+'/app/#/open/sub/nested.booklet.md');await wait(p,2000);
  s=await state(p);
  ok(since(n0).filter(r=>/\/images\//.test(r.url)).map(r=>r.url).join()===STORE+'/pub/sub/images/a.svg','a booklet in sub/ reads sub/images/a.svg: '+since(n0).map(r=>r.url).join(' '));
  ok(s.imgs.length===1&&s.imgs[0].nw===120,'...and draws it');
  await p.close();

  // 5 the host hook, with the store name, is a store booklet; without a name it is not
  p=await open();await p.goto(PAGE+'/app/');await wait(p,800);n0=mark();
  await p.evaluate(t=>window.Booklet.open(t,{name:'pics.booklet.md'}),PICS);await wait(p,2500);
  s=await state(p);
  ok(s.imgs.length===3&&since(n0).filter(r=>/\/images\//.test(r.url)).length===WANT.length,'Booklet.open(text, { name }) draws the store booklet\'s images');
  await p.close();
  p=await open();await p.goto(PAGE+'/app/');await wait(p,800);n0=mark();
  await p.evaluate(t=>window.Booklet.open(t),PICS);await wait(p,1500);
  s=await state(p);
  ok(s.imgs.length===0&&s.boxes.length===3+REFUSED.length+3&&since(n0).length===0,'Booklet.open(text) with no store name draws boxes only and asks for nothing ('+s.boxes.length+' boxes, '+since(n0).length+' requests)');
  await p.close();

  // 6 a file, on a page that has a store; and a page with no store
  for(const [url,what] of [['/app/','a booklet loaded from a file, on a page that declares a store'],['/plain/','a booklet loaded on a page with no store']]){
    p=await open();await p.goto(PAGE+url);await wait(p,800);n0=mark();
    await p.getByRole('button',{name:'Add a booklet from a file'}).click();await wait(p,300);
    await p.locator('#pasteIn').fill(PICS);
    await p.locator('[role=dialog][open] button').filter({hasText:/^Load$/}).first().click();await wait(p,2000);
    s=await state(p);
    ok(s.view==='pics/look'&&s.imgs.length===0&&s.boxes.length===3+REFUSED.length+3,what+': opened, no img element, every image is the quiet box ('+s.view+', '+s.imgs.length+' img, '+s.boxes.length+' boxes)');
    ok(since(n0).length===0,what+': no request at all ('+since(n0).map(r=>r.url).join()+')');
    ok(s.boxes.some(x=>x.includes('Harbour svg')&&/Image not shown/.test(x)&&x.includes('images/a.svg')),what+': the box says the image is not shown, with the address');
    await p.close();}

  // 7 a module added afterwards is not the store's: the registry's module in a store booklet draws boxes and asks for nothing
  p=await open();await p.goto(PAGE+'/app/#/open/pics.booklet.md');await wait(p,2500);
  await p.locator('#btnHome').click();await wait(p,500);n0=mark();
  await p.getByRole('button',{name:'Add a module'}).first().click();await wait(p,800);
  await p.locator('#addModList .bkrow').filter({hasText:'Registry pictures'}).locator('button').click();await wait(p,1200);
  await goMod(p,/Registry pictures/);
  s=await state(p);
  ok(/^regpic\//.test(s.view||'')||await p.locator('#main').innerText().then(t=>/Reg svg/.test(t)),'the added module is on screen: '+s.view);
  ok(s.imgs.length===0&&s.boxes.some(x=>x.includes('Reg svg')&&/Image not shown/.test(x)&&x.includes('images/a.svg'))&&s.boxes.some(x=>x.includes('Reg only')),'its images are the quiet box, with the address: '+JSON.stringify(s.boxes));
  ok(since(n0).filter(r=>/\/images\//.test(r.url)).length===0,'a module added from the registry to a store booklet asks the store for no image ('+since(n0).filter(r=>/\/images\//.test(r.url)).map(r=>r.url).join()+')');
  // and on a later visit, from the kept copy that now holds that module
  await p.locator('#btnHome').click();await wait(p,300);
  if(await p.evaluate(()=>!!document.body.dataset.view&&document.body.dataset.view!=='')) {await p.locator('#btnHome').click();await wait(p,300);}
  n0=mark();
  await p.getByText('Pictures').first().click();await wait(p,2500);
  await goMod(p,/^\s*\d*\s*Pictures/);
  s=await state(p);
  ok(s.imgs.length===3,'the kept booklet opened again draws the store module\'s three images ('+s.imgs.length+')');
  await goMod(p,/Registry pictures/);
  s=await state(p);
  ok(s.boxes.some(x=>x.includes('Reg only'))&&s.imgs.length===0&&true,'on a later visit the added module still draws boxes: '+s.imgs.length+' img');
  ok(!net().some(r=>/reg-only/.test(r.url)),'nothing was ever asked of the store for the registry module\'s own image path');
  await p.close();

  // 7b a module that updates a store module in place, a module removed and added again, and a later visit: the id is the store's, the text is not
  p=await open();await p.goto(PAGE+'/app/#/open/shared.booklet.md');await wait(p,2500);
  n0=mark();
  await goMod(p,/^\s*\d*\s*Journal/);
  s=await state(p);
  ok(s.imgs.length===1&&s.imgs[0].alt==='Store pic'&&since(n0).filter(r=>/images\/a\.svg/.test(r.url)).length===1,'control: the store\'s own Journal module draws its image, read once from the store: '+JSON.stringify(s.imgs.map(i=>i.alt)));
  await goMod(p,/^\s*\d*\s*Other/);
  s=await state(p);
  ok(s.imgs.length===0&&s.boxes.length===0&&(await p.locator('#main').innerText()).includes('Prompt pic')&&!net().some(r=>/prompt\.png/.test(r.url)),'an image in a question\'s wording shows only its alt text as plain words (no box, no img), and nothing is asked for it');
  const addMod=async title=>{
    for(let i=0;i<3&&!(await p.getByRole('button',{name:'Add a module'}).count());i++){await p.locator('#btnHome').click();await wait(p,400);}
    await p.getByRole('button',{name:'Add a module'}).first().click();await wait(p,800);
    await p.locator('#addModList .bkrow').filter({hasText:title}).locator('button').click();await wait(p,1200);};
  const noReq=(re,what)=>ok(!net().some(r=>re.test(r.url)),what+': nothing was asked of the store for it ('+net().filter(r=>re.test(r.url)).map(r=>r.url).join()+')');
  const boxOf=(re)=>state(p).then(x=>x.imgs.length===0&&x.boxes.some(b=>re.test(b)));
  await addMod('Journal update A');await goMod(p,/Journal update A/);
  ok(await boxOf(/Journal update A pic.*images\/reader-wrote-this\.png/),'a module file under the store\'s module id updates it in place; its image is the box with its address');
  noReq(/reader-wrote-this/,'the file\'s path');
  await addMod('Journal update B');await goMod(p,/Journal update B/);
  ok(await boxOf(/Journal update B pic.*images\/from-registry\.png/),'a registry module under the same id, with no removal, is the box too');
  noReq(/from-registry/,'the registry module\'s path');
  await goMod(p,/Journal update B/);
  await p.locator('.removemod button',{hasText:'Remove this module'}).click();await wait(p,300);
  await p.locator('.removemod [role=alert] button',{hasText:/^Remove$/}).click();await wait(p,800);
  ok(await p.evaluate(()=>[...document.querySelectorAll('#main button.mode')].every(b=>!/Journal/.test(b.innerText))),'the module was removed');
  await addMod('Journal readded');await goMod(p,/Journal readded/);
  ok(await boxOf(/Journal readded pic.*images\/readded\.png/),'removed and then added again under the same id: the box');
  noReq(/readded\.png/,'the re-added module\'s path');
  // a later visit, from the kept copy that holds the changed module
  await p.locator('#btnHome').click();await wait(p,300);
  if(await p.evaluate(()=>!!document.body.dataset.view&&document.body.dataset.view!=='')) {await p.locator('#btnHome').click();await wait(p,300);}
  n0=mark();
  await p.getByText('Shared').first().click();await wait(p,2500);
  await goMod(p,/Journal readded/);
  ok(await boxOf(/Journal readded pic/),'on a later visit the kept copy still draws the box for it');
  ok(since(n0).filter(r=>/\/images\//.test(r.url)).length===0,'...and asks the store for no image ('+since(n0).filter(r=>/\/images\//.test(r.url)).map(r=>r.url).join()+')');
  noReq(/reader-wrote-this|from-registry|readded\.png/,'over the visit, none of the three paths');
  await p.close();

  // 7c the booklet's opening: drawn while it is the store's text; not once the store's file has changed and the kept copy has not read it, and not from another store
  p=await open();n0=mark();
  await p.goto(PAGE+'/app/#/open/top.booklet.md');await wait(p,2500);
  await p.locator('#btnHome').click();await wait(p,500);
  s=await state(p);
  ok(s.imgs.length===1&&s.imgs[0].alt==='Opening pic'&&s.imgs[0].ok&&since(n0).filter(r=>/images\/top1\.svg/.test(r.url)).length===1,'control: the booklet\'s opening draws its image while it is the store\'s text: '+JSON.stringify(s.imgs.map(i=>i.alt))+' '+s.view);
  await goMod(p,/Top module/);
  await p.locator('#main textarea').first().fill('QZXtop');await wait(p,900);
  await p.evaluate(()=>{location.hash='#/open/other.md';});await wait(p,900);
  TOPV=2;n0=mark();
  await p.evaluate(()=>{location.hash='#/open/top.booklet.md';});await wait(p,2500);
  ok(await p.locator('.hostnote button.primary').filter({hasText:'Read the newer file'}).count()===1,'the store\'s file changed since the kept copy read it: the newer file is offered');
  await p.locator('#btnHome').click();await wait(p,500);
  if(!(await p.locator('#main').innerText()).includes('Welcome')){await p.locator('#btnHome').click();await wait(p,500);}
  s=await state(p);
  ok(s.imgs.length===0&&s.boxes.some(x=>x.includes('Opening pic')&&x.includes('images/top1.svg')),'until it is read, the kept opening (the old text) draws the box: '+JSON.stringify(s.boxes));
  ok(since(n0).filter(r=>/images\/top[12]\.svg/.test(r.url)).length===0,'...and asks the store for neither the old path nor the new one ('+since(n0).filter(r=>/images\/top/.test(r.url)).map(r=>r.url).join()+')');
  await p.locator('.hostnote button.primary').filter({hasText:'Read the newer file'}).click();await wait(p,1500);
  await p.locator('#btnHome').click();await wait(p,500);
  if(!(await p.locator('#main').innerText()).includes('Welcome')){await p.locator('#btnHome').click();await wait(p,500);}
  s=await state(p);
  ok(s.imgs.length===1&&s.imgs[0].alt==='Opening pic'&&since(n0).filter(r=>/images\/top2\.svg/.test(r.url)).length===1,'after "Read the newer file" the opening is the store\'s text again and draws its new image: '+JSON.stringify(s.imgs.map(i=>i.alt)));
  await p.close();
  // the same kept copy (made from the store at /pub/) opened on a page whose store is /pub2/ on the same origin
  p=await open();n0=mark();
  await p.goto(PAGE+'/app2/#/open/top.booklet.md');await wait(p,2500);
  await p.locator('#btnHome').click();await wait(p,500);
  if(!(await p.locator('#main').innerText()).includes('Welcome')){await p.locator('#btnHome').click();await wait(p,500);}
  s=await state(p);
  ok(since(n0).filter(r=>/\/pub2\/top\.booklet\.md/.test(r.url)).length===1,'the other store was asked for the booklet\'s name');
  ok(s.imgs.length===0&&s.boxes.some(x=>x.includes('Opening pic')),'a copy kept from the first store, opened on the page whose store is /pub2/, draws the box for its opening: '+JSON.stringify(s.boxes));
  ok(since(n0).filter(r=>/\/images\//.test(r.url)).length===0,'...and nothing is asked of /pub2/ for a path taken from the first store\'s text ('+since(n0).filter(r=>/\/images\//.test(r.url)).map(r=>r.url).join()+')');
  await p.close();
  const other=await b.newContext({viewport:{width:1280,height:900}});await setup(other);
  p=await open(other);n0=mark();
  await p.goto(PAGE+'/app2/#/open/top.booklet.md');await wait(p,2500);
  await p.locator('#btnHome').click();await wait(p,500);
  if(!(await p.locator('#main').innerText()).includes('Welcome')){await p.locator('#btnHome').click();await wait(p,500);}
  s=await state(p);
  ok(s.imgs.length===1&&since(n0).filter(r=>/\/pub2\/images\/two\.svg/.test(r.url)).length===1,'control: a browser with no kept copy opens the same name from /pub2/ and draws that store\'s own image');
  await p.close();

  // 7d a module's data section is part of its text: the same fence with different data is not the store's module
  p=await open();n0=mark();await p.goto(PAGE+'/app/#/open/data.booklet.md');await wait(p,2500);
  await goMod(p,/D module/);
  s=await state(p);
  ok(s.imgs.length===1&&s.imgs[0].alt==='D pic'&&since(n0).filter(r=>/images\/a\.svg/.test(r.url)).length===1,'control: the store\'s module with a data section draws its image');
  const addD=async which=>{for(let i=0;i<3&&!(await p.getByRole('button',{name:'Add a module'}).count());i++){await p.locator('#btnHome').click();await wait(p,400);}
    await p.getByRole('button',{name:'Add a module'}).first().click();await wait(p,800);
    await p.locator('#addModList .bkrow').nth(which).locator('button').click();await wait(p,1200);};
  await addD(1);await goMod(p,/D module/);
  n0=mark();
  await p.locator('#btnHome').click();await wait(p,300);await goMod(p,/D module/);
  s=await state(p);
  ok(s.imgs.length===0&&s.boxes.some(x=>x.includes('D pic'))&&since(n0).filter(r=>/images\/a\.svg/.test(r.url)).length===0,'the same fence with a different data section, added under the same id: the box, nothing asked ('+s.imgs.length+' img)');
  await p.close();

  // 8 a registry booklet opened by link, on a page that declares a store, asks for no image
  p=await open();n0=mark();
  await p.goto(PAGE+'/app/#/module/t/regpic');await wait(p,2500);
  s=await state(p);
  ok(s.boxes.some(x=>x.includes('Reg svg'))&&s.imgs.length===0,'a registry booklet draws its images as boxes ('+s.boxes.length+' boxes, '+s.imgs.length+' img)');
  ok(since(n0).filter(r=>/\/images\//.test(r.url)).length===0,'...and makes no image request');
  await p.close();

  // 9 an image that cannot be drawn, a DOCTYPE svg, a redirect and a path over 200 characters
  p=await open();n0=mark();
  await p.goto(PAGE+'/app/#/open/mix.booklet.md');await wait(p,2500);
  s=await state(p);
  ok(s.imgs.length===1&&s.imgs[0].alt==='Doctype svg'&&s.imgs[0].ok&&s.imgs[0].nw===30,'an SVG with a DOCTYPE line is drawn: '+JSON.stringify(s.imgs.map(i=>[i.alt,i.ok])));
  ok(s.boxes.length===4,'the other four are boxes, no broken icon is left ('+s.boxes.length+' boxes, '+s.imgs.length+' img)');
  ok(s.boxes.some(x=>x.includes('No xmlns')&&/could not be drawn as an image/.test(x))&&s.boxes.some(x=>x.includes('Truncated png')&&/could not be drawn as an image/.test(x)),'an SVG with no xmlns and a truncated PNG are the box with the could-not-be-drawn reason');
  ok(s.boxes.some(x=>x.includes('Redirected')&&/could not be fetched/.test(x)),'an image that redirects is refused: the box says it could not be fetched');
  ok(!net().some(r=>/redir-target/.test(r.url)),'...and the redirect\'s target was never asked for');
  ok(s.boxes.some(x=>x.includes('Long path')&&/does not read that address/.test(x)),'a path over 200 characters is the refused box');
  ok(!net().some(r=>/aaaaaaaa/.test(r.url)),'...and was never requested');
  ok(s.made.length===1||s.made.every(m=>s.revoked.includes(m.url)||m.type==='image/svg+xml'),'the blobs of the two images that could not be drawn were released ('+s.made.length+' made, '+s.revoked.length+' revoked)');
  n0=mark();
  await p.locator('button[data-lang=es]').click();await wait(p,1200);
  s=await state(p);
  ok(s.boxes.filter(x=>/no se pudo dibujar como imagen/.test(x)).length===2&&since(n0).length===0,'redrawn in Spanish: the reason is in Spanish, still two boxes, and nothing is asked again ('+since(n0).length+' requests)');
  await p.locator('button[data-lang=fr]').click();await wait(p,800);
  ok((await state(p)).boxes.filter(x=>/n’a pas pu être dessiné comme une image/.test(x)).length===2,'and in French');
  await p.locator('button[data-lang=en]').click();await wait(p,500);
  await p.close();

  // 10 a newer file: its images are read again (a changed one; one that was missing), and a module it adds is the store's
  VERSION=1;p=await open();await p.goto(PAGE+'/app/#/open/news.booklet.md');await wait(p,2500);
  s=await state(p);
  ok(s.imgs.length===1&&s.imgs[0].alt==='Changed'&&s.imgs[0].nw===40&&s.boxes.some(x=>x.includes('Late')&&/not found/.test(x)),'version 1: the changed image is 40 wide, the late one is missing: '+JSON.stringify(s.imgs.map(i=>i.nw)));
  await p.locator('#main textarea').first().fill('QZXnews');await wait(p,900);
  await p.evaluate(()=>{location.hash='#/open/other.md';});await wait(p,900);
  VERSION=2;n0=mark();
  await p.evaluate(()=>{location.hash='#/open/news.booklet.md';});await wait(p,2500);
  ok(await p.locator('.hostnote button.primary').filter({hasText:'Read the newer file'}).count()===1,'opened again after the file changed, the booklet offers the newer file');
  s=await state(p);
  ok(s.imgs.length===1&&s.imgs[0].nw===80&&s.boxes.some(x=>x.includes('Late')&&/not found/.test(x)),'a new visit reads the images as the store has them now (80 wide; the late one still missing): '+JSON.stringify(s.imgs.map(i=>i.nw)));
  VERSION=3;n0=mark();   /* the store's images change again while the offer is waiting */
  await p.locator('.hostnote button.primary').filter({hasText:'Read the newer file'}).click();await wait(p,1200);
  await goMod(p,/^\s*\d*\s*News/);
  s=await state(p);
  ok(s.imgs.some(i=>i.alt==='Changed'&&i.nw===120)&&s.imgs.some(i=>i.alt==='Late'&&i.ok),'after "Read the newer file" the changed image is read again (120 wide), and the one that failed before is no longer a kept failure but draws: '+JSON.stringify(s.imgs.map(i=>[i.alt,i.nw])));
  ok(since(n0).filter(r=>/chg\.png/.test(r.url)).length===1&&since(n0).filter(r=>/late\.png/.test(r.url)).length===1,'each was asked for once more, no more');
  await goMod(p,/Extra/);
  s=await state(p);
  ok(s.imgs.length===1&&s.imgs[0].alt==='Extra svg'&&s.imgs[0].ok,'a module the newer file adds is the store\'s, and draws its image: '+JSON.stringify(s.imgs.map(i=>i.alt)));
  await p.close();

  // 11 Booklet.open with a name, on a page with no store, asks for nothing
  /* a browser that has never kept a booklet from the store, so nothing earlier can stand in for the rule */
  const fresh=await b.newContext({viewport:{width:1280,height:900}});await setup(fresh);
  p=await open(fresh);await p.goto(PAGE+'/plain/');await wait(p,800);n0=mark();
  await p.evaluate(t=>window.Booklet.open(t,{name:'pics.booklet.md'}),PICS);await wait(p,1500);
  s=await state(p);
  ok(s.imgs.length===0&&since(n0).length===0,'Booklet.open(text, { name }) on a page that declares no store draws boxes and asks for nothing ('+s.imgs.length+' img, '+since(n0).length+' requests)');
  await p.close();

  // 12 tabs and pages are presentation: a module tab's prose, an activity's opening on each of its tabs, a tab's own prose and a
  //    later page draw the store's images, by the same rule
  p=await open();await p.goto(PAGE+'/app/#/open/tabbed.booklet.md');await wait(p,2500);
  if(!(await p.locator('#main [role=tab]').count())) await goMod(p,/Tabbed pictures/);
  const drawn=async()=>(await state(p)).imgs.filter(i=>i.ok&&/^blob:/.test(i.src||'')).map(i=>i.alt).sort().join('|');
  const tabTo=async t=>{await p.locator('#main [role=tab]').filter({hasText:t}).first().click();await wait(p,900);};
  ok(await drawn()==='Module tab pic','a module tab\'s prose draws its store image: '+await drawn());
  await p.locator('#main button.card').filter({hasText:'Tabbed'}).first().click();await wait(p,1500);
  ok(await drawn()==='First tab pic|Opening pic','an activity\'s opening and its first tab\'s prose draw their store images: '+await drawn());
  await tabTo('Second');
  ok(await drawn()==='Opening pic','on its second tab the opening still draws its image, and that tab has none of its own: '+await drawn());
  await p.locator('#main .cd-foot .cd-back').first().click();await wait(p,900);
  await tabTo('More');
  await p.locator('#main button.card').filter({hasText:'Paged'}).first().click();await wait(p,1200);
  await p.locator('#main .cd-foot .pg-next').click();await wait(p,1500);
  ok(await drawn()==='Page two pic','a later page draws its store image: '+await drawn());
  await p.close();

  // 13 the default folder (0.15): a page with no store tag reads a link from modules/ beside it, and the booklet draws the images
  //    beside it there, by the store's rule; a module changed afterwards draws the box; an entry from another folder draws none
  {const fold=await b.newContext({viewport:{width:1280,height:900}});await setup(fold);
   const imgsUnder=(n,dir)=>since(n).filter(r=>r.url.startsWith(PAGE+dir)&&/\/images\//.test(r.url)).map(r=>new URL(r.url).pathname);
   p=await open(fold);n0=mark();
   await p.goto(PAGE+'/fold/#/open/sub/fold.booklet.md');await wait(p,2500);
   ok(since(n0).filter(r=>/\.md$/.test(r.url)).map(r=>new URL(r.url).pathname).join()==='/fold/modules/sub/fold.booklet.md','the page with no store tag read the link from modules/ beside it: '+since(n0).map(r=>new URL(r.url).pathname).join(' '));
   await goMod(p,/Fold main/);
   s=await state(p);
   ok(s.imgs.length===1&&s.imgs[0].alt==='Fold svg'&&s.imgs[0].ok&&/^blob:/.test(s.imgs[0].src)&&s.imgs[0].nw===120,'a booklet from the default folder draws the image beside it there, from a blob: URL: '+JSON.stringify(s.imgs.map(i=>[i.alt,i.nw])));
   await goMod(p,/Fold kept/);
   s=await state(p);
   ok(s.imgs.length===1&&s.imgs[0].alt==='Kept png'&&s.imgs[0].ok,'...and its other module draws its own: '+JSON.stringify(s.imgs.map(i=>i.alt)));
   ok(imgsUnder(n0,'/').sort().join()==='/fold/modules/sub/images/a.svg,/fold/modules/sub/images/c.png','each image was read once, relative to the booklet\'s name in that folder: '+imgsUnder(n0,'/').join(' '));
   n0=mark();
   await addMod('Fold update');await goMod(p,/Fold update/);
   ok(await boxOf(/Fold update pic.*images\/b\.svg/),'a module updated in place under the folder\'s module id is no longer the folder\'s text: its image is the box, with its address');
   ok(imgsUnder(n0,'/').length===0,'...and nothing is asked of the folder for it ('+imgsUnder(n0,'/').join(' ')+')');
   await goMod(p,/Fold kept/);
   s=await state(p);
   ok(s.imgs.length===1&&s.imgs[0].alt==='Kept png'&&s.imgs[0].ok,'control: the module still the folder\'s draws its image');
   await p.close();
   /* a renderer at another path of the same site: its default folder is /fold2/modules/, not /fold/modules/ */
   p=await open(fold);n0=mark();
   await p.goto(PAGE+'/fold2/');await wait(p,1500);
   ok(await p.getByText('Folded').count()>0,'the entry kept from /fold/ is listed on /fold2/ (it holds a kept copy)');
   await p.getByText('Folded').first().click();await wait(p,2500);
   await goMod(p,/Fold kept/);
   s=await state(p);
   ok(s.imgs.length===0&&s.boxes.some(x=>x.includes('Kept png')&&/Image not shown/.test(x)&&x.includes('images/c.png')),'opened on a renderer whose default folder is another one, the entry from /fold/ draws the quiet box: '+JSON.stringify(s.boxes));
   ok(since(n0).filter(r=>/\/modules\//.test(r.url)).length===0,'...and neither folder is asked for anything, booklet or image ('+since(n0).filter(r=>/\/modules\//.test(r.url)).map(r=>r.url).join(' ')+')');
   n0=mark();
   await p.evaluate(()=>{location.hash='#/open/sub/fold.booklet.md';});await wait(p,2500);
   await goMod(p,/Fold kept/);
   s=await state(p);
   ok(s.imgs.length===1&&s.imgs[0].alt==='Kept png'&&s.imgs[0].ok&&imgsUnder(n0,'/').join()==='/fold2/modules/sub/images/c.png','control: the same name opened by link on /fold2/ is that folder\'s own booklet, and draws from /fold2/modules/: '+imgsUnder(n0,'/').join(' '));
   await p.close();await fold.close();}

  ok(net().every(r=>r.method==='GET'&&r.body===''&&!new URL(r.url).search),'over the whole run every request was a GET with no body and no query string');
  ok(!net().some(r=>/tracker\.example|secret/.test(r.url)),'over the whole run nothing was asked of a remote address or outside the store');
  ok(viol.filter(v=>!/tracker\.example/.test(v)).length===0,'no Content-Security-Policy violation: '+viol.join(' | '));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  await b.close();
  console.log(fails.length?'\n'+fails.length+' FAILURES':'\nstore image checks passed');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
