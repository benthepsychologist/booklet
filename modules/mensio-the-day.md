---
module: mensio/the-day
version: 0.1
status: approved
approved: 2026-09-10
lang: en
---

# Have a good day

The Core Responsibilities protocol: *what needs to happen for me to feel good about today?* — answered by tapping items off the map rather than from an empty box, because recall is the step that fails on a hard day. Anything typed in is for that day only. Ends with what was actually there: no score, no streak, no percentage.

Ships in the built-in booklet.

Its three lists read the map's fields, so it is at its best with **The Map** added. Without it the lists still work — they just start empty and offer to add the map.

## Adding it to a booklet

**Two ways, and they do the same thing.**

1. **In the page** — open *Personalize → Change the booklet itself → Add an activity*, and it is one tap if this module is on the shelf. A module that is not on the shelf can be pasted into the same place.
2. **In the file** — paste the block below anywhere under the long rule in your booklet file, then load the file. Blocks are read in any order, so where you paste it makes no difference. If your booklet already has a module with this id, this one replaces it in place, which is how you take an update.

Removing it is the same editor, or deleting this block from the file. **Your entries stay either way** — they live in their own `entries` block, keyed by the activity, so putting the module back brings them back with it.

## The block

```json
{
 "block": "module",
 "id": "mensio/the-day",
 "version": "0.1",
 "title": {
  "en": "Have a good day",
  "fr": "Passer une bonne journée"
 },
 "blurb": {
  "en": "What needs to happen today, built from what is already on the map.",
  "fr": "Ce qui doit arriver aujourd’hui, à partir de ce qui est déjà sur la carte."
 },
 "rights": {
  "copyright": "© 2026 Benjamin F. Armstrong III. All rights reserved.",
  "license": "Free to copy and share, unmodified and with this notice intact. Not licensed for modification or for redistribution in altered form. This grant covers this version; later versions may differ.",
  "source": "https://benthepsychologist.com/tools/activity-kit/"
 },
 "reads": [
  "weekday",
  "weekend",
  "funTired",
  "funEnergy",
  "soothe"
 ],
 "mode": {
  "id": "today",
  "kind": "entry",
  "accent": "today",
  "home": true,
  "icon": "today",
  "head": {
   "title": "today.h",
   "question": "today.q",
   "lead": "today.p",
   "note": "today.adequate"
  },
  "chrome": [
   "areas"
  ],
  "keep": [
   "area"
  ],
  "blocks": [
   {
    "id": "needs",
    "type": "list",
    "placement": "open",
    "copy": "today.lists.needs",
    "source": [
     "weekday",
     "weekend"
    ]
   },
   {
    "id": "enjoy",
    "type": "list",
    "placement": "open",
    "copy": "today.lists.enjoy",
    "source": [
     "funTired",
     "funEnergy"
    ]
   },
   {
    "id": "soothe",
    "type": "list",
    "placement": "open",
    "copy": "today.lists.soothe",
    "source": [
     "soothe"
    ]
   },
   {
    "id": "extra",
    "type": "text",
    "placement": "open",
    "q": [
     "today",
     "extra"
    ]
   },
   {
    "id": "did",
    "type": "didlog",
    "placement": "open",
    "of": [
     "needs",
     "enjoy",
     "soothe"
    ]
   },
   {
    "id": "older",
    "type": "group",
    "placement": "folded",
    "copy": "today.older",
    "blocks": [
     {
      "id": "mind",
      "type": "text",
      "q": [
       "today",
       "mind"
      ],
      "recency": "headlines"
     },
     {
      "id": "exploring",
      "type": "text",
      "q": [
       "today",
       "exploring"
      ]
     },
     {
      "id": "aside",
      "type": "text",
      "q": [
       "today",
       "aside"
      ]
     },
     {
      "id": "help",
      "type": "text",
      "q": [
       "today",
       "help"
      ]
     },
     {
      "id": "carry",
      "type": "text",
      "q": [
       "today",
       "carry"
      ]
     }
    ]
   }
  ]
 },
 "menus": {
  "weekday": [
   "Dishes are done",
   "Bills are paid",
   "The space is tidy",
   "Family needs are met",
   "Emails answered",
   "Admin and notes done",
   "Key work duties",
   "Groceries, laundry",
   "Childcare",
   "Movement, meals, meds",
   "Something moved on the main thing",
   "I got outside"
  ],
  "weekend": [
   "A proper rest",
   "Time with people who matter",
   "One nagging thing off the list",
   "Something enjoyable, actually enjoyed",
   "Groceries and laundry",
   "Nothing scheduled at all"
  ],
  "funTired": [
   "A puzzle game",
   "Turn-based strategy, no cheating",
   "A cozy sim",
   "One screen only — phone in another room",
   "A graphic novel",
   "Lego, following the instructions",
   "Drawing a map or inventing a character",
   "Miniature painting or colouring",
   "Something that needs two hands",
   "Add a podcast underneath it"
  ],
  "funEnergy": [
   "Journaling",
   "A gratitude list",
   "Unguided meditation",
   "Hard cardio",
   "Learning a language or a skill",
   "A project you've been meaning to start",
   "Seeing people on purpose"
  ],
  "soothe": [
   "Playing an instrument",
   "A film, with full attention",
   "A narrative game that rewards patience",
   "A podcast while walking",
   "Building or painting something",
   "A lap around the block",
   "Making a cup of tea, slowly",
   "One favourite song, no multitasking",
   "Look out a window for a minute",
   "Stand up and stretch",
   "Box breathing — in four, hold four, out four, hold four",
   "Step down one rung, not to silence"
  ]
 },
 "copy": {
  "en": {
   "today": {
    "h": "Have a good day",
    "q": "What needs to happen for me to feel good about today?",
    "p": "Not the to-do list, and not a target. The question is what has to be there for you to get to the end of today and feel you carried your weight — which is usually shorter and more specific than everything you could do.",
    "adequate": "Adequate, not stellar. The point of a short list is that finishing it earns the rest of the evening.",
    "lists": {
     "needs": [
      "What needs to happen today",
      "Pulled from your map. Tap the ones that apply to this day, or add one just for today."
     ],
     "enjoy": [
      "Something to enjoy",
      "Not a reward for finishing. Part of what makes the day good."
     ],
     "soothe": [
      "A way to come down",
      "For when today gets loud. Pick it now, while it is quiet."
     ]
    },
    "extra": [
     "Anything else that would make today satisfying",
     "In your own words."
    ],
    "fromMap": "from your map",
    "justToday": "just for today",
    "addOwn": "add one for today",
    "emptyMap": "Nothing on your map for this yet.",
    "openMap": "Open The Map",
    "addMap": "Add The Map to this booklet",
    "did": {
     "h": "What was actually there",
     "p": "Tick what happened. No score, no streak, no percentage — this is a record, not a report card.",
     "none": "Pick what today needs above, and you can come back and tick what was there."
    },
    "older": "Other notes on today",
    "move": {
     "k": "The move I chose",
     "edit": "Open in The Map"
    },
    "f": {
     "mind": [
      "On my mind today",
      "What keeps coming back, in a sentence or two."
     ],
     "exploring": [
      "What I'm exploring or trying",
      "Something in motion, however small."
     ],
     "aside": [
      "What I'm setting aside for today",
      "A worry or task that can wait. Naming it here is not the same as dismissing it."
     ],
     "help": [
      "What would help today",
      "A person, a condition, a resource, a smaller scope."
     ]
    },
    "carry": [
     "One thing to carry forward",
     "From yesterday, or from the last entry."
    ],
    "carryExp": "Optional: carry something forward"
   }
  },
  "fr": {
   "today": {
    "h": "Passer une bonne journée",
    "q": "Qu’est-ce qui doit arriver pour que je me sente bien de ma journée ?",
    "p": "Ni la liste de tâches, ni un objectif. La question est ce qui doit être là pour arriver à la fin de la journée en sentant que vous avez porté votre part — ce qui est habituellement plus court et plus précis que tout ce que vous pourriez faire.",
    "adequate": "Convenable, pas exceptionnel. L’intérêt d’une liste courte, c’est que la terminer donne droit au reste de la soirée.",
    "lists": {
     "needs": [
      "Ce qui doit arriver aujourd’hui",
      "Tiré de votre carte. Touchez ce qui vaut pour cette journée, ou ajoutez quelque chose juste pour aujourd’hui."
     ],
     "enjoy": [
      "Quelque chose à savourer",
      "Pas une récompense pour avoir fini. Une partie de ce qui fait une bonne journée."
     ],
     "soothe": [
      "Une façon de redescendre",
      "Pour quand la journée devient bruyante. Choisissez-la maintenant, pendant que c’est calme."
     ]
    },
    "extra": [
     "Ce qui rendrait la journée satisfaisante, autrement",
     "Dans vos propres mots."
    ],
    "fromMap": "de votre carte",
    "justToday": "juste pour aujourd’hui",
    "addOwn": "ajouter pour aujourd’hui",
    "emptyMap": "Rien sur votre carte pour l’instant.",
    "openMap": "Ouvrir La Carte",
    "addMap": "Ajouter La Carte à ce carnet",
    "did": {
     "h": "Ce qui était réellement là",
     "p": "Cochez ce qui a eu lieu. Aucun score, aucune série, aucun pourcentage — c’est un relevé, pas un bulletin.",
     "none": "Choisissez d’abord ce qu’il faut aujourd’hui ; vous pourrez revenir cocher ce qui était là."
    },
    "older": "Autres notes sur aujourd’hui",
    "move": {
     "k": "Le pas que j’ai choisi",
     "edit": "Ouvrir dans La Carte"
    },
    "f": {
     "mind": [
      "Ce qui m’occupe l’esprit aujourd’hui",
      "Ce qui revient sans cesse, en une ou deux phrases."
     ],
     "exploring": [
      "Ce que j’explore ou que j’essaie",
      "Quelque chose en mouvement, aussi petit soit-il."
     ],
     "aside": [
      "Ce que je mets de côté pour aujourd’hui",
      "Un souci ou une tâche qui peut attendre. Le nommer ici n’est pas le rejeter."
     ],
     "help": [
      "Ce qui aiderait aujourd’hui",
      "Une personne, une condition, une ressource, une portée réduite."
     ]
    },
    "carry": [
     "Une chose à reporter",
     "D’hier, ou de la dernière entrée."
    ],
    "carryExp": "Facultatif : reporter quelque chose"
   }
  }
 },
 "display": {
  "order": 20
 }
}
```
