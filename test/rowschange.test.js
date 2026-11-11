// Renderer 0.20.2: rows in the browser. A data block written in the booklet (a `booklet data` fence) takes the reader's acts: Add a row, Add under a row,
// Remove a row with the rows under it, and a field edited in place. Each act is kept as an entry first and then written into the block, and only the bytes
// between the block's fences change. This suite draws the controls in the recording DOM and presses them (the table's rows open only in a real browser:
// test/rowschange-browser.js; here the opening rows are a list's and a card's). The pure row code is held to the plugin's own cases by
// test/applyvectors.test.js, pendingvectors.test.js and idvectors.test.js. Everything here is made up: an orchard.
// Run: node test/rowschange.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const byClass=(n,c)=>walk(n,x=>cls(x).includes(c));
const text=n=>typeof n==="string"?n:(n&&n._text)||kids(n).map(text).join("");
const main=()=>P.main();
const press=b=>b._on.click({target:b,preventDefault(){},stopPropagation(){}});
const key=(n,k)=>n._on.keydown({key:k,target:n,preventDefault(){},stopPropagation(){}});
const btn=(label)=>walk(main(),x=>x.tagName==="button"&&(x.attrs["aria-label"]||"")===label)[0];
const btnRe=re=>walk(main(),x=>x.tagName==="button"&&re.test(x.attrs["aria-label"]||text(x)))[0];
const FM=lang=>`---\nbooklet: "0.20"\ntitle: Desk\nlang: ${lang||"en"}\n---\n\n`;
const ROWS={fields:{title:{label:"Name",edit:"text"},stage:{label:"Stage",edit:"choice",options:["planning","growing","resting"]},count:{label:"Trees",edit:"number"}},
  idFormat:"r{n}",rows:[{id:"r1",title:"Orchard",stage:"growing",count:8,jobs:[{id:"r2",title:"Prune",stage:"planning"}]},{id:"r3",title:"Beds",stage:"resting",count:4},{id:"r5",title:"Shed",stage:"resting",jobs:[]}]};
const book=(query,o)=>{o=o||{};const data=o.data||ROWS;
  return (o.bom?"﻿":"")+FM(o.lang)+`> [!module|d] Desk\n\n> [!activity|a${o.act===undefined?" repeat":o.act}] Work\n\n\`\`\`booklet query\nfrom: rows\n${query}\n\`\`\`\n\n\`\`\`booklet data\n${o.raw||JSON.stringify(data)}\n\`\`\`\n^rows\n\n> [!module|d end] End\n`;};
const load=(t)=>{P.wipe();const A=P.boot();A.loadText(t);A.screen="d/a";A.render();return A;};
const eol=t=>t.replace(/\n/g,"\r\n");
const openAll=()=>{const box=byClass(main(),"dv-box")[0];for(let i=0;i<30&&box;i++){const ds=walk(main(),x=>x.tagName==="details"&&!x._opened);if(!ds.length) break;ds.forEach(d=>{d._opened=true;d.open=true;box._on.toggle({target:d});});}};
const entries=A=>A.keptFor("d/a");
/* the booklet's own text with its records left off: everything above the records region */
const upper=t=>{const i=t.indexOf("\n%%");return (i<0?t:t.slice(0,i)).replace(/\n+$/,"");};
const fill=(label,v)=>{const b=walk(main(),x=>(x.tagName==="input"||x.tagName==="select"||x.tagName==="textarea")&&cls(x).includes("field")).find(x=>{
  const l=walk(main(),y=>y.tagName==="label"&&y.attrs.for===x.attrs.id)[0];return l&&text(l)===label;});
  b.value=v;b._on.input&&b._on.input({target:b});return b;};
const LIST="as: list\nlabel: title\nfields: stage\nadd\ndelete";

