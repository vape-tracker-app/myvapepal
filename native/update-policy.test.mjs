import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shouldPrompt} from './update-policy.mjs';
test('only a valid update available to this Play user triggers a prompt',()=>{
 for(const info of [null,{}, {available:false,versionCode:6},{available:true,versionCode:0},{available:true,versionCode:NaN}])assert.equal(shouldPrompt(info,null),false);
 assert.equal(shouldPrompt({available:true,versionCode:6},null),true);
});
test('later waits 24 hours but does not hide a newer release',()=>{
 const info={available:true,versionCode:6},now=100000000,dismissed={versionCode:6,at:now};
 assert.equal(shouldPrompt(info,dismissed,now+1000),false);
 assert.equal(shouldPrompt(info,dismissed,now+86400000),true);
 assert.equal(shouldPrompt({...info,versionCode:7},dismissed,now+1000),true);
 assert.equal(shouldPrompt(info,{versionCode:6,at:'bad'},now),true);
});
