---
booklet: 0.2
id: example/what-is-a-booklet
title: What is a booklet
lang: en
version: "0.1"
author: Booklet examples
license: Apache-2.0
---

# What is a booklet

A **guide**: a page that only reads. It asks nothing and keeps nothing. Add it
to a booklet and the booklet explains itself.

## Adding it to a booklet

Open this file on its own, or copy everything below the front matter into
your own booklet, above the long rule.

> [!module|example-what-is-a-booklet] What is a booklet

A short read: the file, the parts, and what is yours.

> [!activity|whatis] What is a booklet

## One file

A booklet is one Markdown file holding your work and the design of the activities you did it in. Open it in any text editor and the top half is everything you and this activity wrote, under headings, in plain prose.

Below a long horizontal rule is the same file's other half: your own answers and kept entries, written as JSON, one fenced block at a time. Each one is read on its own, so a block that will not parse costs you that block and nothing else — one mangled entry, never a lost file.

## Three parts, and only one holds anything

- **The renderer** — one static HTML page. It knows how to draw things — a clickable figure, a grid of words, cards opened one at a time — and holds no activities and no content of its own.
- **The booklet** — this file. Every activity, every question, every word you see, and everything you wrote. All of it is here, and none of it is anywhere else.
- **The wrapper** — whatever a website puts around the renderer: a booklet to start from, a list of modules you may add. Neither the renderer nor the format; just one way of getting a file into somebody's hands.

> The page is a viewer. Close the tab and it has nothing. The file is the thing you keep.

## Activities, and what they draw with

An activity is part of a module: a module travels whole, and is yours once it is in your file. You add one, and its questions become part of your booklet — which is the difference between "take this whole booklet or none of it" and "add this one thing to what I already have."

What an activity draws with is a widget: data, never code. The figures and the names of their parts, the cells of a grid and the words in them. A widget's data travels inside your file too, fenced at the end, so an activity never arrives without the thing it needs.

## Nothing is filed by position

Activities and questions are found by their id, not by where they sit on the page. What you wrote is filed under the id of the question that asked for it, and kept entries are identified by when they were kept.

That is why rearranging your page never moves your writing, and why hand-editing the file cannot scramble it.

## What this costs you

No account, no server, nothing sent anywhere. The page keeps a copy in your browser so you can close the tab and come back — and clearing your browser data would erase that, which is why Download exists and why the file you download is the real one.

It also means nobody can recover it for you. That is the trade.

> [!module|example-what-is-a-booklet end] End of What is a booklet
