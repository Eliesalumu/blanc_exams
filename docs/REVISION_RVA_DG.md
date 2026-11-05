# Reconstruction de la banque RVA pour le directeur général

Version : `rva-dg-2026-11-v1` — 5 novembre 2026.

Les cinq simulations RVA ont été entièrement remplacées : 200 QCM et 50 réponses courtes, avec de nouveaux identifiants, énoncés, propositions, explications et critères. Chaque simulation conserve le format pédagogique de 60 minutes et 100 points : 40 QCM et 10 réponses courtes, répartis dans les six sections existantes.

## Parcours

1. Prise de fonction et diagnostic exécutif.
2. Exploitation, sécurité et continuité.
3. Finances, recettes et performance.
4. Transformation, investissements et équipes.
5. Crises, gouvernance et arbitrages de direction.

Les réponses attendues placent le candidat à la direction générale : décider dans ses pouvoirs, organiser l’exécution, affecter les moyens, contrôler les résultats et rendre compte au conseil. Elles distinguent le DG du PCA, de l’AAC et des personnels techniquement habilités. Les cas et montants sont fictifs ; aucune situation réelle, date de recrutement ni procédure aéronautique officielle n’est affirmée.

## Construction et relecture

La source reproductible est `scripts/rva-dg-bank.js`, complétée par `scripts/rva-dg-challenges.js`. La commande `node scripts/author-company-bank.js` reconstruit la banque SNCC/RVA en conservant les révisions SNCC et en intégrant les nouvelles simulations DG.

Chaque QCM comprend une justification pour chacune des quatre propositions. Une seconde passe éditoriale resserre notamment les cas d’exploitation autour de décisions proches : réception contre mise en service, dépannage contre correction causale, budget contre trésorerie, déclaration contre preuve, délégation technique contre pouvoir d’engagement. Les calculs utilisent des erreurs de base, signe, unité, horizon ou périmètre comme distracteurs. Les positions de réponse sont réparties à raison de dix A, dix B, dix C et dix D par examen. Un contrôle vérifie que la longueur extrême de la bonne réponse ne devient pas une règle majoritaire.

La difficulté est une appréciation éditoriale ; les simulations n’ont pas été étalonnées sur un échantillon de candidats. Les vérifications automatisées contrôlent les structures, l’unicité des calculs et la conservation des versions, sans constituer à elles seules une expertise aéronautique ou juridique.

## Sources de contexte

- [AAC/RDC — navigation aérienne et périmètres ATS, AIS, CNS, MET](https://aacrdc.org/website/navigation-aerienne).
- [OACI — Safety Management Manual, Doc 9859, troisième édition](https://icao.int/SAM/Documents/2017-SSP-GUY/Doc%209859%20SMM%20Third%20edition%20en.pdf), utilisé pour les principes de gestion de sécurité, sans présenter cette édition comme la dernière version réglementaire applicable.

Les références accompagnent les questions comme sources de contexte sectoriel. Les raisonnements financiers et scénarios de gestion sont des constructions pédagogiques.

## Versions et IA

Les copies RVA antérieures restent liées à la banque PCA complète, archivée dans `data/technical-options-previous.json`. Les deux anciennes versions des propositions sont conservées. Une nouvelle tentative DG possède sa propre version et peut être créée sans effacer une copie PCA terminée. Les statistiques de la nouvelle banque excluent les anciennes copies PCA ; leur consultation et leur score restent disponibles.

Le serveur détermine le rôle depuis la banque et sa version. Correction écrite, commentaires QCM et tuteur utilisent DG pour les nouvelles copies, PCA pour les archives. Le tuteur général RVA prépare au poste de DG. L’historique de conversation DG est distinct de l’ancien historique RVA PCA ; les requêtes conservent leur version lors des échanges. La lecture vocale existante reste disponible.

## Validation

- Tests unitaires : format, reproduction des sources, absence d’anciens énoncés ou identifiants dans la nouvelle banque, positions équilibrées, raisons des quatre choix et calculs numériques indépendants.
- Régressions de l’ancienne révision conservées sur les archives PCA et sur les banques ONATRA/SNCC, avec leurs empreintes d’origine.
- Tests API avec modèle simulé : rôle canonique DG/PCA, bon corrigé, refus de mélanger question et version, contexte du tuteur.
- Parcours navigateur : nouvelle tentative DG, soumission automatique, conservation et réinitialisation indépendante des copies, consultation PCA et séparation des conversations.
- Construction Render et contrôle des fichiers statiques.
