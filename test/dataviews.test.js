// Format v0.5: data blocks and the query views over them (table, list, tiles).
// Run: node test/dataviews.test.js
// Sorting a table is a click on the real page: test/dataviews-browser.js covers
// it in Chromium, since this suite's recording DOM cannot remove a node.
const P=require("./page.js");
const fs=require("fs");
const FX=fs.readFileSync(P.R+"/test/fixtures/data-views.booklet.md","utf8");
const QFX=fs.readFileSync(P.R+"/test/fixtures/module-query.md","utf8");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const byClass=(n,c)=>walk(n,x=>cls(x).includes(c));
const text=n=>typeof n==="string"?n:kids(n).map(text).join("");
const blocksOf=(R,mod,id)=>{const m=R.template.modules.find(x=>x.id===mod);const a=(m.mode&&m.mode.id===id?m.mode:(m.activities||[]).find(x=>x.id===id));return a.blocks;};
const queries=R=>blocksOf(R,"allotment","status").filter(b=>b.type==="query");

(async()=>{
 const A=P.boot();
 /* ---- parsing ---- */
 const R=A.parseFile(FX);
 chk("the data-views fixture parses with nothing reported wrong",R.ok&&R.unread.length===0,JSON.stringify(R.unread));
 chk("it is marked 0.5",R.template.booklet=== 0.6);
 const qs=queries(R);
 chk("four queries, each carrying its rows and its view",qs.length===4&&qs.map(q=>q.view.as).join()==="tiles,list,table,list"&&qs.every(q=>q.data&&Array.isArray(q.data.rows)),JSON.stringify(qs.map(q=>q.view)));
 chk("a bare list of rows (no object) reads, and defaults to a table",qs[2].data.rows.length===4&&qs[2].data.fields===undefined&&qs[2].view.as==="table");
 chk("the object form keeps its `fields` labels",qs[1].data.fields.task==="Job"&&qs[1].view.limit===6&&qs[1].view.group==="when"&&qs[1].fields.join()==="where,effort");
 chk("a data block in the data section is read by a query in the module",qs[2].from==="harvest"&&qs[3].data.rows.length===0);
 chk("a data block is not drawn where it sits, and owns no answer slot",
   blocksOf(R,"allotment","status").every(b=>b.type==="markdown"||b.type==="query")&&!R.template.modules[0].mode.blocks.some(b=>b.type==="data"));
 chk("a data block is not a widget",R.template.widgets.length===0);

 const mk=(body,extra="")=>A.parseFile(`---\nbooklet: 0.6\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n${extra}\`\`\`booklet query\n${body}\n\`\`\`\n\n> [!module|m end] End\n`);
 const ROWS='```booklet data\n[{"x":1,"y":"a"}]\n```\n^d\n\n';
 {const r=mk("from: d",ROWS);chk("a data block and a query in one module read clean",r.ok&&r.unread.length===0,JSON.stringify(r.unread));}
 {const r=mk("from: d\nas: cards",ROWS);chk("`as: cards` on a data block is refused, with a reason",r.unread.some(p=>/as: cards.*“d”/.test(p)),JSON.stringify(r.unread));}
 {const r=mk("from: d\nas: chart",ROWS);chk("an unknown `as:` is refused, with a reason",r.unread.some(p=>/as: chart.*not cards, table, list or tiles/.test(p)),JSON.stringify(r.unread));}
 {const r=mk("from: d",'```booklet data\n[{"x":{"deep":1}}]\n```\n^d\n\n');chk("a nested value is refused: the block is skipped and the query then names nothing",
    r.unread.some(p=>/data block \^d has a value that nests deeper/.test(p))&&r.unread.some(p=>/names “d”/.test(p)),JSON.stringify(r.unread));}
 {const r=mk("from: d",'```booklet data\nrows:\n  - x: 1\n```\n^d\n\n');chk("YAML is not read (JSON only): the block is skipped with a reason",r.unread.some(p=>/not valid JSON/.test(p)),JSON.stringify(r.unread));}
 {const r=mk("from: d",'```booklet data\n[{"x":1}]\n```\n\n');chk("a data block with no ^id is refused",r.unread.some(p=>/needs a \^id/.test(p)),JSON.stringify(r.unread));}
 {const r=mk("from: d",ROWS+ROWS);chk("a data id used twice is refused",r.unread.some(p=>/“d” is used twice/.test(p)),JSON.stringify(r.unread));}
 {const other=`---\nbooklet: 0.6\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n\`\`\`booklet query\nfrom: d\n\`\`\`\n\n> [!module|m end] End\n\n> [!module|n] N\n\n> [!activity|b] B\n\n${ROWS}> [!module|n end] End\n`;
  const r=A.parseFile(other);chk("a data block inside another module is not readable (the module rule)",r.unread.some(p=>/“d”, which is in another module/.test(p)),JSON.stringify(r.unread));}
 {const bare=`---\nbooklet: 0.6\ntitle: T\nlang: en\n---\n\n> [!activity|a] A\n\n\`\`\`booklet query\nfrom: d\nas: tiles\n\`\`\`\n\n${ROWS}`;
  const r=A.parseFile(bare);chk("in a file with no module fence, a data block is read by any activity",r.ok&&r.unread.length===0,JSON.stringify(r.unread));}
 chk("the old query keys still parse exactly as before (no view, no data)",(()=>{const r=A.parseFile(QFX);
   const q=r.template.modules.find(m=>m.id==="fixture-query").activities.find(a=>a.id==="look").blocks.filter(b=>b.type==="query");
   return r.ok&&q.length===3&&q.every(b=>!b.data)&&q[2].view&&Object.keys(q[2].view).length===0;})());

 /* ---- write-back: a data block is saved exactly as it was found ---- */
 P.wipe();const W=P.boot();W.loadText(FX);
 chk("loading the whole fixture and saving it again returns the design byte for byte",W.toMarkdown()===FX.replace(/\s+$/,"")+"\n");
 P.wipe();const W2=P.boot();await W2.createBooklet();
 chk("a booklet started in the renderer says 0.5",W2.TPL.booklet=== 0.6);
 chk("the module adds",W2.addModuleText(FX).ok);
 const md=W2.toMarkdown();
 const blockText=id=>{const i=FX.indexOf("^"+id+"\n");const j=FX.lastIndexOf("```booklet data",i);return FX.slice(j,i+id.length+1);};
 chk("an added module's data blocks are saved byte for byte (one inside its fence, two in the data section)",["glance","jobs","harvest","nothing"].every(id=>md.includes(blockText(id))),"");
 chk("no record is written for a data block or a query",!/booklet (answers|entries|draft) status/.test(md)&&!/\[!records/.test(md));

 /* ---- drawing ---- */
 P.wipe();const B=P.boot();await B.createBooklet();B.addModuleText(FX);
 B.view="status";B.render();const main=P.main();
 const tiles=byClass(main,"dv-tile");
 chk("tiles: one per row, a big value over a label",tiles.length===4&&text(byClass(tiles[0],"dv-v")[0])==="12"&&text(byClass(tiles[0],"dv-l")[0])==="Beds planted");
 chk("tiles: a note shows when the row has one, and not otherwise",text(byClass(tiles[0],"dv-n")[0])==="since March"&&byClass(tiles[3],"dv-n").length===0);
 chk("tiles: `tone` colours good, warn and bad, and anything else (or nothing) is plain",cls(tiles[0]).includes("tone-good")&&cls(tiles[1]).includes("tone-warn")&&cls(tiles[2]).includes("tone-bad")&&!cls(tiles[3]).some(c=>/^tone-/.test(c)));
 chk("tiles: a tone is also said in words, not only colour",text(byClass(tiles[2],"dv-sr")[0])==="Needs action"&&byClass(tiles[3],"dv-sr").length===0);
 chk("tiles are a real list",walk(main,x=>x.tagName==="ul"&&cls(x).includes("dv-tiles")).length===1&&tiles.every(t=>t.tagName==="li"));

 const heads=byClass(main,"dv-group");
 chk("list: `group` draws rows together under the value, in first-seen order, with a count",
   heads.map(h=>text(h)).join("|")==="This week3 rows|Next week2 rows|Winter1 row",heads.map(h=>text(h)).join("|"));
 chk("list: `limit` draws only the first rows (7 rows, 6 drawn)",walk(main,x=>x.tagName==="li"&&kids(x).some(k=>cls(k).includes("dv-t"))).length===6);
 const lis=walk(main,x=>x.tagName==="li"&&kids(x).some(k=>cls(k).includes("dv-t")));
 chk("list: each line is its title, then the fields asked for, labelled",
   text(byClass(lis[0],"dv-t")[0])==="Sow the carrots"&&byClass(lis[0],"dv-k").map(text).join()==="Where,Effort"&&text(lis[0]).includes("Bed 4"),text(lis[0]));
 chk("list: the title is the field `title`, else the data's first field (here `task`), and is not repeated",!byClass(lis[0],"dv-k").some(k=>text(k)==="Job"));
 chk("list: the order inside a group is the generator's",
   lis.slice(0,3).map(l=>text(byClass(l,"dv-t")[0])).join("|")==="Sow the carrots|Mend the gate|Order seed");

 const tbl=walk(main,x=>x.tagName==="table");
 chk("table: a real <table> with a header cell per field, in a scrolling wrapper",tbl.length===1&&walk(tbl[0],x=>x.tagName==="th"&&x.attrs.scope==="col").length===4
   &&walk(main,x=>cls(x).includes("md-table")&&kids(x).includes(tbl[0])).length===1);
 chk("table: header cells hold sort buttons, with aria-sort and an accessible name",
   walk(tbl[0],x=>x.tagName==="button"&&cls(x).includes("dv-sort")).length===4&&walk(tbl[0],x=>x.tagName==="th"&&x.attrs["aria-sort"]==="none").length===4
   &&walk(tbl[0],x=>x.tagName==="button").map(b=>b.attrs["aria-label"]).join()==="Sort by crop,Sort by kilos,Sort by picked,Sort by rows");
 const trs=walk(tbl[0],x=>x.tagName==="tr");
 chk("table: one row per row, in the generator's order, plus the header row",trs.length===5&&text(trs[1]).startsWith("Beans")&&text(trs[4]).startsWith("Tomatoes"));
 chk("table: a list value is shown comma-separated, an empty list shows nothing",text(walk(trs[1],x=>x.tagName==="td")[3])==="A, B"&&text(walk(trs[3],x=>x.tagName==="td")[3])==="");
 chk("table: a numeric column is marked to align right",cls(walk(trs[0],x=>x.tagName==="th")[1]).includes("num")&&!cls(walk(trs[0],x=>x.tagName==="th")[0]).includes("num"));
 chk("the empty block shows the query's own line",text(main).includes("Nothing needs you."));
 chk("the page is not a reading-only page (a dashboard stays open)",!B.readsOnly(B.tplModes().find(a=>a.id==="status")));
 chk("nothing in a data block is read as Markdown or HTML",(()=>{const r=A.parseFile(`---\nbooklet: 0.6\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n\`\`\`booklet query\nfrom: d\nas: list\n\`\`\`\n\n\`\`\`booklet data\n[{"title":"**bold** <b>x</b> [l](http://e.com)"}]\n\`\`\`\n^d\n\n> [!module|m end] End\n`);
   P.wipe();const C=P.boot();C.addModuleText(`---\nbooklet: 0.6\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n\`\`\`booklet query\nfrom: d\nas: list\n\`\`\`\n\n\`\`\`booklet data\n[{"title":"**bold** <b>x</b> [l](http://e.com)"}]\n\`\`\`\n^d\n\n> [!module|m end] End\n`);
   C.view="a";C.render();return r.ok&&text(P.main()).includes("**bold** <b>x</b> [l](http://e.com)")&&walk(P.main(),x=>x.tagName==="a"||x.tagName==="b"||x.tagName==="strong").length===0;})());
 chk("a prose-only page with sections still folds as before",(()=>{const r=A.parseFile(`---\nbooklet: 0.6\ntitle: T\nlang: en\n---\n\n## One\n\nText.\n\n## Two\n\nMore.\n`);
   P.wipe();const C=P.boot();C.applyParsed&&0;return r.ok&&C.readsOnly(r.template.modules[0].mode);})());

 /* ---- the same words in the reader's language ---- */
 B.lang="fr";B.render();
 chk("a group's count is in the interface language (French)",byClass(P.main(),"dv-count").map(text).join("|").includes("3 lignes")&&byClass(P.main(),"dv-count").map(text).join("|").includes("1 ligne"));
 chk("a table's sort button is named in the interface language (French)",walk(P.main(),x=>x.tagName==="button"&&cls(x).includes("dv-sort")).map(b=>b.attrs["aria-label"])[0]==="Trier par crop");
 B.lang="es";B.render();
 chk("and in Spanish",byClass(P.main(),"dv-count").map(text).join("|").includes("3 filas"));
 chk("every language table carries the new strings",["fr","es"].every(l=>A.TSRC[l].dv&&A.TSRC[l].dv.sortBy&&A.TSRC[l].dv.tone&&A.TSRC[l].dv.rows)&&!!A.TSRC["es-AR"].dv.empty);

 /* ---- kept entries as rows, through the other views ---- */
 const swap=(a,b)=>QFX.replace(a,b);
 P.wipe();const E=P.boot();await E.createBooklet();
 E.addModuleText(swap("from: log\n```\n\n## Just what happened","from: log\nas: table\nfields: date, ease, situation\n```\n\n## Just what happened"));
 const kept=E.keptFor("log");
 kept.push({ts:"2026-09-20T10:00:00.000Z",situation:"first thing",ease:2},{ts:"2026-09-22T10:00:00.000Z",situation:"second thing",ease:3});
 E.view="look";E.render();
 const et=walk(P.main(),x=>x.tagName==="table")[0];
 chk("kept entries as a table: a row per entry, newest first, its date in the field `date`",!!et&&walk(et,x=>x.tagName==="tr").length===3&&text(walk(et,x=>x.tagName==="tr")[1]).includes("second thing"));
 chk("kept entries as a table: columns are Date and the questions' own labels, in `fields` order",
   walk(et,x=>x.tagName==="th"&&x.attrs.scope==="col").map(th=>text(walk(th,x=>x.tagName==="button")[0])).join("|")==="Date|How hard did it feel?|What happened?");
 chk("kept entries as a table: a scale shows its anchor, as the cards do",text(et).includes("Very")&&text(et).includes("A little"));
 chk("the other two queries on that page are still cards",byClass(P.main(),"entry").length>=2);
 P.wipe();const F=P.boot();await F.createBooklet();
 F.addModuleText(swap("from: log\nfields: ease, situation\nnewest: 1\nempty: Nothing logged yet.","from: log\nas: tiles\nvalue: ease\nlabel: situation\nlimit: 1"));
 F.keptFor("log").push({ts:"2026-09-20T10:00:00.000Z",situation:"first thing",ease:2},{ts:"2026-09-22T10:00:00.000Z",situation:"second thing",ease:3});
 F.view="look";F.render();
 const ft=byClass(P.main(),"dv-tile");
 chk("kept entries as tiles: `value` and `label` name questions, `limit` keeps the first (newest) one",ft.length===1&&text(byClass(ft[0],"dv-v")[0])==="Very"&&text(byClass(ft[0],"dv-l")[0])==="second thing");
 P.wipe();const G=P.boot();await G.createBooklet();
 G.addModuleText(swap("from: log\nfields: ease, situation\nnewest: 1\nempty: Nothing logged yet.","from: log\nas: list\nempty: Nothing logged yet."));
 G.view="look";G.render();
 chk("kept entries as a list with nothing kept: the block's own empty line",text(P.main()).includes("Nothing logged yet."));
 console.log(fails?"\n"+fails+" FAILURES":"\ndata-views checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
