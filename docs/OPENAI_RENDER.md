# Configuration OpenAI et Render

Le Static Site existant `cap70-aptitude` est conservé. Le nouveau Web Service Node `cap70-pedagogie-api` appelle OpenAI et garde la clé côté serveur. Cette intervention prépare les fichiers localement : aucun dépôt distant ni service Render n’a été modifié.

## Valeurs préparées

| Paramètre | Valeur |
|---|---|
| Backend : Runtime | Node, version 24 (`.node-version`) |
| Backend : Build Command | `npm ci --omit=dev` |
| Backend : Start Command | `npm run api` |
| Backend : Health Check Path | `/api/health` |
| Backend : `NODE_ENV` | `production` |
| Backend : `OPENAI_API_KEY` | Secret à renseigner uniquement dans Render |
| Backend : `OPENAI_MODEL` | `gpt-4.1-mini` |
| Backend : `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` |
| Backend : `OPENAI_TTS_VOICE` | `marin` |
| Backend : `AI_AUDIO_DAILY_LIMIT` | `50` |
| Backend : `ALLOWED_ORIGINS` | `https://cap70-aptitude.onrender.com` |
| Backend : `AI_DAILY_CALL_LIMIT` | `500` |
| Backend : `AI_SESSION_DAILY_LIMIT` | `80` |
| Backend : `AI_IP_DAILY_LIMIT` | `120` |
| Backend : `AI_MAX_CONCURRENT` | `3` |
| Backend : `AI_EVALUATION_MAX_TOKENS` | `1100` par défaut |
| Backend : `AI_CHAT_MAX_TOKENS` | `700` par défaut |
| Frontend : `PUBLIC_API_URL` | `https://cap70-pedagogie-api.onrender.com` |
| Frontend : Build Command | `npm ci && npm run build:render` |
| Frontend : Publish Directory | `dist` |

Render fournit `PORT` automatiquement. Le serveur écoute sur `0.0.0.0`. Le frontend ne reçoit que l’URL publique, injectée au build dans `dist/src/api-config.js`. Les URL ci-dessus correspondent aux noms du Blueprint ; les adresses réellement attribuées dans votre compte restent la référence.

## CE QUE JE DOIS FAIRE MOI-MÊME SUR RENDER

Prérequis : publier ces modifications sur la branche GitHub déjà reliée à Render, sans fichier `.env` réel. Ne pas recréer le Static Site existant.

