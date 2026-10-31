# Révision des questions PCA / ONATRA — 31 octobre 2026

Programme de préparation technique estimatif fondé sur les exigences du poste et les textes applicables. Aucun syllabus officiel détaillé n’a été fourni ni établi par cette recherche. Les répartitions, difficultés et cas sont pédagogiques.

## Périmètre et conservation de l’application

Les 500 anciennes questions ont été remplacées par 500 questions techniques originales. Aucun ancien identifiant n’est actif. Le CSS, index.html, les moteurs d’examen, de chronomètre, de score, d’analyse, le chargeur, package.json et render.yaml sont identiques aux empreintes prises avant intervention. L’application reste statique avec les mêmes écrans et composants. Les six matières utilisent les composants existants ; seuls leurs intitulés et les textes pédagogiques ont changé.

Les seules adaptations fonctionnelles servent la compatibilité des contenus : nouvelle version de banque, archivage de l’ancienne progression avant remplacement, et nouvelle version du cache hors ligne. Les scores de banques différentes ne sont pas mélangés. L’archive reste dans localStorage sous cap70.progress.v1.archive.<version>. Le fichier JSON déjà exporté par l’utilisateur n’a pas été modifié. Le bouton de réinitialisation conserve ses deux confirmations ; il efface le parcours courant, pas les archives d’anciennes banques.

## Répartition

| Domaine | Banque | Par examen | Réserve |
|---|---:|---:|---:|
| gouvernance | 130 | 16 | 50 |
| onatra | 105 | 14 | 35 |
| finance | 90 | 12 | 30 |
| strategie | 100 | 13 | 35 |
| quantitatif | 45 | 6 | 15 |
| communication | 30 | 4 | 10 |
| Total | 500 | 65 | 175 |

325 questions distinctes dans les cinq simulations ; 175 autres en révision. 60 minutes par simulation, seuil de 70 %, soit 46/65. 481 mises en situation, dont 61, 63, 64, 62, 63 respectivement dans les cinq examens. Les cas sont fictifs ; aucun chiffre ne constitue une donnée financière ou opérationnelle actuelle de l’ONATRA.

| Jour | Cas | Positions A / B / C / D | Faciles / intermédiaires / difficiles |
|---|---:|---|---|
| 1 | 61 | 17 / 16 / 16 / 16 | 13 / 36 / 16 |
| 2 | 63 | 16 / 17 / 16 / 16 | 13 / 36 / 16 |
| 3 | 64 | 16 / 16 / 17 / 16 | 13 / 36 / 16 |
| 4 | 62 | 16 / 16 / 16 / 17 | 13 / 36 / 16 |
| 5 | 63 | 17 / 16 / 16 / 16 | 13 / 36 / 16 |

La banque comporte 100 estimations faciles, 275 intermédiaires et 125 difficiles. Ces niveaux sont documentés par question dans data/pca-difficulty.json ; ils restent à calibrer sur des résultats de candidats. Aucune promesse de niveau officiel n’est faite.

## Construction et relecture

