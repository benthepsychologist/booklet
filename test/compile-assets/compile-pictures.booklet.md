---
booklet: "0.16"
id: fixture/compile-pictures
title: A page of pictures
lang: en
version: "0.1"
---

# A page of pictures

A made-up page for the compiler's tests: a picture of each kind, so each can be written with the size its file gives it.

## Drawn from a file

A drawing in each format a page may hold.

![A wave, as a PNG](compile-pictures/wave.png)

![A tide table, as a JPEG](compile-pictures/tide.jpg)

![A gull, as a GIF](compile-pictures/gull.gif)

![Kelp, as a WebP](compile-pictures/kelp.webp)

![A shell, as an SVG that has a viewBox only](compile-pictures/shell.svg)

![A reef, as an SVG that has a width and a height](compile-pictures/reef.svg)

## Without a size

A PNG whose header stops before its size is still drawn, as it always was, with no width or height written.

![A file that does not say how big it is](compile-pictures/odd.png)
