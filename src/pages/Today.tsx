import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Bell, ChevronRight, Droplets, HeartPulse, Menu, Pill, Plus, Scale, type LucideIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useDailyLogs } from '../store/dailyLogs';
import { dailyLogsEnabled } from '../lib/features';
import { Button, EmptyState, PageHeader, Panel, Stat, StatusLabel, buttonClass } from '../components/ds';
import { LogDoseModal } from '../components/modals/LogDoseModal';
import { LogWeightModal } from '../components/modals/LogWeightModal';
import { LogEffectsModal } from '../components/modals/LogEffectsModal';
import { NotificationsModal } from '../components/modals/NotificationsModal';
import { MobileMenuDrawer } from '../components/modals/MobileMenuDrawer';
import { OtherMedicationNote } from '../components/OtherMedicationNote';
import { PkInfoModal } from '../components/PkInfoModal';
import { useSecondaryNav } from '../components/navigation';
import { useToast } from '../components/ui/Toast';
import { NO_ESTIMATE_TEXT, medicationInfo } from '../lib/medications';
import { generatePKCurve, calculateShotPhase } from '../lib/glp1Utils';
import { BMI_FOOTNOTE, bmi as calcBmi, bmiCategory, formatWeight, formatWeightChange, getWeightUnit } from '../lib/units';
import { NEEDS_MORE_WEIGHT_DATA, latestWeight, nextDoseInfo, sortByDate, weeklyRate } from '../lib/insights';
import { buildNotifications } from '../lib/notifications';
import { isoToLocalDateString, localDayDiff, todayLocalDateString } from '../lib/dates';
import { COLLECTED_FIELDS, latestEffectWithin, severityLabel, sevOf, type FieldKey } from '../lib/symptoms';
import type { Severity } from '../types';

const CHECK_IN_FIELDS: Array<{ key: FieldKey; label: string }> = [
  { key: 'hunger', label: 'Hunger' },
  { key: 'foodNoise', label: 'Food noise' },
  { key: 'nausea', label: 'Nausea' },
  { key: 'fatigue', label: 'Fatigue' },
];
const CHECK_IN_WINDOW_DAYS = 7;

