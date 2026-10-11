// Cards (renderer 0.11.10, C1): one builder, the picture, the colour, the teaser, the status line, a module's screen and the foot
// of an activity, and every new interface word in four languages. The drawn colours, folding and clicking are test/cards-browser.js.
// Run: node test/cards.test.js
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const {find,hasClass,texts}=P;
const FM='---\nbooklet: "0.11"\nid: local/cards\ntitle: "Cards"\nlang: en\n---\n\n';
const A=P.boot();

/* 1. the picture: a leading emoji, else the number, else none */
{const e=A.cardPicture("🌱 Why it works",3),n=A.cardPicture("Why it works",3),z=A.cardPicture("Why it works",null);
 chk("a leading emoji moves into the tile and leaves the title",e.picture&&e.picture.emoji==="🌱"&&e.title==="Why it works",JSON.stringify(e));
 chk("no emoji: the card's number is the picture",n.picture&&n.picture.number===3&&n.title==="Why it works",JSON.stringify(n));
 chk("no emoji and no number: no picture",z.picture===null&&z.title==="Why it works");
 chk("a joined emoji and one with a variation selector are one picture",A.cardPicture("👩‍⚕️ Care",1).picture.emoji==="👩‍⚕️"&&A.cardPicture("⚙️ Gear",1).title==="Gear");
 chk("a title that is only an emoji keeps it as its words",A.cardPicture("🌱",2).picture.number===2&&A.cardPicture("🌱",2).title==="🌱");
 chk("an emoji in the middle is left alone",A.cardPicture("Grow 🌱 now",2).title==="Grow 🌱 now"&&A.cardPicture("Grow 🌱 now",2).picture.number===2);}

/* 2. colour: the card's place in its list, through CARD_HUES */
chk("six cards, six hues, then round again",[0,1,2,3,4,5,6,7].map(A.cardHue).join()==="sky,rose,sage,sun,lilac,petrol,sky,rose");
chk("a bad index still gives a hue",A.cardHue(-1)==="petrol"&&A.cardHue("x")==="sky"&&A.cardHue(undefined)==="sky");

/* 3. the builder: three modes, the picture and the chevron hidden from a screen reader, the number beside the title */
{const go=A.cardNode({mode:"go",title:"Open me",teaser:"A line.",status:"Not started",picture:{number:2},number:2,hue:"rose",onclick(){}});
 chk("go is a button with the mode class and its hue",go.tagName==="button"&&hasClass("card")(go)&&hasClass("card-go")(go)&&hasClass("mode")(go)&&hasClass("hue-rose")(go));
 const tile=find(go,hasClass("cd-tile"))[0],chev=find(go,hasClass("cd-chev"))[0];
 chk("the picture and the chevron are aria-hidden",tile&&tile.attrs["aria-hidden"]==="true"&&chev&&chev.attrs["aria-hidden"]==="true");
 chk("the number is the picture, so it is not beside the title as well",find(go,hasClass("cd-num")).length===0&&texts(tile)==="2");
 const g2=A.cardNode({mode:"go",title:"Open me",picture:{emoji:"🌱"},number:2});
 chk("with an emoji for a picture the number sits beside the title",find(g2,hasClass("cd-num")).length===1&&texts(find(g2,hasClass("cd-num"))[0])==="2");
 chk("a card with nothing to show has no tile, no teaser, no status",find(A.cardNode({mode:"go",title:"x"}),n=>hasClass("cd-tile")(n)||hasClass("d")(n)||hasClass("c")(n)).length===0);
 const fold=A.cardNode({mode:"fold",title:"T",teaser:"hello",body:[{tagName:"p"}]});
 chk("fold is a details with a summary and a body",fold.tagName==="details"&&find(fold,n=>n.tagName==="summary").length===1&&find(fold,hasClass("cd-body")).length===1);
 chk("a fold card's teaser is the one that hides when it is open",find(fold,hasClass("cd-dup")).length===1);
 const item=A.cardNode({mode:"item",tag:"li",cls:"dv-tile",kids:["x"]});
 chk("item is a plain element carrying the card class",item.tagName==="li"&&hasClass("card-item")(item)&&hasClass("dv-tile")(item));
 chk("an unknown mode is a go card",hasClass("card-go")(A.cardNode({mode:"nope",title:"x"})));}

/* 4. the heading of a section gives up its emoji to the tile, and keeps it hidden so a link to the heading still finds it */
{const h={tagName:"h3",attrs:{},children:["🌱 Why it works"]};const got=A.takeLeadEmoji(h);
 chk("the emoji is taken from the heading",got==="🌱"&&texts(h).replace(/\s+/g," ").trim()==="🌱 Why it works"&&h.children[0].attrs.class==="cd-emo"&&h.children[1]==="Why it works",JSON.stringify(h.children.map(c=>c.attrs?c.attrs.class:c)));
 const plain={tagName:"h3",attrs:{},children:["Why it works"]};
 chk("a heading with none gives nothing",A.takeLeadEmoji(plain)===""&&plain.children[0]==="Why it works");}

