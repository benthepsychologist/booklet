// The submit build (submit/build.js): it adds Submit to a copy of the one-file renderer and nothing else, and it never
// changes the published booklet.html. The browser half is test/submit-browser.js.
// Run: node test/submit-build.test.js
const fs=require("fs"),path=require("path"),crypto=require("crypto"),cp=require("child_process"),os=require("os");
const R=path.join(__dirname,"..");
const B=require("../submit/build.js"),oneFile=require("./one-file.js"),csp=require("./csp-hash.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const hex=t=>crypto.createHash("sha256").update(t).digest("hex");
const CORE=path.join(R,"booklet.html"),before=hex(fs.readFileSync(CORE));
const EP="https://api.example.org/submit";
const html=B.build({endpoint:EP}),text=B.source(),one=oneFile.build();

chk("the published booklet.html is the same file after a build",hex(fs.readFileSync(CORE))===before);
chk("taking the additions out again gives the one-file build exactly",B.strip(html)===one);
chk("the submit script is in the file once, exactly as submit/submit.js holds it",
  html.split('<script id="booklet-submit">').length===2&&html.includes('<script id="booklet-submit">'+text+"</script>\n"));
const main=/<script>[\s\S]*?<\/script>\n/.exec(html);
chk("it sits directly after the main script",!!main&&html.startsWith('<script id="booklet-submit">',main.index+main[0].length));
chk("the file declares the address",B.declared(html).endpoint===EP);

/* the policy: the renderer's own, with this script's hash and the address's origin added, and nothing else */
const tokens=p=>p.split("; ").map(d=>d.split(" "));
const std=tokens(csp.policyFor(one)),got=tokens(B.declared(html).policy||"");
const diff=std.map((d,i)=>({name:d[0],added:(got[i]||[]).filter(x=>!d.includes(x)),lost:d.filter(x=>!(got[i]||[]).includes(x))}));
chk("the policy has the same directives in the same order",got.length===std.length&&got.every((d,i)=>d[0]===std[i][0]),JSON.stringify(got.map(d=>d[0])));
chk("it loses nothing the renderer's policy holds",diff.every(d=>d.lost.length===0),JSON.stringify(diff.filter(d=>d.lost.length)));
chk("script-src gains exactly this script's sha256",JSON.stringify(diff.find(d=>d.name==="script-src").added)===JSON.stringify([B.sha(text)]));
chk("connect-src gains exactly the address's origin",JSON.stringify(diff.find(d=>d.name==="connect-src").added)===JSON.stringify(["https://api.example.org"]));
chk("no other directive gains anything",diff.filter(d=>d.name!=="script-src"&&d.name!=="connect-src").every(d=>d.added.length===0));

/* the address */
const refuses=ep=>{try{B.address(ep);return false;}catch(e){return true;}};
chk("an https address is taken",!refuses(EP));
chk("plain http is taken for this machine only, for testing",!refuses("http://127.0.0.1:8080/submit")&&!refuses("http://localhost:8080/submit")&&refuses("http://forms.example.com/submit"));
chk("an address with a query or a fragment is refused",refuses(EP+"?a=1")&&refuses(EP+"#x")&&refuses(EP+"?"));
chk("an address with a user name, or no address, is refused",refuses("https://u:p@api.example.org/submit")&&refuses("submit")&&refuses("")&&refuses("javascript:alert(1)"));

/* the host's script */
const withScript=B.build({endpoint:EP,script:"/host.js"});
chk("--script puts the host's script last in the body",withScript.endsWith('<script src="/host.js"></script>\n</body>\n</html>\n')||/<script src="\/host\.js"><\/script>\n<\/body>/.test(withScript));
chk("and taking it out again still gives the one-file build",B.strip(withScript)===one);
const badScript=s=>{try{B.build({endpoint:EP,script:s});return false;}catch(e){return true;}};
chk("a host script on another origin, or outside the page's folders, is refused",
  badScript("https://evil.example/x.js")&&badScript("//evil.example/x.js")&&badScript("../x.js")&&badScript("/a/../x.js")&&badScript("/x.css"));

/* what the submit script itself may do: one send, a POST with no cookies and no redirect, and no other way out */
chk("submit/submit.js holds one fetch",(text.match(/\bfetch\(/g)||[]).length===1);
chk("which is a POST with no credentials, no redirect and no referrer",/fetch\(ENDPOINT,\{method:"POST"/.test(text)&&/credentials:"omit"/.test(text)&&/redirect:"error"/.test(text)&&/referrerPolicy:"no-referrer"/.test(text));
const ways=["XMLHttpRequest","sendBeacon","WebSocket","EventSource","RTCPeerConnection",".postMessage(","BroadcastChannel","window.open","import(","Worker(","new Image","<form","<iframe",".submit("];
chk("and no other way of sending",ways.every(w=>!text.includes(w)),ways.filter(w=>text.includes(w)).join(", "));
chk("it sends only to the address the file declares",/const ENDPOINT=tag\?/.test(text)&&!/location|localStorage\.getItem|sessionStorage/.test(text));

/* the command */
const out=path.join(os.tmpdir(),"submit-build-"+process.pid+".html");
const run=a=>cp.spawnSync(process.execPath,[path.join(R,"submit","build.js"),...a],{encoding:"utf8"});
const r1=run(["--endpoint",EP,"--out",out]);
chk("the command writes the file and prints its sha256 line",r1.status===0&&fs.existsSync(out)&&r1.stdout.includes(hex(fs.readFileSync(out))+"  "+path.basename(out)),r1.stdout+r1.stderr);
chk("what it writes is what build() makes",fs.existsSync(out)&&fs.readFileSync(out,"utf8")===html);
try{fs.unlinkSync(out);}catch(e){}
chk("a bad address stops it with a reason",run(["--endpoint","http://forms.example.com/submit","--out",out]).status===1&&!fs.existsSync(out));
chk("a bad option stops it with the usage",run(["--endpont",EP]).status===2);
chk("the published booklet.html is still the same file",hex(fs.readFileSync(CORE))===before);
console.log(fails?"\n"+fails+" FAILURES":"\nsubmit-build checks passed");process.exit(fails?1:0);
