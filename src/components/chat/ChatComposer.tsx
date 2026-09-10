'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, X, Loader2 } from 'lucide-react';

export interface PendingAttachment {
  file: File;
  previewUrl: string;
  filename: string;
  mimeType: string;
  storagePath?: string;
  url?: string;
  base64?: string;
}

interface ChatComposerProps {
  onSendMessage: (content: string, attachments: PendingAttachment[]) => Promise<void>;
  isLoading: boolean;
  initialValue?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  isLoading,
  initialValue = '',
}) => {
  const [content, setContent] = useState(initialValue);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialValue) {
      setContent(initialValue);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [initialValue]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate MIME type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          setUploadError('Hanya mendukung format gambar PNG, JPG, JPEG, atau WEBP.');
          continue;
        }

        // Validate size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          setUploadError('Ukuran gambar terlalu besar (maksimal 10MB).');
          continue;
        }

        // Upload to server immediately to get storagePath & base64
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setUploadError(errData.error || 'Gagal mengunggah gambar.');
          continue;
        }

        const data = await res.json();
        const previewUrl = URL.createObjectURL(file);

        setAttachments((prev) => [
          ...prev,
          {
            file,
            previewUrl,
            filename: data.filename,
            mimeType: data.mimeType,
            storagePath: data.storagePath,
            url: data.url,
            base64: data.base64,
          },
        ]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError('Terjadi kesalahan saat mengunggah.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const canSubmit = (content.trim().length > 0 || attachments.length > 0) && !isLoading && !isUploading;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!canSubmit) {
      return;
    }

    const currentContent = content.trim();
    const currentAttachments = [...attachments];

    // Clear local input immediately
    setContent('');
    setAttachments([]);
    setUploadError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSendMessage(currentContent, currentAttachments);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mb-2 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2.5 p-3 mb-2 bg-slate-800/80 rounded-xl border border-slate-700/80">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-600 bg-slate-900"
            >
              <img
                src={att.previewUrl}
                alt={att.filename}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors"
                title="Hapus gambar"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer Form Input Box */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end bg-slate-800/90 border border-slate-700/80 rounded-2xl p-2 shadow-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all"
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isUploading}
          className="p-2.5 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
          title="Lampirkan screenshot/gambar"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          ) : (
            <ImagePlus className="w-5 h-5" />
          )}
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tanyakan konsep, paste kode atau error (Enter untuk kirim, Shift+Enter untuk baris baru)..."
          rows={1}
          className="flex-1 bg-transparent px-3 py-2 text-sm md:text-base text-slate-100 placeholder-slate-400 resize-none focus:outline-none max-h-48 overflow-y-auto"
        />

        {/* Send Button */}
        <button
          type="submit"
          id="chat-send-btn"
          onClick={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          disabled={!canSubmit}
          className={`p-2.5 rounded-xl text-white font-medium shadow-md transition-all flex-shrink-0 ml-1 ${
            canSubmit
              ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 cursor-pointer shadow-blue-500/20'
              : 'bg-slate-700/60 text-slate-500 cursor-not-allowed opacity-50'
          }`}
          title={canSubmit ? 'Kirim pesan' : 'Tulis pesan terlebih dahulu'}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-300" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
};
