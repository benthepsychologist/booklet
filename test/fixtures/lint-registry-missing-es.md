---
module: fixture/registry
version: 0.1
status: approved
lang: en
---

# Linter fixture: registry content missing Spanish

A test fixture, not a module anybody is offered. It is
`lint-registry-three.md` with Spanish missing in two places: the title has no
`es` at all, and the Spanish `copy` has an empty hint where the English and
French have one. Linted as registry content (`--registry`), it earns one
warning naming both places; linted as the fixture it is, it is clean.
`test/lint.test.js` checks both.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file.

------------------------------------------------------------

```json
{ "block": "module",
 "id": "fixture/registry",
 "version": "0.1",
 "title": { "en": "Registry fixture", "fr": "Fixture du registre" },
 "blurb": { "en": "Three languages, or a warning.", "es": "Tres idiomas, o una advertencia.", "fr": "Trois langues, ou un avertissement." },
 "copy": {
  "en": { "rg": { "f": { "a": ["What did you notice?", "One thing is enough."] } } },
  "es": { "rg": { "f": { "a": ["¿Qué notaste?", ""] } } },
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
