---
module: example/what-is-a-booklet
version: 0.1
status: approved
lang: en
author: Booklet examples
license: Apache-2.0
---

# What is a booklet

A **guide**: a page that only reads. It asks nothing, keeps nothing, and has no
Finalize button — which makes it the simplest possible demonstration of the
five reading blocks (`heading`, `prose`, `deflist`, `quote`, `image`) and of
`rail`, the section index a long page builds from its own headings.

It is also the documentation, as an activity. Add it to a booklet and the
booklet explains itself.

## Adding it to a booklet

Paste the block below anywhere under the long rule of your file, or paste it
into **Add an activity** in the page's editor.

------------------------------------------------------------

```json
{ "block": "module",
 "id": "example/what-is-a-booklet",
 "version": "0.1",
 "title": { "en": "What is a booklet", "fr": "Qu'est-ce qu'un carnet" },
 "blurb": { "en": "A short read: the file, the parts, and what is yours.",
            "fr": "Une courte lecture : le fichier, les parties, et ce qui vous appartient." },
 "display": { "order": 90 },
 "mode": {
  "id": "whatis",
  "kind": "guide",
  "accent": "petrol",
  "rail": true,
  "head": { "h": { "en": "What is a booklet", "fr": "Qu'est-ce qu'un carnet" },
            "p": { "en": "The file, the parts, and what is yours.",
                   "fr": "Le fichier, les parties, et ce qui vous appartient." } },
  "blocks": [
   { "id": "s1", "type": "heading", "n": 1, "display": { "order": 10 },
     "text": { "en": "One file", "fr": "Un seul fichier" } },
   { "id": "s1p", "type": "prose", "display": { "order": 20 },
     "text": { "en": "A booklet is one Markdown file holding your work and the design of the activities you did it in. Open it in any text editor and the top half is everything you wrote, under headings, in plain prose.\n\nPast a long horizontal rule is the same file's other half: a series of fenced JSON blocks describing the activities themselves. Each one is read on its own, so a block that will not parse costs you that block and nothing else — one mangled activity, never a lost file.",
               "fr": "Un carnet est un seul fichier Markdown contenant votre travail et la conception des activités qui l'ont produit. Ouvrez-le dans n'importe quel éditeur : la moitié supérieure est tout ce que vous avez écrit, sous des titres, en texte clair.\n\nAprès une longue règle horizontale vient l'autre moitié : une série de blocs JSON décrivant les activités. Chacun est lu séparément — un bloc illisible vous coûte ce bloc et rien d'autre." } },

   { "id": "s2", "type": "heading", "n": 2, "display": { "order": 30 },
     "text": { "en": "Three parts, and only one holds anything", "fr": "Trois parties, une seule contient quelque chose" } },
   { "id": "s2d", "type": "deflist", "display": { "order": 40 },
     "items": [
      { "label": { "en": "The renderer", "fr": "Le moteur de rendu" },
        "body": { "en": "One static HTML page. It knows how to draw things — a clickable figure, a grid of words, cards opened one at a time — and holds no activities and no content of its own.",
                  "fr": "Une page HTML statique. Elle sait dessiner — une figure cliquable, une grille de mots, des cartes ouvertes une à une — et ne contient aucune activité ni aucun contenu." } },
      { "label": { "en": "The booklet", "fr": "Le carnet" },
        "body": { "en": "This file. Every activity, every question, every word you see, and everything you wrote. All of it is here, and none of it is anywhere else.",
                  "fr": "Ce fichier. Chaque activité, chaque question, chaque mot que vous voyez, et tout ce que vous avez écrit. Tout est ici, et nulle part ailleurs." } },
      { "label": { "en": "The wrapper", "fr": "L'enveloppe" },
        "body": { "en": "Whatever a website puts around the renderer — a booklet to start from, a list of activities you may add. Neither the renderer nor the format; just one way of getting a file into somebody's hands.",
                  "fr": "Ce qu'un site ajoute autour du moteur — un carnet de départ, une liste d'activités à ajouter. Ni le moteur ni le format : une façon parmi d'autres de vous remettre un fichier." } } ] },
   { "id": "s2q", "type": "quote", "display": { "order": 50 },
     "text": { "en": "The page is a viewer. Close the tab and it has nothing. The file is the thing you keep.",
               "fr": "La page est une visionneuse. Fermez l'onglet et il ne lui reste rien. Le fichier est ce que vous gardez." } },

   { "id": "s3", "type": "heading", "n": 3, "display": { "order": 60 },
     "text": { "en": "Activities, and what they draw with", "fr": "Les activités et ce avec quoi elles dessinent" } },
   { "id": "s3p", "type": "prose", "display": { "order": 70 },
     "text": { "en": "An activity is a module: whole, portable, and yours once it is in your file. You add one or take one out — which is the difference between \"take this whole booklet or none of it\" and \"add this one thing to what I already have\".\n\nWhat an activity draws with is a widget: data, never code. The figures and the names of their parts, the cells of a grid and the words in them. A widget travels inside your file too, so an activity never arrives without the thing it needs.",
               "fr": "Une activité est un module : entier, portable, et vôtre dès qu'il est dans votre fichier. Vous en ajoutez un ou vous en retirez un — c'est la différence entre « prenez ce carnet entier ou rien » et « ajoutez cette chose-ci à ce que j'ai déjà ».\n\nCe avec quoi une activité dessine est un élément : des données, jamais du code. Il voyage aussi dans votre fichier, pour qu'une activité n'arrive jamais sans ce dont elle a besoin." } },

   { "id": "s4", "type": "heading", "n": 4, "display": { "order": 80 },
     "text": { "en": "Nothing is filed by position", "fr": "Rien n'est rangé par position" } },
   { "id": "s4p", "type": "prose", "display": { "order": 90 },
     "text": { "en": "Activities are found by name, what you wrote is filed under the name of the question that asked for it, and kept entries are identified by when they were kept. Where something appears on screen is a separate number you can change.\n\nThat is why rearranging your page never moves your writing, and why hand-editing the file cannot scramble it.",
               "fr": "Les activités sont trouvées par leur nom, ce que vous écrivez est classé sous le nom de la question qui l'a demandé, et les entrées gardées sont identifiées par leur date. L'endroit où une chose apparaît à l'écran est un nombre distinct que vous pouvez changer.\n\nC'est pourquoi réorganiser votre page ne déplace jamais ce que vous avez écrit." } },

   { "id": "s5", "type": "heading", "n": 5, "display": { "order": 100 },
     "text": { "en": "What this costs you", "fr": "Ce que cela vous coûte" } },
   { "id": "s5p", "type": "prose", "display": { "order": 110 },
     "text": { "en": "No account, no server, nothing sent anywhere. The page keeps a copy in your browser so you can close the tab and come back — and clearing your browser data would erase that, which is why Download exists and why the file you download is the real one.\n\nIt also means nobody can recover it for you. That is the trade.",
               "fr": "Aucun compte, aucun serveur, rien n'est transmis. La page garde une copie dans votre navigateur pour que vous puissiez fermer l'onglet et revenir — effacer les données du navigateur l'effacerait, d'où le bouton Télécharger et d'où le fait que le fichier téléchargé est le vrai.\n\nCela veut dire aussi que personne ne peut le récupérer à votre place. C'est le compromis." } }
  ]
 }
}
```
