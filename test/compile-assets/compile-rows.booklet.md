---
booklet: "0.20"
id: fixture/compile-rows
title: Garden beds and their rows
lang: en
version: "0.1"
---

# Garden beds and their rows

A made-up booklet for the compiler's rows test. Every query here draws rows that open, over inline data: a flat row with fields
its line does not show, rows whose keys differ, rows that hold rows, and the same with a `group:`. Everything in it is invented.

> [!module|rows] Garden beds and their rows

> [!activity|garden] Garden

## 1 A table of flat rows; the fields it does not show open

```booklet query
from: beds
as: table
fields: bed, size
```

## 2 A list

```booklet query
from: beds
as: list
label: bed
fields: size
```

## 3 Cards

```booklet query
from: beds
as: cards
label: bed
fields: size
```

## 4 A table with no fields declared, over rows whose keys differ

```booklet query
from: ragged
as: table
```

## 5 The same as a list

```booklet query
from: ragged
as: list
label: bed
```

## 6 The same as cards

```booklet query
from: ragged
as: cards
label: bed
```

## 7 A grouped table

```booklet query
from: beds
as: table
fields: bed, size
group: place
```

## 8 A grouped list

```booklet query
from: beds
as: list
label: bed
fields: size
group: place
```

## 9 Grouped cards

```booklet query
from: beds
as: cards
label: bed
fields: size
group: place
```

## 10 Grouped cards and a limit

```booklet query
from: beds
as: cards
label: bed
fields: size
group: place
limit: 3
```

## 11 A table with a badge, grouped

```booklet query
from: beds
as: table
fields: bed, crop
badge: crop
group: place
```

## 12 Rows that hold rows: a child's own fields are in its open part

```booklet query
from: plots
as: table
fields: name, stage
```

## 13 The same as a list, then as cards

```booklet query
from: plots
as: list
label: name
fields: stage
```

```booklet query
from: plots
as: cards
label: name
fields: stage
```

## 14 Rows that hold rows, with a group: it is not drawn on a nested view

```booklet query
from: plots
as: table
fields: name, stage
group: stage
```

## 15 Rows nested by parent, with a group: not drawn either

```booklet query
from: tasks
as: list
label: job
group: who
```

## 16 Every field is on the line: nothing opens

```booklet query
from: beds
as: table
fields: bed, size, place, note, crop, owner
```

## 17 Hostile field names and odd values

```booklet query
from: odd
as: table
fields: bed
group: place
```

> [!data] Data

```booklet data
{ "fields": { "bed": "Bed", "size": "Size", "place": "Place", "note": "Note", "owner": "Owner", "crop": "Crop" },
  "rows": [
    { "id": "b1", "bed": "North bed", "size": 12, "place": "Orchard", "note": "Line one\nLine two", "owner": "Ann", "crop": "garlic" },
    { "id": "b2", "bed": "East bed", "size": 2, "place": "Yard", "note": "", "owner": "Bo", "crop": "leeks" },
    { "bed": "Herb pot", "size": 0, "place": "Orchard", "crop": "mint" },
    { "bed": "Cold frame", "size": 7, "place": "Yard", "note": "Lid is cracked", "crop": "kale" } ] }
```
^beds

```booklet data
{ "rows": [
    { "bed": "One", "a": 1 },
    { "bed": "Two", "a": 2, "b": "extra", "c": "more" },
    { "bed": "Three" } ] }
```
^ragged

```booklet data
{ "fields": { "name": "Name", "stage": "Stage", "owner": "Owner", "jobs": "Jobs", "steps": "Steps", "about": "About" },
  "rows": [
    { "id": "p1", "name": "Orchard", "stage": "growing", "owner": "Ann", "about": "Apples",
      "jobs": [ { "id": "j1", "name": "Prune", "stage": "growing", "owner": "Cy", "steps": [ { "id": "s1", "name": "Ladder", "stage": "plan", "owner": "Di" } ] },
                { "id": "j2", "name": "Stake", "stage": "plan" } ] },
    { "id": "p2", "name": "Shed", "stage": "done" },
    { "id": "p3", "name": "Beds", "stage": "growing", "owner": "Ed" } ] }
```
^plots

```booklet data
{ "rows": [
    { "id": "t1", "job": "Dig", "who": "Ann", "hours": 3 },
    { "id": "t2", "job": "Edge", "who": "Bo", "parent": "t1", "hours": 1 },
    { "id": "t3", "job": "Water", "who": "Ann" } ] }
```
^tasks

```booklet data
{ "rows": [
    { "bed": "Plain", "place": "x", "tags": ["a", "b"], "flag": true, "n": 0, "nothing": null, "empty": "" },
    { "bed": "Quoted", "place": "y", "a\"b": "quote <b>x</b>" },
    { "bed": "Third", "place": "x" } ] }
```
^odd

> [!module|rows end]
