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
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md">
          <Bot className="w-8 h-8" />
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#25d366] border-2 border-[#ffffff]" />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[#008069] font-bold mb-1">
        <Sparkles className="w-3.5 h-3.5" />
        Personal Vibe Coding Assistant
      </div>

      <h2 className="text-lg md:text-xl font-bold text-[#111b21] mb-1">
        Mulai Obrolan Baru
      </h2>
      <p className="text-xs md:text-sm text-[#54656f] mb-6 max-w-sm">
        Tanyakan istilah teknologi, paste potongan error, atau upload screenshot dari IDE & terminal kamu.
      </p>

      {/* Suggested Quick Cards in WhatsApp style (Light Mode) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {STARTER_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.title)}
              type="button"
              className="flex items-start gap-2.5 p-3.5 text-left rounded-xl bg-[#ffffff] hover:bg-[#f5f6f6] border border-[#e9edef] hover:border-[#008069] transition-all group shadow-[0_1px_0.5px_rgba(11,20,26,0.1)] cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-[#e6f7f2] text-[#008069] group-hover:bg-[#008069] group-hover:text-white transition-colors flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs md:text-sm font-semibold text-[#111b21] group-hover:text-[#008069] transition-colors">
                  &quot;{item.title}&quot;
                </div>
                <div className="text-[11px] text-[#667781] mt-0.5 leading-snug">
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
