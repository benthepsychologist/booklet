// booklet-registry's build (build-registry.js) parses every module through
// this repo's own parser by requiring test/harness.js and calling parseFile,
// so there is one parser, not two. This fails if the harness stops exposing a
// working parseFile, which is how the registry's build broke silently once.
// Run: node test/registry-contract.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const A=require("./harness.js");
let fails=0;const chk=(name,ok,extra)=>{if(ok) console.log("  ok    "+name);else{fails++;console.log("  FAIL  "+name+(extra?" — "+extra:""));}};
chk("the harness exports parseFile",typeof A.parseFile==="function");
const text=fs.readFileSync(path.join(__dirname,"fixtures","module-daily-journal.md"),"utf8");
const R=typeof A.parseFile==="function"?A.parseFile(text):{};
chk("parseFile reads a registry-shaped module as one clean module",R.ok===true&&R.template&&(R.template.modules||[]).length===1,JSON.stringify(R.unread||null));
console.log(fails?"\n"+fails+" FAILURES":"\nregistry contract checks passed");
process.exit(fails?1:0);
