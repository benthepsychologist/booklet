// Mermaid diagrams and math: the vendored libraries and when they wake.
//
// booklet.html carries mermaid (diagrams) and Temml (TeX into MathML) as inert
// <script type="text/plain"> blocks and wakes one only when a booklet actually has a
// diagram or a formula. Node cannot run either library, so this file checks what it can:
// the blocks are there, their text round-trips and matches the sha256 their comment gives,
// the page never reaches for a library unless there is something to draw, the dollar-sign
// guard holds, and a figure fence is parsed out of the prose. test/figures-browser.js (run by
// hand under the /app/ CSP, it needs Playwright) is the authority on the drawing itself.
// Run: node test/figures.test.js
require("./harness.js");
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const R=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(R,"booklet.html"),"utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};

/* ---------------- the stored libraries ---------------- */
const LIBS=[["mermaid","@mermaid-js/tiny","12.1.0","https://unpkg.com/@mermaid-js/tiny@12.1.0/dist/mermaid.tiny.js"],
            ["temml","temml","0.13.5","https://unpkg.com/temml@0.13.5/dist/temml.min.js"]];
for(const [name,pkg,ver,url] of LIBS){
  const re=new RegExp("<!-- LIBRARY: ([^\\n]*)\\n((?:(?!-->)[\\s\\S])*)-->\\n<script type=\"text/plain\" id=\"lib-"+name+"\">([\\s\\S]*?)</script>");
  const m=re.exec(html);
  chk(name+": an inert text/plain block with a comment above it",!!m);
  if(!m) continue;
  const head=m[1]+"\n"+m[2];
  chk(name+": the comment names the package, version and source URL",head.includes(pkg+" "+ver)&&head.includes(url),head);
  chk(name+": the comment carries the MIT licence notice",/MIT/.test(head)&&/Copyright/.test(head));
  const sha=(/sha256 of the downloaded file: ([0-9a-f]{64})/.exec(head)||[])[1];
  chk(name+": the comment gives a sha256",!!sha);
  chk(name+": the stored text holds no raw </script or <!--",!/<\/script/i.test(m[3])&&!/<!--/.test(m[3]));
  const back=m[3].replace(/<\\\/script/g,"</script").replace(/<\\!--/g,"<!--");
  chk(name+": un-escaped, the stored text hashes to the sha256 in the comment",
    crypto.createHash("sha256").update(Buffer.from(back,"utf8")).digest("hex")===sha);
  chk(name+": the library text is substantial",back.length>100000);
}
chk("the libraries sit after the renderer script, so the renderer's own source is unchanged in shape",
  html.indexOf('id="lib-mermaid"')>html.indexOf("\n</script>"));
