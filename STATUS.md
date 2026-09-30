# STATUS — Booklet

*As of 2026-09-27*

Booklet is public at `github.com/benthepsychologist/booklet` under Apache-2.0,
**project v0.2**. The repository publishes two format generations, a
dependency-free static HTML renderer that reads both, the reference
validator, generic examples, and a default module registry, kept in its own repo (`booklet-registry`).

## Current state — v0.2 (2026-09-27, this release)

Markdown-native, recommended for anything new. Full format: `SPEC.md`. How it
was arrived at: `docs/why-markdown.md`.

- **Structure.** A module is a fenced pair of callout lines
  (`> [!module|id]` … `> [!module|id end]`), holding one or more activities;
  a bare activity outside any module fence needs no structure at all. Pages
  split on a thematic break (`***`/`---`). Every heading level stays free for
  prose — nothing about a booklet's structure depends on heading depth.
- **Questions:** eight kinds render today — `text`, `lines`, `widget`,
  `choice`, `multi`, `scale`, `number`, `date`. A choice or scale answer
  stores as the option's or anchor's *position*, so it carries across sibling
  language files unchanged. `matrix` is specified but not yet drawn.
- **Widgets** (the body map, the feelings grid) are fenced data blocks,
  referenced from the prose by an Obsidian-native embed (`![[#^id]]`).
  Verified in a real browser: both engines load and are fully operable.
- **Citations** are ordinary CommonMark footnotes. The reference renderer
  reads a footnote's own note text into structured source/citation data — the
  numbered mark, the side panel, the highlighted quote, the verified badge —
  with no separate registry.
- **Prose** is drawn by a real Markdown-to-DOM renderer (`test/md.js`,
  `mdNodes()`): headings, lists (including task lists and a list starting
  from any number), blockquotes, fenced code, tables, emphasis, links,
  images, reference-style links/images, footnote references, `$math$`
  (shown, not typeset), Obsidian embeds and wikilinks — never through
  `innerHTML`; link/image URLs are checked against an allow-list of schemes.
  91 checks in `test/md.test.js`, including an adversarial security suite.
- **Records** (a reader's own answers) sit in a section at the end of the
  file, wrapped in `%%` so Obsidian's Reading view hides them, grouped by
  the module they belong to. They never travel inside a module's own fence.
- **Two worked examples**, both driven through a real browser end to end
  (load, answer every question kind present, keep an entry, export, reload):
  `examples/mindful-check-in.booklet.md` (the original check-in, rebuilt) and
  `examples/how-tides-work.booklet.md` (two activities, a multi-page reading,
  a citation, math, a folded hint, choice and scale questions).
- **`lint-booklet.py`** checks v0.2 files by v0.2's own rules
  (module fences, id collisions, the blank-line rule, widget references) and
  agrees with the renderer about what is wrong with a file.
- **Not built yet:** matrix questions; editing a booklet's design in the
  browser (today that means a text editor — a deliberate, temporary scope
  decision, see `SPEC.md` §13); an Obsidian plugin; a second independent
  implementation.
- **Deleted, not fixed, 2026-09-29 — "add a map" needs rebuilding.** The
  day-picker's auto-add-a-card-board-module action is gone. It parsed a
  downloaded module through `moduleFromText()` (the old JSON-fence module
  parser, deleted the same day), so it would have failed silently against
  this repo's own real, current registry — every module it ships is v0.2
  now. Rebuild it on the same registry-aware path "Add a module" already
  uses (`shelfText()`/`addModuleFromText()`), not the deleted one.

## Ownership boundaries

The software and format are Apache-2.0. Module/widget content follows its own
embedded `rights` declaration when present. The `mensio/` namespace is generated
from `benthepsychologist-corpus`; fixes to those files belong upstream and arrive
through its publication adapter.

## Open

- **v0.2, immediate:** matrix questions, in-browser editing of a booklet's
  design, an Obsidian plugin — see "Current state — v0.2" above and
  `SPEC.md` §13. Next up: the blind authoring test (fresh language models
  writing v0.2 booklets from `SPEC.md` alone).
- The reference renderer is the only implementation of the format so far, and
  no published site runs it in production yet, so no second independent
  reader/writer exists. Format changes therefore
  remain possible, but compatibility-breaking changes require a new version.
- Browser capabilities differ: native sharing and direct file handles are
  feature-detected, with Download and Copy fallbacks.
- Community registry policy and review are documented in `CONTRIBUTING.md`; the
  registry is an index, not an endorsement or safety certification.
- The `mensio-*` modules and widgets lack Spanish (`es`); it has to be added in
  `benthepsychologist-corpus` and arrive through its adapter.
- The example board's sixteen menu options, carried by a module that has since been removed
  (the standalone `widgets/project-board.md` they came from is deleted, 2026-
  09-29, with the rest of the standalone widget files), are one list per
  language, in French and Spanish as well as English, and await a native
  speaker's review. A reader older than per-language menus cannot draw The
  board (see above).

