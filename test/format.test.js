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
const A=eval(src+"\n({toMarkdown,parseFile,lockText,unlockText,lockedEnvelope,exportName,fileBase,slugify,"+
  "emptyS,emptyToday,emptyCheckin,setS:v=>{S=v},getS:()=>S,setD:v=>{D=v},setLang:l=>{lang=l},"+
  "setTPL:v=>{TPL=v},resetTPL:()=>{TPL=EMPTY_BOOKLET;SHELF={}},editTemplate,T})");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d?"   → "+d:""));};
const fresh=()=>{A.setS(A.emptyS());A.setD({today:A.emptyToday(),checkin:A.emptyCheckin()});A.resetTPL();A.setLang("en");};
const titled=(en,fr)=>A.editTemplate(t=>{t.head={title:fr===undefined?en:{en,fr}};});

// ---- the export name: <slug of the booklet's own title>.booklet.md
fresh();
chk("a booklet with no title is saved as booklet.booklet.md",A.exportName()==="booklet.booklet.md",A.exportName());
titled("End of day");
chk("the name comes from the booklet's own title",A.exportName()==="end-of-day.booklet.md",A.exportName());
chk("a locked copy keeps the extension, so it is still recognisably a booklet",
  A.exportName(true)==="end-of-day.locked.booklet.md",A.exportName(true));
chk("accents and punctuation fold into a plain slug",A.slugify("Trousse d’activités — été!")==="trousse-d-activites-ete",A.slugify("Trousse d’activités — été!"));
chk("a title with no letters or digits falls back to booklet",(titled("?!…"),A.exportName()==="booklet.booklet.md"),A.exportName());
chk("a title in another script is kept, not erased",A.slugify("日記 の 練習")==="日記-の-練習",A.slugify("日記 の 練習"));
chk("a very long title gives a bounded name",A.slugify("word ".repeat(40)).length<=60);
fresh();titled("Daily journal","Journal quotidien");
chk("the slug follows the language the booklet is being shown in",
  A.exportName()==="daily-journal.booklet.md"&&(A.setLang("fr"),A.exportName()==="journal-quotidien.booklet.md"),A.exportName());
A.setLang("en");
fresh();A.editTemplate(t=>{t.title="Weekly review";});
chk("a booklet that has only a title (no headline) is named from it",A.exportName()==="weekly-review.booklet.md",A.exportName());

// ---- the renderer's own names: "Booklet", in every language, nothing else
for(const l of ["en","fr"]){
  chk("["+l+"] the app, the headline and the export title say Booklet",
    A.T[l].ui.app==="Booklet"&&A.T[l].home.h1==="Booklet"&&/^Booklet\b/.test(A.T[l].ui.exportTitle),
    [A.T[l].ui.app,A.T[l].home.h1,A.T[l].ui.exportTitle].join(" | "));
  chk("["+l+"] no fixed save name is left in the strings",A.T[l].ui.fileName===undefined);
}
chk("the page and the home-screen title say Booklet",
  /<title>Booklet<\/title>/.test(html)&&/apple-mobile-web-app-title" content="Booklet"/.test(html));
chk("no other product's name is left in the renderer, the spec or the status file",
  !/Activity Kit|activity-kit|ma-trousse|Trousse d/.test(html+read("SPEC.md")+read("STATUS.md")+read("examples/end-of-day.md")),
  ((html+read("SPEC.md")+read("STATUS.md")+read("examples/end-of-day.md")).match(/Activity Kit|activity-kit|ma-trousse|Trousse d/g)||[]).join(","));
fresh();
chk("a fresh export is headed with the renderer's own name",/^# Booklet — my notes$/m.test(A.toMarkdown()));

// ---- `app` is "booklet", as SPEC.md says, and the old name is still read
{fresh();const md=A.toMarkdown();
 const meta=JSON.parse([...md.matchAll(/```json\s*\n([\s\S]*?)\n```/g)].map(m=>m[1]).find(j=>/"block":\s*"meta"/.test(j)));
 chk("the record's meta block names the app \"booklet\"",meta.app==="booklet",meta.app);
 const old=md.replace('"app": "booklet"','"app": "useful-next-step"');
 chk("a file written under the old app name still loads",A.parseFile(old).ok===true&&A.parseFile(old).S!==undefined);
 chk("and so does one written under the new name",A.parseFile(md).ok===true);}
const specEnvelope=app=>"---\nbooklet: 1\nencrypted: true\n---\n\n# x\n\n```json\n"+JSON.stringify({app,enc:"v1",
  kdf:{name:"PBKDF2",hash:"SHA-256",iterations:1,salt:"AA=="},cipher:{name:"AES-GCM",iv:"AA=="},data:"AA=="},null,1)+"\n```\n";
chk("a locked envelope written to the spec (app \"booklet\") is recognised",!!A.lockedEnvelope(specEnvelope("booklet")));
chk("a locked envelope from the older renderer is still recognised",!!A.lockedEnvelope(specEnvelope("useful-next-step")));
chk("an envelope from some other app is not",A.lockedEnvelope(specEnvelope("something-else"))===null);
if(typeof crypto!=="undefined"&&crypto.subtle){
  A.lockText("hello",".pass.word.").then(async sealed=>{
    const env=A.lockedEnvelope(sealed);
    chk("the renderer writes a locked file with app \"booklet\" and reads it back as locked",!!env&&env.app==="booklet",env&&env.app);
    chk("and it opens with the passphrase",env&&(await A.unlockText(env,".pass.word."))==="hello");
    finish();
  }).catch(e=>{chk("lock and unlock round trip",false,String(e));finish();});
} else {console.log("  skip  lock round trip (no WebCrypto in this node)");finish();}

// ---- the `sync` slot is carried through unchanged, whatever it holds
{fresh();
 const slot={provider:"some-other-store",ref:"abc/123",synced:"2026-09-18T14:25:00Z",rev:"r7",extra:{kept:[1,2]}};
 A.getS().person.sync=slot;
 const back=A.parseFile(A.toMarkdown());
 chk("a sync slot the renderer does not understand is preserved on a round trip",
   JSON.stringify(back.S.person.sync)===JSON.stringify(slot),JSON.stringify(back.S.person.sync));
 fresh();
 chk("no slot at all round-trips as none",A.parseFile(A.toMarkdown()).S.person.sync===null);}

// ---- the spec says what the code does
{const spec=read("SPEC-v1.md");
 chk("SPEC-v1.md recommends the .booklet.md extension and keeps plain .md readable",
   /\.booklet\.md/.test(spec)&&/plain `\.md`/.test(spec));
 chk("SPEC-v1.md defines the sync slot: optional, preserved, open provider list, no credentials",
   /### `sync`/.test(spec)&&/must preserve the slot unchanged/.test(spec)&&/open list/.test(spec)&&/no credentials/i.test(spec));
 chk("SPEC.md, SPEC-v1.md and STATUS.md no longer claim production use by another site",
   !/used in production|production site uses/i.test(spec+read("SPEC.md")+read("STATUS.md")));
 chk("SPEC-v1.md's example locked envelope and meta block use app \"booklet\"",(spec.match(/"app":\s*"booklet"/g)||[]).length>=2);}
function finish(){console.log(fails?"\n"+fails+" FAILURES":"\nformat checks passed");process.exit(fails?1:0);}
