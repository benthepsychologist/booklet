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
| `--force` | overwrite a page or a stylesheet that was changed by hand since it was compiled, or one the compiler did not write |
| `--renderer <file>` | the `booklet.html` to read the format with (default: the one beside `compile/`); it is run as code, so name only a file you trust (below) |
| `--version` | the compiler's version, and the renderer's and format's it reads |

Each file becomes one page, at an address made from its name: `how-tides-work.booklet.md` becomes
`how-tides-work/index.html`; a booklet that shows two or more activities becomes a contents page and a page for each
activity (**Many pages**, below). Two files whose addresses differ only in case clash (they would be one folder on a
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
it is (a booklet of many pages is better served: see below).

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

## Many pages, and translations

**One page or many.** A booklet that shows no more than one activity (a hidden activity is not shown) is the one page
above, written exactly as 0.1.0 wrote it. A booklet that shows **two or more** is a **contents page** and **one page for
each activity**, each a page of its own, with its own title, description, "On this page" list and head:

```
<out>/how-tides-work/index.html               the contents page
<out>/how-tides-work/rd-tides/index.html      one activity
<out>/how-tides-work/rd-check/index.html      another
```

- **The contents page** holds the booklet's title and opening, then each module: its title, opening and notice, its tabs
  (SPEC.md section 3, "A module's tabs": each tab's name, its prose and the cards of its activities), and a **card** for
  each activity, drawn from the file's parts (SPEC.md, "A card's parts"): its title, its picture (the line's `icon:`
  when the picture sprite has it, else an emoji the title begins with, which then leaves the title, else its number in
  its list), its blurb (the first paragraph, as the renderer's own card has it: plain words, so a picture in it is its alt text and a formula its TeX; the page's description leaves both out) and its status line (the `>` lines under the activity line; with none, how
  many questions it holds; `status:off` hides it). An activity written under another with `parent:` is a card inside its
  parent's card. A module of one activity, or a bare activity, is a single card, taking the module's title, blurb and
  picture first (as the renderer does), and its page is that activity's page, with the module's opening above it. There
  is no page for a module of several activities: its section of the contents page is its page.
- **An activity's page** holds the activity (its tabs one after another, as in 0.1.0), a line above it linking to the
  contents, and a way on at its foot: **back**, **Contents** and **next**, in the booklet's reading order (its modules in
  file order, each module's activities as the format keeps them: a page before the ones under it). A page's `<title>` is
  the activity's title and then the booklet's. Hidden activities have no page.
- **The words** on the way on are the renderer's own "Back" and "Next" in the booklet's language, and the compiler's
  "Contents" (English, French and Spanish, like "On this page").

**The address, and the one that was not chosen.** An activity's page is at `<name>/<id>/`, the activity's id as the author
wrote it, made a plain address by the renderer's own `slugify` (`rd-tides` stays `rd-tides`). The module is not in the
address, because a booklet is usually one module and the author's own ids are what stay put: add an activity or a module and
no other address moves. The one case that changes an address is the author's own: two activities with one id in two modules
(an id belongs to its module) take their module's id in front (`week-1-intro`, `week-2-intro`), and two that differ only in
case, or are left clashing, take a number (`intro-2`). The rejected scheme is `<name>/<module>/<id>/` always: it never
moves an address, but it writes a folder the author did not choose into every address of the usual one-module booklet,
holds no place for the bare activities (which have no module id), and is two levels deeper than "a folder per activity
under the booklet's folder".

**A link that reaches another page goes there.** A link to a heading of another activity, to a module's tab, to a module of
the booklet, or to another activity's title is written as the address of the page it lives on and the id of the heading
(`../flour/#flour-and-water`, `../#go-further`), once every page has its ids; a link within a page stays within it. A link
to a heading that is nowhere is marked and drawn as its words, as before. A link to another booklet compiled in the same
run is to its contents page (`../other/`, or `../../other/` from an activity page). **A folder address needs a host that
serves a folder's `index.html`**, as any web server and any static site generator does; a page opened straight from the
disk (`file://`) has working links within itself, but a card or a way on opens the folder's listing, so look at a
many-page booklet through a server (for example `python3 -m http.server` in the output folder).

**Translations.** Booklets compiled in one run that carry **one front matter `id` and each its own `lang`** (SPEC.md section 9:
`tides.booklet.md` and `tides.es.booklet.md`) are linked to each other, page for page: an activity's page links the page
with the same **module id and activity id** in each translation (the id as the renderer keeps it, module first: `eggs/soft` pairs with
`eggs/soft`, not with `huevos/soft`, so a translation that renames its module ids is not paired page by page), and the contents page (or the one page of a one-page booklet) the others'.
Each page carries `<link rel="alternate" hreflang="es" href="…">` for every translation, itself among them, so search
engines and readers find the other language. The language is the front matter's `lang`, as the page's own language is read.
The address is relative (`../../tides.es/rd-tides/`), and whole with `--base-url`, which search engines ask for. A page the
other translation has no page for, and a group in which two booklets share a language (two versions, or a mistake), is not
linked; the report names the translations, how many of the booklet's pages were linked, and the pages that were not. The files must be compiled in one run; a translation in a run of
its own is not found.

**The site form** writes each page as a fragment under front matter, for a site generator's content folder
(`<out>/<name>/index.html`, `<out>/<name>/<id>/index.html`). Besides `title` and `description` a many-page booklet's
fragments carry `weight`, the page's number in the report's list (1 for the contents page), and a booklet with translations
carries `alternates`, a list of `hreflang` and `href`:

```
---
title: "A hard egg"
description: "Lower the egg into boiling water for ten minutes…"
weight: 3
alternates:
  - hreflang: "en"
    href: "../../eggs/hard/"
  - hreflang: "es"
    href: "../../eggs.es/hard/"
---
```

**To build the site's menu**, read the report: for each booklet it lists its pages in reading order, one numbered line each,
with the page's title (`--report <file>` writes it to a file), and the same number is each fragment's `weight`, so a
generator that sorts a section by weight (Hugo does) lists them in order with no more. A layout that prints the alternates
writes one `<link rel="alternate" hreflang="{{ .hreflang }}" href="{{ .href }}">` for each (the layout must escape the values
where it prints them, as for `title`). Every fragment also carries the page's own way on (the `bk-pager`), which a layout
that draws its own menu can hide with a rule of its own.

**A generator's own rules.** Jekyll, Eleventy and the like take the fragments as they stand: a contents page with the activity
folders beside it. **Hugo reads an `index` file as a leaf bundle, which holds no pages below it, so a many-page booklet's contents
fragment must be renamed `_index.html`** (a section page) for the activity folders beside it to be pages of that section. This
was written from Hugo's documentation and has not been run against a Hugo build here.

**Not built here.** A wiki written with `parent:` is pages under their parent where the format states it (cards inside the
card of their parent, the reading order a page before the ones under it), but a page-tree address (`<name>/<parent>/<child>/`)
and a breadcrumb of the ancestors wait for format 0.17.

**Stamped page by page.** The stamp guard (below) keeps each page apart: a rerun leaves a page tidied by hand as it is and
writes the booklet's other pages again, and the report says which it kept and how many others it wrote ("no page of the booklet
was written" when its only page, or every page, was tidied). Before it writes anything it looks at every path it will write: a
booklet whose folder (or page) is already a file, or whose page's place is already a folder, is refused whole with a line saying
which, and the other booklets are still written. The compiler never deletes a file: the page of an
activity that was renamed or removed stays in the output folder until it is deleted by hand.

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
  order, each under its title (a booklet of two or more shown activities draws them on pages of their own, above);
- an activity's tabs one after another, each under its name, and its pages run on with a quiet divider;
- rows, callouts of every kind in their own colour and icon, groups, and folds as `<details>` that open with no script;
- footnotes and citations as numbered marks, with the notes at the page's foot (source, edition, page, quote, verified);
- formulas as MathML, made at build time by the Temml copy inside `booklet.html`, so the browser draws them itself;
- images (below), tables, code, quotes, highlights, and links to headings on the same page;
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
  its places, figure by figure.

**Marked**: an HTML comment where the part stood, saying what it was and why, and a line in the build report's tidy-up
list. In 0.1.0 these are:

- query views (tables, lists, tiles, bars, lines, cards from data);
- diagrams, shown as their mermaid source in a code block;
- the body map's figure (its places are listed under it);
- a link to a booklet that is not compiled in the same run (drawn as its words; one that is, links to its page by its
  title);
- a question asked for each pick in another (`each:`);
- an unknown callout kind (drawn as a note, with the renderer's line saying the kind is not known; a callout of a kind
  the page has no look for takes the note's look folded or not), a widget engine the compiler does not draw, a widget
  that is missing, a broken citation mark, a booklet's own theme block;
- an image that is not drawn: its alt text and address are shown in its place.

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
  (character references are read first), no CSS `url()` that leads outside the file, no `image-set()`, `@import` or
  `expression()`, and no backslash (CSS can spell a word with one);
- nothing the reading cannot place: a processing instruction past the XML declaration, a DOCTYPE with entities, an
  unquoted value, a comment that never closes.

An SVG saved with an editor's own data or metadata carries other namespaces (Inkscape's `sodipodi:` and `inkscape:`,
Dublin Core's `dc:` in a `<metadata>` block, Adobe's `x:`), so it is refused until it is saved without them (Inkscape's
Optimized SVG, or an optimiser such as SVGO, takes them out). `test/compile-browser.js` opens a prefixed-script SVG directly in
Chromium with scripting on, to show the case is real, and checks the compiler copies no such file.

## The report, and tidying a page

Every run prints a build report for each file: where its pages went (a many-page booklet's, in reading order, numbered),
what was drawn (by count), the description it
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
| `compile.js` | the command, the two forms, images and the SVG check, the stamp, the pages of a booklet and its translations, writing, the report |
| `engine.js` | the renderer, loaded in a `vm` context (not a security boundary): the parse, the Markdown engine, Temml, icons and fonts; the records checks; author comments |
| `draw.js` | a design drawn as a page's markup (the plan for a many-page booklet, its cards and way on); what is drawn and what is marked (`COVERAGE`, `MARKED`) |
| `html.js` | the markup as nodes, written out as indented HTML a person can tidy |
| `booklet.css` | the stylesheet |

## Tests

All in `test/`, run by `test/run.sh` and CI:

| Test | What it checks |
| --- | --- |
| `compile-guard.test.js` | no second reader (no callout, fence, link, heading or other Markdown pattern of its own, as a pattern or a string test; tried first on made-up re-readings); the author-comment mark in one region only; every renderer name it uses exists; no code reaches the records; installs nothing, fetches nothing; writes only its pages |
| `compile-coverage.test.js` | every block type, question kind, widget engine and query view the renderer has is drawn or marked, from the very tables `draw.js` dispatches from; every callout kind in its look; every mark both a comment and a report line |
| `compile-golden.test.js` | the pages for the examples and page-shaped fixtures equal the committed ones in `test/compile-golden/`; `node test/compile-golden.test.js --write` refreshes them |
| `compile-content.test.js` | nothing lost (the design walked whole, every word counted on its page); records never published, and the records shapes refused; author comments left off; the image and SVG rules; the two forms' escaping and language; the page's ids; the stamp guard for pages and the stylesheet; the command's exits |
| `compile-css.test.js` | every colour and shared value is the renderer's; the fonts are booklet.html's faces; every class written has a rule |
| `compile-pages.test.js` | many pages: the address of each page and of a clash; every relative link on every page of every many-page booklet reaches a file and an id; no page is orphaned; the way on and the reading order; translations (hreflang in the head and in the front matter, relative and whole; a shared language or a missing page is not linked, and the report names the pages left unlinked); an activity called `index`, one whose id makes no folder name, and one called `page`; the site form's `weight`; a page tidied by hand kept page by page, and the report's words about it; a folder path that is a file refusing the booklet before anything is written; an image reached from every page |
| `compile-browser.js` | in Chromium with scripting off, every page of every booklet, and a journey through each many-page booklet served as a host serves a folder (each card opens its page, the contents link goes back, "next" reads every page in order and "back" returns, nothing 404s); at 1280 and 390 px, light and dark: no sideways scroll, every fold opens, only its own files load, the renderer's faces, the text's contrast; with scripting on, a prefixed-script SVG runs when opened directly and the compiler copies none |
| `compile-host-browser.js` | in Chromium, at 1280 and 390 px: each page on a plain host and on the same host with a hostile theme loaded after `booklet.css` (rules on bare elements, a `*` reset, `.wrapper ol` as numbered cards, and `!important` rules of one and two ids, among them `#main .content blockquote *`); every element inside the article keeps its computed values, its `::before`, `::after` and `::marker`, and its box; the theme is live around the article; the check fails with no guard, with the guard as it was before `!important`, and with `!important` but one id's weight |

`examples/mindful-check-in.booklet.md` is compiled by the content and browser tests but has no golden page, since its
notice names its author; the golden pages hold made-up content only.

## Versions

The compiler has a version of its own, as the submit build has. A change to the compiler alone merges like a change to
the renderer alone. A format release that changes what a page holds carries the refreshed golden pages in the same pull
request, and a new block type, question kind, engine or query view adds one drawer or one marked line to `draw.js`
(`compile-coverage.test.js` fails until it does).
