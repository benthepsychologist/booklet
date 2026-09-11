---
module: example/the-board
version: 0.1
status: approved
lang: en
---

# The board

A **board**: a page you edit in place and never finalize. That is the whole
difference between this and an activity like *End of day* — an `entry` mode
produces kept entries and a history; a `board` mode is one living page you come
back to and change.

Both are drawn exactly the same way, out of the same blocks. Nothing about a
board is a special case in a conforming renderer.

It draws with [`example/project-board`](../widgets/project-board.md), which is
the `card-board` engine: four cards, opened one at a time, each leading with
what you have already written rather than with a question.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file, or paste it
into **Add an activity** in the page's editor. It brings its widget with it.

------------------------------------------------------------

```json
{
 "block": "module",
 "id": "example/the-board",
 "version": "0.1",
 "title": {
  "en": "The board",
  "fr": "Le tableau"
 },
 "blurb": {
  "en": "What the work looks like right now. Edited in place, never finished.",
  "fr": "À quoi ressemble le travail en ce moment. Modifié sur place, jamais terminé."
 },
 "display": {
  "order": 20
 },
 "mode": {
  "id": "board",
  "kind": "board",
  "accent": "petrol",
  "head": {
   "h": {
    "en": "The board",
    "fr": "Le tableau"
   }
  },
  "blocks": [
   {
    "id": "cards",
    "type": "widget",
    "widget": "example/project-board",
    "keys": [
     "fields"
    ],
    "display": {
     "order": 10
    }
   }
  ]
 },
 "widgets": [
  {
   "id": "example/project-board",
   "version": "0.1",
   "engine": "card-board",
   "title": {
    "en": "The board",
    "fr": "Le tableau"
   },
   "cards": [
    {
     "id": "now",
     "label": {
      "en": "In flight",
      "fr": "En cours"
     },
     "blurb": {
      "en": "What is actually being worked on, as opposed to what you have agreed to.",
      "fr": "Ce sur quoi vous travaillez vraiment, par opposition à ce que vous avez accepté."
     },
     "lists": [
      {
       "field": "inflight",
       "label": {
        "en": "What is in flight right now?",
        "fr": "Qu'est-ce qui est en cours ?"
       },
       "hint": {
        "en": "Things genuinely underway. If it has not been touched in a fortnight it is not in flight.",
        "fr": "Ce qui avance réellement. Si rien n'a bougé depuis quinze jours, ce n'est pas en cours."
       },
       "menu": "inflight"
      }
     ]
    },
    {
     "id": "next",
     "label": {
      "en": "Next",
      "fr": "Ensuite"
     },
     "blurb": {
      "en": "The next thing, not the whole list. A board you cannot read is a list you will not open.",
      "fr": "La prochaine chose, pas toute la liste. Un tableau illisible est une liste qu'on n'ouvre pas."
     },
     "lists": [
      {
       "field": "next",
       "label": {
        "en": "What is next?",
        "fr": "Quelle est la suite ?"
       },
       "hint": {
        "en": "Small enough to start without deciding anything else first.",
        "fr": "Assez petit pour commencer sans devoir décider autre chose d'abord."
       },
       "menu": "next"
      }
     ]
    },
    {
     "id": "stuck",
     "label": {
      "en": "Stuck",
      "fr": "Bloqué"
     },
     "blurb": {
      "en": "What is waiting on something, and what it is waiting on. Naming the blocker is most of the work.",
      "fr": "Ce qui attend, et ce qu'il attend. Nommer le blocage, c'est l'essentiel du travail."
     },
     "lists": [
      {
       "field": "stuck",
       "label": {
        "en": "What is stuck, and on what?",
        "fr": "Qu'est-ce qui bloque, et sur quoi ?"
       },
       "hint": {
        "en": "Write the blocker, not the feeling about the blocker.",
        "fr": "Notez le blocage, pas ce que vous en ressentez."
       },
       "menu": "stuck"
      }
     ]
    },
    {
     "id": "done",
     "label": {
      "en": "Done",
      "fr": "Terminé"
     },
     "blurb": {
      "en": "Kept deliberately. A board that only ever grows is one you stop opening.",
      "fr": "Gardé exprès. Un tableau qui ne fait que grossir est un tableau qu'on cesse d'ouvrir."
     },
     "lists": [
      {
       "field": "done",
       "label": {
        "en": "What is finished?",
        "fr": "Qu'est-ce qui est terminé ?"
       },
       "hint": {
        "en": "Move things here rather than deleting them, at least for a while.",
        "fr": "Déplacez plutôt que de supprimer, au moins un temps."
       },
       "menu": "done"
      }
     ]
    }
   ],
   "menus": {
    "inflight": [
     "A piece of writing",
     "A change to something that exists",
     "A conversation to have",
     "Something being learned"
    ],
    "next": [
     "The smallest next step",
     "A decision to make",
     "Someone to ask",
     "Something to read first"
    ],
    "stuck": [
     "Waiting on a reply",
     "Waiting on a decision",
     "Missing something to work with",
     "Needs a block of time"
    ],
    "done": [
     "Shipped",
     "Abandoned on purpose",
     "Handed to someone else",
     "Turned out not to matter"
    ]
   },
   "copy": {
    "en": {
     "h": "The board",
     "p": "What the work actually looks like, kept where you can find it. Edited in place — nothing here is ever finalized.",
     "mapped": "On the board",
     "nothing": "Nothing here yet — add one below, or open the questions.",
     "quick": "Add one you already know",
     "add": "Add",
     "explore": "Work one out",
     "exploreHint": "Questions, if you want them. Skip them if you do not.",
     "remove": "Remove",
     "count": "on the board"
    },
    "fr": {
     "h": "Le tableau",
     "p": "À quoi ressemble vraiment le travail, gardé où vous le retrouverez. Modifié sur place — rien n'est jamais figé.",
     "mapped": "Au tableau",
     "nothing": "Rien ici — ajoutez-en un, ou ouvrez les questions.",
     "quick": "Ajouter ce que vous savez déjà",
     "add": "Ajouter",
     "explore": "En trouver un",
     "exploreHint": "Des questions, si vous en voulez. Sinon, passez.",
     "remove": "Retirer",
     "count": "au tableau"
    }
   }
  }
 ]
}
```
