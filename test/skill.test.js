// SKILL.md is the file a person hands an AI agent so it can make a booklet from
// a plain request with no other help. This keeps its promise true. Its three
// worked examples, and three booklets built from it (test/fixtures/skill-*.
// booklet.md), must lint clean, load in this renderer, and show every
// question's own words on the page in the one language each declares.
// Run: node test/skill.test.js   (node and python3; nothing to install)
require("./harness.js");            // the browser stubs the renderer's script needs
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(R,"booklet.html"),"utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];

/* Keep what is written into innerHTML, so the text a reader would see can be
   read back from the stub DOM. */
const mk0=global.document.createElement;
global.document.createElement=tag=>{const n=mk0(tag);
  Object.defineProperty(n,"innerHTML",{get(){return this._html||"";},
    set(v){this._html=String(v);this.children=[];}});
  return n;};
const A={};
eval(src+`
;Object.assign(A,{parseFile,applyParsed,toMarkdown,render,allModules,activitiesOf,pagesOf,isPaged,showPage,
  tx,declaredLangs,offeredLangs,
  setScreen:v=>{screen=v},getLang:()=>lang,
  fresh:()=>{STATE=emptyState();DRAFTS=emptyDrafts();BOOK=EMPTY_BOOKLET;
    screen="home";lang="en";}});`);

let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const textOf=n=>n==null?"":typeof n==="string"?n
  :(n._text||"")+" "+(n._html||"").replace(/<[^>]*>/g," ")+" "+(n.children||[]).map(textOf).join(" ");
const main=()=>global.document.getElementById("main");
const flat=bs=>(bs||[]).flatMap(b=>[b,...flat(b.blocks)]);
const QUESTIONS=["text","lines","choice","multi","scale","number","date","widget"];

const skill=fs.readFileSync(path.join(R,"SKILL.md"),"utf8");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"booklet-skill-"));

// ---- the skill file itself
chk("SKILL.md opens with its name and a double-quoted description, and nothing else",
  /^---\nname: booklet\ndescription: "(?:[^"\\\n]|\\.)+"\n---\n/.test(skill));
chk("SKILL.md names its own version, separate from the format generation and the project's",
  /\*\*Skill version: \d+\.\d+\.\d+\*\*/.test(skill));
{const widgetFences=[...skill.matchAll(/```booklet widget\n([\s\S]*?)\n```/g)].map(m=>m[1]),bad=[];
 widgetFences.forEach((f,i)=>{try{JSON.parse(f);}catch(e){bad.push(i+1+": "+e.message);}});
 chk(`every widget's data in SKILL.md parses (${widgetFences.length} of them)`,widgetFences.length>0&&!bad.length,bad.join("; "));}
const worked=skill.slice(skill.indexOf("## 10. Worked examples"));
const examples=[...worked.matchAll(/````markdown\n([\s\S]*?)\n````/g)].map(m=>m[1]+"\n");
chk("SKILL.md carries three worked examples",examples.length===3);

const files=[
  ...examples.map((t,i)=>{const f=path.join(tmp,`worked-example-${i+1}.booklet.md`);fs.writeFileSync(f,t);return f;}),
  ...fs.readdirSync(path.join(__dirname,"fixtures")).filter(n=>/^skill-.*\.booklet\.md$/.test(n)).sort()
    .map(n=>path.join(__dirname,"fixtures",n))];
chk("three booklets built from SKILL.md are kept as fixtures",files.length===6,files.map(f=>path.basename(f)).join(", "));

// ---- each booklet: lint and the renderer
for(const file of files){
  const name=path.basename(file);
  const lint=spawnSync("python3",[path.join(R,"lint-booklet.py"),file],{encoding:"utf8"});
  const lines=lint.stdout.split("\n").filter(l=>/^(ERROR|warn)/.test(l));
  chk(`${name}: lints with no errors`,lint.status===0,lines.filter(l=>l.startsWith("ERROR")).join(" | "));
  chk(`${name}: and no warning at all`,lines.length===0,lines.join(" | "));

  const text=fs.readFileSync(file,"utf8");
  A.fresh();
  const P=A.parseFile(text);
  chk(`${name}: the renderer reads it, with nothing it could not read`,P.ok&&P.unread.length===0,JSON.stringify(P.unread));
  A.applyParsed(P,"replace");
  const mods=A.allModules();
  chk(`${name}: and keeps its module`,mods.length===1,`${mods.length} modules`);
  const declared=A.declaredLangs();
  chk(`${name}: it declares its one language and opens in it`,declared.length===1&&A.getLang()===declared[0],
    JSON.stringify({declared,lang:A.getLang()}));
  chk(`${name}: the language switch offers only the one it declares`,
    JSON.stringify(A.offeredLangs())===JSON.stringify(declared),JSON.stringify(A.offeredLangs()));
  const problems=[];
  const l=declared[0];
  let home="";
  try{A.setScreen("home");A.render();home=textOf(main());}catch(e){problems.push(`home: ${e.message}`);}
  for(const m of mods) if(!home.includes(A.tx(m.title,"\u0000"))) problems.push(`${m.id}: its title is not on the home page`);
  for(const act of mods.flatMap(A.activitiesOf)){
    for(const pg of A.pagesOf(act)){
      let shown="";
      try{A.setScreen(act.id);if(A.isPaged(act)) A.showPage(act.id,pg.id);A.render();shown=textOf(main());}
      catch(e){problems.push(`${act.id}/${pg.id}: ${e.message}`);continue;}
      for(const b of flat(pg.blocks)){
        if(!QUESTIONS.includes(b.type)||b.type==="widget") continue;
        // every question kind carries its title straight on the block,
        // exactly as written in its callout line
        const label=A.tx(b.label,"");
        if(!(label||"").trim()) problems.push(`${act.id}.${b.id}: a blank question`);
        else if(!shown.includes(label)) problems.push(`${act.id}.${b.id}: its question is not on its page`);
      }}}
  chk(`${name}: every activity and page draws, with each question's own words on it`,
    !problems.length,problems.slice(0,4).join("; "));
  const back=A.toMarkdown();A.fresh();A.applyParsed(A.parseFile(back),"replace");
  chk(`${name}: written back by the renderer and read again, it keeps its module and its language`,
    A.allModules().map(m=>m.id).join()===mods.map(m=>m.id).join()&&JSON.stringify(A.declaredLangs())===JSON.stringify(declared));
}

fs.rmSync(tmp,{recursive:true,force:true});
console.log(fails?`\n${fails} failed`:"\nall skill checks passed");
process.exit(fails?1:0);
