const MyVapeTabacUI = (() => {
    let dialog = null, timer = null, displayedDate = MyVapeTabac.localDate();
    const el = (tag,text,cls) => {const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
    function render() {
        const total = document.getElementById('cigarettes-fumees');
        if (!total) return;
        const count = MyVapeTabac.stats(configUser).smoked;
        total.hidden = count === 0;
        total.textContent = count ? `🚬 ${count} cigarette${count>1?'s':''} fumée${count>1?'s':''}` : '';
    }
    function persist(next) {
        // Une seule écriture : ne jamais afficher un succès si la persistance échoue.
        localStorage.setItem('vt_config',JSON.stringify(next));
        configUser = next;
    }
    function refresh() {
        mettreAJourDashboard();mettreAJourCerisierHD();afficherParcours();afficherFinances();
        if(typeof MyVapeBackup!=='undefined')MyVapeBackup.changed();
        if(typeof MyVapePush!=='undefined')MyVapePush.sync();
    }
    function button(text,cls,action) {
        const node=el('button',text,cls);node.type='button';node.onclick=action;return node;
    }
    function message() {
        dialog.replaceChildren();
        const title=el('h2','C’est enregistré 🌸');title.id='tabac-title';title.tabIndex=-1;
        const text=el('p','Cette journée ne sera pas comptabilisée parmi tes jours sans tabac.');
        const hint=el('p','Chaque jour sans tabac compte. Tes jours déjà acquis restent acquis.','texte-secondaire');
        dialog.append(title,text,hint,button('Continuer','btn-primaire',()=>dialog.close()),button('Recommencer mon parcours à partir d’aujourd’hui','tabac-recommencer',confirmRestart));
        title.focus();
    }
    function confirmRestart() {
        dialog.replaceChildren();
        const title=el('h2','Un nouveau départ ?');title.id='tabac-title';
        const text=el('p','Ton parcours actuel sera archivé avec ses cigarettes et son bilan. Ton compteur repartira à zéro et ton cerisier au stade 1.');
        const hint=el('p','Tes flacons, recettes et matériel sont conservés. Tes économies financières et tes dépenses continuent sans remise à zéro. Les cigarettes saisies aujourd’hui restent comptées pour cette journée.','texte-secondaire');
        const status=el('p');status.setAttribute('role','status');
        const confirm=button('Confirmer le nouveau départ','btn-primaire',()=>restart(status,confirm));
        const cancel=button('Garder mon parcours','btn-secondaire',message);
        dialog.append(title,text,hint,confirm,cancel,status);cancel.focus();
    }
    function restart(status,confirm) {
        try {persist(MyVapeTabac.restart(configUser,depenses));}
        catch {status.textContent='Le nouveau départ n’a pas été enregistré. Ton parcours est conservé. Réessaie.';return;}
        confirm.disabled=true;dialog.close();mettreAJourTout();
    }
    function open() {
        if(dialog || !configUser?.dateArret)return;
        dialog=el('dialog',null,'dialog-flacon-edition tabac-dialog');dialog.setAttribute('aria-labelledby','tabac-title');
        const title=el('h2','J’ai fumé');title.id='tabac-title';
        const intro=el('p','Combien de cigarettes souhaites-tu ajouter pour aujourd’hui ?','texte-secondaire');
        const form=el('form'),row=el('div',null,'tabac-quantite');
        const input=el('input');input.type='number';input.min='1';input.max='1000000';input.step='1';input.required=true;input.inputMode='numeric';input.value='1';input.setAttribute('aria-label','Nombre de cigarettes');
        const minus=button('−','btn-secondaire',()=>{input.stepDown();update();});minus.setAttribute('aria-label','Une cigarette de moins');
        const plus=button('+','btn-secondaire',()=>{input.stepUp();update();});plus.setAttribute('aria-label','Une cigarette de plus');
        function update(){minus.disabled=Number(input.value)<=1;plus.disabled=Number(input.value)>=1000000;}
        input.addEventListener('input',update);update();row.append(minus,input,plus);
        const submit=el('button','Enregistrer','btn-primaire');submit.type='submit';
        const cancel=button('Annuler','btn-secondaire',()=>dialog.close());
        const status=el('p');status.setAttribute('role','status');
        let saved=false;
        form.onsubmit=event=>{
            event.preventDefault();if(saved || !form.reportValidity())return;
            try{persist(MyVapeTabac.record(configUser,Number(input.value)));}
            catch{status.textContent='L’enregistrement n’a pas abouti. Vérifie la quantité et l’espace disponible, puis réessaie.';return;}
            saved=true;submit.disabled=true;message();refresh();
        };
        form.append(row,submit,cancel,status);dialog.append(title,intro,form);
        dialog.addEventListener('close',()=>{dialog.remove();dialog=null;document.getElementById('btn-jai-fume')?.focus();},{once:true});
        document.body.append(dialog);dialog.showModal();submit.focus();
    }
    function checkDay() {
        const today=MyVapeTabac.localDate();
        if(today!==displayedDate){displayedDate=today;if(configUser?.dateArret)refresh();}
        clearTimeout(timer);
        const now=new Date(),next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
        timer=setTimeout(checkDay,+next-+now+100);
    }
    document.addEventListener('DOMContentLoaded',()=>{document.getElementById('btn-jai-fume')?.addEventListener('click',open);render();checkDay();});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkDay();});
    return {open,render};
})();
