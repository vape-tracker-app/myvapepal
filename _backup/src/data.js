export const KEYS=['vt_config','vt_flacons','vt_recettes','vt_depenses','vt_objectifs','vt_observations','vt_date_resistance','vt_victoire_quotidienne_date'];
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
            const records=key==='vt_config'?[parsed]:parsed;
            const numeric=['cigsJour','prixPaquet','cigsPaquet','nicotineActuelle','volume','nicotine','arome','steepDays','montant','volumeTotal','volArome','volBooster','nbrFioles','volBase'];
            const text=['nom','prenom','type','categorie','titre','texte','couleur','categorieSaveur','dateArret','date','dateConstat','preparedAt','startedAt','finishedAt','dateOuverture','dateFermeture','steepReadyAt'];
            for(const record of records) {
                for(const field of numeric)if(record[field]!=null && (!((typeof record[field]==='number' || (typeof record[field]==='string' && /^\d+(?:\.\d+)?$/.test(record[field]))) && Number.isFinite(Number(record[field])) && Number(record[field])>=0)))throw Error('Nombre invalide');
                for(const field of text)if(record[field]!=null && (typeof record[field]!=='string'||record[field].length>5000))throw Error('Texte invalide');
                for(const field of ['actif','termine','vapote','personnalise'])if(record[field]!=null && typeof record[field]!=='boolean')throw Error('État invalide');
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
