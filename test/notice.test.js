// Format v0.11, a module carries its notice: a `> [!notice]` callout inside the module's fence, the one-module
// file's front matter as its fallback, Add a module writing it into the booklet, and the renderer's quiet
// "About this module" disclosure. Invented content throughout.
// Run: node test/notice.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const FM=(extra="",id="m")=>`---\nbooklet: "0.11"\ntitle: Notice ${id}\nlang: en\n${extra}---\n\n`;
const NOTE=`> [!notice]\n> license: Free to copy and share, unmodified and with this notice intact.\n> copyright: Example Press, 2026\n> source: https://example.org/check-in\n> version: 1.2\n`;
const mod1=(id,notice,more="")=>`> [!module|${id}] Module ${id}\n\n${notice?notice+"\n":""}> [!activity|a-${id} repeat] Act ${id}\n\n> [!text|q long] Q\n${more}\n> [!module|${id} end] End\n`;
const WITH=FM()+mod1("m",NOTE);
const texts=P.texts,find=P.find,hasClass=P.hasClass;
(async()=>{
 const A=P.boot();
 /* ---- reading ---- */
 {const R=A.parseFile(WITH),m=R.template.modules[0];
  chk("a notice callout inside the fence is read into the module: four values, as written",R.ok&&R.unread.length===0&&JSON.stringify(m.notice)===JSON.stringify({license:"Free to copy and share, unmodified and with this notice intact.",copyright:"Example Press, 2026",source:"https://example.org/check-in",version:"1.2"}),JSON.stringify([R.unread,m.notice]));
  chk("the callout is part of the source text, byte for byte",R.template.raw.source.includes(NOTE));
  chk("it is not drawn as reading in the activity",!JSON.stringify(m.mode).includes("license"));}
 {const R=A.parseFile(FM()+mod1("m",`> [!notice]\n> license: Free to copy.\n> copyright:\n> source: https://example.org\n`)),n=R.template.modules[0].notice;
  chk("a key may be left out, or left empty",JSON.stringify(n)===JSON.stringify({license:"Free to copy.",source:"https://example.org"}),JSON.stringify(n));}
 {const R=A.parseFile(FM()+mod1("m","> [!notice]\n> LICENSE: Case is not read\n> author: Someone\n> free words\n"));
  chk("an unknown key and a line that is not key: value are reported, and skipped; a key is read without regard to case",R.ok&&R.unread.length===2&&/license, copyright, source and version, not “author”/.test(R.unread.join(" ").replace(/`/g,""))||R.unread.some(x=>/author/.test(x)),JSON.stringify(R.unread));
  chk("the rest of the notice is kept",R.template.modules[0].notice.license==="Case is not read"&&Object.keys(R.template.modules[0].notice).length===1);}
 {const R=A.parseFile(FM()+mod1("m",NOTE+"\n> [!notice]\n> license: Second\n"));
  chk("a second notice is reported and ignored (the first stands)",R.ok&&R.unread.length===1&&/one notice/.test(R.unread[0])&&R.template.modules[0].notice.license.startsWith("Free to copy"),JSON.stringify(R.unread));}
 {const R=A.parseFile(FM()+"> [!notice]\n> license: Outside\n\n"+mod1("m",""));
  chk("a notice outside every module fence is reported and ignored",R.ok&&R.unread.length===1&&/inside a module's fence/.test(R.unread[0])&&!R.template.modules[0].notice,JSON.stringify(R.unread));}
 {const R=A.parseFile(FM()+mod1("m","","\n> [!notice]\n> license: Late\n"));
  chk("a notice after the module's first activity is reported and ignored",R.ok&&R.unread.length===1&&/before its first activity/.test(R.unread[0])&&!R.template.modules[0].notice,JSON.stringify(R.unread));}
 {const R=A.parseFile(FM()+mod1("m","")+"\n> [!data] Data\n\n> [!notice]\n> license: In data\n");
  chk("a notice in the data section is reported and ignored",R.unread.length===1&&!R.template.modules[0].notice,JSON.stringify(R.unread));}
 chk("`notice` takes no settings: the table says so",JSON.stringify(A.KIND_SETTINGS.notice)==="[]");
 /* ---- the one-module file's front matter ---- */
 {const fm=`license: "Licence in front matter"\ncopyright: "Front Matter Press"\nsource: https://example.org/fm\nversion: "3.1"\n`;
  const R=A.parseFile(FM(fm)+mod1("m",""));
  chk("a one-module file with no callout: its front matter is the module's notice",JSON.stringify(R.template.modules[0].notice)===JSON.stringify({license:"Licence in front matter",copyright:"Front Matter Press",source:"https://example.org/fm",version:"3.1"}),JSON.stringify(R.template.modules[0].notice));
  const R2=A.parseFile(FM(fm)+mod1("m",NOTE));
  chk("when both are present the callout wins",R2.template.modules[0].notice.copyright==="Example Press, 2026"&&R2.template.modules[0].notice.version==="1.2");
  const R3=A.parseFile(FM(fm)+mod1("a","")+"\n"+mod1("b",""));
  chk("a file with two modules takes nothing from its front matter",!R3.template.modules[0].notice&&!R3.template.modules[1].notice);
  const R4=A.parseFile(FM("")+mod1("m",""));
  chk("no notice anywhere: the module has none",R4.template.modules[0].notice===undefined);}
 /* ---- Add a module ---- */
 const fmMod=FM(`license: "Front matter licence"\ncopyright: "Front Matter Press"\nsource: https://example.org/fm\nversion: "3.1"\n`,"fm")+mod1("fmmod","");
 {await A.createBooklet();
  const r=A.addModuleText(fmMod);
  const out=A.toMarkdown(),src=A.BOOK.raw.source;
  chk("a module with its notice only in front matter is added",r.ok,JSON.stringify(r));
  chk("it is written into the booklet's fence as a notice callout, first inside the fence",/> \[!module\|fmmod\] Module fmmod\n\n> \[!notice\]\n> license: Front matter licence\n> copyright: Front Matter Press\n> source: https:\/\/example\.org\/fm\n> version: 3\.1\n\n> \[!activity\|/.test(out),out);
  chk("so the notice is in the file the reader downloads, and the file reads back with it",A.parseFile(out).template.modules[0].notice.copyright==="Front Matter Press"&&A.parseFile(out).refused.length===0&&A.parseFile(out).unread.length===0,JSON.stringify(A.parseFile(out).unread));
  chk("the booklet's design carries it (read back from the written file)",A.allModules()[0].notice.license==="Front matter licence"&&A.allModules()[0].notice.version==="3.1");
  chk("the booklet's own front matter is untouched by the module's",!/^license:/m.test(out)&&/^title: "Untitled booklet"$/m.test(out));
  /* a module that already holds the callout is added as it is */
  const before=A.toMarkdown();
  const r2=A.addModuleText(WITH);const out2=A.toMarkdown();
  chk("a module that already holds the callout is added as it is, byte for byte",r2.ok&&out2.includes("\n"+mod1("m",NOTE).split("\n").slice(0,12).join("\n")),out2);
  chk("the callout is written once",(out2.match(/\[!notice\]/g)||[]).length===2);
  /* an update replaces it with the module's */
  const updated=FM("license: \"New licence\"\n","fm")+mod1("fmmod","");
  const r3=A.addModuleText(updated);const out3=A.toMarkdown();
  chk("an update replaces the notice with the module's new one",r3.ok&&out3.includes("> license: New licence")&&!out3.includes("Front matter licence")&&(out3.match(/> \[!notice\]/g)||[]).length===2,out3);
  const bare=FM("","fm")+mod1("fmmod","");
  chk("an update of a module that now has no notice drops it",A.addModuleText(bare).ok&&!A.toMarkdown().includes("New licence")&&(A.toMarkdown().match(/> \[!notice\]/g)||[]).length===1);
  /* the callout survives a save and a reload */
  A.flushSave();const id=A.currentId;P.closePages();
  const B=P.boot();B.openBooklet(id);
  chk("it survives a save and a reload",B.allModules().find(m=>m.id==="m").notice.copyright==="Example Press, 2026"&&B.toMarkdown().includes("> copyright: Example Press, 2026"));}
 /* a file with several modules: only a one-module file falls back to front matter, a module's callout always travels */
 {const A2=P.boot();await A2.createBooklet();
  const two=FM(`license: "Not for modules"\n`,"two")+mod1("a",NOTE)+"\n"+mod1("b","");
  const r=A2.addModuleText(two),out=A2.toMarkdown();
  chk("a two-module file: a's callout travels, b gets none, nothing is invented from the front matter",r.ok&&(out.match(/> \[!notice\]/g)||[]).length===1&&!out.includes("Not for modules"),out);}
 /* ---- the disclosure ---- */
 {const A3=P.boot();await A3.createBooklet();
  const multi=FM()+`> [!module|mm] Multi\n\n${NOTE}\n> [!activity|one] One\n\n> [!text|q] Q\n\n> [!activity|two] Two\n\n> [!text|q2] Q\n\n> [!module|mm end] End\n`;
  chk("a module with two activities is added",A3.addModuleText(multi).ok);
  A3.screen=A3.moduleScreen("mm");A3.render();
  const d=find(P.main(),hasClass("about"));
  chk("its page has one quiet disclosure, closed, headed About this module",d.length===1&&d[0].tagName==="details"&&!d[0].hasAttribute("open")&&/About this module/.test(texts(find(d[0],n=>n.tagName==="summary")[0])),texts(P.main()));
  const body=texts(d[0]);
  chk("it shows the licence, the copyright, the source and the version",/Licence/.test(body)&&/Free to copy and share, unmodified and with this notice intact\./.test(body)&&/Copyright/.test(body)&&/Example Press, 2026/.test(body)&&/Source/.test(body)&&/Version/.test(body)&&/1\.2/.test(body),body);
  const links=find(d[0],n=>n.tagName==="a");
  chk("an https source is a link, opened safely",links.length===1&&links[0].attrs.href==="https://example.org/check-in"&&/noopener/.test(links[0].attrs.rel||""),JSON.stringify(links.map(l=>l.attrs)));
  /* a single-activity module shows it at the foot of the activity */
  const one=FM()+mod1("solo",NOTE);
  A3.addModuleText(one);A3.screen="solo/a-solo";A3.render();
  const d2=find(P.main(),hasClass("about"));
  chk("a module that is one activity shows it at the foot of that activity",d2.length===1&&/Example Press, 2026/.test(texts(d2[0])));
  /* none: nothing shown */
  A3.addModuleText(FM()+mod1("plain",""));A3.screen="plain/a-plain";A3.render();
  chk("a module with no notice shows nothing",find(P.main(),hasClass("about")).length===0);
  /* values are text; a source is a link only for http and https */
  for(const [src,link] of [["javascript:alert(1)",false],["ftp://example.org/x",false],["example.org/no-scheme",false],["HTTP://example.org/up",true],["http://example.org/plain",true]]){
   const t=FM()+mod1("src","> [!notice]\n> source: "+src+"\n> license: <b>bold</b> & \"quoted\" <script>x</script>\n");
   A3.addModuleText(t);A3.screen="src/a-src";A3.render();
   const dd=find(P.main(),hasClass("about"))[0],as=find(dd,n=>n.tagName==="a");
   chk("a source of "+src+(link?" is a link":" is text, not a link"),!!dd&&(as.length===1)===link&&(!link||as[0].attrs.href===src)&&texts(dd).includes(src),JSON.stringify(as.map(a=>a.attrs)));
   if(src==="javascript:alert(1)") chk("a value is text, never markup",texts(dd).includes("<b>bold</b> & \"quoted\" <script>x</script>")&&find(dd,n=>n.tagName==="b"||n.tagName==="script").length===0&&!JSON.stringify(dd,(k,v)=>k==="_on"?undefined:v).includes('"_html":"<'));}
  /* the strings exist in the four languages */
  chk("the words are in English, French, Spanish and Argentine Spanish",["en","fr","es","es-AR"].every(l=>{const n=A3.STRINGS[l].notice;return n&&["about","license","copyright","source","version"].every(k=>typeof n[k]==="string"&&n[k]);})&&A3.STRINGS.fr.notice.about!==A3.STRINGS.en.notice.about);}
 P.closePages();
 console.log(fails?"\n"+fails+" FAILURES":"\nall notice checks passed");process.exit(fails?1:0);
})();
