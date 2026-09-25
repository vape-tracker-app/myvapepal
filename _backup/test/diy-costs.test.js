import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {capture,restore,validate} from '../src/data.js';
function boot(){
 const data=new Map();let id=0;
 const ctx=vm.createContext({Date,Math,Number,JSON,crypto:{randomUUID:()=>`expense-${++id}`},document:{addEventListener(){}},flacons:[],depenses:[],recettes:[],localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}});
 vm.runInContext(readFileSync(new URL('../../diy-costs.js',import.meta.url),'utf8'),ctx);
 vm.runInContext(readFileSync(new URL('../../flacons-edition.js',import.meta.url),'utf8'),ctx);
 return {ctx,data,cost:vm.runInContext('DIYCosts',ctx)};
}
const prices={arome:{volume:30,prix:13.5,nom:'Kami'},base:{volume:1000,prix:10},booster:{volume:100,prix:10}};
test('ingredient consumption differs from full packages and unit/box booster pricing agrees',()=>{
 const {cost:c}=boot(),a=c.dosages(50,6,15,20);
 const result=c.cost(a,prices);assert.ok(Math.abs(result.total-5.15)<1e-10);assert.equal(result.partial,false);
 assert.equal(c.cost(a,{...prices,booster:{volume:10,prix:1}}).total,result.total);
 const expenses=c.purchases(prices,'2026-08-31',{arome:1,base:1,booster:1});
 assert.equal(expenses.reduce((s,x)=>s+x.montant,0),33.5);assert.ok(expenses.every(x=>x.date.startsWith('2026-08-31')));
 assert.equal(c.purchases(prices,'2026-08-31',{arome:0,base:0,booster:0}).length,0);
});
test('missing prices remain partial and zero priced products remain valid',()=>{
 const {cost:c}=boot(),a=c.dosages(50,6,15,20);
 const partial=c.cost(a,{arome:prices.arome});assert.equal(partial.partial,true);assert.equal(partial.total,3.375);
 assert.equal(c.cost(a,{}).known,false);
 assert.equal(c.cost(a,{...prices,arome:{volume:30,prix:0}}).partial,false);
 assert.throws(()=>c.dosages(50,20,15,20));assert.throws(()=>c.cost(a,{arome:{volume:0,prix:10}}));
});
test('two bottles retain per-bottle cost when one is opened; reserve total shrinks',()=>{
 const t=boot(),a=t.cost.dosages(50,6,15,20),s={prices,amounts:a,...t.cost.cost(a,prices),tauxBooster:20};
 const f=t.cost.attach({id:'batch',nom:'Kami',quantite:2,volume:50,type:'DIY',startedAt:null},s);t.ctx.flacons=[f];
 assert.match(t.ctx.texteCoutFlacon(f),/10,30/);
 const app=readFileSync(new URL('../../app.js',import.meta.url),'utf8');
 vm.runInContext(app.slice(app.indexOf('function utiliserCeFlacon('),app.indexOf('function retirerFlaconReserve(')),t.ctx);
 t.ctx.mettreAJourTout=()=>{};t.ctx.utiliserCeFlacon('batch');
 assert.equal(t.ctx.flacons.length,2);assert.equal(t.ctx.flacons[0].coutFlacon,f.coutFlacon);assert.match(t.ctx.texteCoutFlacon(t.ctx.flacons[1]),/5,15/);
});
test('adjustment adds only consumed ingredients to existing cost',()=>{
 const {cost:c}=boot();const additions={volArome:2.25,volBase:22.75,volBooster:0};
 assert.ok(Math.abs((4+c.cost(additions,prices).total)-5.24)<1e-10);
});
test('recipe/bottle and expenses are saved together and a failure rolls back',()=>{
 const t=boot(),a=t.cost.dosages(50,6,15,20),r=t.cost.attach({id:'r',nom:'Kami'},{...t.cost.cost(a,prices),prices,tauxBooster:20});
 const buys=t.cost.purchases(prices,'2026-08-31',{arome:1});t.cost.persist('vt_recettes',[r],buys);
 assert.equal(t.ctx.recettes.length,1);assert.equal(t.ctx.depenses.length,1);
 const other=boot();restore(other.ctx.localStorage,capture(t.ctx.localStorage));assert.equal(JSON.parse(other.data.get('vt_recettes'))[0].coutDIY.prix.arome.prix,13.5);
 const before=t.data.get('vt_recettes');t.ctx.localStorage.setItem=(k,v)=>{if(k==='vt_depenses')throw Error('quota');t.data.set(k,v);};
 assert.throws(()=>t.cost.persist('vt_recettes',[{...r,id:'new'},r],buys));assert.equal(t.data.get('vt_recettes'),before);assert.equal(t.ctx.recettes.length,1);
});
test('standalone adjustment purchases update finance state and invalid backup prices fail',()=>{
 const t=boot(),buys=t.cost.purchases(prices,'2026-09-24',{booster:2});t.cost.persist('vt_depenses',buys);assert.equal(t.ctx.depenses[0].montant,20);
 const bad={version:1,data:{vt_flacons:JSON.stringify([{coutDIY:{tauxBooster:20,prix:{base:{volume:0,prix:10}}}}])}};assert.throws(()=>validate(bad));
});
test('fresh and sweet drops preserve total volume and price only consumed millilitres',()=>{
 const {cost:c}=boot();const additifs={frais:{gouttes:20,gouttesParMl:20},sucre:{gouttes:10,gouttesParMl:25}};
 const a=c.withAdditives(c.dosages(50,6,15,20),additifs);
 assert.equal(a.volFrais,1);assert.equal(a.volSucre,.4);assert.equal(a.volBase,26.1);
 assert.equal(a.volBase+a.volArome+a.volBooster+a.volFrais+a.volSucre,50);
 const result=c.cost(a,{...prices,frais:{volume:10,prix:5},sucre:{volume:10,prix:3}});
 assert.ok(Math.abs(result.total-5.756)<1e-10);assert.equal(result.partial,false);
 assert.equal(c.cost(a,prices).partial,true);
 assert.throws(()=>c.withAdditives(c.dosages(50,6,15,20),{frais:{gouttes:20,gouttesParMl:0}}));
 assert.throws(()=>c.withAdditives(c.dosages(50,6,15,20),{frais:{gouttes:1000,gouttesParMl:20}}));
});
test('optional additive metadata and prices survive backup; invalid conversion is refused',()=>{
 const t=boot(),additifs={frais:{gouttes:20,gouttesParMl:20}},a=t.cost.withAdditives(t.cost.dosages(50,6,15,20),additifs);
 const r=t.cost.attach({id:'r',nom:'Frais'},{prices:{...prices,frais:{volume:10,prix:5}},amounts:a,...t.cost.cost(a,prices),tauxBooster:20,additifs});
 t.cost.persist('vt_recettes',[r]);const other=boot();restore(other.ctx.localStorage,capture(t.ctx.localStorage));
 assert.equal(JSON.parse(other.data.get('vt_recettes'))[0].additifs.frais.gouttes,20);
 const snap=capture(t.ctx.localStorage);r.additifs.frais.gouttesParMl=0;snap.data.vt_recettes=JSON.stringify([r]);assert.throws(()=>validate(snap));
});
test('editing replaces same recipe, recalculates base, and never mutates bottles or finances',async()=>{
 const t=boot();const inputs={'recette-nom':'Recette corrigée','recette-steep-days':'7','recette-nicotine':'6','recette-arome':'15'};
 t.ctx.document.getElementById=id=>({value:inputs[id],classList:{add(){}}});
 t.ctx.recettes=[{id:'original',nom:'Ancienne',coutFlacon:99}];t.ctx.flacons=[{id:'b',nom:'Ancienne',coutFlacon:99}];
 t.ctx.mettreAJourTout=()=>{};t.ctx.MyVapeUI={toast(){},readFlavorSelect:()=>['fruite','frais']};t.ctx.alert=message=>{throw Error(message)};
 const additifs={frais:{gouttes:20,gouttesParMl:20}},a=t.cost.withAdditives(t.cost.dosages(50,6,15,20),additifs);
 t.cost.snapshot=()=>({prices:{},amounts:a,...t.cost.cost(a,{}),tauxBooster:20,additifs});
 const code=readFileSync(new URL('../../app.js',import.meta.url),'utf8');vm.runInContext(code.slice(code.indexOf('let sauvegardeRecetteEnCours='),code.indexOf('let sauvegardePreparationEnCours=')),t.ctx);
 vm.runInContext('reinitialiserRecette=()=>{};recetteEditionId="original";',t.ctx);
 await t.ctx.sauvegarderRecette();assert.equal(t.ctx.recettes.length,1);assert.equal(t.ctx.recettes[0].id,'original');assert.deepEqual(Array.from(t.ctx.recettes[0].categoriesSaveurs),['fruite','frais']);assert.equal(t.ctx.recettes[0].volBase,26.5);assert.equal(t.ctx.recettes[0].coutFlacon,undefined);
 assert.equal(t.ctx.flacons[0].coutFlacon,99);assert.equal(t.ctx.depenses.length,0);assert.equal(t.data.has('vt_stock_diy'),false);
});
test('recipe flavors round-trip with legacy recipes and reject unknown categories',()=>{
 const t=boot();t.cost.persist('vt_recettes',[{id:'old',nom:'Ancienne'},{id:'new',nom:'Fruit frais',categoriesSaveurs:['fruite','frais'],categorieSaveur:'fruite'}]);
 const other=boot();restore(other.ctx.localStorage,capture(t.ctx.localStorage));
 assert.deepEqual(JSON.parse(other.data.get('vt_recettes'))[1].categoriesSaveurs,['fruite','frais']);
 const bad=capture(t.ctx.localStorage);bad.data.vt_recettes=JSON.stringify([{id:'bad',categoriesSaveurs:['inconnue']}]);assert.throws(()=>validate(bad));
});
