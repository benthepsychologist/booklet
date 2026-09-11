---
module: example/weekly-review
version: 0.1
status: approved
lang: en
---

# Weekly review

An activity that **reads another activity**. The board holds what the work looks
like; this asks, once a week, what actually moved — by offering you the board's
own entries rather than a blank box.

That is what `list` and `didlog` blocks are for, and this is the clearest place
to see them:

- a **`list`** draws its options from a board field, so the things you tick are
  the things you already wrote down;
- a **`didlog`** ticks off what really happened, from the lists above it.

`reads` names the board fields it draws on. It is **soft, not a dependency** —
without [`example/the-board`](the-board.md) installed the lists are simply
empty, and the activity still works.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file. Add
[The board](the-board.md) too, or the lists will have nothing to offer.

------------------------------------------------------------

```json
{ "block": "module",
 "id": "example/weekly-review",
 "version": "0.1",
 "title": { "en": "Weekly review", "fr": "Bilan de la semaine" },
 "blurb": { "en": "Once a week: what moved, what did not, and what to change.",
            "fr": "Une fois par semaine : ce qui a bougé, ce qui n'a pas bougé, et quoi changer." },
 "display": { "order": 40 },
 "reads": ["inflight", "next", "stuck", "done"],
 "copy": {
  "en": { "review": {
    "h": "Weekly review",
    "f": {
     "change": ["What would you change about how this week went?", "One thing. Not a plan — a change."],
     "note": ["Anything else worth recording?", "Only if there is something."] } } },
  "fr": { "review": {
    "h": "Bilan de la semaine",
    "f": {
     "change": ["Que changeriez-vous à la façon dont s'est passée cette semaine ?", "Une seule chose. Pas un plan — un changement."],
     "note": ["Autre chose à noter ?", "Seulement s'il y a quelque chose."] } } }
 },
 "mode": {
  "id": "review",
  "kind": "entry",
  "accent": "petrol",
  "head": { "h": { "en": "Weekly review", "fr": "Bilan de la semaine" } },
  "blocks": [
   { "id": "lede", "type": "prose", "display": { "order": 10 },
     "text": { "en": "This offers you what is on your board rather than a blank page. Tick what is true; leave the rest.",
               "fr": "Ceci vous propose ce qui est sur votre tableau plutôt qu'une page blanche. Cochez ce qui est vrai ; laissez le reste." } },
   { "id": "moved", "type": "list", "source": ["inflight", "next"],
     "display": { "order": 20 },
     "label": { "en": "What moved this week?", "fr": "Qu'est-ce qui a bougé cette semaine ?" },
     "hint": { "en": "From the board. Add anything that is not there.",
               "fr": "Depuis le tableau. Ajoutez ce qui n'y figure pas." } },
   { "id": "blocked", "type": "list", "source": ["stuck"],
     "display": { "order": 30 },
     "label": { "en": "What is still stuck?", "fr": "Qu'est-ce qui bloque encore ?" },
     "hint": { "en": "Still waiting on the same thing as last week is worth noticing.",
               "fr": "Attendre la même chose que la semaine dernière mérite d'être remarqué." } },
   { "id": "did", "type": "didlog", "of": ["moved", "blocked"],
     "display": { "order": 40 },
     "copy": {
      "en": { "h": "And of those, what actually got finished?",
              "p": "Tick only what is done. Half-done is not done, and saying so is the point.",
              "none": "Nothing ticked above yet — pick something first, and it will show up here." },
      "fr": { "h": "Et parmi cela, qu'est-ce qui est vraiment terminé ?",
              "p": "Ne cochez que ce qui est fait. À moitié fait n'est pas fait, et le dire est l'essentiel.",
              "none": "Rien de coché plus haut — choisissez d'abord, et cela apparaîtra ici." } } },
   { "id": "change", "type": "text", "q": ["review", "change"], "display": { "order": 50 } },
   { "id": "extra", "type": "group", "display": { "order": 60, "placement": "folded" },
     "copy": { "en": "Anything else", "fr": "Autre chose" },
     "blocks": [ { "id": "note", "type": "text", "q": ["review", "note"] } ] }
  ]
 }
}
```
