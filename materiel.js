// Carnet personnel : les configurations désignent des montages/cartouches distincts.
const MyVapeGear = (() => {
    const KEY='vt_materiel';
    const types=['Pod','Box / clearomiseur','Autre'];
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
    const archived=pair=>pair.device.statut==='Je n’utilise plus'||pair.config.archivee===true;
    const name=pair=>`${pair.device.nom} · ${resistanceLabel(pair.config.ohms)}`;
    const refresh=()=>{mettreAJourTout();};
    function saveDevices(devices){localStorage.setItem(KEY,JSON.stringify(devices));}
    function upsertDevice(values,id=null){
        const all=read();const index=all.findIndex(d=>d.id===id);
        if(id&&index<0)throw Error('Appareil introuvable.');
        const item={...(index>=0?all[index]:{id:crypto.randomUUID(),configurations:[]}),nom:clean(values.nom),type:choice(values.type,types),statut:choice(values.statut,statuses),notes:clean(values.notes)};
        if(!item.nom)throw Error('Donne un nom à cet appareil.');
        if(index<0)all.push(item);else all[index]=item;saveDevices(all);return item.id;
    }
    function upsertConfiguration(deviceId,values,id=null){
        const all=read(),device=all.find(d=>d.id===deviceId);if(!device)throw Error('Appareil introuvable.');
        const configs=device.configurations||[];const index=configs.findIndex(c=>c.id===id);if(id&&index<0)throw Error('Configuration introuvable.');
        const item={...(index>=0?configs[index]:{}),id:id||crypto.randomUUID(),nom:resistanceLabel(number(values.ohms)),resistance:clean(values.resistance),ohms:number(values.ohms),watts:number(values.watts),tirage:choice(drawLabel(values.tirage),draws),vapeur:choice(values.vapeur,clouds),avis:choice(values.avis,reviews),notes:clean(values.notes),dateResistance:date(values.dateResistance)};
        if(!item.nom)throw Error('Donne un nom à cette configuration.');
        if(index<0)configs.push(item);else configs[index]=item;device.configurations=configs;saveDevices(all);return item.id;
    }
    function resistanceDate(f){
        if(f.termine&&f.materielResume)return f.materielDateResistance||null;
        const linked=find(f.materielConfigurationId);
        return linked ? linked.config.dateResistance||null : f.dateResistance||null;
    }
    function setResistance(id,value){
        const all=read(),pair=find(id,all);if(!pair)throw Error('Configuration introuvable.');if(archived(pair))throw Error('Réactive cette résistance et son appareil avant de changer sa date.');pair.config.dateResistance=date(value);saveDevices(all);
    }
    function associate(bottleId,configId){
        const old=flacons.find(f=>f.id===bottleId);if(!old||old.termine||!old.startedAt)throw Error('Ce flacon n’est pas entamé.');
        if(configId&&!find(configId))throw Error('Configuration introuvable.');
        if(configId&&archived(find(configId))&&configId!==old.materielConfigurationId)throw Error('Ce matériel est archivé. Réactive-le pour l’associer.');
        const next={...old};
        if(!configId){next.dateResistance=resistanceDate(old);delete next.materielConfigurationId;}
        else next.materielConfigurationId=configId;
        const updated=flacons.map(f=>f.id===bottleId?next:f);localStorage.setItem('vt_flacons',JSON.stringify(updated));flacons=updated;
    }
    function freeze(f){const pair=find(f.materielConfigurationId);if(pair){f.materielResume=name(pair);f.materielDateResistance=pair.config.dateResistance||null;}}
    function bottleLine(f){
        if(f.termine)return f.materielResume?`<p class="texte-secondaire">Matériel : ${echapperHTML(f.materielResume)}</p>`:'';
        if(!f.startedAt)return '';
        const pair=find(f.materielConfigurationId);
        return `<div class="materiel-flacon"><p class="texte-secondaire">Matériel : ${pair?echapperHTML(name(pair)+(archived(pair)?' — archivé · à remplacer':'')):'Non associé'}</p><button type="button" class="btn-secondaire btn-materiel-associer" onclick="MyVapeGear.associationDialog('${f.id}')">${pair?'Changer le matériel':'Associer du matériel'}</button></div>`;
    }
    function el(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
    function button(parent,text,action,primary=false){const b=el('button',text,primary?'btn-primaire':'btn-secondaire');b.type='button';b.onclick=action;parent.append(b);return b;}
    function modal(title,fields,onSave,note='',afterSave=null,saveLabel='Enregistrer'){
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
        const error=el('p');error.setAttribute('role','alert');form.append(error);
        const save=el('button',saveLabel,'btn-primaire');save.type='submit';form.append(save);
        button(form,'Annuler',()=>dialog.close());
        form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;try{onSave(Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value])));}catch(err){error.textContent=err.message;return;}dialog.close();refresh();if(afterSave)afterSave();};
        dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();return dialog;
    }
    function deviceDialog(id=null){
        const d=read().find(d=>d.id===id)||{};
        modal(id?'Modifier l’appareil':'Ajouter un appareil',[
            ['nom','Nom / modèle','text',d.nom],['type','Type d’appareil','select',d.type||types[0],types],['statut','Où en suis-je ?','select',d.statut||statuses[0],statuses],['notes','Ce que j’aime, ce qui me gêne, pourquoi…','textarea',d.notes]
        ],v=>upsertDevice(v,id));
    }
    function configDialog(deviceId,id=null){
        const d=read().find(d=>d.id===deviceId);if(!d)return;
        const c=(d.configurations||[]).find(c=>c.id===id)||{};
        const count=flacons.filter(f=>!f.termine&&f.materielConfigurationId===id).length;
        modal(id?'Modifier la configuration':'Ajouter une configuration',[
            ['resistance','Référence de résistance (facultatif)','text',c.resistance],['ohms','Valeur de résistance (Ω)','select',c.ohms??'', [['','Non renseignée'],...Array.from(new Set([...resistanceValues,...(c.ohms!=null?[c.ohms]:[])])).sort((a,b)=>a-b).map(v=>[String(v),`${v} Ω`])]],['watts','Puissance utilisée (W, facultatif)','number',c.watts],['tirage','Type de tirage','select',drawLabel(c.tirage)||draws[0],draws],['vapeur','Quantité de vapeur','select',c.vapeur||clouds[0],clouds],['avis','Mon avis','select',c.avis||reviews[0],reviews],['notes','Pourquoi ? Sensations, goûts, difficultés…','textarea',c.notes],['dateResistance','Dernier changement de résistance (facultatif)','date',c.dateResistance]
        ],v=>upsertConfiguration(deviceId,v,id),count?`Cette configuration est associée à ${count} flacon(s). Ses informations et sa date de résistance seront mises à jour pour chacun.`:'Crée une fiche par montage ou cartouche pour suivre séparément les résistances. MTL : vapeur en bouche puis inhalée. DTL : inhalation directe. RDL : tirage direct plus restrictif. Choisis la valeur indiquée sur ta résistance ; la liste n’indique pas la compatibilité avec ton appareil.');
    }
    function preferencesDialog(){
        const p=configUser?.preferencesMateriel||{};
        modal('Mes préférences',[
            ['tirage','Mon tirage préféré','select',drawLabel(p.tirage)||draws[0],draws],['vapeur','Ma vapeur préférée','select',p.vapeur||clouds[0],clouds],['notes','Ce que je recherche / ce que je veux éviter','textarea',p.notes]
        ],v=>{if(!configUser)throw Error('Complète d’abord ton profil.');const next={...configUser,preferencesMateriel:{tirage:choice(drawLabel(v.tirage),draws),vapeur:choice(v.vapeur,clouds),notes:clean(v.notes)}};localStorage.setItem('vt_config',JSON.stringify(next));configUser=next;});
    }
    function associationDialog(id){
        const f=flacons.find(f=>f.id===id);if(!f)return;
        const options=[['','Aucun matériel associé']];for(const d of read())for(const c of d.configurations||[]){const pair={device:d,config:c};if(!archived(pair)||c.id===f.materielConfigurationId)options.push([c.id,name(pair)+(archived(pair)?' — archivé · à remplacer':'')]);}
        const dialog=modal('Matériel de '+f.nom,[['configuration','Configuration utilisée','select',f.materielConfigurationId||'',options]],v=>associate(id,v.configuration),'Deux flacons associés à la même configuration partagent la même date de résistance. Utilise des configurations distinctes pour des cartouches distinctes.');
        button(dialog,options.length===1?'Créer mon premier matériel':'Gérer mon matériel',()=>{dialog.close();afficherEcran('ecran-materiel');});
    }
    function changeResistance(bottleId){
        const f=flacons.find(f=>f.id===bottleId);const pair=f&&find(f.materielConfigurationId);if(!pair)return false;
        if(archived(pair)){associationDialog(bottleId);return true;}
        const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const count=flacons.filter(f=>!f.termine&&f.materielConfigurationId===pair.config.id).length;
        modal('Changer la résistance',[['dateResistance','Date du changement','date',today]],v=>setResistance(pair.config.id,v.dateResistance),`${name(pair)} : cette date s’appliquera aux ${count} flacon(s) associés.`);return true;
    }
    function setArchived(deviceId,configId=null,value=true,reason=''){
        const all=read(),d=all.find(d=>d.id===deviceId);if(!d)throw Error('Appareil introuvable.');
        const target=configId?(d.configurations||[]).find(c=>c.id===configId):d;if(!target)throw Error('Résistance introuvable.');
        if(configId)target.archivee=value;else target.statut=value?'Je n’utilise plus':'J’utilise';
        if(value)target.motifArchivage=clean(reason);
        saveDevices(all);
    }
    function archiveDialog(deviceId,configId=null){
        const d=read().find(d=>d.id===deviceId);if(!d)return;
        const target=configId?(d.configurations||[]).find(c=>c.id===configId):d;if(!target)return;
        const ids=configId?[configId]:(d.configurations||[]).map(c=>c.id);
        const linked=flacons.filter(f=>!f.termine&&ids.includes(f.materielConfigurationId));
        const fields=[['motif','Pourquoi je ne l’utilise plus ? (facultatif)','textarea',target.motifArchivage]];
        if(configId&&d.statut!=='Je n’utilise plus')fields.push(['suite','Et ensuite ?','select','nouvelle',[['nouvelle','Saisir une nouvelle résistance pour cet appareil'],['archive','Archiver seulement']]]);
        let next=false;
        modal(configId?'Archiver cette résistance':'Je n’utilise plus cet appareil',fields,v=>{setArchived(deviceId,configId,true,v.motif);next=v.suite==='nouvelle';},
            (configId?'Cette résistance sera conservée dans les archives de cet appareil.':'L’appareil et ses résistances seront rangés dans les archives.')+' Tes avis et tes dates sont conservés.'+(linked.length?' Les flacons suivants garderont leur association, signalée « archivé — à remplacer » : '+linked.map(f=>f.nom).join(', ')+'. Choisis ensuite leur nouveau matériel depuis l’accueil.':''),
            ()=>{if(next)configDialog(deviceId);},'Archiver');
    }
    function restoreArchived(deviceId,configId=null){setArchived(deviceId,configId,false);refresh();}
    const openArchives=new Set();
    function archiveGroup(key,title){
        const group=el('details',null,'materiel-archives'),summary=el('summary',title);
        group.open=openArchives.has(key);summary.onclick=()=>{if(group.open)openArchives.delete(key);else openArchives.add(key);};
        group.append(summary);return group;
    }
    function render(){
        const zone=document.getElementById('contenu-materiel');if(!zone)return;zone.replaceChildren();
        const prefs=el('div',null,'carte');prefs.append(el('h3','Mes préférences'));
        const p=configUser?.preferencesMateriel;
        prefs.append(el('p',p?`${drawLabel(p.tirage)} · Vapeur : ${p.vapeur}`:'Tirage serré ou aérien, vapeur discrète ou abondante : note ce qui te convient.','texte-secondaire'));if(p?.notes)prefs.append(el('p',p.notes));button(prefs,'Modifier mes préférences',preferencesDialog);zone.append(prefs);
        button(zone,'Ajouter un appareil',()=>deviceDialog(),true);
        const all=read();if(!all.length)zone.append(el('p','Commence par ton pod ou ta box. Ajoute ensuite une configuration pour noter sa résistance et ton avis.','texte-vide'));
        const archives=archiveGroup('devices','Appareils archivés');
        for(const d of all){
            const deviceArchived=d.statut==='Je n’utilise plus';
            const card=el('article',null,'carte materiel-appareil');card.append(el('h3',d.nom),el('p',`${d.type} · ${d.statut}`,'texte-secondaire'));if(d.notes)card.append(el('p',d.notes,'materiel-note'));
            button(card,'Modifier l’appareil',()=>deviceDialog(d.id));
            if(deviceArchived){if(d.motifArchivage)card.append(el('p','Motif : '+d.motifArchivage,'materiel-note'));button(card,'Réactiver cet appareil',()=>restoreArchived(d.id));}
            else button(card,'Je n’utilise plus cet appareil',()=>archiveDialog(d.id));
            const oldConfigs=archiveGroup(d.id,'Résistances archivées');
            for(const c of d.configurations||[]){
                const conf=el('div',null,'materiel-configuration');conf.append(el('h4',resistanceLabel(c.ohms)),el('p',[c.resistance,c.watts!=null?`${c.watts} W`:''].filter(Boolean).join(' · ')||'','texte-secondaire'));
                conf.append(el('p',`${c.avis} · ${drawLabel(c.tirage)} · Vapeur : ${c.vapeur}`));if(c.notes)conf.append(el('p',c.notes,'materiel-note'));
                conf.append(el('p',c.dateResistance?'Résistance changée le '+new Date(c.dateResistance+'T12:00:00').toLocaleDateString('fr-FR'):'Aucun changement de résistance enregistré','texte-secondaire'));
                const linked=flacons.filter(f=>!f.termine&&f.materielConfigurationId===c.id);conf.append(el('p',linked.length?'Flacons associés : '+linked.map(f=>f.nom).join(', '):'Aucun flacon associé','texte-secondaire'));
                button(conf,'Modifier / noter mon avis',()=>configDialog(d.id,c.id));
                if(c.archivee){conf.append(el('p','Résistance archivée','texte-secondaire'));if(c.motifArchivage)conf.append(el('p','Motif : '+c.motifArchivage,'materiel-note'));button(conf,'Réactiver cette résistance',()=>restoreArchived(d.id,c.id));oldConfigs.append(conf);}
                else {if(!deviceArchived)button(conf,'Archiver cette résistance',()=>archiveDialog(d.id,c.id));card.append(conf);}
            }
            if((d.configurations||[]).some(c=>c.archivee))card.append(oldConfigs);
            if(!deviceArchived)button(card,'Ajouter une résistance',()=>configDialog(d.id));
            (deviceArchived?archives:zone).append(card);
        }
        if(all.some(d=>d.statut==='Je n’utilise plus'))zone.append(archives);
    }
    return {setArchived,find,resistanceDate,bottleLine,freeze,render,associate,setResistance,upsertDevice,upsertConfiguration,associationDialog,changeResistance,deviceDialog};
})();
