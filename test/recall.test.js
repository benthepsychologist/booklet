// A recall block: one activity showing another's kept entries, read-only,
// within its own module. Run: node test/recall.test.js
const P=require("./page.js");
const fs=require("fs");
const FX=fs.readFileSync(P.R+"/test/fixtures/module-recall.md","utf8");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};

/* ---- parsing ---- */
{const A=P.boot();
 const R=A.parseFile(FX);
 chk("the fixture parses with nothing reported wrong",R.ok&&R.unread.length===0,JSON.stringify(R.unread));
 const acts=R.template.modules[0].activities;
 const look=acts.find(a=>a.id==="look");
 const rc=look.blocks.filter(b=>b.type==="recall");
 chk("the look-back activity holds two recall blocks",rc.length===2,JSON.stringify(look.blocks.map(b=>b.type)));
 chk("the first reads activity “log”, two fields, capped at five",rc[0].from==="log"&&rc[0].fields.join()==="situation,ease"&&rc[0].limit===5&&rc[0].title==="Your moments so far",JSON.stringify(rc[0]));
 chk("the second names no fields and no limit",rc[1].fields===undefined&&rc[1].limit===undefined,JSON.stringify(rc[1]));
 chk("a recall owns no answer slot",look.blocks.every(b=>b.type!=="recall"||!("keys" in b)));}

/* ---- refused: a reference that leaves its module, or names something that keeps nothing ---- */
{const A=P.boot();
 const cross=FX.replace("from=log fields","from=elsewhere fields");
 const R=A.parseFile(cross);
 const look=R.template.modules[0].activities.find(a=>a.id==="look");
 chk("a recall naming an activity outside the module is refused",look.blocks.filter(b=>b.type==="recall").length===1&&R.unread.some(p=>/elsewhere/.test(p)&&/not an activity of this module/.test(p)),JSON.stringify(R.unread));
 const once=FX.replace("> [!activity|log repeat]","> [!activity|log]");
 const R2=A.parseFile(once);
 chk("a recall of an activity that keeps no entries is refused",R2.template.modules[0].activities.find(a=>a.id==="look").blocks.every(b=>b.type!=="recall")&&R2.unread.some(p=>/keeps no entries/.test(p)),JSON.stringify(R2.unread));
 const bare=FX.replace("> [!recall|moments from=log fields=situation,ease limit=5]","> [!recall|moments fields=situation]");
 chk("a recall with no from= is reported",A.parseFile(bare).unread.some(p=>/no from=/.test(p)));}

/* ---- drawing ---- */
(async()=>{
 P.wipe();const A=P.boot();
 await A.createBooklet();
 chk("the module installs",A.addModuleText(FX).ok);
 A.view="look";A.render();
 let seen=P.texts(P.main());
 chk("with nothing kept, the empty line shows under each recall",(seen.match(/Nothing kept here yet\./g)||[]).length===2,seen.slice(0,300));
 chk("the recall's title is drawn",seen.includes("Your moments so far"),seen.slice(0,300));

 const kept=A.keptFor("log");
 kept.push({ts:"2026-09-20T10:00:00.000Z",situation:"first thing",ease:2,secret:"hidden one"});
 kept.push({ts:"2026-09-22T10:00:00.000Z",situation:"second thing",ease:3,secret:"hidden two"});
 A.render();seen=P.texts(P.main());
 chk("both kept entries show, and the empty line is gone",/first thing/.test(seen)&&/second thing/.test(seen)&&!/Nothing kept here yet/.test(seen),seen.slice(0,500));
 chk("a scale answer shows its anchor, not the number",/Very/.test(seen)&&/A little/.test(seen),seen.slice(0,500));
 chk("fields= keeps a question out: the first recall omits “Private note” while the second shows it",
   (seen.match(/hidden one/g)||[]).length===1&&(seen.match(/hidden two/g)||[]).length===1,seen.slice(0,700));
 chk("newest first",seen.indexOf("second thing")<seen.indexOf("first thing"),seen.slice(0,500));

 /* limit= */
 const many=A.keptFor("log");for(let i=0;i<7;i++) many.push({ts:"2026-09-2"+(3+i%6)+"T0"+i+":00:00.000Z",situation:"extra "+i,ease:1});
 A.render();seen=P.texts(P.main());
 const heads=(seen.split("Everything you kept")[0].match(/extra|first thing|second thing/g)||[]).length;
 chk("limit=5 shows five entries in the first recall",heads===5,String(heads));

 /* the lookup itself: the same call a widget engine will use */
 chk("recallEntries reads a sibling activity's kept entries, newest first",A.recallEntries("log","look").length===9&&A.recallEntries("log","look")[0].ts>=A.recallEntries("log","look")[8].ts);
 chk("and reads nothing across a module boundary",A.recallEntries("log","nowhere").length===0);
 console.log(fails?"\n"+fails+" FAILURES":"\nrecall checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
