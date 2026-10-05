// Format 0.9: an id belongs to its module (SPEC.md section 4). Two modules in one file may use the same
// activity, question, widget, menu, block and footnote id, and neither sees the other's. Invented content only.
// Run: node test/modulescope.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const FM="---\nbooklet: \"0.11\"\ntitle: Scope\nlang: en\n---\n\n";
const tag=(n,t)=>P.find(P.main(),x=>x.tagName===t);
const shown=()=>P.texts(P.main());
const typeIn=(A,addr,words)=>{A.screen=addr;A.render();const ta=tag(0,"textarea")[0];ta.value=words;ta._on.input();};
const textOf=(A,addr)=>{A.screen=addr;A.render();const ta=tag(0,"textarea")[0];return ta?ta.value:null;};
/* one module with an answer-once activity and a repeating one, ids the same in every module */
const mod=(id,t)=>`> [!module|${id}] Module ${t}\n\n> [!activity|act] Answer ${t}\n\n> [!text|note] Note ${t}\n\n> [!activity|log repeat] Log ${t}\n\n> [!text|what] What ${t}\n\n> [!module|${id} end] End\n`;
const TWO=FM+mod("ma","A")+"\n"+mod("mb","B");
const section=(md,id)=>{const i=md.indexOf("> [!records|"+id+"]");if(i<0) return "";const j=md.indexOf("> [!records|",i+5);return md.slice(i,j<0?md.length:j);};

/* ---- the parser: addresses, and what a second use of an id is ---- */
{const A=P.boot();
 const R=A.parseFile(TWO);
 chk("two modules with the same activity and question ids open with nothing reported",R.ok&&R.unread.length===0&&R.refused.length===0,JSON.stringify(R.unread));
 chk("an activity is known by its module and its id, and the file's own ids are unchanged",R.template.modules.map(m=>m.activities.map(a=>a.id).join()).join("|")==="ma/act,ma/log|mb/act,mb/log"
   &&R.template.modules[0].activities[0].blocks[0].id==="note");
 chk("an address is the module's id, a slash and the activity's id; one outside every fence is just its id",A.addrOf("ma","act")==="ma/act"&&A.addrOf("","solo")==="solo"&&A.scopeOfAddr("ma/act")==="ma"&&A.scopeOfAddr("solo")===""&&A.shortId("ma/act")==="act"&&A.shortId("solo")==="solo");
 const twice=(label,body,rx)=>{const r=A.parseFile(FM+body);chk(label,r.ok===false&&r.refused.some(x=>rx.test(x)),JSON.stringify(r.refused));};
 twice("an activity id used twice in one module is refused","> [!module|m] M\n\n> [!activity|a] A\n\n> [!activity|a] B\n\n> [!module|m end] E\n",/“a” is used twice/);
 twice("a question id used twice in one module is refused","> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!activity|b] B\n\n> [!text|q] Q\n\n> [!module|m end] E\n",/“q” is used twice/);
 twice("a module id used twice is refused","> [!module|m] M\n\n> [!activity|a] A\n\n> [!module|m end] E\n\n> [!module|m] M\n\n> [!activity|b] B\n\n> [!module|m end] E\n",/“m” is used twice/);
 twice("a block id used twice in one module is refused","> [!module|m] M\n\n> [!activity|a] A\n\n> [!widget|w] W\n> ![[#^wd]]\n\n```booklet widget\n{\"engine\":\"grid-select\"}\n```\n^wd\n\n```booklet widget\n{\"engine\":\"grid-select\"}\n```\n^wd\n\n> [!module|m end] E\n",/“wd” is used twice/);
 twice("two blocks in the data section with one id are refused","> [!module|m] M\n\n> [!activity|a] A\n\n> [!module|m end] E\n\n> [!data] Data\n\n```booklet data\n[{\"x\":1}]\n```\n^d\n\n```booklet data\n[{\"x\":2}]\n```\n^d\n",/“d” is used twice/);
 twice("a data block with a question's id in its own module is refused","> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|rows] Q\n\n```booklet data\n[{\"x\":1}]\n```\n^rows\n\n> [!module|m end] E\n",/“rows” is used twice/);
 const ok=A.parseFile(FM+"> [!module|m1] M\n\n> [!activity|a] A\n\n> [!text|rows] Q\n\n> [!module|m1 end] E\n\n> [!module|m2] M\n\n> [!activity|a] A\n\n```booklet data\n[{\"x\":1}]\n```\n^rows\n\n> [!module|m2 end] E\n");
 chk("a block in one module may share its id with a question in another",ok.ok&&ok.refused.length===0,JSON.stringify(ok.refused));
 const refQ=A.parseFile(FM+"> [!module|m1] M\n\n> [!activity|a repeat] A\n\n> [!text|q] Q\n\n> [!module|m1 end] E\n\n> [!module|m2] M\n\n> [!activity|b] B\n\n```booklet query\nfrom: a\n```\n\n> [!module|m2 end] E\n");
 chk("a query cannot read another module's activity: refused, as before",refQ.ok===false&&refQ.refused.some(x=>/in another module/.test(x)),JSON.stringify(refQ.refused));
 const own=A.parseFile(FM+"> [!module|m1] M\n\n> [!activity|a repeat] A\n\n> [!text|q] Q\n\n> [!activity|v] V\n\n```booklet query\nfrom: a\n```\n\n> [!module|m1 end] E\n\n> [!module|m2] M\n\n> [!activity|a repeat] A\n\n> [!text|q] Q\n\n> [!activity|v] V\n\n```booklet query\nfrom: a\n```\n\n> [!module|m2 end] E\n");
 const qf=m=>m.activities.find(a=>a.id===m.id+"/v").blocks.find(b=>b.type==="query").from;
 chk("two modules each query their own activity of the same id",own.ok&&own.template.modules.map(qf).join()==="m1/a,m2/a",JSON.stringify(own.refused));}

