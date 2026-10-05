import { AlertTriangle, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CORRUPT_KEY, STORAGE_KEY } from '../store/keys';
import { downloadTextFile } from '../lib/csv';
import { exportBackupJson } from '../lib/dataTransfer';

/** Banners about problems loading stored data. Rendered above both the app and onboarding. */
export function StorageNotices() {
  const skipped = useStore((s) => s.skippedEntries);
  const rescueKept = useStore((s) => s.rescueKept);
  const unreadable = useStore((s) => s.unreadable);
  const dismiss = useStore((s) => s.dismissSkippedNotice);
  const storageError = useStore((s) => s.storageError);
  const dismissStorageError = useStore((s) => s.dismissStorageError);
  if (skipped <= 0 && !unreadable && !storageError) return null;

  const downloadBackup = () => {
    const { settings, doses, weights, effects } = useStore.getState();
    exportBackupJson({ settings, doses, weights, effects });
  };

  const downloadOriginal = () => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(CORRUPT_KEY);
    } catch {
      // ignore
    }
    // If the copy could not be stored, the unreadable bytes are still in the main key until the app next saves.
    if (!raw) {
      try {
        raw = localStorage.getItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    if (raw) downloadTextFile('glp1-tracker-original-data.json', raw, 'application/json');
  };

  const storageBanner = storageError && (
    <div role="alert" className="bg-rose-50 border-b border-rose-200 text-rose-950 text-xs px-4 py-2.5 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1">
        Your changes can’t be saved on this device (the browser’s storage is full or blocked). They will be lost if you close this page. Download a backup now.{' '}
        <button type="button" onClick={downloadBackup} className="font-semibold underline">Download a backup</button>
      </p>
      <button type="button" onClick={dismissStorageError} aria-label="Dismiss storage warning" className="shrink-0"><X className="w-4 h-4" aria-hidden="true" /></button>
    </div>
  );

  if (skipped <= 0 && unreadable) {
    return (
      <>
      {storageBanner}
      <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-950 text-xs px-4 py-2.5 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="flex-1">
          Your saved data couldn’t be read, so the app started empty.{' '}
          {rescueKept ? (
            <>A copy of the original data was kept on this device.{' '}</>
          ) : (
            <>We couldn’t keep a copy of your data. Download it now.{' '}</>
          )}
          <button type="button" onClick={downloadOriginal} className="font-semibold underline">{rescueKept ? 'Download original data' : 'Download it now'}</button>
        </p>
        <button type="button" onClick={dismiss} aria-label="Dismiss notice" className="shrink-0"><X className="w-4 h-4" aria-hidden="true" /></button>
      </div>
      </>
    );
  }

  if (skipped <= 0) return <>{storageBanner}</>;

  return (
    <>
    {storageBanner}
    <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-950 text-xs px-4 py-2.5 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1">
        {skipped} {skipped === 1 ? 'entry' : 'entries'} couldn’t be read and {skipped === 1 ? 'was' : 'were'} skipped.{' '}
        {rescueKept ? (
          <>
            A copy of the original data was kept on this device.{' '}
            <button type="button" onClick={downloadOriginal} className="font-semibold underline">Download original data</button>
          </>
        ) : (
          <>
            We couldn’t keep a copy of your data. Download it now.{' '}
            <button type="button" onClick={downloadBackup} className="font-semibold underline">Download a backup</button>
          </>
        )}
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss notice" className="shrink-0"><X className="w-4 h-4" aria-hidden="true" /></button>
    </div>
    </>
  );
}