Chaque entrée possède quatre choix, une solution, une explication, un domaine et un sous-domaine. Les textes sources restent lisibles et éditables dans les six nouveaux fichiers data/source/*.txt. Le compilateur contrôle les tailles, mélange les sous-domaines et positions sans séquence cyclique, et produit exactement 125 réponses par position à l’échelle des 500 questions. Il ne génère pas de variantes numériques pour gonfler la banque.

Une première relecture a remplacé les trois distracteurs de 45 questions. Une seconde a repris 191 alternatives dans leur contexte professionnel. Une passe juridique a remplacé douze cas répétitifs par des applications sourcées de l’AUSCGIE : conventions réglementées, comité, convocations, information, visioconférence, procurations, durée du mandat et rémunération du PCA. Les cas expliquent le raisonnement et les erreurs centrales, sans faire dépendre l’explication de la lettre obtenue après mélange.

Les contrôles automatiques retournent 0 erreur, 0 alerte de similarité au seuil retenu et 0 alerte éditoriale. Ils cherchent doublons, options vides ou identiques, source/date requises, longueurs anormales et distracteurs absolus ou superficiels. Choisir une réponse de longueur maximale correspond à 131 bonnes réponses sur 500 (26.2 % ; les ex aequo sont comptés favorablement à cette heuristique). Ce contrôle ne démontre pas l’absence de toute ambiguïté sémantique : une validation indépendante par un spécialiste métier et un essai avec candidats restent distincts de cette relecture.

Les anciens puzzles visuels restent archivés dans le dépôt mais ne sont plus référencés par la banque active. Dix supports SVG de données fictives utilisent le composant de figure déjà présent. Le texte complet et les alternatives accessibles sont conservés, y compris hors connexion.

## Sources et limites documentaires

26 questions juridiques ou institutionnelles portent sourceTitle, sourceUrl, lastVerified et un objet source compatible avec l’affichage existant. Les autres sont des cas originaux de raisonnement, de finance ou de communication ; ils ne sont pas présentés comme des prescriptions juridiques.

- AUSCGIE révisé le 30 janvier 2014 : [texte reproduit par le ministère de la Justice des Comores](https://justice.gouv.km/wp-content/uploads/2025/03/ohada-acte-uniforme-2014-droit-societes-commerciales-gie.pdf), recoupé avec le catalogue des actes en vigueur de l’OHADA. Les articles pertinents sont cités dans les corrections.
- Loi congolaise 08/010 du 7 juillet 2008 : [reproduction intégrale du texte sur Leganet](https://www.leganet.be/Legislation/Droit%20economique/L.08.010.07.07.2008.htm). Les questions visent les définitions et principes du texte identifié, sans prétendre établir un droit consolidé exhaustif de 2026. Un PDF intitulé 08/010 diffusé sur des sites institutionnels contient des pages relatives au désengagement : il a été écarté comme référence détaillée après vérification du contenu.
- [Présentation ONATRA indexée](https://www.onatra.cd/) : utilisée uniquement pour le réseau historique et les familles d’activités. La page directe renvoie actuellement un contenu inexploitable. Aucun trafic actuel, taux de disponibilité, périmètre de concession ou montant financier n’est affirmé.
- Les réformes du recrutement et modifications du décret 13/055, notamment en 2023–2024, sont identifiées dans la documentation publique. Faute de texte consolidé complet et de dossier officiel propre à cette sélection, la banque ne fixe pas de durée, quota, condition de diplôme ni barème actuel de recrutement. Aucun article de presse ne sert à énoncer une règle de droit.

Les fonctions PCA, CA, DG et assemblée sont distinguées. Pour un dossier réel, les statuts à jour, les règles nationales spéciales et les textes officiels de recrutement restent nécessaires. Les procédures et principes de droit commun ne permettent pas de deviner le programme de l’épreuve.

## Fichiers concernés

- Contenus : data/source/gouvernance.txt, onatra.txt, finance.txt, strategie.txt, quantitatif.txt, communication.txt ; data/pca-sources.json et data/pca-difficulty.json ; data/questions.json et data/exam-plan.json ; dix SVG PCA-NU.
- Intitulés et compatibilité : src/config.js ; textes dans src/app.js ; archivage dans src/storage.js ; liste de cache et version dans sw.js.
- Production et vérification : scripts/compile-bank.js, validate-question-bank.js, report-pca.js et adaptation du nombre de figures dans audit-browser.js ; tests/core.test.js, question-maths.test.js, pca-content.test.js et browser.spec.js.
- Documentation : README.md et ce rapport. Les anciennes notes d’audit restent des archives de la banque d’aptitude ; ce rapport décrit la version technique active.

## Vérification reproductible

Commandes : npm run bank ; npm run validate ; npm test ; npm run test:browser ; npm run audit:browser ; npm run build:render. Les résultats détaillés sont consignés dans artifacts/qa/validation-pca.json, pca-report.json et audit-browser.json. Le build Render utilise toujours npm ci puis npm run build:render et publie dist/. Aucun déploiement public n’a été effectué par cette révision.
