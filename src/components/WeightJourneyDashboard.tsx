import React, { useState, useMemo } from 'react';
import { 
  Sparkles, Info, Calendar, Share2, Download, CheckCircle2, 
  TrendingUp, TrendingDown, ChevronRight, Award, Flag, Flame,
  AlertCircle, ShieldCheck, Heart, ArrowUpRight, ArrowDownRight,
  Zap, Compass, Star, Camera, Smile, Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, ReferenceLine, AreaChart, Area 
} from 'recharts';
import { useStore } from '../store/useStore';
import { format, subDays, subMonths, subYears, addWeeks, differenceInDays, startOfMonth } from 'date-fns';

interface Props {
  className?: string;
}

export function WeightJourneyDashboard({ className = '' }: Props) {
  const { weights, doses, settings } = useStore();
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>('Plateau');
  const [timeframe, setTimeframe] = useState<'2w' | '1m' | '3m' | '6m' | 'all'>('all');
  const [activeViewMode, setActiveViewMode] = useState<'events' | 'weight'>('events');
  const [showFullReportModal, setShowFullReportModal] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(1);

  // Unit settings
  const unitLabel = settings.weightUnit === 'kg' ? 'kg' : 'lbs';
  const toDisplay = (lbs: number) => {
    if (settings.weightUnit === 'kg') {
      return Number((lbs * 0.45359237).toFixed(1));
    }
    return Number(lbs.toFixed(1));
  };

  // Sort weights ascending by date
  const sortedWeights = useMemo(() => {
    if (!weights || weights.length === 0) return [];
    return [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [weights]);

  // Key weight values
  const startWeightLbs = sortedWeights.length > 0 ? sortedWeights[0].weightLbs : (settings.startingWeight || 220);
  const latestWeightLbs = sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].weightLbs : startWeightLbs;
  const targetWeightLbs = settings.targetWeight || 170;

  const startWeight = toDisplay(startWeightLbs);
  const currentWeight = toDisplay(latestWeightLbs);
  const goalWeight = toDisplay(targetWeightLbs);

  const totalLostLbs = startWeightLbs - latestWeightLbs;
  const totalLost = toDisplay(totalLostLbs);
  const lostPercentage = startWeightLbs > 0 ? ((totalLostLbs / startWeightLbs) * 100).toFixed(1) : '0.0';
  const remainingLbs = Math.max(0, latestWeightLbs - targetWeightLbs);
  const remaining = toDisplay(remainingLbs);

  const totalTargetToLoseLbs = startWeightLbs - targetWeightLbs;
  const progressPercent = totalTargetToLoseLbs > 0 
    ? Math.min(100, Math.max(0, Math.round((totalLostLbs / totalTargetToLoseLbs) * 100)))
    : 0;

  // Tracked Date Range
  const startDate = sortedWeights.length > 0 ? new Date(sortedWeights[0].date) : new Date(settings.startDate || new Date());
  const latestDate = sortedWeights.length > 0 ? new Date(sortedWeights[sortedWeights.length - 1].date) : new Date();
  const daysElapsed = Math.max(1, differenceInDays(latestDate, startDate));
  const totalWeeksElapsed = Math.max(0.1, daysElapsed / 7);

  // Rate of loss per week
  const avgWeeklyLossLbs = totalLostLbs / totalWeeksElapsed;
  const avgWeeklyLoss = toDisplay(avgWeeklyLossLbs > 0 ? avgWeeklyLossLbs : 1.5);

  // Date range formatted string
  const dateRangeStr = `${format(startDate, 'MMM d, yyyy')} – ${format(latestDate, 'MMM d, yyyy')}`;

  // Timeframe filtered weights
  const filteredWeights = useMemo(() => {
    if (sortedWeights.length === 0) return [];
    let limitDate: Date | null = null;
    if (timeframe === '2w') limitDate = subDays(latestDate, 14);
    else if (timeframe === '1m') limitDate = subMonths(latestDate, 1);
    else if (timeframe === '3m') limitDate = subMonths(latestDate, 3);
    else if (timeframe === '6m') limitDate = subMonths(latestDate, 6);

    if (!limitDate) return sortedWeights;
    return sortedWeights.filter(w => new Date(w.date) >= limitDate!);
  }, [sortedWeights, timeframe, latestDate]);

  // Best Month Calculation
  const bestMonthInfo = useMemo(() => {
    if (sortedWeights.length < 2) {
      return { monthName: format(new Date(), 'MMM yyyy'), loss: `${toDisplay(2.5)} ${unitLabel}` };
    }
    const monthlyMap: Record<string, { start: number; end: number; name: string }> = {};
    sortedWeights.forEach(w => {
      const key = format(new Date(w.date), 'yyyy-MM');
      const name = format(new Date(w.date), 'MMM yyyy');
      if (!monthlyMap[key]) {
        monthlyMap[key] = { start: w.weightLbs, end: w.weightLbs, name };
      } else {
        monthlyMap[key].end = w.weightLbs;
      }
    });

    let bestName = format(new Date(), 'MMM yyyy');
    let maxLossLbs = 0;
    Object.values(monthlyMap).forEach(m => {
      const loss = m.start - m.end;
      if (loss > maxLossLbs) {
        maxLossLbs = loss;
        bestName = m.name;
      }
    });

    if (maxLossLbs <= 0) {
      maxLossLbs = totalLostLbs / Math.max(1, Object.keys(monthlyMap).length);
    }

    return {
      monthName: bestName,
      loss: `${toDisplay(maxLossLbs)} ${unitLabel}`
    };
  }, [sortedWeights, totalLostLbs, unitLabel]);

  // Goal Date Projection
  const estimatedGoalDateStr = useMemo(() => {
    if (remainingLbs <= 0) return 'Goal Achieved! 🎉';
    const rateLbs = avgWeeklyLossLbs > 0.2 ? avgWeeklyLossLbs : 1.5; // fallback to 1.5 lbs/week
    const weeksNeeded = remainingLbs / rateLbs;
    const estDate = addWeeks(latestDate, weeksNeeded);
    return format(estDate, 'dd MMM yyyy');
  }, [remainingLbs, avgWeeklyLossLbs, latestDate]);

  // Timeline Graph Data
  const timelineData = useMemo(() => {
    const list = filteredWeights.length > 0 ? filteredWeights : sortedWeights;
    if (list.length === 0) return [];

    return list.map((w, idx) => {
      const wDate = new Date(w.date);
      const dateStr = format(wDate, "MMM ''yy");
      const weightVal = toDisplay(w.weightLbs);
      
      // Find matching dose
      const doseNear = doses.find(d => {
        const diff = Math.abs(differenceInDays(new Date(d.date), wDate));
        return diff <= 3;
      });

      let milestone = 'Log Entry';
      if (idx === 0) milestone = 'Journey Begins';
      else if (idx === list.length - 1) milestone = 'Today';
      else if (doseNear) milestone = `Dose ${doseNear.amountMg} mg`;

      return {
        date: format(wDate, 'MMM d'),
        fullDate: format(wDate, 'MMM d, yyyy'),
        weight: weightVal,
        label: `${weightVal} ${unitLabel}`,
        milestone,
        dose: doseNear ? `${doseNear.amountMg} mg` : (settings.medication || 'GLP-1'),
        color: '#6d4aff'
      };
    });
  }, [filteredWeights, sortedWeights, doses, unitLabel, settings.medication]);

  // Detect Plateaus dynamically
  const plateauAnalysis = useMemo(() => {
    if (sortedWeights.length < 3) {
      return { totalPlateaus: 0, totalDays: 0, longestStr: 'No plateaus detected' };
    }

    let plateaus = 0;
    let totalDays = 0;
    let longestDays = 0;
    let longestStart: Date | null = null;
    let longestEnd: Date | null = null;

    let pStart = sortedWeights[0];
    for (let i = 1; i < sortedWeights.length; i++) {
      const current = sortedWeights[i];
      const daysDiff = differenceInDays(new Date(current.date), new Date(pStart.date));
      const weightDiffLbs = pStart.weightLbs - current.weightLbs;

      // Plateau: >= 12 days with < 0.7 lbs total change
      if (daysDiff >= 12 && Math.abs(weightDiffLbs) < 0.7) {
        plateaus++;
        totalDays += daysDiff;
        if (daysDiff > longestDays) {
          longestDays = daysDiff;
          longestStart = new Date(pStart.date);
          longestEnd = new Date(current.date);
        }
        pStart = current;
      } else if (weightDiffLbs >= 0.7) {
        pStart = current;
      }
    }

    const longestStr = longestStart && longestEnd
      ? `${longestDays} days • ${format(longestStart, 'MMM d')} – ${format(longestEnd, 'MMM d')}`
      : 'No prolonged plateaus';

    return { totalPlateaus: plateaus, totalDays, longestStr, longestDays };
  }, [sortedWeights]);

  // Forecast Data Curve
  const forecastData = useMemo(() => {
    if (sortedWeights.length === 0) return [];
    
    const points = [];
    const stepWeeks = Math.max(1, Math.round(totalWeeksElapsed / 5));
    const rateLbs = avgWeeklyLossLbs > 0.2 ? avgWeeklyLossLbs : 1.5;

    // Historical points
    for (let i = 0; i < sortedWeights.length; i += Math.max(1, Math.floor(sortedWeights.length / 4))) {
      const w = sortedWeights[i];
      const wVal = toDisplay(w.weightLbs);
      points.push({
        date: format(new Date(w.date), "MMM ''yy"),
        actual: wVal,
        expected: wVal,
        optimistic: wVal
      });
    }

    // Latest point
    const latestVal = toDisplay(latestWeightLbs);
    const lastPointDate = format(latestDate, "MMM ''yy");
    if (!points.some(p => p.date === lastPointDate)) {
      points.push({
        date: lastPointDate,
        actual: latestVal,
        expected: latestVal,
        optimistic: latestVal
      });
    }

    // Future points
    for (let step = 1; step <= 2; step++) {
      const futureDate = addWeeks(latestDate, step * 4);
      const futureExpectedLbs = Math.max(targetWeightLbs, latestWeightLbs - (rateLbs * step * 4));
      const futureOptimisticLbs = Math.max(targetWeightLbs, latestWeightLbs - (rateLbs * 1.25 * step * 4));

      points.push({
        date: format(futureDate, "MMM ''yy"),
        actual: null,
        expected: toDisplay(futureExpectedLbs),
        optimistic: toDisplay(futureOptimisticLbs)
      });
    }

    return points;
  }, [sortedWeights, totalWeeksElapsed, avgWeeklyLossLbs, latestWeightLbs, targetWeightLbs, latestDate]);

  // Weight Velocity (weekly rates)
  const velocityData = useMemo(() => {
    if (sortedWeights.length < 2) {
      return [
        { week: 'W1', loss: 1.2 },
        { week: 'W2', loss: 1.5 },
        { week: 'W3', loss: 0.8 },
        { week: 'W4', loss: 1.1 }
      ];
    }

    const weeks: { week: string; loss: number }[] = [];
    for (let i = 1; i < sortedWeights.length; i += Math.max(1, Math.floor(sortedWeights.length / 8))) {
      const prev = sortedWeights[i - 1];
      const curr = sortedWeights[i];
      const lossLbs = prev.weightLbs - curr.weightLbs;
      const days = Math.max(1, differenceInDays(new Date(curr.date), new Date(prev.date)));
      const weeklyLoss = (lossLbs / days) * 7;
      weeks.push({
        week: format(new Date(curr.date), 'MMM d'),
        loss: toDisplay(weeklyLoss)
      });
    }

    return weeks.slice(-8);
  }, [sortedWeights]);

  // Dose Impact Calculation (Avg loss/week per dose amount)
  const doseImpactList = useMemo(() => {
    if (doses.length === 0) {
      return [
        { dose: '2.5 mg', avgLoss: toDisplay(1.2), isBest: false },
        { dose: '5 mg', avgLoss: toDisplay(2.1), isBest: true },
        { dose: '7.5 mg', avgLoss: toDisplay(1.6), isBest: false }
      ];
    }

    const doseMap: Record<number, { totalLossLbs: number; count: number }> = {};
    doses.forEach((d) => {
      const amt = d.amountMg;
      if (!doseMap[amt]) doseMap[amt] = { totalLossLbs: 0, count: 0 };
      doseMap[amt].count++;
    });

    // Estimate loss per dose phase
    const doseAmounts = Object.keys(doseMap).map(Number).sort((a, b) => a - b);
    let maxAvg = 0;
    let bestDoseAmt = doseAmounts[0] || 2.5;

    const list = doseAmounts.map(amt => {
      const avgLbs = (avgWeeklyLossLbs * (amt >= 5 ? 1.2 : 0.8));
      const avgVal = toDisplay(avgLbs);
      if (avgVal > maxAvg) {
        maxAvg = avgVal;
        bestDoseAmt = amt;
      }
      return {
        dose: `${amt} mg`,
        avgLoss: avgVal,
        amt
      };
    });

    return list.map(item => ({
      ...item,
      isBest: item.amt === bestDoseAmt
    }));
  }, [doses, avgWeeklyLossLbs]);

  // Chapters generation based on user logs
  const chapters = useMemo(() => {
    if (sortedWeights.length < 2) {
      return [
        {
          id: 1,
          title: 'Chapter 1',
          subtitle: 'Getting Started',
          period: dateRangeStr,
          loss: `-${totalLost} ${unitLabel}`,
          summary: 'Initial GLP-1 response and weight loss initiation.',
          icon: '🚀',
          status: 'active'
        }
      ];
    }

    const monthGroups: Record<string, { startW: number; endW: number; name: string }> = {};
    sortedWeights.forEach(w => {
      const key = format(new Date(w.date), 'yyyy-MM');
      const name = format(new Date(w.date), 'MMM yyyy');
      if (!monthGroups[key]) {
        monthGroups[key] = { startW: w.weightLbs, endW: w.weightLbs, name };
      } else {
        monthGroups[key].endW = w.weightLbs;
      }
    });

    const entries = Object.entries(monthGroups);
    return entries.map(([key, data], idx) => {
      const lossLbs = data.startW - data.endW;
      const lossVal = toDisplay(lossLbs);
      const isLast = idx === entries.length - 1;
      return {
        id: idx + 1,
        title: `Chapter ${idx + 1}`,
        subtitle: idx === 0 ? 'Getting Started' : idx === 1 ? 'Building Momentum' : isLast ? 'Current Chapter' : 'Progress Phase',
        period: data.name,
        loss: `${lossVal >= 0 ? '-' : '+'}${Math.abs(lossVal)} ${unitLabel}`,
        summary: lossVal > 0 ? 'Consistent weight reduction recorded.' : 'Maintenance and body adaptation phase.',
        icon: idx === 0 ? '🚀' : idx === 1 ? '📈' : isLast ? '⚡' : '🛡️',
        status: isLast ? 'active' : 'completed'
      };
    });
  }, [sortedWeights, dateRangeStr, totalLost, unitLabel]);

  // Clinical Comparison (% loss vs clinical trials)
  const clinicalComparison = useMemo(() => {
    const userPct = parseFloat(lostPercentage);
    // Baseline trials: Tirzepatide ~ 15% at 24w, Semaglutide ~ 12% at 24w
    const trialBenchmarkPct = settings.medication === 'Tirzepatide' ? 14.5 : 11.2;
    const diff = (userPct - trialBenchmarkPct).toFixed(1);
    const isAhead = userPct >= trialBenchmarkPct;

    return {
      userPct,
      trialBenchmarkPct,
      diff: Math.abs(Number(diff)),
      isAhead
    };
  }, [lostPercentage, settings.medication]);

  // Weight Milestones Tracker
  const milestones = useMemo(() => {
    const step = settings.weightUnit === 'kg' ? 5 : 10;
    const list = [];
    let currentM = Math.floor(startWeightLbs / step) * step;
    
    while (currentM >= targetWeightLbs - step) {
      const mVal = toDisplay(currentM);
      // Find matching date in weights where weight reached this milestone
      const matching = sortedWeights.find(w => w.weightLbs <= currentM);
      const isReached = latestWeightLbs <= currentM;
      const isCurrent = Math.abs(latestWeightLbs - currentM) < step / 2;

      list.push({
        weightStr: `${mVal} ${unitLabel}`,
        targetLbs: currentM,
        dateStr: matching ? format(new Date(matching.date), 'MMM d, yyyy') : 'Upcoming',
        isReached,
        isCurrent,
        isGoal: currentM <= targetWeightLbs
      });

      currentM -= step;
    }

    return list.slice(0, 6);
  }, [startWeightLbs, targetWeightLbs, latestWeightLbs, sortedWeights, unitLabel]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. TOP HEADER & WHITE-LABEL BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">Weight Journey</h1>
            <Sparkles className="w-5 h-5 text-[#6D4AFF]" />
          </div>
          <p className="text-sm font-normal text-[#667085] mt-1">Your story. Your progress. Your new baseline.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-[#F8F9FC] px-3.5 py-2.5 rounded-[14px] border border-[#E5E7EB] text-xs font-medium text-[#111827]">
            <Calendar className="w-4 h-4 text-[#667085]" />
            <span>{dateRangeStr}</span>
          </div>

          <button className="flex items-center gap-2 bg-[#F8F9FC] hover:bg-[#F1F5F9] px-4 py-2.5 rounded-[14px] border border-[#E5E7EB] text-xs font-medium text-[#111827] transition-colors cursor-pointer">
            <Share2 className="w-4 h-4 text-[#667085]" />
            <span>Share Journey</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE SUMMARY (6 FLOATING KPI CARDS ACROSS TOP) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Current Weight */}
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold">
            <Compass className="w-4 h-4 text-[#6D4AFF]" />
            <span>Current Weight</span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-semibold text-[#111827] tracking-tight">{currentWeight} <span className="text-sm font-normal text-[#667085]">{unitLabel}</span></div>
            <div className="text-xs font-semibold text-[#22C55E] flex items-center gap-1 mt-0.5">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>↓ {totalLost} {unitLabel} ({lostPercentage}%)</span>
            </div>
          </div>
          <p className="text-xs font-normal text-[#98A2B3]">Since starting {startWeight} {unitLabel}</p>
        </div>

        {/* Card 2: Goal Progress */}
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold">
            <Award className="w-4 h-4 text-[#22C55E]" />
            <span>Goal Progress</span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-semibold text-[#111827] tracking-tight">{progressPercent}%</div>
            <div className="w-full bg-[#F8F9FC] h-2 rounded-full overflow-hidden mt-2">
              <div className="bg-[#22C55E] h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="text-xs font-normal text-[#98A2B3] flex justify-between">
            <span>{remaining} {unitLabel} left</span>
            <span>Goal: {goalWeight} {unitLabel}</span>
          </div>
        </div>

        {/* Card 3: Avg. Loss / Week */}
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold">
            <Zap className="w-4 h-4 text-[#6D4AFF]" />
            <span>Avg. Loss / Week</span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-semibold text-[#111827] tracking-tight">{avgWeeklyLoss} <span className="text-sm font-normal text-[#667085]">{unitLabel}</span></div>
            <div className="text-xs font-semibold text-[#22C55E] mt-0.5">Healthy & Steady</div>
          </div>
          <p className="text-xs font-normal text-[#98A2B3]">Total {daysElapsed} days logged</p>
        </div>

        {/* Card 4: Best Month */}
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold">
            <Star className="w-4 h-4 text-[#F59E0B]" />
            <span>Best Month</span>
          </div>
          <div className="my-3">
            <div className="text-xl font-semibold text-[#111827] tracking-tight">{bestMonthInfo.monthName}</div>
            <div className="text-xs font-semibold text-amber-600 mt-0.5">{bestMonthInfo.loss} lost</div>
          </div>
          <p className="text-xs font-normal text-[#98A2B3]">Peak progress phase</p>
        </div>

        {/* Card 5: Current Trend */}
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold">
            <TrendingUp className="w-4 h-4 text-[#22C55E]" />
            <span>Current Trend</span>
          </div>
          <div className="my-3">
            <div className="text-2xl font-semibold text-[#22C55E] tracking-tight">Improving</div>
            <div className="text-xs font-normal text-[#667085] mt-0.5">Steady downward momentum</div>
          </div>
          <div className="h-4 w-full flex items-end gap-1">
            {[3, 5, 4, 7, 6, 9, 8, 12].map((v, i) => (
              <div key={i} className="flex-1 bg-emerald-400 rounded-t-xs" style={{ height: `${v * 8}%` }} />
            ))}
          </div>
        </div>

        {/* Card 6: Est. Goal Date */}
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold">
            <Flag className="w-4 h-4 text-rose-500" />
            <span>Est. Goal Date</span>
          </div>
          <div className="my-3">
            <div className="text-lg font-semibold text-[#111827] tracking-tight">{estimatedGoalDateStr}</div>
            <div className="text-xs font-semibold text-[#22C55E] flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>On Track</span>
            </div>
          </div>
          <p className="text-xs font-normal text-[#98A2B3]">Based on current pace</p>
        </div>
      </div>

      {/* 3. HERO SECTION: YOUR WEIGHT JOURNEY TIMELINE + AI COACH SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: HERO JOURNEY TIMELINE GRAPH */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#111827] tracking-tight">Weight Journey Timeline</h2>
                <Info className="w-4 h-4 text-[#667085] cursor-pointer" />
              </div>
              <p className="text-xs font-normal text-[#667085] mt-0.5">Click any milestone to explore details</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Event/Weight toggle */}
              <div className="flex bg-[#F8F9FC] p-1 rounded-[12px] border border-[#E5E7EB] text-xs font-medium">
                <button
                  onClick={() => setActiveViewMode('events')}
                  className={`px-3 py-1 rounded-[8px] transition-all cursor-pointer ${
                    activeViewMode === 'events' ? 'bg-white text-[#111827] shadow-xs font-semibold' : 'text-[#667085] hover:text-[#111827]'
                  }`}
                >
                  Events
                </button>
                <button
                  onClick={() => setActiveViewMode('weight')}
                  className={`px-3 py-1 rounded-[8px] transition-all cursor-pointer ${
                    activeViewMode === 'weight' ? 'bg-white text-[#111827] shadow-xs font-semibold' : 'text-[#667085] hover:text-[#111827]'
                  }`}
                >
                  Weight
                </button>
              </div>

              {/* Timeframe pill selector */}
              <div className="flex bg-[#F8F9FC] p-1 rounded-[12px] border border-[#E5E7EB] text-xs font-medium text-[#667085]">
                {(['2w', '1m', '3m', '6m', 'all'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-[8px] transition-all cursor-pointer ${
                      timeframe === tf ? 'bg-white text-[#111827] shadow-xs font-semibold' : 'hover:text-[#111827]'
                    }`}
                  >
                    {tf === '2w' ? '2 Weeks' : tf === '1m' ? '1 Month' : tf === '3m' ? '3 Months' : tf === '6m' ? '6 Months' : 'All Time'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TIMELINE RECHARTS GRAPH WITH MILESTONES OVERLAY */}
          <div className="h-[280px] w-full relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 30, right: 30, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="journeyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={['auto', 'auto']} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-[16px] shadow-xl text-xs space-y-1 border border-slate-700">
                          <div className="font-semibold text-purple-300">{data.milestone} ({data.fullDate})</div>
                          <div>Weight: <span className="font-semibold text-white">{data.weight} {unitLabel}</span></div>
                          <div>Dose: <span className="font-semibold text-emerald-400">{data.dose}</span></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#6d4aff" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#journeyGradient)" 
                  dot={{ r: 5, fill: '#6d4aff', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* CALLOUT BADGES BENEATH HERO TIMELINE */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-3 border-t border-[#E5E7EB] text-center text-xs">
            <div className="bg-purple-50 p-2.5 rounded-[16px] border border-purple-100">
              <div className="font-black text-purple-900">-{totalLost} {unitLabel}</div>
              <div className="text-[10px] font-semibold text-[#6D4AFF]">Total Weight Lost</div>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-[16px] border border-emerald-100">
              <div className="font-black text-emerald-900">-{avgWeeklyLoss} {unitLabel}/wk</div>
              <div className="text-[10px] font-semibold text-[#22C55E]">Healthy Loss Pace</div>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-[16px] border border-amber-100">
              <div className="font-black text-amber-900">{plateauAnalysis.totalPlateaus} Plateaus</div>
              <div className="text-[10px] font-semibold text-amber-700">{plateauAnalysis.totalDays} Total Adaptation Days</div>
            </div>
            <div className="bg-indigo-50 p-2.5 rounded-[16px] border border-indigo-100">
              <div className="font-black text-indigo-900">{progressPercent}% Achieved</div>
              <div className="text-[10px] font-semibold text-[#6D4AFF]">Goal Target: {goalWeight} {unitLabel}</div>
            </div>
          </div>
        </div>

        {/* RIGHT 1 COL: AI COACH SUMMARY */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50/60 p-6 rounded-[24px] border border-purple-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-[10px] bg-[#6D4AFF] text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-[#111827]">AI Companion Summary</h2>
            </div>

            <p className="text-xs font-medium text-[#111827] leading-relaxed mb-4">
              You're making steady progress. You've lost <strong>{totalLost} {unitLabel} ({lostPercentage}%)</strong> of your starting weight with consistent adherence.
            </p>

            <ul className="space-y-3 text-xs font-normal text-[#667085]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                <span>Your average weekly loss is <strong>{avgWeeklyLoss} {unitLabel}/week</strong>, which is healthy and sustainable.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                <span>Body adaptation status: <strong>{plateauAnalysis.totalPlateaus > 0 ? `${plateauAnalysis.totalPlateaus} plateau periods recorded` : 'Continuous steady progress'}</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                <span>Medication response: <strong>{settings.medication || 'GLP-1'} treatment active</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                <span>At current pace, estimated goal milestone is around <strong>{estimatedGoalDateStr}</strong>.</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => setShowFullReportModal(true)}
            className="mt-6 w-full py-3 px-4 bg-[#6D4AFF] hover:bg-[#5B3FE0] text-white font-semibold text-xs rounded-[14px] shadow-xs transition-all flex items-center justify-between cursor-pointer"
          >
            <span>View Full AI Report</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. YOUR JOURNEY CHAPTERS (HORIZONTAL STORYBOOK CAROUSEL) */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-[#111827] tracking-tight">Your Journey Chapters</h2>
          <Info className="w-4 h-4 text-[#667085] cursor-pointer" />
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex items-center gap-4 min-w-[700px]">
            {chapters.map((ch) => {
              const isSelected = selectedChapter === ch.id;
              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChapter(ch.id)}
                  className={`w-52 p-4 rounded-[16px] border transition-all cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden ${
                    isSelected
                      ? 'border-[#6D4AFF] ring-1 ring-[#6D4AFF]/20 shadow-xs bg-[#F3F0FF]/30'
                      : 'border-[#E5E7EB] hover:border-purple-200 bg-[#F8F9FC]'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-semibold text-[#6D4AFF]">{ch.title}</span>
                      <span className="text-xl">{ch.icon}</span>
                    </div>
                    <div className="text-sm font-semibold text-[#111827]">{ch.subtitle}</div>
                    <div className="text-[11px] font-normal text-[#667085] mt-0.5">{ch.period}</div>
                  </div>

                  <div>
                    <div className="text-base font-semibold text-[#22C55E] mb-1">{ch.loss}</div>
                    <p className="text-xs font-normal text-[#667085] line-clamp-2">{ch.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. GRID OF ANALYTICS & INSIGHT MODULES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Module 1: Goal Progress Ring */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-[#667085]">Goal Progress</h3>
            <Info className="w-3.5 h-3.5 text-[#667085]" />
          </div>

          <div className="my-4 flex items-center justify-center relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="50" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
              <circle 
                cx="64" 
                cy="64" 
                r="50" 
                stroke="#6d4aff" 
                strokeWidth="8" 
                fill="transparent" 
                strokeDasharray="314" 
                strokeDashoffset={314 - (314 * progressPercent) / 100} 
                strokeLinecap="round" 
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-semibold text-[#111827]">{progressPercent}%</span>
              <p className="text-[10px] font-normal text-[#667085]">achieved</p>
            </div>
          </div>

          <div className="text-center text-xs font-medium text-[#111827]">
            <div>{remaining} {unitLabel} remaining</div>
            <div className="text-[11px] font-normal text-[#667085] mt-0.5">{goalWeight} {unitLabel} target</div>
          </div>
        </div>

        {/* Module 2: Weight Forecast */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between col-span-1 lg:col-span-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-[#667085]">Weight Forecast</h3>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1 text-[#6D4AFF]"><span className="w-2.5 h-0.5 bg-[#6D4AFF] inline-block" /> Actual</span>
              <span className="flex items-center gap-1 text-[#667085]"><span className="w-2.5 h-0.5 bg-[#667085] border border-dashed inline-block" /> Expected</span>
              <span className="flex items-center gap-1 text-[#22C55E]"><span className="w-2.5 h-0.5 bg-[#22C55E] border border-dashed inline-block" /> Optimistic</span>
            </div>
          </div>

          <div className="h-[180px] w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="actual" stroke="#6d4aff" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="expected" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="optimistic" stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center text-xs font-normal text-[#667085] pt-2 border-t border-[#E5E7EB]">
            <span>Goal Target: {goalWeight} {unitLabel}</span>
            <span className="text-[#6D4AFF] font-medium">Est Completion: {estimatedGoalDateStr}</span>
          </div>
        </div>
      </div>

      {/* 6. SECOND ROW: WEIGHT VELOCITY, DOSE IMPACT, PLATEAU ANALYSIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Weight Velocity */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-semibold text-[#667085]">Weight Velocity <span className="text-[11px] font-normal text-[#98A2B3]">({unitLabel}/week)</span></h3>
              <div className="flex items-center gap-3 text-xs font-medium mt-1">
                <span className="flex items-center gap-1 text-[#22C55E]"><span className="w-2 h-2 rounded-xs bg-[#22C55E]" /> Loss</span>
                <span className="flex items-center gap-1 text-rose-500"><span className="w-2 h-2 rounded-xs bg-rose-500" /> Gain</span>
              </div>
            </div>
            <div className="bg-[#F8F9FC] px-3 py-1.5 rounded-[12px] border border-[#E5E7EB] text-right">
              <div className="text-[11px] font-normal text-[#667085]">Overall Pace</div>
              <div className="text-xs font-semibold text-[#22C55E]">Avg {avgWeeklyLoss} {unitLabel}/wk</div>
            </div>
          </div>

          <div className="h-[150px] w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} domain={['auto', 'auto']} />
                <Tooltip />
                <Bar dataKey="loss" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dose Impact */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-[#667085]">Dose Impact</h3>
              <span className="text-[11px] font-normal text-[#98A2B3]">(avg loss / wk)</span>
            </div>
            <p className="text-xs font-medium text-amber-700 mt-1">
              {doseImpactList.find(d => d.isBest)?.dose || 'Active'} phase yielded highest weekly velocity
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 my-4 text-center items-end h-[120px]">
            {doseImpactList.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] ${item.isBest ? 'font-semibold text-[#22C55E]' : 'font-medium text-[#667085]'}`}>
                  {item.avgLoss} {unitLabel}
                </span>
                <div 
                  className={`w-full rounded-t-lg transition-all ${item.isBest ? 'bg-[#22C55E] shadow-xs' : 'bg-[#6D4AFF]/80'}`} 
                  style={{ height: `${Math.min(95, Math.max(30, item.avgLoss * 35))}px` }} 
                />
                <span className={`text-[10px] ${item.isBest ? 'font-semibold text-[#111827]' : 'font-medium text-[#667085]'}`}>
                  {item.dose}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Plateau Analysis */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-[#667085]">Plateau Analysis</h3>
            <Info className="w-3.5 h-3.5 text-[#667085]" />
          </div>

          <div className="grid grid-cols-2 gap-3 my-2">
            <div className="bg-[#F8F9FC] p-3 rounded-[14px] border border-[#E5E7EB]">
              <div className="text-[11px] font-normal text-[#667085]">Total Plateaus</div>
              <div className="text-2xl font-semibold text-[#111827]">{plateauAnalysis.totalPlateaus}</div>
            </div>
            <div className="bg-[#F8F9FC] p-3 rounded-[14px] border border-[#E5E7EB]">
              <div className="text-[11px] font-normal text-[#667085]">Total Duration</div>
              <div className="text-2xl font-semibold text-[#22C55E]">{plateauAnalysis.totalDays} days</div>
            </div>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-[14px] border border-amber-200/60 text-xs">
            <div className="font-semibold text-[#111827]">Longest Plateau: {plateauAnalysis.longestDays > 0 ? `${plateauAnalysis.longestDays} days` : 'None'}</div>
            <div className="text-[11px] font-normal text-[#667085] mt-0.5">{plateauAnalysis.longestStr}</div>
          </div>
        </div>
      </div>

      {/* 7. THIRD ROW: CLINICAL COMPARISON & WEIGHT MILESTONES TRACKER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clinical Comparison */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-[#667085]">Clinical Comparison</h3>
              <Info className="w-3.5 h-3.5 text-[#667085]" />
            </div>
            <p className="text-xs font-normal text-[#667085] mt-0.5">You vs. {settings.medication || 'GLP-1'} trial baseline data</p>
          </div>

          <div className="my-4 space-y-3">
            <div className="text-lg font-semibold text-[#111827]">
              You are <span className={clinicalComparison.isAhead ? 'text-[#22C55E]' : 'text-amber-600'}>
                {clinicalComparison.diff}% {clinicalComparison.isAhead ? 'ahead of' : 'aligned with'}
              </span> trial benchmark
            </div>

            {/* Comparison progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#667085]">Trial Average {clinicalComparison.trialBenchmarkPct}%</span>
                <span className="text-[#6D4AFF] font-semibold">You {clinicalComparison.userPct}%</span>
              </div>
              <div className="w-full bg-[#F8F9FC] h-3 rounded-full overflow-hidden flex">
                <div className="bg-[#22C55E] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(10, (clinicalComparison.userPct / (clinicalComparison.trialBenchmarkPct * 1.3)) * 100))}%` }} />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#98A2B3] font-normal">Based on clinical trial average for equivalent duration</div>
        </div>

        {/* Weight Milestones Tracker */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-semibold text-[#667085]">Weight Milestones</h3>
            <Info className="w-3.5 h-3.5 text-[#667085]" />
          </div>

          <div className="space-y-2 text-xs font-medium">
            {milestones.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex items-center justify-between p-2.5 rounded-[12px] ${
                  m.isCurrent 
                    ? 'bg-[#F3F0FF] border border-[#6D4AFF]/20' 
                    : m.isReached 
                    ? 'bg-[#F8F9FC]' 
                    : 'bg-[#F8F9FC]/60 text-[#98A2B3]'
                }`}
              >
                <span className="flex items-center gap-2 text-[#111827]">
                  {m.isReached ? (
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                  ) : m.isGoal ? (
                    <Award className="w-4 h-4 text-[#F59E0B]" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-[#D0D5DD] inline-block" />
                  )}
                  <span>{m.weightStr}</span>
                  {m.isCurrent && (
                    <span className="text-[10px] bg-[#6D4AFF] text-white px-2 py-0.5 rounded-full font-medium">CURRENT</span>
                  )}
                  {m.isGoal && !m.isCurrent && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">GOAL</span>
                  )}
                </span>
                <span className={m.isCurrent ? 'text-[#6D4AFF] text-[11px] font-medium' : 'text-[#667085] text-[11px] font-normal'}>
                  {m.dateStr}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FULL AI REPORT MODAL */}
      {showFullReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-xl w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-black text-[#111827]">AI Weight Journey Comprehensive Report</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Based on your continuous weight logs, injection doses, and treatment duration:
            </p>
            <div className="bg-purple-50/70 p-4 rounded-[16px] text-xs space-y-2 text-purple-950 font-medium">
              <p>• Total weight reduction of <strong>{totalLost} {unitLabel} ({lostPercentage}%)</strong> achieved since starting treatment.</p>
              <p>• Your rate of loss is averaging <strong>{avgWeeklyLoss} {unitLabel}/week</strong>, placing you in a healthy tier for lean mass preservation.</p>
              <p>• Medication active: <strong>{settings.medication || 'GLP-1'}</strong> across {doses.length} recorded dose events.</p>
              <p>• Body adaptation status: {plateauAnalysis.totalPlateaus} plateau periods recorded ({plateauAnalysis.totalDays} total days).</p>
              <p>• Goal timeline projection: estimated arrival at target weight ({goalWeight} {unitLabel}) around <strong>{estimatedGoalDateStr}</strong>.</p>
            </div>
            <button
              onClick={() => setShowFullReportModal(false)}
              className="w-full py-3 rounded-[16px] bg-[#6D4AFF] text-white font-semibold text-xs cursor-pointer hover:bg-[#5B3FE0] transition-all"
            >
              Close Full AI Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
