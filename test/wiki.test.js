// Renderer 0.12.0, item E: the wiki. The tree is nestRows' rules over activities; the pages that mention a page are worked out once;
// the search finds by title and text; a link to a module the booklet holds opens it and one it does not hold is a chip that asks
// for nothing until pressed; a deep link names a page; the renderer never writes the address bar; the words exist in four languages.
// Run: node test/wiki.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const kids=n=>(n&&n.children)||[];
const walk=(n,f,out=[])=>{if(n&&typeof n==="object"){if(f(n)) out.push(n);kids(n).forEach(k=>walk(k,f,out));}return out;};
const text=P.texts;
const FM='---\nbooklet: "0.12"\ntitle: Wiki\nlang: en\n---\n\n';
const names=l=>l.map(a=>a.id.split("/").pop()).join();
(async()=>{
 const A=P.boot();
 /* ---- the adapter: nestRows' rules over activities ---- */
 {const book=FM+"> [!module|m] M\n\n"+
   "> [!activity|a] Alpha\n\nAlpha links to [[#Beta]] and to [Gamma](#gamma) and to itself, [[#Alpha]].\n\n"+
   "> [!activity|d parent:nowhere] Delta\n\nA missing parent leaves it at the top.\n\n"+
   "> [!activity|b parent:a] Beta\n\nBeta links to [[#Alpha]].\n\n"+
   "> [!activity|c parent:b] Gamma\n\nDeep.\n\n"+
   "> [!activity|e parent:f] Echo\n\nA cycle.\n\n"+
   "> [!activity|f parent:e] Foxtrot\n\nOther half of the cycle, and [[#Gamma]] and [[#Alpha]].\n\n"+
   "> [!activity|g parent:a] Golf\n\nSecond child of Alpha.\n\n"+
   "> [!module|m end] End\n";
  A.loadText(book);
  const mod=A.allModules()[0],W=A.wikiOf(mod);
  chk("a module with parent: is a wiki",!!W);
  chk("a missing parent leaves a page at the top; a cycle draws each page once, at the top; top pages keep the file's order",names(W.roots)==="a,d,e",names(W.roots));
  chk("children keep the file's order, and the tree is depth first",names(W.acts)==="a,b,c,g,d,e,f",names(W.acts));
  chk("each page knows its parent and its ancestors",W.up.get("m/c").id==="m/b"&&names(A.wikiPath(W,"m/c"))==="a,b"&&names(A.wikiPath(W,"m/a"))==="");
  chk("the cycle: one page under the other, neither above both",(W.up.get("m/e")===null)!==(W.up.get("m/f")===null)||(W.up.get("m/e")===null&&W.up.get("m/f").id==="m/e"));
  chk("it is worked out once: the same object comes back",A.wikiOf(mod)===W);
  /* the adapter is nestRows itself: two rows of one id, the first is the parent */
  const t=A.activityTree([{id:"m/x"},{id:"m/y",parent:"m/x"},{id:"m/x",parent:"m/y"}]);
  chk("of two with one id the first is the parent (nestRows' rule)",t.order.length===3&&t.parent[1]==="m/x",JSON.stringify(t));
  /* ---- mentioned on ---- */
  const M=A.wikiMentions(W),of=id=>(M.get("m/"+id)||[]).map(a=>a.id.split("/").pop()).join();
  chk("Mentioned on: pages whose prose links to a page by its heading text or its slug, each once, in the file's order",of("b")==="a"&&of("c")==="a,f",of("b")+" | "+of("c"));
  chk("a page does not mention itself, and a page nobody links to has none",of("a")==="b,f"&&of("g")==="",of("a")+" | "+of("g"));
  chk("it is worked out once per open: asking again gives the same lists",A.wikiMentions(W)===M);
  /* ---- the search ---- */
  chk("search finds by title and by words in the prose, titles first",names(A.wikiFind(W,"alpha"))==="a,b,g,f",names(A.wikiFind(W,"alpha")));
  chk("every word typed must be there; case does not matter; nothing typed finds nothing",names(A.wikiFind(W,"SECOND child"))==="g"&&A.wikiFind(W,"  ").length===0&&A.wikiFind(W,"zzzz").length===0);
  /* a flat module is not a wiki */
  A.loadText(FM+"> [!module|m] M\n\n> [!activity|a] A\n\nx\n\n> [!activity|b] B\n\ny\n\n> [!module|m end] End\n");
  chk("a module with no parent: is not a wiki, and draws as it did",A.wikiOf(A.allModules()[0])===null);
  /* a booklet that is opened afresh works its lists out afresh */
  A.loadText(book);
  chk("a booklet opened again has its own lists",A.wikiOf(A.allModules()[0])!==W);}

 /* ---- links to a module ---- */
 {let fetched=0;global.fetch=async()=>{fetched++;throw new Error("no network");};
  const FM2=FM+"> [!module|m] M\n\n> [!activity|a] A\n\nx\n\n> [!activity|b] B\n\ny\n\n> [!module|m end] End\n\n> [!module|week-1] Week 1\n\n> [!activity|w] W\n\nw\n\n> [!activity|w2] W2\n\nw2\n\n> [!module|week-1 end] End\n";
  A.loadText(FM2);
  const out=A.mdNodes("[[week-1.booklet]] [Week one](folder/week-1.booklet.md) [[week-2.booklet]] [Week two](week-2.booklet.md#x) [[week-3.booklet|Third]]",A.linkHooks("m"));
  const root={children:out};
  const links=walk(root,x=>x.tagName==="a"),chips=walk(root,x=>x.tagName==="button"&&/mchip/.test(x.attrs.class||""));
  chk("a module this booklet holds is a link, whatever folder the file is named from",links.length===2&&/Week 1/.test(text(links[0]))&&text(links[1])==="Week one",links.map(text).join("|"));
  chk("a module it does not hold is a chip saying so, with the reader's own words when there are some",chips.length===3&&/Week two.*not in this booklet/.test(text(chips[1]))&&/week-2.*not in this booklet/.test(text(chips[0]))&&/Third.*not in this booklet/.test(text(chips[2])),chips.map(text).join("|"));
  chk("drawing a booklet's links asks the network for nothing",fetched===0&&walk(root,x=>/mc-add/.test((x.attrs||{}).class||"")).length===0,String(fetched));
  chk("the id of a module link is the file's name before .booklet",["x.booklet","a/b/x.booklet.md","x.booklet.md#part","x.booklet.md?q=1"].every(t=>A.moduleLinkId(t)==="x")&&A.moduleLinkId("w%20k.booklet")==="w k");
  chk("a held module's link is an anchor that opens it",!!links[0]._on.click&&links[0].attrs.href==="#");
  delete global.fetch;}

 /* ---- a link may name a page ---- */
 chk("the link's page is what follows the final .md/ (a store name may hold slashes)",
   JSON.stringify(A.linkSplit("a.md/b.md/page-one"))===JSON.stringify({name:"a.md/b.md",act:"page-one"})
   &&JSON.stringify(A.linkSplit("reports/week.booklet.md"))===JSON.stringify({name:"reports/week.booklet.md",act:""})
   &&A.linkSplit("x.md/").name==="x.md/"&&A.linkSplit("x.md/p%20q").act==="p q");

 /* ---- the renderer never writes the address bar ---- */
 {const src=P.src.replace(/\/\*[\s\S]*?\*\//g,"");
  const writes=[/history\s*\.\s*(pushState|replaceState)/,/location\s*\.\s*hash\s*=[^=]/,/location\s*\.\s*(href|search|pathname)\s*=[^=]/,/location\s*\.\s*(assign|replace)\s*\(/,/\bwindow\.location\s*=[^=]/,/\bhistory\s*\.\s*(go|back|forward)\s*\(/];
  chk("no history.pushState or replaceState, no write to location.hash, href, assign or replace: the renderer only reads the address",writes.every(r=>!r.test(src)),writes.filter(r=>r.test(src)).join(" "));}

 /* ---- the words ---- */
 {const A2=P.boot();
  const keys=Object.keys(A2.STRINGS_SRC.en.wiki);
  for(const l of ["en","fr","es","es-AR"]){const g=A2.STRINGS[l].wiki;
   chk("every wiki word exists in "+l+" ("+keys.length+" keys)",keys.every(k=>typeof g[k]===typeof A2.STRINGS_SRC.en.wiki[k]&&(typeof g[k]!=="string"||g[k].trim()!=="")&&(typeof g[k]!=="function"||String(g[k]("X")).includes("X")||k==="more")),keys.filter(k=>!g[k]).join());}
  chk("fr and es have words of their own",["fr","es"].every(l=>keys.filter(k=>typeof A2.STRINGS_SRC.en.wiki[k]==="string").every(k=>A2.STRINGS[l].wiki[k]!==A2.STRINGS.en.wiki[k])));
  chk("es-AR keeps es except where the voseo differs",A2.STRINGS["es-AR"].wiki.add==="Agregalo"&&A2.STRINGS["es-AR"].wiki.search===A2.STRINGS.es.wiki.search);}
 console.log(fails?"\n"+fails+" FAILURES":"\nwiki checks passed");process.exit(fails?1:0);
})();
