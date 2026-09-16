// =============================================================
// AUTO-SUPPRESSION SECURE DU SPLASH SCREEN
// =============================================================
setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.remove();
}, 2500);

// =============================================================
// MYVAPEPAL PWA - CODE PRINCIPAL APPLICATION
// =============================================================

const JALONS_SANTE = [
    { delaiHeures: 20, titre: "Pression sanguine", desc: "La pression sanguine et le pouls redeviennent normaux." },
    { delaiHeures: 8, titre: "Oxygénation", desc: "La quantité de monoxyde de carbone dans le sang diminue de moitié." },
    { delaiHeures: 24, titre: "Risque d'infarctus", desc: "Le monoxyde de carbone est éliminé. Le risque d'infarctus diminue." },
    { delaiHeures: 48, titre: "Goût et Odorat", desc: "La nicotine est éliminée. Le goût et l'odorat s'améliorent." },
    { delaiHeures: 72, titre: "Respiration", desc: "Les bronches se relâchent, respirer devient plus facile." },
    { delaiHeures: 336, titre: "Energie (2 sem.)", desc: "La circulation sanguine s'améliore, le souffle revient." },
    { delaiHeures: 720, titre: "Capacité pulmonaire (1 mois)", desc: "Toux et fatigue diminuent. Les poumons se nettoient." },
    { delaiHeures: 2160, titre: "Fonction pulmonaire (3 mois)", desc: "La fonction pulmonaire s'est accrue de 10 à 30%." },
    { delaiHeures: 6480, titre: "Toux et essoufflement (9 mois)", desc: "Les cils pulmonaires ont repoussé." },
    { delaiHeures: 8760, titre: "Risque cardiaque (-50%)", desc: "Le risque de maladie cardiovasculaire est réduit de moitié." }
];

let configUser = null;
let flacons = [];
let recettes = [];
let depenses = [];
let objectifs = [];

try {
    configUser = JSON.parse(localStorage.getItem('vt_config')) || null;
    flacons = JSON.parse(localStorage.getItem('vt_flacons')) || [];
    recettes = JSON.parse(localStorage.getItem('vt_recettes')) || [];
    depenses = JSON.parse(localStorage.getItem('vt_depenses')) || [];
    objectifs = JSON.parse(localStorage.getItem('vt_objectifs')) || [];
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
        if (entete) entete.style.display = 'none';
        if (nav) nav.style.display = 'none';
    } else {
        initialiserInterface();
    }

    configurerEcouteurs();
});

