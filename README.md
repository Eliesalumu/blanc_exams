# CAP 70 — Préparation technique PCA / ONATRA

Programme de préparation technique estimatif fondé sur les exigences du poste et les textes applicables. Aucun syllabus officiel détaillé n’est fourni. Les 500 questions originales ne sont ni officielles ni confidentielles. Les cas et données de gestion sont fictifs.

L’interface, les écrans et l’architecture de l’application sont conservés. Le [rapport de révision](docs/REVISION_PCA.md) décrit les contenus, sources, contrôles et limites documentaires de cette version. Les anciennes notes relatives à la banque d’aptitude sont des archives.

## Démarrer

Prérequis : Node.js 20 ou ultérieur ; version 24 déclarée pour Render.

```sh
npm run dev
```

Ouvrir http://127.0.0.1:4173. Aucune dépendance n’est nécessaire pour utiliser le simulateur localement. Ne pas ouvrir index.html directement : les modules et JSON nécessitent HTTP.

## Banque active

La page d’accueil conserve les cinq examens d’origine et leur historique, et ajoute une rubrique indépendante de trois simulations techniques PCA ONATRA. Chaque simulation propose 50 questions (40 QCM et 10 réponses écrites) en 60 minutes. La répartition A–F et la valeur de 1 point par QCM / 6 points par réponse écrite sont des choix pédagogiques, pas un barème officiel détaillé. Les réponses écrites restent en attente jusqu’à leur auto-évaluation guidée ; aucune note de jury n’est simulée. La tentative technique est sauvegardée séparément de l’ancien parcours et peut être recommencée après une réinitialisation confirmée.

Un rappel informatif d’échéance est présenté hors examen. La date configurable se trouve dans `src/config.js` (`SUBSCRIPTION_EXPIRY`, initialement `2026-11-06`) ; aucun paiement ni changement d’accès n’est effectué.

| Domaine | Banque | Par simulation | Réserve |
|---|---:|---:|---:|
| Gouvernance & PCA | 130 | 16 | 50 |
| ONATRA & Logistique | 105 | 14 | 35 |
| Finance & KPI | 90 | 12 | 30 |
| Stratégie & Risques | 100 | 13 | 35 |
| Analyse quantitative | 45 | 6 | 15 |
| Communication professionnelle | 30 | 4 | 10 |
| **Total** | **500** | **65** | **175** |

Les cinq examens utilisent 325 questions distinctes. La banque comporte 481 mises en situation et dix supports SVG de données fictives. Les 60 anciens puzzles ne font plus partie de la banque active.

Chaque examen dure 60 minutes : une bonne réponse vaut un point, une réponse fausse ou absente zéro. Le seuil de 70 % nécessite 46 bonnes réponses sur 65 : 45/65 = 69,23 %, 46/65 = 70,77 %. La réussite est calculée avant arrondi.

Chaque examen contient 13 questions estimées faciles, 36 intermédiaires et 16 difficiles. Ces estimations éditoriales ne sont pas calibrées sur des résultats de candidats. Les positions des réponses sont équilibrées : 16/16/16/17 par examen, 125 par lettre sur la banque.

## Utilisation et sauvegarde

Choisir une journée puis lancer sa simulation. Le chronomètre démarre au lancement, continue après rechargement et entraîne l’envoi automatique à échéance. Les réponses, marqueurs et position sont conservés sur cet appareil. La correction, les filtres par matière, la révision libre et le journal des erreurs fonctionnent comme auparavant.

Le tableau de bord agrège les tentatives ; chaque carte de journée montre sa dernière tentative. Les révisions ne modifient pas les scores. Les six matières permettent de travailler notamment OHADA et PCA, logistique, KPI et audit dans leurs domaines respectifs.

