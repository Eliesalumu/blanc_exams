# Vérification — 5 novembre 2026

## Conservation et architecture

Le dépôt initial contenait un frontend JavaScript natif, un build par copie vers `dist/`, un Static Site Render, cinq examens généraux, une réserve de révision et trois simulations techniques ONATRA. Les écrits techniques étaient auto-évalués sur 6. Aucun backend ni SDK OpenAI n’existait.

Les banques précédentes, les identifiants et les versions des stockages sont conservés. Les notes manuelles restent dans `ratings` ; les nouvelles corrections sont dans `evaluations` et `commentEvaluations`. Les copies et évaluations figurent dans l’export existant. L’historique du chatbot est local et effaçable. Aucun déploiement distant n’a été effectué.

## Nouveaux examens

| Entreprise | Examens | QCM | Écrits | Questions |
|---|---:|---:|---:|---:|
| SNCC | 3 | 120 | 30 | 150 |
| RVA | 5 | 200 | 50 | 250 |
| Total ajouté | 8 | 320 | 80 | 400 |

Chaque examen respecte les répartitions QCM/écrits A : 9/1, B : 9/1, C : 8/2, D : 7/3, E : 3/2, F : 4/1 et les maxima 15/15/20/25/15/10. Il dure 60 minutes, vaut 100 points, comporte quatre QCM à commenter et un seuil de 70. La date SNCC provient des consignes fournies par l’utilisateur, sans limiter l’accès ; aucune date RVA n’est inventée.

Les 400 formulations sont uniques après normalisation et distinctes des 650 précédentes. Les positions correctes sont équilibrées et mélangées sans cycle régulier. Après révision éditoriale, la bonne réponse est la plus longue dans 10 à 16 QCM sur 40 selon l’examen. L’unicité textuelle ne prouve pas une distinction conceptuelle absolue : les notions communes sont abordées dans différents cas.

La source éditoriale reproductible `scripts/author-company-bank.js` génère `data/company-exams.json` sans appel IA. Tous les chiffres de gestion sont hypothétiques. Aucun chiffre actuel de flotte, de réseau, de recettes ou de dette n’est inventé. Les corrigés sont pédagogiques et ne constituent ni avis juridique exhaustif ni validation d’un jury.

## Sources et portée

