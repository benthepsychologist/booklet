---
booklet: 0.7
id: fixture/tone-pair-not-hex
title: A colour pair that is not a colour
lang: en
---

> [!activity|a] Pick

> [!widget|pick] Pick one
> ![[#^grid]]

```booklet widget
{ "engine": "grid-select", "title": "Pick",
  "cells": [ { "id": "one", "label": "One", "color": { "tint": "#fff;background:url(https://x.test/a.png)", "deep": "#123456" } } ],
  "items": [ { "id": "a", "cell": "one", "label": "A" } ] }
```
^grid
