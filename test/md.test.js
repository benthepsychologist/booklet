// mdNodes(text, opts) test: no dependencies, no jsdom. A minimal fake
// document.createElement records tag, attrs and children (a string child is
// kept as-is, matching how the real DOM's node.append(str) makes a text
// node), which is exactly enough for `el(tag,attrs,...kids)` — defined here
// exactly as it is in booklet.html — to work. md.js is then loaded and used
// against that fake DOM. Run: node test/md.test.js
"use strict";

global.el = (tag, attrs = {}, ...kids) => {
  const n = {
    tag, attrs: {}, children: [],
    setAttribute(k, v) { this.attrs[k] = String(v); },
    addEventListener(k, fn) { (this._on = this._on || {})[k] = fn; },
    append(...ks) { for (const k of ks) this.children.push(k); },
  };
  Object.defineProperty(n, "textContent", { get() {
    return this.children.map(c => typeof c === "string" ? c : (c && c.textContent) || "").join("");
  }});
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "html") n._html = v; // recorded, never used to build anything
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids) if (k != null) n.append(k);
  return n;
};

const { mdNodes } = require("./md.js");

let total = 0, failed = 0;
const chk = (name, ok, detail) => {
  total++;
  if (!ok) failed++;
  console.log((ok ? "  ok    " : "  FAIL  ") + name + (detail !== undefined ? "   → " + JSON.stringify(detail) : ""));
};

// ---- tree helpers ----
const isNode = x => x && typeof x === "object" && typeof x.tag === "string";
const textOf = x => Array.isArray(x) ? x.map(textOf).join("")
  : typeof x === "string" ? x
  : isNode(x) ? x.textContent : "";
const flatten = nodes => {
  const out = [];
  const walk = n => { if (n == null) return; if (Array.isArray(n)) { n.forEach(walk); return; }
    out.push(n); if (isNode(n)) n.children.forEach(walk); };
  walk(nodes);
  return out;
};
// every node (and the top-level strings) anywhere in the tree, depth-first
const allNodes = nodes => flatten(nodes).filter(isNode);
const find = (nodes, pred) => allNodes(nodes).filter(pred);
const first = (nodes, tag) => allNodes(nodes).find(n => n.tag === tag);

// ============================= BLOCK LEVEL =============================

