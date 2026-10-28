# The booklet format, v0.15.0

**A booklet is one Markdown file that a person can read and edit in any text editor, that Obsidian shows as a normal note, and that the Booklet renderer, or a Booklet plugin inside Obsidian, turns into activities with questions, widgets and reading.** The prose is the document. Booklet's own elements are single callout lines. Data, and anything a reader answers, lives in fenced blocks. Before anyone has answered, the only JSON in a booklet is the data of its widgets and data blocks.

> **Status: v0.15, draft.** This format is young and will change. Nothing before v1.0 is stable, and
> nobody keeps older files working. This spec, the renderer, the skill, the tests and the file marker
> are all v0.15. Section 2 says how the marker works.
>
> **This document may describe things the reference renderer does not do yet.** Each one is marked where
> it is described, in the words "The reference renderer does not do this yet", and all of them are
> listed in section 13.

**Why it looks like this, in short.** A booklet's design is Markdown, so a person can edit it by hand. It uses constructs that already exist and already render somewhere real: GitHub's task lists and callouts, Obsidian's callouts and block embeds, CommonMark's footnotes. What Booklet needs and no existing convention supplies (a question's kind, a module's boundary) is one small vocabulary of callout lines, `> [!kind|id] Title`. There is one new grammar to learn. [`docs/why-markdown.md`](docs/why-markdown.md) says what was surveyed and why each choice was made.

---

