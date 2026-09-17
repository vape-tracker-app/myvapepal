import webpush from 'web-push';
import {plan,validateConfig,steepBody} from './planner.js';
const DAY=86400000;
const encoder=new TextEncoder();
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('');
export function validSubscription(s) {
    if (!s || typeof s.endpoint!=='string' || s.endpoint.length>2048) return false;
    try {
        const u=new URL(s.endpoint);
        const host=u.hostname;
        const allowed=host==='fcm.googleapis.com' || host==='updates.push.services.mozilla.com' || host.endsWith('.push.services.mozilla.com') || host==='web.push.apple.com' || host.endsWith('.push.apple.com');
        return u.protocol==='https:' && !u.username && !u.password && !u.port && allowed &&
            typeof s.keys?.p256dh==='string' && /^[\w-]{87}=?$/.test(s.keys.p256dh) &&
            typeof s.keys?.auth==='string' && /^[\w-]{22}(==)?$/.test(s.keys.auth);
    } catch {return false;}
}
async function body(request) {
    if (!request.headers.get('content-type')?.includes('application/json')) throw Error('JSON requis');
    const reader=request.body?.getReader(); if(!reader) throw Error('Corps requis');
    let size=0; const chunks=[];
    for(;;){const {value,done}=await reader.read(); if(done) break;size+=value.length;if(size>96000){await reader.cancel();throw Error('Corps trop volumineux');}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    return JSON.parse(new TextDecoder().decode(bytes));
}
export async function handle(request,env) {
    const origin=request.headers.get('Origin');
    const headers={'Access-Control-Allow-Origin':env.APP_ORIGIN,'Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json'};
    const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
    if(origin!==env.APP_ORIGIN) return reply({error:'Origine refusée'},403);
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, PUT, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}});
    if(!env.DB || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return reply({error:'Service pas encore configuré'},503);
    const url=new URL(request.url);
    if(url.pathname==='/config' && request.method==='GET') return reply({publicKey:env.VAPID_PUBLIC_KEY});
    const match=url.pathname.match(/^\/devices\/([a-f0-9-]{36})$/);
    const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if(!match || !token) return reply({error:'Accès refusé'},401);
    const id=match[1], hash=await digest(token);
    const existing=await env.DB.prepare('SELECT * FROM devices WHERE id=?').bind(id).first();
    if(existing && existing.token_hash!==hash) return reply({error:'Accès refusé'},403);
    if(request.method==='DELETE') {
        if(existing) await env.DB.prepare('DELETE FROM devices WHERE id=? AND token_hash=?').bind(id,hash).run();
        return reply({ok:true});
    }
    if(request.method==='GET') return existing ? reply({ok:true}) : reply({error:'Abonnement absent'},404);
    if(request.method!=='PUT') return reply({error:'Méthode refusée'},405);
    if (env.RATE_LIMITER) {
        const limit=await env.RATE_LIMITER.limit({key:request.headers.get('CF-Connecting-IP') || 'unknown'});
        if(!limit.success)return reply({error:'Réessaie dans une minute'},429);
    }
    if(!existing && (await env.DB.prepare('SELECT count(*) n FROM devices').first()).n>=200)return reply({error:'Capacité bêta atteinte'},429);
    let input,config;
    try {input=await body(request);config=validateConfig(input.config);if(!validSubscription(input.subscription))throw Error('Abonnement invalide');}
    catch {return reply({error:'Données invalides'},400);}
    const subscription={endpoint:input.subscription.endpoint,keys:input.subscription.keys};
    const now=Date.now();
    // Une synchronisation annule les envois non partis : ils seront recalculés avec les nouvelles données.
    const state=existing ? JSON.parse(existing.state) : {};
    const previousConfig=existing ? JSON.parse(existing.config) : null;
    if(previousConfig && previousConfig.dateArret!==config.dateArret){delete state.dateArret; delete state.stage;}
    try {
        await env.DB.batch([
            env.DB.prepare(`INSERT INTO devices(id,token_hash,endpoint,subscription,config,state,updated_at) VALUES(?,?,?,?,?,?,?)
                ON CONFLICT(id) DO UPDATE SET endpoint=excluded.endpoint,subscription=excluded.subscription,config=excluded.config,state=excluded.state,updated_at=excluded.updated_at,revision=devices.revision+1
                WHERE devices.token_hash=excluded.token_hash`).bind(id,hash,subscription.endpoint,JSON.stringify(subscription),JSON.stringify(config),JSON.stringify(state),now),
            env.DB.prepare(`DELETE FROM deliveries WHERE device_id=? AND sent_at IS NULL AND event_id LIKE 'objectif-%' AND
                NOT EXISTS(SELECT 1 FROM json_each(?) g WHERE deliveries.event_id='objectif-'||json_extract(g.value,'$.id')||':'||json_extract(g.value,'$.date'))`).bind(id,JSON.stringify(config.goals||[])),
            ...config.steeps.map(steep=>env.DB.prepare(
                "UPDATE deliveries SET payload=json_set(payload,'$.body',?) WHERE device_id=? AND event_id=? AND sent_at IS NULL"
            ).bind(steepBody(steep),id,`steep-${steep.id}:${steep.readyAt}`)),
            env.DB.prepare(`DELETE FROM deliveries WHERE device_id=? AND sent_at IS NULL AND event_id LIKE 'steep-%' AND
                NOT EXISTS(SELECT 1 FROM json_each(?) s WHERE deliveries.event_id='steep-'||json_extract(s.value,'$.id')||':'||json_extract(s.value,'$.readyAt'))`).bind(id,JSON.stringify(config.steeps)),
            env.DB.prepare("DELETE FROM deliveries WHERE device_id=? AND sent_at IS NULL AND (event_id LIKE 'jour-%' OR event_id LIKE 'arbre-%') AND ?").bind(id,Number(!!previousConfig && previousConfig.dateArret!==config.dateArret))
        ]);
    } catch {return reply({error:'Synchronisation impossible'},409);}
    return reply({ok:true});
}
export async function schedule(env,now=Date.now(),send=sendPush) {
    // La bêta est limitée à 200 appareils actifs par cette version du service.
    const {results:devices}=await env.DB.prepare('SELECT * FROM devices WHERE updated_at>? ORDER BY id LIMIT 201').bind(now-180*DAY).all();
    if(devices.length>200) throw Error('Capacité bêta dépassée');
    for(const device of devices){
        const {state,events}=plan(JSON.parse(device.config),JSON.parse(device.state),now);
        const statements=events.map(event=>env.DB.prepare(`INSERT OR IGNORE INTO deliveries(device_id,event_id,payload,created_at)
            SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM devices WHERE id=? AND revision=?)`).bind(device.id,event.id,JSON.stringify(event),now,device.id,device.revision));
        statements.push(env.DB.prepare('UPDATE devices SET state=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(state),device.id,device.revision));
        await env.DB.batch(statements);
    }
    const {results:jobs}=await env.DB.prepare(`SELECT d.*,v.subscription FROM deliveries d JOIN devices v ON v.id=d.device_id
        WHERE d.sent_at IS NULL AND d.next_attempt<=? AND d.created_at>? AND d.attempts<8 ORDER BY d.created_at LIMIT 10`).bind(now,now-DAY).all();
    for(const job of jobs){
        const lease=crypto.randomUUID();
        const claim=await env.DB.prepare(`UPDATE deliveries SET lease=?,next_attempt=?,attempts=attempts+1
            WHERE device_id=? AND event_id=? AND sent_at IS NULL AND next_attempt<=? RETURNING event_id`).bind(lease,now+300000,job.device_id,job.event_id,now).first();
        if(!claim)continue;
        try {
            const status=await send(JSON.parse(job.subscription),JSON.parse(job.payload),env);
            if(status===404 || status===410){await env.DB.prepare('DELETE FROM devices WHERE id=?').bind(job.device_id).run();continue;}
            if(status>=200 && status<300){await env.DB.prepare('UPDATE deliveries SET sent_at=?,lease=NULL WHERE device_id=? AND event_id=? AND lease=?').bind(now,job.device_id,job.event_id,lease).run();}
            else await retry(env,job,lease,now);
        } catch {await retry(env,job,lease,now);}
    }
    await env.DB.batch([
        env.DB.prepare('DELETE FROM devices WHERE updated_at<?').bind(now-180*DAY),
        env.DB.prepare('DELETE FROM deliveries WHERE created_at<?').bind(now-30*DAY)
    ]);
}
async function retry(env,job,lease,now){
    await env.DB.prepare('UPDATE deliveries SET lease=NULL,next_attempt=? WHERE device_id=? AND event_id=? AND lease=?')
        .bind(now+Math.min(3600000,300000*2**job.attempts),job.device_id,job.event_id,lease).run();
}
export async function sendPush(subscription,payload,env){
    const details=webpush.generateRequestDetails(subscription,JSON.stringify(payload),{
        TTL:86400, urgency:'normal', contentEncoding:'aes128gcm',
        vapidDetails:{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY}
    });
    const response=await fetch(details.endpoint,{method:'POST',headers:details.headers,body:details.body,redirect:'error',signal:AbortSignal.timeout(15000)});
    await response.body?.cancel();
    return response.status;
}
export default {
    async fetch(request,env){try{return await handle(request,env);}catch{return new Response('Service temporairement indisponible',{status:503,headers:{'Access-Control-Allow-Origin':env.APP_ORIGIN,'Cache-Control':'no-store'}});}},
    async scheduled(event,env,ctx){ctx.waitUntil(schedule(env));}
};
