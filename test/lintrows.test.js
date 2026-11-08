// The linter's rules for the text of format 0.20 that lets a reader add a row and remove one (SPEC.md section 5, "Adding a row" and
// "Removing a row"; section 6, the `add` and `delete` query keys; section 7, the data block's `idFormat` and `idPattern`; section 8, the
// entries `$add` and `$delete`). Each case is a small file made here with ONE slip, linted, and the finding is checked by its kind
// (error or warning), its line and its words; the clean files must stay clean, so a new check cannot buy its catch with a false alarm.
// The examples in the spec and in examples/ must lint (test/lint.test.js and test/skill.test.js read them). Everything here is made
// up: a garden and an orchard.
// Run: node test/lintrows.test.js   (node and python3; nothing to install.)  LINT_BOOKLET=<path> tries another linter.
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const LINT=process.env.LINT_BOOKLET||path.join(R,"lint-booklet.py");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"lintrows-"));let k=0;
const lint=(text,files)=>{const dir=path.join(tmp,"c"+(++k));fs.mkdirSync(dir);
  for(const [name,body] of Object.entries(files||{})) fs.writeFileSync(path.join(dir,name),typeof body==="string"?body:JSON.stringify(body));
  const f=path.join(dir,"f.md");fs.writeFileSync(f,text);
  const r=spawnSync("python3",[LINT,f],{encoding:"utf8"}),lines=r.stdout.split("\n");
  return {status:r.status,out:r.stdout,text,errors:lines.filter(l=>l.startsWith("ERROR")),warns:lines.filter(l=>l.startsWith("warn"))};};
const FM='---\nbooklet: "0.19"\ntitle: Lint fixture\nlang: en\n---\n\n';
const ACT=(body,head="> [!activity|desk repeat] Desk\n\n")=>FM+head+body;
// the line a needle first stands on in the file, so a case says where the finding is without counting
const at=(r,needle)=>r.text.split("\n").findIndex(l=>l.includes(needle))+1;
const one=(what,r,kind,line,rx)=>{const got=kind==="ERROR"?r.errors:r.warns;
  chk(`${what}: exactly one finding, ${kind==="ERROR"?"an error":"a warning"}`,got.length===1&&r.errors.length+r.warns.length===1,r.out);
  chk(`${what}: ${line?"it names line "+line+" and ":"it "}says the fix`,(line?new RegExp(": line "+line+": ").test(got[0]||""):true)&&rx.test(got[0]||""),got[0]);
  chk(`${what}: ${kind==="ERROR"?"the file fails":"the build does not fail"}`,(r.status===1)===(kind==="ERROR"),String(r.status));};
const clean=(what,r)=>chk(what,r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);
const FIELDS={title:{label:"Name",edit:"text"},stage:{label:"Stage",edit:"choice",options:["planning","growing"]}};
const ROWS=[{id:"p1",title:"Orchard",stage:"growing",count:3,jobs:[{id:"j1",title:"Prune",stage:"planning"}]},{id:"p2",title:"Beds",stage:"planning",count:5}];
const DATA=(extra={},fields=FIELDS)=>"```booklet data\n"+JSON.stringify({fields,...extra,rows:ROWS})+"\n```\n^plots\n";
const Q=(lines)=>"```booklet query\nfrom: plots\n"+lines+"\n```\n\n";

