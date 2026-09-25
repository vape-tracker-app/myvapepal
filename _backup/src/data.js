export const KEYS=['vt_config','vt_flacons','vt_recettes','vt_depenses','vt_objectifs','vt_observations','vt_materiel','vt_stock_diy','vt_stock_mouvements','vt_gazette_favoris','vt_date_resistance','vt_victoire_quotidienne_date'];
export function validate(snapshot) {
    if(!snapshot || snapshot.version!==1 || !snapshot.data || typeof snapshot.data!=='object' || Array.isArray(snapshot.data))throw Error('Sauvegarde incompatible');
    if(new TextEncoder().encode(JSON.stringify(snapshot)).length>750000)throw Error('Sauvegarde trop volumineuse');
    const data={};
    for(const key of KEYS) {
        const value=snapshot.data[key];
        if(value==null){data[key]=null;continue;}
        if(typeof value!=='string')throw Error('Sauvegarde invalide');
        if(key==='vt_date_resistance' || key==='vt_victoire_quotidienne_date') {
            if(!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)))throw Error('Date invalide');
        } else {
            const parsed=JSON.parse(value);
            if(key==='vt_config') {
                if(!parsed || typeof parsed!=='object' || Array.isArray(parsed) || typeof parsed.dateArret!=='string' || !Number.isFinite(Date.parse(parsed.dateArret)))throw Error('Profil invalide');
            } else if(!Array.isArray(parsed) || parsed.length>10000 || parsed.some(v=>!v || typeof v!=='object' || Array.isArray(v)))throw Error('Liste invalide');
            if(key==='vt_flacons')for(const flacon of parsed) {
                if(flacon.quantite!==undefined && (!Number.isSafeInteger(flacon.quantite) || flacon.quantite<1 || flacon.quantite>100))throw Error('Quantité invalide');
            }
            if(key==='vt_flacons'||key==='vt_recettes')for(const flacon of parsed) {
                if(flacon.categoriesSaveurs!==undefined && (!Array.isArray(flacon.categoriesSaveurs) || flacon.categoriesSaveurs.length<1 || flacon.categoriesSaveurs.length>7 || flacon.categoriesSaveurs.some(k=>!['fruite','gourmand','classic','menthe','frais','boisson','autre'].includes(k))))throw Error('Saveurs invalides');
            }
            if(key==='vt_gazette_favoris' && (parsed.length>500 || parsed.some(v=>typeof v.id!=='string'||!/^[a-z0-9_-]{1,100}$/.test(v.id)||Object.keys(v).some(k=>k!=='id'))))throw Error('Favoris invalides');
            if(key==='vt_stock_diy'){
                const ids=new Set();
                for(const lot of parsed){
                    if(typeof lot.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(lot.id)||ids.has(lot.id))throw Error('Lot invalide');ids.add(lot.id);
                    if(!['arome','base','booster','frais','sucre'].includes(lot.type)||typeof lot.nom!=='string'||!lot.nom.trim()||lot.nom.length>120)throw Error('Ingrédient invalide');
                    if(typeof lot.volumeInitial!=='number'||!Number.isFinite(lot.volumeInitial)||lot.volumeInitial<=0||lot.volumeInitial>1e9||typeof lot.volumeRestant!=='number'||!Number.isFinite(lot.volumeRestant)||lot.volumeRestant<0||lot.volumeRestant>lot.volumeInitial+1e-7)throw Error('Quantité de stock invalide');
                    if(lot.prixTotal!==null&&(typeof lot.prixTotal!=='number'||!Number.isFinite(lot.prixTotal)||lot.prixTotal<0||lot.prixTotal>1e9))throw Error('Prix de stock invalide');
                    if(typeof lot.dateAchat!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(lot.dateAchat)||!Number.isFinite(Date.parse(lot.dateAchat))||new Date(lot.dateAchat).toISOString().slice(0,10)!==lot.dateAchat)throw Error('Date d’achat invalide');
                    if(lot.gouttesParMl!==undefined&&(typeof lot.gouttesParMl!=='number'||!Number.isFinite(lot.gouttesParMl)||lot.gouttesParMl<=0||lot.gouttesParMl>1e9))throw Error('Conversion des gouttes invalide');
                    if(lot.type==='booster'&&(typeof lot.tauxBooster!=='number'||!Number.isFinite(lot.tauxBooster)||lot.tauxBooster<=0||lot.tauxBooster>1e9))throw Error('Taux de booster invalide');
                }
            }
            if(key==='vt_stock_mouvements')for(const m of parsed){
                if(typeof m.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(m.id)||!['correction','preparation','ajustement'].includes(m.type)||typeof m.nom!=='string'||m.nom.length>5000||typeof m.date!=='string'||!Number.isFinite(Date.parse(m.date)))throw Error('Mouvement de stock invalide');
                if(m.type==='correction'){
                    if(typeof m.lotId!=='string'||!['avant','apres'].every(k=>typeof m[k]==='number'&&Number.isFinite(m[k])&&m[k]>=0)||typeof m.motif!=='string'||m.motif.length>300)throw Error('Correction de stock invalide');
                }else{
                    if(typeof m.annule!=='boolean'||!Number.isInteger(m.quantite)||m.quantite<1||m.quantite>100||typeof m.flaconId!=='string'||!Array.isArray(m.usages)||m.usages.length>5||!m.apresFlacon||typeof m.apresFlacon!=='object'||Array.isArray(m.apresFlacon)||m.apresFlacon.id!==m.flaconId)throw Error('Préparation de stock invalide');
                    if(m.avantFlacon!==null&&(!m.avantFlacon||typeof m.avantFlacon!=='object'||Array.isArray(m.avantFlacon)||m.avantFlacon.id!==m.flaconId))throw Error('Historique de stock invalide');
                    for(const u of m.usages)if(!u||typeof u.lotId!=='string'||typeof u.volume!=='number'||!Number.isFinite(u.volume)||u.volume<=0)throw Error('Consommation de stock invalide');
                }
            }
            if(key==='vt_materiel') {
                const ids=new Set();
                const validId=id=>{if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||ids.has(id))throw Error('Identifiant matériel invalide');ids.add(id);};
                const short=v=>typeof v==='string'&&v.length<=2000;
                if(parsed.length>1000)throw Error('Trop de matériels');
                for(const device of parsed){
                    validId(device.id);
                    if(device.motifArchivage!==undefined&&!short(device.motifArchivage))throw Error('Motif d’archivage invalide');
                    if(!short(device.nom)||!device.nom.trim()||!['Pod','Box / clearomiseur','Autre'].includes(device.type)||!['J’utilise','À tester','Je n’utilise plus'].includes(device.statut)||!short(device.notes)||!Array.isArray(device.configurations)||device.configurations.length>1000)throw Error('Matériel invalide');
                    for(const c of device.configurations){
                        if(!c||typeof c!=='object'||Array.isArray(c))throw Error('Configuration invalide');validId(c.id);
                        if(c.systeme!==undefined&&!['Non renseigné','Cartouche à résistance intégrée','Résistance préfabriquée remplaçable','Reconstructible'].includes(c.systeme))throw Error('Système de résistance invalide');
                        if(c.dateCoton!=null&&(typeof c.dateCoton!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(c.dateCoton)||!Number.isFinite(Date.parse(c.dateCoton))||new Date(c.dateCoton).toISOString().slice(0,10)!==c.dateCoton))throw Error('Date de coton invalide');
                        if(c.expert!==undefined){
                            const x=c.expert;
                            if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Montage expert invalide');
                            const options={famille:['Non renseigné','RTA','RDA','RDTA','Plateau / bridge RBA','Autre'],source:['Non renseigné','Coil prêt à monter','Coil fabriqué soi-même','Mesh','Autre'],montage:['Non renseigné','Simple coil','Double coil','Autre'],matiere:['Non renseigné','Kanthal A1','Ni80','SS316L','SS304','Ni200','Titane','Autre'],construction:['Non renseigné','Fil simple','Clapton','Fused Clapton','Alien','Staple','Mesh','Autre']};
                            for(const [k,list] of Object.entries(options))if(x[k]!==undefined&&!list.includes(x[k]))throw Error('Choix de montage invalide');
                            for(const k of ['atomiseur','coton','airflow','personnalisation'])if(x[k]!==undefined&&!short(x[k]))throw Error('Détail du montage invalide');
                            for(const k of ['diametreFil','diametreInterieur','spires'])if(x[k]!=null&&(typeof x[k]!=='number'||!Number.isFinite(x[k])||x[k]<=0||x[k]>10000))throw Error('Mesure du montage invalide');
                        }
                        if(c.archivee!==undefined&&typeof c.archivee!=='boolean')throw Error('Archivage invalide');
                        if(c.motifArchivage!==undefined&&!short(c.motifArchivage))throw Error('Motif d’archivage invalide');
                        if(!short(c.nom)||!c.nom.trim()||!short(c.resistance)||!short(c.notes)||!['Non renseigné','Serré (comme une cigarette)','Intermédiaire','Aérien','Indirect (MTL)','Direct restrictif (RDL)','Direct (DTL)'].includes(c.tirage)||!['Non renseigné','Discrète','Modérée','Abondante'].includes(c.vapeur)||!['Pas encore testé','J’adore','J’aime bien','Mitigé','Je n’aime pas'].includes(c.avis))throw Error('Configuration invalide');
                        for(const field of ['ohms','watts'])if(c[field]!=null&&(typeof c[field]!=='number'||!Number.isFinite(c[field])||c[field]<=0||c[field]>10000))throw Error('Valeur de matériel invalide');
                        if(c.dateResistance!=null&&(typeof c.dateResistance!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(c.dateResistance)||!Number.isFinite(Date.parse(c.dateResistance))||new Date(c.dateResistance).toISOString().slice(0,10)!==c.dateResistance))throw Error('Date de résistance invalide');
                    }
                }
            }
            if(key==='vt_config'&&parsed.preferencesMateriel!==undefined){
                const pref=parsed.preferencesMateriel;
                if(!pref||typeof pref!=='object'||!['Non renseigné','Serré (comme une cigarette)','Intermédiaire','Aérien','Indirect (MTL)','Direct restrictif (RDL)','Direct (DTL)'].includes(pref.tirage)||!['Non renseigné','Discrète','Modérée','Abondante'].includes(pref.vapeur)||typeof pref.notes!=='string'||pref.notes.length>2000)throw Error('Préférences matériel invalides');
            }
            const records=key==='vt_config'?[parsed]:parsed;
            const numeric=['coutFlacon','cigsJour','prixPaquet','cigsPaquet','nicotineActuelle','volume','nicotine','arome','steepDays','montant','volumeTotal','volArome','volBooster','nbrFioles','volBase'];
            const text=['nom','prenom','type','categorie','titre','texte','couleur','categorieSaveur','dateArret','date','dateConstat','preparedAt','startedAt','finishedAt','dateOuverture','dateFermeture','steepReadyAt','dateResistance','materielConfigurationId','materielResume','materielDateResistance','materielDateCoton'];
            for(const record of records) {
                if(record.additifs!==undefined){
                    if(!record.additifs||typeof record.additifs!=='object'||Array.isArray(record.additifs))throw Error('Additifs invalides');
                    for(const [k,a] of Object.entries(record.additifs))if(!['frais','sucre'].includes(k)||!a||typeof a!=='object'||Array.isArray(a)||!['gouttes','gouttesParMl'].every(f=>typeof a[f]==='number'&&Number.isFinite(a[f])&&a[f]>0&&a[f]<=1e9))throw Error('Dosage additif invalide');
                }
                if(record.coutDIY!==undefined){
                    const c=record.coutDIY;
                    if(!c||typeof c!=='object'||Array.isArray(c)||!c.prix||typeof c.prix!=='object'||Array.isArray(c.prix)||typeof c.tauxBooster!=='number'||!Number.isFinite(c.tauxBooster)||c.tauxBooster<=0)throw Error('Coût DIY invalide');
                    if(c.stockSelection!==undefined){if(!c.stockSelection||typeof c.stockSelection!=='object'||Array.isArray(c.stockSelection)||Object.entries(c.stockSelection).some(([k,v])=>!['arome','base','booster','frais','sucre'].includes(k)||typeof v!=='string'||(v!==''&&!/^[a-zA-Z0-9_-]{1,100}$/.test(v))))throw Error('Sélection de stock invalide');}
                    for(const [key,p] of Object.entries(c.prix)){
                        if(!['arome','base','booster','frais','sucre'].includes(key)||!p||typeof p!=='object'||typeof p.volume!=='number'||!Number.isFinite(p.volume)||p.volume<=0||typeof p.prix!=='number'||!Number.isFinite(p.prix)||p.prix<0||(p.nom!==undefined&&(typeof p.nom!=='string'||p.nom.length>120)))throw Error('Prix DIY invalide');
                    }
                }

                for(const field of numeric)if(record[field]!=null && (!((typeof record[field]==='number' || (typeof record[field]==='string' && /^\d+(?:\.\d+)?$/.test(record[field]))) && Number.isFinite(Number(record[field])) && Number(record[field])>=0)))throw Error('Nombre invalide');
                for(const field of text)if(record[field]!=null && (typeof record[field]!=='string'||record[field].length>5000))throw Error('Texte invalide');
                for(const field of ['actif','termine','vapote','personnalise','coutPartiel','origineDIY'])if(record[field]!=null && typeof record[field]!=='boolean')throw Error('État invalide');
            }
            // Les écrans historiques utilisent du HTML : refuser le balisage entrant.
            const check=v=>{
                if(typeof v==='string' && /[<>]/.test(v))throw Error('Texte invalide dans la sauvegarde');
                if(v && typeof v==='object')for(const [k,x] of Object.entries(v)) {
                    if(['__proto__','constructor','prototype'].includes(k))throw Error('Champ invalide');
                    if(k==='id' && !/^[a-zA-Z0-9_-]{1,100}$/.test(String(x)))throw Error('Identifiant invalide');
                    check(x);
                }
            };check(parsed);
        }
        data[key]=value;
    }
    return {version:1,data};
}
export function capture(storage) {return validate({version:1,data:Object.fromEntries(KEYS.map(k=>[k,storage.getItem(k)]))});}
export function equal(a,b){return JSON.stringify(validate(a))===JSON.stringify(validate(b));}
export function hasData(snapshot){return !!snapshot.data.vt_config || KEYS.some(k=>k!=='vt_config' && snapshot.data[k] && snapshot.data[k]!=='[]');}
// Journal préalable : récupération possible si l'écriture locale échoue à mi-parcours.
export function restore(storage,snapshot) {
    const clean=validate(snapshot),before=Object.fromEntries(KEYS.map(k=>[k,storage.getItem(k)]));
    storage.setItem('mvp_restore_rollback',JSON.stringify(before));
    try {
        for(const key of KEYS)clean.data[key]===null?storage.removeItem(key):storage.setItem(key,clean.data[key]);
        storage.removeItem('mvp_restore_rollback');
    } catch(error) {
        for(const key of KEYS)try{before[key]===null?storage.removeItem(key):storage.setItem(key,before[key]);}catch{}
        throw error;
    }
}
export function recover(storage) {
    const raw=storage.getItem('mvp_restore_rollback');if(!raw)return;
    const previous=JSON.parse(raw);
    for(const key of KEYS)previous[key]==null?storage.removeItem(key):storage.setItem(key,previous[key]);
    storage.removeItem('mvp_restore_rollback');
}
