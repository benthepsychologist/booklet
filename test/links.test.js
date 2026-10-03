// Links between activities: the resolver that turns `[[#Heading]]` and
// `[label](#slug)` into the activity (and page) holding that heading.
// Run alone with `node test/links.test.js`; test/run.sh finds it by itself.
require("./harness.js");
const fs=require("fs");
const html=fs.readFileSync(__dirname+"/../booklet.html","utf8");
const src=html.split("<script>\n")[1].split("\n</script>")[0];
const A=eval(src+"\n({findHeading,headingsOf,linkSlug,ACTIVITY_LINK_HOOKS,setTPL:v=>{TPL=v},resetTPL:()=>{TPL=EMPTY_BOOKLET;SHELF={}},"+
  "setView:v=>{view=v},getView:()=>view,pageNow:id=>currentPage(id).id,render:()=>{}})");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const md=text=>({id:"m"+Math.random(),type:"markdown",text});
const mods=[
 {id:"m1",activities:[
   {id:"loop",kind:"board",title:"How the loop works",pages:[
     {id:"p1",blocks:[md("Intro.\n\n## First part\n\nText")]},
     {id:"p2",title:"Second page",blocks:[md("### 🗂️ Sort it **now**\n\n```\n## Not a heading\n```\n")]}]},
   {id:"log",kind:"entry",title:"Log a moment",pages:[{id:"p1",blocks:[
     md("Words"),{id:"q1",type:"text",label:"What happened?",keys:["q1"]}]}]}]}];
const f=(t,s)=>A.findHeading(mods,t,s);
chk("finds an activity by its title",f("Log a moment",false)&&f("Log a moment",false).act==="log");
chk("case and spacing do not matter",f("  log   A MOMENT ",false)&&f("  log   A MOMENT ",false).act==="log");
chk("finds a heading in the prose, on the page that holds it",JSON.stringify(f("First part",false))===JSON.stringify({act:"loop",page:"p1",heading:"First part"}),JSON.stringify(f("First part",false)));
chk("picks the later page when the heading is there",f("🗂️ Sort it now",false)&&f("🗂️ Sort it now",false).page==="p2",JSON.stringify(f("🗂️ Sort it now",false)));
chk("a page's own title counts",f("Second page",false)&&f("Second page",false).page==="p2");
chk("a question's title counts",f("What happened?",false)&&f("What happened?",false).act==="log");
chk("a title opens its activity on the first page",f("How the loop works",false).page==="p1");
chk("finds by GitHub-style slug",f("log-a-moment",true)&&f("log-a-moment",true).act==="log");
chk("a slug drops punctuation and an emoji",f("what-happened",true)&&f("what-happened",true).act==="log"&&f("sort-it-now",true).page==="p2");
chk("a percent-encoded slug is read",f("log%20a%20moment",true)&&f("log%20a%20moment",true).act==="log");
chk("returns nothing for a missing heading",f("Nowhere",false)===null&&f("nowhere",true)===null);
chk("a heading inside a code fence is not a heading",f("Not a heading",false)===null);
chk("an empty target finds nothing",f("",false)===null&&f("",true)===null);
chk("headingsOf skips fences and strips emphasis",JSON.stringify(A.headingsOf("# A *b*\n```\n# no\n```\n## [c](http://x)"))===JSON.stringify(["A b","c"]),JSON.stringify(A.headingsOf("# A *b*\n```\n# no\n```\n## [c](http://x)")));

// the hooks the prose block hands the Markdown layer
A.setTPL({modules:mods});
const H=A.ACTIVITY_LINK_HOOKS;
const hit=H.link("#Log a moment",undefined);
chk("`[[#Heading]]` becomes a link whose text is the heading",hit&&hit.tagName==="a"&&hit.attrs.href==="#");
const lab=H.link("#Log a moment","go on");
chk("`[[#Heading|label]]` is drawn with the label",lab&&lab.tagName==="a");
chk("a heading that is missing is its label, never the brackets",H.link("#Nowhere","the label")==="the label"&&H.link("#Nowhere",undefined)==="Nowhere");
chk("a link to another note keeps today's behaviour",H.link("Other note",undefined)===null&&H.link("Other#Heading",undefined)===null);
chk("a block reference is left alone",H.link("#^some-id",undefined)===null);
chk("`(#slug)` finds its heading, and a missing one is plain text",H.anchor("log-a-moment",["Log"]).tagName==="a"&&H.anchor("nope",["Plain"])==="Plain");
A.setTPL({modules:[]});
console.log(fails?`\n${fails} failed`:"\nlinks checks passed");
process.exit(fails?1:0);
