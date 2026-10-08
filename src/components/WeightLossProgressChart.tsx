import { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { useStore } from '../store/useStore';
import { getWeightUnit, lbsToDisplay } from '../lib/units';
import { choiceClass, Panel, Segmented } from './ds';

export type TimeframeOption = '2 weeks' | '1 month' | '3 months' | '6 months' | '1 year' | 'All time';

interface Props {
  className?: string;
  onOpenInfo?: () => void;
}

// Dose markers share one colour; the amount is written on each label, so colour never carries meaning alone.
const DOSE_MARK = { bg: '#164a8a', text: '#ffffff', dotColor: '#164a8a' };

interface ChartPoint {
  id: string;
  rawDate: string;
  dateStr: string;
  weightLbs: number;
  weight: number;
  unitLabel: string;
  hasDose: boolean;
  doseAmountMg: number | null;
  medication: string | null;
  site: string | null;
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload: ChartPoint;
}

export function WeightLossProgressChart({ className = '', onOpenInfo }: Props) {
  const { weights, doses, settings } = useStore();
  const unit = getWeightUnit(settings);
  const [showShots, setShowShots] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('All time');

  // Filter weights and map with doses
  const chartData = useMemo(() => {
    if (!weights || weights.length === 0) {
      return [];
    }

    const sortedWeights = [...weights].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const latestDate = new Date(sortedWeights[sortedWeights.length - 1].date);
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

    return filteredWeights.map(w => {
      const wDateStr = format(new Date(w.date), 'yyyy-MM-dd');
      // Check if there was a dose on or near this date (same day or within 1 day)
      const matchingDose = doses.find(d => {
        const dDateStr = format(new Date(d.date), 'yyyy-MM-dd');
        return dDateStr === wDateStr;
      });

      return {
        id: w.id,
        rawDate: w.date,
        dateStr: format(new Date(w.date), 'MMM d'),
        weightLbs: w.weightLbs,
        weight: lbsToDisplay(w.weightLbs, unit),
        unitLabel: unit,
        hasDose: !!matchingDose,
        doseAmountMg: matchingDose ? matchingDose.amountMg : null,
        medication: matchingDose ? matchingDose.medication || settings.medication : null,
        site: matchingDose ? matchingDose.site : null
      };
    });
  }, [weights, doses, timeframe, unit, settings.medication]);

  // Y-Axis Domain calculation
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [100, 140];
    const vals = chartData.map(d => d.weight);
    const min = Math.floor(Math.min(...vals) - 3);
    const max = Math.ceil(Math.max(...vals) + 3);
    return [min, max];
  }, [chartData]);

  // Custom Dot renderer for rendering dose pill badges directly on the line
  const renderCustomDot = (props: DotProps) => {
    const { cx, cy, payload } = props;
    if (!showShots || !payload.hasDose || payload.doseAmountMg == null || !cx || !cy) {
      return <circle key={`dot-blank-${props.index}`} cx={cx} cy={cy} r={0} />;
    }

    const badgeInfo = DOSE_MARK;
    const badgeText = `${payload.doseAmountMg} mg`;
    const rectWidth = badgeText.length * 7 + 14;

    return (
      <g key={`shot-dot-${props.index}`}>
        {/* Connection line & Pulsing shot dot on weight line */}
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={badgeInfo.dotColor}
          stroke="#ffffff"
          strokeWidth={2}
          className=""
        />

        {/* Pill Badge floating above the dot */}
        <g transform={`translate(${cx - rectWidth / 2}, ${cy - 28})`}>
          <rect
            x={0}
            y={0}
            width={rectWidth}
            height={20}
            rx={6}
            ry={6}
            fill={badgeInfo.bg}
            className=""
          />
          <text
            x={rectWidth / 2}
            y={13}
            textAnchor="middle"
            fill={badgeInfo.text}
            fontSize={11}
            fontWeight={700}
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {badgeText}
          </text>
        </g>
      </g>
    );
  };

  const latest = chartData[chartData.length - 1];

  return (
    <Panel
      className={className}
      title="Weight and doses"
      description={latest ? `Latest: ${latest.weight} ${latest.unitLabel}. Labels mark days with a recorded dose.` : 'Your weigh-ins, with the days you recorded a dose.'}
      action={
        <div className="flex items-center gap-1">
          <button type="button" aria-pressed={showShots} onClick={() => setShowShots(!showShots)} className={choiceClass(showShots, 'text-[13px]')}>
            Show doses
          </button>
          {onOpenInfo && (
            <button
              type="button"
              onClick={onOpenInfo}
              aria-label="Weight and shot correlation details"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-sunken hover:text-ink"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      }
    >
      <Segmented
        label="Timeframe"
        value={timeframe}
        onChange={setTimeframe}
        options={(['2 weeks', '1 month', '3 months', '6 months', '1 year', 'All time'] as const).map((t) => ({ value: t, label: t }))}
        className="mb-4"
      />
      {/* CHART CANVAS */}
      <div className="h-[300px] w-full relative">
        {chartData.length === 0 && (
          <p className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-muted">No weigh-ins yet. Record a weight to see your progress here.</p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 35, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e8ef" />
            <XAxis
              dataKey="dateStr"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#4f5d70' }}
              dy={10}
              minTickGap={25}
            />
            <YAxis
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#4f5d70' }}
              tickFormatter={(val) => `${val} ${unit}`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #7b8a9c',
                boxShadow: 'none',
                padding: '10px 12px'
              }}
              formatter={(val, _name, item) => {
                const p = item.payload as ChartPoint;
                const weightStr = `${val} ${p.unitLabel}`;
                if (p.hasDose) {
                  return [
                    <div>
                      <div className="font-semibold text-ink">{weightStr}</div>
                      <div className="mt-1 text-[13px] font-semibold text-brand">
                        Dose recorded: {p.doseAmountMg} mg ({p.medication}) {p.site ? `• ${p.site}` : ''}
                      </div>
                    </div>,
                    'Entry'
                  ];
                }
                return [weightStr, 'Weight'];
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#1d5aa6"
              strokeWidth={2.5}
              dot={renderCustomDot}
              activeDot={{ r: 6, fill: '#1d5aa6', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </Panel>
  );
}
