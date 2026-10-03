# STATUS — Booklet

*As of 2026-10-03*

Booklet is public at `github.com/benthepsychologist/booklet` under Apache-2.0,
**project v0.4**: format v0.4 (files say `booklet: 0.4`) and renderer 0.4.1.
This repository holds the format spec (`SPEC.md`), the reference renderer
(`booklet.html`, one static file), the linter (`lint-booklet.py`), the
authoring skill (`SKILL.md`) and two examples. Modules live in their own
repo, `booklet-registry`.

## Current state — v0.4 (2026-10-03)

What changed from v0.3 and from v0.2 is listed at the end of `SPEC.md` (section 14).
v0.4 adds data blocks (`booklet data`: rows a generator wrote, saved back exactly as
found) and query views (`as: table`, `list`, `tiles`, with `group:` and `limit:`) that
draw them, or kept entries. Nothing is computed in the renderer: no filter, no sum, no
join. A file marked `booklet: 0.3` is refused with a message naming the marker; change
it to 0.4 and nothing else needs to change. From v0.2: callout
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
  or question of the same module, or the rows of a data block, as cards, a table
  (sortable on screen, never saved), a list or tiles, optionally grouped and limited.
- **Links between activities** (`[[#Heading]]` and `[label](#slug)`) are drawn as
  links that open the activity, and the page, holding that heading.
- **Citations** are CommonMark footnotes, drawn as numbered marks with a side
  panel.
- **Records** sit in a `%%`-wrapped section at the end of the file.
- **Interface languages:** English, French, Spanish and Argentine Spanish.
- **Four themes the reader picks** (renderer 0.4.1, no format change): Paper, Daylight, Night and Contrast,
  chosen from a menu in the top bar; Auto (the default) follows the device live. The choice is kept in the browser
  only, never in a booklet, and a booklet cannot set a theme yet. Every colour in the renderer's CSS is a token in
  the four tables (`test/themes.test.js` checks the tables match, WCAG contrast, and that no colour literal is left;
  `test/themes-browser.js` checks the switching in Chromium). Diagrams are re-drawn in the active theme; print is
  always light.
- **The page is wide.** The 64-character column is gone: the content area runs to about 76rem, prose (paragraphs,
  lists, callouts, questions, folded reading cards) stays at about 70 characters, and query views, widgets and
  figures use the width. Tiles fill the row, a grouped list lays its groups out as cards side by side when there is
  room, and everything is one column on a phone.
- **Diagrams and math are drawn.** A ```` ```mermaid ```` fence is drawn as SVG
  where `![[#^id]]` embeds it, or in place when it sits in the prose; `$…$` and
  `$$…$$` are typeset as MathML. A diagram that will not parse shows its source
  with a one-line note, and a formula Temml cannot read shows as its TeX. Both
  libraries (mermaid tiny 12.1.0, Temml 0.13.5, MIT, listed in `NOTICE`) are
  stored inside `booklet.html` as inert text and run only when a booklet has a
  diagram or a formula, so a booklet with neither never runs them; the file
  still opens straight off disk and under the hosted site's Content-Security-Policy
  (no `unsafe-eval`, no network). The file is about 3 MB because of them.
  `test/figures.test.js` checks the stored copies and when they wake;
  `test/figures-browser.js` draws real examples in Chromium under that policy.
- **Plain Markdown reads as a booklet.** A file with booklet front matter and no
  activity line is one activity named by its title (`SPEC.md` section 3), with or
  without questions. `<!-- … -->` comments are not drawn but are kept in the saved
  file, and prose tables are styled (scrolling inside their own wrapper).
- **Reading-only activities open folded.** An activity with no question, widget or
  query, and at least two sections on a page, draws each section as a disclosure
  showing its heading and first paragraph, with "Open everything" / "Fold everything",
  an "Opened N of M sections" line, section entries and dots in the pages menu, and
  heading links that open the section they target. The reader's choice is kept per
  booklet in the browser, never in the file. An activity with any question draws as
  before. The registry's `what-is-a-booklet` module now folds.
- **The linter** checks v0.4 files by v0.4's rules and agrees with the
  renderer about what is wrong.

## Specified but not drawn

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
