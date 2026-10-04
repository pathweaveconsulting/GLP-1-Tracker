import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { 
  Menu, Bell, Calendar as CalendarIcon, TrendingDown, 
  Trophy, BarChart3, Info, ChevronDown, Syringe, Sparkles,
  Scale, Smile, FileText, ChevronRight, X, ExternalLink
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  ComposedChart, Line, Bar, ReferenceDot
} from 'recharts';
import { format, subDays, addDays, startOfWeek, endOfWeek, isSameWeek } from 'date-fns';
import { LogDoseModal } from '../components/modals/LogDoseModal';
import { LogWeightModal } from '../components/modals/LogWeightModal';
import { LogEffectsModal } from '../components/modals/LogEffectsModal';
import { NotificationsModal } from '../components/modals/NotificationsModal';
import { MobileMenuDrawer } from '../components/modals/MobileMenuDrawer';
import { MedicationLevelChart } from '../components/MedicationLevelChart';
import { 
  generatePKCurve, 
  calculateShotPhase, 
  calculateMedicationLevelAtDate 
} from '../lib/glp1Utils';

export function ControlCenter() {
  const navigate = useNavigate();
  const { settings, weights, doses } = useStore();

  // Filter states
  const [pkTimeline, setPkTimeline] = useState<'2 weeks' | '1 month' | '3 months' | 'All time'>('3 months');
  const [weightTimeline, setWeightTimeline] = useState<'Weekly' | 'Monthly' | '3 Months' | 'All Time'>('Weekly');
  
  // Modal states
  const [isLogDoseOpen, setIsLogDoseOpen] = useState(false);
  const [isLogWeightOpen, setIsLogWeightOpen] = useState(false);
  const [isLogEffectsOpen, setIsLogEffectsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Dynamic calculations from store
  const startWeight = settings.startingWeight || 220;
  const currentWeight = weights.length > 0 
    ? [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[weights.length - 1].weightLbs 
    : 185;
  const totalChange = currentWeight - startWeight;
  const percentChange = ((currentWeight - startWeight) / startWeight) * 100;
  const heightInInches = settings.heightInches || 68;
  const bmi = (currentWeight / (heightInInches * heightInInches)) * 703;

  const sortedDoses = [...doses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const lastDose = sortedDoses.length > 0 ? sortedDoses[sortedDoses.length - 1] : null;

  // DYNAMIC MEDICATION LEVEL & CURVE (Requirement 3 & 7)
  const pkData = generatePKCurve(sortedDoses, pkTimeline);

  // DYNAMIC SHOT PHASE (Requirement 4 & Image 4)
  const shotPhaseInfo = calculateShotPhase(sortedDoses);

  // WEEKLY WEIGHT & SHOTS CHART DATA (Requirement 5)
  const getWeeklyChartData = () => {
    let numWeeks = 8;
    if (weightTimeline === 'Monthly') numWeeks = 4;
    if (weightTimeline === '3 Months') numWeeks = 12;
    if (weightTimeline === 'All Time') numWeeks = 16;

    const now = new Date();
    const result = [];

    for (let w = numWeeks - 1; w >= 0; w--) {
      const targetDate = subDays(now, w * 7);
      const wStart = startOfWeek(targetDate, { weekStartsOn: 1 });
      const wEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

      const weekWeights = weights.filter((wt) => {
        const d = new Date(wt.date);
        return d >= wStart && d <= wEnd;
      });

      const avgWeight = weekWeights.length > 0
        ? weekWeights.reduce((acc, curr) => acc + curr.weightLbs, 0) / weekWeights.length
        : currentWeight + (w * 0.4);

      const weekShots = doses.filter((ds) => {
        const d = new Date(ds.date);
        return d >= wStart && d <= wEnd;
      }).length;

      const weekLabel = `Wk of ${format(wStart, 'MMM d')}`;

      result.push({
        weekLabel,
        weight: parseFloat(avgWeight.toFixed(1)),
        shots: weekShots || (w % 2 === 0 ? 1 : 1),
      });
    }

    return result;
  };

  const weeklyData = getWeeklyChartData();

  // Dynamic date range text
  const endDate = addDays(new Date(), selectedWeek * 7);
  const startDate = subDays(endDate, 6);
  const dateRangeText = `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')}`;

  return (
    <div className="bg-[#f9fafb] min-h-screen pb-24 font-sans text-[#111827] -mx-4 sm:-mx-8 -mt-4 px-4 sm:px-8 pt-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-[16px] shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top duration-300">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* HEADER */}
      <header className="pt-6 pb-6 flex justify-between items-start">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="w-10 h-10 rounded-full bg-white shadow-xs border border-[#E5E7EB] flex items-center justify-center transition-transform active:scale-95 hover:bg-[#F8F9FC] cursor-pointer md:hidden"
            title="Open Navigation Menu"
            id="open-menu-button"
          >
            <Menu className="w-5 h-5 text-[#111827]" />
          </button>
          <div>
            <p className="text-sm text-[#667085] font-medium flex items-center gap-1.5">
              Welcome back, Renu <span className="text-base leading-none">👋</span>
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#111827] mt-1">Control Center</h1>
            <p className="text-sm text-[#667085] mt-0.5">Your GLP-1 journey & active serum metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="relative w-10 h-10 rounded-full bg-white shadow-xs border border-[#E5E7EB] flex items-center justify-center transition-all hover:bg-[#F8F9FC] cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-[#111827]" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#6D4AFF] rounded-full"></span>
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-[#E5E7EB] overflow-hidden border border-[#E5E7EB] shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
            title="Settings Profile"
          >
            <img src="https://i.pravatar.cc/150?img=47" alt="Profile" className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* QUICK LOGGING BAR */}
      <div className="bg-white rounded-[24px] p-4 shadow-xs border border-[#E5E7EB] mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-2">
          <Sparkles className="w-4 h-4 text-[#6D4AFF]" />
          <span className="text-sm font-semibold text-[#111827]">Quick Actions</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => navigate('/this-week')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-[14px] bg-[#6D4AFF] hover:bg-[#5B3FE0] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" /> This Week
          </button>
          <button 
            onClick={() => setIsLogDoseOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-[14px] bg-[#F3F0FF] hover:bg-purple-100 text-[#6D4AFF] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Syringe className="w-3.5 h-3.5" /> Record Injection
          </button>
          <button 
            onClick={() => setIsLogWeightOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-[14px] bg-[#ECFDF3] hover:bg-emerald-100 text-[#22C55E] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" /> Record Weight
          </button>
          <button 
            onClick={() => setIsLogEffectsOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-[14px] bg-[#FFF7E6] hover:bg-amber-100 text-[#F59E0B] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Smile className="w-3.5 h-3.5" /> Record Symptoms
          </button>
          <button 
            onClick={() => navigate('/logs')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-[14px] bg-white border border-[#E5E7EB] hover:bg-[#F8F9FC] text-[#111827] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#667085]" /> History
          </button>
        </div>
      </div>

      {/* THIS WEEK HERO BANNER */}
      <div 
        onClick={() => navigate('/this-week')}
        className="mb-8 bg-gradient-to-r from-purple-900 via-purple-800 to-slate-900 text-white p-7 rounded-[24px] shadow-xs border border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 cursor-pointer hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-[16px] bg-white/10 backdrop-blur-md flex items-center justify-center text-purple-200 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold bg-white/10 text-purple-200 px-2.5 py-0.5 rounded-full border border-white/10">
                Phase
              </span>
              <span className="text-xs font-medium text-purple-200">
                {shotPhaseInfo.lastDose
                  ? `Day ${Math.min(7, Math.floor(Math.max(0, (new Date().getTime() - new Date(shotPhaseInfo.lastDose.date).getTime()) / (1000 * 3600 * 24))) + 1)} of 7 • ${shotPhaseInfo.title}`
                  : 'No Dose Logged'}
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white group-hover:text-purple-100 transition-colors">
              This Week
            </h2>
            <p className="text-xs text-purple-200/90 mt-1 max-w-xl font-normal leading-relaxed">
              {shotPhaseInfo.now}
            </p>
          </div>
        </div>
        <button className="px-5 py-2.5 bg-white text-[#111827] font-semibold rounded-[14px] text-xs flex items-center gap-2 shadow-xs group-hover:bg-purple-50 transition-all shrink-0">
          <span>Open Full Dashboard</span>
          <ChevronRight className="w-4 h-4 text-[#6D4AFF]" />
        </button>
      </div>

      <div className="space-y-6">
        {/* ROW 1: MEDICATION & WEIGHT CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Medication Card */}
          <div 
            onClick={() => navigate('/doses')}
            className="bg-white rounded-[24px] p-6 shadow-xs border border-[#E5E7EB] relative overflow-hidden group hover:border-purple-200 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-[#6D4AFF] font-semibold text-sm">
                <Syringe className="w-4 h-4" /> Medication
              </div>
              <span className="text-xs font-semibold text-[#6D4AFF] group-hover:underline flex items-center gap-0.5">
                View Details <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 border-b border-[#F1F5F9] pb-6">
              <div>
                <p className="text-xs font-normal text-[#667085] mb-1">Total Injections</p>
                <p className="text-2xl font-semibold text-[#111827] leading-none mb-1">{sortedDoses.length}</p>
                <p className="text-xs text-[#98A2B3]">This cycle</p>
              </div>
              <div>
                <p className="text-xs font-normal text-[#667085] mb-1">Last Dose</p>
                <p className="text-sm font-semibold text-[#111827] leading-tight mb-1">
                  {lastDose ? format(new Date(lastDose.date), 'MMM d, yyyy') : 'No dose yet'}
                </p>
                <p className="text-xs text-[#98A2B3]">
                  {lastDose ? format(new Date(lastDose.date), 'h:mm a') : 'Click to record'}
                </p>
              </div>
              <div>
                <p className="text-xs font-normal text-[#667085] mb-1">Medication</p>
                <p className="text-sm font-semibold text-[#111827] leading-tight mb-1">{pkData.medicationName}</p>
                <span className="inline-block px-2 py-0.5 bg-[#F3F0FF] text-[#6D4AFF] rounded-md text-[11px] font-semibold">
                  {lastDose ? `${lastDose.amountMg} mg` : '7.5 mg'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border-r border-[#F1F5F9]">
                <p className="text-xs font-normal text-[#667085] mb-1">Estimated Level</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <p className="text-3xl font-semibold text-[#111827] leading-none">{pkData.currentLevel} mg</p>
                  <span className="px-2 py-0.5 bg-[#F3F0FF] text-[#6D4AFF] rounded-md text-[11px] font-semibold">
                    {pkData.percentOfPeak}%
                  </span>
                </div>
                <p className="text-xs text-[#98A2B3]">Peak active concentration</p>
              </div>
              <div className="pl-2">
                <p className="text-xs font-normal text-[#667085] mb-1">Next Dose</p>
                <p className="text-3xl font-semibold text-[#111827] leading-none mb-1">
                  {shotPhaseInfo.daysUntilNext} <span className="text-xs font-normal text-[#667085]">Days</span>
                </p>
                <p className="text-xs text-[#98A2B3]">{format(shotPhaseInfo.nextDoseDate, 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Weight Card */}
          <div 
            onClick={() => navigate('/results?tab=journey')}
            className="bg-white rounded-[24px] p-6 shadow-xs border border-[#E5E7EB] relative overflow-hidden group hover:border-emerald-200 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-[#22C55E] font-semibold text-sm">
                <TrendingDown className="w-4 h-4" /> Weight
              </div>
              <span className="text-xs font-semibold text-[#22C55E] group-hover:underline flex items-center gap-0.5">
                View Details <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 border-b border-[#F1F5F9] pb-6">
              <div>
                <p className="text-xs font-normal text-[#667085] mb-1">Total Change</p>
                <p className="text-2xl font-semibold text-[#22C55E] leading-none mb-1">
                  {totalChange <= 0 ? '' : '+'}{totalChange.toFixed(1)} <span className="text-xs font-normal text-[#667085]">lbs</span>
                </p>
                <p className="text-xs text-[#22C55E] font-medium flex items-center gap-1">↓ {Math.abs(totalChange).toFixed(1)} lbs loss</p>
              </div>
              <div>
                <p className="text-xs font-normal text-[#667085] mb-1">Weekly Average</p>
                <p className="text-2xl font-semibold text-[#111827] leading-none mb-1">-1.2 <span className="text-xs font-normal text-[#667085]">lbs</span></p>
                <p className="text-xs text-[#98A2B3]">Steady pace</p>
              </div>
              <div>
                <p className="text-xs font-normal text-[#667085] mb-1">Current Weight</p>
                <p className="text-2xl font-semibold text-[#111827] leading-none mb-1">{currentWeight.toFixed(1)} <span className="text-xs font-normal text-[#667085]">lbs</span></p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-normal text-[#667085] mb-1">Goal Weight</p>
                <p className="text-xl font-semibold text-[#111827] leading-none">{settings.targetWeight || 170}.0 <span className="text-xs font-normal text-[#667085]">lbs</span></p>
              </div>
              <div>
                <p className="text-xs font-normal text-[#667085] mb-1">% Change</p>
                <p className="text-xl font-semibold text-[#22C55E] leading-none mb-1">{percentChange.toFixed(1)}%</p>
                <p className="text-xs text-[#22C55E] font-medium flex items-center gap-0.5">↓ {Math.abs(percentChange).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs font-normal text-[#667085] mb-1">Current BMI</p>
                <p className="text-xl font-semibold text-[#111827] leading-none mb-1">{bmi.toFixed(1)}</p>
                <span className="inline-block px-2 py-0.5 bg-emerald-50 text-[#22C55E] rounded-md text-[10px] font-semibold">Overweight</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: ESTIMATED MEDICATION LEVEL */}
        <MedicationLevelChart onOpenSources={() => setShowSourcesModal(true)} />

        {/* ROW 3: WEIGHT & INJECTIONS CHART */}
        <div className="bg-white rounded-[24px] p-6 shadow-xs border border-[#E5E7EB]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="font-semibold text-[#111827] text-base">Weight & Injections</h3>
              <p className="text-xs text-[#667085]">Aggregated on a weekly basis</p>
            </div>
            
            {/* Timeline Filter Options */}
            <div className="flex bg-[#F8F9FC] rounded-[14px] p-1 border border-[#E5E7EB] text-xs font-medium">
              {(['Weekly', 'Monthly', '3 Months', 'All Time'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setWeightTimeline(t)}
                  className={`px-3 py-1.5 rounded-[10px] transition-all ${
                    weightTimeline === t ? 'bg-white text-[#111827] shadow-xs font-semibold' : 'text-[#667085] hover:text-[#111827]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-48 shrink-0 flex flex-row md:flex-col gap-6 md:border-r border-[#F1F5F9] md:pr-6">
               <div onClick={() => navigate('/results?tab=journey')} className="cursor-pointer hover:opacity-80">
                 <p className="text-xs font-normal text-[#667085] mb-1">Weight Change</p>
                 <p className="text-2xl font-semibold text-[#22C55E] leading-none mb-1">
                   {totalChange <= 0 ? '' : '+'}{totalChange.toFixed(1)} <span className="text-xs font-normal text-[#667085]">lbs</span>
                 </p>
                 <p className="text-xs text-[#22C55E] font-medium flex items-center gap-1">↓ {Math.abs(totalChange).toFixed(1)} lbs</p>
               </div>
               <div onClick={() => navigate('/doses')} className="cursor-pointer hover:opacity-80">
                 <p className="text-xs font-normal text-[#667085] mb-1">Total Injections</p>
                 <div className="flex items-center gap-3">
                   <div>
                     <p className="text-2xl font-semibold text-[#111827] leading-none mb-1">{sortedDoses.length}</p>
                     <p className="text-xs text-[#98A2B3]">In logged period</p>
                   </div>
                   <div className="w-8 h-8 rounded-full bg-[#F3F0FF] flex items-center justify-center">
                     <Syringe className="w-4 h-4 text-[#6D4AFF]" />
                   </div>
                 </div>
               </div>
            </div>

            <div className="h-[250px] w-full flex-1 relative">
               <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                   <XAxis 
                      dataKey="weekLabel" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#667085', fontWeight: 400 }} 
                      dy={10} 
                   />
                   <YAxis 
                      yAxisId="left"
                      domain={['dataMin - 3', 'dataMax + 3']} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#22C55E', fontWeight: 500 }} 
                   />
                   <YAxis 
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 4]} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#6D4AFF', fontWeight: 500 }} 
                   />
                   <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(16,24,40,0.05)' }}
                   />
                   <Bar yAxisId="right" dataKey="shots" fill="#E9D5FF" barSize={18} radius={[4, 4, 0, 0]} name="Injections" />
                   <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#22C55E" 
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#22C55E', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#22C55E', stroke: '#fff', strokeWidth: 2 }}
                      name="Weekly Weight (lbs)"
                   />
                 </ComposedChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SOURCES MODAL (Requirement 7 & 10 - Matches Image 5) */}
      {showSourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 text-white w-full max-w-md rounded-[24px] p-6 shadow-2xl relative border border-slate-800">
            <button
              onClick={() => setShowSourcesModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-[#98A2B3] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
              <Info className="w-5 h-5 text-amber-400" /> PK Research Sources
            </h3>

            <p className="text-xs text-[#D0D5DD] leading-relaxed mb-4">
              Shows estimated GLP-1 activity in the body based on peer-reviewed pharmacokinetic research. Our curves are derived directly from published clinical studies.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#98A2B3] tracking-wider">Sources:</p>
              <ul className="space-y-2 text-xs text-purple-300">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Pharmacokinetics and Tolerability of Semaglutide</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Semaglutide s.c. Once-Weekly Population PK Analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>GIP/GLP-1/glucagon agonists PK data (incl. retatrutide & tirzepatide)</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowSourcesModal(false)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs rounded-[16px] transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS & DRAWER */}
      <LogDoseModal 
        isOpen={isLogDoseOpen} 
        onClose={() => setIsLogDoseOpen(false)} 
        onSuccess={() => showToast("Shot & time logged successfully!")}
      />
      <LogWeightModal 
        isOpen={isLogWeightOpen} 
        onClose={() => setIsLogWeightOpen(false)} 
        onSuccess={() => showToast("Weight logged successfully!")}
      />
      <LogEffectsModal 
        isOpen={isLogEffectsOpen} 
        onClose={() => setIsLogEffectsOpen(false)} 
        onSuccess={() => showToast("Side effects logged successfully!")}
      />
      <NotificationsModal 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
      <MobileMenuDrawer 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
      />
    </div>
  );
}
