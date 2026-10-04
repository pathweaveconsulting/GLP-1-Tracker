import type { DoseEvent, EffectEntry, UserSettings, WeightEntry } from '../types';
import { formatWeight, getWeightUnit, formatWeightChange } from './units';
import { latestWeight, nextDoseInfo, weeklyRate, weightMilestones } from './insights';
import { localDayDiff } from './dates';
import { recentSymptomSummary, severityLabel, SEVERITY_RANK } from './symptoms';

export type NotificationKind = 'dose' | 'trend' | 'milestone' | 'symptom' | 'reminder';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
}

/** Notifications computed purely from the user's own logs. Nothing here is stored or invented. */
export function buildNotifications(args: {
  doses: DoseEvent[];
  weights: WeightEntry[];
  effects: EffectEntry[];
  settings: UserSettings;
  now?: Date;
}): AppNotification[] {
  const { doses, weights, effects, settings } = args;
  const now = args.now ?? new Date();
  const unit = getWeightUnit(settings);
  const out: AppNotification[] = [];

  const next = nextDoseInfo(doses, now);
  if (next.lastDose && next.dueDate && next.daysUntil != null) {
    const d = next.daysUntil;
    const last = `${next.lastDose.amountMg} mg ${next.lastDose.medication}`;
    if (d < 0) {
      out.push({
        id: 'dose-overdue',
        kind: 'dose',
        title: 'Past your usual weekly interval',
        description: `Your last logged dose (${last}) was ${localDayDiff(next.lastDose.date, now)} days ago. If you missed a dose, follow your prescriber's or the medication's missed-dose guidance and never double up.`,
      });
    } else if (d <= 2) {
      out.push({
        id: 'dose-due',
        kind: 'dose',
        title: d === 0 ? 'Weekly dose day' : 'Next dose coming up',
        description: `Based on your last logged dose (${last}), a weekly schedule puts your next one ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'in 2 days'}. Take the dose your prescriber told you to take.`,
      });
    }
  }

  const rate = weeklyRate(weights, now);
  if (rate) {
    out.push({
      id: 'trend',
      kind: 'trend',
      title: 'Your recent weight trend',
      description: `Across ${rate.points} weigh-ins over ${rate.spanDays} days your trend is ${formatWeightChange(rate.lbsPerWeek, unit)} per week.`,
    });
  }

  const latest = latestWeight(weights);
  if (latest) {
    const startLbs = settings.startingWeight > 0 ? settings.startingWeight : null;
    const next = weightMilestones({ weights, startLbs, targetLbs: settings.targetWeight })
      .filter((m) => !m.reached && m.id.startsWith('pct-'))[0];
    if (next && startLbs) {
      const pct = Number(next.id.replace('pct-', ''));
      const toGoLbs = latest.weightLbs - startLbs * (1 - pct / 100);
      out.push({
        id: 'milestone',
        kind: 'milestone',
        title: 'Next milestone',
        description: `${formatWeight(toGoLbs, unit)} to go until ${pct}% of your starting weight is lost.`,
      });
    }
    const gap = localDayDiff(latest.date, now);
    if (gap >= 10) {
      out.push({
        id: 'weigh-in-gap',
        kind: 'reminder',
        title: 'A gentle nudge',
        description: `Your last weigh-in was ${gap} days ago. Whenever you're ready, a new one keeps your trend accurate.`,
      });
    }
  }

  const sym = recentSymptomSummary(effects, now, 3);
  const notable = sym.items.filter((i) => SEVERITY_RANK[i.peak] >= SEVERITY_RANK.moderate)[0];
  if (notable) {
    out.push({
      id: 'symptom',
      kind: 'symptom',
      title: 'Symptoms you logged recently',
      description: `${notable.label} was ${severityLabel(notable.peak).toLowerCase()} in the last 3 days. If it is severe or does not ease, contact your care team.`,
    });
  }

  return out;
}
