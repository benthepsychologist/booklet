// Reading mode and plain Markdown: a file with no activity line is one activity,
// HTML comments are not drawn but are kept, tables are wrapped for scrolling, and
// a page that only reads folds into sections. Run: node test/reading.test.js
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const FM='---\nbooklet: 0.9\nid: local/week-view\ntitle: "Week view"\nlang: en\n---\n\n';
const A=P.boot();

/* 1. no activity line: one activity */
{const R=A.parseFile(FM+"# Title\n\nSome prose.\n\n## One\n\nFirst.\n\n## Two\n\nSecond.\n");
 chk("prose only parses",R.ok,JSON.stringify(R.unread));
 const ms=R.template.modules;
 chk("one module, one activity",ms.length===1&&ms[0].mode&&!ms[0].activities,JSON.stringify(ms.map(m=>Object.keys(m))));
 const a=ms[0].mode;
 chk("its id is the title as letters, digits and dashes",a.id==="week-view"&&/^[A-Za-z0-9-]+$/.test(a.id),a.id);
 chk("it keeps one answer set, not entries",a.kind==="board");
 chk("the prose is in it",a.blocks.length===1&&/Some prose/.test(a.blocks[0].text)&&/Second/.test(a.blocks[0].text));
 chk("nothing is reported as wrong",R.unread.length===0,JSON.stringify(R.unread));
 const Q=A.parseFile(FM+"Worksheet intro.\n\n> [!text|noticed] What stood out?\n\n> [!lines|wins] Wins\n");
 const qa=Q.template.modules[0].mode;
 chk("with questions: one activity, intro then both questions",Q.ok&&qa.blocks.map(b=>b.type).join()==="markdown,text,lines",qa.blocks.map(b=>b.type).join());
 chk("the id comes from the front matter id when the title has no letters",
   A.parseFile('---\nbooklet: 0.9\nid: example/tides\ntitle: "—"\n---\n\nHi.\n').template.modules[0].mode.id==="tides"||
   A.parseFile('---\nbooklet: 0.9\nid: example/tides\ntitle: "—"\n---\n\nHi.\n').template.modules[0].mode.id==="example-tides");
 chk("a file with activity lines keeps text before the first one out",A.parseFile(FM+"Intro.\n\n> [!activity|a1] A\n\nBody.\n").template.modules[0].mode.id==="a1");
 chk("the three real reports still load without the hand-added line",["weekly-report","week-view","acceptance"].every(n=>{
   const f="/tmp/claude-1000/-workspace-fleet-hubs-booklet-hub/6b4250e5-57b1-4e3b-8323-a32f8be662b4/scratchpad/reading/"+n+".booklet.md";
   return !fs.existsSync(f)||A.parseFile(fs.readFileSync(f,"utf8").replace(/^booklet: 0\.3$/m,"booklet: 0.9")).ok;}));
}

/* 2. comments */
{const draw=t=>P.texts({children:A.mdNodes(t,{})});
 chk("an inline comment is dropped",draw("Before <!-- note --> after")==="Before after"||draw("Before <!-- note --> after")==="Before  after".replace("  "," "),draw("Before <!-- note --> after"));
 chk("a comment on its own line is dropped",draw("One\n\n<!-- narrative:start -->\n\nTwo")==="One Two",draw("One\n\n<!-- narrative:start -->\n\nTwo"));
 chk("a several-line comment is dropped",draw("A\n<!-- line one\nline two\n-->\nB")==="A B",draw("A\n<!-- line one\nline two\n-->\nB"));
 chk("a comment inside a code span is shown",/<!-- x -->/.test(draw("see `<!-- x -->` here")));
 chk("a comment inside a fenced block is shown",/<!-- y -->/.test(draw("```html\n<!-- y -->\n```")));
 chk("an unfinished comment hides the rest, as in HTML",draw("A\n<!-- never closed\nB")==="A");
 /* the standalone copy behaves the same */
 global.el=(tag,attrs={},...kids)=>{const n={tag,attrs,children:[],append(...k){this.children.push(...k);}};
   Object.defineProperty(n,"textContent",{get(){return this.children.map(c=>typeof c==="string"?c:(c&&c.textContent)||"").join("");}});
   for(const k of kids) if(k!=null) n.append(k);return n;};
 const {mdNodes}=require("./md.js");
 const sq=z=>z.replace(/\s+/g,"");
 const same=t=>{const x=mdNodes(t,{}).map(n=>n.textContent).join(""),y=A.mdNodes(t,{}).map(n=>P.texts(n)).join("");return sq(x)===sq(y);};
 chk("test/md.js draws comments the same way",["Before <!-- n --> after","A\n<!-- a\nb\n-->\nB","`<!-- k -->` and <!-- g -->","```\n<!-- f -->\n```"].every(same));
 /* kept in the file */
 const src=FM+"# T\n\n<!-- narrative:start -->\nKept words.\n<!-- narrative:end -->\n\n<!--\nmulti\nline\n-->\n\nEnd.\n";
 A.loadText(src);
 const out=A.toMarkdown();
 chk("the saved file keeps every comment exactly",out.includes("<!-- narrative:start -->")&&out.includes("<!-- narrative:end -->")&&out.includes("<!--\nmulti\nline\n-->"),out.slice(0,300));
}

