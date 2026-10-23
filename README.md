# Booklet

**A booklet is one Markdown file that holds a person's work *and* the design of the activities they did it in.**

Open it in a text editor and you can read everything, top to bottom — questions declared in plain lines, prose free to use every heading level, the reader's own answers set apart at the end. There is no account, no server, no database. You can email a booklet to yourself, drop it in a Dropbox or an Obsidian vault, print it, or hand it to a language model and say *"help me add an activity to this."*

```markdown
---
booklet: "0.13"
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

```booklet entries journal
{"items": [
{"ts": "2026-09-27T08:00:00Z", "note": "Slept badly, but the walk helped more than I expected."}
]}
```
%%
```

This is **v0.13** of the format — see [`SPEC.md`](SPEC.md) for the full
format, and [`docs/why-markdown.md`](docs/why-markdown.md) for how it was
arrived at: what the wider Markdown-tooling field already does, what Booklet
needs that nothing else supplies, and why each real choice landed where it
did.

---

## The three parts, and why they are separate

This is the distinction the whole design rests on, and it is easy to get backwards.

| | what it is | where it lives |
| --- | --- | --- |
| **The renderer** | a core, `booklet.html`, plus `parts/` beside it (or the one-file build, which holds both in one static HTML file). It holds **engines** — the ability to make an SVG's regions clickable, to lay out a grid of selectable words, to open cards one at a time — and its own interface strings. **It holds no activities and no content.** | this repo |
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
| [`booklet.html`](booklet.html) | **the renderer.** The core, plus `parts/` beside it (or the one-file build, `node test/one-file.js`): nothing to install to open it, and opening a file asks the network for nothing but its own parts, and only when a booklet needs one. Draws mermaid diagrams and typesets math with two MIT-licensed libraries, Temml inside the core and mermaid in `parts/mermaid.js` (see below). Reads v0.3 only — no earlier format opens |
| [`SPEC.md`](SPEC.md) | the current format (v0.13), versioned and published separately from anything that implements it |
| [`docs/hosting.md`](docs/hosting.md) | for someone who serves the renderer and wants a reader's work saved: the `window.Booklet` interface a host's own script uses, the store contract, and how to check a host serves the real file |
| [`submit/`](submit/) | the submit build, never the published file: `node submit/build.js --endpoint <url>` makes `booklet-submit.html`, the one-file renderer with a Submit button that sends a reader's answers to the one address it was built with, on the reader's press (`docs/hosting.md`, "The submit build") |
| [`docs/why-markdown.md`](docs/why-markdown.md) | what shaped v0.3 (the design the later versions kept): the field surveyed, the aims, the choices made and rejected |
| [`CHANGES.md`](CHANGES.md) | what changed in each version of the format, newest first; `SPEC.md` states the rules as they are and keeps no history |
| [`SKILL.md`](SKILL.md) | instructions to hand an AI agent so it can make a valid booklet from a plain request; `test/skill.test.js` keeps its examples true |
| [`lint-booklet.py`](lint-booklet.py) | the reference validator — "is this file valid" |
| [`examples/`](examples/) | complete booklets you can open: `how-tides-work` (reading, a citation, a quiz that says right or not), `mindful-check-in` (widgets, a module's notice and its own data section), `garden-week` (a theme and rows), `status-page` (tiles, a grouped list, tables and charts from data), `project-board` (row roles, a nested list, a question a reader can add to) |
| [`art/`](art/) | the pictures the renderer carries: a pinned Lucide subset and Booklet's own spot drawings, with their licences; `node test/art-sprite.js --write booklet.html` turns them into the renderer's hidden sprite |
| [`test/`](test/) | the suite, run with `test/run.sh` |
| [`booklet-registry`](https://github.com/benthepsychologist/booklet-registry) | a separate repo: the modules on offer and the `registry.json` that lists them |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | how to add an activity |

If you serve the renderer yourself and want a reader's work saved somewhere other than their browser, read [`docs/hosting.md`](docs/hosting.md). The published `booklet.html` never sends anything (a host that needs a reader's answers sent to one address builds a separate file for it, the submit build in `submit/`); a host adds one script of its own and talks to the renderer through `window.Booklet`, and the renderer hands a booklet to a host only when the page is on the reader's own machine or private network and only after the reader presses Allow.

## Try it

Download `booklet.html` with its `parts/` folder beside it and `examples/how-tides-work.booklet.md`, open the HTML file in a browser —
**straight off your disk, `file://` is fine** — and press *Add a booklet from a file*
on "Your booklets" to open the markdown file. No server, no install, no network beyond the renderer's own `parts/mermaid.js`, and only for a booklet with a diagram; without `parts/` a diagram shows its source.

To have the renderer as one file instead, with every part inside it, make the one-file build: in a clone of this
repository, `node test/one-file.js` writes it to `build/booklet.html` (it needs only node). From v0.13.1 each [GitHub release](https://github.com/benthepsychologist/booklet/releases) attaches the one-file build as an asset, and `node test/one-file.js` still makes it from a clone.

**Themes and width.** The renderer has four built-in themes the reader picks from a menu in the top bar:
Paper (the default look), Daylight (white), Night (dark) and Contrast (high contrast, light). *Auto* is the booklet's own
look if it asks for one (a `booklet theme` block: strict named values, never CSS), otherwise the device (more
contrast, then dark, then Paper); any explicit pick wins, and the choice is remembered in the browser only. Printing is always light. The home screen, a module's screen and its activities are one centred column, about 48rem
wide (a wiki's pages run wider, to about 76rem, beside the wiki's menu); prose stays at a readable measure (about 70 characters), and tables, tiles, charts (bars and a line, drawn from data or from a reader's own answers), grouped lists and
figures use the column's width and fold to one column on a phone.

**Views.** A `booklet query` draws a data block's rows, or a reader's kept entries, as cards, a table, a list, tiles, bars or a line. Every view draws a row from the same seven **roles** (`label`, `value`, `note`, `badge`, `tone`, `link`, `icon`, each read from the field of that name unless the query names another), so rows written with those names need only `from:` and `as:`. `link` (where the row leads) and `icon` (its picture) are drawn by tables, lists, tiles and cards. Tiles with no value are a strip of pills. One **Sort and filter** control, the same on every view and drawn when there are more than eight rows, lets a reader search, show one value of a field and sort on screen; it is kept in memory only, never in the file. A booklet's `density` sizes the views as well as the prose.

A module file (any v0.13 module, such as those in `booklet-registry`) loads as what it is, one activity: on
"Your booklets" it starts a new booklet holding it. A module may carry its own notice (licence, copyright, source, version), which Add a module writes into the booklet and the page shows under "About this module". A booklet has one name, its own front matter's `title:`, which a reader can rename on its home screen or in "Your booklets".

A tool that writes booklets should ask the linter for the marker (`python3 lint-booklet.py --marker` prints the front-matter line a file should carry) and not hard-code it. A file marked with another `0.x` version still opens, by the current rules and with a notice, and nothing before v1.0 is promised to keep working; the renderer fetches no address a file names (an image, a diagram's image or style, a font).

A plain Markdown file with booklet front matter (`booklet: "0.13"`, a `title`) and no booklet lines at all is
already a readable booklet: it is one activity, named by the title. This is how a generated report, a weekly
status or a run's acceptance report, can be read in the renderer. Its headings are drawn as headings, and **nothing is
folded** that the file does not fold: a long report is split into pages with `***` (Back, "Page 2 of 3" and Next at the
foot), or into tabs for parts that differ in kind, and a callout written folded (`> [!note]-`) stays folded, with one
Open all switch on a screen that has any (see "What the renderer draws that a file does not say", below). HTML comments (`<!-- … -->`) are not
drawn, and tables are styled.

A file added from "Your booklets" is always a booklet of its own, in the list. The
renderer has no way to load a file into a booklet that is already open.

**Diagrams and math.** The renderer draws a ```` ```mermaid ```` fence as SVG and
typesets `$…$` and `$$…$$` as MathML. It does this with mermaid (tiny build)
and Temml, both MIT. The renderer is a core and its parts: Temml is kept inside
`booklet.html` as inert text and woken the first time a booklet has a formula, and
mermaid is the file `parts/mermaid.js`, which sits beside `booklet.html` and is
loaded the first time a booklet has a diagram. A booklet with neither never runs
them and makes no request: opening a file asks the network for nothing except the
renderer's own parts, from where it came, and only when a booklet needs one. A build can always make
the renderer one file again (`node test/one-file.js` writes `build/booklet.html` with
every part inside it). Straight off disk, keep `parts/` beside the file or use the
one-file build; a diagram whose part is not there shows its source under a short note.
Under a strict Content-Security-Policy that allows the page's own scripts (`script-src 'self'`) it works the
same. The versions, source addresses and checksums are in the comments above them in the
file, and in `NOTICE`.

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

**Browsers.** The renderer needs a browser from 2023 or later: Safari 16.4 (the first on which its script even parses, because the Markdown and diagram patterns use regex lookbehind), Chrome and Edge 111, and Firefox 121. The newer floor for Chrome, Edge and Firefox is the stylesheet and script's use of `color-mix()` and `:has()`. The renderer carries no fallbacks for older browsers.

The renderer opens **empty**, because it holds no booklet of its own. That is
the property everything else here rests on.

**Download a copy** (the bar's button) downloads the booklet as its `.md` file at once, in one
click, with no dialog. The renderer adds no storage service and never contacts Mail,
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

## What the renderer draws that a file does not say

`SPEC.md` says what a file may say. These are the reference renderer's own drawing choices, and another renderer may draw them differently.

- **A hint or a solution** that is folded with `-` and sits right after a question is drawn inside that question's own block, as a small control each, the hint first, as the author wrote them. Shut, they give nothing away. One that is not folded stays a row of its own.
- **A hint never opens by itself.** A solution opens by itself under the reader's answer: for a `choice`, as soon as an option is picked; for a `multi`, when Check is pressed (only a question with a right answer, an `[x]` option, has Check). With a right answer it takes the good tone when the answer is right, and the warn tone with "Look again" when it is not. A `choice` with no right answer opens in a neutral tone on a pick. A `multi` with no right answer has no Check, so its solution opens only on request, as it does for every other question kind.
- **A callout folded with `-`** shows the first words of its text under its title. A hint or a solution shows only its name while it is shut, so a closed one gives nothing away.
- **A folded callout of a kind with no colour of its own** (a `group`, or a kind with no colour of its own) is drawn on plain paper with no tint and no picture of its own. An untitled one is called "Note". Kinds the renderer draws keep their colour and picture.
- **An activity's card** shows the activity's first paragraph under its title, read as inline Markdown as a module card's blurb is. An activity with no paragraph shows its title alone. The card counts what is inside: its folded reads, its questions, and where the reader is ("3 reads · 6 questions · Not started").
- **An unfolded `group`**, or a kind with no colour of its own, is drawn as a `note` is.
- **Tabs** are a tab bar at the top of the activity's column, under its title and opening, drawn for two or more tabs; on a narrow screen it scrolls sideways inside itself. A module's tabs are a bar above its list of activities.
- **Pages** are turned at the foot: Back, "Page N of M" and Next, in the one row that one at a time's Back and Next also use.
- **The frame** (the prose before the first question) stays whole above the step when the questions are taken one at a time, whatever its length. When they are all shown, it is held under the top bar while they scroll if it fits whole in the pin's height (`--pin-h`: the lesser of 7.5em of its text and 22% of the window's height); taller, it is reading: it scrolls with its page, nothing cut. A box the keyboard moves to is scrolled clear of the bar and the frame.
- **Fonts.** Headings are set in Lexend and body text in Atkinson Hyperlegible, unless the theme's `font` says otherwise.
- **Nothing is folded but what the author folded.** A screen holding callouts folded with `-` (other than a hint or a solution) has one switch, Open all, that opens or folds exactly those; the reader's choice is kept per booklet in the browser.

---

## Putting the renderer on a site

`booklet.html` needs nothing from a host except that `parts/` is served beside it (or serve the one-file build): copy the core plus `parts/` anywhere and it works. It has
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
if the file has them. For a store booklet the store's file is the truth, and what the browser keeps of it is only a buffer for
work the store may not have yet. It joins "Your booklets" as soon as it has been read, as a pointer (its name and title, no copy
of its content); a copy is kept only once the reader changes something, and beside it a small base: the answers, entries and
drafts (never the body) of the file it is based on, which is the file it last read, or the text the host last said it saved.
Opening it again, by its link or from the list, reads the store's file afresh and draws it, and drops the kept copy, when the
kept copy changes nothing of the booklet itself (a rename inside it, a module added or removed, which the store does not take)
and either nothing has changed here since the base, so that whatever the file now holds is drawn (work another device saved
just appears), or the kept copy and the file hold exactly the same work. That is decided on content when the booklet opens, so
it holds whether or not the host has registered yet. Otherwise the kept booklet opens, with "Read the newer file" offered if
the file changed since it was last read, and nothing changes until the reader presses. Rename in the list gives a store
booklet a name of its own there and changes nothing else. A module link opened by hand is a view that joins the list only
when the reader changes something in it. While a file is being read, the page says "Opening <name>…". In one browser a store
name is one booklet, and so is a module link: opening one the browser already keeps opens that booklet, never a second.

Reading the newer file takes its body, with one rule for the records whether a link found the file or the host pushed it (a
module link instead updates the module in place, as Add a module does). With a host registered, the two are merged place by
place against the base: what changed here and not in the file is this browser's; what changed in the file and not here is
the file's (another device's newer answer, an entry it added); what changed on both is this browser's, since the reader is
looking at it and pressed Read, except that something removed here (an answer cleared, an entry deleted, a draft
emptied) and changed in the file since stays, with the file's change; removed here and unchanged in the file, it stays
removed. When a generator has moved an activity to another module, the move is read from the new file's design by the rule
the box's store uses for its records (`storefile._retarget`): work kept under a module the design no longer has, whose
id is also the id of an activity in the new design (one inside a module), goes to the module that now holds that
activity, when every activity the store's records there name now lives in that one module (the activities only this
browser's unsent work names do not count, since the store decided without them). A module that still exists keeps its work
even if some of its activities moved, and a module line with no id is no module to the store, so nothing is moved into
one. Work left under a module the new design no longer has (a move the rule refuses, or a module the generator removed) is
written back as records kept as written under its old records line, beside the store's own records kept that way, and so
survives exactly as they do; it is no longer shown, since no module holds it. A kept copy with no base (one an older release
kept) is merged the older way, once: what holds something here wins and the file fills in the rest. The host then saves the
result. With no host, the reader's own answers, entries and drafts stay as they are.
A quiet line at the top says where the booklet came from ("Opened by a link, from this page's own store: reports/week.booklet.md")
and can be dismissed. The page reads the link when it starts and whenever the fragment changes, and the link stays in the
address bar, so a reload opens the same thing.

The store must be on the page's own origin: the renderer's own Content-Security-Policy lets it read only that origin and
`raw.githubusercontent.com` (see "Putting the renderer on a site"), and a host's header can only tighten that, so a host's
header must also allow the store's origin, which is the page's own. Nothing a reader writes is ever sent: the link is a read, and the pledge tests
(`test/guard.test.js`, `test/pledge-browser.js`) pin that.

### Language and storage

The language a reader picks on the EN / ES / FR toggle, which shows on "Your
booklets" and in every booklet, is that browser's choice for every page of the
origin: it is kept in the browser under `booklet.ui.lang`, apart from every
booklet's data, and a reload keeps it. Nothing is stored for the reader until
they choose. The renderer's own words follow that choice whatever a booklet
says (SPEC.md §9); a choice of Spanish reads a booklet whose `lang` is `es-AR`
in its own `es-AR`. With no choice, a booklet reads in its own `lang` where the
renderer has strings for it (`es-AR` has its own; another variant reads its
language's), and in English otherwise; "Your booklets" reads in English.

The page opens on "Your booklets", the list of every booklet kept in that
browser. The address is read for one thing only: a link a host's own page declares support for (see "Opening a booklet by link"), never written. Each booklet keeps its own
answers, and a first visit shows the empty list.

Booklets kept in the browser live in its storage for the site: one IndexedDB database, `booklet`, which holds what
the browser allows a site (on a computer, hundreds of megabytes), or local storage (about 5 MB) where the browser
refuses IndexedDB, and "Your booklets" then says so. The page reads it once when it opens, before its first screen,
and writes each change behind; what an earlier release kept in local storage is moved into IndexedDB on the first
visit, and removed from local storage only once the browser has confirmed the copy; a booklet an earlier
release's tab, still open, changes after that keeps whichever change is later. A store that is full, or fails,
is named as such, and the work stays for the visit. A browser may clear this storage (Safari clears what a
page's script wrote for a site not used for seven days, unless the site is added to the home screen; Chrome and
Firefox may when the disk is short). So the first time in a session that the page saves a booklet (after something
the reader did, never at page load) it asks the browser to keep the site's storage, once, with
`navigator.storage.persist()`; Firefox may ask the reader. That call is to the browser about its own storage and
sends nothing anywhere, so it is not a request in the pledge's sense. When at least one booklet is kept and the
browser has not promised to keep the storage, "Your booklets" says so in one quiet line, with the two things a
reader can do: download a copy, or add the page to the home screen.

The renderer reaches what it keeps only through three functions of its own
(`lsGet`, `lsSet`, `lsDel`), on a few known keys: `booklet.library.v1` for the
list (kept in IndexedDB as one record per booklet under a head), `booklet.b.<id>`
for each booklet, `booklet.base.<id>` for a store booklet's base (the records
last read from or saved to its file, which tell what changed on each side), and
`booklet.ui.*` for the reader's preferences. Two of them, the theme and the
reader's yes to a host (`booklet.host.allowed`), are mirrored in local storage
for the read made before the store is read, and a count there, `booklet.tick`,
tells another tab showing "Your booklets" that the list changed. The keys live in one IndexedDB
database whose name is fixed, `booklet` (no setting names it), and when the page
starts it lists local storage once, through `key()` and `length`, to move the
keys an earlier release left there.

Up to 0.13.0, a page that wrapped the renderer's `localStorage.getItem`,
`setItem` and `removeItem` calls to prefix every key could run several
independent booklet instances on one origin. From 0.13.1 such a page must also
wrap the name given to `indexedDB.open` (so each instance opens a database of
its own) and local storage's `key()` and `length` (so each instance moves only
its own keys), or give each instance an origin of its own.

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

**v0.13, draft.** `SPEC.md` (Markdown-native) is the whole format. There is no
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
