---
module: fixture/reading-tides
version: 0.1
status: approved
lang: en
---

# How tides work

A test fixture, not a module anybody is offered, on a neutral, made-up topic:
every source below is invented and every address is on example.org. It is one
**reading** activity in two pages. The first carries citation marks (`[^id]`)
in prose, a quote, a deflist and three callouts, one of each kind; the second
carries a `sources` block. The module holds the two registries, `sources` and
`citations`. `test/reading.test.js` loads it; `lint-booklet.py` must accept it.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file, or paste it
into **Add an activity** in the page's editor.

------------------------------------------------------------

```json
{
 "block": "module",
 "id": "fixture/reading-tides",
 "version": "0.1",
 "title": {
  "en": "How tides work",
  "es": "Cómo funcionan las mareas",
  "fr": "Comment fonctionnent les marées"
 },
 "blurb": {
  "en": "A short reading, with its sources.",
  "es": "Una lectura breve, con sus fuentes.",
  "fr": "Une courte lecture, avec ses sources."
 },
 "sources": [
  {
   "key": "harbour-atlas",
   "title": "The Harbour Tide Atlas",
   "edition": {
    "en": "2nd edition, 2019",
    "es": "2.ª edición, 2019",
    "fr": "2e édition, 2019"
   },
   "kind": "primary",
   "url": "https://example.org/harbour-tide-atlas.pdf"
  },
  {
   "key": "coast-notes",
   "title": "Coastal Studies: Course Notes",
   "edition": "Autumn 2025",
   "kind": "secondary"
  },
  {
   "key": "coastal-act",
   "title": "Coastal Access Act",
   "edition": "consolidated to 1 March 2026",
   "kind": "law",
   "url": "https://example.org/coastal-access-act"
  },
  {
   "key": "marsh-case",
   "title": "Port Authority v. Marsh",
   "edition": "1987",
   "kind": "case"
  }
 ],
 "citations": [
  {
   "id": "act-s12",
   "source": "coastal-act",
   "page": "s. 12",
   "quote": "The foreshore below the mean high-water mark is open to the public on foot.",
   "url": "https://example.org/coastal-access-act#s12",
   "verifiedOn": "2026-09-21",
   "verifiedBy": "text checked against the consolidated act"
  },
  {
   "id": "atlas-twice",
   "source": "harbour-atlas",
   "page": 12,
   "pagePdf": 18,
   "quote": "The tide rises and falls twice in each lunar day at most harbours on this coast.",
   "verifiedOn": "2026-09-20",
   "verifiedBy": "quote found on that page"
  },
  {
   "id": "marsh-moor",
   "source": "marsh-case",
   "page": 211,
   "quote": "A right of way on foot does not carry a right to moor."
  },
  {
   "id": "atlas-spring",
   "source": "harbour-atlas",
   "page": 47,
   "pagePdf": 53,
   "quote": "Spring tides follow the new and the full moon by a day or two.",
   "verifiedOn": "2026-09-20",
   "verifiedBy": "quote found on that page"
  },
  {
   "id": "notes-neap",
   "source": "coast-notes",
   "page": 3,
   "quote": "Neap tides come at the quarter moons."
  }
 ],
 "mode": {
  "id": "rd-tides",
  "kind": "guide",
  "pages": [
   {
    "id": "read",
    "title": {
     "en": "Reading",
     "es": "Lectura",
     "fr": "Lecture"
    },
    "blocks": [
     {
      "id": "h1",
      "type": "heading",
      "text": {
       "en": "Why the sea rises twice a day",
       "es": "Por qué el mar sube dos veces al día",
       "fr": "Pourquoi la mer monte deux fois par jour"
      }
     },
     {
      "id": "p1",
      "type": "prose",
      "text": {
       "en": "Most harbours on this coast see two high tides and two low tides each lunar day.[^atlas-twice] The moon's pull, and the earth turning beneath it, make the pattern.\n\nThe range changes over a fortnight: spring tides are the largest[^atlas-spring] and neap tides the smallest.[^notes-neap]",
       "es": "En la mayoría de los puertos de esta costa hay dos pleamares y dos bajamares cada día lunar.[^atlas-twice] La atracción de la luna, y la tierra que gira debajo de ella, forman ese patrón.\n\nLa amplitud cambia a lo largo de dos semanas: las mareas vivas son las mayores[^atlas-spring] y las mareas muertas, las menores.[^notes-neap]",
       "fr": "Dans la plupart des ports de cette côte, il y a deux pleines mers et deux basses mers par jour lunaire.[^atlas-twice] L’attraction de la lune, et la terre qui tourne sous elle, en donnent le rythme.\n\nLe marnage change en deux semaines : les vives-eaux sont les plus fortes[^atlas-spring] et les mortes-eaux les plus faibles.[^notes-neap]"
      }
     },
     {
      "id": "diff1",
      "type": "callout",
      "kind": "diff",
      "title": {
       "en": "Your guide says the tide turns every six hours",
       "es": "Tu guía dice que la marea cambia cada seis horas",
       "fr": "Votre guide dit que la marée s’inverse toutes les six heures"
      },
      "text": {
       "en": "The guide rounds it off. The tide rises and falls twice in each lunar day,[^atlas-twice] which is a little longer than a solar day, so high water comes a little later each day.",
       "es": "La guía redondea. La marea sube y baja dos veces por día lunar,[^atlas-twice] que es un poco más largo que un día solar, así que la pleamar llega un poco más tarde cada día.",
       "fr": "Le guide arrondit. La marée monte et descend deux fois par jour lunaire,[^atlas-twice] un peu plus long qu’un jour solaire : la pleine mer arrive donc un peu plus tard chaque jour."
      }
     },
     {
      "id": "q1",
      "type": "quote",
      "text": {
       "en": "Spring tides follow the new and the full moon by a day or two.[^atlas-spring]",
       "es": "Las mareas vivas llegan uno o dos días después de la luna nueva y la luna llena.[^atlas-spring]",
       "fr": "Les vives-eaux suivent la nouvelle et la pleine lune d’un jour ou deux.[^atlas-spring]"
      }
     },
     {
      "id": "law1",
      "type": "callout",
      "kind": "law",
      "title": {
       "en": "Walking on the foreshore",
       "es": "Caminar por la franja costera",
       "fr": "Marcher sur l’estran"
      },
      "text": {
       "en": "Since the act was consolidated in 2026, the foreshore below the mean high-water mark is open to anyone on foot.[^act-s12]",
       "es": "Desde que la ley se consolidó en 2026, la franja costera por debajo de la línea media de pleamar está abierta a cualquiera que vaya a pie.[^act-s12]",
       "fr": "Depuis la consolidation de la loi en 2026, l’estran sous la laisse moyenne de haute mer est ouvert à toute personne à pied.[^act-s12]"
      }
     },
     {
      "id": "terms",
      "type": "deflist",
      "items": [
       {
        "label": {
         "en": "Spring tide",
         "es": "Marea viva",
         "fr": "Vive-eau"
        },
        "body": {
         "en": "The largest range, near the new and the full moon.[^atlas-spring]",
         "es": "La mayor amplitud, cerca de la luna nueva y la luna llena.[^atlas-spring]",
         "fr": "Le plus fort marnage, vers la nouvelle et la pleine lune.[^atlas-spring]"
        }
       },
       {
        "label": {
         "en": "Neap tide",
         "es": "Marea muerta",
         "fr": "Morte-eau"
        },
        "body": {
         "en": "The smallest range, near the quarter moons.[^notes-neap]",
         "es": "La menor amplitud, cerca de los cuartos de luna.[^notes-neap]",
         "fr": "Le plus faible marnage, vers les quartiers de lune.[^notes-neap]"
        }
       }
      ]
     },
     {
      "id": "op1",
      "type": "callout",
      "kind": "opinion",
      "title": {
       "en": "Mooring is not walking",
       "es": "Amarrar no es caminar",
       "fr": "Amarrer n’est pas marcher"
      },
      "text": {
       "en": "One court read the right of way narrowly.[^marsh-moor] Take it as one reading of the law, not as the rule.",
       "es": "Un tribunal interpretó el derecho de paso de forma estricta.[^marsh-moor] Tómalo como una lectura de la ley, no como la regla.",
       "fr": "Un tribunal a lu le droit de passage de façon étroite.[^marsh-moor] C’est une lecture de la loi, pas la règle."
      }
     }
    ]
   },
   {
    "id": "sources",
    "title": {
     "en": "Sources",
     "es": "Fuentes",
     "fr": "Sources"
    },
    "blocks": [
     {
      "id": "src",
      "type": "sources",
      "title": {
       "en": "Where this comes from",
       "es": "De dónde viene esto",
       "fr": "D’où cela vient"
      }
     }
    ]
   }
  ]
 }
}
```
