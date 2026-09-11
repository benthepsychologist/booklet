---
module: example/end-of-day
version: 0.1
status: approved
lang: en
---

# End of day

A worked example of a module, and the fixture the engine tests run against.
Nothing about it is special: it is a booklet activity like any other, and it
exists here so that the renderer is exercised by something that belongs to
nobody in particular.

It uses both engines that need a widget — `svg-regions` for the desk, and
`grid-select` for the effort/impact map — plus the block types that need none:
a heading, some words, a question, and repeated one-line entries.

**It words its own questions** through `copy.eod`, which is what lets an
activity nobody has heard of ask something nobody has heard of.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file, or paste it
into **Add an activity** in the page's editor. It will bring its widgets with
it.

------------------------------------------------------------

```json
{
 "block": "module",
 "id": "example/end-of-day",
 "version": "0.1",
 "title": {
  "en": "End of day",
  "fr": "Fin de journée"
 },
 "blurb": {
  "en": "Five minutes, once, before you shut the laptop.",
  "fr": "Cinq minutes, une fois, avant de fermer l'ordinateur."
 },
 "display": {
  "order": 10
 },
 "copy": {
  "en": {
   "eod": {
    "h": "End of day",
    "f": {
     "snag": [
      "What got in the way?",
      "One sentence is plenty."
     ]
    },
    "lines": [
     "Worth remembering",
     "A short line, no explanation."
    ]
   }
  },
  "fr": {
   "eod": {
    "h": "Fin de journée",
    "f": {
     "snag": [
      "Qu'est-ce qui a gêné ?",
      "Une phrase suffit."
     ]
    },
    "lines": [
     "À retenir",
     "Une ligne courte, sans explication."
    ]
   }
  }
 },
 "mode": {
  "id": "eod",
  "kind": "entry",
  "accent": "petrol",
  "head": {
   "h": {
    "en": "End of day",
    "fr": "Fin de journée"
   }
  },
  "blocks": [
   {
    "id": "intro",
    "type": "prose",
    "display": {
     "order": 10
    },
    "text": {
     "en": "Nothing here is scored and nothing is sent anywhere. Skip whatever does not apply.",
     "fr": "Rien n'est noté ni transmis. Passez ce qui ne s'applique pas."
    }
   },
   {
    "id": "desk",
    "type": "widget",
    "widget": "example/desk-check",
    "keys": [
     "regions"
    ],
    "skippable": true,
    "display": {
     "order": 20
    }
   },
   {
    "id": "work",
    "type": "widget",
    "widget": "example/effort-impact",
    "keys": [
     "emotions"
    ],
    "display": {
     "order": 30
    }
   },
   {
    "id": "snag",
    "type": "text",
    "q": [
     "eod",
     "snag"
    ],
    "display": {
     "order": 40
    }
   },
   {
    "id": "lines",
    "type": "headlines",
    "q": [
     "eod",
     "lines"
    ],
    "keys": [
     "thoughts"
    ],
    "display": {
     "order": 50,
     "placement": "folded"
    },
    "copy": {
     "en": "Worth remembering",
     "fr": "À retenir"
    }
   }
  ]
 },
 "widgets": [
  {
   "id": "example/desk-check",
   "version": "0.1",
   "engine": "svg-regions",
   "title": {
    "en": "Desk check",
    "fr": "Vérification du poste"
   },
   "figures": [
    {
     "id": "desk",
     "label": {
      "en": "Desk",
      "fr": "Bureau"
     },
     "regions": [
      "screen",
      "keyboard",
      "lamp",
      "clutter"
     ],
     "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='screen' x='60' y='12' width='80' height='50' rx='4'/><rect class='rg' data-r='keyboard' x='55' y='74' width='90' height='22' rx='3'/><rect class='rg' data-r='lamp' x='12' y='20' width='30' height='60' rx='6'/><rect class='rg' data-r='clutter' x='152' y='70' width='36' height='40' rx='4'/></svg>"
    },
    {
     "id": "chair",
     "label": {
      "en": "Chair",
      "fr": "Chaise"
     },
     "regions": [
      "seat",
      "back",
      "armrests"
     ],
     "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='back' x='70' y='10' width='60' height='55' rx='6'/><rect class='rg' data-r='seat' x='62' y='70' width='76' height='24' rx='5'/><rect class='rg' data-r='armrests' x='40' y='66' width='18' height='34' rx='5'/></svg>"
    }
   ],
   "chips": [
    "lighting"
   ],
   "regions": [
    {
     "id": "screen",
     "label": {
      "en": "Screen",
      "fr": "Écran"
     }
    },
    {
     "id": "keyboard",
     "label": {
      "en": "Keyboard",
      "fr": "Clavier"
     }
    },
    {
     "id": "lamp",
     "label": {
      "en": "Lamp",
      "fr": "Lampe"
     }
    },
    {
     "id": "clutter",
     "label": {
      "en": "The pile",
      "fr": "La pile"
     }
    },
    {
     "id": "seat",
     "label": {
      "en": "Seat",
      "fr": "Assise"
     }
    },
    {
     "id": "back",
     "label": {
      "en": "Backrest",
      "fr": "Dossier"
     }
    },
    {
     "id": "armrests",
     "label": {
      "en": "Armrests",
      "fr": "Accoudoirs"
     }
    },
    {
     "id": "lighting",
     "label": {
      "en": "Lighting overall",
      "fr": "Éclairage général"
     }
    }
   ],
   "senses": [
    {
     "id": "wrong",
     "label": {
      "en": "Needs attention",
      "fr": "À revoir"
     },
     "words": [
      {
       "id": "wrong:0",
       "label": {
        "en": "too low",
        "fr": "trop bas"
       }
      },
      {
       "id": "wrong:1",
       "label": {
        "en": "too high",
        "fr": "trop haut"
       }
      },
      {
       "id": "wrong:2",
       "label": {
        "en": "too far",
        "fr": "trop loin"
       }
      },
      {
       "id": "wrong:3",
       "label": {
        "en": "cluttered",
        "fr": "encombré"
       }
      }
     ]
    },
    {
     "id": "noting",
     "label": {
      "en": "Just noting",
      "fr": "Simple constat"
     },
     "words": [
      {
       "id": "noting:0",
       "label": {
        "en": "changed recently",
        "fr": "changé récemment"
       }
      },
      {
       "id": "noting:1",
       "label": {
        "en": "worth a photo",
        "fr": "à photographier"
       }
      }
     ]
    },
    {
     "id": "right",
     "label": {
      "en": "Working well",
      "fr": "Bien réglé"
     },
     "words": [
      {
       "id": "right:0",
       "label": {
        "en": "comfortable",
        "fr": "confortable"
       }
      },
      {
       "id": "right:1",
       "label": {
        "en": "easy to reach",
        "fr": "à portée"
       }
      }
     ]
    }
   ],
   "copy": {
    "en": {
     "h": "Desk check",
     "p": "Tap anything you notice, then pick the words that fit.",
     "skip": "Skip the desk this time",
     "unskip": "Use the desk check",
     "pick": "What about it?",
     "clear": "Clear this one",
     "none": "Nothing selected yet — tap the drawing, or a button under it.",
     "sideLbl": "Desk or chair"
    },
    "fr": {
     "h": "Vérification du poste",
     "p": "Touchez ce que vous remarquez, puis choisissez les mots qui conviennent.",
     "skip": "Passer cette fois",
     "unskip": "Utiliser la vérification",
     "pick": "Qu'en est-il ?",
     "clear": "Effacer",
     "none": "Rien de sélectionné — touchez le dessin ou un bouton en dessous.",
     "sideLbl": "Bureau ou chaise"
    }
   }
  },
  {
   "id": "example/effort-impact",
   "version": "0.1",
   "engine": "grid-select",
   "title": {
    "en": "Effort and impact",
    "fr": "Effort et impact"
   },
   "axes": {
    "top": {
     "en": "more effort",
     "fr": "plus d'effort"
    },
    "bottom": {
     "en": "less effort",
     "fr": "moins d'effort"
    },
    "left": {
     "en": "less payoff",
     "fr": "moins de retombées"
    },
    "right": {
     "en": "more payoff",
     "fr": "plus de retombées"
    }
   },
   "cells": [
    {
     "id": "slog",
     "label": {
      "en": "Slog",
      "fr": "Corvée"
     },
     "note": {
      "en": "Costly, and not worth much. Worth asking whether it has to happen at all.",
      "fr": "Coûteux et peu rentable. À se demander si c'est vraiment nécessaire."
     },
     "color": {
      "tint": "#E4DCD6",
      "deep": "#6B5648"
     }
    },
    {
     "id": "project",
     "label": {
      "en": "Project",
      "fr": "Projet"
     },
     "note": {
      "en": "Costly but worth it. These are the ones to plan rather than squeeze in.",
      "fr": "Coûteux mais rentable. À planifier plutôt qu'à caser."
     },
     "color": {
      "tint": "#DCE7D2",
      "deep": "#4F6B3A"
     }
    },
    {
     "id": "filler",
     "label": {
      "en": "Filler",
      "fr": "Bouche-trou"
     },
     "note": {
      "en": "Cheap and low payoff. Fine when you have ten minutes and no momentum.",
      "fr": "Rapide et peu rentable. Parfait pour dix minutes sans élan."
     },
     "color": {
      "tint": "#DEE2E6",
      "deep": "#465B66"
     }
    },
    {
     "id": "quickwin",
     "label": {
      "en": "Quick win",
      "fr": "Gain rapide"
     },
     "note": {
      "en": "Cheap and worth it. Do these first; they buy the room for everything else.",
      "fr": "Rapide et rentable. À faire en premier : ça dégage de la place."
     },
     "color": {
      "tint": "#D5E3E1",
      "deep": "#166B63"
     }
    }
   ],
   "items": [
    {
     "id": "rewrite",
     "cell": "slog",
     "label": {
      "en": "Rewrite from scratch",
      "fr": "Tout réécrire"
     }
    },
    {
     "id": "chase",
     "cell": "slog",
     "label": {
      "en": "Chase a reply",
      "fr": "Relancer sans réponse"
     }
    },
    {
     "id": "migrate",
     "cell": "project",
     "label": {
      "en": "Migrate something",
      "fr": "Migrer quelque chose"
     }
    },
    {
     "id": "learn",
     "cell": "project",
     "label": {
      "en": "Learn the tool properly",
      "fr": "Apprendre l'outil à fond"
     }
    },
    {
     "id": "tidy",
     "cell": "filler",
     "label": {
      "en": "Tidy up",
      "fr": "Ranger"
     }
    },
    {
     "id": "skim",
     "cell": "filler",
     "label": {
      "en": "Skim the backlog",
      "fr": "Survoler l'arriéré"
     }
    },
    {
     "id": "reply",
     "cell": "quickwin",
     "label": {
      "en": "Send the one-line reply",
      "fr": "Envoyer la réponse d'une ligne"
     }
    },
    {
     "id": "unblock",
     "cell": "quickwin",
     "label": {
      "en": "Unblock someone",
      "fr": "Débloquer quelqu'un"
     }
    }
   ],
   "copy": {
    "en": {
     "h": "Effort and impact",
     "p": "Tap whatever you did, or plan to. More than one is normal."
    },
    "fr": {
     "h": "Effort et impact",
     "p": "Touchez ce que vous avez fait ou prévoyez. Plusieurs, c'est normal."
    }
   }
  }
 ]
}
```
