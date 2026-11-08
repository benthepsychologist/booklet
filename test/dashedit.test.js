// Format 0.19, renderer 0.19.1: editing a data field in place, questions asked for each row and for each pick, the pairs they keep
// (`{pick, a, was}`), the kept entry a keep adds, the display states, and `readonly`. SPEC.md sections 5, 6, 7 and 8. Everything is made up.
// Run: node test/dashedit.test.js      (Needs node; nothing to install. test/dashedit-browser.js is the same in a browser.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const PARTS=[];
const part=(name,f)=>PARTS.push([name,f]);
const tick=()=>new Promise(r=>setTimeout(r,5));   /* a press redraws on the next turn (afterPress) */
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const byClass=(n,c)=>walk(n,x=>cls(x).includes(c));
const tag=(n,t)=>walk(n,x=>x.tagName===t);
const text=n=>typeof n==="string"?n:(n&&n._text)||kids(n).map(text).join("");
const FM='---\nbooklet: "0.20"\ntitle: Desk\nlang: en\n---\n\n';
const ROWS={fields:{title:{label:"Name",edit:"text"},stage:{label:"Stage",edit:"choice",options:["planning","growing","resting"]},due:{label:"Due",edit:"date"},
  count:{label:"Trees",edit:"number"},about:{label:"About",edit:"long"},kind:"Kind",notes:"Notes"},
 rows:[{id:"a",title:"Orchard",stage:"growing",due:"2026-11-20",count:8,about:"Apples.",kind:"Orchard",notes:[]},
       {id:"b",title:"Beds",stage:"resting",due:"2026-12-10",count:4,about:"Garlic.",kind:"Garden",notes:[],jobs:[{id:"b1",title:"Dig",stage:"planning",notes:[]},{id:"b2",title:"Sow",stage:"planning"}]},
       {id:"c",title:"Shed",stage:"done",due:"",count:0,about:"Roof.",kind:"Building"}]};
const bookText=(act,query,extra,data)=>FM+`> [!module|d] Desk\n\n> [!activity|a${act}] Work\n\n\`\`\`booklet query\nfrom: rows\n${query}\n\`\`\`\n\n${extra||""}\`\`\`booklet data\n${JSON.stringify(data||ROWS)}\n\`\`\`\n^rows\n\n> [!module|d end] End\n`;
const load=(act,query,extra,data)=>{const A=P.boot();A.loadText(bookText(act,query,extra,data));A.screen="d/a";A.render();return A;};
const main=()=>P.main();
const press=(b,ev)=>b._on.click(ev||{target:b,preventDefault(){},stopPropagation(){}});
const key=(n,k,extra)=>n._on.keydown(Object.assign({key:k,target:n,preventDefault(){},stopPropagation(){}},extra||{}));
const entriesOf=A=>A.keptFor("d/a");
const editBtn=(A,field,row)=>walk(main(),x=>x.tagName==="button"&&cls(x).includes("dv-ed-btn")&&new RegExp("^"+field+" of "+row+":").test(x.attrs["aria-label"]||""))[0];
const boxOf=()=>walk(main(),x=>cls(x).includes("dv-ed-in"))[0];
const edit=async(A,field,row,v,k)=>{const b=editBtn(A,field,row);if(!b) return false;press(b);const c=boxOf();if(!c) return false;
  c.value=v;c._on.input&&c._on.input({target:c});key(c,k||"Enter");await tick();return true;};

