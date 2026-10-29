// The compiler's stylesheet (compile/booklet.css) held to the renderer it copies (compile 0.1.0).
//   - Its colours are the renderer's: each of the four base tables (Paper, the default; Daylight; Night; Contrast), the
//     dark table a standalone page takes on a dark device, and the print table, holds every --bk-* colour, each equal to
//     the token it names in booklet.html's own theme tables (the header of booklet.css says which token each one copies).
//   - The values every theme shares (the grid's quiet ramp, its ink and chips, the measure, the corners, the spacing, the
//     three faces) are the renderer's.
//   - Its @font-face rules are the faces booklet.html carries, one for one, named as the compiler writes them beside it.
//   - Every class the compiler writes on a page has a rule (save the few that are only hooks for a host), every callout
//     hue and every widget colour name has its rule, and the stylesheet fetches nothing but its own fonts.
// Run: node test/compile-css.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,".."),C=require("../compile/compile.js"),E=require("../compile/engine.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const X=E.load(),R=X.R;
const css=fs.readFileSync(path.join(ROOT,"compile","booklet.css"),"utf8");
const page=fs.readFileSync(path.join(ROOT,"booklet.html"),"utf8");
const rcss=page.slice(page.indexOf("<style>"),page.indexOf("</style>"));

/* the renderer's tables: :root (Paper) and :root[data-theme="…"] */
const decls=body=>{const o={};for(const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) o[m[1]]=m[2].trim();
  const cs=/color-scheme\s*:\s*([a-z]+)/.exec(body);if(cs) o["color-scheme"]=cs[1];return o;};
const ruleAt=(text,sel)=>{const i=text.indexOf(sel);if(i<0) return null;const a=i+sel.length;return text.slice(a,text.indexOf("}",a));};
const theme=base=>decls(ruleAt(rcss,base==="paper"?':root,:root[data-theme="paper"]{':':root[data-theme="'+base+'"]{')||"");
const shared=decls(ruleAt(rcss,"  :root{\n")||"");
const BASES=["paper","daylight","night","contrast"];
const HUES=[...new Set(Object.values(R.CALLOUT_LOOK).map(l=>l.hue))],COLOURS=[...R.COLOUR_NAMES];
/* which renderer token each --bk- colour copies */
const tokenOf=n=>{for(const h of HUES){if(n===h+"-soft") return "h-"+h;if(n===h+"-vivid") return "h-"+h+"-vivid";if(n===h+"-deep") return "h-"+h+"-deep";}
  for(const c of COLOURS){if(n===c) return "tone-"+c;if(n===c+"-ink") return "tone-"+c+"-deep";}
  return {border:"bw",focus:"focus-w"}[n]||n;};
const COLOUR_KEYS=["paper","paper-deep","ink","muted","rule","surface","accent","accent-soft","mark","warn","border","focus",
  ...COLOURS.flatMap(c=>[c,c+"-ink"]),...HUES.flatMap(h=>[h+"-soft",h+"-vivid",h+"-deep"])];

/* ---- the tables ---- */
const tables=[
  ["the default (Paper)","paper",":where(.booklet, .bk-page){",css],
  ["a dark device (Night)","night",":where(.bk-page:not([data-bk-base]), .bk-page:not([data-bk-base]) .booklet:not([data-bk-base])){",css.slice(css.indexOf("@media (prefers-color-scheme: dark){"))],
  ...BASES.map(b=>['data-bk-base="'+b+'"',b,':where([data-bk-base="'+b+'"], [data-bk-base="'+b+'"] .booklet:not([data-bk-base])){',css]),
  ["print (Daylight)","daylight",":where(.booklet, .bk-page){",css.slice(css.indexOf("@media print{"))]];
chk("the dark table sits in a prefers-color-scheme: dark query, the print table in a print query",css.includes("@media (prefers-color-scheme: dark){")&&css.includes("@media print{"));
for(const [label,base,sel,text] of tables){
  const body=ruleAt(text,sel);if(body===null){chk(label+": the table is there",false,sel);continue;}
  const mine=decls(body),theirs=theme(base);
  const missing=COLOUR_KEYS.filter(k=>!("--bk-"+k in mine));
  chk(label+": holds every colour ("+COLOUR_KEYS.length+")",!missing.length,missing.join(", "));
  const wrong=COLOUR_KEYS.filter(k=>("--bk-"+k in mine)&&mine["--bk-"+k]!==theirs["--"+tokenOf(k)]).map(k=>"--bk-"+k+" "+mine["--bk-"+k]+" ≠ --"+tokenOf(k)+" "+theirs["--"+tokenOf(k)]);
  chk(label+": each equals the renderer's "+base+" token",!wrong.length,wrong.join("; "));
  chk(label+": its color-scheme is the renderer's",mine["color-scheme"]===theirs["color-scheme"],mine["color-scheme"]+" vs "+theirs["color-scheme"]);}

