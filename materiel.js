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
    const archived=pair=>pair.device.statut==='Je n’utilise plus'||pair.config.archivee===true;
    const name=pair=>[pair.device.nom,...(isExpert(pair.config)?[pair.config.expert?.atomiseur,pair.config.expert?.montage!=='Non renseigné'?pair.config.expert?.montage:null]:[]),resistanceLabel(pair.config.ohms)].filter(Boolean).join(' · ');
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
        item.systeme=choice(values.systeme??item.systeme??systems[0],systems);
        if(isExpert(item)){
            const input=values.expert??item.expert??{},expert={};
            for(const [k,options] of Object.entries(expertChoices))expert[k]=choice(input[k]||options[0],options);
            for(const k of expertText)expert[k]=clean(input[k]);
            for(const k of expertNumbers)expert[k]=number(input[k]);
            item.expert=expert;item.dateCoton=date(values.dateCoton??item.dateCoton);
        }else{delete item.expert;delete item.dateCoton;}
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
    function setCotton(id,value){
        const all=read(),pair=find(id,all);if(!pair||!isExpert(pair.config))throw Error('Choisis une configuration reconstructible.');
        if(archived(pair))throw Error('Réactive ce matériel avant de changer sa date.');
        pair.config.dateCoton=date(value);saveDevices(all);
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
    function freeze(f){const pair=find(f.materielConfigurationId);if(pair){f.materielResume=name(pair);f.materielDateResistance=pair.config.dateResistance||null;if(isExpert(pair.config))f.materielDateCoton=pair.config.dateCoton||null;}}
    function bottleLine(f){
        if(f.termine)return f.materielResume?`<p class="texte-secondaire">Matériel : ${echapperHTML(f.materielResume)}</p>`:'';
        if(!f.startedAt)return '';
        const pair=find(f.materielConfigurationId);
        return `<div class="materiel-flacon"><p class="texte-secondaire">Matériel : ${pair?echapperHTML(name(pair)+(archived(pair)?' — archivé · à remplacer':'')):'Non associé'}</p><button type="button" class="btn-secondaire btn-materiel-associer" onclick="MyVapeGear.associationDialog('${f.id}')">${pair?'Changer le matériel':'Associer du matériel'}</button>${pair&&isExpert(pair.config)?`<p class="texte-secondaire">${pair.config.dateCoton?'Coton changé le '+new Date(pair.config.dateCoton+'T12:00:00').toLocaleDateString('fr-FR'):'Coton : date non renseignée'}</p><button type="button" class="btn-secondaire" onclick="MyVapeGear.maintenanceDialog('${pair.config.id}')">Entretien du montage</button>`:''}</div>`;
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
        modal(id?'Modifier l’appareil':'Ajouter un appareil',[
            ['nom','Nom / modèle','text',d.nom],['type','Type d’appareil','select',d.type||types[0],types],['statut','Où en suis-je ?','select',d.statut||statuses[0],statuses],['notes','Ce que j’aime, ce qui me gêne, pourquoi…','textarea',d.notes]
        ],v=>{const saved=upsertDevice(v,id);if(!id)rememberDevice(saved,true);},'',null,'Enregistrer',(_form,inputs)=>deviceTypePicker(inputs.type));
    }
    function configDialog(deviceId,id=null){
        const d=read().find(d=>d.id===deviceId);if(!d)return;
        const c=(d.configurations||[]).find(c=>c.id===id)||{};
        const count=flacons.filter(f=>!f.termine&&f.materielConfigurationId===id).length;
        const x=c.expert||{};
        const fields=[
            ['systeme','Système de résistance','select',c.systeme||systems[0],systems],
            ['resistance','Référence de résistance / coil (facultatif)','text',c.resistance],
            ['ohms','Valeur de résistance (Ω)','select',c.ohms??'', [['','Non renseignée'],...Array.from(new Set([...resistanceValues,...(c.ohms!=null?[c.ohms]:[])])).sort((a,b)=>a-b).map(v=>[String(v),`${v} Ω`])]],
            ['ohmsExpert','Résistance totale mesurée du montage (Ω, facultatif)','number',c.ohms],
            ['watts','Puissance utilisée (W, facultatif)','number',c.watts],
            ['tirage','Type de tirage','select',drawLabel(c.tirage)||draws[0],draws],
            ['vapeur','Quantité de vapeur','select',c.vapeur||clouds[0],clouds],
            ['avis','Mon avis','select',c.avis||reviews[0],reviews],
            ['notes','Pourquoi ? Sensations, goûts, difficultés…','textarea',c.notes],
            ['dateResistance','Dernier changement de résistance / coil (facultatif)','date',c.dateResistance],
            ['dateCoton','Dernier changement de coton (facultatif)','date',c.dateCoton],
            ['atomiseur','Marque et modèle de l’atomiseur','text',x.atomiseur],
            ...Object.entries(expertChoices).map(([k,options])=>[k,({famille:'Famille d’atomiseur',source:'Origine du montage',montage:'Nombre de coils',matiere:'Matière du fil / mesh',construction:'Construction du fil / mesh'})[k],'select',x[k]||options[0],options]),
            ['diametreFil','Diamètre du fil (mm, facultatif)','number',x.diametreFil],
            ['diametreInterieur','Diamètre intérieur du coil (mm, facultatif)','number',x.diametreInterieur],
            ['spires','Nombre de spires par coil (facultatif)','number',x.spires],
            ['coton','Coton utilisé (facultatif)','text',x.coton],
            ['airflow','Réglage de l’airflow (facultatif)','text',x.airflow],
            ['personnalisation','Autre montage / détails personnalisés (AWG, composition, mesh…)','textarea',x.personnalisation]
        ];
        modal(id?'Modifier la configuration':'Ajouter une configuration',fields,v=>{
            const expert=Object.fromEntries([...Object.keys(expertChoices),...expertText,...expertNumbers].map(k=>[k,v[k]]));
            upsertConfiguration(deviceId,{...v,ohms:v.systeme==='Reconstructible'?v.ohmsExpert:v.ohms,expert},id);
        },count?`Cette configuration est associée à ${count} flacon(s). Les modifications se répercutent sur ces flacons.`:'Une fiche par cartouche ou montage. Les détails experts sont facultatifs : renseigne tes propres mesures et références.',null,'Enregistrer',(form,inputs)=>{
            const details=el('details',null,'materiel-expert');details.append(el('summary','Configuration experte · reconstructible'));
            details.append(el('p','Atomiseur, montage, fil et coton : conserve les détails utiles pour retrouver ta configuration. « Autre » permet de décrire un matériel absent des listes.','texte-secondaire'));
            for(const k of ['atomiseur','famille','source','montage','matiere','construction',...expertNumbers,'coton','airflow','personnalisation'])details.append(inputs[k].parentElement);
            inputs.ohmsExpert.min='0.000001';
            form.append(details);
            const update=()=>{
                const expert=inputs.systeme.value==='Reconstructible';
                inputs.ohms.parentElement.hidden=expert;inputs.ohms.disabled=expert;
                for(const k of ['ohmsExpert','dateCoton']){inputs[k].parentElement.hidden=!expert;inputs[k].disabled=!expert;}
                details.hidden=!expert;for(const k of [...Object.keys(expertChoices),...expertText,...expertNumbers])inputs[k].disabled=!expert;
            };
            inputs.systeme.addEventListener('change',()=>{update();if(inputs.systeme.value==='Reconstructible')details.open=true;});
            details.open=isExpert(c);update();
        });
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
    function maintenanceDialog(id,initial='coton'){
        const pair=find(id);if(!pair||!isExpert(pair.config))return;
        if(archived(pair)){alert('Réactive ce matériel avant de renseigner son entretien.');return;}
        const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        modal('Entretien du montage',[
            ['action','Élément remplacé','select',initial,[['coton','Le coton uniquement'],['coil','Le coil / mesh uniquement']]],
            ['date','Date du remplacement','date',today]
        ],v=>{if(v.action==='coton')setCotton(id,v.date);else setResistance(id,v.date);},'Les deux dates sont indépendantes. Le suivi est partagé par les flacons associés à ce montage.');
    }
    function changeResistance(bottleId){
        const f=flacons.find(f=>f.id===bottleId);const pair=f&&find(f.materielConfigurationId);if(!pair)return false;
        if(archived(pair)){associationDialog(bottleId);return true;}
        if(isExpert(pair.config)){maintenanceDialog(pair.config.id,'coil');return true;}
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
            const shell=el('details',null,'materiel-appareil materiel-repliable');shell.open=deviceSections[d.id]===true;
            const summary=el('summary'),heading=el('span',null,'materiel-entete-texte');heading.append(el('strong',d.nom),el('span',`${typeLabel(d.type)} · ${d.statut}`,'texte-secondaire'));
            const chevron=el('span',null,'repliable-chevron');chevron.setAttribute('aria-hidden','true');summary.append(deviceIcon(d.type),heading,chevron);shell.append(summary);
            shell.addEventListener('toggle',()=>{if(shell.isConnected)rememberDevice(d.id,shell.open);});
            const card=el('div',null,'materiel-contenu');shell.append(card);if(d.notes)card.append(el('p',d.notes,'materiel-note'));
            button(card,'Modifier l’appareil',()=>deviceDialog(d.id));
            if(deviceArchived){if(d.motifArchivage)card.append(el('p','Motif : '+d.motifArchivage,'materiel-note'));button(card,'Réactiver cet appareil',()=>restoreArchived(d.id));}
            else button(card,'Je n’utilise plus cet appareil',()=>archiveDialog(d.id));
            const oldConfigs=archiveGroup(d.id,'Résistances archivées');
            for(const c of d.configurations||[]){
                const conf=el('div',null,'materiel-configuration');conf.append(el('h4',resistanceLabel(c.ohms)),el('p',[c.resistance,c.watts!=null?`${c.watts} W`:''].filter(Boolean).join(' · ')||'','texte-secondaire'));
                conf.append(el('p',`${c.avis} · ${drawLabel(c.tirage)} · Vapeur : ${c.vapeur}`));if(c.notes)conf.append(el('p',c.notes,'materiel-note'));
                conf.append(el('p',c.dateResistance?(isExpert(c)?'Coil / mesh changé le ':'Résistance changée le ')+new Date(c.dateResistance+'T12:00:00').toLocaleDateString('fr-FR'):'Aucun changement de résistance enregistré','texte-secondaire'));
                if(c.systeme&&c.systeme!==systems[0])conf.append(el('p',c.systeme,'texte-secondaire'));
                if(isExpert(c)){
                    conf.append(el('p',c.dateCoton?'Coton changé le '+new Date(c.dateCoton+'T12:00:00').toLocaleDateString('fr-FR'):'Coton : date non renseignée','texte-secondaire'));
                    const details=el('details',null,'materiel-expert');details.append(el('summary','Détails du montage'));
                    const labels={atomiseur:'Atomiseur',famille:'Famille',source:'Origine',montage:'Montage',matiere:'Matière',construction:'Construction',diametreFil:'Fil (mm)',diametreInterieur:'Diamètre intérieur (mm)',spires:'Spires par coil',coton:'Coton',airflow:'Airflow',personnalisation:'Précisions'};
                    let filled=false;for(const [k,label] of Object.entries(labels)){const value=c.expert?.[k];if(value!=null&&value!==''&&value!=='Non renseigné'){details.append(el('p',`${label} : ${value}`,'materiel-note'));filled=true;}}
                    if(!filled)details.append(el('p','Aucun détail renseigné.','texte-secondaire'));conf.append(details);
                    if(!deviceArchived&&!c.archivee)button(conf,'Entretien coil / coton',()=>maintenanceDialog(c.id));
                }
                const linked=flacons.filter(f=>!f.termine&&f.materielConfigurationId===c.id);conf.append(el('p',linked.length?'Flacons associés : '+linked.map(f=>f.nom).join(', '):'Aucun flacon associé','texte-secondaire'));
                button(conf,'Modifier / noter mon avis',()=>configDialog(d.id,c.id));
                if(c.archivee){conf.append(el('p','Résistance archivée','texte-secondaire'));if(c.motifArchivage)conf.append(el('p','Motif : '+c.motifArchivage,'materiel-note'));button(conf,'Réactiver cette résistance',()=>restoreArchived(d.id,c.id));oldConfigs.append(conf);}
                else {if(!deviceArchived)button(conf,'Archiver cette résistance',()=>archiveDialog(d.id,c.id));card.append(conf);}
            }
            if((d.configurations||[]).some(c=>c.archivee))card.append(oldConfigs);
            if(!deviceArchived)button(card,'Ajouter une résistance',()=>configDialog(d.id));
            (deviceArchived?archives:zone).append(shell);
        }
        if(all.some(d=>d.statut==='Je n’utilise plus'))zone.append(archives);
    }
    return {setCotton,maintenanceDialog,setArchived,find,resistanceDate,bottleLine,freeze,render,associate,setResistance,upsertDevice,upsertConfiguration,associationDialog,changeResistance,deviceDialog};
})();
