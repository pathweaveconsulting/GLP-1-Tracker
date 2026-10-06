export type DrugOption = 'Retatrutide' | 'Tirzepatide' | 'Semaglutide';

// Benchmark curves based on clinical trials (SURMOUNT-1 for Tirzepatide, STEP-1 for Semaglutide, Retatrutide Phase 2 for Retatrutide)
// Approximate; verify against the published trial reports. The curve shapes between the endpoints are an interpolation.
export const TRIAL_CURVES: Record<DrugOption, {
  name: string;
  color: string;
  /** Average only. The earlier min/max band for Retatrutide (0.45x / 1.25x) had no cited source and was removed. */
  getExpectedPercentLoss: (days: number) => { avg: number };
}> = {
  Retatrutide: {
    name: 'Retatrutide Phase 2 Trial (12mg)',
    color: '#047857', // emerald-700
    getExpectedPercentLoss: (days: number) => {
      // 24.2% mean loss at 48 weeks (336 days)
      const t = Math.max(0, Math.min(days / 336, 1));
      const avg = -24.2 * Math.pow(t, 0.7);
      return { avg };
    }
  },
  Tirzepatide: {
    name: 'SURMOUNT-1 Trial (15mg)',
    color: '#0369a1', // Bright blue curve
    getExpectedPercentLoss: (days: number) => {
      // 20.9% mean loss at 72 weeks (504 days)
      const t = Math.max(0, Math.min(days / 504, 1));
      const avg = -20.9 * Math.pow(t, 0.68);
      return { avg };
    }
  },
  Semaglutide: {
    name: 'STEP 1 Trial (2.4mg)',
    color: '#0369a1', // Bright blue curve
    getExpectedPercentLoss: (days: number) => {
      // 14.9% mean loss at 68 weeks (476 days)
      const t = Math.max(0, Math.min(days / 476, 1));
      const avg = -14.9 * Math.pow(t, 0.72);
      return { avg };
    }
  }
};