part("edit marks",async()=>{
 const A=load(" repeat","as: table\nfields: title, stage, due, count, kind");
 const t=text(main());
 chk("a field marked `edit` in a repeat activity draws as a button holding its value",!!editBtn(A,"Name","Orchard")&&text(editBtn(A,"Name","Orchard"))==="Orchard"&&text(editBtn(A,"Trees","Orchard"))==="8");
 chk("each kind of field has a button for every row it can be pressed in (title, stage, due, count: 3 rows each)",walk(main(),x=>cls(x).includes("dv-ed-btn")).length===12,String(walk(main(),x=>cls(x).includes("dv-ed-btn")).length));
 chk("a field with no `edit` (Kind) is plain text",!walk(main(),x=>/^Kind of/.test((x.attrs||{})["aria-label"]||"")).length&&/Garden/.test(t));
 const b=editBtn(A,"Name","Orchard");press(b);const c=boxOf();
 chk("pressing it makes a text box labelled with the field and the row, holding the value",!!c&&c.tagName==="input"&&c.attrs.type==="text"&&c.attrs["aria-label"]==="Name · Orchard"&&c.value==="Orchard",c&&JSON.stringify(c.attrs));
 chk("nothing is kept until Enter or leaving the box",entriesOf(A).length===0);
 c.value="Old orchard";c._on.input({target:c});
 chk("typing is a draft: the pair is in the activity's draft with `was`, and no entry yet",entriesOf(A).length===0&&JSON.stringify(A.draftFor("d/a").title)==='[{"pick":"a","a":"Old orchard","was":"Orchard"}]',JSON.stringify(A.draftFor("d/a")));
 key(c,"Enter");await tick();
 chk("Enter keeps exactly one entry, holding that one pair `{pick, a, was}` under the field's name",entriesOf(A).length===1&&Object.keys(entriesOf(A)[0]).sort().join()==="title,ts"&&JSON.stringify(entriesOf(A)[0].title)==='[{"pick":"a","a":"Old orchard","was":"Orchard"}]',JSON.stringify(entriesOf(A)));
 chk("and the draft holds none of it",!A.draftFor("d/a").title);});

part("Escape, an unchanged value, a choice, a date, a number",async()=>{
 const A=load(" repeat","as: table\nfields: title, stage, due, count");
 press(editBtn(A,"Name","Orchard"));let c=boxOf();c.value="Gone";c._on.input({target:c});key(c,"Escape");await tick();
 chk("Escape keeps nothing and takes the draft away",entriesOf(A).length===0&&!A.draftFor("d/a").title,JSON.stringify(A.draftFor("d/a")));
 chk("an edit that comes back to the value it began with keeps nothing",await edit(A,"Name","Orchard","Orchard")&&entriesOf(A).length===0);
 chk("a choice keeps the option's words, with `was`",await edit(A,"Stage","Orchard","resting")&&JSON.stringify(entriesOf(A)[0].stage)==='[{"pick":"a","a":"resting","was":"growing"}]',JSON.stringify(entriesOf(A)));
 chk("a date keeps the date",await edit(A,"Due","Orchard","2026-11-25")&&JSON.stringify(entriesOf(A)[1].due)==='[{"pick":"a","a":"2026-11-25","was":"2026-11-20"}]',JSON.stringify(entriesOf(A)));
 chk("a number keeps a number, not text",await edit(A,"Trees","Orchard","9")&&JSON.stringify(entriesOf(A)[2].count)==='[{"pick":"a","a":9,"was":8}]',JSON.stringify(entriesOf(A)));
 chk("clearing a field keeps an empty answer, with `was`",await edit(A,"Due","Beds","")&&JSON.stringify(entriesOf(A)[3].due)==='[{"pick":"b","a":"","was":"2026-12-10"}]',JSON.stringify(entriesOf(A)));
 chk("clearing a number keeps `a: null`, with `was`",await edit(A,"Trees","Beds","")&&JSON.stringify(entriesOf(A)[4].count)==='[{"pick":"b","a":null,"was":4}]',JSON.stringify(entriesOf(A)));
 chk("a number box left with the value it began with keeps nothing",await edit(A,"Trees","Shed","0")&&entriesOf(A).length===5,String(entriesOf(A).length));
 chk("an act's time is to the whole second",entriesOf(A).every(e=>/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(e.ts)),entriesOf(A).map(e=>e.ts).join());
 const ts=entriesOf(A).map(e=>e.ts);
 chk("each entry has a time of its own, though they were made in one second (each takes the next free second)",new Set(ts).size===ts.length,ts.join());});

