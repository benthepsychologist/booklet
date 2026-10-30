// Format 0.17, lane S: the linter checks what format 0.17 adds (SPEC.md section 3, "Pages"; section 2, `description:`; section 3,
// "Kept entries, folded"; section 8, design after the records). Each case is a small file made here with ONE slip, linted, and the
// finding is checked by its kind (error or warning), its line and its words; the clean files must stay clean, so a new check
// cannot buy its catch with a false alarm. Nothing here is a real person's or a real booklet's.
// Run: node test/lint017.test.js   (node and python3; nothing to install.)  LINT_BOOKLET=<path> tries another linter.
const fs=require("fs"),path=require("path"),os=require("os"),{spawnSync}=require("child_process");
const R=path.join(__dirname,"..");
const LINT=process.env.LINT_BOOKLET||path.join(R,"lint-booklet.py");
let fails=0;const chk=(n,ok,d)=>{if(!ok)fails++;console.log((ok?"  ok    ":"  FAIL  ")+n+(d&&!ok?"   → "+d:""));};
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"lint017-"));let k=0;
const lint=(text,name)=>{const f=path.join(tmp,(name||"f"+(++k))+".md");fs.writeFileSync(f,text);
  const r=spawnSync("python3",[LINT,f],{encoding:"utf8"}),lines=r.stdout.split("\n");
  return {status:r.status,out:r.stdout,errors:lines.filter(l=>l.startsWith("ERROR")),warns:lines.filter(l=>l.startsWith("warn"))};};
const FM='---\nbooklet: "0.17"\ntitle: Lint fixture\nlang: en\n---\n\n';
// a file of one activity with an optional body; `n` is the line the body starts on (the front matter is 6 lines)
const ACT=(body,head="> [!activity|a] Notes\n\n")=>FM+head+body;
const one=(what,r,kind,line,rx)=>{const got=kind==="ERROR"?r.errors:r.warns;
  chk(`${what}: exactly one finding, ${kind==="ERROR"?"an error":"a warning"}`,got.length===1&&r.errors.length+r.warns.length===1,r.out);
  chk(`${what}: it names line ${line} and says the fix`,new RegExp(": line "+line+": ").test(got[0]||"")&&rx.test(got[0]||""),got[0]);
  chk(`${what}: ${kind==="ERROR"?"the file fails":"the build does not fail"}`,(r.status===1)===(kind==="ERROR"),String(r.status));};
const clean=(what,r)=>chk(what,r.status===0&&/0 errors · 0 warnings/.test(r.out),r.out);

// ---- the marker
{const m=spawnSync("python3",[LINT,"--marker"],{encoding:"utf8"});
 chk("--marker prints the 0.17 marker, quoted",m.status===0&&m.stdout==='booklet: "0.17"\n',JSON.stringify(m.stdout));
 const o=lint(FM.replace('"0.17"','"0.16"')+"> [!activity|a] A\n\n");
 chk("a file marked 0.16 is checked as 0.17, with one warning that says so",o.status===0&&o.warns.length===1&&/this file says booklet: 0\.16; the current format is 0\.17, and it is checked as 0\.17/.test(o.warns[0]),o.out);}

