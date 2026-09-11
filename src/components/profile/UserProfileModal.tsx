'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUserProfile } from './UserProfileContext';
import { X, Camera, Check, User, Sparkles, Upload } from 'lucide-react';

const PRESET_AVATARS = [
  { id: 'user-emerald', label: 'Emerald', bg: 'bg-emerald-600', iconColor: 'text-white' },
  { id: 'user-blue', label: 'Ocean', bg: 'bg-blue-600', iconColor: 'text-white' },
  { id: 'user-amber', label: 'Sun', bg: 'bg-amber-600', iconColor: 'text-white' },
  { id: 'user-purple', label: 'Violet', bg: 'bg-purple-600', iconColor: 'text-white' },
  { id: 'user-rose', label: 'Rose', bg: 'bg-rose-600', iconColor: 'text-white' },
  { id: 'user-dark', label: 'Carbon', bg: 'bg-slate-700', iconColor: 'text-white' },
];

export const UserProfileModal: React.FC = () => {
  const { profile, updateProfile, isModalOpen, closeModal } = useUserProfile();
  const [name, setName] = useState(profile.name || 'Kamu');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [selectedPreset, setSelectedPreset] = useState(profile.avatarPreset || 'user-emerald');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      setName(profile.name || 'Kamu');
      setAvatarUrl(profile.avatarUrl || '');
      setSelectedPreset(profile.avatarPreset || 'user-emerald');
    }
  }, [isModalOpen, profile]);

  if (!isModalOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.url || '');
      } else {
        // Fallback to local object URL / base64
        const reader = new FileReader();
        reader.onload = () => {
          setAvatarUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Upload profile failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    updateProfile({
      name: name.trim() || 'Kamu',
      avatarUrl: avatarUrl || undefined,
      avatarPreset: selectedPreset,
    });
    closeModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-md bg-[#ffffff] border border-[#e9edef] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#008069] flex items-center justify-between text-white shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">
              <User className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-sm text-white">
              Pengaturan Profil WhatsApp
            </h3>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 bg-white">
          {/* Avatar Preview & Upload */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div
                className={`w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-md border-2 border-[#008069] ${
                  avatarUrl
                    ? 'bg-[#f0f2f5]'
                    : PRESET_AVATARS.find((p) => p.id === selectedPreset)?.bg || 'bg-emerald-600'
                }`}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto Profil" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
              </div>

              {/* Camera Hover Overlay */}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px]">
                <Camera className="w-6 h-6 mb-0.5" />
                <span>Ubah Foto</span>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-2.5 text-xs text-[#008069] hover:text-[#00a884] font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              {isUploading ? 'Mengunggah...' : 'Unggah Foto dari Komputer'}
            </button>
          </div>

          {/* Preset Colors if no custom image */}
          <div>
            <label className="block text-xs font-bold text-[#54656f] uppercase tracking-wider mb-2">
              Atau Pilih Warna Avatar
            </label>
            <div className="flex items-center justify-center gap-3">
              {PRESET_AVATARS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    setAvatarUrl('');
                  }}
                  className={`w-9 h-9 rounded-full ${preset.bg} flex items-center justify-center transition-all cursor-pointer ${
                    !avatarUrl && selectedPreset === preset.id
                      ? 'ring-2 ring-[#008069] ring-offset-2 scale-110 shadow-sm'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  title={preset.label}
                >
                  {!avatarUrl && selectedPreset === preset.id && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-bold text-[#54656f] uppercase tracking-wider mb-2">
              Nama Tampilan Kamu di Grup
            </label>
            <div className="relative bg-[#f0f2f5] rounded-xl border border-[#e9edef] focus-within:border-[#008069] focus-within:bg-white transition-all shadow-xs">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Wahid / Suhandi"
                className="w-full px-3.5 py-2.5 bg-transparent text-sm text-[#111b21] placeholder-[#8696a0] focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-[#667781] mt-1.5">
              Nama dan foto profil ini akan tampil pada setiap bubble chat kiriman kamu di grup.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 text-xs font-semibold text-[#54656f] hover:text-[#111b21] rounded-lg hover:bg-[#e9edef] transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#008069] hover:bg-[#00a884] active:bg-[#005c4b] rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
};
