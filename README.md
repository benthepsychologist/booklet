# Booklet

**A booklet is one Markdown file that holds a person's work *and* the design of the activities they did it in.**

Open it in a text editor and you can read everything they wrote, under headings, in plain prose. Scroll past a long horizontal rule and you find the same file's other half: a series of fenced JSON blocks describing the activities themselves — what was asked, in what order, in which languages, drawn with what.

That is the whole idea. One file, no account, no server, no database. You can email it to yourself, drop it in a Dropbox or an Obsidian vault, print it, or hand it to a language model and say *"help me add an activity to this"* — because the file carries its own format description and everything needed to answer is already in their hands.

```
---
booklet: 1
title: "A daily check-in"
lang: en
updated: 2026-09-10 14:25
---

# A daily check-in

## How today went
Slept badly, but the walk helped more than I expected.

------------------------------------------------------------

## App record — do not edit below this line

```json
{ "block": "format", "spec": "booklet-1", "record_version": 6, … }
```

```json
{ "block": "module", "id": "example/check-in", … }
```
```

---

## The three parts, and why they are separate

This is the distinction the whole design rests on, and it is easy to get backwards.

| | what it is | where it lives |
| --- | --- | --- |
| **The renderer** | one static HTML file. It holds **engines** — the ability to make an SVG's regions clickable, to lay out a grid of selectable words, to open cards one at a time — and its own interface strings. **It holds no activities and no content.** | this repo |
| **The booklet** | the file above. Every activity, every question, every word a reader sees, and everything they wrote. **All state lives here.** | the reader's device |
| **The wrapper** | what a website puts *around* a renderer: a starter booklet for a first visit, a folder of modules someone may install. Neither the renderer nor the format — just one way of getting a file into somebody's hands. | whoever publishes it |

**The renderer stores nothing.** It is not a source of truth for anything, because it is rendered output — a viewer. Hand it a booklet and it draws that booklet. Hand it a booklet describing activities it has never heard of and it draws those too, as long as they are built from engines it has.

---

## The vocabulary

- **Module** — one activity, whole and portable: its questions, its own wording in each language, and the widgets it draws with. You add a module to a booklet or take one out; that is the difference between "take this whole booklet or none of it" and "add this one activity to what I already have."
- **Widget** — *data*, never code, that specialises an engine: the figures and region names for a body map, the axes and cells for a grid, the cards for a board. Widgets ride inside the booklet, so an activity never arrives without the thing it draws with.
- **Engine** — the drawing ability the renderer provides. Three so far: `svg-regions`, `grid-select`, `card-board`.
- **Block** — the unit of a page. `prose`, `image`, `text`, `headlines`, `list`, `didlog`, `widget`, `group`. Every activity is a list of blocks, whatever its kind — there is no bespoke view for any activity in a conforming renderer.
- **Preset** — a booklet with a design and no content. A blank workbook.

**Nothing is addressed by position.** Modules are found by `id`, board content by field id, kept entries by their timestamp. Where a thing *appears* is set by `display.order`, and written order decides anything only when no sibling carries an order at all. That is what lets a person rearrange their page without anyone hand-editing JSON.

**The record is a series of independent JSON blocks, not one object.** A block that will not parse costs you that block and nothing else — one mangled module means one missing activity, never a lost file.

---

## What is in this repo

| | |
| --- | --- |
| [`booklet.html`](booklet.html) | **the renderer.** One static file, no build step, no dependencies |
| [`SPEC.md`](SPEC.md) | the format, versioned and published separately from anything that implements it |
| [`lint-booklet.py`](lint-booklet.py) | the reference validator — "is this file valid" |
| [`examples/`](examples/) | a complete booklet you can open |
| [`modules/`](modules/), [`widgets/`](widgets/) | a worked activity and the two widgets it draws with |
| [`test/`](test/) | the suite, run with `test/run.sh` |
| [`build-example.js`](build-example.js) | writes the example booklet through the renderer itself |

## Try it

Download `booklet.html` and `examples/end-of-day.md`, open the HTML file in a
browser — **straight off your disk, `file://` is fine** — and press *Load* to
open the markdown file. No server, no install, no network: verified with
`fetch` and `XMLHttpRequest` stubbed to fail.

The renderer opens **empty**, because it holds no booklet of its own. That is
the property everything else here rests on.

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

## Status

**Version 1 of the format, draft. Record format v6.** In production in one place, which is the only implementation so far. Nothing outside that depends on the format yet, so it can still change; once something does, it changes by version.

Released under the [Apache Licence 2.0](LICENSE) — which, for a format meant to be implemented by other people, is the point: it carries an explicit patent grant, so anyone writing a reader or writer for this format gets that protection along with the copyright permission.
