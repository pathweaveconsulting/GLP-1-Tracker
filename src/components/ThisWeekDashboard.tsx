import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Info, Calendar, Clock, Droplets, Zap, Shield, RefreshCw, Activity, Utensils, Moon, Smile } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useStore } from '../store/useStore';
import { calculateShotPhase, generatePKCurve } from '../lib/glp1Utils';
import { latestEffectWithin, recentSymptomSummary, severityLabel, sevOf } from '../lib/symptoms';
import { Modal } from './ui/Modal';
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
        { label: 'Hunger', value: severityLabel(sevOf(latest, 'hunger')), icon: Utensils, color: 'text-caution' },
        { label: 'Food noise', value: severityLabel(sevOf(latest, 'foodNoise')), icon: Sparkles, color: 'text-positive' },
        { label: 'Nausea', value: severityLabel(sevOf(latest, 'nausea')), icon: Activity, color: 'text-danger' },
        { label: 'Fatigue', value: severityLabel(sevOf(latest, 'fatigue')), icon: Zap, color: 'text-info' },
      ]
    : [];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[24px] border border-line shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">This Week</h1>
            <Sparkles className="w-5 h-5 text-brand" aria-hidden="true" />
          </div>
          <p className="text-xs font-normal text-muted mt-1">Where you are in your weekly cycle, and what to expect next.</p>
        </div>
        <div className="flex items-center gap-2 bg-canvas px-3.5 py-2.5 rounded-[14px] border border-line text-xs font-medium text-ink">
          <Calendar className="w-4 h-4 text-muted" aria-hidden="true" />
          <span>{dateRange}</span>
        </div>
      </div>

      <section aria-labelledby="today-heading" className="bg-white p-6 rounded-[24px] border border-line shadow-xs space-y-6">
        <div>
          <div className="text-xs font-medium text-brand mb-1">
            Today • {hasDose ? (unmodelled ? 'No schedule tracked' : overdue ? `${Math.floor(daysSince)} days since your last dose` : `Day ${dayNum} of 7`) : 'No dose logged yet'}
          </div>
          <h2 id="today-heading" className="text-xl sm:text-2xl font-semibold text-ink tracking-tight">{phase.title}</h2>
          <p className="text-xs font-normal text-muted mt-1.5 max-w-2xl leading-relaxed">{phase.now}</p>
          {hasDose && !unmodelled && <p className="mt-2 text-xs text-muted">Illustrative calendar phases, not a prediction of your symptoms or measured medication level; approximate; verify against current prescribing information. Timing varies by product and person.</p>}
          {unmodelled && <OtherMedicationNote medication={phase.lastDose!.medication} className="mt-2" />}
          {hasDose && !unmodelled && (
            <p className="text-[11px] text-subtle mt-1.5">
              Based on the typical weekly pattern and the date of your last dose. It is not a measurement of your body.
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-sunken">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">Your latest check-in</h3>
            {latest && <span className="text-[11px] text-muted">Logged {format(new Date(latest.date), 'EEE, MMM d')}</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-canvas p-4 rounded-[16px] border border-line">
              <div className="flex items-center gap-1.5 text-xs text-muted"><Activity className="w-3.5 h-3.5 text-brand" aria-hidden="true" /> Medication</div>
              {unmodelled ? (
                <p className="text-xs text-muted mt-2">{NO_ESTIMATE_TEXT}</p>
              ) : hasDose ? (
                <>
                  <div className="text-xl font-semibold text-ink mt-2">{pk.percentOfPeak}%</div>
                  <p className="text-[11px] font-medium text-brand mt-0.5">of est. peak (model)</p>
                </>
              ) : (
                <p className="text-xs text-muted mt-2">Log a dose to see this</p>
              )}
            </div>
            {latest ? (
              checkIn.map((c) => (
                <div key={c.label} className="bg-canvas p-4 rounded-[16px] border border-line">
                  <div className="flex items-center gap-1.5 text-xs text-muted"><c.icon className={`w-3.5 h-3.5 ${c.color}`} aria-hidden="true" /> {c.label}</div>
                  <div className="text-xl font-semibold text-ink mt-2">{c.value}</div>
                </div>
              ))
            ) : (
              <div className="sm:col-span-4 bg-canvas p-4 rounded-[16px] border border-dashed border-line-strong text-xs text-muted flex items-center gap-3">
                <Smile className="w-5 h-5 text-subtle shrink-0" aria-hidden="true" />
                <span>
                  No symptom log in the last 3 days, so there is nothing of yours to show here yet.{' '}
                  <Link to="/effects" className="text-brand font-semibold hover:underline">Log how you feel</Link>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {!unmodelled && (
      <section aria-labelledby="rhythm-heading" className="bg-white p-4 sm:p-6 rounded-[24px] border border-line shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <h2 id="rhythm-heading" className="text-base font-semibold text-ink tracking-tight">The typical weekly rhythm</h2>
          <Info className="w-4 h-4 text-subtle" aria-hidden="true" />
        </div>
        <p className="text-xs text-muted mb-4">
          {hasDose ? 'The highlighted step is where your last dose date places you today.' : 'Log a dose and we will highlight where you are in the cycle.'}
        </p>
        <div className="overflow-x-auto pb-2">
          <ol className="grid grid-cols-6 gap-2 min-w-[560px] text-center">
            {PHASE_ICONS.map((Icon, i) => {
              const names = ['Injection day', 'Build up', 'Peak', 'Cruise', 'Winding down', 'Wear-off'];
              const ranges = ['0 – 0.5 d', '0.5 – 2 d', '2 – 3.5 d', '3.5 – 5 d', '5 – 6 d', '6 – 7 d'];
              const active = hasDose && !overdue && phase.phaseNumber === i + 1;
              return (
                <li key={names[i]} aria-current={active ? 'step' : undefined} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${active ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white ring-4 ring-orange-200' : 'bg-sunken text-muted border border-line-strong'}`}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <span className={`text-xs font-semibold mt-2 ${active ? 'text-orange-600' : 'text-ink-2'}`}>{names[i]}</span>
                  <span className="text-[10px] text-subtle">{ranges[i]}</span>
                  {active && <span className="mt-1 text-[9px] font-semibold bg-orange-700 text-white px-2 py-0.5 rounded-full">YOU ARE HERE</span>}
                </li>
              );
            })}
          </ol>
 </div>
      </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!unmodelled && (
        <section aria-labelledby="pattern-heading" className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-line shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <h2 id="pattern-heading" className="text-base font-semibold text-ink tracking-tight">Typical weekly pattern</h2>
              <p className="text-xs text-muted">Relative shape across a once-weekly cycle. Not your data.</p>
            </div>
            <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">Illustrative</span>
          </div>
          <div className="h-[220px] w-full" role="img" aria-label="Illustrative chart of a typical weekly pattern: medication level, appetite and food noise by phase. Not based on your logs.">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={TYPICAL_PATTERN} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="phase" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip formatter={(v) => `${v} (relative)`} />
                <Line type="monotone" dataKey="medication" name="Medication level" stroke="#1d5aa6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="appetite" name="Appetite" stroke="#c2410c" strokeWidth={2.5} strokeDasharray="7 4" dot={false} />
                <Line type="monotone" dataKey="foodNoise" name="Food noise" stroke="#047857" strokeWidth={2} strokeDasharray="2 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-brand-soft/70 p-4 rounded-[16px] border border-brand-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="text-xs font-semibold text-brand-strong">Why this often happens</div>
              <p className="text-xs font-medium text-brand-strong mt-0.5">
                As medication levels fall late in the week, many people notice hunger and food noise creeping back. How strongly varies from person to person.
              </p>
            </div>
            <button type="button" onClick={() => setShowGuide(true)} className="px-4 py-2 bg-brand text-white rounded-[16px] text-xs font-medium shrink-0">
              Learn more
            </button>
          </div>
        </section>
        )}

        <section aria-labelledby="logs-heading" className={`${unmodelled ? 'lg:col-span-3 ' : ''}bg-white p-6 rounded-[24px] border border-line shadow-xs space-y-3`}>
          <h2 id="logs-heading" className="text-base font-semibold text-ink tracking-tight">From your logs, last 7 days</h2>
          {summary.daysLogged === 0 ? (
            <p className="text-xs text-muted leading-relaxed">
              You have not logged symptoms in the last 7 days. Even a quick "none" day helps us learn your pattern.
            </p>
          ) : summary.items.length === 0 ? (
            <p className="text-xs text-muted leading-relaxed">You logged {summary.daysLogged} {summary.daysLogged === 1 ? 'day' : 'days'} this week with no positive symptom ratings recorded. Unanswered symptoms remain unrecorded.</p>
          ) : (
            <>
              <p className="text-[11px] text-subtle">{summary.daysLogged} {summary.daysLogged === 1 ? 'day' : 'days'} logged</p>
              <ul className="space-y-2 text-xs">
                {summary.items.slice(0, 5).map((i) => (
                  <li key={i.key} className="flex justify-between items-center p-2.5 rounded-[14px] bg-canvas">
                    <span className="text-ink-2 font-medium">{i.label}</span>
                    <span className="text-muted">{severityLabel(i.peak)} at worst · {i.daysPresent} {i.daysPresent === 1 ? 'day' : 'days'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-[11px] text-subtle pt-1">
            Anything severe, or that doesn't ease, deserves a call to your care team. See <Link to="/health" className="text-brand hover:underline">when to get help</Link>.
          </p>
        </section>
      </div>

      <section aria-labelledby="plan-heading" className="bg-white p-6 rounded-[24px] border border-line shadow-xs space-y-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h2 id="plan-heading" className="text-base font-semibold text-ink tracking-tight">General ideas for today</h2>
          <span className="text-[11px] text-subtle">General suggestions, not personalised advice. Follow your care team's guidance.</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Utensils, title: 'Protein with meals', text: 'Protein tends to keep you fuller when portions are small.' },
            { icon: Droplets, title: 'Sip fluids through the day', text: 'Staying hydrated can ease several common side effects.' },
            { icon: Activity, title: 'Gentle movement', text: 'A walk or light activity, as feels right for you.' },
            { icon: Moon, title: 'Rest', text: 'Fatigue is easier to manage when you are rested.' },
          ].map((c) => (
            <li key={c.title} className="bg-canvas p-4 rounded-[16px] border border-line space-y-2">
              <div className="w-8 h-8 rounded-[12px] bg-brand text-white flex items-center justify-center"><c.icon className="w-4 h-4" aria-hidden="true" /></div>
              <div className="text-xs font-semibold text-ink">{c.title}</div>
              <p className="text-[11px] text-muted">{c.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <Modal open={showGuide} onClose={() => setShowGuide(false)} title="About the weekly rhythm" widthClass="max-w-lg">
        <div className="space-y-3 text-xs text-muted leading-relaxed">
          <p>Once-weekly GLP-1 medicines build up after an injection and then slowly fall until the next one. This app uses a simplified model of that curve to describe the typical shape of a week.</p>
          <ul className="bg-canvas p-4 rounded-[16px] space-y-2 text-ink font-medium">
            <li>• Early in the week levels are usually rising toward their peak.</li>
            <li>• Mid-week many people feel the steadiest appetite control.</li>
            <li>• Late in the week levels fall, and hunger or food noise often returns a little.</li>
          </ul>
          <p>Individual responses vary. Your own symptom logs are the best guide to your pattern, and your care team has the final say on your dose.</p>
        </div>
      </Modal>
    </div>
  );
}
