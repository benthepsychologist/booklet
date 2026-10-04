---
booklet: 0.8
id: fixture/data-views
title: Allotment status
lang: en
version: "0.1"
---

# Allotment status

A test fixture and a small example: a status page whose numbers were written by
whatever made the file. The page only draws them. Everything here is invented.

> [!module|allotment] Allotment status

> [!activity|status] Status

## At a glance

Four tiles, read from one data block that sits inside this module.

```booklet query
from: glance
as: tiles
value: count
label: what
note: since
tone: tone
```

```booklet data
{ "rows": [
  { "what": "Beds planted", "count": 12, "since": "since March", "tone": "good" },
  { "what": "Beds resting", "count": 3, "since": "until autumn", "tone": "warn" },
  { "what": "Water butts empty", "count": 2, "since": "since Friday", "tone": "bad" },
  { "what": "Visitors this week", "count": 7 } ] }
```
^glance

## Jobs, by when

A list, grouped by the field `when`, in the order the generator wrote the rows.

```booklet query
from: jobs
as: list
group: when
fields: where, effort
limit: 6
```

```booklet data
{ "fields": { "task": "Job", "when": "When", "where": "Where", "effort": "Effort" },
  "rows": [
    { "task": "Sow the carrots",  "when": "This week", "where": "Bed 4", "effort": "short" },
    { "task": "Mend the gate",    "when": "This week", "where": "North fence", "effort": "long" },
    { "task": "Turn the compost", "when": "Next week", "where": "Heap", "effort": "long" },
    { "task": "Order seed",       "when": "This week", "where": "Shed", "effort": "short" },
    { "task": "Prune the apple",  "when": "Winter", "where": "Orchard", "effort": "long" },
    { "task": "Paint the shed",   "when": "Next week", "where": "Shed", "effort": "long" },
    { "task": "Clear the pond",   "when": "Winter", "where": "Pond", "effort": "short" } ] }
```
^jobs

## Harvest log

A table. Click a column's name to sort it on screen; the file is not changed.

```booklet query
from: harvest
fields: crop, kilos, picked, rows
```

## Nothing due

An empty data block, with its own line to say so.

```booklet query
from: nothing
as: list
empty: Nothing needs you.
```

> [!module|allotment end] End of Allotment status

> [!data] Data

```booklet data
[ { "crop": "Beans",    "kilos": 4.5,  "picked": "2026-09-02", "rows": ["A", "B"] },
  { "crop": "Courgette","kilos": 12,   "picked": "2026-09-10", "rows": ["C"] },
  { "crop": "Apples",   "kilos": 30.25,"picked": "2026-09-28", "rows": [] },
  { "crop": "Tomatoes", "kilos": 8,    "picked": "2026-09-05", "rows": ["A"] } ]
```
^harvest

```booklet data
{ "rows": [] }
```
^nothing
