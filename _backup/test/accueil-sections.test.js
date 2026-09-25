import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function boot(saved='{}'){
 const nodes={},data=new Map([['mvp_accueil_sections',saved]]);let init;
 const ctx=vm.createContext({Date,flacons:[],localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},document:{addEventListener:(event,fn)=>init=fn,getElementById:id=>nodes[id]??={open:false,textContent:'',addEventListener(event,fn){this.toggle=fn;}}}});
 vm.runInContext(readFileSync(new URL('../../accueil-sections.js',import.meta.url),'utf8'),ctx);init();
 return {api:vm.runInContext('MyVapeSections',ctx),nodes,data};
}
test('summary counts bottles in batches and maturation switches at deadline',()=>{
 const {api}=boot(),date=Date.parse('2026-09-25T12:00:00Z');
 const bottles=[{quantite:3,steepDays:7,steepReadyAt:'2026-09-25T12:00:00Z'},{quantite:2},{startedAt:'2026-09-20'},{termine:true}];
 assert.deepEqual(JSON.parse(JSON.stringify(api.counts(bottles,date-1))),{ready:2,maturing:3,finished:1,total:5});
 assert.equal(api.counts(bottles,date).ready,5);
});
test('sections start closed, remember independent choices, and new preparation opens reserve',()=>{
 const t=boot();assert.equal(t.nodes['section-flacons-reserve'].open,false);
 t.nodes['section-historique-flacons'].open=true;t.nodes['section-historique-flacons'].toggle();
 t.api.openReserve();const next=boot(t.data.get('mvp_accueil_sections'));
 assert.equal(next.nodes['section-flacons-reserve'].open,true);assert.equal(next.nodes['section-historique-flacons'].open,true);
 next.nodes['section-flacons-reserve'].open=false;next.nodes['section-flacons-reserve'].toggle();
 assert.equal(JSON.parse(next.data.get('mvp_accueil_sections')).historique,true);
});
