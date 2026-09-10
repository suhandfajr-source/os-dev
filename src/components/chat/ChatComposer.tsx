'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';

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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
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
    <div className="w-full max-w-5xl mx-auto">
      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mb-2 p-2 rounded-lg bg-[#3b171c] border border-[#f15c6d]/40 text-xs text-[#ffd5d9] flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-[#f15c6d] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2.5 p-2.5 mb-2 bg-[#111b21] rounded-xl border border-[#2a3942]">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="relative group w-16 h-16 rounded-lg overflow-hidden border border-[#2a3942] bg-[#0b141a]"
            >
              <img
                src={att.previewUrl}
                alt={att.filename}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="absolute top-1 right-1 p-0.5 bg-black/75 hover:bg-[#ea0038] text-white rounded-full transition-colors"
                title="Hapus foto"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp Composer Bar */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2"
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

        {/* Attachment Paperclip Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isUploading}
          className="p-2.5 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374248] rounded-full transition-colors disabled:opacity-40 cursor-pointer flex-shrink-0 mb-0.5"
          title="Lampirkan foto/screenshot"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#00a884]" />
          ) : (
            <Paperclip className="w-5 h-5 -rotate-45" />
          )}
        </button>

        {/* WhatsApp Pill Input Textarea */}
        <div className="flex-1 bg-[#2a3942] rounded-xl px-3.5 py-2 flex items-center border border-transparent focus-within:border-[#00a884]/60 transition-colors">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan..."
            rows={1}
            className="w-full bg-transparent text-sm md:text-[15px] text-[#e9edef] placeholder-[#8696a0] resize-none focus:outline-none max-h-36 overflow-y-auto leading-relaxed"
          />
        </div>

        {/* WhatsApp Green Send Button */}
        <button
          type="submit"
          id="chat-send-btn"
          onClick={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          disabled={!canSubmit}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all flex-shrink-0 mb-0.5 ${
            canSubmit
              ? 'bg-[#00a884] hover:bg-[#02906f] active:scale-95 text-white cursor-pointer shadow-[#00a884]/20'
              : 'bg-[#2a3942] text-[#8696a0] cursor-not-allowed opacity-50'
          }`}
          title={canSubmit ? 'Kirim pesan' : 'Tulis pesan...'}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <Send className="w-4 h-4 ml-0.5 fill-current" />
          )}
        </button>
      </form>
    </div>
  );
};
