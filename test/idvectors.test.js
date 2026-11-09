// The id of a new row (SPEC.md section 7, "The id of a new row"): the test vectors in test/id-vectors.json, and what reads them.
//  1. A short reference maker, written here from the spec's rules alone, makes every case; the file's expected answers must be what the rules give,
//     so a wrong vector cannot stand. Another writer copies the file and runs the same cases against its own maker.
//  2. The linter agrees with the file on which formats are valid: it fails exactly the cases that expect `invalid-format`.
//  3. The spec's table of the cases is the file's, row for row (the table is made from the file here, so the two cannot drift).
// Run: node test/idvectors.test.js   (node and python3; nothing to install.)  LINT_BOOKLET=<path> tries another linter.
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const LINT=process.env.LINT_BOOKLET||path.join(R,"lint-booklet.py");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const V=JSON.parse(fs.readFileSync(path.join(__dirname,"id-vectors.json"),"utf8"));

// ---- 1. the reference maker
const esc=s=>s.replace(/[.*+?^${}()|[\]\\\/-]/g,"\\$&");
function parse(fmt){
  if(typeof fmt!=="string"||fmt==="") return null;
  const toks=[];let lit="",i=0;
  const flush=()=>{if(lit){toks.push({k:"lit",s:lit});lit="";}};
  while(i<fmt.length){const c=fmt[i];
    if((c==="{"&&fmt[i+1]==="{")||(c==="}"&&fmt[i+1]==="}")){lit+=c;i+=2;}
    else if(c==="}") return null;
    else if(c==="{"){const j=fmt.indexOf("}",i+1);if(j<0) return null;const p=fmt.slice(i+1,j);flush();
      if(p==="n") toks.push({k:"n",w:0});
      else if(/^n:[1-9]$/.test(p)) toks.push({k:"n",w:+p.slice(2)});
      else if(/^field:.+$/.test(p)) toks.push({k:"field",name:p.slice(6)});
      else if(["time","date","epoch","uuid","parent"].includes(p)) toks.push({k:p});
      else return null;
      i=j+1;}
    else{lit+=c;i++;}}
  flush();
  const nums=toks.filter(t=>t.k==="n");
  if(nums.length>1) return null;
  for(let k=0;k<toks.length;k++){if(toks[k].k!=="n") continue;
    for(const [nb,edge] of [[toks[k-1],-1],[toks[k+1],0]]){if(!nb) continue;
      if(nb.k!=="lit") return null;
      if(/[0-9]/.test(nb.s.slice(edge===0?0:-1)[0])) return null;}}
  return toks;}