// ---- the controls: where they are, what they are called, and what they look like to a screen reader
{const A=load(book(LIST));
 const add=btn("Add a row");
 chk("\"Add a row\" is a small button whose words are \"+ add\"",!!add&&text(add)==="+ add"&&cls(add).includes("dv-rowact"),add&&JSON.stringify(add.attrs));
 chk("it stands under the rows, in the query's own box, after the list",(()=>{const q=byClass(main(),"query")[0],k=kids(q);return k.indexOf(k.find(x=>cls(x).includes("dv-addrow")))>k.indexOf(k.find(x=>cls(x).includes("dv-box")));})());
 chk("each row has a trash button named \"Remove <row>\" that holds a picture and no words",["Orchard","Beds","Shed"].every(n=>{const b=btn("Remove "+n);return !!b&&text(b)===""&&walk(b,x=>x.tagName==="svg").length===1&&b.attrs["aria-label"]==="Remove "+n;}));
 chk("the trash is a small button and not a row: it is not the whole line",cls(btn("Remove Orchard")).includes("dv-rowact")&&cls(btn("Remove Orchard")).includes("dv-rm"));
 openAll();
 chk("a row that holds a list of rows offers \"Add under this row\" (named for the row) in its open part",!!btn("Add under this row (Orchard)"));
 chk("a row with an empty list of rows offers it too (its first child)",!!btn("Add under this row (Shed)"));
 chk("a row that holds no list does not",!btn("Add under this row (Beds)"));
 chk("the trash is drawn for a child row as well",!!btn("Remove Prune"));}

// ---- Add: the form, Cancel and Escape, then a row
{const A=load(book(LIST)),before=A.toMarkdown();
 press(btn("Add a row"));
 const g=walk(main(),x=>x.attrs.role==="group"&&x.attrs["aria-label"]==="Add a row")[0];
 chk("pressing it opens a group named \"Add a row\" with one labelled box for each field marked `edit`",!!g&&walk(g,x=>x.tagName==="label").map(text).join()==="Name,Stage,Trees",g&&walk(g,x=>x.tagName==="label").map(text).join());
 chk("a text box, a menu (an empty first option, then the options) and a number box",(()=>{const f=walk(g,x=>cls(x).includes("field"));return f.map(x=>x.tagName+(x.attrs.type?":"+x.attrs.type:"")).join()==="input:text,select,input:number"&&walk(f[1],x=>x.tagName==="option").map(text).join("|")==="|planning|growing|resting";})());
 chk("there is no id box: the block's `idFormat` makes the id",!walk(g,x=>x.tagName==="label").some(l=>text(l)==="Id"));
 chk("Add and Cancel are buttons; opening the form kept and changed nothing",!!walk(g,x=>cls(x).includes("dv-addok"))[0]&&!!walk(g,x=>cls(x).includes("dv-addcancel"))[0]&&A.toMarkdown()===before&&entries(A).length===0);
 press(walk(g,x=>cls(x).includes("dv-addcancel"))[0]);
 chk("Cancel closes it and leaves the button",!walk(main(),x=>x.attrs.role==="group"&&x.attrs["aria-label"]==="Add a row").length&&!!btn("Add a row")&&A.toMarkdown()===before);
 press(btn("Add a row"));const b0=fill("Name","Weed");
 key(b0,"Escape");
 chk("Escape in a box closes the form too, and keeps nothing",!walk(main(),x=>x.attrs.role==="group"&&x.attrs["aria-label"]==="Add a row").length&&entries(A).length===0);
 press(btn("Add a row"));fill("Name","Compost bay");fill("Stage","growing");fill("Trees","3");
 press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 const after=A.toMarkdown();
 chk("Add keeps one entry: an `$add` that names the block, the id the format made and the row's values",entries(A).length===1&&JSON.stringify(entries(A)[0]["$add"])==='[{"in":"rows","pick":"r6","row":{"title":"Compost bay","stage":"growing","count":3}}]',JSON.stringify(entries(A)));
 chk("a number box keeps a number, not text",entries(A)[0]["$add"][0].row.count===3);
 chk("the id is the next whole number past every id at every depth and the ids of adds waiting (r1 r2 r3 r5 are there: r6)",entries(A)[0]["$add"][0].pick==="r6");
 chk("and the row is in the block, after the last, in the file's own layout: the booklet differs from before only by that row, inside the fence",
   upper(after)===upper(before).replace('"jobs":[]}]','"jobs":[]},{"id":"r6","title":"Compost bay","stage":"growing","count":3}]'),upper(after).slice(upper(after).indexOf("rows")));
 chk("it is drawn, in the list, with nothing waiting (the block holds it)",/Compost bay/.test(text(main()))&&byClass(main(),"dv-wait").length===0);
 chk("the form is closed and \"+ add\" is back",!!btn("Add a row")&&!walk(main(),x=>x.attrs.role==="group").length);
 chk("the changed booklet is what \"Download a copy\" writes (the same text, with its records)",A.toMarkdown().includes('"id":"r6"')&&A.toMarkdown().includes('"$add"'));
 chk("opened again from that text, the booklet draws the same rows and nothing is waiting",(()=>{const B=load(A.toMarkdown());return /Compost bay/.test(text(main()))&&byClass(main(),"dv-wait").length===0&&B.keptFor("d/a").length===1;})());}

