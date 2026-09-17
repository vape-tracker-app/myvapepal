import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,serverTimestamp} from 'firebase/firestore';
test('Firestore isolates verified owners and rejects stale revisions',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-myvapepal',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});
 try{
 const a=env.authenticatedContext('a',{email_verified:true}).firestore();
 const b=env.authenticatedContext('b',{email_verified:true}).firestore();
 const unverified=env.authenticatedContext('a',{email_verified:false}).firestore();
 const anon=env.unauthenticatedContext().firestore();
 const payload=JSON.stringify({version:1,data:{vt_config:'test'}});
 const row=revision=>({payload,revision,updatedAt:serverTimestamp()});
 await assertSucceeds(setDoc(doc(a,'backups','a'),row(1)));
 await assertSucceeds(getDoc(doc(a,'backups','a')));
 await assertFails(getDoc(doc(b,'backups','a')));
 await assertFails(setDoc(doc(b,'backups','a'),row(2)));
 await assertFails(getDoc(doc(unverified,'backups','a')));
 await assertFails(getDoc(doc(anon,'backups','a')));
 await assertFails(setDoc(doc(a,'backups','a'),row(1)));
 await assertSucceeds(setDoc(doc(a,'backups','a'),row(2)));
 await assertFails(setDoc(doc(a,'backups','a'),{...row(3),extra:'forbidden'}));
 await assertFails(setDoc(doc(a,'backups','a'),{...row(3),payload:'x'.repeat(750001)}));
 }finally{await env.cleanup();}
});

test('real Firebase repository round trip and concurrent writer protection',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const {initializeApp,deleteApp}=await import('firebase/app');
 const {getFirestore,connectFirestoreEmulator}=await import('firebase/firestore/lite');
 const {createRepository}=await import('../src/firebase-service.js');
 const env=await initializeTestEnvironment({projectId:'demo-myvapepal',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}});
 const app=initializeApp({projectId:'demo-myvapepal',apiKey:'test'},'repository-test');
 try {
  const db=getFirestore(app);const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(db,host,Number(port),{mockUserToken:{sub:'roundtrip',email_verified:true}});
  const repo=createRepository(db),snapshot={version:1,data:{vt_config:'{"dateArret":"2026-01-01"}',vt_flacons:'[]'}};
  const assert=(await import('node:assert/strict')).default;
  assert.equal(await repo.read('roundtrip'),null);
  const first=await repo.save('roundtrip',snapshot,0);assert.equal(first.revision,1);
  assert.deepEqual((await repo.read('roundtrip')).payload,snapshot);
  const results=await Promise.all([repo.save('roundtrip',snapshot,1),repo.save('roundtrip',snapshot,1)]);
  assert.equal(results.filter(Boolean).length,1);assert.equal((await repo.read('roundtrip')).revision,2);
 }finally{await deleteApp(app);await env.cleanup();}
});
