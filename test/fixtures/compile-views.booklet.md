---
booklet: "0.17"
id: fixture/compile-views
title: A small bakery's week
lang: en
version: "0.1"
---

# A small bakery's week

A made-up booklet for the compiler's views test. Every view is drawn here from a data block, with and without `group:`, with an `empty:` line and without, then queries over kept entries and answers, which the compiler draws empty. Everything in it is invented.

> [!module|bakery] A small bakery's week

> [!activity|week] The week

## Tiles

```booklet query
from: tiles
as: tiles
value: count
label: what
note: since
tone: tone
icon: pic
```

```booklet data
{ "rows": [
  { "what": "Loaves baked", "count": 140, "since": "since Monday", "tone": "good", "pic": "check" },
  { "what": "Trays left over", "count": 3, "since": "tonight", "tone": "warn" },
  { "what": "Ovens broken", "count": 1, "tone": "bad", "pic": "not-an-icon-name" },
  { "what": "Regulars in", "count": 62 } ] }
```
^tiles

## Tiles, grouped

```booklet query
from: tiles
as: tiles
value: count
label: what
group: tone
```

## Cards

```booklet query
from: stock
as: cards
label: item
note: where
badge: kind
value: left
tone: tone
link: link
```

```booklet data
{ "fields": { "item": "Item", "where": "Where", "kind": "Kind", "left": "Left", "tone": "Tone", "link": "Link", "shelf": "Shelf" },
  "rows": [
    { "item": "Rye flour", "where": "Back store", "kind": "flour", "left": 12, "tone": "good", "link": "#Missing heading", "shelf": "B2" },
    { "item": "Yeast", "where": "Fridge", "kind": "culture", "left": 2, "tone": "warn", "link": "https://example.org/yeast?a=1&b=2", "shelf": "F1" },
    { "item": "Salt", "where": "Front", "kind": "seasoning", "left": 0, "tone": "bad", "link": "javascript:alert(1)", "shelf": "F3" },
    { "item": "<script>qzxhostile()</script>", "where": "Back store", "kind": "<b>bold</b>", "left": "plenty", "link": "week-2.booklet.md", "shelf": "B9" },
    { "item": "Sunflower seeds", "where": "Front", "kind": "seed", "left": 7 } ] }
```
^stock

## Cards, grouped

```booklet query
from: stock
as: cards
label: item
group: where
fields: shelf
```

## Table

```booklet query
from: stock
as: table
fields: item, left, kind, shelf
badge: kind
tone: tone
```

## Table, grouped, limited

```booklet query
from: stock
as: table
group: where
limit: 4
```

## List

```booklet query
from: stock
as: list
label: item
value: left
badge: kind
note: where
fields: shelf
```

## List, grouped

```booklet query
from: stock
as: list
label: item
group: where
```

## Nested list

```booklet query
from: jobs
as: list
```

```booklet data
{ "fields": { "id": "Id", "parent": "Parent", "label": "Job", "badge": "Kind", "value": "Hours", "tone": "Tone" },
  "rows": [
    { "id": "open", "label": "Open the shop", "value": 5 },
    { "id": "bake", "parent": "open", "label": "Bake", "value": 3, "badge": "oven" },
    { "id": "rolls", "parent": "bake", "label": "Rolls", "value": 1, "tone": "good" },
    { "id": "rye", "parent": "bake", "label": "Rye", "value": 2, "tone": "warn" },
    { "id": "sign", "parent": "open", "label": "Hang the sign", "value": 1 },
    { "id": "close", "label": "Close up", "value": 2, "tone": "bad" } ] }
```
^jobs

## Bars

```booklet query
from: sales
as: bars
label: day
value: loaves
tone: tone
```

```booklet data
{ "fields": { "day": "Day", "loaves": "Loaves", "tone": "Tone" },
  "rows": [
    { "day": "Mon", "loaves": 40, "tone": "good" },
    { "day": "Tue", "loaves": 25, "tone": "warn" },
    { "day": "Wed", "loaves": -10, "tone": "bad" },
    { "day": "Thu", "loaves": 0 },
    { "day": "Fri", "loaves": "closed" } ] }
```
^sales

## Bars, grouped

