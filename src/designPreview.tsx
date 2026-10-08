/**
 * DEVELOPMENT-ONLY design preview (served by `npm run dev` at /design-preview/; not part of `npm run build`).
 * Renders the real layout and pages with SYNTHETIC records so the design can be reviewed and screenshotted.
 * It never touches real browser storage: localStorage is replaced by an in-memory stand-in before any app code
 * loads, and the vault gate is not rendered because no stored records exist here to protect or unlock.
 * Query: ?route=/weight&data=populated|empty&unit=kg|lbs
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
}
Object.defineProperty(window, 'localStorage', { configurable: true, value: new MemoryStorage() });
Object.defineProperty(window, 'sessionStorage', { configurable: true, value: new MemoryStorage() });

async function start() {
  const params = new URLSearchParams(location.search);
  const route = params.get('route') ?? '/';
  const data = params.get('data') === 'empty' ? 'empty' : 'populated';
  const unit = params.get('unit') === 'lbs' ? 'lbs' : 'kg';
  const [{ createRoot }, React, router, { seedStore }, { Layout }, { ToastProvider }] = await Promise.all([
    import('react-dom/client'), import('react'), import('react-router-dom'), import('./test/fixtures'),
    import('./components/Layout'), import('./components/ui/Toast'),
  ]);
  await import('./index.css');
  seedStore(data, unit);
  const { MemoryRouter, Routes, Route } = router;
  const page = (load: () => Promise<Record<string, React.ComponentType>>, name: string) =>
    React.createElement(React.lazy(() => load().then((m) => ({ default: m[name] }))));
  createRoot(document.getElementById('root')!).render(
    React.createElement(ToastProvider, null,
      React.createElement(MemoryRouter, { initialEntries: [route] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/', element: React.createElement(Layout) },
            React.createElement(Route, { index: true, element: page(() => import('./pages/Today'), 'Today') }),
            React.createElement(Route, { path: 'weight', element: page(() => import('./pages/Weight'), 'Weight') }),
            React.createElement(Route, { path: 'doses', element: page(() => import('./pages/Doses'), 'Doses') }),
            React.createElement(Route, { path: 'effects', element: page(() => import('./pages/Effects'), 'Effects') }),
            React.createElement(Route, { path: 'results', element: page(() => import('./pages/Results'), 'Results') }),
            React.createElement(Route, { path: 'settings', element: page(() => import('./pages/Settings'), 'Settings') }),
            React.createElement(Route, { path: 'this-week', element: page(() => import('./pages/ThisWeekPage'), 'ThisWeekPage') }),
            React.createElement(Route, { path: 'health', element: page(() => import('./pages/HealthCenter'), 'HealthCenter') }),
            React.createElement(Route, { path: 'reports', element: page(() => import('./pages/Reports'), 'Reports') }),
            React.createElement(Route, { path: 'recommendations', element: page(() => import('./pages/Recommendations'), 'Recommendations') }),
            React.createElement(Route, { path: 'calendar', element: page(() => import('./pages/CalendarView'), 'CalendarView') }),
            React.createElement(Route, { path: 'logs', element: page(() => import('./pages/AllLogs'), 'AllLogs') }),
            React.createElement(Route, { path: 'daily', element: page(() => import('./pages/DailyLogs'), 'DailyLogs') }),
          ))))
  );
}
void start();
