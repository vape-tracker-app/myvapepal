import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function boot(){
 // Simule les nœuds texte et images utilisés par illustrerTexte.
 const element=tag=>({tagName:tag,children:[],classList:{add(){},remove(){}},
  append(...nodes){this.children.push(...nodes);},
  replaceChildren(...nodes){this.children=[...nodes];},
  get textContent(){return this.children.map(n=>typeof n==='string'?n:n.textContent||'').join('');},
  set textContent(value){this.children=[String(value)];}
 });
 const saved=new Map();const toast=element('div');let home=true,splash=false,hidden=false;
 const context=vm.createContext({configUser:{dateArret:'2026-01-01'},window:{matchMedia:()=>({matches:true})},setTimeout(){},clearTimeout(){},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},document:{createElement:element,createTextNode:text=>({textContent:text}),get visibilityState(){return hidden?'hidden':'visible'},getElementById:id=>id==='confirmation-action'?toast:id==='splash-screen'?(splash?{}:null):id==='ecran-accueil'?{classList:{contains:()=>!home}}:null,addEventListener(){}}});
 vm.runInContext(readFileSync(new URL('../../enhancements.js',import.meta.url),'utf8'),context);
 return {saved,toast,run:s=>vm.runInContext(s,context),set home(v){home=v},set splash(v){splash=v},set hidden(v){hidden=v}};
}
test('tree celebration only for new stage, never for initial installation or edited quit date',()=>{
 const s=boot();s.run('MyVapeUI.observeStage(2)');assert.equal(s.toast.textContent,'');
 s.run('MyVapeUI.observeStage(3)');assert.match(s.toast.textContent,/cerisier a grandi/);
 assert.equal(s.toast.children.filter(n=>n.tagName==='img').length,1);
 assert.equal(s.toast.children.find(n=>n.tagName==='img').src,'./assets/menu/accueil.png');
 s.toast.textContent='';s.run('MyVapeUI.observeStage(3)');assert.equal(s.toast.textContent,'');
 s.run("configUser.dateArret='2025-01-01';MyVapeUI.observeStage(5)");assert.equal(s.toast.textContent,'');
});
test('celebration waits for visible home after splash; unknown color falls back safely',()=>{
 const s=boot();s.run('MyVapeUI.observeStage(1)');s.home=false;s.run('MyVapeUI.observeStage(2)');assert.equal(s.toast.textContent,'');
 s.home=true;s.splash=true;s.run('MyVapeUI.celebrate()');assert.equal(s.toast.textContent,'');
 s.splash=false;s.hidden=true;s.run('MyVapeUI.celebrate()');assert.equal(s.toast.textContent,'');
 s.hidden=false;s.run('MyVapeUI.celebrate()');assert.match(s.toast.textContent,/cerisier/);
 assert.equal(s.run("MyVapeUI.bottleColor({categorieSaveur:'bad; background: red'})"),'#e8c85a');
});
