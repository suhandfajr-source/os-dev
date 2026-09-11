'use client';

import React, { useState } from 'react';
import { Message, AssistantResponsePayload, PendingKnowledgeEntry } from '@/types';
import { Sparkles, CheckCheck, X, User, Star } from 'lucide-react';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { ResponseBlocksRenderer } from './ResponseBlocksRenderer';
import { getPersonaDetails } from '@/lib/personas';
import { useUserProfile } from '../profile/UserProfileContext';

interface MessageItemProps {
  message: Message;
  onKbAction?: (
    messageId: string,
    action: 'save' | 'skip' | 'edit' | 'unstar',
    entry: PendingKnowledgeEntry
  ) => void;
  onKbConfirm?: (messageId: string, decision: 'confirm' | 'cancel') => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onKbAction, onKbConfirm }) => {
  const isUser = message.role === 'user';
  const { profile } = useUserProfile();
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

  // Display persona details
  const personaRawName =
    parsedPayload?.persona?.name ||
    (message.behavior_context?.startsWith('Persona:')
      ? message.behavior_context.replace('Persona:', '').trim()
      : message.behavior_context || 'Gib-run');

  const persona = getPersonaDetails(personaRawName);

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isStarred = parsedPayload?.knowledge_status === 'saved';

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
        {/* Natural Avatar Profile Picture */}
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md border border-[#2a3942]/60">
          {isUser ? (
            profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white">
                <User className="w-4 h-4 text-white" />
              </div>
            )
          ) : (
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: persona.avatarSvg }}
              title={`${persona.name} — ${persona.title}`}
            />
          )}
        </div>

        {/* WhatsApp Group Chat Bubble (Light Mode) */}
        <div
          className={`relative rounded-2xl shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] text-left transition-all ${
            isUser
              ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-xs px-3.5 pt-2.5 pb-2 border border-[#b8f5ae]'
              : 'bg-[#ffffff] text-[#111b21] rounded-tl-xs px-4 pt-3 pb-2.5 border border-[#e9edef]'
          }`}
        >
          {/* Persona Header for Assistant in WhatsApp Group Style with Top-Right Star */}
          {!isUser && (
            <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-[#e9edef]">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-bold tracking-wide flex items-center gap-1"
                  style={{ color: persona.color }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  ~ {persona.name}
                </span>
                <span className="text-[10px] text-[#54656f] font-medium bg-[#f0f2f5] px-2 py-0.5 rounded-full border border-[#e9edef]">
                  {persona.title}
                </span>
              </div>

              {/* Starred Tool Button in Top-Right Header */}
              {parsedPayload?.knowledge_entry && (
                <button
                  type="button"
                  disabled={!onKbAction}
                  onClick={() => {
                    if (!parsedPayload?.knowledge_entry) return;
                    onKbAction?.(
                      message.id,
                      isStarred ? 'unstar' : 'save',
                      parsedPayload.knowledge_entry
                    );
                  }}
                  className={`group flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold transition-all select-none border cursor-pointer ${
                    isStarred
                      ? 'bg-[#d9fdd3] text-[#008069] border-[#008069]/40 hover:bg-[#c3f4bc] shadow-sm'
                      : 'bg-[#f0f2f5] text-[#54656f] border-[#e9edef] hover:text-[#008069] hover:border-[#008069]/30 hover:bg-[#e9edef]'
                  }`}
                  title={
                    isStarred
                      ? `Tersimpan di Starred Tools ("${parsedPayload.knowledge_entry.name}"). Klik untuk membatalkan.`
                      : `Beri Bintang / Simpan "${parsedPayload.knowledge_entry.name}" ke Starred Tools`
                  }
                >
                  <Star
                    className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 active:scale-95 ${
                      isStarred ? 'fill-[#008069] text-[#008069]' : 'text-[#54656f] group-hover:text-[#008069]'
                    }`}
                  />
                  <span>{isStarred ? 'Starred' : 'Star'}</span>
                </button>
              )}
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
                    className="relative group rounded-xl overflow-hidden border border-[#e9edef] bg-[#f0f2f5] hover:border-[#00a884] transition-all"
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
            <div className="text-sm md:text-[15px] whitespace-pre-wrap leading-relaxed text-[#111b21]">
              {message.content}
            </div>
          ) : parsedPayload?.blocks && parsedPayload.blocks.length > 0 ? (
            <ResponseBlocksRenderer blocks={parsedPayload.blocks} />
          ) : (
            <div className="text-[#111b21] text-sm md:text-[15px]">
              <MarkdownRenderer content={message.content} />
            </div>
          )}

          {/* KB Delete Confirmation Chips (CAP-4) */}
          {!isUser && parsedPayload?.kb_confirm && (
            <DeleteConfirmChips
              confirm={parsedPayload.kb_confirm}
              disabled={!onKbConfirm}
              onDecide={(decision) => onKbConfirm?.(message.id, decision)}
            />
          )}

          {/* Timestamp & Double Blue Check for WhatsApp Experience */}
          <div
            className={`flex items-center gap-1 mt-1.5 select-none ${
              isUser ? 'justify-end' : 'justify-end text-[#667781]'
            }`}
          >
            <span className="text-[11px] text-[#667781] leading-none">
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
              className="absolute top-3 right-3 p-2 bg-[#ffffff] hover:bg-[#e9edef] text-[#111b21] rounded-full transition-colors z-10 shadow-lg cursor-pointer"
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

/* ============ KB Delete Confirmation Chips (CAP-4) ============ */

interface DeleteConfirmChipsProps {
  confirm: NonNullable<AssistantResponsePayload['kb_confirm']>;
  disabled?: boolean;
  onDecide: (decision: 'confirm' | 'cancel') => void;
}

const DeleteConfirmChips: React.FC<DeleteConfirmChipsProps> = ({ confirm, disabled, onDecide }) => {
  const status = confirm.status ?? 'pending';

  if (status === 'cancelled') return null;

  if (status === 'confirmed') {
    return (
      <div className="mt-2 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] text-[#dc2626] bg-[#fee2e2] border border-[#fca5a5] rounded-full px-2.5 py-1 select-none font-medium">
          🗑️ "{confirm.name}" terhapus dari Dokumentasi
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-[#e9edef] flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDecide('confirm')}
        className="text-[11px] font-semibold text-[#dc2626] bg-[#fee2e2] hover:bg-[#fecaca] border border-[#fca5a5] rounded-full px-3 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        🗑️ Ya, Hapus
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDecide('cancel')}
        className="text-[11px] text-[#54656f] hover:text-[#111b21] bg-transparent hover:bg-[#f0f2f5] rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        Batal
      </button>
    </div>
  );
};
