import MyVapeTabac from '../suivi-tabac.js';
const localDate = value => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  return match ? new Date(+match[1], +match[2] - 1, +match[3], 9) : new Date(NaN);
};
export function plan({config = {}, bottles = [], goals = []}, now = new Date()) {
  const notifications = [];
  const add = (id, at, title, body) => {
    if (Number.isFinite(+at) && at > now) notifications.push({id, title, body,
      schedule: {at, allowWhileIdle: true}, isExactNotification: false,
      smallIcon: 'ic_stat_myvapepal', iconColor: '#D985A8', channelId: 'myvapepal-reminders'});
  };
  const start = localDate(config.dateArret);
  for (let offset = 0; offset <= 365; offset++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 9);
    const days = MyVapeTabac.stats(config,MyVapeTabac.localDate(at)).days;
    if (days > 0) add(10000 + offset, at, 'Bravo pour ton parcours ! 🌸',
      `${days} jour${days > 1 ? 's' : ''} sans cigarette. Chaque journée compte !`);
  }
  [31, 91, 151, 241].forEach((days, index) => {
    const at = new Date(start); at.setDate(at.getDate() + days); at.setMinutes(5);
    for (const item of MyVapeTabac.entries(config,MyVapeTabac.localDate(now)).sort((a,b)=>a.date.localeCompare(b.date))) {
      if (item.date < MyVapeTabac.localDate(at)) at.setDate(at.getDate()+1);
    }
    add(20000 + index, at, 'Ton cerisier grandit 🌸', `Ton cerisier atteint le stade ${index + 2}. Découvre-le dans MyVapePal !`);
  });
  bottles.filter(f => !f.termine && !f.actif && !f.startedAt && f.steepReadyAt).forEach((f, index) =>
    add(100000 + index, new Date(f.steepReadyAt), 'Un flacon est prêt !', `${f.nom || 'Ton flacon'} a terminé sa maturation. Retrouve-le dans ta réserve.`));
  goals.filter(g => g.statut !== 'atteint').forEach((g, index) =>
    add(200000 + index, localDate(g.date), 'On fait le point ? 🎯', `Aujourd’hui, ton objectif : ${g.titre || 'faire le point sur ta nicotine'}.`));
  return notifications;
}
