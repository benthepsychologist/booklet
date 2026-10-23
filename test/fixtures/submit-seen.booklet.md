---
booklet: "0.13"
id: test/submit-seen
title: Seen test
lang: en
version: "0.7"
---

# Seen test

A test booklet for the submit build: one question of each kind that has options, with the answers already kept in it. Its wording is made up.

> [!module|seen] Seen test

> [!activity|kinds] Kinds

> [!text|note] A **note** in your words

> [!choice|pick] Pick one
- [ ] Alpha
- [ ] **Beta**
- [ ] Gamma

> [!multi|several open] Pick any, or add your own
- [ ] One
- [ ] Two
- [ ] Three

> [!scale|mood] How was it?

0. Poor
1. Fine
2. Great

> [!matrix|grid] Rate each

- Tea
- Coffee
- Juice

1. Dislike
2. Like

> [!number|count min:0 max:9] How many?

> [!choice|far] Out of range
- [ ] Only option

> [!widget|spot] Pick what fits
> ![[#^spot-data]]

```booklet widget
{ "engine": "grid-select",
  "axes": { "top": "up", "bottom": "down", "left": "less", "right": "more" },
  "cells": [ { "id": "cell-a", "label": "First cell", "note": "The first.", "color": "green" },
             { "id": "cell-b", "label": "Second cell", "note": "The second.", "color": "teal" } ],
  "items": [ { "id": "item-a", "cell": "cell-a", "label": "First item" },
             { "id": "item-b", "cell": "cell-b", "label": "Second item" } ],
  "copy": { "h": "Heading", "p": "Select what fits." } }
```
^spot-data

> [!activity|log repeat] A log

A repeating activity: what it keeps is never sent.

> [!text|logq] What happened?

> [!module|seen end]

%%
> [!records] App record — do not edit below this line

> [!records|seen] Seen test

```booklet answers
{ "note": "plain words", "pick": 2, "several": [1, "my own"], "mood": 2, "grid": [2, 1, null], "count": 3, "far": 9, "spot": ["item-a"] }
```

```booklet entries log
{"items": [ {"ts": "2026-10-01T10:00:00Z", "logq": "entry words kept"} ]}
```

```booklet draft log
{"logq": "draft words typed"}
```

%%
