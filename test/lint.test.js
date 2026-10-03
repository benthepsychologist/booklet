// The linter's own rules, for the v0.5 format. test/fixtures/lint-ok.md is a
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
 chk("the module fixtures (copies of real registry modules) lint clean as v0.5",reg.status===0&&/0 errors/.test(reg.out),reg.out);
 const flag=lint("--registry",path.join(FX,"lint-ok.md"));
 chk("--registry is accepted and a clean file stays clean",flag.status===0&&/0 errors · 0 warnings/.test(flag.out),flag.out);}

// ---- each fixture breaks one rule: exactly one error, naming the rule and the place
const CASES=[
 ["lint-not-v02","front matter without booklet: 0.5 (an old `module:` file)",/front matter must say `booklet: 0\.5` \(found None\)/],
 ["lint-old-format-0-2","a file still saying booklet: 0.2",/front matter says booklet: 0\.2; this is format 0\.5\. Change the marker to booklet: 0\.5 \(and write settings as key:value/],
 ["lint-old-format-0-3","a file still saying booklet: 0.3",/front matter says booklet: 0\.3; this is format 0\.5\. Change the marker to booklet: 0\.5\.$/],
 ["lint-old-format-0-4","a file still saying booklet: 0.4",/front matter says booklet: 0\.4; this is format 0\.5\. Change the marker to booklet: 0\.5\.$/],
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
 ["lint-query-from-nothing","a query whose `from:` names nothing",/line 23: the query's `from: nowhere` names no activity, question or data block/],
 ["lint-query-other-module","a query whose `from:` is in another module",/line 23: the query's `from: elsewhere` is in another module/],
 ["lint-query-no-entries","a query of an activity that keeps no entries",/line 23: the query's `from: once` keeps no entries/],
 ["lint-query-bad-field","a query whose `fields:` names a question not in the activity",/line 23: the query's `fields: far` is not a question of 'log'/],
 ["lint-query-bad-newest","a query whose `newest:` is not a positive integer",/line 23: the query's `newest: 0` must be a positive whole number/],
 ["lint-query-bad-key","a query with a setting it does not take",/line 25: a query has no setting 'sort'/],
 ["lint-query-not-kv","a query body line that is not `key: value`",/line 25: a query line is written `key: value` \(found 'newest 3'\)/],
 ["lint-menu-unknown","a question naming a menu that is not in the file",/line 13: `menu:feelings` names no menu in this file/],
 ["lint-menu-and-list","a question with both menu: and a list of its own",/line 17: the question 'morning' has both `menu:feelings` and a list of its own/],
 ["lint-menu-empty","a menu with no items",/line 13: the menu 'feelings' has no items/],
 ["lint-matrix-no-items","a matrix with no items",/line 13: the matrix 'phq' has no items/],
 ["lint-matrix-no-anchors","a matrix with no anchors",/line 13: the matrix 'phq' has no anchors/],
 ["lint-matrix-dup-anchors","a matrix whose anchor numbers repeat",/line 13: the matrix 'phq' repeats anchor number 1/],
 ["lint-data-no-id","a data block with no ^id",/line 19: a data block needs a \^id/],
 ["lint-data-bad-json","a data block that is not JSON",/line 19: the `booklet data` block is not valid JSON/],
 ["lint-data-no-rows","a data block with no list of rows",/line 19: the data block \^short-list holds no list of rows/],
 ["lint-data-nested","a data block with a nested value",/line 19: the data block \^short-list has a nested value in 'a'/],
 ["lint-data-bad-fields","a data block whose `fields` are not labels",/line 19: the data block \^short-list has `fields` that is not an object of labels/],
 ["lint-data-id-clash","a data block id that is also a question's id",/line 19: the data block id \^situation is also the id on line 13/],
 ["lint-query-bad-as","a query whose `as:` is not a view",/line 25: the query's `as: chart` is not one of cards, table, list, tiles/],
 ["lint-query-bad-limit","a query whose `limit:` is not a positive integer",/line 25: the query's `limit: 0` must be a positive whole number/],
 ["lint-query-cards-on-data","`as: cards` on a data block",/line 25: the query's `as: cards` draws kept entries, not the data block 'short-list'/],
 ["lint-query-data-other-module","a query of a data block in another module",/line 13: the query's `from: short-list` is a data block in another module/],
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

{// a file with no activity line is one activity, so its queries belong to it
 const r=lint(path.join(FX,"lint-query-plain-file.md"));
 chk("a query in a plain file (no activity line) lints clean",r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);}

{// a query written correctly is clean
 const r=lint(path.join(FX,"lint-query-ok.md"));
 chk("a `booklet query` block with every setting lints clean",r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);}

{// data blocks and the four views, written correctly, are clean
 const r=lint(path.join(FX,"lint-data-ok.md"));
 chk("a data block and a query of each view (table, list, tiles, and a kept-entries table) lint clean",r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);
 const f=lint(path.join(FX,"data-views.booklet.md"));
 chk("the data-views fixture (data inside a module, and in the data section) lints clean",f.status===0&&/0 errors · 0 warnings/.test(f.out),f.out);
 const w=lint(path.join(FX,"lint-query-data-warn.md"));
 chk("a `group:` naming a field the rows never carry is one warning, no error, naming the line",
   w.status===0&&w.errors.length===0&&w.warns.length===1&&/line 25: the query's `group: nope` names a field the rows never carry/.test(w.warns[0]||""),w.out);}

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


// ---- format 0.5: the theme block, rows and tone names
const CASES5=[
 ["lint-theme-unknown-key","a theme with a key it does not have",/line 11: a theme has no setting 'size' \(it takes base, paper, ink, accent, good, warn, bad, font, density\)/],
 ["lint-theme-bad-colour","a theme colour that is a name",/line 10: the theme's `accent: red` must be a hex colour, #rgb or #rrggbb/],
 ["lint-theme-bad-colour-function","a theme colour written as a function",/line 10: the theme's `accent: rgb\(0,0,0\)` must be a hex colour/],
 ["lint-theme-bad-base","a theme base that is not one of the four",/line 10: the theme's `base: sepia` is not one of paper, daylight, night, contrast/],
 ["lint-theme-bad-font","a theme font that is not one of the five",/line 10: the theme's `font: Comic Sans` is not one of default, serif, sans, mono, readable/],
 ["lint-theme-bad-density","a theme density that is not one of the three",/line 10: the theme's `density: tight` is not one of compact, comfortable, roomy/],
 ["lint-theme-not-kv","a theme line that is not key: value",/line 11: a theme line is written `key: value` \(found 'just some words'\)/],
 ["lint-theme-two","a second theme block",/line 13: a booklet has one theme block; this is a second/],
 ["lint-theme-in-module","a theme inside a module fence",/line 13: a theme belongs to the booklet, not to a module/],
 ["lint-row-end-alone","a row closed that was never opened",/line 13: a row is closed that was never opened/],
 ["lint-row-unclosed","a row never closed",/line 13: the row opened here runs into a module fence/],
 ["lint-tone-bad-name","a widget colour that is not a tone name",/line 16: the widget \^picker-data has the colour 'pink', which is not a tone name \(warm, green, amber, slate, teal\)/],
 ["lint-tone-not-string-or-pair","a widget colour that is neither a name nor a pair",/line 16: the widget \^picker-data has a colour that is neither a tone name/],
];
for(const [name,what,rx] of CASES5){
  const r=lint(path.join(FX,name+".md"));
  chk(`${what}: exactly one error`,r.status===1&&r.errors.length===1,r.errors.join(" | ")||r.out);
  chk(`${what}: the message names the rule and the place`,rx.test(r.errors[0]||""),r.errors[0]);
}
{const r=lint(path.join(FX,"lint-row-page-break.md"));
 chk("a row met by a page break: the row is reported at its opening line, and the later end as never opened",
   r.status===1&&r.errors.length===2&&/line 13: the row opened here runs into a page break/.test(r.errors[0])&&/line 25: a row is closed that was never opened/.test(r.errors[1]),r.out);
 const n=lint(path.join(FX,"lint-row-nested.md"));
 chk("a row inside a row: reported at the inner opening (and the end it leaves over)",
   n.status===1&&/line 17: a row opens inside a row \(rows do not nest\)/.test(n.errors[0]||"")&&n.errors.length===2,n.out);}
for(const [name,rx] of [["lint-row-empty",/line 13: this row is empty/],["lint-row-one-cell",/line 13: this row has one cell/],
    ["lint-theme-low-contrast",/line 9: the theme's `accent` leaves accent on paper at 1\.01:1, under 4\.5 to 1, so the renderer will use the base theme's accent instead/]]){
  const r=lint(path.join(FX,name+".md"));
  chk(`${name}: one warning naming the place, no error`,r.status===0&&r.errors.length===0&&r.warns.length===1&&rx.test(r.warns[0]||""),r.out);}
for(const name of ["lint-theme-ok","lint-row-ok","lint-tone-ok","lint-tone-hex-pair-ok","theme-and-rows.booklet"]){
  const r=lint(path.join(FX,name+".md"));
  chk(`${name} lints clean`,r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);}
{// a theme block needs no ^id, and one given is ignored
 const t=fs.readFileSync(path.join(FX,"lint-theme-ok.md"),"utf8").replace("font: serif\ndensity: roomy\n```","font: serif\ndensity: roomy\n```\n^look");
 const f=path.join(require("os").tmpdir(),"lint-theme-id-"+process.pid+".md");fs.writeFileSync(f,t);
 const r=lint(f);fs.unlinkSync(f);
 chk("a theme block with a ^id after it is fine",r.status===0&&/0 errors/.test(r.out),r.out);}
{// the registry's modules, copied, re-marked and linted: hex pairs and tone names both stay valid
 const reg=process.env.BOOKLET_REGISTRY||"/workspace/booklet-registry/modules";
 if(fs.existsSync(reg)){const tmp=fs.mkdtempSync(path.join(require("os").tmpdir(),"reg05-"));
   for(const n of fs.readdirSync(reg).filter(x=>/\.md$/.test(x)&&!/^readme/i.test(x))) fs.writeFileSync(path.join(tmp,n),fs.readFileSync(path.join(reg,n),"utf8").replace(/^booklet: 0\.4$/m,"booklet: 0.5"));
   const r=lint("--registry",...fs.readdirSync(tmp).map(n=>path.join(tmp,n)));
   chk("the registry's modules, copied and re-marked to 0.5, lint at 0 errors",r.status===0&&/ 0 errors · /.test(r.out),r.out.slice(-400));}}

{// a widget colour pair must be two hex colours: it is drawn into a style attribute
 const r=lint(path.join(FX,"lint-tone-pair-not-hex.md"));
 chk("a `tint` that is not a hex colour is an error",r.errors.some(l=>/not a hex colour/.test(l)),r.out);}

console.log(fails?`\n${fails} failed`:"\nlint checks passed");
process.exit(fails?1:0);
