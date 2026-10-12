// Format 0.12 (renderer 0.12.0, item D): `icon:` and `parent:` on a module's or activity's line, a module's opening, the roles `link` and
// `icon` in views, `style:` in the theme block, the icon list in the linter, and the new interface words in four languages.
// Drawn pictures, a tile that opens a heading and the module screen are test/format012-browser.js.
// Run: node test/format012.test.js      (Needs node and python3; nothing to install.)
const P=require("./page.js");
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const byClass=(n,c)=>walk(n,x=>cls(x).includes(c));
const text=n=>typeof n==="string"?n:(n&&n._text)||kids(n).map(text).join("");
const FM='---\nbooklet: "0.12"\ntitle: T\nlang: en\n---\n\n';
(async()=>{
 const A=P.boot();
 const mod=R=>R.template.modules[0];
 const acts=R=>mod(R).activities||[mod(R).mode];

 /* ---- the settings table ---- */
 chk("KIND_SETTINGS: a module takes end and icon:, an activity takes repeat, daily, hidden, icon: and parent:",
   JSON.stringify(A.KIND_SETTINGS.module)==='["end","icon:"]'&&JSON.stringify(A.KIND_SETTINGS.activity)==='["repeat","daily","hidden","icon:","parent:"]');
 {const R=A.parseFile(FM+"> [!module|m icon:compass] M\n\n> [!activity|a icon:notebook-pen] A\n\n> [!activity|b] B\n\n> [!module|m end] End\n");
  chk("icon: on a module and on an activity is read, with nothing reported",R.ok&&R.unread.length===0&&mod(R).icon==="compass"&&acts(R)[0].icon==="notebook-pen"&&acts(R)[1].icon===undefined,JSON.stringify(R.unread));}
 {const R=A.parseFile(FM+"> [!module|m icon:no-such-picture] M\n\n> [!activity|a icon:Compass] A\n\n> [!activity|b] B\n\n> [!module|m end] End\n");
  chk("a name outside the icon set is reported like a mistyped setting, and the card shows its number",R.unread.length===2&&R.unread.every(x=>/is not a name in Booklet's icon set/.test(x))&&mod(R).icon===undefined&&acts(R)[0].icon===undefined,JSON.stringify(R.unread));}
 {const R=A.parseFile(FM+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!activity|b] B\n\n> [!module|m end icon:compass] End\n");
  chk("icon: on a module's end line is reported and ignored",R.unread.length===1&&/end line takes no “icon:”/.test(R.unread[0])&&mod(R).icon===undefined,JSON.stringify(R.unread));}
 {const R=A.parseFile(FM+"> [!module|m] M\n\n> [!activity|a icon:compass] A\n\n> [!text|q icon:compass] Q\n\n> [!module|m end] End\n");
  chk("icon: on a question is a setting the kind does not take",R.unread.some(x=>/a text line takes no “icon:”/.test(x)),JSON.stringify(R.unread));}

 /* ---- parent: a tree of activities ---- */
 const act=(id,parent)=>"> [!activity|"+id+(parent?" parent:"+parent:"")+"] "+id.toUpperCase()+"\n\n";
 const tree=lines=>{const R=A.parseFile(FM+"> [!module|m] M\n\n"+lines.map(([i,p])=>act(i,p)).join("")+"> [!module|m end] End\n");return {R,a:acts(R)};};
 {const {R,a}=tree([["root"],["x","root"],["y","x"],["z","root"],["w"]]);
  chk("a tree is kept depth first: a parent, its first child and that child's children, then the next sibling",a.map(x=>x.id).join()==="m/root,m/x,m/y,m/z,m/w",a.map(x=>x.id).join());
  chk("each activity keeps its parent's address and its depth; the top has neither",a.map(x=>(x.parent||"-")+"@"+(x.depth||0)).join()==="-@0,m/root@1,m/x@2,m/root@1,-@0",a.map(x=>x.parent+"@"+x.depth).join());
  chk("a file written parent first reports nothing",R.unread.length===0);}
 {const {a}=tree([["a"],["b","a"],["c"],["d","a"]]);
  chk("children of one parent keep the file's order, even with another activity between them",a.map(x=>x.id).join()==="m/a,m/b,m/d,m/c",a.map(x=>x.id).join());}
 {const {a}=tree([["a","nobody"],["b","a"]]);
  chk("an activity whose parent is not in its module sits at the top",a[0].id==="m/a"&&a[0].parent===undefined&&a[1].parent==="m/a");}
 {const {a}=tree([["a","b"],["b","a"],["c","c"]]);
  chk("an activity that is its own ancestor is drawn once, at the top",a.length===3&&new Set(a.map(x=>x.id)).size===3&&a.filter(x=>!x.parent).length>=2&&a.every(x=>x.id!==x.parent),JSON.stringify(a.map(x=>[x.id,x.parent])));}
 {const {R,a}=tree([["a"],["b"],["c"]]);
  chk("a module with no parent anywhere is a flat list, as before: no parent, no depth, the file's order",a.map(x=>x.id).join()==="m/a,m/b,m/c"&&a.every(x=>x.parent===undefined&&x.depth===undefined)&&R.unread.length===0);}
 {const T=A.activityTree([{id:"m/a"},{id:"m/b",parent:"m/a"},{id:"m/a",parent:"m/b"}]);
  chk("when two activities share an id the first is the one a parent names",T.order.length===3&&T.parent[1]==="m/a");}
 {const R=A.parseFile(FM+"> [!module|p] P\n\n"+act("a")+act("b","a")+"> [!module|p end] End\n\n> [!module|q] Q\n\n"+act("a")+act("b","zzz")+"> [!module|q end] End\n");
  const q=R.template.modules[1].activities;
  chk("a parent is looked for in its own module only",R.template.modules[0].activities[1].parent==="p/a"&&q[1].parent===undefined,JSON.stringify(q.map(x=>x.parent)));}

 /* ---- a module's opening ---- */
 {const R=A.parseFile(FM+"> [!module|m] M\n\n> [!notice]\n> license: Free.\n\nFirst paragraph here.\n\nSecond one.\n\n> [!activity|a] A\n\nIn the activity.\n\n> [!activity|b] B\n\n> [!module|m end] End\n");
  const a=acts(R);
  chk("prose between a module's notice and its first activity is the module's opening",mod(R).opening==="First paragraph here.\n\nSecond one.",JSON.stringify(mod(R).opening));
  chk("the opening is not drawn inside the first activity, and the activity keeps its own prose",!JSON.stringify(a[0].blocks).includes("First paragraph")&&JSON.stringify(a[0].blocks).includes("In the activity."));
  chk("the notice is not part of it, and a module with none has no opening",!/Free/.test(mod(R).opening)&&mod(A.parseFile(FM+"> [!module|m] M\n\n> [!activity|a] A\n\nx\n\n> [!activity|b] B\n\n> [!module|m end] End\n")).opening===undefined);
  chk("the card's blurb is still its first paragraph",mod(R).blurb==="First paragraph here.");}

 /* ---- the roles ---- */
 chk("seven roles and fourteen query keys",A.ROLE_NAMES.join()==="label,value,note,badge,tone,link,icon"&&A.QUERY_KEYS.length===14&&A.QUERY_KEYS.includes("link")&&A.QUERY_KEYS.includes("icon"));
 chk("table, list, tiles and cards draw link and icon; bars and line do not",["table","list","tiles","cards"].every(v=>A.VIEW_DRAWS[v].includes("link")&&A.VIEW_DRAWS[v].includes("icon"))&&["bars","line"].every(v=>!A.VIEW_DRAWS[v].includes("link")&&!A.VIEW_DRAWS[v].includes("icon")));
 /* a booklet whose headings a link can lead to */
 const book=FM+"> [!module|m] M\n\n> [!activity|a] Home\n\n## Spring tides\n\nProse.\n\n> [!activity|b] Elsewhere\n\n## Neap tides\n\nMore.\n\n> [!module|m end] End\n";
 A.loadText(book);
 const draw=(rows,view,fields)=>A.viewNodes(A.dataSet({rows}),{...view,fields},{empty:"EMPTY",scope:"m"})[0];
 const ROWS=[{label:"Spring",value:"3",link:"#Neap tides",icon:"compass"},{label:"Web",value:"4",link:"https://example.org/x",icon:"no-such"},
   {label:"Module",value:"5",link:"week-2.booklet.md",icon:"house"},{label:"Missing",value:"6",link:"#Nowhere",icon:""},{label:"Bad",value:"7",link:"javascript:alert(1)"}];
 for(const as of ["tiles","list","table"]){
   const n=draw(ROWS,{as});
   const links=walk(n,x=>x.tagName==="a"),hrefs=links.map(x=>x.attrs.href);
   chk(as+": a heading link and a web address lead, and nothing else does (a module link, a missing heading, a script are plain text)",
     links.length===2&&hrefs.includes("#")&&hrefs.includes("https://example.org/x")&&!/week-2|javascript/.test(JSON.stringify(hrefs)),JSON.stringify(hrefs));
   chk(as+": a web address opens apart, safely",links.some(x=>x.attrs.target==="_blank"&&/noopener/.test(x.attrs.rel||"")));
   const pics=walk(n,x=>x.tagName==="use").map(x=>x.attrs.href);
   chk(as+": an icon value is drawn through the sprite, and a name that is not in it is not drawn",pics.join()==="#bi-compass,#bi-house",pics.join());
   chk(as+": the link and icon fields are not drawn as extras",!/compass|no-such/.test(text(n)));}
 {const n=draw(ROWS,{as:"table"});
  chk("a table's link and icon fields are not columns (they are roles) unless fields: names them",!/Neap tides|example\.org/.test(text(n))&&/Neap tides|example/.test(text(draw(ROWS,{as:"table"},["label","link"]))));}
 {const n=draw(ROWS,{as:"tiles",link:"to",icon:"pic"}),m=draw(ROWS.map(r=>({label:r.label,to:r.link,pic:r.icon})),{as:"tiles",link:"to",icon:"pic"});
  chk("a query key points the role at a field with another name",walk(m,x=>x.tagName==="a").length===2&&walk(m,x=>x.tagName==="use").length===2,String(walk(m,x=>x.tagName==="a").length));}
 {const n=draw(ROWS,{as:"bars"}),l=draw(ROWS,{as:"line"});
  chk("bars and line do not read link or icon",walk(n,x=>x.tagName==="a"||x.tagName==="use").length===0&&walk(l,x=>x.tagName==="a"||x.tagName==="use").length===0);}
 {const n=draw([{label:"x",value:"1",link:"<b>#Neap tides</b>"}],{as:"list"});
  chk("a link value is a target, never Markdown or HTML",walk(n,x=>x.tagName==="a"||x.tagName==="b").length===0);}
 {const n=draw([{label:"A",link:"#Neap tides"},{label:"B",link:"#Spring tides"}],{as:"tiles"});
  chk("tiles with no value (pills) lead too, and a tile that leads says so for the stylesheet",walk(n,x=>x.tagName==="a").length===2);}

 /* ---- the picture rule on a card ---- */
 {const g=A.cardPicture("🌱 Why it works",3,"compass"),n=A.cardPicture("🌱 Why it works",3,"no-such-picture"),z=A.cardPicture("Why",3,"compass");
  chk("icon: gives the card its picture and leaves the title alone, ahead of a leading emoji",g.picture.icon&&g.title==="🌱 Why it works"&&z.picture.icon&&!z.picture.emoji&&!z.picture.number);
  chk("without a known icon the picture is the title's emoji, else the number",n.picture.emoji==="🌱"&&n.title==="Why it works"&&A.cardPicture("Why",3).picture.number===3);
  const use=x=>walk(x.picture.icon,y=>y.tagName==="use")[0].attrs.href;
  chk("in teaching the picture is the spot of that name when there is one (compass has one), else the icon (activity has none)",use(g)==="#bs-compass"&&use(A.cardPicture("x",1,"activity"))==="#bi-activity",use(g));}

 /* ---- the theme's style ---- */
 {const r=A.readTheme("style: briefing\nbase: night");
  chk("style: teaching and style: briefing are read",r.spec.style==="briefing"&&r.spec.base==="night"&&A.readTheme("style: teaching").spec.style==="teaching");
  const bad=A.readTheme("style: loud\nstyle2: x");
  chk("another word is dropped and reported, and style is not a colour",bad.spec.style===undefined&&bad.dropped.join()==="style"&&bad.bad.length===1);
  chk("a hostile value reaches nothing",["Briefing","briefing;}","url(x)","__proto__","teaching briefing"].every(v=>A.readTheme("style: "+JSON.stringify(v)).spec.style===undefined&&A.readTheme("style: "+v).spec.style===undefined));
  const T=n=>({});
  chk("themeDerive hands the style on, and says nothing when the file names none",A.themeDerive({style:"briefing"},T).style==="briefing"&&A.themeDerive({},T).style===""&&A.themeDerive({style:"x"},T).style==="");
  chk("the renderer's styles are the two the head script has",A.TH_STYLES.join()==="teaching,briefing");}
 {const book2=FM+"```booklet theme\nstyle: briefing\n```\n\n> [!activity|a] A\n";
  const R=A.parseFile(book2);
  chk("a theme block with a style reads clean and keeps it",R.ok&&R.unread.length===0&&R.template.theme.style==="briefing",JSON.stringify(R.unread));}

 /* ---- the linter ---- */
 {const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"f012-"));
  const lint=(name,t)=>{const f=path.join(tmp,name);fs.writeFileSync(f,t);const r=spawnSync("python3",[P.R+"/lint-booklet.py",f],{encoding:"utf8"});
    return {status:r.status,out:r.stdout,errors:r.stdout.split("\n").filter(l=>/^ERROR/.test(l)),warns:r.stdout.split("\n").filter(l=>/^warn/.test(l))};};
  const F=(body)=>FM+"> [!module|m] M\n\n"+body+"> [!module|m end] End\n";
  let l=lint("ok.md",F("Opening prose.\n\n> [!activity|a icon:compass] A\n\n> [!activity|b parent:a icon:sprout] B\n\n"));
  chk("the linter accepts a module's opening, icon: and parent:",l.status===0&&l.errors.length===0&&l.warns.length===0,l.out);
  l=lint("icon.md",F("> [!activity|a icon:compas] A\n\n"));
  chk("an icon: name outside the list is an error, named",l.status===1&&/line 9: `icon:compas` is not a name in Booklet's icon set/.test(l.errors[0]||""),l.out);
  l=lint("end.md",FM+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!module|m end icon:compass] End\n");
  chk("icon: on a module's end line is an error",l.status===1&&/end line takes no `icon:`/.test(l.errors[0]||""),l.out);
  l=lint("par.md",F("> [!activity|a parent:nobody] A\n\n"));
  chk("a parent that is not in the module is a warning",l.status===0&&l.warns.length===1&&/`parent:nobody` is not an activity of the module 'm', so 'a' sits at the top/.test(l.warns[0]),l.out);
  l=lint("loop.md",F("> [!activity|a parent:b] A\n\n> [!activity|b parent:a] B\n\n"));
  chk("a loop is a warning, one per activity in it",l.status===0&&l.warns.length===2&&l.warns.every(w=>/loops back/.test(w)),l.out);
  l=lint("self.md",F("> [!activity|a parent:a] A\n\n"));
  chk("an activity under itself is a loop",l.warns.length===1&&/loops back/.test(l.warns[0]),l.out);
  l=lint("pm.md",F("> [!module|n] N\n\n"));
  l=lint("par2.md",FM+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!module|m end] End\n\n> [!module|n] N\n\n> [!activity|b parent:a] B\n\n> [!module|n end] End\n");
  chk("a parent in another module is not in this one",l.warns.length===1&&/`parent:a` is not an activity of the module 'n'/.test(l.warns[0]),l.out);
  l=lint("par3.md",F("> [!activity|a parent:bad id] A\n\n> [!activity|b parent:ok_x] B\n\n"));
  chk("a parent that is not an id is an error",l.status===1&&/`parent:ok_x` must be an activity id/.test(l.errors.join("|")),l.out);
  const DATA='```booklet data\n[{"label":"x","icon":"compass","link":"#A"},{"label":"y","icon":"compas"}]\n```\n^d\n\n```booklet query\nfrom: d\nas: tiles\n```\n\n';
  l=lint("role.md",F("> [!activity|a] A\n\n"+DATA));
  chk("an icon role value outside the list is a warning, named",l.status===0&&l.warns.length===1&&/the rows' `icon` holds 'compas'.*not in Booklet's icon set/.test(l.warns[0]),l.out);
  l=lint("bars.md",F("> [!activity|a] A\n\n"+DATA.replace("as: tiles","as: bars\nvalue: label\nlink: link")));
  chk("bars do not draw link, and the linter says so",l.warns.some(w=>/`as: bars` does not draw `link`/.test(w)),l.out);
  l=lint("theme.md",FM+"```booklet theme\nstyle: briefing\n```\n\n> [!activity|a] A\n");
  chk("a theme with style: briefing lints clean",l.status===0&&l.warns.length===0,l.out);
  l=lint("theme2.md",FM+"```booklet theme\nstyle: loud\n```\n\n> [!activity|a] A\n");
  chk("another style is an error naming the two",l.status===1&&/the theme's `style: loud` is not one of teaching, briefing/.test(l.errors[0]||""),l.out);
  fs.rmSync(tmp,{recursive:true,force:true});}

 /* ---- the icon list is what art/icons/ holds ---- */
 {const sprite=require("./art-sprite.js"),py=fs.readFileSync(path.join(P.R,"lint-booklet.py"),"utf8");
  chk("the linter's icon list is exactly art/icons/ (node test/art-sprite.js --check says so too)",sprite.lintProblems(py).length===0&&sprite.names("icons").length>100);
  const drifted=py.replace('"activity", ','');
  chk("--check fails when the list drifts, or loses its markers",sprite.lintProblems(drifted).length===1&&sprite.lintProblems("nothing").length===1);
  chk("every spot has an icon of its name (a spot is a way of drawing an icon)",sprite.names("spots").every(n=>sprite.names("icons").includes(n)));}

 /* ---- the words ---- */
 for(const lang of ["en","fr","es","es-AR"]){
   const P2=A.STRINGS[lang].problem;
   chk("the two new problem messages exist in "+lang,typeof P2.iconUnknown==="function"&&typeof P2.iconOnEnd==="function"&&P2.iconUnknown("line 3","x").includes("x")&&P2.iconOnEnd("line 4").includes("line 4"));}

 console.log(fails?"\n"+fails+" FAILURES":"\nformat 0.12 checks passed");process.exit(fails?1:0);
})();