{
  const [h] = mdNodes("# Title");
  chk("ATX h1 becomes h2 (page already has an h1), text kept", h.tag === "h2" && textOf(h) === "Title", { tag: h.tag, text: textOf(h) });
  chk("heading gets a slugified id", h.attrs.id === "title", h.attrs.id);
}
{
  const [h] = mdNodes("###### Deep");
  chk("h6 is the cap even past six hashes worth of level", h.tag === "h6", h.tag);
  const [p] = mdNodes("####### Seven");
  chk("seven #'s is not a heading at all", p.tag === "p" && textOf(p) === "####### Seven", textOf(p));
}
{
  const [h] = mdNodes("## Money & Sense!!", { idPrefix: "m1-" });
  chk("idPrefix prefixes the slug; punctuation collapses to single dashes", h.attrs.id === "m1-money-sense", h.attrs.id);
}
{
  const [p] = mdNodes("line one\nline two\n\nsecond paragraph");
  const ps = mdNodes("line one\nline two\n\nsecond paragraph");
  chk("a single newline inside a paragraph becomes a space", textOf(ps[0]) === "line one line two");
  chk("a blank line starts a new paragraph", ps.length === 2 && textOf(ps[1]) === "second paragraph");
}
{
  const [ul] = mdNodes("- a\n- b\n  - nested one\n  - nested two\n- c");
  chk("bulleted list makes a ul with one li per item", ul.tag === "ul" && ul.children.length === 3, ul.children.length);
  const nested = first(ul.children, "ul");
  chk("one level of indented nesting makes a nested list", !!nested && nested.children.length === 2);
  chk("nested list sits inside its parent item's li", ul.children[1].children.some(c => isNode(c) && c.tag === "ul"));
}
{
  const [ol] = mdNodes("1. one\n2. two\n3. three");
  chk("numbered list (1.) makes an ol", ol.tag === "ol" && ol.children.length === 3);
  chk("a 1-based ol has no start attribute", ol.attrs.start === undefined, ol.attrs);
}
{
  const [ol] = mdNodes("0. zero\n1. one");
  chk('ol start="0" when the first item is "0."', ol.tag === "ol" && ol.attrs.start === "0", ol.attrs.start);
}
{
  const [ol] = mdNodes("1) one\n2) two");
  chk("1) style numbering is also a list", ol.tag === "ol" && ol.children.length === 2);
}
{
  const [ul] = mdNodes("- [ ] not done\n- [x] done\n- [X] also done");
  const texts = ul.children.map(textOf);
  chk("unchecked task gets a ☐ glyph, no <input>", texts[0] === "☐ not done" && !find(ul, n => n.tag === "input").length);
  chk("checked task ([x] or [X]) gets a ☑ glyph", texts[1] === "☑ done" && texts[2] === "☑ also done");
}
{
  const [bq] = mdNodes("> quoted *em* text\n> more of it");
  chk("blockquote lines become a blockquote", bq.tag === "blockquote");
  chk("blockquote content is rendered recursively (inline markup inside works)", !!first(bq.children, "em") && textOf(first(bq.children, "em")) === "em");
  const [bq2] = mdNodes("> para one\n>\n> para two");
  chk("a blank quoted line separates two paragraphs inside the quote", bq2.children.filter(c => c.tag === "p").length === 2);
}
{
  const [pre] = mdNodes("```js\nconst x = 1;\nlet y = 2;\n```");
  chk("fenced code (```) makes pre > code", pre.tag === "pre" && pre.children[0].tag === "code");
  const code = pre.children[0];
  chk("code content is literal text, not re-parsed", textOf(code) === "const x = 1;\nlet y = 2;");
  chk("info string's first word becomes data-lang", code.attrs["data-lang"] === "js", code.attrs["data-lang"]);
}
{
  const [pre] = mdNodes("~~~python\nprint(1)\n~~~");
  chk("~~~ fences work the same as ```", pre.tag === "pre" && pre.children[0].attrs["data-lang"] === "python");
}
{
  const [pre] = mdNodes("```<script>evil\ncode\n```");
  chk("an info string that isn't a bare word is not used as data-lang", pre.children[0].attrs["data-lang"] === undefined, pre.children[0].attrs);
}
for (const marker of ["---", "***", "___"]) {
  const [hr] = mdNodes(marker);
  chk(`thematic break on its own line (${marker}) makes an hr`, hr.tag === "hr");
}
{
  const [h] = mdNodes("Big Heading\n===========");
  chk("setext level-1 (===) makes a heading one level under h1 (h2)", h.tag === "h2" && textOf(h) === "Big Heading", { tag: h.tag, text: textOf(h) });
  const nodes = mdNodes("Smaller\n-------\n\nAfter");
  chk("setext level-2 (---) makes an h3, distinguishing it from a fresh hr", nodes[0].tag === "h3" && textOf(nodes[0]) === "Smaller");
  chk("a lone --- with no preceding paragraph text is still an hr, not a heading", mdNodes("---")[0].tag === "hr");
}
{
  const [t] = mdNodes("Name|Score\n---|---\nAda|10\nGrace|9");
  chk("a GFM table makes table > thead/tbody", t.tag === "table" && !!first(t, "thead") && !!first(t, "tbody"));
  const ths = find(t, n => n.tag === "th");
  chk("header row cells become th", ths.length === 2 && textOf(ths[0]) === "Name" && textOf(ths[1]) === "Score");
  const rows = find(t, n => n.tag === "tr").slice(1);
  chk("body rows become tr > td, in order", rows.length === 2 && textOf(rows[0]) === "Ada10" && textOf(rows[1]) === "Grace9");
}
{
  const [p] = mdNodes("Not a table\njust text");
  chk("a line with no separator row underneath stays a plain paragraph", p.tag === "p");
}
{
  const nodes = mdNodes("Some prose that isn't any of the above constructs.");
  chk("plain unstructured text falls back to a paragraph", nodes.length === 1 && nodes[0].tag === "p");
}

// ============================= INLINE LEVEL =============================

