import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plan} from './planner.mjs';
test('empty profile has no daily or growth reminders', () => assert.equal(plan({}, new Date(2026,8,23)).length, 0));
test('daily reminders start in the future and use calendar days across DST', () => {
 const result = plan({config:{dateArret:'2026-10-24'}},new Date(2026,9,24,10));
 const daily = result.filter(n=>n.id<20000);
 assert.equal(daily[0].schedule.at.getHours(),9);
 assert.match(daily[0].body,/1 jour sans/);
 assert.match(daily[1].body,/2 jours sans/);
 assert.equal(new Set(result.map(n=>n.id)).size,result.length);
 assert.ok(result.every(n=>n.isExactNotification===false));
});
test('only unopened unfinished future bottles and pending goals are scheduled',()=> {
 const now=new Date(2026,8,23,12);
 const future=new Date(2026,8,24,15).toISOString();
 const bottles=[{nom:'Ready',steepReadyAt:future},{actif:true,steepReadyAt:future},{startedAt:'2026-09-22',steepReadyAt:future},{termine:true,steepReadyAt:future},{steepReadyAt:'2026-09-22'},{steepReadyAt:'invalid'}];
 const result=plan({bottles,goals:[{date:'2026-09-24',titre:'3 mg/ml'},{date:'2026-09-24',statut:'atteint'},{date:'2026-09-22'}]},now);
 assert.equal(result.length,2); assert.match(result[0].body,/Ready/);
});
test('tree thresholds and stale events are respected',()=> {
 const result=plan({config:{dateArret:'2026-01-01'}},new Date(2026,1,2));
 const stages=result.filter(n=>n.id>=20000&&n.id<100000);
 assert.equal(stages.length,3); assert.match(stages[0].body,/stade 3/);
});
test('smoking pauses days and tree milestones, never all reminders',()=>{
 const config={dateArret:'2026-08-18',suiviTabac:{version:1,archives:[],cigarettes:[{date:'2026-09-25',quantite:4}]}};
 const result=plan({config},new Date(2026,8,25,12));
 const daily=result.filter(n=>n.id<20000);
 assert.match(daily[0].body,/38 jours/);assert.match(daily[1].body,/39 jours/);
 const tree=result.find(n=>n.id===20001);
 const expected=new Date(2026,7,18,9,5);expected.setDate(expected.getDate()+92);
 assert.equal(+tree.schedule.at,+expected);
});
test('smoking on a milestone date keeps that morning’s acquired stage',()=>{
 const config={dateArret:'2026-08-18',suiviTabac:{version:1,archives:[],cigarettes:[{date:'2026-09-18',quantite:1}]}};
 const result=plan({config},new Date(2026,8,18,8));
 assert.equal(+result.find(n=>n.id===20000).schedule.at,+new Date(2026,8,18,9,5));
 assert.match(result.find(n=>n.id===10000).body,/31 jours/);
});
