# STATUS — Booklet

*As of 2026-10-03*

Booklet is public at `github.com/benthepsychologist/booklet` under Apache-2.0,
**project v0.3**: format v0.3 (files say `booklet: 0.3`) and renderer 0.3.0.
This repository holds the format spec (`SPEC.md`), the reference renderer
(`booklet.html`, one static file), the linter (`lint-booklet.py`), the
authoring skill (`SKILL.md`) and two examples. Modules live in their own
repo, `booklet-registry`.

## Current state — v0.3 (2026-10-03)

What changed from v0.2 is listed at the end of `SPEC.md` (section 14): callout
settings are written `key:value`, `of=` and the `pinned` flag are gone, the
locked-file envelope is gone, the `booklet query` block is new, and the
`svg-regions` figure contract is written down. A `booklet: 0.2` file is refused
with a message saying so.

- **The renderer is bare.** It draws what `SPEC.md` defines, and adds four
  things: an empty "Your booklets" start list, adding modules from a registry,
  keeping a reader's work in the browser, and Download a copy. It holds no
  activities, no content and no site wrapper.
- **Its one setting** is the `<meta name="booklet-registry">` tag in its head,
  pointing at `booklet-registry`'s `registry.json`. The list and each module
  are fetched fresh when "Add a module" is used.
- **Questions:** `text` (and `long`), `lines`, `choice`, `multi`, `scale`,
  `number`, `date`, `matrix` and `widget` render. A `choice` or `multi` may take
  its options from a shared menu (`> [!menu|id]`, `menu:id`).
- **Widgets** are fenced `booklet widget` data blocks placed with
  `![[#^id]]`, drawn by the `svg-regions`, `grid-select` and `card-board`
  engines.
- **Queries** (`booklet query`) show what the reader kept in another activity
  or question of the same module.
- **Citations** are CommonMark footnotes, drawn as numbered marks with a side
  panel.
- **Records** sit in a `%%`-wrapped section at the end of the file.
- **Interface languages:** English, French, Spanish and Argentine Spanish.
- **The linter** checks v0.3 files by v0.3's rules and agrees with the
  renderer about what is wrong.

## Specified but not drawn

- Mermaid figures: the embed shows as text.
- Math (`$…$`): shown as raw TeX.
- Editing a booklet's design in the browser, and an Obsidian plugin
  (`SPEC.md` section 13).

## Open

- Build or drop each item in "Specified but not drawn".
- The reference renderer is the only implementation, so format changes are
  still possible; a compatibility-breaking change takes a new format version.
- The French, Spanish and Argentine Spanish interface strings added since v0.2
  have not had a native speaker's review.
- Module content and its licences belong to `booklet-registry`; a listing there
  is not an endorsement or a safety review.
