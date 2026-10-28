# compile — a booklet file to a plain web page

**compile 0.1.0.** A build step beside the renderer. A `.booklet.md` file goes in and a static web page comes out: plain
HTML and CSS that a person can read and tidy, that reads fully with no JavaScript, and that a search engine can index.
The page holds no renderer and runs nothing. It is for publishing what a booklet says (an article, a guide, a report) on
a site of its own, where people can read it, link to a section of it and share it. To answer a booklet's questions, a
reader still opens the booklet itself in `booklet.html`.

It needs Node and nothing else (CI runs it on Node 20): no `package.json`, nothing to install, nothing fetched.

```
node compile/compile.js examples/how-tides-work.booklet.md
node compile/compile.js --form site --out site-build/ article.booklet.md other.booklet.md
node compile/compile.js --help
```

| Option | What it does |
| --- | --- |
| `--out <dir>` | where to write (default `compiled/`) |
| `--form <form>` | `standalone` (the default), `site`, or `both` |
| `--base-url <url>` | the address the pages are served under; a standalone page then carries its canonical address |
| `--report <file>` | also write the build report to a file (it is always printed); never a `.md` file |
| `--force` | overwrite a page that was changed by hand since it was compiled, or one the compiler did not write |
| `--renderer <file>` | the `booklet.html` to read the format with (default: the one beside `compile/`) |
| `--version` | the compiler's version, and the renderer's and format's it reads |

Each file becomes one page, at an address made from its name: `how-tides-work.booklet.md` becomes
`how-tides-work/index.html`. A run's pages can link to one another (below). The exit code is 0 when every file was
compiled and written, 1 when one was refused or a page was kept back, and 2 for a mistake in the command.

## The two forms

**Standalone** (`--form standalone`) writes a whole page, `<out>/<name>/index.html`, and the stylesheet with its fonts in
`<out>/booklet/`. The page's head has its title, a description (the page's first paragraph, cut near 160 characters at a
sentence's end), its language, Open Graph tags, a JSON-LD `Article` block (whose `<` is escaped, so no title can end it),
and, with `--base-url`, its canonical address. Open it from the disk, or serve the folder as it is.

**Site** (`--form site`) writes the same article as an HTML fragment under YAML front matter (`title`, `description`, each
a double-quoted string), for a site generator's content folder (Hugo, Jekyll, Eleventy and the like):

```
---
title: "How tides work"
description: "A short reading, then a check."
---
<!-- booklet compile 0.1.0 · from how-tides-work.booklet.md · sha256:… -->
<article class="booklet" lang="en">
  …
</article>
```

The site's own layout draws the page around it and its title. A generator runs template code written in a content file,
so every `{{`, `{%` and `{#` in the fragment is written as a character reference (`&#123;&#123;`): a browser shows the same
characters, and the generator reads them as text.

**The one layout line.** Copy `<out>/booklet/` into the site's static folder, so it is served at `/booklet/`, and add one
line to the layout's `<head>`:

```html
<link rel="stylesheet" href="/booklet/booklet.css">
```

In a Hugo layout the address can be written `{{ "booklet/booklet.css" | relURL }}`, so it follows the site's base
address. That is all a host needs, for any site. The stylesheet styles only what is inside `.booklet` (and a standalone page's
`.bk-page` body), so it leaves the host's own page alone.

**Both** (`--form both`) writes the two, under `<out>/standalone/` and `<out>/site/`.

## The stylesheet

`compile/booklet.css` is the renderer's reading look, made for a web page: its type (Atkinson Hyperlegible, headings in
Lexend), its measure, its callout colours and icons, its folds. It takes its values from the renderer's own CSS, but none
of its app chrome. The article is `.booklet`, every other class it styles starts with `bk-`, and every value a host may set is a `--bk-*` variable on
`.booklet`:

```css
.booklet { --bk-font-text: Georgia, serif; --bk-accent: #7a1f5c; --bk-measure: 64ch; }
```

