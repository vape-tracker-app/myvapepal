// Préférences d’affichage locales : indépendantes des données de sauvegarde.
const MyVapeSections=(()=>{
    const key='mvp_accueil_sections';
    const ids={reserve:'section-flacons-reserve',historique:'section-historique-flacons'};
    let preferences={};
    try{const stored=JSON.parse(localStorage.getItem(key)||'{}');for(const name of Object.keys(ids))if(typeof stored?.[name]==='boolean')preferences[name]=stored[name];}catch{}
    function remember(name,open){preferences[name]=open;try{localStorage.setItem(key,JSON.stringify(preferences));}catch{}}
    function counts(bottles,now=Date.now()){
        let ready=0,maturing=0,finished=0;
        for(const f of bottles){
            if(f.termine){finished++;continue;}
            if(f.startedAt)continue;
            const quantity=Number.isSafeInteger(f.quantite)&&f.quantite>0?f.quantite:1;
            if(Number(f.steepDays)>0&&Date.parse(f.steepReadyAt)>now)maturing+=quantity;
            else ready+=quantity;
        }
        return {ready,maturing,finished,total:ready+maturing};
    }
    function update(bottles){
        const c=counts(bottles),set=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value;};
        set('compteur-reserve',String(c.total));set('compteur-historique',String(c.finished));
        const parts=[];
        if(c.ready)parts.push(`${c.ready} prêt${c.ready>1?'s':''} à savourer`);
        if(c.maturing)parts.push(`${c.maturing} en maturation`);
        set('resume-reserve',parts.join(' · ')||'Aucun flacon en réserve');
        set('resume-historique',c.finished?`${c.finished} flacon${c.finished>1?'s':''} terminé${c.finished>1?'s':''}`:'Aucun flacon terminé');
    }
    function openReserve(){const node=document.getElementById(ids.reserve);if(node){node.open=true;remember('reserve',true);}}
    document.addEventListener('DOMContentLoaded',()=>{
        for(const [name,id] of Object.entries(ids)){
            const node=document.getElementById(id);if(!node)continue;
            node.open=preferences[name]===true;
            node.addEventListener('toggle',()=>remember(name,node.open));
        }
        update(flacons);
    });
    return {counts,update,openReserve};
})();
