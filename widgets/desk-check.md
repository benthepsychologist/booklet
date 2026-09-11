---
widget: example/desk-check
version: 0.1
status: approved
lang: en
---

# Desk check

An `svg-regions` widget: a figure whose shapes carry a `data-r` region id, so
tapping a shape selects that region and then offers words for it. Two figures
here — a desk from above, and the chair — to show that a widget can have more
than one side.

The whole thing is markup and words. That is the point: it travels inside a
saved booklet, and works with no network.

------------------------------------------------------------

```json
{ "block": "widget",
 "id": "example/desk-check",
 "version": "0.1",
 "engine": "svg-regions",
 "title": { "en": "Desk check", "fr": "Vérification du poste" },
 "figures": [
  { "id": "desk", "label": { "en": "Desk", "fr": "Bureau" },
    "regions": ["screen", "keyboard", "lamp", "clutter"],
    "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='screen' x='60' y='12' width='80' height='50' rx='4'/><rect class='rg' data-r='keyboard' x='55' y='74' width='90' height='22' rx='3'/><rect class='rg' data-r='lamp' x='12' y='20' width='30' height='60' rx='6'/><rect class='rg' data-r='clutter' x='152' y='70' width='36' height='40' rx='4'/></svg>" },
  { "id": "chair", "label": { "en": "Chair", "fr": "Chaise" },
    "regions": ["seat", "back", "armrests"],
    "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='back' x='70' y='10' width='60' height='55' rx='6'/><rect class='rg' data-r='seat' x='62' y='70' width='76' height='24' rx='5'/><rect class='rg' data-r='armrests' x='40' y='66' width='18' height='34' rx='5'/></svg>" }
 ],
 "chips": ["lighting"],
 "regions": [
  { "id": "screen", "label": { "en": "Screen", "fr": "Écran" } },
  { "id": "keyboard", "label": { "en": "Keyboard", "fr": "Clavier" } },
  { "id": "lamp", "label": { "en": "Lamp", "fr": "Lampe" } },
  { "id": "clutter", "label": { "en": "The pile", "fr": "La pile" } },
  { "id": "seat", "label": { "en": "Seat", "fr": "Assise" } },
  { "id": "back", "label": { "en": "Backrest", "fr": "Dossier" } },
  { "id": "armrests", "label": { "en": "Armrests", "fr": "Accoudoirs" } },
  { "id": "lighting", "label": { "en": "Lighting overall", "fr": "Éclairage général" } }
 ],
 "senses": [
  { "id": "wrong", "label": { "en": "Needs attention", "fr": "À revoir" },
    "words": [ { "id": "wrong:0", "label": { "en": "too low", "fr": "trop bas" } },
               { "id": "wrong:1", "label": { "en": "too high", "fr": "trop haut" } },
               { "id": "wrong:2", "label": { "en": "too far", "fr": "trop loin" } },
               { "id": "wrong:3", "label": { "en": "cluttered", "fr": "encombré" } } ] },
  { "id": "noting", "label": { "en": "Just noting", "fr": "Simple constat" },
    "words": [ { "id": "noting:0", "label": { "en": "changed recently", "fr": "changé récemment" } },
               { "id": "noting:1", "label": { "en": "worth a photo", "fr": "à photographier" } } ] },
  { "id": "right", "label": { "en": "Working well", "fr": "Bien réglé" },
    "words": [ { "id": "right:0", "label": { "en": "comfortable", "fr": "confortable" } },
               { "id": "right:1", "label": { "en": "easy to reach", "fr": "à portée" } } ] }
 ],
 "copy": {
  "en": { "h": "Desk check", "p": "Tap anything you notice, then pick the words that fit.",
          "skip": "Skip the desk this time", "unskip": "Use the desk check",
          "pick": "What about it?", "clear": "Clear this one",
          "none": "Nothing selected yet — tap the drawing, or a button under it.",
          "sideLbl": "Desk or chair" },
  "fr": { "h": "Vérification du poste", "p": "Touchez ce que vous remarquez, puis choisissez les mots qui conviennent.",
          "skip": "Passer cette fois", "unskip": "Utiliser la vérification",
          "pick": "Qu'en est-il ?", "clear": "Effacer",
          "none": "Rien de sélectionné — touchez le dessin ou un bouton en dessous.",
          "sideLbl": "Bureau ou chaise" }
 }
}
```
