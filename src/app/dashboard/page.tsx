'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FolderPlus, Pencil, Trash2, Check, X, LayoutDashboard } from 'lucide-react';
import { Project, StageName, StageStatusValue, ProjectStageStatuses } from '@/types';

const STAGE_LABELS: Record<StageName, string> = {
  planning: 'Planning',
  design: 'Design',
  development: 'Development',
  testing: 'Testing',
  deployment: 'Deployment',
  maintenance: 'Maintenance',
};

const STAGE_ORDER: StageName[] = ['planning', 'design', 'development', 'testing', 'deployment', 'maintenance'];

function statusChipClass(s: StageStatusValue): string {
  if (s === 'selesai') return 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40';
  if (s === 'draf') return 'bg-[#f5c33b]/15 text-[#f5c33b] border-[#f5c33b]/40';
  return 'bg-[#2a3942] text-[#667781] border-[#2f3b43]';
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stageStatuses, setStageStatuses] = useState<Record<string, ProjectStageStatuses>>({});
  const [statusLoadFailed, setStatusLoadFailed] = useState(false);

  const fetchStageStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/status');
      if (!res.ok) {
        console.error('Failed to fetch stage statuses:', res.status);
        setStatusLoadFailed(true);
        return;
      }
      const data = await res.json();
      setStageStatuses(data.statuses || {});
      setStatusLoadFailed(false);
    } catch (err) {
      console.error('Failed to fetch stage statuses:', err);
      setStatusLoadFailed(true);
    }
  }, []);

  const retryStageStatuses = useCallback(() => {
    void fetchStageStatuses();
  }, [fetchStageStatuses]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      } else {
        setError('Gagal memuat daftar proyek.');
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('Gagal memuat daftar proyek.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchStageStatuses();
  }, [fetchProjects, fetchStageStatuses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDescription }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal membuat proyek.');
        return;
      }
      setProjects((prev) => [data.project, ...prev]);
      fetchStageStatuses();
      setNewName('');
      setNewDescription('');
    } catch (err) {
      console.error('Failed to create project:', err);
      setError('Gagal membuat proyek.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (p: Project) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDescription(p.description);
  };

  const cancelEdit = () => setEditingId(null);

  const handleUpdate = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal memperbarui proyek.');
        return;
      }
      // ordering server = updated_at DESC: item yang baru diedit pindah ke atas
      setProjects((prev) => [data.project, ...prev.filter((p) => p.id !== id)]);
      fetchStageStatuses();
      cancelEdit();
    } catch (err) {
      console.error('Failed to update project:', err);
      setError('Gagal memperbarui proyek.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus proyek "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Gagal menghapus proyek.');
        return;
      }
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setStageStatuses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('Gagal menghapus proyek.');
    } finally {
      setBusy(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts.replace(' ', 'T') + 'Z').toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b141a]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#00a884]/20 flex items-center justify-center">
            <LayoutDashboard className="text-[#00a884]" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#e9edef]">Meja Kendali</h1>
            <p className="text-sm text-[#8696a0]">
              Daftar proyek — asisten SDLC dari Planning sampai Maintenance
            </p>
          </div>
        </div>

        {error && <p className="text-[#f15c6d] text-xs mb-4">{error}</p>}

        {/* Create form */}
        <form
          onSubmit={handleCreate}
          className="bg-[#202c33] rounded-xl p-4 mb-6 border border-[#2f3b43]"
        >
          <div className="flex items-center gap-2 mb-3 text-[#e9edef]">
            <FolderPlus size={18} className="text-[#00a884]" />
            <span className="font-medium text-sm">Proyek Baru</span>
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama proyek (wajib)"
            className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:ring-1 focus:ring-[#00a884]"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Deskripsi singkat (opsional)"
            rows={2}
            className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-1 focus:ring-[#00a884] resize-none"
          />
          <button
            type="submit"
            disabled={!newName.trim() || busy}
            className="bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {busy ? 'Menyimpan…' : 'Buat Proyek'}
          </button>
        </form>

        {/* Retry status (walkthrough 324ad1b #5) */}
        {statusLoadFailed && (
          <div className="flex items-center gap-2 mb-4 text-xs text-[#f5c33b]">
            <span>Status tahapan gagal dimuat — chip menampilkan data tidak pasti.</span>
            <button
              onClick={retryStageStatuses}
              className="underline hover:text-[#f5c33b]/80"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Project list */}
        {loading ? (
          <p className="text-center text-[#8696a0] text-sm py-8">Memuat…</p>
        ) : projects.length === 0 ? (
          <div className="text-center text-[#8696a0] text-sm py-12">
            Belum ada proyek. Buat proyek pertamamu di atas — satu proyek = satu meja kendali.
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) =>
              editingId === p.id ? (
                /* Edit mode */
                <div key={p.id} className="bg-[#202c33] rounded-xl p-4 border border-[#00a884]/50">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#2a3942] text-[#e9edef] rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:ring-1 focus:ring-[#00a884]"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-[#2a3942] text-[#e9edef] rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-1 focus:ring-[#00a884] resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(p.id)}
                      disabled={busy}
                      className="bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                      <Check size={14} /> Simpan
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-[#2a3942] hover:bg-[#334550] text-[#e9edef] text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                      <X size={14} /> Batal
                    </button>
                  </div>
                </div>
              ) : (
                /* Project card */
                <div
                  key={p.id}
                  className="bg-[#202c33] hover:bg-[#233138] transition-colors rounded-xl p-4 border border-[#2f3b43] flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h3 className="text-[#e9edef] font-medium text-sm truncate">{p.name}</h3>
                    {p.description && (
                      <p className="text-[#8696a0] text-xs mt-1 whitespace-pre-wrap">{p.description}</p>
                    )}
                    <p className="text-[#667781] text-[11px] mt-2">
                      Dibuat {formatTimestamp(p.created_at)} · Diubah {formatTimestamp(p.updated_at)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {STAGE_ORDER.map((stage) => {
                        const s = stageStatuses[p.id]?.[stage] ?? 'belum_dimulai';
                        const label = statusLoadFailed
                          ? 'Status gagal dimuat'
                          : s === 'selesai'
                            ? 'Tahap selesai (artefak disetujui)'
                            : s === 'draf'
                              ? 'Dalam proses (ada draf artefak)'
                              : 'Belum dimulai';
                        return (
                          <span
                            key={stage}
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              statusLoadFailed ? 'bg-[#2a3942] text-[#667781] border-[#2f3b43] italic' : statusChipClass(s)
                            }`}
                            title={label}
                            aria-label={`${STAGE_LABELS[stage]}: ${label}`}
                          >
                            {STAGE_LABELS[stage]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(p)}
                      title="Edit proyek"
                      className="p-2 rounded-lg text-[#8696a0] hover:text-[#00a884] hover:bg-[#2a3942] transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={busy}
                      title="Hapus proyek"
                      className="p-2 rounded-lg text-[#8696a0] hover:text-[#f15c6d] hover:bg-[#2a3942] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
