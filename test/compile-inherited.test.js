// What the compiler draws for rows and fields named like a member every object has (constructor, toString, valueOf, hasOwnProperty,
// __proto__): a row WITHOUT such a field has an empty cell, never a function's text or "[object Object]", at every depth (a child
// row too); a row WITH it shows its real value, the same as the renderer shows (test/compile-inherited-browser.js compares the two
// on this booklet in a browser). test/compile-assets/compile-inherited.booklet.md: two rows that lack all five fields, one that
// carries each, and a parent row with two children, one of which has `constructor`.
// Run: node test/compile-inherited.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const C=require("../compile/compile.js"),E=require("../compile/engine.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const FIX=path.join(__dirname,"compile-assets","compile-inherited.booklet.md");
const run=C.compile([{file:FIX}],{form:"standalone",engine:E.load(),browser:false}),r=run.results[0];
const page=r.rep.pages.filter(p=>p.endsWith("index.html")).map(p=>String(r.files.get(p)||"")).join("\n");
const count=(s,re)=>(s.match(re)||[]).length;
chk("the fixture compiles with no problem",r.rep.ok&&page.length>0&&!r.rep.problems.length,(r.rep.problems||[]).join("; "));
const views=[];{const re=/<div class="bk-view[^"]*" data-bk-view="([a-z]+)"/g;let m,prev=null;
  while((m=re.exec(page))){if(prev) prev.html=page.slice(prev.at,m.index);prev={as:m[1],at:m.index};views.push(prev);}
  if(prev) prev.html=page.slice(prev.at,page.indexOf("</article>",prev.at));}
chk("nine views are drawn, none marked",views.length===9&&!r.rep.marked.length,views.length+"");
const V=i=>views[i-1]?views[i-1].html:"";
const LEAK=/native code|function\b|\[object|=>/;
chk("no view carries the text of a function or an object",views.every(v=>!LEAK.test(v.html)),views.map((v,i)=>LEAK.test(v.html)?i+1:"").join(""));
chk("table: a row lacking the five fields has five empty cells, the row that has them shows each value",
  count(V(1),/<td data-bk-col="(?:constructor|toString|valueOf|hasOwnProperty|__proto__)"><\/td>/g)===10&&
  ["real ctor","real text","real value","real has","real proto"].every(w=>new RegExp('data-bk-col="[A-Za-z_]+">'+w+'<').test(V(1))),count(V(1),/<td data-bk-col="[A-Za-z_]+"><\/td>/g)+"");
chk("list: a value, a note and a badge named like members show only the row that has them",/real value/.test(V(2))&&/real has/.test(V(2))&&/real text/.test(V(2))&&!LEAK.test(V(2)));
chk("cards: a label named `constructor` is the card's title for the row that has it, and the others have none",/real ctor/.test(V(3))&&count(V(3),/real ctor/g)===1);
chk("tiles: the one row that has a label and a value named like members shows them",/real value/.test(V(4))&&/real ctor/.test(V(4))&&/real has/.test(V(4)));
chk("bars: a label named `toString` is the label of the row that has it",/real text/.test(V(5)));
chk("line: a label named `hasOwnProperty` is the label of the row that has it",/real has/.test(V(6)));
chk("a table grouped by `constructor`: the rows that lack it are one group of no name, and the row that has it is a group of its own",
  count(V(7),/class="bk-dv-grouprow"|scope="rowgroup"/g)===2&&/real ctor/.test(V(7))&&/–/.test(V(7)),count(V(7),/scope="rowgroup"/g)+"");
chk("nested rows: a child lacking `constructor` has an empty cell, and the child that has it shows it",
  /child ctor/.test(V(8))&&count(V(8),/child ctor/g)===1&&!LEAK.test(V(8)));
chk("a nested list: the child that has `constructor` shows it as its note, and the others show none",/child ctor/.test(V(9))&&count(V(9),/child ctor/g)===1&&!LEAK.test(V(9)));
console.log(fails?"\n"+fails+" FAILURES":"\ncompile inherited-member checks passed");process.exit(fails?1:0);
