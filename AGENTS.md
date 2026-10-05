# AGENTS.md — operating Booklet

Booklet is a content-neutral format and renderer for portable activity files. A
booklet is one Markdown file carrying both a person's writing and the
module/widget design that renders it. This repository holds the reviewed
format, reference renderer, validator, and examples. The modules live in the
separate `booklet-registry` repository.

## Prime directive

**Keep the engine separate from content.** `booklet.html` may know how to draw
engines and interface controls; it must not compile in an activity, professional
practice, clinical vocabulary, or module namespace. The renderer starts empty
and adds modules only from the `booklet-registry` repository, and booklet files
carry their modules and widgets whole.

**Two libraries ride inside `booklet.html`, asleep** (mermaid for diagrams, Temml
for math: `<script type="text/plain" id="lib-…">` blocks at the end of the file,
a few very long lines). Do not edit them by hand: replace one by downloading the
pinned build again, updating the version, URL and sha256 in the comment above it,
and `NOTICE`; `test/figures.test.js` checks the hash. Search the file with
`grep -a`, or the huge lines swamp the output.

## Licensing and ownership

- The renderer, format, validator, and modules without a
  `copyright`/`license`/`source` declaration are Apache-2.0.
- A module's own front matter (`copyright`, `license`, `source`) controls that
  module's prose and travels with the file (a one-module file's `copyright`, `license`, `source` and `version` are its notice, or a `> [!notice]` callout in its fence), since a v0.10 module is the
  unit that travels whole (`SPEC.md` §2, `CONTRIBUTING.md`). Do not remove or
  relocate it.
- Modules are not kept in this repo; they live in `booklet-registry`, and a
  change to one is a pull request there. (The `mensio-*` modules were once
  generated from `benthepsychologist-corpus`; that publisher has been off since
  2026-09-14, and the registry copies are now the ones maintained.)
- Namespace owners control their own ids. Never replace another contributor's
  module or widget by reusing its id.

## Work loop

1. Read `README.md` for the architecture, `SPEC.md` for the format, and
   `CONTRIBUTING.md` before changing the renderer or the format. `SKILL.md` is the
   instruction file handed to an AI agent that makes booklets; when the format
   changes, change it too, since `test/skill.test.js` lints and loads its
   examples and the booklets agents built from it alone.
2. Create a feature branch off `main` for the change — never commit to `main`
   directly.
3. Add or change modules in `booklet-registry`, not here.
4. Run `test/run.sh`. It runs the generic engine fixtures, every
   `test/*.test.js`, and the validator. Update `STATUS.md` on the branch when
   capabilities, versions, inventory, or known gaps change.
5. Open a pull request. `.github/workflows/ci.yml` runs the same checks; a
   merge to `main` publishes at once (`CONTRIBUTING.md`).

## Format disciplines

1. **Stable ids are addresses, and an id belongs to its module.** Modules,
   activities, questions, and widgets are linked by id; file order is not
   identity. From v0.9 an id is unique within its module (a module's scope is its fence and its `> [!data|module-id]` section; module ids are unique within the
   file), a reference is found in its own module and then the data section and
   never in another module's fence, and records are tied to a module by the id on
   its records line. Inside the renderer an activity is known by its address,
   `module-id/activity-id` (just the id for an activity outside every fence), and
   the file's own ids never change.
2. **One broken record block costs one block.** Keep each record object in its
   own fenced JSON block and parse independently.
3. **Modules carry what they need.** A module using a widget carries that widget;
   a registry entry (in `booklet-registry`) advertises the engines required
   before download.
4. **The file owns the work.** Browser-local caching is a convenience of one
   renderer, not part of the format and not a substitute for the `.md` file.
5. **No hidden execution in modules.** Modules and widgets are text and data,
   never JavaScript. Code belongs in a reviewed renderer engine.
6. **Preserve fault isolation and backwards reading.** A new feature must not
   make an unknown module, widget, or malformed fence abandon the rest of a
   readable booklet.
7. **A format version is text, never a number.** `0.10` is not the number 0.1.
   Read the marker as text, compare versions as two whole numbers (major, minor)
   with `versionCmp` in the renderer and never `+FORMAT_VERSION`, and write it
   quoted (`booklet: "0.10"`) so a YAML tool does not turn it into 0.1.

## Design rules for views

These bind anyone extending the format or the renderer's views.

1. A view is a way to draw rows. It reads the shared roles and takes no key of its own.
2. A new role must mean the same thing in every view that draws it, and two real pages must need it.
3. A look that styling, density, or the shaping of rows by whatever wrote the file can give is never a new view or key.
4. A reader may open, close, sort and filter what is on screen, and none of it is saved. Anything that changes the file or sends something elsewhere is not a view's business.

`test/guard.test.js` pins the key list and the view list, so adding either is a deliberate change made in the renderer, the linter and the spec table together.
