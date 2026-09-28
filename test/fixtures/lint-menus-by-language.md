---
module: fixture/menus
version: 0.1
status: approved
lang: en
---

# Linter fixture: menus written one list per language

A test fixture, not a module anybody is offered. Its board's widget offers its
options as one list per language, and so does a menu on the module itself.
`lint-booklet.py` finds nothing wrong with it. `test/menus.test.js` lints it,
and lints two copies of it that each break one rule: `lint-menus-length.md`
(one language's list is shorter) and `lint-menus-missing-language.md` (a menu
lacks a language the module's title is written in). The same test loads it
into the renderer.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file.

------------------------------------------------------------

```json
{
 "block": "module",
 "id": "fixture/menus",
 "version": "0.1",
 "title": { "en": "Errands", "fr": "Courses", "es": "Mandados" },
 "blurb": { "en": "What needs doing, and where.", "fr": "Ce qu’il faut faire, et où.", "es": "Qué hay que hacer, y dónde." },
 "menus": {
  "where": { "en": ["At home", "At work"], "fr": ["À la maison", "Au travail"], "es": ["En casa", "En el trabajo"] }
 },
 "mode": {
  "id": "errands",
  "kind": "board",
  "head": { "h": { "en": "Errands", "fr": "Courses", "es": "Mandados" } },
  "blocks": [
   { "id": "cards", "type": "widget", "widget": "fixture/errand-board", "keys": ["fields"] }
  ]
 },
 "widgets": [
  {
   "id": "fixture/errand-board",
   "version": "0.1",
   "engine": "card-board",
   "title": { "en": "Errands", "fr": "Courses", "es": "Mandados" },
   "cards": [
    { "id": "todo",
      "label": { "en": "To do", "fr": "À faire", "es": "Por hacer" },
      "lists": [
       { "field": "todo",
         "label": { "en": "What needs doing?", "fr": "Que faut-il faire ?", "es": "¿Qué hay que hacer?" } }
      ] }
   ],
   "menus": {
    "todo": {
     "en": ["Groceries", "Post office", "Pharmacy"],
     "fr": ["Épicerie", "Bureau de poste", "Pharmacie"],
     "es": ["Supermercado", "Correo", "Farmacia"]
    }
   },
   "copy": {
    "en": { "mapped": "On the list", "nothing": "Nothing yet.", "quick": "Add one", "add": "Add",
            "explore": "Ideas", "exploreHint": "Tap one to add it.", "remove": "Remove" },
    "fr": { "mapped": "Sur la liste", "nothing": "Rien pour l’instant.", "quick": "Ajoutez-en une", "add": "Ajouter",
            "explore": "Idées", "exploreHint": "Touchez-en une pour l’ajouter.", "remove": "Retirer" },
    "es": { "mapped": "En la lista", "nothing": "Nada todavía.", "quick": "Agrega una", "add": "Agregar",
            "explore": "Ideas", "exploreHint": "Toca una para agregarla.", "remove": "Quitar" }
   }
  }
 ]
}
```
