// Browser check for the submit build (submit/submit.js, put into booklet-submit.html by submit/build.js). The page is the
// submit build as a host would serve it: https://forms.example.com/app/, with the host's own script at /host.js (it names the
// recipe, and hands booklets to the renderer with Booklet.open). The file's own <meta> policy is the whole policy: the test
// sends no policy header. The address Submit sends to is https://api.example.org/submit, answered here by a route standing in for
// recepture (POST only, application/json, the schema rules of its payload contract, 201 {"status":"accepted","response_id"}, and
// the CORS headers recepture sends for the one origin it is set to allow). The published booklet.html is the file named on the
// command line; the test only hashes it, before and after, to show it ran nothing against it.
// Checks, in the order a reader meets them: the page loads clean and BookletSubmit is frozen; Submit is hidden on "Your
// booklets", on a booklet without a host name and on one opened by link from the default folder (0.15: modules/ beside a page
// that declares no store, never the host's; answered, it still shows none, a press on the button forced into view opens
// nothing, and nothing goes to the endpoint), shown on one with a name; the questionnaire fixture is answered through the
// screens, as a reader does; nothing has gone anywhere up to the press of Send; the confirm screen lists the answers as the
// reader gave them, by module, with the exact JSON folded under them, and Cancel/Escape close it; an untrusted click opens
// nothing and sends nothing; Send sends one POST whose body is the folded text, with no cookie and no referrer; after the 201
// the booklet stays open with every answer, kept in this browser (also after a reload) and downloadable, and Submit reads Sent
// until an answer changes; across the run no other request has a body and nothing but the POSTs carries the typed address; a
// refusal (400) and an unreachable address keep every answer and let the reader retry; two modules answering one id stop the
// send; the screen speaks French with the French interface, es-AR reads es, and an answer no question names is listed by
// its id; and at 400px nothing overflows. Screenshots (confirm, its exact text, Sent, refusal, French; 1280px and 400px) are
// written to <outdir>.
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
/* 0.15: the questionnaire again, in the default folder beside the page (/app/modules/), opened by a link */
const FOLDER_NAME='test/submit-folder.md';
/* a name per run below, so each starts blank: a booklet sent is kept, and the same name opens the kept copy again */
const NAME_B='test/submit-questionnaire-b.md',NAME_C='test/submit-questionnaire-c.md',NAME_D='test/submit-questionnaire-d.md';
const EMAIL='client@example.test';
const FIX=f=>fs.readFileSync(path.join(__dirname,'fixtures',f),'utf8');
const QUESTIONNAIRE=FIX('submit-questionnaire.booklet.md'),CLASH=FIX('submit-clash.booklet.md');
const HOSTJS='window.__open=function(t,n){return n?window.Booklet.open(t,{name:n}):window.Booklet.open(t);};window.BookletSubmit.recipe("'+RECIPE+'");';
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
/* the answers the test gives: made up. The options are positions in the fixture's menu (1 = Not at all ... 4 = Nearly every day) */
const PHQ=[1,2,3,4,1,2,3,4,1],GAD=[2,3];
const EXPECT={email:EMAIL};PHQ.forEach((v,i)=>EXPECT['phq9-item'+(i+1)]=v);GAD.forEach((v,i)=>EXPECT['gad7-item'+(i+1)]=v);
/* what the confirm screen lists for those answers: the fixture's module titles, its question words, and the menu's words */
const FREQ=['Not at all','Several days','More than half the days','Nearly every day'];
const item=i=>'Test item '+i+' (placeholder wording)';
const LISTED=[{title:'Your details',rows:[['Your email address',EMAIL]]},
  {title:'Part one',rows:PHQ.map((v,i)=>[item(i+1),FREQ[v-1]])},
  {title:'Part two',rows:GAD.map((v,i)=>[item(i+1),FREQ[v-1]])}];
/* what the body also says: the booklet, and for each answered question what the reader was shown (the question's words, and for a
   choice the options in the order shown and the words picked) */
