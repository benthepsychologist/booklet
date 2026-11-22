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
const FM='---\nbooklet: "0.21"\ntitle: Lint fixture\nlang: en\n---\n\n';
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
for(const f of ["ID-{field:title}-{uuid}-{time}","{n}","{n:3}","j-{n:4}","{parent}-{n}","{field:title}-{n}","p{n}","{n}-{time}","{n}x{uuid}","{n:3}.{field:stage}","{date}-{epoch}","job {{literal}} {uuid}","{field:title}","{n:9}","{{{n}}}","{time}"])
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
  ["two plain number parts","{n}/{n}",/has more than one number part/],
  ["a number part next to `{parent}`","{parent}{n}",/has the number part `\{n\}` next to `\{parent\}`/],
  ["a number part next to a field part","{n}{field:title}",/has the number part `\{n\}` next to `\{field:title\}`/],
  ["a padded number part after a field part","{field:title}{n:3}",/has the number part `\{n:3\}` next to `\{field:title\}`/],
  ["a number part next to `{time}`","{n}{time}",/has the number part `\{n\}` next to `\{time\}`/],
  ["a number part next to `{epoch}`","{epoch}{n}",/has the number part `\{n\}` next to `\{epoch\}`/],
  ["a number part next to `{date}`","{n}{date}",/has the number part `\{n\}` next to `\{date\}`/],
  ["a number part next to `{uuid}`","{uuid}{n}",/has the number part `\{n\}` next to `\{uuid\}`/],
  ["a number part after a digit of the text","plot1{n}",/has the number part `\{n\}` next to the digit `1`/],
  ["a number part before a digit of the text","{n}2-{field:title}",/has the number part `\{n\}` next to the digit `2`/]]){
  const r=lint(FMT(f));one(`an id format with ${what}`,r,"ERROR",at(r,"```booklet data"),rx);}
{const r=lint(FMT(5));one("an id format that is not a string",r,"ERROR",at(r,"```booklet data"),/`idFormat` is a string of literal text and parts in braces/);}
{const r=lint(FMT("j-{field:nope}"));one("a field part naming a field the block does not declare",r,"warn",at(r,"```booklet data"),/the id format .* uses `\{field:nope\}`, and the block has no field `nope`/);}
// a format with no part that tells rows apart makes the same id for every row (SPEC.md section 7)
for(const f of ["plain","{parent}","p-{parent}-x","job {{literal}}"]){
  const r=lint(FMT(f));one(`an id format with no part that tells rows apart (${JSON.stringify(f)})`,r,"warn",at(r,"```booklet data"),/the id format .* has no part that tells rows apart \(a number, a time, a UUID or a field\), so it makes the same id for every row/);}
