#!/usr/bin/env node
/* Build registry.json from the modules in this repo.
 *
 * A registry is one JSON file listing what is on offer, with enough in each
 * entry to draw a menu — name, description, and which engines the module
 * needs. That is the whole point of it: a page fetches this instead of every
 * module it might one day offer.
 *
 * The manifest is COMMITTED rather than generated at deploy time, so that a
 * pull request shows what it does to the offer. A reviewer should be able to
 * see "this adds one activity called X" in the diff, not have to imagine it.
 * CI checks it is current and says how to fix it if not.
 *
 * Run:  node build-registry.js           (writes)
 *       node build-registry.js --check   (exit 1 if stale)
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const FENCE = /```json\n([\s\S]*?)\n```/;

function frontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([A-Za-z_][\w-]*):\s*"?(.*?)"?\s*$/.exec(line);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

function build() {
  const dir = path.join(ROOT, "modules");
  const modules = [];
  for (const n of fs.readdirSync(dir).sort()) {
    if (!n.endsWith(".md") || n.toLowerCase() === "readme.md") continue;
    const text = fs.readFileSync(path.join(dir, n), "utf8");
    const fm = frontMatter(text);
    const m = FENCE.exec(text);
    if (!m) throw new Error(`${n}: no module block`);
    const mod = JSON.parse(m[1]);

    /* A registry is an OFFER: everything in it is something a reader can add.
       Anything not approved is not offered, for the same reason a draft is not
       published. */
    if (fm.status && fm.status !== "approved") {
      console.log(`  skipped    modules/${n}  (status: ${fm.status})`);
      continue;
    }
    modules.push({
      id: mod.id,
      version: mod.version,
      file: `modules/${n}`,
      title: mod.title,
      blurb: mod.blurb,
      /* what it draws with, so a reader can be told their renderer cannot
         draw it without downloading it first */
      engines: [...new Set((mod.widgets || []).map(w => w.engine).filter(Boolean))].sort(),
      ...((mod.mode || {}).pinned ? { pinned: true } : {}),
    });
  }
  return {
    registry: 1,
    name: { en: "Booklet examples", fr: "Exemples Booklet" },
    description: {
      en: "Worked examples of the booklet format. Nothing here is advice of any kind.",
      fr: "Exemples du format booklet. Rien ici ne constitue un conseil.",
    },
    modules,
  };
}

const check = process.argv.includes("--check");
const out = JSON.stringify(build(), null, 1) + "\n";
const dest = path.join(ROOT, "registry.json");
const old = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : null;

if (old === out) {
  console.log("  registry.json is current");
  process.exit(0);
}
if (check) {
  console.log("\n⛔ registry.json does not match the modules in this repo.\n" +
              "   Run:  node build-registry.js\n" +
              "   ...and commit the result, so the pull request shows what it\n" +
              "   does to the offer.");
  process.exit(1);
}
fs.writeFileSync(dest, out, "utf8");
console.log(`  wrote      registry.json  (${out.length} bytes)`);
