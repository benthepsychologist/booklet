---
booklet: 0.9
id: fixture/charts
title: Allotment charts
lang: en
version: "0.1"
---

# Allotment charts

A test fixture and a small example: charts drawn from rows a generator wrote. The page only
draws them. Everything here is invented.

> [!module|charts] Allotment charts

> [!activity|garden] Charts

## Harvest by crop

Bars, one per row, in the order given. A row's `tone` colours its bar.

```booklet query
from: harvest
as: bars
label: crop
value: kilos
tone: tone
```

```booklet data
{ "fields": { "crop": "Crop", "kilos": "Kilos" },
  "rows": [
    { "crop": "Tomatoes", "kilos": 30.25, "tone": "good" },
    { "crop": "Courgettes", "kilos": 18, "tone": "good" },
    { "crop": "Beans", "kilos": 12.5, "tone": "warn" },
    { "crop": "Apples from the old tree by the north fence", "kilos": 7, "tone": "warn" },
    { "crop": "Carrots", "kilos": 3.75, "tone": "bad" },
    { "crop": "Rhubarb", "kilos": "none yet" } ] }
```
^harvest

## Hours of sunshine

One line, one point per row, in order.

```booklet query
from: sunshine
as: line
label: day
fields: hours
```

```booklet data
{ "fields": { "day": "Day", "hours": "Hours of sun" },
  "rows": [
    { "day": "Mon 1", "hours": 6.5 }, { "day": "Tue 2", "hours": 7 }, { "day": "Wed 3", "hours": 4.25 },
    { "day": "Thu 4", "hours": 2 }, { "day": "Fri 5", "hours": 5.5 }, { "day": "Sat 6", "hours": 8 },
    { "day": "Sun 7", "hours": 8.5 }, { "day": "Mon 8", "hours": 7 }, { "day": "Tue 9", "hours": 3.5 },
    { "day": "Wed 10", "hours": 6 }, { "day": "Thu 11", "hours": 6.75 }, { "day": "Fri 12", "hours": 9 } ] }
```
^sunshine

## Water in the butts, two lines and a gap

Two lines. A reading that was not taken is a gap, not a zero.

```booklet query
from: water
as: line
label: week
fields: north, south
```

```booklet data
{ "fields": { "week": "Week", "north": "North butt (litres)", "south": "South butt (litres)" },
  "rows": [
    { "week": "W1", "north": 180, "south": 120 }, { "week": "W2", "north": 150, "south": 140 },
    { "week": "W3", "north": 90,  "south": null }, { "week": "W4", "north": 60,  "south": 95 },
    { "week": "W5", "north": 140, "south": 110 }, { "week": "W6", "north": 200, "south": 160 } ] }
```
^water

## Nothing to chart

```booklet query
from: nothing
as: bars
empty: No harvest recorded yet.
```

```booklet data
[]
```
^nothing

## A chart beside a table

> [!row]

### Visitors by day

```booklet query
from: visitors
as: bars
label: day
value: count
```

```booklet data
[ { "day": "Mon", "count": 4 }, { "day": "Tue", "count": 9 }, { "day": "Wed", "count": 2 },
  { "day": "Thu", "count": 0 }, { "day": "Fri", "count": 11 } ]
```
^visitors

### Opening times

| Day | Open |
| --- | --- |
| Mon to Fri | 9 to 5 |
| Saturday | 10 to 2 |
| Sunday | Closed |

> [!row end]

## Change from last month

Bars that go both ways: a negative value is drawn leftwards from the zero line.

```booklet query
from: change
as: bars
label: item
value: delta
```

```booklet data
[ { "item": "Seed spend", "delta": -12.5 }, { "item": "Water use", "delta": 8 },
  { "item": "Visitors", "delta": 25 }, { "item": "Slugs", "delta": -30 } ]
```
^change

> [!module|charts end] End of Allotment charts
