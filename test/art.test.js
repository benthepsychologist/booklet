// The renderer's pictures and faces (0.11.8): the art/ folder, the generated sprite, icon(), the embedded fonts and their licences.
// Run: node test/art.test.js   (node only; nothing to install)
require("./harness.js");
const fs=require("fs"),path=require("path");
const R=path.join(__dirname,".."),A=require("./art-sprite.js");
const html=fs.readFileSync(path.join(R,"booklet.html"),"utf8").replace(/<script type="text\/plain" id="lib-[a-z]+">[\s\S]*?<\/script>/g,"");
const src=fs.readFileSync(path.join(R,"booklet.html"),"utf8").split("<script>\n")[1].split("\n</script>")[0];
let fails=0;const ok=(c,m,d)=>{console.log((c?"  ok    ":"  FAIL  ")+m+(!c&&d!==undefined?"   -> "+d:""));if(!c)fails++;};

/* ---- the art folder ---- */
const icons=A.names("icons"),spots=A.names("spots");
ok(icons.length>=150&&spots.length===24,"art/ holds "+icons.length+" icons and "+spots.length+" spots (24)");
const orphan=spots.filter(n=>!icons.includes(n));
ok(orphan.length===0,"every spot has an icon of the same name, so a picture never comes up empty",orphan.join(","));
const files=[...icons.map(n=>"icons/"+n),...spots.map(n=>"spots/"+n)];
const bad=[];
for(const f of files){const t=fs.readFileSync(path.join(A.ART,f+".svg"),"utf8");
  if(/#[0-9A-Fa-f]{3,8}\b|\brgba?\(|\bhsla?\(|\bstyle=/.test(t)) bad.push(f);
  if(f.startsWith("spots/")&&/\b(?:fill|stroke)="(?!none")/.test(t)) bad.push(f+" (a painted colour)");}
