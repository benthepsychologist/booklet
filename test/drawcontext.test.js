// One drawing context (0.13.1, review R3): the view in one object, a draw context handed down, and drawing that writes
// nothing of the booklet's, the reader's, the screen's or the language's.
//
// - The one-at-a-time and fold-switch preferences are kept under the booklet's library entry, so two booklets started here
//   (which once both had the id local/booklet) keep their own; a booklet opened by a link keeps its own across opens.
// - The view (VIEW) holds one record per activity address and is cleared in one place.
// - Drawing every screen leaves the reader's work, `dirty`, the language and the screen as they were. So does a booklet whose
//   diagram part cannot be had (item 11), through its failed load and the source drawn after it, and the part is asked for
//   once per open of the booklet.
// - The activities outside every module fence are one module: a footnote one of them defines is found from another.
//
// Run: node test/drawcontext.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const LS=global.__ls;
const byClass=(n,c)=>P.find(n,P.hasClass(c));
const click=n=>n._on.click({target:n,currentTarget:n,preventDefault(){}});
const FM=t=>'---\nbooklet: "0.13"\ntitle: '+t+'\nlang: en\n---\n\n';
/* a module with a page of three questions (one at a time is offered) and a page of two callouts the author folded (the fold
   switch is offered) */
const MOD=FM("Steps")+"> [!module|steps] Steps\n\n> [!activity|ask] Ask\n\n> [!text|q1] One?\n\n> [!text|q2] Two?\n\n> [!text|q3] Three?\n\n"+
  "> [!activity|read] Read\n\n> [!note]- First\n> One paragraph.\n\n> [!tip]- Second\n> Another.\n\n> [!module|steps end] End\n";
const oneAtATime=A=>{const on=byClass(P.main(),"oat-ctl")[0];return !!on&&P.find(on,n=>n.tagName==="button"&&n.attrs["aria-pressed"]==="true").map(P.texts).join()==="One at a time";};
const pressStep=(label)=>{const b=P.find(byClass(P.main(),"oat-ctl")[0],n=>n.tagName==="button"&&P.texts(n)===label)[0];click(b);};
const folds=()=>byClass(P.main(),"au-fold");
const allOpen=()=>folds().length===2&&folds().every(d=>d.attrs.open!==undefined);
const allShut=()=>folds().length===2&&folds().every(d=>d.attrs.open===undefined);

