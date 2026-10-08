import { useEffect, useState, type ReactNode } from 'react';
import { activatePreparedVault, discardVaultSession, hasVault, prepareVault, unlockVault, hasPendingVaultWrites, lockVault, getLockedBackup } from '../lib/vault';
import { useStore } from '../store/useStore';
import { emptyData, STORE_VERSION } from '../store/migrate';
import { downloadTextFile } from '../lib/csv';
import { BrandMark } from './BrandMark';
import { buttonClass } from './ds/Button';

type Prepared = Awaited<ReturnType<typeof prepareVault>>;
function initialView(): 'setup' | 'locked' | 'unavailable' {
  try { return hasVault() ? 'locked' : 'setup'; } catch { return 'unavailable'; }
}
const field = 'w-full min-h-11 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-[15px] text-ink';
const button = buttonClass('primary', 'md', 'w-full');

export function VaultGate({ children }: { children: ReactNode }) {
  const [view, setView] = useState<'setup' | 'locked' | 'unavailable' | 'open' | 'locking'>(initialView);
  const [secret, setSecret] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function lock() {
    setView('locking'); // Hide records immediately and prevent edits while queued saves finish.
    try {
      const { settings, doses, weights, effects, hasOnboarded } = useStore.getState();
      const unsaved = await lockVault(JSON.stringify({ state: { settings, doses, weights, effects, hasOnboarded }, version: STORE_VERSION }));
      useStore.setState({ ...emptyData(), storageError: false, readFailed: false, unreadable: false, malformed: false, skippedEntries: 0 });
      setSecret(''); setView('locked');
      setError(unsaved ? 'Some changes could not be saved. They are encrypted in this tab only. Download the unsaved encrypted backup before closing or reloading.' : '');
    } catch {
      setView('open');
      setError('Locking could not finish. Download an encrypted backup before closing or reloading.');
    }
  }

  useEffect(() => {
    const beforeLeave = (event: BeforeUnloadEvent) => {
      if (hasPendingVaultWrites() || getLockedBackup()) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeLeave);
    return () => window.removeEventListener('beforeunload', beforeLeave);
  }, []);

  useEffect(() => {
    if (view !== 'open') return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => { void lock(); }, 10 * 60_000); };
    reset();
    window.addEventListener('pointerdown', reset, { passive: true });
    window.addEventListener('keydown', reset);
    return () => { clearTimeout(timer); window.removeEventListener('pointerdown', reset); window.removeEventListener('keydown', reset); };
  }, [view]);

  async function finish() {
    setBusy(true); setError('');
    try {
      if (prepared) await activatePreparedVault(prepared);
      else await unlockVault(secret, recovery);
      await useStore.persist.rehydrate();
      useStore.setState({}); // Retry saving records recovered from an unsaved encrypted snapshot.
      setSecret(''); setConfirmation(''); setPrepared(null); setView('open');
    } catch {
      discardVaultSession(true);
      setError('Could not unlock or finish setup. Check your passphrase or recovery key. If it is correct, storage may be blocked or the file may be damaged. Your encrypted records have not been replaced.');
      try { if (hasVault()) { useStore.setState({ ...emptyData(), storageError: false }); setPrepared(null); setView('locked'); } } catch { setView('unavailable'); }
    } finally { setBusy(false); }
  }

  async function beginSetup(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (secret !== confirmation) { setError('The passphrases do not match.'); return; }
    setBusy(true);
    try { setPrepared(await prepareVault(secret)); setSecret(''); setConfirmation(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Setup could not start. Original records were kept.'); }
    finally { setBusy(false); }
  }

  if (view === 'locking') return <main className="flex min-h-screen items-center justify-center bg-canvas"><p role="status" className="text-sm text-muted">Locking your records…</p></main>;

  if (view === 'open') return <div style={{ '--vault-toolbar-height': '3rem' } as React.CSSProperties}>
    <div className="flex h-12 items-center justify-between gap-3 border-b border-line bg-surface px-4 print:hidden">
      <p className="truncate text-xs text-muted">Encrypted records unlocked · locks after 10 minutes of inactivity</p>
      <button type="button" onClick={() => { void lock(); }} className={buttonClass('quiet', 'sm', 'shrink-0')}>Lock records</button>
    </div>
    {error && <p role="alert" className="p-3 text-sm text-danger">{error}</p>}
    {children}
  </div>;

  return <main className="flex min-h-screen items-start justify-center bg-canvas px-4 py-10 sm:items-center">
    <section aria-labelledby="vault-title" className="w-full max-w-md space-y-4 rounded-[var(--radius-panel)] border border-line bg-surface p-6 sm:p-8">
      <div className="flex items-center gap-3"><BrandMark className="h-9 w-9" /><span className="text-sm font-semibold text-ink-2">GLP-1 Companion</span></div>
      <h1 id="vault-title" className="text-2xl font-semibold leading-8 text-ink">{view === 'setup' ? 'Protect your private records' : 'Unlock your private records'}</h1>
      <p className="text-sm leading-6 text-muted">Your passphrase stays on this device while unlocked. We cannot reset it or recover your records without your recovery key. Clearing browser data still deletes your records; keep encrypted backups.</p>
      <p className="rounded-[var(--radius-control)] bg-sunken px-3 py-2 text-xs leading-5 text-muted">Encryption protects stored files. It cannot protect an unlocked device or prevent the website operator from changing the app’s code.</p>
      {getLockedBackup() && <button type="button" className={button} onClick={() => {
        try { downloadTextFile('glp1-unsaved-encrypted-backup.json', getLockedBackup()!, 'application/json'); }
        catch { setError('The encrypted backup download could not start. Please try again.'); }
      }}>Download unsaved encrypted backup</button>}
      {view === 'unavailable' ? <p role="alert">This browser cannot access storage. Enable site storage and reload. Existing records have not been overwritten.</p> : prepared ? <>
        <h2 className="text-lg font-semibold text-ink">Save your recovery key</h2>
        <p className="text-sm text-muted">Keep this key somewhere private, away from this browser. Anyone with the key and an encrypted backup can read your records. It will not be shown again.</p>
        <code className="block select-all break-all rounded-[var(--radius-control)] border border-line-strong bg-sunken p-3 font-mono text-sm text-ink">{prepared.recoveryKey}</code>
        <label className="flex gap-3 items-start text-sm"><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} className="mt-1" />I saved my recovery key somewhere private.</label>
        <button type="button" className={button} disabled={!saved || busy} onClick={() => { void finish(); }}>{busy ? 'Protecting records…' : 'Encrypt my records and continue'}</button>
      </> : <form onSubmit={view === 'setup' ? beginSetup : e => { e.preventDefault(); void finish(); }} className="space-y-4">
        {view === 'locked' && <label className="flex gap-2 text-sm"><input type="checkbox" checked={recovery} onChange={e => { setRecovery(e.target.checked); setSecret(''); }} />Use my recovery key</label>}
        <div><label htmlFor="vault-secret" className="mb-1.5 block text-sm font-semibold text-ink">{recovery ? 'Recovery key' : 'Vault passphrase'}</label>
          <input id="vault-secret" type="password" autoComplete={view === 'setup' ? 'new-password' : 'current-password'} value={secret} onChange={e => setSecret(e.target.value)} className={field} required maxLength={1024} minLength={view === 'setup' ? 14 : undefined} />
        </div>
        {view === 'setup' && <>
          <p className="text-xs leading-5 text-muted">Use a unique passphrase of at least 14 characters, preferably several unrelated words. Existing browser records will be encrypted after you save your recovery key.</p>
          <div><label htmlFor="vault-confirm" className="mb-1.5 block text-sm font-semibold text-ink">Confirm passphrase</label><input id="vault-confirm" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className={field} required maxLength={1024} /></div>
        </>}
        <button className={button} disabled={busy}>{busy ? 'Please wait…' : view === 'setup' ? 'Create private vault' : 'Unlock records'}</button>
      </form>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  </main>;
}