/** "today", "yesterday" or "N days ago", from local calendar days. */
function daysAgo(iso: string, now: Date): string {
  const d = localDayDiff(iso, now);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

/** One row of today's records: what it is, whether it was recorded today, and the action to record it. */
function RecordRow({ icon: Icon, title, done, detail, action }: {
  icon: LucideIcon; title: string; done: boolean; detail: ReactNode; action: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0 sm:gap-4">
      <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-sunken text-ink-2 sm:flex" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-6 text-ink">{title}</p>
        <StatusLabel status={done ? 'done' : 'open'}>{done ? 'Recorded today' : 'Not recorded today'}</StatusLabel>
        <p className="text-[13px] leading-5 text-muted">{detail}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  );
}

/** Severity shown as words plus a four-step scale, so meaning never depends on colour. */
function SeverityScale({ value }: { value: Severity | undefined }) {
  const steps = value == null ? -1 : ['none', 'mild', 'moderate', 'severe'].indexOf(value);
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-2 w-5 rounded-sm ${steps < 0 ? 'border border-dashed border-line-strong' : i <= steps ? 'bg-ink-2' : 'bg-line'}`} />
        ))}
      </span>
      <span className={value == null ? 'text-subtle' : 'text-ink'}>{severityLabel(value)}</span>
    </span>
  );
}

export function Today() {
  const { settings, weights, doses, effects } = useStore();
  const daily = useDailyLogs();
  const groups = useSecondaryNav();
  const { show: showToast } = useToast();
  const [open, setOpen] = useState<null | 'dose' | 'weight' | 'effects' | 'notifications' | 'menu' | 'level'>(null);
  const close = () => setOpen(null);

  // Everything below comes from the user's own records; anything not recorded stays "–" or is said to be missing.
  const now = new Date();
  const today = todayLocalDateString(now);
  const isToday = (iso: string) => isoToLocalDateString(iso) === today;
  const unit = getWeightUnit(settings);

  const sortedDoses = sortByDate(doses);
  const lastDose = sortedDoses.length ? sortedDoses[sortedDoses.length - 1] : null;
  const doseToday = [...sortedDoses].reverse().find((d) => isToday(d.date)) ?? null;
  const next = nextDoseInfo(doses, now);
  const phase = calculateShotPhase(sortedDoses);
  const pk = generatePKCurve(sortedDoses, '2 weeks');
  const modelled = !!lastDose && medicationInfo(lastDose.medication).modelled;

  const latest = latestWeight(weights);
  const weightToday = latest && isToday(latest.date) ? latest : null;
  const startWeight = settings.startingWeight > 0 ? settings.startingWeight : sortByDate(weights)[0]?.weightLbs ?? null;
  const change = latest && startWeight != null ? latest.weightLbs - startWeight : null;
  const percent = change != null && startWeight ? (change / startWeight) * 100 : null;
  const toGoal = latest && settings.targetWeight > 0 ? latest.weightLbs - settings.targetWeight : null;
  const rate = weeklyRate(weights, now);
  const bmi = calcBmi(latest?.weightLbs ?? null, settings.heightInches);
  const bmiLabel = bmiCategory(bmi);

  const checkIn = latestEffectWithin(effects, now, CHECK_IN_WINDOW_DAYS);
  const todaysEffect = [...effects].reverse().find((e) => isToday(e.date));
  const effectToday = !!todaysEffect;
  const ratedToday = todaysEffect ? COLLECTED_FIELDS.filter((f) => sevOf(todaysEffect, f.key) != null).length : 0;
  const showDaily = dailyLogsEnabled() || daily.rows.length > 0;
  const dailyToday = daily.rows.find((r) => r.date === today && (r.proteinGrams != null || r.waterMl != null));

  const notices = buildNotifications({ doses, weights, effects, settings, now });
  const started = settings.startDate ? new Date(settings.startDate) : null;
  const weekOfTreatment = started && localDayDiff(started, now) >= 0 ? Math.floor(localDayDiff(started, now) / 7) + 1 : null;

  return (
    <div>
      <PageHeader
        eyebrow={<time dateTime={today}>{format(now, 'EEEE d MMMM')}</time>}
        title="Today"
        description={
          <>
            {settings.medication}
            {weekOfTreatment && started ? ` · week ${weekOfTreatment}, started ${format(started, 'd MMM yyyy')}` : ''}
          </>
        }
        actions={
          <>
            <Button onClick={() => setOpen('notifications')} aria-label={notices.length ? `Notifications (${notices.length})` : 'Notifications'}>
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Notifications</span>
              {notices.length > 0 && <span className="rounded-full bg-brand px-1.5 text-xs font-semibold leading-5 text-white" aria-hidden="true">{notices.length}</span>}
            </Button>
            <Button className="md:hidden" onClick={() => setOpen('menu')} aria-label="Open navigation menu">
              <Menu className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
        <div className="space-y-5">
          <Panel title="Today's records" description="What you have recorded today. These are not targets.">
            <ul className="divide-y divide-line">
              <RecordRow
                icon={Pill}
                title="Injection"
                done={!!doseToday}
                detail={doseToday
                  ? `${doseToday.amountMg} mg ${doseToday.medication} at ${format(new Date(doseToday.date), 'HH:mm')}`
                  : lastDose ? `Last recorded ${daysAgo(lastDose.date, now)}` : 'No injections recorded yet'}
                action={<Button aria-label="Record injection" onClick={() => setOpen('dose')}><Plus className="h-4 w-4" aria-hidden="true" /><span className="sm:hidden">Record</span><span className="hidden sm:inline">Record injection</span></Button>}
              />
              <RecordRow
                icon={Scale}
                title="Weight"
                done={!!weightToday}
                detail={weightToday ? formatWeight(weightToday.weightLbs, unit) : latest ? `Last weigh-in ${daysAgo(latest.date, now)}` : 'No weigh-ins yet'}
                action={<Button aria-label="Record weight" onClick={() => setOpen('weight')}><Plus className="h-4 w-4" aria-hidden="true" /><span className="sm:hidden">Record</span><span className="hidden sm:inline">Record weight</span></Button>}
              />
              <RecordRow
                icon={HeartPulse}
                title="Check-in"
                done={effectToday}
                detail={effectToday ? `${ratedToday} ${ratedToday === 1 ? 'rating' : 'ratings'} recorded` : checkIn ? `Last check-in ${daysAgo(checkIn.date, now)}` : `None in the last ${CHECK_IN_WINDOW_DAYS} days`}
                action={<Button aria-label="Record symptoms" onClick={() => setOpen('effects')}><Plus className="h-4 w-4" aria-hidden="true" /><span className="sm:hidden">Record</span><span className="hidden sm:inline">Record symptoms</span></Button>}
              />
              {showDaily && (
                <RecordRow
                  icon={Droplets}
                  title="Protein & water"
                  done={!!dailyToday}
                  detail={dailyToday
                    ? [dailyToday.proteinGrams != null && `${dailyToday.proteinGrams} g protein`, dailyToday.waterMl != null && `${dailyToday.waterMl} mL water`].filter(Boolean).join(', ')
                    : 'Optional daily totals'}
                  action={<Link to="/daily" aria-label="Record protein & water" className={buttonClass('secondary')}><Plus className="h-4 w-4" aria-hidden="true" /><span className="sm:hidden">Record</span><span className="hidden sm:inline">Record protein & water</span></Link>}
                />
              )}
            </ul>
          </Panel>

          <Panel
            title="Medication"
            description="From the injections you have recorded."
            action={<Link to="/doses" className={buttonClass('quiet', 'sm')}>Dose history <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>}
          >
            {!lastDose ? (
              <EmptyState title="No injections recorded yet">Record an injection under Today's records to see when you last dosed.</EmptyState>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
                  <Stat
                    label="Last recorded"
                    value={format(new Date(lastDose.date), 'd MMM')}
                    note={`${lastDose.amountMg} mg ${lastDose.medication}, ${format(new Date(lastDose.date), 'HH:mm')}`}
                  />
                  <Stat label="Days since" value={localDayDiff(lastDose.date, now)} unit={localDayDiff(lastDose.date, now) === 1 ? 'day' : 'days'} />
                  <Stat
                    label="Next, if weekly"
                    value={next.dueDate && next.daysUntil != null ? (next.daysUntil < 0 ? Math.abs(next.daysUntil) : next.daysUntil) : '–'}
                    unit={next.dueDate && next.daysUntil != null ? (next.daysUntil < 0 ? 'days past' : next.daysUntil === 1 ? 'day' : 'days') : undefined}
                    tone={next.daysUntil != null && next.daysUntil < 0 ? 'caution' : 'ink'}
                    note={next.dueDate ? format(next.dueDate, 'EEE d MMM') : 'No set schedule for this medication'}
                  />
                </dl>
                <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[13px] text-muted">Where you are in the week</p>
                    <p className="mt-1 text-[15px] font-semibold text-ink">
                      {modelled
                        ? `Day ${Math.min(7, Math.max(0, localDayDiff(lastDose.date, now)) + 1)} of 7 • ${phase.title}`
                        : NO_ESTIMATE_TEXT}
                    </p>
                    {modelled && <Link to="/this-week" className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">What this week often looks like <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
                  </div>
                  <div>
                    <p className="text-[13px] text-muted">Estimated level</p>
                    {pk.modelled ? (
                      <p className="mt-1 text-[15px] font-semibold tabular-nums text-ink">{pk.currentLevel} mg <span className="font-normal text-muted">· {pk.percentOfPeak}% of modelled peak</span></p>
                    ) : (
                      <p className="mt-1 text-[15px] text-muted">{NO_ESTIMATE_TEXT}</p>
                    )}
                    <p className="text-[13px] text-subtle">Simplified model, not a blood test.</p>
                    <button type="button" onClick={() => setOpen('level')} className="mt-1 text-[13px] font-semibold text-brand hover:underline">About the estimated level</button>
                  </div>
                </div>
                <OtherMedicationNote medication={lastDose.medication} className="mt-4" />
              </>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            title="Weight"
            action={<Link to="/weight" className={buttonClass('quiet', 'sm')}>Progress <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>}
          >
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
              <Stat
                className="col-span-2"
                size="lg"
                label="Current weight"
                value={formatWeight(latest?.weightLbs ?? null, unit, { unit: false })}
                unit={latest ? unit : undefined}
                note={latest ? `Recorded ${format(new Date(latest.date), 'd MMM yyyy')}` : 'No weigh-ins yet'}
              />
              <Stat
                label="Change since start"
                value={formatWeightChange(change, unit, { unit: false })}
                unit={change != null ? unit : undefined}
                note={percent != null ? `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%` : undefined}
              />
              <Stat
                label="Recent pace"
                value={rate ? formatWeightChange(rate.lbsPerWeek, unit, { unit: false }) : '–'}
                unit={rate ? `${unit}/wk` : undefined}
                note={rate ? `Trend of ${rate.points} weigh-ins` : NEEDS_MORE_WEIGHT_DATA}
              />
              <Stat
                label="Goal"
                value={settings.targetWeight > 0 ? formatWeight(settings.targetWeight, unit, { unit: false }) : '–'}
                unit={settings.targetWeight > 0 ? unit : undefined}
                note={toGoal == null ? undefined : Math.abs(toGoal) < 0.05 ? 'At your goal weight' : `${formatWeight(Math.abs(toGoal), unit)} away`}
              />
              <Stat
                label="BMI"
                value={bmi == null ? '–' : bmi.toFixed(1)}
                note={bmiLabel ?? (settings.heightInches > 0 ? undefined : 'Add your height in Settings')}
              />
            </dl>
            {bmiLabel && <p className="mt-3 text-xs leading-5 text-subtle">{BMI_FOOTNOTE}</p>}
          </Panel>

          <Panel
            title="Latest check-in"
            action={<Link to="/effects" className={buttonClass('quiet', 'sm')}>Health <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>}
          >
            {checkIn ? (
              <>
                <p className="mb-3 text-[13px] text-muted">Recorded {format(new Date(checkIn.date), 'EEE d MMM')} ({daysAgo(checkIn.date, now)})</p>
                <dl className="space-y-2.5 text-sm">
                  {CHECK_IN_FIELDS.map((f) => (
                    <div key={f.key} className="flex items-center justify-between gap-3">
                      <dt className="text-ink-2">{f.label}</dt>
                      <dd><SeverityScale value={sevOf(checkIn, f.key)} /></dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <EmptyState title={`No check-in in the last ${CHECK_IN_WINDOW_DAYS} days`}>Nothing is assumed about how you feel until you record it.</EmptyState>
            )}
          </Panel>

          {notices.length > 0 && (
            <Panel title="Worth a look" description="From your own records.">
              <ul className="space-y-3">
                {notices.slice(0, 3).map((n) => (
                  <li key={n.id} className="border-l-2 border-brand pl-3">
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    <p className="text-[13px] leading-5 text-muted">{n.description}</p>
                  </li>
                ))}
              </ul>
              {notices.length > 3 && (
                <button type="button" onClick={() => setOpen('notifications')} className="mt-3 text-[13px] font-semibold text-brand hover:underline">
                  See all {notices.length}
                </button>
              )}
            </Panel>
          )}
        </div>
      </div>

      <LogDoseModal isOpen={open === 'dose'} onClose={close} onSuccess={() => showToast('Injection recorded')} />
      <LogWeightModal isOpen={open === 'weight'} onClose={close} onSuccess={() => showToast('Weight recorded')} />
      <LogEffectsModal isOpen={open === 'effects'} onClose={close} onSuccess={() => showToast('Symptoms recorded')} />
      <NotificationsModal isOpen={open === 'notifications'} onClose={close} />
      <PkInfoModal open={open === 'level'} onClose={close} />
      <MobileMenuDrawer isOpen={open === 'menu'} onClose={close} groups={groups} />
    </div>
  );
}
