'use client';

import React, { useState, useEffect } from 'react';
import { KnowledgeEntry } from '@/types';
import { Star, Search, X, Trash2, Copy, Check, ExternalLink, Terminal, Layers, Wrench, Globe, BookOpen } from 'lucide-react';

interface StarredToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshTrigger?: number;
}

export const StarredToolsDrawer: React.FC<StarredToolsDrawerProps> = ({
  isOpen,
  onClose,
  onRefreshTrigger = 0,
}) => {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch starred tools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEntries();
    }
  }, [isOpen, onRefreshTrigger]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Hapus tool ini dari koleksi tersimpan?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEntries((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete knowledge entry:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'tool':
        return <Wrench className="w-3.5 h-3.5 text-[#00a884]" />;
      case 'library':
        return <Layers className="w-3.5 h-3.5 text-[#53bdeb]" />;
      case 'layanan':
        return <Globe className="w-3.5 h-3.5 text-[#e6b400]" />;
      case 'konsep':
        return <BookOpen className="w-3.5 h-3.5 text-[#aebac1]" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-[#25d366]" />;
    }
  };

  const filteredEntries = entries.filter((item) => {
    const matchesType = selectedType === 'all' || item.type.toLowerCase() === selectedType.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.function_summary.toLowerCase().includes(q) ||
      item.when_to_use.toLowerCase().includes(q) ||
      item.how_to_start.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const types = ['all', 'tool', 'library', 'layanan', 'konsep'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
      {/* Backdrop overlay */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer content (Light Mode) */}
      <div className="w-full max-w-md h-full bg-[#f0f2f5] border-l border-[#e9edef] flex flex-col shadow-2xl animate-slide-in-right">
        {/* Official WhatsApp Green Header */}
        <div className="h-[60px] bg-[#008069] px-4 flex items-center justify-between text-white select-none shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-white">
              <Star className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                Koleksi Tools & Starred
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {entries.length}
                </span>
              </h2>
              <p className="text-[11px] text-white/80">Tersimpan dari obrolan WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 text-white transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 bg-[#ffffff] border-b border-[#e9edef] space-y-2.5 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#54656f]" />
            <input
              type="text"
              placeholder="Cari tool, library, atau fungsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f0f2f5] text-[#111b21] placeholder-[#8696a0] text-xs rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#008069] border border-transparent focus:border-[#008069] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#667781] hover:text-[#111b21] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-full capitalize whitespace-nowrap font-medium transition-all cursor-pointer border ${
                  selectedType === t
                    ? 'bg-[#008069] text-white border-[#008069] shadow-sm'
                    : 'bg-[#f0f2f5] text-[#54656f] border-[#e9edef] hover:bg-[#e9edef] hover:text-[#111b21]'
                }`}
              >
                {t === 'all' ? 'Semua' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Entry List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-[#667781] text-xs gap-2">
              <div className="w-6 h-6 border-2 border-[#008069] border-t-transparent rounded-full animate-spin" />
              Memuat koleksi tools...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4 text-[#667781]">
              <div className="w-12 h-12 rounded-full bg-[#ffffff] border border-[#e9edef] flex items-center justify-center mb-3 text-[#008069] shadow-sm">
                <Star className="w-6 h-6 fill-current opacity-80" />
              </div>
              <p className="text-sm font-bold text-[#111b21] mb-1">
                {searchQuery ? 'Tidak ada hasil yang cocok' : 'Belum Ada Tool Tersimpan'}
              </p>
              <p className="text-xs max-w-xs leading-relaxed text-[#54656f]">
                {searchQuery
                  ? 'Coba gunakan kata kunci pencarian yang lain.'
                  : 'Tanya asisten tentang tools atau library di obrolan, lalu klik ikon bintang ⭐ pada header chat.'}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-[#ffffff] border border-[#e9edef] rounded-xl p-3.5 hover:border-[#008069] shadow-[0_1px_0.5px_rgba(11,20,26,0.08)] transition-all group"
              >
                {/* Top Row: Name, Badge, Actions */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-[#111b21] tracking-wide">{entry.name}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[#f0f2f5] border border-[#e9edef] text-[#54656f]">
                      {getTypeIcon(entry.type)}
                      {entry.type}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDelete(entry.id, e)}
                    disabled={deletingId === entry.id}
                    title="Hapus dari koleksi"
                    className="opacity-60 group-hover:opacity-100 p-1 rounded hover:bg-[#fee2e2] text-[#667781] hover:text-[#dc2626] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Function Summary */}
                <p className="text-xs text-[#111b21] mb-2.5 leading-relaxed">{entry.function_summary}</p>

                {/* When to use */}
                {entry.when_to_use && (
                  <div className="mb-2 bg-[#f0f2f5] rounded-lg p-2.5 border border-[#e9edef]">
                    <span className="text-[10px] font-bold text-[#008069] block mb-0.5">KAPAN DIPAKAI:</span>
                    <p className="text-[11px] text-[#54656f] leading-relaxed">{entry.when_to_use}</p>
                  </div>
                )}

                {/* How to start */}
                {entry.how_to_start && (
                  <div className="bg-[#f0f2f5] rounded-lg p-2.5 border border-[#e9edef] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                      <Terminal className="w-3.5 h-3.5 text-[#008069] shrink-0" />
                      <code className="text-[11px] font-mono text-[#008069] font-bold truncate select-all">
                        {entry.how_to_start}
                      </code>
                    </div>
                    <button
                      onClick={(e) => handleCopy(entry.how_to_start, entry.id, e)}
                      title="Salin perintah"
                      className="p-1 rounded bg-[#ffffff] hover:bg-[#e9edef] text-[#54656f] hover:text-[#111b21] border border-[#e9edef] transition-colors shrink-0 cursor-pointer shadow-xs"
                    >
                      {copiedId === entry.id ? (
                        <Check className="w-3.5 h-3.5 text-[#008069]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
