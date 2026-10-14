// Callouts by Obsidian's kind list (renderer 0.11.9): one table, CALLOUT_LOOK, gives each kind a hue and a Lucide icon; a kind it
// does not know is drawn as `note` is; the label of every kind exists in all four interface languages; the card hues have a fixed order.
// The colours themselves, drawn, are test/callouts-browser.js. Run: node test/callouts.test.js
const P=require("./page.js");
const fs=require("fs"),path=require("path");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const A=P.boot();
/* the table as the work item states it: kinds with their aliases, hue and icon */
const WANT=[["note","sky","pencil"],["abstract summary tldr","petrol","clipboard-list"],["info","sky","info"],["todo","sky","circle-check"],
  ["tip","sage","lightbulb"],["important","lilac","star"],["success check done","sage","check"],["question help faq","lilac","circle-help"],
  ["warning caution attention","sun","triangle-alert"],["failure fail missing","rose","x"],["danger error","rose","octagon-alert"],
  ["bug","rose","bug"],["example","lilac","flask-conical"],["quote cite","slate","quote"],["diff","petrol","git-compare"],
  ["law","slate","scale"],["opinion","rose","message-circle"]];
const L=A.CALLOUT_LOOK;
chk("CALLOUT_LOOK holds exactly the kinds and aliases of the table",Object.keys(L).sort().join()===WANT.flatMap(r=>r[0].split(" ")).sort().join());
chk("each kind has the table's hue and icon",WANT.every(([ks,hue,ic])=>ks.split(" ").every(k=>L[k].hue===hue&&L[k].icon===ic)),
  JSON.stringify(WANT.filter(([ks,hue,ic])=>!ks.split(" ").every(k=>L[k].hue===hue&&L[k].icon===ic))));
const icons=new Set(fs.readdirSync(path.join(__dirname,"..","art","icons")).map(f=>f.replace(/\.svg$/,"")));
chk("every icon the table names is in art/icons/ (so in the sprite)",Object.values(L).every(x=>icons.has(x.icon)),Object.values(L).filter(x=>!icons.has(x.icon)).map(x=>x.icon).join());
chk("every hue it names is one of the seven",Object.values(L).every(x=>A.HUES.includes(x.hue)));
chk("an alias says its first name",L.tldr.label==="abstract"&&L.faq.label==="question"&&L.cite.label==="quote"&&L.error.label==="danger"&&L.done.label==="success");
chk("a kind it does not know is drawn as note is (and so are odd names)",
  ["frobnicate","","Constructor","__proto__","toString"].every(k=>A.calloutLook(k)===L.note)&&A.calloutLook("TIP")===L.tip&&A.calloutLook(undefined)===L.note);
chk("the card hues are the six, in the work item's order",A.CARD_HUES.join()==="sky,rose,sage,sun,lilac,petrol");
/* every label key exists in en, fr, es and es-AR (es-AR inherits es, which is how its table is made) */
{const keys=[...new Set(Object.values(L).map(x=>x.label))];
 for(const lang of ["en","fr","es","es-AR"]){
   const kind=A.STRINGS[lang].reading.kind,miss=keys.filter(k=>typeof kind[k]!=="string"||!kind[k].trim());
   chk("every callout label exists in "+lang+" ("+keys.length+" kinds)",miss.length===0,miss.join());}
 chk("fr and es labels are their own words, not the English (except the words the languages share)",
   ["fr","es"].every(l=>keys.filter(k=>A.STRINGS[l].reading.kind[k]===A.STRINGS.en.reading.kind[k]).length<=5),
   ["fr","es"].map(l=>keys.filter(k=>A.STRINGS[l].reading.kind[k]===A.STRINGS.en.reading.kind[k]).join()).join(" | "));
 const src=fs.readFileSync(path.join(__dirname,"..","booklet.html"),"utf8");
 /* 0.13.1's three storage notices (storageFull, storageFailed, storageSmall: the move to IndexedDB) are drafts in fr, es
    and es-AR until /localize checks them; any other draft mark is a string nobody checked */
 const drafts=src.split("\n").filter(l=>/l10n: draft/.test(l)),pending=/l10n: draft \*\/ (storageFull|storageFailed|storageSmall):/;
 chk("no l10n: draft mark remains in STRINGS_SRC but the storage notices waiting for /localize: every other interface string is checked (0.13.0's were checked by /localize, 2026-10-14)",
   drafts.every(l=>pending.test(l))&&drafts.length<=9,drafts.filter(l=>!pending.test(l)).map(l=>l.trim().slice(0,60)).join(" | "));}
console.log(fails?"\n"+fails+" FAILURES":"\ncallout checks passed");process.exit(fails?1:0);
