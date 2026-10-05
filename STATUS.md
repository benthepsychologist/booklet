# STATUS — Booklet

*As of 2026-10-05*

Booklet is public at `github.com/benthepsychologist/booklet` under Apache-2.0,
**project v0.10**: format v0.10 (files say `booklet: "0.10"`, in quotes) and renderer 0.10.1 (v0.10.1 is a wording patch to `SPEC.md` section 9: no file changes).
This repository holds the format spec (`SPEC.md`), the reference renderer
(`booklet.html`, one static file), the linter (`lint-booklet.py`), the
authoring skill (`SKILL.md`) and two examples. Modules live in their own
repo, `booklet-registry`.

## Current state — v0.10 (2026-10-05)

What changed from v0.9, v0.8, v0.7, v0.6, v0.5, v0.4, v0.3 and v0.2 is listed at the end of `SPEC.md` (section 14).
v0.10 does three things and fixes a trap in its own number. The trap: `0.10` is not the number 0.1, so a version is never turned into a number: it is text, compared as two whole numbers (`versionOf`, `versionCmp`), and files write it quoted (`booklet: "0.10"`); the linter warns on the unquoted form, and a design the browser saved under 0.9 opens as it is, is marked 0.10, and is not re-keyed again. **A module carries its notice**: a `> [!notice]` callout (`license`, `copyright`, `source`, `version`) as the first thing inside its fence, with a one-module file's front matter as the fallback; Add a module writes the callout into the booklet, and the page shows it as a quiet "About this module" disclosure (a source is a link only when it starts with `http://` or `https://`). **Data at the end can belong to a module**: `> [!data|module-id]`, looked up fence, then the module's data section, then the shared one; Add a module tags what it brings, an update replaces exactly the module's fence and its data section, and the old guess about which shared blocks were the module's is gone. **A booklet has one name**: its own front matter's `title:`, written from the moment it is started, shown on the home screen, in "Your booklets" and in the download's file name, and renameable in both places. The French and Spanish wording added for these has had no native review.
v0.9 made an id belong to its module. Built: activity, question, widget, menu, block and footnote ids are unique within their module (module ids within the file); the parser, the renderer's memory (answers by module, entries and drafts by the activity's address, `module-id/activity-id`), the widget, figure, menu and footnote lookups and the linter all follow that; a records line's module id says whose the records below it are; a reader's work kept in the browser by renderer 0.8 is re-keyed once, when the booklet is opened; Add a module no longer refuses an id another module uses, and renames a clashing block id or footnote id with the module's id as a prefix so Obsidian and GitHub show what Booklet shows; the linter warns when two modules share a block id or a footnote id. Checks: `test/modulescope.test.js`, `test/modulescope-browser.js`, `test/addmodule.test.js`.
v0.8 makes the spec, the linter and the renderer say the same thing. Built: a reader's own option on `open` choice and multi questions, right-or-wrong marks for `[x]` options, a file's problems shown when it opens (refused, or a notice of what could not be read), a notice on an unknown kind, settings checked against one table (`KIND_SETTINGS`, the same in the renderer, the linter and `SPEC.md` section 4), and a list of small fixes. Cut: YAML in widget blocks, the unused card board engine, `showTags` and the unread widget `"title"`, and values keyed by language. Marked in the spec as not yet done by the reference renderer, and listed in section 13: the manifest, `sync`, `readonly` and `describe` on `svg-regions`, records grouped by module, and module scoping of data blocks. A file marked `booklet: 0.7` is refused, change it to 0.8.
v0.7 gives every query view one row model: five shared **roles** (`label`, `value`, `note`, `badge`, `tone`, each read from the field of that name unless the query names another), new keys `badge:` and `parent:`, `title:` renamed `label:` and `newest:` renamed `limit:`, `fields:` meaning one thing everywhere (the other fields to show), tiles with no value drawn as pills, a one-line `list` row, and one **Sort and filter** control, the same on every view (renderer-only, kept in memory, never in the file). `density` now sizes the views, and a reader's own theme pick replaces a booklet's colours only (its font and density still apply). A file marked `booklet: 0.6` is refused; change it to 0.7, and in a query change `title:` to `label:` and `newest:` to `limit:`.
v0.6 added two chart views to the query block, `as: bars` and `as: line`, drawn as plain SVG in the theme's own colours from a data block's rows or a reader's kept entries (nothing computed; "Show the numbers" offers the same rows as a table); a file marked `booklet: 0.5` is refused, change it to 0.6.
v0.5 added a theme block (a booklet's own look, as strict named values, never CSS), rows
(`> [!row]` cells side by side) and tone names for widget colours; a file marked
`booklet: 0.4` is refused, change it to 0.5.
v0.4 added data blocks (`booklet data`: rows a generator wrote, saved back exactly as
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
  its options from a shared menu (`> [!menu|id]`, `menu:id`). With `open` the
  reader adds options of their own (stored as the words they wrote, offered
  again from earlier kept entries); a `[x]` option is marked right or wrong once
  the reader has answered, with a Check button on a `multi`, and nothing about it
  is stored.
- **Widgets** are fenced `booklet widget` data blocks placed with
  `![[#^id]]`, drawn by the `svg-regions` and `grid-select` engines.
- **Queries** (`booklet query`) show what the reader kept in another activity
  or question of the same module, or the rows of a data block, as cards, a table
  (sortable on screen, never saved), a list, tiles, bars or a line, optionally grouped and limited.
- **Links between activities** (`[[#Heading]]` and `[label](#slug)`) are drawn as
  links that open the activity, and the page, holding that heading.
- **Citations** are CommonMark footnotes, drawn as numbered marks with a side
  panel.
- **Records** sit in a `%%`-wrapped section at the end of the file.
- **Interface languages:** English, French, Spanish and Argentine Spanish.
- **Four themes the reader picks** (renderer 0.4.1, no format change): Paper, Daylight, Night and Contrast,
  chosen from a menu in the top bar; Auto (the default) follows the device live. The choice is kept in the browser
  only, never in a booklet. A booklet may ask for a look of its own (a `booklet theme` block, renderer 0.5.0): Auto then means the booklet's look, any explicit pick wins, and the look applies only while that booklet is open. Every colour in the renderer's CSS is a token in
  the four tables (`test/themes.test.js` checks the tables match, WCAG contrast, and that no colour literal is left;
  `test/themes-browser.js` checks the switching in Chromium). Diagrams are re-drawn in the active theme; print is
  always light.
- **Theme block, rows, tone names** (format 0.5, renderer 0.5.0). The theme block is validated key by key and
  applied as computed `#rrggbb` tokens (no text of it ever reaches a style); a colour pair under 4.5 to 1 is dropped
  for the base theme's own, and the linter warns which. Rows are a CSS grid of cells (one column under about 45rem).
  Widget colours are tone names drawn in the theme's tone tokens. Checks: `test/theme-block.test.js`,
  `test/theme-block-browser.js`.
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
- **Charts** (format 0.6, renderer 0.6.0). `as: bars` is one list row per data row (label, a decorative bar from zero, the value at its end), `as: line` an SVG redrawn to its container's width with one line per field (distinct colour, dash and marker), gaps for non-numbers, thinned x labels and a legend. Checks: `test/charts.test.js`, `test/charts-browser.js`.
- **Row roles and the sort-and-filter control** (format 0.7, renderer 0.7.0). One resolver (`rolesOf`) decides which field plays each role, once per query, and every view receives resolved roles and never reads the raw query. One pipeline (`viewNodes`) owns the default view, the empty text, `limit`, filter, sort and grouping; the control (`viewControls`) is drawn once above a query's rows when there are 9 or more, and its state lives in a module-level map that is cleared when another booklet opens. `list` draws one line per row; A list whose rows carry `parent` is drawn nested with native `details`/`summary` (`nestRows` builds the tree in one pass; every row starts closed; what the reader opens is kept in the query's view state beside the sort and filter, never saved; a filter keeps matches with their ancestors and opens them while it is on). A page whose name is its own first heading is no longer named twice, and grouped-list cards are at most two across. The "Show the numbers" table under a chart is no longer sortable on its own, so that sorting it cannot redraw the chart. Interface strings for the control are written in all four languages and have not yet had a person's review (see the `localize` skill).
- **The spec, the linter and the renderer agree** (format 0.8, renderer 0.8.0). The settings table is one constant, `KIND_SETTINGS`, in the renderer, the linter and `SPEC.md`, pinned together by `test/guard.test.js`. A problem a file's reading finds carries a severity: the ones `SPEC.md` section 12 says a reader refuses (a module opened and not closed, closed and not opened or overlapping, an id used twice, a reference across a module boundary) stop the file opening and show their messages in the load dialog; every other one is counted in a notice at the top of the booklet's first screen, with the list in a disclosure, dismissible for the session. A reader's own options (`open`) and `[x]` marks are drawn by `drawChoice`; a `multi`'s Check marks live only in the page, never in the file. The per-value language machinery (`pickLoc`, `locBag` and the rest) is gone: a file has one language and its values are plain strings. A widget's `copy` saved in the browser by an earlier version is read as written, so a booklet saved under 0.7 shows no widget words until its file is loaded again.
- **An id belongs to its module** (format 0.9, renderer 0.9.0). The parser keeps its claims per module (one table for module ids, one for the data section), reads a records line's module id to know whose the record blocks are, and gives each activity an address, `module-id/activity-id` (`scopeOfAddr`, `addrOf`, `shortId`; just the id for an activity outside every fence). The address is the key of `STATE.entries`, `DRAFTS.custom`, the screen on show, `go`, `activityOf`, `holderOf`, the page position, the reading-mode state, the per-view state and a query's `from`. Once-answered questions are kept in one map by scope, `STATE.answers[scope][questionId]`, where scope is a module's id or `""` for the activities outside every fence (`answersIn`, `peekAnswers`). A widget block carries its module (`widget.module`), a figure is kept under `module-id/figure-id` (`figureFor`), a menu is found in its own module and then the data section, a footnote registry falls back to the data section's (the linter warns when one footnote id is defined twice in a module). **Work kept in the browser by renderer 0.8** is re-keyed once when a saved booklet is opened (`rekeyFromV08`, called by `loadLocal`): the saved design says which module each activity and question is in; nothing is dropped. Add a module no longer refuses an id another module uses; it refuses only a block the module brings into the data section under an id that section already has. **Rename on a clash** (`renameClashingIds`, one block in the Add a module part of the main script, and one call in `addModuleText`): a block id or footnote id the incoming module shares with another module or the data section is written into its text as `<module-id>-<id>` (`-2`, `-3` if taken), with its `^id` line, embeds and links, a query's `from:` and a footnote's marks and definition following; code fences and inline code are left alone; question, activity, widget-line and menu ids are never renamed; an update renames the same way. The linter warns when two modules share a block id or a footnote id (Obsidian and GitHub read those across the file). **Add a module** adds every module a file holds (each one's lines, in file order, through the same check and rename), puts the blocks outside every fence into the data section once, replaces a module already there where it sits (the order never changes), writes a `title` when it starts a booklet's front matter, and reads the design back from the file it wrote, so the screen shows what the file holds. A heading link (`[[#Heading]]`, `](#slug)`) is looked for in its own module only (`linkHooks`); the linter warns for one whose heading only another module has. A message shown to a reader has its backticks turned into quotation marks (`humanMsg`). Checks: `test/modulescope.test.js`, `test/modulescope-browser.js`, `test/addmodule.test.js`.
- **A module's notice, its own data section, and a booklet's name** (format 0.10, renderer 0.10.0). The parser reads a `notice` callout into the module (`notice` is a kind in `KIND_SETTINGS`, with no settings) and a data line's module id into a scope the lookups already knew (`scopeMod` in `readBlocks`); `addModuleText` sorts what a file holds outside its fences by module, writes a notice only found in front matter as a callout, and replaces a module's fence and its `> [!data|module-id]` section together; `setTitleIn`, `nameBooklet`, `renameBooklet` and `renameStored` rewrite the one `title:` line, and a booklet started in the browser gets its front matter from `blankBook`. `test/version.test.js`, `test/notice.test.js`, `test/datasection.test.js` and `test/bookletname.test.js`, and `test/notice-browser.js`, pin them.
- **The linter** checks v0.10 files by v0.10's rules and agrees with the
  renderer about what is wrong.

## Specified but not drawn

- Editing a booklet's design in the browser, and an Obsidian plugin
  (`SPEC.md` section 13).
- The manifest and parts in other files, `sync`, and `readonly` and `describe`
  on an `svg-regions` widget (each marked in `SPEC.md` and listed in its section 13).

## Open

- Build or drop each item in "Specified but not drawn".
- The reference renderer is the only implementation, so format changes are
  still possible; a compatibility-breaking change takes a new format version.
- The French, Spanish and Argentine Spanish interface strings added since v0.2
  have not had a native speaker's review.
- Module content and its licences belong to `booklet-registry`; a listing there
  is not an endorsement or a safety review.
