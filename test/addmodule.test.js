// Add a module never makes a file the renderer would refuse (0.8.1).
// Run: node test/addmodule.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const count=(s,sub)=>s.split(sub).length-1;
const mk=(mod,body)=>`---\nbooklet: "0.10"\ntitle: T ${mod}\nlang: en\n---\n\n> [!module|${mod}] M ${mod}\n\n${body}\n\n> [!module|${mod} end] End\n`;
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
     const onScreen=A.allModules().map(m=>m.id+":"+(m.mode?[m.mode]:m.activities).map(x=>x.id).join("+")).join(),inFile=R.template.modules.map(m=>m.id+":"+(m.mode?[m.mode]:m.activities).map(x=>x.id).join("+")).join();
     if(R.refused.length) bad.push(a.name+" + "+b.name+": written file refused: "+R.refused.join(" | "));
     else if(onScreen!==inFile) bad.push(a.name+" + "+b.name+": the screen shows "+onScreen+" but the file holds "+inFile);
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
 {const withData=(v)=>`---\nbooklet: "0.10"\ntitle: T\nlang: en\n---\n\n> [!module|upd] M\n\n> [!activity|upd-a repeat] A\n\n> [!text|note long] ${v}\n\n> [!widget|w] W\n> ![[#^upd-data]]\n\n> [!module|upd end] End\n\n\`\`\`booklet widget\n{ "engine": "grid-select", "note": "${v}" }\n\`\`\`\n^upd-data\n`;
  await fresh();A.addModuleText(withData("one"));const r=A.addModuleText(withData("two"));
  const out=A.toMarkdown();
  chk("update with an outside data block: ok, one module, one block, new content",r.ok&&count(out,"[!module|upd]")===1&&count(out,"\n^upd-data")===1&&out.includes('"note": "two"')&&!out.includes('"note": "one"')&&A.parseFile(out).refused.length===0,JSON.stringify(r.problems)+out.slice(-300));}

 /* a data block a module puts in the booklet's data section, under an id the data section already uses, is
    refused: it names the id and changes nothing. Any other id two modules share is no clash (SPEC.md section 4). */
 const clash=async(name,body1,body2,id)=>{
   await fresh();const r1=A.addModuleText(mk("mod-a",body1));const before=A.toMarkdown();
   const r2=A.addModuleText(mk("mod-b",body2));
   const msg=(r2.problems||[]).join(" ");
   chk(name+": refused, names “"+id+"”, says the data section already has it, adds nothing",r1.ok&&!r2.ok&&msg.includes("“"+id+"”")&&/data section/.test(msg)&&A.toMarkdown()===before&&A.allModules().length===1,JSON.stringify(r2));};
 const outside=(w,blk)=>`> [!activity|${w}-act repeat] A\n\n> [!widget|${w}-w] W\n> ![[#^${blk}]]\n\n> [!module|mod-${w} end] End\n\n\`\`\`booklet widget\n{ "engine": "grid-select" }\n\`\`\`\n^${blk}`;
 const outsideModule=(mod,w,blk)=>`---\nbooklet: "0.10"\ntitle: T ${mod}\nlang: en\n---\n\n> [!module|${mod}] M ${mod}\n\n${outside(w,blk).replace(`mod-${w} end`,`${mod} end`)}\n`;
 {const name="a data block outside the fence, under an id another module's data section already has";
  await fresh();const r1=A.addModuleText(outsideModule("mod-a","a","blk"));
  const r2=A.addModuleText(outsideModule("mod-b","b","blk"));
  const out=A.toMarkdown();
  chk(name+": no clash (a module's data section is its own), the second's id is renamed with its module's name",r1.ok&&r2.ok&&r2.renamed.map(x=>x.from+">"+x.to).join()==="blk>mod-b-blk"&&A.allModules().length===2&&A.parseFile(out).refused.length===0,JSON.stringify([r1,r2]));
  chk("each module's block sits under that module's own data section",/> \[!data\|mod-a\] Data for M mod-a\n\n```booklet widget[^`]*```\n\^blk\n/.test(out)&&/> \[!data\|mod-b\] Data for M mod-b\n\n```booklet widget[^`]*```\n\^mod-b-blk\n/.test(out),out.slice(-500));}

 /* two modules sharing a question id, an activity id, a menu id, a block id and a footnote id are both added, and work apart */
 {await fresh();
  const body=(tag)=>`> [!menu|m1]\n- ${tag}-one\n- ${tag}-two\n\n> [!activity|act repeat] A ${tag}\n\n> [!text|shared long] Q ${tag}\n\n> [!choice|pick menu:m1] P\n\n> [!widget|w] W\n> ![[#^wd]]\n\nA claim.[^1]\n\n[^1]: *Source ${tag}*, p. 1: "quote ${tag}"\n\n\`\`\`booklet widget\n{ "engine": "grid-select", "items": [{"id":"i-${tag}","label":"Item ${tag}"}] }\n\`\`\`\n^wd`;
  const r1=A.addModuleText(mk("mod-a",body("a"))),r2=A.addModuleText(mk("mod-b",body("b")));
  chk("two modules sharing a question, activity, menu, widget block and footnote id both add",r1.ok&&r2.ok&&A.allModules().length===2,JSON.stringify([r1,r2]));
  const out=A.toMarkdown(),R=A.parseFile(out);
  chk("the file they make opens with nothing refused",R.refused.length===0&&R.template.modules.length===2,JSON.stringify(R.refused));
  const opts=m=>R.template.modules.find(x=>x.id===m).mode||R.template.modules.find(x=>x.id===m).activities[0];
  chk("each module's menu question takes its own module's menu",opts("mod-a").blocks.find(b=>b.id==="pick").options.join()==="a-one,a-two"&&opts("mod-b").blocks.find(b=>b.id==="pick").options.join()==="b-one,b-two");
  chk("each module's widget is its own",A.BOOK.widgets.length===2&&A.BOOK.widgets.filter(w=>w.module==="mod-a")[0].items[0].id==="i-a"&&A.BOOK.widgets.filter(w=>w.module==="mod-b")[0].items[0].id==="i-b");}


 /* ---- rename on a clash (SPEC.md section 10): a block id or footnote id another module or the data section already uses
    is written into the incoming module's text as <module-id>-<id>; nothing else is touched ---- */
 {const mod=(id,t,opts={})=>`---\nbooklet: "0.10"\ntitle: T ${id}\nlang: en\n---\n\n> [!module|${id}] M ${id}\n\n> [!activity|act repeat] Act ${t}\n\n> [!text|wd long] Question ${t}\n\n> [!widget|w] W\n> ![[#^wd]]\n\nSee the picker ![[#^wd]] and a link [[#^wd]], with the note.[^1] Code: \`![[#^wd]] and [^1]\` stays. A second note.[^only-${t}]\n\n\`\`\`text\nunchanged ![[#^wd]] [^1]\n\`\`\`\n\n\`\`\`booklet data\n[{"x":"${t}"}]\n\`\`\`\n^rows\n\n\`\`\`booklet query\nfrom: rows\n\`\`\`\n\n\`\`\`booklet widget\n{ "engine": "grid-select", "copy": {"h": "Heading ${t}"} }\n\`\`\`\n^wd\n${opts.extra||""}\n[^1]: *Source ${t}*, p. 1: "Quote ${t}" Verified 2026-01-01\n\n[^only-${t}]: *Only ${t}*, p. 2: "Own ${t}"\n\n> [!module|${id} end] End\n`;
  await fresh();
  const ra=A.addModuleText(mod("mod-a","a")),rb=A.addModuleText(mod("mod-b","b"));
  const out=A.toMarkdown(),body=out.slice(0,out.indexOf("%%")>0?out.indexOf("%%"):out.length);
  chk("a clashing block id and footnote id: both modules add, and the second says what it renamed",ra.ok&&rb.ok&&ra.renamed.length===0&&rb.renamed.map(x=>x.what+":"+x.from+">"+x.to).sort().join()==="block:rows>mod-b-rows,block:wd>mod-b-wd,footnote:1>mod-b-1",JSON.stringify([ra,rb]));
  const modB=body.slice(body.indexOf("> [!module|mod-b]"));
  chk("the first module is left exactly as written",body.slice(body.indexOf("> [!module|mod-a]"),body.indexOf("> [!module|mod-b]")).includes("\n^wd\n")&&body.includes("[^1]: *Source a*"));
  chk("the `^id` line, an embed, a link and a query's `from:` follow in the second",modB.includes("\n^mod-b-wd\n")&&modB.includes("![[#^mod-b-wd]] and a link [[#^mod-b-wd]]")&&modB.includes("> ![[#^mod-b-wd]]")&&modB.includes("\n^mod-b-rows\n")&&modB.includes("from: mod-b-rows"),modB);
  chk("a footnote's marks and its definition follow",modB.includes("with the note.[^mod-b-1]")&&modB.includes("[^mod-b-1]: *Source b*")&&!/\[\^1\]:/.test(modB));
  chk("fenced code and inline code are untouched",modB.includes("```text\nunchanged ![[#^wd]] [^1]\n```")&&modB.includes("`![[#^wd]] and [^1]`"),modB);
  chk("an id that clashes with nothing is left as written, and so are question, activity and widget-line ids",modB.includes("[^only-b]")&&modB.includes("[^only-b]: *Only b*")&&modB.includes("[!text|wd long]")&&modB.includes("[!activity|act repeat]")&&modB.includes("[!widget|w]"));
  const ids=[...body.matchAll(/^\^([A-Za-z0-9-]+)$/gm)].map(m=>m[1]),notes=[...body.matchAll(/^\[\^([^\]]+)\]:/gm)].map(m=>m[1]);
  chk("the file the booklet writes has no block id and no footnote id twice",new Set(ids).size===ids.length&&new Set(notes).size===notes.length,ids.join()+" | "+notes.join());
  const f=require("path").join(require("os").tmpdir(),"scope-rename-"+process.pid+".md");fs.writeFileSync(f,out);
  const lr=require("child_process").spawnSync("python3",[P.R+"/lint-booklet.py",f],{encoding:"utf8"});fs.unlinkSync(f);
  chk("and it lints with no error and no warning",lr.status===0&&/0 errors · 0 warnings/.test(lr.stdout),lr.stdout);
  const R=A.parseFile(out);
  chk("it reads back whole, each module with its own widget, data and note",R.ok&&R.refused.length===0&&A.BOOK.widgets.filter(w=>w.module==="mod-b").map(w=>w.id).join()==="mod-b-wd"&&A.BOOK.modules[1].citations.map(c=>c.id).sort().join()==="mod-b-1,only-b"&&A.BOOK.modules[0].citations.map(c=>c.id).sort().join()==="1,only-a",JSON.stringify(A.BOOK.modules.map(m=>m.citations)));
  const before=A.toMarkdown(),rb2=A.addModuleText(mod("mod-b","b"));
  chk("an update of the second module renames the same way, and the file is the same",rb2.ok&&A.toMarkdown()===before&&rb2.renamed.length===3,JSON.stringify(rb2)+A.toMarkdown().slice(-200));
  const ra2=A.addModuleText(mod("mod-a","a"));
  {const o2=A.toMarkdown(),b2=[...o2.matchAll(/^\^([A-Za-z0-9-]+)$/gm)].map(m=>m[1]);
  chk("an update of the first leaves it as written, and the second's names stand (the updated module goes last, as an update always has)",ra2.ok&&ra2.renamed.length===0&&b2.sort().join()==="mod-b-rows,mod-b-wd,rows,wd"&&o2.includes("[^mod-b-1]: *Source b*")&&o2.includes("[^1]: *Source a*")&&A.parseFile(o2).refused.length===0,JSON.stringify(b2));}
  /* a prefixed id that is itself taken gets -2 */
  await fresh();A.addModuleText(mod("mod-a","a",{extra:"\n```booklet widget\n{ \"engine\": \"grid-select\" }\n```\n^mod-b-wd\n"}));
  const r3=A.addModuleText(mod("mod-b","b"));
  chk("a prefixed id that is taken too gets -2",r3.ok&&r3.renamed.some(x=>x.from==="wd"&&x.to==="mod-b-wd-2")&&A.toMarkdown().includes("\n^mod-b-wd-2\n")&&A.parseFile(A.toMarkdown()).refused.length===0,JSON.stringify(r3));
  /* a block of the data section counts as taken */
  await fresh();A.addModuleText(`---\nbooklet: "0.10"\ntitle: T\nlang: en\n---\n\n> [!module|mod-d] D\n\n> [!activity|d repeat] D\n\n> [!module|mod-d end] End\n\n\`\`\`booklet data\n[{"x":1}]\n\`\`\`\n^wd\n`);
  const r4=A.addModuleText(mod("mod-b","b"));
  chk("a block id the data section already uses is renamed in the incoming module",r4.ok&&r4.renamed.some(x=>x.from==="wd"&&x.to==="mod-b-wd")&&A.parseFile(A.toMarkdown()).refused.length===0,JSON.stringify(r4));
  /* nothing renamed when nothing clashes: the module text is added as written */
  await fresh();const r5=A.addModuleText(mod("mod-a","a"));
  chk("with nothing to clash with, the module is added as written",r5.ok&&r5.renamed.length===0&&A.toMarkdown().includes("\n^wd\n")&&A.toMarkdown().includes("[^1]: *Source a*"));}


 /* what is said about a rename: one short line, at most three listed, the rest counted, in each language */
 {const T=l=>A.STRINGS[l].booklet.renamed,mk2=n=>Array.from({length:n},(_,i)=>({from:"a"+i,to:"m-a"+i}));
  chk("one rename is said in plain words (en)",T("en")(mk2(1))==="One id was renamed so it does not clash: a0 is now m-a0.",T("en")(mk2(1)));
  chk("three are all listed; five list three and count the rest (en)",T("en")(mk2(3))==="3 ids were renamed so they do not clash: a0 is now m-a0, a1 is now m-a1, a2 is now m-a2."&&/a2 is now m-a2 and 2 more\.$/.test(T("en")(mk2(5))),T("en")(mk2(5)));
  chk("and in French, Spanish and Argentine Spanish",/^Un identifiant a été renommé .* a0 devient m-a0\.$/.test(T("fr")(mk2(1)))&&/et 2 de plus\.$/.test(T("fr")(mk2(5)))&&/^Se renombró un identificador .* a0 ahora es m-a0\.$/.test(T("es")(mk2(1)))&&/y 2 más\.$/.test(T("es")(mk2(5)))&&typeof T("es-AR")==="function");}

 /* a file that holds several modules adds every one, in file order; what is on screen is what the file holds */
 {const t=fs.readFileSync(P.R+"/test/fixtures/lint-modules-share-ids.md","utf8");
  await fresh();const r=A.addModuleText(t);const out=A.toMarkdown(),R=A.parseFile(out);
  chk("a file with two modules adds both, in file order",r.ok&&r.added.join()==="mod-1,mod-2"&&A.allModules().map(m=>m.id).join()==="mod-1,mod-2"&&R.template.modules.map(m=>m.id).join()==="mod-1,mod-2",JSON.stringify(r));
  chk("the file written holds both modules' lines, parses with nothing refused, and the second's clashing ids were renamed",R.refused.length===0&&out.includes("> [!module|mod-2 end]")&&out.includes("\n^mod-2-picker-data\n")&&out.includes("[^mod-2-1]:")&&r.renamed.length===2,JSON.stringify(r.renamed));
  const before=out,r2=A.addModuleText(t);
  chk("added again, both are replaced where they sit and the file is the same",r2.ok&&A.toMarkdown()===before,A.toMarkdown().slice(0,200));
  /* blocks outside every fence are added once */
  const withData=t+"\n```booklet data\n[{\"x\":1}]\n```\n^shared\n";
  await fresh();A.addModuleText(withData);const o2=A.toMarkdown();
  chk("a block outside every module fence is added once, to the data section",(o2.match(/\n\^shared\n/g)||[]).length===1&&o2.indexOf("> [!data] Data")>o2.indexOf("> [!module|mod-2 end]")&&A.parseFile(o2).refused.length===0);}
 /* an update replaces a module where it sits */
 {const m3=(id,w)=>`---\nbooklet: "0.10"\ntitle: T\nlang: en\n---\n\n> [!module|${id}] M ${id}\n\n> [!activity|${id}-act repeat] A\n\n> [!text|q long] ${w}\n\n> [!module|${id} end] End\n`;
  await fresh();["m-a","m-b","m-c"].forEach(id=>A.addModuleText(m3(id,"one")));
  const order=()=>[...A.toMarkdown().matchAll(/^> \[!module\|([^\] ]+)\]/gm)].map(m=>m[1]).join()+" | "+A.BOOK.raw.source.split("\n").filter(l=>/^> \[!module\|[^\] ]+\] /.test(l)).map(l=>l.match(/\|([^\] ]+)\]/)[1]).join()+" | "+A.allModules().map(m=>m.id).join();
  const r=A.addModuleText(m3("m-b","two"));
  chk("updating the middle of three modules leaves the order as it was, in the source, the written file and the design",r.ok&&order()==="m-a,m-b,m-c | m-a,m-b,m-c | m-a,m-b,m-c"&&A.toMarkdown().includes("] two")&&!A.toMarkdown().includes("[!text|q long] one\n\n> [!module|m-b end]"),order());}

 /* a booklet made here has a title, so the linter has nothing to say about the renderer's own output */
 {await fresh();A.addModuleText(mk("mod-a","> [!activity|a repeat] A\n\n> [!text|q long] Q"));
  const out=A.toMarkdown(),f=require("path").join(require("os").tmpdir(),"scope-new-"+process.pid+".md");fs.writeFileSync(f,out);
  const lr=require("child_process").spawnSync("python3",[P.R+"/lint-booklet.py",f],{encoding:"utf8"});fs.unlinkSync(f);
  chk("a new booklet with one module added is written with a title and lints with zero warnings",/^title: "Untitled booklet"$/m.test(out)&&lr.status===0&&/0 errors · 0 warnings/.test(lr.stdout),out.slice(0,120)+lr.stdout);}
 P.closePages();
 console.log(fails?"\n"+fails+" failed":"\nall passed");process.exit(fails?1:0);
})();
