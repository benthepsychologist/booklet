# The booklet format, version 1

**A booklet is one Markdown file that holds a person's work *and* the design of the activities they did it in.** The web page that renders it is a viewer, not the home of anything: a conforming renderer ships **no activities, no booklet and no content of its own**, and everything a reader sees comes out of the file.

A published site may put a *wrapper* around a renderer — a **preset** for a first visit, and one or more **registries** of modules to install. The preset is taken only when there is nothing there already, so it can never overwrite somebody's work, and the page has no idea it came from a wrapper rather than from disk. That wrapper is neither the renderer nor this format; it is one way of getting a file and some modules into someone's hands. Hand someone a booklet and they get the activities it describes; hand them a booklet with no content and they get a blank workbook — which is all a *preset* is.

This document is the format. It is deliberately small, it is versioned, and it is published separately from the page that implements it so that something else can read or write these files later. Released under the Apache Licence 2.0, whose explicit patent grant is meant to travel to anyone implementing it.

> **Status: version 1, draft.** Record format v6 (per-block). Checked by `lint-booklet.py` in this repository. Nothing outside this repository depends on it yet, so it can still change; once something does, it changes by version.

---

## Why it looks like this

Three existing things shaped it, none of which fit on their own.

- **Front matter** — the `---` header above a Markdown body, from Jekyll and Hugo and now standard in Obsidian and its neighbours — is how a text file carries structured facts about itself without stopping being a text file. A booklet opens with one. That is why a booklet is already a valid Hugo page and a valid Obsidian note with visible properties, and why "sync to Obsidian" needs no integration: the file goes in the vault, and the vault syncs.
- **Twine's split between a story and a story format** is the same shape as the split here between content and template: data in the file, presentation swappable. Twine has published, versioned specs for this; that is the precedent for publishing one here.
- **SurveyJS's JSON model** supplied the vocabulary for describing a question — a typed element with a name, a title, and choices, with per-locale labels inline as `{en: …, fr: …}`. Where this format names things, it prefers their names.

