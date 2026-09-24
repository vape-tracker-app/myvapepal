// Bibliothèque éditoriale embarquée : lisible hors connexion, sans génération automatique.
const MyVapeGazette = (() => {
    const sources = {
        coil: ['Innokin · entretien (anglais)', 'https://www.innokin.com/blog/6-ways-to-stop-your-vape-coils-burning'],
        draw: ['Innokin · types de tirage (anglais)', 'https://support.innokin.com/hc/en-us/articles/4403080416019-Vape-Styles-MTL-DTL-RDL'],
        liquid: ['Innokin · liquides (anglais)', 'https://support.innokin.com/hc/en-us/articles/4403072416275-How-to-choose-E-liquid'],
        watts: ['Innokin · puissance (anglais)', 'https://www.innokin.com/blog/what-wattage-should-i-vape-at'],
        battery: ['FDA · batteries (anglais)', 'https://www.fda.gov/tobacco-products/products-ingredients-components/tips-help-avoid-vape-battery-fires-or-explosions'],
        storage: ['FDA · rangement des liquides (anglais)', 'https://www.fda.gov/consumers/consumer-updates/how-properly-store-e-liquids-and-prevent-accidental-exposure-e-liquids-children'],
        water: ['NHS · bouche sèche (anglais)', 'https://www.nhs.uk/symptoms/dry-mouth/'],
        patent: ['Brevet de Herbert A. Gilbert (anglais)', 'https://patents.google.com/patent/US3200819A/en'],
        expo: ['Vapexpo · histoire du salon', 'https://vapexpo-france.com/salon/'],
        app: ['Repère MyVapePal · calcul ou utilisation de l’application', null]
    };
    const cards = [
        ['eau','Au quotidien','La petite pause eau','Si tu as la bouche sèche, de petites gorgées d’eau régulières peuvent aider. Ce symptôme a plusieurs causes possibles : s’il persiste, demande conseil à un professionnel de santé.','water'],
        ['mtl','Matériel','MTL : un tirage en deux temps','MTL signifie « mouth to lung » : l’aérosol passe d’abord dans la bouche, puis dans les poumons. C’est ce qu’on appelle le tirage indirect.','draw'],
        ['dtl','Matériel','DTL : le tirage direct','DTL signifie « direct to lung » : l’inhalation va directement vers les poumons. Ce tirage est généralement plus aérien et demande du matériel adapté.','draw'],
        ['rdl','Matériel','Et le RDL, alors ?','Le RDL est un tirage direct restrictif : plus serré que le DTL. Les lettres décrivent une façon de tirer, pas un niveau à atteindre.','draw'],
        ['airflow','Matériel','Airflow : simplement l’arrivée d’air','L’airflow règle l’air qui traverse le dispositif. Une ouverture plus grande rend généralement le tirage plus aérien ; une ouverture réduite le resserre. Suis les indications de ton modèle.','draw'],
        ['watts','Matériel','Les watts ne se choisissent pas au hasard','La résistance ou sa notice indique souvent une plage de puissance. Reste dans cette plage : deux résistances différentes ne demandent pas forcément le même réglage.','watts'],
        ['ohms','Matériel','Ohms et watts : deux informations différentes','Le symbole Ω indique la résistance électrique ; W indique la puissance. La valeur en ohms, à elle seule, ne remplace pas les réglages recommandés par le fabricant.','watts'],
        ['amorcage','Entretien','Une résistance neuve a besoin de s’imbiber','Après remplissage, laisse la mèche s’imprégner avant la première utilisation. Le délai et la méthode dépendent du modèle : consulte la notice plutôt que d’appliquer une durée universelle.','coil'],
        ['niveau','Entretien','Garde un œil sur le niveau','Un réservoir trop vide peut empêcher la mèche d’être correctement alimentée. Vérifie le niveau minimal recommandé avant de continuer à utiliser ton matériel.','coil'],
        ['pause','Entretien','Les bouffées rapprochées sollicitent la mèche','Enchaîner les bouffées peut laisser trop peu de temps au liquide pour réimbiber la mèche. Faire une pause aide à éviter une chauffe à sec.','coil'],
        ['brule','Entretien','Un goût brûlé mérite une pause','Arrête l’utilisation et vérifie le liquide, la puissance et l’état de la résistance selon la notice. Une mèche brûlée peut nécessiter un remplacement.','coil'],
        ['saveur','Entretien','Moins de saveur : pas de diagnostic automatique','Une résistance usée peut altérer le rendu. Vérifie aussi le niveau de liquide et les réglages recommandés avant de conclure qu’il faut changer toute la cartouche.','coil'],
        ['pg','Liquides','PG : derrière ces deux lettres','PG signifie propylène glycol. C’est l’un des composants courants des e-liquides ; il contribue notamment au transport des arômes.','liquid'],
        ['vg','Liquides','VG : la glycérine végétale','La VG est plus visqueuse que le PG. Le ratio PG/VG influence donc la fluidité du liquide : vérifie sa compatibilité avec ton matériel.','liquid'],
        ['ratio','Liquides','50/50 : regarde l’ordre sur l’étiquette','Un ratio PG/VG 50/50 indique des proportions égales. Pour un autre ratio, vérifie toujours quel nombre correspond au PG et lequel à la VG.','liquid'],
        ['charge','Au quotidien','Pour charger, la notice reste la référence','Utilise le matériel de charge recommandé et évite de laisser la charge sans surveillance. Pose l’appareil sur une surface propre et plane, loin de ce qui peut s’enflammer.','battery'],
        ['accus','Au quotidien','Les accus ne voyagent pas avec les clés','Des accus amovibles en vrac peuvent entrer en contact avec des pièces ou des clés et provoquer un court-circuit. Transporte-les dans un étui adapté.','battery'],
        ['temperature','Au quotidien','La chaleur n’est pas leur amie','Évite les températures extrêmes pour ton appareil et ses batteries, notamment une voiture laissée en plein soleil. Respecte les conditions de stockage du fabricant.','battery'],
        ['enfants','Au quotidien','Un bouchon sécurisé ne suffit pas','Range les e-liquides hors de vue et de portée des enfants et des animaux, idéalement sous clé. Referme le bouchon après chaque utilisation.','storage'],
        ['emballage','Au quotidien','Garde le flacon et son étiquette','Conserve le liquide dans son emballage d’origine. Un contenant alimentaire ou une bouteille de boisson pourrait créer une confusion dangereuse.','storage'],
        ['gilbert','Histoire','Une idée qui remonte aux années 1960','Herbert A. Gilbert a déposé en 1963 une demande de brevet pour une cigarette sans tabac ni fumée, accordée en 1965. Ce projet ancien n’est pas identique aux appareils actuels.','patent'],
        ['vapexpo','Histoire','Vapexpo existe depuis 2014','Le salon se consacre à l’univers de la cigarette électronique depuis 2014. Chaque édition a ses propres dates et conditions d’accès : vérifie celles de l’organisateur.','expo'],
        ['milligrammes','DIY','mg/ml : une concentration, pas un volume','6 mg/ml signifie 6 milligrammes de nicotine par millilitre de liquide. Un flacon de 10 ml à cette concentration contient donc 60 mg de nicotine au total.','app'],
        ['pourcentage','DIY','15 % de 50 ml, ça fait combien ?','Le calcul est 50 × 15 ÷ 100 : cela donne 7,5 ml d’arôme dans un volume final de 50 ml. Ce calcul explique un pourcentage ; il ne recommande pas un dosage.','app'],
        ['prixml','DIY','Le prix au millilitre permet de comparer','Un flacon de 30 ml acheté 13,50 € revient à 0,45 € par ml. Utiliser 5 ml représente alors 2,25 € d’ingrédient.','app'],
        ['cout','DIY','Coût de recette et dépense : deux chiffres utiles','La dépense correspond au conditionnement acheté. Le coût de recette correspond à la part utilisée : les ingrédients restants serviront à une prochaine préparation.','app'],
        ['lot','DIY','Deux flacons : pense au total','Une recette de 50 ml préparée en deux flacons utilise 100 ml de mélange au total. MyVapePal multiplie les besoins en ingrédients par le nombre de flacons préparés.','app'],
        ['reserve','DIY','Ouvrir un flacon ne consomme pas deux fois le stock','Les ingrédients sont déduits quand tu prépares le mélange. Passer ensuite un flacon de la réserve aux flacons entamés ne les déduit pas à nouveau.','app'],
        ['journal','Matériel','Note ce qui te convient vraiment','Dans Matériel, garde le modèle, la résistance et ton ressenti : tirage trop serré, rendu apprécié… Tes propres observations aideront à comparer tes essais.','app'],
        ['dates','Entretien','Une date vaut mieux qu’un souvenir flou','Note la date du changement de résistance dans MyVapePal. Elle t’aide à retrouver ton historique, sans imposer une fréquence de remplacement identique à tout le monde.','app']
    ].map(([id,category,title,body,source])=>({id,category,title,body,source}));
    const KEY='vt_gazette_favoris';
    const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
    function favorites(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return new Set(Array.isArray(v)?v.filter(x=>x&&typeof x.id==='string').map(x=>x.id):[]);}catch{return new Set();}}
    function dailyIndex(date=new Date()){return Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000)%cards.length;}
    let index=dailyIndex(),mode='discover',category='Toutes',query='',previous='ecran-accueil';
    function button(parent,text,fn,cls='btn-secondaire'){const b=el('button',text,cls);b.type='button';b.onclick=fn;parent.append(b);return b;}
    function sourceLink(parent,key){const [label,url]=sources[key];if(url){const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}else parent.append(el('span',label));}
    function card(item,featured=false){
        const article=el('article',null,'carte gazette-card'+(featured?' gazette-featured':''));
        article.append(el('p',item.category,'gazette-kicker'),el('h3',item.title),el('p',item.body,'gazette-body'));
        const footer=el('div',null,'gazette-source');sourceLink(footer,item.source);article.append(footer);
        const saved=favorites().has(item.id);
        const b=button(article,saved?'♥ Dans mes favoris':'♡ Garder cette découverte',()=>{
            const ids=favorites();ids.has(item.id)?ids.delete(item.id):ids.add(item.id);
            try{localStorage.setItem(KEY,JSON.stringify([...ids].map(id=>({id}))));renderContent();if(typeof MyVapeBackup!=='undefined')MyVapeBackup.changed();}catch{document.getElementById('gazette-status').textContent='Impossible d’enregistrer ce favori sur cet appareil.';}
        });b.setAttribute('aria-pressed',String(saved));return article;
    }
    function next(){
        const eligible=cards.map((c,i)=>({c,i})).filter(({c})=>category==='Toutes'||c.category===category);
        const pos=eligible.findIndex(x=>x.i===index);index=eligible[(pos+1)%eligible.length].i;renderContent();
    }
    function renderContent(){
        const area=document.getElementById('gazette-content');area.replaceChildren();
        document.querySelectorAll('[data-gazette-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gazetteMode===mode)));
        document.getElementById('gazette-tools').hidden=mode==='news';
        if(mode==='news'){renderNews(area);return;}
        if(mode==='discover'&&!query){
            if(category!=='Toutes'&&cards[index].category!==category)index=cards.findIndex(c=>c.category===category);
            area.append(el('p',index===dailyIndex()?'Ta découverte du jour':'Une nouvelle découverte','gazette-kicker'),card(cards[index],true));
            button(area,'Encore une découverte',next,'btn-primaire');
            button(area,'Voir les 30 découvertes',()=>{mode='library';renderContent();});
            return;
        }
        const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const saved=favorites();const filtered=cards.filter(c=>(category==='Toutes'||c.category===category)&&(mode!=='favorites'||saved.has(c.id))&&normalize(c.title+' '+c.body).includes(normalize(query)));
        area.append(el('p',`${filtered.length} découverte${filtered.length===1?'':'s'}`,'texte-secondaire'));
        if(!filtered.length)area.append(el('p',mode==='favorites'?'Aucun favori dans cette sélection. Garde une découverte avec le cœur pour la retrouver ici.':'Aucune découverte ne correspond à cette recherche.'));
        for(const c of filtered)area.append(card(c));
    }
    function renderNews(area){
        area.append(el('p','Sélection vérifiée le 25 septembre 2026. Ces repères ne constituent pas un fil en direct. Les liens ouvrent les informations à jour des sources.','texte-secondaire'));
        const entries=[
            ['Réglementation · France','Où peut-on vapoter ?','Service Public détaille les lieux concernés par les interdictions et les règles applicables. Consulte la fiche officielle avant de te fier à une information partagée en ligne.','https://www.service-public.gouv.fr/particuliers/vosdroits/F35111','Consulter Service Public'],
            ['Règle en vigueur · France','Les cigarettes électroniques jetables','La mise en vente, la vente, la distribution et l’offre gratuite des dispositifs non rechargeables en liquide sont interdites en France. La fiche officielle précise les dispositifs concernés.','https://www.service-public.gouv.fr/particuliers/vosdroits/F35111','Lire la règle officielle'],
            [new Date()>new Date('2027-04-12T23:59:59+02:00')?'Événement passé · Paris':'Rendez-vous · Paris','Vapexpo · 11 et 12 avril 2027','Paris Expo, Porte de Versailles. L’organisateur annonce un accès professionnel et porteurs de projet, presse et médias ; pas une ouverture générale au public. Vérifie les conditions et les dates avant de prévoir un déplacement.','https://vapexpo-france.com/informations-paris/','Voir les informations de Vapexpo']
        ];
        for(const [tag,title,body,url,label] of entries){const a=el('article',null,'carte gazette-card');a.append(el('p',tag,'gazette-kicker'),el('h3',title),el('p',body,'gazette-body'));const link=el('a',label);link.href=url;link.target='_blank';link.rel='noopener noreferrer';a.append(link);area.append(a);}
    }
    function open(){
        const visible=document.querySelector('.ecran:not(.masque)');if(visible&&visible.id!=='ecran-gazette')previous=visible.id;
        index=dailyIndex();afficherEcran('ecran-gazette');renderContent();window.scrollTo(0,0);
    }
    document.addEventListener('DOMContentLoaded',()=>{
        document.getElementById('btn-gazette').onclick=open;
        document.getElementById('gazette-retour').onclick=()=>afficherEcran(previous);
        for(const b of document.querySelectorAll('[data-gazette-mode]'))b.onclick=()=>{mode=b.dataset.gazetteMode;query='';category='Toutes';document.getElementById('gazette-search').value='';document.getElementById('gazette-category').value='Toutes';renderContent();};
        const select=document.getElementById('gazette-category');for(const c of ['Toutes',...new Set(cards.map(c=>c.category))]){const o=el('option',c);o.value=c;select.append(o);}select.onchange=()=>{category=select.value;renderContent();};
        document.getElementById('gazette-search').oninput=e=>{query=e.target.value;renderContent();};
    });
    return {open,cards,dailyIndex};
})();
