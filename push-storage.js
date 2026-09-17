// Stockage distinct des données de suivi, partagé avec le service worker.
const MyVapePushStorage = {
    async open() {
        return new Promise((resolve,reject)=>{
            const request=indexedDB.open('myvapepal-push',1);
            request.onupgradeneeded=()=>request.result.createObjectStore('settings');
            request.onsuccess=()=>resolve(request.result);
            request.onerror=()=>reject(request.error);
        });
    },
    async get(key) {
        const db=await this.open();
        try{return await new Promise((resolve,reject)=>{
            const tx=db.transaction('settings','readonly');
            const request=tx.objectStore('settings').get(key);
            request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
        });}finally{db.close();}
    },
    async set(key,value) {
        const db=await this.open();
        try{return await new Promise((resolve,reject)=>{
            const tx=db.transaction('settings','readwrite');
            tx.objectStore('settings').put(value,key);
            tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
        });}finally{db.close();}
    }
};
