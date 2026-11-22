// The compiler's data files and nested rows (compile/data.js, compile/views.js; format 0.20, SPEC.md sections 6 and 7).
//   - a `booklet data <file.json> [key.path]` fence is read at build time, by the rules images are read by: a checked name,
//     a real path inside the booklet's folder, at most LINK_BYTES, JSON; what it finds is a list of rows or an object with rows;
//     the fence's own `fields` give the labels; a file that cannot be read gives a quiet box and a line in the report
//   - the page of a booklet whose rows come from a file is the page of the same booklet with the rows written in its fence
//   - a table, a list and cards draw rows that open as native disclosures (no script): the rest of the row, then its children
//     in groups headed by the field's label; a row with nothing more to show is a plain row; long text keeps its text, as text
//   - the rows a file hands over are held to the renderer's own rules for a data block's rows and labels (readData, readFields):
//     a block whose file holds malformed rows or labels, or rows too deeply nested to be written, gets the quiet box and a report
//     line, never a silent gap and never a refused booklet; a key path walks the members of objects and never steps into a list
//   - a booklet given as text with no folder reads no data file, and its description is never the quiet box's sentence
//   - a booklet that names no file is compiled as before (test/compile-golden.test.js holds that byte for byte)
// Run: node test/compile-dashboard.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path"),os=require("os");
const ROOT=path.join(__dirname,".."),C=require("../compile/compile.js"),E=require("../compile/engine.js"),DATA=require("../compile/data.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const X=E.load();
const FIX=path.join(__dirname,"compile-assets","compile-dashboard.booklet.md");
const page=r=>String(r.files.get("compile-dashboard/index.html")||[...r.files.values()][0]);
const build=(input)=>C.compile([input],{form:"standalone",engine:X,browser:false}).results[0];
const count=(s,re)=>(s.match(re)||[]).length;

/* ---- the fixture compiles, and what it draws ---- */
const r=build({file:FIX});
const html=page(r);
chk("the fixture compiles",r.rep.ok,(r.rep.refused||[]).join("; "));
chk("the only problem reported is the renderer's own, for the one name it never reads; the data files that can be read are read",r.rep.problems.length===1&&/\^odd names the file “..\/compile-dashboard.json”.*never read/.test(r.rep.problems[0]),r.rep.problems.join("; "));
chk("a table whose rows hold rows is drawn nested: its headings on one grid and a list of rows",html.includes('class="bk-table bk-dv-ttable"')&&html.includes('class="bk-dv-thead"'));
chk("a row with something more to show is a native disclosure that opens with no script",count(html,/<details>\s*<summary class="bk-dv-row bk-dv-trow" data-bk-row>/g)===4);
chk("a row with nothing more to show is a plain row",/<li class="bk-dv-row" data-bk-row><span class="bk-dv-b" data-bk-col="stage">/.test(html)&&/<li class="bk-dv-row" data-bk-row><span class="bk-dv-t" data-bk-col="title">Label the drawers/.test(html));
chk("the rest of a row is drawn under its labels: the declared label, not the key",html.includes("<dt>What it is</dt>")&&html.includes("<dt>Kind</dt>")&&!html.includes("<dt>about</dt>"));
chk("children are in groups headed by the field's label",html.includes('role="heading" aria-level="4">Jobs<')&&html.includes('role="heading" aria-level="4">Steps<'));
chk("a group of children is headed by the field's label alone: no count of rows (as the renderer draws it)",html.includes('role="heading" aria-level="4">Jobs</div>')&&!/aria-level="4">[^<]*<span/.test(html)&&!/\d+ rows/.test(html.replace(/<script[\s\S]*?<\/script>/g,"")));
chk("nested rows are indented by depth (the first cell of a table row, and the open part under it)",html.includes("bk-dv-c bk-dv-d1 bk-dv-first")&&html.includes("bk-dv-c bk-dv-d2 bk-dv-first")&&html.includes("bk-dv-open bk-dv-d1"));
chk("long text keeps its line breaks and its paragraphs, as text",html.includes("Eight apple trees and two pear trees.\n\nThe pears were planted")&&html.includes("Cut out crossing branches.\nOpen the middle of each tree."));
chk("text is text: markup in a value is escaped, never written",html.includes("&lt;b&gt;Garlic&lt;/b&gt;")&&!html.includes("<b>Garlic"));
chk("a card with children is a card that opens, its children cards inside it",html.includes('<details class="bk-dv-card bk-dv-ncard">')&&html.includes('<summary class="bk-dv-csum" data-bk-row>'));
chk("a nested list with only children is the 0.18 shape: the summary, then the list",/<\/summary>\n\s*<ul class="bk-dv-list">\n\s*<li class="bk-dv-row" data-bk-row><span class="bk-dv-b" data-bk-col="gate">/.test(html));
chk("rows written flat with a parent in the fence still nest",html.includes("Sort the packets")&&/Order seed<\/span><\/summary>\n\s*<ul class="bk-dv-list">/.test(html));
chk("no row's summary is a <tr>, and no disclosure holds a script, an inline handler or an inline style",!/<script/.test(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,"").replace(/<script src=[^>]*><\/script>/,""))&&!/ on[a-z]+=|style=/.test(html));
chk("a file that is not there: the quiet box names the file, and the rest of the page is drawn",html.includes('The data file “compile-missing.json” could not be read.')&&html.includes('data-bk-view="bars"'));
chk("a name the renderer does not read is not read: the same box",html.includes("The data file “../compile-dashboard.json” could not be read."));
chk("the report says why for each, once",r.rep.marked.filter(m=>m.kind==="data").length===2&&r.rep.marked.some(m=>/no such file beside the booklet/.test(m.why))&&r.rep.marked.some(m=>/the name is not one the renderer reads/.test(m.why)));
chk("the empty: line of a query over a block that could not be read does not replace the box",!html.includes("Nothing to show here."));

