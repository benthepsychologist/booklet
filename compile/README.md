# compile — a booklet file to a plain web page

**compile 0.1.0.** A build step beside the renderer. A `.booklet.md` file goes in and a static web page comes out: plain
HTML and CSS that a person can read and tidy, that reads fully with no JavaScript, and that a search engine can index.
The page holds no renderer and runs nothing. It is for publishing what a booklet says (an article, a guide, a report) on
a site of its own, where people can read it, link to a section of it and share it. To answer a booklet's questions, a
reader still opens the booklet itself in `booklet.html`.

It needs Node (CI runs it on Node 20) and installs and fetches nothing: no `package.json`. Drawing a mermaid diagram at build time is the one
thing that also needs a browser, a Playwright package you already have (below); without one every diagram stays as its source in a code block, and
every other part of a page is made as before.

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
| `--force` | overwrite a page or a stylesheet that was changed by hand since it was compiled, or one the compiler did not write |
| `--renderer <file>` | the `booklet.html` to read the format with (default: the one beside `compile/`); it is run as code, so name only a file you trust (below) |
| `--no-browser` | draw no diagram: each stays as its source, with the reason in the report (the same as `PLAYWRIGHT` set to nothing) |
| `--version` | the compiler's version, and the renderer's and format's it reads |

Each file becomes one page, at an address made from its name: `how-tides-work.booklet.md` becomes
`how-tides-work/index.html`. Two files whose addresses differ only in case clash (they would be one folder on a
case-insensitive disk), and the second is refused. A run's pages can link to one another (below). The exit code is 0
when every file was compiled and written, 1 when one was refused, the compiler failed on one, or a page or the
stylesheet was kept back, and 2 for a mistake in the command. A file the compiler fails on stops only itself: the others
are compiled, and the report names the kind of error and the line of code it was raised at, never its message (a
message can carry a piece of the file's text).

## The two forms

**Standalone** (`--form standalone`) writes a whole page, `<out>/<name>/index.html`, and the stylesheet with its fonts in
`<out>/booklet/`. The page's head has its title, a description (the page's first paragraph, cut near 160 characters at a
sentence's end, with no image's alt text or address in it), its language, Open Graph tags, a JSON-LD `Article` block
(whose `<` is escaped, so no title can end it), and, with `--base-url`, its canonical address. The title in `<title>`,
`og:title` and the JSON-LD is the title's words, never its Markdown. Open the page from the disk, or serve the folder as
it is.

**The page's language** is the booklet's own: its front matter's `lang:`, read with the renderer's own front-matter
reader and written as the renderer writes a tag (`PT-br` is `pt-BR`). It is the page's `<html lang>` and the article's
`lang`, its `og:locale` (`pt_BR`) and the JSON-LD's `inLanguage`. A booklet with none is `en`.

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

The front matter's title and description are plain words, never Markdown, in double-quoted YAML strings. They hold no
markup character: a `<` or `>` in a title is written as `‹` or `›`, so neither can open a tag wherever the layout puts
it. A `&` and a `"` are kept as they are (the YAML string escapes the quote), so **the layout must still escape the two
values where it writes them into the page**, in text and in an attribute such as `<meta content="…">`. A generator that
escapes by default (Hugo's templates do) needs nothing more; one that does not (Jekyll's Liquid) needs its filter:
`{{ page.title | escape }}`.

**The one layout line.** Copy `<out>/booklet/` into the site's static folder, so it is served at `/booklet/`, and add one
line to the layout's `<head>`:

```html
<link rel="stylesheet" href="/booklet/booklet.css">
```

In a Hugo layout the address can be written `{{ "booklet/booklet.css" | relURL }}`, so it follows the site's base
address. That is all a host needs, for any site. The stylesheet styles only what is inside `.booklet` (and a standalone page's
`.bk-page` body), so it leaves the host's own page alone, and the host's own stylesheet does not reach inside it (below).

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

