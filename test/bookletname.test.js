// Format v0.11, a booklet has one name: the `title:` in its own front matter. The home screen's heading, its row in
// "Your booklets", the download's file name and the saved file all show that one value, it is written from the first
// moment, the reader can rename it, and adding a module never changes it. Invented content throughout.
// Run: node test/bookletname.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const {find,hasClass,texts}=P;
const titleOf=md=>{const m=md.match(/^title:[ \t]*(.*)$/m);if(!m) return null;const v=m[1].trim();try{return /^"/.test(v)?JSON.parse(v):v;}catch(e){return v;}};
const MOD=(title,id="mod-one")=>`---\nbooklet: "0.11"\ntitle: ${JSON.stringify(title)}\nlang: en\n---\n\n> [!module|${id}] ${title}\n\n> [!activity|act repeat] Act\n\n> [!text|q long] Q\n\n> [!module|${id} end] End\n`;
const press=(node,key)=>node._on.keydown({key,preventDefault(){},stopPropagation(){}});
/* the Rename button on the home screen, the input it opens */
const renameHome=(A,name,key="Enter")=>{
  const btn=find(P.main(),n=>n.tagName==="button"&&/Rename/.test(texts(n)))[0];btn._on.click();
  const inp=find(P.main(),hasClass("nameedit"))[0];inp.value=name;press(inp,key);return inp;};
const heading=()=>texts(find(P.main(),n=>n.tagName==="h1")[0]);
const changed=X=>{const e=X.readLib().entries.find(x=>x.id===X.currentId);return !!e&&e.dirty===true;};
(async()=>{
 const A=P.boot();
 const U="Untitled booklet";
 /* ---- a new booklet: one name, everywhere, from the first moment ---- */
 const e=await A.createBooklet();
 chk("a new booklet's front matter is there at once: marker, title, lang",/^---\nbooklet: "0\.11"\ntitle: "Untitled booklet"\nlang: en\n---\n$/.test(A.BOOK.raw.source),JSON.stringify(A.BOOK.raw.source));
 A.render();
 const fileName=()=>A.exportName();
 chk("its screen says Untitled booklet, and its file says it too",heading()===U&&titleOf(A.toMarkdown())===U,heading());
 chk("the download is named for it",fileName()==="untitled-booklet.booklet.md",fileName());
 const listText=()=>{A.screen="@booklets";A.render();const t=texts(P.main());A.screen="home";return t;};
 {const id=A.currentId;A.flushSave();const BL=P.boot();BL.screen="@booklets";const rows=()=>{BL.render();return find(P.main(),hasClass("mode")).map(n=>texts(n));};
  const row=rows();chk("and so does its row in Your booklets",row.length===1&&row[0].startsWith(U),JSON.stringify(row));}
 chk("the tab is named for it",A.tabName()===U);
 /* ---- Rename on the home screen ---- */
 A.render();
 {const NAME="Sleep & mood, spring";
  renameHome(A,NAME);
  chk("renaming on the home screen changes the heading",heading()===NAME,heading());
  chk("the file's title line says it, as a quoted string, and nothing else in the front matter changed",titleOf(A.toMarkdown())===NAME&&/^---\nbooklet: "0\.11"\ntitle: "Sleep & mood, spring"\nlang: en\n---\n$/.test(A.BOOK.raw.source),A.BOOK.raw.source);
  chk("the download's name follows",A.exportName()==="sleep-mood-spring.booklet.md",A.exportName());
  chk("the booklet is marked as changed",changed(A));
  chk("the tab and the library row follow, at once",A.tabName()===NAME&&(()=>{A.flushSave();const B=P.boot();B.render();return find(P.main(),hasClass("mode")).some(n=>texts(n).startsWith(NAME));})());}
 /* survives save, reload, download then open */
 {const id=A.currentId;A.flushSave();P.closePages();
  const B=P.boot();B.openBooklet(id);B.render();
  chk("it survives a save and a reload: heading, title line and download name",heading()==="Sleep & mood, spring"&&titleOf(B.toMarkdown())==="Sleep & mood, spring"&&B.exportName()==="sleep-mood-spring.booklet.md");
  B.addModuleText(MOD("A module with its own title"));
  chk("adding a module with a different title leaves the booklet's name alone",heading()==="Sleep & mood, spring"||(B.render(),heading()==="Sleep & mood, spring"));
  chk("and the file still names the booklet, not the module",titleOf(B.toMarkdown())==="Sleep & mood, spring"&&B.BOOK.head.title==="Sleep & mood, spring"&&B.allModules()[0].title==="A module with its own title");
  const md=B.toMarkdown();
  P.closePages();P.wipe&&0;
  const C=P.boot();await C.createBooklet();
  const r=C.loadText(md);
  chk("download, then open: the downloaded file opens as a booklet with the same name",titleOf(C.toMarkdown())==="Sleep & mood, spring"&&C.BOOK.head.title==="Sleep & mood, spring",C.BOOK&&C.BOOK.head&&C.BOOK.head.title);}
 /* the awkward names */
 for(const NAME of ['He said "hi": a #1 \\ name','Tab:\tcolon #hash "quotes" \\back','<b>bold</b> *star* [x](javascript:alert(1)) `tick`',"Ünïcode – ✓ 名前","# not a heading"]){
  const B=P.boot();await B.createBooklet();B.render();
  renameHome(B,NAME);
  const want=NAME.replace(/\s+/g," ").trim();
  const md=B.toMarkdown(),R=B.parseFile(md);
  chk("the name "+JSON.stringify(NAME)+" round-trips through the file, and shows as text",titleOf(md)===want&&R.template.title===want&&heading()===want&&find(P.main(),n=>["b","script","a","em"].includes(n.tagName)&&hasClass("nameedit")(n)===false&&n!==undefined&&texts(n).includes("bold")).length===0,JSON.stringify([titleOf(md),R.template.title,heading()]));
  chk("  and the front matter is still just those lines",md.split("\n").slice(0,5).join("\n")===`---\nbooklet: "0.11"\ntitle: ${JSON.stringify(want)}\nlang: en\n---`,md.slice(0,200));
  P.closePages();}
 /* Escape cancels, empty keeps */
 {const B=P.boot();await B.createBooklet();B.render();
  renameHome(B,"Typed then escaped","Escape");
  chk("Escape cancels: the name is as it was",heading()===U&&titleOf(B.toMarkdown())===U&&!changed(B),heading());
  renameHome(B,"   ");
  chk("an empty name keeps the old one",heading()===U&&titleOf(B.toMarkdown())===U);
  renameHome(B,"  Spaced   out   ");
  chk("spaces are tidied",heading()==="Spaced out"&&titleOf(B.toMarkdown())==="Spaced out");
  renameHome(B,"x".repeat(300));
  chk("a name is at most 200 characters",titleOf(B.toMarkdown()).length===200);
  P.closePages();}
 /* a booklet opened from a file can be renamed too, and only its title line changes */
 {const B=P.boot();await B.createBooklet();
  const file=MOD("Opened from a file","mod-file");
  B.loadText(file);B.screen="home";B.render();
  chk("a booklet opened from a file shows the file's title",heading()==="Opened from a file");
  renameHome(B,"My own name");
  const was=file.split("\n"),now=B.toMarkdown().split("\n").slice(0,was.length);
  const diff=was.map((l,i)=>[l,now[i]]).filter(([a,b])=>a!==b);
  chk("renamed, only the title line of its source changed",heading()==="My own name"&&diff.length===1&&/^title: /.test(diff[0][0])&&diff[0][1]==='title: "My own name"',JSON.stringify(diff));
  B.flushSave();const id=B.currentId;P.closePages();
  const C=P.boot();C.openBooklet(id);C.render();
  chk("and it survives a reload",heading()==="My own name"&&C.exportName()==="my-own-name.booklet.md");
  P.closePages();}
 /* setTitleIn: line endings, a missing title line, a file with no front matter */
 {const A2=P.boot();
  const crlf='---\r\nbooklet: "0.11"\r\ntitle: Old\r\nlang: en\r\n---\r\n\r\nBody\r\n';
  chk("a file with CRLF line endings keeps them, and every other line",A2.setTitleIn(crlf,"New","en")==='---\r\nbooklet: "0.11"\r\ntitle: "New"\r\nlang: en\r\n---\r\n\r\nBody\r\n');
  chk("a front matter with no title gets one, after the marker",A2.setTitleIn('---\nbooklet: "0.11"\nlang: en\n---\n\nBody\n',"New","en")==='---\nbooklet: "0.11"\ntitle: "New"\nlang: en\n---\n\nBody\n');
  chk("a text with no front matter gets one, and keeps its body",A2.setTitleIn("Body\n","New","fr")==='---\nbooklet: "0.11"\ntitle: "New"\nlang: fr\n---\n\nBody\n');
  chk("a quote and a backslash are escaped",A2.setTitleIn('---\ntitle: x\n---\n','a "b" \\ c',"en")==='---\ntitle: "a \\"b\\" \\\\ c"\n---\n');
  P.closePages();}
 /* a rename from Your booklets, on a booklet that is not open */
 {P.closePages();for(const k of Object.keys(global.__ls)) delete global.__ls[k];
  const B=P.boot();const one=await B.createBooklet();B.addModuleText(MOD("First module","mod-first"));B.flushSave();
  const two=await B.createBooklet();B.flushSave();B.closeBooklet();
  B.screen="@booklets";B.render();
  const cards=()=>find(P.main(),hasClass("mode"));
  chk("two booklets are listed, each by its name",cards().length===2&&cards().some(n=>texts(n).startsWith(U)));
  const rename=(i,name,key="Enter")=>{const btn=find(cards()[i],n=>n.tagName==="button"&&/^Rename$/.test(texts(n)))[0];btn._on.click();
    const inp=find(P.main(),hasClass("nameedit"))[0];inp.value=name;press(inp,key);};
  const order=cards().map(n=>texts(n));
  const i1=cards().findIndex(n=>/First module/.test(texts(n))||true);
  rename(0,"Renamed in the list");
  chk("a rename in the row changes the row at once",cards().some(n=>texts(n).startsWith("Renamed in the list")),JSON.stringify(cards().map(n=>texts(n))));
  const renamedId=B.readLib().entries.find(x=>x.title==="Renamed in the list").id;
  B.openBooklet(renamedId);B.render();
  chk("opened, the booklet's screen, its file and its download name say it",heading()==="Renamed in the list"&&titleOf(B.toMarkdown())==="Renamed in the list"&&B.exportName()==="renamed-in-the-list.booklet.md",heading());
  chk("it is marked as changed, in the list too",B.readLib().entries.find(x=>x.id===renamedId).dirty===true);
  /* the other booklet is untouched, and its modules still come with it */
  const other=B.readLib().entries.find(x=>x.id!==renamedId);
  chk("the other booklet's name is untouched",other.title!=="Renamed in the list");
  /* a booklet kept before it had a design (0.9): no snapshot at all */
  B.closeBooklet();
  const ghost=B.readLib().entries.find(x=>x.id!==renamedId);
  delete global.__ls["booklet.b."+ghost.id];
  B.screen="@booklets";B.render();
  const gi=cards().findIndex(n=>!texts(n).startsWith("Renamed"));
  rename(gi,"Named after the fact");
  B.openBooklet(ghost.id);B.render();
  chk("a booklet with no saved design can be renamed from the list too",heading()==="Named after the fact"&&titleOf(B.toMarkdown())==="Named after the fact",heading());
  chk("Escape in the list changes nothing",(()=>{B.closeBooklet();B.screen="@booklets";B.render();const before=JSON.stringify(B.readLib().entries.map(x=>x.title));rename(0,"Nope","Escape");return JSON.stringify(B.readLib().entries.map(x=>x.title))===before;})());
  P.closePages();}
 /* a booklet kept by 0.9 with a module and the old default title, but no title on screen: the screen and the file agree once it is renamed */
 {P.closePages();for(const k of Object.keys(global.__ls)) delete global.__ls[k];
  const B=P.boot();await B.createBooklet();B.addModuleText(MOD("Module title","mod-m"));B.flushSave();
  const id=B.currentId,key="booklet.b."+id,snap=JSON.parse(global.__ls[key]);
  delete snap.TPL.title;delete snap.TPL.head;snap.TPL.booklet=0.9;
  snap.TPL.raw.source=snap.TPL.raw.source.replace(/^booklet: .*$/m,"booklet: 0.9").replace(/^title: .*$/m,'title: "Untitled booklet"');
  global.__ls[key]=JSON.stringify(snap);P.closePages();
  const C=P.boot();C.openBooklet(id);C.render();
  chk("a booklet saved by 0.9 opens as it was saved and says Untitled booklet in its file",C.BOOK.booklet===0.9&&titleOf(C.toMarkdown())==="Untitled booklet"&&/^booklet: 0\.9$/m.test(C.toMarkdown()));
  renameHome(C,"Now named");
  chk("renamed, its screen and its file agree",heading()==="Now named"&&titleOf(C.toMarkdown())==="Now named"&&C.parseFile(C.toMarkdown()).ok);
  P.closePages();}
 console.log(fails?"\n"+fails+" FAILURES":"\nall booklet-name checks passed");process.exit(fails?1:0);
})();