function initialiserInterface() {
    const entete = document.getElementById('entete-app');
    const nav = document.getElementById('navigation-basse');
    if (entete) entete.style.display = 'flex';
    if (nav) nav.style.display = 'flex';
    
    try {
        if (document.getElementById('cigs-jour')) document.getElementById('cigs-jour').value = configUser.cigsJour || 15;
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
    afficherReserveEtMaturation();
    afficherHistoriqueFlacons();
    afficherRecettes();
    afficherTimelineSante();
    afficherFinances();
    afficherObjectifs();
    remplirSelectRecettes();
}

function getJoursEcoules() {
    if (!configUser || !configUser.dateArret) return 0;
    const debut = new Date(configUser.dateArret);
    const maintenant = new Date();
    const diffTemps = Math.abs(maintenant - debut);
    return Math.floor(diffTemps / (1000 * 60 * 60 * 24));
}

function getHeuresEcoulees() {
    if (!configUser || !configUser.dateArret) return 0;
    const debut = new Date(configUser.dateArret);
    const maintenant = new Date();
    return Math.abs(maintenant - debut) / (1000 * 60 * 60);
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
    
    // Économie totale
    if (document.getElementById('card-economies')) document.getElementById('card-economies').textContent = `${economieNetteTotale.toFixed(2)} €`;

    // Économie du mois en cours
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
            cardNicotineVal.textContent = `${configUser.nicotineActuelle} mg/ml`;
        } else {
            cardNicotineVal.textContent = '0 mg/ml (Non vapoteur)';
        }
    }

    if (cardNicotineObj) {
        const objectifsFuturs = objectifs
            .filter(o => new Date(o.date) >= maintenant)
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
        if (elBooster) elBooster.textContent = `${volBooster.toFixed(2)} ml`;
        if (elBase) {
            elBase.textContent = "Impossible (surdosage)";
            elBase.style.color = '#f85149';
        }
        return { volTotal, volArome, volBooster, volBase: 0, nbrFiolesBooster: 0 };
    }

    const nbrFiolesBooster = (volBooster / 10).toFixed(1);
    if (elArome) elArome.textContent = `${volArome.toFixed(2)} ml (${pctArome}%)`;
    if (elBooster) elBooster.textContent = `${volBooster.toFixed(2)} ml (${nbrFiolesBooster} fiole${nbrFiolesBooster > 1 ? 's' : ''})`;
    if (elBase) {
        elBase.textContent = `${volBase.toFixed(2)} ml`;
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
    const N0 = parseFloat(document.getElementById('ajust-nico-actuelle').value) || 0;
    const A0 = parseFloat(document.getElementById('ajust-arome-actuel').value) || 0;
    const N1 = parseFloat(document.getElementById('ajust-nico-visee').value) || 0;
    const A1 = parseFloat(document.getElementById('ajust-arome-pct').value) || 0;

    const elBase = document.getElementById('ajust-calc-base');
    const elArome = document.getElementById('ajust-calc-arome');
    const elVolFinal = document.getElementById('ajust-calc-vol-final');

    if (V0 <= 0 || N0 <= 0 || N1 <= 0 || A0 < 0 || A0 >= 100 || A1 < 0 || A1 >= 100) {
        if (elBase) elBase.textContent = "---";
        if (elArome) elArome.textContent = "---";
        if (elVolFinal) elVolFinal.textContent = "---";
        return;
    }

    if (N1 >= N0) {
        if (elBase) elBase.textContent = "Nico cible doit être < actuelle";
        if (elArome) elArome.textContent = "---";
        if (elVolFinal) elVolFinal.textContent = "---";
        return;
    }

    const Vf = (V0 * N0) / N1;
    const ajoutTotal = Vf - V0;
    const F0 = (V0 * A0) / 100;
    const F1 = (Vf * A1) / 100;
    const aromeAAjouter = F1 - F0;

    if (aromeAAjouter < 0) {
        if (elBase) elBase.textContent = "Impossible";
        if (elArome) elArome.textContent = "Cible arôme trop basse";
        if (elVolFinal) elVolFinal.textContent = "---";
        return;
    }

    const baseAAjouter = ajoutTotal - aromeAAjouter;

    if (baseAAjouter < 0) {
        if (elBase) elBase.textContent = "Impossible (base < 0)";
        if (elArome) elArome.textContent = "---";
        if (elVolFinal) elVolFinal.textContent = "---";
        return;
    }

    if (elBase) elBase.textContent = `${baseAAjouter.toFixed(1)} ml`;
    if (elArome) elArome.textContent = `${aromeAAjouter.toFixed(2)} ml`;
    if (elVolFinal) elVolFinal.textContent = `${Vf.toFixed(1)} ml`;
}

// =============================================================
// FONCTIONS DIRECTES DE SAUVEGARDE
// =============================================================
function sauvegarderOnboarding() {
    const prenom = document.getElementById('ob-prenom').value.trim();
    const dateArret = document.getElementById('ob-date-arret').value;
    if (!prenom || !dateArret) {
        alert('Veuillez remplir votre prénom et votre date d\'arrêt.');
        return;
    }
    const estVapoteur = document.getElementById('ob-vapote').value === 'oui';
    configUser = {
        prenom: prenom,
        dateArret: dateArret,
        cigsJour: parseFloat(document.getElementById('ob-cigs-jour').value) || 15,
        prixPaquet: parseFloat(document.getElementById('ob-prix-paquet').value) || 12.5,
        cigsPaquet: 20,
        vapote: estVapoteur,
        nicotineActuelle: estVapoteur ? parseFloat(document.getElementById('ob-nicotine-actuelle').value || 0) : 0
    };
    localStorage.setItem('vt_config', JSON.stringify(configUser));
    initialiserInterface();
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
    alert('Paramètres mis à jour !');
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
        type: document.getElementById('type').value,
        volume: parseFloat(document.getElementById('volume').value) || 0,
        nicotine: parseFloat(document.getElementById('nicotine').value) || 0,
        arome: parseFloat(document.getElementById('arome').value) || 0,
        preparedAt: dateFabrique.toISOString(),
        dateOuverture: dateFabrique.toISOString(),
        steepDays: steepDays,
        steepReadyAt: dateFinSteep,
        actif: false,
        termine: false
    };

    if (steepDays === 0 && !flacons.some(f => f.actif)) {
        nouveauFlacon.actif = true;
    }

    flacons.unshift(nouveauFlacon);
    localStorage.setItem('vt_flacons', JSON.stringify(flacons));

    if (steepDays > 0) {
        programmerNotificationSteep(nouveauFlacon);
    }

    document.getElementById('nom').value = '';
    mettreAJourTout();
    afficherEcran('ecran-accueil');
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

    flacons.forEach(f => f.actif = false);

    const nouveauFlaconActif = {
        id: Date.now().toString(),
        nom: nom,
        type: document.getElementById('type-direct').value,
        volume: parseFloat(document.getElementById('volume-direct').value) || 0,
        nicotine: parseFloat(document.getElementById('nicotine-direct').value) || 0,
        arome: 0,
        preparedAt: dateDebut.toISOString(),
        dateOuverture: dateDebut.toISOString(),
        steepDays: 0,
        steepReadyAt: null,
        actif: true,
        termine: false
    };

    flacons.unshift(nouveauFlaconActif);
    localStorage.setItem('vt_flacons', JSON.stringify(flacons));

    document.getElementById('nom-direct').value = '';
    mettreAJourTout();
    afficherEcran('ecran-accueil');
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
}