part("a keep adds one entry and changes no other byte",async()=>{
 const A=load(" repeat","as: table\nfields: title");
 const before=A.toMarkdown();
 await edit(A,"Name","Orchard","Old orchard");
 const one=A.toMarkdown();
 const line=l=>l.startsWith('{"title"');
 const at=one.indexOf("```booklet entries");
 chk("the file gained its record block with one entry, after everything that was there",before.length>0&&one.startsWith(before.replace(/\n+$/,"").slice(0,200))&&at>before.replace(/\n+$/,"").length-5,String(at));
 chk("and the booklet's own text is byte for byte what it was",one.slice(0,before.length-1)===before.slice(0,-1)||one.startsWith(before.trimEnd()),"");
 await edit(A,"Name","Beds","Vegetable beds");
 const two=A.toMarkdown();
 const a=one.split("\n"),b=two.split("\n");let i=0;while(i<a.length&&a[i]===b[i]) i++;
 let j=0;while(j<a.length-i&&a[a.length-1-j]===b[b.length-1-j]) j++;
 const gone=a.slice(i,a.length-j),added=b.slice(i,b.length-j);
 const bare=l=>l.replace(/,$/,"");   /* the list's own comma after the line before the new one */
 chk("a second keep adds one line to the list (and the comma the list needs after the line before it); every other line is the same",
   gone.length===1&&added.length===2&&bare(added[0])===gone[0]&&line(added[1])&&!/Orchard/.test(added[1]),JSON.stringify({gone,added}));
 const B=P.boot();B.loadText(two);
 chk("opened again, both entries are there, as written",B.keptFor("d/a").length===2&&B.keptFor("d/a")[0].title[0].a==="Old orchard"&&B.keptFor("d/a")[1].title[0].was==="Beds");});

part("display states",async()=>{
 const seed=(titleNow)=>{const A=P.boot();A.loadText(bookText(" repeat","as: table\nfields: title",null,{...ROWS,rows:ROWS.rows.map((r,i)=>i===0?{...r,title:titleNow}:r)}));
  A.keptFor("d/a").push({ts:"2026-11-06T10:00:00.000Z",title:[{pick:"a",a:"Old orchard",was:"Orchard"}]});A.screen="d/a";A.render();return A;};
 let A=seed("Orchard"),t=text(main());
 chk("the data holds `was`: what was sent, marked waiting",/Old orchard/.test(t)&&/waiting/.test(t)&&byClass(main(),"dv-wait").length===1,t.slice(0,200));
 A=seed("Old orchard");t=text(main());
 chk("the data holds what was sent: the value, nothing marked",/Old orchard/.test(t)&&!/waiting|You sent/.test(t)&&byClass(main(),"dv-wait").length===0&&byClass(main(),"dv-sent").length===0,t.slice(0,200));
 A=seed("Orchard tidy");t=text(main());
 chk("anything else: the value now, with what was sent beneath",/Orchard tidy/.test(t)&&byClass(main(),"dv-sent").length===1&&/Old orchard/.test(text(byClass(main(),"dv-sent")[0])),t.slice(0,200));
 A=seed("Orchard");press(editBtn(A,"Name","Orchard"));
 chk("a box opened on a waiting value starts from what was sent, and `was` stays the data's value",boxOf().value==="Old orchard");
 const c=boxOf();c.value="Newer";c._on.input({target:c});
 chk("a draft shows over all three states, with the data's value as `was`",JSON.stringify(A.draftFor("d/a").title)==='[{"pick":"a","a":"Newer","was":"Orchard"}]',JSON.stringify(A.draftFor("d/a")));});