// `{field:NAME}` needs a box: the field is marked `edit` and the query does not lock it
{const r=lint(FMT("j-{field:count}-{time}"));
 one("a field part naming a field that is not marked `edit`",r,"warn",at(r,"```booklet query"),/the id format .* uses `\{field:count\}`, and no box asks for that field \(it is not marked `edit`\), so its slug is always empty and every add is refused/);}
{const r=lint(ACT(Q("as: table\nadd\nreadonly: title")+DATA({idFormat:"j-{field:title}-{time}"})));
 one("a field part naming a field the query locks with `readonly`",r,"warn",at(r,"```booklet query"),/the id format .* uses `\{field:title\}`, and no box asks for that field \(the query's `readonly` locks it\), so its slug is always empty and every add is refused/);}
clean("a field part naming an `edit` field the query does not lock lints clean",lint(ACT(Q("as: table\nadd\nreadonly: stage")+DATA({idFormat:"j-{field:title}-{time}"}))));
clean("a bare `readonly` offers no add, so a field part has no box to ask about",lint(ACT(Q("as: table\nreadonly\nadd")+DATA({idFormat:"j-{field:count}-{time}"}))));
clean("a field part with no query that adds lints clean (nothing asks for the box)",lint(ACT(Q("as: table")+DATA({idFormat:"j-{field:count}-{time}"}))));

// ---- section 7: `idPattern`, which a host reads as a JavaScript RegExp with the `u` flag; the linter asks `node` when it is on the PATH
const PAT=(p)=>ACT(Q("as: table\nadd")+DATA({idPattern:p}));
clean("an `idPattern` with no `idFormat` lints clean",lint(PAT("^[a-z0-9-]+$")));
clean("a pattern that uses a named group, as JavaScript writes it, lints clean",lint(PAT("^(?<kind>[a-z])-\\d+$")));
for(const p of ["^\\p{L}+$","[^]","(?<=a+)b","\\1(a)","^\\p{Lu}\\p{Ll}*-\\d{1,3}$"])
  clean(`the pattern ${JSON.stringify(p)} is valid JavaScript with the \`u\` flag, so it lints clean (Python's \`re\` would turn it away)`,lint(PAT(p)));
for(const [p,why] of [["^[a-z",/Unterminated character class/],["(",/Unterminated group/],["^[\\w-.]+$",/Invalid character class/],["(a)\\2",/Invalid escape/],["^a\\-b$",/Invalid escape/],
  ["(?i)abc",/Invalid group/],["(?P<x>a)",/Invalid group/],["(?>a)",/Invalid group/],["a*+",/Nothing to repeat/],["(?s:a)",/Invalid group/],["(?#c)a",/Invalid group/]]){
  const r=lint(PAT(p));one(`the pattern ${JSON.stringify(p)}, which JavaScript's RegExp with the \`u\` flag refuses (Python's \`re\` may take it)`,r,"ERROR",at(r,"```booklet data"),
    new RegExp("the `idPattern` .* is not a regular expression a host can read \\(.*"+why.source));}
{const r=lint(ACT(Q("as: table\nadd")+DATA({idPattern:7})));one("an `idPattern` that is not a string",r,"ERROR",at(r,"```booklet data"),/`idPattern` is a string, a regular expression/);}
{const r=lint(ACT(Q("as: table\nadd")+DATA({idFormat:"{n}",idPattern:"^[0-9]+$"})));one("an `idPattern` beside an `idFormat`",r,"warn",at(r,"```booklet data"),/`idPattern` is not used when an `idFormat` is declared/);}
// with no node on the PATH the linter cannot ask: a pattern Python's `re` takes passes, and one it refuses is a warning (never an error) that says so
{const bare=fs.mkdtempSync(path.join(tmp,"nonode-")),py=spawnSync("sh",["-c","command -v python3"],{encoding:"utf8"}).stdout.trim();
 const lintNoNode=(text)=>{const f=path.join(tmp,"nn"+(++k)+".md");fs.writeFileSync(f,text);
   const r=spawnSync(py,[LINT,f],{encoding:"utf8",env:{PATH:bare,HOME:process.env.HOME||bare}}),lines=r.stdout.split("\n");
   return {status:r.status,out:r.stdout,text,errors:lines.filter(l=>l.startsWith("ERROR")),warns:lines.filter(l=>l.startsWith("warn"))};};
 clean("with no node on the PATH, a pattern Python's `re` takes lints clean",lintNoNode(PAT("^[a-z0-9-]+$")));
 {const r=lintNoNode(PAT("^\\p{L}+$"));one("with no node on the PATH, a pattern Python's `re` refuses",r,"warn",at(r,"```booklet data"),/the `idPattern` .* could not be checked: node was not found, and Python's `re` does not take it/);}
 {const r=lintNoNode(PAT("^[a-z"));one("with no node on the PATH, a broken pattern",r,"warn",at(r,"```booklet data"),/could not be checked: node was not found/);}}

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
 {const r=lint(listed('{ "idPattern": "(" }'),{"dash.json":ROWS});one("an `idPattern` in the fence over a file that is a plain list",r,"ERROR",at(r,"```booklet data"),/is not a regular expression a host can read/);}}

// ---- section 8: the entries `$add` and `$delete`
const REC=(items)=>"\n%%\n> [!records] App record — do not edit below this line\n\n```booklet entries desk\n"+JSON.stringify({items})+"\n```\n%%\n";
const WITH=(items)=>ACT(Q("as: table\nadd\ndelete")+DATA())+REC(items);
const TS="2026-11-08T10:42:00Z";
const WITH_DATA=(q,d,items)=>ACT(q+"\n```booklet data\n"+d+"\n```\n^plots\n")+REC(items);
const ADD={in:"plots",pick:"j-weed-20261108104200",under:"p1",row:{title:"Weed the beds",stage:"planning"}};
const DEL={in:"plots",pick:"j1",was:{id:"j1",title:"Prune",stage:"planning"}};
clean("an `$add` entry lints clean",lint(WITH([{$add:[ADD],ts:TS}])));
clean("an `$add` for a top row (no `under`) with a numeric id lints clean",lint(WITH([{$add:[{in:"plots",pick:7,row:{title:"Shed"}}],ts:TS}])));
clean("an `$add` whose `under` is a number lints clean",lint(WITH([{$add:[{in:"plots",pick:"a",under:3,row:{}}],ts:TS}])));
clean("a `$delete` entry lints clean",lint(WITH([{$delete:[DEL],ts:TS}])));
clean("a `$delete` whose `pick` is a number and whose `was.id` is the same id as text lints clean (ids are read as text)",lint(WITH([{$delete:[{in:"plots",pick:5,was:{id:"5",title:"Shed"}}],ts:TS}])));
clean("a `$delete` of a row that was only waiting (`was` is `{id, ...row}` of the pending add) lints clean",lint(WITH([{$add:[ADD],ts:TS},{$delete:[{in:"plots",pick:ADD.pick,was:{id:ADD.pick,...ADD.row}}],ts:"2026-11-08T10:43:10Z"}])));
clean("an `$add` and a `$delete` among ordinary entries lint clean",lint(WITH([{title:[{in:"plots",pick:"p1",a:"x",was:"Orchard"}],ts:"2026-11-08T10:41:00Z"},{$add:[ADD],ts:TS},{$delete:[DEL],ts:"2026-11-08T10:43:10Z"}])));
for(const [what,e,rx] of [
  ["an `$add` that is not a list",{$add:ADD,ts:TS},/an entry's `\$add` must hold a list with one pair/],
  ["an `$add` list with two pairs",{$add:[ADD,ADD],ts:TS},/an entry keeps one `\$add` pair, and this one holds 2/],
  ["an empty `$add` list",{$add:[],ts:TS},/an entry keeps one `\$add` pair, and this one holds 0/],
  ["an `$add` pair that is not an object",{$add:["j"],ts:TS},/the `\$add` pair must be an object/],
  ["an `$add` pair with no `pick`",{$add:[{in:"plots",row:{}}],ts:TS},/the `\$add` pair has no `pick`, the new row's id/],
  ["an `$add` pick that is empty",{$add:[{in:"plots",pick:"",row:{}}],ts:TS},/the `\$add` pair's `pick` must be the new row's id, a string or a number, and not empty/],
  ["an `$add` pick that is a list",{$add:[{in:"plots",pick:["a"],row:{}}],ts:TS},/the `\$add` pair's `pick` must be the new row's id, a string or a number/],
  ["an `$add` whose `under` is an object",{$add:[{in:"plots",pick:"a",under:{},row:{}}],ts:TS},/the `\$add` pair's `under` must be the parent row's id, a string or a number/],
  ["an `$add` with no `row`",{$add:[{in:"plots",pick:"a"}],ts:TS},/the `\$add` pair has no `row`, the values of the fields the form asked for/],
  ["an `$add` whose `row` is a list",{$add:[{in:"plots",pick:"a",row:[]}],ts:TS},/the `\$add` pair's `row` must be an object/],
  ["an `$add` whose `row` holds the id",{$add:[{in:"plots",pick:"a",row:{id:"a"}}],ts:TS},/the `\$add` pair's `row` must not hold the `id`; the `pick` is the id/],
  ["a `$delete` with no `was`",{$delete:[{in:"plots",pick:"j1"}],ts:TS},/the `\$delete` pair has no `was`, the whole row as it was when the reader pressed Remove/],
  ["a `$delete` whose `was` is a string",{$delete:[{in:"plots",pick:"j1",was:"row"}],ts:TS},/the `\$delete` pair's `was` must be an object/],
  ["a `$delete` with no `pick`",{$delete:[{in:"plots",was:{}}],ts:TS},/the `\$delete` pair has no `pick`, the removed row's id/],
  ["an `$add` with no `in`",{$add:[{pick:"a",row:{}}],ts:TS},/the `\$add` pair has no `in`, the id of the data block it is for/],
  ["a `$delete` with no `in`",{$delete:[{pick:"j1",was:{id:"j1"}}],ts:TS},/the `\$delete` pair has no `in`, the id of the data block it is for/],
  ["an `$add` whose `in` is a number",{$add:[{in:3,pick:"a",row:{}}],ts:TS},/the `\$add` pair's `in` must be the id of the data block it is for, a string, and not empty/],
  ["a `$delete` whose `in` is empty",{$delete:[{in:"",pick:"j1",was:{id:"j1"}}],ts:TS},/the `\$delete` pair's `in` must be the id of the data block it is for, a string, and not empty/],
  ["an entry that holds both acts",{$add:[ADD],$delete:[DEL],ts:TS},/an entry keeps one act, `\$add` or `\$delete`, and this one holds both/],
  ["an `$add` beside an ordinary key",{$add:[ADD],title:[{in:"plots",pick:"p1",a:"x",was:"y"}],ts:TS},/an entry that keeps `\$add` holds nothing else but its `ts`, and this one also holds `title`/],
  ["a `$delete` beside an ordinary key",{$delete:[DEL],note:"x",ts:TS},/an entry that keeps `\$delete` holds nothing else but its `ts`, and this one also holds `note`/],
  ["a `$delete` whose `was` has no `id`",{$delete:[{in:"plots",pick:"j1",was:{title:"Prune"}}],ts:TS},/the `\$delete` pair's `was` has no `id`, and it must be the row as it was, `id` included/],
  ["a `$delete` whose `was.id` is not the `pick`",{$delete:[{in:"plots",pick:"j1",was:{id:"j2",title:"Prune"}}],ts:TS},/the `\$delete` pair's `was` has the `id` "j2", and the `pick` is "j1"; `was` is the removed row/]]){
  const r=lint(WITH([e]));one(`an entry with ${what}`,r,"ERROR",at(r,"```booklet entries"),rx);}
for(const [what,e] of [["an `$add`",{$add:[{in:"nope",pick:"a",row:{}}],ts:TS}],["a `$delete`",{$delete:[{in:"nope",pick:"j1",was:{id:"j1"}}],ts:TS}]]){
  const r=lint(WITH([e])),key=/\$\w+/.exec(what)[0];
  one(`${what} whose \`in\` names no data block in the booklet`,r,"warn",at(r,"```booklet entries"),new RegExp("the `\\"+key+"` pair's `in` names \\^nope, and the booklet has no data block with that id, so a reader keeps the entry as written and does not apply or draw it"));}
{const r=lint(ACT(Q("as: table")+DATA())+"\n%%\n> [!records] App record — do not edit below this line\n\n```booklet draft desk\n"+JSON.stringify({$add:[ADD]})+"\n```\n%%\n");
 one("an `$add` in a draft",r,"ERROR",at(r,"```booklet draft"),/`\$add` is kept only in an entry of a `booklet entries` block, and not in a draft/);}
{const r=lint(ACT(Q("as: table")+DATA())+"\n%%\n> [!records] App record — do not edit below this line\n\n```booklet answers\n"+JSON.stringify({$delete:[DEL]})+"\n```\n%%\n");
 one("a `$delete` in the answers",r,"ERROR",at(r,"```booklet answers"),/`\$delete` is kept only in an entry of a `booklet entries` block, and not in answers/);}


// ---- a data row with a field named `$add` or `$delete` (reserved for the reader's acts)
for(const key of ["$add","$delete"]){
  const rows=[{id:"p1",title:"Orchard",[key]:"x"},{id:"p2",title:"Beds"}];
  const r=lint(ACT(Q("as: table")+"```booklet data\n"+JSON.stringify({fields:{title:"Name"},rows})+"\n```\n^plots\n"));
  one(`a data row with a field named \`${key}\``,r,"warn",at(r,"```booklet data"),new RegExp("a row of the data block \\^plots holds a field named `"+key.replace("$","\\$")+"`, a name reserved for the reader's kept acts \\(SPEC.md section 8\\), which is not supported as a field"));}
{const r=lint(ACT(Q("as: table")+"```booklet data dash.json plots\n```\n^plots\n"),{"dash.json":{plots:[{id:"p1",title:"Orchard",jobs:[{id:"j1","$add":1}]}]}});
 one("a nested data row of a file with a field named `$add`",r,"warn",at(r,"```booklet data"),/holds a field named `\$add`/);}

// ---- the examples in the spec lint
{const spec=fs.readFileSync(path.join(R,"SPEC.md"),"utf8");
 const block=(heading,lang,ticks)=>{const i=spec.indexOf(heading);if(i<0)return null;
   const m=new RegExp("^( *)("+"`".repeat(ticks)+")"+lang+"[^\\n]*\\n([\\s\\S]*?)\\n\\1\\2 *$","m").exec(spec.slice(i));
   return m?m[3].split("\n").map(l=>l.startsWith(m[1])?l.slice(m[1].length):l).join("\n"):null;};
 const data=block("- **A field's label is a string, or an object**","json",3);
 const mdq=block("### The id of a new row","markdown",4);
 const acts=block("With the data block of the example in","json",3);
 const addEx=block("### Adding a row","json",3),delEx=block("### Removing a row","json",3);
 chk("SPEC.md has the data example with an idFormat, and the query that offers add and delete",!!(data&&/"idFormat"/.test(data)&&mdq&&/\nadd\ndelete\n/.test(mdq)));
 if(data&&mdq) clean("the spec's data example and its add and delete query lint clean in a repeat activity",lint(ACT(mdq.replace("from: plots","from: plots")+"\n```booklet data\n"+data+"\n```\n^plots\n")));
 chk("the spec's two example entries are one JSON object a line",!!acts&&acts.split("\n").every(l=>{try{JSON.parse(l);return true;}catch(e){return false;}}));
 if(data&&mdq&&acts){const items=acts.split("\n").map(l=>JSON.parse(l));
   clean("and they lint clean as entries of the activity that holds the query",lint(WITH_DATA(mdq,data,items)));}
 for(const [what,ex] of [["Adding a row",addEx],["Removing a row",delEx]]){
   let o=null;try{o=JSON.parse(ex);}catch(e){}
   chk(`the spec's example under "${what}" is one entry as JSON`,!!o);
   if(o) clean(`and it lints clean as an entry (${what})`,lint(WITH_DATA(mdq,data,[o])));}}

console.log(fails?`\n${fails} lint rows check(s) FAILED`:"\nlint rows checks passed");
fs.rmSync(tmp,{recursive:true,force:true});
process.exit(fails?1:0);