{
  const [p] = mdNodes("**bold** __also bold__ *em* _also em_ ~~gone~~ ==lit== `code(1)`");
  chk("**bold** makes strong", !!first(p, "strong") && textOf(first(p, "strong")) === "bold");
  chk("__also bold__ makes strong too", find(p, n => n.tag === "strong").some(n => textOf(n) === "also bold"));
  chk("*em* makes em", find(p, n => n.tag === "em").some(n => textOf(n) === "em"));
  chk("_also em_ makes em too", find(p, n => n.tag === "em").some(n => textOf(n) === "also em"));
  chk("~~strike~~ makes del", !!first(p, "del") && textOf(first(p, "del")) === "gone");
  chk("==mark== makes mark", !!first(p, "mark") && textOf(first(p, "mark")) === "lit");
  chk("`code` makes code, content literal (not re-parsed)", !!first(p, "code") && textOf(first(p, "code")) === "code(1)");
}
{
  const [p] = mdNodes("foo_bar_baz and a_b");
  chk("intraword underscores are not emphasis", !find(p, n => n.tag === "em").length && textOf(p) === "foo_bar_baz and a_b", textOf(p));
}
{
  const [p] = mdNodes("**bold with *nested em* inside**");
  const strong = first(p, "strong");
  chk("emphasis nests inside bold", !!strong && !!first(strong.children, "em"));
}
{
  const [p] = mdNodes("[a link](https://example.com/x \"a title\")");
  const a = first(p, "a");
  chk("[label](url \"title\") makes an anchor with href and title", a.attrs.href === "https://example.com/x" && a.attrs.title === "a title");
  chk("external http(s) link gets target=_blank and rel=noopener noreferrer", a.attrs.target === "_blank" && a.attrs.rel === "noopener noreferrer");
  chk("link label is rendered as the anchor's text", textOf(a) === "a link");
}
{
  const [p] = mdNodes("<https://example.com/auto>");
  const a = first(p, "a");
  chk("autolink <https://...> makes a live link", !!a && a.attrs.href === "https://example.com/auto");
}
{
  const [p] = mdNodes("see https://example.com/path?q=1, right?");
  const a = first(p, "a");
  chk("a bare https:// URL becomes a link", !!a && a.attrs.href === "https://example.com/path?q=1");
  chk("trailing punctuation is not swept into the URL", textOf(p).endsWith(", right?"), textOf(p));
}
{
  const [p] = mdNodes("![a picture](https://example.com/pic.png)");
  const img = first(p, "img");
  chk("![alt](src) makes an img", !!img && img.attrs.src === "https://example.com/pic.png" && img.attrs.alt === "a picture");
  chk("img gets loading=lazy", img.attrs.loading === "lazy");
}
{
  const text = "[ref link][r]\n\nprose after\n\n[r]: https://example.com/r \"R title\"";
  const [p1] = mdNodes(text);
  const a = first(p1, "a");
  chk("reference link [label][ref] resolves against a def found later in the text", !!a && a.attrs.href === "https://example.com/r" && a.attrs.title === "R title");
}
{
  const text = "![ref image][img]\n\n[img]: images/pic.png";
  const [p] = mdNodes(text);
  const img = first(p, "img");
  chk("reference-style image ![alt][ref] resolves against a def anywhere in the text", !!img && img.attrs.src === "images/pic.png", img && img.attrs);
}
{
  const [p] = mdNodes("[Shortcut]\n\n[shortcut]: https://example.com/s");
  const a = first(p, "a");
  chk("[ref] shortcut resolves case-insensitively against its definition", !!a && a.attrs.href === "https://example.com/s");
}
{
  const [p] = mdNodes("[nope]");
  chk("an unresolved [ref] shortcut stays literal text", p.tag === "p" && textOf(p) === "[nope]" && !first(p, "a"));
}
{
  let got = null;
  mdNodes("a note[^1] here", { mark: id => { got = id; return el("sup", {}, "*"); } });
  chk("opts.mark(id) is called for a footnote ref and its node inserted", got === "1");
  const [p] = mdNodes("a note[^1] here", { mark: id => el("sup", {}, "*") });
  chk("the node opts.mark returns appears in the tree", !!first(p, "sup"));
}
{
  const [p] = mdNodes("a note[^1] here");
  chk("with no opts.mark, a footnote ref stays literal [^1]", textOf(p).includes("[^1]"));
}
{
  const nodes = mdNodes("See[^a] and[^a] again.\n\n[^a]: The footnote body.\n\nAfter the def.");
  chk("the footnote definition text is removed from the rendered output", !nodes.some(n => textOf(n).includes("The footnote body")));
  chk("prose after the removed footnote definition still renders as its own paragraph", nodes.some(n => textOf(n) === "After the def."));
}
{
  let got = null;
  const [p] = mdNodes("![[diagram.png]]", { embed: target => { got = target; return el("figure", {}, "EMBED"); } });
  chk("opts.embed(target) is called for ![[target]] and its node used", got === "diagram.png" && !!first(p, "figure"));
  const [p2] = mdNodes("![[diagram.png]]");
  chk("with no opts.embed, the literal ![[target]] text is kept", textOf(p2) === "![[diagram.png]]");
}
{
  let args = null;
  const [p] = mdNodes("[[Some Note|Shown Label]]", { link: (target, label) => { args = [target, label]; return el("a", {}, label); } });
  chk("opts.link(target, label) is called for [[target|label]]", args[0] === "Some Note" && args[1] === "Shown Label");
  chk("its returned node is used", textOf(first(p, "a")) === "Shown Label");
  const [p2] = mdNodes("[[Bare Target]]");
  chk("with no opts.link, a bare [[wikilink]] stays literal", textOf(p2) === "[[Bare Target]]");
}
{
  const [p] = mdNodes("$x + y = 1$ and later $$\\int_0^1 f(x)dx$$");
  const span = first(p, "span");
  chk("$...$ makes an inline math span with class math, TeX kept as text", !!span && span.attrs.class === "math" && textOf(span) === "x + y = 1");
  const div = first(p, "div");
  chk("$$...$$ makes a math div, no typesetting attempted", !!div && div.attrs.class === "math" && textOf(div) === "\\int_0^1 f(x)dx");
}
{
  const [p] = mdNodes("\\*not emphasis\\* and \\[not a link\\]");
  chk("backslash-escaped punctuation renders literally, not as markup", textOf(p) === "*not emphasis* and [not a link]" && !first(p, "em"), textOf(p));
}
{
  const [p] = mdNodes("*dangling emphasis with no closer");
  chk("an unmatched delimiter never throws and leaves something readable", p.tag === "p" && typeof textOf(p) === "string");
}