/* ---- the same booklet with the rows in its fences draws the same page ---- */
{
  const text=fs.readFileSync(FIX,"utf8"),json=JSON.parse(fs.readFileSync(path.join(path.dirname(FIX),"compile-dashboard.json"),"utf8"));
  const fence=(name,key,body,id)=>"```booklet data "+name+(key?" "+key:"")+"\n"+(body||"")+"```\n^"+id+"\n";
  const inl=(rows,fields,id)=>"```booklet data\n"+JSON.stringify({...(fields?{fields}:{}),rows})+"\n```\n^"+id+"\n";
  let t=text;
  t=t.replace(fence("compile-dashboard.json","plots","","plots"),inl(json.plots.rows,json.plots.fields,"plots"));
  t=t.replace(fence("compile-dashboard.json","inbox.requests",'{ "fields": { "title": "Request", "headline": "In short", "gate": "Gate", "asked": "Asked" } }\n',"requests"),
    inl(json.inbox.requests,{title:"Request",headline:"In short",gate:"Gate",asked:"Asked"},"requests"));
  t=t.replace(fence("compile-dashboard.json","harvest","","harvest"),inl(json.harvest,null,"harvest")).replace(fence("compile-dashboard.json","harvest","","harvest-again"),inl(json.harvest,null,"harvest-again"));
  chk("(set up) every file-backed fence the fixture can read was written out",!/booklet data compile-dashboard\.json/.test(t));
  const r2=build({text:t,name:"compile-dashboard",dir:path.dirname(FIX)});
  const strip=h=>h.replace(/<!-- booklet compile[^\n]*\n/,"");
  chk("its page is the page of the booklet with the rows in the fences",r2.rep.ok&&strip(page(r2))===strip(html));
}

