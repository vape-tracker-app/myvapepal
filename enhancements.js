// Petites interactions locales : aucune donnée personnelle n'est envoyée ici.
const MyVapeUI = (() => {
    const flavorCategories = {
    fruite:   { label: 'Fruité',        icon: '🍓', color: '#ffb7c5' },
    gourmand: { label: 'Gourmand',      icon: '🍰', color: '#c99a6b' },
    classic:  { label: 'Classic',       icon: '🍂', color: '#9b7653' },
    menthe:   { label: 'Menthe',icon: '🌿', color: '#8dd9bd' },
    frais:    { label: 'Frais', icon: '🧊', color: '#a8dff5' },
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
    function illustrerTexte(el, texte) {
        const images = {'🌸':'menu/accueil', '💰':'accueil/economies', '🎯':'menu/objectifs'};
        el.replaceChildren();
        for (const morceau of String(texte).split(/(🌸|💰|🎯)/u)) {
            if (images[morceau]) {
                const image = document.createElement('img');
                image.src = `./assets/${images[morceau]}.png`;
                image.className = 'icone-inline'; image.alt = ''; image.width = 24; image.height = 24;
                el.append(image);
            } else el.append(document.createTextNode(morceau));
        }
    }
    function toast(message) {
        const el=document.getElementById('confirmation-action');
        if(!el)return;
        clearTimeout(toastTimer);
        illustrerTexte(el, '✓ '+message);
        el.classList.add('visible');
        toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);
    }
    function bottleFlavors(bottle) {
        const keys = Array.isArray(bottle?.categoriesSaveurs) && bottle.categoriesSaveurs.length
            ? bottle.categoriesSaveurs : [bottle?.categorieSaveur];
        const valid = [...new Set(keys.filter(key => Object.prototype.hasOwnProperty.call(flavorCategories,key)))];
        return valid.length ? valid : ['autre'];
    }
    function bottleColor(bottle) {
        if (!bottle?.categorieSaveur && !bottle?.categoriesSaveurs?.length && legacyColors[bottle?.couleur]) return legacyColors[bottle.couleur];
        return flavorCategories[bottleFlavors(bottle)[0]].color;
    }
    function bottleIcon(bottle) {
        return bottleFlavors(bottle).map(key => `<img class="icone-saveur" src="./assets/saveurs/${key}.png" alt="${flavorCategories[key].label}" width="32" height="32" decoding="async">`).join('');
    }
    function readFlavorSelect(select) {
        if (!select) return ['autre'];
        return bottleFlavors({categoriesSaveurs: select._saveurs || Array.from(select.selectedOptions, option=>option.value),categorieSaveur:select.value});
    }
    function setFlavorSelect(select, record) {
        if(!select)return;
        attachFlavorSelect(select);
        select._saveurs=bottleFlavors(record);
        select.dispatchEvent(new Event('change',{bubbles:true}));
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
        title.innerHTML = bottleIcon(active);
        title.append(document.createTextNode(` ${active.nom}`));
    } else if (title) {
        title.style.color = '';
    }

    // L'ancien emplacement du sélecteur de couleur reste vide
    const slot = document.getElementById('couleur-flacon-actif');
    if (slot) slot.replaceChildren();
    document.querySelectorAll('#categorie-saveur-actif select, #liste-flacons-reserve select').forEach(select=>attachFlavorSelect(select));
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
    function attachFlavorSelect(select, initial) {
        if (!select || select.dataset.choixMultiple) return;
        select.dataset.choixMultiple = 'oui';
        const current = initial || readFlavorSelect(select);
        select.replaceChildren();
        for (const [key, flavor] of Object.entries(flavorCategories)) {
            const opt=document.createElement('option');opt.value=key;opt.textContent=flavor.label;select.append(opt);
        }
        select.multiple=true;select.hidden=true;select.required=false;
        select._saveurs=bottleFlavors({categoriesSaveurs:current});
        const button=document.createElement('button');button.type='button';button.className='champ-saveur';
        if(select.id) button.id=select.id+'-illustration';
        button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
        const render=()=>{
            const chosen=readFlavorSelect(select);
            for(const opt of select.options)opt.selected=chosen.includes(opt.value);
            button.innerHTML=bottleIcon({categoriesSaveurs:chosen});
            const label=document.createElement('span');label.textContent=chosen.map(k=>flavorCategories[k].label).join(' / ');button.append(label);
            button.setAttribute('aria-label','Saveurs : '+label.textContent);
        };
        select.after(button);render();
        select.addEventListener('change',render);
        if(select.id){const label=document.querySelector(`label[for="${select.id}"]`);if(label)label.htmlFor=button.id;}
        button.onclick=()=>{
            // Une copie de travail : fermer ou annuler ne change aucune sélection.
            let draft=[...readFlavorSelect(select)];
            const dialog=document.createElement('dialog');dialog.className='dialog-saveurs';
            const heading=document.createElement('h2');heading.id='titre-choix-saveurs';heading.textContent='Choisir les saveurs';
            dialog.setAttribute('aria-labelledby',heading.id);dialog.append(heading);
            const hint=document.createElement('p');hint.textContent='Sélectionne une ou plusieurs saveurs.';dialog.append(hint);
            const list=document.createElement('div');list.className='liste-choix-saveurs';dialog.append(list);
            const buttons=[];
            const actions=document.createElement('div');actions.className='actions-choix-saveurs';
            const ok=document.createElement('button');ok.type='button';ok.className='btn-primaire';ok.textContent='OK';
            const cancel=document.createElement('button');cancel.type='button';cancel.className='btn-secondaire';cancel.textContent='Annuler';
            const refresh=()=>{buttons.forEach(([key,b])=>{b.classList.toggle('selectionnee',draft.includes(key));b.setAttribute('aria-pressed',String(draft.includes(key)));});ok.disabled=!draft.length;};
            for(const [key,flavor] of Object.entries(flavorCategories)){
                const b=document.createElement('button');b.type='button';b.className='choix-saveur-option';
                b.innerHTML=bottleIcon({categorieSaveur:key})+`<span>${flavor.label}</span><span class="selection-saveur" aria-hidden="true">✓</span>`;
                b.querySelector('img').alt='';
                b.onclick=()=>{draft=draft.includes(key)?draft.filter(k=>k!==key):[...draft,key];refresh();};
                buttons.push([key,b]);list.append(b);
            }
            ok.onclick=()=>{if(!draft.length)return;select._saveurs=[...draft];render();select.dispatchEvent(new Event('change',{bubbles:true}));dialog.close();};
            cancel.onclick=()=>dialog.close();actions.append(ok,cancel);dialog.append(actions);
            dialog.addEventListener('close',()=>{dialog.remove();button.setAttribute('aria-expanded','false');button.focus();},{once:true});
            document.body.append(dialog);refresh();button.setAttribute('aria-expanded','true');dialog.showModal();
        };
    }
    function installerChoixSaveurs() {
        for(const id of ['categorie-saveur','categorie-saveur-direct','recette-saveurs'])attachFlavorSelect(document.getElementById(id));
    }
    document.addEventListener('DOMContentLoaded',()=>{
        installerChoixSaveurs();
        setInterval(()=>{if(document.visibilityState==='visible'){celebrate();afficherReserveEtMaturation();decorateBottles();}},60000);
        setTimeout(celebrate,3200);
    });
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){mettreAJourCerisierHD();celebrate();}});
    return {bottleFlavors,setFlavorSelect,readFlavorSelect,attachFlavorSelect,illustrerTexte,toast,bottleColor,bottleIcon,decorateBottles,observeStage,celebrate};
})();
