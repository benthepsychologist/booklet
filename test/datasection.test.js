// Format v0.10, data at the end of a file can belong to a module: `> [!data|module-id]`. A reference is looked up
// in the module's fence, then the module's own data section, then the shared data section, never in another module's.
// Add a module tags what it brings, and an update replaces exactly the module's fence and its data section.
// Invented content throughout.
// Run: node test/datasection.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const HEAD=`---\nbooklet: "0.10"\ntitle: Data sections\nlang: en\n---\n\n`;
const widget=(id,tag)=>`\`\`\`booklet widget\n{ "engine": "grid-select", "items": [{"id":"i-${tag}","label":"Item ${tag}"}] }\n\`\`\`\n^${id}`;
const rows=(id,v)=>`\`\`\`booklet data\n[{"name":"${v}","n":1}]\n\`\`\`\n^${id}`;
const modBody=(id,tag)=>`> [!module|${id}] Module ${id}\n\n> [!activity|act repeat] Act ${tag}\n\n> [!widget|w] Pick\n> ![[#^w]]\n\n> [!choice|pick menu:opts] Pick one\n\n> [!text|note long] Note.[^1]\n\n\`\`\`booklet query\nfrom: tbl\n\`\`\`\n\n> [!module|${id} end] End\n`;
const dataFor=(id,tag)=>`> [!data|${id}] Data for ${id}\n\n${widget("w",tag)}\n\n${rows("tbl",tag+"-row")}\n\n> [!menu|opts]\n- ${tag}-one\n- ${tag}-two\n\n[^1]: *Source ${tag}*, p. 1: "quote ${tag}"\n`;
const bare=id=>`> [!module|${id}] Module ${id}\n\n> [!activity|act repeat] Act\n\n> [!text|note long] Note\n\n> [!module|${id} end] End\n`;
const TWO=HEAD+modBody("mod-a","a")+"\n"+modBody("mod-b","b")+"\n"+dataFor("mod-a","a")+"\n"+dataFor("mod-b","b");
(async()=>{
 const A=P.boot();
 /* ---- reading ---- */
 {const R=A.parseFile(TWO);
  chk("two modules, each with its own ^w, ^tbl, menu and footnote 1 under its own data section: nothing refused, nothing reported",R.ok&&R.refused.length===0&&R.unread.length===0,JSON.stringify(R.unread));
  const ws=R.template.widgets;
  chk("each widget is that module's, as if it sat in the fence",ws.length===2&&ws.find(w=>w.module==="mod-a").items[0].id==="i-a"&&ws.find(w=>w.module==="mod-b").items[0].id==="i-b",JSON.stringify(ws));
  const act=id=>{const m=R.template.modules.find(x=>x.id===id);return m.mode;};
  chk("each module's menu question takes its own module's menu",act("mod-a").blocks.find(b=>b.id==="pick").options.join()==="a-one,a-two"&&act("mod-b").blocks.find(b=>b.id==="pick").options.join()==="b-one,b-two");
  chk("each module's query reads its own data block",act("mod-a").blocks.find(b=>b.type==="query").data.rows[0].name==="a-row"&&act("mod-b").blocks.find(b=>b.type==="query").data.rows[0].name==="b-row");
  chk("each module's footnote definition under its data section is that module's",R.template.modules.find(x=>x.id==="mod-a").citations.map(c=>c.quote).join()==="quote a"&&R.template.modules.find(x=>x.id==="mod-b").citations.map(c=>c.quote).join()==="quote b");
  A.loadText(TWO);
  chk("the page looks a widget up in its own module",A.widgetOf("w","mod-a").items[0].id==="i-a"&&A.widgetOf("w","mod-b").items[0].id==="i-b");}
 /* the order of lookup: fence, the module's data section, then the shared one */
 {const T=HEAD+`> [!module|m1] One\n\n> [!activity|a] A\n\n> [!widget|x] X\n> ![[#^in-fence]]\n\n> [!widget|y] Y\n> ![[#^in-data]]\n\n> [!widget|z] Z\n> ![[#^in-shared]]\n\n${widget("in-fence","fence")}\n\n> [!module|m1 end] End\n\n> [!data|m1] Data for One\n\n${widget("in-data","data")}\n\n> [!data] Data\n\n${widget("in-shared","shared")}\n\n${widget("in-data","shared-copy")}\n`;
  const R=A.parseFile(T),ws=R.template.widgets;
  chk("a module's fence, its data section and the shared section all resolve: no refusal",R.ok&&R.refused.length===0,JSON.stringify(R.refused));
  const pick=id=>{const w=A.widgetOf?null:null;return w;};
  A.loadText(T);
  chk("the fence's block, the module's data block and the shared block each come from their own place",A.widgetOf("in-fence","m1").items[0].id==="i-fence"&&A.widgetOf("in-data","m1").items[0].id==="i-data"&&A.widgetOf("in-shared","m1").items[0].id==="i-shared");
  chk("the module's own data section wins over the shared one with the same id",A.widgetOf("in-data","m1").items[0].id==="i-data"&&A.widgetOf("in-data","")!==null&&A.widgetOf("in-data","").items[0].id==="i-shared-copy");}
 {const T=HEAD+modBody("mod-a","a")+"\n"+modBody("mod-b","b").replace("> [!widget|w] Pick\n> ![[#^w]]\n","> [!widget|w] Pick\n> ![[#^only-a]]\n")+"\n"+dataFor("mod-a","a").replace("^w","^only-a")+"\n"+dataFor("mod-b","b").replace(widget("w","b"),"");
  const R=A.parseFile(T);A.loadText(T);
  chk("a module never reads another module's data section: a block only in a's is not found from b",A.widgetOf("only-a","mod-a")!==null&&A.widgetOf("only-a","mod-b")===null,JSON.stringify(R.template.widgets.map(w=>[w.id,w.module])));}
 /* a data line names a module the file has not opened; a module or activity line ends the section */
 {const R=A.parseFile(HEAD+bare("mod-a")+`\n> [!data|ghost] Data for ghost\n\n${rows("tbl","x")}\n`);
  chk("a data section naming a module the file has not opened is reported, and its blocks are shared",R.unread.length===1&&/“ghost”/.test(R.unread[0])&&R.ok,JSON.stringify(R.unread));}
 {const T=HEAD+`> [!module|mod-a] A\n\n> [!activity|a] A\n\n> [!module|mod-a end] End\n\n> [!data|mod-a] Data for A\n\n${rows("tbl","a")}\n\n> [!module|mod-b] B\n\n> [!activity|b] B\n\n\`\`\`booklet query\nfrom: tbl\n\`\`\`\n\n> [!module|mod-b end] End\n`;
  const R=A.parseFile(T);
  chk("a module line ends a data section: a module after it is read, and cannot see the data before it",R.template.modules.length===2&&R.unread.some(x=>/“tbl”/.test(x)||/names nothing|nothing/.test(x)),JSON.stringify(R.unread));}
 {const R=A.parseFile(HEAD+`> [!module|mod-a] A\n\n> [!activity|a] A\n\n> [!module|mod-a end] End\n\n> [!data|mod-a] Data for A\n\n${rows("tbl","a")}\n\n> [!data] Data\n\n${rows("shared","s")}\n\n> [!data|mod-a] Again\n\n${rows("more","m")}\n`);
  chk("a file may have several data sections, and the same module's twice",R.ok&&R.refused.length===0&&R.unread.length===0,JSON.stringify(R.unread));}
 {const R=A.parseFile(HEAD+`> [!module|mod-a] A\n\n> [!activity|a] A\n\n${widget("w","fence")}\n\n> [!module|mod-a end] End\n\n> [!data|mod-a] Data\n\n${widget("w","again")}\n`);
  chk("an id in a module's fence and again in its data section is one scope: refused as a twice-used id",!R.ok&&R.refused.some(x=>/used twice/.test(x)),JSON.stringify(R.refused));}
 /* ---- Add a module ---- */
 const one=(id,tag,data)=>HEAD+modBody(id,tag)+"\n"+data;
 {await A.createBooklet();
  const plain=`> [!data] Data\n\n${widget("w","a")}\n\n${rows("tbl","a-row")}\n\n> [!menu|opts]\n- a-one\n- a-two\n\n[^1]: *Source a*, p. 1: "quote a"\n`;
  const r=A.addModuleText(one("mod-a","a",plain)),out=A.toMarkdown();
  chk("a one-module file with its blocks under a plain data line: added",r.ok&&r.renamed.length===0,JSON.stringify(r));
  chk("they are written under the module's own data line, in the booklet",/> \[!data\|mod-a\] Data for Module mod-a\n\n```booklet widget/.test(out)&&!/^> \[!data\] /m.test(out),out);
  chk("the footnote and the menu came with them",out.includes('[^1]: *Source a*, p. 1: "quote a"')&&out.includes("> [!menu|opts]"));
  chk("the file reads back with nothing reported, and the module's widget, rows, menu and footnote are the module's",(()=>{const R=A.parseFile(out);return R.refused.length===0&&R.unread.length===0&&R.template.widgets[0].module==="mod-a"&&R.template.modules[0].citations.length===1;})());
  chk("on screen the module draws its own widget",A.widgetOf("w","mod-a").items[0].id==="i-a"&&A.BOOK.widgets[0].module==="mod-a");}
 {await A.createBooklet();
  const inFence=HEAD+`> [!module|mod-f] F\n\n> [!activity|act repeat] Act\n\n> [!widget|w] W\n> ![[#^w]]\n\n${widget("w","f")}\n\n> [!module|mod-f end] End\n`;
  A.addModuleText(inFence);
  chk("a module whose blocks are in its fence brings no data section",!/\[!data/.test(A.toMarkdown()));}
 /* a file with several modules: x's data goes to x, the plain section stays shared (and is added once) */
 {await A.createBooklet();
  const T=HEAD+modBody("mod-x","x")+"\n"+bare("mod-y")+"\n"+dataFor("mod-x","x")+"\n> [!data] Data\n\n"+rows("shared-tbl","shared")+"\n";
  const r=A.addModuleText(T),out=A.toMarkdown();
  chk("a two-module file is added: x's section is x's, y gets none, the plain section is shared",r.ok&&/> \[!data\|mod-x\] Data for Module mod-x/.test(out)&&!/\[!data\|mod-y\]/.test(out)&&/> \[!data\] Data\n\n```booklet data\n[^`]*```\n\^shared-tbl/.test(out),out);
  chk("and it reads back clean",(()=>{const R=A.parseFile(out);return R.refused.length===0;})(),A.parseFile(out).refused.join("|"));
  const again=A.addModuleText(T);
  chk("added again: the same file, the shared block still once",again.ok&&A.toMarkdown()===out&&(A.toMarkdown().match(/\^shared-tbl/g)||[]).length===1,A.toMarkdown().slice(-500));}
 /* three modules A, B, C: an update of B replaces exactly B's fence and B's data section */
 {await A.createBooklet();
  const mk=(id,tag,extra="")=>one(id,tag,dataFor(id,tag)+extra).replace(`title: Data sections`,`title: Module ${id}`);
  A.addModuleText(mk("mod-a","a"));A.addModuleText(mk("mod-b","b1"));A.addModuleText(mk("mod-c","c"));
  const lines=s=>s.split("\n"),sec=(s,id)=>{const i=s.indexOf("> [!data|"+id+"]");const j=s.indexOf("\n> [!data",i+5);return s.slice(i,j<0?s.length:j);};
  const fence=(s,id)=>s.slice(s.indexOf("> [!module|"+id+"]"),s.indexOf("> [!module|"+id+" end]")+("> [!module|"+id+" end]").length);
  const before=A.toMarkdown();
  const order=s=>[...s.matchAll(/^> \[!module\|([^\] ]+)\]/gm)].map(m=>m[1]).join()+" | "+[...s.matchAll(/^> \[!data\|([^\] ]+)\]/gm)].map(m=>m[1]).join();
  chk("three modules, each with its data section, in the order added",order(before)==="mod-a,mod-b,mod-c | mod-a,mod-b,mod-c",order(before));
  const r=A.addModuleText(mk("mod-b","b2").replace("> [!text|note long] Note.[^1]","> [!text|note long] Note, changed.[^1]"));
  const after=A.toMarkdown();
  chk("updating B: ok, and the order of modules and sections is as it was",r.ok&&order(after)==="mod-a,mod-b,mod-c | mod-a,mod-b,mod-c",order(after)+JSON.stringify(r));
  chk("B's fence and B's data section are the new ones",fence(after,"mod-b").includes("Note, changed.")&&sec(after,"mod-b").includes("b2-one")&&!after.includes("b1-one"));
  chk("A's and C's fences and data sections are byte for byte what they were",fence(after,"mod-a")===fence(before,"mod-a")&&fence(after,"mod-c")===fence(before,"mod-c")&&sec(after,"mod-a")===sec(before,"mod-a")&&sec(after,"mod-c")===sec(before,"mod-c"));
  chk("the file reads back clean, with each module's own widget",(()=>{const R=A.parseFile(after);return R.refused.length===0&&R.template.widgets.length===3;})());
  /* an update that brings no data drops the old section */
  const r2=A.addModuleText(HEAD.replace("Data sections","Module mod-b")+modBody("mod-b","b3").replace("> [!widget|w] Pick\n> ![[#^w]]\n","").replace("> [!choice|pick menu:opts] Pick one\n\n","").replace("```booklet query\nfrom: tbl\n```\n\n","").replace("Note.[^1]","Note."));
  const o3=A.toMarkdown();
  chk("an update with no data of its own removes the module's data section, and only that",r2.ok&&!/\[!data\|mod-b\]/.test(o3)&&/\[!data\|mod-a\]/.test(o3)&&/\[!data\|mod-c\]/.test(o3)&&A.parseFile(o3).refused.length===0,o3.slice(-400));
  chk("the screen shows what the file holds",A.BOOK.widgets.map(w=>w.module).sort().join()==="mod-a,mod-c");}
 /* rename on a clash, in a module's data section: the module prefix, as inside the fence */
 {await A.createBooklet();
  A.addModuleText(one("mod-a","a",dataFor("mod-a","a")));
  const r=A.addModuleText(one("mod-b","b",dataFor("mod-b","b")));
  const out=A.toMarkdown();
  chk("a block id and a footnote id under a module's data section that another module uses are renamed with the module prefix",r.ok&&r.renamed.map(x=>x.what+":"+x.from+">"+x.to).sort().join()==="block:tbl>mod-b-tbl,block:w>mod-b-w,footnote:1>mod-b-1",JSON.stringify(r.renamed));
  const b=out.slice(out.indexOf("> [!data|mod-b]"));
  chk("in the data section the `^id` lines and the footnote definition are renamed; the first module's are not",b.includes("\n^mod-b-w\n")&&b.includes("\n^mod-b-tbl\n")&&b.includes("[^mod-b-1]: *Source b*")&&out.slice(0,out.indexOf("> [!data|mod-b]")).includes("[^1]: *Source a*"),out);
  chk("and in the module's fence every reference follows (embed, footnote mark, query from)",out.includes("![[#^mod-b-w]]")&&out.includes("[^mod-b-1]")&&out.includes("from: mod-b-tbl"));
  const R=A.parseFile(out);
  chk("the file has no block id and no footnote id twice, and each module draws its own",R.refused.length===0&&A.widgetOf("mod-b-w","mod-b").items[0].id==="i-b"&&A.widgetOf("w","mod-a").items[0].id==="i-a");
  const f=require("path").join(require("os").tmpdir(),"ds-"+process.pid+".md");require("fs").writeFileSync(f,out);
  const lr=require("child_process").spawnSync("python3",[P.R+"/lint-booklet.py",f],{encoding:"utf8"});require("fs").unlinkSync(f);
  chk("and it lints with no error and no warning",lr.status===0&&/0 errors · 0 warnings/.test(lr.stdout),lr.stdout);}
 P.closePages();
 console.log(fails?"\n"+fails+" FAILURES":"\nall data-section checks passed");process.exit(fails?1:0);
})();
