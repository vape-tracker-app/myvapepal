import MyVapeTabac from '../../suivi-tabac.js';
const DAY = 86400000;
export function localDay(now, timezone) {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', hourCycle:'h23'}).formatToParts(new Date(now));
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return {date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour)};
}
export function stage(days) {
    return days <= 30 ? 1 : days <= 90 ? 2 : days <= 150 ? 3 : days <= 240 ? 4 : 5;
}
export function daysSince(date, today) {
    return Math.max(0, Math.floor((Date.parse(today+'T00:00:00Z')-Date.parse(date+'T00:00:00Z'))/DAY));
}
export function validateConfig(value, now = Date.now()) {
    if (!value || typeof value !== 'object') throw Error('Configuration invalide');
    const {dateArret, timezone, steeps} = value;
    if (typeof dateArret !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateArret)) throw Error('Date invalide');
    const date = new Date(dateArret+'T00:00:00Z');
    if (!Number.isFinite(+date) || date.toISOString().slice(0,10) !== dateArret || dateArret < '1900-01-01') throw Error('Date invalide');
    if (typeof timezone !== 'string' || timezone.length > 80) throw Error('Fuseau invalide');
    const today = localDay(now, timezone).date;
    if (dateArret > today) throw Error('Date future');
    const smokingDays = value.smokingDays === undefined ? [] : value.smokingDays;
    if (!Array.isArray(smokingDays) || smokingDays.length > 10000 || new Set(smokingDays).size !== smokingDays.length || smokingDays.some(day=>!MyVapeTabac.validDate(day)||day<dateArret||day>today)) throw Error('Jours avec tabac invalides');
    if (!Array.isArray(steeps) || steeps.length > 100) throw Error('Liste invalide');
    const ids = new Set();
    const goals=value.goals || [];
    if(!Array.isArray(goals)||goals.length>100)throw Error('Objectifs invalides');
    const goalIds=new Set();
    for(const g of goals){
        if(!g || typeof g.id!=='string' || !/^[\w-]{1,80}$/.test(g.id) || goalIds.has(g.id) || typeof g.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(g.date) || !Number.isFinite(Date.parse(g.date+'T00:00:00Z')) || new Date(g.date+'T00:00:00Z').toISOString().slice(0,10)!==g.date || typeof g.nicotine!=='number' || !Number.isFinite(g.nicotine) || g.nicotine<0)throw Error('Objectif invalide');
        goalIds.add(g.id);
    }
    return {dateArret, timezone, ...(smokingDays.length?{smokingDays:[...smokingDays].sort()}:{}), ...(goals.length?{goals:goals.map(({id,date,nicotine})=>({id,date,nicotine}))}:{}), steeps: steeps.map(s => {
        if (!s || typeof s.id !== 'string' || !/^[\w-]{1,80}$/.test(s.id) || ids.has(s.id)) throw Error('Flacon invalide');
        ids.add(s.id);
        if (typeof s.readyAt !== 'string' || !Number.isFinite(Date.parse(s.readyAt)) || Date.parse(s.readyAt)>now+366*DAY) throw Error('Échéance invalide');
        if (s.nom !== undefined && (typeof s.nom !== 'string' || !s.nom.trim() || s.nom.length > 120)) throw Error('Nom invalide');
        if (s.nicotine !== undefined && (typeof s.nicotine !== 'number' || !Number.isFinite(s.nicotine) || s.nicotine < 0)) throw Error('Dosage invalide');
        if (s.volume !== undefined && (typeof s.volume !== 'number' || !Number.isFinite(s.volume) || s.volume <= 0)) throw Error('Volume invalide');
        return {id:s.id, readyAt:new Date(s.readyAt).toISOString(),
            ...(s.nom !== undefined ? {nom:s.nom.trim()} : {}),
            ...(s.nicotine !== undefined ? {nicotine:s.nicotine} : {}),
            ...(s.volume !== undefined ? {volume:s.volume} : {})};
    })};
}
export function steepBody(steep) {
    const parts = [steep.nom || 'Ton flacon'];
    const number = value => value.toLocaleString('fr-FR', {maximumFractionDigits: 3});
    if (typeof steep.nicotine === 'number' && Number.isFinite(steep.nicotine) && steep.nicotine >= 0) parts.push(`nicotine : ${number(steep.nicotine)} mg/ml`);
    if (typeof steep.volume === 'number' && Number.isFinite(steep.volume) && steep.volume > 0) parts.push(`flacon : ${number(steep.volume)} ml`);
    return `${parts.join(' — ')}. Sa maturation est terminée. Retrouve-le dans ta réserve !`;
}
export const dailyBody = days => `${days} jour${days>1?'s':''} sans cigarette. Chaque journée compte !`;
export function plan(config, previous, now = Date.now()) {
    const local = localDay(now,config.timezone);
    const days = MyVapeTabac.smokeFreeDays(config.dateArret,config.smokingDays||[],local.date);
    const currentStage = stage(days);
    const state = {...previous, steepSent: {...previous.steepSent}};
    const events = [];
    if (state.dateArret !== config.dateArret) {
        state.dateArret = config.dateArret;
        state.stage = currentStage; // Ne pas annoncer des stades atteints avant l'activation ou après une correction de date.
    }
    if (days > 0 && local.hour >= 9 && state.daily !== local.date) {
        events.push({id:`jour-${local.date}-${config.dateArret}`, title:'Bravo pour ton parcours ! 🌸',body:dailyBody(days),url:'./index.html',tag:`jour-${local.date}`});
        state.daily=local.date;
    }
    if (currentStage > (state.stage || currentStage)) {
        events.push({id:`arbre-${config.dateArret}-${currentStage}`,title:'Ton cerisier a grandi ! 🌸',body:`Ton cerisier atteint le stade ${currentStage}. Bravo pour ton parcours !`,url:'./index.html',tag:`arbre-${currentStage}`});
    }
    state.stage=currentStage;
    for (const steep of config.steeps) {
        const key = `${steep.id}:${steep.readyAt}`;
        if (Date.parse(steep.readyAt)<=now && !state.steepSent[key]) {
            events.push({id:`steep-${key}`,title:'Ton DIY est prêt ! 🧪',body:steepBody(steep),url:'./index.html',tag:`steep-${steep.id}`});
            state.steepSent[key]=true;
        }
    }
    state.goalSent={...previous.goalSent};
    for(const goal of config.goals || []) {
        const key=`${goal.id}:${goal.date}`;
        if(goal.date<=local.date && local.hour>=9 && !state.goalSent[key]) {
            events.push({id:`objectif-${key}`,title:'On fait le point ? 🎯',body:`${goal.date===local.date?'Aujourd’hui, tu visais':'Tu avais prévu de passer à'} ${goal.nicotine} mg/ml. Où en es-tu ?`,url:'./index.html',tag:`objectif-${goal.id}`});
            state.goalSent[key]=true;
        }
    }
    const goalKeys=new Set((config.goals||[]).map(g=>`${g.id}:${g.date}`));
    state.goalSent=Object.fromEntries(Object.entries(state.goalSent).filter(([k])=>goalKeys.has(k)));
    const activeKeys = new Set(config.steeps.map(s=>`${s.id}:${s.readyAt}`));
    state.steepSent=Object.fromEntries(Object.entries(state.steepSent).filter(([k])=>activeKeys.has(k)));
    return {state,events};
}
