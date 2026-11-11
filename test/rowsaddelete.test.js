// Format 0.20, reference renderer 0.20.2: the two bare query keys `add` and `delete`. The renderer reads them without a problem, reports one written with a
// value, draws the controls where the rows are written in the booklet itself (test/rowschange.test.js) and, where they would be drawn and the rows cannot
// be changed (a block that reads a JSON file), ONE quiet line beneath the view that says why, in English, Spanish and French. It keeps the `$add` and
// `$delete` entries it finds in a booklet's records exactly as written when it saves (SPEC.md section 8, "A record the reader did not change is written back
// exactly as written"), draws the rows they wait for, and leaves them out of every view over kept entries.
// Everything here is made up: an orchard.
// Run: node test/rowsaddelete.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const FM=lang=>`---\nbooklet: "0.20"\ntitle: Desk\nlang: ${lang||"en"}\n---\n\n`;
const ROWS={fields:{title:{label:"Name",edit:"text"},stage:"Stage"},rows:[{id:"a",title:"Orchard",stage:"growing",jobs:[{id:"a1",title:"Prune",stage:"planning"}]},{id:"b",title:"Beds",stage:"resting"}]};
const body=(query,act,lang)=>FM(lang)+`> [!module|d] Desk\n\n> [!activity|a${act||" repeat"}] Work\n\n\`\`\`booklet query\nfrom: rows\n${query}\n\`\`\`\n\n\`\`\`booklet data\n${JSON.stringify(ROWS)}\n\`\`\`\n^rows\n\n> [!module|d end] End\n`;
const load=(text)=>{P.wipe();const A=P.boot();A.loadText(text);A.screen="d/a";A.render();return A;};
const lines=A=>P.find(P.main(),P.hasClass("dv-rows-why"));
const hasTable=A=>P.find(P.main(),n=>n.tagName==="table").length>0;

// ---- the two keys are read: no problem is reported
for(const q of ["as: table\nadd","as: table\ndelete","as: list\nadd\ndelete","as: cards\nadd:\ndelete:","as: table\nreadonly\nadd"]){
  const R=P.boot().parseFile(body(q));
  chk(`a query that says ${JSON.stringify(q.replace(/\n/g," / "))} is read with nothing unread`,R.ok&&R.unread.length===0,JSON.stringify(R.unread));}
{const A=P.boot();
 chk("the renderer's query keys are the eighteen, `add` and `delete` last",A.QUERY_KEYS.length===18&&A.QUERY_KEYS.slice(-2).join()==="add,delete",String(A.QUERY_KEYS));}

// ---- written with a value, they are ignored and reported (SPEC.md section 6: "ignored and reported", as for `limit`)
for(const k of ["add","delete"]){
  const R=P.boot().parseFile(body(`as: table\n${k}: yes`));
  chk(`\`${k}: yes\` is reported once, in words`,R.unread.length===1&&new RegExp("`"+k+"` is written bare").test(String(R.unread[0]))&&/`yes`|yes/.test(String(R.unread[0])),JSON.stringify(R.unread));}

// ---- the controls are drawn where the rows are written in the booklet (test/rowschange.test.js); a block that reads a JSON file gets none, and a line that says why
for(const [what,q] of [["add","as: table\nadd"],["delete","as: table\ndelete"],["both, on cards","as: cards\nadd\ndelete"],["add on a list","as: list\nadd"],["a default view (a table)","add"],["add beside a `readonly` that names fields","as: table\nreadonly: stage\nadd"]]){
  const A=load(body(q));
  chk(`a view whose query says ${what}, over rows written in the booklet: no quiet line (the controls are drawn instead)`,lines(A).length===0&&/Orchard/.test(P.texts(P.main())),lines(A).map(P.texts).join("|"));
  chk(`and the old "not yet supported" words are nowhere (${what})`,!/not yet supported by this reader/.test(P.texts(P.main())));}
{const A=P.boot(),n=A.rowsNote({add:true},{keeps:true,rows:null,fileBlock:true}),m=A.rowsNote({delete:true},{keeps:true,rows:null,fileBlock:false}),
   z=A.rowsNote({add:true,readonly:true},{keeps:true,rows:null,fileBlock:true}),d=A.rowsNote({add:true},{keeps:false,rows:null,fileBlock:true}),
   t=A.rowsNote({add:true,as:"tiles"},{keeps:true,rows:null,fileBlock:true}),o=A.rowsNote({add:true},{keeps:true,rows:{},fileBlock:false});
  chk("a block that reads a JSON file gets one quiet line that names the real reason",n.length===1&&/reads its rows from a JSON file/.test(P.texts(n[0]))&&/cannot add or remove rows in a file/.test(P.texts(n[0]))&&P.hasClass("hint")(n[0]),n.map(P.texts).join("|"));
  chk("and it says where rows can be added and removed",/where the data is written in the booklet itself/.test(P.texts(n[0])));
  chk("a block that cannot be written here says that, in other words",m.length===1&&/cannot change the rows of this data here/.test(P.texts(m[0])));
  chk("no line under a bare `readonly`, in a daily or non-repeat activity, on tiles, or where the controls are drawn",z.length===0&&d.length===0&&t.length===0&&o.length===0);}