const slug=v=>String(v||"").toLowerCase().normalize("NFD").replace(/\p{M}/gu,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const UUID_RX="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const matcher=toks=>new RegExp("^"+toks.map(t=>t.k==="lit"?esc(t.s):t.k==="n"?"(\\d+)":t.k==="time"?"\\d{14}":t.k==="date"?"\\d{8}":t.k==="epoch"?"\\d+":t.k==="uuid"?UUID_RX:".*").join("")+"$");
const two=n=>String(n).padStart(2,"0");
function make(c){
  const toks=parse(c.format);if(!toks) return {refuse:"invalid-format"};
  const texts=c.ids.map(String),numTok=toks.find(t=>t.k==="n");
  let next=0;
  if(numTok){const rx=matcher(toks);let top=0;
    for(const t of texts){const m=rx.exec(t);if(m&&m[1].length<=15) top=Math.max(top,Number(m[1]));}
    next=top+1;}
  const build=(secs)=>{const d=new Date(Date.parse(c.now||V.now)+secs*1000),iso=d.toISOString();
    const parts={time:iso.slice(0,19).replace(/[-:T]/g,""),date:iso.slice(0,10).replace(/-/g,""),epoch:String(Math.floor(d.getTime()/1000)),uuid:c.uuid||V.uuid};
    let out="";
    for(const t of toks){
      if(t.k==="lit") out+=t.s;
      else if(t.k==="n") out+=String(next).padStart(t.w,"0");
      else if(t.k==="field"){const sl=slug((c.fields||{})[t.name]);if(sl==="") return {refuse:"empty-slug",field:t.name};out+=sl;}
      else if(t.k==="parent") out+=c.parent==null?"":String(c.parent);
      else out+=parts[t.k];}
    return {id:out};};
  const retry=toks.some(t=>t.k==="time"||t.k==="epoch");
  for(let s=0;s<=(retry?60:0);s++){
    const r=build(s);
    if(r.refuse) return r;
    if(r.id==="") return {refuse:"empty-id"};
    if(!texts.includes(r.id)) return {id:toks.length===1&&numTok&&!numTok.w?Number(r.id):r.id};}
  return {refuse:"clash"};}

chk("the file has the cases, a time and a uuid",Array.isArray(V.cases)&&V.cases.length>=30&&typeof V.now==="string"&&typeof V.uuid==="string",String(V.cases&&V.cases.length));
for(const c of V.cases){
  const got=make(c),want=c.expect;
  const same=("id" in want)?(got.id===want.id):(got.refuse===want.refuse&&(want.field===undefined||got.field===want.field));
  chk(`case "${c.name}": ${c.format===""?"(empty format)":c.format} → ${"id" in want?JSON.stringify(want.id):"refused, "+want.refuse}`,same,JSON.stringify(got));}
// the cases cover what the spec says they do
const has=(rx)=>V.cases.some(c=>rx.test(c.format));
for(const [what,rx] of [["{n}",/\{n\}/],["{n:W}",/\{n:\d\}/],["{time}",/\{time\}/],["{date}",/\{date\}/],["{epoch}",/\{epoch\}/],["{uuid}",/\{uuid\}/],["{field:NAME}",/\{field:/],["{parent}",/\{parent\}/]])
  chk(`the cases use ${what}`,has(rx));
const word=w=>V.cases.some(c=>c.expect.refuse===w);
for(const w of ["invalid-format","empty-slug","clash","empty-id"]) chk(`the cases refuse with "${w}"`,word(w));
chk("a case has a parent for a top row (null) and one with a parent",V.cases.some(c=>c.parent==null&&/\{parent\}/.test(c.format))&&V.cases.some(c=>c.parent!=null));
chk("a case has accents, 日本語 and a mixed-type id list",V.cases.some(c=>/é|è/.test(JSON.stringify(c.fields)))&&V.cases.some(c=>/日本語/.test(JSON.stringify(c.fields)))&&V.cases.some(c=>c.ids.some(x=>typeof x==="number")&&c.ids.some(x=>typeof x==="string")));
chk("a case is the bare {n}, whose id is a number",V.cases.some(c=>c.format==="{n}"&&typeof c.expect.id==="number"));

// ---- 2. the linter agrees on which formats are valid
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"idvec-"));
{const blocks=V.cases.map((c,i)=>"```booklet query\nfrom: b"+i+"\nas: table\nadd\n```\n\n```booklet data\n"+JSON.stringify({fields:{title:{label:"Name",edit:"text"}},idFormat:c.format,rows:[{id:"x",title:"X"}]})+"\n```\n^b"+i+"\n");
 const head='---\nbooklet: "0.21"\ntitle: Vectors\nlang: en\n---\n\n> [!activity|desk repeat] Desk\n\n';
 const text=head+blocks.join("\n"),f=path.join(tmp,"v.md");fs.writeFileSync(f,text);
 const r=spawnSync("python3",[LINT,f],{encoding:"utf8"}),errs=r.stdout.split("\n").filter(l=>l.startsWith("ERROR"));
 const lines=text.split("\n");
 V.cases.forEach((c,i)=>{const ln=lines.findIndex((l,k)=>l.startsWith("```booklet data")&&lines[k+1].includes('"idFormat":'+JSON.stringify(c.format)+','))+1;
   const mine=errs.filter(l=>l.includes(": line "+ln+": "));
   const bad=c.expect.refuse==="invalid-format";
   chk(`the linter ${bad?"fails":"passes"} the format of "${c.name}"`,ln>0&&(bad?mine.length>0:mine.length===0),ln?mine.join("|"):"(the block was not found)");});}
fs.rmSync(tmp,{recursive:true,force:true});

// ---- 3. the spec's table is the file's
const cell=s=>String(s).replace(/\|/g,"\\|");
const shown=ids=>ids.length>6?`${JSON.stringify(ids[0])} … ${JSON.stringify(ids[ids.length-1])} (${ids.length} ids)`:JSON.stringify(ids).replace(/,/g,", ");
const other=c=>[c.parent!=null?`parent ${JSON.stringify(c.parent)}`:"",...Object.entries(c.fields||{}).map(([k,v])=>`${k} ${JSON.stringify(v)}`)].filter(Boolean).join("; ")||"-";
const result=c=>("id" in c.expect)?`\`${JSON.stringify(c.expect.id)}\``:`refused: ${c.expect.refuse}${c.expect.field?` (${c.expect.field})`:""}`;
const rowOf=c=>`| ${cell(c.name)} | \`${cell(c.format)}\` | ${c.ids.length?"`"+cell(shown(c.ids))+"`":"-"} | ${cell(other(c))} | ${cell(result(c))} |`;
const table=["| case | format | ids in the block | other | makes |","| --- | --- | --- | --- | --- |",...V.cases.map(rowOf)];
{const spec=fs.readFileSync(path.join(R,"SPEC.md"),"utf8");
 chk("the spec says what time, epoch and uuid the cases use",spec.includes(V.now)&&spec.includes(V.uuid)&&spec.includes(String(Math.floor(Date.parse(V.now)/1000))));
 table.forEach((row,i)=>chk(i<2?"the spec's table has its header line "+(i+1):`the spec's table has the row of "${V.cases[i-2].name}"`,spec.includes("\n"+row+"\n"),row));
 chk("and the spec's table has no other row of cases",(spec.match(/^\| case \| format \| ids in the block \|/gm)||[]).length===1);}

console.log(fails?`\n${fails} id vector check(s) FAILED`:"\nid vector checks passed");
process.exit(fails?1:0);