The variables are listed at the top of `booklet.css`: the colours of each of the renderer's four bases, the shared values
(faces, size, line height, measure, gap, corners) and the colour names and hues the callouts and widgets use. A container
with `data-bk-base="paper"`, `"daylight"`, `"night"` or `"contrast"` takes that base. A standalone page follows the
device's dark setting with the renderer's Night colours; an article on a host's page stays light unless the host sets a
base, since the host's page around it decides. Print is always light, with every fold open where the browser allows it.
`test/compile-css.test.js` holds every colour to the renderer's token it copies.

**The fonts** are the two families the renderer bundles, under the SIL Open Font License. The compiler extracts them from
`booklet.html` on each run and writes them as `.woff2` files in `<out>/booklet/fonts/`, with the licence text beside them
(`OFL.txt`). Nothing binary is committed here, so they cannot drift from the renderer's; `test/compile-guard.test.js`
checks the faces and the licence are found. A browser fetches a face only if the page uses it, so a host that sets its
own `--bk-font-text` and `--bk-font-head` never loads them.

## What a page holds

**Drawn**, the way the renderer's reading view draws it:

- the booklet's title (standalone; on a site the layout draws it), its opening and lede, and every shown activity in file
  order, each under its title;
- an activity's tabs one after another, each under its name, and its pages run on with a quiet divider;
- rows, callouts of every kind in their own colour and icon, groups, and folds as `<details>` that open with no script;
- footnotes and citations as numbered marks, with the notes at the page's foot (source, edition, page, quote, verified);
- formulas as MathML, made at build time by the Temml copy inside `booklet.html`, so the browser draws them itself;
- images (below), tables, code, quotes, highlights, and links to headings on the same page;
- an "On this page" list when the page has two or more top headings, an id on every heading, and a small share link on
  each section heading;
- a module's notice (licence, copyright, source, version) at the foot;
- questions read-only: each shows what it asks and offers (options, a scale's anchors, a matrix's items) with nothing to
  press; a question's hint and solution are folds;
- both widget engines read-only: the grid by its axes and cells, in their colour names, with its items; the body map by
  its places, figure by figure.

**Marked**: an HTML comment where the part stood, saying what it was and why, and a line in the build report's tidy-up
list. In 0.1.0 these are:

- query views (tables, lists, tiles, bars, lines, cards from data);
- diagrams, shown as their mermaid source in a code block;
- the body map's figure (its places are listed under it);
- a link to a booklet that is not compiled in the same run (drawn as its words; one that is, links to its page by its
  title);
