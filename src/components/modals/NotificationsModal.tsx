import { Bell, Syringe, TrendingDown, Trophy, HeartPulse, Scale, CheckCircle2 } from 'lucide-react';
import { buttonClass } from '../ds';
import { useStore } from '../../store/useStore';
import { buildNotifications, NotificationKind } from '../../lib/notifications';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Each kind has its own icon shape; colour is a quiet secondary cue only.
const STYLE: Record<NotificationKind, { icon: typeof Bell; color: string }> = {
  dose: { icon: Syringe, color: 'text-brand' },
  trend: { icon: TrendingDown, color: 'text-positive' },
  milestone: { icon: Trophy, color: 'text-caution' },
  symptom: { icon: HeartPulse, color: 'text-danger' },
  reminder: { icon: Scale, color: 'text-brand' },
};

export function NotificationsModal({ isOpen, onClose }: Props) {
  const doses = useStore((s) => s.doses);
  const weights = useStore((s) => s.weights);
  const effects = useStore((s) => s.effects);
  const settings = useStore((s) => s.settings);
  const items = isOpen ? buildNotifications({ doses, weights, effects, settings }) : [];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Notifications"
      subtitle="Based on what you've logged"
    >
      {items.length === 0 ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-control)] border border-dashed border-line-strong p-4 text-sm leading-6 text-muted">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span>Nothing needs your attention right now. As you log doses, weights and symptoms, helpful updates will appear here.</span>
        </div>
      ) : (
        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
          {items.map((n) => {
            const { icon: Icon, color } = STYLE[n.kind];
            return (
              <li key={n.id} className="flex items-start gap-3 py-3 first:pt-0">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} aria-hidden="true" />
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-ink">{n.title}</h3>
                  <p className="mt-0.5 text-sm leading-6 text-muted">{n.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-5 flex justify-end border-t border-line pt-4">
        <button type="button" onClick={onClose} className={buttonClass('secondary', 'md', 'w-full sm:w-auto')}>
          Close
        </button>
      </div>
    </Modal>
  );
}
