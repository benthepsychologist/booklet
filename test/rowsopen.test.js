// Format 0.19, rows that open: table, list and cards nest by `parent` and by a field that holds rows; a row opens to its other
// fields (plain text, line breaks kept) and then its children, in groups headed by the field they came from; the open part is
// drawn when the row opens; a filter, a sort and `limit` follow the one rule for every nested view; a data fence may name a file.
// Run: node test/rowsopen.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const F=require("./dashboard-fixture.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const byClass=(n,c)=>walk(n,x=>cls(x).includes(c));
const tag=(n,t)=>walk(n,x=>x.tagName===t);
const text=n=>typeof n==="string"?n:(n&&n._text)||kids(n).map(text).join("");
(async()=>{
 const A=P.boot();
 const ST=new Map(),st=k=>{if(!ST.has(k)) ST.set(k,A.newViewState());return ST.get(k);};
 const FIELDS={title:"Name",kind:"Kind",about:"What it says",projects:"Projects",items:"Work items",notes:"Notes"};
 const DATA={fields:FIELDS,rows:[
   {id:"p1",title:"Garden",kind:"hub",about:"One.\n\nTwo.",projects:[
     {id:"j1",title:"Beds",kind:"Project",about:"Dig",items:[{id:"r1",title:"Order timber",kind:"Item"},{id:"r2",title:"Cut boards",kind:"Item"}]},
     {id:"j2",title:"Pond",kind:"Project"}]},
   {id:"p2",title:"Orchard",kind:"hub"},
   {id:"p3",title:"Shed",kind:"hub",about:"Only text",notes:[]}]};
 const draw=(as,view={},key="k",data=DATA)=>A.viewNodes(A.dataSet(data),{as,...view},{empty:"EMPTY",state:st(key)})[0];
 /* the open rows of a state, as a reader's clicks leave them: the toggle reaches the box's one listener */
 const press=(b,d)=>{d._opened=true;d.open=true;b._on.toggle({target:d});};
 const openAll=b=>{for(let i=0;i<60;i++){const ds=tag(b,"details").filter(d=>!d._opened);if(!ds.length) break;ds.forEach(d=>press(b,d));}};

 /* ---- reading the rows ---- */
 {const r=A.parseFile('---\nbooklet: "0.19"\ntitle: T\nlang: en\n---\n\n> [!activity|a] A\n\n```booklet query\nfrom: d\nas: table\nreadonly\n```\n\n```booklet data\n'+JSON.stringify(DATA)+'\n```\n^d\n');
  chk("a data block whose rows hold rows reads clean (a list of rows, and a row that is one row)",r.ok&&r.unread.length===0,JSON.stringify(r.unread));
  const q=r.template.activities?r.template.activities[0].pages[0].blocks.find(b=>b.type==="query"):null;
  chk("a bare `readonly` line is a key with no value, kept on the view and drawn as nothing",!q||q.view.readonly===true,JSON.stringify(q&&q.view));}
 {const mk=rows=>A.parseFile('---\nbooklet: "0.19"\ntitle: T\nlang: en\n---\n\n> [!activity|a] A\n\n```booklet query\nfrom: d\n```\n\n```booklet data\n'+rows+'\n```\n^d\n');
  chk("a row that is one row (an object) reads clean",mk('[{"id":"a","one":{"id":"b"}}]').unread.length===0);
  chk("a list that mixes values and rows is refused with its reason",mk('[{"x":[1,{"id":"b"}]}]').unread.some(p=>/mixes values and rows/.test(p)));
  chk("a row that is not an object is refused at any depth",mk('[{"x":[{"id":"b"},3]}]').unread.some(p=>/mixes values and rows/.test(p))&&mk('[{"x":[{"y":[1,{"z":1}]}]}]').unread.some(p=>/mixes/.test(p)));
  chk("`fields` may give a label as a string or as an object with a label, an `edit` kind and `options`",
    mk('{"fields":{"a":"A","b":{"label":"B","edit":"choice","options":["x","y"]}},"rows":[{"a":1,"b":"x"}]}').unread.length===0);
  chk("a field object whose label is not a string is refused",mk('{"fields":{"a":{"label":3}},"rows":[]}').unread.some(p=>/fields/.test(p)));
  const deep=n=>{let t="";for(let i=0;i<n;i++) t+='{"id":"x'+i+'","kids":[';t+='{"id":"end"}';for(let i=0;i<n;i++) t+=']}';return "["+t+"]";};
  const rd=mk(deep(4000));
  chk("a chain thousands of rows deep reads and is walked without a stack overflow",rd.unread.length===0);
  {const blk=rd.template.activities?rd.template.activities[0]:rd.template.modules[0].activities[0];const q=blk.pages[0].blocks.find(b=>b.type==="query");
   const T=A.dataSet(q.data);const v=A.viewNodes(T,{as:"list",label:"id"},{state:A.newViewState()});
   chk("and it draws (its top row only, shut)",T.all.length===4001&&v.length===1);}}
 {const T=A.dataSet({fields:FIELDS,rows:DATA.rows});
  chk("every row at every depth is in `all`, in the file's order, and the fields that hold rows are not the source's own fields",
    T.all.map(r=>r.id).join()==="p1,j1,r1,r2,j2,p2,p3"&&!T.own.includes("projects")&&!T.own.includes("items")&&T.own.join()==="title,kind,about,notes",T.all.map(r=>r.id).join()+" / "+T.own.join());}

 /* ---- a field holds child rows in the rows that have them, and is a plain value in the rows that do not ---- */
 {const MIX={fields:{title:"Name",items:"Items",extra:"Extra"},rows:[{id:"a",title:"Has kids",items:[{id:"a1",title:"Kid"}]},{id:"b",title:"Plain note",items:"n/a for this one",extra:"x"}]};
  for(const [as,view] of [["list",{label:"title"}],["cards",{label:"title"}]]){   /* a table is held to the same rule in test/dashboard-browser.js, where rows can be added after it */
   ST.clear();const b=draw(as,view,"mix-"+as,MIX);openAll(b);const t=text(b);
   chk("("+as+") a row whose field is a plain value shows it in its open part, though another row holds child rows in that field",/Items/.test(t)&&t.includes("n/a for this one"),t.replace(/\s+/g," "));
   chk("("+as+") the row that holds child rows in it draws them as children, not as a value",t.includes("Kid")&&!t.includes("[object Object]"),t.replace(/\s+/g," "));}
  chk("a field that holds child rows in some row is still not one of the source's own fields (so never a column or a line)",!A.dataSet(MIX).own.includes("items"));}

 /* ---- the file's own fence: a name and a key path ---- */
 {const mk=(info,code)=>A.parseFile('---\nbooklet: "0.19"\ntitle: T\nlang: en\n---\n\n> [!activity|a] A\n\n```booklet query\nfrom: d\n```\n\n```booklet data '+info+'\n'+(code||"")+'\n```\n^d\n');
  const block=r=>{const a=r.template.activities?r.template.activities[0]:r.template.modules[0].activities[0];return a.pages[0].blocks.find(b=>b.type==="query");};
  {const r=mk("dash.json programmes");const b=block(r);
   chk("a fence that names a file reads clean with an empty body, and the query carries the file name and key path",r.ok&&r.unread.length===0&&b.data&&b.data.file.name==="dash.json"&&b.data.file.path==="programmes"&&b.data.rows.length===0,JSON.stringify(r.unread));}
  {const r=mk("dash.json","{\"fields\":{\"t\":\"Name\"}}");const b=block(r);
   chk("its body may hold only `fields`, which label the file's keys",r.unread.length===0&&b.data.fields.t==="Name");}
  {const r=mk("dash.json","{\"rows\":[{\"a\":1}]}");
   chk("rows in the body of a fence that names a file are said and not read",r.unread.some(p=>/its rows were not read/.test(p))&&block(r).data.rows.length===0);}
  for(const bad of ["../x.json","/x.json","a//b.json",".hidden.json","x.txt","a:b.json","x.json?q=1"]){const r=mk(bad);
   chk("the name “"+bad+"” is said and never read (the block keeps its place, marked refused)",r.unread.some(p=>/never read/.test(p))&&block(r).data.file.bad===true,JSON.stringify(r.unread));}
  {const r=mk("dash.json a..b");chk("a key path with an empty part is said and never read",r.unread.some(p=>/not keys of letters, digits, _ and -/.test(p))&&block(r).data.file.bad===true,JSON.stringify(r.unread));}
  for(const bad of ["a b.c".replace(" ","$"),"a+b","a:b","a/b","a.","é.x"]){const r=mk("dash.json "+bad);
   chk("a key path of “"+bad+"”, which is not keys of letters, digits, _ and - joined by dots, is said and never read",r.unread.some(p=>/not keys of letters, digits, _ and -/.test(p))&&block(r).data.file.bad===true,JSON.stringify(r.unread));}
  for(const ok of ["a","a.b","plots_1.in-box.Requests2"]){const r=mk("dash.json "+ok);
   chk("a key path of “"+ok+"” is read",r.unread.length===0&&block(r).data.file.bad===false,JSON.stringify(r.unread));}
  {const D=A.dataFromJson,json={a:[{id:"x"},{id:"y"}],o:{rows:[{id:"r"}]}};
   chk("a key path walks object members only: through an array it finds nothing, and the quiet box says so",!!D({name:"d.json",path:"a.1"},json).note&&!D({name:"d.json",path:"a.1"},json).data&&!!D({name:"d.json",path:"a.0.id"},json).note);
   chk("a key path through objects reads the list or the object with `rows` at its end",D({name:"d.json",path:"a"},json).data.rows.length===2&&D({name:"d.json",path:"o"},json).data.rows[0].id==="r");}
  chk("a file name of 201 characters is refused",mk("a".repeat(196)+".json").unread.some(p=>/never read/.test(p)));}

 /* ---- a nested list ---- */
 {ST.clear();const b=draw("list",{label:"title",fields:["kind"]},"L");
  chk("rows that hold rows nest with no key at all: a tree list",byClass(b,"dv-tree").length===1);
  const top=tag(byClass(b,"dv-tree")[0],"li").filter(li=>tag(li,"li").length>=0&&li===kids(byClass(b,"dv-tree")[0]).find(x=>x===li));
  chk("three top rows; the one with children or an open part is a details, the others plain rows",kids(byClass(b,"dv-tree")[0]).length===3&&tag(b,"details").length===2,tag(b,"details").length+"");
  chk("every details is closed and holds only its summary (the open part is drawn when it opens)",tag(b,"details").every(d=>kids(d).length===1&&d.attrs.open===undefined));
  chk("a row with nothing more to show (no other field, no child) is a plain row",kids(byClass(b,"dv-tree")[0]).filter(x=>cls(x).includes("dv-row")).length===1);
  const d0=tag(b,"details")[0];press(b,d0);
  const more=byClass(d0,"dv-more")[0];
  chk("it opens to its other fields first, each under its label",!!more&&tag(more,"dt").map(text).join()==="What it says"&&text(tag(more,"dd")[0]).startsWith("One."),more&&text(more));
  chk("the text is plain, with its line breaks kept",cls(tag(more,"dd")[0]).includes("dv-text")&&tag(more,"dd")[0].children.every(c=>typeof c==="string")&&text(tag(more,"dd")[0])==="One.\n\nTwo.");
  const g=kids(d0).slice(2);
  chk("then its children, in a group headed by the field's label",cls(g[0]).includes("dv-ghead")&&text(g[0])==="Projects"&&g[1].tagName==="ul",g.map(x=>x.tagName+":"+text(x)).join("|"));
  chk("what a row opens to is drawn once: a second toggle adds nothing",(()=>{const n=kids(d0).length;press(b,d0);return kids(d0).length===n;})());
  const j1=tag(d0,"details")[1];press(b,j1);
  chk("a child opens the same way, to its fields and then its own group (Work items)",tag(j1,"dt").map(text).join()==="What it says"&&byClass(j1,"dv-ghead").map(text).join()==="Work items"&&tag(j1,"li").filter(li=>cls(li).includes("dv-row")).length===2);
  chk("opening is remembered by the row's id for the visit",[...st("L").opens].sort().join()==="j1,p1");
  const again=draw("list",{label:"title",fields:["kind"]},"L");
  chk("a draw again, as after a data refresh, shows the rows that were open open, with their children drawn, and the rest shut",
    tag(again,"details").filter(d=>d.attrs.open!==undefined).map(d=>d.attrs["data-id"]).join()==="p1,j1"&&byClass(again,"dv-more").length===2&&byClass(tag(again,"details")[0],"dv-ghead").length===2,tag(again,"details").map(d=>d.attrs["data-id"]+":"+d.attrs.open).join());}
 {ST.clear();const rows=[{id:"a",title:"A",parent:"",n:1},{id:"a1",title:"A1",parent:"a",n:2},{id:"b",title:"B",n:3}];
  const b=draw("list",{label:"title"},"F",{rows});
  chk("rows nested by `parent` and rows nested as data are one tree: both draw the same way",tag(b,"details").length===1&&byClass(b,"dv-ghead").length===0);
  press(b,tag(b,"details")[0]);
  chk("children found by `parent` are one group with no heading",byClass(b,"dv-ghead").length===0&&text(tag(b,"details")[0]).includes("A1"));}

 /* ---- `limit`, `group`, filter and sort follow one rule ---- */
 {ST.clear();const b=draw("list",{label:"title",limit:2},"Lim");
  chk("`limit` counts top rows on a nested view",kids(byClass(b,"dv-tree")[0]).length===2);
  const g=draw("table",{group:"kind",fields:["title", "kind"]},"Grp");
  chk("`group` is not drawn on a nested view",byClass(g,"dv-grouprow").length===0&&byClass(g,"dv-group").length===0);}

 /* ---- a nested table ---- */
 {ST.clear();const b=draw("table",{fields:["title", "kind"]},"T");
  const trs=tag(b,"tr").filter(tr=>cls(tr).includes("dv-trow"));
  chk("a table nests as one body of rows in the same columns: the top rows only while all are shut",tag(b,"tbody").length===1&&trs.length===3&&trs.every(tr=>tr.attrs["data-depth"]==="0"),trs.length+"");
  chk("a row that opens carries a native disclosure in its lead cell, a row that does not carries none",tag(b,"details").length===2&&tag(trs[1],"details").length===0);
  chk("the table's own headings keep their sort buttons",tag(b,"th").length===2);
  ST.get("T").opens.add("p1");ST.get("T").opens.add("j1");
  const o=draw("table",{fields:["title", "kind"]},"T");
  const rows=tag(o,"tr");
  const kinds=rows.map(r=>cls(r).includes("dv-trow")?"row"+r.attrs["data-depth"]:cls(r).includes("dv-trmore")?"more"+r.attrs["data-depth"]:cls(r).includes("dv-grouprow")?"head"+r.attrs["data-depth"]:"h").join();
  chk("a row kept open is drawn open, in order: its open part, a heading, its child rows one step in, theirs in turn",
    kinds==="h,row0,more1,head1,row1,more2,head2,row2,row2,row1,row0,row0","\n"+kinds);
  chk("the open part spans every column",tag(rows.find(r=>cls(r).includes("dv-trmore")),"td")[0].attrs.colspan==="2");
  chk("the lead cell holds one indent spacer for each level",byClass(rows.filter(r=>r.attrs["data-depth"]==="2"&&cls(r).includes("dv-trow"))[0],"dv-ind").length===2);}

 /* ---- nested cards ---- */
 {ST.clear();const b=draw("cards",{label:"title",fields:["kind"]},"C");
  chk("cards nest: a card that has more to show is a fold card, a card that has none is an item card",byClass(b,"card-fold").length===2&&byClass(b,"card-item").length===1,byClass(b,"card-fold").length+" "+byClass(b,"card-item").length);
  chk("a fold card is closed and its body is empty until it opens",byClass(b,"cd-body").every(x=>kids(x).length===0));
  const f=byClass(b,"card-fold")[0];press(b,f);
  const body=byClass(f,"cd-body")[0];
  chk("it opens to its other fields, then a heading and its child cards",kids(body).map(x=>cls(x).filter(c=>/^dv-/.test(c)).join(".")).join()==="dv-more,dv-ghead,dv-cards.dv-sub",kids(body).map(x=>x.tagName).join());}

 /* ---- a filter and a sort on a tree (data nested) ---- */
 {ST.clear();
  const many={fields:FIELDS,rows:[{id:"r1",title:"Root one",n:2,items:[1,2,3,4,5,6,7,8].map(i=>({id:"c"+i,title:"Child "+"ABCDEFGH"[i-1],n:9-i}))},{id:"r2",title:"Root two",n:1}]};
  const b=draw("list",{label:"title",fields:["n"]},"S",many);
  const input=byClass(b,"dv-q")[0];input.value="child c";press;input._on.input({target:input});
  const labs=byClass(b,"dv-t").map(text);
  chk("a filter keeps a match with its ancestors, and opens them while it is on (its children are drawn)",labs.join()==="Root one,Child C"&&tag(b,"details").length===1&&tag(b,"details")[0].attrs.open!==undefined,labs.join());
  chk("the filter's own opening is not remembered",st("S").opens.size===0);
  input.value="";input._on.input({target:input});
  const sel=byClass(b,"dv-sel").find(s=>s.attrs["aria-label"]==="Sort by");sel.value="n";sel._on.change({target:sel});
  openAll(b);
  const kidsOf=byClass(tag(b,"details")[0],"dv-t").map(text);
  chk("sorting reorders each set of siblings and keeps the tree",byClass(b,"dv-t").map(text)[0]==="Root two"&&kidsOf.join()==="Root one,Child H,Child G,Child F,Child E,Child D,Child C,Child B,Child A",kidsOf.join());
  const oa=byClass(b,"dv-openall")[0],ca=byClass(b,"dv-closeall")[0];
  chk("a nested view with a control offers Open all and Close all",!!oa&&!!ca);
  ca._on.click({});chk("Close all shuts every row and forgets them",tag(b,"details").every(d=>d.attrs.open===undefined)&&st("S").opens.size===0);
  oa._on.click({});chk("Open all opens every row that has more to show, and a draw again keeps them",tag(b,"details").every(d=>d.attrs.open!==undefined)&&st("S").opens.size===1);}

 /* ---- a view that does not nest is unchanged ---- */
 {const flat=[{title:"A",kind:"x"},{title:"B",kind:"y"}];
  chk("a table, a list and cards over flat rows draw as before: no tree, no disclosure",["table","list","cards"].every(as=>{const b=draw(as,{label:"title"},"flat-"+as,{rows:flat});return tag(b,"details").length===0&&byClass(b,"dv-tree").length===0;}));
  const nested=draw("tiles",{label:"title"},"tiles");
  chk("tiles, bars and a line draw the top rows only when the rows hold rows",byClass(nested,"dv-tile").length+byClass(nested,"pill").length===3,byClass(nested,"pill").length+"");}

 /* ---- a flat row with more to show than its line opens (SPEC.md section 6, "What opens") ---- */
 {const flat={fields:{title:"Name",kind:"Kind",about:"What it says"},rows:[{id:"a",title:"A",kind:"x",about:"Extra\n\nlines"},{id:"b",title:"B"}]};
  for(const as of ["table","list","cards"]){ST.clear();
   const b=draw(as,{label:"title",fields:["title"]},"F-"+as,flat);
   chk("flat rows on "+as+": the row with a field left over is a disclosure, the row with none is plain, and no tree of children is drawn",
     tag(b,"details").length===1&&(as==="cards"?byClass(b,"card-item").length===1:true),tag(b,"details").length+"");
   /* a table's open rows are drawn by the page as it draws, so its row is kept open in the view's state and drawn again */
   let o=b;if(as==="table"){st("F-table").opens.add("a");o=draw("table",{label:"title",fields:["title"]},"F-table",flat);}
   else press(b,tag(b,"details")[0]);
   const rowsEl=as==="table"?byClass(o,"dv-trmore"):byClass(tag(b,"details")[0],"dv-more");
   const labels=tag(rowsEl[0],"dt").map(text).join(),vals=tag(rowsEl[0],"dd").map(text).join();
   chk("flat rows on "+as+": it opens to the fields the line does not show (Kind, What it says), each under its label, text kept as written",
     labels==="Kind,What it says"&&vals==="x,Extra\n\nlines",labels+" / "+vals);
   chk("flat rows on "+as+": with no `fields:` the line shows every plain field, so no row opens",
     tag(draw(as,{label:"title"},"F0-"+as,flat),"details").length===0);}
  {ST.clear();const b=draw("list",{label:"title",fields:["title"],group:"kind"},"FG",flat);
   chk("flat rows that open may still be grouped: each group is headed, and the group field is not shown again",
     byClass(b,"dv-group").length===2&&tag(b,"details").length===1&&!tag(b,"dt").map(text).includes("Kind"));
   const t=draw("table",{fields:["title"],group:"kind"},"FGT",flat);
   chk("and so are a table's rows",tag(t,"tr").filter(tr=>cls(tr).includes("dv-grouprow")).length===2&&tag(t,"details").length===1);}
 }

 /* ---- the open part shows every field that plays no role, at every depth, declared or not ---- */
 /* every row open: a table draws an open row itself, from the view's state; list and cards draw it when its disclosure is pressed */
 const drawOpen=(as,view,key,data,ids)=>{if(as==="table"){ids.forEach(i=>st(key).opens.add(i));return draw(as,view,key,data);}const b=draw(as,view,key,data);openAll(b);return b;};
 {const nodecl=[{id:"a",title:"A",kids:[{id:"b",title:"B",secret:"only in child"}]},{id:"c",title:"C",late:"only in a later row"}];
  for(const as of ["table","list","cards"]){ST.clear();
   const b=draw(as,{label:"title",fields:["title"]},"K-"+as,{rows:nodecl});
   chk("no `fields` declared, "+as+": the row with children opens, and the later row with a key the first lacks opens",tag(b,"details").length===2,tag(b,"details").length+"");
   const o=drawOpen(as,{label:"title",fields:["title"]},"K-"+as,{rows:nodecl},["a","b","c"]);
   const all=tag(o,"dt").map(text).concat(tag(o,"dd").map(text));
   chk("and the open part holds the child row's own field and the later row's field, under their names",
     all.includes("secret")&&all.includes("only in child")&&all.includes("late")&&all.includes("only in a later row"),all.join("|"));}
  ST.clear();
  const b=drawOpen("list",{label:"title",fields:["title"]},"K2",{fields:{title:"Name"},rows:nodecl});
  chk("declared `fields` do not hide a key a row has beyond them",tag(b,"dt").map(text).includes("secret")&&tag(b,"dt").map(text).includes("late"));
  ST.clear();
  const r=drawOpen("list",{label:"title",fields:["title"],value:"n"},"K3",{rows:[{id:"a",title:"A",n:3,parent:"",hid:"h"}]});
  chk("a field that plays a role (value), `id` and the `parent` field are not in the open part",tag(r,"dt").map(text).join()==="hid",tag(r,"dt").map(text).join());}

 /* ---- readonly is last in every view's list of keys it draws ---- */
 chk("`readonly` ends the list of tiles, bars and line, and is followed only by `add` and `delete` in the three views that nest (0.20)",Object.entries(A.VIEW_DRAWS).every(([v,l])=>{const tail=["table","list","cards"].includes(v)?["readonly","add","delete"]:["readonly"];return l.slice(-tail.length).join()===tail.join();})&&Object.keys(A.VIEW_DRAWS).length===6);

 /* ---- a question asked for each row (`each:` over a data block) is read, and drawn in the rows (test/dashedit.test.js) ---- */
 {const mk=each=>A.parseFile('---\nbooklet: "0.19"\ntitle: T\nlang: en\n---\n\n> [!activity|a] A\n\n```booklet query\nfrom: reqs\nas: list\n```\n\n> [!text|reply each:'+each+'] A word of reply\n\n```booklet data\n[{"id":"r1","title":"One"}]\n```\n^reqs\n');
  const r=mk("reqs"),act=r.template.activities?r.template.activities[0]:r.template.modules[0].activities[0];
  const q=act.pages[0].blocks.find(b=>b.type==="text");
  chk("an `each:` over a data block in reach reads clean, with no 'could not read' notice, and keeps its `each`",r.unread.length===0&&q&&q.each==="reqs",JSON.stringify(r.unread));
  chk("an answer of its shape (pairs) is not set apart as written: the rows draw it",A.keptQuestion(q,{reply:[{pick:"r1",a:"hello"}]})===null);
  const n=A.keptQuestion(q,{reply:"hello"});
  chk("an answer of another shape is still shown as written, with the notice",!!n&&byClass(n,"hint").length===1&&text(n).includes("A word of reply"),n&&text(n));
  chk("an `each:` that names nothing in its activity or in reach is still said and taken off",mk("nothere").unread.length===1);}

 /* ---- a field named like a function on every object ---- */
 {ST.clear();const F2={title:"Name",constructor:"Ctor",toString:"Text"};
  const rows=[{id:"a",title:"Plain"},{id:"b",title:"Has it",constructor:"made by hand",toString:"also by hand"}];
  const b=draw("list",{label:"title",fields:["title"]},"Proto",{fields:F2,rows});
  chk("a row lacking a field named `constructor` or `toString` has no open part: it is a plain row, not a details",tag(b,"details").length===1&&tag(b,"details")[0].attrs["data-id"]==="b",tag(b,"details").map(d=>d.attrs["data-id"]).join());
  press(b,tag(b,"details")[0]);
  const t=text(byClass(b,"dv-more")[0]||"");
  chk("a row that has them shows its own values, and no function's text appears anywhere",/made by hand/.test(t)&&/also by hand/.test(t)&&!/native code|function/.test(text(b)),t);}

 /* ---- the made-up dashboard of about 450 rows ---- */
 {ST.clear();const data=F.make(),n=F.count(data);
  const t0=Date.now();const b=A.viewNodes(A.dataSet({fields:F.FIELDS,rows:data.programmes}),{as:"table",fields:["title", "kind", "stage"]},{state:st("big")})[0];const ms=Date.now()-t0;
  chk("the fixture holds about 450 rows at every depth ("+n+") and draws only its top rows while shut",n>=440&&n<=480&&tag(b,"tr").filter(tr=>cls(tr).includes("dv-trow")).length===6,n+"");
  console.log("  info  node draw of "+n+" rows, shut: "+ms+" ms (fake DOM; the browser test measures the real one)");}
 console.log(fails?"\n"+fails+" FAILURES":"\nrows-that-open checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
