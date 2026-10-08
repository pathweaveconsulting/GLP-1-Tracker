import { useId, useState } from 'react';
import { EmptyState, PageHeader, Panel } from '../components/ds';
import { Lightbulb, Syringe, Scale, PauseCircle, Activity, Droplets, HeartPulse, Smile, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SafetyNotice } from '../components/SafetyNotice';
import { buildRecommendations, Tip, TipIcon } from '../lib/recommendations';

const ICONS: Record<TipIcon, typeof Lightbulb> = {
  syringe: Syringe, scale: Scale, pause: PauseCircle, activity: Activity, droplet: Droplets, heart: HeartPulse, lightbulb: Lightbulb, smile: Smile,
};

function TipRow({ tip }: { tip: Tip }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const Icon = ICONS[tip.icon];
  return (
    <li className="flex items-start gap-3 py-4 first:pt-1 last:pb-1">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
          <span>{tip.category}</span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-ink-2">{tip.source === 'logs' ? 'From your logs' : 'General'}</span>
        </div>
        <h3 className="mt-0.5 text-[15px] font-semibold text-ink">{tip.title}</h3>
        <p className="mt-1 text-sm leading-6 text-ink-2">{tip.desc}</p>
        {open && <p id={panelId} className="mt-2 border-l-2 border-line pl-3 text-sm leading-6 text-ink-2">{tip.details}</p>}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((o) => !o)}
          className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:underline"
        >
          {open ? 'Show less' : 'Read more'}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>
    </li>
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
    <div className="space-y-5">
      <PageHeader title="Guidance" description="What your own logs suggest, plus a few general ideas that are labelled as such." />

      <Panel title="From your logs" description="Based only on what you have recorded.">
        {fromLogs.length === 0 ? <EmptyState title="Nothing specific yet">As you log doses, weights and symptoms, notes based on your records will appear here.</EmptyState> : (
          <ul className="divide-y divide-line">{fromLogs.map((t) => <TipRow key={t.id} tip={t} />)}</ul>
        )}
      </Panel>

      <Panel title="General ideas" description="Not personalised. Follow your care team's guidance.">
        <ul className="divide-y divide-line">{general.map((t) => <TipRow key={t.id} tip={t} />)}</ul>
      </Panel>

      <SafetyNotice variant="full" />
    </div>
  );
}
