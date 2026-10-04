// Format v0.6: the chart views (`as: bars`, `as: line`): the scale maths, the rows and series they draw, and the linter's rules.
// Run: node test/charts.test.js (node and python3). Drawing in a real browser: test/charts-browser.js.
const P=require("./page.js");
const fs=require("fs"),path=require("path"),cp=require("child_process");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const byClass=(n,c)=>walk(n,x=>cls(x).includes(c));
const text=n=>typeof n==="string"?n:(n&&n._text)||kids(n).map(text).join("");
(async()=>{
 const A=P.boot();
 /* ---- the scale ---- */
 const ok35=s=>s.ticks.length>=3&&s.ticks.length<=5;
 const s1=A.niceScale(0,30.25);
 chk("a scale runs between round ends with 3 to 5 ticks",s1.min===0&&s1.max>=30.25&&ok35(s1)&&s1.ticks[0]===0&&s1.ticks.at(-1)===s1.max,JSON.stringify(s1));
 chk("ticks are evenly spaced multiples of the step",s1.ticks.every((t,i)=>Math.abs(t-i*s1.step)<1e-9));
 const eq=A.niceScale(5,5);chk("all-equal values still give a scale that holds them",eq.min<=5&&eq.max>=5&&eq.max>eq.min&&eq.min===0,JSON.stringify(eq));
 const z=A.niceScale(0,0);chk("all zeros give a scale from 0 to 1",z.min===0&&z.max===1);
 const ng=A.niceScale(-30,25);chk("negatives: the scale holds zero and both ends",ng.min<=-30&&ng.max>=25&&ng.ticks.includes(0),JSON.stringify(ng));
 const allneg=A.niceScale(-9,-9);chk("one negative value gives a scale up to zero",allneg.max===0&&allneg.min<=-9);
 const big=A.niceScale(0,48230000);chk("large magnitudes keep round ticks",ok35(big)&&big.max>=48230000&&big.ticks.every(t=>t%big.step===0),JSON.stringify(big));
 const sm=A.niceScale(0.0004,0.0031);chk("small magnitudes keep clean decimals",sm.min<=0.0004&&sm.max>=0.0031&&sm.ticks.every(t=>String(t).length<12),JSON.stringify(sm));
 chk("the scale of no numbers is 0 to 1",A.niceScale(NaN,undefined).max===1);
 for(const [lo,hi] of [[0,1],[0,7],[3,4],[0,100],[12,19],[-5,5],[0,0.9],[1000,1900]]){const s=A.niceScale(lo,hi);if(!(ok35(s)&&s.min<=lo&&s.max>=hi)) chk("scale "+lo+".."+hi,false,JSON.stringify(s));}
 chk("scales over a spread of ranges hold their data with 3 to 5 ticks",true);
 /* a line's y scale: from zero when zero is near the data */
 chk("a line starts at zero when its minimum is under 0.6 of its maximum",A.lineDomain([2,6,9]).min===0);
 const hi=A.lineDomain([70,72,75]);chk("a line over high values starts at a nice value below the minimum",hi.min>0&&hi.min<=70&&hi.max>=75,JSON.stringify(hi));
 chk("a line with a negative minimum does not start at zero",A.lineDomain([-4,2]).min<=-4);
 chk("a single value still has a scale",A.lineDomain([3]).max>=3&&A.lineDomain([]).max===1);
 /* ---- label thinning ---- */
 let bad=0;
 for(const n of [0,1,2,3,5,7,12,31,60,365]) for(const w of [100,260,400,700,1200]) for(const lw of [30,60,90]){
   const ix=A.thinLabels(n,w,lw);
   if(n===0&&ix.length) bad++;
   if(n>=2&&(ix[0]!==0||ix.at(-1)!==n-1)) bad++;
   if(n===1&&ix.join()!=="0") bad++;
   for(let i=1;i<ix.length;i++){if(ix[i]<=ix[i-1]) bad++;if(n>1&&(ix[i]-ix[i-1])*w/(n-1)<lw-1e-6) bad++;}}
 chk("thinned x labels keep the first and last and never overlap",bad===0,String(bad));
 chk("with room, every label is kept",A.thinLabels(5,700,60).join()==="0,1,2,3,4");
 /* ---- series ---- */
 const rows=[{d:"a",x:1,y:2},{d:"b",x:"n/a",y:null},{d:"c",x:3,y:Infinity},{d:"d",x:4,y:5}];
 chk("line series take numbers and leave gaps where a value is not a number",JSON.stringify(A.lineSeries(rows,["x","y"]))===JSON.stringify([[1,null,3,4],[2,null,null,5]]));

 /* ---- drawn from a booklet ---- */
 const FX=fs.readFileSync(P.R+"/test/fixtures/charts.booklet.md","utf8");
 const R=A.parseFile(FX);
 chk("the charts fixture parses with nothing reported wrong",R.ok&&R.unread.length===0,JSON.stringify(R.unread));
 const mod=R.template.modules[0],blocks=(mod.mode&&mod.mode.blocks)||mod.activities[0].blocks;
 const qs=blocks.filter(b=>b.type==="query");
 chk("five queries outside the row, as bars and line",qs.map(q=>q.view.as).join()==="bars,line,line,bars,bars",qs.map(q=>q.view.as).join());
 const draw=q=>A.viewNodes(A.dataSet(q.data),{...q.view,fields:q.fields},{empty:"EMPTY"});
 const bars=draw(qs[0])[0],rowsOf=byClass(bars,"ch-row");
 chk("bars: one list row per data row, label and value in each",rowsOf.length===6&&text(byClass(rowsOf[0],"ch-l")[0])==="Tomatoes"&&text(byClass(rowsOf[0],"ch-v")[0])==="30.25");
 chk("bars: a value that is not a number draws no bar and prints a dash",byClass(bars,"ch-bar").length===5&&text(byClass(rowsOf[5],"ch-v")[0])==="–");
 chk("bars: tone names set the bar's tone class",byClass(bars,"ch-bar").map(r=>cls(r).filter(c=>/^tone-/.test(c)).join()).join()==="tone-good,tone-good,tone-warn,tone-warn,tone-bad");
 const w=byClass(bars,"ch-bar").map(r=>Number(r.attrs.width));
 chk("bars: lengths follow the values, from zero",w.every((x,i)=>i===0||x<w[i-1])&&byClass(bars,"ch-zero").length===0);
 const negs=draw(qs[4])[0],zero=Number(byClass(negs,"ch-zero")[0].attrs.x1),nb=byClass(negs,"ch-bar");
 chk("bars: a negative value is drawn left of the zero line, a positive one right of it",Number(nb[0].attrs.x)+Number(nb[0].attrs.width)<=zero+1e-9&&Number(nb[1].attrs.x)>=zero-1e-9);
 chk("bars: the chart carries a summary label and a way to the numbers",/Bar chart, 6 bars/.test(byClass(bars,"ch-barchart")[0].attrs["aria-label"])&&byClass(bars,"ch-nums").length===1&&text(walk(bars,x=>x.tagName==="summary")[0])==="Show the numbers");
 chk("bars: the numbers table has the same rows",walk(byClass(bars,"ch-nums")[0],x=>x.tagName==="tr").length===7);
 const line1=draw(qs[1])[0],pl1=walk(line1,x=>x.tagName==="polyline");
 chk("line: one polyline with a point for each row, and a marker for each",pl1.length===1&&pl1[0].attrs.points.split(" ").length===12&&byClass(line1,"ch-pt").length===12);
 chk("line: no legend for one series",byClass(line1,"ch-legend").length===0);
 const line2=draw(qs[2])[0],pl2=walk(line2,x=>x.tagName==="polyline");
 chk("line: two series from `fields:`, the second broken at its gap",pl2.length===3&&pl2.map(p=>p.attrs.points.split(" ").length).join()==="6,2,3");
 chk("line: markers for numbers only, a legend of two, series told apart by dash",byClass(walk(line2,x=>cls(x).includes("ch-svg"))[0],"ch-pt").length===11&&walk(byClass(line2,"ch-legend")[0],x=>x.tagName==="li").length===2&&pl2[0].attrs["stroke-dasharray"]===undefined&&pl2[1].attrs["stroke-dasharray"]);
 chk("line: legend names come from the data block's labels",text(byClass(line2,"ch-legend")[0]).includes("North butt (litres)"));
 const emp=draw(qs[3]);chk("an empty chart shows the empty line, not a chart",emp.length===1&&text(emp[0])==="No harvest recorded yet."||text(emp[0])==="EMPTY");
 chk("limit applies to a chart",(()=>{const q=qs[0],set=A.dataSet(q.data);const n=A.viewNodes(set,{...q.view,limit:2},{empty:"E"})[0];return byClass(n,"ch-row").length===2;})());
 chk("nothing in a chart label is read as markup",(()=>{const set=A.dataSet({rows:[{label:"<b>x</b>",value:3}]});const n=A.viewNodes(set,{as:"bars"},{empty:"E"})[0];return text(byClass(n,"ch-l")[0])==="<b>x</b>"&&!walk(n,x=>x.tagName==="b").length;})());

 /* ---- kept entries as points ---- */
 const KEEP=`---\nbooklet: 0.7\ntitle: Sleep\nlang: en\n---\n\n> [!module|m] Sleep\n\n> [!activity|log repeat] Log\n\n> [!number|hours min:0 max:24] Hours slept\n\n> [!scale|mood] Mood\n1. Low\n2. Mid\n3. High\n\n> [!activity|look] Look\n\n\`\`\`booklet query\nfrom: log\nas: line\nlabel: date\nfields: hours, mood\n\`\`\`\n\n> [!module|m end] End\n`;
 {const r=A.parseFile(KEEP);chk("a line over kept entries parses clean",r.ok&&r.unread.length===0,JSON.stringify(r.unread));
  const q=r.template.modules[0].activities.find(a=>a.id==="look").blocks.find(b=>b.type==="query");
  chk("it keeps `as: line`, `label: date` and the fields",q&&q.view.as==="line"&&q.view.label==="date"&&q.fields.join()==="hours,mood");}
 /* the entry rows carry `date`, and a number question's answer is a number once the set is built */
 {P.wipe();const B=P.boot();B.loadText(KEEP);
  const keep=B.keptFor("log");
  keep.push({ts:"2026-10-01T08:00:00",hours:6.5,mood:2},{ts:"2026-10-02T08:00:00",hours:7,mood:3},{ts:"2026-10-03T08:00:00",mood:1});
  const set=B.entrySet({from:"log",fields:["hours","mood"],fileWide:true},"look","line");
  chk("kept entries become rows with the date and each question's answer",set.rows.length===3&&set.rows.every(r=>"date" in r),JSON.stringify(set.rows));
  chk("a number question's answer is a number field the chart can draw",typeof set.rows[0].hours==="number"&&set.rows[0].hours===6.5&&set.rows[2].mood===1,JSON.stringify(set.rows));
  chk("an entry with no answer leaves a gap, and the oldest entry comes first",set.rows[2].hours===undefined&&/Oct/.test(set.rows[0].date)&&/1/.test(set.rows[0].date),JSON.stringify(set.rows));}

 /* ---- the linter ---- */
 const lint=(...a)=>{const r=cp.spawnSync("python3",[path.join(P.R,"lint-booklet.py"),...a],{encoding:"utf8"});return {status:r.status,out:(r.stdout||"")+(r.stderr||"")};};
 const mk=(name,query,data)=>{const f=path.join(require("os").tmpdir(),"chart-"+name+".md");
  fs.writeFileSync(f,`---\nbooklet: 0.7\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n\`\`\`booklet query\n${query}\n\`\`\`\n\n\`\`\`booklet data\n${data}\n\`\`\`\n^d\n\n> [!module|m end] End\n`);return f;};
 const ROWS='[{"k":"a","n":1,"s":"x"},{"k":"b","n":2,"s":"y"}]';
 {const r=lint(mk("ok","from: d\nas: bars\nlabel: k\nvalue: n",ROWS));chk("a bars query on numbers lints clean",r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);}
 {const r=lint(mk("ok2","from: d\nas: line\nlabel: k\nfields: n",ROWS));chk("a line query on numbers lints clean",r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);}
 {const r=lint(mk("nonum","from: d\nas: bars\nlabel: k\nvalue: s",ROWS));chk("bars on a field with no number warns, not errors",r.status===0&&/warn .*no number in the field 's'/.test(r.out)&&/0 errors · 1 warning/.test(r.out),r.out);}
 {const r=lint(mk("nonum2","from: d\nas: line\nlabel: k\nfields: n, s",ROWS));chk("a line field with no number warns",r.status===0&&/no number in the field 's'/.test(r.out),r.out);}
 {const r=lint(mk("nofield","from: d\nas: bars\nlabel: nope\nvalue: n",ROWS));chk("a label naming a field the rows never carry warns",r.status===0&&/`label: nope` names a field the rows never carry/.test(r.out),r.out);}
 {const r=lint(mk("novalue","from: d\nas: bars\nlabel: k",ROWS));chk("a chart left on the default `value` field the rows lack warns",r.status===0&&/reads the field 'value'/.test(r.out),r.out);}
 {const r=lint(mk("badkey","from: d\nas: bars\nlabel: k\nvalue: n\ncolour: red",ROWS));chk("an unknown key is still an error",r.status!==0&&/no setting 'colour'/.test(r.out),r.out);}
 {const r=lint(mk("badas","from: d\nas: pie",ROWS));chk("`as: pie` is an error naming the views",r.status!==0&&/bars, line/.test(r.out),r.out);}
 {const r=lint(path.join(P.R,"test/fixtures/charts.booklet.md"));chk("the charts fixture lints clean",r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);}
 {const r=lint(path.join(P.R,"test/fixtures/lint-old-format-0-5.md"));chk("a file still saying booklet: 0.5 is refused",r.status!==0&&/booklet: 0\.5; this is format 0\.7/.test(r.out),r.out);}
 /* ---- the strings ---- */
 chk("every language says the chart words",["en","fr","es","es-AR"].every(l=>{const c=A.STRINGS[l].dv.chart;return c&&c.numbers&&/\d/.test(c.bars(3,"1","2"))&&/\d/.test(c.line(3,"a","1","2"));}));
 console.log(fails?fails+" chart check(s) FAILED":"chart checks passed");process.exit(fails?1:0);
})();