function sauvegarderObjectif() {
    const titre = document.getElementById('obj-titre').value.trim();
    const date = document.getElementById('obj-date').value;
    if (!titre || !date) {
        alert('Veuillez renseigner le titre et la date cible.');
        return;
    }
    const nouvelObjectif = {
        id: Date.now().toString(),
        titre: titre,
        date: date
    };
    objectifs.unshift(nouvelObjectif);
    localStorage.setItem('vt_objectifs', JSON.stringify(objectifs));
    
    document.getElementById('obj-titre').value = '';
    document.getElementById('obj-date').value = '';
    document.getElementById('form-objectif').classList.add('masque');
    mettreAJourTout();
}

// =============================================================
// GESTION DES NOTIFICATIONS
// =============================================================
function programmerNotificationSteep(flacon) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!flacon.steepReadyAt) return;

    const dateFin = new Date(flacon.steepReadyAt).getTime();
    const maintenant = new Date().getTime();
    const delaiMs = dateFin - maintenant;

    if (delaiMs <= 0) return;

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            action: 'PROGRAMMER_STEEP_NOTIF',
            flaconId: flacon.id,
            nom: flacon.nom,
            steepDays: flacon.steepDays,
            steepReadyAt: flacon.steepReadyAt,
            delaiMs: delaiMs
        });
    }
}

function annulerNotificationSteep(flaconId) {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            action: 'ANNULER_STEEP_NOTIF',
            flaconId: flaconId
        });
    }
}

// =============================================================
// AFFICHAGE ACCUEIL & RÉSERVE
// =============================================================
function afficherFlaconActif() {
    const actif = flacons.find(f => f.actif);
    const btnTerminer = document.getElementById('btn-terminer');

    if (actif) {
        if (document.getElementById('nom-liquide')) document.getElementById('nom-liquide').textContent = `💨 ${actif.nom}`;
        if (document.getElementById('details-nicotine')) document.getElementById('details-nicotine').textContent = `Nicotine : ${actif.nicotine} mg/ml | Type : ${actif.type}`;
        
        const dateOuv = new Date(actif.dateOuverture || actif.preparedAt);
        const dateFormatee = dateOuv.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        if (document.getElementById('details-flacon')) {
            document.getElementById('details-flacon').textContent = `Entamé le ${dateFormatee} (${actif.volume} ml)`;
        }
        if (btnTerminer) btnTerminer.style.display = 'block';
    } else {
        if (document.getElementById('nom-liquide')) document.getElementById('nom-liquide').textContent = 'Aucun flacon en cours';
        if (document.getElementById('details-nicotine')) document.getElementById('details-nicotine').textContent = 'Sélectionne ou entame un flacon prêt ci-dessous.';
        if (document.getElementById('details-flacon')) document.getElementById('details-flacon').textContent = '';
        if (btnTerminer) btnTerminer.style.display = 'none';
    }
}

function afficherReserveEtMaturation() {
    const conteneur = document.getElementById('liste-flacons-reserve');
    if (!conteneur) return;

    const reserve = flacons.filter(f => !f.termine && !f.actif);

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
            const pct = Math.min(100, Math.max(0, (tempsEcouleMs / tempsTotalMs) * 100));

            const resteMs = dateFinSteep - maintenant;
            const resteJours = Math.floor(resteMs / (1000 * 60 * 60 * 24));
            const resteHeures = Math.floor((resteMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const joursEcoules = Math.floor(tempsEcouleMs / (1000 * 60 * 60 * 24));

            let texteReste = `Encore ${resteJours}j ${resteHeures}h`;
            if (resteJours === 0 && resteHeures === 0) texteReste = "Prêt dans quelques minutes !";

            moduleVisuel = `
                <div class="box-steep-live">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span class="badge-steep">🧪 En maturation</span>
                        <span class="texte-steep-compteur">${joursEcoules} / ${steepDays} jours</span>
                    </div>
                    <div class="barre-steep-fond">
                        <div class="barre-steep-progression" style="width: ${pct}%;"></div>
                    </div>
                    <p class="texte-secondaire" style="margin-top:6px; font-weight:600; color:#ffb7c5;">${texteReste}</p>
                </div>
            `;
        } else {
            moduleVisuel = `
                <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span class="badge-steep pret">🌸 Prêt ! Maturation terminée</span>
                    <button type="button" class="btn-primaire" style="width:auto; padding:6px 14px; font-size:0.8rem;" onclick="utiliserCeFlacon('${f.id}')">
                        Utiliser ce flacon 💨
                    </button>
                </div>
            `;
        }

        return `
            <div class="carte">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${f.nom} (${f.nicotine} mg)</strong>
                    <button type="button" class="btn-suppr" onclick="supprimerFlacon('${f.id}')">🗑️</button>
                </div>
                <p class="texte-secondaire">Préparé le ${new Date(f.preparedAt || f.dateOuverture).toLocaleDateString()} (${f.volume} ml)</p>
                ${moduleVisuel}
            </div>
        `;
    }).join('');
}

