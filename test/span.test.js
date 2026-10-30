// Format 0.16: `limit: N days` (a span of days) and `summary: on` (not yet supported here).
// A day is the calendar date of an entry's `ts` in the reader's own time zone (SPEC.md section 8), so this suite runs
// itself once in each of several time zones (TZ is read when node starts, so each run is a child process).
// Run: node test/span.test.js
const P=require("./page.js");
const {spawnSync}=require("child_process");
const ZONES=["UTC","Pacific/Kiritimati","Pacific/Pago_Pago","America/New_York","Asia/Kolkata"];
if(!process.env.SPAN_ZONE){
  let bad=0;
  for(const z of ZONES){const r=spawnSync(process.execPath,[__filename],{env:{...process.env,SPAN_ZONE:"1",TZ:z},encoding:"utf8"});
    const lines=r.stdout.split("\n").filter(l=>/FAIL/.test(l));
    console.log((r.status===0?"  ok    ":"  FAIL  ")+"in the time zone "+z+(r.status===0?"":"\n"+r.stdout+r.stderr));if(r.status!==0) bad++;}
  console.log(bad?"\n"+bad+" FAILURES":"\nspan checks passed (in "+ZONES.length+" time zones)");process.exit(bad?1:0);}

let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const FX_ALL=`---
booklet: "0.17"
id: fixture/span
title: A span of days
lang: en
version: "0.1"
---

# A span of days

> [!module|span] A span of days

> [!activity|log repeat] Log

> [!text|situation] What happened?

> [!scale|ease] How hard did it feel?
1. Not at all
2. A little
3. Very

> [!activity|look] Look back

## Three days

\`\`\`booklet query
from: log
limit: 3 days
fields: situation
\`\`\`

## Summarised

\`\`\`booklet query
from: log
limit: 3 days
summary: on
\`\`\`

## Not a summary

\`\`\`booklet query
from: log
summary: yes
fields: situation
\`\`\`

## A span of data

\`\`\`booklet query
from: short-list
limit: 7 days
summary: on
\`\`\`

\`\`\`booklet data
{ "rows": [ { "title": "a row of data" } ] }
\`\`\`
^short-list

> [!module|span end] End
`;
/* a module that holds a problem is not installed (addModuleText), so the module drawn below is this one with the two queries
   that are reported taken out: the file read above has them */
