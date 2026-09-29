# Booklet

**A booklet is one Markdown file that holds a person's work *and* the design of the activities they did it in.**

Open it in a text editor and you can read everything, top to bottom — questions declared in plain lines, prose free to use every heading level, the reader's own answers set apart at the end. There is no account, no server, no database. You can email a booklet to yourself, drop it in a Dropbox or an Obsidian vault, print it, or hand it to a language model and say *"help me add an activity to this."*

```markdown
---
booklet: 2
id: example/check-in
title: A daily check-in
lang: en
version: "0.1"
---

# A daily check-in

> [!activity|checkin repeat] How today went

> [!text|note] What happened?

%%
> [!records] App record — do not edit below this line

> [!records|checkin] A daily check-in

```booklet entries checkin
{"items": [
{"ts": "2026-09-27T08:00:00Z", "note": "Slept badly, but the walk helped more than I expected."}
]}
```
%%
```

This is **version 2** of the format — see [`SPEC.md`](SPEC.md) for the full
format, and [`docs/why-markdown.md`](docs/why-markdown.md) for how it was
arrived at: what the wider Markdown-tooling field already does, what Booklet
needs that nothing else supplies, and why each real choice landed where it
did. **Version 1**, which kept a booklet's design as fenced JSON blocks
rather than Markdown, is no longer read, written, or documented (2026-09-29):
the reference renderer and validator only ever recognize `booklet: 2`.

---

## The three parts, and why they are separate

This is the distinction the whole design rests on, and it is easy to get backwards.

| | what it is | where it lives |
| --- | --- | --- |
| **The renderer** | one static HTML file. It holds **engines** — the ability to make an SVG's regions clickable, to lay out a grid of selectable words, to open cards one at a time — and its own interface strings. **It holds no activities and no content.** | this repo |
| **The booklet** | the file above. Every activity, every question, every word a reader sees, and everything they wrote. **All state lives here.** | the reader's device |
| **The wrapper** | what a website puts *around* a renderer: a preset booklet and one or more registries of modules someone may install. Neither the renderer nor the format — just one way of getting a file into somebody's hands. | whoever publishes it |

**The renderer is not a content store or source of truth.** It is rendered
output — a viewer. This reference implementation caches in-progress work in the
browser so a closed tab is recoverable, but the portable artifact is the
booklet file and the format does not require browser storage. Hand the renderer
a booklet and it draws that booklet. Hand it activities it has never heard of
and it draws those too, as long as they use engines it has.

---

## The vocabulary

- **Module** — one activity, whole and portable: its questions, its own wording in each language, and the widgets it draws with. You add a module to a booklet or take one out; that is the difference between "take this whole booklet or none of it" and "add this one activity to what I already have."
- **Widget** — *data*, never code, that specialises an engine: the figures and region names for a body map, the axes and cells for a grid, the cards for a board. Widgets ride inside the booklet, so an activity never arrives without the thing it draws with.
- **Engine** — the drawing ability the renderer provides. Three so far: `svg-regions`, `grid-select`, `card-board`.
- **Block** — the unit of a page. `prose`, `image`, `text`, `headlines`, `list`, `didlog`, `widget`, `group`. Every activity is a list of blocks, whatever its kind — there is no bespoke view for any activity in a conforming renderer.
- **Preset** — a booklet with a design and no content. A blank workbook.

**Nothing is addressed by position, with one exception.** Modules are found by `id`, board content by field id, kept entries by their timestamp. Where a thing *appears* is set by `display.order` in version 1 (written order, in version 2), and written order decides anything only when no sibling carries an order at all. The exception: a version 2 choice or scale question stores its answer as the option's *position*, not its words, because a translation is a separate file and only a position is guaranteed to match across languages — see [`SPEC.md`](SPEC.md).

**The record is a series of independent JSON blocks, not one object**, in both versions. A block that will not parse costs you that block and nothing else — one mangled module means one missing activity, never a lost file.

---

## What is in this repo

