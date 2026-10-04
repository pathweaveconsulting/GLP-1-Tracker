import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Lock, Download, Trash2, Shield, User, Sparkles } from 'lucide-react';
import { EditProfileModal } from '../components/modals/EditProfileModal';

export function Settings() {
  const { settings, doses, weights, effects } = useStore();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const showToast = (txt: string) => {
    setMessage(txt);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Date,Value/Details,Notes\n";

    doses.forEach(d => {
      csvContent += `Shot,${d.date},${d.amountMg} mg (${d.site}),"${d.notes || ''}"\n`;
    });
    weights.forEach(w => {
      csvContent += `Weight,${w.date},${w.weightLbs} lbs,\n`;
    });
    effects.forEach(e => {
      csvContent += `Effect,${e.date},Hunger:${e.hunger} FoodNoise:${e.foodNoise} Nausea:${e.nausea},"${e.notes || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `glp1_health_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("CSV Export downloaded successfully!");
  };

  const handleEraseData = () => {
    if (confirm("Are you sure you want to erase all stored local health data? This action cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-[16px] shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-300">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          {message}
        </div>
      )}

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Settings & Privacy</h1>
        <p className="text-sm text-[#667085] mt-0.5">Manage your profile, goals, and local health data</p>
      </header>

      <Card className="rounded-[24px] border-[#E5E7EB] bg-white shadow-xs p-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#6D4AFF]" />
            <CardTitle className="text-base font-semibold text-[#111827]">Profile & Medication Setup</CardTitle>
          </div>
          <Button onClick={() => setIsEditProfileOpen(true)} variant="outline" size="sm" className="rounded-[14px] border-[#E5E7EB] text-xs font-semibold text-[#111827]">
            Edit Profile
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#F8F9FC] p-4 rounded-[16px] border border-[#E5E7EB]">
              <label className="text-xs font-medium text-[#667085] block mb-1">Medication</label>
              <div className="text-sm font-semibold text-[#111827]">{settings.medication}</div>
            </div>
            <div className="bg-[#F8F9FC] p-4 rounded-[16px] border border-[#E5E7EB]">
              <label className="text-xs font-medium text-[#667085] block mb-1">Starting Weight</label>
              <div className="text-sm font-semibold text-[#111827]">{settings.startingWeight} lbs</div>
            </div>
            <div className="bg-[#F8F9FC] p-4 rounded-[16px] border border-[#E5E7EB]">
              <label className="text-xs font-medium text-[#667085] block mb-1">Target Weight</label>
              <div className="text-sm font-semibold text-[#111827]">{settings.targetWeight} lbs</div>
            </div>
            <div className="bg-[#F8F9FC] p-4 rounded-[16px] border border-[#E5E7EB]">
              <label className="text-xs font-medium text-[#667085] block mb-1">Height</label>
              <div className="text-sm font-semibold text-[#111827]">{Math.floor(settings.heightInches / 12)}'{settings.heightInches % 12}"</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-[#E5E7EB] bg-white shadow-xs p-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#22C55E]" />
            <CardTitle className="text-base font-semibold text-[#111827]">Privacy & Data Safeguards</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-[#667085] font-normal leading-relaxed">
            Your health telemetry data is private and encrypted in your browser storage. We do not sell your data or transmit it to external servers.
          </p>
          <div className="space-y-2 pt-2">
            <Button onClick={handleExportCSV} variant="outline" className="w-full justify-start gap-2.5 rounded-[14px] border-[#E5E7EB] text-[#111827] font-semibold text-xs py-3">
              <Download className="w-4 h-4 text-[#667085]" />
              Export All Data (CSV Download)
            </Button>
            <Button onClick={handleEraseData} variant="outline" className="w-full justify-start gap-2.5 rounded-[14px] border-rose-100 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold text-xs py-3">
              <Trash2 className="w-4 h-4" />
              Erase Local Data
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center pb-8 pt-4">
         <p className="text-[11px] text-[#98A2B3] font-medium">
           GLP-1 Intelligence v2.0 • Medical Disclaimer: Always consult your physician.
         </p>
      </div>

      <EditProfileModal 
        isOpen={isEditProfileOpen} 
        onClose={() => setIsEditProfileOpen(false)} 
      />
    </div>
  );
}