const FX=FX_ALL.replace(/## Not a summary[\s\S]*?## A span of data/,"## A span of data").replace("limit: 7 days\nsummary: on\n","");
/* a moment in the reader's own time: k days ago at h:m (a negative k is in the future) */
const at=(k,h,m)=>{const d=new Date();d.setDate(d.getDate()-k);d.setHours(h,m,0,0);return d.toISOString();};
const blocks=(R,id)=>R.template.modules.find(m=>m.id==="span").activities.find(a=>a.id==="span/"+id).pages[0].blocks.filter(b=>b.type==="query");

(async()=>{
 const A=P.boot();
 /* ---- reading the two keys ---- */
 const R=A.parseFile(FX_ALL);
 const qs=blocks(R,"look");
 chk("`limit: 3 days` is a span: view.days is 3 and there is no count",qs[0].view.days===3&&qs[0].view.limit===undefined,JSON.stringify(qs[0].view));
 chk("`summary: on` is read",qs[1].view.summary==="on");
 chk("`summary: yes` is reported, with the value, and is not kept in the view",R.unread.some(p=>/summary: yes.*is not .on./.test(p))&&qs[2].view.summary===undefined,JSON.stringify(R.unread));
 chk("a span or a summary on a data block is reported as reading kept entries only, and dropped from the view",
   R.unread.some(p=>/`limit: 7 days`, `summary: on`.*kept entries only/.test(p))&&qs[3].view.days===undefined&&qs[3].view.summary===undefined,JSON.stringify([R.unread,qs[3].view]));
 const one=t=>A.parseFile(FX_ALL.replace("limit: 3 days",t)).template.modules[0].activities.find(a=>a.id==="span/look").pages[0].blocks.find(b=>b.type==="query").view;
 chk("`limit: 1 day` is a span of one day",one("limit: 1 day").days===1);
 chk("a count is still a count",one("limit: 3").limit===3&&one("limit: 3").days===undefined);
 for(const bad of ["limit: week","limit: 0 days","limit: -3 days","limit: 3 weeks","limit: 3days","limit: 2.5 days","limit: days"]){
   const R2=A.parseFile(FX_ALL.replace("limit: 3 days",bad)),v=R2.template.modules[0].activities.find(a=>a.id==="span/look").pages[0].blocks.find(b=>b.type==="query").view;
   chk("`"+bad+"` is reported and ignored (no count, no span)",R2.unread.some(p=>/not a positive whole number or a number of days/.test(p))&&v.limit===undefined&&v.days===undefined,JSON.stringify([R2.unread,v]));}
 chk("the query has fifteen keys, `summary` among them",A.QUERY_KEYS.length===15&&A.QUERY_KEYS.includes("summary"));

 /* ---- the span of days: the entries of today and the days before it, by the reader's own date ---- */
 await A.createBooklet();
 chk("the module installs",A.addModuleText(FX).ok);
 const kept=A.keptFor("span/log");
 kept.push({ts:new Date(Date.now()-1000).toISOString(),situation:"in-today",ease:3},
   {ts:at(1,12,0),situation:"in-1",ease:2},
   {ts:at(2,0,10),situation:"in-2-early",ease:1},      /* the first moment of the oldest day in the span */
   {ts:at(3,23,50),situation:"out-3-late",ease:1},     /* the last minutes of the day before it */
   {ts:at(5,12,0),situation:"out-5",ease:1},
   {ts:at(-1,12,0),situation:"out-tomorrow",ease:2},   /* in the future */
   {ts:new Date(Date.now()+10*60*1000).toISOString(),situation:"out-later-today",ease:2},   /* ten minutes from now: later today is the future too */
   {ts:"not a date",situation:"out-bad",ease:2},
   {ts:undefined,situation:"out-none",ease:2});
 A.screen="span/look";A.render();
 const seen=P.texts(P.main());
 const first=seen.slice(0,seen.indexOf("Summarised"));
 chk("`limit: 3 days` shows today, yesterday and the day before, to its first minute",["in-today","in-1","in-2-early"].every(w=>first.includes(w)),first);
 chk("and not the last minutes of the day before that, an older day, tomorrow, or an entry whose `ts` will not parse",
   ["out-3-late","out-5","out-tomorrow","out-later-today","out-bad","out-none"].every(w=>!first.includes(w)),first);
 /* a query with no span shows every entry: the span is the query's own */
 A.parseFile(FX_ALL);
 const whole=A.queryEntries("span/log","span/look");
 chk("a query with no span shows every entry, those too (the span is the query's own)",whole.length===9,String(whole.length));
 chk("the entries stay in the file as written: a span hides, it deletes nothing",kept.length===9&&/out-bad/.test(A.toMarkdown())&&/out-tomorrow/.test(A.toMarkdown()));

 /* ---- every view takes the span ---- */
 const block=qs[0];
 for(const as of ["cards","table","list","tiles","bars","line"]){
   const b={...block,view:{...block.view,as},fields:undefined};
   const set=A.entrySet(b,"span/look",as);
   chk("`limit: 3 days` as "+as+": three rows",set.rows.length===3,String(set.rows.length));}
 const sorted=A.entrySet({...block,fields:undefined},"span/look","cards").rows.map(r=>r.situation);
 chk("the span keeps the order (newest first)",sorted.join()==="in-today,in-1,in-2-early",sorted.join());
 chk("`limit: 1 day` is today alone",A.entrySet({...block,view:{days:1},fields:undefined},"span/look","cards").rows.map(r=>r.situation).join()==="in-today");
 chk("a span on one question reads that question's answers in the span",A.queryEntries("span/log","span/look",2).map(e=>e.situation).join()==="in-today,in-1",A.queryEntries("span/log","span/look",2).map(e=>e.situation).join());

 /* a very long span reaches back past the year 1000: moments are compared, not date text with an unpadded year */
 kept.push({ts:"0500-03-01T12:00:00.000Z",situation:"in-ancient",ease:1});
 const long=A.queryEntries("span/log","span/look",900000).map(e=>e.situation);
 chk("a span of 900,000 days reaches an entry from the year 500, and still leaves out the future",long.includes("in-ancient")&&long.includes("in-today")&&!long.includes("out-later-today")&&!long.includes("out-tomorrow"),long.join());
 kept.pop();

 /* ---- a summary is not yet drawn here: a line says so, in place of the view, never the plain entries ---- */
 const sum=seen.slice(seen.indexOf("Summarised"),seen.indexOf("A span of data"));
 chk("`summary: on` shows the 'not yet supported' line in place of the view",/Summaries \(summary: on\) are not yet supported here/.test(sum),sum);
 chk("and not the entries as if the key were not there",!/in-today|in-1|in-2-early/.test(sum),sum);
 const data=seen.slice(seen.indexOf("A span of data"));
 chk("a data block beside it is drawn as it always was, with no 'not yet supported' line",/a row of data/.test(data)&&!/not yet supported/.test(data),data);
 for(const [lang,rx] of [["fr",/^Les résumés \(summary: on\) ne sont pas encore pris en charge/],["es",/^Los resúmenes \(summary: on\) aún no se admiten/]])
   chk("the line is in "+lang+" too",rx.test((A.STRINGS[lang].query||{}).summaryLater||""),JSON.stringify((A.STRINGS[lang]||{}).query));
 for(const lang of ["en","fr","es"]){const p=A.STRINGS[lang].problem;
   chk("the reports are in "+lang+" too",["querySummaryBad","queryEntriesOnly"].every(k=>typeof p[k]==="function"&&p[k]({code:"x"},"v").length>10));
   /* the "kept entries only" report names one key or two, and says so in the number its words take, in every language */
   const one=p.queryEntriesOnly("line 3","`limit:`",1),two=p.queryEntriesOnly("line 3","`limit:`, `summary:`",2);
   chk("in "+lang+", the kept-entries-only report's words follow how many keys it names",one!==two&&one.replace("`limit:`","")!==two.replace("`limit:`, `summary:`",""),one+" | "+two);}
 console.log(fails?"\n"+fails+" FAILURES":"\nspan checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