**Its own look on any site.** A site's theme styles bare elements (`footer`, `aside`, `blockquote`, `ol`, a heading's
face), elements under a class of its own (`.content ol` as numbered cards), and often marks a rule `!important` with an
id in front (`#main .content blockquote { background-color: … !important }`, or an inline `<style>` setting every
heading's face `!important`). Without a guard those rules would reach the page. The stylesheet holds them off in three
ways, wherever the host's stylesheet sits, and looks on a plain page exactly as it did without them:

- every declaration inside the article is `!important` (custom properties aside), so no plain host rule can win;
- every rule starts `.booklet:not(#bk):not(#bk):not(#bk)`. No element has the id `bk`, so this matches every article,
  and it weighs as much as three ids, so it outweighs a host's `!important` rule with fewer than three ids;
- one rule sends every property the stylesheet does not set, on every element inside the article, back to the browser's
  own default (`all: revert`, also `!important`), which is what a plain page shows. It is the lightest rule in the file,
  so every other rule wins over it. The icons and the formulas are left out of it (revert would also drop the attributes
  they are drawn with): an icon's paint is set in full, and a formula's box (margin, padding, border) is reverted on its
  own.

It does this without a cascade layer (`@layer`): a layer would beat a host's `!important` at any weight, but a browser
without layers (before Chrome 99, Firefox 97 and Safari 15.4) would drop the whole stylesheet, and a page would show
unstyled. The three ids are written as three `:not(#bk)`, which any browser reads.

**What a host can still change.** The `--bk-*` variables are plain declarations, so a host's own rule setting them wins
(`.booklet { --bk-accent: #7a1f5c; }`): the colours, the faces, the size, the leading, the measure, the gap and the
corners; and `data-bk-base` picks one of the four bases. The article itself is placed by the host: its margin, width and display are the host's (the article
sets its own text and paints nothing, so the page around it does not flow in). Anything else inside the article needs a
rule of the host's own with the same start, `!important` on each declaration, after this file. **What still reaches
the page:** a host rule marked `!important` with three ids or more; one inside a cascade layer (`@layer`), since an
`!important` declaration in a layer beats one outside every layer; an inline `style="… !important"` on an element; and a
host that changes the root font size (`html { font-size: 62.5% }`), since the stylesheet's sizes are in `rem`.
`test/compile-host-browser.js` holds the page to its plain look on a hostile host, `!important` rules of one and two ids
included.

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
- images (below), each written with the width and height read from its file; diagrams and the body map's figure, drawn
  at build time as inline SVG (below); tables, code, quotes, highlights, and links to headings on the same page;
- an "On this page" list when the page has two or more top headings (a plain list: the headings carry any numbers they
  are written with, and the list adds none), an id on every heading, and a small share link on each section heading.
  The ids the page fixes for itself start with `bk-` (`bk-top`, `bk-toc-h`, `bk-notes-h`, `bk-note-1`), and a heading
  whose own id would take one is given the next free name, with every link and `aria-labelledby` following it. Temml's
  `\label` ids and `\ref` / `\eqref` links take the `bk-tml-` prefix the same way;
- a module's notice (licence, copyright, source, version) at the foot, in a plain box (not a `<footer>`, so a host's
  own footer styles do not reach it);
- questions read-only: each shows what it asks and offers (options, a scale's anchors, a matrix's items) with nothing to
  press; a question's hint and solution are folds;
- both widget engines read-only: the grid by its axes and cells, in their colour names, with its items; the body map by
  its places, figure by figure, with the author's figure drawn above them.

**Marked**: an HTML comment where the part stood, saying what it was and why, and a line in the build report's tidy-up
list. These are:

- query views (tables, lists, tiles, bars, lines, cards from data);
- a diagram the compiler could not draw (no browser, or the drawing was refused): shown as its mermaid source in a code
  block, with the reason in the comment and the report line;
- a body map's figure that failed the build-time check: its places are still listed, and the comment and the report line
  say what the check refused;
- a link to a booklet that is not compiled in the same run (drawn as its words; one that is, links to its page by its
  title);