- a question asked for each pick in another (`each:`);
- an unknown callout kind (drawn as a note, with the renderer's line saying the kind is not known), a widget engine the
  compiler does not draw, a widget that is missing, a broken citation mark, a booklet's own theme block;
- an image that is not drawn: its alt text and address are shown in its place.

**Never read: the records region.** The compiler is handed the booklet's design and nothing else. It reads the file
through the renderer's own parse, then reads the design's own text again with the records region left out (the same
text the renderer keeps as the file's design), and takes the design and every problem it reports from that second
reading. So no answer, kept entry, draft or sync note can reach a page, its head, its front matter or the report, and the
report cannot even say whether the file keeps any. A source file that keeps records is not for a public site; publish
the compiled page, not the file. `test/compile-content.test.js` compiles a fixture whose records hold unique words and
fails if any reaches anything written.

## Images

An image is drawn only from a relative path the renderer's own rule accepts (letters, digits, `_ . / -`; no leading
`/`, no part that starts with a dot; an image extension). The file is read from the booklet's own folder and must stay
inside it (a symbolic link may not lead out), be no larger than the renderer's limit (5 MB) and have the bytes its
extension says. It is then copied beside the page at the same relative path, so the page needs no rewriting. An SVG is
refused, never cleaned, if it holds anything that could run or fetch: a script, an event attribute, `<foreignObject>`,
an outside reference or stylesheet, a `javascript:`, `data:` or `file:` address (character references are read first), a
DOCTYPE with entities, or an animation that changes a link. A refused image is shown as its words and address, with a
comment and a report line saying why.

## The report, and tidying a page

Every run prints a build report for each file: where its pages went, what was drawn (by count), the description it
took, the images it copied, the links between booklets, what the renderer reported about the file, and the **To tidy**
list, one `[ ]` line per marked part, which is also an HTML comment at that spot on the page. That list is the tidy-up
list: open the page, find each comment, and replace it by hand with what the site should show there (a table written
out, a picture of the diagram), or delete it.

**The stamp guard keeps a tidied page.** Each page carries one comment line naming the compiler's version, the source
file and the sha256 of the page as written. On the next run, a page whose text no longer matches its stamp was changed by
hand, and a page with no stamp was not written by the compiler: neither is overwritten (the run exits 1 and says it kept
it back) unless `--force` is given. Compile into a fresh folder to see what changed, or tidy the source booklet and
compile again with `--force`. The compiler never writes to a `.booklet.md` file.

## How it reads the format

There is no second reader. `engine.js` evaluates the main script of the `booklet.html` beside it (or the one named with
`--renderer`) in a Node `vm` sandbox with no network, timers or modules, and calls the renderer's own parse, its Markdown
engine and its Temml copy by name. A file the renderer refuses is refused here with the renderer's words; a problem it
reports is in the report. Every renderer name the compiler uses is listed in `engine.js` (`NAMES`, `MD_NAMES`), and
`test/compile-guard.test.js` fails, in this repository's CI, when one is renamed or gone, so a change to the renderer
that would break the compiler is caught here and never on a host's build.

| File | What it holds |
| --- | --- |
| `compile.js` | the command, the two forms, images and the SVG check, the stamp, writing, the report |
| `engine.js` | the renderer, loaded in a sandbox: the parse, the Markdown engine, Temml, icons and fonts |
| `draw.js` | a design drawn as one page's markup; what is drawn and what is marked (`COVERAGE`, `MARKED`) |
| `html.js` | the markup as nodes, written out as indented HTML a person can tidy |
| `booklet.css` | the stylesheet |

## Tests

All in `test/`, run by `test/run.sh` and CI:

| Test | What it checks |
| --- | --- |
| `compile-guard.test.js` | no second reader (no callout, fence, link, heading or other Markdown pattern of its own); every renderer name it uses exists; no code reaches the records; installs nothing, fetches nothing; writes only its pages |
| `compile-coverage.test.js` | every block type, question kind, widget engine and query view the renderer has is drawn or marked; every callout kind in its look; every mark both a comment and a report line |
| `compile-golden.test.js` | the pages for the examples and page-shaped fixtures equal the committed ones in `test/compile-golden/`; `node test/compile-golden.test.js --write` refreshes them |
| `compile-content.test.js` | nothing lost (every prose word reaches its page); records never published; the image and SVG rules; the two forms' escaping; the stamp guard; the command's exits |
| `compile-css.test.js` | every colour and shared value is the renderer's; the fonts are booklet.html's faces; every class written has a rule |
| `compile-browser.js` | in Chromium with scripting off, at 1280 and 390 px, light and dark: no sideways scroll, every fold opens, only its own files load, the renderer's faces, the text's contrast |

`examples/mindful-check-in.booklet.md` is compiled by the content and browser tests but has no golden page, since its
notice names its author; the golden pages hold made-up content only.

## Versions

The compiler has a version of its own, as the submit build has. A change to the compiler alone merges like a change to
the renderer alone. A format release that changes what a page holds carries the refreshed golden pages in the same pull
request, and a new block type, question kind, engine or query view adds one drawer or one marked line to `draw.js`
(`compile-coverage.test.js` fails until it does).
