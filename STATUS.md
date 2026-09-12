# STATUS — Booklet

*As of 2026-09-12*

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
- **Website wrappers:** may provide a preset and one or more registries. The
  reference renderer reconstructs a missing wrapper preset around restored
  browser entries without replacing those entries.
- **Export:** touch-first devices use the operating-system share sheet when file
  sharing is available. Desktop gets an adaptive Share, Save, Download, Copy,
  and optional passphrase panel; unsupported actions are omitted.
- **Registry:** 10 approved modules: six Apache-2.0 examples/general-purpose
  activities and four copyrighted Mensio modules carrying their own terms.
- **Validation:** `test/run.sh` and `.github/workflows/ci.yml` check the renderer,
  all 17 booklet/module/widget files, generated examples, and registry freshness.

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