- a question asked for each pick in another (`each:`);
- an unknown callout kind (drawn as a note, with the renderer's line saying the kind is not known; a callout of a kind
  the page has no look for takes the note's look folded or not), a widget engine the compiler does not draw, a widget
  that is missing, a broken citation mark, a booklet's own theme block;
- an image that is not drawn: its alt text and address are shown in its place.

Before 0.2.0 every diagram was marked, and the body map's figure was never drawn. They are drawn now whenever they pass
the checks under "Figures and diagrams".

**Left off: author comments.** Obsidian hides a `%% … %%` comment, and the renderer would show one as prose, so the
compiler leaves each one off the page. No HTML comment stands in its place, and the report names its lines only, never
its words ("Author comments left off the page: line 10, lines 12–15"). A comment may sit inside a line or run over
several; one that never closes hides everything to the end of the text, as Obsidian does, and the report says so. A `%%`
inside fenced code is code, and is drawn; one inside inline code (`` `%%` ``) is still read as a comment mark, since
the compiler finds fenced code with the renderer's own reading and has no inline-code reading of its own.

**Never read: the records region.** The compiler is handed the booklet's design and nothing else. It reads the file
through the renderer's own parse, then reads the design's own text again with the records region left out (the same
text the renderer keeps as the file's design), and takes the design and every problem it reports from that second
reading. So no answer, kept entry, draft or sync note can reach a page, its head, its front matter or the report, and the
report cannot even say whether the file keeps any. A source file that keeps records is not for a public site; publish
the compiled page, not the file.

**Refused: a file whose records would be read as design.** The renderer reads a code fence that never closes to the end
of the file, so a records region after one is read as text, and an app that saves the file writes exactly that shape
when a body ends in an open fence. The compiler refuses such a file, writes nothing for it and exits 1, saying why in
words and never quoting the file:

- its text ends inside a code fence that never closes (the report gives the line it opens on): close it with a line of
  the same marks;
- a records line (`> [!records…]`) stands in the booklet's own text: inside a code block (an example of the format is
  refused too), or after something that swallowed the region's start;
- the renderer reports a record block (`booklet answers`, `entries`, `draft`) outside the region.

The checks use the renderer's own fences (`codeFences`), its callout line (`CALLOUT_LINE`) and its problem for a record
block out of place, and they run on the file's design text before anything is drawn. `test/compile-content.test.js` compiles a fixture whose records hold unique words and
fails if any reaches anything written.

## Images

An image is drawn only from a relative path the renderer's own rule accepts (letters, digits, `_ . / -`; no leading
`/`, no part that starts with a dot; an image extension). The file is read from the booklet's own folder and must stay
inside it (a symbolic link may not lead out), be no larger than the renderer's limit (5 MB) and have the bytes its
extension says. It is then copied beside the page at the same relative path, so the page needs no rewriting. A refused
image is shown as its words and address, with a comment and a report line saying why.

**An SVG** runs nothing as an `<img>` on the page, but the host serves the copy from its own site, where opening the file
directly runs whatever it holds. So the compiler copies only an SVG it can read whole as a plain picture, and refuses
(never cleans) every other:

- every element is one that draws a picture (`svg`, `g`, shapes, text, gradients, patterns, masks, filters, animations),
  with no namespace prefix: a prefix can name the SVG or XHTML namespace, so `<s:script>` is a script;
- the only namespaces are SVG's (`xmlns`) and xlink's (`xmlns:xlink`), each with its own address, and the only prefixed
  attributes are `xlink:href`, `xml:space` and `xml:lang`;
- every `href` and `src` points inside the file (`#id`), no attribute is an event handler, and no animation changes a
  link or a handler;
- nothing could load or run: no script or `<foreignObject>`, no `javascript:`, `vbscript:`, `data:` or `file:` address
  (character references are read first; a scheme is a word that begins a value or follows a separator, with something after its colon, so the
  words “Profile: left” or “Metadata: left” in a label are text, while `javascript:alert(1)`, `1;data:x` and a tab-split `java&#9;script:x` are refused), no CSS `url()` that leads outside the file, no `image-set()`, `@import` or
  `expression()`, and no backslash (CSS can spell a word with one);
- nothing the reading cannot place: a processing instruction past the XML declaration, a DOCTYPE with entities, an
  unquoted value, a comment that never closes.

An SVG saved with an editor's own data or metadata carries other namespaces (Inkscape's `sodipodi:` and `inkscape:`,
Dublin Core's `dc:` in a `<metadata>` block, Adobe's `x:`), so it is refused until it is saved without them (Inkscape's
Optimized SVG, or an optimiser such as SVGO, takes them out). `test/compile-browser.js` opens a prefixed-script SVG directly in
Chromium with scripting on, to show the case is real, and checks the compiler copies no such file.

An image's width and height are read from the file's own bytes (PNG, JPEG, GIF, WebP; for an SVG, its `width` and
`height`, else its `viewBox`, scaled by powers of ten until it is at least 100 wide) and written on the `<img>`, so the
page does not jump as it loads. A file whose size cannot be read is written as in 0.1.0, with no size. A JPEG that carries an EXIF orientation of 5 to 8 (a phone
held sideways) is drawn turned by a browser, so its width and height are swapped; only the first EXIF block counts, and a block that is
damaged says nothing (`test/compile-figures-browser.js` holds the written size to what Chromium draws, for 27 variants).

