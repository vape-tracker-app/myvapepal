import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function setup(fail=false){
 const handlers={},shown=[],memory={};let focused=0,navigated='';
 const context=vm.createContext({URL,Date,Promise,importScripts(){},MyVapePushStorage:{get:async k=>memory[k],set:async(k,v)=>memory[k]=v},self:{registration:{scope:'https://example.com/myvapepal/',showNotification:async(...args)=>{if(fail)throw Error('OS');shown.push(args);}},addEventListener:(k,fn)=>handlers[k]=fn,clients:{matchAll:async()=>[{url:'https://example.com/myvapepal/index.html',navigate:async u=>navigated=u,focus:()=>focused++}],openWindow:()=>{throw Error('Must focus existing');}}}});
 vm.runInContext(readFileSync(new URL('../../sw.js',import.meta.url),'utf8'),context);
 const push=async value=>{let done;handlers.push({data:{json:()=>value},waitUntil:p=>done=p});return done;};
 return {handlers,shown,memory,push,get focus(){return focused},get navigated(){return navigated}};
}
test('push displayed once; persistent duplicate protection and scoped click',async()=>{
 const s=setup();const data={id:'jour-1',title:'Bravo',body:'1 jour',tag:'jour'};
 await Promise.all([s.push(data),s.push(data)]);assert.equal(s.shown.length,1);assert.equal(s.shown[0][1].icon,'https://example.com/myvapepal/icon.png');
 let done;s.handlers.notificationclick({notification:{close(){}},waitUntil:p=>done=p});await done;assert.equal(s.focus,1);assert.equal(s.navigated,'https://example.com/myvapepal/index.html');
});
test('failed display is not marked as delivered',async()=>{
 const s=setup(true);await assert.rejects(s.push({id:'x',title:'Test',body:'Test'}));assert.equal(s.memory.seen,undefined);
});
test('invalid payload ignored',async()=>{const s=setup();await s.push(null);await s.push({id:'x'});assert.equal(s.shown.length,0);});

test('a queued push is ignored after opting out',async()=>{
 const s=setup();s.memory.account={enabled:false,pendingDelete:true};
 await s.push({id:'late',title:'Test',body:'Test'});assert.equal(s.shown.length,0);
});
