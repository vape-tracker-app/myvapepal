// Une animation par session, jamais rejouée au retour au premier plan.
(() => {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    let vapeur;
    let launchTimer;
    function finish() {
        clearTimeout(launchTimer);
        splash.remove();
        vapeur?.remove();
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', finish);
    }
    function onVisibilityChange() {
        if (document.visibilityState === 'hidden') finish();
    }
    if (document.documentElement.classList.contains('splash-already-seen') || document.visibilityState === 'hidden') {
        finish();
        return;
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', finish);
    launchTimer = setTimeout(() => {
        splash.classList.add('splash-depart');
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            vapeur = document.createElement('div');
            vapeur.className = 'splash-vapor-trail';
            vapeur.setAttribute('aria-hidden', 'true');
            document.body.appendChild(vapeur);
        }
        setTimeout(() => splash.remove(), 1400);
        setTimeout(finish, 2100);
    }, 950);
})();

// =============================================================
// MYVAPEPAL PWA - CODE PRINCIPAL APPLICATION
// =============================================================
// =============================================================
// SALON DES P'TITES VICTOIRES - SUGGESTIONS
// =============================================================
const SUGGESTIONS_VICTOIRES = [
    "Tu peux sortir faire une course sans vérifier si tu as pensé à prendre ton briquet.",
    "Tu peux conduire sans devoir entrouvrir la fenêtre pour fumer, même quand il pleut ou qu'il fait froid.",
    "Tes vêtements ne sentent plus la cigarette à la fin de la journée.",
    "Tu n'as plus de cendrier à vider ni de mégots à jeter.",
    "Tu peux rester avec les autres au lieu de t'éclipser pour aller fumer.",
    "Tu peux prendre quelques bouffées de vape puis la ranger, sans devoir terminer une cigarette allumée.",
    "Tu ne te demandes plus combien de cigarettes il te reste avant de sortir.",
    "Tu peux partir de chez toi sans chercher frénétiquement un briquet au dernier moment.",
    "L'odeur de cigarette te paraît différente depuis que tu ne fumes plus.",
    "Ton café existe maintenant sans que la cigarette soit obligatoirement invitée avec.",
    "Tu peux profiter d'un trajet entier sans chercher un endroit où t'arrêter pour fumer.",
    "Tu n'as plus cette petite inquiétude d'avoir laissé une cigarette mal éteinte quelque part.",
    "Tu peux passer devant un bureau de tabac sans avoir automatiquement quelque chose à y acheter.",
    "Tu n'as plus besoin de prévoir où et quand tu pourras fumer avant une sortie.",
    "Tes mains ne gardent plus cette odeur de cigarette après avoir fumé.",
    "Tu peux embrasser quelqu'un sans te demander si ton haleine sent la cigarette.",
    "Tu peux rester bien au chaud pendant une pause au lieu de sortir fumer.",
    "Tu réalises parfois que plusieurs heures ont passé sans même avoir pensé à une cigarette.",
    "Ton sac ou tes poches n'ont plus besoin d'avoir leur duo paquet + briquet attitré.",
    "Tu peux choisir le moment où tu vapotes au lieu d'être coincé(e) avec une cigarette qui continue de brûler."
];

let suggestionVictoireActuelle = "";
let dateVictoireQuotidienne = localStorage.getItem('vt_victoire_quotidienne_date') || "";
let configUser = null;
let flacons = [];
let recettes = [];
let depenses = [];
let objectifs = [];
let observations = [];
let dateArretEnAttente = null;

try {
    configUser = JSON.parse(localStorage.getItem('vt_config')) || null;
    flacons = JSON.parse(localStorage.getItem('vt_flacons')) || [];
    recettes = JSON.parse(localStorage.getItem('vt_recettes')) || [];
    depenses = JSON.parse(localStorage.getItem('vt_depenses')) || [];
    objectifs = JSON.parse(localStorage.getItem('vt_objectifs')) || [];
    observations = JSON.parse(localStorage.getItem('vt_observations')) || [];
} catch (e) {
    console.error("Erreur lecture LocalStorage", e);
}

document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW error:', err));
    }

    if (!configUser || !configUser.dateArret) {
        afficherEcran('ecran-onboarding');
        const entete = document.getElementById('entete-app');
        const nav = document.getElementById('navigation-basse');
        if (entete) entete.style.display = 'flex';
        if (nav) nav.style.display = 'none';
    } else {
        initialiserInterface();
    }

    configurerEcouteurs();
    configurerSwipeNavigation();
});

function initialiserInterface() {
    const modale = document.getElementById('modale-confirmation-date');
    if (modale) {
        modale.classList.add('masque');
        modale.style.display = 'none';
    }

    const entete = document.getElementById('entete-app');
    const nav = document.getElementById('navigation-basse');
    if (entete) entete.style.display = 'flex';
    if (nav) nav.style.display = 'flex';
    
    try {
        if (document.getElementById('cigs-jour')) document.getElementById('cigs-jour').value = configUser.cigsJour || 15;
        if (document.getElementById('cigs-paquet')) document.getElementById('cigs-paquet').value = configUser.cigsPaquet || 20;
        if (document.getElementById('prix-paquet')) document.getElementById('prix-paquet').value = configUser.prixPaquet || 12.5;
        if (document.getElementById('config-vapote')) document.getElementById('config-vapote').value = configUser.vapote ? 'oui' : 'non';
        if (document.getElementById('config-nicotine')) document.getElementById('config-nicotine').value = configUser.nicotineActuelle ?? 12;

        const grpNic = document.getElementById('groupe-config-nicotine');
        if (grpNic) {
            if (configUser.vapote) grpNic.classList.remove('masque-champ');
            else grpNic.classList.add('masque-champ');
        }
    } catch (err) {
        console.warn("Champs non initialisés", err);
    }

    mettreAJourTout();
    afficherEcran('ecran-accueil');
}

function mettreAJourTout() {
    mettreAJourDashboard();
    mettreAJourCerisierHD();
    afficherFlaconActif();
    afficherFlaconsEntames();
    afficherDernierChangementResistance();
    afficherReserveEtMaturation();
    afficherHistoriqueFlacons();
    afficherRecettes();
    afficherParcours();
    afficherFinances();
    afficherObjectifs();
    if (typeof MyVapeGoals !== 'undefined') MyVapeGoals.render();
    remplirSelectRecettes();
    afficherProfil();
    if (typeof MyVapeUI !== 'undefined') MyVapeUI.decorateBottles();
    if (typeof MyVapeBackup !== 'undefined') MyVapeBackup.changed();
    if (typeof MyVapePush !== 'undefined') MyVapePush.sync();
}

function getJoursEcoules() {
    if (!configUser || !configUser.dateArret) return 0;
    const debut = new Date(configUser.dateArret);
    const maintenant = new Date();
    const diffTemps = Math.abs(maintenant - debut);
    return Math.floor(diffTemps / (1000 * 60 * 60 * 24));
}

// =============================================================
// CALCUL DES JOURS CALENDAIRES INCLUSIFS
// =============================================================
function calculerJoursInclusifs(dateDebutStr, dateFinStr) {
    if (!dateDebutStr || !dateFinStr) return 0;
    const d1 = new Date(dateDebutStr);
    const d2 = new Date(dateFinStr);

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());

    const diffMs = utc2 - utc1;
    const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(1, diffJours + 1);
}

// =============================================================
// SALON DES P'TITES VICTOIRES
// =============================================================
function afficherParcours() {
    const jours = getJoursEcoules();

    const elJours = document.getElementById('victoires-jours');
    if (elJours) {
        elJours.textContent = `${jours} jour${jours > 1 ? 's' : ''} sans cigarette`;
    }

    const elCompteur = document.getElementById('victoires-compteur');
    if (elCompteur) {
        const nombre = observations.length;
        elCompteur.textContent = `${nombre} p'tite${nombre !== 1 ? 's' : ''} victoire${nombre !== 1 ? 's' : ''}`;
    }

    afficherObservations();
    if (!suggestionVictoireActuelle) {
    afficherNouvelleSuggestionVictoire();
}
}
function echapperHTML(texte) {
    const div = document.createElement('div');
    div.textContent = texte;
    return div.innerHTML;
}
function afficherObservations() {
    const conteneur = document.getElementById('liste-victoires');
    if (!conteneur) return;

    const victoires = [...observations]
        .sort((a, b) => new Date(b.dateConstat) - new Date(a.dateConstat));

    if (victoires.length === 0) {
        conteneur.innerHTML = `
            <p class="texte-secondaire" style="text-align:center; padding:14px 4px;">
                Ta première p'tite victoire n'attend que toi 🌸
            </p>
        `;
        return;
    }

    conteneur.innerHTML = victoires.map(v => {
        const date = v.dateConstat
            ? new Date(v.dateConstat).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            })
            : '';

        return `
    <div class="item-observation active" style="justify-content:space-between; margin-bottom:8px;">
        <div>
            <strong style="font-size:0.9rem;">🌸 ${echapperHTML(v.texte)}</strong>
            ${date ? `
                <p class="texte-secondaire" style="font-size:0.72rem; color:#ffb7c5; margin-top:4px;">
                    ${date}
                </p>
            ` : ''}
        </div>

        <button
            type="button"
            class="btn-suppr"
            onclick="supprimerVictoire('${v.id}')"
            aria-label="Supprimer cette victoire">
            🗑️
        </button>
    </div>
`;
    }).join('');
}