for(const l of ["es","fr"]){
  const A=load(body("as: table\nadd",""+" repeat",l));
  chk(`in ${l} the controls are named in ${l}`,P.find(P.main(),n=>n.tagName==="button"&&((n.attrs||{})["aria-label"]||"")===({es:"Añadir una fila",fr:"Ajouter une ligne"})[l]).length===1);}
// no controls where they would not be drawn: tiles, a chart, a `repeat daily` activity, an activity that keeps nothing, a bare `readonly`
for(const [what,q,act] of [["tiles","as: tiles\nvalue: stage\nadd"," repeat"],["bars","as: bars\nvalue: stage\nadd"," repeat"],["a line chart","as: line\nvalue: stage\ndelete"," repeat"],
  ["a `repeat daily` activity","as: table\nadd"," repeat daily"],["an activity that keeps nothing","as: table\nadd\ndelete",""],
  ["a bare `readonly`","as: table\nreadonly\nadd\ndelete"," repeat"],["a bare `readonly:` with nothing after it","as: cards\nreadonly:\nadd"," repeat"]]){
  const A=load(act===""?body(q).replace("|a repeat]","|a]"):body(q,act));
  chk(`no control and no line beneath ${what}`,lines(A).length===0&&P.find(P.main(),n=>n.tagName==="button"&&/^(Add a row|Remove )/.test((n.attrs||{})["aria-label"]||"")).length===0&&/Orchard/.test(P.texts(P.main())),lines(A).map(P.texts).join("|"));}
{const t=body("as: table\nadd").replace("from: rows","from: w"),T=FM()+"> [!module|d] Desk\n\n> [!activity|w repeat] Work\n\n> [!text|note] A note?\n\n> [!activity|a repeat] Look\n\n```booklet query\nfrom: w\nadd\ndelete\n```\n\n> [!module|d end] End\n";
 P.wipe();const A=P.boot();A.loadText(T);A.screen="d/a";A.render();
 chk("no control and no line beneath a query over kept entries (it acts on a data block, and there is none)",lines(A).length===0&&P.find(P.main(),n=>n.tagName==="button"&&/^(Add a row|Remove )/.test((n.attrs||{})["aria-label"]||"")).length===0);}

{const t=body("as: table\nadd"),A=load(t);
 chk("a draw changes nothing and keeps nothing: no entry, and the file as it was",A.keptFor("d/a").length===0&&A.toMarkdown()===t,A.toMarkdown().slice(-200));
 A.render();
 chk("drawing again changes no byte of the file",A.toMarkdown()===t);}

