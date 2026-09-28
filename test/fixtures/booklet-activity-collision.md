---
booklet: 1
title: "Activity id collision"
lang: en
preset: "fixture/collision@0.1"
status: approved
---

# Activity id collision

A failing test fixture: two different modules both hold an activity with the
id `shared-quiz`. An activity id is the address of its entries, so
`lint-booklet.py` must reject the file, and a renderer loading it must keep
the first module, refuse the second, and say which id collided.

------------------------------------------------------------

## App record — do not edit below this line

```json
{ "block": "meta", "app": "booklet", "v": 6, "booklet": 1,
  "booklet_id": "fixture/collision", "booklet_version": "0.1", "customized": false }
```

```json
{ "block": "module", "id": "fixture/first", "version": "0.1",
  "title": { "en": "First" },
  "activities": [
   { "id": "first-words", "kind": "entry", "title": { "en": "Words" }, "blocks": [] },
   { "id": "shared-quiz", "kind": "entry", "title": { "en": "Quiz" }, "blocks": [] } ] }
```

```json
{ "block": "module", "id": "fixture/second", "version": "0.1",
  "title": { "en": "Second" },
  "mode": { "id": "shared-quiz", "kind": "entry", "title": { "en": "Another quiz" }, "blocks": [] } }
```

```json
{ "block": "person", "name": "", "email": "", "lang": "en", "mode": "full" }
```
