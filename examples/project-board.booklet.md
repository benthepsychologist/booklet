---
booklet: 0.9
id: example/project-board
title: Studio project board
lang: en
version: "0.1"
---

# Studio project board

A small example: one board, read through the shared roles. Every query
here is two lines or three, because the fields are named for the parts they play. Everything
is invented.

> [!module|board] Studio project board

> [!activity|overview] Overview

## Where things stand

A status strip. No row has a value, so each tile is a short pill that can wrap.

```booklet query
from: strip
as: tiles
```

```booklet data
[ { "label": "Print run", "tone": "good", "note": "on time" },
  { "label": "Website copy", "tone": "warn", "note": "waiting on photos" },
  { "label": "Supplier contract", "tone": "bad" },
  { "label": "Launch party" },
  { "label": "Newsletter draft", "tone": "good" },
  { "label": "A long item whose name goes on for quite a while so that a narrow screen has to wrap it", "tone": "warn" } ]
```
^strip

## The numbers

Big tiles: a figure over a label, with a quiet note.

```booklet query
from: figures
as: tiles
```

```booklet data
[ { "label": "Orders open", "value": 14, "note": "since Monday", "tone": "good" },
  { "label": "Proofs late", "value": 3, "note": "two with the printer", "tone": "warn" },
  { "label": "Invoices unpaid", "value": 2, "tone": "bad" },
  { "label": "Samples out", "value": 9 } ]
```
^figures

## The week's tasks

A flat list: a badge, a label, the quiet extras, a value at the right and a note beneath.

```booklet query
from: tasks
as: list
```

```booklet data
{ "fields": { "label": "Task", "badge": "Area", "owner": "Owner", "due": "Due", "value": "Hours", "note": "Note", "tone": "Tone" },
  "rows": [
    { "label": "Proof the poster", "badge": "print", "owner": "Ines", "due": "Tue", "value": 3, "note": "Second round, colours only", "tone": "good" },
    { "label": "Order the paper", "badge": ["print", "supplier"], "owner": "Kofi", "due": "Wed", "value": 1, "tone": "warn" },
    { "label": "Write the shop page", "badge": "web", "owner": "Ines", "due": "Thu", "value": 5, "note": "Needs the photos first", "tone": "bad" },
    { "label": "Pack the samples", "owner": "Kofi", "due": "Fri", "value": 2 } ] }
```
^tasks

## By stage

The same kind of rows, gathered under a field. Each group is a card.

```booklet query
from: stages
as: list
group: stage
```

```booklet data
[ { "label": "Sketch the cover", "stage": "Draft", "badge": "design", "owner": "Ines" },
  { "label": "Edit chapter two", "stage": "Draft", "badge": "text", "owner": "Mara" },
  { "label": "Check the index", "stage": "Review", "badge": "text", "owner": "Kofi" },
  { "label": "Approve the proofs", "stage": "Review", "badge": "print", "owner": "Mara" },
  { "label": "Book the courier", "stage": "Ready", "owner": "Kofi", "tone": "good" } ]
```
^stages

## Everything open

A longer list: more than eight rows, so the sort and filter control appears.

```booklet query
from: backlog
as: list
```

```booklet data
{ "fields": { "label": "Task", "badge": "Area", "owner": "Owner", "due": "Due", "value": "Hours" },
  "rows": [
    { "label": "Photograph the range", "badge": "web", "owner": "Ines", "due": "Mon", "value": 6 },
    { "label": "Reply to the printer", "badge": "print", "owner": "Kofi", "due": "Mon", "value": 1 },
    { "label": "Draft the launch post", "badge": "web", "owner": "Mara", "due": "Tue", "value": 2 },
    { "label": "Update the price list", "badge": "supplier", "owner": "Kofi", "due": "Tue", "value": 2 },
    { "label": "Fold and stuff the mailing", "badge": "print", "owner": "Mara", "due": "Wed", "value": 4 },
    { "label": "Fix the checkout wording", "badge": "web", "owner": "Ines", "due": "Wed", "value": 1 },
    { "label": "Call the courier", "badge": "supplier", "owner": "Kofi", "due": "Thu", "value": 1 },
    { "label": "Tidy the workshop", "owner": "Mara", "due": "Thu", "value": 3 },
    { "label": "Back up the artwork", "badge": "print", "owner": "Ines", "due": "Fri", "value": 1 },
    { "label": "Plan next month", "owner": "Kofi", "due": "Fri", "value": 2 } ] }
```
^backlog

## The same rows, as a table

The long list again, now a table: the area is a column of pills, and each heading sorts.

```booklet query
from: backlog
as: table
```

## Who has what

A table. The badge column is drawn as pills, toned by the row's tone.

```booklet query
from: owners
as: table
fields: label, badge, owner, due
```

```booklet data
{ "fields": { "label": "Task", "badge": "Status", "owner": "Owner", "due": "Due" },
  "rows": [
    { "label": "Proof the poster", "badge": "Waiting", "owner": "Ines", "due": "Tue", "tone": "warn" },
    { "label": "Order the paper", "badge": "Done", "owner": "Kofi", "due": "Wed", "tone": "good" },
    { "label": "Write the shop page", "badge": "Late", "owner": "Ines", "due": "Thu", "tone": "bad" },
    { "label": "Pack the samples", "badge": "Planned", "owner": "Kofi", "due": "Fri" } ] }
```
^owners

## Effort by area

Bars: a label and a length.

```booklet query
from: effort
as: bars
```

```booklet data
[ { "label": "Print", "value": 12, "tone": "good" },
  { "label": "Web", "value": 9, "tone": "warn" },
  { "label": "Supplier", "value": 4 },
  { "label": "Workshop", "value": 3 } ]
```
^effort

> [!activity|log repeat] Studio log

> [!text|what] What happened?

> [!scale|mood] How did the day feel?
1. Rough
2. Fine
3. Good

> [!activity|look] Look back

## The log so far

```booklet query
from: log
```

> [!module|board end] End of Studio project board

> [!records] App record — do not edit below this line

> [!records|board] Studio project board

```booklet entries log
{"items": [
{"ts": "2026-09-21T09:00:00Z", "what": "Opened the studio", "mood": 2},
{"ts": "2026-09-22T09:00:00Z", "what": "Proofs came back", "mood": 3},
{"ts": "2026-09-23T09:00:00Z", "what": "A slow day", "mood": 1},
{"ts": "2026-09-24T09:00:00Z", "what": "Packed the samples", "mood": 3},
{"ts": "2026-09-25T09:00:00Z", "what": "Printer called", "mood": 2},
{"ts": "2026-09-26T09:00:00Z", "what": "Quiet Saturday", "mood": 3},
{"ts": "2026-09-27T09:00:00Z", "what": "Cleared the bench", "mood": 2},
{"ts": "2026-09-28T09:00:00Z", "what": "New paper arrived", "mood": 3},
{"ts": "2026-09-29T09:00:00Z", "what": "Photos shot", "mood": 3},
{"ts": "2026-09-30T09:00:00Z", "what": "Invoices sent", "mood": 2}
]}
```
