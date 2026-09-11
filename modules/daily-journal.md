---
module: example/daily-journal
version: 0.1
status: approved
lang: en
---

# Daily journal

The plainest possible activity: a question, some lines, and a few prompts you
can ignore. An `entry` mode, so each day you finish becomes a kept entry with a
date, and the history is the back button on all of them.

Worth reading as an example for two things: a `group` block folded away so the
page opens short, and question wording that belongs to the activity rather than
to the page drawing it — `copy.journal` below is where every label comes from.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file, or paste it
into **Add an activity** in the page's editor.

------------------------------------------------------------

```json
{ "block": "module",
 "id": "example/daily-journal",
 "version": "0.1",
 "title": { "en": "Daily journal", "fr": "Journal quotidien" },
 "blurb": { "en": "A few minutes at the end of a day. Nothing has to be interesting.",
            "fr": "Quelques minutes en fin de journée. Rien n'a besoin d'être intéressant." },
 "display": { "order": 30 },
 "copy": {
  "en": { "journal": {
    "h": "Daily journal",
    "f": {
     "day": ["What happened today?", "As much or as little as you want. Nobody reads this."],
     "lines": ["Worth keeping", "One line each, no explanation. A phrase is enough."],
     "mind": ["What is still on your mind?", "The thing you would still be thinking about at midnight."],
     "tomorrow": ["Anything for tomorrow?", "Only if there is something. Leave it blank otherwise."] } } },
  "fr": { "journal": {
    "h": "Journal quotidien",
    "f": {
     "day": ["Qu'est-ce qui s'est passé aujourd'hui ?", "Autant ou aussi peu que vous voulez. Personne ne lit ceci."],
     "lines": ["À garder", "Une ligne chacune, sans explication. Une expression suffit."],
     "mind": ["Qu'est-ce qui vous trotte encore dans la tête ?", "Ce à quoi vous penseriez encore à minuit."],
     "tomorrow": ["Quelque chose pour demain ?", "Seulement s'il y a quelque chose. Sinon, laissez vide."] } } }
 },
 "mode": {
  "id": "journal",
  "kind": "entry",
  "accent": "petrol",
  "head": { "h": { "en": "Daily journal", "fr": "Journal quotidien" } },
  "blocks": [
   { "id": "lede", "type": "prose", "display": { "order": 10 },
     "text": { "en": "Write as little as you like. An entry with one line in it is still an entry, and a run of short ones tells you more than a single long one.",
               "fr": "Écrivez aussi peu que vous voulez. Une entrée d'une ligne reste une entrée, et une série de courtes en dit plus qu'une seule longue." } },
   { "id": "day", "type": "text", "q": ["journal", "day"], "display": { "order": 20 } },
   { "id": "lines", "type": "headlines", "q": ["journal", "lines"],
     "keys": ["thoughts"], "display": { "order": 30 } },
   { "id": "more", "type": "group", "display": { "order": 40, "placement": "folded" },
     "copy": { "en": "A couple more, if you want them", "fr": "Deux de plus, si vous voulez" },
     "blocks": [
      { "id": "mind", "type": "text", "q": ["journal", "mind"] },
      { "id": "tomorrow", "type": "text", "q": ["journal", "tomorrow"] } ] }
  ]
 }
}
```
