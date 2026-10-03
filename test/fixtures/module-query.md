---
booklet: 0.5
id: fixture/query
title: Log and look back
lang: en
version: "0.1"
---

# Log and look back

A test fixture: one activity that keeps entries, and a second that shows them
back with `booklet query` blocks. A second module holds an activity of its own,
to test the module boundary.

> [!module|fixture-query] Log and look back

A log, and a page that reads the log.

> [!activity|log repeat] Log a moment

> [!text|situation] What happened?

> [!scale|ease] How hard did it feel?
1. Not at all
2. A little
3. Very

> [!text|secret] Private note

> [!activity|look] Look back

## Your moments so far

```booklet query
from: log
```

## Just what happened

```booklet query
from: situation
```

## The last one, two fields, in the order asked

```booklet query
from: log
fields: ease, situation
newest: 1
empty: Nothing logged yet.
```

> [!module|fixture-query end] End of Log and look back

> [!module|fixture-other] Another module

> [!activity|elsewhere repeat] Elsewhere

> [!text|far] Far away

> [!module|fixture-other end] End of Another module
