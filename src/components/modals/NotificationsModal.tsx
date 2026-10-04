import React from 'react';
import { Bell, Syringe, TrendingDown, Trophy, HeartPulse, Scale, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { buildNotifications, NotificationKind } from '../../lib/notifications';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const STYLE: Record<NotificationKind, { icon: typeof Bell; color: string }> = {
  dose: { icon: Syringe, color: 'bg-purple-100 text-[#6D4AFF]' },
  trend: { icon: TrendingDown, color: 'bg-emerald-100 text-[#22C55E]' },
  milestone: { icon: Trophy, color: 'bg-amber-100 text-amber-600' },
  symptom: { icon: HeartPulse, color: 'bg-rose-100 text-rose-600' },
  reminder: { icon: Scale, color: 'bg-blue-100 text-blue-600' },
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
      icon={<div className="w-10 h-10 rounded-[16px] bg-red-50 flex items-center justify-center text-red-500"><Bell className="w-5 h-5" aria-hidden="true" /></div>}
    >
      {items.length === 0 ? (
        <div className="p-4 bg-[#F8F9FC] rounded-[16px] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#667085] leading-relaxed">
          <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" aria-hidden="true" />
          <span>Nothing needs your attention right now. As you log doses, weights and symptoms, helpful updates will appear here.</span>
        </div>
      ) : (
        <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {items.map((n) => {
            const { icon: Icon, color } = STYLE[n.kind];
            return (
              <li key={n.id} className="p-3.5 bg-[#F8F9FC] rounded-[16px] border border-[#E5E7EB] flex items-start gap-3">
                <div className={`w-9 h-9 rounded-[16px] ${color} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[#111827] mb-0.5">{n.title}</h3>
                  <p className="text-xs text-[#667085] font-normal leading-relaxed">{n.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
        <button type="button" onClick={onClose} className="w-full py-2.5 rounded-[16px] bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors">
          Close
        </button>
      </div>
    </Modal>
  );
}
