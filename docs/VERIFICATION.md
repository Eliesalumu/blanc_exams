# Rapport de livraison — CAP 70

## Mise à jour — réinitialisation et préparation Render

- Bouton **Réinitialiser ma progression** ajouté directement dans l’en-tête du tableau de bord, accessible aussi sur mobile ; double confirmation conservée.
- Le test navigateur vérifie maintenant un résultat terminé et une simulation active, l’annulation sans perte, la suppression confirmée, sa persistance après rechargement et la conservation des autres clés du navigateur.
- `npm run build:render` : banque valide, **14 tests métier réussis**, puis génération de `dist/`.
- Tests navigateur ciblés relancés : **2 réussis** (affichage desktop/tablette/mobile et réinitialisation complète).
- `render.yaml`, `.node-version` et `docs/DEPLOIEMENT_RENDER.md` ajoutés. Publication prévue comme site statique, sans commande de démarrage serveur. Le service worker utilise un nouveau cache et la version des sauvegardes reste compatible.
- Le projet est préparé et vérifié localement ; aucun déploiement distant n’a été effectué.

Vérification du 31 octobre 2026. Application locale : **http://127.0.0.1:4173**.

| Contrôle | Résultat |
|---|---|
| Application lancée et réponse HTTP | ✓ Adresse locale accessible, HTTP 200 |
| Banque réellement présente | ✓ 500 questions, dans `data/questions.json` |
| Identifiants et énoncés normalisés | ✓ 500 IDs distincts, 500 énoncés distincts |
| Similarité textuelle forte | ✓ Aucun avertissement au seuil de contrôle de 0,78 |
| Cinq examens | ✓ Jours 1 à 5, exactement 65 questions chacun |
| Questions utilisées dans les examens | ✓ 325 IDs distincts, aucun chevauchement |
| Réserve séparée | ✓ 175 questions, aucune commune aux examens |
| Français | ✓ 16 questions par examen ; banque de 125 |
| Mathématiques | ✓ 14 par examen ; banque de 105 |
| Logique / psychotechnique | ✓ 20 par examen ; banque de 150 |
| Culture générale africaine | ✓ 15 par examen ; banque de 120 |
| Part de la RDC dans la culture | ✓ 42/120 = 35 % ; autres pays : 78/120 = 65 % |
| Explications et bonnes réponses | ✓ Présentes pour les 500 questions |
| Sources factuelles | ✓ Les 120 questions de culture ont une source et une date ; 49 URL distinctes |
| Questions visuelles | ✓ 60 SVG présents et rendus dans le navigateur ; 8 par examen |
| Difficulté des examens | ✓ 16 faciles, 33 intermédiaires, 16 difficiles ; niveaux masqués pendant le test |
| Chronomètre | ✓ 60 minutes, fondé sur l’heure de fin sauvegardée |
| Avertissements | ✓ 10, 5 et 1 minute ; annonces sans répétition à chaque tick |
| Auto-soumission | ✓ À expiration ; reprise d’une tentative expirée également testée |
| Seuil de 70 % | ✓ 45/65 échoue, 46/65 réussit ; calcul avant arrondi |
| Navigation d’examen | ✓ Réponses modifiables, marquage, précédente/suivante et grille directe |
| Correction et révision | ✓ Résultat 46/65 testé par 65 saisies UI ; filtres, explications et révision des erreurs |
| Persistance | ✓ Réponse, index, marqueur et chronomètre conservés après rafraîchissement |
| Réinitialisation | ✓ Deux confirmations avant suppression |
| Mode hors ligne | ✓ Rechargement de l’application, examen et chargement d’une figure sans réseau |
| Responsive | ✓ Accueil et examen sans débordement à 320, 390, 820 et 1440 pixels |
| Clavier | ✓ Navigation et sélection des réponses par les touches natives |
| Mode plein écran | ✓ Activation et sortie automatique à la soumission |
| Console et ressources | ✓ Aucune erreur console ni ressource HTTP en échec dans l’audit final |
| Distribution statique | ✓ `npm run build` produit `dist/` |

## Tests exécutés

- `npm test` : **14 tests réussis**. Ils couvrent le score, le seuil exact, les absences, la répartition, l’horloge, l’expiration unique, les réponses tardives, la persistance, les doublons, le mélange et l’analyse. Un test contrôle indépendamment les 105 bonnes réponses numériques et l’unicité de la valeur correcte parmi les propositions.
- `npm run test:browser` : **7 tests réussis** dans Microsoft Edge / Chromium. Parcours réels de navigation, simulation complète, résultats, correction, erreurs, reprise, horloge accélérée, hors ligne et double confirmation.
- Après le dernier ajustement des annonces du chronomètre, le test navigateur des avertissements et de l’auto-soumission a été relancé avec succès.
- `npm run audit:browser` : affichage aux quatre largeurs, sélection clavier, sortie du plein écran, rendu des 60 SVG, contrôle console et ressources.
- `npm run validate` : **valide**, aucune erreur structurelle ni alerte de forte similarité.

Les deux premières passes navigateur ont permis de corriger des assertions de test trop dépendantes du temps réel et un sélecteur ambigu entre les deux boutons de fin d’examen. Le lecteur du test numérique a également été corrigé pour reconnaître les fractions suivies d’une unité. La version finale des vérifications passe.

## Éléments consultables

- `artifacts/qa/audit-browser.json` : résultats de l’audit complémentaire.
- `artifacts/qa/accueil-320.png`, `accueil-390.png`, `accueil-820.png`, `accueil-1440.png` : accueils aux quatre largeurs.
- `artifacts/qa/examen-desktop.png`, `examen-tablette.png` : interface de simulation.
- `artifacts/qa/resultat-46-sur-65.png` : cas connu 46/65 = 70,77 %, dans un profil de test isolé.
- `artifacts/qa/figures-planche-1.png` à `figures-planche-6.png` : planches des 60 figures, examinées visuellement.
- `docs/QUESTION_REVIEW.md` : règles de relecture et exemples de points vérifiés.

## Périmètre de la vérification

Les tests de navigateur ont été exécutés dans Edge / Chromium sous Windows ; Safari et Firefox n’ont pas été exécutés. Le responsive est testé par des fenêtres de navigateur, sans essai sur un appareil physique.

La banque a fait l’objet de la relecture décrite dans `QUESTION_REVIEW.md`. Les vérifications automatiques n’établissent pas un étalonnage psychométrique ni une garantie de réussite au véritable test. Les données demeurent locales au navigateur ; le site n’a pas été publié sur un hébergement distant.
