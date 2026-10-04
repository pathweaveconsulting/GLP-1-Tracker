import React, { useState } from 'react';
import { X, User, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Medication } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: Props) {
  const { settings, updateSettings } = useStore();
  const [medication, setMedication] = useState<Medication>(settings.medication || 'Tirzepatide');
  const [startingWeight, setStartingWeight] = useState<number>(settings.startingWeight || 200);
  const [targetWeight, setTargetWeight] = useState<number>(settings.targetWeight || 150);
  const [heightInches, setHeightInches] = useState<number>(settings.heightInches || 68);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      medication,
      startingWeight: Number(startingWeight),
      targetWeight: Number(targetWeight),
      heightInches: Number(heightInches)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[24px] p-6 shadow-2xl border border-[#E5E7EB] relative">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E5E7EB] flex items-center justify-center text-[#667085] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[16px] bg-[#F1F5F9] flex items-center justify-center text-[#344054]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#111827]">Edit Profile Details</h2>
            <p className="text-xs text-[#667085]">Update medication and body goals</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Primary Medication</label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Starting Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                required
                value={startingWeight}
                onChange={(e) => setStartingWeight(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Target Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                required
                value={targetWeight}
                onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Height (Inches)</label>
            <input
              type="number"
              required
              value={heightInches}
              onChange={(e) => setHeightInches(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <p className="text-[11px] text-[#98A2B3] mt-1">e.g. 68 inches = 5'8"</p>
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
              className="flex-1 py-3 px-4 rounded-[16px] bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
