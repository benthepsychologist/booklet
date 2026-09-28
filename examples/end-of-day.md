---
booklet: 1
status: approved
title: "End of day"
lang: en
preset: "example/demo@0.1"
updated: 2026-09-27 10:39
---

# Booklet — my notes

<!--
How this file works:
  Above the long rule is yours: read it anywhere, edit it in any text editor. Below it is the app’s record — leave it alone.
  Shapes the app reads above the divider:
  - Label: text            one field. Multi-line text goes on indented lines below the label.
  - Move (since 2026-09-08): text   also Exploring: / Suggestion:  — under Now or under an area
  [starter] before text marks starter text the reader has not edited yet.
  ### 🚀 Area name       an area (under Areas). Add or rename freely.
  - 2026-09-08 · Move · Area · text → replaced     an archive line (under Archive). Area is always present; — means none.
  A section you edit here replaces that section of the record. A section you leave out is kept from the record.
  Appendix A and B are a readable copy of your kept entries. The app reads entries from the record, not from
  the appendices, so add, change or remove an entry in the app rather than here.
  Question settings also live only in the record; change them in the app.
-->

_Language: en_  
_Downloaded 2026-09-27 10:39_

## Now

- 

## Areas


## Big picture


## Archive


------------------------------------------------------------

## App record — do not edit below this line

A single JSON object. The app writes this block and reads it back; it holds your kept entries, question settings, and a copy of everything above. Edit the markdown above instead — where the two differ, the markdown wins for the sections it contains.

