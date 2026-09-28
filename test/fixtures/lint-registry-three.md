---
module: fixture/registry
version: 0.1
status: approved
lang: en
---

# Linter fixture: registry content in all three languages

A test fixture, not a module anybody is offered. Every per-language value
carries `en`, `fr` and `es`, so linted as registry content (`--registry`) it
is clean. `lint-registry-missing-es.md` is the same module with Spanish
missing in two places. `test/lint.test.js` checks both.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file.

------------------------------------------------------------

```json
{ "block": "module",
 "id": "fixture/registry",
 "version": "0.1",
 "title": { "en": "Registry fixture", "es": "Fixture del registro", "fr": "Fixture du registre" },
 "blurb": { "en": "Three languages, or a warning.", "es": "Tres idiomas, o una advertencia.", "fr": "Trois langues, ou un avertissement." },
 "copy": {
  "en": { "rg": { "f": { "a": ["What did you notice?", "One thing is enough."] } } },
  "es": { "rg": { "f": { "a": ["¿Qué notaste?", "Con una cosa basta."] } } },
  "fr": { "rg": { "f": { "a": ["Qu'avez-vous remarqué ?", "Une seule chose suffit."] } } }
 },
 "mode": {
  "id": "rg-main",
  "kind": "entry",
  "blocks": [
   { "id": "intro", "type": "prose",
     "text": { "en": "Hello.", "es": "Hola.", "fr": "Bonjour." } },
   { "id": "a", "type": "text", "q": ["rg", "a"] }
  ]
 }
}
```
