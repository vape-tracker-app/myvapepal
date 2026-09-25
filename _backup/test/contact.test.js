import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const values={email:'tester@example.com',subject:'Question sur le matériel',message:'Comment modifier ma fiche ?'};
function boot(fetch,endpoint='https://formspree.io/f/testonly'){
 const ctx=vm.createContext({window:{MyVapeContactConfig:{endpoint}},document:{addEventListener(){}},fetch,AbortController,setTimeout,clearTimeout});
 vm.runInContext(readFileSync(new URL('../../contact.js',import.meta.url),'utf8'),ctx);return vm.runInContext('MyVapeContact',ctx);
}
test('unconfigured or invalid contact never sends any data',async()=>{
 let calls=0;const send=async()=>{calls++};
 await assert.rejects(boot(send,'').send(values),/bientôt/);
 for(const invalid of [{email:'no'},{subject:' '},{subject:'x\ny'},{message:' '},{message:'x'.repeat(5001)}])await assert.rejects(boot(send).send({...values,...invalid}));
 assert.equal(calls,0);
});
test('only contact fields are sent; success requires explicit service confirmation',async()=>{
 let payload;
 const api=boot(async(url,options)=>{assert.equal(url,'https://formspree.io/f/testonly');payload=JSON.parse(options.body);assert.equal(options.credentials,'omit');return {ok:true,json:async()=>({ok:true})};});
 assert.equal(await api.send({...values,vt_config:'must not be sent'}),true);assert.deepEqual(payload,values);
 for(const response of [{ok:false,status:429},{ok:false,status:500},{ok:true,json:async()=>({})}])await assert.rejects(boot(async()=>response).send(values));
});
test('network uncertainty never becomes a successful send',async()=>{
 await assert.rejects(boot(async()=>{throw Object.assign(new Error(),{name:'AbortError'})}).send(values),/confirmer/);
});
