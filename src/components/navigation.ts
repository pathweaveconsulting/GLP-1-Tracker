import { useDailyLogs } from '../store/dailyLogs';
import { dailyLogsEnabled } from '../lib/features';
import { CalendarDays, ClipboardList, Droplets, FileText, HeartPulse, Home, LineChart, ListChecks, Pill, Scale, Settings, Sparkles, Lightbulb, type LucideIcon } from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Other routes that belong to this destination, so it stays highlighted there. */
  also?: string[];
}

/**
 * Information architecture (master backlog Pack 4): five primary destinations, everything else under "More".
 * Desktop shows all five plus the secondary groups; mobile shows four destinations and a More menu.
 */
export const PRIMARY_NAV: NavItem[] = [
  { name: 'Today', href: '/', icon: Home },
  { name: 'Progress', href: '/weight', icon: Scale },
  { name: 'Health', href: '/effects', icon: HeartPulse, also: ['/health', '/daily'] },
  { name: 'Medication', href: '/doses', icon: Pill, also: ['/this-week'] },
  { name: 'Insights', href: '/results', icon: LineChart, also: ['/reports', '/recommendations'] },
];

/** Primary destinations shown in the mobile tab bar (Insights moves into More there, keeping five tabs). */
export const MOBILE_TABS = PRIMARY_NAV.filter((i) => i.name !== 'Insights');

export interface NavGroup { title: string; items: NavItem[] }

export function secondaryNav({ showDaily }: { showDaily: boolean }): NavGroup[] {
  return [
    {
      title: 'Records',
      items: [
        { name: 'All history', href: '/logs', icon: ListChecks },
        { name: 'Calendar', href: '/calendar', icon: CalendarDays },
        ...(showDaily ? [{ name: 'Protein & water', href: '/daily', icon: Droplets }] : []),
        { name: 'Health summary', href: '/health', icon: ClipboardList },
      ],
    },
    {
      title: 'Understand',
      items: [
        { name: 'This week', href: '/this-week', icon: Sparkles },
        { name: 'Reports', href: '/reports', icon: FileText },
        { name: 'Guidance', href: '/recommendations', icon: Lightbulb },
      ],
    },
    { title: 'Account', items: [{ name: 'Settings & data', href: '/settings', icon: Settings }] },
  ];
}

/** Is `item` the current destination? Exact match for Today; prefix match for its own and related routes. */
export function isActive(item: NavItem, pathname: string): boolean {
  const routes = [item.href, ...(item.also ?? [])];
  return routes.some((r) => (r === '/' ? pathname === '/' : pathname === r || pathname.startsWith(`${r}/`)));
}

/** Secondary destinations for the current data: the protein & water page appears once enabled or used. */
export function useSecondaryNav(): NavGroup[] {
  const daily = useDailyLogs();
  return secondaryNav({ showDaily: dailyLogsEnabled() || daily.rows.length > 0 || !!daily.error });
}
