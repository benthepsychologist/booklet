---
widget: mensio/body-map
version: 0.1
engine: svg-regions
status: approved
approved: 2026-09-11
lang: en
---

# Body map

Two figures, front and back, with 25 tappable regions between them. The head oval is split at the brow: the top is the head, the lower third is the jaw. Tap a region, then pick the words that fit — each carries its own valence.

**It is not an image.** It is 2.7KB of inline SVG: 25 shapes, each carrying a `data-r` region id, plus the region labels and the sensation vocabulary. That is why it embeds in a file the way a paragraph does.

## Adding it to a booklet

A widget is data, not code: the renderer holds the **engine** (`svg-regions`) and
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
}
```
