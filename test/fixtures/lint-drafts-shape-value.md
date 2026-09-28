---
booklet: 1
status: approved
title: "My English Day"
lang: en
languages: en
preset: "local/english-daily-reflection@0.1"
updated: 2026-09-26 12:00
---

# Linter fixture: a draft in `drafts.activities` that is not an object

A test fixture: `skill-english-journal.booklet.md` with one change, so `lint-booklet.py` reports exactly one rule: each value in `drafts.activities` must be an object.

------------------------------------------------------------

## App record — do not edit below this line

```json
{ "block": "format", "spec": "booklet-1", "record_version": 6,
  "full_spec": "https://github.com/benthepsychologist/booklet/blob/main/SPEC.md" }
```

```json
{ "block": "meta", "app": "booklet", "v": 6, "booklet": 1,
  "booklet_id": "local/english-daily-reflection", "booklet_version": "0.1", "customized": true,
  "languages": ["en"],
  "head": { "title": { "en": "My English Day" }, "sub": { "en": "Five minutes, once a day." } } }
```

```json
{ "block": "module", "id": "local/english-daily-reflection", "version": "0.1",
  "title": { "en": "My English Day" },
  "blurb": { "en": "A short daily note about your English." },
  "display": { "order": 10 },
  "copy": { "en": { "er-day": {
    "f": { "did": ["What did you do in English today?", "For example: I read a menu. I talked to my neighbor."],
           "words": ["New words or phrases", "One word or phrase on each line. For example: \"by the way\"."],
           "hard": ["What was hard today?", "For example: I did not understand the phone call."],
           "next": ["What will you try tomorrow?", "For example: I will say hello to one new person."],
           "heard": ["What did you hear or read in English?", "For example: a song, a sign, a message."] },
    "more": "One more, if you want it" } } },
  "mode": { "id": "er-day", "kind": "entry", "upsert": "day",
    "blocks": [
      { "id": "intro", "type": "prose",
        "text": { "en": "This takes about five minutes. Write short answers. You can skip any question. If you come back later today, you can change what you wrote." } },
      { "id": "did", "type": "text", "q": ["er-day", "did"] },
      { "id": "words", "type": "headlines", "q": ["er-day", "words"], "keys": ["thoughts"] },
      { "id": "hard", "type": "text", "q": ["er-day", "hard"] },
      { "id": "next", "type": "text", "q": ["er-day", "next"] },
      { "id": "more", "type": "group", "display": { "placement": "folded" }, "copy": "er-day.more",
        "blocks": [ { "id": "heard", "type": "text", "q": ["er-day", "heard"] } ] } ] } }
```

```json
{ "block": "person", "name": "", "email": "", "sync": null, "lang": "en" }
```

```json
{ "block": "drafts", "today": null, "checkin": null, "activities": { "er-day": "read a menu" } }
```
