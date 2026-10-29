---
booklet: "0.16"
id: fixture/compile-theme
title: A theme with bad values
lang: en
version: "0.1"
---

# A theme with bad values

A made-up booklet for the compiler's theme test. Its theme names an accent colour that cannot be read at the contrast the format asks for, and values that are not colours or words. Everything in it is invented.

```booklet theme
base: daylight
paper: "#fffbe8"
ink: "#2a2118"
accent: "#f0e8c8"
good: "#007a3d"
bad: "red; } body{display:none"
font: "serif; background:url(https://example.org/x)"
density: "roomy\"; --bk-ink:#ff0000"
style: briefing
```

> [!module|themed] A themed page

> [!activity|only] The only activity

A paragraph in the theme, and a small view to show it.

```booklet query
from: rows
as: tiles
value: n
label: what
tone: tone
```

```booklet data
{ "rows": [ { "what": "Fine", "n": 1, "tone": "good" }, { "what": "Watch", "n": 2, "tone": "warn" } ] }
```
^rows

> [!module|themed end] End of A themed page
