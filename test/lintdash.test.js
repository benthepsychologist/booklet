// The linter's rules for the dashboard text of the format (SPEC.md section 5, "A question asked for each row" and "Editing a field in
// place"; section 6, "Rows that open" and the `readonly` key; section 7, nested rows, a field's object form and "Rows from a file").
// Each case is a small file made here with ONE slip, linted, and the finding is checked by its kind (error or warning), its line and its
// words; the clean files must stay clean, so a new check cannot buy its catch with a false alarm. The examples in the spec, the skill and
// examples/ must lint. Everything here is made up: a garden and an orchard.
// Run: node test/lintdash.test.js   (node and python3; nothing to install.)  LINT_BOOKLET=<path> tries another linter.
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const LINT=process.env.LINT_BOOKLET||path.join(R,"lint-booklet.py");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"lintdash-"));let k=0;
// `files` maps a name to its text, made beside the booklet; each case has a folder of its own
const lint=(text,files)=>{const dir=path.join(tmp,"c"+(++k));fs.mkdirSync(dir);
  for(const [name,body] of Object.entries(files||{})){fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true});
    fs.writeFileSync(path.join(dir,name),typeof body==="string"?body:JSON.stringify(body));}
  const f=path.join(dir,"f.md");fs.writeFileSync(f,text);
  const r=spawnSync("python3",[LINT,f],{encoding:"utf8"}),lines=r.stdout.split("\n");
  return {status:r.status,out:r.stdout,errors:lines.filter(l=>l.startsWith("ERROR")),warns:lines.filter(l=>l.startsWith("warn"))};};
const FM='---\nbooklet: "0.19"\ntitle: Lint fixture\nlang: en\n---\n\n';       // 6 lines: the body starts on line 7
// one repeat activity on line 7, then the body from line 9
const ACT=(body,head="> [!activity|desk repeat] Desk\n\n")=>FM+head+body;
const one=(what,r,kind,line,rx)=>{const got=kind==="ERROR"?r.errors:r.warns;
  chk(`${what}: exactly one finding, ${kind==="ERROR"?"an error":"a warning"}`,got.length===1&&r.errors.length+r.warns.length===1,r.out);
  chk(`${what}: ${line?"it names line "+line+" and ":"it "}says the fix`,(line?new RegExp(": line "+line+": ").test(got[0]||""):true)&&rx.test(got[0]||""),got[0]);
  chk(`${what}: ${kind==="ERROR"?"the file fails":"the build does not fail"}`,(r.status===1)===(kind==="ERROR"),String(r.status));};
const clean=(what,r)=>chk(what,r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);
const ROWS={plots:[{id:"p1",title:"Orchard",stage:"growing",notes:[],jobs:[{id:"j1",title:"Prune",stage:"todo",notes:[]}]},{id:"p2",title:"Beds",stage:"resting",notes:[]}]};
const Q="```booklet query\nfrom: plots\n```\n\n";
const DATA=(info="",fence="")=>"```booklet data"+info+"\n"+fence+"\n```\n^plots\n";
// the data block at line 9 + (the query's 5 lines) = the query is on line 9, the block on line 14

