// Suivi rétrocompatible : un objectif sans statut reste à suivre.
const MyVapeGoals = (() => {
    const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
    const pending=()=>objectifs.filter(o=>o.statut!=='atteint').sort((a,b)=>a.date.localeCompare(b.date));
    const dose=o=>Number.parseFloat(o.titre);
    function dateDepart(o) {
    if (o.dateCreation) return o.dateCreation;

    const timestamp = Number.parseInt(o.id, 10);
    if (Number.isFinite(timestamp)) {
        const d = new Date(timestamp);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    return today();
}
function progressionObjectif(o) {
    const depart = new Date(dateDepart(o) + 'T12:00:00');
    const cible = new Date(o.date + 'T12:00:00');
    const maintenant = new Date(today() + 'T12:00:00');

    const dureeTotale = cible - depart;
    const tempsEcoule = maintenant - depart;

    let pourcentage = dureeTotale > 0
        ? Math.round((tempsEcoule / dureeTotale) * 100)
        : 100;

    pourcentage = Math.max(0, Math.min(100, pourcentage));

    const unJour = 1000 * 60 * 60 * 24;
    const joursRestants = Math.max(
        0,
        Math.ceil((cible - maintenant) / unJour)
    );

    return {
        pourcentage,
        joursRestants
    };
}
function progressionObjectifTabac(o) {
    if (!configUser?.dateArret || !o.dateCible) {
        return {
            pourcentage: 0,
            joursRestants: 0
        };
    }

    const depart = new Date(configUser.dateArret + 'T12:00:00');
    const cible = new Date(o.dateCible + 'T12:00:00');
    const maintenant = new Date(today() + 'T12:00:00');

    const dureeTotale = cible - depart;
    const tempsEcoule = maintenant - depart;

    let pourcentage = dureeTotale > 0
        ? Math.round((tempsEcoule / dureeTotale) * 100)
        : 100;

    pourcentage = Math.max(0, Math.min(100, pourcentage));

    const unJour = 1000 * 60 * 60 * 24;

    const joursRestants = Math.max(
        0,
        Math.ceil((cible - maintenant) / unJour)
    );

    return {
        pourcentage,
        joursRestants
    };
}
    function element(tag,text,cls){const el=document.createElement(tag);MyVapeUI.illustrerTexte(el,text);if(cls)el.className=cls;return el;}
    function button(parent,text,fn){const b=element('button',text,'btn-secondaire');b.type='button';b.onclick=fn;parent.append(b);return b;}
    function persist(){localStorage.setItem('vt_objectifs',JSON.stringify(objectifs));}
    function next(){afficherEcran('ecran-objectifs');document.getElementById('form-objectif').classList.remove('masque');document.getElementById('obj-nicotine-valeur').focus();}
    function win(o){
        if(o.statut==='atteint'||!Number.isFinite(dose(o))||dose(o)<0)return;
        const old=JSON.stringify(objectifs),oldConfig=JSON.stringify(configUser);
        o.statut='atteint';o.atteintLe=today();configUser.nicotineActuelle=dose(o);
        try{persist();localStorage.setItem('vt_config',JSON.stringify(configUser));}
        catch{objectifs=JSON.parse(old);configUser=JSON.parse(oldConfig);localStorage.setItem('vt_objectifs',old);alert('Enregistrement impossible. Réessaie.');return;}
        mettreAJourTout();
        const card=document.getElementById('suivi-objectif');card.hidden=false;card.replaceChildren(element('h3',`Bravo ! Un nouveau cap franchi : ${o.titre} 🌸`));button(card,'Définir mon prochain objectif',next);
        MyVapeUI.toast('Objectif atteint ! Bravo pour ton parcours 🌸');
        if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        const shower=element('div','','celebration-petales celebration-objectif');shower.setAttribute('aria-hidden','true');
        for(let i=0;i<28;i++){const petal=document.createElement('i');petal.style.left=`${Math.random()*100}%`;petal.style.animationDelay=`${Math.random()*.8}s`;petal.style.setProperty('--derive',`${Math.random()*140-70}px`);shower.append(petal);}
        document.body.append(shower);setTimeout(()=>shower.remove(),5200);
    }
    function postpone(card,o){
        card.replaceChildren(element('h3','Chacun avance à son rythme 🌸'),element('p','On choisit une nouvelle date ?'));
        const label=element('label','Nouvelle date');const input=document.createElement('input');input.type='date';input.min=today();label.append(input);card.append(label);
        button(card,'Reporter l’objectif',()=>{if(!input.value||input.value<today()){input.reportValidity();return;}const old=o.date;o.date=input.value;try{persist();}catch{o.date=old;return;}mettreAJourTout();MyVapeUI.toast('Objectif reporté');});
        button(card,'Plus tard',render);
    }
    function render(){
        const card=document.getElementById('suivi-objectif');if(!card)return;
        const list=pending(),due=list.find(o=>o.date<=today());card.replaceChildren();card.hidden=!due;
        if(due){card.append(element('h3',`🎯 Ton objectif : ${due.titre}`),element('p',due.date===today()?'C’est aujourd’hui ! Où en es-tu ?':`Tu l’avais prévu le ${new Date(due.date+'T12:00:00').toLocaleDateString('fr-FR')}. Où en es-tu ?`));button(card,'Oui, objectif atteint !',()=>win(due));button(card,'Pas encore',()=>postpone(card,due));}
        const container=document.getElementById('liste-objectifs');container.replaceChildren();
        const nicotineDetails = element('details', '', 'carte');

const nicotineSummary = document.createElement('summary');

const nicotineIcon = document.createElement('img');
nicotineIcon.src = './assets/accueil/nicotine.png';
nicotineIcon.alt = '';
nicotineIcon.width = 28;
nicotineIcon.height = 28;
nicotineIcon.className = 'icone-inline';

const nicotineTitre = document.createElement('span');
nicotineTitre.textContent = `Mes objectifs nicotine (${list.length})`;

nicotineSummary.append(nicotineIcon, nicotineTitre);
nicotineDetails.append(nicotineSummary);
        for (const o of list) {
    const item = element('div', '', 'carte');

    item.append(
        element('h3', `🎯 ${o.titre}`),
        element(
            'p',
            `Date cible : ${new Date(o.date + 'T12:00:00').toLocaleDateString('fr-FR')}`
        )
    );
    const progression = progressionObjectif(o);

const zoneProgression = element('div', '', 'objectif-progression');

const barre = element('div', '', 'objectif-progression-barre');
const remplissage = element('div', '', 'objectif-progression-remplissage');
remplissage.style.width = `${progression.pourcentage}%`;

barre.append(remplissage);

const infosProgression = element(
    'div',
    `${progression.pourcentage}% · ${progression.joursRestants} jour${progression.joursRestants > 1 ? 's' : ''} restant${progression.joursRestants > 1 ? 's' : ''}`,
    'objectif-progression-infos'
);

zoneProgression.append(barre, infosProgression);
item.append(zoneProgression);

    if (o.date <= today()) {
        button(item, 'Objectif atteint !', () => win(o));
        button(item, 'Reporter', () => postpone(item, o));
    }

    button(item, 'Modifier', () => modifierObjectif(o.id));

    
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-suppr';
    deleteBtn.textContent = '🗑️';
    deleteBtn.setAttribute('aria-label', 'Supprimer cet objectif');
    deleteBtn.style.position = 'absolute';
deleteBtn.style.top = '12px';
deleteBtn.style.right = '12px';
    deleteBtn.onclick = () => supprimerObjectif(o.id);
    item.append(deleteBtn);

    nicotineDetails.append(item);
}
container.append(nicotineDetails);
const tabacDetails = element('details', '', 'carte');

const tabacSummary = document.createElement('summary');

const tabacIcon = document.createElement('img');
tabacIcon.src = './assets/accueil/jours.png';
tabacIcon.alt = '';
tabacIcon.width = 28;
tabacIcon.height = 28;
tabacIcon.className = 'icone-inline';

const tabacTitre = document.createElement('span');
tabacTitre.textContent = `Mes objectifs sans tabac (${objectifsTabac.length})`;

tabacSummary.append(tabacIcon, tabacTitre);
tabacDetails.append(tabacSummary);

const objectifsTabacTries = [...objectifsTabac]
    .sort((a, b) => a.dateCible.localeCompare(b.dateCible));

for (const o of objectifsTabacTries) {
    const item = element('div', '', 'carte');
    item.style.position = 'relative';

    item.append(
        element('h3', o.titre),
        element(
            'p',
            `Date cible : ${new Date(o.dateCible + 'T12:00:00').toLocaleDateString('fr-FR')}`
        )
    );
const progression = progressionObjectifTabac(o);

const zoneProgression = element('div', '', 'objectif-progression');

const barre = element('div', '', 'objectif-progression-barre');

const remplissage = element(
    'div',
    '',
    'objectif-progression-remplissage-tabac'
);

remplissage.style.width = `${progression.pourcentage}%`;

barre.append(remplissage);

const infosProgression = element(
    'div',
    `${progression.pourcentage}% · ${progression.joursRestants} jour${progression.joursRestants > 1 ? 's' : ''} restant${progression.joursRestants > 1 ? 's' : ''}`,
    'objectif-progression-infos'
);

zoneProgression.append(barre, infosProgression);
item.append(zoneProgression);

button(
    item,
    'Modifier',
    () => window.modifierObjectifSansTabac(o.id)
);

const deleteBtn = document.createElement('button');
deleteBtn.type = 'button';
deleteBtn.className = 'btn-suppr';
deleteBtn.textContent = '🗑️';
deleteBtn.setAttribute('aria-label', 'Supprimer cet objectif');
deleteBtn.style.position = 'absolute';
deleteBtn.style.top = '12px';
deleteBtn.style.right = '12px';

deleteBtn.onclick = () => window.supprimerObjectifSansTabac(o.id);

item.append(deleteBtn);
    tabacDetails.append(item);
}

container.append(tabacDetails);
        const completed=objectifs.filter(o=>o.statut==='atteint');if(completed.length){const history=element('details','','carte');history.append(element('summary',`🌸 Mes réussites (${completed.length})`));for(const o of completed)history.append(element('p',`${o.titre} · atteint le ${new Date(o.atteintLe+'T12:00:00').toLocaleDateString('fr-FR')}`));container.append(history);}
        if(!objectifs.length)container.append(element('p','Aucun objectif fixé.','texte-vide'));
    }
    let lastDay=today();
    function refreshDay(){if(document.visibilityState==='visible' && today()!==lastDay){lastDay=today();render();}}
    document.addEventListener('visibilitychange',refreshDay);
    setInterval(refreshDay,60000);
   return {
    render,
    progressionObjectif,
    progressionObjectifTabac
};
})();
