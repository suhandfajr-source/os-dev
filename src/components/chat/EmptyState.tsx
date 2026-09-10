'use client';

import React from 'react';
import { HelpCircle, Terminal, Flame, Database, GitBranch } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (promptText: string) => void;
}

const STARTER_PROMPTS = [
  {
    icon: Terminal,
    title: 'Apa itu CLI?',
    subtitle: 'Penjelasan dasar terminal & command line',
  },
  {
    icon: Flame,
    title: 'Jelasin error ini',
    subtitle: 'Ketik atau paste pesan error coding kamu',
  },
  {
    icon: Database,
    title: 'Apa bedanya API dan database?',
    subtitle: 'Konsep dasar komunikasi data web',
  },
  {
    icon: GitBranch,
    title: 'Cara kerja Git branch & merge',
    subtitle: 'Visualisasi alur branching untuk pemula',
  },
];

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto my-auto">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
        <HelpCircle className="w-6 h-6" />
      </div>
      
      <h2 className="text-xl md:text-2xl font-semibold text-slate-100 mb-2">
        Apa yang lagi bikin kamu bingung?
      </h2>
      <p className="text-sm text-slate-400 mb-8 max-w-md">
        Tanyakan istilah teknologi, paste potongan kode atau error, atau upload screenshot dari IDE dan terminal kamu.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {STARTER_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.title)}
              type="button"
              className="flex items-start gap-3 p-3.5 text-left rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all group"
            >
              <div className="p-2 rounded-lg bg-slate-700/50 text-blue-400 group-hover:text-blue-300 transition-colors flex-shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                  &quot;{item.title}&quot;
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
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
