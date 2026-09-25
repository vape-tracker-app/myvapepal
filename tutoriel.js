// Visite locale : aucune donnée métier ni sauvegarde distante n’est modifiée.
const MyVapeTour = (() => {
    const KEY='mvp_tutorial_v1';
    const steps=[
        ['ecran-accueil','.cadre-arbre','Bienvenue dans ton jardin 🌸','Ton cerisier grandit au fil des jours sans cigarette. On fait un petit tour ensemble ? Tu peux arrêter la visite quand tu veux.','assets/menu/accueil.png'],
        ['ecran-accueil','.grille-dashboards','Chaque jour compte','Retrouve tes jours sans tabac, les cigarettes évitées, tes économies estimées et ton taux de nicotine. Tes informations de départ se corrigent dans le profil.','assets/accueil/jours.png'],
        ['ecran-accueil','#btn-ouvrir-utilisation-directe','Tes liquides, à ton rythme','Utilise un flacon prêt ou prépare un flacon DIY. Choisis ton All Day parmi tes flacons entamés ; les autres restent ouverts. Plus bas, déplie ta réserve, les maturations et l’historique.','assets/menu/diy.png'],
        ['ecran-materiel','#nav-materiel','Trouve tes repères','Ajoute ton pod ou ta box, ses résistances et ton avis. Tu peux associer un matériel différent à chaque flacon entamé, suivre son entretien et archiver ce que tu n’utilises plus.','assets/menu/materiel.png'],
        ['ecran-recettes','#btn-mes-ingredients','Ton petit laboratoire','Crée ou ajuste une recette, choisis ses saveurs et ses additifs facultatifs. Dans « Mes ingrédients », suis tes stocks et tes achats. Les prix renseignés servent à estimer le coût de tes préparations.','assets/menu/diy.png'],
        ['ecran-sante','#nav-sante','Savoure tes petites victoires','Note tes propres découvertes dans ton journal. Dans le salon, « Carrément » ajoute la suggestion du jour à tes victoires ; « Pas encore » en propose une autre. Une victoire validée ferme le rideau jusqu’au lendemain.','assets/saveurs/autre.png'],
        ['ecran-finances','#nav-finances','Garde un œil sur ton budget','Retrouve tes dépenses vape et tes économies estimées, au total et par mois. Lorsqu’un achat est proposé depuis une préparation ou ton stock, tu choisis s’il rejoint les finances.','assets/accueil/economies.png'],
        ['ecran-objectifs','#nav-objectifs','Avance à ton rythme','Note le taux de nicotine que tu souhaites atteindre et une date cible. Tu pourras faire le point, valider l’objectif ou le reporter selon ton parcours.','assets/menu/objectifs.png'],
        ['ecran-accueil','#btn-guide-vape','Une question sur la vape ?','Le Guide vape explique les liquides, le matériel et les gestes du quotidien dans des articles en français. Explore les thèmes et garde tes lectures utiles en favoris.','assets/menu/accueil.png'],
        ['ecran-profil','#btn-ouvrir-profil','Ton espace, tes choix','Ici, ajuste ton profil, active tes rappels et connecte-toi si tu souhaites sauvegarder tes données. Le bouton « Rejouer le tuto » reste disponible, même si tu ignores cette visite. À toi de jouer !','assets/menu/accueil.png']
    ];
    let dialog=null,index=0,origin='ecran-accueil',originScroll=0,pending=false,timer=null,frame=null,target=null;
    const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}};
    const save=status=>{try{localStorage.setItem(KEY,JSON.stringify({status}));}catch{}};
    const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
    function layout(){
        if(!dialog)return;
        const panel=dialog.querySelector('.tuto-carte'),spot=dialog.querySelector('.tuto-focus');
        const width=window.innerWidth,height=window.innerHeight,pad=12,ph=panel.getBoundingClientRect().height;
        const r=target?.getBoundingClientRect();
        let y=Math.max(pad,(height-ph)/2);
        if(r&&r.width&&r.height){
            const left=Math.max(6,r.left-5),top=Math.max(6,r.top-5),right=Math.min(width-6,r.right+5),bottom=Math.min(height-6,r.bottom+5);
            spot.hidden=false;Object.assign(spot.style,{left:left+'px',top:top+'px',width:Math.max(0,right-left)+'px',height:Math.max(0,bottom-top)+'px'});
            if(height-bottom>=ph+24)y=bottom+12;
            else if(top>=ph+24)y=top-ph-12;
            else {y=height-ph-pad;spot.hidden=true;}
        }else spot.hidden=true;
        dialog.classList.toggle('tuto-sans-cible',spot.hidden);
        panel.style.top=Math.max(pad,Math.min(y,height-ph-pad))+'px';
    }
    function queueLayout(){cancelAnimationFrame(frame);frame=requestAnimationFrame(layout);}
    function show(){
        const [screen,selector,title,text,icon]=steps[index];
        afficherEcran(screen);target=document.querySelector(selector)||document.querySelector('#'+screen+' h2');
        window.scrollTo({top:0,behavior:'instant'});
        if(target&&!selector.startsWith('#nav-')&&selector!=='#btn-ouvrir-profil'&&selector!=='#btn-guide-vape')target.scrollIntoView({block:'start',behavior:'instant'});
        dialog.querySelector('.tuto-progression').textContent=`Ta visite · ${index+1} / ${steps.length}`;
        dialog.querySelector('progress').value=index+1;
        dialog.querySelector('h2').textContent=title;dialog.querySelector('.tuto-texte').textContent=text;
        dialog.querySelector('img').src=icon;
        dialog.querySelector('.tuto-precedent').disabled=index===0;
        dialog.querySelector('.tuto-suivant').textContent=index===steps.length-1?'À moi de jouer !':'Suivant →';
        layout();dialog.querySelector('h2').focus({preventScroll:true});queueLayout();
    }
    function finish(status){
        if(!dialog)return;
        save(status);const old=dialog;dialog=null;old.close();old.remove();
        window.removeEventListener('resize',queueLayout);window.removeEventListener('scroll',queueLayout,true);window.visualViewport?.removeEventListener('resize',queueLayout);cancelAnimationFrame(frame);
        afficherEcran(origin);window.scrollTo({top:originScroll,behavior:'instant'});
        const focus=document.getElementById(origin==='ecran-profil'?'btn-rejouer-tuto':'nav-accueil');focus?.focus({preventScroll:true});
    }
    function start(){
        if(dialog)return;
        origin=document.querySelector('.ecran:not(.masque)')?.id||'ecran-accueil';originScroll=window.scrollY;index=0;pending=false;
        dialog=el('dialog',null,'tuto-dialog');dialog.setAttribute('aria-labelledby','tuto-titre');dialog.setAttribute('aria-describedby','tuto-description');
        const spot=el('div',null,'tuto-focus');spot.setAttribute('aria-hidden','true');
        const panel=el('div',null,'tuto-carte'),progress=el('p',null,'tuto-progression'),bar=el('progress');bar.max=steps.length;bar.setAttribute('aria-label','Progression de la visite');
        const img=el('img');img.alt='';img.width=44;img.height=44;
        const heading=el('h2');heading.id='tuto-titre';heading.tabIndex=-1;
        const text=el('p',null,'tuto-texte');text.id='tuto-description';
        const actions=el('div',null,'tuto-actions');
        const prev=el('button','← Précédent','btn-secondaire tuto-precedent');prev.type='button';prev.onclick=()=>{if(index>0){index--;show();}};
        const next=el('button','Suivant →','btn-primaire tuto-suivant');next.type='button';next.onclick=()=>{if(index<steps.length-1){index++;show();}else finish('completed');};
        const skip=el('button','Ignorer le tuto','tuto-ignorer');skip.type='button';skip.onclick=()=>finish('skipped');
        actions.append(prev,next);panel.append(progress,bar,img,heading,text,actions,skip);dialog.append(spot,panel);
        dialog.addEventListener('cancel',e=>{e.preventDefault();finish('skipped');});
        document.body.append(dialog);dialog.showModal();
        window.addEventListener('resize',queueLayout);window.addEventListener('scroll',queueLayout,true);window.visualViewport?.addEventListener('resize',queueLayout);show();
    }
    function attempt(){
        clearTimeout(timer);if(!pending||dialog)return;
        if(document.visibilityState!=='visible'||document.getElementById('splash-screen')||document.querySelector('dialog[open]')||document.querySelector('#ecran-onboarding:not(.masque)')){timer=setTimeout(attempt,800);return;}
        start();
    }
    function replay(){pending=true;attempt();}
    function afterOnboarding(){save('pending');replay();}
    document.addEventListener('DOMContentLoaded',()=>{
        document.getElementById('btn-rejouer-tuto')?.addEventListener('click',replay);
        if(read()?.status==='pending'){pending=true;attempt();}
    });
    return {afterOnboarding,replay};
})();
