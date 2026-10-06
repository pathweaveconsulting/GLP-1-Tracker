import type { DoseEvent, EffectEntry, UserSettings, WeightEntry } from '../types';
import { formatWeightChange, getWeightUnit } from './units';
import { currentPlateau, nextDoseInfo, weeklyRate } from './insights';
import { recentSymptomSummary, severityLabel, SEVERITY_RANK } from './symptoms';
import { localDayDiff } from './dates';

export type TipSource = 'logs' | 'general';
export type TipIcon = 'syringe' | 'scale' | 'pause' | 'activity' | 'droplet' | 'heart' | 'lightbulb' | 'smile';

export interface Tip {
  id: string;
  source: TipSource;
  category: string;
  title: string;
  desc: string;
  /** Extra explanation revealed by "Read more". */
  details: string;
  icon: TipIcon;
}

/** General, non-personalised advice for common symptoms. Wording is deliberately conservative. */
const SYMPTOM_ADVICE: Record<string, { title: string; details: string }> = {
  nausea: {
    title: 'Easing nausea',
    details: 'Smaller, more frequent meals and plain, low-fat foods are commonly suggested. Sipping fluids slowly can help. If you cannot keep fluids down, or nausea is severe or lasting, contact your care team.',
  },
  constipation: {
    title: 'Keeping things moving',
    details: 'Fluids, fibre-rich foods and gentle movement are commonly suggested. Ask your pharmacist or care team before adding laxatives or supplements.',
  },
  diarrhea: {
    title: 'Looking after yourself with loose stools',
    details: 'Keep up fluids so you do not get dehydrated. If it lasts more than a couple of days, or you feel dizzy or very thirsty, contact your care team.',
  },
  reflux: {
    title: 'Settling reflux',
    details: 'Smaller meals, eating slowly and avoiding lying down soon after eating are commonly suggested. Persistent or severe heartburn is worth raising with your care team.',
  },
  fatigue: {
    title: 'When you feel tired',
    details: 'Eating enough protein and staying hydrated can matter more than usual when portions are small. Rest when you need to. If tiredness is heavy or does not lift, mention it to your care team.',
  },
  bloating: {
    title: 'Easing bloating',
    details: 'Eating more slowly, smaller portions and limiting fizzy drinks are commonly suggested. A short walk after meals helps some people.',
  },
};

