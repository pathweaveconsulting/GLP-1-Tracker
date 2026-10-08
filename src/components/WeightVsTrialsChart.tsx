import { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { subDays, subMonths, subYears, differenceInDays } from 'date-fns';
import { useStore } from '../store/useStore';
import { getWeightUnit, lbsToDisplay } from '../lib/units';
import { Modal } from './ui/Modal';
import { TRIAL_CURVES, type DrugOption } from '../lib/trialCurves';

export type TimeframeOption = '2 weeks' | '1 month' | '3 months' | '6 months' | '1 year' | 'All time';

interface Props {
  className?: string;
  onOpenInfo?: () => void;
}

export function WeightVsTrialsChart({ className = '', onOpenInfo }: Props) {
  const { weights, settings } = useStore();
  const unit = getWeightUnit(settings);
  const [isPercentMode, setIsPercentMode] = useState(true);
  const [selectedDrug, setSelectedDrug] = useState<DrugOption>('Retatrutide');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('All time');
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Compute trial comparison data points
  const chartData = useMemo(() => {
    if (!weights || weights.length === 0) return [];

    const sortedWeights = [...weights].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstDate = new Date(sortedWeights[0].date);
    const latestDate = new Date(sortedWeights[sortedWeights.length - 1].date);
    const startingWeightLbs = settings.startingWeight || sortedWeights[0].weightLbs;

    // Determine filter start limit
    let startDateLimit: Date | null = null;
    switch (timeframe) {
      case '2 weeks':
        startDateLimit = subDays(latestDate, 14);
        break;
      case '1 month':
        startDateLimit = subMonths(latestDate, 1);
        break;
      case '3 months':
        startDateLimit = subMonths(latestDate, 3);
        break;
      case '6 months':
        startDateLimit = subMonths(latestDate, 6);
        break;
      case '1 year':
        startDateLimit = subYears(latestDate, 1);
        break;
      case 'All time':
      default:
        startDateLimit = null;
        break;
    }

    const filteredWeights = startDateLimit
      ? sortedWeights.filter(w => new Date(w.date) >= startDateLimit!)
      : sortedWeights;

    const drugConfig = TRIAL_CURVES[selectedDrug];

    return filteredWeights.map(w => {
      const currentDate = new Date(w.date);
      const daysElapsed = Math.max(0, differenceInDays(currentDate, firstDate));

      const startWeight = lbsToDisplay(startingWeightLbs, unit);
      const currentVal = lbsToDisplay(w.weightLbs, unit);

      const percentChange = parseFloat((((w.weightLbs - startingWeightLbs) / startingWeightLbs) * 100).toFixed(1));

      const trialPkt = drugConfig.getExpectedPercentLoss(daysElapsed);

      if (isPercentMode) {
        return {
          days: daysElapsed,
          daysLabel: `${daysElapsed} d`,
          userWeight: percentChange,
          trialAvg: parseFloat(trialPkt.avg.toFixed(1)),
          unitLabel: '%'
        };
      } else {
        // Absolute weight mode
        const trialAvgWeight = parseFloat((startWeight * (1 + trialPkt.avg / 100)).toFixed(1));

        return {
          days: daysElapsed,
          daysLabel: `${daysElapsed} d`,
          userWeight: currentVal,
          trialAvg: trialAvgWeight,
          unitLabel: unit
        };
      }
    });
  }, [weights, settings.startingWeight, unit, isPercentMode, selectedDrug, timeframe]);

  // Compute dynamic Y domain so chart fits bounds tightly in absolute or % mode
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto'];
    const allVals: number[] = [];
    chartData.forEach(d => {
      if (typeof d.userWeight === 'number' && !isNaN(d.userWeight)) allVals.push(d.userWeight);
      if (typeof d.trialAvg === 'number' && !isNaN(d.trialAvg)) allVals.push(d.trialAvg);
    });
    if (allVals.length === 0) return ['auto', 'auto'];

    const min = Math.floor(Math.min(...allVals));
    const max = Math.ceil(Math.max(...allVals));
    const padding = Math.max(2, Math.round((max - min) * 0.08));

    return [min - padding, max + padding];
  }, [chartData]);

  const drugConfig = TRIAL_CURVES[selectedDrug];

  return (
    <div className={`bg-white rounded-[24px] p-6 shadow-xs border border-line ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-xl font-semibold text-ink tracking-tight">Weight vs trials</h3>
          <p className="text-xs text-muted mt-1 max-w-xl">
            Illustrative reference curves shaped around published average results, not a forecast for you. Trial participants, doses and support differ from real life, so your own line may sit anywhere around them.
          </p>
        </div>

        {/* TOP CONTROLS: % Toggle, Drug Dropdown & Info Icon */}
        <div className="flex items-center gap-3">
          {/* Percentage / Absolute Mode Switch */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={isPercentMode}
              aria-label="Show percent change"
              onClick={() => setIsPercentMode(!isPercentMode)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                isPercentMode ? 'bg-brand' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isPercentMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm font-semibold text-ink-2">%</span>
          </div>

          {/* Drug Selection Dropdown */}
          <select
            aria-label="Reference trial"
            value={selectedDrug}
            onChange={(e) => setSelectedDrug(e.target.value as DrugOption)}
            className="bg-sunken hover:bg-line/80 border border-line text-ink text-xs font-semibold py-1.5 px-3 rounded-[16px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand transition-all"
          >
            <option value="Retatrutide">Retatrutide</option>
            <option value="Tirzepatide">Tirzepatide</option>
            <option value="Semaglutide">Semaglutide</option>
          </select>

          {/* Info Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenInfo) onOpenInfo();
              else setShowInfoModal(true);
            }}
            className="text-subtle hover:text-brand transition-colors p-1.5 rounded-full hover:bg-sunken cursor-pointer"
            aria-label="About the trial reference curves"
          >
            <Info className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* LEGEND SECTION */}
      <div className="flex justify-end items-center gap-4 text-xs font-semibold text-muted mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="w-4 h-0 border-t-[3px] border-dashed inline-block" style={{ borderColor: drugConfig.color }}
            data-testid="reference-swatch"
          />
          <span>Illustrative reference interpolation ({selectedDrug})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-slate-800 inline-block" />
          <span>Your weight</span>
        </div>
      </div>

      {/* CHART CANVAS */}
      <div className="h-[300px] w-full relative">
        <div className="absolute top-2 right-4 text-subtle font-medium text-xs pointer-events-none select-none opacity-60">
          days
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="daysLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
              dy={10}
            />
            <YAxis
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
              tickFormatter={(val) => isPercentMode ? `${val}%` : `${val} ${chartData[0]?.unitLabel || ''}`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                padding: '12px 16px'
              }}
              formatter={(val, name) => [
                isPercentMode ? `${val}%` : `${val} ${chartData[0]?.unitLabel || ''}`,
                String(name) === 'userWeight' ? 'Your Weight' : `Illustrative reference (${selectedDrug})`
              ]}
              labelFormatter={(label) => `Duration: ${label}`}
            />

            {/* Illustrative reference line (interpolated between approximate published endpoints; dashed so it never reads as data) */}
            <Line
              type="monotone"
              dataKey="trialAvg"
              name="Illustrative reference interpolation"
              strokeDasharray="7 4"
              stroke={drugConfig.color}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />

            {/* User weight line */}
            <Line
              type="monotone"
              dataKey="userWeight"
              name="userWeight"
              stroke="#1e293b"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#1e293b', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* TIMEFRAME SELECTOR TABS AT BOTTOM (2 weeks, 1 month, 3 months, 6 months, 1 year, All time) */}
      <div className="mt-6 flex justify-center overflow-x-auto pb-1">
        <div className="flex bg-sunken/90 p-1.5 rounded-[16px] border border-line/80 text-xs font-semibold gap-1">
          {(['2 weeks', '1 month', '3 months', '6 months', '1 year', 'All time'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={timeframe === t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-2 rounded-[16px] transition-all cursor-pointer whitespace-nowrap ${
                timeframe === t
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-muted hover:text-ink hover:bg-line/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Modal open={showInfoModal} onClose={() => setShowInfoModal(false)} title="About the reference curves" widthClass="max-w-lg">
        <div className="space-y-3">
          <p className="text-xs text-muted leading-relaxed">
            The curves are drawn between approximate average results reported by these trials. The shape between those points is an interpolation, not trial data, and trial participants received structured support that real life rarely matches. Your own line may sit anywhere around them. Please don't read it as a target or a forecast.
          </p>
          <ul className="text-xs space-y-2 text-ink-2 font-medium">
            <li className="p-2.5 rounded-[16px] bg-emerald-50 text-emerald-900 border border-emerald-100">
              <strong>Retatrutide (phase 2 trial, investigational):</strong> average loss of about 24% at 48 weeks at the highest dose studied.
            </li>
            <li className="p-2.5 rounded-[16px] bg-sky-50 text-sky-900 border border-sky-100">
              <strong>Tirzepatide (SURMOUNT-1):</strong> average loss of about 21% at 72 weeks at the highest dose.
            </li>
            <li className="p-2.5 rounded-[16px] bg-indigo-50 text-indigo-900 border border-indigo-100">
              <strong>Semaglutide (STEP 1):</strong> average loss of about 15% at 68 weeks at 2.4 mg.
            </li>
          </ul>
          <p className="text-[11px] text-subtle">Approximate; verify against the published trial reports. Curves stop changing at the published endpoint; they do not predict later loss. Sources: NEJM doi:10.1056/NEJMoa2301972 (retatrutide), doi:10.1056/NEJMoa2206038 (SURMOUNT-1), doi:10.1056/NEJMoa2032183 (STEP 1).</p>
          <button type="button" onClick={() => setShowInfoModal(false)} className="w-full py-2.5 rounded-[16px] bg-brand text-white font-semibold text-xs hover:bg-brand-strong transition-all">Close</button>
        </div>
      </Modal>
    </div>
  );
}
