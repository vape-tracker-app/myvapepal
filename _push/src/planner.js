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
    if (!Array.isArray(steeps) || steeps.length > 100) throw Error('Liste invalide');
    const ids = new Set();
    return {dateArret, timezone, steeps: steeps.map(s => {
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
export function plan(config, previous, now = Date.now()) {
    const local = localDay(now,config.timezone);
    const days = daysSince(config.dateArret,local.date);
    const currentStage = stage(days);
    const state = {...previous, steepSent: {...previous.steepSent}};
    const events = [];
    if (state.dateArret !== config.dateArret) {
        state.dateArret = config.dateArret;
        state.stage = currentStage; // Ne pas annoncer des stades atteints avant l'activation ou après une correction de date.
    }
    if (days > 0 && local.hour >= 9 && state.daily !== local.date) {
        events.push({id:`jour-${local.date}-${config.dateArret}`, title:'Bravo pour ton parcours ! 🌸',body:`${days} jour${days>1?'s':''} sans cigarette. Chaque journée compte !`,url:'./index.html',tag:`jour-${local.date}`});
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
    const activeKeys = new Set(config.steeps.map(s=>`${s.id}:${s.readyAt}`));
    state.steepSent=Object.fromEntries(Object.entries(state.steepSent).filter(([k])=>activeKeys.has(k)));
    return {state,events};
}
