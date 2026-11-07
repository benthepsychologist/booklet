// What the compiler draws for rows that open (compile/views.js; format 0.19, SPEC.md "Rows from a file" and sections 5 and 6),
// held to what the renderer draws: the same rows, the same open parts, the same group heads, in the same order.
// test/compile-assets/compile-rows.booklet.md has eighteen queries over inline data (a garden's beds and plots; nothing real):
//   - a flat row with fields its line does not show opens, on a table, a list and cards; its open part lists each such field
//     under its label, in the source's order, leaves out `id`, a field with no text and the fields the line shows
//   - a view that declares no fields still opens a row that has a key the others lack, and only that row
//   - a row that holds rows opens to its own fields and then its children, and a child opens to its own fields in turn
//   - a grouped view of flat rows that open keeps its groups (heads and counts, first seen first) and nests each group; a view
//     that is truly nested (rows that hold rows, or a `parent`) does not draw `group:`, as the renderer does not
//   - a row with nothing more to show is a plain row, and nothing is open on a page (every disclosure is native and shut)
// The comparison against the renderer's own drawing, in a browser, with scripting off and on, is test/compile-rows-browser.js.
// Run: node test/compile-rows.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const C=require("../compile/compile.js"),E=require("../compile/engine.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const X=E.load();
const FIX=path.join(__dirname,"compile-assets","compile-rows.booklet.md");
const run=C.compile([{file:FIX}],{form:"standalone",engine:X,browser:false}),r=run.results[0];
const pages=r.rep.pages.filter(p=>p.endsWith("index.html")).map(p=>String(r.files.get(p)||""));
const page=pages.join("\n");
const count=(s,re)=>(s.match(re)||[]).length;
chk("the fixture compiles",r.rep.ok&&page.length>0,(r.rep.refused||[]).join("; "));
chk("no problem is reported",!r.rep.problems.length,r.rep.problems.join("; "));

/* the views on the page, in order: each one's markup, from its container to the next */
const views=[];{const re=/<div class="bk-view[^"]*" data-bk-view="([a-z]+)"/g;let m,prev=null;
  while((m=re.exec(page))){if(prev) prev.html=page.slice(prev.at,m.index);prev={as:m[1],at:m.index};views.push(prev);}
  if(prev) prev.html=page.slice(prev.at,page.indexOf("</article>",prev.at));}
chk("eighteen views are drawn, none marked",views.length===18&&!r.rep.marked.length,views.length+" "+r.rep.marked.length);
const V=i=>views[i-1]?views[i-1].html:"";
/* the words of an open part, as "label: text" in order, for each disclosure in a view */
const rests=h=>[...h.matchAll(/<dl class="bk-dv-rest">([\s\S]*?)<\/dl>/g)].map(m=>[...m[1].matchAll(/<dt>([^<]*)<\/dt>\s*<dd class="bk-dv-text">([^<]*)<\/dd>/g)].map(x=>x[1]+"="+x[2].replace(/\s+/g," ")).join("|"));
const labels=h=>rests(h).map(s=>s.split("|").map(x=>x.split("=")[0]).join(","));

/* ---- a flat row with more to show than its line opens ---- */
/* the note is a role on a list and on cards (a field named note is the line under the label), so it is not in their open part */
const NORTH={table:"Place=Orchard|Note=Line one Line two|Owner=Ann|Crop=garlic",list:"Place=Orchard|Owner=Ann|Crop=garlic",cards:"Place=Orchard|Owner=Ann|Crop=garlic"};
for(const [i,as] of [[1,"table"],[2,"list"],[3,"cards"]]){
  const h=V(i);
  chk(as+": every flat row that has fields its line does not show is a disclosure (4 of 4), and none is open",
    views[i-1].as===as&&count(h,/<details/g)===4&&!/<details[^>]*\sopen/.test(h)&&count(h,/ data-bk-row\b/g)===4,count(h,/<details/g)+" "+count(h,/ data-bk-row\b/g));
  chk(as+": its open part lists the fields the line does not show, each under its label, in the source's order",
    rests(h)[0]===NORTH[as],rests(h)[0]);
  chk(as+": an open part leaves out `id`, a field with no text (East bed has no note) and what the line shows",
    labels(h)[1]==="Place,Owner,Crop"&&labels(h).every(l=>!/\b(id|Bed|Size)\b/.test(l))&&rests(h).every(s=>!/=(\||$)/.test(s)),labels(h).join(" / "));
}
chk("a table's rows keep the line's columns and a long note keeps its line break, as text",
  V(1).includes("Line one\nLine two")&&V(1).includes('<span data-bk-col="bed">North bed</span>'));
