/* Recherche locale et copie des conseils : une fiche sauvegardée ne dépend plus du catalogue courant. */
const MyVapeAromes = (() => {
    const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const catalog = () => catalogueAromes;
    const brand = a => catalog().marques.find(m => m.id === a.marqueId);
    const flavors = a => a.saveurIds.map(id => catalog().saveurs.find(s => s.id === id)).filter(Boolean);
    const label = a => [brand(a)?.nom, a.gamme, a.nom, a.edition].filter(Boolean).join(' · ');
    const groups = {
        fruite: 'ananas baies banane cactus cassis cerise citron citron-jaune citron-vert fraise framboise framboise-bleue fruit-de-la-passion fruit-du-dragon fruits fruits-rouges kiwi litchi mangue myrtille noix-de-coco peche pomme-verte raisin raisin-noir raisin-rouge',
        gourmand: 'avoine barbe-a-papa biscuit bonbon cafe milkshake caramel cereales creme creme-anglaise creme-brulee custard noisette pancake pop-corn vanille vanille-bourbon',
        classic: 'classic classic-blond', menthe: 'menthe menthe-verte menthol', boisson: 'the'
    };
    function categories(a) {
        const values = Object.entries(groups).filter(([,ids]) => a.saveurIds.some(id => ids.split(' ').includes(id))).map(([key]) => key);
        if (a.fraicheur === true) values.push('frais');
        return values;
    }
    function search(query = '', marque = '') {
        const words = normalize(query).split(' ').filter(Boolean);
        return catalog().aromes.filter(a => (!marque || a.marqueId === marque) && words.every(word => normalize([
            label(a), a.gamme, ...(brand(a)?.alias || []), ...flavors(a).flatMap(s => [s.nom, ...s.alias]),
            ...categories(a), a.fraicheur === true ? 'frais fraîcheur' : ''
        ].join(' ')).includes(word)));
    }
    function snapshot(a) {
        return clone({version:1, id:a.id, nom:label(a), saveurs:flavors(a).map(s => s.nom), categories:categories(a),
            fraicheur:a.fraicheur, dosages:a.dosages, maturation:a.maturation, sources:a.sources,
            pointsAVerifier:a.pointsAVerifier, notes:a.notes, catalogueDate:catalog().dateMiseAJour});
    }
    function maturation(value, preparedAt) {
        if (String(value ?? '').trim() === '') return {steepDays:null, steepReadyAt:null, maturationNonRenseignee:true};
        const days = Number(value);
        if (!Number.isSafeInteger(days) || days < 0) throw Error('Indique un nombre entier de jours de maturation, ou laisse la durée vide.');
        const ready = preparedAt ? new Date(+new Date(preparedAt) + days * 86400000) : null;
        if (ready && !Number.isFinite(+ready)) throw Error('Vérifie la date et la durée de maturation.');
        return {steepDays:days, steepReadyAt:days > 0 && ready ? ready.toISOString() : null, maturationNonRenseignee:false};
    }
    const el = (tag, text, cls) => { const e=document.createElement(tag); if(text != null)e.textContent=text; if(cls)e.className=cls; return e; };
    function button(parent, text, action) {const b=el('button',text,'btn-secondaire');b.type='button';b.onclick=action;parent.append(b);return b;}
    const range = (min,max,unit) => `${min === max ? min : min+'–'+max} ${unit}`;
    function sourceName(s, id) {return s.sources?.find(x=>x.id===id)?.type === 'fabricant' ? 'Fabricant' : 'Revendeur';}
    function details(parent, s) {
        parent.append(el('h3',s.nom),el('p',(s.saveurs || []).join(' · ')));
        for(const d of s.dosages || []) parent.append(el('p',`${sourceName(s,d.sourceId)} : ${range(d.minPourcent,d.maxPourcent,'%')}${d.ratioBase ? ` pour une base ${d.ratioBase.pg}/${d.ratioBase.vg} PG/VG` : ' · ratio PG/VG non précisé'}`));
        if(!s.dosages?.length) parent.append(el('p','Dosage non confirmé : vérifie l’indication de ton produit.'));
        const m=s.maturation;
        parent.append(el('p',m ? `${sourceName(s,m.sourceId)} · maturation : ${range(m.minJours,m.maxJours,'jours')}.` : 'Durée de maturation non renseignée.'));
        for(const note of [...(s.notes||[]),...(s.pointsAVerifier||[]).map(p=>p.motif)]) parent.append(el('p',note,'texte-secondaire'));
        for(const source of s.sources || []) {
            if(!/^https:\/\//i.test(source.url))continue;
            const a=el('a',`${source.type==='fabricant'?'Source fabricant':'Source revendeur'} · vérifiée le ${source.verifieLe}`);
            a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';parent.append(a,el('br'));
        }
    }
    function browse(onSelect) {
        const dialog=creerDialogueFlacon('Catalogue des arômes');dialog.classList.add('catalogue-aromes');
        dialog.querySelector('h2').id='titre-dialogue-aromes';dialog.setAttribute('aria-labelledby','titre-dialogue-aromes');
        dialog.append(el('p','Une sélection de références. Recherche par marque, nom ou saveurs. Les éditions restent distinctes.','texte-secondaire'));
        const q=el('input');q.type='search';q.placeholder='Café, vanille, fruits rouges…';q.setAttribute('aria-label','Rechercher un arôme');
        const select=el('select');select.setAttribute('aria-label','Filtrer par marque');
        for(const [id,name] of [['','Toutes les marques'],...catalog().marques.map(m=>[m.id,m.nom])]){const o=el('option',name);o.value=id;select.append(o);}
        const count=el('p');count.setAttribute('role','status');
        const results=el('div',null,'aromes-resultats'),detail=el('section');detail.hidden=true;
        button(dialog,'Fermer',()=>dialog.close());dialog.append(q,select,count,results,detail);
        const render=()=>{detail.hidden=true;results.hidden=false;results.replaceChildren();const matches=search(q.value,select.value);count.textContent=`${matches.length} fiche${matches.length>1?'s':''}`;
            for(const a of matches)button(results,`${label(a)} — ${flavors(a).map(s=>s.nom).join(', ')}${a.fraicheur===true?' · Frais':''}`,()=>{
                results.hidden=true;detail.hidden=false;detail.replaceChildren();button(detail,'Retour aux résultats',()=>{results.hidden=false;detail.hidden=true;});
                const s=snapshot(a);details(detail,s);
                button(detail,onSelect?'Choisir cet arôme':'Utiliser pour une recette',()=>{dialog.close();if(onSelect)onSelect(s);else chooseRecipe(s);}).className='btn-primaire';
                detail.scrollIntoView({block:'nearest'});
            });
        };
        q.oninput=render;select.onchange=render;render();dialog.showModal();q.focus();
    }
    const states = {};
    const ids = {recette:['recette-arome','recette-steep-days','recette-saveurs'],prep:['arome','flacon-steep-days','categorie-saveur'],direct:['direct-arome',null,'categorie-saveur-direct']};
    function panel(prefix) {
        const id='arome-selection-'+prefix;let box=document.getElementById(id);
        if(!box){box=el('section',null,'arome-selection');box.id=id;document.getElementById(ids[prefix][1] || ids[prefix][0]).closest('.groupe-champ')?.after(box);
            if(!box.isConnected) document.getElementById(ids[prefix][0]).after(box);}
        box.replaceChildren();const s=states[prefix];box.hidden=!s;if(!s)return;
        const d=el('details');d.append(el('summary','Arôme : '+s.nom));details(d,s);box.append(d);
        if(ids[prefix][1])box.append(el('p','La durée saisie détermine la jauge et le rappel. Vide : aucune date de fin ; 0 : sans attente.','texte-secondaire'));
        button(box,'Détacher du catalogue',()=>{states[prefix]=null;panel(prefix);});
    }
    function load(prefix, record) {
        if(!ids[prefix])return;states[prefix]=clone(record?.aromeCatalogue);panel(prefix);
        if(record?.maturationNonRenseignee && ids[prefix][1])document.getElementById(ids[prefix][1]).value='';
    }
    function chooseRecipe(s) {
        reinitialiserRecette();document.getElementById('tab-mode-creer').click();document.getElementById('form-recette').classList.remove('masque');
        states.recette=clone(s);document.getElementById('recette-nom').value=s.nom.slice(0,120);
        // Aucun dosage implicite : même un pourcentage unique dépend du ratio de base.
        document.getElementById('recette-arome').value='';document.getElementById('recette-steep-days').value='';
        MyVapeUI.setFlavorSelect(document.getElementById('recette-saveurs'),{categoriesSaveurs:s.categories.length?s.categories:['fruite']});
        panel('recette');const box=document.getElementById('arome-selection-recette');box.querySelector('details').open=true;
        box.append(el('p','Choisis ton pourcentage dans le champ Arôme après avoir vérifié la base PG/VG indiquée. Les catégories d’images proposées restent modifiables.'));
        if(s.maturation)button(box,`Choisir ${s.maturation.maxJours} jours (suggestion : borne haute de la plage)`,()=>{document.getElementById('recette-steep-days').value=s.maturation.maxJours;});
        DIYCosts.preview('recette');document.getElementById('form-recette').scrollIntoView({behavior:'smooth',block:'start'});
    }
    function validate(prefix, selection) {
        const s=states[prefix];if(!s)return;
        const dose=document.getElementById(ids[prefix][0]).value;
        if(!String(dose).trim() || !Number.isFinite(Number(dose)) || Number(dose)<=0 || Number(dose)>100)throw Error('Choisis le pourcentage d’arôme pour cette recette.');
        const lot=typeof DIYStock!=='undefined'?DIYStock.readLots().find(l=>l.id===selection?.arome):null;
        if(lot?.aromeCatalogue && lot.aromeCatalogue.id!==s.id)throw Error('Le lot d’arôme sélectionné correspond à une autre référence ou édition. Choisis le bon lot.');
    }
    function attach(record,prefix) {
        if(!ids[prefix])return record;
        if(states[prefix])record.aromeCatalogue=clone(states[prefix]);else delete record.aromeCatalogue;
        if(ids[prefix][1])Object.assign(record,maturation(document.getElementById(ids[prefix][1]).value,record.preparedAt));
        return record;
    }
    function stockPicker(form,type,nom) {
        let chosen=null;
        const section=el('div'),caption=el('p');section.append(caption);
        button(section,'Choisir dans le catalogue',()=>browse(s=>{chosen=s;nom.value=s.nom.slice(0,120);caption.textContent='Référence : '+s.nom;}));
        button(section,'Saisir sans catalogue',()=>{chosen=null;caption.textContent='';});form.prepend(section);
        const refresh=()=>{section.hidden=type.value!=='arome';};type.addEventListener('change',refresh);refresh();
        return ()=>type.value==='arome'?clone(chosen):null;
    }
    if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>{
        const anchor=document.getElementById('btn-mes-ingredients');if(anchor){const b=el('button','Explorer les arômes','btn-secondaire');b.id='btn-catalogue-aromes';b.type='button';b.onclick=()=>browse();anchor.after(b);}
    });
    return {search,snapshot,categories,maturation,load,attach,validate,browse,stockPicker,details};
})();
