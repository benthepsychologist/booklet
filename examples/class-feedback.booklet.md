---
booklet: "0.20"
id: example/class-feedback
title: Class feedback
lang: en
submit: class-feedback
---

# Class feedback

A short form a teacher might hand out at the end of a course. It is a complete booklet on its own: a reader fills it in, and it is kept in the reader's browser and can be downloaded, as any booklet is.

The `submit: class-feedback` line in this file's front matter does one thing, and only in a page that was built for it. It names **an endpoint by its short name**, and nothing else: it never carries an address. A host that wants answers sent back builds the renderer with a registry of named endpoints (`docs/hosting.md`, "The submit build"). In that page, and only if the registry lists `class-feedback`, a **Submit** button appears; it shows the reader the endpoint's name, owner and address, and the exact text that would be sent, and sends it only when the reader presses Send. In the ordinary renderer, or in a page whose registry has no such name, the line does nothing and the booklet works as it always does.

> [!activity|feedback] How was the course?

> [!scale|pace] How was the pace?

1. Too slow
2. About right
3. Too fast

> [!choice|useful] What was the most useful part?
- [ ] The readings
- [ ] The discussions
- [ ] The practice exercises

> [!text|better long] What would make the course better?
