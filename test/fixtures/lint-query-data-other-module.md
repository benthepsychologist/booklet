---
booklet: 0.4
title: Lint fixture
lang: en
---

# Lint fixture

> [!module|fixture-mod] A fixture module

> [!activity|look] Look back

```booklet query
from: short-list
```

> [!module|fixture-mod end]

> [!module|fixture-other] Another module

> [!activity|elsewhere] Elsewhere

```booklet data
{ "fields": { "title": "Item", "due": "Due" },
  "rows": [ { "title": "A", "due": "2026-10-08", "n": 3, "tags": ["x","y"] }, { "title": "B", "due": "2026-10-03", "n": 5, "tags": [] } ] }
```
^short-list

> [!module|fixture-other end]
