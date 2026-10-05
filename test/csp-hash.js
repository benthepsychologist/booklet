// The renderer's own Content-Security-Policy, as a <meta http-equiv> tag directly after the charset tag (renderer 0.11.6).
// The policy names the renderer's own scripts by their sha256, and those change whenever the renderer's code changes, so
// they are computed here, never typed.
//   node test/csp-hash.js --write booklet.html    rewrite the policy line in the meta tag from the file's own scripts
//   node test/csp-hash.js --check booklet.html    exit 1 if the tag is missing, misplaced, not this policy, or stale
// What is hashed is the text the browser actually executes: the theme-boot script and the main script as they stand in the
// file, and each of the two vendored libraries as useLib() starts them (the stored text with `<\/script` put back to
// `</script` and `<\!--` to `<!--`, exactly useLib()'s two replace() calls).
const fs=require("fs"),crypto=require("crypto");
const sha=t=>"'sha256-"+crypto.createHash("sha256").update(t,"utf8").digest("base64")+"'";
/* the four scripts, in the order the policy lists them */
/* the HTML parser rewrites a NUL in script text (to U+FFFD) and a carriage return (to a newline) before anything runs,
   so a script holding either is hashed by the browser as text that is not in the file. The file holds neither: a NUL is
   written as the escape \0, and lines end in a newline alone. Refused here rather than guessed at, since a wrong hash
   stops the renderer from running at all. */
function scripts(html){
  const out=[];
  if(/[\u0000\r]/.test(html)) throw new Error("booklet.html holds a NUL or a carriage return: write a NUL as the escape \\0 and end lines with a newline alone");
  const boot=/<script id="theme-boot">([\s\S]*?)<\/script>/.exec(html);
  const main=/<script>([\s\S]*?)<\/script>/.exec(html);
  if(!boot||!main) throw new Error("the theme-boot script or the main script was not found");
  out.push(["theme-boot",boot[1]],["main",main[1]]);
  for(const name of ["mermaid","temml"]){
    const m=new RegExp('<script type="text/plain" id="lib-'+name+'">([\\s\\S]*?)</script>').exec(html);
    if(!m) throw new Error("the stored library "+name+" was not found");
    out.push(["lib-"+name,m[1].replace(/<\\\/script/g,"</script").replace(/<\\!--/g,"<!--")]);}
  return out;}
/* the policy; %H% is the four hashes. Nothing here is loosened by a host: a host's header can only add a second policy. */
const POLICY=["default-src 'none'",
  "script-src 'self' %H%",
  "style-src 'self' 'unsafe-inline'",
  "img-src data: blob:",
  "connect-src 'self' https://raw.githubusercontent.com",
  "base-uri 'none'","form-action 'none'","object-src 'none'"].join("; ");
const CHARSET='<meta charset="utf-8">';
const policyFor=html=>POLICY.replace("%H%",scripts(html).map(s=>sha(s[1])).join(" "));
const tagFor=html=>'<meta http-equiv="Content-Security-Policy" content="'+policyFor(html)+'">';
const DNS='<meta http-equiv="x-dns-prefetch-control" content="off">';
/* what follows the charset tag, exactly: the policy tag, then the DNS-prefetch tag, each on its own line */
const BLOCK=html=>CHARSET+"\n"+tagFor(html)+"\n"+DNS+"\n";
function problems(html){
  const i=html.indexOf(CHARSET);
  if(i<0) return ["the charset tag is missing"];
  const tail=html.slice(i);
  if(!/^<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="[^"]*">\n/.test(tail))
    return ["the Content-Security-Policy meta tag is missing or is not directly after the charset tag"];
  if(!tail.startsWith(BLOCK(html))){
    const have=/content="([^"]*)"/.exec(tail)[1];
    return [have.replace(/'sha256-[^']*'/g,"H")===POLICY.replace("%H%","H H H H")?"the policy's script hashes are stale (the renderer's scripts changed)":
      "the policy is not the one this renderer carries","  in the file: "+have,"  expected:    "+policyFor(html)];}
  return [];}
/* the page with a current policy block directly after the charset tag: replaces one that is there, or inserts one. The hashes
   cover the scripts only and the meta tags sit before every script, so writing them cannot change what is hashed. Tests that
   serve a changed copy of the renderer (a host that edits it) call this, as a host must. */
function write(html){
  const i=html.indexOf(CHARSET);if(i<0) throw new Error("no charset tag");
  const rest=html.slice(i+CHARSET.length).replace(/^\n<meta http-equiv="Content-Security-Policy" content="[^"]*">/,"").replace(/^\n<meta http-equiv="x-dns-prefetch-control" content="[^"]*">/,"");
  return html.slice(0,i)+BLOCK(html).replace(/\n$/,"")+rest;}
module.exports={write,scripts,policyFor,tagFor,BLOCK,problems,POLICY,CHARSET,DNS};
if(require.main===module){
  const mode=process.argv[2],file=process.argv[3];
  if(!/^--(write|check)$/.test(mode||"")||!file){console.error("usage: node test/csp-hash.js --write|--check booklet.html");process.exit(2);}
  let html=fs.readFileSync(file,"utf8");
  if(mode==="--check"){
    const p=problems(html);
    if(p.length){console.error("FAIL  "+p.join("\n")+"\n  run: node test/csp-hash.js --write booklet.html");process.exit(1);}
    console.log("ok    the Content-Security-Policy meta tag is current ("+scripts(html).length+" script hashes)");process.exit(0);}
  const next=write(html);
  if(next!==html){fs.writeFileSync(file,next);console.log("wrote the Content-Security-Policy meta tag ("+scripts(next).length+" script hashes)");}
  else console.log("already current");}
