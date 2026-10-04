---
booklet: 0.8
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
  "rows": [ { "id": "a", "title": "A", "parent": "", "due": "2026-10-08", "n": 3 }, { "id": "b", "title": "B", "parent": "a", "due": "2026-10-03", "n": 5 } ] }
```
^short-list

```booklet query
from: short-list
as: list
parent: nope
```

> [!module|fixture-mod end]
