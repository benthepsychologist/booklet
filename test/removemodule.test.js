// Remove a module (0.10.2): its fence, its own data section, its records and the reader's work in it go, and nothing else.
// Invented content only. Run: node test/removemodule.test.js   (Needs node and python3; nothing to install.)
const P=require("./page.js");
const fs=require("fs"),os=require("os"),path=require("path"),{spawnSync}=require("child_process");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const count=(s,sub)=>s.split(sub).length-1;
const FM="---\nbooklet: \"0.10\"\ntitle: Remove test\nlang: en\n---\n\n";
/* one module: an answered-once activity (note), a repeating one (log), a widget on a block that every module
   names the same way, and its own data section; module B also reads the booklet's shared block */
const mod=(id,t,shared)=>`> [!module|${id}] Module ${t}\n\n> [!activity|act] Answer ${t}\n\n> [!text|note] Note ${t}\n\n> [!widget|w] Pick\n> ![[#^picker]]\n\n> [!activity|log repeat] Log ${t}\n\n> [!text|what] What ${t}\n\n`+(shared?"> [!activity|look] Look\n\n```booklet query\nfrom: rows\n```\n\n":"")+`> [!module|${id} end] End\n`;
const dat=(id)=>`> [!data|${id}] Data for ${id}\n\n\`\`\`booklet widget\n{ "engine": "grid-select" }\n\`\`\`\n^picker\n`;
const SRC=FM+mod("ma","A")+"\n"+mod("mb","B",true)+"\n"+mod("mc","C")+"\n> [!data] Data\n\n```booklet data\n[{\"a\": 1}]\n```\n^rows\n\n"+dat("ma")+"\n"+dat("mb")+"\n"+dat("mc");
const section=(md,id)=>{const i=md.indexOf("> [!records|"+id+"]");if(i<0) return "";const j=md.indexOf("> [!records|",i+5);return md.slice(i,j<0?md.length:j);};
const typeIn=(A,addr,words)=>{A.screen=addr;A.render();const ta=P.find(P.main(),x=>x.tagName==="textarea")[0];ta.value=words;ta._on.input();};
const keep=(A,id,words,n)=>{for(let i=0;i<n;i++){A.draftFor(id).what=words+" "+i;A.finalizeEntry(id);}};
const LINT=path.join(P.R,"lint-booklet.py"),TMP=fs.mkdtempSync(path.join(os.tmpdir(),"rm-"));
const lint=md=>{const f=path.join(TMP,"x.booklet.md");fs.writeFileSync(f,md);const r=spawnSync("python3",[LINT,f],{encoding:"utf8"});return {status:r.status,errors:r.stdout.split("\n").filter(l=>l.startsWith("ERROR")),out:r.stdout};};
const mods=A=>A.allModules().map(m=>m.id).join();
const order=src=>[...src.matchAll(/\[!module\|([^\] ]+)\]/g)].map(m=>m[1]).join();
/* a booklet with work in every module */
const work=()=>{P.wipe();const A=P.boot();A.loadText(SRC);
  for(const id of ["ma","mb","mc"]){typeIn(A,id+"/act","answer in "+id);keep(A,id+"/log","kept in "+id,id==="mb"?4:2);A.draftFor(id+"/log").what="draft in "+id;}
  return A;};

