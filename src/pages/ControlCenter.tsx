import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { 
  Menu, Bell, TrendingDown, 
  Syringe, Sparkles,
  Scale, Smile, FileText, ChevronRight, Settings as SettingsIcon
} from 'lucide-react';
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  ComposedChart, Line, Bar
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { LogDoseModal } from '../components/modals/LogDoseModal';
import { LogWeightModal } from '../components/modals/LogWeightModal';
import { LogEffectsModal } from '../components/modals/LogEffectsModal';
import { NotificationsModal } from '../components/modals/NotificationsModal';
import { MobileMenuDrawer } from '../components/modals/MobileMenuDrawer';
import { OtherMedicationNote } from '../components/OtherMedicationNote';
import { PkInfoModal } from '../components/PkInfoModal';
import { MedicationLevelChart } from '../components/MedicationLevelChart';
import { generatePKCurve, calculateShotPhase } from '../lib/glp1Utils';
import { bmi as calcBmi, bmiCategory, formatWeight, formatWeightChange, getWeightUnit, lbsToDisplay } from '../lib/units';
import { latestWeight, nextDoseInfo, sortByDate, weeklyRate } from '../lib/insights';
import { buildNotifications } from '../lib/notifications';
import { useToast } from '../components/ui/Toast';

export function ControlCenter() {
  const navigate = useNavigate();
  const { settings, weights, doses, effects } = useStore();

  // Filter states
  const [weightTimeline, setWeightTimeline] = useState<'Weekly' | 'Monthly' | '3 Months' | 'All Time'>('Weekly');
  
  // Modal states
  const [isLogDoseOpen, setIsLogDoseOpen] = useState(false);
  const [isLogWeightOpen, setIsLogWeightOpen] = useState(false);
  const [isLogEffectsOpen, setIsLogEffectsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const { show: showToast } = useToast();

  // Everything below comes from the user's own logs; missing data stays missing (null / "–").
  const unit = getWeightUnit(settings);
  const latest = latestWeight(weights);
  const currentWeight = latest ? latest.weightLbs : null;
  const startWeight = settings.startingWeight > 0 ? settings.startingWeight : sortByDate(weights)[0]?.weightLbs ?? null;
  const totalChange = currentWeight != null && startWeight != null ? currentWeight - startWeight : null;
  const percentChange = totalChange != null && startWeight ? (totalChange / startWeight) * 100 : null;
  const bmi = calcBmi(currentWeight, settings.heightInches);
  const bmiLabel = bmiCategory(bmi);
  const rate = weeklyRate(weights);
  const changeClass = totalChange == null || totalChange === 0 ? 'text-[#111827]' : totalChange < 0 ? 'text-positive' : 'text-slate-600';
  const arrow = totalChange == null || totalChange === 0 ? '' : totalChange < 0 ? '↓' : '↑';

  const sortedDoses = sortByDate(doses);
  const lastDose = sortedDoses.length > 0 ? sortedDoses[sortedDoses.length - 1] : null;
  const next = nextDoseInfo(doses);
  const notificationCount = buildNotifications({ doses, weights, effects, settings }).length;

  // Estimated medication level for the most recently dosed medication
  const pkData = generatePKCurve(sortedDoses, '2 weeks');
  const shotPhaseInfo = calculateShotPhase(sortedDoses);

  // Weekly weight & injections chart: weeks without a weigh-in stay empty (no invented points)
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
      const avgLbs = weekWeights.length > 0 ? weekWeights.reduce((acc, curr) => acc + curr.weightLbs, 0) / weekWeights.length : null;
      const weekShots = doses.filter((ds) => {
        const d = new Date(ds.date);
        return d >= wStart && d <= wEnd;
      }).length;
      result.push({
        weekLabel: `Wk of ${format(wStart, 'MMM d')}`,
        weight: avgLbs == null ? null : lbsToDisplay(avgLbs, unit),
        shots: weekShots,
      });
    }
    return result;
  };
  const weeklyData = getWeeklyChartData();
  const chartHasWeight = weeklyData.some((d) => d.weight != null);

  return (
    <div className="bg-[#f9fafb] min-h-screen pb-24 font-sans text-[#111827] -mx-4 sm:-mx-8 -mt-4 px-4 sm:px-8 pt-4">
      {/* HEADER */}
      <header className="pt-6 pb-6 flex justify-between items-start">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="w-10 h-10 rounded-full bg-white shadow-xs border border-[#E5E7EB] flex items-center justify-center transition-transform active:scale-95 hover:bg-[#F8F9FC] cursor-pointer md:hidden"
            aria-label="Open navigation menu"
            id="open-menu-button"
          >
            <Menu className="w-5 h-5 text-[#111827]" />
          </button>
          <div>
            <p className="text-sm text-muted font-medium flex items-center gap-1.5">
              Welcome back <span className="text-base leading-none" aria-hidden="true">👋</span>
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#111827] mt-1">Control Center</h1>
            <p className="text-sm text-muted mt-0.5">Your GLP-1 journey & active serum metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="relative w-10 h-10 rounded-full bg-white shadow-xs border border-[#E5E7EB] flex items-center justify-center transition-all hover:bg-[#F8F9FC] cursor-pointer"
            aria-label={notificationCount > 0 ? `Notifications (${notificationCount})` : 'Notifications'}
          >
            <Bell className="w-4 h-4 text-[#111827]" aria-hidden="true" />
            {notificationCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-[#6D4AFF] rounded-full" aria-hidden="true"></span>}
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-white border border-[#E5E7EB] shadow-xs hover:bg-[#F8F9FC] transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Settings and profile"
          >
            <SettingsIcon className="w-4 h-4 text-[#111827]" aria-hidden="true" />
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
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-[14px] bg-[#ECFDF3] hover:bg-emerald-100 text-positive text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" /> Record Weight
          </button>
          <button 
            onClick={() => setIsLogEffectsOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-[14px] bg-[#FFF7E6] hover:bg-amber-100 text-caution text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Smile className="w-3.5 h-3.5" /> Record Symptoms
          </button>
          <button 
            onClick={() => navigate('/logs')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-[14px] bg-white border border-[#E5E7EB] hover:bg-[#F8F9FC] text-[#111827] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-muted" /> History
          </button>
        </div>
      </div>

      {/* THIS WEEK HERO BANNER */}
      <Link 
        to="/this-week"
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
        <span className="px-5 py-2.5 bg-white text-[#111827] font-semibold rounded-[14px] text-xs flex items-center gap-2 shadow-xs group-hover:bg-purple-50 transition-all shrink-0">
          <span>Open Full Dashboard</span>
          <ChevronRight className="w-4 h-4 text-[#6D4AFF]" aria-hidden="true" />
        </span>
      </Link>

      <div className="space-y-6">
        {/* ROW 1: MEDICATION & WEIGHT CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Medication Card */}
          <Link 
            to="/doses"
            className="block bg-white rounded-[24px] p-6 shadow-xs border border-[#E5E7EB] relative overflow-hidden group hover:border-purple-200 transition-all"
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
                <p className="text-xs font-normal text-muted mb-1">Total Injections</p>
                <p className="text-2xl font-semibold text-[#111827] leading-none mb-1">{sortedDoses.length}</p>
                <p className="text-xs text-subtle">Logged so far</p>
              </div>
              <div>
                <p className="text-xs font-normal text-muted mb-1">Last Dose</p>
                <p className="text-sm font-semibold text-[#111827] leading-tight mb-1">
                  {lastDose ? format(new Date(lastDose.date), 'MMM d, yyyy') : 'No dose yet'}
                </p>
                <p className="text-xs text-subtle">
                  {lastDose ? format(new Date(lastDose.date), 'h:mm a') : 'Click to record'}
                </p>
              </div>
              <div>
                <p className="text-xs font-normal text-muted mb-1">Medication</p>
                <p className="text-sm font-semibold text-[#111827] leading-tight mb-1">{lastDose ? lastDose.medication : '–'}</p>
                {lastDose && (
                  <span className="inline-block px-2 py-0.5 bg-[#F3F0FF] text-[#6D4AFF] rounded-md text-[11px] font-semibold">
                    {lastDose.amountMg} mg
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border-r border-[#F1F5F9]">
                <p className="text-xs font-normal text-muted mb-1">Estimated Level</p>
                {lastDose && !pkData.modelled ? (
                  <p className="text-sm text-muted">No estimate for this medication</p>
                ) : lastDose ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-1">
                      <p className="text-3xl font-semibold text-[#111827] leading-none">{pkData.currentLevel} mg</p>
                      <span className="px-2 py-0.5 bg-[#F3F0FF] text-[#6D4AFF] rounded-md text-[11px] font-semibold">
                        {pkData.percentOfPeak}%
                      </span>
                    </div>
                    <p className="text-xs text-subtle">Simplified model, not a blood test</p>
                  </>
                ) : (
                  <p className="text-sm text-muted">Log a dose to see an estimate</p>
                )}
              </div>
              <div className="pl-2">
                <p className="text-xs font-normal text-muted mb-1">Next Dose</p>
                {next.dueDate && next.daysUntil != null ? (
                  <>
                    <p className="text-3xl font-semibold text-[#111827] leading-none mb-1">
                      {next.daysUntil >= 0 ? next.daysUntil : Math.abs(next.daysUntil)} <span className="text-xs font-normal text-muted">{next.daysUntil < 0 ? 'days overdue' : next.daysUntil === 1 ? 'day' : 'days'}</span>
                    </p>
                    <p className="text-xs text-subtle">{format(next.dueDate, 'MMM d, yyyy')} · if you dose weekly</p>
                  </>
                ) : (
                  <p className="text-sm text-muted">{lastDose ? 'No set schedule for this medication' : 'Log a dose to see this'}</p>
                )}
              </div>
            </div>
            <OtherMedicationNote medication={lastDose?.medication} className="mt-4" />
          </Link>

          {/* Weight Card */}
          <Link 
            to="/results?tab=journey"
            className="block bg-white rounded-[24px] p-6 shadow-xs border border-[#E5E7EB] relative overflow-hidden group hover:border-emerald-200 transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-positive font-semibold text-sm">
                <TrendingDown className="w-4 h-4" /> Weight
              </div>
              <span className="text-xs font-semibold text-positive group-hover:underline flex items-center gap-0.5">
                View Details <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 border-b border-[#F1F5F9] pb-6">
              <div>
                <p className="text-xs font-normal text-muted mb-1">Total Change</p>
                <p className={`text-2xl font-semibold leading-none mb-1 ${changeClass}`}>
                  {formatWeightChange(totalChange, unit, { unit: false })} <span className="text-xs font-normal text-muted">{unit}</span>
                </p>
                <p className="text-xs text-muted font-medium">{totalChange == null ? 'Since your starting weight' : totalChange === 0 ? 'No change yet' : `${arrow} ${formatWeight(Math.abs(totalChange), unit)} ${totalChange < 0 ? 'lower' : 'higher'}`}</p>
              </div>
              <div>
                <p className="text-xs font-normal text-muted mb-1">Recent Pace</p>
                <p className="text-2xl font-semibold text-[#111827] leading-none mb-1">
                  {rate ? formatWeightChange(rate.lbsPerWeek, unit, { unit: false }) : '–'} <span className="text-xs font-normal text-muted">{unit}/wk</span>
                </p>
                <p className="text-xs text-subtle">{rate ? `Trend of ${rate.points} weigh-ins` : 'Needs 3+ weigh-ins over 2+ weeks'}</p>
              </div>
              <div>
                <p className="text-xs font-normal text-muted mb-1">Current Weight</p>
                <p className="text-2xl font-semibold text-[#111827] leading-none mb-1">{formatWeight(currentWeight, unit, { unit: false })} <span className="text-xs font-normal text-muted">{unit}</span></p>
                {!latest && <p className="text-xs text-subtle">No weigh-ins yet</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-normal text-muted mb-1">Goal Weight</p>
                <p className="text-xl font-semibold text-[#111827] leading-none">{settings.targetWeight > 0 ? formatWeight(settings.targetWeight, unit, { unit: false }) : '–'} <span className="text-xs font-normal text-muted">{unit}</span></p>
              </div>
              <div>
                <p className="text-xs font-normal text-muted mb-1">% Change</p>
                <p className={`text-xl font-semibold leading-none mb-1 ${changeClass}`}>{percentChange == null ? '–' : `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`}</p>
              </div>
              <div>
                <p className="text-xs font-normal text-muted mb-1">Current BMI</p>
                <p className="text-xl font-semibold text-[#111827] leading-none mb-1">{bmi == null ? '–' : bmi.toFixed(1)}</p>
                {bmiLabel && <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold">{bmiLabel}</span>}
              </div>
            </div>
          </Link>
        </div>

        {/* ROW 2: ESTIMATED MEDICATION LEVEL */}
        <MedicationLevelChart onOpenSources={() => setShowSourcesModal(true)} />

        {/* ROW 3: WEIGHT & INJECTIONS CHART */}
        <div className="bg-white rounded-[24px] p-6 shadow-xs border border-[#E5E7EB]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="font-semibold text-[#111827] text-base">Weight & Injections</h3>
              <p className="text-xs text-muted">Aggregated on a weekly basis</p>
            </div>
            
            {/* Timeline Filter Options */}
            <div className="flex bg-[#F8F9FC] rounded-[14px] p-1 border border-[#E5E7EB] text-xs font-medium">
              {(['Weekly', 'Monthly', '3 Months', 'All Time'] as const).map((t) => (
                <button
                  key={t}
                  aria-pressed={weightTimeline === t}
                  onClick={() => setWeightTimeline(t)}
                  className={`px-3 py-1.5 rounded-[10px] transition-all ${
                    weightTimeline === t ? 'bg-white text-[#111827] shadow-xs font-semibold' : 'text-muted hover:text-[#111827]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-48 shrink-0 flex flex-row md:flex-col gap-6 md:border-r border-[#F1F5F9] md:pr-6">
               <div>
                 <p className="text-xs font-normal text-muted mb-1">Weight Change</p>
                 <p className={`text-2xl font-semibold leading-none mb-1 ${changeClass}`}>
                   {formatWeightChange(totalChange, unit, { unit: false })} <span className="text-xs font-normal text-muted">{unit}</span>
                 </p>
                 <p className="text-xs text-muted font-medium">Since your starting weight</p>
               </div>
               <div>
                 <p className="text-xs font-normal text-muted mb-1">Total Injections</p>
                 <div className="flex items-center gap-3">
                   <div>
                     <p className="text-2xl font-semibold text-[#111827] leading-none mb-1">{sortedDoses.length}</p>
                     <p className="text-xs text-subtle">Logged so far</p>
                   </div>
                   <div className="w-8 h-8 rounded-full bg-[#F3F0FF] flex items-center justify-center">
                     <Syringe className="w-4 h-4 text-[#6D4AFF]" />
                   </div>
                 </div>
               </div>
            </div>

            <div className="h-[250px] w-full flex-1 relative">
               {!chartHasWeight && (
                 <p className="absolute inset-0 flex items-center justify-center text-xs text-muted text-center px-6 z-10">No weigh-ins in this period yet. Injections are still shown.</p>
               )}
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
                      tick={{ fontSize: 11, fill: '#15803D', fontWeight: 500 }} 
                   />
                   <YAxis 
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 'dataMax + 1']} allowDecimals={false} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#6D4AFF', fontWeight: 500 }} 
                   />
                   <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(16,24,40,0.05)' }}
                   />
                   <Bar yAxisId="right" dataKey="shots" fill="#7e22ce" barSize={18} radius={[4, 4, 0, 0]} name="Injections" />
                   <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#15803d" 
                      strokeWidth={2}
                      connectNulls={false}
                      dot={{ r: 4, fill: '#15803d', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#15803d', stroke: '#fff', strokeWidth: 2 }}
                      name={`Weekly Weight (${unit})`}
                   />
                 </ComposedChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <PkInfoModal open={showSourcesModal} onClose={() => setShowSourcesModal(false)} />

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
