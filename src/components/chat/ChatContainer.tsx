'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message, ConversationWithMessages } from '@/types';
import { MessageItem } from './MessageItem';
import { ChatComposer, PendingAttachment } from './ChatComposer';
import { EmptyState } from './EmptyState';
import { useRouter } from 'next/navigation';
import { AlertCircle, Edit2, Check, X, Users, Plus } from 'lucide-react';
import { getPersonaDetails } from '@/lib/personas';
import { useUserProfile } from '../profile/UserProfileContext';

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

  const handleSendMessage = async (content: string, attachments: PendingAttachment[]) => {
    setSelectedPrompt('');
    setErrorMessage(null);
    setIsLoading(true);

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
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0b141a]">
      {/* WhatsApp Group Header Bar */}
      <div className="h-15 px-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between select-none z-10 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          {/* Group Avatar Profile Picture */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-sky-500 flex items-center justify-center text-white font-bold shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-[#202c33]" />
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
                  className="px-2 py-0.5 bg-[#111b21] border border-[#00a884] rounded text-sm text-[#e9edef] focus:outline-none max-w-xs"
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className="p-1 text-[#25d366] hover:text-[#00a884]"
                  title="Simpan Nama Grup"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1 text-[#8696a0] hover:text-white"
                  title="Batal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                <span className="font-semibold text-sm text-[#e9edef] leading-tight truncate">
                  {groupTitle}
                </span>
                <span title="Klik untuk ubah nama grup" className="inline-flex items-center">
                  <Edit2 className="w-3.5 h-3.5 text-[#8696a0] opacity-0 group-hover:opacity-100 hover:text-[#25d366] transition-all flex-shrink-0" />
                </span>
              </div>
            )}

            {/* Group Members Subtitle & Real-time Typing Status */}
            <div className="text-xs text-[#8696a0] flex items-center gap-1 mt-0.5 truncate">
              {isLoading ? (
                <span className="text-[#25d366] font-medium flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] wa-dot-1"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] wa-dot-2"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] wa-dot-3"></span>
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
        <div className="flex items-center gap-1 text-[#aebac1] flex-shrink-0">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="p-2 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors"
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
          <div className="py-4 space-y-1.5 flex-1">
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}

            {/* WhatsApp Typing Bubble Indicator with Natural Portrait */}
            {isLoading && (
              <div className="py-1 px-3 md:px-6 flex justify-start items-end gap-2 animate-in fade-in">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md border border-[#2a3942]/60">
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: activePersona.avatarSvg }}
                    title={activePersona.name}
                  />
                </div>
                <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-md flex items-center gap-2.5">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#25d366] wa-dot-1"></span>
                    <span className="w-2 h-2 rounded-full bg-[#25d366] wa-dot-2"></span>
                    <span className="w-2 h-2 rounded-full bg-[#25d366] wa-dot-3"></span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: activePersona.color }}>
                    {activePersona.name} sedang mengetik...
                  </span>
                </div>
              </div>
            )}

            {/* Error Banner with Retry */}
            {errorMessage && (
              <div className="mx-4 md:mx-auto max-w-2xl my-3 p-3.5 rounded-xl bg-[#3b171c] border border-[#f15c6d]/40 text-[#ffd5d9] text-xs md:text-sm flex items-start gap-2.5 shadow-lg">
                <AlertCircle className="w-4 h-4 text-[#f15c6d] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-[#f15c6d] mb-0.5">Kendala Respons</div>
                  <div className="mb-2 text-[#ffd5d9]/90">{errorMessage}</div>
                  <button
                    type="button"
                    onClick={() => {
                      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                      if (lastUserMsg?.content) {
                        handleSendMessage(lastUserMsg.content, []);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f15c6d]/20 hover:bg-[#f15c6d]/30 text-[#f15c6d] font-medium text-xs border border-[#f15c6d]/40 transition-colors"
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

      {/* WhatsApp Chat Composer Bar */}
      <div className="bg-[#202c33] border-t border-[#222d34] px-3 py-2 z-10">
        <ChatComposer
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          initialValue={selectedPrompt}
        />
      </div>
    </div>
  );
};
