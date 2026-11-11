// Adding, removing and editing a row of a data block written in the booklet (SPEC.md section 5, format 0.20): the cases in test/apply-vectors.json, run against the
// renderer's port (applyToBooklet and the acts it runs: applyAdd, applyDelete, applyAct).
// The file was made by running the Booklet plugin for Obsidian's own code (core/apply.ts) on each case, so it records what the plugin does; another writer copies
// the file and runs the same cases against its own code. A case is a whole booklet, one act, and the whole booklet after it (or why the act was refused), so a
// pass shows that nothing outside the block's fences moved: not a byte, a BOM and CRLF included.
// Run: node test/applyvectors.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path"),P=require("./page.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const V=JSON.parse(fs.readFileSync(path.join(__dirname,"apply-vectors.json"),"utf8"));
const A=P.boot();
chk("the vectors file is the shape this test reads",Array.isArray(V.cases)&&V.cases.length>=100&&V.limit===5*1024*1024&&A.ROWS_LIMIT===V.limit,V.cases.length+" cases");
const kinds=new Set(V.cases.map(c=>c.act.kind));
chk("it holds adds, removals and edits",["add","delete","edit"].every(k=>kinds.has(k)));
const need=["comment","lone CR","CRLF","BOM","empty list","share","only row","tabs","clash","ambiguous","5 MB","UTF","under","numeric"];
chk("it covers the layouts and refusals the item names ("+need.join(", ")+")",need.every(w=>V.cases.some(c=>c.name.includes(w))),need.filter(w=>!V.cases.some(c=>c.name.includes(w))).join());
const run=(note,a)=>A.applyToBooklet(note,{id:a.in,mod:a.module},inner=>
  a.kind==="add"?A.applyAdd(inner,a.pick,a.under,a.row||{}):
  a.kind==="delete"?A.applyDelete(inner,a.pick,a.was):
  A.applyAct(inner,a.pick,a.field,a.was,a.a,a.eq==="option"?A.rowSameOption:A.rowSameValue));
/* a case's `pad` makes a big block without a big file: the token @PAD@ in the text, the act and the expected text stands for that many x */
const fill=(c,v)=>c.pad?(typeof v==="string"?v.split("@PAD@").join("x".repeat(c.pad)):JSON.parse(JSON.stringify(v).split("@PAD@").join("x".repeat(c.pad)))):v;
for(const c of V.cases){
  const note=fill(c,c.text),act=fill(c,c.act),got=run(note,act);
  /* `spec`: what SPEC.md says where the plugin does not yet (an inline block past 5 MB); the renderer holds to it */
  const want=c.spec||c.expect;
  let ok,why="";
  if(want.refused){ok=!got.ok&&got.why===want.refused;why=JSON.stringify(got.ok?{ok:true}:got).slice(0,200);}
  else if(want.same){ok=got.ok&&got.text===note&&got.same===true;why=got.ok?"text differs":got.why;}
  else{const w=fill(c,want.text);ok=got.ok&&got.text===w;
    if(!ok){why=got.ok?"differs at "+[...w].findIndex((ch,i)=>ch!==got.text[i])+" of "+w.length+"/"+got.text.length+"\n    want "+JSON.stringify(w.slice(-160))+"\n    got "+JSON.stringify(got.text.slice(-160)):got.why;}}
  chk(c.name,ok,why);}
// every refusal leaves the booklet alone: nothing is returned to write
chk("a refusal returns no text to write",V.cases.filter(c=>(c.spec||c.expect).refused).every(c=>{const g=run(fill(c,c.text),fill(c,c.act));return !g.ok&&g.text===undefined;}));
chk("every case that passes 5 MB carries `spec` (the plugin writes it, SPEC refuses it)",V.cases.filter(c=>c.pad&&c.pad>V.limit-1000&&(c.spec||{}).refused==="too big").length===3);
chk("the file stays small: no case holds a big block written out (the token stands for it)",fs.statSync(path.join(__dirname,"apply-vectors.json")).size<1024*1024,fs.statSync(path.join(__dirname,"apply-vectors.json")).size);
if(fails){console.log(fails+" apply-vector check(s) failed");process.exit(1);}
console.log("apply-vector checks passed ("+V.cases.length+" cases)");
