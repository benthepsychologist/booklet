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
 "title": { "en": "Desk check", "es": "Revisión del escritorio", "fr": "Vérification du poste" },
 "figures": [
  { "id": "desk", "label": { "en": "Desk", "es": "Escritorio", "fr": "Bureau" },
    "regions": ["screen", "keyboard", "lamp", "clutter"],
    "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='screen' x='60' y='12' width='80' height='50' rx='4'/><rect class='rg' data-r='keyboard' x='55' y='74' width='90' height='22' rx='3'/><rect class='rg' data-r='lamp' x='12' y='20' width='30' height='60' rx='6'/><rect class='rg' data-r='clutter' x='152' y='70' width='36' height='40' rx='4'/></svg>" },
  { "id": "chair", "label": { "en": "Chair", "es": "Silla", "fr": "Chaise" },
    "regions": ["seat", "back", "armrests"],
    "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='back' x='70' y='10' width='60' height='55' rx='6'/><rect class='rg' data-r='seat' x='62' y='70' width='76' height='24' rx='5'/><rect class='rg' data-r='armrests' x='40' y='66' width='18' height='34' rx='5'/></svg>" }
 ],
 "chips": ["lighting"],
 "regions": [
  { "id": "screen", "label": { "en": "Screen", "es": "Pantalla", "fr": "Écran" } },
  { "id": "keyboard", "label": { "en": "Keyboard", "es": "Teclado", "fr": "Clavier" } },
  { "id": "lamp", "label": { "en": "Lamp", "es": "Lámpara", "fr": "Lampe" } },
  { "id": "clutter", "label": { "en": "The pile", "es": "El montón", "fr": "La pile" } },
  { "id": "seat", "label": { "en": "Seat", "es": "Asiento", "fr": "Assise" } },
  { "id": "back", "label": { "en": "Backrest", "es": "Respaldo", "fr": "Dossier" } },
  { "id": "armrests", "label": { "en": "Armrests", "es": "Reposabrazos", "fr": "Accoudoirs" } },
  { "id": "lighting", "label": { "en": "Lighting overall", "es": "Iluminación general", "fr": "Éclairage général" } }
 ],
 "senses": [
  { "id": "wrong", "label": { "en": "Needs attention", "es": "Requiere atención", "fr": "À revoir" },
    "words": [ { "id": "wrong:0", "label": { "en": "too low", "es": "demasiado abajo", "fr": "trop bas" } },
               { "id": "wrong:1", "label": { "en": "too high", "es": "demasiado arriba", "fr": "trop haut" } },
               { "id": "wrong:2", "label": { "en": "too far", "es": "demasiado lejos", "fr": "trop loin" } },
               { "id": "wrong:3", "label": { "en": "cluttered", "es": "con desorden", "fr": "encombré" } } ] },
  { "id": "noting", "label": { "en": "Just noting", "es": "Solo para anotar", "fr": "Simple constat" },
    "words": [ { "id": "noting:0", "label": { "en": "changed recently", "es": "cambió hace poco", "fr": "changé récemment" } },
               { "id": "noting:1", "label": { "en": "worth a photo", "es": "merece una foto", "fr": "à photographier" } } ] },
  { "id": "right", "label": { "en": "Working well", "es": "Funciona bien", "fr": "Bien réglé" },
    "words": [ { "id": "right:0", "label": { "en": "comfortable", "es": "se siente bien", "fr": "confortable" } },
               { "id": "right:1", "label": { "en": "easy to reach", "es": "a mano", "fr": "à portée" } } ] }
 ],
 "copy": {
  "en": { "h": "Desk check", "p": "Tap anything you notice, then pick the words that fit.",
          "skip": "Skip the desk this time", "unskip": "Use the desk check",
          "pick": "What about it?", "clear": "Clear this one",
          "none": "Nothing selected yet — tap the drawing, or a button under it.",
          "sideLbl": "Desk or chair" },
  "es": { "h": "Revisión del escritorio", "p": "Toca lo que notes y elige las palabras que encajen.",
          "skip": "Omitir el escritorio esta vez", "unskip": "Revisar el escritorio",
          "pick": "¿Qué pasa con esto?", "clear": "Borrar esta parte",
          "none": "Aún no hay nada seleccionado — toca el dibujo o un botón debajo de él.",
          "sideLbl": "Escritorio o silla" },
  "fr": { "h": "Vérification du poste", "p": "Touchez ce que vous remarquez, puis choisissez les mots qui conviennent.",
          "skip": "Passer cette fois", "unskip": "Utiliser la vérification",
          "pick": "Qu'en est-il ?", "clear": "Effacer",
          "none": "Rien de sélectionné — touchez le dessin ou un bouton en dessous.",
          "sideLbl": "Bureau ou chaise" }
 }
}
```
