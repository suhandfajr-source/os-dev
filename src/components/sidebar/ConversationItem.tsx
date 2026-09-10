'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, MoreHorizontal, Edit2, Trash2, Check, X } from 'lucide-react';
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

  return (
    <div className="relative group">
      {isEditing ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg border border-blue-500/50">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-white focus:outline-none"
            disabled={isSubmitting}
          />
          <button
            onClick={handleSaveRename}
            disabled={isSubmitting}
            className="p-1 text-emerald-400 hover:text-emerald-300"
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
            className="p-1 text-slate-400 hover:text-white"
            title="Batal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive
              ? 'bg-slate-800 text-white font-medium border border-slate-700/60'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <Link
            href={`/chat/${conversation.id}`}
            className="flex items-center gap-2.5 min-w-0 flex-1 py-0.5"
          >
            <MessageSquare
              className={`w-4 h-4 flex-shrink-0 ${
                isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
              }`}
            />
            <span className="truncate">{conversation.title}</span>
          </Link>

          {/* Action Menu */}
          <div className="relative ml-1 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
              title="Opsi"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-20">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setIsEditing(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 text-left"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Ubah Judul
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white">Hapus Percakapan?</h3>
            <p className="text-sm text-slate-300">
              Percakapan &quot;<span className="text-slate-100 font-medium">{conversation.title}</span>&quot; beserta seluruh pesan dan lampiran gambarnya akan dihapus permanen.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
