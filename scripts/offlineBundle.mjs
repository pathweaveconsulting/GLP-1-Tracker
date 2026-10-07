import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function generateOfflineBundle(root) {
  root = path.resolve(root);
  const files = [];
  const walk = dir => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isSymbolicLink()) throw new Error('Offline build cannot include symlinks.');
      if (item.isDirectory()) walk(full);
      else if (item.isFile() && !['_headers', 'sw.js', 'offline-assets.json'].includes(item.name)) files.push('/' + path.relative(root, full).split(path.sep).join('/'));
    }
  };
  walk(root);
  files.sort();
  const requireFile = name => { if (!files.includes(name) || fs.statSync(path.join(root, name)).size === 0) throw new Error(`Missing offline build input: ${name}`); };
  requireFile('/index.html'); requireFile('/manifest.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  for (const size of ['192x192', '512x512']) {
    const icon = manifest.icons?.find(icon => icon.sizes === size && icon.type === 'image/png');
    if (!icon || !icon.src.startsWith('/') || icon.src.includes('..')) throw new Error(`Missing ${size} offline icon.`);
    requireFile(icon.src);
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)].map(m => m[1]);
  if (!refs.some(name => name.startsWith('/assets/') && name.endsWith('.js')) || !refs.some(name => name.endsWith('.css'))) throw new Error('Offline entry must include built JS and CSS.');
  refs.forEach(requireFile);
  if (!files.some(name => /\/assets\/recharts-.*\.js$/.test(name))) throw new Error('Offline build is missing chart routes.');
  const hash = createHash('sha256');
  for (const name of files) hash.update(name).update(fs.readFileSync(path.join(root, name)));
  const cacheName = 'glp1-static-' + hash.digest('hex').slice(0, 24);
  const worker = `// Generated from the complete build. Cache public app files only, never health records.\nconst CACHE = ${JSON.stringify(cacheName)};\nconst ASSETS = ${JSON.stringify(files)};\nself.addEventListener('install', event => {\n  event.waitUntil((async () => {\n    try { const cache = await caches.open(CACHE); await cache.addAll(ASSETS.map(url => new Request(url, { credentials: 'omit', cache: 'reload' }))); }\n    catch (error) { await caches.delete(CACHE); throw error; }\n  })());\n});\n// No skipWaiting or clients.claim: a new build waits until existing tabs are closed.\nself.addEventListener('activate', event => {\n  event.waitUntil((async () => {\n    const names = await caches.keys();\n    await Promise.all(names.filter(name => name.startsWith('glp1-static-') && name !== CACHE).map(name => caches.delete(name)));\n  })());\n});\nself.addEventListener('fetch', event => {\n  const request = event.request;\n  const url = new URL(request.url);\n  if (request.method !== 'GET' || url.origin !== self.location.origin) return;\n  if (request.mode === 'navigate') {\n    event.respondWith(caches.open(CACHE).then(cache => cache.match('/index.html')).then(response => response || fetch(request)));\n  } else if (ASSETS.includes(url.pathname)) {\n    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(response => response || fetch(request)));\n  }\n});\n`;
  fs.writeFileSync(path.join(root, 'sw.js'), worker);
  fs.writeFileSync(path.join(root, 'offline-assets.json'), JSON.stringify({ cacheName, assets: files }, null, 2) + '\n');
  return { cacheName, assets: files };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = generateOfflineBundle(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist'));
  console.log(`Offline bundle verified: ${result.assets.length} public files, ${result.cacheName}.`);
}
