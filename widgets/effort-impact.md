---
widget: example/effort-impact
version: 0.1
status: approved
lang: en
---

# Effort and impact

A `grid-select` widget: two axes crossed into four cells, each holding words
you tap. **It has no graphics at all** — four cells, eight words and two axis
labels, well under 2KB, which is why a widget can ride inside every saved file
rather than being fetched from somewhere.

Each cell carries its own colour, so the engine needs no stylesheet that knows
what "quick-win" means.

------------------------------------------------------------

```json
{ "block": "widget",
 "id": "example/effort-impact",
 "version": "0.1",
 "engine": "grid-select",
 "title": { "en": "Effort and impact", "fr": "Effort et impact" },
 "axes": {
  "top": { "en": "more effort", "fr": "plus d'effort" },
  "bottom": { "en": "less effort", "fr": "moins d'effort" },
  "left": { "en": "less payoff", "fr": "moins de retombées" },
  "right": { "en": "more payoff", "fr": "plus de retombées" }
 },
 "cells": [
  { "id": "slog", "label": { "en": "Slog", "fr": "Corvée" },
    "note": { "en": "Costly, and not worth much. Worth asking whether it has to happen at all.",
              "fr": "Coûteux et peu rentable. À se demander si c'est vraiment nécessaire." },
    "color": { "tint": "#E4DCD6", "deep": "#6B5648" } },
  { "id": "project", "label": { "en": "Project", "fr": "Projet" },
    "note": { "en": "Costly but worth it. These are the ones to plan rather than squeeze in.",
              "fr": "Coûteux mais rentable. À planifier plutôt qu'à caser." },
    "color": { "tint": "#DCE7D2", "deep": "#4F6B3A" } },
  { "id": "filler", "label": { "en": "Filler", "fr": "Bouche-trou" },
    "note": { "en": "Cheap and low payoff. Fine when you have ten minutes and no momentum.",
              "fr": "Rapide et peu rentable. Parfait pour dix minutes sans élan." },
    "color": { "tint": "#DEE2E6", "deep": "#465B66" } },
  { "id": "quickwin", "label": { "en": "Quick win", "fr": "Gain rapide" },
    "note": { "en": "Cheap and worth it. Do these first; they buy the room for everything else.",
              "fr": "Rapide et rentable. À faire en premier : ça dégage de la place." },
    "color": { "tint": "#D5E3E1", "deep": "#166B63" } }
 ],
 "items": [
  { "id": "rewrite", "cell": "slog", "label": { "en": "Rewrite from scratch", "fr": "Tout réécrire" } },
  { "id": "chase", "cell": "slog", "label": { "en": "Chase a reply", "fr": "Relancer sans réponse" } },
  { "id": "migrate", "cell": "project", "label": { "en": "Migrate something", "fr": "Migrer quelque chose" } },
  { "id": "learn", "cell": "project", "label": { "en": "Learn the tool properly", "fr": "Apprendre l'outil à fond" } },
  { "id": "tidy", "cell": "filler", "label": { "en": "Tidy up", "fr": "Ranger" } },
  { "id": "skim", "cell": "filler", "label": { "en": "Skim the backlog", "fr": "Survoler l'arriéré" } },
  { "id": "reply", "cell": "quickwin", "label": { "en": "Send the one-line reply", "fr": "Envoyer la réponse d'une ligne" } },
  { "id": "unblock", "cell": "quickwin", "label": { "en": "Unblock someone", "fr": "Débloquer quelqu'un" } }
 ],
 "copy": {
  "en": { "h": "Effort and impact", "p": "Tap whatever you did, or plan to. More than one is normal." },
  "fr": { "h": "Effort et impact", "p": "Touchez ce que vous avez fait ou prévoyez. Plusieurs, c'est normal." }
 }
}
```
