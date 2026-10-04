import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Syringe, Activity, FileText, Settings, Calendar, Scale, Database, Lightbulb, CircleDashed, HeartPulse, MoreHorizontal, Sparkles, Compass, UserRound } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { MobileMenuDrawer } from './modals/MobileMenuDrawer';

const navSections = [
  {
    title: 'Today',
    items: [
      { name: 'Overview', href: '/', icon: Home },
      { name: 'This Week', href: '/this-week', icon: Sparkles, highlight: true },
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
      { name: 'Record Symptoms', href: '/effects', icon: Activity },
      { name: 'Calendar', href: '/calendar', icon: Calendar },
      { name: 'All Logs', href: '/logs', icon: Database },
    ]
  },
  {
    title: 'Reports & Guidance',
    items: [
      { name: 'Weekly & Monthly Reports', href: '/reports', icon: FileText },
      { name: 'Insights & Guidance', href: '/recommendations', icon: Lightbulb },
    ]
  },
  {
    title: 'Preferences',
    items: [
      { name: 'Health Metrics', href: '/health', icon: HeartPulse },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  }
];

export function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const settings = useStore((s) => s.settings);

  return (
    <div className="flex h-screen print:h-auto bg-[#F8F9FC] text-[#111827] font-sans antialiased selection:bg-purple-100 selection:text-purple-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex print:hidden flex-col w-[260px] bg-white border-r border-[#E5E7EB] z-20">
        <div className="p-6 border-b border-[#F1F5F9]">
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#6D4AFF] text-white flex items-center justify-center rounded-[16px] font-semibold text-xs shadow-xs">
              GLP
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-[#111827] leading-tight">GLP-1 Companion</div>
              <p className="text-[11px] font-medium text-[#667085]">Your journey, explained</p>
            </div>
          </NavLink>
        </div>
        <nav className="flex-1 px-4 py-5 space-y-5 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <span className="px-3 text-[11px] font-semibold text-[#98A2B3] tracking-normal block mb-1">
                {section.title}
              </span>
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-[16px] text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-[#F3F0FF] text-[#6D4AFF] border-l-2 border-[#6D4AFF]'
                        : item.highlight
                        ? 'bg-purple-50/60 text-[#6D4AFF] hover:bg-purple-100/60'
                        : 'text-[#667085] hover:bg-[#F8F9FC] hover:text-[#111827]'
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <NavLink to="/settings" className="p-4 border-t border-[#F1F5F9] flex items-center gap-3 hover:bg-[#F8F9FC] transition-colors" aria-label="Profile and settings">
          <div className="w-8 h-8 rounded-full bg-[#F3F0FF] text-[#6D4AFF] flex items-center justify-center" aria-hidden="true">
            <UserRound className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#111827] truncate">{settings.medication}</p>
            <p className="text-[10px] text-[#667085] truncate">
              {settings.startDate ? `Started ${format(new Date(settings.startDate), 'MMM d, yyyy')}` : 'Your journey'}
            </p>
          </div>
        </NavLink>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto print:overflow-visible pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Drawer Menu */}
      <MobileMenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Mobile Persistent Bottom Navigation */}
      <nav className="md:hidden print:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB]/80 px-2 pb-safe pt-2 flex justify-around z-40 shadow-lg">
        <NavLink
          to="/"
          className={({ isActive }) =>
            cn('flex flex-col items-center p-2 rounded-[16px] transition-colors', isActive ? 'text-[#6D4AFF] font-semibold' : 'text-[#98A2B3] hover:text-[#667085]')
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Overview</span>
        </NavLink>

        <NavLink
          to="/logs"
          className={({ isActive }) =>
            cn('flex flex-col items-center p-2 rounded-[16px] transition-colors', isActive ? 'text-[#6D4AFF] font-semibold' : 'text-[#98A2B3] hover:text-[#667085]')
          }
        >
          <Database className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Logs</span>
        </NavLink>

        <NavLink
          to="/results"
          className={({ isActive }) =>
            cn('flex flex-col items-center p-2 rounded-[16px] transition-colors', isActive ? 'text-[#6D4AFF] font-semibold' : 'text-[#98A2B3] hover:text-[#667085]')
          }
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Analytics</span>
        </NavLink>

        <NavLink
          to="/weight"
          className={({ isActive }) =>
            cn('flex flex-col items-center p-2 rounded-[16px] transition-colors', isActive ? 'text-[#6D4AFF] font-semibold' : 'text-[#98A2B3] hover:text-[#667085]')
          }
        >
          <Scale className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Progress</span>
        </NavLink>

        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex flex-col items-center p-2 rounded-[16px] text-[#98A2B3] hover:text-[#667085] transition-colors"
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>
    </div>
  );
}
