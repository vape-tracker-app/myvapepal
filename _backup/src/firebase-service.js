import {initializeApp} from 'firebase/app';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,signOut,reload,getIdToken} from 'firebase/auth';
import {getFirestore,doc,getDoc,runTransaction,serverTimestamp,setLogLevel} from 'firebase/firestore/lite';
// Le SDK ne doit pas journaliser le contenu des sauvegardes lors d'une erreur.
setLogLevel('silent');
export function createRepository(db) {
    return {
        read:async uid=>{
            const snap=await getDoc(doc(db,'backups',uid));if(!snap.exists())return null;
            const row=snap.data();return {payload:JSON.parse(row.payload),revision:row.revision,updated_at:row.updatedAt.toDate().toISOString()};
        },
        save:async(uid,payload,revision)=>{
            const ref=doc(db,'backups',uid);
            try { return await runTransaction(db,async transaction=>{
                const current=await transaction.get(ref);
                if((current.exists()?current.data().revision:0)!==revision)return null;
                transaction.set(ref,{payload:JSON.stringify(payload),revision:revision+1,updatedAt:serverTimestamp()});
                // La transaction ne se résout qu'après confirmation du serveur.
                return {payload,revision:revision+1,updated_at:new Date().toISOString()};
            }); } catch(error) {
                // Les règles peuvent refuser une révision périmée avant que le
                // SDK ne relance la transaction. La relecture distingue ce cas
                // d'une véritable erreur d'autorisation ou de connexion.
                if(error.code==='permission-denied'||error.code==='aborted') {
                    const latest=await getDoc(ref);
                    if(latest.exists() && latest.data().revision!==revision)return null;
                }
                throw error;
            }
        }
    };
}
export function createService(config) {
    const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);auth.languageCode='fr';
    const normalize=u=>u?{id:u.uid,email:u.email,verified:u.emailVerified}:null;
    return {
        onUser:fn=>onAuthStateChanged(auth,u=>fn(normalize(u))),
        login:async(email,password)=>{await signInWithEmailAndPassword(auth,email,password);},
        register:async(email,password)=>{const result=await createUserWithEmailAndPassword(auth,email,password);await sendEmailVerification(result.user);},
        reset:email=>sendPasswordResetEmail(auth,email),
        resend:()=>sendEmailVerification(auth.currentUser),
        refresh:async()=>{if(!auth.currentUser)return null;await reload(auth.currentUser);await getIdToken(auth.currentUser,true);return normalize(auth.currentUser);},
        logout:()=>signOut(auth),
        ...createRepository(db)
    };
}
