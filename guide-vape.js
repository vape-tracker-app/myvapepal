// Navigation du guide ; la clé historique conserve la compatibilité des sauvegardes.
const MyVapeGuide = (() => {
    const articles=VapeGuideArticles,KEY='vt_gazette_favoris';
    const sourceNames={
        'tis-vape':'Tabac info service · Je choisis la vapoteuse (mise à jour février 2026)',
        'tis-sels':'Tabac info service · Dosage et sels de nicotine',
        'tis-effets':'Tabac info service · Effets de la nicotine',
        'inrs-pg':'INRS · Propylène glycol, fiche toxicologique 226',
        'fabricant-pg':'Innokin · Propriétés du PG et de la VG',
        'fabricant-liquides':'Innokin · Composition des liquides',
        'fabricant-sels':'Innokin · Nicotine base libre et sels',
        'fabricant-guide':'Innokin · Fonctionnement du matériel',
        'fabricant-debut':'Innokin · Première utilisation',
        'fabricant-tirages':'Innokin · Tirages MTL, RDL et DTL',
        'fabricant-watts':'Innokin · Puissance et résistances',
        'fabricant-remplacement':'Innokin · Remplacement des résistances',
        'fabricant-amorcage':'Innokin · Alimentation et amorçage des mèches',
        'fabricant-nettoyage':'Innokin · Nettoyage du corps électronique',
        'fabricant-eau':'Innokin · Appareil tombé dans l’eau',
        'fabricant-pannes':'Innokin · Fuites et projections de liquide',
        'fabricant-steep':'Innokin · Maturation des liquides',
        'fda-batterie':'FDA · Prévention des incidents de batterie',
        'fda-stockage':'FDA · Conservation et exposition accidentelle aux liquides',
        'notice-recyclage':'Vaporesso · Notice et recyclage des équipements',
        'nhs-bouche':'NHS · Sécheresse buccale',
        'service-public':'Service Public · Interdiction de vapoter',
        'dgccrf':'DGCCRF · Questions et réponses sur les cigarettes électroniques',
        'brevet':'Brevet US3200819A · Herbert A. Gilbert, 1965',
        'calcul':'Calculs pédagogiques MyVapePal',
        'edition':'Explications et exemples MyVapePal'
    };
    const aliases={dtl:'mtl',rdl:'mtl',airflow:'mtl',ohms:'watts',niveau:'amorcage',pause:'amorcage',brule:'problemes',charge:'batterie',accus:'batterie',temperature:'batterie',enfants:'conservation',emballage:'conservation',gilbert:'histoire',vapexpo:'histoire',milligrammes:'nicotine',pourcentage:'diy',prixml:'cout',lot:'cout',reserve:'cout',journal:'choisir',dates:'resistance'};
    const start=['vape','pg','vg','nicotine','choisir','mtl','amorcage','continuer'];
    let mode='start',category='Tous les thèmes',query='',current=null,previous='ecran-accueil',listingScroll=0;
    const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
    const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const minutes=a=>Math.max(1,Math.ceil([a.intro,...a.sections.flatMap(s=>s.paragraphs)].join(' ').split(/\s+/).length/180));
    function favorites(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return new Set((Array.isArray(v)?v:[]).map(x=>aliases[x?.id]||x?.id).filter(id=>articles.some(a=>a.id===id)));}catch{return new Set();}}
    function button(parent,text,fn,cls='btn-secondaire'){const b=el('button',text,cls);b.type='button';b.onclick=fn;parent.append(b);return b;}
    function toggle(id,b){
        const ids=favorites();ids.has(id)?ids.delete(id):ids.add(id);
        try{localStorage.setItem(KEY,JSON.stringify([...ids].map(id=>({id}))));b.textContent=ids.has(id)?'♥ Article dans mes favoris':'♡ Garder cet article';b.setAttribute('aria-pressed',String(ids.has(id)));document.getElementById('guide-status').textContent=ids.has(id)?'Article ajouté aux favoris.':'Article retiré des favoris.';if(typeof MyVapeBackup!=='undefined')MyVapeBackup.changed();}catch{document.getElementById('guide-status').textContent='Impossible d’enregistrer ce favori sur cet appareil.';}
    }
    function filtered(){
        const ids=favorites();let list=mode==='start'&&!query?start.map(id=>articles.find(a=>a.id===id)):articles;
        return list.filter(a=>(category==='Tous les thèmes'||a.category===category)&&(mode!=='favorites'||ids.has(a.id))&&normalize([a.title,a.intro,...a.sections.flatMap(s=>[s.title,...s.paragraphs])].join(' ')).includes(normalize(query)));
    }
    function listing(){
        current=null;const content=document.getElementById('guide-content');content.replaceChildren();
        document.getElementById('guide-tools').hidden=false;document.getElementById('guide-nav').hidden=false;
        document.querySelectorAll('[data-guide-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.guideMode===mode)));
        const list=filtered();
        content.append(el('h3',mode==='start'&&!query?'Un parcours pour prendre ses repères':mode==='favorites'?'Tes articles à retrouver':'Tous les articles','guide-list-title'));
        content.append(el('p',mode==='start'&&!query?'Commence par ces chapitres, puis explore les sujets à ton rythme.':`${list.length} article${list.length===1?'':'s'} dans cette sélection.`,'texte-secondaire'));
        if(!list.length)content.append(el('p',mode==='favorites'?'Aucun favori dans cette sélection. Ouvre un article puis utilise le cœur pour le garder.':'Aucun article trouvé. Essaie un autre mot ou un autre thème.'));
        list.forEach((a,i)=>{
            const card=el('article',null,'carte guide-card');card.append(el('p',`${mode==='start'&&!query?String(i+1).padStart(2,'0')+' · ':''}${a.category} · ${minutes(a)} min`,'guide-kicker'));
            const h=el('h4');button(h,a.title,()=>read(a.id),'guide-article-title');card.append(h,el('p',a.intro,'guide-summary'));
            button(card,'Lire l’article',()=>read(a.id));if(favorites().has(a.id))card.append(el('span','♥ Favori','guide-favorite-badge'));content.append(card);
        });
        if(mode==='start'&&!query)button(content,`Explorer les ${articles.length} articles`,()=>changeMode('all'),'btn-primaire');
    }
    function read(id){
        const a=articles.find(a=>a.id===id);if(!a)return;
        if(!current)listingScroll=window.scrollY;current=id;
        const content=document.getElementById('guide-content');content.replaceChildren();
        document.getElementById('guide-tools').hidden=true;document.getElementById('guide-nav').hidden=true;
        const article=el('article',null,'guide-reader');article.append(el('p',`${a.category} · ${minutes(a)} min de lecture`,'guide-kicker'));
        const heading=el('h3',a.title);heading.tabIndex=-1;article.append(heading,el('p',a.intro,'guide-deck'));
        const saved=favorites().has(id);const fav=button(article,saved?'♥ Article dans mes favoris':'♡ Garder cet article',()=>toggle(id,fav));fav.setAttribute('aria-pressed',String(saved));
        const summary=el('nav',null,'guide-sommaire');summary.setAttribute('aria-label','Sommaire de cet article');summary.append(el('p','Dans cet article'));
        a.sections.forEach((s,i)=>button(summary,s.title,()=>{const target=document.getElementById(`guide-${a.id}-${i}`);target.scrollIntoView({block:'start'});target.focus({preventScroll:true});},'guide-chapter-link'));article.append(summary);
        a.sections.forEach((s,i)=>{const section=el('section');const title=el('h4',s.title);title.id=`guide-${a.id}-${i}`;title.tabIndex=-1;section.append(title);for(const p of s.paragraphs)section.append(el('p',p));article.append(section);});
        const takeaway=el('aside',null,'guide-takeaway');takeaway.append(el('strong','À retenir'),el('p',a.remember));article.append(takeaway);
        const references=el('details',null,'guide-references');references.append(el('summary','Repères documentaires et date de rédaction'));
        references.append(el('p','Article rédigé en français pour MyVapePal le 25 septembre 2026. Les explications sont intégralement disponibles ici. Les notices propres à ton modèle restent la référence pour ses manipulations.'));
        const ul=el('ul');for(const key of a.refs)ul.append(el('li',sourceNames[key]));references.append(ul);article.append(references);
        article.append(el('h4','Pour continuer à comprendre'));
        for(const related of a.related){const next=articles.find(x=>x.id===related);if(next)button(article,next.title,()=>read(next.id),'btn-secondaire guide-related');}
        button(article,'← Revenir au sommaire du guide',backToList,'btn-primaire');content.append(article);
        heading.focus({preventScroll:true});document.getElementById('ecran-guide-vape').scrollIntoView({block:'start'});
    }
    function backToList(){listing();window.scrollTo(0,listingScroll);}
    function changeMode(next){mode=next;query='';category='Tous les thèmes';document.getElementById('guide-search').value='';document.getElementById('guide-category').value=category;listing();}
    function open(){const visible=document.querySelector('.ecran:not(.masque)');if(visible&&visible.id!=='ecran-guide-vape')previous=visible.id;afficherEcran('ecran-guide-vape');listing();window.scrollTo(0,0);}
    document.addEventListener('DOMContentLoaded',()=>{
        document.getElementById('btn-guide-vape').onclick=open;
        document.getElementById('guide-retour').onclick=()=>current?backToList():afficherEcran(previous);
        document.querySelectorAll('[data-guide-mode]').forEach(b=>b.onclick=()=>changeMode(b.dataset.guideMode));
        const select=document.getElementById('guide-category');for(const c of ['Tous les thèmes',...new Set(articles.map(a=>a.category))]){const o=el('option',c);o.value=c;select.append(o);}select.onchange=()=>{category=select.value;listing();};
        document.getElementById('guide-search').oninput=e=>{query=e.target.value;listing();};
    });
    return {open,articles,aliases};
})();