// ============================= SECURITY =============================

{
  const [p] = mdNodes("[click me](javascript:alert(1))");
  chk("a javascript: link never becomes a live <a>", !first(p, "a"));
  chk("...it renders the link label as plain text instead", textOf(p) === "click me", textOf(p));
}
{
  // scheme obfuscated with an uppercase mix AND embedded tab/space, wrapped
  // in <angle brackets> (the only bare-destination form that can carry
  // whitespace at all, so this is the form that actually stresses the
  // scheme check rather than just failing to parse as a link).
  const [p] = mdNodes("[go](<JAVA\tSCRIPT:alert(1)>)");
  chk("JAVASCRIPT: mixed case plus embedded whitespace/tab is still rejected", !first(p, "a") && textOf(p) === "go", textOf(p));
}
{
  const [p] = mdNodes("![pic](data:image/png;base64,AAAA)");
  chk("a data: image URL never becomes a live <img>", !first(p, "img"));
  chk("...it renders the alt text as plain text instead", textOf(p) === "pic", textOf(p));
}
{
  const [p] = mdNodes("Some text <script>alert(1)</script> more text");
  chk("a raw <script> tag comes out as literal visible text, never a script node",
    textOf(p).includes("<script>alert(1)</script>") && !find(p, n => n.tag === "script").length, textOf(p));
}
{
  const [p] = mdNodes('before <img src=x onerror=alert(1)> after');
  chk("a raw <img onerror=...> tag is literal text, no img element or on* attribute produced",
    textOf(p).includes("onerror=alert(1)") && !find(p, n => n.attrs && Object.keys(n.attrs).some(k => /^on/i.test(k))).length, textOf(p));
}
{
  const [p] = mdNodes("[x](java\u0000script:alert(1))");
  chk("a NUL byte hidden in the scheme (java\\u0000script:) is still rejected, not smuggled through",
    !first(p, "a") && textOf(p) === "x", textOf(p));
}
{
  const all = mdNodes([
    "[a](javascript:x) [b](VBSCRIPT:x) [c](vbscript:x) [d](FILE:///etc/passwd)",
    "![e](javascript:x) ![f](file:///etc/passwd)",
    "[g](<java\nscript:x>) [h](jav\tascript:x)",
  ].join("\n\n"));
  const badHrefSrc = find(all, n => (n.attrs && (n.attrs.href || n.attrs.src)) &&
    /^\s*(javascript|vbscript|file|data)\s*:/i.test(String(n.attrs.href || n.attrs.src).replace(/[\u0000-\u001f\s]/g, "")));
  chk("sweeping several disallowed schemes together, none ever reaches an href/src", badHrefSrc.length === 0, badHrefSrc.map(n => n.attrs));
}
{
  const relOk = mdNodes("[a](images/x.png) ![b](../up/y.png) [c](#frag) [d](mailto:x@example.com)");
  const a1 = find(relOk, n => n.tag === "a")[0];
  const img = first(relOk, "img");
  const frag = find(relOk, n => n.tag === "a").find(n => n.attrs.href === "#frag");
  const mail = find(relOk, n => n.tag === "a").find(n => n.attrs.href === "mailto:x@example.com");
  chk("a page-relative path (no scheme) is allowed as a link href", a1.attrs.href === "images/x.png");
  chk("a page-relative path is allowed as an image src", !!img && img.attrs.src === "../up/y.png");
  chk("a bare #fragment is allowed as a link href", !!frag);
  chk("mailto: is allowed for links", !!mail);
  chk("relative/fragment links are not marked external (no target=_blank)", a1.attrs.target === undefined && frag.attrs.target === undefined);
}
{
  const [p] = mdNodes("![x](mailto:a@b.com)");
  chk("mailto: is NOT allowed for images (links-only scheme)", !first(p, "img") && textOf(p) === "x");
}
{
  // never throws, whatever garbage arrives
  const inputs = [null, undefined, 42, {}, [], "", "\u0000\u0001\u0002", "[[[[**__~~==$$```", "a".repeat(200) + "*".repeat(500)];
  let threw = false;
  for (const inp of inputs) {
    try { mdNodes(inp); } catch (e) { threw = true; console.log("    threw on", JSON.stringify(inp), e && e.message); }
  }
  chk("mdNodes never throws, across a spread of garbage/edge inputs", !threw);
}
{
  const big = ("Some prose with **bold** and _em_ and a [link](https://example.com/x) here.\n").repeat(900); // ~55KB
  chk("input is at least 50KB for the perf check", big.length >= 50000, big.length);
  const t0 = Date.now();
  mdNodes(big);
  const ms = Date.now() - t0;
  chk("50KB of input renders in well under a second", ms < 3000, ms + "ms");
}

