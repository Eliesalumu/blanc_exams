# Déployer CAP 70 sur Render

Le projet est prêt pour un **Static Site** Render. Le fichier `render.yaml` décrit le service et ses en-têtes HTTP. Aucun serveur Node permanent, base de données, clé API ou secret n’est nécessaire.

## Déploiement avec le Blueprint

1. Publier les fichiers sources de ce dossier dans un dépôt GitHub, GitLab ou Bitbucket accessible à votre compte Render. Inclure `render.yaml`, `.node-version`, `package.json`, `package-lock.json`, `index.html`, `src/`, `data/`, `assets/`, `scripts/`, `tests/` et `sw.js`. Les dossiers `node_modules/`, `dist/`, `artifacts/` et `test-results/` sont exclus par `.gitignore`.
2. Dans Render, choisir **New → Blueprint**, puis connecter le dépôt et la branche à publier.
3. Render lit `render.yaml`. Vérifier le service `cap70-aptitude` et lancer sa création.
4. La commande de construction installe les dépendances verrouillées, vérifie la banque et lance les tests métier. Si un contrôle échoue, la publication est arrêtée. Sinon, `dist/` est généré et publié.
5. Ouvrir l’URL HTTPS fournie par Render et vérifier l’accueil, une question, la réinitialisation et l’indicateur hors ligne.

Le nom du service peut être modifié dans `render.yaml` avant création. Le dépôt et l’autorisation de votre compte Render restent nécessaires pour effectuer la publication ; la préparation locale ne crée pas de service distant.

## Configuration manuelle équivalente

| Champ Render | Valeur |
|---|---|
| Type de service | **Static Site** |
| Root Directory | Racine du dépôt, vide si le projet y est directement |
| Build Command | `npm ci && npm run build:render` |
| Publish Directory | `dist` |
| Version Node | 24, déclarée dans `.node-version` |
| Start Command | Aucune pour un site statique |

Si la création est manuelle, recopier également les règles `headers` du Blueprint dans les réglages du site. Le `Cache-Control: no-cache` permet la revalidation des fichiers non versionnés et du service worker lors des mises à jour. Le service worker conserve le fonctionnement hors ligne.

Aucune réécriture générale vers `index.html` n’est nécessaire : l’application navigue dans la même page, sans routes client. Les chemins de fichiers absents doivent conserver une réponse 404, notamment pour détecter une ressource manquante.

## Vérification avant publication

```sh
npm ci
npm run build:render
```

Pour les parcours navigateur : `npm run test:browser`. Les tests navigateur ne sont pas exécutés pendant le build Render ; ils nécessitent Edge ou Chromium et ont une commande séparée.

La sortie de publication est uniquement `dist/`. Les documents de travail, tests, sources éditoriales de la banque et dépendances de développement ne sont pas nécessaires au site publié.

## Progression et réinitialisation

Le bouton **Réinitialiser ma progression** est directement visible sur le tableau de bord. Il efface toutes les tentatives, réponses, scores, erreurs et la simulation en cours de ce navigateur, après deux confirmations. L’accès dans « Mode d’emploi » reste disponible.

Les résultats sont stockés dans le navigateur, sur l’origine du site. La progression de `http://127.0.0.1:4173` ne se transfère pas automatiquement à l’adresse Render. Changer d’adresse de site, de navigateur ou d’appareil donne un espace de progression distinct. Les mises à jour sur la même adresse préservent normalement la progression tant que la version de la banque reste compatible.

## Références officielles

- [Sites statiques Render](https://render.com/docs/static-sites)
- [Référence du Blueprint](https://render.com/docs/blueprint-spec)
- [Version de Node](https://render.com/docs/node-version)
- [En-têtes HTTP](https://render.com/docs/static-site-headers)