/* ---- the reading rules ---- */
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"bk-data-"));
const w=(rel,body)=>{const p=path.join(tmp,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof body==="string"?body:JSON.stringify(body));return p;};
const lines=a=>a.join("\n").split("\n");
const run=(fenceLines,dir)=>DATA.inline(X.R,lines(["# T","",...fenceLines]),dir||path.join(tmp,"book"));
fs.mkdirSync(path.join(tmp,"book"),{recursive:true});
w("book/rows.json",{a:{b:[{id:"x",t:1}]},c:{fields:{t:"Title"},rows:[{t:"one"}]},d:{nothing:1},list:[{t:1},{t:2}],
  arr:[[{t:"idx0"}],[{t:"idx1"}]],obj:{inner:[{t:"deep"}]},
  notrows:[1,2,3],mixed:[{t:1,kids:[{t:2},5]}],mixedtop:[{t:1},5],labels5:{rows:[{t:1}],fields:{t:5}},labelsList:{rows:[{t:1}],fields:[]},
  labelObj:{rows:[{t:1}],fields:{t:{label:"Name",edit:"text"}}},labelBad:{rows:[{t:1}],fields:{t:{label:5}}},kids:[{t:"p",kids:[{t:"c",kids:[{t:"g"}]}]}]});
w("book/sub/more.json",[{t:"s"}]);
const one=(info,body,dir)=>{const x=run(["```booklet data "+info,...(body?[body]:[]),"```","^b"],dir);return x.files[0];};
chk("a list of rows at a key path",(f=>f.ok&&f.rows===1)(one("rows.json a.b")));
chk("a key path may name one level or none",one("rows.json list").rows===2&&one("sub/more.json").rows===1);
chk("an object with rows and fields: the file's fields are kept, and the fence's own fields win",(()=>{
  const x=run(["```booklet data rows.json c",'{ "fields": { "t": "Name" } }',"```","^b"]);return /"fields":\{"t":"Name"\}/.test(x.lines.join("\n"));})());
chk("the fence is written out as a one-line fence of the same marks",(()=>{const x=run(["~~~~booklet data rows.json list","~~~~","^b"]);return x.lines[2]==="~~~~ booklet data"&&x.lines[3]==='{"rows":[{"t":1},{"t":2}]}'&&x.lines[4]==="~~~~"&&x.lines[5]==="^b";})());
chk("a fence that holds a key besides `fields` is read, as the renderer reads it: the key is ignored",(f=>f.ok&&f.rows===2&&!f.rowsKey)(one("rows.json list",'{ "extra": 1, "fields": { "t": "Name" } }'))
  &&/"fields":\{"t":"Name"\}/.test(run(["```booklet data rows.json list",'{ "extra": 1, "fields": { "t": "Name" } }',"```","^b"]).lines.join("\n"))&&!/extra/.test(run(["```booklet data rows.json list",'{ "extra": 1 }',"```","^b"]).lines.join("\n")));
chk("…and `rows` in it are said and not read: the file's rows are written out, and the record says so",(f=>f.ok&&f.rows===2&&f.rowsKey===true&&f.at===2)(one("rows.json list",'{ "rows": [{"t":"fence row"}] }'))&&!/fence row/.test(run(["```booklet data rows.json list",'{ "rows": [{"t":"fence row"}] }',"```","^b"]).lines.join("\n")));
chk("a fence body that is not JSON, or not an object, is not read: its fence stays as written",(f=>!f.ok&&/not JSON/.test(f.why))(one("rows.json list","{nope"))&&(f=>!f.ok&&/not a JSON object/.test(f.why))(one("rows.json list","[1]")));
chk("nothing at the key path, a key that is not letters, digits, _ and - (an empty one too), and what is neither rows nor an object with rows",/nothing at/.test(one("rows.json a.zzz").why)&&/not keys of letters/.test(one("rows.json a..b").why)&&/not keys of letters/.test(one("rows.json a.b!c").why)&&!one("rows.json a.b!c").ok&&/holds no list of rows/.test(one("rows.json c.fields").why));
chk("a key path walks the members of objects and never steps into a list (the renderer's rule): a number names no item",!one("rows.json arr.1").ok&&/nothing at/.test(one("rows.json arr.1").why)&&!one("rows.json arr.0").ok&&/nothing at/.test(one("rows.json arr.0").why)&&one("rows.json obj.inner").ok);
chk("…and the whole file as a list of lists is not rows",!one("rows.json arr").ok&&/row that is not an object/.test(one("rows.json arr").why));
chk("a list that is not rows is not handed over: values only, or a list that mixes values and rows, at the top or in a row",
  [["notrows",/row that is not an object/],["mixedtop",/row that is not an object/],["mixed",/mixes values and rows/]].every(([k,re])=>{const f=one("rows.json "+k);return !f.ok&&re.test(f.why);}));
