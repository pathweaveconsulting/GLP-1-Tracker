import { describe, it, expect } from 'vitest';
import * as insights from './insights';

describe('F6: no export that nothing outside its own module uses', () => {
  it('insights does not export MIN_RATE_DISTINCT_DAYS (it is internal to weeklyRate)', () => {
    expect(Object.keys(insights)).not.toContain('MIN_RATE_DISTINCT_DAYS');
  });
  it('the weeklyRate behaviour that constant controls is unchanged: 3 rows on 2 days give no rate', () => {
    const at = (d: number, h: number) => new Date(2026, 5, 15 - d, h).toISOString();
    const w = (d: number, h: number, y: number) => ({ id: `${d}-${h}`, date: at(d, h), weightLbs: y });
    expect(insights.weeklyRate([w(14, 8, 200), w(0, 8, 198), w(0, 18, 197)], new Date(2026, 5, 15, 20))).toBeNull();
  });
});
