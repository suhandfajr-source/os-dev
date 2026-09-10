'use client';

import React from 'react';
import { Terminal, Flame, Database, GitBranch, Bot, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
}

const STARTER_PROMPTS = [
  {
    icon: Terminal,
    title: 'Apa itu CLI?',
    subtitle: 'Penjelasan dasar terminal & command line dengan analogi',
  },
  {
    icon: Flame,
    title: 'Jelasin pesan error ini',
    subtitle: 'Ketik atau paste pesan error coding kamu',
  },
  {
    icon: Database,
    title: 'Apa bedanya API dan Database?',
    subtitle: 'Konsep dasar alur komunikasi data web',
  },
  {
    icon: GitBranch,
    title: 'Cara kerja Git branch & merge',
    subtitle: 'Visualisasi alur branching untuk pemula',
  },
];

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center max-w-xl mx-auto my-auto select-none">
      {/* WhatsApp Profile Avatar Header */}
      <div className="relative mb-3">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg">
          <Bot className="w-8 h-8" />
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#25d366] border-2 border-[#0b141a]" />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[#25d366] font-semibold mb-1">
        <Sparkles className="w-3.5 h-3.5" />
        Personal Vibe Coding Assistant
      </div>

      <h2 className="text-lg md:text-xl font-semibold text-[#e9edef] mb-1">
        Mulai Obrolan Baru
      </h2>
      <p className="text-xs md:text-sm text-[#8696a0] mb-6 max-w-sm">
        Tanyakan istilah teknologi, paste potongan error, atau upload screenshot dari IDE & terminal kamu.
      </p>

      {/* Suggested Quick Cards in WhatsApp style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {STARTER_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.title)}
              type="button"
              className="flex items-start gap-2.5 p-3 text-left rounded-xl bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] hover:border-[#00a884]/60 transition-all group shadow-sm cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-[#111b21] text-[#25d366] group-hover:text-[#53bdeb] transition-colors flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs md:text-sm font-semibold text-[#e9edef] group-hover:text-[#25d366] transition-colors">
                  &quot;{item.title}&quot;
                </div>
                <div className="text-[11px] text-[#8696a0] mt-0.5 leading-snug">
                  {item.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
