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
 chk("the look-back activity holds two recalls, between its two headings",rc.length===2&&look.blocks.map(b=>b.type).join()==="markdown,recall,markdown,recall",JSON.stringify(look.blocks.map(b=>b.type)));
 chk("an embed of an activity id reads that activity, every question",rc[0].from==="log"&&rc[0].fields===undefined,JSON.stringify(rc[0]));
 chk("an embed of a question id reads its activity, that one question",rc[1].from==="log"&&rc[1].fields.join()==="situation",JSON.stringify(rc[1]));
 chk("the headings stay ordinary prose",/Your moments so far/.test(look.blocks[0].text)&&/Just what happened/.test(look.blocks[2].text));
 chk("a recall owns no answer slot",rc.every(b=>!("keys" in b)));
 /* an embed that names neither an activity nor a question is prose, as before */
 const fig=A.parseFile(FX.replace("![[#^situation]]","![[#^some-figure]]"));
 chk("an embed of an unknown id is left as prose",fig.template.modules[0].activities.find(a=>a.id==="look").blocks.filter(b=>b.type==="recall").length===1&&/some-figure/.test(JSON.stringify(fig.template.modules[0].activities.find(a=>a.id==="look").blocks)));
 /* a recall may come before the activity it names */
 const fwd=FX.replace(/(> \[!activity\|log repeat\][\s\S]*?)(> \[!activity\|look\][\s\S]*?)(> \[!module\|fixture-recall end\])/,"$2$1$3");
 chk("a recall may come before the activity it names",A.parseFile(fwd).template.modules[0].activities.find(a=>a.id==="look").blocks.filter(b=>b.type==="recall").length===2);}

/* ---- refused: a reference that leaves its module, or names something that keeps nothing ---- */
{const A=P.boot();
 /* a second module holds the target */
 const two=FX.replace("> [!module|fixture-recall end] End of Log and look back",
   "> [!module|fixture-recall end] End of Log and look back\n\n> [!module|other] Other\n\n> [!activity|elsewhere repeat] Elsewhere\n\n> [!text|far] Far away\n\n> [!module|other end] End of Other")
   .replace("![[#^log]]","![[#^elsewhere]]");
 const R=A.parseFile(two);
 const look=R.template.modules.find(m=>m.id==="fixture-recall");
 const lookAct=(look.activities||[look.mode]).find(a=>a.id==="look");
 chk("a recall pointing into another module is refused, with a reason",lookAct.blocks.filter(b=>b.type==="recall").length===1&&R.unread.some(p=>/elsewhere/.test(p)&&/not an activity of this module/.test(p)),JSON.stringify(R.unread));
 const once=FX.replace("> [!activity|log repeat]","> [!activity|log]");
 const R2=A.parseFile(once);
 chk("a recall of an activity that keeps no entries is refused",R2.template.modules[0].activities.find(a=>a.id==="look").blocks.every(b=>b.type!=="recall")&&R2.unread.some(p=>/keeps no entries/.test(p)),JSON.stringify(R2.unread));}

/* ---- drawing ---- */
(async()=>{
 P.wipe();const A=P.boot();
 await A.createBooklet();
 chk("the module installs",A.addModuleText(FX).ok);
 A.view="look";A.render();
 let seen=P.texts(P.main());
 chk("with nothing kept, the empty line shows under each recall",(seen.match(/Nothing kept here yet\./g)||[]).length===2,seen.slice(0,300));
 chk("the prose heading above a recall is drawn",seen.includes("Your moments so far"),seen.slice(0,300));

 const kept=A.keptFor("log");
 kept.push({ts:"2026-09-20T10:00:00.000Z",situation:"first thing",ease:2,secret:"hidden one"});
 kept.push({ts:"2026-09-22T10:00:00.000Z",situation:"second thing",ease:3,secret:"hidden two"});
 A.render();seen=P.texts(P.main());
 chk("both kept entries show, and the empty line is gone",/first thing/.test(seen)&&/second thing/.test(seen)&&!/Nothing kept here yet/.test(seen),seen.slice(0,500));
 chk("a scale answer shows its anchor, not the number",/Very/.test(seen)&&/A little/.test(seen),seen.slice(0,500));
 chk("an embed of one question shows only that question: “Private note” appears once per entry, in the whole-activity recall only",
   (seen.match(/hidden one/g)||[]).length===1&&(seen.match(/hidden two/g)||[]).length===1,seen.slice(0,700));
 chk("newest first",seen.indexOf("second thing")<seen.indexOf("first thing"),seen.slice(0,500));

 /* the lookup itself: the same call a widget engine will use */
 chk("recallEntries reads a sibling activity's kept entries, newest first",A.recallEntries("log","look").length===2&&A.recallEntries("log","look")[0].ts>=A.recallEntries("log","look")[1].ts);
 chk("and reads nothing across a module boundary",A.recallEntries("log","nowhere").length===0);
 console.log(fails?"\n"+fails+" FAILURES":"\nrecall checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
