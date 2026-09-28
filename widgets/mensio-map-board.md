---
widget: mensio/map-board
version: 0.1
engine: card-board
status: approved
approved: 2026-09-11
lang: en
---

# The Map

Four cards opened one at a time. Each leads with **what has already been
mapped**, then a quick-add for something the person already knows, then the
questions folded behind *find a new one*.

**It has no graphics.** Four cards, the fields each one holds, the menus they
offer and the words that ask for them — all text, all editable, all riding in
the file.

## Adding it to a booklet

The renderer holds the **card-board** engine; this file holds the cards. Paste
the block below into a booklet under the long rule, or add the module that uses
it — `mensio/the-map` carries it.

## The block

```json
{
 "block": "widget",
 "id": "mensio/map-board",
 "version": "0.1",
 "engine": "card-board",
 "title": {
  "en": "The Map",
  "fr": "La Carte"
 },
 "cards": [
  {
   "id": "at",
   "label": {
    "en": "Where I'm at",
    "fr": "Où j’en suis"
   },
   "blurb": {
    "en": "What has the charge right now, and what a day needs to feel adequate.",
    "fr": "Ce qui est vif en ce moment, et ce qu’il faut à une journée pour être convenable."
   },
   "lists": [
    {
     "field": "weekday",
     "label": {
      "en": "What has to happen for a weekday to feel adequate?",
      "fr": "Que doit-il se passer pour qu’une journée de semaine soit adéquate ?"
     },
     "hint": {
      "en": "Adequate, not stellar. Short, concrete, achievable — three or four things, not a wish list.",
      "fr": "Adéquate, pas exceptionnelle. Court, concret, faisable — trois ou quatre choses, pas une liste de souhaits."
     }
    },
    {
     "field": "weekend",
     "label": {
      "en": "And a weekend?",
      "fr": "Et une fin de semaine ?"
     },
     "hint": {
      "en": "Usually a different, shorter list.",
      "fr": "Habituellement une liste différente, et plus courte."
     }
    }
   ],
   "prose": [
    {
     "field": "lights",
     "label": {
      "en": "What lights you up?",
      "fr": "Qu’est-ce qui vous allume ?"
     },
     "hint": {
      "en": "What would feel good? What would be interesting? Anything that reliably leaves you glad you did it.",
      "fr": "Qu’est-ce qui ferait du bien ? Qu’est-ce qui serait intéressant ? Ce qui, de façon fiable, vous rend content·e de l’avoir fait."
     }
    },
    {
     "field": "hurts",
     "label": {
      "en": "What makes you hurt?",
      "fr": "Qu’est-ce qui vous fait mal ?"
     },
     "hint": {
      "en": "What reliably stings, or costs you something. If there is something you keep wanting to get away from, that counts — the wish to escape carries real information about what is not working.",
      "fr": "Ce qui pique régulièrement, ou vous coûte quelque chose. S’il y a quelque chose que vous voulez sans cesse fuir, cela compte — l’envie de fuir contient une vraie information sur ce qui ne fonctionne pas."
     }
    },
    {
     "field": "stuck",
     "label": {
      "en": "What feels stuck?",
      "fr": "Qu’est-ce qui est bloqué ?"
     },
     "hint": {
      "en": "Something that matters and is not moving. Worth knowing: a mind that is not deployed will deploy itself, and its default projects are worry and rumination.",
      "fr": "Quelque chose qui compte et qui n’avance pas. À savoir : un esprit qui n’est pas déployé se déploie tout seul, et ses projets par défaut sont l’inquiétude et la rumination."
     }
    }
   ],
   "protocol": "treaty",
   "intro": {
    "en": "Start with the charge — what pulls at you, either way. There is no right answer and you can leave any of these blank.",
    "fr": "Commencez par ce qui est vif — ce qui vous tire, dans un sens ou dans l’autre. Il n’y a pas de bonne réponse et vous pouvez tout laisser vide."
   }
  },
  {
   "id": "going",
   "label": {
    "en": "Where I'm going",
    "fr": "Où je vais"
   },
   "blurb": {
    "en": "What matters most, further out. Genuinely optional.",
    "fr": "Ce qui compte le plus, à plus long terme. Vraiment facultatif."
   },
   "lists": [],
   "prose": [
    {
     "field": "love",
     "label": {
      "en": "What do you love doing?",
      "fr": "Qu’aimez-vous faire ?"
     },
     "hint": {
      "en": "",
      "fr": ""
     }
    },
    {
     "field": "goodAt",
     "label": {
      "en": "What are you good at?",
      "fr": "En quoi êtes-vous bon·ne ?"
     },
     "hint": {
      "en": "",
      "fr": ""
     }
    },
    {
     "field": "needs",
     "label": {
      "en": "What do the people around you actually need?",
      "fr": "De quoi les gens autour de vous ont-ils réellement besoin ?"
     },
     "hint": {
      "en": "",
      "fr": ""
     }
    },
    {
     "field": "paid",
     "label": {
      "en": "What could you be paid for?",
      "fr": "Pour quoi pourriez-vous être payé·e ?"
     },
     "hint": {
      "en": "",
      "fr": ""
     }
    },
    {
     "field": "dream",
     "label": {
      "en": "Anything you would call a dream?",
      "fr": "Quelque chose que vous appelleriez un rêve ?"
     },
     "hint": {
      "en": "Only if you have one. A blank here is not a failure.",
      "fr": "Seulement si vous en avez un. Une case vide n’est pas un échec."
     }
    }
   ],
   "protocol": null,
   "intro": {
    "en": "Longer-range, and genuinely optional. If you do not know, that is an answer — skip it and come back if it ever gets clearer.",
    "fr": "À plus long terme, et vraiment facultatif. Si vous ne savez pas, c’est une réponse — passez, et revenez si cela s’éclaircit."
   }
  },
  {
   "id": "enjoy",
   "label": {
    "en": "What I enjoy",
    "fr": "Ce que j’aime"
   },
   "blurb": {
    "en": "What is actually fun, sorted by what it costs you.",
    "fr": "Ce qui est réellement agréable, classé selon ce que cela coûte."
   },
   "lists": [
    {
     "field": "funTired",
     "label": {
      "en": "What is fun when you are tired?",
      "fr": "Qu’est-ce qui est agréable quand vous êtes fatigué·e ?"
     },
     "hint": {
      "en": "The things that still work when there is nothing left in the tank.",
      "fr": "Ce qui fonctionne encore quand il ne reste plus rien dans le réservoir."
     }
    },
    {
     "field": "funEnergy",
     "label": {
      "en": "What is fun when you have energy?",
      "fr": "Qu’est-ce qui est agréable quand vous avez de l’énergie ?"
     },
     "hint": {
      "en": "Worth more, costs more. Save these for when you have it.",
      "fr": "Ça rapporte plus et ça coûte plus. Gardez-les pour les moments où vous en avez."
     }
    },
    {
     "field": "trap",
     "label": {
      "en": "What leaves you worse than it found you?",
      "fr": "Qu’est-ce qui vous laisse plus mal qu’avant ?"
     },
     "hint": {
      "en": "Naming these is not a rule against them. It is just useful to know which is which.",
      "fr": "Les nommer n’est pas une interdiction. C’est simplement utile de savoir lequel est lequel."
     }
    }
   ],
   "prose": [],
   "protocol": "switch",
   "intro": {
    "en": "Five short lists. Tap what fits, add your own, leave the rest. The point is to have them written down before you need them.",
    "fr": "Cinq courtes listes. Touchez ce qui convient, ajoutez les vôtres, laissez le reste. L’intérêt est de les avoir notées avant d’en avoir besoin."
   }
  },
  {
   "id": "soothe",
   "label": {
    "en": "What soothes me",
    "fr": "Ce qui m’apaise"
   },
   "blurb": {
    "en": "What brings you down a notch, and how far down to aim.",
    "fr": "Ce qui vous fait redescendre d’un cran, et jusqu’où viser."
   },
   "lists": [
    {
     "field": "soothe",
     "label": {
      "en": "What soothes or brings you down a notch?",
      "fr": "Qu’est-ce qui vous apaise ou vous fait redescendre d’un cran ?"
     },
     "hint": {
      "en": "The move is usually to step down a rung, not to leap to silence.",
      "fr": "Le geste est généralement de descendre d’un barreau, pas de sauter au silence."
     }
    }
   ],
   "prose": [],
   "protocol": null,
   "intro": {
    "en": "Five short lists. Tap what fits, add your own, leave the rest. The point is to have them written down before you need them.",
    "fr": "Cinq courtes listes. Touchez ce qui convient, ajoutez les vôtres, laissez le reste. L’intérêt est de les avoir notées avant d’en avoir besoin."
   }
  }
 ],
 "menus": {
  "soothe": [
   "Playing an instrument",
   "A film, with full attention",
   "A narrative game that rewards patience",
   "A podcast while walking",
   "Building or painting something",
   "A lap around the block",
   "Making a cup of tea, slowly",
   "One favourite song, no multitasking",
   "Look out a window for a minute",
   "Stand up and stretch",
   "Box breathing — in four, hold four, out four, hold four",
   "Step down one rung, not to silence"
  ],
  "funTired": [
   "A puzzle game",
   "Turn-based strategy, no cheating",
   "A cozy sim",
   "One screen only — phone in another room",
   "A graphic novel",
   "Lego, following the instructions",
   "Drawing a map or inventing a character",
   "Miniature painting or colouring",
   "Something that needs two hands",
   "Add a podcast underneath it"
  ],
  "funEnergy": [
   "Journaling",
   "A gratitude list",
   "Unguided meditation",
   "Hard cardio",
   "Learning a language or a skill",
   "A project you've been meaning to start",
   "Seeing people on purpose"
  ],
  "trap": [
   "Doomscrolling",
   "Second-screening — TV plus phone",
   "Button-mashing through a game",
   "Reading the comments",
   "Checking email or Slack",
   "A quick phone game",
   "Starting a 'quick' chore",
   "Bouncing from stream to stream"
  ],
  "weekday": [
   "Dishes are done",
   "Bills are paid",
   "The space is tidy",
   "Family needs are met",
   "Emails answered",
   "Admin and notes done",
   "Key work duties",
   "Groceries, laundry",
   "Childcare",
   "Movement, meals, meds",
   "Something moved on the main thing",
   "I got outside"
  ],
  "weekend": [
   "A proper rest",
   "Time with people who matter",
   "One nagging thing off the list",
   "Something enjoyable, actually enjoyed",
   "Groceries and laundry",
   "Nothing scheduled at all"
  ]
 },
 "protocols": {
  "en": {
   "switchH": "When you catch yourself in the bottom tier",
   "switch": [
    "Don't judge it. You are thirsty for stimulation, not lazy.",
    "Lock the screen. Close your eyes for ten seconds.",
    "Ask: what is one thing that is still fun, but needs two hands?",
    "Commit to ten minutes of it. You can go back afterwards — you usually won't want to."
   ],
   "treatyH": "The deal with your inner critic",
   "treaty": "Can we agree that if we get this list done, we've done okay? Not great, maybe — but not failing, and we don't have to beat ourselves up. And when the critic starts in about resting: hold on, we did what we agreed. Now is the time to recharge."
  },
  "fr": {
   "switchH": "Quand vous vous surprenez dans le tiroir du bas",
   "switch": [
    "Ne jugez pas. Vous avez soif de stimulation, vous n'êtes pas paresseux·se.",
    "Verrouillez l'écran. Fermez les yeux dix secondes.",
    "Demandez : quelle est une chose encore agréable, mais qui demande deux mains ?",
    "Engagez-vous pour dix minutes. Vous pourrez y retourner après — en général vous n'en aurez plus envie."
   ],
   "treatyH": "L'entente avec votre critique intérieur",
   "treaty": "Peut-on convenir que si cette liste est faite, c'est correct ? Pas génial, peut-être — mais pas un échec, et nous n'avons pas à nous maltraiter. Et quand le critique s'en prend au repos : un instant, nous avons fait ce qui était convenu. C'est le moment de recharger."
  }
 },
 "copy": {
  "en": {
   "h": "The Map",
   "p": "What you have worked out about yourself, kept where you can find it. Not a plan and not a target — the thing you consult on a hard day, when working it out from scratch is exactly what you cannot do.",
   "mapped": "Mapped so far",
   "nothing": "Nothing here yet — add one below, or open the questions.",
   "quick": "Add one you already know",
   "add": "Add",
   "explore": "Find a new one",
   "exploreHint": "Questions, and a menu of the usual suspects — for when nothing comes to mind on its own.",
   "remove": "Remove",
   "count": null
  },
  "fr": {
   "h": "La Carte",
   "p": "Ce que vous avez compris de vous-même, gardé là où vous le retrouverez. Ni un plan ni un objectif — ce qu’on consulte un jour difficile, quand tout reprendre de zéro est justement ce dont on est incapable.",
   "mapped": "Sur la carte jusqu’ici",
   "nothing": "Rien ici pour l’instant — ajoutez quelque chose, ou ouvrez les questions.",
   "quick": "Ajouter ce que vous savez déjà",
   "add": "Ajouter",
   "explore": "En trouver un nouveau",
   "exploreHint": "Des questions, et un menu des suspects habituels — pour quand rien ne vient tout seul.",
   "remove": "Retirer",
   "count": null
  }
 },
 "notes": {
  "en": {
   "going": [
    "Not knowing what you want is a common place to be, and it is not the same as wanting nothing. The rest of this page works without this section.",
    "Most people never find one thing that fills all four circles. The practical move is assembling two or three things that between them cover it.",
    "Skill can come before passion. You do not have to love something first — getting good at it often generates the love.",
    "Being paid is not a lesser circle. It belongs there with the others.",
    "Treat “follow your passion” carefully. The people who say it loudest had passion, skill and luck, and are only telling you about the first."
   ],
   "soothe": [
    "A worked example of stepping down: doomscrolling → a longer video with the phone out of reach → a full-length film → gentle reading. Each rung down counts; you do not have to reach the bottom."
   ],
   "at": [
    "One shift worth noticing. From “I have to do this, or I'll feel guilty and anxious” to “I want to do this, because I want to get home tonight and feel good about what I did.” Same tasks, completely different fuel — and the second one is the one that lasts."
   ]
  },
  "fr": {
   "going": [
    "Ne pas savoir ce que l’on veut est une position courante, et ce n’est pas la même chose que ne rien vouloir. Le reste de cette page fonctionne sans cette section.",
    "La plupart des gens ne trouvent jamais une seule chose qui remplit les quatre cercles. Le geste pratique est d’assembler deux ou trois choses qui, ensemble, les couvrent.",
    "La compétence peut précéder la passion. Vous n’avez pas à aimer d’abord — devenir bon·ne y génère souvent l’amour.",
    "Être payé·e n’est pas un cercle inférieur. Il a sa place avec les autres.",
    "Méfiez-vous du « suivez votre passion ». Ceux qui le disent le plus fort avaient passion, compétence et chance, et ne vous parlent que de la première."
   ],
   "soothe": [
    "Un exemple de descente : défilement compulsif → une vidéo plus longue, téléphone hors de portée → un film complet → une lecture tranquille. Chaque barreau descendu compte ; vous n’avez pas à atteindre le bas."
   ],
   "at": [
    "Un basculement à remarquer. De « je dois faire ça, sinon je vais culpabiliser » à « je veux faire ça, parce que je veux rentrer ce soir et me sentir bien de ma journée ». Les mêmes tâches, un carburant complètement différent — et le deuxième est celui qui tient."
   ]
  }
 }
}
```
