import React, { useState } from 'react';
import { X, Scale, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LogWeightModal({ isOpen, onClose, onSuccess }: Props) {
  const { addWeight, weights, settings } = useStore();
  const latestWeight = weights.length > 0 ? weights[0].weightLbs : settings.startingWeight || 175.4;
  
  const [weightLbs, setWeightLbs] = useState<number>(latestWeight);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addWeight({
      weightLbs: Number(weightLbs),
      date: new Date(date).toISOString()
    });
    if (onSuccess) onSuccess();
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
          <div className="w-10 h-10 rounded-[16px] bg-emerald-50 flex items-center justify-center text-[#22C55E]">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#111827]">Log Weight</h2>
            <p className="text-xs text-[#667085]">Record your current body weight</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Weight (lbs)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="50"
                max="800"
                required
                value={weightLbs}
                onChange={(e) => setWeightLbs(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-lg font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="absolute right-4 top-3.5 text-sm font-semibold text-[#98A2B3]">lbs</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              className="flex-1 py-3 px-4 rounded-[16px] bg-[#22C55E] text-white font-semibold text-sm hover:bg-[#16A34A] transition-colors shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Weight
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
