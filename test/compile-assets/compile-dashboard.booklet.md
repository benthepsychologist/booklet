---
booklet: "0.18"
id: fixture/compile-dashboard
title: Orchard and garden desk
lang: en
version: "0.1"
---

# Orchard and garden desk

A made-up booklet for the compiler's data-file test. The rows come from `compile-dashboard.json`, a file beside it, and open to show their jobs. Everything in it is invented.

> [!module|desk] Orchard and garden desk

> [!activity|board] Plots and their jobs

## Plots

One table. A plot opens to its text and then its jobs, and a job opens to its steps.

```booklet query
from: plots
as: table
fields: title, kind, stage, open, due
```

## The same rows as cards

```booklet query
from: plots
as: cards
label: title
note: about
fields: stage, due
```

## The same rows as a list

```booklet query
from: plots
as: list
label: title
badge: stage
```

## Requests

A flat list that nests by `parent`, with its rows in a file under a key path and its labels in the fence.

```booklet query
from: requests
as: list
label: title
note: headline
badge: gate
```

## Rows in the fence

The 0.18 way, still the same: the rows are written in the fence, flat, and nest by `parent`.

```booklet query
from: inline
as: list
label: title
```

## Harvest

```booklet query
from: harvest
as: bars
label: fruit
value: kilos
```

## A file that is not there

```booklet query
from: gone
as: table
```

## A name the renderer does not read

```booklet query
from: odd
as: table
empty: Nothing to show here.
```

> [!data] Data

```booklet data compile-dashboard.json plots
```
^plots

```booklet data compile-dashboard.json inbox.requests
{ "fields": { "title": "Request", "headline": "In short", "gate": "Gate", "asked": "Asked" } }
```
^requests

```booklet data compile-dashboard.json harvest
```
^harvest

```booklet data compile-dashboard.json harvest
```
^harvest-again

```booklet data compile-missing.json rows
```
^gone

```booklet data ../compile-dashboard.json plots
```
^odd

```booklet data
{ "rows": [
  { "id": "a", "title": "Order seed" },
  { "id": "b", "title": "Sort the packets", "parent": "a" },
  { "id": "c", "title": "Label the drawers", "parent": "b" },
  { "id": "d", "title": "Mend the gate" } ] }
```
^inline

> [!module|desk end]
