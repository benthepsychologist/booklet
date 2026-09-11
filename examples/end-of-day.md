---
booklet: 1
status: approved
title: "End of day"
lang: en
preset: "example/demo@0.1"
updated: 2026-09-11 00:50
---

# Activity Kit — my notes

<!--
How this file works:
  Above the long rule is yours: read it anywhere, edit it in any text editor. Below it is the app’s record — leave it alone.
  Shapes the app reads above the divider:
  - Label: text            one field. Multi-line text goes on indented lines below the label.
  - Move (since 2026-09-08): text   also Exploring: / Suggestion:  — under Now or under an area
  [starter] before text marks starter text the reader has not edited yet.
  ### 🚀 Area name       an area (under Areas). Add or rename freely.
  - 2026-09-08 · Move · Area · text → replaced     an archive line (under Archive). Area is always present; — means none.
  A section you edit here replaces that section of the record. A section you leave out is kept from the record.
  Appendix A and B are a readable copy of your kept entries. The app reads entries from the record, not from
  the appendices, so add, change or remove an entry in the app rather than here.
  Question settings also live only in the record; change them in the app.
-->

_Language: en_  
_Downloaded 2026-09-11 00:50_

## Now

- 

## Areas


## Big picture


## Archive


------------------------------------------------------------

## App record — do not edit below this line

A single JSON object. The app writes this block and reads it back; it holds your kept entries, question settings, and a copy of everything above. Edit the markdown above instead — where the two differ, the markdown wins for the sections it contains.

