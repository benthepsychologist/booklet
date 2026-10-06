# Booklet

**A booklet is one Markdown file that holds a person's work *and* the design of the activities they did it in.**

Open it in a text editor and you can read everything, top to bottom — questions declared in plain lines, prose free to use every heading level, the reader's own answers set apart at the end. There is no account, no server, no database. You can email a booklet to yourself, drop it in a Dropbox or an Obsidian vault, print it, or hand it to a language model and say *"help me add an activity to this."*

```markdown
---
booklet: "0.11"
id: example/daily-note
title: A daily note
lang: en
version: "0.1"
---

# A daily note

> [!activity|journal repeat] How today went

> [!text|note] What happened?

%%
> [!records] App record — do not edit below this line

> [!records|journal] A daily note

```booklet entries journal
{"items": [
{"ts": "2026-09-27T08:00:00Z", "note": "Slept badly, but the walk helped more than I expected."}
]}
```
%%
```

This is **v0.11** of the format — see [`SPEC.md`](SPEC.md) for the full
format, and [`docs/why-markdown.md`](docs/why-markdown.md) for how it was
arrived at: what the wider Markdown-tooling field already does, what Booklet
needs that nothing else supplies, and why each real choice landed where it
did.

---

## The three parts, and why they are separate

This is the distinction the whole design rests on, and it is easy to get backwards.

