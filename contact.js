const MyVapeContact = (() => {
    const destination='contact.myvapepal@gmail.com';
    let dialog=null,draft={email:'',subject:'',message:''};
    const configured=()=>/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(window.MyVapeContactConfig?.endpoint||'');
    function validate(values){
        const data={email:String(values.email||'').trim(),subject:String(values.subject||'').trim(),message:String(values.message||'').trim()};
        if(data.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))throw Error('Indique une adresse e-mail valide pour recevoir notre réponse.');
        if(!data.subject||data.subject.length>120||/[\r\n]/.test(data.subject))throw Error('Indique un objet de 120 caractères maximum.');
        if(!data.message||data.message.length>5000)throw Error('Écris ton message (5 000 caractères maximum).');
        return data;
    }
    async function send(values){
        const data=validate(values);
        if(!configured())throw Error('Le formulaire sera bientôt disponible. Tu peux déjà nous écrire à '+destination+'.');
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
        try{
            const response=await fetch(window.MyVapeContactConfig.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({email:data.email,subject:data.subject,message:data.message}),credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
            if(!response.ok){
                if(response.status===429)throw Error('Le service reçoit trop de demandes. Réessaie plus tard ; ton message est conservé ici.');
                throw Error('L’envoi n’a pas été confirmé. Réessaie plus tard ou écris-nous directement à '+destination+'.');
            }
            // Une réponse JSON est requise : une page de connexion ou de défi n’est pas un succès.
            const result=await response.json();
            if(result.ok!==true)throw Error('Le service n’a pas confirmé l’envoi. Ton message reste dans le formulaire.');
            return true;
        }catch(error){
            if(error.name==='AbortError'||error instanceof TypeError)throw Error('Impossible de confirmer l’envoi. Vérifie ta connexion avant de réessayer ; ton message est conservé ici.');
            throw error;
        }finally{clearTimeout(timer);}
    }
    function open(){
        if(dialog)return;
        const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
        dialog=el('dialog',null,'dialog-flacon-edition contact-dialog');dialog.setAttribute('aria-labelledby','contact-title');
        const title=el('h2','Un message pour MyVapePal 🌸');title.id='contact-title';
        const intro=el('p','Une question, une idée ou un souci ? Écris-nous ici.','texte-secondaire');
        const form=el('form'),fields={};let busy=false;
        for(const [name,label,type,max] of [['email','Ton adresse e-mail (pour te répondre)','email',254],['subject','Objet','text',120],['message','Ton message','textarea',5000]]){
            const group=el('label',label,'groupe-champ'),input=el(type==='textarea'?'textarea':'input');input.name=name;input.id='contact-'+name;
            if(type==='textarea')input.rows=6;else input.type=type;
            if(name==='email')input.autocomplete='email';input.required=true;input.maxLength=max;input.value=draft[name];group.append(input);form.append(group);fields[name]=input;
        }
        const note=el('p','En envoyant, tu transmets ton adresse e-mail, l’objet et ton message à MyVapePal via Formspree. Aucune donnée de ton parcours n’est jointe automatiquement.','texte-secondaire contact-notice');
        const privacy=el('a','Confidentialité');privacy.href='confidentialite.html';privacy.target='_blank';privacy.rel='noopener';note.append(document.createTextNode(' '),privacy);
        const status=el('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
        const submit=el('button','Envoyer','btn-primaire');submit.type='submit';
        const close=el('button','Fermer','btn-secondaire');close.type='button';close.onclick=()=>{if(!busy)dialog.close();};
        if(!configured()){status.textContent='Le formulaire est en cours d’activation. Contact : '+destination;submit.disabled=true;}
        const remember=()=>{draft=Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value]));};form.addEventListener('input',remember);
        form.onsubmit=async e=>{
            e.preventDefault();if(busy||!form.reportValidity())return;remember();busy=true;submit.disabled=true;close.disabled=true;submit.textContent='Envoi en cours…';status.textContent='';form.setAttribute('aria-busy','true');
            try{
                await send(draft);draft={email:'',subject:'',message:''};form.hidden=true;
                status.textContent='Message envoyé 🌸 Merci ! Ta demande a été transmise à MyVapePal. Nous te répondrons à l’adresse indiquée.';status.tabIndex=-1;status.focus();close.textContent='C’est noté';
            }catch(error){status.textContent=error.message;}
            finally{busy=false;submit.disabled=!configured();close.disabled=false;submit.textContent='Envoyer';form.setAttribute('aria-busy','false');}
        };
        form.append(note,submit);dialog.append(title,intro,form,status,close);
        dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
        dialog.addEventListener('close',()=>{dialog.remove();dialog=null;document.getElementById('btn-contact')?.focus();},{once:true});
        document.body.append(dialog);dialog.showModal();
    }
    document.addEventListener('DOMContentLoaded',()=>document.getElementById('btn-contact')?.addEventListener('click',open));
    return {open,send,validate};
})();
