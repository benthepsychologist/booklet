# art/

The pictures Booklet's renderer carries. `test/art-sprite.js` turns this folder into one hidden SVG sprite inside
`booklet.html` (`node test/art-sprite.js --write booklet.html`, `--check` in `test/run.sh`), so a change here is a change
to the sprite, and the check fails until they agree.

## icons/ (Lucide)

161 icons from **Lucide** (`lucide-static` 1.48.0, https://lucide.dev), each file exactly as that package ships it, named
by Lucide's name. Licence: ISC, with an MIT portion for the icons derived from Feather (Copyright (c) 2013-present Cole
Bemis). The full text is in `LUCIDE-LICENSE.txt`. In the sprite each is `<symbol id="bi-<name>">`.

## spots/ (Booklet's own drawings)

24 flat spot illustrations on a 100 by 100 grid, in `art/spots/<name>.svg`. **Each is named by a Lucide name that is
also in `icons/`**, so a place that wants a spot and finds none can draw the icon of that name. In the sprite each is
`<symbol id="bs-<name>">`. Licence: Apache License 2.0, Copyright 2026 Ben Armstrong (the licence of this repository).

- Twelve come from the ERP "mapping the loop" page (`booklet-hub/clinical/erp-mapping-the-loop.original.html`):
  wheel (ship-wheel), compass, loop (refresh-cw), sprout, spark (sparkles), lens (search), wave (waves), tunnel
  (target), ladder (list-ordered), heart, talk (messages-square), send.
- Twelve come from the Andrea study page (`houseofarmstrong-site/static/andrea/study/index.html`): scale, shield,
  gavel, map, bulb (lightbulb), wrench, building (landmark), person (user), park (trees), fence, house, key.

A drawing carries **no colour value and no `style=`**. Its shapes take classes, and the renderer's CSS gives each class
its colour from the theme: `a` accent fill, `w` card fill, `s` sun fill, `p` ink fill, `l` accent stroke, `lw` card
stroke; `w l` is a card fill with an accent outline and `l s` a sun stroke. Stroke widths, caps and joins are attributes
on the shape. The drawings are otherwise exactly the originals' (a class that had a fixed width in the original sheet
became a `stroke-width` attribute).
