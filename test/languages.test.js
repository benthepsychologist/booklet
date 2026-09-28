// Languages: the plumbing that lets the renderer speak English, Spanish and
// French, and lets a booklet speak only one of them.
//
//   node test/languages.test.js            run the checks; print the untranslated-key count
//   node test/languages.test.js --parity   ...and list every untranslated T.es key
//   PARITY_STRICT=1 node test/languages.test.js   ...and fail while any are left
//
// The Spanish WORDING is a separate job (the /localize skill). Until it lands,
// T.es is complete by falling back to English, and this file's parity report says
// exactly which keys are still English.
const fs = require("fs"), os = require("os"), path = require("path");
const { spawnSync } = require("child_process");
require("./harness.js"); // installs the DOM stub and the globals the page expects
const R = path.join(__dirname, "..");
const html = fs.readFileSync(R + "/booklet.html", "utf8");
const src = html.split("<script>\n")[1].split("\n</script>")[0];

// a private copy of the page's script, with the internals this file needs
const P = (function () {
  return eval(src + `
  ;({T,TSRC,tx,pickLoc,locBag,langChain,declaredLangs,offeredLangs,chooseLang,applyLangToggle,langParity,
    buildTables,leafPaths,normTag,tableTag,locale,parseFile,applyParsed,toMarkdown,frontMatter,render,renderBar,
    moduleFromText,addModule,editTemplate,moduleCopy,labelMaps,tplModes,emptyS,emptyToday,emptyCheckin,
    setLang:l=>{lang=l},getLang:()=>lang,setView:v=>{view=v},getTPL:()=>TPL,setTPL:v=>{TPL=v},
    resetTPL:()=>{TPL=EMPTY_BOOKLET;SHELF={}},setS:v=>{S=v},getS:()=>S,setD:v=>{D=v},getD:()=>D,
    EMPTY_BOOKLET})`);
})();

let fails = 0;
const chk = (n, ok, d) => { if (!ok) fails++; console.log((ok ? "  ok    " : "  FAIL  ") + n + (d ? "   → " + d : "")); };
const fresh = () => { P.setS(P.emptyS()); P.setD({ today: P.emptyToday(), checkin: P.emptyCheckin() }); P.resetTPL(); P.setLang("en"); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- a small recording DOM, so a test can see the toggle and the text on screen
const mkNode = tag => {
  const n = { tag, children: [], attrs: {}, style: {}, dataset: {}, _text: "", _html: "",
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
    removeAttribute(k) { delete this.attrs[k]; }, hasAttribute(k) { return k in this.attrs; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, append(...k) { this.children.push(...k); }, prepend() {}, remove() {},
    querySelector() { return mkNode("div"); }, querySelectorAll() { return []; }, focus() {}, click() {},
    get textContent() { return this._text; }, set textContent(v) { this._text = String(v); },
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); this.children = []; },
    get value() { return this._value || ""; }, set value(v) { this._value = v; } };
  return n;
};
const origCreate = document.createElement;
const origQSA = document.querySelectorAll;
const toggle = () => {
  const mk = l => { const b = mkNode("button"); b.dataset.lang = l; b.attrs["aria-pressed"] = "false"; return b; };
  const grp = mkNode("div"), btns = ["en", "es", "fr"].map(mk);
  document.querySelectorAll = sel => sel === ".lang" ? [grp] : sel === ".lang button" ? btns : [];
  return { grp, btns, shown: () => btns.filter(b => b.style.display !== "none").map(b => b.dataset.lang),
    pressed: () => btns.filter(b => b.attrs["aria-pressed"] === "true").map(b => b.dataset.lang) };
};
const words = node => { // every piece of text a person could read in a rendered tree
  const out = [];
  const go = n => {
    if (n == null) return;
    if (typeof n === "string") { out.push(n); return; }
    if (n._text) out.push(n._text);
    if (n._html) out.push(n._html.replace(/<[^>]*>/g, " "));
    for (const k of ["aria-label", "placeholder", "title", "alt"]) if (n.attrs && n.attrs[k]) out.push(n.attrs[k]);
    (n.children || []).forEach(go);
  };
  go(node); return out.map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
};

