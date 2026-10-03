// The linter's own rules, for the v0.3 format. test/fixtures/lint-ok.md is a
// small clean booklet; every other test/fixtures/lint-*.md is that file with one
// change, written to break exactly one rule. This lints each and checks that the
// ERROR (or warn) line names the rule and says where. The clean fixture, every
// file the repo ships and the blind-built booklets must stay clean, so a new rule
// cannot buy its catch with a false alarm.
// Run: node test/lint.test.js   (node and python3; nothing to install)
// LINT_BOOKLET=<path> runs the same checks against another copy of the linter.
const fs=require("fs"),path=require("path"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const LINT=process.env.LINT_BOOKLET||path.join(R,"lint-booklet.py");
const FX=path.join(__dirname,"fixtures");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const lint=(...a)=>{const r=spawnSync("python3",[LINT,...a],{encoding:"utf8"});
  return {status:r.status,out:r.stdout,
    errors:r.stdout.split("\n").filter(l=>l.startsWith("ERROR")),
    warns:r.stdout.split("\n").filter(l=>l.startsWith("warn"))};};

// ---- the clean one, and what the repo ships, stay clean
{const ok=lint(path.join(FX,"lint-ok.md"));
 chk("lint-ok.md lints clean",ok.status===0&&/0 errors · 0 warnings/.test(ok.out),ok.out);
 const repo=lint();
 chk("the repo's own files lint at 0 errors",repo.status===0&&/ 0 errors · /.test(repo.out),repo.out.slice(-300));
 const blind=fs.readdirSync(FX).filter(n=>/^skill-.*\.booklet\.md$/.test(n)).map(n=>path.join(FX,n));
 const b=lint(...blind);
 chk("the three booklets built blind from SKILL.md have no errors",blind.length===3&&b.errors.length===0,b.errors.join(" | "));
 const reg=lint(...["module-daily-journal","module-the-day","module-check-in"].map(n=>path.join(FX,n+".md")));
 chk("the module fixtures (copies of real registry modules) lint clean as v0.3",reg.status===0&&/0 errors/.test(reg.out),reg.out);
 const flag=lint("--registry",path.join(FX,"lint-ok.md"));
 chk("--registry is accepted and a clean file stays clean",flag.status===0&&/0 errors · 0 warnings/.test(flag.out),flag.out);}

// ---- each fixture breaks one rule: exactly one error, naming the rule and the place
const CASES=[
 ["lint-not-v02","front matter without booklet: 0.3 (an old `module:` file)",/front matter must say `booklet: 0\.3` \(found None\)/],
 ["lint-old-format-0-2","a file still saying booklet: 0.2",/front matter says booklet: 0\.2; this is format 0\.3 \(callout settings are now key:value\)\. Update the file, then the marker\./],
 ["lint-no-lang","front matter with no lang",/front matter has no `lang:`/],
 ["lint-bad-lang","a lang that is not a language tag",/`lang: klingon`: 'klingon' is not a language tag/],
 ["lint-dup-question-id","a question id reused",/line 13: the id 'walk' is also used on line 11/],
 ["lint-dup-block-id","a block id used twice",/line 26: the block id \^picker-data is used twice/],
 ["lint-embed-nothing","an embed that points at no block",/line 15: !\[\[#\^nowhere\]\] points at no block in this file/],
 ["lint-embed-not-widget","an embed that points at a block that is not a widget",/line 15: \^notes is not a widget block/],
 ["lint-widget-no-data","a widget with no data block under it",/line 15: the widget 'picker' names no data block/],
 ["lint-widget-bad-json","a widget block whose JSON is invalid",/line 18: the `booklet widget` block is not valid JSON/],
 ["lint-widget-no-engine","a widget that names no engine",/line 18: the widget \^picker-data names no `engine`/],
 ["lint-widget-script","script in a widget's figure SVG",/line 18: the widget \^picker-data has event handler onclick in a figure/],
 ["lint-module-unclosed","a module opened and never closed",/line 9: the module 'fixture-mod' is opened and never closed/],
 ["lint-module-stray-end","a module closed that was never opened",/line 21: a module is closed that was never opened/],
 ["lint-question-no-id","a question with no id",/line 13: this text question has no id/],
 ["lint-list-from-zero","a numbered list from 0 right under a question",/line 14: a numbered list that does not start at 1/],
 ["lint-setting-equals","a setting written key=value instead of key:value",/line 13: settings are written key:value \(found min=0\)/],
 ["lint-query-no-from","a query with no `from:`",/line 23: a query needs `from:`/],
 ["lint-query-from-nothing","a query whose `from:` names nothing",/line 23: the query's `from: nowhere` names no activity or question/],
 ["lint-query-other-module","a query whose `from:` is in another module",/line 23: the query's `from: elsewhere` is in another module/],
 ["lint-query-no-entries","a query of an activity that keeps no entries",/line 23: the query's `from: once` keeps no entries/],
 ["lint-query-bad-field","a query whose `fields:` names a question not in the activity",/line 23: the query's `fields: far` is not a question of 'log'/],
 ["lint-query-bad-newest","a query whose `newest:` is not a positive integer",/line 23: the query's `newest: 0` must be a positive whole number/],
 ["lint-query-bad-key","a query with a setting it does not take",/line 25: a query has no setting 'limit'/],
 ["lint-query-not-kv","a query body line that is not `key: value`",/line 25: a query line is written `key: value` \(found 'newest 3'\)/],
 ["lint-menu-unknown","a question naming a menu that is not in the file",/line 13: `menu:feelings` names no menu in this file/],
 ["lint-menu-and-list","a question with both menu: and a list of its own",/line 17: the question 'morning' has both `menu:feelings` and a list of its own/],
 ["lint-menu-empty","a menu with no items",/line 13: the menu 'feelings' has no items/],
 ["lint-matrix-no-items","a matrix with no items",/line 13: the matrix 'phq' has no items/],
 ["lint-matrix-no-anchors","a matrix with no anchors",/line 13: the matrix 'phq' has no anchors/],
 ["lint-matrix-dup-anchors","a matrix whose anchor numbers repeat",/line 13: the matrix 'phq' repeats anchor number 1/],
 ["lint-fence-unclosed","a fence opened and never closed",/line 25: a fence is opened and never closed/],
];
for(const [name,what,rx] of CASES){
  const r=lint(path.join(FX,name+".md"));
  chk(`${what}: exactly one error`,r.status===1&&r.errors.length===1,r.errors.join(" | ")||r.out);
  chk(`${what}: the message names the rule and the place`,rx.test(r.errors[0]||""),r.errors[0]);
  chk(`${what}: the message carries the file`,(r.errors[0]||"").includes(name+".md"),r.errors[0]);
}
{// a widget block with no ^id: reported first, and the embed then has nothing to find
 const r=lint(path.join(FX,"lint-widget-no-id.md"));
 chk("a widget block with no ^id is an error naming the line",r.status===1&&/line 18: a widget block needs a \^id/.test(r.errors[0]||""),r.out);}
{// records naming no activity are a warning, not an error
 const r=lint(path.join(FX,"lint-records-no-activity.md"));
 chk("records for an activity no line names: one warning, no error",
   r.status===0&&r.errors.length===0&&r.warns.length===1&&/line 27: records for 'elsewhere', which no activity line names/.test(r.warns[0]||""),r.out);}

{// the colon form of a setting is clean
 const r=lint(path.join(FX,"lint-setting-colon.md"));
 chk("`> [!number|sleep min:0 max:24] Hours` lints clean",r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);}

{// a query written correctly is clean
 const r=lint(path.join(FX,"lint-query-ok.md"));
 chk("a `booklet query` block with every setting lints clean",r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);}

{// a shared menu used by two questions, and a matrix, are clean
 const r=lint(path.join(FX,"lint-menu-matrix-ok.md"));
 chk("a shared menu used by two questions, and a matrix, lint clean (and matrix is no longer 'not drawn')",r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);}
{// a menu defined outside the module that uses it: a warning, not an error
 const r=lint(path.join(FX,"lint-menu-outside.md"));
 chk("a module using a menu defined outside its fence: one warning, no error",
   r.status===0&&r.errors.length===0&&r.warns.length===1&&/line 13: `menu:feelings` is defined outside module 'fixture-mod'/.test(r.warns[0]||""),r.out);}

{// links between activities: a link to a heading that is there is clean; one to a heading that is not is a warning
 const ok=lint(path.join(FX,"lint-links-ok.md"));
 chk("`[[#A walk]]`, `[a walk](#a-walk)` and a titled link to a question lint clean",ok.status===0&&/0 errors · 0 warnings/.test(ok.out),ok.out);
 const r=lint(path.join(FX,"lint-link-missing.md"));
 chk("a `[[#…]]` and a `](#…)` link to no heading: two warnings, no error, each naming the line",
   r.status===0&&r.errors.length===0&&r.warns.length===2&&/line 23: the link \[\[#Check yourself\]\] points at no heading/.test(r.warns[0]||"")
   &&/line 23: the link \]\(#check-yourself\) points at no heading/.test(r.warns[1]||""),r.out);}

console.log(fails?`\n${fails} failed`:"\nlint checks passed");
process.exit(fails?1:0);