ok(bad.length===0,"no art file carries a hex colour, a style= attribute or a painted colour",bad.join(","));
const names=new Set(["a","w","s","p","l","lw"]),badCls=[];
for(const n of spots){const t=fs.readFileSync(path.join(A.ART,"spots",n+".svg"),"utf8");
  for(const m of t.matchAll(/class="([^"]*)"/g)) for(const c of m[1].split(" ")) if(!names.has(c)) badCls.push(n+":"+c);}
ok(badCls.length===0,"a spot's shapes use only the six classes a w s p l lw",badCls.join(","));
ok(fs.existsSync(path.join(R,"art","README.md"))&&/Apache/.test(fs.readFileSync(path.join(R,"art","README.md"),"utf8"))&&/ISC/.test(fs.readFileSync(path.join(R,"art","README.md"),"utf8")),"art/README.md names the sources and the licences");

/* ---- the sprite ---- */
const sp=A.sprite();
ok(A.problems(fs.readFileSync(path.join(R,"booklet.html"),"utf8")).length===0,"the sprite in booklet.html is what art/ makes");
ok(Buffer.byteLength(sp)<60*1024,"the sprite is under 60 KB ("+Buffer.byteLength(sp)+" bytes)");
const body=sp.slice(sp.indexOf("<svg"));
ok(!/<image\b|<style\b|<script\b|<foreignObject/i.test(body),"no <image>, <style>, <script> or <foreignObject> in the sprite");
ok([...body.matchAll(/\b(?:xlink:)?href="([^"]*)"/g)].every(m=>m[1][0]==="#"),"the sprite's only href are to its own ids");
ok(!/#[0-9A-Fa-f]{3,8}\b|\brgba?\(|\bhsla?\(|\bstyle=/.test(body.replace(/href="#[^"]*"/g,"")),"the sprite holds no hex colour or style=");
ok((body.match(/<symbol id="b[is]-/g)||[]).length===icons.length+spots.length,"one symbol per icon and per spot, ids bi-<name> and bs-<name>");
ok(html.indexOf(A.START)>html.indexOf("<body>")&&html.indexOf(A.END)<html.indexOf('id="main"'),"the sprite sits in the body markup, outside #main");
ok(/ISC License/.test(sp)&&/Apache License 2\.0/.test(sp)&&/Cole Bemis/.test(sp),"the sprite's own comment carries the Lucide ISC notice, the Feather MIT credit and the spots' Apache-2.0 line");

/* ---- icon() ---- */
const G=eval(src+"\n({icon})");
const known=G.icon("chevron-down"),spot=G.icon("scale",{spot:true}),plain=G.icon("scale");
const use=n=>n&&n.children[0];
ok(known&&known.tagName==="svg"&&known.attrs["aria-hidden"]==="true"&&use(known).attrs.href==="#bi-chevron-down","icon(known) is an aria-hidden svg using #bi-<name>",JSON.stringify(known&&known.attrs));
ok(spot&&use(spot).attrs.href==="#bs-scale"&&plain&&use(plain).attrs.href==="#bi-scale","icon(name,{spot:true}) uses #bs-<name>, and icon(name) the icon");
ok(G.icon("no-such-picture")===null&&G.icon("")===null&&G.icon(undefined)===null&&G.icon(7)===null,"an unknown name gives null");
ok(["a\"b","a/b","a#b","../x","bi-x","X","a b","x\"><script>"].every(n=>G.icon(n)===null&&G.icon(n,{spot:true})===null),"a name carrying a quote, a slash, a # or other odd characters gives null");
ok(G.icon("sparkles",{spot:true})&&use(G.icon("sparkles",{spot:true})).attrs.href==="#bs-sparkles","a spot is asked for by its icon's name (sparkles)");
const noSpot=G.icon("chevron-down",{spot:true});
ok(noSpot&&use(noSpot).attrs.href==="#bi-chevron-down","a spot asked for that does not exist falls back to the icon");

/* ---- the fonts ---- */
const faces=[...html.matchAll(/@font-face\{font-family:'([^']+)';font-style:(\w+);font-weight:(\d+);[^}]*?src:url\(data:font\/woff2;base64,([A-Za-z0-9+\/=]+)\) format\('woff2'\);unicode-range:([^}]+)\}/g)];
const total=faces.reduce((n,m)=>n+m[4].length,0);
ok(faces.length===8,"eight @font-face rules, each a data:font/woff2 (Latin and Latin Extended)",faces.length);
ok(total<250*1024,"the fonts total under 250 KB as embedded ("+total+" bytes of base64)");
const have=new Set(faces.map(m=>m[1]+" "+m[3]+" "+m[2]));
ok(["Atkinson Hyperlegible 400 normal","Atkinson Hyperlegible 700 normal","Atkinson Hyperlegible 400 italic","Lexend 600 normal"].every(k=>have.has(k)),"Atkinson at 400, 700 and 400 italic, and Lexend at 600");
ok(faces.every(m=>Buffer.from(m[4],"base64").slice(0,4).toString()==="wOF2"),"each embedded file is a woff2");
ok(/--sans:'Atkinson Hyperlegible'/.test(html)&&/--serif:'Lexend'/.test(html),"the default body face is Atkinson Hyperlegible and the default heading face is Lexend");
ok(/font-src data:/.test(html.slice(0,2000)),"the policy allows font-src data:");
ok(!/fonts\.(?:googleapis|gstatic)|@import|url\((?!data:)/.test(html.slice(html.indexOf("<style>"),html.indexOf("</style>"))),"no font or style is fetched: every url() in the CSS is a data: address");

/* ---- the licences ---- */
const notice=fs.readFileSync(path.join(R,"NOTICE"),"utf8");
ok(/SIL Open Font License/.test(html)&&/Braille Institute/.test(html)&&/Lexend Project Authors/.test(html),"the OFL 1.1 notice for both fonts is in booklet.html");
ok(/SIL Open Font License/.test(notice)&&/Braille Institute/.test(notice)&&/Lexend Project Authors/.test(notice)&&/ISC/.test(notice)&&/Lucide/.test(notice)&&/Apache/.test(notice),"NOTICE carries the OFL, Lucide's ISC and the spots' Apache-2.0");
ok(/const RENDERER_VERSION="0\.11\.9"/.test(html),"RENDERER_VERSION is 0.11.9");
console.log(fails?"\n"+fails+" FAILURES":"\nart checks passed");process.exit(fails?1:0);