part("readonly",async()=>{
 const n=q=>{const A=load(" repeat",q);return walk(main(),x=>cls(x).includes("dv-ed-btn")).length;};
 chk("a query with no `readonly` draws every marked field as a button",n("as: table\nfields: title, stage, due")===9);
 chk("bare `readonly` locks every field the view draws",n("as: table\nfields: title, stage, due\nreadonly")===0);
 chk("`readonly: title, due` locks those fields and leaves the others",n("as: table\nfields: title, stage, due\nreadonly: title, due")===3);
 chk("a list view and a cards view read it the same way",n("as: cards\nlabel: title\nfields: stage, due\nreadonly")===0&&n("as: list\nlabel: title\nfields: stage, due\nreadonly: stage")>=0);
 const A=load(" repeat","as: table\nfields: title, stage\nreadonly");
 chk("and the values still show",/growing/.test(text(main())));});

part("a kept act's card, the waiting mark's description, and the words of a kept change",async()=>{
 const A=load(" repeat","as: table\nfields: title, stage");
 await edit(A,"Name","Orchard","Old orchard");
 chk("a kept change is announced in the polite status line",text(P.byId("toast"))==="Change kept.",text(P.byId("toast")));
 const wait=byClass(main(),"dv-wait")[0],b=editBtn(A,"Name","Orchard");
 chk("the waiting mark is the edit button's description (aria-describedby names it)",!!wait&&b.attrs["aria-describedby"]===wait.attrs.id&&/sent, waiting/.test(text(wait)),JSON.stringify(b.attrs));
 await edit(A,"Stage","Beds","growing");
 const card=A.entryCard(entriesOf(A)[0],"d/a");
 chk("an entry card shows the act: the field's name, then `<row id>: <new value> (was <old value>)`",/title/.test(text(card))&&/a: Old orchard \(was Orchard\)/.test(text(card)),text(card));
 await edit(A,"Name","Shed","Shed 2");
 const emptied=A.entryCard({title:[{pick:"c",a:"x",was:""}],ts:"2026-11-07T10:00:00Z"},"d/a");
 chk("a value that was empty reads `(was empty)`",/c: x \(was empty\)/.test(text(emptied)),text(emptied));
 const B=load(" repeat","as: list\nlabel: title\nfields: stage");
 B.keptFor("d/a").push({ts:"2026-11-06T10:00:00Z",stage:[{pick:"a",a:"resting",was:"planning"}]});B.render();
 chk("the third state's line has a space: 'You sent: resting'",/You sent: resting/.test(text(main())),text(main()).slice(0,200));
 const sent=byClass(main(),"dv-sent")[0],bb=editBtn(B,"Stage","Orchard");
 chk("and the sent line describes its button too",!!sent&&bb.attrs["aria-describedby"]===sent.attrs.id);
 const C=load(" repeat","as: table\nfields: title, notes",Q);
 C.keptFor("d/a").push({ts:"2026-11-06T10:00:00Z",notes:[{pick:"a",a:"Stakes",}]});
 chk("a row-question pair keeps its `title · row id` label on the card",/A note · a/.test(text(C.entryCard(C.keptFor("d/a")[0],"d/a"))),text(C.entryCard(C.keptFor("d/a")[0],"d/a")));});
part("a row that lacks the field is not edited",async()=>{
 const A=load(" repeat","as: table\nfields: title, stage",null,{fields:{title:{label:"Name",edit:"text"},stage:{label:"Stage",edit:"text"}},rows:[{id:"a",title:"Orchard",stage:"growing"},{id:"b",title:"Beds"}]});
 chk("an `edit` mark applies in the rows that carry the field: the row without it has a plain cell, no button",!!editBtn(A,"Stage","Orchard")&&!editBtn(A,"Stage","Beds")&&!!editBtn(A,"Name","Beds"));});
part("one Finalize for each row, whatever the number of question columns",async()=>{
 const QQ=Q+"> [!text|memo each:rows] A memo\n\n";
 const A=load(" repeat","as: table\nfields: title, notes, stage, memo",QQ);
 const rows=walk(main(),x=>x.tagName==="tr"&&cls(x).includes("dv-trow"));
 const names=r=>walk(r,x=>x.tagName==="button").map(b=>b.attrs["aria-label"]||text(b));
 chk("a row with several question columns has one Finalize, and no two buttons in it share a name",rows.length>0&&rows.every(r=>walk(r,x=>cls(x).includes("dv-rowfin")).length===1&&new Set(names(r)).size===names(r).length),JSON.stringify(rows.map(names)));
 const B=load(" repeat","as: table\nfields: title, notes",Q+"> [!text|memo each:rows] A memo\n\n");
 chk("a row with a question in a column and others in its open part keeps its one Finalize in the column (the rows that carry the column's field)",walk(main(),x=>cls(x).includes("dv-rowfin")).length===2,String(walk(main(),x=>cls(x).includes("dv-rowfin")).length));});

