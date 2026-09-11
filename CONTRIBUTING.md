# Adding an activity

A module is a Markdown file: some YAML at the top, prose explaining what it is,
and one fenced JSON block describing the activity. There is **no code in it** —
which is why adding one is a pull request and not a security review.

## What this registry is, and what it is not

This is the **examples** registry. What belongs here is a module that shows the
format doing something — a shape somebody else can copy. It is deliberately
small and curated.

⛔ **It is not a place for advice.** No health, medical, legal or financial
guidance, and nothing that tells a reader what to do about their own situation.
A booklet is a workbook; the words in it reach people unmediated, and neither
this repository nor its maintainers are in a position to check whether they are
safe for whoever opens them. A module that offers advice will be declined, no
matter how good it is.

**Anyone may run their own registry** — see [`SPEC.md`](SPEC.md). It is one JSON
file on any host that serves CORS, so nothing here is a gate on what you can
publish. It is only a gate on what *this* list offers.

## The shape of a module file

```
---
module: you/your-thing        ← the id, "who/what"
version: 0.1
status: approved              ← anything else is not offered
lang: en
---

# Your thing

What it is, in a paragraph. Who it is for, and what it asks of them.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file, or paste it
into **Add an activity** in the page's editor.

------------------------------------------------------------

```json
{ "block": "module", "id": "you/your-thing", ... }
```
```

[`modules/end-of-day.md`](modules/end-of-day.md) is a worked example using both
widget engines. Copy it.

## Rules that are actually checked

These run on every pull request once the check workflow is enabled, and you can
run them yourself first either way:

| | |
| --- | --- |
| every block has a known `type`, every mode a known `kind` | `lint-booklet.py` |
| a block that draws with a widget **carries that widget** | the most common mistake |
| ids are unique, and stable — an id is an address | |
| every visible string has **both languages** | `en` and `fr` |
| `registry.json` matches the modules in the repo | `node build-registry.js` |
| every entry points at a file that exists | |

Run them yourself before opening the PR:

```sh
test/run.sh              # everything
node build-registry.js   # then commit registry.json
```

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

GitHub Pages serves this repo, so `registry.json` and the modules it names are
live at once. Anything pointed at this registry sees the new activity on its
next load.
