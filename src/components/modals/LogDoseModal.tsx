import React, { useState, useEffect } from 'react';
import { X, Syringe, Check, Clock, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Medication } from '../../types';
import { 
  INJECTION_SITES_ABDOMEN, 
  INJECTION_SITES_OTHER, 
  getRecommendedNextSite 
} from '../../lib/glp1Utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LogDoseModal({ isOpen, onClose, onSuccess }: Props) {
  const { addDose, settings, doses } = useStore();
  const [medication, setMedication] = useState<Medication>(settings.medication || 'Tirzepatide');
  const [amountMg, setAmountMg] = useState<number>(7.5);
  
  const now = new Date();
  const [dateStr, setDateStr] = useState<string>(now.toISOString().split('T')[0]);
  const [timeStr, setTimeStr] = useState<string>(now.toTimeString().slice(0, 5));

  const sortedDoses = [...doses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const lastDose = sortedDoses.length > 0 ? sortedDoses[sortedDoses.length - 1] : null;
  const lastShotSite = lastDose?.site;
  const recommendedNextSite = getRecommendedNextSite(lastShotSite, settings.customSites);

  const [site, setSite] = useState<string>(recommendedNextSite);
  const [painLevel, setPainLevel] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [isCustomSiteInputOpen, setIsCustomSiteInputOpen] = useState(false);
  const [customSiteName, setCustomSiteName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSite(recommendedNextSite);
    }
  }, [isOpen, recommendedNextSite]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const combinedIso = new Date(`${dateStr}T${timeStr}:00`).toISOString();
    
    addDose({
      medication,
      amountMg: Number(amountMg),
      date: combinedIso,
      site,
      painLevel: Number(painLevel),
      notes
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  const handleAddCustomSite = () => {
    if (customSiteName.trim()) {
      setSite(customSiteName.trim());
      setIsCustomSiteInputOpen(false);
      setCustomSiteName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[24px] p-6 shadow-2xl border border-[#E5E7EB] relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E5E7EB] flex items-center justify-center text-[#667085] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[16px] bg-purple-50 flex items-center justify-center text-[#6D4AFF]">
            <Syringe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#111827]">Log Shot / Dose</h2>
            <p className="text-xs text-[#667085]">Record exact date, time, medication & injection site</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Medication</label>
            <select
              value={medication}
              onChange={(e) => setMedication(e.target.value as Medication)}
              className="w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="Mounjaro">Mounjaro</option>
              <option value="Tirzepatide">Tirzepatide</option>
              <option value="Semaglutide">Semaglutide</option>
              <option value="Ozempic">Ozempic</option>
              <option value="Wegovy">Wegovy</option>
              <option value="Zepbound">Zepbound</option>
              <option value="Retatrutide">Retatrutide</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Dose Amount (mg)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={amountMg}
                onChange={(e) => setAmountMg(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Date Logged</label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#6D4AFF]" /> Time Logged
              </label>
              <input
                type="time"
                required
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* INJECTION SITE SELECTOR (MATCHES IMAGE 3) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold tracking-wider text-[#667085]">
                Injection Site
              </label>
              {lastShotSite && (
                <span className="text-[11px] text-[#6D4AFF] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto-rotated
                </span>
              )}
            </div>

            <div className="bg-[#F8F9FC] rounded-[16px] p-3 border border-[#E5E7EB] space-y-3 max-h-56 overflow-y-auto">
              <div>
                <span className="text-[11px] font-semibold text-[#98A2B3] tracking-wider block mb-2">Your Rotation (Abdomen)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {INJECTION_SITES_ABDOMEN.map((s) => {
                    const isLast = s === lastShotSite;
                    const isRecommended = s === recommendedNextSite;
                    const isSelected = site === s;

                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSite(s)}
                        className={`text-left px-3 py-2 rounded-[16px] text-xs font-semibold border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-100 border-purple-500 text-purple-900 shadow-xs'
                            : isRecommended
                            ? 'bg-purple-50/70 border-purple-200 text-[#4C1D95]'
                            : 'bg-white border-[#E5E7EB] text-[#344054] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        <span className="truncate">{s}</span>
                        {isLast && (
                          <span className="text-[10px] text-[#98A2B3] font-normal italic ml-1 shrink-0">(last shot site)</span>
                        )}
                        {isRecommended && !isLast && (
                          <span className="text-[10px] text-[#6D4AFF] font-semibold ml-1 shrink-0">(recommended next)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#98A2B3] tracking-wider block mb-2">Other Sites</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {INJECTION_SITES_OTHER.map((s) => {
                    const isLast = s === lastShotSite;
                    const isRecommended = s === recommendedNextSite;
                    const isSelected = site === s;

                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSite(s)}
                        className={`text-left px-3 py-2 rounded-[16px] text-xs font-semibold border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-100 border-purple-500 text-purple-900 shadow-xs'
                            : isRecommended
                            ? 'bg-purple-50/70 border-purple-200 text-[#4C1D95]'
                            : 'bg-white border-[#E5E7EB] text-[#344054] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        <span className="truncate">{s}</span>
                        {isLast && (
                          <span className="text-[10px] text-[#98A2B3] font-normal italic ml-1 shrink-0">(last shot site)</span>
                        )}
                        {isRecommended && !isLast && (
                          <span className="text-[10px] text-[#6D4AFF] font-semibold ml-1 shrink-0">(recommended next)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!isCustomSiteInputOpen ? (
                <button
                  type="button"
                  onClick={() => setIsCustomSiteInputOpen(true)}
                  className="w-full py-1.5 text-xs text-[#6D4AFF] font-semibold hover:underline text-left px-1"
                >
                  + Edit or add custom shot site
                </button>
              ) : (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="e.g. Upper Hip"
                    value={customSiteName}
                    onChange={(e) => setCustomSiteName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#D0D5DD] bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSite}
                    className="px-3 py-1.5 bg-[#6D4AFF] text-white rounded-lg text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Pain Level (0 - 10)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(parseInt(e.target.value))}
                className="w-full accent-purple-600"
              />
              <span className="text-sm font-semibold text-[#6D4AFF] w-6 text-center">{painLevel}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Notes (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did the injection feel?"
              className="w-full px-3.5 py-2 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-[16px] border border-[#E5E7EB] text-[#344054] font-semibold text-sm hover:bg-[#F8F9FC] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-[16px] bg-[#6D4AFF] text-white font-semibold text-sm hover:bg-[#6D4AFF] transition-colors shadow-md shadow-purple-200 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Dose
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