// ---- Add refuses in words, and the form stays
{const A=load(book(LIST,{data:{...ROWS,idFormat:"j-{field:title}-{n}"}}));
 press(btn("Add a row"));
 press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("an id made from a field that is empty asks for that field, in an alert, and keeps nothing",/Give it a name first\./.test(text(byClass(main(),"dv-addmsg")[0]))&&byClass(main(),"dv-addmsg")[0].attrs.role==="alert"&&entries(A).length===0,text(byClass(main(),"dv-addmsg")[0]));
 fill("Name","!!!");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("a value with no letter or digit says so",/'Name' has no letters or digits an id can use/.test(text(byClass(main(),"dv-addmsg")[0])),text(byClass(main(),"dv-addmsg")[0]));
 fill("Name","Weed beds");fill("Trees","3e");
 chk("typing again takes the message away",text(byClass(main(),"dv-addmsg")[0])==="");
 press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("a number box that is no number says so and keeps nothing",/Trees: that is not a number/.test(text(byClass(main(),"dv-addmsg")[0]))&&entries(A).length===0,text(byClass(main(),"dv-addmsg")[0]));
 fill("Trees","");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("an id with `{field:title}` and `{n}`: the slug of the name, then the next number",JSON.stringify(entries(A)[0]["$add"][0].pick)==='"j-weed-beds-1"',JSON.stringify(entries(A)));}
{const A=load(book(LIST,{data:{...ROWS,idFormat:undefined,idPattern:"^[a-z0-9-]+$"}}));
 press(btn("Add a row"));
 chk("a block with no `idFormat` asks for the id in a box of its own",walk(main(),x=>x.tagName==="label").some(l=>text(l)==="Id"));
 fill("Name","X");
 press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("an empty id is refused in words",/Give it an id first\./.test(text(byClass(main(),"dv-addmsg")[0])));
 fill("Id","Not OK");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("an id that does not fit the pattern is refused in words, naming the pattern",/does not fit the pattern \^\[a-z0-9-\]\+\$/.test(text(byClass(main(),"dv-addmsg")[0])),text(byClass(main(),"dv-addmsg")[0]));
 fill("Id","r1");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("an id a row already has is refused in words",/A row with that id exists\. Choose another id\./.test(text(byClass(main(),"dv-addmsg")[0])));
 fill("Id","  weed-1  ");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("a typed id is trimmed, and is the row's id",entries(A).length===1&&entries(A)[0]["$add"][0].pick==="weed-1"&&/"id":"weed-1"/.test(A.toMarkdown()));}
{const A=load(book(LIST,{data:{...ROWS,idFormat:"{n:2"}}));
 chk("an `idFormat` that is not valid draws no form: one quiet line says so, in words",!btn("Add a row")&&/The id format is not valid, so rows cannot be added here\./.test(text(main())));
 chk("and Remove is still there (only adding needs the id)",!!btn("Remove Orchard"));}
{const A=load(book(LIST,{data:{...ROWS,idFormat:"{field:nope}-{n}"}}));
 chk("an `idFormat` that names a field the form has no box for says so",/The id format uses nope, which this table does not ask for\./.test(text(main()))&&!btn("Add a row"));}

// ---- Add under a row
{const A=load(book(LIST)),before=A.toMarkdown();openAll();
 press(btn("Add under this row (Orchard)"));
 const g=walk(main(),x=>x.attrs.role==="group"&&x.attrs["aria-label"]==="Add under this row (Orchard)")[0];
 chk("the form is named \"Add under this row\" and the row",!!g);
 fill("Name","Weed");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("it keeps an `$add` with `under` the parent's id, and writes the child at the end of the parent's own list",JSON.stringify(entries(A)[0]["$add"])==='[{"in":"rows","pick":"r6","under":"r1","row":{"title":"Weed"}}]'&&upper(A.toMarkdown()).includes('"jobs":[{"id":"r2","title":"Prune","stage":"planning"}, {"id":"r6","title":"Weed"}]'),upper(A.toMarkdown()).slice(-420));
 openAll();
 chk("the child is drawn under its parent",/Weed/.test(text(main())));
 press(btn("Add under this row (Shed)"));fill("Name","Roof");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("a row with an empty list takes its first child in that list (laid out on lines of its own, as the plugin does)",upper(A.toMarkdown()).includes('"jobs":[\n  {\n    "id": "r7",\n    "title": "Roof"\n  }\n]}'),upper(A.toMarkdown()).slice(-300));}

