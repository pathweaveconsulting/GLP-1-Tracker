import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Download, Trash2, Shield, User, FileJson, Upload } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SafetyNotice } from '../components/SafetyNotice';
import { EditProfileModal } from '../components/modals/EditProfileModal';
import { formatHeight, formatWeight, getWeightUnit } from '../lib/units';
import { exportBackupJson, exportTidyCsv, readFileAsText } from '../lib/dataTransfer';
import { BackupData, parseBackup } from '../lib/backup';

type PendingRestore = { data: BackupData; counts: { doses: number; weights: number; effects: number } };

export function Settings() {
  const { settings, doses, weights, effects, resetAllData, replaceAllData } = useStore();
  const unit = getWeightUnit(settings);
  const { show: showToast } = useToast();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [restoreErrors, setRestoreErrors] = useState<string[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const snapshot = (): BackupData => ({ settings, doses, weights, effects });

  const handleExportCSV = () => {
    exportTidyCsv(snapshot(), unit);
    showToast('CSV export downloaded.');
  };

  const handleExportJSON = () => {
    exportBackupJson(snapshot());
    showToast('Backup downloaded. Keep it somewhere safe.');
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = parseBackup(await readFileAsText(file));
    if (result.ok) setPendingRestore({ data: result.data, counts: result.counts });
    else setRestoreErrors(result.errors);
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    replaceAllData(pendingRestore.data);
    setPendingRestore(null);
    showToast('Backup restored.');
  };

  const handleEraseData = () => {
    setConfirmErase(false);
    resetAllData();
  };

  const stat = (label: string, value: string) => (
    <div className="bg-[#F8F9FC] p-4 rounded-[16px] border border-[#E5E7EB]">
      <dt className="text-xs font-medium text-[#667085] block mb-1">{label}</dt>
      <dd className="text-sm font-semibold text-[#111827]">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Settings & Privacy</h1>
        <p className="text-sm text-[#667085] mt-0.5">Manage your profile, goals, and local health data</p>
      </header>

      <Card className="rounded-[24px] border-[#E5E7EB] bg-white shadow-xs p-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#6D4AFF]" aria-hidden="true" />
            <CardTitle className="text-base font-semibold text-[#111827]"><h2>Profile & Medication Setup</h2></CardTitle>
          </div>
          <Button onClick={() => setIsEditProfileOpen(true)} variant="outline" size="sm" className="rounded-[14px] border-[#E5E7EB] text-xs font-semibold text-[#111827]">
            Edit Profile
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stat('Medication', settings.medication)}
            {stat('Starting Weight', settings.startingWeight > 0 ? formatWeight(settings.startingWeight, unit) : '–')}
            {stat('Goal Weight', settings.targetWeight > 0 ? formatWeight(settings.targetWeight, unit) : '–')}
            {stat('Height', formatHeight(settings.heightInches))}
          </dl>
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-[#E5E7EB] bg-white shadow-xs p-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#16A34A]" aria-hidden="true" />
            <CardTitle className="text-base font-semibold text-[#111827]"><h2>Privacy & your data</h2></CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-xs text-[#667085] font-normal leading-relaxed space-y-2">
            <p>
              Your data lives only in this browser on this device. This app has no account and no server, and it doesn’t send your logs anywhere.
            </p>
            <p>
              It is stored <strong>unencrypted</strong> in the browser’s local storage, so anyone who can open this browser profile can read it.
              If you clear your browser data (or use a private window), it is deleted for good. Download a backup now and then.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <Button onClick={handleExportCSV} variant="outline" className="w-full justify-start gap-2.5 rounded-[14px] border-[#E5E7EB] text-[#111827] font-semibold text-xs py-3">
              <Download className="w-4 h-4 text-[#667085]" aria-hidden="true" /> Export everything as CSV
            </Button>
            <Button onClick={handleExportJSON} variant="outline" className="w-full justify-start gap-2.5 rounded-[14px] border-[#E5E7EB] text-[#111827] font-semibold text-xs py-3">
              <FileJson className="w-4 h-4 text-[#667085]" aria-hidden="true" /> Download a backup (JSON)
            </Button>
            <Button onClick={() => fileRef.current?.click()} variant="outline" className="w-full justify-start gap-2.5 rounded-[14px] border-[#E5E7EB] text-[#111827] font-semibold text-xs py-3">
              <Upload className="w-4 h-4 text-[#667085]" aria-hidden="true" /> Restore from a backup
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" aria-label="Choose a backup file to restore" className="sr-only" tabIndex={-1} onChange={handleRestoreFile} />
            <Button onClick={() => setConfirmErase(true)} variant="outline" className="w-full justify-start gap-2.5 rounded-[14px] border-rose-100 text-rose-700 hover:text-rose-800 hover:bg-rose-50 font-semibold text-xs py-3">
              <Trash2 className="w-4 h-4" aria-hidden="true" /> Erase local data
            </Button>
          </div>
        </CardContent>
      </Card>

      <SafetyNotice variant="full" />

      <div className="text-center pb-8 pt-4">
        <p className="text-[11px] text-[#667085] font-medium">GLP-1 Companion • Not medical advice. Always consult your care team.</p>
      </div>

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
              Everything currently stored here (including your profile) will be <strong>replaced</strong>. This can’t be undone.
            </>
          )
        }
        confirmLabel="Replace my data"
        destructive
        onConfirm={confirmRestore}
        onCancel={() => setPendingRestore(null)}
      />

      <Modal open={!!restoreErrors} onClose={() => setRestoreErrors(null)} title="This backup can’t be restored" subtitle="Nothing was changed.">
        <ul role="alert" className="list-disc pl-5 space-y-1 text-xs text-[#344054]">
          {restoreErrors?.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => setRestoreErrors(null)} className="px-5 py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-[16px]">OK</button>
        </div>
      </Modal>

      <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} />
    </div>
  );
}
