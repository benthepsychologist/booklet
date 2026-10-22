// The submit build: booklet-submit.html, a copy of the one-file renderer with Submit added, for a host that wants a reader's
// answers sent to an address it declares. It is never the published booklet.html, which this script reads and never writes.
//   node submit/build.js --endpoint <url> [--script </host.js>] [--out <file>]
//     --endpoint  the address Submit sends to, e.g. https://recepture-....run.app/submit: https, no query, no fragment
//                 (plain http only for this machine, for testing)
//     --script    the host's own script, a path on the page's own origin; written as <script src> before </body>, so the
//                 file built is the file served, and its checksum is the one a host publishes
//     --out       where to write it (default build/booklet-submit.html; build/ is not committed); prints its sha256
// What it does, and nothing else:
//   1. makes the one-file build (test/one-file.js) from booklet.html and parts/;
//   2. puts submit/submit.js directly after the main script, as <script id="booklet-submit">;
//   3. writes the address in <meta name="booklet-submit">, after the policy and DNS-prefetch tags;
//   4. writes the policy again: the renderer's own (test/csp-hash.js), with this script's sha256 added to script-src and the
//      address's origin added to connect-src. Nothing else in the policy changes.
// strip() undoes exactly those steps; test/submit-build.test.js checks that what it gives back is the one-file build.
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const csp=require("../test/csp-hash.js"),oneFile=require("../test/one-file.js");
const R=path.join(__dirname,"..");
const CONNECT="connect-src 'self' https://raw.githubusercontent.com";
const LOOPBACK=new Set(["127.0.0.1","localhost","[::1]"]);
const sha=t=>"'sha256-"+crypto.createHash("sha256").update(t,"utf8").digest("base64")+"'";
const attr=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const SCRIPT_OPEN='<script id="booklet-submit">';
/* the address, checked: recepture refuses a query, and a page may send nothing else in a URL */
function address(raw){const s=String(raw==null?"":raw).trim();let u;
  try{u=new URL(s);}catch(e){throw new Error("--endpoint is not an absolute address: "+s);}
  if(u.username||u.password) throw new Error("the address may not carry a user name or password");
  if(u.search||u.hash||s.includes("?")||s.includes("#")) throw new Error("the address may carry no query and no fragment");
  if(u.protocol!=="https:"&&!(u.protocol==="http:"&&LOOPBACK.has(u.hostname)))
    throw new Error("the address must be https (plain http only for this machine, for testing): "+s);
  return u;}
/* the host's script: a path on the page's own origin, which is all the policy's script-src 'self' allows */
function hostScript(raw){const s=String(raw);
  if(!/^\/?[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*\.js$/.test(s)||s.split("/").some(p=>p==="."||p===".."))
    throw new Error("--script must be a path on the page's own origin ending in .js, such as /host.js: "+s);
  return s;}
/* submit/submit.js, refused if the page could not hold it as written */
function source(){const t=fs.readFileSync(path.join(__dirname,"submit.js"),"utf8");
  if(/[\u0000\r]/.test(t)) throw new Error("submit/submit.js holds a NUL or a carriage return");
  if(/<\/script/i.test(t)||/<!--/.test(t)) throw new Error("submit/submit.js holds </script or <!--, which a page cannot hold inside a script");
  return t;}
const policyTag=p=>'<meta http-equiv="Content-Security-Policy" content="'+p+'">';
/* the submit build, as a string */
function build(o){o=o||{};
  const u=address(o.endpoint),text=source();
  let html=oneFile.build();
  if(html.includes(SCRIPT_OPEN)||html.includes('<meta name="booklet-submit"')) throw new Error("the renderer already holds a submit script or address");
  const std=csp.policyFor(html);
  if(!html.includes(policyTag(std))) throw new Error("the one-file build's policy is not current");
  /* 2. the script, directly after the main one */
  const main=/<script>[\s\S]*?<\/script>\n/.exec(html);
  if(!main) throw new Error("the main script was not found");
  const at=main.index+main[0].length;
  html=html.slice(0,at)+SCRIPT_OPEN+text+"</script>\n"+html.slice(at);
  /* 3. the address */
  const dns=html.indexOf(csp.DNS+"\n");if(dns<0) throw new Error("the DNS-prefetch tag was not found");
  const after=dns+csp.DNS.length+1;
  html=html.slice(0,after)+'<meta name="booklet-submit" content="'+attr(u.href)+'">\n'+html.slice(after);
  /* the host's script, if named */
  if(o.script){const src=hostScript(o.script),end=html.lastIndexOf("</body>");if(end<0) throw new Error("no </body>");
    html=html.slice(0,end)+'<script src="'+attr(src)+'"></script>\n'+html.slice(end);}
  /* 4. the policy: this script's hash, and the address's origin */
  const scriptSrc=/script-src 'self'(?: '[^']*')*/.exec(std);
  if(!scriptSrc||std.split(CONNECT).length!==2) throw new Error("the renderer's policy is not the one this build knows");
  const pol=std.replace(scriptSrc[0],scriptSrc[0]+" "+sha(text)).replace(CONNECT,CONNECT+" "+u.origin);
  if(html.split(policyTag(std)).length!==2) throw new Error("expected the policy tag once");
  html=html.replace(policyTag(std),()=>policyTag(pol));
  return html;}
/* the submit build with every addition taken out again: the one-file build, if build() did only what it says */
function strip(html){
  html=html.replace(/<script id="booklet-submit">[\s\S]*?<\/script>\n/,"");
  html=html.replace(/<meta name="booklet-submit" content="[^"]*">\n/,"");
  html=html.replace(/<script src="[^"]*"><\/script>\n(?=<\/body>)/,"");
  return csp.write(html);}
/* what the file declares, read back */
function declared(html){const m=/<meta name="booklet-submit" content="([^"]*)">/.exec(html);
  const p=/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html);
  return {endpoint:m?m[1].replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&"):null,policy:p?p[1]:null};}
module.exports={build,strip,declared,address,source,sha};
if(require.main===module){
  const a=process.argv.slice(2),opt=n=>{const i=a.indexOf(n);return i>=0?a[i+1]:undefined;};
  const known=new Set(["--endpoint","--script","--out"]);
  for(let i=0;i<a.length;i+=2) if(!known.has(a[i])||a[i+1]===undefined){
    console.error("usage: node submit/build.js --endpoint <url> [--script </host.js>] [--out <file>]");process.exit(2);}
  let html;
  try{html=build({endpoint:opt("--endpoint"),script:opt("--script")});}
  catch(e){console.error("FAIL  "+e.message);process.exit(1);}
  const out=path.resolve(opt("--out")||path.join(R,"build","booklet-submit.html"));
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,html);
  const hex=crypto.createHash("sha256").update(html,"utf8").digest("hex");
  console.log("submit build written: "+path.relative(process.cwd(),out)+", "+Buffer.byteLength(html)+" bytes, sending to "+declared(html).endpoint);
  console.log(hex+"  "+path.basename(out));}