chk("labels that are not text or an object with a text label are not handed over, from the file or from the fence",
  ["labels5","labelsList","labelBad"].every(k=>{const f=one("rows.json "+k);return !f.ok&&/fields/.test(f.why);})
  &&(f=>!f.ok&&/^the fence has `fields`/.test(f.why))(one("rows.json list",'{ "fields": { "t": 5 } }'))
  &&!one("rows.json list",'{ "fields": [] }').ok);
chk("…and a block that is not handed over keeps its fence as written (the parse reads a block that names a file, which draws the quiet box where it stands), never left out",(()=>{
  const x=run(["```booklet data rows.json notrows","```","^b"]);return x.lines.join("\n")==="# T\n\n```booklet data rows.json notrows\n```\n^b"&&x.files.length===1&&!x.files[0].ok&&!!x.files[0].why;})());
chk("labels as an object with a label, and rows that hold rows several levels down, are handed over",one("rows.json labelObj").ok&&one("rows.json kids").ok);
chk("a key path never reads an inherited key",/nothing at/.test(one("rows.json constructor").why)&&/nothing at/.test(one("rows.json __proto__").why));
chk("names the renderer does not read: .., a leading /, a dot part, no .json, a space, 201 characters, a backslash",["../rows.json","/rows.json",".hid.json","sub/.x.json","rows.txt","rows json","x".repeat(196)+".json","a\\b.json","sub//more.json","rows.JSON"].every(n=>!DATA.fileName(n)));
chk("…and 200 characters is the longest one",!!DATA.fileName("x".repeat(195)+".json")&&!DATA.fileName("x".repeat(196)+".json"));
chk("a missing file, a file that is not JSON, a folder",/no such file/.test(one("none.json").why)&&(w("book/bad.json","{nope"),/not JSON/.test(one("bad.json").why))&&(fs.mkdirSync(path.join(tmp,"book","dir.json"),{recursive:true}),/not a file/.test(one("dir.json").why)));
chk("a link out of the booklet's folder is not followed",(w("outside.json",[{t:"secret"}]),fs.symlinkSync(path.join(tmp,"outside.json"),path.join(tmp,"book","link.json")),/outside the booklet/.test(one("link.json").why)));
chk("a link that stays inside the folder is",(fs.symlinkSync(path.join(tmp,"book","rows.json"),path.join(tmp,"book","in.json")),one("in.json list").ok));
chk("a file over the renderer's cap is not read",(()=>{const big=path.join(tmp,"book","big.json");fs.writeFileSync(big,"[");fs.truncateSync(big,X.R.LINK_BYTES+1);return /larger than/.test(one("big.json").why);})());
chk("a byte order mark does not stop a file being read",(w("book/bom.json","﻿"+JSON.stringify([{t:1}])),one("bom.json").ok));
chk("a file named by two fences is read once",(()=>{const x=run(["```booklet data rows.json list","```","^p","","```booklet data rows.json a.b","```","^q"]);return x.files.length===2&&x.files.every(f=>f.ok);})());
chk("a fence that never closes, an ordinary fence and a fence of another kind are left as they are",(()=>{
  const src=["```js","booklet data rows.json","```","","```booklet data","{\"rows\":[]}","```","^z","","```booklet query rows.json","```","","```booklet data rows.json list"];
  const x=DATA.inline(X.R,src,path.join(tmp,"book"));return x.files.length===0&&x.lines===src;})());
