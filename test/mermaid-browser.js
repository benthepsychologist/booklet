// Browser check that a diagram can never make the page ask for an address (format v0.11). The renderer reads each diagram's
// source with diagramRisk() and never hands a source that could cause a request to the library. This draws diagrams through
// the renderer's own mermaidNode() in headless Chromium on a page with NO Content-Security-Policy, counts every request, and
// asserts: (1) a corpus of ordinary diagrams of every common type is drawn, with no request; (2) every source below that is
// refused is shown as its source with the line saying it is not drawn, and no request leaves for the address it names;
// (3) a matrix of style, classDef, directive and front-matter forms with an address in each (url, quoted url, protocol-relative,
// relative, image-set ...) in many diagram types makes no request either. Then, as information, it hands the image-node source to
// the library directly and says whether the library itself would have asked: that is why the refusal exists.
// Usage: PLAYWRIGHT=/path/to/node_modules/playwright node test/mermaid-browser.js <booklet.html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const HTML=path.resolve(process.argv[2]);
const fails=[];const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails.push(m);};
const PAGE='https://plain.test/app/',PROBE='probe.example';
const U=id=>`https://${PROBE}/${id}`;
const BENIGN={
 flowchart:"flowchart LR\n  A[Start] --> B{Choice}\n  B -->|yes| C[Done]\n  B -->|no| D((Stop))\n  style A fill:#f9f,stroke:#333\n  classDef big fill:#bbf,stroke:#333,stroke-width:2px;\n  class C big\n  subgraph one [Group]\n    E --> F\n  end\n",
 'flowchart with br and a shape block':"flowchart TD\n  A@{ shape: rect, label: \"Plain\" } --> B[Line one<br/>line two]\n  B --> C[/Trapezoid\\]\n",
 sequence:"sequenceDiagram\n  participant A as Alice\n  actor B as Bob\n  A->>B: Hello<br/>there\n  Note over A,B: a note\n  rect rgb(200,200,255)\n  B-->>A: Hi\n  end\n",
 class:"classDiagram\n  class Animal {\n    <<interface>>\n    +int age\n    +eat() void\n  }\n  class Dog\n  Animal <|-- Dog\n",
 state:"stateDiagram-v2\n  [*] --> Still\n  Still --> Moving: go\n  Moving --> [*]\n  classDef c fill:#fff,color:#333\n  class Still c\n",
 er:"erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  CUSTOMER {\n    string name\n    int id PK\n  }\n",
 gantt:"gantt\n  title Plan\n  dateFormat YYYY-MM-DD\n  section S\n  Task one :a1, 2024-01-01, 3d\n  Task two :after a1, 2d\n",
 pie:"pie title Pets\n  \"Dogs\" : 386\n  \"Cats\" : 85\n",
 journey:"journey\n  title Day\n  section Work\n    Make tea: 5: Me\n",
 git:"gitGraph\n  commit id: \"a\"\n  branch dev\n  commit tag: \"v1\"\n  checkout main\n  merge dev\n",
 quadrant:"quadrantChart\n  title Reach\n  x-axis Low --> High\n  y-axis Low --> High\n  quadrant-1 Expand\n  Campaign A: [0.3, 0.6]\n",
 xychart:"xychart-beta\n  title \"Sales\"\n  x-axis [jan, feb]\n  y-axis \"Rev\" 0 --> 100\n  bar [10, 50]\n  line [10, 50]\n",
 timeline:"timeline\n  title History\n  2002 : LinkedIn\n  2004 : Facebook : Google\n",
 block:"block-beta\n  columns 2\n  a[\"A\"] b[\"B\"]\n  a --> b\n",
};
/* every source here is one the library would act on (the first five each made a request when handed to it directly, 2026-10-05),
   or one of the kinds the renderer refuses because it cannot rule them out */
