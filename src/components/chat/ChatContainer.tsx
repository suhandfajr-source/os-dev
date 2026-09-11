'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message, ConversationWithMessages, AssistantResponsePayload, PendingKnowledgeEntry } from '@/types';
import { MessageItem } from './MessageItem';
import { ChatComposer, PendingAttachment } from './ChatComposer';
import { EmptyState } from './EmptyState';
import { useRouter } from 'next/navigation';
import { AlertCircle, Edit2, Check, X, Users, Plus, Star } from 'lucide-react';
import { getPersonaDetails } from '@/lib/personas';
import { useUserProfile } from '../profile/UserProfileContext';
import { StarredToolsDrawer } from './StarredToolsDrawer';

interface ChatContainerProps {
  conversationId?: string;
  initialData?: ConversationWithMessages | null;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  conversationId: propConversationId,
  initialData,
}) => {
  const { profile, openModal } = useUserProfile();
  const [messages, setMessages] = useState<Message[]>(initialData?.messages || []);
  const [groupTitle, setGroupTitle] = useState(initialData?.title || 'Geng Vibe Coding 🚀');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(groupTitle);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [kbEditing, setKbEditing] = useState<{ messageId: string; entry: PendingKnowledgeEntry } | null>(null);
  const [isStarredDrawerOpen, setIsStarredDrawerOpen] = useState(false);
  const [drawerRefreshTrigger, setDrawerRefreshTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (initialData?.messages) {
      setMessages(initialData.messages);
    }
    if (initialData?.title) {
      setGroupTitle(initialData.title);
      setEditTitleValue(initialData.title);
    }
  }, [initialData]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSaveTitle = async () => {
    const trimmed = editTitleValue.trim();
    if (!trimmed || trimmed === groupTitle || !propConversationId) {
      setIsEditingTitle(false);
      setEditTitleValue(groupTitle);
      return;
    }

    try {
      setGroupTitle(trimmed);
      setIsEditingTitle(false);
      await fetch(`/api/conversations/${propConversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
    } catch (err) {
      console.error('Failed to update group title:', err);
    }
  };

  const handleKbAction = async (
    messageId: string,
    action: 'save' | 'skip' | 'edit' | 'unstar',
    entry: PendingKnowledgeEntry
  ) => {
    if (action === 'edit') {
      setKbEditing({ messageId, entry });
      return;
    }

    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, action }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal memproses aksi dokumentasi.');
      }
      const data = await res.json();

      // Update payload pesan lokal supaya status star realtime
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.response_payload) return m;
          try {
            const payload: AssistantResponsePayload = JSON.parse(m.response_payload);
            payload.knowledge_status = data.knowledge_status;
            payload.knowledge_id = data.knowledge_id ?? undefined;
            return { ...m, response_payload: JSON.stringify(payload) };
          } catch {
            return m;
          }
        })
      );
      setDrawerRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error('KB action error:', err);
      setErrorMessage(err?.message || 'Gagal memproses aksi dokumentasi.');
    }
  };

  const handleKbConfirm = async (messageId: string, decision: 'confirm' | 'cancel') => {
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          action: decision === 'confirm' ? 'confirm_delete' : 'cancel_delete',
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal memproses konfirmasi penghapusan.');
      }
      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.response_payload) return m;
          try {
            const payload: AssistantResponsePayload = JSON.parse(m.response_payload);
            if (payload.kb_confirm) payload.kb_confirm.status = data.kb_confirm;
            return { ...m, response_payload: JSON.stringify(payload) };
          } catch {
            return m;
          }
        })
      );
    } catch (err: any) {
      console.error('KB confirm error:', err);
      setErrorMessage(err?.message || 'Gagal memproses konfirmasi penghapusan.');
    }
  };

  const handleSendMessage = async (content: string, attachments: PendingAttachment[]) => {
    setSelectedPrompt('');
    setErrorMessage(null);
    setIsLoading(true);
    const activeKbEdit = kbEditing;
    setKbEditing(null);

    // Create optimistic user message
    const tempUserMsgId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempUserMsgId,
      conversation_id: propConversationId || '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      attachments: attachments.map((a, idx) => ({
        id: `temp-att-${idx}`,
        message_id: tempUserMsgId,
        filename: a.filename,
        mime_type: a.mimeType,
        storage_path: a.storagePath || '',
        created_at: new Date().toISOString(),
      })),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: propConversationId,
          content,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            storagePath: a.storagePath,
            url: a.url,
            base64: a.base64,
          })),
          kbEdit: activeKbEdit ? { messageId: activeKbEdit.messageId, entry: activeKbEdit.entry } : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal memproses percakapan.');
      }

      const data = await res.json();
      const assistantMessage = data.message as Message;

      // Update message list
      setMessages((prev) => [...prev, assistantMessage]);

      if (data.autoTitle && !propConversationId) {
        setGroupTitle(data.autoTitle);
      }

      // If this was a new conversation on the root page, navigate to the specific chat route
      if (!propConversationId && data.conversationId) {
        router.push(`/chat/${data.conversationId}`);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(
        err?.message ||
          'Terjadi kendala saat menghubungi AI. Pastikan konfigurasi API key sudah sesuai.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Derive active persona from last assistant message or default
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  let activePersonaName = 'Gib-run';
  if (lastAssistantMessage?.response_payload) {
    try {
      const p = JSON.parse(lastAssistantMessage.response_payload);
      if (p.persona?.name) activePersonaName = p.persona.name;
    } catch {}
  } else if (lastAssistantMessage?.behavior_context) {
    activePersonaName = lastAssistantMessage.behavior_context.replace('Persona:', '').trim();
  }

  const activePersona = getPersonaDetails(activePersonaName);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#efeae2]">
      {/* WhatsApp Group Header Bar (Light Mode) */}
      <div className="h-15 px-4 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center justify-between select-none z-10 shadow-[0_1px_3px_rgba(11,20,26,0.08)] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          {/* Group Avatar Profile Picture */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white font-bold shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-[#f0f2f5]" />
          </div>

          <div className="min-w-0 flex-1">
            {/* Group Name with Inline Rename Option */}
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5 py-0.5">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  className="px-2.5 py-1 bg-[#ffffff] border border-[#00a884] rounded-md text-sm text-[#111b21] focus:outline-none max-w-xs shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className="p-1 text-[#008069] hover:text-[#00a884]"
                  title="Simpan Nama Grup"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1 text-[#667781] hover:text-[#111b21]"
                  title="Batal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                <span className="font-semibold text-sm text-[#111b21] leading-tight truncate">
                  {groupTitle}
                </span>
                <span title="Klik untuk ubah nama grup" className="inline-flex items-center">
                  <Edit2 className="w-3.5 h-3.5 text-[#667781] opacity-0 group-hover:opacity-100 hover:text-[#008069] transition-all flex-shrink-0" />
                </span>
              </div>
            )}

            {/* Group Members Subtitle & Real-time Typing Status */}
            <div className="text-xs text-[#667781] flex items-center gap-1 mt-0.5 truncate">
              {isLoading ? (
                <span className="text-[#008069] font-medium flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#008069] wa-dot-1"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#008069] wa-dot-2"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#008069] wa-dot-3"></span>
                  </span>
                  {activePersona.name} sedang mengetik...
                </span>
              ) : (
                <span className="truncate" title={`${profile.name}, Gib-run, Joke-Wi, Pra-Bow Wo, Luh-Hut, Mega-Chan, Mah-Fud, An-Ies`}>
                  {profile.name}, Gib-run, Joke-Wi, Pra-Bow Wo, Luh-Hut, Mega-Chan, Mah-Fud...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2 text-[#54656f] flex-shrink-0">
          {/* WhatsApp Starred Tools Button */}
          <button
            type="button"
            onClick={() => setIsStarredDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#e9edef] text-[#008069] border border-[#008069]/30 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Koleksi Tools & Starred"
          >
            <Star className="w-3.5 h-3.5 fill-[#008069]" />
            <span className="hidden sm:inline">Starred Tools</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="p-2 rounded-full hover:bg-[#e9edef] text-[#54656f] hover:text-[#111b21] transition-colors cursor-pointer"
            title="Grup / Obrolan Baru"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable WhatsApp Messages Area with Doodle Background */}
      <div className="flex-1 overflow-y-auto flex flex-col wa-chat-bg">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <EmptyState
              onSelectPrompt={(prompt) => {
                handleSendMessage(prompt, []);
              }}
            />
          </div>
        ) : (
          <div className="py-4 space-y-2 flex-1">
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onKbAction={handleKbAction}
                onKbConfirm={handleKbConfirm}
              />
            ))}

            {/* WhatsApp Typing Bubble Indicator (Light Mode) */}
            {isLoading && (
              <div className="py-1 px-3 md:px-6 flex justify-start items-end gap-2 animate-in fade-in">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm border border-[#e9edef] bg-white">
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: activePersona.avatarSvg }}
                    title={activePersona.name}
                  />
                </div>
                <div className="bg-[#ffffff] border border-[#e9edef] rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] flex items-center gap-2.5">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#008069] wa-dot-1"></span>
                    <span className="w-2 h-2 rounded-full bg-[#008069] wa-dot-2"></span>
                    <span className="w-2 h-2 rounded-full bg-[#008069] wa-dot-3"></span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: activePersona.color }}>
                    {activePersona.name} sedang mengetik...
                  </span>
                </div>
              </div>
            )}

            {/* Error Banner with Retry */}
            {errorMessage && (
              <div className="mx-4 md:mx-auto max-w-2xl my-3 p-3.5 rounded-xl bg-[#fee2e2] border border-[#f87171]/50 text-[#991b1b] text-xs md:text-sm flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-[#b91c1c] mb-0.5">Kendala Respons</div>
                  <div className="mb-2 text-[#7f1d1d]">{errorMessage}</div>
                  <button
                    type="button"
                    onClick={() => {
                      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                      if (lastUserMsg?.content) {
                        handleSendMessage(lastUserMsg.content, []);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    🔄 Coba Kirim Ulang
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* WhatsApp Chat Composer Bar (Light Mode) */}
      <div className="bg-[#f0f2f5] border-t border-[#e9edef] px-3 py-2 z-10">
        {/* KB Revision Context Banner */}
        {kbEditing && (
          <div className="flex items-center justify-between gap-2 px-3.5 py-2 mb-2 rounded-lg bg-[#ffffff] border-l-4 border-[#008069] shadow-sm">
            <div className="min-w-0 text-xs">
              <span className="text-[#008069] font-semibold">📦 Merevisi entri: {kbEditing.entry.name}</span>
              <span className="text-[#54656f]"> — tuliskan bagian yang mau diubah, nanti aku perbarui otomatis</span>
            </div>
            <button
              type="button"
              onClick={() => setKbEditing(null)}
              className="p-1 text-[#667781] hover:text-[#111b21] transition-colors flex-shrink-0 cursor-pointer"
              title="Batal revisi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <ChatComposer
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          initialValue={selectedPrompt}
        />
      </div>

      {/* Starred Tools Drawer (WhatsApp Starred Messages Style) */}
      <StarredToolsDrawer
        isOpen={isStarredDrawerOpen}
        onClose={() => setIsStarredDrawerOpen(false)}
        onRefreshTrigger={drawerRefreshTrigger}
      />
    </div>
  );
};