chk("a booklet with no data file is given back as it is (the same lines)",(()=>{const src=["# T","","```booklet data","{\"rows\":[]}","```","^z"];return DATA.inline(X.R,src,tmp).lines===src;})());
chk("a rows file is not read through the records: a fence in the records region is never rewritten",(()=>{
  const t="---\nbooklet: \"0.21\"\n---\n\n# T\n\n> [!module|m] M\n\n> [!activity|a] A\n\n%%\n> [!records]\n\n```booklet data rows.json list\n```\n%%\n";
  const res=build({text:t,name:"t",dir:path.join(tmp,"book")});return !res.rep.ok||!/\"t\":1/.test(page(res));})());
/* ---- rows nested too deeply to be written give the block's quiet box, never a refused booklet ---- */
{
  const deep=n=>'{"rows":'+'[{"t":"x","kids":'.repeat(n)+'[]'+'}]'.repeat(n)+'}';
  const book=(f)=>"---\nbooklet: \"0.21\"\nlang: en\nid: t\n---\n\n# T\n\nIt opens with a sentence of its own.\n\n```booklet data "+f+"\n```\n^d\n\n```booklet query\nfrom: d\n```\n";
  for(const n of [300,1500,3000,100000]){
    w("book/deep"+n+".json",deep(n));
    const res=build({text:book("deep"+n+".json"),name:"t",dir:path.join(tmp,"book")});
    const h=page(res);
    const drawn=n<=1500;
    chk("rows "+n+" levels of rows deep: the booklet is built, "+(drawn?"and the block is drawn":"and the block gets the quiet box and a report line"),
      res.rep.ok&&(drawn?!h.includes("could not be read")&&res.rep.marked.filter(m=>m.kind==="data").length===0
        :h.includes("could not be read")&&res.rep.marked.some(m=>m.kind==="data"&&/(nested too deeply|not JSON)/.test(m.why))),
      res.rep.ok?(res.rep.marked.map(m=>m.why).join("|")):(res.rep.refused||[]).join("; "));}
}

/* ---- a booklet given as text with no folder reads no data file; its description is not the quiet box's sentence ---- */
{
  w("book/there.json",[{t:"here"}]);
  const bk=(para,file)=>"---\nbooklet: \"0.21\"\nlang: en\nid: t\n---\n\n# T\n\n"+(para?para+"\n\n":"")+"```booklet data "+(file||"there.json")+"\n```\n^d\n\n```booklet query\nfrom: d\n```\n";
  const was=process.cwd();let res,res2,res3,res4;
  try{process.chdir(path.join(tmp,"book"));   /* the process's own folder holds the file: it must not be read */
    res=build({text:bk("A sentence."),name:"t"});res2=build({text:bk("","nothere.json"),name:"t",dir:path.join(tmp,"book")});
    res3=build({text:bk("A sentence."),name:"t",dir:path.join(tmp,"book")});res4=build({text:bk(""),name:"t",dir:path.join(tmp,"book")});}
  finally{process.chdir(was);}
  chk("text with no folder given: the file in the process's own folder is not read; the quiet box, and the report names why",res.rep.ok&&page(res).includes("The data file “there.json” could not be read.")&&!page(res).includes("here</")&&res.rep.marked.some(m=>m.kind==="data"&&/no folder was given/.test(m.why)),res.rep.marked.map(m=>m.why).join("|"));
  chk("…and with a folder given, the same text reads it",res3.rep.ok&&!page(res3).includes("could not be read")&&page(res3).includes("here"));
  chk("DATA.inline with no folder (null) reads nothing; it never falls back to the process's folder",(()=>{const prev=process.cwd();try{process.chdir(path.join(tmp,"book"));
    const x=DATA.inline(X.R,lines(["# T","","```booklet data there.json","```","^b"]),null);return !x.files[0].ok&&/no folder was given/.test(x.files[0].why)&&x.lines.join("\n")==="# T\n\n```booklet data there.json\n```\n^b";}finally{process.chdir(prev);}})());
  chk("a file given with its own path has a folder (its directory), as before",build({file:FIX}).rep.ok&&!page(build({file:FIX})).includes("data file “compile-dashboard.json”"));
  const descr=h=>(/<meta name="description" content="([^"]*)">/.exec(h)||[])[1];
  chk("a booklet whose first paragraph is its own keeps it as the description, quiet box or not",descr(page(res))==="A sentence."&&descr(page(res3))==="A sentence.");
  chk("a booklet with no first paragraph does not take the quiet box's sentence as its description or its lede (the report says there is none)",
    page(res2).includes("The data file “nothere.json” could not be read.")&&!/could not be read/.test(res2.rep.description)&&res2.rep.description===""&&!/could not be read/.test(descr(page(res2))||"")&&!/bk-lede/.test(page(res2).replace(/<style[\s\S]*?<\/style>/g,"")));
  chk("…and with the file read, no first paragraph means none, as for any booklet",res4.rep.ok&&res4.rep.description==="");
}
/* ---- a data block is read in its own module; a fence's extra keys are the renderer's business, not a reason to blank it ---- */
{
  w("book/good.json",{rows:[{title:"Good row"}]});
  const mod=(id,file,fence)=>"> [!module|"+id+"] Module "+id.toUpperCase()+"\n\n> [!activity|"+id+"a] Activity "+id.toUpperCase()+"\n\n```booklet query\nfrom: rows\nas: table\n```\n\n```booklet data "+file+" rows\n"+(fence||"")+"```\n^rows\n\n> [!module|"+id+" end]\n\n";
  const head="---\nbooklet: \"0.21\"\nlang: en\nid: t\ntitle: T\n---\n\n";
  const res=build({text:head+mod("ma","good.json")+mod("mb","missing.json"),name:"t",dir:path.join(tmp,"book")});
  const pa=String(res.files.get("t/maa/index.html")||""),pb=String(res.files.get("t/mba/index.html")||"");
  chk("(set up) a booklet of two modules that name the same block id compiles to a page for each",res.rep.ok&&!!pa&&!!pb,[...res.files.keys()].join(","));
  chk("module A, whose file is there, draws its rows although module B's block of the same id has no file",pa.includes("Good row")&&!pa.includes("could not be read"));
  chk("module B draws the quiet box, and the report names that one block once",pb.includes("The data file “missing.json” could not be read.")&&!pb.includes("Good row")&&res.rep.marked.filter(m=>m.kind==="data").length===1&&/missing\.json/.test(res.rep.marked.find(m=>m.kind==="data").what));
  const rev=build({text:head+mod("ma","missing.json")+mod("mb","good.json"),name:"t",dir:path.join(tmp,"book")});
  chk("…whichever module the failed one is in",String(rev.files.get("t/maa/index.html")).includes("could not be read")&&String(rev.files.get("t/mba/index.html")).includes("Good row")&&!String(rev.files.get("t/mba/index.html")).includes("could not be read"));
  const ex=build({text:head+mod("ma","good.json",'{"fields":{"title":"Name"},"extra":1}\n'),name:"t",dir:path.join(tmp,"book")});
  const px=String(ex.files.get("t/maa/index.html")||[...ex.files.values()][0]);
  chk("a fence with a key besides `fields` draws the file's rows under its labels, and says nothing (as the renderer)",ex.rep.ok&&px.includes("Good row")&&px.includes("Name")&&!px.includes("could not be read")&&ex.rep.problems.length===0,ex.rep.problems.join("; "));
  const rw=build({text:head+mod("ma","good.json",'{"rows":[{"title":"fence row"}]}\n'),name:"t",dir:path.join(tmp,"book")});
  const pr=String(rw.files.get("t/maa/index.html")||[...rw.files.values()][0]);
  chk("a fence with `rows` draws the file's rows, not the fence's, and the renderer's own notice is in the report with the fence's line",rw.rep.ok&&pr.includes("Good row")&&!pr.includes("fence row")&&rw.rep.problems.length===1&&/line 17: the data block \^rows names a file.*its rows were not read/.test(rw.rep.problems[0]),rw.rep.problems.join("; "));
}
fs.rmSync(tmp,{recursive:true,force:true});

if(fails){console.log("\n"+fails+" FAILURES");process.exit(1);}
console.log("\ncompile dashboard passed");
