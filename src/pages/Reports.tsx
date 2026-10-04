import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  FileText, Printer, ChevronDown, CheckCircle2, Circle, 
  Sparkles, Calendar, TrendingDown, Info, ShieldAlert,
  BarChart3, PieChart as PieIcon, ArrowRight, Download,
  Star, Trophy, Flame, Zap, Droplets, Target, Shield,
  Award, Heart, AlertCircle, ArrowUpRight, Check, RefreshCw,
  Utensils, Moon, Activity, LayoutGrid, Layers, Scale, Share2
} from 'lucide-react';

type UnitMode = 'kg' | 'lbs';
type ViewMode = 'grid' | 'stacked';
type ReportType = 'weekly' | 'monthly';

interface WeekReportConfig {
  id: string;
  type: 'weekly';
  number: number;
  medication: string;
  dateRangeStr: string;
  subtitle: string;
  currentWeightKg: number;
  weightChangeKg: number;
  totalLossKg: number;
  progressPercent: number;
  rating: number; // 1-5
  statusBadge: string;
  executiveSummary: string;
  quote: string;
  motto: string;
}

interface MonthReportConfig {
  id: string;
  type: 'monthly';
  monthName: string;
  year: number;
  medication: string;
  dateRangeStr: string;
  subtitle: string;
  currentWeightKg: number;
  weightChangeKg: number;
  totalLossKg: number;
  avgWeeklyLossKg: number;
  progressPercent: number;
  rating: number; // 1-5
  statusBadge: string;
  executiveSummary: string;
  quote: string;
  motto: string;
  weeksBreakdown: {
    weekLabel: string;
    title: string;
    description: string;
    lossKg: number;
  }[];
}