// ---- Remove
{const A=load(book(LIST)),before=A.toMarkdown();openAll();
 press(btn("Remove Orchard"));
 chk("the question says how many rows go with it, and has Remove and Cancel; nothing is kept yet",/Remove this row and the 1 row under it\?/.test(text(main()))&&byClass(main(),"dv-rm-yes").length===1&&byClass(main(),"dv-rm-no").length===1&&A.toMarkdown()===before);
 chk("a row with no rows under it asks the short question",(()=>{press(byClass(main(),"dv-rm-no")[0]);press(btn("Remove Beds"));return /Remove this row\?/.test(text(main()))&&!/Remove this row and the/.test(text(main()));})());
 key(byClass(main(),"dv-rm-wrap").find(w=>kids(w).some(k=>cls(k).includes("dv-rm-q"))),"Escape");
 chk("Escape closes the question and puts the trash back, keeping nothing",byClass(main(),"dv-rm-q").length===0&&!!btn("Remove Beds")&&A.toMarkdown()===before);
 press(btn("Remove Orchard"));press(byClass(main(),"dv-rm-no")[0]);
 chk("Cancel closes it too",byClass(main(),"dv-rm-q").length===0&&A.toMarkdown()===before);
 press(btn("Remove Orchard"));press(byClass(main(),"dv-rm-yes")[0]);
 const e=entries(A);
 chk("Remove keeps one `$delete` with the row as it was (`was`), the rows under it included",e.length===1&&JSON.stringify(Object.keys(e[0]).sort())==='["$delete","ts"]'&&e[0]["$delete"][0].pick==="r1"&&e[0]["$delete"][0].in==="rows"&&JSON.stringify(e[0]["$delete"][0].was)===JSON.stringify(ROWS.rows[0]),JSON.stringify(e));
 chk("the row and the rows under it are out of the block, and every other row is as it was",upper(A.toMarkdown())===upper(before).replace('{"id":"r1","title":"Orchard","stage":"growing","count":8,"jobs":[{"id":"r2","title":"Prune","stage":"planning"}]},',''),upper(A.toMarkdown()).slice(-300));
 chk("it is gone from the screen and nothing is waiting",!/Orchard|Prune/.test(text(main()))&&byClass(main(),"dv-wait").length===0);
 chk("the focus has somewhere to go: \"+ add\" is there",!!btn("Add a row"));}
{const rowsOne={...ROWS,rows:[ROWS.rows[1]]},A=load(book(LIST,{data:rowsOne}));
 press(btn("Remove Beds"));press(byClass(main(),"dv-rm-yes")[0]);
 chk("the only row can be removed; the list is then empty and \"+ add\" is still there for the first",/"rows":\[\]/.test(upper(A.toMarkdown()))&&!!btn("Add a row")&&/Nothing to show here\./.test(text(main())),upper(A.toMarkdown()).slice(-200));}

// ---- an empty list can take its first row
{const A=load(book(LIST,{data:{...ROWS,rows:[]}}));
 chk("a list with no rows says so and still offers \"+ add\"",/Nothing to show here\./.test(text(main()))&&!!btn("Add a row"));
 press(btn("Add a row"));fill("Name","First");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("and the first row is written into the empty list (the plugin lays a first row out on lines of its own)",/"rows":\[\n  \{\n    "id": "r1",\n    "title": "First"\n  \}\n\]\}/.test(upper(A.toMarkdown()))&&/First/.test(text(main())),upper(A.toMarkdown()).slice(-200));}

