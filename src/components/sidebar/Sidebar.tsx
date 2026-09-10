'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Conversation } from '@/types';
import { ConversationItem } from './ConversationItem';
import { SearchModal } from './SearchModal';

export const Sidebar: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const params = useParams();
  const router = useRouter();
  const currentId = params?.id as string | undefined;

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, currentId]);

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
        );
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentId === id) {
          router.push('/');
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Group conversations by date: Today, Previous 7 Days, Older
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;

  const todayList: Conversation[] = [];
  const sevenDaysList: Conversation[] = [];
  const olderList: Conversation[] = [];

  for (const conv of conversations) {
    const time = new Date(conv.updated_at).getTime();
    if (time >= todayStart) {
      todayList.push(conv);
    } else if (time >= sevenDaysAgo) {
      sevenDaysList.push(conv);
    } else {
      olderList.push(conv);
    }
  }

  return (
    <>
      <aside className="w-64 md:w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none flex-shrink-0">
        {/* Header Branding & Action Buttons */}
        <div className="p-3.5 space-y-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2 px-2 py-1 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm text-slate-100 tracking-tight">
              Vibe Coding Assistant
            </span>
          </div>

          <Link
            href="/"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition-colors justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white rounded-lg border border-slate-700/60 transition-colors"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search...</span>
          </button>
        </div>

        {/* Conversation List Grouped */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-slate-400">
              Belum ada percakapan. Mulai percakapan baru untuk bertanya!
            </div>
          ) : (
            <>
              {todayList.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Hari Ini
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {todayList.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === currentId}
                        onRename={handleRename}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sevenDaysList.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    7 Hari Terakhir
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {sevenDaysList.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === currentId}
                        onRename={handleRename}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}

              {olderList.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Lebih Lama
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {olderList.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === currentId}
                        onRename={handleRename}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
