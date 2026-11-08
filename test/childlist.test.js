// Which of a parent's lists takes a new child row (SPEC.md section 5, "Adding a row", "Where it goes"; docs/hosting.md): prefer the list that has rows.
//  1. A short reference chooser, written from the rule's three steps, runs the cases below (the same cases any host copies to test its own).
//  2. The spec, the hosting guide and CHANGES.md state the rule, and none still says an empty list is always a candidate.
// Run: node test/childlist.test.js   (nothing to install.)
const fs=require("fs"),path=require("path");
const R=path.join(__dirname,"..");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const isObj=v=>!!v&&typeof v==="object"&&!Array.isArray(v);
// the parent's fields whose value is a list whose items are all objects (an empty list too), with rows first
function chooseList(parent){
  const lists=Object.entries(parent).filter(([,v])=>Array.isArray(v)&&v.every(isObj));
  const full=lists.filter(([,v])=>v.length>0),empty=lists.filter(([,v])=>v.length===0);
  if(full.length===1) return {key:full[0][0]};
  if(full.length===0&&empty.length===1) return {key:empty[0][0]};
  return {refuse:"Cannot tell where the new row goes under this one."};}
const CASES=[
 ["one list with rows",{id:"p",jobs:[{id:"j"}]},"jobs"],
 ["an empty list beside it is ignored",{id:"p",jobs:[{id:"j"}],tags:[]},"jobs"],
 ["the empty list may come first",{id:"p",tags:[],jobs:[{id:"j"}]},"jobs"],
 ["a list of plain values beside it is no candidate",{id:"p",jobs:[{id:"j"}],labels:["a","b"]},"jobs"],
 ["the first child of an empty list",{id:"p",jobs:[]},"jobs"],
 ["an empty list beside a list of plain values",{id:"p",jobs:[],labels:["a"]},"jobs"],
 ["two lists with rows",{id:"p",jobs:[{id:"j"}],notes:[{id:"n"}]},null],
 ["two lists with rows and an empty one",{id:"p",jobs:[{id:"j"}],notes:[{id:"n"}],tags:[]},null],
 ["no list with rows and two empty lists",{id:"p",jobs:[],tags:[]},null],
 ["no list at all",{id:"p",title:"x"},null],
 ["a child held as one object",{id:"p",job:{id:"j"}},null],
 ["a list that mixes rows and plain values is no candidate",{id:"p",jobs:[{id:"j"},"x"]},null]];
for(const [name,parent,want] of CASES){const got=chooseList(parent);
  chk(`${name}: ${want?"`"+want+"` takes it":"refused"}`,want?got.key===want:!!got.refuse,JSON.stringify(got));}
const spec=fs.readFileSync(path.join(R,"SPEC.md"),"utf8"),host=fs.readFileSync(path.join(R,"docs/hosting.md"),"utf8"),chg=fs.readFileSync(path.join(R,"CHANGES.md"),"utf8");
const says=(t,rx)=>rx.test(t);
for(const [what,t] of [["SPEC.md",spec],["docs/hosting.md",host]]){
  chk(`${what} says that a list with rows is preferred and an empty list beside it is ignored`,says(t,/exactly one of them has at least one row[^.]*empty lists beside it are ignored/));
  chk(`${what} says an empty list takes the child only when none has rows and exactly one is empty`,says(t,/none has a row and exactly one list is empty/));
  chk(`${what} gives the cases: jobs with tags, and two empty lists refusing`,says(t,/`"jobs": \[\.\.\.\]` with `"tags": \[\]`/)&&says(t,/`"jobs": \[\]` and `"tags": \[\]` refuses/));
  chk(`${what} no longer says an empty list is always a candidate`,!says(t,/an empty list is a candidate\./));}
chk("CHANGES.md says a list with rows is preferred",says(chg,/the list that has rows is preferred/));
console.log(fails?`\n${fails} child list check(s) FAILED`:"\nchild list checks passed");
process.exit(fails?1:0);
