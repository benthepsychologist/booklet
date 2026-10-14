// The one-file build (renderer 0.13.1, item 11). Booklet's renderer is a core, booklet.html, and its parts, the files in parts/
// (today parts/mermaid.js, the diagram library). A part the core does not hold, the page loads from parts/NAME.js beside itself,
// only when a booklet needs it. This script puts every part back inside one file, so a person who wants a single file to save,
// send or open from disk has it, and so every test that guards the renderer can be run on that file as well as on the core.
//   node test/one-file.js [out]    write the build to `out` (default build/booklet.html); prints the sizes
// What it does, and nothing else:
//   1. reads booklet.html and every parts/NAME.js;
//   2. finds each part's notice in the core (the HTML comment that begins `<!-- PART:` and names `parts/NAME.js`) and puts the
//      part directly after it as an inert block, <script type="text/plain" id="lib-NAME">, with `</script` written `<\/script` and
//      `<!--` written `<\!--` (exactly the escape useLib() undoes), the same shape the core's other block (Temml) has;
//   3. writes the Content-Security-Policy meta tag again (test/csp-hash.js), now with one more hash for each block added.
// The part's text is not changed. The build is not committed (build/ is ignored): it is made from the two sources every time.
const fs=require("fs"),path=require("path");
const csp=require("./csp-hash.js");
const R=path.join(__dirname,"..");
/* the core with every part in parts/ put back inside it, as a string */
function build(){
  let html=fs.readFileSync(path.join(R,"booklet.html"),"utf8");
  const dir=path.join(R,"parts");
  const names=fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>/^[a-z][a-z0-9-]*\.js$/.test(f)).map(f=>f.slice(0,-3)).sort():[];
  const inCore=csp.held(html);
  for(const name of names){
    if(inCore.includes(name)) throw new Error("the core already holds "+name+" as a block, and parts/"+name+".js exists as well");
    const text=fs.readFileSync(path.join(dir,name+".js"),"utf8");
    if(/[\u0000\r]/.test(text)) throw new Error("parts/"+name+".js holds a NUL or a carriage return");
    const stored=text.replace(/<\/script/g,"<\\/script").replace(/<!--/g,"<\\!--");
    if(/<\/script/i.test(stored)||/<!--/.test(stored)) throw new Error("parts/"+name+".js holds a form of </script the build cannot store safely");
    if(stored.replace(/<\\\/script/g,"</script").replace(/<\\!--/g,"<!--")!==text) throw new Error("parts/"+name+".js does not round-trip through the stored form");
    /* the part's notice in the core */
    const notes=[...html.matchAll(/<!-- PART:(?:(?!-->)[\s\S])*-->\n/g)].filter(m=>m[0].includes("parts/"+name+".js"));
    if(notes.length!==1) throw new Error("expected one `<!-- PART:` notice naming parts/"+name+".js in booklet.html, found "+notes.length);
    const at=notes[0].index+notes[0][0].length;
    html=html.slice(0,at)+'<script type="text/plain" id="lib-'+name+'">'+stored+"</script>\n"+html.slice(at);}
  return csp.write(html);}
module.exports={build};
if(require.main===module){
  const out=path.resolve(process.argv[2]||path.join(R,"build","booklet.html"));
  const html=build();
  const p=csp.problems(html);
  if(p.length){console.error("FAIL  the build's policy is not current: "+p.join(" | "));process.exit(1);}
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,html);
  const core=fs.statSync(path.join(R,"booklet.html")).size;
  console.log("one-file build written: "+path.relative(process.cwd(),out)+", "+Buffer.byteLength(html)+" bytes (the core is "+core+" bytes, and holds "+csp.held(fs.readFileSync(path.join(R,"booklet.html"),"utf8")).join(", ")+"; the build holds "+csp.held(html).join(", ")+")");}
