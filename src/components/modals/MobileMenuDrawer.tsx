import { useId, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, LineChart } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';
import { cn } from '../../lib/utils';
import { BrandMark } from '../BrandMark';
import { isActive, secondaryNav, type NavGroup, type NavItem } from '../navigation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Secondary destinations; defaults to the standard list when a page opens the menu itself. */
  groups?: NavGroup[];
}

const INSIGHTS: NavItem = { name: 'Insights', href: '/results', icon: LineChart, also: ['/reports', '/recommendations'] };

/** The "More" menu on small screens: Insights plus every secondary destination. */
export function MobileMenuDrawer({ isOpen, onClose, groups }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useDialog(isOpen, onClose, panelRef);
  if (!isOpen) return null;
  const list: NavGroup[] = [{ title: 'Analyse', items: [INSIGHTS] }, ...(groups ?? secondaryNav({ showDaily: false }))];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative z-10 flex h-full w-[86%] max-w-sm flex-col bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <BrandMark className="h-7 w-7" />
            <h2 id={titleId} className="text-[15px] font-semibold text-ink">Menu</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close menu" className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-sunken">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="More destinations" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {list.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1 text-xs font-semibold text-subtle">{group.title}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={cn('flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[15px] font-medium',
                          active ? 'bg-brand-soft text-brand-strong font-semibold' : 'text-ink-2 hover:bg-sunken')}
                      >
                        <item.icon className={cn('h-5 w-5', active ? 'text-brand' : 'text-subtle')} aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
