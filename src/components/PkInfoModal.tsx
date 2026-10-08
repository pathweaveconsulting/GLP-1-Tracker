import { Modal } from './ui/Modal';
import { buttonClass } from './ds';

/** Plain-language description of how the "estimated medication level" is calculated, and its limits. */
export function PkInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="About the estimated level" widthClass="max-w-md">
      <div className="space-y-3 text-sm leading-6 text-ink-2">
        <p>
          The level you see is a <strong className="text-ink">simplified, illustrative one-compartment model</strong>. It uses the doses you logged and an
          approximate half-life for your medication. It is not a blood test and does not measure what is actually in your body.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Half-lives are approximate averages and vary between people.</li>
          <li>The model assumes every logged dose was taken at the logged time and amount.</li>
          <li>Different medications are never added together; the headline number describes your most recently logged medication.</li>
          <li>It is meant to help you picture the weekly rhythm, <strong className="text-ink">never to make dosing decisions</strong>.</li>
        </ul>
        <p>For anything about when or how much to take, follow your prescriber's instructions and the medication's official prescribing information.</p>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className={buttonClass('secondary')}>Got it</button>
      </div>
    </Modal>
  );
}
