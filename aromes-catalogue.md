# Catalogue des arômes — sélection initiale

Vérification documentaire : 4 octobre 2026. 44 références, 47 fiches avec les trois éditions Green déjà présentes, six marques. Sélection éditoriale pour le marché français, pas un classement officiel des ventes ni un inventaire exhaustif. Les contenances ne sont pas comptées comme de nouvelles recettes.

## Périmètre

Le fichier de données reste autonome. Son raccord via `aromes.js` ajoute la recherche dans le DIY, des recommandations conservées dans les recettes et les flacons, et une référence facultative dans les lots de stock. Les illustrations existantes sont conservées.

| Marque | Références | Fiches | Origine principale des données |
|---|---:|---:|---|
| A&L | 12 | 15 | Site de la marque / du fabricant |
| Vampire Vape | 5 | 5 | Site de la marque / du fabricant |
| T-Juice | 5 | 5 | Site de la marque / du fabricant |
| Full Moon | 8 | 8 | Site de la marque / du fabricant |
| Revolute | 8 | 8 | Revendeur A&L |
| Cirkus | 6 | 6 | Site de la marque / du fabricant |

## Structure et règles de maintenance

- `versionSchema: 2` : ajout du répertoire fabricants, du regroupement des éditions et de la traçabilité des réserves. Les six identifiants initiaux sont préservés. `dateMiseAJour` est la date de revue documentaire.
- `id` : identifiant permanent d’une fiche/édition ; `referenceId` : référence commune à ses éditions. Ne pas recalculer ces identifiants si un libellé change. Ne pas fusionner des produits simplement parce que leur nom est identique.
- `fabricants`, `marques.fabricantId`, `gamme` : trois niveaux distincts. Le fabricant industriel de T-Juice n’est pas déduit du propriétaire commercial ; `fabricantId` reste null. Les coordonnées officielles de Revolute restent null : l’ancien domaine revolute.fr est proposé à la vente à la date de consultation.
- `saveurIds` : notes aromatiques annoncées, pas liste d’ingrédients, d’allergènes ou de substances. Les alias servent uniquement à la recherche. Ils ne prouvent pas la présence d’une saveur dans un produit. Aucune intensité arbitraire n’est attribuée.
- `type` : `arome-simple` ou `concentre-compose` décrit le profil annoncé. Ce n’est pas une analyse chimique. Une note aromatique générique peut recouvrir un concentré composé.
- `fraicheur` et `sansEdulcorant` : true/false seulement si documentés, null si inconnus. Menthe, sensation de fraîcheur et absence d’édulcorant sont indépendantes. Ne pas interpréter null comme false. Aucune promesse sanitaire n’est tirée de ces attributs.
- `dosages` : pourcentage de concentré dans le volume final ; valeur unique = min/max identiques. `ratioBase` indique la condition PG/VG fournie par la source, pas le ratio final calculé. null signifie non précisé, jamais « tous ratios ». Ne pas extrapoler vers un autre ratio ni convertir des gouttes en ml.
- `maturation` : plage conseillée en jours ; null si absente ou incohérente. Les semaines sont converties en 7 jours et les heures en fractions de jours. Ne pas confondre maturation et délai d’expédition. Les plages ne deviennent pas silencieusement des moyennes.
- `formatVerifieMl`, lorsqu’il est présent, précise le flacon couvert par la fiche source ; il ne constitue pas une liste exhaustive des contenances existantes. Ne pas appliquer automatiquement ses données à une reformulation ou à un autre format.
- `sourcePrincipaleId` rattache l’identité, les saveurs et attributs au document consulté. `sourceId` sur chaque dosage/maturation permet de distinguer fabricant et revendeur. `verifieLe` est une date de consultation, pas la date de formulation du produit. Les sources sont conservées même en cas de contradiction.
- `pointsAVerifier` identifie les champs non résolus et leurs sources. Un champ bloqué ne contient aucune valeur numérique exploitable. `notes` conserve les nuances documentaires.
- Les fiches produit des concentrés sont privilégiées ; pas de transposition depuis un prêt à vaper, un longfill ou une recette de client. Aucun prix, classement de popularité ou état de stock volatil n’est enregistré.

## Points à connaître pour le raccordement