function ajouterVictoire() {
    const champ = document.getElementById('saisie-victoire');
    if (!champ) return;

    const texte = champ.value.trim();

    if (!texte) {
        alert("Écris d'abord ta p'tite victoire 🌸");
        return;
    }
const texteFormate =
    "Aujourd'hui, j'ai réalisé que " +
    texte.charAt(0).toLowerCase() +
    texte.slice(1);
    observations.push({
        id: `victoire_${Date.now()}`,
        texte: texteFormate,
        dateConstat: new Date().toISOString(),
        personnalise: true
    });

    localStorage.setItem('vt_observations', JSON.stringify(observations));

    champ.value = '';

    afficherParcours();

    if (typeof MyVapeUI !== 'undefined') {
        MyVapeUI.toast("P'tite victoire ajoutée 🌸");
    }

    if (typeof MyVapeBackup !== 'undefined') {
        MyVapeBackup.changed();
    }
}
function validerSuggestionVictoire() {
    if (!suggestionVictoireActuelle) {
        afficherNouvelleSuggestionVictoire();
        return;
    }

    const existeDeja = observations.some(
        o => o.texte === suggestionVictoireActuelle
    );

    if (!existeDeja) {
        observations.push({
            id: `victoire_${Date.now()}`,
            texte: suggestionVictoireActuelle,
            dateConstat: new Date().toISOString(),
            personnalise: false
        });

        localStorage.setItem(
            'vt_observations',
            JSON.stringify(observations)
        );
    }

    const maintenant = new Date();

    const dateLocale = [
        maintenant.getFullYear(),
        String(maintenant.getMonth() + 1).padStart(2, '0'),
        String(maintenant.getDate()).padStart(2, '0')
    ].join('-');

    dateVictoireQuotidienne = dateLocale;

    localStorage.setItem(
        'vt_victoire_quotidienne_date',
        dateVictoireQuotidienne
    );
suggestionVictoireActuelle = "";
    afficherParcours();

    if (typeof MyVapeBackup !== 'undefined') {
        MyVapeBackup.changed();
    }

    if (typeof MyVapeUI !== 'undefined') {
        MyVapeUI.toast("P'tite victoire du jour ajoutée 🌸");
    }
}


function passerSuggestionVictoire() {
    afficherNouvelleSuggestionVictoire();
}
function afficherNouvelleSuggestionVictoire() {
    const zone = document.getElementById('suggestion-victoire');
    const btnOui = document.getElementById('btn-suggestion-oui');
    const btnNon = document.getElementById('btn-suggestion-non');

    if (!zone) return;
    const maintenant = new Date();

const dateAujourdhui = [
    maintenant.getFullYear(),
    String(maintenant.getMonth() + 1).padStart(2, '0'),
    String(maintenant.getDate()).padStart(2, '0')
].join('-');

if (dateVictoireQuotidienne === dateAujourdhui) {
    suggestionVictoireActuelle = "";

    zone.innerHTML = `
        <strong>🌸 Celle-là, elle est à toi !</strong><br>
        <span class="texte-secondaire">
            Ta p'tite victoire du jour a rejoint ton Salon.<br>
            Reviens demain en découvrir une nouvelle ✨
        </span>
    `;

    if (btnOui) btnOui.style.display = 'none';
    if (btnNon) btnNon.style.display = 'none';

    return;
}

    const textesDejaValides = observations.map(o => o.texte);

    let suggestionsDisponibles = SUGGESTIONS_VICTOIRES.filter(
        suggestion =>
            !textesDejaValides.includes(suggestion) &&
            suggestion !== suggestionVictoireActuelle
    );

    if (suggestionsDisponibles.length === 0) {
        suggestionsDisponibles = SUGGESTIONS_VICTOIRES.filter(
            suggestion => !textesDejaValides.includes(suggestion)
        );
    }

    if (suggestionsDisponibles.length === 0) {
        suggestionVictoireActuelle = "";

        zone.textContent =
            "Tu as déjà reconnu toutes les p'tites victoires proposées ici. Et quelque chose me dit que tu en découvriras encore d'autres toi-même 🌸";

        if (btnOui) btnOui.style.display = 'none';
        if (btnNon) btnNon.style.display = 'none';

        return;
    }

    const index = Math.floor(
        Math.random() * suggestionsDisponibles.length
    );

    suggestionVictoireActuelle = suggestionsDisponibles[index];

    zone.textContent = suggestionVictoireActuelle;

    if (btnOui) btnOui.style.display = '';
    if (btnNon) btnNon.style.display = '';
}
function supprimerVictoire(id) {
    const victoire = observations.find(o => o.id === id);
    if (!victoire) return;

    const confirmation = confirm(
        "Supprimer cette p'tite victoire ? 🌸"
    );

    if (!confirmation) return;

    observations = observations.filter(o => o.id !== id);

    localStorage.setItem(
        'vt_observations',
        JSON.stringify(observations)
    );

    afficherParcours();

    if (typeof MyVapeBackup !== 'undefined') {
        MyVapeBackup.changed();
    }

    if (typeof MyVapeUI !== 'undefined') {
        MyVapeUI.toast("P'tite victoire supprimée");
    }
}

