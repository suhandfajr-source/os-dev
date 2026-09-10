'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message, ConversationWithMessages } from '@/types';
import { MessageItem } from './MessageItem';
import { ChatComposer, PendingAttachment } from './ChatComposer';
import { EmptyState } from './EmptyState';
import { useRouter } from 'next/navigation';
import { AlertCircle, Bot, Loader2 } from 'lucide-react';

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

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <EmptyState
              onSelectPrompt={(prompt) => {
                handleSendMessage(prompt, []);
              }}
            />
          </div>
        ) : (
          <div className="py-4 space-y-1 flex-1">
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="py-4 px-4 md:px-6 bg-slate-800/40 border-y border-slate-800/50 flex gap-3 md:gap-4 max-w-4xl w-full mx-auto">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white flex-shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span>Sedang menganalisis dan menyusun penjelasan...</span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="mx-4 md:mx-auto max-w-3xl my-3 p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-3 shadow-lg">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-rose-300 mb-0.5">Kendala Respons</div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Composer */}
      <div className="border-t border-slate-800/80 bg-slate-900/50 backdrop-blur-md pt-3">
        <ChatComposer
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          initialValue={selectedPrompt}
        />
      </div>
    </div>
  );
};
