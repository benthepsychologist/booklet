# Why Booklet looks the way it does

Booklet was already "one file, hand-editable, no server." It just wasn't hand-editable in the way that phrase implies. A booklet's design — every activity, every question, every widget — used to live as a series of fenced JSON blocks under the prose. Readable, yes: open the file and you could see the shape of it. But *editable*? Nobody sits down and correctly retypes a JSON object by hand, and a language model asked to add a question to a booklet was really being asked to write valid, deeply-nested JSON on the first try, in the right place, with the right keys. "Hand-editable" turned out to mean "hand-*readable*," and that gap is where this rewrite starts.

This document is the record of how the Markdown format was decided (at v0.3, and kept in every version since; the current one is v0.10, written up in `SPEC.md`): what we looked at, what we were actually trying to do, and why each real choice landed where it did. It exists because "just trust us" is a bad way to hand someone a file format.

---

## What we were trying to do

Three things, in Ben's own terms, settled before any format work started:

1. **A worksheet you can send to someone.** Email or share a link; the other person opens it in the Booklet viewer and works on it. For now, their answers live in the browser or a downloaded file — no account, no server. Booklet Studio, a later paid product, is where accounts and sync belong; the free renderer stays a viewer.
2. **A personal learning surface.** Spanish study, the exact sciences, evolving over years, potentially feeding future learning tools built the same way.
3. **Easy to create and extend, by a person or by a language model.** A brand-new booklet with nothing answered yet should contain no JSON at all — not an empty shell of it, none.

And one fixed design constraint, stated at the point the rewrite was greenlit: **the document, not the renderer, is the format.** A booklet should mean something on its own, in a plain text editor, with no tooling anywhere near it. JSON's only job is to store what a reader typed or picked — never to define what the questions *are*.

---

## What we looked at

We didn't want to reinvent Markdown extensions that already exist in some other, half-remembered shape, so before writing a line of new syntax we surveyed the field: six families of tools that already extend Markdown for one purpose or another.

