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

| | | status |
| --- | --- | --- |
| [`SPEC.md`](SPEC.md) | the format, versioned and published separately from anything that implements it | ✅ here |
| [`lint-booklet.py`](lint-booklet.py) | the reference validator — "is this file valid" | ✅ here |
| `booklet.html` | the renderer | 🚧 not yet — see below |
| `examples/`, `modules/`, `widgets/` | worked examples and generic fixtures | 🚧 not yet |
| `test/` | the suite that drives the renderer against those fixtures | 🚧 not yet |

### Why the renderer is not here yet

The renderer works, is in production, and is ~300KB of a single self-contained HTML file. It is not in this repo because **it does not yet satisfy the claim this README makes about it.** An audit found real content baked into it as literal strings rather than supplied by a booklet:

- a complete built-in reader's guide, in two languages, on the psychology of emotion
- a block of Canadian crisis-line phone numbers
- default vocabulary — feeling names, body regions — from one specific practice
- CSS classes and a colour map keyed by that vocabulary
- a hard-coded URL naming one private repository

None of that is a bug in the ordinary sense; it all works. But "the renderer holds no content" is the property the three-part split above depends on, and right now that property is **asserted rather than demonstrated** — the only booklets the renderer has ever been tested against belong to the practice it was written for.

The work before it lands here is therefore not a file move. It is: lift that content out into modules where it belongs, write generic non-clinical fixtures, and re-point the test suite at them. When the suite passes against fixtures that have nothing to do with any one practice, the claim is demonstrated, and the renderer can move.

---

## Status

**Version 1 of the format, draft. Record format v6.** In production in one place, which is the only implementation so far. Nothing outside that depends on the format yet, so it can still change; once something does, it changes by version.

Released under the [Apache Licence 2.0](LICENSE) — which, for a format meant to be implemented by other people, is the point: it carries an explicit patent grant, so anyone writing a reader or writer for this format gets that protection along with the copyright permission.
