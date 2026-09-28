---
module: fixture/one-activity
version: 0.1
status: fixture
lang: en
---

# One activity, in `mode`

A small, deliberately v1-shaped fixture for testing the `mode` ↔ `activities`
round-trip. Not part of the registry, and never offered to a reader — see
`test/modules.test.js`.

```json
{ "block": "module",
 "id": "fixture/one-activity",
 "version": "0.1",
 "title": { "en": "One activity" },
 "blurb": { "en": "A fixture, not a real module." },
 "mode": {
  "id": "journal",
  "kind": "entry",
  "head": { "h": { "en": "One activity" } },
  "blocks": [
   { "id": "day", "type": "text", "q": ["journal", "day"], "display": { "order": 10 } },
   { "id": "lines", "type": "headlines", "q": ["journal", "lines"], "keys": ["thoughts"], "display": { "order": 20 } }
  ]
 },
 "copy": { "en": { "journal": { "h": "One activity",
   "f": { "day": ["What happened?", "Anything."] },
   "lines": ["Worth keeping", "One line each."] } } }
}
```
