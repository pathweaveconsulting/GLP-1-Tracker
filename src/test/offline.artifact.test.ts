import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { generateOfflineBundle } from '../../scripts/offlineBundle.mjs';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'glp-offline-')); roots.push(root);
  fs.mkdirSync(path.join(root, 'assets')); fs.mkdirSync(path.join(root, 'icons'));
  const write = (name: string, text: string) => fs.writeFileSync(path.join(root, name), text);
  write('index.html', '<script src="/assets/index-x.js"></script><link href="/assets/index-x.css"><link href="/manifest.webmanifest">');
  write('assets/index-x.js', 'entry'); write('assets/index-x.css', 'styles'); write('assets/recharts-x.js', 'charts');
  write('manifest.webmanifest', JSON.stringify({ icons: [192,512].map(n => ({ src: `/icons/icon-${n}.png`, sizes: `${n}x${n}`, type: 'image/png' })) }));
  write('icons/icon-192.png', 'icon'); write('icons/icon-512.png', 'icon'); write('_headers', 'headers');
  return { root, write };
}

describe('generated offline artifact', () => {
  it('derives every built asset, changes version when bytes change, and fails on missing entry references', () => {
    const f = fixture(); f.write('assets/new-route-x.js', 'new route');
    const first = generateOfflineBundle(f.root);
    expect(first.assets).toContain('/assets/new-route-x.js');
    expect(first.assets).not.toContain('/_headers');
    expect(generateOfflineBundle(f.root)).toEqual(first);
    f.write('assets/new-route-x.js', 'changed route');
    expect(generateOfflineBundle(f.root).cacheName).not.toBe(first.cacheName);
    fs.unlinkSync(path.join(f.root, 'assets/index-x.js'));
    expect(() => generateOfflineBundle(f.root)).toThrow(/Missing offline build input/);
  });

  it('fails instead of shipping without chart code or required icons', () => {
    const f = fixture(); fs.unlinkSync(path.join(f.root, 'assets/recharts-x.js'));
    expect(() => generateOfflineBundle(f.root)).toThrow(/missing chart/);
    f.write('assets/recharts-x.js', 'charts'); fs.unlinkSync(path.join(f.root, 'icons/icon-512.png'));
    expect(() => generateOfflineBundle(f.root)).toThrow(/Missing offline build input/);
  });

  it('runs the built worker: caches public files, serves an offline deep link, ignores foreign/mutating requests, and preserves unrelated caches', async () => {
    const f = fixture(); const built = generateOfflineBundle(f.root);
    const events: Record<string, (event: any) => void> = {};
    const requests: Array<{ url: string; options: object }> = [];
    const deleted: string[] = [];
    const shell = { body: 'built app shell' };
    let network = 0;
    vm.runInNewContext(fs.readFileSync(path.join(f.root, 'sw.js'), 'utf8'), {
      self: { location: { origin: 'https://preview.example' }, addEventListener: (name: string, fn: (e: any) => void) => { events[name] = fn; }, skipWaiting: () => { throw Error('Forced upgrade'); }, clients: { claim: () => { throw Error('Forced claim'); } } },
      URL, Request: class { constructor(public url: string, public options: object) { requests.push({url, options}); } },
      caches: { open: async () => ({ addAll: async () => {}, match: async (name: string) => name === '/index.html' ? shell : undefined }), keys: async () => ['other-app', 'glp1-static-old', built.cacheName], delete: async (name: string) => { deleted.push(name); } },
      fetch: async () => { network++; return {}; },
    });
    let installation: Promise<unknown> | undefined;
    events.install({ waitUntil: (p: Promise<unknown>) => { installation = p; } }); await installation;
    expect(requests.map(r => r.url)).toEqual(built.assets);
    expect(requests.every(r => (r.options as any).credentials === 'omit')).toBe(true);
    let response: Promise<unknown> | undefined;
    const respondWith = (p: Promise<unknown>) => { response = p; };
    events.fetch({ request: { url: 'https://preview.example/results', method: 'GET', mode: 'navigate' }, respondWith });
    expect(await response).toBe(shell); expect(network).toBe(0);
    for (const request of [
      { url: 'https://foreign.example/', method: 'GET', mode: 'navigate' },
      { url: 'https://preview.example/assets/index-x.js', method: 'POST', mode: 'cors' },
      { url: 'https://preview.example/private-records.json', method: 'GET', mode: 'cors' },
    ]) { response = undefined; events.fetch({ request, respondWith }); expect(response).toBeUndefined(); }
    events.activate({ waitUntil: (p: Promise<unknown>) => { installation = p; } }); await installation;
    expect(deleted).toEqual(['glp1-static-old']);
  });

  it('removes an incomplete offline cache when installation fails', async () => {
    const f = fixture(); const built = generateOfflineBundle(f.root);
    let install: (event: any) => void = () => {}; const deleted: string[] = [];
    vm.runInNewContext(fs.readFileSync(path.join(f.root, 'sw.js'), 'utf8'), {
      self: { addEventListener: (name: string, fn: typeof install) => { if (name === 'install') install = fn; } },
      Request: class {},
      caches: { open: async () => ({ addAll: async () => { throw Error('Disconnected'); } }), delete: async (name: string) => { deleted.push(name); } },
    });
    let promise: Promise<unknown> | undefined; install({ waitUntil: (p: Promise<unknown>) => { promise = p; } });
    await expect(promise).rejects.toThrow('Disconnected'); expect(deleted).toEqual([built.cacheName]);
  });
});