const REFUSED={
 'image node (img:)':id=>`flowchart LR\n A@{ img: "${U(id)}", label: "x", pos: "t", w: 60, h: 60 } --> B`,
 'image node, icon:':id=>`flowchart LR\n A@{ icon: "${U(id)}", form: "square" }`,
 'init directive themeCSS':id=>`%%{init: {"themeCSS": ".node{background:url(${U(id)})}"}}%%\nflowchart LR\n A --> B`,
 'init directive fontFamily':id=>`%%{init: {"fontFamily": "url(${U(id)})"}}%%\nflowchart LR\n A --> B`,
 'front matter config':id=>`---\nconfig:\n  themeCSS: "@import url(${U(id)});"\n---\nflowchart LR\n A --> B`,
 'sequence properties icon':id=>`sequenceDiagram\n participant A\n properties A: {"icon": "${U(id)}"}\n A->>A: x`,
 'sequence participant icon':id=>`sequenceDiagram\n participant A@{ "type": "actor", "icon": "${U(id)}" }\n A->>A: x`,
 'class style url()':id=>`classDiagram\n class A\n style A fill:url(${U(id)})`,
 'state classDef url()':id=>`stateDiagram-v2\n [*] --> S1\n classDef c fill:url(${U(id)})\n class S1 c`,
 'html img in a label':id=>`flowchart LR\n A["<img src='${U(id)}'>"] --> B`,
 'html svg image in a label':id=>`flowchart LR\n A[<svg><image href='${U(id)}'/></svg>] --> B`,
 'markdown image in a label':id=>`flowchart LR\n A["\`![x](${U(id)})\`"] --> B`,
 'entity-encoded tag':id=>`flowchart LR\n A[#60;img src='${U(id)}'#62;] --> B`,
 'click href':id=>`flowchart LR\n A --> B\n click A href "${U(id)}"`,
 'sequence link':id=>`sequenceDiagram\n participant A\n link A: Docs @ ${U(id)}\n A->>A: x`,
 'c4 sprite':id=>`C4Context\n Person(a, "A", "d", $sprite="${U(id)}")`,
 'c4 bgColor url()':id=>`C4Context\n System(s,"S","d")\n UpdateElementStyle(s, $bgColor="url(//${PROBE}/${id})")`,
 'kanban img':id=>`kanban\n c[C]\n  t[T]@{ img: '${U(id)}' }`,
};
/* the matrix: an address in every style / classDef / directive / front-matter slot, in the forms CSS accepts */
const FORMS=[id=>`url(${U(id)})`,id=>`url('${U(id)}')`,id=>`url("${U(id)}")`,id=>`url(//${PROBE}/${id})`,id=>`url(probe-rel/${id})`,id=>`url( ${U(id)} )`,id=>`image-set("${U(id)}" 1x)`,id=>`image(${U(id)})`,id=>`src(${U(id)})`];
const SLOTS=[
 f=>`flowchart LR\n A --> B\n style A fill:${f}`,f=>`flowchart LR\n A --> B\n style A background:${f}`,f=>`flowchart LR\n A --> B\n style A fill:#fff,stroke:${f}`,
 f=>`flowchart LR\n A --> B\n classDef x fill:${f}\n class A x`,f=>`flowchart LR\n A:::x --> B\n classDef x background-image:${f}`,
 f=>`flowchart LR\n A --> B\n linkStyle 0 stroke:${f}`,f=>`flowchart LR\n A --> B\n linkStyle default stroke:${f}`,
 f=>`stateDiagram-v2\n [*] --> S\n classDef c fill:${f}\n class S c`,f=>`stateDiagram-v2\n [*] --> S\n style S fill:${f}`,
 f=>`classDiagram\n class A\n style A fill:${f}`,f=>`classDiagram\n class A\n classDef c fill:${f}\n cssClass "A" c`,
 f=>`block-beta\n a\n style a fill:${f}`,f=>`erDiagram\n A ||--o{ B : x\n style A fill:${f}`,
 f=>`sequenceDiagram\n rect ${f}\n A->>B: x\n end`,f=>`sequenceDiagram\n box ${f} T\n participant A\n end\n A->>B: x`,
 f=>`requirementDiagram\n requirement r {\n id: 1\n text: t\n risk: high\n verifymethod: test\n }\n style r fill:${f}`,
 f=>`quadrantChart\n A: [0.3, 0.6] radius: 12, color: ${f}`,f=>`quadrantChart\n A: [0.3, 0.6] stroke-color: ${f}`,
 f=>`C4Context\n Person(a, "A", "d")\n UpdateElementStyle(a, $bgColor="${f}")`,
];
const CFG=[(k,v)=>`%%{init: {"${k}": "${v}"}}%%\nflowchart LR\n A --> B`,(k,v)=>`%%{init: {"themeVariables": {"${k}": "${v}"}}}%%\nflowchart LR\n A --> B`,(k,v)=>`---\nconfig:\n  ${k}: "${v}"\n---\nflowchart LR\n A --> B`,(k,v)=>`---\nconfig:\n  themeVariables:\n    ${k}: "${v}"\n---\nflowchart LR\n A --> B`,(k,v)=>`%%{init: {"flowchart": {"${k}": "${v}"}}}%%\nflowchart LR\n A --> B`];
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();
  const seen=[],errs=[];
  p.on('request',r=>seen.push(r.url()));p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*',r=>{const u=r.request().url();
    if(u===PAGE)return r.fulfill({status:200,body:fs.readFileSync(HTML),headers:{'content-type':'text/html; charset=utf-8'}});
    if(/^(data|blob|about):/.test(u))return r.continue();
    r.abort();});
  await p.goto(PAGE);await p.waitForTimeout(500);
  const probe=()=>seen.filter(u=>u.includes(PROBE)||u.includes('probe-rel')||u.includes('control.example'));
  /* hand each source to the renderer's own diagram node, and report what came of it */
  const through=(codes)=>p.evaluate(async codes=>{const out=[];
    for(const [id,code] of codes){const box=mermaidNode(code);document.getElementById('main').append(box);
      for(let i=0;i<40&&!box.querySelector('svg')&&!box.classList.contains('bad');i++) await new Promise(r=>setTimeout(r,50));
      await new Promise(r=>setTimeout(r,30));
      out.push([id,{svg:!!box.querySelector('svg'),bad:box.classList.contains('bad'),note:(box.querySelector('.mfig-note')||{}).textContent||'',code:(box.querySelector('pre code')||{}).textContent||''}]);}
    return out;},codes);
  // 1 ordinary diagrams are drawn, and ask for nothing
  const ben=await through(Object.entries(BENIGN));
  ok(seen.every(u=>u===PAGE||/^(data|blob|about):/.test(u)),'drawing '+ben.length+' ordinary diagrams made no request beyond the page: '+seen.filter(u=>u!==PAGE).slice(0,3).join(', '));
  for(const [id,r] of ben) ok(r.svg&&!r.bad,'an ordinary '+id+' diagram is drawn (not refused)'+(r.svg?'':' - '+r.note.slice(0,60)));
  // 2 the refused list: shown as source, with the line, and no request
  const before=seen.length;
  const ref=await through(Object.entries(REFUSED).map(([k,f],i)=>[k,f('r'+i)]));
  for(const [k,r] of ref) ok(r.bad&&!r.svg&&/not drawn/.test(r.note)&&r.code.length>10,'refused, shown as its source with the line saying so: '+k);
  await p.waitForTimeout(600);
  ok(probe().length===0,'refused diagrams: not one request for an address they name ('+probe().slice(0,3).join(', ')+')');
  // 3 the matrix
  const cases=[];let n=0;
  for(const sl of SLOTS) for(const f of FORMS) cases.push(['m'+(++n),sl(f('m'+n))]);
  for(const k of ['themeCSS','fontFamily','altFontFamily']) for(const f of FORMS.slice(0,5)) for(const w of CFG){n++;cases.push(['m'+n,w(k,f('m'+n).replace(/"/g,"'"))]);}
  const mat=await through(cases);
  await p.waitForTimeout(800);
  const drawn=mat.filter(([,r])=>r.svg).length;
  ok(probe().length===0,'the matrix of '+cases.length+' style, classDef, directive and front-matter sources (each form of an address in each slot): not one request ('+probe().slice(0,3).join(', ')+'); '+mat.filter(([,r])=>r.bad).length+' refused, '+drawn+' drawn');
  ok(errs.length===0,'zero page errors '+errs.join('|'));
  // information: what the library does by itself with the image-node source, and the control that this page sees requests
  const base=seen.length;
  const raw=await p.evaluate(async src=>{useLib('mermaid');let M=__esbuild_esm_mermaid_nm.mermaid;M=M.default||M;M.initialize(mermaidConfig());
    try{await Promise.race([M.render('rawimg',src),new Promise((_,j)=>setTimeout(()=>j(new Error('t')),2500))]);}catch(e){}
    await new Promise(r=>setTimeout(r,400));return true;},REFUSED['image node (img:)']('raw'));
  const asked=seen.slice(base).some(u=>u.includes('/raw'));
  console.log('INFO the library handed the image-node source directly '+(asked?'DOES':'did NOT')+' ask for the address (securityLevel strict, htmlLabels off): '+(asked?'this is why diagramRisk() refuses it first':'it no longer does; the refusal stays, as the other forms still do'));
  await p.evaluate(()=>{(window.__c=new Image()).src='https://control.example/c.gif';});await p.waitForTimeout(400);
  ok(seen.slice(base).some(u=>u==='https://control.example/c.gif'),'control: a request the test makes on purpose is recorded, so the zero counts above mean something');
  await b.close();
  console.log(fails.length?'FAILED '+fails.length:'ALL PASSED');process.exit(fails.length?1:0);
})();
