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
