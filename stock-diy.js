// Stock commun à tous les DIY. Les lots conservent leur prix d'achat.
const DIYStock=(()=>{
    const LOTS='vt_stock_diy',MOVES='vt_stock_mouvements',JOURNAL='mvp_stock_rollback';
    const keys=[LOTS,MOVES,'vt_flacons','vt_depenses'];
    const labels={arome:'Arôme',base:'Base neutre',booster:'Boosters'};
    const read=key=>JSON.parse(localStorage.getItem(key)||'[]');
    const finite=(v,label,min=0)=>{const n=Number(v);if(v===''||!Number.isFinite(n)||n<min||n>1e9)throw Error('Vérifie '+label+'.');return n;};
    const text=v=>{const s=String(v||'').trim();if(!s||s.length>120||/[<>]/.test(s))throw Error('Indique un nom de produit valide.');return s;};
    const round=n=>Math.round(n*1e8)/1e8;
    const ml=n=>n.toLocaleString('fr-FR',{maximumFractionDigits:2})+' ml';
    const euro=n=>n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
    function recover(){
        const journal=localStorage.getItem(JOURNAL);if(!journal)return;
        const before=JSON.parse(journal);
        for(const key of keys)if(Object.hasOwn(before,key))before[key]===null?localStorage.removeItem(key):localStorage.setItem(key,before[key]);
        localStorage.removeItem(JOURNAL);
    }
    recover();
    function transact(changes){
        recover();
        const before={};for(const key of Object.keys(changes)){if(!keys.includes(key))throw Error('Enregistrement inconnu.');before[key]=localStorage.getItem(key);}
        localStorage.setItem(JOURNAL,JSON.stringify(before));
        try{for(const [key,val] of Object.entries(changes))localStorage.setItem(key,JSON.stringify(val));localStorage.removeItem(JOURNAL);}
        catch(e){try{recover();}catch{}throw e;}
        if(changes.vt_flacons)flacons=changes.vt_flacons;
        if(changes.vt_depenses)depenses=changes.vt_depenses;
    }
    function addLot(v,expense=false){
        if(!Object.hasOwn(labels,v.type))throw Error('Choisis un type d’ingrédient.');
        const volumeInitial=finite(v.volumeInitial,'le volume acheté',0.000001),volumeRestant=finite(v.volumeRestant,'le volume restant');
        if(volumeRestant>volumeInitial)throw Error('Le volume restant dépasse la quantité achetée.');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(v.dateAchat)||!Number.isFinite(Date.parse(v.dateAchat))||new Date(v.dateAchat).toISOString().slice(0,10)!==v.dateAchat)throw Error('Indique une date valide.');
        const lot={id:crypto.randomUUID(),type:v.type,nom:text(v.nom),volumeInitial,volumeRestant,prixTotal:v.prixTotal==null||v.prixTotal===''?null:finite(v.prixTotal,'le prix'),dateAchat:v.dateAchat,tauxBooster:v.type==='booster'?finite(v.tauxBooster,'le taux du booster',0.000001):null};
        const changes={[LOTS]:[lot,...read(LOTS)]};
        if(expense){if(!(lot.prixTotal>0))throw Error('Indique le prix d’achat pour l’ajouter aux finances.');changes.vt_depenses=[{id:crypto.randomUUID(),nom:`${lot.nom} · ${ml(volumeInitial)}`,categorie:'Base/Booster/Arôme',montant:Math.round(lot.prixTotal*100)/100,date:lot.dateAchat+'T12:00:00',stockLotId:lot.id},...depenses];}
        transact(changes);return lot.id;
    }
    function correct(id,remaining,reason=''){
        const lots=read(LOTS),lot=lots.find(l=>l.id===id);if(!lot)throw Error('Lot introuvable.');
        remaining=finite(remaining,'le volume restant');if(remaining>lot.volumeInitial)throw Error('Pour un nouvel achat, ajoute un nouveau lot.');
        const motif=String(reason).trim();if(motif.length>300||/[<>]/.test(motif))throw Error('Motif invalide.');
        const movement={id:crypto.randomUUID(),type:'correction',nom:lot.nom,date:new Date().toISOString(),lotId:id,avant:lot.volumeRestant,apres:remaining,motif};
        lot.volumeRestant=remaining;transact({[LOTS]:lots,[MOVES]:[movement,...read(MOVES)]});
    }
    function prices(selection){
        const lots=read(LOTS),result={};
        for(const [key,id] of Object.entries(selection||{})){if(!id)continue;const l=lots.find(l=>l.id===id&&l.type===key);if(!l)throw Error('Un ingrédient sélectionné n’existe plus. Choisis un autre lot.');
            if(l.prixTotal!=null)result[key]={volume:l.volumeInitial,prix:l.prixTotal,nom:l.nom};
        }return result;
    }
    function plan(selection,amounts,quantity=1,rate=20){
        quantity=finite(quantity,'le nombre de flacons',1);if(!Number.isInteger(quantity)||quantity>100)throw Error('Nombre de flacons invalide.');
        const lots=read(LOTS),usages=[];
        for(const [key,field] of Object.entries({arome:'volArome',base:'volBase',booster:'volBooster'})){
            const amount=round(finite(amounts[field],'les quantités utilisées')*quantity),id=selection?.[key];if(!id||amount===0)continue;
            const lot=lots.find(l=>l.id===id&&l.type===key);if(!lot)throw Error('Lot introuvable : choisis un autre ingrédient.');
            if(key==='booster'&&Number(rate)!==lot.tauxBooster)throw Error('Le taux du booster doit correspondre au lot sélectionné.');
            if(lot.volumeRestant+1e-7<amount)throw Error(`${lot.nom} : il faut ${ml(amount)}, mais il reste ${ml(lot.volumeRestant)}. Ajoute un achat ou choisis un autre lot.`);
            usages.push({lotId:id,volume:amount});lot.volumeRestant=Math.max(0,round(lot.volumeRestant-amount));
        }
        return {lots,usages};
    }
    function consume(record,s,previous=null){
        const quantity=record.startedAt?1:(record.quantite??1),p=plan(s.stockSelection,s.amounts,quantity,s.tauxBooster);
        const current=previous?flacons.find(f=>f.id===previous.id):null;
        if(previous&&JSON.stringify(current)!==JSON.stringify(previous))throw Error('Ce flacon a changé. Recharge-le avant de valider.');
        const next=structuredClone(record),changes={};
        if(p.usages.length){
            const movement={id:crypto.randomUUID(),type:previous?'ajustement':'preparation',nom:record.nom,date:new Date().toISOString(),flaconId:record.id,quantite:quantity,usages:p.usages,annule:false,avantFlacon:previous?structuredClone(previous):null};
            next.stockMouvementId=movement.id;movement.apresFlacon=structuredClone(next);
            changes[LOTS]=p.lots;changes[MOVES]=[movement,...read(MOVES)];
        }
        changes.vt_flacons=previous?flacons.map(f=>f.id===record.id?next:f):[next,...flacons];transact(changes);return next;
    }
    function cancellable(move){
        if(move.annule||!move.apresFlacon)return false;
        const f=flacons.find(f=>f.id===move.flaconId);return !!f&&!f.termine&&JSON.stringify(f)===JSON.stringify(move.apresFlacon);
    }
    function cancel(id){
        const moves=read(MOVES),move=moves.find(m=>m.id===id);if(!move||!cancellable(move))throw Error('Impossible d’annuler : le flacon a été ouvert, terminé, retiré ou modifié depuis.');
        const lots=read(LOTS);
        for(const use of move.usages){const l=lots.find(l=>l.id===use.lotId);if(!l)throw Error('Lot manquant.');const total=round(l.volumeRestant+use.volume);if(total>l.volumeInitial+1e-7)throw Error('Le stock a été corrigé depuis. Vérifie les quantités avant d’annuler.');l.volumeRestant=total;}
        move.annule=true;
        const next=move.avantFlacon?flacons.map(f=>f.id===move.flaconId?structuredClone(move.avantFlacon):f):flacons.filter(f=>f.id!==move.flaconId);
        transact({[LOTS]:lots,[MOVES]:moves,vt_flacons:next});
    }
    const el=(tag,t,cls)=>{const e=document.createElement(tag);if(t)e.textContent=t;if(cls)e.className=cls;return e;};
    function button(parent,label,fn,primary=false){const b=el('button',label,primary?'btn-primaire':'btn-secondaire');b.type='button';b.onclick=fn;parent.append(b);return b;}
    function field(parent,label,value='',options=null,type='number'){
        const group=el('label',label,'groupe-champ'),input=el(options?'select':'input');
        if(options)for(const [v,t] of options){const o=el('option',t);o.value=v;input.append(o);}
        else {input.type=type;if(type==='number'){input.min='0';input.step='any';input.addEventListener('wheel',e=>{if(document.activeElement===input){e.preventDefault();input.blur();}},{passive:false});}}
        input.value=value;group.append(input);parent.append(group);return input;
    }
    function updated(){mettreAJourTout();render();if(typeof DIYCosts!=='undefined')DIYCosts.refreshStock();}
    function addDialog(preferred='arome'){
        const dialog=creerDialogueFlacon('Ajouter à mes ingrédients'),form=el('form');
        const mode=field(form,'Que souhaites-tu ajouter ?','achat',[['achat','Un nouvel achat'],['existant','Du stock déjà présent (même entamé)']]);
        const type=field(form,'Ingrédient',preferred,Object.entries(labels));
        const nom=field(form,'Nom du produit','',null,'text');nom.required=true;nom.maxLength=120;
        const pack=field(form,'Contenance du conditionnement',30);
        const unite=field(form,'Unité','ml',[['ml','ml'],['l','L'],['boosters','Boosters de 10 ml']]);
        const packs=field(form,'Nombre de conditionnements',1);packs.step='1';packs.min='1';packs.max='1000';
        const price=field(form,'Prix d’un conditionnement (€, facultatif)');
        const rate=field(form,'Taux des boosters (mg/ml)',20);
        const remaining=field(form,'Volume restant aujourd’hui (ml)');
        const date=field(form,'Date de l’achat',dateLocaleFlacon(new Date().toISOString()).slice(0,10),null,'date');date.required=true;
        const expenseInfo=el('p','','texte-secondaire');form.append(expenseInfo);
        const info=el('p','','cout-diy-total'),error=el('p');error.setAttribute('role','alert');form.append(info,error);
        const compute=()=>{
            remaining.parentElement.hidden=mode.value!=='existant';rate.parentElement.hidden=type.value!=='booster';
            const total=Number(pack.value)*Number(packs.value)*(unite.value==='l'?1000:unite.value==='boosters'?10:1),cost=Number(price.value)*Number(packs.value);
            info.textContent=`Quantité achetée : ${ml(total||0)}${price.value!==''?' · Coût total : '+euro(cost||0):''}`;
            expenseInfo.textContent=mode.value==='achat' ? (cost>0 ? 'À la validation, tu pourras ajouter cet achat aux dépenses vape.' : 'Renseigne le prix pour pouvoir ajouter cet achat aux dépenses vape.') : 'Ce stock déjà en ta possession ne sera pas ajouté aux dépenses vape.';
        };
        const setType=()=>{pack.value=type.value==='arome'?30:type.value==='base'?1:10;unite.value=type.value==='base'?'l':type.value==='booster'?'boosters':'ml';compute();};
        type.onchange=setType;mode.onchange=compute;form.addEventListener('input',compute);form.addEventListener('change',compute);setType();
        const help=el('p','Pour une boîte de 10 boosters, indique 10 boosters et le prix de la boîte. Un stock déjà payé n’a pas besoin d’être ajouté à nouveau aux finances.','texte-secondaire');form.append(help);
        const save=button(form,'Ajouter au stock',()=>{},true);save.type='submit';button(form,'Annuler',()=>dialog.close());
        form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;try{
            const count=finite(packs.value,'le nombre de conditionnements',1);if(!Number.isInteger(count)||count>1000)throw Error('Nombre de conditionnements invalide.');
            const v=finite(pack.value,'la contenance',0.000001)*count*(unite.value==='l'?1000:unite.value==='boosters'?10:1);
            const lot={type:type.value,nom:nom.value,volumeInitial:v,volumeRestant:mode.value==='existant'?remaining.value:v,prixTotal:price.value===''?null:finite(price.value,'le prix')*count,tauxBooster:rate.value,dateAchat:date.value};
            const finish=expense=>{addLot(lot,expense);dialog.close();updated();};
            if(mode.value==='achat'&&lot.prixTotal>0){
                const confirmation=el('section');
                confirmation.append(el('p',`Souhaites-tu ajouter cet achat de ${euro(lot.prixTotal)} aux dépenses vape ?`));
                confirmation.append(el('p',`${lot.nom} · Date de l’achat : ${lot.dateAchat.split('-').reverse().join('/')} · La dépense sera enregistrée dans le mois correspondant.`,'texte-secondaire'));
                const complete=expense=>{try{finish(expense);}catch(err){confirmation.remove();form.hidden=false;error.textContent=err.message;}};
                button(confirmation,'Oui, ajouter la dépense',()=>complete(true),true);
                button(confirmation,'Non, ajouter seulement au stock',()=>complete(false));
                button(confirmation,'Retour',()=>{confirmation.remove();form.hidden=false;});
                form.hidden=true;dialog.append(confirmation);
            }else finish(false);
        }catch(err){error.textContent=err.message;}};
        dialog.append(form);dialog.showModal();
    }
    function correctionDialog(lot){
        const dialog=creerDialogueFlacon('Corriger le stock : '+lot.nom),form=el('form');
        form.append(el('p','Pour un nouvel achat, ajoute plutôt un nouveau lot. Cette correction ne change ni le prix payé ni les dépenses.','texte-secondaire'));
        const remaining=field(form,'Quantité réellement restante (ml)',lot.volumeRestant),reason=field(form,'Motif (facultatif)','',null,'text');reason.maxLength=300;
        const error=el('p');error.setAttribute('role','alert');form.append(error);
        const save=button(form,'Enregistrer la correction',()=>{},true);save.type='submit';button(form,'Annuler',()=>dialog.close());
        form.onsubmit=e=>{e.preventDefault();try{correct(lot.id,remaining.value,reason.value);dialog.close();updated();}catch(err){error.textContent=err.message;}};dialog.append(form);dialog.showModal();
    }
    function cancelDialog(move){
        const dialog=creerDialogueFlacon('Annuler '+(move.type==='ajustement'?'cet ajustement':'cette préparation'));
        dialog.append(el('p',move.type==='ajustement'?'Le flacon retrouvera son état précédent et les ingrédients seront restitués au stock.':'Le lot de flacons sera retiré et les ingrédients seront restitués au stock.'));
        dialog.append(el('p','À utiliser seulement si cette opération a été saisie par erreur et que les ingrédients n’ont pas été réellement mélangés. Les achats restent dans les finances.','texte-secondaire'));
        const error=el('p');error.setAttribute('role','alert');dialog.append(error);
        button(dialog,'Confirmer l’annulation',()=>{try{cancel(move.id);dialog.close();updated();}catch(e){error.textContent=e.message;}},true);button(dialog,'Conserver',()=>dialog.close());dialog.showModal();
    }
    function render(){
        const zone=document.getElementById('liste-ingredients');if(!zone)return;zone.replaceChildren();
        const lots=read(LOTS);if(!lots.length)zone.append(el('p','Ajoute ton arôme, ta base et tes boosters. Tu pourras les réutiliser dans toutes tes recettes.','texte-secondaire'));
        for(const [type,label] of Object.entries(labels)){
            const group=el('div');group.append(el('h3',label));const entries=lots.filter(l=>l.type===type);if(!entries.length)continue;
            for(const lot of entries){const card=el('article',null,'carte stock-ingredient');card.append(el('h4',lot.nom),el('p',`${ml(lot.volumeRestant)} restants sur ${ml(lot.volumeInitial)}${type==='booster'?' · '+(lot.volumeRestant/10).toLocaleString('fr-FR',{maximumFractionDigits:2})+' boosters · '+lot.tauxBooster+' mg/ml':''}`,'cout-diy-total'));
                card.append(el('p',`Lot du ${new Date(lot.dateAchat+'T12:00:00').toLocaleDateString('fr-FR')} · ${lot.prixTotal==null?'Prix non renseigné':euro(lot.prixTotal)+' · '+(lot.prixTotal/lot.volumeInitial).toLocaleString('fr-FR',{maximumFractionDigits:5})+' €/ml'}`,'texte-secondaire'));
                if(lot.volumeRestant===0)card.append(el('p','Épuisé','texte-secondaire'));button(card,'Corriger la quantité restante',()=>correctionDialog(lot));group.append(card);
            }zone.append(group);
        }
        const history=el('details'),summary=el('summary','Mouvements récents et annulations');history.append(summary);
        for(const move of read(MOVES).slice(0,30)){
            const card=el('div',null,'stock-mouvement');card.append(el('strong',move.nom),el('p',new Date(move.date).toLocaleString('fr-FR')+' · '+(move.annule?'Annulé':move.type==='correction'?`Correction : ${ml(move.avant)} → ${ml(move.apres)}`:move.type==='ajustement'?'Ajustement':`Préparation de ${move.quantite} flacon(s)`),'texte-secondaire'));
            if(move.motif)card.append(el('p',move.motif));
            if(cancellable(move))button(card,'Annuler '+(move.type==='ajustement'?'cet ajustement':'cette préparation'),()=>cancelDialog(move));
            else if(move.apresFlacon&&!move.annule)card.append(el('p','Annulation indisponible : flacon ouvert, terminé, retiré ou modifié.','texte-secondaire'));
            history.append(card);
        }zone.append(history);
    }
    function open(){render();afficherEcran('ecran-ingredients');}
    document.addEventListener('DOMContentLoaded',()=>{document.getElementById('btn-mes-ingredients').onclick=open;document.getElementById('btn-ajouter-ingredient').onclick=()=>addDialog();});
    return {readLots:()=>read(LOTS),addLot,correct,prices,plan,consume,cancel,cancellable,transact,recover,open,render,addDialog};
})();
