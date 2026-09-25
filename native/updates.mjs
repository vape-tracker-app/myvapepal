import { registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { shouldPrompt } from './update-policy.mjs';
const play = registerPlugin('PlayUpdates');
const key = 'mvp_update_later';
let checking = false, lastCheck = 0, pending = null, timer = null;
function dismissed() { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function postpone(versionCode) { try { localStorage.setItem(key, JSON.stringify({versionCode, at:Date.now()})); } catch {} }
function present() {
  clearTimeout(timer);
  if (!pending || document.visibilityState !== 'visible') return;
  if (document.getElementById('splash-screen') || document.querySelector('dialog[open]')) {
    timer = setTimeout(present, 1500); return;
  }
  const info = pending; pending = null;
  if (!shouldPrompt(info, dismissed())) return;
  const dialog = document.createElement('dialog'); dialog.className = 'dialog-saveurs';
  dialog.setAttribute('aria-labelledby', 'update-title');
  const title = document.createElement('h2'); title.id = 'update-title'; title.textContent = 'MyVapePal évolue 🌸';
  const text = document.createElement('p');
  text.textContent = 'Une mise à jour est disponible ! Profite des dernières améliorations pour continuer ton aventure dans les meilleures conditions.';
  const hint = document.createElement('p'); hint.className = 'texte-secondaire';
  hint.textContent = 'Sur Google Play, touche « Mettre à jour », puis « Ouvrir » pour retrouver MyVapePal.';
  const actions = document.createElement('div'); actions.className = 'actions-choix-appareil';
  const update = document.createElement('button'); update.type = 'button'; update.className = 'btn-primaire'; update.textContent = 'Mettre à jour sur Google Play';
  const later = document.createElement('button'); later.type = 'button'; later.className = 'btn-secondaire'; later.textContent = 'Plus tard';
  const error = document.createElement('p'); error.setAttribute('role', 'alert');
  update.onclick = async () => {
    update.disabled = true;
    try { await play.openStore(); postpone(info.versionCode); dialog.close(); }
    catch { error.textContent = 'Google Play ne s’ouvre pas. Réessaie ou recherche MyVapePal dans le Store.'; update.disabled = false; }
  };
  later.onclick = () => dialog.close();
  dialog.addEventListener('close', () => { postpone(info.versionCode); dialog.remove(); }, {once:true});
  actions.append(update, later); dialog.append(title, text, hint, actions, error); document.body.append(dialog); dialog.showModal();
}
async function check() {
  if (checking || Date.now() - lastCheck < 60 * 60 * 1000) return;
  checking = true; lastCheck = Date.now();
  let timeout;
  try {
    const info = await Promise.race([play.check(), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 10000); })]);
    if (shouldPrompt(info, dismissed())) { pending = info; present(); }
  } catch { /* Hors ligne ou sans Play Store : l’application reste utilisable. */ }
  finally { clearTimeout(timeout); checking = false; }
}
function start() { check(); App.addListener('appStateChange', ({isActive}) => { if (isActive) { present(); check(); } }).catch(() => {}); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