// =============================================================
// GESTION DU PROFIL UTILISATEUR
// =============================================================
function afficherProfil() {
    if (!configUser) return;

    if (document.getElementById('profil-prenom')) {
        document.getElementById('profil-prenom').value = configUser.prenom || '';
    }

    if (document.getElementById('profil-date-arret')) {
        document.getElementById('profil-date-arret').value = configUser.dateArret || '';
    }

    if (document.getElementById('profil-resume-tabac')) {
        document.getElementById('profil-resume-tabac').textContent = `${configUser.cigsJour || 15} cigs/jour`;
    }

    if (document.getElementById('profil-resume-prix')) {
        document.getElementById('profil-resume-prix').textContent = `${(configUser.prixPaquet || 12.5).toFixed(2)} € / paquet`;
    }

    if (document.getElementById('profil-nicotine-actuelle')) {
        if (configUser.vapote && configUser.nicotineActuelle !== undefined) {
            document.getElementById('profil-nicotine-actuelle').textContent = `${configUser.nicotineActuelle} mg/ml`;
        } else {
            document.getElementById('profil-nicotine-actuelle').textContent = '0 mg/ml (Non vapoteur)';
        }
    }

    const elProchainObj = document.getElementById('profil-prochain-objectif');
    if (elProchainObj) {
        const maintenant = new Date();
        const futurs = objectifs
            .filter(o => o.statut !== 'atteint' && new Date(o.date) >= maintenant)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (futurs.length > 0) {
            const pro = futurs[0];
            const dateFormatee = new Date(pro.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            elProchainObj.textContent = `${pro.titre} le ${dateFormatee}`;
        } else {
            elProchainObj.textContent = 'Aucun objectif futur';
        }
    }

    if (typeof MyVapePush !== 'undefined') MyVapePush.render();
}

function sauvegarderPrenomProfil() {
    const nouveauPrenom = document.getElementById('profil-prenom').value.trim();
    if (!nouveauPrenom) {
        alert('Veuillez entrer un prénom valide.');
        return;
    }
    if (!configUser) configUser = {};
    configUser.prenom = nouveauPrenom;
    localStorage.setItem('vt_config', JSON.stringify(configUser));
    mettreAJourTout();
    MyVapeUI.toast('Prénom enregistré');
}

function demanderChangementDateArret() {
    const nouvelleDate = document.getElementById('profil-date-arret').value;
    if (!nouvelleDate) {
        alert('Veuillez sélectionner une date d\'arrêt valide.');
        return;
    }

    const dateChoisie = new Date(nouvelleDate);
    const maintenant = new Date();

    if (dateChoisie > maintenant) {
        alert('La date d\'arrêt ne peut pas être située dans le futur.');
        return;
    }

    dateArretEnAttente = nouvelleDate;
    const modale = document.getElementById('modale-confirmation-date');
    if (modale) {
        modale.classList.remove('masque');
        modale.style.display = 'flex';
    }
}

function fermerModaleDate() {
    dateArretEnAttente = null;
    const modale = document.getElementById('modale-confirmation-date');
    if (modale) {
        modale.classList.add('masque');
        modale.style.display = 'none';
    }
    if (configUser && configUser.dateArret) {
        document.getElementById('profil-date-arret').value = configUser.dateArret;
    }
}

function validerChangementDateArret() {
    if (!dateArretEnAttente) return;
    if (!configUser) configUser = {};
    configUser.dateArret = dateArretEnAttente;
    localStorage.setItem('vt_config', JSON.stringify(configUser));
    fermerModaleDate();
    mettreAJourTout();
    alert('Date d\'arrêt mise à jour avec succès ! 🌸');
}

// =============================================================
// CALCUL DES ÉCONOMIES MENSUELLES ET GLOBALES
// =============================================================
function calculerEconomiePourMois(annee, moisIndex) {
    if (!configUser || !configUser.dateArret) return { tabac: 0, depenses: 0, nette: 0, jours: 0 };

    const dateArret = new Date(configUser.dateArret);
    const debutMois = new Date(annee, moisIndex, 1);
    const finMois = new Date(annee, moisIndex + 1, 0, 23, 59, 59, 999);
    const maintenant = new Date();

    if (finMois < dateArret) {
        return { tabac: 0, depenses: 0, nette: 0, jours: 0 };
    }

    let debutCalcul = debutMois;
    if (dateArret > debutMois) {
        debutCalcul = dateArret;
    }

    let finCalcul = finMois;
    if (maintenant < finMois) {
        finCalcul = maintenant;
    }

    if (finCalcul < debutCalcul) {
        return { tabac: 0, depenses: 0, nette: 0, jours: 0 };
    }

    const diffMs = Math.max(0, finCalcul - debutCalcul);
    const joursCalcul = diffMs / (1000 * 60 * 60 * 24);

    const cigsParJour = configUser.cigsJour || 15;
    const prixPaquet = configUser.prixPaquet || 12.5;
    const cigsParPaquet = configUser.cigsPaquet || 20;

    const cigsEvitees = joursCalcul * cigsParJour;
    const economieTabac = (cigsEvitees / cigsParPaquet) * prixPaquet;

    const depensesMois = depenses.filter(d => {
        const dDate = new Date(d.date);
        return dDate >= debutCalcul && dDate <= finCalcul;
    });

    const totalDepensesVape = depensesMois.reduce((acc, d) => acc + d.montant, 0);
    const economieNette = economieTabac - totalDepensesVape;

    return {
        tabac: economieTabac,
        depenses: totalDepensesVape,
        nette: economieNette,
        jours: Math.round(joursCalcul)
    };
}

function mettreAJourDashboard() {
    const jours = getJoursEcoules();
    const cigsParJour = configUser ? (configUser.cigsJour || 15) : 15;
    const prixPaquet = configUser ? (configUser.prixPaquet || 12.5) : 12.5;
    const cigsParPaquet = configUser ? (configUser.cigsPaquet || 20) : 20;

    const cigsEvitees = Math.floor(jours * cigsParJour);
    const economieBruteTotale = (cigsEvitees / cigsParPaquet) * prixPaquet;

    const totalDepensesVape = depenses.reduce((acc, d) => acc + d.montant, 0);
    const economieNetteTotale = economieBruteTotale - totalDepensesVape;

    if (document.getElementById('card-jours')) document.getElementById('card-jours').textContent = jours;
    if (document.getElementById('prenom-accueil')) {
        document.getElementById('prenom-accueil').textContent = (configUser && configUser.prenom) ? `Bravo ${configUser.prenom} !` : 'Jours d\'arrêt';
    }
    if (document.getElementById('card-cigs')) document.getElementById('card-cigs').textContent = cigsEvitees;
    
    if (document.getElementById('card-economies')) document.getElementById('card-economies').textContent = `${economieNetteTotale.toFixed(2)} €`;

    const maintenant = new Date();
    const ecoMois = calculerEconomiePourMois(maintenant.getFullYear(), maintenant.getMonth());
    const elCardMois = document.getElementById('card-economies-mois');
    if (elCardMois) {
        const signe = ecoMois.nette >= 0 ? '+' : '';
        elCardMois.textContent = `${signe} ${ecoMois.nette.toFixed(2)} € ce mois-ci`;
    }

    const cardNicotineVal = document.getElementById('card-nicotine-valeur');
    const cardNicotineObj = document.getElementById('card-nicotine-objectif');

 if (cardNicotineVal) {
    if (configUser && configUser.vapote && configUser.nicotineActuelle !== undefined) {
        cardNicotineVal.innerHTML = `
            <span class="nicotine-nombre">${configUser.nicotineActuelle}</span>
            <span class="nicotine-unite">mg/ml</span>
        `;
    } else {
        cardNicotineVal.innerHTML = `
            <span class="nicotine-nombre">0</span>
            <span class="nicotine-unite">mg/ml</span>
            <span class="nicotine-unite">(Non vapoteur)</span>
        `;
    }
}

    if (cardNicotineObj) {
        const objectifsFuturs = objectifs
            .filter(o => o.statut !== 'atteint' && new Date(o.date) >= maintenant)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (objectifsFuturs.length > 0) {
            const pro = objectifsFuturs[0];
            const dateFormatee = new Date(pro.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            cardNicotineObj.textContent = `${pro.titre} le ${dateFormatee}`;
        } else {
            cardNicotineObj.textContent = 'Aucun objectif futur';
        }
    }
}

function mettreAJourCerisierHD() {
    const jours = getJoursEcoules();
    const badge = document.getElementById('nom-stade-arbre');
    const conteneur = document.getElementById('conteneur-svg-arbre');

    let nomStade = '';
    let numStade = 1;

    if (jours <= 30) {
        nomStade = 'Stade 1 : Jeune pousse (0 à 1 mois) 🌿';
        numStade = 1;
    } else if (jours <= 90) {
        nomStade = 'Stade 2 : Petit arbuste (1 à 3 mois) 🪴';
        numStade = 2;
    } else if (jours <= 150) {
        nomStade = 'Stade 3 : Arbre vigoureux (3 à 5 mois) 🪵';
        numStade = 3;
    } else if (jours <= 240) {
        nomStade = 'Stade 4 : Premiers bourgeons (5 à 8 mois) 🌸';
        numStade = 4;
    } else {
        nomStade = 'Stade 5 : Cerisier majestueux (8 mois à 1 an+) 🌸✨';
        numStade = 5;
    }

    if (badge) badge.textContent = nomStade;

    if (conteneur) {
        const urlImage = `./arbre-stade-${numStade}.png`;
        conteneur.innerHTML = `
            <img src="${urlImage}" 
                 alt="${nomStade}" 
                 class="arbre-brise"
                 style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px; display: block;"
                 onerror="this.onerror=null; this.src='icon.png';">
        `;
    }

    genererParticules();
    if (typeof MyVapeUI !== 'undefined') MyVapeUI.observeStage(numStade);
}

function genererParticules() {
    const conteneur = document.getElementById('particules');
    if (!conteneur) return;
    conteneur.innerHTML = '';

    for (let i = 0; i < 12; i++) {
        const petale = document.createElement('div');
        petale.className = 'petale-lumineux';
        const taille = Math.random() * 8 + 6;
        petale.style.width = `${taille}px`;
        petale.style.height = `${taille}px`;
        petale.style.left = `${Math.random() * 100}%`;
        petale.style.animationDuration = `${Math.random() * 4 + 4}s`;
        petale.style.animationDelay = `${Math.random() * 3}s`;
        conteneur.appendChild(petale);
    }
}

// =============================================================
// MODE 1 : CALCULATEUR DIY CRÉATION
// =============================================================
function calculerDosagesDIY() {
    const volTotal = parseFloat(document.getElementById('recette-volume').value) || 0;
    const nicoVisee = parseFloat(document.getElementById('recette-nicotine').value) || 0;
    const pctArome = parseFloat(document.getElementById('recette-arome').value) || 0;
    const tauxBooster = parseFloat(document.getElementById('recette-taux-booster').value) || 20;

    const elArome = document.getElementById('calc-arome');
    const elBooster = document.getElementById('calc-booster');
    const elBase = document.getElementById('calc-base');

    if (volTotal <= 0 || nicoVisee < 0 || pctArome < 0 || pctArome >= 100 || tauxBooster <= 0) {
        if (elArome) elArome.textContent = "---";
        if (elBooster) elBooster.textContent = "---";
        if (elBase) elBase.textContent = "---";
        return { volTotal: 0, volArome: 0, volBooster: 0, volBase: 0, nbrFiolesBooster: 0 };
    }

    const volBooster = (volTotal * nicoVisee) / tauxBooster;
    const volArome = (volTotal * pctArome) / 100;
    const volBase = volTotal - volBooster - volArome;

    if (volBase < 0) {
        if (elArome) elArome.textContent = `${volArome.toFixed(2)} ml (${pctArome}%)`;
        if (elBase) {
            elBase.textContent = "Impossible (surdosage)";
            elBase.style.color = '#f85149';
        }
        return { volTotal, volArome, volBooster, volBase: 0, nbrFiolesBooster: 0 };
    }
function formatNombre(valeur, decimales = 2) {
    return parseFloat(valeur.toFixed(decimales)).toString();
}
    const nbrFiolesBooster = (volBooster / 10).toFixed(1);
    if (elArome) elArome.textContent = `${formatNombre(volArome)} ml (${formatNombre(pctArome)}%)`;
    if (elBooster) elBooster.textContent = `${formatNombre(volBooster)} ml (${formatNombre(parseFloat(nbrFiolesBooster), 1)} fiole${parseFloat(nbrFiolesBooster) > 1 ? 's' : ''})`;
    if (elBase) {
        elBase.textContent = `${formatNombre(volBase)} ml`;
        elBase.style.color = '#e6edf3';
    }

    return {
        volTotal: volTotal,
        volArome: volArome,
        volBooster: volBooster,
        volBase: volBase,
        nbrFiolesBooster: nbrFiolesBooster
    };
}

// =============================================================
// MODE 2 : CALCULATEUR D'AJUSTEMENT / DILUTION
// =============================================================
function calculerAjustementDIY() {
    const V0 = parseFloat(document.getElementById('ajust-vol-actuel').value) || 0;
    const VfVise = parseFloat(document.getElementById('ajust-volume-final-vise').value) || 0;
    const N0 = parseFloat(document.getElementById('ajust-nico-actuelle').value) || 0;
    const A0 = parseFloat(document.getElementById('ajust-arome-actuel').value) || 0;
    const N1 = parseFloat(document.getElementById('ajust-nico-visee').value) || 0;
    const A1 = parseFloat(document.getElementById('ajust-arome-pct').value) || 0;
    const Nb = parseFloat(document.getElementById('ajust-taux-booster').value) || 0;

    const elBase = document.getElementById('ajust-calc-base');
    const elBooster = document.getElementById('ajust-calc-booster');
    const elArome = document.getElementById('ajust-calc-arome');
    const elVolFinal = document.getElementById('ajust-calc-vol-final');

    function afficherErreur(message) {
        if (elBase) elBase.textContent = message;
        if (elBooster) elBooster.textContent = "---";
        if (elArome) elArome.textContent = "---";
        if (elVolFinal) elVolFinal.textContent = "---";
    }

    if (
        V0 <= 0 ||
        N0 < 0 ||
        N1 < 0 ||
        Nb <= 0 ||
        A0 < 0 || A0 >= 100 ||
        A1 < 0 || A1 >= 100
    ) {
        afficherErreur("Valeurs invalides");
        return;
    }

    const F0 = V0 * A0 / 100;

    let Vf = V0;
    let boosterAAjouter = 0;
    let aromeAAjouter = 0;
    let baseAAjouter = 0;
    // CAS PRIORITAIRE : un volume final précis est demandé
if (VfVise > 0) {
    if (VfVise < V0) {
        afficherErreur("Le volume final doit être supérieur au volume actuel");
        return;
    }

    Vf = VfVise;

    // Quantité de booster nécessaire pour atteindre le taux de nicotine visé
    boosterAAjouter = (N1 * Vf - N0 * V0) / Nb;

    // Quantité d'arôme nécessaire pour atteindre le pourcentage visé
    aromeAAjouter = (A1 * Vf / 100) - F0;

    // Tout ce qu'il reste à ajouter est de la base neutre
    baseAAjouter = Vf - V0 - boosterAAjouter - aromeAAjouter;

    if (
        boosterAAjouter < -0.001 ||
        aromeAAjouter < -0.001 ||
        baseAAjouter < -0.001
    ) {
        afficherErreur("Ajustement impossible avec ce volume final");
        return;
    }
}

// CAS 1 : on réduit la nicotine
else if (N1 < N0) {
        if (N1 === 0) {
            afficherErreur("Cible 0 mg impossible par simple dilution");
            return;
        }

        Vf = (V0 * N0) / N1;

        const ajoutTotal = Vf - V0;
        const F1 = Vf * A1 / 100;

        aromeAAjouter = F1 - F0;
        baseAAjouter = ajoutTotal - aromeAAjouter;

        if (aromeAAjouter < -0.001) {
            afficherErreur("Cible arôme trop basse");
            return;
        }

        if (baseAAjouter < -0.001) {
            afficherErreur("Ajustement impossible");
            return;
        }
    }

    // CAS 2 : on augmente la nicotine
    else if (N1 > N0) {
        if (N1 >= Nb) {
            afficherErreur("Booster trop faible pour cette cible");
            return;
        }

        const denominateur = 1 - (N1 / Nb) - (A1 / 100);
        const numerateur = V0 - (V0 * N0 / Nb) - F0;

        if (denominateur <= 0) {
            afficherErreur("Ajustement impossible");
            return;
        }

        Vf = numerateur / denominateur;

        boosterAAjouter = (N1 * Vf - N0 * V0) / Nb;
        aromeAAjouter = (A1 * Vf / 100) - F0;
        baseAAjouter = 0;

        if (boosterAAjouter < -0.001 || aromeAAjouter < -0.001) {
            afficherErreur("Ajustement impossible");
            return;
        }
    }

    // CAS 3 : nicotine identique
    else {
        if (A1 < A0) {
            afficherErreur("Impossible de retirer de l'arôme");
            return;
        }

        if (A1 === A0) {
            Vf = V0;
        } else {
            Vf = V0 * (100 - A0) / (100 - A1);
            aromeAAjouter = Vf - V0;
        }
    }

    // Évite les petits -0.00 dus aux arrondis JavaScript
    boosterAAjouter = Math.max(0, boosterAAjouter);
    aromeAAjouter = Math.max(0, aromeAAjouter);
    baseAAjouter = Math.max(0, baseAAjouter);

    function formatNombre(valeur, decimales = 2) {
    return parseFloat(valeur.toFixed(decimales)).toString();
}
    if (elBase) elBase.textContent = `${formatNombre(baseAAjouter)} ml`;
    if (elBooster) {
    const nbFioles = boosterAAjouter / 10;
    elBooster.textContent = `${formatNombre(boosterAAjouter)} ml (${formatNombre(nbFioles, 1)} fiole${nbFioles > 1 ? 's' : ''} de 10 ml)`;
}
    if (elArome) elArome.textContent = `${aromeAAjouter.toFixed(2)} ml`;
    if (elVolFinal) elVolFinal.textContent = `${formatNombre(Vf)} ml`;
}

function sauvegarderConfig() {
    if (!configUser) configUser = {};
    configUser.cigsJour = parseFloat(document.getElementById('cigs-jour').value) || 15;
    configUser.prixPaquet = parseFloat(document.getElementById('prix-paquet').value) || 12.5;
    configUser.cigsPaquet = parseFloat(document.getElementById('cigs-paquet').value) || 20;
    
    const estVapoteur = document.getElementById('config-vapote').value === 'oui';
    configUser.vapote = estVapoteur;
    configUser.nicotineActuelle = estVapoteur ? parseFloat(document.getElementById('config-nicotine').value || 0) : 0;

    localStorage.setItem('vt_config', JSON.stringify(configUser));
    mettreAJourTout();
    MyVapeUI.toast('Paramètres enregistrés');
}

function sauvegarderRecette() {
    const nomEl = document.getElementById('recette-nom');
    const nom = nomEl ? nomEl.value.trim() : '';

    if (!nom) {
        alert('Veuillez donner un nom à votre recette.');
        return;
    }

    const calcs = calculerDosagesDIY();
    const steepDaysInput = parseInt(document.getElementById('recette-steep-days')?.value || 0, 10);

    const nouvelleRecette = {
        id: Date.now().toString(),
        nom: nom,
        type: document.getElementById('recette-type')?.value || 'DIY',
        nicotine: parseFloat(document.getElementById('recette-nicotine')?.value) || 0,
        arome: parseFloat(document.getElementById('recette-arome')?.value) || 0,
        steepDays: Math.max(0, isNaN(steepDaysInput) ? 0 : steepDaysInput),
        volumeTotal: calcs ? calcs.volTotal : 50,
        volArome: calcs ? calcs.volArome : 0,
        volBooster: calcs ? calcs.volBooster : 0,
        nbrFioles: calcs ? calcs.nbrFiolesBooster : 0,
        volBase: calcs ? calcs.volBase : 0
    };

    recettes.unshift(nouvelleRecette);
    localStorage.setItem('vt_recettes', JSON.stringify(recettes));

    document.getElementById('recette-nom').value = '';
    document.getElementById('form-recette').classList.add('masque');
    mettreAJourTout();
    if (typeof MyVapeUI !== 'undefined') MyVapeUI.toast('Recette enregistrée');
}

function sauvegarderFlacon() {
    const nomEl = document.getElementById('nom');
    const nom = nomEl ? nomEl.value.trim() : '';
    if (!nom) {
        alert('Veuillez renseigner le nom du liquide.');
        return;
    }

    const dateFabriqueStr = document.getElementById('date-ouverture').value;
    const dateFabrique = dateFabriqueStr ? new Date(dateFabriqueStr) : new Date();
    const steepDays = Math.max(0, parseInt(document.getElementById('flacon-steep-days').value || 0, 10));
    let dateFinSteep = null;

    if (steepDays > 0) {
        dateFinSteep = new Date(dateFabrique.getTime() + (steepDays * 24 * 60 * 60 * 1000)).toISOString();
    }

    const nouveauFlacon = {
        id: Date.now().toString(),
        nom: nom,
        categorieSaveur: document.getElementById('categorie-saveur')?.value || 'autre',
        type: document.getElementById('type').value,
        volume: parseFloat(document.getElementById('volume').value) || 0,
        nicotine: parseFloat(document.getElementById('nicotine').value) || 0,
        arome: parseFloat(document.getElementById('arome').value) || 0,
        preparedAt: dateFabrique.toISOString(),
        startedAt: null,
dateOuverture: null,
        finishedAt: null,
        steepDays: steepDays,
        steepReadyAt: dateFinSteep,
        actif: false,
        termine: false
    };

    flacons.unshift(nouveauFlacon);
    localStorage.setItem('vt_flacons', JSON.stringify(flacons));


    document.getElementById('nom').value = '';
    mettreAJourTout();
    afficherEcran('ecran-accueil');
    if (typeof MyVapeUI !== 'undefined') MyVapeUI.toast('Flacon ajouté');
}

function sauvegarderFlaconDirect() {
    const nomEl = document.getElementById('nom-direct');
    const nom = nomEl ? nomEl.value.trim() : '';
    if (!nom) {
        alert('Veuillez renseigner le nom du liquide.');
        return;
    }

    const dateDebutStr = document.getElementById('date-debut-direct').value;
    const dateDebut = dateDebutStr ? new Date(dateDebutStr) : new Date();

    const nouveauFlaconActif = {
        id: Date.now().toString(),
        nom: nom,
        categorieSaveur: document.getElementById('categorie-saveur-direct')?.value || 'autre',
        type: document.getElementById('type-direct').value,
        volume: parseFloat(document.getElementById('volume-direct').value) || 0,
        nicotine: parseFloat(document.getElementById('nicotine-direct').value) || 0,
        arome: 0,
        preparedAt: dateDebut.toISOString(),
        startedAt: dateDebut.toISOString(),
        dateOuverture: dateDebut.toISOString(),
        finishedAt: null,
        steepDays: 0,
        steepReadyAt: null,
        actif: false,
        termine: false
    };

    flacons.unshift(nouveauFlaconActif);
    localStorage.setItem('vt_flacons', JSON.stringify(flacons));

    document.getElementById('nom-direct').value = '';
    mettreAJourTout();
    afficherEcran('ecran-accueil');
    if (typeof MyVapeUI !== 'undefined') MyVapeUI.toast('Flacon ajouté');
}

function sauvegarderDepense() {
    const montant = parseFloat(document.getElementById('dep-montant').value) || 0;
    if (montant <= 0) {
        alert('Veuillez entrer un montant valide.');
        return;
    }
    const nomSaisi = document.getElementById('dep-nom').value.trim();
    const nouvelleDepense = {
        id: Date.now().toString(),
        categorie: document.getElementById('dep-cat').value,
        nom: nomSaisi || document.getElementById('dep-cat').value,
        montant: montant,
        date: new Date().toISOString()
    };
    depenses.unshift(nouvelleDepense);
    localStorage.setItem('vt_depenses', JSON.stringify(depenses));
    
    document.getElementById('dep-montant').value = '';
    document.getElementById('dep-nom').value = '';
    document.getElementById('form-depense').classList.add('masque');
    mettreAJourTout();
    if (typeof MyVapeUI !== 'undefined') MyVapeUI.toast('Dépense enregistrée');
}

function sauvegarderObjectif() {
    const valStr = document.getElementById('obj-nicotine-valeur').value;
    const date = document.getElementById('obj-date').value;

    if (valStr === '' || !date) {
        alert('Veuillez renseigner le dosage de nicotine cible et la date.');
        return;
    }

    const valNico = parseFloat(valStr);
    if (!Number.isFinite(valNico) || valNico < 0) { alert('Choisis un dosage positif ou nul.'); return; }
    const nouvelObjectif = {
        id: Date.now().toString(),
        titre: `${valNico} mg/ml`,
        date: date
    };

    objectifs.unshift(nouvelObjectif);
    localStorage.setItem('vt_objectifs', JSON.stringify(objectifs));
    
    document.getElementById('obj-nicotine-valeur').value = '';
    document.getElementById('obj-date').value = '';
    document.getElementById('form-objectif').classList.add('masque');
    mettreAJourTout();
    if (typeof MyVapeUI !== 'undefined') MyVapeUI.toast('Objectif enregistré');
}

// =============================================================
// GESTION DES NOTIFICATIONS
// =============================================================
// =============================================================
// AFFICHAGE ACCUEIL & RÉSERVE
// =============================================================
// Donnée indépendante des flacons : aucune migration des données existantes.
function afficherDernierChangementResistance() {
    const libelle = document.getElementById('date-resistance');
    if (!libelle) return;

    const actif = flacons.find(f => f.actif);

    if (!actif) {
        libelle.textContent = 'Aucun All Day défini';
        return;
    }

    let valeur = actif.dateResistance || null;

    // Compatibilité avec l'ancien système :
    // l'ancienne date globale est attribuée au All Day actuel.
    if (!valeur) {
        try {
            const ancienneDate = localStorage.getItem('vt_date_resistance');

            if (ancienneDate && /^\d{4}-\d{2}-\d{2}$/.test(ancienneDate)) {
                valeur = ancienneDate;
                actif.dateResistance = ancienneDate;

                localStorage.setItem('vt_flacons', JSON.stringify(flacons));
            }
        } catch (err) {
            console.warn('Migration de la date de résistance impossible', err);
        }
    }

    if (!valeur) {
        libelle.textContent = '🔧 Aucun changement de résistance enregistré';
        return;
    }

    const date = new Date(`${valeur}T12:00:00`);

    libelle.textContent = !isNaN(date.getTime())
    ? `🔧 Résistance changée le ${date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })}`
    : '🔧 Aucun changement de résistance enregistré';
}

function changerResistance(idFlacon = null) {
    const f = idFlacon
        ? flacons.find(item => item.id === idFlacon)
        : flacons.find(item => item.actif);

    if (!f || f.termine || !f.startedAt) {
        if (typeof MyVapeUI !== 'undefined') {
            MyVapeUI.toast('Aucun flacon entamé sélectionné');
        }
        return;
    }

    const maintenant = new Date();

    // Conserver le jour local du changement.
    const date = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}-${String(maintenant.getDate()).padStart(2, '0')}`;

    f.dateResistance = date;

    try {
        localStorage.setItem('vt_flacons', JSON.stringify(flacons));
    } catch (err) {
        alert('Le changement de résistance n’a pas pu être enregistré. Veuillez réessayer.');
        return;
    }

    afficherDernierChangementResistance();
    afficherFlaconsEntames();

    if (typeof MyVapeUI !== 'undefined') {
        MyVapeUI.toast(`Résistance de ${f.nom} enregistrée 🌸`);
    }

    if (typeof MyVapeBackup !== 'undefined') {
        MyVapeBackup.changed();
    }
}

function afficherFlaconActif() {
    const actif = flacons.find(f => f.actif);
    const btnTerminer = document.getElementById('btn-terminer');
    const sceauAllDay = document.getElementById('sceau-all-day');

if (sceauAllDay) {
    sceauAllDay.style.display = actif ? 'block' : 'none';
}

    if (actif) {
        if (document.getElementById('nom-liquide')) document.getElementById('nom-liquide').textContent = `💨 ${actif.nom}`;
        if (document.getElementById('details-nicotine')) document.getElementById('details-nicotine').textContent = `Nicotine : ${actif.nicotine} mg/ml | Type : ${actif.type}`;
        
        const dateDebut = actif.startedAt || actif.dateOuverture || actif.preparedAt;
        const dateOuv = new Date(dateDebut);
        const dateFormatee = dateOuv.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        if (document.getElementById('details-flacon')) {
            document.getElementById('details-flacon').textContent = `Entamé le ${dateFormatee} (${actif.volume} ml)`;
        }
        const zoneCategorie = document.getElementById('categorie-saveur-actif');

if (zoneCategorie) {
    if (!actif.categorieSaveur) {
        zoneCategorie.innerHTML = `
            <label class="texte-secondaire" for="categorie-actif">Type de saveur</label>
            <select id="categorie-actif" onchange="definirCategorieSaveurFlacon('${actif.id}', this.value)">
                <option value="" selected disabled>Choisir...</option>
                <option value="fruite">🍓 Fruité</option>
                <option value="gourmand">🍰 Gourmand</option>
                <option value="classic">🍂 Classic</option>
                <option value="menthe">🌿 Menthe / Frais</option>
                <option value="boisson">🥤 Boisson</option>
                <option value="autre">✨ Autre</option>
            </select>
        `;
    } else {
        zoneCategorie.replaceChildren();
    }
}
        if (btnTerminer) btnTerminer.style.display = 'block';
    } else {
        if (document.getElementById('nom-liquide')) document.getElementById('nom-liquide').textContent = 'Aucun flacon en cours';
        if (document.getElementById('details-nicotine')) document.getElementById('details-nicotine').textContent = 'Sélectionne ou entame un flacon prêt ci-dessous.';
        if (document.getElementById('details-flacon')) document.getElementById('details-flacon').textContent = '';
        if (document.getElementById('categorie-saveur-actif')) document.getElementById('categorie-saveur-actif').replaceChildren();
        if (btnTerminer) btnTerminer.style.display = 'none';
    }
}

function afficherFlaconsEntames() {
    const conteneur = document.getElementById('liste-flacons-entames');
    if (!conteneur) return;

    const entames = flacons.filter(f => !f.termine && f.startedAt);

    if (entames.length === 0) {
        conteneur.innerHTML = '<p class="texte-vide">Aucun flacon entamé.</p>';
        return;
    }

    conteneur.innerHTML = entames.map(f => {
        const dateDebut = new Date(f.startedAt);
        const dateFormatee = dateDebut.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        return `
            <div class="carte" style="margin-top:10px; padding:12px;">
                <strong>${echapperHTML(f.nom)}</strong>
                <p class="texte-secondaire" style="margin-top:4px;">
                    ${f.nicotine} mg/ml • ${f.volume} ml • Entamé le ${dateFormatee}
                </p>
                <p class="texte-secondaire" style="margin-top:4px;">
    ${f.dateResistance
        ? `🔧 Résistance changée le ${new Date(`${f.dateResistance}T12:00:00`).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })}`
        : '🔧 Aucun changement de résistance enregistré'
    }
</p>

                ${f.actif
                    ? `<span style="color:#e8c85a; font-weight:700;">✦ ALL DAY</span>`
                    : `<button type="button"
                         class="btn-secondaire"
                         style="width:auto; padding:6px 12px; font-size:0.8rem; margin-top:8px;"
                         onclick="definirCommeAllDay('${f.id}')">
                         Définir comme All Day
                       </button>
                <button type="button"
    class="btn-secondaire"
    style="width:auto; padding:6px 12px; font-size:0.8rem; margin-top:8px;"
    onclick="changerResistance('${f.id}')">
    Changer ma résistance
</button>
<button type="button"
    class="btn-secondaire"
    style="width:auto; padding:6px 12px; font-size:0.8rem; margin-top:8px;"
    onclick="terminerFlacon('${f.id}')">
    Terminer ce flacon 🏁
</button>`
                }
            </div>
        `;
    }).join('');
}

function afficherReserveEtMaturation() {
    const conteneur = document.getElementById('liste-flacons-reserve');
    if (!conteneur) return;

    const reserve = flacons.filter(f => !f.termine && !f.startedAt);

    if (reserve.length === 0) {
        conteneur.innerHTML = '<p class="texte-vide">Aucun flacon en réserve ou en maturation.</p>';
        return;
    }

    const maintenant = new Date().getTime();

    conteneur.innerHTML = reserve.map(f => {
        const steepDays = parseFloat(f.steepDays) || 0;
        const dateFinSteep = f.steepReadyAt ? new Date(f.steepReadyAt).getTime() : 0;
        const estEnMaturation = steepDays > 0 && dateFinSteep > 0 && maintenant < dateFinSteep;

        let moduleVisuel = '';

        if (estEnMaturation) {
            const tempsEcouleMs = maintenant - new Date(f.preparedAt).getTime();
            const tempsTotalMs = dateFinSteep - new Date(f.preparedAt).getTime();
            const pct = Number.isFinite(tempsEcouleMs / tempsTotalMs) && tempsTotalMs > 0 ? Math.min(100, Math.max(0, (tempsEcouleMs / tempsTotalMs) * 100)) : 0;

            const resteMs = dateFinSteep - maintenant;
            const resteJours = Math.floor(resteMs / (1000 * 60 * 60 * 24));
            const resteHeures = Math.floor((resteMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const joursEcoules = Math.floor(tempsEcouleMs / (1000 * 60 * 60 * 24));

            let texteReste = `Encore ${resteJours}j ${resteHeures}h`;
            if (resteJours === 0 && resteHeures === 0) texteReste = "Prêt dans quelques minutes !";

            moduleVisuel = `
                <div class="box-steep-live">
                    <div class="steep-entete">
                        <span class="badge-steep">En maturation</span>
                        <span class="texte-steep-compteur">${joursEcoules} / ${steepDays} jours</span>
                    </div>
                    <div class="barre-steep-fond" role="progressbar" aria-label="Maturation du flacon" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}">
                        <div class="barre-steep-progression" style="width: ${pct}%;"></div>
                    </div>
                    <p class="steep-temps-restant">${texteReste}</p>
                </div>
            `;
        } else {
            moduleVisuel = `
                <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span class="badge-steep pret">🌸 Prêt à savourer</span>
                    <button type="button" class="btn-primaire" style="width:auto; padding:6px 14px; font-size:0.8rem;" onclick="utiliserCeFlacon('${f.id}')">
                        Utiliser ce flacon 💨
                    </button>
                </div>
            `;
        }

        return `
            <div class="carte">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${typeof MyVapeUI !== 'undefined' ? MyVapeUI.bottleIcon(f) + ' ' : ''}${f.nom} (${f.nicotine} mg)</strong>
                    <button type="button" class="btn-suppr" onclick="supprimerFlacon('${f.id}')">🗑️</button>
                </div>
                <p class="texte-secondaire">Préparé le ${new Date(f.preparedAt || f.dateOuverture).toLocaleDateString('fr-FR')} (${f.volume} ml)</p>
                ${!f.categorieSaveur ? `
    <div style="margin-top:8px;">
        <label class="texte-secondaire" for="categorie-${f.id}">Type de saveur</label>
        <select id="categorie-${f.id}" onchange="definirCategorieSaveurFlacon('${f.id}', this.value)">
            <option value="" selected disabled>Choisir...</option>
            <option value="fruite">🍓 Fruité</option>
            <option value="gourmand">🍰 Gourmand</option>
            <option value="classic">🍂 Classic</option>
            <option value="menthe">🌿 Menthe / Frais</option>
            <option value="boisson">🥤 Boisson</option>
            <option value="autre">✨ Autre</option>
        </select>
    </div>
` : ''}
                ${moduleVisuel}
            </div>
        `;
    }).join('');
}
function definirCategorieSaveurFlacon(id, categorie) {
    const flacon = flacons.find(f => f.id === id);
    if (!flacon) return;

    flacon.categorieSaveur = categorie;
    localStorage.setItem('vt_flacons', JSON.stringify(flacons));
    mettreAJourTout();
}

function utiliserCeFlacon(id) {
    const f = flacons.find(item => item.id === id);

    if (f) {
        const maintenantIso = new Date().toISOString();

        // Le flacon devient entamé sans modifier les autres flacons entamés.
        f.startedAt = f.startedAt || maintenantIso;
        f.dateOuverture = f.startedAt;

        localStorage.setItem('vt_flacons', JSON.stringify(flacons));
        mettreAJourTout();
    }
}

function definirCommeAllDay(id) {
    const f = flacons.find(item => item.id === id);

    if (!f || f.termine || !f.startedAt) return;

    // Un seul All Day à la fois
    flacons.forEach(item => item.actif = false);
    f.actif = true;

    localStorage.setItem('vt_flacons', JSON.stringify(flacons));
    mettreAJourTout();

    if (typeof MyVapeUI !== 'undefined') {
        MyVapeUI.toast(`${f.nom} est maintenant ton All Day ✨`);
    }

    if (typeof MyVapeBackup !== 'undefined') {
        MyVapeBackup.changed();
    }
}

function terminerFlacon(id) {
    const f = flacons.find(item => item.id === id);

    if (!f || f.termine || !f.startedAt) return;

    const maintenantIso = new Date().toISOString();

    f.actif = false;
    f.termine = true;
    f.finishedAt = maintenantIso;
    f.dateFermeture = maintenantIso;

    localStorage.setItem('vt_flacons', JSON.stringify(flacons));
    mettreAJourTout();

    if (typeof MyVapeUI !== 'undefined') {
        MyVapeUI.toast(`${f.nom} est terminé 🏁`);
    }

    if (typeof MyVapeBackup !== 'undefined') {
        MyVapeBackup.changed();
    }
}

function afficherRecettes() {
    const conteneur = document.getElementById('liste-recettes');
    if (!conteneur) return;
    if (recettes.length === 0) {
        conteneur.innerHTML = '<p class="texte-vide">Aucune recette DIY enregistrée.</p>';
        return;
    }

    conteneur.innerHTML = recettes.map(r => `
        <div class="carte">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>🧪 ${r.nom}</strong>
                <button type="button" class="btn-suppr" onclick="supprimerRecette('${r.id}')">🗑️</button>
            </div>
            <p class="texte-secondaire" style="margin-top:4px;">
                <strong>Volume Total : ${r.volumeTotal || 50} ml</strong> | Nicotine : ${r.nicotine} mg/ml
                ${r.steepDays ? ' | Steep : ' + r.steepDays + 'j' : ''}
            </p>
            <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 8px; margin-top: 8px; font-size: 0.8rem;">
                <div style="display:flex; justify-content:space-between;"><span>🧪 Concentré (${r.arome}%) :</span> <strong>${(r.volArome || 0).toFixed(1)} ml</strong></div>
                <div style="display:flex; justify-content:space-between; margin: 3px 0;"><span>⚡ Booster Nicotine :</span> <strong>${(r.volBooster || 0).toFixed(1)} ml (${r.nbrFioles || 0} fioles)</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>💧 Base Neutre :</span> <strong>${(r.volBase || 0).toFixed(1)} ml</strong></div>
            </div>
        </div>
    `).join('');
}

function remplirSelectRecettes() {
    const selects = ['select-recette', 'select-recette-directe'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">-- Saisie libre --</option>';
        recettes.forEach(r => {
            select.innerHTML += `<option value="${r.id}">${r.nom} (${r.volumeTotal}ml - ${r.nicotine}mg${r.steepDays ? ' - ' + r.steepDays + 'j steep' : ''})</option>`;
        });
    });
}

function supprimerRecette(id) {
    recettes = recettes.filter(r => r.id !== id);
    localStorage.setItem('vt_recettes', JSON.stringify(recettes));
    mettreAJourTout();
}

function afficherHistoriqueFlacons() {
    const conteneur = document.getElementById('liste-historique');
    if (!conteneur) return;
    const termines = flacons.filter(f => f.termine);

    if (termines.length === 0) {
        conteneur.innerHTML = '<p class="texte-vide">Aucun flacon terminé pour le moment.</p>';
        return;
    }

    conteneur.innerHTML = termines.map(f => {
        const dateDebutStr = f.startedAt || f.dateOuverture;
        const dateFinStr = f.finishedAt || f.dateFermeture;

        let detailsPeriode = '';

        if (dateDebutStr && dateFinStr) {
            const dateDebFmt = new Date(dateDebutStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const dateFinFmt = new Date(dateFinStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const joursConso = calculerJoursInclusifs(dateDebutStr, dateFinStr);
            
            const volume = parseFloat(f.volume) || 0;
            const moyenneMlJour = (volume / joursConso).toFixed(1);

            detailsPeriode = `
                <p class="texte-secondaire" style="margin-top:2px;">
                    ${volume} ml • Du ${dateDebFmt} au ${dateFinFmt} (${joursConso}j)
                </p>
                <p class="texte-secondaire" style="color:var(--rose-sakura); font-weight:600; margin-top:2px;">
                    Moyenne : ${moyenneMlJour} ml/jour
                </p>
            `;
        } else if (dateFinStr) {
            const dateFinFmt = new Date(dateFinStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            detailsPeriode = `<p class="texte-secondaire" style="margin-top:2px;">Terminé le ${dateFinFmt} (${f.volume} ml)</p>`;
        } else {
            const datePrec = new Date(f.preparedAt || f.dateOuverture).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            detailsPeriode = `<p class="texte-secondaire" style="margin-top:2px;">Terminé le ${datePrec} (${f.volume} ml)</p>`;
        }

        return `
            <div class="carte">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>🏁 ${f.nom} (${f.nicotine} mg)</strong>
                    <button type="button" class="btn-suppr" onclick="supprimerFlacon('${f.id}')">🗑️</button>
                </div>
                ${detailsPeriode}
            </div>
        `;
    }).join('');
}

function supprimerFlacon(id) {
    flacons = flacons.filter(f => f.id !== id);
    localStorage.setItem('vt_flacons', JSON.stringify(flacons));
    mettreAJourTout();
}

function afficherFinances() {
    const jours = getJoursEcoules();
    const cigsParJour = configUser ? (configUser.cigsJour || 15) : 15;
    const prixPaquet = configUser ? (configUser.prixPaquet || 12.5) : 12.5;
    const cigsParPaquet = configUser ? (configUser.cigsPaquet || 20) : 20;

    const tabacEvite = ((jours * cigsParJour) / cigsParPaquet) * prixPaquet;
    const totalDepenses = depenses.reduce((acc, d) => acc + d.montant, 0);
    const economieNette = tabacEvite - totalDepenses;

    if (document.getElementById('tabac-evite-total')) document.getElementById('tabac-evite-total').textContent = `${tabacEvite.toFixed(2)} €`;
    if (document.getElementById('dépenses-vape-total')) document.getElementById('dépenses-vape-total').textContent = `${totalDepenses.toFixed(2)} €`;
    if (document.getElementById('economie-nette-detail')) document.getElementById('economie-nette-detail').textContent = `${economieNette.toFixed(2)} €`;

    const maintenant = new Date();
    const ecoMois = calculerEconomiePourMois(maintenant.getFullYear(), maintenant.getMonth());
    const nomMoisLong = maintenant.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    if (document.getElementById('titre-mois-actuel')) {
        document.getElementById('titre-mois-actuel').textContent = `Bilan de ${nomMoisLong.charAt(0).toUpperCase() + nomMoisLong.slice(1)} (en cours)`;
    }
    if (document.getElementById('tabac-evite-mois')) document.getElementById('tabac-evite-mois').textContent = `${ecoMois.tabac.toFixed(2)} €`;
    if (document.getElementById('depenses-vape-mois')) document.getElementById('depenses-vape-mois').textContent = `${ecoMois.depenses.toFixed(2)} €`;
    if (document.getElementById('economie-nette-mois')) {
        const elNette = document.getElementById('economie-nette-mois');
        const signe = ecoMois.nette >= 0 ? '+' : '';
        elNette.textContent = `${signe}${ecoMois.nette.toFixed(2)} €`;
        elNette.style.color = ecoMois.nette >= 0 ? '#3fb950' : '#f85149';
    }

    afficherDepensesMensuelles();

    afficherHistoriqueMensuel();
}

// Regroupement à l'affichage uniquement : conserver les achats et leurs dates.
function regrouperDepensesParMois(achats) {
    const groupes = new Map();
    achats.forEach(achat => {
        const date = new Date(achat.date);
        const valide = !isNaN(date.getTime());
        const cle = valide ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : 'sans-date';
        if (!groupes.has(cle)) {
            const nom = valide ? date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Date non renseignée';
            groupes.set(cle, { cle, nom: nom.charAt(0).toUpperCase() + nom.slice(1), total: 0, achats: [] });
        }
        const groupe = groupes.get(cle);
        groupe.total += achat.montant;
        groupe.achats.push(achat);
    });
    return [...groupes.values()].sort((a, b) => {
        if (a.cle === 'sans-date') return 1;
        if (b.cle === 'sans-date') return -1;
        return b.cle.localeCompare(a.cle);
    }).map(groupe => ({ ...groupe, achats: groupe.achats.sort((a, b) => new Date(b.date) - new Date(a.date)) }));
}

function afficherDepensesMensuelles() {
    const conteneur = document.getElementById('liste-depenses');
    if (!conteneur) return;
    const moisOuverts = new Set([...conteneur.querySelectorAll('details[open]')].map(el => el.dataset.mois));
    conteneur.replaceChildren();
    if (depenses.length === 0) {
        conteneur.innerHTML = '<p class="texte-vide">Aucune dépense enregistrée.</p>';
        return;
    }
    const euros = montant => montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
    regrouperDepensesParMois(depenses).forEach(mois => {
        const carte = document.createElement('details');
        carte.className = 'carte depenses-mois';
        carte.dataset.mois = mois.cle;
        carte.open = moisOuverts.has(mois.cle);
        const resume = document.createElement('summary');
        const nom = document.createElement('strong');
        nom.textContent = mois.nom;
        const total = document.createElement('span');
        total.className = 'depenses-total';
        total.textContent = euros(mois.total);
        const nombre = document.createElement('span');
        nombre.className = 'texte-secondaire depenses-nombre';
        nombre.textContent = `${mois.achats.length} achat${mois.achats.length > 1 ? 's' : ''}`;
        resume.append(nom, total, nombre);
        carte.appendChild(resume);
        mois.achats.forEach(achat => {
            const ligne = document.createElement('div');
            ligne.className = 'depense-ligne';
            const infos = document.createElement('div');
            const titre = document.createElement('strong');
            titre.textContent = achat.nom || achat.categorie;
            const detail = document.createElement('p');
            detail.className = 'texte-secondaire';
            const date = new Date(achat.date);
            detail.textContent = `${isNaN(date.getTime()) ? 'Date non renseignée' : date.toLocaleDateString('fr-FR')} · ${achat.categorie}`;
            infos.append(titre, detail);
            const actions = document.createElement('div');
            actions.className = 'depense-actions';
            const montant = document.createElement('span');
            montant.className = 'depenses-total';
            montant.textContent = euros(achat.montant);
            const supprimer = document.createElement('button');
            supprimer.type = 'button';
            supprimer.className = 'btn-suppr';
            supprimer.textContent = '🗑️';
            supprimer.setAttribute('aria-label', `Supprimer ${achat.nom || achat.categorie}`);
            supprimer.onclick = () => supprimerDepense(achat.id);
            actions.append(montant, supprimer);
            ligne.append(infos, actions);
            carte.appendChild(ligne);
        });
        conteneur.appendChild(carte);
    });
}

function afficherHistoriqueMensuel() {
    const conteneur = document.getElementById('liste-historique-mensuel');
    if (!conteneur || !configUser || !configUser.dateArret) return;

    const dateArret = new Date(configUser.dateArret);
    const maintenant = new Date();

    let anneeCourante = dateArret.getFullYear();
    let moisCourant = dateArret.getMonth();

    const moisCumules = [];

    while (
        anneeCourante < maintenant.getFullYear() ||
        (anneeCourante === maintenant.getFullYear() && moisCourant <= maintenant.getMonth())
    ) {
        const res = calculerEconomiePourMois(anneeCourante, moisCourant);
        const dateMois = new Date(anneeCourante, moisCourant, 1);
        const nomMois = dateMois.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        const estMoisActuel = (anneeCourante === maintenant.getFullYear() && moisCourant === maintenant.getMonth());

        moisCumules.unshift({
            nom: nomMois.charAt(0).toUpperCase() + nomMois.slice(1),
            donnees: res,
            estActuel: estMoisActuel
        });

        moisCourant++;
        if (moisCourant > 11) {
            moisCourant = 0;
            anneeCourante++;
        }
    }

    conteneur.innerHTML = moisCumules.map(m => {
        const couleurScore = m.donnees.nette >= 0 ? '#3fb950' : '#f85149';
        const signe = m.donnees.nette >= 0 ? '+' : '';
        return `
            <div class="carte" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${m.nom} ${m.estActuel ? '<span style="font-size:0.75rem; color:#eab308; font-weight:normal;">(en cours)</span>' : ''}</strong>
                    <p class="texte-secondaire">Tabac : ${m.donnees.tabac.toFixed(2)} € | Vape : ${m.donnees.depenses.toFixed(2)} €</p>
                </div>
                <span style="color:${couleurScore}; font-weight:bold; font-size:1.05rem;">
                    ${signe}${m.donnees.nette.toFixed(2)} €
                </span>
            </div>
        `;
    }).join('');
}

function supprimerDepense(id) {
    depenses = depenses.filter(d => d.id !== id);
    localStorage.setItem('vt_depenses', JSON.stringify(depenses));
    mettreAJourTout();
}

function afficherObjectifs() {
    const conteneur = document.getElementById('liste-objectifs');
    if (!conteneur) return;
    if (objectifs.length === 0) {
        conteneur.innerHTML = '<p class="texte-vide">Aucun objectif fixé.</p>';
        return;
    }

    conteneur.innerHTML = objectifs.map(o => `
        <div class="carte item-objectif" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>🎯 Nicotine : ${o.titre}</strong>
                <p class="texte-secondaire">Date cible : ${new Date(o.date).toLocaleDateString('fr-FR')}</p>
            </div>
            <button type="button" class="btn-suppr" onclick="supprimerObjectif('${o.id}')">🗑️</button>
        </div>
    `).join('');
}

function supprimerObjectif(id) {
    objectifs = objectifs.filter(o => o.id !== id);
    localStorage.setItem('vt_objectifs', JSON.stringify(objectifs));
    mettreAJourTout();
}

function afficherEcran(idEcran) {
    if (idEcran === 'ecran-accueil' && !configUser?.dateArret) idEcran = 'ecran-onboarding';
    if (idEcran === 'ecran-profil') {
        document.querySelectorAll('#ecran-profil > .carte:not(.backup-card)').forEach(card => card.hidden = !configUser?.dateArret);
        afficherProfil();
    }
    if (idEcran === 'ecran-accueil' && typeof MyVapeUI !== 'undefined') setTimeout(() => MyVapeUI.celebrate(), 0);
    document.querySelectorAll('.ecran').forEach(e => e.classList.add('masque'));
    const ecranCible = document.getElementById(idEcran);
    if (ecranCible) ecranCible.classList.remove('masque');
    if (idEcran === 'ecran-sante') afficherParcours();

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('actif'));
    const navAssociee = document.getElementById(`nav-${idEcran.replace('ecran-', '')}`);
    if (navAssociee) navAssociee.classList.add('actif');
}
const ECRANS_SWIPE = [
    'ecran-accueil',
    'ecran-recettes',
    'ecran-sante',
    'ecran-finances',
    'ecran-objectifs'
];

let swipeStartX = 0;
let swipeStartY = 0;

function jouerFumeeSwipe(direction) {
    const fumee = document.createElement('div');
    fumee.className = `swipe-vapor ${direction}`;

    document.body.appendChild(fumee);

    setTimeout(() => {
        fumee.remove();
    }, 500);
}
function configurerSwipeNavigation() {
    const zone = document.body;

    zone.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;

        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
    }, { passive: true });

    zone.addEventListener('touchend', (e) => {
        if (!e.changedTouches.length) return;

        const deltaX = e.changedTouches[0].clientX - swipeStartX;
        const deltaY = e.changedTouches[0].clientY - swipeStartY;

        // On ignore les petits mouvements et les gestes surtout verticaux
        if (
    Math.abs(deltaX) < 60 ||
    Math.abs(deltaX) < Math.abs(deltaY) * 1.5
) return;

        // On ne swipe que depuis l'un des 5 écrans principaux
        const ecranActuel = ECRANS_SWIPE.find(id => {
            const ecran = document.getElementById(id);
            return ecran && !ecran.classList.contains('masque');
        });

        if (!ecranActuel) return;

        const indexActuel = ECRANS_SWIPE.indexOf(ecranActuel);
        const nouvelIndex = deltaX < 0
            ? indexActuel + 1
            : indexActuel - 1;

        if (nouvelIndex < 0 || nouvelIndex >= ECRANS_SWIPE.length) return;

const direction = deltaX < 0 ? 'gauche' : 'droite';

jouerFumeeSwipe(direction);
afficherEcran(ECRANS_SWIPE[nouvelIndex]);
    }, { passive: true });
}

function configurerEcouteurs() {
    const btnResistance = document.getElementById('btn-changer-resistance');
    if (btnResistance) btnResistance.onclick = () => changerResistance();

    const navAccueil = document.getElementById('nav-accueil');
    if (navAccueil) navAccueil.onclick = () => afficherEcran('ecran-accueil');

    const navRecettes = document.getElementById('nav-recettes');
    if (navRecettes) navRecettes.onclick = () => afficherEcran('ecran-recettes');

const navSante = document.getElementById('nav-sante');
if (navSante) navSante.onclick = () => afficherEcran('ecran-sante');

    const navFinances = document.getElementById('nav-finances');
    if (navFinances) navFinances.onclick = () => afficherEcran('ecran-finances');

    const navObjectifs = document.getElementById('nav-objectifs');
    if (navObjectifs) navObjectifs.onclick = () => afficherEcran('ecran-objectifs');

    const btnOuvProfil = document.getElementById('btn-ouvrir-profil');
    if (btnOuvProfil) btnOuvProfil.onclick = () => afficherEcran('ecran-profil');

    const champsDIY = ['recette-volume', 'recette-nicotine', 'recette-arome', 'recette-taux-booster'];
    champsDIY.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            ['input', 'keyup', 'change'].forEach(evt => {
                el.addEventListener(evt, calculerDosagesDIY);
            });
        }
    });

    const champsAjust = ['ajust-vol-actuel', 'ajust-volume-final-vise', 'ajust-nico-actuelle', 'ajust-arome-actuel', 'ajust-nico-visee', 'ajust-arome-pct', 'ajust-taux-booster'];
    champsAjust.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            ['input', 'keyup', 'change'].forEach(evt => {
                el.addEventListener(evt, calculerAjustementDIY);
            });
        }
    });

    const tabCreer = document.getElementById('tab-mode-creer');
    const tabAjuster = document.getElementById('tab-mode-ajuster');
    const formRecette = document.getElementById('form-recette');
    const formAjustement = document.getElementById('form-ajustement');

    if (tabCreer && tabAjuster && formRecette && formAjustement) {
        tabCreer.onclick = () => {
            tabCreer.classList.add('actif');
            tabAjuster.classList.remove('actif');
            formRecette.classList.remove('masque');
            formAjustement.classList.add('masque');
            calculerDosagesDIY();
        };

        tabAjuster.onclick = () => {
            tabAjuster.classList.add('actif');
            tabCreer.classList.remove('actif');
            formAjustement.classList.remove('masque');
            formRecette.classList.add('masque');
            calculerAjustementDIY();
        };
    }

    const btnFermerAjust = document.getElementById('btn-fermer-ajustement');
    if (btnFermerAjust && formAjustement && tabAjuster) {
        btnFermerAjust.onclick = () => {
            formAjustement.classList.add('masque');
            tabAjuster.classList.remove('actif');
        };
    }

    const selectObVapote = document.getElementById('ob-vapote');
    const grpObNicotine = document.getElementById('groupe-ob-nicotine');
    if (selectObVapote && grpObNicotine) {
        selectObVapote.addEventListener('change', (e) => {
            if (e.target.value === 'non') grpObNicotine.classList.add('masque-champ');
            else grpObNicotine.classList.remove('masque-champ');
        });
    }

    const selectCfgVapote = document.getElementById('config-vapote');
    const grpCfgNicotine = document.getElementById('groupe-config-nicotine');
    if (selectCfgVapote && grpCfgNicotine) {
        selectCfgVapote.addEventListener('change', (e) => {
            if (e.target.value === 'non') grpCfgNicotine.classList.add('masque-champ');
            else grpCfgNicotine.classList.remove('masque-champ');
        });
    }

    const btnOuvAjout = document.getElementById('btn-ouvrir-ajout');
    if (btnOuvAjout) btnOuvAjout.onclick = () => afficherEcran('ecran-ajout');

    const btnAnnulerAjout = document.getElementById('btn-annuler');
    if (btnAnnulerAjout) btnAnnulerAjout.onclick = () => afficherEcran('ecran-accueil');

    const btnOuvDirect = document.getElementById('btn-ouvrir-utilisation-directe');
    if (btnOuvDirect) btnOuvDirect.onclick = () => afficherEcran('ecran-utilisation-directe');

    const btnAnnulerDirect = document.getElementById('btn-annuler-direct');
    if (btnAnnulerDirect) btnAnnulerDirect.onclick = () => afficherEcran('ecran-accueil');

    const btnAnnulerDep = document.getElementById('btn-annuler-depense');
    if (btnAnnulerDep) {
        btnAnnulerDep.onclick = () => {
            const formDep = document.getElementById('form-depense');
            if (formDep) formDep.classList.add('masque');
        };
    }

    const btnAnnulerObj = document.getElementById('btn-annuler-objectif');
    if (btnAnnulerObj) {
        btnAnnulerObj.onclick = () => {
            const formObj = document.getElementById('form-objectif');
            if (formObj) formObj.classList.add('masque');
        };
    }

    const btnOuvDep = document.getElementById('btn-ouvrir-depense');
    if (btnOuvDep) {
        btnOuvDep.onclick = () => {
            const formDep = document.getElementById('form-depense');
            if (formDep) formDep.classList.remove('masque');
        };
    }

    const btnOuvObj = document.getElementById('btn-ouvrir-ajout-objectif');
    if (btnOuvObj) {
        btnOuvObj.onclick = () => {
            const formObj = document.getElementById('form-objectif');
            if (formObj) formObj.classList.remove('masque');
        };
    }

    const btnOuvRec = document.getElementById('btn-ouvrir-ajout-recette');
    if (btnOuvRec && tabCreer) {
        btnOuvRec.onclick = () => {
            tabCreer.click();
        };
    }

    const btnAnnulerRec = document.getElementById('btn-annuler-recette');
    if (btnAnnulerRec && formRecette) {
        btnAnnulerRec.onclick = () => {
            formRecette.classList.add('masque');
        };
    }

    const selRecette = document.getElementById('select-recette');
    if (selRecette) {
        selRecette.onchange = (e) => {
            const idRecette = e.target.value;
            if (idRecette) {
                const r = recettes.find(item => item.id === idRecette);
                if (r) {
                    if (document.getElementById('nom')) document.getElementById('nom').value = r.nom;
                    if (document.getElementById('type')) document.getElementById('type').value = r.type || 'DIY';
                    if (document.getElementById('nicotine')) document.getElementById('nicotine').value = r.nicotine;
                    if (document.getElementById('volume')) document.getElementById('volume').value = r.volumeTotal || 50;
                    if (document.getElementById('arome')) document.getElementById('arome').value = r.arome || 0;
                    if (document.getElementById('flacon-steep-days')) document.getElementById('flacon-steep-days').value = r.steepDays || 0;
                }
            }
        };
    }

    const selRecetteDirecte = document.getElementById('select-recette-directe');
    if (selRecetteDirecte) {
        selRecetteDirecte.onchange = (e) => {
            const idRecette = e.target.value;
            if (idRecette) {
                const r = recettes.find(item => item.id === idRecette);
                if (r) {
                    if (document.getElementById('nom-direct')) document.getElementById('nom-direct').value = r.nom;
                    if (document.getElementById('type-direct')) document.getElementById('type-direct').value = r.type || 'DIY';
                    if (document.getElementById('nicotine-direct')) document.getElementById('nicotine-direct').value = r.nicotine;
                    if (document.getElementById('volume-direct')) document.getElementById('volume-direct').value = r.volumeTotal || 50;
                }
            }
        };
    }

    const btnTerminer = document.getElementById('btn-terminer');
if (btnTerminer) {
    btnTerminer.onclick = () => {
        const actif = flacons.find(f => f.actif);
        if (actif) {
            terminerFlacon(actif.id);
        }
    };
}
}
