'use client';

import React, { useState } from 'react';
import { Message, AssistantResponsePayload } from '@/types';
import { Bot, User, Sparkles, CheckCheck, X } from 'lucide-react';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { ResponseBlocksRenderer } from './ResponseBlocksRenderer';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Try parsing response_payload if it exists
  let parsedPayload: AssistantResponsePayload | null = null;
  if (!isUser && message.response_payload) {
    try {
      parsedPayload = JSON.parse(message.response_payload);
    } catch {
      parsedPayload = null;
    }
  }

  // Display persona name if available
  const personaName =
    parsedPayload?.persona?.name ||
    (message.behavior_context?.startsWith('Persona:')
      ? message.behavior_context.replace('Persona:', '').trim()
      : message.behavior_context
      ? 'Vibe Assistant'
      : 'Vibe Assistant');

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`py-1.5 px-3 md:px-6 flex w-full transition-all ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex gap-2.5 max-w-[92%] md:max-w-[78%] items-end ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar Profile Picture */}
        <div
          className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
            isUser
              ? 'bg-emerald-600 text-white'
              : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold'
          }`}
          title={isUser ? 'Kamu' : personaName}
        >
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-slate-950" />
          )}
        </div>

        {/* WhatsApp Chat Bubble */}
        <div
          className={`relative rounded-2xl shadow-sm text-left transition-all ${
            isUser
              ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs px-3.5 pt-2.5 pb-2 border border-[#005c4b]'
              : 'bg-[#202c33] text-[#e9edef] rounded-tl-xs px-4 pt-3 pb-2.5 border border-[#2a3942]'
          }`}
        >
          {/* Persona Header for Assistant */}
          {!isUser && (
            <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-[#2a3942]/60">
              <span className="text-xs font-bold text-[#53bdeb] tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#25d366]" />
                ~ {personaName}
              </span>
              <span className="text-[10px] text-[#8696a0] font-normal">
                (Personal AI)
              </span>
            </div>
          )}

          {/* User Attachments if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5">
              {message.attachments.map((att) => {
                const src = att.storage_path
                  ? `/uploads/${att.storage_path.split(/[\\/]/).pop()}`
                  : '';
                return (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => setSelectedImage(src)}
                    className="relative group rounded-xl overflow-hidden border border-[#111b21] bg-[#111b21] hover:border-[#00a884] transition-all"
                  >
                    <img
                      src={src}
                      alt={att.filename}
                      className="max-h-52 max-w-xs object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white">
                      Lihat Foto
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Message Content */}
          {isUser ? (
            <div className="text-sm md:text-[15px] whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          ) : parsedPayload?.blocks && parsedPayload.blocks.length > 0 ? (
            <ResponseBlocksRenderer blocks={parsedPayload.blocks} />
          ) : (
            <div className="text-[#e9edef] text-sm md:text-[15px]">
              <MarkdownRenderer content={message.content} />
            </div>
          )}

          {/* Timestamp & Double Blue Check for WhatsApp Experience */}
          <div
            className={`flex items-center gap-1 mt-1.5 select-none ${
              isUser ? 'justify-end' : 'justify-end text-[#8696a0]'
            }`}
          >
            <span className="text-[11px] text-[#8696a0] leading-none">
              {formattedTime}
            </span>

            {/* Double Blue Check (Centang 2 Biru) on User messages */}
            {isUser && (
              <span title="Terkirim & Terbaca" className="inline-flex items-center">
                <CheckCheck className="w-4 h-4 text-[#53bdeb] stroke-[2.5]" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox for uploaded image */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-2 bg-[#202c33] hover:bg-[#2a3942] text-white rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Lampiran WhatsApp"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
