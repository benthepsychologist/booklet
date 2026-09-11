---
module: mensio/check-in
version: 0.1
status: approved
approved: 2026-09-10
lang: en
---

# A mindful check-in

Body, feelings, thoughts — noticed, named and kept, in that order and with nothing wedged between them. The body map is two figures, front and back; feelings come from the four energy/valence quadrants; thoughts are bare headlines with no explanation attached.

Ships in the built-in booklet.

## Adding it to a booklet

**Two ways, and they do the same thing.**

1. **In the page** — open *Personalize → Change the booklet itself → Add an activity*, and it is one tap if this module is on the shelf. A module that is not on the shelf can be pasted into the same place.
2. **In the file** — paste the block below anywhere under the long rule in your booklet file, then load the file. Blocks are read in any order, so where you paste it makes no difference. If your booklet already has a module with this id, this one replaces it in place, which is how you take an update.

Removing it is the same editor, or deleting this block from the file. **Your entries stay either way** — they live in their own `entries` block, keyed by the activity, so putting the module back brings them back with it.

## The block

```json
{
 "block": "module",
 "id": "mensio/check-in",
 "version": "0.1",
 "title": {
  "en": "A mindful check-in",
  "fr": "Une pause attentive"
 },
 "blurb": {
  "en": "Body, feelings, thoughts — noticed, named, kept.",
  "fr": "Le corps, les émotions, les pensées — remarqués, nommés, gardés."
 },
 "rights": {
  "copyright": "© 2026 Benjamin F. Armstrong III. All rights reserved.",
  "license": "Free to copy and share, unmodified and with this notice intact. Not licensed for modification or for redistribution in altered form. This grant covers this version; later versions may differ.",
  "source": "https://benthepsychologist.com/tools/activity-kit/"
 },
 "mode": {
  "id": "checkin",
  "kind": "entry",
  "accent": "checkin",
  "home": true,
  "icon": "checkin",
  "head": {
   "title": "checkin.h",
   "lead": "checkin.p"
  },
  "chrome": [],
  "blocks": [
   {
    "id": "body",
    "type": "widget",
    "widget": "mensio/body-map",
    "keys": [
     "regions"
    ],
    "skippable": true,
    "display": {
     "placement": "open"
    }
   },
   {
    "id": "emotions",
    "type": "widget",
    "widget": "mensio/quadrants",
    "keys": [
     "emotions"
    ],
    "guide": "guide",
    "display": {
     "placement": "open"
    },
    "guideLabel": {
     "en": "What do these four quadrants mean?",
     "fr": "Que signifient ces quatre quadrants ?"
    }
   },
   {
    "id": "other",
    "type": "text",
    "q": [
     "checkin",
     "other"
    ],
    "display": {
     "placement": "open"
    }
   },
   {
    "id": "thoughts",
    "type": "headlines",
    "q": [
     "checkin",
     "thoughts"
    ],
    "display": {
     "placement": "open"
    }
   }
  ]
 },
 "copy": {
  "en": {
   "checkin": {
    "h": "Mindful check-in",
    "p": "Notice, name, keep. Nothing here needs to be explained or fixed."
   }
  },
  "fr": {
   "checkin": {
    "h": "Pause attentive",
    "p": "Remarquer, nommer, garder. Rien ici n’a besoin d’être expliqué ni réglé."
   }
  }
 },
 "widgets": [
  {
   "id": "mensio/body-map",
   "version": "0.1",
   "engine": "svg-regions",
   "title": {
    "en": "Body map",
    "fr": "Carte du corps"
   },
   "figures": [
    {
     "id": "front",
     "label": {
      "en": "Front",
      "fr": "Devant"
     },
     "svg": "\n<svg viewBox=\"0 0 200 440\" class=\"bodyfig\" aria-hidden=\"true\" focusable=\"false\">\n  <defs><clipPath id=\"headclipF\"><ellipse cx=\"100\" cy=\"40\" rx=\"27\" ry=\"31\"/></clipPath></defs>\n  <g clip-path=\"url(#headclipF)\">\n    <rect class=\"rg\" data-r=\"head\" x=\"70\" y=\"6\" width=\"60\" height=\"42\"/>\n    <rect class=\"rg\" data-r=\"jaw\"  x=\"70\" y=\"48\" width=\"60\" height=\"26\"/>\n  </g>\n  <ellipse class=\"outline\" cx=\"100\" cy=\"40\" rx=\"27\" ry=\"31\"/>\n  <rect    class=\"rg\" data-r=\"neck\" x=\"87\" y=\"69\" width=\"26\" height=\"22\" rx=\"9\"/>\n  <path    class=\"rg\" data-r=\"shoulders\" d=\"M54 100 Q100 84 146 100 L146 120 Q100 106 54 120 Z\"/>\n  <path    class=\"rg\" data-r=\"chest\" d=\"M58 120 Q100 108 142 120 L140 172 Q100 182 60 172 Z\"/>\n  <path    class=\"rg\" data-r=\"stomach\" d=\"M60 172 Q100 182 140 172 L138 228 Q100 238 62 228 Z\"/>\n  <path    class=\"rg\" data-r=\"arms\" d=\"M50 102 Q37 105 35 124 L27 214 Q25 230 40 232 Q51 232 53 215 L60 134 Z\"/>\n  <path    class=\"rg\" data-r=\"arms\" d=\"M150 102 Q163 105 165 124 L173 214 Q175 230 160 232 Q149 232 147 215 L140 134 Z\"/>\n  <path    class=\"rg\" data-r=\"hips\" d=\"M62 228 Q100 238 138 228 L136 266 Q100 276 64 266 Z\"/>\n  <path    class=\"rg\" data-r=\"legs\" d=\"M64 266 Q82 274 98 270 L94 388 Q84 394 74 388 Z\"/>\n  <path    class=\"rg\" data-r=\"legs\" d=\"M136 266 Q118 274 102 270 L106 388 Q116 394 126 388 Z\"/>\n  <path    class=\"rg\" data-r=\"feet\" d=\"M74 388 Q84 394 94 388 L96 414 Q84 420 72 414 Z\"/>\n  <path    class=\"rg\" data-r=\"feet\" d=\"M126 388 Q116 394 106 388 L104 414 Q116 420 128 414 Z\"/>\n</svg>",
     "regions": [
      "head",
      "jaw",
      "neck",
      "shoulders",
      "chest",
      "arms",
      "stomach",
      "hips",
      "legs",
      "feet"
     ]
    },
    {
     "id": "back",
     "label": {
      "en": "Back",
      "fr": "Dos"
     },
     "svg": "\n<svg viewBox=\"0 0 200 440\" class=\"bodyfig\" aria-hidden=\"true\" focusable=\"false\">\n  <ellipse class=\"rg\" data-r=\"head\" cx=\"100\" cy=\"40\" rx=\"27\" ry=\"31\"/>\n  <rect    class=\"rg\" data-r=\"neck\" x=\"87\" y=\"69\" width=\"26\" height=\"22\" rx=\"9\"/>\n  <path    class=\"rg\" data-r=\"shoulders\" d=\"M54 100 Q100 84 146 100 L146 120 Q100 106 54 120 Z\"/>\n  <path    class=\"rg\" data-r=\"back\" d=\"M58 120 Q100 108 142 120 L140 178 Q100 188 60 178 Z\"/>\n  <path    class=\"rg\" data-r=\"lowerback\" d=\"M60 178 Q100 188 140 178 L138 228 Q100 238 62 228 Z\"/>\n  <path    class=\"rg\" data-r=\"arms\" d=\"M50 102 Q37 105 35 124 L27 214 Q25 230 40 232 Q51 232 53 215 L60 134 Z\"/>\n  <path    class=\"rg\" data-r=\"arms\" d=\"M150 102 Q163 105 165 124 L173 214 Q175 230 160 232 Q149 232 147 215 L140 134 Z\"/>\n  <path    class=\"rg\" data-r=\"hips\" d=\"M62 228 Q100 238 138 228 L136 266 Q100 276 64 266 Z\"/>\n  <path    class=\"rg\" data-r=\"legs\" d=\"M64 266 Q82 274 98 270 L94 388 Q84 394 74 388 Z\"/>\n  <path    class=\"rg\" data-r=\"legs\" d=\"M136 266 Q118 274 102 270 L106 388 Q116 394 126 388 Z\"/>\n  <path    class=\"rg\" data-r=\"feet\" d=\"M74 388 Q84 394 94 388 L96 414 Q84 420 72 414 Z\"/>\n  <path    class=\"rg\" data-r=\"feet\" d=\"M126 388 Q116 394 106 388 L104 414 Q116 420 128 414 Z\"/>\n</svg>",
     "regions": [
      "head",
      "neck",
      "shoulders",
      "back",
      "lowerback",
      "arms",
      "hips",
      "legs",
      "feet"
     ]
    }
   ],
   "chips": [
    "allover"
   ],
   "regions": [
    {
     "id": "head",
     "label": {
      "en": "Head",
      "fr": "Tête"
     }
    },
    {
     "id": "jaw",
     "label": {
      "en": "Jaw and face",
      "fr": "Mâchoire et visage"
     }
    },
    {
     "id": "neck",
     "label": {
      "en": "Neck and throat",
      "fr": "Cou et gorge"
     }
    },
    {
     "id": "shoulders",
     "label": {
      "en": "Shoulders",
      "fr": "Épaules"
     }
    },
    {
     "id": "chest",
     "label": {
      "en": "Chest",
      "fr": "Poitrine"
     }
    },
    {
     "id": "arms",
     "label": {
      "en": "Arms and hands",
      "fr": "Bras et mains"
     }
    },
    {
     "id": "stomach",
     "label": {
      "en": "Stomach",
      "fr": "Ventre"
     }
    },
    {
     "id": "hips",
     "label": {
      "en": "Hips",
      "fr": "Hanches"
     }
    },
    {
     "id": "legs",
     "label": {
      "en": "Legs",
      "fr": "Jambes"
     }
    },
    {
     "id": "feet",
     "label": {
      "en": "Feet",
      "fr": "Pieds"
     }
    },
    {
     "id": "back",
     "label": {
      "en": "Upper back",
      "fr": "Haut du dos"
     }
    },
    {
     "id": "lowerback",
     "label": {
      "en": "Lower back",
      "fr": "Bas du dos"
     }
    },
    {
     "id": "allover",
     "label": {
      "en": "All over",
      "fr": "Partout"
     }
    }
   ],
   "senses": [
    {
     "id": "unpleasant",
     "label": {
      "en": "Uncomfortable",
      "fr": "Inconfortable"
     },
     "words": [
      {
       "id": "unpleasant:0",
       "label": {
        "en": "tense",
        "fr": "tendu"
       }
      },
      {
       "id": "unpleasant:1",
       "label": {
        "en": "tight",
        "fr": "serré"
       }
      },
      {
       "id": "unpleasant:2",
       "label": {
        "en": "bracing",
        "fr": "crispé"
       }
      },
      {
       "id": "unpleasant:3",
       "label": {
        "en": "aching",
        "fr": "douloureux"
       }
      },
      {
       "id": "unpleasant:4",
       "label": {
        "en": "heavy",
        "fr": "lourd"
       }
      },
      {
       "id": "unpleasant:5",
       "label": {
        "en": "restless",
        "fr": "agité"
       }
      },
      {
       "id": "unpleasant:6",
       "label": {
        "en": "buzzing",
        "fr": "vibrant"
       }
      },
      {
       "id": "unpleasant:7",
       "label": {
        "en": "churning",
        "fr": "noué"
       }
      },
      {
       "id": "unpleasant:8",
       "label": {
        "en": "numb",
        "fr": "engourdi"
       }
      },
      {
       "id": "unpleasant:9",
       "label": {
        "en": "hot",
        "fr": "chaud"
       }
      },
      {
       "id": "unpleasant:10",
       "label": {
        "en": "cold",
        "fr": "froid"
       }
      },
      {
       "id": "unpleasant:11",
       "label": {
        "en": "fluttery",
        "fr": "papillonnant"
       }
      }
     ]
    },
    {
     "id": "noticing",
     "label": {
      "en": "Just noticing",
      "fr": "Je remarque, sans plus"
     },
     "words": [
      {
       "id": "noticing:0",
       "label": {
        "en": "just noticing",
        "fr": "je remarque, sans plus"
       }
      },
      {
       "id": "noticing:1",
       "label": {
        "en": "hard to tell",
        "fr": "difficile à dire"
       }
      },
      {
       "id": "noticing:2",
       "label": {
        "en": "nothing much",
        "fr": "pas grand-chose"
       }
      }
     ]
    },
    {
     "id": "pleasant",
     "label": {
      "en": "Comfortable",
      "fr": "Confortable"
     },
     "words": [
      {
       "id": "pleasant:0",
       "label": {
        "en": "settled",
        "fr": "posé"
       }
      },
      {
       "id": "pleasant:1",
       "label": {
        "en": "soft",
        "fr": "souple"
       }
      },
      {
       "id": "pleasant:2",
       "label": {
        "en": "warm",
        "fr": "chaud"
       }
      },
      {
       "id": "pleasant:3",
       "label": {
        "en": "easy",
        "fr": "facile"
       }
      },
      {
       "id": "pleasant:4",
       "label": {
        "en": "light",
        "fr": "léger"
       }
      },
      {
       "id": "pleasant:5",
       "label": {
        "en": "open",
        "fr": "ouvert"
       }
      }
     ]
    }
   ],
   "copy": {
    "en": {
     "h": "Body",
     "p": "Tap wherever you notice something, then pick the words that fit. There is nothing to get right here.",
     "stance": "Friendly curiosity, not a check for problems. The question is how you are put together right now, not what is wrong. If it starts to feel like scanning for something to worry about, stop — that is a good instinct, and you can skip this part entirely.",
     "invite": "Invite, don't command. “Would this part like to soften a little?” rather than “relax now”. The point is noticing and allowing, not forcing anything to change.",
     "pick": "What is it like there?",
     "clear": "Clear this one",
     "none": "Nothing selected yet — tap the figure, or one of the buttons under it.",
     "skip": "Skip the body this time",
     "unskip": "Use the body map",
     "sideLbl": "Front or back"
    },
    "fr": {
     "h": "Le corps",
     "p": "Touchez là où vous remarquez quelque chose, puis choisissez les mots qui conviennent. Il n’y a rien à réussir ici.",
     "stance": "Une curiosité bienveillante, pas une vérification. La question est comment vous êtes constitué·e en ce moment, pas ce qui ne va pas. Si cela commence à ressembler à une recherche de problèmes, arrêtez — c’est un bon réflexe, et vous pouvez sauter cette partie.",
     "invite": "Inviter, ne pas commander. « Cette partie aimerait-elle se relâcher un peu ? » plutôt que « détends-toi ». Il s’agit de remarquer et de laisser être, pas de forcer quoi que ce soit.",
     "pick": "Comment est-ce, à cet endroit ?",
     "clear": "Effacer celui-ci",
     "none": "Rien de sélectionné — touchez la figure, ou un des boutons en dessous.",
     "skip": "Passer le corps cette fois",
     "unskip": "Utiliser la carte du corps",
     "sideLbl": "Devant ou derrière"
    }
   }
  },
  {
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
 ],
 "display": {
  "order": 10
 }
}
```
