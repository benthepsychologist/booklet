// The submit build (submit/build.js): it adds Submit to a copy of the one-file renderer and nothing else, and it never
// changes the published booklet.html. It reads a registry file of named endpoints (format 0.21, SPEC.md section 2, "Submit"),
// writes every endpoint into a meta tag and every endpoint's origin, and no other origin, into the policy. The browser half is
// test/submit-browser.js.
// Run: node test/submit-build.test.js
const fs=require("fs"),path=require("path"),crypto=require("crypto"),cp=require("child_process"),os=require("os");
const R=path.join(__dirname,"..");
const B=require("../submit/build.js"),oneFile=require("./one-file.js"),csp=require("./csp-hash.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const hex=t=>crypto.createHash("sha256").update(t).digest("hex");
const CORE=path.join(R,"booklet.html"),before=hex(fs.readFileSync(CORE));
const EP="https://api.example.org/submit",EP2="https://collect.example.net:8443/in";
const ent=(name,address,owner,description)=>({name,address,owner:owner||"Example Lab",description:description||"A test endpoint"});
const REG1={format:1,endpoints:[ent("alpha",EP)]};
const REG2={format:1,endpoints:[ent("alpha",EP),ent("beta",EP2,"Second Group, Ltd.","Their own questionnaires")]};
/* three endpoints on two origins: the policy names an origin once */
const REG3={format:1,endpoints:[ent("alpha",EP),ent("beta",EP2),ent("alpha-two","https://api.example.org/other")]};
const html=B.build({registry:REG1}),html2=B.build({registry:REG2}),html3=B.build({registry:REG3}),text=B.source(),one=oneFile.build();

chk("the published booklet.html is the same file after a build",hex(fs.readFileSync(CORE))===before);
chk("taking the additions out again gives the one-file build exactly",B.strip(html)===one);
chk("...for two endpoints, and for three",B.strip(html2)===one&&B.strip(html3)===one);
chk("the submit script is in the file once, exactly as submit/submit.js holds it",
  html.split('<script id="booklet-submit">').length===2&&html.includes('<script id="booklet-submit">'+text+"</script>\n"));
const main=/<script>[\s\S]*?<\/script>\n/.exec(html);
chk("it sits directly after the main script",!!main&&html.startsWith('<script id="booklet-submit">',main.index+main[0].length));
chk("there is one booklet-submit meta tag, holding every endpoint",html2.split('<meta name="booklet-submit"').length===2);
chk("the file declares every endpoint, with its four fields, in the registry's order",
  JSON.stringify(B.declared(html2).endpoints)===JSON.stringify(REG2.endpoints)&&JSON.stringify(B.declared(html).endpoints)===JSON.stringify(REG1.endpoints));

/* the policy: the renderer's own, with this script's hash and every endpoint's origin added, and nothing else */
const tokens=p=>p.split("; ").map(d=>d.split(" "));
const std=tokens(csp.policyFor(one));
const diffOf=h=>{const got=tokens(B.declared(h).policy||"");
  return {got,diff:std.map((d,i)=>({name:d[0],added:(got[i]||[]).filter(x=>!d.includes(x)),lost:d.filter(x=>!(got[i]||[]).includes(x))}))};};
const one1=diffOf(html),two=diffOf(html2),three=diffOf(html3);
const added=(d,n)=>d.diff.find(x=>x.name===n).added;
chk("the policy has the same directives in the same order",one1.got.length===std.length&&one1.got.every((d,i)=>d[0]===std[i][0]),JSON.stringify(one1.got.map(d=>d[0])));
chk("it loses nothing the renderer's policy holds",[one1,two,three].every(r=>r.diff.every(d=>d.lost.length===0)));
chk("script-src gains exactly this script's sha256",JSON.stringify(added(one1,"script-src"))===JSON.stringify([B.sha(text)])&&JSON.stringify(added(two,"script-src"))===JSON.stringify([B.sha(text)]));
chk("one endpoint: connect-src gains exactly its origin",JSON.stringify(added(one1,"connect-src"))===JSON.stringify(["https://api.example.org"]));
chk("two endpoints: connect-src gains exactly their two origins, in the registry's order, and no other",
  JSON.stringify(added(two,"connect-src"))===JSON.stringify(["https://api.example.org","https://collect.example.net:8443"]),JSON.stringify(added(two,"connect-src")));
chk("an origin two endpoints share is named once (three endpoints, two origins)",
  JSON.stringify(added(three,"connect-src"))===JSON.stringify(["https://api.example.org","https://collect.example.net:8443"]),JSON.stringify(added(three,"connect-src")));
chk("no other directive gains anything",[one1,two,three].every(r=>r.diff.filter(d=>d.name!=="script-src"&&d.name!=="connect-src").every(d=>d.added.length===0)));
chk("the only origins in the policy beyond the renderer's own are the endpoints' (no wildcard, no scheme on its own)",
  !/connect-src[^;]*(\*| https:( |;|$)| http:( |;|$))/.test(B.declared(html2).policy));
/* a registry with no endpoint is the file after its last one is removed: it builds, and the page can send nowhere */
const empty=B.build({registry:{format:1,endpoints:[]}}),emptyDiff=diffOf(empty);
chk("an empty registry builds a page whose policy gains only the script's hash",B.strip(empty)===one&&added(emptyDiff,"connect-src").length===0&&added(emptyDiff,"script-src").length===1&&JSON.stringify(B.declared(empty).endpoints)==="[]");

/* the registry's own rules, checked by the build: each bad file is named in plain words, and stops the build */
const problems=reg=>B.checkRegistry(reg);
const has=(reg,re)=>problems(reg).some(p=>re.test(p));
const withEntry=e=>({format:1,endpoints:[{...ent("alpha",EP),...e}]});
chk("a good registry has no problem",problems(REG2).length===0&&problems({format:1,endpoints:[]}).length===0);
chk("the file must be an object with format 1 and a list of endpoints, and nothing else at the top",
  has(null,/must be a JSON object/)&&has([],/must be a JSON object/)&&has({endpoints:[]},/"format" must be the number 1/)&&has({format:2,endpoints:[]},/"format" must be the number 1/)&&
  has({format:"1",endpoints:[]},/"format" must be the number 1/)&&has({format:1},/"endpoints" must be a list/)&&has({format:1,endpoints:{}},/"endpoints" must be a list/)&&has({format:1,endpoints:[],extra:1},/unknown key "extra"/));
chk("an entry must be an object with its four keys and no others",
  has({format:1,endpoints:["x"]},/endpoints\[0\] must be an object/)&&has({format:1,endpoints:[{name:"a"}]},/missing "address"/)&&has({format:1,endpoints:[{name:"a"}]},/missing "owner"/)&&has({format:1,endpoints:[{name:"a"}]},/missing "description"/)&&has(withEntry({extra:"x"}),/unknown key "extra"/));
chk("a name is 1 to 40 characters from a-z, 0-9 and the hyphen, lower case, and unique",
  ["Alpha","a_b","a b","","a".repeat(41),"é","a.b",5,null].every(n=>has(withEntry({name:n}),/"name" must be 1 to 40 characters/))&&
  !has(withEntry({name:"a".repeat(40)}),/"name"/)&&!has(withEntry({name:"x"}),/"name"/)&&!has(withEntry({name:"a-1-b"}),/"name"/)&&
  has({format:1,endpoints:[ent("a",EP),ent("a",EP2)]},/duplicate name "a"/));
chk("an address is https with no query, no fragment and no user name (plain http only for this machine)",
  ["http://forms.example.com/submit",EP+"?a=1",EP+"#x",EP+"?","https://u:p@api.example.org/submit","submit","","javascript:alert(1)","ftp://x.example.org/a"," "+EP,EP+" ",5].every(a=>has(withEntry({address:a}),/"address"/))&&
  ["http://127.0.0.1:8080/submit","http://localhost:8080/submit","http://[::1]:8080/submit",EP].every(a=>!has(withEntry({address:a}),/"address"/)));
chk("owner and description are one line of text, not empty, at most 200 characters, no space at either end",
  ["owner","description"].every(k=>["",  " x","x ","a\nb","a\u0000b","x".repeat(201),5,null].every(v=>has(withEntry({[k]:v}),new RegExp('"'+k+'"')))&&!has(withEntry({[k]:"x".repeat(200)}),new RegExp('"'+k+'"'))));
const failsWith=(reg,re)=>{try{B.build({registry:reg});return false;}catch(e){return re.test(e.message)&&!/\bat .*\.js:\d+/.test(e.message);}};
chk("a registry with a bad entry stops the build with a plain message that names the entry and the field",
  failsWith(withEntry({address:"http://forms.example.com/submit"}),/endpoints\[0\]: "address" must be https/)&&failsWith({format:1,endpoints:[ent("a",EP),ent("B",EP)]},/endpoints\[1\]: "name" must be/));
chk("a message names every problem, one line each, and says how many",
  failsWith({format:1,endpoints:[{name:"A",address:"x"}]},/^the registry has 4 problems:\n  endpoints\[0\]: missing "owner"\n  endpoints\[0\]: missing "description"\n  endpoints\[0\]: "name" must[^\n]*\n  endpoints\[0\]: "address" is not an absolute address$/));
chk("a build with no registry at all, or the old option's shape, stops",failsWith(undefined,/registry/)&&failsWith({endpoint:EP},/registry/)&&failsWith(EP,/registry/));

/* the host's script */
const withScript=B.build({registry:REG2,script:"/host.js"});
chk("--script puts the host's script last in the body",withScript.endsWith('<script src="/host.js"></script>\n</body>\n</html>\n')||/<script src="\/host\.js"><\/script>\n<\/body>/.test(withScript));
chk("and taking it out again still gives the one-file build",B.strip(withScript)===one);
const badScript=s=>{try{B.build({registry:REG1,script:s});return false;}catch(e){return true;}};
chk("a host script on another origin, or outside the page's folders, is refused",
  badScript("https://evil.example/x.js")&&badScript("//evil.example/x.js")&&badScript("../x.js")&&badScript("/a/../x.js")&&badScript("/x.css"));

/* strip() and declared() round-trip whatever the registry's words hold, quotes, ampersands and angle brackets among them */
const odd={format:1,endpoints:[ent("odd","https://api.example.org/submit",'Lab "North" & <South> ’ é 研究',"Tom & Jerry's <b>forms</b>, \"quoted\"")]};
const oddHtml=B.build({registry:odd});
chk("owner and description with quotes, ampersands, angle brackets and non-Latin letters come back exactly, and strip() still gives the one-file build",
  JSON.stringify(B.declared(oddHtml).endpoints)===JSON.stringify(odd.endpoints)&&B.strip(oddHtml)===one&&!/<b>forms/.test(oddHtml.slice(oddHtml.indexOf('<meta name="booklet-submit"'),oddHtml.indexOf('<meta name="booklet-submit"')+600)));
chk("a build is the same every time (the same registry gives the same file)",B.build({registry:REG2})===html2);

/* what the submit script itself may do: one send, a POST with no cookies and no redirect, and no other way out */
chk("submit/submit.js holds one fetch",(text.match(/\bfetch\(/g)||[]).length===1);
chk("which is a POST with no credentials, no redirect and no referrer",/fetch\(ep\.address,\{method:"POST"/.test(text)&&/credentials:"omit"/.test(text)&&/redirect:"error"/.test(text)&&/referrerPolicy:"no-referrer"/.test(text));
const ways=["XMLHttpRequest","sendBeacon","WebSocket","EventSource","RTCPeerConnection",".postMessage(","BroadcastChannel","window.open","import(","Worker(","new Image","<form","<iframe",".submit("];
chk("and no other way of sending",ways.every(w=>!text.includes(w)),ways.filter(w=>text.includes(w)).join(", "));
chk("the address it sends to is an endpoint of the file's own meta tag, picked by the name in the booklet, and nothing a booklet or the browser holds names one",
  /const ENDPOINTS=new Map\(\)/.test(text)&&/ENDPOINTS\.get\(v\)/.test(text)&&/querySelector\('meta\[name="booklet-submit"\]'\)/.test(text)&&!/location|localStorage\.getItem|sessionStorage/.test(text));
chk("it reads the booklet's front matter with the renderer's own frontMatter and kvLine, not a pattern of its own",
  /frontMatter\(src,true\)/.test(text)&&/kvLine\(l\)/.test(text)&&!/\.match\(|\.exec\(|new RegExp/.test(text.replace(/\/\*[\s\S]*?\*\//g,"")));
chk("the old gate (a booklet the host gave) is gone from the script",!/hostName\(\)|hookOpen\(\)/.test(text.replace(/\/\*[\s\S]*?\*\//g,"")));

/* the command */
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"submit-build-"));
const out=path.join(tmp,"out.html"),regFile=path.join(tmp,"registry.json");
fs.writeFileSync(regFile,JSON.stringify(REG2,null,2));
const run=a=>cp.spawnSync(process.execPath,[path.join(R,"submit","build.js"),...a],{encoding:"utf8"});
const r1=run(["--registry",regFile,"--out",out]);
chk("the command writes the file and prints its sha256 line and the endpoints' names",r1.status===0&&fs.existsSync(out)&&r1.stdout.includes(hex(fs.readFileSync(out))+"  "+path.basename(out))&&/2 endpoints: alpha, beta/.test(r1.stdout),r1.stdout+r1.stderr);
chk("what it writes is what build() makes",fs.existsSync(out)&&fs.readFileSync(out,"utf8")===html2);
try{fs.unlinkSync(out);}catch(e){}
const badFile=path.join(tmp,"bad.json");
fs.writeFileSync(badFile,JSON.stringify({format:1,endpoints:[ent("alpha","http://forms.example.com/submit")]}));
const rb=run(["--registry",badFile,"--out",out]);
chk("a registry with a bad entry stops it with one plain FAIL message, and writes nothing",rb.status===1&&!fs.existsSync(out)&&/^FAIL  the registry has 1 problem:\n  endpoints\[0\]: "address" must be https/.test(rb.stderr)&&!/\n\s+at /.test(rb.stderr),rb.stderr);
fs.writeFileSync(badFile,"{not json");
const rj=run(["--registry",badFile,"--out",out]);
chk("a registry that is not JSON, and one that cannot be read, stop it with a reason",rj.status===1&&/FAIL  .*not valid JSON/.test(rj.stderr)&&run(["--registry",path.join(tmp,"nope.json"),"--out",out]).status===1&&!fs.existsSync(out));
chk("the old --endpoint option is gone, and a missing --registry or a bad option stops it with the usage",
  run(["--endpoint",EP,"--out",out]).status===2&&run(["--out",out]).status===2&&run(["--regsitry",regFile]).status===2&&/--registry <file>/.test(run(["--endpoint",EP]).stderr));
try{fs.rmSync(tmp,{recursive:true,force:true});}catch(e){}
chk("the published booklet.html is still the same file",hex(fs.readFileSync(CORE))===before);
console.log(fails?"\n"+fails+" FAILURES":"\nsubmit-build checks passed");process.exit(fails?1:0);
