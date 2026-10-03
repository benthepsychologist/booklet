---
booklet: 0.3
title: Lint fixture
lang: en
---

# Lint fixture

> [!module|fixture-mod] A fixture module

> [!activity|walk repeat] A walk

> [!number|sleep min:0 max:24] Hours

> [!widget|picker] Pick a spot
> ![[#^picker-data]]

```booklet widget
{ "engine": "grid-select", "title": "Spots" }
```
^picker-data

> [!module|fixture-mod end]
