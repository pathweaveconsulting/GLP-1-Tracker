import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { reminderDue, snoozeBackupReminder, useBackupReminder } from '../lib/backupReminder';

export function BackupReminder() {
  const hasRecords = useStore(s => s.weights.length + s.doses.length + s.effects.length > 0);
  const reminder = useBackupReminder();
  const [, setNow] = useState(Date.now);
  const [error, setError] = useState(false);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  if (!hasRecords || !reminderDue(reminder, Date.now())) return null;
  return (
    <section aria-label="Backup reminder" className="mb-6 p-4 rounded-[16px] border border-[#E5E7EB] bg-white print:hidden">
      <h2 className="text-sm font-semibold text-[#111827]">Keep a backup of your records</h2>
      <p className="mt-1 text-xs text-muted">Clearing browser data or changing devices can lose your history. Save a JSON backup somewhere private; exports are currently unencrypted.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link to="/settings#backup" className="px-3 py-2 text-sm font-semibold underline rounded-lg focus-visible:ring-2 focus-visible:ring-[#6D4AFF]">Open backup settings</Link>
        <button type="button" onClick={() => setError(!snoozeBackupReminder())} className="px-3 py-2 text-sm underline rounded-lg focus-visible:ring-2 focus-visible:ring-[#6D4AFF]">Remind me tomorrow</button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-danger">This browser could not save the reminder preference.</p>}
    </section>
  );
}