/* 5. status lines, over a fixture with answers */
{const T=FM+"> [!module|m] Module\n\nBlurb words.\n\n"+
  "> [!activity|a] Sorting\n\n> [!text|q1] One?\n\n> [!text|q2] Two?\n\n> [!text|q3] Three?\n\n"+
  "> [!activity|b] Reading\n\nJust words.\n\n"+
  "> [!activity|c repeat] Log\n\n> [!text|l1] Note?\n\n"+
  "> [!activity|d] Done one\n\n> [!text|d1] Only?\n\n> [!module|m end] End\n";
 A.loadText(T);
 const act=id=>A.activityOf("m/"+id);
 chk("an activity nobody has touched is Not started",A.activityStatus(act("a"))==="Not started",A.activityStatus(act("a")));
 const ans=A.answersIn("m");ans.q1="x";
 chk("one of three answered",A.activityStatus(act("a"))==="1 of 3 answered",A.activityStatus(act("a")));
 ans.q2="y";ans.q3=["z"];
 chk("all answered is Done",A.activityStatus(act("a"))==="Done",A.activityStatus(act("a")));
 ans.q2="   ";
 chk("blank text is not an answer",A.activityStatus(act("a"))==="2 of 3 answered");
 chk("an activity that only reads has no status line",A.activityStatus(act("b"))==="");
 chk("a repeating activity with nothing kept is Not started",A.activityStatus(act("c"))==="Not started");
 A.keptFor("m/c").push({ts:"2026-10-01T10:00:00Z",l1:"a"},{ts:"2026-10-02T10:00:00Z",l1:"b"});
 chk("a repeating activity says how many are kept",A.activityStatus(act("c"))==="2 kept",A.activityStatus(act("c")));
 const acts=["a","b","c","d"].map(act);
 chk("a module says how many of its activities are started (those that can be: the reading one does not count)",A.moduleStatus(acts)==="2 of 3 started",A.moduleStatus(acts));
 chk("the line under a module's blurb counts its activities and the started ones",A.moduleMeta(acts)==="4 activities · 2 started",A.moduleMeta(acts));
 chk("one activity is singular",A.moduleMeta([act("b")])==="1 activity");
 chk("a module of readers only has no status",A.moduleStatus([act("b")])==="");
 for(const k of Object.keys(ans)) delete ans[k];A.keptFor("m/c").length=0;
 chk("nothing started says so",A.moduleStatus(acts)==="Not started"&&A.moduleMeta(acts)==="4 activities");

 /* 6. a module's screen: title, blurb, a meta line, then the cards (no second list) */
 A.screen="module:m";A.render();
 const m=P.main(),cards=find(m,hasClass("mode"));
 chk("the module screen has a card for each shown activity",cards.length===4,String(cards.length));
 chk("it leads with the title, the blurb and the meta line",find(m,n=>n.tagName==="h2").length>=1&&find(m,hasClass("aside")).length===1&&texts(find(m,hasClass("cd-meta"))[0])==="4 activities");
 chk("each card is numbered in file order and has its place's hue",cards.map(c=>texts(find(c,hasClass("cd-tile"))[0])).join()==="1,2,3,4"&&hasClass("hue-sky")(cards[0])&&hasClass("hue-petrol")(cards[0])===false&&hasClass("hue-rose")(cards[1]));
 chk("no second overview list: the only lists of links are the cards",find(m,n=>n.tagName==="ul"||n.tagName==="ol").length===0);
 chk("a card's status line is the activity's status",texts(find(cards[0],hasClass("c"))[0])==="Not started");

 /* 7. the foot of an activity */
 A.screen="m/a";A.render();
 const foot=find(P.main(),hasClass("cd-foot"));
 chk("an activity ends in a foot",foot.length===1);
 chk("it has Back to the overview and Next with the next activity's number and title",texts(foot[0]).includes("Back to the overview")&&/Next: 2\. Reading/.test(texts(foot[0])),texts(foot[0]));
 A.screen="m/d";A.render();
 chk("the last activity of a module has Back and no Next",!/Next/.test(texts(find(P.main(),hasClass("cd-foot"))[0]))&&/Back/.test(texts(find(P.main(),hasClass("cd-foot"))[0])));
 chk("Back leads to the module's screen",(()=>{const f=find(P.main(),hasClass("cd-back"))[0];f._on.click();return A.screen==="module:m";})());}

