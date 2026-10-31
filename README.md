# CAP 70 — Simulateur d’aptitude, préparation en cinq jours

Application d’entraînement indépendante, en français, pour les tests d’aptitude professionnelle : français, raisonnement numérique, logique et culture générale africaine. Les questions sont originales et ne sont pas des questions officielles ou confidentielles. Un résultat au simulateur n’est pas une garantie de réussite à une sélection réelle.

## Démarrage rapide

**Déploiement Render :** le projet fournit un [Blueprint prêt à l’emploi](render.yaml). Voir le [guide Render](docs/DEPLOIEMENT_RENDER.md). La commande `npm run build:render` valide la banque, exécute les tests métier et produit `dist/`.

Prérequis : **Node.js 20 ou ultérieur**.

```sh
npm run dev
```

Ouvrir **http://127.0.0.1:4173**. Aucune installation de dépendance n’est nécessaire pour utiliser l’application. Ne pas ouvrir `index.html` directement par double-clic : les modules et fichiers JSON nécessitent un serveur HTTP.

Alternative : `python -m http.server 4173 --bind 127.0.0.1`, depuis la racine du projet. Utiliser toujours la même adresse et le même port pour retrouver la progression.

Pour les tests de navigateur uniquement :

```sh
npm ci
npm run test:browser
```

Sous Windows, la configuration utilise Microsoft Edge installé à son emplacement standard. Sur un autre système, installer le navigateur de test avec `npx playwright install chromium`.

Pour produire un dossier statique déployable :

```sh
npm run build
```

Le dossier `dist/` contient l’application, les deux fichiers de données, les modules et les images. Aucun serveur métier, compte utilisateur ou appel API n’est requis. Un hébergement HTTPS est nécessaire pour le service worker hors ligne ; `localhost` et `127.0.0.1` sont également acceptés par les navigateurs.

## Contenu livré

| Matière | Banque | Par examen | Total des cinq examens | Réserve |
|---|---:|---:|---:|---:|
| Français | 125 | 16 | 80 | 45 |
| Mathématiques | 105 | 14 | 70 | 35 |
| Logique / psychotechnique | 150 | 20 | 100 | 50 |
| Culture générale africaine | 120 | 15 | 75 | 45 |
| **Total** | **500** | **65** | **325** | **175** |

La logique comporte **60 figures SVG originales**. Chaque examen contient 8 questions visuelles. La culture comprend 42 questions centrées sur la RDC (35 %) et 78 sur le reste de l’Afrique (65 %). Les sources et la date de vérification des 120 questions factuelles sont enregistrées dans la banque et visibles après réponse.

Chaque examen associe 16 questions estimées faciles, 33 intermédiaires et 16 difficiles. Ces estimations sont éditoriales, non calibrées sur un échantillon psychométrique ; elles ne sont jamais affichées pendant une simulation. Les journées ne sont pas verrouillées par date : le rythme conseillé est une simulation par jour.

## Utilisation

1. Choisir une journée et lire les consignes. Le temps ne démarre qu’au clic sur **Commencer le test**.
2. Répondre, passer des questions, utiliser la grille et marquer celles à revoir.
3. Terminer avec confirmation, ou laisser l’envoi automatique intervenir au bout de 60 minutes.
4. Examiner le résultat, les performances par matière et la correction filtrable.
5. Utiliser la réserve supplémentaire, les filtres par matière ou la révision des erreurs.

La moyenne du tableau de bord porte sur **toutes les tentatives**. Les cartes des jours et le graphique montrent la **dernière tentative de chaque jour**. Le meilleur score porte sur toutes les tentatives. Le journal retient le résultat le plus récent à chaque question ; les sessions de révision n’altèrent pas les résultats des examens.

### Chronomètre et score

Une tentative enregistre `startedAt` et `deadline = startedAt + 3 600 000`. Le temps restant se calcule à partir de l’horloge de l’appareil. Le rafraîchissement et la fermeture du navigateur ne donnent donc pas de temps supplémentaire. Si le navigateur est fermé à l’expiration, la soumission est effectuée au prochain chargement, avec le temps utilisé limité à 60 minutes. Les alertes apparaissent à 10, 5 et 1 minute.

Une bonne réponse vaut 1 point, une erreur ou une absence vaut 0. La réussite est déterminée par `correct * 100 >= total * 70`, avant arrondi. Ainsi :

- 45/65 = 69,23 % : objectif non atteint ;
- 46/65 = 70,77 % : objectif atteint ;
- 65/65 = 100 % ; 0/65 = 0 %.

L’ordre des questions est mélangé au lancement puis conservé. Les propositions sont permutées de façon déterministe lors de la compilation ; `correctAnswer` est recalculé sur l’ordre obtenu. La réponse enregistrée est l’indice de la proposition dans la banque livrée.

### Sauvegarde et hors ligne