- **Static site generators** (Hugo, Docusaurus, MkDocs and its newer sibling Zensical) turn Markdown into websites. Their extensions — shortcodes, admonitions — exist to control presentation. None of them keep what a reader types; a reader of a Hugo site doesn't *type* anything.
- **Scientific and technical publishing** (Pandoc, Quarto, MyST/Jupyter Book, Observable Framework) treats Markdown as the source for computed documents. "Interactive" here means live code and charts, not a reader's own answers — Quarto's own docs are explicit that nothing typed into a Shiny app or an Observable cell survives a reload.
- **Obsidian and its plugin ecosystem** is the one family where the Markdown file genuinely *is* a person's own data, kept for years. Its own founding essay, *File over app*, argues for exactly the principle this rewrite rests on. A few of its plugins — Meta Bind, Dataview, and especially Spaced Repetition, which hides a flashcard's review schedule in an HTML comment next to the card — write a reader's state directly into the note.
- **Content frameworks for web apps** (MDX, Markdoc) make Markdown a component layer for developers. MDX documents literally contain JavaScript, which was disqualifying on its own — a booklet has to be safe to open from a stranger.
- **Interactive learning in Markdown** (LiaScript, Hyperbook, Quizdown and its smaller cousins, MyST's exercise directives) is the closest existing family to what Booklet does: people write quizzes and courses, and learners answer questions. Every one of them, without exception, keeps those answers in browser storage or a learning-platform export — never the file.
- **Markdown for AI agents** (MDMA, Markform, interactive-markdown) is the newest and smallest family, from 2025 and 2026. Markform stood out: a format explicitly built for "humans to read, machines to parse, agents to fill," using HTML comments around ordinary Markdown so that a form reads as prose everywhere and hides its machinery from GitHub and plain viewers alike. It's dormant — no commits in seven months at the time we looked — but its *pattern* is the single closest precedent to what Booklet needed.

The finding that mattered most: **almost nobody keeps a reader's answers inside the document.** Booklet doing that isn't a small variation on an established practice; it's nearly unprecedented, and the one real precedent (Markform) is a form format, not a document format. That told us we'd be assembling something new from parts, not adopting something whole.

We also mapped, construct by construct, how the field's various container syntaxes actually render in the three places someone is likely to open a booklet without the Booklet app: a plain CommonMark viewer, GitHub, and Obsidian. The result was decisive. Every "directive" syntax the field has invented — MyST's and Pandoc's `:::name` fenced divs, Docusaurus admonitions, Hugo shortcodes, Markdoc's `{% %}` tags — shows as literal punctuation in at least two of those three places, and Obsidian supports none of them. Meanwhile a handful of constructs had already converged across multiple unrelated tools: task lists as the universal way to write a choice question (GitHub, Obsidian, Pandoc, LiaScript, Quizdown and Markform all landed on `- [ ]`/`- [x]` independently), footnotes as the universal citation mark, callouts as the universal boxed-aside, and — critically — the HTML comment as the *only* construct that every one of those three viewers agrees to hide completely.

## Why plain-text readability won every argument

Early on, we drafted a version of this format that tried to render as cleanly as possible in a bare CommonMark viewer with none of GitHub's or Obsidian's extensions. That constraint was wrong, and dropping it changed the shape of everything downstream.

Nobody in Booklet's actual audience opens a file in a bare CommonMark viewer. A client gets the Booklet viewer. The author writes in a text editor or in Obsidian. A language model reads raw text regardless of how it renders. The only real audience for "does this render nicely with zero extensions" was a hypothetical visitor to the public GitHub repository — and even there, some visible markup is a tolerable cost, not a design-breaking one.

So the real priority list became: the raw source has to read cleanly in a text editor (since that's where a human author actually looks), the file has to work well in Obsidian (because it's the one Markdown application with real, non-technical adoption — "the biggest Markdown viewer on the planet"), and GitHub rendering matters, but a little visible punctuation there is an acceptable price. Plain CommonMark rendering, once treated as a hard constraint, turned out to matter least of all.

That reordering is what let two of the format's harder choices actually work:

**Headings had to be given back to prose.** An early version used headings themselves to mark structure — a module's or activity's name became an `##`, its pages became `###`, and so on. It read cleanly enough in a bare Markdown viewer, but it meant a page of ordinary reading only had the three smallest heading sizes left to write with. That's not a small cost; it breaks ordinary writing. Once "renders in bare CommonMark" stopped being load-bearing, headings could go back to being just headings, and structure moved to a small set of callout lines instead — visible, titled boxes in the one place (Obsidian) where visibility actually matters.

**Inventing a small vocabulary stopped being off the table.** The opening framing for this rewrite was "borrow, don't invent" — assemble the format entirely from existing conventions, nothing new. That held for the *carriers*: every structural role Booklet needs is filled by a construct some other tool already uses somewhere (a callout, a footnote, a task list, a fenced code block). What it couldn't hold for was the *vocabulary inside those carriers* — nothing else needed a way to say "this is a choice question with these settings," because nothing else combines a reader-facing document with an answer-storing app the way Booklet does. The resolution: borrow every carrier, and invent only the small set of words that go inside them.

## What we actually built

**One grammar for everything Booklet needs to say**, a callout line: `> [!kind|id settings] Title`. An activity, a question, a widget, a shared menu, a module boundary — all one shape, so there's exactly one new thing to learn rather than several. Obsidian renders it as a titled box out of the box; GitHub shows it as a quotation with the brackets visible, which is a fine trade next to the alternative of inventing a syntax Obsidian can't render at all.

**Modules, kept, but not as JSON.** The earlier discussion nearly dropped the module concept entirely, on the reasoning that "one file is one activity's worth of stuff" removed a layer of nesting that had mostly existed to work around JSON's own paste-ability problems. That reasoning didn't survive contact with what modules actually do: a weekly report that reads a week's worth of entries, or a dashboard that draws itself from several activities, only works if those activities are guaranteed to travel together — and a module is that guarantee. So modules stayed, rewritten as a fenced pair of callout lines (`> [!module|id]` … `> [!module|id end]`), open-and-close checked by the linter, so one module's content can never silently bleed into the next one's.

**Questions declare their type, then hand off to a plain list.** A choice question is a callout line followed by an ordinary GitHub task list; the correct answer, for a study booklet, is marked the same way Quizdown, Markform and others already do it — `[x]` on the right option. A scale question is a callout line followed by a numbered list, where the number itself is the stored answer. A matrix question — several items sharing one scale, the classic symptom-questionnaire shape — was deliberately kept as *two* separate lists (the items, then the anchors) rather than a Markdown table, because a table breaks on one stray space and a booklet's own renderer, not the raw file, is what actually has to answer it. The whole approach follows one stated principle: a question is only ever *answerable* through Booklet's own renderer or a future Obsidian plugin, so everywhere else it only has to read as a couple of ordinary lists — it doesn't have to *work* as a form.

**Citations are just footnotes.** `[^id]` in the text, `[^id]: …` for the note — nothing new at all, because CommonMark's own footnote syntax was already exactly what was needed, already native on GitHub and in Obsidian. The one piece of real engineering here: the renderer reads a footnote's own note text (`*Title*, edition, p. N: "quote" Verified date`) and turns it into structured citation data — the numbered mark, the side panel, the highlighted quote, the verified badge — so a reading module gets that whole experience for free, from a footnote and nothing more exotic.

**Data lives in fences, referenced from the prose by an Obsidian embed.** A widget's drawing data, a diagram, an image's address — none of it belongs inline in running prose (a body-map widget's SVG alone would swallow a page of text if pasted into the middle of it), so it lives in a fenced block at the end of the file or the end of its module, and the prose just points at it: `![[#^body-map]]`. That's Obsidian's own embed syntax, doing exactly what it was built for, and it was confirmed by hand — pasted into a real Obsidian vault — that a mermaid diagram embedded this way draws natively, no plugin required.

**Answers never travel with the design.** This was a real correction mid-build: an early version kept a module's own answers *inside* its fence, on the reasoning that a module should be fully self-contained and portable. But a module used for months would drag hundreds of lines of accumulated JSON along with it every time it moved. Answers now live in their own section at the end of the file, grouped by the module they belong to and wrapped in `%%` so Obsidian's Reading view hides them — one search away from the design that produced them, but never mixed into it.

**One language per file.** Keeping every language's words in the same JSON object — `{ "en": …, "fr": …, "es": … }` — meant a translator was editing structured data, not writing prose, and a "Spanish version" of a booklet wasn't really a document at all. A translation is a sibling file with the same ids instead, so a Spanish worksheet is just a Spanish document, hand-writable and hand-readable in Spanish. What ties the languages together is positional: the second option in the English file is the second option in the Spanish one, and answers store as that position rather than as words, so they carry across languages unchanged.

## What we deliberately didn't build

- **No `:::` directive syntax of any kind** — not MyST's, not Pandoc's, not `remark-directive`'s. The rendering survey was unambiguous: it's the field's single most popular container convention, and it's also the one that fails hardest in Obsidian, where it isn't supported at all.
- **No attribute-list syntax** (`{#id .class}`) for the same reason from a different angle — it puts machine ids inside the *visible* text of a heading in every viewer, Obsidian included, rather than hiding them the way a callout's metadata does.
- **No LiaScript-style double-bracket questions.** They're the richest quiz vocabulary that exists in plain Markdown, and we said so directly in the research — but `[[…]]` is also Obsidian's own wikilink syntax, and a booklet using it would have every question silently turn into a broken link the moment someone opened it in Obsidian.
- **No code in the document.** MDX's whole premise — Markdown with embedded JavaScript — was ruled out on the first pass, because a booklet has to be something a person can safely open after a stranger emails it to them.

## Where this leaves the format

Nothing here is finished. Editing a booklet's design still means a text editor, not the browser — deliberately, so the format and a read-only renderer could be proven first, before editing gets built on top of it. There's no Obsidian plugin yet.

What's real: the format reads as a document, not a database dump, in a text editor, on GitHub, and in Obsidian; a brand-new booklet with nothing answered yet contains no JSON at all; and the worked examples in this repository (a rebuild of the original mindful check-in, a short reading-and-quiz booklet on the tides, and others) load, draw, and let a reader answer them, verified in a real browser, not just in tests.
