// A `booklet query` block: one activity showing what another kept, read-only,
// within its own module. Run: node test/query.test.js
const P=require("./page.js");
const fs=require("fs");
const FX=fs.readFileSync(P.R+"/test/fixtures/module-query.md","utf8");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const actOf=(R,mod,id)=>R.template.modules.find(m=>m.id===mod).activities.find(a=>a.id===id);

/* ---- parsing ---- */
{const A=P.boot();
 const R=A.parseFile(FX);
 chk("the fixture parses with nothing reported wrong",R.ok&&R.unread.length===0,JSON.stringify(R.unread));
 const look=actOf(R,"fixture-query","look");
 const qs=look.blocks.filter(b=>b.type==="query");
 chk("the look-back activity holds three queries, between its headings",qs.length===3&&look.blocks.map(b=>b.type).join()==="markdown,query,markdown,query,markdown,query",JSON.stringify(look.blocks.map(b=>b.type)));
 chk("`from:` an activity reads that activity, every question",qs[0].from==="log"&&!qs[0].field&&qs[0].fields===undefined,JSON.stringify(qs[0]));
 chk("`from:` a question reads its activity, that one question",qs[1].from==="log"&&qs[1].field==="situation",JSON.stringify(qs[1]));
 chk("`fields`, `limit` and `empty` are read",qs[2].fields.join()==="ease,situation"&&qs[2].view.limit===1&&qs[2].empty==="Nothing logged yet.",JSON.stringify(qs[2]));
 chk("the prose headings stay ordinary prose",/Your moments so far/.test(look.blocks[0].text)&&/Just what happened/.test(look.blocks[2].text));
 chk("a query owns no answer slot",qs.every(b=>!("keys" in b))&&P.src.includes('"markdown","callout","query"'));
 /* a query may come before the activity it names */
 const fwd=FX.replace(/(> \[!activity\|log repeat\][\s\S]*?)(> \[!activity\|look\][\s\S]*?)(> \[!module\|fixture-query end\])/,"$2$1$3");
 chk("a query may come before the activity it names",actOf(A.parseFile(fwd),"fixture-query","look").blocks.filter(b=>b.type==="query").length===3);
 /* a body that is not key: value lines is refused */
 const bad=A.parseFile(FX.replace("from: situation","from situation"));
 chk("a query body that is not `key: value` is refused, with a reason",actOf(bad,"fixture-query","look").blocks.filter(b=>b.type==="query").length===2&&bad.unread.some(p=>/key: value/.test(p)),JSON.stringify(bad.unread));}

/* ---- refused: a reference that leaves its module, or names something that keeps nothing ---- */
{const A=P.boot();
 const refused=(label,text,re,left=2)=>{const R=A.parseFile(text);
   const n=actOf(R,"fixture-query","look").blocks.filter(b=>b.type==="query").length;
   chk(label,n===left&&R.unread.some(p=>re.test(p)),n+" left; "+JSON.stringify(R.unread));};
 refused("a query into another module's activity is refused",FX.replace("from: situation","from: elsewhere"),/elsewhere.*another module/);
 refused("a query into another module's question is refused",FX.replace("from: situation","from: far"),/far.*another module/);
 refused("a query naming nothing is refused",FX.replace("from: situation","from: nowhere"),/nowhere.*nothing in this module/);
 refused("a query with no `from:` is refused",FX.replace("from: situation","empty: hi"),/nothing in this module/);
 refused("a query of an activity that keeps no entries is refused",FX.replace("> [!activity|log repeat]","> [!activity|log]").replace("from: situation","from: log"),/keeps no entries/,0);
 /* a file with no module fence is one module: bare activities may read each other */
 const bare=`---\nbooklet: 0.7\ntitle: Bare\nlang: en\n---\n\n> [!activity|log repeat] Log\n\n> [!text|what] What?\n\n> [!activity|look] Look\n\n\`\`\`booklet query\nfrom: log\n\`\`\`\n`;
 const R=A.parseFile(bare);
 chk("in a file with no module fence, one activity may query another",R.unread.length===0&&R.template.modules.some(m=>(m.mode?[m.mode]:m.activities).some(a=>a.id==="look"&&a.blocks.some(b=>b.type==="query"))),JSON.stringify(R.unread));}

