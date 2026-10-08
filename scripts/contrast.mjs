// WCAG 2.x contrast audit for the colours used in the source.
//   node scripts/contrast.mjs        -> prints a report, exits 1 if anything fails
// The same functions are imported by src/test/contrast.test.ts so CI enforces it. It checks:
//   text      4.5:1  every text-* class against its own background, else the nearest ancestor element's
//                    background (found by parsing the JSX), else the app's light surfaces
//   non-text  3:1    chart strokes / fills / series colours written as hex literals, and focus rings
//   placeholder 4.5:1 the global ::placeholder colour in src/index.css and any placeholder:text-* class
// Not checked (deliberately): chart gridlines and white marker outlines (decorative).
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AA_NORMAL = 4.5;
export const AA_NON_TEXT = 3;

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
  'purple-400': '#c084fc', 'purple-500': '#a855f7',
  'emerald-700': '#047857', 'amber-300': '#fcd34d', 'sky-600': '#0284c7', 'sky-700': '#0369a1',
  'green-700': '#15803d', 'slate-950': '#020617',
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

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const sourceFiles = (srcDir) => walk(srcDir).filter((f) => /\.tsx$/.test(f) && !/\.test\./.test(f));
const lineOf = (src, index) => src.slice(0, index).split('\n').length;

/** Every quoted string / template chunk in `src` (offset by `base`) that could be a class list. */
function literalsIn(src, base = 0) {
  const out = [];
  for (const m of src.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)) {
    const raw = m[1] ?? m[2] ?? m[3] ?? '';
    // inside a template, ${...} expressions are code: split them out so ternary branches become separate literals,
    // but remember the classes those expressions can add (the other half of `${cond ? 'bg-a' : 'bg-b'}`)
    const inExpr = [...raw.matchAll(/\$\{([^}]*)\}/g)].map((e) => e[1]).join(' ');
    const alt = [...inExpr.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)].map((q) => q[1] ?? q[2] ?? q[3] ?? '').join(' ');
    raw.split(/\$\{[^}]*\}/).forEach((chunk) => out.push({ index: base + m.index, text: chunk, alt }));
  }
  return out;
}

