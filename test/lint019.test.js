// Format 0.19, linter lane: the linter checks the copy line (SPEC.md section 4, the `copy` row; section 6, "Copy"). Each case is a small file made
// here with ONE slip, linted, and the finding is checked by its kind (error or warning), its line and its words; the clean files must stay clean,
// so a new check cannot buy its catch with a false alarm, and a booklet that does not use the copy line is untouched. Nothing here is real.
// Run: node test/lint019.test.js   (node and python3; nothing to install.)  LINT_BOOKLET=<path> tries another linter.
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const LINT=process.env.LINT_BOOKLET||path.join(R,"lint-booklet.py");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"lint019-"));let k=0;
const lint=text=>{const dir=path.join(tmp,"c"+(++k));fs.mkdirSync(dir);
  const f=path.join(dir,"f.md");fs.writeFileSync(f,text);
  const r=spawnSync("python3",[LINT,f],{encoding:"utf8"}),lines=r.stdout.split("\n");
  return {status:r.status,out:r.stdout,errors:lines.filter(l=>l.startsWith("ERROR")),warns:lines.filter(l=>l.startsWith("warn"))};};
const FM='---\nbooklet: "0.19"\ntitle: Lint fixture\nlang: en\n---\n\n';
const one=(what,r,kind,line,rx)=>{const got=kind==="ERROR"?r.errors:r.warns;
  chk(`${what}: exactly one finding, ${kind==="ERROR"?"an error":"a warning"}`,got.length===1&&r.errors.length+r.warns.length===1,r.out);
  chk(`${what}: it names line ${line} and says the fix`,new RegExp(": line "+line+": ").test(got[0]||"")&&rx.test(got[0]||""),got[0]);
  chk(`${what}: ${kind==="ERROR"?"the file fails":"the build does not fail"}`,(r.status===1)===(kind==="ERROR"),String(r.status));};
const clean=(what,r)=>chk(what,r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);

// a file of one activity; the activity line is line 7, the question line 9, the folded solution lines 11 and 12, the copy line is line 14
const Q='> [!activity|a] A\n\n> [!text|q long] Q\n\n> [!solution]- Model\n> Because.\n\n';
const COPY=(of,extra)=>FM+Q+(extra||"")+`> [!copy|c ${of}] Copy\n> Lead-in.\n`;

// ---- clean files stay clean
clean("a copy line naming a question, its solution and a block lints clean",lint(FM+Q+'> [!hint]- Nudge\n> Think.\n\n```text\nRUBRIC\n```\n^rub\n\n> [!copy|c of:q,q/solution,rub] Copy\n> Lead-in.\n'));
clean("a copy line with no id, and one above the question it names, lint clean",lint(FM+'> [!activity|a] A\n\n> [!copy|of:q] Copy\n\n> [!text|q] Q\n'));
clean("a copy line naming a hint of a choice question lints clean",lint(FM+'> [!activity|a] A\n\n> [!choice|q] Q\n- [ ] A\n- [x] B\n\n> [!hint]- H\n> Think.\n\n> [!copy|c of:q/hint,q] Copy\n'));
clean("a copy line in a group in an activity, and one in a tab, lint clean",lint(FM+'> [!activity|a] A\n\n> [!group]- G\n> > [!text|q] Q\n> >\n> > [!copy|c of:q] Copy\n\n> [!tab] Second\n\n> [!copy|d of:q] Copy\n'));
clean("a block in the module's data section and in the shared data section is found",lint(FM+'> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!copy|c of:own,shared] Copy\n\n> [!data|m] Data\n\n```text\nOWN\n```\n^own\n\n> [!module|m end] End\n\n> [!data] Shared\n\n```text\nSHARED\n```\n^shared\n'));
clean("a file with no copy line is untouched: every example lints clean",(()=>{const r=spawnSync("python3",[LINT],{encoding:"utf8",cwd:R});return {status:r.status,out:r.stdout};})());

