import { readdir, mkdir, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'www');
await rm(output, {recursive: true, force: true});
await mkdir(output);
// Only public frontend files; never copy backend projects, secrets or logs.
for (const entry of await readdir(root, {withFileTypes: true})) {
  if ((entry.isFile() && /\.(html|css|js|png|svg)$/.test(entry.name) && entry.name !== 'sw.js') ||
      (entry.isDirectory() && ['assets', 'vendor'].includes(entry.name))) {
    await cp(path.join(root, entry.name), path.join(output, entry.name), {recursive: true});
  }
}
let html = await readFile(path.join(output, 'index.html'), 'utf8');
html = html.replace(/\s*<link rel="manifest"[^>]*>/, '');
html = html.replace(/<script src="push.js[^\"]*"><\/script>/, '<script src="native-notifications.js"></script>');
html = html.replace(/En activant les notifications, tu transmets au service Cloudflare[\s\S]*?bouton ci-dessus\./, 'Les rappels Android sont programmés sur ce téléphone, sans transmettre tes données au service de notifications. Les rappels quotidiens couvrent les 12 prochains mois et sont renouvelés à chaque ouverture. Android peut retarder leur réception selon ses réglages de batterie.');
await writeFile(path.join(output, 'index.html'), html);
await build({entryPoints: [path.join(root, 'native/notifications.mjs')], bundle: true, format: 'iife', globalName: 'MyVapePush', outfile: path.join(output, 'native-notifications.js')});
console.log('Frontend Android préparé avec les notifications locales.');
