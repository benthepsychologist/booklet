---
booklet: "0.16"
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
limit: 30 days
summary: on
group: feel
as: list
```

> [!module|m end] End
