'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, MessageSquarePlus, User, Settings } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Conversation } from '@/types';
import { ConversationItem } from './ConversationItem';
import { SearchModal } from './SearchModal';
import { useUserProfile } from '../profile/UserProfileContext';

export const Sidebar: React.FC = () => {
  const { profile, openModal } = useUserProfile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
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

  // Filter by search query if any
  const filteredConversations = filterQuery.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : conversations;

  // Group conversations by date
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;

  const todayList: Conversation[] = [];
  const sevenDaysList: Conversation[] = [];
  const olderList: Conversation[] = [];

  for (const conv of filteredConversations) {
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
      <aside className="w-72 md:w-80 bg-[#ffffff] border-r border-[#e9edef] flex flex-col h-screen select-none flex-shrink-0">
        {/* WhatsApp Sidebar Top Header with User Profile Setting Button (Light Mode) */}
        <div className="h-15 px-4 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between flex-shrink-0 shadow-[0_1px_2px_rgba(11,20,26,0.05)]">
          <div
            onClick={openModal}
            className="flex items-center gap-2.5 cursor-pointer group p-1 -ml-1 rounded-lg hover:bg-[#e9edef] transition-colors"
            title="Klik untuk atur foto profil & nama kamu"
          >
            {/* User Avatar */}
            <div className="relative">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-emerald-600 text-white flex items-center justify-center shadow-sm border border-[#e9edef]">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#008069] text-white flex items-center justify-center border-2 border-[#f0f2f5]">
                <Settings className="w-2.5 h-2.5" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="font-semibold text-sm text-[#111b21] group-hover:text-[#008069] transition-colors leading-tight">
                {profile.name}
              </span>
              <span className="text-[10px] text-[#667781]">
                Profil Kamu
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[#54656f]">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-[#e9edef] text-[#54656f] hover:text-[#111b21] transition-colors cursor-pointer"
              title="Obrolan Baru"
            >
              <MessageSquarePlus className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* WhatsApp Search Input Bar (Light Mode) */}
        <div className="p-2.5 bg-[#ffffff] border-b border-[#e9edef]">
          <div className="flex items-center bg-[#f0f2f5] rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884] focus-within:bg-[#ffffff] border border-transparent focus-within:border-[#00a884] transition-all">
            <Search className="w-4 h-4 text-[#54656f] mr-2.5 flex-shrink-0" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Cari obrolan..."
              className="w-full bg-transparent text-xs text-[#111b21] placeholder-[#8696a0] focus:outline-none"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-10 px-4 text-xs text-[#667781]">
              {filterQuery ? 'Tidak ada obrolan ditemukan.' : 'Belum ada obrolan. Mulai obrolan baru untuk bertanya!'}
            </div>
          ) : (
            <>
              {todayList.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-bold text-[#008069] uppercase tracking-wider">
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
                  <div className="px-3 py-1 text-[11px] font-bold text-[#008069] uppercase tracking-wider">
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
                  <div className="px-3 py-1 text-[11px] font-bold text-[#008069] uppercase tracking-wider">
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