// ---- section 6: the query keys `add` and `delete`
clean("`add`, written bare, on a table in a repeat activity lints clean",lint(ACT(Q("as: table\nadd")+DATA())));
clean("`delete`, written bare, lints clean",lint(ACT(Q("as: table\ndelete")+DATA())));
clean("`add:` with nothing after it is the same as a bare `add`",lint(ACT(Q("as: list\nadd:\ndelete:")+DATA())));
clean("`add` and `delete` on cards, with the other keys, lint clean",lint(ACT(Q("as: cards\nlabel: title\nfields: stage\nadd\ndelete")+DATA())));
clean("`add` with a bare `readonly` lints clean (the lock is the reader's, not the file's)",lint(ACT(Q("as: table\nreadonly\nadd\ndelete")+DATA())));
{const r=lint(ACT(Q("as: table\nadd: yes")+DATA()));
 one("`add` with a value",r,"ERROR",at(r,"add: yes"),/the query's `add` is written bare \(`add` alone on its line\), and not `add: yes`/);}
{const r=lint(ACT(Q("as: table\ndelete: all")+DATA()));
 one("`delete` with a value",r,"ERROR",at(r,"delete: all"),/the query's `delete` is written bare \(`delete` alone on its line\), and not `delete: all`/);}
for(const v of ["tiles","bars","line"]){
  const r=lint(ACT(Q("as: "+v+"\nvalue: count\nadd")+DATA()));
  one(`\`add\` on ${v}`,r,"warn",at(r,"```booklet query"),new RegExp("the query's `as: "+v+"` does not draw `add`"));}
{const r=lint(ACT(Q("as: tiles\nvalue: count\ndelete")+DATA()));
 one("`delete` on tiles",r,"warn",at(r,"```booklet query"),/does not draw `delete`/);}
{const r=lint(ACT(Q("as: table\nadd")+DATA({},{title:"Name"}),"> [!activity|desk] Desk\n\n"));
 one("`add` in an activity that keeps no entries",r,"warn",at(r,"```booklet query"),/the query's `add` is not drawn: this activity keeps no entries \(it is not `repeat`\) to keep an added row in/);}
{const r=lint(ACT(Q("as: table\ndelete")+DATA({},{title:"Name"}),"> [!activity|desk repeat daily] Desk\n\n"));
 one("`delete` in a `repeat daily` activity",r,"warn",at(r,"```booklet query"),/the query's `delete` is not drawn: .*`repeat daily`/);}
clean("a bare `readonly` silences the warning for an activity that keeps nothing: the lock says it is not offered",lint(ACT(Q("as: table\nreadonly\nadd\ndelete")+DATA({},{title:"Name"}),"> [!activity|desk] Desk\n\n")));
{const r=lint(ACT("```booklet query\nfrom: desk\nadd\n```\n\n> [!text|note] A note\n\n"+DATA()));
 one("`add` over kept entries",r,"warn",at(r,"```booklet query"),/the query's `add` does nothing here: it adds a row to a data block, and `from: desk` is kept entries/);}

// ---- section 7: the data block's `idFormat`
const FMT=(f,extra,fields)=>ACT(Q("as: table\nadd")+DATA({idFormat:f,...(extra||{})},fields));
for(const f of ["ID-{field:title}-{uuid}-{time}","{n}","{n:3}","j-{n:4}","{parent}-{n}","{date}-{epoch}","job {{literal}} {uuid}","plain","{field:title}","{n:1}{field:stage}","{n:9}"])
  clean(`the id format ${JSON.stringify(f)} lints clean`,lint(FMT(f)));
for(const [what,f,rx] of [
  ["an unknown part","a-{colour}",/the id format .* has a part `\{colour\}` it does not know/],
  ["an unclosed brace","a-{n",/the id format .* has a `\{` with no `\}` after it/],
  ["a brace that closes nothing","a-n}",/the id format .* has a `\}` that closes nothing \(write `\}\}` for a literal brace\)/],
  ["an empty format","",/the id format is empty/],
  ["a width of 0","a-{n:0}",/has `\{n:0\}`, but the width of `\{n:W\}` is a whole number from 1 to 9/],
  ["a width of 10","a-{n:10}",/has `\{n:10\}`, but the width of `\{n:W\}` is a whole number from 1 to 9/],
  ["a width that is not a number","a-{n:x}",/has `\{n:x\}`, but the width of `\{n:W\}` is a whole number from 1 to 9/],
  ["a width with nothing after the colon","a-{n:}",/has `\{n:\}`, but the width of `\{n:W\}` is a whole number from 1 to 9/],
  ["a field part naming no field","a-{field:}",/has `\{field:\}`, which names no field/],
  ["an argument on a part that takes none","a-{time:3}",/has a part `\{time:3\}` it does not know/],
  ["two number parts","{n}-{n:3}",/has more than one number part, `\{n\}` or `\{n:W\}`; a format counts with one/],
  ["two plain number parts","{n}/{n}",/has more than one number part/]]){
  const r=lint(FMT(f));one(`an id format with ${what}`,r,"ERROR",at(r,"```booklet data"),rx);}
{const r=lint(FMT(5));one("an id format that is not a string",r,"ERROR",at(r,"```booklet data"),/`idFormat` is a string of literal text and parts in braces/);}
{const r=lint(FMT("j-{field:nope}"));one("a field part naming a field the block does not declare",r,"warn",at(r,"```booklet data"),/the id format .* uses `\{field:nope\}`, and the block has no field `nope`/);}
clean("a field part may name a field of the rows that `fields` does not declare",lint(FMT("j-{field:note}",{},{title:"Name"}).replace('"stage":"growing"','"note":"x","stage":"growing"')));

// ---- section 7: `idPattern`
clean("an `idPattern` with no `idFormat` lints clean",lint(ACT(Q("as: table\nadd")+DATA({idPattern:"^[a-z0-9-]+$"}))));
clean("a pattern that uses a named group, as JavaScript writes it, lints clean",lint(ACT(Q("as: table\nadd")+DATA({idPattern:"^(?<kind>[a-z])-\\d+$"}))));
{const r=lint(ACT(Q("as: table\nadd")+DATA({idPattern:"^[a-z"})));one("an `idPattern` that is not a regular expression",r,"ERROR",at(r,"```booklet data"),/the `idPattern` .* is not a regular expression/);}
{const r=lint(ACT(Q("as: table\nadd")+DATA({idPattern:7})));one("an `idPattern` that is not a string",r,"ERROR",at(r,"```booklet data"),/`idPattern` is a string, a regular expression/);}
{const r=lint(ACT(Q("as: table\nadd")+DATA({idFormat:"{n}",idPattern:"^[0-9]+$"})));one("an `idPattern` beside an `idFormat`",r,"warn",at(r,"```booklet data"),/`idPattern` is not used when an `idFormat` is declared/);}

// ---- section 7: the same two keys in a file's own object, and in the fence of a block that names a file
{const FILE={"dash.json":{plots:{fields:FIELDS,idFormat:"{n}",rows:ROWS}}};
 const named=(fence)=>ACT(Q("as: table\nadd")+"```booklet data dash.json plots\n"+fence+"\n```\n^plots\n");
 clean("an `idFormat` in the file's object lints clean",lint(named(""),FILE));
 {const r=lint(named(""),{"dash.json":{plots:{rows:ROWS,idFormat:"a-{colour}"}}});one("a bad `idFormat` in the file's object",r,"ERROR",at(r,"```booklet data"),/the id format .* has a part `\{colour\}` it does not know/);}
 {const r=lint(named('{ "idFormat": "a-{n:0}" }'),FILE);one("a bad `idFormat` in the fence of a block that names a file",r,"ERROR",at(r,"```booklet data"),/`\{n:0\}`/);}
 clean("the fence's `idFormat` wins over the file's: a good fence format hides a bad file format",lint(named('{ "idFormat": "{uuid}" }'),{"dash.json":{plots:{rows:ROWS,idFormat:"a-{colour}"}}}));
 {const r=lint(named('{ "idFormat": "{uuid}", "idPattern": "^a$" }'),FILE);one("an `idPattern` in the fence beside an `idFormat` in the fence",r,"warn",at(r,"```booklet data"),/`idPattern` is not used when an `idFormat` is declared/);}
 const listed=(fence)=>ACT(Q("as: table\nadd")+"```booklet data dash.json\n"+fence+"\n```\n^plots\n");
 clean("a file whose value is a plain list holds the keys only in the fence",lint(listed('{ "idFormat": "{uuid}" }'),{"dash.json":ROWS}));
 {const r=lint(listed('{ "idPattern": "(" }'),{"dash.json":ROWS});one("an `idPattern` in the fence over a file that is a plain list",r,"ERROR",at(r,"```booklet data"),/is not a regular expression/);}}

// ---- section 8: the entries `$add` and `$delete`
const REC=(items)=>"\n%%\n> [!records] App record — do not edit below this line\n\n```booklet entries desk\n"+JSON.stringify({items})+"\n```\n%%\n";
const WITH=(items)=>ACT(Q("as: table\nadd\ndelete")+DATA())+REC(items);
const TS="2026-11-08T10:42:00Z";
const ADD={pick:"j-weed-20261108104200",under:"p1",row:{title:"Weed the beds",stage:"planning"}};
const DEL={pick:"j1",was:{id:"j1",title:"Prune",stage:"planning"}};
clean("an `$add` entry lints clean",lint(WITH([{$add:[ADD],ts:TS}])));
clean("an `$add` for a top row (no `under`) with a numeric id lints clean",lint(WITH([{$add:[{pick:7,row:{title:"Shed"}}],ts:TS}])));
clean("an `$add` whose `under` is a number lints clean",lint(WITH([{$add:[{pick:"a",under:3,row:{}}],ts:TS}])));
clean("a `$delete` entry lints clean",lint(WITH([{$delete:[DEL],ts:TS}])));
clean("an `$add` and a `$delete` among ordinary entries lint clean",lint(WITH([{title:[{pick:"p1",a:"x",was:"Orchard"}],ts:"2026-11-08T10:41:00Z"},{$add:[ADD],ts:TS},{$delete:[DEL],ts:"2026-11-08T10:43:10Z"}])));
for(const [what,e,rx] of [
  ["an `$add` that is not a list",{$add:ADD,ts:TS},/an entry's `\$add` must hold a list with one pair/],
  ["an `$add` list with two pairs",{$add:[ADD,ADD],ts:TS},/an entry keeps one `\$add` pair, and this one holds 2/],
  ["an empty `$add` list",{$add:[],ts:TS},/an entry keeps one `\$add` pair, and this one holds 0/],
  ["an `$add` pair that is not an object",{$add:["j"],ts:TS},/the `\$add` pair must be an object/],
  ["an `$add` pair with no `pick`",{$add:[{row:{}}],ts:TS},/the `\$add` pair has no `pick`, the new row's id/],
  ["an `$add` pick that is empty",{$add:[{pick:"",row:{}}],ts:TS},/the `\$add` pair's `pick` must be the new row's id, a string or a number, and not empty/],
  ["an `$add` pick that is a list",{$add:[{pick:["a"],row:{}}],ts:TS},/the `\$add` pair's `pick` must be the new row's id, a string or a number/],
  ["an `$add` whose `under` is an object",{$add:[{pick:"a",under:{},row:{}}],ts:TS},/the `\$add` pair's `under` must be the parent row's id, a string or a number/],
  ["an `$add` with no `row`",{$add:[{pick:"a"}],ts:TS},/the `\$add` pair has no `row`, the values of the fields the form asked for/],
  ["an `$add` whose `row` is a list",{$add:[{pick:"a",row:[]}],ts:TS},/the `\$add` pair's `row` must be an object/],
  ["an `$add` whose `row` holds the id",{$add:[{pick:"a",row:{id:"a"}}],ts:TS},/the `\$add` pair's `row` must not hold the `id`; the `pick` is the id/],
  ["a `$delete` with no `was`",{$delete:[{pick:"j1"}],ts:TS},/the `\$delete` pair has no `was`, the whole row as it was when the reader pressed Remove/],
  ["a `$delete` whose `was` is a string",{$delete:[{pick:"j1",was:"row"}],ts:TS},/the `\$delete` pair's `was` must be an object/],
  ["a `$delete` with no `pick`",{$delete:[{was:{}}],ts:TS},/the `\$delete` pair has no `pick`, the removed row's id/],
  ["an entry that holds both acts",{$add:[ADD],$delete:[DEL],ts:TS},/an entry keeps one act, `\$add` or `\$delete`, and this one holds both/]]){
  const r=lint(WITH([e]));one(`an entry with ${what}`,r,"ERROR",at(r,"```booklet entries"),rx);}
{const r=lint(ACT(Q("as: table")+DATA())+"\n%%\n> [!records] App record — do not edit below this line\n\n```booklet draft desk\n"+JSON.stringify({$add:[ADD]})+"\n```\n%%\n");
 one("an `$add` in a draft",r,"ERROR",at(r,"```booklet draft"),/`\$add` is kept only in an entry of a `booklet entries` block, and not in a draft/);}
{const r=lint(ACT(Q("as: table")+DATA())+"\n%%\n> [!records] App record — do not edit below this line\n\n```booklet answers\n"+JSON.stringify({$delete:[DEL]})+"\n```\n%%\n");
 one("a `$delete` in the answers",r,"ERROR",at(r,"```booklet answers"),/`\$delete` is kept only in an entry of a `booklet entries` block, and not in answers/);}

console.log(fails?`\n${fails} lint rows check(s) FAILED`:"\nlint rows checks passed");
fs.rmSync(tmp,{recursive:true,force:true});
process.exit(fails?1:0);
