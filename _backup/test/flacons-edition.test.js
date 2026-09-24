import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {capture,restore} from '../src/data.js';
const code=readFileSync(new URL('../../flacons-edition.js',import.meta.url),'utf8');
function boot(){
 const data=new Map();
 const ctx=vm.createContext({Date,Math,Number,JSON,crypto:{randomUUID:()=> 'expense-1'},document:{addEventListener(){}},flacons:[],depenses:[],localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}});
 vm.runInContext(code,ctx);return {ctx,data};
}
const bottle={id:'b1',nom:'Avant',type:'DIY',categorieSaveur:'fruite',volume:100,nicotine:3,arome:10,preparedAt:'2026-08-01T12:34:56.123Z',steepDays:7,steepReadyAt:'2026-08-08T12:34:56.123Z',quantite:3,actif:false,termine:false};
function values(c,f){return {nom:'Après',type:'Prêt à vaper',categorieSaveur:'menthe',volume:'75',nicotine:'6',arome:'5',preparedAt:c.dateLocaleFlacon(f.preparedAt),steepDays:'7',quantite:'2',coutFlacon:'12.50',startedAt:c.dateLocaleFlacon(f.startedAt),dateResistance:''};}
test('editing stock preserves exact unchanged dates, IDs and state',()=>{const {ctx:c}=boot();const n=c.corrigerFicheFlacon(bottle,values(c,bottle));assert.equal(n.id,bottle.id);assert.equal(n.preparedAt,bottle.preparedAt);assert.equal(n.steepReadyAt,bottle.steepReadyAt);assert.equal(n.quantite,2);assert.equal(n.coutFlacon,12.5);assert.equal(n.actif,false);assert.equal(bottle.nom,'Avant');});
test('preparation date and maturation duration recalculate ready date',()=>{const {ctx:c}=boot();const v=values(c,bottle);v.preparedAt='2026-07-10T15:30';v.steepDays='2';const n=c.corrigerFicheFlacon(bottle,v);assert.equal(+new Date(n.steepReadyAt),+new Date(v.preparedAt)+2*86400000);});
test('open All Day edits date aliases, clears resistance without losing role',()=>{const {ctx:c}=boot();const f={...bottle,quantite:1,actif:true,startedAt:'2026-08-08T12:00:00Z',dateResistance:'2026-08-09'};const v=values(c,f);v.startedAt='2026-08-06T17:00';const n=c.corrigerFicheFlacon(f,v);assert.equal(n.startedAt,n.dateOuverture);assert.equal(n.actif,true);assert.equal(n.quantite,1);assert.equal(n.dateResistance,null);});
test('invalid stock, amount or date cannot change bottle',()=>{const {ctx:c}=boot();for(const change of [{quantite:'0'},{coutFlacon:'-1'},{preparedAt:''},{volume:'0'}])assert.throws(()=>c.corrigerFicheFlacon(bottle,{...values(c,bottle),...change}));});
test('yes posts one expense at selected opening date; no posts none',()=>{for(const yes of [true,false]){const {ctx:c}=boot();const f={...bottle,coutFlacon:12.5,startedAt:'2026-07-31T12:00:00Z'};c.enregistrerFlaconEtDepense(f,yes);assert.equal(c.flacons.length,1);assert.equal(c.depenses.length,yes?1:0);if(yes){assert.equal(c.depenses[0].date,f.startedAt);assert.equal(c.depenses[0].montant,12.5);}}});
test('expense write failure rolls bottle storage and in-memory state back',()=>{const {ctx:c,data}=boot();c.localStorage.setItem=(k,v)=>{if(k==='vt_depenses')throw Error('quota');data.set(k,v);};assert.throws(()=>c.enregistrerFlaconEtDepense({...bottle,coutFlacon:10},true));assert.equal(c.flacons.length,0);assert.equal(data.has('vt_flacons'),false);});
test('backup round trip preserves edited fields and optional cost',()=>{const {ctx:c}=boot();const n=c.corrigerFicheFlacon(bottle,values(c,bottle));c.enregistrerFlaconEtDepense(n,false);const snap=capture(c.localStorage);const dest=boot();restore(dest.ctx.localStorage,snap);assert.equal(JSON.parse(dest.ctx.localStorage.getItem('vt_flacons'))[0].coutFlacon,12.5);});
test('PAV aroma cannot be edited; multiple flavors and cost survive backup',()=>{
 const {ctx:c}=boot();const v={...values(c,bottle),type:'Prêt à vaper',arome:'99',categoriesSaveurs:['fruite','frais']};
 const n=c.corrigerFicheFlacon(bottle,v);assert.equal(n.arome,10);assert.deepEqual(Array.from(n.categoriesSaveurs),['fruite','frais']);
 c.enregistrerFlaconEtDepense(n,false);const d=boot();restore(d.ctx.localStorage,capture(c.localStorage));assert.deepEqual(JSON.parse(d.ctx.localStorage.getItem('vt_flacons'))[0].categoriesSaveurs,['fruite','frais']);
 const diy=c.corrigerFicheFlacon(bottle,{...v,type:'DIY'});assert.equal(diy.arome,99);
});
test('flavor icons preserve legacy mint and show each selected flavor',()=>{
 const ctx=vm.createContext({document:{addEventListener(){}}});
 vm.runInContext(readFileSync(new URL('../../enhancements.js',import.meta.url),'utf8'),ctx);
 assert.match(vm.runInContext("MyVapeUI.bottleIcon({categorieSaveur:'menthe'})",ctx),/menthe.png/);
 const icons=vm.runInContext("MyVapeUI.bottleIcon({categoriesSaveurs:['fruite','frais']})",ctx);
 assert.match(icons,/fruite.png/);assert.match(icons,/frais.png/);assert.equal((icons.match(/<img/g)||[]).length,2);
});
