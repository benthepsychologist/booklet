---
booklet: 0.9
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
{ "fields": { "title": "Item" },
  "rows": [ { "id": "a", "title": "A" }, { "id": "a", "title": "A again" }, { "id": "b", "title": "B", "parent": "a" } ] }
```
^short-list

```booklet query
from: short-list
as: list
```

> [!module|fixture-mod end]
