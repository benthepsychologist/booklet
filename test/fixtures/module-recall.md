---
booklet: 0.2
id: fixture/recall
title: Log and look back
lang: en
version: "0.1"
---

# Log and look back

A test fixture: one activity that keeps entries, and a second that shows them
back with a recall.

> [!module|fixture-recall] Log and look back

A log, and a page that reads the log.

> [!activity|log repeat] Log a moment

> [!text|situation] What happened?

> [!scale|ease] How hard did it feel?
1. Not at all
2. A little
3. Very

> [!text|secret] Private note

> [!activity|look] Look back

> [!recall|moments from=log fields=situation,ease limit=5] Your moments so far

> [!recall|all-of-it from=log] Everything you kept

> [!module|fixture-recall end] End of Log and look back
