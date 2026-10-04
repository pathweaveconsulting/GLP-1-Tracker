import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Home, Syringe, Scale, ClipboardList, Activity, Lightbulb, CircleDashed, HeartPulse, Database, Calendar, FileText, Settings, Sparkles, Compass } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const navSections = [
  {
    title: 'Today',
    items: [
      { name: 'This Week', href: '/this-week', icon: Sparkles, highlight: true },
      { name: 'Overview', href: '/', icon: Home },
    ]
  },
  {
    title: 'Analytics & Insights',
    items: [
      { name: 'Analytics & Insights', href: '/results', icon: Activity, highlight: true },
    ]
  },
  {
    title: 'Tracking & Logs',
    items: [
      { name: 'Dose History', href: '/doses', icon: Syringe },
      { name: 'Record Weight', href: '/weight', icon: Scale },
      { name: 'Record Symptoms', href: '/effects', icon: ClipboardList },
      { name: 'Calendar View', href: '/calendar', icon: Calendar },
      { name: 'All Logs', href: '/logs', icon: Database },
    ]
  },
  {
    title: 'Reports & Guidance',
    items: [
      { name: 'Weekly & Monthly Reports', href: '/reports', icon: FileText },
      { name: 'Insights & Guidance', href: '/recommendations', icon: Lightbulb },
      { name: 'Health Metrics', href: '/health', icon: HeartPulse },
    ]
  },
  {
    title: 'Preferences',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  }
];

export function MobileMenuDrawer({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Drawer */}
      <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#6D4AFF] text-white flex items-center justify-center rounded-[16px] font-semibold text-sm">
              GLP
            </div>
            <span className="font-semibold text-[#111827] tracking-tight">GLP-1 Companion</span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#667085] hover:bg-[#E5E7EB]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-4">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <span className="px-3.5 text-[10px] font-semibold text-[#98A2B3] tracking-wider block mb-1">
                {section.title}
              </span>
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-[16px] text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#6D4AFF] text-white shadow-md shadow-purple-200'
                        : item.highlight
                        ? 'bg-purple-50 text-[#6D4AFF]'
                        : 'text-[#667085] hover:bg-[#F8F9FC] hover:text-[#111827]'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[#E5E7EB] text-center">
          <p className="text-xs text-[#98A2B3] font-medium">GLP-1 Companion</p>
        </div>
      </div>
    </div>
  );
}
