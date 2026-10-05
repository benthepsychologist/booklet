---
booklet: "0.11"
title: Lint fixture
lang: en
---

# Lint fixture

> [!module|mod-1] Module 1

> [!menu|opts]
- one 1
- two 1

> [!activity|walk repeat] A walk

> [!text|note long] What did you notice?

> [!choice|pick menu:opts] Pick

> [!widget|picker] Pick a spot
> ![[#^picker-data]]

A claim.[^1]

[^1]: *Source 1*, p. 1: "A quote 1" Verified 2026-01-01

```booklet widget
{ "engine": "grid-select" }
```
^picker-data

> [!module|mod-1 end]

> [!module|mod-2] Module 2

> [!menu|opts]
- one 2
- two 2

> [!activity|walk repeat] A walk

> [!text|note long] What did you notice?

> [!choice|pick menu:opts] Pick

> [!widget|picker] Pick a spot
> ![[#^picker-data]]

A claim.[^1]

[^1]: *Source 2*, p. 1: "A quote 2" Verified 2026-01-01

```booklet widget
{ "engine": "grid-select" }
```
^picker-data

> [!module|mod-2 end]
