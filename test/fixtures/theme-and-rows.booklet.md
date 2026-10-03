---
booklet: 0.5
id: fixture/theme-and-rows
title: A garden week
lang: en
version: "0.1"
---

# A garden week

A test fixture and a small example: a booklet that asks for its own look (a theme block) and lays things side by side (rows). Everything here is invented.

```booklet theme
base: daylight
paper: "#eef3f8"
ink: "#14202b"
accent: "#7a1f5c"
font: serif
density: roomy
```

> [!activity|week] The week

Two tables, side by side when there is room and one under the other when there is not.

> [!row]

### Morning jobs

| Day | Job |
| --- | --- |
| Monday | Water the beans |
| Tuesday | Pick the first peas |
| Wednesday | Turn the compost |

### Evening jobs

| Day | Job |
| --- | --- |
| Monday | Cover the seedlings |
| Tuesday | Check the slugs |
| Wednesday | Collect the rainwater |

> [!row end]

Three short cells, one of them a question.

> [!row]

### Weather

Mostly dry, a cold night on Thursday.

### How was the garden?

> [!scale|mood] How did it feel?

0. Neglected
1. Fine
2. Thriving

### A note

> [!text|note] Anything to remember?

> [!row end]

> [!widget|feel] How are the beds?
> ![[#^beds]]

> [!data] Data

```booklet widget
{ "engine": "grid-select", "title": "How the beds are",
  "axes": { "top": "more growth", "bottom": "less growth", "left": "more weeds", "right": "fewer weeds" },
  "cells": [
    { "id": "weedy", "label": "Weedy and growing", "note": "Lots of growth, lots of weeds.", "color": "warm" },
    { "id": "lush", "label": "Lush", "note": "Lots of growth, few weeds.", "color": "green" },
    { "id": "tired", "label": "Tired and weedy", "note": "Little growth, many weeds.", "color": "amber" },
    { "id": "calm", "label": "Calm", "note": "Little growth, few weeds.", "color": "teal" }
  ],
  "items": [
    { "id": "beans", "cell": "lush", "label": "Beans" }, { "id": "peas", "cell": "lush", "label": "Peas" },
    { "id": "kale", "cell": "weedy", "label": "Kale" }, { "id": "carrots", "cell": "tired", "label": "Carrots" },
    { "id": "herbs", "cell": "calm", "label": "Herbs" } ],
  "copy": { "h": "Beds", "p": "Select what fits." } }
```
^beds