/* ---- answers apart; written under each module's own records line; read back to their own module ---- */
{P.wipe();const A=P.boot();A.loadText(TWO);
 typeIn(A,"ma/act","typed in A");
 chk("typing in module A's question leaves module B's empty",textOf(A,"mb/act")==="");
 typeIn(A,"mb/act","typed in B");
 chk("and each keeps its own",textOf(A,"ma/act")==="typed in A"&&textOf(A,"mb/act")==="typed in B");
 const md=A.toMarkdown();
 chk("the file writes each under its own module's records line",/"note": "typed in A"/.test(section(md,"ma"))&&!/typed in B/.test(section(md,"ma"))&&/"note": "typed in B"/.test(section(md,"mb"))&&!/typed in A/.test(section(md,"mb")),md.slice(md.indexOf("%%")));
 P.wipe();const B=P.boot();B.loadText(md);
 chk("reading it back restores each to its own module",textOf(B,"ma/act")==="typed in A"&&textOf(B,"mb/act")==="typed in B");
 chk("and the page's answers are kept by module",JSON.stringify(B.STATE.answers)==='{"ma":{"note":"typed in A"},"mb":{"note":"typed in B"}}'&&Object.keys(B.STATE.answers).length===2,JSON.stringify(B.STATE));
 chk("the file written again is the same file",B.toMarkdown()===md);}

/* ---- entries apart, through write and read ---- */
{P.wipe();const A=P.boot();A.loadText(TWO);
 A.draftFor("ma/log").what="seen in A";A.finalizeEntry("ma/log");
 chk("an entry kept in module A's log is not in module B's log",A.keptFor("ma/log").length===1&&A.keptFor("mb/log").length===0);
 A.draftFor("mb/log").what="seen in B";A.finalizeEntry("mb/log");
 A.draftFor("mb/log").what="and again in B";A.finalizeEntry("mb/log");
 const md=A.toMarkdown();
 chk("the file writes `booklet entries log` under each module, with the file's own id",/booklet entries log\n/.test(section(md,"ma"))&&/booklet entries log\n/.test(section(md,"mb"))&&!/booklet entries ma/.test(md)&&/seen in A/.test(section(md,"ma"))&&!/seen in B/.test(section(md,"ma"))&&/and again in B/.test(section(md,"mb")),md.slice(md.indexOf("%%")));
 P.wipe();const B=P.boot();B.loadText(md);
 chk("read back, each module keeps its own entries",B.keptFor("ma/log").length===1&&B.keptFor("mb/log").length===2&&B.keptFor("ma/log")[0].what==="seen in A");
 B.openChip["ma/log"]=B.keptFor("ma/log")[0].ts;B.screen="ma/log";B.render();
 chk("and the page draws them for the module on show",/seen in A/.test(shown())&&!/seen in B/.test(shown()),shown().slice(0,300));}

