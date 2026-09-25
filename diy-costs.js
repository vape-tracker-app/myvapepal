// Prix des conditionnements et coût des seules quantités consommées.
const DIYCosts=(()=>{
    const names={arome:'Arôme',base:'Base',booster:'Booster',frais:'Additif frais',sucre:'Additif sucré'};
    const volumes={arome:'volArome',base:'volBase',booster:'volBooster',frais:'volFrais',sucre:'volSucre'};
    const additives=['frais','sucre'];
    const keysFor=prefix=>Object.keys(names).filter(k=>prefix!=='ajust'||!additives.includes(k));
    const states={};
    const value=id=>document.getElementById(id)?.value??'';
    const num=(v,label,positive=false)=>{const n=Number(v);if(v===''||!Number.isFinite(n)||n<0||n>1e9||(positive&&n<=0))throw Error('Vérifie '+label+'.');return n;};
    const euros=n=>n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
    function dosages(volume,nicotine,arome,taux){
        volume=num(volume,'le volume',true);nicotine=num(nicotine,'la nicotine');arome=num(arome,'l’arôme');taux=num(taux,'le taux du booster',true);
        const volArome=volume*arome/100,volBooster=volume*nicotine/taux,volBase=volume-volArome-volBooster;
        if(arome>=100||volBase< -1e-8)throw Error('Dosages impossibles : vérifie les proportions.');
        return {volTotal:volume,volArome,volBooster,volBase:Math.max(0,volBase)};
    }
    function withAdditives(amounts,additifs={}){
        const result={...amounts};let volume=0;
        for(const key of additives){
            const a=additifs[key];const drops=a?num(a.gouttes,'le nombre de gouttes'):0;
            const used=drops?drops/num(a.gouttesParMl,'le nombre de gouttes pour 1 ml',true):0;
            if(!Number.isFinite(used))throw Error('Conversion des gouttes invalide.');
            result[volumes[key]]=used;volume+=used;
        }
        if(volume>amounts.volBase+1e-8)throw Error('Les additifs dépassent la place disponible : réduis leur quantité ou les autres dosages.');
        result.volBase=Math.max(0,amounts.volBase-volume);return result;
    }
    function readAdditives(prefix){
        if(prefix==='ajust')return {};
        const result={};for(const key of additives){
            const gouttes=num(value(`${prefix}-gouttes-${key}`)||0,'le nombre de gouttes');
            if(gouttes>0)result[key]={gouttes,gouttesParMl:num(value(`${prefix}-conversion-${key}`),'les gouttes pour 1 ml de '+names[key],true)};
        }return result;
    }
    function cost(amounts,prices){
        let total=0,known=false;const missing=[];
        for(const [key,vol] of Object.entries(volumes).map(([k,f])=>[k,amounts[f]??(additives.includes(k)?0:NaN)])){
            if(!Number.isFinite(vol)||vol<0)throw Error('Quantités invalides.');
            if(vol<=1e-8)continue;
            const p=prices[key];if(!p){missing.push(names[key]);continue;}
            const volume=num(p.volume,'le volume acheté',true),prix=num(p.prix,'le prix acheté');
            total+=vol*prix/volume;known=true;
        }
        if(!Number.isFinite(total))throw Error('Coût trop élevé.');
        return {total,known:known||!missing.length,missing,partial:missing.length>0};
    }
    function pricing(prefix){
        const prices={};for(const key of keysFor(prefix)){
            if(additives.includes(key)&&!(Number(value(`${prefix}-gouttes-${key}`))>0))continue;
            const stockId=value(`${prefix}-stock-${key}`);if(stockId){Object.assign(prices,DIYStock.prices({[key]:stockId}));continue;}
            const prix=value(`${prefix}-prix-${key}`);if(prix==='')continue;
            let volume=num(value(`${prefix}-pack-${key}`),'la contenance de '+names[key],true);
            if(key==='base'&&value(`${prefix}-unite-base`)==='l')volume*=1000;
            if(key==='booster')volume*=10;
            const nom=value(`${prefix}-nom-${key}`).trim();if(nom.length>120||/[<>]/.test(nom))throw Error('Nom d’ingrédient invalide.');
            if(key==='booster'&&!Number.isSafeInteger(volume/10))throw Error('Indique un nombre entier de boosters par conditionnement.');
            prices[key]={volume,prix:num(prix,'le prix de '+names[key]),nom};
        }return prices;
    }
    function amounts(prefix){
        if(prefix==='ajust'){
            const a=calculerAjustementDIY();if(!a)throw Error('Vérifie les valeurs de l’ajustement.');return a;
        }
        const ids=prefix==='recette'?['recette-volume','recette-nicotine','recette-arome','recette-taux-booster']:prefix==='prep'?['volume','nicotine','arome','prep-taux-booster']:['volume-direct','nicotine-direct','direct-arome','direct-taux-booster'];
        return withAdditives(dosages(...ids.map((id,index)=>index===2?(value(id)||'0'):value(id))),readAdditives(prefix));
    }
    function snapshot(prefix){
        const prices=pricing(prefix),a=amounts(prefix),c=cost(a,prices);
        const rate=Number(value(prefix==='recette'?'recette-taux-booster':prefix==='ajust'?'ajust-taux-booster':prefix+'-taux-booster'));
        const stockSelection=Object.fromEntries(keysFor(prefix).map(k=>[k,value(`${prefix}-stock-${k}`)]));
        return {prices,amounts:a,...c,tauxBooster:rate,stockSelection,additifs:readAdditives(prefix)};
    }
    function attach(record,s){
        record.coutDIY={prix:s.prices,tauxBooster:s.tauxBooster,stockSelection:s.stockSelection||{}};
        record.additifs=s.additifs||{};
        delete record.coutFlacon;delete record.coutPartiel;
        if(s.known){record.coutFlacon=s.total;record.coutPartiel=s.partial;}
        return record;
    }
    function field(parent,id,label,type='number',initial='',options=null){
        const group=document.createElement('label');group.className='groupe-champ';group.textContent=label;
        const input=document.createElement(options?'select':'input');input.id=id;
        if(options)for(const [v,t] of options){const o=document.createElement('option');o.value=v;o.textContent=t;input.append(o);}
        else {input.type=type;if(type==='number'){input.min='0';input.step='any';input.inputMode='decimal';}}
        if(type==='number')input.addEventListener('wheel',e=>{if(document.activeElement===input){e.preventDefault();input.blur();}},{passive:false});
        input.value=initial;group.append(input);parent.append(group);return input;
    }
    function preview(prefix){
        const state=states[prefix];if(!state)return;
        if(prefix==='prep'||prefix==='direct')state.root.hidden=value(prefix==='prep'?'type':'type-direct')!=='DIY';
        try{
            const s=snapshot(prefix);
            for(const key of keysFor(prefix)){const p=s.prices[key];const vol=(s.amounts[volumes[key]]??0);state.units[key].textContent=p?`${(p.prix/p.volume).toLocaleString('fr-FR',{maximumFractionDigits:5})} €/ml · ${vol.toLocaleString('fr-FR',{maximumFractionDigits:2})} ml utilisés : ${euros(vol*p.prix/p.volume)}`:'';}
            const target=prefix==='ajust'?flacons.find(f=>f.id===value('ajust-flacon-cible')):null;
            const q=prefix==='prep'?num(value('flacon-quantite'),'le nombre de flacons',true):target&&!target.startedAt?(target.quantite??1):1;
            let text=s.known?`${s.partial?'Coût théorique partiel':'Coût théorique des ingrédients'} : ${euros(s.total)} par flacon`:'Renseigne les prix pour calculer le coût.';
            if(s.known&&q>1)text+=` · ${euros(s.total*q)} pour ${q} flacons`;
            if(s.missing.length)text+=' · Prix manquants : '+s.missing.join(', ');
            if(prefix==='ajust'){
                text=s.known?`Coût des ajouts${s.partial?' (partiel)':''} : ${euros(s.total)}`:'Renseigne les prix des ingrédients ajoutés.';
                const initial=value('ajust-cout-initial');
                if(initial!=='')text+=` · Mélange final : ${euros(num(initial,'le coût initial')+s.total)}${s.partial?' (partiel)':''}`;
                else text+=' · Le coût initial du mélange est nécessaire pour connaître son coût total.';
                if(s.missing.length)text+=' Prix manquants : '+s.missing.join(', ')+'.';
            }
            if(prefix!=='ajust'){
                const parts=Object.entries(s.additifs).map(([k,a])=>`${names[k]} : ${a.gouttes.toLocaleString('fr-FR',{maximumFractionDigits:4})} gouttes (${s.amounts[volumes[k]].toLocaleString('fr-FR',{maximumFractionDigits:4})} ml)`);
                state.additiveSummary.textContent=parts.join(' · ')+(parts.length?' par flacon. Leur volume est déduit de la base neutre. Pour une fraction de goutte, mesure le volume en ml.':'');
                if(prefix==='recette'){const base=document.getElementById('calc-base');base.textContent=s.amounts.volBase.toLocaleString('fr-FR',{maximumFractionDigits:4})+' ml';base.style.color='#e6edf3';}
            }
            state.output.textContent=text;
            const lots=DIYStock.readLots();const lines=[];
            for(const [key,field] of Object.entries(volumes)){
                const needed=(s.amounts[field]??0)*q;if(needed<=1e-8)continue;const id=s.stockSelection[key],lot=lots.find(l=>l.id===id);
                lines.push(`${names[key]} : ${needed.toLocaleString('fr-FR',{maximumFractionDigits:2})} ml nécessaires${lot?' / '+lot.volumeRestant.toLocaleString('fr-FR',{maximumFractionDigits:2})+' ml disponibles':' · aucun stock sélectionné'}`);
            }
            try{DIYStock.plan(s.stockSelection,s.amounts,q,s.tauxBooster);state.stockStatus.classList.remove('stock-insuffisant');}
            catch(e){lines.push('Stock insuffisant ou incompatible : '+e.message);state.stockStatus.classList.add('stock-insuffisant');}
            state.stockStatus.textContent=lines.join('\n');

        }catch(e){state.output.textContent=e.message;state.stockStatus.textContent='';if(state.additiveSummary)state.additiveSummary.textContent='';if(prefix==='recette')document.getElementById('calc-base').textContent='À vérifier';}
    }
    function load(prefix,recipe){
        const s=recipe?.coutDIY;
        if(prefix!=='ajust')MyVapeUI.setFlavorSelect(document.getElementById(prefix==='recette'?'recette-saveurs':prefix==='prep'?'categorie-saveur':'categorie-saveur-direct'),recipe);
        refreshStock();
        for(const key of keysFor(prefix)){
            const p=s?.prix?.[key];const select=document.getElementById(`${prefix}-stock-${key}`);const id=s?.stockSelection?.[key]||'';if(id&&!Array.from(select.options).some(o=>o.value===id))select.add(new Option('Lot introuvable — choisir un autre ingrédient',id));select.value=id;
            document.getElementById(`${prefix}-nom-${key}`).value=p?.nom??'';document.getElementById(`${prefix}-prix-${key}`).value=p?.prix??'';
            document.getElementById(`${prefix}-pack-${key}`).value=p?(key==='booster'?p.volume/10:p.volume):(key==='arome'?30:key==='base'?1000:key==='booster'?1:10);
        }
        document.getElementById(`${prefix}-unite-base`).value='ml';
        if(prefix==='prep'||prefix==='direct')document.getElementById(prefix+'-taux-booster').value=s?.tauxBooster??20;
        if(prefix==='direct')document.getElementById('direct-arome').value=recipe?.arome??0;
        if(prefix!=='ajust'){
            for(const key of additives){
                document.getElementById(`${prefix}-gouttes-${key}`).value=recipe?.additifs?.[key]?.gouttes??'';
                document.getElementById(`${prefix}-conversion-${key}`).value=recipe?.additifs?.[key]?.gouttesParMl??'';
            }
            states[prefix].additiveBox.open=Object.keys(recipe?.additifs||{}).length>0;
            states[prefix].lastVolume=Number(value(volumeId(prefix)));
        }
        applyStock(prefix);preview(prefix);
    }
    function purchases(prices,date,selection){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(+new Date(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Renseigne une date d’achat valide.');
        return Object.entries(prices).filter(([key,p])=>selection[key]>0&&p.prix>0).map(([key,p])=>{
            const q=Number(selection[key]);if(!Number.isSafeInteger(q)||q<1||q>1000)throw Error('Vérifie le nombre de conditionnements achetés.');
            return {id:crypto.randomUUID(),categorie:'Base/Booster/Arôme',nom:`${names[key]}${p.nom?' '+p.nom:''} · ${q} × ${p.volume} ml`,montant:Math.round(p.prix*q*100)/100,date:date+'T12:00:00',origineDIY:true};
        });
    }
    function confirmPurchases(prices){
        if(!Object.values(prices).some(p=>p.prix>0))return Promise.resolve([]);
        return new Promise(resolve=>{
            const dialog=creerDialogueFlacon('Ajouter les achats aux dépenses vape ?');
            const info=document.createElement('p');info.textContent='Coche uniquement les produits achetés cette fois-ci. Un produit déjà payé ne doit pas être compté à nouveau. Les montants ci-dessous concernent les conditionnements entiers, pas les millilitres utilisés.';dialog.append(info);
            const form=document.createElement('form'),checks={},counts={};
            const today=dateLocaleFlacon(new Date().toISOString()).slice(0,10);
            const dateInput=field(form,'diy-date-achat','Date de l’achat','date',today);dateInput.required=true;
            for(const [key,p] of Object.entries(prices))if(p.prix>0){
                checks[key]=field(form,'diy-achat-'+key,`${names[key]}${p.nom?' '+p.nom:''} : ${p.volume} ml à ${euros(p.prix)}`,'checkbox');
                counts[key]=field(form,'diy-nombre-'+key,'Nombre de conditionnements achetés','number',1);counts[key].min=1;counts[key].max=1000;counts[key].step=1;
            }
            const total=document.createElement('p');total.className='cout-diy-total';form.append(total);
            const update=()=>{total.textContent='Total des achats sélectionnés : '+euros(Object.entries(prices).reduce((sum,[k,p])=>sum+(checks[k]?.checked?p.prix*(Number(counts[k].value)||0):0),0));};form.addEventListener('input',update);update();
            const error=document.createElement('p');error.setAttribute('role','alert');form.append(error);
            const yes=document.createElement('button');yes.type='submit';yes.className='btn-primaire';yes.textContent='OK, ajouter les achats cochés';form.append(yes);
            const no=document.createElement('button');no.type='button';no.className='btn-secondaire';no.textContent='Non, ne rien ajouter';no.onclick=()=>dialog.close();form.append(no);
            let result=[];form.onsubmit=e=>{e.preventDefault();try{const selected=Object.fromEntries(Object.keys(checks).map(k=>[k,checks[k].checked?num(counts[k].value,'les quantités',true):0]));result=purchases(prices,dateInput.value,selected);dialog.close();}catch(err){error.textContent=err.message;}};
            dialog.append(form);dialog.addEventListener('close',()=>resolve(result),{once:true});dialog.showModal();
        });
    }
    function persist(key,next,expenses=[]){
        const previous=localStorage.getItem(key),oldExpenses=localStorage.getItem('vt_depenses');
        const nextExpenses=key==='vt_depenses'?next:[...expenses,...depenses];
        try{localStorage.setItem(key,JSON.stringify(next));if(expenses.length)localStorage.setItem('vt_depenses',JSON.stringify(nextExpenses));}
        catch(e){try{previous==null?localStorage.removeItem(key):localStorage.setItem(key,previous);if(expenses.length)oldExpenses==null?localStorage.removeItem('vt_depenses'):localStorage.setItem('vt_depenses',oldExpenses);}catch{}throw e;}
        if(key==='vt_flacons')flacons=next;if(key==='vt_recettes')recettes=next;depenses=nextExpenses;
    }
    function mount(prefix,parentId,beforeSelector){
        const parent=document.getElementById(parentId),root=document.createElement('div');root.className='cout-diy';
        const title=document.createElement('h3');title.textContent='Ingrédients, stock et coût';root.append(title);
        if(prefix==='direct')field(root,'direct-arome','Arôme (%)','number',0);
        if(prefix==='direct'||prefix==='prep')field(root,prefix+'-taux-booster','Taux du booster (mg/ml)','number',20);
        const note=document.createElement('p');note.className='texte-secondaire';note.textContent='Choisis tes ingrédients en stock pour retrouver leur prix. Le coût théorique est calculé sans dépense. Enregistrer une recette ne consomme rien ; seule une préparation réelle décompte les quantités.';root.append(note);
        const manage=document.createElement('button');manage.type='button';manage.className='btn-secondaire';manage.textContent='Ajouter un ingrédient au stock';manage.onclick=()=>DIYStock.addDialog();root.append(manage);
        const units={},manuals={};
        const additiveBox=document.createElement('details');additiveBox.className='diy-additifs';
        const heading=document.createElement('summary');heading.textContent='Additifs frais / sucré (facultatif)';additiveBox.append(heading);
        const help=document.createElement('p');help.className='texte-secondaire';help.textContent='Indique les gouttes par flacon et la conversion indiquée pour ton produit (gouttes pour 1 ml). Il n’existe pas de conversion universelle. Tu peux utiliser les deux additifs.';additiveBox.append(help);
        const additiveSummary=document.createElement('p');additiveSummary.className='texte-secondaire';
        for(const key of keysFor(prefix)){
            const label=names[key],container=additives.includes(key)?additiveBox:root;
            if(additives.includes(key)){
                field(container,`${prefix}-gouttes-${key}`,label+' — gouttes par flacon (facultatif)','number','');
                field(container,`${prefix}-conversion-${key}`,'Gouttes pour 1 ml de cet additif','number','');
                const buy=document.createElement('button');buy.type='button';buy.className='btn-secondaire';buy.textContent='Ajouter un achat / stock — '+label;buy.onclick=()=>DIYStock.addDialog(key);container.append(buy);
            }
            const select=field(container,`${prefix}-stock-${key}`,label+' — mon stock',null,'',[['','Sans suivi du stock / prix manuel']]);select.addEventListener('change',()=>{applyStock(prefix);preview(prefix);});
            const details=document.createElement('details');manuals[key]=details;const summary=document.createElement('summary');summary.textContent=label+' — prix manuel (facultatif)';details.append(summary);
            field(details,`${prefix}-nom-${key}`,'Nom du produit (facultatif)','text','').maxLength=120;
            field(details,`${prefix}-pack-${key}`,key==='booster'?'Nombre de boosters de 10 ml dans le conditionnement':'Contenance du flacon acheté', 'number',key==='arome'?30:key==='base'?1000:key==='booster'?1:10);
            if(key==='base')field(details,`${prefix}-unite-base`,'Unité',null,'ml',[['ml','ml'],['l','L']]);
            field(details,`${prefix}-prix-${key}`,key==='booster'?'Prix du booster ou de la boîte entière (€)':'Prix du flacon entier (€)','number','');
            units[key]=document.createElement('p');units[key].className='texte-secondaire';details.append(units[key]);container.append(details);
        }
        if(prefix!=='ajust'){root.append(additiveBox,additiveSummary);}
        if(prefix==='ajust')field(root,'ajust-cout-initial','Coût du mélange existant, par flacon (€, facultatif)','number','');
        const output=document.createElement('p');output.className='cout-diy-total';output.setAttribute('aria-live','polite');root.append(output);
        const stockStatus=document.createElement('p');stockStatus.className='stock-disponibilite';stockStatus.setAttribute('role','status');root.append(stockStatus);
        const anchor=parent.querySelector(beforeSelector);if(anchor)anchor.before(root);else parent.append(root);states[prefix]={root,output,units,manuals,stockStatus,additiveBox,additiveSummary};
        if(prefix!=='ajust'){
            const input=document.getElementById(volumeId(prefix));states[prefix].lastVolume=Number(input.value);
            input.addEventListener('input',()=>{
                const next=Number(input.value),previous=states[prefix].lastVolume;
                if(next>0&&previous>0){for(const key of additives){const drops=document.getElementById(`${prefix}-gouttes-${key}`);if(drops.value!=='')drops.value=Number((Number(drops.value)*next/previous).toFixed(8));}}
                if(next>0)states[prefix].lastVolume=next;
            });
        }
        parent.addEventListener('input',()=>preview(prefix));parent.addEventListener('change',()=>preview(prefix));preview(prefix);
    }
    function volumeId(prefix){return prefix==='recette'?'recette-volume':prefix==='prep'?'volume':'volume-direct';}
    function refreshTargets(){
        const select=document.getElementById('ajust-flacon-cible');if(!select)return;const previous=select.value;
        select.replaceChildren(new Option('Calcul seul — aucun flacon modifié',''));
        for(const f of flacons.filter(f=>!f.termine&&f.type==='DIY'))select.append(new Option(`${f.nom} · ${f.volume} ml · ${f.startedAt?'entamé':'réserve'}${!f.startedAt&&f.quantite>1?' · lot de '+f.quantite+' flacons':''}`,f.id));
        select.value=previous;
    }
    let savingAdjustment=false;
    async function saveAdjustment(){
        if(savingAdjustment)return;savingAdjustment=true;
        try{
            const id=value('ajust-flacon-cible'),f=flacons.find(f=>f.id===id&&!f.termine&&f.type==='DIY');
            if(id&&!f)throw Error('Ce flacon n’est plus disponible.');
            const s=snapshot('ajust'),initial=value('ajust-cout-initial');if(initial!=='')num(initial,'le coût initial');
            if(!f)throw Error('Choisis un flacon à ajuster. Le calcul seul ne modifie pas le stock.');
            if(f){
                const current=flacons.find(item=>item.id===id&&!item.termine);if(!current)throw Error('Ce flacon n’est plus disponible.');
                const next={...current,volume:s.amounts.volTotal,nicotine:Number(value('ajust-nico-visee')),arome:Number(value('ajust-arome-pct'))};
                if(initial!==''){next.coutFlacon=num(initial,'le coût initial')+s.total;next.coutPartiel=s.partial;}
                else if(s.known){next.coutFlacon=s.total;next.coutPartiel=true;}
                else {delete next.coutFlacon;delete next.coutPartiel;}
                next.coutDIY={prix:s.prices,tauxBooster:s.tauxBooster,stockSelection:s.stockSelection};
                DIYStock.consume(next,s,current);
                document.getElementById('ajust-flacon-cible').value='';
            }
            mettreAJourTout();MyVapeUI.toast('Flacon ajusté, coût et stock mis à jour');
            if(f){refreshTargets();afficherEcran('ecran-accueil');}
        }catch(e){alert(e.message);}finally{savingAdjustment=false;}
    }
    function applyStock(prefix){
        const lots=DIYStock.readLots(),state=states[prefix];
        for(const key of keysFor(prefix)){const id=value(`${prefix}-stock-${key}`);state.manuals[key].hidden=!!id;}
        if(prefix!=='ajust')for(const key of additives){
            const input=document.getElementById(`${prefix}-conversion-${key}`),lot=lots.find(l=>l.id===value(`${prefix}-stock-${key}`));
            input.readOnly=!!lot?.gouttesParMl;if(lot?.gouttesParMl)input.value=lot.gouttesParMl;
        }
        const rateInput=document.getElementById(prefix==='recette'?'recette-taux-booster':prefix==='ajust'?'ajust-taux-booster':prefix+'-taux-booster');
        const lot=lots.find(l=>l.id===value(`${prefix}-stock-booster`));rateInput.readOnly=!!lot;if(lot)rateInput.value=lot.tauxBooster;
    }
    function refreshStock(){
        const lots=DIYStock.readLots();
        for(const prefix of Object.keys(states)){
            for(const key of keysFor(prefix)){
                const select=document.getElementById(`${prefix}-stock-${key}`),previous=select.value;
                select.replaceChildren(new Option('Sans suivi du stock / prix manuel',''));
                for(const lot of lots.filter(l=>l.type===key))select.add(new Option(`${lot.nom} · ${lot.volumeRestant.toLocaleString('fr-FR',{maximumFractionDigits:2})} ml${lot.type==='booster'?' · '+lot.tauxBooster+' mg/ml':''} · lot du ${new Date(lot.dateAchat+'T12:00:00').toLocaleDateString('fr-FR')}${lot.volumeRestant===0?' (épuisé)':''}`,lot.id));
                if(previous&&!lots.some(l=>l.id===previous))select.add(new Option('Lot introuvable — choisir un autre ingrédient',previous));select.value=previous;
            }applyStock(prefix);preview(prefix);
        }
    }
    function init(){
        mount('recette','form-recette','button.btn-primaire');mount('prep','form-flacon','button.btn-primaire');mount('direct','form-utilisation-directe','button.btn-primaire');mount('ajust','form-ajustement','#btn-fermer-ajustement');
        for(const [id,prefix] of [['select-recette','prep'],['select-recette-directe','direct']])document.getElementById(id).addEventListener('change',e=>load(prefix,recettes.find(r=>r.id===e.target.value)));
        const form=document.getElementById('form-ajustement'),targetBox=document.createElement('div');form.insertBefore(targetBox,form.children[1]);
        const target=field(targetBox,'ajust-flacon-cible','Appliquer à un flacon DIY (facultatif)',null,'',[]);
        const note=document.createElement('p');note.className='texte-secondaire';note.textContent='Les quantités sont calculées par flacon. Si tu choisis un lot en réserve, l’ajustement s’applique à chacun de ses flacons.';targetBox.append(note);
        target.onchange=()=>{const f=flacons.find(f=>f.id===target.value);if(!f)return;
            for(const [id,v] of [['ajust-vol-actuel',f.volume],['ajust-nico-actuelle',f.nicotine],['ajust-arome-actuel',f.arome||0],['ajust-nico-visee',f.nicotine],['ajust-arome-pct',f.arome||0],['ajust-volume-final-vise',''],['ajust-taux-booster',f.coutDIY?.tauxBooster??20]])document.getElementById(id).value=v;
            load('ajust',f);document.getElementById('ajust-cout-initial').value=f.coutPartiel?'':f.coutFlacon??'';preview('ajust');
        };
        const save=document.createElement('button');save.type='button';save.className='btn-primaire';save.textContent='Appliquer l’ajustement au flacon et au stock';save.onclick=saveAdjustment;form.insertBefore(save,document.getElementById('btn-fermer-ajustement'));
        document.getElementById('tab-mode-ajuster').addEventListener('click',()=>{refreshTargets();preview('ajust');});
        document.getElementById('tab-mode-creer').addEventListener('click',()=>{refreshStock();preview('recette');});
        for(const id of ['btn-ouvrir-ajout','btn-ouvrir-utilisation-directe'])document.getElementById(id).addEventListener('click',refreshStock);
        refreshStock();
    }
    document.addEventListener('DOMContentLoaded',init);
    return {dosages,withAdditives,amounts,cost,attach,snapshot,preview,confirmPurchases,purchases,persist,load,refreshStock};
})();
