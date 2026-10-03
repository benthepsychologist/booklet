// The renderer is a bare renderer: it draws what SPEC.md defines and loads
// modules from the registry, and carries nothing else. This fails if a name
// from the removed built-ins, wrapper, shelf or locking code comes back.
// Run: node test/guard.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
/* the vendored libraries (mermaid, Temml) sit asleep in <script type="text/plain" id="lib-…"> blocks; this guard
   reads the renderer, not them, so those blocks are left out (test/figures.test.js checks them) */
const html=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8")
  .replace(/<script type="text\/plain" id="lib-[a-z]+">[\s\S]*?<\/script>/g,"");
const BANNED=["ENTRY_STORE","emptyCheckin","emptyToday","goodday","checkins","BODY_KEYS","TODAY_KEYS","skipBody",
  "LIBRARY(","acquisitions","KEYS_BY_TYPE","LEGACY_KEYS","wrapperConfig","addModFile","veilSafety","veilRemind",
  "veilLock",'"checkin"','"today"',
  /* the second trimming pass: no in-booklet Load or merge, no address-bar routing,
     no install manifest, no callout filter, no second copy of the registry URL */
  "btnLoad","veilMerge","hashchange",'rel="manifest"',"rd-filter","DEFAULT_REGISTRY"];
let fails=0;
for(const w of BANNED){const n=html.split(w).length-1;
  if(n){fails++;console.log("  FAIL  booklet.html still contains "+w+" ("+n+"x)");}
  else console.log("  ok    no "+w);}
// The renderer's one setting: exactly one registry meta tag, and the URL lives there only.
{const n=html.split('<meta name="booklet-registry"').length-1;
  if(n===1) console.log("  ok    exactly one booklet-registry meta tag");
  else{fails++;console.log("  FAIL  expected one <meta name=\"booklet-registry\"> tag, found "+n);}
  const u=html.split("booklet-registry/main/registry.json").length-1;
  if(u===1) console.log("  ok    the registry URL appears once");
  else{fails++;console.log("  FAIL  the registry URL appears "+u+" times");}}
// The engines style what a module's figure carries by the engine's own classes, never a
// module's: svg-regions regions (class "rg") and every other shape as an outline. Without
// these an SVG draws as a solid black silhouette, which no other check notices.
for(const rule of [".svgfig .rg{",".svgfig .rg.on{",".svgfig svg :is(ellipse,circle,path,rect,polygon,polyline,line):not(.rg){"]){
  if(html.includes(rule)) console.log("  ok    styles "+rule.slice(0,-1));
  else{fails++;console.log("  FAIL  no CSS rule "+rule.slice(0,-1));}}
if(!html.includes('el("div",{class:"svgfig"})')){fails++;console.log("  FAIL  svg-regions figure wrapper lacks class svgfig");}
if(/\.bodyfig/.test(html)){fails++;console.log("  FAIL  booklet.html styles a module's own class (.bodyfig)");}
console.log(fails?"\n"+fails+" FAILURES":"\nguard checks passed");
process.exit(fails?1:0);
