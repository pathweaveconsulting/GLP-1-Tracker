import React from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/card';
import { format, addDays } from 'date-fns';
import { ShieldAlert, TrendingDown, Target, Award, Clock, Zap } from 'lucide-react';

export function HealthCenter() {
  const { doses, settings } = useStore();
  const lastDose = doses.length > 0 ? doses[doses.length - 1] : null;
  const nextDoseDate = lastDose ? addDays(new Date(lastDose.date), 7) : new Date();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Health Overview</h1>
        <p className="text-[#667085] text-sm mt-0.5">Your comprehensive metabolic overview</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-[#111827] text-white rounded-[20px] border-0 shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex justify-between items-start">
              <Clock className="w-5 h-5 text-[#98A2B3]" />
              <span className="px-2.5 py-0.5 bg-white/10 text-[11px] rounded-full font-medium">Active</span>
            </div>
            <div>
              <span className="text-xs font-medium text-[#98A2B3] block mb-1">Next Shot</span>
              <span className="text-xl font-semibold tracking-tight">{format(nextDoseDate, 'EEE, MMM d')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-[#E5E7EB] bg-white shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <Zap className="w-5 h-5 text-[#F59E0B]" />
              <span className="px-2.5 py-0.5 bg-amber-50 text-[#F59E0B] text-[11px] rounded-full font-medium">Est. Peak</span>
            </div>
            <div>
              <span className="text-xs font-medium text-[#667085] block mb-1">Medication Level</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight text-[#111827]">4.2</span>
                <span className="text-xs font-normal text-[#667085]">mg</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-[#E5E7EB] bg-white shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <TrendingDown className="w-5 h-5 text-[#22C55E]" />
            </div>
            <div>
              <span className="text-xs font-medium text-[#667085] block mb-1">Weekly Avg</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight text-[#22C55E]">-1.4</span>
                <span className="text-xs font-normal text-[#667085]">lbs/wk</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-[#E5E7EB] bg-white shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <Target className="w-5 h-5 text-[#6D4AFF]" />
            </div>
            <div>
              <span className="text-xs font-medium text-[#667085] block mb-1">Predictions</span>
              <p className="text-sm font-semibold text-[#111827] mt-1 leading-tight">Goal weight est. by Nov 2026</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1 border-emerald-200/60 bg-emerald-50/50 rounded-[20px] shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <Award className="w-5 h-5 text-[#22C55E]" />
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] rounded-full font-medium">Milestone</span>
            </div>
            <div>
              <span className="text-xs font-medium text-emerald-800 block mb-1">Milestone Reached</span>
              <span className="text-xl font-semibold text-emerald-900 tracking-tight">-10% Body Weight!</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="rounded-[24px] border-[#E5E7EB] bg-white shadow-xs">
        <CardContent className="p-6 flex gap-4 items-start">
          <div className="p-3 bg-[#F8F9FC] rounded-[14px]">
            <ShieldAlert className="w-5 h-5 text-[#667085]" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-[#111827]">Health Status</h3>
            <p className="text-xs text-[#667085] mt-1 font-normal leading-relaxed">All vitals and side effects are within normal bounds. Your resting heart rate has slightly elevated, which is a known effect of {settings.medication}.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
