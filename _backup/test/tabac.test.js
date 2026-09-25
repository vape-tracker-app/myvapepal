import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import tabac from '../../suivi-tabac.js';
import {capture,restore,validate} from '../src/data.js';
const profile={dateArret:'2026-08-18',prenom:'Test',cigsJour:20,cigsPaquet:20,prixPaquet:12,vapote:true};
const today='2026-09-25';
const source=readFileSync(new URL('../../app.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../../suivi-tabac.js',import.meta.url),'utf8');
const memory=initial=>{const map=new Map(Object.entries(initial||{}));return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};};
function app(config=profile,expenses=[],at='2026-09-25T12:00:00') {
 const storage=memory({vt_config:JSON.stringify(config),vt_depenses:JSON.stringify(expenses)});
 const elements=Object.fromEntries(['card-jours','card-cigs','card-economies','card-economies-mois','tabac-evite-total','dépenses-vape-total','economie-nette-detail','tabac-evite-mois','depenses-vape-mois','economie-nette-mois','nom-stade-arbre','victoires-jours'].map(id=>[id,{textContent:'',style:{}}]));
 class Clock extends Date {constructor(...args){super(...(args.length?args:[at]));}static now(){return +new Date(at);}}
 const context=vm.createContext({Date:Clock,Intl,console,localStorage:storage,setTimeout(){},clearTimeout(){},document:{getElementById:id=>elements[id]||null,addEventListener(){}},window:{},MyVapeUI:{illustrerTexte:(node,text)=>node.textContent=text,observeStage(){}}});
 vm.runInContext(core,context);vm.runInContext(source,context);
 return {storage,elements,context,run:code=>vm.runInContext(code,context)};
}
test('legacy profile: 38 completed local days, 760 avoided cigarettes, no mutation',()=>{
 assert.deepEqual(tabac.stats(profile,today),{elapsed:38,days:38,smoked:0});
 const a=app(profile,[{montant:50,date:'2026-09-20'}]);a.run('mettreAJourDashboard();afficherFinances();');
 assert.equal(a.elements['card-jours'].textContent,38);assert.equal(a.elements['card-cigs'].textContent,760);
 assert.equal(a.elements['card-economies'].textContent,'406.00 €');assert.equal(a.elements['economie-nette-detail'].textContent,'406.00 €');
 assert.equal(a.storage.getItem('vt_config'),JSON.stringify(profile));
});
test('one today keeps 38 acquired days; tomorrow 38, following smoke-free day 39',()=>{
 const p=tabac.record(profile,1,today);
 assert.equal(tabac.stats(p,today).days,38);assert.equal(tabac.stats(p,'2026-09-26').days,38);assert.equal(tabac.stats(p,'2026-09-27').days,39);
 assert.equal(tabac.financialStats(p,today).avoided,759);
 assert.equal(profile.suiviTabac,undefined);
});
test('repeat same day aggregates quantity, two dates exclude exactly two days',()=>{
 let p=tabac.record(profile,1,today);p=tabac.record(p,3,today);
 assert.deepEqual(p.suiviTabac.cigarettes,[{date:today,quantite:4}]);assert.equal(tabac.stats(p,'2026-09-26').days,38);
 p=tabac.record(p,2,'2026-09-26');assert.deepEqual(tabac.stats(p,'2026-09-27'),{elapsed:40,days:38,smoked:6});
 assert.equal(tabac.stats(p,'2026-09-28').days,39);
});
test('actual cigarettes reduce global savings, not a full day; expenses are untouched',()=>{
 const expenses=[{montant:50,date:'2026-09-20'}],p=tabac.record(profile,2,today),a=app(p,expenses);
 a.run('mettreAJourDashboard();afficherFinances();');
 assert.equal(a.elements['card-cigs'].textContent,758);assert.equal(a.elements['card-jours'].textContent,38);
 assert.equal(a.elements['tabac-evite-total'].textContent,'454.80 €');assert.equal(a.elements['card-economies'].textContent,'404.80 €');assert.equal(a.elements['economie-nette-detail'].textContent,'404.80 €');
 assert.equal(a.storage.getItem('vt_depenses'),JSON.stringify(expenses));
});
test('monthly proration, month allocation and real purchase date filters are preserved',()=>{
 const expenses=[{montant:20,date:'2026-08-25T12:00:00'},{montant:50,date:'2026-09-20T12:00:00'},{montant:99,date:'2026-10-01T12:00:00'}];
 let p=tabac.record(profile,2,'2026-08-31');p=tabac.record(p,3,'2026-09-01');p=tabac.record(p,1,today);
 const before=app(profile,expenses),after=app(p,expenses);
 for(const [month,count] of [[7,2],[8,4]]){
   const a=before.run(`calculerEconomiePourMois(2026,${month})`),b=after.run(`calculerEconomiePourMois(2026,${month})`);
   assert.ok(Math.abs(a.tabac-b.tabac-count*.6)<1e-8);assert.equal(a.depenses,b.depenses);assert.equal(a.jours,b.jours);assert.ok(Math.abs(a.nette-b.nette-count*.6)<1e-8);
 }
 assert.equal(after.run('calculerEconomiePourMois(2026,9).tabac'),0);
});
test('every existing tree threshold remains acquired when smoking on that day',()=>{
 for(const days of [31,91,151,241]){
   const d=new Date('2026-01-01T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);const date=d.toISOString().slice(0,10);
   const p=tabac.record({...profile,dateArret:'2026-01-01'},4,date);
   assert.equal(tabac.stats(p,date).days,days);
   d.setUTCDate(d.getUTCDate()+1);assert.equal(tabac.stats(p,d.toISOString().slice(0,10)).days,days);
 }
 const a=app(tabac.record(profile,1,today));a.run('mettreAJourCerisierHD()');assert.match(a.elements['nom-stade-arbre'].textContent,/Stade 2/);
});
test('local midnight, leap year and DST count dates, not UTC hours',()=>{
 const script=`const t=require('./suivi-tabac.js'); const p={dateArret:'2026-09-24'}; if(t.stats(p,t.localDate(new Date('2026-09-25T00:01:00'))).days!==1)process.exit(1);if(t.elapsed('2026-10-24','2026-10-26')!==2)process.exit(2);if(t.elapsed('2024-02-28','2024-03-01')!==2)process.exit(3);`;
 for(const TZ of ['Europe/Paris','America/Los_Angeles','Pacific/Auckland'])execFileSync(process.execPath,['-e',script],{cwd:new URL('../../',import.meta.url),env:{...process.env,TZ}});
});
test('confirmed restart archives history, preserves finances and counts today only once',()=>{
 const expenses=[{montant:50,date:'2026-09-20'}];
 let p=tabac.record(profile,2,today),before=tabac.financialStats(p,today);
 p=tabac.restart(p,expenses,today);
 assert.equal(p.dateArret,today);assert.equal(tabac.stats(p,today).days,0);assert.equal(tabac.stats(p,'2026-09-26').days,0);
 assert.equal(p.suiviTabac.archives[0].bilan.joursSansTabac,38);assert.ok(Math.abs(p.suiviTabac.archives[0].bilan.economieNette-404.8)<1e-8);
 assert.deepEqual(tabac.financialStats(p,today),before);assert.equal(tabac.countInMonth(p,2026,8,today),2);
 p=tabac.record(p,1,today);p=tabac.restart(p,expenses,today);
 assert.equal(tabac.financialStats(p,today).smoked,3);assert.equal(p.suiviTabac.archives.length,2);
 p=tabac.record(p,2,'2026-09-27');p=tabac.restart(p,expenses,'2026-09-27');
 assert.equal(tabac.financialStats(p,'2026-09-27').smoked,5);assert.equal(p.suiviTabac.dateDebutFinances,'2026-08-18');
 const after=app(p,expenses,'2026-09-27T12:00:00'),original=app({...profile,suiviTabac:{version:1,archives:[],cigarettes:[{date:today,quantite:3},{date:'2026-09-27',quantite:2}]}},expenses,'2026-09-27T12:00:00');
 after.run('mettreAJourDashboard();afficherFinances()');original.run('mettreAJourDashboard();afficherFinances()');
 for(const id of ['card-cigs','card-economies','tabac-evite-total','economie-nette-detail','tabac-evite-mois','economie-nette-mois'])assert.equal(after.elements[id].textContent,original.elements[id].textContent,id);
 assert.equal(after.elements['card-jours'].textContent,0);
});
test('backup/reload round trip preserves dated cigarettes, restart archives and unrelated data',()=>{
 let p=tabac.record(profile,4,today);p=tabac.restart(p,[],today);
 const raw=JSON.stringify(p),s=memory({vt_config:raw,vt_flacons:'[{"id":"b","nom":"Kami","dateResistance":"2026-09-20"}]',vt_stock_diy:'[]'});
 const target=memory();restore(target,capture(s));
 assert.equal(target.getItem('vt_config'),raw);assert.equal(target.getItem('vt_flacons'),s.getItem('vt_flacons'));
 assert.equal(tabac.stats(JSON.parse(target.getItem('vt_config')),'2026-09-26').days,0);
 assert.equal(tabac.financialStats(JSON.parse(target.getItem('vt_config')),today).avoided,756);
 assert.doesNotThrow(()=>validate({version:1,data:{vt_config:JSON.stringify(profile)}}));
});
test('malformed smoke data and archives rejected before restore writes',()=>{
 const p=tabac.record(profile,1,today),s=memory({vt_config:JSON.stringify(profile)}),before=s.getItem('vt_config');
 const invalid=[null,[],{version:2,cigarettes:[],archives:[]},...[[{date:'2026-02-30',quantite:1}],[{date:today,quantite:0}],[{date:today,quantite:-1}],[{date:today,quantite:1.5}],[{date:today,quantite:'1'}],[{date:today,quantite:1},{date:today,quantite:2}]].map(cigarettes=>({version:1,cigarettes,archives:[]})),{...p.suiviTabac,archives:[{}]}];
 for(const suiviTabac of invalid){assert.throws(()=>restore(s,{version:1,data:{vt_config:JSON.stringify({...p,suiviTabac})}}));assert.equal(s.getItem('vt_config'),before);}
 for(const q of [0,-1,1.5,NaN,Infinity,1000001])assert.throws(()=>tabac.record(p,q,today));
});
test('correcting start date never deletes dated records and excludes those outside journey',()=>{
 const p=tabac.record(profile,1,'2026-08-20'),corrected={...p,dateArret:'2026-09-01'};
 assert.equal(tabac.stats(corrected,today).smoked,0);assert.equal(corrected.suiviTabac.cigarettes.length,1);
 assert.equal(tabac.stats({...corrected,dateArret:profile.dateArret},today).smoked,1);
});