export function buildRecommendations(args: {
  doses: DoseEvent[];
  weights: WeightEntry[];
  effects: EffectEntry[];
  settings: UserSettings;
  now?: Date;
}): Tip[] {
  const { doses, weights, effects, settings } = args;
  const now = args.now ?? new Date();
  const unit = getWeightUnit(settings);
  const tips: Tip[] = [];

  // --- From the user's logs ---
  const next = nextDoseInfo(doses, now);
  if (next.lastDose && next.dueDate && next.daysUntil != null) {
    const d = next.daysUntil;
    const sinceLast = localDayDiff(next.lastDose.date, now);
    if (d < 0) {
      tips.push({
        id: 'dose-late',
        source: 'logs',
        category: 'Dose timing',
        title: `It has been ${sinceLast} days since your last logged dose`,
        desc: 'That is longer than a weekly schedule. Check your prescriber’s or the medication’s missed-dose guidance.',
        details: 'If you have missed a dose, follow the instructions for your specific medication or ask your pharmacist or prescriber. Do not take extra or double up to catch up. If you have simply forgotten to log a dose, add it so your history stays accurate.',
        icon: 'syringe',
      });
    } else {
      tips.push({
        id: 'dose-upcoming',
        source: 'logs',
        category: 'Dose timing',
        title: d === 0 ? 'A weekly dose would fall today' : d === 1 ? 'A weekly dose would fall tomorrow' : `A weekly dose would fall in ${d} days`,
        desc: `Your last logged dose was ${next.lastDose.amountMg} mg ${next.lastDose.medication}, ${sinceLast === 0 ? 'today' : `${sinceLast} ${sinceLast === 1 ? 'day' : 'days'} ago`}.`,
        details: 'This is only a count from your last logged date, assuming a 7-day interval. Your prescriber decides your schedule and dose, so follow their instructions. It can help to have your supplies ready the day before.',
        icon: 'syringe',
      });
    }
  }

  const rate = weeklyRate(weights, now);
  if (rate) {
    tips.push({
      id: 'trend',
      source: 'logs',
      category: 'Weight trend',
      title: `Your recent trend: ${formatWeightChange(rate.lbsPerWeek, unit)} per week`,
      desc: `Fitted across ${rate.points} weigh-ins over ${rate.spanDays} days.`,
      details: 'Day-to-day readings move with water, salt and digestion, so a trend across several weeks tells you more than any single weigh-in. Weigh at a similar time under similar conditions if you can. If your trend worries you, or you are losing weight faster than your care team expects, tell them.',
      icon: 'scale',
    });
  }

  const plateau = currentPlateau(weights, now);
  if (plateau) {
    tips.push({
      id: 'plateau',
      source: 'logs',
      category: 'Plateau',
      title: `Your weight has held steady for about ${plateau.days} days`,
      desc: `${plateau.weighIns} weigh-ins have stayed within roughly 1 lb of each other.`,
      details: 'Pauses like this are common and often do not last. Meanwhile, how your clothes fit, energy, and appetite are also useful signs of progress. If a plateau goes on or concerns you, a check-in with your care team can help you decide whether anything needs to change. Do not change your dose on your own.',
      icon: 'pause',
    });
  }

  const sym = recentSymptomSummary(effects, now, 7);
  sym.items
    .filter((i) => SEVERITY_RANK[i.peak] >= SEVERITY_RANK.moderate)
    .slice(0, 3)
    .forEach((i) => {
      const advice = SYMPTOM_ADVICE[i.key];
      tips.push({
        id: `symptom-${i.key}`,
        source: 'logs',
        category: 'Symptoms you logged',
        title: advice?.title ?? `${i.label} this week`,
        desc: `You logged ${i.label.toLowerCase()} as ${severityLabel(i.peak).toLowerCase()} on ${i.daysPresent} of the last ${sym.daysLogged} logged ${sym.daysLogged === 1 ? 'day' : 'days'}.`,
        details: advice?.details ?? 'If this keeps happening, or it is hard to manage, mention it to your care team so they can help.',
        icon: 'activity',
      });
    });

  if (tips.length === 0) {
    tips.push({
      id: 'start-logging',
      source: 'logs',
      category: 'Getting started',
      title: 'Your tips will appear here as you log',
      desc: 'Doses, weigh-ins and symptoms let us tailor what we show you.',
      details: 'Nothing here is guessed. Once you have logged a few weeks, this page will point out dose timing, your weight trend, plateaus and symptoms that need attention, all taken from your own entries.',
      icon: 'lightbulb',
    });
  }

  // --- General (not personalised) ---
  tips.push(
    {
      id: 'general-hydration',
      source: 'general',
      category: 'General tip',
      title: 'Hydration helps',
      desc: 'Sip fluids through the day, since appetite and thirst can both be quieter on treatment.',
      details: 'Many side effects feel worse when you are dehydrated. Ask your care team how much fluid is right for you, especially if you have heart or kidney conditions.',
      icon: 'droplet',
    },
    {
      id: 'general-protein',
      source: 'general',
      category: 'General tip',
      title: 'Protein first',
      desc: 'Starting meals with protein helps many people feel satisfied on smaller portions.',
      details: 'When you eat less overall, it is worth making the food you do eat count. A dietitian can tailor protein and nutrition targets to you.',
      icon: 'heart',
    },
    {
      id: 'general-plateaus',
      source: 'general',
      category: 'General tip',
      title: 'Weight loss is not a straight line',
      desc: 'Pauses of a week or two are common.',
      details: 'Look at the trend over several weeks rather than daily changes. If you are unsure whether something is normal for you, your care team is the best person to ask.',
      icon: 'lightbulb',
    },
    {
      id: 'general-quiet',
      source: 'general',
      category: 'General tip',
      title: 'Notice the quiet',
      desc: 'Logging the good days, such as calm food noise, shows you your own pattern over time.',
      details: 'Positive entries are just as useful as difficult ones. Over weeks they reveal which days of your cycle feel easiest.',
      icon: 'smile',
    },
  );
  return tips;
}
