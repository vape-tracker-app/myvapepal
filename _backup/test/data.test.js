import {test} from 'node:test';
import assert from 'node:assert/strict';
import {capture,validate,restore,recover,equal,KEYS} from '../src/data.js';
function storage(initial={}){const map=new Map(Object.entries(initial));return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map};}
const fixture={vt_config:JSON.stringify({prenom:'Kawyne',dateArret:'2026-01-01',vapote:true}),vt_flacons:JSON.stringify([{id:'old',nom:'Alucard',volume:100,nicotine:0,actif:true}]),vt_depenses:JSON.stringify([{id:'dep1',montant:12,date:'2026-09-17'}]),vt_date_resistance:'2026-09-17'};
test('legacy snapshot preserves zero nicotine, missing fields, dates and excludes credentials',()=>{
 const s=storage({...fixture,'mvp-auth':'secret','push-account':'private'});const value=capture(s);
 assert.deepEqual(Object.keys(value.data),KEYS);assert.ok(!JSON.stringify(value).includes('secret'));assert.equal(value.data.vt_flacons,fixture.vt_flacons);
 const target=storage({'mvp-auth':'own-session'});restore(target,value);assert.ok(equal(capture(target),value));assert.equal(target.getItem('mvp-auth'),'own-session');
});
test('reject malformed, unknown versions, oversized and unsafe payloads before writing',()=>{
 const s=storage(fixture),before=capture(s);
 for(const bad of [{version:2,data:{}},{version:1,data:{vt_flacons:'{}'}},{version:1,data:{vt_flacons:JSON.stringify([{id:"x');alert(1)",nom:'test'}])}},{version:1,data:{vt_config:JSON.stringify({dateArret:'2026-01-01',prenom:'<img onerror=alert(1)>'})}},{version:1,data:{vt_depenses:JSON.stringify([{montant:'invalid'}])}}]) {
  assert.throws(()=>restore(s,bad));assert.ok(equal(capture(s),before));
 }
});
test('failed restore rolls back all data, interrupted restore recovers at next boot',()=>{
 const s=storage(fixture),before=capture(s),write=s.setItem;let once=true;
 s.setItem=(k,v)=>{if(k==='vt_flacons'&&once){once=false;throw Error('quota');}return write(k,v);};
 assert.throws(()=>restore(s,{version:1,data:{vt_config:JSON.stringify({dateArret:'2026-02-01'}) ,vt_flacons:'[]'}}));
 assert.ok(equal(capture(s),before));recover(s);assert.equal(s.getItem('mvp_restore_rollback'),null);
 s.setItem('mvp_restore_rollback',JSON.stringify(before.data));s.setItem('vt_flacons','[]');recover(s);assert.ok(equal(capture(s),before));
});

test('legacy decimal strings survive backup and restore without conversion',()=>{
 const raw=JSON.stringify([{id:'legacy',volume:'50',nicotine:'6.0',arome:'0'}]);
 const snapshot=capture(storage({...fixture,vt_flacons:raw}));
 const target=storage();restore(target,snapshot);assert.equal(target.getItem('vt_flacons'),raw);
 for(const montant of ['', ' ', 'NaN', '-1', true])assert.throws(()=>validate({version:1,data:{vt_depenses:JSON.stringify([{montant}])}}));
});
