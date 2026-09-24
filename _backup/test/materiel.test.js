import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {capture,restore,validate} from '../src/data.js';
function boot(){
 const data=new Map();let id=0;
 const ctx=vm.createContext({Date,Math,Number,JSON,Set,crypto:{randomUUID:()=>`uuid-${++id}`},flacons:[{id:'f1',nom:'Alucard',startedAt:'2026-09-01',dateResistance:'2026-09-02'},{id:'f2',nom:'Kami',startedAt:'2026-09-01',dateResistance:'2026-09-03'}],localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}});
 vm.runInContext(readFileSync(new URL('../../materiel.js',import.meta.url),'utf8'),ctx);
 return {ctx,data,gear:vm.runInContext('MyVapeGear',ctx)};
}
const config={nom:'Cartouche principale',resistance:'Test',ohms:'1.2',watts:'',tirage:'Serré (comme une cigarette)',vapeur:'Discrète',avis:'J’aime bien',notes:'Pratique',dateResistance:'2026-09-10'};
function setup(){const t=boot();t.device=t.gear.upsertDevice({nom:'Wenax',type:'Pod',statut:'J’utilise',notes:''});t.config=t.gear.upsertConfiguration(t.device,config);return t;}
test('independent configurations keep independent coil dates; sharing updates both bottles',()=>{
 const t=setup();const second=t.gear.upsertConfiguration(t.device,{...config,nom:'Autre cartouche',ohms:'.4'});
 t.gear.associate('f1',t.config);t.gear.associate('f2',second);t.gear.setResistance(t.config,'2026-09-20');
 assert.equal(t.gear.resistanceDate(t.ctx.flacons[0]),'2026-09-20');assert.equal(t.gear.resistanceDate(t.ctx.flacons[1]),'2026-09-10');
 t.gear.associate('f2',t.config);assert.equal(t.gear.resistanceDate(t.ctx.flacons[1]),'2026-09-20');
});
test('detaching preserves effective date and future changes do not alter finished history',()=>{
 const t=setup();t.gear.associate('f1',t.config);t.gear.associate('f1','');assert.equal(t.ctx.flacons[0].dateResistance,'2026-09-10');assert.equal(t.ctx.flacons[0].materielConfigurationId,undefined);
 t.gear.associate('f2',t.config);const f=t.ctx.flacons[1];t.gear.freeze(f);f.termine=true;t.gear.setResistance(t.config,'2026-09-24');assert.equal(t.gear.resistanceDate(f),'2026-09-10');assert.match(f.materielResume,/Wenax/);
});
test('old unlinked bottles preserve dates; settings reject invalid values',()=>{const t=setup();assert.equal(t.gear.resistanceDate(t.ctx.flacons[0]),'2026-09-02');for(const v of [{ohms:'0'},{dateResistance:'2026-02-30'},{watts:'bad'}])assert.throws(()=>t.gear.upsertConfiguration(t.device,{...config,...v}));assert.throws(()=>t.gear.associate('f1','missing'));});
test('backup includes nested devices and links; old snapshot remains accepted',()=>{
 const t=setup();t.gear.associate('f1',t.config);const snap=capture(t.ctx.localStorage),other=boot();restore(other.ctx.localStorage,snap);
 assert.equal(JSON.parse(other.data.get('vt_materiel'))[0].configurations[0].ohms,1.2);assert.equal(JSON.parse(other.data.get('vt_flacons'))[0].materielConfigurationId,t.config);
 assert.equal(validate({version:1,data:{vt_flacons:'[]'}}).data.vt_materiel,null);
});
test('invalid nested configuration is refused by backup validator',()=>{
 const t=setup();const snap=capture(t.ctx.localStorage);const devices=JSON.parse(snap.data.vt_materiel);devices[0].configurations[0].ohms=-4;snap.data.vt_materiel=JSON.stringify(devices);assert.throws(()=>validate(snap));
});
test('storage failure leaves device configuration unchanged',()=>{const t=setup();t.ctx.localStorage.setItem=()=>{throw Error('quota');};assert.throws(()=>t.gear.setResistance(t.config,'2026-09-24'));assert.equal(t.gear.find(t.config).config.dateResistance,'2026-09-10');});

test('resistance titles replace free names and MTL/DTL survive backup',()=>{
 const t=setup();
 assert.equal(t.gear.find(t.config).config.nom,'Résistance : 1.2 Ω');
 assert.equal(t.gear.find(t.config).config.tirage,'Indirect (MTL)');
 t.gear.upsertConfiguration(t.device,{...config,nom:undefined,tirage:'Direct (DTL)',ohms:'0.4'},t.config);
 assert.equal(t.gear.find(t.config).config.nom,'Résistance : 0.4 Ω');
 assert.equal(t.gear.find(t.config).config.tirage,'Direct (DTL)');
});

test('archive resistance preserves links and dates, excludes new use and allows independent replacement',()=>{
 const t=setup();t.gear.associate('f1',t.config);
 t.gear.setArchived(t.device,t.config,true,'Tirage trop serré');
 assert.equal(t.ctx.flacons[0].materielConfigurationId,t.config);
 assert.equal(t.gear.resistanceDate(t.ctx.flacons[0]),'2026-09-10');
 assert.throws(()=>t.gear.associate('f2',t.config),/archivé/);
 assert.throws(()=>t.gear.setResistance(t.config,'2026-09-24'),/Réactive/);
 const next=t.gear.upsertConfiguration(t.device,{...config,ohms:0.6});
 t.gear.associate('f1',next);
 assert.equal(t.gear.find(t.config).config.notes,'Pratique');
 assert.equal(t.gear.find(t.config).config.motifArchivage,'Tirage trop serré');
 t.gear.upsertConfiguration(t.device,{...config,notes:'Avis précisé'},t.config);
 assert.equal(t.gear.find(t.config).config.archivee,true);
 t.gear.setArchived(t.device,t.config,false);t.gear.associate('f2',t.config);
 assert.equal(t.ctx.flacons[1].materielConfigurationId,t.config);
});
test('whole device archive and restore preserve independently archived resistances',()=>{
 const t=setup();const next=t.gear.upsertConfiguration(t.device,{...config,ohms:0.6});
 t.gear.setArchived(t.device,t.config,true);t.gear.setArchived(t.device,null,true,'Autre pod préféré');
 assert.throws(()=>t.gear.associate('f1',next),/archivé/);
 t.gear.setArchived(t.device,null,false);t.gear.associate('f1',next);
 assert.throws(()=>t.gear.associate('f2',t.config),/archivé/);
});
test('archive metadata survives backup and bad flags are rejected',()=>{
 const t=setup();t.gear.setArchived(t.device,t.config,true,'Pas convaincu');t.gear.setArchived(t.device,null,true,'Autre appareil');
 const snap=capture(t.ctx.localStorage),other=boot();restore(other.ctx.localStorage,snap);
 const restored=other.gear.find(t.config);
 assert.equal(restored.config.archivee,true);assert.equal(restored.config.motifArchivage,'Pas convaincu');assert.equal(restored.device.statut,'Je n’utilise plus');
 const records=JSON.parse(snap.data.vt_materiel);records[0].configurations[0].archivee='yes';snap.data.vt_materiel=JSON.stringify(records);assert.throws(()=>validate(snap));
});
test('failed archive save leaves previous state intact',()=>{
 const t=setup();t.ctx.localStorage.setItem=()=>{throw Error('quota');};
 assert.throws(()=>t.gear.setArchived(t.device,t.config,true));assert.equal(t.gear.find(t.config).config.archivee,undefined);
});
