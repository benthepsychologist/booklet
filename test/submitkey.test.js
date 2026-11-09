// Format 0.21: the front matter key `submit: <name>` (SPEC.md section 2, "Submit"). The reference renderer does not read it: no problem is
// reported for it, whatever it holds, nothing in the booklet it makes carries it, and it is kept as written when the file is saved, also
// after the reader renames the booklet. Only the submit build (submit/) reads it, through the renderer's own frontMatter and kvLine, which
// this file also pins: the last `submit` line wins, quotes come off, a lower-case key `submit` only.
// Run: node test/submitkey.test.js      (Needs node; nothing to install.)
const P=require("./page.js");
const fs=require("fs");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d!==undefined&&!ok?"   → "+d:""));};
const file=lines=>`---\nbooklet: "0.20"\nid: t/key\ntitle: T\nlang: en\n${lines}---\n\n> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n`;
const A=P.boot();

/* read as any unknown key: no problem, and nowhere in what the parse hands on */
for(const v of ["class-feedback",'"class-feedback"',"Not A Name","https://example.org/submit",""]){
  const r=A.parseFile(file(`submit: ${v}\n`));
  chk(`a submit line holding ${JSON.stringify(v)} opens the file and the renderer says nothing about it`,r.ok&&r.refused.length===0&&r.unread.length===0,JSON.stringify(r.unread));
  chk(`...and the booklet it makes holds no submit key`,!("submit" in r.template)&&!JSON.stringify(Object.keys(r.template)).includes("submit"));}

/* the renderer's own front matter helpers, which the submit build reads the key with */
const submitOf=text=>{let v=null;for(const l of A.frontMatter(text,true).head||[]){const kv=A.kvLine(l);if(kv&&kv[0]==="submit") v=kv[1];}return v;};
chk("the submit build's reading: the value, quotes off",submitOf(file("submit: class-feedback\n"))==="class-feedback"&&submitOf(file('submit: "class-feedback"\n'))==="class-feedback"&&submitOf(file("submit: 'class-feedback'\n"))==="class-feedback");
chk("...no line is no value; an empty line is an empty value",submitOf(file(""))===null&&submitOf(file("submit:\n"))==="");
chk("...the last line wins, as in the parse",submitOf(file("submit: first\nsubmit: second\n"))==="second");
chk("...a key in capitals, an indented line and a line in the body are not the key",submitOf(file("Submit: x\n"))===null&&submitOf(file("  submit: x\n"))===null&&submitOf(file("")+"\nsubmit: x\n")===null);
chk("...a file with CRLF line ends reads the same",submitOf(file("submit: class-feedback\n").replace(/\n/g,"\r\n"))==="class-feedback");
chk("...what a booklet holds in the page is read from the text the renderer keeps (raw.source), so a renamed booklet still names its endpoint",(()=>{
  const R=A.parseFile(file("submit: class-feedback\n")),src=R.template.raw.source;
  const renamed=A.setTitleIn(src,"A new name","en");
  return submitOf(src)==="class-feedback"&&submitOf(renamed)==="class-feedback"&&/^title: "A new name"$/m.test(renamed);})());

/* kept as written when the file is saved */
{const B=P.boot();B.loadText(file("submit: class-feedback\n"));
 const out=B.toMarkdown();
 chk("a saved booklet keeps the submit line exactly as it was written",/^submit: class-feedback$/m.test(out)&&out.indexOf("submit: class-feedback")===file("submit: class-feedback\n").indexOf("submit: class-feedback"),out.slice(0,120));
 chk("...and what is saved opens again with nothing said",B.parseFile(out).ok&&B.parseFile(out).unread.length===0);}
{const B=P.boot();B.loadText(file('submit: "class-feedback"\nsubmit-note: kept\n'));
 const out=B.toMarkdown();
 chk("the quotes and another key beside it come back as they were",/^submit: "class-feedback"$/m.test(out)&&/^submit-note: kept$/m.test(out),out.slice(0,140));}
P.closePages();
console.log(fails?"\n"+fails+" FAILURES":"\nsubmitkey checks passed");process.exit(fails?1:0);
