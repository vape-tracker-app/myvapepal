function texteCoutFlacon(f) {
    if(typeof f.coutFlacon!=='number'||!Number.isFinite(f.coutFlacon)||f.coutFlacon<0)return '';
    const euro=n=>n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
    const q=!f.startedAt&&!f.termine?(f.quantite??1):1;
    return ` • Coût${f.coutPartiel?' partiel':''} : ${euro(f.coutFlacon*q)}${q>1?` pour ${q} flacons (${euro(f.coutFlacon)} par flacon)`:''}`;
}
// Édition des informations métier sans changer l'identité ni l'état du flacon.
function dateLocaleFlacon(value) {
    const d = new Date(value);
    if (!value || !Number.isFinite(+d)) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function corrigerFicheFlacon(f, valeurs) {
    const next = {...f};
    next.nom = valeurs.nom.trim();
    if (!next.nom || /[<>]/.test(next.nom)) throw Error('Indique un nom sans les caractères < et >.');
    if (!['DIY', 'Prêt à vaper'].includes(valeurs.type)) throw Error('Choisis le type de flacon.');
    if (!['fruite','gourmand','classic','menthe','frais','boisson','autre'].includes(valeurs.categorieSaveur)) throw Error('Choisis une saveur.');
    next.type = valeurs.type; next.categorieSaveur = valeurs.categorieSaveur;
    const flavors=valeurs.categoriesSaveurs || [valeurs.categorieSaveur];
    if (!Array.isArray(flavors) || !flavors.length || flavors.some(k=>!['fruite','gourmand','classic','menthe','frais','boisson','autre'].includes(k))) throw Error('Choisis une ou plusieurs saveurs.');
    next.categoriesSaveurs=[...new Set(flavors)];next.categorieSaveur=next.categoriesSaveurs[0];
    for (const key of ['volume','nicotine','arome','steepDays']) {
        if (key === 'arome' && valeurs.type === 'Prêt à vaper') continue;
        const n = Number(valeurs[key]);
        if (valeurs[key] === '' || !Number.isFinite(n) || n < 0 || (key === 'volume' && n <= 0) || (key === 'arome' && n > 100)) throw Error('Vérifie les quantités, le volume et les dosages.');
        next[key] = n;
    }
    if (!f.startedAt) {
        const n = Number(valeurs.quantite);
        if (!Number.isSafeInteger(n) || n < 1 || n > 100) throw Error('La réserve doit contenir entre 1 et 100 flacons.');
        next.quantite = n;
    }
    for (const key of ['preparedAt', ...(f.startedAt ? ['startedAt'] : [])]) {
        const value = valeurs[key];
        if (!value || !Number.isFinite(+new Date(value))) throw Error('Renseigne une date valide.');
        // Une simple correction du nom ne doit pas tronquer les secondes des dates.
        next[key] = value === dateLocaleFlacon(f[key]) ? f[key] : new Date(value).toISOString();
    }
    if (f.startedAt) {
        next.dateOuverture = next.startedAt;
        const resistance = valeurs.dateResistance || '';
        if (resistance && (!/^\d{4}-\d{2}-\d{2}$/.test(resistance) || !Number.isFinite(+new Date(resistance)))) throw Error('Vérifie la date de résistance.');
        if (!f.materielConfigurationId) next.dateResistance = resistance || null;
    }
    if (next.preparedAt !== f.preparedAt || next.steepDays !== Number(f.steepDays || 0)) {
        const ready = +new Date(next.preparedAt) + next.steepDays * 86400000;
        if (!Number.isFinite(ready) || !Number.isFinite(+new Date(ready))) throw Error('Durée de maturation trop grande.');
        next.steepReadyAt = next.steepDays > 0 ? new Date(ready).toISOString() : null;
    }
    if (valeurs.coutFlacon === '') delete next.coutFlacon;
    else {
        const cost = Number(valeurs.coutFlacon);
        if (!Number.isFinite(cost) || cost < 0) throw Error('Indique un coût valide.');
        next.coutFlacon = valeurs.coutFlacon===String(f.coutFlacon??'')?f.coutFlacon:Math.round(cost * 100) / 100;
    }
    if(valeurs.coutFlacon!==String(f.coutFlacon??''))delete next.coutPartiel;
    return next;
}
function creerDialogueFlacon(titre) {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog-flacon-edition';
    const heading = document.createElement('h2'); heading.textContent = titre;
    heading.id = 'titre-dialogue-flacon'; dialog.setAttribute('aria-labelledby', heading.id);
    dialog.append(heading); document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove(), {once:true});
    return dialog;
}
function modifierFlacon(id) {
    if (document.querySelector('.dialog-flacon-edition')) return;
    const f = flacons.find(item => item.id === id);
    if (!f || f.termine) return;
    const dialog = creerDialogueFlacon('Modifier le flacon');
    const form = document.createElement('form');
    const fields = {};
    const field = (key, label, type, value, options) => {
        const group = document.createElement('label'); group.className = 'groupe-champ'; group.textContent = label;
        const input = document.createElement(options ? 'select' : 'input');
        if (options) for (const [val, text] of options) { const opt = document.createElement('option'); opt.value = val; opt.textContent = text; input.append(opt); }
        else input.type = type;
        input.name = key; input.value = value ?? ''; input.required = !['dateResistance','coutFlacon'].includes(key);
        if (type === 'number') {input.min = key === 'volume' ? '0.01' : '0'; input.step = 'any';}
        if (key === 'quantite') {input.min='1'; input.max='100'; input.step='1';}
        if (key === 'arome') input.max='100';
        if (key === 'coutFlacon') input.step='0.01';
        group.append(input); form.append(group); fields[key] = input;
    };
    field('nom','Nom du liquide','text',f.nom);
    field('categorieSaveur','Type de saveur',null,f.categorieSaveur || 'autre',Object.entries({fruite:'🍓 Fruité',gourmand:'🍰 Gourmand',classic:'🍂 Classic',menthe:'🌿 Menthe',frais:'🧊 Frais',boisson:'🥤 Boisson',autre:'✨ Autre'}));
    MyVapeUI.attachFlavorSelect(fields.categorieSaveur,MyVapeUI.bottleFlavors(f));
    field('type','Type',null,f.type,[['DIY','DIY (Fait maison)'],['Prêt à vaper','Prêt à vaper (Commercial)']]);
    field('volume','Contenance par flacon (ml)','number',f.volume);
    field('nicotine','Nicotine (mg/ml)','number',f.nicotine);
    field('arome','Arôme (%)','number',f.arome || 0);
    const updateArome=()=>{const pav=fields.type.value==='Prêt à vaper';fields.arome.disabled=pav;fields.arome.required=!pav;fields.arome.parentElement.hidden=pav;};
    fields.type.addEventListener('change',updateArome);updateArome();
    if (!f.startedAt) field('quantite','Nombre de flacons en réserve','number',f.quantite ?? 1);
    field('preparedAt','Date et heure de préparation','datetime-local',dateLocaleFlacon(f.preparedAt || f.dateOuverture || f.startedAt));
    field('steepDays','Durée de maturation (jours)','number',f.steepDays || 0);
    if (f.startedAt) {
        field('startedAt','Date et heure de début d’utilisation','datetime-local',dateLocaleFlacon(f.startedAt));
        field('dateResistance','Date du changement de résistance (facultatif)','date',MyVapeGear.resistanceDate(f) || '');
        if (MyVapeGear.find(f.materielConfigurationId)) {
            fields.dateResistance.disabled=true;
            const info=document.createElement('p');info.className='texte-secondaire';info.textContent='La date de résistance est partagée avec les flacons de cette configuration. Modifie-la depuis Matériel ou le bouton Changer ma résistance.';form.append(info);
        }
    }
    field('coutFlacon','Coût du flacon (€, facultatif)','number',f.coutFlacon ?? '');
    const note = document.createElement('p'); note.className='texte-secondaire';
    note.textContent='La date de fin de maturation est recalculée si tu modifies sa durée ou la date de préparation. Modifier le coût ici ne modifie pas les dépenses déjà enregistrées.'; form.append(note);
    const error = document.createElement('p'); error.setAttribute('role','alert'); form.append(error);
    const save = document.createElement('button'); save.type='submit'; save.className='btn-primaire'; save.textContent='Enregistrer les modifications'; form.append(save);
    const cancel = document.createElement('button'); cancel.type='button'; cancel.className='btn-secondaire'; cancel.textContent='Annuler'; cancel.onclick=()=>dialog.close(); form.append(cancel);
    form.onsubmit = event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        try {
            const index = flacons.findIndex(item => item.id === id);
            if (index < 0 || flacons[index].termine) throw Error('Ce flacon n’est plus disponible.');
            const values=Object.fromEntries(Object.entries(fields).map(([k,input])=>[k,input.value]));
            values.categoriesSaveurs=MyVapeUI.readFlavorSelect(fields.categorieSaveur);
            values.categorieSaveur=values.categoriesSaveurs[0];
            const next = corrigerFicheFlacon(flacons[index],values);
            const updated = flacons.map((item,i)=>i===index ? next : item);
            localStorage.setItem('vt_flacons',JSON.stringify(updated)); flacons = updated;
        } catch (e) {error.textContent=e.message;return;}
        dialog.close(); mettreAJourTout();
        if (typeof MyVapeUI !== 'undefined') MyVapeUI.toast('Flacon modifié');
    };
    dialog.append(form); dialog.showModal();
}
function actualiserCoutFlaconDirect() {
    const show = document.getElementById('type-direct').value === 'Prêt à vaper';
    document.getElementById('groupe-cout-direct').hidden = !show;
    document.getElementById('cout-direct').disabled = !show;
}
function proposerDepenseFlacon(flacon) {
    return new Promise(resolve => {
        const dialog = creerDialogueFlacon('Ajouter cette dépense ?');
        const text = document.createElement('p');
        text.textContent = `Souhaitez-vous ajouter cette dépense dans vos dépenses vapes ? ${flacon.coutFlacon.toFixed(2)} € pour ${flacon.nom}, le ${new Date(flacon.startedAt).toLocaleDateString('fr-FR')}.`;
        dialog.append(text);
        for (const [label,value] of [['Oui','oui'],['Non','non']]) {
            const b=document.createElement('button');b.type='button';b.className=value==='oui'?'btn-primaire':'btn-secondaire';b.textContent=label;b.onclick=()=>dialog.close(value);dialog.append(b);
        }
        dialog.addEventListener('close',()=>resolve(dialog.returnValue==='oui'),{once:true});dialog.showModal();
    });
}
function enregistrerFlaconEtDepense(flacon, ajouterDepense) {
    const nextFlacons = [flacon,...flacons];
    const nextDepenses = ajouterDepense ? [{id:crypto.randomUUID(),categorie:'E-liquide',nom:flacon.nom,montant:flacon.coutFlacon,date:flacon.startedAt},...depenses] : depenses;
    const previous = localStorage.getItem('vt_flacons');
    try {
        localStorage.setItem('vt_flacons',JSON.stringify(nextFlacons));
        if (ajouterDepense) localStorage.setItem('vt_depenses',JSON.stringify(nextDepenses));
    } catch (error) {
        try {previous===null ? localStorage.removeItem('vt_flacons') : localStorage.setItem('vt_flacons',previous);} catch {}
        throw error;
    }
    flacons=nextFlacons;depenses=nextDepenses;
}
document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('type-direct').addEventListener('change',actualiserCoutFlaconDirect);
    actualiserCoutFlaconDirect();
});
