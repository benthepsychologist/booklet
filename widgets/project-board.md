---
widget: example/project-board
version: 0.1
status: approved
lang: en
---

# Project board

A `card-board` widget: cards opened one at a time, each leading with what is
already written down, then a quick way to add something, then the questions
that find something new — folded away, because a page that opens with questions
is a form and a page that opens with your own answers is a board.

A board is edited in place and never finalized, which is what separates it from
an activity that keeps entries.

------------------------------------------------------------

```json
{ "block": "widget",
 "id": "example/project-board",
 "version": "0.1",
 "engine": "card-board",
 "title": { "en": "The board", "es": "El tablero", "fr": "Le tableau" },
 "cards": [
  { "id": "now",
    "label": { "en": "In flight", "es": "En curso", "fr": "En cours" },
    "blurb": { "en": "What is actually being worked on, as opposed to what you have agreed to.",
               "es": "En lo que de verdad estás trabajando, no lo que aceptaste hacer.",
               "fr": "Ce sur quoi vous travaillez vraiment, par opposition à ce que vous avez accepté." },
    "lists": [
     { "field": "inflight",
       "label": { "en": "What is in flight right now?", "es": "¿Qué está en curso ahora mismo?", "fr": "Qu'est-ce qui est en cours ?" },
       "hint": { "en": "Things genuinely underway. If it has not been touched in a fortnight it is not in flight.",
                 "es": "Cosas realmente en marcha. Si algo lleva dos semanas sin tocarse, no está en curso.",
                 "fr": "Ce qui avance réellement. Si rien n'a bougé depuis quinze jours, ce n'est pas en cours." },
       "menu": "inflight" } ] },
  { "id": "next",
    "label": { "en": "Next", "es": "Siguiente", "fr": "Ensuite" },
    "blurb": { "en": "The next thing, not the whole list. A board you cannot read is a list you will not open.",
               "es": "Lo siguiente, no toda la lista. Un tablero que no puedes leer es una lista que no vas a abrir.",
               "fr": "La prochaine chose, pas toute la liste. Un tableau illisible est une liste qu'on n'ouvre pas." },
    "lists": [
     { "field": "next",
       "label": { "en": "What is next?", "es": "¿Qué sigue?", "fr": "Quelle est la suite ?" },
       "hint": { "en": "Small enough to start without deciding anything else first.",
                 "es": "Lo bastante pequeño para empezar sin decidir nada más antes.",
                 "fr": "Assez petit pour commencer sans devoir décider autre chose d'abord." },
       "menu": "next" } ] },
  { "id": "stuck",
    "label": { "en": "Stuck", "es": "Atascado", "fr": "Bloqué" },
    "blurb": { "en": "What is waiting on something, and what it is waiting on. Naming the blocker is most of the work.",
               "es": "Lo que está esperando algo, y qué está esperando. Nombrar el bloqueo es la mayor parte del trabajo.",
               "fr": "Ce qui attend, et ce qu'il attend. Nommer le blocage, c'est l'essentiel du travail." },
    "lists": [
     { "field": "stuck",
       "label": { "en": "What is stuck, and on what?", "es": "¿Qué está atascado, y en qué?", "fr": "Qu'est-ce qui bloque, et sur quoi ?" },
       "hint": { "en": "Write the blocker, not the feeling about the blocker.",
                 "es": "Escribe el bloqueo, no lo que sientes al respecto.",
                 "fr": "Notez le blocage, pas ce que vous en ressentez." },
       "menu": "stuck" } ] },
  { "id": "done",
    "label": { "en": "Done", "es": "Hecho", "fr": "Terminé" },
    "blurb": { "en": "Kept deliberately. A board that only ever grows is one you stop opening.",
               "es": "Se conserva a propósito. Un tablero que solo crece es uno que dejas de abrir.",
               "fr": "Gardé exprès. Un tableau qui ne fait que grossir est un tableau qu'on cesse d'ouvrir." },
    "lists": [
     { "field": "done",
       "label": { "en": "What is finished?", "es": "¿Qué está terminado?", "fr": "Qu'est-ce qui est terminé ?" },
       "hint": { "en": "Move things here rather than deleting them, at least for a while.",
                 "es": "Mueve las cosas aquí en lugar de borrarlas, al menos por un tiempo.",
                 "fr": "Déplacez plutôt que de supprimer, au moins un temps." },
       "menu": "done" } ] }
 ],
 "menus": {
  "inflight": { "en": ["A piece of writing", "A change to something that exists", "A conversation to have", "Something being learned"],
                "es": ["Un texto por escribir", "Un cambio a algo que ya existe", "Una conversación pendiente", "Algo que estás aprendiendo"],
                "fr": ["Un texte à écrire", "Une modification de quelque chose qui existe", "Une conversation à avoir", "Quelque chose que vous apprenez"] },
  "next": { "en": ["The smallest next step", "A decision to make", "Someone to ask", "Something to read first"],
            "es": ["El próximo paso más pequeño", "Una decisión por tomar", "Alguien a quien preguntar", "Algo que leer primero"],
            "fr": ["Le plus petit pas suivant", "Une décision à prendre", "Quelqu'un à qui demander", "Quelque chose à lire d'abord"] },
  "stuck": { "en": ["Waiting on a reply", "Waiting on a decision", "Missing something to work with", "Needs a block of time"],
             "es": ["Esperando una respuesta", "Esperando una decisión", "Falta algo con qué trabajar", "Necesita un bloque de tiempo"],
             "fr": ["En attente d'une réponse", "En attente d'une décision", "Il manque de quoi travailler", "Demande une plage de temps libre"] },
  "done": { "en": ["Shipped", "Abandoned on purpose", "Handed to someone else", "Turned out not to matter"],
            "es": ["Entregado", "Abandonado a propósito", "Pasado a otra persona", "Al final no importaba"],
            "fr": ["Livré", "Abandonné exprès", "Confié à quelqu'un d'autre", "Finalement sans importance"] }
 },
 "copy": {
  "en": { "h": "The board",
          "p": "What the work actually looks like, kept where you can find it. Edited in place — nothing here is ever finalized.",
          "mapped": "On the board", "nothing": "Nothing here yet — add one below, or open the questions.",
          "quick": "Add one you already know", "add": "Add",
          "explore": "Work one out", "exploreHint": "Questions, if you want them. Skip them if you do not.",
          "remove": "Remove", "count": "on the board" },
  "es": { "h": "El tablero",
          "p": "Cómo se ve de verdad el trabajo, guardado donde puedas encontrarlo. Se edita allí mismo — aquí nada se finaliza nunca.",
          "mapped": "En el tablero", "nothing": "Aún no hay nada aquí — agrega uno abajo o abre las preguntas.",
          "quick": "Agrega uno que ya tengas en mente", "add": "Agregar",
          "explore": "Descubre uno", "exploreHint": "Preguntas, si las quieres. Omítelas si no.",
          "remove": "Quitar", "count": "en el tablero" },
  "fr": { "h": "Le tableau",
          "p": "À quoi ressemble vraiment le travail, gardé où vous le retrouverez. Modifié sur place — rien n'est jamais figé.",
          "mapped": "Au tableau", "nothing": "Rien ici — ajoutez-en un, ou ouvrez les questions.",
          "quick": "Ajouter ce que vous savez déjà", "add": "Ajouter",
          "explore": "En trouver un", "exploreHint": "Des questions, si vous en voulez. Sinon, passez.",
          "remove": "Retirer", "count": "au tableau" }
 }
}
```