La progression est stockée dans `localStorage`, sous la clé `cap70.progress.v1`. Elle est propre au navigateur, au profil et à l’origine HTTP. Le bouton **Réinitialiser ma progression** est accessible directement sur le tableau de bord, ainsi que dans « Mode d’emploi » ; deux confirmations sont nécessaires. La synchronisation entre onglets utilise l’événement `storage`. Il est conseillé de passer une simulation dans un seul onglet. Une erreur de stockage affiche un avertissement ; l’export JSON permet de conserver une copie des résultats. L’export n’est pas un mécanisme de synchronisation ni de restauration automatique.

Le service worker met en cache l’application, les 500 questions et les 60 SVG. Attendre la préparation hors ligne avant de déconnecter. Le cache du navigateur peut être supprimé par le navigateur ou l’utilisateur. La réinitialisation de la progression exige deux confirmations et conserve les fichiers hors ligne.

L’horloge et les données sont locales : ce projet est un outil personnel, pas un système d’examen surveillé résistant à la modification des fichiers ou de l’heure système.

## Architecture

```text
index.html                    Point d’entrée accessible en français
src/app.js                    Rendu des écrans et interactions
src/exam.js                   Création, réponses et clôture d’une tentative
src/timer.js                  Horloge à échéance absolue et auto-soumission
src/scoring.js                Calcul exact du résultat
src/storage.js                Persistance et récupération des erreurs
src/analytics.js              Agrégats, matières faibles et journal
src/questionLoader.js         Chargement et intégrité au démarrage
src/config.js                 Catégories, version et formatage
src/styles/main.css           Interface responsive et impression
data/source/*.txt             Questions rédigées, source éditoriale
data/sources.json             Références factuelles
data/questions.json           Banque compilée, directement consommée
data/exam-plan.json           Cinq examens disjoints et réserve
assets/psychotechnique/*.svg   Soixante figures locales
scripts/visual-questions.js    Dessins vectoriels et énoncés visuels
scripts/compile-bank.js        Compilation reproductible et répartition
scripts/validate-question-bank.js Validation et détection de similitudes
scripts/serve.js               Petit serveur HTTP local sécurisé
scripts/build.js               Copie de la distribution statique
tests/core.test.js             Tests métier sans dépendance
tests/browser.spec.js          Parcours de bout en bout dans le navigateur
sw.js                         Cache hors ligne
docs/                         Relecture et rapport de vérification
```

## Ajouter ou modifier une question

Modifier la source de la matière dans `data/source/`. Une ligne comprend :

```text
sous_categorie|énoncé|bonne réponse|distracteur 1|distracteur 2|distracteur 3|explication
```

Pour la culture, ajouter un huitième champ contenant une clé existante de `data/sources.json`. Vérifier le fait dans une source consultable, choisir de préférence une source institutionnelle, et actualiser la date de vérification dans le compilateur si nécessaire. Ne pas employer le caractère séparateur `|` dans un énoncé.

Ajouter en fin de fichier préserve les IDs existants. Pour une nouvelle question visuelle, ajouter un appel explicite à `add()` dans `scripts/visual-questions.js`, avec des coordonnées, des distracteurs et une explication réellement adaptés au problème. Le script ne fabrique pas des centaines de variantes de la même question.

Puis exécuter :

```sh
npm run bank
npm run validate
npm test
```

Ne pas modifier seulement `questions.json` : une compilation écraserait ces modifications. Les listes de difficulté dans `compile-bank.js` utilisent les numéros de lignes de questions, hors commentaires. Les quotas doivent garder suffisamment de questions dans chaque pool. Pour changer la composition des journées, modifier les allocations ou l’algorithme d’entrelacement du compilateur, puis régénérer et valider. Le validateur interdit tout ID commun aux examens.

Après une modification incompatible, augmenter la version `BANK_VERSION` et celle du cache dans `sw.js`. Une ancienne sauvegarde sera alors signalée comme incompatible, pour éviter de réinterpréter des réponses avec une autre banque. Adapter aussi la liste de précache si le nombre de figures change.

## Vérifications

```sh
npm run validate          # 500 questions, sources, choix, figures et examens
npm test                  # tests Node : score, 70 %, horloge, stockage, doublons
npm run test:browser      # Edge/Chromium : parcours, reload, responsive, hors ligne
npm run build            # distribution statique
```

Le contrôle textuel normalise casse, accents, ponctuation et espaces pour les énoncés. Le contrôle de proximité utilise les ensembles de mots et conserve les nombres ; un avertissement de similarité est une invitation à la relecture, pas une preuve mathématique de duplication sémantique. Les distinctions orthographiques des propositions sont conservées, car elles sont précisément évaluées en français.

Les tests navigateur capturent l’accueil à 1440, 820 et 390 pixels, une figure sur mobile et le résultat d’un examen. Les captures et traces se trouvent dans `test-results/`. L’audit complémentaire `npm run audit:browser` (serveur déjà lancé) capture aussi 320 pixels, vérifie la navigation clavier, la sortie du plein écran et les 60 figures dans `artifacts/qa/`. Ses résultats utilisent un contexte de navigateur de test isolé de votre progression. Voir `docs/VERIFICATION.md` pour le rapport de la version livrée.
