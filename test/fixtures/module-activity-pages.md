---
module: fixture/paged-study
version: 0.1
status: approved
lang: en
---

# Paged study

A test fixture, not a module anybody is offered: one activity shown as **two
pages** in `pages`, each page a list of blocks. The activity keeps one id, one
draft and one set of kept entries whichever page a block is on, so its answers
are keyed exactly as a one-page activity's are. `test/pages.test.js` loads it;
`lint-booklet.py` must accept it.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file, or paste it
into **Add an activity** in the page's editor.

------------------------------------------------------------

```json
{ "block": "module",
 "id": "fixture/paged-study",
 "version": "0.1",
 "title": { "en": "Paged study", "fr": "Étude en pages" },
 "blurb": { "en": "Read first, then answer.", "fr": "Lire d'abord, puis répondre." },
 "copy": {
  "en": { "ps": { "f": {
    "notes": ["What stood out", "A line or two."],
    "answer": ["Your answer", "In your own words."] } } },
  "fr": { "ps": { "f": {
    "notes": ["Ce qui ressort", "Une ligne ou deux."],
    "answer": ["Votre réponse", "Dans vos propres mots."] } } }
 },
 "mode": { "id": "ps-study", "kind": "entry",
  "pages": [
   { "id": "read", "title": { "en": "Read", "fr": "Lire" },
     "blocks": [
      { "id": "intro", "type": "prose", "text": { "en": "Read this part first.", "fr": "Lisez d'abord cette partie." } },
      { "id": "notes", "type": "text", "q": ["ps", "notes"] } ] },
   { "id": "respond", "title": { "en": "Respond", "fr": "Répondre" },
     "blocks": [
      { "id": "answer", "type": "text", "q": ["ps", "answer"] } ] } ] }
}
```