/* ---- drafts apart ---- */
{P.wipe();const A=P.boot();A.loadText(TWO);
 A.draftFor("ma/log").what="half a thought in A";
 const md=A.toMarkdown();
 chk("an unfinished draft is written under its own module",/booklet draft log/.test(section(md,"ma"))&&!/booklet draft/.test(section(md,"mb")));
 P.wipe();const B=P.boot();B.loadText(md);
 chk("and comes back to it",B.draftFor("ma/log").what==="half a thought in A"&&!B.draftFor("mb/log").what);}

/* ---- the same widget block, menu and footnote id in two modules, each module's own ---- */
const rich=(id,t)=>`> [!module|${id}] Module ${t}\n\n> [!menu|opts]\n- ${t}-one\n- ${t}-two\n\n> [!activity|act] Act ${t}\n\n> [!choice|pick menu:opts] Pick ${t}\n\n> [!widget|w]\n> ![[#^wd]]\n\nA claim ${t}.[^1]\n\n\`\`\`mermaid\ngraph TD; X-->${t}\n\`\`\`\n^fig\n\n[^1]: *Source ${t}*, p. 1: "A quote ${t}" Verified 2026-01-01\n\n\`\`\`booklet widget\n{"engine":"grid-select","copy":{"h":"Heading ${t}"},"items":[{"id":"i${t}","label":"Item ${t}"}]}\n\`\`\`\n^wd\n\n> [!module|${id} end] End\n`;
{P.wipe();const A=P.boot();
 const FILE=FM+rich("ma","A")+"\n"+rich("mb","B");
 const R=A.parseFile(FILE);
 chk("two modules with one widget block id, menu id, figure id and footnote id open with nothing refused",R.ok&&R.refused.length===0,JSON.stringify(R.refused));
 A.loadText(FILE);
 A.screen="ma/act";A.render();let t=shown();
 chk("module A draws its own widget",/Heading A/.test(t)&&!/Heading B/.test(t),t.slice(0,300));
 chk("module A's menu question offers A's menu",/A-one/.test(t)&&!/B-one/.test(t));
 chk("module A's footnote is A's source",A.BOOK.modules[0].citations[0].quote==="A quote A"&&A.BOOK.modules[1].citations[0].quote==="A quote B");
 A.screen="mb/act";A.render();t=shown();
 chk("module B draws its own widget",/Heading B/.test(t)&&!/Heading A/.test(t));
 chk("module B's menu question offers B's menu",/B-one/.test(t)&&!/A-one/.test(t));
 chk("a widget is looked up in its own module first",A.widgetOf("wd","ma").copy.h==="Heading A"&&A.widgetOf("wd","mb").copy.h==="Heading B"&&A.widgetOf("wd","")===null);
 chk("the widgets are kept by module",A.BOOK.widgets.map(w=>w.module).join()==="ma,mb");
 chk("a figure is kept under its module",Object.keys(A.BOOK.figures).sort().join()==="ma/fig,mb/fig");
 chk("each module's figure is its own",A.figureFor("fig","ma")!==A.figureFor("fig","mb")&&A.figureFor("fig","ma")!==null);
 const marks=P.find(P.main(),n=>n.tagName==="button"&&/rd-mark/.test((n.attrs||{}).class||""));
 chk("module B's footnote mark is drawn and is its own",marks.length===1);
 A.screen="ma/act";A.render();
 chk("module A's endnote names A's source",/Source A/.test(shown())&&!/Source B/.test(shown()),shown().slice(-300));}

