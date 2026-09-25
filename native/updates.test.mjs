import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {shouldPrompt} from './update-policy.mjs';
async function boot({available=true,offline=false,splash=false,storeFails=false}={}) {
 const nodes=[],storage=new Map(),timers=[];let opens=0;
 const element=()=>({children:[],append(...els){this.children.push(...els)},setAttribute(){},addEventListener(type,fn){this[type]=fn},showModal(){this.open=true},close(){this.open=false;this['closeEvent']?.()},remove(){this.removed=true}});
 const body={append(el){nodes.push(el)}};
 const document={readyState:'complete',visibilityState:'visible',body,createElement(){const el=element();el.addEventListener=(type,fn)=>{el[type==='close'?'closeEvent':type]=fn};return el;},getElementById:()=>splash?{}:null,querySelector:()=>null};
 const ctx=vm.createContext({document,Date,Promise,Error,JSON,Number,shouldPrompt,registerPlugin:()=>({check:async()=>{if(offline)throw Error();return {available,versionCode:6}},openStore:async()=>{opens++;if(storeFails)throw Error();}}),App:{addListener:async()=>{}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){}});
 const source=readFileSync(new URL('./updates.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 vm.runInContext(source,ctx);await new Promise(resolve=>setImmediate(resolve));
 return {nodes,storage,timers,show:async()=>{splash=false;timers.find(t=>t.ms===1500)?.fn();},get opens(){return opens}};
}
test('offline or no update never interrupts the app',async()=>{
 for(const config of [{offline:true},{available:false}])assert.equal((await boot(config)).nodes.length,0);
});
test('prompt waits for splash, later remembers only update preference',async()=>{
 const t=await boot({splash:true});assert.equal(t.nodes.length,0);await t.show();
 const dialog=t.nodes[0];assert.equal(dialog.open,true);dialog.children[3].children[1].onclick();
 assert.equal(dialog.removed,true);assert.deepEqual([...t.storage.keys()],['mvp_update_later']);
 assert.equal(JSON.parse(t.storage.get('mvp_update_later')).versionCode,6);
});
test('update opens Store; failure keeps a retryable dialog',async()=>{
 for(const storeFails of [false,true]){
  const t=await boot({storeFails}),dialog=t.nodes[0],button=dialog.children[3].children[0];await button.onclick();assert.equal(t.opens,1);
  if(storeFails){assert.equal(dialog.open,true);assert.equal(button.disabled,false);assert.match(dialog.children[4].textContent,/ne s’ouvre pas/);}
  else assert.equal(dialog.removed,true);
 }
});
