import { useMemo } from 'react';
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
          weightChangeMap[dStr] = { diffLbs: 0, type: 'neutral' };
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
      activityMap[dStr] = (activityMap[dStr] || 0) + 2; // Injections weigh heavily in activity
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

  // Color mapper for Weight Change Heatmap
  // User instruction: "weight change vs previous day, if is below its green if its above make it red and not orange as shown in the image"
  const getWeightChangeColor = (type?: string, hasLog?: boolean) => {
    switch (type) {
      case 'loss-high':
        return 'bg-[#15803d]'; // Dark green
      case 'loss-low':
        return 'bg-emerald-400'; // Light green
      case 'gain':
        return 'bg-red-500'; // RED (as specifically requested)
      case 'neutral':
        return 'bg-slate-300'; // Neutral grey
      case 'none':
      default:
        return hasLog ? 'bg-slate-300' : 'bg-[#F1F5F9]';
    }
  };

  // Color mapper for Logging Activity Heatmap
  const getActivityColor = (count: number) => {
    if (count === 0) return 'bg-[#F1F5F9]';
    if (count === 1) return 'bg-emerald-200';
    if (count === 2) return 'bg-emerald-400';
    if (count === 3) return 'bg-[#15803d]';
    return 'bg-emerald-800';
  };

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div className={`space-y-8 ${className}`}>
      {/* 1. WEIGHT CHANGE HEATMAP */}
      <div className="bg-white rounded-[24px] p-6 shadow-xs border border-[#E5E7EB]">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#111827] tracking-tight">Weight change</h2>
          <p className="text-xs font-semibold text-muted mt-0.5">Each day vs. previous day</p>
        </div>

        <div className="bg-[#F8F9FC]/60 rounded-[16px] p-6 border border-[#E5E7EB]/70 overflow-x-auto">
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
                      const tooltipText = `${format(day.date, 'MMM d, yyyy')}: ${
                        day.weightChange?.type === 'gain' ? `${formatWeightChange(day.weightChange.diffLbs, unit)} (higher than last weigh-in)`
                        : day.weightChange?.type?.startsWith('loss') ? `${formatWeightChange(day.weightChange.diffLbs, unit)} (lower than last weigh-in)`
                        : day.hasWeightLog ? 'No net change' : 'No weight log'
                      }`;

                      return (
                        <div
                          key={day.dateStr}
                          title={tooltipText}
                          className={`w-6 h-6 rounded-md transition-all cursor-pointer ${colorClass} hover:ring-2 hover:ring-purple-400 hover:scale-105`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend Footer (Loss green squares -> neutral grey -> Gain RED square) */}
            <div className="mt-6 flex items-center gap-3 text-xs font-semibold text-muted select-none">
              <span>Loss</span>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-sm bg-[#15803d] inline-block" title="Significant Loss" />
                <span className="w-4 h-4 rounded-sm bg-emerald-400 inline-block" title="Moderate Loss" />
                <span className="w-4 h-4 rounded-sm bg-slate-300 inline-block" title="No Change / Logged" />
                <span className="w-4 h-4 rounded-sm bg-red-500 inline-block" title="Weight Gain (Red)" />
              </div>
              <span>Gain</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LOGGING ACTIVITY HEATMAP */}
      <div className="bg-white rounded-[24px] p-6 shadow-xs border border-[#E5E7EB]">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#111827] tracking-tight">Logging activity</h2>
          <p className="text-xs font-semibold text-muted mt-0.5">Each cell is one day. Stronger color means more was logged.</p>
        </div>

        <div className="bg-[#F8F9FC]/60 rounded-[16px] p-6 border border-[#E5E7EB]/70 overflow-x-auto">
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
                      const tooltipText = `${format(day.date, 'MMM d, yyyy')}: ${day.activityCount} log entry/entries recorded`;

                      return (
                        <div
                          key={`act-${day.dateStr}`}
                          title={tooltipText}
                          className={`w-6 h-6 rounded-md transition-all cursor-pointer ${colorClass} hover:ring-2 hover:ring-purple-400 hover:scale-105`}
                        />
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
                <span className="w-4 h-4 rounded-sm bg-[#F1F5F9] border border-[#E5E7EB] inline-block" title="0 logs" />
                <span className="w-4 h-4 rounded-sm bg-emerald-200 inline-block" title="1 log" />
                <span className="w-4 h-4 rounded-sm bg-emerald-400 inline-block" title="2 logs" />
                <span className="w-4 h-4 rounded-sm bg-[#15803d] inline-block" title="3 logs" />
                <span className="w-4 h-4 rounded-sm bg-emerald-800 inline-block" title="4+ logs" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
