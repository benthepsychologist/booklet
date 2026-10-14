// The four built-in themes (paper, daylight, night, contrast) are token tables keyed by data-theme. This reads them out of
// booklet.html and checks: every theme defines the same tokens; WCAG contrast of the pairs text is drawn in; the print table
// is a light theme; and no colour literal is left in the renderer's own CSS or scripts outside those tables.
// Run: node test/themes.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const html=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8")
  .replace(/<script type="text\/plain" id="lib-[a-z][a-z0-9-]*">[\s\S]*?<\/script>/g,"");
let fails=0;const ok=(c,m)=>{console.log((c?"  ok    ":"  FAIL  ")+m);if(!c)fails++;};
const style=html.slice(html.indexOf("<style>")+7,html.indexOf("</style>"));
// token tables: a rule whose selector is :root (alone or with [data-theme=…]) and whose body sets custom properties
const tables={};let print=null,printImportant=false;
const stripped=style.replace(/\/\*[\s\S]*?\*\//g,"");
const names=["paper","daylight","night","contrast"];
for(const n of names){
  const m=new RegExp(':root(?:,:root)?\\[data-theme="'+n+'"\\]\\{([^}]*)\\}').exec(stripped);
  if(!m){ok(false,"token table for "+n);continue;}
  const t={};for(const d of m[1].split(";")){const k=/^\s*(--[\w-]+)\s*:(.*)$/.exec(d);if(k)t[k[1]]=k[2].trim();else if(/color-scheme/.test(d))t["color-scheme"]=d.split(":")[1].trim();}
  tables[n]=t;}
{const m=/@media print\{\s*:root\[data-theme\]\{([^}]*)\}/.exec(stripped);
 if(m){print={};printImportant=true;for(const d of m[1].split(";")){const k=/^\s*(--[\w-]+)\s*:(.*)$/.exec(d);
   if(k){const v=k[2].trim();if(!/\s!important$/.test(v)) printImportant=false;print[k[1]]=v.replace(/\s*!important$/,"");}}}}
ok(Object.keys(tables).length===4,"four theme tables found");
const keys=k=>Object.keys(tables[k]).sort().join(",");
for(const n of names.slice(1)) ok(keys(n)===keys("paper"),n+" defines exactly the tokens paper does ("+Object.keys(tables.paper).length+")");
ok(print&&Object.keys(print).concat("color-scheme").sort().join(",")===keys("paper"),"the print table defines the same tokens");
ok(printImportant,"every print token is !important, so a booklet's own look (set on <html>) can never reach a printed page");
ok(print&&JSON.stringify(print)===JSON.stringify(Object.fromEntries(Object.entries(tables.daylight).filter(([k])=>k!=="color-scheme"))),"print uses the Daylight values (light)");
ok(tables.night["color-scheme"]==="dark"&&tables.paper["color-scheme"]==="light","color-scheme is set per theme");
const rgb=h=>{const m=/^#([0-9a-f]{6})$/i.exec(h);if(!m)throw new Error("not a hex colour: "+h);const n=parseInt(m[1],16);return [n>>16,(n>>8)&255,n&255];};
const lum=h=>{const [r,g,b]=rgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*b;};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const pairs=[["ink","paper"],["ink","paper-deep"],["muted","paper"],["accent","paper"],["on-accent","accent"],["ink","field"],
  ["reader","field"],["ink","surface"],["accent","surface"],["muted","surface"],["warn","paper"],["on-ink","ink"],["on-ink","muted"],
  ["ink","accent-soft"],["ink","mark"],["warn","warn-soft"]];
for(const t of ["warm","green","amber","slate","teal"]){pairs.push(["tone-"+t+"-deep","tone-"+t]);pairs.push(["ink","tone-"+t]);}
/* the views (format 0.7): a plain pill, a toned value on a card (and a badge pill on a toned card: its deep colour on the surface), a quiet note and a label on a toned tile */
pairs.push(["reader","paper-deep"],["muted","paper-deep"]);
for(const t of ["warm","green","amber"]){pairs.push(["tone-"+t+"-deep","surface"]);pairs.push(["muted","tone-"+t]);pairs.push(["reader","tone-"+t]);}
/* the hues (0.11.9): text pairs at 4.5 to 1, picture pairs (a third item, 3) at 3 to 1 */
const HUES=["sky","rose","sage","sun","lilac","petrol","slate"];
for(const h of HUES){pairs.push(["h-"+h+"-deep","h-"+h],["h-"+h+"-deep","surface"],["h-"+h+"-deep","paper"],["ink","h-"+h],
  ["h-"+h+"-vivid","h-"+h,3],["on-solid","h-"+h+"-solid",3]);}
{const want=HUES.flatMap(h=>["h-"+h,"h-"+h+"-vivid","h-"+h+"-solid","h-"+h+"-deep"]).concat(["on-solid","spark"]).map(x=>"--"+x).sort();
 for(const n of names){const have=Object.keys(tables[n]).filter(k=>/^--(h-|on-solid$|spark$)/.test(k)).sort();
   ok(JSON.stringify(have)===JSON.stringify(want),n+" carries the four shades of each of seven hues, --on-solid and --spark ("+want.length+" tokens)");}}
for(const n of names){
  for(const [f,b,min] of pairs){const r=ratio(tables[n]["--"+f],tables[n]["--"+b]);ok(r>=(min||4.5),n+": "+f+" on "+b+" "+r.toFixed(2)+":1"+(min?" (picture, "+min+" needed)":""));}
  if(n==="contrast"){const r=ratio(tables[n]["--ink"],tables[n]["--paper"]);ok(r>=7,"contrast: ink on paper "+r.toFixed(2)+":1 (7 needed)");}}
// no colour literal outside the tables, in the CSS and the page's own scripts (the head icons and meta are assets, not CSS)
let rest=stripped.replace(/:root[^{]*\{[^}]*\}/g,m=>/--paper:|--tint-ink:/.test(m)?"":m);
const scripts=[...html.matchAll(/<script(?![^>]*type="text\/plain")[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
const lit=/#[0-9A-Fa-f]{3,8}\b|\brgba?\(|\bhsla?\(/g;
const cssLeft=(rest.match(lit)||[]);
ok(cssLeft.length===0,"no colour literal in the CSS outside the token tables"+(cssLeft.length?" ("+cssLeft.slice(0,5)+")":""));
// scripts: strip comments and the "#" of selectors/ids is a risk, so match only hex that is a whole quoted colour or inside a style string
const sLeft=(scripts.replace(/\/\*[\s\S]*?\*\//g,"").match(/["'`]#[0-9A-Fa-f]{3,8}["'`]|rgba?\(|hsla?\(/g)||[]);
ok(sLeft.length===0,"no colour literal in the page's scripts"+(sLeft.length?" ("+sLeft.slice(0,5)+")":""));
// the picture sprite carries no colour either: its shapes take classes, and the CSS above gives the classes their colours
const sprite=html.slice(html.indexOf("<!-- art:start -->"),html.indexOf("<!-- art:end -->"));
ok(sprite.length>1000,"the sprite block is found ("+sprite.length+" bytes)");
const spriteLit=(sprite.match(lit)||[]).concat(sprite.match(/\bstyle=|\b(?:fill|stroke|stop-color|flood-color)="(?!none"|currentColor")[^"]*"/g)||[]);
ok(spriteLit.length===0,"no colour literal, style attribute or painted colour in the sprite"+(spriteLit.length?" ("+spriteLit.slice(0,5)+")":""));
// the two styles are fixed tables of the same keys, in the head script, and no selector names a style or a base outside the token tables
{const boot=html.slice(html.indexOf('<script id="theme-boot">'),html.indexOf("</script>",html.indexOf('<script id="theme-boot">')));
 const m=/var STYLES=(\{[\s\S]*?\});\s*var STYLE_NAMES/.exec(boot);
 const STY=m?new Function("return "+m[1])():null;
 ok(!!STY&&Object.keys(STY).join()==="teaching,briefing","STYLES holds teaching and briefing");
 if(STY){ok(Object.keys(STY.teaching).sort().join()===Object.keys(STY.briefing).sort().join(),"both styles carry the same keys ("+Object.keys(STY.teaching).join(" ")+")");
   ok(Object.entries(STY).every(([n,t])=>Object.entries(t).every(([k,v])=>k==="picture"?(v==="spot"||v==="icon"):(/^--(r-lg|r-md|r-sm|tile-solid)$/.test(k)&&!/#|rgb|hsl/.test(v)))),"a style sets only radii, --num-w, --tile-solid and picture, and no colour");
   ok(STY.teaching["--tile-solid"]==="0"&&STY.briefing["--tile-solid"]==="1"&&STY.teaching.picture==="spot"&&STY.briefing.picture==="icon","teaching: soft tile (--tile-solid 0), spots; briefing: solid tile (--tile-solid 1), icons");}
 const sel=[...stripped.matchAll(/(?:^|\})\s*([^{}@]+)\{/g)].map(x=>x[1]).filter(x=>!/^\s*:root/.test(x));
 const named=sel.filter(x=>/data-style|data-theme|\.(teaching|briefing)\b/.test(x));
 ok(named.length===0,"no CSS selector names a style or a base outside the token tables"+(named.length?" ("+named.slice(0,3)+")":""));
 ok(!/data-style/.test(stripped),"the stylesheet never reads data-style");}
ok(!/\.col\{max-width:64ch\}/.test(style),"the 64ch page column cap is gone");
console.log(fails?"\n"+fails+" FAILURES":"\nthemes checks passed");process.exit(fails?1:0);
