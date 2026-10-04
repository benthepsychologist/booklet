---
booklet: 0.7
title: Lint fixture
lang: en
---

# Lint fixture

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
as: list
group: nope
```

> [!module|fixture-mod end]
