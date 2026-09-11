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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-xl bg-[#ffffff] border border-[#e9edef] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#e9edef] bg-[#f0f2f5]">
          <Search className="w-5 h-5 text-[#54656f] mr-2.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari topik, pesan, atau error..."
            className="w-full bg-transparent text-[#111b21] placeholder-[#8696a0] text-sm focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-[#008069] animate-spin mr-2" />}
          <button
            onClick={onClose}
            className="p-1 text-[#54656f] hover:text-[#111b21] rounded-lg hover:bg-[#e9edef] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1 bg-white">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-[#667781] text-sm">
              Ketik kata kunci untuk mencari percakapan lampau.
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center text-[#667781] text-sm">
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
                className="w-full text-left p-3 rounded-xl hover:bg-[#f0f2f5] border border-transparent hover:border-[#e9edef] transition-all flex items-start justify-between group cursor-pointer"
              >
                <div className="flex items-start gap-2.5 min-w-0 pr-2">
                  <MessageSquare className="w-4 h-4 text-[#008069] flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#111b21] group-hover:text-[#008069] transition-colors truncate">
                      {item.title}
                    </div>
                    {item.snippet && (
                      <div className="text-xs text-[#667781] line-clamp-1 mt-0.5">
                        {item.snippet}
                      </div>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#8696a0] group-hover:text-[#008069] group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
