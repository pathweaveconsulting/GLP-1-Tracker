import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { audit, contrast, collect, collectNonText, checkPlaceholder, evaluate, readTokens, AA_NORMAL, AA_NON_TEXT, LIGHT_SURFACES } from '../../scripts/contrast.mjs';

type Usage = { file: string; line: number; cls: string; ratio: number };

describe('F11: text colour contrast (WCAG AA 4.5:1)', () => {
  const { tokens, usages, failures } = audit() as unknown as { tokens: Record<string, string>; usages: unknown[]; failures: Usage[] };

  it('every text colour token reaches 4.5:1 on white and on the other light surfaces', () => {
    const textTokens = ['muted', 'subtle', 'positive', 'caution', 'danger', 'accent', 'info'];
    for (const name of textTokens) {
      expect(tokens[name], `token ${name} is defined in src/index.css`).toBeTruthy();
      for (const bg of LIGHT_SURFACES as string[]) expect(contrast(tokens[name], bg), `${name} on ${bg}`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it('the colours that used to fail are gone from text usage', () => {
    for (const [oldHex, ratio] of [['#98a2b3', 2.58], ['#22c55e', 2.28], ['#f59e0b', 2.15]] as const) {
      expect(contrast(oldHex, '#ffffff')).toBeLessThan(AA_NORMAL); // sanity: these really were failing
      expect(ratio).toBeLessThan(AA_NORMAL);
    }
    const banned = failures.filter((f) => /#98A2B3|#22C55E|#F59E0B|#16A34A|#D0D5DD/i.test(f.cls));
    expect(banned).toEqual([]);
  });

  it('no text colour class or chart label colour in src fails AA against its background', () => {
    expect(usages.length).toBeGreaterThan(300); // the scan really found the app's classes
    expect(failures.map((f) => `${f.file}:${f.line} ${f.cls} ${f.ratio.toFixed(2)}`)).toEqual([]);
  });

  it('would catch a regression: the old light grey fails the audit rule', () => {
    expect(contrast('#98A2B3', '#F8F9FC')).toBeLessThan(AA_NORMAL);
  });
});


type NonText = { file: string; line: number; kind: string; cls: string; ratio: number; unresolved?: boolean };

describe('R6/R7: chart colours, focus rings, placeholders and text on tinted parents', () => {
  const real = audit() as unknown as { nonText: NonText[]; nonTextFailures: NonText[]; placeholder: { hasGlobalRule: boolean; failures: unknown[]; checked: unknown[] } };

  it('every chart stroke/fill/series colour and focus ring in src reaches 3:1 (text-in-style 4.5:1)', () => {
    expect(real.nonText.length).toBeGreaterThan(50); // the scan really found the charts and rings
    expect(real.nonText.some((u) => u.kind === 'ring')).toBe(true);
    expect(real.nonText.some((u) => u.kind === 'chart')).toBe(true);
    expect(real.nonTextFailures.map((f) => `${f.file}:${f.line} ${f.kind} ${f.cls} ${f.unresolved ? 'UNRESOLVED' : f.ratio.toFixed(2)}`)).toEqual([]);
  });

  it('placeholder text has a global colour that reaches 4.5:1', () => {
    expect(real.placeholder.hasGlobalRule).toBe(true);
    expect(real.placeholder.checked.length).toBeGreaterThan(0);
    expect(real.placeholder.failures).toEqual([]);
  });

  describe('the audit rules themselves (fixtures)', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'contrast-'));
    const src = path.join(root, 'src');
    fs.mkdirSync(src);
    afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
    const css = '@theme { --color-muted: #667085; }\n';
    const write = (name: string, body: string, cssText = css) => {
      for (const f of fs.readdirSync(src)) fs.rmSync(path.join(src, f));
      fs.writeFileSync(path.join(src, name), body);
      fs.writeFileSync(path.join(src, 'index.css'), cssText);
      return readTokens(cssText) as Record<string, string>;
    };

    it('text with no background of its own is checked against the parent element it sits in', () => {
      const tokens = write('a.tsx', 'export const A = () => <div className="bg-purple-100 p-4"><p className="text-muted">hi</p></div>;');
      const used = (collect(src, tokens) as any[]).map(evaluate);
      expect(used).toHaveLength(1);
      expect(used[0].parentBgs).toEqual(['#f3e8ff']);
      expect(used[0].pass).toBe(false); // muted on purple-100 is 4.2:1
      expect(used[0].ratio).toBeLessThan(AA_NORMAL);
    });

    it('a nearer ancestor wins, and light surfaces are used when no ancestor sets a background', () => {
      const tokens = write('b.tsx', 'export const B = () => (<div className="bg-purple-100"><section className="bg-white"><p className="text-muted">hi</p></section></div>);\nexport const C = () => <p className="text-muted">plain</p>;');
      const used = (collect(src, tokens) as any[]).map(evaluate);
      expect(used.map((u) => u.pass)).toEqual([true, true]);
      expect(used[0].parentBgs).toEqual(['#ffffff']);
      expect(used[1].parentBgs).toEqual([]);
    });

    it('light text is checked against a dark parent, and fails on a light one', () => {
      const tokens = write('c.tsx', 'export const D = () => <div className="bg-slate-900"><p className="text-white">ok</p></div>;\nexport const E = () => <div className="bg-white"><p className="text-white">bad</p></div>;');
      const used = (collect(src, tokens) as any[]).map(evaluate);
      expect(used.map((u) => u.pass)).toEqual([true, false]);
    });

    it('the other half of a template ternary counts as the background', () => {
      const tokens = write('d.tsx', 'export const F = ({ x }: { x: boolean }) => <button className={`text-white ${x ? "bg-rose-600" : "bg-slate-900"}`}>b</button>;');
      const used = (collect(src, tokens) as any[]).map(evaluate);
      expect(used.every((u) => u.pass)).toBe(true);
      expect(used[0].altBgs).toHaveLength(2);
    });

    it('flags a light chart series, ignores gridlines and white outlines, and checks colour arrays', () => {
      const tokens = write('e.tsx', [
        'const PALETTE_COLORS = ["#0f172a", "#cbd5e1"];',
        'export const G = () => (<LineChart>',
        '<CartesianGrid stroke="#f1f5f9" />',
        '<Line stroke="#22c55e" activeDot={{ r: 5, fill: "#15803d", stroke: "#ffffff" }} />',
        '</LineChart>);',
      ].join('\n'));
      const found = (collectNonText(src, tokens) as NonText[]).map((u) => [u.cls, u.ratio >= AA_NON_TEXT]);
      expect(found).toEqual([
        ['PALETTE_COLORS #0f172a', true],
        ['PALETTE_COLORS #cbd5e1', false],
        ['stroke #22c55e', false],
        ['fill #15803d', true],
      ]);
    });

    it('flags a pale focus ring, including one softened by an opacity suffix, and an unknown colour', () => {
      const tokens = write('f.tsx', 'export const H = () => (<><input className="focus:ring-2 focus:ring-amber-500" /><input className="focus:ring-2 focus:ring-purple-700/20" /><input className="focus-visible:ring-purple-700" /><input className="focus:ring-nope-500" /></>);');
      const r = collectNonText(src, tokens) as NonText[];
      expect(r.map((u) => [u.cls, u.unresolved ? 'unresolved' : u.ratio >= AA_NON_TEXT])).toEqual([
        ['focus:ring-amber-500', false],
        ['focus:ring-purple-700/20', false],
        ['focus-visible:ring-purple-700', true],
        ['focus:ring-nope-500', 'unresolved'],
      ]);
    });

    it('placeholder: missing rule, a pale rule and a good rule are told apart', () => {
      const t = write('g.tsx', 'export const I = () => <input placeholder="x" />;');
      expect(checkPlaceholder(root, t).hasGlobalRule).toBe(false);
      write('g.tsx', 'export const I = () => <input placeholder="x" />;', css + '::placeholder { color: #98a2b3; }');
      const pale = checkPlaceholder(root, t);
      expect(pale.hasGlobalRule).toBe(true);
      expect(pale.failures).toHaveLength(1);
      write('g.tsx', 'export const I = () => <input placeholder="x" />;', css + '@layer base { input::placeholder, textarea::placeholder { color: var(--color-muted); opacity: 1; } }');
      const good = checkPlaceholder(root, t);
      expect(good.failures).toEqual([]);
      expect(good.checked).toHaveLength(1);
    });
  });
});
