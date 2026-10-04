import React, { useState } from 'react';
import { 
  Sparkles, Info, Calendar, Share2, Clock, CheckCircle2, 
  TrendingDown, TrendingUp, ChevronRight, Zap, Shield, RefreshCw, 
  Flame, Droplets, Activity, Moon, Utensils, ArrowDown, ArrowUpRight, ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, AreaChart, Area 
} from 'recharts';
import { useStore } from '../store/useStore';
import { calculateShotPhase, generatePKCurve } from '../lib/glp1Utils';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface Props {
  className?: string;
}

export function ThisWeekDashboard({ className = '' }: Props) {
  const { doses } = useStore();
  const shotPhaseInfo = calculateShotPhase(doses);
  const pkData = generatePKCurve(doses);

  const daysSinceLastShot = shotPhaseInfo.lastDose 
    ? Math.max(0, (new Date().getTime() - new Date(shotPhaseInfo.lastDose.date).getTime()) / (1000 * 3600 * 24))
    : 0;
  const currentDayNum = shotPhaseInfo.lastDose ? Math.min(7, Math.floor(daysSinceLastShot) + 1) : 0;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
  const dateRangeStr = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  const [selectedPhase, setSelectedPhase] = useState<string>(shotPhaseInfo.title);
  const [showGuidanceModal, setShowGuidanceModal] = useState(false);

  // Synchronized curves data for Body Response Timeline
  const rhythmCurveData = [
    { phase: 'Ignition', day: 'Day 1', medication: 90, appetite: 20, foodNoise: 15, energy: 60 },
    { phase: 'Peak Control', day: 'Days 1–2', medication: 98, appetite: 15, foodNoise: 10, energy: 75 },
    { phase: 'Stable Control', day: 'Days 3–4', medication: 85, appetite: 25, foodNoise: 15, energy: 80 },
    { phase: 'Body Rebalancing', day: 'Days 5–6', medication: 72, appetite: 45, foodNoise: 25, energy: 70 },
    { phase: 'Preparation', day: 'Day 7', medication: 55, appetite: 65, foodNoise: 40, energy: 65 },
    { phase: 'Restart', day: 'Next Inj', medication: 95, appetite: 20, foodNoise: 15, energy: 75 },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. TOP HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">This Week</h1>
            <Sparkles className="w-5 h-5 text-[#6D4AFF]" />
          </div>
          <p className="text-xs font-normal text-[#667085] mt-1">
            Understand your body this week. Plan today, stay ahead.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-[#F8F9FC] px-3.5 py-2.5 rounded-[14px] border border-[#E5E7EB] text-xs font-medium text-[#111827]">
            <Calendar className="w-4 h-4 text-[#667085]" />
            <span>{dateRangeStr}</span>
          </div>
          <button className="flex items-center gap-2 bg-white hover:bg-[#F8F9FC] px-4 py-2.5 rounded-[14px] border border-[#E5E7EB] text-xs font-medium text-[#111827] transition-all cursor-pointer">
            <Share2 className="w-4 h-4 text-[#667085]" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* 2. HERO ROW 1: TODAY'S STATE & 5 KPI MICRO-CARDS */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="text-xs font-medium text-[#6D4AFF] mb-1">
              Today • {shotPhaseInfo.lastDose ? `Day ${currentDayNum} of 7` : 'No Dose Logged'}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#111827] tracking-tight">{shotPhaseInfo.title}</h2>
              <span className="bg-[#ECFDF3] text-[#22C55E] border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
                Normal and Expected
              </span>
            </div>
            <p className="text-xs font-normal text-[#667085] mt-1.5 max-w-2xl leading-relaxed">
              {shotPhaseInfo.now}
            </p>
          </div>

          {/* Today's Difficulty Badge */}
          <div className="bg-[#F8F9FC] p-4 rounded-[16px] border border-[#E5E7EB] w-full lg:w-56 shrink-0">
            <div className="flex justify-between items-center text-xs font-medium text-[#667085] mb-1">
              <span>Today's Difficulty</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
            </div>
            <div className="text-2xl font-semibold text-[#111827]">Easy</div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[11px] font-medium text-[#667085]">
                <span>Confidence</span>
                <span className="text-[#22C55E] font-semibold">78%</span>
              </div>
              <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#22C55E] h-full rounded-full" style={{ width: '78%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* 4 Micro KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2 border-t border-[#F1F5F9]">
          <div className="bg-[#F8F9FC] p-4 rounded-[16px] border border-[#E5E7EB]">
            <div className="flex justify-between items-center text-xs font-normal text-[#667085]">
              <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-[#6D4AFF]" /> Medication</span>
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-[#111827] mt-2">{pkData.percentOfPeak}%</div>
            <p className="text-[11px] font-medium text-[#6D4AFF] mt-0.5">of peak level</p>
          </div>

          <div className="bg-[#F8F9FC] p-4 rounded-[16px] border border-[#E5E7EB]">
            <div className="flex justify-between items-center text-xs font-normal text-[#667085]">
              <span className="flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-[#F59E0B]" /> Appetite</span>
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-[#111827] mt-2">4/10</div>
            <p className="text-[11px] font-medium text-[#F59E0B] mt-0.5">Returning slowly</p>
          </div>

          <div className="bg-[#F8F9FC] p-4 rounded-[16px] border border-[#E5E7EB]">
            <div className="flex justify-between items-center text-xs font-normal text-[#667085]">
              <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#22C55E]" /> Food Noise</span>
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-[#111827] mt-2">2/10</div>
            <p className="text-[11px] font-medium text-[#22C55E] mt-0.5">Low</p>
          </div>

          <div className="bg-[#F8F9FC] p-4 rounded-[16px] border border-[#E5E7EB]">
            <div className="flex justify-between items-center text-xs font-normal text-[#667085]">
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-blue-500" /> Energy</span>
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-[#111827] mt-2">Good</div>
            <p className="text-[11px] font-medium text-blue-600 mt-0.5">Stable</p>
          </div>
        </div>
      </div>

      {/* 3. HERO ROW 2: SIGNATURE "BODY RHYTHM TIMELINE" + WHAT'S HAPPENING NOW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CENTER HERO: SIGNATURE BODY RHYTHM TIMELINE */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#111827] tracking-tight">Your Body Rhythm This Week</h2>
                <Info className="w-4 h-4 text-[#98A2B3] cursor-pointer" />
              </div>
            </div>

            {/* 6 Node Connected Timeline */}
            <div className="overflow-x-auto pb-4 pt-1 -mx-2 px-2 sm:mx-0 sm:px-0">
              <div className="relative my-4 px-4 min-w-[580px] sm:min-w-0">
                {/* Connecting Line */}
                <div className="absolute top-7 left-10 right-10 h-1 bg-[#E5E7EB] -z-0" />
                <div className="absolute top-7 left-10 w-3/4 h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-orange-500 -z-0" />

                <div className="grid grid-cols-6 gap-2 text-center relative z-10">
                  {/* Node 1: Ignition */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-[#6D4AFF] text-white flex items-center justify-center font-medium text-sm shadow-md">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-[#111827] mt-3">Ignition</span>
                    <span className="text-[10px] font-semibold text-[#98A2B3]">Day 1</span>
                  </div>

                  {/* Node 2: Peak Control */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-[#6D4AFF] text-white flex items-center justify-center font-medium text-sm shadow-md">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-[#111827] mt-3">Peak Control</span>
                    <span className="text-[10px] font-semibold text-[#98A2B3]">Days 1–2</span>
                  </div>

                  {/* Node 3: Stable Control */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-[#582967] text-white flex items-center justify-center font-medium text-sm shadow-md">
                      <Shield className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-[#111827] mt-3">Stable Control</span>
                    <span className="text-[10px] font-semibold text-[#98A2B3]">Days 3–4</span>
                  </div>

                  {/* Node 4: Body Rebalancing (ACTIVE GLOW) */}
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 -mt-1 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-medium text-base shadow-xl ring-4 ring-orange-200 animate-pulse">
                      <RefreshCw className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-orange-600 mt-2">Body Rebalancing</span>
                    <span className="text-[10px] font-medium text-[#667085]">Days 5–6</span>
                    <span className="mt-1 text-[9px] font-semibold bg-orange-600 text-white px-2 py-0.5 rounded-full tracking-wider">
                      YOU ARE HERE
                    </span>
                  </div>

                  {/* Node 5: Preparation */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-[#F1F5F9] text-[#98A2B3] border border-[#D0D5DD] flex items-center justify-center font-medium text-sm">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-[#667085] mt-3">Preparation</span>
                    <span className="text-[10px] font-semibold text-[#98A2B3]">Day 7</span>
                  </div>

                  {/* Node 6: Restart */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-purple-100 text-[#6D4AFF] border border-purple-300 flex items-center justify-center font-medium text-sm">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-[#6D4AFF] mt-3">Restart</span>
                    <span className="text-[10px] font-semibold text-[#98A2B3]">Next Injection</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Ribbon */}
          <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
            <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-orange-500 h-full rounded-full" style={{ width: '70%' }} />
            </div>
            <p className="text-[11px] font-semibold text-[#667085] text-center mt-2">
              This phase is normal. Your body is adjusting as medication levels decline.
            </p>
          </div>
        </div>

        {/* RIGHT HERO: WHAT'S HAPPENING NOW */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#111827] tracking-tight mb-4">What's Happening Now</h2>

            <div className="space-y-3 text-xs font-medium">
              <div className="flex justify-between items-center p-2.5 rounded-[16px] bg-[#F8F9FC]">
                <span className="flex items-center gap-2 text-[#344054]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6D4AFF]" /> Medication Level
                </span>
                <span className="text-[#6D4AFF] font-semibold flex items-center gap-1">
                  Declining <ArrowDown className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-[16px] bg-[#F8F9FC]">
                <span className="flex items-center gap-2 text-[#344054]">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Appetite
                </span>
                <span className="text-orange-600 font-semibold flex items-center gap-1">
                  Returning slowly <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-[16px] bg-[#F8F9FC]">
                <span className="flex items-center gap-2 text-[#344054]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" /> Food Noise
                </span>
                <span className="text-[#22C55E] font-semibold flex items-center gap-1">
                  Low <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-[16px] bg-[#F8F9FC]">
                <span className="flex items-center gap-2 text-[#344054]">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Energy
                </span>
                <span className="text-blue-600 font-semibold flex items-center gap-1">
                  Stable <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-[16px] bg-[#F8F9FC]">
                <span className="flex items-center gap-2 text-[#344054]">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Nausea
                </span>
                <span className="text-[#22C55E] font-semibold flex items-center gap-1">
                  Low <ArrowDown className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BODY RESPONSE TIMELINE & WHAT TO EXPECT NEXT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: BODY RESPONSE TIMELINE CHART */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#111827] tracking-tight">Body Response Timeline</h2>
              <p className="text-xs text-[#667085] font-semibold">Synchronized physiological markers across the 7-day cycle</p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-medium flex-wrap">
              <span className="flex items-center gap-1 text-[#6D4AFF]"><span className="w-2.5 h-2.5 rounded-full bg-[#6D4AFF]" /> Medication</span>
              <span className="flex items-center gap-1 text-orange-500"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Appetite</span>
              <span className="flex items-center gap-1 text-[#22C55E]"><span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" /> Food Noise</span>
              <span className="flex items-center gap-1 text-blue-500"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Energy</span>
            </div>
          </div>

          <div className="h-[240px] w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rhythmCurveData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="phase" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={5} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip />
                <ReferenceLine x="Body Rebalancing" stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'YOU ARE HERE', fill: '#d97706', fontSize: 10, fontWeight: 800 }} />
                <Line type="monotone" dataKey="medication" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="appetite" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="foodNoise" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="energy" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-purple-50/70 p-4 rounded-[16px] border border-purple-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="text-xs font-semibold text-purple-950">Why this happens</div>
              <p className="text-xs font-medium text-[#4C1D95] mt-0.5">
                As medication levels decline, the body gradually signals more hunger. This is a natural, healthy part of the weekly cycle.
              </p>
            </div>
            <button 
              onClick={() => setShowGuidanceModal(true)}
              className="px-4 py-2 bg-[#6D4AFF] hover:bg-[#6D4AFF] text-white rounded-[16px] text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              Learn more →
            </button>
          </div>
        </div>

        {/* RIGHT 1 COL: WHAT TO EXPECT NEXT & AI TIP */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-[#111827] tracking-tight">What to Expect Next</h2>

            <div className="space-y-3 text-xs font-semibold text-[#344054]">
              <div className="flex items-center justify-between p-3 rounded-[16px] bg-[#F8F9FC]">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#6D4AFF]" /> Next 24h
                </span>
                <span className="text-[#667085] font-medium">Hunger may increase slightly</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[16px] bg-[#F8F9FC]">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" /> Tomorrow
                </span>
                <span className="text-[#667085] font-medium">Food noise may return</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[16px] bg-[#F8F9FC]">
                <span className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-[#22C55E]" /> Injection
                </span>
                <span className="text-[#667085] font-medium">Levels will rise again</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[16px] bg-[#F8F9FC]">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Recovery
                </span>
                <span className="text-[#667085] font-medium">Back to peak control</span>
              </div>
            </div>
          </div>

          {/* AI STORY TIP CARD */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-6 rounded-[24px] shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-300" />
              <h3 className="text-sm font-semibold">AI Tip for You</h3>
            </div>
            <p className="text-xs leading-relaxed font-medium text-purple-100">
              Preparing high-protein meals today will make tomorrow easier and prevent overeating as hunger returns.
            </p>
            <button
              onClick={() => setShowGuidanceModal(true)}
              className="w-full py-2.5 bg-white text-purple-900 hover:bg-purple-50 font-semibold text-xs rounded-[16px] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>See Full Guidance</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. TODAY'S GAME PLAN (5 ACTION CARDS) */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-[#111827] tracking-tight">Today's Game Plan</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-purple-50/70 p-4 rounded-[16px] border border-purple-100 space-y-2 hover:border-purple-300 transition-all">
            <div className="w-8 h-8 rounded-[16px] bg-[#6D4AFF] text-white flex items-center justify-center font-semibold">
              <Utensils className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-[#111827]">Eat more protein</div>
            <p className="text-[11px] font-semibold text-[#667085]">Keeps you fuller for longer</p>
          </div>

          <div className="bg-blue-50/70 p-4 rounded-[16px] border border-blue-100 space-y-2 hover:border-blue-300 transition-all">
            <div className="w-8 h-8 rounded-[16px] bg-blue-600 text-white flex items-center justify-center font-semibold">
              <Droplets className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-[#111827]">Stay hydrated</div>
            <p className="text-[11px] font-semibold text-[#667085]">2.5 – 3L water throughout day</p>
          </div>

          <div className="bg-emerald-50/70 p-4 rounded-[16px] border border-emerald-100 space-y-2 hover:border-emerald-300 transition-all">
            <div className="w-8 h-8 rounded-[16px] bg-[#22C55E] text-white flex items-center justify-center font-semibold">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-[#111827]">Move your body</div>
            <p className="text-[11px] font-semibold text-[#667085]">Walk or light activity</p>
          </div>

          <div className="bg-orange-50/70 p-4 rounded-[16px] border border-orange-100 space-y-2 hover:border-orange-300 transition-all">
            <div className="w-8 h-8 rounded-[16px] bg-orange-600 text-white flex items-center justify-center font-semibold">
              <Utensils className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-[#111827]">Prep smart</div>
            <p className="text-[11px] font-semibold text-[#667085]">Prepare meals for tomorrow</p>
          </div>

          <div className="bg-indigo-50/70 p-4 rounded-[16px] border border-indigo-100 space-y-2 hover:border-indigo-300 transition-all">
            <div className="w-8 h-8 rounded-[16px] bg-[#6D4AFF] text-white flex items-center justify-center font-semibold">
              <Moon className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-[#111827]">Sleep well</div>
            <p className="text-[11px] font-semibold text-[#667085]">7 – 8 hours tonight</p>
          </div>
        </div>
      </div>

      {/* GUIDANCE MODAL */}
      {showGuidanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-[#111827]">Weekly Rhythm Physiology Guide</h3>
              <button 
                onClick={() => setShowGuidanceModal(false)}
                className="text-[#98A2B3] hover:text-[#667085] text-sm font-medium"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#667085] leading-relaxed font-medium">
              GLP-1 receptor agonists follow a half-life pharmacokinetics curve over 7 days:
            </p>
            <div className="bg-[#F8F9FC] p-4 rounded-[16px] text-xs space-y-2 text-[#111827] font-semibold">
              <p>• <strong>Days 1–2 (Peak):</strong> Maximum drug concentration, strongest appetite suppression.</p>
              <p>• <strong>Days 3–4 (Steady state):</strong> Smooth satiety, stable gastric emptying.</p>
              <p>• <strong>Days 5–6 (Rebalancing):</strong> Blood level tapers (~30% reduction), mild hunger rebound is expected.</p>
              <p>• <strong>Day 7 (Preparation):</strong> Troughs prepare body for next dose dose reset.</p>
            </div>
            <button
              onClick={() => setShowGuidanceModal(false)}
              className="w-full py-3 rounded-[16px] bg-[#6D4AFF] text-white font-medium text-xs cursor-pointer hover:bg-[#6D4AFF] transition-all"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