- 39 fiches reposent sur les sites des marques/fabricants ; 8 fiches Revolute reposent sur le revendeur A&L. Le futur écran doit préciser cette provenance. Il ne doit pas étiqueter un conseil revendeur « recommandation fabricant ».
- Classic 4X : dosage et maturation non retenus, car les revendeurs donnent des valeurs divergentes, parfois sur la même page.
- Classic RY4 : dosage non retenu, car la page officielle indique 20 % en 50/50 dans son résumé et 15 % dans sa rubrique Utilisation. Il ne s’agit pas d’une plage 15–20 %.
- Clara-T : dosage et maturation absents de la page officielle consultée ; aucune généralisation depuis les autres T-Juice.
- Vampire Vape : maturation spécifique non trouvée sur les cinq fiches ; ratio PG/VG non précisé pour la plage 15–20 %.
- Full Moon : plage 5–10 % sans ratio PG/VG précisé. Les Just Fruit sont distincts des versions fraîches.
- Cirkus : plusieurs pages présentent environ 15 jours dans le résumé et 7–15 jours dans Utilisation. Cette nuance est conservée. La mention « sans sucralose » seule n’est pas étendue à « sans aucun édulcorant ».
- Alucard : fiche technique 2–3 jours ; le texte envisage aussi 2–3 semaines. La durée courte n’est pas présentée comme une obligation ou une garantie.
- Aucun dosage incomplet, contradictoire ou provenant seulement d’un revendeur ne devrait préremplir automatiquement une recette sous le libellé « fabricant ». Une plage valide devra être présentée comme un choix à faire par l’utilisateur.

Le moteur de recherche, les filtres, le calculateur et le premium restent hors de cette étape.

## Références et sources consultées

Les éditions sont regroupées ci-dessous ; chaque fiche contient sa propre source datée.

