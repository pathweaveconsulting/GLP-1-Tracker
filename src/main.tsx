import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import { VaultGate } from './components/VaultGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
const App = lazy(() => import('./App.tsx'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <VaultGate><Suspense fallback={<p role="status">Loading your records…</p>}><App /></Suspense></VaultGate>
    </ErrorBoundary>
  </StrictMode>,
);
