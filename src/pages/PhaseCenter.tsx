import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { calculateShotPhase } from '../lib/glp1Utils';

export function PhaseCenter() {
  const { doses } = useStore();
  const phaseInfo = calculateShotPhase(doses);
  const [showAllPhases, setShowAllPhases] = useState(false);

  const ALL_PHASES = [
    {
      num: 1,
      title: 'Injection Day',
      days: '0d - 0.5d',
      now: 'Dose administered. Medication absorbing into bloodstream.',
      watch: 'Injection site reactions, initial mild nausea or stomach fullness.',
      do: 'Stay hydrated | Eat light protein meals.',
    },
    {
      num: 2,
      title: 'Build Up Phase',
      days: '0.5d - 2d',
      now: 'Serum concentration rapidly increasing towards peak. Satiety increasing.',
      watch: 'Early side effects like mild nausea or heartburn.',
      do: 'Sip electrolyte fluids | Avoid heavy or high-fat meals.',
    },
    {
      num: 3,
      title: 'Peak Phase',
      days: '2d - 3.5d',
      now: 'Maximum medication level in bloodstream. Strongest appetite suppression.',
      watch: 'Low energy if calories drop too low, dehydration.',
      do: 'Prioritize protein goals & electrolytes.',
    },
    {
      num: 4,
      title: 'Cruise Phase',
      days: '3d - 5d',
      now: 'Hunger stays quiet. Fullness feels normal. GLP 1 side effects fade. Glucagon continues calorie burn. Energy may rise.',
      watch: 'Constipation may be noticeable; otherwise milder symptoms.',
      do: 'Fiber + fluids | Balanced meals to maintain nutrition despite smaller portions.',
    },
    {
      num: 5,
      title: 'Winding Down',
      days: '5d - 6d',
      now: 'Drug levels drop gradually. Ghrelin rises slightly. Appetite suppression and metabolic effects are still active, though hunger may rise.',
      watch: 'Mainly appetite returning; constipation may ease as GI speed normalizes.',
      do: 'Prepare for next dose; plan meals/snacks | Watch portions as hunger rises.',
    },
    {
      num: 6,
      title: 'Wear-Off Window',
      days: '6d - 7d',
      now: 'Drug levels continue dropping. Appetite suppression weakens noticeably. Hunger and cravings become more prominent as you approach your next dose.',
      watch: 'Increased hunger, possible food cravings, mood changes.',
      do: 'Plan for next shot; resist binge urges | Use volume foods and protein strategies.',
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Medication Phase Center</h1>
          <p className="text-sm text-[#667085] mt-0.5">Track your weekly GLP-1 cycle progression dynamically</p>
        </div>
        <Button 
          variant={showAllPhases ? "default" : "outline"} 
          size="sm"
          onClick={() => setShowAllPhases(!showAllPhases)}
          className="rounded-[14px] border-[#E5E7EB] text-xs font-semibold"
        >
          {showAllPhases ? "Hide All Phases" : "Show All Phases"}
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-[#111827] text-white border-0 shadow-xs rounded-[20px]">
          <span className="text-xs font-medium text-[#98A2B3] mb-2">Current Active Phase</span>
          <h2 className="text-2xl font-semibold tracking-tight mb-6 text-amber-400 text-center">{phaseInfo.title}</h2>
          
          <div className="relative w-44 h-44 flex items-center justify-center mb-6">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle cx="88" cy="88" r="74" fill="none" stroke="#1e293b" strokeWidth="8" />
              <circle 
                cx="88" 
                cy="88" 
                r="74" 
                fill="none" 
                stroke="#f59e0b" 
                strokeWidth="8" 
                strokeDasharray="465" 
                strokeDashoffset={465 - (465 * (phaseInfo.percentComplete / 100))} 
                strokeLinecap="round" 
              />
            </svg>
            <div className="text-center">
              <span className="text-4xl font-semibold tracking-tight block text-white">{phaseInfo.daysUntilNext}</span>
              <span className="text-[11px] font-medium text-[#98A2B3]">Days to next dose</span>
            </div>
          </div>
          
          <div className="text-center">
            <span className="text-xs text-[#98A2B3] font-normal">Phase {phaseInfo.phaseNumber} of {phaseInfo.totalPhases} ({phaseInfo.daysRange})</span>
            <p className="text-sm font-medium mt-1 text-slate-200">Cycle {phaseInfo.percentComplete}% Complete</p>
            {phaseInfo.lastDose && (
              <p className="text-[11px] text-[#98A2B3] mt-2">
                Last Injection: {format(new Date(phaseInfo.lastDose.date), 'MMM d, h:mm a')}
              </p>
            )}
          </div>
        </Card>

        <div className="md:col-span-2 space-y-4">
          <Card className="rounded-[16px] border-[#E5E7EB] bg-[#F8F9FC] shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-[#667085]">Now</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#111827] font-medium text-sm leading-relaxed">
                {phaseInfo.now}
              </p>
            </CardContent>
          </Card>
          
          <Card className="rounded-[16px] border-[#E5E7EB] bg-[#F8F9FC] shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-[#667085]">Watch</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#111827] text-sm leading-relaxed font-normal">
                {phaseInfo.watch}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[16px] border border-amber-200/60 bg-[#FFF7E6] shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-[#F59E0B]">Do</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#111827] text-sm font-medium leading-relaxed">
                {phaseInfo.do}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {showAllPhases && (
        <div className="space-y-4 pt-4 border-t border-[#E5E7EB] animate-in fade-in duration-200">
          <h3 className="text-lg font-semibold text-[#111827]">All Shot Cycle Phases (1 – 6)</h3>
          <p className="text-xs text-[#667085]">General guidelines based on peer-reviewed GLP-1 pharmacokinetic curves.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ALL_PHASES.map((p) => (
              <Card 
                key={p.num} 
                className={`rounded-[16px] p-4 border transition-all ${
                  phaseInfo.phaseNumber === p.num 
                    ? 'border-amber-400 bg-amber-50/40 shadow-xs' 
                    : 'border-[#E5E7EB] bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center">
                      {p.num}
                    </span>
                    <h4 className="font-semibold text-[#111827] text-sm">{p.title}</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-[#667085] bg-[#F1F5F9] px-2 py-0.5 rounded-full">{p.days}</span>
                </div>

                <div className="space-y-2 text-xs mt-3">
                  <div>
                    <span className="font-semibold text-[#98A2B3] tracking-wider text-[10px] block">Now</span>
                    <p className="text-[#111827] font-medium">{p.now}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-[#98A2B3] tracking-wider text-[10px] block">Watch</span>
                    <p className="text-[#667085]">{p.watch}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-amber-700 tracking-wider text-[10px] block">Do</span>
                    <p className="text-amber-900 font-semibold">{p.do}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-xs text-[#98A2B3] italic">
            These phases are general guidelines. Individual experiences may vary. Always consult your healthcare provider for personalized advice.
          </p>
        </div>
      )}
    </div>
  );
}