| | |
| --- | --- |
| [`booklet.html`](booklet.html) | **the renderer.** One static file, no build step, no dependencies. Reads version 2 only — no earlier format opens |
| [`SPEC.md`](SPEC.md) | the current format (version 2), versioned and published separately from anything that implements it |
| [`docs/why-markdown.md`](docs/why-markdown.md) | what shaped version 2: the field surveyed, the aims, the choices made and rejected |
| [`SKILL.md`](SKILL.md) | instructions to hand an AI agent so it can make a valid booklet from a plain request; `test/skill.test.js` keeps its examples true |
| [`lint-booklet.py`](lint-booklet.py) | the reference validator — "is this file valid" |
| [`examples/`](examples/) | complete booklets you can open — `how-tides-work.booklet.md` and `mindful-check-in.booklet.md` |
| [`modules/`](modules/) | generic examples and separately licensed registry content, offered through `registry.json` — one module per file, its widgets carried inline (see `SPEC.md` §7) |
| [`test/`](test/) | the suite, run with `test/run.sh` |
| [`registry.json`](registry.json) | the examples registry — what this repo offers |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | how to add an activity |

## Try it

Download `booklet.html` and `examples/how-tides-work.booklet.md`, open the HTML file in a browser —
**straight off your disk, `file://` is fine** — and press *Load* to open the
markdown file. No server, no install, no network: verified with `fetch` and
`XMLHttpRequest` stubbed to fail.

A module file (any file in `modules/`) loads as what it is, one activity: on
"Your booklets" it starts a new booklet holding it, and inside a booklet it is
added to that booklet, with nothing already there replaced.

