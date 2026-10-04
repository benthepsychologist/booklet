// The format cleanup: the file extension, the `app` name, the export name, the
// `sync` slot, and the wording that used to belong to another product.
// Run alone with `node test/format.test.js`; test/run.sh finds it by itself.
require("./harness.js");            // sets up the DOM stub the renderer needs
const fs=require("fs");
const R=__dirname+"/..";
const read=f=>fs.readFileSync(R+"/"+f,"utf8");
const html=read("booklet.html");
/* The shared harness exports a fixed list of internals. This file needs a few
   more (the export-name helpers), so it loads the renderer's script a second
   time and exposes what it wants, leaving harness.js alone. */
const src=html.split("<script>\n")[1].split("\n</script>")[0];
const A=eval(src+"\n({exportName,slugify,"+
  "emptyState,emptyDrafts,setState:v=>{STATE=v},setDrafts:v=>{DRAFTS=v},setLang:l=>{lang=l},"+
  "resetBook:()=>{BOOK=EMPTY_BOOKLET;REGISTRY_CACHE={}},editBook,STRINGS})");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d?"   → "+d:""));};
const fresh=()=>{A.setState(A.emptyState());A.setDrafts(A.emptyDrafts());A.resetBook();A.setLang("en");};
const titled=(en,fr)=>A.editBook(t=>{t.head={title:fr===undefined?en:{en,fr}};});

// ---- the export name: <slug of the booklet's own title>.booklet.md
fresh();
chk("a booklet with no title is saved as booklet.booklet.md",A.exportName()==="booklet.booklet.md",A.exportName());
titled("End of day");
chk("the name comes from the booklet's own title",A.exportName()==="end-of-day.booklet.md",A.exportName());
chk("accents and punctuation fold into a plain slug",A.slugify("Trousse d’activités — été!")==="trousse-d-activites-ete",A.slugify("Trousse d’activités — été!"));
chk("a title with no letters or digits falls back to booklet",(titled("?!…"),A.exportName()==="booklet.booklet.md"),A.exportName());
chk("a title in another script is kept, not erased",A.slugify("日記 の 練習")==="日記-の-練習",A.slugify("日記 の 練習"));
chk("a very long title gives a bounded name",A.slugify("word ".repeat(40)).length<=60);
fresh();titled("Daily journal","Journal quotidien");
chk("the slug follows the language the booklet is being shown in",
  A.exportName()==="daily-journal.booklet.md"&&(A.setLang("fr"),A.exportName()==="journal-quotidien.booklet.md"),A.exportName());
A.setLang("en");
fresh();A.editBook(t=>{t.title="Weekly review";});
chk("a booklet that has only a title (no headline) is named from it",A.exportName()==="weekly-review.booklet.md",A.exportName());

// ---- the renderer's own names: "Booklet", in every language, nothing else
for(const l of ["en","fr"]){
  chk("["+l+"] the app and the headline say Booklet",
    A.STRINGS[l].ui.app==="Booklet"&&A.STRINGS[l].home.h1==="Booklet",
    [A.STRINGS[l].ui.app,A.STRINGS[l].home.h1].join(" | "));
  chk("["+l+"] no fixed save name is left in the strings",A.STRINGS[l].ui.fileName===undefined&&A.STRINGS[l].ui.exportTitle===undefined);
}
chk("the page and the home-screen title say Booklet",
  /<title>Booklet<\/title>/.test(html)&&/apple-mobile-web-app-title" content="Booklet"/.test(html));
chk("no other product's name is left in the renderer, the spec or the status file",
  !/Activity Kit|activity-kit|ma-trousse|Trousse d/.test(html+read("SPEC.md")+read("STATUS.md")),
  ((html+read("SPEC.md")+read("STATUS.md")).match(/Activity Kit|activity-kit|ma-trousse|Trousse d/g)||[]).join(","));

finish();
function finish(){console.log(fails?"\n"+fails+" FAILURES":"\nformat checks passed");process.exit(fails?1:0);}
