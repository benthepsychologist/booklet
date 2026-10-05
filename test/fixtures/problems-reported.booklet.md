---
booklet: "0.11"
id: test/problems-reported
title: A file with things to report
lang: en
---

> [!module|rep] Reported

> [!activity|day repeat] A day

> [!number|sleep mx:5] Hours slept

> [!text|note long] Note

> [!sticker|oddity] A kind nobody defined

Some prose of its own.

> [!note] A plain reading callout, which needs no notice

> [!activity|solo daily] Solo

> [!activity|look] Look

```booklet query
from: day
limt: 3
```

```booklet query
from: day
limit: 0
```

> [!module|rep end] End

> [!records] App record

```booklet entries day
{"nothing": []}
```