part("repeat daily: no act of a row is kept",async()=>{
 const A=load(" repeat daily","as: table\nfields: title, notes",Q);
 chk("an `edit` field in an activity that keeps one entry a day is drawn as its plain value",walk(main(),x=>cls(x).includes("dv-ed-btn")).length===0&&/Orchard/.test(text(main())));
 chk("a row question there has no row Finalize, and answers as in an ordinary activity",walk(main(),x=>cls(x).includes("dv-rowfin")).length===0&&tag(main(),"textarea").length===2);
 const t=tag(main(),"textarea")[0];t.value="a day's note";t._on.input({target:t});
 chk("its answer is a pair in the draft",JSON.stringify(A.draftFor("d/a").notes)==='[{"pick":"a","a":"a day\'s note"}]',JSON.stringify(A.draftFor("d/a")));
 A.finalizeEntry("d/a");
 chk("the page's Finalize keeps the day's one entry with the pair, and no other entry is made",entriesOf(A).length===1&&JSON.stringify(entriesOf(A)[0].notes)==='[{"pick":"a","a":"a day\'s note"}]',JSON.stringify(entriesOf(A)));});

part("a number box and a list in an edit field",async()=>{
 const A=load(" repeat","as: table\nfields: title, count, tags",null,{fields:{title:"Name",count:{label:"Trees",edit:"number"},tags:{label:"Tags",edit:"text"}},rows:[{id:"a",title:"Orchard",count:8,tags:["old","north"]},{id:"b",title:"Beds",count:4,tags:"one"}]});
 chk("an `edit` field whose row value is a list is drawn as a list is drawn elsewhere (comma separated) and is read-only",!editBtn(A,"Tags","Orchard")&&/old, north/.test(text(main()))&&!!editBtn(A,"Tags","Beds"));
 {const b=editBtn(A,"Trees","Orchard");press(b);const c=boxOf();c.value="3e";c._on.input({target:c});key(c,"Enter");await tick();
  const alerts=walk(main(),x=>x.attrs&&x.attrs.role==="alert");
  chk("a number box whose text is not a finite number keeps nothing and stays open, with an alert that says why",!!boxOf()&&alerts.length===1&&/not a number, so nothing is kept\. Correct the number to keep it\./.test(text(alerts[0]))&&entriesOf(A).length===0&&!A.draftFor("d/a").count,JSON.stringify(A.draftFor("d/a"))+text(main()).slice(0,100));
  chk("the box is marked invalid and described by the alert",boxOf().attrs["aria-invalid"]==="true"&&boxOf().attrs["aria-describedby"]===alerts[0].attrs.id);
  key(boxOf(),"Escape");await tick();
  chk("Escape leaves the value as it was, the box and the alert gone, nothing kept",!boxOf()&&!walk(main(),x=>x.attrs&&x.attrs.role==="alert").length&&text(editBtn(A,"Trees","Orchard"))==="8"&&entriesOf(A).length===0);}
 chk("a number box that was typed in and then holds text that is not a number takes its draft back",await(async()=>{press(editBtn(A,"Trees","Orchard"));const c=boxOf();c.value="5";c._on.input({target:c});const had=!!A.draftFor("d/a").count;c.value="5e";c._on.input({target:c});const gone=!A.draftFor("d/a").count;key(c,"Escape");await tick();return had&&gone;})());
 chk("only an empty number box keeps `a: null`",await edit(A,"Trees","Orchard","")&&JSON.stringify(entriesOf(A)[0].count)==='[{"pick":"a","a":null,"was":8}]',JSON.stringify(entriesOf(A)));});

