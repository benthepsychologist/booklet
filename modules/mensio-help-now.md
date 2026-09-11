---
module: mensio/help-now
version: 0.1
status: approved
approved: 2026-09-11
lang: en
---

# Help now

**The crisis resources and the scope note.** Not an activity — a *pinned
panel*: the renderer keeps it one tap away from every page, and writes it into
the top of every file anyone saves.

It is a module so that it goes through the same gate as everything else
reader-facing here, and so that a booklet built for somewhere other than
Ontario and Québec can carry different numbers without touching the engine.

⚠️ **These numbers are clinical content and jurisdiction-specific.** Ruled
approved as written (Ben, 2026-09-08): 9-8-8, Kids Help Phone, ConnexOntario,
Info-Social 811, 1-866-APPELLE, 911. Do not edit them as copy.

⛔ **`publish/adapter.py` refuses to publish a starter booklet that does not
carry a pinned panel.** That check is the guarantee that used to come from the
numbers being compiled into the page.

## Adding it to a booklet

1. **In the page** — open *Personalize → Change the booklet itself → Add an
   activity*, and paste the block below.
2. **In a text editor** — paste the block anywhere under the long rule of your
   own booklet file. Order does not matter.

It will not appear as a card on the home page: it is a **pinned panel**, so it
shows up as a button in the top bar instead, reachable from wherever you are.
Its words are written into the top of every file you save.

⚠️ **If you are adapting this for somewhere other than Ontario and Québec,
replace the numbers.** They are the whole point of the module and they are
jurisdiction-specific; a panel offering a reader the wrong country's crisis
line is worse than no panel.

------------------------------------------------------------

