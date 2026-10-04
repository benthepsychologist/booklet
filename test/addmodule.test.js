// Add a module never makes a file the renderer would refuse (0.8.1).
// Run: node test/addmodule.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const count=(s,sub)=>s.split(sub).length-1;
const mk=(mod,body)=>`---\nbooklet: 0.8\ntitle: T ${mod}\nlang: en\n---\n\n> [!module|${mod}] M ${mod}\n\n${body}\n\n> [!module|${mod} end] End\n`;
(async()=>{
 const A=P.boot();
 const fresh=async()=>{await A.createBooklet();};
 /* every file in test/fixtures and examples that holds a module this renderer will add on its own */
 const files=[];
 for(const d of ["test/fixtures","examples"]) for(const f of fs.readdirSync(P.R+"/"+d).sort()){
   if(!/\.md$/.test(f)) continue;
   const t=fs.readFileSync(P.R+"/"+d+"/"+f,"utf8");
   if(!/\[!module\|/.test(t)) continue;
   await fresh();if(A.moduleTextProblems(t).length===0) files.push({name:d+"/"+f,t});}
 chk("there are module files to pair",files.length>=10,String(files.length));
 let bad=[],refusedPairs=0,okPairs=0;
 /* Every ordered pair is 3,700 adds and takes minutes, so a normal run pairs each file with every
    seventh other one (a different set per file); ADDMODULE_FULL=1 runs them all. */
 const full=!!process.env.ADDMODULE_FULL;
 for(const [i,a] of files.entries()) for(const [j,b] of files.entries()){
   if(!full&&(i+j)%7!==0) continue;
   await fresh();
   const r1=A.addModuleText(a.t);
   if(!r1.ok){bad.push(a.name+": first add refused: "+r1.problems.join(" | "));continue;}
   const before=A.toMarkdown(),mods=A.allModules().map(m=>m.id).join();
   const r2=A.addModuleText(b.t);
   if(r2.ok){const out=A.toMarkdown(),R=A.parseFile(out);
     if(R.refused.length) bad.push(a.name+" + "+b.name+": written file refused: "+R.refused.join(" | "));
     else okPairs++;}
   else{
     if(!r2.problems.length||A.toMarkdown()!==before||A.allModules().map(m=>m.id).join()!==mods)
       bad.push(a.name+" + "+b.name+": refused without a message, or the booklet changed");
     else refusedPairs++;}}
 chk("every pair of module files: refused with a message and unchanged, or written clean ("+okPairs+" written, "+refusedPairs+" refused)",bad.length===0,bad.slice(0,3).join(" // "));

 /* the same module twice is an update: held once, reopens */
 const badUpd=[];
 for(const f of files){
   await fresh();A.addModuleText(f.t);const first=A.addModuleText(f.t);
   const out=A.toMarkdown(),R=A.parseFile(out);
   const id=(f.t.match(/\[!module\|([^\] ]+)\]/)||[])[1];
   if(!first.ok||R.refused.length||count(out,"[!module|"+id+"]")!==1||count(out,"[!module|"+id+" end]")!==1||R.template.modules.length<1)
     badUpd.push(f.name+": "+JSON.stringify(first.problems)+" "+R.refused.join(" | "));}
 chk("update: every module file added twice is held once and reopens ("+files.length+" files)",badUpd.length===0,badUpd.slice(0,3).join(" // "));

 /* an update brings its data blocks along: the new ones replace the old, none twice */
 {const withData=(v)=>`---\nbooklet: 0.8\ntitle: T\nlang: en\n---\n\n> [!module|upd] M\n\n> [!activity|upd-a repeat] A\n\n> [!text|note long] ${v}\n\n> [!widget|w] W\n> ![[#^upd-data]]\n\n> [!module|upd end] End\n\n\`\`\`booklet widget\n{ "engine": "grid-select", "note": "${v}" }\n\`\`\`\n^upd-data\n`;
  await fresh();A.addModuleText(withData("one"));const r=A.addModuleText(withData("two"));
  const out=A.toMarkdown();
  chk("update with an outside data block: ok, one module, one block, new content",r.ok&&count(out,"[!module|upd]")===1&&count(out,"\n^upd-data")===1&&out.includes('"note": "two"')&&!out.includes('"note": "one"')&&A.parseFile(out).refused.length===0,JSON.stringify(r.problems)+out.slice(-300));}

 /* a different module sharing an id is refused, names the id, changes nothing */
 const clash=async(name,mod2,body1,body2,id)=>{
   await fresh();const r1=A.addModuleText(mk("mod-a",body1));const before=A.toMarkdown();
   const r2=A.addModuleText(mk(mod2,body2));
   const msg=(r2.problems||[]).join(" ");
   chk(name+": refused, names “"+id+"”, says the booklet already uses it, adds nothing",r1.ok&&!r2.ok&&msg.includes("“"+id+"”")&&/already uses/.test(msg)&&A.toMarkdown()===before&&A.allModules().length===1,JSON.stringify(r2));};
 await clash("a shared question id","mod-b","> [!activity|act-a repeat] A\n\n> [!text|shared long] Q","> [!activity|act-b repeat] B\n\n> [!text|shared long] Q","shared");
 await clash("a shared activity id","mod-b","> [!activity|act-x repeat] A\n\n> [!text|n long] Q","> [!activity|act-x repeat] B\n\n> [!text|m long] Q","act-x");
 const widget=(wid,blk)=>`> [!activity|${wid}-act repeat] A\n\n> [!widget|${wid}-w] W\n> ![[#^${blk}]]\n\n\`\`\`booklet widget\n{ "engine": "grid-select" }\n\`\`\`\n^${blk}`;
 await clash("a shared data block id","mod-b",widget("a","blk"),widget("b","blk"),"blk");
 const dataB=(w,blk)=>`> [!activity|${w}-act repeat] A\n\n\`\`\`booklet data\n[{"title":"x"}]\n\`\`\`\n^${blk}`;
 await clash("a shared booklet data block id","mod-b",dataB("a","dat"),dataB("b","dat"),"dat");
 await clash("a shared menu id","mod-b","> [!activity|act-a repeat] A\n\n> [!menu|menu-same] Pick\n> - one\n> - two","> [!activity|act-b repeat] B\n\n> [!menu|menu-same] Pick\n> - one\n> - two","menu-same");
 {await fresh();A.lang="fr";A.addModuleText(mk("mod-a","> [!activity|act-a repeat] A\n\n> [!text|shared long] Q"));
  const r=A.addModuleText(mk("mod-b","> [!activity|act-b repeat] B\n\n> [!text|shared long] Q"));A.lang="en";
  chk("the message is in the booklet's language (fr)",!r.ok&&/identifiant « shared »/.test(r.problems.join(" ")),JSON.stringify(r));}
 A.lang="es";{await fresh();A.addModuleText(mk("mod-a","> [!activity|act-a repeat] A\n\n> [!text|shared long] Q"));
  const r=A.addModuleText(mk("mod-b","> [!activity|act-b repeat] B\n\n> [!text|shared long] Q"));A.lang="en";
  chk("the message is in Spanish (es)",!r.ok&&/identificador “shared”/.test(r.problems.join(" ")),JSON.stringify(r));}
 P.closePages();
 console.log(fails?"\n"+fails+" failed":"\nall passed");process.exit(fails?1:0);
})();
