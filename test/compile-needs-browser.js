// Browser check of the rule for linking the optional script (compile/draw.js, needsScript): a compiled page that needs no
// script links none, and, opened in Chromium with scripting ON, it reads fully all the same.
// A made-up page is compiled that holds only things the script does nothing for: headings with their share links, a question
// with a hint and a solution but no right answer, a pick-one with a reply under each option, a table of one row, a line chart,
// a list. It asserts, in Chromium with scripting on (no script is linked, so none runs):
//   - the page links no script (only its JSON-LD block is a <script>), and the build report says none is needed;
//   - every sentence, heading, table value and option is visible (nothing the page says is hidden);
//   - the hint and the solution are closed as written and open by pressing their summary, with no script;
//   - an option's reply comes up when the option is pressed (the stylesheet does it);
//   - the share links are there and are plain links to the headings (following one goes to its heading);
//   - control: the same page with booklet.js added changes nothing a reader sees but the share link's copy (no button, no bar,
//     no new text), so the page lost nothing by not linking it.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/compile-needs-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]||path.join(__dirname,'..','booklet.html'));
const OUT=path.resolve(process.argv[3]||'.','compile-needs-pages');
const C=require('../compile/compile.js');
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};

fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const SRC='---\nbooklet: "0.17"\nid: test/quiet\ntitle: A quiet page\nlang: en\n---\n\n# A quiet page\n\n'
 +'This made-up page has prose, quiet sections and nothing that needs a script.\n\n'
 +'## First section\n\nWords in the first section, qzone-one.\n\n- a list item qzone-two\n- another list item\n\n'
 +'### A part of it\n\nWords in a part of it, qzone-three.\n\n'
 +'## Questions\n\n'
 +'> [!choice|like] Which do you like?\n- [ ] The kettle\n- [ ] The teapot\n\n'
 +'> [!hint]- Hint\n> Think of the morning, qzone-hint.\n\n> [!solution]- Solution\n> There is none, qzone-solution.\n\n'
 +'## Numbers\n\n```booklet query\nfrom: one\nas: table\nlabel: what\n```\n\n```booklet data\n{ "rows": [ { "what": "Plums", "n": 3 } ] }\n```\n^one\n\n'
 +'```booklet query\nfrom: days\nas: line\nlabel: day\nfields: oven\n```\n\n```booklet data\n{ "rows": [ { "day": "Mon", "oven": 220 }, { "day": "Tue", "oven": 230 }, { "day": "Wed", "oven": 210 } ] }\n```\n^days\n';
const run=C.compile([{text:SRC,name:'quiet',dir:OUT,}],{form:'standalone',renderer:HTML});
ok(run.results.every(r=>r.rep.ok),'the quiet page compiles with '+path.basename(HTML));
C.write(run,OUT,{force:true});
const file=path.join(OUT,'quiet','index.html'),html=fs.readFileSync(file,'utf8');
const scripts=(html.match(/<script\b[^>]*>/g)||[]);
ok(scripts.length===1&&/application\/ld\+json/.test(scripts[0]),'the page links no script (its only <script> is the JSON-LD block)');
ok(run.results[0].rep.needsScript===false&&!/Script:/.test(C.reportText(run))&&!fs.existsSync(path.join(OUT,'booklet','booklet.js')),'the report says no script is needed, and booklet.js is not written');
ok(html.includes('class="bk-anchor"')&&html.includes('data-bk-view="table"')&&html.includes('data-bk-view="line"')&&/class="bk-fold bk-compact bk-hint"/.test(html),'(set up) the page holds share links, a one-row table, a line chart, a hint and a solution');
/* the control: the same page with the script added */
const withScript=path.join(OUT,'quiet','with-script.html');
fs.writeFileSync(path.join(OUT,'booklet','booklet.js'),require('../compile/script.js').assemble().text);
fs.writeFileSync(withScript,html.replace('</body>','<script src="../booklet/booklet.js" defer></script>\n</body>'));

(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:900,height:900},javaScriptEnabled:true});
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto('file://'+file);
  const words=['qzone-one','qzone-two','qzone-three','A quiet page','First section','A part of it','Questions','Which do you like?','The kettle','The teapot','Plums','Mon','Wed','Numbers'];
  const seen=[];
  for(const w of words){const n=await p.getByText(w,{exact:false}).first().isVisible().catch(()=>false);if(!n) seen.push(w);}
  const text=await p.evaluate(()=>document.body.innerText);
  ok(!seen.length,'with scripting on and no script linked, every sentence, heading, value and option is visible'+(seen.length?' (not visible: '+seen.join(', ')+')':''));
  ok(await p.evaluate(()=>[...document.querySelectorAll('details')].filter(d=>d.classList.contains('bk-hint')||d.classList.contains('bk-solution')).every(d=>!d.open))
     &&await p.evaluate(()=>document.querySelectorAll('details.bk-hint,details.bk-solution').length===2),'the hint and the solution are closed as written');
  await p.locator('details.bk-hint summary').click();
  ok(await p.getByText('qzone-hint').isVisible(),'pressing the hint opens it, with no script');
  await p.locator('details.bk-solution summary').click();
  ok(await p.getByText('qzone-solution').isVisible(),'pressing the solution opens it, with no script');
  const a=await p.evaluate(()=>{const l=document.querySelectorAll('a.bk-anchor');return [...l].map(x=>x.getAttribute('href'));});
  ok(a.length>=3&&a.every(h=>h&&h.length>1&&h[0]==='#'),'the share links are plain same-page links ('+a.join(' ')+')');
  const target=await p.evaluate(h=>!!document.getElementById(h.slice(1)),a[0]);
  ok(target,'…and a share link names an id that is on the page');
  await p.locator('a.bk-anchor').first().click();
  ok(await p.evaluate(()=>location.hash.length>1),'following a share link goes to its heading (the address takes its #fragment)');
  ok(await p.evaluate(()=>document.querySelectorAll('button,[role=tablist],[role=switch]').length===0),'no button, tab bar or switch exists on the page');
  ok(!errs.length,'no error in the console'+(errs.length?': '+errs[0]:''));
  /* the same page with the script added shows the same words and no new control */
  const q=await ctx.newPage();await q.goto('file://'+withScript);
  const text2=await q.evaluate(()=>document.body.innerText);
  const added=await q.evaluate(()=>document.querySelectorAll('button,[role=tablist],[role=switch],.bk-tabbar').length);
  ok(added===0,'control: the same page with booklet.js added gains no button, tab bar or switch');
  const norm=t=>t.replace(/\s+/g,' ').trim();
  ok(norm(text)===norm(text2),'control: …and shows the same words');
  await b.close();
  console.log(fails.length?'\n'+fails.length+' FAILED':'\ncompile needs-script pages: all checks passed');process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
