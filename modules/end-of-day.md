---
booklet: 0.2
id: example/end-of-day
title: End of day
lang: en
version: "0.1"
---

# End of day

A worked example of a module, and the fixture the engine's tests run against.
Nothing about it is special: it is a booklet activity like any other, and it
exists here so that the renderer is exercised by something that belongs to
nobody in particular.

It uses both engines that need a widget — `svg-regions` for the desk, and
`grid-select` for the effort/impact map — plus a plain question and repeated
one-line entries.

## Adding it to a booklet

Open this file on its own, or copy everything below the front matter into
your own booklet, above the long rule.

> [!module|example-end-of-day] End of day

Five minutes, once, before you shut the laptop.

> [!activity|eod repeat] End of day

Nothing here is scored and nothing is sent anywhere. Skip whatever does not apply.

> [!widget|desk skippable] Desk check
> ![[#^desk-check]]

```booklet widget
{ "engine": "svg-regions", "title": "Desk check",
  "figures": [
    { "id": "desk", "label": "Desk", "regions": ["screen","keyboard","lamp","clutter"],
      "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='screen' x='60' y='12' width='80' height='50' rx='4'/><rect class='rg' data-r='keyboard' x='55' y='74' width='90' height='22' rx='3'/><rect class='rg' data-r='lamp' x='12' y='20' width='30' height='60' rx='6'/><rect class='rg' data-r='clutter' x='152' y='70' width='36' height='40' rx='4'/></svg>" },
    { "id": "chair", "label": "Chair", "regions": ["seat","back","armrests"],
      "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='back' x='70' y='10' width='60' height='55' rx='6'/><rect class='rg' data-r='seat' x='62' y='70' width='76' height='24' rx='5'/><rect class='rg' data-r='armrests' x='40' y='66' width='18' height='34' rx='5'/></svg>" }
  ],
  "chips": ["lighting"],
  "regions": [
    { "id": "screen", "label": "Screen" }, { "id": "keyboard", "label": "Keyboard" },
    { "id": "lamp", "label": "Lamp" }, { "id": "clutter", "label": "The pile" },
    { "id": "seat", "label": "Seat" }, { "id": "back", "label": "Backrest" },
    { "id": "armrests", "label": "Armrests" }, { "id": "lighting", "label": "Lighting overall" }
  ],
  "senses": [
    { "id": "wrong", "label": "Needs attention",
      "words": [ { "id": "wrong:0", "label": "too low" }, { "id": "wrong:1", "label": "too high" },
                 { "id": "wrong:2", "label": "too far" }, { "id": "wrong:3", "label": "cluttered" } ] },
    { "id": "noting", "label": "Just noting",
      "words": [ { "id": "noting:0", "label": "changed recently" }, { "id": "noting:1", "label": "worth a photo" } ] },
    { "id": "right", "label": "Working well",
      "words": [ { "id": "right:0", "label": "comfortable" }, { "id": "right:1", "label": "easy to reach" } ] }
  ],
  "copy": { "h": "Desk check", "p": "Tap anything you notice, then pick the words that fit.",
    "skip": "Skip the desk this time", "unskip": "Use the desk check", "pick": "What about it?",
    "clear": "Clear this one", "none": "Nothing selected yet — tap the drawing, or a button under it.",
    "sideLbl": "Desk or chair" }
}
```
^desk-check

> [!widget|work] Effort and impact
> ![[#^effort-impact]]

```booklet widget
{ "engine": "grid-select", "title": "Effort and impact",
  "axes": { "top": "more effort", "bottom": "less effort", "left": "less payoff", "right": "more payoff" },
  "cells": [
    { "id": "slog", "label": "Slog", "note": "Costly, and not worth much. Worth asking whether it has to happen at all.",
      "color": { "tint": "#E4DCD6", "deep": "#6B5648" } },
    { "id": "project", "label": "Project", "note": "Costly but worth it. These are the ones to plan rather than squeeze in.",
      "color": { "tint": "#DCE7D2", "deep": "#4F6B3A" } },
    { "id": "filler", "label": "Filler", "note": "Cheap and low payoff. Fine when you have ten minutes and no momentum.",
      "color": { "tint": "#DEE2E6", "deep": "#465B66" } },
    { "id": "quickwin", "label": "Quick win", "note": "Cheap and worth it. Do these first; they buy the room for everything else.",
      "color": { "tint": "#D5E3E1", "deep": "#166B63" } }
  ],
  "items": [
    { "id": "rewrite", "cell": "slog", "label": "Rewrite from scratch" },
    { "id": "chase", "cell": "slog", "label": "Chase a reply" },
    { "id": "migrate", "cell": "project", "label": "Migrate something" },
    { "id": "learn", "cell": "project", "label": "Learn the tool properly" },
    { "id": "tidy", "cell": "filler", "label": "Tidy up" },
    { "id": "skim", "cell": "filler", "label": "Skim the backlog" },
    { "id": "reply", "cell": "quickwin", "label": "Send the one-line reply" },
    { "id": "unblock", "cell": "quickwin", "label": "Unblock someone" }
  ],
  "copy": { "h": "Effort and impact", "p": "Tap whatever you did, or plan to. More than one is normal." }
}
```
^effort-impact

> [!text|snag] What got in the way?
> One sentence is plenty.

> [!lines|lines] Worth remembering
> A short line, no explanation.

> [!module|example-end-of-day end] End of End of day
