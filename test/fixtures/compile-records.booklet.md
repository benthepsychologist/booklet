---
booklet: "0.15"
id: fixture/compile-records
title: A seed log
lang: en
---

> [!module|seeds] A seed log

A made-up booklet for the compiler's records test. Every word in its records region below is a marker the test looks for in what the compiler writes, and must never find.

> [!activity|sown] What I sowed

> [!text|what] What did you sow?

> [!choice|where open] Where?
- [ ] A pot
- [ ] The bed

> [!activity|log repeat] Each watering

> [!number|ml min:0] How much water?

> [!text|seen] What did you see?

> [!module|seeds end] End of A seed log

%%
> [!records|seeds] App record — do not edit below this line

```booklet answers
{ "what": "qzxrecanswer sunflowers by the qzxrecfence", "where": "qzxrecownoption", "qzxrecghostkey": "qzxrecghostvalue" }
```

```booklet entries log
{"items": [
{"ts": "2026-10-01T08:00:00Z", "ml": 250, "seen": "qzxrecentryone two leaves"},
{"ts": "2026-10-02T08:00:00Z", "ml": 300, "seen": "qzxrecentrytwo a third leaf"}
]}
```

```booklet draft log
{"seen": "qzxrecdraft half typed"}
```

```booklet sync
{"where": "qzxrecsync folder"}
```

```booklet answers
{ "what": "qzxrecbroken, this block is not JSON
```

qzxrecprose a line of prose inside the region.

> [!records|qzxrecorphan] Records for a module the file does not have

```booklet answers
{ "what": "qzxreclost" }
```
%%
