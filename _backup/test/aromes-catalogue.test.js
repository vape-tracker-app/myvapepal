import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=new URL('../../aromes-catalogue.js',import.meta.url);
const source=readFileSync(file,'utf8');
const c=vm.runInNewContext(source+'; JSON.parse(JSON.stringify(catalogueAromes))',{});
const unique=(items)=>assert.equal(new Set(items).size,items.length);
const validDate=s=>{assert.match(s,/^\d{4}-\d{2}-\d{2}$/);assert.equal(new Date(s).toISOString().slice(0,10),s);};
const range=(min,max,limit)=>{assert(Number.isFinite(min)&&Number.isFinite(max));assert(min>=0&&min<=max&&max<=limit);};
test('catalogue autonome, chargeable sans DOM ou stockage et chargé avant son interface',()=>{
 assert.equal(c.versionSchema,2);
 assert(!/\b(?:document|window|localStorage|fetch)\b/.test(source));
 const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 assert(html.indexOf('src="aromes-catalogue.js') < html.indexOf('src="aromes.js'));
});
test('identifiants et éditions uniques ; six fiches initiales préservées',()=>{
 for(const list of [c.fabricants,c.marques,c.saveurs,c.aromes]){unique(list.map(x=>x.id));for(const x of list)assert.match(x.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);}
 unique(c.aromes.map(a=>[a.marqueId,a.gamme,a.nom,a.edition].join('|')));
 for(const n of ['ragnarok','ragnarok-zero','oni'])for(const e of ['original','green'])assert(c.aromes.some(a=>a.id===`al-ultimate-${n}-${e}`));
 assert.equal(c.couverture.referenceCount,new Set(c.aromes.map(a=>a.referenceId)).size);
 assert.equal(c.couverture.ficheCount,c.aromes.length);
});
test('aucune référence orpheline et éditions regroupées sans mélanger les recettes',()=>{
 for(const m of c.marques){assert(m.fabricantId===null||c.fabricants.some(f=>f.id===m.fabricantId));}
 for(const a of c.aromes){
  assert(c.marques.some(m=>m.id===a.marqueId));assert(a.saveurIds.length>0);unique(a.saveurIds);
  for(const id of a.saveurIds)assert(c.saveurs.some(s=>s.id===id));
  for(const other of c.aromes.filter(o=>o.referenceId===a.referenceId))assert.equal([other.marqueId,other.gamme,other.nom].join('|'),[a.marqueId,a.gamme,a.nom].join('|'));
 }
});
test('sources datées et attribution correcte des conseils',()=>{
 for(const a of c.aromes){
  unique(a.sources.map(s=>s.id));assert(a.sources.some(s=>s.id===a.sourcePrincipaleId));
  for(const s of a.sources){assert(['fabricant','revendeur'].includes(s.type));assert.equal(new URL(s.url).protocol,'https:');validDate(s.verifieLe);}
  for(const d of [...a.dosages,...(a.maturation?[a.maturation]:[])])assert(a.sources.some(s=>s.id===d.sourceId));
  if(a.marqueId==='revolute')assert(a.sources.every(s=>s.type==='revendeur'));
 }
});
test('plages et ratios valides ; informations inconnues distinctes de faux ou zéro',()=>{
 for(const a of c.aromes){
  assert(['arome-simple','concentre-compose'].includes(a.type));
  for(const key of ['fraicheur','sansEdulcorant'])assert([true,false,null].includes(a[key]));
  for(const d of a.dosages){range(d.minPourcent,d.maxPourcent,100);assert(d.minPourcent>0);if(d.ratioBase!==null){range(0,d.ratioBase.pg,100);range(0,d.ratioBase.vg,100);assert.equal(d.ratioBase.pg+d.ratioBase.vg,100);}}
  if(a.maturation!==null)range(a.maturation.minJours,a.maturation.maxJours,365);
 }
});
test('champs contradictoires ou non documentés restent sans valeur exploitable',()=>{
 for(const a of c.aromes)for(const p of a.pointsAVerifier){
  assert(p.motif.length>0);for(const id of p.sourceIds)assert(a.sources.some(s=>s.id===id));
  if(p.champ==='dosages')assert.equal(a.dosages.length,0);
  if(p.champ==='maturation')assert.equal(a.maturation,null);
 }
 for(const id of ['revolute-classic-4x','cirkus-classic-ry4','t-juice-clara-t'])assert.equal(c.aromes.find(a=>a.id===id).dosages.length,0);
 for(const a of c.aromes.filter(a=>a.marqueId==='vampire-vape')){assert.equal(a.maturation,null);assert.equal(a.dosages[0].ratioBase,null);}
});
test('les versions sans fraîcheur et Green ne sont pas confondues',()=>{
 for(const a of c.aromes.filter(a=>a.marqueId==='full-moon'&&a.gamme==='Just Fruit'))assert.equal(a.fraicheur,false);
 assert.equal(c.aromes.find(a=>a.id==='al-ultimate-ragnarok-green').fraicheur,true);
 assert.equal(c.aromes.find(a=>a.id==='al-ultimate-ragnarok-zero-green').fraicheur,false);
});
