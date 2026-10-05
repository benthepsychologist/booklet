// Format v0.11: the renderer fetches no image. A Markdown image is drawn as its alt text in a framed box that says the
// image is not shown, with the address as text beneath; no img element is ever created from a booklet's Markdown, so
// nothing is requested whatever the address (remote, relative, protocol-relative, data:). The renderer's own interface
// images (icons in the static markup, widget figures from sanitised inline SVG) are untouched.
// Run: node test/images.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const ADDR={remote:"https://tracker.example/p.gif",relative:"images/harbour.jpg",protocolRelative:"//tracker.example/q.gif",data:"data:image/png;base64,AAAA"};
const FILE=`---\nbooklet: "0.11"\ntitle: Pictures\nlang: en\n---\n\n> [!module|m] M\n\n> [!activity|a] A\n\nIntro ![remote alt](${ADDR.remote}) and ![relative alt](${ADDR.relative} "a title") and ![proto alt](${ADDR.protocolRelative}) and ![data alt](${ADDR.data}).\n\nA reference one: ![ref alt][r]\n\n[r]: ${ADDR.remote}?ref=1\n\n> [!text|q] A question ![in a label](${ADDR.remote})\n\n> [!module|m end] End\n`;
const imgs=n=>P.find(n,x=>x.tagName==="img"||(x.attrs&&(x.attrs.src!==undefined||x.attrs.srcset!==undefined)));
P.wipe();const A=P.boot();A.loadText(FILE);
const text=P.texts(P.main());
chk("the booklet opens into its one activity",A.screen==="m/a",A.screen);
chk("no img element, and nothing with a src, is on the page",imgs(P.main()).length===0,JSON.stringify(imgs(P.main()).map(x=>x.tagName)));
for(const [what,alt] of [["remote","remote alt"],["relative","relative alt"],["protocol-relative","proto alt"],["data:","data alt"],["reference","ref alt"]]) chk(`${what}: the alt text is shown`,text.includes(alt),text.slice(0,300));
for(const [k,a] of Object.entries(ADDR)) chk(`${k}: the address is shown as text`,text.includes(a.slice(0,30)),text.slice(0,300));
chk("the box says the image is not shown",P.find(P.main(),P.hasClass("imgbox")).length>=5&&/Image not shown/.test(text));
chk("the same words exist in French and Spanish (no native review)",["fr","es","es-AR"].every(l=>typeof A.STRINGS[l].ui.imgNotShown==="string"&&A.STRINGS[l].ui.imgNotShown.length>3));
/* the file itself reads without a problem: an image the renderer does not show is not a fault in the file */
chk("the file is valid: no problem is reported for an image",A.parseFile(FILE).unread.length===0,JSON.stringify(A.parseFile(FILE).unread));
/* a reader types an image into an answer; if that answer is ever drawn back as Markdown, it is text too */
{const q="![typed](https://tracker.example/typed.gif)";
 A.answersFor("m/a").q=q;A.render();
 chk("an image a reader typed into an answer creates no img element on the page",imgs(P.main()).length===0);
 const nodes=A.mdNodes(q,{});
 const bad=P.find({children:nodes},x=>x.tagName==="img"||(x.attrs&&x.attrs.src!==undefined));
 chk("...and drawn back as Markdown it is text, not an img",bad.length===0&&/typed/.test(P.texts({children:nodes}))&&/tracker\.example\/typed\.gif/.test(P.texts({children:nodes})));}
console.log(fails?"\n"+fails+" FAILURES":"\nimage checks passed");P.closePages();process.exit(fails?1:0);
