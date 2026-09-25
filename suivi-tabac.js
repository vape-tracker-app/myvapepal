// Calculs communs au navigateur, aux rappels Android et au service Web Push.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MyVapeTabac = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const DAY = 86400000;
    const localDate = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value;
    const startDate = config => (config?.dateArret || '').slice(0,10);
    const elapsed = (start, today) => validDate(start) && validDate(today) ? Math.max(0, Math.round((Date.parse(today+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/DAY)) : 0;
    function smokeFreeDays(start, dates, today) {
        const excluded = new Set(dates.filter(date => date >= start && date < today));
        return Math.max(0, elapsed(start,today)-excluded.size);
    }
    function entries(config, today = localDate()) {
        return (config?.suiviTabac?.cigarettes || []).filter(item => item.date >= startDate(config) && item.date <= today);
    }
    function stats(config, today = localDate()) {
        const current = entries(config,today);
        return {
            elapsed: elapsed(startDate(config),today),
            days: smokeFreeDays(startDate(config),current.map(item=>item.date),today),
            smoked: current.reduce((sum,item)=>sum+item.quantite,0)
        };
    }
    const financeStart = config => config?.suiviTabac?.dateDebutFinances || startDate(config);
    function financeEntries(config, today = localDate()) {
        // La journée du redémarrage figure dans l’archive et le parcours courant.
        // Son total est cumulatif : garder le maximum, jamais additionner ces copies.
        const days = new Map();
        const all = [...(config?.suiviTabac?.archives || []).flatMap(a=>a.cigarettes), ...(config?.suiviTabac?.cigarettes || [])];
        for (const item of all) if (item.date >= financeStart(config) && item.date <= today) days.set(item.date,Math.max(days.get(item.date)||0,item.quantite));
        return [...days].map(([date,quantite])=>({date,quantite}));
    }
    function financialStats(config, today = localDate()) {
        const smoked = financeEntries(config,today).reduce((sum,item)=>sum+item.quantite,0);
        const theoretical = elapsed(financeStart(config),today) * (config?.cigsJour || 15);
        return {smoked,avoided:theoretical-smoked};
    }
    function countInMonth(config, year, month, today = localDate()) {
        const prefix = `${year}-${String(month+1).padStart(2,'0')}-`;
        return financeEntries(config,today).filter(item=>item.date.startsWith(prefix)).reduce((sum,item)=>sum+item.quantite,0);
    }
    const object = value => value && typeof value === 'object' && !Array.isArray(value);
    function validateEntries(items) {
        if (!Array.isArray(items) || items.length > 10000) throw Error('Historique des cigarettes invalide');
        const dates = new Set();
        for (const item of items) {
            if (!object(item) || !validDate(item.date) || !Number.isSafeInteger(item.quantite) || item.quantite < 1 || item.quantite > 1000000 || dates.has(item.date)) throw Error('Cigarettes enregistrées invalides');
            dates.add(item.date);
        }
    }
    function validate(value) {
        if (value === undefined) return; // Profils et sauvegardes antérieurs.
        if (!object(value) || value.version !== 1 || !Array.isArray(value.archives) || value.archives.length > 1000) throw Error('Suivi du tabac invalide');
        if (value.dateDebutFinances !== undefined && !validDate(value.dateDebutFinances)) throw Error('Début du suivi financier invalide');
        if (value.archives.length && !validDate(value.dateDebutFinances)) throw Error('Début du suivi financier manquant');
        validateEntries(value.cigarettes);
        for (const archive of value.archives) {
            if (!object(archive) || !validDate(archive.dateDebut) || !validDate(archive.dateFin) || archive.dateFin < archive.dateDebut || !object(archive.bilan) || !object(archive.parametres)) throw Error('Parcours archivé invalide');
            validateEntries(archive.cigarettes);
            for (const field of ['joursSansTabac','cigarettesFumees']) if (!Number.isSafeInteger(archive.bilan[field]) || archive.bilan[field] < 0) throw Error('Bilan de parcours invalide');
            for (const field of ['cigarettesEvitees','economieTabac','depensesVape','economieNette']) if (typeof archive.bilan[field] !== 'number' || !Number.isFinite(archive.bilan[field])) throw Error('Bilan de parcours invalide');
            for (const field of ['cigsJour','prixPaquet','cigsPaquet']) if (typeof archive.parametres[field] !== 'number' || !Number.isFinite(archive.parametres[field]) || archive.parametres[field] <= 0) throw Error('Paramètres du parcours invalides');
        }
    }
    function record(config, quantity, today = localDate()) {
        if (!config?.dateArret || !validDate(today) || today < startDate(config)) throw Error('Vérifie la date de début de ton parcours.');
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000) throw Error('Indique un nombre entier de cigarettes supérieur à zéro.');
        validate(config.suiviTabac);
        const previous = config.suiviTabac || {version:1,cigarettes:[],archives:[]};
        const cigarettes = previous.cigarettes.map(item=>({...item}));
        const item = cigarettes.find(item=>item.date===today);
        if (item) item.quantite += quantity;
        else cigarettes.push({date:today,quantite:quantity});
        cigarettes.sort((a,b)=>a.date.localeCompare(b.date));
        const suiviTabac = {...previous,cigarettes};
        validate(suiviTabac);
        return {...config,suiviTabac};
    }
    function restart(config, expenses, today = localDate()) {
        validate(config?.suiviTabac);
        if (!validDate(today) || !validDate(startDate(config)) || today < startDate(config)) throw Error('Date de parcours invalide');
        const previous = config.suiviTabac || {version:1,cigarettes:[],archives:[]};
        const current = stats(config,today), finances = financialStats(config,today);
        const parametres = {cigsJour:Number(config.cigsJour||15),prixPaquet:Number(config.prixPaquet||12.5),cigsPaquet:Number(config.cigsPaquet||20)};
        const economieTabac = finances.avoided / parametres.cigsPaquet * parametres.prixPaquet;
        const depensesVape = expenses.reduce((sum,item)=>sum+Number(item.montant),0);
        const archive = {dateDebut:startDate(config),dateFin:today,cigarettes:previous.cigarettes.map(item=>({...item})),parametres,
            bilan:{joursSansTabac:current.days,cigarettesFumees:current.smoked,cigarettesEvitees:finances.avoided,economieTabac,depensesVape,economieNette:economieTabac-depensesVape}};
        const suiviTabac = {...previous,dateDebutFinances:financeStart(config),archives:[...previous.archives,archive],
            cigarettes:financeEntries(config,today).filter(item=>item.date===today)};
        validate(suiviTabac);
        return {...config,dateArret:today,suiviTabac};
    }
    return {localDate,validDate,elapsed,smokeFreeDays,entries,stats,financeStart,financeEntries,financialStats,countInMonth,validate,record,restart};
});
