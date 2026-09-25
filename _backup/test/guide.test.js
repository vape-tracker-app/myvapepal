import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {validate} from '../src/data.js';
const context=vm.createContext({document:{addEventListener(){}}});
vm.runInContext(fs.readFileSync(new URL('../../guide-articles.js',import.meta.url),'utf8'),context);
vm.runInContext(fs.readFileSync(new URL('../../guide-vape.js',import.meta.url),'utf8'),context);
const guide=vm.runInContext('MyVapeGuide',context);
test('guide articles have unique IDs and resolvable internal reading paths',()=>{
 const ids=new Set(guide.articles.map(a=>a.id));assert.equal(ids.size,24);
 for(const a of guide.articles){assert.ok(a.sections.length>=4);for(const id of a.related)assert.ok(ids.has(id),`${a.id} -> ${id}`);assert.ok(a.refs.length);}
});
test('all legacy favorite mappings lead to existing articles and remain backup compatible',()=>{
 const ids=new Set(guide.articles.map(a=>a.id));for(const id of Object.values(guide.aliases))assert.ok(ids.has(id));
 const oldFavorites=[{id:'pg'},{id:'dtl'},{id:'vapexpo'}];
 assert.doesNotThrow(()=>validate({version:1,data:{vt_gazette_favoris:JSON.stringify(oldFavorites)}}));
 assert.equal(guide.aliases.dtl,'mtl');assert.equal(guide.aliases.vapexpo,'histoire');
});
