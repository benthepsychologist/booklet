// A page's name is drawn once. In an activity with two or more pages the page's name is its own first heading
// when it has one; that heading is then the name, and no second name line is drawn above it.
// Run: node test/pagename.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const cls=n=>String((n&&n.attrs&&n.attrs.class)||"").split(/\s+/);
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const text=n=>typeof n==="string"?n:(n&&n._text)||kids(n).map(text).join("");
const FILE=`---
booklet: 0.7
title: Pages
lang: en
---

# Pages

> [!module|m] Pages

> [!activity|read] Overview

## First page

Some words under the heading.

---

Words with no heading at all on this page.

---

An opening line before any heading.

## Late heading

More words.

> [!module|m end] End
`;
(async()=>{
 const A=P.boot();await A.createBooklet();
 const r=A.parseFile(FILE);
 chk("the file parses clean",r.ok&&r.unread.length===0,JSON.stringify(r.unread));
 A.loadText(FILE);
 const pages=A.activityOf("read").pages;
 chk("three pages: the first leads with its heading, the others do not",pages.length===3&&pages[0].lead===true&&!pages[1].lead&&!pages[2].lead,JSON.stringify(pages.map(p=>[p.title,p.lead])));
 chk("the names: the first heading, none stored for a page without one (the reader's language names it: Page 2, below), and the first heading wherever it falls",pages.map(p=>p.title||"").join("|")==="First page||Late heading",pages.map(p=>p.title).join("|"));
 const draw=i=>{A.showPage("read",pages[i].id);A.screen="read";A.render();return P.main();};
 {const m=draw(0);
  chk("a page named by its own first heading draws no name line above it",walk(m,x=>cls(x).includes("ap-title")).length===0);
  chk("and its name is drawn exactly once in the page itself (the pages menu names it too, as it should)",(()=>{const b=walk(m,x=>cls(x).includes("ap-body"))[0];return text(b).split("First page").length-1===1;})(),text(m).slice(0,160));}
 {const m=draw(1);
  chk("a page with no heading keeps its fallback name line",walk(m,x=>cls(x).includes("ap-title")).map(text).join()==="Page 2");}
 {const m=draw(2);
  chk("a page whose heading is not the first thing keeps the name line, since the heading is not at the top",walk(m,x=>cls(x).includes("ap-title")).map(text).join()==="Late heading");}
 console.log(fails?"\n"+fails+" FAILURES":"\npagename checks passed");process.exit(fails?1:0);
})().catch(e=>{console.log("  FAIL  the suite threw: "+(e&&e.stack||e));process.exit(1);});