**Contents**
1. [What a booklet is made of](#1-what-a-booklet-is-made-of)
2. [The file: name and front matter](#2-the-file-name-and-front-matter)
3. [Structure: activities and pages, with every heading left free](#3-structure-activities-and-pages-with-every-heading-left-free)
4. [Booklet lines: one grammar for everything](#4-booklet-lines-one-grammar-for-everything)
5. [Questions](#5-questions)
6. [Reading: callouts, hints, citations, images and figures](#6-reading-callouts-hints-citations-images-and-figures)
7. [Widgets and other data](#7-widgets-and-other-data)
8. [Records: what a reader answered](#8-records-what-a-reader-answered)
9. [Languages](#9-languages)
10. [Obsidian and GitHub: what to expect](#10-obsidian-and-github-what-to-expect)
11. [A complete booklet](#11-a-complete-booklet)
12. [Conformance](#12-conformance)
13. [What's not built yet](#13-whats-not-built-yet)

---

## 1. What a booklet is made of

Four things, and nothing else:

- **Front matter**: a few flat keys at the top, the way Obsidian, Hugo and Jekyll write them.
- **Prose**: ordinary Markdown. Headings at every level, paragraphs, lists, emphasis, links, tables, footnotes, `$math$`, and fenced code, all free for writing.
- **Booklet lines**: a callout line, `> [!kind|id] Title`, marks anything Booklet needs to know about: an activity, a question, a widget, a menu.
- **Fences**: data and records in fenced code blocks, by convention at the end of the file. No code in the prose; data below, referenced from above.

The rule that decides every detail below: **a booklet is answerable only in Booklet's renderer or a Booklet plugin, so everywhere else it only has to read well.** Simple and clean to write; breaks nothing in Obsidian; breaks nothing too badly on GitHub.

---

## 2. The file: name and front matter

**Name.** `<slug>.booklet.md`, and for a translation `<slug>.<lang>.booklet.md`, for example `tides.booklet.md` and `tides.es.booklet.md`. Obsidian shows the note as `tides.booklet`, which is fine. A reader decides what a file is from its contents, never its name.

**Front matter.** Flat keys only, because Obsidian's Properties editor treats nested values as second-class and may rewrite the block when a property is edited. A renderer must accept any key order and any quoting.

```yaml
---
booklet: "0.15"
id: example/tides
title: How tides work
lang: en
version: "0.1"
copyright: Example Press, 2026
license: CC-BY-4.0
---
```

- `booklet` is the format version the file uses: `0.15` for this document. The marker rule is below.
- `id` names this booklet across its translations and versions.
- `lang` is the language of the page around the content: the renderer's own words and defaults. In a module's own file it is also the language the module is written in (section 9).
- **The front matter's `id` is the booklet's own name, not an id in the sense of section 4.** It may hold slashes (`example/tides`), and it is not one of the ids a question, an activity or a module carries, so the rule for those (letters, digits and dashes, unique in the file) does not apply to it.
- `title` is the booklet's own name: the one name its home screen, its row in a list of booklets and the name of the file a renderer saves all show. A module file's own `title` names the module and never the booklet, so adding a module leaves the booklet's name alone. A renderer may let a reader rename the booklet, which rewrites this one line, with the new name as a quoted string.
- **The marker is written in quotes: `booklet: "0.15"`.** Unquoted, a YAML reader (Obsidian's properties panel, GitHub) takes `0.10` for the number 0.1 and may write it back that way, so the linter warns on any unquoted marker whose minor ends in 0.
  - A reader reads the marker as text and compares versions as two whole numbers, major and minor, so 0.10 is later than 0.9. `booklet: 0.15`, `"0.15"` and `'0.15'` are all this format. `booklet: 0.1` is the earlier version 0.1, not 0.10.
  - A tool that writes booklets writes the current marker. `lint-booklet.py --marker` prints the line.
  - A reader never changes a file's marker. It saves a file back with the marker the file came with, and a booklet it makes itself says `"0.15"`.
- **Another marker.** A file with no marker, or one that is not a `0.x` version (`1.0`, `2`, words), is not a booklet for this version. A file marked with another `0.x` version, earlier or later, is opened by this version's rules.
  - A reader says so first among the file's problems: "This file says booklet: 0.9. This page reads format 0.15 and has opened it as it is; some of it may not draw."
  - It makes no promise about what such a file draws. What its rules do not understand is reported like any other problem.
  - A rule that refuses a file (a module opened and not closed, an id used twice in a module) refuses it whatever the marker.
  - A module file with another `0.x` marker may be added to a booklet, with the same notice.
  - A third number (v0.15.1) is a patch to this wording or to the renderer. It changes no file, and files go on saying `"0.15"`.
- `start` is optional and has one value, `start: home`. Any other value is an error in the linter, and a renderer reports it and ignores it.
  - Without `start`, a booklet that holds exactly one activity opens straight into that activity. A booklet that holds exactly one module, with several activities, opens on that module's own screen. Any other booklet opens on its home screen.
  - `start: home` keeps the home screen. Use it for a booklet still being built, or one whose home screen says something a reader should see first.
  - The back control from the activity or module leads to the home screen either way.
- `copyright`, `license` and `source` live in front matter — the file is the unit that travels (section 3), so the front matter travels with it. In a file that holds one module and no notice callout, they are that module's notice (section 3). `version` is the file's own and is never a module's notice.
- Reserved by Obsidian and therefore never used for anything else: `tags`, `aliases`, `cssclasses`.
- **Any other key is kept as written and ignored.** A reader that does not know a key neither reports it nor drops it: it is still there when the file is saved.

---

## 3. Structure: activities and pages, with every heading left free

**Headings never decide modules, activities, tabs, pages or answers.** Every heading level is free for prose. Structure comes from lines Booklet adds, never from heading depth. A reader does read a heading in two ways: it starts a cell in a row, and a heading link can open it.

**A booklet is a collection of modules, and it is natively one file.** A module is the unit that travels whole, and the unit inside which activities may refer to each other: a weekly report that reads the week's entries, or a dashboard that draws itself, only works if the activities it reads are guaranteed to arrive together, and the module is that guarantee. A renderer handed a folder assembles one file from it (below).

**A module is fenced: an opening line and a closing line, both required.**

```markdown
> [!module|week-1] Week 1

> [!activity|w1-words] Words

…

> [!module|week-1 end] End of Week 1
```

- A linter and a renderer refuse a file whose module is opened and not closed, closed and not opened, or whose fences overlap. Modules bleeding into each other is the failure this rule prevents.
- Within a module, an activity may read another's answers and entries by id. Across modules it may not: the linter reports a reference that crosses a module boundary (a query's `from:`, a `menu:`, an embed) as an error, and a renderer draws nothing for it and lists it with the file's other problems. The file still opens.
- **Bare activities and modules may share a file.** A bare activity sits outside any module fence, by convention before the first one. Bare activities together are one module with no name (section 4): they may read one another's answers and entries, `parent:` places them as it does inside a module, and their records sit under the plain `> [!records]` line. A bare activity may have the id of a module. A file with no module fence is bare activities only: a worksheet needs no more.
- A module id is used once in a file, and stays unique across a person's collection; adding a module whose id is already present replaces it. Any other id a module uses is its own (section 4).
- **A module's opening.** Prose inside a module's fence before its first activity, other than its notice and its tab lines (below), is the module's opening: a renderer shows it on the module's own screen, above the module's activities, and nowhere else. A module with none opens on its title and its activities.
- **The booklet's opening.** Prose, and reading callouts, before the file's first module or activity line are the booklet's opening: a renderer shows them on the booklet's own home screen, under its title, the way a module's opening is shown on the module's screen (the first paragraph larger, the rest under it), and nowhere else. A booklet with none opens on its title and its cards. A leading heading that repeats the title above it (a `# Title` line, compared by its words without their marks) is drawn once, as the title. A file with no module and no activity line is one activity, and its prose is that activity's, so it has no opening. The same holds for a module: its opening does not repeat the module's title. Notes for whoever edits the file go in an HTML comment (`<!-- … -->`), which is never drawn. A question line before the file's first module or activity line belongs to no activity: a renderer reports it and draws it nowhere, and the linter reports an error. **The reference renderer does not do this yet:** a footnote mark (`[^id]`) in the booklet's opening has no sources to number it, so it is left out.

**Where data goes.** The blocks a module's activities refer to (widgets, figures, menus, image definitions, data blocks) sit in one of three places:

- **Inside the module's fence.** The block is that module's, and no other module can use it.
- **Under a `> [!data|week-1] Data for Week 1` line**, in a data section at the end of the file. The line belongs to the module whose id it carries, the way a records line does. A block under it is that module's too, as if it sat inside the fence, until the next `data`, `module` or `activity` line.
- **Under a plain `> [!data] Data` line**, at the end of the file. The block is shared: any module can use it.

A reference is looked up in the module's own fence, then the module's own data section, then the shared data section. It is never looked up in another module's fence or data section (section 4).

- A file may have several data sections. A data line takes an optional module id and no settings.
- A file that holds one module may keep all its data under a plain `> [!data]` line. Those blocks are that module's when the module is added to a booklet, and inside the file they are found either way.
- A tool that adds a module to a booklet puts the data it brings under the module's own `> [!data|module-id]` line. An update of the module replaces exactly its fence and that section.

### A module's notice

A module may state its terms where they travel with it, in a `notice` callout inside its fence:

```markdown
> [!module|check-in] A daily check-in

> [!notice]
> license: Free to copy and share, unmodified and with this notice intact.
> copyright: Example Press, 2026
> source: https://example.org/check-in
> version: 1.2

> [!activity|check-in-log repeat] Check in
```

- Each line is `key: value`, and the keys are `license`, `copyright`, `source` and `version`; any may be left out, and anything else in it is a linter error. A notice takes no id and no settings. A module has at most one, and it sits inside the module's fence before the module's first activity. A notice outside a module's fence, or after its first activity, is an error in the linter. A renderer ignores it and reports it. A notice's `version` is the module's, and need not look like the booklet's.
- **A file that holds one module and no notice callout is covered:** its front matter's `license`, `copyright` and `source` are that module's notice, so nobody has to rewrite a module file; either form may be used, and when both are present the callout wins. The front matter's `version` is the file's own and is never a module's notice: a module's own version is written in its notice callout.
- A tool that adds a module whose notice is only in its file's front matter writes it into the module's fence as a `> [!notice]` callout, so the notice is in the booklet's own file, and an update replaces it with the module's. A renderer keeps the callout exactly as written.
- A renderer shows a module's notice as a quiet disclosure, closed until opened, headed "About this module": the licence, the copyright, the source (a link only when it is an `http://` or `https://` address, otherwise plain text) and the version, on the module's own page and at the foot of a module that is one activity. A module with no notice shows nothing. Every value is text.

**Answers never travel inside a module.** A module used for months would drag hundreds of lines of JSON with it. Records sit in the records section at the end, opened by `> [!records] App record`, and grouped by module under `> [!records|week-1] Week 1`, so the right JSON is one search away. **The module id on a records line is what ties the record blocks under it to that module**, until the next records line: its `answers` are that module's, and the activity named on an `entries` or `draft` block is that module's activity. Record blocks under a plain `> [!records]` line, up to the next records line, belong to the bare activities, which are one module with no name, wherever that line stands, after a module's records line too; a records line that names a bare activity (`> [!records|inbox]`) is read the same when no module has that id. To take a module and its answers somewhere else, copy two sections.

**A booklet's parts in other files, and a manifest that lists them, are a draft** (section 13, "Drafts"). Nothing in this document depends on them: a booklet is one file.

**A link to a whole module.** `[[week-2.booklet]]` or `[Week 2](week-2.booklet.md)` in prose names the module `week-2`: the file's name before `.booklet`, which is the module's id. Such a link is for a module that may not be in this booklet, one in a registry or one the reader has not been given yet: a renderer opens the module if the booklet holds it, and otherwise shows the link as a module that is not here, asking the network for nothing until the reader acts. To move within a file, link to a heading (below).

**Navigating the file in an editor.** Every part opens with a line of one shape, so searching for `[!module|`, `[!activity|`, `[!data` or `[!records` walks the file.

**An activity starts at an activity line and runs to the next one.** A file with no activity line is one activity, named by the front matter title. So a one-page worksheet needs no structure at all.

```markdown
> [!activity|rd-tides] Why the sea rises twice a day

Prose, headings, questions…

> [!activity|rd-check repeat] Check yourself

…
```

The words after the id are the activity's **settings**:

| setting | what it means |
| --- | --- |
| *(none)* | answered once, edited in place |
| `repeat` | each completion is kept as a dated entry, with a history |
| `repeat daily` | one kept entry per day (a day: section 8); completing again replaces today's |

`hidden` may follow either (kept in the file, not offered). `daily` needs `repeat`.

**An activity may sit under another.** `parent:<id>` names the activity it belongs under, in the same module:

```markdown
> [!activity|booklet-dev] Booklet (dev)

> [!activity|v1-0-release parent:booklet-dev] Booklet v1.0: the stable format
```

It means what `parent` means on a list row (section 6): an activity whose parent is not in its module (or, for a bare activity, not among the bare activities) sits at the top, and the linter warns; one that is its own ancestor is drawn once, at the top; when two activities share an id, the first is used. Activities under the same parent keep the file's order, and moving on from an activity goes to its first child, then its next sibling, then back up: the order of a file written parent first. A module whose activities carry no `parent` is a flat list. `parent` places an activity; it does not let one read another's answers.

**A card's parts.** A renderer that draws modules, activities and folded callouts as cards gives each up to four parts: a title, a picture, a blurb and a status line. Each part comes from the file, and one the file leaves out gets a default, the same everywhere. A renderer lays a list of cards out as it likes (the reference renderer draws it as a contents list, one row to a card); the parts are the file's, the layout is its look.

| part | where it comes from | default |
| --- | --- | --- |
| title | the words of its line. A leading emoji is taken out of the title and becomes the picture | the id |
| picture | the line's `icon:`, else a leading emoji in its title, else its number in its list (below) | its number |
| blurb | its first paragraph: an activity's is the first paragraph under its line, a module's the first paragraph before its first activity | none |
| status line | an activity's: the `>` lines directly under its activity line, joined into one line and read as inline Markdown. `status:off` on the line hides the status line, whatever is under it | a line the renderer works out from what the activity holds and how far the reader has got ("2 questions · Not started") |

```markdown
> [!activity|tides icon:waves] Tides
> Half an hour a day, for a week

The sea rises and falls twice a day. This paragraph is the blurb.

> [!activity|quiet status:off] A page with no status line
```

- **The blurb is always the first paragraph.** Lines directly under an activity line that start with `>` are not the blurb and not its prose: they are its status line, and are not drawn anywhere else. A paragraph after the line, with a blank line first, is the activity's own prose, and its first paragraph is the blurb. Leave that blank line: a line with no `>` straight under the `>` lines is, to Markdown and Obsidian, part of the callout (a lazy continuation, above), though a renderer takes it as the paragraph, so the linter warns. The status text is one line of inline Markdown: block syntax in it (a nested callout, a heading, a list item, a code fence) would show as written, and the linter warns. The reference renderer shows at most two lines of it.
- **A module's card** takes its title, blurb and picture from the module's own line, in the same way. A module of one activity is drawn as one card: the module's title (a module line with no title takes the booklet's title, else its id), and the module's blurb and `icon:` first, else the activity's; its status line is the activity's, which `status:off` and the lines under the activity line set. A module of several activities has a status line of its own, which the file does not set: "Not started", or "N of M started" counting the activities that hold a question or keep entries (none when none does). Callouts take no settings: a folded callout's card takes its title and picture from its title line.
- **The picture.** The line's `icon:` if it has one. Otherwise an emoji at the start of the title, which is then not repeated in the title. Otherwise the card's number in its list. `icon:` takes a name from Booklet's icon set, the Lucide 1.48 icons listed in the booklet repository's `art/icons/` (lucide.dev): `icon:compass`, `icon:notebook-pen`. The set may grow in a later version. A name outside it is reported and ignored, like a mistyped setting. Callouts take no settings, so a leading emoji is how a callout chooses a picture. A renderer may draw the picture as that icon or as an illustration of the same name; that is its look, not the file's. (The reference renderer's contents list writes a row's number before its title in every row, and keeps the small picture for an icon or an emoji, empty when a row has neither, so that every title starts at one left edge.)
- **`status:` takes one value, `off`.** Any other value is reported and ignored, as a number setting's wrong value is. `status:off` with status text under the line hides the status line, and the linter warns that the text is not drawn.
- **A tool that writes a booklet back keeps both**, the `status:off` on the activity line and the `>` lines under it, exactly as written, like every other word of the line.

**Tabs: areas of an activity meant to be very different.** A tab line, `> [!tab] Name` or `> [!tab|id] Name`, inside an activity starts a tab that runs to the next tab line or to the end of the activity: a dashboard, a form and a reading can be three tabs of one activity. What comes before the first tab line is the activity's opening, which a renderer shows above the tabs, on every tab. An activity with no tab line has no tabs.

````markdown
> [!activity|budget] This month's budget

What this is for, shown on every tab.

> [!tab] Spending

```booklet query
from: spent
```

> [!tab|plan] What to change

> [!text|change long] One thing to change next month
````

- **A tab's id** is the one written after the bar, else its name as an id: accents dropped, lowercase, each run of characters other than the letters a to z and the digits written as one dash, with no dash at either end, and at most 60 characters (`What to change` is `what-to-change`, `Écrire ça` is `ecrire-ca`). So a letter outside a to z that is not an accented one (Greek, Cyrillic, Chinese) goes as punctuation does: `Ωmega` is `mega`. A name that leaves nothing (`日本語`, an emoji) gives `tab-` and the tab's place among the activity's (or the module's) tabs: `tab-2` for the second. To keep such a name, write the id: `> [!tab|nihongo] 日本語`. Tab ids are unique among one activity's tabs. Two tabs with one id, written or made from their names, are an error in the linter; a renderer keeps both, gives the second a number (`plan-2`) and reports it. A tab's id is its own: it is not among the module's ids (section 4).
- Lines under the tab line (`> ` lines, as under any booklet line) are the tab's first prose.
- **A tab is presentation.** The activity keeps one id, one set of answers and one set of kept entries whichever tab a question is on, and which tab is showing is never stored. A renderer shows a tab bar for an activity of two or more tabs, opening on the first; one that has no tab bar shows the tabs one after another, each under its name.
- A tab line outside every activity and every module's opening (before the file's first module or activity line, say) is not read: the linter reports an error, and a renderer ignores it and reports it. A tab line in a data section ("Where data goes", above) is not read either, and the linter warns. A file with no activity line is one activity, and its tab lines are that activity's.

**A module's tabs.** Tab lines in a module's opening (inside its fence, before its first activity) declare the module's tabs, in order, and their ids follow the rule above. An activity joins one with `tab:<id>` on its line; an activity with no `tab:` is in the first tab. A `tab:` that names no tab of its module is an error in the linter, and a renderer puts the activity in the first tab and reports it. A renderer lists the module's activities tab by tab on the module's screen, with what follows a tab line in the opening (its prose and reading callouts, up to the next tab line) above that tab's activities; the module's opening is what comes before its first tab line. In a module whose activities sit under one another (`parent:`), a tab lists the activities at the top that are in it; the ones under them stay under them. A module of one activity has no screen of its own (its activity's screen is its screen), so tab lines in its opening have nothing to show on: a renderer draws neither them nor the prose after them, and the linter warns.

```markdown
> [!module|money] Money

> [!tab] This month

> [!tab|learn] Learn

> [!activity|spending tab:this-month] Spending

…

> [!activity|why-budget tab:learn] Why a budget helps

…

> [!module|money end] End of Money
```

**Pages are pagination.** Any thematic break inside an activity or a tab (`---`, `***`, `___`), but not inside a group (section 6), is a page break, for a long form or a long reading. A page has no name, no id and no menu: a renderer moves through the pages of an activity, or of a tab, with Back, "Page 2 of 3" and Next at the foot of the screen, and Next on the last page goes on to the next activity. An activity or a tab with no rule is one page. Like a tab, a page is presentation, and which page is showing is never stored.

⚠️ `---` needs a blank line above it, or Markdown turns the line before it into a heading and the page break vanishes. `***` has no such trap. Both are accepted.

**Links between activities** are ordinary heading links, which Obsidian resolves natively: `[[#Check yourself]]` or `[Check yourself](#check-yourself)`. A link opens the first place in the link's own module whose heading or title reads those words: a heading, an activity's title, a tab's name, a question's prompt or a callout's title. A link to a tab's name opens that tab, and one to a module's tab (section 3, a module's tabs) opens the module's screen on that tab; a link to a heading in the opening of an activity with tabs, which is drawn above every tab, leaves the tab on show as it is. It is **looked for in the link's own module** (the bare activities together are one module), never in another module's fence; a link whose words only another module has is shown as plain text, like a link to words that are nowhere, and the linter warns. Reading another activity's *answers* is a module matter, above.

### Rows: things side by side

A row asks for what is inside it to be laid side by side when there is room.

```markdown
> [!row]

### Overdue

```booklet query
from: overdue
```

### Due soon

```booklet query
from: due-soon
```

> [!row|end]
```

- A row opens with `> [!row]` and closes with `> [!row|end]`: the word after the bar is a setting, as `end` is on a module's closing line.
- **Each heading at the shallowest level inside the row starts a cell.** Anything before the first heading is a cell of its own. With no headings at all, each block is a cell.
- A renderer decides how many cells fit across, and puts them one under another, in file order, on a narrow screen. A file never states widths, columns or breakpoints.
- Anything may go in a cell: prose, questions, widgets, queries, figures.
- Rows do not nest, and a row does not cross a page break, a tab line, an activity line or a module fence.
- In an editor, on GitHub and in Obsidian a row reads top to bottom, with its two marker lines showing as small callouts.

---

## 4. Booklet lines: one grammar for everything

```markdown
> [!kind|id setting:value flag] Title
```

- **`kind`** says what the line is: an activity, a question kind, a widget, a menu, a row, or a reading callout. Kinds are Booklet's own vocabulary, and the set is meant to grow (section 5). A kind is written with the same characters as an id (letters, digits and dashes), so `> [!2col]` is a callout; a `> [!` line whose kind has any other character, such as `> [!my_kind]` or `> [!café]`, is not a Booklet line, and a renderer reports it and leaves it as text.
- **A module's end line repeats its module's id** (`> [!module|week-1 end]`): the id is the first word, as on any line, and `end` is a setting. `> [!module|end]` opens a module whose id is `end`.
- **`id`** is required for anything that stores an answer or is referenced (activities, questions, widgets, menus). Letters, digits and dashes only, so every id is also valid wherever Obsidian wants one. Unique within its module (below). Reading callouts need none, and neither does a row (`> [!row]` … `> [!row|end]`, section 3), which is structure like a page break. An activity or module line with none is an error in the linter, and a renderer reports it and names the activity from its title (a module by its place in the file), which a later rename of the title would change.
- **The first word after the bar is the id, for every kind that takes one, and every later word is a setting.** No id is reserved: an activity may be called `repeat`, `long`, `end` or `home`. **Kinds that take no id** are `row`, `notice`, `manifest`, `hint`, `solution` and Booklet's own reading kinds `group`, `diff`, `law` and `opinion`; all their words are settings, so `> [!row|end]` closes a row, and a word after the bar on a `hint` is a setting it does not take.
- **Settings** follow the id, separated by spaces: `menu:places`, `min:0`, `open`, `repeat`. A setting written before the id is read as the id, and the id after it is reported as a setting the kind does not take.
- **The title** is the words a reader sees: the question, the activity name, the caption. **Every word on or under a booklet line that a reader sees is inline Markdown**, as the prose around it is: a title, a question's help text, an option, an option's reply, a scale's anchor, a matrix's item, a menu's entry. Emphasis, code, links and `$math$` are drawn wherever those words appear (the question, a card, a breadcrumb, a page's head, a tab, a menu, the stepper, a kept entry), so `> [!choice|bigger] Which is bigger, $\frac{2}{3}$ or $\frac{3}{5}$?` draws its formulas. A button, or a card that opens something, holds no link: there a link is drawn as its words. Elsewhere a heading link (`[[#Heading]]`, `[t](#heading)`) works as it does in prose, and is never drawn with its `#`. A display formula (`$$…$$`) in a title is drawn inline, and a footnote mark in one is left out. Where bare words are needed, the words are used without their marks: a label a screen reader speaks, the document's title, and the check that a reader's own option equals a listed one (section 5). Data values (section 7) are plain text, never read this way. A dollar sign written for a price is written `\$5` (section 10), in a title as in prose.
- **A fold marker** may follow the bracket, as in Obsidian: `> [!hint]- Hint` starts folded.

**An id belongs to its module.**

- An id is unique within its module: activity ids, question ids, widget-line ids, menu ids, block ids (`^id`) and footnote ids. Two modules in one file may use the same id for different things, and neither can see the other's. Module ids are unique within the file.
- Activities outside any module fence (bare activities) together count as one module with no name. Their ids are in one scope, the scope of a plain `> [!records]` line. That scope is not a module's, so a bare activity and a module may have the same id.
- A module's scope is its fence and its data section (`> [!data|module-id]`, section 3). The plain data section at the end of the file (`> [!data] Data`) is shared: a block there (a widget, a figure, a data block, a menu) may be used by any module, and its ids are unique among the blocks in that section.
- **A reference is looked up in its own module first (its fence, then its data section), then in the shared data section, and never in another module's fence or data section.** That holds for an embed `![[#^id]]`, a `menu:id`, a query's `from:` and a footnote mark `[^id]`.
- What a reader answered is tied to its module by the module id on a records line (section 8), so the same question id in two modules holds two answers.

**What comes after the line.**
- A **list** belongs to the line (a question's options, a menu's entries). It may follow directly or after one blank line; two blank lines end the question. **One exception, from Markdown itself:** only a numbered list that starts at `1.` may interrupt a paragraph, so a list starting at `0.` (or any other number) directly under the line is swallowed into the title. Put the blank line in; the reference linter requires it there and allows it everywhere else.
- **Lines starting with `>`** directly under a booklet line belong to it. Under a reading callout they are its prose. Under a **question** line they are its **help text**: a renderer shows them under the prompt. Under an **activity** line they are the text of its card's status line (section 3, "A card's parts"). A question's prompt is its title. A `> [!hint]-` callout after a question is a different thing: a hint the reader opens (section 6).
- **A paragraph** after the line needs a blank line first, like any paragraph. Without one, Markdown folds it into the callout (a "lazy continuation").
- A **hint** or **solution** callout right after a question belongs to that question (section 6).

**What each kind takes.** Settings are the flags and the `key:value` words after the id. Each kind takes only the settings in this table, because a mistyped setting (`mx:5` for `max:5`) would otherwise vanish without a word. A setting a kind does not take is an error in the linter, and a renderer ignores it and reports it. `daily` needs `repeat`. The values of `min:`, `max:` and `step:` are numbers.

| kind | settings it takes |
| --- | --- |
| `module` | `end`, `icon:` |
| `activity` | `repeat`, `repeat daily`, `hidden`, `icon:`, `parent:`, `status:` (only `status:off`), `tab:<id>` |
| `row` | `end` |
| `text` | `long`, `each:<id>` |
| `lines` | `each:<id>`, `earlier:<n>` |
| `scale`, `matrix`, `date` | `each:<id>` |
| `menu`, `hint`, `solution`, `data`, `records`, `manifest`, `notice`, `group`, `diff`, `law`, `opinion`, `tab` | none |
| `choice`, `multi` | `open`, `menu:<id>`, `each:<id>`, `earlier:<n>` |
| `number` | `min:`, `max:`, `step:` (numbers), `each:<id>` |
| `widget` | `readonly`, `describe`, `each:<id>`, `earlier:<n>` |

`icon:` takes an icon name, `parent:` an activity id, `status:` the one value `off`, and `tab:` the id of one of its module's tabs (section 3). None is written on a module's end line.

`each:` names a question or widget in the same activity, whose picks the question is asked for (section 5, "A question asked for each pick"). `earlier:` takes a whole number, written in digits only (`[0-9]+`): how many earlier words a question offers (section 5, "Words the reader wrote before"). Any other value of `earlier:` is ignored and reported, and the question offers its default.

**Unknown kinds.** A line with an id or settings whose kind is not in this table is an **unknown kind**. A renderer draws it as a callout, with a quiet line under its title saying that it does not know the kind, and reports it; the linter warns. A line with no id and no settings is a reading callout of whatever kind its author chose (`note`, `tip`, Booklet's `diff`, and so on, section 6), drawn with no notice. `group`, `diff`, `law` and `opinion`, Booklet's own reading kinds (section 6), are in the table above and take no settings. A line that starts `> [!` but cannot be read as a Booklet line is reported, and is read as text.

**Case.** Kinds, settings, query keys and `as:` are read without regard to case. Ids and values (theme values, tone names, and the words a person wrote) are exactly as written.

In Obsidian, an unknown kind renders as a note-style callout with the title, so every Booklet line is a visible, titled box there. The `|id` part is callout metadata, which Obsidian parses into `data-callout-metadata` for themes to style; it is not documented in Obsidian's own help, but it renders correctly.

---

## 5. Questions

**Principle: declare the kind on the question line; put plain lists under it. Nothing else.**

### Text and lines

```markdown
> [!text|noticed] What surprised you?

> [!text|reflection long] Write freely about the week.

> [!lines|wins] Three things that went well
```

`text` is a text answer; `long` asks for a bigger box. `lines` is repeated one-line entries.

### Choice: pick one, pick any

```markdown
> [!choice|biggest] When do the largest tides come?
- [ ] At the quarter moons
- [x] Near the new and the full moon

> [!multi|outside open] What did you do outside today? Add your own.
- [ ] Walked
- [ ] Gardened
- [ ] Sat in the sun
```

- `choice` takes one answer, `multi` any number. `open` lets the reader add options of their own.
- **The reader's own option.** With `open`, a field and an Add button sit under the options. An option the reader adds is stored in the answer as the words they wrote, a string, in the place a position would be: a `choice` holds the position or the string, a `multi` a list of positions and strings. Text equal to a listed option (ignoring case, and white space at either end) presses that option instead; an own option is never added twice, and nothing is ever written into the file's list of options. The own options the reader added before are offered again (below, "Words the reader wrote before"). A shared menu (`menu:id`) with `open` behaves the same. Words typed in the field and not yet added are added, exactly as Enter or Add would add them, when the field is left and when the page is closed or reloaded; on a `choice` they replace the pick.
- **`[x]` marks a correct option**, for study booklets. A worksheet with no right answer leaves every box `[ ]`. A renderer shows the reader whether they were right once they have answered: for a `choice`, as soon as they pick, the picked option is marked right or not, and the correct one is marked as the answer; for a `multi`, a Check button marks each option picked and right, picked and not right, or right and missed. Nothing is scored and nothing is stored: the answer is recorded as usual and the file never says whether it was right. An own option (`open`) is neither right nor wrong. A `choice` with more than one `[x]` has the first as its answer. **The correct option is visible to anyone who opens the file as text.** In Obsidian's Reading view, a click on a checkbox rewrites `[ ]` to `[x]` in the file — a real behavior, and the accepted trade-off: a booklet's own reader answers it in Booklet, never by clicking a checkbox in an Obsidian note, so the answer key is never at risk from ordinary use.
- **A reply for each option.** A bullet nested under an option is that option's **reply**. It is nested the way Markdown, and so Obsidian, nests it: written at least as far in as the option's own text starts (two spaces under `- [ ]`). A bullet indented less than that, one space for instance, is not a reply; it ends the option list.

  ```markdown
  > [!choice|where] Where are you right now?
  - [ ] Calm
    - That is the settling system at work.
  - [ ] Wound up
    - That is the activating, unpleasant family.
    - It is also useful.
  ```

  Each nested bullet is one line of the reply, so Wound up has a two-line reply here (a bullet nested deeper is one more line). A line that is no bullet, written deeper than the bullet above it, goes on with that line (they join with a space). Any other indented line ends the list. A blank line also ends the option list, between two options as between an option and its reply, and what follows is read as text: the linter warns.

  When the reader picks an option, its reply is shown under the options: for a `choice`, the picked option's; for a `multi`, each picked option's, in the options' order. Pick another and the reply changes; clear the pick and it goes. **A question that marks a correct answer (`[x]`) shows its replies with its marks:** a `choice` as soon as the reader picks, a `multi` once the reader has pressed Check. A reply would otherwise give the answer away. A reply is inline Markdown, like an option. It is **content, not an answer**: it is never stored, never sent, and never counted or shown as an option, so adding replies changes no answer and no position. An option with none shows none. An option's own text is its one line: a reply never joins it. Only the options of a `choice` or `multi` take replies; a nested bullet anywhere else is not a reply (the linter warns), and an option the reader adds with `open`, or one that comes from a shared menu, has none. `[x]` marks and a following `[!solution]-` work as before. In Obsidian and on GitHub a reply is a sub-bullet under its option, which is intended.
- **Options are identified by position, not by id.** The third option is the third option in every language file too, so a whole list carries one id. This is what removes per-item tags. A file that reorders options after people have answered breaks its own answers.

### Scale, number, date

```markdown
> [!scale|clarity] How clear was the reading?

0. Not clear
1. A little clear
2. Fairly clear
3. Clear
4. Very clear

> [!number|sleep min:0 max:24] Hours slept

> [!date|when] When did it happen?
```

A `scale` lists its anchors as a numbered list; **the number is the stored answer**, so a scale that starts at 0 is written from `0.`, with a blank line above it (section 4).

### Matrix: items and anchors

A matrix question is several items answered on one shared scale of anchors. It is written as a bulleted list of items, then a numbered list of anchors. It is deliberately not a table, so one stray space never breaks it:

```markdown
> [!matrix|topics] How sure are you of each topic?

- Spring tides
- Neap tides
- Tidal range

0. Not yet
1. Getting there
2. Sure
```

A blank line may separate the two lists (section 4), and the numbered list needs one above it when it starts at `0.`. The reader chooses one anchor per item. **The answer is stored as a list with one anchor number per item, by position** (`[1, 3]`; `null` for an item not yet answered), under the question's id. Like a `scale`'s, the number is the stored answer, so the anchors' own numbers are what is kept.

**How a question is drawn is the renderer's business, and it follows one rule.** A question's words keep a readable width, and its options sit beside them only when both fit, else under them. Which options may sit beside: those of a `choice`, `multi` or `scale` that are at most four, each at most 24 characters, on a question without `open`; any other list is always drawn under the words. A matrix is the same rule for a whole set of items, and it gets the content column's full width, as a table does: where each item's words, at a readable width (smaller than a single question's, since the anchors are shared), and the row of anchors fit side by side, the matrix is drawn as a grid of rows; where they do not (the column is narrower than the grid needs, as on a phone or in a narrow window), each item is drawn as a single-choice question of its own, with the anchors as its options, and the matrix's own words become the stem above them. This changes the drawing and nothing else. **Drawn as separate questions, the stem stays in view while its items are answered**: it is held at the top of the screen as the items scroll, whatever its length, and goes with the matrix's last item; an item the keyboard moves to is not left under it, its words with its answer, as far as the screen has room, and pressing an answer never moves the screen. A matrix with no words of its own has no stem. On a window too short to give its items room under a held stem (a phone on its side) a renderer may let the stem scroll with its items; the reference renderer does at 360 pixels tall or less. Drawn as a grid it is not held, since its words are above the rows; at the width where the grid becomes separate questions the stem starts to be held, and where they become a grid again it stops. The stored answer is the same list under the same key either way, so a window that is made narrower and wider again loses no answer. A reader who sees the items as separate questions may clear one by pressing its answer again, which stores `null` for that item, as an item not yet answered.

### Shared menus

A list used by several questions is written once, in the module whose questions use it (or in the data section, for every module to use), and named on the question line:

```markdown
> [!menu|places]
- Park
- Garden
- Library

> [!multi|morning menu:places] This morning I went to…

> [!multi|evening menu:places] This evening I went to…
```

### Widgets as questions

A widget the reader operates (the body map, a grid of cells) is a `widget` line whose body embeds the widget's data block (section 7). What the engine records is stored under the widget's id.

### A question asked for each pick

`each:<id>` on a question line names another question or widget in the same activity, its **source**. The question is asked once for each pick in the source's answer, and its answer holds one answer per pick.

```markdown
> [!menu|rooms]
- Kitchen
- Garage
- Garden

> [!multi|tools] Which tools did you use today?
- [ ] Hammer
- [ ] Saw
- [ ] Drill

> [!multi|tool-where each:tools menu:rooms] Where did you use it?
```

With Saw and Drill picked, the reader sees the question once, then its rooms under each tool.

- **A source is a `choice`, a `multi` or a widget.** Their picks are identities that are added and taken away but never edited. The picks: a `choice`'s one answer; each member of a `multi`'s answer, an option's position or the reader's own option; each id in a `grid-select`'s answer, an item id or the reader's own `x|cell|word`; each region an `svg-regions` marked, by its `id`.
- **One level only.** A question with `each:` cannot be a source.
- **What does not hold.** An `each:` that names nothing in its activity, names the question itself, names a question of another kind, or names a question that has `each:` of its own, is an error in the linter, and a renderer ignores the setting and reports it, as for any setting a line cannot take (section 4), and draws the question as its kind.
- **Where it is drawn:** where it is written, one copy per pick, in the order the source's answer holds them (the order they were picked), so a new pick adds a copy at the end and nothing already on screen moves. Nothing is drawn while nothing is picked.
- **The heading.** The question's title, help text, hint and solution once, then each pick as a subheading in its own words: the option's words, the item's or region's label, or the reader's own words (for `x|cell|word`, the word).
- **Everything else the question takes applies to every copy:** its options, its marks (`[x]`), `open`, `menu:`, `min:`, `max:`, `step:`, `earlier:`. The reader's own options added under one pick are offered under every pick, and again in later entries (below).
- **Any question kind or widget can follow.**
- **It should sit after its source,** in the same activity. One placed before its source is drawn the same way, and the linter warns about it. Several questions may follow one source, each drawn where it is written.
- **What is stored: a list of pairs,** `{ "pick": <the pick exactly as the source stores it>, "a": <the answer its kind stores> }`, where any answer is stored (section 8):

  ```json
  "tool-where": [ { "pick": 2, "a": [1, 3] }, { "pick": 3, "a": [2] } ]
  ```

  A pick keeps its type (a position is a number, the reader's own option a string), so a position `3` and an own option `"3"` stay apart, and so do an item id `warm` and an own word `x|soothing|warm`. A pick with no answer has no pair. The order of the pairs means nothing; views use the source's order.
- **A pick taken back.** Nothing is dropped. If the reader unpicks a tool, its pair stays as written and is not drawn; it comes back if the tool is picked again. A kept entry keeps it too. Every view shows and counts only the pairs whose pick the source holds in the same record (section 6), and a draft whose only answers are pairs for picks taken back counts as empty. A pick whose option or item the design has since removed keeps its pair; its copy is headed as the source shows that pick.

**The reference renderer does not do this yet:** it draws a question with `each:` as its title and a line saying it is not yet supported, and keeps its answer as written through opening, saving and Finalize. Its views show the pairs as section 6 says.

### Words the reader wrote before

**Some of a reader's own words come back.** In an activity that keeps entries, a renderer should offer these again, as unpressed buttons:

- **an own option** (`open`), after the question's options, and under every copy of a follow-up (`each:`);
- **a word written for a place in an `svg-regions` widget**, after the widget's words, under every place: a widget's words belong to the whole widget, not to one place;
- **an earlier line of a `lines` question**, under its lines, only when its line sets `earlier:<n>`.

A word written in a `grid-select` cell and a `text` answer are not offered again.

- **What an own word is:** a string in a `choice` or `multi` answer (under `each:`, in a pair's answer); a line of a `lines` answer with something other than white space in it; a string in an `svg-regions` row's `s` that is not a word id in the widget's `senses` and does not start with one of its `senses` group ids followed by a colon. Words are read only from an answer in its kind's shape (section 8). A word holding a comma (possible only by hand) is not offered in a widget, whose field splits words at commas.
- **Where they come from:** the activity's kept entries; and, while an answer is being written, its other places (a body widget's other places, a follow-up's other copies). No other draft. In a `repeat daily` activity, today's kept entry, which the draft will replace, is not a source. Under `each:`, only the pairs whose pick the source holds in the same record give words, as every view reads them; a pair whose pick's option the design has since removed still gives words. A row for a place the widget no longer lists still gives words, since they are the widget's.
- **How many, and in what order:** newest first: the answer being written, then the kept entries by the time in their `ts`; within one answer, in the source's order under `each:`, in the widget's order of places for `svg-regions` (rows for places it no longer lists after the rest), and within one place in the order written. At most 12 at each place, or the number the question's line sets with `earlier:`; `earlier:0` offers none.
- **Each word once:** a word is offered once at each place, and not where it is listed there or already in the answer at that place (that place's row, that copy's answer). Own options and lines are compared as an own option is compared with a listed one (above); a widget's words as section 7 compares them.
- **Taking one:** a tap adds the word as the same words typed and added there would be: to the answer, to that place's row, or as a new line, filling the empty line at the end. It never changes what the reader has typed, and Enter never takes an offered word. Nothing else is stored, and the entries a word came from are not changed.
- **Drawing:** a renderer draws a body widget's and a `lines` question's earlier words as a group of their own, named in the renderer's own words ("Earlier words"). It may draw a long word shortened to two lines, with its full words as the button's accessible name; a tap stores the full words.

**The reference renderer does not do this yet** for a body widget's words or a `lines` question's earlier lines: it offers neither. It offers own options again as this part says, `earlier:` included.

### The kinds, in one table

| kind | answer stored | under the line |
| --- | --- | --- |
| `text` | a string | nothing (`long` for a big box) |
| `lines` | a list of strings | nothing |
| `choice` | the option's position, from 1; with `open`, or the reader's own string | a task list; `[x]` = correct; a nested bullet = that option's reply |
| `multi` | a list of positions, plus the reader's own strings with `open` | a task list; `[x]` = correct; a nested bullet = that option's reply |
| `scale` | the anchor's number | a numbered list |
| `number` | a number | nothing; `min:` `max:` `step:` |
| `date` | `YYYY-MM-DD` | nothing |
| `matrix` | one anchor number per item, by position | a bulleted list, then a numbered list |
| `widget` | whatever its engine records | an embed of the data block |

A question asked for each pick (`each:`, above) stores a list of pairs instead, each pair holding one answer of its kind.

**How the vocabulary grows.** A new question kind is a new kind word, a documented shape for what follows the line, and an engine in the renderer. The grammar never changes. A renderer that meets a kind it doesn't know shows the line as a callout and what follows as lists, and says so, instead of failing (section 4, "Unknown kinds").

---

## 6. Reading: callouts, hints, citations, images and figures

### Callouts

Reading set apart is an Obsidian callout, with `>` on every line of its body. Use Obsidian's built-in kinds where they fit (`note`, `tip`, `example`, `quote`, `question`, `warning`), and Booklet's three for guided reading: `diff` (where this differs from the reader's own guide), `law` (the rule as it stands), `opinion` (an author's view, not to be learned as a rule). Booklet's fourth kind is `group`, a titled container. All four take no id and no settings.

**A group holds blocks.** In an activity (in its text, a tab's or a `***` section's) a group's body is read with one `>` less, as the activity's own text is read: prose, headings, images, tables, callouts, query views, and questions with their hints and solutions. So a Booklet line inside a group is written with a second `>` (`> > [!choice|plan] Which one?`), and what is written under it at the top level is written under it with the group's one `>`: its options `> - [ ] Walk`, its help text `> > Pick one.`, its hint `> > [!hint]-` with `> > ` on each line of its body. A line that makes structure (`module`, `activity`, `tab`, `row`, `data`, `records`) cannot go inside a group: a renderer ignores it and reports it, and the linter refuses it. A thematic break inside a group is a rule drawn in it, not a page break. A question in a group is its activity's like any other: its id is one of the module's (section 4), and its answer is stored, kept and sent as any other's, so a group adds nothing to the records. **A group is how an author makes steps**: taking a part of an activity one at a time (section 12), a reader moves through its groups, one step each. All at once, a group is drawn where it stands, under its title, and it is a fold when written `> [!group]- Title`; its questions are live inside it, folded or open, and a folded group that holds an answer is drawn open. Outside an activity (in a module's opening or the booklet's) a group is a plain fold of Markdown, as every other kind is.

**Every other kind holds Markdown only.** A Booklet line or a `booklet query` block in a note, a tip or any other kind, or in a group outside an activity, is not yet supported (section 13): the reference renderer draws it as text or code, and the linter warns. Until it is, it goes in a group in an activity, or in the activity's own text ("Queries", below).

A renderer draws each kind in its own colour and picture. A kind the format does not define, written with an id or settings, is reported (section 4). The four kinds above are defined, so they never are.

```markdown
> [!diff] Your guide says the tide turns every six hours
> The guide rounds it off. High water comes a little later each day.[^atlas-12]

> [!group]- Background, if you want it
> Folded until opened. Anything an activity's text can hold goes inside.
>
> > [!choice|tide-turns] How often does the tide turn?
> - [ ] Every six hours, more or less
> - [ ] Twice a month
```

### Hints and solutions

A `hint` or `solution` callout directly after a question belongs to it. A hint helps before the reader answers. A solution explains after. Fold both with `-`.

```markdown
> [!choice|biggest] When do the largest tides come?
- [ ] At the quarter moons
- [x] Near the new and the full moon

> [!hint]- Hint
> Think about when the sun and the moon pull in the same direction.

> [!solution]- Solution
> At the new and the full moon the sun and the moon line up, so their pulls add together.
```

### Citations

A citation is an ordinary CommonMark footnote — the mark `[^id]` in the text, and its definition, `[^id]: …`, anywhere in the file. There is no separate sources registry: a source cited at two places is two footnotes.

```markdown
Most harbours see two high tides each lunar day.[^atlas-12]

[^atlas-12]: *The Harbour Tide Atlas*, 2nd edition (2019), p. 12: "The tide rises and falls twice in each lunar day." Verified 2026-09-20.
```

**A footnote's note, read into a citation.** The reference renderer reads a definition's text and, where it fits the pattern `*Title*, details, p. N: "quote" Verified YYYY-MM-DD.`, turns it into a source and a citation — title, edition, page, quote, and verified badge. This gives a reading module a numbered mark, side panel, hover preview and verified badge, with no separate registry to maintain. A note that doesn't fit the pattern is a plain reference: the panel shows its words as they were written, with no source, no quotation marks and no check, rather than failing or complaining that a source is missing. The pattern, piece by piece:

| piece | example | required? |
| --- | --- | --- |
| the source's title | `*The Harbour Tide Atlas*` (italic) | for a source to be shown at all |
| its edition or other detail | `2nd edition (2019)` | optional |
| the page or place | `p. 12`, `pp. 12–14`, `art. 14` | optional |
| the quote, in quotation marks | `"The tide rises and falls twice…"` | required for any citation |
| a verified date | `Verified 2026-09-20.` | optional; shows the ✓ badge |

A footnote is one paragraph: its first line and any indented lines straight after it.

**The definition line itself never shows.** It is stripped from the document's own prose at the point the file is read, so it is never rendered as a stray paragraph — the citation lives only in the numbered mark and its panel.

### Images

Reference style, with the address at the end of the file among the data, so the prose stays clean. GitHub and Obsidian both resolve it and hide the definition line.

```markdown
![The harbour at low water][harbour]

[harbour]: images/harbour.jpg
```

Images are linked, never embedded. A Booklet renderer fetches an image only from a place its own host declares, never from an address the file names directly. A remote address (`https:`, `http:`, or one that starts `//`) is never requested; a relative path (`images/harbour.jpg`) may be looked up in a store its host declares, or in the folder the host serves beside the renderer (the reference renderer's default folder, below), and nowhere else; an address with any other scheme (`data:`, `javascript:`, `file:`) is never used. A renderer with a host that declares a store, or that reads its default folder, may show images from it (the reference renderer does, as described next); a renderer that does not show an image shows the alt text and the address as text, so a reader can see what was meant. The linter warns on an image with a remote address (`http:`, `https:` or `//`), reports an error for any other scheme, and warns on a relative path the reference renderer would never read (one that breaks the path rules below).

**What the reference renderer does.** It draws an image only for a booklet it opened from the store its host declares (by a `#/open/<name>` link, by the host handing the booklet over with its store name, or from the "Your booklets" entry that came from one), or, on a page served over http or https that declares no store, from its default folder, `modules/` beside the renderer (by a link, or from the "Your booklets" entry that came from one, on the page whose folder it is), and only where the booklet still holds that store's or folder's own text (below, "the store" is whichever of the two the booklet came from). Each time it reads the store's file it keeps that file's text for the visit, and an image is drawn only if the part of the booklet it stands in is exactly the same text as that part of the store's file. A part is a module (its fence from the open line to the end line, with its data section) or the opening together with the activities outside every module (every line outside the front matter, the module fences and the data sections, blank lines aside, so renaming the booklet or adding a module does not change it). So an image is not drawn, and nothing is requested for it, in a module added afterwards, whether under a new id or under the id of one the store's file has (it then replaces that module in place), in a module removed and added again, in a copy kept from an older version of the file that the store has since changed and the reader has not yet read, or in a copy kept from another store or another default folder (the same name on a page whose store is elsewhere, or in the `modules/` of a renderer at another path of the same site). It shows the box instead. This is checked against the file read on each visit, so it holds on later visits and for copies kept before it existed, and a visit that could not read the file draws no image. It draws an image where it stands in a prose block (the text of a module's opening and of its activities). An image written inside a question's wording, an option or another label is not drawn: only its alt text shows, as plain words, with no box, reason or address, in every booklet. A booklet from a file, from the registry, handed over by a host on a page that declares no store, or from a default folder the page does not have, is not given images: each shows the box described above, and nothing is requested.

- **Where a path leads.** A relative path is read relative to the booklet's own name in the store: `images/a.svg` in `<store>/x.booklet.md` reads `<store>/images/a.svg`, and in `<store>/sub/x.booklet.md` reads `<store>/sub/images/a.svg`. In the default folder of a renderer at `/app/`, `images/a.svg` in `sub/x.booklet.md` reads `/app/modules/sub/images/a.svg`.
- **Paths it refuses without asking.** A path is used only if it is made of letters, digits, `_`, `.`, `/` and `-`, is at most 200 characters, starts with no `/`, has no empty part and no part that begins with a dot (so no `..`), and ends in `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp` or `.gif` (in any case). Anything else (`..`, a leading `/`, a scheme, `%`, `?`, `#`, `\`, a space) is never requested.
- **How it reads one.** One plain read through the renderer's single reader: no method but GET, no body, no credentials, no redirect, the same size limit (5 MB) and time limit (15 seconds) as a booklet. The bytes must be what the extension says: for `.svg`, text that begins `<svg`, or `<?xml ... ?>` and then `<svg` (blank space, `<!-- comments -->` and a `<!DOCTYPE ...>` line may come between); for the others, the file's own signature (PNG, JPEG, GIF, WebP). The image is drawn from those bytes, not from the address, at its natural size and no wider than the column, and it prints. An SVG is always drawn as a picture and never inline, so it runs no script and loads nothing. One copy (or one failure) is kept for each address while the booklet is open, and it is dropped when the booklet closes and whenever the store's file is read again (opening it again, "Read the newer file", the host saying the file changed), so an image changed or added at the same path is read again.
- **Alt text.** An empty alt text (`![](images/a.svg)`) marks a decorative image: it is drawn with an empty `alt` and read by a screen reader as nothing.
- **When it cannot.** A missing file, one that is too large, one that is not the image its name says, one the store did not answer for, a file the browser cannot draw as an image (for example an SVG with no `xmlns`, or a truncated PNG), or a path it refuses, is drawn as the box, with the alt text, a short reason in place of "Image not shown", and the address beneath.

### Figures: diagrams placed by reference

A diagram is written once, in the data section, with an Obsidian block id on the line after its fence, and placed in the prose with Obsidian's own embed:

```markdown
Here is the cycle:

![[#^tide-cycle]]

…

```mermaid
graph LR; New --> Spring --> Quarter --> Neap --> Full
```
^tide-cycle
```

Obsidian draws the diagram natively at the embed. On GitHub the embed line shows as text and the diagram renders where the fence itself sits. A mermaid fence written directly in the prose works everywhere.

**A diagram that could make a renderer ask for an address is not drawn.** A renderer must not let a diagram library request an address a diagram's source names, and may refuse to draw such a diagram, showing its source instead.


### Queries: showing kept entries and data

A `booklet query` block, placed in an activity's prose, shows what the reader has kept elsewhere in the same module, or the rows of a data block (section 7). It is read-only and takes no answer.

```booklet query
from: log
fields: situation, ease
limit: 3
empty: Nothing logged yet.
```

- `from:` (required) is an activity id or a question id in the same module. An activity must keep entries (`repeat` or `repeat daily`); the query shows its kept entries, newest first, each with its date and answers. A question shows that question's answers: each kept answer with its date if its activity keeps entries, or its one answer if not.
- `fields:` (optional, with an activity) names the questions to show, comma-separated, in that order. Without it, every question is shown.
- `limit:` (optional) shows only that many of the most recent entries; written as a span of days, `limit: 7 days`, it shows the entries of the past 7 days ("A span of days, and summaries", below).
- `summary:` (optional) takes one value, `on`, and turns the kept entries into summary rows (below).
- `empty:` (optional) is what shows while nothing is kept. Without it, the renderer shows its own short line.
- It reads kept entries and given answers only, never a draft in progress.
- A query never reads across modules. One whose `from:` names nothing, or something in another module, cannot be drawn: the linter reports an error, and a renderer draws nothing for it and reports it. The file still opens. The activities outside any module fence are one module for this rule.
- The kind, `query`, is on the fence line; the settings are the block's lines, `key: value`. Ids follow the rule in section 4 (letters, digits and dashes).
- In Obsidian without a Booklet plugin, and on GitHub, the block shows as a short code block.

A query can also draw a data block, and can say how.

```booklet query
from: short-list
as: list
group: why
```

- `from:` may name a data block (section 7) in the same module or in the file's data section.
- `as:` chooses the view. `cards` is the default for kept entries; `table` is the default for a data block. Every view draws every source.

**Roles.** A view draws a row from the parts its fields play. There are seven, and each is read from the field of the same name unless the query names another.

| role | what it is | read from |
| --- | --- | --- |
| `label` | the row's name | the field `label`, or else the first field |
| `value` | its main figure | the field `value` |
| `note` | a quieter second line | the field `note` |
| `badge` | a short word, drawn as a pill | the field `badge` |
| `tone` | `good`, `warn` or `bad` | the field `tone` |
| `link` | where the row leads | the field `link` |
| `icon` | the row's picture | the field `icon` |

So rows whose fields are already called `label`, `value` and so on need only `from:` and `as:`. A line such as `label: bucket` points a role at a field with another name. A role no row carries is simply not drawn.

**Tone.** A view's `tone` is `good`, `warn` or `bad`, exactly as written. A theme's `good`, `warn` and `bad` keys (section 7) set those same three colours, which a widget names `green`, `amber` and `warm` (section 7). A widget may also use the colour names `slate`, `teal`, `blue` and `purple`, which have no tone.

**Link and icon.** A `link` value is a link target written as prose writes one: `#Heading`, `week-2.booklet.md` or a web address. A view makes the row's label lead there, and a target it cannot follow is plain text. An `icon` value is an icon name (section 3); a name that is not one is not drawn. Both stay plain text in the data: a target is followed, never read as Markdown.

| `as:` | draws | reads |
| --- | --- | --- |
| `cards` | one card per row: a kept entry is a dated card; a data block's row is a card led by its label, its other fields as lines | `label`, `value`, `note`, `badge`, `tone`, `fields`, `group`, `limit`, `link`, `icon` |
| `table` | one row per row, one column per field | `fields`, `group`, `limit`, `badge`, `tone`, `link`, `icon` |
| `list` | one line per row: badge, label, the other fields, value; the note beneath | `label`, `value`, `note`, `badge`, `tone`, `fields`, `group`, `limit`, `parent`, `link`, `icon` |
| `tiles` | one tile per row: a big value over a label | `label`, `value`, `note`, `tone`, `group`, `limit`, `link`, `icon` |
| `bars` | one bar per row: a label and a length | `label`, `value`, `tone`, `limit` |
| `line` | one line per field, across the rows in order | `label`, `value`, `fields`, `limit` |

- `fields:` **picks** among the fields the rows have, and names the **other fields to show**, in order: a table's columns, a list row's quieter extras, a line chart's lines, a card's questions. (A data block's own `fields`, section 7, **declares** them: each key, its label and their order.) Without `fields:` a table shows every field, a list shows every field that plays no role, and a line draws the `value`.
- A table shows the fields its data block declares, or else the keys of the first row. A list's extras, without `fields:`, never include the `id` field, the `group` field or the `parent` field.
- `label:` falls back to the first field only when the query gives no `label:` at all. A `label:` that names a field no row carries draws no label (the linter warns).
- `group:` names a field; rows that share its value are drawn together under that value, in the order the values first appear, with a count.
- `limit:` is a positive whole number, or a positive whole number of days such as `7 days` (anything else is ignored and reported; the linter reports an error). A number draws only the first rows, that many, and it is applied before grouping and before anything the reader filters. For kept entries those are the newest. A number of days keeps the entries of a span instead ("A span of days, and summaries", below).
- `from:` naming a single question makes that question the value.
- With `fields:` on kept entries, an entry that answers none of the named questions is not shown.
- `parent:` names the field that holds the `id` of the row this row sits under. A list whose rows carry it is drawn nested: each row under its parent, opened and closed by the reader. The default field is `parent`, so rows with `id` and `parent` fields nest with no key at all. A row whose parent is not among the rows is drawn at the top. A row that is its own ancestor (a cycle) is drawn once, at the top. When two rows share an `id`, the first is used. `limit` counts top-level rows; `group` is not drawn on a nested list.
- A `tone` of `good`, `warn` or `bad` colours the row's badge, or its value when it has no badge; a tile; a bar. Anything else is plain. A table's `tone` colours its badge column; a table with no badge column ignores `tone`. Tone is always also said in words to a screen reader.
- A `badge` that is a list is drawn as several pills.
- **Tiles with no value are pills.** When no row has a value, there is no big figure to draw, and each tile is a short pill holding its label: a strip of them reads as a status line.
- Every view also works on kept entries (`from:` an activity): each kept entry is a row, its questions are the fields, and its date is the field `date`. Over a data block, `cards` draws one card per row and reads the roles as every other view does: the `label` is its title (and where the row's `link` leads), the `note` the line under it, the `badge` pills, the `value` its figure, the `tone` its colour, the `icon` its picture, and every field that plays no role is a line under it, named by its label, as on a kept entry's card (`fields:` picks them and their order; the `id` and group fields are never lines). `group:` draws the cards under group headings. Over kept entries a card is titled by its date and its lines are the questions: of the roles, kept-entry cards draw `link` and `icon`, and the view takes `fields`, `limit` and `group`. **The reference renderer does not do this yet:** `label`, `value`, `note`, `badge` and `tone` on kept-entry cards are not drawn (the linter warns; `list` and `table` draw them).
- **A question asked for each pick** (`each:`, section 5) is one field per pick, labelled "<title> · <pick's words>", in the source's order, for the picks its rows hold. That one rule covers a card's lines, a kept entry's card, a table's columns, a list's extras, a `line` view's lines and a summary's rows (below). `fields: tool-where` names all of those fields at once. A pair whose pick the source does not hold in the same record is not shown. A follow-up named alone in `from:` gives one row per pick and value. **The reference renderer does not do this yet:** for a follow-up named alone in `from:`, `table`, `list` and `cards` give one row per entry, with one field per pick, and `tiles`, `bars` and `line` draw only a line saying the view does not draw it yet.
- **An answer whose shape is not its kind's** (section 8) is left out of its row.
- Values are plain text: nothing in a data block is read as Markdown or HTML.
- A query that sets a key its view does not read is not an error; the linter says so.

```booklet query
from: by-bucket
as: bars
label: bucket
value: count
```

```booklet query
from: sleep-log
as: line
fields: hours
```

- **Bars.** Each row is one bar: its label names it and its value is its length. Bars are drawn across the page, one under another, in row order, and always start at zero.
- **Line.** The rows, in order, are the points from left to right, and the label is written along the bottom. `fields:` names one or more number fields, each drawn as its own line and named by its field label; without it the value is drawn.
- A value that is not a number draws nothing: no bar, and a gap in a line.
- A chart always offers the same numbers as a table, so nothing is shown only as a picture.
- On kept entries a `number` or `scale` question is a number field, and the label is the entry's date. A reader's own answers over time are a line.
- A renderer chooses the scale, the ticks and the size, and fits the chart to the space it has, including inside a row.

**Sorting and filtering are the reader's.** A renderer may let the reader sort and filter the rows of any view on screen, and should offer the same control on every view. A renderer may offer it only on longer views, and a line chart keeps its order. It is saved nowhere, and a file never states it: a page always opens in the order its rows were written.

A query that names a data block in another module, or an `as:` that is not one of the six views, is not drawn, and is reported, like any other query that cannot be drawn. A query key this section does not list is ignored, and a renderer reports it; the linter reports an error.

**Design rules for views.** These bind anyone extending the format.

1. A view is a way to draw rows. It reads the shared roles and takes no key of its own.
2. A new role must mean the same thing in every view that draws it, and two real pages must need it.
3. A look that styling, density, or the shaping of rows by whatever wrote the file can give is never a new view or key.
4. A reader may open, close, sort and filter what is on screen, and none of it is saved. Anything that changes the file or sends something elsewhere is not a view's business.

### A span of days, and summaries

Two additions to a query over kept entries. They are the one place Booklet computes anything from rows, and they are for kept entries only (see "Why a reader computes these", below).

**A span of days.** `limit: 7` stays the newest 7 entries. `limit: 7 days` is the entries of the past 7 days: today and the 6 dates before it. The span rolls with today; it is not a calendar week. `limit: 1 day` is today's entries. It works on every view, with or without a summary: a table of this week, a line of the last 30 days.

- A day is defined once, in section 8.
- An entry whose `ts` will not parse, or is in the future, is in no span. It is kept as written.
- The span is worked out when the page is drawn, and nothing about it is saved.
- A span of days on a data block, or on a question whose activity keeps no entries, is ignored and reported (the linter warns).

**Summaries.** `summary: on` turns the kept entries into summary rows, which every view draws as it draws any rows. Any other value (`summary: yes`) is ignored and reported; the linter reports an error. A query that names an activity gets one row for the entries' dates, then one row per question, in the activity's order. Each row carries its statistics as named fields:

| field | what it holds | rows that have it |
| --- | --- | --- |
| `label` | the question's title (for dates, "Days logged") | every row |
| `count` | how many answered (for dates, how many entries) | every row |
| `days` | how many different days | dates |
| `average` | the mean, over entries | number, scale |
| `lowest`, `highest` | the least and the most | number, scale |
| `total` | the sum | number, scale |
| `most` | the option picked most | choice, multi, grid-select |

The roles `value` and `note` take a default by kind, so a query needs to name nothing:

| row | `value` | `note` |
| --- | --- | --- |
| dates | `days` | "5 entries" |
| number or scale | `average` | "lowest 1 · highest 4" |
| choice or multi | `most` | "Rough 1 · Mixed 1 · Good 3" |
| a `grid-select` widget | `most` | "Anxiety / stress 4 · Sadness 2" |
| any other kind | `count` | "answered" |

A query points the roles elsewhere with the keys it already has: `value: total` for a tracker of minutes, `value: count`, `note: highest`. A table shows every field, one column each, so a chart always has the same numbers in a table. A matrix gives one row per item, each summarised like a scale. A `grid-select` is summarised like a `multi`: each item's count and the item picked most, the reader's own words counted by their words. An `svg-regions` widget has no summary rule of its own, so it is summarised like any other kind: its row is its `count`, noted "answered". A question asked for each pick (`each:`, above) gives one row per pick, its field for that pick: labelled "<title> · <pick's words>" as in every view, in the source's order, and summarised by its own kind, over the pairs whose pick the source holds in the same record. A query with no `as:` draws a summary as a table.

**One question, one distribution.** A query that names a single question gets that question's distribution instead: one row per value, its `value` the count. A choice, a multi, a grid-select or a scale gives its listed options, items or anchors in list order, with zeros; any other kind gives its values in the order they first appear. A question asked for each pick gives one row per pick and value, as it does with no summary (above). This is what `bars` draws well.

```booklet query
from: evening
limit: 7 days
summary: on
as: tiles
```

This draws four tiles: **Days logged 5** (5 entries); **How did today feel? Good** (Rough 1 · Mixed 1 · Good 3); **Energy 2.6** (lowest 1 · highest 4); **Anything else? 4** (answered).

```booklet query
from: feel
limit: 7 days
summary: on
as: bars
```

This draws three bars, in list order: Rough 1, Mixed 1, Good 3.

**The rules a second reader needs.**

- **The order.** `from:` picks the entries; `limit:` keeps the newest N, or the past N days; `summary: on` summarises every entry kept; `fields:` picks which rows appear (the questions, and `date` for the dates row); the view draws them. Without `summary`, `fields:` keeps its present meaning.
- **Counting.** Averages, lowest, highest and totals are over entries, so with `repeat` a day with three entries counts three times; `days` says how many days. A multi answered with an empty list is not answered. With no answers there is no value and no note.
- **Options.** Rows and notes go in list order. The reader's own options (`open`, section 5) come after, in the order first seen, matched as section 5 matches them (ignoring case and spaces). A tie for `most` goes to the earlier in that order. A distribution shows an option picked zero times; a note leaves it out.
- **Numbers and words.** An average is rounded to one decimal, half away from zero, and a whole number has no decimal ("3", not "3.0"). Numbers are drawn in the renderer's locale ("2,6" in French). A scale's lowest and highest are its anchor numbers. A title is drawn as inline Markdown, as on a kept entry. The renderer's own words ("Days logged", "entries", "lowest", "highest", "answered" and the table's column names) are in the renderer's language (section 9), like its other words.
- **Nothing in the span.** The query's `empty:` shows.
- **What a summary ignores and reports.** `group:` (summary rows have nothing to group by; the linter warns), and `summary` on a data block or on a question whose activity keeps no entries.
- **Nothing is saved.** A summary is drawn, never written, and reads kept entries only, never a draft.

**Why a reader computes these.** Section 7 says a renderer computes nothing from a data block, because whatever wrote the block has already counted and ordered its rows. Kept entries have no upstream: the reader's own app writes them, one at a time. A week's statistics saved into the file would be wrong by tomorrow, and keeping them right would make the writer change the file on every save, against section 8's rule that a writer changes only what the reader changed. So the reader works them out when it draws the page.

**The reference renderer** draws a span of days on every view. It does not draw summaries yet (section 13): a query with `summary: on` shows a line saying so in place of the view, never the plain entries as if the key were not there.

---

## 7. Widgets and other data

**A widget is data, never code**. Its data is a fenced block named `booklet widget`, with a block id after it, and it is placed and operated through a `widget` line:

````markdown
> [!widget|body] Which muscles did you stretch?
> ![[#^body-map]]

```booklet widget
{ "engine": "svg-regions",
  "figures": [ { "id": "front", "svg": "<svg …>", "regions": ["head", "chest"] } ],
  "regions": [ { "id": "chest", "label": "Chest" } ] }
```
^body-map
````

- The fence holds JSON, as a data block's does. The widget's title is the title on the widget line, not a key in the data.
- `engine` names what draws it: `svg-regions` or `grid-select`. An engine a renderer does not have is shown as a notice, and the linter reports an error for one that does not exist. Labels are plain strings, because the file has one language.
- Settings on the widget line: `readonly` (shown, not operated) and `describe` (followed by what each part says about itself). Both engines honour both. A `grid-select` shows its items as plain words and `describe` adds each cell's `note`; an `svg-regions` shows its figure, with its regions named beneath it and nothing to point at or answer, and `describe` adds each region's `note`. Neither setting stores anything. `earlier:<n>` says how many of the reader's earlier words an `svg-regions` widget offers at each place (section 5, "Words the reader wrote before"); a `grid-select` offers none, so on one it does nothing. `each:<id>` asks the widget once for each pick of another question (section 5).
- **An `svg-regions` figure** marks each region the reader can tap as a shape with `class="rg"` and a `data-r` attribute naming the region id. Every other shape in the figure is drawn as a plain outline, and the renderer styles both; a figure needs no styling of its own.
- **Where it renders:** Booklet draws the widget. In Obsidian, the Booklet plugin (section 10, in pre-release) draws both engines in its Booklet view, `svg-regions` without its figure so far. Obsidian without the plugin shows the data block inside the embed frame, which is long but harmless. GitHub shows the embed line as text and the fence as code.
- Every `svg` string is sanitized before drawing.
- **Colours are colour names.** A colour in widget data is a **colour name**: `warm`, `green`, `amber`, `slate`, `teal`, `blue` or `purple`, exactly as written; anything else is no colour, and the linter reports it. The renderer draws the name in the active theme's colours, so a widget looks right in every theme. `green`, `amber` and `warm` are the colours the three tones `good`, `warn` and `bad` use (section 6); `slate`, `teal`, `blue` and `purple` have no tone. "Tone" means `good`, `warn` or `bad` and nothing else.

**What each engine reads.** The keys of a widget's data, and nothing else is read.

`svg-regions`: a figure with tappable regions, and words to say what it is like there. What it records is a list, one `{ "id": region, "s": [word ids, or the reader's own words] }` for each region the reader marked.

| key | what it holds |
| --- | --- |
| `figures` | the drawings: each `{ "id", "label", "svg", "regions": [region ids] }`; with more than one, a switch between them |
| `regions` | each tappable region: `{ "id", "label", "note" }`; `note` is shown with `describe` |
| `senses` | groups of words to say what it is like: `{ "id", "label", "words": [ { "id", "label" } ] }` |
| `chips` | region ids offered as buttons beside the figure |
| `copy` | the words the widget says: `h`, `p`, `stance`, `invite`, `pick`, `clear`, `none`, `sideLbl` |

A word the reader writes is offered again later (section 5). A typed word is one of the widget's words when the two match in lower case, with ’ ‘ \` and ´ read as ', — and – read as -, every run of white space read as one space, and white space at either end taken off.

`grid-select`: a grid of cells, each holding items to press and a field for a word of the reader's own. What it records is a list of item ids, and `x|cell|word` for a word of their own.

| key | what it holds |
| --- | --- |
| `cells` | the grid's cells: `{ "id", "label", "note", "color" }`; `color` is a colour name; `note` is shown with `describe` |
| `axes` | the four edge labels: `{ "top", "left", "right", "bottom" }` |
| `items` | what can be pressed: `{ "id", "cell": a cell id, "label" }` |
| `copy` | the words the widget says: `h`, `p`, `stance`, `invite` |

**Data blocks live inside their module's fence, in the module's own data section at the end (`> [!data|module-id]`), or in the shared data section (`> [!data] Data`) (section 3).** The renderer finds fences by their language word and block id, never by a heading.

### Data: rows a generator wrote

A report or a dashboard page carries its numbers as a data block: a fenced block named `booklet data`, with a block id on the line after it.

````markdown
```booklet data
{ "fields": { "title": "Item", "due": "Due", "why": "Why it is here" },
  "rows": [
    { "title": "Renew the licence", "due": "2026-10-08", "why": "due in 5 days" },
    { "title": "Send the report",   "due": "2026-10-03", "why": "due today" } ] }
```
^short-list
````

- The fence holds JSON: an object with `rows` (a list of flat objects) and, optionally, `fields`, or just the list of rows. `fields` **declares** the block's fields: each key, its label, and their order (it is also the default order). A query's `fields:` (section 6) **picks** among them.
- A value is a string, a number, `true`, `false` or nothing. A list of those is shown comma-separated. Nothing nests deeper.
- It lives where a widget's data lives: inside its module's fence (and is that module's), or in the data section at the end (shared by every module).
- Its id may not also be the id of an activity or a question in the same module, because a query reads by id and could not tell them apart.
- A data block belongs to whoever wrote the file. A reader never changes it, it is not a record, and a renderer writes it back exactly as it found it.
- Nothing is computed from it. Whatever wrote the file has already ordered, counted and filtered the rows; a renderer draws them. Draw them with a `booklet query` (section 6). The one exception is a summary of kept entries (`summary: on`, section 6), which is for kept entries only and never for a data block.

### A theme: how the booklet would like to look

```booklet theme
base: paper
accent: "#0f3d47"
paper: "#f6f1e7"
ink: "#22201c"
font: serif
density: roomy
```

- One theme block per file, outside any module fence. It belongs to the booklet, not to a module: a module added to a booklet takes the booklet's look.
- Every line is `key: value`. Nothing else is read, and nothing in it is CSS.

| key | value | default |
| --- | --- | --- |
| `base` | `paper`, `daylight`, `night` or `contrast` | `paper`, when the block names a colour |
| `paper`, `ink`, `accent` | a hex colour, `#rgb` or `#rrggbb` | the base theme's |
| `good`, `warn`, `bad` | a hex colour: the three tones (section 6) | the base theme's |
| `font` | `default`, `serif`, `sans`, `mono` or `readable` | `default` |
| `density` | `compact`, `comfortable` or `roomy` | `comfortable` |
| `style` | `teaching` or `briefing` | `teaching` |

- `density` sizes the views (rows, tiles, tables, bars) as well as the prose: `compact` is tighter and `roomy` looser throughout.
- `style` is the booklet's look. `teaching` draws for working through: soft tiles with pictures, the reader led card by card. `briefing` draws for reading at a glance: solid tiles with icons, figures first. A style changes shapes and where colour goes, never the colours themselves, so it stays when the reader picks a theme of their own, like `font` and `density`.
- A theme block that names no `base` and no colour has no base: it leaves the colours to the reader, whatever `font`, `density` or `style` it sets.
- A renderer works every other colour out from these (soft tints, rules, the text drawn on an accent), so a theme stays coherent.
- **A colour that would be hard to read is not used.** If text on its background falls below a contrast of 4.5 to 1, the renderer keeps the base theme's colour for that pair, and the linter says which.
- A theme names a family, never a font file. A renderer may carry a family inside itself; nothing is fetched.
- **The reader has the last word on colour.** A reader who picks a theme of their own gets its colours, whatever the booklet asks for. The booklet's `font`, `density` and `style` still apply: they are the page's layout, not its colours.
- Printing is always light.

---

## 8. Records: what a reader answered

Records are JSON, written by the app, one fence per record, each parsed on its own so that one broken record costs one record. A file nobody has answered has none.

````markdown
%%
> [!records] App record — do not edit below this line

```booklet answers
{ "noticed": "How much the range changes over a fortnight", "biggest": 2, "clarity": 3 }
```

```booklet entries rd-check
{"items": [
{"ts": "2026-09-27T14:02:00Z", "biggest": 2, "noticed": "…"}
]}
```

```booklet draft rd-check
{"noticed": "the printer aga"}
```
%%
````

- `answers` holds once-answered questions, keyed by question id within the module whose records line it sits under, so no activity prefix is needed. Records sit in the records section at the end, grouped by module under `> [!records|<module>]` lines, never inside a module's fence (section 3).
- `entries <activity>` holds a `repeat` activity's kept entries, each with a `ts`, identified by timestamp. `draft <activity>` holds what is typed and not yet kept. Each names the activity by the id the file gives it, in the module whose records line it sits under.
- **A day** is the calendar date of an entry's `ts` in the reader's own time zone, and "today" is the reader's date at the moment the page is drawn. `repeat daily` (section 3) keeps one entry a day by this day, and a span of days, `limit: 7 days` (section 6), is counted in these days.
- A choice is stored as the option's position from 1, a scale as the anchor's number. Words are shown by the renderer from the file's own lists. A string in a choice or multi answer is the reader's own option (`open`, section 5): it is shown as it was written.

- **An answer whose shape is not its kind's is kept as written, and its question is drawn read-only, with a notice saying so.** An answer's shape is the JSON type its kind stores (section 5's table, section 7's engines), and whether a position or an anchor is a whole number counted as the format counts it (an option's position from 1, an anchor's number from 0), never whether the question lists that value: a `scale` answer of `7` on anchors `0` to `4` has its kind's shape, and `1.5` or `-1` has not. An answer that holds nothing is no answer, never one of the wrong shape. Holding nothing goes all the way down: `null`, `false`, a string of only white space, and a list or an object whose every member holds nothing (`[]`, `[""]`, `{}`, `{"a": ""}`) hold nothing; any number, `0` included, and `true` hold something. The shapes:

  | kind | its shape |
  | --- | --- |
  | `text`, `date` | a string |
  | `lines` | a list of strings |
  | `number` | a number |
  | `scale` | an anchor's number: a whole number from 0 |
  | `choice` | a position (a whole number from 1), or a string |
  | `multi` | a list of positions and strings |
  | `matrix` | a list of anchor numbers and `null` |
  | `grid-select` widget | a list of strings |
  | `svg-regions` widget | a list of `{ "id": a string, "s": a list of strings }` |
  | a question with `each:` | a list of pairs, `{ "pick": a number or a string, "a": its kind's shape }` |

  Other keys in a pair or a region's row are kept and allowed. A widget whose engine a reader does not have is not checked. This holds in `answers`, in drafts and in kept entries. No press, Finalize or save changes such an answer: it is written back as it was read. A view leaves it out of its row (section 6), and a reader says once, among the file's problems, that answers are kept as written. Such an answer comes from a hand edit, or from a reader that did not know a setting: a reader without `each:` draws an ordinary question over a list of pairs.

- **A word typed in a grid cell leaves the answer's order as the reader picked it.** A `grid-select` answer holds item ids and the reader's own `x|cell|word` in the order they were added: a word typed in a cell goes at the end, and one taken out leaves the others where they were, so the copies of a question asked for each pick of the grid (section 5) never move on screen.
- **The whole records section sits inside `%%` … `%%`**, which hides it from Obsidian's Reading view. A block a `![[…]]` embed points to is never put inside `%%`, because an embed cannot reach a block hidden that way — only data no other part of the file references belongs there, and the records section is exactly that.
- **A record the reader did not change is written back exactly as written: nothing re-sorted, nothing respaced.** That covers every answer, entry and draft the reader left alone; an answer to a question the reader does not know (a kind from a later version) or that the design no longer has; an entry or a draft for an activity the design no longer has; a record block the reader does not understand, such as `sync` or a kind a later version adds; and a block it could not parse, which is still reported (section 12). A record is dropped only when the reader changes it: an answer the reader clears, a module the reader removes. How a writer makes the reader's change and keeps the rest is under "Writing records back" below.
- **The records region** runs from the `%%` directly before the first records line (only blank lines between) to the `%%` that closes it; with no `%%` before the records line it starts at that line, and with no closing `%%` it runs to the end of the file. Only records are read inside it. Anything else there, such as a block of another kind (a `widget` or `data` block, a `> [!data]` line), prose or a line, is reported and kept as written. A writer adds a records region only to a file that has none; records found after the first region (a second region, for example from two saved booklets pasted together) are read as records, exactly as if they sat in the one region, and merge under the rule below. After the closing `%%` the file is design again: it is read as design (prose, a module, a data section), reported once, and written above the region when the booklet is saved, because the records sit at the end; the region itself is read after the rest of the file, so a records line finds a module wherever the file writes it. A `%%` … `%%` comment anywhere else is design text and stays where it is. A record block outside the region is reported and not read.
- **Blocks for one scope are read in file order, and the reader's values come last.** A later block adds what an earlier one lacks, and for a key both hold the later wins; this is the same for `answers`, `entries` (two blocks for one activity are one list) and `draft`. So a writer sets a value where it is read last, and a file with a broken block fixed by hand keeps both the old values and the new ones. A records line is read by the exact id it carries, and so is an activity named in an `entries` or `draft` block. A records line whose id names no module the file has and no bare activity is reported, and the blocks under it are kept as written and not read; adding a module with that id makes them that module's. An entry is an object with a `ts`, and a block with an entry that is not is reported and kept as written.
- `sync` (where the file is kept) is a record like any other that a reader may not understand, so it is kept as written. The reference renderer does not read it (section 13).

**Writing records back.** These rules hold for any writer: the reference renderer, the Obsidian plugin (section 10), a tool. Where they say *may*, writers differ and each way is allowed; a reader reads them all the same.

- **Only what the reader changed is written.** An answer, or a field of a draft, is set, cleared or added as one member of the block that holds it; a kept entry is replaced, taken out or added as one item of its list. Every other member, item, block, records line and blank line keeps its text. A writer must not re-sort a list of entries, respace a record, or rewrite a record the change does not touch. A value the reader did not change keeps its text, so a number keeps its digits and an object its key order.
- **The body is left as it is.** Everything before the records region comes back byte for byte, its trailing blank lines too. A file with no region gets one at its end; a writer puts one blank line between the body and the new region only where the body does not already end with one. A file with design after its region is the one case where the body changes: that design is written above the region ("The records region" above).
- **Line endings and spacing.** A writer keeps the file's line endings, writes each line it adds with the file's own, and keeps a byte order mark. A new member or entry follows its block's layout: on one line, or one to a line at the block's indent, with the separator the block already uses; a new entry may be written compact, as the reference renderer and the Obsidian plugin write one. A writer may add a blank line on either side of a block it adds, where none separates it from the lines around it. Key order carries no meaning: the keys of a block or an entry a writer adds may be in any order, and `ts` may stand anywhere in an entry (the example above puts it first; the reference renderer puts it last).
- **A new entry's `ts`** is an ISO 8601 time in UTC, to the second (`2026-09-27T14:02:00Z`) or to the millisecond (`2026-09-27T14:02:00.000Z`): the Obsidian plugin writes seconds, the reference renderer milliseconds. A writer never gives a new entry a `ts` that another entry of its activity already has: it moves a clash on to the next free second or millisecond. This is a rule for the entry a writer adds: two entries a file already holds with one `ts` are kept as written.
- **Where a change goes.** A value set goes into the last block of its scope and kind, where it is read last; a value cleared goes from every block that holds it. A new entry goes after the last entry of the activity's last `entries` block. A new block goes in its scope's group and may stand anywhere in it: the reference renderer and the Obsidian plugin put a new `answers` block at the end of the group, an activity's first `entries` block where its draft stood, and a new `draft` after the activity's last `entries` block. A group the file lacks is added: the bare activities' before the first records line, a module's at the end of the last region.
- **Two regions** (two saved booklets pasted together) are kept as written, and a writer does not join them; a change goes where the rule above puts it, in either one. When design after a region is written above it, the regions follow the body one after the other, each as written.
- **A block the reader's change leaves empty.** A draft the reader's change leaves holding nothing (as "holding nothing" is defined above) is taken out; one that still holds a pair for a pick taken back holds something, and stays. An `answers` block whose last answer is cleared, and an `entries` block whose last entry is deleted, may be kept (as `{}`, or with an empty list) or taken out: the Obsidian plugin keeps an `answers` block as `{}`, and the reference renderer takes both out.
- **Questions in a `repeat` activity** are answered in its `draft` and kept in its `entries`, never in `answers`.
- **Finishing an entry again.** A `repeat daily` activity keeps one entry a day (section 3; a day as defined above): finishing it again replaces that day's first entry, which a writer may write in its place, and every copy of the old entry (its `ts` in a later block) goes with it. Finishing it again with nothing changed may be refused (the Obsidian plugin) or kept again with a new `ts` (the reference renderer).
- **A value a writer cannot show**, such as a date not written as `YYYY-MM-DD`, is kept as written until the reader changes it. A number outside its question's `min` and `max` is stored as typed. The reader's own option words may be trimmed of spaces at either end.
- **A body that ends inside an unclosed code fence.** A region added after it would be read as part of the fence, and its records would not be read back. A writer may refuse to add records to such a file and say why (the Obsidian plugin does); the reference renderer does not check yet (section 13).

---

## 9. Languages

**A module is written in one language.** In a module's own file, `lang` in the front matter says which. A translation is a sibling file, `tides.es.booklet.md`, with the same `id`, the same activity and question ids, and the same number of options in every list, in the same order. Answers therefore carry across languages unchanged: position 2 is position 2.

A regional variant (`es-AR`) is its own sibling file.

**In a booklet, `lang` is about the page around the content, not the content.** It sets the language of the renderer's own words (its menus, buttons and dialogs) and its defaults, such as how a date is written and what a new booklet is called. It does not say what language a booklet's modules are in: a booklet may hold modules written in different languages, and adding a module never changes the booklet's `lang`. A reader who has chosen a language for the renderer keeps that choice, whatever a booklet says. Any well-formed tag is allowed: a lowercase language with an optional region (`en`, `es-AR`, `de`, `pt-BR`). The renderer's own words (its buttons and dialogs) come in `en`, `fr`, `es` and `es-AR` (`es-AR` → `es` → `en`); for any other language they appear in English. A file with no `lang` is read as English, and a renderer reports it. The linter requires `lang`, rejects a tag that is not well formed, and warns when the interface has no strings for the language.

---

## 10. Obsidian and GitHub: what to expect

**Obsidian: nothing here should cause a problem.** The things that would, and how they are avoided:
- `#word` anywhere becomes a tag, so no `#` appears in Booklet syntax outside headings.
- `[[…]]` is a link Obsidian may rewrite on rename. Booklet writes double brackets for Obsidian's own embeds, `![[#^id]]`, for heading links, `[[#Heading]]`, and for a link to a whole module, `[[week-2.booklet]]`.
- `%%` hides text in Reading view, and Booklet uses it only for the record wrapper. `==text==` highlights, in Obsidian and in the Booklet renderer, so a file may use it.
- Block ids allow letters, digits and dashes only; every Booklet id follows that rule.
- The Properties editor may rewrite front matter; the front matter is flat and readers accept any form of it.
- **A checkbox click in Reading view edits the file.** See "Choice" in section 5 for the accepted trade-off.
- **Obsidian and GitHub show images their own way**, outside the rule in section 6.
- `---` on the first line opens front matter, which is intended; `---` directly under text makes a heading, so page breaks need a blank line above or use `***`.
- **Two modules in one file may use the same block id or footnote id, and Obsidian and GitHub do not know about modules.** Booklet reads every reference inside its own module (section 4). Obsidian resolves `![[#^id]]` to the first block with that id in the note. Obsidian and GitHub resolve a footnote mark `[^id]` and its definition across the whole file. So when two modules use `^fig` or `[^1]`, Booklet shows each module its own, and those hosts show the first one's for both.
  - This holds for a block id or a footnote id under a module's own data section too. It does not arise in a file with one module.
  - Question, activity and menu ids never matter to a host: they are callout metadata.
  - A tool that puts modules together may rename a clashing block id or footnote id by prefixing the module's id (`fig` becomes `week-2-fig`, with every reference to it inside that module), as the reference renderer's Add a module does. An author never needs to prefix an id by hand.
  - The reference linter warns about a block id or a footnote id that two modules share.

**The Markdown the reference renderer draws.** Headings (`#` to `######`, and a line underlined with `===` or `---`), paragraphs, emphasis (`*em*`, `_em_`, `**strong**`, `__strong__`), `~~strikethrough~~`, `==highlight==`, `` `code` `` and fenced code (backticks or tildes), links (inline, reference-style, `<autolinks>`, bare web addresses, and `[[#Heading]]` to a heading in the file), images (inline and reference-style, linked and never embedded; the reference renderer draws an image from the host's declared store, or from its default folder, for a booklet opened from it, and shows any other image's alt text and address as text and fetches nothing), bulleted, numbered and task lists (task boxes are drawn, not operated), tables, block quotes, thematic breaks (page breaks inside an activity, rules inside a group), footnotes (section 6), `$math$` and `$$display math$$`, `mermaid` fences, and `<!-- comments -->`, which are not drawn. A backslash escapes a punctuation mark. Raw HTML is not drawn: it shows as text.

**Obsidian: how it looks without a plugin.** A chart is a `booklet query` block, so it shows as a code block, like any query. Every Booklet line is a titled callout (a row reads top to bottom, its two marker lines showing as small callouts; a theme block shows as a short code block); a module's notice is a small quoted box at the top of the module, which is what a notice should be, and a `> [!data|module-id]` line is a titled callout above that module's blocks; questions are callouts followed by lists; figures render at their embed; widgets show their data; a query and a data block show as code blocks. **With the Booklet plugin.** A plugin for Obsidian exists, in pre-release: `booklet-obsidian`, installed as a test build with BRAT and not yet in Obsidian's plugin directory. It opens a booklet note in a Booklet view of its own (Obsidian's `TextFileView`, the way the Kanban plugin shows a normal note as a board) and draws the booklet's openings, its activities and their questions (the seven common kinds, and shared lists), the `grid-select` and `svg-regions` widgets, and `repeat` activities with their drafts and kept entries. What the reader answers there is written into the note's records region by the rules of section 8. It does not draw everything the reference renderer draws yet: what it leaves out (`matrix` questions, figures, query views, tabs and pages among them) it marks "Not yet supported" and keeps in the note as written, and its own repository lists it.

**When a `$` is a price.** `$$…$$` is display math. A single `$` opens inline math only when a character that is not a space (and not another `$`) follows it, and the math ends at the next `$`, which must follow a character that is not a space and must not be followed by a digit; if that next `$` fails the test, the first `$` is an ordinary dollar sign, and so is a `$` with no such partner. `\$` is always a dollar sign. So `$x$` and `$38,500 of $60,000` come out as a formula and as two prices, but `$5 a month ($)` can turn into a formula: write a price in prose as `\$5`.

**GitHub.** Callout lines show as quotations with the `[!kind|id]` text visible; lists, task lists, footnotes, math and mermaid render; `![[#^id]]` shows as text. Nothing breaks.

---

## 11. A complete booklet

````markdown
---
booklet: "0.15"
id: example/tides
title: How tides work
lang: en
version: "0.1"
---

# How tides work

A short reading, then a check.

> [!activity|rd-tides] Why the sea rises twice a day

Most harbours on this coast see two high tides and two low tides each lunar day.[^atlas-12]
The range is the difference between them: $R = h_{high} - h_{low}$.

![[#^tide-cycle]]

> [!diff] Your guide says the tide turns every six hours
> The guide rounds it off. High water comes a little later each day.[^atlas-12]

***

## Spring and neap

Twice a month the sun and the moon pull together.

> [!activity|rd-check repeat] Check yourself

> [!choice|biggest] When do the largest tides come?
- [ ] At the quarter moons
- [x] Near the new and the full moon

> [!hint]- Hint
> Think about when the sun and the moon pull in the same direction.

> [!scale|confidence] How sure were you?

1. Guessing
2. Fairly sure
3. Certain

> [!text|noticed] What surprised you?

> [!data] Data

[^atlas-12]: *The Harbour Tide Atlas*, 2nd edition (2019), p. 12: "The tide rises and falls twice in each lunar day." Verified 2026-09-20.

```mermaid
graph LR; New --> Spring --> Quarter --> Neap --> Full
```
^tide-cycle
````

Two activities, the first with two pages, one figure placed by reference, one citation, three questions, and no JSON, because nobody has answered yet. A full worked example with kept entries is [`examples/how-tides-work.booklet.md`](examples/how-tides-work.booklet.md); [`examples/mindful-check-in.booklet.md`](examples/mindful-check-in.booklet.md) is a second, showing both widget engines.

---

## 12. Conformance

A conforming reader must: read a file whose front matter declares `booklet: "0.15"` by this document (the marker read as text: `0.10` is not the number 0.1); refuse a file with no `booklet:` marker, or one that is not a `0.x` version (`1.0`, `2`, words); refuse a module opened and not closed, or closed and not opened, or whose fence overlaps another's; refuse an id used twice in one module (a menu's, a block's, a question's, an activity's; a module's fence and its own data section are one scope), and a module id used twice in one file; parse each fenced record independently and skip, count and report any it cannot read, rather than abandoning the file; keep an answer whose shape is not its kind's as written, and draw its question read-only, with a notice saying so (section 8); open a file with any other problem, ignoring the part it could not read, and say so when it opens, with a notice that gives how many things it could not read and lists them (a setting a kind does not take, an unknown kind, a query key it does not have, a block it does not define, a reference across a module boundary); and treat every string a person wrote, a booklet's name and a module's notice among them, as content, never as instruction; fetch no address a file names (no remote image, no diagram image or style, no font), and draw a link to a module it does not hold without fetching anything. Opening a file therefore asks the network for nothing but the renderer's own parts, from where the renderer came, and only when a booklet needs one, with one exception: a reader whose host declares a store, or a reader on a page served over http or https that declares none (which reads the default folder, `modules/` beside the renderer), may read the images of a booklet it opened from that store or folder, only where the booklet still holds that store's or folder's own text for the part the image is in (section 6), as a plain read of the store's or folder's own address plus a checked relative path (section 6). That is an address the reader builds from the host's store, or from the page's own address, and a path, never an address a file spells out; a booklet opened any other way asks for no image at all. (The reference renderer is a core and its parts. Its one part loaded this way today is the diagram library, `parts/mermaid.js`: the page asks for it with an ordinary GET of the file beside itself, only when a booklet has a diagram. A booklet with no diagram and no image to read from a store or the default folder makes no request at all. A build can always put every part inside one file. A link the reader follows, `#/open/<name>`, is not a file naming an address: it asks for that one booklet, by a name it checks, from the store the page's host declares or, on a page served over http or https that declares none, from `modules/` beside the renderer, and nothing is asked for until it is followed.)

A conforming reader should open a file marked with another `0.x` version, earlier or later, by its own rules and with the notice that section 2 describes. A reader saves such a file back with the marker it came with.

A reader may also offer conveniences that this document does not define and that conformance does not test. The reference renderer has all six, and a conforming reader needs none:

- a library of the reader's booklets, with rename, remove, and a request that the browser keep its storage;
- a host hook, `window.Booklet`, through which a page that serves the reader supplies a store, a line and offers, and opens a booklet by link (`#/open/<name>`) from a store that the host's copy names in a `booklet-store` meta tag, or, on a page served over http or https with no such tag, from a `modules/` folder beside the renderer, which it only reads and never hands to the host (so a host can serve the released file unchanged);
- one at a time, which takes the groups (section 6) of the part on show (the activity, the tab, or the `***` section of either on screen) one by one when it holds two or more, with the pager's own Back and Next, and Next on the last step going on to the next `***` section; a step draws its group open, its title and everything in it; what comes before the first group is drawn whole above every step, whatever it is (prose, a heading, a callout, an image, a table, a question in no group) and however long, as an activity's opening is drawn above every tab, so it is there at each step and in none of them; what comes between two groups goes with the group after it, and what follows the last group with the last; a question in no group is never a step of its own, so a part with fewer than two groups has no step view, however many questions it holds; all at once, the part on show is drawn as it stands, with nothing held in view;
- the fold switch, Open all, shown only on a screen with callouts the author folded with `-`, which opens or folds exactly those and never a question's hint or solution (the renderer folds nothing the author did not);
- a theme menu with Auto, which follows the booklet's own look if it asks for one and the device otherwise;
- "draw the title once", which leaves out an activity's first heading when it repeats the activity's title above it.

A conforming writer must: emit front matter with the current marker, `booklet: "0.15"` (section 2); keep module ids, activity ids and question ids stable; write the whole records section inside `%%` … `%%`; write back every record it read exactly as written, nothing re-sorted and nothing respaced, unless the reader changed it, and change only what the reader changed (section 8); write a `booklet data` block back exactly as it found it; and never put a data block a `![[…]]` embed points to inside `%%`.

`lint-booklet.py` in this repository checks `booklet: "0.15"` files, and is the reference implementation of "is this file valid." A file with another `0.x` marker is checked as 0.15 and gets one warning ("this file says booklet: 0.9; the current format is 0.15, and it is checked as 0.15"); a file with no marker, or a marker that is not a `0.x` version, is an error.

---

## 13. What's not built yet

This is a young format, and the reference renderer does not yet do everything this document describes:

- **Editing a booklet's design in the browser.** Today, editing a file's design means a text editor, not the renderer — a deliberate, temporary scope decision so the format and the read-only renderer could be proven first.
- **All of this document in Obsidian.** The Booklet plugin for Obsidian (`booklet-obsidian`, section 10) is in pre-release. It reads and writes booklets and draws part of what the reference renderer draws; its own repository lists what it does not draw yet.
- **A second, complete implementation.** The plugin is a second, independent reader and writer, and covers part of this document; the renderer in this repository is the only reader of all of it so far.
- **Checking for a body that ends inside an unclosed code fence** (section 8). The reference renderer adds a records region after such a body, where it is read as part of the fence, so the answers written there are not read back; the Obsidian plugin refuses to write to such a note.
- **The drafts below.** The manifest and the linter's sibling check are written down and not built.
- **Reading `sync`**, the record of where a file is kept (section 8). A reader keeps the block as written; it does not read it.
- **Showing images to a booklet that was not opened from the host's store or the default folder** (section 6). The reference renderer reads images only from the store its host declares, or from its default folder on a page that declares none, and only for a booklet opened from it. For any other booklet (one from a file, one from the registry, or one a host handed over on a page with no store) it draws the alt text in a quiet box that says the image is not shown, with the address as text beneath. A way to give such a booklet its images, such as a folder of images picked by hand, is not built.
- **Summaries** (`summary: on`, section 6). The reference renderer reads the key and shows a line saying summaries are not yet supported in place of the view; it does not work out the rows.
- **Roles on kept-entry cards** (section 6): `label`, `value`, `note`, `badge` and `tone` are not drawn on cards over kept entries.
- **Heading links in the booklet's opening** (section 3). The opening belongs to no module, so a `[[#Heading]]` link there leads only to a heading among the activities outside every module fence, and is otherwise drawn as plain words.
- **Footnotes in the booklet's opening and in a title** (sections 3 and 4). The reference renderer leaves a mark there out and draws no note.
- **A query view or a Booklet line inside a callout that holds Markdown only** (section 6): in a note, a tip or any other kind but a group, or in a group outside an activity, the reference renderer draws a `booklet query` block as code and a Booklet line as text, not as a view or a question; the linter warns. A group in an activity reads both.
- **A question asked for each pick** (`each:`, section 5). The reference renderer draws its title and a line saying it is not yet supported, and keeps its answer as written; its views show the pairs (section 6). A follow-up named alone in a query's `from:` gives one row per entry, with one field per pick, in `table`, `list` and `cards`, not one row per pick and value; `tiles`, `bars` and `line` draw only a line saying the view does not draw it yet.
- **A body widget's earlier words and a `lines` question's earlier lines** (section 5, "Words the reader wrote before"). The reference renderer offers neither; it offers own options again, with `earlier:`.

None of this affects what already works: loading, reading, answering, and saving a v0.15 booklet with every question kind above, its widgets, and its citations.

### Drafts

These are described so that nothing is lost, and they are not part of the format: no reader reads them and the linter does not check them. Each stands alone, so a later edit can lift it whole into a draft appendix.

**Draft: a manifest.** Right after the front matter, a `manifest` callout would list a booklet's parts in order, each `inline` or a link to the file that holds it:

```markdown
> [!manifest] How tides work
> - module week-1: inline
> - module week-2: [[week-2.booklet]]
> - data body-map: [[shared/widgets.booklet#^body-map]]
> - data: inline
> - records: inline
```

It would be required when anything lives in another file, and recommended always, as the table of contents an editor sees first. A linter would check it against the file and report a part it names that is missing, or a part in the file it does not name. A manifest line that names a path would settle which module a link to a whole module (section 3) means; otherwise a module's file is named by its id. A whole-note embed, `![[week-2.booklet]]`, could stand in a manifest line where the module should render inline in Obsidian. `manifest` stays a kind the format knows (section 4): it takes no settings, and the reference renderer skips it and the reference linter does not check it.

**Draft: parts in other files.** A part of a booklet, a module or a data block, could live in another file. Paths follow Obsidian's conventions: `[[week-2.booklet]]` (Obsidian resolves a note by name anywhere in the vault) or an ordinary Markdown link, `[Week 2](modules/week-2.booklet.md)`, relative to the booklet's own folder; a block in another file is `![[week-2.booklet#^body-map]]`. Absolute machine paths such as `~/notes/…` are outside what Obsidian (vault-relative) or a browser (no file system) can read, so they would not be supported; an unresolved link is shown as one and breaks nothing. A reference would be looked up in the module's fence, its data section, the shared data section, and then the files the manifest names. The reference renderer reads one file: a part that lives in another file is not read.

**Draft: a check of translation siblings.** A translation is a sibling file (section 9). A linter, given the siblings, would check that ids match and lists have equal length. `lint-booklet.py` has no such check, and no translation exists yet.
