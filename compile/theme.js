"use strict";
/* compile/theme.js: a booklet's own look (a `booklet theme` block, SPEC.md section 7), as attributes of its page.

   The renderer does the work: it reads the block key by key (readTheme: a value that is not exactly a hex colour or one of
   the listed words is dropped, and said so among the file's problems) and works every other colour out from the few the
   booklet names (themeDerive), holding each pair that is read to 4.5 to 1: a colour that would not be is left out, and the
   base theme's own is used. engine.js hands that over as plain data (themeOf). This file turns it into the page's
   --bk-* variables and writes nothing else:

     - the base theme the booklet names (or Paper, when it names only colours) is the article's data-bk-base;
     - each colour themeDerive worked out is one --bk-* variable on the article, in one style attribute, as #rrggbb;
     - `font` and `density` are looked up in the two tables below (the renderer's own, held to its head script by
       test/compile-views.test.js), and `style` sets the corners;
     - a standalone page also puts both on its <body>, so the paper under the article is the booklet's too.

   Nothing a booklet says reaches the attribute as text: a colour is written only after it matches #rrggbb again here, a
   variable name comes from a fixed set (VAR_OF), and a font, a density and a style are names looked up in a table. So a
   theme cannot write a declaration of its own, load anything, or leave the article's box: the variables are read by the
   stylesheet's rules for what is inside .booklet, and nothing else.
   A host whose security policy refuses inline styles shows the page with the stylesheet's own look: the page reads the same. */

/* the renderer's tokens that have a --bk-* variable of the same meaning (the others have no use on a page) */
const SAME=["paper","paper-deep","ink","muted","rule","surface","accent","accent-soft","mark","warn"];
const COLOURS=["warm","green","amber","slate","teal","blue","purple"],HUES=["sky","rose","sage","sun","lilac","petrol","slate"];
const VAR_OF=Object.create(null);
for(const k of SAME) VAR_OF["--"+k]="--bk-"+k;
for(const c of COLOURS){VAR_OF["--tone-"+c]="--bk-"+c;VAR_OF["--tone-"+c+"-deep"]="--bk-"+c+"-ink";}
for(const h of HUES){VAR_OF["--h-"+h]="--bk-"+h+"-soft";VAR_OF["--h-"+h+"-vivid"]="--bk-"+h+"-vivid";VAR_OF["--h-"+h+"-deep"]="--bk-"+h+"-deep";}

/* `font:` sets the text and heading faces together, as the renderer's head script does (its --sans and --serif) */
const FONTS={serif:"var(--bk-fam-serif)",sans:"var(--bk-fam-sans)",mono:"var(--bk-font-code)",readable:"var(--bk-fam-read)"};
/* `density:` sizes the views and the prose: the renderer's DENSITY table, by the variable each of its names is here
   (--lh the leading, --pgap the space after a paragraph, --v-fs, --v-pad and --tile-v a view's size and padding and a
   tile's figure, --v-gap the gap between tiles) */
const DENSITY={
  compact:{"--bk-line":"1.45","--bk-pgap":".7rem","--bk-v-fs":".88rem","--bk-v-pad":".3rem","--bk-gap":".5rem","--bk-tile-v":"1.45rem"},
  roomy:{"--bk-line":"1.75","--bk-pgap":"1.3rem","--bk-v-fs":"1rem","--bk-v-pad":".7rem","--bk-gap":"1rem","--bk-tile-v":"2.3rem"}};
/* `style:` changes shapes and never colours: here, the corners (the renderer's --r-md and --r-sm). Its solid tiles and its
   spot drawings are not drawn (a compiled page draws no pictures of its own). `teaching` is the stylesheet's default. */
const STYLES={briefing:{"--bk-radius":"6px","--bk-radius-small":"4px"}};
const STYLE_BASES={paper:1,daylight:1,night:1,contrast:1};
const COLOUR_KEYS=["paper","ink","accent","good","warn","bad"];
const HEX=/^[#][0-9a-f]{6}$/;
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

/* theme(spec, derived): {attrs, report}. `spec` is the design's theme (what the renderer kept of the block), `derived` the
   renderer's themeDerive of it (engine.js's themeOf). attrs: the attributes for the article (and a standalone page's body),
   or null when the booklet's look changes nothing. report: what the build report says, in the compiler's words. */
function theme(spec,derived){
  if(!spec||typeof spec!=="object"||!Object.keys(spec).length||!derived) return {attrs:null,report:null};
  const decl=[],attrs={};
  if(derived.colours){
    attrs["data-bk-base"]=hasOwn(STYLE_BASES,derived.base)?derived.base:"paper";
    for(const [k,v] of Object.entries(derived.tokens||{})){
      if(!(k in VAR_OF)||typeof v!=="string"||!HEX.test(v)) continue;
      decl.push(VAR_OF[k]+":"+v);}}
  if(hasOwn(FONTS,derived.font)) decl.push("--bk-font-text:"+FONTS[derived.font],"--bk-font-head:"+FONTS[derived.font]);
  if(hasOwn(DENSITY,derived.density)) for(const [k,v] of Object.entries(DENSITY[derived.density])) decl.push(k+":"+v);
  if(hasOwn(STYLES,derived.style)) for(const [k,v] of Object.entries(STYLES[derived.style])) decl.push(k+":"+v);
  if(decl.length) attrs.style=decl.join(";");
  const dropped=(derived.dropped||[]).filter(d=>d&&COLOUR_KEYS.includes(d.key)).map(d=>({key:d.key,pair:String(d.pair).replace(/[^a-z -]/g,""),ratio:Number(d.ratio)}));
  /* the colours the page uses: those the booklet named, less those left out for their contrast */
  const used=COLOUR_KEYS.filter(k=>typeof spec[k]==="string"&&!dropped.some(d=>d.key===k));
  return {attrs:Object.keys(attrs).length?attrs:null,
    report:{base:derived.colours?attrs["data-bk-base"]:"",used,dropped,font:hasOwn(FONTS,derived.font)?derived.font:"",
      density:hasOwn(DENSITY,derived.density)?derived.density:"",style:hasOwn(STYLES,derived.style)?derived.style:""}};}

/* the build report's words for a theme report */
function words(t){
  const L=[];
  const bits=[];
  if(t.base) bits.push("base "+t.base);
  if(t.used.length) bits.push("colours "+t.used.join(", "));
  if(t.font) bits.push("font "+t.font);
  if(t.density) bits.push("density "+t.density);
  if(t.style) bits.push("style "+t.style);
  L.push("  Theme: "+(bits.length?bits.join("; "):"the booklet asks for nothing the page can use")+".");
  for(const d of t.dropped) L.push("    - the theme's "+d.key+" was not used: "+d.pair+" would read at "+d.ratio+" to 1, under the 4.5 to 1 the format asks for, so the base theme's colour stands.");
  return L;}

module.exports={theme,words,FONTS,DENSITY,STYLES,VAR_OF,COLOUR_KEYS};
