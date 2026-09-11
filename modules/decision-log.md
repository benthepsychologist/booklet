---
module: example/decision-log
version: 0.1
status: approved
lang: en
---

# Decision log

One entry per decision, written **at the time** rather than afterwards. The
value is not the decision; it is what you believed when you made it, which is
the part memory quietly rewrites.

An `entry` mode, so each decision is kept with its date and the history is the
list of them. The last question is the useful one and it is folded away on
purpose — you should be able to log a decision in thirty seconds and come back
to the rest.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file, or paste it
into **Add an activity** in the page's editor.

------------------------------------------------------------

```json
{ "block": "module",
 "id": "example/decision-log",
 "version": "0.1",
 "title": { "en": "Decision log", "fr": "Journal des décisions" },
 "blurb": { "en": "What you decided, and what you believed at the time.",
            "fr": "Ce que vous avez décidé, et ce que vous croyiez alors." },
 "display": { "order": 50 },
 "copy": {
  "en": { "decision": {
    "h": "Decision log",
    "f": {
     "what": ["What did you decide?", "In a sentence, as if telling someone who was not there."],
     "why": ["Why this one?", "The actual reason, not the defensible one."],
     "knew": ["What did you know, and what were you guessing?", "Separating these is the whole exercise."],
     "wrong": ["What would tell you this was wrong?", "Something you could actually notice, and roughly when."],
     "revisit": ["When would you look at this again?", "A date, or an event. 'Later' is not one."] } } },
  "fr": { "decision": {
    "h": "Journal des décisions",
    "f": {
     "what": ["Qu'avez-vous décidé ?", "En une phrase, comme à quelqu'un qui n'était pas là."],
     "why": ["Pourquoi celle-ci ?", "La vraie raison, pas celle qui se défend bien."],
     "knew": ["Que saviez-vous, et que supposiez-vous ?", "Les distinguer, c'est tout l'exercice."],
     "wrong": ["Qu'est-ce qui vous dirait que c'était une erreur ?", "Quelque chose de constatable, et à peu près quand."],
     "revisit": ["Quand y reviendrez-vous ?", "Une date, ou un événement. « Plus tard » n'en est pas un."] } } }
 },
 "mode": {
  "id": "decision",
  "kind": "entry",
  "accent": "petrol",
  "head": { "h": { "en": "Decision log", "fr": "Journal des décisions" } },
  "blocks": [
   { "id": "lede", "type": "prose", "display": { "order": 10 },
     "text": { "en": "Write this before you find out whether it worked. Afterwards you will remember having known things you were actually guessing, and the entry is only useful because it was written first.",
               "fr": "Écrivez ceci avant de savoir si cela a marché. Après coup, vous vous souviendrez d'avoir su des choses que vous supposiez, et l'entrée n'est utile que parce qu'elle a été écrite avant." } },
   { "id": "what", "type": "text", "q": ["decision", "what"], "display": { "order": 20 } },
   { "id": "why", "type": "text", "q": ["decision", "why"], "display": { "order": 30 } },
   { "id": "options", "type": "headlines", "q": ["decision", "options"],
     "keys": ["thoughts"], "display": { "order": 40 },
     "copy": { "en": "What else you considered", "fr": "Ce que vous avez aussi envisagé" } },
   { "id": "knew", "type": "text", "q": ["decision", "knew"], "display": { "order": 50 } },
   { "id": "later", "type": "group", "display": { "order": 60, "placement": "folded" },
     "copy": { "en": "What would change your mind", "fr": "Ce qui vous ferait changer d'avis" },
     "blocks": [
      { "id": "wrong", "type": "text", "q": ["decision", "wrong"] },
      { "id": "revisit", "type": "text", "q": ["decision", "revisit"] } ] }
  ]
 }
}
```