| | what it is | where it lives |
| --- | --- | --- |
| **The renderer** | one static HTML file. It holds **engines** — the ability to make an SVG's regions clickable, to lay out a grid of selectable words, to open cards one at a time — and its own interface strings. **It holds no activities and no content.** | this repo |
| **The booklet** | the file above. Every activity, every question, every word a reader sees, and everything they wrote. **All state lives here.** | the reader's device |
| **The registry** | the one place the renderer fetches modules from: [`booklet-registry`](https://github.com/benthepsychologist/booklet-registry), a separate repo. The renderer stores no module and starts with none. | a separate repo |

**The renderer is not a content store or source of truth.** It is rendered
output — a viewer. This reference implementation caches in-progress work in the
browser so a closed tab is recoverable, but the portable artifact is the
booklet file and the format does not require browser storage. Hand the renderer
a booklet and it draws that booklet. Hand it activities it has never heard of
and it draws those too, as long as they use engines it has.

---

## The vocabulary

- **Module** — one activity, whole and portable: its questions, its own wording in each language, and the widgets it draws with. You add a module to a booklet or take one out; that is the difference between "take this whole booklet or none of it" and "add this one activity to what I already have."
- **Widget** — *data*, never code, that specialises an engine: the figures and region names for a body map, the axes and cells for a grid. Widgets ride inside the booklet, so an activity never arrives without the thing it draws with.
- **Engine** — the drawing ability the renderer provides. Two so far: `svg-regions` and `grid-select`.
- **Question** — one line, `> [!kind|id] Title`, in the kinds `text`, `long`, `lines`, `choice`, `multi`, `scale`, `number`, `date` and `widget`. Every activity is drawn the same way, whatever it is — there is no bespoke view for any activity in a conforming renderer.

**Nothing is addressed by position, with one exception.** Modules are found by `id`, kept entries by their timestamp. Where a thing *appears* is written order; written order decides anything only when no sibling carries an order at all. The exception: a choice or scale question stores its answer as the option's *position*, not its words, because a translation is a separate file and only a position is guaranteed to match across languages — see [`SPEC.md`](SPEC.md).

**The record is a series of independent JSON blocks, not one object.** A block that will not parse costs you that block and nothing else — one mangled module means one missing activity, never a lost file.

---

## What is in this repo

| | |
| --- | --- |
| [`booklet.html`](booklet.html) | **the renderer.** One static file, no build step, nothing to install or fetch to open it. Draws mermaid diagrams and typesets math with two MIT-licensed libraries stored inside it (see below). Reads v0.3 only — no earlier format opens |
| [`SPEC.md`](SPEC.md) | the current format (v0.11), versioned and published separately from anything that implements it |
| [`docs/hosting.md`](docs/hosting.md) | for someone who serves the renderer and wants a reader's work saved: the `window.Booklet` interface a host's own script uses, the store contract, and how to check a host serves the real file |
| [`docs/why-markdown.md`](docs/why-markdown.md) | what shaped v0.3 (the design the later versions kept): the field surveyed, the aims, the choices made and rejected |
| [`SKILL.md`](SKILL.md) | instructions to hand an AI agent so it can make a valid booklet from a plain request; `test/skill.test.js` keeps its examples true |
| [`lint-booklet.py`](lint-booklet.py) | the reference validator — "is this file valid" |
| [`examples/`](examples/) | complete booklets you can open: `how-tides-work` (reading, a citation, a quiz that says right or not), `mindful-check-in` (widgets, a module's notice and its own data section), `garden-week` (a theme and rows), `status-page` (tiles, a grouped list, tables and charts from data), `project-board` (row roles, a nested list, a question a reader can add to) |
| [`test/`](test/) | the suite, run with `test/run.sh` |
| [`booklet-registry`](https://github.com/benthepsychologist/booklet-registry) | a separate repo: the modules on offer and the `registry.json` that lists them |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | how to add an activity |

If you serve the renderer yourself and want a reader's work saved somewhere other than their browser, read [`docs/hosting.md`](docs/hosting.md). The published `booklet.html` never sends anything; a host adds one script of its own and talks to the renderer through `window.Booklet`, and the renderer hands a booklet to a host only when the page is on the reader's own machine or private network and only after the reader presses Allow.

## Try it

Download `booklet.html` and `examples/how-tides-work.booklet.md`, open the HTML file in a browser —
**straight off your disk, `file://` is fine** — and press *Add a booklet from a file*
on "Your booklets" to open the markdown file. No server, no install, no network: verified with `fetch` and
`XMLHttpRequest` stubbed to fail.

**Themes and width.** The renderer has four built-in themes the reader picks from a menu in the top bar:
Paper (the default look), Daylight (white), Night (dark) and Contrast (high contrast, light). *Auto* is the booklet's own
look if it asks for one (a `booklet theme` block: strict named values, never CSS), otherwise the device (more
contrast, then dark, then Paper); any explicit pick wins, and the choice is remembered in the browser only. Printing is always light. The page is wide: the content area runs
to about 76rem, prose stays at a readable measure (about 70 characters), and tables, tiles, charts (bars and a line, drawn from data or from a reader's own answers), grouped lists and
figures use the width and fold to one column on a phone.

**Views.** A `booklet query` draws a data block's rows, or a reader's kept entries, as cards, a table, a list, tiles, bars or a line. Every view draws a row from the same five **roles** (`label`, `value`, `note`, `badge`, `tone`, each read from the field of that name unless the query names another), so rows written with those names need only `from:` and `as:`. Tiles with no value are a strip of pills. One **Sort and filter** control, the same on every view and drawn when there are more than eight rows, lets a reader search, show one value of a field and sort on screen; it is kept in memory only, never in the file. A booklet's `density` sizes the views as well as the prose.

A module file (any v0.11 module, such as those in `booklet-registry`) loads as what it is, one activity: on
"Your booklets" it starts a new booklet holding it. A module may carry its own notice (licence, copyright, source, version), which Add a module writes into the booklet and the page shows under "About this module". A booklet has one name, its own front matter's `title:`, which a reader can rename on its home screen or in "Your booklets".

A tool that writes booklets should ask the linter for the marker (`python3 lint-booklet.py --marker` prints the front-matter line a file should carry) and not hard-code it. A file marked with another `0.x` version still opens, by the current rules and with a notice, and nothing before v1.0 is promised to keep working; the renderer fetches no address a file names (an image, a diagram's image or style, a font).

A plain Markdown file with booklet front matter (`booklet: "0.11"`, a `title`) and no booklet lines at all is
already a readable booklet: it is one activity, named by the title. This is how a generated report, a weekly
status or a run's acceptance report, can be read in the renderer. A page that only reads (no question, no
widget, no query) and has at least two sections opens **folded**: each section shows its heading and its first
paragraph and opens on a click, with "Open everything" and "Fold everything" above them and a dot in the left
menu for each section opened. Each page of an activity decides for itself, so one activity can fold its prose
pages and draw its last page, with the questions, open; an activity that repeats never folds. The choice is kept in the browser only. HTML comments (`<!-- … -->`) are not
drawn, and tables are styled.

A file added from "Your booklets" is always a booklet of its own, in the list. The
renderer has no way to load a file into a booklet that is already open.

**Diagrams and math.** The renderer draws a ```` ```mermaid ```` fence as SVG and
typesets `$…$` and `$$…$$` as MathML. It does this with mermaid (tiny build)
and Temml, both MIT, kept inside `booklet.html` as inert text and woken the
first time a booklet has a diagram or a formula. A booklet with neither never
runs them, and nothing is fetched, so the file still works straight off disk
and under a strict Content-Security-Policy. Their versions, source addresses
and checksums are in the comments above them in the file, and in `NOTICE`.

**What the renderer refuses in a diagram.** Mermaid can ask the network for an address its own
source names, even in its strictest mode, and the renderer fetches nothing a file names (`SPEC.md`
section 6). So it reads each diagram's source as text first (`diagramRisk` in `booklet.html`) and shows
a diagram it cannot rule out as its source in a code block, under one line saying it is not drawn;
mermaid never sees it. It refuses, as a broad class and not a parse of mermaid: a `%%{ … }%%` directive;
mermaid's own front matter; an `@{ … }` shape block that carries an image, icon, address or link, or a key
outside the plain ones; the words `img`, `icon`, `image`, `src`, `href`, `url`, `link`, `links`, `sprite` or
`properties` written as a key; a line that opens with `click`, `callback`, `link`, `links` or `properties`;
`![` in a label; an HTML tag other than the plain ones (`br`, `b`, `i`, `u`, `s`, `strong`, `em`, `sub`,
`sup`, `small`, `code`, with no attributes); an HTML or mermaid character entity; `://`; a CSS function
that fetches (`url(`, `src(`, `image(`, `image-set(`, `cross-fade(`, `element(`, `paint(`, `expression(`,
`local(`) or an at-rule; a `style`, `classDef` or `linkStyle` line with anything outside letters, digits,
spaces and a few punctuation marks; and a backslash that touches no bracket or slash (CSS reads `\75 rl(`
as `url(`). A formula is typeset with `\includegraphics` and `\href` switched off. Why a broad refusal: a
diagram that passes is still drawn by a library started in its strict mode, with HTML labels off,
behind the page's Content-Security-Policy, and a gap in the list is a gap in what the page asks for.
`test/mermaid-browser.js` draws a corpus of diagrams and a matrix of probes with a request counter, so a
gap shows there. **Whenever the vendored mermaid changes, probe it again** (run that test, and read what
the new version can fetch before trusting the list).

The renderer opens **empty**, because it holds no booklet of its own. That is
the property everything else here rests on.

**Send or save a copy** offers one thing, **Download a copy**: the booklet as
its `.md` file. The renderer adds no storage service and never contacts Mail,
Drive, Dropbox or another destination itself.

### How "it holds no content" got demonstrated

The renderer arrived here carrying six things it should not have: a two-language
reader's guide on the psychology of emotion, a block of Canadian crisis-line
numbers, one practice's feeling and body vocabulary as defaults, a stylesheet
and colour map keyed by that vocabulary, a namespace, and a URL into a private
repository. None of it was a bug — it all worked. But every one of them was the
engine knowing something only a booklet should know.

They came out one at a time, and each became a capability instead: a guide is
now an activity built from ordinary questions; crisis resources left the
renderer altogether, which is not a clinical tool; cell colours and cell names are both the
widget's; a legacy-file rescue path that named two specific widgets now resolves
by engine. The renderer lost about 26KB and gained the ability to draw somebody
else's booklet.

**The fixtures here are how that claim is kept honest.** A desk check and an
effort/impact grid — deliberately nothing to do with the practice the renderer
was written for, because a suite built only from its author's own activities
cannot tell "holds nothing" apart from "holds exactly these". The first run
against them found two more couplings the old suite never could: an empty state
pre-seeded with four particular cell ids, and question wording hard-coded to
three scope names, which had quietly meant a *new* activity could never word its
own questions.

---

## Putting the renderer on a site

`booklet.html` needs nothing from a host: copy it anywhere and it works. It has
one setting, and it is not part of the format: where "Add a module" looks for
modules. That is one line in the page's `<head>`:

```html
<meta name="booklet-registry" content="https://raw.githubusercontent.com/benthepsychologist/booklet-registry/main/registry.json">
```

A site changes that one line to point at another registry. With the tag missing or
empty, "Add a module" shows its "no modules" message and nothing else changes. A
module's `file` path in the registry resolves relative to the registry's own address.

**The renderer carries its own Content-Security-Policy** (renderer 0.11.6): a
`<meta http-equiv="Content-Security-Policy">` tag directly after the charset tag, so
the block is in the file itself and a copy opened from disk, or served by any host,
has it. It lets the page run only its own scripts (named by their sha256, so an
injected script does not run), draw images only from `data:` and `blob:`, and connect
only to the page's own origin and `https://raw.githubusercontent.com`. A **registry**
must therefore be on the page's own origin or on `raw.githubusercontent.com`, and the
origin of the module files it lists likewise; a **store** (below) and a **host's
script file** (`docs/hosting.md`) must be on the page's own origin. A host's own
header adds a second policy and both apply, so a host can only tighten it. A host that
needs anything else must edit the renderer's policy, which changes the file's
checksum, and then run `node test/csp-hash.js --write booklet.html` to recompute the
script hashes.

### Opening a booklet by link

A host that serves a folder of booklets can let a link open one. It adds one more line to its own copy of the page
(the shipped `booklet.html` has none, so it has no store):

```html
<meta name="booklet-store" content="https://example.org/booklets/">
```

The address is the folder, absolute or relative to the page. Two links then work, and both ride in the part after the
`#`, which a browser never sends to a server:

- `#/open/<name>` opens `<store>/<name>`, for example `#/open/reports/week.booklet.md`.
- `#/module/<id>` opens the module with that id from the registry the page already declares (the list "Add a module"
  reads) as a booklet of its own.

A link carries a name, never an address. A name is checked before anything is requested: after one decoding it may hold only
letters, digits, `-`, `_`, `.` and `/`, with no empty part, no `.` or `..` part, no leading `/`, at most 200 characters, and
it must end in `.md`. A module id must be one the registry's own list names. Anything else is refused with a plain message
and nothing is requested. So a link cannot name a host, a scheme or a way out of the folder, and only the page's own tag can
declare a store: not a booklet's front matter, not a link, nothing kept in the browser.

What opens is read once, as text (a plain read: no method, no body, no credentials, no redirect, at most 5 MB, 15 seconds),
and then goes through the same parser as a file picked by hand, with the same refusals and notices. It opens with its records,
if the file has them. When the browser keeps nothing for the link it opens as a view, and joins "Your booklets" only when the
reader changes something in it. In one browser a store name is one booklet, and so is a module link: opening one the browser
already keeps opens that booklet, never a second. The page remembers a short fingerprint of the file the kept booklet was
last read from; if the file now is different, it offers "Read the newer file", and nothing changes until the reader presses.
Reading it never loses the reader's work: with a host registered the store file is the truth, otherwise the new file's body
is taken and the reader's own answers, entries and drafts stay (a module link updates the module in place, as Add a module
does). A quiet line at the top says where the booklet came from ("Opened by a link, from this page's own store: reports/week.booklet.md")
and can be dismissed. The page reads the link when it starts and whenever the fragment changes, and the link stays in the
address bar, so a reload opens the same thing.

The store must be on the page's own origin: the renderer's own Content-Security-Policy lets it read only that origin and
`raw.githubusercontent.com` (see "Putting the renderer on a site"), and a host's header can only tighten that, so a host's
header must also allow the store's origin, which is the page's own. Nothing a reader writes is ever sent: the link is a read, and the pledge tests
(`test/guard.test.js`, `test/pledge-browser.js`) pin that.

### Language and storage

The language a reader picks, on "Your booklets" or in any booklet, is that
browser's choice for every page of the origin: it is kept in `localStorage`
under `booklet.ui.lang`, apart from every booklet's data, and a reload keeps
it. Nothing is stored for the reader until they choose. A booklet opens in the
reader's choice whenever it offers that language; Spanish takes a booklet's own
`es-AR`. With no choice, a page opens in English, and a booklet in the language
it was saved in. A booklet that does not offer the language in force opens in
its own, and a booklet that declares one language always reads in it.

The page opens on "Your booklets", the list of every booklet kept in that
browser. The address is read for one thing only: a link a host's own page declares support for (see "Opening a booklet by link"), never written. Each booklet keeps its own
answers, and a first visit shows the empty list.

Booklets kept in the browser live in its local storage, which a browser may clear (Safari clears what a
page's script wrote for a site not used for seven days, unless the site is added to the home screen; Chrome and
Firefox may when the disk is short). So the first time in a session that the page saves a booklet (after something
the reader did, never at page load) it asks the browser to keep the site's storage, once, with
`navigator.storage.persist()`; Firefox may ask the reader. That call is to the browser about its own storage and
sends nothing anywhere, so it is not a request in the pledge's sense. When at least one booklet is kept and the
browser has not promised to keep the storage, "Your booklets" says so in one quiet line, with the two things a
reader can do: download a copy, or add the page to the home screen.

The renderer only ever calls `localStorage.getItem`, `setItem` and
`removeItem`, on a few known keys (`booklet.library.v1` for the list,
`booklet.b.<id>` for each booklet), and never lists the store. So a page that
namespaces those calls per booklet, by prefixing every key, can run several
independent booklet instances on one origin without their data colliding.

---

## Registries

A **registry** is one JSON file listing modules somebody offers, with enough in
each entry to draw a menu. The renderer reads exactly one, named by the `booklet-registry` meta tag in its
`<head>`, which ships pointing at
[`booklet-registry`](https://github.com/benthepsychologist/booklet-registry),
straight from its public repo, which takes additions by pull request. "Add a
module" fetches that `registry.json` fresh each time it opens, and Add fetches
the chosen module's file fresh. Nothing about a module is cached or kept outside
the booklet that added it. A site points the renderer at another registry by changing that one tag; there
is no way to add a module file of your own.

See [`SPEC.md`](SPEC.md) for the format and [`CONTRIBUTING.md`](CONTRIBUTING.md)
for how to add to this one.

**This registry is an index, not an endorsement.** It carries format
demonstrations, general-purpose activities, and attributed professional content
whose ownership and distribution terms travel in its `rights` block. A listing
does not certify that a module is suitable, safe, or useful for a particular
person. Anyone may publish a separate registry under their own policy; a site can point the renderer at it.

---

## Status

**v0.11, draft.** `SPEC.md` (Markdown-native) is the whole format. There is no
independent second implementation yet. It is not stable: draft compatible
additions may extend it without changing its own number, and a breaking
change gets a new one. See `STATUS.md` for the detailed current state and
known gaps, and `docs/why-markdown.md` for how v0.3 came to be.

### What is licensed how

**The software and the format** — the renderer, the validator,
`SPEC.md` — are Apache-2.0, and that is the point: a format meant to
be implemented by other people carries an explicit patent grant, so anyone
writing a reader or writer for it gets that protection along with the copyright
permission.

**Module and widget content is not.** A module is prose, and prose belongs to
whoever wrote it. A module in this repository that declares no `rights` is
contributed under the repository's Apache-2.0 terms like the code; a module
that declares `rights` is offered on the terms it states, and those terms
travel with it into every booklet that carries it.

That distinction is deliberate. Some of what this registry offers is written by
a named professional and is not free to modify, and the format has somewhere to
say so.

Released under the [Apache Licence 2.0](LICENSE) — which, for a format meant to be implemented by other people, is the point: it carries an explicit patent grant, so anyone writing a reader or writer for this format gets that protection along with the copyright permission.
