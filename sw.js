importScripts('./push-storage.js');
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>{
    event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('vape-tracker-')).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>event.respondWith(fetch(event.request)));
let pushQueue=Promise.resolve();
self.addEventListener('push',event=>{
    // Sérialiser les réceptions pour ne pas afficher deux fois le même événement.
    pushQueue=pushQueue.catch(()=>{}).then(async()=>{
        let data;
        try{data=event.data?.json();}catch{return;}
        if(!data || typeof data.id!=='string' || typeof data.title!=='string' || typeof data.body!=='string')return;
        const account=await MyVapePushStorage.get('account');
        if(account && !account.enabled)return;
        let seen={};
        try{seen=await MyVapePushStorage.get('seen') || {};}catch{}
        if(seen[data.id])return;
        await self.registration.showNotification(data.title.slice(0,120),{
            body:data.body.slice(0,500),icon:new URL('icon.png',self.registration.scope).href,
            badge:new URL('icon.png',self.registration.scope).href,
            tag:data.tag || data.id,renotify:false,
            data:{url:new URL('index.html',self.registration.scope).href}
        });
        seen[data.id]=Date.now();
        seen=Object.fromEntries(Object.entries(seen).filter(([,time])=>time>Date.now()-30*86400000).slice(-500));
        try{await MyVapePushStorage.set('seen',seen);}catch{}
    });
    event.waitUntil(pushQueue);
});
self.addEventListener('notificationclick',event=>{
    event.notification.close();
    event.waitUntil((async()=>{
        const url=new URL('index.html',self.registration.scope).href;
        const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
        for(const client of windows){
            if(client.url.startsWith(self.registration.scope)){
                await client.navigate(url);return client.focus();
            }
        }
        return self.clients.openWindow(url);
    })());
});

self.addEventListener('pushsubscriptionchange',event=>{
    event.waitUntil((async()=>{
        const account=await MyVapePushStorage.get('account');
        if(!account?.enabled || !account.config)return;
        const api='https://myvapepal-notifications.karine-n-lopez.workers.dev';
        if(Notification.permission!=='granted')return;
        const response=await fetch(api+'/config');
        if(!response.ok)throw Error('Configuration push indisponible');
        const {publicKey}=await response.json();
        const key=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
        const subscription=event.newSubscription || await self.registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
        const saved=await fetch(`${api}/devices/${account.id}`,{
            method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${account.token}`},
            body:JSON.stringify({subscription:subscription.toJSON(),config:account.config})
        });
        if(!saved.ok)throw Error('Renouvellement push en attente');
    })());
});
