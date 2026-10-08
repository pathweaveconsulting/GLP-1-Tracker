import { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatWeight, getWeightUnit } from '../lib/units';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
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
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Calendar Log</h1>
          <p className="text-muted text-sm mt-0.5">View your doses, weight logs, and symptoms on a monthly grid</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-[14px] border border-line shadow-xs">
          <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Previous month" className="rounded-[10px] border-0 h-8 w-8">
            <ChevronLeft className="w-4 h-4 text-muted" />
          </Button>
          <span className="font-semibold text-sm min-w-[110px] text-center text-ink">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Next month" className="rounded-[10px] border-0 h-8 w-8">
            <ChevronRight className="w-4 h-4 text-muted" />
          </Button>
        </div>
      </header>

      <Card className="rounded-[24px] border-line bg-white shadow-xs">
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-px mb-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-muted py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {/* Pad empty days for the start of the month */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[85px] p-2" />
            ))}
            
            {days.map((day) => {
              const dayDose = doses.find(d => isSameDay(new Date(d.date), day));
              const dayWeight = weights.find(w => isSameDay(new Date(w.date), day));
              const dayEffect = effects.find(e => isSameDay(new Date(e.date), day));
              
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={day.toISOString()} 
                  className={`min-h-[85px] p-2.5 border rounded-[16px] flex flex-col gap-1 transition-all hover:bg-canvas cursor-pointer ${isToday ? 'border-brand bg-brand-soft/30' : 'border-line bg-white'}`}
                >
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand text-white' : 'text-muted'}`}>
                    {format(day, dateFormat)}
                  </span>
                  
                  <div className="flex flex-col gap-1 mt-1">
                    {dayDose && (
                      <div className="flex items-center gap-1 text-[10px] bg-brand-soft text-brand px-2 py-0.5 rounded-[6px] font-semibold truncate">
                        <Syringe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{dayDose.amountMg}mg</span>
                      </div>
                    )}
                    {dayWeight && (
                      <div className="flex items-center gap-1 text-[10px] bg-emerald-50 text-positive px-2 py-0.5 rounded-[6px] font-semibold truncate">
                        <Scale className="w-3 h-3 shrink-0" />
                        <span className="truncate">{formatWeight(dayWeight.weightLbs, unit)}</span>
                      </div>
                    )}
                    {dayEffect && dayEffect.nausea !== 'none' && (
                      <div className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-[6px] font-semibold truncate">
                        <Activity className="w-3 h-3 shrink-0" />
                        <span className="truncate">Symptom</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
