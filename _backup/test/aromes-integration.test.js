import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {capture,restore,validate} from '../src/data.js';
import {plan} from '../../native/planner.mjs';
const read=name=>readFileSync(new URL('../../'+name,import.meta.url),'utf8');
function boot(){
 const data=new Map(),nodes={};let seq=0;
 const node=()=>({value:'',hidden:false,append(){},replaceChildren(){},setAttribute(){},classList:{add(){}},querySelector(){return {};}});
 const c=vm.createContext({Date,Math,Number,JSON,structuredClone,crypto:{randomUUID:()=>`id-${++seq}`},flacons:[],depenses:[],recettes:[],
 document:{addEventListener(){},getElementById:id=>nodes[id]??=(node()),createElement:node},localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}});
 for(const file of ['aromes-catalogue.js','aromes.js','stock-diy.js','diy-costs.js','flacons-edition.js','enhancements.js','accueil-sections.js'])vm.runInContext(read(file),c);
 return {c,nodes,data,a:vm.runInContext('MyVapeAromes',c),stock:vm.runInContext('DIYStock',c),cost:vm.runInContext('DIYCosts',c),catalog:vm.runInContext('catalogueAromes',c)};
}
test('search combines accents, brand, flavor aliases and freshness without mixing editions',()=>{
 const {a}=boot();assert(a.search('cafe vanille').some(x=>x.nom==='Alucard'));assert(a.search('coffee').some(x=>x.nom==='Alucard'));
 assert(a.search('fruits rouge frais','t-juice').every(x=>x.marqueId==='t-juice'&&x.fraicheur));
 assert.equal(a.search('no-such-flavor').length,0);assert.equal(a.search('oni','al').length,2);
 assert.notEqual(a.snapshot(a.search('hypnose','full-moon')[0]).nom,a.snapshot(a.search('hypnose','full-moon')[1]).nom);
});
test('all suggested categories keep existing assets; old uncategorized bottles do not crash',()=>{
 const {c,a,catalog}=boot();for(const item of catalog.aromes){assert(a.categories(item).length);for(const category of a.categories(item))assert(readFileSync(new URL('../../assets/saveurs/'+category+'.png',import.meta.url)).length);}
 assert.doesNotThrow(()=>vm.runInContext('MyVapeUI.bottleColor({categoriesSaveurs:[]})',c));
 assert.match(vm.runInContext("MyVapeUI.bottleIcon({categoriesSaveurs:['gourmand','boisson']})",c),/gourmand.png/);
});
test('snapshot is independent of future catalogue and recipe changes',()=>{
 const {a,nodes}=boot(),entry=a.search('oni','al')[0],snapshot=a.snapshot(entry);
 a.load('recette',{aromeCatalogue:snapshot});nodes['recette-steep-days']={value:'3'};
 const recipe=a.attach({id:'recipe'},'recette');a.load('prep',recipe);nodes['flacon-steep-days']={value:'3'};
 const bottle=a.attach({preparedAt:'2026-10-04T12:00:00Z'},'prep');
 entry.maturation.maxJours=99;recipe.aromeCatalogue.nom='Changed';recipe.steepDays=30;
 assert.equal(bottle.steepDays,3);assert.equal(bottle.steepReadyAt,'2026-10-07T12:00:00.000Z');assert.equal(bottle.aromeCatalogue.maturation.maxJours,3);assert.notEqual(bottle.aromeCatalogue.nom,'Changed');
});
test('unknown duration, explicit zero and chosen duration remain distinct on home and Android',()=>{
 const {a,c}=boot(),start='2026-10-04T12:00:00Z';
 const unknown={...a.maturation('',start),quantite:2},zero=a.maturation('0',start),chosen=a.maturation('3',start);
 assert.equal(unknown.steepDays,null);assert.equal(zero.steepDays,0);assert.equal(chosen.steepReadyAt,'2026-10-07T12:00:00.000Z');
 for(const bad of ['-1','1.5','oops','999999999999999'])assert.throws(()=>a.maturation(bad,start));
 c.bottles=[unknown,zero,chosen];const counts=vm.runInContext("MyVapeSections.counts(bottles,Date.parse('2026-10-05'))",c);assert.equal(counts.unknown,2);assert.equal(counts.ready,1);assert.equal(counts.maturing,1);assert.equal(counts.total,4);
 const notifications=plan({bottles:c.bottles},new Date('2026-10-05'));assert.equal(notifications.length,1);assert.equal(+notifications[0].schedule.at,+new Date(chosen.steepReadyAt));
});
test('catalogue stock references survive preparation and backup; browsing consumes nothing',()=>{
 const {a,stock,cost,c,data}=boot(),s=a.snapshot(a.search('oni','al')[0]);
 const lotId=stock.addLot({type:'arome',nom:'Oni',volumeInitial:30,volumeRestant:30,prixTotal:10,dateAchat:'2026-10-04',aromeCatalogue:s});
 a.search('cafe');a.snapshot(a.search('cafe')[0]);assert.equal(stock.readLots()[0].volumeRestant,30);
 const amounts=cost.dosages(50,0,10,20),selection={arome:lotId};
 const f={id:'bottle',nom:'Oni',type:'DIY',quantite:2,aromeCatalogue:s,...a.maturation('', '2026-10-04')};
 stock.consume(f,{amounts,stockSelection:selection,tauxBooster:20});assert.equal(stock.readLots()[0].volumeRestant,20);
 const saved=capture(c.localStorage),other=boot();restore(other.c.localStorage,saved);
 assert.equal(other.stock.readLots()[0].aromeCatalogue.id,s.id);assert.equal(JSON.parse(other.data.get('vt_flacons'))[0].steepDays,null);
 assert.equal(JSON.parse(other.data.get('vt_stock_mouvements'))[0].apresFlacon.aromeCatalogue.id,s.id);
 assert.throws(()=>validate({...saved,data:{...saved.data,vt_flacons:JSON.stringify([{...f,aromeCatalogue:{...s,sources:[{id:'bad',type:'fabricant',url:'javascript:alert(1)',verifieLe:'2026-10-04'}]}}])}}));
});
test('mismatched catalogue stock and blank dosage are rejected before consuming',()=>{
 const {a,stock,nodes}=boot(),oni=a.snapshot(a.search('oni','al')[0]),kami=a.snapshot(a.search('kami','al')[0]);
 a.load('prep',{aromeCatalogue:oni});nodes.arome={value:''};assert.throws(()=>a.validate('prep',{}));nodes.arome.value='10';
 const id=stock.addLot({type:'arome',nom:'Kami',volumeInitial:30,volumeRestant:30,prixTotal:null,dateAchat:'2026-10-04',aromeCatalogue:kami});
 assert.throws(()=>a.validate('prep',{arome:id}),/autre référence/);assert.equal(stock.readLots()[0].volumeRestant,30);
 assert.doesNotThrow(()=>a.validate('prep',{}));
});
test('editing an unknown bottle chooses a duration and updates its notification date',()=>{
 const {a,c}=boot(),f={id:'b1',nom:'Example',type:'DIY',categorieSaveur:'fruite',volume:50,nicotine:0,arome:10,quantite:1,preparedAt:'2026-10-04T12:00:00Z',...a.maturation('')};
 const values={...f,preparedAt:c.dateLocaleFlacon(f.preparedAt),steepDays:'3',coutFlacon:''};
 const next=c.corrigerFicheFlacon(f,values);assert.equal(next.maturationNonRenseignee,false);assert.equal(next.steepReadyAt,'2026-10-07T12:00:00.000Z');
 const blank=c.corrigerFicheFlacon(next,{...values,steepDays:''});assert.equal(blank.steepReadyAt,null);assert.equal(blank.steepDays,null);
});
test('real recipe save and bottle preparation retain identity and chosen deadline',async()=>{
 const {a,c,cost,nodes,data}=boot();const s=a.snapshot(a.search('oni','al')[0]);
 c.alert=message=>{throw Error(message);};c.mettreAJourTout=()=>{};c.afficherEcran=()=>{};
 vm.runInContext("MyVapeUI.readFlavorSelect=()=>['fruite','frais'];MyVapeUI.toast=()=>{};MyVapeSections.openReserve=()=>{};",c);
 const app=read('app.js');vm.runInContext(app.slice(app.indexOf('let sauvegardeRecetteEnCours='),app.indexOf('let sauvegardePreparationEnCours=')),c);
 vm.runInContext('reinitialiserRecette=()=>{};',c);
 for(const [key,value] of Object.entries({'recette-nom':'Oni test','recette-arome':'10','recette-nicotine':'0','recette-steep-days':'3','recette-additif-frais':'','recette-additif-sucre':''}))nodes[key]={value};
 a.load('recette',{aromeCatalogue:s});
 const amounts=cost.dosages(50,0,10,20);cost.snapshot=prefix=>({prefix,prices:{},amounts,tauxBooster:20,stockSelection:{}});
 await c.sauvegarderRecette();const recipe=JSON.parse(data.get('vt_recettes'))[0];assert.equal(recipe.aromeCatalogue.id,s.id);assert.equal(recipe.steepDays,3);
 vm.runInContext(app.slice(app.indexOf('let sauvegardePreparationEnCours='),app.indexOf('let sauvegardePreparationEnCours=')+app.slice(app.indexOf('let sauvegardePreparationEnCours=')).indexOf('\nlet ',10)),c);
 for(const [key,value] of Object.entries({nom:'Oni bottle','flacon-quantite':'2','date-ouverture':'2026-10-04','flacon-steep-days':'3',type:'DIY',volume:'50',nicotine:'0',arome:'10'}))nodes[key]={value};
 a.load('prep',recipe);await c.sauvegarderFlacon();const bottle=JSON.parse(data.get('vt_flacons'))[0];
 assert.equal(bottle.aromeCatalogue.id,s.id);assert.equal(bottle.steepReadyAt,'2026-10-07T00:00:00.000Z');assert.equal(bottle.quantite,2);
});
