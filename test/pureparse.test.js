// The parse is pure (0.13.1, review R2): a booklet's text in, its design and its problems out, with no page.
//
// parseBooklet(text, {icons}) is given the icon names (the page reads them once from its sprite); plainText, which
// names pages and writes blurbs, reads inline Markdown as text and builds no node; and a problem is a code,
// {code, args, refuses}, put into words only when something shows it. This file boots the renderer, then takes the page
// away (no `document` at all) and parses every fixture and every example: nothing may reach for it, nothing may read
// the browser's storage, and the interface language in force may change nothing in the result.
//
// Run: node test/pureparse.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const A=P.boot();
const files=[...fs.readdirSync(P.R+"/test/fixtures").map(f=>"test/fixtures/"+f),...fs.readdirSync(P.R+"/examples").filter(f=>/\.md$/.test(f)).map(f=>"examples/"+f)].sort();
const text=f=>fs.readFileSync(P.R+"/"+f,"utf8");
const json=x=>JSON.stringify(x);

/* the icon names the page read from its sprite are exactly the sprite's line icons */
const sprite=new Set([...P.html.matchAll(/<symbol id="bi-([a-z0-9-]+)"/g)].map(m=>m[1]));
chk("the page reads its icon names from its sprite, once: "+sprite.size+" of them",A.ICON_NAMES.size===sprite.size&&[...sprite].every(n=>A.ICON_NAMES.has(n)));
const icons=new Set(sprite);

/* what the page's own parse gives, while it still has a page, to compare with below */
const withPage=Object.fromEntries(files.map(f=>[f,json(A.parseFile(text(f)))]));

/* ---- the page taken away ---- */
const doc=global.document,store=global.localStorage;let reads=0;
global.localStorage={getItem(){reads++;return null;},setItem(){reads++;},removeItem(){reads++;}};
delete global.document;
let threw=null;const pure={};
try{for(const f of files){const t=text(f);
  pure[f]=json(A.isBooklet(t)?A.parseBooklet(t,{icons}):A.parseFile(t));}}
catch(e){threw=e;}
chk("every fixture and example ("+files.length+" files) parses with no document defined",!threw,threw&&String(threw.stack||threw).split("\n").slice(0,3).join(" | "));
chk("and the parse reads no storage",reads===0,String(reads));
let same=files.filter(f=>pure[f]===withPage[f]);
chk("each parse is the one the page makes for itself",same.length===files.length,files.filter(f=>pure[f]!==withPage[f]).join(", "));
/* the interface language changes nothing in a parse */
A.lang="fr";
const inFrench=Object.fromEntries(files.map(f=>{const t=text(f);return [f,json(A.isBooklet(t)?A.parseBooklet(t,{icons}):A.parseFile(t))];}));
A.lang="en";
chk("a parse made while the interface speaks French is the same, problems and all",files.every(f=>inFrench[f]===pure[f]),files.filter(f=>inFrench[f]!==pure[f]).join(", "));
global.document=doc;global.localStorage=store;

/* ---- a problem is a code ---- */
const codes=new Set(Object.keys(A.STRINGS_SRC.en.problem));
const all=files.flatMap(f=>{const r=A.parseFile(text(f));return (r.unread||[]).map(p=>({f,p,r}));});
chk("the files report problems to check ("+all.length+")",all.length>20);
chk("every problem is {code, args, refuses}, its code a message in the problem table",all.every(({p})=>codes.has(p.code)&&Array.isArray(p.args)&&typeof p.refuses==="boolean"&&json(Object.keys(p).sort())==='["args","code","refuses"]'),
  json(all.map(x=>x.p).find(p=>!codes.has(p.code)||!Array.isArray(p.args))));
chk("a part of a problem that is a message (a line, a reason) is a problem too",all.some(({p})=>p.args.some(a=>a&&a.code==="line")));
chk("the ones that refuse the file are its refusals, and none else",files.every(f=>{const r=A.parseFile(text(f));return json((r.unread||[]).filter(p=>p.refuses))===json(r.refused||[]);}));
{const r=A.parseFile(text("test/fixtures/problems-refused.booklet.md"));
 chk("a refused file's refusals say so",r.ok===false&&r.refused.length>0&&r.refused.every(p=>p.refuses===true),json(r.refused));}

/* ---- worded only when shown, in the language in force then ---- */
{const r=A.parseFile('---\nbooklet: "0.17"\ntitle: T\n---\n\n> [!activity|a daily] A\n\n> [!text|q] Q\n');
 const [miss,daily]=r.unread;
 chk("a problem is worded in English",A.problemText(miss)==="The front matter has no `lang:`, so this page took the file to be in English"&&/^line 6: `daily` needs `repeat`/.test(A.problemText(daily)),A.problemText(daily));
 A.lang="fr";const fr=[A.problemText(miss),A.problemText(daily)];A.lang="en";
 chk("and the same problem, shown while the interface speaks French, in French, line and all",/lang:/.test(fr[0])&&fr[0]!==A.problemText(miss)&&/^ligne 6 /.test(fr[1]),fr.join(" | "));
 chk("a problem's string is its words, so a sentence of several words each one",String(daily)===A.problemText(daily)&&[miss,daily].join(" ")===A.problemText(miss)+" "+A.problemText(daily));}

/* ---- the notices of an opened file follow a language switch ---- */
{P.wipe();const B=P.boot();B.loadText('---\nbooklet: "0.17"\ntitle: T\n---\n\n> [!activity|a daily] A\n\n> [!text|q] Q\n');
 const items=()=>P.find(B.fileNotesNode()||{},n=>n.tagName==="li").map(P.texts);
 const en=items();B.lang="fr";const fr=items();B.lang="en";
 chk("the file's notices are drawn in English",en.length===2&&/needs/.test(en.join()),en.join(" | "));
 chk("and drawn again while the interface speaks French, in French: the notice keeps problems, not words",fr.length===2&&fr.every((x,i)=>x!==en[i])&&!/needs/.test(fr.join()),fr.join(" | "));}

P.wipe();
console.log(fails?"\n"+fails+" FAILURES":"\npure-parse checks passed");process.exit(fails?1:0);
