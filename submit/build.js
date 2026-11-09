// The submit build: booklet-submit.html, a copy of the one-file renderer with Submit added, for a host that wants a reader's
// answers sent to an address it declares. It is never the published booklet.html, which this script reads and never writes.
//   node submit/build.js --registry <file> [--script </host.js>] [--out <file>]
//     --registry  a registry file of named endpoints (format 0.21, SPEC.md section 2, "Submit"): {"format":1,"endpoints":[
//                 {"name","address","owner","description"}, ...]}. The file is checked first and the build stops, naming each
//                 problem, if it is not well formed. A booklet's `submit: <name>` key picks one of these by name; a booklet
//                 never carries an address
//     --script    the host's own script, a path on the page's own origin; written as <script src> before </body>, so the
//                 file built is the file served, and its checksum is the one a host publishes
//     --out       where to write it (default build/booklet-submit.html; build/ is not committed); prints its sha256
// What it does, and nothing else:
//   1. makes the one-file build (test/one-file.js) from booklet.html and parts/;
//   2. puts submit/submit.js directly after the main script, as <script id="booklet-submit">;
//   3. writes every endpoint (as JSON) in <meta name="booklet-submit">, after the policy and DNS-prefetch tags;
//   4. writes the policy again: the renderer's own (test/csp-hash.js), with this script's sha256 added to script-src and the
//      origin of every endpoint (each once) added to connect-src, and no other origin. Nothing else in the policy changes.
// strip() undoes exactly those steps; test/submit-build.test.js checks that what it gives back is the one-file build.
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const csp=require("../test/csp-hash.js"),oneFile=require("../test/one-file.js");
const R=path.join(__dirname,"..");
const CONNECT="connect-src 'self' https://raw.githubusercontent.com";
const LOOPBACK=new Set(["127.0.0.1","localhost","[::1]"]);
const sha=t=>"'sha256-"+crypto.createHash("sha256").update(t,"utf8").digest("base64")+"'";
const attr=s=>String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const SCRIPT_OPEN='<script id="booklet-submit">';
/* the address, checked: recepture refuses a query, and a page may send nothing else in a URL. The rule is the registry's own
   (the same words in its own check): https only, no query, no fragment, no user name or password, no space at either end; plain
   http only for this machine (127.0.0.1, localhost, [::1]), for testing. Returns the parsed address, or throws a plain message. */
function address(raw){const s=raw==null?"":String(raw);
  if(s==="") throw new Error("must be a non-empty string");
  if(s!==s.trim()) throw new Error("must not start or end with a space");
  let u;
  try{u=new URL(s);}catch(e){throw new Error("is not an absolute address");}
  if(u.username||u.password) throw new Error("may not carry a user name or password");
  if(u.search||u.hash||s.includes("?")||s.includes("#")) throw new Error("may carry no query and no fragment");
  if(u.protocol!=="https:"&&!(u.protocol==="http:"&&LOOPBACK.has(u.hostname)))
    throw new Error("must be https (plain http only for this machine, for testing)");
  return u;}
/* ---- the registry: a file of named endpoints ----
   {"format":1,"endpoints":[{"name","address","owner","description"}]}. Top level: those two keys and no others; format is the
   number 1; an empty list is allowed (it is what the file looks like after its last endpoint is removed, and the page built from
   it never shows Submit). Each endpoint: all four keys and no others. name is 1 to 40 characters from a-z, 0-9 and "-", unique in the
   file; address is the rule above; owner and description are each one line of text, not empty, at most 200 characters, no space at
   either end, no control character. Pre-1.0: no older shape is read. */
const REGISTRY_FORMAT=1,NAME_RE=/^[a-z0-9-]{1,40}$/,TEXT_MAX=200,ENTRY_KEYS=["name","address","owner","description"];
const isObject=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
function textProblem(v){
  if(typeof v!=="string"||v.trim()==="") return "must be a non-empty string";
  if(v!==v.trim()) return "must not start or end with a space";
  if(v.length>TEXT_MAX) return "must be at most "+TEXT_MAX+" characters (it is "+v.length+")";
  if(/[\u0000-\u001f\u007f]/.test(v)) return "must be one line, with no control characters";
  return null;}
/* the parsed registry, checked: the list of problems, one plain line each (empty when the file is good) */
function checkRegistry(data){const out=[];
  if(!isObject(data)) return ["the registry must be a JSON object"];
  for(const k of Object.keys(data)) if(k!=="format"&&k!=="endpoints") out.push('unknown key "'+k+'" at the top level');
  if(data.format!==REGISTRY_FORMAT) out.push('"format" must be the number '+REGISTRY_FORMAT);
  if(!Array.isArray(data.endpoints)){out.push('"endpoints" must be a list');return out;}
  const seen=new Set();
  data.endpoints.forEach((e,i)=>{const at="endpoints["+i+"]";
    if(!isObject(e)){out.push(at+" must be an object");return;}
    for(const k of Object.keys(e)) if(!ENTRY_KEYS.includes(k)) out.push(at+': unknown key "'+k+'"');
    for(const k of ENTRY_KEYS) if(!(k in e)) out.push(at+': missing "'+k+'"');
    if("name" in e){
      if(typeof e.name!=="string"||!NAME_RE.test(e.name)) out.push(at+': "name" must be 1 to 40 characters from a-z, 0-9 and "-"');
      else if(seen.has(e.name)) out.push(at+': duplicate name "'+e.name+'"');
      else seen.add(e.name);}
    if("address" in e){try{address(e.address);}catch(x){out.push(at+': "address" '+x.message);}}
    for(const k of ["owner","description"]) if(k in e){const p=textProblem(e[k]);if(p) out.push(at+': "'+k+'" '+p);}});
  return out;}