// ---- the $add and $delete entries a booklet's records hold are kept exactly as written
const HEAD="> [!records|d] App record — do not edit below this line";
const ADD='{"$add":[{"in":"rows","pick":"j-weed-20261108104200","under":"a","row":{"title":"Weed the beds","stage":"planning"}}],"ts":"2026-11-08T10:42:00Z"}';
const DEL='{"$delete":[{"in":"rows","pick":"a1","was":{"id":"a1","title":"Prune","stage":"planning"}}],"ts":"2026-11-08T10:43:10Z"}';
const ED='{"title":[{"pick":"a","a":"Old orchard","was":"Orchard"}],"ts":"2026-11-08T10:41:00Z"}';
const ITEMS=`  ${ED},\n  ${ADD},\n    ${DEL}`;
const REGION=(items,eol)=>["%%",HEAD,"","```booklet entries a","{\"items\": [",items,"]}","```","%%",""].join(eol||"\n");
const TEXT=(q,eol)=>(body(q||"as: table\nadd\ndelete")+"\n"+REGION(ITEMS)).replace(/\n/g,eol||"\n");
{const t=TEXT(),A=load(t);
 chk("a booklet whose records hold `$add` and `$delete` entries is written back byte for byte",A.toMarkdown()===t,A.toMarkdown().slice(-420));
 chk("all three entries are read as entries of the activity",A.keptFor("d/a").length===3,String(A.keptFor("d/a").length));
 chk("the `$add` and `$delete` entries are kept as the parsed objects they are, with their pairs",JSON.stringify(A.keptFor("d/a")[1])===ADD&&JSON.stringify(A.keptFor("d/a")[2])===DEL,JSON.stringify(A.keptFor("d/a")));}
{const t=TEXT("as: table\nadd\ndelete","\r\n"),A=load(t);
 chk("with Windows line endings it is written back byte for byte",A.toMarkdown()===t,JSON.stringify(A.toMarkdown().slice(-160)));}
{const t="﻿"+TEXT(),A=load(t);
 chk("with a leading byte order mark it is written back byte for byte",A.toMarkdown()===t);}
{const t=TEXT()+"\n\n",A=load(t);
 chk("with trailing blank lines it is written back byte for byte",A.toMarkdown()===t,JSON.stringify(A.toMarkdown().slice(-30)));}
{const t=TEXT(),A=load(t);
 // the reader keeps a plain edit in place: ONE entry is added after the last, and the two acts stay as they were
 const b=P.find(P.main(),n=>n.tagName==="button"&&P.hasClass("dv-ed-btn")(n)&&/^Name of Beds:/.test((n.attrs||{})["aria-label"]||""))[0];
 chk("(set-up) the edit button of a row is found",!!b);
 if(b){b._on.click({target:b,preventDefault(){},stopPropagation(){}});
   const box=P.find(P.main(),P.hasClass("dv-ed-in"))[0];box.value="Beds and borders";box._on.input&&box._on.input({target:box});
   box._on.keydown({key:"Enter",target:box,preventDefault(){},stopPropagation(){}});}
 const out=A.toMarkdown(),e=A.keptFor("d/a"),z=e[e.length-1];
 chk("keeping an edit adds one entry after the last",e.length===4&&Object.keys(z).sort().join()==="title,ts",JSON.stringify(z));
 chk("and every byte of the earlier entries, the `$add` and the `$delete` among them, is as it was (the one value the edit wrote into the block is the only other change)",out===t.replace(ITEMS,ITEMS+",\n    "+JSON.stringify(z)).replace('"title":"Beds"','"title":"Beds and borders"'),out.slice(-520));}
{const t=TEXT(),A=load(t);
 A.keptFor("d/a");
 const g=A.STATE.entries["d/a"];g[0].title[0].a="Orchard, old";A.markDirty&&A.markDirty();
 chk("changing the one entry the reader changed leaves the `$add` and `$delete` lines as written",A.toMarkdown().includes(ADD)&&A.toMarkdown().includes("    "+DEL),A.toMarkdown().slice(-420));}
{const A=load(TEXT()),t=P.texts(P.main());
 chk("the page draws with them: the view is there and nothing throws",/Beds/.test(t)&&lines(A).length===0);}

// ---- views over kept entries leave the `$add` and `$delete` entries out (SPEC.md section 6): no card, no row, nothing in "Earlier entries"
{const OK='{"note":"Hello there","ts":"2026-11-08T10:41:00Z"}',KEPT=[OK,ADD,DEL].join(",\n");
 const T=FM()+"> [!module|d] Desk\n\n> [!activity|w repeat] Work\n\n> [!text|note] A note?\n\n> [!activity|a] Look\n\n```booklet query\nfrom: w\nas: cards\n```\n\n```booklet query\nfrom: w\nas: table\n```\n\n```booklet query\nfrom: w\nas: list\nlimit: 2\n```\n\n> [!module|d end] End\n\n%%\n"+HEAD+"\n\n```booklet entries w\n{\"items\": [\n"+KEPT+"\n]}\n```\n%%\n";
 P.wipe();let A=P.boot();A.loadText(T);A.screen="d/a";A.render();
 const cls=c=>P.find(P.main(),P.hasClass(c)).length;
 chk("a cards view over kept entries draws the one ordinary entry and no card for the two acts",cls("card-item")===1,String(cls("card-item")));
 chk("a table over them has one row",P.find(P.main(),n=>n.tagName==="table").every(t=>P.find(t,x=>x.tagName==="tbody").every(b=>P.find(b,x=>x.tagName==="tr").length===1)),"rows");
 chk("a list with `limit: 2` still shows the ordinary entry (the acts do not use up the limit)",/Hello there/.test(P.texts(P.main())));
 P.wipe();A=P.boot();A.loadText(T);A.screen="d/w";A.render();
 chk("\"Earlier entries\" lists the one ordinary entry, and not the acts",cls("chip")===1,String(cls("chip")));
 chk("all three entries are still kept (leaving them out of a view removes nothing)",A.keptFor("d/w").length===3&&A.toMarkdown()===T);
 const only=T.replace(OK+",\n","").replace(/,\n\{"\$delete".*\}/,"");
 P.wipe();A=P.boot();A.loadText(only);A.screen="d/w";A.render();
 chk("with only acts kept, \"Earlier entries\" says there are none yet",cls("chip")===0&&/No earlier entries yet/.test(P.texts(P.main())),P.texts(P.main()).slice(0,200));}

console.log(fails?`\n${fails} add/delete check(s) FAILED`:"\nadd/delete checks passed");
process.exit(fails?1:0);
