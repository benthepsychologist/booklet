// Format 0.20, reference renderer: adding a row and removing one are written in the format and NOT built here (SPEC.md section 13).
// What the renderer does about them, and nothing more: it reads the two bare query keys `add` and `delete` without a problem, draws the
// view as it always did with ONE quiet line beneath it that says the reader cannot add or remove rows yet (in English, Spanish and
// French), reports an `add` or `delete` written with a value, and keeps the `$add` and `$delete` entries it finds in a booklet's records
// exactly as written when it saves (SPEC.md section 8, "A record the reader did not change is written back exactly as written").
// Everything here is made up: an orchard.
// Run: node test/rowsaddelete.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const FM=lang=>`---\nbooklet: "0.19"\ntitle: Desk\nlang: ${lang||"en"}\n---\n\n`;
const ROWS={fields:{title:{label:"Name",edit:"text"},stage:"Stage"},rows:[{id:"a",title:"Orchard",stage:"growing",jobs:[{id:"a1",title:"Prune",stage:"planning"}]},{id:"b",title:"Beds",stage:"resting"}]};
const body=(query,act,lang)=>FM(lang)+`> [!module|d] Desk\n\n> [!activity|a${act||" repeat"}] Work\n\n\`\`\`booklet query\nfrom: rows\n${query}\n\`\`\`\n\n\`\`\`booklet data\n${JSON.stringify(ROWS)}\n\`\`\`\n^rows\n\n> [!module|d end] End\n`;
const load=(text)=>{P.wipe();const A=P.boot();A.loadText(text);A.screen="d/a";A.render();return A;};
const quiet={en:"Adding and removing rows is not yet supported by this reader.",
  es:"Este lector aún no permite añadir ni quitar filas.",
  fr:"Ce lecteur ne permet pas encore d’ajouter ni de supprimer des lignes."};
const lines=A=>P.find(P.main(),P.hasClass("dv-add-delete"));
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

// ---- the view is drawn as before, with one quiet line beneath it
for(const [what,q] of [["add","as: table\nadd"],["delete","as: table\ndelete"],["both, on cards","as: cards\nadd\ndelete"],["add on a list","as: list\nadd"],["add on tiles","as: tiles\nvalue: stage\nadd"]]){
  const A=load(body(q)),l=lines(A);
  chk(`a view whose query says ${what}: one quiet line, saying so`,l.length===1&&P.texts(l[0])===quiet.en,l.map(P.texts).join("|"));
  chk(`and the view is still drawn (${what})`,/Orchard/.test(P.texts(P.main()))&&/Beds/.test(P.texts(P.main())));}
{const A=load(body("as: table\nadd"));
 chk("the line sits beneath the view, after the table, inside the query's own box",(()=>{const box=P.find(P.main(),P.hasClass("query"))[0];const kids=box.children;
   const last=kids[kids.length-1];return !!last&&(last.attrs.class||"").includes("dv-add-delete")&&P.find(box,n=>n.tagName==="table").length>0;})());
 chk("it is a quiet hint (the class the renderer's other quiet lines use) and not a button or a control",lines(A)[0].tagName==="p"&&P.hasClass("hint")(lines(A)[0])&&!P.find(lines(A)[0],n=>/^(button|input|a)$/.test(n.tagName)).length);}
{const A=load(body("as: table"));
 chk("a query that says neither `add` nor `delete` has no such line",lines(A).length===0&&hasTable(A));}
{const A=load(body("as: table\nreadonly: stage"));
 chk("a `readonly` that names fields is not the line",lines(A).length===0);}
for(const l of ["es","fr"]){
  const A=load(body("as: table\nadd",""+" repeat",l)),ls=lines(A);
  chk(`in ${l} the line is in ${l}`,ls.length===1&&P.texts(ls[0])===quiet[l],ls.map(P.texts).join("|"));}
{const A=load(body("as: table\nadd"," repeat daily"));
 chk("in a `repeat daily` activity, or any, the renderer still draws the one line (it offers nothing either way)",lines(A).length===1);}
{const t=body("as: table\nadd"),A=load(t);
 chk("a draw changes nothing and keeps nothing: no entry, and the file as it was",A.keptFor("d/a").length===0&&A.toMarkdown()===t,A.toMarkdown().slice(-200));
 A.render();
 chk("drawing again changes no byte of the file",A.toMarkdown()===t);}

// ---- the $add and $delete entries a booklet's records hold are kept exactly as written
const HEAD="> [!records|d] App record — do not edit below this line";
const ADD='{"$add":[{"pick":"j-weed-20261108104200","under":"a","row":{"title":"Weed the beds","stage":"planning"}}],"ts":"2026-11-08T10:42:00Z"}';
const DEL='{"$delete":[{"pick":"a1","was":{"id":"a1","title":"Prune","stage":"planning"}}],"ts":"2026-11-08T10:43:10Z"}';
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
 chk("and every byte of the earlier entries, the `$add` and the `$delete` among them, is as it was",out===t.replace(ITEMS,ITEMS+",\n    "+JSON.stringify(z)),out.slice(-520));}
{const t=TEXT(),A=load(t);
 A.keptFor("d/a");
 const g=A.STATE.entries["d/a"];g[0].title[0].a="Orchard, old";A.markDirty&&A.markDirty();
 chk("changing the one entry the reader changed leaves the `$add` and `$delete` lines as written",A.toMarkdown().includes(ADD)&&A.toMarkdown().includes("    "+DEL),A.toMarkdown().slice(-420));}
{const A=load(TEXT()),t=P.texts(P.main());
 chk("the page draws with them: the view and its one line are there and nothing throws",/Beds/.test(t)&&lines(A).length===1);}

console.log(fails?`\n${fails} add/delete check(s) FAILED`:"\nadd/delete checks passed");
process.exit(fails?1:0);
