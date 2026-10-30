---
booklet: "0.17"
title: Probe
lang: en
---

# Probe

> [!module|m] M

> [!activity|evening repeat daily] Evening

> [!scale|feel] How did today feel?
1. Rough
2. Mixed
3. Good

> [!number|minutes min:0 max:300] Minutes walked

> [!activity|look] Look back

```booklet query
from: evening
limit: 7 days
summary: on
as: tiles
value: total
note: highest
```

```booklet query
from: evening
limit: 7 days
summary: on
fields: date, feel
as: table
```

```booklet query
from: evening
limit: 7 days
summary: on
as: cards
value: count
```

> [!module|m end] End