// ---- the layout of the block, line endings and a byte order mark are kept
{const raw=JSON.stringify(ROWS,null,2),t=book(LIST,{raw}),A=load(t);
 press(btn("Add a row"));fill("Name","Spaced");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 const out=upper(A.toMarkdown());
 chk("a block written over many lines gets the new row in the same layout (two-space indent)",/\n    \{\n      "id": "r6",\n      "title": "Spaced"\n    \}\n  \]\n\}\n```/.test(out),out.slice(-200));
 chk("and every line above and below the block is as it was",out.startsWith(upper(t).slice(0,upper(t).indexOf('"fields"')))&&out.endsWith("```\n^rows\n\n> [!module|d end] End"),out.slice(-60));}
{const t=eol(book(LIST)),A=load(t);
 press(btn("Add a row"));fill("Name","Windows");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 const out=A.toMarkdown();
 chk("a booklet with Windows line endings keeps them on every line, the new row's included",/\r\n/.test(out)&&!/[^\r]\n/.test(out.replace(/^\n/,"")),JSON.stringify(out.slice(-200)));}
{const t=book(LIST,{bom:true}),A=load(t);
 press(btn("Add a row"));fill("Name","Marked");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
 chk("a booklet with a byte order mark keeps it",A.toMarkdown().charCodeAt(0)===0xFEFF&&/Marked/.test(A.toMarkdown()));}

// ---- an act the data does not take: kept, drawn as waiting, told in words
{const dup={...ROWS,rows:[{id:"x",title:"One"},{id:"x",title:"Two"}]},A=load(book(LIST,{data:dup})),before=A.toMarkdown();
 press(btn("Remove One"));press(byClass(main(),"dv-rm-yes")[0]);
 chk("a removal of an id more than one row has is not written: the entry is kept and the notice says why",entries(A).length===1&&upper(A.toMarkdown())===upper(before)&&/More than one row has that id\./.test(text(P.byId("toast"))),text(P.byId("toast")));
 chk("both rows stay, and each is marked in words that the removal did not follow",/One/.test(text(main()))&&/Two/.test(text(main()))&&byClass(main(),"dv-wait").length===2&&/You asked to remove this; it changed since\./.test(text(byClass(main(),"dv-wait")[0])),byClass(main(),"dv-wait").map(text).join("|"));}
{const t=book(LIST)+"\n%%\n> [!records] App record — do not edit below this line\n\n> [!records|d] Desk\n\n```booklet entries a\n{\"items\": [\n"+
   '{"$add":[{"in":"rows","pick":"r9","row":{"title":"On its way","stage":"planning"}}],"ts":"2026-11-08T10:42:00Z"},\n'+
   '{"$add":[{"in":"rows","pick":"r10","under":"r1","row":{"title":"Under Orchard"}}],"ts":"2026-11-08T10:43:00Z"},\n'+
   '{"$delete":[{"in":"rows","pick":"r3","was":{"id":"r3","title":"Beds","stage":"resting","count":4}}],"ts":"2026-11-08T10:44:00Z"}\n]}\n```\n%%\n';
 const A=load(t);openAll();const tt=text(main());
 chk("an add the data does not hold is drawn at the end of its list, marked \"sent, waiting\"",/On its way/.test(tt)&&/sent, waiting/.test(tt));
 chk("an add under a row is drawn in that row's list, marked too",/Under Orchard/.test(tt));
 chk("a removal the data has not followed marks the row \"removing, waiting\" and the row stays",/Beds/.test(tt)&&/removing, waiting/.test(tt));
 chk("a row that is removing has no trash (it is already asked for); a row waiting to come in has one",!btn("Remove Beds")&&!!btn("Remove On its way"));
 chk("a row on its way in offers no \"Add under\" (the data does not hold it yet)",!btn("Add under this row (On its way)"));
 chk("the page changed nothing: the file is as it was",A.toMarkdown()===t);
 chk("the number of marks is three (two adds, one removal)",byClass(main(),"dv-wait").length===3,String(byClass(main(),"dv-wait").length));
 press(btn("Remove On its way"));press(byClass(main(),"dv-rm-yes")[0]);
 chk("removing a row still on its way in keeps a `$delete` and leaves the data alone: the row is gone from the screen",entries(A).length===4&&!/On its way/.test(text(main()))&&upper(A.toMarkdown())===upper(t),text(main()).slice(0,200));}

