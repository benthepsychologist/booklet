// Format v0.7: the shared row model. Five roles (label, value, note, badge, tone) read the same way in every view,
// `fields:` has one meaning (the other fields to show), and each view draws only what VIEW_DRAWS says it draws.
// Run: node test/roles.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const byClass=(n,c)=>walk(n,x=>cls(x).includes(c));
const text=n=>typeof n==="string"?n:(n&&n._text)||kids(n).map(text).join("");
const tones=n=>walk(n,x=>cls(x).some(c=>/^tone-/.test(c)));
(async()=>{
 const A=P.boot();
 const draw=(rows,view,fields)=>A.viewNodes(A.dataSet({rows}),{...view,fields},{empty:"EMPTY"})[0];

 /* ---- the resolver ---- */
 {const set=A.dataSet({rows:[{label:"L",value:3,note:"N",badge:"B",tone:"good"}]});
  const r=A.rolesOf(set,{},"list");
  chk("each role is read from the field of its own name",r.label==="label"&&r.value==="value"&&r.note==="note"&&r.badge==="badge"&&r.tone==="tone",JSON.stringify(r));
  const s2=A.dataSet({rows:[{name:"x",n:3,why:"y",kind:"k",mood:"warn"}]});
  const e=A.rolesOf(s2,{label:"name",value:"n",note:"why",badge:"kind",tone:"mood"},"list");
  chk("a query key points a role at a field with another name",e.label==="name"&&e.value==="n"&&e.note==="why"&&e.badge==="kind"&&e.tone==="mood",JSON.stringify(e));
  const f=A.rolesOf(s2,{},"list");
  chk("the label falls back to the source's first field, and a role no row carries is null",f.label==="name"&&f.value===null&&f.note===null&&f.badge===null&&f.tone===null,JSON.stringify(f));
  const g=A.rolesOf(A.dataSet({rows:[{label:"",value:"",note:"n"}]}),{},"list");
  chk("a role whose every value is empty counts as not carried",g.label===null&&g.value===null&&g.note==="note",JSON.stringify(g));
  const h=A.rolesOf(set,{},"bars");
  chk("a role the view does not draw is null (bars draw label, value and tone only)",h.label==="label"&&h.value==="value"&&h.tone==="tone"&&h.note===null&&h.badge===null,JSON.stringify(h));
  chk("the fallback uses the first field of the source whatever `fields:` says",A.dataSet({fields:{z:"Z",a:"A"},rows:[{a:1,z:2}]}).first==="z"&&A.dataSet({rows:[{b:1,a:2}]}).first==="b");}
 chk("rowTone reads good, warn and bad exactly as written (values are not read without regard to case), and nothing else",
   A.rowTone({t:"Good"},{tone:"t"})===""&&A.rowTone({t:" warn "},{tone:"t"})==="warn"&&A.rowTone({t:"bad"},{tone:"t"})==="bad"&&A.rowTone({t:"ok"},{tone:"t"})===""&&A.rowTone({t:"good"},{tone:null})==="");
 {const p=A.pill("hi","warn");chk("a pill is a span with the pill class and a tone class",p.tagName==="span"&&cls(p).join()==="pill,tone-warn"&&text(p)==="hi"&&cls(A.pill("x","")).join()==="pill");}

 /* ---- each view draws only what VIEW_DRAWS says: a sentinel field, pointed at by each key ---- */
 const ROWS=[{a:"alpha-1",s:"SENT-1",sn:61.5,o:"other-1",t:"good"},{a:"alpha-2",s:"SENT-2",sn:62.5,o:"other-2",t:"warn"}];
 const VIEWS=["table","list","tiles","bars","line"];
 for(const as of VIEWS){
   const draws=A.VIEW_DRAWS[as];
   for(const key of ["label","note","badge","group"]){
     if(as==="table"&&key==="badge") continue;       /* a table's badge is a column: see below */
     const out=text(draw(ROWS,{as,[key]:"s"},["o"])),seen=out.includes("SENT-1");
     chk(`${as}: \`${key}: s\` ${draws.includes(key)?"draws":"does not draw"} the field`,seen===draws.includes(key),out.slice(0,200));}
   {const key="value",out=text(draw(ROWS,{as,value:"sn"},as==="line"?undefined:["o"])),seen=out.includes("61.5");
    chk(`${as}: \`value: sn\` ${draws.includes(key)?"draws":"does not draw"} the field`,seen===draws.includes(key),out.slice(0,200));}
   {const out=text(draw(ROWS,{as,tone:"t"},["o"])),seen=/Good/.test(out);
    chk(`${as}: \`tone: t\` ${draws.includes("tone")&&as!=="table"?"is said in words":"is not drawn here"}`,seen===(draws.includes("tone")&&as!=="table"),out.slice(0,200));}
   {const out=text(draw(ROWS,{as},["s"])),seen=out.includes("SENT-1")||(as==="line"&&false);
    const want=as==="table"||as==="list"||as==="line";    /* a line's series are named by it, and the numbers table shows them */
    chk(`${as}: \`fields: s\` ${want?"shows":"does not show"} the field`,seen===want,out.slice(0,200));}
   {const out=text(draw(ROWS,{as},["o"]));
    chk(`${as}: with \`fields: o\` and no role keys, the sentinel field is not shown`,!out.includes("SENT-1"));}
 }
 {const sn=text(draw(ROWS,{as:"line"},["sn"]));chk("line: `fields: sn` draws the number field as the series",/61\.5/.test(sn));}
 {const n=draw(ROWS,{as:"line",value:"sn"},undefined);chk("line: without `fields:` it draws the value role's field",/61\.5/.test(text(n))&&byClass(n,"ch-pt").length===2);}
 /* a table's badge and tone: a column whose field is the badge role is drawn as pills, toned by the row's tone */
 {const n=draw([{a:"r1",b:"Late",t:"bad"},{a:"r2",b:"Done",t:"good"},{a:"r3",b:"Plain"}],{as:"table",badge:"b",tone:"t"},["a","b"]);
  const pills=byClass(n,"pill");
  chk("table: the badge column is drawn as pills, toned by the row's tone",pills.length===3&&cls(pills[0]).includes("tone-bad")&&cls(pills[1]).includes("tone-good")&&!pills[2].attrs.class.includes("tone-"),pills.map(p=>p.attrs.class).join("|"));
  chk("table: the tone is also said in words",text(n).includes("Needs action")&&text(n).includes("Good"));
  const m=draw([{a:"r1",b:"Late",t:"bad"}],{as:"table",badge:"b",tone:"t"},["a"]);
  chk("table: a badge that is not one of the columns is not drawn",byClass(m,"pill").length===0&&!text(m).includes("Late"));
  const o=draw([{a:"r1",b:"Late",t:"bad"}],{as:"table"},["a","b"]);
  chk("table: with no badge key, the field `b` is an ordinary column, and the field `badge` is only a badge when it exists",byClass(o,"pill").length===0);
  const q=draw([{a:"r1",badge:"Late"}],{as:"table"},["a","badge"]);
  chk("table: a field named `badge` is drawn as a pill without any key",byClass(q,"pill").length===1);}
 /* the list's extras */
 {const rows=[{label:"L1",value:3,note:"N1",badge:"B1",tone:"good",owner:"O1",id:"i1",parent:"",stage:"G1",extra:"X1"}];
  const n=A.viewNodes(A.dataSet({rows}),{as:"list",group:"stage"},{})[0],f=byClass(n,"dv-f").map(x=>x.attrs.title);
  chk("list: the extras default to the fields that play no role, are not the group, the parent or `id`",f.join()==="owner,extra",f.join());
  const m=A.viewNodes(A.dataSet({rows:[{label:"L",s:"S1",p:"P1",x:"X1"}]}),{as:"list",parent:"p"},{})[0];
  chk("list: the field `parent:` names is not an extra",byClass(m,"dv-f").map(x=>x.attrs.title).join()==="s,x",byClass(m,"dv-f").map(x=>x.attrs.title).join());
  const e=A.viewNodes(A.dataSet({rows}),{as:"list",fields:["extra","id"]},{})[0];
  chk("list: `fields:` replaces the default, in the order named, even for a field that is normally left out",byClass(e,"dv-f").map(x=>x.attrs.title).join()==="extra,id");
  chk("list: an extra with no value draws nothing",byClass(A.viewNodes(A.dataSet({rows:[{label:"L",a:"",b:"B"}]}),{as:"list"},{})[0],"dv-f").length===1);}
 /* the list row */
 {const rows=[{label:"Row one",badge:["alpha","beta"],tone:"good",value:7,note:"a note",owner:"Ines"},{label:"Row two",tone:"bad",value:8}];
  const n=A.viewNodes(A.dataSet({rows}),{as:"list"},{})[0],lis=byClass(n,"dv-row");
  chk("list: a list-valued badge is several pills",byClass(lis[0],"pill").length===2&&byClass(lis[0],"pill").map(text).join()==="alpha,beta");
  chk("list: with a badge, the tone colours the pills and not the value",byClass(lis[0],"pill").every(p=>cls(p).includes("tone-good"))&&!cls(byClass(lis[0],"dv-val")[0]).some(c=>/^tone-/.test(c)));
  chk("list: with no badge, the tone colours the value, and there is no pill",byClass(lis[1],"pill").length===0&&cls(byClass(lis[1],"dv-val")[0]).includes("tone-bad"));
  chk("list: the parts come in order: badge, label, extras, value, note",kids(lis[0]).map(k=>cls(k).find(c=>/^dv-/.test(c))).join()==="dv-b,dv-t,dv-x,dv-val,dv-n,dv-sr",kids(lis[0]).map(k=>cls(k).join(" ")).join("|"));
  chk("list: a part that is empty draws nothing (no note, no badge, no extras in the second row)",kids(lis[1]).map(k=>cls(k).find(c=>/^dv-/.test(c))).join()==="dv-t,dv-val,dv-sr");
  chk("list: the tone is said in words",text(byClass(lis[0],"dv-sr").pop())==="Good"&&text(byClass(lis[1],"dv-sr").pop())==="Needs action");}
 /* tiles with no value are pills */
 {const n=draw([{label:"One",tone:"good",note:"hi"},{label:"Two"},{label:"Three",tone:"bad"}],{as:"tiles"});
  const ul=byClass(n,"dv-tiles")[0];
  chk("tiles: with no value in any row, the tiles are a strip of pills",cls(ul).includes("dv-pills")&&byClass(ul,"pill").length===3&&byClass(n,"dv-tile").length===0);
  chk("tiles as pills: tone toned, the note quieter on the same pill, nothing else",cls(byClass(ul,"pill")[0]).includes("tone-good")&&text(byClass(ul,"pill")[0])==="Onehi"+"Good"&&byClass(ul,"dv-v").length===0,text(byClass(ul,"pill")[0]));
  const big=draw([{label:"One",value:4},{label:"Two"}],{as:"tiles"});
  chk("tiles: when any row has a value they are big tiles, not pills",byClass(big,"dv-tile").length===2&&byClass(big,"pill").length===0&&byClass(big,"dv-pills").length===0);
  const none=draw([{label:"One",value:""},{label:"Two",value:""}],{as:"tiles"});
  chk("tiles: a value role whose every value is empty draws pills too",byClass(none,"dv-pills").length===1);}
 /* group */
 {const n=A.viewNodes(A.dataSet({rows:[{label:"a",g:"x"},{label:"b",g:"y"},{label:"c",g:"x"}]}),{as:"list",group:"g"},{})[0];
  chk("list: a group is a card with the group's name and a count",byClass(n,"dv-gcard").length===2&&byClass(n,"dv-group").map(text).join()==="x2 rows,y1 row");}

 /* ---- kept entries: the same roles, the date as the first field ---- */
 const KEEP=`---\nbooklet: "0.11"\ntitle: Sleep\nlang: en\n---\n\n> [!module|m] Sleep\n\n> [!activity|log repeat] Log\n\n> [!number|hours min:0 max:24] Hours slept\n\n> [!scale|mood] Mood\n1. Low\n2. Mid\n3. High\n\n> [!activity|look] Look\n\n\`\`\`booklet query\nfrom: hours\nas: line\n\`\`\`\n\n\`\`\`booklet query\nfrom: hours\nas: bars\n\`\`\`\n\n\`\`\`booklet query\nfrom: log\nas: list\n\`\`\`\n\n> [!module|m end] End\n`;
 {const r=A.parseFile(KEEP);
  chk("a question as the source parses clean",r.ok&&r.unread.length===0,JSON.stringify(r.unread));
  const qs=r.template.modules[0].activities.find(a=>a.id==="m/look").blocks.filter(b=>b.type==="query");
  chk("the parser sets the value of a query over one question to that question",qs[0].view.value==="hours"&&qs[1].view.value==="hours"&&qs[2].view.value===undefined,JSON.stringify(qs.map(q=>q.view)));}
 P.wipe();
 {const B=P.boot();await B.createBooklet();B.loadText(KEEP);
  B.keptFor("m/log").push({ts:"2026-10-01T08:00:00",hours:6.5,mood:2},{ts:"2026-10-02T08:00:00",hours:7,mood:3},{ts:"2026-10-03T08:00:00",hours:5,mood:1},
    {ts:"2026-10-04T08:00:00",hours:8,mood:3},{ts:"2026-10-05T08:00:00",hours:9,mood:2});
  B.screen="m/look";B.render();const main=P.main();
  chk("a line over one question draws its points (it drew nothing before 0.7)",byClass(main,"ch-pt").length===5&&walk(main,x=>x.tagName==="polyline").length===1,String(byClass(main,"ch-pt").length));
  chk("bars over one question draw a bar for each entry",byClass(main,"ch-bar").length===5);
  chk("a list over kept entries: the date is the label, the questions are the extras",byClass(main,"dv-t").length===5&&byClass(main,"dv-f").some(x=>x.attrs.title==="Hours slept"));
  const set=B.entrySet({from:"m/log",fields:["hours"],view:{limit:2}},"m/look","line");
  chk("the set itself is not cut (`limit` is applied once, by the pipeline), and a chart's rows run oldest first",set.rows.length===5&&set.rows.map(r=>r.hours).join()==="6.5,7,5,8,9",JSON.stringify(set.rows));
  const drawn=B.viewNodes(set,{as:"bars",value:"hours",limit:2},{})[0],bars=byClass(drawn,"ch-bar");
  chk("`limit` on kept entries means the newest N, also for a chart (oldest of those first)",bars.length===2&&byClass(drawn,"ch-v").map(text).join()==="8,9",byClass(drawn,"ch-v").map(text).join());
  const set2=B.entrySet({from:"m/log",view:{limit:2}},"m/look","cards");
  const cards=B.viewNodes(set2,{as:"cards",limit:2},{})[0],when=byClass(cards,"when").map(text);
  chk("`limit` on kept entries for cards keeps the newest N, newest first",when.length===2&&/5/.test(when[0])&&/4/.test(when[1]),when.join("|"));
  const set3=B.entrySet({from:"m/log"},"m/look","table");
  chk("a kept-entry set: the date is the first field whatever `fields:` says, and its sort value is the timestamp",set3.first==="date"&&set3.own[0]==="date"&&typeof set3.sortVal(set3.rows[0],"date")==="number"&&set3.sortVal(set3.rows[0],"date")>set3.sortVal(set3.rows[1],"date"));
  chk("number and scale answers sort as numbers, not as the words shown",typeof set3.sortVal(set3.rows[0],"mood")==="number"&&typeof set3.rows[0].mood==="string");
  const set4=B.entrySet({from:"m/log",fields:["mood"]},"m/look","table");
  chk("`fields:` does not change `first`",set4.first==="date");}

 /* ---- the fixture: every look on one page ---- */
 {P.wipe();const C=P.boot();await C.createBooklet();
  const FX=fs.readFileSync(P.R+"/test/fixtures/roles.booklet.md","utf8");
  chk("the roles fixture parses with nothing reported wrong",C.parseFile(FX).ok&&C.parseFile(FX).unread.length===0,JSON.stringify(C.parseFile(FX).unread));
  C.loadText(FX);C.screen="board/overview";C.render();const main=P.main();
  chk("the fixture draws a pill strip, big tiles, flat and grouped lists, a table with a badge column and bars",
    byClass(main,"dv-pills").length===1&&byClass(main,"dv-pills")[0].children.length===6&&byClass(main,"dv-tile").length===4&&byClass(main,"dv-gcard").length===3
    &&walk(main,x=>x.tagName==="table").length===3&&byClass(main,"ch-barchart").length===1&&byClass(main,"pill").length>12);   /* three tables: the long one, the owners, and the bars' numbers */
  chk("only the long list, its table (10 rows each) and the nested house (15) offer the control",byClass(main,"dv-ctl").length===3);
  C.screen="board/look";C.render();
  chk("the fixture's kept entries (10) offer the control on the cards too",byClass(P.main(),"dv-ctl").length===1&&byClass(P.main(),"entry").length===10);}

 /* ---- the strings ---- */
 chk("every language says the control's words",["en","fr","es","es-AR"].every(l=>{const c=A.STRINGS[l].dv.ctl;
   return c&&["open","search","show","all","sortBy","original","asc","desc","clear","nothing"].every(k=>typeof c[k]==="string"&&c[k])&&/3/.test(c.shown(3,9))&&/9/.test(c.shown(3,9));}));
 console.log(fails?"\n"+fails+" FAILURES":"\nroles checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
