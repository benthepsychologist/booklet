---
booklet: 2
id: example/the-board
title: The board and weekly review
lang: en
version: "0.1"
---

# The board, and the weekly review that reads it

A **board**: a page you edit in place and never finalize, together with a
weekly review that reads it back to you instead of handing you a blank page.

Both live in one module now, on purpose: a version 2 activity can only read
another activity's answers within its own module, never across a module
boundary, so keeping the board's fields readable by the review means keeping
them together.

It draws with the `card-board` engine: four cards, opened one at a time, each
leading with what you have already written rather than with a question.

## Adding it to a booklet

Open this file on its own, or copy everything below the front matter into
your own booklet, above the long rule.

> [!module|example-the-board] The board

What the work looks like right now, and a weekly review that reads it back to you.

> [!activity|board] The board

What the work actually looks like, kept where you can find it. Edited in place — nothing here is ever finalized.

> [!widget|cards] The board
> ![[#^project-board]]

```booklet widget
{ "engine": "card-board", "title": "The board",
  "cards": [
    { "id": "now", "label": "In flight", "blurb": "What is actually being worked on, as opposed to what you have agreed to.",
      "lists": [ { "field": "inflight", "label": "What is in flight right now?",
        "hint": "Things genuinely underway. If it has not been touched in a fortnight it is not in flight.", "menu": "inflight" } ] },
    { "id": "next", "label": "Next", "blurb": "The next thing, not the whole list. A board you cannot read is a list you will not open.",
      "lists": [ { "field": "next", "label": "What is next?",
        "hint": "Small enough to start without deciding anything else first.", "menu": "next" } ] },
    { "id": "stuck", "label": "Stuck", "blurb": "What is waiting on something, and what it is waiting on. Naming the blocker is most of the work.",
      "lists": [ { "field": "stuck", "label": "What is stuck, and on what?",
        "hint": "Write the blocker, not the feeling about the blocker.", "menu": "stuck" } ] },
    { "id": "done", "label": "Done", "blurb": "Kept deliberately. A board that only ever grows is one you stop opening.",
      "lists": [ { "field": "done", "label": "What is finished?",
        "hint": "Move things here rather than deleting them, at least for a while.", "menu": "done" } ] }
  ],
  "menus": {
    "inflight": ["A piece of writing", "A change to something that exists", "A conversation to have", "Something being learned"],
    "next": ["The smallest next step", "A decision to make", "Someone to ask", "Something to read first"],
    "stuck": ["Waiting on a reply", "Waiting on a decision", "Missing something to work with", "Needs a block of time"],
    "done": ["Shipped", "Abandoned on purpose", "Handed to someone else", "Turned out not to matter"]
  },
  "copy": { "h": "The board", "p": "What the work actually looks like, kept where you can find it. Edited in place — nothing here is ever finalized.",
    "mapped": "On the board", "nothing": "Nothing here yet — add one below, or open the questions.",
    "quick": "Add one you already know", "add": "Add", "explore": "Work one out",
    "exploreHint": "Questions, if you want them. Skip them if you do not.", "remove": "Remove", "count": "on the board" }
}
```
^project-board

> [!activity|review repeat] Weekly review

This offers you what is on your board rather than a blank page. Tick what is true; leave the rest.

> [!text|change] What would you change about how this week went?
> One thing. Not a plan — a change.

> [!text|note] Anything else worth recording?
> Only if there is something.

> [!module|example-the-board end] End of The board
