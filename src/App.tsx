/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ControlCenter } from './pages/ControlCenter';
import { Doses } from './pages/Doses';
import { Weight } from './pages/Weight';
import { Effects } from './pages/Effects';
import { Results } from './pages/Results';
import { CalendarView } from './pages/CalendarView';
import { AllLogs } from './pages/AllLogs';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Recommendations } from './pages/Recommendations';
import { HealthCenter } from './pages/HealthCenter';
import { ThisWeekPage } from './pages/ThisWeekPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ControlCenter />} />
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
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
