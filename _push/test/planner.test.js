import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plan,stage,validateConfig} from '../src/planner.js';
import {validSubscription,sendPush} from '../src/worker.js';
import webpush from 'web-push';
const config={dateArret:'2026-08-17',timezone:'Europe/Paris',steeps:[]};
const at=value=>Date.parse(value);
test('daily at 9 local, one per day, no historical tree announcement',()=>{
 let p=plan(config,{},at('2026-09-17T06:59:00Z'));assert.equal(p.events.length,0);
 p=plan(config,p.state,at('2026-09-17T07:00:00Z'));assert.equal(p.events.length,1);assert.match(p.events[0].body,/31 jours/);
 assert.equal(plan(config,p.state,at('2026-09-17T20:00:00Z')).events.length,0);
 assert.equal(plan(config,p.state,at('2026-09-18T07:00:00Z')).events.length,1);
});
test('all tree boundaries and date edits',()=>{
 for(const [days,expected] of [[30,1],[31,2],[90,2],[91,3],[150,3],[151,4],[240,4],[241,5]])assert.equal(stage(days),expected);
 const p=plan(config,{dateArret:config.dateArret,stage:1,daily:'2026-09-17'},at('2026-09-17T10:00:00Z'));
 assert.equal(p.events[0].title,'Ton cerisier a grandi ! 🌸');assert.equal(plan(config,p.state,at('2026-09-17T10:05:00Z')).events.length,0);
 assert.equal(plan({...config,dateArret:'2025-01-01'},p.state,at('2026-09-17T10:05:00Z')).events.length,0);
});
test('steep deadline once, including missed deadlines; removed bottle',()=>{
 const c={...config,steeps:[{id:'a',readyAt:'2026-09-17T08:00:00.000Z'}]};
 let p=plan(c,{},at('2026-09-17T06:00:00Z'));assert.equal(p.events.length,0);
 p=plan(c,p.state,at('2026-09-17T08:10:00Z'));assert.equal(p.events.filter(e=>e.id.startsWith('steep-')).length,1);
 assert.equal(plan(c,p.state,at('2026-09-17T08:15:00Z')).events.length,0);
 assert.equal(plan(config,{},at('2026-09-17T06:00:00Z')).events.length,0);
});
test('DST and timezone boundaries',()=>{
 const c={...config,timezone:'America/Los_Angeles'};
 assert.equal(plan(c,{},at('2026-09-17T08:00:00Z')).events.length,0);
 assert.equal(plan(c,{},at('2026-09-17T16:00:00Z')).events.length,1);
 assert.equal(plan(config,{},at('2026-10-25T08:00:00Z')).events.length,1);
});
test('strict inputs and push endpoint validation',()=>{
 assert.throws(()=>validateConfig({...config,dateArret:'2026-02-30'}));
 assert.throws(()=>validateConfig({...config,timezone:'unknown'}));
 assert.throws(()=>validateConfig({...config,steeps:[{id:'x',readyAt:'bad'}]}));
 const s={endpoint:'https://fcm.googleapis.com/fcm/send/example',keys:{auth:'a'.repeat(22),p256dh:'a'.repeat(87)}};
 assert.ok(validSubscription(s));
 for(const endpoint of ['http://fcm.googleapis.com/x','https://fcm.googleapis.com.evil.test/x','https://127.0.0.1/x','https://user@fcm.googleapis.com/x'])assert.ok(!validSubscription({...s,endpoint}));
});
test('real Web Push encryption produces aes128gcm and valid VAPID authorization',async()=>{
 const keys=webpush.generateVAPIDKeys();
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const pub=Buffer.from(await crypto.subtle.exportKey('raw',pair.publicKey)).toString('base64url');
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:pub,auth:Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url')}};
 const old=globalThis.fetch;
 globalThis.fetch=async(url,opts)=>{assert.equal(url,subscription.endpoint);assert.equal(opts.headers['Content-Encoding'],'aes128gcm');assert.match(opts.headers.Authorization,/^vapid t=/);assert.ok(opts.body.length>86);assert.equal(opts.redirect,'error');return new Response(null,{status:201});};
 try{assert.equal(await sendPush(subscription,{title:'Test',body:'Bonjour'},{VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'https://example.com'}),201);}finally{globalThis.fetch=old;}
});