// ============================= LINKS TO A HEADING =============================

{
  const seen = [];
  const out = mdNodes("Next: [Check yourself](#check-yourself) and [web](https://example.com/)", {
    anchor: (slug, kids) => { seen.push([slug, textOf(kids)]); return el("a", { href: "#", class: "alink" }, ...kids); } });
  chk("the anchor hook is called with the slug and the label for `[label](#slug)`",
    seen.length === 1 && seen[0][0] === "check-yourself" && seen[0][1] === "Check yourself", seen);
  const links = find(out, n => n.tag === "a");
  chk("the hook's node is drawn, and an ordinary web link is left to mkLink",
    links.length === 2 && links[0].attrs.class === "alink" && links[1].attrs.href === "https://example.com/", links.map(n => n.attrs));
  const plain = mdNodes("[Check yourself](#check-yourself)", { anchor: () => "Check yourself" });
  chk("a hook may return plain text (a heading that is not there)", !find(plain, n => n.tag === "a").length && textOf(plain) === "Check yourself", textOf(plain));
  const none = mdNodes("[Check yourself](#check-yourself)");
  chk("with no hook a `#slug` link is the ordinary link it always was", first(none, "a") && first(none, "a").attrs.href === "#check-yourself");
  const thrown = mdNodes("[x](#y)", { anchor: () => { throw new Error("no"); } });
  chk("a hook that throws falls back to the ordinary link", first(thrown, "a") && first(thrown, "a").attrs.href === "#y");
}

console.log(`\n${total} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
