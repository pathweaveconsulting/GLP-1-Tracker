import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot 
} from 'recharts';
import { useStore } from '../store/useStore';
import { generatePKCurve } from '../lib/glp1Utils';

interface Props {
  className?: string;
  onOpenSources?: () => void;
}

export function MedicationLevelChart({ className = '', onOpenSources }: Props) {
  const { doses } = useStore();
  const [pkTimeline, setPkTimeline] = useState<'2 weeks' | '1 month' | '3 months' | 'All time'>('All time');

  const pkData = generatePKCurve(doses, pkTimeline);

  // Medication colors
  const medColors: Record<string, { stroke: string; fill: string; dot: string }> = {
    tirzepatide: { stroke: '#22C55E', fill: '#22C55E', dot: '#22C55E' },
    retatrutide: { stroke: '#F59E0B', fill: '#F59E0B', dot: '#F59E0B' },
    semaglutide: { stroke: '#6D4AFF', fill: '#6D4AFF', dot: '#6D4AFF' }
  };

  const activeMeds = pkData.medicationsList;

  return (
    <div className={`bg-white rounded-[24px] p-6 shadow-xs border border-[#E5E7EB] ${className}`}>
      {/* HEADER WITH TITLE, SUBHEAD, LEGEND */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#111827] text-base">Medication level</h3>
            {onOpenSources && (
              <button
                onClick={onOpenSources}
                aria-label="About the estimated level"
                className="cursor-pointer text-subtle hover:text-[#6D4AFF] transition-colors p-1 rounded-full hover:bg-[#F1F5F9]"
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
                Estimated {pkData.medicationName} level now: <strong className="text-[#111827] font-semibold">{pkData.currentLevel} mg</strong>{' '}
                <span className="text-subtle">({pkData.percentOfPeak}% of your modelled peak)</span>
              </>
            ) : (
              'No estimate is available for this medication.'
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
            const colorObj = medColors[med.toLowerCase()] || { stroke: '#6D4AFF', fill: '#6D4AFF' };
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
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0.02}/>
              </linearGradient>
              <linearGradient id="colorRetatrutide" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02}/>
              </linearGradient>
              <linearGradient id="colorSemaglutide" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6D4AFF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6D4AFF" stopOpacity={0.02}/>
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
              const colorObj = medColors[medLower] || { stroke: '#6D4AFF', fill: '#6D4AFF' };
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
        <div className="flex bg-[#F8F9FC] p-1 rounded-[14px] border border-[#E5E7EB] text-xs font-medium gap-1">
          {(['2 weeks', '1 month', '3 months', 'All time'] as const).map((t) => (
            <button
              key={t}
              aria-pressed={pkTimeline === t}
              onClick={() => setPkTimeline(t)}
              className={`px-3.5 py-1.5 rounded-[10px] transition-all cursor-pointer ${
                pkTimeline === t 
                  ? 'bg-white text-[#111827] shadow-xs font-semibold' 
                  : 'text-muted hover:text-[#111827]'
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