// ---- edit in place writes the value into the block (the rest of the in-place edit is test/dashedit.test.js)
{const A=load(book("as: table\nfields: title, stage\nadd\ndelete")),before=A.toMarkdown();
 const b=walk(main(),x=>x.tagName==="button"&&/^Name of Orchard:/.test(x.attrs["aria-label"]||""))[0];press(b);
 const c=byClass(main(),"dv-ed-in")[0];c.value="Old orchard";c._on.input({target:c});key(c,"Enter");
 chk("a field edited in place is kept (`{pick, a, was}`) and written into the block: only that value differs",entries(A).length===1&&JSON.stringify(entries(A)[0].title)==='[{"pick":"r1","a":"Old orchard","was":"Orchard"}]'&&upper(A.toMarkdown())===upper(before).replace('"title":"Orchard"','"title":"Old orchard"'),JSON.stringify(entries(A)));
}

// ---- the rules: where the controls are not drawn
{const none=A=>!btnRe(/^(Add a row|Remove (Orchard|Beds|Shed|Prune)|Add under)/);
 chk("not in a `repeat daily` activity",none(load(book(LIST,{act:" repeat daily"}))));
 chk("not in an activity that keeps nothing",none(load(book(LIST,{act:""}))));
 chk("not under a bare `readonly`",none(load(book("as: list\nlabel: title\nreadonly\nadd\ndelete"))));
 chk("a `readonly` that names fields leaves them",!!(load(book("as: list\nlabel: title\nreadonly: stage\nadd\ndelete")),btn("Add a row")));
 chk("not on tiles, bars or a line",["as: tiles\nvalue: stage","as: bars\nvalue: count","as: line\nvalue: count"].every(q=>none(load(book(q+"\nadd\ndelete")))));
 chk("on a table, a list and cards",["as: table","as: list\nlabel: title","as: cards\nlabel: title"].every(q=>{load(book(q+"\nadd\ndelete"));return !!btn("Add a row")&&!!btn("Remove Orchard");}));
 chk("`add` alone draws \"+ add\" and no trash; `delete` alone draws the trash and no \"+ add\"",(()=>{load(book("as: list\nlabel: title\nadd"));const a=!!btn("Add a row")&&!btn("Remove Orchard");load(book("as: list\nlabel: title\ndelete"));return a&&!btn("Add a row")&&!!btn("Remove Orchard");})());
 chk("a query that says neither draws neither",none(load(book("as: list\nlabel: title"))));}

// ---- two data blocks holding the same rows in one booklet: the act changes the block its own list reads, and no other
{const J=JSON.stringify(ROWS),blk=(id)=>"```booklet data\n"+J+"\n```\n^"+id+"\n\n",qry=(id)=>"```booklet query\nfrom: "+id+"\n"+LIST+"\n```\n\n";
 const T=FM()+"> [!module|d] Desk\n\n> [!activity|a repeat] Work\n\n"+qry("rows")+qry("rows2")+blk("rows")+blk("rows2")+"> [!module|d end]\n\n> [!module|e] Other\n\n> [!activity|b repeat] More\n\n"+qry("rows")+blk("rows")+"> [!module|e end]\n";
 const fence=(t,id,nth)=>{const re=new RegExp("```booklet data\\n((?:(?!```)[\\s\\S])*?)\\n```\\n\\^"+id+"\\n","g");let m,i=0;while((m=re.exec(t))){if(i++===nth) return JSON.parse(m[1]);}return null;};
 const names=d=>d.rows.map(r=>r.title).join();
 const A=load(T);
 chk("the booklet holds three blocks that read the same rows (two in one module, one in another)",!!fence(T,"rows",0)&&!!fence(T,"rows2",0)&&!!fence(T,"rows",1)&&A.screen==="d/a");
 const boxes=byClass(main(),"query"),inBox=(box,label)=>walk(box,x=>x.tagName==="button"&&(x.attrs["aria-label"]||"")===label)[0];
 chk("an activity with two lists draws a trash in each",boxes.length===2&&boxes.every(b=>!!inBox(b,"Remove Beds")));
 /* the second list reads `rows2`: removing from it changes `rows2` and nothing else */
 press(inBox(boxes[1],"Remove Beds"));press(byClass(boxes[1],"dv-rm-yes")[0]);
 {const t=A.toMarkdown();
  chk("a removal from the list that reads `rows2` changes `rows2` only",names(fence(t,"rows2",0))==="Orchard,Shed"&&names(fence(t,"rows",0))==="Orchard,Beds,Shed"&&names(fence(t,"rows",1))==="Orchard,Beds,Shed",names(fence(t,"rows2",0))+" | "+names(fence(t,"rows",0))+" | "+names(fence(t,"rows",1)));
  chk("and the entry names the block it was for (`in`)",entries(A).length===1&&entries(A)[0]["$delete"][0].in==="rows2");}
 /* an add to the first list changes `rows` of this module, not the `rows` of the other module that has the same id */
 {const b1=byClass(main(),"query")[0];press(inBox(b1,"Add a row"));fill("Name","Mulch");press(walk(main(),x=>cls(x).includes("dv-addok"))[0]);
  const t=A.toMarkdown();
  chk("an add through the list that reads `rows` changes `rows` of its own module, not `rows2` and not the `rows` of the other module",names(fence(t,"rows",0))==="Orchard,Beds,Shed,Mulch"&&names(fence(t,"rows2",0))==="Orchard,Shed"&&names(fence(t,"rows",1))==="Orchard,Beds,Shed",names(fence(t,"rows",0))+" | "+names(fence(t,"rows2",0))+" | "+names(fence(t,"rows",1)));}
 /* the other module's list: the same id `rows`, another module */
 A.screen="e/b";A.render();
 {const box=byClass(main(),"query")[0];press(inBox(box,"Remove Shed"));press(byClass(box,"dv-rm-yes")[0]);
  const t=A.toMarkdown();
  chk("a removal in the other module changes that module's `rows` only",names(fence(t,"rows",1))==="Orchard,Beds"&&names(fence(t,"rows",0))==="Orchard,Beds,Shed,Mulch"&&names(fence(t,"rows2",0))==="Orchard,Shed",names(fence(t,"rows",1))+" | "+names(fence(t,"rows",0)));
  chk("and nothing outside the three blocks differs from the booklet as loaded",upper(t).replace(/```booklet data\n[\s\S]*?\n```/g,"@")===upper(T).replace(/```booklet data\n[\s\S]*?\n```/g,"@"));}}

