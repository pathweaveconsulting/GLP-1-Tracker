import { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatWeight, getWeightUnit } from '../lib/units';
import { PageHeader, Panel } from '../components/ds';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Syringe, Scale, Activity } from 'lucide-react';

export function CalendarView() {
  const { doses, weights, effects, settings } = useStore();
  const unit = getWeightUnit(settings);
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = monthStart;
  const endDate = monthEnd;

  const dateFormat = "d";
  const days = eachDayOfInterval({
      start: startDate,
      end: endDate
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        description="Your injections, weigh-ins and check-ins on a monthly grid."
        actions={
          <div className="flex items-center gap-1 rounded-[var(--radius-control)] border border-line bg-surface p-1">
            <button type="button" onClick={prevMonth} aria-label="Previous month" className="flex h-11 w-11 items-center justify-center rounded-[8px] text-ink hover:bg-sunken sm:h-9 sm:w-9">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="min-w-[120px] text-center text-sm font-semibold text-ink" aria-live="polite">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <button type="button" onClick={nextMonth} aria-label="Next month" className="flex h-11 w-11 items-center justify-center rounded-[8px] text-ink hover:bg-sunken sm:h-9 sm:w-9">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        }
      />

      <Panel>
        <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2" aria-label="Key">
          <li className="flex items-center gap-1.5"><Syringe className="h-4 w-4 text-brand" aria-hidden="true" />Injection (amount)</li>
          <li className="flex items-center gap-1.5"><Scale className="h-4 w-4 text-positive" aria-hidden="true" />Weigh-in</li>
          <li className="flex items-center gap-1.5"><Activity className="h-4 w-4 text-caution" aria-hidden="true" />Check-in recorded</li>
        </ul>
        <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="mb-1 grid grid-cols-7 gap-1.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-1.5 text-center text-[13px] font-semibold text-muted">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {/* Pad empty days for the start of the month */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[88px]" />
            ))}

            {days.map((day) => {
              const dayDose = doses.find(d => isSameDay(new Date(d.date), day));
              const dayWeight = weights.find(w => isSameDay(new Date(w.date), day));
              const dayEffect = effects.find(e => isSameDay(new Date(e.date), day));

              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`flex min-h-[88px] flex-col gap-1 rounded-[var(--radius-control)] border p-2 ${isToday ? 'border-brand ring-1 ring-brand' : 'border-line'}`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold ${isToday ? 'bg-brand text-white' : 'text-ink-2'}`}>
                    {format(day, dateFormat)}
                    {isToday && <span className="sr-only"> (today)</span>}
                  </span>

                  <div className="flex flex-col gap-0.5 text-xs text-ink">
                    {dayDose && (
                      <div className="flex items-center gap-1 truncate">
                        <Syringe className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                        <span className="truncate">{dayDose.amountMg}mg</span>
                      </div>
                    )}
                    {dayWeight && (
                      <div className="flex items-center gap-1 truncate">
                        <Scale className="h-3.5 w-3.5 shrink-0 text-positive" aria-hidden="true" />
                        <span className="truncate tabular-nums">{formatWeight(dayWeight.weightLbs, unit)}</span>
                      </div>
                    )}
                    {dayEffect && (
                      <div className="flex items-center gap-1 truncate">
                        <Activity className="h-3.5 w-3.5 shrink-0 text-caution" aria-hidden="true" />
                        <span className="truncate">Check-in</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </Panel>
    </div>
  );
}