/* a flat table whose rows open stays a table: real headings, a real row for each row, the disclosure in its lead cell */
{const h=V(1),th=[...h.matchAll(/<th scope="col" data-bk-col="([a-z]+)"[^>]*>([^<]*)<\/th>/g)].map(m=>m[1]+"="+m[2]);
 chk("a flat table whose rows open is a <table> with a real <th scope=\"col\"> for each column, named by its field, and no hidden grid heading",
   count(h,/<table>/g)===1&&th.join()==="bed=Bed,size=Size"&&!/bk-dv-thead|aria-hidden="true"/.test(h)&&!/bk-dv-ttable/.test(h),th.join()+" "+h.slice(0,300));
 chk("…each row is a <tbody> that is the row (data-bk-row) holding its <tr> of <td> cells; the lead cell holds the disclosure and the rest of the row is a <tr> of its own after it",
   count(h,/<tbody data-bk-row>/g)===4&&count(h,/<tr class="bk-dv-trmore">/g)===4&&/<tbody data-bk-row>\s*<tr>\s*<td>\s*<details>\s*<summary class="bk-dv-sum">\s*<span data-bk-col="bed">North bed<\/span>/.test(h)&&/<td data-bk-col="size"[^>]*>12<\/td>/.test(h),h.slice(0,900));
 chk("…and the table's cells are not a grid of spans: a column's value is the <td>, with no label read before it",!/bk-sr">Size: /.test(h));}

/* ---- a view that declares no fields: the rows' own keys decide, row by row ---- */
for(const [i,as] of [[4,"table"],[5,"list"],[6,"cards"]]){
  const h=V(i);
  chk(as+" with no fields declared: only the row that has keys the others lack opens, and shows just those",
    views[i-1].as===as&&count(h,/<details/g)===1&&rests(h).length===1&&labels(h)[0]==="b,c"&&count(h,/ data-bk-row\b/g)===3,labels(h).join(" / ")+" "+count(h,/<details/g));
}

/* ---- rows that hold rows: a child's own fields are in its open part ---- */
for(const [i,as] of [[12,"table"],[13,"list"],[14,"cards"]]){
  const h=V(i),rs=rests(h);
  chk(as+": a row opens to its own fields, then its children in a group headed by the field's label, and a child opens in turn",
    views[i-1].as===as&&count(h,/ data-bk-row\b/g)===6&&count(h,/<details/g)===4&&rs[0].startsWith("Owner=Ann|About=Apples")&&
    h.indexOf("Owner")<h.indexOf("Jobs")&&h.indexOf(">Jobs<")<h.indexOf("Prune")&&h.indexOf("Prune")<h.indexOf(">Steps<")&&h.indexOf(">Steps<")<h.indexOf("Ladder"),
    JSON.stringify(rs));
  chk(as+": the child rows' own fields are drawn (Prune's owner Cy, the step Ladder's owner Di), each under its own row",
    rs.some(s=>s==="Owner=Cy")&&rs.some(s=>s==="Owner=Di"),JSON.stringify(rs));
}

/* ---- a grouped view of flat rows that open keeps its groups ---- */
const heads=h=>[...h.matchAll(/class="bk-dv-group" role="heading" aria-level="3">([^<]*)<span class="bk-count">([^<]*)<\/span>/g)].map(m=>m[1]+" "+m[2]);
const gheads=h=>[...h.matchAll(/<th scope="rowgroup"[^>]*>([^<]*)<span class="bk-count">([^<]*)<\/span>/g)].map(m=>m[1]+" "+m[2]);
for(const [i,as] of [[7,"table"],[8,"list"],[9,"cards"]]){
  const h=V(i),hs=as==="table"?gheads(h):heads(h);
  chk(as+": a grouped view keeps its group heads, with counts, first seen first (Orchard 2 rows, Yard 2 rows)",
    views[i-1].as===as&&hs.join(",")==="Orchard 2 rows,Yard 2 rows",hs.join(","));
  chk(as+": …and each group's rows still open, in the group, in the file's order",
    count(h,/<details/g)===4&&/Orchard[^]*North bed[^]*Herb pot[^]*Yard[^]*East bed[^]*Cold frame/.test(h),count(h,/<details/g));
}
chk("grouped cards under a limit: the limit counts rows before they are grouped (3 rows: Orchard 2, Yard 1)",
  heads(V(10)).join(",")==="Orchard 2 rows,Yard 1 row"&&count(V(10),/ data-bk-row\b/g)===3,heads(V(10)).join(","));
chk("a grouped table with a badge: the heads, and the badge is a pill in the line, not in the open part",
  gheads(V(11)).join(",")==="Orchard 2 rows,Yard 2 rows"&&count(V(11),/class="bk-pill/g)===4&&!rests(V(11)).some(s=>/Crop=/.test(s)),rests(V(11)).join(" / "));
chk("a flat grouped view is not drawn as one flat list: its groups are separate blocks",
  count(V(8),/class="bk-dv-gcard"/g)===2&&count(V(7),/<tbody class="bk-grouprow">/g)===2&&count(V(9),/bk-dv-ncard/g)>=4);

/* ---- a truly nested view does not draw group: ---- */
chk("rows that hold rows, with group: set, draw no group head (the renderer draws none)",heads(V(15)).length===0&&!/aria-level="3"/.test(V(15))&&count(V(15),/ data-bk-row\b/g)===6);
chk("rows nested by parent, with group: set, draw no group head either, and nest as before",heads(V(16)).length===0&&count(V(16),/ data-bk-row\b/g)===3&&count(V(16),/<details/g)===3);

/* ---- nothing more to show: a plain row ---- */
chk("a view that shows every field of every row has no disclosure (a flat table, as before)",
  views[16].as==="table"&&!/<details/.test(V(17))&&count(V(17),/<tr data-bk-row>/g)===4);
chk("odd values: a list is its items, true is true, 0 is shown, null and \"\" are left out; a quote in a key is &quot;; markup is text",
  rests(V(18)).some(s=>s==="tags=a, b|flag=true|n=0")&&V(18).includes('data-bk-col="bed"')&&V(18).includes("a\"b")&&V(18).includes("quote &lt;b&gt;x&lt;/b&gt;")&&!V(18).includes("quote <b>")&&
  !rests(V(18)).some(s=>/nothing=|empty=/.test(s)),JSON.stringify(rests(V(18))));

/* ---- the page ---- */
chk("every disclosure is native and shut: no script, no handler, no open row anywhere",
  !/<details[^>]*\sopen/.test(page)&&!/\son[a-z]+=/i.test(page)&&!/<script/i.test(page.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,"").replace(/<script src="(?:\.\.\/)*booklet\/booklet\.js" defer><\/script>/g,"")));
chk("a row's summary is the row: it carries data-bk-row and a disclosure has exactly one summary",
  count(page,/<details/g)===count(page,/<summary/g)&&count(page,/<summary[^>]*data-bk-row/g)+count(page,/<tbody data-bk-row>\s*<tr>\s*<td[^>]*>\s*<details[^>]*>\s*<summary class="bk-dv-sum"/g)===count(page,/<summary/g));

/* ---- "does not hold child rows" is a row's own: a field that holds rows in one row is a plain value in another ---- */
{const rows=[{id:"a",title:"Has kids",items:[{id:"a1",title:"Kid"}]},{id:"b",title:"Plain note",items:"n/a for this one",extra:"x"}];
 const bk='---\nbooklet: "0.19"\ntitle: T\nlang: en\nid: t\n---\n\n> [!activity|a] A\n\n'+["table","list","cards"].map(v=>"```booklet query\nfrom: x\nas: "+v+"\nlabel: title\n```\n").join("\n")+"\n```booklet data\n"+JSON.stringify({fields:{title:"Name",items:"Items",extra:"Extra"},rows})+"\n```\n^x\n";
 const res=C.compile([{text:bk,name:"t"}],{form:"standalone",engine:X,browser:false}).results[0],h=String([...res.files.values()][0]);
 chk("a row whose value in a field is plain text shows it in its open part, on a table, a list and cards, though another row holds rows in that field",res.rep.ok&&count(h,/<dt>Items<\/dt>\s*<dd[^>]*>n\/a for this one<\/dd>/g)===3,String(count(h,/n\/a for this one/g)));
 chk("…and the row that holds rows draws them as children",count(h,/Kid/g)>=3&&!h.includes("[object Object]"));}

console.log(fails?"\n"+fails+" FAILURES":"\ncompile rows passed");process.exit(fails?1:0);
