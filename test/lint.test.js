// The linter's own rules. Each fixture under test/fixtures/lint-*.md is
// `lint-ok.md` (a clean module) with one change, written to break exactly one
// rule; this lints each and checks that the ERROR line names the rule and says
// where. The clean fixture, every file the repo ships and the blind-built
// booklets must stay clean, so a new rule cannot buy its catch with a false alarm.
// Run: node test/lint.test.js   (node and python3; nothing to install)
// LINT_BOOKLET=<path> runs the same checks against another copy of the linter.
const fs=require("fs"),path=require("path"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const LINT=process.env.LINT_BOOKLET||path.join(R,"lint-booklet.py");
const FX=path.join(__dirname,"fixtures");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const lint=(...a)=>{const r=spawnSync("python3",[LINT,...a],{encoding:"utf8"});
  return {status:r.status,out:r.stdout,errors:r.stdout.split("\n").filter(l=>l.startsWith("ERROR"))};};

// ---- the clean one, and the repo, stay clean
{const ok=lint(path.join(FX,"lint-ok.md"));
 chk("lint-ok.md (groups in groups, wording in en and fr) lints clean",ok.status===0&&/0 errors · 0 warnings/.test(ok.out),ok.out);
 const repo=lint();
 // the one warning allowed: a mensio-* file lacking a registry language. Those files
 // are generated upstream, where it has to be fixed (see the registry section below)
 const others=repo.out.split("\n").filter(l=>l.startsWith("warn")&&!/^warn  (modules|widgets)\/mensio-[\w-]+\.md: registry languages: /.test(l));
 chk("the repo's own files lint at 0 errors, and warn only that mensio-* files lack a registry language",
   repo.status===0&&/ 0 errors · /.test(repo.out)&&others.length===0,others.join(" | ")||repo.out.slice(-300));
 const blind=fs.readdirSync(FX).filter(n=>/^skill-.*\.booklet\.md$/.test(n)).map(n=>path.join(FX,n));
 const b=lint(...blind);
 chk("the three booklets built blind from SKILL.md have no errors",blind.length===3&&b.errors.length===0,b.errors.join(" | "));}

// ---- defect 1: a duplicate block id inside a group, with both places named
{const d=lint(path.join(FX,"lint-dup-id-in-group.md"));
 chk("a block id repeated in a group is an error",d.status===1&&d.errors.length===1,d.out);
 chk("and names the id, the first place and the second",
   /two blocks share the id 'lw-main\.a': first at the top level, again inside group 'g'/.test(d.errors[0]||""),d.errors[0]);
 const n=lint(path.join(FX,"lint-dup-id-nested-groups.md"));
 chk("a block id repeated in a group inside a group is an error naming both groups",
   n.errors.length===1&&/id 'lw-main\.b': first inside group 'g', again inside group 'g' > group 'inner'/.test(n.errors[0]),n.out);
 const p=lint(path.join(FX,"lint-dup-id-pages.md"));
 chk("a block id repeated on another page, in a group, is an error naming both pages",
   p.errors.length===1&&/id 'lw-main\.intro': first on page 'one', again inside group 'g' on page 'two'/.test(p.errors[0]),p.out);}

// ---- defect 2: a question with no wording
const CASES=[
 ["lint-no-wording","a question block with no wording in any language",
   /block 'lw-main\.nw' asks the question lw\.nw with no wording in en, fr.*worded in no language/],
 ["lint-wording-missing-language","a question worded in en but not in a declared language",
   /block 'lw-main\.a' asks the question lw\.a with no wording in fr: copy\.<language>\.lw\.f\.a.*worded in en/],
 ["lint-copy-ref-folded","a folded block whose copy key is missing",
   /block 'lw-main\.g' names the copy entry 'lw\.older', which the module's `copy` does not hold for en, fr/],
 ["lint-copy-ref-list","a list block whose copy key is missing",
   /block 'lw-main\.l' names the copy entry 'lw\.lists\.nope'/],
 ["lint-label-missing-language","a list label missing a declared language",
   /list block 'lw-main\.l' has a `label` with no wording in fr/],
 // ---- defect 3: other rules SPEC.md states
 ["lint-nested-unknown-type","an unknown block type inside a group",/block 'lw-main\.z' has type 'quiz'/],
 ["lint-nested-no-id","a block with no id inside a group",/every block in 'lw-main' needs a string id \(inside group 'g'\)/],
 ["lint-image-no-alt","an image with no alt",/image block 'lw-main\.pic' needs an `alt`/],
 ["lint-image-embedded","an image that is embedded, not linked",/image block 'lw-main\.pic' needs a `src` that is an http\(s\) or relative address/],
 ["lint-heading-no-text","a heading with no text",/heading block 'lw-main\.h' has no `text`/],
 ["lint-deflist-item","a deflist item with no body",/deflist block 'lw-main\.defs' needs `items`/],
 ["lint-group-empty","a group with no blocks",/group block 'lw-main\.e' needs `blocks`/],
 ["lint-didlog-of","a didlog whose of is not a list",/didlog 'lw-main\.dl': `of` must be a list of block ids/],
 ["lint-activity-order","an activity with a non-numeric display.order",/activity 'lw-main' has a non-numeric display\.order/],
 ["lint-module-menus","a module menu that is not a list of strings",/module 'local\/english-daily-reflection': menu 'picks' must be a list of strings/],
 ["lint-question-shape","a question that is not [scope, key]",/block 'lw-main\.q9' of type text must name its question as \[scope, key\]/],
 ["lint-two-person","a second person block",/the record has 2 'person' blocks; a file carries exactly one/],
 ["lint-two-entries","two entries blocks for one activity",/two 'entries' blocks for the activity 'er-day'/],
];
for(const [name,what,rx] of CASES){
  const r=lint(path.join(FX,name+".md"));
  chk(`${what}: exactly one error`,r.status===1&&r.errors.length===1,r.errors.join(" | ")||r.out);
  chk(`${what}: the message names the rule and the place`,rx.test(r.errors[0]||""),r.errors[0]);
  chk(`${what}: the message carries the file`,(r.errors[0]||"").includes(name+".md"),r.errors[0]);
}

// ---- rules the linter already had still hold (a regression guard on the rewrite)
{const t=fs.readFileSync(path.join(FX,"lint-ok.md"),"utf8");
 const tmp=path.join(require("os").tmpdir(),"lint-guard-"+process.pid+".md");
 const cases=[
  ["two blocks with one id at the top level",t.replace('"id": "a",','"id": "intro",'),/two blocks share the id 'lw-main\.intro': first at the top level, again at the top level/],
  ["a block type that is not known",t.replace('"type": "prose"','"type": "quiz"'),/has type 'quiz'/],
  ["a folded block with no name",t.replace(/"copy": "lw\.more",/,""),/is folded but unnamed/]];
 for(const [what,text,rx] of cases){fs.writeFileSync(tmp,text);const r=lint(tmp);
   chk("still reported: "+what,r.status===1&&rx.test(r.errors.join("\n")),r.errors.join(" | "));}
 fs.rmSync(tmp,{force:true});}

// ---- what the record now carries: drafts of every activity, empty rows and areas, board answers in `fields`
// `lint()` reports ERROR lines; warnings are read here from the `warn ` lines.
const warnsOf=r=>r.out.split("\n").filter(l=>l.startsWith("warn"));
{const clean=lint(path.join(FX,"lint-empty-board.md"));
 chk("a preset whose record keeps empty Now rows, empty areas and empty drafts is clean",
   clean.status===0&&/ 0 errors · 0 warnings/.test(clean.out),clean.out);
 const row=lint(path.join(FX,"lint-board-row.md"));
 chk("a Now row with text in it is still content: exactly one error",row.status===1&&row.errors.length===1&&/a preset must ship empty: its board block has content/.test(row.errors[0]),row.out);
 const area=lint(path.join(FX,"lint-board-area.md"));
 chk("an area with something written in it is content: exactly one error",area.status===1&&area.errors.length===1&&/a preset must ship empty: its board block has content/.test(area.errors[0]),area.out);
 const dr=lint(path.join(FX,"lint-drafts-activities.md"));
 chk("a preset with a draft in drafts.activities is an error, and it names the activity",
   dr.status===1&&dr.errors.length===1&&/a preset must ship empty: its drafts block carries a draft of the activity 'er-day'/.test(dr.errors[0]),dr.out);
 const shapes=[
  ["lint-drafts-shape-list","drafts.activities that is a list",/`activities` in the drafts block must be an object keyed by activity id \(found a list\)/],
  ["lint-drafts-shape-builtin","a built-in id under drafts.activities",/`activities` in the drafts block holds 'today', which is a built-in activity; `today` and `checkin` are keys of the block itself/],
  ["lint-drafts-shape-value","a draft in drafts.activities that is not an object",/`activities\.er-day` in the drafts block must be an object keyed by field id \(found a string\)/]];
 for(const [n,what,rx] of shapes){const r=lint(path.join(FX,n+".md"));
   chk(`${what}: exactly one error, naming the rule`,r.status===1&&r.errors.length===1&&rx.test(r.errors[0]),r.out);}
 // controls built from the clean fixture: content in a built-in draft is caught, blanks are not
 const base=fs.readFileSync(path.join(FX,"lint-empty-board.md"),"utf8");
 const tmp=path.join(require("os").tmpdir(),"lint-drafts-"+process.pid+".md");
 const withDrafts=d=>{fs.writeFileSync(tmp,base.replace('{ "block": "drafts", "today": null, "checkin": null }',d));return lint(tmp);};
 let r=withDrafts('{ "block": "drafts", "today": { "extra": "half a thought" }, "checkin": null }');
 chk("a preset's `today` draft with text in it is an error",r.errors.length===1&&/its drafts block carries a draft of 'today'/.test(r.errors[0]),r.out);
 r=withDrafts('{ "block": "drafts", "today": { "extra": "", "needs": [] }, "checkin": { "other": "" }, "activities": {} }');
 chk("blank built-in drafts and an empty `activities` are not content",r.status===0&&r.errors.length===0,r.out);
 fs.rmSync(tmp,{force:true});}

// a board or a guide keeps its answers in `fields`, under the key each block owns; some keys are not safe to use
{const CASES2=[
  ["lint-board-key-reserved","a board block owning `note`",/board activity 'lw-main': block 'lw-main\.note' keeps its answer under the key 'note', which the person's own record uses/],
  ["lint-guide-key-reserved","a guide block owning `today`",/guide activity 'lw-main': block 'lw-main\.today' keeps its answer under the key 'today', which the person's own record uses/],
  ["lint-board-key-cardboard","a board block owning a card board's field",/board activity 'lw-main': block 'lw-main\.people' keeps its answer under the key 'people', which a card-board widget in this file already holds/]];
 for(const [n,what,rx] of CASES2){const r=lint(path.join(FX,n+".md")),w=warnsOf(r);
   chk(`${what}: one warning, no error (it works, but the answers would collide)`,r.status===0&&r.errors.length===0&&w.length===1&&rx.test(w[0]),r.out);
   chk(`${what}: the warning carries the file`,(w[0]||"").includes(n+".md"),w[0]);}
 const e=lint(path.join(FX,"lint-entry-key-fine.md"));
 chk("control: an entry activity's block called `note` is fine, its answers live in its entries",e.status===0&&/ 0 errors · 0 warnings/.test(e.out),e.out);}

// ---- this repository's registry content is set up in en, fr and es
// A rule of this registry, not of the format: a warning, never an error, and only
// for the files under modules/ and widgets/ (or any file named after --registry).
{const REG=/: registry languages: /;
 const miss=lint("--registry",path.join(FX,"lint-registry-missing-es.md")),w=warnsOf(miss);
 chk("registry content missing es: one warning, no error",
   miss.status===0&&miss.errors.length===0&&w.length===1&&REG.test(w[0]||""),miss.out);
 chk("the warning names the file, the missing language and each place",
   /lint-registry-missing-es\.md: registry languages: 2 per-language value\(s\) have no 'es'.*module fixture\/registry: title; module fixture\/registry: copy\.es\.rg\.f\.a\[1\]$/.test(w[0]||""),w[0]);
 const three=lint("--registry",path.join(FX,"lint-registry-three.md"));
 chk("the same module in en, fr and es is clean as registry content",
   three.status===0&&/ 0 errors · 0 warnings/.test(three.out),three.out);
 const fixture=lint(path.join(FX,"lint-registry-missing-es.md"));
 chk("control: a test fixture is not registry content, so without --registry the same file is clean",
   fixture.status===0&&/ 0 errors · 0 warnings/.test(fixture.out),fixture.out);
 const solo=lint(path.join(FX,"skill-registro-de-agua.booklet.md"),path.join(FX,"skill-english-journal.booklet.md"),path.join(R,"examples","end-of-day.md"));
 chk("control: single-language booklets and the example booklet get no registry warning",
   solo.errors.length===0&&!warnsOf(solo).some(l=>REG.test(l)),solo.out);
 // The registry's modules are version 2 now, one language (English) per file
 // by the format's own design (SPEC.md §9) — there is no "en, fr and es
 // everywhere" to check for them anymore (Ben, 2026-09-28: "we took
 // multi-lingual support out completely in the new format"). The three
 // widgets/ files are still version 1 and still carry that promise.
 const widgetsShipped=["widgets/desk-check.md","widgets/effort-impact.md","widgets/project-board.md"];
 const s=lint(...widgetsShipped.map(n=>path.join(R,n)));
 chk("the three widgets are clean: en, fr and es everywhere",
   s.status===0&&/3 booklet files checked · 0 errors · 0 warnings/.test(s.out),s.out);
 const reg=lint(...fs.readdirSync(path.join(R,"modules")).filter(n=>n.endsWith(".md")).map(n=>path.join(R,"modules",n)));
 chk("every current registry module lints clean as version 2",reg.status===0&&/0 errors/.test(reg.out),reg.out);}

// ---- script in a widget's SVG: a reader removes it before drawing, and the
// linter says so before the file is shared. desk-check.md with one shape swapped.
{const t=fs.readFileSync(path.join(R,"widgets","desk-check.md"),"utf8");
 const desk="<rect class='rg' data-r='screen' x='60' y='12' width='80' height='50' rx='4'/>";
 const tmp=path.join(require("os").tmpdir(),"lint-svg-"+process.pid+".md");
 const as=svg=>{if(!t.includes(desk)) throw new Error("desk-check.md changed: the screen shape is gone");
   fs.writeFileSync(tmp,t.replace(desk,svg));return lint(tmp);};
 const hostile=[
  ["an onerror on an <image>",`<image href='x' onerror='go()'/>${desk}`,/figure 'desk' carries script \(event handler onerror\)/],
  ["a handler written in capitals",`<g OnLoad='go()'>${desk}</g>`,/\(event handler onload\)/],
  ["a handler after a slash, with no space",`<g/onclick='go()'>${desk}</g>`,/\(event handler onclick\)/],
  ["a <script> element",`<script>go()</script>${desk}`,/\(a <script> element\)/],
  ["a javascript: link",`<a href='javascript:go()'>${desk}</a>`,/\(a javascript: URL\)/],
  ["a javascript: URL entity-encoded and split by a tab",`<a href='&#106;ava&#x09;script&colon;go()'>${desk}</a>`,/\(a javascript: URL\)/],
  ["an animation writing a javascript: URL into a link",`<a><set attributeName='href' to='javascript:go()'/>${desk}</a>`,/\(a javascript: URL\)/]];
 for(const [what,svg,rx] of hostile){const r=as(svg);
   chk("script in a figure is one error naming the widget and figure: "+what,
     r.status===1&&r.errors.length===1&&rx.test(r.errors[0])&&/widget 'example\/desk-check': figure 'desk'/.test(r.errors[0]),
     r.errors.join(" | ")||r.out);}
 const benign=as(`<g class='on' data-on='1' aria-label='turned on = off'><title>Hold on: onward</title>${desk}</g>`);
 chk("an SVG that only says 'on' (a class, a data-on, words) is not script",benign.status===0&&benign.errors.length===0,benign.out);
 fs.rmSync(tmp,{force:true});}

console.log(fails?`\n${fails} failed`:"\nlint checks passed");
process.exit(fails?1:0);
