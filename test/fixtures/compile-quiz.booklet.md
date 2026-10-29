---
booklet: "0.16"
id: fixture/compile-quiz
title: A lighthouse quiz
lang: en
version: "0.1"
---

> [!module|lighthouse] A lighthouse quiz

A made-up booklet for the compiler's tests: every kind of question a compiled page can answer as a quiz, and the ones it leaves read-only.

> [!activity|checks] Quick checks

> [!choice|colour] What colour is the lighthouse lamp's beam at night?
- [ ] Red
  - Not quite: red is for the harbour mouth, not the tower.
- [x] White
  - Yes: a white beam carries furthest over water.
- [ ] Green
  - Green marks the starboard side of a channel.

> [!hint]- Hint
> Think about what carries furthest.

> [!solution]- Solution
> White, because it is the brightest and easiest to see far off.

> [!multi|parts] Which of these are parts of a lighthouse?
- [x] The lantern room
  - The lantern room holds the lamp.
- [ ] The rudder
  - A rudder belongs to a boat.
- [x] The gallery
- [ ] The keel

> [!choice|keeper] Who looked after the lamp?
- [ ] The harbour master
  - The harbour master ran the port.
- [ ] The keeper
  - The keeper trimmed the wick and wound the clockwork.
- [ ] The pilot

> [!multi|views] What would you look for from the gallery?
- [ ] Ships
- [ ] Birds
- [ ] Weather

> [!choice|shape open] Which shape was the oldest tower?
- [ ] Round
- [ ] Square

> [!scale|clear] How clear was that?

0. Not clear
1. Clear

> [!matrix|know] How sure are you of each part?
- The lamp
- The gallery

0. Not yet
1. Sure

> [!number|height min:1 max:200] How tall in metres?

> [!date|built] When was it built?

> [!text|notes] What did you notice?

> [!lines|facts] Facts you learned

> [!text|why each:parts] Why that part?

> [!widget|lamp-feel] The lamp
> ![[#^lamp-grid]]

> [!widget|tower-parts] The tower
> ![[#^tower-places]]

> [!widget|tower-fixed readonly] The tower, read only
> ![[#^tower-places]]

> [!module|lighthouse end] End of A lighthouse quiz

> [!data|lighthouse] Data for A lighthouse quiz

```booklet widget
{ "engine": "grid-select",
  "axes": { "top": "brighter", "bottom": "dimmer", "left": "slower", "right": "faster" },
  "cells": [
    { "id": "slow", "label": "Slow sweep", "note": "A long, patient turn.", "color": "blue" },
    { "id": "fast", "label": "Fast sweep", "note": "A quick flash.", "color": "amber" },
    { "id": "fixed", "label": "Fixed", "note": "No turn at all." },
    { "id": "off", "label": "Dark" } ],
  "items": [
    { "id": "wide", "cell": "slow", "label": "Wide beam" }, { "id": "flash", "cell": "fast", "label": "Flash" },
    { "id": "steady", "cell": "fixed", "label": "Steady" }, { "id": "none", "cell": "off", "label": "Nothing" } ],
  "copy": { "h": "The lamp", "p": "Press what it did." } }
```
^lamp-grid

```booklet widget
{ "engine": "svg-regions",
  "figures": [
    { "id": "side", "label": "Side", "svg": "<svg viewBox=\"0 0 100 100\"><rect class=\"rg\" data-r=\"lamp\" x=\"40\" y=\"5\" width=\"20\" height=\"15\"/><rect class=\"rg\" data-r=\"base\" x=\"30\" y=\"60\" width=\"40\" height=\"35\"/></svg>", "regions": ["lamp", "base"] } ],
  "regions": [
    { "id": "lamp", "label": "Lamp", "note": "Where the light is made." },
    { "id": "base", "label": "Base", "note": "Thick walls hold the tower up." } ],
  "copy": { "h": "Parts", "p": "Press a part." } }
```
^tower-places
