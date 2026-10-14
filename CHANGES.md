# Changes to the booklet format

What changed in each version of the format, newest first. `SPEC.md` states the rules as they are now and carries no history; this file keeps it. Section numbers are those of `SPEC.md`. A version marked "wording only", "drawing only", "the reference renderer only" or "wording and the reference renderer" changed no file: the marker stayed as it was.

## Changes in v0.13.1: wording and the reference renderer

Nothing a file may say has changed: the marker stays `booklet: "0.13"`, and no file needs touching. One rule is reworded (section 12), for a renderer made of parts. The reference renderer reads a booklet the way a second reader would, and what a reader of it can notice is this.

- **Opening a file may ask for the renderer's own parts** (section 12). A conforming reader's promise was that opening a file asks the network for nothing; it is now that it asks for nothing but the renderer's own parts, from where the renderer came, and only when a booklet needs one. The reference renderer's diagram library is such a part, `parts/mermaid.js` beside `booklet.html`: a booklet with a diagram asks for it once while it is open, and a booklet with none asks for nothing. Over http or https the browser checks the part against the sha256 this renderer carries for it. Where the part cannot be had, or is not that file, a diagram shows its source under a note that says so, and the part is asked for again the next time a booklet is opened. A build can still put every part inside one file.
- **The interface language follows section 9.** The reader's own choice holds in every booklet; with none, the booklet's `lang` where the renderer has its words; otherwise English. The EN / ES / FR toggle shows in every booklet (before, a booklet's own language held the page and the toggle was hidden), and "Your booklets" is in English for a reader who never chose (before, it took the last booklet's language). A reader who chose Spanish reads a booklet whose `lang` is `es-AR` in `es-AR`, and other booklets in neutral Spanish.
- **A footnote one bare activity defines is found from another** (section 4: the activities outside every module are one module with no name). Before, the other activity drew "No citation called …".
- **What a booklet shows is kept per booklet, for the visit.** A booklet opened again keeps its pages, steps and sections. Reading a newer file over it, Clear everything, or a store booklet drawn from a file that changed since it was last read, starts them afresh (before, they were kept by place across every booklet, a newer file included). Two booklets started here no longer share their one-at-a-time and folding choice.
- **A kept entry records only what was answered**: no empty list for a lines question or a widget left untouched.
- **A booklet an earlier release kept is read by this release's rules when it opens.** If they accept it, it shows the notices a file opened afresh would show, once. If they refuse it, it opens from the design that release kept, and its notice shows on every open until the file is fixed. Before, it opened silently as kept.
- **A record kept as written for a module the booklet lacked joins the reader's work as soon as that module is added** (section 8), so the file written changes then, not at the next download and reopen.
- **Remove a module and an update of one find the module's fence outside code fences**, as Add a module always did. Before, a module line shown in a code block (a guide that shows how a module is written) could be taken for the module itself, and the lines removed or replaced were the example's.
- **A page of several is named in the pages menu by its first heading outside code fences**, the heading its links find, and an opening's leading heading that repeats the title above it is found by the same rule. Before, a line in a code block that looked like a heading (`# a comment` in a script) could name the page.
- **Citations are numbered in reading order around a question's own hint and solution.** A question's folded hint and solution are drawn inside it, so their marks are numbered before an unfolded hint written between them, which is drawn after the question: a hint `[^a]`, an unfolded hint `[^b]` and a solution `[^c]` are numbered 1 and 2 inside the question and 3 below it, the endnotes A, C, B (before, 1 and 3 inside and 2 below). Likewise, a question that is not drawn (its `menu:` names no menu) leaves its own hint and solution where it stood, ahead of an unfolded hint written before the solution.
- **In a row with no headings, a question whose id ends in `-hint` or `-solution` has a cell of its own**, as any question does. Before, it was taken for a hint and put in the cell before it.
- **Leaving the page warns unless the host says the work is saved** (with a host, `docs/hosting.md`): while a save is on its way ("Saving…"), before the host's first answer, after a failure, and now also when nothing listens through `onChange` (before, a host whose last answer was "Saved" counted even with nothing listening). The Download button's mark and the "changes not yet downloaded" note are read from the same rule and are as before: they rest while a listening host's saves have not failed, and so do not come and go with each save. The rule's three answers are `saved`, `saving` (the latest change not yet answered) and `unsaved` (no host, nothing listening, or a failed save): leaving warns unless `saved`, and the mark and the note show only on `unsaved`.
- **The renderer keeps its library in IndexedDB.** Everything it keeps in a browser (the list of booklets, each booklet's kept copy and base, the reader's preferences) is in one IndexedDB database of the site's, which holds what the browser allows a site (on a computer, hundreds of megabytes); local storage, used until now, holds about 5 MB. A large booklet, whose first keystroke used to fill local storage and switch saving off for the rest of the visit, is now kept, and found whole after a reload. The page reads the store once as it opens, before its first screen.
- **Nothing kept is lost by the move.** What an earlier release kept in local storage is copied into IndexedDB on the first visit, and removed from local storage only once the browser has confirmed the copy. A booklet changed after that both in IndexedDB and by an earlier release's tab still open (or a visit that could only use local storage) keeps the later change: its entry, kept copy and base together, by when each side last saved it. A browser that refuses IndexedDB keeps everything in local storage, as before, and "Your booklets" says so in one quiet line.
- **A notice that names the cause.** When the browser's storage is full, or fails, the page says that, and no longer says the browser is in private mode or blocks site data (that notice is now only for storage that is refused). The work stays for the visit, and the next change tries again; a removal goes first, so removing a booklet can make room.
- **Two tabs.** A tab reads what another tab kept since when it comes back into view, and before it opens a booklet, so it does not open an older copy; two tabs adding or changing different booklets keep both. A booklet open in two tabs at once is still saved by whichever tab changes it next, as before. "Your booklets" in one tab shows another tab's new booklet at once while it is in view, as before.
- **Several instances on one origin.** The renderer keeps its library in an IndexedDB database with a fixed name, `booklet`, and reads local storage through `key()` and `length` to move what earlier releases kept. A page that ran several instances on one origin by wrapping the renderer's `localStorage` calls must now also wrap the name given to `indexedDB.open` and local storage's `key()` and `length`, or give each instance its own origin.
- **"Your booklets" is drawn once on a page whose browser cannot tell whether its storage is kept** (no `navigator.storage`, as on an `http:` address that is not `localhost`): it no longer shows its "may clear" line twice, and no longer shows a host's notice twice.
- **"Send or save a copy" downloads at once.** The bar's button used to open a dialog whose only choice was "Download a copy"; it now downloads the booklet's `.md` file in one click. Nothing in a file changes.
- **The renderer follows section 8 where two `entries` blocks for one activity are read.** Entries are identified by their `ts`, and for a key both blocks hold the later wins; before, the renderer kept both entries side by side, so an entry a later block repeated showed twice. A key only one of the two holds is kept.
- **Browsers:** the renderer states the browsers it needs (those from 2023, Safari 16.4 and later; README) and carries no fallbacks for older ones. The message for a `daily` activity with no `repeat` reads "`daily` needs `repeat`" (before, "only follows"), as the linter's does.
- **Not carried over:** the design of a booklet kept before v0.3 (it opens without it, and it is lost at its first save), and the one-at-a-time and folding choices 0.13.0 kept for booklets started here, which all shared one key.

