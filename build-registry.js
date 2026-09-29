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
/* Every module this registry offers is v0.2 markdown now — no fenced
   JSON design block, so the old FENCE-based extraction cannot read it. The
   renderer's own parser is the only correct reader of that grammar (front
   matter, callout lines, module fences), so this script requires the same
   harness the test suite boots the page with, rather than growing a second,
   separate markdown reader that could silently drift from the real one. */
const A = require("./test/harness.js");

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

/* Wording may be a plain string or one value per language tag, in any subset of
   them: a Spanish-only module has no `en`. Pick the first language a value
   carries, English first only because it is the renderer's root language. */
const LANG_ORDER = ["en", "es", "fr"];
function loc(v) {
  if (typeof v === "string") return v;
  if (!v || typeof v !== "object") return "";
  for (const k of [...LANG_ORDER, ...Object.keys(v).sort()]) if (typeof v[k] === "string" && v[k]) return v[k];
  return "";
}
/* A v0.2 file declares one language in its front matter — there is no
   per-string {en, fr, es} dict to scan for tags anymore (section 9). */
function languagesOf(fm) {
  return fm.lang ? [fm.lang] : [];
}

/* A module's activities, whichever key holds them: one in `mode`, or several in
   `activities` (never both; the renderer refuses a module carrying the two). */
function activitiesOf(mod) {
  if (Array.isArray(mod.activities)) return mod.activities.filter(a => a && typeof a === "object");
  return mod.mode && typeof mod.mode === "object" ? [mod.mode] : [];
}

/* An activity holds its blocks in `blocks`, or in `pages`, each page a list of
   blocks; never both. Read every page's blocks too, or a widget that sits on a
   later page is invisible to the build. */
function blocksOfActivity(a) {
  const out = Array.isArray(a.blocks) ? [...a.blocks] : [];
  if (Array.isArray(a.pages)) for (const p of a.pages) if (p && Array.isArray(p.blocks)) out.push(...p.blocks);
  return out;
}

function widgetIds(blocks, into = new Set()) {
  for (const b of blocks || []) {
    if (b && b.type === "widget" && b.widget) into.add(b.widget);
    if (b && b.blocks) widgetIds(b.blocks, into);
  }
  return into;
}

function build() {
  const dir = path.join(ROOT, "modules");
  const modules = [];
  for (const n of fs.readdirSync(dir).sort()) {
    if (!n.endsWith(".md") || n.toLowerCase() === "readme.md") continue;
    const text = fs.readFileSync(path.join(dir, n), "utf8");
    const fm = frontMatter(text);
    const R = A.parseFile(text);
    if (!R.ok || (R.template.modules || []).length !== 1) {
      throw new Error(`${n}: not one clean v0.2 module (${JSON.stringify(R.unread)})`);
    }
    const mod = R.template.modules[0];
    /* Engines come straight from this file's own widget data (each widget
       block carries its own `engine`) — v0.2 has no separate `widgets/`
       directory to cross-reference, since a module's widgets travel inside it. */
    const ENGINE = {};
    for (const w of R.template.widgets || []) if (w.id && w.engine) ENGINE[w.id] = w.engine;

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
      languages: languagesOf(fm),
      /* what it draws with, so a reader can be told their renderer cannot
         draw it without downloading it first */
      engines: [...new Set(activitiesOf(mod).flatMap(a => [...widgetIds(blocksOfActivity(a))])
        .map(id => ENGINE[id]).filter(Boolean))].sort(),
      /* Who wrote it and on what terms. A registry that carries other people's
         work has to say whose it is: a module is prose as much as it is
         config, and prose written by a named professional is not the same
         thing as an example anybody may fork. Both default to the repository's
         own terms when a file says nothing. */
      /* `rights` in the module block is the canonical place — it travels with
         the module into every booklet, which front matter does not. Carried
         through whole rather than flattened: a copyright holder and an author
         credit are different things and squashing them reads as nonsense. */
      ...(() => {
        const r = { ...(mod.rights || {}) };
        if (!r.copyright && fm.author) r.author = fm.author;
        if (!r.license && fm.license) r.license = fm.license;
        if (!r.source && fm.source) r.source = fm.source;
        return Object.keys(r).length ? { rights: r } : {};
      })(),
      /* pinned if any of its activities is, as the renderer's pinned panel
         looks through every activity */
      ...(activitiesOf(mod).some(a => a.pinned) ? { pinned: true } : {}),
    });
  }
  return {
    registry: 1,
    name: { en: "Booklet module registry", es: "Registro de módulos de Booklet", fr: "Registre de modules Booklet" },
    description: {
      en: "Format demonstrations, general-purpose activities, and attributed modules carrying their own terms. A listing is not an endorsement or safety certification.",
      es: "Demostraciones del formato, actividades de uso general y módulos con autoría atribuida que tienen sus propias condiciones. Figurar en el registro no es un aval ni una certificación de seguridad.",
      fr: "Démonstrations du format, activités générales et modules attribués avec leurs propres conditions. Une inscription ne constitue ni une approbation ni une certification de sécurité.",
    },
    modules,
  };
}

