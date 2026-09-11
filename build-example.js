#!/usr/bin/env node
/* Build the example booklet from the example module, using the renderer itself.
 *
 * `site/starter.md` and `presets/check-in-only.md` are generated artifacts —
 * a booklet the renderer wrote, not prose anybody edits. Until now they were
 * produced by hand, which is exactly why they drifted: when the renderer's
 * `full_spec` pointer changed, every committed copy kept the dead URL, because
 * nothing knew how to make them again.
 *
 * Writing them through the real `toMarkdown()` is the point. A hand-written
 * approximation of the format is a second implementation that can disagree
 * with the first, and the whole argument for publishing the spec is that there
 * should only be one answer to "what does a valid booklet look like".
 *
 * Run:  node build-example.js            (writes)
 *       node build-example.js --check    (fails if anything is stale)
 */
const fs = require("fs");
const path = require("path");

const KIT = __dirname;
const A = require(path.join(KIT, "test", "harness.js"));

const modText = n => fs.readFileSync(path.join(KIT, "modules", n + ".md"), "utf8");

/* what we ship, and under what identity */
const BOOKLETS = [
  { out: "examples/end-of-day.md",
    id: "example/demo", version: "0.1", title: "End of day",
    status: "approved",
    modules: ["end-of-day"] },
];

/* A booklet is reproducible only if nothing timestamps it per-run, so every
   date in the output is pinned to the newest module it carries rather than to
   the clock. Two traps, both hit on the first run:
     - the renderer also stamps a "Downloaded" line into the body, so pinning
       the front matter alone still leaves the file different every minute;
     - file mtimes are checkout times, not commit times, so a fresh clone of
       this repo would regenerate different bytes and --check would fail for
       everybody but the person who last ran it.
   Git's commit time for those files is the one clock that agrees everywhere. */
const { execFileSync } = require("child_process");
function stamp(names) {
  let newest = 0;
  for (const n of names) {
    const file = path.join(KIT, "modules", n + ".md");
    let t = 0;
    try {
      const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", file],
                               { cwd: KIT, encoding: "utf8" }).trim();
      if (iso) t = Date.parse(iso);
    } catch { /* not a git checkout — fall through */ }
    if (!t) t = fs.statSync(file).mtimeMs;
    if (t > newest) newest = t;
  }
  const d = new Date(newest);
  const p = x => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* A module carries the widgets its blocks name, so that handing someone one
 * activity hands them the thing it draws with. That makes the copy inside the
 * module DERIVED: `widgets/` is the source, and the copy goes stale the moment
 * anyone edits a widget — which is exactly what happened when the four cell
 * descriptions moved onto the quadrants widget and the check-in kept drawing
 * from its own older copy. Nothing had told it to.
 */
const FENCE = /```json\n([\s\S]*?)\n```/;

function readWidgets() {
  const dir = path.join(KIT, "widgets");
  const out = {};
  for (const n of fs.readdirSync(dir)) {
    if (!n.endsWith(".md") || n.toLowerCase() === "readme.md") continue;
    const o = JSON.parse(FENCE.exec(fs.readFileSync(path.join(dir, n), "utf8"))[1]);
    delete o.block;                       // `block` names a record entry, not a widget
    out[o.id] = o;
  }
  return out;
}

/* every widget id any block names, groups included */
function widgetIds(blocks, into = new Set()) {
  for (const b of blocks || []) {
    if (b.type === "widget" && b.widget) into.add(b.widget);
    if (b.blocks) widgetIds(b.blocks, into);
  }
  return into;
}

function syncModuleWidgets(check) {
  const W = readWidgets();
  const dir = path.join(KIT, "modules");
  let changed = 0, missing = [];
  for (const n of fs.readdirSync(dir).sort()) {
    if (!n.endsWith(".md") || n.toLowerCase() === "readme.md") continue;
    const file = path.join(dir, n);
    const text = fs.readFileSync(file, "utf8");
    const m = FENCE.exec(text);
    const mod = JSON.parse(m[1]);
    const want = [...widgetIds((mod.mode || {}).blocks)].sort();
    for (const id of want) if (!W[id]) missing.push(`${n} names ${id}, which no widget file defines`);
    const carried = want.filter(id => W[id]).map(id => W[id]);
    const before = JSON.stringify(mod.widgets || []);
    if (!carried.length) delete mod.widgets; else mod.widgets = carried;
    if (JSON.stringify(mod.widgets || []) === before) continue;
    changed++;
    if (check) { console.log(`  STALE      modules/${n}  (widgets: ${want.join(", ") || "none"})`); continue; }
    fs.writeFileSync(file,
      text.replace(m[0], "```json\n" + JSON.stringify(mod, null, 1) + "\n```"), "utf8");
    console.log(`  synced     modules/${n}  (widgets: ${want.join(", ") || "none"})`);
  }
  if (missing.length) { missing.forEach(x => console.log("  ⛔ " + x)); process.exit(1); }
  return changed;
}

function build(spec) {
  A.resetTPL();
  A.setS(A.emptyS());
  A.setD({ today: A.emptyToday(), checkin: A.emptyCheckin() });
  spec.modules.forEach(n => A.addModule(A.moduleFromText(modText(n))));
  A.editTemplate(t => { t.id = spec.id; t.version = spec.version; });

  let md = A.toMarkdown();
  const at = stamp(spec.modules);
  /* The renderer stamps the moment of writing in three places — a generated
     booklet is not written at a moment, so all three are pinned to the same
     date. Missing any one of them leaves the file different on every run,
     which is the whole failure this script exists to stop. */
  md = md.replace(/^(_(?:Downloaded|Téléchargé le) ).*_$/m, `$1${at}_`);
  md = md.replace(/("written":\s*")[^"]*(")/, `$1${at.replace(" ", "T")}:00Z$2`);

  /* front matter: the renderer writes a reader's file; a distributable one
     also carries the approval gate this repo publishes behind. */
  const fm = ["---", "booklet: 1", `status: ${spec.status}`];
  if (spec.approved) fm.push(`approved: ${spec.approved}`);
  fm.push(`title: "${spec.title}"`, "lang: en",
          `preset: "${spec.id}@${spec.version}"`,
          `updated: ${at}`, "---");
  md = md.replace(/^---\n[\s\S]*?\n---\n/, fm.join("\n") + "\n");
  return md;
}

const check = process.argv.includes("--check");
/* in write mode the sync has already fixed what it found, so only a --check
   run counts those as outstanding */
let stale = syncModuleWidgets(check) * (check ? 1 : 0);
for (const spec of BOOKLETS) {
  const built = build(spec);
  const dest = path.join(KIT, spec.out);
  const old = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : null;
  if (old === built) { console.log(`  unchanged  ${spec.out}`); continue; }
  if (check) { console.log(`  STALE      ${spec.out}`); stale++; continue; }
  fs.writeFileSync(dest, built, "utf8");
  console.log(`  wrote      ${spec.out}  (${built.length} bytes)`);
}


if (stale) {
  console.log(`\n${stale} generated file(s) are stale — run: node build-example.js`);
  process.exit(1);
}
console.log("\ngenerated booklets are current");
