---
booklet: "0.16"
title: Lint fixture
lang: en
---

# Lint fixture

The booklet's opening: prose before the first module line, which the linter reads as the booklet's own words.

> [!tip] A reading callout in the opening
> It is part of the opening too.

> [!module|fixture-mod] A fixture module

> [!activity|log repeat] Log

> [!text|situation] What happened?

> [!text|ease] How did it go?

> [!activity|look] Look back

```booklet data
{ "fields": { "title": "Item", "due": "Due" },
  "rows": [ { "title": "A", "due": "2026-10-08", "n": 3, "tags": ["x","y"] }, { "title": "B", "due": "2026-10-03", "n": 5, "tags": [] } ] }
```
^short-list

```booklet query
from: short-list
as: cards
label: title
fields: due, n
limit: 5
```

> [!module|fixture-mod end]
