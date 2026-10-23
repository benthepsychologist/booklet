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

1. Dislike
2. Like

> [!number|count min:0 max:9] How many?

> [!module|seen end]

%%
> [!records] App record — do not edit below this line

> [!records|seen] Seen test

```booklet answers
{ "note": "plain words", "pick": 2, "several": [1, "my own"], "mood": 2, "grid": [2, 1], "count": 3 }
```

%%
