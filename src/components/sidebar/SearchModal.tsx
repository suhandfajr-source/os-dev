'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import { SearchResult } from '@/types';
import { useRouter } from 'next/navigation';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/conversations?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-slate-900">
          <Search className="w-5 h-5 text-slate-400 mr-2.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari topik, pesan, atau error..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-blue-400 animate-spin mr-2" />}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Ketik kata kunci untuk mencari percakapan lampau.
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Tidak ada percakapan yang cocok dengan &quot;{query}&quot;.
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  router.push(`/chat/${item.id}`);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-lg hover:bg-slate-800/90 border border-transparent hover:border-slate-700 transition-all flex items-start justify-between group"
              >
                <div className="flex items-start gap-3 overflow-hidden">
                  <MessageSquare className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                  <div className="overflow-hidden">
                    <div className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-400 line-clamp-1 mt-0.5 font-mono">
                      {item.snippet}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2 mt-1" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