```json
{
 "block": "module",
 "id": "mensio/help-now",
 "version": "0.1",
 "title": {
  "en": "If you need help now",
  "fr": "Si vous avez besoin d’aide maintenant"
 },
 "blurb": {
  "en": "Help now",
  "fr": "Besoin d’aide"
 },
 "rights": {
  "copyright": "© 2026 Benjamin F. Armstrong III. All rights reserved.",
  "license": "Free to copy and share, unmodified and with this notice intact. Not licensed for modification or for redistribution in altered form. This grant covers this version; later versions may differ.",
  "source": "https://benthepsychologist.com/tools/activity-kit/"
 },
 "display": {
  "show": false
 },
 "page": {
  "blocks": [
   {
    "id": "about",
    "type": "prose",
    "text": {
     "en": "**What you write here stays on this device.** There is no account and no server, and nothing you type is sent anywhere. It is kept in this browser, so you can close the tab and come back — clearing your browser data would erase it, so use Download to keep a file of your own, and Load to bring one back.\n\n**This is a self-help tool, not care.** It is general psychoeducation: it does not know anything about you, it is not assessment, diagnosis or treatment, and it is not a substitute for talking to someone. If things are severe, or getting worse, that is a reason to reach a person rather than a page — Help now, at the top, has numbers that are answered.",
     "fr": "**Ce que vous écrivez ici reste sur cet appareil.** Aucun compte, aucun serveur : rien de ce que vous tapez n’est transmis. Tout est conservé dans ce navigateur, vous pouvez donc fermer l’onglet et y revenir — vider les données du navigateur effacerait le tout, alors utilisez Télécharger pour garder votre propre fichier, et Charger pour le récupérer.\n\n**C’est un outil d’auto-assistance, pas des soins.** Il s’agit de psychoéducation générale : il ne sait rien de vous, ce n’est ni une évaluation, ni un diagnostic, ni un traitement, et cela ne remplace pas le fait d’en parler à quelqu’un. Si la situation est grave ou s’aggrave, c’est une raison de joindre une personne plutôt qu’une page — Besoin d’aide, en haut, donne des numéros où l’on répond."
    },
    "display": {
     "order": 10
    }
   }
  ]
 },
 "mode": {
  "id": "help",
  "kind": "guide",
  "home": false,
  "pinned": true,
  "accent": "warn",
  "btn": {
   "en": "Help now",
   "fr": "Besoin d’aide"
  },
  "head": {
   "h": {
    "en": "If you need help now",
    "fr": "Si vous avez besoin d’aide maintenant"
   },
   "p": {
    "en": "This page is not watching, and it cannot help in a crisis. If you are in danger, or thinking about ending your life, contact one of these instead. They are free, confidential, and answer at any hour.",
    "fr": "Cette page ne vous surveille pas et ne peut pas aider en situation de crise. Si vous êtes en danger, ou si vous pensez à mettre fin à vos jours, contactez plutôt l’une de ces ressources. Elles sont gratuites, confidentielles, et répondent à toute heure."
   }
  },
  "blocks": [
   {
    "id": "lead",
    "type": "prose",
    "text": {
     "en": "This page is not watching, and it cannot help in a crisis. If you are in danger, or thinking about ending your life, contact one of these instead. They are free, confidential, and answer at any hour.",
     "fr": "Cette page ne vous surveille pas et ne peut pas aider en situation de crise. Si vous êtes en danger, ou si vous pensez à mettre fin à vos jours, contactez plutôt l’une de ces ressources. Elles sont gratuites, confidentielles, et répondent à toute heure."
    },
    "display": {
     "order": 10
    }
   },
   {
    "id": "note",
    "type": "quote",
    "text": {
     "en": "If you or someone else is in immediate danger, call 911.",
     "fr": "Si vous ou quelqu’un d’autre êtes en danger immédiat, composez le 911."
    },
    "display": {
     "order": 20
    }
   },
   {
    "id": "g0",
    "type": "heading",
    "text": {
     "en": "Anywhere in Canada",
     "fr": "Partout au Canada"
    },
    "display": {
     "order": 30
    }
   },
   {
    "id": "g0list",
    "type": "deflist",
    "items": [
     {
      "label": {
       "en": "9-8-8 — Suicide Crisis Helpline",
       "fr": "9-8-8 — Ligne d’aide en cas de crise de suicide"
      },
      "body": {
       "en": "Call or text 988. Around the clock, in English and French.",
       "fr": "Composez ou textez 988. En tout temps, en français et en anglais."
      }
     },
     {
      "label": {
       "en": "Kids Help Phone",
       "fr": "Jeunesse, J’écoute"
      },
      "body": {
       "en": "1-800-668-6868, or text CONNECT to 686868. For young people, around the clock.",
       "fr": "1-800-668-6868, ou textez PARLER au 686868. Pour les jeunes, en tout temps."
      }
     }
    ],
    "display": {
     "order": 40
    }
   },
   {
    "id": "g1",
    "type": "heading",
    "text": {
     "en": "Ontario",
     "fr": "Ontario"
    },
    "display": {
     "order": 50
    }
   },
   {
    "id": "g1list",
    "type": "deflist",
    "items": [
     {
      "label": {
       "en": "ConnexOntario",
       "fr": "ConnexOntario"
      },
      "body": {
       "en": "1-866-531-2600. Free information and referral for mental health, addiction, and problem gambling services, around the clock.",
       "fr": "1-866-531-2600. Information et orientation gratuites en santé mentale, dépendances et jeu problématique, en tout temps."
      }
     }
    ],
    "display": {
     "order": 60
    }
   },
   {
    "id": "g2",
    "type": "heading",
    "text": {
     "en": "Québec",
     "fr": "Québec"
    },
    "display": {
     "order": 70
    }
   },
   {
    "id": "g2list",
    "type": "deflist",
    "items": [
     {
      "label": {
       "en": "Info-Social — 8-1-1",
       "fr": "Info-Social — 8-1-1"
      },
      "body": {
       "en": "Dial 811 and choose option 2 for psychosocial support, around the clock.",
       "fr": "Composez le 811 et choisissez l’option 2 pour du soutien psychosocial, en tout temps."
      }
     },
     {
      "label": {
       "en": "1-866-APPELLE",
       "fr": "1-866-APPELLE"
      },
      "body": {
       "en": "1-866-277-3553. Québec's suicide prevention line, around the clock.",
       "fr": "1-866-277-3553. La ligne québécoise de prévention du suicide, en tout temps."
      }
     }
    ],
    "display": {
     "order": 80
    }
   },
   {
    "id": "sec0",
    "type": "heading",
    "text": {
     "en": "What this page is, and what it is not",
     "fr": "Ce qu’est cette page, et ce qu’elle n’est pas"
    },
    "display": {
     "order": 90
    }
   },
   {
    "id": "sec0p",
    "type": "prose",
    "text": {
     "en": "This is psychoeducation — general educational material about how people tend to work. It is not assessment, diagnosis, therapy, or medical advice, and it is not a substitute for care from a qualified professional.\n\nIt knows nothing about you. Nothing you write is read by anyone, scored, or interpreted. The counts it shows you are counts of what you selected, not measurements of how you are doing, and nothing here is a diagnosis.\n\nIf something here does not fit your situation, it does not fit. Trust that over the page.",
     "fr": "Il s’agit de psychoéducation — du matériel éducatif général sur le fonctionnement humain. Ce n’est ni une évaluation, ni un diagnostic, ni une psychothérapie, ni un avis médical, et cela ne remplace pas les soins d’un professionnel qualifié.\n\nCette page ne sait rien de vous. Rien de ce que vous écrivez n’est lu, coté ou interprété par qui que ce soit. Les comptes affichés sont des comptes de ce que vous avez sélectionné, pas des mesures de votre état, et rien ici n’est un diagnostic.\n\nSi quelque chose ici ne convient pas à votre situation, cela ne convient pas. Fiez-vous à cela plutôt qu’à la page."
    },
    "display": {
     "order": 100
    }
   }
  ]
 }
}
```
