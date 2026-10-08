import { useId, useMemo } from 'react';
import { 
  format, subDays, startOfWeek, addDays 
} from 'date-fns';
import { useStore } from '../store/useStore';
import { formatWeightChange, getWeightUnit } from '../lib/units';

interface Props {
  className?: string;
}

export function AnalyticsHeatmaps({ className = '' }: Props) {
  const { weights, doses, effects, settings } = useStore();
  const unit = getWeightUnit(settings);

  // Generate calendar grid for the past ~16 weeks (approx 112 days) up to today
  const calendarData = useMemo(() => {
    const today = new Date();
    // End grid on the coming Saturday so grid fits complete weeks
    const endGridDate = addDays(startOfWeek(today, { weekStartsOn: 1 }), 6); // end of current week (Sunday)
    // 16 weeks prior
    const startGridDate = subDays(endGridDate, 16 * 7 - 1);

    // Build map of daily weight changes vs previous recorded weight
    const sortedWeights = [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const weightMap: Record<string, number> = {};
    sortedWeights.forEach(w => {
      const dStr = format(new Date(w.date), 'yyyy-MM-dd');
      weightMap[dStr] = w.weightLbs;
    });

    // Compute previous day comparison for weight change
    const weightChangeMap: Record<string, { diffLbs: number; type: 'loss-high' | 'loss-low' | 'neutral' | 'gain' | 'none' }> = {};
    
    // Sort all dates to track continuous change
    let lastWeight: number | null = null;
    let currDateIter = new Date(startGridDate);
    const maxIterDate = new Date(endGridDate);

    while (currDateIter <= maxIterDate) {
      const dStr = format(currDateIter, 'yyyy-MM-dd');
      if (weightMap[dStr] !== undefined) {
        const currentWeight = weightMap[dStr];
        if (lastWeight !== null) {
          const diff = currentWeight - lastWeight;
          if (diff < -0.6) {
            weightChangeMap[dStr] = { diffLbs: diff, type: 'loss-high' };
          } else if (diff < 0) {
            weightChangeMap[dStr] = { diffLbs: diff, type: 'loss-low' };
          } else if (diff > 0) {
            // RED FOR GAIN as requested by user
            weightChangeMap[dStr] = { diffLbs: diff, type: 'gain' };
          } else {
            weightChangeMap[dStr] = { diffLbs: 0, type: 'neutral' };
          }
        } else {
          // Nothing earlier to compare with: not "no change".
          weightChangeMap[dStr] = { diffLbs: 0, type: 'none' };
        }
        lastWeight = currentWeight;
      } else {
        weightChangeMap[dStr] = { diffLbs: 0, type: 'none' };
      }
      currDateIter = addDays(currDateIter, 1);
    }

    // Build map of daily activity count (logs count)
    const activityMap: Record<string, number> = {};
    weights.forEach(w => {
      const dStr = format(new Date(w.date), 'yyyy-MM-dd');
      activityMap[dStr] = (activityMap[dStr] || 0) + 1;
    });
    doses.forEach(d => {
      const dStr = format(new Date(d.date), 'yyyy-MM-dd');
      activityMap[dStr] = (activityMap[dStr] || 0) + 1; // every recorded entry counts once
    });
    effects.forEach(e => {
      const dStr = format(new Date(e.date), 'yyyy-MM-dd');
      activityMap[dStr] = (activityMap[dStr] || 0) + 1;
    });

    // Structure columns by weeks
    const weeks: Array<{
      weekStartDate: Date;
      monthHeader?: string;
      days: Array<{
        date: Date;
        dateStr: string;
        dayOfWeek: number; // 0=Mon, 6=Sun
        weightChange?: { diffLbs: number; type: string };
        activityCount: number;
        hasWeightLog: boolean;
      }>;
    }> = [];

    let currentWeekStart = startOfWeek(startGridDate, { weekStartsOn: 1 });
    let lastMonthName = '';

    while (currentWeekStart <= endGridDate) {
      const weekDays = [];
      let monthHeaderStr: string | undefined = undefined;

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const dayDate = addDays(currentWeekStart, dayIdx);
        const dateStr = format(dayDate, 'yyyy-MM-dd');
        const monthName = format(dayDate, 'MMM');

        if (monthName !== lastMonthName && dayIdx <= 3) {
          monthHeaderStr = monthName;
          lastMonthName = monthName;
        }

        weekDays.push({
          date: dayDate,
          dateStr,
          dayOfWeek: dayIdx,
          weightChange: weightChangeMap[dateStr],
          activityCount: activityMap[dateStr] || 0,
          hasWeightLog: weightMap[dateStr] !== undefined
        });
      }

      weeks.push({
        weekStartDate: currentWeekStart,
        monthHeader: monthHeaderStr,
        days: weekDays
      });

      currentWeekStart = addDays(currentWeekStart, 7);
    }

    return weeks;
  }, [weights, doses, effects]);

  // Fills are dark enough to meet 3:1 against the card and to carry white marks at 4.5:1 (scripts/contrast.mjs checks
  // every bg-* class in this file). The empty "no data" cell is the only pale fill and carries no meaning.
  const getWeightChangeColor = (type?: string, hasLog?: boolean) => {
    switch (type) {
      case 'loss-high':
        return 'bg-emerald-900'; // lower by more than 0.6 lb than the previous recorded weigh-in
      case 'loss-low':
        return 'bg-emerald-700'; // lower, by a smaller amount
      case 'gain':
        return 'bg-red-700'; // higher
      case 'neutral':
        return 'bg-slate-500'; // unchanged
      case 'none':
      default:
        return hasLog ? 'bg-slate-500' : 'bg-sunken'; // first weigh-in in view / nothing logged
    }
  };

  const getActivityColor = (count: number) => {
    if (count === 0) return 'bg-sunken';
    if (count === 1) return 'bg-emerald-700';
    if (count === 2) return 'bg-emerald-800';
    if (count === 3) return 'bg-emerald-900';
    return 'bg-emerald-950';
  };

  /** The visible mark inside a weight cell, so direction does not depend on colour. */
  const weightMark = (type?: string, hasLog?: boolean) =>
    type === 'gain' ? '▲' : type?.startsWith('loss') ? '▼' : type === 'neutral' ? '=' : hasLog ? '•' : '';

  const entriesText = (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`;
  const weightText = (day: { date: Date; hasWeightLog: boolean; weightChange?: { diffLbs: number; type: string } }) => {
    const t = day.weightChange?.type;
    if (t === 'gain') return `${formatWeightChange(day.weightChange!.diffLbs, unit)} (higher than the previous recorded weigh-in)`;
    if (t?.startsWith('loss')) return `${formatWeightChange(day.weightChange!.diffLbs, unit)} (lower than the previous recorded weigh-in)`;
    if (t === 'neutral') return 'No change from the previous recorded weigh-in';
    return day.hasWeightLog ? 'First weigh-in in this view (no earlier one to compare with)' : 'No weight log';
  };

  // Plain-language versions of both grids, for anyone who can't (or doesn't want to) read colours.
  const allDays = calendarData.flatMap((w) => w.days);
  const weighDays = allDays.filter((d) => d.hasWeightLog);
  const lowerCount = weighDays.filter((d) => d.weightChange?.type.startsWith('loss')).length;
  const higherCount = weighDays.filter((d) => d.weightChange?.type === 'gain').length;
  const loggedDays = allDays.filter((d) => d.activityCount > 0);
  const totalEntries = allDays.reduce((n, d) => n + d.activityCount, 0);
  const weightSummary = weighDays.length === 0
    ? 'No weigh-ins were recorded in the last 16 weeks.'
    : `You recorded ${weighDays.length} ${weighDays.length === 1 ? 'weigh-in' : 'weigh-ins'} in the last 16 weeks; ${lowerCount} lower and ${higherCount} higher than the previous recorded weigh-in.`;
  const activitySummary = totalEntries === 0
    ? 'Nothing was recorded in the last 16 weeks.'
    : `${loggedDays.length} of the last 16 weeks' days have at least one entry, ${entriesText(totalEntries)} in all (weight, dose and symptom logs).`;

  const weightHeadId = useId();
  const weightSumId = useId();
  const actHeadId = useId();
  const actSumId = useId();
  const cellBase = 'w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold leading-none text-white transition-all hover:ring-2 hover:ring-[#7fa3d4] hover:scale-105';
  const swatch = 'w-4 h-4 rounded-sm inline-flex items-center justify-center text-[9px] font-bold leading-none text-white';

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div className={`space-y-8 ${className}`}>
      {/* 1. WEIGHT CHANGE HEATMAP */}
      <div className="bg-white rounded-[24px] p-6 shadow-xs border border-line">
        <div className="mb-4">
          <h2 id={weightHeadId} className="text-xl font-semibold text-ink tracking-tight">Weight change</h2>
          <p className="text-xs font-semibold text-muted mt-0.5">Each weigh-in vs. the previous recorded weigh-in</p>
          <p id={weightSumId} className="text-xs text-muted mt-1">{weightSummary}</p>
        </div>

        <div role="group" aria-labelledby={weightHeadId} aria-describedby={weightSumId} className="bg-canvas/60 rounded-[16px] p-6 border border-line/70 overflow-x-auto">
          {/* Calendar Grid Container */}
          <div className="min-w-[650px]">
            {/* Top Month Header Row */}
            <div className="flex ml-10 mb-2 text-xs font-semibold text-muted">
              {calendarData.map((week, wIdx) => (
                <div key={`m-head-${wIdx}`} className="w-7 text-center">
                  {week.monthHeader || ''}
                </div>
              ))}
            </div>

            {/* Grid Rows (Days of week Mon..Sun) */}
            <div className="flex">
              {/* Day Labels Column */}
              <div className="flex flex-col justify-between w-10 pr-2 py-0.5 text-[11px] font-semibold text-subtle select-none">
                {dayLabels.map((lbl, idx) => (
                  <div key={`lbl-${idx}`} className="h-6 flex items-center">
                    {lbl}
                  </div>
                ))}
              </div>

              {/* Weeks Columns */}
              <div className="flex gap-1.5">
                {calendarData.map((week, wIdx) => (
                  <div key={`w-col-${wIdx}`} className="flex flex-col gap-1.5">
                    {week.days.map((day) => {
                      const colorClass = getWeightChangeColor(day.weightChange?.type, day.hasWeightLog);
                      const tooltipText = `${format(day.date, 'MMM d, yyyy')}: ${weightText(day)}`;

                      return (
                        <div
                          key={day.dateStr}
                          aria-hidden="true"
                          title={tooltipText}
                          className={`${cellBase} ${colorClass}`}
                        >
                          {weightMark(day.weightChange?.type, day.hasWeightLog)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend Footer (Loss green squares -> neutral grey -> Gain RED square) */}
            <div className="mt-6 flex items-center gap-3 text-xs font-semibold text-muted select-none">
              <span>Lower</span>
              <div className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`${swatch} bg-emerald-900`} title="Lower by more than 0.6 lb">▼</span>
                <span aria-hidden="true" className={`${swatch} bg-emerald-700`} title="Lower">▼</span>
                <span aria-hidden="true" className={`${swatch} bg-slate-500`} title="Unchanged (=) or first weigh-in in view (•)">=</span>
                <span aria-hidden="true" className={`${swatch} bg-red-700`} title="Higher">▲</span>
              </div>
              <span>Higher</span>
            </div>
          </div>
        </div>

        <details className="mt-4 text-xs text-muted">
          <summary className="cursor-pointer font-semibold text-ink-2">Show weight change as a table</summary>
          <table className="mt-2 w-full text-left">
            <caption className="sr-only">Weight change per recorded weigh-in</caption>
            <thead><tr><th scope="col" className="py-1 pr-4">Date</th><th scope="col" className="py-1">Change</th></tr></thead>
            <tbody>
              {weighDays.map((d) => (
                <tr key={d.dateStr}><td className="py-0.5 pr-4">{format(d.date, 'MMM d, yyyy')}</td><td>{weightText(d)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      {/* 2. LOGGING ACTIVITY HEATMAP */}
      <div className="bg-white rounded-[24px] p-6 shadow-xs border border-line">
        <div className="mb-4">
          <h2 id={actHeadId} className="text-xl font-semibold text-ink tracking-tight">Logging activity</h2>
          <p className="text-xs font-semibold text-muted mt-0.5">Each cell is one day. The number is how many entries were recorded that day.</p>
          <p id={actSumId} className="text-xs text-muted mt-1">{activitySummary}</p>
        </div>

        <div role="group" aria-labelledby={actHeadId} aria-describedby={actSumId} className="bg-canvas/60 rounded-[16px] p-6 border border-line/70 overflow-x-auto">
          {/* Calendar Grid Container */}
          <div className="min-w-[650px]">
            {/* Top Month Header Row */}
            <div className="flex ml-10 mb-2 text-xs font-semibold text-muted">
              {calendarData.map((week, wIdx) => (
                <div key={`m-act-head-${wIdx}`} className="w-7 text-center">
                  {week.monthHeader || ''}
                </div>
              ))}
            </div>

            {/* Grid Rows (Days of week Mon..Sun) */}
            <div className="flex">
              {/* Day Labels Column */}
              <div className="flex flex-col justify-between w-10 pr-2 py-0.5 text-[11px] font-semibold text-subtle select-none">
                {dayLabels.map((lbl, idx) => (
                  <div key={`lbl-act-${idx}`} className="h-6 flex items-center">
                    {lbl}
                  </div>
                ))}
              </div>

              {/* Weeks Columns */}
              <div className="flex gap-1.5">
                {calendarData.map((week, wIdx) => (
                  <div key={`w-act-col-${wIdx}`} className="flex flex-col gap-1.5">
                    {week.days.map((day) => {
                      const colorClass = getActivityColor(day.activityCount);
                      const tooltipText = `${format(day.date, 'MMM d, yyyy')}: ${entriesText(day.activityCount)} (weight, dose and symptom logs)`;

                      return (
                        <div
                          key={`act-${day.dateStr}`}
                          aria-hidden="true"
                          title={tooltipText}
                          className={`${cellBase} ${colorClass}`}
                        >
                          {day.activityCount > 0 ? (day.activityCount > 3 ? '4+' : day.activityCount) : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend Footer (Less -> 5 green shade squares -> More) */}
            <div className="mt-6 flex items-center gap-3 text-xs font-semibold text-muted select-none">
              <span>Less</span>
              <div className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-4 h-4 rounded-sm bg-sunken border border-line inline-block" title="0 entries" />
                <span aria-hidden="true" className={`${swatch} bg-emerald-700`} title="1 entry">1</span>
                <span aria-hidden="true" className={`${swatch} bg-emerald-800`} title="2 entries">2</span>
                <span aria-hidden="true" className={`${swatch} bg-emerald-900`} title="3 entries">3</span>
                <span aria-hidden="true" className={`${swatch} bg-emerald-950`} title="4 or more entries">4+</span>
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        <details className="mt-4 text-xs text-muted">
          <summary className="cursor-pointer font-semibold text-ink-2">Show logging activity as a table</summary>
          <table className="mt-2 w-full text-left">
            <caption className="sr-only">Logging activity per day</caption>
            <thead><tr><th scope="col" className="py-1 pr-4">Date</th><th scope="col" className="py-1">Entries</th></tr></thead>
            <tbody>
              {loggedDays.map((d) => (
                <tr key={d.dateStr}><td className="py-0.5 pr-4">{format(d.date, 'MMM d, yyyy')}</td><td>{entriesText(d.activityCount)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </div>
  );
}
