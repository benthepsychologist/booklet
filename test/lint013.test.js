// Format 0.13, item v013-linter: the linter catches what the renderer refuses or drops, and says the fix.
// Each test/fixtures/lint13-*.md is a small clean booklet with ONE slip; this lints each and checks the finding (its
// kind, its line and its words), then asks the renderer about the same file where it reports the same slip, so the
// two tools stay in step (a mismatch of line or of meaning fails here). The clean fixtures must stay clean.
// Run: node test/lint013.test.js   (node and python3; nothing to install.)  LINT_BOOKLET=<path> tries another linter.
const fs=require("fs"),path=require("path"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const LINT=process.env.LINT_BOOKLET||path.join(R,"lint-booklet.py");
const FX=path.join(__dirname,"fixtures");
const P=require("./page.js");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const lint=(...a)=>{const r=spawnSync("python3",[LINT,...a],{encoding:"utf8"});
  const lines=r.stdout.split("\n");
  return {status:r.status,out:r.stdout,errors:lines.filter(l=>l.startsWith("ERROR")),warns:lines.filter(l=>l.startsWith("warn")),
    all:lines.filter(l=>/^(ERROR|warn)/.test(l))};};
const fx=n=>path.join(FX,n+".md");
const A=P.boot();
const renderer=n=>A.parseFile(fs.readFileSync(fx(n),"utf8"));
const lineOf=l=>{const m=/: line (\d+): /.exec(l||"");return m?+m[1]:0;};

/* [fixture, what, "ERROR"|"warn", line, words, (renderer's line or null for "it does not report this", its words)] */
const ONE=[
 // done-when 1: errors
 ["lint13-activity-no-id","an activity line with no id","ERROR",11,/an activity line needs an id; write `> \[!activity\|my-id\] Title`/,11,/this activity line has no id/],
 ["lint13-choice-no-options","a choice with no options and nothing under it","ERROR",13,/this choice question 'mood' has no options under it.*`- \[ \] Option`/,13,/this choice question has no options under it/],
 ["lint13-choice-plain-bullets","a choice whose options are plain bullets","ERROR",13,/no options under it.*the bullets under it are plain bullets, which a menu takes, not a choice/,13,/has no options under it/],
 ["lint13-multi-no-options","a multi with no options","ERROR",13,/this multi question 'felt' has no options under it/,13,/this multi question has no options/],
 ["lint13-scale-no-anchors","a scale with no anchors","ERROR",13,/this scale question 'energy' has no anchors under it.*numbered list/,13,/this scale question has no anchors/],
 ["lint13-scale-plain-bullets","a scale whose anchors are plain bullets","ERROR",13,/no anchors under it.*the bullets under it are plain bullets, and a scale's anchors are numbered/,13,/has no anchors under it/],
 ["lint13-scale-dup-anchors","a scale that repeats an anchor number","ERROR",13,/the scale 'energy' repeats anchor number 1; the number is the stored answer/,13,/this scale uses the anchor number 1 twice/],
 ["lint13-records-unknown-module","a records line naming a module the file does not have","warn",20,/the records line names 'gone-mod', which is no module of this file.*name the module these records belong to; if that module is gone, delete them/,20,/the records line names “gone-mod”/],
 ["lint13-records-no-percent","a records section not inside %%","warn",17,/the records section is not inside `%%` … `%%`; put the records region between `%%` lines.*so editors hide it/,null],
 // done-when 2: warnings
 ["lint13-dash-under-text","`---` straight under text","warn",16,/`---` straight under text makes that line a heading and is not a page break; write `\*\*\*`, or leave a blank line above it; for a heading, write `## …`/,null],
 ["lint13-hint-unfolded","a hint not folded","warn",15,/a hint that is not folded is drawn open, outside its question; write `> \[!hint\]-`/,null],
 ["lint13-solution-unfolded","a solution not folded","warn",15,/a solution that is not folded is drawn open.*write `> \[!solution\]-`/,null],
 ["lint13-hint-detached","a hint not directly under its question","warn",17,/this hint is not directly under a question, so it is drawn on its own/,null],
 ["lint13-menu-checked","`[x]` in a menu","warn",16,/a menu cannot mark a right answer; to have one, give the question its own task list \(`- \[x\] Mars`\) in place of `menu:`, or drop the `\[x\]`/,null],
 ["lint13-price-formula","a price that reads as a formula","warn",15,/`\$5 a month \(\$` reads as a formula.*write each dollar sign as `\\\$`/,null],
 ["lint13-tiles-no-value","tiles with no `value` when a field holds a number","warn",15,/the query's `as: tiles` has no `value:`.*`count` holds a number, so add `value: count`/,null],
 // done-when 3: what item 1's renderer reports
 ["lint13-records-prose","prose in the records region","warn",22,/this text sits inside the records region, where only records are read.*move it above the records/,22,/this is not a record this page reads/],
 ["lint13-records-callout","a callout in the records region","warn",22,/a `> \[!note\]` line inside the records region is not a record/,22,/this is not a record this page reads/],
 ["lint13-records-data-line","a data line in the records region","warn",22,/a `> \[!data\]` line inside the records region is not a record/,22,/this is not a record this page reads/],
 ["lint13-records-fence","a widget block in the records region","warn",22,/a `booklet widget` block inside the records region is not a record/,22,/this is not a record this page reads/],
 ["lint13-records-entry-no-ts","an entry without a ts","warn",22,/an entry in the `booklet entries walk` block has no `ts`.*give every entry a `ts`/,22,/this is not a record this page reads/],
 ["lint13-records-entries-no-items","an entries block with no items","warn",22,/the `booklet entries walk` block holds no `items` list/,22,/the entries record for “walk” holds no list of items/],
 ["lint13-record-outside","an answers block outside the records region","warn",15,/a `booklet answers` block outside the records region is not read/,15,/a “booklet answers” block belongs in the records region/],
 ["lint13-entries-outside","an entries block outside the records region","warn",15,/a `booklet entries` block outside the records region is not read/,15,/a “booklet entries” block belongs in the records region/],
 ["lint13-callout-unreadable","a `> [!` line the callout pattern cannot read (and it ends the notice above it)","warn",13,/this `> \[!` line cannot be read.*it is left as text, and it ends the callout above it/,13,/this “> \[!” line cannot be read/],
 ["lint13-design-after-records","design written after the records region","warn",27,/this comes after the records region, and a save moves it above the records/,null,/The design after the records is moved above them when saved/],
 ["lint13-list-indented-line","an indented line after an option list","warn",16,/the line after this list is indented, so the list ends there: put each option on one line/,null],
 ["lint13-indented-booklet-line","an indented Booklet line","warn",15,/a Booklet line starts at the left edge; this one is indented/,null],
 // done-when 4: messages
 ["lint13-lang-missing","a missing lang names the values","ERROR",0,/no `lang:`.*add `lang: en` \(or es, es-AR, fr/,null,/has no `lang:`/],
 ["lint13-image-scheme","the image error says a relative path","ERROR",15,/an image is linked by a relative path, never embedded or given another scheme/,null],
 ["lint13-query-no-from","a query with no from says or data block","ERROR",15,/a query needs `from:`, the activity, question or data block it shows/,null],
 ["lint13-icon-close","an unknown icon name offers a close spelling","ERROR",11,/`icon:compas` is not a name in Booklet's icon set.*did you mean `compass`\?/,11,/“compas” is not a name/],
];
for(const [name,what,kind,line,rx,rline,rrx] of ONE){
  const r=lint(fx(name)),got=(kind==="ERROR"?r.errors:r.warns);
  chk(`${what}: exactly one finding, a${kind==="ERROR"?"n error":" warning"}`,r.all.length===1&&got.length===1,r.all.join(" | ")||r.out);
  chk(`${what}: it names the line and says the fix`,lineOf(got[0])===line&&rx.test(got[0]||""),got[0]);
  chk(`${what}: ${kind==="ERROR"?"the file fails":"the build does not fail"}`,(r.status===1)===(kind==="ERROR"),String(r.status));
  if(rrx){const u=renderer(name),all=u.unread.concat(u.refused||[]);
    const hit=all.find(x=>rrx.test(x));
    chk(`${what}: the renderer reports it too`,!!hit,JSON.stringify(all));
    if(rline) chk(`${what}: and at the same line`,!!hit&&(String(hit).match(/^line (\d+):/)||[])[1]==String(rline),String(hit));}}
{const r=lint(fx("lint13-icon-none-close"));
 chk("an unknown icon with no close spelling offers none",r.errors.length===1&&/`icon:flower` is not a name in Booklet's icon set/.test(r.errors[0])&&!/did you mean/.test(r.errors[0]),r.out);
 const two=lint(fx("lint13-icon-close")).errors[0]||"";
 chk("and at most three are offered",(two.match(/`[a-z-]+`/g)||[]).length<=1+3);}

// ---- round 2: the review's cases
{const base=fs.readFileSync(fx("lint13-ok-base"),"utf8"),tmp=require("os").tmpdir();let k=0;
 const text=(body,h)=>{const f=path.join(tmp,"lint013-r2-"+process.pid+"-"+(++k)+".md");fs.writeFileSync(f,(h?h(base):base).replace("TEXT",body));const r=lint(f);fs.unlinkSync(f);return r;};
 for(const t of ["$7 + 5$","$3$","$2x$","$1 < 2$","$3 > 2 and 5$ is not a price"]){
   const r=text(t);chk("plain arithmetic is not a price: "+t,r.warns.filter(w=>/reads as a formula/.test(w)).length===(t.includes("and")?1:0),r.out);}
 chk("a price over two lines is quoted on one",/`\$5 a month \(\$`/.test(text("It costs $5 a\nmonth ($) here").warns[0]||"")&&!/\n/.test(text("It costs $5 a\nmonth ($) here").warns[0]||""));
 chk("a price inside a comment is not read",text("<!-- It costs $5 a month ($) -->").all.length===0);
 chk("a price in a question's title is read (titles are Markdown)",text("x",b=>b.replace("What did you notice?","Costs $5 a month ($) what?")).warns.length===1);
 const doc=m=>m;
 chk("the records-line message does not say `booklet booklet`",!/booklet booklet/.test(lint(fx("lint13-records-entries-no-items")).out)&&!/booklet booklet/.test(text("x",b=>b+"\n%%\n> [!records]\n\n```booklet answers\n[1]\n```\n%%\n").out));
 chk("`---` after a plain code fence is warned",text("```\ncode\n```\n---\n").warns.some(w=>/straight under text/.test(w)));
 chk("a bare %% line between text and --- changes nothing",text("A line\n%%\n---\n").warns.some(w=>/straight under text/.test(w)));
 chk("the ending of the callout is named only when a callout is above",!/ends the callout above/.test(text("\n> [!bad kind\n").warns[0]||"")&&/ends the callout above/.test(text("> [!hint]- h\n> body\n> [!bad kind\n").warns[0]||""),text("\n> [!bad kind\n").out);
 chk("`icon:Check` offers `check`, and `chart` offers chart-* before heart",/did you mean `check`/.test(text("x",b=>b.replace("walk repeat","walk repeat icon:Check")).errors[0]||"")&&/did you mean `chart-[a-z]+`, `chart-[a-z]+`, `chart-[a-z]+`\?/.test(text("x",b=>b.replace("walk repeat","walk repeat icon:chart")).errors[0]||""));
 chk("the no-options message says the list may sit one blank line below",/straight under the line or after one blank line/.test(lint(fx("lint13-choice-no-options")).errors[0]||""));
 chk("an entries block that names no activity is a warning, not an error",(r=>r.errors.length===0&&r.warns.some(w=>/`booklet entries` names no activity, so it is kept as written/.test(w)))(text("x",b=>b+"\n%%\n> [!records]\n\n```booklet entries\n{\"items\": []}\n```\n%%\n")));
 chk("a sync record is quiet in the region and warned outside it, and the renderer does not report it in the region",
   lint(fx("lint13-records-sync-ok")).all.length===0&&text("x",b=>b+"\n```booklet sync\n{\"a\":1}\n```\n").warns.some(w=>/booklet sync. block outside the records region/.test(w))&&renderer("lint13-records-sync-ok").unread.length===0);
 chk("a module with no id and no end line is reported as never closed too, as the renderer refuses it",lint(fx("lint13-module-no-id")).errors.length===2&&/line 9: a module line needs an id; write `> \[!module\|my-module\] Title`/.test(lint(fx("lint13-module-no-id")).errors[0])&&/line 9: this module line has no id/.test(renderer("lint13-module-no-id").unread[0]||"")&&/never closed/.test(lint(fx("lint13-module-no-id")).errors[1])&&renderer("lint13-module-no-id").refused.length===1);
 chk("a records line is checked in a one-activity file too",text("x",b=>b+"\n%%\n> [!records|ghost]\n%%\n").warns.some(w=>/the records line names 'ghost'/.test(w)));}

// ---- an invalid record is an error, and says why
{const f=path.join(require("os").tmpdir(),"lint013-json-"+process.pid+".md");
 fs.writeFileSync(f,fs.readFileSync(fx("lint13-records-ok"),"utf8").replace('{"items": [{"ts": "2026-09-21T09:00:00Z", "note": "a walk"}]}','{"items": [,]}'));
 const r=lint(f);fs.unlinkSync(f);
 chk("a record block that is not valid JSON stays an error, and says the page cannot use it",r.errors.length===1&&/not valid JSON.*cannot be read.*fix the comma or quote/.test(r.errors[0]),r.out);}

// ---- done-when 1: the renderer says so too, the three notices
{const un=n=>renderer(n).unread;
 chk("an activity line with no id: a notice, and the file still opens",renderer("lint13-activity-no-id").ok&&un("lint13-activity-no-id").some(x=>/line 11: this activity line has no id/.test(x)));
 chk("a module line with no id: a notice",un("lint13-module-no-id").some(x=>/line 9: this module line has no id/.test(x)));
 chk("a file with no activity line (one activity named by its title) is not told it has an activity with no id",!un("lint-query-plain-file").some(x=>/activity line has no id/.test(x)));}

// ---- what must stay quiet (no false alarms)
for(const n of ["lint13-choice-ok","lint13-records-ok","lint13-records-sync-ok","lint13-dash-ok","lint13-hint-ok","lint13-price-ok","lint13-tiles-ok"]){
  const r=lint(fx(n));chk(`${n} lints clean`,r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);}

// ---- findings print in line order, errors marked
{const r=lint(fx("lint13-line-order")),at=r.all.map(lineOf);
 chk("a warning on line 15 prints before the errors on lines 17 and 19, errors marked ERROR",r.all.length===3&&at.join()==="15,17,19"&&r.all[0].startsWith("warn")&&r.all[1].startsWith("ERROR")&&r.all[2].startsWith("ERROR"),r.out);}

// ---- the price check against real maths: the tides example's, and a formula that starts with a digit but carries maths marks
{const t=lint(path.join(R,"examples","how-tides-work.booklet.md"));
 chk("the tides example's maths ($R = h_{high} - h_{low}$) is not a price",t.status===0&&/0 errors · 0 warnings/.test(t.out),t.out);
 const f=path.join(require("os").tmpdir(),"lint013-math-"+process.pid+".md");
 fs.writeFileSync(f,fs.readFileSync(fx("lint13-ok-base"),"utf8").replace("TEXT","Work out $2\\pi r$, then $3^2 + 4^2 = 5^2$, and $n_1 = 2$, but not $5 a month ($) here."));
 const m=lint(f);fs.unlinkSync(f);
 chk("maths that starts with a digit but carries maths marks is left alone; the price beside it is the one warning",m.warns.length===1&&/`\$5 a month \(\$`/.test(m.warns[0]),m.out);}

// ---- the examples and the real SKILL stay as they were
{const e=lint();chk("the repository's own files lint at 0 errors and 0 warnings",e.status===0&&/ 0 errors · 0 warnings/.test(e.out),e.out.slice(-300));
 const b=fs.readFileSync(path.join(R,"examples","project-board.booklet.md"),"utf8");
 chk("examples/project-board has its records inside %% … %%",/^%%\n> \[!records\]/m.test(b)&&/\n%%\n?$/.test(b));}

console.log(fails?`\n${fails} failed`:"\nlint 0.13 checks passed");
process.exit(fails?1:0);
