import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Lightbulb, Calendar, HelpCircle, Activity, Coffee, MessageCircle, HeartPulse, Smile } from 'lucide-react';

export function Recommendations() {
  const tips = [
    { category: 'Tip of the Day', title: 'Hydration is Key', desc: 'Drink at least 80oz of water to help with medication absorption and side effects.', icon: Coffee },
    { category: 'Weekly Reminder', title: 'Prepare for your next dose', desc: 'Your next dose is in 2 days. Ensure you have your supplies ready.', icon: Calendar },
    { category: 'Ask Wisdom', title: 'Why am I fatigued?', desc: 'Fatigue is common in days 1-2 post-injection. Try light walking.', icon: HelpCircle },
    { category: 'Side Effect Tip', title: 'Managing Nausea', desc: 'Small, frequent meals with bland foods can help soothe mild nausea.', icon: Activity },
    { category: 'Hunger Tip', title: 'Protein First', desc: 'Prioritize protein in every meal to maximize satiety when hunger returns.', icon: HeartPulse },
    { category: 'Food Noise Tip', title: 'Recognize the quiet', desc: 'Notice how you feel when cravings are absent. Log these positive days!', icon: Lightbulb },
    { category: 'Coaching Advice', title: 'Patience with plateaus', desc: 'Weight loss isn\'t linear. A 1-2 week plateau is normal and expected.', icon: MessageCircle },
    { category: 'Mood Tip', title: 'Track your energy', desc: 'Notice patterns in your mood leading up to dose day.', icon: Smile },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Insights & Guidance</h1>
        <p className="text-sm text-[#667085] mt-0.5">Personalized recommendations based on your journey</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tips.map((tip, i) => (
          <Card key={i} className="flex flex-col h-full rounded-[24px] border-[#E5E7EB] bg-white shadow-xs hover:border-purple-200 transition-all">
            <CardContent className="p-5 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-[#F3F0FF] rounded-[10px]">
                    <tip.icon className="w-4 h-4 text-[#6D4AFF]" />
                  </div>
                  <span className="text-xs font-medium text-[#667085]">{tip.category}</span>
                </div>
                <h3 className="font-semibold text-base text-[#111827] mb-2">{tip.title}</h3>
                <p className="text-xs text-[#667085] leading-relaxed font-normal">{tip.desc}</p>
              </div>
              <button className="text-xs font-semibold text-[#6D4AFF] mt-4 text-left hover:underline cursor-pointer">Read guide →</button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