/* ---- the data section: shared, and a module's own block wins ---- */
{P.wipe();const A=P.boot();
 const q=(id,extra)=>`> [!module|${id}] M ${id}\n\n> [!activity|v] V ${id}\n\n\`\`\`booklet query\nfrom: rows\nas: table\n\`\`\`\n\n${extra||""}> [!module|${id} end] End\n`;
 const own="```booklet data\n[{\"label\":\"own-row\"}]\n```\n^rows\n\n";
 const FILE=FM+q("m1")+"\n"+q("m2",own)+"\n> [!data] Data\n\n```booklet data\n[{\"label\":\"shared-row\"}]\n```\n^rows\n";
 const R=A.parseFile(FILE);
 chk("a data-section block and a module's own block of the same id open with nothing refused",R.ok&&R.refused.length===0,JSON.stringify(R.refused));
 A.loadText(FILE);
 A.screen="m1/v";A.render();
 chk("a module with no block of its own reads the data section's",/shared-row/.test(shown())&&!/own-row/.test(shown()),shown().slice(0,200));
 A.screen="m2/v";A.render();
 chk("a module's own block wins over the data section's",/own-row/.test(shown())&&!/shared-row/.test(shown()),shown().slice(0,200));
 const FILE3=FM+q("m1")+"\n"+q("m3")+"\n> [!data] Data\n\n```booklet data\n[{\"label\":\"shared-row\"}]\n```\n^rows\n";
 A.loadText(FILE3);A.screen="m3/v";A.render();
 chk("a data-section block is used by two modules",/shared-row/.test(shown()));}

/* ---- a footnote: the module's own, else the data section's ---- */
{P.wipe();const A=P.boot();
 const m=(id,def)=>`> [!module|${id}] Module ${id}\n\n> [!activity|act] Act\n\nA claim.[^1]\n\n${def||""}> [!module|${id} end] End\n`;
 const FILE=FM+m("m1")+"\n"+m("m2",'[^1]: *Own source*, p. 2: "Own words"\n\n')+"\n> [!data] Data\n\n[^1]: *Shared source*, p. 1: \"Shared words\"\n";
 const R=A.parseFile(FILE);
 chk("a footnote defined in the data section is read, and a module's own definition of the same id too",R.ok&&R.refused.length===0&&R.template.modules[1].citations[0].quote==="Own words"&&R.template.citations[0].quote==="Shared words",JSON.stringify(R.template.citations)+JSON.stringify(R.unread));
 A.loadText(FILE);
 A.screen="m1/act";A.render();
 const marks=P.find(P.main(),n=>n.tagName==="button"&&/rd-mark/.test((n.attrs||{}).class||""));
 chk("a module with no definition of its own uses the data section's: its mark is a numbered mark, not broken",marks.length===1&&!/\[\?1\]/.test(shown()),shown().slice(-200));
 chk("and its endnote names the shared source",/Shared source/.test(shown()),shown().slice(-300));
 A.screen="m2/act";A.render();
 chk("a module with its own definition uses it, not the data section's",/Own source/.test(shown())&&!/Shared source/.test(shown()),shown().slice(-300));}

/* ---- bare activities next to modules: their records round-trip ---- */
{P.wipe();const A=P.boot();
 const FILE=FM+"> [!activity|solo] Solo\n\n> [!text|note] Solo note\n\n> [!activity|jot repeat] Jot\n\n> [!text|what] What\n\n"+mod("ma","A");
 A.loadText(FILE);
 chk("activities outside every fence are addressed by their own id",A.activityOf("solo").kind==="board"&&A.activityOf("jot").kind==="entry"&&A.activityOf("ma/act").kind==="board");
 typeIn(A,"solo","solo words");typeIn(A,"ma/act","module words");
 A.draftFor("jot").what="a jot";A.finalizeEntry("jot");
 chk("their answers are kept apart from the modules'",A.STATE.answers[""].note==="solo words"&&A.STATE.answers.ma.note==="module words");
 const md=A.toMarkdown();
 P.wipe();const B=P.boot();B.loadText(md);
 chk("their answer and entries come back to them, and the module's to the module",textOf(B,"solo")==="solo words"&&textOf(B,"ma/act")==="module words"&&B.keptFor("jot").length===1&&B.keptFor("jot")[0].what==="a jot");
 chk("a records line that names no module is the bare activities'",(()=>{const t=md.replace(/> \[!records\|solo\]/,"> [!records|nowhere]");P.wipe();const C=P.boot();C.loadText(t);return C.STATE.answers[""].note==="solo words";})());}

