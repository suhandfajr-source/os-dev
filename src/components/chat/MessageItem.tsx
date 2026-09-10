'use client';

import React, { useState } from 'react';
import { Message, AssistantResponsePayload } from '@/types';
import { Bot, User, Sparkles, X } from 'lucide-react';
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
  const personaDisplay =
    parsedPayload?.persona?.name ||
    (message.behavior_context?.startsWith('Persona:')
      ? message.behavior_context
      : message.behavior_context
      ? 'Sesuai Brief'
      : null);

  return (
    <div
      className={`py-4 px-4 md:px-6 flex gap-3 md:gap-4 transition-colors ${
        isUser ? 'bg-transparent justify-end' : 'bg-slate-800/40 border-y border-slate-800/50 justify-start'
      }`}
    >
      <div className={`flex gap-3 md:gap-4 max-w-4xl w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-emerald-600 text-white shadow-emerald-900/30'
          }`}
        >
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Content Container */}
        <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : 'text-left'}`}>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-300">
              {isUser ? 'Kamu' : 'Assistant'}
            </span>

            {/* Persona Badge */}
            {!isUser && personaDisplay && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Sparkles className="w-3 h-3" />
                {personaDisplay}
              </span>
            )}

            <span className="text-[10px] text-slate-400">
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* User Attachments if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-2 mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {message.attachments.map((att) => {
                const src = att.storage_path ? `/uploads/${att.storage_path.split(/[\\/]/).pop()}` : '';
                return (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => setSelectedImage(src)}
                    className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-800 hover:border-blue-500 transition-colors"
                  >
                    <img
                      src={src}
                      alt={att.filename}
                      className="max-h-48 max-w-xs object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white">
                      Perbesar
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Message Content */}
          {isUser ? (
            <div className="inline-block bg-blue-600/90 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm md:text-base text-left whitespace-pre-wrap leading-relaxed shadow-sm">
              {message.content}
            </div>
          ) : parsedPayload?.blocks && parsedPayload.blocks.length > 0 ? (
            <ResponseBlocksRenderer blocks={parsedPayload.blocks} />
          ) : (
            <div className="text-slate-100">
              <MarkdownRenderer content={message.content} />
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for uploaded image */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Lampiran"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
