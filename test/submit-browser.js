// Browser check for the submit build (submit/submit.js, put into booklet-submit.html by submit/build.js). The page is the
// submit build as a host would serve it: https://forms.example.com/app/, with the host's own script at /host.js (it names the
// recipe, and hands booklets to the renderer with Booklet.open). The file's own <meta> policy is the whole policy: the test
// sends no policy header. The address Submit sends to is https://api.example.org/submit, answered here by a route standing in for
// recepture (POST only, application/json, the schema rules of its payload contract, 201 {"status":"accepted","response_id"}, and
// the CORS headers recepture sends for the one origin it is set to allow). The published booklet.html is the file named on the
// command line; the test only hashes it, before and after, to show it ran nothing against it.
// Checks, in the order a reader meets them: the page loads clean and BookletSubmit is frozen; Submit is hidden on "Your
// booklets" and on a booklet without a host name, shown on one with a name; the questionnaire fixture is answered through the
// screens, as a reader does; nothing has gone anywhere up to the press of Send; the confirm screen shows the exact JSON and
// Cancel/Escape close it; an untrusted click opens nothing and sends nothing; Send sends one POST whose body is the shown text,
// with no cookie and no referrer; after the 201 the booklet and this browser's copy are gone, also after a reload; across the
// run no other request has a body and nothing but the POSTs carries the typed address; a refusal (400) and an unreachable
// address keep every answer and let the reader retry; two modules answering one id stop the send; and at 400px nothing
// overflows. Screenshots (confirm, Sent, refusal; 1280px and 400px) are written to <outdir>.
// Live mode: with SUBMIT_ENDPOINT set (a real recepture started with CORS_ORIGIN=http://forms.example.com), the page is served
// at http://forms.example.com (or SUBMIT_PAGE_ORIGIN) and the success path's request is NOT routed: it goes to the real server,
// and the response_id it returns is printed on a line of its own. The refusal and unreachable cases are still answered by routes.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright-core node test/submit-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto'),http=require('http');
const HTML=path.resolve(process.argv[2]||'booklet.html'),OUT=process.argv[3]||'.';
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const LIVE=!!process.env.SUBMIT_ENDPOINT;
const ENDPOINT=LIVE?process.env.SUBMIT_ENDPOINT:'https://api.example.org/submit';
const PAGE=LIVE?(process.env.SUBMIT_PAGE_ORIGIN||'http://forms.example.com'):'https://forms.example.com';
const API=new URL(ENDPOINT).origin;
const RECIPE='recipes/test-battery.yaml';
const NAME='test/submit-questionnaire.md',CLASH_NAME='test/submit-clash.md';
const EMAIL='client@example.test';
const FIX=f=>fs.readFileSync(path.join(__dirname,'fixtures',f),'utf8');
const QUESTIONNAIRE=FIX('submit-questionnaire.booklet.md'),CLASH=FIX('submit-clash.booklet.md');
const HOSTJS='window.__open=function(t,n){return n?window.Booklet.open(t,{name:n}):window.Booklet.open(t);};window.BookletSubmit.recipe("'+RECIPE+'");';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
/* the answers the test gives: made up. The options are positions in the fixture's menu (1 = Not at all ... 4 = Nearly every day) */
const PHQ=[1,2,3,4,1,2,3,4,1],GAD=[2,3];
const EXPECT={email:EMAIL};PHQ.forEach((v,i)=>EXPECT['phq9-item'+(i+1)]=v);GAD.forEach((v,i)=>EXPECT['gad7-item'+(i+1)]=v);
/* recepture's payload rules (its payload contract): an object; recipe a non-empty string or an object; answers an object */
function receptureRules(text){let j;try{j=JSON.parse(text);}catch(e){return 'not JSON';}
  if(!j||typeof j!=='object'||Array.isArray(j)) return 'top level is not an object';
  const r=j.recipe;if(!((typeof r==='string'&&r.trim()!=='')||(r&&typeof r==='object'&&!Array.isArray(r)))) return 'recipe is not a non-empty string or an object';
  if(!j.answers||typeof j.answers!=='object'||Array.isArray(j.answers)) return 'answers is not an object';
  return '';}