```json
{
 "block": "format",
 "read_this_first": "This file is a booklet: one Markdown file holding a person's work and the design of the activities they did it in. Everything below the long rule is a series of independent JSON blocks, each in its own ```json fence. Each block is parsed on its own — if one will not parse, only that block is lost.",
 "spec": "booklet-1",
 "record_version": 6,
 "full_spec": "https://github.com/benthepsychologist/booklet/blob/main/SPEC-v1.md",
 "blocks": {
  "format": "this block — the format, carried in the file",
  "meta": "which booklet this is, plus anything shared across modules (body figures, menus, the booklet's own head:{title,sub}, and the `languages` it declares, if any)",
  "module": "a module, whole and portable: one activity in `mode`, or several in `activities`. One block per module.",
  "person": "the reader's own settings: name, email, language, question wording overrides, and an optional sync slot {provider, ref, synced, rev} saying where the file is kept — no credentials, no account. Keep it exactly as found if you do not use it",
  "fields": "the board's content, an object keyed by field id: a map's own fields, and whatever is typed or picked in a `board` or `guide` activity, under the key each of its blocks owns",
  "entries": "kept entries for one activity: {mode, items:[…]}. One block per activity.",
  "board": "the Now board, areas and the archive",
  "drafts": "anything unfinished, so nothing is lost mid-thought: `today` and `checkin` under their own names, and every other activity's draft under `activities`, keyed by activity id"
 },
 "order_does_not_matter": "Blocks may appear in any order. Modules may appear in any order. Entries may appear in any order. Nothing is addressed by position: modules by `id`, data by field id, entries by their `ts`. Where a thing is *displayed* is set by `display.order`, and only if no sibling carries one does the written order decide anything.",
 "add_a_module": "Paste a module block — a ```json fence whose object has \"block\":\"module\" — anywhere below the long rule, or paste the same JSON into 'Add an activity' in the page's booklet editor. Adding a module whose id already exists replaces it in place.",
 "module_shape": {
  "block": "module",
  "id": "who/what — stable, and the address for adding or removing",
  "version": "0.1",
  "title": {
   "en": "Its name",
   "fr": "Son nom"
  },
  "blurb": {
   "en": "One line",
   "fr": "Une ligne"
  },
  "display": {
   "order": "lower first; omit and it falls back to written order",
   "show": "false hides it from the home screen"
  },
  "menus": {
   "a-menu-name": [
    "the options a list block offers"
   ],
   "a-menu-in-each-language": {
    "en": [
     "First",
     "Second"
    ],
    "fr": [
     "Premier",
     "Deuxième"
    ]
   }
  },
  "reads": [
   "map field ids this activity draws on, if any"
  ],
  "mode": {
   "id": "the activity id — also the name of its entries block",
   "kind": "entry | board | guide | log",
   "head": {
    "title": "copy reference for its heading"
   },
   "keep": [
    "fields that survive a finalize"
   ],
   "upsert": "\"day\" keeps one kept entry per calendar day instead of one per Finalize (entry kind only)",
   "blocks": [
    "see block_types"
   ],
   "pages": "instead of `blocks`, an activity shown as several pages lists them here: [{id, title:{en,fr}, blocks:[…]}, …], each page's blocks shaped like `blocks`. Never both keys; write one page as `blocks`. Pages are layout only: entries and drafts stay keyed by the activity id and by field id, so a block id or an answer field may be on one page only, and which page is showing is never saved."
  },
  "activities": "instead of `mode`, a module with several activities lists them here: [{id,kind,title,blurb,blocks…}, …], each shaped like `mode` and named by its own `title`. Never both keys; write one activity as `mode`. Activity ids are unique across the whole booklet, whichever module holds them.",
  "sources": "optional, for reading material: the works the module cites, [{key, title, edition, kind: primary|secondary|law|case, url?}]. `key` is unique within the module.",
  "citations": "optional, for reading material: [{id, source (a sources key), page (the printed page, or a place such as \"art. 14\"), pagePdf? (the PDF's own page number, when different), quote (one sentence, word for word), url? (this exact place), verifiedOn? (YYYY-MM-DD), verifiedBy? (how, in a few words)}]. `id` is unique within the module. A renderer shows whether a citation was verified; it never checks."
 },
 "menus": "A menu (in `menus` on a module, a widget or `meta`) is either one list of options for every language, or one list per language, {en:[…],fr:[…],es:[…]}, whose lists have the same length and order: an option is its place in the menu, so the third French option is the third English one. What a person picks is kept as the words they picked, in the language they picked them in; a reader recognises those words in any of the menu's languages and shows the option in the reader's language.",
 "citation_marks": "In the text of a prose, quote, deflist or callout block, [^id] marks the citation with that id in the module's `citations`. A renderer draws it as a small number (numbered by first appearance in the activity) that opens the source, page and quote; a mark whose id is not in `citations` is drawn as a broken mark.",
 "block_types": {
  "text": "a question with a written answer. Needs q:[scope,key].",
  "headlines": "repeated one-line entries. Needs q:[scope,key]. Owns `thoughts`.",
  "list": "tappable options plus a free add. Needs source:[mapFieldId…] and copy or label.",
  "didlog": "tick what actually happened. Needs of:[blockId…].",
  "quadrants": "the energy/valence feelings grid. Owns `emotions`.",
  "bodymap": "the front and back figures. Owns `regions`.",
  "group": "nested blocks. Needs blocks:[…].",
  "callout": "reading set apart, of one kind: diff (differs from the reader's guide), law (the law now), opinion (an author's view). Needs kind, and text:{en,…} or blocks:[…]; title optional. A reader may bring one kind forward and fold the others; that choice is never saved.",
  "sources": "the module's `sources`, each with the citations that point at it and a way back to each mark. Optional title."
 },
 "where_data_goes": "A block owns the entry keys named in its `keys`, defaulting to its own `id`. So a text block with id 'extra' writes entry.extra; a list block with id 'needs' writes entry.needs. The three composite widgets own a differently-named key and say so: bodymap→regions, quadrants→emotions, headlines→thoughts. Board content is not in entries at all — it lives in the `fields` block, keyed by field id: a map's own fields, and what a `board` or `guide` activity's blocks hold, each under the key the block owns.",
 "display_parameters": "Anything with a `display` object: {order:number, show:boolean, placement:'open'|'folded'|'hidden'}. `order` sorts among siblings, lower first, stable, and anything without one sorts last. `show:false` takes a module off the home screen but keeps its data. `placement` applies to a block inside an activity: open renders in place, folded hides it behind a disclosure (which must be named), hidden does not render but keeps its data.",
 "if_it_is_not_displaying": [
  "A module needs a `mode` (or an `activities` list, never both) whose activities each have a `kind` the renderer knows (entry, board, guide, log). An unknown kind is refused.",
  "A block needs a `type` from block_types. An unknown type draws nothing.",
  "A citation mark shown as broken, [?id], names an id the module's `citations` does not hold. A renderer older than citations shows the mark as the text [^id], and a callout or sources block as a note that it cannot draw it.",
  "An activity holds its blocks in `blocks`, or in `pages` when it has several pages, never both. A module whose activity has one block id or answer field on two pages is refused, and the load message names the field and both pages. A renderer older than `pages` shows such an activity with no blocks.",
  "Check `display.show` on the module and `display.placement` on the block.",
  "A folded block with no `copy` and no `label` is a disclosure with no summary — name it.",
  "A list block whose `source` names a field no map card holds will simply have nothing to offer.",
  "Two modules sharing an id: the second replaces the first.",
  "A module holding an activity id that another module already holds is refused, and the load message names both."
 ]
}
```

```json
{
 "block": "meta",
 "app": "booklet",
 "v": 6,
 "booklet": 1,
 "written": "2026-09-27T10:39:00Z",
 "booklet_id": "example/demo",
 "booklet_version": "0.1",
 "customized": true,
 "title": null,
 "body": {
  "front": [
   "head",
   "jaw",
   "neck",
   "shoulders",
   "chest",
   "arms",
   "stomach",
   "hips",
   "legs",
   "feet"
  ],
  "back": [
   "head",
   "neck",
   "shoulders",
   "back",
   "lowerback",
   "arms",
   "hips",
   "legs",
   "feet"
  ],
  "chips": [
   "allover"
  ],
  "sides": [
   "front",
   "back"
  ]
 }
}
```

```json
{
 "block": "widget",
 "id": "example/desk-check",
 "version": "0.1",
 "engine": "svg-regions",
 "title": {
  "en": "Desk check",
  "es": "Revisión del escritorio",
  "fr": "Vérification du poste"
 },
 "figures": [
  {
   "id": "desk",
   "label": {
    "en": "Desk",
    "es": "Escritorio",
    "fr": "Bureau"
   },
   "regions": [
    "screen",
    "keyboard",
    "lamp",
    "clutter"
   ],
   "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='screen' x='60' y='12' width='80' height='50' rx='4'/><rect class='rg' data-r='keyboard' x='55' y='74' width='90' height='22' rx='3'/><rect class='rg' data-r='lamp' x='12' y='20' width='30' height='60' rx='6'/><rect class='rg' data-r='clutter' x='152' y='70' width='36' height='40' rx='4'/></svg>"
  },
  {
   "id": "chair",
   "label": {
    "en": "Chair",
    "es": "Silla",
    "fr": "Chaise"
   },
   "regions": [
    "seat",
    "back",
    "armrests"
   ],
   "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='back' x='70' y='10' width='60' height='55' rx='6'/><rect class='rg' data-r='seat' x='62' y='70' width='76' height='24' rx='5'/><rect class='rg' data-r='armrests' x='40' y='66' width='18' height='34' rx='5'/></svg>"
  }
 ],
 "chips": [
  "lighting"
 ],
 "regions": [
  {
   "id": "screen",
   "label": {
    "en": "Screen",
    "es": "Pantalla",
    "fr": "Écran"
   }
  },
  {
   "id": "keyboard",
   "label": {
    "en": "Keyboard",
    "es": "Teclado",
    "fr": "Clavier"
   }
  },
  {
   "id": "lamp",
   "label": {
    "en": "Lamp",
    "es": "Lámpara",
    "fr": "Lampe"
   }
  },
  {
   "id": "clutter",
   "label": {
    "en": "The pile",
    "es": "El montón",
    "fr": "La pile"
   }
  },
  {
   "id": "seat",
   "label": {
    "en": "Seat",
    "es": "Asiento",
    "fr": "Assise"
   }
  },
  {
   "id": "back",
   "label": {
    "en": "Backrest",
    "es": "Respaldo",
    "fr": "Dossier"
   }
  },
  {
   "id": "armrests",
   "label": {
    "en": "Armrests",
    "es": "Reposabrazos",
    "fr": "Accoudoirs"
   }
  },
  {
   "id": "lighting",
   "label": {
    "en": "Lighting overall",
    "es": "Iluminación general",
    "fr": "Éclairage général"
   }
  }
 ],
 "senses": [
  {
   "id": "wrong",
   "label": {
    "en": "Needs attention",
    "es": "Requiere atención",
    "fr": "À revoir"
   },
   "words": [
    {
     "id": "wrong:0",
     "label": {
      "en": "too low",
      "es": "demasiado abajo",
      "fr": "trop bas"
     }
    },
    {
     "id": "wrong:1",
     "label": {
      "en": "too high",
      "es": "demasiado arriba",
      "fr": "trop haut"
     }
    },
    {
     "id": "wrong:2",
     "label": {
      "en": "too far",
      "es": "demasiado lejos",
      "fr": "trop loin"
     }
    },
    {
     "id": "wrong:3",
     "label": {
      "en": "cluttered",
      "es": "con desorden",
      "fr": "encombré"
     }
    }
   ]
  },
  {
   "id": "noting",
   "label": {
    "en": "Just noting",
    "es": "Solo para anotar",
    "fr": "Simple constat"
   },
   "words": [
    {
     "id": "noting:0",
     "label": {
      "en": "changed recently",
      "es": "cambió hace poco",
      "fr": "changé récemment"
     }
    },
    {
     "id": "noting:1",
     "label": {
      "en": "worth a photo",
      "es": "merece una foto",
      "fr": "à photographier"
     }
    }
   ]
  },
  {
   "id": "right",
   "label": {
    "en": "Working well",
    "es": "Funciona bien",
    "fr": "Bien réglé"
   },
   "words": [
    {
     "id": "right:0",
     "label": {
      "en": "comfortable",
      "es": "se siente bien",
      "fr": "confortable"
     }
    },
    {
     "id": "right:1",
     "label": {
      "en": "easy to reach",
      "es": "a mano",
      "fr": "à portée"
     }
    }
   ]
  }
 ],
 "copy": {
  "en": {
   "h": "Desk check",
   "p": "Tap anything you notice, then pick the words that fit.",
   "skip": "Skip the desk this time",
   "unskip": "Use the desk check",
   "pick": "What about it?",
   "clear": "Clear this one",
   "none": "Nothing selected yet — tap the drawing, or a button under it.",
   "sideLbl": "Desk or chair"
  },
  "es": {
   "h": "Revisión del escritorio",
   "p": "Toca lo que notes y elige las palabras que encajen.",
   "skip": "Omitir el escritorio esta vez",
   "unskip": "Revisar el escritorio",
   "pick": "¿Qué pasa con esto?",
   "clear": "Borrar esta parte",
   "none": "Aún no hay nada seleccionado — toca el dibujo o un botón debajo de él.",
   "sideLbl": "Escritorio o silla"
  },
  "fr": {
   "h": "Vérification du poste",
   "p": "Touchez ce que vous remarquez, puis choisissez les mots qui conviennent.",
   "skip": "Passer cette fois",
   "unskip": "Utiliser la vérification",
   "pick": "Qu'en est-il ?",
   "clear": "Effacer",
   "none": "Rien de sélectionné — touchez le dessin ou un bouton en dessous.",
   "sideLbl": "Bureau ou chaise"
  }
 }
}
```

```json
{
 "block": "widget",
 "id": "example/effort-impact",
 "version": "0.1",
 "engine": "grid-select",
 "title": {
  "en": "Effort and impact",
  "es": "Esfuerzo e impacto",
  "fr": "Effort et impact"
 },
 "axes": {
  "top": {
   "en": "more effort",
   "es": "más esfuerzo",
   "fr": "plus d'effort"
  },
  "bottom": {
   "en": "less effort",
   "es": "menos esfuerzo",
   "fr": "moins d'effort"
  },
  "left": {
   "en": "less payoff",
   "es": "menos beneficio",
   "fr": "moins de retombées"
  },
  "right": {
   "en": "more payoff",
   "es": "más beneficio",
   "fr": "plus de retombées"
  }
 },
 "cells": [
  {
   "id": "slog",
   "label": {
    "en": "Slog",
    "es": "Tarea pesada",
    "fr": "Corvée"
   },
   "note": {
    "en": "Costly, and not worth much. Worth asking whether it has to happen at all.",
    "es": "Cuesta mucho y vale poco. Vale la pena preguntarse si de verdad hace falta hacerlo.",
    "fr": "Coûteux et peu rentable. À se demander si c'est vraiment nécessaire."
   },
   "color": {
    "tint": "#E4DCD6",
    "deep": "#6B5648"
   }
  },
  {
   "id": "project",
   "label": {
    "en": "Project",
    "es": "Proyecto",
    "fr": "Projet"
   },
   "note": {
    "en": "Costly but worth it. These are the ones to plan rather than squeeze in.",
    "es": "Cuesta mucho, pero vale la pena. Estos conviene planearlos, no encajarlos donde se pueda.",
    "fr": "Coûteux mais rentable. À planifier plutôt qu'à caser."
   },
   "color": {
    "tint": "#DCE7D2",
    "deep": "#4F6B3A"
   }
  },
  {
   "id": "filler",
   "label": {
    "en": "Filler",
    "es": "Relleno",
    "fr": "Bouche-trou"
   },
   "note": {
    "en": "Cheap and low payoff. Fine when you have ten minutes and no momentum.",
    "es": "Cuesta poco y aporta poco. Está bien cuando tienes diez minutos y te falta impulso.",
    "fr": "Rapide et peu rentable. Parfait pour dix minutes sans élan."
   },
   "color": {
    "tint": "#DEE2E6",
    "deep": "#465B66"
   }
  },
  {
   "id": "quickwin",
   "label": {
    "en": "Quick win",
    "es": "Logro rápido",
    "fr": "Gain rapide"
   },
   "note": {
    "en": "Cheap and worth it. Do these first; they buy the room for everything else.",
    "es": "Cuesta poco y vale la pena. Haz estos primero; te dan margen para todo lo demás.",
    "fr": "Rapide et rentable. À faire en premier : ça dégage de la place."
   },
   "color": {
    "tint": "#D5E3E1",
    "deep": "#166B63"
   }
  }
 ],
 "items": [
  {
   "id": "rewrite",
   "cell": "slog",
   "label": {
    "en": "Rewrite from scratch",
    "es": "Reescribir desde cero",
    "fr": "Tout réécrire"
   }
  },
  {
   "id": "chase",
   "cell": "slog",
   "label": {
    "en": "Chase a reply",
    "es": "Insistir por una respuesta",
    "fr": "Relancer sans réponse"
   }
  },
  {
   "id": "migrate",
   "cell": "project",
   "label": {
    "en": "Migrate something",
    "es": "Migrar algo",
    "fr": "Migrer quelque chose"
   }
  },
  {
   "id": "learn",
   "cell": "project",
   "label": {
    "en": "Learn the tool properly",
    "es": "Aprender bien la herramienta",
    "fr": "Apprendre l'outil à fond"
   }
  },
  {
   "id": "tidy",
   "cell": "filler",
   "label": {
    "en": "Tidy up",
    "es": "Poner orden",
    "fr": "Ranger"
   }
  },
  {
   "id": "skim",
   "cell": "filler",
   "label": {
    "en": "Skim the backlog",
    "es": "Hojear los pendientes",
    "fr": "Survoler l'arriéré"
   }
  },
  {
   "id": "reply",
   "cell": "quickwin",
   "label": {
    "en": "Send the one-line reply",
    "es": "Enviar la respuesta de una línea",
    "fr": "Envoyer la réponse d'une ligne"
   }
  },
  {
   "id": "unblock",
   "cell": "quickwin",
   "label": {
    "en": "Unblock someone",
    "es": "Desbloquear a alguien",
    "fr": "Débloquer quelqu'un"
   }
  }
 ],
 "copy": {
  "en": {
   "h": "Effort and impact",
   "p": "Tap whatever you did, or plan to. More than one is normal."
  },
  "es": {
   "h": "Esfuerzo e impacto",
   "p": "Toca lo que hiciste o planeas hacer. Más de uno es normal."
  },
  "fr": {
   "h": "Effort et impact",
   "p": "Touchez ce que vous avez fait ou prévoyez. Plusieurs, c'est normal."
  }
 }
}
```

```json
{
 "block": "module",
 "id": "example/end-of-day",
 "version": "0.1",
 "title": {
  "en": "End of day",
  "es": "Fin del día",
  "fr": "Fin de journée"
 },
 "blurb": {
  "en": "Five minutes, once, before you shut the laptop.",
  "es": "Cinco minutos, una vez, antes de cerrar la computadora.",
  "fr": "Cinq minutes, une fois, avant de fermer l'ordinateur."
 },
 "display": {
  "order": 10
 },
 "copy": {
  "en": {
   "eod": {
    "h": "End of day",
    "f": {
     "snag": [
      "What got in the way?",
      "One sentence is plenty."
     ]
    },
    "lines": [
     "Worth remembering",
     "A short line, no explanation."
    ]
   }
  },
  "es": {
   "eod": {
    "h": "Fin del día",
    "f": {
     "snag": [
      "¿Qué se interpuso?",
      "Una frase basta."
     ]
    },
    "lines": [
     "Lo que vale recordar",
     "Una línea corta, sin explicación."
    ]
   }
  },
  "fr": {
   "eod": {
    "h": "Fin de journée",
    "f": {
     "snag": [
      "Qu'est-ce qui a gêné ?",
      "Une phrase suffit."
     ]
    },
    "lines": [
     "À retenir",
     "Une ligne courte, sans explication."
    ]
   }
  }
 },
 "mode": {
  "id": "eod",
  "kind": "entry",
  "accent": "petrol",
  "head": {
   "h": {
    "en": "End of day",
    "es": "Fin del día",
    "fr": "Fin de journée"
   }
  },
  "blocks": [
   {
    "id": "intro",
    "type": "prose",
    "display": {
     "order": 10
    },
    "text": {
     "en": "Nothing here is scored and nothing is sent anywhere. Skip whatever does not apply.",
     "es": "Aquí nada se califica y nada se envía a ninguna parte. Omite lo que no corresponda.",
     "fr": "Rien n'est noté ni transmis. Passez ce qui ne s'applique pas."
    }
   },
   {
    "id": "desk",
    "type": "widget",
    "widget": "example/desk-check",
    "keys": [
     "regions"
    ],
    "skippable": true,
    "display": {
     "order": 20
    }
   },
   {
    "id": "work",
    "type": "widget",
    "widget": "example/effort-impact",
    "keys": [
     "emotions"
    ],
    "display": {
     "order": 30
    }
   },
   {
    "id": "snag",
    "type": "text",
    "q": [
     "eod",
     "snag"
    ],
    "display": {
     "order": 40
    }
   },
   {
    "id": "lines",
    "type": "headlines",
    "q": [
     "eod",
     "lines"
    ],
    "keys": [
     "thoughts"
    ],
    "display": {
     "order": 50,
     "placement": "folded"
    },
    "copy": {
     "en": "Worth remembering",
     "es": "Lo que vale recordar",
     "fr": "À retenir"
    }
   }
  ]
 },
 "widgets": [
  {
   "id": "example/desk-check",
   "version": "0.1",
   "engine": "svg-regions",
   "title": {
    "en": "Desk check",
    "es": "Revisión del escritorio",
    "fr": "Vérification du poste"
   },
   "figures": [
    {
     "id": "desk",
     "label": {
      "en": "Desk",
      "es": "Escritorio",
      "fr": "Bureau"
     },
     "regions": [
      "screen",
      "keyboard",
      "lamp",
      "clutter"
     ],
     "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='screen' x='60' y='12' width='80' height='50' rx='4'/><rect class='rg' data-r='keyboard' x='55' y='74' width='90' height='22' rx='3'/><rect class='rg' data-r='lamp' x='12' y='20' width='30' height='60' rx='6'/><rect class='rg' data-r='clutter' x='152' y='70' width='36' height='40' rx='4'/></svg>"
    },
    {
     "id": "chair",
     "label": {
      "en": "Chair",
      "es": "Silla",
      "fr": "Chaise"
     },
     "regions": [
      "seat",
      "back",
      "armrests"
     ],
     "svg": "<svg viewBox='0 0 200 140' xmlns='http://www.w3.org/2000/svg'><rect class='rg' data-r='back' x='70' y='10' width='60' height='55' rx='6'/><rect class='rg' data-r='seat' x='62' y='70' width='76' height='24' rx='5'/><rect class='rg' data-r='armrests' x='40' y='66' width='18' height='34' rx='5'/></svg>"
    }
   ],
   "chips": [
    "lighting"
   ],
   "regions": [
    {
     "id": "screen",
     "label": {
      "en": "Screen",
      "es": "Pantalla",
      "fr": "Écran"
     }
    },
    {
     "id": "keyboard",
     "label": {
      "en": "Keyboard",
      "es": "Teclado",
      "fr": "Clavier"
     }
    },
    {
     "id": "lamp",
     "label": {
      "en": "Lamp",
      "es": "Lámpara",
      "fr": "Lampe"
     }
    },
    {
     "id": "clutter",
     "label": {
      "en": "The pile",
      "es": "El montón",
      "fr": "La pile"
     }
    },
    {
     "id": "seat",
     "label": {
      "en": "Seat",
      "es": "Asiento",
      "fr": "Assise"
     }
    },
    {
     "id": "back",
     "label": {
      "en": "Backrest",
      "es": "Respaldo",
      "fr": "Dossier"
     }
    },
    {
     "id": "armrests",
     "label": {
      "en": "Armrests",
      "es": "Reposabrazos",
      "fr": "Accoudoirs"
     }
    },
    {
     "id": "lighting",
     "label": {
      "en": "Lighting overall",
      "es": "Iluminación general",
      "fr": "Éclairage général"
     }
    }
   ],
   "senses": [
    {
     "id": "wrong",
     "label": {
      "en": "Needs attention",
      "es": "Requiere atención",
      "fr": "À revoir"
     },
     "words": [
      {
       "id": "wrong:0",
       "label": {
        "en": "too low",
        "es": "demasiado abajo",
        "fr": "trop bas"
       }
      },
      {
       "id": "wrong:1",
       "label": {
        "en": "too high",
        "es": "demasiado arriba",
        "fr": "trop haut"
       }
      },
      {
       "id": "wrong:2",
       "label": {
        "en": "too far",
        "es": "demasiado lejos",
        "fr": "trop loin"
       }
      },
      {
       "id": "wrong:3",
       "label": {
        "en": "cluttered",
        "es": "con desorden",
        "fr": "encombré"
       }
      }
     ]
    },
    {
     "id": "noting",
     "label": {
      "en": "Just noting",
      "es": "Solo para anotar",
      "fr": "Simple constat"
     },
     "words": [
      {
       "id": "noting:0",
       "label": {
        "en": "changed recently",
        "es": "cambió hace poco",
        "fr": "changé récemment"
       }
      },
      {
       "id": "noting:1",
       "label": {
        "en": "worth a photo",
        "es": "merece una foto",
        "fr": "à photographier"
       }
      }
     ]
    },
    {
     "id": "right",
     "label": {
      "en": "Working well",
      "es": "Funciona bien",
      "fr": "Bien réglé"
     },
     "words": [
      {
       "id": "right:0",
       "label": {
        "en": "comfortable",
        "es": "se siente bien",
        "fr": "confortable"
       }
      },
      {
       "id": "right:1",
       "label": {
        "en": "easy to reach",
        "es": "a mano",
        "fr": "à portée"
       }
      }
     ]
    }
   ],
   "copy": {
    "en": {
     "h": "Desk check",
     "p": "Tap anything you notice, then pick the words that fit.",
     "skip": "Skip the desk this time",
     "unskip": "Use the desk check",
     "pick": "What about it?",
     "clear": "Clear this one",
     "none": "Nothing selected yet — tap the drawing, or a button under it.",
     "sideLbl": "Desk or chair"
    },
    "es": {
     "h": "Revisión del escritorio",
     "p": "Toca lo que notes y elige las palabras que encajen.",
     "skip": "Omitir el escritorio esta vez",
     "unskip": "Revisar el escritorio",
     "pick": "¿Qué pasa con esto?",
     "clear": "Borrar esta parte",
     "none": "Aún no hay nada seleccionado — toca el dibujo o un botón debajo de él.",
     "sideLbl": "Escritorio o silla"
    },
    "fr": {
     "h": "Vérification du poste",
     "p": "Touchez ce que vous remarquez, puis choisissez les mots qui conviennent.",
     "skip": "Passer cette fois",
     "unskip": "Utiliser la vérification",
     "pick": "Qu'en est-il ?",
     "clear": "Effacer",
     "none": "Rien de sélectionné — touchez le dessin ou un bouton en dessous.",
     "sideLbl": "Bureau ou chaise"
    }
   }
  },
  {
   "id": "example/effort-impact",
   "version": "0.1",
   "engine": "grid-select",
   "title": {
    "en": "Effort and impact",
    "es": "Esfuerzo e impacto",
    "fr": "Effort et impact"
   },
   "axes": {
    "top": {
     "en": "more effort",
     "es": "más esfuerzo",
     "fr": "plus d'effort"
    },
    "bottom": {
     "en": "less effort",
     "es": "menos esfuerzo",
     "fr": "moins d'effort"
    },
    "left": {
     "en": "less payoff",
     "es": "menos beneficio",
     "fr": "moins de retombées"
    },
    "right": {
     "en": "more payoff",
     "es": "más beneficio",
     "fr": "plus de retombées"
    }
   },
   "cells": [
    {
     "id": "slog",
     "label": {
      "en": "Slog",
      "es": "Tarea pesada",
      "fr": "Corvée"
     },
     "note": {
      "en": "Costly, and not worth much. Worth asking whether it has to happen at all.",
      "es": "Cuesta mucho y vale poco. Vale la pena preguntarse si de verdad hace falta hacerlo.",
      "fr": "Coûteux et peu rentable. À se demander si c'est vraiment nécessaire."
     },
     "color": {
      "tint": "#E4DCD6",
      "deep": "#6B5648"
     }
    },
    {
     "id": "project",
     "label": {
      "en": "Project",
      "es": "Proyecto",
      "fr": "Projet"
     },
     "note": {
      "en": "Costly but worth it. These are the ones to plan rather than squeeze in.",
      "es": "Cuesta mucho, pero vale la pena. Estos conviene planearlos, no encajarlos donde se pueda.",
      "fr": "Coûteux mais rentable. À planifier plutôt qu'à caser."
     },
     "color": {
      "tint": "#DCE7D2",
      "deep": "#4F6B3A"
     }
    },
    {
     "id": "filler",
     "label": {
      "en": "Filler",
      "es": "Relleno",
      "fr": "Bouche-trou"
     },
     "note": {
      "en": "Cheap and low payoff. Fine when you have ten minutes and no momentum.",
      "es": "Cuesta poco y aporta poco. Está bien cuando tienes diez minutos y te falta impulso.",
      "fr": "Rapide et peu rentable. Parfait pour dix minutes sans élan."
     },
     "color": {
      "tint": "#DEE2E6",
      "deep": "#465B66"
     }
    },
    {
     "id": "quickwin",
     "label": {
      "en": "Quick win",
      "es": "Logro rápido",
      "fr": "Gain rapide"
     },
     "note": {
      "en": "Cheap and worth it. Do these first; they buy the room for everything else.",
      "es": "Cuesta poco y vale la pena. Haz estos primero; te dan margen para todo lo demás.",
      "fr": "Rapide et rentable. À faire en premier : ça dégage de la place."
     },
     "color": {
      "tint": "#D5E3E1",
      "deep": "#166B63"
     }
    }
   ],
   "items": [
    {
     "id": "rewrite",
     "cell": "slog",
     "label": {
      "en": "Rewrite from scratch",
      "es": "Reescribir desde cero",
      "fr": "Tout réécrire"
     }
    },
    {
     "id": "chase",
     "cell": "slog",
     "label": {
      "en": "Chase a reply",
      "es": "Insistir por una respuesta",
      "fr": "Relancer sans réponse"
     }
    },
    {
     "id": "migrate",
     "cell": "project",
     "label": {
      "en": "Migrate something",
      "es": "Migrar algo",
      "fr": "Migrer quelque chose"
     }
    },
    {
     "id": "learn",
     "cell": "project",
     "label": {
      "en": "Learn the tool properly",
      "es": "Aprender bien la herramienta",
      "fr": "Apprendre l'outil à fond"
     }
    },
    {
     "id": "tidy",
     "cell": "filler",
     "label": {
      "en": "Tidy up",
      "es": "Poner orden",
      "fr": "Ranger"
     }
    },
    {
     "id": "skim",
     "cell": "filler",
     "label": {
      "en": "Skim the backlog",
      "es": "Hojear los pendientes",
      "fr": "Survoler l'arriéré"
     }
    },
    {
     "id": "reply",
     "cell": "quickwin",
     "label": {
      "en": "Send the one-line reply",
      "es": "Enviar la respuesta de una línea",
      "fr": "Envoyer la réponse d'une ligne"
     }
    },
    {
     "id": "unblock",
     "cell": "quickwin",
     "label": {
      "en": "Unblock someone",
      "es": "Desbloquear a alguien",
      "fr": "Débloquer quelqu'un"
     }
    }
   ],
   "copy": {
    "en": {
     "h": "Effort and impact",
     "p": "Tap whatever you did, or plan to. More than one is normal."
    },
    "es": {
     "h": "Esfuerzo e impacto",
     "p": "Toca lo que hiciste o planeas hacer. Más de uno es normal."
    },
    "fr": {
     "h": "Effort et impact",
     "p": "Touchez ce que vous avez fait ou prévoyez. Plusieurs, c'est normal."
    }
   }
  }
 ]
}
```

```json
{
 "block": "person",
 "name": "",
 "email": "",
 "sync": null,
 "protect": false,
 "lang": "en",
 "mode": "full",
 "note": "",
 "q": {},
 "emo": {
  "extra": {}
 },
 "prefs": {
  "noRemind": false,
  "skipBody": false
 },
 "setup": {
  "done": false,
  "charge": "",
  "reading": "",
  "domains": [],
  "counts": true
 }
}
```

```json
{
 "block": "page",
 "blocks": []
}
```

```json
{
 "block": "fields",
 "fields": {}
}
```

```json
{
 "block": "board",
 "now": {
  "items": []
 },
 "areas": [],
 "archive": [],
 "big": {
  "s1": {
   "area": "",
   "change": "",
   "obstacle": "",
   "topic": "",
   "happening": "",
   "meaning": "",
   "unknown": ""
  },
  "s2": {
   "more": "",
   "protect": "",
   "ordinary": "",
   "oblige": "",
   "costs": ""
  },
  "s3": {
   "kinds": [],
   "notes": ""
  },
  "s4": {
   "question": "",
   "purpose": "",
   "limits": "",
   "help": "",
   "review": ""
  },
  "s5": {
   "notes": ""
  },
  "s6": {
   "what": "",
   "learned": "",
   "follows": ""
  },
  "starter": {}
 }
}
```

```json
{
 "block": "entries",
 "mode": "checkins",
 "items": []
}
```

```json
{
 "block": "entries",
 "mode": "today",
 "items": []
}
```

```json
{
 "block": "drafts",
 "today": null,
 "checkin": null
}
```
