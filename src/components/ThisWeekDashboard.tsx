import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Droplets, Zap, Shield, RefreshCw, Activity, Utensils, Moon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useStore } from '../store/useStore';
import { calculateShotPhase, generatePKCurve } from '../lib/glp1Utils';
import { latestEffectWithin, recentSymptomSummary, severityLabel, sevOf } from '../lib/symptoms';
import { Modal } from './ui/Modal';
import { buttonClass, PageHeader, Panel, Stat } from './ds';
import { OtherMedicationNote } from './OtherMedicationNote';
import { NO_ESTIMATE_TEXT, medicationInfo } from '../lib/medications';

interface Props {
  className?: string;
}

const PHASE_ICONS = [Droplets, Zap, Shield, Activity, RefreshCw, Clock];

/**
 * A generic once-weekly shape (relative 0-100), NOT the user's data. Shown only with an "illustrative" label.
 */
const TYPICAL_PATTERN = [
  { phase: 'Injection day', medication: 60, appetite: 35, foodNoise: 30 },
  { phase: 'Build up', medication: 90, appetite: 25, foodNoise: 20 },
  { phase: 'Peak', medication: 100, appetite: 20, foodNoise: 15 },
  { phase: 'Cruise', medication: 85, appetite: 30, foodNoise: 20 },
  { phase: 'Winding down', medication: 65, appetite: 45, foodNoise: 30 },
  { phase: 'Wear-off', medication: 50, appetite: 60, foodNoise: 40 },
];