```json
{
 "block": "format",
 "read_this_first": "This file is a booklet: one Markdown file holding a person's work and the design of the activities they did it in. Everything below the long rule is a series of independent JSON blocks, each in its own ```json fence. Each block is parsed on its own — if one will not parse, only that block is lost.",
 "spec": "booklet-1",
 "record_version": 6,
 "full_spec": "https://github.com/benthepsychologist/booklet/blob/main/SPEC.md",
 "blocks": {
  "format": "this block — the format, carried in the file",
  "meta": "which booklet this is, plus anything shared across modules (body figures, menus)",
  "module": "one activity, whole and portable. One block per activity.",
  "person": "the reader's own settings: name, email, language, question wording overrides",
  "fields": "the board's content, an object keyed by field id",
  "entries": "kept entries for one activity: {mode, items:[…]}. One block per activity.",
  "board": "the Now board, areas and the archive",
  "drafts": "anything unfinished, so nothing is lost mid-thought"
 },
 "order_does_not_matter": "Blocks may appear in any order. Modules may appear in any order. Entries may appear in any order. Nothing is addressed by position: modules by `id`, data by field id, entries by their `ts`. Where a thing is *displayed* is set by `display.order`, and only if no sibling carries one does the written order decide anything.",
 "add_a_module": "Paste a module block — a ```json fence whose object has \"block\":\"module\" — anywhere below the long rule, or paste the same JSON into 'Add an activity' in the page's booklet editor. Adding a module whose id already exists replaces it in place.",
 "module_shape": {
  "block": "module",
  "id": "who/what — stable, and the address for adding or removing",
  "version": "0.1",
  "title": {
   "en": "Its name",
   "fr": "Son nom"
  },
  "blurb": {
   "en": "One line",
   "fr": "Une ligne"
  },
  "display": {
   "order": "lower first; omit and it falls back to written order",
   "show": "false hides it from the home screen"
  },
  "menus": {
   "a-menu-name": [
    "the options a list block offers"
   ]
  },
  "reads": [
   "map field ids this activity draws on, if any"
  ],
  "mode": {
   "id": "the activity id — also the name of its entries block",
   "kind": "entry | board | guide | log",
   "head": {
    "title": "copy reference for its heading"
   },
   "keep": [
    "fields that survive a finalize"
   ],
   "blocks": [
    "see block_types"
   ]
  }
 },
 "block_types": {
  "text": "a question with a written answer. Needs q:[scope,key].",
  "headlines": "repeated one-line entries. Needs q:[scope,key]. Owns `thoughts`.",
  "list": "tappable options plus a free add. Needs source:[mapFieldId…] and copy or label.",
  "didlog": "tick what actually happened. Needs of:[blockId…].",
  "quadrants": "the energy/valence feelings grid. Owns `emotions`.",
  "bodymap": "the front and back figures. Owns `regions`.",
  "group": "nested blocks. Needs blocks:[…]."
 },
 "where_data_goes": "A block owns the entry keys named in its `keys`, defaulting to its own `id`. So a text block with id 'extra' writes entry.extra; a list block with id 'needs' writes entry.needs. The three composite widgets own a differently-named key and say so: bodymap→regions, quadrants→emotions, headlines→thoughts. Board content is not in entries at all — it lives in the `fields` block, keyed by map field id.",
 "display_parameters": "Anything with a `display` object: {order:number, show:boolean, placement:'open'|'folded'|'hidden'}. `order` sorts among siblings, lower first, stable, and anything without one sorts last. `show:false` takes a module off the home screen but keeps its data. `placement` applies to a block inside an activity: open renders in place, folded hides it behind a disclosure (which must be named), hidden does not render but keeps its data.",
 "if_it_is_not_displaying": [
  "A module needs a `mode` with a `kind` the renderer knows (entry, board, guide, log). An unknown kind is refused.",
  "A block needs a `type` from block_types. An unknown type draws nothing.",
  "Check `display.show` on the module and `display.placement` on the block.",
  "A folded block with no `copy` and no `label` is a disclosure with no summary — name it.",
  "A list block whose `source` names a field no map card holds will simply have nothing to offer.",
  "Two modules sharing an id: the second replaces the first."
 ]
}
```

```json
{
 "block": "meta",
 "app": "useful-next-step",
 "v": 6,
 "booklet": 1,
 "written": "2026-09-11T00:50:00Z",
 "booklet_id": "example/demo",
 "booklet_version": "0.1",
 "customized": true,
 "title": null,
 "body": {
  "front": [
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
  ],
  "back": [
   "head",
   "neck",
   "shoulders",
   "back",
   "lowerback",
   "arms",
   "hips",
   "legs",
   "feet"
  ],
  "chips": [
   "allover"
  ],
  "sides": [
   "front",
   "back"
  ]
 }
}
```

```json
{
 "block": "widget",
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
}
```

```json
{
 "block": "widget",
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
```

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

```json
{
 "block": "person",
 "name": "",
 "email": "",
 "sync": null,
 "protect": false,
 "lang": "en",
 "mode": "full",
 "note": "",
 "q": {},
 "emo": {
  "extra": {}
 },
 "prefs": {
  "noRemind": false,
  "skipBody": false
 },
 "setup": {
  "done": false,
  "charge": "",
  "reading": "",
  "domains": [],
  "counts": true
 }
}
```

```json
{
 "block": "page",
 "blocks": []
}
```

```json
{
 "block": "fields",
 "fields": {}
}
```

```json
{
 "block": "board",
 "now": {
  "items": []
 },
 "areas": [],
 "archive": [],
 "big": {
  "s1": {
   "area": "",
   "change": "",
   "obstacle": "",
   "topic": "",
   "happening": "",
   "meaning": "",
   "unknown": ""
  },
  "s2": {
   "more": "",
   "protect": "",
   "ordinary": "",
   "oblige": "",
   "costs": ""
  },
  "s3": {
   "kinds": [],
   "notes": ""
  },
  "s4": {
   "question": "",
   "purpose": "",
   "limits": "",
   "help": "",
   "review": ""
  },
  "s5": {
   "notes": ""
  },
  "s6": {
   "what": "",
   "learned": "",
   "follows": ""
  },
  "starter": {}
 }
}
```

```json
{
 "block": "entries",
 "mode": "checkins",
 "items": []
}
```

```json
{
 "block": "entries",
 "mode": "today",
 "items": []
}
```

```json
{
 "block": "drafts",
 "today": null,
 "checkin": null
}
```
