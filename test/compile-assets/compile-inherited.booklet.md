---
booklet: "0.21"
id: fixture/compile-inherited
title: Fields named like members
lang: en
version: "0.1"
---

# Fields named like members

A made-up booklet for the compiler's test of fields named `constructor`, `toString`, `valueOf`, `hasOwnProperty` and `__proto__`. Two of
its three rows lack them all and the third carries each with a real value; a parent row holds two child rows, one of which has `constructor`.
Everything in it is invented.

> [!module|inh] Fields named like members

> [!activity|tests] Tests

## 1 A table

```booklet query
from: rows
as: table
fields: name, constructor, toString, valueOf, hasOwnProperty, __proto__
```

## 2 A list

```booklet query
from: rows
as: list
label: name
value: valueOf
note: hasOwnProperty
badge: toString
fields: score
```

## 3 Cards

```booklet query
from: rows
as: cards
label: constructor
note: toString
value: valueOf
fields: name
```

## 4 Tiles

```booklet query
from: rows
as: tiles
label: constructor
value: valueOf
note: hasOwnProperty
```

## 5 Bars

```booklet query
from: rows
as: bars
label: toString
value: score
```

## 6 A line

```booklet query
from: rows
as: line
label: hasOwnProperty
fields: score
```

## 7 A table grouped by a field named like a member

```booklet query
from: rows
as: table
group: constructor
fields: name, score
```

## 8 Nested rows

```booklet query
from: nested
as: table
fields: name, constructor, score
```

## 9 A nested list

```booklet query
from: nested
as: list
label: name
note: constructor
fields: score
```

```booklet data
{"rows": [{"id": "a", "name": "Alpha", "score": 3, "kind": "odd"}, {"id": "b", "name": "Beta", "score": 5, "kind": "even"}, {"id": "c", "name": "Gamma", "score": 7, "kind": "odd", "constructor": "real ctor", "toString": "real text", "valueOf": "real value", "hasOwnProperty": "real has", "__proto__": "real proto"}]}
```
^rows

```booklet data
{"rows": [{"id": "p", "name": "Parent", "items": [{"id": "c1", "name": "Child one", "score": 1}, {"id": "c2", "name": "Child two", "score": 2, "constructor": "child ctor"}]}]}
```
^nested

> [!module|inh end]
