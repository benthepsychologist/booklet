---
booklet: 0.2
id: mensio/check-in
title: A mindful check-in
lang: en
version: "0.1"
copyright: "© 2026 Benjamin F. Armstrong III. All rights reserved."
license: "Free to copy and share, unmodified and with this notice intact. Not licensed for modification or for redistribution in altered form. This grant covers this version; later versions may differ."
source: "https://benthepsychologist.com/tools/activity-kit/"
---

# A mindful check-in

Body, feelings, thoughts — noticed, named and kept, in that order and with
nothing wedged between them. The body map is two figures, front and back;
feelings come from the four energy/valence quadrants; thoughts are bare
headlines with no explanation attached.

## Adding it to a booklet

Open this file on its own, or copy everything below the front matter into
your own booklet, above the long rule. If your booklet already has a module
with this id, this one replaces it in place, which is how you take an update.
**Your entries stay either way** — they live in their own records, keyed by
the activity, so putting the module back brings them back with it.

> [!module|mensio-check-in] A mindful check-in

Body, feelings, thoughts — noticed, named, kept.

> [!activity|checkin repeat] Mindful check-in

Notice, name, keep. Nothing here needs to be explained or fixed.

> [!widget|body skippable] Body
> ![[#^body-map]]

```booklet widget
{ "engine": "svg-regions", "title": "Body",
  "figures": [
    { "id": "front", "label": "Front", "regions": ["head","jaw","neck","shoulders","chest","arms","stomach","hips","legs","feet"],
      "svg": "\n<svg viewBox=\"0 0 200 440\" class=\"bodyfig\" aria-hidden=\"true\" focusable=\"false\">\n  <defs><clipPath id=\"headclipF\"><ellipse cx=\"100\" cy=\"40\" rx=\"27\" ry=\"31\"/></clipPath></defs>\n  <g clip-path=\"url(#headclipF)\">\n    <rect class=\"rg\" data-r=\"head\" x=\"70\" y=\"6\" width=\"60\" height=\"42\"/>\n    <rect class=\"rg\" data-r=\"jaw\"  x=\"70\" y=\"48\" width=\"60\" height=\"26\"/>\n  </g>\n  <ellipse class=\"outline\" cx=\"100\" cy=\"40\" rx=\"27\" ry=\"31\"/>\n  <rect    class=\"rg\" data-r=\"neck\" x=\"87\" y=\"69\" width=\"26\" height=\"22\" rx=\"9\"/>\n  <path    class=\"rg\" data-r=\"shoulders\" d=\"M54 100 Q100 84 146 100 L146 120 Q100 106 54 120 Z\"/>\n  <path    class=\"rg\" data-r=\"chest\" d=\"M58 120 Q100 108 142 120 L140 172 Q100 182 60 172 Z\"/>\n  <path    class=\"rg\" data-r=\"stomach\" d=\"M60 172 Q100 182 140 172 L138 228 Q100 238 62 228 Z\"/>\n  <path    class=\"rg\" data-r=\"arms\" d=\"M50 102 Q37 105 35 124 L27 214 Q25 230 40 232 Q51 232 53 215 L60 134 Z\"/>\n  <path    class=\"rg\" data-r=\"arms\" d=\"M150 102 Q163 105 165 124 L173 214 Q175 230 160 232 Q149 232 147 215 L140 134 Z\"/>\n  <path    class=\"rg\" data-r=\"hips\" d=\"M62 228 Q100 238 138 228 L136 266 Q100 276 64 266 Z\"/>\n  <path    class=\"rg\" data-r=\"legs\" d=\"M64 266 Q82 274 98 270 L94 388 Q84 394 74 388 Z\"/>\n  <path    class=\"rg\" data-r=\"legs\" d=\"M136 266 Q118 274 102 270 L106 388 Q116 394 126 388 Z\"/>\n  <path    class=\"rg\" data-r=\"feet\" d=\"M74 388 Q84 394 94 388 L96 414 Q84 420 72 414 Z\"/>\n  <path    class=\"rg\" data-r=\"feet\" d=\"M126 388 Q116 394 106 388 L104 414 Q116 420 128 414 Z\"/>\n</svg>" },
    { "id": "back", "label": "Back", "regions": ["head","neck","shoulders","back","lowerback","arms","hips","legs","feet"],
      "svg": "\n<svg viewBox=\"0 0 200 440\" class=\"bodyfig\" aria-hidden=\"true\" focusable=\"false\">\n  <ellipse class=\"rg\" data-r=\"head\" cx=\"100\" cy=\"40\" rx=\"27\" ry=\"31\"/>\n  <rect    class=\"rg\" data-r=\"neck\" x=\"87\" y=\"69\" width=\"26\" height=\"22\" rx=\"9\"/>\n  <path    class=\"rg\" data-r=\"shoulders\" d=\"M54 100 Q100 84 146 100 L146 120 Q100 106 54 120 Z\"/>\n  <path    class=\"rg\" data-r=\"back\" d=\"M58 120 Q100 108 142 120 L140 178 Q100 188 60 178 Z\"/>\n  <path    class=\"rg\" data-r=\"lowerback\" d=\"M60 178 Q100 188 140 178 L138 228 Q100 238 62 228 Z\"/>\n  <path    class=\"rg\" data-r=\"arms\" d=\"M50 102 Q37 105 35 124 L27 214 Q25 230 40 232 Q51 232 53 215 L60 134 Z\"/>\n  <path    class=\"rg\" data-r=\"arms\" d=\"M150 102 Q163 105 165 124 L173 214 Q175 230 160 232 Q149 232 147 215 L140 134 Z\"/>\n  <path    class=\"rg\" data-r=\"hips\" d=\"M62 228 Q100 238 138 228 L136 266 Q100 276 64 266 Z\"/>\n  <path    class=\"rg\" data-r=\"legs\" d=\"M64 266 Q82 274 98 270 L94 388 Q84 394 74 388 Z\"/>\n  <path    class=\"rg\" data-r=\"legs\" d=\"M136 266 Q118 274 102 270 L106 388 Q116 394 126 388 Z\"/>\n  <path    class=\"rg\" data-r=\"feet\" d=\"M74 388 Q84 394 94 388 L96 414 Q84 420 72 414 Z\"/>\n  <path    class=\"rg\" data-r=\"feet\" d=\"M126 388 Q116 394 106 388 L104 414 Q116 420 128 414 Z\"/>\n</svg>" }
  ],
  "chips": ["allover"],
  "regions": [
    { "id": "head", "label": "Head" }, { "id": "jaw", "label": "Jaw and face" }, { "id": "neck", "label": "Neck and throat" },
    { "id": "shoulders", "label": "Shoulders" }, { "id": "chest", "label": "Chest" }, { "id": "arms", "label": "Arms and hands" },
    { "id": "stomach", "label": "Stomach" }, { "id": "hips", "label": "Hips" }, { "id": "legs", "label": "Legs" },
    { "id": "feet", "label": "Feet" }, { "id": "back", "label": "Upper back" }, { "id": "lowerback", "label": "Lower back" },
    { "id": "allover", "label": "All over" }
  ],
  "senses": [
    { "id": "unpleasant", "label": "Uncomfortable",
      "words": [ {"id":"unpleasant:0","label":"tense"},{"id":"unpleasant:1","label":"tight"},{"id":"unpleasant:2","label":"bracing"},
                 {"id":"unpleasant:3","label":"aching"},{"id":"unpleasant:4","label":"heavy"},{"id":"unpleasant:5","label":"restless"},
                 {"id":"unpleasant:6","label":"buzzing"},{"id":"unpleasant:7","label":"churning"},{"id":"unpleasant:8","label":"numb"},
                 {"id":"unpleasant:9","label":"hot"},{"id":"unpleasant:10","label":"cold"},{"id":"unpleasant:11","label":"fluttery"} ] },
    { "id": "noticing", "label": "Just noticing",
      "words": [ {"id":"noticing:0","label":"just noticing"},{"id":"noticing:1","label":"hard to tell"},{"id":"noticing:2","label":"nothing much"} ] },
    { "id": "pleasant", "label": "Comfortable",
      "words": [ {"id":"pleasant:0","label":"settled"},{"id":"pleasant:1","label":"soft"},{"id":"pleasant:2","label":"warm"},
                 {"id":"pleasant:3","label":"easy"},{"id":"pleasant:4","label":"light"},{"id":"pleasant:5","label":"open"} ] }
  ],
  "copy": { "h": "Body", "p": "Tap wherever you notice something, then pick the words that fit. There is nothing to get right here.",
    "stance": "Friendly curiosity, not a check for problems. The question is how you are put together right now, not what is wrong. If it starts to feel like scanning for something to worry about, stop — that is a good instinct, and you can skip this part entirely.",
    "invite": "Invite, don't command. \"Would this part like to soften a little?\" rather than \"relax now\". The point is noticing and allowing, not forcing anything to change.",
    "pick": "What is it like there?", "clear": "Clear this one",
    "none": "Nothing selected yet — tap the figure, or one of the buttons under it.",
    "skip": "Skip the body this time", "unskip": "Use the body map", "sideLbl": "Front or back" }
}
```
^body-map

> [!widget|emotions] Feelings
> ![[#^quadrants]]

```booklet widget
{ "engine": "grid-select", "title": "Four quadrants of feeling",
  "axes": { "top": "more activated", "bottom": "less activated", "left": "more unpleasant", "right": "more pleasant" },
  "cells": [
    { "id": "agitating", "label": "Agitating", "note": "Activated and unpleasant. Anger, frustration, anxiety, fear. These feelings push for a response — fight, fix, escape, prepare. Uncomfortable, and often useful.",
      "color": { "tint": "#F0D9CF", "deep": "#A04E34" } },
    { "id": "energizing", "label": "Invigorating", "note": "Activated and pleasant. Motivation, drive, curiosity, joy, enthusiasm. These feelings pull you toward things and make effort feel possible.",
      "color": { "tint": "#DCE7D2", "deep": "#4F6B3A" } },
    { "id": "draining", "label": "Draining", "note": "Less activated and unpleasant. Sadness, grief, shame, guilt. These feelings slow you down — sometimes to grieve or repair, sometimes further than is helpful.",
      "color": { "tint": "#D9DEE2", "deep": "#465B66" } },
    { "id": "soothing", "label": "Soothing", "note": "Less activated and pleasant. Warmth, comfort, safety, caring, connection. These feelings say that it is all right to rest, and that you are not alone.",
      "color": { "tint": "#D5E3E1", "deep": "#166B63" } }
  ],
  "items": [
    { "id": "anger", "cell": "agitating", "label": "Anger" }, { "id": "frustration", "cell": "agitating", "label": "Frustration" },
    { "id": "anxiety", "cell": "agitating", "label": "Anxiety / stress" }, { "id": "fear", "cell": "agitating", "label": "Fear" },
    { "id": "motivation", "cell": "energizing", "label": "Motivation / drive" }, { "id": "curiosity", "cell": "energizing", "label": "Curiosity / joy" },
    { "id": "sadness", "cell": "draining", "label": "Sadness" }, { "id": "grief", "cell": "draining", "label": "Grief / shame" },
    { "id": "warm", "cell": "soothing", "label": "Warmth / comfort / connection" }
  ],
  "copy": { "h": "Feelings", "p": "Select whatever fits. More than one is normal." }
}
```
^quadrants

> [!text|other] Something else
> In your own words.

> [!lines|thoughts] Mind is thinking about
> Notice, name, keep.

> [!module|mensio-check-in end] End of A mindful check-in
