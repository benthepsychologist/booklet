---
booklet: "0.10"
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

```booklet query
from: log
fields: ease, situation
group: situation
empty: Nothing logged yet.
```

> [!module|fixture-mod end]

> [!module|fixture-other] Another module

> [!activity|elsewhere repeat] Elsewhere

> [!text|far] Far away

> [!module|fixture-other end]