export function ThisWeekDashboard({ className = '' }: Props) {
  const doses = useStore((s) => s.doses);
  const effects = useStore((s) => s.effects);
  const now = new Date();
  const phase = calculateShotPhase(doses);
  const pk = generatePKCurve(doses);
  const [showGuide, setShowGuide] = useState(false);

  const hasDose = !!phase.lastDose;
  // Investigational / unlisted medications have no modelled schedule: no day count, level, phase highlight or weekly pattern.
  const unmodelled = hasDose && !medicationInfo(phase.lastDose!.medication).modelled;
  const daysSince = hasDose ? Math.max(0, (now.getTime() - new Date(phase.lastDose!.date).getTime()) / 86_400_000) : 0;
  const overdue = hasDose && daysSince > 7;
  const dayNum = hasDose ? Math.min(7, Math.floor(daysSince) + 1) : 0;
  const dateRange = `${format(startOfWeek(now, { weekStartsOn: 0 }), 'MMM d')} – ${format(endOfWeek(now, { weekStartsOn: 0 }), 'MMM d, yyyy')}`;

  const latest = latestEffectWithin(effects, now, 3);
  const summary = useMemo(() => recentSymptomSummary(effects, now, 7), [effects]);

  const checkIn = latest
    ? [
        { label: 'Hunger', value: severityLabel(sevOf(latest, 'hunger')) },
        { label: 'Food noise', value: severityLabel(sevOf(latest, 'foodNoise')) },
        { label: 'Nausea', value: severityLabel(sevOf(latest, 'nausea')) },
        { label: 'Fatigue', value: severityLabel(sevOf(latest, 'fatigue')) },
      ]
    : [];

  return (
    <div className={`space-y-5 ${className}`}>
      <PageHeader eyebrow={dateRange} title="This week" description="Where you are in your weekly cycle, and what to expect next." />

      <Panel title={phase.title} description={`Today • ${hasDose ? (unmodelled ? 'No schedule tracked' : overdue ? `${Math.floor(daysSince)} days since your last dose` : `Day ${dayNum} of 7`) : 'No dose logged yet'}`}>
        <p className="max-w-2xl text-sm leading-6 text-ink-2">{phase.now}</p>
        {hasDose && !unmodelled && <p className="mt-2 max-w-2xl text-[13px] text-muted">Illustrative calendar phases, not a prediction of your symptoms or measured medication level; approximate; verify against current prescribing information. Timing varies by product and person. Based on the typical weekly pattern and the date of your last dose. It is not a measurement of your body.</p>}
        {unmodelled && <OtherMedicationNote medication={phase.lastDose!.medication} className="mt-2" />}

        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">Your latest check-in</h3>
            {latest && <span className="text-[13px] text-muted">Logged {format(new Date(latest.date), 'EEE, MMM d')}</span>}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
            <Stat
              label="Medication"
              value={!unmodelled && hasDose ? `${pk.percentOfPeak}%` : '–'}
              note={unmodelled ? NO_ESTIMATE_TEXT : hasDose ? 'of est. peak (model)' : 'Log a dose to see this'}
            />
            {latest && checkIn.map((c) => <Stat key={c.label} label={c.label} value={c.value} />)}
          </dl>
          {!latest && (
            <p className="mt-4 rounded-[var(--radius-control)] border border-dashed border-line-strong p-3 text-sm text-muted">
              No symptom log in the last 3 days, so there is nothing of yours to show here yet.{' '}
              <Link to="/effects" className="font-semibold text-brand underline-offset-2 hover:underline">Log how you feel</Link>
            </p>
          )}
        </div>
      </Panel>

      {!unmodelled && (
      <Panel title="The typical weekly rhythm" description={hasDose ? 'The marked step is where your last dose date places you today.' : 'Log a dose and we will mark where you are in the cycle.'}>
        <div className="overflow-x-auto pb-1">
          <ol className="grid min-w-[560px] grid-cols-6 gap-2 text-center">
            {PHASE_ICONS.map((Icon, i) => {
              const names = ['Injection day', 'Build up', 'Peak', 'Cruise', 'Winding down', 'Wear-off'];
              const ranges = ['0 – 0.5 d', '0.5 – 2 d', '2 – 3.5 d', '3.5 – 5 d', '5 – 6 d', '6 – 7 d'];
              const active = hasDose && !overdue && phase.phaseNumber === i + 1;
              return (
                <li key={names[i]} aria-current={active ? 'step' : undefined} className={`flex flex-col items-center rounded-[var(--radius-control)] px-1 py-3 ${active ? 'bg-brand-soft ring-2 ring-brand' : ''}`}>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-brand text-white' : 'border border-line-strong bg-surface text-muted'}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className={`mt-2 text-[13px] font-semibold ${active ? 'text-brand-strong' : 'text-ink-2'}`}>{names[i]}</span>
                  <span className="text-xs text-muted">{ranges[i]}</span>
                  {active && <span className="mt-1 text-xs font-semibold text-brand-strong">You are here</span>}
                </li>
              );
            })}
          </ol>
        </div>
      </Panel>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {!unmodelled && (
        <Panel
          className="lg:col-span-2"
          title="Typical weekly pattern"
          description="Illustrative. Relative shape across a once-weekly cycle. Not your data. Solid: medication level. Long dashes: appetite. Short dashes: food noise."
        >
          <div className="h-[220px] w-full" role="img" aria-label="Illustrative chart of a typical weekly pattern: medication level, appetite and food noise by phase. Not based on your logs.">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={TYPICAL_PATTERN} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e8ef" />
                <XAxis dataKey="phase" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4f5d70' }} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4f5d70' }} />
                <Tooltip formatter={(v) => `${v} (relative)`} />
                <Legend wrapperStyle={{ fontSize: 13, color: '#2e3e54' }} />
                <Line type="monotone" dataKey="medication" name="Medication level" stroke="#1d5aa6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="appetite" name="Appetite" stroke="#8a5300" strokeWidth={2.5} strokeDasharray="7 4" dot={false} />
                <Line type="monotone" dataKey="foodNoise" name="Food noise" stroke="#1c6f4c" strokeWidth={2} strokeDasharray="2 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-semibold text-ink">Why this often happens</div>
              <p className="mt-0.5 text-sm text-ink-2">
                As medication levels fall late in the week, many people notice hunger and food noise creeping back. How strongly varies from person to person.
              </p>
            </div>
            <button type="button" onClick={() => setShowGuide(true)} className={buttonClass('secondary', 'md', 'shrink-0')}>
              Learn more
            </button>
          </div>
        </Panel>
        )}

        <Panel className={unmodelled ? 'lg:col-span-3' : undefined} title="From your logs, last 7 days">
          {summary.daysLogged === 0 ? (
            <p className="text-sm leading-6 text-muted">
              You have not logged symptoms in the last 7 days. Even a quick "none" day helps us learn your pattern.
            </p>
          ) : summary.items.length === 0 ? (
            <p className="text-sm leading-6 text-muted">You logged {summary.daysLogged} {summary.daysLogged === 1 ? 'day' : 'days'} this week with no positive symptom ratings recorded. Unanswered symptoms remain unrecorded.</p>
          ) : (
            <>
              <p className="text-[13px] text-muted">{summary.daysLogged} {summary.daysLogged === 1 ? 'day' : 'days'} logged</p>
              <ul className="mt-1 divide-y divide-line text-sm">
                {summary.items.slice(0, 5).map((i) => (
                  <li key={i.key} className="flex items-center justify-between gap-2 py-2">
                    <span className="font-medium text-ink">{i.label}</span>
                    <span className="text-ink-2">{severityLabel(i.peak)} at worst · {i.daysPresent} {i.daysPresent === 1 ? 'day' : 'days'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-3 text-[13px] text-muted">
            Anything severe, or that doesn't ease, deserves a call to your care team. See <Link to="/health" className="font-semibold text-brand underline-offset-2 hover:underline">when to get help</Link>.
          </p>
        </Panel>
      </div>

      <Panel title="General ideas for today" description="General suggestions, not personalised advice. Follow your care team's guidance.">
        <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Utensils, title: 'Protein with meals', text: 'Protein tends to keep you fuller when portions are small.' },
            { icon: Droplets, title: 'Sip fluids through the day', text: 'Staying hydrated can ease several common side effects.' },
            { icon: Activity, title: 'Gentle movement', text: 'A walk or light activity, as feels right for you.' },
            { icon: Moon, title: 'Rest', text: 'Fatigue is easier to manage when you are rested.' },
          ].map((c) => (
            <li key={c.title} className="flex items-start gap-3">
              <c.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold text-ink">{c.title}</div>
                <p className="text-[13px] text-muted">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Modal open={showGuide} onClose={() => setShowGuide(false)} title="About the weekly rhythm" widthClass="max-w-lg">
        <div className="space-y-3 text-sm leading-6 text-ink-2">
          <p>Once-weekly GLP-1 medicines build up after an injection and then slowly fall until the next one. This app uses a simplified model of that curve to describe the typical shape of a week.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Early in the week levels are usually rising toward their peak.</li>
            <li>Mid-week many people feel the steadiest appetite control.</li>
            <li>Late in the week levels fall, and hunger or food noise often returns a little.</li>
          </ul>
          <p>Individual responses vary. Your own symptom logs are the best guide to your pattern, and your care team has the final say on your dose.</p>
        </div>
      </Modal>
    </div>
  );
}
