// Petites interactions locales : aucune donnée personnelle n'est envoyée ici.
const MyVapeUI = (() => {
    const flavorCategories = {
    fruite:   { label: 'Fruité',        icon: '🍓', color: '#ffb7c5' },
    gourmand: { label: 'Gourmand',      icon: '🍰', color: '#c99a6b' },
    classic:  { label: 'Classic',       icon: '🍂', color: '#9b7653' },
    menthe:   { label: 'Menthe / Frais',icon: '🌿', color: '#8dd9bd' },
    boisson:  { label: 'Boisson',       icon: '🥤', color: '#8dc8ef' },
    autre:    { label: 'Autre',         icon: '✨', color: '#e8c85a' }
};

const legacyColors = {
    rose:'#ffb7c5',
    lavande:'#bca7ef',
    menthe:'#8dd9bd',
    bleu:'#8dc8ef',
    peche:'#efb18e'
};
    let toastTimer, pendingStage = null;
    function toast(message) {
        const el=document.getElementById('confirmation-action');
        if(!el)return;
        clearTimeout(toastTimer);
        el.textContent='✓ '+message;
        el.classList.add('visible');
        toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);
    }
    function bottleColor(bottle) {
    if (bottle?.categorieSaveur && flavorCategories[bottle.categorieSaveur]) {
        return flavorCategories[bottle.categorieSaveur].color;
    }

    if (bottle?.couleur && legacyColors[bottle.couleur]) {
        return legacyColors[bottle.couleur];
    }

    return flavorCategories.autre.color;
}

function bottleIcon(bottle) {
    return flavorCategories[bottle?.categorieSaveur]?.icon || '✨';
}
    function decorateBottles() {
    const reserve = flacons.filter(f => !f.termine && !f.startedAt);
    const history = flacons.filter(f => f.termine);

    for (const [id, list] of [
        ['liste-flacons-reserve', reserve],
        ['liste-historique', history]
    ]) {
        document.querySelectorAll(`#${id} > .carte`).forEach((card, i) => {
            const bottle = list[i];
            if (!bottle) return;

            // Nettoyage des anciens sélecteurs de couleur
            card.querySelectorAll('.couleur-flacon-select').forEach(el => el.remove());

            // Couleur automatique selon la catégorie de saveur
            card.classList.add('carte-flacon-coloree');
            card.style.setProperty('--couleur-flacon', bottleColor(bottle));
        });
    }

    const active = flacons.find(f => f.actif);
    const title = document.getElementById('nom-liquide');
    const card = document.getElementById('carte-flacon-principal');
    if (card) {
        card.classList.toggle('carte-flacon-coloree', !!active);
        if (active) card.style.setProperty('--couleur-flacon', bottleColor(active));
        else card.style.removeProperty('--couleur-flacon');
    }


    if (title && active) {
        title.style.color = bottleColor(active);
        title.textContent = `${bottleIcon(active)} ${active.nom}`;
    } else if (title) {
        title.style.color = '';
    }

    // L'ancien emplacement du sélecteur de couleur reste vide
    const slot = document.getElementById('couleur-flacon-actif');
    if (slot) slot.replaceChildren();
}
    function observeStage(stage) {
        if(!configUser?.dateArret)return;
        try {
            const previous=JSON.parse(localStorage.getItem('vt_tree_celebration')||'null');
            const date=configUser.dateArret;
            if(!previous || previous.date!==date) {
                localStorage.setItem('vt_tree_celebration',JSON.stringify({date,stage}));
                pendingStage=null;return;
            }
            if(stage>previous.stage)pendingStage={date,stage};
            celebrate();
        }catch{/* Une panne de stockage ne doit pas bloquer l'accueil. */}
    }
    function celebrate() {
        if(!pendingStage || document.visibilityState==='hidden' || document.getElementById('splash-screen'))return;
        const home=document.getElementById('ecran-accueil');
        if(!home || home.classList.contains('masque'))return;
        try{localStorage.setItem('vt_tree_celebration',JSON.stringify(pendingStage));}catch{return;}
        pendingStage=null;
        toast('Ton cerisier a grandi ! Chaque jour compte 🌸');
        if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        const shower=document.createElement('div');shower.className='celebration-petales';shower.setAttribute('aria-hidden','true');
        for(let i=0;i<22;i++) {
            const petal=document.createElement('i');
            petal.style.left=`${Math.random()*100}%`;
            petal.style.animationDelay=`${Math.random()*1.2}s`;
            petal.style.setProperty('--derive',`${Math.random()*140-70}px`);
            shower.appendChild(petal);
        }
        document.body.appendChild(shower);setTimeout(()=>shower.remove(),5200);
    }
    document.addEventListener('DOMContentLoaded',()=>{
        setInterval(()=>{if(document.visibilityState==='visible'){celebrate();afficherReserveEtMaturation();decorateBottles();}},60000);
        setTimeout(celebrate,3200);
    });
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){mettreAJourCerisierHD();celebrate();}});
    return {toast,bottleColor,bottleIcon,decorateBottles,observeStage,celebrate};
})();
