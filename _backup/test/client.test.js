import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as dataTools from '../src/data.js';
const source=readFileSync(new URL('../src/client.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function changed','function changed');
function setup({cloud=null,stored={},configured=true}={}) {
 const values=new Map(Object.entries(stored)),elements={},timers=[];let callback;let putCount=0;let fail=false;let revision=cloud?.revision||0;let row=cloud;let session={user:{id:'userA',email:'test@example.com',verified:true}};
 const localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const client={onUser:fn=>{callback=fn;fn(session.user)},logout:async()=>{session=null},login:async()=>{},register:async()=>{},reset:async()=>{},resend:async()=>{},refresh:async()=>session.user,
 read:async()=>row,save:async(_,payload,expected)=>{
  putCount++;if(fail)throw Error('offline');if(expected!==revision)return null;row={payload,revision:++revision,updated_at:'2026-09-17T12:00:00Z'};return row;
 }};
 const context=vm.createContext({...dataTools,console,URL,URLSearchParams,Date,JSON,setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},setInterval(){},confirm:()=>true,configUser:{prenom:'Test'},afficherEcran(){},location:{hash:'',href:'https://example.com/index.html',pathname:'/index.html',search:'',reload(){}},history:{replaceState(){}},localStorage,createService:()=>client,window:{MYVAPE_BACKUP_CONFIG:configured?{apiKey:'public',projectId:'demo-test',authDomain:'demo-test.firebaseapp.com'}:{},addEventListener(){}},document:{getElementById:id=>elements[id]??=( {textContent:'',hidden:false,disabled:false,value:'test@example.com'}),addEventListener(){},visibilityState:'visible'}});
 vm.runInContext(source,context);
 return {elements,values,context,timers,get puts(){return putCount},get row(){return row},run:s=>vm.runInContext(s,context),set fail(v){fail=v},conflict(){revision++},client};
}
const stored={vt_config:JSON.stringify({prenom:'Test',dateArret:'2026-01-01'}),vt_flacons:'[]'};
test('unconfigured backup never claims activation or sends data',async()=>{const s=setup({configured:false,stored});await s.run('init()');await s.run('reconcile()');assert.equal(s.elements['backup-send'].disabled,true);assert.equal(s.puts,0);assert.match(s.elements['backup-status'].textContent,/uniquement/);});
test('first account requires a choice before upload; server success enables autosave; signout stops it',async()=>{
 const s=setup({stored});await s.run('init()');await s.run('reconcile()');assert.equal(s.puts,0);assert.equal(s.elements['backup-choice'].hidden,false);
 await s.run('keepLocal()');assert.equal(s.puts,1);assert.match(s.elements['backup-status'].textContent,/à jour/);
 await s.run('signout()');s.values.set('vt_flacons','[{"id":"new"}]');await s.run('save()');assert.equal(s.puts,1);assert.ok(s.values.has('vt_config'));
});
test('concurrent revision never overwrites remote and failed network never reports saved',async()=>{
 const s=setup({stored});await s.run('init()');await s.run('reconcile()');await s.run('keepLocal()');s.values.set('vt_flacons','[{"id":"new"}]');s.fail=true;await s.run('save()');assert.match(s.elements['backup-status'].textContent,/en attente/);
 s.fail=false;s.conflict();await s.run('save()');assert.match(s.elements['backup-status'].textContent,/autre appareil/);assert.equal(s.row.payload.data.vt_flacons,'[]');
});
test('different local and cloud data require an explicit restore; no automatic replacement',async()=>{
 const cloud={payload:{version:1,data:{vt_config:JSON.stringify({prenom:'Cloud',dateArret:'2026-01-01'})}},revision:4,updated_at:'2026-09-17'};
 const s=setup({stored,cloud});await s.run('init()');await s.run('reconcile()');assert.equal(s.values.get('vt_config'),stored.vt_config);assert.equal(s.puts,0);
 await s.run('restoreRemote()');assert.match(s.values.get('vt_config'),/Cloud/);assert.ok(s.values.get('mvp_before_restore'));
});
test('unverified email never reads or uploads backups',async()=>{
 const s=setup({stored});await s.run('init()');s.run('user.verified=false');await s.run('reconcile()');
 assert.match(s.elements['backup-status'].textContent,/Vérifie ton adresse/);assert.equal(s.puts,0);assert.equal(s.elements['backup-verification'].hidden,false);
 await s.run('save()');assert.equal(s.puts,0);
});
