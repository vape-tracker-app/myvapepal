import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handle,schedule} from '../src/worker.js';
function database(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON;');sql.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
 const wrap=(query,args=[])=>({bind:(...a)=>wrap(query,a),first:async()=>sql.prepare(query).get(...args)||null,all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>sql.prepare(query).run(...args)});
 return {sql,prepare:query=>wrap(query),batch:async stmts=>{sql.exec('BEGIN');try{const results=[];for(const s of stmts)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
}
const token='a'.repeat(64),id='11111111-1111-4111-8111-111111111111';
const sub={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:'a'.repeat(87),auth:'a'.repeat(22)}};
const makeEnv=()=>({DB:database(),APP_ORIGIN:'https://vape-tracker-app.github.io',VAPID_PUBLIC_KEY:'public',VAPID_PRIVATE_KEY:'private'});
const config={dateArret:'2026-01-01',timezone:'Europe/Paris',steeps:[{id:'bottle',readyAt:'2026-09-17T09:00:00.000Z'}]};
function req(env,method='PUT',data={subscription:sub,config},bearer=token){return new Request('https://test/devices/'+id,{method,headers:{Origin:env.APP_ORIGIN,Authorization:'Bearer '+bearer,'Content-Type':'application/json'},...(method==='PUT'?{body:JSON.stringify(data)}:{})});}
test('registration, ownership, scheduling, deduplication, retry and revocation',async()=>{
 const env=makeEnv();assert.equal((await handle(req(env),env)).status,200);
 assert.equal((await handle(req(env,'GET',null,'b'.repeat(64)),env)).status,403);
 const now=Date.parse('2026-09-17T10:00:00Z');let count=0;
 await schedule(env,now,async()=>{count++;return 503;});assert.equal(count,2);
 await schedule(env,now+60000,async()=>{count++;return 201;});assert.equal(count,2);
 await schedule(env,now+360000,async()=>{count++;return 201;});assert.equal(count,4);
 await schedule(env,now+720000,async()=>{count++;return 201;});assert.equal(count,4);
 await handle(req(env),env);await schedule(env,now+900000,async()=>{count++;return 201;});assert.equal(count,4);
 assert.equal((await handle(req(env,'DELETE'),env)).status,200);assert.equal(env.DB.sql.prepare('SELECT count(*) n FROM deliveries').get().n,0);
});
test('removed steep cancels pending delivery, dead endpoint is removed',async()=>{
 const env=makeEnv();await handle(req(env),env);const now=Date.parse('2026-09-17T10:00:00Z');
 await schedule(env,now,async()=>503);
 await handle(req(env,'PUT',{subscription:sub,config:{...config,steeps:[]}}),env);
 assert.equal(env.DB.sql.prepare("SELECT count(*) n FROM deliveries WHERE event_id LIKE 'steep-%'").get().n,0);
 await schedule(env,now+600000,async()=>410);assert.equal(env.DB.sql.prepare('SELECT count(*) n FROM devices').get().n,0);
});
test('wrong origin and malicious subscriptions rejected',async()=>{
 const env=makeEnv();assert.equal((await handle(new Request('https://test/config'),env)).status,403);
 assert.equal((await handle(req(env,'PUT',{subscription:{...sub,endpoint:'https://localhost/private'},config}),env)).status,400);
 assert.equal(env.DB.sql.prepare('SELECT count(*) n FROM devices').get().n,0);
});

test('metadata correction refreshes an unsent steep without duplicating delivery',async()=>{
 const env=makeEnv();
 const c={...config,steeps:[{...config.steeps[0],nom:'Alucard',nicotine:6,volume:100}]};
 assert.equal((await handle(req(env,'PUT',{subscription:sub,config:c}),env)).status,200);
 const now=Date.parse('2026-09-17T10:00:00Z');await schedule(env,now,async()=>503);
 c.steeps[0].nicotine=3;c.steeps[0].volume=50;
 assert.equal((await handle(req(env,'PUT',{subscription:sub,config:c}),env)).status,200);
 const pending=env.DB.sql.prepare("SELECT payload FROM deliveries WHERE event_id LIKE 'steep-%'").all();
 assert.equal(pending.length,1);
 assert.equal(JSON.parse(pending[0].payload).body,'Alucard — nicotine : 3 mg/ml — flacon : 50 ml. Sa maturation est terminée. Retrouve-le dans ta réserve !');
 let sent=[];await schedule(env,now+600000,async(sub,payload)=>{sent.push(payload);return 201;});
 assert.equal(sent.filter(p=>p.id.startsWith('steep-')).length,1);
});