**And two that deliberately did not shape it.** [JSON Canvas](https://jsoncanvas.org/) is Obsidian's small MIT-licensed spec for infinite-canvas files; it covers spatial layout of boxes and edges, which has nothing to do with activities and questions. It is the *procedural* model here — extract the format, version it, license it permissively, publish it apart from the app — not a content model. And **FHIR Questionnaire**, the healthcare standard, is far too heavy to author in; the only concession made to it is that fields are addressed by stable id and answers are stored keyed by that id, which is what would make a one-way export cheap if this ever needs to speak to a clinical or research system.

---

## The file

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
  "name": { "en": "Activity Kit" },
  "modules": [
    { "id": "who/what", "version": "0.1", "file": "what.md",
      "title": {…}, "blurb": {…}, "engines": ["grid-select"] },
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
| `meta` | yes | `app`, `v`, `booklet`, which booklet this is (`booklet_id`, `booklet_version`, `customized`), and anything the booklet shares across modules (`body`, `menus`) |
| `widget` | **one per widget used** | a whole widget — the data an engine draws with |
| `module` | **one per activity** | a whole module — see below |
| `person` | yes | name, email, language, note, question overrides, preferences, the `sync` slot |
| `fields` | yes | the board's content, keyed by field id |
| `entries` | **one per activity** | `mode` names the activity, `items` are its kept entries |
| `board` | yes | the Now board, areas, the archive |
| `drafts` | yes | anything unfinished, so nothing is lost mid-thought |

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

## A module — one activity, portable on its own

**A booklet is an ordered list of modules.** A module is what you add to a booklet and what you take out of one, which is the difference between "take this whole booklet or none of it" and "add the day to what I already have".

```jsonc
{ "block": "module",
  "id": "example/the-day",          // stable; adding the same id updates in place
  "version": "0.1",
  "title": { "en": "Have a good day", "fr": "Passer une bonne journée" },
  "blurb": { "en": "…", "fr": "…" },
  "reads": ["weekday", "weekend"],  // map fields it draws on; soft, not a dependency
  "menus": { "weekday": ["…"] },    // the option lists its own blocks need
  "widgets": [ … ],                 // the widgets its blocks name, carried whole
  "rights":{ "copyright": "…", "license": "…", "source": "…" },
  "copy":  { "en": {…}, "fr": {…} },// its own wording, per language
  "library": {…},                   // reference content, if it offers any
  "map":   [ … ],                   // cards, if this module is a board
  "mode":  { … } }                  // the activity itself
```

**A module may also carry things that belong to the whole booklet** rather than
to its own activity: `menus` the blocks name, the `widgets` they draw with, and
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

Two views are **not** modules — the guide and the history. They have nothing of their own to configure, and a booklet without them would be missing its own back button.

**Every activity is a list of blocks, whatever its kind.** An `entry` mode
produces kept entries and a `board` mode does not, but both render the same
way — there is no bespoke view for any activity in a conforming renderer.

### The mode inside a module

`id`, and a `kind` the renderer knows how to draw:

| `kind` | what it is |
| --- | --- |
| `entry` | produces kept entries — a Finalize button and a history |
| `board` | persistent, edited in place; never finalized |
| `guide` | static reading |
| `log` | the history of what was kept |

Other keys: `home` (false hides it from the home screen), `head` (copy references for its heading), `chrome` (extra machinery, currently only `"areas"`), `keep` (fields surviving a finalize), `accent`, `icon`, `rail`, and `blocks`.

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

**An `entry` mode the page has never seen still works.** Its kept entries go to an `entries` block named for it, and its draft is held alongside the built-in ones.

### A block inside a mode

| `type` | what it draws | needs |
| --- | --- | --- |
| `heading` | a section heading, optionally numbered | `text`, optional `n` |
| `prose` | paragraphs; a blank line starts a new one | `text` |
| `deflist` | named points — a label and what it says | `items: [{label, body}…]` |
| `quote` | one line set apart from the rest | `text` |
| `image` | a linked picture, never an embedded one | `src`, `alt` |
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

**The first five only read.** They carry no answer, and — unlike every other
type — they own **no entry key at all**, so the id-defaulting rule below can
never hand a heading or a paragraph an answer slot that would be wrong to fill.
They are what lets something long enough to need sections be built out of blocks
rather than out of a view written for it: a conforming renderer has no separate
notion of "a page of reading" and needs none.

Every block may carry `placement`, which is the whole above-the-fold control:

- **`open`** — rendered in place.
- **`folded`** — inside a disclosure, opened automatically if it already has content. A folded block must be named, or it is a control nobody can find.
- **`hidden`** — not rendered. Its data is kept.

### Where a thing goes: `display`

**Nothing is positioned by where it sits in the file.** Any module, mode or block may carry a `display` object:

| key | applies to | means |
| --- | --- | --- |
| `order` | modules, blocks | a number; lower comes first. Sorting is **stable**, and anything without an order sorts **after** everything that has one |
| `show` | modules | `false` takes it off the home screen and keeps its data |
| `placement` | blocks | `open` renders in place · `folded` hides it behind a named disclosure · `hidden` does not render but keeps its data |

**Written order is the fallback, not the rule.** If *no* sibling in a set carries an `order`, the order they are written in is used — which is what makes a hand-written booklet behave sensibly without anyone setting numbers. As soon as one sibling has an order, the set sorts by it.

An implementation that lets a person rearrange things **must write the parameters** rather than rewriting the file's sequence, so that nobody has to hand-edit JSON to move an activity.

### Where data goes: ids, never positions

- **Board content** lives in the `fields` block, an **object keyed by field id**. Key order is meaningless.
- **Kept entries** live in an `entries` block per activity — `mode` names the activity, `items` is a list. Each item carries a `ts`, and **items may be in any order**: an entry is identified by its timestamp, never by its index.
- **Within an entry**, a value is stored under the key its block owns. A block owns the keys named in its `keys`, which **defaults to the block's own `id`** — except for the reading blocks above, which own none. The three composite widgets own a differently-named key and declare it: `bodymap` → `regions`, `quadrants` → `emotions`, `headlines` → `thoughts`.
- **Modules** are addressed by `id`. Adding a module whose id is already present replaces it in place.

### Wording belongs to the activity

A module carries `copy: {en: {…}, fr: {…}}` — the words its own questions, headings and cards use. A renderer looks there **before** its own strings, and keeps only what is genuinely its own: the vocabulary of its widgets (the quadrant names, the body regions, the sensation words) and its interface strings (buttons, dialogs).

⚠️ **The layering is two deep, and must be.** A module wording `checkin.h` must not wipe out `checkin.emo`, which is the quadrant widget's own vocabulary. Merge at the second level, module over renderer.

**Resolution, in order:** the module's or block's own `title`/`label` (a string, or `{en, fr}`) → the module's `copy` → the renderer's own strings → the literal fallback. That is what lets a preset rename one card without restating the app in two languages.

---

## `fields` and `entries` — what the person wrote

Board content is keyed by field id in the `fields` block. Kept entries live in an `entries` block per activity, each item carrying a `ts`. Answers are keyed by the field id the module gave them — the pairing that keeps a FHIR export cheap.

Nothing in a `module` block contains anything a person wrote, and nothing in `fields` or `entries` describes layout. A linted preset asserts both.

## `person` — their own presets

`name`, `email`, `lang`, `mode`, `note`, `protect`, question overrides in `q`, extra feeling words in `emo`, `prefs`, `setup`, and a `sync` slot reserved for a storage target. **A passphrase is never stored, here or anywhere.**

---

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

A conforming reader must: parse front matter positionally; prefer the human half per section; find blocks by their fences; **parse each block independently and skip, count and report any block it cannot read rather than abandoning the file**; refuse a module naming unknown kinds or types rather than rendering it partially; and treat every string a person wrote as content, never as instruction.

A conforming writer must: emit front matter with `booklet: 1`; emit a `meta` block and one `module` block per activity; keep module ids and field ids stable; and never write a passphrase, or anything a person typed, into a `module` block.

`lint-booklet.py` in this repository checks all of the structural rules above and is the reference implementation of "is this file valid".
