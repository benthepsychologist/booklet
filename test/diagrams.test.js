// Format v0.11: a diagram whose source could make the page ask for an address is never handed to the diagram library.
// diagramRisk(code) reads the source as text; "" means it may be drawn. This lists, by rule, what is refused and what
// is still drawn. The library itself is exercised by test/mermaid-browser.js, which counts real requests.
// Run: node test/diagrams.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const A=P.boot();
const U="https://probe.example/x.png";
const REFUSED={
 directive:[`%%{init: {"themeCSS": ".node{background:url(${U})}"}}%%\nflowchart LR\n A --> B`,`%%{ init: {"fontFamily": "x"} }%%\nflowchart LR\n A --> B`,`%%\n{init}%%`.replace("%%\n{","%%{")],
 frontmatter:[`---\nconfig:\n  themeCSS: "@import url(${U});"\n---\nflowchart LR\n A --> B`,`flowchart LR\n A --> B\n---\n`],
 "shape-block":[`flowchart LR\n A@{ img: "${U}", label: "x" } --> B`,`flowchart LR\n A@{ icon: "logos:aws", form: "square" }`,`flowchart LR\n A@{ shape: imageSquare }`,`flowchart LR\n A@{ shape: rect, view: wide } --> B`,`flowchart LR\n A@{ style: "fill:red" }`,`flowchart LR\n A@{ shape: rect`,`kanban\n c[C]\n  t[T]@{ img: '${U}' }`],
 key:[`sequenceDiagram\n participant A\n properties A: {"icon": "${U}"}\n A->>A: x`,`sequenceDiagram\n participant A@{ "type": "actor", "icon": "x" }`,`C4Context\n Person(a, "A", "d", $sprite="x")`,`C4Context\n Person(a, "A", "d", $link="x")`,`classDiagram\n class A\n link A "x" "tip"`,`flowchart LR\n A --> B\n img: "x"`],
 line:[`flowchart LR\n A --> B\n click A href "x"`,`flowchart LR\n A --> B\n click A callback`,`sequenceDiagram\n participant A\n links A: {"Docs": "x"}\n A->>A: x`,`sequenceDiagram\n participant A\n link A: Docs @ x\n A->>A: x`,`flowchart LR\n A --> B; click A call f()`],
 "markdown-image":[`flowchart LR\n A["\`![x](y)\`"] --> B`,`pie title ![x](y)\n "a": 1`],
 html:[`flowchart LR\n A["<span>t</span>"] --> B`,`flowchart LR\n A["<img src='x'>"] --> B`,`flowchart LR\n A[<svg><image href='x'/></svg>] --> B`,`sequenceDiagram\n A->>B: <video poster='x'>`,`flowchart LR\n A[<link rel=stylesheet href='x'>] --> B`,`flowchart LR\n A["<b style='background:url(x)'>t</b>"] --> B`,`flowchart LR\n A["<!-- x -->"] --> B`,`flowchart LR\n A["<script>x</script>"] --> B`.replace("script","scr"+"ipt"),`flowchart LR\n A[a<b] --> B`],
 entity:[`flowchart LR\n A[#0060;img#62;] --> B`,`flowchart LR\n A[#60;img src='x'#62;] --> B`,`flowchart LR\n A[&lt;img src='x'&gt;] --> B`,`flowchart LR\n A[&#60;img src=x&#62;] --> B`,`flowchart LR\n A --> B\n style A fill:#060;`],
 address:[`flowchart LR\n A[see ${U}] --> B`,`flowchart LR\n A[ftp://x] --> B`],
 css:[`classDiagram\n class A\n style A fill:url(x)`,`classDiagram\n class A\n style A fill:url(${U})`,`stateDiagram-v2\n [*] --> S\n classDef c fill:url(//probe.example/x)\n class S c`,`stateDiagram-v2\n [*] --> S\n style S fill:url(probe-rel/x)`,`block-beta\n a\n style a fill:URL(x)`,`C4Context\n System(s,"S","d")\n UpdateElementStyle(s, $bgColor="url(x)")`,`flowchart LR\n A --> B\n style A background:image-set("x" 1x)`,`flowchart LR\n A --> B\n style A fill:red {x}`,`flowchart LR\n A --> B\n classDef x fill:#fff;@import "x"`,`flowchart LR\n A --> B\n style A width:expression(x)`,`flowchart LR\n A --> B\n style A fill:var(--x)`,`flowchart LR\n A --> B\n style A fill:red;background:src(x)`],
 backslash:[`flowchart LR\n A[x \\75 rl] --> B`,`flowchart LR\n A[u\\rl] --> B`,`flowchart LR\n A --> B\n style A fill:u\\72l`],
};
for(const [rule,list] of Object.entries(REFUSED)) list.forEach((c,i)=>{const r=A.diagramRisk(c);chk(`refused (${rule} ${i+1}): ${JSON.stringify(c).slice(0,70)}`,r!=="",r);});
/* each source is refused for the rule it was written for, where that is the first thing found */
for(const [rule,list] of Object.entries(REFUSED)) chk(`the first of the ${rule} sources is named "${rule}"`,A.diagramRisk(list[0])===rule,A.diagramRisk(list[0]));
const BENIGN=[
 "flowchart LR\n  A[Start] --> B{Choice}\n  B -->|yes| C[Done]\n  B -->|no| D((Stop))\n  style A fill:#f9f,stroke:#333\n  classDef big fill:#bbf,stroke:#333,stroke-width:2px;\n  class C big\n  subgraph one [Group]\n    E --> F\n  end\n",
 "flowchart TD\n  A[/Trapezoid\\] --> B[\\Other/]\n  B --> C[(Database)]\n  C --> D[Line one<br/>line two]\n  D --> E[\"a <b>bold</b> and <i>italic</i> word\"]\n  linkStyle 0 stroke:#ff3,stroke-width:4px\n  style E fill:rgb(255,200,200),stroke:hsl(10,50%,40%)\n",
 "flowchart LR\n  A@{ shape: rect, label: \"Plain\" } --> B@{ shape: diamond, label: \"Pick\", w: 80, h: 80 }\n",
 "sequenceDiagram\n  participant A as Alice\n  actor B as Bob\n  A->>B: Hello<br/>there\n  Note over A,B: a note\n  rect rgb(200,200,255)\n  B-->>A: Hi\n  end\n  A-xB: done; thanks\n",
 "classDiagram\n  class Animal {\n    <<interface>>\n    +int age\n    +eat() void\n  }\n  class Dog\n  Animal <|-- Dog\n  <<abstract>> Dog\n  note for Dog \"a note\"\n",
 "stateDiagram-v2\n  [*] --> Still\n  Still --> Moving: go\n  Moving --> [*]\n  classDef c fill:#fff,color:#333\n  class Still c\n  state fork_state <<fork>>\n",
 "erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  CUSTOMER {\n    string name\n    int id PK\n  }\n",
 "gantt\n  title Plan\n  dateFormat YYYY-MM-DD\n  section S\n  Task one :a1, 2024-01-01, 3d\n  Task two :after a1, 2d\n",
 "pie title Pets\n  \"Dogs\" : 386\n  \"Cats\" : 85\n",
 "journey\n  title Day\n  section Work\n    Make tea: 5: Me\n",
 "gitGraph\n  commit id: \"a\"\n  branch dev\n  commit tag: \"v1\"\n  checkout main\n  merge dev\n",
 "quadrantChart\n  title Reach\n  x-axis Low --> High\n  y-axis Low --> High\n  quadrant-1 Expand\n  Campaign A: [0.3, 0.6]\n",
 "xychart-beta\n  title \"Sales\"\n  x-axis [jan, feb]\n  y-axis \"Rev\" 0 --> 100\n  bar [10, 50]\n  line [10, 50]\n",
 "timeline\n  title History\n  2002 : LinkedIn\n  2004 : Facebook : Google\n",
 "block-beta\n  columns 2\n  a[\"A\"] b[\"B\"]\n  a --> b\n  style a fill:#f9f\n",
 "kanban\n  todo[Todo]\n    t1[Task one]@{ ticket: 12, assigned: 'me', priority: 'High' }\n",
 "C4Context\n  title Sys\n  Person(a, \"Alice\", \"desc\")\n  System(s, \"Sys\", \"desc\")\n  Rel(a, s, \"uses\")\n  UpdateElementStyle(a, $bgColor=\"red\")\n",
 "requirementDiagram\n  requirement r1 {\n    id: 1\n    text: some text\n    risk: high\n    verifymethod: test\n  }\n  element e1 {\n    type: sim\n  }\n  e1 - satisfies -> r1\n",
 "sankey-beta\n  A,B,10\n  B,C,5\n",
 "%% a comment\nflowchart LR\n  A --> B\n  B <--> C\n  C x--x D\n  D o--o E\n",
];
BENIGN.forEach((c,i)=>chk(`still drawn (${i+1}): ${JSON.stringify(c).slice(0,70)}`,A.diagramRisk(c)==="",A.diagramRisk(c)));
chk("an empty or missing source is not a risk",A.diagramRisk("")==="" && A.diagramRisk(null)==="" && A.diagramRisk(undefined)==="");
/* a refused diagram is shown as its source, with one quiet line, and the library is never started */
{const code=`flowchart LR\n A@{ img: "${U}" } --> B`;let started=false;
 const box=A.mermaidNode(code);
 const note=P.find(box,P.hasClass("mfig-note"))[0],pre=P.find(box,x=>x.tagName==="pre")[0];
 chk("a refused diagram is its source in a code block under one line saying it is not drawn",!!note&&!!pre&&/not drawn/.test(P.texts(note))&&P.texts(pre).includes("A@{ img:"),P.texts(box).slice(0,200));
 chk("...the same words exist in French and Spanish",["fr","es","es-AR"].every(l=>typeof A.STRINGS[l].ui.figureRisk==="string"&&A.STRINGS[l].ui.figureRisk.length>20));}
console.log(fails?"\n"+fails+" FAILURES":"\ndiagram checks passed");P.closePages();process.exit(fails?1:0);