function utiliserCeFlacon(id) {
    flacons.forEach(f => f.actif = false);
    const f = flacons.find(item => item.id === id);
    if (f) {
        f.actif = true;
        f.dateOuverture = new Date().toISOString();
        localStorage.setItem('vt_flacons', JSON.stringify(flacons));
        mettreAJourTout();
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

    conteneur.innerHTML = termines.map(f => `
        <div class="carte">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>🏁 ${f.nom} (${f.nicotine} mg)</strong>
                <button type="button" class="btn-suppr" onclick="supprimerFlacon('${f.id}')">🗑️</button>
            </div>
            <p class="texte-secondaire">Préparé le ${new Date(f.preparedAt || f.dateOuverture).toLocaleDateString()} (${f.volume} ml)</p>
        </div>
    `).join('');
}

function supprimerFlacon(id) {
    annulerNotificationSteep(id);
    flacons = flacons.filter(f => f.id !== id);
    localStorage.setItem('vt_flacons', JSON.stringify(flacons));
    mettreAJourTout();
}

function afficherTimelineSante() {
    const conteneur = document.getElementById('timeline-sante');
    if (!conteneur) return;
    const heures = getHeuresEcoulees();

    conteneur.innerHTML = JALONS_SANTE.map(j => {
        const atteint = heures >= j.delaiHeures;
        return `
            <div class="carte jalon-sante ${atteint ? 'atteint' : ''}">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${j.titre}</strong>
                    <span>${atteint ? '✅ Atteint' : '⏳ En cours'}</span>
                </div>
                <p class="texte-secondaire" style="margin-top:6px;">${j.desc}</p>
            </div>
        `;
    }).join('');
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

    const conteneurDep = document.getElementById('liste-depenses');
    if (conteneurDep) {
        if (depenses.length === 0) {
            conteneurDep.innerHTML = '<p class="texte-vide">Aucune dépense enregistrée.</p>';
        } else {
            conteneurDep.innerHTML = depenses.map(d => `
                <div class="carte" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${d.nom || d.categorie}</strong>
                        <p class="texte-secondaire">${new Date(d.date).toLocaleDateString()} - ${d.categorie}</p>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="color:#f85149; font-weight:bold;">-${d.montant.toFixed(2)} €</span>
                        <button type="button" class="btn-suppr" onclick="supprimerDepense('${d.id}')">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    }

    afficherHistoriqueMensuel();
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
        <div class="carte item-objectif">
            <div>
                <strong>${o.titre}</strong>
                <p class="texte-secondaire">Cible : ${new Date(o.date).toLocaleDateString()}</p>
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
    document.querySelectorAll('.ecran').forEach(e => e.classList.add('masque'));
    const ecranCible = document.getElementById(idEcran);
    if (ecranCible) ecranCible.classList.remove('masque');

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('actif'));
    const navAssociee = document.getElementById(`nav-${idEcran.replace('ecran-', '')}`);
    if (navAssociee) navAssociee.classList.add('actif');
}

function configurerEcouteurs() {
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

    const champsDIY = ['recette-volume', 'recette-nicotine', 'recette-arome', 'recette-taux-booster'];
    champsDIY.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            ['input', 'keyup', 'change'].forEach(evt => {
                el.addEventListener(evt, calculerDosagesDIY);
            });
        }
    });

    const champsAjust = ['ajust-vol-actuel', 'ajust-nico-actuelle', 'ajust-arome-actuel', 'ajust-nico-visee', 'ajust-arome-pct'];
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
                actif.actif = false;
                actif.termine = true;
                actif.dateFermeture = new Date().toISOString();
                localStorage.setItem('vt_flacons', JSON.stringify(flacons));
                mettreAJourTout();
            }
        };
    }

    const btnNotifs = document.getElementById('btn-notifications');
    if (btnNotifs) {
        btnNotifs.onclick = () => {
            if ('Notification' in window) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        alert('Notifications activées avec succès ! 🌸');
                        new Notification('MyVapePal 🌸', {
                            body: 'Félicitations pour ton engagement ! Tu seras notifié lorsque tes préparations DIY seront prêtes.',
                            icon: 'icon.png'
                        });
                    }
                });
            }
        };
    }
}