```booklet query
from: sales
as: bars
label: day
value: loaves
group: tone
```

## One line

```booklet query
from: temps
as: line
label: day
fields: oven, shop
```

```booklet data
{ "fields": { "day": "Day", "oven": "Oven (C)", "shop": "Shop (C)" },
  "rows": [
    { "day": "Mon", "oven": 220, "shop": 18 },
    { "day": "Tue", "oven": 230, "shop": null },
    { "day": "Wed", "oven": 210, "shop": 21 },
    { "day": "Thu", "oven": null, "shop": 19 },
    { "day": "Fri", "oven": 240, "shop": 22 } ] }
```
^temps

## A line of one point

```booklet query
from: lonely
as: line
label: day
fields: oven
```

```booklet data
[ { "day": "Mon", "oven": 220 } ]
```
^lonely

## Fields that are also roles

A field named in `fields:` that also plays a role is drawn once, as the role.

```booklet query
from: stock
as: cards
fields: item, left
```

```booklet query
from: stock
as: list
label: item
value: left
fields: item, left, shelf
```

## Five series

```booklet query
from: weekly
as: line
label: day
fields: loaves, rolls, rye, buns, tarts
```

```booklet data
{ "fields": { "day": "Day", "loaves": "Loaves", "rolls": "Rolls", "rye": "Rye", "buns": "Buns", "tarts": "Tarts" },
  "rows": [
    { "day": "Mon", "loaves": 40, "rolls": 30, "rye": 12, "buns": 22, "tarts": 8 },
    { "day": "Tue", "loaves": 35, "rolls": 28, "rye": 15, "buns": 20, "tarts": 11 },
    { "day": "Wed", "loaves": 38, "rolls": 33, "rye": 9, "buns": 25, "tarts": 6 },
    { "day": "Thu", "loaves": 42, "rolls": 29, "rye": 14, "buns": 18, "tarts": 10 } ] }
```
^weekly

## Numbers no picture can use

```booklet query
from: tiny
as: bars
label: what
value: n
```

```booklet data
[ { "what": "A", "n": 1e-300 }, { "what": "B", "n": 2e-300 } ]
```
^tiny

```booklet query
from: huge
as: line
label: what
fields: n
```

```booklet data
[ { "what": "A", "n": 1e300 }, { "what": "B", "n": -1e300 }, { "what": "C", "n": 5 } ]
```
^huge

## Keys with quotes, and names an object has

```booklet query
from: odd
as: cards
label: name
link: web
fields: a"b, constructor, toString
```

```booklet data
[ { "name": "One", "web": "https://example.org/\"x=\"y", "a\"b": "quoted key", "constructor": "own" },
  { "name": "Two", "a\"b": "second" } ]
```
^odd

```booklet query
from: odd
as: table
fields: name, constructor, toString, a"b
```

## Nothing here, with a line of its own

```booklet query
from: empty
as: cards
empty: No orders yet.
```

## Nothing here, without

```booklet query
from: empty
as: table
```

```booklet data
{ "rows": [] }
```
^empty

## Kept entries and answers

These are drawn empty: the compiler never reads what a reader kept.

> [!activity|orders repeat] Each order

> [!text|loaf] Which loaf?

> [!number|qty min:0] How many?

> [!activity|after] After

```booklet query
from: orders
as: table
empty: Orders are kept in the app.
```

```booklet query
from: orders
as: cards
```

```booklet query
from: orders
summary: on
empty: Summaries are not drawn here.
```

```booklet query
from: orders
summary: on
```

```booklet query
from: loaf
as: list
```

> [!module|bakery end] End of A small bakery's week

%%
> [!records] App record — do not edit below this line

> [!records|bakery] A small bakery's week

```booklet answers
{ "loaf": "qzxrecanswer seeded rye", "qzxrecghostkey": "qzxrecghostvalue" }
```

```booklet entries orders
{"items": [
{"ts": "2026-10-01T08:00:00Z", "loaf": "qzxrecentryone sourdough", "qty": 31415},
{"ts": "2026-10-02T08:00:00Z", "loaf": "qzxrecentrytwo baguette", "qty": 27182}
]}
```

```booklet draft orders
{"loaf": "qzxrecdraft half typed"}
```
%%