/* 8. a hint or solution has no teaser and is called by its name in the reader's language */
{A.loadText(FM+"> [!activity|a] A\n\n> [!text|q] Q?\n\n> [!hint]- \n> Try the second one first.\n\n> [!solution]- The way\n> The answer is forty-two.\n\n> [!group]- Extra\n> A line of words that tells you what is inside.\n");
 const blocks=A.activityOf("a").blocks.filter(b=>b.type==="callout"&&b.placement==="folded");
 const mk=b=>A.foldedCallout(b,{},"a");
 chk("the fixture parsed to three folded callouts",blocks.length===3,blocks.map(b=>b.kind+"/"+b.id).join());
 const h=mk(blocks[0]),s=mk(blocks[1]),g=mk(blocks[2]);
 chk("a hint says Hint, shows no teaser, and holds its text closed",/Hint/.test(texts(find(h,n=>n.tagName==="summary")[0]))&&find(h,hasClass("cd-teaser")).length===0&&find(h,hasClass("d")).length===0&&!h.attrs.open);
 chk("a solution with its own title keeps the title and shows no teaser",/The way/.test(texts(find(s,n=>n.tagName==="summary")[0]))&&find(s,hasClass("d")).length===0&&!/forty-two/.test(texts(find(s,n=>n.tagName==="summary")[0])));
 chk("a folded group shows its first words as the teaser",/A line of words/.test(texts(find(g,hasClass("d"))[0]||"")));
 for(const lang of ["fr","es"]){A.lang=lang;const hh=mk(blocks[0]);
   chk("the hint's name is in "+lang+", not the raw kind",!/Hint/.test(texts(find(hh,n=>n.tagName==="summary")[0]))&&texts(find(hh,n=>n.tagName==="summary")[0]).length>0);}
 A.lang="en";
 chk("the doubled title is gone: a folded group's title is drawn once",texts(find(g,n=>n.tagName==="summary")[0]).split("Extra").length===2&&texts(g).split("Extra").length===2,texts(g));}

/* 8b. a hint or solution that is not right under a question (the parser then keeps its own kind) is still one: label, no teaser, closed */
{const cases=[
  ["no question before it","> [!activity|a] A\n\n> [!hint]- \n> SECRET-ONE words here.\n","hint","SECRET-ONE"],
  ["a note between the question and it","> [!activity|a] A\n\n> [!text|q] Q?\n\n> [!note] Aside\n> Some aside.\n\n> [!hint]-\n> SECRET-TWO words here.\n","hint","SECRET-TWO"],
  ["a prose paragraph between the question and it","> [!activity|a] A\n\n> [!text|q] Q?\n\nA paragraph of prose.\n\n> [!solution]-\n> SECRET-THREE words here.\n","solution","SECRET-THREE"],
  ["an upper-case kind","> [!activity|a] A\n\n> [!SOLUTION]-\n> SECRET-FOUR words here.\n","solution","SECRET-FOUR"]];
 for(const [name,src,kind,secret] of cases){
   A.loadText(FM+src);
   const b=A.activityOf("a").blocks.find(x=>x.type==="callout"&&x.placement==="folded"&&/SECRET/.test(JSON.stringify(x)));
   chk("orphan ("+name+"): the parser kept a folded callout",!!b);
   if(!b) continue;
   chk("orphan ("+name+"): it is told to be a "+kind,A.hintKind(b)===kind,String(A.hintKind(b)));
   for(const lang of ["en","fr","es"]){A.lang=lang;const c=A.foldedCallout(b,{},"a"),sum=texts(find(c,n=>n.tagName==="summary")[0]);
     const word=A.STRINGS[lang].cards[kind];
     chk("orphan ("+name+") in "+lang+": the label is the localised "+kind+" and no answer is in the closed summary",sum.trim()===word&&!sum.includes(secret)&&find(c,hasClass("d")).length===0&&!c.attrs.open,JSON.stringify(sum));}
   A.lang="en";}
 chk("an ordinary callout is not a hint",A.hintKind({kind:"note",id:"c1"})===""&&A.hintKind({kind:"",id:"q-hint"})==="hint"&&A.hintKind({kind:"",id:"q-solution"})==="solution"&&A.hintKind({kind:"",id:"c7"})==="");}

/* 9. every new word exists in en, fr, es and es-AR */
{const want=["hint","solution","notStarted","done","answeredOf","startedOf","activitiesN","startedN","back","next"];
 for(const lang of ["en","fr","es","es-AR"]){const c=A.STRINGS[lang].cards;
   const miss=want.filter(k=>c==null||c[k]==null||(typeof c[k]==="string"&&!c[k].trim()));
   chk("the cards words exist in "+lang,miss.length===0,miss.join());
   chk("the number words in "+lang+" take a count",c&&/\d/.test(c.answeredOf(2,6))&&/\d/.test(c.startedOf(1,6))&&/\d/.test(c.activitiesN(3))&&/\d/.test(c.startedN(1))&&/2/.test(c.next(2,"T"))&&/T/.test(c.next(2,"T")));}
 chk("a language that is not English does not hand back the English words",A.STRINGS.fr.cards.back!==A.STRINGS.en.cards.back&&A.STRINGS.es.cards.back!==A.STRINGS.en.cards.back&&A.STRINGS.fr.cards.hint!==A.STRINGS.en.cards.hint);
 chk("the draft words are marked for the localisation pass",/cards: \{ \/\* l10n: draft \*\//.test(P.html)&&P.html.split("cards: { /* l10n: draft */").length===3);}
console.log(fails?fails+" cards checks failed":"all cards checks passed");
P.closePages();process.exit(fails?1:0);