## Figures and diagrams

**A body map's figure** is the author's SVG, drawn inline and read-only. The compiler does not copy the author's text
onto the page: it reads the SVG with a strict reader of its own, and writes the tree it read back out. The figure is
refused, and the page still compiles with the figure's places listed, when any of these holds:

- the image rules above fail on what would be written (the check runs on the markup, with the words of labels set
  aside, so a label such as "Profile:" is not read as an address);
- the renderer's own sanitizer rule would have changed it: the compiler reads the renderer's lists of kept elements,
  attributes and style properties (`SVG_KEEP`, `svgNameOk`, `svgValueOk`, `svgFamily`, `SVG_STYLE_PROPS`) and refuses where
  the renderer drops or rewrites. That includes a value that holds `url(` under any name (`data-*` and `aria-*` too), which the
  renderer drops when it holds a character its value rule does not keep, and a `#name` in such a value that is not one of the figure's
  ids (a style such as `fill:url(#g);stroke:#abc` is refused: the renderer reads the colour as an id too, so write it as `rgb()` or by name);
- it holds an entity other than the XML five and numeric references (`&deg;`, `&nbsp;`, `&copy`): the renderer's HTML parser decodes those
  and the compiler's reader does not, so the two would show different text. Write the character itself, or `&amp;` for an ampersand;
