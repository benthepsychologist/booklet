// A field named like a member every object has (constructor, toString, valueOf, hasOwnProperty, __proto__) is a field like any other, in
// the reference renderer's data views: a row WITHOUT it shows nothing for it (never a function's text), groups under nothing, is not a
// column value, and does not open because of it; a row that DOES carry it shows its real value. Covers every view, every role, the
// group, the sort, the filter, the open part, the labels and the `edit` objects of `fields`.
// Run: node test/inherited.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const byClass=(n,c)=>walk(n,x=>cls(x).includes(c));
const tag=(n,t)=>walk(n,x=>x.tagName===t);
const text=n=>typeof n==="string"?n:(n&&n._text)||kids(n).map(text).join("");
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
/* what a function's text or an object's would look like on the page */
const LEAK=/native code|function\b|\[object|=>/;
const bodyRows=b=>tag(b,"tr").filter(tr=>tr.children.some(c=>c.tagName==="td"));
(async()=>{
 const A=P.boot();
 const NAMES=["constructor","toString","valueOf","hasOwnProperty","__proto__"];
 /* ten rows (a filter control is drawn from nine): the first nine lack all five fields, the last carries each with a real value.
    Made by JSON.parse, as a data file or a fence is, so that `__proto__` is an own field and not the row's prototype. */
 const rows=[];for(let i=1;i<=9;i++) rows.push({id:"r"+i,name:"Row "+i,score:i,kind:i%2?"odd":"even"});
 rows.push(JSON.parse('{"id":"r10","name":"Row ten","score":10,"kind":"odd","constructor":"real ctor","toString":"real text","valueOf":"real value","hasOwnProperty":"real has","__proto__":"real proto"}'));
 const text10='{"rows":'+JSON.stringify(rows.slice(0,9)).slice(0,-1)+',{"id":"r10","name":"Row ten","score":10,"kind":"odd","constructor":"real ctor","toString":"real text","valueOf":"real value","hasOwnProperty":"real has","__proto__":"real proto"}]}';
 const fresh=()=>JSON.parse(text10);
 const draw=(as,view,st)=>A.viewNodes(A.dataSet(fresh()),{as,...view},{empty:"EMPTY",state:st||A.newViewState()})[0];
 const leaks=b=>LEAK.test(text(b));

 chk("the data itself: the last row has the five own fields, the first has none of them",
   NAMES.every(k=>own(fresh().rows[9],k))&&NAMES.every(k=>!own(fresh().rows[0],k)));

 /* ---- each view, with fields named like members as columns ---- */
 for(const as of ["table","list","cards","tiles","bars","line"]){
  const b=draw(as,{fields:NAMES.slice(0,4),label:"name",value:"score"});
  chk(as+": naming the fields as columns shows no function's text for a row that lacks them",!leaks(b),text(b).slice(0,200));
  if(as==="table"||as==="list"||as==="cards")
   chk(as+": …and the row that has them shows their values",/real ctor/.test(text(b))&&/real text/.test(text(b))&&/real value/.test(text(b))&&/real has/.test(text(b)),text(b).slice(0,300));}

 /* ---- the roles, each pointed at an inherited name ---- */
 let n=0;
 for(const as of ["table","list","cards","tiles","bars","line"]) for(const role of ["label","value","note","badge","tone","link","icon"]){
  const k=NAMES[(n++)%4],view={fields:as==="table"||as==="list"||as==="cards"?["name"]:["score"],label:"name",value:"score",[role]:k};
  const b=draw(as,view);
  chk(as+": `"+role+": "+k+"` over rows that lack it draws no function's text",!leaks(b),text(b).slice(0,200));}
 {const b=draw("list",{label:"toString",fields:["name"]});
  chk("list: a label named `toString` shows the one row that has it, and no function's text",/real text/.test(text(b))&&!leaks(b),text(b).slice(0,200));}
 {const b=draw("tiles",{label:"constructor",value:"valueOf",note:"hasOwnProperty"});
  const t=text(b);
  chk("tiles: a label, a value and a note named like members show the real row's values and nothing else",/real ctor/.test(t)&&/real value/.test(t)&&/real has/.test(t)&&!LEAK.test(t),t.slice(0,200));
  chk("tiles: ten tiles are drawn, one for each row",byClass(b,"dv-tile").length===10,String(byClass(b,"dv-tile").length));}
 {const b=draw("table",{fields:["name","kind"],badge:"kind",tone:"constructor"});
  chk("table: a tone named `constructor` over rows that lack it colours none of them",!walk(b,x=>/tone-/.test(cls(x).join(" "))).length,"");}

 /* ---- group ---- */
 for(const as of ["table","list","cards","tiles"]){
  const b=draw(as,{group:"constructor",fields:["name"],label:"name",value:"score"});
  const heads=byClass(b,as==="table"?"dv-grouprow":"dv-group").map(text);
  chk(as+": grouping by `constructor` makes the rows that lack it one group of no name, and the row that has it its own",
    heads.length===2&&heads.some(h=>/real ctor/.test(h))&&!heads.some(h=>LEAK.test(h)),JSON.stringify(heads));}
 {const b=draw("list",{group:"__proto__",fields:["name"],label:"name"});
  const heads=byClass(b,"dv-group").map(text);
  chk("list: grouping by `__proto__` does the same (the row's own `__proto__` field is its group)",heads.length===2&&heads.some(h=>/real proto/.test(h))&&!heads.some(h=>/object/.test(h)),JSON.stringify(heads));}

 /* ---- sort ---- */
 for(const k of ["constructor","toString","valueOf"]){
  const st=A.newViewState();st.sk=k;st.dir=1;
  const b=draw("table",{fields:["name",k]},st);
  const order=bodyRows(b).map(tr=>text(tr.children[0]));
  chk("sort by `"+k+"` puts the row that has a value first and the rows without one after it, in the file's order",
    order[0]==="Row ten"&&order.slice(1).join()===[1,2,3,4,5,6,7,8,9].map(i=>"Row "+i).join(),order.join("|"));}

 /* ---- filter (the control is drawn from nine rows) ---- */
 {const st=A.newViewState();st.q="native code";
  const b=draw("table",{fields:["name","constructor","toString"]},st);
  chk("a search for a function's text finds no row",byClass(b,"dv-none").length===1&&bodyRows(b).length===0,text(b).slice(0,200));}
 {const st=A.newViewState();st.q="real ctor";
  const b=draw("table",{fields:["name","constructor"]},st);
  const shown=bodyRows(b);
  chk("a search for a row's real value finds that row",shown.length===1&&/Row ten/.test(text(shown[0])),shown.length+"");}
 {const many=JSON.stringify({rows:[1,2,3,4,5,6,7,8,9,10].map(i=>i<=4?{id:"r"+i,name:"Row "+i,constructor:"x"}:i<=6?{id:"r"+i,name:"Row "+i,constructor:"y"}:{id:"r"+i,name:"Row "+i})});
  const st=A.newViewState();st.fk="constructor";st.fv="x";
  const b=A.viewNodes(A.dataSet(JSON.parse(many)),{as:"table",fields:["name","constructor"]},{state:st})[0];
  const opts=tag(b,"optgroup").flatMap(g=>tag(g,"option")).map(text);
  chk("a filter on a field named `constructor` keeps the rows that have that value, and its choices are the field's own values",
    bodyRows(b).length===4&&opts.join("|")==="x|y"&&!leaks(b),bodyRows(b).length+" "+opts.join("|"));}

 /* ---- the open part, and a parent field named like a member ---- */
 {const b=draw("list",{label:"name",fields:["name","score","kind"]});
  const ds=tag(b,"details");
  chk("a list over rows that lack the five fields opens only the row that carries them (no row opens for an inherited member)",
    ds.length===1&&ds[0].attrs["data-id"]==="r10",ds.map(d=>d.attrs["data-id"]).join());
  chk("…and nothing on the list is a function's text",!leaks(b));}
 for(const as of ["table","list","cards"]){
  const b=draw(as,{parent:"constructor",label:"name",fields:["name","score","kind"]});
  chk(as+": a `parent` field named `constructor` nests nothing for rows that lack it (only the row with open fields opens)",
    !leaks(b)&&tag(b,"details").every(d=>d.attrs["data-id"]==="r10"),tag(b,"details").map(d=>d.attrs["data-id"]).join());}

 /* ---- a nested row: the child that lacks the field ---- */
 {const nested='{"rows":[{"id":"p","name":"Parent","items":[{"id":"c1","name":"Child one"},{"id":"c2","name":"Child two","constructor":"child ctor"}]}]}';
  const st=A.newViewState();st.opens.add("p");
  const b=A.viewNodes(A.dataSet(JSON.parse(nested)),{as:"table",fields:["name","constructor"]},{state:st})[0];
  const t=text(b);
  chk("a nested child that lacks `constructor` has an empty cell, and the one that has it shows it",!LEAK.test(t)&&/child ctor/.test(t),t.slice(0,200));}

 /* ---- the labels and the `edit` objects of `fields` ---- */
 {const read=A.readData(JSON.parse('{"fields":{"__proto__":"Proto label","constructor":{"label":"Ctor label","edit":"text"},"toString":{"label":"ToS","edit":"choice","options":["a"]},"name":"Name"},"rows":[{"name":"x"}]}'));
  chk("a label keyed `__proto__` is kept as an own label, like any other",!read.bad&&own(read.fields,"__proto__")&&read.fields["__proto__"]==="Proto label"&&Object.keys(read.fields).join()==="__proto__,constructor,toString,name",
    JSON.stringify(read.fields));
  const r2=A.readData(JSON.parse('{"fields":{"__proto__":{"label":"P","edit":"choice","options":["a","b"]},"name":"Name"},"rows":[{"name":"x"}]}'));
  chk("an `edit` object keyed `__proto__` is an own entry of the edits, and the edits object does not inherit `edit` or `options`",
    own(r2.edits,"__proto__")&&r2.edits["__proto__"].edit==="choice"&&!("edit" in r2.edits)&&!("options" in r2.edits)&&Object.getPrototypeOf(r2.edits)===Object.prototype,
    "edit in edits: "+("edit" in r2.edits));
  const f=A.readFields(JSON.parse('{"__proto__":{"label":"P","options":["a"]},"b":"B"}'));
  chk("readFields on its own does the same",!f.bad&&Object.getPrototypeOf(f.edits)===Object.prototype&&!("options" in f.edits)&&own(f.fields,"__proto__"),Object.keys(f.fields||{}).join());
  const b=A.viewNodes(A.dataSet({fields:read.fields,rows:JSON.parse('[{"name":"x","__proto__":"v1"}]')}),{as:"table",fields:["__proto__","name"]},{state:A.newViewState()})[0];
  chk("a table headed by a field named `__proto__` carries its label and its value",/Proto label/.test(text(b))&&/v1/.test(text(b)),text(b));}

 /* ---- kept entries: a question named like a member, and entries that lack it ---- */
 {const KEEP=(as,fields)=>`---\nbooklet: "0.21"\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|log repeat] Log\n\n> [!number|constructor min:0 max:99] Ctor count\n\n> [!text|toString] Words\n\n> [!text|note] Note\n\n> [!activity|look] Look\n\n\`\`\`booklet query\nfrom: log\nas: ${as}\nfields: ${fields}\n\`\`\`\n\n> [!module|m end] End\n`;
  const R=A.parseFile(KEEP("table","constructor, toString, note"));
  chk("a booklet with questions whose ids are `constructor` and `toString` reads clean",R.ok&&R.unread.length===0,JSON.stringify(R.unread));
  for(const as of ["table","list","cards"]){
   P.wipe();const B=P.boot();B.loadText(KEEP(as,"constructor, toString, note"));
   const keep=B.keptFor("m/log");
   keep.push(JSON.parse('{"ts":"2026-10-01T08:00:00","note":"first"}'),JSON.parse('{"ts":"2026-10-02T08:00:00","note":"second","constructor":7,"toString":"said it"}'));
   const set=B.entrySet({from:"m/log",fields:["constructor","toString","note"]},"m/look",as);
   const b=B.viewNodes(set,{as,fields:["constructor","toString","note"]},{empty:"EMPTY",state:B.newViewState()});
   const t=b.map(text).join("");
   chk("kept entries, "+as+": an entry lacking a question named `constructor` or `toString` shows nothing for it, and the one that has it shows its answer",
     !LEAK.test(t)&&/first/.test(t)&&/second/.test(t)&&/said it/.test(t)&&/7/.test(t),t.slice(0,300));
   chk("kept entries, "+as+": the set's rows have no such field of their own where the entry lacked it",
     set.rows.length===2&&set.rows.every(r=>Object.getPrototypeOf(r)===null)&&set.sortVal(set.rows[0],"constructor")===7&&set.sortVal(set.rows[1],"constructor")===undefined&&set.sortVal(set.rows[1],"toString")===undefined,JSON.stringify(set.rows));}}

 console.log(fails?"\n"+fails+" FAILURES":"\ninherited-member checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
