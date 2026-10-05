// A booklet with a name and no module yet is a booklet: it downloads, and the download opens again.
// Run: node test/emptybooklet.test.js
const P=require("./page.js");const fs=require("fs"),path=require("path"),os=require("os"),cp=require("child_process");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
(async()=>{
 const A=P.boot();await A.createBooklet();
 const heading=()=>P.texts(P.find(P.main(),n=>n.tagName==="h1")[0]);
 A.render();
 const btn=P.find(P.main(),n=>n.tagName==="button"&&/Rename/.test(P.texts(n)))[0];btn._on.click();
 const inp=P.find(P.main(),P.hasClass("nameedit"))[0];inp.value='Empty "one": #1';inp._on.keydown({key:"Enter",preventDefault(){},stopPropagation(){}});
 const md=A.toMarkdown();
 const R=A.parseFile(md);
 chk("the empty booklet's own download parses ok, as empty, with its name",R.ok&&R.empty&&R.template.title==='Empty "one": #1'&&R.refused.length===0,JSON.stringify([R.ok,R.unread]));
 const B=P.boot();await B.createBooklet();B.loadText(md);B.screen="home";B.render();
 chk("opened, it is an empty booklet with that name and Add a module",heading()==='Empty "one": #1'&&B.allModules().length===0&&/Add a module/.test(P.texts(P.main())),P.texts(P.main()).slice(0,200));
 chk("and its download round-trips byte for byte",B.toMarkdown()===md);
 chk("Add a module on such a file still says it holds no module",A.moduleTextProblems(md).join()===A.STRINGS.en.problem.noModule,JSON.stringify(A.moduleTextProblems(md)));
 chk("a module with no activity is still refused",!A.parseFile(md+"\n> [!module|m] M\n\n> [!module|m end] E\n").ok);
 const f=path.join(os.tmpdir(),"empty-"+process.pid+".md");fs.writeFileSync(f,md);
 const l=cp.spawnSync("python3",[P.R+"/lint-booklet.py",f],{encoding:"utf8"});fs.unlinkSync(f);
 chk("the linter: no error, one warning that it holds nothing yet",l.status===0&&/ 0 errors · 1 warning/.test(l.stdout)&&/holds nothing yet/.test(l.stdout),l.stdout);
 P.closePages();console.log(fails?"\n"+fails+" FAILURES":"\nempty-booklet checks passed");process.exit(fails?1:0);
})();
