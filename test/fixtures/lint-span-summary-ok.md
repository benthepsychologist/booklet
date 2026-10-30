---
booklet: "0.17"
title: Lint fixture
lang: en
---

# Lint fixture

> [!module|fixture-mod] A fixture module

> [!activity|evening repeat daily] Evening

> [!scale|mood] How did today feel?
1. Rough
2. Mixed
3. Good

> [!number|hours min:0 max:24] Hours slept

> [!activity|look] Look back

A week, summarised as tiles.

```booklet query
from: evening
limit: 7 days
summary: on
as: tiles
```

The week's moods, one bar a value.

```booklet query
from: mood
limit: 7 days
summary: on
as: bars
```

Today only, as cards, with no summary.

```booklet query
from: evening
limit: 1 day
```

> [!module|fixture-mod end] End
