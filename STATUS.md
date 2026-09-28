# STATUS — Booklet

*As of 2026-09-27*

Booklet is public at `github.com/benthepsychologist/booklet` under Apache-2.0,
**project v0.2**. The repository publishes two format generations, a
dependency-free static HTML renderer that reads both, the reference
validator, generic examples, and a GitHub Pages-backed module registry.

## Current state — version 2 (2026-09-27, this release)

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
  referenced from the prose by an Obsidian-native embed (`![[#^id]]`) and
  drawn by the same engines version 1 uses. Verified in a real browser: both
  engines load and are fully operable from a version 2 file.
- **Citations** are ordinary CommonMark footnotes. The reference renderer
  reads a footnote's own note text into the same source/citation data version
  1's citation panel already draws from — the numbered mark, the side panel,
  the highlighted quote, the verified badge — with no separate registry.
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
- **`lint-booklet.py`** checks version 2 files by version 2's own rules
  (module fences, id collisions, the blank-line rule, widget references) and
  agrees with the renderer about what is wrong with a file.
- **Not built yet:** matrix questions; editing a version 2 booklet's design
  in the browser (today that means a text editor — a deliberate, temporary
  scope decision, see `SPEC.md` §14); an Obsidian plugin; a version 1 → 2
  converter; a second independent implementation.

## Current state — version 1 (legacy, still fully supported)

- **Format:** Booklet format version 1, still marked draft; record format v6,
  using independently parsed fenced JSON blocks. Full format: `SPEC-v1.md`.
- **Renderer:** `booklet.html`, one static file that works from `file://` with a
  booklet loaded from disk. It contains three engines: `svg-regions`,
  `grid-select`, and `card-board`; it contains no modules or widgets.
- **Website wrappers:** may provide a preset and one or more registries. A
  reload restores the reader's whole booklet — installed modules and any
  in-place edits, not only entries — from `localStorage`. A wrapper's preset
  is what a newly started booklet begins from; a wrapper `booklet.key` locks
  the page to one booklet (no list), made from the preset on its first visit.
- **Export:** touch-first devices use the operating-system share sheet when file
  sharing is available. Desktop gets an adaptive Share, Save, Download, Copy,
  and optional passphrase panel; unsupported actions are omitted.
  Exports are named from the booklet's own title, `<slug>.booklet.md`
  (`booklet.booklet.md` when it has none). The renderer's own name is
  "Booklet", untranslated, and it writes `app:"booklet"` as `SPEC.md` says; it
  still reads files that carry the older `useful-next-step` name.
- **Format additions (compatible, still version 1):** `SPEC.md` recommends the
  `*.booklet.md` extension (readers keep accepting plain `.md`) and defines the
  optional `person.sync` slot (`provider`, `ref`, `synced`, `rev`; `provider` is
  an open list, and a reader that does not understand the slot preserves it).
- **Integrated, not yet released (2026-09-26):** the renderer opens on "Your
  booklets", and each booklet keeps its own answers in this browser (routes
  `#/`, `#/b/<id>`, `#/b/<id>/<view>` survive a reload and Back); a module may
  hold several activities in `activities` (one stays in `mode`); English,
  Spanish and French interface tables exist; the old tinker-page names are
  gone from the renderer, which calls itself "Booklet".
- **Activity pages and Spanish (2026-09-26):** an activity can now be made of
  pages (a menu on the left that can be minimized; while editing, a thin plus
  strip adds a page), and neutral Spanish (`es`) and Argentine (`es-AR`) interface
  tables exist beside English and French, with no interface string left untranslated.