/* A landing page, built from the same data. Opening the site should show what
   is on offer — the registry is an INDEX, so reading it raw shows metadata and
   file pointers rather than modules, which looks like an empty shelf unless
   something says otherwise. */
function landing(reg) {
  const esc = t => String(t).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const rows = reg.modules.map(m => `    <li>
      <h3>${esc(loc(m.title))} <span class="id">${esc(m.id)}</span></h3>
      <p>${esc(loc(m.blurb))}</p>
      <p class="meta">v${esc(m.version)}${m.languages.length ? " · " + m.languages.map(esc).join(", ") : ""}${m.engines.length ? " · draws with " + m.engines.map(esc).join(", ") : ""}${m.pinned ? " · pinned panel" : ""}
        · <a href="${esc(m.file)}">${esc(m.file)}</a></p>
      ${(() => {
        const r = m.rights;
        if (!r) return `<p class="meta">Contributed under this repository's Apache-2.0 terms.</p>`;
        const who = r.copyright || (r.author ? "By " + r.author + "." : "");
        const src = r.source ? ` <a href="${esc(r.source)}">${esc(r.source)}</a>` : "";
        return `<p class="meta rights">${esc(who)} ${esc(r.license || "")}${src}</p>`;
      })()}
    </li>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Booklet — ${esc(reg.name.en)}</title>
<style>
 :root{color-scheme:light dark}
 body{font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;max-width:44rem;
      margin:0 auto;padding:2rem 1.25rem 4rem}
 h1{margin:0 0 .2rem;font-size:1.7rem} h2{margin:2.2rem 0 .6rem;font-size:1.15rem}
 h3{margin:0 0 .2rem;font-size:1rem}
 .lede{color:#666;margin:0 0 1.5rem}
 ul{list-style:none;padding:0} li{border-top:1px solid #8883;padding:1rem 0}
 .id{font:12px ui-monospace,monospace;color:#888;font-weight:400}
 .meta{font-size:.85rem;color:#777;margin:.3rem 0 0}
 .rights{border-left:2px solid #8883;padding-left:.7rem;margin-top:.5rem}
 code{font:13px ui-monospace,monospace;background:#8881;padding:.1rem .3rem;border-radius:3px}
 pre{background:#8881;padding:.8rem;border-radius:6px;overflow-x:auto;font-size:13px}
 .note{border-left:3px solid #8884;padding-left:1rem;color:#666}
</style></head><body>
<h1>${esc(reg.name.en)}</h1>
<p class="lede">${esc(reg.description.en)}</p>

<p><a href="booklet.html">Open the renderer</a> · <a href="registry.json">registry.json</a>
 · <a href="https://github.com/benthepsychologist/booklet">the repo</a>
 · <a href="SPEC.md">the format</a></p>

<h2>What is on offer</h2>
<ul>
${rows}
</ul>

<h2>Using it</h2>
<p>Point the renderer's <b>Add a module</b> button at this registry and these appear
in the list. The renderer fetches this one file — about ${Math.round(JSON.stringify(reg).length / 100) / 10}KB —
and downloads a module's own file only when somebody adds it.</p>

<h2>Adding one</h2>
<p class="note">A module is one v0.2 booklet file — Markdown, with the design
as callout lines and no JSON except a widget's own data. See
<a href="SPEC.md">SPEC.md</a>. Open a pull request; see
<a href="https://github.com/benthepsychologist/booklet/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a>.
This registry is an index, not an endorsement or safety certification.</p>
</body></html>
`;
}

const check = process.argv.includes("--check");
const out = JSON.stringify(build(), null, 1) + "\n";
const dest = path.join(ROOT, "registry.json");
const old = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : null;

const page = landing(build());
const pageDest = path.join(ROOT, "index.html");
const oldPage = fs.existsSync(pageDest) ? fs.readFileSync(pageDest, "utf8") : null;

if (old === out && oldPage === page) {
  console.log("  registry.json and index.html are current");
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
fs.writeFileSync(pageDest, page, "utf8");
console.log(`  wrote      registry.json  (${out.length} bytes)`);
console.log(`  wrote      index.html     (${page.length} bytes)`);
