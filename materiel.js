// Carnet personnel : les configurations désignent des montages/cartouches distincts.
const MyVapeGear = (() => {
    const KEY='vt_materiel';
    const types=['Pod','Box / clearomiseur','Autre'];
    const systems=['Non renseigné','Cartouche à résistance intégrée','Résistance préfabriquée remplaçable','Reconstructible'];
    const expertChoices={
        famille:['Non renseigné','RTA','RDA','RDTA','Plateau / bridge RBA','Autre'],
        source:['Non renseigné','Coil prêt à monter','Coil fabriqué soi-même','Mesh','Autre'],
        montage:['Non renseigné','Simple coil','Double coil','Autre'],
        matiere:['Non renseigné','Kanthal A1','Ni80','SS316L','SS304','Ni200','Titane','Autre'],
        construction:['Non renseigné','Fil simple','Clapton','Fused Clapton','Alien','Staple','Mesh','Autre']
    };
    const expertText=['atomiseur','coton','airflow','personnalisation'];
    const expertNumbers=['diametreFil','diametreInterieur','spires'];
    const isExpert=c=>c?.systeme==='Reconstructible';
    const statuses=['J’utilise','À tester','Je n’utilise plus'];
    const draws=['Non renseigné','Indirect (MTL)','Direct restrictif (RDL)','Direct (DTL)'];
    const drawLabel=v=>({'Serré (comme une cigarette)':'Indirect (MTL)','Intermédiaire':'Direct restrictif (RDL)','Aérien':'Direct (DTL)'}[v]||v);
    const resistanceValues=[0.1,0.15,0.16,0.17,0.18,0.2,0.25,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1,1.2,1.4,1.5,1.6,1.8,2,2.2];
    const resistanceLabel=v=>v==null?'Résistance non renseignée':`Résistance : ${Number.isInteger(Number(v))?Number(v).toFixed(1):Number(v)} Ω`;
    const clouds=['Non renseigné','Discrète','Modérée','Abondante'];
    const reviews=['Pas encore testé','J’adore','J’aime bien','Mitigé','Je n’aime pas'];
    const read=()=>JSON.parse(localStorage.getItem(KEY)||'[]');
    const clean=value=>{const s=String(value??'').trim();if(s.length>2000 || /[<>]/.test(s))throw Error('Utilise un texte de moins de 2 000 caractères, sans < ni >.');return s;};
    const choice=(v,list)=>{if(!list.includes(v))throw Error('Choisis une option proposée.');return v;};
    const date=v=>{if(!v)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)throw Error('Date invalide.');return v;};
    const number=v=>{if(v===''||v==null)return null;const n=Number(v);if(!Number.isFinite(n)||n<=0||n>10000)throw Error('Indique une valeur positive valide ou laisse le champ vide.');return n;};
    function find(id,devices=read()) {
        for(const device of devices){const config=(device.configurations||[]).find(c=>c.id===id);if(config)return {device,config};}return null;
    }
    const name=pair=>[pair.device.nom,pair.config.cartouche||pair.config.clearomiseur?.replace('|',' · ')||pair.config.reservoirManuel,...(isExpert(pair.config)?[pair.config.expert?.atomiseur,pair.config.expert?.montage!=='Non renseigné'?pair.config.expert?.montage:null]:[]),resistanceLabel(pair.config.ohms)].filter(Boolean).join(' · ');
    const refresh=()=>{mettreAJourTout();};
    function saveDevices(devices){localStorage.setItem(KEY,JSON.stringify(devices));}
    function buildDevice(values,previous=null){
        const item={
    ...(previous||{id:crypto.randomUUID(),configurations:[]}),
    nom:clean(values.nom),
    marque:clean(values.marque),
    modele:clean(values.modele),
    repere:clean(values.repere),
    type:choice(values.type,types),
    statut:choice(values.statut??previous?.statut??statuses[0],statuses),
    notes:clean(values.notes)
};
        if(!item.nom)throw Error('Donne un nom à cet appareil.');
        return item;
    }
    function upsertDevice(values,id=null){
        const all=read();const index=all.findIndex(d=>d.id===id);
        if(id&&index<0)throw Error('Appareil introuvable.');
        const item=buildDevice(values,index>=0?all[index]:null);
        if(index<0)all.push(item);else all[index]=item;saveDevices(all);return item.id;
    }
    function deleteDevice(deviceId){
    const all=read();
    const device=all.find(d=>d.id===deviceId);

    if(!device){
        throw Error('Appareil introuvable.');
    }

    const configurationIds=new Set(
        (device.configurations||[]).map(c=>c.id)
    );

    const flaconsAssocies=flacons.filter(f=>
        !f.termine &&
        configurationIds.has(f.materielConfigurationId)
    );

    if(flaconsAssocies.length){
        alert(
            `Impossible de supprimer cet appareil.\n\n` +
            `Il est encore associé à : ${flaconsAssocies.map(f=>f.nom).join(', ')}.\n\n` +
            `Change d’abord le matériel associé depuis l’accueil.`
        );
        return;
    }

    const confirme=confirm(
        `Supprimer « ${device.nom} » ?\n\n` +
        `L’appareil et ses configurations seront définitivement supprimés.`
    );

    if(!confirme)return;

    saveDevices(
        all.filter(d=>d.id!==deviceId)
    );

    delete deviceSections[deviceId];

    try{
        localStorage.setItem(
            deviceSectionsKey,
            JSON.stringify(deviceSections)
        );
    }catch{}

    refresh();
}
    function deleteConfiguration(id){
        const all=read(),pair=find(id,all);
        if(!pair || pair.config.supprimee)return;
        const linked=flacons.filter(f=>!f.termine && f.materielConfigurationId===id);
        if(linked.length){
            alert(`Impossible de supprimer cette cartouche ou ce montage : il est encore associé à ${linked.map(f=>f.nom).join(', ')}.\n\nChange d’abord le matériel associé à ces flacons depuis l’accueil.`);
            return;
        }
        const label=pair.device.type==='Pod'?'cette cartouche':'ce montage';
        if(!confirm(`Supprimer ${label} (${resistanceLabel(pair.config.ohms)}) ?\n\nIl ne figurera plus dans ton matériel. Le suivi des autres cartouches et l’historique des flacons terminés seront conservés.`))return;
        // Conserver la référence historique, mais la retirer des choix et des fiches.
        pair.config.supprimee=true;
        saveDevices(all);
        refresh();
    }
    function buildConfiguration(values,previous=null){
        const item={...(previous||{}),id:previous?.id||crypto.randomUUID(),nom:resistanceLabel(number(values.ohms)),resistance:clean(values.resistance),clearomiseur:clean(values.clearomiseur),cartouche:clean(values.cartouche),reservoirManuel:clean(values.reservoirManuel),ohms:number(values.ohms),watts:number(values.watts),tirage:choice(drawLabel(values.tirage),draws),vapeur:choice(values.vapeur,clouds),avis:choice(values.avis??previous?.avis??reviews[0],reviews),notes:clean(values.notes),dateResistance:date(values.dateResistance)};
        item.systeme=choice(values.systeme??item.systeme??systems[0],systems);
        if(isExpert(item)){
            const input=values.expert??item.expert??{},expert={};
            for(const [k,options] of Object.entries(expertChoices))expert[k]=choice(input[k]||options[0],options);
            for(const k of expertText)expert[k]=clean(input[k]);
            for(const k of expertNumbers)expert[k]=number(input[k]);
            item.expert=expert;item.dateCoton=date(values.dateCoton??item.dateCoton);
        }else{delete item.expert;delete item.dateCoton;}
        if(!item.nom)throw Error('Donne un nom à cette configuration.');
        return item;
    }
    function saveMaterial(deviceValues,configurationValues){
        const device=buildDevice(deviceValues);
        const config=buildConfiguration(configurationValues);
        device.configurations=[config];
        const all=read();all.push(device);saveDevices(all);
        return device.id;
    }
    function upsertConfiguration(deviceId,values,id=null){
        const all=read(),device=all.find(d=>d.id===deviceId);if(!device)throw Error('Appareil introuvable.');
        const configs=device.configurations||[];const index=configs.findIndex(c=>c.id===id);if(id&&index<0)throw Error('Configuration introuvable.');
        const item=buildConfiguration(values,index>=0?configs[index]:null);
        if(index<0)configs.push(item);else configs[index]=item;device.configurations=configs;saveDevices(all);return item.id;
    }
    function maintenanceInfo(c){
        if(isExpert(c))return {action:'Changer mon montage',changed:'Montage changé le ',empty:'Aucun changement de montage enregistré',dateLabel:'Date du changement de montage'};
        if(c?.systeme===systems[1])return {action:'Changer ma cartouche',changed:'Cartouche changée le ',empty:'Aucun changement de cartouche enregistré',dateLabel:'Date du changement de cartouche'};
        return {action:'Changer ma résistance',changed:'Résistance changée le ',empty:'Aucun changement de résistance enregistré',dateLabel:'Date du changement de résistance'};
    }
    const bottleMaintenance=f=>maintenanceInfo(f.termine?{systeme:f.materielSysteme}:find(f.materielConfigurationId)?.config);
    const changeLabel=f=>bottleMaintenance(f).action;
    function maintenanceText(f){
        const value=resistanceDate(f),info=bottleMaintenance(f);
        return value?info.changed+new Date(value+'T12:00:00').toLocaleDateString('fr-FR'):info.empty;
    }
    function resistanceDate(f){
        if(f.termine&&f.materielResume)return f.materielDateResistance||null;
        const linked=find(f.materielConfigurationId);
        return linked ? linked.config.dateResistance||null : f.dateResistance||null;
    }
   function setResistance(id,value){
    const all=read();
    const pair=find(id,all);

    if(!pair)throw Error('Configuration introuvable.');

    const nouvelleDate=date(value);
    const ancienneDate=pair.config.dateResistance||null;

    if(ancienneDate && nouvelleDate){
        const debut=new Date(ancienneDate+'T12:00:00');
        const fin=new Date(nouvelleDate+'T12:00:00');

        const dureeJours=Math.round(
            (fin-debut)/(1000*60*60*24)
        );

        if(dureeJours<0){
            throw Error(
                'La nouvelle date ne peut pas être antérieure au dernier changement.'
            );
        }

        if(dureeJours>=0){
            if(!Array.isArray(pair.config.historiqueResistances)){
                pair.config.historiqueResistances=[];
            }

            pair.config.historiqueResistances.push({
                debut:ancienneDate,
                fin:nouvelleDate,
                dureeJours
            });
        }
    }

    pair.config.dateResistance=nouvelleDate;
    saveDevices(all);
}
    function setCotton(id,value){
        const all=read(),pair=find(id,all);if(!pair||!isExpert(pair.config))throw Error('Choisis une configuration reconstructible.');
        const next=date(value),previous=pair.config.dateCoton;
        if(previous&&next){
            const days=Math.round((Date.parse(next+'T12:00:00Z')-Date.parse(previous+'T12:00:00Z'))/86400000);
            if(days<0)throw Error('La nouvelle date ne peut pas être antérieure au dernier changement de coton.');
            if(days>0){pair.config.historiqueCotons||=[];pair.config.historiqueCotons.push({debut:previous,fin:next,dureeJours:days});}
        }
        pair.config.dateCoton=next;saveDevices(all);
    }
    function associate(bottleId,configId){
        const old=flacons.find(f=>f.id===bottleId);if(!old||old.termine||!old.startedAt)throw Error('Ce flacon n’est pas entamé.');
        if(configId&&(!find(configId)||find(configId).config.supprimee))throw Error('Configuration introuvable.');
        const next={...old};
        if(!configId){next.dateResistance=resistanceDate(old);delete next.materielConfigurationId;}
        else next.materielConfigurationId=configId;
        const updated=flacons.map(f=>f.id===bottleId?next:f);localStorage.setItem('vt_flacons',JSON.stringify(updated));flacons=updated;
    }
    function freeze(f){const pair=find(f.materielConfigurationId);if(pair){f.materielResume=name(pair);f.materielSysteme=pair.config.systeme||systems[0];f.materielDateResistance=pair.config.dateResistance||null;if(isExpert(pair.config))f.materielDateCoton=pair.config.dateCoton||null;}}
    function bottleLine(f){
        if(f.termine)return f.materielResume?`<p class="texte-secondaire">Matériel : ${echapperHTML(f.materielResume)}</p>`:'';
        if(!f.startedAt)return '';
        const pair=find(f.materielConfigurationId);
        return `<div class="materiel-flacon"><p class="texte-secondaire">Matériel : ${pair?echapperHTML(name(pair)):'Non associé'}</p><button type="button" class="btn-secondaire btn-materiel-associer" onclick="MyVapeGear.associationDialog('${f.id}')">${pair?'Changer le matériel':'Associer du matériel'}</button>${pair&&isExpert(pair.config)?`<p class="texte-secondaire">${pair.config.dateCoton?'Coton changé le '+new Date(pair.config.dateCoton+'T12:00:00').toLocaleDateString('fr-FR'):'Coton : date non renseignée'}</p><button type="button" class="btn-secondaire" onclick="MyVapeGear.maintenanceDialog('${pair.config.id}')">Changer mon coton</button>`:''}</div>`;
    }
    function el(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
    function button(parent,text,action,primary=false){const b=el('button',text,primary?'btn-primaire':'btn-secondaire');b.type='button';b.onclick=action;parent.append(b);return b;}
    function modal(title,fields,onSave,note='',afterSave=null,saveLabel='Enregistrer',configure=null){
        const dialog=el('dialog',null,'dialog-flacon-edition');
        const heading=el('h2',title);heading.id='materiel-dialog-title';dialog.setAttribute('aria-labelledby',heading.id);dialog.append(heading);
        if(note)dialog.append(el('p',note,'texte-secondaire'));
        const form=el('form'),inputs={};
        for(const [key,label,type,value,options] of fields){
            const group=el('label',label,'groupe-champ'),input=el(options?'select':type==='textarea'?'textarea':'input');
            if(options)for(const opt of options){const [v,t]=Array.isArray(opt)?opt:[opt,opt];const o=el('option',t);o.value=v;input.append(o);}
            else if(type!=='textarea')input.type=type;
            input.name=key;input.value=value??'';if(type==='number'){input.step='any';input.min='0.01';input.max='10000';}
            if(type==='text'||type==='textarea')input.maxLength=2000;
            if(type==='textarea')input.rows=3;
            input.required=key==='nom';group.append(input);form.append(group);inputs[key]=input;
        }
        if(configure)configure(form,inputs);
        const error=el('p');error.setAttribute('role','alert');form.append(error);
        const save=el('button',saveLabel,'btn-primaire');save.type='submit';form.append(save);
        button(form,'Annuler',()=>dialog.close());
        form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;try{onSave(Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value])));}catch(err){error.textContent=err.message;return;}dialog.close();refresh();if(afterSave)afterSave();};
        dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();return dialog;
    }
    const deviceSectionsKey='mvp_materiel_sections';
    const deviceSections=(()=>{try{return JSON.parse(localStorage.getItem(deviceSectionsKey)||'{}')||{};}catch{return {};}})();
    function rememberDevice(id,open){deviceSections[id]=open;try{localStorage.setItem(deviceSectionsKey,JSON.stringify(deviceSections));}catch{}}
    const typeLabel=type=>type==='Box / clearomiseur'?'Box':type;
    function deviceIcon(type){
        if(type==='Autre'){const icon=el('span','⚙️','icone-appareil');icon.setAttribute('aria-hidden','true');return icon;}
        const icon=el('img',null,'icone-appareil');icon.src=type==='Pod'?'assets/menu/pod.png':'assets/menu/materiel.png';icon.alt='';icon.width=52;icon.height=52;return icon;
    }
    function deviceTypePicker(select){
        select.hidden=true;
        const trigger=el('button',null,'champ-saveur champ-appareil');trigger.type='button';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
        const paint=()=>{trigger.replaceChildren(deviceIcon(select.value),el('span',typeLabel(select.value)),el('span','⌄','fleche-saveur'));trigger.setAttribute('aria-label','Type d’appareil : '+typeLabel(select.value));};
        paint();select.after(trigger);
        trigger.onclick=()=>{
            const dialog=el('dialog',null,'dialog-saveurs');dialog.setAttribute('aria-labelledby','choix-appareil-titre');
            const title=el('h2','Choisir mon appareil');title.id='choix-appareil-titre';dialog.append(title);
            const list=el('div',null,'liste-choix-saveurs');let draft=select.value;const options=[];
            const update=()=>options.forEach(([value,b])=>{b.classList.toggle('selectionnee',value===draft);b.setAttribute('aria-pressed',String(value===draft));});
            for(const type of types){const b=el('button',null,'choix-saveur-option');b.type='button';b.append(deviceIcon(type),el('span',typeLabel(type)),el('span','✓','selection-saveur'));b.onclick=()=>{draft=type;update();};options.push([type,b]);list.append(b);}
            update();dialog.append(list);
            const actions=el('div',null,'actions-choix-appareil');button(actions,'OK',()=>{select.value=draft;select.dispatchEvent(new Event('change',{bubbles:true}));paint();dialog.close();},true);button(actions,'Annuler',()=>dialog.close());dialog.append(actions);
            dialog.addEventListener('close',()=>{dialog.remove();trigger.setAttribute('aria-expanded','false');trigger.focus();},{once:true});document.body.append(dialog);trigger.setAttribute('aria-expanded','true');dialog.showModal();
        };
    }
    function deviceDialog(id=null){
    const d=read().find(d=>d.id===id)||{};
    let editor;

    const getMarques=()=>{
        return Object.keys(catalogueMateriel)
            .filter(marque=>
                (catalogueMateriel[marque]||[]).some(m=>
                    m.type==='pod' || m.type==='box'
                )
            )
            .sort((a,b)=>a.localeCompare(b,'fr'));
    };

    const getModeles=marque=>{
        if(!marque || !catalogueMateriel[marque]) return [];

        return catalogueMateriel[marque]
            .filter(m=>m.type==='pod' || m.type==='box')
            .map(m=>m.modele)
            .sort((a,b)=>a.localeCompare(b,'fr'));
    };

    const trouverAppareilCatalogue=(marque,modele)=>{
        if(!marque || !modele || !catalogueMateriel[marque]) return null;

        return catalogueMateriel[marque].find(m=>
            m.modele===modele &&
            (m.type==='pod' || m.type==='box')
        )||null;
    };

    modal(id?'Modifier l’appareil':'Ajouter mon matériel',[
        ['type','Type d’appareil','select',d.type||types[0],types.map(t=>[t,typeLabel(t)])],
        ['marque','Marque','select',d.marque||'',[['','Choisir une marque']]],
        ['marqueManuelle','Saisir la marque','text',''],
        ['modele','Modèle','select',d.modele||'',[['','Choisir un modèle']]],
        ['modeleManuel','Saisir le modèle','text',''],
        ['repere','Mon repère (facultatif)','text',d.repere],
        ['nom','Nom / modèle','text',d.nom],
        ['notes','Ce que j’aime, ce qui me gêne, pourquoi…','textarea',d.notes]
    ],v=>{
        v.marque=clean(v.marque==='__autre__'?v.marqueManuelle:v.marque);
        v.modele=clean(v.modele==='__autre__'?v.modeleManuel:v.modele);
        const ancienSansMarque=id && !v.marque && !v.modele && d.nom;
        if(!ancienSansMarque && (!v.marque || !v.modele)){
            throw Error('Renseigne la marque et le modèle de cet appareil.');
        }
        const appareil=trouverAppareilCatalogue(v.marque,v.modele);
        if(appareil)v.type=appareil.type==='pod'?'Pod':'Box / clearomiseur';
        if(v.marque && v.modele){
            v.nom=`${v.marque} - ${v.modele}`+(clean(v.repere)?` · ${clean(v.repere)}`:'');
        }

        const saved=id?upsertDevice(v,id):saveMaterial(v,editor.values());
        if(!id)rememberDevice(saved,true);
    },'',null,id?'Enregistrer':'Enregistrer mon matériel',(form,inputs)=>{

        const groupeType=inputs.type.parentElement;
        const groupeMarque=inputs.marque.parentElement;
        const groupeModele=inputs.modele.parentElement;
        const groupeNom=inputs.nom.parentElement;
        const groupeRepere=inputs.repere.parentElement;
        const apercuType=el('div',null,'champ-saveur champ-appareil');
apercuType.hidden=true;

groupeModele.after(apercuType);

const actualiserApercuType=appareil=>{
    apercuType.replaceChildren();

    if(!appareil){
        apercuType.hidden=true;
        return;
    }

    const type=appareil.type==='pod'
        ? 'Pod'
        : 'Box / clearomiseur';

    apercuType.append(
        deviceIcon(type),
        el('span',typeLabel(type))
    );

    apercuType.hidden=false;
};

        /*
         * Le type Pod / Box est déterminé automatiquement
         * par le modèle choisi dans le catalogue.
         */
        groupeType.hidden=true;
        inputs.type.disabled=false;

        groupeMarque.hidden=false;
        groupeModele.hidden=false;
        groupeRepere.hidden=false;
        groupeNom.hidden=true;

        inputs.marque.disabled=false;
        inputs.modele.disabled=false;
        inputs.repere.disabled=false;
        inputs.nom.disabled=true;

        const remplirSelect=(select,options,placeholder)=>{
            select.replaceChildren();

            const vide=el('option',placeholder);
            vide.value='';
            select.append(vide);

            for(const value of options){
                const option=el('option',value);
                option.value=value;
                select.append(option);
            }
        };

        const trouverAppareilExistant=()=>{
            if(d.marque && d.modele){
                return {
                    marque:d.marque,
                    modele:d.modele
                };
            }

            if(!d.nom){
                return {
                    marque:'',
                    modele:''
                };
            }

            for(const [marque,modeles] of Object.entries(catalogueMateriel)){
                const trouve=modeles.find(m=>
                    (m.type==='pod' || m.type==='box') &&
                    (
                        d.nom===m.modele ||
                        d.nom===`${marque} ${m.modele}`
                    )
                );

                if(trouve){
                    return {
                        marque,
                        modele:trouve.modele
                    };
                }
            }

            return {
                marque:'',
                modele:''
            };
        };

        const ajouterAutre=(select,label)=>{
            const option=el('option',label);
            option.value='__autre__';
            select.append(option);
        };
        const actualiserType=()=>{
            const marqueManuelle=inputs.marque.value==='__autre__';
            const modeleManuel=inputs.modele.value==='__autre__';
            for(const [input,visible] of [[inputs.marqueManuelle,marqueManuelle],[inputs.modeleManuel,modeleManuel]]){
                input.parentElement.hidden=!visible;
                input.disabled=!visible;
                input.required=visible;
            }
            const appareil=trouverAppareilCatalogue(inputs.marque.value,inputs.modele.value);
            groupeType.hidden=!!appareil || (!modeleManuel && !d.nom);
            if(appareil)inputs.type.value=appareil.type==='pod'?'Pod':'Box / clearomiseur';
            actualiserApercuType(appareil);
            editor?.refresh();
        };
        const actualiserModeles=(modeleSelectionne='')=>{
            const modeles=getModeles(inputs.marque.value);
            remplirSelect(inputs.modele,modeles,'Choisir un modèle');
            ajouterAutre(inputs.modele,'Autre modèle');
            inputs.modele.disabled=!inputs.marque.value;
            inputs.modeleManuel.value='';
            if(modeles.includes(modeleSelectionne)){
                inputs.modele.value=modeleSelectionne;
            }else if(modeleSelectionne || inputs.marque.value==='__autre__'){
                inputs.modele.value='__autre__';
                inputs.modeleManuel.value=modeleSelectionne;
            }
            actualiserType();
        };
        const marques=getMarques();
        remplirSelect(inputs.marque,marques,'Choisir une marque');
        ajouterAutre(inputs.marque,'Autre marque');
        const existant=trouverAppareilExistant();
        if(marques.includes(existant.marque)){
            inputs.marque.value=existant.marque;
        }else if(existant.marque){
            inputs.marque.value='__autre__';
            inputs.marqueManuelle.value=existant.marque;
        }
        // Les anciens appareils sans marque conservent leur nom éditable.
        const ancienSansMarque=!!d.nom && !existant.marque;
        groupeNom.hidden=!ancienSansMarque;
        inputs.nom.disabled=!ancienSansMarque;
        inputs.marque.required=!ancienSansMarque;
        inputs.modele.required=!ancienSansMarque;
        actualiserModeles(existant.modele);
        inputs.marque.addEventListener('change',()=>{
            actualiserModeles();
            if(inputs.marque.value==='__autre__')inputs.marqueManuelle.focus();
        });
        inputs.modele.addEventListener('change',()=>{
            actualiserType();
            if(inputs.modele.value==='__autre__')inputs.modeleManuel.focus();
        });
        if(!id){
            editor=configurationEditor(form,()=>({
                type:inputs.type.value,
                marque:inputs.marque.value==='__autre__'?inputs.marqueManuelle.value.trim():inputs.marque.value,
                modele:inputs.modele.value==='__autre__'?inputs.modeleManuel.value.trim():inputs.modele.value
            }));
            for(const input of [inputs.marqueManuelle,inputs.modeleManuel])input.addEventListener('change',()=>editor.refresh());
            inputs.type.addEventListener('change',()=>editor.refresh());
        }

    });
}
    // Le même éditeur sert à l'ajout complet et à la modification d'un montage.
    function configurationEditor(form,getDevice,initial={}){
        const area=el('fieldset',null,'materiel-editeur');
        area.append(el('legend','Ce que j’utilise avec cet appareil'));
        form.append(area);
        const inputs={};
        const field=(key,label,type='text',value='',options=null,parent=area)=>{
            const group=el('label',null,'groupe-champ');
            const caption=el('span',label);
            const input=el(options?'select':'input');
            if(!options)input.type=type;
            input.name='montage_'+key;
            if(type==='number'){input.min='0.000001';input.max='10000';input.step='any';}
            if(type==='text')input.maxLength=2000;
            group.append(caption,input);parent.append(group);inputs[key]=input;
            if(options)fill(input,options);
            input.value=value??'';
            return input;
        };
        function fill(input,options){input.replaceChildren();for(const opt of options){const [value,label]=Array.isArray(opt)?opt:[opt,opt];const o=el('option',label);o.value=value;input.append(o);}}
        const show=(key,visible)=>{inputs[key].parentElement.hidden=!visible;inputs[key].disabled=!visible;};
        field('usage','Qu’utilises-tu sur cet appareil ?','select','',[
            ['','Choisir'],['clearo','Un réservoir avec une résistance toute faite (clearomiseur)'],
            ['ato','Un montage reconstructible (atomiseur ou dripper)'],['inconnu','Je ne sais pas encore']
        ]);
        field('marqueReservoir','Marque du réservoir','select','',[]);
        field('piece','Cartouche','select','',[]);
        field('pieceManuelle','Nom de la cartouche / du réservoir (facultatif)');
        field('systeme','Que remplaces-tu quand c’est usé ?','select',systems[0],[
            [systems[0],'Je ne sais pas encore'],[systems[1],'Toute la cartouche'],
            [systems[2],'Une résistance toute faite'],[systems[3],'Le coil et le coton (reconstructible)']
        ]);
        field('atomiseur','Marque et modèle de l’atomiseur (facultatif)');
        field('coil','Résistance','select','',[]);
        const wattsHint=el('p','','texte-secondaire');area.append(wattsHint);
        field('resistance','Référence de la résistance / du coil (facultatif)');
        field('ohms','Valeur de résistance (Ω, facultatif)','number');
        field('watts','Puissance utilisée (W, facultatif)','number');
        field('dateResistance','Dernier changement (facultatif)','date');
        field('dateCoton','Dernier changement de coton (facultatif)','date');
        const expert=el('details',null,'materiel-expert');expert.append(el('summary','Détails du montage (facultatifs)'));area.append(expert);
        const labels={famille:'Famille d’atomiseur',source:'Origine du coil',montage:'Nombre de coils',matiere:'Matière',construction:'Construction',diametreFil:'Diamètre du fil (mm)',diametreInterieur:'Diamètre intérieur (mm)',spires:'Nombre de spires',coton:'Coton utilisé',airflow:'Airflow',personnalisation:'Précisions'};
        for(const [key,options] of Object.entries(expertChoices))field(key,labels[key],'select',options[0],options,expert);
        for(const key of expertNumbers)field(key,labels[key],'number','',null,expert);
        for(const key of expertText.filter(k=>k!=='atomiseur'))field(key,labels[key],'text','',null,expert);
        const opinion=el('details',null,'materiel-expert');opinion.append(el('summary','Mes préférences et notes (facultatives)'));area.append(opinion);
        field('tirage','Tirage','select',drawLabel(initial.tirage)||draws[0],draws,opinion);
        field('vapeur','Vapeur','select',initial.vapeur||clouds[0],clouds,opinion);
        field('notes','Mes notes','text',initial.notes||'',null,opinion);
        const unknownNote=el('p','Tu pourras compléter ces informations plus tard.','texte-secondaire');area.append(unknownNote);
        let device,parts=[],coils=[],part=null,key=null;
        const isPod=()=>device.type==='Pod';
        const system=()=>inputs.usage.value==='ato'?systems[3]:inputs.usage.value==='inconnu'?systems[0]:part?(part.resistanceIntegree?systems[1]:systems[2]):isPod()?inputs.systeme.value:systems[2];
        const selectedCoil=()=>coils.find(c=>c.key===inputs.coil.value);
        const update=()=>{
            const usage=inputs.usage.value,unknown=usage==='inconnu';
            const active=!!usage&&(!['pod','clearo'].includes(usage)||!!inputs.piece.value);
            const reconstructible=system()===systems[3];
            show('marqueReservoir',usage==='clearo');show('piece',usage==='pod'||usage==='clearo');
            inputs.piece.parentElement.firstChild.textContent=isPod()?'Quelle cartouche utilises-tu ?':'Modèle du clearomiseur';
            show('pieceManuelle',(active&&inputs.piece.value==='__autre__'&&!reconstructible)||unknown);
            show('systeme',usage==='pod'&&inputs.piece.value==='__autre__');
            show('atomiseur',reconstructible);
            show('coil',!!part);inputs.coil.required=!!part;
            show('resistance',active&&!unknown&&!part);
            show('ohms',active&&!unknown&&!part);
            const appareil=(catalogueMateriel[device.marque]||[]).find(a=>a.modele===device.modele);
            show('watts',active&&!unknown&&!(isPod()&&appareil?.puissanceReglable===false));
            show('dateResistance',active&&!unknown);show('dateCoton',reconstructible);
            const info=maintenanceInfo({systeme:system()});
            inputs.dateResistance.parentElement.firstChild.textContent=info.dateLabel+' (facultatif)';
            expert.hidden=!reconstructible;unknownNote.hidden=!unknown;
            for(const k of [...Object.keys(expertChoices),...expertNumbers,...expertText.filter(k=>k!=='atomiseur')])inputs[k].disabled=!reconstructible;
            wattsHint.textContent=selectedCoil()?.puissance?'Plage conseillée : '+selectedCoil().puissance:'';
        };
        const loadCoils=()=>{
            part=parts.find(p=>(p.reference||p.modele)===inputs.piece.value)||null;
            coils=[];
            if(part){
                const source=part.resistanceIntegree?part.variantes:(catalogueResistances[part.familleResistance]||[]);
                coils=source.filter(r=>!part.resistancesCompatibles||part.resistancesCompatibles.includes(`${r.reference}|${r.valeur}`)).map(r=>({
                    key:`${r.reference||part.reference}|${r.valeur}`,resistance:r.reference||part.reference,ohms:String(r.valeur),puissance:r.puissance||''
                }));
            }
            fill(inputs.coil,[['','Choisir une résistance'],...coils.map(r=>[r.key,`${r.resistance} · ${r.ohms} Ω`])]);update();
        };
        const loadParts=()=>{
            parts=isPod()?(catalogueCartouches[device.marque]||[]).filter(p=>p.appareilsCompatibles?.includes(device.modele)):(catalogueClearomiseurs[inputs.marqueReservoir.value]||[]);
            fill(inputs.piece,[['',isPod()?'Choisir une cartouche':'Choisir un clearomiseur'],...parts.map(p=>p.reference||p.modele),['__autre__',isPod()?'Autre cartouche':'Autre modèle']]);
            if(!parts.length)inputs.piece.value='__autre__';
            loadCoils();
        };
        const restore=()=>{
            for(const k of ['resistance','ohms','watts','dateResistance','dateCoton'])inputs[k].value=initial[k]??'';
            for(const k of [...Object.keys(expertChoices),...expertText,...expertNumbers])if(initial.expert?.[k]!=null)inputs[k].value=initial.expert[k];
            inputs.systeme.value=initial.systeme||systems[0];
            inputs.pieceManuelle.value=initial.reservoirManuel||'';
            if(!isPod()&&initial.clearomiseur){
                const [brand,model]=initial.clearomiseur.split('|');
                if(model&&(catalogueClearomiseurs[brand]||[]).some(p=>p.modele===model)){
                    inputs.marqueReservoir.value=brand;loadParts();inputs.piece.value=model;
                }else{inputs.marqueReservoir.value='__autre__';loadParts();inputs.pieceManuelle.value=initial.reservoirManuel||(initial.clearomiseur==='__autre__'?'':initial.clearomiseur);}
            }else if(isPod()&&initial.resistance){
                const previous=parts.find(p=>p.reference===initial.cartouche)||parts.find(p=>p.resistanceIntegree?p.reference===initial.resistance:(catalogueResistances[p.familleResistance]||[]).some(r=>r.reference===initial.resistance&&Number(r.valeur)===Number(initial.ohms)));
                if(previous)inputs.piece.value=previous.reference;
                else inputs.piece.value='__autre__';
            }
            loadCoils();
            const coil=coils.find(r=>r.resistance===initial.resistance&&Number(r.ohms)===Number(initial.ohms));
            if(coil)inputs.coil.value=coil.key;
            // Une ancienne résistance absente du catalogue reste modifiable en saisie libre.
            if(part&&initial.resistance&&!coil){inputs.pieceManuelle.value=initial.cartouche||initial.clearomiseur||part.reference||part.modele;inputs.piece.value='__autre__';loadCoils();}
            update();
        };
        const refresh=()=>{
            device=getDevice();const nextKey=JSON.stringify([device.type,device.marque,device.modele]);
            if(nextKey===key)return;
            const first=key===null;key=nextKey;
            area.hidden=!device.marque||!device.modele;area.disabled=area.hidden;
            for(const k of ['pieceManuelle','resistance','ohms','watts','dateResistance','dateCoton','atomiseur'])inputs[k].value='';
            inputs.systeme.value=systems[0];
            inputs.usage.value=isPod()?'pod':first&&isExpert(initial)?'ato':first&&initial.clearomiseur?'clearo':first&&initial.systeme===systems[0]?'inconnu':'';
            // L'option pod est interne : la question ne s'affiche que pour les boxes/autres appareils.
            if(isPod())fill(inputs.usage,[['pod','Cartouche']]);
            else fill(inputs.usage,[['','Choisir'],['clearo','Un réservoir avec une résistance toute faite (clearomiseur)'],['ato','Un montage reconstructible (atomiseur ou dripper)'],['inconnu','Je ne sais pas encore']]);
            inputs.usage.value=isPod()?'pod':first&&isExpert(initial)?'ato':first&&initial.clearomiseur?'clearo':first&&initial.systeme===systems[0]?'inconnu':'';
            show('usage',!isPod());inputs.usage.required=!isPod();
            fill(inputs.marqueReservoir,[['','Choisir une marque'],...Object.keys(catalogueClearomiseurs).sort((a,b)=>a.localeCompare(b,'fr')),['__autre__','Autre marque']]);
            loadParts();if(first)restore();update();
        };
        inputs.usage.addEventListener('change',()=>{loadParts();update();});
        inputs.marqueReservoir.addEventListener('change',loadParts);
        inputs.piece.addEventListener('change',loadCoils);
        inputs.coil.addEventListener('change',update);inputs.systeme.addEventListener('change',update);
        refresh();
        return {refresh,values(){
            const usage=inputs.usage.value;if(!usage)throw Error('Choisis ce que tu utilises sur cet appareil.');
            if((usage==='pod'||usage==='clearo')&&!inputs.piece.value)throw Error('Choisis une cartouche ou un réservoir, ou la saisie manuelle.');
            if(usage==='clearo'&&!inputs.marqueReservoir.value)throw Error('Choisis la marque du réservoir ou « Autre marque ».');
            const coil=selectedCoil();if(part&&!coil)throw Error('Choisis la résistance utilisée.');
            const values={systeme:system(),cartouche:isPod()&&part?part.reference:'',clearomiseur:usage==='clearo'&&part?`${inputs.marqueReservoir.value}|${part.modele}`:'',reservoirManuel:inputs.pieceManuelle.disabled?'':inputs.pieceManuelle.value};
            for(const k of ['resistance','ohms','watts','dateResistance','dateCoton','tirage','vapeur','notes'])values[k]=inputs[k].disabled?'':inputs[k].value;
            if(coil){values.resistance=coil.resistance;values.ohms=coil.ohms;}
            values.expert=Object.fromEntries([...Object.keys(expertChoices),...expertText,...expertNumbers].map(k=>[k,inputs[k].value]));
            return values;
        }};
    }
    function configDialog(deviceId,id=null){
        const d=read().find(d=>d.id===deviceId);if(!d)return;
        const c=(d.configurations||[]).find(c=>c.id===id)||{};
        let editor;
        modal(id?'Modifier ce que j’utilise':'Ajouter une autre cartouche / un montage',[],()=>upsertConfiguration(deviceId,editor.values(),id),
            'Chaque cartouche ou montage distinct garde son propre suivi. Les flacons associés partagent les dates de ce montage.',null,'Enregistrer',
            form=>{editor=configurationEditor(form,()=>d,c);});
    }

    function associationDialog(id){
        const f=flacons.find(f=>f.id===id);if(!f)return;
        const options=[['','Aucun matériel associé']];

for(const d of read()){
    for(const c of (d.configurations||[]).filter(c=>!c.supprimee)){
        options.push([
            c.id,
            name({device:d,config:c})
        ]);
    }
}
        const dialog=modal('Matériel de '+f.nom,[['configuration','Configuration utilisée','select',f.materielConfigurationId||'',options]],v=>associate(id,v.configuration),'Les flacons associés à la même cartouche ou au même montage partagent ses dates d’entretien.');
        button(dialog,options.length===1?'Créer mon premier matériel':'Gérer mon matériel',()=>{dialog.close();afficherEcran('ecran-materiel');});
    }
    function maintenanceDialog(id,initial='coton'){
        const pair=find(id);if(!pair)return;
        const cotton=isExpert(pair.config)&&initial==='coton';
        const info=maintenanceInfo(pair.config);
        const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const count=flacons.filter(f=>!f.termine&&f.startedAt&&f.materielConfigurationId===id).length;
        modal(cotton?'Changer mon coton':info.action,[['date','Date du changement','date',today]],v=>{
            if(!v.date)throw Error('Indique la date du changement.');
            if(cotton)setCotton(id,v.date);else setResistance(id,v.date);
        },`La date saisie sera partagée par les ${count} flacon(s) en cours associés.`+(isExpert(pair.config)?' Les dates de montage et de coton restent indépendantes.':''),null,'Enregistrer',
        (form,inputs)=>{inputs.date.required=true;});
    }
    function changeResistance(bottleId){
        const f=flacons.find(f=>f.id===bottleId);const pair=f&&!f.termine&&find(f.materielConfigurationId);if(!pair)return false;
        maintenanceDialog(pair.config.id,'coil');return true;
    }

    function render(){
    const zone=document.getElementById('contenu-materiel');
    if(!zone)return;
    zone.replaceChildren();

    button(zone,'Ajouter mon matériel',()=>deviceDialog(),true);

    const all=read();

    if(!all.length){
        zone.append(
            el(
                'p',
                'Ajoute ton pod ou ta box avec sa cartouche ou son montage, en une seule fois.',
                'texte-vide'
            )
        );
    }

    for(const d of all){
        const shell=el(
            'details',
            null,
            'materiel-appareil materiel-repliable'
        );

        shell.open=deviceSections[d.id]===true;

        const summary=el('summary');
        const heading=el('span',null,'materiel-entete-texte');

        heading.append(
            el('strong',d.nom),
            el(
                'span',
                typeLabel(d.type),
                'texte-secondaire'
            )
        );

        const chevron=el('span',null,'repliable-chevron');
        chevron.setAttribute('aria-hidden','true');

        summary.append(
            deviceIcon(d.type),
            heading,
            chevron
        );

        shell.append(summary);

        shell.addEventListener('toggle',()=>{
            if(shell.isConnected){
                rememberDevice(d.id,shell.open);
            }
        });

        const card=el('div',null,'materiel-contenu');
        shell.append(card);

        if(d.notes){
            card.append(el('p',d.notes,'materiel-note'));
        }

        button(
            card,
            'Modifier l’appareil',
            ()=>deviceDialog(d.id)
        );
        button(
    card,
    'Supprimer l’appareil',
    ()=>deleteDevice(d.id)
);

        for(const c of (d.configurations||[]).filter(c=>!c.supprimee)){
            const conf=el(
                'div',
                null,
                'materiel-configuration'
            );

            conf.append(
                el('h4',isExpert(c)?'Mon montage':c.systeme===systems[1]?'Ma cartouche':'Ma résistance'),
                el(
                    'p',
                    [
                        c.cartouche||c.clearomiseur?.replace('|',' · ')||c.reservoirManuel||c.expert?.atomiseur,
                        c.resistance!==c.cartouche?c.resistance:'',
                        c.ohms!=null?`${c.ohms} Ω`:'',
                        c.watts!=null ? `${c.watts} W` : ''
                    ].filter(Boolean).join(' · ')||'',
                    'texte-secondaire'
                )
            );

            const preferences=[
                c.tirage && c.tirage!=='Non renseigné' ? drawLabel(c.tirage) : '',
                c.vapeur && c.vapeur!=='Non renseigné' ? `Vapeur : ${c.vapeur}` : ''
            ].filter(Boolean);
            if(preferences.length){
                conf.append(el('p',preferences.join(' · ')));
            }

            if(c.notes){
                conf.append(el('p',c.notes,'materiel-note'));
            }

            conf.append(
                el(
                    'p',
                    c.dateResistance
                        ? (
                            maintenanceInfo(c).changed
                        ) +
                        new Date(
                            c.dateResistance+'T12:00:00'
                        ).toLocaleDateString('fr-FR')
                        : maintenanceInfo(c).empty,
                    'texte-secondaire'
                )
            );
            if(
    Array.isArray(c.historiqueResistances) &&
    c.historiqueResistances.length
){
    const historique=el(
        'details',
        null,
        'materiel-expert'
    );

    historique.append(
        el(
            'summary',
            `Historique des changements (${c.historiqueResistances.length})`
        )
    );

    const durees=[];

    for(
        const entree of [...c.historiqueResistances].reverse()
    ){
        if(
            !entree.debut ||
            !entree.fin ||
            !Number.isFinite(Number(entree.dureeJours))
        ){
            continue;
        }

        const jours=Number(entree.dureeJours);
        durees.push(jours);

        const debut=new Date(
            entree.debut+'T12:00:00'
        ).toLocaleDateString('fr-FR');

        const fin=new Date(
            entree.fin+'T12:00:00'
        ).toLocaleDateString('fr-FR');

        historique.append(
            el(
                'p',
                `${debut} → ${fin} · ${jours} jour${jours>1?'s':''}`,
                'texte-secondaire'
            )
        );
    }

    if(durees.length){
        const moyenne=
            durees.reduce((total,j)=>total+j,0) /
            durees.length;

        historique.append(
            el(
                'p',
                `Durée moyenne : ${moyenne.toLocaleString(
                    'fr-FR',
                    {maximumFractionDigits:1}
                )} jour${moyenne>1?'s':''}`,
                'materiel-note'
            )
        );
    }

    conf.append(historique);
}

            if(c.systeme && c.systeme!==systems[0]){
                conf.append(
                    el(
                        'p',
                        c.systeme,
                        'texte-secondaire'
                    )
                );
            }

            if(isExpert(c)){
                conf.append(
                    el(
                        'p',
                        c.dateCoton
                            ? 'Coton changé le ' +
                              new Date(
                                  c.dateCoton+'T12:00:00'
                              ).toLocaleDateString('fr-FR')
                            : 'Coton : date non renseignée',
                        'texte-secondaire'
                    )
                );

                const details=el(
                    'details',
                    null,
                    'materiel-expert'
                );

                details.append(
                    el(
                        'summary',
                        'Détails du montage'
                    )
                );

                const labels={
                    atomiseur:'Atomiseur',
                    famille:'Famille',
                    source:'Origine',
                    montage:'Montage',
                    matiere:'Matière',
                    construction:'Construction',
                    diametreFil:'Fil (mm)',
                    diametreInterieur:'Diamètre intérieur (mm)',
                    spires:'Spires par coil',
                    coton:'Coton',
                    airflow:'Airflow',
                    personnalisation:'Précisions'
                };

                let filled=false;

                for(const [k,label] of Object.entries(labels)){
                    const value=c.expert?.[k];

                    if(
                        value!=null &&
                        value!=='' &&
                        value!=='Non renseigné'
                    ){
                        details.append(
                            el(
                                'p',
                                `${label} : ${value}`,
                                'materiel-note'
                            )
                        );

                        filled=true;
                    }
                }

                if(!filled){
                    details.append(
                        el(
                            'p',
                            'Aucun détail renseigné.',
                            'texte-secondaire'
                        )
                    );
                }

                conf.append(details);

                if(c.historiqueCotons?.length){
                    const history=el('details',null,'materiel-expert');
                    history.append(el('summary',`Historique du coton (${c.historiqueCotons.length})`));
                    for(const entry of [...c.historiqueCotons].reverse()){
                        history.append(el('p',`${new Date(entry.debut+'T12:00:00').toLocaleDateString('fr-FR')} → ${new Date(entry.fin+'T12:00:00').toLocaleDateString('fr-FR')} · ${entry.dureeJours} jour(s)`,'texte-secondaire'));
                    }
                    conf.append(history);
                }

                button(
                    conf,
                    'Changer mon coton',
                    ()=>maintenanceDialog(c.id)
                );
            }

            button(conf,maintenanceInfo(c).action,()=>maintenanceDialog(c.id,'coil'),true);

            const linked=flacons.filter(
                f=>
                    !f.termine &&
                    f.materielConfigurationId===c.id
            );

            conf.append(
                el(
                    'p',
                    linked.length
                        ? 'Flacons associés : ' +
                          linked.map(f=>f.nom).join(', ')
                        : 'Aucun flacon associé',
                    'texte-secondaire'
                )
            );

            button(
                conf,
                'Modifier la cartouche / le montage',
                ()=>configDialog(d.id,c.id)
            );

            button(conf,d.type==='Pod'?'Supprimer ma cartouche':'Supprimer mon montage',()=>deleteConfiguration(c.id));

            card.append(conf);
        }

        button(
            card,
            (d.configurations||[]).some(c=>!c.supprimee)?'Ajouter une autre cartouche / un montage':'Compléter mon matériel',
            ()=>configDialog(d.id)
        );

        zone.append(shell);
    }
}
    return {deleteConfiguration,saveMaterial,maintenanceText,changeLabel,setCotton,maintenanceDialog,find,resistanceDate,bottleLine,freeze,render,associate,setResistance,upsertDevice,upsertConfiguration,associationDialog,changeResistance,deviceDialog,deleteDevice};
})();