- it holds a CDATA section inside `<title>` or `<desc>` (a browser reads what is inside those as HTML, where it is a comment);
- it is too much: nested more than 512 deep (a browser's HTML parser stops there), more than 20,000 elements, or larger than 1 MiB. The reason is
  in the report and the page still compiles, with the figure's places listed.

A figure the compiler draws is therefore one the renderer draws unchanged, **with one difference on purpose**: the compiler's own scripts and
styles use `data-bk-*` attributes and `bk-*` class names, so those are taken off an author's figure (a `class` left empty is left off) and a
figure cannot address them. `test/compile-figures-browser.js` checks the rest in Chromium against the renderer's `sanitizeSvg`: a matrix of
every kept element, attribute and style property and of hostile changes to them, and a seeded fuzz of made-up figures (two fixed seeds of 600 in
the test; `BK_FUZZ_SEEDS=3 BK_FUZZ_CASES=3000 node test/compile-figures-browser.js ...` runs a larger one). Whatever it writes is kept unchanged
by the renderer, and whatever the renderer would change is refused.

Every `id` in the figure is prefixed `bk-<page>-fN-` (and its references with it), where `<page>` is the page's address and N counts the page's
figures and diagrams, so two figures, a figure and a footnote, or two pages put into one host page, never share one. A page address with a
character an id cannot hold has it written as `-` and a short hash follows, so `a.b` and `a-b` stay two. Each place with a `data-r` mark gets `role="img"` and its label.

**A diagram** (a mermaid fence, or a `![[#^id]]` figure) is drawn at build time in headless Chromium by the renderer's
own `parts/mermaid.js` (the file the renderer pins by hash; the compiler checks the pin before it runs the part, and
reads the part from beside the renderer, or from a one-file build's `lib-mermaid` block). The browser page is empty, its
policy allows no script but the part, no connection and no image or font but `data:`, the context is offline with every
request refused, and a diagram's source goes in as data. The page the compiler writes carries no mermaid script.

The drawing is then read and written back like a figure, and passed through the image rules. It is refused when the
check fails, and also when it holds a `<foreignObject>` (a diagram type that lays its labels out as HTML, such as the
journey), a script, an address or an animation. Its `<style>` is kept only as rules whose every selector begins with the
diagram's own `#id` (`@keyframes` are dropped; a rule that needs a class the drawing does not use is dropped; any other
at-rule refuses the drawing; the style is read with its strings and comments understood, so a brace inside a string cannot hide a rule, and a rule
inside a rule, a stray brace, or a string or comment that never closes refuses it). Its ids are `bk-<page>-dgN`, and an id the drawing points at that is not
named from that is renamed under it. Its root takes an accessible name from its own title, else from a title text in the
drawing, else "Diagram" (or the page's language). A refused or undrawn diagram is shown as its source in a code block,
with the reason in the comment and the report line.

**Dark mode.** A drawn diagram carries one theme, the renderer's Paper theme, and its own paper-coloured background, so it
reads the same on a light or a dark page and its text keeps its contrast. It does not follow the page into dark.

**A host's own theme.** A theme that styles bare shapes (`svg path { fill: red }`, `svg { stroke-width: 4px }`) would repaint a
drawing. The stylesheet holds the root of a figure or diagram to the page's ink and a one-pixel line, a figure's shapes are
painted by the stylesheet, and a diagram carries rules of its own for what it would otherwise inherit or carry as an
attribute (`fill="none"`), at the weight of its id alone: they beat a host's plain rule, and the library's own rules (which
name a class or an element as well) still beat them. A host's `!important` rule, or a paint written in a way the compiler
does not turn into a rule (a value with an unusual character), still reaches. `test/compile-host-browser.js` holds the
figures and diagrams to their plain look on its hostile host.

**Repeatable.** The library draws a class, ER or git-graph picture with random numbers. The runner replaces `Math.random` with a seeded
generator, started again from the same seed before every diagram, so the same source gives the same drawing whatever else is drawn
with it, and two builds give the same page (`test/compile-figures-browser.js` draws the corpus twice, in two orders, and compares the
bytes). What can still differ is what is not the source's: a gantt chart's “today” marker reads the clock, and a different Chromium
version or different fonts on the machine can draw the same source a little differently.

**A host's own content policy.** A drawing carries its own `<style>` and some `style` attributes. A host that refuses
inline styles shows a diagram without them. Wide diagrams shrink to the page's width, so on a phone their text is small.

**Finding the browser.** The compiler uses Playwright, which this repository does not carry and the compiler never
installs. **The package that is found is run: its code executes in the process that draws**, so it is looked for in named places only and never
in the folder the compiler is started in. In order: the `PLAYWRIGHT` environment variable (a path to `playwright` or `playwright-core`;
when it is set at all, only that is tried, so setting it to nothing, or to a place with no package, turns drawing off), else
`node_modules/playwright` and `node_modules/playwright-core` of this repository and `../.tools/node_modules/playwright-core` beside it
(all resolved from `compile/`, as `test/run-browser.sh` finds it). With no usable browser every diagram stays as its source, and the report
says why, including the first line of what the browser said when it would not start (“Executable doesn't exist at ...”). A fallback line
names the diagram: `a mermaid fence (its 3rd diagram, “graph LR; A…”)`. A slow drawing is cut short: 4 minutes for the whole browser run
and 60 seconds for one diagram (the diagram then falls back; `compile()` takes `browserTimeout` and `diagramTimeout`, in milliseconds). The
compiler asks the browser for nothing but the diagrams, in one run for each booklet that has any (a source drawn for one booklet is
not drawn again for another), and starts none for a booklet with none; `compile()` takes `browser: false`
to turn it off and `drawer(codes)` to supply drawings in a test.

## The report, and tidying a page

Every run prints a build report for each file: where its pages went, what was drawn (by count), the description it
took, the images it copied, the links between booklets, what the renderer reported about the file, and the **To tidy**
list, one `[ ]` line per marked part, which is also an HTML comment at that spot on the page. That list is the tidy-up
list: open the page, find each comment, and replace it by hand with what the site should show there (a table written
out, a picture of the diagram), or delete it.

**The stamp guard keeps a tidied page, and a tidied stylesheet.** Each page carries one comment line naming the
compiler's version, the source file and the sha256 of the page as written, and `booklet/booklet.css` carries the same as
a CSS comment on its first line. On the next run, a file whose text no longer matches its stamp was changed by hand, and
one with no stamp was not written by the compiler: neither is overwritten (the run exits 1 and says it kept it back)
unless `--force` is given. **The fonts, their licence and the copied images carry no stamp and are always written again**
from their sources, so a change made to them by hand is overwritten: change the source image, not the copy. Compile into
a fresh folder to see what changed, or tidy the source booklet and compile again with `--force`. The compiler never
writes to a `.booklet.md` file.

## How it reads the format

There is no second reader. `engine.js` evaluates the main script of the `booklet.html` beside it (or the one named with
`--renderer`) in a Node `vm` context, with a stand-in page and no network, timers or modules handed to it, and calls the
renderer's own parse, its Markdown engine and its Temml copy by name. **The `vm` context is not a security boundary**:
code run in it can reach the Node process. `booklet.html` is trusted because it comes from the same commit as the
compiler, and `--renderer` must name a file you trust as much. A file the renderer refuses is refused here with the renderer's words; a problem it
reports is in the report. Every renderer name the compiler uses is listed in `engine.js` (`NAMES`, `MD_NAMES`), and
`test/compile-guard.test.js` fails, in this repository's CI, when one is renamed or gone, so a change to the renderer
that would break the compiler is caught here and never on a host's build.

| File | What it holds |
| --- | --- |
| `compile.js` | the command, the two forms, images (their sizes) and the SVG check, the stamp, writing, the report |
| `diagrams.js` | the strict SVG reader and writer, the figure and diagram rules, finding Playwright, the one browser run |
| `diagrams-run.js` | the child process `diagrams.js` starts: draws the diagrams in an offline Chromium page and answers on standard output |
| `engine.js` | the renderer, loaded in a `vm` context (not a security boundary): the parse, the Markdown engine, Temml, icons and fonts; the records checks; author comments |
| `draw.js` | a design drawn as one page's markup; what is drawn and what is marked (`COVERAGE`, `MARKED`) |
| `html.js` | the markup as nodes, written out as indented HTML a person can tidy |
| `booklet.css` | the stylesheet |

## Tests

All in `test/`, run by `test/run.sh` and CI:

| Test | What it checks |
| --- | --- |
| `compile-guard.test.js` | no second reader (no callout, fence, link, heading or other Markdown pattern of its own, as a pattern or a string test; tried first on made-up re-readings); the author-comment mark in one region only; every renderer name it uses exists; no code reaches the records; installs nothing, fetches nothing, and starts one process only (the name `child_process` is written once, `spawnSync` once, no `exec`, `spawn` or `fork`); writes only its pages |
| `compile-coverage.test.js` | every block type, question kind, widget engine and query view the renderer has is drawn or marked, from the very tables `draw.js` dispatches from; every callout kind in its look; every mark both a comment and a report line |
| `compile-golden.test.js` | the pages for the examples and page-shaped fixtures equal the committed ones in `test/compile-golden/`; `node test/compile-golden.test.js --write` refreshes them |
| `compile-content.test.js` | nothing lost (the design walked whole, every word counted on its page); records never published, and the records shapes refused; author comments left off; the image and SVG rules; the two forms' escaping and language; the page's ids; the stamp guard for pages and the stylesheet; the command's exits |
| `compile-css.test.js` | every colour and shared value is the renderer's; the fonts are booklet.html's faces; every class written has a rule |
| `compile-figures.test.js` | hostile figures and hostile drawings refused with a reason; the style scope (strings and comments read); image sizes read from every format and the fallback, EXIF turns and damaged blocks; the browser lookup (never the working folder); a fake Playwright that hangs, fails or answers wrongly; a build with no browser keeps the source and says why; `--no-browser` and `--help`; ids per page; the mermaid pin; the theme list equals the renderer's |
| `compile-figures-browser.js` | in Chromium: a compiled figure equals the renderer's own sanitized one (a mutation matrix); real diagrams drawn with no request made; the compiled page at 1280 and 390 px with scripting off, figure and diagram visible; pictures load at the size written; a JPEG's written size equals Chromium's for 27 variants (EXIF); the same drawings twice; a seeded differential fuzz of figures against the renderer's sanitizer |
| `compile-browser.js` | in Chromium with scripting off, at 1280 and 390 px, light and dark: no sideways scroll, every fold opens, only its own files load, the renderer's faces, the text's contrast; with scripting on, a prefixed-script SVG runs when opened directly and the compiler copies none |
| `compile-host-browser.js` | in Chromium, at 1280 and 390 px: each page on a plain host and on the same host with a hostile theme loaded after `booklet.css` (rules on bare elements, a `*` reset, `.wrapper ol` as numbered cards, and `!important` rules of one and two ids, among them `#main .content blockquote *`); every element inside the article keeps its computed values, its `::before`, `::after` and `::marker`, and its box; the theme is live around the article; the check fails with no guard, with the guard as it was before `!important`, and with `!important` but one id's weight |

`examples/mindful-check-in.booklet.md` is compiled by the content and browser tests but has no golden page, since its
notice names its author; the golden pages hold made-up content only.

## Versions

The compiler has a version of its own, as the submit build has. A change to the compiler alone merges like a change to
the renderer alone. A format release that changes what a page holds carries the refreshed golden pages in the same pull
request, and a new block type, question kind, engine or query view adds one drawer or one marked line to `draw.js`
(`compile-coverage.test.js` fails until it does).
