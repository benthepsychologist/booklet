---
booklet: "0.99"
title: A later format
lang: en
---

# A later format

A booklet marked with a format this renderer does not know. It opens by this renderer's rules.

> [!module|later] A later module

> [!activity|log repeat] Log

> [!text|note] What happened?

> [!number|hours mx:5] Hours slept

> [!video|clip] A kind this renderer does not define

![A recording](media/recording.mp3)

> [!activity|look] Look back

```booklet query
from: log
sort: due
```

> [!module|later end] End

%%
> [!records] App record — do not edit below this line

> [!records|later] A later module

```booklet entries log
{"items": [{"ts": "2026-11-03T09:00:00Z", "note": "Quiet morning", "hours": 4}]}
```
%%
