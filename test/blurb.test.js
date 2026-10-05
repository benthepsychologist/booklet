// A module card's blurb is the first paragraph read as inline Markdown, and its text taken (as the section preview does).
// Before 0.11 plainText deleted every * _ ~ and =, so snake_case became snakecase, and it left $x$ and ![alt](url) as
// raw text. Run: node test/blurb.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
let fails=0;
const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const A=P.boot();
const pt=A.plainText;
chk("snake_case keeps its underscore",pt("a snake_case name")==="a snake_case name",pt("a snake_case name"));
chk("an equals sign and a tilde in ordinary text stay (a == b is not a mark pair)",pt("1 + 1 = 2, about ~5")==="1 + 1 = 2, about ~5",pt("1 + 1 = 2, about ~5"));
chk("emphasis, strong, strike and mark marks go, their words stay",pt("*a* **b** ~~c~~ ==d== _e_ __f__")==="a b c d e f",pt("*a* **b** ~~c~~ ==d== _e_ __f__"));
chk("code keeps its words and loses its ticks; underscores inside stay",pt("run `do_it` now")==="run do_it now");
chk("a formula is its TeX, without the dollars",pt("then $x_1$ and $$y$$")==="then x_1 and y",pt("then $x_1$ and $$y$$"));
chk("an image is its alt text, never its address",pt("see ![a diagram](https://t.example/p.png \"t\") here")==="see a diagram here",pt("see ![a diagram](https://t.example/p.png \"t\") here"));
chk("a link is its label, a wikilink its label or target, a footnote mark nothing",pt("[the docs](https://x.example) and [[Heading|label]] and [[Other]][^1]")==="the docs and label and Other",pt("[the docs](https://x.example) and [[Heading|label]] and [[Other]][^1]"));
chk("an escaped mark is the plain character",pt("5 \\* 3")==="5 * 3",pt("5 \\* 3"));
chk("lines join with a space; nothing at all is empty",pt("one\ntwo")==="one two"&&pt("")===""&&pt(null)==="");
const FILE=`---\nbooklet: "0.11"\ntitle: T\nlang: en\n---\n\n> [!module|m] M\n\nA **bold** start with snake_case, $x$ and ![alt text](https://t.example/p.png), see [the guide](g.md).\nSecond line of it.\n\nNot the blurb.\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!activity|b] B\n\n> [!text|r] R\n\n> [!module|m end] End\n`;
{const R=A.parseFile(FILE),mod=R.template.modules[0];
 chk("the module's blurb reads the first paragraph as inline Markdown",mod.blurb==="A bold start with snake_case, x and alt text, see the guide. Second line of it.",JSON.stringify(mod.blurb));
 P.wipe();const B=P.boot();B.loadText(FILE);B.screen="home";B.render();
 chk("and the card on the home screen shows that line",P.texts(P.main()).includes("A bold start with snake_case, x and alt text, see the guide."),P.texts(P.main()).slice(0,300));}
console.log(fails?"\n"+fails+" FAILURES":"\nblurb checks passed");P.closePages();process.exit(fails?1:0);
