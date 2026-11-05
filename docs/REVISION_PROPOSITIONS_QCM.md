# Révision des propositions — 5 novembre 2026

Périmètre : ONATRA 2 et 3, SNCC 1 à 3, RVA 1 à 5, soit **400 QCM** dans dix simulations. Les énoncés, identifiants, positions des bonnes réponses, barèmes, sections, commentaires requis et réponses courtes sont conservés. ONATRA 1 et les cinq modules généraux sont protégés par empreinte de contenu dans les tests.

Les propositions visent des confusions de compétence, de preuve, d'assiette, de période ou de causalité. Une autre bonne pratique simplement moins exhaustive ne suffit pas à constituer un distracteur. Les calculs conservent leurs données et leur niveau ; les erreurs proposées utilisent des assiettes ou opérations concurrentes.

Chaque QCM révisé possède quatre explications spécifiques et un point de distinction pédagogique, visibles dans le corrigé et en révision. Les copies commencées avant la mise à jour continuent à utiliser leurs anciennes propositions, y compris pour l'évaluation des commentaires et le contexte du tuteur. Les nouvelles tentatives et le mode révision utilisent la nouvelle banque.

## Dossier éditorial

- `data/options-review-baseline.json` : empreintes des contenus protégés et des clés de réponse avant modification.
- `data/technical-options-previous.json` : anciennes propositions nécessaires à la fidélité des copies sauvegardées.
- `data/reviewed-technical-options.json` : propositions révisées, explications, confusions visées, annotations et résultats de seconde lecture sans clé de réponse visible.
- `scripts/review-mcq-options.js` : outil éditorial facultatif utilisant OpenAI, hors build et hors tests. L'envoi de la banque et les appels facturables ont été explicitement autorisés par l'utilisateur pour cette révision.
- `scripts/refine-reviewed-options.js` : affinages locaux, suivis d'une nouvelle lecture des choix modifiés.
- `scripts/apply-reviewed-options.js` : application de la révision avec vérification d'identité de l'énoncé et de la clé. Le générateur de la banque SNCC/RVA réapplique cette source pour éviter de réintroduire les anciennes propositions.

La seconde lecture est un contrôle éditorial, pas une mesure empirique de difficulté auprès de candidats. La longueur des propositions est contrôlée dans les deux sens : une bonne réponse systématiquement plus courte fournirait aussi un indice.

## Vérification locale

Les tests contrôlent les empreintes de contenu, les 400 QCM et leurs explications, les deux extrêmes de longueur, les anciennes copies, les versions transmises à l'API, la reproduction de la banque et les 23 calculs chiffrés avec unicité numérique de la réponse. Le parcours navigateur vérifie les anciens choix et les nouveaux corrigés.

`npm run build:render` : validation des deux banques, **47 tests réussis**, build statique et contrôle d'absence de secrets réussis. La régénération avec `scripts/author-company-bank.js` reproduit le même contenu SNCC/RVA. Le validateur distingue désormais les montants positifs et négatifs tout en reconnaissant les variantes équivalentes « −1 » et « moins 1 ».

`npm run test:browser` : **17 scénarios réussis**, dont ancienne/nouvelle copie, correction IA, tuteur, lecture vocale, mobile, minuteur et mode hors ligne. Le mock du rappel désactivé est isolé du service worker pour ce test ; le scénario hors ligne conserve son cache réel. Le contrôle d'image attend son chargement effectif.

## Indices de longueur avant / après

Nombre de QCM sur 40 où la bonne réponse est respectivement la plus longue ou la plus courte, en caractères. Les égalités sont comptées de manière conservatrice ; une égalité ne permet pas d'identifier un choix unique.

| Simulation | Plus longue avant | Après | Plus courte avant | Après |
|---|---:|---:|---:|---:|
| ONATRA 2 | 37 | 19 | 1 | 11 |
| ONATRA 3 | 37 | 10 | 0 | 10 |
| SNCC 1 | 10 | 7 | 27 | 16 |
| SNCC 2 | 10 | 6 | 29 | 17 |
| SNCC 3 | 10 | 14 | 29 | 13 |
| RVA 1 | 10 | 6 | 27 | 14 |
| RVA 2 | 16 | 8 | 21 | 19 |
| RVA 3 | 10 | 12 | 26 | 16 |
| RVA 4 | 16 | 8 | 20 | 14 |
| RVA 5 | 10 | 9 | 28 | 14 |