A booklet file loaded inside a booklet asks first whenever something there
would be lost: entries, or a design of its own (a booklet with no entries is
still somebody's work). *Add to what's here* keeps this booklet's design and
brings in the file's entries and the activities it lacks; *Replace what's here*
takes the file's booklet whole. The message afterwards says which happened. A
file loads without asking only into a booklet with no design of its own, or
when it is a later copy of the same booklet (the same booklet id, holding every
module this one holds) and nothing here is left undownloaded, which is how a
saved file goes back into the blank booklet a site's preset made.

The renderer opens **empty**, because it holds no booklet of its own. That is
the property everything else here rests on.

**Send or save a copy** adapts to the device without adding a storage service.
On a touch-first device it opens the operating system's share sheet with the
actual `.md` file. On desktop it opens a small panel and shows only the
capabilities the browser provides: system sharing, saving to a chosen file,
downloading, copying as text, and optional passphrase protection. The renderer
never contacts Mail, Drive, Dropbox or another destination itself.

### How "it holds no content" got demonstrated

The renderer arrived here carrying six things it should not have: a two-language
reader's guide on the psychology of emotion, a block of Canadian crisis-line
numbers, one practice's feeling and body vocabulary as defaults, a stylesheet
and colour map keyed by that vocabulary, a namespace, and a URL into a private
repository. None of it was a bug — it all worked. But every one of them was the
engine knowing something only a booklet should know.

They came out one at a time, and each became a capability instead: a guide is
now an activity built from ordinary blocks; crisis resources are a **pinned
panel** any booklet can declare; cell colours and cell names are both the
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

`booklet.html` needs nothing from a host: copy it anywhere and it works. A site
that wants more (a preset for new booklets, a page locked to one booklet, a
menu of modules, install to a phone's home screen) adds three small things
beside it. None of them is part
of the renderer or of the format, and a page with none of them is just a
renderer and a Load button.

### Publish a `manifest.webmanifest` beside it

The renderer's `<head>` links `manifest.webmanifest`, resolved relative to the
page. A **web app manifest** is a small JSON file that tells the browser the
page is an installable app: its name, its icon, and which URL to open when the
person taps it on their home screen. **The renderer does not ship one and a site
must publish its own.** Without it, "Add to Home Screen" quietly gives a plain
bookmark (or nothing), with no error anywhere, because a missing manifest is
not a failure the page can see. Two more conditions apply:

- **Serve over https** (`localhost` counts). Opened from disk, or over plain
  http, install is not offered, and a phone will not keep the person's data the
  way it does for an installed app. This is also what turns on the share sheet.
- **Serve the file as JSON**, with the type `application/manifest+json`
  (most hosts already do this for `.webmanifest`), and put it at the same path
  as the renderer, or change the `href` in your copy of the page.

A minimal manifest, for a renderer published at `/tools/booklet.html`:

```json
{
  "name": "My Booklets",
  "short_name": "Booklets",
  "start_url": "/tools/booklet.html",
  "scope": "/tools/",
  "display": "standalone",
  "background_color": "#FFFCF4",
  "theme_color": "#12996E",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

`theme_color` matches the renderer's own `<meta name="theme-color">`. The
192px and 512px PNG icons are what Android needs to offer install; the renderer
carries an inline icon of its own only for the browser tab and for iOS. The
renderer registers no service worker, so a manifest and https are all it takes.

### Embedding the renderer: the `booklet-wrapper` element

To hand the page anything, put a JSON element in the page around the renderer's
markup (your copy of `booklet.html`, or a page that includes it):

```html
<script type="application/json" id="booklet-wrapper">
{
  "registries": ["/tools/registry.json"],
  "modules": [],
  "preset_url": "/tools/start.booklet.md",
  "booklet": { "key": "daily-practice" },
  "lang": "es-AR"
}
</script>
```

If the element's JSON does not parse, the page behaves as if there were no
element. These are the keys the renderer reads today, and no others:

| Key | What it does |
| --- | --- |
| `registries` | a list of registry URLs (see [Registries](#registries)). Each is fetched once, after the page loads, to fill the "add an activity" menu; one that fails to load is skipped |
| `modules_url` | the older single form: a folder URL, whose `registry.json` is fetched. Read alongside `registries` |
| `modules` | a list of whole modules carried inline, offered in the menu with nothing to fetch. A module copied with its `"block": "module"` key is accepted, and a malformed one is left out |
| `preset_url` | the booklet a **new** booklet starts from: the one made by "Start a new booklet" on "Your booklets", or, with `booklet.key`, the one made on the first visit. It is never laid over a booklet that already holds modules |
| `starter_url` | the older name for `preset_url`, read when `preset_url` is absent |
| `booklet` | `{ "key": "<name>" }` locks the page to one booklet; see below. A key that is not a non-empty string is ignored |
| `lang` | the language the page opens in until the reader picks one: `en`, `fr`, `es` or `es-AR` (in any case). Any other value, `fr-CA` and `es-MX` included, is ignored. See below |

**Nothing else is read.** `booklet.preset_url` is not read; the preset is
always the top-level `preset_url`. No `wrapper.json` file is read.

**The language a page opens in.** The language a reader picks, on "Your
booklets" or in any booklet, is that browser's choice for every page of the
origin: it is kept in `localStorage` under `booklet.ui.lang`, apart from every
booklet's data, and a reload keeps it. Until the reader picks one, the
wrapper's `lang` stands in for that choice and is read the same way; nothing is
stored for the reader until they choose. A booklet opens in the choice in force
(the reader's, else the site's) whenever it offers that language, over the
language it or its preset was saved in; Spanish takes a booklet's own `es-AR`.
With neither a choice nor a wrapper `lang`, a page opens in English, and a
booklet in the language it was saved in, or, the first time, in its preset's
`lang`. A booklet that does not offer the language in force opens in its own,
and a booklet that declares one language always reads in it.

**On a site whose `lang` is `es-AR`**, `es-AR` is the Spanish on offer, so a
Spanish reader there never drops back to neutral *tú* Spanish. The toggle keeps
its three buttons, and its ES button stands for `es-AR`: pressing it gives
`es-AR` and records `es-AR` as the reader's choice, and the button is named
*Español (Argentina)* to screen readers and on hover. Personalize lists
*Español (Argentina)* in place of *Español*, and a choice of Spanish made on
another page of the origin reads as `es-AR` here. Only a booklet that declares
neutral `es` and not `es-AR` shows neutral Spanish.

**Without `booklet.key`**, the page opens on "Your booklets", the list of every
booklet kept in that browser, unless the address names one (`#/b/<id>`). Each
booklet keeps its own answers. `preset_url` is used only when the reader starts
a new booklet; a first visit shows the empty list, not the preset.

**With `"booklet": { "key": "<name>" }`**, the page is locked to one booklet:

- It opens that booklet directly and **never shows "Your booklets"**. Its home
  button stays on the booklet's home, and an address naming another booklet
  leads to this one's home instead.
- **On the first visit it creates the booklet from the preset.** Once the page
  has loaded, it fetches `preset_url` if the booklet holds no modules, and saves
  the result at once, so a second visit does not fetch it again.
- **Existing progress is adopted in place.** Renderers from before "Your
  booklets" kept one save per browser, under the `localStorage` key
  `useful-next-step.v1`. On a keyed page, the first run of this renderer makes
  that save the keyed booklet, where it already is: nothing is copied, and the
  preset is not laid over it.
- **The key is the booklet's identity in that browser.** Two keys on one
  origin are two booklets with separate answers. Changing a page's key later
  gives its readers a new booklet made from the preset; the old one stays in
  the browser and is listed on any page of the same origin that has no key, but
  the page with the new key no longer opens it.

**Migrating a site when you re-pin the renderer.** If your pages ran a renderer
from before "Your booklets" and each page is meant to hold one booklet, add
`"booklet": { "key": "<name>" }` to each page's wrapper **in the same change
that re-pins the renderer**, and keep that key stable from then on. With the
key, a returning reader lands straight in their existing booklet, adopted in
place. Without it, they land on "Your booklets" with their old save as a
one-item list and must tap it to continue. The renderer only ever calls
`localStorage.getItem`, `setItem` and `removeItem`, on a few known keys (chiefly
`booklet.library.v1` for the list, `booklet.b.<id>` for each booklet and
`useful-next-step.v1` for the old save), and never lists the store. So a page
that namespaces those three calls per booklet, by prefixing every key, keeps its
old save under the same prefix, and the adoption finds it there.

**A booklet's own registries are not read yet.** The renderer's registry code
also looks for a `registries` list on the open booklet's design, but nothing
puts one there: a `registries` key in a booklet file's `meta` block is neither
read nor written back. Registries come from the wrapper only.

### Building a preset

`build-booklet.js`, which used to assemble a preset from version 1 JSON module
files, is removed — modules/ is version 2 now, and that tool had nothing left
to read. A version 2 preset is a booklet like any other: write the modules you
want as one file (see [`SPEC.md`](SPEC.md) §3 on module fences and manifests,
or splice several with the renderer's own "Add a module" feature), then check
it with `python3 lint-booklet.py your-preset.booklet.md`.

---

## Registries

A **registry** is one JSON file listing modules somebody offers, with enough in
each entry to draw a menu. A page fetches that one file — around 1KB — instead
of every module it might one day offer.

The public Booklet repository publishes one through GitHub Pages and takes
additions by pull request. But nothing there is a gate: a registry is a URL,
so it can be a repo, a folder on any host, or **a single file with its
modules carried inline and nothing to fetch at all**. A booklet may name its
own registries, so a reader can point their file wherever they like, but the
reference renderer does not read them from a file yet (see the wrapper keys
above).

See [`SPEC.md`](SPEC.md) for the format and [`CONTRIBUTING.md`](CONTRIBUTING.md)
for how to add to this one.

**This registry is an index, not an endorsement.** It carries format
demonstrations, general-purpose activities, and attributed professional content
whose ownership and distribution terms travel in its `rights` block. A listing
does not certify that a module is suitable, safe, or useful for a particular
person. Anyone may publish a separate registry under their own policy.

---

## Status

**Project v0.2, draft.** Only **version 2** (`SPEC.md`, Markdown-native) is
read, written, or documented as of 2026-09-29 — version 1, which stored a
booklet's design as fenced JSON, is retired entirely. There is no
independent second implementation yet. It is not stable: draft compatible
additions may extend it without changing its own number, and a breaking
change gets a new one. See `STATUS.md` for the detailed current state and
known gaps, and `docs/why-markdown.md` for how version 2 came to be.

### What is licensed how

**The software and the format** — the renderer, the validator, the build
scripts, `SPEC.md` — are Apache-2.0, and that is the point: a format meant to
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
