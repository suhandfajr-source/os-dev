'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message, ConversationWithMessages } from '@/types';
import { MessageItem } from './MessageItem';
import { ChatComposer, PendingAttachment } from './ChatComposer';
import { EmptyState } from './EmptyState';
import { useRouter } from 'next/navigation';
import { AlertCircle, Bot, MoreVertical, Plus, Search, Sparkles } from 'lucide-react';

interface ChatContainerProps {
  conversationId?: string;
  initialData?: ConversationWithMessages | null;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  conversationId: propConversationId,
  initialData,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialData?.messages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (initialData?.messages) {
      setMessages(initialData.messages);
    }
  }, [initialData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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

  // Derive title or current persona from the last assistant message
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  let currentPersona = 'Vibe Assistant';
  if (lastAssistantMessage?.response_payload) {
    try {
      const p = JSON.parse(lastAssistantMessage.response_payload);
      if (p.persona?.name) currentPersona = p.persona.name;
    } catch {}
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0b141a]">
      {/* WhatsApp Header Bar */}
      <div className="h-15 px-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between select-none z-10 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Avatar Profile Picture with Online Status Indicator */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Bot className="w-5 h-5 text-slate-950" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-[#202c33]" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-semibold text-sm text-[#e9edef] leading-tight">
              <span>{initialData?.title || 'Vibe Coding Assistant'}</span>
              <span className="text-[11px] font-normal text-[#25d366] bg-[#00a884]/15 px-1.5 py-0.2 rounded">
                ~ {currentPersona}
              </span>
            </div>

            {/* Real-time WhatsApp Status */}
            <div className="text-xs text-[#8696a0] flex items-center gap-1 mt-0.5">
              {isLoading ? (
                <span className="text-[#25d366] font-medium flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] wa-dot-1"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] wa-dot-2"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] wa-dot-3"></span>
                  </span>
                  sedang mengetik...
                </span>
              ) : (
                <span className="text-[#8696a0]">online</span>
              )}
            </div>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-1 text-[#aebac1]">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="p-2 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors"
            title="Percakapan Baru"
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

            {/* WhatsApp Typing Bubble Indicator */}
            {isLoading && (
              <div className="py-1 px-4 md:px-6 flex justify-start items-end gap-2 animate-in fade-in">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center flex-shrink-0 text-slate-950 font-bold shadow-md">
                  <Bot className="w-4 h-4 text-slate-950" />
                </div>
                <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl rounded-tl-xs px-4 py-3 shadow-md flex items-center gap-2.5">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#25d366] wa-dot-1"></span>
                    <span className="w-2 h-2 rounded-full bg-[#25d366] wa-dot-2"></span>
                    <span className="w-2 h-2 rounded-full bg-[#25d366] wa-dot-3"></span>
                  </div>
                  <span className="text-xs text-[#8696a0] font-medium">
                    sedang mengetik...
                  </span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="mx-4 md:mx-auto max-w-2xl my-3 p-3.5 rounded-xl bg-[#3b171c] border border-[#f15c6d]/40 text-[#ffd5d9] text-xs md:text-sm flex items-start gap-2.5 shadow-lg">
                <AlertCircle className="w-4 h-4 text-[#f15c6d] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-[#f15c6d] mb-0.5">Kendala Respons</div>
                  <div>{errorMessage}</div>
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
