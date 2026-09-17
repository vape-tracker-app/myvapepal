import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function setup({failure=false,permission='granted'}={}){
 const elements={'btn-profil-notif':{style:{},setAttribute(k,v){this[k]=v;}},'profil-notif-statut':{}};const records={};const requests=[];
 const key=new Uint8Array(65).fill(1);
 let current;const controls={offline:false};
 const subscription={unsubscribe:async()=>{current=null;return true;},options:{applicationServerKey:key.buffer},toJSON:()=>({endpoint:'https://fcm.googleapis.com/test',keys:{auth:'a',p256dh:'b'}})};
 current=subscription;
 const reg={pushManager:{getSubscription:async()=>current,subscribe:async()=>{current=subscription;return subscription;}}};
 const context=vm.createContext({console,Uint8Array,Date,Intl,JSON,Promise,Array,Error,atob,crypto,AbortSignal,isSecureContext:true,
 configUser:{dateArret:'2026-01-01'},flacons:[],setTimeout(){},setInterval(){},
 document:{getElementById:id=>elements[id],addEventListener(){}},window:{Notification:{},PushManager:{},addEventListener(){}},Notification:{permission,requestPermission:async()=>permission},
 navigator:{serviceWorker:{register:async()=>reg,ready:Promise.resolve(reg)}},MyVapePushStorage:{get:async k=>records[k],set:async(k,v)=>records[k]=v},
 fetch:async(url,opts)=>{requests.push({url,opts});if(failure || controls.offline)return {ok:false,status:503};return {ok:true,json:async()=>url.endsWith('/config')?{publicKey:Buffer.from(key).toString('base64url')}:{ok:true}};}});
 vm.runInContext(readFileSync(new URL('../../push.js',import.meta.url),'utf8'),context);
 return {context,elements,records,requests,controls,get subscription(){return current},run:s=>vm.runInContext(s,context)};
}
test('permission alone does not mean active; explicit activation persists after server success',async()=>{
 const s=setup();await s.run('MyVapePush.sync()');assert.equal(s.elements['btn-profil-notif'].textContent,'Activer les notifications');assert.equal(s.requests.length,0);
 await s.elements['btn-profil-notif'].onclick();assert.equal(s.elements['btn-profil-notif'].textContent,'Activées');assert.equal(s.records.account.enabled,true);
 await s.run('MyVapePush.sync()');assert.equal(s.requests.length,2);
 s.run("flacons=[{id:'123',steepReadyAt:'2026-10-01T00:00:00Z',actif:false,termine:false}]");await s.run('MyVapePush.sync()');assert.equal(s.requests.length,3);
 assert.equal(JSON.parse(s.requests[2].opts.body).config.steeps.length,1);
});
test('server failure never claims activation',async()=>{
 const s=setup({failure:true});await s.run('MyVapePush.sync()');await s.elements['btn-profil-notif'].onclick();assert.notEqual(s.elements['btn-profil-notif'].textContent,'Activées');assert.equal(s.records.account.enabled,false);assert.match(s.elements['profil-notif-statut'].textContent,/non terminée/);
});
test('denied permission never attempts subscription',async()=>{
 const s=setup({permission:'denied'});await s.run('MyVapePush.sync()');assert.equal(s.requests.length,0);assert.equal(s.elements['btn-profil-notif'].disabled,true);
});

test('local pipeline: each due bottle keeps its own name, nicotine and volume',async()=>{
 const {validateConfig,plan}=await import('../src/planner.js');
 const s=setup();
 s.run(`flacons=[
   {id:'alucard',nom:'Alucard',nicotine:6,volume:100,steepReadyAt:'2026-09-17T08:00:00Z'},
   {id:'red',nom:'Red Astaire',nicotine:3.5,volume:50,steepReadyAt:'2026-09-17T08:00:00Z'},
   {id:'zero',nom:'Sans nicotine',nicotine:0,volume:30,steepReadyAt:'2026-09-17T08:00:00Z'},
   {id:'future',nom:'Encore en maturation',nicotine:12,volume:200,steepReadyAt:'2026-09-18T08:00:00Z'},
   {id:'finished',nom:'Terminé',nicotine:1,volume:10,termine:true,steepReadyAt:'2026-09-17T08:00:00Z'},
   {id:'active',nom:'Entamé',nicotine:1,volume:10,actif:true,steepReadyAt:'2026-09-17T08:00:00Z'}
 ]`);
 const before=s.run('JSON.stringify(flacons)');
 await s.run('MyVapePush.sync()');await s.elements['btn-profil-notif'].onclick();
 const sent=JSON.parse(s.requests.find(r=>r.opts?.method==='PUT').opts.body).config;
 const now=Date.parse('2026-09-17T10:00:00Z');
 const validated=validateConfig(sent,now);
 assert.equal(validated.steeps.length,4);
 const result=plan(validated,{},now);
 const events=result.events.filter(e=>e.id.startsWith('steep-'));
 assert.equal(events.length,3);
 assert.deepEqual(events.map(e=>[e.title,e.body]),[
   ['Ton DIY est prêt ! 🧪','Alucard — nicotine : 6 mg/ml — flacon : 100 ml. Sa maturation est terminée. Retrouve-le dans ta réserve !'],
   ['Ton DIY est prêt ! 🧪','Red Astaire — nicotine : 3,5 mg/ml — flacon : 50 ml. Sa maturation est terminée. Retrouve-le dans ta réserve !'],
   ['Ton DIY est prêt ! 🧪','Sans nicotine — nicotine : 0 mg/ml — flacon : 30 ml. Sa maturation est terminée. Retrouve-le dans ta réserve !']
 ]);
 assert.equal(plan(validated,result.state,now+300000).events.length,0);
 assert.equal(s.run('JSON.stringify(flacons)'),before);
});

test('green active button disables, stays disabled on sync, and can reactivate',async()=>{
 const s=setup();await s.run('MyVapePush.sync()');const button=s.elements['btn-profil-notif'];
 await button.onclick();assert.equal(button.disabled,false);assert.equal(button.style.background,'#238636');
 assert.equal(button['aria-pressed'],'true');
 await button.onclick();assert.equal(s.records.account.enabled,false);assert.equal(s.subscription,null);
 assert.equal(button['aria-pressed'],'false');assert.equal(button.style.background,'');
 const count=s.requests.length;await s.run('MyVapePush.sync()');assert.equal(s.requests.length,count);
 await button.onclick();assert.equal(s.records.account.enabled,true);assert.ok(s.subscription);
 assert.equal(s.requests.filter(r=>r.opts?.method==='PUT').length,2);
 assert.equal(s.requests.filter(r=>r.opts?.method==='DELETE').length,1);
});
test('offline opt-out persists and retries deletion without automatic reactivation',async()=>{
 const s=setup();await s.run('MyVapePush.sync()');const button=s.elements['btn-profil-notif'];await button.onclick();
 s.controls.offline=true;await button.onclick();assert.equal(s.records.account.enabled,false);
 assert.equal(s.records.account.pendingDelete,true);assert.equal(s.subscription,null);
 await s.run('MyVapePush.sync()');assert.equal(s.records.account.enabled,false);
 s.controls.offline=false;await s.run('MyVapePush.sync()');assert.equal(s.records.account.pendingDelete,false);
 assert.equal(s.requests.filter(r=>r.opts?.method==='PUT').length,1);
 await button.onclick();assert.equal(s.records.account.enabled,true);
});
