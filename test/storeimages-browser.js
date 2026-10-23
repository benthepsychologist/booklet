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
//   - a booklet loaded from a file, on a page that has a store, and any booklet on a page with no store, make no image request.
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
const FILES={
  '/pub/images/a.svg':{type:'image/svg+xml',body:SVG_A},
  '/pub/images/b.png':{type:'image/png',body:png(1600,20)},
  '/pub/images/deco.png':{type:'image/png',body:png(16,16)},
  '/pub/images/fake.svg':{type:'image/svg+xml',body:'<html><body>not an svg</body></html>'},
  '/pub/images/big.png':{type:'image/png',body:Buffer.concat([png(2,2),Buffer.alloc(5*1024*1024+100)])},
  '/pub/sub/images/a.svg':{type:'image/svg+xml',body:SVG_NESTED}};
const REFUSED=[['dots','../secret.png'],['dots2','images/../a.png'],['abs','/images/a.png'],['proto','//tracker.example/p.png'],['remote','https://tracker.example/r.png'],
  ['data','data:image/png;base64,AAAA'],['pct','images/a%2Eb.png'],['query','images/q.png?x=1'],['hash','images/h.png#f'],['back','images\\a.png'],
  ['ext','images/note.txt'],['dot','./images/a.png'],['hidden','images/.hid/a.png'],['colon','images/a:b.png']];
const bk=(id,title,body)=>`---\nbooklet: "0.13"\ntitle: ${title}\nlang: en\n---\n\n> [!module|${id}] ${title}\n\n${body}\n> [!module|${id} end] End\n`;
const PICS=bk('pics','Pictures',['> [!activity|look] Look','','![Harbour svg](images/a.svg)','','![Chart png][chart]','','![](images/deco.png)','','![Gone](images/missing.png)','',
  '![Fake svg](images/fake.svg)','','![Big png](images/big.png)','',...REFUSED.flatMap(([a,u])=>['!['+a+' refused]('+u+')','']),'[chart]: images/b.png',''].join('\n'));
const NESTED=bk('nest','Nested',['> [!activity|n] Nested','','![Nested svg](images/a.svg)',''].join('\n'));
const OTHER=bk('other','Other','> [!activity|o] Other\n\nNo pictures here.\n');
const BOOKS={'/pub/pics.booklet.md':PICS,'/pub/sub/nested.booklet.md':NESTED,'/pub/other.md':OTHER};
const WANT=['/pub/images/a.svg','/pub/images/b.png','/pub/images/deco.png','/pub/images/missing.png','/pub/images/fake.svg','/pub/images/big.png'];
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch();
  const reqs=[],errs=[],viol=[];
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  const cors={'access-control-allow-origin':'*'};
  await ctx.route(PAGE+'/**',r=>{const u=new URL(r.request().url()).pathname;
    if(u==='/app/')return r.fulfill({status:200,body:page(true),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
    if(u==='/plain/')return r.fulfill({status:200,body:page(false),headers:{'content-type':'text/html; charset=utf-8','content-security-policy':HOST_CSP}});
    if(BOOKS[u])return r.fulfill({status:200,body:BOOKS[u],headers:{'content-type':'text/markdown; charset=utf-8',...cors}});
    const f=FILES[u];if(f)return r.fulfill({status:200,body:f.body,headers:{'content-type':f.type,...cors}});
    r.fulfill({status:404,body:'nf',headers:cors});});
  await ctx.route(REG+'/**',r=>r.fulfill({status:404,body:'nf',headers:cors}));
  /* anything else on the network is a failure of the page, answered with an abort so the test sees it asked */
  await ctx.route(u=>!u.href.startsWith(PAGE)&&!u.href.startsWith(REG)&&/^https?:/.test(u.href),r=>r.abort());
  const open=async()=>{const p=await ctx.newPage();
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

  ok(net().every(r=>r.method==='GET'&&r.body===''&&!new URL(r.url).search),'over the whole run every request was a GET with no body and no query string');
  ok(!net().some(r=>/tracker\.example|secret/.test(r.url)),'over the whole run nothing was asked of a remote address or outside the store');
  ok(viol.filter(v=>!/tracker\.example/.test(v)).length===0,'no Content-Security-Policy violation: '+viol.join(' | '));
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  await b.close();
  console.log(fails.length?'\n'+fails.length+' FAILURES':'\nstore image checks passed');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
