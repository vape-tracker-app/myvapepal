import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {capture,restore,validate} from '../src/data.js';
function boot(data=new Map()){
 let id=0;const ctx=vm.createContext({Date,Math,Number,JSON,Set,Object,structuredClone,crypto:{randomUUID:()=>`s-${++id}`},document:{addEventListener(){}},flacons:[],depenses:[],localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}});
 vm.runInContext(readFileSync(new URL('../../stock-diy.js',import.meta.url),'utf8'),ctx);
 return {ctx,data,s:vm.runInContext('DIYStock',ctx)};
}
function setup(){const t=boot();const sel={};for(const [type,volume,prix] of [['arome',30,13.5],['base',1000,10],['booster',100,10]])sel[type]=t.s.addLot({type,nom:type,volumeInitial:volume,volumeRestant:volume,prixTotal:prix,dateAchat:'2026-09-25',tauxBooster:20});t.sel=sel;t.snapshot={stockSelection:sel,tauxBooster:20,amounts:{volArome:7.5,volBase:27.5,volBooster:15}};return t;}
const bottle={id:'b1',nom:'Recette 1',volume:50,nicotine:6,arome:15,quantite:1,startedAt:null,termine:false,coutFlacon:5.15};
test('pricing and recipe estimates do not consume; two flavors share base and boosters',()=>{
 const t=setup();t.s.prices(t.sel);t.s.plan(t.sel,t.snapshot.amounts);assert.equal(t.s.readLots().find(l=>l.type==='base').volumeRestant,1000);
 t.s.consume(bottle,t.snapshot);
 const other=t.s.addLot({type:'arome',nom:'Autre saveur',volumeInitial:30,volumeRestant:30,prixTotal:15,dateAchat:'2026-09-25'});
 t.s.consume({...bottle,id:'b2'}, {...t.snapshot,stockSelection:{...t.sel,arome:other}});
 assert.equal(t.s.readLots().find(l=>l.id===t.sel.base).volumeRestant,945);assert.equal(t.s.readLots().find(l=>l.id===t.sel.booster).volumeRestant,70);assert.equal(t.s.readLots().find(l=>l.id===t.sel.arome).volumeRestant,22.5);assert.equal(t.ctx.depenses.length,0);
});
test('batch consumption doubles, cancellation restores once and preserves purchases',()=>{
 const t=setup();const f=t.s.consume({...bottle,quantite:2},t.snapshot);assert.equal(t.s.readLots().find(l=>l.id===t.sel.arome).volumeRestant,15);
 t.s.cancel(f.stockMouvementId);assert.equal(t.ctx.flacons.length,0);assert.equal(t.s.readLots().find(l=>l.id===t.sel.arome).volumeRestant,30);assert.throws(()=>t.s.cancel(f.stockMouvementId));
});
test('insufficient stock and incompatible booster never save bottle or consume ingredients',()=>{
 const t=setup(),before=t.data.get('vt_stock_diy');assert.throws(()=>t.s.consume({...bottle,quantite:5},t.snapshot),/reste/);assert.equal(t.data.get('vt_stock_diy'),before);assert.equal(t.ctx.flacons.length,0);
 assert.throws(()=>t.s.consume(bottle,{...t.snapshot,tauxBooster:10}),/taux/);assert.equal(t.data.get('vt_stock_diy'),before);
});
test('opening reserve does not consume again and prevents unsafe cancellation',()=>{
 const t=setup(),f=t.s.consume({...bottle,quantite:2},t.snapshot),before=t.data.get('vt_stock_diy');
 const code=readFileSync(new URL('../../app.js',import.meta.url),'utf8');vm.runInContext(code.slice(code.indexOf('function utiliserCeFlacon('),code.indexOf('function retirerFlaconReserve(')),t.ctx);t.ctx.mettreAJourTout=()=>{};t.ctx.utiliserCeFlacon('b1');assert.equal(t.data.get('vt_stock_diy'),before);assert.throws(()=>t.s.cancel(f.stockMouvementId));
});
test('adjustments consume additions only, undo restores previous bottle, cost frozen across new lots',()=>{
 const t=setup(),first=t.s.consume(bottle,t.snapshot);const next=t.s.consume({...first,volume:100,coutFlacon:8}, {...t.snapshot,amounts:{volArome:2,volBase:48,volBooster:0}},first);
 assert.equal(t.s.readLots().find(l=>l.id===t.sel.base).volumeRestant,924.5);t.s.cancel(next.stockMouvementId);assert.equal(t.ctx.flacons[0].volume,50);assert.equal(t.s.readLots().find(l=>l.id===t.sel.base).volumeRestant,972.5);
 t.s.addLot({type:'base',nom:'Plus chère',volumeInitial:1000,volumeRestant:1000,prixTotal:99,dateAchat:'2026-09-25'});assert.equal(t.ctx.flacons[0].coutFlacon,5.15);
});
test('acquisition expense is opt-in; corrections do not change finances',()=>{
 const t=boot();const id=t.s.addLot({type:'base',nom:'Base existante',volumeInitial:1000,volumeRestant:500,prixTotal:10,dateAchat:'2026-08-31'});assert.equal(t.ctx.depenses.length,0);
 t.s.addLot({type:'booster',nom:'Boîte',volumeInitial:100,volumeRestant:100,prixTotal:10,dateAchat:'2026-08-31',tauxBooster:20},true);assert.equal(t.ctx.depenses[0].montant,10);assert.match(t.ctx.depenses[0].date,/2026-08-31/);
 t.s.correct(id,450,'Mesure');assert.equal(t.ctx.depenses.length,1);assert.equal(t.s.readLots().find(l=>l.id===id).volumeRestant,450);
});
test('write failure and interrupted journal restore quantities and bottles',()=>{
 const t=setup(),before=t.data.get('vt_stock_diy');const real=t.ctx.localStorage.setItem;t.ctx.localStorage.setItem=(k,v)=>{if(k==='vt_flacons')throw Error('quota');real(k,v);};assert.throws(()=>t.s.consume(bottle,t.snapshot));assert.equal(t.data.get('vt_stock_diy'),before);assert.equal(t.ctx.flacons.length,0);
 t.ctx.localStorage.setItem=real;t.data.set('mvp_stock_rollback',JSON.stringify({vt_stock_diy:before,vt_flacons:null}));t.data.set('vt_stock_diy','[]');t.s.recover();assert.equal(t.data.get('vt_stock_diy'),before);assert.equal(t.data.has('mvp_stock_rollback'),false);
});
test('stock and movements backup round-trip, invalid stock rejected, legacy snapshots supported',()=>{
 const t=setup();t.s.consume(bottle,t.snapshot);const other=boot();restore(other.ctx.localStorage,capture(t.ctx.localStorage));assert.equal(other.s.readLots().find(l=>l.type==='arome').volumeRestant,22.5);assert.equal(JSON.parse(other.data.get('vt_stock_mouvements')).length,1);
 const snap=capture(t.ctx.localStorage),lots=JSON.parse(snap.data.vt_stock_diy);lots[0].volumeRestant=-1;snap.data.vt_stock_diy=JSON.stringify(lots);assert.throws(()=>validate(snap));assert.equal(validate({version:1,data:{vt_flacons:'[]'}}).data.vt_stock_diy,null);
});
