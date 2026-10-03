---
name: booklet
description: "Create a valid, well-made booklet (a *.booklet.md file in the open Booklet format for learning and reflection activities) from a plain request such as a journal, a study set, a quiz or a habit tracker, in English, Spanish or French. Use when asked to make, extend, translate or check a booklet or a booklet module."
---

# Making a booklet

**Skill version: 0.4.0** — matches the project's current version (SPEC.md's
"project v0.4") now that this skill teaches v0.4, the current format.

A **booklet** is one Markdown file, named `<slug>.booklet.md`, that holds a
person's work *and* the design of the activities they do in it. Above a long
horizontal rule, it is ordinary Markdown a person reads and edits in any text
editor; below it, in a records section a renderer wrote and a person leaves
alone, the same file keeps what was answered. A renderer (the Booklet page,
`booklet.html`) draws the activities from the file, and the person's answers
are saved back into the same file. This skill turns a plain request into such
a file with nothing else to hand. `SPEC.md` in the Booklet repository is the
full format; you should not need it, but section 11 below points at it for
anything this skill does not cover.

**Hard rules.** Break one and the file is invalid, or it looks valid and
misbehaves:

1. Everything is addressed by **id, never by position**. Ids are permanent,
   and hold only letters, digits and dashes.
2. A booklet's design is **callout lines and prose, never JSON** — a booklet
   with nothing answered yet contains no JSON at all. JSON exists only for a
   widget's own data and for the app's own record of what was answered, both
   fenced and both explained below.
3. A module is fenced (`> [!module|id] Title` … `> [!module|id end] Title`),
   and holds **one activity, or several**, each opened by its own
   `> [!activity|id …] Title` line. There is no separate `mode`/`activities`
   choice to make — every activity is written the same way.
4. **Pages are a horizontal rule** (`***`), never a separate key. A short
   activity needs no rule at all.
5. **One language per file.** Nothing here is written per-language; a
   translation, if one is wanted, is a sibling file (section 8).
6. You write the design only. **Never write answers, kept entries, names or
   emails.** Those live in the records section, which only the renderer
   writes, wrapped in `%% … %%` so Obsidian's Reading view hides it.
7. It is a **learning format, not a clinical tool** (see section 2).

---

## 1. What is in the file

Booklet > modules > activities > (pages, by a rule) > booklet lines and prose.

- A **module** is what a person adds or removes as a unit — the whole fence,
  `> [!module|id] Title` to `> [!module|id end] Title`.
- An **activity** is one thing a person does and keeps. `repeat` after its id
  keeps each completion as a dated entry; `repeat daily` keeps one entry per
  day, replacing today's on a second finalize; with neither, the activity is
  answered once and edited in place, with one current answer and no history.
- **Pages** split one long activity into steps. Any thematic break
  (`***`, on its own line) inside an activity is a page break; a page with no
  break is one page. ⚠️ Use `***`, not `---`: a bare `---` right under a line
  of text is read by Markdown as that line's heading instead.
- **Booklet lines** (`> [!kind|id …] Title`) are everything Booklet needs to
  know about: an activity, a question, a widget. Everything else — headings,
  paragraphs, lists, a citation mark — is ordinary Markdown, read as prose.

The file has three parts, in order:

| Part | Holds | Who writes it |
| --- | --- | --- |
| **Front matter** (`---` on line 1) | `booklet: 0.4`, `id`, `title`, `lang`, `version` | you |
| **Design** (everything above the records) | the readable prose, and every `> [!…]` line and its fenced data | you; unchanged once you save it — the renderer never rewrites your design |
| **Records** (inside `%% … %%`, at the end) | what was answered, fenced and grouped by module | the renderer only; a fresh file has none at all |

**Never invent or edit:** kept entries or answers, a `sync` record, `rights`
terms nobody gave you, a kind or engine not listed here. When changing an
existing booklet, edit only the design above the rule, keep every id exactly
as it was, and never touch anything inside `%% … %%`.

---

## 2. Scope and safety

Booklet is a **consumer format for learning, study, habits and reflection.
It is not a clinical tool.**

- **Do not write** diagnosis, screening, symptom or mood scores, treatment or
  therapy exercises, medication advice, safety plans or crisis handling.
- **Do not ask for** identifying information (full name, address, phone,
  school or employer, ID numbers, date of birth) or health information
  (symptoms, conditions, diagnoses, medication, weight or other body
  measures).