chk("the renderer never evals: no eval( and no new Function",!/\beval\s*\(|new\s+Function\b/.test(src));
const notice=fs.readFileSync(path.join(R,"NOTICE"),"utf8");
chk("NOTICE lists both libraries as MIT",/mermaid/i.test(notice)&&/temml/i.test(notice)&&/MIT/.test(notice));

/* ---------------- when the page reaches for a library ---------------- */
const looked=[];
const realGet=document.getElementById;
document.getElementById=id=>{if(/^lib-/.test(id)) looked.push(id);return realGet(id);};
eval(src+"\n;global.F={LIB_ON,mdNodes,FIGURE_HOOKS,parseFile,setTPL:t=>{TPL=t;},T};");
const F=global.F;
const draw=(text)=>{looked.length=0;for(const k of Object.keys(F.LIB_ON)) delete F.LIB_ON[k];const nodes=F.mdNodes(text,{...F.FIGURE_HOOKS});return {nodes,looked:[...looked]};};
const textOf=x=>Array.isArray(x)?x.map(textOf).join(""):typeof x==="string"?x:(x&&x._text||"")+((x&&x.children)||[]).map(textOf).join("");
const find=(n,pred,out=[])=>{if(n&&typeof n==="object"){if(pred(n)) out.push(n);(n.children||[]).forEach(c=>find(c,pred,out));}return out;};
const isMath=n=>/(^|\s)math(\s|$)/.test((n.attrs||{}).class||"");

{const r=draw("Plain prose with **bold**, a [link](https://example.org), a list:\n\n- one\n- two\n\nand ```code```.");
  chk("a booklet with no math or diagram never reaches for either library",r.looked.length===0,r.looked.join());}
{const r=draw("It costs $5 and $10 today.");
  chk("`$5 and $10` is not math: no library, text kept",r.looked.length===0&&textOf(r.nodes)==="It costs $5 and $10 today.",textOf(r.nodes));}
{const r=draw("Two prices, $5 and $10, then $x$ more.");
  const maths=find({children:r.nodes},isMath);
  chk("a price pair is left alone but a real formula after it still counts",maths.length===1&&textOf(maths[0])==="x",JSON.stringify(maths.map(textOf)));}
{const r=draw("A literal \\$ sign and another \\$ sign.");
  chk("`\\$` stays a literal dollar and wakes nothing",r.looked.length===0&&textOf(r.nodes)==="A literal $ sign and another $ sign.",textOf(r.nodes));}
{const r=draw("Costs $10 today, and a literal \\$ sign stays.");
  chk("a price followed later by an escaped dollar is not math",r.looked.length===0&&textOf(r.nodes)==="Costs $10 today, and a literal $ sign stays.",textOf(r.nodes));}
{const r=draw("Inline $a^2$ here.");
  chk("inline $…$ is detected and wakes Temml",r.looked.join()==="lib-temml",r.looked.join());
  chk("with the library unavailable the TeX shows in code style",find({children:r.nodes},n=>/raw/.test((n.attrs||{}).class||"")).length===1);}
{const r=draw("Display:\n\n$$\n\\int_0^1 x\\,dx\n= \\tfrac12\n$$\n");
  const d=find({children:r.nodes},n=>n.tagName==="div"&&isMath(n));
  chk("display $$…$$ over several lines is one formula, detected",r.looked.join()==="lib-temml"&&d.length===1&&/\\int_0\^1/.test(textOf(d[0])),r.looked.join());}
{const r=draw("```mermaid\ngraph TD; A --> B\n```\n");
  chk("a mermaid fence in the prose is detected and wakes mermaid only",r.looked.join()==="lib-mermaid",r.looked.join());}
{const r=draw("```python\nprint(1)\n```\n");
  chk("a fence in another language is just code and wakes nothing",r.looked.length===0&&find({children:r.nodes},n=>n.tagName==="code").length===1);}

/* ---------------- figures placed by reference ---------------- */
const FIX=fs.readFileSync(path.join(R,"test/fixtures/figures.booklet.md"),"utf8");
const P=F.parseFile(FIX);
chk("the figures fixture parses with nothing reported wrong",P.ok&&P.unread.length===0,JSON.stringify(P.unread));
const figs=P.template.figures||{};
chk("every id'd non-booklet fence is kept as a figure, with its language",
  Object.keys(figs).sort().join()==="broken-one,snippet,tide-cycle"&&figs["tide-cycle"].lang==="mermaid"&&figs.snippet.lang==="python",JSON.stringify(Object.keys(figs)));
chk("a figure's code is the fence's text",figs["tide-cycle"].code==="graph LR; New --> Spring --> Quarter --> Neap --> Full",figs["tide-cycle"].code);
const prose=JSON.stringify(P.template.modules);
chk("a data-section figure is not also drawn where it sits (its code is not in any prose block)",!/Quarter/.test(prose.replace(/graph TD[^"]*/,"")));
chk("the in-prose mermaid fence (no id) stays in the prose to be drawn in place",/graph TD; Sun --> Moon --> Sea/.test(prose));
chk("a booklet without figure fences carries no figures key",!("figures" in F.parseFile(fs.readFileSync(path.join(R,"examples/how-tides-work.booklet.md"),"utf8")).template));
F.setTPL(P.template);
{const r=draw("![[#^snippet]]");
  chk("an embed that points at a non-mermaid fence shows that fence as code, waking nothing",
    r.looked.length===0&&find({children:r.nodes},n=>n.tagName==="code"&&(n.attrs||{})["data-lang"]==="python").length===1);}
{const r=draw("![[#^tide-cycle]]");
  chk("an embed that points at a mermaid fence wakes mermaid",r.looked.join()==="lib-mermaid",r.looked.join());}
{const r=draw("Before ![[#^nothing-here]] after");
  chk("an embed that points at nothing stays as written",textOf(r.nodes)==="Before ![[#^nothing-here]] after"&&r.looked.length===0,textOf(r.nodes));}

/* ---------------- the failure note, in every interface language ---------------- */
for(const l of ["en","fr","es","es-AR"])
  chk("the diagram-failed note exists in "+l,typeof F.T[l].ui.figureErr==="string"&&F.T[l].ui.figureErr.length>10);
chk("the French and Spanish notes are not the English one",F.T.fr.ui.figureErr!==F.T.en.ui.figureErr&&F.T.es.ui.figureErr!==F.T.en.ui.figureErr);

console.log(fails?"\n"+fails+" figures check(s) failed":"\nall figures checks passed");
process.exit(fails?1:0);