1. Dans [Dashboard Render](https://dashboard.render.com/), ouvrir le Blueprint existant et synchroniser le `render.yaml` mis à jour. Vérifier l’ajout du seul Web Service `cap70-pedagogie-api`. Si le site n’utilise pas de Blueprint, choisir **New → Web Service**, connecter le même dépôt et reprendre les paramètres backend du tableau.
2. Ouvrir **cap70-pedagogie-api → Environment → Add Environment Variable**. Ajouter `OPENAI_API_KEY` avec la clé déjà disponible dans votre environnement ou gestionnaire de secrets, directement dans Render. Ne pas la transmettre ici ni dans GitHub. Vérifier `OPENAI_MODEL=gpt-4.1-mini`.
3. Dans le même onglet, définir `ALLOWED_ORIGINS` à l’origine HTTPS réelle du site existant, sans chemin ni slash final. La valeur préparée est `https://cap70-aptitude.onrender.com`. Pour une autre adresse ou un domaine personnalisé, utiliser cette origine réelle ; plusieurs origines sont séparées par des virgules.
4. Enregistrer et redéployer le backend avec **Save, rebuild, and deploy**, ou **Manual Deploy → Deploy latest commit** après enregistrement. Ouvrir son URL publique suivie de `/api/health`. Résultat attendu : `status: "ok"`, `aiConfigured: true`, `model: "gpt-4.1-mini"`. Ce contrôle confirme la configuration, pas à lui seul un appel OpenAI.
5. Ouvrir le **Static Site existant → Environment**. Définir `PUBLIC_API_URL=https://cap70-pedagogie-api.onrender.com`, puis **Manual Deploy → Deploy latest commit**. Si Render attribue une autre URL au backend, utiliser son origine réelle et remplacer aussi cette origine dans `connect-src` de l’en-tête **Content-Security-Policy** du Static Site (`render.yaml` si Blueprint, sinon réglages d’en-têtes).
6. Sur le site, terminer une simulation ou consulter une copie puis lancer les corrections manquantes. Vérifier les QCM immédiats, les notes écrites et le bouton d’explication dans l’assistant. L’assistant disparaît dès qu’une simulation est active.

Aucun service existant ne doit être supprimé. Aucune clé ne doit être ajoutée aux variables frontend.

## Utilisation locale

Installer les dépendances avec `npm ci`, puis lancer uniquement **`npm run dev`**. Cette commande fournit le site et `/api/*` sur le même serveur. Ouvrir `http://127.0.0.1:4173`. La clé est lue depuis l’environnement du processus ; aucun chargement implicite d’un fichier `.env` n’est effectué. `npm run api` reste la commande du backend autonome utilisé sur Render, pas une étape supplémentaire en développement.

Le serveur local complet écoute sur 4173. Le Live Server VS Code sur 5500/5501 est aussi pris en charge si ce serveur complet reste lancé. Le backend autonome Render conserve sa propre commande et son port d’environnement. Le build de production sans `PUBLIC_API_URL` désactive proprement les appels IA avec un message explicite.

## Fonctionnement et limites

- Évaluations : Responses API du SDK officiel, schéma Zod strict, notes 0–10 par demi-points. Le serveur sélectionne question, référence et critères dans la banque. Un JSON invalide, un refus ou un délai dépassé laisse la réponse en attente.
- Total : 40 QCM à 1 point et 10 écrits à `note IA × 0,6` ; seuil 70. Commentaires notés séparément, hors total. Les anciennes auto-évaluations sur 6 restent lisibles ; les nouvelles tentatives utilisent les seules notes IA.
- Copies, notes partielles, dates et corrections sont sauvegardées localement. La relance saute les corrections déjà reçues. Le cache serveur est borné et déduplique les requêtes identiques. L’historique de discussion local peut être effacé par entreprise.
- Origines explicites, sessions signées de 24 heures, limites par session et adresse source, plafond global quotidien, concurrence et tokens plafonnés. Le visiteur ne choisit pas le modèle. Ces sessions ne sont pas des comptes authentifiés ; le plafond global protège aussi contre la création répétée de sessions.
- Cache, sessions et compteurs sont en mémoire pour une instance et sont réinitialisés à son redémarrage. Ce mécanisme ne constitue pas un plafond de facturation mensuel ni une protection distribuée multi-instance. Une adresse source peut être celle d’un proxy Render ; le quota par adresse est conservateur. Le plafond global reste appliqué.
- Les requêtes OpenAI utilisent `store:false`. Aucun nom, profil ou e-mail n’est ajouté. Les textes libres peuvent contenir ce que saisit l’utilisateur : l’interface invite à éviter les données personnelles. Les copies et erreurs brutes du fournisseur ne sont pas journalisées.
- Le backend gratuit peut se mettre en veille. L’interface signale l’attente et conserve les réponses ; relancer après un délai dépassé. Un appel OpenAI peut être facturé même si le navigateur a abandonné l’attente. L’utilisation d’OpenAI est facturée séparément de Render.
- Le masquage de l’assistant protège le parcours normal du simulateur. Une banque statique publique ne devient pas une plateforme officielle à accès contrôlé ; le backend refuse aussi un contexte déclaré actif.

Références : [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [Blueprint Render](https://render.com/docs/blueprint-spec), [plan gratuit Render](https://render.com/docs/free). Voir aussi le [rapport de vérification](VERIFICATION_IA_SNCC_RVA.md).

## Résultats, flux de texte et lecture

Les résultats techniques reprennent la jauge des examens généraux : grande note finale sur 100, statut du seuil, scores QCM/écrits, suivi des commentaires hors total et six barres de section. Le résultat provisoire reste sans note finale jusqu’aux dix corrections écrites. Des actions ouvrent une analyse IA, une révision ciblée des points faibles et la lecture d’une correction.

Le chatbot demande un véritable flux Responses API. Les fragments sont transmis par SSE, sans attendre la réponse complète ; une coupure conserve la possibilité de relancer. Le panneau est élargi et agrandissable. Les suggestions deviennent compactes après le premier message pour laisser la place à la lecture.

La lecture est générée par l’API vocale OpenAI (voix **Marin**), sur clic, avec pause, reprise et arrêt. Ce choix ne prétend pas reproduire une préférence de voix personnelle du compte ChatGPT. Les textes longs sont découpés en passages bornés. Le cache audio serveur est limité à dix éléments et le navigateur garde jusqu’à huit passages en mémoire ; pause/reprise ne régénère pas l’audio. Le plafond audio s’ajoute aux quotas IA existants. Les appels vocaux sont facturables et le modèle est configurable côté serveur.

La CSP autorise `media-src 'self' blob:` pour lire les fichiers audio générés sans exposer la clé. Le service worker met le module `speech.js` en cache et ne met pas les routes API en cache. Les contrôles automatisés utilisent des réponses et audios simulés. `node scripts/smoke-stream-voice.js` effectue volontairement un vrai chat en flux et une courte génération vocale ; il écrit un échantillon ignoré par Git dans `test-results/voice-openai.mp3`.

Documentation : [Streaming Responses](https://developers.openai.com/api/docs/guides/streaming-responses), [Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech). La disponibilité future des modèles vocaux doit être revue lors d’une maintenance ; `OPENAI_TTS_MODEL` permet de changer le modèle sans modifier le frontend.
