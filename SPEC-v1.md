# The booklet format, version 1 (legacy)

> **This is the older of the two formats this repository's renderer reads.**
> New booklets should use [version 2](SPEC.md), which is the recommended,
> Markdown-native format — see `SPEC.md` for why, and `docs/why-markdown.md`
> for the full story of how it was arrived at. Nothing here is deprecated:
> every file below is still read, still validated, and still supported, and
> nothing forces an existing booklet to change. This document is kept for
> anyone maintaining a version 1 file, or writing a second implementation of
> it.

**A booklet is one Markdown file that holds a person's work *and* the design of the activities they did it in.** The web page that renders it is a viewer, not the home of anything: a conforming renderer ships **no activities, no booklet and no content of its own**, and everything a reader sees comes out of the file.

A published site may put a *wrapper* around a renderer — a **preset**, one
or more **registries** of modules to install, and optionally the **language**
its pages open in until a reader chooses one (see [Languages](#languages)).
A preset supplies the site's booklet design; it must never overwrite
somebody's entries. The reference
renderer reapplies that design when browser-restored entries have no booklet
design around them, because browser caching is not part of this format. The
page otherwise treats the preset like a file loaded from disk. That wrapper is
neither the renderer nor this format; it is one way of getting a file and some
modules into someone's hands. Hand someone a booklet and they get the
activities it describes; hand them a booklet with no content and they get a
blank workbook — which is all a *preset* is.

This document is the format. It is deliberately small, it is versioned, and it is published separately from the page that implements it so that something else can read or write these files later. Released under the Apache Licence 2.0, whose explicit patent grant is meant to travel to anyone implementing it.

> **Status: version 1, draft.** Record format v6 (per-block), checked by
> `lint-booklet.py`. The reference renderer in this repository is the only
> implementation so far, and no published site runs on this format in
> production yet. Compatible additions may extend version 1, while breaking
> changes require a new version.

---

## Why it looks like this

Three existing things shaped it, none of which fit on their own.

- **Front matter** — the `---` header above a Markdown body, from Jekyll and Hugo and now standard in Obsidian and its neighbours — is how a text file carries structured facts about itself without stopping being a text file. A booklet opens with one. That is why a booklet is already a valid Hugo page and a valid Obsidian note with visible properties, and why "sync to Obsidian" needs no integration: the file goes in the vault, and the vault syncs.
- **Twine's split between a story and a story format** is the same shape as the split here between content and template: data in the file, presentation swappable. Twine has published, versioned specs for this; that is the precedent for publishing one here.
- **SurveyJS's JSON model** supplied the vocabulary for describing a question — a typed element with a name, a title, and choices, with per-locale labels inline as `{en: …, fr: …}`. Where this format names things, it prefers their names.

**And two that deliberately did not shape it.** [JSON Canvas](https://jsoncanvas.org/) is Obsidian's small MIT-licensed spec for infinite-canvas files; it covers spatial layout of boxes and edges, which has nothing to do with activities and questions. It is the *procedural* model here — extract the format, version it, license it permissively, publish it apart from the app — not a content model. And **FHIR Questionnaire**, the healthcare standard, is far too heavy to author in; the only concession made to it is that fields are addressed by stable id and answers are stored keyed by that id, which is what would make a one-way export cheap if this ever needs to speak to a clinical or research system.

---

## The file

**The file name.** A booklet's name ends in **`.booklet.md`**, for example
`a-mindful-check-in.booklet.md`. The extension is *recommended*, not required: it
lets a person, a file manager or a tool tell a booklet from any other Markdown
note without opening it, and it is still a Markdown file. **A reader accepts any
plain `.md` file** and decides what it is by what is inside (the front matter
and the record), never by its name, because every booklet written before this
recommendation is a plain `.md`. A writer suggests `<slug>.booklet.md`, where
the slug comes from the booklet's own title, and falls back to
`booklet.booklet.md` when it has none.

```
---
booklet: 1
title: "A mindful check-in"
lang: en
preset: "example/check-in-only@0.1"
status: draft                     ← presets only
updated: 2026-09-10 14:25
---

# A mindful check-in

…the human-readable half: everything the person wrote, under headings,
   editable in any text editor…

------------------------------------------------------------

## App record — do not edit below this line

```json
{ "block": "meta", "app": "booklet", "v": 6, "booklet": 1, … }
```

```json
{ "block": "module", "id": "example/check-in", … }
```

…one fence per block, each independently parsed…
```

**Three rules govern the two halves.**

1. **The human half is authoritative for any section it contains.** Edit a heading's contents in a text editor and those edits win over the record. A section left out of the Markdown falls back to the record.
2. **The record is found by its heading and its fenced block, never by the divider.** The divider is a sixty-dash rule and is scenery. Any thematic break — `---`, `***`, `___` — is scenery. This rule exists because a reader typing `---` inside a note once truncated that note on reload.
3. **Front matter is positional.** Only a `---` on line 1 opens it.

---

## A registry — what somebody offers

A registry is one JSON file listing modules. It is not part of a booklet and
nothing requires one; it is how a bank of activities is published, and any
number of them may be read at once.

```jsonc
{ "registry": 1,
  "name": { "en": "Example modules" },
  "modules": [
    { "id": "who/what", "version": "0.1", "file": "what.md",
      "title": {…}, "blurb": {…}, "engines": ["grid-select"],
      "rights": { "copyright": "…", "license": "…" } },
    { "id": "who/other", "version": "0.1", "module": { … the whole module … } }
  ] }
```

**Every entry carries enough to draw the menu** — its name, its description,
and which engines its module needs. That is the whole point: a page fetches
one small file rather than every module it might one day offer. Before this
existed, one implementation was downloading 64KB of modules on every visit to
render four button labels, and the cost grew with every module added.

- An entry naming a **`file`** is fetched only when somebody adds it. The path
  resolves against the registry's own URL, the way a link on a page resolves —
  so it may sit beside the registry, or anywhere else.
- An entry carrying a **`module`** inline needs no fetch at all, which is what
  lets a single file be an entire registry.
- `engines` lets a reader be told *before* downloading anything that their
  renderer cannot draw a given module.

**Where registries come from is not the format's business.** A wrapper may
name them, a booklet may name its own, and a person may point at whatever they
like. A bare JSON array of filenames is the older shape and still readable,
with no metadata in it and therefore no saving.

---

## The record: a series of independent blocks

**The record is not one JSON object. It is a series of them, each in its own fence, each parsed on its own.** A block that will not parse costs you that block and nothing else — one mangled module means one activity is missing, not a lost file. Every block declares what it is in a `block` key.

| `block` | one per file? | what it holds |
| --- | --- | --- |
| `format` | yes | **this format, carried in the file** — see below |
| `meta` | yes | `app`, `v`, `booklet`, which booklet this is (`booklet_id`, `booklet_version`, `customized`), and anything the booklet shares across modules (`body`, `menus`, `head`) |
| `widget` | **one per widget used** | a whole widget — the data an engine draws with |
| `module` | **one per module** | a whole module, holding one activity or several — see below |
| `person` | yes | name, email, language, note, question overrides, preferences, the `sync` slot |
| `fields` | yes | the board's content, keyed by field id: a map's fields, and what a `board` or `guide` activity holds |
| `entries` | **one per activity** | `mode` names the activity, `items` are its kept entries |
| `board` | yes | the Now board, areas, the archive |
| `drafts` | yes | anything unfinished, so nothing is lost mid-thought: `today`, `checkin`, and every other activity's under `activities` |

**`head` on `meta` is the booklet's own name and tagline** — `{ "title": {…}, "sub": {…} }`, both localised, both optional. It is to the booklet what `title`/`blurb` are to a module: the words shown at the top of the home page, editable in place the same way. Absent, the renderer's own built-in wording shows instead; present, it travels with the file like everything else here.

A reader must skip a block it cannot parse, count it, and say so. It must not abandon the file.

**Blocks may appear in any order**, and a reader must not depend on their sequence. A module block pasted at the end of a file is added exactly as if it had been written in the middle — which is the intended way to hand somebody a single activity.

⚠️ **Select blocks by parsing them, never by matching text.** The `format` block contains an *example* of a module block inside it, so a naive search for `"block": "module"` finds the example first. Parse each fence and read its `block` key.

---

## `format` — the file explains itself

Every saved booklet carries a `format` block: what the blocks are, what a module looks like, what the block types are, where data goes, what the display parameters mean, and a checklist for when something will not display. It exists so that a file is sufficient on its own — hand it to somebody, or to a language model, and say *"help me make a module for this"* or *"tell me why this is not showing up"*, and everything needed to answer is already in their hands. It also carries a link to this document for anything it does not cover.

A reader may ignore it. A writer should emit it.

---

## A widget — what an engine draws with

**A widget is data, never code.** The renderer holds **engines** — the ability to make an SVG's regions clickable and track what is selected, or to lay out a two-axis grid of selectable chips. A widget supplies everything that specialises one: the figures, the region names, the cells, the vocabulary.

```jsonc
{ "block": "widget",
  "id": "example/body-map", "version": "0.1",
  "engine": "svg-regions",              // which engine draws it
  "title": { "en": "Body map", "fr": "…" },
  "figures": [ { "id": "front", "label": {…},
                 "svg": "<svg …><path class='rg' data-r='chest' …/></svg>",
                 "regions": ["head","jaw","chest", …] } ],
  "chips":  ["allover"],                 // regions with no shape to point at
  "regions":[ { "id": "chest", "label": { "en": "Chest", "fr": "Poitrine" } } ],
  "senses": [ { "id": "unpleasant", "label": {…},
                "words": [ { "id": "unpleasant:0", "label": {…} } ] } ],
  "copy":   { "en": {…}, "fr": {…} } }
```

**A widget's colours are its own.** A cell may carry `color: {tint, deep}`, and
a renderer uses it rather than a stylesheet of its own: a palette keyed by four
particular cell ids would mean every other author's grid draws grey, and would
mean the engine knows what those ids stand for. A renderer supplies only a
neutral fallback ramp by position, so an uncoloured widget still reads as a
grid. The same rule governs the words: what a thing is called, what it says
about itself, and what colour it is are all the widget's.

**Widgets ride in the booklet.** Hand somebody your file and the widget goes with it, so the page draws for them whether or not they have ever seen it. That is possible because a widget is text: the body map's two figures are 2.7KB of SVG markup, and the quadrant grid has no graphics at all — four cells and a vocabulary, under 1KB. **A widget built on a raster image is the exception**: it would reference a URL and degrade to no picture offline, on the same rule as page images — linked, never embedded.

**A figure is a drawing, never a program.** Because a figure arrives in a file somebody was handed, a reader sanitizes every `svg` before drawing it: it removes `<script>`, `<foreignObject>`, the animation elements (`<animate>`, `<animateMotion>`, `<animateTransform>`, `<set>`, `<discard>`) and anything outside the SVG namespace, and strips every `on…` event-handler attribute and any attribute whose value is a `javascript:` or `vbscript:` URL. Everything else (shapes, groups, `class`, `id`, `data-r`, `viewBox`, fills and strokes) draws exactly as written, and `lint-booklet.py` reports script in a figure as an error.

A **block** uses one by naming it, and names the entry keys the engine writes:

```jsonc
{ "id": "body", "type": "widget", "widget": "example/body-map",
  "keys": ["regions"], "skippable": true }
```

**A widget may also be shown rather than operated.** `"readonly": true` draws it
with nothing selectable, and `"describe": true` follows it with whatever each
part of it says about itself. A read-only block names **no** entry keys, because
a widget nobody can touch writes nothing. Together these are what let a page
that *explains* a widget show the real one instead of a picture of it — so its
words appear exactly once, on the widget, rather than being copied into the
prose describing them and going stale the first time anyone renames something.

**Engines a conforming renderer provides:**

| engine | draws | its widget supplies |
| --- | --- | --- |
| `svg-regions` | figures whose SVG shapes carry a `data-r` region id, pointed at and described | the figures, the region names, the vocabulary offered for each |
| `grid-select` | two axes crossed into cells, each holding selectable words | the axis labels, the cells, the words in each, and each cell's colour |
| `card-board` | cards opened one at a time, each leading with what is already recorded, then a quick-add, then the questions behind a disclosure | the cards, which board fields each holds, the menus they offer, the words that ask for them |
 A booklet naming an engine the renderer does not have must say so and carry on — one block lost, not a file.

**Installing a module installs the widgets its blocks name**, so an activity never arrives without the things it draws with.

⚠️ **Older files carry `bodymap` and `quadrants` as block *types*.** A conforming reader maps them onto the widgets they became rather than failing.

---

## A module — one activity or several, portable on its own

**A booklet is an ordered list of modules.** A module is what you add to a booklet and what you take out of one, which is the difference between "take this whole booklet or none of it" and "add the day to what I already have".

```jsonc
{ "block": "module",
  "id": "example/the-day",          // stable; adding the same id updates in place
  "version": "0.1",
  "title": { "en": "Have a good day", "fr": "Passer une bonne journée" },
  "blurb": { "en": "…", "fr": "…" },
  "reads": ["weekday", "weekend"],  // map fields it draws on; soft, not a dependency
  "menus": { "weekday": ["…"] },    // the option lists its own blocks need (see "Menus")
  "widgets": [ … ],                 // the widgets its blocks name, carried whole
  "rights":{ "copyright": "…", "license": "…", "source": "…" },
  "copy":  { "en": {…}, "fr": {…} },// its own wording, per language
  "library": {…},                   // reference content, if it offers any
  "map":   [ … ],                   // cards, if this module is a board
  "sources":   [ … ],               // what its reading cites, if it has any (see "Reading material")
  "citations": [ … ],               // each citation: a source, a page, a quote
  "mode":  { … } }                  // the activity itself, or `activities` for several (below)
```

**A module may also carry things that belong to the whole booklet** rather than
to its own activities: `menus` the blocks name, the `widgets` they draw with, and
`page` — default words for the booklet's own front page, used only if the
booklet itself declares none. Resolution is always the same: the booklet first,
then whichever installed module offers one.

**`rights` says whose the activity is, and it belongs in the block.** A module
is prose as much as it is configuration, and it travels inside every booklet
that carries it — so its terms have to travel with it. A file's front matter
will not do: front matter is discarded the moment a module is pasted into a
booklet, which leaves the file itself as the only place a notice survives. A
conforming writer emits the notices its modules declare into the human half of
the file, grouped by terms, so that whoever holds the file can read them
without parsing anything.

Nothing in this format grants or withholds any permission. `rights` is a place
to state terms, not a licence in itself, and a renderer neither enforces it nor
is in a position to.

**A module travels whole.** A booklet carries the full module objects it uses, never their names, so a booklet made elsewhere works on a page that has never heard of that module. A page's built-in registry is only the shelf of modules it can *offer* to add.

**Adding** appends, or replaces in place when the id already exists — so handing someone a newer version of a module is an update, not a duplicate. **Removing** drops it; its data stays in the file, so putting it back restores what was there.

**A module that would take an activity id away from a different module is refused**, never merged and never allowed to replace it. That holds when it is added and when it arrives inside a file, and a module taken out but kept in the file still holds its ids. The id is the address of that activity's entries and draft, so two modules sharing one would be writing into the same person's answers. A reader leaves the newcomer out and says which id collided and which module holds it. Within one file, the module that sorts first (by `display.order`, then as written) keeps the id.

Two views are **not** modules — the guide and the history. They have nothing of their own to configure, and a booklet without them would be missing its own back button.

**Every activity is a list of blocks, whatever its kind.** An `entry` mode
produces kept entries and a `board` mode does not, but both render the same
way — there is no bespoke view for any activity in a conforming renderer. An
activity too long for one screen may split its blocks into pages (see "An
activity with several pages"); each page is still a list of blocks.

### A module with several activities: `activities`

**A module holds its one activity in `mode`, or several in `activities`,
never both.** `activities` is a list of activities, each exactly what `mode`
would hold. (The file's old word for an activity, `mode`, stays for a module
with one activity, unchanged and fully supported.)
It lets one module group work that belongs together, such as a week of study
with its word list and its quiz, so the group is added, removed, parked and
handed on as one thing.

```jsonc
{ "block": "module", "id": "example/week-1", "version": "0.1",
  "title": { "en": "Week 1" },
  "activities": [
    { "id": "w1-words", "kind": "entry", "title": { "en": "Words" }, "blocks": [ … ] },
    { "id": "w1-quiz",  "kind": "entry", "title": { "en": "Quiz" },  "blocks": [ … ] } ] }
```

- **Activity ids stay unique across the whole booklet**, whichever module holds
  them. A module whose activity id another module already holds is refused
  (see "Adding" above), and so is a module with two activities of one id.
- **Nothing a person writes changes shape.** Kept entries, drafts and the
  `entries` block are keyed by the activity id exactly as before, and none of
  them records which module holds the activity. Moving an activity from one
  module to another moves none of anybody's answers.
- **Each activity in `activities` names itself** with its own `title` and,
  optionally, `blurb`. The module's `title` and `blurb` name the group.
- **`display` applies at both levels.** On the module it places the group on
  the home page and shows or hides it. On an activity in `activities`, `order`
  sorts it among its module's activities and `show: false` hides it, by the
  same rules as everywhere else.
- **A writer uses `mode` whenever a module has one activity**, and a reader
  treats an `activities` list holding one activity exactly as `mode`. A
  booklet that does not need several activities therefore stays readable by
  renderers older than `activities`.
- **How a renderer shows it:** one card per module on the home page. A module
  with one activity opens that activity, as it always has. A module with
  several opens a page of its own that lists them, and each opens as any
  activity does.
- **This defines grouping only.** Nothing here lets one activity read another
  activity's answers. A block's `guide` link (below) still reaches any activity
  in the booklet, as before.

### The mode inside a module

`id`, and a `kind` the renderer knows how to draw:

| `kind` | what it is |
| --- | --- |
| `entry` | produces kept entries — a Finalize button and a history |
| `board` | persistent, edited in place; never finalized |
| `guide` | reading, drawn as a board is; usually asks nothing |
| `log` | the history of what was kept |

Other keys: `title` and `blurb` (an activity's own name and description, which an activity in `activities` needs because its module's name is the group's), `home` (false hides it from the home screen), `head` (copy references for its heading), `chrome` (extra machinery, currently only `"areas"`), `keep` (fields surviving a finalize), `upsert` (an `entry` mode's own keep-one-per-day rule — see below), `accent`, `icon`, `rail`, and `blocks`.

**`upsert: "day"` turns Finalize from "add another entry" into "replace today's."** An ordinary `entry` mode keeps every finalized entry side by side — a log. A mode marked `upsert: "day"` keeps at most one kept entry per calendar day: finalizing again on a day that already has one replaces it rather than adding a second, and reopening that activity later the same day starts from what is already kept rather than blank. Everything else about an `entry` mode — its blocks, its history listing, its chip strip — behaves exactly the same either way.

`pinned: true` marks an activity the booklet keeps **one tap away from every
page** rather than one you go and do — important contacts, a statement of what
the booklet is and is not, anything that has to be immediately reachable. It is
drawn from its blocks like any other page, it is written into the top of every
file the reader saves, and the renderer supplies only the button and the panel:
it knows nothing about what goes in them. That is the only way an engine can be
handed to somebody whose emergency numbers, jurisdiction and language are not
the author's.

`rail: true` gives a long activity a section index built **from its own heading
blocks**, so the index cannot disagree with the page. A separate list of section
names would have to be edited in lockstep with the headings, and eventually
would not be.

**`guide` and `board` are drawn the same way** — a page of blocks that is never
finalized. What separates them is only which blocks the activity puts there,
which is what "every activity is a list of blocks" has to mean if it means
anything. Both kinds exist so a booklet can say which it intends.

**Whatever a person types or picks in a `board` or a `guide` is kept, and
travels in the file.** It is board content: it lives in the `fields` block,
under the key each block owns (see "Where data goes"), and it is edited in place
and never finalized. A `guide` is meant for reading, and one made only of
reading blocks (`prose`, `heading`, `deflist`, `quote`, `image`, `callout`,
`sources`) owns no key and has nothing to keep. A `guide` that does carry a
question keeps its answer exactly as a `board` does.

**An `entry` mode the page has never seen still works.** Its kept entries go to an `entries` block named for it, and its draft is held alongside the built-in ones.

### An activity with several pages: `pages`

**An activity holds its blocks in `blocks`, or its pages in `pages`, never
both.** `pages` is a list of pages, each `{ "id", "title", "blocks" }`: `id`
names the page within its activity, `title` is its name (localised like every
title), and `blocks` holds exactly what an activity's `blocks` would. The pages
are shown as separate pages *within* the one activity, with a menu to move
between them. They are not separate activities, and not separate web pages.

```jsonc
{ "id": "w1-quiz", "kind": "entry", "title": { "en": "Quiz" },
  "pages": [
    { "id": "warm-up", "title": { "en": "Warm-up" },  "blocks": [ … ] },
    { "id": "test",    "title": { "en": "The test" }, "blocks": [ … ] } ] }
```

- **Pages are layout, and nothing else.** The activity keeps one id, one draft
  and one set of kept entries whatever page a block is on. Entries and drafts
  are keyed by the activity id and the field id exactly as before, and nothing
  a person writes records a page. Adding, renaming, reordering or deleting a
  page moves none of anybody's answers.
- **So an id belongs to one page.** Page ids are unique within their activity.
  A block id, and every answer field a block owns (its `keys`, else its `id`;
  see "Where data goes"), may appear on one page of the activity only. A reader
  refuses a module whose activity breaks this, the way it refuses an activity
  id held by two modules, and says which field and which pages. An activity
  written as `blocks` is judged exactly as before.
- **One page is written as `blocks`.** A writer writes an activity with one
  page as `blocks`, and a reader treats a `pages` holding one page exactly as
  `blocks`, the way an `activities` holding one activity is `mode`. An activity that
  does not need pages therefore stays readable by renderers older than `pages`.
- **Never both keys.** A writer never writes `blocks` beside `pages`, and a
  linter rejects a file that does. A reader that meets both, which is what an
  older renderer's editor can leave behind (see "Additions to version 1"),
  loses nothing: it reads `pages` and keeps the blocks in `blocks` as one more
  page at the end, and writes the activity back with `pages` only.
- **`display.order` orders pages** among their activity's pages, by the same
  rules as everywhere else, and a page that is moved is moved by writing it.
- **Which page is showing is not in the file.** It is the reader's view for the
  visit, and so is whether the page menu is shown in full or minimized. Neither
  is written into the record, and neither changes an activity's address.
- **Not the same as `page`.** A module's `page` (default words for the
  booklet's front page) and the record's `page` block are about the booklet's
  home page, and have nothing to do with an activity's `pages`.
- **How the reference renderer shows it:** a menu on the left lists the pages
  by title, the page on show marked, and it can be minimized to a thin rail of
  page numbers. A one-page activity has no menu. While editing, a thin strip
  with a plus in it stands where the menu would be, and choosing it makes the
  activity two pages: its blocks become the first page and a new, empty page
  the second. Pages are renamed in place, moved up and down, deleted after the
  renderer says what goes with them, and added from the end of the menu.
  Deleting down to one page makes the activity a one-page activity again.
  A page made without a name is titled "Page 3" in every language the booklet
  offers, written down so it stays put when pages are reordered.

### A block inside a mode

| `type` | what it draws | needs |
| --- | --- | --- |
| `heading` | a section heading, optionally numbered | `text`, optional `n` |
| `prose` | paragraphs; a blank line starts a new one | `text` |
| `deflist` | named points — a label and what it says | `items: [{label, body}…]` |
| `quote` | one line set apart from the rest | `text` |
| `image` | a linked picture, never an embedded one | `src`, `alt` |
| `callout` | reading set apart, of one kind (see "Reading material") | `kind`, and `text` or `blocks` |
| `sources` | the module's sources, and where each is cited | — |
| `text` | a question with a text answer | `q: [scope, key]` |
| `headlines` | repeated one-line entries | `q: [scope, key]` |
| `list` | tappable options plus a free add | `source: [mapField…]`, and `copy` or `label` |
| `didlog` | tick what actually happened | `of: [blockId…]` |
| `quadrants` | the energy/valence feelings grid | — |
| `bodymap` | the front/back figures | — |
| `group` | nested blocks | `blocks: [ … ]` |

A block may also carry `guide` — the id of another activity in the same booklet
— with `guideLabel` for the words that offer it. Both belong to the booklet: a
renderer knows neither what that activity is nor what to call the way in, and
draws nothing at all if the booklet does not carry it, so removing an activity
never strands a link pointing at nothing.

**The first seven only read.** They carry no answer, and — unlike every other
type — they own **no entry key at all**, so the id-defaulting rule below can
never hand a heading or a paragraph an answer slot that would be wrong to fill.
They are what lets something long enough to need sections be built out of blocks
rather than out of a view written for it: a conforming renderer has no separate
notion of "a page of reading" and needs none.

Every block may carry `placement`, which is the whole above-the-fold control:

- **`open`** — rendered in place.
- **`folded`** — inside a disclosure, opened automatically if it already has content. A folded block must be named, or it is a control nobody can find. It is named by its own `label` (a string, or one value per language), else by its `copy`, which may be a reference `"<activity-id>.<key>"` to a string in its module's `copy`, one value per language (`{ "en": "…", "fr": "…" }`), or plain words. Each is read down the language chain (see **Languages**), and a reference that names nothing falls back to the block's id, never to the reference itself.
- **`hidden`** — not rendered. Its data is kept.

### Reading material: citations, callouts and sources

**Reading material is built from blocks like everything else**, with one mark
in its text and two registries on its module. There is no separate reading
viewer. A module that cites anything carries what it cites, because a module
travels whole.

```jsonc
{ "block": "module", "id": "example/tides", "version": "0.1", "title": { "en": "Tides" },
  "sources": [
    { "key": "atlas", "title": "The Harbour Tide Atlas", "edition": "2nd edition, 2019",
      "kind": "primary", "url": "https://example.org/atlas.pdf" } ],
  "citations": [
    { "id": "atlas-twice", "source": "atlas", "page": 12, "pagePdf": 18,
      "quote": "The tide rises and falls twice in each lunar day.",
      "verifiedOn": "2026-09-20", "verifiedBy": "quote found on that page" } ],
  "mode": { "id": "tides", "kind": "guide", "blocks": [
    { "id": "p1", "type": "prose", "text": { "en": "Two high tides a day.[^atlas-twice]" } },
    { "id": "c1", "type": "callout", "kind": "diff",
      "title": { "en": "Your guide says six hours" }, "text": { "en": "It rounds it off.[^atlas-twice]" } },
    { "id": "s1", "type": "sources" } ] } }
```

- **`sources`** lists what the module cites: `key` (unique within the
  module), `title`, `edition`, `kind` (`primary`, `secondary`, `law` or `case`)
  and, optionally, `url`, the whole document's address.
- **`citations`** lists each place cited: `id` (unique within the module,
  made of letters, digits and `_ . : -`), `source` (a key in `sources`),
  `page` (the printed page, or a place that is not a page number, such as
  `"art. 14"`), `quote` (one sentence, word for word, never empty) and,
  optionally, `pagePdf` (the PDF's own page number when it is not the printed
  one), `url` (the address of this exact place), `verifiedOn` (`YYYY-MM-DD`)
  and `verifiedBy` (a few words saying how, such as "quote found on that page").
- **Verification is displayed, never computed.** A renderer shows that a
  citation was verified, when and how, because the file says so. It does not
  check a quote against anything. A citation with no `verifiedOn` shows no
  badge.
- **A citation mark is `[^id]`**, written in the text of a `prose`, `quote`,
  `deflist` (a label or a body) or `callout` block. It is plain text, so it
  survives any text editor and the human half of a file, where it is
  Markdown's own footnote mark. A heading carries none, and text that belongs
  to no module (the booklet's own home-page words) is never read for marks.
- **A mark whose id is not in `citations` is broken.** A renderer draws it
  visibly as broken and gives it no number, and a linter rejects it.
- **A mark belongs to its text in every language.** Its id names a citation,
  not words, so a text written in several languages carries the same marks in
  each, wherever each language's sentence puts them. Where the language shown
  lacks a mark that another language of the same text carries, a renderer does
  not drop the citation: it draws that mark at the end of the same paragraph,
  counting paragraphs as the text that carries it does (the last paragraph, if
  this language's text has fewer), and numbers it like any other mark. Only the
  languages the booklet offers are consulted (see **Languages**), so a booklet
  that declares one language reads no other language's marks. This is how the
  text is drawn, never a change to the file. An editor that lets an author put
  a mark into one language's text says which of that text's other languages
  lack it, and offers to put it there; the reference renderer puts it at the
  end of the same paragraph, where a reader of that language already sees it,
  for the author to move within the sentence.
- **`callout`**, `{ id, type: "callout", kind, title?, text?, blocks? }`, is
  reading set apart, of one kind: `diff` (where this differs from the reader's
  own guide), `law` (the law as it now stands) or `opinion` (an author's view,
  not to be learned as a rule). `text` is localised prose like a `prose`
  block's; `blocks`, drawn after it, nests blocks the way a `group` does. A
  renderer must tell the kinds apart by words, a glyph or a pattern as well as
  by colour, never by colour alone.
- **`sources`**, `{ id, type: "sources", title? }`, lists the module's
  `sources` and, under each, the citations that point at it, each with a way
  back to every place it is marked in the activity.
- **Which callouts are brought forward is not in the file.** A renderer may
  let a reader bring one or more kinds forward and fold the rest. That choice
  is the reader's view for the visit, like which page is showing, and is never
  written into the record.
- **How the reference renderer shows it:** a mark is a small superscript
  number that keeps the line's rhythm. Numbers follow first appearance across
  the activity's pages in order, and a citation marked again keeps its number,
  so turning a page never renumbers anything. Pressing a mark opens a panel
  beside the page, never another page; while it is open the page moves over so
  that the panel covers none of its text, and on a screen narrower than 900px
  it is a bottom sheet instead. Switching the interface language while it is
  open draws it again in that language, and leaves the focus where it was. It
  shows the source's title, edition and kind, the printed page and the PDF page
  when they differ, the quote highlighted, a link "Open the original at page N",
  and the verified badge with its date and method. The link is the citation's
  own `url` as written, else the source's `url` with `#page=` and the PDF page
  (else the printed page); only `http(s)` and relative addresses are ever
  links. Hovering a mark with a mouse previews its quote. Escape closes the
  panel and puts the focus back on the mark. Above an activity's page, a
  filter row offers a toggle for each callout kind on that page: with a kind
  chosen its callouts stay in full and the others fold to their label and
  title; with none chosen everything shows. The sources block has a way back
  to each place a citation is marked, and each turns to the page that place is
  on. Printed, the citations of the page on show are numbered endnotes at its
  end (source, page and quote), and a folded callout prints whole.

### Where a thing goes: `display`

**Nothing is positioned by where it sits in the file.** Any module, mode or block may carry a `display` object:

| key | applies to | means |
| --- | --- | --- |
| `order` | modules, pages, blocks | a number; lower comes first. Sorting is **stable**, and anything without an order sorts **after** everything that has one |
| `show` | modules | `false` takes it off the home screen and keeps its data |
| `placement` | blocks | `open` renders in place · `folded` hides it behind a named disclosure · `hidden` does not render but keeps its data |

**Written order is the fallback, not the rule.** If *no* sibling in a set carries an `order`, the order they are written in is used — which is what makes a hand-written booklet behave sensibly without anyone setting numbers. As soon as one sibling has an order, the set sorts by it.

An implementation that lets a person rearrange things **must write the parameters** rather than rewriting the file's sequence, so that nobody has to hand-edit JSON to move an activity.

### Where data goes: ids, never positions

- **Board content** lives in the `fields` block, an **object keyed by field id**. Key order is meaningless. That is a map's own fields, and whatever a `board` or `guide` activity's blocks hold, each under the key the block owns. All of them share one set of keys, so two blocks that own one key share its value.
- **Kept entries** live in an `entries` block per activity, whichever module holds it — `mode` names the activity, `items` is a list. Each item carries a `ts`, and **items may be in any order**: an entry is identified by its timestamp, never by its index.
- **Within an entry**, a value is stored under the key its block owns. A block owns the keys named in its `keys`, which **defaults to the block's own `id`** — except for the reading blocks above, which own none. The three composite widgets own a differently-named key and declare it: `bodymap` → `regions`, `quadrants` → `emotions`, `headlines` → `thoughts`.
- **Modules** are addressed by `id`. Adding a module whose id is already present replaces it in place.

### Wording belongs to the activity

A module carries `copy: {en: {…}, es: {…}, fr: {…}}` — the words its own questions, headings and cards use, keyed by language tag (see **Languages** below; any subset is valid). A renderer looks there **before** its own strings, and keeps only what is genuinely its own: the vocabulary of its widgets (the quadrant names, the body regions, the sensation words) and its interface strings (buttons, dialogs).

⚠️ **The layering is two deep, and must be.** A module wording `checkin.h` must not wipe out `checkin.emo`, which is the quadrant widget's own vocabulary. Merge at the second level, module over renderer.

**Resolution, in order:** the module's or block's own `title`/`label` (a string, or one value per language tag) → the module's `copy` → the renderer's own strings → the literal fallback. That is what lets a preset rename one card without restating the app in two languages.

**A reference into `copy` is looked up key by key down the language chain**: the modules' words in the language in force, then the renderer's own in that language, then the same in the next language. A module whose Spanish `copy` words only some of its questions shows the rest in its English, never blank and never as a key. Anywhere a block or an activity's `head` names a `copy` value, that value may equally be written as one value per language, which is read like any other localised value.

### Languages

Every localised value in a booklet, module or widget is **keyed by language tag**. A tag is BCP 47, and this version of the format knows three languages: `en`, `es` and `fr`, each optionally with a region (`es-AR`, `es-419`, `fr-CA`). Spell a tag with a lowercase language and an uppercase region. A value may carry **any subset** of them, Spanish-only included; nothing requires an `en` or an `fr` to be present.

- **A booklet may declare the languages it offers**: `languages`, a list of tags in preference order. In front matter it is written `languages: es-AR` (comma-separated for more than one); in a booklet's template object it is a `languages` array. **Declaring one language means one language**: the renderer shows no language toggle and never reads a value in any other language, so nothing in English or French can appear. Declaring none leaves every language available, as before.
- **One lookup chain for every localised value.** A renderer takes the selected language, then its primary subtag (`es-AR` → `es`), then the booklet's declared languages. A booklet that declares none continues to `en`, then `fr`, then any language the value carries. Interface strings chain the same way: `es-AR` → `es` → `en`, and `fr` → `en`. A missing translation shows the next language's wording, never a raw key.
- **`es-AR` is a layer, not a copy.** A renderer's Argentine Spanish holds only the strings that differ from neutral Latin American Spanish (`es`), such as the voseo imperatives; everything else comes from `es`.
- **A reader in a language picks that language wherever it is tagged.** Selecting Spanish uses every `es` value a booklet carries, and falls back down the chain only where none exists.
- **The reader's chosen language is the reader's, not a booklet's.** A renderer keeps it as a preference of its own, outside every booklet's data, so it holds across every booklet it shows and survives a reload. Wherever a booklet offers that language, the choice wins over the booklet's `lang`. A choice of a language (`es`) is read in the booklet's own variant of it when the booklet has one (`es-AR`). A booklet's `lang` is what it opens in only when no choice is in force (the reader's, or a site's default, below), or the booklet does not offer it; a booklet that declares one language always reads in it. The reference renderer keeps the choice in the browser's `localStorage`, under `booklet.ui.lang`.
- **A site may name a default language.** A wrapper may say which language its pages open in (the reference renderer's wrapper `lang`: `en`, `fr`, `es` or `es-AR`; any other value is ignored). It stands in for the reader's choice until they make one, and is read exactly as that choice is: it wins over a booklet's `lang` wherever the booklet offers it, and never reaches a booklet that declares other languages. Once the reader chooses, their choice wins. A site's variant also stands for its language: where the default is `es-AR`, a choice of Spanish reads as `es-AR` in any booklet that offers it.
- **`lang` and the `_Language:` line** in a saved file may name any supported tag, so a saved Spanish booklet reloads as Spanish for a reader who has not chosen another language. Dates and numbers follow the language: `en-CA`, `fr-CA`, `es-419`, and `es-AR` as written.
- **A registry may ask for more languages than the format requires.** The Booklet repository's own registry sets up everything it ships (its modules and widgets) in `en`, `fr` and `es`, and asks the same of every contribution to it. That is a rule of that registry, not of the format: a file carrying fewer languages, a single one included, is still a valid booklet, module or widget.
- **A linter refuses a tag it has no interface table for** (anything but `en`, `es`, `fr` and their regions), and a tag spelled wrongly. It warns when a declared language is missing from a value. The reference linter also warns, for the Booklet repository's registry content only, when a per-language value lacks `en`, `fr` or `es`.

### Menus: the options a list offers

**A menu is a named list of options that a list offers.** A `card-board` widget's cards offer the menus in its `menus`, one per field; a module's `menus` and the booklet's own (`menus` in `meta`) are the ones a list falls back to, the booklet's first (see "A module"). A menu is written in one of two ways:

- **One list for every language**, unchanged: `"next": ["The smallest next step", "A decision to make"]`.
- **One list per language**, keyed by language tag:

  ```jsonc
  "next": { "en": ["The smallest next step", "A decision to make"],
            "fr": ["Le plus petit pas suivant", "Une décision à prendre"],
            "es": ["El próximo paso más pequeño", "Una decisión por tomar"] }
  ```

  Every list holds the same options in the same order, so every list is the same length. **An option is its place in the menu, not its words**: the second French option is the second English one. A per-language menu is read down the language chain like any other localised value (see **Languages**), so an `es` list serves a reader in `es-AR`, and a reader in a language the menu lacks is offered the next language's list.

**What a person picks is kept as the words they picked**, in the language they picked them in, in `fields` or in an entry, exactly as before. So the file stays readable, and no pick needs migrating: one made before its menu had languages is the English words, which the `en` list still says. A reader recognises kept words in any of the menu's languages by their place in it, shows the option in the reader's language, and treats it as one option: it stays chosen across a switch of language, is not offered twice, and is removed whichever language it was picked in. Nothing in the file is rewritten for this. Words in no list, such as a person's own or an option a menu no longer has, are shown as written.

- **A writer keeps the lists in step.** An option is added, removed or moved in every language at once. Changing an option's words in one language changes nothing that was kept, since the place is what identifies it; changing its place does.
- **A reader must not assume the lists agree.** It matches kept words against each list as it stands.
- **A linter** requires each list to hold only strings, the lists of one menu to be the same length, and a list in every language the module or widget offers: the booklet's declared `languages`, else the languages its `title` is written in (an `es` list serves `es-AR`).
- **How the reference renderer edits one:** a list block's editor shows the options of each menu it draws on in the language being read, and saving them changes that language's list and keeps the others; a one-list menu stays one list.

---

## `fields` and `entries` — what the person wrote

Board content is keyed by field id in the `fields` block. Kept entries live in an `entries` block per activity, each item carrying a `ts`. Answers are keyed by the field id the module gave them — the pairing that keeps a FHIR export cheap.

Nothing in a `module` block contains anything a person wrote, and nothing in `fields` or `entries` describes layout. A linted preset asserts both.

### `drafts` — what is not finished yet

An activity's draft is what has been typed or picked in it and not yet kept.
The `drafts` block holds every activity's, so a half-written entry survives the
file being the only copy:

```jsonc
{ "block": "drafts",
  "today": { … } ,                         // the two built-in activities, by name, or null
  "checkin": null,
  "activities": {                          // every other activity, by activity id
    "eod": { "snag": "the printer again", "lines": ["one"] } } }
```

- **`activities` is keyed by activity id**, the same key the activity's
  `entries` block carries in `mode`, and each value is keyed by field id, the
  way a kept entry is. Which module holds the activity is not recorded, so
  moving an activity between modules moves its draft with it.
- **A draft that holds nothing is not written**: one whose values are all blank
  text or empty lists. `activities` is left out when no other activity has a
  draft, and `today` or `checkin` is `null` when it holds nothing.
- **A reader never takes `today` or `checkin` from `activities`**, and skips any
  value there that is not an object. A draft of an activity the booklet no
  longer shows is kept, like that activity's entries.

## `person` — their own presets

`name`, `email`, `lang`, `mode`, `note`, `protect`, question overrides in `q`, extra feeling words in `emo`, `prefs`, `setup`, and an optional `sync` slot. **A passphrase is never stored, here or anywhere.**

### `sync` — where the booklet is kept

A booklet may record the place it is stored, so that a reader that has already connected to that place can find the file again without asking. The slot is an object, or absent, or `null`:

```jsonc
"sync": { "provider": "gdrive", "ref": "<the provider's file id>",
          "synced": "2026-09-18T14:25:00Z", "rev": "<the provider's revision or etag>" }
```

- **`provider`** names the kind of store, such as `gdrive` or `local`. **It is an open list.** No party owns the set of values, and the reference renderer's own list is not the format's list: another renderer may use a value this one has never seen.
- **`ref`** is whatever that provider calls the file (a file id, a path within a folder the reader holds access to). **`synced`** is when the reader last read or wrote the file there, and **`rev`** is the provider's revision marker at that moment, which a reader compares against the provider's current one to notice a change made somewhere else.
- **It holds no credentials and no account identity.** No token, no passphrase, no email address. A file travels when it is shared, and a reference to a file is not a way in: reading the file it points at still needs the reader's own authorization.
- **It is optional in every direction.** A file without it is a complete booklet. A reader that does not use it, or does not understand a `provider` value, **must preserve the slot unchanged** when it writes the booklet back, and must never drop, rewrite or interpret it. A reader that finds a `provider` it does not know treats the booklet as it would any other, and simply does not sync it.
- **This is a compatible addition to version 1.** The slot was already reserved, so no existing booklet changes meaning.

---

## What a file keeps

**A booklet written to a file and read back is the booklet a person had.** That
includes what the readable half cannot show: a Now row or an area nothing has
been written in yet, an area with no name, and every value exactly as typed,
spaces at the ends included. The record keeps all of them, and the Now board's
rows and areas are written there whether or not they hold anything.

**A section of the readable half is read from the record when nobody edited
it.** A reader writes the section again from the record, in the file's own
language, and compares: if the section in the file is still exactly that
(allowing for spaces at the ends of lines and the comments and fences a reader
sets aside anyway), the record is read for it. A section somebody edited wins,
as rule 1 says. This applies to the name, the note, the Now board, the areas,
the big picture and the archive, the sections a reader reads back.

A few things are deliberately not kept, each for a reason:

- **The not-yet-downloaded status** (whether anything changed since the last
  download, and how many entries were kept since) is not in the file. A booklet
  read from a file has nothing waiting to be saved: the file is the save.
- **The order modules happen to be held in** is not kept: a writer writes them
  in the order they are shown (`display.order`, then as written), which is the
  only order a module list has. What is shown, and in what order, is unchanged.
- **Kept entries of `today` and `checkins`** are written in time order. Entries
  are identified by their `ts`, never by their place, so nothing changes.
- **A draft that holds nothing** is not written (see "`drafts`"). An activity
  with no draft opens blank, exactly as one with an empty draft does.
- **`booklet`** is the version of the format a booklet is written as. A writer
  writes the version it implements, and a reader holds a booklet it read as
  that version, so it is not carried from file to file.
- **A section edited by hand** is read as written, and the readable half cannot
  hold a row or an area with nothing in it, or spaces at the end of a line; that
  section loses them. An area with no name is written under its place among the
  areas shown (`### 2`); where the record says the area in that place has no
  name, a reader still gives it none.
- **A line of the note, or of the page's prose, that begins with `##`** is
  written with a backslash in front (`\## …`, Markdown's escape), because it
  would otherwise be read as a heading that ends the section. Reading the note
  from the readable half, a reader takes the one backslash off again (the page
  is always read from the record). A line already beginning with backslashes
  and `##` gains one more, so the two are exact inverses.

## Which template wins

A file carries a design; the page ships with one. On load:

- **Different `id`** → the file's design wins. It is somebody else's booklet.
- **Same `id`, `customized: true`** → the file's design wins. The person edited it.
- **Same `id`, not customized** → the page's own wins, so an old file does not pin the app to the version it was saved with.
- **Malformed** → refused entirely; the page keeps the booklet it shipped with.

**Loading a booklet takes its whole module list.** That is the "open somebody's booklet" operation, and it is all-or-nothing by design: a booklet half-replaced by another is one nobody can reason about.

**Adding a module is the other operation, and it composes.** Your booklet keeps everything it has and gains one activity. This is why modules exist: without them the only choices are a whole booklet or nothing, and a booklet could never be extended.

Merging two *files* is a content operation and leaves the reader's own design alone.

---

## Locked booklets

A booklet may be encrypted before it leaves the device. What is written is an envelope: front matter with `encrypted: true`, a line in the body saying how to open it, and one fenced block:

```jsonc
{ "app": "booklet", "enc": "v1",
  "kdf":    { "name": "PBKDF2", "hash": "SHA-256", "iterations": 600000, "salt": "…base64" },
  "cipher": { "name": "AES-GCM", "iv": "…base64" },
  "data":   "…base64" }
```

Salt and IV are fresh per file. There is no recovery path: a forgotten passphrase is a lost file, and no party — including whoever handed over the page — can open it. An encrypted booklet is no longer readable text, which is the cost of encrypting it and is stated to the reader before they choose.

---

## Conformance

A conforming reader must: parse front matter positionally; prefer the human half per section; find blocks by their fences; **parse each block independently and skip, count and report any block it cannot read rather than abandoning the file**; refuse a module naming unknown kinds or types rather than rendering it partially; refuse a module that carries both `mode` and `activities`, or an activity id another module holds, or an activity with one block id or answer field on two of its pages; and treat every string a person wrote as content, never as instruction.

A conforming writer must: emit front matter with `booklet: 1`; emit a `meta` block and one `module` block per module, writing a module with one activity as `mode` and an activity with one page as `blocks`; keep module ids, activity ids and field ids stable; and never write a passphrase, or anything a person typed, into a `module` block.

`lint-booklet.py` in this repository checks all of the structural rules above and is the reference implementation of "is this file valid".

---

## Additions to version 1

Compatible additions extend version 1 without changing `booklet: 1` or the
record version (`v: 6`). Each is listed with the date it was added and with
what a reader older than it does with a file that uses it. For the first five
below, "an older reader" is the reference renderer as it stood before them
(commit `1c18035`), and each note says what that renderer was seen to do when
such a file was loaded into it.

- **2026-09-26: the `*.booklet.md` file name.** See "The file". It is a
  recommendation, and a reader decides what a file is from its contents, so
  reading is unchanged. An older reader's file picker accepts any name ending
  in `.md`, and its loader is handed the file's text, never its name. It saves
  every file under one fixed name of its own ending in `.md`, so a copy saved
  there loses the `.booklet.md` name, and nothing else.
- **2026-09-26: the `sync` slot in `person`.** See "`sync`". The slot was
  already reserved, and an older reader keeps it: a booklet whose
  `person.sync` names a provider, a ref, a time and a revision is written back
  by an older reader with the slot unchanged.
- **2026-09-26: Spanish (`es`).** See "Languages". An older reader has only
  English and French. A booklet whose `lang` is `es` (in front matter, in the
  `_Idioma:` line and in `person.lang`) opens there in whichever of English or
  French the reader was already using. Where a value also carries `en`, the
  English shows. A value carrying only `es` shows nothing: an activity named
  only in Spanish is listed and headed by its id, and its Spanish prose and
  question labels are blank. Nothing is lost. The older reader adopts the
  booklet, keeps its kept entries and writes every module back unchanged,
  Spanish included, but it writes the booklet's own language back as `en`
  (front matter and `person.lang`).
- **2026-09-26: region tags, and the Argentine Spanish (`es-AR`) layer.** See
  "Languages". An older reader treats a booklet whose `lang` is `es-AR` as it
  treats `es`: it opens in the language the reader was already using, values
  carrying only `es-AR` are blank, and the file is written back with its
  modules and entries intact and its language as `en`.
- **2026-09-26: the `languages` declaration, and single-language booklets.**
  See "Languages". An older reader ignores the declaration. A booklet that
  declares `languages: en` can still be switched to French there, and shows its
  English wording under a French interface. A booklet that declares only `es`
  or `es-AR` reads there as the two notes above describe. When an older reader
  writes the file back, the declaration is gone from both the front matter and
  `meta`, so a current reader then treats that booklet as declaring no
  languages. The wording itself is kept.
- **2026-09-26: a module may hold several activities in `activities`.** See
  "A module with several activities". An older reader requires `mode`, so it
  does not show a module that uses `activities`. When the booklet has at least
  one other module with a `mode`, an older reader still adopts the booklet, and
  it keeps the `activities` module and its entries in any file it writes back.
  A booklet whose modules all use `activities` opens in an older reader with
  no activities, and saving it there drops those modules; their entries are
  kept. A file that does not use `activities` is unaffected, and a writer keeps
  it that way by writing one activity as `mode`.
- **2026-09-26: an activity may be shown as several pages, in `pages`.** See
  "An activity with several pages". An older reader reads only `blocks`, so it
  shows a paged activity with no blocks, and changes nothing else: it still
  adopts the booklet, keeps that activity's kept entries, and writes the
  activity back with its `pages` untouched, because it writes every module
  whole. One risk remains. Someone who adds a block to that activity in an
  older reader's editor gets the new block written into `blocks`, beside
  `pages`; a current reader keeps it as one more page, so nothing is lost, but
  a linter rejects the file until a current renderer saves it again. A file
  that does not use `pages` is unaffected, and a writer keeps it that way by
  writing one page as `blocks`.
- **2026-09-26: reading material: `sources` and `citations` on a module, the
  `[^id]` citation mark, and the `callout` and `sources` blocks.** See
  "Reading material". An older reader adopts the booklet and draws the rest of
  the activity as before. It shows each mark as the plain text `[^id]`, and in
  place of each `callout` or `sources` block a note that it cannot draw that
  block, so a callout's words are not shown there. It keeps both registries,
  every block and every mark, because it writes every module whole, and it
  keeps them through an edit made in its own editor. (Checked by loading such
  a booklet into the renderer at commit `1c18035`.) A file that uses none of
  these is unaffected.
- **2026-09-26: other activities' drafts in `drafts.activities`, a board's and
  a guide's answers in `fields`, and the record keeping rows and areas with
  nothing in them.** See "`drafts`", "The mode inside a module" and "What a file
  keeps". An older reader loads such a file without error and reports nothing
  it could not read. It ignores `drafts.activities`: another activity's draft
  is not restored there, and is not in any file it writes back. It keeps a
  board's and a guide's answers in `fields` and writes them back unchanged, but
  shows those questions empty, because it looks for their answers elsewhere; a
  current reader shows them again from the file it writes. It reads the Now
  board and the areas from the readable half, as it always has, so there an
  area with no name is named by its number (`2`), a row or an area with nothing
  in it is dropped, and spaces at the ends of the name and the note are
  trimmed; it writes them back that way. A note line written as `\## …` shows
  there with its backslash, as one line of the note, and a current reader
  reading its copy takes the backslash off again. The record's `v: 6` and
  `booklet: 1` are unchanged. (Checked by loading such a file into the renderer
  at commit `1c18035`, and loading what it wrote back into a current one.)
- **2026-09-26: a block's `copy`, and an activity's `head`, may be one value
  per language or plain words, not only a reference.** See "A block inside a
  mode" and "Wording belongs to the activity". Such values were already in
  shipped modules (a folded group's `copy: { "en": …, "fr": … }`), and every
  renderer before this date, the reference renderer included, read them as a
  reference that found nothing: a folded block's summary showed the block's
  id, and a heading, a list's label or a one-line list's heading fell back to
  what it would show with no `copy` at all. Nothing is lost there, since the
  value is kept and written back as it came. A writer that wants its names
  shown by those renderers writes a reference.
- **2026-09-27: a menu may be written one list per language.** See "Menus".
  What a person picks is still kept as words, so `fields` and entries are
  unchanged, and a file whose menus are all one list is unaffected. An older
  reader (the reference renderer at commit `1c18035`) loads a file with
  per-language menus without error, adopts the booklet, and keeps every pick.
  It cannot draw a board whose card offers a per-language menu, whether the
  menu is the widget's or a module's: drawing that activity stops with an
  error (`menu is not a function or its return value is not iterable`), and
  its page stays empty. Every other activity draws as before; a list that
  offers what is on such a board shows the kept words as they were written,
  in the language they were picked in. Its editor stops with an error
  (`menuOf(...).join is not a function`) when it draws the editor of a list
  block whose field has a per-language module menu. It writes every module,
  widget and menu back unchanged, and the picks with them. (Checked by
  loading such a booklet into the renderer at commit `1c18035` with its own
  test harness.)
- **2026-09-26: a citation mark is drawn in every language of its text.** See
  "Reading material". A reader older than this rule, the reference renderer
  with reading material included, draws a mark only in the language it is
  written in. There, a reader in a language whose text lacks the mark sees no
  number for it, and that citation is missing from the page's numbering and
  endnotes, though the sources block still lists it. The file is the same
  either way, and an older reader writes it back as it came.