const BOOKLET={id:'test/submit-questionnaire',lang:'en'};
const SEEN={email:{question:'Your email address'}};
PHQ.forEach((v,i)=>SEEN['phq9-item'+(i+1)]={question:item(i+1),options:FREQ,picked:[FREQ[v-1]]});
GAD.forEach((v,i)=>SEEN['gad7-item'+(i+1)]={question:item(i+1),options:FREQ,picked:[FREQ[v-1]]});
const SEEN_FIXTURE=FIX('submit-seen.booklet.md');
/* recepture's payload rules (its payload contract): an object; recipe a non-empty string or an object; answers an object */
function receptureRules(text){let j;try{j=JSON.parse(text);}catch(e){return 'not JSON';}
  if(!j||typeof j!=='object'||Array.isArray(j)) return 'top level is not an object';
  const r=j.recipe;if(!((typeof r==='string'&&r.trim()!=='')||(r&&typeof r==='object'&&!Array.isArray(r)))) return 'recipe is not a non-empty string or an object';
  if(!j.answers||typeof j.answers!=='object'||Array.isArray(j.answers)) return 'answers is not an object';
  return '';}
const sortKeys=o=>Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]]));
const sameJSON=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hasOwnKey=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);

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
      if(u==='/app/modules/'+FOLDER_NAME){s.writeHead(200,{'content-type':'text/markdown; charset=utf-8'});return s.end(QUESTIONNAIRE);}
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
    if(u==='/app/modules/'+FOLDER_NAME)return r.fulfill({status:200,body:QUESTIONNAIRE,headers:{'content-type':'text/markdown; charset=utf-8'}});
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
  /* the confirm screen's list, as the reader sees it: each module's card, its title and its question/answer pairs */
  const listed=p=>p.evaluate(()=>Array.from(document.querySelectorAll('#submitList .entry')).map(c=>({title:c.querySelector('h4').textContent,
    rows:Array.from(c.querySelectorAll('dt')).map(dt=>[dt.textContent,dt.nextElementSibling?dt.nextElementSibling.textContent:null])})));
  const button=p=>p.evaluate(()=>{const b=document.getElementById('btnSubmit');return {hidden:b.hidden,label:b.textContent.trim(),aria:b.getAttribute('aria-disabled'),disabled:b.disabled};});

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

  // 4b (0.15) a booklet opened by link from the default folder: the page declares no store, so a link reads modules/ beside it,
  //    and what opens from there is never the host's. No Submit button, answered or not, and nothing goes to the endpoint.
  p=await newPage();
  {const a0=toApiOrigin().length,f0=reqs.length;
   await p.evaluate(n=>{location.hash='#/open/'+n;},FOLDER_NAME);
   await p.waitForFunction(()=>typeof BOOK!=='undefined'&&BOOK!==EMPTY_BOOKLET,null,{timeout:8000}).catch(()=>{});await wait(p,600);
   const fr=reqs.slice(f0).filter(q=>/\/modules\//.test(q.url)).map(q=>q.method+' '+new URL(q.url).pathname);
   ok(fr.join()==='GET /app/modules/'+FOLDER_NAME,'a link on the submit page (no store tag) read the booklet from modules/ beside it: '+fr.join(' '));
   const from=await p.evaluate(()=>(currentEntry||{}).from||'');
   ok(from==='modules:/app/modules/#'+FOLDER_NAME,'...and opened it as a booklet from the default folder: '+from);
   ok(await submitHidden(p),'a booklet from the default folder shows no Submit button');
   await answerAll(p);
   ok(sameJSON(sortKeys(await answers(p)),sortKeys(EXPECT)),'it was answered through the screens, as the named one is below');
   ok(await submitHidden(p),'answered, it still shows no Submit button');
   /* the gate is the build's own check, not only the hidden attribute: a trusted press on the button, forced into view, opens nothing */
   await p.evaluate(()=>{document.getElementById('btnSubmit').hidden=false;});
   await p.locator('#btnSubmit').click({timeout:2000}).catch(()=>{});await wait(p,2500);
   ok(!await dialogOpen(p),'a press on the button forced into view opens no confirm screen');
   ok(toApiOrigin().length===a0,'nothing went to the endpoint\'s origin while it was open, answered and pressed ('+(toApiOrigin().length-a0)+' requests)');}
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
  const list=await listed(p);
  ok(sameJSON(list,LISTED),'the screen lists the answers as the reader gave them: a card per module, titled as the booklet titles it, each question\'s words above the answer\'s (the menu\'s words, the typed address): '+JSON.stringify(list).slice(0,300));
  ok(list.reduce((n,g)=>n+g.rows.length,0)===Object.keys(EXPECT).length,'and it lists as many answers as are sent ('+Object.keys(EXPECT).length+')');
  ok(await p.evaluate(()=>document.getElementById('submitExact').open)===false&&await p.locator('#submitBody').isHidden()&&await text(p,'#submitExact summary')==='Show exactly what is sent','the exact text is folded shut under the list, behind "Show exactly what is sent"');
  const shown=await text(p,'#submitBody');
  let parsed=null;try{parsed=JSON.parse(shown);}catch(e){}
  ok(!!parsed&&sameJSON(Object.keys(parsed).sort(),['answers','booklet','recipe','seen'])&&parsed.recipe===RECIPE&&sameJSON(sortKeys(parsed.answers),sortKeys(EXPECT)),'the folded text is {"recipe","answers","booklet","seen"} with the host\'s recipe and the answers given (choices as 1-based positions, the email as text): '+shown.slice(0,200));
  ok(!!parsed&&sameJSON(parsed.booklet,BOOKLET),'it names the booklet it came from (its id and language; this fixture has no version): '+JSON.stringify(parsed&&parsed.booklet));
  ok(!!parsed&&sameJSON(sortKeys(parsed.seen||{}),sortKeys(SEEN)),'and for each answered question it says what the reader was shown: the question\'s words, the options in the order shown and the words picked: '+JSON.stringify(parsed&&parsed.seen).slice(0,300));
  ok(!!parsed&&Object.keys(parsed.seen||{}).every(k=>hasOwnKey(parsed.answers,k)),'every seen entry is for a question that is in answers, under the same id');
  const helpT=await text(p,'#submitHelp');
  ok(/Send your answers\?/.test(await text(p,'#submitTitle'))&&helpT.includes(new URL(ENDPOINT).host)&&helpT.includes('Nothing has been sent yet'),'the screen says who it sends to and that nothing has been sent: '+helpT);
  ok(toApiOrigin().length===0,'with the confirm screen open, still nothing sent');
  await shot(p,'submit-confirm-1280.png');
  await p.locator('#submitExact summary').click();await wait(p,150);
  ok(await p.locator('#submitBody').isVisible(),'one tap on it shows the exact text');
  await shot(p,'submit-exact-1280.png');
  await p.locator('#submitExact summary').click();await wait(p,150);
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
  ok(po.body===shownNow,'its body is byte for byte the folded text of the confirm screen ('+po.body.length+' bytes)');
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
  ok(await text(p,'#submitTitle')==='Sent'&&/Your answers were received/.test(sentHelp)&&/still here in your booklet/.test(sentHelp)&&(!rid||sentHelp.includes(rid.slice(0,8))),'after the 201 the screen says Sent, with the reference, and that the answers are still in the booklet: '+sentHelp);
  ok(await dialogOpen(p)&&await p.locator('#submitSend').isHidden()&&await p.locator('#submitList').isHidden()&&await p.locator('#submitExact').isHidden(),'the Sent screen is up, with no Send button, list or exact text');
  await shot(p,'submit-sent-1280.png');
  let bt=await button(p);
  ok(!bt.hidden&&bt.label==='Sent'&&bt.aria==='true','the Submit button stays in the bar and reads Sent, marked unavailable: '+JSON.stringify(bt));
  const kept=await p.evaluate(id=>{const c=lsGet(bookKey(id));return {open:hookOpen(),same:currentId===id,entry:readLib().entries.some(e=>e.id===id),copy:typeof c==='string'&&c.includes('phq9-item9')&&c.includes('client@example.test')};},bookId);
  ok(kept.open&&kept.same&&kept.entry&&kept.copy&&sameJSON(sortKeys(await answers(p)),sortKeys(EXPECT)),'nothing the reader wrote is removed: the same booklet is open with every answer, it has its row in "Your booklets", and its kept copy holds the answers: '+JSON.stringify(kept));
  await p.locator('#submitCancel').click();await wait(p,200);
  ok(!await dialogOpen(p),'Close closes the Sent screen');
  await p.locator('#btnSubmit').click({force:true});await wait(p,400);
  ok(!await dialogOpen(p)&&toEndpoint().length===1,'pressing Sent opens nothing and sends nothing');
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}),p.locator('#btnExport').click()]);
  const dlText=fs.readFileSync(await dl.path(),'utf8');
  ok(/\.booklet\.md$/.test(dl.suggestedFilename())&&dlText.includes('"phq9-item1"')&&dlText.includes(EMAIL),'the booklet downloads as any booklet does, with its answers: '+dl.suggestedFilename());
  await toOverview(p);await wait(p,300);
  /* an answer changes: Submit is back; changed back, the body is the one sent, and it reads Sent again */
  await card(p,1);await p.locator('#main .q-inline').nth(0).locator('.pill-btn').nth(1).click();await wait(p,300);
  bt=await button(p);
  ok(!bt.hidden&&bt.label==='Submit'&&bt.aria==='false','after an answer changes, the button reads Submit again: '+JSON.stringify(bt));
  await pressSubmit(p);
  ok((await listed(p))[1].rows[0][1]==='Several days'&&toEndpoint().length===1,'and the confirm screen lists the changed answer; nothing sent');
  await p.locator('#submitCancel').click();await wait(p,200);
  await p.locator('#main .q-inline').nth(0).locator('.pill-btn').nth(PHQ[0]-1).click();await wait(p,300);
  bt=await button(p);
  ok(bt.label==='Sent'&&bt.aria==='true','changed back to what was sent, it reads Sent again: '+JSON.stringify(bt));
  await grabViol(p);
  await p.reload();await p.waitForFunction(()=>KEEP.ready);await wait(p,800);
  const after=await p.evaluate(id=>{const c=lsGet(bookKey(id));return {entry:readLib().entries.some(e=>e.id===id),copy:typeof c==='string'&&c.includes('phq9-item9'),listed:document.body.innerText.includes('Submit test questionnaire')};},bookId);
  ok(after.entry&&after.copy&&after.listed,'after a reload (same browser) the booklet is still in "Your booklets" with its answers: '+JSON.stringify(after));
  await p.waitForFunction(()=>typeof window.__open==='function');
  ok((await openBook(p,QUESTIONNAIRE,NAME)).ok===true&&sameJSON(sortKeys(await answers(p)),sortKeys(EXPECT)),'the host opening the same name again opens the kept copy, with the answers sent');
  bt=await button(p);
  ok(!bt.hidden&&bt.label==='Submit','and Submit is available again: what was sent is remembered in the page only, not across a reload: '+JSON.stringify(bt));
  await grabViol(p);await p.close();

  // 13 a refusal
  p=await newPage();
  ok((await openBook(p,QUESTIONNAIRE,NAME_B)).ok===true,'refusal run: the questionnaire opened (a name of its own)');
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
  const a4=await answers(p);
  ok(await hasEntry(p,id2)&&a4.email===EMAIL&&a4['phq9-item1']===3,'and the booklet and its answers are still kept');
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
  ok((await openBook(p,QUESTIONNAIRE,NAME_C)).ok===true,'400px run: the questionnaire opened');
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

  // 17 the interface in French; es-AR; an answer no question names
  p=await newPage();
  const nFr=toEndpoint().length;
  ok((await openBook(p,QUESTIONNAIRE,NAME_D)).ok===true,'French run: the questionnaire opened');
  await p.locator('#langGroup [data-lang="fr"]').click();await wait(p,300);
  await typeEmail(p);await toOverview(p);
  ok((await button(p)).label==='Envoyer','with the French interface the button reads Envoyer');
  /* an answer the booklet has no question for, as a file from an older version of it can hold */
  await p.evaluate(()=>{STATE.answers[""]["loose-note"]="kept from an older version";markDirty();});await wait(p,200);
  await pressSubmit(p);
  const fr=await listed(p),frBody=JSON.parse(await text(p,'#submitBody'));
  ok(await text(p,'#submitTitle')==='Envoyer vos réponses ?'&&await text(p,'#submitExact summary')==='Afficher exactement ce qui est envoyé'&&/Rien n’a encore été envoyé/.test(await text(p,'#submitHelp')),'the screen speaks French: '+await text(p,'#submitTitle'));
  const other=fr[fr.length-1]||{rows:[]};
  ok(other.title==='Autres réponses de ce carnet'&&sameJSON(other.rows,[['loose-note','kept from an older version']])&&frBody.answers['loose-note']==='kept from an older version','an answer no question names is listed by its id under "other answers", as it is sent: '+JSON.stringify(other));
  await shot(p,'submit-confirm-fr-1280.png');
  await p.locator('#submitCancel').click();await wait(p,200);
  const esAR=await p.evaluate(()=>{lang="es-AR";renderBar();const l=document.getElementById('btnSubmit').textContent.trim();render();return l;});
  ok(esAR==='Enviar','with the renderer\'s language es-AR, the button reads es (Enviar): '+esAR);
  await p.locator('#langGroup [data-lang="en"]').click();await wait(p,300);
  ok(toEndpoint().length===nFr,'the French run sent nothing');
  await grabViol(p);await p.close();

  // 11b what the reader saw, for every kind that has options: a booklet that already holds answers (made up)
  {const sent0=toApiOrigin().length,q=await newPage();
   const rr=await openBook(q,SEEN_FIXTURE,'test/submit-seen.md');
   ok(rr&&rr.ok===true,'the seen fixture opens as a host booklet: '+JSON.stringify(rr));
   await pressSubmit(q);
   let body=null;try{body=JSON.parse(await text(q,'#submitBody'));}catch(e){}
   ok(!!body&&sameJSON(body.answers,{note:'plain words',pick:2,several:[1,'my own'],mood:2,grid:[2,1,null],count:3,far:9,spot:['item-a']}),'answers carry the stored shape unchanged: a position, positions with the reader\'s own words, an anchor number, a number per matrix item: '+JSON.stringify(body&&body.answers));
   ok(!!body&&sameJSON(body.booklet,{id:'test/submit-seen',version:'0.7',lang:'en'}),'booklet: id, version and language as the file says them: '+JSON.stringify(body&&body.booklet));
   const s=(body&&body.seen)||{};
   ok(sameJSON(s.note,{question:'A note in your words'}),'a text question: its words, with the Markdown taken out (the answer is already words): '+JSON.stringify(s.note));
   ok(sameJSON(s.pick,{question:'Pick one',options:['Alpha','Beta','Gamma'],picked:['Beta']}),'a choice: the options in the order shown, the words picked, the Markdown taken out: '+JSON.stringify(s.pick));
   ok(sameJSON(s.several,{question:'Pick any, or add your own',options:['One','Two','Three'],picked:['One','my own']}),'a multi: the options, and the picked words with the reader\'s own option as they wrote it: '+JSON.stringify(s.several));
   ok(sameJSON(s.mood,{question:'How was it?',anchors:[{n:0,text:'Poor'},{n:1,text:'Fine'},{n:2,text:'Great'}],picked:'Great'}),'a scale: its anchors with their numbers, and the anchor\'s words picked: '+JSON.stringify(s.mood));
   ok(sameJSON(s.grid,{question:'Rate each',items:['Tea','Coffee','Juice'],anchors:[{n:1,text:'Dislike'},{n:2,text:'Like'}],picked:['Like','Dislike',null]}),'a matrix: its items, its anchors, and the words picked for each item, null for an item left alone: '+JSON.stringify(s.grid));
   ok(sameJSON(s.count,{question:'How many?'}),'a number: its question only: '+JSON.stringify(s.count));
   ok(sameJSON(s.far,{question:'Out of range',options:['Only option'],picked:['#9']}),'a position the list does not have reads #n, as the confirm screen does: '+JSON.stringify(s.far));
   const rows=await listed(q);const spotRow=rows.flatMap(g=>g.rows).find(r=>r[0]==='Pick what fits');
   ok(!!s.spot&&s.spot.question==='Pick what fits'&&typeof s.spot.picked==='string'&&s.spot.picked!==''&&!!spotRow&&s.spot.picked===spotRow[1],'a widget: its question and what its engine says was picked, the same words the confirm screen shows: '+JSON.stringify(s.spot)+' / '+JSON.stringify(spotRow));
   const raw=await text(q,'#submitBody');
   ok(!('logq' in s)&&!('logq' in body.answers)&&!/entry words kept|draft words typed/.test(raw),'a repeating activity\'s kept entries and draft are in neither answers nor seen');
   ok(Object.keys(s).sort().join()===Object.keys(body.answers).sort().join(),'seen has an entry for exactly the questions answers has (every one of these is a question the booklet names)');
   ok(Buffer.byteLength(JSON.stringify(body))<20000,'the body stays small (the seen fixture: '+Buffer.byteLength(JSON.stringify(body))+' bytes)');
   ok(toApiOrigin().length===sent0,'nothing has been sent by showing it');
   await q.close();}

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