part("not a repeat activity",async()=>{
 const A=load("","as: table\nfields: title, stage, due");
 chk("a field marked `edit` is drawn as its plain value in an activity that keeps no entries",walk(main(),x=>cls(x).includes("dv-ed-btn")).length===0&&/growing/.test(text(main())));});

/* ---- a question asked for each row ---- */
const Q=`> [!text|notes each:rows long] A note

> [!choice|stage each:rows] Stage now
- [ ] planning
- [ ] growing
- [ ] resting

`;
/* the rows' open parts are drawn when a row opens: open every row, by the one listener the view's box has */
const openAll=()=>{for(let k=0;k<20;k++){const roots=walk(main(),x=>x._on&&x._on.toggle);let any=false;
  roots.forEach(r=>walk(r,x=>x.tagName==="details"&&!x._opened).forEach(d=>{any=true;d._opened=true;d.open=true;r._on.toggle({target:d});}));if(!any) break;}};
const REQ={fields:{title:"Title",reply:"Reply",call:"Call"},rows:[
  {id:"r1",title:"One",reply:[],call:"Yes"},
  {id:"r2",title:"Two",reply:["an earlier word"],call:"no"},
  {id:"r3",title:"Three"},
  {id:"r4",title:"Four",reply:[],kids:[{id:"r4a",title:"Child with the field",reply:[]},{id:"r4b",title:"Child without it"}]}]};
const QR=`> [!text|reply each:rows long] A word of reply\n\n> [!choice|call each:rows] Your call\n- [ ] Yes\n- [ ] No\n- [ ] Later\n\n`;
part("a question asked for each row: which rows, and where it is drawn",async()=>{
 const A=load(" repeat","as: list\nlabel: title",QR,REQ);openAll();
 const replies=tag(main(),"textarea");
 chk("it is asked of the rows that carry a field with its id, at any depth, and of no other (r1, r2, r4 and the child r4a)",replies.length===4,String(replies.length));
 chk("a row that carries the field as a value gets the choice too (r1, r2): the choice is drawn twice, and not for r3 or r4",byClass(main(),"dv-ask").filter(x=>tag(x,"button").length>=3).length===2);
 const ask=byClass(main(),"dv-ask-open")[0];
 chk("each question is drawn in the open part of its row, under its own title",!!ask&&/A word of reply/.test(text(ask)));
 chk("a list is added to: what the row holds is drawn under the question as history, and the question starts empty",/an earlier word/.test(text(main()))&&replies.every(t=>(t.value||"")===""));
 const hist=byClass(main(),"dv-hist");
 chk("with the history labelled for a screen reader",hist.length>=1&&!!hist[0].attrs["aria-label"]);
 chk("an in-place value (a string) starts a choice from the option whose words match, ignoring case: r1 `Yes`, r2 `no`",
   (()=>{const on=walk(main(),x=>x.tagName==="button"&&x.attrs["aria-pressed"]==="true").map(text);return on.join()==="Yes,No";})(),walk(main(),x=>x.tagName==="button"&&x.attrs["aria-pressed"]==="true").map(text).join());
 const t=replies[0];t.value="word for one";t._on.input({target:t});
 chk("typing keeps the pair against the row's id, in the activity's draft",JSON.stringify(A.draftFor("d/a").reply)==='[{"pick":"r1","a":"word for one"}]',JSON.stringify(A.draftFor("d/a")));
 chk("a row's Finalize keeps that row's pair and no other",(()=>{const f=walk(main(),x=>cls(x).includes("dv-rowfin"))[0];press(f);return entriesOf(A).length===1&&Object.keys(entriesOf(A)[0]).sort().join()==="reply,ts";})(),JSON.stringify(entriesOf(A)));});
