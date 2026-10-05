// A line indented under a list item continues the item's sentence, so inline Markdown works across the line break
// (0.10.4). Before, the continuation lines were drawn as raw text: `code`, **bold** and links showed their marks, in the
// opened section and in the preview line of a folded one. Run: node test/lede.test.js
"use strict";
global.el=(tag,attrs={},...kids)=>{const n={tag,attrs:{},children:[],setAttribute(k,v){this.attrs[k]=String(v);},addEventListener(){},append(...ks){for(const k of ks) this.children.push(k);}};
  Object.defineProperty(n,"textContent",{get(){return this.children.map(c=>typeof c==="string"?c:(c&&c.textContent)||"").join("");}});
  for(const[k,v]of Object.entries(attrs)) if(v!==null&&v!==undefined&&v!==false&&!k.startsWith("on")&&k!=="html") n.setAttribute(k,v===true?"":v);
  for(const k of kids) if(k!=null) n.append(k);return n;};
const {mdNodes}=require("./md.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const find=(n,t,out=[])=>{if(n&&typeof n==="object"){if(n.tag===t) out.push(n);(n.children||[]).forEach(c=>find(c,t,out));}return out;};
const li=t=>find({children:mdNodes(t,{})},"li");
{const a=li("- **Open:** `<leader>ll`, then `<CR>` to read,\n  or `o` to open it, and **bold** and [a link](https://e.com).");
 chk("one item",a.length===1);
 chk("a code span on the continuation line is drawn as code",find(a[0],"code").map(c=>c.textContent).join("|")==="<leader>ll|<CR>|o",JSON.stringify(find(a[0],"code").map(c=>c.textContent)));
 chk("bold and a link on it are drawn too",find(a[0],"strong").length===2&&find(a[0],"a").length===1);
 chk("no mark is left showing as text",!/[`*]|\]\(/.test(a[0].textContent),a[0].textContent);
 chk("the words are in order, with one space at the break",/to read, or o to open it/.test(a[0].textContent),a[0].textContent);}
{const a=li("- a `code span that\n  runs over` the break");
 chk("a code span may run across the line break",find(a[0],"code").length===1&&find(a[0],"code")[0].textContent==="code span that runs over",JSON.stringify(find(a[0],"code").map(c=>c.textContent)));}
{const a=li("- first line\n  - nested `x`\n  - nested two");
 chk("a nested list under an item is still a nested list",a.length===3&&find(a[0],"ul").length===1&&find(a[0],"code").length===1,a.length+" items");}
{const a=li("- one `x`\n- two `y`");
 chk("items on one line are unchanged",a.length===2&&find(a[0],"code").length===1&&find(a[1],"code").length===1);}
console.log(fails?"\n"+fails+" FAILURES":"\nlede checks passed");process.exit(fails?1:0);
