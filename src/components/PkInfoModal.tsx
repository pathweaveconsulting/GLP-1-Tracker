import { Info } from 'lucide-react';
import { Modal } from './ui/Modal';

/** Plain-language description of how the "estimated medication level" is calculated, and its limits. */
export function PkInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="About the estimated level" icon={<Info className="w-5 h-5 text-caution" aria-hidden="true" />} widthClass="max-w-md">
      <div className="space-y-3 text-xs text-muted leading-relaxed">
        <p>
          The level you see is a <strong className="text-ink">simplified, illustrative one-compartment model</strong>. It uses the doses you logged and an
          approximate half-life for your medication. It is not a blood test and does not measure what is actually in your body.
        </p>
        <ul className="space-y-1.5 bg-canvas rounded-[var(--radius-control)] p-4">
          <li>• Half-lives are approximate averages and vary between people.</li>
          <li>• The model assumes every logged dose was taken at the logged time and amount.</li>
          <li>• Different medications are never added together; the headline number describes your most recently logged medication.</li>
          <li>• It is meant to help you picture the weekly rhythm, <strong className="text-ink">never to make dosing decisions</strong>.</li>
        </ul>
        <p>For anything about when or how much to take, follow your prescriber's instructions and the medication's official prescribing information.</p>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-[var(--radius-control)]">Got it</button>
      </div>
    </Modal>
  );
}
