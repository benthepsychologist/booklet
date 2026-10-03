// The four built-in themes (paper, daylight, night, contrast) are token tables keyed by data-theme. This reads them out of
// booklet.html and checks: every theme defines the same tokens; WCAG contrast of the pairs text is drawn in; the print table
// is a light theme; and no colour literal is left in the renderer's own CSS or scripts outside those tables.
// Run: node test/themes.test.js      (Needs node; nothing to install.)
const fs=require("fs"),path=require("path");
const html=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8")
  .replace(/<script type="text\/plain" id="lib-[a-z]+">[\s\S]*?<\/script>/g,"");
let fails=0;const ok=(c,m)=>{console.log((c?"  ok    ":"  FAIL  ")+m);if(!c)fails++;};
const style=html.slice(html.indexOf("<style>")+7,html.indexOf("</style>"));
// token tables: a rule whose selector is :root (alone or with [data-theme=…]) and whose body sets custom properties
const tables={};let print=null;
const stripped=style.replace(/\/\*[\s\S]*?\*\//g,"");
const names=["paper","daylight","night","contrast"];
for(const n of names){
  const m=new RegExp(':root(?:,:root)?\\[data-theme="'+n+'"\\]\\{([^}]*)\\}').exec(stripped);
  if(!m){ok(false,"token table for "+n);continue;}
  const t={};for(const d of m[1].split(";")){const k=/^\s*(--[\w-]+)\s*:(.*)$/.exec(d);if(k)t[k[1]]=k[2].trim();else if(/color-scheme/.test(d))t["color-scheme"]=d.split(":")[1].trim();}
  tables[n]=t;}
{const m=/@media print\{\s*:root\[data-theme\]\{([^}]*)\}/.exec(stripped);
 if(m){print={};for(const d of m[1].split(";")){const k=/^\s*(--[\w-]+)\s*:(.*)$/.exec(d);if(k)print[k[1]]=k[2].trim();}}}
ok(Object.keys(tables).length===4,"four theme tables found");
const keys=k=>Object.keys(tables[k]).sort().join(",");
for(const n of names.slice(1)) ok(keys(n)===keys("paper"),n+" defines exactly the tokens paper does ("+Object.keys(tables.paper).length+")");
ok(print&&Object.keys(print).concat("color-scheme").sort().join(",")===keys("paper"),"the print table defines the same tokens");
ok(print&&JSON.stringify(print)===JSON.stringify(Object.fromEntries(Object.entries(tables.daylight).filter(([k])=>k!=="color-scheme"))),"print uses the Daylight values (light)");
ok(tables.night["color-scheme"]==="dark"&&tables.paper["color-scheme"]==="light","color-scheme is set per theme");
const rgb=h=>{const m=/^#([0-9a-f]{6})$/i.exec(h);if(!m)throw new Error("not a hex colour: "+h);const n=parseInt(m[1],16);return [n>>16,(n>>8)&255,n&255];};
const lum=h=>{const [r,g,b]=rgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*b;};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const pairs=[["ink","paper"],["ink","paper-deep"],["muted","paper"],["accent","paper"],["on-accent","accent"],["ink","field"],
  ["reader","field"],["ink","surface"],["accent","surface"],["muted","surface"],["warn","paper"],["on-ink","ink"],["on-ink","muted"],
  ["ink","accent-soft"],["ink","mark"],["warn","warn-soft"]];
for(const t of ["warm","green","amber","slate","teal"]){pairs.push(["tone-"+t+"-deep","tone-"+t]);pairs.push(["ink","tone-"+t]);}
for(const n of names){
  for(const [f,b] of pairs){const r=ratio(tables[n]["--"+f],tables[n]["--"+b]);ok(r>=4.5,n+": "+f+" on "+b+" "+r.toFixed(2)+":1");}
  if(n==="contrast"){const r=ratio(tables[n]["--ink"],tables[n]["--paper"]);ok(r>=7,"contrast: ink on paper "+r.toFixed(2)+":1 (7 needed)");}}
// no colour literal outside the tables, in the CSS and the page's own scripts (the head icons and meta are assets, not CSS)
let rest=stripped.replace(/:root[^{]*\{[^}]*\}/g,m=>/--paper:/.test(m)?"":m);
const scripts=[...html.matchAll(/<script(?![^>]*type="text\/plain")[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
const lit=/#[0-9A-Fa-f]{3,8}\b|\brgba?\(|\bhsla?\(/g;
const cssLeft=(rest.match(lit)||[]);
ok(cssLeft.length===0,"no colour literal in the CSS outside the token tables"+(cssLeft.length?" ("+cssLeft.slice(0,5)+")":""));
// scripts: strip comments and the "#" of selectors/ids is a risk, so match only hex that is a whole quoted colour or inside a style string
const sLeft=(scripts.replace(/\/\*[\s\S]*?\*\//g,"").match(/["'`]#[0-9A-Fa-f]{3,8}["'`]|rgba?\(|hsla?\(/g)||[]);
ok(sLeft.length===0,"no colour literal in the page's scripts"+(sLeft.length?" ("+sLeft.slice(0,5)+")":""));
ok(!/\.col\{max-width:64ch\}/.test(style),"the 64ch page column cap is gone");
console.log(fails?"\n"+fails+" FAILURES":"\nthemes checks passed");process.exit(fails?1:0);