/* a registry file, read and parsed; a plain message if it cannot be read or is not JSON */
function readRegistry(file){let t;
  try{t=fs.readFileSync(file,"utf8");}catch(e){throw new Error("cannot read the registry "+file+": "+e.message);}
  try{return JSON.parse(t);}catch(e){throw new Error("the registry "+file+" is not valid JSON: "+e.message);}}
/* the endpoints of a registry that passed its check, as the page holds them: the four fields, in a fixed order */
function endpointsOf(data){
  const problems=checkRegistry(data);
  if(problems.length) throw Object.assign(new Error("the registry has "+problems.length+" problem"+(problems.length===1?"":"s")+":\n  "+problems.join("\n  ")),{problems});
  return data.endpoints.map(e=>({name:e.name,address:e.address,owner:e.owner,description:e.description}));}
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
  const eps=endpointsOf(o.registry),text=source();
  let html=oneFile.build();
  if(html.includes(SCRIPT_OPEN)||html.includes('<meta name="booklet-submit"')) throw new Error("the renderer already holds a submit script or address");
  const std=csp.policyFor(html);
  if(!html.includes(policyTag(std))) throw new Error("the one-file build's policy is not current");
  /* 2. the script, directly after the main one */
  const main=/<script>[\s\S]*?<\/script>\n/.exec(html);
  if(!main) throw new Error("the main script was not found");
  const at=main.index+main[0].length;
  html=html.slice(0,at)+SCRIPT_OPEN+text+"</script>\n"+html.slice(at);
  /* 3. the endpoints */
  const dns=html.indexOf(csp.DNS+"\n");if(dns<0) throw new Error("the DNS-prefetch tag was not found");
  const after=dns+csp.DNS.length+1;
  html=html.slice(0,after)+'<meta name="booklet-submit" content="'+attr(JSON.stringify({format:REGISTRY_FORMAT,endpoints:eps}))+'">\n'+html.slice(after);
  /* the host's script, if named */
  if(o.script){const src=hostScript(o.script),end=html.lastIndexOf("</body>");if(end<0) throw new Error("no </body>");
    html=html.slice(0,end)+'<script src="'+attr(src)+'"></script>\n'+html.slice(end);}
  /* 4. the policy: this script's hash, and the origin of every endpoint, each once */
  const scriptSrc=/script-src 'self'(?: '[^']*')*/.exec(std);
  if(!scriptSrc||std.split(CONNECT).length!==2) throw new Error("the renderer's policy is not the one this build knows");
  const origins=[];for(const e of eps){const o=new URL(e.address).origin;if(!origins.includes(o)&&!CONNECT.split(" ").includes(o)) origins.push(o);}
  const pol=std.replace(scriptSrc[0],scriptSrc[0]+" "+sha(text)).replace(CONNECT,CONNECT+origins.map(o=>" "+o).join(""));
  if(html.split(policyTag(std)).length!==2) throw new Error("expected the policy tag once");
  html=html.replace(policyTag(std),()=>policyTag(pol));
  return html;}
/* the submit build with every addition taken out again: the one-file build, if build() did only what it says */
function strip(html){
  html=html.replace(/<script id="booklet-submit">[\s\S]*?<\/script>\n/,"");
  html=html.replace(/<meta name="booklet-submit" content="[^"]*">\n/,"");
  html=html.replace(/<script src="[^"]*"><\/script>\n(?=<\/body>)/,"");
  return csp.write(html);}
/* what the file declares, read back: its endpoints (the list in the meta tag, or null when there is no tag or it is not JSON) and its policy */
function declared(html){const m=/<meta name="booklet-submit" content="([^"]*)">/.exec(html);
  const p=/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html);
  let eps=null;
  if(m){try{const j=JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&"));eps=Array.isArray(j.endpoints)?j.endpoints:null;}catch(e){eps=null;}}
  return {endpoints:eps,policy:p?p[1]:null};}
module.exports={build,strip,declared,address,checkRegistry,readRegistry,endpointsOf,source,sha,REGISTRY_FORMAT};
if(require.main===module){
  const a=process.argv.slice(2),opt=n=>{const i=a.indexOf(n);return i>=0?a[i+1]:undefined;};
  const known=new Set(["--registry","--script","--out"]);
  for(let i=0;i<a.length;i+=2) if(!known.has(a[i])||a[i+1]===undefined){
    console.error("usage: node submit/build.js --registry <file> [--script </host.js>] [--out <file>]");process.exit(2);}
  if(opt("--registry")===undefined){
    console.error("usage: node submit/build.js --registry <file> [--script </host.js>] [--out <file>]");process.exit(2);}
  let html;
  try{html=build({registry:readRegistry(opt("--registry")),script:opt("--script")});}
  catch(e){console.error("FAIL  "+e.message);process.exit(1);}
  const out=path.resolve(opt("--out")||path.join(R,"build","booklet-submit.html"));
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,html);
  const hex=crypto.createHash("sha256").update(html,"utf8").digest("hex");
  const names=declared(html).endpoints.map(e=>e.name);
  console.log("submit build written: "+path.relative(process.cwd(),out)+", "+Buffer.byteLength(html)+" bytes, "+names.length+" endpoint"+(names.length===1?"":"s")+(names.length?": "+names.join(", "):""));
  console.log(hex+"  "+path.basename(out));}
