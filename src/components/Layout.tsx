import { Suspense, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { SafetyNotice } from './SafetyNotice';
import { MobileMenuDrawer } from './modals/MobileMenuDrawer';
import { BackupReminder } from './BackupReminder';
import { BrandMark } from './BrandMark';
import { MOBILE_TABS, PRIMARY_NAV, isActive, useSecondaryNav, type NavItem } from './navigation';

function SideLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item, pathname);
  return (
    <Link
      to={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors',
        active ? 'bg-brand-soft text-brand-strong font-semibold' : 'text-ink-2 hover:bg-sunken hover:text-ink',
      )}
    >
      <item.icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-brand' : 'text-subtle')} aria-hidden="true" />
      {item.name}
    </Link>
  );
}

export function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const settings = useStore((s) => s.settings);
  const { pathname } = useLocation();
  const groups = useSecondaryNav();

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-[var(--radius-control)] focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:shadow-lg">
        Skip to main content
      </a>
      <div className="flex h-[calc(100dvh-var(--vault-toolbar-height,0px))] bg-canvas text-ink antialiased print:h-auto">
        {/* Desktop sidebar */}
        <aside className="z-20 hidden w-64 shrink-0 flex-col border-r border-line bg-surface md:flex print:hidden">
          <Link to="/" className="flex items-center gap-3 px-5 pb-4 pt-5">
            <BrandMark />
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold text-ink">GLP-1 Companion</span>
              <span className="block text-xs text-muted">Private health record</span>
            </span>
          </Link>
          <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-2">
            <ul className="space-y-0.5">
              {PRIMARY_NAV.map((item) => <li key={item.href}><SideLink item={item} pathname={pathname} /></li>)}
            </ul>
            {groups.map((group) => (
              <div key={group.title}>
                <p className="px-3 pb-1 text-xs font-semibold text-subtle">{group.title}</p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => <li key={item.href}><SideLink item={item} pathname={pathname} /></li>)}
                </ul>
              </div>
            ))}
          </nav>
          <Link to="/settings" aria-label="Profile and settings" className="flex items-center gap-3 border-t border-line px-5 py-4 hover:bg-sunken">
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{settings.medication}</span>
              <span className="block truncate text-xs text-muted">
                {settings.startDate ? `Started ${format(new Date(settings.startDate), 'd MMM yyyy')}` : 'Profile and settings'}
              </span>
            </span>
          </Link>
        </aside>

        {/* Main content */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto pb-28 focus:outline-none md:pb-10 print:overflow-visible">
          <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 lg:px-10 lg:pt-8">
            <BackupReminder />
            <Suspense fallback={<p role="status" className="py-24 text-center text-sm text-muted">Loading…</p>}>
              <Outlet />
            </Suspense>
            <footer className="mt-12 border-t border-line pt-4 print:hidden">
              <SafetyNotice variant="compact" />
            </footer>
          </div>
        </main>

        <MobileMenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} groups={groups} />

        {/* Mobile tab bar: four destinations and More (Pack 4.3) */}
        <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden">
          <ul className="mx-auto flex max-w-lg">
            {MOBILE_TABS.map((item) => {
              const active = isActive(item, pathname);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    to={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn('flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium', active ? 'text-brand-strong font-semibold' : 'text-muted')}
                  >
                    <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', active && 'bg-brand-soft')}>
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                aria-haspopup="dialog"
                className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted"
              >
                <span className="flex h-7 w-12 items-center justify-center"><MoreHorizontal className="h-5 w-5" aria-hidden="true" /></span>
                More
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