- **Open questions about the day are fine** ("What went well?", "What was
  hard?"). Mood ratings, feelings checklists and symptom questions are not.
- **Keep the tone plain and kind.** Short sentences, second person. No
  scores, streaks, grades or shaming. Skipping is always allowed, and the
  opening line of prose says so.
- **Wellness habits** (water, sleep, walking) are fine as a plain log of what
  happened, counts included ("How many glasses today?"). Do not set targets,
  prescribe amounts or give health advice; if an amount matters, say it is
  worth asking a professional.
- **Study content must be correct.** Keep readings short, write them
  yourself (do not paste copyrighted text), and say in your reply if anything
  is uncertain.
- **If the request is clinical** (for example "a symptom tracker for my
  clients" or "a CBT worksheet for panic attacks"), do not build it. Say
  plainly that Booklet is not a clinical tool, and offer a non-clinical
  version (a general reflection journal, a study set about the topic, a habit
  log) for the requester to choose.

---

## 3. Procedure

**Step 1. Ask the few questions that matter**, in one message. If you cannot
ask (no one will answer, or none comes), use the defaults and list them as
assumptions in your reply.

| Ask | Default |
| --- | --- |
| Who is it for (age, level)? | an adult or older teen, plain language; a language learner is a beginner to intermediate |
| Which one language should it be written in? | the one the request asks for, else the one it is written in; for a language learner, the language being learned; Spanish is neutral `es` unless Argentina is named |
| What should be **kept** (answered each time) and what just **read**? | questions are kept; readings stay readings |
| How long, and how often? | 5 to 10 minutes; once a day for journals and trackers |

If the requester may want **another language later**, write only the one
asked for now, and tell them a translation is a sibling file (section 8).

**Step 2. Decide the structure, top down: modules, then activities, then
pages, then booklet lines.**

| Decision | Rule |
| --- | --- |
| How many **modules**? | One, unless the parts are independent and a person might want one without the other (a journal and a separate tracker). |
| How many **activities**? | One per thing done in one sitting and kept as one entry. Parts done at different times (a daily log and a weekly review) are separate activities. |
| Which **flag**? | `repeat` for anything with a dated history. `repeat daily` for once a day, replacing today's entry on a second finalize. No flag for reading, or for a question with one current answer and no history. |
| `blocks` or a page break? | No break: one scrolling page, enough for up to about seven lines. A break (`***`): one sitting with distinct steps (read, then answer, then review), 2 to 4 pages. |
| Which **lines**? | Open with a line or two of plain prose: what to do, roughly how long, and that anything can be skipped. On a page that asks questions, 3 to 6 of them, mostly `text` (section 6). |

A **quiz** has no scoring and no multiple choice with a visible answer key —
v0.4 has no way yet to fold a block away for the reader to check
themselves (section 6 says what to do instead: put the answer in ordinary
prose after the question, or on the next page). A **matching** quiz lists the
options in prose (a word bank, in a different order from the questions), then
asks one `text` question per item. A **review** asks the person to recall or
explain in their own words, and what they would look at again. A **tracker**
is a `repeat daily` activity with a few short questions. For **language
learners**, use simple words and short sentences, and give an example answer
in the hint line under the question.

**Step 3. Write the file**, from the skeleton in section 4, as
`<slug>.booklet.md` (slug: the title in lowercase ASCII words joined by
hyphens, accents dropped: `registro-de-agua`).

**Step 4. Validate** (section 9) and fix until clean.

**Step 5. Reply** with: the file path; the structure in a line (modules,
activities, pages); the assumptions you made; the lint result; and how to
open it (load the file in the Booklet renderer, `booklet.html`).

---

## 4. The file skeleton

Copy this exactly and fill in the `<…>` parts.

````markdown
---
booklet: 0.4
id: "local/<booklet-slug>"
title: "<Booklet title>"
lang: <en|es|es-AR|fr>
version: "0.1"
status: draft
---

# <Booklet title>

<One or two plain sentences: what this booklet is for.>

> [!module|<module-slug>] <Booklet title>

<One line inside the module fence: this becomes its blurb if the module is ever offered from a registry.>

> [!activity|<act-id>] <Activity title>

<One or two sentences of plain prose: what to do, and that skipping is fine.>

<one booklet line per question — section 6>

> [!module|<module-slug> end] End of <Booklet title>
````

- **`status: draft`** is right for anything an AI wrote. The linter does not
  check this field for an ordinary booklet — it is a convention, not an
  enforced rule — but the `booklet-registry` repository, where modules are
  published, offers only `approved` modules, so a draft stays out until a
  person changes it to `approved` after reviewing.
- **`id`** is `local/<booklet-slug>` (or `<namespace>/<slug>` if the
  requester has one). It names the booklet across any future translation or
  version; it is not the module's own callout id (below).
- **`lang`** is the one language the whole file is written in. There is no
  `languages` list: one file, one language, always.
- The readable half above the module fence holds only `# Title` and plain
  paragraphs. Do not add a `##` heading there that looks like part of the
  design — a heading is fine as ordinary reading, it just carries no
  structure of its own (headings never mean anything to the renderer).

---

## 5. Modules and activities

```markdown
> [!module|<module-slug>] Shown nowhere but this file's own manifest

Optional: one short paragraph here becomes the module's blurb, if it is
ever offered from a registry.

> [!activity|<act-id>] Shown on the home card
```

- The **module's id** (after `|`) is letters, digits and dashes only —
  `daily-journal`, not `daily_journal` or `Daily Journal`. It is unique
  across a person's whole collection: adding a module whose id already
  exists replaces the old one.
- The **module's title** (after the id) is the words after the `]` on the
  same line — this is what shows on the home card, exactly as written, no
  further wording needed anywhere.
- **A bare activity needs no module fence at all.** A file with no
  `> [!module|…]` line is bare activities only — fine for a one-off
  worksheet with a single activity.
- **Several activities that belong together** (a study week) share one
  module fence; each still opens with its own `> [!activity|…]` line.
- **An activity's id** is a short prefix plus a name (`aw-notes`, `tw-learn`):
  lowercase letters, digits, dashes; unique across the **whole booklet**,
  every module included. Never `home` — the renderer uses that name itself.
- **Flags** (after the id, space-separated): `repeat` (kept as a dated
  entry), `repeat daily` (one entry per day), `hidden` (kept in the file, not
  offered). With none of these, the activity is answered once and edited in
  place.

An activity with pages (a page is a step; the answers of all its pages are
kept together as one entry):

```markdown
> [!activity|rd-tides repeat] Read and check

> [!text|noticed] What surprised you?

***

> [!choice|biggest] When are the biggest tides?
- [ ] At the quarter moons
- [ ] Near the new and the full moon
```

Everything from the activity line up to the next `***`, activity line, or
module-close line is page one; everything after the `***` is page two, and so
on. A page's own name in the reader's page menu is its first heading, if it
has one — write one (`## Check yourself`) if you want the page named;
otherwise it is just "Page 2".

---

## 6. Booklet lines: the questions

A booklet line is `> [!kind|id …] Title`. The **title is the question
itself** — there is no separate wording lookup, unlike in an older version of
this format. A **hint**, if you want one, is a continuation line right under
it, each starting with `>`, no blank line between:

```markdown
> [!text|noticed] What did you notice?
> One thing is enough: a sound, a colour, a smell.
```

| kind | Use it for | Needs under it |
| --- | --- | --- |
| `text` | a written answer | nothing; `long` after the id for a bigger box |
| `lines` | repeated one-line notes | nothing; stores under its own id, like any other question — an activity may have more than one |
| `choice` | pick one | a task list, `- [ ] Option` |
| `multi` | pick any number | a task list; add `open` after the id to let the reader add their own |
| `scale` | a numbered scale | a numbered list of anchors, starting at whatever number you want the scale to start at (usually `0.`) |
| `matrix` | several items on one shared scale (a symptom questionnaire) | a bulleted list of items, then a numbered list of anchors |
| `number` | a number | nothing; `min:`, `max:`, `step:` after the id |
| `date` | a date | nothing |
| `widget` | a drawing engine (body map, grid, cards) | an embed of the widget's data — section 8, and never invent one |

```markdown
> [!choice|biggest] When are the biggest tides?
- [ ] At the quarter moons
- [ ] Near the new and the full moon
```
```markdown
> [!multi|felt open] What did you feel? Add your own.
- [ ] Calm
- [ ] Tired
```
```markdown
> [!scale|mood] How was today?

0. Awful
1. Rough
2. Fine
3. Good
```
```markdown
> [!matrix|phq] Over the last two weeks, how often have you been bothered by…

- Little interest or pleasure in doing things
- Feeling down, depressed, or hopeless

0. Not at all
1. Several days
2. More than half the days
3. Nearly every day
```
```markdown
> [!number|sleep min:0 max:24] Hours slept
```

**A list used by several questions is written once, as a menu.** Put a
`menu` line and its bulleted list anywhere in the file (inside the module is
best, so the module travels whole), and name it on each question with
`menu:<id>`. The question has no list of its own; `open` still works. The menu
itself is never shown.

```markdown
> [!menu|feelings]
- Calm
- Tired
- Curious

> [!multi|morning menu:feelings open] This morning I felt…

> [!choice|evening menu:feelings] This evening I feel…
```

- **A `choice`, `scale` or `matrix` question's options or anchors need a blank line
  above them**, unless the list starts at `1.` — Markdown only lets a list
  starting at `1.` interrupt a paragraph directly; anything else (including
  `0.`, which most scales want) is swallowed into the question's title
  without that blank line.
- **A `choice`'s options are identified by position, not text.** The second
  option is always the second option; if you ever add or remove one, treat
  the question as a new one with a new id, since existing answers point at a
  position.
- **Nothing folds a question away.** v0.4 has no working equivalent of
  an older version's "optional questions, folded shut until opened." If a
  request calls for that (a quiz's answer key, "a couple more if you want
  them"), the honest options are: put the extra material as ordinary prose
  right after the question it answers, put it on its own page after a
  `***`, or say in your reply that folding isn't available yet and ask
  whether the requester wants it unfolded instead.
- **Nothing reads another activity's answers yet.** v0.4 has no kind that
  draws a list of options pulled live from a different activity's own
  answers, or a tick-list of what was actually done from it (`SPEC.md`
  §13). If a request needs this, say so plainly and offer a plain `text` or
  `lines` question instead, in the same activity.
- **A `matrix`'s answer is one anchor number per item, by position.** Items
  are identified by position like a `choice`'s options, and a matrix's
  anchor numbers must not repeat. Give it a title that reads as the stem
  ("Over the last two weeks, how often have you been bothered by…") and one
  short phrase per item.

---

## 7. Reading: prose, headings, quotes and citations

Everything that is not a booklet line is ordinary Markdown, read exactly as
written: `# `/`## ` headings, paragraphs, **bold**, lists, and a blank line
between paragraphs (`\n\n`) for a new one.

- **A pull-quote or a note set apart** is an Obsidian-style callout:
  `> [!note] …`, `> [!tip] …`, `> [!warning] …`, or Booklet's own `diff`
  (where a guide differs from this reading), `law` (a rule as it stands) or
  `opinion` (an author's view). `> [!group]- Title` folds reading content
  shut until opened — fine for background material nobody has to read, never
  for a question (section 6).
- **A citation is an ordinary footnote** — `[^id]` in the text, and its
  definition anywhere in the file:

  ```markdown
  Most harbours see two high tides a day.[^atlas-12]

  [^atlas-12]: *The Harbour Tide Atlas*, 2nd edition (2019), p. 12: "The tide rises and falls twice in each lunar day." Verified 2026-09-20.
  ```

  Write the note as *Title* (italic), then optionally an edition or detail,
  then the page, then the quote **in quotation marks, copied word for word**,
  then optionally `Verified YYYY-MM-DD.` if a person actually checked it.
  The renderer reads that shape into the same numbered mark and side panel
  an older version's citation panel drew — no separate registry to write.
  **Never invent a citation.** Cite only a document the requester gave you,
  quoted exactly; leave off `Verified` unless someone actually checked it.
  With no document to hand, write plain reading with no citations at all.
- **A link to another activity** is an ordinary heading link: `[[#Log a moment]]` (or `[[#Log a moment|go on]]`) or `[Log a moment](#log-a-moment)`. It opens the activity holding that heading (an activity's own title counts) on the right page; the linter warns when no heading in the file matches.
- **Showing what was kept** — a `booklet query` block, in the prose of one
  activity, shows what the reader kept in another activity **of the same
  module**. It is read-only and takes no answer. The kind goes on the fence
  line and every setting is a `key: value` line:

  ````markdown
  ```booklet query
  from: log
  fields: situation, ease
  newest: 3
  empty: Nothing logged yet.
  ```
  ````

  `from:` is required: an activity that is `repeat` or `repeat daily` (its
  kept entries, newest first), or one question's id (its answers).
  `fields:`, `newest:` and `empty:` are optional. Never point it at another
  module, and never write anything else in the block. In Obsidian without a
  plugin it shows as a plain code block, so say in the prose above it what it
  will show.
- **A report page from data** — numbers that something else already worked out
  (counts, due dates, a status per item) go in a `booklet data` block: JSON,
  an object with `rows` (flat objects: a string, number, `true`, `false`, or a
  list of those) and optionally `fields` (each key's label, which is also the
  column order), with a `^id` on the line after the fence. Put it inside the
  module or in the data section at the end. A `booklet query` then draws it
  with `as:` set to `table` (the default), `list` or `tiles`. **Write the rows
  already ordered and counted: nothing is sorted, filtered or added up when
  the page is drawn.** One example of each view:

  ````markdown
  ```booklet query
  from: status
  as: tiles
  value: count
  label: what
  tone: tone
  ```

  ```booklet query
  from: jobs
  as: list
  group: when
  fields: where
  limit: 10
  ```

  ```booklet query
  from: jobs
  as: table
  fields: task, when, where
  ```

  ```booklet data
  { "fields": { "task": "Job", "when": "When", "where": "Where" },
    "rows": [ { "task": "Mend the gate", "when": "This week", "where": "Fence" } ] }
  ```
  ^jobs
  ````

  `tiles` read `value`, `label`, optional `note` and `tone` (`good`, `warn` or
  `bad`) by those field names unless `value:`, `label:`, `note:`, `tone:` name
  others. `list` shows each row's `title` (or `title:`'s field, or else the
  first field), then the `fields:`. `group:` gathers rows under a field's
  value, in the order they first appear. All text is plain: no Markdown or HTML
  in a value. A page that draws data stays open, it is not folded as a report is.
- **An image** is reference style, with its address at the end of the file:
  `![The harbour at low water][harbour]` and, near the other data,
  `[harbour]: images/harbour.jpg`. Only a real, requester-supplied `https`
  address — never embedded data, never a placeholder URL.

- **A report** (something generated or written to be read, not answered) needs
  only front matter (`booklet: 0.4`, `id`, `title`, `lang`) and plain Markdown:
  no activity line is needed, the file is one activity named by the title. Give it
  a title heading, then `##` headings for its sections. The renderer folds a
  reading-only activity: each section shows its heading and the **first paragraph
  under it**, so make that paragraph a one-sentence statement of the section. Put
  notes to yourself in `<!-- … -->`; they are not shown.

---

## 8. Widgets, languages, and the file name

**Widgets.** A `widget` line draws with data for one of the renderer's three
engines — `svg-regions` (clickable figures), `grid-select` (a grid of words),
`card-board` (cards) — embedded right in the file:

````markdown
> [!widget|grid] Effort and impact
> ![[#^effort-impact]]

```booklet widget
{ "engine": "grid-select", "title": "Effort and impact",
  "axes": { "top": "more effort", "bottom": "less effort", "left": "less payoff", "right": "more payoff" },
  "cells": [ { "id": "quickwin", "label": "Quick win", "note": "Cheap and worth it." } ],
  "items": [ { "id": "reply", "cell": "quickwin", "label": "Send the one-line reply" } ] }
```
^effort-impact
````

**Do not invent a widget or an engine.** Copy one whole, unchanged in shape,
from an existing module in the `booklet-registry` repository's `modules/`
(they carry their own widgets inline) — only the wording inside it is yours to
translate or reword, never its `engine` or its structure. A new engine is a
change to the renderer, not to a booklet. Without a widget file to copy,
build the activity from `text`/`choice`/etc. instead.

**Languages.** Every booklet is written in exactly one:

| Tag | Language | Notes |
| --- | --- | --- |
| `en` | English | |
| `es` | Spanish, neutral Latin American | use `tú` |
| `es-AR` | Argentine Spanish | use `vos` throughout, not `tú` |
| `fr` | French | use `vous`; a space before `? ! : ;` |

- **A translation is a sibling file**, `<slug>.<lang>.booklet.md`, with the
  same `id`, the same module and activity ids, and — for a `choice`,
  `multi` or `scale` — the same number of options or anchors, **in the same
  order**, so answers carry across the sibling files unchanged. Write each
  language as a native speaker would, not word for word: natural phrasing,
  local examples, the language's own punctuation (`¿…?`, `¡…!`).
- **Flag your non-native writing.** In your reply, if you wrote in a
  language other than the one the request was written in, say so and name
  it as needing a native speaker's check; leave `status: draft`.
- Region spellings are `es-AR`, `fr-CA` (lowercase language, uppercase
  region). Other languages (`de`, `pt`, …) are refused by the linter.
- **A module for the `booklet-registry` repository is one language too**
  — the same rule as any other booklet now, not the three-language
  requirement an older version of this document described.

**File name.** `<slug>.booklet.md`, from the booklet's title, dropped-accent
lowercase words joined by hyphens. A reader also accepts a plain `.md`.

---

## 9. Validation

**With the linter:** `python3 lint-booklet.py <slug>.booklet.md`. It prints
`ERROR` and `warn` lines and a summary, and exits 1 on any error. Done means
**0 errors**, and the only warning is the `draft` one.

| Mistake | The linter says | Fix |
| --- | --- | --- |
| no `lang:` | `front matter has no `lang:` — a v0.4 file is written in one language` | add it |
| bad language tag | `front matter `lang: de`: 'de' is a language the renderer has no interface table for …` | use en, es, es-AR or fr |
| region spelled wrong | `'fr-ca' is not spelled the way a tag is: lowercase language, uppercase region (es-AR)` | `fr-CA` |
| a module opened twice | `'x' opens before 'y' (line N) is closed` | close the first module before opening another |
| a module never closed | `the module 'x' is opened and never closed` | add its `> [!module|x end]` line |
| closing the wrong module | `this closes 'y', but 'x' is open` | close the one that is actually open |
| an id reused | `the id 'x' is also used on line N` | rename one — module, activity and question ids all share one namespace-per-file check |
| an id with bad characters | `the id 'my id!' may hold only letters, digits and dashes` | rename it |
| a question with no id | `this text question has no id, so its answer would have nowhere to go` | add one, `[!text|id] …` |
| a `choice`/`multi` with no options | (the question renders with nothing under it) | add a task list, `- [ ] Option`, with a blank line above unless it starts at `1.` |
| a widget with no data | `the widget 'x' names no data block (write ![[#^its-id]] under the line)` | add the embed line and the fenced `booklet widget` block |
| a widget block that is not valid JSON | `the `booklet widget` block is not valid JSON (…, its line N)` | fix the comma or quote at that position |
| a widget with a `<script>` in a figure | `the widget ^x has script (event handler onclick) in a figure — a figure is a drawing, never a program` | remove it; a figure is markup, never a program |
| a numbered list not starting at 1 | `a numbered list that does not start at 1 needs a blank line above it, or Markdown reads it as part of the question's title` | add the blank line |
| a `>` embed pointing at nothing | `![[#^x]] points at no block in this file` | fix the id, or add the fenced block |
| an embed pointing at the wrong fence | `^x is not a widget block` | point the embed at the actual `booklet widget` fence |
| a data block with no `^id`, a nested value, or no rows | `a data block needs a ^id` / `has a nested value in 'x'` / `holds no list of rows` | add the id; flatten the value; write `rows` |
| a query with a bad `as:` or `limit:` | `the query's `as: x` is not one of cards, table, list, tiles` / `must be a positive whole number` | use one of the four views; a whole number from 1 |
| a query with a bad `from:` | `the query's `from: x` names no activity, question or data block in this file` (or `is in another module`, or `keeps no entries`) | name an activity that is `repeat`, a question, or a `booklet data` block, in the same module |
| a `menu:` naming no menu | `` `menu:x` names no menu in this file`` | write the `> [!menu|x]` line and its bulleted list, or fix the id |
| a `menu:` and a list of its own | `the question 'x' has both `menu:y` and a list of its own` | keep one |
| a matrix with no items or anchors, or repeated anchor numbers | `the matrix 'x' has no items` / `has no anchors` / `repeats anchor number N` | write the bulleted items, then the numbered anchors, each number once |

**Without the linter**, also check by hand:

- [ ] Front matter opens on line 1 with `booklet: 0.4`, `id`, `title`, `lang`, `version`.
- [ ] Every module fence opened is closed, once, by the same id.
- [ ] Module, activity and question ids are unique across the file and hold only letters, digits and dashes.
- [ ] Every question has an id; every `choice`/`multi` has options under it with a blank line above unless the list starts at `1.`.
- [ ] No answers, kept entries, names or `sync` values written anywhere; nothing inside `%% … %%` touched.
- [ ] The tone is kind, skipping is mentioned, and nothing here is a clinical exercise (section 2).

---

## 10. Worked examples

Each of these passes the linter with only the `draft` warning, and loads in
the renderer. Imitate their shape.

### A one-activity journal, in English

````markdown
---
booklet: 0.4
id: "local/after-a-walk"
title: "After a walk"
lang: en
version: "0.1"
status: draft
---

# After a walk

A few minutes of notes after a walk: what you noticed, and anything worth keeping.

> [!module|after-a-walk] After a walk

A few minutes after a walk: what you noticed, and anything worth keeping.

> [!activity|aw-notes repeat] Walk notes

Write while it is fresh. Short answers are fine, and skipping any of these is fine too.

> [!text|noticed] What did you notice?
> One thing is enough: a sound, a colour, a smell.

> [!lines|lines] Worth keeping
> A few words each.

> [!text|where] Where did you go?
> A street, a park, a loop.

> [!module|after-a-walk end] End of After a walk
````

### A module with two activities, one of them in pages

````markdown
---
booklet: 0.4
id: "local/tides-study-week"
title: "Tides: a study week"
lang: en
version: "0.1"
status: draft
---

# Tides: a study week

A short reading about tides, a self-check, and an end-of-week review.

> [!module|tides-week] Tides

Why the sea rises and falls twice a day.

> [!activity|tw-learn repeat] Read and check

Read this first, then check yourself on the next page. Skip anything you like.

## What makes a tide

The Moon's gravity pulls the ocean towards it, so the water bulges on the side of the Earth facing the Moon.

A second bulge forms on the far side, where the Moon's pull is weakest. As the Earth turns, most coasts pass through both bulges, which gives two high tides a day.

- **Spring tide** — An extra-large tide, when the Sun and Moon line up.
- **Neap tide** — A smaller tide, when the Sun and Moon pull at right angles.

***

## Check yourself

Answer from memory first.

> [!text|cause] What pulls on the sea to make tides?
> One or two words.

> [!text|twice] Why are there two high tides a day, not one?
> Your own words; a guess is fine.

> [!text|spring] When are tides at their biggest?
> Think about where the Sun and Moon are.

> [!activity|tw-review repeat] End-of-week review

Two questions, once the week is done.

> [!text|clear] What is clear to you now?
> A sentence or two.

> [!text|unclear] What would you like to look at again?
> Leave it blank if nothing.

> [!module|tides-week end] End of Tides
````

### A Spanish-only booklet, once a day

````markdown
---
booklet: 0.4
id: "local/mi-rato-de-lectura"
title: "Mi rato de lectura"
lang: es
version: "0.1"
status: draft
---

# Mi rato de lectura

Unas líneas cada día sobre lo que estás leyendo.

> [!module|rato-de-lectura] Registro de lectura

Qué leíste hoy y qué te quedó.

> [!activity|rl-dia repeat daily] Mi rato de lectura

Escribe poco: una línea por pregunta alcanza. Si vuelves más tarde hoy, retomas lo que ya guardaste.

> [!text|que] ¿Qué leíste hoy?
> El título y hasta dónde llegaste.

> [!text|frase] Una frase que te gustó
> Cópiala tal cual, o cuéntala con tus palabras.

> [!text|pienso] ¿Qué te quedó dando vueltas?
> Una idea, una pregunta, un personaje.

> [!module|rato-de-lectura end] End of Mi rato de lectura
````

---

## 11. If you have the booklet-registry repository

A module offered from the `booklet-registry` repository is written exactly the
same way as any other booklet above — one v0.4 file, one language, its
widgets embedded inline — the only difference is that a person there decides
whether to publish it. Lint it the same way:

```sh
python3 lint-booklet.py my-module.booklet.md
```

For anything this document does not cover — matrix questions once they are
drawn, a Booklet plugin for Obsidian — `SPEC.md` is the authority. If someone
hands you a file this renderer and validator refuse to open, say so plainly
rather than guessing at what it might have once been.
