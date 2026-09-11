---
module: mensio/the-guide
version: 0.1
status: approved
approved: 2026-09-11
lang: en
---

# A short guide to the four quadrants

How the check-in's map of feelings is put together, and what to do with what
you notice. A reading activity: it asks nothing and keeps nothing.

**It draws with `mensio/quadrants`** — the same widget the check-in uses,
shown read-only, so the words on the map here and the words you tap there are
the same words and cannot drift apart.

⚠️ **Section 3 carries ES2 claim `A-01`** (depression as the persistent
absence of invigorating emotion). Its presentation boundary is in
`research/es2-additions-2026-09.yaml`: it may be offered as a way of noticing
what has gone quiet, never as a definition, a diagnostic criterion, or a basis
for self-diagnosis. Editing that section is a clinical change, not a copy edit.

## Adding it to a booklet

Paste the block below into your file anywhere under the long rule, or paste it
into **Add an activity** in the page's editor.

------------------------------------------------------------

```json
{
 "block": "module",
 "id": "mensio/the-guide",
 "version": "0.1",
 "title": {
  "en": "A short guide to the four quadrants",
  "fr": "Un court guide des quatre quadrants"
 },
 "blurb": {
  "en": "How the check-in's map of feelings is put together, and what to do with what you notice",
  "fr": "Comment la carte des émotions de la pause est construite, et quoi faire de ce que vous remarquez"
 },
 "rights": {
  "copyright": "© 2026 Benjamin F. Armstrong III. All rights reserved.",
  "license": "Free to copy and share, unmodified and with this notice intact. Not licensed for modification or for redistribution in altered form. This grant covers this version; later versions may differ.",
  "source": "https://benthepsychologist.com/tools/activity-kit/"
 },
 "display": {
  "order": 30
 },
 "mode": {
  "id": "guide",
  "kind": "guide",
  "accent": "guide",
  "rail": true,
  "head": {
   "h": {
    "en": "A short guide to the four quadrants",
    "fr": "Un court guide des quatre quadrants"
   },
   "p": {
    "en": "How the check-in's map of feelings is put together, and what to do with what you notice",
    "fr": "Comment la carte des émotions de la pause est construite, et quoi faire de ce que vous remarquez"
   }
  },
  "blocks": [
   {
    "id": "s1",
    "type": "heading",
    "n": 1,
    "text": {
     "en": "More than one of you",
     "fr": "Plus d’un « vous »"
    },
    "display": {
     "order": 10
    }
   },
   {
    "id": "s1p",
    "type": "prose",
    "text": {
     "en": "The emotional systems framework this guide draws on starts from a simple observation: you do not arrive at a moment as one unified self with one opinion. It is closer to a group of emotional systems, each with its own job, history, and characteristic bias — picture a council of advisors rather than a single voice. That picture is a way of thinking, not a map of brain architecture.\n\nThat is why you can want two things at once, why a pattern can persist after you have decided against it, and why “just deciding” to feel differently rarely works for long.\n\nThe check-in is built on this idea. It asks you to notice which systems are active right now — in the body, in feeling, and in thought — without asking you to settle the argument between them.",
     "fr": "Le cadre des systèmes émotionnels dont ce guide s’inspire part d’une observation simple : vous n’abordez pas un moment comme un moi unifié avec une seule opinion. Cela ressemble davantage à un groupe de systèmes émotionnels, chacun avec sa fonction, son histoire et son biais caractéristique — imaginez un conseil de conseillers plutôt qu’une seule voix. Cette image est une façon de penser, pas une carte de l’architecture du cerveau.\n\nC’est pourquoi vous pouvez vouloir deux choses à la fois, pourquoi un schéma peut persister après que vous avez décidé contre lui, et pourquoi « simplement décider » de se sentir autrement fonctionne rarement longtemps.\n\nLa pause attentive repose sur cette idée. Elle vous demande de remarquer quels systèmes sont actifs en ce moment — dans le corps, dans l’émotion et dans la pensée — sans vous demander de trancher le débat entre eux."
    },
    "display": {
     "order": 20
    }
   },
   {
    "id": "s2",
    "type": "heading",
    "n": 2,
    "text": {
     "en": "Two dimensions, four neighbourhoods",
     "fr": "Deux dimensions, quatre quartiers"
    },
    "display": {
     "order": 30
    }
   },
   {
    "id": "s2p",
    "type": "prose",
    "text": {
     "en": "Feelings can be placed along two dimensions.",
     "fr": "Les émotions peuvent se situer selon deux dimensions."
    },
    "display": {
     "order": 40
    }
   },
   {
    "id": "s2dims",
    "type": "deflist",
    "items": [
     {
      "label": {
       "en": "Activation",
       "fr": "L’activation"
      },
      "body": {
       "en": "Some feelings mobilize you toward action; others slow you down toward rest or withdrawal. This is the vertical axis: more activated at the top, less at the bottom.",
       "fr": "Certaines émotions vous mobilisent vers l’action ; d’autres vous ralentissent vers le repos ou le retrait. C’est l’axe vertical : plus activé·e en haut, moins en bas."
      }
     },
     {
      "label": {
       "en": "Pleasantness",
       "fr": "L’agrément"
      },
      "body": {
       "en": "Some feelings feel good and draw you toward things; others feel unpleasant, and often exist to protect you from something. This is the horizontal axis: more unpleasant on the left, more pleasant on the right.",
       "fr": "Certaines émotions font du bien et vous attirent vers les choses ; d’autres sont désagréables et existent souvent pour vous protéger de quelque chose. C’est l’axe horizontal : plus désagréable à gauche, plus agréable à droite."
      }
     }
    ],
    "display": {
     "order": 50
    }
   },
   {
    "id": "s2p2",
    "type": "prose",
    "text": {
     "en": "Crossing the two gives four neighbourhoods. The words on the map are the ones the check-in uses; each neighbourhood holds more than the words shown.",
     "fr": "Le croisement des deux donne quatre quartiers. Les mots sur la carte sont ceux qu’utilise la pause ; chaque quartier contient plus que les mots affichés."
    },
    "display": {
     "order": 60
    }
   },
   {
    "id": "s2grid",
    "type": "widget",
    "widget": "mensio/quadrants",
    "keys": [],
    "readonly": true,
    "describe": true,
    "display": {
     "order": 70
    }
   },
   {
    "id": "s2p3",
    "type": "prose",
    "text": {
     "en": "A single moment usually sits in more than one neighbourhood. That is why the check-in lets you select several.",
     "fr": "Un même moment se situe généralement dans plus d’un quartier. C’est pourquoi la pause vous permet d’en sélectionner plusieurs."
    },
    "display": {
     "order": 80
    }
   },
   {
    "id": "s3",
    "type": "heading",
    "n": 3,
    "text": {
     "en": "When the invigorating quadrant goes quiet",
     "fr": "Quand le revigorant se tait"
    },
    "display": {
     "order": 90
    }
   },
   {
    "id": "s3p",
    "type": "prose",
    "text": {
     "en": "One quadrant deserves a note of its own. In this model, depression is not an emotion in the way the others are, and it is not the same as sadness — although sadness is often part of it. It is better understood as the persistent absence of invigorating feelings, with drive, curiosity and enthusiasm going quiet, often accompanied by raised draining and agitating feelings.\n\nThis matters for what you look for. A run of check-ins with nothing selected in the invigorating quadrant is worth noticing, even when nothing dramatic is selected elsewhere. It is information, not a verdict, and it is the kind of thing worth bringing to a conversation.",
     "fr": "Un quadrant mérite une note à part. Dans ce modèle, la dépression n’est pas une émotion comme les autres, et elle n’est pas la même chose que la tristesse — même si la tristesse en fait souvent partie. On la comprend mieux comme l’absence persistante d’émotions revigorantes : l’élan, la curiosité et l’enthousiasme qui se taisent, souvent accompagnés d’émotions épuisantes et agitantes plus fortes.\n\nCela compte pour ce que vous cherchez. Une série de pauses sans rien de sélectionné dans le quadrant revigorant vaut la peine d’être remarquée, même quand rien de dramatique n’est sélectionné ailleurs. C’est une information, pas un verdict, et c’est le genre de chose qu’il vaut la peine d’apporter à une conversation."
    },
    "display": {
     "order": 100
    }
   },
   {
    "id": "s4",
    "type": "heading",
    "n": 4,
    "text": {
     "en": "Recognizing a part",
     "fr": "Reconnaître une part"
    },
    "display": {
     "order": 110
    }
   },
   {
    "id": "s4p",
    "type": "prose",
    "text": {
     "en": "Most people can spot their own emotional systems once they know what to look for:",
     "fr": "La plupart des gens repèrent leurs propres systèmes émotionnels une fois qu’ils savent quoi chercher :"
    },
    "display": {
     "order": 120
    }
   },
   {
    "id": "s4signs",
    "type": "deflist",
    "items": [
     {
      "label": {
       "en": "Internal arguments",
       "fr": "Des débats intérieurs"
      },
      "body": {
       "en": "You find yourself debating a voice — an anxious one, a critical one — that does not seem to listen to reason.",
       "fr": "Vous vous surprenez à argumenter avec une voix — anxieuse, critique — qui ne semble pas entendre raison."
      }
     },
     {
      "label": {
       "en": "Conflicting impulses",
       "fr": "Des impulsions contradictoires"
      },
      "body": {
       "en": "Part of you wants to act; part of you wants to avoid or retreat.",
       "fr": "Une part de vous veut agir ; une autre veut éviter ou se retirer."
      }
     },
     {
      "label": {
       "en": "Familiar patterns",
       "fr": "Des schémas familiers"
      },
      "body": {
       "en": "Certain reactions feel automatic, as if they had a life of their own.",
       "fr": "Certaines réactions semblent automatiques, comme si elles avaient leur vie propre."
      }
     },
     {
      "label": {
       "en": "Different versions of you",
       "fr": "Différentes versions de vous"
      },
      "body": {
       "en": "You act differently in different contexts, almost like different characters.",
       "fr": "Vous agissez différemment selon les contextes, presque comme des personnages différents."
      }
     }
    ],
    "display": {
     "order": 130
    }
   },
   {
    "id": "s4p2",
    "type": "prose",
    "text": {
     "en": "These systems do not only produce feelings. They produce thoughts. An anxious part sounds like: “What if something goes wrong? We need to prepare for everything.” A drive part: “Let's take this on.” A safety-seeking part: “Maybe stay home, where it is comfortable.”\n\nThis is why the check-in ends with headlines rather than explanations. A headline — “The deadline”, “Dinner with N” — shows what a part is occupied with, without asking you to argue with it.",
     "fr": "Ces systèmes ne produisent pas seulement des émotions. Ils produisent des pensées. Une part anxieuse dit : « Et si quelque chose tournait mal ? Il faut tout prévoir. » Une part d’élan : « Allons-y. » Une part qui cherche la sécurité : « Restons plutôt à la maison, là où c’est confortable. »\n\nC’est pourquoi la pause se termine par des titres plutôt que par des explications. Un titre — « L’échéance », « Souper avec N » — montre ce qui occupe une part, sans vous demander de débattre avec elle."
    },
    "display": {
     "order": 140
    }
   },
   {
    "id": "s5",
    "type": "heading",
    "n": 5,
    "text": {
     "en": "An example: the Self-Critic",
     "fr": "Un exemple : le Critique intérieur"
    },
    "display": {
     "order": 150
    }
   },
   {
    "id": "s5p",
    "type": "prose",
    "text": {
     "en": "Consider one pattern many people recognize: a Self-Critic — a learned, self-directed habit of monitoring your own performance and pointing out flaws or possible mistakes. It is not one of the basic systems; it is something built over time out of them, which is part of why it can be worked with.",
     "fr": "Prenons un schéma que beaucoup reconnaissent : un Critique intérieur — une habitude apprise, dirigée vers soi, qui surveille votre performance et signale les défauts ou les erreurs possibles. Ce n’est pas l’un des systèmes de base ; c’est quelque chose qui s’est construit avec le temps à partir d’eux, et c’est en partie pourquoi on peut travailler avec."
    },
    "display": {
     "order": 160
    }
   },
   {
    "id": "s5ex",
    "type": "group",
    "display": {
     "order": 170,
     "placement": "folded"
    },
    "copy": {
     "en": "Read the example",
     "fr": "Lire l’exemple"
    },
    "blocks": [
     {
      "id": "s5prof",
      "type": "deflist",
      "items": [
       {
        "label": {
         "en": "What it wants",
         "fr": "Ce qu’il veut"
        },
        "body": {
         "en": "To prevent failure, rejection, or inadequacy by keeping standards high.",
         "fr": "Prévenir l’échec, le rejet ou l’insuffisance en gardant des standards élevés."
        }
       },
       {
        "label": {
         "en": "What it says",
         "fr": "Ce qu’il dit"
        },
        "body": {
         "en": "“That wasn't good enough.” “Everyone else is better at this.” “You should have tried harder.”",
         "fr": "« Ce n’était pas assez bon. » « Tout le monde est meilleur que toi. » « Tu aurais dû essayer plus fort. »"
        }
       },
       {
        "label": {
         "en": "What it does",
         "fr": "Ce qu’il fait"
        },
        "body": {
         "en": "Harsh self-evaluation, perfectionism, difficulty accepting compliments, putting things off for fear of falling short.",
         "fr": "Autoévaluation sévère, perfectionnisme, difficulté à accepter les compliments, remise à plus tard par peur de ne pas être à la hauteur."
        }
       }
      ]
     },
     {
      "id": "s5oh",
      "type": "heading",
      "text": {
       "en": "Where it comes from",
       "fr": "D’où il vient"
      }
     },
     {
      "id": "s5o",
      "type": "prose",
      "text": {
       "en": "Like every part, a Self-Critic usually develops for good reasons — a critical environment where mistakes had real consequences, a lesson that perfection was the route to acceptance, a failure that felt devastating, a competitive setting where improving was survival. In those contexts it was not only useful but necessary.",
       "fr": "Comme toute part, un Critique intérieur se développe généralement pour de bonnes raisons — un milieu critique où les erreurs avaient de vraies conséquences, la leçon que la perfection menait à l’acceptation, un échec vécu comme dévastateur, un contexte compétitif où s’améliorer était une question de survie. Dans ces contextes, il n’était pas seulement utile : il était nécessaire."
      }
     },
     {
      "id": "s5ph",
      "type": "heading",
      "text": {
       "en": "When it becomes a problem",
       "fr": "Quand il devient un problème"
      }
     },
     {
      "id": "s5pr",
      "type": "prose",
      "text": {
       "en": "Trouble starts when a part that fitted one context keeps activating in others. The Self-Critic may apply unrealistic standards to ordinary situations, generate anxiety and paralysis through constant evaluation, prevent risk and growth by focusing on failure, or set off shame spirals that get in the way of learning and connection.",
       "fr": "Les ennuis commencent quand une part adaptée à un contexte continue de s’activer dans d’autres. Le Critique intérieur peut appliquer des standards irréalistes aux situations ordinaires, générer de l’anxiété et de la paralysie par une évaluation constante, empêcher le risque et la croissance en se fixant sur l’échec, ou déclencher des spirales de honte qui nuisent à l’apprentissage et au lien."
      }
     },
     {
      "id": "s5in",
      "type": "quote",
      "text": {
       "en": "The part is not bad or wrong. It is working from outdated information about what is needed.",
       "fr": "La part n’est ni mauvaise ni dans l’erreur. Elle travaille à partir d’informations périmées sur ce qui est nécessaire."
      }
     }
    ]
   },
   {
    "id": "s6",
    "type": "heading",
    "n": 6,
    "text": {
     "en": "Working with a part",
     "fr": "Travailler avec une part"
    },
    "display": {
     "order": 180
    }
   },
   {
    "id": "s6p",
    "type": "prose",
    "text": {
     "en": "The aim is never to get rid of a part of yourself. Struggling with a feeling as though the feeling itself were the emergency tends to add a second layer — anxiety about the anxiety, frustration at the frustration — on top of what was already there. Deliberately setting something aside is a different move, and a legitimate one: contain it now, come back to it later. What does not work is containing it forever. The aim is coordination — each system contributing at the right time, handing off without a fight, none of them permanently in charge.",
     "fr": "Le but n’est jamais de vous débarrasser d’une part de vous-même. Lutter contre une émotion comme si l’émotion était l’urgence ajoute généralement une deuxième couche — de l’anxiété au sujet de l’anxiété, de la frustration envers la frustration — par-dessus ce qui était déjà là. Mettre quelque chose de côté délibérément est un autre geste, et il est légitime : contenir maintenant, y revenir plus tard. Ce qui ne fonctionne pas, c’est de contenir indéfiniment. Le but est la coordination — chaque système contribuant au bon moment, passant le relais sans lutte, aucun n’étant aux commandes en permanence."
    },
    "display": {
     "order": 190
    }
   },
   {
    "id": "s6steps",
    "type": "deflist",
    "items": [
     {
      "label": {
       "en": "Notice the part as an indicator light",
       "fr": "Remarquer la part comme un voyant"
      },
      "body": {
       "en": "Recognize when a system is active. Instead of immediately believing its thoughts, treat them as information: “My Self-Critic is very active right now. What is it trying to tell me?” Selecting a feeling on the check-in map is this step.",
       "fr": "Reconnaître quand un système est actif. Plutôt que de croire immédiatement ses pensées, les traiter comme une information : « Mon Critique intérieur est très actif en ce moment. Qu’essaie-t-il de me dire ? » Sélectionner une émotion sur la carte de la pause, c’est cette étape."
      }
     },
     {
      "label": {
       "en": "Get curious about what it wants",
       "fr": "S’intéresser à ce qu’elle veut"
      },
      "body": {
       "en": "Rather than fighting or dismissing the part, ask what it is after. What is it trying to protect or achieve? The core wish is usually something good — growth, excellence, acceptance, safety.",
       "fr": "Plutôt que de combattre ou d’écarter la part, lui demander ce qu’elle cherche. Que veut-elle protéger ou obtenir ? Le désir de fond est généralement quelque chose de bon — grandir, exceller, être accepté·e, être en sécurité."
      }
     },
     {
      "label": {
       "en": "Acknowledge and negotiate",
       "fr": "Reconnaître et négocier"
      },
      "body": {
       "en": "Once you can see what the part wants, you can take its concern seriously without handing it the decision: “I hear that you want me to do well and avoid mistakes, and I appreciate that. Let's think about what would actually help here.”",
       "fr": "Une fois que vous voyez ce que la part veut, vous pouvez prendre sa préoccupation au sérieux sans lui remettre la décision : « J’entends que tu veux que je réussisse et que j’évite les erreurs, et je l’apprécie. Réfléchissons à ce qui aiderait vraiment ici. »"
      }
     },
     {
      "label": {
       "en": "Decide consciously",
       "fr": "Décider consciemment"
      },
      "body": {
       "en": "With input from your parts, and without being run by any one of them, choose a response that fits your values and what you can actually observe. The Map on this page is one place to do that.",
       "fr": "Avec l’apport de vos parts, et sans être dirigé·e par l’une d’elles, choisir une réponse qui convient à vos valeurs et à ce que vous pouvez réellement observer. La Carte, sur cette page, est un endroit pour le faire."
      }
     }
    ],
    "display": {
     "order": 200
    }
   },
   {
    "id": "s7",
    "type": "heading",
    "n": 7,
    "text": {
     "en": "Why name things",
     "fr": "Pourquoi nommer"
    },
    "display": {
     "order": 210
    }
   },
   {
    "id": "s7p",
    "type": "prose",
    "text": {
     "en": "Seeing yourself as a set of systems rather than a single, consistent self explains a lot: why you feel conflicted, why change is slow, why willpower alone rarely holds.\n\nIt also makes room for kindness. Instead of judging yourself for an unpleasant feeling or a stubborn pattern, you can recognize that each part developed for a reason and is still trying to help, even when its methods are out of date.\n\nAnd it puts you in a different seat. Several systems are usually active at once, and the loud one is not automatically the one in charge — you can listen to all of them, take their input, and decide how to move.",
     "fr": "Se voir comme un ensemble de systèmes plutôt que comme un moi unique et constant explique beaucoup de choses : pourquoi vous vous sentez en conflit, pourquoi le changement est lent, pourquoi la volonté seule tient rarement.\n\nCela fait aussi de la place à la bienveillance. Plutôt que de vous juger pour une émotion désagréable ou un schéma tenace, vous pouvez reconnaître que chaque part s’est développée pour une raison et essaie encore d’aider, même quand ses méthodes sont dépassées.\n\nEt cela vous place dans un autre siège. Plusieurs systèmes sont habituellement actifs en même temps, et le plus bruyant n’est pas automatiquement celui qui commande — vous pouvez les écouter tous, tenir compte de leur apport et décider comment avancer."
    },
    "display": {
     "order": 220
    }
   },
   {
    "id": "s7q",
    "type": "quote",
    "text": {
     "en": "Your emotional systems are not problems to solve but team members to understand and coordinate. The goal is not perfect balance. It is a working relationship with all the parts of yourself — one in which growth, repair, and real choice become possible.",
     "fr": "Vos systèmes émotionnels ne sont pas des problèmes à résoudre, mais des coéquipiers à comprendre et à coordonner. Le but n’est pas un équilibre parfait. C’est une relation de travail avec toutes les parts de vous-même — une relation où la croissance, la réparation et le vrai choix deviennent possibles."
    },
    "display": {
     "order": 230
    }
   }
  ]
 },
 "widgets": [
  {
   "id": "mensio/quadrants",
   "version": "0.1",
   "engine": "grid-select",
   "title": {
    "en": "Four quadrants of feeling",
    "fr": "Quatre quadrants de l’émotion"
   },
   "axes": {
    "top": {
     "en": "more activated",
     "fr": "plus activé·e"
    },
    "bottom": {
     "en": "less activated",
     "fr": "moins activé·e"
    },
    "left": {
     "en": "more unpleasant",
     "fr": "plus désagréable"
    },
    "right": {
     "en": "more pleasant",
     "fr": "plus agréable"
    }
   },
   "cells": [
    {
     "id": "agitating",
     "label": {
      "en": "Agitating",
      "fr": "Agitant"
     },
     "note": {
      "en": "Activated and unpleasant. Anger, frustration, anxiety, fear. These feelings push for a response — fight, fix, escape, prepare. Uncomfortable, and often useful.",
      "fr": "Activé et désagréable. Colère, frustration, anxiété, peur. Ces émotions poussent à réagir — combattre, réparer, fuir, se préparer. Inconfortables, et souvent utiles."
     },
     "color": {
      "tint": "#F0D9CF",
      "deep": "#A04E34"
     }
    },
    {
     "id": "energizing",
     "label": {
      "en": "Invigorating",
      "fr": "Revigorant"
     },
     "note": {
      "en": "Activated and pleasant. Motivation, drive, curiosity, joy, enthusiasm. These feelings pull you toward things and make effort feel possible.",
      "fr": "Activé et agréable. Motivation, élan, curiosité, joie, enthousiasme. Ces émotions vous attirent vers les choses et rendent l’effort possible."
     },
     "color": {
      "tint": "#DCE7D2",
      "deep": "#4F6B3A"
     }
    },
    {
     "id": "draining",
     "label": {
      "en": "Draining",
      "fr": "Épuisant"
     },
     "note": {
      "en": "Less activated and unpleasant. Sadness, grief, shame, guilt. These feelings slow you down — sometimes to grieve or repair, sometimes further than is helpful.",
      "fr": "Moins activé et désagréable. Tristesse, deuil, honte, culpabilité. Ces émotions vous ralentissent — parfois pour pleurer ou réparer, parfois plus que nécessaire."
     },
     "color": {
      "tint": "#D9DEE2",
      "deep": "#465B66"
     }
    },
    {
     "id": "soothing",
     "label": {
      "en": "Soothing",
      "fr": "Apaisant"
     },
     "note": {
      "en": "Less activated and pleasant. Warmth, comfort, safety, caring, connection. These feelings say that it is all right to rest, and that you are not alone.",
      "fr": "Moins activé et agréable. Chaleur, réconfort, sécurité, sollicitude, lien. Ces émotions disent qu’il est permis de se reposer, et que vous n’êtes pas seul·e."
     },
     "color": {
      "tint": "#D5E3E1",
      "deep": "#166B63"
     }
    }
   ],
   "items": [
    {
     "id": "anger",
     "cell": "agitating",
     "label": {
      "en": "Anger",
      "fr": "Colère"
     }
    },
    {
     "id": "frustration",
     "cell": "agitating",
     "label": {
      "en": "Frustration",
      "fr": "Frustration"
     }
    },
    {
     "id": "anxiety",
     "cell": "agitating",
     "label": {
      "en": "Anxiety / stress",
      "fr": "Anxiété / stress"
     }
    },
    {
     "id": "fear",
     "cell": "agitating",
     "label": {
      "en": "Fear",
      "fr": "Peur"
     }
    },
    {
     "id": "motivation",
     "cell": "energizing",
     "label": {
      "en": "Motivation / drive",
      "fr": "Motivation / élan"
     }
    },
    {
     "id": "curiosity",
     "cell": "energizing",
     "label": {
      "en": "Curiosity / joy",
      "fr": "Curiosité / joie"
     }
    },
    {
     "id": "sadness",
     "cell": "draining",
     "label": {
      "en": "Sadness",
      "fr": "Tristesse"
     }
    },
    {
     "id": "grief",
     "cell": "draining",
     "label": {
      "en": "Grief / shame",
      "fr": "Deuil / honte"
     }
    },
    {
     "id": "warm",
     "cell": "soothing",
     "label": {
      "en": "Warmth / comfort / connection",
      "fr": "Chaleur / réconfort / lien"
     }
    }
   ],
   "copy": {
    "en": {
     "h": "Feelings",
     "p": "Select whatever fits. More than one is normal."
    },
    "fr": {
     "h": "Les émotions",
     "p": "Sélectionnez ce qui convient. En ressentir plusieurs est normal."
    }
   }
  }
 ]
}
```
