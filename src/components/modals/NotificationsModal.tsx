import React from 'react';
import { X, Bell, Syringe, TrendingDown, Trophy, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const notifications = [
    {
      id: '1',
      title: 'Next Injection Due',
      description: 'Your next dose of Mounjaro 7.5 mg is scheduled for May 20 (in 2 days).',
      time: '2 hours ago',
      icon: Syringe,
      color: 'bg-purple-100 text-[#6D4AFF]',
    },
    {
      id: '2',
      title: 'Weekly Progress Update',
      description: 'You lost -1.2 lbs this week! Keep up the great consistency.',
      time: 'Yesterday',
      icon: TrendingDown,
      color: 'bg-emerald-100 text-[#22C55E]',
    },
    {
      id: '3',
      title: 'Milestone Almost Unlocked',
      description: 'You are at 82% towards your 10% weight loss goal.',
      time: '2 days ago',
      icon: Trophy,
      color: 'bg-amber-100 text-amber-600',
    },
    {
      id: '4',
      title: 'Peak Phase Active',
      description: 'Medication level is at peak concentration. Remember to hydrate and reach your protein goal!',
      time: '3 days ago',
      icon: Sparkles,
      color: 'bg-blue-100 text-blue-600',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[24px] p-6 shadow-2xl border border-[#E5E7EB] relative">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E5E7EB] flex items-center justify-center text-[#667085] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[16px] bg-red-50 flex items-center justify-center text-red-500 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#111827]">Notifications</h2>
            <p className="text-xs text-[#667085]">GLP-1 intelligence updates</p>
          </div>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {notifications.map((n) => (
            <div key={n.id} className="p-3.5 bg-[#F8F9FC] rounded-[16px] border border-[#E5E7EB] flex items-start gap-3 hover:bg-[#F1F5F9]/80 transition-colors">
              <div className={`w-9 h-9 rounded-[16px] ${n.color} flex items-center justify-center shrink-0 mt-0.5`}>
                <n.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-0.5">
                  <h4 className="text-sm font-semibold text-[#111827]">{n.title}</h4>
                  <span className="text-[10px] text-[#98A2B3] font-medium">{n.time}</span>
                </div>
                <p className="text-xs text-[#667085] font-normal leading-relaxed">{n.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-[16px] bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
          >
            Mark All as Read
          </button>
        </div>
      </div>
    </div>
  );
}
