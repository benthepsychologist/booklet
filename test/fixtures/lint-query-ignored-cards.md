---
booklet: "0.20"
title: Lint fixture
lang: en
---

# Lint fixture

> [!module|fixture-mod] A fixture module

> [!activity|log repeat] Log

> [!text|situation] What happened?

> [!text|ease] How did it go?

> [!activity|once] Once

> [!text|solo] A single answer

> [!activity|look] Look back

```booklet data
{ "rows": [ { "title": "A", "n": 3 } ] }
```
^counts

```booklet query
from: counts
value: n
```

> [!module|fixture-mod end]