(async()=>{
 /* ---- preferences are the booklet's entry's ---- */
 P.wipe();const A=P.boot();
 const a=await A.createBooklet();A.addModuleText(MOD);A.flushSave();
 const b=await A.createBooklet();A.addModuleText(MOD);A.flushSave();
 chk("two booklets started here, both untitled, have one id between them, as their text says",A.BOOK.id==="untitled-booklet");
 A.openBooklet(a.id);A.screen="steps/ask";A.render();
 chk("the first starts with every question shown",!oneAtATime(A));
 pressStep("One at a time");
 chk("its reader takes them one at a time",oneAtATime(A));
 A.screen="steps/read";A.render();
 click(P.find(P.main(),n=>n.tagName==="button"&&n.attrs.role==="switch"&&P.texts(n)==="Open all")[0]);
 A.render();
 chk("and opens every callout the author folded on its reading page, with the switch",allOpen());
 A.openBooklet(b.id);A.screen="steps/ask";A.render();
 chk("the second booklet keeps its own choice: every question shown",!oneAtATime(A));
 A.screen="steps/read";A.render();
 chk("and its own folding: the callouts as the author folded them",allShut());
 A.openBooklet(a.id);A.screen="steps/ask";A.render();
 chk("back in the first, its choice holds",oneAtATime(A));
 chk("each is kept under the booklet's library entry",LS["booklet.ui.steps."+a.id]==="one"&&!("booklet.ui.steps."+b.id in LS)&&LS["booklet.ui.folds."+a.id]==="open");
 {const B=P.boot();B.openBooklet(a.id);B.screen="steps/ask";B.render();
  chk("and outlives a reload",oneAtATime(B));}
 /* a preference an earlier release kept under the booklet's own id still reads, until the booklet's own is set */
 P.wipe();{const C=P.boot();LS["booklet.ui.steps.steps-file"]="one";
  C.loadText(MOD.replace("title: Steps","title: Steps\nid: steps-file"));C.screen="steps/ask";C.render();
  chk("a preference kept under the booklet's id by an earlier release is still read",oneAtATime(C));
  pressStep("All at once");
  chk("and the choice made now is the entry's",LS["booklet.ui.steps."+C.currentId]==="all"&&!oneAtATime(C));}
 /* a booklet opened by a link is known by its link, the same each time it opens */
 P.wipe();{const D=P.boot();const via={store:true,label:"steps.md",from:"store:steps.md"};
  D.openAsView(MOD,via);D.screen="steps/ask";D.render();pressStep("One at a time");const first=D.currentId;D.closeBooklet();
  D.openAsView(MOD,via);D.screen="steps/ask";D.render();
  chk("a booklet opened by a link keeps its choice the next time the link opens it, unkept",D.currentId!==first&&oneAtATime(D)&&LS["booklet.ui.steps.store:steps.md"]==="one");}

 /* ---- the view: one object, cleared in one place ---- */
 P.wipe();{const E=P.boot();E.loadText(MOD);E.screen="steps/read";E.render();
  chk("the view holds a record for each activity drawn, by its address",E.VIEW.at.has("steps/read"));
  E.showPage("steps/ask","p1");
  chk("the page on show is that record's",E.viewAt("steps/ask").page==="p1");
  const r=E.removeModule("steps");
  chk("removing a module takes its activities' records with it",r.ok&&!E.VIEW.at.has("steps/read")&&!E.VIEW.at.has("steps/ask"));
  E.loadText(MOD);E.screen="steps/read";E.render();E.viewAt("steps/read").pin=true;const id=E.currentId;
  E.closeBooklet();
  chk("closing the booklet leaves the list a view of its own, empty",E.VIEW.at.size===0&&E.VIEW.wiki.q==="");
  E.openBooklet(id);
  chk("opening it again in the visit brings back its view: its frame shown whole, as it was",!!E.VIEW.at.get("steps/read")&&E.VIEW.at.get("steps/read").pin===true);}

 /* ---- a booklet opened again in the visit shows what it showed; Clear everything and a newer file start it afresh ---- */
 P.wipe();{const F=P.boot();
  const PAGED=FM("Paged")+"> [!module|pg] Paged\n\n> [!activity|ask] Ask\n\n> [!text|q1] One?\n\n> [!text|q2] Two?\n\n> [!text|q3] Three?\n\n---\n\n## Later\n\nMore words.\n\n"+
    "> [!activity|log repeat] Log\n\n> [!text|t] Today?\n\n> [!module|pg end] End\n";
  await F.createBooklet();F.addModuleText(PAGED);F.keptFor("pg/log").push({ts:"2026-10-01T09:00:00Z",t:"kept"});F.flushSave();const id=F.currentId;
  const step=()=>byClass(P.main(),"oat-unit").findIndex(n=>n.attrs.hidden===undefined);
  /* the page on show, from the pager's "Page N of M" (0 for the first) */
  const page=()=>{const at=F.screen==="pg/ask"&&byClass(P.main(),"pg-at")[0],m=at&&/Page (\d+) of/.exec(P.texts(at));return m?Number(m[1])-1:-1;};
  const at=(pid)=>{F.screen="pg/ask";if(pid) F.showPage("pg/ask",pid);F.render();};
  at("p1");pressStep("One at a time");click(byClass(P.main(),"oat-next")[0]);
  chk("the reader is on the second question of page one",step()===1,String(step()));
  F.viewAt("pg/log").chip="2026-10-01T09:00:00Z";F.viewAt("pg/log").queries.set(0,F.newViewState());F.viewAt("pg/log").branch=true;
  at("p2");chk("and then on page two",page()===1,String(page()));
  F.closeBooklet();F.openFromList(id);at();
  chk("opened again from Your booklets in the same visit, the booklet is on page two, as it was",page()===1,String(page()));
  at("p1");chk("and page one is on the step the reader left it on",step()===1,String(step()));
  chk("what an opening starts afresh is the entry open under its chips, the query sorts and the wiki menu",
    F.viewAt("pg/log").chip===null&&F.viewAt("pg/log").queries.size===0&&F.viewAt("pg/log").branch===false&&F.VIEW.wiki.q==="");
  click(P.byId("clearGo"));at();
  chk("Clear everything starts the view afresh: page one, its first step",page()===0&&step()===0,page()+" / "+step());
  at("p1");click(byClass(P.main(),"oat-next")[0]);at("p2");
  F.applyParsed(F.parseFile(F.toMarkdown()));at();
  chk("so does a newer file read over the booklet (finishLoad's applyParsed): page one, its first step",page()===0&&step()===0,page()+" / "+step());
  chk("removing the booklet drops the view the visit kept for it",F.VIEWS.has(id)&&(F.removeBooklet(id),!F.VIEWS.has(id)));}

 /* ---- drawing writes nothing of the booklet's, the reader's, the screen's or the language's ---- */
 const fs=require("fs");
 const files=["examples/how-tides-work.booklet.md","examples/mindful-check-in.booklet.md","test/fixtures/questions-open.booklet.md","test/fixtures/roles.booklet.md","test/fixtures/wiki-scrambled.booklet.md","test/fixtures/data-views.booklet.md"];
 for(const f of files){P.wipe();const F=P.boot();F.loadText(fs.readFileSync(P.R+"/"+f,"utf8"));F.flushSave();
  const screens=["@home",...F.allModules().filter(m=>F.isMulti(m)).map(m=>F.moduleScreen(m.id)),...F.bookActivities().map(a=>a.id)];
  const before=[F.toMarkdown(),F.dirty,F.lang,JSON.stringify(F.BOOK)],moved=[];
  for(const s of screens){F.screen=s;F.render();if(F.screen!==s) moved.push(s);F.render();}
  chk(f+": drawing every screen ("+screens.length+") twice changes no work, no design, nothing dirty, no language, no screen",
    JSON.stringify([F.toMarkdown(),F.dirty,F.lang,JSON.stringify(F.BOOK)])===JSON.stringify(before)&&!moved.length,moved.join());}
 /* a booklet with diagrams whose part cannot be had (0.13.1, item 11: mermaid is parts/mermaid.js beside the core). The page is
    at an http address and every part script it adds fails to load, as a host that does not serve parts/ would. Drawing, the
    failed load (which notes the open it failed in) and the source drawn in each diagram's place afterwards write nothing of the
    booklet's, the reader's, the screen's or the language's; the part is asked for once in that open, however often it is drawn,
    and once more on the next open. */
 P.wipe();{P.place("http:","fleet");const asked=[],tick=()=>new Promise(r=>setTimeout(r,20)),stubURL=global.URL;
  /* a real URL, so the page can make the part's address (the harness's stub has only the blob calls) */
  global.URL=Object.assign(function(...a){return new (require("url").URL)(...a);},{createObjectURL:()=>"blob:x",revokeObjectURL(){}});
  global.document.head={append(s){if(/\/parts\/mermaid\.js$/.test(s.src||"")) asked.push(s.src);setTimeout(()=>s.onerror&&s.onerror(),0);}};
  const FIGS=fs.readFileSync(P.R+"/test/fixtures/figures.booklet.md","utf8"),FIGS_B=FIGS.replace("id: test/figures","id: test/figures-b").replace("title: Figures and math","title: Figures again");
  const F=P.boot();F.loadText(FIGS);F.flushSave();const id=F.currentId;
  const screens=["@home",...F.allModules().filter(m=>F.isMulti(m)).map(m=>F.moduleScreen(m.id)),...F.bookActivities().map(a=>a.id)];
  const fig=screens.find(s=>/rd-figs$/.test(s));
  /* the draws of the screen that holds the three diagrams (the open's own draw counts when it opened onto that screen) */
  let figDraws=F.screen===fig?1:0;const draw=s=>{F.screen=s;F.render();if(s===fig) figDraws++;};
  const before=[F.toMarkdown(),F.dirty,F.lang,JSON.stringify(F.BOOK)],moved=[];
  for(const s of screens){draw(s);if(F.screen!==s) moved.push(s);draw(s);}
  await tick();
  draw(fig);await tick();
  const noted=P.find(P.main(),P.hasClass("mfig-note")).map(P.texts).filter(t=>/part that draws diagrams could not be loaded/.test(t)).length;
  chk("diagrams whose part cannot be had: drawing every screen ("+screens.length+") twice, the failed load and the source drawn after it change no work, no design, nothing dirty, no language, no screen",
    JSON.stringify([F.toMarkdown(),F.dirty,F.lang,JSON.stringify(F.BOOK)])===JSON.stringify(before)&&!moved.length,moved.join());
  chk("and each of its three diagrams shows the part note when drawn again in that open",noted===3,String(noted));
  chk("the part was asked for once in that open, though the screen with its three diagrams was drawn "+figDraws+" times",asked.length===1&&figDraws>=3,asked.length+" requests, "+figDraws+" draws");
  F.closeBooklet();F.openBooklet(id);draw(fig);await tick();draw(fig);await tick();
  chk("closed and opened again from the list (a new open: bookletGen moves on), it is asked for once more, and only once",asked.length===2,String(asked.length));
  /* opens that do not go through closeBooklet, each made while a booklet whose part failed is still open: every one is a new
     open of its own (openBooklet and openAsView move bookletGen on themselves), so each asks for the part once */
  F.loadText(FIGS_B);F.flushSave();const idB=F.currentId;draw(fig);await tick();draw(fig);await tick();
  chk("a second booklet picked as a file while the first is open (loadText, then openBooklet) asks for the part once",idB!==id&&asked.length===3,asked.length+" requests; "+idB);
  F.openFromList(id);draw(fig);await tick();draw(fig);await tick();
  chk("the first opened from Your booklets while the second is open (openFromList, then openBooklet) asks for it once",F.currentId===id&&asked.length===4,String(asked.length));
  F.openAsView(FIGS_B.replace("id: test/figures-b","id: test/figures-link"),{store:false,label:"figures-link.md",from:"https://elsewhere.test/figures-link.md"});
  draw(fig);await tick();draw(fig);await tick();
  chk("a booklet opened by a link while the first is open (openAsView) asks for it once",F.currentId!==id&&F.currentId!==idB&&asked.length===5,String(asked.length));
  delete global.document.head;delete global.location;global.URL=stubURL;}
 /* what a lines question shows is not written into its draft by drawing it */
 P.wipe();{const G=P.boot();G.loadText(FM("Lines")+"> [!activity|a repeat] A\n\n> [!lines|l] Lines?\n\n> [!text|t] Text?\n");G.screen="a";G.render();
  chk("a lines question drawn and not typed in leaves its draft empty",!("l" in G.draftFor("a"))&&P.find(P.main(),n=>n.tagName==="input").length===1);}
 /* a draw is handed down and returned */
 P.wipe();{const H=P.boot();H.loadText(MOD);H.screen="steps/ask";const dc=H.render();
  chk("render makes a draw and returns it; it is the draw of the screen on show",!!dc&&Array.isArray(dc.ticks)&&dc===H.DRAWN);
  H.screen="module:steps";H.render();
  chk("a module's screen that now holds two activities is drawn as its own screen",H.screen==="module:steps");}
 /* a module screen whose module holds one activity leads to that activity before anything is drawn */
 P.wipe();{const J=P.boot();J.loadText(FM("One")+"> [!module|one] One\n\n> [!activity|only] Only\n\nText.\n\n> [!module|one end] End\n");
  J.screen="module:one";J.render();
  chk("a module screen whose module holds one activity is led to it before the draw",J.screen==="one/only"&&/Text\./.test(P.texts(P.main())));}

 /* ---- the activities outside every fence are one module: their footnotes are one list ---- */
 P.wipe();{const K=P.boot();
  const BARE=FM("Bare notes")+"> [!activity|a] First\n\nThis cites the second's note.[^n2]\n\n[^n1]: *The First Book*, p. 1: \"One.\"\n\n"+
    "> [!activity|b] Second\n\nThis cites the first's note.[^n1]\n\n[^n2]: *The Second Book*, p. 2: \"Two.\"\n";
  K.loadText(BARE);
  for(const [at,src] of [["a","The Second Book"],["b","The First Book"]]){K.screen=at;K.render();
   const marks=byClass(P.main(),"rd-mark"),broken=byClass(P.main(),"rd-broken");
   chk("activity "+at+" cites a note another bare activity defines: a numbered mark, nothing broken",marks.length===1&&!broken.length,P.texts(P.main()).slice(0,160));
   const notes=byClass(P.main(),"rd-notes")[0];
   chk("and its endnote names that note's source",!!notes&&P.texts(notes).includes(src),notes&&P.texts(notes));}
  /* a fenced module still reads only its own */
  K.loadText(FM("Fenced")+"> [!module|m] M\n\n> [!activity|a] A\n\nCites the other module's note.[^x]\n\n> [!module|m end] End\n\n> [!module|n] N\n\n> [!activity|b] B\n\nText.\n\n[^x]: *Elsewhere*, p. 9: \"No.\"\n\n> [!module|n end] End\n");
  K.screen="m/a";K.render();
  chk("a fenced module does not find a note another module defines",byClass(P.main(),"rd-broken").length===1);}

 /* ---- a store booklet drawn again from its store keeps its view when the file is the one it last read (storeSeen); a
    changed file starts it afresh. The page declares a store and the network is a stub. ---- */
 P.wipe();{const STORE="http://fleet/booklets/";
  const PG=FM("Paged")+"> [!module|pg] Paged\n\n> [!activity|ask] Ask\n\n> [!text|q1] One?\n\n---\n\n## Later\n\n> [!text|q2] Two?\n\n> [!module|pg end] End\n";
  let file=PG;
  global.URL=Object.assign(require("url").URL,{createObjectURL:()=>"blob:x",revokeObjectURL(){}});
  global.location={href:"http://fleet/app/",protocol:"http:",hostname:"fleet",hash:""};
  global.document.querySelector=sel=>/booklet-store/.test(sel)?{getAttribute:k=>k==="content"?STORE:null}:null;
  global.fetch=async()=>({ok:true,status:200,headers:{get:()=>null},body:null,text:async()=>file});
  const S=P.boot(),tick=()=>new Promise(r=>setTimeout(r,20));
  await S.openLink("#/open/pg.md");const id=S.currentId;S.showPage("pg/ask","p2");
  chk("setup: a store booklet listed as a pointer (nothing of it kept), on its second page",
    !!id&&S.viewAt("pg/ask").page==="p2"&&!(("booklet.b."+id) in LS)&&JSON.parse(LS["booklet.library.v1"]).entries.some(e=>e.id===id&&e.from==="store:pg.md"));
  S.closeBooklet();await S.openLink("#/open/pg.md");
  chk("opened again by its link, the same file is drawn into the same entry, on the page it was on",S.currentId===id&&S.viewAt("pg/ask").page==="p2");
  S.closeBooklet();S.openFromList(id);await tick();
  chk("and so from Your booklets",S.currentId===id&&S.viewAt("pg/ask").page==="p2");
  file=PG.replace("One?","One, reworded?");S.closeBooklet();await S.openLink("#/open/pg.md");
  chk("a changed file is drawn into the same entry with its view afresh",S.currentId===id&&/reworded/.test(S.toMarkdown())&&S.viewAt("pg/ask").page===null,String(S.viewAt("pg/ask").page));}

 P.wipe();
 console.log(fails?"\n"+fails+" FAILURES":"\ndraw-context checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
