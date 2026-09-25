import {createService} from './firebase-service.js';
import {capture,validate,equal,hasData,restore,recover} from './data.js';
let client=null,user=null,remote=null,ready=false,busy=false,timer,baseline=null,epoch=0;
const $=id=>document.getElementById(id);
function status(text){if($('backup-status'))$('backup-status').textContent=text;}
function meta(){try{return JSON.parse(localStorage.getItem('mvp_backup_meta')||'null');}catch{return null;}}
function remember(snapshot,row){localStorage.setItem('mvp_backup_meta',JSON.stringify({user:user.id,revision:row.revision,snapshot,updatedAt:row.updated_at}));}
function panel(){
    if(!$('backup-login'))return;
    $('backup-login').hidden=!!user;
    $('backup-session').hidden=!user;
    $('backup-email-connected').textContent=user?.email||'';
    const name=typeof configUser!=='undefined'?configUser?.prenom:'';
    $('backup-greeting').hidden=!user;
    $('backup-greeting').textContent=user?`Bonjour ${name||'à toi'} 🌸`:'';
    $('libelle-profil').textContent=user?(name||'Mon compte'):'Profil';
    $('backup-signout').hidden=!user;
    $('backup-verification').hidden=!user||user.verified;
    $('backup-signout').disabled=busy;
    $('backup-keep').disabled=busy;
    $('backup-restore').disabled=busy;
    $('backup-save').disabled=busy||!ready;
}
function decision(show){$('backup-choice').hidden=!show;}
async function loadRemote(){
    const row=await client.read(user.id);
    if(row)validate(row.payload);
    return row;
}
async function reconcile(){
    if(!user||busy)return;
    if(!user.verified){ready=false;status('Vérifie ton adresse grâce au mail reçu, puis clique sur « J’ai confirmé mon adresse ». Pense à consulter tes spams ou courriers indésirables. Aucune donnée n’est encore sauvegardée en ligne.');panel();return;}
    busy=true;ready=false;const ticket=epoch;
    try{
        status('Vérification de ta sauvegarde…');const row=await loadRemote();if(ticket!==epoch)return;
        remote=row;const local=capture(localStorage),saved=meta();
        if(row && equal(local,row.payload)) {
            remember(local,row);baseline=local;ready=true;decision(false);status('Sauvegarde à jour · '+new Date(row.updated_at).toLocaleString('fr-FR'));
        } else if(saved?.user===user.id && row && saved.revision===row.revision) {
            baseline=saved.snapshot;ready=true;decision(false);status('Modifications à sauvegarder…');
        } else {
            decision(true);$('backup-restore').hidden=!row;$('backup-keep').hidden=!hasData(local);
            $('backup-choice-text').textContent=row
                ?'Une sauvegarde existe pour ce compte. Choisis les données à conserver sur cet appareil. Aucune donnée ne sera remplacée sans ton accord.'
                :'Veux-tu activer la sauvegarde automatique de ton parcours actuel ?';
            status('Connectée · sauvegarde automatique en attente de ton choix');
        }
    }catch(error){const code=typeof error?.code==='string'?error.code:((['Profil invalide','Nombre invalide','Texte invalide','Liste invalide','Date invalide','État invalide','Identifiant invalide','Texte invalide dans la sauvegarde','Sauvegarde trop volumineuse'].includes(error?.message))?error.message:'donnees-locales');status('Sauvegarde indisponible ('+code+'). Tes données restent sur cet appareil.');}
    finally{busy=false;panel();if(ready)changed();}
}
export function changed(){
    if(!client||!user)return;panel();
    if(!ready){if(user.verified&&!busy&&!remote)try{$('backup-keep').hidden=!hasData(capture(localStorage));}catch{}return;}
    clearTimeout(timer);
    try{if(baseline && equal(capture(localStorage),baseline))return;}catch{status('Certaines données ne peuvent pas être sauvegardées. Elles restent sur cet appareil.');return;}
    status('Modifications à sauvegarder…');timer=setTimeout(save,1800);
}
async function save(){
    if(!ready||busy||!user)return;
    busy=true;panel();const ticket=epoch;
    try{
        const snapshot=capture(localStorage);
        if(baseline && equal(snapshot,baseline)){status('Sauvegarde à jour · '+new Date(remote.updated_at).toLocaleString('fr-FR'));return;}
        if(!hasData(snapshot)){status('Aucun parcours à sauvegarder pour le moment.');return;}
        status('Sauvegarde en cours…');
        const saved=await client.save(user.id,snapshot,remote?.revision||0);
        if(ticket!==epoch)return;
        if(!saved){ready=false;status('La sauvegarde a changé sur un autre appareil. Vérifie les versions avant de continuer.');setTimeout(reconcile,0);return;}
        remote=saved;remember(snapshot,remote);baseline=snapshot;
        status('Sauvegarde à jour · '+new Date(remote.updated_at).toLocaleString('fr-FR'));
    }catch{status('Sauvegarde en attente. Tes données restent sur cet appareil ; nouvel essai au retour de la connexion.');}
    finally{busy=false;panel();}
}
async function keepLocal(){
    if(busy||!user)return;
    if(remote && !confirm('Remplacer la sauvegarde en ligne par les données de ce téléphone ? Les autres appareils devront choisir cette version pour la récupérer.'))return;
    ready=true;decision(false);await save();
}
async function restoreRemote(){
    if(busy||!remote)return;
    if(!confirm('Remplacer les données de cet appareil par la sauvegarde en ligne ? Une copie de sécurité locale sera conservée avant le remplacement.'))return;
    try{
        localStorage.setItem('mvp_before_restore',JSON.stringify(capture(localStorage)));
        restore(localStorage,remote.payload);remember(remote.payload,remote);
        location.reload();
    }catch{status('Restauration impossible. Tes données précédentes sont conservées.');}
}
async function signout(){
    if(busy)return;
    ++epoch;ready=false;clearTimeout(timer);
    try{await client.logout();}catch{status('Déconnexion non terminée. Réessaie.');return;}
    user=null;remote=null;baseline=null;localStorage.removeItem('mvp_backup_meta');decision(false);panel();
    status('Déconnectée. Les données de ce téléphone sont conservées ; la sauvegarde automatique est arrêtée.');
}
async function init(){
    $('backup-login').onsubmit=event=>event.preventDefault();
    $('backup-undo').hidden=!localStorage.getItem('mvp_before_restore');
    $('backup-undo').onclick=()=>{
        if(!confirm('Revenir aux données locales conservées avant la dernière restauration ? La sauvegarde en ligne ne sera pas modifiée automatiquement.'))return;
        try{restore(localStorage,JSON.parse(localStorage.getItem('mvp_before_restore')));localStorage.removeItem('mvp_backup_meta');localStorage.removeItem('mvp_before_restore');location.reload();}
        catch{status('Impossible de revenir aux données précédentes.');}
    };
    const cfg=window.MYVAPE_BACKUP_CONFIG;
    if(cfg?.enabled===false||!cfg?.apiKey||!cfg.projectId||!cfg.authDomain){for(const id of ['backup-send','backup-register','backup-reset'])$(id).disabled=true;status('Données enregistrées uniquement sur ce téléphone. La sauvegarde en ligne sera disponible après sa configuration.');return;}
    client=createService(cfg);
    for(const id of ['backup-send','backup-register','backup-reset'])$(id).disabled=false;
    async function authenticate(register=false){
        const form=$('backup-login');if(!form.reportValidity())return;
        const email=$('backup-email').value.trim(),password=$('backup-password').value;
        if(register && password.length<8){status('Choisis un mot de passe d’au moins 8 caractères.');return;}
        $('backup-send').disabled=true;$('backup-register').disabled=true;
        try{
            if(register){await client.register(email,password);status('Compte créé. Confirme ton adresse dans le mail reçu pour activer la sauvegarde. Si tu ne le vois pas, consulte tes spams ou courriers indésirables.');}
            else await client.login(email,password);
            $('backup-password').value='';
        }catch{status(register?'Création impossible. Vérifie ton adresse et choisis un mot de passe plus long, ou utilise « Me connecter » si tu as déjà un compte.':'Connexion impossible. Vérifie ton adresse et ton mot de passe, ou utilise « Mot de passe oublié ».');}
        finally{$('backup-send').disabled=false;$('backup-register').disabled=false;}
    }
    $('backup-login').onsubmit=event=>{event.preventDefault();authenticate();};
    $('backup-register').onclick=()=>authenticate(true);
    $('backup-reset').onclick=async()=>{
        const email=$('backup-email');if(!email.reportValidity())return;
        $('backup-reset').disabled=true;
        try{await client.reset(email.value.trim());status('Si cette adresse correspond à un compte, tu recevras un mail pour choisir un nouveau mot de passe. Pense à consulter tes spams ou courriers indésirables.');}
        catch{status('Envoi impossible pour le moment. Réessaie plus tard.');}
        finally{setTimeout(()=>$('backup-reset').disabled=false,60000);}
    };
    $('backup-resend').onclick=async()=>{
        $('backup-resend').disabled=true;
        try{await client.resend();status('Mail de vérification envoyé. Pense à consulter tes spams ou courriers indésirables.');}
        catch{status('Envoi impossible. Patiente un peu avant de réessayer.');}
        finally{setTimeout(()=>$('backup-resend').disabled=false,60000);}
    };
    $('backup-verified').onclick=async()=>{
        try{user=await client.refresh();epoch++;panel();if(user)await reconcile();}
        catch{status('Vérification impossible. Réessaie avec une connexion.');}
    };
    $('backup-keep').onclick=keepLocal;$('backup-restore').onclick=restoreRemote;$('backup-save').onclick=save;
    $('backup-retry').onclick=reconcile;$('backup-signout').onclick=signout;
    client.onUser(next=>{
        epoch++;user=next;ready=false;remote=null;baseline=null;panel();
        if(user)setTimeout(reconcile,0);else{decision(false);status('Données enregistrées uniquement sur ce téléphone.');}
    });
    window.addEventListener('online',()=>ready?save():reconcile());
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')ready?save():reconcile();});
    setInterval(()=>{if(document.visibilityState==='visible'&&ready)changed();},30000);
}
// Revenir à l'état précédent si une restauration avait été interrompue.
try{recover(localStorage);}catch{/* Affiché lors de la prochaine tentative de restauration. */}
document.addEventListener('DOMContentLoaded',()=>init().catch(()=>status('Connexion indisponible. Tes données locales sont conservées.')));