export function Reports() {
  const { settings } = useStore();
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [unit, setUnit] = useState<UnitMode>('kg');
  const [selectedWeekId, setSelectedWeekId] = useState<string>('week-23');
  const [selectedMonthId, setSelectedMonthId] = useState<string>('month-6');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Convert weight according to selected unit
  const convertWeight = (valKg: number) => {
    if (unit === 'lbs') return (valKg * 2.20462).toFixed(1);
    return valKg.toFixed(1);
  };

  const convertDiff = (valKg: number) => {
    const isLoss = valKg < 0;
    const absVal = Math.abs(valKg);
    const num = unit === 'lbs' ? (absVal * 2.20462).toFixed(1) : absVal.toFixed(1);
    return `${isLoss ? '-' : '+'}${num} ${unit}`;
  };

  const unitLabel = unit === 'lbs' ? 'lbs' : 'kg';

  // Weekly reports dataset
  const weeklyReports: Record<string, WeekReportConfig> = {
    'week-23': {
      id: 'week-23',
      type: 'weekly',
      number: 23,
      medication: 'Retatrutide (4.75 mg)',
      dateRangeStr: 'Apr 7 – Apr 13, 2026',
      subtitle: 'Finding Your Rhythm',
      currentWeightKg: 115.5,
      weightChangeKg: -0.8,
      totalLossKg: 17.9,
      progressPercent: 72,
      rating: 4,
      statusBadge: 'A Good Week',
      executiveSummary: 'This week your body adapted well to the increased dose. Appetite remained controlled through most of the week while side effects stayed minimal. Hunger began returning toward the weekend, which matches your expected medication cycle.',
      quote: 'Every choice you make today shapes the person you become tomorrow.',
      motto: 'Progress is not linear, but it is always moving you forward.'
    },
    'week-29': {
      id: 'week-29',
      type: 'weekly',
      number: 29,
      medication: 'Retatrutide (6.25 mg)',
      dateRangeStr: 'May 19 – May 25, 2026',
      subtitle: 'Reaching New Milestones',
      currentWeightKg: 111.0,
      weightChangeKg: -2.4,
      totalLossKg: 22.4,
      progressPercent: 84,
      rating: 5,
      statusBadge: 'Exceptional Week',
      executiveSummary: 'Stepping up to your new dose provided strong appetite management and led to a landmark 15% weight loss milestone. Physical symptoms settled as your system finds its new balance.',
      quote: 'Consistency turns small efforts into extraordinary transformations.',
      motto: 'Listen to your body, trust the process, and stay steady.'
    },
    'week-28': {
      id: 'week-28',
      type: 'weekly',
      number: 28,
      medication: 'Retatrutide (6.0 mg)',
      dateRangeStr: 'May 12 – May 18, 2026',
      subtitle: 'Patience & Recalibration',
      currentWeightKg: 113.4,
      weightChangeKg: 0.3,
      totalLossKg: 20.0,
      progressPercent: 78,
      rating: 4,
      statusBadge: 'Steady & Resilient',
      executiveSummary: 'A plateau or minor fluctuation is completely natural during dose adjustments. Your body is locking in long-term metabolic adaptations.',
      quote: 'Rest is just as vital as progress on the journey forward.',
      motto: 'Patience transforms effort into enduring health.'
    }
  };

  // Monthly reports dataset
  const monthlyReports: Record<string, MonthReportConfig> = {
    'month-6': {
      id: 'month-6',
      type: 'monthly',
      monthName: 'April',
      year: 2026,
      medication: 'Retatrutide (4.0 mg → 4.75 mg)',
      dateRangeStr: 'April 1 – April 30, 2026',
      subtitle: 'Deep Metabolic Adaptation',
      currentWeightKg: 115.5,
      weightChangeKg: -3.8,
      totalLossKg: 17.9,
      avgWeeklyLossKg: -0.95,
      progressPercent: 72,
      rating: 5,
      statusBadge: 'Outstanding Month',
      executiveSummary: 'Month 6 marked a key milestone in your GLP-1 journey. Transitioning smoothly to 4.75 mg resulted in steady weight loss (-3.8 kg over 4 weeks), robust satiety, and improved energy levels. Side effect adaptation was excellent.',
      quote: 'Month by month, small consistent habits build a totally new health trajectory.',
      motto: 'Consistency is your greatest superpower.',
      weeksBreakdown: [
        { weekLabel: 'Week 1 (Apr 1–7)', title: 'Dose Step Up', description: 'Adjusted to 4.75 mg dose smoothly with minimal GI distress.', lossKg: -1.0 },
        { weekLabel: 'Week 2 (Apr 8–14)', title: 'Strong Momentum', description: 'Peak appetite control, hit 90% of daily protein goals.', lossKg: -1.2 },
        { weekLabel: 'Week 3 (Apr 15–21)', title: 'Steady Consolidation', description: 'Body rebalancing, stable weight with high energy.', lossKg: -0.8 },
        { weekLabel: 'Week 4 (Apr 22–30)', title: 'Breakthrough Finish', description: 'Reached new lowest weight milestone of 115.5 kg.', lossKg: -0.8 }
      ]
    },
    'month-5': {
      id: 'month-5',
      type: 'monthly',
      monthName: 'March',
      year: 2026,
      medication: 'Retatrutide (4.0 mg)',
      dateRangeStr: 'March 1 – March 31, 2026',
      subtitle: 'Metabolic Steady State',
      currentWeightKg: 119.3,
      weightChangeKg: -3.2,
      totalLossKg: 14.1,
      avgWeeklyLossKg: -0.8,
      progressPercent: 62,
      rating: 4,
      statusBadge: 'Solid Progress',
      executiveSummary: 'March was characterized by steady metabolic stabilization at 4.0 mg. Food noise was reduced consistently by 75%, and hydration habits improved noticeably.',
      quote: 'Patience turns routine days into life-changing milestones.',
      motto: 'Trust your daily routine.',
      weeksBreakdown: [
        { weekLabel: 'Week 1 (Mar 1–7)', title: 'Steady Start', description: 'Maintained 4.0 mg dose, consistent appetite suppression.', lossKg: -0.9 },
        { weekLabel: 'Week 2 (Mar 8–14)', title: 'Hydration Focus', description: 'Increased daily water intake to 2.8L.', lossKg: -0.7 },
        { weekLabel: 'Week 3 (Mar 15–21)', title: 'Plateau Resistance', description: 'Body held weight before a drop on Sunday.', lossKg: -0.6 },
        { weekLabel: 'Week 4 (Mar 22–31)', title: 'Strong Finish', description: 'Dropped -1.0 kg in the final 9 days.', lossKg: -1.0 }
      ]
    }
  };

  const activeWeekly = weeklyReports[selectedWeekId] || weeklyReports['week-23'];
  const activeMonthly = monthlyReports[selectedMonthId] || monthlyReports['month-6'];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* CONTROLS & HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#F3F0FF] text-[#6D4AFF] rounded-full text-xs font-semibold">
              {reportType === 'weekly' ? 'Weekly Report Edition' : 'Monthly Report Edition'}
            </span>
            <span className="text-xs text-[#667085] font-normal">Health & Metabolic Summary</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight mt-1">
            {reportType === 'weekly' ? 'Weekly Health Journey Report' : 'Monthly Health Journey Report'}
          </h1>
          <p className="text-xs text-[#667085] font-normal mt-0.5">
            {reportType === 'weekly'
              ? 'A portrait editorial story of your week, progress, and metabolic rhythm'
              : 'A comprehensive 30-day retrospective of your progress, trends, and adaptation'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Report Type Switcher (Weekly vs Monthly) */}
          <div className="flex bg-[#F8F9FC] rounded-[14px] p-1 border border-[#E5E7EB] text-xs font-medium">
            <button
              onClick={() => setReportType('weekly')}
              className={`px-3 py-1.5 rounded-[10px] transition-all cursor-pointer ${
                reportType === 'weekly' ? 'bg-[#6D4AFF] text-white shadow-xs font-semibold' : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3 py-1.5 rounded-[10px] transition-all cursor-pointer ${
                reportType === 'monthly' ? 'bg-[#6D4AFF] text-white shadow-xs font-semibold' : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Period Selector */}
          <div className="relative flex-1 sm:flex-initial">
            {reportType === 'weekly' ? (
              <select
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="w-full appearance-none bg-[#F8F9FC] border border-[#E5E7EB] text-[#111827] text-xs font-medium rounded-[14px] px-3.5 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#6D4AFF] cursor-pointer"
              >
                <option value="week-23">Week 23 (Apr 7 – Apr 13, 2026)</option>
                <option value="week-29">Week 29 (May 19 – May 25, 2026)</option>
                <option value="week-28">Week 28 (May 12 – May 18, 2026)</option>
              </select>
            ) : (
              <select
                value={selectedMonthId}
                onChange={(e) => setSelectedMonthId(e.target.value)}
                className="w-full appearance-none bg-[#F8F9FC] border border-[#E5E7EB] text-[#111827] text-xs font-medium rounded-[14px] px-3.5 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#6D4AFF] cursor-pointer"
              >
                <option value="month-6">Month 6 (April 2026)</option>
                <option value="month-5">Month 5 (March 2026)</option>
              </select>
            )}
            <ChevronDown className="w-4 h-4 text-[#667085] absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-[#F8F9FC] rounded-[14px] p-1 border border-[#E5E7EB] text-xs font-medium">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-[10px] transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#111827] shadow-xs font-semibold' : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('stacked')}
              className={`px-3 py-1.5 rounded-[10px] transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'stacked' ? 'bg-white text-[#111827] shadow-xs font-semibold' : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pages</span>
            </button>
          </div>

          {/* Unit Toggle */}
          <div className="flex bg-[#F8F9FC] rounded-[14px] p-1 border border-[#E5E7EB] text-xs font-medium">
            <button
              onClick={() => setUnit('kg')}
              className={`px-3 py-1.5 rounded-[10px] transition-all cursor-pointer ${
                unit === 'kg' ? 'bg-[#111827] text-white shadow-xs font-semibold' : 'text-[#667085]'
              }`}
            >
              kg
            </button>
            <button
              onClick={() => setUnit('lbs')}
              className={`px-3 py-1.5 rounded-[10px] transition-all cursor-pointer ${
                unit === 'lbs' ? 'bg-[#111827] text-white shadow-xs font-semibold' : 'text-[#667085]'
              }`}
            >
              lbs
            </button>
          </div>

          {/* Print PDF Button */}
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-white rounded-[14px] text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs ml-auto sm:ml-0"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* RENDER REPORT PAGES */}
      {reportType === 'weekly' ? (
        /* WEEKLY REPORT MAGAZINE */
        <div className={`gap-6 print:block print:space-y-6 ${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'flex flex-col items-center max-w-3xl mx-auto space-y-8'
        }`}>
          {/* PAGE 1 — COVER */}
          <div className="w-full bg-gradient-to-br from-[#FAF5FF] via-white to-[#F8F9FC] text-[#111827] rounded-[24px] border border-[#E5E7EB] p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-xs min-h-[560px]">
            <div className="absolute top-4 right-4 bg-[#6D4AFF] text-white text-[11px] font-semibold w-7 h-7 rounded-full flex items-center justify-center">
              1
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6D4AFF]" />
                <span className="text-xs font-semibold tracking-wider text-[#6D4AFF]">Weekly Journey</span>
              </div>

              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-semibold text-[#111827] tracking-tight">Week {activeWeekly.number}</h2>
                <p className="text-xs font-medium text-[#667085]">{activeWeekly.dateRangeStr}</p>
              </div>

              <h1 className="text-xl sm:text-2xl font-semibold text-[#111827] tracking-tight mt-3 leading-snug">
                {activeWeekly.subtitle}
              </h1>
            </div>

            {/* ARTWORK SVG */}
            <div className="relative my-4 py-2 flex items-center justify-center">
              <svg viewBox="0 0 400 200" className="w-full h-auto max-h-[180px]">
                <defs>
                  <linearGradient id="softSky" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F3F0FF" />
                    <stop offset="100%" stopColor="#FFFFFF" />
                  </linearGradient>
                  <linearGradient id="softMtn1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#DDD6FE" />
                    <stop offset="100%" stopColor="#C4B5FD" />
                  </linearGradient>
                  <linearGradient id="softMtn2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6D4AFF" />
                    <stop offset="100%" stopColor="#4C1D95" />
                  </linearGradient>
                </defs>

                <rect width="400" height="200" fill="url(#softSky)" rx="16" />
                <circle cx="320" cy="50" r="22" fill="#FDE047" opacity="0.8" />
                <path d="M 30 180 L 130 80 L 230 180 Z" fill="url(#softMtn1)" opacity="0.7" />
                <path d="M 150 180 L 270 50 L 380 180 Z" fill="url(#softMtn2)" opacity="0.8" />

                <path 
                  d="M 50 175 Q 120 160 140 130 T 210 95 T 270 52" 
                  fill="none" 
                  stroke="#22C55E" 
                  strokeWidth="4" 
                  strokeDasharray="6 4"
                />
              </svg>
            </div>

            {/* OVERLAY STATS */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F8F9FC] p-3 rounded-[16px] border border-[#E5E7EB] text-center">
                  <span className="text-[10px] font-medium text-[#667085]">Progress</span>
                  <div className="text-xl font-semibold text-[#6D4AFF] mt-1">{activeWeekly.progressPercent}%</div>
                  <span className="text-[10px] text-[#667085]">of target goal</span>
                </div>
                <div className="bg-[#F8F9FC] p-3 rounded-[16px] border border-[#E5E7EB]">
                  <span className="text-[10px] font-medium text-[#667085]">Current Weight</span>
                  <div className="text-xl font-semibold text-[#111827] mt-1">{convertWeight(activeWeekly.currentWeightKg)} <span className="text-xs font-normal text-[#667085]">{unitLabel}</span></div>
                  <span className="text-[10px] font-medium text-[#22C55E] flex items-center gap-1 mt-0.5">
                    <TrendingDown className="w-3 h-3" />
                    <span>{convertWeight(activeWeekly.totalLossKg)} {unitLabel} total loss</span>
                  </span>
                </div>
              </div>

              <div className="bg-[#F8F9FC] border border-[#E5E7EB] p-3 rounded-[14px] text-center">
                <p className="text-xs font-normal text-[#667085] italic">
                  "{activeWeekly.quote}"
                </p>
              </div>
            </div>
          </div>

          {/* PAGE 2 — Executive Summary */}
          <div className="w-full bg-white rounded-[24px] border border-[#E5E7EB] p-6 sm:p-7 relative flex flex-col justify-between shadow-xs min-h-[560px]">
            <div className="absolute top-4 right-4 bg-[#F8F9FC] text-[#111827] text-[11px] font-semibold w-7 h-7 rounded-full flex items-center justify-center border border-[#E5E7EB]">
              2
            </div>

            <div>
              <div className="text-[10px] font-semibold text-[#6D4AFF] tracking-wider mb-1">Executive Summary</div>
              <h2 className="text-2xl font-semibold text-[#111827] tracking-tight">This Week at a Glance</h2>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 bg-[#F8F9FC] p-3.5 rounded-[16px] border border-[#E5E7EB]">
                <span className="px-3 py-1 bg-[#ECFDF3] text-[#22C55E] font-semibold text-xs rounded-full border border-emerald-200">
                  {activeWeekly.statusBadge}
                </span>
                <div className="flex items-center gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= activeWeekly.rating ? 'fill-amber-400 text-amber-400' : 'text-[#D0D5DD]'}`} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <div className="bg-[#F8F9FC] p-3 rounded-[14px] border border-[#E5E7EB]">
                  <div className="text-[11px] font-normal text-[#667085]">Weight Change</div>
                  <div className="text-lg font-semibold text-[#111827] mt-1">{convertDiff(activeWeekly.weightChangeKg)}</div>
                  <span className="text-[10px] font-medium text-[#22C55E]">This Week</span>
                </div>
                <div className="bg-[#F8F9FC] p-3 rounded-[14px] border border-[#E5E7EB]">
                  <div className="text-[11px] font-normal text-[#667085]">Lowest Weight</div>
                  <div className="text-lg font-semibold text-[#111827] mt-1">{convertWeight(activeWeekly.currentWeightKg)} <span className="text-xs">{unitLabel}</span></div>
                  <span className="text-[10px] font-medium text-[#6D4AFF]">Apr 12, 2026</span>
                </div>
                <div className="bg-[#F8F9FC] p-3 rounded-[14px] border border-[#E5E7EB]">
                  <div className="text-[11px] font-normal text-[#667085]">Adaptation</div>
                  <div className="text-lg font-semibold text-[#111827] mt-1">Excellent</div>
                  <span className="text-[10px] font-normal text-[#667085]">Dose step up</span>
                </div>
                <div className="bg-[#F8F9FC] p-3 rounded-[14px] border border-[#E5E7EB]">
                  <div className="text-[11px] font-normal text-[#667085]">Side Effects</div>
                  <div className="text-lg font-semibold text-[#111827] mt-1">Minimal</div>
                  <span className="text-[10px] font-medium text-[#22C55E]">Intensity: Low</span>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-[#F3F0FF] border border-purple-100 p-4 rounded-[16px]">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#6D4AFF]" />
                <h3 className="text-xs font-semibold text-[#6D4AFF]">AI Coach Summary</h3>
              </div>
              <p className="text-xs font-normal text-[#344054] leading-relaxed">
                {activeWeekly.executiveSummary}
              </p>
            </div>
          </div>

          {/* PAGE 3 — Your Week in Story */}
          <div className="w-full bg-white rounded-[24px] border border-[#E5E7EB] p-6 sm:p-7 relative flex flex-col justify-between shadow-xs min-h-[560px]">
            <div className="absolute top-4 right-4 bg-[#F8F9FC] text-[#111827] text-[11px] font-semibold w-7 h-7 rounded-full flex items-center justify-center border border-[#E5E7EB]">
              3
            </div>

            <div>
              <div className="text-[10px] font-semibold text-[#6D4AFF] tracking-wider mb-1">Your Week in Story</div>
              <h2 className="text-2xl font-semibold text-[#111827] tracking-tight">A Week in Your Life</h2>

              <div className="relative mt-4 space-y-3 pl-6 border-l-2 border-[#E5E7EB]">
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#6D4AFF] border-2 border-white" />
                  <span className="text-[10px] font-semibold text-[#667085]">Mon Apr 7</span>
                  <h4 className="text-xs font-semibold text-[#111827]">Dose Administered</h4>
                  <p className="text-[11px] font-normal text-[#667085]">Took 4.75 mg retatrutide. Body began adjusting smoothly.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#22C55E] border-2 border-white" />
                  <span className="text-[10px] font-semibold text-[#667085]">Tue Apr 8</span>
                  <h4 className="text-xs font-semibold text-[#111827]">Peak Control</h4>
                  <p className="text-[11px] font-normal text-[#667085]">Appetite suppression strong. Zero food noise throughout the day.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
                  <span className="text-[10px] font-semibold text-[#667085]">Wed Apr 9</span>
                  <h4 className="text-xs font-semibold text-[#111827]">High Energy</h4>
                  <p className="text-[11px] font-normal text-[#667085]">Felt active and energized. Met daily step and protein goals.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-white" />
                  <span className="text-[10px] font-semibold text-[#667085]">Fri Apr 11</span>
                  <h4 className="text-xs font-semibold text-[#111827]">Rebalancing Phase</h4>
                  <p className="text-[11px] font-normal text-[#667085]">Hunger returned gradually as medication level naturally tapered.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-[#F8F9FC] border border-[#E5E7EB] p-3.5 rounded-[16px] text-center">
              <p className="text-xs font-medium text-[#111827]">
                You listened to your body and stayed consistent every single day.
              </p>
            </div>
          </div>

          {/* PAGE 4 — Biggest Wins */}
          <div className="w-full bg-white rounded-[24px] border border-[#E5E7EB] p-6 sm:p-7 relative flex flex-col justify-between shadow-xs min-h-[560px]">
            <div className="absolute top-4 right-4 bg-[#F8F9FC] text-[#111827] text-[11px] font-semibold w-7 h-7 rounded-full flex items-center justify-center border border-[#E5E7EB]">
              4
            </div>

            <div>
              <div className="text-[10px] font-semibold text-[#6D4AFF] tracking-wider mb-1">Biggest Wins</div>
              <h2 className="text-2xl font-semibold text-[#111827] tracking-tight">You Owned This Week</h2>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-[#ECFDF3] border border-emerald-200 p-4 rounded-[16px]">
                  <div className="w-8 h-8 rounded-[16px] bg-white text-[#22C55E] flex items-center justify-center shadow-xs">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-semibold text-[#111827]">{convertDiff(activeWeekly.weightChangeKg)}</div>
                    <div className="text-[11px] font-semibold text-[#22C55E]">Weight Lost</div>
                  </div>
                </div>

                <div className="bg-[#F3F0FF] border border-purple-200 p-4 rounded-[16px]">
                  <div className="w-8 h-8 rounded-[16px] bg-white text-[#6D4AFF] flex items-center justify-center shadow-xs">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-semibold text-[#111827]">{convertWeight(activeWeekly.currentWeightKg)} <span className="text-xs">{unitLabel}</span></div>
                    <div className="text-[11px] font-semibold text-[#6D4AFF]">New Lowest Weight</div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 p-4 rounded-[16px]">
                  <div className="w-8 h-8 rounded-[16px] bg-white text-orange-600 flex items-center justify-center shadow-xs">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-semibold text-[#111827]">6 Days</div>
                    <div className="text-[11px] font-semibold text-orange-600">Check-in Streak</div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-[16px]">
                  <div className="w-8 h-8 rounded-[16px] bg-white text-blue-600 flex items-center justify-center shadow-xs">
                    <Target className="w-4 h-4" />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-semibold text-[#111827]">5 Days</div>
                    <div className="text-[11px] font-semibold text-blue-600">Hit Protein Goal</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-[#F8F9FC] border border-[#E5E7EB] p-3 rounded-[14px] text-center">
              <span className="text-xs font-normal text-[#667085]">Small daily choices. Big weekly wins.</span>
            </div>
          </div>

          {/* PAGE 5 — WEIGHT TREND */}
          <div className="w-full bg-white rounded-[24px] border border-[#E5E7EB] p-6 sm:p-7 relative flex flex-col justify-between shadow-xs min-h-[560px]">
            <div className="absolute top-4 right-4 bg-[#F8F9FC] text-[#111827] text-[11px] font-semibold w-7 h-7 rounded-full flex items-center justify-center border border-[#E5E7EB]">
              5
            </div>

            <div>
              <div className="text-[10px] font-semibold text-[#6D4AFF] tracking-wider mb-1">Your Weight Journey</div>
              <h2 className="text-2xl font-semibold text-[#111827] tracking-tight">The Big Picture</h2>

              <div className="bg-[#F8F9FC] p-3.5 rounded-[16px] border border-[#E5E7EB] mt-3 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#111827]">
                  <span>Total Loss</span>
                  <span className="text-[#22C55E]">{convertWeight(activeWeekly.totalLossKg)} {unitLabel}</span>
                </div>
                <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#6D4AFF] h-full rounded-full" style={{ width: `${activeWeekly.progressPercent}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-[#667085]">
                  <span>Goal Progress</span>
                  <span>{activeWeekly.progressPercent}% achieved</span>
                </div>
              </div>
            </div>

            <div className="bg-[#F3F0FF] border border-purple-100 p-4 rounded-[16px]">
              <div className="text-xs font-semibold text-[#6D4AFF] mb-1">AI Long-term Trend</div>
              <p className="text-xs text-[#344054]">
                Your downward trajectory is stable and healthy. Compounding habit consistency ensures steady fat loss while preserving lean body mass.
              </p>
            </div>
          </div>

          {/* PAGE 6 — MOTTO & CLOSING */}
          <div className="w-full bg-white rounded-[24px] border border-[#E5E7EB] p-6 sm:p-7 relative flex flex-col justify-between shadow-xs min-h-[560px]">
            <div className="absolute top-4 right-4 bg-[#F8F9FC] text-[#111827] text-[11px] font-semibold w-7 h-7 rounded-full flex items-center justify-center border border-[#E5E7EB]">
              6
            </div>

            <div>
              <div className="text-[10px] font-semibold text-[#6D4AFF] tracking-wider mb-1">Final Reflection</div>
              <h2 className="text-2xl font-semibold text-[#111827] tracking-tight">Your Week, Your Story</h2>

              <div className="mt-4 bg-[#F8F9FC] p-4 rounded-[16px] border border-[#E5E7EB]">
                <p className="text-xs font-medium text-[#111827] italic">
                  "{activeWeekly.motto}"
                </p>
              </div>
            </div>

            <div className="mt-4 text-center">
              <span className="text-xs font-normal text-[#667085]">See you next week. Keep moving forward!</span>
            </div>
          </div>
        </div>
      ) : (
        /* MONTHLY REPORT MAGAZINE */
        <div className={`gap-6 print:block print:space-y-6 ${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'flex flex-col items-center max-w-3xl mx-auto space-y-8'
        }`}>
          {/* MONTHLY PAGE 1 — COVER */}
          <div className="w-full bg-gradient-to-br from-[#FAF5FF] via-white to-[#F8F9FC] text-[#111827] rounded-[24px] border border-[#E5E7EB] p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-xs min-h-[560px]">
            <div className="absolute top-4 right-4 bg-[#6D4AFF] text-white text-[11px] font-semibold w-7 h-7 rounded-full flex items-center justify-center">
              1
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6D4AFF]" />
                <span className="text-xs font-semibold tracking-wider text-[#6D4AFF]">Monthly Retrospective</span>
              </div>

              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-semibold text-[#111827] tracking-tight">{activeMonthly.monthName.toUpperCase()} {activeMonthly.year}</h2>
                <p className="text-xs font-medium text-[#667085]">{activeMonthly.dateRangeStr}</p>
              </div>

              <h1 className="text-xl sm:text-2xl font-semibold text-[#111827] tracking-tight mt-3 leading-snug">
                {activeMonthly.subtitle}
              </h1>
            </div>

            <div className="my-4 p-4 bg-white rounded-[16px] border border-[#E5E7EB] space-y-3">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-[#667085]">Monthly Dose</span>
                <span className="text-[#6D4AFF] font-semibold">{activeMonthly.medication}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-[#667085]">Monthly Weight Lost</span>
                <span className="text-[#22C55E] font-semibold">{convertDiff(activeMonthly.weightChangeKg)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-[#667085]">Avg Weekly Loss</span>
                <span className="text-[#111827] font-semibold">{convertWeight(Math.abs(activeMonthly.avgWeeklyLossKg))} {unitLabel}/week</span>
              </div>
            </div>

            <div className="bg-[#F8F9FC] border border-[#E5E7EB] p-3 rounded-[14px] text-center">
              <p className="text-xs font-normal text-[#667085] italic">
                "{activeMonthly.quote}"
              </p>
            </div>
          </div>

          {/* MONTHLY PAGE 2 — Executive Summary */}
          <div className="w-full bg-white rounded-[24px] border border-[#E5E7EB] p-6 sm:p-7 relative flex flex-col justify-between shadow-xs min-h-[560px]">
            <div className="absolute top-4 right-4 bg-[#F8F9FC] text-[#111827] text-[11px] font-semibold w-7 h-7 rounded-full flex items-center justify-center border border-[#E5E7EB]">
              2
            </div>

            <div>
              <div className="text-[10px] font-semibold text-[#6D4AFF] tracking-wider mb-1">Month in Review</div>
              <h2 className="text-2xl font-semibold text-[#111827] tracking-tight">Executive Monthly Summary</h2>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 bg-[#F8F9FC] p-3.5 rounded-[16px] border border-[#E5E7EB]">
                <span className="px-3 py-1 bg-[#ECFDF3] text-[#22C55E] font-semibold text-xs rounded-full border border-emerald-200">
                  {activeMonthly.statusBadge}
                </span>
                <div className="flex items-center gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= activeMonthly.rating ? 'fill-amber-400 text-amber-400' : 'text-[#D0D5DD]'}`} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <div className="bg-[#F8F9FC] p-3 rounded-[14px] border border-[#E5E7EB]">
                  <div className="text-[11px] font-normal text-[#667085]">Monthly Change</div>
                  <div className="text-lg font-semibold text-[#111827] mt-1">{convertDiff(activeMonthly.weightChangeKg)}</div>
                  <span className="text-[10px] font-medium text-[#22C55E]">Full Month</span>
                </div>
                <div className="bg-[#F8F9FC] p-3 rounded-[14px] border border-[#E5E7EB]">
                  <div className="text-[11px] font-normal text-[#667085]">Total Loss</div>
                  <div className="text-lg font-semibold text-[#111827] mt-1">{convertWeight(activeMonthly.totalLossKg)} <span className="text-xs">{unitLabel}</span></div>
                  <span className="text-[10px] font-normal text-[#667085]">Since Start</span>
                </div>
                <div className="bg-[#F8F9FC] p-3 rounded-[14px] border border-[#E5E7EB]">
                  <div className="text-[11px] font-normal text-[#667085]">Check-ins</div>
                  <div className="text-lg font-semibold text-[#111827] mt-1">28 / 30</div>
                  <span className="text-[10px] font-medium text-[#22C55E]">93% Log Rate</span>
                </div>
                <div className="bg-[#F8F9FC] p-3 rounded-[14px] border border-[#E5E7EB]">
                  <div className="text-[11px] font-normal text-[#667085]">Dose On-Time</div>
                  <div className="text-lg font-semibold text-[#111827] mt-1">100%</div>
                  <span className="text-[10px] font-medium text-[#6D4AFF]">4 Injections</span>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-[#F3F0FF] border border-purple-100 p-4 rounded-[16px]">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-[#6D4AFF]" />
                <h3 className="text-xs font-semibold text-[#6D4AFF]">AI Coach Monthly Assessment</h3>
              </div>
              <p className="text-xs font-normal text-[#344054] leading-relaxed">
                {activeMonthly.executiveSummary}
              </p>
            </div>
          </div>

          {/* MONTHLY PAGE 3 — 4 Weeks in Review */}
          <div className="w-full bg-white rounded-[24px] border border-[#E5E7EB] p-6 sm:p-7 relative flex flex-col justify-between shadow-xs min-h-[560px]">
            <div className="absolute top-4 right-4 bg-[#F8F9FC] text-[#111827] text-[11px] font-semibold w-7 h-7 rounded-full flex items-center justify-center border border-[#E5E7EB]">
              3
            </div>

            <div>
              <div className="text-[10px] font-semibold text-[#6D4AFF] tracking-wider mb-1">4 Weeks in Review</div>
              <h2 className="text-2xl font-semibold text-[#111827] tracking-tight">Your Monthly Progression</h2>

              <div className="mt-4 space-y-3">
                {activeMonthly.weeksBreakdown.map((w, idx) => (
                  <div key={idx} className="bg-[#F8F9FC] p-3.5 rounded-[14px] border border-[#E5E7EB] flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-[#6D4AFF]">{w.weekLabel}</span>
                      <h4 className="text-xs font-semibold text-[#111827]">{w.title}</h4>
                      <p className="text-[11px] font-normal text-[#667085] mt-0.5">{w.description}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#22C55E] shrink-0">{convertDiff(w.lossKg)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 bg-[#F8F9FC] border border-[#E5E7EB] p-3.5 rounded-[16px] text-center">
              <p className="text-xs font-medium text-[#111827]">
                Four consecutive weeks of steady habits build a life-long transformation.
              </p>
            </div>
          </div>

          {/* MONTHLY PAGE 4 — Biggest Monthly Wins */}
          <div className="w-full bg-white rounded-[24px] border border-[#E5E7EB] p-6 sm:p-7 relative flex flex-col justify-between shadow-xs min-h-[560px]">
            <div className="absolute top-4 right-4 bg-[#F8F9FC] text-[#111827] text-[11px] font-semibold w-7 h-7 rounded-full flex items-center justify-center border border-[#E5E7EB]">
              4
            </div>

            <div>
              <div className="text-[10px] font-semibold text-[#6D4AFF] tracking-wider mb-1">Biggest Monthly Wins</div>
              <h2 className="text-2xl font-semibold text-[#111827] tracking-tight">Monthly Accomplishments</h2>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-[#ECFDF3] border border-emerald-200 p-4 rounded-[16px]">
                  <div className="w-8 h-8 rounded-[16px] bg-white text-[#22C55E] flex items-center justify-center shadow-xs">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-semibold text-[#111827]">{convertDiff(activeMonthly.weightChangeKg)}</div>
                    <div className="text-[11px] font-semibold text-[#22C55E]">Monthly Loss</div>
                  </div>
                </div>

                <div className="bg-[#F3F0FF] border border-purple-200 p-4 rounded-[16px]">
                  <div className="w-8 h-8 rounded-[16px] bg-white text-[#6D4AFF] flex items-center justify-center shadow-xs">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-semibold text-[#111827]">{convertWeight(activeMonthly.currentWeightKg)} <span className="text-xs">{unitLabel}</span></div>
                    <div className="text-[11px] font-semibold text-[#6D4AFF]">Lowest Weight Hit</div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 p-4 rounded-[16px]">
                  <div className="w-8 h-8 rounded-[16px] bg-white text-orange-600 flex items-center justify-center shadow-xs">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-semibold text-[#111827]">93%</div>
                    <div className="text-[11px] font-semibold text-orange-600">30-day Consistency</div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-[16px]">
                  <div className="w-8 h-8 rounded-[16px] bg-white text-blue-600 flex items-center justify-center shadow-xs">
                    <Target className="w-4 h-4" />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-semibold text-[#111827]">22 Days</div>
                    <div className="text-[11px] font-semibold text-blue-600">Hit Protein Target</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-[#F8F9FC] border border-[#E5E7EB] p-3 rounded-[14px] text-center">
              <span className="text-xs font-normal text-[#667085]">"{activeMonthly.motto}"</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
