// Format v0.7: the one sort-and-filter control, the same on every view. The reader's state lives in memory only:
// it never reaches the file. Run: node test/controls.test.js      (Needs node; nothing to install.)
// The recording DOM presses a control by calling the handler the page wired to it; test/roles-browser.js covers
// typing, focus and the keyboard in Chromium.
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const byClass=(n,c)=>walk(n,x=>cls(x).includes(c));
const text=n=>typeof n==="string"?n:(n&&n._text)||kids(n).map(text).join("");
const tag=(n,t)=>walk(n,x=>x.tagName===t);
const press=(n,ev="click")=>n._on[ev]({target:n,key:"x"});
const type=(box,v)=>{const i=byClass(box,"dv-q")[0];i.value=v;press(i,"input");};
const pick=(box,label)=>{const sel=byClass(box,"dv-sel").find(s=>tag(s,"option").some(o=>text(o)===label&&o.attrs.value!==""));
  const o=tag(sel,"option").find(x=>text(x)===label);sel.value=o.attrs.value;press(sel,"change");};
(async()=>{
 const A=P.boot();
 const WORDS=["Ash","Birch","Cedar","Dogwood","Elm","Fir","Gum","Hazel","Iroko","Juniper"];
 const ROWS=WORDS.map((w,i)=>({label:w,value:[7,3,9,1,5,8,2,10,4,6][i],area:["north","south","east"][i%3],note:i<4?"n"+i:"",tags:i%2?["x","y"]:["x"],uniq:"u"+i,sparse:i<4?"s"+i:"",tone:["good","warn","bad",""][i%4]}));
 const FIELDS={label:"Name",value:"Size",area:"Area",tags:"Tags"};
 const box=(as,rows=ROWS,extra={},key=null,fields)=>A.viewNodes(A.dataSet({rows,fields:FIELDS}),{as,...extra,fields:fields||extra.fields},{empty:"EMPTY",key})[0];
 const labels={table:b=>tag(b,"tbody").flatMap(t=>tag(t,"tr").filter(r=>!cls(r).includes("dv-grouprow"))).map(r=>text(tag(r,"td")[0])),
   list:b=>byClass(b,"dv-t").map(text),tiles:b=>byClass(b,"dv-l").map(text),bars:b=>byClass(b,"ch-l").map(text)};
 const order=(as,b)=>labels[as](b).join(",");
 const AS=["table","list","tiles","bars"];
 const FIELD_T={table:["label","value","area"]};

 /* ---- the control appears only when it is useful ---- */
 for(const as of AS){const b=box(as,ROWS.slice(0,8),{},null,as==="table"?["label","value"]:undefined);
   chk(`${as}: 8 rows draw no control at all`,byClass(b,"dv-ctl").length===0&&tag(b,"input").length===0&&tag(b,"select").length===0);
   const c=box(as,ROWS);chk(`${as}: 10 rows draw the control, once`,byClass(c,"dv-ctl").length===1&&byClass(c,"dv-ctl-btn").length===1&&text(byClass(c,"dv-ctl-btn")[0])==="Sort and filter");}
 chk("CONTROLS_MIN is 9: more than 8 rows",A.CONTROLS_MIN===9&&box("list",ROWS.slice(0,9)).children.some(k=>cls(k).includes("dv-ctl")));
 {const b=box("list");chk("the bar starts closed, with aria-expanded false",byClass(b,"dv-bar")[0].attrs.hidden===""&&byClass(b,"dv-ctl-btn")[0].attrs["aria-expanded"]==="false");
  press(byClass(b,"dv-ctl-btn")[0]);
  chk("the button opens it",byClass(b,"dv-bar")[0].attrs.hidden===undefined&&byClass(b,"dv-ctl-btn")[0].attrs["aria-expanded"]==="true");
  press(byClass(b,"dv-bar")[0],"keydown");
  chk("a key that is not Escape leaves it open",byClass(b,"dv-ctl-btn")[0].attrs["aria-expanded"]==="true");
  byClass(b,"dv-bar")[0]._on.keydown({key:"Escape"});
  chk("Escape in the bar closes it",byClass(b,"dv-bar")[0].attrs.hidden==="" &&byClass(b,"dv-ctl-btn")[0].attrs["aria-expanded"]==="false");}
 {const b=box("list");
  chk("every control has a name a screen reader can say",[...tag(b,"input"),...tag(b,"select")].every(x=>x.attrs["aria-label"])&&byClass(b,"dv-ctl-btn")[0].attrs["aria-expanded"]!==undefined);
  chk("the 'N of M shown' line is a polite live region, and empty while nothing is filtered",byClass(b,"dv-live")[0].attrs["aria-live"]==="polite"&&text(byClass(b,"dv-live")[0])==="");}

 /* ---- the same state gives the same order on every view ---- */
 const base=AS.map(as=>order(as,box(as,ROWS,{},null,as==="table"?["label","value","area"]:undefined)));
 chk("with no sort the four views are in the file's order",base.every(x=>x===WORDS.join()),base.join(" | "));
 for(const [name,state,expect] of [
   ["sort by value, ascending",{sk:"value",dir:1},[...ROWS].sort((a,b)=>a.value-b.value).map(r=>r.label).join()],
   ["sort by value, descending",{sk:"value",dir:-1},[...ROWS].sort((a,b)=>b.value-a.value).map(r=>r.label).join()],
   ["filter by text 'e', in the order written",{q:"e"},ROWS.filter(r=>/e/i.test(r.label+r.area+r.value+r.note+r.tone+r.tags)).map(r=>r.label).join()],
   ["filter to the good rows, sorted by name descending",{fk:"tone",fv:"good",sk:"label",dir:-1},ROWS.filter(r=>r.tone==="good").map(r=>r.label).sort().reverse().join()],
 ]){
   const out=AS.map(as=>{A.VIEWSTATE.clear();A.VIEWSTATE.set("K-"+as,{open:false,q:"",fk:"",fv:"",sk:"",dir:0,...state});
     return order(as,box(as,ROWS,{},"K-"+as,as==="table"?["label","value","tone"]:undefined));});
   if(name.startsWith("filter by text")){/* the text matches what the view shows, which differs between views: only table, list and tiles share it */}
   else chk(`${name}: table, list, tiles and bars show the same order`,out.every(x=>x===expect),out.join(" | ")+" vs "+expect);}
 {A.VIEWSTATE.clear();const b=box("list",ROWS,{},"K1");type(b,"cedar");
  chk("typing in the search box filters to the rows that show it (case-insensitively)",order("list",b)==="Cedar"&&text(byClass(b,"dv-live")[0])==="1 of 10 shown",order("list",b));
  type(b,"north");chk("search reads the extras too: the area is shown",order("list",b)==="Ash,Dogwood,Gum,Juniper",order("list",b));
  type(b,"zzz");chk("nothing matching is said in a line, with a Clear button in it",/Nothing matches\./.test(text(byClass(b,"dv-none")[0]))&&byClass(b,"dv-none")[0].children.some(k=>cls(k).includes("dv-clear")),text(b));
  press(tag(byClass(b,"dv-none")[0],"button")[0]);
  chk("that Clear button clears the filter",order("list",b)===WORDS.join()&&text(byClass(b,"dv-live")[0])==="",order("list",b));}

 /* ---- Show: only fields with 2 to 8 distinct values and a repeat ---- */
 {A.VIEWSTATE.clear();const b=box("list",ROWS,{fields:["area","tags","uniq","sparse","value"]},"K2");
  const sel=byClass(b,"dv-sel").find(s=>s.attrs["aria-label"]==="Show");
  const groups=tag(sel,"optgroup").map(g=>g.attrs.label+":"+tag(g,"option").map(text).join("/"));
  chk("Show offers area (3 values) and tags (x, y: a list counts each element), and the numbers with a repeat",groups.some(g=>g==="Area:north/south/east")&&groups.some(g=>g==="tags:x/y"||g==="Tags:x/y"),groups.join(" | "));
  chk("Show leaves out a field with a different value in every row, and one with 4 values and no repeat",!groups.some(g=>/^uniq:/.test(g))&&!groups.some(g=>/^sparse:/.test(g)),groups.join(" | "));
  chk("Show starts at All",tag(sel,"option")[0].attrs.value===""&&text(tag(sel,"option")[0])==="All");
  pick(b,"south");
  chk("choosing a value shows only the rows with it, and says how many",order("list",b)==="Birch,Elm,Hazel"&&text(byClass(b,"dv-live")[0])==="3 of 10 shown",order("list",b)+" / "+text(byClass(b,"dv-live")[0]));
  pick(b,"y");
  chk("a list-valued cell matches on any of its elements",order("list",b)==="Birch,Dogwood,Fir,Hazel,Juniper",order("list",b));
  const by=byClass(b,"dv-sel").find(s=>s.attrs["aria-label"]==="Sort by");
  chk("Sort by offers the original order, then the label, the value and the extras",tag(by,"option").map(text).join()==="Original order,Name,Size,Area,Tags,uniq,sparse",tag(by,"option").map(text).join());}

 /* ---- groups ---- */
 {A.VIEWSTATE.clear();const b=box("list",ROWS,{group:"area"},"K3");
  const heads=()=>byClass(b,"dv-group").map(text).join("|");
  chk("grouped: a card per group, with its count",heads()==="north4 rows|south3 rows|east3 rows",heads());
  type(b,"dogwood");chk("a group with no rows left is not drawn, and the counts follow the filter",heads()==="north1 row",heads());
  type(b,"");
  const by=byClass(b,"dv-sel").find(s=>s.attrs["aria-label"]==="Sort by");by.value="value";press(by,"change");
  const sorted=byClass(b,"dv-gcard").map(g=>byClass(g,"dv-t").map(text));
  chk("rows sort inside each group, and the groups keep their first-seen order",heads()==="north4 rows|south3 rows|east3 rows"&&sorted.every(g=>g.map(l=>ROWS.find(r=>r.label===l).value).every((v,i,a)=>i===0||a[i-1]<=v)),sorted.join("|"));}
 {A.VIEWSTATE.clear();const t=box("table",ROWS,{group:"area"},"K4",["label","area"]);
  chk("grouped table: group rows with counts",byClass(t,"dv-grouprow").length===3);
  type(t,"zz");chk("a grouped table with nothing matching draws the line, not group rows",byClass(t,"dv-grouprow").length===0&&byClass(t,"dv-none").length===1);}

 /* ---- table headings and the control share one state ---- */
 {A.VIEWSTATE.clear();const t=box("table",ROWS,{},"K5",["label","value","area"]);
  const heads=()=>tag(t,"th").filter(h=>h.attrs.scope==="col");
  const btn=i=>tag(heads()[i],"button")[0];
  press(btn(1));
  chk("a heading click sorts ascending and sets aria-sort",heads()[1].attrs["aria-sort"]==="ascending"&&order("table",t).startsWith("Dogwood,Gum,Birch"),order("table",t));
  const by=byClass(t,"dv-sel").find(s=>s.attrs["aria-label"]==="Sort by"),dir=byClass(t,"dv-dir")[0];
  chk("the Sort by select shows the same column, and the direction button the same direction",by.value==="value"&&text(dir)==="↑"&&dir.attrs.disabled===undefined,by.value+text(dir));
  press(btn(1));
  chk("a second click reverses it, and the direction button follows",heads()[1].attrs["aria-sort"]==="descending"&&text(dir)==="↓"&&order("table",t).startsWith("Hazel,Cedar,Fir"),order("table",t));
  press(btn(1));
  chk("a third click returns to the file's order, and the select to Original order",heads()[1].attrs["aria-sort"]==="none"&&order("table",t)===WORDS.join()&&by.value==="");
  by.value="label";press(by,"change");
  chk("the select sorts the table: the heading shows it",heads()[0].attrs["aria-sort"]==="ascending"&&order("table",t)===[...WORDS].sort().join());
  press(dir);chk("the direction button reverses it",heads()[0].attrs["aria-sort"]==="descending"&&order("table",t)===[...WORDS].sort().reverse().join());
  press(byClass(t,"dv-clear")[0]);
  chk("Clear returns to the file's order",order("table",t)===WORDS.join()&&heads().every(h=>h.attrs["aria-sort"]==="none"));}
 {A.VIEWSTATE.clear();const t=box("table",ROWS.slice(0,5),{},"K6",["label","value"]);
  const b=tag(tag(t,"th")[1],"button")[0];press(b);
  chk("a table of 8 rows or fewer still sorts by its headings (sizes 1, 3, 5, 7, 9), with no control bar in the DOM",order("table",t)==="Dogwood,Birch,Elm,Ash,Cedar"&&byClass(t,"dv-ctl").length===0,order("table",t));}

 /* ---- the line chart: filter only ---- */
 {A.VIEWSTATE.clear();const rows=ROWS.map((r,i)=>({...r,label:"d"+i}));
  const b=A.viewNodes(A.dataSet({rows}),{as:"line",value:"value"},{key:"K7"})[0];
  chk("a line over 10 rows has the control, with search and Show, but no Sort by and no direction button",byClass(b,"dv-ctl").length===1&&byClass(b,"dv-q").length===1
    &&!byClass(b,"dv-sel").some(s=>s.attrs["aria-label"]==="Sort by")&&byClass(b,"dv-dir").length===0,byClass(b,"dv-sel").map(s=>s.attrs["aria-label"]).join());
  type(b,"d3");chk("filtering a line redraws it with the rows that match",byClass(b,"ch-pt").length===1);
  chk("the chart's numbers table shows the same filtered rows",walk(byClass(b,"ch-nums")[0],x=>x.tagName==="tr").length===2);
  A.VIEWSTATE.clear();A.VIEWSTATE.set("K8",{open:false,q:"",fk:"",fv:"",sk:"value",dir:1});
  const c=A.viewNodes(A.dataSet({rows}),{as:"line",value:"value"},{key:"K8"})[0];
  chk("a line ignores a sort: its row order is its axis",walk(byClass(c,"ch-nums")[0],x=>x.tagName==="tr").slice(1).map(r=>text(tag(r,"td")[0])).join()===rows.map(r=>r.label).join());
  const d=A.viewNodes(A.dataSet({rows}),{as:"bars",value:"value"},{key:"K9"})[0];type(d,"d1");
  chk("filtering bars redraws them, and the numbers table follows",byClass(d,"ch-row").length===1&&walk(byClass(d,"ch-nums")[0],x=>x.tagName==="tr").length===2);}

 /* ---- kept entries: cards go through the same pipeline ---- */
 P.wipe();
 {const FX=fs.readFileSync(P.R+"/test/fixtures/roles.booklet.md","utf8");
  const B=P.boot();await B.createBooklet();B.loadText(FX);
  const md0=B.toMarkdown();
  B.screen="look";B.render();let main=P.main();
  const cards=()=>byClass(P.main(),"entry").map(c=>text(byClass(c,"when")[0]));
  chk("kept entries draw as cards, newest first, with the control (10 entries)",cards().length===10&&byClass(main,"dv-ctl").length===1);
  const when0=cards()[0];
  const key=[...B.VIEWSTATE.keys()][0]||"";
  let sel=byClass(main,"dv-sel").find(s=>s.attrs["aria-label"]==="Sort by"),dir=byClass(main,"dv-dir")[0];
  sel.value="date";press(sel,"change");
  chk("Sort by date sorts by the entry's time, not by the words of the date: oldest first",/Sep 21/.test(cards()[0])&&/Sep 30/.test(cards()[9]),cards().join(" | "));
  press(dir);
  chk("and descending is newest first",/Sep 30/.test(cards()[0])&&/Sep 21/.test(cards()[9]),cards().join(" | "));
  pick(B.screen&&P.main(),"Good");
  chk("Show a mood: only the entries that answered it that way",cards().length===5&&byClass(P.main(),"dv-live").map(text).join()==="5 of 10 shown",cards().length+" / "+byClass(P.main(),"dv-live").map(text).join());
  chk("the reader's state is kept in memory under the query's own key",B.VIEWSTATE.size===1&&/^look:/.test([...B.VIEWSTATE.keys()][0]),[...B.VIEWSTATE.keys()].join());
  B.render();
  chk("a re-draw of the page keeps the sort and the filter",cards().length===5&&/Sep 29/.test(cards()[0])&&byClass(P.main(),"dv-live").map(text).join()==="5 of 10 shown",cards().join(" | "));
  chk("saving the booklet writes the same file as before any of it",B.toMarkdown()===md0);
  B.keptFor("log").push({ts:"2026-10-01T09:00:00Z",what:"One more",mood:3});B.render();
  chk("the file still carries only what was written: the control is never in the records",!/dv-|VIEWSTATE|"sk"|"fv"/.test(B.toMarkdown()));
  B.closeBooklet();
  chk("opening or closing a booklet clears the reader's state",B.VIEWSTATE.size===0);}
 {P.wipe();const FX=fs.readFileSync(P.R+"/test/fixtures/roles.booklet.md","utf8");
  const B=P.boot();await B.createBooklet();B.loadText(FX);
  B.screen="look";B.render();
  const main=P.main(),sel=byClass(main,"dv-sel").find(s=>s.attrs["aria-label"]==="Sort by");
  chk("cards: Sort by lists the date and the questions",tag(sel,"option").map(text).join()==="Original order,Date,What happened?,How did the day feel?",tag(sel,"option").map(text).join());
  sel.value="what";press(sel,"change");
  chk("cards sort by a question's words",byClass(P.main(),"entry").map(c=>text(tag(c,"dd")[0])).join()===["A slow day","Cleared the bench","Invoices sent","New paper arrived","Opened the studio","Packed the samples","Photos shot","Printer called","Proofs came back","Quiet Saturday"].join(),byClass(P.main(),"entry").map(c=>text(tag(c,"dd")[0])).join());}

 /* ---- the strings ---- */
 chk("the control's words are in the interface language (French)",(()=>{P.wipe();const B=P.boot();B.lang="fr";return B.STRINGS.fr.dv.ctl.open==="Trier et filtrer"&&B.STRINGS.fr.dv.ctl.shown(2,5)==="2 sur 5 affichés";})());
 console.log(fails?"\n"+fails+" FAILURES":"\ncontrols checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
