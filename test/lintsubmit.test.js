// Format 0.21, linter lane: the linter checks the front matter key `submit: <name>` (SPEC.md section 2, "Submit"). A name is 1 to 40 characters
// from a-z, 0-9 and `-`; an address, an empty value, capitals, a long name or any other character is an error. The linter has no registry, so a
// name that is well formed is never a finding, listed by a host or not. Each case is a small file made here with ONE slip, linted, and the finding is
// checked by its kind, its line and its words; the clean files must stay clean. Nothing here is real.
// Run: node test/lintsubmit.test.js   (node and python3; nothing to install.)  LINT_BOOKLET=<path> tries another linter.
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const LINT=process.env.LINT_BOOKLET||path.join(R,"lint-booklet.py");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"lintsubmit-"));let k=0;
const lint=text=>{const dir=path.join(tmp,"c"+(++k));fs.mkdirSync(dir);
  const f=path.join(dir,"f.md");fs.writeFileSync(f,text);
  const r=spawnSync("python3",[LINT,f],{encoding:"utf8"}),lines=r.stdout.split("\n");
  return {status:r.status,out:r.stdout,errors:lines.filter(l=>l.startsWith("ERROR")),warns:lines.filter(l=>l.startsWith("warn"))};};
// the submit line is line 5 of the file
const file=(line,body)=>'---\nbooklet: "0.20"\ntitle: Lint fixture\nlang: en\n'+(line===null?'':line+'\n')+'---\n\n> [!activity|a] A\n\n> [!text|q] Q\n'+(body||'');
const clean=(what,r)=>chk(what,r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);
const bad=(what,line,rx)=>{const r=lint(file(line));
  chk(`${what}: exactly one finding, an error`,r.errors.length===1&&r.errors.length+r.warns.length===1&&r.status===1,r.out);
  chk(`${what}: it names line 5 and says the fix`,/: line 5: front matter `submit/.test(r.errors[0]||"")&&rx.test(r.errors[0]||"")&&/1 to 40 characters from a-z, 0-9 and `-`/.test(r.errors[0]||""),r.errors[0]);};

// ---- clean files stay clean
clean("a booklet with no submit line lints clean",lint(file(null)));
clean("a name lints clean",lint(file("submit: class-feedback")));
clean("a name in double or single quotes lints clean, as the renderer reads every quoted front matter value",lint(file('submit: "class-feedback"')));
clean("...single quotes too",lint(file("submit: 'class-feedback'")));
{const r=lint(file("submit: a"));const s=lint(file("submit: "+"a".repeat(40)));clean("a name of one character lints clean",r);clean("a name of 40 characters lints clean",s);
 clean("a name of digits and hyphens lints clean",lint(file("submit: 2026-11-09")));}
clean("a name no registry lists is still not a finding (the linter has no registry)",lint(file("submit: no-such-endpoint-anywhere")));
clean("a `submit:` written in the body, not the front matter, is not the key",lint(file(null,"\nsubmit: https://example.org/x\n")));
clean("an indented `submit:` is not a front matter key (the front matter is flat), and neither is `Submit:`",lint(file("  submit: https://example.org/x\nSubmit: Whatever")));
clean("a trailing space after the name is taken off",lint(file("submit: class-feedback   ")));
clean("the example that names an endpoint lints clean",(()=>{const r=spawnSync("python3",[LINT,path.join(R,"examples","class-feedback.booklet.md")],{encoding:"utf8"});return {status:r.status,out:r.stdout};})());

// ---- the slips, one at a time
bad("an address in place of the name","submit: https://example.org/submit",/looks like an address, and a booklet never carries an address/);
bad("an address with no scheme","submit: example.org/submit",/looks like an address/);
bad("a name with a dotted host","submit: forms.example",/looks like an address/);
bad("a name followed by an address","submit: class-feedback https://example.org/x",/looks like an address/);
bad("an empty value","submit:",/is empty/);
bad("an empty quoted value",'submit: ""',/is empty/);
bad("capital letters","submit: Class-Feedback",/has capital letters, and a name is lower case/);
bad("a name of 41 characters","submit: "+"a".repeat(41),/is 41 characters long, and a name is at most 40/);
bad("an underscore","submit: class_feedback",/has a character other than a-z, 0-9 and `-`/);
bad("a space inside the name","submit: class feedback",/has a character other than a-z, 0-9 and `-`/);
bad("an accented letter","submit: clásico",/has a character other than a-z, 0-9 and `-`/);
{const r=lint(file("submit: https://example.org/"+"x".repeat(80)));
 chk("a long value is shown shortened in the message, not repeated whole",r.errors.length===1&&/\.\.\.` looks like an address/.test(r.errors[0])&&r.errors[0].length<420,r.errors[0]);}
{const r=lint('---\nbooklet: "0.20"\ntitle: Lint fixture\nlang: en\nsubmit: Bad\nsubmit: also bad!\n---\n\n> [!activity|a] A\n\n> [!text|q] Q\n');
 chk("two submit lines are each checked, by their own lines",r.errors.length===2&&/: line 5: /.test(r.errors[0])&&/: line 6: /.test(r.errors[1]),r.out);}
console.log(fails?"\n"+fails+" FAILURES":"\nlintsubmit checks passed");process.exit(fails?1:0);
