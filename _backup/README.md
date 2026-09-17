# Sauvegarde facultative MyVapePal

Le client Firebase est préparé mais **inactif** : `backup-config.js` ne contient aucun projet. Aucun compte n'a été créé, aucun e-mail envoyé, aucune donnée personnelle transférée. Aucune publication effectuée.

## Activation gratuite, à faire avec Karine

1. Créer un projet dans https://console.firebase.google.com/ en conservant l'offre **Spark**. Ne pas activer la facturation Blaze, Google Analytics ou un service payant.
2. Enregistrer une application Web. Copier seulement sa configuration publique `apiKey`, `authDomain`, `projectId`, `appId` dans `backup-config.js`. Ne pas fournir de compte de service ni de clé privée.
3. Authentication : activer **E-mail/Mot de passe**, sans connexion par lien. Définir une longueur minimale de 8 caractères ; activer la protection contre l'énumération des adresses. Personnaliser le nom de l'expéditeur en MyVapePal et les e-mails de vérification/réinitialisation. Le gestionnaire de liens hébergé par Firebase suffit.
4. Ajouter `vape-tracker-app.github.io` aux domaines autorisés. Ajouter localhost seulement pour les essais nécessaires.
5. Créer Cloud Firestore **Standard**, emplacement européen, mode production. Publier exactement les règles `firestore.rules`. Ne jamais utiliser des règles publiques. La collection `backups` sera créée à la première sauvegarde.
6. Avant la bêta : vérifier avec deux comptes de test la création, la vérification d'adresse, la connexion, le mot de passe oublié, la sauvegarde, le conflit entre appareils, la restauration et la déconnexion. Vérifier Gmail/Outlook et Android installé. Ne pas annoncer les e-mails comme fonctionnels avant ces essais réels.
7. Faire valider la publication par Karine avant tout envoi sur GitHub.

Offre gratuite limitée par les quotas : https://firebase.google.com/docs/projects/billing/firebase-pricing-plans et https://firebase.google.com/docs/auth/limits . Pas de promesse de capacité illimitée. Cloudflare reste utilisé uniquement pour les notifications ; aucun changement de ce service n'est requis.

## Fonctionnement

- Aucun champ de compte dans l'onboarding. Le bouton Profil reste accessible dès l'ouverture pour retrouver une sauvegarde sans inventer un nouveau parcours.
- Inscription volontaire par adresse et mot de passe, vérification e-mail obligatoire avant toute lecture/écriture de sauvegarde. Le SDK Firebase gère la session persistante ; aucun mot de passe n'est stocké par MyVapePal.
- Premier rattachement : choix explicite avant l'envoi. À la connexion, des données locales différentes d'une version distante inconnue ne sont jamais remplacées silencieusement.
- Sauvegarde après changement (temporisation de 1,8 s), vérification locale toutes les 30 s pour les actions qui ne rafraîchissent pas tout l'écran, nouvel essai au retour réseau/premier plan. Pas d'envoi périodique si les données n'ont pas changé, pas de garantie d'exécution lorsque l'application est fermée.
- Une sauvegarde courante par compte, limitée à 750 000 octets UTF-8 pour rester sous la limite de document Firestore. Pas de fusion automatique entre appareils. Transaction de révision : conflit => choix de version, jamais d'écrasement silencieux.
- Données incluses : `vt_config`, `vt_flacons`, `vt_recettes`, `vt_depenses`, `vt_objectifs`, `vt_observations`, `vt_date_resistance`. Aucun jeton de connexion ou abonnement push dans les sauvegardes.
- Restauration validée avant écriture. Copie locale avant remplacement, journal de restauration et bouton de retour à la copie précédente. Cette copie reste sur le téléphone, pas une archive serveur.
- Déconnexion : arrêt des sauvegardes, données locales conservées explicitement. Ce n'est pas un effacement des données du téléphone.
- Les règles imposent propriétaire vérifié, lecture individuelle, taille, champs autorisés, date serveur et révision croissante. Aucune lecture globale ou suppression autorisée par le client.

## Développement et tests

Node 22+, pnpm. Depuis `_backup` : `pnpm install --ignore-scripts`, `pnpm run build`, `pnpm test`.
Le fichier `backup.js` est le bundle généré et doit être livré avec `backup-config.js`.

Test des règles avec Java 21 et les émulateurs Firebase, sans compte réel :
`pnpm exec firebase emulators:exec --project demo-myvapepal --only firestore "node --test test/rules.test.js"`

Les tests couvrent les sauvegardes rétrocompatibles, erreurs réseau, conflits, validation, restauration interrompue, compte non vérifié, déconnexion, règles d'accès entre deux utilisateurs et célébrations de croissance. Les tests d'e-mails réels restent à faire après configuration.
