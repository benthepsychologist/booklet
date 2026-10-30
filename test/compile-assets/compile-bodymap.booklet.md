---
booklet: "0.17"
id: fixture/compile-bodymap
title: A body map
lang: en
version: "0.1"
---

> [!module|map] A body map

A made-up booklet for the compiler's tests: a body map whose figure is drawn, a second whose figure is refused, and a third drawn with several figures.

> [!activity|where] Where it shows

> [!widget|body-map readonly describe] Where do you feel it?
> ![[#^body-map]]

> [!widget|bad-map readonly] A figure that carries a script
> ![[#^bad-map]]

> [!module|map end] End of A body map

> [!data|map] Data for A body map

```booklet widget
{ "engine": "svg-regions",
  "figures": [
    { "id": "front", "label": "Front",
      "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 160\" class=\"figure\" aria-hidden=\"true\" focusable=\"false\">\n  <defs><clipPath id=\"headclip\"><ellipse cx=\"50\" cy=\"20\" rx=\"16\" ry=\"18\"/></clipPath></defs>\n  <g clip-path=\"url(#headclip)\">\n    <rect class=\"rg\" data-r=\"head\" x=\"30\" y=\"0\" width=\"40\" height=\"40\"/>\n  </g>\n  <ellipse class=\"outline\" cx=\"50\" cy=\"20\" rx=\"16\" ry=\"18\"/>\n  <path class=\"rg\" data-r=\"chest\" d=\"M30 44 Q50 38 70 44 L68 84 Q50 90 32 84 Z\" style=\"stroke-width:3\"/>\n  <path class=\"rg\" data-r=\"arms\" d=\"M26 46 L14 100 L22 102 L32 52 Z\"/>\n  <path class=\"rg\" data-r=\"arms\" d=\"M74 46 L86 100 L78 102 L68 52 Z\"/>\n  <text x=\"50\" y=\"150\" text-anchor=\"middle\" font-size=\"9\">Profile: front</text>\n</svg>",
      "regions": ["head", "chest", "arms"] },
    { "id": "back", "label": "Back",
      "svg": "<svg viewBox=\"0 0 100 160\" aria-hidden=\"true\">\n  <use href=\"#bk\" x=\"0\" y=\"0\"/>\n  <defs><path id=\"bk\" class=\"rg\" data-r=\"back\" d=\"M30 44 Q50 38 70 44 L68 90 Q50 96 32 90 Z\"/></defs>\n</svg>",
      "regions": ["back"] } ],
  "regions": [
    { "id": "head", "label": "Head", "note": "From the crown to the jaw." },
    { "id": "chest", "label": "Chest", "note": "Between the collar bones and the ribs." },
    { "id": "arms", "label": "Arms" },
    { "id": "back", "label": "Back" } ],
  "senses": [ { "id": "warm", "words": [ { "id": "hot", "label": "Hot" } ] } ],
  "copy": { "h": "Body map", "p": "Point to where you feel it." } }
```
^body-map

```booklet widget
{ "engine": "svg-regions",
  "figures": [
    { "id": "only", "label": "Only",
      "svg": "<svg viewBox=\"0 0 10 10\"><script>document.title='x'</script><rect class=\"rg\" data-r=\"box\" x=\"1\" y=\"1\" width=\"8\" height=\"8\"/></svg>",
      "regions": ["box"] } ],
  "regions": [ { "id": "box", "label": "Box" } ],
  "copy": { "h": "Bad map", "p": "Nothing here." } }
```
^bad-map