// ================= 1. the resolution chain =================
console.log("\n# the resolution chain");
fresh();
chk("es-AR resolves through es, then en", same(P.langChain("es-AR").slice(0, 3), ["es-AR", "es", "en"]), P.langChain("es-AR").join(" > "));
chk("es resolves through en", same(P.langChain("es").slice(0, 2), ["es", "en"]));
chk("fr resolves through en", same(P.langChain("fr").slice(0, 2), ["fr", "en"]));
chk("en still falls back to fr, as it did", same(P.langChain("en"), ["en", "fr"]));
const slot = { en: "hello", fr: "bonjour", es: "hola", "es-AR": "che" };
const at = (l, v) => { P.setLang(l); return P.tx(v, "FALLBACK"); };
chk("a slot is read in the selected language", at("en", slot) === "hello" && at("fr", slot) === "bonjour" && at("es", slot) === "hola" && at("es-AR", slot) === "che");
chk("es-AR falls to es when the slot has no es-AR", at("es-AR", { en: "hello", es: "hola" }) === "hola");
chk("es falls to en when the slot has no es", at("es", { en: "hello", fr: "bonjour" }) === "hello");
chk("fr falls to en when the slot has no fr", at("fr", { en: "hello", es: "hola" }) === "hello");
chk("en with only French still shows the French, as before", at("en", { fr: "bonjour" }) === "bonjour");
chk("a Spanish-only slot in a booklet that declares nothing still shows", at("en", { es: "hola" }) === "hola");
chk("a plain string is still a plain string, and nothing gives the fallback",
  at("es", "texto") === "texto" && at("es", null) === "FALLBACK" && at("es", {}) === "FALLBACK");
chk("a slot is never mistaken for one whose keys are not languages", at("en", { label: "x" }) === "FALLBACK");
chk("a raw key is never shown: an unknown language table is refused", P.tableTag("de") === "" && P.tableTag("es-MX") === "es");
P.setLang("es-AR");
chk("...es-AR reads es copy when there is no es-AR copy", P.locBag({ en: { h: "E" }, es: { h: "S" } }, {}).h === "S");
P.setLang("fr");
chk("...fr reads en copy when there is no fr copy", P.locBag({ en: { h: "E" }, es: { h: "S" } }, {}).h === "E");
P.setLang("en");

// ================= 2. the tables =================
console.log("\n# the tables");
const enLeaves = P.leafPaths(P.T.en);
const complete = t => enLeaves.filter(p => { let o = P.T[t]; for (const k of p.split(".")) { if (o == null) return true; o = o[k]; } return o === undefined; });
chk("T.es is a complete table: every key of T.en resolves", complete("es").length === 0, complete("es").slice(0, 3).join(", "));
chk("T.es-AR is a complete table too", complete("es-AR").length === 0);
chk("T.fr is complete (it fills any gap from English)", complete("fr").length === 0);
chk("T.es carries the same function-valued strings as T.en", typeof P.T.es.ui.unsavedEntries === "function");
chk("ui.export is now written in Spanish, not left as English", P.T.es.ui.export !== P.T.en.ui.export && P.TSRC.es.ui.export === P.T.es.ui.export);
{ const gone = P.TSRC.es.ui.export; delete P.TSRC.es.ui.export; P.buildTables();
  chk("a missing Spanish key reads as the English, not as undefined", P.T.es.ui.export === P.T.en.ui.export);
  chk("...and langParity lists it as missing", P.langParity("es").missing.includes("ui.export"));
  P.TSRC.es.ui.export = gone; P.buildTables(); }
chk("the tables do not share objects, so editing one cannot leak into another",
  P.T.es.ui !== P.T.en.ui && P.T["es-AR"].ui !== P.T.es.ui);
chk("labelMaps picks up the new tables by itself", (() => { try { P.setLang("es"); const M = P.labelMaps(); P.setLang("en"); return !!M.h; } catch (e) { return false; } })());

// es-AR is a layer: it holds only what differs
{
  const keep = [P.TSRC.es, P.TSRC["es-AR"]]; // by reference: a JSON round trip would drop the function-valued strings and overstate the parity gaps
  P.TSRC.es = { ui: { load: "Cargar", download: "Descargar" } };
  P.TSRC["es-AR"] = { ui: { load: "Cargá" } };
  P.buildTables();
  chk("es-AR overrides es where it differs (voseo)", P.T["es-AR"].ui.load === "Cargá" && P.T.es.ui.load === "Cargar");
  chk("es-AR inherits every other Spanish string from es", P.T["es-AR"].ui.download === "Descargar");
  chk("and anything neither has from English", P.T["es-AR"].ui.export === P.T.en.ui.export);
  chk("the parity report counts what es lacks, and es-AR needs none", P.langParity("es").missing.length === enLeaves.length - 2 && P.langParity("es-AR").missing.length === 0);
  P.TSRC.es = keep[0]; P.TSRC["es-AR"] = keep[1]; P.buildTables();
}

