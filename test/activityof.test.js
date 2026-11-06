// Renderer 0.18.2: activityOf(id), the lookup every click and redraw makes, finds an activity by searching each module's activities in
// module order and returning the first match, with no copy of the booklet's activities and no quadratic de-duplication. This checks
// that the first match wins when two modules hold the same id, that an address held by no module gives an empty entry, that the
// activity returned is the booklet's own, that a booklet read from a file is found by its address, and that a lookup in a booklet of
// thousands of activities is not slow (a bound a hundred times looser than a linear search needs, which the old copy-and-dedupe
// lookup missed by a wide margin at this size).
// Run: node test/activityof.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const A=P.boot();
const act=(id,title)=>({id,kind:"entry",title,pages:[{id:"p1",blocks:[]}]});

/* a booklet read from a file: found by its address, module by module */
const file=`---\nbooklet: "0.18"\ntitle: T\nlang: en\n---\n\n> [!module|m1] One\n\n> [!activity|a] First\n\n> [!text|q] Q\n\n> [!activity|b] Second\n\n> [!text|r] R\n\n> [!module|m1 end] End\n\n> [!module|m2] Two\n\n> [!activity|a] Other\n\n> [!text|q] Q\n\n> [!module|m2 end] End\n`;
A.loadText(file);
chk("the booklet reads",A.allModules().map(m=>m.id).join()==="m1,m2",A.allModules().map(m=>m.id).join());
chk("m1/a is the first module's activity",A.activityOf("m1/a").title==="First",JSON.stringify(A.activityOf("m1/a").title));
chk("m2/a is the second module's activity, though both are called a",A.activityOf("m2/a").title==="Other",JSON.stringify(A.activityOf("m2/a").title));
chk("m1/b is found after m1/a in the same module",A.activityOf("m1/b").title==="Second");
chk("it is the booklet's own activity, not a copy",A.activityOf("m1/a")===A.allModules()[0].activities[0]&&A.activityOf("m1/a")===A.activityOf("m1/a"));

/* two modules that hold the same address: the first in module order wins */
{const mods=A.allModules(),save=mods.slice();
 const x1=act("same","from the first"),x2=act("same","from the second"),y=act("only-second","y");
 mods.length=0;mods.push({id:"one",activities:[act("other","o"),x1]},{id:"two",activities:[x2,y]});
 chk("the first module's activity wins when two modules hold the same id",A.activityOf("same")===x1&&A.activityOf("same").title==="from the first");
 chk("an id only the second module holds is found there",A.activityOf("only-second")===y);
 chk("a module with no activities is passed over",(mods.unshift({id:"empty",activities:[]}),A.activityOf("same")===x1));
 const miss=A.activityOf("nowhere/none");
 chk("an id no module holds gives an empty entry: that id, kind entry, one empty page",miss.id==="nowhere/none"&&miss.kind==="entry"&&JSON.stringify(miss.pages)==='[{"id":"p1","blocks":[]}]',JSON.stringify(miss));
 chk("the empty entry is a new object each time",A.activityOf("nowhere/none")!==miss);
 mods.length=0;save.forEach(m=>mods.push(m));}

/* with no booklet open there are no modules, and the answer is the empty entry */
{A.closeBooklet&&A.closeBooklet();const e=A.activityOf("x");chk("with nothing open, the empty entry",e.id==="x"&&e.kind==="entry"&&e.pages.length===1,JSON.stringify(e));}

/* a lookup in a big booklet is not slow: 3000 activities in 10 modules, the last one looked for 300 times */
{A.loadText(file);const mods=A.allModules();mods.length=0;
 for(let m=0;m<10;m++){const acts=[];for(let i=0;i<300;i++) acts.push(act("m"+m+"/a"+i,"t"));mods.push({id:"m"+m,activities:acts});}
 const last=mods[9].activities[299];let hit=0;const t0=process.hrtime.bigint();
 for(let i=0;i<300;i++) if(A.activityOf("m9/a299")===last) hit++;
 for(let i=0;i<300;i++) A.activityOf("m9/missing");
 const ms=Number(process.hrtime.bigint()-t0)/1e6;
 chk("600 lookups in a booklet of 3,000 activities (the last, and a missing one) take under half a second",hit===300&&ms<500,ms.toFixed(1)+" ms");
 console.log("        ("+ms.toFixed(1)+" ms for 600 lookups)");}

console.log(fails?"\n"+fails+" FAILURES":"\nactivityof checks passed");process.exit(fails?1:0);
