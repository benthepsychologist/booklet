---
module: fixture/study-week
version: 0.1
status: approved
lang: en
---

# Study week

A test fixture, not a module anybody is offered: one module holding **two
activities** in `activities`, the three-layer shape (booklet → modules →
activities). Each activity keeps its own id, so each keeps its own entries.
`test/modules.test.js` loads it; `lint-booklet.py` must accept it.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file, or paste it
into **Add an activity** in the page's editor.

------------------------------------------------------------

```json
{ "block": "module",
 "id": "fixture/study-week",
 "version": "0.1",
 "title": { "en": "Study week", "fr": "Semaine d'étude" },
 "blurb": { "en": "Two activities that belong together: collect the words, then test yourself.",
            "fr": "Deux activités qui vont ensemble : noter les mots, puis se tester." },
 "copy": {
  "en": { "sw": { "f": {
    "words": ["New words", "One per line."],
    "unsure": ["Which ones are you unsure of?", "Only the ones you would guess at."],
    "answers": ["Write down what you remember", "No looking back."] } } },
  "fr": { "sw": { "f": {
    "words": ["Nouveaux mots", "Un par ligne."],
    "unsure": ["Desquels n'êtes-vous pas sûr ?", "Seulement ceux que vous devineriez."],
    "answers": ["Notez ce dont vous vous souvenez", "Sans regarder en arrière."] } } }
 },
 "activities": [
  { "id": "sw-words", "kind": "entry",
    "title": { "en": "Words", "fr": "Mots" },
    "blurb": { "en": "Collect this week's words.", "fr": "Notez les mots de la semaine." },
    "blocks": [
     { "id": "words", "type": "headlines", "q": ["sw", "words"], "keys": ["thoughts"] },
     { "id": "unsure", "type": "text", "q": ["sw", "unsure"] } ] },
  { "id": "sw-quiz", "kind": "entry",
    "title": { "en": "Quiz", "fr": "Quiz" },
    "blurb": { "en": "Test yourself on them.", "fr": "Testez-vous." },
    "blocks": [
     { "id": "answers", "type": "text", "q": ["sw", "answers"] } ] }
 ]
}
```