const sortKeys=o=>Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]]));
const sameJSON=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const before=sha(HTML);
  const BUILD=require('../submit/build.js').build({endpoint:ENDPOINT,script:'/host.js'});
  /* Live mode: Chromium's Local/Private Network Access checks can block a page on a public-looking name from reaching a
     loopback address. The real recepture is on 127.0.0.1 here, so those checks are turned off for this run only; they are not
     what the test is about (the page's own policy and CORS are). Default mode is routed and needs none of this. */
  const args=LIVE?['--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults']:[];
  /* Live mode serves the page from a real local web server, not a route: while any route is installed, Playwright answers the
     browser's CORS preflights itself, so the real server would never see one. The page's name is pointed at that server. */
  let server=null;
  if(LIVE){server=http.createServer((q,s)=>{const u=new URL(q.url,'http://x').pathname;
      if(u==='/app/'){s.writeHead(200,{'content-type':'text/html; charset=utf-8'});return s.end(BUILD);}
      if(u==='/host.js'){s.writeHead(200,{'content-type':'text/javascript'});return s.end(HOSTJS);}
      s.writeHead(404);s.end('nf');});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    args.push('--host-resolver-rules=MAP '+new URL(PAGE).hostname+' 127.0.0.1:'+server.address().port);}
  const b=await chromium.launch({args});
  const ctx=await b.newContext({viewport:{width:1280,height:900}});
  const reqs=[],csp=[],errs=[],answered=[],pending=[];
  let preflights=0,standinPosts=0;
  /* what the endpoint answers: 'standin' (the stand-in for recepture), 'real' (live mode: not routed, passed through),
     'refuse' (400 missing_recipe), 'abort' (the address cannot be reached) */
  let mode=LIVE?'real':'standin';
  /* Found by trying: while a route is installed for an address, Playwright answers the CORS preflight itself and does not hold a
     route.fulfill() response to CORS (a 201 with no allow-origin header still reached the page as a success). So in stand-in mode
     these headers are what a real recepture sends but nothing checks them. Live mode therefore installs NO route on the endpoint
     for its success paths, so the browser's real preflight and CORS check meet the real server; its refusal and unreachable
     cases route the endpoint on that one page only, and remove the route before the retry. */
  const CORS={'access-control-allow-origin':PAGE,'vary':'Origin'};
  ctx.on('request',r=>{const rec={url:r.url(),method:r.method(),body:r.postData()||'',headers:r.headers(),all:null};reqs.push(rec);
    pending.push(r.allHeaders().then(h=>{rec.all=h;},()=>{}));});
  ctx.on('response',r=>{if(r.request().method()==='POST'&&r.url()===ENDPOINT)
    answered.push(r.json().then(j=>({status:r.status(),json:j}),()=>({status:r.status(),json:null})));});
  if(!LIVE) await ctx.route(PAGE+'/**',r=>{const u=new URL(r.request().url()).pathname;
    if(u==='/app/')return r.fulfill({status:200,body:BUILD,headers:{'content-type':'text/html; charset=utf-8'}});
    if(u==='/host.js')return r.fulfill({status:200,body:HOSTJS,headers:{'content-type':'text/javascript'}});
    r.fulfill({status:404,body:'nf'});});
  const apiRoute=async r=>{const q=r.request();
    if(q.method()==='OPTIONS'){preflights++;
      return r.fulfill({status:204,headers:{...CORS,'access-control-allow-methods':'POST','access-control-allow-headers':'Content-Type'}});}
    if(mode==='real') return r.continue();
    if(mode==='abort') return r.abort('failed');
    const err=(s,code,message)=>r.fulfill({status:s,headers:{...CORS,'content-type':'application/json'},body:JSON.stringify({error:{code,message}})});
    if(mode==='refuse') return err(400,'missing_recipe','x');
    if(q.method()!=='POST') return err(405,'method_not_allowed','POST only');
    const h=await q.allHeaders();
    if(!/^application\/json\b/i.test(h['content-type']||'')) return err(415,'unsupported_media_type','application/json only');
    const bad=receptureRules(q.postData()||'');if(bad) return err(400,'invalid_payload',bad);
    standinPosts++;
    r.fulfill({status:201,headers:{...CORS,'content-type':'application/json'},body:JSON.stringify({status:'accepted',response_id:crypto.randomUUID()})});};
  if(!LIVE) await ctx.route(API+'/**',apiRoute);
  /* live mode: route the endpoint on one page for a failure case, and take the route off again for a success */
  const routeOn=async p=>{if(LIVE) await p.route(API+'/**',apiRoute);};
  const routeOff=async p=>{if(LIVE) await p.unroute(API+'/**',apiRoute);};

  const newPage=async(width)=>{const p=await ctx.newPage();
    if(width) await p.setViewportSize({width,height:900});
    p.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
    p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(()=>{document.addEventListener('securitypolicyviolation',e=>{(window.__viol=window.__viol||[]).push(e.violatedDirective+' '+e.blockedURI);});});
    await p.goto(PAGE+'/app/');await p.waitForFunction(()=>typeof window.BookletSubmit==='object'&&typeof window.__open==='function'&&KEEP.ready);
    return p;};
  const wait=(p,ms)=>p.waitForTimeout(ms||400);
  const viol=[];const grabViol=async p=>{viol.push(...await p.evaluate(()=>window.__viol||[]).catch(()=>[]));};
  const openBook=async(p,text,name)=>{const r=await p.evaluate(([t,n])=>window.__open(t,n),[text,name]);await wait(p,500);return r;};
  const submitHidden=p=>p.evaluate(()=>document.getElementById('btnSubmit').hidden);
  const dialogOpen=p=>p.evaluate(()=>document.getElementById('veilSubmit').hasAttribute('open'));
  const text=(p,sel)=>p.locator(sel).textContent();
  const noScroll=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const toEndpoint=()=>reqs.filter(r=>r.url===ENDPOINT&&r.method==='POST');
  const toApiOrigin=()=>reqs.filter(r=>/^https?:/i.test(r.url)&&new URL(r.url).origin===API);
  const shot=(p,n)=>p.screenshot({path:path.join(OUT,n)});
  /* the screens, as a reader meets them: the overview's cards, then a module's questions (choices are pills, text is a field) */
  const toOverview=async p=>{if(await p.evaluate(()=>document.body.dataset.view)!=='@home'){await p.locator('#btnHome').click();await wait(p,300);}};
  const card=async(p,i)=>{await toOverview(p);await p.locator('button.mode').nth(i).click();await wait(p,350);};
  const pick=async(p,vals)=>{for(let i=0;i<vals.length;i++) await p.locator('#main .q-inline').nth(i).locator('.pill-btn').nth(vals[i]-1).click();await wait(p,200);};
  const typeEmail=async p=>{await card(p,0);await p.locator('#main textarea').first().fill(EMAIL);await wait(p,300);};
  const answerAll=async p=>{await typeEmail(p);await card(p,1);await pick(p,PHQ);await card(p,2);await pick(p,GAD);await toOverview(p);};
  const answers=p=>p.evaluate(()=>{const o={};for(const s of Object.keys(STATE.answers||{}))Object.assign(o,STATE.answers[s]);return o;});
  const pressSubmit=async p=>{await p.locator('#btnSubmit').click();await p.waitForSelector('#veilSubmit[open]',{timeout:3000});await wait(p,150);};
  const pressSend=p=>p.locator('#submitSend').click();
  const msgNow=p=>text(p,'#submitMsg');
  const waitMsg=(p,re)=>p.waitForFunction(r=>new RegExp(r,'i').test(document.getElementById('submitMsg').textContent),re.source,{timeout:8000}).catch(()=>{});
  const waitSent=p=>p.waitForFunction(()=>document.getElementById('submitTitle').textContent==='Sent',null,{timeout:8000}).catch(()=>{});
  const hasEntry=(p,id)=>p.evaluate(i=>readLib().entries.some(e=>e.id===i),id);

  // 2 the page loads; BookletSubmit
  let p=await newPage();
  const bs=await p.evaluate(()=>({t:typeof window.BookletSubmit,frozen:Object.isFrozen(window.BookletSubmit),ep:window.BookletSubmit.endpoint,keys:Object.keys(window.BookletSubmit).sort().join()}));
  ok(bs.t==='object'&&bs.frozen&&bs.ep===ENDPOINT&&bs.keys==='endpoint,recipe,version','window.BookletSubmit is frozen, has endpoint, recipe and version, and its endpoint is the built one: '+JSON.stringify(bs));
  ok(csp.length===0&&errs.length===0,'the submit page loaded with no page error and no policy message (the file\'s own meta policy is the only one): '+csp.concat(errs).join('|'));
  ok(toApiOrigin().length===0,'loading the page made no request to the endpoint\'s origin');

  // 3 "Your booklets"
  ok(await p.evaluate(()=>screen)==='@booklets'&&await submitHidden(p),'on "Your booklets" (nothing open) the Submit button is hidden');

  // 4 a booklet without a name
  let r=await openBook(p,QUESTIONNAIRE,null);
  ok(r.ok===true&&await p.evaluate(()=>hookOpen()),'the host\'s script opened the booklet without a name: '+JSON.stringify(r));
  ok(await submitHidden(p),'a booklet opened without a name (the reader\'s own) shows no Submit button');
  await grabViol(p);await p.close();

  // 5 with a name
  p=await newPage();
  r=await openBook(p,QUESTIONNAIRE,NAME);
  ok(r.ok===true,'the host\'s script opened the questionnaire with the name '+NAME+': '+JSON.stringify(r));
  const sb=await p.evaluate(()=>{const b=document.getElementById('btnSubmit');return {hidden:b.hidden,label:b.textContent.trim(),inTools:!!b.closest('.bar .tools')};});
  ok(!sb.hidden&&sb.label==='Submit'&&sb.inTools,'a booklet opened with a name shows the Submit button in the bar, labelled "Submit": '+JSON.stringify(sb));
  const bookId=await p.evaluate(()=>currentId);

  // 6 answered through the screens
  await answerAll(p);
  const got=await answers(p);
  ok(sameJSON(sortKeys(got),sortKeys(EXPECT)),'answered through the screens: the email and the 9+2 choices are in the booklet: '+JSON.stringify(got));

  // 7 nothing sent yet
  ok(toApiOrigin().length===0,'up to the press of Submit, no request has gone to the endpoint\'s origin ('+toApiOrigin().length+')');

  // 8 the confirm screen
  await pressSubmit(p);
  ok(await dialogOpen(p),'pressing Submit opens the confirm screen');
  const shown=await text(p,'#submitBody');
  let parsed=null;try{parsed=JSON.parse(shown);}catch(e){}
  ok(!!parsed&&sameJSON(Object.keys(parsed).sort(),['answers','recipe'])&&parsed.recipe===RECIPE&&sameJSON(sortKeys(parsed.answers),sortKeys(EXPECT)),'the shown text is exactly {"recipe","answers"} with the host\'s recipe and the answers given (choices as 1-based positions, the email as text): '+shown.replace(/\s+/g,' ').slice(0,240));
  const helpT=await text(p,'#submitHelp');
  ok(/Send your answers\?/.test(await text(p,'#submitTitle'))&&helpT.includes(new URL(ENDPOINT).host)&&helpT.includes('Nothing has been sent yet'),'the screen says who it sends to and that nothing has been sent: '+helpT);
  ok(toApiOrigin().length===0,'with the confirm screen open, still nothing sent');
  await shot(p,'submit-confirm-1280.png');
  await p.locator('#submitCancel').click();await wait(p,200);
  ok(!await dialogOpen(p)&&toApiOrigin().length===0,'Cancel closes the confirm screen; nothing sent');
  await pressSubmit(p);await p.keyboard.press('Escape');await wait(p,200);
  ok(!await dialogOpen(p)&&toApiOrigin().length===0,'Escape closes the confirm screen; nothing sent');

  // 9 untrusted clicks
  await p.evaluate(()=>document.getElementById('btnSubmit').click());await wait(p,300);
  ok(!await dialogOpen(p),'an untrusted click (from page script) on Submit does not open the confirm screen');
  await pressSubmit(p);
  await p.evaluate(()=>document.getElementById('submitSend').click());await wait(p,600);
  ok(toApiOrigin().length===0&&await dialogOpen(p)&&await text(p,'#submitTitle')!=='Sent','an untrusted click on Send (screen open) sends nothing and changes nothing');

  // 10 Send
  const shownNow=await text(p,'#submitBody');
  await pressSend(p);await waitSent(p);
  await Promise.all(pending);
  const posts=toEndpoint(),responses=await Promise.all(answered);
  ok(posts.length===1&&toApiOrigin().filter(q=>q.method==='POST').length===1,'pressing Send sent exactly one POST, to the endpoint ('+posts.length+')');
  const po=posts[0]||{body:'',headers:{},all:null};const all=po.all||po.headers;
  ok(po.body===shownNow,'its body is byte for byte the text shown on the confirm screen ('+po.body.length+' bytes)');
  ok(/^application\/json/i.test(all['content-type']||''),'content-type is application/json: '+all['content-type']);
  ok(!('cookie' in all)&&!('referer' in all),'no cookie header and no referer header: '+Object.keys(all).sort().join(','));
  ok(receptureRules(po.body)==='','the body passes recepture\'s payload rules: '+(receptureRules(po.body)||'ok'));
  if(!LIVE) ok(standinPosts===1,'the stand-in for recepture accepted it ('+standinPosts+')');
  else ok(responses.length>=1&&responses[0].status===201,'the real server answered 201: '+JSON.stringify(responses[0]));
  const rid=responses.length&&responses[0].json&&responses[0].json.response_id;
  ok(typeof rid==='string'&&/^[0-9a-f-]{36}$/i.test(rid),'the answer carries a response_id (a uuid): '+rid);
  if(LIVE) console.log('response_id: '+rid);

  // 11 after the 201
  const sentHelp=await text(p,'#submitHelp');
  ok(await text(p,'#submitTitle')==='Sent'&&/Your answers were received/.test(sentHelp)&&(!rid||sentHelp.includes(rid.slice(0,8))),'after the 201 the screen says Sent, with the reference: '+sentHelp);
  ok(await submitHidden(p),'and the Submit button is hidden again');
  ok(await dialogOpen(p)&&await p.locator('#submitSend').isHidden(),'the Sent screen is up, with no Send button');
  await shot(p,'submit-sent-1280.png');
  const kept=await p.evaluate(id=>({entry:readLib().entries.some(e=>e.id===id),viaName:readLib().entries.some(e=>e.from==='store:'+'test/submit-questionnaire.md'),copy:lsGet(bookKey(id)),open:hookOpen()}),bookId);
  ok(!kept.entry&&!kept.viaName&&kept.copy==null&&!kept.open,'this browser keeps no copy: no entry for the booklet in the list, no kept-copy key, nothing open: '+JSON.stringify({entry:kept.entry,viaName:kept.viaName,copy:kept.copy==null?null:'present',open:kept.open}));
  await p.locator('#submitCancel').click();await wait(p,200);
  ok(!await dialogOpen(p),'Close closes the Sent screen');
  await grabViol(p);
  await p.reload();await p.waitForFunction(()=>KEEP.ready);await wait(p,800);
  /* step 4's booklet (opened without a name) is the reader's own and stays in the list; only the named one must be gone */
  const after=await p.evaluate(id=>({entry:readLib().entries.some(e=>e.id===id),viaName:readLib().entries.filter(e=>typeof e.from==='string'&&e.from.startsWith('store:')).length,copy:lsGet(bookKey(id)),listed:(document.body.innerText.match(/Submit test questionnaire/g)||[]).length}),bookId);
  ok(!after.entry&&after.viaName===0&&after.copy==null&&after.listed===1,'after a reload (same browser) the library holds nothing of it: no entry, no store entry, no kept copy; only the reader\'s own unnamed copy from step 4 is listed: '+JSON.stringify({entry:after.entry,viaName:after.viaName,copy:after.copy==null?null:'present',listed:after.listed}));
  await grabViol(p);await p.close();

  // 13 a refusal
  p=await newPage();
  ok((await openBook(p,QUESTIONNAIRE,NAME)).ok===true,'refusal run: the questionnaire opened again');
  const id2=await p.evaluate(()=>currentId);
  await typeEmail(p);await card(p,1);await pick(p,[3]);await toOverview(p);
  await routeOn(p);mode='refuse';
  const nPost0=toEndpoint().length;
  await pressSubmit(p);await pressSend(p);await waitMsg(p,/Not sent/);
  let m=await msgNow(p);
  ok(/Not sent/.test(m)&&/400/.test(m)&&/missing_recipe/.test(m),'a 400 refusal says "Not sent", with 400 and missing_recipe: '+m);
  ok(toEndpoint().length===nPost0+1,'and exactly one POST was made for it ('+(toEndpoint().length-nPost0)+')');
  ok(await dialogOpen(p)&&await p.locator('#submitSend').isEnabled()&&await p.locator('#submitCancel').isEnabled(),'the dialog stays open and Send is enabled again');
  const a2=await answers(p),e2=await hasEntry(p,id2);
  ok(a2.email===EMAIL&&a2['phq9-item1']===3&&e2,'the answers are still in the booklet and its library entry still exists: '+JSON.stringify({a:a2,entry:e2}));
  await shot(p,'submit-refused-1280.png');

  // 14 unreachable, then a retry
  mode='abort';
  await pressSend(p);await waitMsg(p,/could not be reached/);
  m=await msgNow(p);
  ok(/could not be reached/.test(m)&&/Not sent/.test(m),'an unreachable address says it could not be reached: '+m);
  const a3=await answers(p),e3=await hasEntry(p,id2);
  ok(await dialogOpen(p)&&await p.locator('#submitSend').isEnabled()&&a3.email===EMAIL&&e3,'and the answers are kept, the entry exists, Send is enabled');
  mode=LIVE?'real':'standin';await routeOff(p);
  const postsBefore=toEndpoint().length;
  await pressSend(p);await waitSent(p);
  ok(await text(p,'#submitTitle')==='Sent'&&toEndpoint().length===postsBefore+1,'with the address answering again, Send succeeds (a retry works): '+await text(p,'#submitTitle'));
  ok(!await hasEntry(p,id2)&&await p.evaluate(id=>lsGet(bookKey(id)),id2)==null,'and then this browser\'s copy is gone');
  await grabViol(p);await p.close();

  // 15 two modules answering one id
  p=await newPage();
  r=await openBook(p,CLASH,CLASH_NAME);
  ok(r.ok===true,'the clash fixture opened with a name: '+JSON.stringify(r));
  for(const i of [0,1]){await card(p,i);await p.locator('#main textarea').first().fill('answer '+i);await wait(p,250);}
  await toOverview(p);
  const nPost1=toEndpoint().length;
  await pressSubmit(p);
  m=await msgNow(p);
  ok(/cannot be sent/.test(m)&&/item1/.test(m),'two modules using one question id: the screen says the answers cannot be sent and names item1: '+m);
  ok(await p.locator('#submitSend').isDisabled(),'and Send is disabled');
  await p.locator('#submitSend').click({force:true,timeout:1500}).catch(()=>{});await wait(p,400);
  ok(toEndpoint().length===nPost1,'and no POST goes');
  await p.keyboard.press('Escape');
  await grabViol(p);await p.close();

  // 16 at 400px: confirm, refusal, Sent
  p=await newPage(400);
  ok((await openBook(p,QUESTIONNAIRE,NAME)).ok===true,'400px run: the questionnaire opened');
  await answerAll(p);
  await pressSubmit(p);
  await shot(p,'submit-confirm-400.png');
  ok(await noScroll(p)<=0,'at 400px no sideways overflow with the confirm screen open: '+await noScroll(p));
  const panel=await p.evaluate(()=>{const r=document.querySelector('#veilSubmit .panel').getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(r.right),w:innerWidth};});
  ok(panel.l>=0&&panel.r<=panel.w,'and the dialog sits inside the 400px window: '+JSON.stringify(panel));
  await routeOn(p);mode='refuse';
  await pressSend(p);await waitMsg(p,/Not sent/);
  await shot(p,'submit-refused-400.png');
  ok(/Not sent/.test(await msgNow(p))&&await noScroll(p)<=0,'at 400px the refusal message shows with no sideways overflow: '+await noScroll(p));
  mode=LIVE?'real':'standin';await routeOff(p);
  await pressSend(p);await waitSent(p);
  await shot(p,'submit-sent-400.png');
  ok(await text(p,'#submitTitle')==='Sent'&&await noScroll(p)<=0,'at 400px the Sent screen shows with no sideways overflow: '+await noScroll(p));
  await grabViol(p);await p.close();

  // 12 across the whole run
  await Promise.all(pending);
  const net=reqs.filter(q=>/^https?:/i.test(q.url));
  const isPost=q=>q.method==='POST'&&q.url===ENDPOINT;
  const apiPosts=net.filter(q=>q.method==='POST');
  ok(apiPosts.length>0&&apiPosts.every(isPost),'across the run every POST went to the endpoint ('+apiPosts.length+' of them)');
  ok(net.filter(q=>q.body&&!isPost(q)).length===0,'no request other than the endpoint\'s POST carried a body');
  ok(net.filter(q=>!isPost(q)&&(q.url+q.body+JSON.stringify(q.all||q.headers)).includes(EMAIL)).length===0,'the typed address appears in no request but the endpoint\'s POST (not in any URL, header or other body)');
  ok(net.every(q=>[PAGE,API].includes(new URL(q.url).origin)),'every request was to the page\'s origin or the endpoint\'s: '+[...new Set(net.map(q=>new URL(q.url).origin))].join(' '));
  ok(net.filter(q=>q.method!=='GET'&&q.method!=='POST'&&q.method!=='OPTIONS').length===0&&net.filter(q=>q.method==='GET'&&new URL(q.url).origin===API).length===0,'no method but GET (page only), POST and OPTIONS, and no GET to the endpoint');
  ok((await ctx.cookies()).length===0,'no cookies in the browser');
  ok(viol.length===0&&csp.length===0,'zero policy violations in the whole run: '+viol.concat(csp).join('|'));
  ok(errs.length===0,'zero page errors '+errs.join('|'));

  // 1 the published file
  ok(sha(HTML)===before,'the published booklet.html has the same sha256 at the end as at the start ('+before.slice(0,12)+')');
  const replies=await Promise.all(answered);
  if(LIVE) ok(replies.filter(x=>x.status===201).length===3,'live: the real server answered 201 to each of the three sends that were not routed ('+replies.map(x=>x.status).join(',')+')');
  console.log('note: CORS preflights that reached the route: '+preflights+'; mode: '+(LIVE?'live ('+ENDPOINT+')':'stand-in'));
  await b.close();if(server) server.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);console.log('FAILED (test crashed)');process.exit(1);});
