import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CORRUPT_KEY } from '../store/keys';
import { downloadTextFile } from '../lib/csv';

/** Banners about problems loading stored data. Rendered above both the app and onboarding. */
export function StorageNotices() {
  const skipped = useStore((s) => s.skippedEntries);
  const dismiss = useStore((s) => s.dismissSkippedNotice);
  if (skipped <= 0) return null;

  const downloadOriginal = () => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(CORRUPT_KEY);
    } catch {
      // ignore
    }
    if (raw) downloadTextFile('glp1-tracker-original-data.json', raw, 'application/json');
  };

  return (
    <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-950 text-xs px-4 py-2.5 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1">
        {skipped} {skipped === 1 ? 'entry' : 'entries'} couldn’t be read and {skipped === 1 ? 'was' : 'were'} skipped. A copy of the original data was kept on this device.{' '}
        <button type="button" onClick={downloadOriginal} className="font-semibold underline">Download original data</button>
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss notice" className="shrink-0"><X className="w-4 h-4" aria-hidden="true" /></button>
    </div>
  );
}
