import { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { useStore } from '../store/useStore';
import { getWeightUnit, lbsToDisplay } from '../lib/units';

export type TimeframeOption = '2 weeks' | '1 month' | '3 months' | '6 months' | '1 year' | 'All time';

interface Props {
  className?: string;
  onOpenInfo?: () => void;
}

// Dose color badge resolver
function getDoseBadgeColor(amountMg: number): { bg: string; text: string; dotColor: string } {
  if (amountMg <= 2.5) return { bg: '#64748b', text: '#ffffff', dotColor: '#64748b' };
  if (amountMg <= 3.5) return { bg: '#1d5aa6', text: '#ffffff', dotColor: '#1d5aa6' };
  if (amountMg <= 5.0) return { bg: '#164a8a', text: '#ffffff', dotColor: '#164a8a' };
  if (amountMg <= 6.0) return { bg: '#0d9488', text: '#ffffff', dotColor: '#0d9488' };
  if (amountMg <= 7.5) return { bg: '#f43f5e', text: '#ffffff', dotColor: '#f43f5e' };
  if (amountMg <= 10.0) return { bg: '#059669', text: '#ffffff', dotColor: '#059669' };
  return { bg: '#db2777', text: '#ffffff', dotColor: '#db2777' };
}

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

    const badgeInfo = getDoseBadgeColor(payload.doseAmountMg);
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

  return (
    <div className={`bg-white rounded-[var(--radius-panel)] p-6 border border-line ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold text-ink tracking-tight">View progress</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <h4 className="text-lg font-semibold text-ink">Weight</h4>
            {chartData.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-sunken text-muted">
                Latest: {chartData[chartData.length - 1].weight} {chartData[0]?.unitLabel}
              </span>
            )}
          </div>
        </div>

        {/* TOP RIGHT CONTROLS: Show/Hide Shots & Info */}
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-muted mr-2">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#0284c7] inline-block" />
              Weight
            </span>
            {showShots && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] inline-block" />
                Shots
              </span>
            )}
          </div>

          <button
            aria-pressed={showShots}
            onClick={() => setShowShots(!showShots)}
            className={`px-4 py-1.5 rounded-[var(--radius-control)] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              showShots
                ? 'bg-brand text-white hover:bg-brand-strong'
                : 'bg-sunken text-ink-2 hover:bg-line border border-line'
            }`}
          >
            {showShots ? 'Hide shots' : 'Show shots'}
          </button>

          {onOpenInfo && (
            <button
              type="button"
              onClick={onOpenInfo}
              aria-label="Weight and shot correlation details"
              className="text-subtle hover:text-brand transition-colors p-1.5 rounded-full hover:bg-sunken cursor-pointer"
            >
              <Info className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* CHART CANVAS */}
      <div className="h-[300px] w-full relative">
        {chartData.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-muted text-center px-6 z-10">No weigh-ins yet. Record a weight to see your progress here.</p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 35, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="dateStr"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
              dy={10}
              minTickGap={25}
            />
            <YAxis
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
              tickFormatter={(val) => `${val} ${unit}`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                padding: '12px 16px'
              }}
              formatter={(val, _name, item) => {
                const p = item.payload as ChartPoint;
                const weightStr = `${val} ${p.unitLabel}`;
                if (p.hasDose) {
                  return [
                    <div>
                      <div className="font-semibold text-ink">{weightStr}</div>
                      <div className="text-xs text-brand font-semibold mt-1 flex items-center gap-1">
                        💉 Shot logged: {p.doseAmountMg} mg ({p.medication}) {p.site ? `• ${p.site}` : ''}
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
              stroke="#0284c7"
              strokeWidth={2.5}
              dot={renderCustomDot}
              activeDot={{ r: 6, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* MINI TIMELINE NAVIGATOR / MINIMAP BAR (Matching image design) */}
      <div className="mt-2 w-full h-4 bg-line/70 rounded-full overflow-hidden relative">
        <div
          className="h-full bg-brand/30 transition-all duration-300 rounded-full"
          style={{
            width: timeframe === '2 weeks' ? '20%' : timeframe === '1 month' ? '35%' : timeframe === '3 months' ? '55%' : timeframe === '6 months' ? '75%' : timeframe === '1 year' ? '90%' : '100%',
            marginLeft: timeframe === '2 weeks' ? '80%' : timeframe === '1 month' ? '65%' : timeframe === '3 months' ? '45%' : timeframe === '6 months' ? '25%' : timeframe === '1 year' ? '10%' : '0%'
          }}
        />
      </div>

      {/* TIMEFRAME SELECTOR TABS AT BOTTOM (2 weeks, 1 month, 3 months, 6 months, 1 year, All time) */}
      <div className="mt-6 flex justify-center overflow-x-auto pb-1">
        <div className="flex bg-sunken/90 p-1.5 rounded-[var(--radius-control)] border border-line/80 text-xs font-semibold gap-1">
          {(['2 weeks', '1 month', '3 months', '6 months', '1 year', 'All time'] as const).map((t) => (
            <button
              key={t}
              aria-pressed={timeframe === t}
              onClick={() => setTimeframe(t)}
              className={`px-4 py-2 rounded-[var(--radius-control)] transition-all cursor-pointer whitespace-nowrap ${
                timeframe === t
                  ? 'bg-brand text-white '
                  : 'text-muted hover:text-ink hover:bg-line/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
