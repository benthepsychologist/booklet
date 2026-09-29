# Adding an activity

These are the contribution rules for the public Booklet registry.

A module is one v0.2 booklet file: front matter, prose explaining what it
is, and one `> [!module|…]` … `> [!module|… end]` fence holding its
activities as callout lines, with a widget's own data (if it has one) fenced
alongside as JSON. There is **no code in it** — which is why adding one is a
pull request and not a security review.

## What this registry is, and what it is not

This is a curated **public module registry** with three kinds of content:
format demonstrations, general-purpose activities, and attributed modules whose
authors retain their own copyright and state their own distribution terms.

**A listing is not an endorsement or safety review.** The words in a booklet
reach people directly. A submission must identify its author/source and terms,
must describe itself honestly, and must not imply that inclusion here certifies
fitness for a particular person. Review establishes that the module is valid,
portable, attributable, and accurately represented; it does not establish that
its claims are universally appropriate.

**Anyone may run their own registry** — see [`SPEC.md`](SPEC.md). It is one JSON
file on any host that serves CORS, so nothing here is a gate on what you can
publish. It is only a gate on what *this* list offers.

## The shape of a module file

````markdown
---
booklet: 2
id: "you/your-thing"
title: "Your thing"
lang: en
version: "0.1"
status: draft
---

# Your thing

What it is, in a paragraph. Who it is for, and what it asks of them.

> [!module|your-thing] Your thing

One line inside the fence: this becomes the module's blurb in the registry.

> [!activity|yt-main repeat] Your thing

Whatever a person does and keeps, in plain callout lines — see `SPEC.md`
and `SKILL.md` for the full grammar.

> [!module|your-thing end] End of Your thing
````

`status: draft` keeps it out of what `build-registry.js` actually offers
until a reviewer changes it to `approved`.

[`modules/end-of-day.md`](modules/end-of-day.md) is a worked example using
both widget engines. Copy it.

## Rules that are actually checked

These run on every pull request, and you can
run them yourself first either way:

| | |
| --- | --- |
| every module fence you open is closed, once, by the same id | `lint-booklet.py` |
| a `> [!widget|…]` line **carries its own data**, embedded right there | the most common mistake |
| ids are unique, and stable — an id is an address | |
| the file declares one `lang:` | one module, one language, always |
| `registry.json` matches the modules in the repo | `node build-registry.js` |
| every entry points at a file that exists | |

**One module, one language, always** — there is no three-language
requirement for the registry anymore. `en`, `es` or `fr`, whichever you wrote
it in; a translation, if you want to offer one, is a sibling file with the
same id (`SKILL.md` §8).

Run them yourself before opening the PR:

```sh
test/run.sh              # everything
node build-registry.js   # then commit registry.json and index.html
```

## Authorship and terms

If your module is yours and you want to keep it that way, say so in its own
**front matter** — `copyright`, `license` and `source`:

```yaml
---
booklet: 2
id: "you/your-thing"
title: "Your thing"
lang: en
version: "0.1"
copyright: "© 2026 Your Name. All rights reserved."
license: "Free to copy and share, unmodified and with this notice intact."
source: "https://example.org/where-it-lives"
---
```

**In the front matter, because the file itself is the unit that
travels** — there is no paste-and-lose-it path, so the front matter is where
these belong (`SPEC.md` §2).

Leave them out and your module is contributed under this repository's
Apache-2.0 terms, like the code.

⚠️ These state terms. They do not enforce them, and nothing can: a module
that has been copied has been copied. Withdrawing one stops it being *offered*
and changes the terms of later versions.

## Why the manifest is committed

`registry.json` could be generated at deploy time. It is committed instead so
that **a pull request shows what it does to the offer** — a reviewer sees "this
adds one activity called X" in the diff, rather than having to imagine it.

## Why modules live here rather than being linked

The registry could just list your repo and let the renderer fetch from it. That
is how some plugin registries work, and it is lighter.

It is not what this one does, because content behind a link can change after
review without another pull request. Here, what was reviewed is what is served.
If you would rather keep control of your own module, run your own registry —
that is a first-class thing to do, not a fallback.

## What happens on merge

GitHub Pages serves this repository, so merging a pull request into `main`
makes `registry.json` and the modules it names live at once.
