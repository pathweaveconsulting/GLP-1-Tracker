import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { EmptyState, PageHeader, Panel, Stat } from '../components/ds';
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
    <div className="space-y-5">
      <PageHeader title="Health summary" description="What your own logs say right now. Anything we can't support with enough data shows a dash." />

      <Panel title="Right now">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Next shot (if weekly)"
            value={nextLabel}
            tone={next.daysUntil != null && next.daysUntil < 0 ? 'caution' : 'ink'}
            note={next.daysUntil != null && next.daysUntil < 0 ? 'Past usual interval' : next.lastDose ? 'Based on your last recorded dose' : undefined}
          />
          <Stat
            label={`Medication level${next.medication ? ` (${next.medication})` : ''}`}
            value={next.lastDose && medicationInfo(next.lastDose.medication).modelled ? pk.currentLevel : '–'}
            unit={next.lastDose && medicationInfo(next.lastDose.medication).modelled ? 'mg' : undefined}
            note={next.lastDose && !medicationInfo(next.lastDose.medication).modelled ? NO_ESTIMATE_TEXT : next.lastDose ? 'Estimate. Simplified model, not a blood test' : undefined}
          />
          <Stat
            label="Recent weekly trend"
            value={rate ? formatWeightChange(rate.lbsPerWeek, unit, { unit: false }) : '–'}
            unit={`${unit}/wk`}
            note={rate ? `From ${rate.points} weigh-ins over ${rate.spanDays} days` : NEEDS_MORE_WEIGHT_DATA}
          />
          <Stat
            label="Goal projection"
            value={projection.status === 'projected' ? `Around ${format(projection.date, 'MMM yyyy')}` : projection.status === 'reached' ? "You've reached your goal weight" : '–'}
            note={projection.status === 'projected' ? 'If your recent pace continues. Real life varies.' : projection.status === 'reached' ? undefined : projection.reason}
          />
        </dl>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Milestones">
          {lastReached ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-positive" aria-hidden="true" />
              <div>
                <p className="text-[13px] text-muted">Latest reached</p>
                <p className="text-lg font-semibold text-ink">{lastReached.label}</p>
                {lastReached.date && <p className="text-[13px] text-muted">{format(new Date(lastReached.date), 'MMM d, yyyy')}</p>}
              </div>
            </div>
          ) : (
            <EmptyState title="No milestone yet">
              {milestones.length ? `Your first one is ${milestones[0].label.toLowerCase()}.` : latest ? 'Set a goal weight below your starting weight in Settings to track milestones.' : 'Log a weigh-in to start tracking.'}
            </EmptyState>
          )}
        </Panel>

        <Panel title="Symptoms you've logged this week">
          {symptoms.daysLogged === 0 ? (
            <p className="text-sm leading-6 text-muted">
              You haven't logged symptoms in the last 7 days, so we can't say how the week has gone. <Link to="/effects" className="font-semibold text-brand underline-offset-2 hover:underline">Log how you feel</Link>
            </p>
          ) : symptoms.items.length === 0 ? (
            <p className="text-sm leading-6 text-muted">You logged {symptoms.daysLogged} {symptoms.daysLogged === 1 ? 'day' : 'days'} this week with no positive symptom ratings recorded. Unanswered symptoms remain unrecorded.</p>
          ) : (
            <ul className="-my-1 divide-y divide-line text-sm text-ink-2">
              {symptoms.items.slice(0, 6).map((i) => (
                <li key={i.key} className="py-2"><span className="font-semibold text-ink">{i.label}</span>: {severityLabel(i.peak).toLowerCase()} at worst, on {i.daysPresent} of {i.daysRecorded} recorded {i.daysRecorded === 1 ? 'day' : 'days'}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[13px] text-muted">We only report what you've logged. This is not a diagnosis.</p>
        </Panel>
      </div>

      <SafetyNotice variant="full" />
    </div>
  );
}