// ---- point 1: the page line
const WIKI=`> [!activity|check-in repeat] Check in

Notice, name, keep.

> [!tab|wiki] Learn

How these pages fit together.

> [!page|map icon:footprints] The body map

Where it shows up.

> [!page|parent:map] Choosing a place

Pick one spot.

> [!page|parent:map] Words for what you notice

***

More words.

> [!page|grid icon:layout-grid] The feelings grid

> [!page|parent:grid] The two axes

First part.

***

Second part.

> [!page] Thoughts as headlines

> [!tab|quiz] Check in

> [!page] Your body

> [!text|body] Where is it?

> [!page] Your mind

> [!text|mind] What is it saying?
`;
clean("a wiki tab with pages, a page with no written id and a parent, parts and a quiz tab of two pages lints clean",lint(FM+WIKI));
clean("a file with no activity line is one activity, and page lines are its pages",lint(FM+"The words before the first page are the first page.\n\n> [!page|a] A\n\n> [!page|parent:a] B\n"));
clean("pages in an activity with no tab line lint clean",lint(ACT("> [!page|a] A\n\n> [!page|b parent:a] B\n\n> [!page|c] C\n")));
{const r=lint(ACT("> [!page|parent:choosing-a-place] Kid\n\n> [!page|parent:map] Choosing a place\n\n> [!page|map] The map\n"));
 chk("a page with no written id has its title as its id, so a parent: may name it (even from above it)",r.status===0&&r.warns.length===0,r.out);}
{const r=lint(ACT("> [!page|parent:map] Choosing a place\n"));
 one("`parent:` first on a page line is a setting and the line has no written id",r,"warn",9,/`parent:map` is not a page of this tab, so 'choosing-a-place' sits at the top of the tab's tree/);}
{const r=lint(ACT("> [!activity|parent:b] B\n"));
 chk("the `:` rule holds for every kind: a first word with a colon on an activity line is a setting, so the line has no id (an error), and the setting is named",
   r.errors.length===2&&r.errors.some(e=>/line 9: an activity line needs an id/.test(e))&&r.errors.some(e=>/line 9: an activity line takes no `parent:` setting/.test(e))&&r.warns.length===0,r.out);}

// ---- where a page line may stand
one("a page line in the booklet's opening",lint(FM+"> [!page|a] A\n\n> [!activity|x] X\n"),"ERROR",7,/a page line belongs inside an activity.*outside every activity, so a renderer ignores it/);
one("a page line in a module's opening",lint(FM+"> [!module|m] M\n\n> [!page|a] A\n\n> [!activity|x] X\n\n> [!module|m end] End\n"),"ERROR",9,/in a module's opening, so a renderer ignores it/);
one("a page line after its module's end",lint(FM+"> [!module|m] M\n\n> [!activity|x] X\n\n> [!module|m end] End\n\n> [!page|a] A\n"),"ERROR",13,/outside every activity/);
{const r=lint(ACT("Opening words.\n\n> [!page|a] A\n\n> [!tab|t] T\n\nWords.\n"));
 one("a page line before an activity's first tab line (the activity's opening)",r,"ERROR",11,/before the activity's first tab line stands in the activity's opening.*no page of any tab/);}
{const r=lint(ACT("> [!tab|t] T\n\n> [!page|a] A\n\n> [!tab|u] U\n\n> [!page|b] B\n"));
 chk("a page line below a tab line is that tab's, even in an activity whose opening has none",r.errors.length===0&&r.warns.length===0,r.out);}
one("a page line inside a group",lint(ACT("> [!group] G\n> > [!page|a] A\n")),"ERROR",10,/a `\[!page\]` line cannot go inside a group/);
one("a page line inside a note is its text, not a page",lint(ACT("> [!note] N\n> > [!page|a] A\n")),"warn",10,/a `\[!page\]` line inside a `\[!note\]` is drawn as text, not read/);
one("a page line inside an open row",lint(ACT("> [!row]\n\n### One\n\n> [!page|a] A\n\n### Two\n\n> [!row|end]\n")),"ERROR",13,/a page line cannot go inside a row.*row opened on line 9/);
{const r=lint(ACT("> [!page|a] A\n\n> [!data] Data\n\n> [!page|b] B\n"));
 one("a page line in a data section",r,"warn",13,/a page line in a data section is not read/);}

// ---- ids
one("two pages with one written id in a tab",lint(ACT("> [!page|g] One\n\n> [!page|g] Two\n")),"ERROR",11,/this page's id is 'g', the same as the page on line 9 in this tab.*numbers this one/);
one("two pages whose titles make one id",lint(ACT("> [!page] The Map\n\n> [!page] the map!\n")),"ERROR",11,/this page's id is 'the-map', the same as the page on line 9/);
clean("two pages in two tabs may share an id, and a page may share an id with a question",lint(ACT("> [!tab|t] T\n\n> [!page|g] One\n\n> [!tab|u] U\n\n> [!page|g] Two\n\n> [!text|g] Q\n")));
{const r=lint(ACT("> [!page] 日本語\n\n> [!page|page-1] One\n"));
 one("a title that leaves nothing gives `page-` and its place, which can clash with a written id",r,"ERROR",11,/this page's id is 'page-1'/);}
one("a written id that is not letters, digits and dashes",lint(ACT("> [!page|my_id] Title\n")),"ERROR",9,/the page id 'my_id' may hold only letters, digits and dashes/);

// ---- parent:
one("a parent: that names nothing",lint(ACT("> [!page|a] A\n\n> [!page|b parent:nobody] B\n")),"warn",11,/`parent:nobody` is not a page of this tab, so 'b' sits at the top of the tab's tree/);
one("a parent: that names a page of another tab of the activity",lint(ACT("> [!tab|t] T\n\n> [!page|a] A\n\n> [!tab|u] U\n\n> [!page|b parent:a] B\n")),"warn",15,/not a page of this tab.*a page of another tab has that id/);
{const r=lint(ACT("> [!page|a] A\n\n> [!page|b parent:a] B\n\n> [!page|c parent:b] C\n\n> [!page|d parent:b] D\n"));
 clean("a tree three deep with two children lints clean",r);}
one("a page that is its own parent",lint(ACT("> [!page|a parent:a] A\n")),"warn",9,/`parent:a` loops back to 'a' \(it is its own ancestor\), so it is drawn once, at the top/);
{const r=lint(ACT("> [!page|a parent:b] A\n\n> [!page|b parent:a] B\n\n> [!page|c] C\n"));
 chk("a cycle is a warning, one for each page in it, and the page outside it is not named",r.status===0&&r.warns.length===2&&r.warns.every(w=>/loops back/.test(w))&&!r.warns.some(w=>/'c'/.test(w)),r.out);}
{const r=lint(ACT("> [!page|a] A\n\n> [!page|b parent:no_way] B\n"));
 chk("a parent: with an id that is not an id is an error on its line (and it names no page, so a warning too)",r.status===1&&r.errors.length===1&&/: line 11: `parent:no_way` must be a page id/.test(r.errors[0])&&r.warns.length===1,r.out);}
{const r=lint(ACT("> [!page|g] One\n\n> [!page|g parent:nobody] Two\n\n> [!page|k parent:g] Kid\n"));
 chk("of two pages with one id the first is the parent: a child of g is not unnamed, and only the second g's own parent: is never read",
   r.errors.length===1&&/this page's id is 'g'/.test(r.errors[0])&&r.warns.length===0,r.out);}
// The time limits below are for a quadratic or stack-blowing linter, which takes minutes or fails outright on these sizes; they are 15 s because a slow CI runner takes several times the ~1 s of a quiet box.
{const N=10000,chain="> [!tab|t] T\n\n"+Array.from({length:N},(_,i)=>"> [!page|p"+i+(i?" parent:p"+(i-1):"")+"] P"+i+"\n\n").join("");
 const t0=Date.now(),r=lint(ACT(chain)),dt=Date.now()-t0;
 chk("a chain of 10,000 pages each under the one before is walked in under 15 seconds, with nothing to say",r.status===0&&dt<15000&&/0 errors · 0 warnings/.test(r.out),dt+"ms "+r.out.slice(-120));
 const loopy=ACT(Array.from({length:3000},(_,i)=>"> [!page|p"+i+" parent:p"+((i+1)%3000)+"] P"+i+"\n\n").join(""));
 const t1=Date.now(),r2=lint(loopy);
 chk("a loop 3,000 pages long is reported once per page, fast",r2.status===0&&(r2.out.match(/loops back/g)||[]).length===3000&&Date.now()-t1<15000,String(Date.now()-t1));}

// ---- the page line's settings
one("a setting a page does not take: hidden",lint(ACT("> [!page|a hidden] A\n")),"ERROR",9,/a page line takes no `hidden` setting \(it takes `icon:`, `parent:`\)/);
one("a setting a page does not take: tab:",lint(ACT("> [!page|a tab:t] A\n")),"ERROR",9,/a page line takes no `tab:` setting/);
one("a setting a page does not take: repeat",lint(ACT("> [!page|a repeat] A\n")),"ERROR",9,/a page line takes no `repeat` setting/);
one("a setting a page does not take: status:",lint(ACT("> [!page|a status:off] A\n")),"ERROR",9,/a page line takes no `status:` setting/);
one("an icon: outside the set on a page",lint(ACT("> [!page|a icon:compas] A\n")),"ERROR",9,/`icon:compas` is not a name in Booklet's icon set.*did you mean `compass`/);
one("a fold marker on a page line",lint(ACT("> [!page|a]- A\n")),"warn",9,/a fold marker \(`-`\) means nothing on a page line/);
one("a page line with no title",lint(ACT("> [!page|a]\n")),"warn",9,/this page has no title, so it shows its id/);
{const r=lint(ACT("> [!page|a] A\n> The page's first words, as `>` lines.\n\n- a list\n- directly under it\n"));
 clean("`>` lines and a list straight under a page line are its first prose, and read clean",r);}

// ---- `parent:` on an activity line: a page line takes it, an activity line does not (an error, as for any setting a kind does not take)
one("`parent:` on an activity line",lint(ACT("> [!activity|b parent:a repeat] B\n")),"ERROR",9,/an activity line takes no `parent:` setting \(it takes /);
{const r=lint(ACT("> [!activity|b parent:a repeat] B\n\n> [!activity|c parent:b] C\n"));
 chk("and each activity line that has one is an error, whatever the parent is (a missing parent or a loop is not checked: the setting is not read)",
   r.status===1&&r.errors.length===2&&r.errors.every(w=>/an activity line takes no `parent:` setting/.test(w)),r.out);}
{const r=lint(ACT("> [!activity|b parent:no_way] B\n"));
 chk("an activity's parent: is an error even when its value is not an id (and no second finding for the value)",r.status===1&&r.errors.length===1&&r.warns.length===0,r.out);}

// ---- the fold mark
clean("`entries:folded` on a repeat activity lints clean",lint(FM+"> [!activity|a repeat daily entries:folded] A\n\n> [!text|q] Q\n"));
one("`entries:` with another value",lint(FM+"> [!activity|a repeat entries:open] A\n"),"ERROR",7,/`entries:open` is not a setting a line takes \(only `entries:folded`/);
one("`entries:folded` on an activity that keeps no entries",lint(FM+"> [!activity|a entries:folded] A\n"),"warn",7,/folds the list of kept entries, and this activity keeps none/);
one("`entries:` on a question",lint(ACT("> [!text|q entries:folded] Q\n")),"ERROR",9,/a text line takes no `entries:` setting/);

// ---- the description key
clean("a one-line description in the front matter lints clean",lint(FM.replace("lang: en\n",'lang: en\ndescription: "A short reading, then a check."\n')+"> [!activity|a] A\n"));
{const r=lint(FM.replace("lang: en\n","lang: en\ndescription:\n")+"> [!activity|a] A\n");
 chk("an empty description is a warning that says to write it on one line or leave the key out",r.status===0&&r.warns.length===1&&/`description:` is empty or starts a multi-line value/.test(r.warns[0]),r.out);}
{const r=lint(FM.replace("lang: en\n","lang: en\ndescription: >\n  folded text\n")+"> [!activity|a] A\n");
 chk("a block-scalar description (`>`) is a warning",r.status===0&&r.warns.length===1&&/`description:`/.test(r.warns[0]),r.out);}

// ---- point 2: design after the records
const REC='\n%%\n> [!records] App record\n\n```booklet answers\n{"q": "x"}\n```\n%%\n';
{const r=lint(FM+"> [!activity|a] A\n\n> [!text|q] Q\n"+REC+"\n> [!activity|b] B\n\n> [!text|r] R\n");
 chk("design after the records is one warning, with what it holds, and says a save leaves it where it is",
   r.status===0&&r.errors.length===0&&r.warns.length===1&&/line 19: this comes after the records region\. It is read as design \(it holds 1 activity line, 1 question line\); a save leaves it where it is, after the records/.test(r.warns[0]),r.out);}
{const r=lint(FM+"> [!activity|a] A\n"+REC+"\n```text\nnever closed\n");
 chk("design after the records that ends inside a code fence that never closes is still an error, and the warning says where it ends",
   r.status===1&&r.errors.length===1&&/a fence is opened and never closed/.test(r.errors[0])&&r.warns.length===1&&/ends inside a code fence that is never closed/.test(r.warns[0]),r.out);}
{const r=lint(FM+"> [!activity|a] A\n"+REC+"\nA note after the records.\n");
 chk("prose after the records is reported as holding no Booklet line",r.warns.length===1&&/\(it holds no Booklet line\)/.test(r.warns[0]),r.out);}
{const r=lint(FM+"> [!activity|a] A\n"+REC+"\nBetween.\n"+REC+"\nAfter.\n");
 chk("with two records regions and design between them, the warning says a save moves the design above the regions",
   r.warns.length===1&&/a save moves it, and the design between the regions, above the regions \(the file has more than one\)/.test(r.warns[0]),r.out);}
clean("a file with its records last, as a save has always written it, is still clean",lint(FM+"> [!activity|a] A\n\n> [!text|q] Q\n"+REC));

fs.rmSync(tmp,{recursive:true,force:true});
console.log(fails?"\n"+fails+" FAILURES":"\nlint 0.17 checks passed");process.exit(fails?1:0);