/* ---- heading links stay in their own module ---- */
{P.wipe();const A=P.boot();
 const m=(id,extra)=>`> [!module|${id}] Module ${id}\n\n> [!activity|act] Source\n\nSee [[#Target]] and [there](#target) and [[#Only A]].\n\n> [!activity|t] Where ${id}\n\n## Target\n\nHere.\n\n${extra||""}> [!module|${id} end] End\n`;
 A.loadText(FM+m("ma","## Only A\n\nText.\n\n")+"\n"+m("mb"));
 const links=()=>P.find(P.main(),n=>n.tagName==="a"&&/alink/.test((n.attrs||{}).class||""));
 A.screen="mb/act";A.render();let ls=links();
 chk("in module B the two links to a heading both modules have are links",ls.length===2,String(ls.length));
 ls[0]._on.click({preventDefault(){}});
 chk("and the link lands in module B, not in module A",A.screen==="mb/t",A.screen);
 A.screen="ma/act";A.render();ls=links();ls[1]._on.click({preventDefault(){}});
 chk("the same heading in module A lands in module A",ls.length===3&&A.screen==="ma/t",A.screen);
 A.screen="mb/act";A.render();
 chk("a heading only another module has does not resolve: it is plain text, as a heading nowhere is",links().length===2&&/Only A/.test(shown())&&!/\[\[/.test(shown()),shown().slice(0,200));}

/* ---- the address in the screen-level state: two activities of one name stay two ---- */
{P.wipe();const A=P.boot();
 const paged=(id,t)=>`> [!module|${id}] Module ${t}\n\n> [!activity|act] Act ${t}\n\n## First ${t}\n\nOne ${t}.\n\n## Between ${t}\n\nMore ${t}.\n\n---\n\n## Second ${t}\n\nTwo ${t}.\n\n## Last ${t}\n\nEnd ${t}.\n\n> [!activity|log repeat] Log ${t}\n\n> [!choice|pick open] Pick\n- [ ] Red\n- [ ] Blue\n\n> [!activity|look] Look ${t}\n\n\`\`\`booklet query\nfrom: log\nas: cards\n\`\`\`\n\n> [!module|${id} end] End\n`;
 A.loadText(FM+paged("ma","A")+"\n"+paged("mb","B"));
 A.showPage("ma/act","p2");A.screen="ma/act";A.render();
 chk("the page shown is kept per module: A is on its second page",/Two A/.test(shown())&&!/One A/.test(shown()));
 A.screen="mb/act";A.render();
 chk("and B, with the same activity id, is still on its first",/One B/.test(shown())&&!/Two B/.test(shown()),shown().slice(0,200));
 const keys=Object.keys(A.RM_STATE);
 chk("reading mode keeps its folds per module",new Set(keys).size===keys.length&&keys.some(k=>/ma\/act/.test(k))&&keys.some(k=>/mb\/act/.test(k)),keys.join("|"));
 A.keptFor("ma/log").push({ts:"2026-10-01T09:00:00Z",pick:["Own words A"]});A.keptFor("mb/log").push({ts:"2026-10-01T09:00:00Z",pick:["Own words B"]});
 chk("a reader's own options are offered again from the module's own kept entries",A.ownEarlier("ma/log","pick",["Red","Blue"],[]).join()==="Own words A"&&A.ownEarlier("mb/log","pick",["Red","Blue"],[]).join()==="Own words B");
 A.screen="ma/look";A.render();const a=shown();A.screen="mb/look";A.render();const b=shown();
 chk("a query shows its own module's entries",/Own words A/.test(a)&&!/Own words B/.test(a)&&/Own words B/.test(b)&&!/Own words A/.test(b));
 chk("the per-view state is kept per module",new Set([...A.VIEWSTATE.keys()]).size===A.VIEWSTATE.size);}

console.log(fails?"\n"+fails+" FAILURES":"\nmodule-scope checks passed");process.exit(fails?1:0);
