---
module: fixture/lint
version: 0.1
status: approved
lang: en
languages: en, fr
---

# Linter fixture: a board block that keeps its answer under a card board's field

A test fixture, not a module anybody is offered. It is `lint-ok.md` with one
change, written so `lint-booklet.py` reports exactly one thing: a text block owns `people`, a field of the card board beside it.
`test/lint.test.js` lints it and checks the message.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file.

------------------------------------------------------------

```json
{
 "block": "module",
 "id": "fixture/lint",
 "version": "0.1",
 "title": {
  "en": "Lint fixture",
  "fr": "Fixture du linter"
 },
 "reads": [
  "stuff"
 ],
 "copy": {
  "en": {
   "lw": {
    "more": "One more, if you want it",
    "f": {
     "a": [
      "What did you notice?",
      "One thing is enough."
     ],
     "b": [
      "What else?",
      "Anything."
     ],
     "d": [
      "And this?",
      "Deeper."
     ]
    },
    "lists": {
     "picks": [
      "Pick some",
      "Tap the ones that fit."
     ]
    }
   }
  },
  "fr": {
   "lw": {
    "more": "Une de plus, si vous voulez",
    "f": {
     "a": [
      "Qu'avez-vous remarqué ?",
      "Une seule chose suffit."
     ],
     "b": [
      "Quoi d'autre ?",
      "N'importe quoi."
     ],
     "d": [
      "Et ceci ?",
      "Plus loin."
     ]
    },
    "lists": {
     "picks": [
      "Choisissez",
      "Touchez ce qui convient."
     ]
    }
   }
  }
 },
 "mode": {
  "id": "lw-main",
  "kind": "board",
  "blocks": [
   {
    "id": "intro",
    "type": "prose",
    "text": {
     "en": "Hello.",
     "fr": "Bonjour."
    }
   },
   {
    "id": "people",
    "type": "text",
    "q": [
     "lw",
     "a"
    ]
   },
   {
    "id": "g",
    "type": "group",
    "display": {
     "placement": "folded"
    },
    "copy": "lw.more",
    "blocks": [
     {
      "id": "b",
      "type": "text",
      "q": [
       "lw",
       "b"
      ]
     },
     {
      "id": "inner",
      "type": "group",
      "blocks": [
       {
        "id": "d",
        "type": "text",
        "q": [
         "lw",
         "d"
        ]
       }
      ]
     }
    ]
   }
  ]
 },
 "widgets": [
  {
   "block": "widget",
   "id": "fixture/cards",
   "version": "0.1",
   "engine": "card-board",
   "title": {
    "en": "Cards",
    "fr": "Cartes"
   },
   "cards": [
    {
     "id": "c1",
     "label": {
      "en": "Cards",
      "fr": "Cartes"
     },
     "lists": [
      {
       "field": "people",
       "label": {
        "en": "Who?",
        "fr": "Qui ?"
       }
      }
     ]
    }
   ]
  }
 ]
}
```
