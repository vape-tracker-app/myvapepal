// Seule l'adresse publique du service figure dans l'application. Aucune clé privée.
const MyVapePush = (() => {
    const API='https://myvapepal-notifications.karine-n-lopez.workers.dev';
    let registrationPromise=null, cachedPublicKey=null;
    let enabled=false;
    let busy=false, lastSnapshot='', lastSync=0, status='loading', message='Vérification des notifications…';
    const supported=()=>isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    function render(){
        const button=document.getElementById('btn-profil-notif');
        const label=document.getElementById('profil-notif-statut');
        if(!button || !label)return;
        button.textContent=status==='stopping'?'Désactivation…':enabled?'Activées':status==='working'?'Activation…':'Activer les notifications';
        button.disabled=['working','stopping','loading','unsupported','denied'].includes(status);
        button.style.background=enabled?'#238636':'';
        button.setAttribute('aria-pressed',String(enabled));
        button.setAttribute('aria-label',enabled?'Désactiver les notifications':'Activer les notifications');
        button.title=enabled?'Cliquer pour désactiver les notifications':'';
        button.onclick=enabled?disable:enable;
        label.textContent=message;
    }
    function update(next,text){status=next;message=text;render();}
    async function request(path,options={}){
        const response=await fetch(API+path,{...options,cache:'no-store',signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw Error(`push-${response.status}`);
        return response.json();
    }
    function snapshot(){
        if(!configUser?.dateArret)throw Error('Profil incomplet');
        return {
            dateArret:configUser.dateArret.slice(0,10),
            timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,
            goals:(typeof objectifs==='undefined'?[]:objectifs).filter(o=>o.statut!=='atteint').map(o=>({id:String(o.id),date:o.date,nicotine:parseFloat(o.titre)})),
            steeps:flacons.filter(f=>!f.termine && !f.actif && f.steepReadyAt && Number.isFinite(Date.parse(f.steepReadyAt)))
                .map(f=>({
                    id:String(f.id),readyAt:new Date(f.steepReadyAt).toISOString(),
                    ...(typeof f.nom==='string' && f.nom.trim() ? {nom:f.nom.trim().slice(0,120)} : {}),
                    ...(typeof f.nicotine==='number' && Number.isFinite(f.nicotine) && f.nicotine>=0 ? {nicotine:f.nicotine} : {}),
                    ...(typeof f.volume==='number' && Number.isFinite(f.volume) && f.volume>0 ? {volume:f.volume} : {})
                }))
                .sort((a,b)=>a.id.localeCompare(b.id))
        };
    }
    function publicKey(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
    async function registration(){
        if(!registrationPromise) registrationPromise=(async()=>{
            await navigator.serviceWorker.register('./sw.js');
            return Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Service indisponible')),15000))]);
        })().catch(error=>{registrationPromise=null;throw error;});
        return registrationPromise;
    }
    async function syncRecord(record,subscribe=false){
        const config=snapshot();
        const reg=await registration();
        let subscription=await reg.pushManager.getSubscription();
        if(!cachedPublicKey)cachedPublicKey=(await request('/config')).publicKey;
        const key=publicKey(cachedPublicKey);
        const currentKey=subscription?.options.applicationServerKey;
        if(subscription && (!currentKey || Array.from(new Uint8Array(currentKey)).join()!==Array.from(key).join())){
            await subscription.unsubscribe();subscription=null;
        }
        if(!subscription){
            if(!subscribe)throw Error('Activation nécessaire');
            subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
        }
        const serialized=JSON.stringify({subscription:subscription.toJSON(),config});
        if(serialized!==lastSnapshot || Date.now()-lastSync>12*3600000){
            await request(`/devices/${record.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${record.token}`},body:serialized});
            record.enabled=true;
            record.config=config;
            await MyVapePushStorage.set('account',record);
            lastSnapshot=serialized;lastSync=Date.now();
        }
        enabled=true;
        update('active','Notifications activées. Clique sur le bouton vert pour les désactiver.');
    }
    async function enable(){
        if(busy || !supported())return;
        busy=true;update('working','Activation des notifications…');
        try{
            // La demande système doit être déclenchée directement par le clic.
            const permission=await Notification.requestPermission();
            if(permission!=='granted'){
                update(permission==='denied'?'denied':'inactive',permission==='denied'?'Notifications bloquées : autorise-les dans les paramètres Android de MyVapePal.':'Notifications non activées.');return;
            }
            let record=await MyVapePushStorage.get('account');
            if(!record){
                record={id:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join(''),enabled:false};
                await MyVapePushStorage.set('account',record);
            }
            if(record.pendingDelete)await cleanup(record);
            await syncRecord(record,true);
        }catch{
            update('error','Activation non terminée. Vérifie ta connexion puis réessaie.');
        }finally{busy=false;}
    }
    async function cleanup(record){
        // Les deux opérations sont indépendantes : une panne réseau ne doit pas
        // empêcher le téléphone de supprimer son abonnement.
        const results=await Promise.allSettled([
            request(`/devices/${record.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${record.token}`}}),
            (async()=>{
                const reg=await registration();
                const subscription=await reg.pushManager.getSubscription();
                if(subscription && !await subscription.unsubscribe())throw Error('Désabonnement en attente');
                if(reg.getNotifications){
                    for(const notification of await reg.getNotifications())notification.close();
                }
            })()
        ]);
        if(results.some(result=>result.status==='rejected'))throw Error('Désactivation à synchroniser');
        record.pendingDelete=false;
        await MyVapePushStorage.set('account',record);
    }
    async function stop(record){
        record.enabled=false;
        record.pendingDelete=true;
        await MyVapePushStorage.set('account',record);
        enabled=false;lastSnapshot='';lastSync=0;
        await cleanup(record);
    }
    async function disable(){
        if(busy)return;
        busy=true;update('stopping','Désactivation des notifications…');
        try{
            const record=await MyVapePushStorage.get('account');
            if(record)await stop(record);
            enabled=false;
            update('inactive','Notifications désactivées. Tu peux les réactiver à tout moment.');
        }catch{
            update('error',enabled?'Désactivation non enregistrée. Réessaie.':'Notifications désactivées sur cet appareil. Le désabonnement sera finalisé dès que possible.');
        }finally{busy=false;}
    }
    async function sync(){
        if(busy)return;
        if(!supported()){update('unsupported','Les notifications ne sont pas disponibles dans ce navigateur.');return;}
        busy=true;
        try{
            const record=await MyVapePushStorage.get('account');
            enabled=!!record?.enabled;
            if(record?.pendingDelete)await cleanup(record);
            if(Notification.permission!=='granted'){
                if(record?.enabled){
                    await stop(record);
                }
                update(Notification.permission==='denied'?'denied':'inactive',Notification.permission==='denied'?'Notifications bloquées : autorise-les dans les paramètres Android de MyVapePal.':'Reçois les encouragements, les fins de steep et la croissance du cerisier.');return;
            }
            if(!record?.enabled){update('inactive','Active les notifications pour recevoir les alertes même quand l’application est fermée.');return;}
            await syncRecord(record,true);
        }catch{update('error','Synchronisation des notifications en attente. Vérifie ta connexion puis réessaie.');}
        finally{busy=false;}
    }
    document.addEventListener('DOMContentLoaded',()=>{
        sync();setInterval(()=>{if(document.visibilityState==='visible')sync();},60000);
    });
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();});
    window.addEventListener('online',sync);
    return {sync,render};
})();
