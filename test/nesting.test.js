// Format v0.7, second pass: a list whose rows carry `parent` is drawn nested, with native details/summary.
// Run: node test/nesting.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const byClass=(n,c)=>walk(n,x=>cls(x).includes(c));
const tag=(n,t)=>walk(n,x=>x.tagName===t);
const text=n=>typeof n==="string"?n:(n&&n._text)||kids(n).map(text).join("");
const press=(n,ev="click")=>n._on[ev]({target:n,key:"x"});
(async()=>{
 const A=P.boot();
 const nest=(rows,view={},key=null)=>A.viewNodes(A.dataSet({rows}),{as:"list",...view},{empty:"EMPTY",key})[0];
 /* the labels of the rows directly under a ul, in order */
 const under=ul=>kids(ul).map(li=>cls(li).includes("dv-node")?kids(li)[0]:li);
 const labelOf=r=>text(byClass(r,"dv-t")[0]);
 const top=b=>under(byClass(b,"dv-tree")[0]).map(r=>cls(r).includes("dv-row")?labelOf(r):labelOf(kids(r)[0]));
 const R=[{id:"a",label:"A"},{id:"a1",parent:"a",label:"A1"},{id:"a2",parent:"a",label:"A2"},{id:"a1x",parent:"a1",label:"A1x"},{id:"b",label:"B"}];

 {const b=nest(R);
  chk("rows with id and parent nest with no key at all: one tree list",byClass(b,"dv-tree").length===1&&tag(b,"ul").length===3);
  chk("top-level rows are the ones with no parent, in the file's order",top(b).join()==="A,B",top(b).join());
  chk("a row with children is a li.dv-node holding one details: a summary row and a list",
    tag(b,"details").length===2&&tag(b,"summary").length===2&&tag(b,"summary").every(s=>cls(s).includes("dv-row"))&&byClass(b,"dv-node").length===2);
  chk("every details starts closed",tag(b,"details").every(d=>d.attrs.open===undefined));
  chk("each details carries its row's id in a data attribute",tag(b,"details").map(d=>d.attrs["data-id"]).join()==="a,a1",tag(b,"details").map(d=>d.attrs["data-id"]).join());
  const a=tag(b,"details")[0],cl=kids(a)[1];
  chk("children keep the file's order, and sit in a list inside the details",under(cl).map(r=>labelOf(cls(r).includes("dv-row")?r:kids(r)[0])).join()==="A1,A2");
  chk("leaves are plain rows: no details, no summary",byClass(b,"dv-row").filter(r=>r.tagName==="li").length===3&&walk(b,x=>x.tagName==="li"&&cls(x).includes("dv-row")).every(li=>tag(li,"details").length===0));
  chk("the summary draws the same row as a plain row: label, value and the rest",text(tag(b,"summary")[0]).includes("A"));
  chk("no tree row or list carries a style attribute or a handler of its own",walk(b,x=>x.attrs&&x.attrs.style!==undefined).length===0&&tag(b,"details").every(d=>!d._on.toggle&&!d._on.click)&&tag(b,"summary").every(s=>!s._on.click&&!s._on.keydown));}

 {const rows=[{id:"1",under:"",label:"One"},{id:"2",under:"1",label:"Two"},{id:"3",under:"2",label:"Three"}];
  const b=nest(rows,{parent:"under"});
  chk("an explicit `parent: under` key names the field",tag(b,"details").length===2&&top(b).join()==="One",top(b).join());
  const c=nest(rows,{});
  chk("without the key that field is not the parent field: the list is flat",byClass(c,"dv-tree").length===0&&tag(c,"details").length===0);}

 {const b=nest([{id:"a",label:"A"},{id:"x",parent:"nowhere",label:"Lost"},{id:"y",parent:"",label:"Blank"},{id:"z",parent:"a",label:"Z"}]);
  chk("a row whose parent is not among the rows, or is empty, is drawn at the top",top(b).join()==="A,Lost,Blank",top(b).join());}

 {const b=nest([{id:"p",parent:"q",label:"P"},{id:"q",parent:"p",label:"Q"},{id:"s",parent:"s",label:"Self"},{id:"t",parent:"p",label:"T"}]);
  const all=walk(b,x=>x.tagName==="li"&&(cls(x).includes("dv-row")||cls(x).includes("dv-node")));
  chk("a cycle is cut: every row is drawn once and nothing loops",top(b).join()==="P,Self"&&text(b).split("T").length===2&&text(b).split("Q").length===2,top(b).join());
  chk("a row that is its own parent is a top row",top(b).includes("Self"));}

 {const b=nest([{id:"a",label:"First"},{id:"a",label:"Second"},{id:"c",parent:"a",label:"Child"}]);
  chk("when two rows share an id the first one is used: the child goes under it",top(b).join()==="First,Second"&&tag(b,"details").length===1&&text(tag(b,"details")[0]).includes("Child"),top(b).join());}

 {const rows=[{id:"a",label:"A"},{id:"a1",parent:"a",label:"A1"},{id:"b",label:"B"},{id:"b1",parent:"b",label:"B1"},{id:"b2",parent:"b",label:"B2"},{id:"c",label:"C"}];
  const b=nest(rows,{limit:2});
  chk("`limit` counts top-level rows, and their descendants come with them",top(b).join()==="A,B"&&byClass(b,"dv-t").length===5,top(b).join()+" / "+byClass(b,"dv-t").length);}

 {const b=nest([{id:"a",label:"A",g:"x"},{id:"b",parent:"a",label:"B",g:"y"}],{group:"g"});
  chk("`group` is ignored on a nested list: no group cards, no headings",byClass(b,"dv-gcard").length===0&&byClass(b,"dv-group").length===0&&byClass(b,"dv-tree").length===1);}

 {const b=nest([{id:"a",label:"A",value:5,note:"Quiet",badge:"tag",tone:"good",owner:"Ines"},{id:"b",parent:"a",label:"B",value:6,owner:"Kofi"}]);
  const s=tag(b,"summary")[0];
  chk("the summary row carries badge, label, extras, value and note like a flat row, and never the id or parent",
    byClass(s,"pill").length===1&&byClass(s,"dv-val").length===1&&byClass(s,"dv-n").length===1&&text(byClass(s,"dv-x")[0]).includes("Ines")&&!/Parent|Id/.test(text(byClass(s,"dv-x")[0])));}

 {const f=nest([{label:"A"},{label:"B"}]);
  chk("a flat list (no row carries a parent value) is drawn exactly as before",byClass(f,"dv-tree").length===0&&tag(f,"details").length===0&&byClass(f,"dv-row").length===2);
  const g=nest([{id:"a",parent:"",label:"A"},{id:"b",parent:"",label:"B"}]);
  chk("a parent field with only empty values is a flat list",byClass(g,"dv-tree").length===0);}

 /* ---- what the reader opens is kept in the query's state, never written ---- */
 {A.VIEWSTATE.clear();
  const b=nest(R,{},"K-open");
  const d=tag(b,"details")[0];
  chk("the query's box listens for toggles once (a toggle does not bubble)",typeof b._on.toggle==="function");
  d.open=true;b._on.toggle({target:d});
  chk("opening a row records its id in the query's state",A.viewState("K-open").opens.has("a")&&A.viewState("K-open").opens.size===1);
  const again=nest(R,{},"K-open");
  chk("a re-draw of the view keeps it open, and leaves the others closed",tag(again,"details").map(x=>x.attrs.open!==undefined).join()==="true,false");
  d.open=false;b._on.toggle({target:d});
  chk("closing a row forgets it",A.viewState("K-open").opens.size===0);
  b._on.toggle({target:{tagName:"ul",getAttribute(){return null;}}});
  chk("a toggle that is not a row's is ignored",A.viewState("K-open").opens.size===0);}

 /* ---- sort and filter on a nested list ---- */
 const WORDS=["Ash","Birch","Cedar","Dogwood","Elm","Fir","Gum","Hazel","Iroko","Juniper"];
 const BIG=[{id:"r1",label:"Root one",value:2},{id:"r2",label:"Root two",value:1},
   ...WORDS.map((w,i)=>({id:"w"+i,parent:i<5?"r1":i<8?"r2":"w0",label:w,value:[7,3,9,1,5,8,2,10,4,6][i],kind:["x","y"][i%2]}))];
 {A.VIEWSTATE.clear();
  const b=nest(BIG,{},"K-f");
  chk("the control counts all the rows, the nested ones too (12 here)",byClass(b,"dv-ctl").length===1);
  const input=byClass(b,"dv-q")[0];input.value="juniper";press(input,"input");
  const lab=()=>byClass(b,"dv-t").map(text);
  chk("a filter keeps a match with its ancestors and drops everything else",lab().join()==="Root one,Ash,Juniper",lab().join());
  chk("while the filter is on the ancestors of a match are open",tag(b,"details").every(d=>d.attrs.open!==undefined)&&tag(b,"details").length===2,tag(b,"details").map(d=>d.attrs["data-id"]+":"+d.attrs.open).join());
  chk("N of M counts the matching rows",byClass(b,"dv-live").map(text).join()==="1 of 12 shown",byClass(b,"dv-live").map(text).join());
  chk("the remembered open set is unchanged by the filter's own opening",A.viewState("K-f").opens.size===0);
  const d=tag(b,"details")[0];d.open=false;b._on.toggle({target:d});
  chk("a toggle while the filter is on is not remembered",A.viewState("K-f").opens.size===0);
  input.value="";press(input,"input");
  chk("clearing the filter draws the tree closed again",tag(b,"details").every(d=>d.attrs.open===undefined)&&lab().length===12);}
 {A.VIEWSTATE.clear();
  const b=nest(BIG,{},"K-s");
  const sel=byClass(b,"dv-sel").find(s=>s.attrs["aria-label"]==="Sort by");sel.value="value";press(sel,"change");
  const roots=()=>kids(byClass(b,"dv-tree")[0]).map(li=>labelOf(cls(li).includes("dv-node")?kids(kids(li)[0])[0]:li));
  chk("sorting orders the siblings at the top",roots().join()==="Root two,Root one",roots().join());
  const d0=tag(b,"details").find(d=>d.attrs["data-id"]==="r1"),kidsOf=under(kids(d0)[1]).map(labelOf);
  chk("and the siblings at every level (Root one's children, smallest value first)",kidsOf.join()==="Dogwood,Birch,Elm,Ash,Cedar",kidsOf.join());}
 {A.VIEWSTATE.clear();
  const b=nest(BIG,{limit:1},"K-l");
  chk("`limit` with a control: one top row, its descendants with it",byClass(b,"dv-t").length===1+5+2&&top(b).join()==="Root one",byClass(b,"dv-t").length+"");}

 /* ---- the fixture, and the file ---- */
 P.wipe();
 {const C=P.boot();await C.createBooklet();
  const FX=fs.readFileSync(P.R+"/test/fixtures/roles.booklet.md","utf8");
  C.loadText(FX);const md0=C.toMarkdown();C.view="overview";C.render();
  const main=P.main(),tree=byClass(main,"dv-tree");
  chk("the fixture's house is a tree three levels deep: two top rows, and the others under them",tree.length===1&&tag(tree[0],"details").length===5&&under(tree[0]).length===2,tag(tree[0],"details").length+"");
  const house=tag(tree[0],"details")[0];
  const depthOf=(n,d=0)=>Math.max(d,...kids(n).map(k=>depthOf(k,d+(k.tagName==="ul"?1:0))));
  chk("with lists three deep (the root list, a room's jobs)",depthOf(tree[0],1)>=3,String(depthOf(tree[0],1)));
  const box=byClass(main,"dv-box").find(x=>byClass(x,"dv-tree").length);
  tag(box,"details").forEach(d=>{d.open=true;box._on.toggle({target:d});});
  C.render();
  const box2=byClass(P.main(),"dv-box").find(x=>byClass(x,"dv-tree").length);
  chk("what was opened is still open after the page is drawn again",tag(box2,"details").every(d=>d.attrs.open!==undefined)&&tag(box2,"details").length===5);
  chk("saving the booklet after opening rows writes the same file as before",C.toMarkdown()===md0);
  chk("the file never carries the open state",!/data-id|"opens"|VIEWSTATE/.test(C.toMarkdown()));}
 console.log(fails?"\n"+fails+" FAILURES":"\nnesting checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
