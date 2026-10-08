import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/button';
import { Download, Trash2, FileJson, Upload } from 'lucide-react';
import { buttonClass, errorClass, inputClass, labelClass, noteClass, PageHeader, Panel, Stat } from '../components/ds';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SafetyNotice } from '../components/SafetyNotice';
import { EditProfileModal } from '../components/modals/EditProfileModal';
import { formatHeight, formatWeight, getWeightUnit } from '../lib/units';
import { exportBackupJson, exportTidyCsv, readFileAsText } from '../lib/dataTransfer';
import { BackupData, parseBackup } from '../lib/backup';
import { OfflineSettings } from '../components/OfflineSettings';
import { confirmBackupSaved } from '../lib/backupReminder';
import { hasVault } from '../lib/vault';
import { backupRestoreBaseline, restoreBackupWithRecovery } from '../lib/vaultRecovery';
import { decryptBackup, isEncryptedBackup } from '../lib/encryptedRestore';
import { MAX_VAULT_BYTES } from '../lib/vaultCrypto';
import { MigrationRecovery } from '../components/MigrationRecovery';

type PendingRestore = { data: BackupData; counts: { doses: number; weights: number; effects: number }; baseline: string | null };

export function Settings() {
  const { settings, doses, weights, effects, resetAllData, replaceAllData } = useStore();
  const unit = getWeightUnit(settings);
  const { show: showToast } = useToast();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [restoring, setRestoring] = useState(false);
  const restoreInProgress = useRef(false);
  const [restoreErrors, setRestoreErrors] = useState<string[] | null>(null);
  const [backupStarted, setBackupStarted] = useState(false);
  const [encryptedFile, setEncryptedFile] = useState<string | null>(null);
  const [backupSecret, setBackupSecret] = useState('');
  const [backupRecovery, setBackupRecovery] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [backupUnlockError, setBackupUnlockError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const snapshot = (): BackupData => ({ settings, doses, weights, effects });

  const handleExportCSV = () => {
    try {
      exportTidyCsv(snapshot(), unit);
      showToast('CSV export started. Check your downloads.');
    } catch {
      showToast('CSV export could not start. Your records are unchanged. Please try again.');
    }
  };

  const handleExportJSON = async () => {
    try {
      await exportBackupJson(snapshot());
      setBackupStarted(true);
      showToast('Backup download started. Check your downloads and keep the file safe.');
    } catch {
      showToast('Backup download could not start. Your records are unchanged. Please try again.');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_VAULT_BYTES) { setRestoreErrors(['This file is too large to safely restore in this browser (maximum 12 MiB).']); return; }
    try {
      const text = await readFileAsText(file);
      if (isEncryptedBackup(text)) { setBackupUnlockError(''); setBackupSecret(''); setBackupRecovery(false); setEncryptedFile(text); return; }
      const result = parseBackup(text);
      if (result.ok) setPendingRestore({ data: result.data, counts: result.counts, baseline: hasVault() ? backupRestoreBaseline() : null });
      else setRestoreErrors(result.errors);
    } catch {
      setRestoreErrors(['This file could not be read. Please check that it is available on your device and try again.']);
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore || restoreInProgress.current) return;
    restoreInProgress.current = true;
    setRestoring(true);
    const approved = pendingRestore;
    let encryptedCommit = false;
    setPendingRestore(null);
    try {
      if (hasVault()) {
        if (approved.baseline === null) throw Error('Storage changed after preview. Select the backup again.');
        await restoreBackupWithRecovery(approved.data, approved.baseline);
        encryptedCommit = true;
        await useStore.persist.rehydrate();
        if (useStore.getState().readFailed) throw Error('Backup saved, but the view could not be refreshed. Keep your backup and reload to unlock the vault again.');
        showToast('Backup restored. Your previous saved records are available under encrypted recovery.');
      } else {
        if (approved.baseline !== null) throw Error('Vault changed after preview. Reload and unlock it before restoring.');
        replaceAllData(approved.data);
        showToast('Backup restored.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Encrypted restoration failed.';
      if (encryptedCommit) showToast(message);
      else setRestoreErrors([message]);
    }
    finally { restoreInProgress.current = false; setRestoring(false); }
  };

  const handleEraseData = () => {
    setConfirmErase(false);
    resetAllData();
  };

  const action = (variant: 'secondary' | 'danger' = 'secondary') =>
    variant === 'danger'
      ? 'flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-control)] border border-danger/50 bg-surface px-4 text-left text-sm font-semibold text-danger hover:bg-danger-soft'
      : 'flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-control)] border border-line-strong bg-surface px-4 text-left text-sm font-semibold text-ink hover:bg-sunken';

  return (
    <div className="space-y-5">
      <PageHeader title="Settings & data" description="Your profile, goals, backups and the health records stored on this device." />

      <Panel
        title="Profile and medication"
        action={<button type="button" onClick={() => setIsEditProfileOpen(true)} className={buttonClass('secondary', 'sm')}>Edit Profile</button>}
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          <Stat label="Medication" value={<span className="text-base">{settings.medication}</span>} />
          <Stat label="Starting weight" value={<span className="text-base">{settings.startingWeight > 0 ? formatWeight(settings.startingWeight, unit) : '–'}</span>} />
          <Stat label="Goal weight" value={<span className="text-base">{settings.targetWeight > 0 ? formatWeight(settings.targetWeight, unit) : '–'}</span>} />
          <Stat label="Height" value={<span className="text-base">{formatHeight(settings.heightInches)}</span>} />
        </dl>
      </Panel>

      <Panel title="Privacy and your data">
        <div className="max-w-3xl space-y-2 text-sm leading-6 text-ink-2">
          <p>
            Your data lives only in this browser on this device. This app has no account and no server, and it doesn’t send your logs anywhere.
          </p>
          <p>
            {hasVault() ? <>Your records and rescue copies are stored encrypted. Unlocking uses your passphrase or recovery key; neither is stored here. JSON backups are encrypted too. An unlocked browser can still display and export your records.</> : <>It is stored <strong>unencrypted</strong> in the browser’s local storage, so anyone who can open this browser profile can read it.</>}
            {' '}If you clear your browser data (or use a private window), it is deleted for good. Download a backup now and then.
          </p>
        </div>
        {effects.length > 0 && <p className={noteClass('neutral', 'mt-3 max-w-3xl')}>Earlier versions filled unanswered symptom ratings with None. Older ratings are preserved because we cannot tell which ones you chose. New logs save only your selections.</p>}

        <div id="backup" className="mt-5 grid gap-5 border-t border-line pt-5 md:grid-cols-2">
          <section aria-labelledby="backup-heading" className="space-y-2">
            <h3 id="backup-heading" className="text-sm font-semibold text-ink">Back up and restore</h3>
            <button type="button" onClick={handleExportJSON} className={action()}>
              <FileJson className="h-4 w-4 text-muted" aria-hidden="true" /> Download a backup (JSON)
            </button>
            {backupStarted && <div className={noteClass('info')}>
              <p>The app cannot tell whether the browser saved your file. Check your downloads and keep the JSON file somewhere private before confirming.</p>
              <button type="button" className={buttonClass('secondary', 'sm', 'mt-2')} onClick={async () => {
                if (await confirmBackupSaved()) {
                  setBackupStarted(false);
                  showToast('You confirmed saving a backup. We’ll remind you again in a week.');
                } else showToast('This browser could not save your confirmation. Backup reminders will continue.');
              }}>I saved my backup file</button>
            </div>}
            <button type="button" onClick={() => fileRef.current?.click()} className={action()}>
              <Upload className="h-4 w-4 text-muted" aria-hidden="true" /> Restore from a backup
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" aria-label="Choose a backup file to restore" className="sr-only" tabIndex={-1} onChange={handleRestoreFile} />
          </section>

          <section aria-labelledby="export-heading" className="space-y-2">
            <h3 id="export-heading" className="text-sm font-semibold text-ink">Export and erase</h3>
            <button type="button" aria-describedby="csv-privacy" onClick={handleExportCSV} className={action()}>
              <Download className="h-4 w-4 text-muted" aria-hidden="true" /> Export everything as CSV
            </button>
            <p id="csv-privacy" className="text-[13px] text-muted">CSV exports are unencrypted. Anyone with the file can read it; use an encrypted JSON backup for private recovery.</p>
            <button type="button" onClick={() => setConfirmErase(true)} className={action('danger')}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Erase local data
            </button>
          </section>
        </div>
      </Panel>

      <OfflineSettings />
      <MigrationRecovery />
      <SafetyNotice variant="full" />

      <Modal open={encryptedFile !== null} onClose={() => { if (!decrypting) { setEncryptedFile(null); setBackupSecret(''); } }} title="Unlock encrypted backup" subtitle="Use the passphrase or recovery key for the vault that created this file.">
        <form className="space-y-3" onSubmit={async e => {
          e.preventDefault();
          if (!encryptedFile) return;
          setDecrypting(true);
          setBackupUnlockError('');
          try {
            const result = await decryptBackup(encryptedFile, backupSecret, backupRecovery);
            setBackupSecret(''); setEncryptedFile(null);
            if (result.ok) setPendingRestore({ data: result.data, counts: result.counts, baseline: hasVault() ? backupRestoreBaseline() : null });
            else setRestoreErrors(result.errors);
          } catch { setBackupUnlockError('Could not decrypt this backup. Check its passphrase or recovery key; the file may also be damaged. Nothing was changed.'); }
          finally { setDecrypting(false); }
        }}>
          <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink"><input className="h-5 w-5 accent-brand" type="checkbox" checked={backupRecovery} disabled={decrypting} onChange={e => { setBackupRecovery(e.target.checked); setBackupSecret(''); }} />Use the backup’s recovery key</label>
          <label htmlFor="backup-secret" className={labelClass}>{backupRecovery ? 'Backup recovery key' : 'Backup passphrase'}</label>
          <input id="backup-secret" type="password" autoComplete="off" required maxLength={1024} disabled={decrypting} value={backupSecret} onChange={e => setBackupSecret(e.target.value)} className={inputClass()} />
          <Button type="submit" disabled={decrypting} className="border-0 bg-brand text-white hover:bg-brand-strong">{decrypting ? 'Decrypting…' : 'Check backup'}</Button>
          {backupUnlockError && <p role="alert" className={errorClass}>{backupUnlockError}</p>}
        </form>
      </Modal>

      <p className="pb-4 text-center text-[13px] text-muted">GLP-1 Companion · Not medical advice. Always consult your care team.</p>

      <ConfirmDialog
        open={confirmErase}
        title="Erase all data on this device?"
        description="This permanently deletes your profile, weights, doses and symptom logs from this browser. It cannot be undone. Download a backup first if you want to keep them."
        confirmLabel="Erase everything"
        destructive
        onConfirm={handleEraseData}
        onCancel={() => setConfirmErase(false)}
      />

      <ConfirmDialog
        open={!!pendingRestore}
        title="Replace your current data with this backup?"
        description={
          pendingRestore && (
            <>
              The backup contains {pendingRestore.counts.doses} {pendingRestore.counts.doses === 1 ? 'dose' : 'doses'}, {pendingRestore.counts.weights} {pendingRestore.counts.weights === 1 ? 'weight' : 'weights'} and {pendingRestore.counts.effects} symptom {pendingRestore.counts.effects === 1 ? 'log' : 'logs'}.
              {' '}It also contains {pendingRestore.data.dailyLogs?.length ?? 0} daily protein/water logs. Your current daily logs will be replaced too; an older backup contains none.
              Everything currently stored here (including your profile) will be <strong>replaced</strong>.
              {pendingRestore.baseline !== null ? ' Your current saved records will become the one encrypted recovery point, replacing any previous point. The backup’s own recovery history is not imported. Download a separate backup first.' : ' This can’t be undone.'}
              {getWeightUnit(pendingRestore.data.settings) !== unit && <> Your display unit will change to {getWeightUnit(pendingRestore.data.settings)}.</>}
            </>
          )
        }
        confirmLabel="Replace my data"
        destructive
        onConfirm={confirmRestore}
        onCancel={() => setPendingRestore(null)}
      />

      <Modal open={restoring} onClose={() => {}} title="Restoring encrypted backup"><p role="status">Wait until encrypted saving finishes before editing records or closing this tab.</p></Modal>

      <Modal open={!!restoreErrors} onClose={() => setRestoreErrors(null)} title="This backup can’t be restored" subtitle="Nothing was changed.">
        <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-ink-2">
          {restoreErrors?.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => setRestoreErrors(null)} className={buttonClass('primary')}>OK</button>
        </div>
      </Modal>

      <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} />
    </div>
  );
}