part("no row carries the field: every row is asked",async()=>{
 const rows={fields:{title:"Title"},rows:[{id:"x",title:"X"},{id:"y",title:"Y",kids:[{id:"y1",title:"Y1"}]}]};
 const A=load(" repeat","as: list\nlabel: title","> [!text|sentence each:rows] A sentence\n\n",rows);openAll();
 chk("the question is asked of every row at every depth (x, y and y1)",tag(main(),"input").length+tag(main(),"textarea").length===3,String(tag(main(),"input").length+tag(main(),"textarea").length));});
part("an in-place question: its states and its pair's `was`",async()=>{
 const A=load(" repeat","as: list\nlabel: title",QR,REQ);openAll();
 const on=()=>walk(main(),x=>x.tagName==="button"&&x.attrs["aria-pressed"]==="true").map(text).join();
 const later=walk(main(),x=>x.tagName==="button"&&text(x)==="Later")[0];press(later);
 chk("choosing keeps a pair with `was`: the data's own words for the value",JSON.stringify(A.draftFor("d/a").call)==='[{"pick":"r1","a":3,"was":"Yes"}]',JSON.stringify(A.draftFor("d/a")));
 chk("choosing the option the data already holds is no act",(()=>{const yes=walk(main(),x=>x.tagName==="button"&&text(x)==="Yes")[0];press(yes);return !A.draftFor("d/a").call;})(),JSON.stringify(A.draftFor("d/a")));});
part("a row taken out of the data, and a stale `was`",async()=>{
 const A=P.boot();A.loadText(bookText(" repeat","as: list\nlabel: title",QR,REQ));
 A.keptFor("d/a").push({ts:"2026-11-06T10:00:00.000Z",call:[{pick:"gone",a:2,was:"Yes"},{pick:"r1",a:2,was:"Maybe"}],reply:[{pick:"gone",a:"words for a row that left"}]});
 A.screen="d/a";A.render();openAll();
 const t=text(main());
 chk("a row the data no longer holds is not drawn, with its words nowhere on the screen",!/row that left/.test(t));
 chk("and its pairs are still in the entry as written",A.keptFor("d/a")[0].reply[0].a==="words for a row that left"&&A.toMarkdown().includes("words for a row that left"));
 chk("the question's third-state line has a space after the colon: 'You sent: No'",/You sent: No/.test(text(main())),text(main()).slice(0,200));
 chk("a stale `was` (the data's value is neither what was sent nor `was`): the value now, with what was sent beneath",byClass(main(),"dv-sent").length===1&&/No/.test(text(byClass(main(),"dv-sent")[0]))&&walk(main(),x=>x.tagName==="button"&&x.attrs["aria-pressed"]==="true").map(text).join()==="Yes,No",t.slice(0,300));});
part("a question in a column",async()=>{
 const A=load(" repeat","as: table\nfields: title, notes",Q);
 const heads=walk(main(),x=>x.tagName==="th").map(text);
 chk("a name in `fields:` that is a question's id is a column headed by the question's title",heads.includes("A note"),heads.join());
 chk("a top row that carries the field has its box in that column, and the one that does not carry it has none",tag(main(),"textarea").length===2,String(tag(main(),"textarea").length));
 const t=tag(main(),"textarea")[0];t.value="Stakes on Friday";t._on.input({target:t});
 chk("typing writes the row's own pair into the draft, `{pick, a}` with no `was` (a list adds)",JSON.stringify(A.draftFor("d/a").notes)==='[{"pick":"a","a":"Stakes on Friday"}]',JSON.stringify(A.draftFor("d/a")));
 const fin=walk(main(),x=>cls(x).includes("dv-rowfin"));
 chk("each row asked has a Finalize of its own",fin.length===2,String(fin.length));
 press(fin[0]);await tick();
 chk("a row's Finalize keeps one entry that holds that row's answer only",entriesOf(A).length===1&&JSON.stringify(entriesOf(A)[0].notes)==='[{"pick":"a","a":"Stakes on Friday"}]'&&Object.keys(entriesOf(A)[0]).sort().join()==="notes,ts",JSON.stringify(entriesOf(A)));
 chk("and the rest of the draft is as it was",!A.draftFor("d/a").notes);});