- **Per-language menus (2026-09-27):** a menu (the options a list offers, in a
  widget's, a module's or the booklet's `menus`) may be one list per language,
  `{en: [...], fr: [...], es: [...]}`, the lists the same length and order. A
  pick is still kept as the words picked, and the renderer recognises it in any
  of the menu's languages, so it stays chosen across a switch of language; the
  linter refuses lists of different lengths and a missing language the module
  offers. A reader older than this cannot draw a board whose menu is written
  this way (`SPEC.md`, "Additions to version 1").
- **Reading material, first slice (2026-09-26, branch `feat/reading-blocks`):**
  a module may carry `sources` and `citations`; `[^id]` in prose, quote,
  deflist or callout text is a numbered citation that opens a side panel
  (bottom sheet on a phone) with source, pages, highlighted quote, a link to
  the original at that page and a verified badge; new `callout` (diff, law,
  opinion, with a view-only filter row) and `sources` blocks; endnotes in
  print. Not yet: a pinned oral-summary block, per-section review marks, a
  syllabus rail, quiz deep links, a booklet-wide sources page.
- **Polish (2026-09-26, branch `fix/render-and-reading-polish`):** a folded
  block is named by its `copy` in any shape (a reference, one value per
  language, or plain words), read down the language chain key by key, so
  daily-journal, decision-log and weekly-review no longer show a block id; the
  same lookup now serves `head`, list and tick-list copy and question wording.
  The definition-list editor cites a source like the prose editor, and a
  citation mark belongs to its text in every language: a language that lacks a
  mark shows it at the end of the same paragraph, and the editor offers to put
  it there. The open citation panel sits beside the page from 900px wide (the
  page moves over; a bottom sheet below that), stays open across a language
  switch, and the sources block leads back to every place a citation is
  marked. `test/polish.test.js` holds all of it.
- **Registry:** 10 approved modules: six Apache-2.0 examples/general-purpose
  activities and four copyrighted Mensio modules carrying their own terms.
- **Registry languages (2026-09-27):** the registry's content is set up in
  `en`, `fr` and `es` (`CONTRIBUTING.md`). The six example modules and their
  three widgets carry all three; `lint-booklet.py` warns about a file under
  `modules/` or `widgets/` missing one, and today warns only about the seven
  `mensio-*` files, which still lack `es` and are fixed upstream (see
  "Ownership boundaries"). The format itself still accepts any subset.
- **Validation:** `test/run.sh` (which CI runs) checks the renderer, all 17
  booklet/module/widget files, generated examples, registry freshness, and
  every `test/*.test.js`.
- **Naming is editable in place:** the home page's headline and tagline
  (booklet-level, `meta.head` — falls back to the renderer's own wording when a
  booklet sets none) and every activity's own name and description (a module's
  `title`/`blurb`) render as plain text normally and open into the same field
  chrome as any other block while editing is on. Nothing new to configure —
  existing modules and booklets are unaffected until a reader actually edits one.
- **Custom entry activities are first-class in history:** a module whose mode
  is `kind:"entry"` now gets a chip strip on its own page, a generic
  block-driven kept-entry summary, and a history filter, the same as the two
  built-in activities — the renderer no longer needs to know a mode by name to
  show its kept entries. An `entry` mode may also set `upsert:"day"` to keep
  one entry per calendar day (a daily log) instead of one per Finalize.
- **Editing keeps focus.** Typing anywhere in "edit this page" mode used to
  lose focus after every character, because a field-level edit rebuilt the
  entire block list. Now only a block's own header/preview refreshes on a
  field edit; a full rebuild happens only for a genuine structural change
  (add/remove/reorder a block or widget item, open/close a panel).
- **A suggest-as-you-type word field** sits alongside the vocabulary buttons
  in `svg-regions` and `grid-select`: type or dictate several comma-separated
  words, get suggestions from the widget's own vocabulary via a native
  `<datalist>`, and add a word that isn't in it. Buttons stay, reading and
  writing the same underlying data — no format change. **Visible by default,
  a per-widget toggle in the editor** (`W.showTags`, a `widgetEditor`
  checkbox) — off hides the field and leaves only the buttons, unaffected
  either way; the setting travels with the widget in the saved file.

- **`SKILL.md` (2026-09-26):** an instruction file a person can hand an AI
  agent so it makes a valid booklet from a plain request, with three worked
  examples and a check for what the linter misses. Nine fresh agents across
  three rounds built booklets from it alone, all lint-clean at the first try;
  three are kept as `test/fixtures/skill-*.booklet.md`, and `test/skill.test.js`
  lints and loads them with the examples.

## Ownership boundaries

The software and format are Apache-2.0. Module/widget content follows its own
embedded `rights` declaration when present. The `mensio/` namespace is generated
from `benthepsychologist-corpus`; fixes to those files belong upstream and arrive
through its publication adapter.

## Open

- **Version 2, immediate:** matrix questions, in-browser editing of a version
  2 booklet's design, an Obsidian plugin, and a version 1 → 2 converter — see
  "Current state — version 2" above and `SPEC.md` §14. Next up: the blind
  authoring test (fresh language models writing version 2 booklets from
  `SPEC.md` alone, against version 1's own nine-of-nine baseline).
- The reference renderer is the only implementation of either format version
  so far, and no published site runs version 2 in production yet, so no
  second independent reader/writer exists. Format changes therefore
  remain possible, but compatibility-breaking changes require a new version.
- Browser capabilities differ: native sharing and direct file handles are
  feature-detected, with Download and Copy fallbacks.
- Community registry policy and review are documented in `CONTRIBUTING.md`; the
  registry is an index, not an endorsement or safety certification.
- The `mensio-*` modules and widgets lack Spanish (`es`); it has to be added in
  `benthepsychologist-corpus` and arrive through its adapter.
- The example board's sixteen menu options (`widgets/project-board.md`, carried
  by `modules/the-board.md`) are now one list per language, in French and
  Spanish as well as English, and await a native speaker's review. A reader
  older than per-language menus cannot draw The board (see above).

