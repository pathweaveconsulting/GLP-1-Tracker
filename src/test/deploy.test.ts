import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

/** Parse a Cloudflare Pages `_headers` file: an unindented path line, then indented `Name: value` lines. */
function parseHeaders(text: string): Record<string, Record<string, string>> {
  const rules: Record<string, Record<string, string>> = {};
  let current: string | null = null;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { current = line.trim(); rules[current] = {}; continue; }
    const m = /^\s+([A-Za-z][A-Za-z0-9-]*):\s*(.+)$/.exec(line);
    expect(m, `header line must look like "  Name: value": ${JSON.stringify(line)}`).not.toBeNull();
    expect(current, 'a header line must follow a path line').not.toBeNull();
    rules[current!][m![1]] = m![2].trim();
  }
  return rules;
}

describe('deploy: public/_headers (Cloudflare Pages)', () => {
  const rules = parseHeaders(read('public/_headers'));

  it('keeps the test site out of search engines and sets basic hardening headers on every path', () => {
    expect(rules['/*']).toBeDefined();
    expect(rules['/*']['X-Robots-Tag']).toMatch(/noindex/);
    expect(rules['/*']['X-Content-Type-Options']).toBe('nosniff');
    expect(rules['/*']['Referrer-Policy']).toBe('no-referrer');
    expect(rules['/*']['X-Frame-Options']).toBe('DENY');
    expect(rules['/*']['Permissions-Policy']).toMatch(/camera=\(\)/);
  });

  it('caches only the content-hashed build assets as immutable, never index.html', () => {
    expect(rules['/assets/*']['Cache-Control']).toMatch(/immutable/);
    expect(rules['/*']['Cache-Control']).not.toMatch(/immutable/);
    expect(rules['/*']['Cache-Control']).toMatch(/no-transform/);
  });

  it('stays within the Pages limits (100 rules, 2000 characters per line)', () => {
    expect(Object.keys(rules).length).toBeLessThanOrEqual(100);
    for (const line of read('public/_headers').split('\n')) expect(line.length).toBeLessThanOrEqual(2000);
  });

  it('allows local app assets and blocks outbound connections and third-party scripts', () => {
    const csp = rules['/*']['Content-Security-Policy'];
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toMatch(/https?:/);
  });
});

describe('deploy: README documents what the build produces', () => {
  const readme = read('README.md');
  const pkg = JSON.parse(read('package.json'));

  it('has a Deploy section naming the build command and output directory that really exist', () => {
    expect(readme).toMatch(/^## Deploy/m);
    expect(pkg.scripts.build).toBe('vite build');
    expect(readme).toMatch(/npm run build/);
    expect(readme).toMatch(/`dist`/);
    expect(read('.gitignore')).toMatch(/^dist\/?$/m);
  });

  it('says how to remove noindex before going public, and that no CSP was tested', () => {
    expect(readme).toMatch(/X-Robots-Tag/);
    expect(readme).toMatch(/Content-Security-Policy|CSP/);
  });
});
