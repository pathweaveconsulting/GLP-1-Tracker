/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Onboarding } from './pages/Onboarding';
import { useStore } from './store/useStore';
import { ToastProvider } from './components/ui/Toast';
import { StorageNotices } from './components/StorageNotices';

// Route-level code splitting: each page (and the charting library it pulls in) loads on demand.
const Today = lazy(() => import('./pages/Today').then((m) => ({ default: m.Today })));
const Doses = lazy(() => import('./pages/Doses').then((m) => ({ default: m.Doses })));
const Weight = lazy(() => import('./pages/Weight').then((m) => ({ default: m.Weight })));
const Effects = lazy(() => import('./pages/Effects').then((m) => ({ default: m.Effects })));
const Results = lazy(() => import('./pages/Results').then((m) => ({ default: m.Results })));
const CalendarView = lazy(() => import('./pages/CalendarView').then((m) => ({ default: m.CalendarView })));
const AllLogs = lazy(() => import('./pages/AllLogs').then((m) => ({ default: m.AllLogs })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const DailyLogs = lazy(() => import('./pages/DailyLogs').then(m => ({default:m.DailyLogs})));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const Recommendations = lazy(() => import('./pages/Recommendations').then((m) => ({ default: m.Recommendations })));
const HealthCenter = lazy(() => import('./pages/HealthCenter').then((m) => ({ default: m.HealthCenter })));
const ThisWeekPage = lazy(() => import('./pages/ThisWeekPage').then((m) => ({ default: m.ThisWeekPage })));

export default function App() {
  const hasOnboarded = useStore((s) => s.hasOnboarded);
  if (!hasOnboarded) return (<><StorageNotices /><Onboarding /></>);
  return (
    <ToastProvider>
      <StorageNotices />
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="this-week" element={<ThisWeekPage />} />
            <Route path="journey" element={<Navigate to="/results?tab=journey" replace />} />
            <Route path="doses" element={<Doses />} />
            <Route path="weight" element={<Weight />} />
            <Route path="effects" element={<Effects />} />
            <Route path="results" element={<Results />} />
            <Route path="recommendations" element={<Recommendations />} />
            <Route path="phase" element={<Navigate to="/results?tab=progress" replace />} />
            <Route path="health" element={<HealthCenter />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="logs" element={<AllLogs />} />
            <Route path="reports" element={<Reports />} />
            <Route path="daily" element={<DailyLogs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}
