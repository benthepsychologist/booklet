// Format 0.5: the theme block, rows and tone names. Run: node test/theme-block.test.js (node and python3).
//   1. a theme is data, never CSS: hostile values reach nothing (parser, derivation and the head script that applies it);
//   2. derivation: every token the built-in themes have, the contrast floor, and the renderer and the linter agree;
//   3. parsing, write-back byte for byte, and who wins (the reader's own pick, leaving the booklet);
//   4. rows: cells, refusals, answers through save and reload, reading mode;
//   5. tone names for widget colours.
const P=require("./page.js");
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};

/* the four built-in token tables, read out of the stylesheet as test/themes.test.js does */
const style=P.html.slice(P.html.indexOf("<style>")+7,P.html.indexOf("</style>")).replace(/\/\*[\s\S]*?\*\//g,"");
const TABLES={};
for(const n of ["paper","daylight","night","contrast"]){
  const m=new RegExp(':root(?:,:root)?\\[data-theme="'+n+'"\\]\\{([^}]*)\\}').exec(style),t={};
  for(const d of m[1].split(";")){const k=/^\s*(--[\w-]+)\s*:(.*)$/.exec(d);if(k) t[k[1]]=k[2].trim();}
  TABLES[n]=t;}
/* what the page's own stylesheet would hand themeBaseTable */
const fakeSheets=[{cssRules:Object.keys(TABLES).map(n=>{const t=TABLES[n],keys=Object.keys(t);
  const st={length:keys.length,getPropertyValue:k=>t[k]||""};keys.forEach((k,i)=>{st[i]=k;});
  return {selectorText:n==="paper"?':root,:root[data-theme="paper"]':':root[data-theme="'+n+'"]',style:st};})}];
global.document.styleSheets=fakeSheets;
const mockTheme={calls:[],names:["auto","paper","daylight","night","contrast"],get:()=>"auto",set(){},custom(t){this.calls.push(t);}};
global.window.bookletTheme=mockTheme;
P.byId("themeSel").options=Array.from({length:5},()=>({}));
const A=P.boot();
const T=n=>A.themeBaseTable(n);

const rgb=h=>{const n=parseInt(h.slice(1),16);return [n>>16,(n>>8)&255,n&255];};
const lum=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*b;};
const ratio=(a,b)=>{const x=lum(rgb(a)),y=lum(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const merged=(base,tokens)=>({...TABLES[base],...tokens});
const passes=(base,tokens)=>A.TH_PAIRS.every(([f,b])=>{const t=merged(base,tokens);return ratio(t["--"+f],t["--"+b])>=4.5;});

chk("the stylesheet reader hands back the base tables",T("night")["--paper"]===TABLES.night["--paper"]&&Object.keys(T("paper")).length===Object.keys(TABLES.paper).length);

/* ---------------- 1. a theme is data, never CSS ---------------- */
const HOSTILE=["red","#fff;}body{display:none","#12345","#1234567","url(https://x.test/a.png)","var(--paper)","rgb(0,0,0)",
  "expression(alert(1))","#fff /*","#fff\nbody{display:none}","javascript:alert(1)","Comic Sans, url(x)","night;","#ffff","#ggg","0xfff",
  "#fff;color:red","'#fff'x","</style><script>alert(1)</script>"];
{let leaked=[];
 for(const key of ["paper","ink","accent","good","warn","bad","base","font","density"])for(const h of HOSTILE){
   /* a value as written in a file, quoted (how a newline can arrive) or bare */
   for(const body of h.includes("\n")?[key+": "+JSON.stringify(h)]:[key+": "+h, key+": "+JSON.stringify(h)]){
     const r=A.readTheme(body);
     if(r.spec[key]!==undefined) leaked.push(key+"="+JSON.stringify(h));}}
 chk("every hostile value, on every key, is dropped by the reader of the block",leaked.length===0,leaked.join(" | "));
 const r=A.readTheme("accent: #0f3d47\nPAPER: \"#F6F1E7\"\nfont: serif\nbase: night\ncolor: red\nnot a line\ndensity: wide");
 chk("a valid line is kept, an unknown key or a line that is not key: value is reported, a wrong word is dropped",
   r.spec.accent==="#0f3d47"&&r.spec.paper==="#f6f1e7"&&r.spec.font==="serif"&&r.spec.base==="night"&&r.bad.length===2&&r.dropped.join()==="density",JSON.stringify(r));
 chk("a colour is lowercased and #rgb is accepted",A.readTheme("ink: #ABC").spec.ink==="#abc");
 chk("a name, an alpha colour and a function are not colours",["red","#ffff","rgba(1,2,3,.5)","hsl(10,10%,10%)","transparent"].every(v=>A.readTheme("ink: "+v).spec.ink===undefined));
}
/* the derived set holds only #rrggbb, and what comes out of the head script holds only that or the fixed tables */
{const out=[];
 for(const body of [HOSTILE.map(h=>"accent: "+JSON.stringify(h)).join("\n"),"accent: #0f3d47\npaper: #f6f1e7\nink: #22201c\ngood: #2e6b3a\nwarn: #7a5c00\nbad: #9c2f1d\nfont: serif\ndensity: roomy"]){
   const d=A.themeDerive(A.readTheme(body).spec,T);
   out.push(...Object.entries(d.tokens));}
 chk("every derived value is #rrggbb",out.every(([k,v])=>/^--[a-z][a-z-]*$/.test(k)&&/^#[0-9a-f]{6}$/.test(v)),JSON.stringify(out.filter(([k,v])=>!/^#[0-9a-f]{6}$/.test(v))));
 const d=A.themeDerive(A.readTheme(HOSTILE.map(h=>"accent: "+JSON.stringify(h)+"\nbase: "+JSON.stringify(h)+"\nfont: "+JSON.stringify(h)).join("\n")).spec,T);
 chk("a block of nothing but hostile values derives nothing at all",d.base==="paper"&&Object.keys(d.tokens).length===0&&d.font==="default"&&d.density==="comfortable",JSON.stringify(d));}
/* the head script, run on its own against a document that records what is set */
function boot(){
  const src=P.html.slice(P.html.indexOf('<script id="theme-boot">')+'<script id="theme-boot">'.length,P.html.indexOf("</script>",P.html.indexOf('<script id="theme-boot">')));
  const style={},attrs={},set=[];
  const de={style:{setProperty(k,v){style[k]=v;set.push([k,v]);},removeProperty(k){delete style[k];}},
    setAttribute(k,v){attrs[k]=String(v);},getAttribute(k){return k in attrs?attrs[k]:null;},removeAttribute(k){delete attrs[k];},hasAttribute(k){return k in attrs;}};
  const store={};
  const win={matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},dispatchEvent(){},localStorage:null};
  const fn=new Function("document","window","localStorage","getComputedStyle","Event",src);
  const doc={documentElement:de,querySelector:()=>null};
  fn(doc,win,{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);}},()=>({getPropertyValue:()=>""}),function(){});
  return {B:win.bookletTheme,style,attrs,set,de};}
{const h=boot();
 h.B.custom({base:"night;",tokens:{"--paper":"red","--x;y":"#fff","--accent":"#fff;}body{display:none","--ink":"url(https://x.test/a.png)","--muted":"#12345"},font:"Comic Sans, url(x)",density:"__proto__"});
 chk("the head script refuses a base it does not know, and applies nothing hostile",h.set.length===0&&h.attrs["data-theme"]==="paper",JSON.stringify([h.set,h.attrs]));
 h.B.custom({base:"night",tokens:{"--paper":"red","--x;y":"#fff","--accent":"#fff;}body{display:none","--ink":"url(https://x.test/a.png)","--muted":"#12345","--good":"#abcdef"},font:"Comic Sans, url(x)",density:"constructor"});
 chk("it sets only a token it knows, with exactly #rrggbb, and no font or density it has no table for",h.set.length===0,JSON.stringify(h.set));
 h.B.custom({base:"night",tokens:{"--paper":"#101820","--bogus":"#abcdef"},font:"serif",density:"constructor"});
 chk("a real token with a real value goes through, an unknown token name does not",h.set.length===2&&h.set.some(([k,v])=>k==="--paper"&&v==="#101820")&&!h.set.some(([k])=>k==="--bogus"),JSON.stringify(h.set));
 const real=A.themeDerive(A.readTheme("accent: #0f3d47\npaper: #f6f1e7\nink: #22201c\nfont: mono\ndensity: roomy").spec,T);
 const h2=boot();h2.B.custom(real);
 const FIXED=new Set(['var(--serif)','var(--sans)',"ui-monospace,SFMono-Regular,Menlo,Consolas,monospace","'Atkinson Hyperlegible',Verdana,Tahoma,sans-serif","1.45",".7rem","1.75","1.3rem",".88rem",".3rem",".5rem","1.45rem","1rem","1rem","2.3rem"]);
 chk("what the head script applies is #rrggbb or a value from its own fixed tables",h2.set.length>0&&h2.set.every(([k,v])=>/^#[0-9a-f]{6}$/.test(v)||FIXED.has(v)),JSON.stringify(h2.set.filter(([k,v])=>!/^#[0-9a-f]{6}$/.test(v)&&!FIXED.has(v))));
 chk("none of it holds anything that could be CSS beyond those",h2.set.every(([k,v])=>!/[;{}<>\n\\]|url\(|expression|javascript/i.test(v)));
 chk("a font and a density come only through their tables (mono sets both faces, roomy a looser line and roomier views)",
   h2.style["--serif"]&&h2.style["--sans"]&&h2.style["--lh"]==="1.75"&&h2.style["--pgap"]==="1.3rem"&&h2.style["--v-fs"]==="1rem"&&h2.style["--v-pad"]===".7rem"&&h2.style["--v-gap"]==="1rem"&&h2.style["--tile-v"]==="2.3rem",JSON.stringify(h2.style));
}

/* ---------------- 2. derivation and the floor ---------------- */
{const builtin=new Set(Object.keys(TABLES.paper));
 const d=A.themeDerive(A.readTheme("base: paper\npaper: #f6f1e7\nink: #22201c\naccent: #0f3d47\ngood: #2e6b3a\nwarn: #7a5c00\nbad: #9c2f1d").spec,T);
 chk("a theme of paper, ink, accent and the three tones keeps every colour it was given",d.dropped.length===0&&d.tokens["--paper"]==="#f6f1e7"&&d.tokens["--ink"]==="#22201c"&&d.tokens["--accent"]==="#0f3d47"
   &&d.tokens["--tone-green-deep"]==="#2e6b3a"&&d.tokens["--tone-amber-deep"]==="#7a5c00"&&d.tokens["--tone-warm-deep"]==="#9c2f1d"&&d.tokens["--warn"]==="#9c2f1d",JSON.stringify(d));
 chk("it only sets tokens the built-in themes define",Object.keys(d.tokens).every(k=>builtin.has(k)),Object.keys(d.tokens).filter(k=>!builtin.has(k)).join());
 chk("the merged set (base table plus derived) defines every token the built-ins do",[...builtin].every(k=>k in merged("paper",d.tokens)));
 chk("and it passes the built-in contrast pairs",passes("paper",d.tokens));
 chk("nothing given, nothing set",Object.keys(A.themeDerive({},T).tokens).length===0&&A.themeDerive({base:"night"},T).base==="night");
 const low=A.themeDerive(A.readTheme("accent: #f6f1e7").spec,T);
 chk("an accent too pale for the paper is not used: the base theme's stays, and the drop is named",
   low.tokens["--accent"]===undefined&&low.dropped.length===1&&low.dropped[0].key==="accent"&&/accent on paper|on-accent on accent/.test(low.dropped[0].pair)&&low.dropped[0].ratio<4.5,JSON.stringify(low));
 const lowInk=A.themeDerive(A.readTheme("paper: #101820\nink: #202830").spec,T);
 chk("an ink and paper that do not read together are both dropped",lowInk.tokens["--paper"]===undefined&&lowInk.dropped.map(x=>x.key).sort().join()==="ink,paper",JSON.stringify(lowInk));
 const darkOk=A.themeDerive(A.readTheme("base: night\npaper: #10161c\nink: #e8e4da\naccent: #8fd0d4").spec,T);
 chk("a dark custom theme derives a dark set that passes",darkOk.dropped.length===0&&passes("night",darkOk.tokens)&&darkOk.tokens["--paper"]==="#10161c",JSON.stringify(darkOk));
 /* the floor, as an invariant: whatever is asked for, what comes out reads */
 let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
 const col=()=>"#"+Array.from({length:3},()=>("0"+Math.floor(rnd()*256).toString(16)).slice(-2)).join("");
 let bad=null,n=0;
 for(let i=0;i<400&&!bad;i++){const base=["paper","daylight","night","contrast"][i%4],spec={base};
   for(const k of ["paper","ink","accent","good","warn","bad"]) if(rnd()<.55) spec[k]=col();
   const o=A.themeDerive(spec,T);n++;
   if(!passes(base,o.tokens)) bad=JSON.stringify(spec);
   if(Object.keys(o.tokens).some(k=>!builtin.has(k))) bad="unknown token "+JSON.stringify(spec);}
 chk("400 random themes over every base: every one passes the built-in pairs ("+n+" run)",!bad,bad);
}
/* the renderer and the linter work it out the same way */
{const lintPy=path.join(R,"lint-booklet.py");
 const specs=[];let seed=777;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
 const col=()=>"#"+Array.from({length:3},()=>("0"+Math.floor(rnd()*256).toString(16)).slice(-2)).join("");
 for(let i=0;i<150;i++){const spec={base:["paper","daylight","night","contrast"][i%4]};
   for(const k of ["paper","ink","accent","good","warn","bad"]) if(rnd()<.5) spec[k]=col();specs.push(spec);}
 specs.push({base:"paper",paper:"#f6f1e7",ink:"#22201c",accent:"#0f3d47",good:"#2e6b3a",warn:"#7a5c00",bad:"#9c2f1d"},{accent:"#f6f1e7"},{paper:"#101820",ink:"#202830"});
 const py=spawnSync("python3",["-c",`
import importlib.util,json,sys
sp=importlib.util.spec_from_file_location("lb",${JSON.stringify(lintPy)});m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
specs=json.load(sys.stdin)
print(json.dumps([{"tokens":d["tokens"],"dropped":[[k,p] for k,p,r in d["dropped"]]} for d in map(m.theme_derive,specs)]))
print(json.dumps(m.TH_BASE))
`],{input:JSON.stringify(specs),encoding:"utf8"});
 if(py.status!==0) chk("the linter's derivation runs",false,py.stderr);
 else{const [a,b]=py.stdout.trim().split("\n"),res=JSON.parse(a).map(r=>({...r,tokens:Object.fromEntries(Object.entries(r.tokens).map(([k,v])=>["--"+k,v]))})),tabs=JSON.parse(b);
   let diff=null;specs.forEach((s,i)=>{const d=A.themeDerive(s,T),want=JSON.stringify({tokens:d.tokens,dropped:d.dropped.map(x=>[x.key,x.pair])}),got=JSON.stringify({tokens:res[i].tokens,dropped:res[i].dropped});
     if(!diff&&want!==got) diff=JSON.stringify(s)+"\n  js "+want+"\n  py "+got;});
   chk("the linter's port gives the same tokens and the same drops as the renderer on "+specs.length+" themes",!diff,diff);
   const same=Object.keys(tabs).every(n=>Object.entries(tabs[n]).every(([k,v])=>String(TABLES[n]["--"+k]).toLowerCase()===v));
   chk("the linter's copy of the four base tables equals the stylesheet's",same);}}

/* ---------------- 3. parse, write back, who wins ---------------- */
const FM='---\nbooklet: "0.10"\nid: t/theme\ntitle: Theme\nlang: en\n---\n\n';
const THEME='```booklet theme\nbase: night\naccent: "#8fd0d4"\nfont: serif\n```\n';
{const r=A.parseFile(FM+THEME+"\n> [!activity|a] A\n\nBody.\n");
 chk("a theme block is read into the template and drawn nowhere",r.ok&&r.template.theme&&r.template.theme.base==="night"&&r.template.theme.accent==="#8fd0d4"
   &&r.template.modules[0].mode.blocks.every(b=>b.type==="markdown"&&!/theme/.test(b.text)),JSON.stringify(r.template.theme)+JSON.stringify(r.unread));
 const two=A.parseFile(FM+THEME+"\n"+THEME.replace("night","paper")+"\n> [!activity|a] A\n\nBody.\n");
 chk("a second theme block is ignored and reported",two.template.theme.base==="night"&&two.unread.some(x=>/one theme block/.test(x)),JSON.stringify(two.unread));
 const inMod=A.parseFile(FM+"> [!module|m] M\n\n"+THEME+"\n> [!activity|a] A\n\nBody.\n\n> [!module|m end] End\n");
 chk("a theme inside a module fence is ignored and reported",!inMod.template.theme&&inMod.unread.some(x=>/belongs to the booklet/.test(x)),JSON.stringify(inMod.unread));
 const dataSec=A.parseFile(FM+"> [!activity|a] A\n\nBody.\n\n> [!data] Data\n\n"+THEME);
 chk("a theme in the data section is the booklet's too",dataSec.template.theme&&dataSec.template.theme.base==="night");
 const bad=A.parseFile(FM+"```booklet theme\naccent: red\nbase: night\nwhat\n```\n\n> [!activity|a] A\n\nBody.\n");
 chk("an invalid value falls back to its default, the rest is kept, and each is reported",bad.template.theme.base==="night"&&bad.template.theme.accent===undefined&&bad.unread.length===2,JSON.stringify(bad.unread));
 chk("a theme block with nothing valid sets no theme",!A.parseFile(FM+"```booklet theme\naccent: red\n```\n\nBody.\n").template.theme);
 /* write-back: the file the reader saved keeps the block byte for byte */
 const src=FM+"Intro.\n\n"+"```booklet theme\nbase: night\naccent:   \"#8fd0d4\"   \n# a comment-ish line? no: not key:value\nfont: serif\n```\n"+"\n> [!activity|a] A\n\n> [!text|q] Q?\n";
 A.loadText(src);
 const out=A.toMarkdown();
 chk("the theme block is written back byte for byte",out.includes("```booklet theme\nbase: night\naccent:   \"#8fd0d4\"   \n# a comment-ish line? no: not key:value\nfont: serif\n```\n"),out.slice(0,400));
 /* a module added to a booklet takes the booklet's look: a theme block in the module file is not spliced in */
 A.loadText(FM+"```booklet theme\nbase: daylight\n```\n\n> [!activity|a] A\n\nBody.\n");
 const modFile='---\nbooklet: "0.10"\nid: t/mod\ntitle: Mod\nlang: en\n---\n\n> [!module|extra] Extra\n\n> [!activity|x] X\n\nHi.\n\n> [!module|extra end] End\n\n> [!data] Data\n\n```booklet theme\nbase: night\n```\n\n```booklet data\n[{"a":1}]\n```\n^rows\n';
 const add=A.addModuleText(modFile);
 const after=A.toMarkdown();
 chk("a module added from a file keeps its data but not its theme block",add.ok&&(after.match(/booklet theme/g)||[]).length===1&&/base: daylight/.test(after)&&/booklet data/.test(after),after.slice(0,600));
}
/* who wins */
{mockTheme.calls.length=0;
 const text=fs.readFileSync(path.join(R,"test/fixtures/theme-and-rows.booklet.md"),"utf8");
 A.loadText(text);
 const last=()=>mockTheme.calls[mockTheme.calls.length-1];
 chk("opening a booklet with a theme hands the page its derived look",last()&&last().base==="daylight"&&last().tokens["--accent"]==="#7a1f5c"&&last().font==="serif"&&last().density==="roomy",JSON.stringify(last()));
 chk("the look the page is given passes the floor",passes("daylight",last().tokens));
 const n=mockTheme.calls.length;A.screen="home";A.render();A.render();
 chk("redrawing does not hand it over again",mockTheme.calls.length===n);
 A.closeBooklet();A.render();
 chk("leaving the booklet (to Your booklets) removes it",last()===null);
 A.loadText(FM+"> [!activity|a] A\n\nBody.\n");
 chk("a booklet with no theme asks for none",last()===null);
 A.loadText(text);A.loadText(FM+"> [!activity|a] A\n\nBody.\n");
 chk("switching to another booklet removes it",last()===null);
}
/* the head script: Auto takes the booklet's look, an explicit pick overrides it, and it is removed cleanly */
{const h=boot(),real=A.themeDerive(A.readTheme("base: daylight\npaper: #eef3f8\nink: #14202b\naccent: #7a1f5c\nfont: serif\ndensity: roomy").spec,T);
 h.B.custom(real);
 chk("Auto + a booklet theme: its base is the theme in force, its tokens are set",h.attrs["data-theme"]==="daylight"&&h.attrs["data-theme-custom"]==="1"&&h.style["--accent"]==="#7a1f5c"&&h.style["--lh"]==="1.75");
 h.B.set("night");
 chk("an explicit Night replaces its colours only: Night in force, no colour token left, but its font and density still apply",
   h.attrs["data-theme"]==="night"&&!h.attrs["data-theme-custom"]&&!Object.keys(h.style).some(k=>/^--(paper|ink|accent|muted|surface|rule|tone-)/.test(k))
   &&h.style["--lh"]==="1.75"&&h.style["--pgap"]==="1.3rem"&&h.style["--v-pad"]===".7rem"&&h.style["--sans"]==="var(--serif)",JSON.stringify(h.style));
 h.B.set("auto");
 chk("back to Auto brings it back",h.attrs["data-theme"]==="daylight"&&h.style["--accent"]==="#7a1f5c");
 h.B.custom(null);
 chk("leaving the booklet removes it cleanly and Auto follows the device again",h.attrs["data-theme"]==="paper"&&Object.keys(h.style).length===0&&!h.attrs["data-theme-custom"]);
 chk("the reader's own pick is never written by a booklet",h.B.get()==="auto");
}

/* ---------------- 4. rows ---------------- */
const ROWFM=FM+"> [!activity|a] A\n\n";
const shape=a=>a.blocks.map(b=>b.type==="row"?"row["+b.blocks.map(c=>c.blocks.map(x=>x.type==="markdown"?"md":x.type).join("+")).join("|")+"]":b.type).join(",");
const mode=t=>{const r=A.parseFile(ROWFM+t);return {r,a:r.template.modules[0].mode};};
{let x=mode("> [!row]\n\n### One\n\nText one.\n\n### Two\n\nText two.\n\n> [!row end]\n");
 chk("each heading at the shallowest level starts a cell",x.r.ok&&shape(x.a)==="row[md|md]"&&x.r.unread.length===0,shape(x.a)+JSON.stringify(x.r.unread));
 x=mode("> [!row]\n\nLead words.\n\n## One\n\nA\n\n#### Deeper\n\nstays in One\n\n## Two\n\nB\n\n> [!row end]\n");
 chk("what comes before the first heading is a cell of its own, and a deeper heading stays inside its cell",shape(x.a)==="row[md|md|md]"&&/Deeper/.test(x.a.blocks[0].blocks[1].blocks[0].text),shape(x.a));
 x=mode("> [!row]\n\nFirst paragraph.\n\nSecond paragraph.\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n> [!row end]\n");
 chk("with no headings each block is a cell",shape(x.a)==="row[md|md|md]",shape(x.a));
 x=mode("> [!row]\n\n### Ask\n\n> [!text|q1] Q?\n\n> [!hint]- Hint\n> a hint\n\n### Other\n\nx\n\n> [!row end]\n");
 chk("a question and its hint stay in one cell",shape(x.a)==="row[md+text+callout|md]",shape(x.a));
 x=mode("> [!row]\n\n> [!text|q1] Q?\n\n> [!hint]- Hint\n> a hint\n\n> [!text|q2] R?\n\n> [!row end]\n");
 chk("and with no headings a hint stays with its question",shape(x.a)==="row[text+callout|text]",shape(x.a));
 x=mode("> [!row]\n\n### A\n\n```python\n# not a heading\nprint(1)\n```\n\n### B\n\nx\n\n> [!row end]\n");
 chk("a # line inside a code fence is not a heading",shape(x.a)==="row[md|md]",shape(x.a));
 x=mode("Before.\n\n> [!row]\n\n### A\n\nx\n\n### B\n\ny\n\n> [!row end]\n\nAfter.\n");
 chk("prose before and after the row stays outside it",shape(x.a)==="markdown,row[md|md],markdown",shape(x.a));
 x=mode("> [!row]\n\n### A\n\nx\n\n---\n\n### B\n\ny\n\n> [!row end]\n");
 chk("a page break closes the row there, and says so",x.r.unread.some(r=>/runs into a page break/.test(r))&&x.a.pages&&x.a.pages.length===2,JSON.stringify(x.r.unread));
 x=mode("> [!row]\n\n### A\n\nx\n\n> [!activity|b] B\n\n### B\n\ny\n\n> [!row end]\n");
 chk("an activity line closes it there, and the stray end is reported",x.r.unread.some(r=>/runs into an activity line/.test(r))&&x.r.unread.some(r=>/closed that was never opened/.test(r)),JSON.stringify(x.r.unread));
 x=mode("> [!row]\n\n### A\n\nx\n");
 chk("a row never closed is reported and its content is still shown",x.r.unread.some(r=>/never closed/.test(r))&&shape(x.a)==="row[md]",shape(x.a)+JSON.stringify(x.r.unread));
 x=mode("> [!row]\n\n### A\n\n> [!row]\n\nnested\n\n> [!row end]\n\nafter\n");
 chk("a row inside a row is ignored and reported",x.r.unread.some(r=>/inside a row/.test(r)),JSON.stringify(x.r.unread));
 x=mode("> [!row end]\n\ntext\n");
 chk("a row end with no row is reported",x.r.unread.some(r=>/never opened/.test(r)),JSON.stringify(x.r.unread));
 x=mode("> [!row]\n\n> [!row end]\n\ntext\n");
 chk("an empty row draws nothing",shape(x.a)==="markdown",shape(x.a));
 const mfence=A.parseFile(FM+"> [!module|m] M\n\n> [!activity|a] A\n\n> [!row]\n\n### A\n\nx\n\n> [!module|m end] End\n");
 chk("a module fence closes it there",mfence.unread.some(r=>/runs into a module fence/.test(r)),JSON.stringify(mfence.unread));
}
{/* a question in a cell is the same question: its answer is saved and read back */
 const text=fs.readFileSync(path.join(R,"test/fixtures/theme-and-rows.booklet.md"),"utf8");
 A.loadText(text);
 const S0=A.STATE;S0.answers[""]={};S0.answers[""].mood=2;S0.answers[""].note="Cut the kale back";
 const out=A.toMarkdown();
 chk("the answers are written under the booklet's record, not inside the row",/booklet answers\n\{[^}]*"mood": 2[^}]*"note": "Cut the kale back"/.test(out)&&out.indexOf("booklet answers")>out.indexOf("[!row end]"),out.slice(-500));
 A.loadText(out);
 chk("they are there again after a reload, and the rows are as they were",A.STATE.answers[""].mood===2&&A.STATE.answers[""].note==="Cut the kale back"&&shape(A.activityOf("week"))==="markdown,row[md|md],markdown,row[md|md+scale|md+text],widget",shape(A.activityOf("week")));
 chk("the question inside a cell keeps its own key",(()=>{const r=A.activityOf("week").blocks.find((b,i)=>b.type==="row"&&i>2);const q=r.blocks[1].blocks.find(x=>x.type==="scale");return q&&q.keys[0]==="mood";})());
 chk("saved a second time, the file is identical (rows and theme write back as found)",A.toMarkdown()===out);
 /* reading mode: sections are the headings OUTSIDE rows */
 const reads=FM+"> [!activity|a] A\n\n## First\n\nOne.\n\n> [!row]\n\n### Left\n\nl\n\n### Right\n\nr\n\n> [!row end]\n\n## Second\n\nTwo.\n";
 A.loadText(reads);
 chk("an activity of prose and rows still folds into sections",A.readsOnly(A.activityOf("a")));
 A.screen="a";A.render();
 const secs=P.find(P.main(),P.hasClass("rm-sec"));
 chk("its sections are the headings outside the row (two), the row is one block inside the first",secs.length===2&&P.find(secs[0],P.hasClass("rowcell")).length===2&&P.find(secs[1],P.hasClass("rowcell")).length===0,String(secs.length));
 A.loadText(FM+"> [!activity|a] A\n\n## First\n\nOne.\n\n> [!row]\n\n### Left\n\n```booklet data\n[{\"a\":1}]\n```\n^rows\n\n```booklet query\nfrom: rows\nas: table\n```\n\n### Right\n\nr\n\n> [!row end]\n\n## Second\n\nTwo.\n");
 chk("a row holding a data-drawing query stays open, as a query always does",!A.readsOnly(A.activityOf("a")));
 /* a link to a heading inside a row still finds its page */
 A.loadText(FM+"> [!activity|a] A\n\nGo to [[#Right side]].\n\n> [!activity|b] B\n\n> [!row]\n\n### Left side\n\nl\n\n### Right side\n\nr\n\n> [!row end]\n");
 const mods=A.allModules();
 const hit=(()=>{for(const m of mods)for(const ac of (m.activities||[m.mode])) if(ac.blocks&&ac.blocks.some(b=>b.type==="row")) return ac.id;})();
 chk("activity links find a heading inside a row",hit==="b");
}
/* a query in a row reads within its module like any other, and one whose source is a question in another cell works */
{const x=A.parseFile(ROWFM.replace("> [!activity|a] A\n\n","> [!activity|log repeat] Log\n\n> [!text|what] What?\n\n> [!activity|look] Look\n\n")+"> [!row]\n\n### Shown\n\n```booklet query\nfrom: log\n```\n\n### Missing\n\n```booklet query\nfrom: nothing\n```\n\n> [!row end]\n");
 const row=x.template.modules.map(m=>m.mode).find(a=>a.id==="look").blocks.find(b=>b.type==="row");
 chk("a query naming nothing is refused inside a row too, and the other draws",x.unread.some(r=>/nothing/.test(r))&&row.blocks[0].blocks.some(b=>b.type==="query")&&!row.blocks[1].blocks.some(b=>b.type==="query"),JSON.stringify(x.unread));
}

/* ---------------- 5. tone names ---------------- */
{const cell=c=>({id:"x",label:"X",color:c});
 const k=A.cellColor(cell("warm"),0);
 chk("a tone name draws in the theme's own tone tokens",k.tint==="var(--tone-warm)"&&k.deep==="var(--tone-warm-deep)"&&k.tone===true);
 chk("every one of the five names resolves",["warm","green","amber","slate","teal"].every(n=>A.cellColor(cell(n),0).tint==="var(--tone-"+n+")"));
 chk("its style names the theme's tokens only",A.cellStyle(cell("green"),0)==="background:var(--tone-green);--qd:var(--tone-green-deep);--qt:var(--tone-green)");
 chk("a pair of hex colours is drawn exactly as given",A.cellColor(cell({tint:"#F0D9CF",deep:"#A04E34"}),0).tint==="#F0D9CF"&&A.cellStyle(cell({tint:"#F0D9CF",deep:"#A04E34"}),0)==="background:#F0D9CF;--qd:#A04E34");
 chk("an unknown name falls back to the default cell tints",A.cellColor(cell("chartreuse"),2).tint==="var(--cell-2)"&&A.cellColor(cell("chartreuse"),2).deep==="var(--tint-ink)"&&!A.toneOf(cell("chartreuse")));
 chk("a name that is not a plain string name never reaches a style",["constructor","__proto__","warm;background:red",["warm"],{}].every(v=>A.cellStyle(cell(v),0).indexOf("red")<0&&!A.toneOf(cell(v))));
 /* the tone tokens exist in every theme, with ink readable on them */
 chk("every theme has the five tone tints and deep colours, and the floor checks them",["paper","daylight","night","contrast"].every(n=>["warm","green","amber","slate","teal"].every(t=>TABLES[n]["--tone-"+t]&&TABLES[n]["--tone-"+t+"-deep"])&&passes(n,{})));
 chk("Night's tones are dark tints (a cell does not glare)",lum(rgb(TABLES.night["--tone-green"]))<.05&&lum(rgb(TABLES.paper["--tone-green"]))>.5);
 chk("Paper's and Daylight's green is the one the registry's check-in used",TABLES.paper["--tone-green"]==="#DCE7D2"&&TABLES.daylight["--tone-green"]==="#DCE7D2");
 const ex=fs.readFileSync(path.join(R,"examples/mindful-check-in.booklet.md"),"utf8");
 chk("the example names its cell colours as tones",["warm","green","slate","teal"].every(n=>ex.includes('"color": "'+n+'"'))&&!/"tint"/.test(ex));
 const r=A.parseFile(ex);const w=r.template.widgets.find(x=>x.cells);
 chk("and loads, its cells carrying the names",r.ok&&w.cells.map(c=>c.color).join()==="warm,green,slate,teal",JSON.stringify(w.cells.map(c=>c.color)));
}

/* a hex pair from a file goes into a style attribute: only plain hex colours are ever used */
{const bad=A.cellStyle({color:{tint:"#fff;background:url(https://x.test/a.png)",deep:"red;position:fixed"}},0);
 chk("a colour pair that is not hex never reaches the style",!/url\(|position|;background:|red/.test(bad),bad);
 const good=A.cellStyle({color:{tint:"#F0D9CF",deep:"#A04E34"}},0);
 chk("a hex pair is drawn as given",/#F0D9CF/.test(good)&&/#A04E34/.test(good),good);}

/* the interface */
chk("Auto has a hint in every language saying it is the booklet's look or the device's",["en","fr","es"].every(l=>A.STRINGS[l].ui.themeAutoTip&&A.STRINGS[l].ui.themeAutoTip.length>20));

console.log(fails?`\n${fails} theme-block checks failed`:"\nall theme-block checks passed");
process.exit(fails?1:0);
