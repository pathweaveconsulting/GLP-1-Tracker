import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { reminderDue, snoozeBackupReminder, useBackupReminder } from '../lib/backupReminder';
import { hasVault } from '../lib/vault';
import { buttonClass } from './ds/Button';

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
    <section aria-label="Backup reminder" className="mb-5 flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line border-l-4 border-l-caution bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div className="min-w-0">
      <h2 className="text-sm font-semibold text-ink">Keep a backup of your records</h2>
      <p className="mt-1 text-[13px] leading-5 text-muted">Clearing browser data or changing devices can lose your history. {hasVault() ? 'Save an encrypted JSON backup somewhere private and keep your recovery key separately.' : 'Save a JSON backup somewhere private; exports are currently unencrypted.'}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link to="/settings#backup" className={buttonClass('secondary', 'sm')}>Open backup settings</Link>
        <button type="button" onClick={async () => setError(!(await snoozeBackupReminder()))} className={buttonClass('quiet', 'sm')}>Remind me tomorrow</button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-danger">This browser could not save the reminder preference.</p>}
    </section>
  );
}
