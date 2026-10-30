---
booklet: "0.16"
id: fixture/compile-join
title: A river trail guide
lang: en
version: "0.1"
---

# A river trail guide

A made-up booklet for the compiler's join test. It has a contents page, one deep page where every part of the compiler meets, and one quiet page of prose.

> [!module|river] A river trail guide

> [!activity|deep] Reading the river

How a river speaks to a walker, in three tabs: what to see, where to look on the body and the water, and the numbers.[^guide]

> [!tab|see] What to see

## First look

Stand on the bank and watch the surface.[^eddy] A calm patch next to a fast one is an eddy, and a line of foam marks the seam between them. See also the [[#Gauge readings]] further on.

> [!note]- Why foam gathers
> Foam gathers where two currents meet and slow down.

> [!tip]- The seam, up close
> A seam is where slow water and fast water touch, one inside the other.

### A short check

> [!choice|speed] Which water is moving fastest?
- [ ] The calm patch by the bank
  - Not quite: the patch by the bank is the slow one.
- [x] The channel in the middle
  - Yes: the middle of a channel runs fastest.
- [ ] The foam line
  - The foam line only marks where two currents meet.

> [!hint]- Hint
> Think about where a boat would be pushed along hardest.

> [!solution]- Solution
> The middle of the channel, because the banks drag on the water.

> [!tab|body] Where you notice it

> [!widget|body-map readonly describe] Where do you notice a cold bank?
> ![[#^body-map]]

## Cold and wet

A cold bank is felt first in the hands and the feet, then the chest.[^cold]

> [!multi|signs] Which of these are signs of a cold bank?
- [x] Numb fingers
  - Numb fingers are the first sign.
- [ ] A warm face
  - A warm face is not a sign of cold.
- [x] Slow, clumsy steps

> [!tab|numbers] The numbers

## Gauge readings

Heights of the water at five made-up gauges, in metres.

```booklet query
from: gauges
as: table
fields: gauge, height, trend
```

```booklet query
from: gauges
as: bars
label: gauge
value: height
```

Days of rain over a made-up week, as a line.

```booklet query
from: rain
as: line
label: day
fields: mm
```

```booklet data
{ "rows": [ { "day": "Mon", "mm": 2 }, { "day": "Tue", "mm": 9 }, { "day": "Wed", "mm": 4 }, { "day": "Thu", "mm": 0 } ] }
```
^rain

```booklet data
{ "fields": { "gauge": "Gauge", "height": "Height", "trend": "Trend" },
  "rows": [
    { "gauge": "Alder Weir", "height": 2.5, "trend": "rising" },
    { "gauge": "Birch Ford", "height": 1.25, "trend": "steady" },
    { "gauge": "Cedar Bend", "height": 4.75, "trend": "falling" },
    { "gauge": "Dogwood Lock", "height": 3, "trend": "rising" },
    { "gauge": "Elm Sluice", "height": 0.5, "trend": "steady" } ] }
```
^gauges

> [!note]- How the flow goes
> Open this to see the drawing of the flow, and a second fold inside it.
>
> ```mermaid
> flowchart LR
>   Spring --> Stream --> River --> Sea
> ```
>
> A river loses height all the way down, and the drawing above shows where it goes.[^fall]

> [!activity|quiet] A quiet page

Only words here: a river is a long, moving body of water, and it has a bank on either side. There is nothing to press on this page, so it asks for no script.

> [!module|river end] End of A river trail guide

> [!data|river] Data for A river trail guide

```booklet widget
{ "engine": "svg-regions",
  "figures": [
    { "id": "front", "label": "Front",
      "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 160\" aria-hidden=\"true\" focusable=\"false\">\n  <ellipse class=\"outline\" cx=\"50\" cy=\"20\" rx=\"16\" ry=\"18\"/>\n  <rect class=\"rg\" data-r=\"head\" x=\"30\" y=\"0\" width=\"40\" height=\"40\"/>\n  <path class=\"rg\" data-r=\"chest\" d=\"M30 44 Q50 38 70 44 L68 84 Q50 90 32 84 Z\"/>\n  <rect class=\"rg\" id=\"cold-hands\" data-r=\"hands\" x=\"6\" y=\"60\" width=\"20\" height=\"30\"/>\n</svg>",
      "regions": ["head", "chest", "hands"] } ],
  "regions": [
    { "id": "head", "label": "Head" },
    { "id": "chest", "label": "Chest" },
    { "id": "hands", "label": "Hands" } ],
  "senses": [ { "id": "cold", "words": [ { "id": "numb", "label": "Numb" } ] } ],
  "copy": { "h": "Body map", "p": "Point to where you feel it." } }
```
^body-map

[^guide]: *The Slow River Handbook*, 3rd edition (2021), p. 4: "Learn the bank before the water." Verified 2026-09-14.
[^eddy]: *The Slow River Handbook*, p. 19: "An eddy turns against the stream."
[^fall]: *The Slow River Handbook*, p. 52: "A river loses a little height every mile."
[^cold]: *A Walker's Guide to Cold Water*, p. 77: "The hands go first."
