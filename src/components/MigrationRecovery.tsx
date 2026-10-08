import { useState, useSyncExternalStore } from 'react';
import { Button } from './ui/button';
import { Panel } from './ds';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Modal } from './ui/Modal';
import { currentVaultSlots, isVaultUnlocked, subscribeVaultSlots } from '../lib/vault';
import { ROLLBACK_KEY } from '../store/keys';
import { parseRecoveryPoint, previewVaultMigration, restoreRecoveryPoint, saveMigrationRecoveryPoint, type VaultMigrationPreview } from '../lib/vaultRecovery';
import { useStore } from '../store/useStore';

/** Preview-only preparation. The app continues reading and writing store version 1. */
export function MigrationRecovery() {
  const raw = useSyncExternalStore(subscribeVaultSlots, () => isVaultUnlocked() ? currentVaultSlots()[ROLLBACK_KEY] ?? null : null, () => null);
  const [preview, setPreview] = useState<VaultMigrationPreview | null>(null);
  const [confirmation, setConfirmation] = useState<'save' | 'restore' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const enabled = import.meta.env.VITE_ENABLE_MIGRATION_PREVIEW === 'true';
  let recoveryDate = '', recoveryError = '';
  if (raw) {
    try { recoveryDate = new Date(parseRecoveryPoint(raw).createdAt).toLocaleString(); }
    catch { recoveryError = 'This recovery point cannot be read by this version. It remains in your encrypted backup.'; }
  }
  if ((!enabled && !raw) || !isVaultUnlocked()) return null;
  const run = async () => {
    if (busy) return;
    setBusy(true);
    const operation = confirmation;
    setConfirmation(null);
    try {
      if (operation === 'save' && preview) {
        await saveMigrationRecoveryPoint(preview);
        setPreview(null);
        setMessage('Encrypted recovery point saved. The live data format is unchanged.');
      } else if (operation === 'restore' && raw) {
        await restoreRecoveryPoint(raw);
        await useStore.persist.rehydrate();
        setPreview(null);
        setMessage('Saved records restored. The replaced records are now the recovery point.');
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Recovery operation failed.'); }
    finally { setBusy(false); }
  };
  return <Panel title="Encrypted recovery & migration preview" bodyClassName="space-y-3 text-sm text-ink-2">
      <p className="text-sm leading-6 text-ink-2">One recovery point is kept inside this browser’s encrypted vault. Clearing browser data also deletes it. Keep a downloaded backup separately. Backup import restores its current records, not its recovery history.</p>
      {enabled && <>
        <p className="text-sm leading-6 text-ink-2">Preview validates schema 2 in memory. It does not activate it or add new records. Legacy symptom ratings stay separate; unknown provenance stays unknown.</p>
        <Button disabled={busy} onClick={() => { try { setPreview(previewVaultMigration()); setMessage(''); } catch(error) { setPreview(null); setMessage(error instanceof Error ? error.message : 'Preview failed.'); } }}>Preview migration</Button>
      </>}
      {preview && <div className="space-y-2">
        <p>Profile: 1; doses: {preview.model.doses.length}; weights: {preview.model.weights.length}; legacy symptoms: {preview.model.legacyEffects.length}; daily check-ins: {preview.model.checkIns.length}.</p>
        <p className="text-sm leading-6 text-ink-2">Schedule, supply, reminder, milestone, preference and standalone-note domains remain empty. Nothing is inferred from missing logs.</p>
        <Button disabled={busy} className="border-0 bg-brand text-white hover:bg-brand-strong" onClick={() => setConfirmation('save')}>Save encrypted recovery point</Button>
      </div>}
      {raw && <p className="text-sm">{recoveryError || `Recovery point saved: ${recoveryDate}`}</p>}
      {raw && !recoveryError && <Button disabled={busy} variant="outline" onClick={() => setConfirmation('restore')}>Restore recovery point</Button>}
      {busy && <p role="status">Saving encrypted recovery. Wait before editing records.</p>}
      {message && <p role="status">{message}</p>}
      <Modal open={busy} onClose={() => {}} title="Saving encrypted recovery"><p role="status">Wait for this operation to finish before editing records or closing this tab.</p></Modal>
      <ConfirmDialog open={confirmation !== null} title={confirmation === 'save' ? 'Save recovery point?' : 'Restore saved records?'} description={confirmation === 'save' ? 'This replaces the previous recovery point with the current saved profile and all record slots. The live format remains unchanged. Download a separate backup first.' : 'This replaces the current profile and all record slots with the recovery point. Current saved records become the new recovery point. Download a separate backup first.'} confirmLabel={confirmation === 'save' ? 'Save recovery point' : 'Restore records'} destructive={confirmation === 'restore'} onCancel={() => setConfirmation(null)} onConfirm={() => { void run(); }}/>
  </Panel>;
}