/* ---- drawing ---- */
(async()=>{
 P.wipe();const A=P.boot();
 await A.createBooklet();
 chk("the module installs",A.addModuleText(FX).ok);
 A.screen="look";A.render();
 let seen=P.texts(P.main());
 chk("with nothing kept, the empty line shows (the block's own, or the renderer's)",(seen.match(/Nothing kept here yet\./g)||[]).length===2&&(seen.match(/Nothing logged yet\./g)||[]).length===1,seen.slice(0,400));
 chk("the prose heading above a query is drawn",seen.includes("Your moments so far"),seen.slice(0,300));

 const kept=A.keptFor("log");
 kept.push({ts:"2026-09-20T10:00:00.000Z",situation:"first thing",ease:2,secret:"hidden one"});
 kept.push({ts:"2026-09-22T10:00:00.000Z",situation:"second thing",ease:3,secret:"hidden two"});
 A.render();seen=P.texts(P.main());
 chk("kept entries show, and the empty lines are gone",/first thing/.test(seen)&&/second thing/.test(seen)&&!/Nothing kept here yet|Nothing logged yet/.test(seen),seen.slice(0,600));
 chk("a scale answer shows its anchor, not the number",/Very/.test(seen)&&/A little/.test(seen),seen.slice(0,600));
 chk("the query of one question shows only that question: “hidden” appears once per entry, from the whole-activity query",
   (seen.match(/hidden one/g)||[]).length===1&&(seen.match(/hidden two/g)||[]).length===1,seen);
 chk("newest first",seen.indexOf("second thing")<seen.indexOf("first thing"),seen.slice(0,500));
 chk("`limit: 1` shows only the latest entry in that query (each answer appears: 2 queries show both, the third only one)",
   (seen.match(/first thing/g)||[]).length===2&&(seen.match(/second thing/g)||[]).length===3,seen);
 chk("`fields` sets the order: the scale answer comes before the text answer in the third query",
   seen.lastIndexOf("Very")<seen.lastIndexOf("second thing"),seen.slice(-300));
 chk("a draft in progress is never shown",(A.draftFor("log").situation="draft only",A.render(),!/draft only/.test(P.texts(P.main()))));

 /* a query never enters the records: the file keeps the block as design, and writes no answer of its own */
 const md=A.toMarkdown();
 chk("the records hold no answer for the query's activity, and the block stays in the design",
   !/booklet (answers|entries|draft) look/.test(md)&&/```booklet query\nfrom: log/.test(md),md.slice(-400));

 /* a question of an activity that keeps nothing shows its one answer, without a date */
 const board=FX.replace("> [!activity|log repeat]","> [!activity|log]").replace(/from: log\n/g,"from: situation\n").replace(/fields: .*\n/,"");
 P.wipe();const B=P.boot();await B.createBooklet();B.addModuleText(board);
 B.STATE.answers.situation="my one answer";B.screen="look";B.render();
 chk("a question of a non-repeating activity shows its one answer",/my one answer/.test(P.texts(P.main())));

 /* the lookup itself */
 P.wipe();const C=P.boot();await C.createBooklet();C.addModuleText(FX);
 C.keptFor("log").push({ts:"2026-09-20T10:00:00.000Z",situation:"a"},{ts:"2026-09-22T10:00:00.000Z",situation:"b"});
 chk("queryEntries reads a sibling activity's kept entries, newest first",C.queryEntries("log","look").length===2&&C.queryEntries("log","look")[0].ts>C.queryEntries("log","look")[1].ts);
 chk("and reads nothing across a module boundary",C.queryEntries("log","elsewhere").length===0);
 console.log(fails?"\n"+fails+" FAILURES":"\nquery checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
