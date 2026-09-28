---
module: fixture/both-keys
version: 0.1
status: approved
lang: en
---

# Both keys

A failing test fixture: this module carries both `mode` and `activities`. A
module holds one activity in `mode` or several in `activities`, never both, so
`lint-booklet.py` must reject it and a renderer must refuse it.

## Adding it to a booklet

It should never be added; it exists to be refused.

------------------------------------------------------------

```json
{ "block": "module",
 "id": "fixture/both-keys",
 "version": "0.1",
 "title": { "en": "Both keys" },
 "mode": { "id": "bk-one", "kind": "entry", "title": { "en": "One" }, "blocks": [] },
 "activities": [
  { "id": "bk-two", "kind": "entry", "title": { "en": "Two" }, "blocks": [] },
  { "id": "bk-three", "kind": "entry", "title": { "en": "Three" }, "blocks": [] } ]
}
```
