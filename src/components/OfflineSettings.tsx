import { useEffect, useState } from 'react';
import { offlineEnabled } from '../lib/features';
import { prepareOffline } from '../lib/offline';

export function OfflineSettings() {
  const [state, setState] = useState<'idle' | 'checking' | 'ready' | 'waiting'>('idle');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!offlineEnabled() || !('serviceWorker' in navigator)) return;
    const check = () => { void navigator.serviceWorker.getRegistration('/').then(r => {
      if (r?.waiting) setState('waiting');
      else if (r?.active) setState('ready');
    }).catch(() => {}); };
    check(); window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, []);
  if (!offlineEnabled()) return null;
  return <section aria-labelledby="offline-heading" className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 space-y-3 print:hidden">
    <h2 id="offline-heading" className="text-base font-semibold text-[#111827]">Install and use offline</h2>
    <p className="text-xs text-muted">Save app files for offline use after setting up your vault. This downloads the charts too. Only public app files are cached; your records remain encrypted in browser storage. Clearing site data deletes both.</p>
    <button type="button" disabled={state === 'checking'} className="min-h-11 border rounded-xl px-4 py-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[#6D4AFF] disabled:opacity-50" onClick={async () => {
      setError(''); setState('checking');
      try { setState(await prepareOffline()); }
      catch (e) { setState('idle'); setError(e instanceof Error ? e.message : 'Offline files could not be saved.'); }
    }}>{state === 'checking' ? 'Saving offline app files…' : 'Prepare offline app files'}</button>
    {state === 'ready' && <p role="status" className="text-xs text-muted">Offline app files are saved. After saving a backup and closing all tabs for this app, reopen it and check it without a connection. Install using your browser’s Install app or Add to Home Screen menu; availability varies by browser.</p>}
    {state === 'waiting' && <p role="status" className="text-xs text-muted">An app update is ready. Save an encrypted backup, then close all tabs for this app and reopen it. The app will not force a reload while you are editing.</p>}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    <p className="text-xs text-muted">Reminders are currently in-app only. Closing the app stops local reminder checks; this version does not promise background or exact-time notifications.</p>
  </section>;
}
