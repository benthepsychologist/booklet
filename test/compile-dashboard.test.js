// The compiler's data files and nested rows (compile/data.js, compile/views.js; format 0.19, SPEC.md sections 6 and 7).
//   - a `booklet data <file.json> [key.path]` fence is read at build time, by the rules images are read by: a checked name,
//     a real path inside the booklet's folder, at most LINK_BYTES, JSON; what it finds is a list of rows or an object with rows;
//     the fence's own `fields` give the labels; a file that cannot be read gives a quiet box and a line in the report
//   - the page of a booklet whose rows come from a file is the page of the same booklet with the rows written in its fence
//   - a table, a list and cards draw rows that open as native disclosures (no script): the rest of the row, then its children
//     in groups headed by the field's label; a row with nothing more to show is a plain row; long text keeps its text, as text
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
chk("no problem is reported for the data files, and the three named in the fixture that can be read are read",!r.rep.problems.length,r.rep.problems.join("; "));
chk("a table whose rows hold rows is drawn nested: its headings on one grid and a list of rows",html.includes('class="bk-table bk-dv-ttable"')&&html.includes('class="bk-dv-thead"'));
chk("a row with something more to show is a native disclosure that opens with no script",count(html,/<details>\s*<summary class="bk-dv-row bk-dv-trow" data-bk-row>/g)===4);
chk("a row with nothing more to show is a plain row",/<li class="bk-dv-row" data-bk-row><span class="bk-dv-b" data-bk-col="stage">/.test(html)&&/<li class="bk-dv-row" data-bk-row><span class="bk-dv-t" data-bk-col="title">Label the drawers/.test(html));
chk("the rest of a row is drawn under its labels: the declared label, not the key",html.includes("<dt>What it is</dt>")&&html.includes("<dt>Kind</dt>")&&!html.includes("<dt>about</dt>"));
chk("children are in groups headed by the field's label",html.includes('role="heading" aria-level="4">Jobs<')&&html.includes('role="heading" aria-level="4">Steps<'));
chk("a group says how many rows it holds",/>Jobs<span class="bk-count">3 rows<\/span>/.test(html));
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
w("book/rows.json",{a:{b:[{id:"x",t:1}]},c:{fields:{t:"Title"},rows:[{t:"one"}]},d:{nothing:1},list:[{t:1},{t:2}]});
w("book/sub/more.json",[{t:"s"}]);
const one=(info,body,dir)=>{const x=run(["```booklet data "+info,...(body?[body]:[]),"```","^b"],dir);return x.files[0];};
chk("a list of rows at a key path",(f=>f.ok&&f.rows===1)(one("rows.json a.b")));
chk("a key path may name one level or none",one("rows.json list").rows===2&&one("sub/more.json").rows===1);
chk("an object with rows and fields: the file's fields are kept, and the fence's own fields win",(()=>{
  const x=run(["```booklet data rows.json c",'{ "fields": { "t": "Name" } }',"```","^b"]);return /"fields":\{"t":"Name"\}/.test(x.lines.join("\n"));})());
chk("the fence is written out as a one-line fence of the same marks",(()=>{const x=run(["~~~~booklet data rows.json list","~~~~","^b"]);return x.lines[2]==="~~~~ booklet data"&&x.lines[3]==='{"rows":[{"t":1},{"t":2}]}'&&x.lines[4]==="~~~~"&&x.lines[5]==="^b";})());
chk("a fence that holds more than `fields` is not read",!one("rows.json list",'{ "rows": [] }').ok&&/more than/.test(one("rows.json list",'{ "rows": [] }').why));
chk("nothing at the key path, an empty key, and what is neither rows nor an object with rows",/nothing at/.test(one("rows.json a.zzz").why)&&/empty key/.test(one("rows.json a..b").why)&&/neither a list/.test(one("rows.json c.fields").why));
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
  const t="---\nbooklet: \"0.18\"\n---\n\n# T\n\n> [!module|m] M\n\n> [!activity|a] A\n\n%%\n> [!records]\n\n```booklet data rows.json list\n```\n%%\n";
  const res=build({text:t,name:"t",dir:path.join(tmp,"book")});return !res.rep.ok||!/\"t\":1/.test(page(res));})());
fs.rmSync(tmp,{recursive:true,force:true});

if(fails){console.log("\n"+fails+" FAILURES");process.exit(1);}
console.log("\ncompile dashboard passed");
