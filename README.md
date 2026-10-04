# Booklet

**A booklet is one Markdown file that holds a person's work *and* the design of the activities they did it in.**

Open it in a text editor and you can read everything, top to bottom — questions declared in plain lines, prose free to use every heading level, the reader's own answers set apart at the end. There is no account, no server, no database. You can email a booklet to yourself, drop it in a Dropbox or an Obsidian vault, print it, or hand it to a language model and say *"help me add an activity to this."*

```markdown
---
booklet: 0.6
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

This is **v0.5** of the format — see [`SPEC.md`](SPEC.md) for the full
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
- **Widget** — *data*, never code, that specialises an engine: the figures and region names for a body map, the axes and cells for a grid, the cards for a card board. Widgets ride inside the booklet, so an activity never arrives without the thing it draws with.
- **Engine** — the drawing ability the renderer provides. Three so far: `svg-regions`, `grid-select`, `card-board`.
- **Question** — one line, `> [!kind|id] Title`, in the kinds `text`, `long`, `lines`, `choice`, `multi`, `scale`, `number`, `date` and `widget`. Every activity is drawn the same way, whatever it is — there is no bespoke view for any activity in a conforming renderer.

**Nothing is addressed by position, with one exception.** Modules are found by `id`, kept entries by their timestamp. Where a thing *appears* is written order; written order decides anything only when no sibling carries an order at all. The exception: a choice or scale question stores its answer as the option's *position*, not its words, because a translation is a separate file and only a position is guaranteed to match across languages — see [`SPEC.md`](SPEC.md).

**The record is a series of independent JSON blocks, not one object.** A block that will not parse costs you that block and nothing else — one mangled module means one missing activity, never a lost file.

---

## What is in this repo

| | |
| --- | --- |
| [`booklet.html`](booklet.html) | **the renderer.** One static file, no build step, nothing to install or fetch to open it. Draws mermaid diagrams and typesets math with two MIT-licensed libraries stored inside it (see below). Reads v0.3 only — no earlier format opens |
| [`SPEC.md`](SPEC.md) | the current format (v0.5), versioned and published separately from anything that implements it |
| [`docs/why-markdown.md`](docs/why-markdown.md) | what shaped v0.3 (the design the later versions kept): the field surveyed, the aims, the choices made and rejected |
| [`SKILL.md`](SKILL.md) | instructions to hand an AI agent so it can make a valid booklet from a plain request; `test/skill.test.js` keeps its examples true |
| [`lint-booklet.py`](lint-booklet.py) | the reference validator — "is this file valid" |
| [`examples/`](examples/) | complete booklets you can open — `how-tides-work.booklet.md` and `mindful-check-in.booklet.md` |
| [`test/`](test/) | the suite, run with `test/run.sh` |
| [`booklet-registry`](https://github.com/benthepsychologist/booklet-registry) | a separate repo: the modules on offer and the `registry.json` that lists them |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | how to add an activity |

## Try it

Download `booklet.html` and `examples/how-tides-work.booklet.md`, open the HTML file in a browser —
**straight off your disk, `file://` is fine** — and press *Add a booklet from a file*
on "Your booklets" to open the markdown file. No server, no install, no network: verified with `fetch` and
`XMLHttpRequest` stubbed to fail.

**Themes and width.** The renderer has four built-in themes the reader picks from a menu in the top bar:
Paper (the default look), Daylight (white), Night (dark) and Contrast (high contrast, light). *Auto* is the booklet's own
look if it asks for one (a `booklet theme` block: strict named values, never CSS), otherwise the device (more
contrast, then dark, then Paper); any explicit pick wins, and the choice is remembered in the browser only. Printing is always light. The page is wide: the content area runs
to about 76rem, prose stays at a readable measure (about 70 characters), and tables, tiles, grouped lists and
figures use the width and fold to one column on a phone.

A module file (any v0.5 module, such as those in `booklet-registry`) loads as what it is, one activity: on
"Your booklets" it starts a new booklet holding it.

A plain Markdown file with booklet front matter (`booklet: 0.6`, a `title`) and no booklet lines at all is
already a readable booklet: it is one activity, named by the title. This is how a generated report, a weekly
status or a run's acceptance report, can be read in the renderer. An activity that only reads (no question, no
widget, no query) and has at least two sections opens **folded**: each section shows its heading and its first
paragraph and opens on a click, with "Open everything" and "Fold everything" above them and a dot in the left
menu for each section opened. The choice is kept in the browser only. HTML comments (`<!-- … -->`) are not
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

A site changes that one line to point at another registry. A site that sets a
Content-Security-Policy must also allow that registry's origin, and the origin of
the module files it lists, in `connect-src`. With the tag missing or empty, "Add
a module" shows its "no modules" message and nothing else changes. A module's
`file` path in the registry resolves relative to the registry's own address.

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
browser. The address is never read or written. Each booklet keeps its own
answers, and a first visit shows the empty list.

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

**v0.5, draft.** `SPEC.md` (Markdown-native) is the whole format. There is no
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
