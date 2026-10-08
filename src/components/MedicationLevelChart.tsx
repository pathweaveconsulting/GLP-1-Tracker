import { useState } from 'react';
import { Info } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useStore } from '../store/useStore';
import { generatePKCurve } from '../lib/glp1Utils';
import { NO_ESTIMATE_TEXT } from '../lib/medications';

interface Props {
  className?: string;
  onOpenSources?: () => void;
}

export function MedicationLevelChart({ className = '', onOpenSources }: Props) {
  const { doses } = useStore();
  const [pkTimeline, setPkTimeline] = useState<'2 weeks' | '1 month' | '3 months' | 'All time'>('All time');

  const pkData = generatePKCurve(doses, pkTimeline);

  // Medication colors
  // A line pattern per medication, so the curves can be told apart without relying on colour.
  const medDash: Record<string, string | undefined> = { tirzepatide: undefined, retatrutide: '7 4', semaglutide: '2 3' };
  const medColors: Record<string, { stroke: string; fill: string; dot: string }> = {
    tirzepatide: { stroke: '#15803d', fill: '#15803d', dot: '#15803d' },
    retatrutide: { stroke: '#b45309', fill: '#b45309', dot: '#b45309' },
    semaglutide: { stroke: '#1d5aa6', fill: '#1d5aa6', dot: '#1d5aa6' }
  };

  const activeMeds = pkData.medicationsList;

  return (
    <div className={`bg-white rounded-[24px] p-6 shadow-xs border border-line ${className}`}>
      {/* HEADER WITH TITLE, SUBHEAD, LEGEND */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-ink text-base">Medication level</h3>
            {onOpenSources && (
              <button
                onClick={onOpenSources}
                aria-label="About the estimated level"
                className="cursor-pointer text-subtle hover:text-brand transition-colors p-1 rounded-full hover:bg-sunken"
              >
                <Info className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            {doses.length === 0 ? (
              'Log a dose to see an estimate.'
            ) : pkData.modelled ? (
              <>
                Estimated {pkData.medicationName} level now: <strong className="text-ink font-semibold">{pkData.currentLevel} mg</strong>{' '}
                <span className="text-subtle">({pkData.percentOfPeak}% of your modelled peak)</span>
              </>
            ) : (
              NO_ESTIMATE_TEXT
            )}
          </p>
          {pkData.mixedMedications && (
            <p className="text-[11px] text-amber-800 mt-1">You’ve logged more than one medication. Each is drawn separately and never added together; the number above is for {pkData.medicationName}, your most recent.</p>
          )}
          {doses.length > 0 && <p className="text-[11px] text-subtle mt-0.5">Simplified model, not a blood test. The right-hand side shows how the estimate would fall if no further doses were taken.</p>}
        </div>

        {/* LEGEND */}
        <div className="flex items-center gap-4 text-xs font-medium text-muted">
          {activeMeds.map((med) => {
            const colorObj = medColors[med.toLowerCase()] || { stroke: '#1d5aa6', fill: '#1d5aa6' };
            return (
              <div key={med} className="flex items-center gap-1.5 capitalize">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: colorObj.stroke }} />
                <span>{med}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHART CONTAINER */}
      <div className="h-[280px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={pkData.points} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="colorTirzepatide" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#15803d" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#15803d" stopOpacity={0.02}/>
              </linearGradient>
              <linearGradient id="colorRetatrutide" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#b45309" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#b45309" stopOpacity={0.02}/>
              </linearGradient>
              <linearGradient id="colorSemaglutide" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1d5aa6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#1d5aa6" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="dateStr"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#667085', fontWeight: 400 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#667085', fontWeight: 400 }}
              tickFormatter={(val) => `${val} mg`}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(16,24,40,0.05)' }}
              formatter={(value, name) => [`${value} mg`, String(name)]}
            />
            {activeMeds.map((med) => {
              const medLower = med.toLowerCase();
              const colorObj = medColors[medLower] || { stroke: '#1d5aa6', fill: '#1d5aa6' };
              const gradId = medLower === 'tirzepatide' ? 'url(#colorTirzepatide)'
                : medLower === 'retatrutide' ? 'url(#colorRetatrutide)'
                : 'url(#colorSemaglutide)';

              return (
                <Area
                  key={med}
                  type="monotone"
                  dataKey={medLower}
                  name={med}
                  stroke={colorObj.stroke}
                  strokeWidth={2}
                  strokeDasharray={medDash[medLower]}
                  fillOpacity={1}
                  fill={gradId}
                  dot={false}
                  activeDot={{ r: 5, fill: colorObj.stroke, stroke: '#fff', strokeWidth: 2 }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* TIMEFRAME SELECTOR TABS AT BOTTOM */}
      <div className="mt-6 flex justify-center sm:justify-end">
        <div className="flex bg-canvas p-1 rounded-[14px] border border-line text-xs font-medium gap-1">
          {(['2 weeks', '1 month', '3 months', 'All time'] as const).map((t) => (
            <button
              key={t}
              aria-pressed={pkTimeline === t}
              onClick={() => setPkTimeline(t)}
              className={`px-3.5 py-1.5 rounded-[10px] transition-all cursor-pointer ${
                pkTimeline === t
                  ? 'bg-white text-ink shadow-xs font-semibold'
                  : 'text-muted hover:text-ink'
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