// ================= 3. locale and <html lang> =================
console.log("\n# locale");
const loc = l => { P.setLang(l); return P.locale(); };
chk("en → en-CA, fr → fr-CA (unchanged)", loc("en") === "en-CA" && loc("fr") === "fr-CA");
chk("es → es-419 (dates and numbers)", loc("es") === "es-419");
chk("es-AR → es-AR", loc("es-AR") === "es-AR");
chk("Intl formats a date for each", ["en", "es", "es-AR", "fr"].every(l => { P.setLang(l); return typeof new Date(2026, 8, 26).toLocaleDateString(P.locale(), { day: "numeric", month: "long" }) === "string"; }));
fresh(); toggle();
for (const l of ["en", "es", "es-AR", "fr"]) {
  P.setLang(l); P.renderBar();
  chk(`<html lang> follows the selected language (${l})`, document.documentElement.lang === l, document.documentElement.lang);
}

// ================= 4. the toggle =================
console.log("\n# the toggle");
fresh(); let tg = toggle(); P.renderBar();
chk("a booklet that declares nothing shows EN / ES / FR", same(tg.shown(), ["en", "es", "fr"]) && tg.grp.style.display !== "none");
chk("the toggle's ES button exists in the page", /data-lang="es"[^>]*>ES</.test(html));
P.setTPL({ ...P.EMPTY_BOOKLET, languages: ["en", "fr"] }); tg = toggle(); P.renderBar();
chk("a booklet that offers en and fr shows only EN and FR", same(tg.shown(), ["en", "fr"]));
P.setTPL({ ...P.EMPTY_BOOKLET, languages: ["es"] }); P.setLang("en"); tg = toggle(); P.renderBar();
chk("a booklet that declares one language shows no toggle at all", tg.grp.style.display === "none" && tg.shown().length === 1);
chk("...and moves the person into that language", P.getLang() === "es");
P.setTPL({ ...P.EMPTY_BOOKLET, languages: ["es-AR"] }); P.setLang("fr"); tg = toggle(); P.renderBar();
chk("a booklet that declares es-AR is read in es-AR", P.getLang() === "es-AR" && tg.grp.style.display === "none");
chk("...and in a saved es it is promoted to the booklet's own variant", (() => { P.setLang("es"); toggle(); P.renderBar(); return P.getLang() === "es-AR"; })());
P.setTPL({ ...P.EMPTY_BOOKLET, languages: ["es-AR", "en"] }); P.setLang("en"); tg = toggle(); P.renderBar();
chk("two declared languages: the toggle shows the ES button for es-AR", same(tg.shown(), ["en", "es"]) && tg.pressed().join() === "en");
chk("...and pressing ES gives the booklet's es-AR", P.chooseLang("es") === "es-AR" && P.chooseLang("en") === "en");
P.setLang("es-AR"); tg = toggle(); P.renderBar();
chk("es-AR shows ES as pressed", tg.pressed().join() === "es");
chk("pressing ES while already in es-AR keeps es-AR (undeclared booklet too)", (() => { P.setTPL(P.EMPTY_BOOKLET); P.setLang("es-AR"); return P.chooseLang("es") === "es-AR"; })());
chk("the toggle is hidden by one call, at the end of renderBar", /applyLangToggle\(\);\n\}\n\/\* fixed views/.test(html));
chk("the settings language pills come from the booklet's languages, not a fixed pair", !/\[\["en","English"\],\["fr","Français"\]\]/.test(html));

// Sections 5-8 used to test: a version 1 booklet's `languages:` front-matter
// line, a version 1 module with every string turned into a synthetic
// Spanish-only copy of itself ({en,es,fr} dicts on title/blurb/copy), and the
// old registry's "every entry carries es/fr" rule. Version 2 has none of
// that: one `lang:` per file, no per-string language dicts to test (SPEC.md
// §9), and the registry no longer promises translated entries. Deleted
// rather than ported, per Ben's ruling 2026-09-28: "we took multi-lingual
// support out completely in the new format... we do not need legacy
// support." What is still current — the renderer's own EN/ES/FR interface
// (sections 1-4, 6b, 9) — is untouched below.
document.querySelectorAll = origQSA;

