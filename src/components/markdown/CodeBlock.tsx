'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900/90 text-slate-100 font-mono text-sm shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/60 text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-wider">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          type="button"
          aria-label="Salin kode"
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto">
        <pre className="text-slate-200 leading-relaxed font-mono whitespace-pre">{value}</pre>
      </div>
    </div>
  );
};
