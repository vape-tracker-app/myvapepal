import { LocalNotifications as notifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { plan } from './planner.mjs';
const key = 'mvp_native_notifications_enabled';
let enabled = localStorage.getItem(key) === 'true';
let busy = false;
let message = '';
let queue = Promise.resolve();
let fingerprint = '';
const read = (key, fallback) => JSON.parse(localStorage.getItem(key) || 'null') || fallback;
export function render() {
  const button = document.getElementById('btn-profil-notif');
  const label = document.getElementById('profil-notif-statut');
  if (!button || !label) return;
  button.disabled = busy;
  button.textContent = enabled ? 'Activées' : 'Activer les notifications';
  button.style.background = enabled ? '#238636' : '';
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-label', enabled ? 'Désactiver les notifications' : 'Activer les notifications');
  label.textContent = message || (enabled ? 'Rappels sur ce téléphone, autour de 9 h pour le quotidien. Android peut les retarder.' : 'Active les rappels sur ce téléphone.');
  button.onclick = toggle;
  let test = document.getElementById('native-notification-test');
  if (!test) {
    test = document.createElement('button'); test.id = 'native-notification-test';
    test.type = 'button'; test.className = 'btn-primaire';
    test.style.marginTop = '12px'; test.textContent = 'Tester une notification';
    button.parentElement.after(test);
    test.onclick = () => run(async () => {
      if ((await notifications.checkPermissions()).display !== 'granted') throw Error('Autorise les notifications dans les paramètres Android de MyVapePal.');
      await notifications.schedule({notifications: [{id: 999, title: 'MyVapePal 🌸', body: 'Les notifications Android fonctionnent ! Touche ici pour ouvrir l’application.', smallIcon: 'ic_stat_myvapepal', iconColor: '#D985A8', channelId: 'myvapepal-reminders', isExactNotification: false, schedule: {at: new Date(Date.now() + 10000), allowWhileIdle: true}}]});
      message = 'Test programmé : mets l’application en arrière-plan. Android peut différer sa réception.';
    });
  }
  test.hidden = !enabled; test.disabled = busy;
}
async function run(action) {
  busy = true; render();
  try { await action(); } catch (error) { console.error('Notifications Android', error); message = error.message || 'Impossible de programmer les notifications. Réessaie.'; }
  finally { busy = false; render(); }
}
async function reconcile(force = false) {
  if (!enabled) return;
  if ((await notifications.checkPermissions()).display !== 'granted') {
    message = 'Notifications bloquées par Android. Autorise-les dans les paramètres de MyVapePal.';
    fingerprint = ''; render(); return;
  }
  const data = {config: read('vt_config', {}), bottles: read('vt_flacons', []), goals: read('vt_objectifs', [])};
  const stamp = JSON.stringify([data, new Date().toDateString(), new Date().getTimezoneOffset()]);
  if (!force && stamp === fingerprint) return;
  const pending = await notifications.getPending();
  const old = pending.notifications.filter(n => n.id !== 999);
  if (old.length) await notifications.cancel({notifications: old.map(n => ({id: n.id}))});
  const planned = plan(data);
  if (planned.length) await notifications.schedule({notifications: planned});
  fingerprint = stamp;
  message = ''; render();
}
export function sync(force = false) {
  queue = queue.then(() => reconcile(force)).catch(error => {
    fingerprint = ''; message = 'La programmation a échoué. Rouvre l’application pour réessayer.'; console.error(error); render();
  });
  return queue;
}
function toggle() {
  return run(async () => {
    await queue;
    if (enabled) {
      const pending = await notifications.getPending();
      if (pending.notifications.length) await notifications.cancel({notifications: pending.notifications.map(n => ({id: n.id}))});
      enabled = false; localStorage.setItem(key, 'false'); fingerprint = ''; message = '';
    } else {
      const permission = await notifications.requestPermissions();
      if (permission.display !== 'granted') throw Error('Autorise les notifications dans les paramètres Android de MyVapePal.');
      enabled = true; localStorage.setItem(key, 'true');
      await reconcile(true);
    }
  });
}
async function init() {
  await notifications.createChannel({id: 'myvapepal-reminders', name: 'Rappels MyVapePal', importance: 4, visibility: 1});
  // Android brings the existing activity to the foreground when a notification is tapped.
  await App.addListener('appStateChange', state => { if (state.isActive) sync(true); });
  render(); await sync(true);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => run(init));
else run(init);
