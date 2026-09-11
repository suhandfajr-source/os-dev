'use client';

import React, { useState } from 'react';
import { Message, AssistantResponsePayload, PendingKnowledgeEntry } from '@/types';
import { Sparkles, CheckCheck, X, User } from 'lucide-react';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { ResponseBlocksRenderer } from './ResponseBlocksRenderer';
import { getPersonaDetails } from '@/lib/personas';
import { useUserProfile } from '../profile/UserProfileContext';

interface MessageItemProps {
  message: Message;
  onKbAction?: (
    messageId: string,
    action: 'save' | 'skip' | 'edit',
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

        {/* WhatsApp Group Chat Bubble */}
        <div
          className={`relative rounded-2xl shadow-sm text-left transition-all ${
            isUser
              ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs px-3.5 pt-2.5 pb-2 border border-[#005c4b]'
              : 'bg-[#202c33] text-[#e9edef] rounded-tl-xs px-4 pt-3 pb-2.5 border border-[#2a3942]'
          }`}
        >
          {/* Persona Header for Assistant in WhatsApp Group Style */}
          {!isUser && (
            <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-[#2a3942]/60 flex-wrap">
              <span
                className="text-xs font-bold tracking-wide flex items-center gap-1"
                style={{ color: persona.color }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                ~ {persona.name}
              </span>
              <span className="text-[10px] text-[#8696a0] font-normal bg-[#111b21] px-1.5 py-0.5 rounded border border-[#2a3942]/50">
                {persona.title}
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

          {/* Knowledge Base Chips (Dokumentasi Tools) */}
          {!isUser && parsedPayload?.knowledge_entry && (
            <KnowledgeChips
              status={parsedPayload.knowledge_status ?? 'pending'}
              entry={parsedPayload.knowledge_entry}
              updated={parsedPayload.knowledge_updated}
              disabled={!onKbAction}
              onAction={(action) => onKbAction?.(message.id, action, parsedPayload!.knowledge_entry!)}
            />
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

/* ============ Knowledge Base Chips (Dokumentasi Tools) ============ */

interface KnowledgeChipsProps {
  status: 'pending' | 'saved' | 'skipped';
  entry: PendingKnowledgeEntry;
  updated?: boolean;
  disabled?: boolean;
  onAction: (action: 'save' | 'skip' | 'edit') => void;
}

const KnowledgeChips: React.FC<KnowledgeChipsProps> = ({ status, entry, updated, disabled, onAction }) => {
  if (status === 'skipped') return null;

  if (status === 'saved') {
    return (
      <div className="mt-2 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] text-[#25d366] bg-[#111b21] border border-[#25d366]/30 rounded-full px-2.5 py-1 select-none">
          📦 {updated ? 'Diperbarui di Dokumentasi' : 'Tersimpan ke Dokumentasi'}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-[#2a3942]/60 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] text-[#8696a0] mr-0.5 select-none truncate max-w-[140px]" title={entry.name}>
        📦 Simpan <span className="font-medium text-[#e9edef]">{entry.name}</span>?
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction('save')}
        className="text-[11px] font-medium text-[#25d366] bg-[#111b21] hover:bg-[#00a884]/20 border border-[#25d366]/40 rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Simpan 📦
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction('edit')}
        className="text-[11px] font-medium text-[#e9edef] bg-[#111b21] hover:bg-[#2a3942] border border-[#2a3942] rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ✏️ Edit
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction('skip')}
        className="text-[11px] text-[#8696a0] hover:text-[#e9edef] bg-transparent hover:bg-[#2a3942] rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Skip
      </button>
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
        <span className="inline-flex items-center gap-1 text-[11px] text-[#f15c6d] bg-[#111b21] border border-[#f15c6d]/30 rounded-full px-2.5 py-1 select-none">
          🗑️ "{confirm.name}" terhapus dari Dokumentasi
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-[#2a3942]/60 flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDecide('confirm')}
        className="text-[11px] font-medium text-[#f15c6d] bg-[#111b21] hover:bg-[#f15c6d]/20 border border-[#f15c6d]/40 rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        🗑️ Ya, Hapus
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDecide('cancel')}
        className="text-[11px] text-[#8696a0] hover:text-[#e9edef] bg-transparent hover:bg-[#2a3942] rounded-full px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Batal
      </button>
    </div>
  );
};