// ---- a data block inside a comment is no data block (SPEC.md section 13): its list shows nothing and offers no controls, whichever way the comment is written
for(const [what,pre,post] of [["%% lines",["%%"],["%%"]],["an HTML comment",["<!--"],["-->"]]]){
  const t=FM()+"> [!module|d] Desk\n\n> [!activity|a repeat] Work\n\n```booklet query\nfrom: rows\n"+LIST+"\n```\n\n"+pre.join("\n")+"\n```booklet data\n"+JSON.stringify(ROWS)+"\n```\n^rows\n"+post.join("\n")+"\n\n> [!module|d end]\n";
  const A=load(t);
  chk("a data fence in "+what+" is no block: no Add, no Remove, and the booklet is as it was",!btn("Add a row")&&!btnRe(/^(Remove (Orchard|Beds|Shed|Prune)|Add under)/)&&A.toMarkdown().replace(/\n*$/,"")===t.replace(/\n*$/,""),text(main()).slice(0,160));}

// ---- the three languages
for(const [lg,names] of Object.entries({es:["Añadir una fila","Quitar Orchard","Añadir debajo de esta fila (Orchard)","+ añadir"],fr:["Ajouter une ligne","Supprimer Orchard","Ajouter sous cette ligne (Orchard)","+ ajouter"]})){
  load(book(LIST,{lang:lg}));openAll();
  chk(`${lg}: the accessible names and the words of the button`,!!btn(names[0])&&!!btn(names[1])&&!!btn(names[2])&&text(btn(names[0]))===names[3],walk(main(),x=>x.tagName==="button").map(b=>b.attrs["aria-label"]||"").join("|"));
  press(btn(names[1]));
  chk(`${lg}: the question before removing, with Remove and Cancel`,lg==="es"?/¿Quitar esta fila y la fila que está debajo\?/.test(text(main()))&&/Quitar/.test(text(byClass(main(),"dv-rm-yes")[0]))&&/Cancelar/.test(text(byClass(main(),"dv-rm-no")[0])):
    /Supprimer cette ligne et la ligne qui se trouve dessous \?/.test(text(main()))&&/Supprimer/.test(text(byClass(main(),"dv-rm-yes")[0]))&&/Annuler/.test(text(byClass(main(),"dv-rm-no")[0])),text(main()).slice(0,200));}

console.log(fails?`\n${fails} rows-change check(s) FAILED`:"\nrows-change checks passed");
process.exit(fails?1:0);
