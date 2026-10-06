import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/card';
import { format } from 'date-fns';
import { HeartPulse, TrendingDown, Target, Award, Clock, Zap } from 'lucide-react';
import { generatePKCurve } from '../lib/glp1Utils';
import { NO_ESTIMATE_TEXT, medicationInfo } from '../lib/medications';
import { formatWeightChange, getWeightUnit } from '../lib/units';
import { NEEDS_MORE_WEIGHT_DATA, latestWeight, nextDoseInfo, projectGoal, weeklyRate, weightMilestones } from '../lib/insights';
import { recentSymptomSummary, severityLabel } from '../lib/symptoms';
import { SafetyNotice } from '../components/SafetyNotice';

export function HealthCenter() {
  const { doses, weights, effects, settings } = useStore();
  const unit = getWeightUnit(settings);
  const now = new Date();

  const next = nextDoseInfo(doses, now);
  const pk = generatePKCurve(doses);
  const rate = weeklyRate(weights, now);
  const startLbs = settings.startingWeight > 0 ? settings.startingWeight : null;
  const projection = projectGoal({ weights, startLbs, targetLbs: settings.targetWeight, now });
  const milestones = weightMilestones({ weights, startLbs, targetLbs: settings.targetWeight });
  const reached = milestones.filter((m) => m.reached);
  const lastReached = reached[reached.length - 1];
  const symptoms = recentSymptomSummary(effects, now, 7);
  const latest = latestWeight(weights);

  const nextLabel = !next.lastDose
    ? 'Log a dose to see this'
    : next.dueDate
    ? format(next.dueDate, 'EEE, MMM d')
    : 'No set schedule';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Health Overview</h1>
        <p className="text-muted text-sm mt-0.5">What your own logs say right now. Anything we can't support with enough data shows a dash.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-[#111827] text-white rounded-[20px] border-0 shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex justify-between items-start">
              <Clock className="w-5 h-5 text-slate-400" aria-hidden="true" />
              {next.daysUntil != null && next.daysUntil < 0 && (
                <span className="px-2.5 py-0.5 bg-white/10 text-[11px] rounded-full font-medium">Past usual interval</span>
              )}
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 block mb-1">Next shot (if weekly)</span>
              <span className="text-xl font-semibold tracking-tight">{nextLabel}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-[#E5E7EB] bg-white shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <Zap className="w-5 h-5 text-caution" aria-hidden="true" />
              <span className="px-2.5 py-0.5 bg-amber-50 text-[#B45309] text-[11px] rounded-full font-medium">Estimate</span>
            </div>
            <div>
              <span className="text-xs font-medium text-muted block mb-1">Medication level{next.medication ? ` (${next.medication})` : ''}</span>
              {next.lastDose && !medicationInfo(next.lastDose.medication).modelled ? (
                <span className="text-sm text-muted">{NO_ESTIMATE_TEXT}</span>
              ) : next.lastDose ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold tracking-tight text-[#111827]">{pk.currentLevel}</span>
                    <span className="text-xs font-normal text-muted">mg</span>
                  </div>
                  <p className="text-[11px] text-subtle mt-1">Simplified model, not a blood test</p>
                </>
              ) : (
                <span className="text-sm text-muted">–</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-[#E5E7EB] bg-white shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <TrendingDown className="w-5 h-5 text-positive" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-medium text-muted block mb-1">Recent weekly trend</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tracking-tight text-[#111827]">{rate ? formatWeightChange(rate.lbsPerWeek, unit, { unit: false }) : '–'}</span>
                <span className="text-xs font-normal text-muted">{unit}/wk</span>
              </div>
              <p className="text-[11px] text-subtle mt-1">{rate ? `From ${rate.points} weigh-ins over ${rate.spanDays} days` : NEEDS_MORE_WEIGHT_DATA}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-[#E5E7EB] bg-white shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <Target className="w-5 h-5 text-[#6D4AFF]" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-medium text-muted block mb-1">Goal projection</span>
              {projection.status === 'projected' ? (
                <>
                  <p className="text-sm font-semibold text-[#111827] leading-tight">Around {format(projection.date, 'MMM yyyy')}</p>
                  <p className="text-[11px] text-subtle mt-1">If your recent pace continues. Real life varies.</p>
                </>
              ) : projection.status === 'reached' ? (
                <p className="text-sm font-semibold text-[#111827] leading-tight">You've reached your goal weight</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[#111827] leading-tight">–</p>
                  <p className="text-[11px] text-subtle mt-1">{projection.reason}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-2 border-emerald-200/60 bg-emerald-50/50 rounded-[20px] shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex justify-between items-start mb-4">
              <Award className="w-5 h-5 text-positive" aria-hidden="true" />
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] rounded-full font-medium">Milestones</span>
            </div>
            <div>
              {lastReached ? (
                <>
                  <span className="text-xs font-medium text-emerald-800 block mb-1">Latest reached</span>
                  <span className="text-xl font-semibold text-emerald-900 tracking-tight">{lastReached.label}</span>
                  {lastReached.date && <p className="text-[11px] text-emerald-800 mt-1">{format(new Date(lastReached.date), 'MMM d, yyyy')}</p>}
                </>
              ) : (
                <>
                  <span className="text-xs font-medium text-emerald-800 block mb-1">No milestone yet</span>
                  <span className="text-sm text-emerald-900">
                    {milestones.length ? `Your first one is ${milestones[0].label.toLowerCase()}.` : latest ? 'Set a goal weight below your starting weight in Settings to track milestones.' : 'Log a weigh-in to start tracking.'}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[24px] border-[#E5E7EB] bg-white shadow-xs">
        <CardContent className="p-6 flex gap-4 items-start">
          <div className="p-3 bg-[#F8F9FC] rounded-[14px]">
            <HeartPulse className="w-5 h-5 text-muted" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-[#111827]">Symptoms you've logged this week</h2>
            {symptoms.daysLogged === 0 ? (
              <p className="text-xs text-muted mt-1 font-normal leading-relaxed">
                You haven't logged symptoms in the last 7 days, so we can't say how the week has gone. <Link to="/effects" className="text-[#6D4AFF] font-semibold hover:underline">Log how you feel</Link>
              </p>
            ) : symptoms.items.length === 0 ? (
              <p className="text-xs text-muted mt-1 font-normal leading-relaxed">You logged {symptoms.daysLogged} {symptoms.daysLogged === 1 ? 'day' : 'days'} this week with no positive symptom ratings recorded. Unanswered symptoms remain unrecorded.</p>
            ) : (
              <ul className="text-xs text-muted mt-2 space-y-1">
                {symptoms.items.slice(0, 6).map((i) => (
                  <li key={i.key}>• {i.label}: {severityLabel(i.peak).toLowerCase()} at worst, on {i.daysPresent} of {i.daysRecorded} recorded {i.daysRecorded === 1 ? 'day' : 'days'}</li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-subtle mt-3">We only report what you've logged. This is not a diagnosis.</p>
          </div>
        </CardContent>
      </Card>
    
      <SafetyNotice variant="full" />
    </div>
  );
}
