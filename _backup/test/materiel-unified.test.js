import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {capture,restore} from '../src/data.js';
function boot(){
 const data=new Map();let n=0,writes=0;
 const ctx=vm.createContext({Date,Math,Number,JSON,Set,crypto:{randomUUID:()=>`gear-${++n}`},echapperHTML:s=>s,flacons:[{id:'a',nom:'A',startedAt:'2026-09-01'},{id:'b',nom:'B',startedAt:'2026-09-01'}],localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);writes++;},removeItem:k=>data.delete(k)}});
 vm.runInContext(readFileSync(new URL('../../materiel.js',import.meta.url),'utf8'),ctx);
 return {ctx,data,gear:vm.runInContext('MyVapeGear',ctx),writes:()=>writes};
}
const device={nom:'Mon appareil',marque:'Ma marque',modele:'Mon modèle',type:'Pod',statut:'J’utilise',notes:''};
const config={systeme:'Cartouche à résistance intégrée',cartouche:'Cartouche test',resistance:'Cartouche test',ohms:0.8,watts:'',tirage:'Non renseigné',vapeur:'Non renseigné',avis:'Pas encore testé',notes:'',dateResistance:'2026-09-01'};
function setup(overrides={}){const t=boot();t.id=t.gear.saveMaterial(device,{...config,...overrides});t.cid=JSON.parse(t.data.get('vt_materiel'))[0].configurations[0].id;return t;}
test('appareil et première cartouche sont enregistrés en une seule écriture',()=>{
 const t=setup();assert.equal(t.writes(),1);const d=JSON.parse(t.data.get('vt_materiel'))[0];assert.equal(d.configurations.length,1);assert.equal(d.configurations[0].cartouche,'Cartouche test');
});
test('une configuration invalide ne laisse aucun appareil incomplet',()=>{
 const t=boot();assert.throws(()=>t.gear.saveMaterial(device,{...config,ohms:-1}));assert.equal(t.data.has('vt_materiel'),false);assert.equal(t.writes(),0);
 t.ctx.localStorage.setItem=()=>{throw Error('quota');};assert.throws(()=>t.gear.saveMaterial(device,config));assert.equal(t.data.has('vt_materiel'),false);
});
test('changement de cartouche partagé, historique et flacon terminé figé',()=>{
 const t=setup();t.gear.associate('a',t.cid);t.gear.associate('b',t.cid);const a=t.ctx.flacons[0],b=t.ctx.flacons[1];
 t.gear.freeze(b);b.termine=true;t.gear.setResistance(t.cid,'2026-09-12');
 assert.equal(t.gear.resistanceDate(a),'2026-09-12');assert.equal(t.gear.resistanceDate(b),'2026-09-01');
 assert.equal(t.gear.changeLabel(a),'Changer ma cartouche');assert.match(t.gear.maintenanceText(a),/Cartouche changée le 12\/09\/2026/);assert.match(t.gear.maintenanceText(b),/01\/09\/2026/);
 assert.equal(t.gear.find(t.cid).config.historiqueResistances[0].dureeJours,11);
});
test('montage et coton ont des dates et historiques indépendants',()=>{
 const t=setup({systeme:'Reconstructible',expert:{atomiseur:'Mon ato'},dateCoton:'2026-09-01'});t.gear.associate('a',t.cid);t.gear.associate('b',t.cid);
 t.gear.setCotton(t.cid,'2026-09-05');assert.equal(t.gear.resistanceDate(t.ctx.flacons[0]),'2026-09-01');
 assert.equal(t.gear.find(t.cid).config.historiqueCotons[0].dureeJours,4);assert.match(t.gear.bottleLine(t.ctx.flacons[1]),/Coton changé le 05\/09\/2026/);
 t.gear.setResistance(t.cid,'2026-09-10');assert.equal(t.gear.find(t.cid).config.dateCoton,'2026-09-05');assert.equal(t.gear.changeLabel(t.ctx.flacons[0]),'Changer mon montage');
 const before=t.data.get('vt_materiel');assert.throws(()=>t.gear.setCotton(t.cid,'2026-09-04'));assert.equal(t.data.get('vt_materiel'),before);
});
test('le clearomiseur conserve le libellé résistance et son association après modification',()=>{
 const t=setup({systeme:'Résistance préfabriquée remplaçable',cartouche:'',clearomiseur:'Innokin|Zenith II'});t.gear.associate('a',t.cid);
 t.gear.upsertConfiguration(t.id,{...config,systeme:'Résistance préfabriquée remplaçable',clearomiseur:'Innokin|Zlide',cartouche:'',ohms:1.2},t.cid);
 assert.equal(t.ctx.flacons[0].materielConfigurationId,t.cid);assert.equal(t.gear.changeLabel(t.ctx.flacons[0]),'Changer ma résistance');assert.match(t.gear.bottleLine(t.ctx.flacons[0]),/Zlide/);
});
test('deux cartouches du même appareil gardent des dates distinctes',()=>{
 const t=setup();const other=t.gear.upsertConfiguration(t.id,{...config,cartouche:'Seconde cartouche'});t.gear.associate('a',t.cid);t.gear.associate('b',other);
 t.gear.setResistance(t.cid,'2026-09-11');assert.equal(t.gear.resistanceDate(t.ctx.flacons[1]),'2026-09-01');
});
test('les nouveaux champs et historiques survivent à la sauvegarde/restauration',()=>{
 const t=setup({systeme:'Reconstructible',dateCoton:'2026-09-01',reservoirManuel:'Réservoir personnel',expert:{atomiseur:'Mon ato'}});t.gear.setCotton(t.cid,'2026-09-02');t.gear.associate('a',t.cid);t.gear.freeze(t.ctx.flacons[0]);
 t.ctx.localStorage.setItem('vt_flacons',JSON.stringify(t.ctx.flacons));const other=boot();restore(other.ctx.localStorage,capture(t.ctx.localStorage));
 assert.equal(other.gear.find(t.cid).config.reservoirManuel,'Réservoir personnel');assert.equal(other.gear.find(t.cid).config.historiqueCotons.length,1);assert.equal(JSON.parse(other.data.get('vt_flacons'))[0].materielSysteme,'Reconstructible');
});
test('je ne sais pas permet une fiche sans inventer de mesures',()=>{
 const t=setup({systeme:'Non renseigné',ohms:'',dateResistance:'',cartouche:'',resistance:''});assert.equal(t.gear.find(t.cid).config.ohms,null);assert.equal(t.gear.find(t.cid).config.dateResistance,null);
});
