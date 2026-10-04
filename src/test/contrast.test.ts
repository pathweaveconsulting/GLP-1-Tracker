import { describe, it, expect } from 'vitest';
import { audit, contrast, AA_NORMAL, LIGHT_SURFACES } from '../../scripts/contrast.mjs';

type Usage = { file: string; line: number; cls: string; ratio: number };

describe('F11: text colour contrast (WCAG AA 4.5:1)', () => {
  const { tokens, usages, failures } = audit() as { tokens: Record<string, string>; usages: unknown[]; failures: Usage[] };

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