test('legacy steep metadata remains optional; bad details rejected',()=>{
 const now=at('2026-09-17T10:00:00Z');
 const old={id:'old',readyAt:'2026-09-17T08:00:00Z'};
 const valid=validateConfig({...config,steeps:[old]},now);
 const event=plan(valid,{},now).events.find(e=>e.id.startsWith('steep-'));
 assert.equal(event.body,'Ton flacon. Sa maturation est terminée. Retrouve-le dans ta réserve !');
 assert.ok(!event.body.includes('undefined'));
 for(const extra of [{nicotine:-1},{nicotine:'6'},{nicotine:Infinity},{volume:0},{volume:-50},{nom:{}},{nom:'a'.repeat(121)}]){
   assert.throws(()=>validateConfig({...config,steeps:[{...old,...extra}]},now));
 }
});

test('goal notification is local-day aware, once per deadline, and rescheduled independently',()=>{
 const c={...config,goals:[{id:'goal1',date:'2026-09-17',nicotine:0}]};
 const before=plan(c,{},at('2026-09-17T06:59:00Z'));assert.equal(before.events.filter(e=>e.id.startsWith('objectif-')).length,0);
 const due=plan(c,before.state,at('2026-09-17T07:00:00Z'));assert.equal(due.events.filter(e=>e.id.startsWith('objectif-')).length,1);assert.match(due.events.find(e=>e.id.startsWith('objectif-')).body,/0 mg\/ml/);
 assert.equal(plan(c,due.state,at('2026-09-18T08:00:00Z')).events.filter(e=>e.id.startsWith('objectif-')).length,0);
 const later={...c,goals:[{...c.goals[0],date:'2026-09-19'}]};
 assert.equal(plan(later,due.state,at('2026-09-19T08:00:00Z')).events.filter(e=>e.id.startsWith('objectif-')).length,1);
 assert.equal(plan(config,due.state,at('2026-09-19T08:00:00Z')).events.filter(e=>e.id.startsWith('objectif-')).length,0);
 assert.throws(()=>validateConfig({...c,goals:[{...c.goals[0],date:'2026-02-31'}]}));
});
test('dated smoking adjusts cumulative days and delays growth, regardless of quantities',()=>{
 const c={...config,dateArret:'2026-08-18',smokingDays:['2026-09-25']};
 const same=plan(c,{},at('2026-09-25T07:00:00Z'));assert.match(same.events[0].body,/38 jours/);
 const next=plan(c,same.state,at('2026-09-26T07:00:00Z'));assert.match(next.events[0].body,/38 jours/);
 const following=plan(c,next.state,at('2026-09-27T07:00:00Z'));assert.match(following.events[0].body,/39 jours/);
 const delay={...config,smokingDays:['2026-09-16']};
 const p=plan(delay,{dateArret:config.dateArret,stage:1},at('2026-09-17T07:00:00Z'));
 assert.equal(p.events.filter(e=>e.id.startsWith('arbre-')).length,0);
 assert.equal(plan(delay,p.state,at('2026-09-18T07:00:00Z')).events.filter(e=>e.id.startsWith('arbre-')).length,1);
});
test('smoking dates are validated; old push registrations still work',()=>{
 const now=at('2026-09-25T12:00:00Z');
 assert.equal(validateConfig(config,now).smokingDays,undefined);
 for(const smokingDays of [null,{},['2026-02-30'],['2026-09-26'],['2026-09-24','2026-09-24'],['2025-01-01']])assert.throws(()=>validateConfig({...config,smokingDays},now));
 assert.deepEqual(validateConfig({...config,smokingDays:['2026-09-24']},now).smokingDays,['2026-09-24']);
});