/* ---- the shared values ---- */
const def=decls(ruleAt(css,":where(.booklet, .bk-page){")||"");
const expand=v=>String(v||"").replace(/var\(--(fam-[a-z]+)\)/g,(m,k)=>shared["--"+k]);
const same=[["--bk-tint-ink","--tint-ink"],["--bk-chip","--tint-chip"],["--bk-chip-line","--tint-chip-bd"],["--bk-measure","--measure"],
  ["--bk-radius","--r-md"],["--bk-radius-small","--r-sm"],["--bk-gap","--v-gap"],...[0,1,2,3,4,5].map(i=>["--bk-cell-"+i,"--cell-"+i])];
for(const [a,b] of same) chk(a+" is the renderer's "+b+" ("+shared[b]+")",def[a]===shared[b],def[a]);
chk("--bk-font-text is the renderer's text face (--sans)",def["--bk-font-text"]===expand(shared["--sans"]),def["--bk-font-text"]);
chk("--bk-font-head is the renderer's heading face (--serif)",def["--bk-font-head"]===expand(shared["--serif"]),def["--bk-font-head"]);
chk("--bk-font-code is the renderer's code face (--fam-mono)",def["--bk-font-code"]===shared["--fam-mono"],def["--bk-font-code"]);
const htmlRule=/\n\s*html\{([^}]*)\}/.exec(rcss)[1];
chk("--bk-size and --bk-line are the renderer's page text",htmlRule.includes("font-size:"+def["--bk-size"])&&htmlRule.includes("line-height:var(--lh,"+def["--bk-line"]+")"),htmlRule);
chk("the defaults weigh nothing (every table is inside :where())",[...css.matchAll(/^\s*([^{}@\n][^{}\n]*)\{[^}]*--bk-paper:/gm)].every(m=>/^:where\(/.test(m[1].trim())));

/* ---- the fonts ---- */
const faces=[...css.matchAll(/@font-face\{font-family:'([^']+)';font-style:([a-z]+);font-weight:(\d+);font-display:swap;\s*src:url\(fonts\/([^)]+)\) format\('woff2'\);\s*unicode-range:([^}]+)\}/g)]
  .map(m=>[m[1],m[2],m[3],m[4],m[5].trim()].join(" | "));
const theirFaces=X.fonts().faces.map(f=>[f.family,f.style,f.weight,f.name,f.range].join(" | "));
chk("its @font-face rules are booklet.html's faces, one for one ("+theirFaces.length+")",JSON.stringify(faces)===JSON.stringify(theirFaces),faces.length+" vs "+theirFaces.length);
chk("it names no font file but the ones the compiler writes",(css.match(/@font-face/g)||[]).length===faces.length);
const urls=[...css.matchAll(/url\(([^)]*)\)/g)].map(m=>m[1]);
chk("it fetches nothing but its own fonts (no @import, no other url())",!/@import/.test(css)&&urls.every(u=>/^fonts\/[a-z0-9-]+\.woff2$/.test(u)),urls.filter(u=>!/^fonts\//.test(u)).join(", "));

/* ---- every class the compiler writes has a rule ---- */
const inputs=[...fs.readdirSync(path.join(ROOT,"examples")).filter(f=>f.endsWith(".booklet.md")).map(f=>({file:path.join(ROOT,"examples",f)})),
  ...["compile-article","compile-kinds","compile-quiz","figures"].map(n=>({file:path.join(__dirname,"fixtures",n+".booklet.md")}))];
const run=C.compile(inputs,{form:"both",engine:X});
const classes=new Set();
for(const r of run.results) for(const [rel,data] of r.files) if(rel.endsWith(".html")) for(const m of String(data).matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach(c=>c&&classes.add(c));
const HOOK=/^bk-(activity|module|tab|q-(text|lines|number|date|choice|multi|scale|matrix)|w-[a-z-]+|k-[a-z]+|hint|solution|link|quote|page)$|^tml-/;
const bare=[...classes].filter(c=>!HOOK.test(c)&&!new RegExp("\\."+c.replace(/-/g,"\\-")+"(?![\\w-])").test(css));
chk("every class the compiler writes has a rule ("+classes.size+" classes; hooks for a host aside)",!bare.length,bare.join(", "));
chk("every class it writes is a bk- class, the article's root, or Temml's own",[...classes].every(c=>/^bk-|^booklet$|^tml-/.test(c)),[...classes].filter(c=>!/^bk-|^booklet$|^tml-/.test(c)).join(", "));
for(const h of HUES) chk("the "+h+" hue has its rule",new RegExp("\\.bk-hue-"+h+"\\{--bk-c-soft:var\\(--bk-"+h+"-soft\\);--bk-c-vivid:var\\(--bk-"+h+"-vivid\\);--bk-c-deep:var\\(--bk-"+h+"-deep\\)\\}").test(css));
for(const c of COLOURS) chk("the colour name "+c+" has its rule",new RegExp("\\.bk-c-"+c+"\\{--bk-cell-wash:var\\(--bk-"+c+"\\);--bk-cell-name:var\\(--bk-"+c+"-ink\\)\\}").test(css));
chk("a fold's sign, a plus that turns into a minus, needs no script",/\.bk-fold>summary::after\{content:"\+"/.test(css)&&/\.bk-fold\[open\]>summary::after\{content:"\\2212"!important\}/.test(css));
chk("a display formula's style is the stylesheet's, not an inline one",/\.bk-math-display math\{display:block math!important\}/.test(css));

/* ---- held against a host: every rule inside the article weighs three ids and every declaration in it is !important
   (custom properties aside, so a host's own --bk-* values still win), and the revert rule comes first ---- */
const code=css.replace(/\/\*[\s\S]*?\*\//g,"");
const WEIGHT=".booklet:not(#bk):not(#bk):not(#bk)";
const rules=[];
for(const m of code.matchAll(/([^{}]*)\{([^{}]*)\}/g)){const s=m[1].trim();if(!s||s.startsWith("@")) continue;
  const sels=[];let depth=0,cur="";for(const ch of s){if(ch==="(") depth++;if(ch===")") depth--;if(ch===","&&!depth){sels.push(cur.trim());cur="";}else cur+=ch;}sels.push(cur.trim());
  rules.push({sels,body:m[2]});}
const selectors=rules.flatMap(r=>r.sels);
const esc=WEIGHT.replace(/[().#]/g,"\\$&");
const loose=selectors.filter(s=>!/^:where\(/.test(s)&&!/^\.bk-(page|main)(?![\w-])/.test(s)&&!new RegExp("^"+esc+"(?![\\w(-])").test(s));
chk("every rule inside the article starts "+WEIGHT+", three ids' weight ("+selectors.length+" selectors; the :where() tables and the standalone page's body aside)",!loose.length,loose.slice(0,5).join(" | "));
const guarded=rules.filter(r=>r.sels.every(s=>s.startsWith(WEIGHT)));
const plainDecls=guarded.flatMap(r=>r.body.split(";").map(d=>d.trim()).filter(d=>d&&!d.startsWith("--")&&!/!important$/.test(d)).map(d=>r.sels[0].slice(WEIGHT.length).trim()+" { "+d+" }"));
const customImportant=guarded.flatMap(r=>r.body.split(";").map(d=>d.trim()).filter(d=>d.startsWith("--")&&/!important$/.test(d)));
chk("every declaration inside the article is !important ("+guarded.length+" rules), and no custom property is (a host's --bk-* values win)",!plainDecls.length&&!customImportant.length,[...plainDecls,...customImportant].slice(0,4).join(" | "));
chk("the variables' defaults stay plain and weigh nothing",[...code.matchAll(/^\s*(:where\([^{]*)\{([^}]*)\}/gm)].every(m=>!/!important/.test(m[2])));
const firstLook=code.search(new RegExp(esc+" [^{]*\\{(?!all:revert)")),guard=code.indexOf(WEIGHT+" :where(:not(svg, svg *, math, math *)),");
chk("the revert rule is there, !important, for every element but the icons and formulas, and before every other rule inside the article",
  guard>=0&&guard<firstLook&&/:where\(:not\(svg, svg \*, math, math \*\)\)::after\{all:revert!important\}/.test(code)&&/::marker\{all:revert!important\}/.test(code),guard+" vs "+firstLook);

console.log(fails?"\n"+fails+" FAILURES":"\ncompile stylesheet passed");process.exit(fails?1:0);
