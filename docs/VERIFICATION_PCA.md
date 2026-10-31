# Vérification de la banque technique — 31 octobre 2026

La banque active est `2026-10-31-pca-v2`. Le [rapport de contenu](REVISION_PCA.md) détaille les sources, fichiers, répartitions et limites.

| Contrôle exécuté | Résultat |
|---|---|
| Compilation des six matières | 500 questions, dont 481 mises en situation |
| Validation de banque | 0 erreur, 0 alerte de similarité au seuil retenu, 0 alerte éditoriale automatique |
| Partition | 5 × 65 IDs distincts, 175 autres en réserve |
| Répartition par simulation | 16 gouvernance, 14 logistique, 12 finance, 13 stratégie, 6 quantitatif, 4 communication |
| Cas par simulation | 61, 63, 64, 62, 63 |
| Difficulté estimée par simulation | 13 faciles, 36 intermédiaires, 16 difficiles |
| Positions des réponses | 125 A, 125 B, 125 C, 125 D dans la banque ; 16/16/16/17 par simulation |
| Test indépendant des calculs | Les 45 réponses quantitatives sont recomputées et uniques dans l’unité demandée |
| Tests Node | 18/18 réussis |
| Tests de navigateur | 8/8 réussis, Microsoft Edge / Chromium |
| Audit complémentaire | 320, 390, 820 et 1440 px sans débordement ; clavier et sortie du plein écran vérifiés |
| Ressources | Dix SVG rendus, aucune erreur de console ni réponse HTTP en échec |
| Build Render | `npm run build:render` réussi ; `dist/` produit |
| Synchronisation après les derniers ajustements de texte | app.js, config.js, storage.js, questions.json, exam-plan.json et sw.js identiques dans les sources et dist |
| Préservation | Neuf empreintes SHA-256 identiques, notamment index.html, CSS, moteurs d’examen et configuration Render |

Les parcours navigateur couvrent affichage responsive, navigation, figures, reprise après rechargement, conservation des réponses et marqueurs, résultat de 46/65, correction, journal des erreurs, alertes à 10/5/1 minutes, auto-soumission unique, reprise après expiration, hors connexion et double confirmation de réinitialisation. Le passage d’ancienne banque est testé séparément, y compris l’échec d’archivage et la copie brute d’une sauvegarde illisible.

Le contrôle des options de longueur maximale correspond à 131 réponses correctes sur 500, soit 26,2 %, ex aequo compris. Il sert à repérer un biais de rédaction ; il ne prouve ni validité psychométrique ni absence de toute ambiguïté. Les difficultés restent des estimations éditoriales.

Les limites documentaires restent celles du rapport de contenu : aucun syllabus officiel détaillé détenu, pas de dossier consolidé propre au recrutement, présentation ONATRA historique indexée sans garantie de périmètre opérationnel actuel. Les questions ne prétendent pas certifier ces éléments. Aucun déploiement distant n’a été effectué.

Les preuves locales sont disponibles dans `artifacts/qa/validation-pca.json`, `artifacts/qa/pca-report.json`, `artifacts/qa/audit-browser.json` et les captures PNG des répertoires `artifacts/qa/` et `test-results/`. Elles sont exclues du site publié.