// ---- section 7: a data block that names a file
{const FILE={"dash.json":ROWS};
 clean("a block that names a file and a key path, with an empty fence, lints clean",lint(ACT(Q+DATA(" dash.json plots")),{"dash.json":ROWS}));
 clean("a block with no key path reads the whole file (a list of rows)",lint(ACT(Q+DATA(" list.json")),{"list.json":ROWS.plots}));
 clean("a path of two keys, and a file that holds `{ fields, rows }`, lint clean",lint(ACT(Q+DATA(" deep.json a.b")),{"deep.json":{a:{b:{fields:{title:"Name"},rows:ROWS.plots}}}}));
 clean("a fence that holds only `fields` lints clean",lint(ACT(Q+DATA(" dash.json plots",'{ "fields": { "title": "Name" } }')),FILE));
 clean("a file in a folder beside the booklet lints clean",lint(ACT(Q+DATA(" data/dash.json plots")),{"data/dash.json":ROWS}));
 clean("several blocks may name one file",lint(ACT(Q+DATA(" dash.json plots")+"\n```booklet data dash.json plots\n```\n^other\n"),FILE));
 for(const [what,name] of [["`..` in it","../dash.json"],["a leading slash","/dash.json"],["a part that begins with a dot",".hid/dash.json"],["an empty part","a//dash.json"],
   ["no `.json` ending","dash.txt"],["a capital ending","dash.JSON"],["a `$` in it","da$h.json"],["more than 200 characters","a".repeat(200)+".json"]])
   one(`a data file name with ${what}`,lint(ACT(DATA(" "+name+" plots"))),"ERROR",9,/the data file name .* is not one a renderer reads/);
 one("a key path with an empty key",lint(ACT(DATA(" dash.json a..b")),FILE),"ERROR",9,/the key path 'a\.\.b' is keys joined by dots/);
 one("a key path with a character it does not read",lint(ACT(DATA(" dash.json a$b")),FILE),"ERROR",9,/the key path 'a\$b' is keys joined by dots/);
 one("a third word on the fence line",lint(ACT(DATA(" dash.json plots extra")),FILE),"ERROR",9,/then a file name and a key path \(found 3 words/);
 one("rows in the fence of a block that names a file",lint(ACT(DATA(" dash.json plots",'{ "rows": [ { "title": "A" } ] }')),FILE),"ERROR",9,/names a file, so its fence is empty or holds only `fields`/);
 one("a fence that is not JSON",lint(ACT(DATA(" dash.json plots","not json")),FILE),"ERROR",9,/is not valid JSON/);
 one("a file that is missing is a warning, not an error",lint(ACT(DATA(" gone.json plots"))),"warn",9,/no file named gone\.json is beside this booklet/);
 one("a file that is not JSON",lint(ACT(DATA(" bad.json plots")),{"bad.json":"{ not json"}),"ERROR",9,/bad\.json is not valid JSON/);
 one("a key path with nothing at it",lint(ACT(DATA(" dash.json nope")),FILE),"ERROR",9,/dash\.json holds nothing at the key path 'nope'/);
 one("a key path that runs through a list",lint(ACT(DATA(" dash.json plots.title")),FILE),"ERROR",9,/holds nothing at the key path 'plots\.title'/);
 one("what the path finds is no list of rows",lint(ACT(DATA(" dash.json plots")),{"dash.json":{plots:"words"}}),"ERROR",9,/what dash\.json holds at 'plots' holds no list of rows/);
 one("a row in the file that is not an object",lint(ACT(DATA(" dash.json plots")),{"dash.json":{plots:[1]}}),"ERROR",9,/has a row that is not an object/);
 one("a value in the file a row cannot hold",lint(ACT(DATA(" dash.json plots")),{"dash.json":{plots:[{id:"a",x:[[1]]}]}}),"ERROR",9,/has a value in 'x' that a row cannot hold/);
 {const big=path.join(tmp,"big");fs.mkdirSync(big);const f=path.join(big,"f.md");
  fs.writeFileSync(path.join(big,"big.json"),JSON.stringify({plots:ROWS.plots})+" ".repeat(5*1024*1024));
  fs.writeFileSync(f,ACT(DATA(" big.json plots")));
  const r=spawnSync("python3",[LINT,f],{encoding:"utf8"});
  chk("a file larger than the 5 MB a renderer reads is one warning, and the build does not fail",r.status===0&&/line 9: big.json is larger than the 5 MB/.test(r.stdout)&&/1 warning/.test(r.stdout),r.stdout);}
 // the names a file's rows carry are known, so a name no row carries is reported
 one("a `fields:` name no row of the file carries",lint(ACT("```booklet query\nfrom: plots\nfields: title, nope\n```\n\n"+DATA(" dash.json plots")),FILE),"warn",9,/`fields: nope` names a field the rows never carry/);
 one("with the file missing, nothing is said about the names a query uses (the rows are unknown): only the missing file",lint(ACT("```booklet query\nfrom: plots\nfields: title, anything\n```\n\n"+DATA(" gone.json plots"))),"warn",14,/no file named gone\.json/);
}

// ---- section 7: nested rows
{clean("child rows (a list of objects, and one object) lint clean",lint(ACT(Q+DATA("",JSON.stringify({rows:[{id:"a",title:"A",kids:[{id:"b",title:"B"}],one:{id:"c",title:"C",deeper:[{id:"d",title:"D"}]}}]})))));
 clean("an empty list is an ordinary value, not child rows",lint(ACT(Q+DATA("",JSON.stringify({rows:[{id:"a",title:"A",kids:[]}]})))));
 one("a list inside a list",lint(ACT(DATA("",JSON.stringify({rows:[{id:"a",x:[[1]]}]})))),"ERROR",9,/the data block \^plots has a value in 'x' that a row cannot hold/);
 one("a list that mixes rows with plain values",lint(ACT(DATA("",JSON.stringify({rows:[{id:"a",x:[{id:"b"},"c"]}]})))),"ERROR",9,/has a value in 'x' that a row cannot hold/);
 one("a bad value deep inside child rows",lint(ACT(DATA("",JSON.stringify({rows:[{id:"a",x:[{id:"b",y:[[2]]}]}]})))),"ERROR",9,/has a value in 'y' that a row cannot hold/);
 // a `fields:` name that only a child row carries is a name the rows carry
 clean("a `fields:` name that only a child row carries lints clean",lint(ACT("```booklet query\nfrom: plots\nfields: title, owner\n```\n\n"+DATA("",JSON.stringify({rows:[{id:"a",title:"A",kids:[{id:"b",owner:"Mara"}]}]})))));
}

// ---- section 6: nesting on table and cards, and the rules for nested views
{const NESTED=JSON.stringify({rows:[{id:"a",title:"A",parent:""},{id:"b",title:"B",parent:"a"}]});
 for(const view of ["table","list","cards"])
   clean(`\`parent:\` on ${view} lints clean (it is drawn there now)`,lint(ACT(`\`\`\`booklet query\nfrom: plots\nas: ${view}\nparent: parent\n\`\`\`\n\n`+DATA("",NESTED))));
 one("`parent:` on a `table` that names a field no row carries",lint(ACT("```booklet query\nfrom: plots\nas: table\nparent: nope\n```\n\n"+DATA("",NESTED))),"warn",9,/`parent: nope` names a field the rows never carry/);
 one("`parent:` on `bars` is not drawn",lint(ACT("```booklet query\nfrom: plots\nas: bars\nparent: parent\n```\n\n"+DATA("",JSON.stringify({rows:[{id:"a",value:1,parent:""},{id:"b",value:2,parent:"a"}]})))),"warn",9,/`as: bars` does not draw `parent`/);
 one("`group:` on a nested table is not drawn",lint(ACT("```booklet query\nfrom: plots\nas: table\nparent: parent\ngroup: title\n```\n\n"+DATA("",NESTED))),"warn",9,/a nested table is not grouped, so `group: title` is not drawn/);
 one("`group:` over rows with child rows is not drawn",lint(ACT("```booklet query\nfrom: plots\nas: cards\ngroup: title\n```\n\n"+DATA("",JSON.stringify({rows:[{id:"a",title:"A",kids:[{id:"b",title:"B"}]}]})))),"warn",9,/a nested cards is not grouped/);
 one("two rows with one `id` on a nested table",lint(ACT("```booklet query\nfrom: plots\nas: table\n```\n\n"+DATA("",JSON.stringify({rows:[{id:"a",parent:""},{id:"a",parent:"a"}]})))),"warn",9,/the nested table has 2 rows with the `id` 'a'/);
 one("a row with no `id` on a nested cards view",lint(ACT("```booklet query\nfrom: plots\nas: cards\n```\n\n"+DATA("",JSON.stringify({rows:[{id:"a",parent:""},{parent:"a"}]})))),"warn",9,/the nested cards has 1 row\(s\) with no `id`/);
}

// ---- section 7: a field's label may be an object
{const F=f=>JSON.stringify({fields:f,rows:[{id:"a",title:"A",stage:"todo",due:"2026-11-20",about:"x",n:1}]});
 const EDIT=f=>lint(ACT(DATA("",F(f))));
 const all={title:{label:"Name",edit:"text"},about:{label:"About",edit:"long"},n:{label:"Count",edit:"number"},due:{label:"Due",edit:"date"},stage:{label:"Stage",edit:"choice",options:["todo","done"]}};
 clean("each of the five `edit` kinds lints clean, with `options` on a `choice`",EDIT(all));
 clean("an object with only a `label` (read-only) lints clean",EDIT({title:{label:"Name"},stage:"Stage"}));
 one("an `edit` that is not one of the five",EDIT({title:{label:"Name",edit:"bold"}}),"ERROR",9,/field 'title': `edit` must be one of text, long, number, date, choice \(found 'bold'\)/);
 one("`edit: choice` with no `options`",EDIT({stage:{label:"Stage",edit:"choice"}}),"ERROR",9,/field 'stage': `edit: choice` needs `options`/);
 one("`edit: choice` with an empty list of `options`",EDIT({stage:{label:"Stage",edit:"choice",options:[]}}),"ERROR",9,/`edit: choice` needs `options`/);
 one("`options` on an `edit` that is not `choice`",EDIT({title:{label:"Name",edit:"text",options:["a"]}}),"warn",9,/`options` belongs to `edit: choice`, so it is ignored here/);
 one("a field object with no `label`",EDIT({title:{edit:"text"}}),"ERROR",9,/a field written as an object needs a `label`/);
 one("a field object with a key it does not take",EDIT({title:{label:"Name",size:3}}),"ERROR",9,/a field's object takes label, edit, options, and not 'size'/);
 one("`fields` whose label is a number",EDIT({title:3}),"ERROR",9,/has `fields` that is not an object of labels/);
 // the same checks hold for the `fields` in the fence of a block that names a file
 one("a bad `edit` in the fence of a block that names a file",lint(ACT(DATA(" dash.json plots",'{ "fields": { "title": { "label": "Name", "edit": "bold" } } }')),{"dash.json":ROWS}),"ERROR",9,/`edit` must be one of/);
 one("a bad `edit` in the file's own `fields`",lint(ACT(DATA(" dash.json plots")),{"dash.json":{plots:{fields:{title:{label:"N",edit:"bold"}},rows:ROWS.plots}}}),"ERROR",9,/`edit` must be one of/);
 // an editable field is kept in an activity's entries (section 5)
 one("an editable field drawn in an activity that keeps no entries",lint(ACT(Q+DATA("",F({title:{label:"Name",edit:"text"}})),"> [!activity|desk] Desk\n\n")),"warn",9,/the field\(s\) 'title' of \^plots can be edited, and this activity keeps no entries/);
 clean("an editable field in a `repeat` activity lints clean",lint(ACT(Q+DATA("",F({title:{label:"Name",edit:"text"}})))));
 clean("a bare `readonly` silences it: nothing is editable in that view",lint(ACT("```booklet query\nfrom: plots\nreadonly\n```\n\n"+DATA("",F({title:{label:"Name",edit:"text"}})),"> [!activity|desk] Desk\n\n")));
 one("a `readonly` that locks other fields leaves the warning for the editable one",lint(ACT("```booklet query\nfrom: plots\nreadonly: stage\n```\n\n"+DATA("",F({title:{label:"Name",edit:"text"},stage:{label:"S",edit:"text"}})),"> [!activity|desk] Desk\n\n")),"warn",9,/the field\(s\) 'title' of \^plots/);
}

// ---- section 6: the `readonly` key
{const D=DATA("",JSON.stringify({rows:[{id:"a",title:"A",due:"x"}]}));
 clean("a bare `readonly` line lints clean",lint(ACT("```booklet query\nfrom: plots\nreadonly\n```\n\n"+D)));
 clean("`readonly:` with nothing after it lints clean",lint(ACT("```booklet query\nfrom: plots\nreadonly:\n```\n\n"+D)));
 clean("`readonly: title, due` lints clean",lint(ACT("```booklet query\nfrom: plots\nreadonly: title, due\n```\n\n"+D)));
 const N=DATA("",JSON.stringify({rows:[{id:"a",label:"A",value:3}]}));
 for(const view of ["cards","table","list","tiles","bars","line"])
   clean(`\`readonly\` on ${view} is read by every view, so it is not reported as ignored`,lint(ACT(`\`\`\`booklet query\nfrom: plots\nas: ${view}\nreadonly\n\`\`\`\n\n`+N)));
 one("`readonly:` naming a field no row carries",lint(ACT("```booklet query\nfrom: plots\nreadonly: title, nope\n```\n\n"+D)),"warn",9,/`readonly: nope` names a field the rows never carry/);
 one("`readonly` over kept entries does nothing",lint(ACT("```booklet query\nfrom: log\nreadonly\n```\n\n","> [!activity|log repeat] Log\n\n> [!text|a] A\n\n> [!activity|look] Look\n\n")),"warn",13,/the query's `readonly` does nothing here/);
}

// ---- section 5: a question asked for each row, and a question placed in a column
{const D=(extra="")=>DATA("",JSON.stringify({rows:[{id:"a",title:"A",decision:[],note:"x"},{id:"b",title:"B",decision:[]}]}))+extra;
 const QA="> [!choice|decision each:plots] Your call\n- [ ] Yes\n- [ ] No\n\n";
 clean("`each:` over a data block, drawn by a query in the same activity, lints clean",lint(ACT(Q+QA+D())));
 clean("a question placed in a column by `fields:` lints clean",lint(ACT("```booklet query\nfrom: plots\nfields: title, decision\n```\n\n"+QA+D())));
 one("a question asked of every row, because no row carries a field of its id, is a warning that says so",lint(ACT(Q+"> [!text|word each:plots] A word\n\n"+D())),"warn",13,/asks the question 'word' of every row, because no row of \^plots carries a field named 'word'/);
 clean("an `each:` over a file's rows lints clean",lint(ACT(Q+QA+DATA(" dash.json plots")),{"dash.json":{plots:[{id:"a",decision:[]},{id:"b",decision:[]}]}}));
 clean("`each:` over a question still works as before",lint(ACT("> [!multi|tools] Tools\n- [ ] Saw\n- [ ] Drill\n\n> [!text|where each:tools] Where?\n\n")));
 clean("`each:` over a data block drawn by a query lints clean in a file with no activity line (one implicit activity)",lint(FM+Q+QA+D()));
 one("`each:` over a data block that nothing in the activity draws",lint(ACT(QA+D())),"warn",9,/`each:plots` is drawn in the rows of a view of \^plots, and no query in this activity draws \^plots/);
 one("`each:` over rows that carry no `id`",lint(ACT(Q+QA+DATA("",JSON.stringify({rows:[{decision:[]},{id:"b",decision:[]}]})))),"warn",13,/a row is named by its `id`: 1 row\(s\) carry none/);
 one("`each:` over rows that share an `id`",lint(ACT(Q+QA+DATA("",JSON.stringify({rows:[{id:"a",decision:[]},{id:"a",decision:[]}]})))),"warn",13,/2 rows of \^plots have the `id` 'a'/);
 one("a question whose id no row carries, when some other field is the one meant",lint(ACT(Q+"> [!text|decison each:plots] Typo\n\n"+DATA("",JSON.stringify({rows:[{id:"a",decision:[]}]})))),"warn",13,/asks the question 'decison' of every row, because no row of \^plots carries a field named 'decison'/);
 one("a question named like a field that holds child rows: such a field is the row's children, never an answer",lint(ACT(Q+"> [!text|jobs each:plots] Jobs\n\n"+DATA("",JSON.stringify({rows:[{id:"a",jobs:[{id:"j",title:"Prune"}]},{id:"b",jobs:[]}]})))),"warn",13,/the field 'jobs' holds rows \(children\) in 1 row\(s\) of \^plots/);
 one("a `fields:` name that is a question asked for each row of another block",lint(ACT("```booklet query\nfrom: plots\nfields: title, decision\n```\n\n"+QA.replace("each:plots","each:other")+"```booklet query\nfrom: other\n```\n\n"+D()+"\n```booklet data\n[ { \"id\": \"z\", \"decision\": [] } ]\n```\n^other\n")),"warn",9,/`fields: decision` names a question that is asked for each row of \^other, not of \^plots/);
 one("a `fields:` name that is a question with no `each:`",lint(ACT("```booklet query\nfrom: plots\nfields: title, mood\n```\n\n> [!text|mood] Mood\n\n"+D())),"warn",9,/`fields: mood` names a question that is not asked for each row \(it has no `each:plots`\)/);
 one("a `fields:` name that is neither a field nor a question",lint(ACT("```booklet query\nfrom: plots\nfields: title, nope\n```\n\n"+D())),"warn",9,/`fields: nope` names a field the rows never carry/);
 one("`each:` that names nothing in its activity or in reach is still an error",lint(ACT("> [!text|word each:nothing] A word\n\n")),"ERROR",9,/`each:nothing` names no question or widget in this activity/);
}

// ---- the examples in the spec, the skill and examples/ lint
{const spec=fs.readFileSync(path.join(R,"SPEC.md"),"utf8"),skill=fs.readFileSync(path.join(R,"SKILL.md"),"utf8");
 /* the first fenced block of a language after a heading, dedented by the fence's own indent */
 const block=(t,heading,lang,ticks)=>{const i=t.indexOf(heading);if(i<0)return null;
   const m=new RegExp("^( *)("+"`".repeat(ticks)+")"+lang+"[^\\n]*\\n([\\s\\S]*?)\\n\\1\\2 *$","m").exec(t.slice(i));
   return m?m[3].split("\n").map(l=>l.startsWith(m[1])?l.slice(m[1].length):l).join("\n"):null;};
 const after=(t,heading,re)=>{const m=/booklet query/.test(re.source)?block(t,heading,"booklet query",3):/json/.test(re.source)?block(t,heading,"json",3):null;return m;};
 const FENCE4=null;
 const md4=(t,h)=>block(t,h,"markdown",4);
 // SPEC section 7: the rows-from-a-file example, drawn by two queries and given the file it names
 {const md=md4(spec,"### Rows from a file");
  chk("SPEC.md section 7 has a rows-from-a-file example",!!md);
  if(md) clean("the spec's rows-from-a-file example lints clean, given its file and two queries",
    lint(ACT("```booklet query\nfrom: plots\n```\n\n```booklet query\nfrom: requests\n```\n\n"+md+"\n"),{"dashboard.json":{plots:[{id:"p",title:"A"}],inbox:{requests:[{id:"r",title:"B",asked:"2026-11-05"}]}}}));}
 // SPEC section 5: the question-for-each-row example, given the block it names
 {const md=md4(spec,"### A question asked for each row");
  chk("SPEC.md section 5 has a question-for-each-row example",!!md);
  if(md) clean("the spec's question-for-each-row example lints clean, given its data block",
    lint(FM+md.replace("> [!activity|desk repeat] Orchard desk","> [!activity|desk repeat] Orchard desk\n")+"\n```booklet data\n[ { \"id\": \"r1\", \"title\": \"Ladder\", \"asked\": \"2026-11-05\", \"decision\": [], \"reply\": [] } ]\n```\n^requests\n"));}
 // SPEC section 7: the fields example (the object form)
 {const js=after(spec,"- **A field's label is a string, or an object**",/json/);
  chk("SPEC.md section 7 has a fields example in the object form",!!js);
  if(js){let ok=true;try{JSON.parse(js);}catch(e){ok=false;}chk("and it is valid JSON",ok);
   clean("the spec's fields example lints clean as a data block",lint(ACT(Q+"```booklet data\n"+js+"\n```\n^plots\n")));}}
 // SPEC section 6: the table example over nested rows
 {const q=after(spec,"### Rows that open",/booklet query/);
  chk("SPEC.md section 6 has a rows-that-open example",!!q);
  if(q) clean("the spec's rows-that-open query lints clean over nested rows",
    lint(ACT("```booklet query\n"+q+"\n```\n\n```booklet data\n"+JSON.stringify({rows:[{id:"a",title:"A",kind:"k",stage:"s",open:1,due:"d",jobs:[{id:"b",title:"B",kind:"k",stage:"s",open:0,due:"d"}]}]})+"\n```\n^plots\n")));}
 // the spec's pair example for an in-place question is valid JSON
 {const js=after(spec,"For an in-place question a pair has one more key",/json/);let ok=!!js;try{JSON.parse(js);}catch(e){ok=false;}
  chk("the spec's kept-entry example for an in-place question is valid JSON",ok);}
 // SKILL.md: the dashboard example and the file it reads
 {const md=md4(skill,"A dashboard: rows from a file"),js=block(skill,"A dashboard: rows from a file","json garden-desk\\.json",3);
  chk("SKILL.md has a dashboard example and the JSON file it reads",!!(md&&js));
  if(md&&js) clean("the skill's dashboard example lints clean beside its file",lint(FM+md+"\n",{"garden-desk.json":js}));
  if(md&&js){const r=lint(FM+md+"\n");
   chk("and without its file, the same example is two warnings (one for each block that names it) and no error",r.status===0&&r.warns.length===2&&r.warns.every(w=>/no file named garden-desk\.json is beside this booklet/.test(w)),r.out);}}
 // examples/: the dashboard example, beside its file
 {const r=spawnSync("python3",[LINT,path.join(R,"examples","orchard-dashboard.booklet.md")],{encoding:"utf8"});
  chk("examples/orchard-dashboard.booklet.md lints clean beside examples/orchard-dashboard.json",r.status===0&&/0 errors · 0 warnings/.test(r.stdout),r.stdout);
  let ok=true;try{JSON.parse(fs.readFileSync(path.join(R,"examples","orchard-dashboard.json"),"utf8"));}catch(e){ok=false;}
  chk("and the JSON file parses",ok);}
}

fs.rmSync(tmp,{recursive:true,force:true});
console.log(fails?"\n"+fails+" FAILURES":"\nall ok");process.exit(fails?1:0);
