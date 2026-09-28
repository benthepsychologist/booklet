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
 "title": { "en": "Effort and impact", "es": "Esfuerzo e impacto", "fr": "Effort et impact" },
 "axes": {
  "top": { "en": "more effort", "es": "más esfuerzo", "fr": "plus d'effort" },
  "bottom": { "en": "less effort", "es": "menos esfuerzo", "fr": "moins d'effort" },
  "left": { "en": "less payoff", "es": "menos beneficio", "fr": "moins de retombées" },
  "right": { "en": "more payoff", "es": "más beneficio", "fr": "plus de retombées" }
 },
 "cells": [
  { "id": "slog", "label": { "en": "Slog", "es": "Tarea pesada", "fr": "Corvée" },
    "note": { "en": "Costly, and not worth much. Worth asking whether it has to happen at all.",
              "es": "Cuesta mucho y vale poco. Vale la pena preguntarse si de verdad hace falta hacerlo.",
              "fr": "Coûteux et peu rentable. À se demander si c'est vraiment nécessaire." },
    "color": { "tint": "#E4DCD6", "deep": "#6B5648" } },
  { "id": "project", "label": { "en": "Project", "es": "Proyecto", "fr": "Projet" },
    "note": { "en": "Costly but worth it. These are the ones to plan rather than squeeze in.",
              "es": "Cuesta mucho, pero vale la pena. Estos conviene planearlos, no encajarlos donde se pueda.",
              "fr": "Coûteux mais rentable. À planifier plutôt qu'à caser." },
    "color": { "tint": "#DCE7D2", "deep": "#4F6B3A" } },
  { "id": "filler", "label": { "en": "Filler", "es": "Relleno", "fr": "Bouche-trou" },
    "note": { "en": "Cheap and low payoff. Fine when you have ten minutes and no momentum.",
              "es": "Cuesta poco y aporta poco. Está bien cuando tienes diez minutos y te falta impulso.",
              "fr": "Rapide et peu rentable. Parfait pour dix minutes sans élan." },
    "color": { "tint": "#DEE2E6", "deep": "#465B66" } },
  { "id": "quickwin", "label": { "en": "Quick win", "es": "Logro rápido", "fr": "Gain rapide" },
    "note": { "en": "Cheap and worth it. Do these first; they buy the room for everything else.",
              "es": "Cuesta poco y vale la pena. Haz estos primero; te dan margen para todo lo demás.",
              "fr": "Rapide et rentable. À faire en premier : ça dégage de la place." },
    "color": { "tint": "#D5E3E1", "deep": "#166B63" } }
 ],
 "items": [
  { "id": "rewrite", "cell": "slog", "label": { "en": "Rewrite from scratch", "es": "Reescribir desde cero", "fr": "Tout réécrire" } },
  { "id": "chase", "cell": "slog", "label": { "en": "Chase a reply", "es": "Insistir por una respuesta", "fr": "Relancer sans réponse" } },
  { "id": "migrate", "cell": "project", "label": { "en": "Migrate something", "es": "Migrar algo", "fr": "Migrer quelque chose" } },
  { "id": "learn", "cell": "project", "label": { "en": "Learn the tool properly", "es": "Aprender bien la herramienta", "fr": "Apprendre l'outil à fond" } },
  { "id": "tidy", "cell": "filler", "label": { "en": "Tidy up", "es": "Poner orden", "fr": "Ranger" } },
  { "id": "skim", "cell": "filler", "label": { "en": "Skim the backlog", "es": "Hojear los pendientes", "fr": "Survoler l'arriéré" } },
  { "id": "reply", "cell": "quickwin", "label": { "en": "Send the one-line reply", "es": "Enviar la respuesta de una línea", "fr": "Envoyer la réponse d'une ligne" } },
  { "id": "unblock", "cell": "quickwin", "label": { "en": "Unblock someone", "es": "Desbloquear a alguien", "fr": "Débloquer quelqu'un" } }
 ],
 "copy": {
  "en": { "h": "Effort and impact", "p": "Tap whatever you did, or plan to. More than one is normal." },
  "es": { "h": "Esfuerzo e impacto", "p": "Toca lo que hiciste o planeas hacer. Más de uno es normal." },
  "fr": { "h": "Effort et impact", "p": "Touchez ce que vous avez fait ou prévoyez. Plusieurs, c'est normal." }
 }
}
```
