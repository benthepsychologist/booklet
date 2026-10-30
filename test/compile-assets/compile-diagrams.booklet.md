---
booklet: "0.17"
id: fixture/compile-diagrams
title: Four diagrams
lang: en
version: "0.1"
---

# Four diagrams

A made-up page for the compiler's tests: a diagram that is drawn, one with a title of its own, one the renderer will not hand to its library, and one that cannot be drawn.

## Drawn

```mermaid
flowchart LR
  Rain --> River --> Sea
```

## With a title of its own

```mermaid
flowchart LR
  accTitle: Where the water goes
  Rain --> River --> Sea
```

## A diagram the renderer will not draw

Its source holds a directive, which can set a style or a font address, so the renderer never hands it to its library, and nor does the compiler.

```mermaid
%%{init: {"theme": "dark"}}%%
flowchart LR
  Rain --> River --> Sea
```

## A diagram that cannot be drawn

![[#^broken]]

```mermaid
flowchart LR
  %% the stand-in cannot draw this one
  Rain --> River --> Sea
```
^broken