- [Présentation SNCC](https://www.snccsa.com/qui-sommes-nous/) : transport multimodal et activités ; aucun chiffre actuel de capacité repris.
- [SNCC — droit de passage, 14 décembre 2022](https://www.snccsa.com/2022/12/14/sncc-droit-de-passage-2/) : contexte historique d’accès d’opérateurs privés, sans affirmation sur un contrat actuel.
- [AAC/RDC — missions](https://www.aacrdc.org/website/a-propos-de-nous) : réglementation, supervision et certificats/licences, pouvoirs qui ne sont pas attribués au conseil RVA.
- [AAC/RDC — navigation aérienne](https://www.aacrdc.org/website/navigation-aerienne) : services ATS, AIS et CNS de la RVA ; distinction avec METTELSAT. Cette page comporte une incohérence rédactionnelle sur les certifications ; aucun statut actuel n’en est déduit.
- [RVA — activités](https://projetsite1.rva.cd/) : contexte de gestion aéroportuaire. Cette page comporte des éléments de maquette et des chiffres contradictoires ; aucun décompte d’aéroports ni nom de dirigeant n’est repris.
- [OACI — Safety Management](https://www.icao.int/safety-management) : dangers, risques et suivi. Aucun article juridique n’est inventé à partir de cette présentation.

Le serveur fournit des faits vérifiés bornés dans `server/verified-context.js`. Il ne réalise pas de recherche juridique en direct et demande une revue humaine en cas d’incertitude. Les statuts, délégations et textes applicables doivent être vérifiés pour une décision réelle.

## Résultats des contrôles

- **39 tests Node/API réussis** : copies bonnes, partielles, incorrectes et reformulées transmises au modèle simulé ; validation, identité, demi-points, conversion et seuil ; commentaires hors total ; cache, déduplication, résultats partiels, erreurs expurgées, quotas, contexte et conversation, sauvegarde et compatibilité historique ; diagnostic des erreurs de connexion et d’un serveur purement statique ; réception progressive SSE, détection d’un flux interrompu, validation et cache audio, refus en examen et découpage des lectures longues. Les simulations valident l’intégration et ne mesurent pas seules la qualité pédagogique du modèle.
- **16 tests navigateur réussis** : parcours historiques, délai et soumission automatique, sauvegarde, hors ligne, correction partielle puis relance sans doublons, résultat de 88/100, rechargement, contexte RVA, deux tours de conversation, effacement, assistant absent en simulation active, rendu mobile, suggestions sous la saisie et relance d’un message échoué sans duplication ; grande note finale, six barres de section, panneau agrandissable, affichage SSE et commandes vocales pause/reprise/arrêt avec audio simulé.
- **Validation des banques réussie** : 500 questions générales, 11 examens techniques et 550 questions techniques dont 400 nouvelles ; six sections et barèmes vérifiés.
- **Build Render réussi** : `npm run build:render`, incluant validations, tests Node et génération de `dist/`.
- **Contrôle statique réussi** : `node scripts/check-static-security.js` inspecte les fichiers texte sans afficher les secrets et exclut serveur, SDK, nom de variable secrète et valeur réelle de la clé du build.
- **Appels réels réussis via l’API locale** : SDK officiel, Responses API, `gpt-4.1-mini` ; réponse du chat reçue (247 caractères) et correction structurée valide (8,5/10). Le premier contrôle direct de correction était également réussi. La clé locale était disponible et n’a jamais été affichée. Ces tests ne constituent pas une validation exhaustive de la qualité des notes. Aucun déploiement Render n’est annoncé.

`npm run test:live` est séparé des tests automatiques et du build pour éviter les appels facturés involontaires. Guide de déploiement : [OPENAI_RENDER.md](OPENAI_RENDER.md).

## Correction du démarrage et de l’expérience locale

Le diagnostic réel a trouvé le frontend accessible sur 4173/5500, `/api/health` en 404 et aucun serveur sur 3001. Le test direct OpenAI précédent ne couvrait pas ce démarrage incomplet. `npm run dev` fournit désormais le site et les routes API sur 4173 en un seul processus. Le frontend utilise cette API et prend aussi en charge le Live Server VS Code 5500/5501. Le contrôle CORS pour 5500 a réussi (204).

Le chatbot conserve les erreurs dans son panneau avec une relance du même message, propose des questions en un clic sous la saisie et accepte Entrée pour envoyer. Les corrections écrites sont demandées avant les commentaires ; le compteur d’avancement est visible, le bouton est désactivé pendant le traitement et la dernière erreur est conservée avec la copie. Le cache hors ligne a été renouvelé sans supprimer les sauvegardes ; les routes API sont exclues du service worker.

`node scripts/smoke-local-ai.js` teste volontairement une discussion et une correction via les véritables routes de l’application (deux appels facturables), au lieu de tester seulement le SDK isolément.

## Contrôle réel du flux et de la voix

`node scripts/smoke-stream-voice.js` a reçu une réponse en **57 fragments SSE**, pour 285 caractères, puis un audio OpenAI **Marin** de 109 056 octets, HTTP 200. L’échantillon MP3 est conservé dans le dossier ignoré `test-results/`. Ce contrôle confirme la génération audio et le transport ; les commandes du lecteur sont testées dans le navigateur avec un audio simulé. Il ne prétend pas qu’une écoute humaine a été réalisée.

La présentation des résultats reprend une jauge finale sur 100 de grande taille et des barres par section. La révision ciblée sélectionne les questions des sections faibles et les erreurs enregistrées ; l’analyse IA reçoit les scores calculés. Les messages et les corrections écrites peuvent être lus avec la voix OpenAI, déclenchée uniquement par un clic. Aucun déploiement distant n’a été effectué.
