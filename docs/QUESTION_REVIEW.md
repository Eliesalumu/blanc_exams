# Relecture éditoriale — 31 octobre 2026

Cette banque a été rédigée pour le projet. Aucun énoncé n’est présenté comme provenant d’un recruteur. Les textes courts de compréhension et les figures sont originaux. Les faits de culture générale sont reformulés ; les sources servent à contrôler le fait, pas à copier leur texte.

## Contrôles de contenu

- **Français :** relecture des 125 énoncés, des quatre propositions et des règles données. Attention particulière aux accords des participes passés, aux pronominaux, aux COD avant/après le verbe, au participe suivi d’un infinitif et à la distinction entre indicatif et subjonctif. Les accents et apostrophes ne sont pas supprimés lors du contrôle des propositions, car leur différence peut constituer l’objet même de l’exercice.
- **Mathématiques :** calcul des solutions lors de la rédaction puis contrôle indépendant des 105 réponses par `tests/question-maths.test.js`. Ce test vérifie aussi qu’aucune autre proposition n’est numériquement équivalente à la réponse attendue. Les exercices restent dans le domaine du calcul d’aptitude, des proportions et des équations simples.
- **Logique verbale :** contrôle des conclusions nécessaires, sans confondre implication et réciproque. Les suites indiquent leur mécanisme lorsque plusieurs continuations mathématiques seraient possibles. Les jours ouvrés précisent la convention de comptage.
- **Figures :** 60 constructions locales avec énoncé et solution explicites. Contrôle des matrices, sens de rotation, points repères, symétries, chemins et comptages. Les arêtes réellement tracées déterminent les figures à compter ; pas de traits supposés ni de lien externe.
- **Culture africaine :** 120 fiches avec une source et une date de vérification ; 42 portent sur la RDC. Les faits historiques, capitales, géographie et patrimoine sont privilégiés. Aucun titulaire actuel de fonction politique ni classement économique annuel n’est demandé.

## Exemples de points contrôlés

| Domaine | Point de vigilance | Solution retenue |
|---|---|---|
| Participe passé | « Les chanteuses que j’ai entendues chanter » | Accord, car les chanteuses font l’action de chanter |
| Participe passé | « Les chansons que j’ai entendu chanter » | Pas d’accord : les chansons sont l’objet de l’infinitif |
| Pronominal | « Elles se sont envoyé des courriels » | COD placé après ; « se » est COI |
| Pronominal | « Ils se sont souvenus » | Verbe essentiellement pronominal, accord avec le sujet |
| Conjugaison | « Après qu’il a remis » | Indicatif après « après que » |
| Orthographe | Quoique / quoi que | Concession / quelle que soit la chose que |
| Pourcentages | +10 %, puis −10 % | Coefficient 0,99, baisse globale de 1 % |
| Vitesse moyenne | 60 km à 30 km/h, retour à 60 km/h | 120 km en 3 h, soit 40 km/h |
| Proportionnalité inverse | 12 ouvriers, 8 jours, puis 16 ouvriers | 96 journées de travail, donc 6 jours |
| Horloge | Angle à 12 h 30 | 165°, la petite aiguille ayant avancé de 15° |
| Syllogisme | Tous A sont B ; certains B sont C | Aucune intersection A/C n’est nécessairement établie |
| Graphes | 5 personnes connaissant chacune exactement 3 autres | Impossible : somme des degrés impaire |
| Grille 3 × 2 | Tous les rectangles, carrés inclus | 6 choix de verticales × 3 choix d’horizontales = 18 |
| Miroir | Deux symétries d’axes perpendiculaires | Équivalent à une rotation de 180° |
| RDC | Kinshasa / Brazzaville | Capitales de deux pays distincts, sur les rives opposées du Congo |
| RDC | Français / langues nationales | Le français est officiel ; lingala, swahili, tshiluba et kikongo sont nationaux |
| Afrique | Lac Victoria / Tanganyika | Plus grande superficie / plus grande profondeur en Afrique |
| Institutions | Création de l’OUA / lancement de l’UA | 1963 / 2002 |
| EAC | Entrée de plein droit de la RDC | 11 juillet 2022 selon l’EAC |

Une question de vocabulaire sur la parcimonie, trop proche d’une autre, a été remplacée par « surseoir ». Des distracteurs ont été précisés, notamment pour la Copperbelt et le COMESA. Un doublon de valeur parmi les mauvaises fractions d’un exercice de réservoir a été supprimé. Les flèches d’un repérage spatial ont été déplacées sous la grille pour ne pas masquer le point de départ.

## Sources et prudence éditoriale

Les références complètes sont dans `data/sources.json`, et chaque question factuelle contient directement son objet `source` et `lastVerified`. Sources institutionnelles consultées : UNESCO, Union africaine, BAD, SADC, EAC, COMESA, CEEAC, ambassade de la RDC et Fondation Nelson Mandela ; compléments encyclopédiques avec bibliographies pour les repères historiques et géographiques.

Certaines pages institutionnelles mélangent des renseignements stables et des titulaires de fonctions périmés. Seuls les faits pertinents et stables ont été retenus ; la page SADC n’est pas utilisée pour affirmer qui dirige actuellement la RDC. La fiche de l’ambassade distingue bien langue officielle et langues nationales. L’archive du World Factbook est datée 2024 et sert à des repères historiques ou au découpage déjà établi, sans statistiques contemporaines.

Le validateur atteste l’intégrité structurelle et signale les fortes ressemblances textuelles. Il ne remplace pas une expertise linguistique ou psychométrique indépendante. Les niveaux de difficulté sont des estimations de préparation ; aucun étalonnage de population ni pouvoir prédictif sur un concours réel n’est revendiqué.
