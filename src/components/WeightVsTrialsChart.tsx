import { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { subDays, subMonths, subYears, differenceInDays } from 'date-fns';
import { useStore } from '../store/useStore';
import { getWeightUnit, lbsToDisplay } from '../lib/units';
import { Modal } from './ui/Modal';
import { buttonClass, inputClass, Panel, Segmented } from './ds';
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
    <Panel
      className={className}
      title="Weight vs trials"
      description="Illustrative reference curves shaped around published average results, not a forecast for you. Trial participants, doses and support differ from real life, so your own line may sit anywhere around them."
      action={
        <button
          type="button"
          onClick={() => {
            if (onOpenInfo) onOpenInfo();
            else setShowInfoModal(true);
          }}
          className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-sunken hover:text-ink"
          aria-label="About the trial reference curves"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          aria-label="Reference trial"
          value={selectedDrug}
          onChange={(e) => setSelectedDrug(e.target.value as DrugOption)}
          className={inputClass('max-w-xs text-sm')}
        >
          <option value="Retatrutide">Retatrutide</option>
          <option value="Tirzepatide">Tirzepatide</option>
          <option value="Semaglutide">Semaglutide</option>
        </select>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-ink-2">
          <input
            type="checkbox"
            role="switch"
            aria-checked={isPercentMode}
            checked={isPercentMode}
            onChange={() => setIsPercentMode(!isPercentMode)}
            className="h-5 w-5 accent-brand"
          />
          Show percent change
        </label>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-2">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-0 w-5 border-t-[3px] border-dashed" style={{ borderColor: drugConfig.color }}
            data-testid="reference-swatch"
          />
          <span>Illustrative reference interpolation ({selectedDrug})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-ink" />
          <span>Your weight</span>
        </div>
      </div>

      {/* CHART CANVAS */}
      <div className="h-[300px] w-full relative">
        <div className="pointer-events-none absolute right-4 top-2 select-none text-xs text-muted">
          days
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e8ef" />
            <XAxis
              dataKey="daysLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#4f5d70' }}
              dy={10}
            />
            <YAxis
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#4f5d70' }}
              tickFormatter={(val) => isPercentMode ? `${val}%` : `${val} ${chartData[0]?.unitLabel || ''}`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #7b8a9c',
                boxShadow: 'none',
                padding: '10px 12px'
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
              stroke="#0f1f33"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#0f1f33', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <Segmented
        label="Timeframe"
        value={timeframe}
        onChange={setTimeframe}
        options={(['2 weeks', '1 month', '3 months', '6 months', '1 year', 'All time'] as const).map((t) => ({ value: t, label: t }))}
        className="mt-4"
      />

      <Modal open={showInfoModal} onClose={() => setShowInfoModal(false)} title="About the reference curves" widthClass="max-w-lg">
        <div className="space-y-3">
          <p className="text-sm leading-6 text-muted">
            The curves are drawn between approximate average results reported by these trials. The shape between those points is an interpolation, not trial data, and trial participants received structured support that real life rarely matches. Your own line may sit anywhere around them. Please don't read it as a target or a forecast.
          </p>
          <ul className="text-sm text-ink-2">
            <li className="border-b border-line py-2">
              <strong>Retatrutide (phase 2 trial, investigational):</strong> average loss of about 24% at 48 weeks at the highest dose studied.
            </li>
            <li className="border-b border-line py-2">
              <strong>Tirzepatide (SURMOUNT-1):</strong> average loss of about 21% at 72 weeks at the highest dose.
            </li>
            <li className="border-b border-line py-2">
              <strong>Semaglutide (STEP 1):</strong> average loss of about 15% at 68 weeks at 2.4 mg.
            </li>
          </ul>
          <p className="text-[13px] text-muted">Approximate; verify against the published trial reports. Curves stop changing at the published endpoint; they do not predict later loss. Sources: NEJM doi:10.1056/NEJMoa2301972 (retatrutide), doi:10.1056/NEJMoa2206038 (SURMOUNT-1), doi:10.1056/NEJMoa2032183 (STEP 1).</p>
          <button type="button" onClick={() => setShowInfoModal(false)} className={buttonClass('secondary', 'md', 'w-full sm:w-auto')}>Close</button>
        </div>
      </Modal>
    </Panel>
  );
}