// ================= 6b. the two Spanish registers =================
// Neutral Spanish (es) says tú; the Argentine layer (es-AR) says vos, and what an
// Argentine reader sees is es-AR laid over es, so a tú string es-AR forgot to
// override is a mix too. Every string of each table is read as a person sees it
// (functions filled in), and checked for forms of the other register.
console.log("\n# the two Spanish registers");
{ const words = t => P.leafPaths(t).map(p => { let v = p.split(".").reduce((o, k) => o[k], t);
    if (typeof v === "function") { try { v = [v(1, 1, 1), v(2, 2, 2), v("X", "Y", "Z")].join(" "); } catch (e) { v = ""; } }
    return [p, Array.isArray(v) ? JSON.stringify(v) : String(v)]; });
  const W = list => new RegExp("(?<!\\p{L})(?:" + list + ")(?!\\p{L})", "iu");
  const hits = (t, re) => words(t).filter(([, v]) => re.test(v)).map(([p, v]) => p + ": " + v.match(re)[0]);
  // the tú perfect (Rioplatense says "no descargaste"), the tú pronouns, and the tú present of this interface's verbs
  const tu = W("has\\s+\\p{L}+(?:ado|ido)|ti|contigo|tú|puedes|quieres|tienes|necesitas|eres|sabes|debes|prefieres|haces|pones|dices|vienes|sales|vuelves|eliges|sigues|encuentras|recuerdas|escribes|guardas|abres|usas|agregas|cargas|pegas|tocas|lees");
  const tuDescargas = /(?<!\p{L})descargas(?=\s+(?:una|el|la|o|y)(?!\p{L}))/u; // lower case: "Descargas" is the folder
  const vos = W("vos|sos|podés|querés|tenés|necesitás|sabés|debés|preferís|hacés|ponés|decís|venís|salís|volvés|elegís|seguís|encontrás|recordás|escribís|guardás|abrís|usás|agregás|descargás|cargás|pegás|tocás|leés|elegí|cargá|descargá|pegá|tocá|abrí|usá|agregá|guardá|escribí|volvé|empezá|poné|copiá|editá|cambiá|quitá|buscá|soltá|seleccioná|nombrá|probá|conservá|mantené|abrilo|editalo|dejalo|pegalo|guardalo|cargalo");
  const vosotros = W("vosotros|vosotras|vuestr[oa]s?|os");
  const spain = W("ordenador(?:es)?|móvil(?:es)?|ficheros?|coger|pinchar|pulsar?");
  const ar = [...hits(P.T["es-AR"], tu), ...hits(P.T["es-AR"], tuDescargas)], es = hits(P.T.es, vos);
  chk("an Argentine reader meets no tú form: every string es-AR shows says vos", ar.length === 0, ar.join("; "));
  chk("neutral Spanish has no vos form", es.length === 0, es.join("; "));
  const both = [...hits(P.T.es, vosotros), ...hits(P.T["es-AR"], vosotros), ...hits(P.T.es, spain), ...hits(P.T["es-AR"], spain)];
  chk("neither has a vosotros form or a Spain-only word", both.length === 0, both.join("; "));
  const rm = P.T["es-AR"].library.removeUnsaved("Guardar");
  chk("es-AR's warning about undownloaded changes is voseo throughout", /todavía no descargaste/.test(rm) && /abrilo y usá/.test(rm) && !/has descargado/.test(rm), rm);
  chk("...and so is its note on leaving the page", /no descargaste/.test(P.T["es-AR"].ui.leaving), P.T["es-AR"].ui.leaving);
}

// Sections 7 (the linter) and 8 (the registry) used to build a synthetic
// per-string {en,es,fr} module and check lint-booklet.py's and
// build-registry.js's old v1 per-language rules against it. Deleted with
// the rest of the v1 multi-language content machinery above; lint.test.js
// and build-registry.js's own behavior against the real, current modules/
// are covered elsewhere (test/lint.test.js, test/run.sh's `registry` check).

// ================= 9. the parity report =================
console.log("\n# the parity report: what is still untranslated");
for (const l of ["fr", "es"]) {
  const p = P.langParity(l);
  console.log(`  ${l}: ${p.missing.length} of ${p.total} keys are not written in ${l}` + (p.extra.length ? `; ${p.extra.length} keys that English does not have` : ""));
}
{ const p = P.langParity("es");
  chk("T.es has no key that English lacks (a typo would silently do nothing)", p.extra.length === 0, p.extra.slice(0, 3).join(", "));
  chk("the report lists every key of T.en that es does not translate", p.missing.length + P.leafPaths(P.TSRC.es).length === p.total);
  chk("T.fr has no gap to fill from English", P.langParity("fr").missing.length === 0, `${P.langParity("fr").missing.length} missing`);
  const all = process.argv.includes("--parity");
  console.log(`\n  untranslated T.es keys: ${p.missing.length}` + (all ? "" : "   (run with --parity to list them all)"));
  (all ? p.missing : p.missing.slice(0, 12)).forEach(k => console.log("    " + k));
  if (!all && p.missing.length > 12) console.log(`    … and ${p.missing.length - 12} more`);
  if (process.env.PARITY_STRICT) chk("PARITY_STRICT: no untranslated T.es key is left", p.missing.length === 0, p.missing.length + " left"); }

console.log(fails ? `\n${fails} language check(s) FAILED` : "\nlanguage checks passed");
process.exit(fails ? 1 : 0);
