import os
import glob

replacements = {
    "rounded-xl": "rounded-[16px]",
    "rounded-2xl": "rounded-[16px]",
    "rounded-3xl": "rounded-[24px]",
    "shadow-sm": "shadow-xs",
    "border-slate-100": "border-[#E5E7EB]",
    "border-slate-200": "border-[#E5E7EB]",
    "border-slate-300": "border-[#D0D5DD]",
    "text-slate-900": "text-[#111827]",
    "text-slate-800": "text-[#111827]",
    "text-slate-700": "text-[#344054]",
    "text-slate-600": "text-[#667085]",
    "text-slate-500": "text-[#667085]",
    "text-slate-400": "text-[#98A2B3]",
    "bg-slate-50": "bg-[#F8F9FC]",
    "font-extrabold": "font-semibold",
    "font-bold": "font-semibold",
    "text-purple-600": "text-[#6D4AFF]",
    "bg-purple-600": "bg-[#6D4AFF]",
    "text-purple-700": "text-[#6D4AFF]",
    "bg-purple-700": "bg-[#6D4AFF]",
    "text-purple-800": "text-[#4C1D95]",
    "bg-purple-800": "bg-[#4C1D95]",
    "text-purple-500": "text-[#6D4AFF]",
    "bg-purple-500": "bg-[#6D4AFF]",
    "text-emerald-600": "text-[#22C55E]",
    "bg-emerald-600": "bg-[#22C55E]",
    "text-emerald-500": "text-[#22C55E]",
    "bg-emerald-500": "bg-[#22C55E]",
    "text-emerald-700": "text-[#16A34A]",
    "bg-emerald-700": "bg-[#16A34A]",
    "text-indigo-600": "text-[#6D4AFF]",
    "bg-indigo-600": "bg-[#6D4AFF]",
}

for filepath in glob.iglob('src/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as file:
        content = file.read()
        
    original_content = content
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Updated {filepath}")