/* 3. tables */
{const ns=A.mdBlockNodes({text:"| a | n |\n| --- | --- |\n| x | 12 |\n| y | 3.5% |\n"},"x");
 chk("a table sits in a scrolling wrapper",ns.length===1&&ns[0].attrs.class==="md-table"&&ns[0].children[0].tagName==="table");
 const rows=P.find(ns[0],n=>n.tagName==="td"||n.tagName==="th");
 chk("a purely numeric cell, and its column's heading, are marked for the right",rows.filter(n=>n.attrs.class==="num").length===3,JSON.stringify(rows.map(n=>n.attrs.class||"")));
}

/* 4. sections */
{const H=l=>({tagName:"h"+l}),Pp=()=>({tagName:"p"}),O=()=>({tagName:"ul"});
 const t=H(2),a=H(3),b=H(3),pa=Pp(),pb=Pp(),sub=H(4);
 const plan=A.readingPlan([t,Pp(),a,pa,sub,O(),b,pb]);
 chk("a lone title above the sections is not a section",plan&&plan.sections.length===2&&plan.sections[0].head===a&&plan.lead.length===2);
 chk("a section runs to the next heading of its level, deeper headings included",plan.sections[0].body.length===3&&plan.sections[1].body.length===1);
 chk("two headings of the shallowest level are the sections",A.readingPlan([H(2),Pp(),H(2)]).sections.length===2);
 chk("one section does not fold",A.readingPlan([Pp(),H(2),Pp()])===null);
 chk("a title and one section does not fold",A.readingPlan([H(2),H(3),Pp()])===null);
 chk("no headings does not fold",A.readingPlan([Pp(),Pp()])===null);
 const lede=A.sectionLede([O(),pa,Pp()]);
 chk("a section's first paragraph is its summary and leaves the body",lede.para===pa&&lede.rest.length===2&&!lede.rest.includes(pa));
 const none=A.sectionLede([{tagName:"hr"}]);
 chk("a section with nothing to show falls back to the heading alone",none.para===null&&none.text==="");
}

/* 5. which activities fold */
{A.loadText(FM+"## One\n\nA.\n\n## Two\n\nB.\n");
 chk("a reading-only activity folds",A.readsOnly(A.activityOf("week-view")));
 A.loadText(FM+"## One\n\nA.\n\n> [!text|q] Ask?\n\n## Two\n\nB.\n");
 chk("an activity with a question does not",!A.readsOnly(A.activityOf("week-view")));
 A.loadText(FM+"## One\n\nA.\n\n> [!activity|r repeat] Log\n\n## Two\n\nB.\n");
 chk("a repeating activity does not",!A.readsOnly(A.activityOf("r")));
 chk("the interface strings exist in en, fr and es",["en","fr","es"].every(l=>{const f=A.STRINGS[l].fold;return f&&f.openAll&&f.foldAll&&/\d/.test(f.count(2,5))&&f.sections&&f.seen;}));
}
console.log(fails?fails+" reading checks failed":"all reading checks passed");
process.exit(fails?1:0);