## Changes from v0.12

- **The words on a booklet line are inline Markdown** (section 4). A title, a question's help text, an option, an anchor, a matrix item and a menu entry draw emphasis, code, links and `$math$` wherever they appear; a button or a card shows a link as its words; a menu's text, a screen reader's label and the document title use the words without their marks. No real file draws differently (one title in 311 holds a mark, a lone `*`, which Markdown leaves alone).
- **The booklet's opening** (section 3). Prose before the file's first module or activity line is drawn on the home screen under the title, as a module's opening is drawn on the module's screen, and a heading that repeats the title is drawn once (a module's opening follows the same rule, comparing the words without their marks). A question line before the first module or activity line is reported and drawn nowhere. The reference renderer's own tagline under a booklet's title is gone.
- **`as: cards` draws a data block** (section 6): one card per row, reading the shared roles as the other views do (`label` the title, `note` under it, `badge`, `value`, `tone`, `link`, `icon`), its other fields the lines, and `group:` groups them. Every view now draws every source; the refusal and its exception are gone, and `cards` reads `label`.
- **A footnote's indented lines belong to its note** (section 6), as in GFM (a footnote is one paragraph: its first line and the indented lines straight after it), and **a citation with no italic title is a plain reference**, as section 6 always said.
- **A page's name is drawn above the page only when the page has no heading of its own** (section 3): a heading that follows a sentence is shown once, in place. A word typed into the feelings grid reads back as the word on a kept entry's card and in a query.
- **A reader writes back every record it read** (sections 8 and 12). Answers to a question it does not know or that the design no longer has, entries and drafts of any activity, and record blocks it does not read (`sync`, a kind a later version adds) or could not parse are kept as written; before, the first save deleted them. `sync`'s "not yet" mark in section 8 is gone; reading it stays unbuilt (section 13).
- **Bare activities are one module with no name** (sections 3, 4 and 8). Their records sit under the plain `> [!records]` line (`> [!records|<id>]` is still read when no module has that id), `parent:` places among them, and a bare activity may have the id of a module. Section 3's "refers to nothing else" is gone.
- **The first word after the bar is the id** (section 4). Every later word is a setting, and kinds that take no id (`row`, `notice`, `manifest`, `hint`, `solution`, `group`) take settings only. Before, a bare word the kind knew as a flag (`long`, `open`, `end`, `repeat`...) could not be an id. No id is reserved: `home` is an ordinary activity id.
- **A row closes with `> [!row|end]`** (sections 3 and 4). `> [!row end]` is no longer read; the linter says to write `> [!row|end]`.
- **The front matter's `version` is no module's notice** (sections 2 and 3). The front matter stands in for a notice through `license`, `copyright` and `source` only.
- **A link opens any title in its module** (section 3), as both tools already did: a heading, an activity's title, a page's name, a question's prompt or a callout's title.
- **A reference across a module boundary is reported, not refused** (sections 3, 6 and 12). The file opens, the reference draws nothing, and the linter still reports an error.
- **Any other front-matter key is kept as written and ignored** (section 2).
- **The manifest and the translation-sibling check are drafts** (section 13). `manifest` stays a kind that takes no settings.
- **Widget colours are colour names** (section 7). The hex pair `{ "tint", "deep" }` is no longer read; "tone" means `good`, `warn` or `bad` only.
- **`group` is a kind of Booklet's own** (sections 4 and 6): the plain fold.
- **Store booklets and the host hook** (the reference renderer and `docs/hosting.md`; no rule of `SPEC.md` changed, and no file changes).
  - A booklet opened from the page's store joins "Your booklets" at once, with no copy of its content. The browser keeps a copy only once the reader changes something, with a base beside it: the records of the file that copy came from.
  - Opening it again reads the store's file. The file is drawn when nothing changed in the browser since the base, or when the browser's copy and the file hold the same work. Otherwise the browser's copy opens, with "Read the newer file". While a file is read, the page says "Opening <name>…".
  - "Read the newer file" follows one rule, whether a link found the file or the host pushed it with `fileChanged`. It takes the file's body and merges the records against the base. A change made only in the browser stays. A change made only in the file is taken. A change made in both keeps the browser's, except that a removal in the browser gives way to a change in the file. With no host, the reader's own records stay as they are.
  - `onChange` gives `change`, a number naming the call. A host passes it back as `saved(change)` or `failed(message, change)`. An answer about an earlier change, or about another booklet, leaves the top bar alone. A `saved(change)` for the latest change tells the browser that the store now holds exactly those records. A host that names no change still works.
  - When a generator moves an activity to another module, the browser follows the move by the rule the box's store uses for its records lines. Work left under a module the new design no longer has is written back as records kept as written under its old records line (section 8).
  - Renaming a store booklet in "Your booklets" names it in the list only.
- **Wording only, across `SPEC.md` and `SKILL.md`.** No rule changed.
  - This list moved here from `SPEC.md`, which now states each rule once and keeps no history. Section 2 sets out the marker rule in full.
  - Section 3's data section is a list. Section 11's complete booklet ends with a `> [!data] Data` line, not a heading, and its citation sits under that line.
  - Section 12 names the reader conveniences outside conformance: the library, the host hook, one at a time, reading mode, the theme menu with Auto, and "draw the title once".
  - The examples in both files are neutral (a topic matrix, a clarity scale, an outdoors list, a menu of places).
  - The reference renderer's drawing notes moved to `README.md`.
  - `SKILL.md` teaches `solution`, lists the icon names, says what each title and heading does, and has a skeleton that lints clean.
  - The linter no longer explains the old `key=value` setting form, `--registry` is gone from its usage text (it is still ignored if given), and its `daily` message says "needs `repeat`".

The marker is `booklet: "0.13"`. A file marked `"0.12"` opens with a notice; change its marker to `"0.13"`, and write `> [!row|end]` where it has `> [!row end]`.

## Changes from v0.11

- **An activity may sit under another** (section 3): `parent:<id>`, with the meaning `parent` has on a list row. A module's activities become a tree.
- **A card's picture** (sections 3 and 4): `icon:` on a module or activity line, a name from Booklet's icon set (Lucide 1.48); otherwise a title's leading emoji; otherwise the card's number.
- **Two view roles, `link` and `icon`** (section 6), drawn by tables, lists, tiles and cards. A query has fourteen keys.
- **`style` in the theme block** (section 7): `teaching` or `briefing`.
- **A module's opening** (section 3): prose before a module's first activity is shown on the module's own screen.
- **A theme block with only `font`, `density` or `style`** (section 7) leaves the colours to the reader; before, it drew the Paper base.
- **A link to a whole module** (sections 3 and 10): `[[week-2.booklet]]` names the module `week-2`, opened if the booklet holds it, shown as not here if it doesn't.

The marker is `booklet: "0.12"`. A file marked `"0.11"` opens with a notice; change its marker to `"0.12"`.

## Changes in v0.11.12: drawing only

Nothing a file may say has changed: the marker stays `booklet: "0.11"`, and no file needs touching.

- **A folded hint and a folded solution right after a question** (section 6; one not folded with `-` stays a row of its own) are drawn inside that question's own block, not as rows of their own: a small control each, the hint first, as the author wrote them; shut, they give nothing away. A hint never opens by itself. A solution opens by itself under the reader's answer: for a `choice`, as soon as an option is picked; for a `multi`, when Check is pressed (only a question with a right answer, a `[x]` option, has Check). With a right answer it takes the good tone when the answer is right and the warn tone with "Look again" when it is not; a `choice` with no right answer opens in a neutral tone on a pick, and a `multi` with none opens only on request. Other question kinds open it on request only. (The reference renderer's drawing, not something a file says.)
- **A folded callout of no known kind** (section 6), such as a `group`, is drawn on plain paper with no tint and no picture of its own, and an untitled one is called "Note", as before; kinds the renderer knows keep their colour and picture. (The reference renderer's drawing, not something a file says.)
- **An activity's card** counts what is inside: its folded reads, its questions, and where the reader is ("3 reads · 6 questions · Not started").

## Changes in v0.11.11: wording only

Nothing a file may say has changed: the marker stays `booklet: "0.11"`, and no file needs touching.

- **Interface words** (reference renderer). The renderer's French and Spanish interface words for cards, the question stepper and callout kinds were checked and replaced. This is no change to the format.

## Changes in v0.11.10: wording only

Nothing a file may say has changed: the marker stays `booklet: "0.11"`, and no file needs touching.

- **A page that draws a data block** (section 6). The sentence "A page that draws a data block is not a reading-only page: it stays open, not folded into sections." is deleted. A reading page's sections fold on any page, whatever else the page holds: questions, data views, kept entries.
- **A folded callout** (section 6). A callout folded with `-` shows the first words of its text under its title, as a folded section does. A `hint` or `solution` shows nothing but its name while it is shut, so a closed one gives nothing away. (Both are the reference renderer's drawing, not something a file says.)

## Changes in v0.11.9: wording only

Nothing a file may say has changed: the marker stays `booklet: "0.11"`, and no file needs touching.

- **Callouts** (section 6). A renderer draws each kind in its own colour and picture; a kind it does not know is drawn as `note` is.

## Changes in v0.11.8: wording only

Nothing a file may say has changed: the marker stays `booklet: "0.11"`, and no file needs touching.

- **Fonts** (section 7). A theme names a family, never a font file; a renderer may carry a family inside itself, and nothing is fetched. The reference renderer now carries Atkinson Hyperlegible and Lexend as data inside its file, and draws headings in Lexend over body text in Atkinson Hyperlegible unless the theme's `font` says otherwise.

## Changes in v0.11.4: wording only

Nothing a file may say has changed: the marker stays `booklet: "0.11"`, and no file needs touching.

- **When a `$` is a price** (section 10). The rule the reference renderer follows is now written down, with the advice to write a price in prose as `\$5`.
- **A footnote with no title and quote** (section 6). It is a plain reference, drawn as written; the panel no longer says its source is missing.
- **An activity's card** shows its first paragraph under its title, read as inline Markdown as a module card's blurb is, and the title alone when the activity has none. A reading page folds into sections page by page, not activity by activity: a page with a question or a data view is drawn open, whatever the pages beside it hold. (Both are the reference renderer's drawing, not something a file says.)

## Changes in v0.11.3: wording only

Nothing a file may say has changed: the marker stays `booklet: "0.11"`, and no file needs touching.

- **Images** (sections 6, 10 and 13). A renderer fetches an image only from a place its own host declares, never from an address a file names directly. This replaces the wording that no renderer ever fetches an image.
- **Diagrams** (section 6). The paragraph is cut to its rule: a renderer must not let a diagram library request an address a diagram's source names, and may refuse to draw such a diagram, showing its source instead. What the reference renderer refuses, and why, is now in `README.md`.

## Changes from v0.10

- **Another `0.x` marker opens, with a notice** (sections 2 and 12). A file marked `booklet: 0.9`, `0.10` or `0.12` is no longer refused: a reader opens it by its own rules, says so first among the file's problems, and promises nothing about what it draws. A file with no marker, or a marker that is not a `0.x` version, is still refused. The marker a file came with is saved back unchanged. The linter warns on another `0.x` marker and checks the file as 0.11.
- **A renderer fetches no image** (sections 6 and 12). A remote or relative image address is never requested; the reference renderer shows the alt text and the address as text. The linter warns on a remote address and errors on any other scheme. A diagram whose source could make a renderer ask for an address (an image or icon node, a `url(…)` style, a directive or front matter, an HTML tag in a label) is shown as its source and not drawn.
- **A booklet of one activity or one module opens into it** (section 2). `start: home` in the front matter keeps the home screen. Any other value of `start` is a linter error.
- A module card's blurb reads the first paragraph as inline Markdown, so `snake_case` keeps its underscore and a formula or an image is its text.

## Changes in v0.10.1

Wording only: nothing a file can say has changed, the marker stayed `booklet: "0.10"`, and no file needed touching.

- Section 9 said `lang` "is the language the content is written in". That is true of a module's own file and was wrong for a booklet, which may hold modules in several languages. A booklet's `lang` sets the language of the renderer's own words and defaults, and says nothing about its modules.

## Changes from v0.9

- **The marker is `booklet: "0.10"`, and it is written in quotes** (section 2). `0.10` is not the number 0.1, so a version is read as text and compared as two whole numbers, major and minor, and a file writes it quoted so a YAML tool does not read it as 0.1. A file marked `booklet: 0.9`, or `0.1`, is refused as an old format; the linter warns on an unquoted `0.10`.
- **A module carries its notice** (section 3). A `> [!notice]` callout inside a module's fence holds `license`, `copyright`, `source` and `version`. A file that holds one module and no callout is covered by its own front matter, so no module file has to be rewritten. Add a module writes the callout into the booklet, and the renderer shows it in a quiet "About this module" disclosure. `notice` is added to the table of settings (none).
- **Data at the end can belong to a module** (sections 3, 4, 7, 10 and 12). `> [!data|module-id]` opens a data section that is that module's, as `> [!records|module-id]` does for records; a reference is looked up in the module's fence, then its data section, then the shared data section. Add a module puts what it brings under the module's own data line, and an update replaces exactly the module's fence and that section; the old rule, which guessed which shared blocks were the old module's, is gone. A `module` or `activity` line now ends a data section.
- **A booklet has one name** (section 2): the `title:` in its own front matter, shown everywhere, written from the first moment a booklet is started, and renameable by the reader. A module file's title names the module and never the booklet. A file with valid front matter and no module and no activity is an empty booklet with that name: a renderer opens it (the home screen, with Add a module), and the linter accepts it with a warning that it holds nothing yet. As a module to add, it still holds no module.

## Changes from v0.8

- **An id belongs to its module** (section 4). Activity, question, widget-line, menu, block and footnote ids are unique within their module, no longer across the file. Module ids are unique within the file. Bare activities are one module with no name, and the data section is shared: a reference is looked up in its own module, then in the data section, never in another module's fence. A file whose ids were unique across the file under v0.8 is still valid.
- **Records are read by module** (sections 3 and 8). The module id on a records line says whose the record blocks below it are, so one question id in two modules holds two answers, and one activity id in two modules keeps two sets of entries. Both parts of section 13 that said the reference renderer did not do this are gone.
- **A reference stays in its module** (sections 3, 4 and 7). An embed, a `menu:`, a query's `from:` and a footnote mark are found in their own module and then in the data section. A data block's id may not also be a question's or an activity's within one module.
- **Obsidian and GitHub** (section 10): they resolve a block embed and a footnote across the whole file, so a file with two modules that share a block id or a footnote id shows the first one's for both there. A tool that composes modules may rename a clashing block id or footnote id with the module's id as a prefix (the reference renderer's Add a module does); the linter warns about such an id.
- **Heading links stay in their module** (section 3): `[[#Heading]]` and `](#slug)` are looked for in the link's own module, as every other reference is. A heading that only another module has no longer resolves; it is plain text, and the linter warns.
- **Conformance** (section 12): a reader refuses an id used twice in one module, and a module id used twice in one file; it no longer refuses an id two modules share.
- The marker is `booklet: 0.9`. A file marked `booklet: 0.8` is refused; change the marker to 0.9.

## Changes from v0.7

- **`open` works** on `choice` and `multi` (section 5): the reader adds an option of their own, stored as the words they wrote, and offered again in an activity that keeps entries. `open` on any other kind is an error.
- **`[x]` is shown** (section 5): once the reader has answered, a `choice` marks the picked option right or not and shows the correct one; a `multi` has a Check button. Nothing is scored or stored.
- **Settings are checked** (section 4): one table of what each kind takes. A setting a kind does not take (`mx:5` for `max:5`), `daily` without `repeat`, and a `min:`, `max:` or `step:` that is not a number are errors in the linter; a renderer reports them and ignores them. `date` no longer takes `min:` or `max:`.
- **An unknown kind says so** (section 4): a line with an id or settings whose kind is not defined is drawn as a callout with a quiet notice, and reported.
- **A file's problems are shown when it opens** (section 12): a file the format says to refuse does not open, and its messages are shown; any other problem is reported in a notice that says how many things could not be read.
- A menu's id must be unique like any other id (two menus with one id in different modules are refused), and a data block's id may not also be a question's or an activity's.
- **YAML is gone from widget blocks** (section 7): JSON only, as in a data block. The `card-board` widget engine is removed. A widget's data has no `showTags` and no `"title"` key (the title is on the widget line); neither was ever read. A file's values are plain strings: an object keyed by language, such as `{ "en": …, "fr": … }`, is no longer read.
- `limit:` is a positive whole number; an unknown query key is reported; a `label:` naming a field no row carries draws no label; a view's `tone` is read exactly as written (`Good` is not `good`).
- `lang` may be any well-formed language tag, and a file with no `lang` is reported. A `booklet module` fence is no longer accepted (it was a leftover of an earlier format): it is reported like any unknown fence. A marker may be quoted with either kind of quotation mark (`booklet: "0.10"`).
- Section 6 now states rules the renderer already followed (a list's extras, a table's fields, `from:` a single question, nested lists, an id shared by a data block and a question), section 7 lists the data each widget engine reads, and section 10 lists the Markdown the reference renderer draws. A "kind" is never a "type", and an activity's `repeat` is a setting. Things the reference renderer does not do yet are marked where they are described and listed in section 13.
- The marker is `booklet: 0.8`.
- A file marked `booklet: 0.7` is refused; change the marker to 0.8.

## Changes from v0.6

- **Roles are shared by every view** (section 6): `label`, `value`, `note`, `badge` and `tone`, each read from the field of the same name unless the query names another. Every view draws a row from the same five parts, and a table of views says which keys each one reads.
- `title:` is now `label:`, and `newest:` is now `limit:`.
- `badge:` is added: a short word drawn as a pill, several pills when it is a list.
- `parent:` is added: the field that holds the `id` of the row a row sits under, so a list of rows can nest.
- Tiles with no value are drawn as pills: a status strip.
- `fields:` has one meaning everywhere: the other fields to show (a table's columns, a list row's quieter extras, a line chart's lines, a card's questions).
- A reader's theme pick replaces a booklet's colours only; its `font` and `density` still apply, and `density` now sizes the views as well as the prose.
- A renderer may let the reader sort and filter the rows of any view, with one control, saved nowhere.
- The marker is `booklet: 0.7`.
- A file marked `booklet: 0.6` is refused; change the marker to 0.7, and in a query change `title:` to `label:` and `newest:` to `limit:`.

## Changes from v0.5

- Two **chart views** are added to the `booklet query` block (section 6): `as: bars` and `as: line`, drawn from a data block's rows or from kept entries. Nothing is computed: the rows arrive finished.
- The marker is `booklet: 0.6`.
- A file marked `booklet: 0.5` is refused; change the marker to 0.6 (nothing else in a 0.5 file needs to change).

## Changes from v0.4

- A **theme block** is added (section 7): a base theme, up to six colours, a font family and a density, each a strict named value, never CSS. The renderer works out every other colour and keeps the base theme's for any pair that would fall under 4.5 to 1.
- **Rows** are added (section 3): `> [!row]` … `> [!row end]` lays cells side by side when there is room.
- **Tone names for widget colours** (section 7): `warm`, `green`, `amber`, `slate`, `teal`, drawn in the active theme's colours. Hex pairs are still read.
- The marker is `booklet: 0.5`.
- A file marked `booklet: 0.4` is refused; change the marker to 0.5 (nothing else in a 0.4 file needs to change).

## Changes from v0.3

- `booklet data` blocks are added (section 7): rows a generator wrote, saved back exactly as found.
- The `booklet query` block can draw a data block, and takes `as:` (`cards`, `table`, `list`, `tiles`), `group:`, `limit:`, `title:`, `value:`, `label:`, `note:` and `tone:` (section 6). Kept entries can be drawn as a table, list or tiles too.
- The marker is `booklet: 0.4`.
- A file marked `booklet: 0.3` is refused; change the marker to 0.4 (nothing else in a 0.3 file needs to change).

## Changes from v0.2

- Callout settings are written `key:value` (`min:0`, not `min=0`).
- `of=` is removed.
- The `pinned` activity flag is removed.
- The locked-file envelope is removed.
- The `booklet query` block is added (section 6).
- The `svg-regions` figure contract is stated: `class="rg"` plus `data-r` on each tappable region.
- A file saying `booklet: 0.2` is refused; update it, then change the marker to `0.4`.
