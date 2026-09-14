# STATUS — Booklet

*As of 2026-09-14*

Booklet is public at `github.com/benthepsychologist/booklet` under Apache-2.0.
The repository publishes the format specification, a dependency-free static
HTML renderer, the reference validator, generic examples, and a GitHub
Pages-backed module registry.

## Current state

- **Format:** Booklet format version 1, still marked draft; record format v6,
  using independently parsed fenced JSON blocks.
- **Renderer:** `booklet.html`, one static file that works from `file://` with a
  booklet loaded from disk. It contains three engines: `svg-regions`,
  `grid-select`, and `card-board`; it contains no modules or widgets.
- **Website wrappers:** may provide a preset and one or more registries. A
  reload now restores the reader's whole booklet — installed modules and any
  in-place edits, not only entries — from `localStorage`; the reference
  renderer reaches for the wrapper's preset only when nothing usable was
  saved (a first visit, cleared storage, or a save from before this existed,
  which still carries entries with no matching design).
- **Export:** touch-first devices use the operating-system share sheet when file
  sharing is available. Desktop gets an adaptive Share, Save, Download, Copy,
  and optional passphrase panel; unsupported actions are omitted.
- **Registry:** 10 approved modules: six Apache-2.0 examples/general-purpose
  activities and four copyrighted Mensio modules carrying their own terms.
- **Validation:** `test/run.sh` and `.github/workflows/ci.yml` check the renderer,
  all 17 booklet/module/widget files, generated examples, and registry freshness.
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
  writing the same underlying data — no format change.

## Ownership boundaries

The software and format are Apache-2.0. Module/widget content follows its own
embedded `rights` declaration when present. The `mensio/` namespace is generated
from `benthepsychologist-corpus`; fixes to those files belong upstream and arrive
through its publication adapter.

## Open

- The format is used in production by the Activity Kit website, but no second
  independent reader/writer implementation exists yet. Format changes therefore
  remain possible, but compatibility-breaking changes require a new version.
- Browser capabilities differ: native sharing and direct file handles are
  feature-detected, with Download and Copy fallbacks.
- Community registry policy and review are documented in `CONTRIBUTING.md`; the
  registry is an index, not an endorsement or safety certification.

