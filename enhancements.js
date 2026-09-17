// Petites interactions locales : aucune donnée personnelle n'est envoyée ici.
const MyVapeUI = (() => {
    const colors = {rose:'#ffb7c5',lavande:'#bca7ef',menthe:'#8dd9bd',bleu:'#8dc8ef',peche:'#efb18e'};
    let toastTimer, pendingStage = null;
    function toast(message) {
        const el=document.getElementById('confirmation-action');
        if(!el)return;
        clearTimeout(toastTimer);
        el.textContent='✓ '+message;
        el.classList.add('visible');
        toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);
    }
    function color(value){return colors[value] || colors.rose;}
    function picker(value, onChange) {
        const select=document.createElement('select');
        select.className='couleur-flacon-select';
        select.setAttribute('aria-label','Couleur du flacon');
        for(const [key,label] of Object.entries({rose:'🌸 Rose',lavande:'🟣 Lavande',menthe:'🟢 Menthe',bleu:'🔵 Bleu',peche:'🟠 Pêche'})) {
            const option=document.createElement('option');option.value=key;option.textContent=label;select.appendChild(option);
        }
        select.value=colors[value]?value:'rose';
        select.addEventListener('change',()=>onChange(select.value));
        return select;
    }
    function decorateBottles() {
        const reserve=flacons.filter(f=>!f.termine&&!f.actif);
        const history=flacons.filter(f=>f.termine);
        for(const [id,list] of [['liste-flacons-reserve',reserve],['liste-historique',history]]) {
            document.querySelectorAll(`#${id} > .carte`).forEach((card,i)=>{
                const bottle=list[i];if(!bottle)return;
                card.querySelectorAll('.couleur-flacon-select').forEach(el=>el.remove());
                card.classList.add('carte-flacon-coloree');
                card.style.setProperty('--couleur-flacon',color(bottle.couleur));
                card.appendChild(picker(bottle.couleur,value=>saveColor(bottle,value)));
            });
        }
        const active=flacons.find(f=>f.actif);
        const title=document.getElementById('nom-liquide');
        if(title)title.style.color=active?color(active.couleur):'';
        const slot=document.getElementById('couleur-flacon-actif');
        if(slot){slot.replaceChildren();if(active)slot.appendChild(picker(active.couleur,value=>saveColor(active,value)));}
    }
    function saveColor(bottle,value) {
        const previous=bottle.couleur;bottle.couleur=value;
        try{localStorage.setItem('vt_flacons',JSON.stringify(flacons));}
        catch{bottle.couleur=previous;toast('Couleur non enregistrée. Réessaie.');return;}
        mettreAJourTout();toast('Couleur enregistrée');
    }
    function observeStage(stage) {
        if(!configUser?.dateArret)return;
        try {
            const previous=JSON.parse(localStorage.getItem('vt_tree_celebration')||'null');
            const date=configUser.dateArret;
            if(!previous || previous.date!==date) {
                localStorage.setItem('vt_tree_celebration',JSON.stringify({date,stage}));
                pendingStage=null;return;
            }
            if(stage>previous.stage)pendingStage={date,stage};
            celebrate();
        }catch{/* Une panne de stockage ne doit pas bloquer l'accueil. */}
    }
    function celebrate() {
        if(!pendingStage || document.visibilityState==='hidden' || document.getElementById('splash-screen'))return;
        const home=document.getElementById('ecran-accueil');
        if(!home || home.classList.contains('masque'))return;
        try{localStorage.setItem('vt_tree_celebration',JSON.stringify(pendingStage));}catch{return;}
        pendingStage=null;
        toast('Ton cerisier a grandi ! Chaque jour compte 🌸');
        if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
        const shower=document.createElement('div');shower.className='celebration-petales';shower.setAttribute('aria-hidden','true');
        for(let i=0;i<22;i++) {
            const petal=document.createElement('i');
            petal.style.left=`${Math.random()*100}%`;
            petal.style.animationDelay=`${Math.random()*1.2}s`;
            petal.style.setProperty('--derive',`${Math.random()*140-70}px`);
            shower.appendChild(petal);
        }
        document.body.appendChild(shower);setTimeout(()=>shower.remove(),5200);
    }
    document.addEventListener('DOMContentLoaded',()=>{
        for(const [container,input] of [['choix-couleur-flacon','couleur-flacon'],['choix-couleur-direct','couleur-direct']]) {
            const slot=document.getElementById(container);if(!slot)continue;
            const select=picker('rose',()=>{});select.id=input;slot.appendChild(select);
        }
        setInterval(()=>{if(document.visibilityState==='visible'){celebrate();afficherReserveEtMaturation();decorateBottles();}},60000);
        setTimeout(celebrate,3200);
    });
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){mettreAJourCerisierHD();celebrate();}});
    return {toast,color,decorateBottles,observeStage,celebrate};
})();
