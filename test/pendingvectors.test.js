// What a reader draws while its acts have not reached the data (SPEC.md section 5, "Adding a row", "What is drawn while it waits"; "Removing a row"): the cases in
// test/pending-vectors.json, run against the renderer's port (withPending and rowIds). The file was made by running the Booklet plugin for Obsidian's own
// withPending and rowIds on each case, so it records what the plugin does; another reader copies it and runs the same cases against its own code.
// Run: node test/pendingvectors.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path"),P=require("./page.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const V=JSON.parse(fs.readFileSync(path.join(__dirname,"pending-vectors.json"),"utf8")),A=P.boot();
const J=x=>JSON.parse(JSON.stringify(x));
chk("the vectors file is the shape this test reads",Array.isArray(V.cases)&&V.cases.length>=20,String(V.cases&&V.cases.length));
for(const c of V.cases){
  const rows=J(c.rows),entries=J(c.entries),before=JSON.stringify(rows),p=A.withPending(rows,entries,c.block);
  const adding=[];const isKids=v=>Array.isArray(v)?(v.length&&v[0]&&typeof v[0]==="object"&&!Array.isArray(v[0])?v:null):(v&&typeof v==="object"?[v]:null);
  const walk=rs=>{for(const r of rs){if(p.adding.has(r)) adding.push(String(r.id));for(const v of Object.values(r)){const k=isKids(v);if(k) walk(k);}}};walk(p.rows);
  const ids=A.rowIds(J(c.rows),J(c.entries),c.block);
  const got={rows:J(p.rows),adding,removing:Object.fromEntries([...p.removing]),ids};
  chk(c.name,JSON.stringify(got)===JSON.stringify(c.expect),"\n    want "+JSON.stringify(c.expect)+"\n    got  "+JSON.stringify(got));
  chk(c.name+": the rows given are not changed",JSON.stringify(rows)===before);}
if(fails){console.log(fails+" pending-vector check(s) failed");process.exit(1);}
console.log("pending-vector checks passed ("+V.cases.length+" cases)");