// ---- the slips, one at a time
one("a copy line with no `of:`",lint(FM+Q+'> [!copy|c] Copy\n'),"ERROR",14,/needs `of:` with the ids it copies/);
one("a copy line with an empty `of:`",lint(FM+Q+'> [!copy|c of:] Copy\n'),"ERROR",14,/needs `of:`/);
one("a copy line with an empty place between two commas",lint(COPY("of:q,,q/solution")),"ERROR",14,/has an empty place between two commas/);
one("an id that names nothing",lint(COPY("of:q,nobody")),"ERROR",14,/`nobody` in `of:` names no question of this activity and no block of this module/);
one("a word that is not an id",lint(COPY("of:q,Bad_Id")),"ERROR",14,/`Bad_Id` in `of:` is not an id/);
one("a word with a part other than solution or hint",lint(COPY("of:q/rubric")),"ERROR",14,/`q\/rubric` in `of:` is not an id, or an id with `\/solution` or `\/hint`/);
one("an upper-case part",lint(COPY("of:q/Solution")),"ERROR",14,/`q\/Solution` in `of:` is not an id/);
one("a hint the question does not have",lint(COPY("of:q/hint")),"ERROR",14,/`q\/hint` in `of:` has no hint folded \(`> \[!hint\]-`\) straight under the question/);
{const r=lint(FM+'> [!activity|a] A\n\n> [!text|q] Q\n\n> [!solution] Open\n> Not folded.\n\n> [!copy|c of:q/solution] Copy\n');
 chk("a solution that is not folded is not the question's own: the word is an error (and the fold is the one warning the file already gets)",
   r.errors.length===1&&/: line 14: `q\/solution` in `of:` has no solution folded/.test(r.errors[0])&&r.warns.length===1&&/not folded/.test(r.warns[0]),r.out);}
{const r=lint(FM+'> [!activity|a] A\n\n> [!text|q] Q\n\n> [!copy|c of:q/solution] Copy\n\n> [!solution]- After\n> Late.\n');
 chk("a solution after the copy line is not the question's own, because the copy line ends the question above it",
   r.errors.length===1&&/: line 11: `q\/solution` in `of:` has no solution folded/.test(r.errors[0]),r.out);}
one("a matrix question",lint(FM+'> [!activity|a] A\n\n> [!matrix|mx] Grid\n\n- one\n\n0. no\n1. yes\n\n> [!copy|c of:mx] Copy\n'),"ERROR",16,/`mx` in `of:` is a matrix question, and only text, lines, choice, multi, scale, number and date questions can be copied/);
one("a question asked for each pick of another",lint(FM+'> [!activity|a] A\n\n> [!choice|ch] Pick\n- [ ] A\n- [ ] B\n\n> [!text|why each:ch] Why\n\n> [!copy|c of:why] Copy\n'),"ERROR",15,/`why` in `of:` is asked for each pick of another question, or for each row of a data block, and such a question cannot be copied/);
one("a question asked for each row of a data block says so too, not only each pick of another question",lint(FM+'> [!activity|a] A\n\n```booklet query\nfrom: rows\n```\n\n> [!text|why each:rows] Why\n\n> [!copy|c of:why] Copy\n\n```booklet data\n[{"id":"r1","why":[]}]\n```\n^rows\n'),"ERROR",15,/`why` in `of:` is asked for each pick of another question, or for each row of a data block, and such a question cannot be copied/);
one("an activity's id",lint(COPY("of:a")),"ERROR",14,/`a` in `of:` is neither a question nor a block, so it cannot be copied/);
one("a question of another activity",lint(COPY("of:other")+'\n> [!activity|b] B\n\n> [!text|other] Other\n'),"ERROR",14,/`other` in `of:` is a question of another activity, and a copy line copies from its own/);
one("a block that is in another module only",lint(FM+'> [!module|m] M\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!copy|c of:far] Copy\n\n> [!module|m end] End\n\n> [!module|n] N\n\n```text\nFAR\n```\n^far\n\n> [!module|n end] End\n'),"ERROR",13,/`far` in `of:` is a block in another module only/);
one("a copy line in a module's opening",lint(FM+'> [!module|m] M\n\n> [!copy|c of:q] Copy\n\n> [!activity|a] A\n\n> [!text|q] Q\n\n> [!module|m end] End\n'),"ERROR",9,/a copy line belongs inside an activity, so a renderer ignores it \(this one is in a module's opening\)/);
one("a copy line before every activity",lint(FM+'> [!copy|c of:q] Copy\n\n> [!activity|a] A\n\n> [!text|q] Q\n'),"ERROR",7,/belongs inside an activity.*outside every activity/);
one("a copy line in the records section",lint(FM+'> [!activity|a] A\n\n> [!text|q] Q\n\n%%\n> [!records]\n\n> [!copy|c of:q] Copy\n%%\n'),"ERROR",14,/cannot go in the records section/);
one("a copy line in a data section",lint(FM+'> [!activity|a] A\n\n> [!text|q] Q\n\n> [!data] D\n\n> [!copy|c of:q] Copy\n'),"WARN",13,/a copy line in a data section is not read/);
one("a setting the kind does not take",lint(COPY("of:q extra:1")),"ERROR",14,/a copy line takes no `extra:` setting \(it takes `of:`\)/);
one("`of:` on a kind that does not take it",lint(FM+'> [!activity|a] A\n\n> [!text|q of:q] Q\n'),"ERROR",9,/a text line takes no `of:` setting/);
one("a copy line's id is also a question's",lint(FM+'> [!activity|a] A\n\n> [!text|q] Q\n\n> [!copy|q of:q] Copy\n'),"ERROR",11,/the id 'q' is also used on line 9/);
one("a copy line's id that is not an id",lint(FM+'> [!activity|a] A\n\n> [!text|q] Q\n\n> [!copy|my_copy of:q] Copy\n'),"ERROR",11,/the id 'my_copy' may hold only letters, digits and dashes/);

if(fails){console.log("\n"+fails+" check(s) failed");process.exit(1);}
console.log("\nall checks passed");
