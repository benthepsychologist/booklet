# AGENTS.md — operating Booklet

Booklet is a content-neutral format and renderer for portable activity files. A
booklet is one Markdown file carrying both a person's writing and the
module/widget design that renders it. This repository holds the reviewed
format, reference renderer, validator, examples, and module registry.

## Prime directive

**Keep the engine separate from content.** `booklet.html` may know how to draw
engines and interface controls; it must not compile in an activity, professional
practice, clinical vocabulary, module namespace, or registry. Websites supply
presets and registries through wrappers, and booklet files carry their modules
and widgets whole.

## Licensing and ownership

- The renderer, format, validator, build scripts, and modules without a
  `copyright`/`license`/`source` declaration are Apache-2.0.
- A module's own front matter (`copyright`, `license`, `source`) controls that
  module's prose and travels with the file, since a version 2 module is the
  unit that travels whole (`SPEC.md` §2, `CONTRIBUTING.md`). Do not remove or
  relocate it.
- `modules/mensio-*.md` are generated publication copies owned upstream by
  `benthepsychologist-corpus`. Do not hand-edit them here. Their source
  repository's adapter updates or withdraws them.
- Namespace owners control their own ids. Never replace another contributor's
  module by reusing its id.

## Work loop

1. Read `README.md` for the architecture, `SPEC.md` for the format, and
   `CONTRIBUTING.md` before changing registry content. `SKILL.md` is the
   instruction file handed to an AI agent that makes booklets; when the format
   changes, change it too, since `test/skill.test.js` lints and loads its
   examples and the booklets built from it.
2. Edit source modules, never generated registry output.
3. Run `node build-registry.js` when registry modules or metadata change.
4. Run `test/run.sh`. It runs the generic engine fixtures, every
   `test/*.test.js`, the generated registry freshness check, and
   the validator.
5. Update `STATUS.md` when capabilities, versions, inventory, or known gaps
   change.

Every pull request runs the same checks in `.github/workflows/ci.yml`.

## Format disciplines

1. **Stable ids are addresses.** Modules, widgets, fields, and blocks are linked
   by id; file order is not identity.
2. **One broken record block costs one block.** Keep each record object in its
   own fenced JSON block and parse independently.
3. **Modules carry what they need.** A module using a widget carries that widget;
   a registry entry advertises the engines required before download.
4. **The file owns the work.** Browser-local caching is a convenience of one
   renderer, not part of the format and not a substitute for the `.md` file.
5. **No hidden execution in modules.** Modules and widgets are text and data,
   never JavaScript. Code belongs in a reviewed renderer engine.
6. **Preserve fault isolation and backwards reading.** A new feature must not
   make an unknown module, widget, or malformed fence abandon the rest of a
   readable booklet.

## Generated files

Do not hand-edit `registry.json` or the registry landing page `index.html`.
Their source is `build-registry.js`, run against the files under `modules/`;
CI rejects drift.