| Marque / gamme | Référence | Dosage consigné | Maturation | Source |
|---|---|---|---|---|
| A&L / Ultimate | Ragnarok | 5 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/5950-concentre-ultimate-ragnarok-par-al-10-ou-30ml.html) |
| A&L / Ultimate | Ragnarok Zero | 5 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/7420-concentre-ultimate-ragnarok-zero-par-al-10-ou-30ml.html) |
| A&L / Ultimate | Oni | 5 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/2570-concentre-ultimate-oni-par-al-30ml.html) |
| A&L / Ultimate | Nagato | 9 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/11586-concentre-ultimate-nagato.html) |
| A&L / Ultimate | Kami | 9 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/15951-concentre-kami.html) |
| A&L / Ultimate | Shinigami | 10 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/7730-concentre-ultimate-shinigami-par-al-10-ou-30ml.html) |
| A&L / Ultimate | Alucard | 11 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/14148-concentre-alucard-ultimate-al.html) |
| A&L / Ultimate | Phoenix | 10 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/9531-concentre-ultimate-phoenix-par-al-10-ou-30ml.html) |
| A&L / Ultimate | Fury | 5 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/2851-concentre-ultimate-fury-par-al.html) |
| A&L / Ultimate | Valkyrie | 10 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/7727-concentre-ultimate-valkyrie-par-al-10-ou-30ml.html) |
| A&L / Ultimate | Shinobi | 9 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/11391-concentre-ultimate-shinobi.html) |
| A&L / Ultimate | Bahamut | 4 % (PG/VG 50/50) | 2–3 j | [fabricant](https://www.aromes-et-liquides.fr/aromes-al-ultimate/2291-concentre-bahamut-par-al-30ml.html) |
| Vampire Vape | Heisenberg | 15–20 % (ratio non précisé) | Non retenue / non communiquée | [fabricant](https://www.vampirevape.co.uk/e-liquid/flavour-concentrates/vampire-vape-heisenberg-30ml-e-liquid-concentrate) |
| Vampire Vape | Pinkman | 15–20 % (ratio non précisé) | Non retenue / non communiquée | [fabricant](https://www.vampirevape.co.uk/vampire-vape-pinkman-30ml-e-liquid-concentrate) |
| Vampire Vape | Blood Sukka | 15–20 % (ratio non précisé) | Non retenue / non communiquée | [fabricant](https://www.vampirevape.co.uk/vampire-vape-blood-sukka-30ml-e-liquid-concentrate) |
| Vampire Vape | Black Jack | 15–20 % (ratio non précisé) | Non retenue / non communiquée | [fabricant](https://www.vampirevape.co.uk/vampire-vape-black-jack-30ml-e-liquid-concentrate) |
| Vampire Vape | Bat Juice | 15–20 % (ratio non précisé) | Non retenue / non communiquée | [fabricant](https://www.vampirevape.co.uk/vampire-vape-bat-juice-30ml-e-liquid-concentrate) |
| T-Juice | Red Astaire | 20 % (ratio non précisé) | 1–3 j | [fabricant](https://www.t-juice.com/products/red-astaire-concentrate) |
| T-Juice | Clara-T | À confirmer / non communiqué | Non retenue / non communiquée | [fabricant](https://www.t-juice.com/products/clara-t-concentrate) |
| T-Juice | Colonel Custard | 20 % (ratio non précisé) | 1–3 j | [fabricant](https://www.t-juice.com/products/colonel-custard-concentrate) |
| T-Juice | Forest Affair | 20 % (ratio non précisé) | 1–3 j | [fabricant](https://www.t-juice.com/products/forest-affair-concentrate) |
| T-Juice | Vamp Vape | 20 % (ratio non précisé) | 1–3 j | [fabricant](https://www.t-juice.com/products/vamp-vape-concentrate) |
| Full Moon / Colors | Green | 5–10 % (ratio non précisé) | 1–2 j | [fabricant](https://fullmoon-shop.com/fr/concentres-30ml/60-green-30ml-diy.html) |
| Full Moon / Maori | Honu | 5–10 % (ratio non précisé) | 1–2 j | [fabricant](https://fullmoon-shop.com/fr/concentres-10ml/122-honu-10ml-diy.html) |
| Full Moon / Just Fruit | Red | 5–10 % (ratio non précisé) | 1–2 j | [fabricant](https://fullmoon-shop.com/fr/concentres-10ml/27-jf-red-10ml-diy.html) |
| Full Moon | Hypnose | 5–10 % (ratio non précisé) | 1–2 j | [fabricant](https://fullmoon-shop.com/fr/concentres-30ml/65-hypnose-30ml-diy.html) |
| Full Moon / Just Fruit | Hypnose | 5–10 % (ratio non précisé) | 1–2 j | [fabricant](https://fullmoon-shop.com/fr/concentres-10ml/53-jf-hypnose-10ml-diy.html) |
| Full Moon / Just Fruit | Purple | 5–10 % (ratio non précisé) | 1–2 j | [fabricant](https://fullmoon-shop.com/fr/concentres-10ml/30-jf-purple-10ml-diy.html) |
| Full Moon / Colors | Red | 5–10 % (ratio non précisé) | 1–2 j | [fabricant](https://fullmoon-shop.com/fr/concentres-30ml/62-red-30ml-diy.html) |
| Full Moon | Green Infinity | 5–10 % (ratio non précisé) | 1–2 j | [fabricant](https://fullmoon-shop.com/fr/concentres-30ml/75-infinity-green-30ml.html) |
| Revolute | Classic 4X | À confirmer / non communiqué | Non retenue / non communiquée | [revendeur](https://www.aromes-et-liquides.fr/aromes-high-end-by-revolute/16103-concentre-classic-4x.html) |
| Revolute | Vanille | 5 % (PG/VG 50/50) | 14 j | [revendeur](https://www.aromes-et-liquides.fr/aromes-high-end-by-revolute/2085-arome-vanille-par-revolute.html) |
| Revolute | Le Café Des Gourmands | 10 % (PG/VG 50/50) | Non retenue / non communiquée | [revendeur](https://www.aromes-et-liquides.fr/aromes-high-end-by-revolute/9879-concentre-le-cafe-des-gourmands-par-revolute.html) |
| Revolute | Sweet Mint | 4 % (PG/VG 50/50) | 7 j | [revendeur](https://www.aromes-et-liquides.fr/aromes-high-end-by-revolute/2083-arome-sweet-mint-par-revolute.html) |
| Revolute | The Pti Dej | 15 % (PG/VG 50/50) | 14 j | [revendeur](https://www.aromes-et-liquides.fr/aromes-high-end-by-revolute/2538-concentre-the-pti-dej-par-revolute.html) |
| Revolute | Démence Cérébrale | 10 % (PG/VG 50/50) | Non retenue / non communiquée | [revendeur](https://www.aromes-et-liquides.fr/aromes-high-end-by-revolute/9876-concentre-demence-cerebrale-par-revolute.html) |
| Revolute | Duo Fraise Banane | 10 % (PG/VG 50/50) | 2–3 j | [revendeur](https://www.aromes-et-liquides.fr/aromes-high-end-by-revolute/2800-concentre-duo-fraise-banane-par-revolute.html) |
| Revolute | Duo Framboise Cassis | 10 % (PG/VG 50/50) | 2–3 j | [revendeur](https://www.aromes-et-liquides.fr/aromes-high-end-by-revolute/2802-concentre-duo-framboise-cassis-par-revolute.html) |
| Cirkus | Classic Menthe | 20 % (PG/VG 50/50) | 7–15 j | [fabricant](https://e-boutiquevdlv.fr/aromes-bases/716-arome-classic-menthe.html) |
| Cirkus | Classic RY4 | À confirmer / non communiqué | 15 j | [fabricant](https://e-boutiquevdlv.fr/aromes-bases/897-arome-cirkus-classic-ry4-30ml.html) |
| Cirkus | Gourmet | 20 % (PG/VG 50/50) | 7–15 j | [fabricant](https://e-boutiquevdlv.fr/aromes-bases/828-arome-gourmet.html) |
| Cirkus | Mangue Passion Vanille | 20 % (PG/VG 50/50) | 15 j | [fabricant](https://e-boutiquevdlv.fr/aromes-bases/1014-arome-mangue-passion-vanille-30ml.html) |
| Cirkus | Classic Blond | 20 % (PG/VG 50/50) | 7–15 j | [fabricant](https://e-boutiquevdlv.fr/aromes-bases/1041-arome-classic-blond-30ml.html) |
| Cirkus | Classic FR | 20 % (PG/VG 50/50) | 7–15 j | [fabricant](https://e-boutiquevdlv.fr/aromes-bases/427-arome-cirkus-classic-fr.html) |

## Observations de recherche

Le rappel A&L Ultimate publié le 7 mars 2025 concerne des mentions de danger manquantes sur l’étiquetage ; la fin de procédure annoncée était le 6 juin 2025. Il n’est pas utilisé pour déduire la disponibilité ou la conformité des lots actuels. Source : https://rappel.conso.gouv.fr/affichettePDF/17607/Interne.

Le catalogue est une base documentaire, pas un suivi des lots ni un service de veille des rappels. Les champs devront être revérifiés lors d’une reformulation ou d’une nouvelle édition.

## Vérification locale

`node --test _backup/test/aromes-catalogue.test.js`

Contrôles : chargement sans effet de bord, unicité des identifiants/éditions, liens marques/fabricants/saveurs/sources, validité des plages et ratios, blocage des valeurs contradictoires, conservation des identifiants initiaux et ordre de chargement des scripts du catalogue et de son interface.

## Raccord au DIY et à Android (4 octobre 2026)

- Recherche locale par mots-clés combinés, marque, gamme et saveurs ; accents et alias pris en compte. Les variantes de gamme et d’édition restent identifiables.
- Le bouton « Utiliser pour une recette » prépare une nouvelle recette. Le dosage n’est pas choisi automatiquement : le ratio PG/VG et la source du conseil sont affichés.
- Pour la maturation, la borne haute est proposée avec un bouton explicite. Le champ reste modifiable. Vide signifie durée inconnue ; zéro signifie sans attente. Une durée inconnue ne produit ni badge « prêt », ni notification.
- `aromeCatalogue` conserve une copie de la fiche au moment du choix. La durée retenue est enregistrée séparément. Une nouvelle version du catalogue ou une modification de recette ne réécrit aucun flacon existant.
- La préparation calcule `steepReadyAt` depuis `preparedAt` et les jours choisis. Accueil et rappels Android utilisent cette date commune. Le système Android peut différer la réception effective.
- Les nouvelles catégories sont proposées à partir des saveurs détaillées, mais restent modifiables ; les fichiers d’illustration ne changent pas.
- Les lots peuvent être associés à une fiche. Un lot lié à une autre référence/édition est refusé lors d’une préparation issue du catalogue. Les lots manuels restent utilisables. Seule la préparation consomme les lots sélectionnés ; parcourir le catalogue ou sauvegarder une recette ne consomme rien.
- Les sauvegardes conservent ces champs facultatifs. Les anciens enregistrements, sans métadonnées du catalogue, restent acceptés.
- Avant la synchronisation Android : reconstruire `backup.js` avec `npm --prefix _backup run build`, puis `npm run android:sync`. Cette opération ne publie pas l’application et ne crée pas de version signée.
