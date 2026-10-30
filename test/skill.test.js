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
;Object.assign(A,{parseFile,applyParsed,toMarkdown,render,allModules,showPage,
  tx,
  setScreen:v=>{screen=v},getLang:()=>lang,bookLang:()=>tableTag((BOOK.raw||{}).lang),
  fresh:()=>{STATE=emptyState();DRAFTS=emptyDrafts();BOOK=EMPTY_BOOKLET;
    screen="@home";lang="en";}});`);

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
const worked=skill.slice(skill.indexOf("## 12. Worked examples"));
const examples=[...worked.matchAll(/````markdown\n([\s\S]*?)\n````/g)].map(m=>m[1]+"\n");
chk("SKILL.md carries four worked examples",examples.length===4);
/* the check-in with a wiki tab (0.17: pages are page lines in a tab; parent: is a page's setting, no longer an activity's) */
{const m=/A check-in with a wiki tab[\s\S]*?````markdown\n([\s\S]*?)\n````/.exec(skill);
 chk("SKILL.md shows a check-in with a wiki tab: page lines, two with parent:, none on an activity line",!!m&&(m[1].match(/\[!page\|/g)||[]).length>=5&&(m[1].match(/\[!page\|[^\]]*parent:/g)||[]).length>=2&&!/\[!activity\|[^\]]*parent:/.test(m[1])&&/\[!tab\|wiki\]/.test(m[1])&&/entries:folded/.test(m[1])&&/^description: /m.test(m[1]));
 if(m){const f=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"booklet-wiki-")),"wiki.booklet.md");fs.writeFileSync(f,m[1]+"\n");
  const lint=spawnSync("python3",[path.join(R,"lint-booklet.py"),f],{encoding:"utf8"});
  chk("the check-in lints clean",lint.status===0&&!/^(ERROR|warn)/m.test(lint.stdout),lint.stdout);
  A.fresh();A.applyParsed(A.parseFile(m[1]+"\n"),"replace");
  chk("and loads (what the renderer makes of a page line is lane R's, tested there)",!!A.allModules()[0]&&A.allModules()[0].activities.length===1);}}

/* the skeleton in section 4 lints clean as it stands: its ids and language are real ones, not placeholders */
{const sk=/## 4\. The file skeleton[\s\S]*?````markdown\n([\s\S]*?)\n````/.exec(skill);
 chk("SKILL.md carries a file skeleton",!!sk);
 if(sk){const f=path.join(tmp,"skeleton.booklet.md");fs.writeFileSync(f,sk[1]+"\n");
  const lint=spawnSync("python3",[path.join(R,"lint-booklet.py"),f],{encoding:"utf8"});
  chk("the skeleton lints with 0 errors and 0 warnings",lint.status===0&&/0 errors · 0 warnings/.test(lint.stdout),lint.stdout);
  A.fresh();const P=A.parseFile(sk[1]+"\n");
  chk("and the renderer reads it with nothing it could not read",P.ok&&P.unread.length===0,JSON.stringify(P.unread));}}
/* the icon names SKILL.md lists are the ones art/icons/ holds (node test/art-sprite.js --write booklet.html rewrites the block) */
{const sprite=require("./art-sprite.js");
 chk("SKILL.md lists the icon names art/icons/ holds",sprite.skillProblems(skill).length===0,sprite.skillProblems(skill).join("; "));}
/* the guide teaches a solution, and no clinical example is left in it */
chk("SKILL.md teaches a solution callout with an example",/> \[!solution\]- Solution\n/.test(skill));
chk("SKILL.md has no symptom questionnaire, PHQ item or mood rating among its examples",!/phq|bothered by|\[!scale\|mood\]|symptom questionnaire/i.test(skill));
{const spec=fs.readFileSync(path.join(R,"SPEC.md"),"utf8");
 chk("SPEC.md has no symptom questionnaire, PHQ item, mood rating, feelings list or clinical practice name among its examples",!/phq|bothered by|\bmood\b|symptom|feelings|mensio|do you feel it|depress/i.test(spec),(spec.match(/phq|bothered by|\bmood\b|symptom|feelings|mensio|do you feel it|depress/ig)||[]).join(","));}

const files=[
  ...examples.map((t,i)=>{const f=path.join(tmp,`worked-example-${i+1}.booklet.md`);fs.writeFileSync(f,t);return f;}),
  ...fs.readdirSync(path.join(__dirname,"fixtures")).filter(n=>/^skill-.*\.booklet\.md$/.test(n)).sort()
    .map(n=>path.join(__dirname,"fixtures",n))];
chk("four worked examples and three booklets built from SKILL.md are kept as fixtures",files.length===7,files.map(f=>path.basename(f)).join(", "));

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
  const declared=A.bookLang();
  A.setScreen("@home");A.render();
  chk(`${name}: it declares its one language, and a reader who chose none reads it in that language`,!!declared&&A.getLang()===declared,
    JSON.stringify({declared,lang:A.getLang()}));
  const problems=[];
  let home="";
  try{A.setScreen("@home");A.render();home=textOf(main());}catch(e){problems.push(`home: ${e.message}`);}
  for(const m of mods) if(!home.includes(A.tx(m.title,"\u0000"))) problems.push(`${m.id}: its title is not on the home page`);
  for(const act of mods.flatMap(m=>m.activities)){
    for(const pg of act.pages){
      let shown="";
      try{A.setScreen(act.id);if(act.pages.length>1) A.showPage(act.id,pg.id);A.render();shown=textOf(main());}
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
    A.allModules().map(m=>m.id).join()===mods.map(m=>m.id).join()&&A.bookLang()===declared);
}

fs.rmSync(tmp,{recursive:true,force:true});
console.log(fails?`\n${fails} failed`:"\nall skill checks passed");
process.exit(fails?1:0);
