---
booklet: "0.11"
title: Lint fixture
lang: en
---

# Lint fixture

> [!module|mod-1] One

> [!activity|a] A

> [!widget|w] Pick
> ![[#^picker]]

> [!module|mod-1 end]

> [!module|mod-2] Two

> [!activity|b] B

> [!widget|w] Pick
> ![[#^picker]]

> [!module|mod-2 end]

> [!data|mod-1] Data for One

```booklet widget
{ "engine": "grid-select" }
```
^picker

> [!data|mod-2] Data for Two

```booklet widget
{ "engine": "grid-select" }
```
^picker

> [!data] Data

```booklet data
[{"a": 1}]
```
^rows
