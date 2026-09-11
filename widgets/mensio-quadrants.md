---
widget: mensio/quadrants
version: 0.1
engine: grid-select
status: approved
approved: 2026-09-11
lang: en
---

# Four quadrants of feeling

Feelings on two dimensions — activation and pleasantness — crossed into four cells: Invigorating, Soothing, Agitating, Draining. Select as many as fit; a single moment usually sits in more than one.

**It has no graphics at all.** Four CSS cells and a vocabulary: two axis labels, four cell names, and the words in each. Under 1KB.

## Adding it to a booklet

A widget is data, not code: the renderer holds the **engine** (`grid-select`) and
this file holds everything that specialises it. Paste the block below into a
booklet under the long rule, or add the module that uses it — a module carries
the widgets its blocks reference, so this file is rarely pasted on its own.

**It rides in the save file.** Hand someone your booklet and the widget goes
with it, so the page draws for them even if they have never seen this widget
before.

## The block

```json
{
 "block": "widget",
 "id": "mensio/quadrants",
 "version": "0.1",
 "engine": "grid-select",
 "title": {
  "en": "Four quadrants of feeling",
  "fr": "Quatre quadrants de l’émotion"
 },
 "axes": {
  "top": {
   "en": "more activated",
   "fr": "plus activé·e"
  },
  "bottom": {
   "en": "less activated",
   "fr": "moins activé·e"
  },
  "left": {
   "en": "more unpleasant",
   "fr": "plus désagréable"
  },
  "right": {
   "en": "more pleasant",
   "fr": "plus agréable"
  }
 },
 "cells": [
  {
   "id": "agitating",
   "label": {
    "en": "Agitating",
    "fr": "Agitant"
   },
   "note": {
    "en": "Activated and unpleasant. Anger, frustration, anxiety, fear. These feelings push for a response — fight, fix, escape, prepare. Uncomfortable, and often useful.",
    "fr": "Activé et désagréable. Colère, frustration, anxiété, peur. Ces émotions poussent à réagir — combattre, réparer, fuir, se préparer. Inconfortables, et souvent utiles."
   },
   "color": {
    "tint": "#F0D9CF",
    "deep": "#A04E34"
   }
  },
  {
   "id": "energizing",
   "label": {
    "en": "Invigorating",
    "fr": "Revigorant"
   },
   "note": {
    "en": "Activated and pleasant. Motivation, drive, curiosity, joy, enthusiasm. These feelings pull you toward things and make effort feel possible.",
    "fr": "Activé et agréable. Motivation, élan, curiosité, joie, enthousiasme. Ces émotions vous attirent vers les choses et rendent l’effort possible."
   },
   "color": {
    "tint": "#DCE7D2",
    "deep": "#4F6B3A"
   }
  },
  {
   "id": "draining",
   "label": {
    "en": "Draining",
    "fr": "Épuisant"
   },
   "note": {
    "en": "Less activated and unpleasant. Sadness, grief, shame, guilt. These feelings slow you down — sometimes to grieve or repair, sometimes further than is helpful.",
    "fr": "Moins activé et désagréable. Tristesse, deuil, honte, culpabilité. Ces émotions vous ralentissent — parfois pour pleurer ou réparer, parfois plus que nécessaire."
   },
   "color": {
    "tint": "#D9DEE2",
    "deep": "#465B66"
   }
  },
  {
   "id": "soothing",
   "label": {
    "en": "Soothing",
    "fr": "Apaisant"
   },
   "note": {
    "en": "Less activated and pleasant. Warmth, comfort, safety, caring, connection. These feelings say that it is all right to rest, and that you are not alone.",
    "fr": "Moins activé et agréable. Chaleur, réconfort, sécurité, sollicitude, lien. Ces émotions disent qu’il est permis de se reposer, et que vous n’êtes pas seul·e."
   },
   "color": {
    "tint": "#D5E3E1",
    "deep": "#166B63"
   }
  }
 ],
 "items": [
  {
   "id": "anger",
   "cell": "agitating",
   "label": {
    "en": "Anger",
    "fr": "Colère"
   }
  },
  {
   "id": "frustration",
   "cell": "agitating",
   "label": {
    "en": "Frustration",
    "fr": "Frustration"
   }
  },
  {
   "id": "anxiety",
   "cell": "agitating",
   "label": {
    "en": "Anxiety / stress",
    "fr": "Anxiété / stress"
   }
  },
  {
   "id": "fear",
   "cell": "agitating",
   "label": {
    "en": "Fear",
    "fr": "Peur"
   }
  },
  {
   "id": "motivation",
   "cell": "energizing",
   "label": {
    "en": "Motivation / drive",
    "fr": "Motivation / élan"
   }
  },
  {
   "id": "curiosity",
   "cell": "energizing",
   "label": {
    "en": "Curiosity / joy",
    "fr": "Curiosité / joie"
   }
  },
  {
   "id": "sadness",
   "cell": "draining",
   "label": {
    "en": "Sadness",
    "fr": "Tristesse"
   }
  },
  {
   "id": "grief",
   "cell": "draining",
   "label": {
    "en": "Grief / shame",
    "fr": "Deuil / honte"
   }
  },
  {
   "id": "warm",
   "cell": "soothing",
   "label": {
    "en": "Warmth / comfort / connection",
    "fr": "Chaleur / réconfort / lien"
   }
  }
 ],
 "copy": {
  "en": {
   "h": "Feelings",
   "p": "Select whatever fits. More than one is normal."
  },
  "fr": {
   "h": "Les émotions",
   "p": "Sélectionnez ce qui convient. En ressentir plusieurs est normal."
  }
 }
}
```
