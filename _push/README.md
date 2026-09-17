# Notifications MyVapePal — service Cloudflare déployé

Le service a été déployé le 17 septembre 2026 sur `https://myvapepal-notifications.karine-n-lopez.workers.dev`, avec D1, les secrets VAPID et un déclenchement toutes les cinq minutes. Les 18 tests locaux et les contrôles d'API distante (configuration, CORS, inscription, propriété et suppression) passent. L'appareil fictif a été supprimé sans programmer de notification.

La publication du front sur GitHub Pages reste soumise à la validation de Karine. La réception réelle sur Android, application fermée, n'a pas encore été constatée. Elle nécessite la publication puis l'activation du nouvel abonnement depuis le téléphone. La mesure du CPU d'un véritable envoi en production reste également à vérifier.

## Comportement

- Félicitations vers 9 h dans le dernier fuseau communiqué par le téléphone, une fois par jour.
- Fin de steep vérifiée toutes les cinq minutes, avec le nom, le dosage en mg/ml et le volume en ml du flacon concerné.
- Croissance aux jours 31, 91, 151 et 241. Pas de rappel des anciens stades lors de la première activation ou d'une correction de date.
- Un bouton d'activation, aucun bouton de test utilisateur.
- La permission Android seule n'est jamais présentée comme un abonnement serveur confirmé.
- Les appareils synchronisent leur date d'arrêt, leur fuseau et leurs échéances après les modifications et au retour de l'application. Une modification faite hors ligne n'est connue du service qu'après la reconnexion.
- Les envois acceptés par le service push ne garantissent pas une présentation immédiate par Android (réseau, économie d'énergie, modes silencieux). TTL de 24 heures. Les échecs temporaires sont retentés au maximum huit fois avec délai croissant.
- File d'envoi durable, clé d'événement unique, verrou par tentative, et protection locale contre les doublons après affichage. Une panne entre acceptation et sauvegarde peut occasionner une nouvelle tentative : aucune garantie d'exactement une livraison réseau.
- Appareils inactifs depuis 180 jours supprimés. Réactivation à la prochaine synchronisation. Historique d'envoi conservé 30 jours.
- Limite logique de 200 appareils bêta et de 10 envois par exécution. Ce n'est pas une garantie de capacité de l'offre gratuite : surveiller le temps CPU réel et les quotas avant d'élargir la bêta.

## Installation développeur

Node 22+ ; `pnpm install --frozen-lockfile` dans ce dossier. `pnpm test`, puis `pnpm build`.
Les tests couvrent la planification, les fuseaux, les corrections de date, les steeps, les règles d'accès, les annulations, les reprises, le chiffrement Web Push et le service worker.

## Configuration Cloudflare (effectuée ; procédure de référence)

1. Se connecter avec Wrangler : droits de lecture du compte, écriture Workers et D1 (pas de droits GitHub).
2. Créer D1 `myvapepal-push`, reporter son identifiant réel dans `wrangler.jsonc`.
3. Appliquer `schema.sql` sur cette nouvelle base avec `wrangler d1 execute myvapepal-push --remote --file=schema.sql`.
4. Générer une paire VAPID de production avec `web-push.generateVAPIDKeys()` dans un environnement privé. Ne jamais la copier dans le code ou un commit. La paire de `.dev.vars` sert uniquement aux essais locaux.
5. Définir `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` dans les secrets du Worker. Conserver la clé privée : sa rotation nécessite de renouveler les abonnements.
6. Déployer `myvapepal-notifications` avec Wrangler. La configuration fournit DB, limitation de requêtes, compatibilité Node et déclenchement toutes les cinq minutes.
7. Vérifier `/config` depuis l'origine autorisée, les erreurs d'accès et la réception réelle avec un abonnement de développement. Mesurer le CPU des envois sur Workers Free avant d'annoncer le service opérationnel. Ne souscrire aucune offre payante sans validation.
8. Après validation de Karine seulement, publier les fichiers du front sur GitHub Pages. Chaque appareil devra activer le nouvel abonnement depuis le profil, même si la permission Android est déjà accordée.

## Sécurité et données

Les dépenses, recettes et prénom restent locaux. Le service stocke l'abonnement push, la date d'arrêt, le fuseau, les identifiants des flacons en maturation, leurs échéances, noms, dosages en nicotine et volumes. Le profil l'indique avant activation. Les messages push sont chiffrés avec aes128gcm par la bibliothèque `web-push` et signés par VAPID.
Chaque installation détient un secret aléatoire de 256 bits dans IndexedDB. Le serveur n'en stocke que l'empreinte SHA-256. Les mises à jour/suppressions nécessitent ce secret. Liste fermée des domaines push autorisés, pas de redirection HTTP, validation stricte et limite de taille ; requêtes de modification limitées par IP. CORS limite l'usage par d'autres pages mais ne constitue pas une authentification. Les inscriptions sont publiques, adaptées à une petite bêta : avant une large diffusion, ajouter une protection anti-abus plus complète.

Les journaux applicatifs Cloudflare sont désactivés dans la configuration pour éviter d'enregistrer les données d'abonnement. Les clés privées, `.dev.vars`, `node_modules`, sorties de compilation et état Wrangler sont exclus de Git. Le dossier `_push` est destiné au serveur, pas à être publié comme page du site.

Le serveur peut conserver des abonnements dont l'utilisateur a bloqué les notifications jusqu'au prochain retour de l'application, à une réponse push 404/410, ou à l'expiration après 180 jours. Android bloque entre-temps leur affichage.

Mise à jour déployée sur Cloudflare : messages de steep détaillés (nom, dosage, volume), version `6dcb8f07-b6fc-441d-a958-54176eaeb12b`. Le service répond HTTP 200 sur sa configuration publique. Les anciens abonnements sans détails restent compatibles ; les détails arrivent à la prochaine synchronisation du front mis à jour.