La progression utilise localStorage sous `cap70.progress.v1`. Lors du passage depuis l’ancienne banque, une copie est conservée sous `cap70.progress.v1.archive.<ancienne-version>` avant toute écriture du nouveau parcours. Les résultats des deux banques ne sont pas mélangés. Un échec d’archivage empêche l’écrasement. Les exports JSON déjà téléchargés restent intacts ; l’application n’importe pas automatiquement ces fichiers.

Le bouton de réinitialisation conserve ses deux confirmations et remet à zéro le parcours courant. Les archives d’anciennes banques et les données étrangères à CAP 70 sont conservées. L’export JSON permet de garder les réponses et résultats courants. La suppression des données du navigateur efface aussi les archives locales : conserver ses exports séparément.

Le service worker met en cache l’application, la banque et les dix figures actives. Attendre l’indicateur hors ligne avant de déconnecter. Utiliser la même origine HTTP pour retrouver sa progression. HTTPS est nécessaire en hébergement public ; localhost fonctionne pour le développement.

## Éditer les questions

Les six fichiers actifs sont dans `data/source/` : gouvernance.txt, onatra.txt, finance.txt, strategie.txt, quantitatif.txt et communication.txt. Les anciens fichiers ne sont plus lus par le compilateur.

Une ligne utilise huit champs, avec le dernier vide pour un cas original sans source externe :

```text
sous_categorie!|énoncé|bonne réponse|distracteur 1|distracteur 2|distracteur 3|explication|clé_source
```

Le suffixe `!` désigne une mise en situation fictive. Les sources identifiées figurent dans `data/pca-sources.json`, avec titre, URL, portée et date de consultation. Les difficultés utilisent les indices d’entrées hors commentaires dans `data/pca-difficulty.json`. Ne pas employer le séparateur `|` dans un champ.

```sh
npm run bank
npm run validate
npm test
```

Modifier les sources, pas seulement questions.json, qui serait écrasé lors de la compilation. Préserver l’ordre des entrées pour préserver les IDs. La banque active attend exactement 500 questions ; modifier les tailles et quotas explicitement si le programme évolue. Une modification du sens des choix est incompatible avec les réponses précédentes : augmenter BANK_VERSION et la version du cache, puis recompiler.

Le validateur vérifie IDs, textes, quatre options distinctes, index de solution, explication, sources requises, images, répartition, difficultés, cas, positions et proximité textuelle. Ses alertes éditoriales demandent une relecture ; il ne prouve pas à lui seul l’unicité sémantique de la solution. Les 45 calculs sont recomputés par un test numérique indépendant.

## Vérifier et préparer Render

```sh
npm ci
npm run build:render
npm run test:browser
npm run audit:browser
```

Les tests de navigateur utilisent Microsoft Edge à son emplacement Windows standard. Sinon, installer Chromium avec `npx playwright install chromium`. L’audit complémentaire attend un serveur à http://127.0.0.1:4173 et vérifie aussi clavier, plein écran, console, images et largeurs de 320 à 1440 pixels. Il utilise un profil de test distinct de celui de l’utilisateur.

`npm run build:render` valide la banque, exécute les tests Node et produit `dist/`. Le [Blueprint Render](render.yaml) et le [guide de déploiement](docs/DEPLOIEMENT_RENDER.md) restent applicables : `npm ci && npm run build:render`, répertoire publié `dist/`, site statique HTTPS sans clé API ni base de données. Aucun déploiement public n’est effectué automatiquement.

## Architecture conservée

Le point d’entrée reste index.html. Les modules src/app.js, exam.js, timer.js, scoring.js, storage.js, analytics.js, questionLoader.js et config.js conservent leurs responsabilités. Le CSS reste src/styles/main.css. Le navigateur consomme data/questions.json et data/exam-plan.json ; aucune source externe n’est nécessaire pendant l’examen.

Les résultats de validation et captures sont dans artifacts/qa/ et test-results/. Ils sont exclus de Git et du site publié. `node scripts/report-pca.js` régénère le rapport détaillé si les sauvegardes d’audit initiales sont présentes dans artifacts/before-pca/.
