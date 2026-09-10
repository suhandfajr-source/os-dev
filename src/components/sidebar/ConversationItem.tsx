'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, Check, X, Bot, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onRename: (id: string, newTitle: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onRename,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(conversation.title);
  }, [conversation.title]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSaveRename = async () => {
    if (!title.trim() || title.trim() === conversation.title) {
      setIsEditing(false);
      setTitle(conversation.title);
      return;
    }

    try {
      setIsSubmitting(true);
      await onRename(conversation.id, title.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Rename failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTitle(conversation.title);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsSubmitting(true);
      await onDelete(conversation.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = new Date(conversation.updated_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="relative group">
      {isEditing ? (
        <div className="flex items-center gap-1.5 p-2 bg-[#202c33] rounded-lg border border-[#00a884]">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-[#e9edef] focus:outline-none"
            disabled={isSubmitting}
          />
          <button
            onClick={handleSaveRename}
            disabled={isSubmitting}
            className="p-1 text-[#25d366] hover:text-[#00a884]"
            title="Simpan"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setTitle(conversation.title);
            }}
            disabled={isSubmitting}
            className="p-1 text-[#8696a0] hover:text-white"
            title="Batal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
            isActive
              ? 'bg-[#2a3942] text-[#e9edef]'
              : 'text-[#d1d7db] hover:bg-[#202c33]'
          }`}
        >
          <Link
            href={`/chat/${conversation.id}`}
            className="flex items-center gap-3 min-w-0 flex-1"
          >
            {/* WhatsApp Contact Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0 flex-1 pr-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[14px] text-[#e9edef] truncate">
                  {conversation.title}
                </span>
                <span className="text-[11px] text-[#8696a0] flex-shrink-0 ml-1">
                  {formattedDate}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-[#8696a0] mt-0.5 truncate">
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] flex-shrink-0" />
                <span className="truncate">Obrolan Vibe Coding</span>
              </div>
            </div>
          </Link>

          {/* Action Menu */}
          <div className="relative ml-1 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374248] transition-colors"
              title="Opsi Obrolan"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-[#233138] border border-[#2a3942] rounded-lg shadow-2xl py-1 z-30">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setIsEditing(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#e9edef] hover:bg-[#182229] text-left"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#53bdeb]" />
                  Ganti Nama
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#f15c6d] hover:bg-[#3b171c]/40 text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Obrolan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-[#e9edef]">Hapus Obrolan ini?</h3>
            <p className="text-sm text-[#8696a0]">
              Obrolan &quot;<span className="text-[#e9edef] font-medium">{conversation.title}</span>&quot; beserta seluruh riwayat pesan akan dihapus.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs font-medium text-[#8696a0] hover:text-[#e9edef] bg-[#111b21] hover:bg-[#2a3942] rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#ea0038] hover:bg-[#d00030] rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
