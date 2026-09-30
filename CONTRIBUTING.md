# Contributing to Booklet

This repo is the **engine**: the reference renderer (`booklet.html`), the format
spec (`SPEC.md`), the validator (`lint-booklet.py`), `SKILL.md` for agents, the
docs, and a small handful of demonstration booklets in `examples/`. The
modules people can add live in a separate repo,
[`booklet-registry`](https://github.com/benthepsychologist/booklet-registry);
its `CONTRIBUTING.md` covers adding one.

## How a change goes in

1. Branch off `main` (`feat/…`, `fix/…`).
2. Run `test/run.sh` and `python3 lint-booklet.py`, and try `booklet.html` in a
   browser (a `file://` open is enough).
3. Open a pull request. CI's `check` must pass. Squash-merge.

**Tests read `test/fixtures/`, never a registry module.** A test must not
pass or fail because a module was added or removed elsewhere.

## Interface strings

Strings shown to a reader are written in English, Spanish and French
(`en|es|fr`), in the renderer's own tables. See `SPEC.md` §9 for the format's
one-language-per-file rule.

## Licence

Apache-2.0 (`LICENSE`), including contributions.
