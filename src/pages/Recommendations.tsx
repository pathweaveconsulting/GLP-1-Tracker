import { useId, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Lightbulb, Syringe, Scale, PauseCircle, Activity, Droplets, HeartPulse, Smile, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SafetyNotice } from '../components/SafetyNotice';
import { buildRecommendations, Tip, TipIcon } from '../lib/recommendations';

const ICONS: Record<TipIcon, typeof Lightbulb> = {
  syringe: Syringe, scale: Scale, pause: PauseCircle, activity: Activity, droplet: Droplets, heart: HeartPulse, lightbulb: Lightbulb, smile: Smile,
};

function TipCard({ tip }: { tip: Tip }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const Icon = ICONS[tip.icon];
  return (
    <Card className="flex flex-col h-full rounded-[24px] border-line bg-white shadow-xs hover:border-[#bcd1ec] transition-all">
      <CardContent className="p-5 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-brand-soft rounded-[10px]"><Icon className="w-4 h-4 text-brand" aria-hidden="true" /></div>
              <span className="text-xs font-medium text-muted">{tip.category}</span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tip.source === 'logs' ? 'bg-brand-soft text-brand-strong' : 'bg-slate-100 text-slate-600'}`}>
              {tip.source === 'logs' ? 'From your logs' : 'General'}
            </span>
          </div>
          <h2 className="font-semibold text-base text-ink mb-2">{tip.title}</h2>
          <p className="text-xs text-muted leading-relaxed font-normal">{tip.desc}</p>
          {open && <p id={panelId} className="text-xs text-ink-2 leading-relaxed mt-3 pt-3 border-t border-sunken">{tip.details}</p>}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((o) => !o)}
          className="text-xs font-semibold text-brand mt-4 text-left hover:underline cursor-pointer inline-flex items-center gap-1"
        >
          {open ? 'Show less' : 'Read more'}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </CardContent>
    </Card>
  );
}

export function Recommendations() {
  const doses = useStore((s) => s.doses);
  const weights = useStore((s) => s.weights);
  const effects = useStore((s) => s.effects);
  const settings = useStore((s) => s.settings);
  const tips = buildRecommendations({ doses, weights, effects, settings });
  const fromLogs = tips.filter((t) => t.source === 'logs');
  const general = tips.filter((t) => t.source === 'general');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Insights & Guidance</h1>
        <p className="text-sm text-muted mt-0.5">What your own logs suggest, plus a few general ideas that are labelled as such.</p>
      </header>

      <section aria-labelledby="from-logs" className="space-y-3">
        <h2 id="from-logs" className="text-sm font-semibold text-ink-2">From your logs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fromLogs.map((t) => <TipCard key={t.id} tip={t} />)}
        </div>
      </section>

      <section aria-labelledby="general" className="space-y-3">
        <h2 id="general" className="text-sm font-semibold text-ink-2">General ideas <span className="font-normal text-subtle">(not personalised)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {general.map((t) => <TipCard key={t.id} tip={t} />)}
        </div>
      </section>

      <SafetyNotice variant="full" />
    </div>
  );
}