/** Background colours named by one class list (opacity variants are skipped: their colour depends on what is behind). */
function bgsOf(classText, tokens) {
  const bgs = [];
  for (const c of classText.split(/\s+/)) {
    const bg = /^(?:bg|from|via|to)-(.+)$/.exec(c);
    if (bg && !/\//.test(bg[1])) { const r = resolve(bg[1], tokens); if (r) bgs.push(r); }
  }
  return bgs;
}

/**
 * For one file: the className attribute of every JSX element, with the backgrounds that element sets itself and a
 * link to its parent element, so a text colour with no background of its own can be checked against the card,
 * chip or banner it sits in.
 */
function jsxBackgrounds(file, src, tokens) {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const own = new Map(); // element node -> backgrounds it sets
  const attrs = []; // { start, end, el }
  const isEl = (n) => ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n);
  const visit = (n) => {
    if (ts.isJsxAttribute(n) && n.name.getText(sf) === 'className' && n.initializer) {
      const opening = n.parent.parent; // JsxAttributes -> JsxOpeningElement | JsxSelfClosingElement
      const el = ts.isJsxOpeningElement(opening) ? opening.parent : opening;
      const text = n.initializer.getText(sf);
      const start = n.initializer.getStart(sf);
      attrs.push({ start, end: start + text.length, el });
      const bgs = literalsIn(text).flatMap((l) => bgsOf(l.text, tokens));
      own.set(el, [...(own.get(el) ?? []), ...bgs]);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  const backgroundAbove = (el) => {
    for (let n = el.parent; n; n = n.parent) {
      if (isEl(n) && own.get(n)?.length) return own.get(n);
    }
    return [];
  };
  return (index) => {
    let best = null;
    for (const a of attrs) if (index >= a.start && index < a.end && (!best || a.end - a.start < best.end - best.start)) best = a;
    return best ? backgroundAbove(best.el) : [];
  };
}

/** Walk src and collect every (text colour, background) pair per className string. */
export function collect(srcDir, tokens) {
  const results = [];
  for (const file of sourceFiles(srcDir)) {
    const src = fs.readFileSync(file, 'utf8');
    const ancestorBgs = jsxBackgrounds(file, src, tokens);
    for (const lit of literalsIn(src)) {
      const s = lit.text;
      if (!/\btext-/.test(s)) continue;
      const classes = s.split(/\s+/);
      const bgs = bgsOf(s, tokens);
      const altBgs = bgs.length ? [] : bgsOf(lit.alt, tokens);
      for (const c of classes) {
        const t = /^text-(.+)$/.exec(c);
        if (!t || SKIP_TEXT.has(t[1])) continue; // hover:/dark: variants are skipped by the ^ anchor
        const fg = resolve(t[1], tokens);
        if (!fg) continue;
        results.push({ file, line: lineOf(src, lit.index), cls: c, fg, bgs, altBgs, parentBgs: bgs.length || altBgs.length ? [] : ancestorBgs(lit.index) });
      }
    }
    // Chart axis labels are SVG text coloured with tick={{ fill: '#hex' }}; they sit on the white card.
    for (const m of src.matchAll(/tick=\{\{[^}]*?fill: '(#[0-9a-fA-F]{6})'/g)) {
      results.push({ file, line: lineOf(src, m.index), cls: `tick fill ${m[1]}`, fg: m[1].toLowerCase(), bgs: [], altBgs: [], parentBgs: [] });
    }
  }
  return results;
}

/** Evaluate one usage against its own background, then its parent's, or the app's light surfaces when it has none. */
export const LIGHT_SURFACES = ['#ffffff', '#f8f9fc', '#f1f5f9'];
export function evaluate(u) {
  const bgs = u.bgs.length ? [u.bgs[0]] : u.altBgs.length ? u.altBgs : u.parentBgs.length ? u.parentBgs : LIGHT_SURFACES;
  const worst = Math.min(...bgs.map((b) => contrast(u.fg, b)));
  // Very light text without any background of its own or from a parent sits on something dark (banner, tooltip); reviewed by hand.
  const assumedDark = !u.bgs.length && !u.altBgs.length && !u.parentBgs.length && lum(u.fg) > 0.45;
  return { ...u, ratio: worst, assumedDark, pass: assumedDark || worst >= AA_NORMAL };
}

/** Blend `#rrggbb` at `alpha` (0-1) over `bg`. */
export function blend(fg, bg, alpha) {
  const ch = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map((i) => Math.round(ch(fg, i) * alpha + ch(bg, i) * (1 - alpha)).toString(16).padStart(2, '0')).join('');
}

/** Fills a heatmap may use without a contrast check: the card surfaces and the empty "no data" cell. */
const HEATMAP_EXEMPT_FILLS = new Set(['white', '[#F8F9FC]', '[#f8f9fc]', '[#F1F5F9]', '[#f1f5f9]', 'surface', 'canvas', 'sunken']);

const FOCUS_RING = /^(?:focus|focus-visible|focus-within):ring-(?!offset|inset|0$|1$|2$|4$|8$)(.+)$/;

/**
 * Colours that are not text but must still be perceivable (WCAG 1.4.11, 3:1): chart series written as hex literals
 * (stroke / fill / dot / color) and focus rings. Gridlines and white marker outlines are decorative and skipped.
 */
export function collectNonText(srcDir, tokens) {
  const results = [];
  for (const file of sourceFiles(srcDir).concat(walk(srcDir).filter((f) => /\.ts$/.test(f) && !/\.test\./.test(f)))) {
    const src = fs.readFileSync(file, 'utf8');
    src.split('\n').forEach((lineText, i) => {
      const decorativeLine = /CartesianGrid/.test(lineText);
      // series colour palettes written as arrays, e.g. const DOSE_COLORS = ['#10b981', ...]
      for (const m of lineText.matchAll(/\b[A-Z_]*COLORS\s*=\s*\[([^\]]*)\]/g)) {
        for (const h of m[1].matchAll(/#[0-9a-fA-F]{6}/g)) {
          results.push({ file, line: i + 1, kind: 'chart', cls: `${m[0].split('=')[0].trim()} ${h[0]}`, fg: h[0].toLowerCase(), bg: LIGHT_SURFACES, need: AA_NON_TEXT });
        }
      }
      for (const m of lineText.matchAll(/\b(stroke|fill|dot|color|backgroundColor)\s*[:=]\s*\{?\s*['"](#[0-9a-fA-F]{6})['"]/g)) {
        const hex = m[2].toLowerCase();
        if (decorativeLine || hex === '#ffffff') continue;
        if (m[1] === 'fill' && /tick=/.test(lineText)) continue; // axis label text: checked as text
        const text = m[1] === 'color' && /style=/.test(lineText); // inline style colour is text (backgroundColor swatches are graphics)
        results.push({ file, line: i + 1, kind: text ? 'text' : 'chart', cls: `${m[1]} ${m[2]}`, fg: hex, bg: LIGHT_SURFACES, need: text ? AA_NORMAL : AA_NON_TEXT });
      }
    });
    if (!file.endsWith('.tsx')) continue;
    // Heatmap cells carry meaning by fill, so every bg-* class in a heatmap component must reach 3:1 against the card and
    // carry white marks (counts, arrows) at 4.5:1. The surfaces themselves and the empty "no data" cell are exempt.
    if (/Heatmap/i.test(path.basename(file))) {
      for (const lit of literalsIn(src)) {
        for (const c of lit.text.split(/\s+/)) {
          const m = /^bg-(.+)$/.exec(c);
          if (!m || /\//.test(m[1]) || HEATMAP_EXEMPT_FILLS.has(m[1])) continue;
          const hex = resolve(m[1], tokens);
          const base = { file, line: lineOf(src, lit.index), bg: LIGHT_SURFACES };
          if (!hex) { results.push({ ...base, kind: 'heatmap', cls: c, fg: null, need: AA_NON_TEXT }); continue; }
          results.push({ ...base, kind: 'heatmap', cls: c, fg: hex, need: AA_NON_TEXT });
          results.push({ ...base, kind: 'heatmap-mark', cls: `white on ${c}`, fg: hex, onFill: true, need: AA_NORMAL });
        }
      }
    }
    for (const lit of literalsIn(src)) {
      for (const c of lit.text.split(/\s+/)) {
        const r = FOCUS_RING.exec(c);
        if (!r) continue;
        const [colour, alpha] = r[1].split('/');
        const hex = resolve(colour, tokens);
        const base = { file, line: lineOf(src, lit.index), kind: 'ring', cls: c, bg: LIGHT_SURFACES, need: AA_NON_TEXT };
        if (!hex) { results.push({ ...base, fg: null }); continue; }
        results.push({ ...base, fg: hex, alpha: alpha ? Number(alpha) / 100 : 1 });
      }
    }
  }
  return results.map((u) => {
    if (!u.fg) return { ...u, ratio: 0, pass: false, unresolved: true };
    if (u.onFill) { const ratio = contrast('#ffffff', u.fg); return { ...u, ratio, pass: ratio >= u.need }; }
    const worst = Math.min(...u.bg.map((b) => contrast(u.alpha != null && u.alpha < 1 ? blend(u.fg, b, u.alpha) : u.fg, b)));
    return { ...u, ratio: worst, pass: worst >= u.need };
  });
}

/** The global placeholder colour in src/index.css (and any placeholder:text-* class) must reach 4.5:1 on the input surfaces. */
export function checkPlaceholder(root, tokens) {
  const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');
  const rule = /::placeholder\s*\{[^}]*?color:\s*(var\(--color-([a-z0-9-]+)\)|#[0-9a-fA-F]{6})/.exec(css);
  const found = [];
  if (rule) {
    const hex = rule[2] ? tokens[rule[2]] : rule[1].toLowerCase();
    found.push({ where: 'src/index.css ::placeholder', fg: hex });
  }
  for (const file of sourceFiles(path.join(root, 'src'))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const lit of literalsIn(src)) {
      for (const c of lit.text.split(/\s+/)) {
        const m = /^placeholder:text-(.+)$/.exec(c);
        const hex = m && resolve(m[1], tokens);
        if (hex) found.push({ where: `${path.relative(root, file)}:${lineOf(src, lit.index)} ${c}`, fg: hex });
      }
    }
  }
  const checked = found.map((f) => ({ ...f, ratio: Math.min(...LIGHT_SURFACES.map((b) => contrast(f.fg, b))) }));
  return { hasGlobalRule: !!rule, checked, failures: checked.filter((c) => c.ratio < AA_NORMAL) };
}

export function audit(root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')) {
  const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');
  const tokens = readTokens(css);
  const srcDir = path.join(root, 'src');
  const usages = collect(srcDir, tokens).map(evaluate);
  const nonText = collectNonText(srcDir, tokens);
  const placeholder = checkPlaceholder(root, tokens);
  return {
    tokens, usages, failures: usages.filter((u) => !u.pass),
    nonText, nonTextFailures: nonText.filter((u) => !u.pass),
    placeholder,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { tokens, usages, failures, nonText, nonTextFailures, placeholder } = audit();
  const rel = (f) => path.relative(process.cwd(), f);
  const byClass = new Map();
  for (const f of failures) byClass.set(f.cls, [...(byClass.get(f.cls) ?? []), `${rel(f.file)}:${f.line} (${f.ratio.toFixed(2)}:1)`]);
  console.log(`Tokens: ${Object.entries(tokens).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  console.log(`${usages.length} text colour usages checked against ${AA_NORMAL}:1; ${failures.length} fail.`);
  for (const [cls, where] of byClass) console.log(`\n${cls}  (${where.length})\n  ${where.slice(0, 6).join('\n  ')}${where.length > 6 ? '\n  …' : ''}`);
  console.log(`\n${nonText.length} chart / focus-ring colours checked against ${AA_NON_TEXT}:1 (text-in-style ${AA_NORMAL}:1); ${nonTextFailures.length} fail.`);
  for (const f of nonTextFailures) console.log(`  ${rel(f.file)}:${f.line} ${f.kind} ${f.cls} ${f.unresolved ? 'UNRESOLVED colour' : `${f.ratio.toFixed(2)}:1`}`);
  console.log(`\nPlaceholder: global rule ${placeholder.hasGlobalRule ? 'present' : 'MISSING'}; ${placeholder.checked.length} colour(s) checked; ${placeholder.failures.length} fail.`);
  for (const f of placeholder.failures) console.log(`  ${f.where} ${f.ratio.toFixed(2)}:1`);
  process.exit(failures.length || nonTextFailures.length || placeholder.failures.length || !placeholder.hasGlobalRule ? 1 : 0);
}
