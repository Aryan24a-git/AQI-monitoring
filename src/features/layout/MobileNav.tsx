'use client';

import React from 'react';
import { ShieldCheck, Sparkles, Users } from 'lucide-react';

interface MobileNavProps {
  activeTab: 'playbook' | 'copilot' | 'community';
  onTabChange: (tab: 'playbook' | 'copilot' | 'community') => void;
}

const TABS: Array<{
  id: 'playbook' | 'copilot' | 'community';
  label: string;
  Icon: typeof ShieldCheck;
}> = [
  { id: 'playbook', label: 'Playbook', Icon: ShieldCheck },
  { id: 'copilot', label: 'Ask AI', Icon: Sparkles },
  { id: 'community', label: 'Community', Icon: Users },
];

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-2 py-1.5 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-3 gap-1" role="tablist" aria-label="Mobile Navigation Tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            role="tab"
            aria-selected={activeTab === id}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition ${activeTab === id ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