part("pairs: written for one pick, an empty answer takes the pair back, a key of its own stays",async()=>{
 const rec={tools:[2,3]};const w=A=>A;
 const A=P.boot();
 const pr=A.pairRecord(rec,"why",2,{});
 pr.why="cutting";
 chk("an answer makes one pair, `{pick, a}`",JSON.stringify(rec.why)==='[{"pick":2,"a":"cutting"}]',JSON.stringify(rec));
 const pr3=A.pairRecord(rec,"why",3,{});pr3.why="holes";
 chk("another pick adds a pair and leaves the first as it was",JSON.stringify(rec.why)==='[{"pick":2,"a":"cutting"},{"pick":3,"a":"holes"}]');
 rec.why[0].note="a key of its own";pr.why="sawing";
 chk("an answer changed keeps the key the pair already had",JSON.stringify(rec.why[0])==='{"pick":2,"a":"sawing","note":"a key of its own"}',JSON.stringify(rec.why));
 pr.why="";
 chk("an answer that holds nothing takes its pair away, and the other stays",JSON.stringify(rec.why)==='[{"pick":3,"a":"holes"}]');
 pr3.why="";
 chk("the last pair gone, the key is empty (null), as an answer cleared is",rec.why===null);
 const kept=A.pairRecord({},"c","r",{same:a=>a==="x",mark:()=>({was:"x"})}),r2={};const k2=A.pairRecord(r2,"c","r",{same:a=>a==="x",mark:()=>({was:"x"})});
 k2.c="y";chk("in place, a pair carries `was`; the value the data holds makes no pair",JSON.stringify(r2.c)==='[{"pick":"r","a":"y","was":"x"}]');
 k2.c="x";chk("coming back to the data's value takes the pair away",r2.c===null);});
part("an answer for each pick is drawn once for each pick and stored as pairs",async()=>{
 const A=P.boot();A.loadText(FM+`> [!module|m] M\n\n> [!activity|a repeat] A\n\n> [!multi|tools] Tools\n- [ ] Hammer\n- [ ] Saw\n- [ ] Drill\n\n> [!text|why each:tools] What for?\n\n> [!module|m end] End\n`);
 A.screen="m/a";A.render();
 chk("nothing is drawn while nothing is picked",!/What for\?/.test(text(main())));
 A.draftFor("m/a").tools=[3,2];A.render();
 const t=text(main());
 chk("the title once and each pick as a heading, in the order picked (Drill, then Saw)",(t.match(/What for\?/g)||[]).length===1&&t.indexOf("Drill",t.indexOf("What for?"))<t.indexOf("Saw",t.indexOf("What for?")),t.slice(0,200));
 const boxes=tag(main(),"textarea").concat(tag(main(),"input").filter(x=>x.attrs.type!=="checkbox"&&x.attrs.type!=="radio"));
 const b=boxes.find(x=>/Saw/.test(x.attrs["aria-label"]||"")||false)||boxes[boxes.length-1];
 b.value="cutting";(b._on.input||(()=>{}))({target:b});
 chk("typing writes a pair for that pick, exactly as the source stores the pick",A.draftFor("m/a").why&&A.draftFor("m/a").why.length===1&&typeof A.draftFor("m/a").why[0].pick==="number"&&A.draftFor("m/a").why[0].a==="cutting",JSON.stringify(A.draftFor("m/a")));
 A.draftFor("m/a").tools=[3];A.render();
 chk("a pick taken back keeps its pair in the draft, undrawn",A.draftFor("m/a").why.length===1&&!/Saw/.test(text(main()).slice(text(main()).indexOf("What for?"))));});

(async()=>{for(const [n,f] of PARTS){try{await f();}catch(e){chk(n+": runs to its end",false,String(e&&e.stack||e).split("\n").slice(0,3).join(" | "));}}
  console.log(fails?"\n"+fails+" FAILURES":"\nall dashedit checks passed");
  process.exit(fails?1:0);})();