/* ---- remove B ---- */
{const A=work();const before=A.toMarkdown();
 const aAns=JSON.stringify(A.STATE.answers.ma),cAns=JSON.stringify(A.STATE.answers.mc),aEnt=JSON.stringify(A.STATE.entries["ma/log"]),cEnt=JSON.stringify(A.STATE.entries["mc/log"]),aDr=JSON.stringify(A.DRAFTS.custom["ma/log"]),cDr=JSON.stringify(A.DRAFTS.custom["mc/log"]);
 const recA=section(before,"ma"),recC=section(before,"mc");
 chk("the fixture holds three modules and B's work",mods(A)==="ma,mb,mc"&&section(before,"mb").includes("kept in mb")&&before.includes("[!data|mb]"));
 const r=A.removeModule("mb");
 chk("removing B succeeds",r.ok===true,JSON.stringify(r));
 const out=A.toMarkdown(),src=A.BOOK.raw.source;
 chk("A and C remain, in order, in the source, in the written file and in the booklet",order(src)==="ma,mc"&&order(out)==="ma,mc"&&mods(A)==="ma,mc");
 chk("the written file has no trace of B: no fence, no data section, no records, no entry, answer or draft",
   !/\[!module\|mb/.test(out)&&!out.includes("[!data|mb]")&&!out.includes("[!records|mb]")&&!/ in mb|Module B|Answer B/.test(out),out);
 chk("the shared data block is still there",out.includes("[!data] Data")&&out.includes("^rows"));
 chk("A's and C's records are byte for byte what they were",section(out,"ma")===recA&&section(out,"mc")===recC);
 chk("A's and C's answers, entries and drafts are what they were",JSON.stringify(A.STATE.answers.ma)===aAns&&JSON.stringify(A.STATE.answers.mc)===cAns&&JSON.stringify(A.STATE.entries["ma/log"])===aEnt&&JSON.stringify(A.STATE.entries["mc/log"])===cEnt&&JSON.stringify(A.DRAFTS.custom["ma/log"])===aDr&&JSON.stringify(A.DRAFTS.custom["mc/log"])===cDr);
 chk("B's answers, entries and drafts are gone from memory",!A.STATE.answers.mb&&!(A.STATE.entries||{})["mb/log"]&&!(A.DRAFTS.custom||{})["mb/log"]);
 chk("B's widgets are gone and A's and C's stay",!(A.BOOK.widgets||[]).some(w=>w.module==="mb")&&(A.BOOK.widgets||[]).filter(w=>w.module==="ma").length===1&&(A.BOOK.widgets||[]).filter(w=>w.module==="mc").length===1);
 const R=A.parseFile(out);
 chk("the written file parses with no problems",R.ok&&R.unread.length===0&&R.refused.length===0,JSON.stringify([R.unread,R.refused]));
 const L=lint(out);chk("and lints with no errors",L.status===0&&L.errors.length===0,L.out);
 chk("the booklet is marked as changed",A.BOOK.customized===true);
 chk("only B's lines left the source: every other line is still there, in order",(()=>{const a=before.split("\n"),b=out.split("\n");let j=0;for(const ln of b){while(j<a.length&&a[j]!==ln) j++;if(j>=a.length) return false;j++;}return true;})());
 chk("no run of blank lines is left where B was",!/\n\n\n\n/.test(src));}

/* ---- the counts the confirmation shows ---- */
{const A=work();
 const w=A.moduleWork(A.allModules().find(m=>m.id==="mb")),wa=A.moduleWork(A.allModules().find(m=>m.id==="ma"));
 chk("counts match what was kept: B has 4 entries, 1 answer, 1 unfinished draft",w.entries===4&&w.answers===1&&w.drafts===1,JSON.stringify(w));
 chk("and A has 2 entries and 1 answer",wa.entries===2&&wa.answers===1,JSON.stringify(wa));
 P.wipe();const E=P.boot();E.loadText(SRC);
 const n=E.moduleWork(E.allModules().find(m=>m.id==="mb"));
 chk("a module with nothing kept counts nothing",n.entries===0&&n.answers===0&&n.drafts===0,JSON.stringify(n));
 const T=E.STRINGS.en.notice;
 chk("the confirmation says so in words, with counts",T.removeAsk("Daily journal",[T.removeN.entries(12),T.removeN.answers(3)])==="This removes “Daily journal” from this booklet, with 12 entries and 3 answers you kept in it. Download a copy first if you want to keep that work."
   &&T.removeAsk("X",[])==="This removes “X” from this booklet."&&T.removeAsk("X",[T.removeN.entries(1)]).includes("with 1 entry you kept"));
 for(const l of ["fr","es","es-AR"]){const t=E.STRINGS[l]&&E.STRINGS[l].notice;if(l==="es-AR"&&!t) continue;
   chk(l+": the control, the question and the buttons are written",!!t&&[t.remove,t.removeGo,t.removeKeep].every(x=>typeof x==="string"&&x.length)&&/Daily/.test(t.removeAsk("Daily",[t.removeN.entries(2)]))&&typeof t.removed("Daily")==="string");}}

/* ---- remove the last module ---- */
{P.wipe();const A=P.boot();A.loadText(FM+mod("only","O")+"\n"+dat("only"));
 typeIn(A,"only/act","hello");keep(A,"only/log","one",1);
 const r=A.removeModule("only");const out=A.toMarkdown();
 const R=A.parseFile(out);
 chk("the last module removed leaves an empty, named booklet whose file round-trips",r.ok&&mods(A)===""&&R.ok&&R.empty===true&&R.template.title==="Remove test"&&!/\[!(module|data|records)/.test(out)&&A.parseFile(out).refused.length===0,out);
 const L=lint(out);chk("and it lints with no errors",L.errors.length===0,L.out);
 P.wipe();const B=P.boot();B.loadText(out);
 chk("and opens as an empty named booklet",B.allModules().length===0&&B.toMarkdown()===out);}

/* ---- remove, then add it again: empty, once ---- */
{const A=work();const mbText=FM+mod("mb","B",false)+"\n"+dat("mb");
 A.removeModule("mb");
 const r=A.addModuleText(mbText);const out=A.toMarkdown();
 chk("adding the same module again puts it back, once",r.ok&&mods(A)==="ma,mc,mb"&&count(out,"[!module|mb]")===1&&count(out,"[!data|mb]")===1,JSON.stringify(r));
 chk("and it starts empty",!A.STATE.answers.mb&&((A.STATE.entries||{})["mb/log"]||[]).length===0&&!section(out,"mb")&&!/ in mb/.test(out));}

/* ---- two modules sharing a question id and a block id: removing one leaves the other's alone ---- */
{const A=work();
 A.removeModule("ma");const out=A.toMarkdown();
 chk("A and B and C all use `note` and `^picker`: removing A leaves B's and C's answers and blocks alone",
   A.STATE.answers.mb.note==="answer in mb"&&A.STATE.answers.mc.note==="answer in mc"&&!A.STATE.answers.ma&&count(out,"\n^picker")===2&&out.includes("[!data|mb]")&&out.includes("[!data|mc]")&&(A.BOOK.widgets||[]).filter(w=>w.module==="mb").length===1,out);
 chk("and the reader still reads them: the file reads back with both answers",(()=>{P.wipe();const B=P.boot();B.loadText(out);return B.STATE.answers.mb.note==="answer in mb"&&B.STATE.answers.mc.note==="answer in mc"&&mods(B)==="mb,mc";})());}

/* ---- the screen was on the removed module's activity ---- */
{const A=work();A.screen="mb/log";A.render();
 let err=null;try{A.removeModule("mb");A.screen="home";A.render();}catch(e){err=e;}
 chk("afterwards the home screen shows, with no error",!err&&A.screen==="home"&&!/Module B/.test(P.texts(P.main()))&&/Module A/.test(P.texts(P.main())),err&&String(err.stack));
 const B=work();B.screen="mb/log";B.render();B.removeModule("mb");
 let e2=null;try{B.render();}catch(e){e2=e;}
 chk("even a render left on the removed activity does not throw",!e2,e2&&String(e2.stack));}

/* ---- the control: where it is, that it asks, that Cancel and Escape change nothing, that a title is text ---- */
{const A=work();
 const btn=(n,t)=>P.find(n,x=>x.tagName==="button"&&P.texts(x)===t);
 A.screen="mb/log";A.render();
 const ctl=btn(P.main(),"Remove this module");
 chk("a module of several activities shows the control on its own screen, not on an activity's",ctl.length===0);
 A.screen=A.moduleScreen("mb");A.render();
 const c1=btn(P.main(),"Remove this module");
 chk("the module's own screen has \"Remove this module\"",c1.length===1);
 c1[0]._on.click();
 const asks=P.find(P.main(),x=>(x.attrs||{}).role==="alert");
 chk("pressing it asks, in place, with the title and the counts",asks.length===1&&/This removes “Module B” from this booklet, with 4 entries, 1 answer and 1 unfinished draft you kept in it/.test(P.texts(asks[0])),P.texts(P.main()).slice(-400));
 btn(P.main(),"Cancel")[0]._on.click();
 chk("Cancel changes nothing",mods(A)==="ma,mb,mc"&&A.STATE.answers.mb&&A.keptFor("mb/log").length===4&&btn(P.main(),"Remove this module").length===1&&P.find(P.main(),x=>(x.attrs||{}).role==="alert").length===0);
 btn(P.main(),"Remove this module")[0]._on.click();
 const al=P.find(P.main(),x=>(x.attrs||{}).role==="alert")[0];
 al._on.keydown({key:"Escape",preventDefault(){},stopPropagation(){}});
 chk("Escape changes nothing either",mods(A)==="ma,mb,mc"&&A.keptFor("mb/log").length===4&&P.find(P.main(),x=>(x.attrs||{}).role==="alert").length===0);
 btn(P.main(),"Remove this module")[0]._on.click();btn(P.main(),"Remove")[0]._on.click();
 chk("Remove removes: home screen, module gone",mods(A)==="ma,mc"&&A.screen==="home"&&!/Module B/.test(P.texts(P.main())));
 /* a one-activity module: the control is at the foot of the activity */
 P.wipe();const B=P.boot();B.loadText(FM+"> [!module|solo] Solo <b>x</b>\n\n> [!activity|act] Solo\n\n> [!text|note] Note\n\n> [!module|solo end] End\n");
 B.screen="solo/act";B.render();
 const s=btn(P.main(),"Remove this module");
 chk("a one-activity module shows it at the foot of the activity, and the home cards do not",s.length===1&&(B.screen="home",B.render(),btn(P.main(),"Remove this module").length===0));
 B.screen="solo/act";B.render();btn(P.main(),"Remove this module")[0]._on.click();
 const t=P.texts(P.find(P.main(),x=>(x.attrs||{}).role==="alert")[0]);
 chk("a title is text: markup in it is shown as written",t.includes("<b>x</b>"),t);}

/* ---- a module that is not in the booklet, or has no id: nothing happens ---- */
{const A=work();const before=A.toMarkdown();
 chk("an unknown module changes nothing",A.removeModule("nope").ok===false&&A.removeModule("").ok===false&&A.toMarkdown()===before&&mods(A)==="ma,mb,mc");}

try{fs.rmSync(TMP,{recursive:true,force:true});}catch(e){}
P.closePages();
console.log(fails?"\n"+fails+" FAILED":"\nALL PASSED");process.exit(fails?1:0);
