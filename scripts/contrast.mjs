// WCAG 2.x contrast audit for text colours used in the source.
//   node scripts/contrast.mjs        -> prints a report, exits 1 if any text colour fails
// The same functions are imported by src/test/contrast.test.ts so CI enforces it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AA_NORMAL = 4.5;

// Tailwind palette shades used by the app (hex equivalents of the default palette).
export const PALETTE = {
  white: '#ffffff', black: '#000000',
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0', 'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b', 'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b', 'slate-900': '#0f172a',
  'rose-50': '#fff1f2', 'rose-100': '#ffe4e6', 'rose-400': '#fb7185', 'rose-500': '#f43f5e', 'rose-600': '#e11d48', 'rose-700': '#be123c', 'rose-800': '#9f1239', 'rose-900': '#881337', 'rose-950': '#4c0519',
  'red-50': '#fef2f2', 'red-500': '#ef4444', 'red-600': '#dc2626', 'red-700': '#b91c1c',
  'amber-50': '#fffbeb', 'amber-100': '#fef3c7', 'amber-200': '#fde68a', 'amber-400': '#fbbf24', 'amber-500': '#f59e0b', 'amber-600': '#d97706', 'amber-700': '#b45309', 'amber-800': '#92400e', 'amber-900': '#78350f', 'amber-950': '#451a03',
  'orange-50': '#fff7ed', 'orange-100': '#ffedd5', 'orange-500': '#f97316', 'orange-600': '#ea580c', 'orange-700': '#c2410c', 'orange-800': '#9a3412', 'orange-900': '#7c2d12',
  'emerald-50': '#ecfdf5', 'emerald-100': '#d1fae5', 'emerald-200': '#a7f3d0', 'emerald-400': '#34d399', 'emerald-500': '#10b981', 'emerald-600': '#059669', 'emerald-800': '#065f46', 'emerald-900': '#064e3b', 'emerald-950': '#022c22',
  'purple-50': '#faf5ff', 'purple-100': '#f3e8ff', 'purple-200': '#e9d5ff', 'purple-300': '#d8b4fe', 'purple-600': '#9333ea', 'purple-700': '#7e22ce', 'purple-800': '#6b21a8', 'purple-900': '#581c87', 'purple-950': '#3b0764',
  'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-500': '#3b82f6', 'blue-600': '#2563eb',
  'indigo-50': '#eef2ff', 'indigo-100': '#e0e7ff', 'indigo-900': '#312e81',
  'sky-50': '#f0f9ff', 'sky-100': '#e0f2fe', 'sky-900': '#0c4a6e',
  'teal-50': '#f0fdfa',
};

export function lum(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Design tokens defined in src/index.css (@theme): { name: '#hex' }. */
export function readTokens(css) {
  const out = {};
  for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

const SKIP_TEXT = new Set(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', 'left', 'right', 'center', 'justify', 'ellipsis', 'clip', 'wrap', 'nowrap', 'balance', 'pretty', 'transparent', 'current', 'inherit']);

function resolve(token, tokens) {
  let m = /^\[(#[0-9a-fA-F]{6})\]$/.exec(token);
  if (m) return m[1].toLowerCase();
  if (token in tokens) return tokens[token];
  if (token in PALETTE) return PALETTE[token];
  return null;
}

/** Walk src and collect every (text colour, background) pair per className string. */
export function collect(srcDir, tokens) {
  const results = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const file of walk(srcDir).filter((f) => /\.tsx$/.test(f) && !/\.test\./.test(f))) {
    const src = fs.readFileSync(file, 'utf8');
    // every quoted string / template chunk that could be a class list
    const literals = [];
    for (const m of src.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)) {
      const raw = m[1] ?? m[2] ?? m[3] ?? '';
      // inside a template, ${...} expressions are code: split them out so ternary branches become separate literals
      raw.split(/\$\{[^}]*\}/).forEach((chunk) => literals.push({ index: m.index, text: chunk }));
    }
    for (const lit of literals) {
      const s = lit.text;
      if (!/\btext-/.test(s)) continue;
      const classes = s.split(/\s+/);
      const bgs = [];
      for (const c of classes) {
        const bg = /^(?:bg|from|via)-(.+)$/.exec(c);
        if (bg && !/\//.test(bg[1])) { const r = resolve(bg[1], tokens); if (r) bgs.push(r); }
      }
      for (const c of classes) {
        const t = /^text-(.+)$/.exec(c);
        if (!t || SKIP_TEXT.has(t[1])) continue; // hover:/dark: variants are skipped by the ^ anchor
        const fg = resolve(t[1], tokens);
        if (!fg) continue;
        const line = src.slice(0, lit.index).split('\n').length;
        results.push({ file, line, cls: c, fg, bgs });
      }
    }
  }
  // Chart axis labels are SVG text coloured with tick={{ fill: '#hex' }}; they sit on the white card.
  for (const file of walk(srcDir).filter((f) => /\.tsx$/.test(f) && !/\.test\./.test(f))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/tick=\{\{[^}]*?fill: '(#[0-9a-fA-F]{6})'/g)) {
      results.push({ file, line: src.slice(0, m.index).split('\n').length, cls: `tick fill ${m[1]}`, fg: m[1].toLowerCase(), bgs: [] });
    }
  }
  return results;
}

/** Evaluate one usage against its own background, or against the app's light surfaces when it has none. */
export const LIGHT_SURFACES = ['#ffffff', '#f8f9fc', '#f1f5f9'];
export function evaluate(u) {
  const bgs = u.bgs.length ? [u.bgs[0]] : LIGHT_SURFACES;
  const worst = Math.min(...bgs.map((b) => contrast(u.fg, b)));
  // Very light text without a background of its own sits on a dark parent (banner, tooltip); reviewed by hand.
  const assumedDark = !u.bgs.length && lum(u.fg) > 0.45;
  return { ...u, ratio: worst, assumedDark, pass: assumedDark || worst >= AA_NORMAL };
}

export function audit(root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')) {
  const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');
  const tokens = readTokens(css);
  const usages = collect(path.join(root, 'src'), tokens).map(evaluate);
  return { tokens, usages, failures: usages.filter((u) => !u.pass) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { tokens, usages, failures } = audit();
  const byClass = new Map();
  for (const f of failures) byClass.set(f.cls, [...(byClass.get(f.cls) ?? []), `${path.relative(process.cwd(), f.file)}:${f.line} (${f.ratio.toFixed(2)}:1)`]);
  console.log(`Tokens: ${Object.entries(tokens).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  console.log(`${usages.length} text colour usages checked against ${AA_NORMAL}:1; ${failures.length} fail.`);
  for (const [cls, where] of byClass) console.log(`\n${cls}  (${where.length})\n  ${where.slice(0, 6).join('\n  ')}${where.length > 6 ? '\n  …' : ''}`);
  process.exit(failures.length ? 1 : 0);
}
